import { useEffect, useRef, useState, useCallback } from 'react';

interface WsMessage {
  type: string;
  [key: string]: unknown;
}

interface UseWebSocketReturn {
  sendMessage: (msg: WsMessage) => void;
  lastMessage: WsMessage | null;
  connected: boolean;
}

export function useWebSocket(token?: string): UseWebSocketReturn {
  const ws = useRef<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const wsUrl = process.env.REACT_APP_WS_URL ?? 'ws://localhost:8080';
    const url = token ? `${wsUrl}/ws/control?token=${token}` : `${wsUrl}/ws/control`;

    const connect = () => {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => setConnected(true);
      ws.current.onclose = () => {
        setConnected(false);
        setTimeout(connect, 3000); // reconnect
      };
      ws.current.onmessage = (e) => {
        try {
          setLastMessage(JSON.parse(e.data));
        } catch { /* ignore */ }
      };
    };

    connect();
    return () => ws.current?.close();
  }, [token]);

  const sendMessage = useCallback((msg: WsMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg));
    }
  }, []);

  return { sendMessage, lastMessage, connected };
}
