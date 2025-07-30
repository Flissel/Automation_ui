import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActionCommand {
  id: string;
  type: 'click' | 'type' | 'http' | 'file_read' | 'file_write';
  target?: string;
  data?: any;
  timestamp: string;
}

interface WorkflowData {
  nodeId: string;
  dataType: string;
  content: any;
  timestamp: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  console.log("Filesystem Bridge WebSocket connected");

  // Keep track of heartbeat interval
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  socket.onopen = () => {
    console.log('WebSocket connection opened');
    
    // Send connection established message
    try {
      socket.send(JSON.stringify({
        type: 'connection_established',
        timestamp: new Date().toISOString(),
        serverInfo: {
          version: '1.0.0',
          capabilities: ['file_operations', 'action_commands', 'workflow_data']
        }
      }));
      console.log('Connection established message sent');
      
      // Start heartbeat to keep connection alive
      heartbeatInterval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          try {
            socket.send(JSON.stringify({
              type: 'ping',
              timestamp: new Date().toISOString()
            }));
            console.log('Heartbeat ping sent');
          } catch (error) {
            console.error('Error sending heartbeat:', error);
            if (heartbeatInterval) {
              clearInterval(heartbeatInterval);
            }
          }
        } else {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }
        }
      }, 30000); // Send ping every 30 seconds
      
    } catch (error) {
      console.error('Error sending connection established message:', error);
    }
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log('Received message:', message.type);

      switch (message.type) {
        case 'handshake':
          // Handle client handshake
          socket.send(JSON.stringify({
            type: 'handshake_ack',
            timestamp: new Date().toISOString(),
            clientInfo: message.data
          }));
          break;

        case 'action_command':
          await handleActionCommand(message.data, socket);
          break;

        case 'file_operation':
          await handleFileOperation(message.data, socket);
          break;

        case 'workflow_data_request':
          await handleWorkflowDataRequest(message.data, socket);
          break;

        case 'ping':
          // Respond to ping with pong
          socket.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
          break;

        default:
          console.log('Unknown message type:', message.type);
          socket.send(JSON.stringify({
            type: 'error',
            error: `Unknown message type: ${message.type}`,
            timestamp: new Date().toISOString()
          }));
      }
    } catch (error) {
      console.error('Error processing message:', error);
      try {
        socket.send(JSON.stringify({
          type: 'error',
          error: 'Failed to process message',
          details: error.message,
          timestamp: new Date().toISOString()
        }));
      } catch (sendError) {
        console.error('Error sending error message:', sendError);
      }
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  socket.onclose = () => {
    console.log("Filesystem bridge connection closed");
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  };

  return response;
});

async function handleActionCommand(command: ActionCommand, socket: WebSocket) {
  console.log("Executing action command:", command);
  
  // Simulate command execution since we can't actually perform system actions in Edge Functions
  const result = {
    id: command.id,
    status: 'completed',
    timestamp: new Date().toISOString(),
    result: `Simulated execution of ${command.type} command`,
    data: command.data
  };

  socket.send(JSON.stringify({
    type: 'action_result',
    data: result
  }));
}

async function handleFileOperation(operation: any, socket: WebSocket) {
  console.log("File operation:", operation);
  
  // Simulate file operations
  const result = {
    operation: operation.type,
    path: operation.path,
    status: 'success',
    timestamp: new Date().toISOString(),
    data: operation.type === 'read' ? 'simulated file content' : null
  };

  socket.send(JSON.stringify({
    type: 'file_operation_result',
    data: result
  }));
}

async function handleWorkflowDataRequest(request: any, socket: WebSocket) {
  console.log("Workflow data request:", request);
  
  // Mock workflow data
  const mockData: WorkflowData[] = [
    {
      nodeId: request.nodeId,
      dataType: request.dataType || 'execution_result',
      content: {
        status: 'completed',
        result: 'Mock workflow execution result',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    }
  ];

  socket.send(JSON.stringify({
    type: 'workflow_data_response',
    data: mockData
  }));
}