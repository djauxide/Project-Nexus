/**
 * Integration tests for NEXUS v4 API
 * Requires the full stack running (docker-compose up -d)
 */

const BASE = process.env.API_URL ?? 'http://localhost:8080';

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`);
  return { status: res.status, body: await res.json() };
}

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

describe('API Health', () => {
  test('liveness', async () => {
    const { status } = await get('/health/live');
    expect(status).toBe(200);
  });

  test('readiness', async () => {
    const { status, body } = await get('/health/ready');
    expect(status).toBe(200);
    expect(body.status).toBe('ready');
  });
});

describe('Switcher', () => {
  test('health', async () => {
    const { status } = await get('/api/v1/switcher/health');
    expect(status).toBe(200);
  });

  test('state', async () => {
    const { status, body } = await get('/api/v1/switcher/state');
    expect(status).toBe(200);
    expect(body).toHaveProperty('pgm');
    expect(body).toHaveProperty('pvw');
  });

  test('cut', async () => {
    const { status, body } = await post('/api/v1/switcher/cut', { pvw: 3, pgm: 1 });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.latency_ms).toBeLessThan(20);
  });
});

describe('PTP', () => {
  test('status', async () => {
    const { status, body } = await get('/api/v1/ptp/status');
    expect(status).toBe(200);
    expect(body).toHaveProperty('offset');
    expect(Math.abs(body.offset)).toBeLessThan(100);
  });
});

describe('Multiviewer', () => {
  test('layout', async () => {
    const { status, body } = await get('/api/v1/multiviewer/layout');
    expect(status).toBe(200);
    expect(body).toHaveProperty('layout');
  });
});

describe('Storage', () => {
  test('recorder storage', async () => {
    const { status, body } = await get('/api/v1/recorder/storage');
    expect(status).toBe(200);
    expect(body.usage_percent).toBeLessThan(100);
  });
});
