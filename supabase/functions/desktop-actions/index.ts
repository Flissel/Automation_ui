import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DesktopAction {
  type: 'click' | 'type' | 'key' | 'screenshot' | 'scroll';
  coordinates?: { x: number; y: number };
  text?: string;
  key?: string;
  element?: string;
  options?: {
    delay?: number;
    duration?: number;
    button?: 'left' | 'right' | 'middle';
  };
}

interface ActionRequest {
  actions: DesktopAction[];
  sessionId: string;
  workflowId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { actions, sessionId, workflowId }: ActionRequest = await req.json();

    console.log(`Processing ${actions.length} desktop actions for session: ${sessionId}`);

    const results = [];

    for (const action of actions) {
      const result = await processAction(action);
      results.push(result);
      
      // Add delay between actions if specified
      if (action.options?.delay) {
        await new Promise(resolve => setTimeout(resolve, action.options.delay));
      }
    }

    const response = {
      success: true,
      sessionId,
      workflowId,
      results,
      executionTime: Date.now(),
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Desktop action error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processAction(action: DesktopAction) {
  console.log("Processing action:", action.type);

  // Simulate action execution since we can't actually control the desktop
  // In a real implementation, this would interface with a desktop automation library
  
  const startTime = Date.now();
  
  switch (action.type) {
    case 'click':
      return simulateClick(action);
    case 'type':
      return simulateType(action);
    case 'key':
      return simulateKey(action);
    case 'screenshot':
      return simulateScreenshot(action);
    case 'scroll':
      return simulateScroll(action);
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

function simulateClick(action: DesktopAction) {
  const { coordinates, options } = action;
  
  return {
    type: 'click',
    status: 'completed',
    coordinates,
    button: options?.button || 'left',
    duration: Math.floor(Math.random() * 50) + 10, // 10-60ms
    timestamp: new Date().toISOString(),
    message: `Simulated ${options?.button || 'left'} click at (${coordinates?.x}, ${coordinates?.y})`
  };
}

function simulateType(action: DesktopAction) {
  const { text, options } = action;
  
  return {
    type: 'type',
    status: 'completed',
    text,
    characterCount: text?.length || 0,
    duration: (text?.length || 0) * 50 + Math.floor(Math.random() * 100), // ~50ms per character
    timestamp: new Date().toISOString(),
    message: `Simulated typing: "${text}"`
  };
}

function simulateKey(action: DesktopAction) {
  const { key, options } = action;
  
  return {
    type: 'key',
    status: 'completed',
    key,
    duration: Math.floor(Math.random() * 30) + 10, // 10-40ms
    timestamp: new Date().toISOString(),
    message: `Simulated key press: ${key}`
  };
}

function simulateScreenshot(action: DesktopAction) {
  // Generate a simple mock screenshot (1x1 pixel)
  const mockScreenshot = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  
  return {
    type: 'screenshot',
    status: 'completed',
    imageData: mockScreenshot,
    dimensions: { width: 1920, height: 1080 },
    duration: Math.floor(Math.random() * 200) + 100, // 100-300ms
    timestamp: new Date().toISOString(),
    message: "Simulated screenshot capture"
  };
}

function simulateScroll(action: DesktopAction) {
  const { coordinates, options } = action;
  
  return {
    type: 'scroll',
    status: 'completed',
    coordinates,
    direction: options?.duration ? (options.duration > 0 ? 'down' : 'up') : 'down',
    amount: Math.abs(options?.duration || 100),
    duration: Math.floor(Math.random() * 100) + 50, // 50-150ms
    timestamp: new Date().toISOString(),
    message: `Simulated scroll at (${coordinates?.x}, ${coordinates?.y})`
  };
}