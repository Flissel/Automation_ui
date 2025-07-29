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

  socket.onopen = () => {
    console.log("Filesystem bridge connection opened");
    socket.send(JSON.stringify({
      type: 'connection_established',
      timestamp: new Date().toISOString(),
      capabilities: ['file_operations', 'workflow_commands', 'action_execution']
    }));
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log("Received message:", message);

      switch (message.type) {
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
          socket.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          break;
        default:
          console.log("Unknown message type:", message.type);
      }
    } catch (error) {
      console.error("Error processing message:", error);
      socket.send(JSON.stringify({
        type: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      }));
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  socket.onclose = () => {
    console.log("Filesystem bridge connection closed");
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