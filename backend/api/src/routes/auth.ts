import type { FastifyInstance } from 'fastify';
import { findUserByUsername, updateLastLogin, verifyPassword, createSession, invalidateSession } from '../db/queries';
import { logAudit } from '../db/queries';
import crypto from 'crypto';

export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/v1/auth/login
  fastify.post('/api/v1/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const { username, password } = req.body as { username: string; password: string };

    // Demo mode: accept any role-named user with password nexus2024
    const demoRoles: Record<string, string> = {
      engineer: 'ENGINEER', operator: 'OPERATOR', trainer: 'TRAINER', viewer: 'VIEWER',
    };

    let userId = `demo-${username}`;
    let role = demoRoles[username.toLowerCase()] ?? 'VIEWER';
    let displayName = username;

    // Try DB first
    try {
      const user = await findUserByUsername(username);
      if (user) {
        const valid = await verifyPassword(password, user.password_hash);
        if (!valid) {
          return reply.code(401).send({ error: 'Invalid credentials' });
        }
        userId = user.id;
        role = user.role;
        displayName = user.display_name ?? user.username;
        await updateLastLogin(userId);
      } else if (password !== 'nexus2024') {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }
    } catch {
      // DB unavailable — fall through to demo mode
      if (password !== 'nexus2024') {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }
    }

    const token = fastify.jwt.sign({ userId, role, username, displayName });

    // Store session hash (best-effort)
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const ip = req.ip ?? 'unknown';
      const ua = req.headers['user-agent'] ?? '';
      await createSession(userId, tokenHash, ip, ua);
      await logAudit(userId, 'LOGIN', 'session', undefined, { username, role }, ip);
    } catch { /* DB unavailable */ }

    return reply.send({ token, role, userId, displayName, expiresIn: '8h' });
  });

  // POST /api/v1/auth/refresh
  fastify.post('/api/v1/auth/refresh', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const user = req.user as { userId: string; role: string; username: string; displayName: string };
    const token = fastify.jwt.sign({
      userId: user.userId,
      role: user.role,
      username: user.username,
      displayName: user.displayName,
    });
    return reply.send({ token, role: user.role, expiresIn: '8h' });
  });

  // POST /api/v1/auth/logout
  fastify.post('/api/v1/auth/logout', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const authHeader = req.headers.authorization ?? '';
    const token = authHeader.replace('Bearer ', '');
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await invalidateSession(tokenHash);
    } catch { /* DB unavailable */ }
    return reply.send({ success: true });
  });

  // GET /api/v1/auth/me
  fastify.get('/api/v1/auth/me', {
    preHandler: [fastify.authenticate],
  }, async (req) => {
    return req.user;
  });
}
