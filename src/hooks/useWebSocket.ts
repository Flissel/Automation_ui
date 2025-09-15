import { useEffect, useRef, useCallback } from 'react';
import { useWorkflowStore } from '../stores/workflowStore';
import WEBSOCKET_CONFIG, { createHandshakeMessage } from '../config/websocketConfig';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: string;
}

interface UseWebSocketOptions {
  url?: string; // optional override; if omitted, use centralized config
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const {
    url = `${WEBSOCKET_CONFIG.BASE_URL}${WEBSOCKET_CONFIG.ENDPOINTS.LIVE_DESKTOP}`,
    autoConnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5
  } = options;

  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const isConnecting = useRef(false);

  const {
    setWsConnected,
    addWsMessage,
    updateNodeResult,
    setCurrentExecution,
    addExecutionLog,
    setExecutionVariable,
    currentExecution
  } = useWorkflowStore();

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      // Add message to store for debugging
      addWsMessage({
        ...message,
        timestamp: new Date().toISOString()
      });

      // Handle different message types
      switch (message.type) {
        case 'workflow_execution_update':
          if (message.data.execution) {
            setCurrentExecution(message.data.execution);
            addExecutionLog(`📊 Workflow status: ${message.data.execution.status}`);
          }
          break;

        case 'node_execution_update':
          if (message.data.node_id && message.data.result) {
            updateNodeResult(message.data.node_id, message.data.result);
            addExecutionLog(
              `🔧 Node ${message.data.node_id}: ${message.data.result.status}`
            );
          }
          break;

        case 'execution_status_update':
          if (message.data.status) {
            addExecutionLog(`📈 Execution status: ${message.data.status}`);
            if (message.data.execution) {
              setCurrentExecution(message.data.execution);
            }
          }
          break;

        case 'variable_update':
          if (message.data.name && message.data.variable) {
            setExecutionVariable(message.data.name, message.data.variable);
            addExecutionLog(`📝 Variable updated: ${message.data.name}`);
          }
          break;

        case 'error':
          addExecutionLog(`❌ WebSocket error: ${message.data.message || 'Unknown error'}`);
          break;

        case 'pong':
          // Handle ping/pong for connection health
          break;

        default:
          console.log('Unknown WebSocket message type:', message.type);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      addExecutionLog(`❌ Failed to parse WebSocket message: ${error}`);
    }
  }, [addWsMessage, updateNodeResult, setCurrentExecution, addExecutionLog, setExecutionVariable]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (isConnecting.current || (ws.current && ws.current.readyState === WebSocket.OPEN)) {
      return;
    }

    isConnecting.current = true;
    
    try {
      // Validate WebSocket URL before attempting connection
      if (!url || !url.startsWith('ws://') && !url.startsWith('wss://')) {
        throw new Error(`Invalid WebSocket URL: ${url}`);
      }
      
      addExecutionLog(`🔄 Attempting to connect to ${url}...`);
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
        addExecutionLog('🔗 WebSocket connected');
        reconnectAttempts.current = 0;
        isConnecting.current = false;

        // Send handshake message using standardized format expected by local server
        if (ws.current) {
          try {
            const clientId = `workflow_frontend_${Date.now()}`; // unique id per session
            const handshake = createHandshakeMessage(
              WEBSOCKET_CONFIG.CLIENT_TYPES.WEB,
              clientId,
              [WEBSOCKET_CONFIG.CAPABILITIES.WORKFLOW_DATA]
            );
            ws.current.send(JSON.stringify(handshake));
          } catch (err) {
            console.error('Failed to send handshake:', err);
          }
        }
      };

      ws.current.onmessage = handleMessage;

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setWsConnected(false);
        addExecutionLog(`🔌 WebSocket disconnected: ${event.reason || 'Unknown reason'}`);
        isConnecting.current = false;
        
        // Attempt to reconnect if not a manual close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          scheduleReconnect();
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        const errorMessage = error instanceof Event && error.target ? 
          `WebSocket connection failed to ${url}` : 
          'WebSocket connection error';
        addExecutionLog(`❌ ${errorMessage}`);
        setWsConnected(false);
        isConnecting.current = false;
        
        // Schedule reconnect on error if we haven't exceeded max attempts
        if (reconnectAttempts.current < maxReconnectAttempts) {
          scheduleReconnect();
        } else {
          addExecutionLog(`❌ Max reconnection attempts (${maxReconnectAttempts}) reached. Please check your connection.`);
        }
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addExecutionLog(`❌ Failed to create WebSocket connection: ${errorMessage}`);
      setWsConnected(false);
      isConnecting.current = false;
      
      // Schedule reconnect on connection creation failure
      if (reconnectAttempts.current < maxReconnectAttempts) {
        addExecutionLog(`🔄 Retrying connection in ${reconnectInterval}ms...`);
        scheduleReconnect();
      } else {
        addExecutionLog(`❌ Max reconnection attempts reached. Connection failed permanently.`);
      }
    }
  }, [url, setWsConnected, addExecutionLog, handleMessage, maxReconnectAttempts]);

  // Schedule reconnection
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
    }

    reconnectTimer.current = setTimeout(() => {
      reconnectAttempts.current++;
      addExecutionLog(`🔄 Reconnecting... (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
      connect();
    }, reconnectInterval);
  }, [connect, reconnectInterval, maxReconnectAttempts, addExecutionLog]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }

    if (ws.current) {
      ws.current.close(1000, 'Manual disconnect');
      ws.current = null;
    }

    setWsConnected(false);
    isConnecting.current = false;
  }, [setWsConnected]);

  // Send message through WebSocket
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        addExecutionLog(`❌ Failed to send message: ${error}`);
        return false;
      }
    } else {
      console.warn('WebSocket is not connected');
      addExecutionLog('⚠️ Cannot send message: WebSocket not connected');
      return false;
    }
  }, [addExecutionLog]);

  // Subscribe to workflow execution updates
  const subscribeToExecution = useCallback((executionId: string) => {
    return sendMessage({
      type: 'subscribe_workflow_execution',
      data: { execution_id: executionId }
    });
  }, [sendMessage]);

  // Unsubscribe from workflow execution updates
  const unsubscribeFromExecution = useCallback((executionId: string) => {
    return sendMessage({
      type: 'unsubscribe_workflow_execution',
      data: { execution_id: executionId }
    });
  }, [sendMessage]);

  // Send ping to keep connection alive
  const ping = useCallback(() => {
    return sendMessage({
      type: 'ping',
      data: { timestamp: Date.now() }
    });
  }, [sendMessage]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Auto-subscribe to current execution
  useEffect(() => {
    if (currentExecution && ws.current && ws.current.readyState === WebSocket.OPEN) {
      subscribeToExecution(currentExecution.id);
    }
  }, [currentExecution, subscribeToExecution]);

  // Ping interval to keep connection alive
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ping();
      }
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(pingInterval);
  }, [ping]);

  return {
    connect,
    disconnect,
    sendMessage,
    subscribeToExecution,
    unsubscribeFromExecution,
    ping,
    isConnected: ws.current?.readyState === WebSocket.OPEN
  };
};