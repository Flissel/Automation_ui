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

// Supabase Realtime channel for cross-instance communication
const controlChannel = supabase.channel('desktop-control-messages', {
  config: {
    broadcast: { self: true }, // Receive our own broadcasts for debugging
    presence: { key: '' }
  }
});

console.log('🔔 [EDGE FUNCTION INIT] Creating Realtime channel: desktop-control-messages');

// Subscribe to control messages
const channelSubscription = controlChannel
  .on('broadcast', { event: 'control_message' }, (payload: any) => {
    console.log('📢 [BROADCAST RECEIVED] Received broadcast control message');
    console.log('📢 [BROADCAST RECEIVED] Full payload:', JSON.stringify(payload));

    // payload structure from Supabase is different - it's directly in payload, not payload.payload
    const { desktopClientId, message } = payload.payload || payload;
    console.log(`📢 [BROADCAST RECEIVED] Target desktop client: ${desktopClientId}`);
    console.log(`📢 [BROADCAST RECEIVED] Message to forward:`, JSON.stringify(message));

    // Forward to desktop client if connected to this instance
    const desktopClient = desktopClients.get(desktopClientId);
    console.log(`📢 [BROADCAST RECEIVED] Desktop client found in local map: ${!!desktopClient}`);

    if (desktopClient && desktopClient.socket.readyState === 1) {
      console.log(`✅ [BROADCAST FORWARD] Forwarding control message to desktop client ${desktopClientId}`);
      desktopClient.socket.send(JSON.stringify(message));
      console.log(`✅ [BROADCAST FORWARD] Message sent successfully to ${desktopClientId}`);
    } else {
      console.log(`❌ [BROADCAST SKIP] Desktop client ${desktopClientId} not connected to this instance`);
      if (desktopClient) {
        console.log(`❌ [BROADCAST SKIP] Socket state: ${desktopClient.socket.readyState}`);
      }
    }
  })
  .on('broadcast', { event: 'frame_data' }, (payload: any) => {
    console.log('📺 [FRAME BROADCAST] Received frame_data broadcast');

    const { desktopClientId, frameData } = payload.payload || payload;
    console.log(`📺 [FRAME BROADCAST] Frame from desktop client: ${desktopClientId}`);
    console.log(`📺 [FRAME BROADCAST] Forwarding to ${webClients.size} local web clients`);

    // Forward frame to all local web clients
    for (const webClient of webClients.values()) {
      try {
        if (webClient.socket.readyState === 1) {
          webClient.socket.send(JSON.stringify(frameData));
        }
      } catch (error) {
        console.error(`❌ [FRAME BROADCAST] Error sending frame to web client ${webClient.clientId}:`, error);
      }
    }
  })
  .subscribe(async (status: string) => {
    console.log(`🔔 [REALTIME STATUS] Channel subscription status: ${status}`);
    if (status === 'SUBSCRIBED') {
      console.log('✅ [REALTIME STATUS] Successfully subscribed to Realtime channel');
    } else if (status === 'CHANNEL_ERROR') {
      console.error('❌ [REALTIME ERROR] Failed to subscribe to Realtime channel');
    } else if (status === 'TIMED_OUT') {
      console.error('❌ [REALTIME ERROR] Realtime channel subscription timed out');
    }
  });

console.log('🔔 [EDGE FUNCTION INIT] Waiting for Realtime channel to connect...');

// Initialize desktop_commands table
async function initDesktopCommandsTable() {
  try {
    console.log('📋 [DB INIT] Creating desktop_commands table if not exists...');

    const { error } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS desktop_commands (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          desktop_client_id TEXT NOT NULL,
          command_type TEXT NOT NULL,
          command_data JSONB DEFAULT '{}'::jsonb,
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          processed_at TIMESTAMPTZ,
          error_message TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_desktop_commands_pending
          ON desktop_commands(desktop_client_id, status, created_at)
          WHERE status = 'pending';
      `
    });

    if (error) {
      console.error('❌ [DB INIT] Error creating desktop_commands table:', error);
    } else {
      console.log('✅ [DB INIT] desktop_commands table ready');
    }
  } catch (error) {
    console.error('❌ [DB INIT] Exception creating desktop_commands table:', error);
  }
}

// Initialize table on startup
initDesktopCommandsTable();

// Database helper functions for managing active desktop clients
async function registerDesktopClient(clientId: string, name: string, monitors: any[], capabilities: any, userId?: string, friendlyName?: string, hostname?: string): Promise<boolean> {
  try {
    console.log(`Attempting to register desktop client ${clientId} in database...`);

    const clientData = {
      client_id: clientId,
      name: name || clientId,
      monitors: monitors || [],
      capabilities: capabilities || {},
      user_id: userId || null,
      friendly_name: friendlyName || null,
      hostname: hostname || null,
      is_streaming: false,
      last_ping: new Date().toISOString(),
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Client data to insert:', JSON.stringify(clientData));

    const { data, error } = await supabase
      .from('active_desktop_clients')
      .upsert(clientData)
      .select();

    if (error) {
      console.error('❌ Error registering desktop client:', error);
      console.error('Error details:', JSON.stringify(error));
      return false;
    } else {
      console.log(`✅ Desktop client ${clientId} registered in database`);
      console.log('Registered data:', JSON.stringify(data));
      return true;
    }
  } catch (error) {
    console.error('❌ Exception in registerDesktopClient:', error);
    return false;
  }
}

async function unregisterDesktopClient(clientId: string) {
  try {
    const { error } = await supabase
      .from('active_desktop_clients')
      .delete()
      .eq('client_id', clientId);

    if (error) {
      console.error('Error unregistering desktop client:', error);
    } else {
      console.log(`Desktop client ${clientId} unregistered from database`);
    }
  } catch (error) {
    console.error('Error in unregisterDesktopClient:', error);
  }
}

async function updateDesktopClientPing(clientId: string) {
  try {
    const now = new Date().toISOString();
    console.log(`🔄 [DB UPDATE] Updating ping for ${clientId} at ${now}`);

    const { data, error } = await supabase
      .from('active_desktop_clients')
      .update({
        last_ping: now,
        updated_at: now
      })
      .eq('client_id', clientId)
      .select();

    if (error) {
      console.error(`❌ [DB UPDATE] Error updating desktop client ping for ${clientId}:`, error);
    } else {
      console.log(`✅ [DB UPDATE] Successfully updated ping for ${clientId}, rows affected: ${(data || []).length}`);
    }
  } catch (error) {
    console.error(`❌ [DB UPDATE] Exception in updateDesktopClientPing for ${clientId}:`, error);
  }
}

async function getActiveDesktopClients() {
  try {
    // Get ALL clients (no time filter for now - we'll rely on cleanup)
    const { data, error } = await supabase
      .from('active_desktop_clients')
      .select('*');

    if (error) {
      console.error('Error getting active desktop clients:', error);
      console.error('Error details:', JSON.stringify(error));
      return [];
    }

    console.log(`Found ${(data || []).length} desktop clients in database`);

    return data || [];
  } catch (error) {
    console.error('Error in getActiveDesktopClients:', error);
    return [];
  }
}

async function updateDesktopClientStreaming(clientId: string, isStreaming: boolean) {
  try {
    const { error } = await supabase
      .from('active_desktop_clients')
      .update({
        is_streaming: isStreaming,
        updated_at: new Date().toISOString()
      })
      .eq('client_id', clientId);

    if (error) {
      console.error('Error updating desktop client streaming status:', error);
    }
  } catch (error) {
    console.error('Error in updateDesktopClientStreaming:', error);
  }
}

// Command queue functions
async function insertDesktopCommand(desktopClientId: string, commandType: string, commandData: any) {
  try {
    console.log(`💾 [COMMAND INSERT] Inserting command for ${desktopClientId}: ${commandType}`);

    const { data, error } = await supabase
      .from('desktop_commands')
      .insert({
        desktop_client_id: desktopClientId,
        command_type: commandType,
        command_data: commandData,
        status: 'pending'
      })
      .select();

    if (error) {
      console.error('❌ [COMMAND INSERT] Error:', error);
      return null;
    }

    console.log(`✅ [COMMAND INSERT] Command inserted with ID:`, data?.[0]?.id);
    return data?.[0];
  } catch (error) {
    console.error('❌ [COMMAND INSERT] Exception:', error);
    return null;
  }
}

async function getPendingCommands(desktopClientId: string) {
  try {
    const { data, error } = await supabase
      .from('desktop_commands')
      .select('*')
      .eq('desktop_client_id', desktopClientId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error getting pending commands:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPendingCommands:', error);
    return [];
  }
}

async function markCommandProcessed(commandId: string, status: 'completed' | 'failed', errorMessage?: string) {
  try {
    const { error } = await supabase
      .from('desktop_commands')
      .update({
        status,
        processed_at: new Date().toISOString(),
        error_message: errorMessage
      })
      .eq('id', commandId);

    if (error) {
      console.error('Error marking command processed:', error);
    }
  } catch (error) {
    console.error('Error in markCommandProcessed:', error);
  }
}

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
  name?: string;
  monitors?: string[];
  capabilities?: any;
  connectedAt: number;
}

interface WebClient {
  socket: WebSocket;
  clientId: string;
  configId: string;
}

// Store active desktop clients and web clients
const desktopClients = new Map<string, DesktopClient>();
const webClients = new Map<string, WebClient>();

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
    lastPing: Date.now(),
    connectedAt: Date.now()
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
        case 'handshake':
          // Store desktop client metadata
          client.name = message.clientInfo?.name || clientId;
          client.monitors = message.clientInfo?.monitors || [];
          client.capabilities = message.clientInfo?.capabilities;
          client.lastPing = Date.now();
          console.log(`Desktop client ${clientId} handshake:`, {
            name: client.name,
            monitors: client.monitors,
            capabilities: client.capabilities
          });

          // Register in database for cross-instance visibility
          let dbRegistered = false;
          let dbError = null;
          let dbClientCount = 0;
          try {
            dbRegistered = await registerDesktopClient(
              clientId,
              client.name,
              client.monitors,
              client.capabilities,
              message.clientInfo?.userId,
              message.clientInfo?.friendlyName,
              message.clientInfo?.hostname
            );

            if (dbRegistered) {
              console.log(`✅ Successfully registered ${clientId} in database`);

              // Verify registration by querying
              const verifyClients = await getActiveDesktopClients();
              dbClientCount = verifyClients.length;
              console.log(`📊 Database now has ${dbClientCount} clients`);
            } else {
              console.error(`❌ Registration returned false for ${clientId}`);
              dbError = 'Registration failed - check database permissions and RLS policies';
            }
          } catch (error) {
            console.error(`❌ Failed to register ${clientId} in database:`, error);
            dbError = error.message || String(error);
            dbRegistered = false;
          }

          // Send handshake acknowledgment to desktop client
          socket.send(JSON.stringify({
            type: 'handshake_ack',
            clientId,
            timestamp: new Date().toISOString(),
            dbRegistered,  // Include database registration status
            dbClientCount,  // Number of clients in database after registration
            dbError,  // Any error that occurred
            debug: {
              supabaseUrl: Deno.env.get('SUPABASE_URL') ? 'SET' : 'NOT_SET',
              serviceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'SET' : 'NOT_SET'
            }
          }));

          // Notify all web clients about new desktop client
          await broadcastDesktopClientsListFromDB();
          break;

        case 'frame_data':
          // Relay frame to all connected web clients (local and via Realtime broadcast)
          console.log(`📺 [DESKTOP->SERVER] Frame received from ${clientId}, metadata:`, message.metadata);
          await relayFrameToWebClients(message, clientId);
          break;
          
        case 'capability_report':
          // Store desktop client capabilities
          client.lastPing = Date.now();
          console.log(`Desktop client ${clientId} capabilities:`, message.capabilities);
          break;
          
        case 'get_commands':
          // Desktop client polling for pending commands
          // Update timestamp to show this client is still active
          await updateDesktopClientPing(clientId);

          const pendingCommands = await getPendingCommands(clientId);
          console.log(`📥 [COMMAND POLL] Desktop client ${clientId} polling, found ${pendingCommands.length} pending commands`);

          socket.send(JSON.stringify({
            type: 'commands',
            commands: pendingCommands,
            timestamp: new Date().toISOString()
          }));
          break;

        case 'command_result':
          // Desktop client reporting command execution result
          const { commandId, status: commandStatus, error: commandError } = message;
          console.log(`📊 [COMMAND RESULT] Command ${commandId} status: ${commandStatus}`);

          await markCommandProcessed(commandId, commandStatus, commandError);
          break;

        case 'ping':
          client.lastPing = Date.now();
          await updateDesktopClientPing(clientId);
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

  socket.onclose = async () => {
    console.log(`Desktop client ${clientId} disconnected`);
    desktopClients.delete(clientId);
    await unregisterDesktopClient(clientId);
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

          // Get clients from database (visible across all Edge Function instances)
          const dbClients = await getActiveDesktopClients();
          console.log(`📊 [CONNECTIVITY CHECK] Found ${dbClients.length} clients in database`);

          const clientsList = dbClients.map((client: any) => {
            // Check if client is in local map OR has recent activity (polling within last 30 seconds)
            const isLocallyConnected = desktopClients.has(client.client_id);
            const lastUpdate = new Date(client.updated_at || client.last_ping);
            const timeSinceUpdate = Date.now() - lastUpdate.getTime();
            const isRecentlyActive = timeSinceUpdate < 30000; // 30 seconds

            console.log(`📊 [${client.client_id}] Local: ${isLocallyConnected}, LastUpdate: ${lastUpdate.toISOString()}, TimeSince: ${timeSinceUpdate}ms, RecentlyActive: ${isRecentlyActive}`);

            return {
              id: client.client_id,
              clientId: client.client_id,
              name: client.name || client.client_id,
              connected: isLocallyConnected || isRecentlyActive,
              streaming: client.is_streaming || false,
              monitors: client.monitors || ['monitor_0'],
              availableMonitors: client.monitors || ['monitor_0'],
              timestamp: new Date().toISOString()
            };
          });

          const connectedCount = clientsList.filter(c => c.connected).length;
          console.log(`Found ${clientsList.length} active desktop clients in database, ${connectedCount} connected`);

          socket.send(JSON.stringify({
            type: 'desktop_clients_list',
            clients: clientsList,
            timestamp: new Date().toISOString()
          }));
          break;

        case 'start_stream':
        case 'start_desktop_stream': // Accept alias for compatibility
          console.log(`🎬 [START_STREAM] Received start_stream request`);
          console.log(`🎬 [START_STREAM] Full message:`, JSON.stringify(message));

          const desktopClientId = message.desktopClientId;
          console.log(`🎬 [START_STREAM] Target desktop client: ${desktopClientId}`);

          if (!desktopClientId) {
            console.log(`❌ [START_STREAM ERROR] No desktopClientId provided`);
            socket.send(JSON.stringify({
              type: 'error',
              error: 'desktopClientId is required',
              timestamp: new Date().toISOString()
            }));
            break;
          }

          // Prepare the control message to send to desktop client
          const startCaptureMessage = {
            type: 'start_capture',
            monitorId: message.monitorId || 'monitor_0',
            config: {
              fps: 10,
              quality: 75,
              scale: 1.0,
              format: 'jpeg'
            },
            timestamp: new Date().toISOString()
          };
          console.log(`🎬 [START_STREAM] Prepared start_capture message:`, JSON.stringify(startCaptureMessage));

          // Try to find desktop client in local instance first
          const desktopClient = desktopClients.get(desktopClientId);
          console.log(`🎬 [START_STREAM] Local desktop clients in map: ${desktopClients.size}`);
          console.log(`🎬 [START_STREAM] Desktop client found locally: ${!!desktopClient}`);

          if (desktopClient) {
            console.log(`🎬 [START_STREAM] Desktop client socket state: ${desktopClient.socket.readyState}`);
          }

          if (desktopClient && desktopClient.socket.readyState === 1) {
            // Desktop client is connected to THIS instance - send directly
            console.log(`✅ [START_STREAM LOCAL] Desktop client ${desktopClientId} found locally, sending start_capture directly`);
            desktopClient.socket.send(JSON.stringify(startCaptureMessage));
            desktopClient.isStreaming = true;
            console.log(`✅ [START_STREAM LOCAL] start_capture sent successfully to ${desktopClientId}`);

            socket.send(JSON.stringify({
              type: 'stream_started',
              desktopClientId,
              monitorId: message.monitorId || 'monitor_0',
              timestamp: new Date().toISOString()
            }));
          } else {
            // Desktop client not in local instance - insert command into database for polling
            console.log(`💾 [START_STREAM DB] Desktop client ${desktopClientId} not found locally, inserting command into database`);

            const commandInserted = await insertDesktopCommand(
              desktopClientId,
              'start_capture',
              startCaptureMessage
            );

            if (commandInserted) {
              console.log(`✅ [START_STREAM DB] Command inserted, desktop client will poll and execute`);
            } else {
              console.error(`❌ [START_STREAM DB] Failed to insert command`);
            }

            // Send acknowledgment to web client
            socket.send(JSON.stringify({
              type: 'stream_started',
              desktopClientId,
              monitorId: message.monitorId || 'monitor_0',
              viaDatabase: true,
              timestamp: new Date().toISOString()
            }));
            console.log(`✅ [START_STREAM DB] Sent acknowledgment to web client`);
          }
          break;
          
        case 'stop_stream':
        case 'stop_desktop_stream': // Accept alias for compatibility
          console.log(`Stop stream request for ${message.desktopClientId || 'unknown'}`);

          if (!message.desktopClientId) {
            socket.send(JSON.stringify({
              type: 'error',
              error: 'desktopClientId is required',
              timestamp: new Date().toISOString()
            }));
            break;
          }

          // Prepare the stop message
          const stopCaptureMessage = {
            type: 'stop_capture',
            timestamp: new Date().toISOString()
          };

          // Try to find desktop client in local instance first
          const desktopClientToStop = desktopClients.get(message.desktopClientId);

          if (desktopClientToStop && desktopClientToStop.socket.readyState === 1) {
            // Desktop client is connected to THIS instance - send directly
            console.log(`✅ Stopping stream for ${message.desktopClientId} (local)`);
            desktopClientToStop.socket.send(JSON.stringify(stopCaptureMessage));
            desktopClientToStop.isStreaming = false;

            socket.send(JSON.stringify({
              type: 'stream_stopped',
              desktopClientId: message.desktopClientId,
              timestamp: new Date().toISOString()
            }));
          } else {
            // Desktop client not in local instance - insert command into database
            console.log(`💾 [STOP_STREAM DB] Desktop client ${message.desktopClientId} not found locally, inserting command into database`);

            await insertDesktopCommand(
              message.desktopClientId,
              'stop_capture',
              stopCaptureMessage
            );

            socket.send(JSON.stringify({
              type: 'stream_stopped',
              desktopClientId: message.desktopClientId,
              viaDatabase: true,
              timestamp: new Date().toISOString()
            }));
          }
          break;
          
        case 'request_screenshot':
          console.log(`Screenshot request for ${message.desktopClientId}`);

          if (!message.desktopClientId) {
            socket.send(JSON.stringify({
              type: 'error',
              error: 'desktopClientId is required',
              timestamp: new Date().toISOString()
            }));
            break;
          }

          const desktopClientForScreenshot = desktopClients.get(message.desktopClientId);

          if (desktopClientForScreenshot) {
            // Request screenshot from real desktop client
            desktopClientForScreenshot.socket.send(JSON.stringify({
              type: 'capture_screenshot',
              timestamp: new Date().toISOString()
            }));
          } else {
            // Desktop client not found - send error
            console.log(`Desktop client ${message.desktopClientId} not found for screenshot`);
            socket.send(JSON.stringify({
              type: 'error',
              error: `Desktop client ${message.desktopClientId} not found`,
              timestamp: new Date().toISOString()
            }));
          }
          break;
          
        case 'ping':
          socket.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString(),
            availableDesktopClients: Array.from(desktopClients.keys())
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

async function relayFrameToWebClients(frameMessage: any, desktopClientId: string) {
  // Build frame data with all available fields (robust handling)
  const frameData = {
    type: 'frame_data',
    frameData: frameMessage.frameData,
    frameNumber: frameMessage.frameNumber || 0,
    timestamp: frameMessage.timestamp || new Date().toISOString(),
    desktopClientId,
    monitorId: frameMessage.monitorId || frameMessage.metadata?.monitorId || 'monitor_0',
    width: frameMessage.width || frameMessage.metadata?.width,
    height: frameMessage.height || frameMessage.metadata?.height,
    metadata: frameMessage.metadata || {}
  };

  console.log(`📺 [RELAY FRAME] Relaying frame from ${desktopClientId}, monitor: ${frameData.monitorId}, frame #${frameData.frameNumber || 'N/A'}`);
  console.log(`📺 [RELAY FRAME] Frame data size: ${frameMessage.frameData?.length || 0} bytes`);

  // Send to all connected web clients on THIS instance
  let localWebClientCount = 0;
  for (const webClient of webClients.values()) {
    try {
      if (webClient.socket.readyState === 1) {
        webClient.socket.send(JSON.stringify(frameData));
        localWebClientCount++;
      }
    } catch (error) {
      console.error(`Error sending frame to web client ${webClient.clientId}:`, error);
    }
  }
  console.log(`📺 [RELAY FRAME] Sent to ${localWebClientCount} local web clients`);

  // Broadcast via Realtime for web clients on other Edge Function instances
  try {
    console.log(`📡 [RELAY FRAME] Broadcasting frame via Realtime for cross-instance delivery`);
    await controlChannel.send({
      type: 'broadcast',
      event: 'frame_data',
      payload: {
        desktopClientId,
        frameData
      }
    });
    console.log(`📡 [RELAY FRAME] Frame broadcast sent successfully`);
  } catch (error) {
    console.error(`❌ [RELAY FRAME] Error broadcasting frame via Realtime:`, error);
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

async function broadcastDesktopClientsListFromDB() {
  try {
    // Get clients from database (visible across all Edge Function instances)
    const dbClients = await getActiveDesktopClients();
    console.log(`📊 [BROADCAST] Found ${dbClients.length} clients in database`);

    const clientsList = dbClients.map((client: any) => {
      // Check if client is in local map OR has recent activity (polling within last 30 seconds)
      const isLocallyConnected = desktopClients.has(client.client_id);
      const lastUpdate = new Date(client.updated_at || client.last_ping);
      const timeSinceUpdate = Date.now() - lastUpdate.getTime();
      const isRecentlyActive = timeSinceUpdate < 30000; // 30 seconds

      console.log(`📊 [BROADCAST ${client.client_id}] Local: ${isLocallyConnected}, LastUpdate: ${lastUpdate.toISOString()}, TimeSince: ${timeSinceUpdate}ms, RecentlyActive: ${isRecentlyActive}`);

      return {
        id: client.client_id,
        clientId: client.client_id,
        name: client.name || client.client_id,
        connected: isLocallyConnected || isRecentlyActive,
        streaming: client.is_streaming || false,
        monitors: client.monitors || ['monitor_0'],
        availableMonitors: client.monitors || ['monitor_0'],
        timestamp: new Date().toISOString()
      };
    });

    const listMessage = {
      type: 'desktop_clients_list',
      clients: clientsList,
      timestamp: new Date().toISOString()
    };

    console.log(`Broadcasting ${clientsList.length} desktop clients to ${webClients.size} web clients`);

    // Broadcast to all web clients
    for (const webClient of webClients.values()) {
      try {
        webClient.socket.send(JSON.stringify(listMessage));
      } catch (error) {
        console.error(`Error broadcasting desktop clients list to web client ${webClient.clientId}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in broadcastDesktopClientsListFromDB:', error);
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