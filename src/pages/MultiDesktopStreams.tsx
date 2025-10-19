import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Monitor, Grid, Play, Square, Settings, RefreshCw, Maximize2, Plus, AlertCircle } from 'lucide-react';
import { MultiDesktopStreamGrid } from '@/components/trae/liveDesktop/MultiDesktopStreamGrid';
import { DualCanvasOCRDesigner } from '@/components/trae/liveDesktop/DualCanvasOCRDesigner';
import { createMultiDesktopClient, sendWebSocketMessage, isWebSocketConnected, WEBSOCKET_CONFIG } from '@/config/websocketConfig';

interface DesktopClient {
  id: string;
  connected: boolean;
  streaming: boolean;
  timestamp: string;
  monitors?: string[];
  availableMonitors?: string[];
}

interface DesktopScreen {
  id: string;
  name: string;
  thumbnail?: string;
  isActive: boolean;
  resolution: {
    width: number;
    height: number;
  };
  connected: boolean;
}

const MultiDesktopStreams: React.FC = () => {
  const navigate = useNavigate();
  
  const [availableClients, setAvailableClients] = useState<DesktopClient[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Stream control state - Explicit control over live streaming
  const [isStreamingActive, setIsStreamingActive] = useState(false);
  
  // Real desktop clients state - fetched from WebSocket server
  const [desktopClients, setDesktopClients] = useState<any[]>([]);
  const [desktopScreens, setDesktopScreens] = useState<DesktopScreen[]>([]);
  const [latestScreenshots, setLatestScreenshots] = useState<{[clientId: string]: string}>({});
  
  // State for OCR configuration
  const [ocrConfig, setOcrConfig] = useState({
    regions: [],
    isActive: false,
    extractionInterval: 5000,
    confidenceThreshold: 0.8
  });

  // View mode toggle between grid and OCR designer
  const [viewMode, setViewMode] = useState<'grid' | 'ocr'>('grid');

  // Enhanced error handling state
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [maxReconnectAttempts] = useState(5);
  const [reconnectDelay, setReconnectDelay] = useState(3000);

  const wsRef = useRef<WebSocket | null>(null);
  // WEBSOCKET CONNECTION
  // ============================================================================

  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('✅ WebSocket already connected');
      return;
    }

    console.log('🔗 Connecting to Supabase Edge Function...');
    console.log('🔗 WebSocket URL:', `${WEBSOCKET_CONFIG.BASE_URL}${WEBSOCKET_CONFIG.ENDPOINTS.MULTI_DESKTOP}`);
    setIsLoading(true);
    setConnectionError(null);
    
    try {
      const { clientId, websocket, handshakeMessage } = createMultiDesktopClient('multi_desktop_streams');
      wsRef.current = websocket;
      
      websocket.onopen = () => {
      console.log('✅ Connected to Supabase Edge Function');
      setIsConnected(true);
      setIsLoading(false);
      setConnectionError(null);
      setReconnectAttempts(0);

      // Register as web client (standardized handshake)
      console.log('📤 [DEBUG] Sending handshake message:', handshakeMessage);

      // Ensure connection is ready before sending messages
      if (websocket.readyState === WebSocket.OPEN) {
        sendWebSocketMessage(websocket, handshakeMessage);

        // Request available desktop clients after handshake
        setTimeout(() => {
          if (websocket.readyState === WebSocket.OPEN) {
            sendWebSocketMessage(websocket, {
              type: 'get_desktop_clients',
              timestamp: new Date().toISOString()
            });
          }
        }, 500); // Reduced from 1000ms to 500ms
      }
    };

      websocket.onmessage = (event) => {
        console.log('📨 [DEBUG] Received message from server:', event.data);
      try {
        const message = JSON.parse(event.data);
        console.log('📥 [DEBUG] WebSocket message received - TYPE:', message.type);
        console.log('📥 [DEBUG] WebSocket message received - FULL MESSAGE:', message);
        
        switch (message.type) {
          case 'handshake_ack':
            console.log('Handshake acknowledged:', message);
            break;
            
          case 'desktop_clients_list':
            console.log('🔍 [DEBUG] Received desktop clients list:', message.clients);
            console.log('🔍 [DEBUG] Message object:', message);
            
            // Map clients to include 'id' field from 'clientId' for compatibility
            const mappedClients = (message.clients || []).map((client: any) => ({
              ...client,
              id: client.clientId || client.id // Ensure id field exists
            }));
            
            setAvailableClients(mappedClients);
            setDesktopClients(mappedClients);
            
            // ============================================================================
            // AUTOMATIC STREAMING FOR ALL AVAILABLE DESKTOPS
            // ============================================================================

            // Auto-select ALL connected clients for streaming (no limit)
            const connectedClients = mappedClients.filter((client: any) => client.connected);
            console.log('🔍 [DEBUG] All clients from message:', message.clients);
            console.log('🔍 [DEBUG] Connected clients filtered:', connectedClients);
            console.log(`🖥️ Starting automatic streaming for ${connectedClients.length} available desktop clients...`);
            
            if (connectedClients.length > 0) {
              // Select all available clients (no limit)
              const clientIds = connectedClients.map((client: any) => client.id);
              setSelectedClients(clientIds);

              // Auto-start streaming for ALL available clients with dynamic monitor support
              setTimeout(() => {
                console.log('🔍 [DEBUG] setTimeout executed - starting auto streaming for clients:', clientIds);
                clientIds.forEach((clientId, index) => {
                  console.log(`🚀 Starting automatic streaming for client ${index + 1}/${clientIds.length}: ${clientId}`);

                  // Find the corresponding client in the response to determine available monitors
                  const clientData = connectedClients.find((c: any) => c.id === clientId);
                  const availableMonitors = clientData?.monitors || clientData?.availableMonitors || [];

                  // Convert monitor objects to monitor IDs
                  const monitorIds = availableMonitors.length > 0
                    ? availableMonitors.map((m: any, index: number) => {
                        if (typeof m === 'object' && m !== null && 'index' in m) {
                          return `monitor_${m.index}`;
                        }
                        if (typeof m === 'string') {
                          return m;
                        }
                        return `monitor_${index}`;
                      })
                    : ['monitor_0', 'monitor_1']; // Default fallback

                  console.log(`📺 Client ${clientId} has ${monitorIds.length} available monitors:`, monitorIds);

                  // Start streaming only for available monitors
                  monitorIds.forEach((monitorId: string) => {
                    const streamMessage = {
                      type: 'start_stream', // Changed from start_desktop_stream
                      desktopClientId: clientId,
                      monitorId: monitorId,
                      timestamp: new Date().toISOString(),
                      autoStart: true // Flag for automatic start
                    };
                    console.log('🔍 [DEBUG] Sending WebSocket message:', streamMessage);
                    sendWebSocketMessage(websocket, streamMessage);
                  });
                });

                console.log(`✅ Automatic streaming initialized for all ${clientIds.length} desktop clients`);
              }, 1000);
            } else {
              console.log('⚠️ No connected desktop clients found for automatic streaming');
            }
            
            // Request screenshots from all connected clients
            (message.clients || []).forEach((client: any) => {
              if (client.connected) {
                requestScreenshot(client.id);
              }
            });
            break;
            
          case 'desktop_connected':
            console.log('🔗 New desktop client connected:', message.desktopClientId);

            // Automatically add the new client to selection
            setSelectedClients(prev => {
              if (!prev.includes(message.desktopClientId)) {
                const newSelection = [...prev, message.desktopClientId];

                // Start automatic streaming for the new client
                setTimeout(() => {
                  console.log(`🚀 Starting automatic streaming for new client: ${message.desktopClientId}`);

                  // Convert monitor objects to monitor IDs
                  const availableMonitors = message.availableMonitors || message.monitors || ['monitor_0', 'monitor_1'];
                  const monitorIds = availableMonitors.map((m: any, index: number) => {
                    // If monitor is an object with index field, use monitor_<index>
                    if (typeof m === 'object' && m !== null && 'index' in m) {
                      return `monitor_${m.index}`;
                    }
                    // If monitor is already a string, use it as-is
                    if (typeof m === 'string') {
                      return m;
                    }
                    // Fallback: use array index
                    return `monitor_${index}`;
                  });
                  console.log(`📺 New client ${message.desktopClientId} has ${monitorIds.length} available monitors:`, monitorIds);

                  monitorIds.forEach((monitorId: string) => {
                    sendWebSocketMessage(websocket, {
                      type: 'start_stream', // Changed from start_desktop_stream
                      desktopClientId: message.desktopClientId,
                      monitorId: monitorId,
                      timestamp: new Date().toISOString(),
                      autoStart: true
                    });
                  });

                  console.log(`✅ Automatic streaming started for new client ${message.desktopClientId}`);
                }, 500);
                
                return newSelection;
              }
              return prev;
            });
            
            // Refresh client list
            sendWebSocketMessage(websocket, {
              type: 'get_desktop_clients',
              timestamp: new Date().toISOString()
            });
            break;
            
          case 'desktop_disconnected':
            console.log('Desktop client disconnected:', message.desktopClientId);
            setAvailableClients(prev => 
              prev.filter(client => client.id !== message.desktopClientId)
            );
            setSelectedClients(prev => 
              prev.filter(id => id !== message.desktopClientId)
            );
            setDesktopClients(prev => prev.filter(client => client.id !== message.desktopClientId));
            setDesktopScreens(prev => prev.filter(screen => screen.id !== message.desktopClientId));
            
            // Remove screenshot from cache
            setLatestScreenshots(prev => {
              const updated = { ...prev } as any;
              delete (updated as any)[message.desktopClientId];
              return updated;
            });
            break;
            
          case 'frame_data':
            console.log('Frame data received:', {
              desktopClientId: message.desktopClientId,
              monitorId: message.monitorId,
              dimensions: message.metadata ? `${message.metadata.width}x${message.metadata.height}` : 'N/A',
              format: message.metadata?.format,
              frameNumber: message.frameNumber
            });

            // Handle multi-monitor frame data using desktopClientId
            if (message.desktopClientId && message.frameData) {
              // Determine image format from metadata
              const format = message.metadata?.format || 'jpeg';
              const isSvg = format.toLowerCase().includes('svg');
              const imageUrl = isSvg
                ? `data:image/svg+xml;base64,${message.frameData}`
                : `data:image/${format};base64,${message.frameData}`;

              const clientId = message.desktopClientId;
              const monitorId = message.monitorId || 'monitor_0';

              // Create a unique key for this monitor stream
              const streamKey = `${clientId}_${monitorId}`;

              // Update screenshot cache with monitor-specific key
              setLatestScreenshots(prev => ({
                ...prev,
                [streamKey]: imageUrl,
                [clientId]: imageUrl // Also update the main client key for backward compatibility
              }));

              // Send frame acknowledgment for backpressure control
              if (message.frameNumber !== undefined && websocket.readyState === WebSocket.OPEN) {
                const now = Date.now();
                const frameTimestamp = message.timestamp ? new Date(message.timestamp).getTime() : now;
                const latency = now - frameTimestamp;

                sendWebSocketMessage(websocket, {
                  type: 'frame_ack',
                  desktopClientId: clientId,
                  frameNumber: message.frameNumber,
                  latency: latency,
                  timestamp: new Date().toISOString()
                });

                console.log(`📥 Sent frame_ack for frame #${message.frameNumber} (latency: ${latency}ms)`);
              }
              
              // Update or create desktop screen entries for each monitor
              setDesktopScreens(prev => {
                const existingScreenIndex = prev.findIndex(screen => 
                  screen.id === streamKey
                );
                
                if (existingScreenIndex >= 0) {
                  // Update existing screen
                  return prev.map((screen, index) => 
                    index === existingScreenIndex 
                      ? { ...screen, thumbnail: imageUrl, connected: true }
                      : screen
                  );
                } else {
                  // Create new screen entry for this monitor
                  const monitorDisplayName = monitorId === 'monitor_0' ? 'Primary' : 
                                           monitorId === 'monitor_1' ? 'Secondary' : 
                                           `Monitor ${monitorId.replace('monitor_', '')}`;
                  
                  const newScreen: DesktopScreen = {
                    id: streamKey,
                    name: `${monitorDisplayName} (${clientId.substring(0, 8)})`,
                    isActive: prev.length === 0, // First monitor is active by default
                    resolution: { 
                      width: message.width || 1920, 
                      height: message.height || 1080 
                    },
                    connected: true,
                    thumbnail: imageUrl
                  };
                  
                  return [...prev, newScreen];
                }
              });
            }
            break;

          case 'dual_screen_frame':
            console.log('🔄 [DEBUG] Dual-screen frame received - RAW MESSAGE:', message);
            console.log('🔄 [DEBUG] Dual-screen frame details:', {
              clientId: message.client_id,
              screenId: message.screen_id,
              dimensions: `${message.width}x${message.height}`,
              format: message.format,
              timestamp: message.timestamp,
              frameNumber: message.frame_number,
              routingInfo: message.routingInfo,
              imageDataLength: message.image_data ? message.image_data.length : 0
            });

            // Process dual-screen frame data with enhanced client identification
            if (message.client_id && message.image_data) {
              console.log('🔄 [DEBUG] Processing dual-screen frame data...');
              const imageUrl = `data:image/${message.format || 'jpeg'};base64,${message.image_data}`;
              const clientId = message.client_id;
              const screenId = message.screen_id || 'screen1';
              console.log('🔄 [DEBUG] Created imageUrl:', imageUrl.substring(0, 100) + '...');
              console.log('🔄 [DEBUG] ClientId:', clientId, 'ScreenId:', screenId);

              // Map screen_id to monitor_id for consistency with existing structure
              // screen_id: 'screen1'/'screen2' or 0/1 -> monitor_id: 'monitor_0'/'monitor_1'
              let monitorId;
              if (typeof message.screen_id === 'number') {
                monitorId = `monitor_${message.screen_id}`;
              } else if (message.screen_id === 'screen1') {
                monitorId = 'monitor_0';
              } else if (message.screen_id === 'screen2') {
                monitorId = 'monitor_1';
              } else {
                // Default mapping for unknown screen IDs
                monitorId = 'monitor_0';
              }

              // Create stream key using dual screen client format for compatibility
              const streamKey = `${clientId}_${monitorId}`;

              console.log(`🖥️ [DEBUG] Processing dual-screen frame: ${streamKey} (Screen: ${screenId}, Monitor: ${monitorId})`);
              console.log('🖥️ [DEBUG] Generated streamKey:', streamKey);

              // Update screenshot cache with dual-screen specific key
              console.log('🖥️ [DEBUG] Updating latestScreenshots with streamKey:', streamKey);
              setLatestScreenshots(prev => {
                const updated = {
                  ...prev,
                  [streamKey]: imageUrl,
                  [clientId]: imageUrl // Backward compatibility with main client key
                };
                console.log('🖥️ [DEBUG] Updated latestScreenshots keys:', Object.keys(updated));
                console.log('🖥️ [DEBUG] Updated latestScreenshots for streamKey:', streamKey, 'exists:', !!updated[streamKey]);
                return updated;
              });

              // Send frame acknowledgment for backpressure control
              if (message.frame_number !== undefined && websocket.readyState === WebSocket.OPEN) {
                const now = Date.now();
                const frameTimestamp = message.timestamp ? new Date(message.timestamp).getTime() : now;
                const latency = now - frameTimestamp;

                sendWebSocketMessage(websocket, {
                  type: 'frame_ack',
                  desktopClientId: clientId,
                  frameNumber: message.frame_number,
                  latency: latency,
                  timestamp: new Date().toISOString()
                });

                console.log(`📥 Sent frame_ack for dual-screen frame #${message.frame_number} (latency: ${latency}ms)`);
              }
              
              // Update or create desktop screen entries for dual-screen monitors
              setDesktopScreens(prev => {
                const existingScreenIndex = prev.findIndex(screen => 
                  screen.id === streamKey
                );
                
                if (existingScreenIndex >= 0) {
                  // Update existing dual-screen entry
                  return prev.map((screen, index) => 
                    index === existingScreenIndex 
                      ? { 
                          ...screen, 
                          thumbnail: imageUrl, 
                          connected: true,
                          resolution: {
                            width: message.width || 1920,
                            height: message.height || 1080
                          }
                        }
                      : screen
                  );
                } else {
                  // Create new dual-screen entry
                  const monitorDisplayName = monitorId === 'monitor_0' ? 'Primary (Dual)' : 
                                           monitorId === 'monitor_1' ? 'Secondary (Dual)' : 
                                           `Dual Monitor ${monitorId.replace('monitor_', '')}`;
                  
                  const newScreen: DesktopScreen = {
                    id: streamKey,
                    name: `${monitorDisplayName} (${clientId.substring(0, 12)})`,
                    isActive: prev.length === 0, // First dual-screen monitor is active by default
                    resolution: { 
                      width: message.width || 1920, 
                      height: message.height || 1080 
                    },
                    connected: true,
                    thumbnail: imageUrl
                  };
                  
                  console.log(`✅ Created dual-screen entry: ${streamKey} -> ${monitorDisplayName}`);
                  return [...prev, newScreen];
                }
              });
            }
            break;

          case 'connection_established':
            console.log('Connection established:', message);
            break;
            
          case 'desktop_stream_status':
            console.log('Desktop stream status:', message);
            break;
            
          case 'start_capture':
            console.log('🎬 Start capture message received:', message);
            // Handle start capture configuration from dual-screen client
            if (message.config) {
              console.log('📋 Capture configuration:', message.config);
            }
            break;
            
          case 'capture_screenshot':
            console.log('📸 Capture screenshot message received:', message);
            // Handle screenshot capture request from dual-screen client
            break;
            
          case 'screenshot_error':
            console.log('❌ Screenshot error received:', message);
            if (message.clientId && message.error) {
              console.log(`❌ Error for client ${message.clientId}: ${message.error}`);
            }
            break;
            
          case 'stop_desktop_stream':
            console.log('⏹️ Stop desktop stream message received:', message);
            // Handle stop desktop stream request
            if (message.reason) {
              console.log(`⏹️ Stop reason: ${message.reason}`);
            }
            break;
            
          case 'start_desktop_stream':
            console.log('▶️ Start desktop stream message received:', message);
            // Handle start desktop stream request with configuration
            if (message.fps || message.quality || message.scale || message.format) {
              console.log('📋 Stream configuration:', {
                fps: message.fps,
                quality: message.quality,
                scale: message.scale,
                format: message.format
              });
            }
            break;
            
          case 'stream_started':
            console.log('✅ Stream started acknowledgment:', message);
            console.log(`✅ Desktop client ${message.desktopClientId} started streaming ${message.monitorId ? 'monitor: ' + JSON.stringify(message.monitorId) : ''}`);
            console.log(`📡 Stream initiated via: ${message.viaDatabase ? 'Database Command' : message.viaBroadcast ? 'Realtime Broadcast' : 'Direct Message'}`);
            // Stream has started, frames should start arriving via frame_data or dual_screen_frame messages
            break;

          case 'error':
            console.error('❌ Server error:', message.error);
            if (message.desktopClientId) {
              console.error(`❌ Error for desktop client: ${message.desktopClientId}`);

              // If error is "Desktop client not found", remove it from state
              if (message.error && message.error.includes('not found')) {
                console.log(`🧹 Removing non-existent client from state: ${message.desktopClientId}`);

                // Remove from selected clients
                setSelectedClients(prev => prev.filter(id => id !== message.desktopClientId));

                // Remove from available clients
                setAvailableClients(prev => prev.filter(client => client.id !== message.desktopClientId));

                // Remove from desktop clients
                setDesktopClients(prev => prev.filter(client => client.id !== message.desktopClientId));

                // Remove desktop screens for this client
                setDesktopScreens(prev => prev.filter(screen => !screen.id.startsWith(message.desktopClientId)));

                // Remove screenshots for this client
                setLatestScreenshots(prev => {
                  const updated = { ...prev };
                  Object.keys(updated).forEach(key => {
                    if (key.startsWith(message.desktopClientId)) {
                      delete updated[key];
                    }
                  });
                  return updated;
                });
              }
            }
            // Handle error appropriately - could show toast notification to user
            break;

          case 'ping':
            // Handle ping messages silently - these are keep-alive messages
            break;

          default:
            console.log('Unhandled message type:', message.type);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    websocket.onclose = (event) => {
      console.log('🔌 [DEBUG] WebSocket connection closed:', event.code, event.reason);
      console.log('🔌 [DEBUG] WebSocket close event details:', event);
      setIsConnected(false);
      setIsLoading(false);
      
      // Enhanced error handling for different close codes
      let errorMessage = null;
      switch (event.code) {
        case 1000:
          console.log('✅ WebSocket closed normally');
          setConnectionError(null);
          return; // Don't attempt reconnection for normal closure
        case 1001:
          errorMessage = 'Server is going away or browser navigating away';
          break;
        case 1006:
          errorMessage = 'Connection lost unexpectedly - attempting to reconnect';
          break;
        case 1011:
          errorMessage = 'Server encountered an unexpected condition';
          break;
        case 1012:
          errorMessage = 'Server is restarting';
          break;
        default:
          errorMessage = `Connection closed with code ${event.code}: ${event.reason || 'Unknown reason'}`;
      }
      
      if (errorMessage) {
        console.warn('⚠️ WebSocket close reason:', errorMessage);
        setConnectionError(errorMessage);
      }
      
      // Attempt to reconnect with exponential backoff if under max attempts
      if (reconnectAttempts < maxReconnectAttempts) {
        const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts), 30000); // Max 30 seconds
        console.log(`🔄 [DEBUG] Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
        
        setTimeout(() => {
          if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
            setReconnectAttempts(prev => prev + 1);
            connectWebSocket();
          }
        }, delay);
      } else {
        console.error('❌ Max reconnection attempts reached. Please check your connection and try again manually.');
        setConnectionError('Failed to reconnect after multiple attempts. Please check your connection and try again manually.');
        setReconnectAttempts(0); // Reset for manual retry
      }
    };

    websocket.onerror = (error) => {
      console.error('❌ [DEBUG] WebSocket error:', error);
      console.error('❌ [DEBUG] WebSocket error details:', {
        readyState: websocket.readyState,
        url: websocket.url,
        protocol: websocket.protocol
      });
      setIsLoading(false);
      
      // Enhanced error handling with user-friendly messages
      let userFriendlyError = 'WebSocket connection error occurred';
      
      // Check if it's a network connectivity issue
      if (!navigator.onLine) {
        userFriendlyError = 'No internet connection detected. Please check your network connection.';
      } else if (websocket.url.includes('localhost') || websocket.url.includes('127.0.0.1')) {
        userFriendlyError = 'Cannot connect to local server. Please ensure the backend server is running on the correct port.';
      } else {
        userFriendlyError = `Failed to connect to server at ${websocket.url}. Please check if the server is accessible.`;
      }
      
      setConnectionError(userFriendlyError);
      console.error('❌ User-friendly error:', userFriendlyError);
    };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setIsLoading(false);
      
      // Enhanced error handling for connection creation failures
      let errorMessage = 'Failed to create WebSocket connection';
      
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED')) {
          errorMessage = 'Connection refused - server may not be running or accessible';
        } else if (error.message.includes('ENOTFOUND')) {
          errorMessage = 'Server not found - please check the server address';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Connection timeout - server may be overloaded or unreachable';
        } else {
          errorMessage = `Connection error: ${error.message}`;
        }
      }
      
      setConnectionError(errorMessage);
      console.error('❌ Connection creation error:', errorMessage);
    }
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setAvailableClients([]);
    setSelectedClients([]);
    setDesktopScreens([]); // Clear desktop screens to prevent stale data
    setLatestScreenshots({}); // Clear screenshot cache
    setConnectionError(null); // Clear any connection errors
    setReconnectAttempts(0); // Reset reconnection attempts
  };

  // Manual retry function for user-initiated reconnection
  const retryConnection = () => {
    console.log('🔄 Manual retry initiated by user');
    setConnectionError(null);
    setReconnectAttempts(0);
    connectWebSocket();
  };

  // ============================================================================
  // CLIENT MANAGEMENT
  // ============================================================================

  const generatePlaceholderThumbnail = (index: number) => {
    const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
    const color = colors[index % colors.length];
    return `data:image/svg+xml;base64,${btoa(`<svg width="320" height="180" viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="320" height="180" fill="${color}"/><rect x="20" y="20" width="280" height="140" fill="#FFFFFF" rx="8"/><rect x="40" y="40" width="240" height="100" fill="#F9FAFB"/></svg>`)}`;
  };

  const requestScreenshot = (clientId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'request_screenshot',
        desktopClientId: clientId, // Changed from clientId to desktopClientId
        timestamp: new Date().toISOString()
      }));
    }
  };

  const refreshClientList = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'get_desktop_clients',
        timestamp: new Date().toISOString()
      }));
    }
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev => {
      const isCurrentlySelected = prev.includes(clientId);
      const newSelection = isCurrentlySelected
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]; // No client limit

      console.log(`🖥️ Client ${clientId} ${newSelection.includes(clientId) ? 'selected' : 'deselected'}`);

      // No automatic stream control anymore - only client selection
      // Streaming is now controlled via explicit Start/Stop buttons

      return newSelection;
    });
  };

  const selectAllClients = () => {
    // Select all available connected clients (no limit)
    const connectableClients = availableClients
      .filter(client => client.connected)
      .map(client => client.id);

    console.log(`🖥️ Selecting all available desktop clients: ${connectableClients.length} clients`);
    setSelectedClients(connectableClients);

    // Auto-start streaming for ALL selected clients with dynamic monitor support
    if (wsRef.current && connectableClients.length > 0) {
      setTimeout(() => {
        connectableClients.forEach((clientId, index) => {
          console.log(`🚀 Starting streaming for client ${index + 1}/${connectableClients.length}: ${clientId}`);

          // Find available monitors for this client
          const clientData = availableClients.find(client => client.id === clientId);
          const availableMonitors = clientData?.monitors || clientData?.availableMonitors || [];

          // Convert monitor objects to monitor IDs
          const monitorIds = availableMonitors.length > 0
            ? availableMonitors.map((m: any, index: number) => {
                if (typeof m === 'object' && m !== null && 'index' in m) {
                  return `monitor_${m.index}`;
                }
                if (typeof m === 'string') {
                  return m;
                }
                return `monitor_${index}`;
              })
            : ['monitor_0', 'monitor_1'];

          console.log(`📺 Client ${clientId} has ${monitorIds.length} available monitors:`, monitorIds);

          // Start streaming only for available monitors
          monitorIds.forEach((monitorId: string) => {
            wsRef.current?.send(JSON.stringify({
              type: 'start_desktop_stream',
              desktopClientId: clientId,
              monitorId: monitorId,
              timestamp: new Date().toISOString(),
              autoStart: true
            }));
          });
        });

        console.log(`✅ Streaming started for all ${connectableClients.length} desktop clients`);
      }, 500);
    } else {
      console.log('⚠️ No connected desktop clients available for streaming');
    }
  };

  const clearSelection = () => {
    // Stop streaming for all currently selected clients
    if (wsRef.current && selectedClients.length > 0) {
      console.log(`🛑 Stopping streaming for all ${selectedClients.length} selected clients`);

      selectedClients.forEach((clientId, index) => {
        console.log(`🛑 Stopping streaming for client ${index + 1}/${selectedClients.length}: ${clientId}`);

        // Find available monitors for this client
        const clientData = availableClients.find(client => client.id === clientId);
        const availableMonitors = clientData?.monitors || clientData?.availableMonitors || [];

        // Convert monitor objects to monitor IDs
        const monitorIds = availableMonitors.length > 0
          ? availableMonitors.map((m: any, index: number) => {
              if (typeof m === 'object' && m !== null && 'index' in m) {
                return `monitor_${m.index}`;
              }
              if (typeof m === 'string') {
                return m;
              }
              return `monitor_${index}`;
            })
          : ['monitor_0', 'monitor_1'];

        monitorIds.forEach((monitorId: string) => {
          wsRef.current?.send(JSON.stringify({
            type: 'stop_desktop_stream',
            desktopClientId: clientId,
            monitorId: monitorId,
            timestamp: new Date().toISOString()
          }));
        });
      });

      console.log('✅ Streaming stopped for all clients');
    }

    setSelectedClients([]);
  };

  // ============================================================================
  // LIVE STREAM CONTROL FUNCTIONS
  // ============================================================================

  /**
   * Starts live streaming for all selected clients
   * Sends start_desktop_stream messages for all available monitors
   */
  const startLiveStream = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('❌ WebSocket not connected - cannot start streaming');
      return;
    }

    if (selectedClients.length === 0) {
      console.warn('⚠️ No clients selected - cannot start streaming');
      return;
    }

    console.log(`🚀 Starting live streaming for ${selectedClients.length} selected clients`);
    setIsStreamingActive(true);

    selectedClients.forEach((clientId, index) => {
      console.log(`🚀 Starting streaming for client ${index + 1}/${selectedClients.length}: ${clientId}`);

      // Find available monitors for this client
      const clientData = availableClients.find(client => client.id === clientId);

      // Skip if client not found in available clients
      if (!clientData) {
        console.warn(`⚠️ Client ${clientId} not found in available clients, skipping`);
        return;
      }

      const availableMonitors = clientData?.monitors || clientData?.availableMonitors || [];

      // Convert monitor objects to monitor IDs
      const monitorIds = availableMonitors.length > 0
        ? availableMonitors.map((m: any, index: number) => {
            if (typeof m === 'object' && m !== null && 'index' in m) {
              return `monitor_${m.index}`;
            }
            if (typeof m === 'string') {
              return m;
            }
            return `monitor_${index}`;
          })
        : ['monitor_0', 'monitor_1'];

      console.log(`📺 Client ${clientId} has ${monitorIds.length} available monitors:`, monitorIds);

      // Start streaming for all available monitors
      monitorIds.forEach((monitorId: string) => {
        const startMessage = {
          type: 'start_stream',
          desktopClientId: clientId,
          monitorId: monitorId,
          timestamp: new Date().toISOString(),
          manualStart: true // Flag for manual start
        };
        console.log('📤 Sending start_stream message:', startMessage);
        sendWebSocketMessage(wsRef.current!, startMessage);
      });
    });

    console.log(`✅ Live streaming started for all ${selectedClients.length} clients`);
  };

  /**
   * Stops live streaming for all selected clients
   * Sends stop_stream messages for all available monitors
   */
  const stopLiveStream = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('❌ WebSocket not connected - cannot stop streaming');
      return;
    }

    console.log(`🛑 Stopping live streaming for ${selectedClients.length} selected clients`);
    setIsStreamingActive(false);

    selectedClients.forEach((clientId, index) => {
      console.log(`🛑 Stopping streaming for client ${index + 1}/${selectedClients.length}: ${clientId}`);

      // Find available monitors for this client
      const clientData = availableClients.find(client => client.id === clientId);

      // Skip if client not found in available clients
      if (!clientData) {
        console.warn(`⚠️ Client ${clientId} not found in available clients, skipping`);
        return;
      }

      const availableMonitors = clientData?.monitors || clientData?.availableMonitors || [];

      // Convert monitor objects to monitor IDs
      const monitorIds = availableMonitors.length > 0
        ? availableMonitors.map((m: any, index: number) => {
            if (typeof m === 'object' && m !== null && 'index' in m) {
              return `monitor_${m.index}`;
            }
            if (typeof m === 'string') {
              return m;
            }
            return `monitor_${index}`;
          })
        : ['monitor_0', 'monitor_1'];

      monitorIds.forEach((monitorId: string) => {
        const stopMessage = {
          type: 'stop_stream',
          desktopClientId: clientId,
          monitorId: monitorId,
          timestamp: new Date().toISOString(),
          manualStop: true // Flag for manual stop
        };
        console.log('📤 Sending stop_stream message:', stopMessage);
        sendWebSocketMessage(wsRef.current!, stopMessage);
      });
    });

    console.log(`✅ Live streaming stopped for all ${selectedClients.length} clients`);
  };

  // ============================================================================
  // DESKTOP SCREEN MANAGEMENT
  // ============================================================================

  const switchToDesktop = (desktopId: string) => {
    setDesktopScreens(prev => 
      prev.map(desktop => ({
        ...desktop,
        isActive: desktop.id === desktopId
      }))
    );
    console.log(`Switched to desktop: ${desktopId}`);
  };

  const createNewDesktop = () => {
    const newDesktopId = `desktop_${desktopScreens.length + 1}`;
    const newDesktop: DesktopScreen = {
      id: newDesktopId,
      name: `Desktop ${desktopScreens.length + 1}`,
      isActive: false,
      resolution: { width: 1920, height: 1080 },
      connected: true,
      thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjNkI3Mjg0Ii8+CjxyZWN0IHg9IjIwIiB5PSIyMCIgd2lkdGg9IjI4MCIgaGVpZ2h0PSIxNDAiIGZpbGw9IiNGRkZGRkYiIHJ4PSI4Ii8+CjxyZWN0IHg9IjQwIiB5PSI0MCIgd2lkdGg9IjI0MCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNGOUZBRkIiLz4KPHN2Zz4K'
    };
    
    setDesktopScreens(prev => [...prev, newDesktop]);
    console.log(`Created new desktop: ${newDesktopId}`);
  };

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  useEffect(() => {
    // Auto-connect to WebSocket server when component mounts
    connectWebSocket();
    
    return () => {
      disconnectWebSocket();
    };
  }, []);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderDesktopScreensGrid = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Grid className="w-6 h-6" />
          <span>Available Desktop Screens</span>
        </CardTitle>
        <CardDescription>
          Select a desktop screen to view or create a new one
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* Existing Desktop Screens */}
          {desktopScreens.map((desktop) => (
            <div
              key={desktop.id}
              className={`relative group cursor-pointer transition-all duration-200 hover:scale-105 ${
                desktop.isActive ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => switchToDesktop(desktop.id)}
            >
              <Card className={`overflow-hidden ${desktop.isActive ? 'bg-primary/5' : 'hover:bg-muted/50'}`}>
                <CardContent className="p-0">
                  {/* Desktop Thumbnail */}
                  <div className="relative aspect-video bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden">
                    {/* Use latest screenshot from latestScreenshots state for real-time updates */}
                    {(() => {
                      // Get the most recent screenshot for this desktop
                      const latestScreenshot = latestScreenshots[desktop.id] || desktop.thumbnail;
                      
                      return latestScreenshot ? (
                        <img 
                          src={latestScreenshot} 
                          alt={desktop.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.warn(`Failed to load thumbnail for ${desktop.name}:`, e);
                            // Fallback to placeholder on error
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Monitor className="w-12 h-12 text-white/70" />
                        </div>
                      );
                    })()}
                    
                    {/* Active Indicator */}
                    {desktop.isActive && (
                      <div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                    
                    {/* Connection Status */}
                    <div className={`absolute bottom-2 left-2 w-2 h-2 rounded-full ${
                      desktop.connected ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                  </div>
                  
                  {/* Desktop Info */}
                  <div className="p-3">
                    <h3 className="font-medium text-sm text-center">{desktop.name}</h3>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      {desktop.resolution.width} × {desktop.resolution.height}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
          
          {/* New Desktop Button */}
          <div
            className="relative group cursor-pointer transition-all duration-200 hover:scale-105"
            onClick={createNewDesktop}
          >
            <Card className="overflow-hidden hover:bg-muted/50 border-dashed border-2">
              <CardContent className="p-0">
                {/* New Desktop Placeholder */}
                <div className="relative aspect-video bg-muted/30 flex items-center justify-center">
                  <div className="text-center">
                    <Plus className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">New Desktop</p>
                  </div>
                </div>

                {/* New Desktop Info */}
                <div className="p-3">
                  <h3 className="font-medium text-sm text-center text-muted-foreground">
                    Create New Desktop
                  </h3>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    Click to add
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderConnectionStatus = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Monitor className="w-6 h-6" />
          <span>Multi-Desktop Stream Connection</span>
        </CardTitle>
        <CardDescription>
          Manage connections to multiple desktop clients for simultaneous streaming
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 
                isLoading ? 'bg-yellow-500 animate-pulse' : 
                'bg-red-500'
              }`} />
              <span className="text-sm font-medium">
                {isConnected ? 'Connected to WebSocket Server' : 
                 isLoading ? 'Connecting...' : 
                 'Disconnected'}
              </span>
              {reconnectAttempts > 0 && !isConnected && (
                <span className="text-xs text-muted-foreground">
                  (Attempt {reconnectAttempts}/{maxReconnectAttempts})
                </span>
              )}
            </div>
            <div className="flex space-x-2">
              {!isConnected ? (
                <>
                  <Button onClick={connectWebSocket} disabled={isLoading}>
                    <Play className="w-4 h-4 mr-2" />
                    {isLoading ? 'Connecting...' : 'Connect'}
                  </Button>
                  {connectionError && (
                    <Button onClick={retryConnection} variant="outline" disabled={isLoading}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry
                    </Button>
                  )}
                </>
              ) : (
                <Button onClick={disconnectWebSocket} variant="outline">
                  <Square className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
              )}
            </div>
          </div>
          
          {/* Error Display */}
          {connectionError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-destructive mb-1">
                    Connection Error
                  </h4>
                  <p className="text-sm text-destructive/80">
                    {connectionError}
                  </p>
                  {reconnectAttempts >= maxReconnectAttempts && (
                    <div className="mt-2">
                      <Button 
                        onClick={retryConnection} 
                        size="sm" 
                        variant="outline"
                        className="border-destructive/30 text-destructive hover:bg-destructive/10"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Try Again
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  /**
   * Renders the stream controls with Start/Stop button
   * Button is only active when clients are selected and WebSocket is connected
   */
  const renderStreamControls = () => {
    const hasSelectedClients = selectedClients.length > 0;
    const canControl = isConnected && hasSelectedClients;

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Play className="w-6 h-6" />
            <span>Live Stream Control</span>
          </CardTitle>
          <CardDescription>
            Start and stop live streaming for selected clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Stream Status Display */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  isStreamingActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                }`} />
                <div>
                  <p className="text-sm font-medium">
                    {isStreamingActive ? 'Live streaming active' : 'Live streaming inactive'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedClients.length} client(s) selected
                  </p>
                </div>
              </div>

              {/* Stream Controls */}
              <div className="flex space-x-2">
                {!isStreamingActive ? (
                  <Button
                    onClick={startLiveStream}
                    disabled={!canControl}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="lg"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Stream
                  </Button>
                ) : (
                  <Button
                    onClick={stopLiveStream}
                    disabled={!isConnected}
                    variant="destructive"
                    size="lg"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop Stream
                  </Button>
                )}
              </div>
            </div>

            {/* Help Text */}
            {!hasSelectedClients && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4" />
                <span>Select at least one client to start streaming</span>
              </div>
            )}

            {!isConnected && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4" />
                <span>WebSocket connection required for stream control</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderClientSelector = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Grid className="w-6 h-6" />
            <span>Available Desktop Clients</span>
          </div>
          <Button onClick={refreshClientList} variant="outline" size="sm" disabled={!isConnected}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>
          Select desktop clients for simultaneous streaming (Selected: {selectedClients.length})
        </CardDescription>
      </CardHeader>
      <CardContent>
        {availableClients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Monitor className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No desktop clients available</p>
            <p className="text-sm">Start desktop clients to see them here</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex space-x-2 mb-4">
              <Button onClick={selectAllClients} variant="outline" size="sm">
                Select All
              </Button>
              <Button onClick={clearSelection} variant="outline" size="sm">
                Clear Selection
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {availableClients.map((client) => (
                <Card 
                  key={client.id}
                  className={`cursor-pointer transition-all ${
                    selectedClients.includes(client.id) 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:bg-muted/50'
                  } ${!client.connected ? 'opacity-50' : ''}`}
                  onClick={() => client.connected && toggleClientSelection(client.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{client.id}</span>
                      <div className={`w-2 h-2 rounded-full ${
                        client.connected ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {client.connected ? 'Connected' : 'Disconnected'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(client.timestamp).toLocaleTimeString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Memoize selectedClientsWithMonitors to prevent infinite re-renders
  // Note: Only depends on selectedClients to prevent unnecessary re-renders
  // when availableClients updates frequently via WebSocket events
  const selectedClientsWithMonitors = useMemo(() => {
    return selectedClients.map(clientId => {
      return {
        clientId,
        clientName: `Desktop ${clientId.substring(0, 8)}`,
        monitors: [
          { 
            monitorId: 'monitor_0', 
            name: 'Primary Display',
            resolution: { width: 1920, height: 1080 }
          },
          { 
            monitorId: 'monitor_1', 
            name: 'Secondary Display',
            resolution: { width: 1920, height: 1080 }
          }
        ]
      };
    });
  }, [selectedClients]); // Removed availableClients dependency to prevent infinite re-renders

  const renderStreamGrid = () => {
    if (!isConnected || selectedClients.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Grid className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ready for Multi-Stream</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {!isConnected 
                ? 'Connect to the WebSocket server and select desktop clients to start streaming.'
                : 'Select desktop clients above to start multi-stream viewing.'
              }
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <MultiDesktopStreamGrid 
        selectedClients={selectedClientsWithMonitors}
        serverUrl={WEBSOCKET_CONFIG.BASE_URL}
        maxStreams={8} // Support up to 8 streams (4 clients × 2 monitors each)
        gridLayout="auto"
        enableFullscreen={true}
        enableControls={true}
        latestScreenshots={latestScreenshots}
        websocketInstance={wsRef.current}
        onClientDisconnected={(clientId) => {
          console.log(`Client disconnected: ${clientId}`);
          setSelectedClients(prev => prev.filter(id => id !== clientId));
        }}
        onStreamStatusChange={(streamId, status) => {
          console.log(`Stream ${streamId} status changed:`, status);
        }}
        onFrameReceived={(streamId, frameData) => {
          console.log(`Frame received for stream ${streamId}`);
        }}
      />
    );
  };

  const renderDualCanvasOCRDesigner = () => {
    // Get primary and secondary monitor streams from selected clients
    const primaryStreamUrl = selectedClients.length > 0
      ? latestScreenshots[`${selectedClients[0]}_monitor_0`] || latestScreenshots[selectedClients[0]]
      : null;

    const secondaryStreamUrl = selectedClients.length > 0
      ? latestScreenshots[`${selectedClients[0]}_monitor_1`] ||
        (selectedClients.length > 1 ? latestScreenshots[`${selectedClients[1]}_monitor_0`] || latestScreenshots[selectedClients[1]] : null)
      : null;

    // Debug logging for OCR Designer streams
    console.log('[MultiDesktopStreams] OCR Designer stream URLs:', {
      selectedClients,
      primaryStreamUrl: primaryStreamUrl ? `${primaryStreamUrl.substring(0, 50)}...` : 'NULL',
      secondaryStreamUrl: secondaryStreamUrl ? `${secondaryStreamUrl.substring(0, 50)}...` : 'NULL',
      latestScreenshotsKeys: Object.keys(latestScreenshots)
    });

    // Workflow execution handlers
    const handleWorkflowExecute = (nodeConfig: any) => {
      console.log('🚀 Executing workflow for node:', nodeConfig.id);
      console.log('Actions to execute:', nodeConfig.actions);
      
      // Send workflow execution command via WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'execute_workflow',
          nodeConfig: nodeConfig,
          timestamp: new Date().toISOString()
        }));
      }
    };

    const handleWorkflowStop = (nodeId: string) => {
      console.log('🛑 Stopping workflow for node:', nodeId);
      
      // Send workflow stop command via WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'stop_workflow',
          nodeId: nodeId,
          timestamp: new Date().toISOString()
        }));
      }
    };

    const handleNodeConfigSave = (nodeConfig: any) => {
      console.log('💾 Saving node configuration:', nodeConfig);
      
      // Save node configuration (could be to localStorage or backend)
      localStorage.setItem(`node_config_${nodeConfig.id}`, JSON.stringify(nodeConfig));
      
      // Optionally send to backend via WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'save_node_config',
          nodeConfig: nodeConfig,
          timestamp: new Date().toISOString()
        }));
      }
    };

    return (
      <DualCanvasOCRDesigner
        ocrConfig={ocrConfig}
        setOcrConfig={setOcrConfig}
        primaryStreamUrl={primaryStreamUrl}
        secondaryStreamUrl={secondaryStreamUrl}
        isConnected={isConnected}
        selectedClients={selectedClients}
        onConnect={connectWebSocket}
        onDisconnect={disconnectWebSocket}
        onWorkflowExecute={handleWorkflowExecute}
        onWorkflowStop={handleWorkflowStop}
        onNodeConfigSave={handleNodeConfigSave}
      />
    );
  };

  // ============================================================================
  // AUTOMATIC CONNECTION ON COMPONENT MOUNT
  // ============================================================================

  // Automatic connection when component loads
  useEffect(() => {
    console.log('🔄 MultiDesktopStreams component mounted - starting automatic connection...');

    // Automatic connection after short delay
    const autoConnectTimer = setTimeout(() => {
      if (!isConnected && !isLoading) {
        console.log('🚀 Starting automatic WebSocket connection for streaming...');
        connectWebSocket();
      }
    }, 1000); // 1 second delay for better UX

    // Cleanup function
    return () => {
      clearTimeout(autoConnectTimer);
      console.log('🧹 MultiDesktopStreams component unmounting - cleaning up connection...');
      disconnectWebSocket();
    };
  }, []); // Only run on first mount

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Multi-Desktop Screens
            </h1>
            <p className="text-muted-foreground">
              Manage and view multiple desktop screens
            </p>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2">
            <div className="flex bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                className="flex items-center space-x-2"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
                <span>Grid View</span>
              </Button>
              <Button
                variant={viewMode === 'ocr' ? 'default' : 'ghost'}
                size="sm"
                className="flex items-center space-x-2"
                onClick={() => setViewMode('ocr')}
              >
                <Settings className="w-4 h-4" />
                <span>OCR Designer</span>
              </Button>
            </div>
          </div>
        </div>

        {/* View Mode Content */}
        {viewMode === 'grid' ? (
          <>
            {/* Desktop Screens Grid */}
            {renderDesktopScreensGrid()}

            {/* Connection Status */}
            {renderConnectionStatus()}

            {/* Client Selector */}
            {renderClientSelector()}

            {/* Stream Controls */}
            {renderStreamControls()}

            {/* Stream Grid */}
            {renderStreamGrid()}
          </>
        ) : (
          <>
            {/* Connection Status */}
            {renderConnectionStatus()}

            {/* Client Selector */}
            {renderClientSelector()}

            {/* Stream Controls */}
            {renderStreamControls()}

            {/* Dual Canvas OCR Designer */}
            {renderDualCanvasOCRDesigner()}
          </>
        )}
      </div>
    </div>
  );
};

export default MultiDesktopStreams;