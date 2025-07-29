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
  const configId = url.pathname.split('/').pop();
  
  let streamConfig: StreamConfig | null = null;
  let isStreaming = false;
  let frameCount = 0;

  console.log(`Live Desktop Stream WebSocket connected for config: ${configId}`);

  socket.onopen = async () => {
    console.log("Live desktop stream connection opened");
    
    // Load configuration from database
    if (configId) {
      try {
        const { data, error } = await supabase
          .from('live_desktop_configs')
          .select('*')
          .eq('id', configId)
          .single();
        
        if (data) {
          streamConfig = data.configuration;
        }
      } catch (error) {
        console.error("Error loading config:", error);
      }
    }

    socket.send(JSON.stringify({
      type: 'connection_established',
      configId,
      config: streamConfig,
      timestamp: new Date().toISOString()
    }));
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log("Received stream message:", message.type);

      switch (message.type) {
        case 'start_stream':
          await startStream(message.config, socket);
          break;
        case 'stop_stream':
          stopStream(socket);
          break;
        case 'update_config':
          streamConfig = message.config;
          socket.send(JSON.stringify({
            type: 'config_updated',
            config: streamConfig,
            timestamp: new Date().toISOString()
          }));
          break;
        case 'extract_ocr':
          await extractOCRFromRegions(message.regions, socket);
          break;
        case 'ping':
          socket.send(JSON.stringify({ 
            type: 'pong', 
            timestamp: new Date().toISOString(),
            frameCount 
          }));
          break;
        default:
          console.log("Unknown stream message type:", message.type);
      }
    } catch (error) {
      console.error("Error processing stream message:", error);
      socket.send(JSON.stringify({
        type: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      }));
    }
  };

  socket.onerror = (error) => {
    console.error("Stream WebSocket error:", error);
  };

  socket.onclose = () => {
    console.log("Live desktop stream connection closed");
    isStreaming = false;
  };

  return response;

  async function startStream(config: StreamConfig, socket: WebSocket) {
    isStreaming = true;
    streamConfig = config;
    frameCount = 0;

    console.log("Starting desktop stream with config:", config);

    socket.send(JSON.stringify({
      type: 'stream_started',
      config,
      timestamp: new Date().toISOString()
    }));

    // Simulate desktop frames
    const interval = setInterval(() => {
      if (!isStreaming) {
        clearInterval(interval);
        return;
      }

      frameCount++;
      
      // Simulate frame data (base64 encoded image)
      const mockFrame = generateMockFrame();
      
      socket.send(JSON.stringify({
        type: 'frame_data',
        frameData: mockFrame,
        frameNumber: frameCount,
        timestamp: new Date().toISOString()
      }));

      // Simulate OCR extraction every 5 frames if OCR regions are active
      if (frameCount % 5 === 0 && streamConfig?.ocrRegions?.some(r => r.isActive)) {
        extractOCRFromRegions(streamConfig.ocrRegions, socket);
      }
    }, 1000 / (config.fps || 10));
  }

  function stopStream(socket: WebSocket) {
    isStreaming = false;
    console.log("Stopping desktop stream");
    
    socket.send(JSON.stringify({
      type: 'stream_stopped',
      timestamp: new Date().toISOString(),
      frameCount
    }));
  }

  async function extractOCRFromRegions(regions: OCRRegion[], socket: WebSocket) {
    const activeRegions = regions.filter(r => r.isActive);
    
    for (const region of activeRegions) {
      // Simulate OCR processing
      const mockText = `Mock OCR text for region ${region.label} at ${new Date().toLocaleTimeString()}`;
      const confidence = Math.random() * 0.3 + 0.7; // 70-100% confidence
      
      const ocrResult = {
        regionId: region.id,
        regionLabel: region.label,
        extractedText: mockText,
        confidence,
        timestamp: new Date().toISOString()
      };

      socket.send(JSON.stringify({
        type: 'ocr_result',
        data: ocrResult
      }));

      // Send to N8N webhook if configured
      if (streamConfig?.n8nWebhookUrl) {
        try {
          await fetch(streamConfig.n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ocrResult)
          });
        } catch (error) {
          console.error("Error sending to N8N webhook:", error);
        }
      }
    }
  }

  function generateMockFrame(): string {
    // Generate a simple mock frame (1x1 pixel transparent PNG in base64)
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  }
});