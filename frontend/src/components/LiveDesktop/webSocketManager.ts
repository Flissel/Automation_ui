/**
 * TRAE Live Desktop - WebSocket Manager
 * 
 * Centralized WebSocket connection and message handling
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import { useRef, useCallback, useEffect } from 'react';
import { ScreenData, WebSocketState, WebSocketHandlers } from './types';

// ============================================================================
// WEBSOCKET UTILITIES
// ============================================================================

/**
 * Creates a WebSocket connection with proper error handling
 */
export const createWebSocketConnection = (
  url: string,
  handlers: WebSocketHandlers
): WebSocket => {
  console.log('🔌 [WS] Creating WebSocket connection to:', url);
  
  const ws = new WebSocket(url);
  
  ws.onopen = (event) => {
    console.log('✅ [WS] WebSocket connected');
    handlers.onOpen?.(event);
  };
  
  ws.onclose = (event) => {
    console.log('❌ [WS] WebSocket disconnected:', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });
    handlers.onClose?.(event);
  };
  
  ws.onerror = (event) => {
    console.error('💥 [WS] WebSocket error:', event);
    handlers.onError?.(event);
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handlers.onMessage?.(data);
    } catch (error) {
      console.error('🚫 [WS] Failed to parse message:', error);
    }
  };
  
  return ws;
};

/**
 * Sends a message through WebSocket with error handling
 */
export const sendWebSocketMessage = (
  ws: WebSocket | null,
  message: any
): boolean => {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('⚠️ [WS] Cannot send message - WebSocket not ready');
    return false;
  }
  
  try {
    ws.send(JSON.stringify(message));
    console.log('📤 [WS] Message sent:', message.type || 'unknown');
    return true;
  } catch (error) {
    console.error('💥 [WS] Failed to send message:', error);
    return false;
  }
};

// ============================================================================
// WEBSOCKET MANAGER HOOK
// ============================================================================

export interface UseWebSocketManagerProps {
  url: string;
  onFrameReceived: (frameData: string) => void;
  onScreenDataReceived: (screenData: ScreenData) => void;
  onConnectionChange: (connected: boolean) => void;
  frameThrottleMs?: number;
}

export const useWebSocketManager = ({
  url,
  onFrameReceived,
  onScreenDataReceived,
  onConnectionChange,
  frameThrottleMs = 16 // ~60fps
}: UseWebSocketManagerProps) => {
  const wsRef = useRef<WebSocket | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 2000;

  // ============================================================================
  // MESSAGE HANDLERS
  // ============================================================================
  
  const handleMessage = useCallback((data: any) => {
    const now = Date.now();
    
    switch (data.type) {
      case 'desktop_frame':
        // Handle desktop frame from live desktop service
        if (data.data && data.data.image) {
          // Throttle frame updates to prevent overwhelming the UI
          if (now - lastFrameTimeRef.current >= frameThrottleMs) {
            console.log('🖼️ [WS] Desktop frame received and processed');
            onFrameReceived(data.data.image);
            lastFrameTimeRef.current = now;
            
            // Also handle screen data if available
            if (data.data.resolution) {
              onScreenDataReceived({
                width: data.data.resolution.width,
                height: data.data.resolution.height,
                scale: 1
              });
            }
          } else {
            console.log('⏭️ [WS] Frame skipped due to throttling');
          }
        } else if (data.frame) {
          // Legacy format support
          if (now - lastFrameTimeRef.current >= frameThrottleMs) {
            console.log('🖼️ [WS] Frame received and processed (legacy format)');
            onFrameReceived(data.frame);
            lastFrameTimeRef.current = now;
          }
        }
        break;
        
      case 'screen_data':
        console.log('📊 [WS] Screen data received:', {
          width: data.width,
          height: data.height,
          scale: data.scale
        });
        onScreenDataReceived({
          width: data.width,
          height: data.height,
          scale: data.scale || 1
        });
        break;
        
      case 'connection_status':
        console.log('🔗 [WS] Connection status:', data.status);
        break;
        
      case 'welcome':
        console.log('👋 [WS] Welcome message received:', data.message);
        // Send a response to acknowledge the welcome
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'ping',
            timestamp: Date.now(),
            client: 'TRAE Frontend'
          }));
        }
        break;
        
      case 'ping':
        console.log('🏓 [WS] Ping received, sending pong');
        // Respond to ping with pong
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now(),
            client: 'TRAE Frontend'
          }));
        }
        break;
        
      case 'pong':
        console.log('🏓 [WS] Pong received');
        break;
        
      case 'config':
        console.log('⚙️ [WS] Configuration received:', data.data);
        break;
        
      case 'config_updated':
        console.log('⚙️ [WS] Configuration updated:', data.data);
        break;
        
      case 'error':
        console.error('❌ [WS] Server error:', data.message);
        break;
        
      case 'echo':
        console.log('🔄 [WS] Echo response:', data.original_message);
        break;

      // Desktop Automation Messages
      case 'automation_session_created':
        console.log('🤖 [WS] Automation session created:', data.session_id);
        break;
        
      case 'automation_session_closed':
        console.log('🤖 [WS] Automation session closed:', data.session_id);
        break;
        
      case 'powershell_executed':
        console.log('⚡ [WS] PowerShell executed:', {
          session_id: data.session_id,
          command: data.command,
          success: data.success,
          output: data.output?.substring(0, 100) + (data.output?.length > 100 ? '...' : '')
        });
        break;
        
      case 'program_opened':
        console.log('📂 [WS] Program opened:', {
          session_id: data.session_id,
          program: data.program,
          success: data.success
        });
        break;
        
      case 'mouse_click_tracked':
        console.log('🖱️ [WS] Mouse click tracked:', {
          session_id: data.session_id,
          x: data.x,
          y: data.y,
          sequence: data.sequence
        });
        break;
        
      case 'mouse_click_executed':
        console.log('🖱️ [WS] Mouse click executed:', {
          session_id: data.session_id,
          x: data.x,
          y: data.y,
          success: data.success
        });
        break;
        
      case 'ocr_results':
        console.log('📝 [WS] OCR results received:', {
          session_id: data.session_id,
          text_regions: data.text_regions?.length || 0,
          timestamp: data.timestamp
        });
        break;
        
      case 'ocr_periodic_update':
        console.log('📝 [WS] OCR periodic update:', {
          interval: data.interval,
          results_count: data.results?.length || 0
        });
        break;
        
      case 'automation_status':
        console.log('📊 [WS] Automation status:', {
          session_id: data.session_id,
          status: data.status,
          active_sessions: data.active_sessions
        });
        break;
        
      default:
        console.log('❓ [WS] Unknown message type:', data.type, data);
    }
  }, [onFrameReceived, onScreenDataReceived, frameThrottleMs]);

  // ============================================================================
  // CONNECTION HANDLERS
  // ============================================================================
  
  const handleOpen = useCallback(() => {
    console.log('🎉 [WS] Connection established');
    reconnectAttemptsRef.current = 0;
    onConnectionChange(true);
    
    // Clear any pending reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, [onConnectionChange]);
  
  const handleClose = useCallback((event: CloseEvent) => {
    console.log('🔌 [WS] Connection closed');
    onConnectionChange(false);
    
    // Attempt to reconnect if not a clean close
    if (!event.wasClean && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
      const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current);
      console.log(`🔄 [WS] Attempting reconnection in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectAttemptsRef.current++;
        connect();
      }, delay);
    } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.error('💀 [WS] Max reconnection attempts reached');
    }
  }, [onConnectionChange]);
  
  const handleError = useCallback((event: Event) => {
    console.error('💥 [WS] Connection error:', event);
    onConnectionChange(false);
  }, [onConnectionChange]);

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================
  
  const connect = useCallback(() => {
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    try {
      wsRef.current = createWebSocketConnection(url, {
        onOpen: handleOpen,
        onClose: handleClose,
        onError: handleError,
        onMessage: handleMessage
      });
    } catch (error) {
      console.error('💥 [WS] Failed to create connection:', error);
      onConnectionChange(false);
    }
  }, [url, handleOpen, handleClose, handleError, handleMessage, onConnectionChange]);
  
  const disconnect = useCallback(() => {
    console.log('🔌 [WS] Manually disconnecting');
    
    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    reconnectAttemptsRef.current = 0;
    onConnectionChange(false);
  }, [onConnectionChange]);
  
  const sendMessage = useCallback((message: any) => {
    return sendWebSocketMessage(wsRef.current, message);
  }, []);

  // ============================================================================
  // LIFECYCLE MANAGEMENT
  // ============================================================================
  
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, []); // Remove connect/disconnect from dependencies to prevent infinite loop

  // ============================================================================
  // STATE GETTERS
  // ============================================================================
  
  const getConnectionState = useCallback((): WebSocketState => {
    if (!wsRef.current) return 'disconnected';
    
    switch (wsRef.current.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'disconnecting';
      case WebSocket.CLOSED:
      default:
        return 'disconnected';
    }
  }, []);
  
  const isConnected = useCallback(() => {
    return wsRef.current?.readyState === WebSocket.OPEN;
  }, []);

  return {
    connect,
    disconnect,
    sendMessage,
    getConnectionState,
    isConnected,
    reconnectAttempts: reconnectAttemptsRef.current
  };
};