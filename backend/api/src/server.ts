import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fastifyHelmet from '@fastify/helmet';
import { WebSocketManager } from './websocket/manager';
import { Role, JwtPayload, WsMessage } from './types';
import { v4 as uuid } from 'uuid';

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  VIEWER:   ['GET_STATE'],
  OPERATOR: ['GET_STATE', 'SWITCHER_CUT', 'SWITCHER_AUTO', 'SWITCHER_PVW', 'SWITCHER_TBAR',
             'CEREBRUM_ROUTE', 'CEREBRUM_TALLY', 'CEREBRUM_MACRO_RUN', 'CEREBRUM_SALVO'],
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

async function bootstrap() {
  await fastify.register(fastifyHelmet, { contentSecurityPolicy: false });

  await fastify.register(fastifyCors, {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://nexus.control.studio']
      : true,
    credentials: true,
  });

  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
    sign: { expiresIn: '8h', issuer: 'nexus-v4' },
    verify: { issuer: 'nexus-v4' },
  });

  await fastify.register(fastifyWebsocket);

  // WebSocket control endpoint
  fastify.get('/ws/control', { websocket: true }, async (connection, req) => {
    const token = new URL(req.url, 'http://localhost').searchParams.get('token');
    if (!token) { connection.socket.close(1008, 'Missing token'); return; }

    let decoded: JwtPayload;
    try {
      decoded = await fastify.jwt.verify<JwtPayload>(token);
    } catch {
      connection.socket.close(1008, 'Invalid token');
      return;
    }

    const clientId = `${decoded.userId}-${uuid()}`;
    wsManager.register(connection.socket, { id: clientId, role: decoded.role, userId: decoded.userId });

    connection.socket.send(JSON.stringify({ type: 'INIT', role: decoded.role, timestamp: Date.now() }));

    connection.socket.on('message', async (raw: Buffer) => {
      try {
        const msg: WsMessage = JSON.parse(raw.toString());
        await handleMessage(msg, clientId, decoded.role);
      } catch (err) {
        connection.socket.send(JSON.stringify({ type: 'ERROR', message: 'Invalid message' }));
      }
    });

    connection.socket.on('close', () => wsManager.unregister(clientId));
  });

  // Health endpoints
  fastify.get('/health/live',  async () => ({ status: 'alive' }));
  fastify.get('/health/ready', async () => ({ status: 'ready', timestamp: Date.now() }));

  // Metrics stub
  fastify.get('/metrics', async () => {
    const stats = wsManager.stats();
    return [
      `nexus_ws_connections_total ${stats.total}`,
      ...Object.entries(stats.byRole).map(([r, n]) => `nexus_ws_connections_by_role{role="${r}"} ${n}`),
    ].join('\n');
  });

  // Switcher REST
  fastify.post('/api/v1/switcher/cut', async (req, reply) => {
    const { pvw, pgm } = req.body as { pvw: number; pgm: number };
    wsManager.broadcastToRoles(['OPERATOR', 'ENGINEER', 'TRAINER'], {
      type: 'TALLY_UPDATE', pgm: pvw, pvw: pgm, timestamp: Date.now(),
    });
    return { success: true, newPgm: pvw, newPvw: pgm, latency_ms: 4 };
  });

  fastify.get('/api/v1/switcher/health', async () => ({ status: 'healthy' }));
  fastify.get('/api/v1/switcher/state', async () => ({
    pgm: 1, pvw: 2, transition: 'CUT', rate: 25, inTransition: false,
  }));

  // PTP REST
  fastify.get('/api/v1/ptp/status', async () => ({
    offset: 8, locked: true, grandmasterId: 'NEXUS-GM-01', domain: 0, clockClass: 6,
  }));

  // Router REST
  fastify.get('/api/v1/router/flows', async () => []);

  // Multiviewer REST
  fastify.get('/api/v1/multiviewer/layout', async () => ({ layout: '4x4', cells: [] }));
  fastify.get('/api/v1/multiviewer/sources', async () => []);
  fastify.post('/api/v1/multiviewer/layout', async (req) => {
    wsManager.broadcast({ type: 'MV_UPDATE', ...(req.body as object) });
    return { success: true };
  });

  // Recorder REST
  fastify.get('/api/v1/recorder/storage', async () => ({
    usage_percent: 42, used_gb: 840, total_gb: 2000,
  }));

  // NMOS proxy
  fastify.get('/api/v1/nmos/health', async () => ({ status: 'healthy' }));

  // ── Cerebrum BCS ─────────────────────────────────────────────────────────

  // Router matrix — get all routes for a level
  fastify.get('/api/v1/cerebrum/router/:level', async (req) => {
    const { level } = req.params as { level: string };
    return { level, routes: [], sources: 16, destinations: 12 };
  });

  // Router matrix — set a route
  fastify.post('/api/v1/cerebrum/router/route', async (req) => {
    const { level, src, dst } = req.body as { level: string; src: string; dst: string };
    wsManager.broadcast({ type: 'CEREBRUM_ROUTE', level, src, dst, timestamp: Date.now() });
    return { success: true, level, src, dst };
  });

  // Tally — get all tally states
  fastify.get('/api/v1/cerebrum/tally', async () => ({ tallies: [] }));

  // Tally — set tally state
  fastify.post('/api/v1/cerebrum/tally', async (req) => {
    const { source, state, bus } = req.body as { source: string; state: string; bus: string };
    wsManager.broadcastToRoles(['OPERATOR', 'ENGINEER', 'TRAINER'], {
      type: 'CEREBRUM_TALLY', source, state, bus, timestamp: Date.now(),
    });
    return { success: true };
  });

  // Devices — list by protocol
  fastify.get('/api/v1/cerebrum/devices/:protocol', async (req) => {
    const { protocol } = req.params as { protocol: string };
    return { protocol, devices: [] };
  });

  // Macros — list
  fastify.get('/api/v1/cerebrum/macros', async () => ({ macros: [] }));

  // Macros — execute
  fastify.post('/api/v1/cerebrum/macros/:id/run', async (req) => {
    const { id } = req.params as { id: string };
    wsManager.broadcastToRoles(['OPERATOR', 'ENGINEER'], {
      type: 'CEREBRUM_MACRO_RUN', macroId: id, timestamp: Date.now(),
    });
    return { success: true, macroId: id };
  });

  // System health
  fastify.get('/api/v1/cerebrum/health', async () => ({
    status: 'healthy',
    components: {
      cerebrumServer: 'ok',
      routerMatrix: 'ok',
      tallyEngine: 'ok',
      emberGateway: 'warn',
      nmosRegistry: 'ok',
      automationEngine: 'ok',
    },
  }));

  // Alarms
  fastify.get('/api/v1/cerebrum/alarms', async () => ({ alarms: [] }));
  fastify.post('/api/v1/cerebrum/alarms/acknowledge', async (req) => {
    const { id } = req.body as { id: string };
    return { success: true, id };
  });

  wsManager.startHeartbeat();

  await fastify.listen({ port: parseInt(process.env.API_PORT ?? '8080'), host: '0.0.0.0' });
}

async function handleMessage(msg: WsMessage, clientId: string, role: Role) {
  const allowed = ROLE_PERMISSIONS[role];
  if (!allowed.includes('*') && !allowed.includes(msg.type)) {
    wsManager.send(clientId, { type: 'ERROR', message: `Action ${msg.type} not permitted for role ${role}` });
    return;
  }

  switch (msg.type) {
    case 'SWITCHER_CUT': {
      const { pvw, pgm } = msg.payload as { pvw: number; pgm: number };
      wsManager.broadcastToRoles(['OPERATOR', 'ENGINEER', 'TRAINER'], {
        type: 'TALLY_UPDATE', pgm: pvw, pvw: pgm, source: clientId, timestamp: Date.now(),
      });
      break;
    }
    case 'SWITCHER_PVW':
      wsManager.broadcast({ type: 'PVW_UPDATE', ...msg.payload, timestamp: Date.now() });
      break;
    case 'ROUTER_CONNECT':
      wsManager.broadcast({ type: 'ROUTER_UPDATE', ...msg.payload, active: true });
      break;
    case 'GET_STATE':
      wsManager.send(clientId, { type: 'STATE', pgm: 1, pvw: 2, timestamp: Date.now() });
      break;
    case 'CEREBRUM_ROUTE':
      wsManager.broadcast({ type: 'CEREBRUM_ROUTE', ...msg.payload, timestamp: Date.now() });
      break;
    case 'CEREBRUM_TALLY':
      wsManager.broadcastToRoles(['OPERATOR', 'ENGINEER', 'TRAINER'], {
        type: 'CEREBRUM_TALLY', ...msg.payload, timestamp: Date.now(),
      });
      break;
    case 'CEREBRUM_MACRO_RUN':
      wsManager.broadcastToRoles(['OPERATOR', 'ENGINEER'], {
        type: 'CEREBRUM_MACRO_RUN', ...msg.payload, timestamp: Date.now(),
      });
      break;
    case 'CEREBRUM_SALVO':
      wsManager.broadcast({ type: 'CEREBRUM_SALVO', ...msg.payload, timestamp: Date.now() });
      break;
  }
}

bootstrap().catch(err => {
  console.error(err);
  process.exit(1);
});
