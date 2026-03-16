/**
 * NEXUS WebSocket hook
 * Connects to the state engine and dispatches real-time events to the UI.
 * Handles reconnection, message queuing, and role-based filtering.
 */
import { useEffect, useRef, useCallback, useState } from 'react';

export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface NexusWsMessage {
  type: string;
  [key: string]: unknown;
}

interface UseWebSocketOptions {
  token: string;
  url?: string;
  onMessage?: (msg: NexusWsMessage) => void;
  onStatusChange?: (status: WsStatus) => void;
  reconnectDelay?: number;
  maxReconnects?: number;
}

export function useWebSocket({
  token,
  url,
  onMessage,
  onStatusChange,
  reconnectDelay = 2000,
  maxReconnects = 10,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const queueRef = useRef<NexusWsMessage[]>([]);
  const [status, setStatus] = useState<WsStatus>('disconnected');

  const wsUrl = url ?? (() => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;
    return `${proto}://${host}/ws/control?token=${token}`;
  })();

  const updateStatus = useCallback((s: WsStatus) => {
    setStatus(s);
    onStatusChange?.(s);
  }, [onStatusChange]);

  const send = useCallback((msg: NexusWsMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      queueRef.current.push(msg);
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    updateStatus('connecting');
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectCount.current = 0;
      updateStatus('connected');
      // Flush queued messages
      while (queueRef.current.length > 0) {
        const msg = queueRef.current.shift();
        if (msg) ws.send(JSON.stringify(msg));
      }
      // Request full state
      ws.send(JSON.stringify({ type: 'GET_STATE' }));
    };

    ws.onmessage = (event) => {
      try {
        const msg: NexusWsMessage = JSON.parse(event.data);
        onMessage?.(msg);
      } catch {
        console.warn('WS: invalid JSON', event.data);
      }
    };

    ws.onerror = () => updateStatus('error');

    ws.onclose = () => {
      updateStatus('disconnected');
      if (reconnectCount.current < maxReconnects) {
        reconnectCount.current++;
        reconnectTimer.current = setTimeout(connect, reconnectDelay * Math.min(reconnectCount.current, 5));
      }
    };
  }, [wsUrl, onMessage, updateStatus, reconnectDelay, maxReconnects]);

  useEffect(() => {
    if (token) connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close(1000, 'Component unmounted');
    };
  }, [token, connect]);

  // Switcher actions
  const cut = useCallback((me: number, pvw?: number) =>
    send({ type: 'SWITCHER_CUT', payload: { me, pvw } }), [send]);

  const setPvw = useCallback((me: number, source: number) =>
    send({ type: 'SWITCHER_PVW', payload: { me, source } }), [send]);

  const autoTransition = useCallback((me: number) =>
    send({ type: 'SWITCHER_AUTO', payload: { me } }), [send]);

  // Router actions
  const route = useCallback((level: string, dst: string, src: string) =>
    send({ type: 'ROUTER_CONNECT', payload: { level, dst, src } }), [send]);

  // Macro actions
  const runMacro = useCallback((macroId: string) =>
    send({ type: 'CEREBRUM_MACRO_RUN', payload: { macroId } }), [send]);

  // Alarm actions
  const acknowledgeAlarm = useCallback((id: string) =>
    send({ type: 'ALARM_ACK', payload: { id } }), [send]);

  return {
    status,
    send,
    cut,
    setPvw,
    autoTransition,
    route,
    runMacro,
    acknowledgeAlarm,
    isConnected: status === 'connected',
  };
}
