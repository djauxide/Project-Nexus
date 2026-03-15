import { WebSocket } from 'ws';
import { Role } from '../types';

interface Client {
  socket: WebSocket;
  id: string;
  role: Role;
  userId: string;
  connectedAt: Date;
  lastPing: Date;
}

export class WebSocketManager {
  private clients = new Map<string, Client>();
  private roleIndex = new Map<Role, Set<string>>([
    ['VIEWER', new Set()],
    ['OPERATOR', new Set()],
    ['ENGINEER', new Set()],
    ['TRAINER', new Set()],
  ]);

  register(socket: WebSocket, meta: Omit<Client, 'socket' | 'connectedAt' | 'lastPing'>): void {
    const client: Client = { socket, ...meta, connectedAt: new Date(), lastPing: new Date() };
    this.clients.set(meta.id, client);
    this.roleIndex.get(meta.role)?.add(meta.id);
    socket.on('ping', () => { client.lastPing = new Date(); socket.pong(); });
  }

  unregister(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    this.roleIndex.get(client.role)?.delete(clientId);
    this.clients.delete(clientId);
  }

  send(clientId: string, message: unknown): void {
    const client = this.clients.get(clientId);
    if (client?.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify(message));
    }
  }

  broadcastToRoles(roles: Role[], message: unknown): void {
    const msg = JSON.stringify(message);
    for (const role of roles) {
      for (const id of this.roleIndex.get(role) ?? []) {
        const client = this.clients.get(id);
        if (client?.socket.readyState === WebSocket.OPEN) {
          client.socket.send(msg);
        }
      }
    }
  }

  /** Broadcast Cerebrum events — operators and above */
  broadcastCerebrum(message: unknown): void {
    this.broadcastToRoles(['OPERATOR', 'ENGINEER', 'TRAINER'], message);
  }

  broadcast(message: unknown): void {
    const msg = JSON.stringify(message);
    for (const client of this.clients.values()) {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(msg);
      }
    }
  }

  startHeartbeat(): void {
    setInterval(() => {
      const timeout = 60_000;
      for (const [id, client] of this.clients) {
        if (Date.now() - client.lastPing.getTime() > timeout) {
          client.socket.terminate();
          this.unregister(id);
        } else {
          client.socket.ping();
        }
      }
    }, 30_000);
  }

  stats() {
    return {
      total: this.clients.size,
      byRole: Object.fromEntries(
        [...this.roleIndex.entries()].map(([r, s]) => [r, s.size])
      ),
    };
  }

  closeAll(): void {
    for (const client of this.clients.values()) {
      client.socket.close(1001, 'Server shutting down');
    }
    this.clients.clear();
    for (const s of this.roleIndex.values()) s.clear();
  }
}
