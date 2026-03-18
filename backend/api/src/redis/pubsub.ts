import Redis from 'ioredis';
import type { WebSocketManager } from '../websocket/manager';

let publisher: Redis | null = null;
let subscriber: Redis | null = null;

const CHANNEL = 'nexus:events';

export function getPublisher(): Redis {
  if (!publisher) {
    publisher = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 200, 5000),
    });
    publisher.on('error', (e) => console.warn('[Redis pub] error:', e.message));
  }
  return publisher;
}

export async function publishEvent(event: unknown): Promise<void> {
  try {
    await getPublisher().publish(CHANNEL, JSON.stringify(event));
  } catch { /* Redis unavailable — events still go via in-process WS */ }
}

export async function startSubscriber(wsManager: WebSocketManager): Promise<void> {
  subscriber = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    lazyConnect: true,
    enableOfflineQueue: false,
    retryStrategy: (times) => Math.min(times * 200, 5000),
  });

  subscriber.on('error', (e) => console.warn('[Redis sub] error:', e.message));

  try {
    await subscriber.connect();
    await subscriber.subscribe(CHANNEL);

    subscriber.on('message', (_channel: string, message: string) => {
      try {
        const event = JSON.parse(message);
        // Re-broadcast to all local WS clients (multi-instance sync)
        wsManager.broadcast(event);
      } catch { /* ignore malformed */ }
    });

    console.log('[Redis] Pub/sub active on channel:', CHANNEL);
  } catch (e) {
    console.warn('[Redis] Pub/sub unavailable — running single-instance mode');
  }
}

export async function closeRedis(): Promise<void> {
  await publisher?.quit();
  await subscriber?.quit();
}
