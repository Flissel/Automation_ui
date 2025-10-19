/**
 * WebSocket Reconnection Hook
 * Provides automatic reconnection with exponential backoff
 * Preserves state and handles connection lifecycle
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { WEBSOCKET_CONFIG, sendWebSocketMessage } from '@/config/websocketConfig';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface UseWebSocketReconnectOptions {
  /** WebSocket URL */
  url: string;
  /** Initial handshake message to send on connection */
  handshakeMessage: any;
  /** Callback when connection is established */
  onOpen?: (ws: WebSocket) => void;
  /** Callback when message is received */
  onMessage?: (event: MessageEvent, ws: WebSocket) => void;
  /** Callback when connection is closed */
  onClose?: (event: CloseEvent) => void;
  /** Callback when error occurs */
  onError?: (event: Event) => void;
  /** Enable automatic reconnection (default: true) */
  autoReconnect?: boolean;
  /** Maximum reconnection attempts (default: from config) */
  maxReconnectAttempts?: number;
  /** Initial reconnection delay in ms (default: from config) */
  reconnectDelay?: number;
  /** Enable exponential backoff (default: true) */
  exponentialBackoff?: boolean;
  /** Maximum reconnection delay in ms (default: 60000) */
  maxReconnectDelay?: number;
}

export interface UseWebSocketReconnectReturn {
  /** Current WebSocket instance */
  websocket: WebSocket | null;
  /** Connection status */
  status: ConnectionStatus;
  /** Current reconnection attempt number */
  reconnectAttempt: number;
  /** Manually trigger reconnection */
  reconnect: () => void;
  /** Manually disconnect */
  disconnect: () => void;
  /** Send message through WebSocket */
  sendMessage: (message: any) => boolean;
  /** Check if connected */
  isConnected: boolean;
  /** Last error message */
  lastError: string | null;
}

export const useWebSocketReconnect = (
  options: UseWebSocketReconnectOptions
): UseWebSocketReconnectReturn => {
  const {
    url,
    handshakeMessage,
    onOpen,
    onMessage,
    onClose,
    onError,
    autoReconnect = true,
    maxReconnectAttempts = WEBSOCKET_CONFIG.CONNECTION.MAX_RECONNECT_ATTEMPTS,
    reconnectDelay = WEBSOCKET_CONFIG.CONNECTION.RECONNECT_DELAY,
    exponentialBackoff = true,
    maxReconnectDelay = 60000,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef<boolean>(true);
  const reconnectAttemptRef = useRef<number>(0);
  const manualDisconnectRef = useRef<boolean>(false);

  // Heartbeat refs for detecting dead connections
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pongTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPongRef = useRef<number>(Date.now());
  const missedPongsRef = useRef<number>(0);

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const calculateReconnectDelay = useCallback((attempt: number): number => {
    if (!exponentialBackoff) {
      return reconnectDelay;
    }

    // Exponential backoff: delay * (2 ^ attempt)
    const calculatedDelay = Math.min(
      reconnectDelay * Math.pow(2, attempt),
      maxReconnectDelay
    );

    console.log(`🔄 Reconnect attempt ${attempt + 1}: delay ${calculatedDelay}ms`);
    return calculatedDelay;
  }, [reconnectDelay, exponentialBackoff, maxReconnectDelay]);

  // Stop heartbeat mechanism
  const stopHeartbeat = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (pongTimeoutRef.current) {
      clearTimeout(pongTimeoutRef.current);
      pongTimeoutRef.current = null;
    }
    missedPongsRef.current = 0;
  }, []);

  // Start heartbeat mechanism
  const startHeartbeat = useCallback((ws: WebSocket) => {
    // Clear any existing heartbeat
    stopHeartbeat();

    console.log('💓 Starting heartbeat mechanism');
    lastPongRef.current = Date.now();
    missedPongsRef.current = 0;

    // Send ping every 30 seconds (half of PING_INTERVAL for safety)
    pingIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const now = Date.now();
        const timeSinceLastPong = now - lastPongRef.current;

        // Check if we've exceeded the timeout
        if (timeSinceLastPong > WEBSOCKET_CONFIG.CONNECTION.PING_TIMEOUT + 30000) {
          missedPongsRef.current += 1;
          console.warn(`⚠️ Missed pong ${missedPongsRef.current}/3 (${timeSinceLastPong}ms since last pong)`);

          // After 3 missed pongs, consider connection dead
          if (missedPongsRef.current >= 3) {
            console.error('❌ Connection appears dead (3 missed pongs), forcing reconnection');
            setLastError('Connection timeout - no heartbeat response');
            stopHeartbeat();
            ws.close(1000, 'Heartbeat timeout');
            return;
          }
        }

        // Send ping
        try {
          sendWebSocketMessage(ws, {
            type: 'ping',
            timestamp: now,
            clientId: (ws as any).clientId
          });
          console.log('📤 Ping sent');
        } catch (error) {
          console.error('Failed to send ping:', error);
          missedPongsRef.current += 1;
        }
      } else {
        console.warn('⚠️ WebSocket not open, stopping heartbeat');
        stopHeartbeat();
      }
    }, 30000); // 30 seconds

  }, [stopHeartbeat]);

  // Handle pong message
  const handlePongMessage = useCallback((message: any) => {
    if (message.type === 'pong') {
      const now = Date.now();
      const latency = message.timestamp ? now - message.timestamp : 0;
      lastPongRef.current = now;
      missedPongsRef.current = 0; // Reset missed pong counter
      console.log(`📥 Pong received (latency: ${latency}ms)`);
    }
  }, []);

  const connect = useCallback(() => {
    // Clear any pending reconnection timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close existing connection if any
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (error) {
        console.warn('Error closing existing WebSocket:', error);
      }
      wsRef.current = null;
    }

    console.log('🔗 Connecting to WebSocket:', url);
    setStatus('connecting');
    setLastError(null);

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setStatus('connected');
        setLastError(null);
        reconnectAttemptRef.current = 0;
        setReconnectAttempt(0);
        manualDisconnectRef.current = false;

        // Send handshake message
        if (ws.readyState === WebSocket.OPEN) {
          sendWebSocketMessage(ws, handshakeMessage);
        }

        // Start heartbeat mechanism
        startHeartbeat(ws);

        // Call user-provided onOpen callback
        onOpen?.(ws);
      };

      ws.onmessage = (event) => {
        // Try to parse message to check for pong
        try {
          const message = JSON.parse(event.data);
          handlePongMessage(message);
        } catch (error) {
          // Not JSON or parsing error, ignore for heartbeat purposes
        }

        // Call user-provided onMessage callback
        onMessage?.(event, ws);
      };

      ws.onerror = (event) => {
        console.error('❌ WebSocket error:', event);
        setStatus('error');
        setLastError('WebSocket connection error');
        onError?.(event);
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          manualDisconnect: manualDisconnectRef.current,
        });

        wsRef.current = null;

        // Call user-provided onClose callback
        onClose?.(event);

        // Attempt reconnection if not manually disconnected
        if (
          autoReconnect &&
          shouldReconnectRef.current &&
          !manualDisconnectRef.current &&
          reconnectAttemptRef.current < maxReconnectAttempts
        ) {
          setStatus('reconnecting');
          const delay = calculateReconnectDelay(reconnectAttemptRef.current);

          console.log(
            `🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current + 1}/${maxReconnectAttempts})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptRef.current += 1;
            setReconnectAttempt(reconnectAttemptRef.current);
            connect();
          }, delay);
        } else {
          if (reconnectAttemptRef.current >= maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached');
            setStatus('error');
            setLastError(`Failed to reconnect after ${maxReconnectAttempts} attempts`);
          } else {
            setStatus('disconnected');
          }
        }
      };
    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
      setStatus('error');
      setLastError(error instanceof Error ? error.message : 'Failed to create WebSocket');
    }
  }, [
    url,
    handshakeMessage,
    autoReconnect,
    maxReconnectAttempts,
    calculateReconnectDelay,
    onOpen,
    onMessage,
    onClose,
    onError,
  ]);

  const disconnect = useCallback(() => {
    console.log('🛑 Manually disconnecting WebSocket');
    manualDisconnectRef.current = true;
    shouldReconnectRef.current = false;

    // Stop heartbeat
    stopHeartbeat();

    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      try {
        wsRef.current.close(1000, 'Manual disconnect');
      } catch (error) {
        console.warn('Error closing WebSocket:', error);
      }
      wsRef.current = null;
    }

    setStatus('disconnected');
    reconnectAttemptRef.current = 0;
    setReconnectAttempt(0);
  }, [stopHeartbeat]);

  const reconnect = useCallback(() => {
    console.log('🔄 Manual reconnect triggered');
    reconnectAttemptRef.current = 0;
    setReconnectAttempt(0);
    manualDisconnectRef.current = false;
    shouldReconnectRef.current = true;
    connect();
  }, [connect]);

  const sendMessage = useCallback((message: any): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return sendWebSocketMessage(wsRef.current, message);
    }
    console.warn('Cannot send message: WebSocket not connected');
    return false;
  }, []);

  // Initial connection
  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();

    // Cleanup on unmount
    return () => {
      shouldReconnectRef.current = false;
      manualDisconnectRef.current = true;

      // Stop heartbeat
      stopHeartbeat();

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (wsRef.current) {
        try {
          wsRef.current.close(1000, 'Component unmount');
        } catch (error) {
          console.warn('Error closing WebSocket on unmount:', error);
        }
        wsRef.current = null;
      }
    };
  }, [connect, stopHeartbeat]);

  return {
    websocket: wsRef.current,
    status,
    reconnectAttempt,
    reconnect,
    disconnect,
    sendMessage,
    isConnected: status === 'connected',
    lastError,
  };
};
