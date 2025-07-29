import WebSocket, { WebSocketServer } from 'ws';

// Create WebSocket server
const wss = new WebSocketServer({ 
  port: 8084,
  perMessageDeflate: false
});

console.log('WebSocket server starting on port 8084...');

// Keep track of heartbeat intervals for each connection
const heartbeatIntervals = new Map();

// Keep track of desktop clients and web clients
const desktopClients = new Map();
const webClients = new Map();

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
    
    // Start heartbeat to keep connection alive
    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          const pingMessage = {
            type: 'ping',
            timestamp: new Date().toISOString()
          };
          ws.send(JSON.stringify(pingMessage));
          console.log('Heartbeat ping sent');
        } catch (error) {
          console.error('Error sending heartbeat:', error);
          clearInterval(heartbeatInterval);
          heartbeatIntervals.delete(ws);
        }
      } else {
        clearInterval(heartbeatInterval);
        heartbeatIntervals.delete(ws);
      }
    }, 30000); // Send ping every 30 seconds
    
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
            console.log(`Registered desktop client: ${clientId}`);
            
            // Notify all web clients that a desktop client connected
            webClients.forEach((webWs, webId) => {
              if (webWs.readyState === WebSocket.OPEN) {
                try {
                  const connectionMessage = {
                    type: 'desktop_connected',
                    desktopClientId: clientId,
                    timestamp: new Date().toISOString()
                  };
                  webWs.send(JSON.stringify(connectionMessage));
                  console.log(`Notified web client ${webId} of desktop connection`);
                } catch (error) {
                  console.error(`Error notifying web client ${webId}:`, error);
                }
              }
            });
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
          // Forward to all desktop clients
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
              console.log(`Sent start_capture to desktop client: ${desktopId}`);
            }
          });
          break;

        case 'stop_desktop_stream':
          console.log('Stopping desktop stream request from web client');
          // Forward to all desktop clients
          desktopClients.forEach((desktopWs, desktopId) => {
            if (desktopWs.readyState === WebSocket.OPEN) {
              const stopMessage = {
                type: 'stop_capture',
                timestamp: new Date().toISOString()
              };
              desktopWs.send(JSON.stringify(stopMessage));
              console.log(`Sent stop_capture to desktop client: ${desktopId}`);
            }
          });
          break;

        case 'frame_data':
          console.log('Received frame data from desktop client, forwarding to web clients');
          // Forward frame data to all web clients
          webClients.forEach((webWs, webId) => {
            if (webWs.readyState === WebSocket.OPEN) {
              try {
                webWs.send(JSON.stringify(message));
                console.log(`Forwarded frame to web client: ${webId}`);
              } catch (error) {
                console.error(`Error forwarding frame to web client ${webId}:`, error);
              }
            }
          });
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

        case 'ping':
          console.log('Received ping from client, sending pong');
          // Respond to ping with pong
          const pongMessage = {
            type: 'pong',
            timestamp: new Date().toISOString()
          };
          ws.send(JSON.stringify(pongMessage));
          break;

        case 'pong':
          console.log('Received pong from client');
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

console.log('Local WebSocket server listening on port 8084');
console.log('WebSocket URL: ws://localhost:8084');

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