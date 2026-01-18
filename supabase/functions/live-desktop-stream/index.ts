import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Generate unique instance ID for this Edge Function instance
const INSTANCE_ID = crypto.randomUUID();
console.log(`🆔 [EDGE FUNCTION INIT] Instance ID: ${INSTANCE_ID}`);

// Supabase Realtime channel for cross-instance communication
const controlChannel = supabase.channel('desktop-control-messages', {
  config: {
    broadcast: { self: true }, // Receive our own broadcasts for debugging
    presence: { key: '' }
  }
});

console.log('🔔 [EDGE FUNCTION INIT] Creating Realtime channel: desktop-control-messages');

// Track processed command idempotency keys to prevent duplicates
const processedCommands = new Set<string>();

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
  .on('broadcast', { event: 'command' }, async (payload: any) => {
    console.log('📢 [COMMAND BROADCAST] Received command broadcast');

    const { targetInstanceId, desktopClientId, commandId, command, idempotencyKey } = payload.payload || payload;

    // Only process if targeted at this instance
    if (targetInstanceId !== INSTANCE_ID) {
      console.log(`⏭️ [COMMAND BROADCAST] Skipping - targeted at instance ${targetInstanceId}, we are ${INSTANCE_ID}`);
      return;
    }

    // Check idempotency - prevent duplicate execution
    if (processedCommands.has(idempotencyKey)) {
      console.log(`⏭️ [COMMAND BROADCAST] Skipping - already processed command ${idempotencyKey}`);
      return;
    }

    console.log(`🎯 [COMMAND BROADCAST] Command targeted at this instance for client ${desktopClientId}`);

    const desktopClient = desktopClients.get(desktopClientId);
    if (desktopClient && desktopClient.socket.readyState === 1) {
      console.log(`📤 [COMMAND BROADCAST] Forwarding command to desktop client ${desktopClientId}`);
      desktopClient.socket.send(JSON.stringify(command));

      // Mark as processed
      processedCommands.add(idempotencyKey);

      // Mark command as completed in database
      if (commandId) {
        await markCommandProcessed(commandId, 'completed');
      }

      console.log(`✅ [COMMAND BROADCAST] Command delivered and marked complete`);
    } else {
      console.warn(`⚠️ [COMMAND BROADCAST] Desktop client ${desktopClientId} not found or not connected on this instance`);
      if (commandId) {
        await markCommandProcessed(commandId, 'failed', 'Desktop client not connected to target instance');
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
  .on('broadcast', { event: 'frame_ack' }, (payload: any) => {
    // NEW: Handle cross-instance frame_ack broadcasts
    console.log('📥 [FRAME_ACK BROADCAST] Received frame_ack broadcast from another instance');

    const { targetDesktopClientId, frameNumber, latency, fromWebClientId } = payload.payload || payload;
    console.log(`📥 [FRAME_ACK BROADCAST] For desktop client: ${targetDesktopClientId}, frame #${frameNumber}`);

    // Check if the target desktop client is connected to THIS instance
    const localDesktopClient = desktopClients.get(targetDesktopClientId);
    if (localDesktopClient && localDesktopClient.socket.readyState === 1) {
      localDesktopClient.socket.send(JSON.stringify({
        type: 'frame_ack',
        frameNumber,
        latency,
        timestamp: new Date().toISOString()
      }));
      console.log(`✅ [FRAME_ACK BROADCAST->LOCAL] Delivered frame_ack #${frameNumber} to desktop client ${targetDesktopClientId}`);
    } else {
      console.log(`⏭️ [FRAME_ACK BROADCAST] Desktop client ${targetDesktopClientId} not on this instance, skipping`);
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
async function registerDesktopClient(clientId: string, name: string, monitors: any[], capabilities: any, userId?: string, friendlyName?: string, hostname?: string) {
  try {
    console.log(`Attempting to register desktop client ${clientId} in database with instance ${INSTANCE_ID}...`);

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
      updated_at: new Date().toISOString(),
      edge_function_instance_id: INSTANCE_ID  // Track which instance manages this client
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

    // First, find which instance has the client
    const { data: clientInfo, error: clientError } = await supabase
      .from('active_desktop_clients')
      .select('edge_function_instance_id')
      .eq('client_id', desktopClientId)
      .single();

    if (clientError || !clientInfo) {
      console.error('❌ [COMMAND INSERT] Client not found in database:', clientError);
      return null;
    }

    const targetInstanceId = clientInfo.edge_function_instance_id;
    console.log(`🎯 [COMMAND INSERT] Target instance: ${targetInstanceId}, Current instance: ${INSTANCE_ID}`);

    // Generate idempotency key to prevent duplicate execution
    const idempotencyKey = `${desktopClientId}_${commandType}_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;

    const { data, error } = await supabase
      .from('desktop_commands')
      .insert({
        desktop_client_id: desktopClientId,
        command_type: commandType,
        command_data: commandData,
        status: 'pending',
        target_instance_id: targetInstanceId,
        idempotency_key: idempotencyKey
      })
      .select();

    if (error) {
      console.error('❌ [COMMAND INSERT] Error:', error);
      return null;
    }

    console.log(`✅ [COMMAND INSERT] Command inserted with ID: ${data?.[0]?.id}, idempotency key: ${idempotencyKey}`);

    // If client is on THIS instance, send directly via WebSocket
    if (targetInstanceId === INSTANCE_ID) {
      const desktopClient = desktopClients.get(desktopClientId);
      if (desktopClient && desktopClient.socket.readyState === 1) {
        console.log(`📤 [DIRECT SEND] Client on this instance, sending command directly`);
        desktopClient.socket.send(JSON.stringify(commandData));
        // Mark as completed immediately since we sent it directly
        await markCommandProcessed(data[0].id, 'completed');
      } else {
        console.warn(`⚠️ [COMMAND INSERT] Client ${desktopClientId} should be on this instance but not found in local map`);
      }
    }
    // Otherwise, broadcast via Realtime for other instances to pick up
    else {
      console.log(`📡 [BROADCAST] Broadcasting command to target instance ${targetInstanceId}`);
      await controlChannel.send({
        type: 'broadcast',
        event: 'command',
        payload: {
          targetInstanceId,
          desktopClientId,
          commandId: data[0].id,
          command: commandData,
          idempotencyKey
        }
      });
    }

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
    console.log(`Web client registered: ${clientId} for config: ${configId}`);
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
              dbError = `Registration failed - check database permissions and RLS policies`;
            }
          } catch (error) {
            console.error(`❌ Failed to register ${clientId} in database:`, error);
            dbError = error.message || String(error);
            dbRegistered = false;
          }

          // CRITICAL: If registration failed, reject the connection
          if (!dbRegistered) {
            console.error(`❌ REJECTING connection for ${clientId} - database registration failed`);

            // Send error message to desktop client
            socket.send(JSON.stringify({
              type: 'registration_failed',
              clientId,
              error: dbError || 'Failed to register in database',
              timestamp: new Date().toISOString(),
              debug: {
                supabaseUrl: Deno.env.get('SUPABASE_URL') ? 'SET' : 'NOT_SET',
                serviceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'SET' : 'NOT_SET'
              }
            }));

            // Close the connection after sending error
            setTimeout(() => {
              socket.close(1008, 'Database registration failed');
              desktopClients.delete(clientId);
            }, 100);
            break;
          }

          // Send handshake acknowledgment to desktop client (only if registered successfully)
          socket.send(JSON.stringify({
            type: 'handshake_ack',
            clientId,
            timestamp: new Date().toISOString(),
            dbRegistered: true,  // Always true at this point
            dbClientCount,  // Number of clients in database after registration
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

        case 'ping':
          socket.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString(),
            availableDesktopClients: Array.from(desktopClients.keys())
          }));
          break;

        // ==================== UI AUTOMATION COMMANDS ====================
        case 'mouse_click':
        case 'execute_click':
          console.log(`🖱️ [MOUSE_CLICK] Request for ${message.desktopClientId}`);
          await handleAutomationCommand(socket, message.desktopClientId, 'mouse_click', {
            monitorId: message.monitorId || 'monitor_0',
            x: message.x,
            y: message.y,
            button: message.button || 'left',
            double: message.double || false
          });
          break;

        case 'mouse_move':
        case 'execute_move':
          console.log(`🖱️ [MOUSE_MOVE] Request for ${message.desktopClientId}`);
          await handleAutomationCommand(socket, message.desktopClientId, 'mouse_move', {
            monitorId: message.monitorId || 'monitor_0',
            x: message.x,
            y: message.y,
            duration: message.duration || 0.2
          });
          break;

        case 'mouse_drag':
        case 'execute_drag':
          console.log(`🖱️ [MOUSE_DRAG] Request for ${message.desktopClientId}`);
          await handleAutomationCommand(socket, message.desktopClientId, 'mouse_drag', {
            monitorId: message.monitorId || 'monitor_0',
            startX: message.startX,
            startY: message.startY,
            endX: message.endX,
            endY: message.endY,
            button: message.button || 'left',
            duration: message.duration || 0.5
          });
          break;

        case 'scroll':
        case 'execute_scroll':
          console.log(`🖱️ [SCROLL] Request for ${message.desktopClientId}`);
          await handleAutomationCommand(socket, message.desktopClientId, 'scroll', {
            monitorId: message.monitorId || 'monitor_0',
            x: message.x,
            y: message.y,
            scrollAmount: message.scrollAmount || 3,
            direction: message.direction || 'vertical'
          });
          break;

        case 'type_text':
        case 'execute_type':
          console.log(`⌨️ [TYPE_TEXT] Request for ${message.desktopClientId}`);
          await handleAutomationCommand(socket, message.desktopClientId, 'type_text', {
            text: message.text,
            interval: message.interval || 0.02
          });
          break;

        case 'key_press':
        case 'execute_key':
          console.log(`⌨️ [KEY_PRESS] Request for ${message.desktopClientId}`);
          await handleAutomationCommand(socket, message.desktopClientId, 'key_press', {
            key: message.key,
            modifiers: message.modifiers || []
          });
          break;

        case 'hotkey':
        case 'execute_hotkey':
          console.log(`⌨️ [HOTKEY] Request for ${message.desktopClientId}`);
          await handleAutomationCommand(socket, message.desktopClientId, 'hotkey', {
            keys: message.keys
          });
          break;

        case 'capture_region':
        case 'execute_capture_region':
          console.log(`📸 [CAPTURE_REGION] Request for ${message.desktopClientId}`);
          await handleAutomationCommand(socket, message.desktopClientId, 'capture_region', {
            monitorId: message.monitorId || 'monitor_0',
            x: message.x,
            y: message.y,
            width: message.width,
            height: message.height
          });
          break;

        case 'get_mouse_position':
          console.log(`🖱️ [GET_MOUSE_POSITION] Request for ${message.desktopClientId}`);
          await handleAutomationCommand(socket, message.desktopClientId, 'get_mouse_position', {});
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

// ==================== UI AUTOMATION HELPER ====================
async function handleAutomationCommand(
  webSocket: WebSocket,
  desktopClientId: string,
  commandType: string,
  commandData: Record<string, unknown>
): Promise<void> {
  if (!desktopClientId) {
    webSocket.send(JSON.stringify({
      type: 'error',
      error: 'desktopClientId is required for automation commands',
      commandType,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  console.log(`🤖 [AUTOMATION] Processing ${commandType} for ${desktopClientId}`);
  console.log(`🤖 [AUTOMATION] Command data:`, JSON.stringify(commandData));

  // Build the full command message
  const fullCommandData = {
    type: commandType,
    ...commandData,
    timestamp: new Date().toISOString()
  };

  // Try local delivery first
  const localDesktopClient = desktopClients.get(desktopClientId);
  
  if (localDesktopClient && localDesktopClient.socket.readyState === 1) {
    // Desktop client is on THIS instance - send directly
    console.log(`✅ [AUTOMATION LOCAL] Sending ${commandType} directly to ${desktopClientId}`);
    localDesktopClient.socket.send(JSON.stringify(fullCommandData));
    
    webSocket.send(JSON.stringify({
      type: 'automation_command_sent',
      commandType,
      desktopClientId,
      status: 'sent_direct',
      timestamp: new Date().toISOString()
    }));
  } else {
    // Desktop client not on this instance - insert into command queue
    console.log(`💾 [AUTOMATION DB] Inserting ${commandType} command into database for ${desktopClientId}`);
    
    const commandInserted = await insertDesktopCommand(
      desktopClientId,
      commandType,
      fullCommandData
    );

    if (commandInserted) {
      console.log(`✅ [AUTOMATION DB] Command inserted, ID: ${commandInserted.id}`);
      webSocket.send(JSON.stringify({
        type: 'automation_command_sent',
        commandType,
        desktopClientId,
        commandId: commandInserted.id,
        status: 'queued',
        timestamp: new Date().toISOString()
      }));
    } else {
      console.error(`❌ [AUTOMATION DB] Failed to insert ${commandType} command`);
      webSocket.send(JSON.stringify({
        type: 'error',
        error: `Failed to queue automation command: ${commandType}`,
        desktopClientId,
        timestamp: new Date().toISOString()
      }));
    }
  }
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