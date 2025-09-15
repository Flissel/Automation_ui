import WebSocket, { WebSocketServer } from 'ws';
import StreamHealthMonitor from './stream-health-monitor.js';

// Get port/host from environment variables or use defaults
const PORT = process.env.WS_PORT || 8084;
const HOST = process.env.WS_HOST || '127.0.0.1'; // Default to localhost to avoid permission issues on some systems

// Create WebSocket server - Accept connections from configured host
const wss = new WebSocketServer({ 
  port: PORT,
  host: HOST,
  perMessageDeflate: false
});

console.log(`WebSocket server starting on ${HOST}:${PORT}...`);
console.log(`Server accepting connections from host ${HOST}:${PORT}`);

// Initialize Stream Health Monitor
const healthMonitor = new StreamHealthMonitor({
  healthCheckInterval: 30000,      // Check every 30 seconds
  frameTimeoutThreshold: 60000,    // 1 minute without frames = unhealthy
  connectionTimeoutThreshold: 120000, // 2 minutes without pong = unhealthy
  maxRestartAttempts: 3,           // Maximum restart attempts per stream
  restartCooldownPeriod: 300000,   // 5 minutes cooldown between restarts
  minFrameRate: 1,                 // Minimum 1 FPS
  maxLatency: 5000,                // Maximum 5 seconds latency
  enableDetailedLogging: true,     // Enable detailed logging
  logHealthMetrics: false          // Disable frequent metrics logging
});

// Start health monitoring
healthMonitor.start();

// Handle health monitor events
healthMonitor.on('stream_restart_requested', (event) => {
  console.log(`🔄 Health monitor requesting restart for ${event.clientId} (${event.clientType})`);
  
  // Handle restart based on client type
  if (event.clientType === 'dual_screen') {
    const client = dualScreenClients.get(event.clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      // Stop current stream with correct dual-screen message type
      const stopMessage = {
        type: 'stop_dual_screen_capture',
        timestamp: new Date().toISOString(),
        reason: 'health_check_restart'
      };
      client.send(JSON.stringify(stopMessage));
      
      // Wait a moment then restart with correct dual-screen message type
      setTimeout(() => {
        const startMessage = {
          type: 'start_dual_screen_capture',
          config: {
            fps: 10,
            quality: 75,
            scale: 1.0,
            format: 'jpeg',
            dualScreen: true
          },
          timestamp: new Date().toISOString(),
          reason: 'health_check_restart'
        };
        client.send(JSON.stringify(startMessage));
        console.log(`✅ Restarted dual-screen stream for ${event.clientId}`);
      }, 2000);
    }
  } else if (event.clientType === 'desktop' || event.clientType === 'multi_monitor_desktop') {
    const client = desktopClients.get(event.clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      // Stop current stream
      const stopMessage = {
        type: 'stop_desktop_stream',
        timestamp: new Date().toISOString(),
        reason: 'health_check_restart'
      };
      client.send(JSON.stringify(stopMessage));
      
      // Wait a moment then restart
      setTimeout(() => {
        const startMessage = {
          type: 'start_desktop_stream',
          fps: 5,
          quality: 80,
          scale: 1.0,
          format: 'jpeg',
          timestamp: new Date().toISOString(),
          reason: 'health_check_restart'
        };
        client.send(JSON.stringify(startMessage));
        console.log(`✅ Restarted stream for ${event.clientId}`);
      }, 2000);
    }
  }
});

healthMonitor.on('health_check_complete', (status) => {
  if (status.unhealthyStreams > 0) {
    console.log(`⚠️ Health check: ${status.unhealthyStreams}/${status.totalStreams} streams unhealthy`);
  }
});

// Keep track of heartbeat intervals for each connection
const heartbeatIntervals = new Map();

// Keep track of desktop clients, web clients, and spawner clients
const desktopClients = new Map();
const webClients = new Map();
const spawnerClients = new Map();
const desktopInstances = new Map(); // Track dynamic desktop instances
const dualScreenClients = new Map(); // Track dual-screen clients

// Track streaming state for each desktop client
const streamingStates = new Map();
const dualScreenStates = new Map(); // Track dual-screen streaming states

wss.on('connection', function connection(ws, req) {
  console.log('New WebSocket connection established');
  console.log('Client IP:', req.socket.remoteAddress);
  
  // Send connection established message
  try {
    const connectionMessage = {
      type: 'connection_established',
      timestamp: new Date().toISOString(),
      serverInfo: {
        version: '1.0.0',
        capabilities: ['file_operations', 'action_commands', 'workflow_data', 'desktop_stream']
      }
    };
    
    ws.send(JSON.stringify(connectionMessage));
    console.log('Connection established message sent');
    
    // Start heartbeat to keep connection alive (reduced frequency and logging)
    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          const pingMessage = {
            type: 'ping',
            timestamp: new Date().toISOString()
          };
          ws.send(JSON.stringify(pingMessage));
          // Reduced logging for heartbeat
          if (Math.random() < 0.1) { // Only log 10% of heartbeats
            console.log('Heartbeat ping sent');
          }
        } catch (error) {
          console.error('Error sending heartbeat:', error);
          clearInterval(heartbeatInterval);
          heartbeatIntervals.delete(ws);
        }
      } else {
        clearInterval(heartbeatInterval);
        heartbeatIntervals.delete(ws);
      }
    }, 60000); // Send ping every 60 seconds (reduced frequency)
    
    heartbeatIntervals.set(ws, heartbeatInterval);
    
  } catch (error) {
    console.error('Error sending connection established message:', error);
  }

  // Handle incoming messages
  ws.on('message', function message(data) {
    try {
      const message = JSON.parse(data.toString());
      console.log('Received message:', message.type, message);

      switch (message.type) {
        case 'handshake':
          console.log('Received handshake:', message.clientInfo);
          console.log('About to send handshake ack, connection state:', ws.readyState);
          
          // Determine client type and register
          const clientType = message.clientInfo?.clientType || 'unknown';
          const clientId = message.clientInfo?.clientId || `client_${Date.now()}`;
          
          if (clientType === 'desktop_capture') {
            desktopClients.set(clientId, ws);
            ws.clientId = clientId;
            ws.clientType = 'desktop';
            ws.desktopId = message.clientInfo?.desktopId;
            ws.screenId = message.clientInfo?.screenId;
            console.log(`Registered desktop client: ${clientId} (desktop: ${ws.desktopId}, screen: ${ws.screenId})`);
            
            // Register with health monitor
            healthMonitor.registerStream(clientId, 'desktop', ws);
            
            // Notify all web clients that a desktop client connected
            webClients.forEach((webWs, webId) => {
              if (webWs.readyState === WebSocket.OPEN) {
                try {
                  const connectionMessage = {
                    type: 'desktop_connected',
                    desktopClientId: clientId,
                    desktopId: ws.desktopId,
                    screenId: ws.screenId,
                    timestamp: new Date().toISOString()
                  };
                  webWs.send(JSON.stringify(connectionMessage));
                  console.log(`Notified web client ${webId} of desktop connection`);
                } catch (error) {
                  console.error(`Error notifying web client ${webId}:`, error);
                }
              }
            });

            // Auto-start streaming upon handshake for permanent stream behavior
            try {
              if (ws.readyState === WebSocket.OPEN) {
                const startMessage = {
                  type: 'start_capture',
                  config: {
                    fps: 12,
                    quality: 80,
                    scale: 1.0,
                    format: 'jpeg'
                  },
                  timestamp: new Date().toISOString(),
                  reason: 'auto_start_on_handshake'
                };
                ws.send(JSON.stringify(startMessage));
                streamingStates.set(clientId, true);
                console.log(`Auto-started capture for desktop client: ${clientId}`);
              }
            } catch (err) {
              console.error(`Failed to auto-start capture for desktop client ${clientId}:`, err);
            }
          } else if (clientType === 'multi_monitor_desktop_capture') {
            desktopClients.set(clientId, ws);
            ws.clientId = clientId;
            ws.clientType = 'multi_monitor_desktop';
            ws.capabilities = message.clientInfo?.capabilities || [];
            ws.monitorInfo = message.clientInfo?.monitor_info || {};
            ws.monitorCount = message.clientInfo?.monitor_count || 1;
            console.log(`Registered multi-monitor desktop client: ${clientId} (${ws.monitorCount} monitors)`, ws.monitorInfo);
            
            // Register with health monitor
            healthMonitor.registerStream(clientId, 'multi_monitor_desktop', ws);
            
            // Notify all web clients that a multi-monitor desktop client connected
            webClients.forEach((webWs, webId) => {
              if (webWs.readyState === WebSocket.OPEN) {
                try {
                  const connectionMessage = {
                    type: 'multi_monitor_desktop_connected',
                    desktopClientId: clientId,
                    capabilities: ws.capabilities,
                    monitorInfo: ws.monitorInfo,
                    monitorCount: ws.monitorCount,
                    timestamp: new Date().toISOString()
                  };
                  webWs.send(JSON.stringify(connectionMessage));
                  console.log(`Notified web client ${webId} of multi-monitor desktop connection`);
                } catch (error) {
                  console.error(`Error notifying web client ${webId}:`, error);
                }
              }
            });

            // Auto-start streaming upon handshake for permanent stream behavior
            try {
              if (ws.readyState === WebSocket.OPEN) {
                const startMessage = {
                  type: 'start_capture',
                  config: {
                    fps: 12,
                    quality: 80,
                    scale: 1.0,
                    format: 'jpeg'
                  },
                  timestamp: new Date().toISOString(),
                  reason: 'auto_start_on_handshake'
                };
                ws.send(JSON.stringify(startMessage));
                streamingStates.set(clientId, true);
                console.log(`Auto-started capture for multi-monitor desktop client: ${clientId}`);
              }
            } catch (err) {
              console.error(`Failed to auto-start capture for multi-monitor desktop client ${clientId}:`, err);
            }
          } else if (clientType === 'dual_screen_desktop') {
            dualScreenClients.set(clientId, ws);
            ws.clientId = clientId;
            ws.clientType = 'dual_screen';
            ws.capabilities = message.capabilities || {};
            console.log(`Registered dual-screen client: ${clientId}`, ws.capabilities);
            
            // Register with health monitor
            healthMonitor.registerStream(clientId, 'dual_screen', ws);
            
            // Notify all web clients that a dual-screen client connected
            webClients.forEach((webWs, webId) => {
              if (webWs.readyState === WebSocket.OPEN) {
                try {
                  const connectionMessage = {
                    type: 'dual_screen_connected',
                    clientId: clientId,
                    capabilities: ws.capabilities,
                    timestamp: new Date().toISOString()
                  };
                  webWs.send(JSON.stringify(connectionMessage));
                  console.log(`Notified web client ${webId} of dual-screen connection`);
                } catch (error) {
                  console.error(`Error notifying web client ${webId}:`, error);
                }
              }
            });

            // Auto-start dual-screen streaming upon handshake for permanent stream behavior
            try {
              if (ws.readyState === WebSocket.OPEN) {
                const startMessage = {
                  type: 'start_dual_screen_capture',
                  config: {
                    fps: 15,
                    quality: 85,
                    scale: 1.0,
                    format: 'jpeg',
                    dualScreen: true
                  },
                  timestamp: new Date().toISOString(),
                  reason: 'auto_start_on_handshake'
                };
                ws.send(JSON.stringify(startMessage));
                dualScreenStates.set(clientId, true);
                console.log(`Auto-started dual-screen capture for client: ${clientId}`);
              }
            } catch (err) {
              console.error(`Failed to auto-start dual-screen capture for client ${clientId}:`, err);
            }
          } else if (clientType === 'desktop_spawner') {
            spawnerClients.set(clientId, ws);
            ws.clientId = clientId;
            ws.clientType = 'spawner';
            console.log(`Registered desktop spawner: ${clientId}`);
          } else {
            webClients.set(clientId, ws);
            ws.clientId = clientId;
            ws.clientType = 'web';
            console.log(`Registered web client: ${clientId}`);
          }
          
          // Send handshake acknowledgment immediately with robust error handling
          try {
            if (ws.readyState === WebSocket.OPEN) {
              const ackMessage = {
                type: 'handshake_ack',
                timestamp: new Date().toISOString(),
                clientInfo: message.clientInfo,
                serverStatus: 'ready'
              };
              
              console.log('Handshake ack message:', JSON.stringify(ackMessage));
              
              // Send the message synchronously
              ws.send(JSON.stringify(ackMessage));
              console.log('Handshake acknowledgment sent successfully at:', new Date().toISOString());
              
              // Verify connection is still open after sending
              console.log('Connection state after sending ack:', ws.readyState);
            } else {
              console.error('Cannot send handshake ack - WebSocket not open, state:', ws.readyState);
            }
          } catch (error) {
            console.error('Error sending handshake acknowledgment:', error);
            console.error('Error details:', error.message);
            console.error('Connection state during error:', ws.readyState);
          }
          break;

        case 'start_desktop_stream':
          console.log('Starting desktop stream request from web client');
          const targetDesktopId = message.desktopClientId;
          
          if (targetDesktopId) {
            // Check if it's a regular desktop client
            const targetDesktop = desktopClients.get(targetDesktopId);
            if (targetDesktop && targetDesktop.readyState === WebSocket.OPEN) {
              const startMessage = {
                type: 'start_capture',
                config: message.config || {
                  fps: 10,
                  quality: 80,
                  scale: 1.0,
                  format: 'jpeg'
                },
                timestamp: new Date().toISOString()
              };
              targetDesktop.send(JSON.stringify(startMessage));
              streamingStates.set(targetDesktopId, true);
              console.log(`Sent start_capture to specific desktop client: ${targetDesktopId}`);
            } else {
              // Check if it's a dual-screen client
              const targetDualScreen = dualScreenClients.get(targetDesktopId);
              if (targetDualScreen && targetDualScreen.readyState === WebSocket.OPEN) {
                const startMessage = {
                  type: 'start_dual_screen_capture',
                  config: message.config || {
                    fps: 15,
                    quality: 85,
                    scale: 1.0,
                    format: 'jpeg',
                    dualScreen: true
                  },
                  timestamp: new Date().toISOString()
                };
                targetDualScreen.send(JSON.stringify(startMessage));
                dualScreenStates.set(targetDesktopId, true);
                console.log(`Sent start_dual_screen_capture to dual-screen client: ${targetDesktopId}`);
              } else {
                console.log(`Client ${targetDesktopId} not found or not connected`);
              }
            }
          } else {
            // Forward to all desktop clients (legacy behavior)
            desktopClients.forEach((desktopWs, desktopId) => {
              if (desktopWs.readyState === WebSocket.OPEN) {
                const startMessage = {
                  type: 'start_capture',
                  config: message.config || {
                    fps: 10,
                    quality: 80,
                    scale: 1.0,
                    format: 'jpeg'
                  },
                  timestamp: new Date().toISOString()
                };
                desktopWs.send(JSON.stringify(startMessage));
                streamingStates.set(desktopId, true);
                console.log(`Sent start_capture to desktop client: ${desktopId}`);
              }
            });
          }
          break;

        case 'stop_desktop_stream':
          console.log('Stopping desktop stream request from web client');
          const stopTargetDesktopId = message.desktopClientId;
          
          if (stopTargetDesktopId) {
            // Check if it's a regular desktop client
            const targetDesktop = desktopClients.get(stopTargetDesktopId);
            if (targetDesktop && targetDesktop.readyState === WebSocket.OPEN) {
              const stopMessage = {
                type: 'stop_capture',
                timestamp: new Date().toISOString()
              };
              targetDesktop.send(JSON.stringify(stopMessage));
              streamingStates.set(stopTargetDesktopId, false);
              console.log(`Sent stop_capture to specific desktop client: ${stopTargetDesktopId}`);
            } else {
              // Check if it's a dual-screen client
              const targetDualScreen = dualScreenClients.get(stopTargetDesktopId);
              if (targetDualScreen && targetDualScreen.readyState === WebSocket.OPEN) {
                const stopMessage = {
                  type: 'stop_dual_screen_capture',
                  timestamp: new Date().toISOString()
                };
                targetDualScreen.send(JSON.stringify(stopMessage));
                dualScreenStates.set(stopTargetDesktopId, false);
                console.log(`Sent stop_dual_screen_capture to dual-screen client: ${stopTargetDesktopId}`);
              } else {
                console.log(`Client ${stopTargetDesktopId} not found or not connected`);
              }
            }
          } else {
            // Forward to all desktop clients (legacy behavior)
            desktopClients.forEach((desktopWs, desktopId) => {
              if (desktopWs.readyState === WebSocket.OPEN) {
                const stopMessage = {
                  type: 'stop_capture',
                  timestamp: new Date().toISOString()
                };
                desktopWs.send(JSON.stringify(stopMessage));
                streamingStates.set(desktopId, false);
                console.log(`Sent stop_capture to desktop client: ${desktopId}`);
              }
            });
          }
          break;

        // ============================================================================
        // ENHANCED PERMISSION AND CONTROL MESSAGES
        // ============================================================================

        case 'request_permission':
          console.log('🔐 Permission request from web client:', {
            clientId: message.clientId,
            permissionType: message.permissionType,
            requestId: message.requestId
          });
          
          // Forward permission request to target client
          const targetClientForPermission = desktopClients.get(message.clientId) || dualScreenClients.get(message.clientId);
          if (targetClientForPermission && targetClientForPermission.readyState === WebSocket.OPEN) {
            const permissionRequest = {
              type: 'permission_request',
              permissionType: message.permissionType,
              requestId: message.requestId,
              timestamp: new Date().toISOString(),
              webClientId: ws.clientId
            };
            targetClientForPermission.send(JSON.stringify(permissionRequest));
            console.log(`📤 Forwarded permission request to client: ${message.clientId}`);
          } else {
            // Send permission denied response
            const deniedResponse = {
              type: 'permission_response',
              clientId: message.clientId,
              permissionType: message.permissionType,
              requestId: message.requestId,
              granted: false,
              reason: 'Client not connected',
              timestamp: new Date().toISOString()
            };
            ws.send(JSON.stringify(deniedResponse));
          }
          break;

        case 'check_permission':
          console.log('🔍 Permission check from web client:', {
            clientId: message.clientId,
            permissionType: message.permissionType
          });
          
          // Check current permission status
          const targetClientForCheck = desktopClients.get(message.clientId) || dualScreenClients.get(message.clientId);
          if (targetClientForCheck && targetClientForCheck.readyState === WebSocket.OPEN) {
            const permissionCheck = {
              type: 'permission_check',
              permissionType: message.permissionType,
              timestamp: new Date().toISOString(),
              webClientId: ws.clientId
            };
            targetClientForCheck.send(JSON.stringify(permissionCheck));
          } else {
            // Send permission status response
            const statusResponse = {
              type: 'permission_status',
              clientId: message.clientId,
              permissionType: message.permissionType,
              granted: false,
              reason: 'Client not connected',
              timestamp: new Date().toISOString()
            };
            ws.send(JSON.stringify(statusResponse));
          }
          break;

        case 'revoke_permission':
          console.log('🚫 Permission revocation from web client:', {
            clientId: message.clientId,
            permissionType: message.permissionType
          });
          
          // Forward permission revocation to target client
          const targetClientForRevoke = desktopClients.get(message.clientId) || dualScreenClients.get(message.clientId);
          if (targetClientForRevoke && targetClientForRevoke.readyState === WebSocket.OPEN) {
            const permissionRevoke = {
              type: 'permission_revoke',
              permissionType: message.permissionType,
              timestamp: new Date().toISOString(),
              webClientId: ws.clientId
            };
            targetClientForRevoke.send(JSON.stringify(permissionRevoke));
            console.log(`📤 Forwarded permission revocation to client: ${message.clientId}`);
          }
          break;

        case 'get_client_list':
          console.log('📋 Client list request from web client');
          
          // Prepare client list with enhanced information
          const clientList = {
            type: 'client_list_response',
            clients: [],
            timestamp: new Date().toISOString()
          };

          // Add desktop clients
          desktopClients.forEach((clientWs, clientId) => {
            clientList.clients.push({
              id: clientId,
              type: 'desktop',
              connected: clientWs.readyState === WebSocket.OPEN,
              streaming: streamingStates.get(clientId) || false,
              capabilities: clientWs.capabilities || {},
              lastSeen: new Date().toISOString()
            });
          });

          // Add dual-screen clients
          dualScreenClients.forEach((clientWs, clientId) => {
            clientList.clients.push({
              id: clientId,
              type: 'dual_screen',
              connected: clientWs.readyState === WebSocket.OPEN,
              streaming: dualScreenStates.get(clientId) || false,
              capabilities: clientWs.capabilities || {},
              lastSeen: new Date().toISOString()
            });
          });

          ws.send(JSON.stringify(clientList));
          console.log(`📤 Sent client list with ${clientList.clients.length} clients`);
          break;

        case 'frame_data':
          // Update health monitor with frame activity
          if (ws.clientId) {
            healthMonitor.updateStreamActivity(ws.clientId, message);
          }
          
          // Reduce frame data logging to prevent terminal spam
          if (Math.random() < 0.01) { // Only log 1% of frames
            console.log('Received frame data from desktop client:', {
              clientId: message.metadata?.clientId,
              desktopId: ws.desktopId,
              screenId: ws.screenId,
              monitorId: message.monitorId,
              isSingle: message.isSingle,
              dimensions: `${message.width}x${message.height}`
            });
          }
          
          // Enhanced frame data with desktop and screen routing information
          const enhancedFrameData = {
            ...message,
            serverTimestamp: new Date().toISOString(),
            routingInfo: {
              sourceClientId: ws.clientId || message.metadata?.clientId,
              desktopId: ws.desktopId,
              screenId: ws.screenId,
              monitorId: message.monitorId || 'unknown',
              isMultiMonitor: message.metadata?.config?.capture_mode === 'all_monitors'
            }
          };
          
          // Forward enhanced frame data to all web clients
          webClients.forEach((webWs, webId) => {
            if (webWs.readyState === WebSocket.OPEN) {
              try {
                webWs.send(JSON.stringify(enhancedFrameData));
                if (Math.random() < 0.01) { // Only log 1% of forwards
                  console.log(`Forwarded frame data to web client: ${webId} (desktop: ${ws.desktopId}, screen: ${ws.screenId})`);
                }
              } catch (error) {
                console.error(`Error forwarding frame data to web client ${webId}:`, error);
              }
            }
          });
          break;

        case 'dual_screen_frame':
          // Update health monitor with frame activity
          if (ws.clientId) {
            healthMonitor.updateStreamActivity(ws.clientId, { frameData: message.image_data });
          }
          
          // Handle dual-screen frame data
          if (Math.random() < 0.01) { // Only log 1% of frames
            console.log('Received dual-screen frame data:', {
              clientId: message.client_id,
              screenId: message.screen_id,
              timestamp: message.timestamp,
              dataSize: message.image_data ? message.image_data.length : 0
            });
          }
          
          // Enhanced dual-screen frame data with routing information
          const enhancedDualScreenFrame = {
            ...message,
            type: 'dual_screen_frame',
            serverTimestamp: new Date().toISOString(),
            routingInfo: {
              sourceClientId: ws.clientId || message.client_id,
              clientType: 'dual_screen',
              screenId: message.screen_id,
              capabilities: ws.capabilities
            }
          };
          
          // Forward enhanced frame data to all web clients
          webClients.forEach((webWs, webId) => {
            if (webWs.readyState === WebSocket.OPEN) {
              try {
                webWs.send(JSON.stringify(enhancedDualScreenFrame));
                if (Math.random() < 0.01) { // Only log 1% of forwards
                  console.log(`Forwarded dual-screen frame to web client: ${webId} (client: ${message.client_id}, screen: ${message.screen_id})`);
                }
              } catch (error) {
                console.error(`Error forwarding dual-screen frame to web client ${webId}:`, error);
              }
            }
          });
          break;

        case 'desktop_click':
          // Forward click events from web UI to the appropriate desktop client
          try {
            // Support both flat payloads and nested under `data`
            const payload = {
              monitorId: message.monitorId || message.data?.monitorId,
              x: message.x ?? message.data?.x,
              y: message.y ?? message.data?.y,
              button: message.button || message.data?.button || 'left',
              double: Boolean(message.double ?? message.data?.double),
              timestamp: message.timestamp || new Date().toISOString(),
              viewerClientId: ws.clientId
            };

            const targetClientId = message.clientId || message.targetClientId || message.data?.clientId;
            if (!targetClientId) {
              console.warn('desktop_click missing target clientId:', message);
              break;
            }

            // Prefer standard desktopClients, then dualScreenClients
            let targetWs = desktopClients.get(targetClientId);
            let targetType = 'desktop';
            if (!targetWs) {
              targetWs = dualScreenClients.get(targetClientId);
              targetType = targetWs ? 'dual_screen' : null;
            }

            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              const forward = {
                type: 'mouse_click',
                monitorId: payload.monitorId,
                x: payload.x,
                y: payload.y,
                button: payload.button,
                double: payload.double,
                timestamp: payload.timestamp,
                sourceViewerId: payload.viewerClientId
              };
              try {
                targetWs.send(JSON.stringify(forward));
                console.log(`Forwarded desktop_click to ${targetType} client ${targetClientId}:`, {
                  monitorId: payload.monitorId, x: payload.x, y: payload.y, button: payload.button, double: payload.double
                });
              } catch (err) {
                console.error(`Error forwarding mouse_click to ${targetType} client ${targetClientId}:`, err);
              }
            } else {
              console.warn(`Target client for desktop_click not found or not open: ${targetClientId}`);
            }
          } catch (err) {
            console.error('Failed to handle desktop_click:', err);
          }
          break;

        case 'stream_status':
          console.log('Received stream status from desktop client:', message);
          // Forward status to all web clients
          webClients.forEach((webWs, webId) => {
            if (webWs.readyState === WebSocket.OPEN) {
              try {
                const statusMessage = {
                  type: 'desktop_stream_status',
                  streaming: message.streaming,
                  timestamp: new Date().toISOString(),
                  desktopClientId: ws.clientId
                };
                webWs.send(JSON.stringify(statusMessage));
                console.log(`Forwarded stream status to web client: ${webId}`);
              } catch (error) {
                console.error(`Error forwarding status to web client ${webId}:`, error);
              }
            }
          });
          break;

        case 'action_command':
          console.log('Processing action command:', message.data);
          // Simulate action execution
          const actionResult = {
            type: 'action_result',
            data: {
              id: message.data.id,
              status: 'completed',
              timestamp: new Date().toISOString(),
              result: `Simulated execution of ${message.data.type} command`,
              data: message.data.data
            }
          };
          ws.send(JSON.stringify(actionResult));
          break;

        case 'file_operation':
          console.log('Processing file operation:', message.data);
          // Simulate file operation
          const fileResult = {
            type: 'file_operation_result',
            data: {
              operation: message.data.type,
              path: message.data.path,
              status: 'success',
              timestamp: new Date().toISOString(),
              data: message.data.type === 'read' ? 'simulated file content' : null
            }
          };
          ws.send(JSON.stringify(fileResult));
          break;

        case 'workflow_data_request':
          console.log('Processing workflow data request:', message.data);
          // Mock workflow data
          const workflowData = {
            type: 'workflow_data_response',
            data: [{
              nodeId: message.data.nodeId,
              dataType: message.data.dataType || 'execution_result',
              content: {
                status: 'completed',
                result: 'Mock workflow execution result',
                timestamp: new Date().toISOString()
              },
              timestamp: new Date().toISOString()
            }]
          };
          ws.send(JSON.stringify(workflowData));
          break;

        case 'get_desktop_clients':
          console.log('Received request for desktop clients list');
          // Send list of available desktop clients (including dual-screen clients)
          const desktopClientsList = Array.from(desktopClients.keys()).map(clientId => ({
            id: clientId,
            type: 'desktop',
            connected: desktopClients.get(clientId).readyState === WebSocket.OPEN,
            timestamp: new Date().toISOString()
          }));
          
          // Add dual-screen clients to the list
          const dualScreenClientsList = Array.from(dualScreenClients.keys()).map(clientId => ({
            id: clientId,
            type: 'dual_screen',
            connected: dualScreenClients.get(clientId).readyState === WebSocket.OPEN,
            capabilities: dualScreenClients.get(clientId).capabilities || {},
            timestamp: new Date().toISOString()
          }));
          
          // Combine both lists
          const allClients = [...desktopClientsList, ...dualScreenClientsList];
          
          const clientsListMessage = {
            type: 'desktop_clients_list',
            clients: allClients,
            timestamp: new Date().toISOString()
          };
          ws.send(JSON.stringify(clientsListMessage));
          console.log(`Sent desktop clients list: ${allClients.length} clients (${desktopClientsList.length} desktop, ${dualScreenClientsList.length} dual-screen)`);
          break;

        case 'request_screenshot':
          console.log('Received screenshot request for client:', message.clientId);
          const targetClientId = message.clientId;
          
          if (targetClientId) {
            // Request screenshot from specific desktop client
            const targetDesktop = desktopClients.get(targetClientId);
            if (targetDesktop && targetDesktop.readyState === WebSocket.OPEN) {
              const screenshotMessage = {
                type: 'capture_screenshot',
                timestamp: new Date().toISOString()
              };
              targetDesktop.send(JSON.stringify(screenshotMessage));
              console.log(`Sent capture_screenshot to desktop client: ${targetClientId}`);
            } else {
              console.log(`Desktop client ${targetClientId} not found or not connected`);
              // Send error response back to web client
              const errorResponse = {
                type: 'screenshot_error',
                clientId: targetClientId,
                error: 'Desktop client not found or not connected',
                timestamp: new Date().toISOString()
              };
              ws.send(JSON.stringify(errorResponse));
            }
          } else {
            // Request screenshots from all desktop clients
            desktopClients.forEach((desktopWs, desktopId) => {
              if (desktopWs.readyState === WebSocket.OPEN) {
                const screenshotMessage = {
                  type: 'capture_screenshot',
                  timestamp: new Date().toISOString()
                };
                desktopWs.send(JSON.stringify(screenshotMessage));
                console.log(`Sent capture_screenshot to desktop client: ${desktopId}`);
              }
            });
          }
          break;

        case 'ping':
          console.log('Received ping from client, sending pong');
          
          // Update health monitor with ping activity
          if (ws.clientId) {
            healthMonitor.updatePingActivity(ws.clientId, 'ping');
          }
          
          // Respond to ping with pong
          const pongMessage = {
            type: 'pong',
            timestamp: new Date().toISOString()
          };
          ws.send(JSON.stringify(pongMessage));
          break;

        case 'pong':
          console.log('Received pong from client');
          
          // Update health monitor with pong activity
          if (ws.clientId) {
            healthMonitor.updatePingActivity(ws.clientId, 'pong');
          }
          break;

        case 'desktop_stream_status':
          console.log('Received desktop stream status from client:', message);
          // Forward status to all web clients
          webClients.forEach((webWs, webId) => {
            if (webWs.readyState === WebSocket.OPEN) {
              try {
                const statusMessage = {
                  type: 'desktop_stream_status',
                  desktopClientId: ws.clientId || message.desktopClientId,
                  status: message.status,
                  timestamp: new Date().toISOString()
                };
                webWs.send(JSON.stringify(statusMessage));
                console.log(`Forwarded desktop stream status to web client: ${webId}`);
              } catch (error) {
                console.error(`Error forwarding desktop stream status to web client ${webId}:`, error);
              }
            }
          });
          break;

        // ============================================================================
        // PERMISSION RESPONSE HANDLERS FROM DESKTOP CLIENTS
        // ============================================================================

        case 'permission_response':
          console.log('🔐 Permission response from desktop client:', {
            clientId: ws.clientId,
            permissionType: message.permissionType,
            granted: message.granted,
            requestId: message.requestId
          });
          
          // Forward permission response to all web clients
          webClients.forEach((webWs, webId) => {
            if (webWs.readyState === WebSocket.OPEN) {
              try {
                const permissionResponse = {
                  type: 'permission_response',
                  clientId: ws.clientId,
                  permissionType: message.permissionType,
                  requestId: message.requestId,
                  granted: message.granted,
                  reason: message.reason,
                  timestamp: new Date().toISOString()
                };
                webWs.send(JSON.stringify(permissionResponse));
                console.log(`📤 Forwarded permission response to web client: ${webId}`);
              } catch (error) {
                console.error(`Error forwarding permission response to web client ${webId}:`, error);
              }
            }
          });
          break;

        case 'permission_status':
          console.log('🔍 Permission status from desktop client:', {
            clientId: ws.clientId,
            permissionType: message.permissionType,
            granted: message.granted
          });
          
          // Forward permission status to all web clients
          webClients.forEach((webWs, webId) => {
            if (webWs.readyState === WebSocket.OPEN) {
              try {
                const permissionStatus = {
                  type: 'permission_status',
                  clientId: ws.clientId,
                  permissionType: message.permissionType,
                  granted: message.granted,
                  reason: message.reason,
                  timestamp: new Date().toISOString()
                };
                webWs.send(JSON.stringify(permissionStatus));
                console.log(`📤 Forwarded permission status to web client: ${webId}`);
              } catch (error) {
                console.error(`Error forwarding permission status to web client ${webId}:`, error);
              }
            }
          });
          break;

        case 'permission_revoked':
          console.log('🚫 Permission revoked by desktop client:', {
            clientId: ws.clientId,
            permissionType: message.permissionType
          });
          
          // Forward permission revocation to all web clients
          webClients.forEach((webWs, webId) => {
            if (webWs.readyState === WebSocket.OPEN) {
              try {
                const permissionRevoked = {
                  type: 'permission_revoked',
                  clientId: ws.clientId,
                  permissionType: message.permissionType,
                  reason: message.reason,
                  timestamp: new Date().toISOString()
                };
                webWs.send(JSON.stringify(permissionRevoked));
                console.log(`📤 Forwarded permission revocation to web client: ${webId}`);
              } catch (error) {
                console.error(`Error forwarding permission revocation to web client ${webId}:`, error);
              }
            }
          });
          break;

        case 'client_disconnect':
          console.log('Received client disconnect message:', message);
          // Client is gracefully disconnecting
          if (ws.clientId) {
            console.log(`Client ${ws.clientId} is disconnecting gracefully`);
            // The actual cleanup will happen in the 'close' event handler
          }
          break;

        case 'create_desktop_instance':
          console.log('Received create desktop instance request:', message);
          // Forward to desktop spawner
          spawnerClients.forEach((spawnerWs, spawnerId) => {
            if (spawnerWs.readyState === WebSocket.OPEN) {
              try {
                const createMessage = {
                  type: 'create_desktop_instance',
                  desktopId: message.desktopId || `desktop_${Date.now()}`,
                  config: message.config || {},
                  timestamp: new Date().toISOString()
                };
                spawnerWs.send(JSON.stringify(createMessage));
                console.log(`Forwarded create desktop instance to spawner: ${spawnerId}`);
                
                // Store desktop instance info
                if (!desktopInstances.has(createMessage.desktopId)) {
                  desktopInstances.set(createMessage.desktopId, {
                    id: createMessage.desktopId,
                    screens: new Map(),
                    status: 'creating',
                    created: new Date().toISOString()
                  });
                }
              } catch (error) {
                console.error(`Error forwarding create desktop instance to spawner ${spawnerId}:`, error);
              }
            }
          });
          break;

        case 'remove_desktop_instance':
          console.log('Received remove desktop instance request:', message);
          // Forward to desktop spawner
          spawnerClients.forEach((spawnerWs, spawnerId) => {
            if (spawnerWs.readyState === WebSocket.OPEN) {
              try {
                const removeMessage = {
                  type: 'remove_desktop_instance',
                  desktopId: message.desktopId,
                  timestamp: new Date().toISOString()
                };
                spawnerWs.send(JSON.stringify(removeMessage));
                console.log(`Forwarded remove desktop instance to spawner: ${spawnerId}`);
              } catch (error) {
                console.error(`Error forwarding remove desktop instance to spawner ${spawnerId}:`, error);
              }
            }
          });
          
          // Remove from our tracking
          if (message.desktopId && desktopInstances.has(message.desktopId)) {
            desktopInstances.delete(message.desktopId);
            console.log(`Removed desktop instance: ${message.desktopId}`);
          }
          break;

        case 'list_desktop_instances':
          console.log('Received list desktop instances request');
          const instancesList = Array.from(desktopInstances.values()).map(instance => ({
            id: instance.id,
            status: instance.status,
            screens: Array.from(instance.screens.values()),
            created: instance.created
          }));
          
          const instancesListMessage = {
            type: 'desktop_instances_list',
            instances: instancesList,
            timestamp: new Date().toISOString()
          };
          ws.send(JSON.stringify(instancesListMessage));
          console.log(`Sent desktop instances list: ${instancesList.length} instances`);
          break;

        case 'desktop_instance_status':
          console.log('Received desktop instance status update:', message);
          // Update instance status
          if (message.desktopId && desktopInstances.has(message.desktopId)) {
            const instance = desktopInstances.get(message.desktopId);
            instance.status = message.status;
            if (message.screenId) {
              instance.screens.set(message.screenId, {
                id: message.screenId,
                status: message.status,
                clientId: message.clientId
              });
            }
          }
          
          // Forward to web clients
          webClients.forEach((webWs, webId) => {
            if (webWs.readyState === WebSocket.OPEN) {
              try {
                webWs.send(JSON.stringify(message));
                console.log(`Forwarded desktop instance status to web client: ${webId}`);
              } catch (error) {
                console.error(`Error forwarding desktop instance status to web client ${webId}:`, error);
              }
            }
          });
          break;

        default:
          console.log('Unknown message type:', message.type);
          const errorMessage = {
            type: 'error',
            error: `Unknown message type: ${message.type}`,
            timestamp: new Date().toISOString()
          };
          ws.send(JSON.stringify(errorMessage));
      }
    } catch (error) {
      console.error('Error processing message:', error);
      try {
        const errorMessage = {
          type: 'error',
          error: 'Failed to process message',
          details: error.message,
          timestamp: new Date().toISOString()
        };
        ws.send(JSON.stringify(errorMessage));
      } catch (sendError) {
        console.error('Error sending error message:', sendError);
      }
    }
  });

  // Handle connection close
  ws.on('close', function close(code, reason) {
    console.log('WebSocket connection closed at:', new Date().toISOString(), 'Code:', code, 'Reason:', reason.toString());
    
    // Unregister from health monitor if client was registered
     if (ws.clientId && (ws.clientType === 'desktop' || ws.clientType === 'multi_monitor_desktop' || ws.clientType === 'dual_screen' || ws.clientType === 'dual_screen_desktop')) {
       healthMonitor.unregisterClient(ws.clientId);
       console.log(`Client ${ws.clientId} unregistered from health monitor`);
     }
    
    // Clean up client tracking
    if (ws.clientId) {
      if (ws.clientType === 'desktop') {
        desktopClients.delete(ws.clientId);
        console.log(`Removed desktop client: ${ws.clientId}`);
        
        // Notify web clients that desktop disconnected
        webClients.forEach((webWs, webId) => {
          if (webWs.readyState === WebSocket.OPEN) {
            try {
              const disconnectMessage = {
                type: 'desktop_disconnected',
                desktopClientId: ws.clientId,
                timestamp: new Date().toISOString()
              };
              webWs.send(JSON.stringify(disconnectMessage));
              console.log(`Notified web client ${webId} of desktop disconnection`);
            } catch (error) {
              console.error(`Error notifying web client ${webId}:`, error);
            }
          }
        });
      } else if (ws.clientType === 'web') {
        webClients.delete(ws.clientId);
        console.log(`Removed web client: ${ws.clientId}`);
      } else if (ws.clientType === 'spawner') {
        spawnerClients.delete(ws.clientId);
        console.log(`Removed spawner client: ${ws.clientId}`);
      } else if (ws.clientType === 'dual_screen') {
        dualScreenClients.delete(ws.clientId);
        dualScreenStates.delete(ws.clientId);
        console.log(`Removed dual-screen client: ${ws.clientId}`);
        
        // Notify web clients that dual-screen client disconnected
        webClients.forEach((webWs, webId) => {
          if (webWs.readyState === WebSocket.OPEN) {
            try {
              const disconnectMessage = {
                type: 'dual_screen_disconnected',
                clientId: ws.clientId,
                timestamp: new Date().toISOString()
              };
              webWs.send(JSON.stringify(disconnectMessage));
              console.log(`Notified web client ${webId} of dual-screen disconnection`);
            } catch (error) {
              console.error(`Error notifying web client ${webId}:`, error);
            }
          }
        });
      }
    }
    
    // Clean up heartbeat interval
    const heartbeatInterval = heartbeatIntervals.get(ws);
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatIntervals.delete(ws);
    }
  });

  // Handle errors
  ws.on('error', function error(err) {
    console.error('WebSocket error:', err);
    
    // Clean up heartbeat interval
    const heartbeatInterval = heartbeatIntervals.get(ws);
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatIntervals.delete(ws);
    }
  });
});

// Handle server errors
wss.on('error', function error(err) {
  console.error('WebSocket server error:', err);
});

console.log(`Local WebSocket server listening on port ${PORT}`);
console.log(`WebSocket URL: ws://localhost:${PORT}`);

// Graceful shutdown
process.on('SIGINT', function() {
  console.log('\nShutting down WebSocket server...');
  
  // Clear all heartbeat intervals
  heartbeatIntervals.forEach((interval) => {
    clearInterval(interval);
  });
  heartbeatIntervals.clear();
  
  // Close all connections
  wss.clients.forEach(function each(ws) {
    ws.terminate();
  });
  
  // Close WebSocket server
  wss.close(function() {
    console.log('WebSocket server closed');
    process.exit(0);
  });
});