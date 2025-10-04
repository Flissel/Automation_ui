import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface OCRRegion {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isActive: boolean;
}

interface StreamConfig {
  id: string;
  fps: number;
  quality: number;
  scale: number;
  ocrRegions: OCRRegion[];
  n8nWebhookUrl?: string;
}

interface DesktopClient {
  socket: WebSocket;
  clientId: string;
  isStreaming: boolean;
  lastPing: number;
}

interface WebClient {
  socket: WebSocket;
  clientId: string;
  configId: string;
}

// Store active desktop clients and web clients
const desktopClients = new Map<string, DesktopClient>();
const webClients = new Map<string, WebClient>();

// Mock desktop clients for testing
const MOCK_DESKTOP_CLIENTS = [
  { id: 'desktop_001', name: 'Main Workstation', monitors: ['monitor_0', 'monitor_1'], connected: true },
  { id: 'desktop_002', name: 'Development PC', monitors: ['monitor_0'], connected: true },
  { id: 'desktop_003', name: 'Test Machine', monitors: ['monitor_0', 'monitor_1'], connected: true }
];

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
  const url = new URL(req.url);
  const clientType = url.searchParams.get('client_type') || 'web'; // 'desktop' or 'web'
  const clientId = url.searchParams.get('client_id') || crypto.randomUUID();
  const configId = url.searchParams.get('config_id') || url.pathname.split('/').pop();
  
  console.log(`New ${clientType} client connected: ${clientId}`);

  if (clientType === 'desktop') {
    handleDesktopClient(socket, clientId);
  } else {
    handleWebClient(socket, clientId, configId);
  }

  return response;
});

function handleDesktopClient(socket: WebSocket, clientId: string) {
  const client: DesktopClient = {
    socket,
    clientId,
    isStreaming: false,
    lastPing: Date.now()
  };

  desktopClients.set(clientId, client);
  console.log(`Desktop client registered: ${clientId}`);

  socket.onopen = () => {
    console.log(`Desktop client ${clientId} connected`);
    
    // Send connection acknowledgment
    socket.send(JSON.stringify({
      type: 'connection_established',
      clientId,
      role: 'desktop_client',
      timestamp: new Date().toISOString()
    }));
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log(`Desktop client ${clientId} message:`, message.type);

      switch (message.type) {
        case 'frame_data':
          // Relay frame to all connected web clients
          relayFrameToWebClients(message, clientId);
          break;
          
        case 'capability_report':
          // Store desktop client capabilities
          client.lastPing = Date.now();
          console.log(`Desktop client ${clientId} capabilities:`, message.capabilities);
          break;
          
        case 'ping':
          client.lastPing = Date.now();
          socket.send(JSON.stringify({ 
            type: 'pong', 
            timestamp: new Date().toISOString() 
          }));
          break;
          
        case 'stream_status':
          client.isStreaming = message.streaming;
          broadcastDesktopStatus(clientId);
          break;
          
        default:
          console.log(`Unknown desktop message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`Error processing desktop client message: ${error}`);
    }
  };

  socket.onerror = (error) => {
    console.error(`Desktop client ${clientId} error:`, error);
  };

  socket.onclose = () => {
    console.log(`Desktop client ${clientId} disconnected`);
    desktopClients.delete(clientId);
    notifyWebClientsDesktopDisconnected(clientId);
  };
}

function handleWebClient(socket: WebSocket, clientId: string, configId: string) {
  const client: WebClient = {
    socket,
    clientId,
    configId: configId || 'default'
  };

  webClients.set(clientId, client);
  console.log(`Web client registered: ${clientId} for config: ${configId}`);

  socket.onopen = async () => {
    console.log(`Web client ${clientId} connected`);
    
    // Send connection acknowledgment
    socket.send(JSON.stringify({
      type: 'connection_established',
      clientId,
      role: 'web_client',
      timestamp: new Date().toISOString()
    }));
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log(`Web client ${clientId} message:`, message.type);

      switch (message.type) {
        case 'handshake':
          console.log(`Handshake received from ${clientId}:`, message.clientInfo);
          socket.send(JSON.stringify({
            type: 'handshake_ack',
            clientId,
            timestamp: new Date().toISOString()
          }));
          break;

        case 'get_desktop_clients':
          console.log(`Desktop clients list requested by ${clientId}`);
          // Send list of mock desktop clients with both id and clientId for compatibility
          const clientsList = MOCK_DESKTOP_CLIENTS.map(client => ({
            id: client.id, // Frontend expects 'id'
            clientId: client.id, // Also include clientId for compatibility
            name: client.name,
            connected: client.connected,
            streaming: false,
            monitors: client.monitors,
            availableMonitors: client.monitors,
            timestamp: new Date().toISOString()
          }));
          
          socket.send(JSON.stringify({
            type: 'desktop_clients_list',
            clients: clientsList,
            timestamp: new Date().toISOString()
          }));
          break;

        case 'start_stream':
        case 'start_desktop_stream': // Accept alias for compatibility
          console.log(`Start stream request for ${message.desktopClientId || 'default'}`);
          const desktopClientId = message.desktopClientId || MOCK_DESKTOP_CLIENTS[0].id;
          
          // Send mock frame data periodically
          startMockStream(socket, desktopClientId, message.monitorId);
          
          socket.send(JSON.stringify({
            type: 'stream_started',
            desktopClientId,
            monitorId: message.monitorId || 'monitor_0',
            timestamp: new Date().toISOString()
          }));
          break;
          
        case 'stop_stream':
        case 'stop_desktop_stream': // Accept alias for compatibility
          console.log(`Stop stream request for ${message.desktopClientId || 'default'}`);
          stopMockStream(socket);
          
          socket.send(JSON.stringify({
            type: 'stream_stopped',
            desktopClientId: message.desktopClientId,
            timestamp: new Date().toISOString()
          }));
          break;
          
        case 'request_screenshot':
          console.log(`Screenshot request for ${message.desktopClientId}`);
          sendMockScreenshot(socket, message.desktopClientId);
          break;
          
        case 'ping':
          socket.send(JSON.stringify({ 
            type: 'pong', 
            timestamp: new Date().toISOString(),
            availableDesktopClients: MOCK_DESKTOP_CLIENTS.map(c => c.id)
          }));
          break;
          
        default:
          console.log(`Unknown web message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`Error processing web client message: ${error}`);
      socket.send(JSON.stringify({
        type: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      }));
    }
  };

  socket.onerror = (error) => {
    console.error(`Web client ${clientId} error:`, error);
  };

  socket.onclose = () => {
    console.log(`Web client ${clientId} disconnected`);
    webClients.delete(clientId);
  };
}

function relayFrameToWebClients(frameMessage: any, desktopClientId: string) {
  const frameData = {
    type: 'frame_data',
    frameData: frameMessage.frameData,
    frameNumber: frameMessage.frameNumber,
    timestamp: frameMessage.timestamp,
    desktopClientId,
    metadata: frameMessage.metadata || {}
  };

  // Send to all connected web clients
  for (const webClient of webClients.values()) {
    try {
      webClient.socket.send(JSON.stringify(frameData));
    } catch (error) {
      console.error(`Error sending frame to web client ${webClient.clientId}:`, error);
    }
  }
}

function broadcastDesktopStatus(desktopClientId: string) {
  const client = desktopClients.get(desktopClientId);
  if (!client) return;

  const statusMessage = {
    type: 'desktop_status',
    desktopClientId,
    isStreaming: client.isStreaming,
    lastPing: client.lastPing,
    timestamp: new Date().toISOString()
  };

  // Broadcast to all web clients
  for (const webClient of webClients.values()) {
    try {
      webClient.socket.send(JSON.stringify(statusMessage));
    } catch (error) {
      console.error(`Error broadcasting status to web client ${webClient.clientId}:`, error);
    }
  }
}

function notifyWebClientsDesktopDisconnected(desktopClientId: string) {
  const disconnectMessage = {
    type: 'desktop_disconnected',
    desktopClientId,
    timestamp: new Date().toISOString()
  };

  for (const webClient of webClients.values()) {
    try {
      webClient.socket.send(JSON.stringify(disconnectMessage));
    } catch (error) {
      console.error(`Error notifying web client of disconnect:`, error);
    }
  }
}

async function startStreamForClient(desktopClientId: string, config: any) {
  const desktopClient = desktopClients.get(desktopClientId);
  if (!desktopClient) {
    console.error(`Desktop client ${desktopClientId} not found`);
    return;
  }

  console.log(`Starting stream for desktop client ${desktopClientId}`);
  
  try {
    desktopClient.socket.send(JSON.stringify({
      type: 'start_capture',
      config: {
        fps: config?.fps || 10,
        quality: config?.quality || 80,
        scale: config?.scale || 1.0,
        format: 'jpeg'
      },
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    console.error(`Error starting stream for desktop client ${desktopClientId}:`, error);
  }
}

async function stopStreamForClient(desktopClientId: string) {
  const desktopClient = desktopClients.get(desktopClientId);
  if (!desktopClient) {
    console.error(`Desktop client ${desktopClientId} not found`);
    return;
  }

  console.log(`Stopping stream for desktop client ${desktopClientId}`);
  
  try {
    desktopClient.socket.send(JSON.stringify({
      type: 'stop_capture',
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    console.error(`Error stopping stream for desktop client ${desktopClientId}:`, error);
  }
}

async function updateStreamConfig(config: any) {
  // Broadcast config update to all desktop clients
  const configMessage = {
    type: 'config_update',
    config,
    timestamp: new Date().toISOString()
  };

  for (const desktopClient of desktopClients.values()) {
    try {
      desktopClient.socket.send(JSON.stringify(configMessage));
    } catch (error) {
      console.error(`Error updating config for desktop client:`, error);
    }
  }
}

async function requestScreenshotFromDesktop(desktopClientId: string) {
  const desktopClient = desktopClients.get(desktopClientId);
  if (!desktopClient) return;

  try {
    desktopClient.socket.send(JSON.stringify({
      type: 'capture_screenshot',
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    console.error(`Error requesting screenshot:`, error);
  }
}

function getFirstAvailableDesktopClient(): string | null {
  const clientIds = Array.from(desktopClients.keys());
  return clientIds.length > 0 ? clientIds[0] : null;
}

// Mock stream management
const activeStreams = new Map<WebSocket, NodeJS.Timer>();

function startMockStream(socket: WebSocket, desktopClientId: string, monitorId: string = 'monitor_0') {
  // Stop existing stream if any
  stopMockStream(socket);
  
  let frameNumber = 0;
  const interval = setInterval(() => {
    if (socket.readyState !== WebSocket.OPEN) {
      stopMockStream(socket);
      return;
    }
    
    frameNumber++;
    
    // Generate mock frame data (simulated base64 image)
    const mockFrameData = generateMockFrameData(frameNumber);
    
    socket.send(JSON.stringify({
      type: 'frame_data',
      desktopClientId,
      monitorId,
      frameData: mockFrameData,
      frameNumber,
      timestamp: new Date().toISOString(),
      metadata: {
        width: 1920,
        height: 1080,
        format: 'svg', // Mark as SVG format
        clientId: desktopClientId // Include for compatibility
      }
    }));
  }, 100); // 10 FPS
  
  activeStreams.set(socket, interval);
  console.log(`Started mock stream for ${desktopClientId}:${monitorId}`);
}

function stopMockStream(socket: WebSocket) {
  const interval = activeStreams.get(socket);
  if (interval) {
    clearInterval(interval);
    activeStreams.delete(socket);
    console.log('Stopped mock stream');
  }
}

function sendMockScreenshot(socket: WebSocket, desktopClientId: string) {
  const mockScreenshotData = generateMockFrameData(0);
  
  socket.send(JSON.stringify({
    type: 'screenshot',
    desktopClientId,
    imageData: mockScreenshotData,
    timestamp: new Date().toISOString(),
    metadata: {
      width: 1920,
      height: 1080,
      format: 'jpeg'
    }
  }));
}

function generateMockFrameData(frameNumber: number): string {
  // Generate a simple SVG as base64 encoded mock frame
  const svg = `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
    <rect width="1920" height="1080" fill="#1a1a2e"/>
    <text x="960" y="540" font-family="Arial" font-size="48" fill="#fff" text-anchor="middle">
      Mock Desktop Stream - Frame ${frameNumber}
    </text>
    <text x="960" y="600" font-family="Arial" font-size="24" fill="#aaa" text-anchor="middle">
      ${new Date().toISOString()}
    </text>
  </svg>`;
  
  return btoa(svg);
}

// Health check for desktop clients
setInterval(() => {
  const now = Date.now();
  const timeout = 30000; // 30 seconds

  for (const [clientId, client] of desktopClients.entries()) {
    if (now - client.lastPing > timeout) {
      console.log(`Desktop client ${clientId} timed out, removing`);
      desktopClients.delete(clientId);
      notifyWebClientsDesktopDisconnected(clientId);
    }
  }
}, 10000); // Check every 10 seconds