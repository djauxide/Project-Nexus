import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fastifyHelmet from '@fastify/helmet';
import { WebSocketManager } from './websocket/manager';
import { StateEngine } from './state/engine';
import { Role, JwtPayload, WsMessage } from './types';
import { authRoutes } from './routes/auth';
import { startSubscriber } from './redis/pubsub';
import { logSwitcherEvent, upsertCrosspoint, logAudit, upsertAlarm, acknowledgeAlarm as dbAckAlarm } from './db/queries';
import { v4 as uuid } from 'uuid';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user: JwtPayload;
  }
}

import type { FastifyRequest, FastifyReply } from 'fastify';

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  VIEWER:   ['GET_STATE'],
  OPERATOR: ['GET_STATE', 'SWITCHER_CUT', 'SWITCHER_AUTO', 'SWITCHER_PVW', 'SWITCHER_TBAR',
             'CEREBRUM_ROUTE', 'CEREBRUM_TALLY', 'CEREBRUM_MACRO_RUN', 'CEREBRUM_SALVO',
             'ROUTER_CONNECT', 'ALARM_ACK'],
  ENGINEER: ['*'],
  TRAINER:  ['*'],
};

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    ...(process.env.NODE_ENV === 'development' && {
      transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss Z' } },
    }),
  },
  trustProxy: true,
});

const wsManager = new WebSocketManager();
const stateEngine = new StateEngine(wsManager);

async function bootstrap() {
  await fastify.register(fastifyHelmet, { contentSecurityPolicy: false });

  await fastify.register(fastifyCors, {
    origin: process.env.NODE_ENV === 'production'
      ? (process.env.CORS_ORIGINS ?? 'https://nexus.control.studio').split(',')
      : true,
    credentials: true,
  });

  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? 'nexus-dev-secret-change-in-production',
    sign: { expiresIn: '8h', issuer: 'nexus-v7' },
    verify: { issuer: 'nexus-v7' },
  });

  // Decorate authenticate hook
  fastify.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  await fastify.register(fastifyWebsocket);

  // Register auth routes
  await fastify.register(authRoutes);

  // ── WebSocket control endpoint ────────────────────────────────────────────

  fastify.get('/ws/control', { websocket: true }, async (connection, req) => {
    const token = new URL(req.url ?? '', 'http://localhost').searchParams.get('token');
    if (!token) { connection.socket.close(1008, 'Missing token'); return; }

    let decoded: JwtPayload;
    try {
      decoded = fastify.jwt.verify<JwtPayload>(token);
    } catch {
      connection.socket.close(1008, 'Invalid token');
      return;
    }

    const clientId = `${decoded.userId}-${uuid()}`;
    wsManager.register(connection.socket, { id: clientId, role: decoded.role, userId: decoded.userId });

    connection.socket.send(JSON.stringify({
      type: 'INIT',
      role: decoded.role,
      userId: decoded.userId,
      timestamp: Date.now(),
    }));

    stateEngine.broadcastFullState();

    connection.socket.on('message', async (raw: Buffer) => {
      try {
        const msg: WsMessage = JSON.parse(raw.toString());
        await handleMessage(msg, clientId, decoded.role, decoded.userId);
      } catch {
        connection.socket.send(JSON.stringify({ type: 'ERROR', message: 'Invalid message' }));
      }
    });

    connection.socket.on('close', () => wsManager.unregister(clientId));
  });

  // ── Health ────────────────────────────────────────────────────────────────

  fastify.get('/health/live',  async () => ({ status: 'alive', version: '7.0.0' }));
  fastify.get('/health/ready', async () => ({ status: 'ready', timestamp: Date.now() }));

  // ── Metrics (Prometheus format) ───────────────────────────────────────────

  fastify.get('/metrics', async () => {
    const stats = wsManager.stats();
    return [
      `nexus_ws_connections_total ${stats.total}`,
      ...Object.entries(stats.byRole).map(([r, n]) => `nexus_ws_connections_by_role{role="${r}"} ${n}`),
      `nexus_uptime_seconds ${Math.floor(process.uptime())}`,
    ].join('\n');
  });

  // ── Switcher REST ─────────────────────────────────────────────────────────

  fastify.post('/api/v1/switcher/cut', async (req) => {
    const { me = 0, pvw, pgm } = req.body as { me?: number; pvw: number; pgm: number };
    const t0 = Date.now();
    stateEngine.cut(me, pvw);
    const latencyUs = (Date.now() - t0) * 1000;
    logSwitcherEvent(me, pgm, pvw, pvw, 'CUT', null, latencyUs, stateEngine.getState().timecode).catch(() => {});
    return { success: true, newPgm: pvw, newPvw: pgm, latency_ms: Date.now() - t0 };
  });

  fastify.post('/api/v1/switcher/pvw', async (req) => {
    const { me = 0, source } = req.body as { me?: number; source: number };
    stateEngine.setPvw(me, source);
    return { success: true };
  });

  fastify.post('/api/v1/switcher/auto', async (req) => {
    const { me = 0 } = req.body as { me?: number };
    stateEngine.autoTransition(me);
    return { success: true };
  });

  fastify.get('/api/v1/switcher/health', async () => ({ status: 'healthy' }));
  fastify.get('/api/v1/switcher/state', async () => stateEngine.getState().me);
  fastify.get('/api/v1/switcher/history', async (req) => {
    const { limit = 100 } = req.query as { limit?: number };
    const { getSwitcherHistory } = await import('./db/queries');
    return getSwitcherHistory(limit).catch(() => []);
  });

  // ── PTP REST ──────────────────────────────────────────────────────────────

  fastify.get('/api/v1/ptp/status', async () => ({
    offset: stateEngine.getState().ptpOffset,
    locked: stateEngine.getState().ptpLocked,
    grandmasterId: 'NEXUS-GM-01',
    domain: 0,
    clockClass: 6,
  }));

  fastify.get('/api/v1/ptp/history', async () => {
    const { getPTPHistory } = await import('./db/queries');
    return getPTPHistory(5).catch(() => []);
  });

  // ── Router REST ───────────────────────────────────────────────────────────

  fastify.get('/api/v1/router/flows', async () => stateEngine.getState().router);
  fastify.get('/api/v1/router/crosspoints', async (req) => {
    const { level } = req.query as { level?: string };
    const { getCrosspoints } = await import('./db/queries');
    return getCrosspoints(level).catch(() => stateEngine.getState().router);
  });

  fastify.post('/api/v1/router/route', async (req) => {
    const { level, dst, src } = req.body as { level: string; dst: string; src: string };
    stateEngine.route(level, dst, src);
    upsertCrosspoint(level, dst, src, null, stateEngine.getState().timecode).catch(() => {});
    return { success: true };
  });

  fastify.post('/api/v1/router/lock', async (req) => {
    const { level, dst, locked } = req.body as { level: string; dst: string; locked: boolean };
    stateEngine.lockRoute(level, dst, locked);
    const { lockCrosspoint } = await import('./db/queries');
    lockCrosspoint(level, dst, locked, null).catch(() => {});
    return { success: true };
  });

  // ── Multiviewer REST ──────────────────────────────────────────────────────

  fastify.get('/api/v1/multiviewer/layout', async () => ({ layout: '4x4', cells: [] }));
  fastify.get('/api/v1/multiviewer/sources', async () => stateEngine.getSources());
  fastify.post('/api/v1/multiviewer/layout', async (req) => {
    wsManager.broadcast({ type: 'MV_UPDATE', ...(req.body as object) });
    return { success: true };
  });

  // ── Recorder REST ─────────────────────────────────────────────────────────

  fastify.get('/api/v1/recorder/storage', async () => ({
    usage_percent: 42, used_gb: 840, total_gb: 2000,
  }));

  // ── NMOS proxy ────────────────────────────────────────────────────────────

  fastify.get('/api/v1/nmos/health', async () => ({ status: 'healthy' }));
  fastify.get('/api/v1/nmos/flows', async () => {
    const { query } = await import('./db/pool');
    return query('SELECT * FROM nmos_flows WHERE active = TRUE ORDER BY created_at DESC').catch(() => []);
  });

  // ── Cerebrum BCS ──────────────────────────────────────────────────────────

  fastify.get('/api/v1/cerebrum/router/:level', async (req) => {
    const { level } = req.params as { level: string };
    const routes = stateEngine.getState().router.filter(r => r.level === level);
    return { level, routes, sources: 16, destinations: 12 };
  });

  fastify.post('/api/v1/cerebrum/router/route', async (req) => {
    const { level, src, dst } = req.body as { level: string; src: string; dst: string };
    stateEngine.route(level, dst, src);
    wsManager.broadcast({ type: 'CEREBRUM_ROUTE', level, src, dst, timestamp: Date.now() });
    return { success: true, level, src, dst };
  });

  fastify.get('/api/v1/cerebrum/tally', async () => ({ tallies: stateEngine.getState().tallies }));

  fastify.post('/api/v1/cerebrum/tally', async (req) => {
    const { source, state, bus } = req.body as { source: string; state: string; bus: string };
    wsManager.broadcastToRoles(['OPERATOR', 'ENGINEER', 'TRAINER'], {
      type: 'CEREBRUM_TALLY', source, state, bus, timestamp: Date.now(),
    });
    return { success: true };
  });

  fastify.get('/api/v1/cerebrum/devices/:protocol', async (req) => {
    const { protocol } = req.params as { protocol: string };
    return { protocol, devices: [] };
  });

  fastify.get('/api/v1/cerebrum/macros', async () => {
    const { getMacros } = await import('./db/queries');
    return { macros: await getMacros().catch(() => []) };
  });

  fastify.post('/api/v1/cerebrum/macros/:id/run', async (req) => {
    const { id } = req.params as { id: string };
    const { recordMacroRun } = await import('./db/queries');
    recordMacroRun(id).catch(() => {});
    wsManager.broadcastToRoles(['OPERATOR', 'ENGINEER'], {
      type: 'CEREBRUM_MACRO_RUN', macroId: id, timestamp: Date.now(),
    });
    return { success: true, macroId: id };
  });

  fastify.get('/api/v1/cerebrum/health', async () => ({
    status: 'healthy',
    components: {
      cerebrumServer: 'ok', routerMatrix: 'ok', tallyEngine: 'ok',
      emberGateway: 'warn', nmosRegistry: 'ok', automationEngine: 'ok',
    },
  }));

  // ── Sources & State ───────────────────────────────────────────────────────

  fastify.get('/api/v1/sources', async () => stateEngine.getSources());
  fastify.get('/api/v1/state', async () => stateEngine.getState());

  fastify.get('/api/v1/alarms', async () => {
    const { getActiveAlarms } = await import('./db/queries');
    const dbAlarms = await getActiveAlarms().catch(() => null);
    return dbAlarms ?? stateEngine.getAlarms();
  });

  fastify.post('/api/v1/alarms/:id/acknowledge', async (req) => {
    const { id } = req.params as { id: string };
    stateEngine.acknowledgeAlarm(id);
    dbAckAlarm(id, null).catch(() => {});
    return { success: true };
  });

  // ── Hardware sync (called by ATEM/Ember+ services) ────────────────────────

  fastify.post('/api/v1/sync/atem', async (req) => {
    const { me, pgm, pvw } = req.body as { me: number; pgm: number; pvw: number };
    stateEngine.syncFromATEM(me, pgm, pvw);
    return { success: true };
  });

  fastify.post('/api/v1/sync/ember', async (req) => {
    const { path, value } = req.body as { path: string; value: unknown };
    stateEngine.syncFromEmber(path, value);
    return { success: true };
  });

  fastify.post('/api/v1/sync/nmos', async (req) => {
    const { event, data } = req.body as { event: string; data: unknown };
    stateEngine.syncFromNMOS(event, data);
    return { success: true };
  });

  // ── Virtual Rack / Cloud MCR ──────────────────────────────────────────────

  fastify.get('/api/v1/rack/slots', async () => {
    const { getRackDevices } = await import('./db/queries');
    return { slots: await getRackDevices().catch(() => []) };
  });

  fastify.post('/api/v1/rack/slots', async (req) => {
    const slot = req.body as {
      slot_id?: string; unit: number; height?: number; type: string;
      label: string; location: string; region?: string; status?: string;
    };
    const { upsertRackDevice } = await import('./db/queries');
    const slotId = slot.slot_id ?? `slot-${Date.now()}`;
    await upsertRackDevice({
      slot_id: slotId, unit: slot.unit, height: slot.height ?? 1,
      type: slot.type, label: slot.label, location: slot.location,
      region: slot.region, status: slot.status ?? 'ok',
    }).catch(() => {});
    wsManager.broadcastToRoles(['OPERATOR', 'ENGINEER'], {
      type: 'RACK_SLOT_ADDED', slot: { ...slot, id: slotId }, timestamp: Date.now(),
    });
    return { success: true, id: slotId };
  });

  fastify.delete('/api/v1/rack/slots/:id', async (req) => {
    const { id } = req.params as { id: string };
    const { deleteRackDevice } = await import('./db/queries');
    await deleteRackDevice(id).catch(() => {});
    wsManager.broadcastToRoles(['OPERATOR', 'ENGINEER'], {
      type: 'RACK_SLOT_REMOVED', id, timestamp: Date.now(),
    });
    return { success: true };
  });

  fastify.get('/api/v1/rack/links', async () => {
    const { getCloudLinks } = await import('./db/queries');
    return { links: await getCloudLinks().catch(() => []) };
  });

  fastify.post('/api/v1/rack/links/:id/activate', async (req) => {
    const { id } = req.params as { id: string };
    wsManager.broadcast({ type: 'RACK_LINK_ACTIVATED', id, timestamp: Date.now() });
    return { success: true };
  });

  fastify.get('/api/v1/rack/health', async () => ({
    mode: 'hybrid', groundUnits: 0, cloudUnits: 0, activeLinks: 0, regions: [],
  }));

  // ── Rundowns ──────────────────────────────────────────────────────────────

  fastify.get('/api/v1/rundowns', async () => {
    const { getRundowns } = await import('./db/queries');
    return getRundowns().catch(() => []);
  });

  fastify.get('/api/v1/rundowns/:id/cues', async (req) => {
    const { id } = req.params as { id: string };
    const { getRundownCues } = await import('./db/queries');
    return getRundownCues(id).catch(() => []);
  });

  // ── Start services ────────────────────────────────────────────────────────

  wsManager.startHeartbeat();
  stateEngine.start();

  // Redis pub/sub (best-effort)
  startSubscriber(wsManager).catch(() => {});

  await fastify.listen({ port: parseInt(process.env.API_PORT ?? '8080'), host: '0.0.0.0' });
  console.log(`[NEXUS] API v7 running on port ${process.env.API_PORT ?? '8080'}`);
}

// ── WebSocket message handler ─────────────────────────────────────────────────

async function handleMessage(msg: WsMessage, clientId: string, role: Role, userId: string) {
  const allowed = ROLE_PERMISSIONS[role];
  if (!allowed.includes('*') && !allowed.includes(msg.type)) {
    wsManager.send(clientId, { type: 'ERROR', message: `Action ${msg.type} not permitted for role ${role}` });
    return;
  }

  switch (msg.type) {
    case 'SWITCHER_CUT': {
      const { me = 0, pvw } = msg.payload as { me?: number; pvw: number };
      const state = stateEngine.getState();
      const oldPgm = state.me[me]?.pgm ?? 0;
      stateEngine.cut(me, pvw);
      logSwitcherEvent(me, oldPgm, pvw, pvw, 'CUT', userId, 0, state.timecode).catch(() => {});
      break;
    }
    case 'SWITCHER_PVW': {
      const { me = 0, source } = msg.payload as { me?: number; source: number };
      stateEngine.setPvw(me, source);
      break;
    }
    case 'SWITCHER_AUTO': {
      const { me = 0 } = msg.payload as { me?: number };
      stateEngine.autoTransition(me);
      break;
    }
    case 'ROUTER_CONNECT': {
      const { level, dst, src } = msg.payload as { level: string; dst: string; src: string };
      stateEngine.route(level, dst, src);
      upsertCrosspoint(level, dst, src, userId, stateEngine.getState().timecode).catch(() => {});
      break;
    }
    case 'GET_STATE':
      wsManager.send(clientId, { type: 'FULL_STATE', state: stateEngine.getState(), timestamp: Date.now() });
      break;
    case 'CEREBRUM_ROUTE': {
      const { level, src, dst } = msg.payload as { level: string; src: string; dst: string };
      stateEngine.route(level, dst, src);
      upsertCrosspoint(level, dst, src, userId, stateEngine.getState().timecode).catch(() => {});
      break;
    }
    case 'CEREBRUM_TALLY':
      wsManager.broadcastToRoles(['OPERATOR', 'ENGINEER', 'TRAINER'], {
        type: 'CEREBRUM_TALLY', ...msg.payload, timestamp: Date.now(),
      });
      break;
    case 'CEREBRUM_MACRO_RUN': {
      const macroId = (msg.payload as { macroId: string })?.macroId;
      stateEngine.addAlarm('info', `Macro executed: ${macroId}`, 'macro');
      wsManager.broadcastToRoles(['OPERATOR', 'ENGINEER'], {
        type: 'CEREBRUM_MACRO_RUN', ...msg.payload, timestamp: Date.now(),
      });
      break;
    }
    case 'CEREBRUM_SALVO':
      wsManager.broadcast({ type: 'CEREBRUM_SALVO', ...msg.payload, timestamp: Date.now() });
      break;
    case 'ALARM_ACK': {
      const { id } = msg.payload as { id: string };
      stateEngine.acknowledgeAlarm(id);
      dbAckAlarm(id, userId).catch(() => {});
      break;
    }
  }
}

bootstrap().catch(err => {
  console.error(err);
  process.exit(1);
});
