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

interface VirtualDesktop {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'analyzing' | 'error';
  workflowId?: string;
  programPath?: string;
  lastActivity: string;
  metadata: {
    resolution: { width: number; height: number };
    os: string;
    capabilities: string[];
  };
}

interface WorkflowAction {
  id: string;
  type: 'launch_program' | 'analyze_screen' | 'click' | 'type' | 'wait' | 'screenshot';
  parameters: Record<string, any>;
  timeout: number;
  retries: number;
}

interface WorkflowRequest {
  desktopId: string;
  workflowId: string;
  programPath: string;
  actions: WorkflowAction[];
  analysisConfig?: {
    regions: Array<{
      name: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
    ocrEnabled: boolean;
    screenshotInterval: number;
  };
}

// Store active virtual desktops and their connections
const activeDesktops = new Map<string, VirtualDesktop>();
const desktopConnections = new Map<string, WebSocket>();

// Service configuration
const SERVICE_PORT = parseInt(Deno.env.get('SERVICE_PORT') || '8000');

// Service will be started at the end of the file

async function handleHealthCheck(req: Request): Promise<Response> {
  return new Response(JSON.stringify({
    status: 'healthy',
    service: 'virtual-desktop-service',
    timestamp: new Date().toISOString(),
    activeDesktops: activeDesktops.size,
    connections: desktopConnections.size
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleWorkflowStart(req: Request): Promise<Response> {
  const workflowRequest: WorkflowRequest = await req.json();
  
  console.log(`Starting workflow ${workflowRequest.workflowId} on desktop ${workflowRequest.desktopId}`);
  
  // Get or create virtual desktop
  let desktop = activeDesktops.get(workflowRequest.desktopId);
  if (!desktop) {
    desktop = await createVirtualDesktop(workflowRequest.desktopId);
  }
  
  // Update desktop status
  desktop.status = 'running';
  desktop.workflowId = workflowRequest.workflowId;
  desktop.programPath = workflowRequest.programPath;
  desktop.lastActivity = new Date().toISOString();
  
  // Execute workflow
  const workflowResult = await executeWorkflow(desktop, workflowRequest);
  
  // Store workflow execution in database
  await supabase.from('workflow_executions').insert({
    id: crypto.randomUUID(),
    desktop_id: workflowRequest.desktopId,
    workflow_id: workflowRequest.workflowId,
    program_path: workflowRequest.programPath,
    status: workflowResult.success ? 'completed' : 'failed',
    result: workflowResult,
    created_at: new Date().toISOString()
  });
  
  return new Response(JSON.stringify({
    success: true,
    workflowId: workflowRequest.workflowId,
    desktopId: workflowRequest.desktopId,
    result: workflowResult,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleWorkflowStatus(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const workflowId = url.searchParams.get('workflowId');
  const desktopId = url.searchParams.get('desktopId');
  
  if (!workflowId || !desktopId) {
    return new Response('Missing workflowId or desktopId', { status: 400 });
  }
  
  const desktop = activeDesktops.get(desktopId);
  
  return new Response(JSON.stringify({
    success: true,
    workflowId,
    desktopId,
    status: desktop?.status || 'not_found',
    lastActivity: desktop?.lastActivity,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleDesktopList(req: Request): Promise<Response> {
  const desktops = Array.from(activeDesktops.values());
  
  return new Response(JSON.stringify({
    success: true,
    desktops,
    count: desktops.length,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleDesktopConnect(req: Request): Promise<Response> {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  const url = new URL(req.url);
  const desktopId = url.searchParams.get('desktopId') || crypto.randomUUID();
  
  desktopConnections.set(desktopId, socket);
  
  socket.onopen = () => {
    console.log(`Desktop ${desktopId} connected via WebSocket`);
    socket.send(JSON.stringify({
      type: 'connection_established',
      desktopId,
      timestamp: new Date().toISOString()
    }));
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      await handleDesktopMessage(desktopId, message);
    } catch (error) {
      console.error(`Error processing desktop message: ${error}`);
    }
  };

  socket.onclose = () => {
    console.log(`Desktop ${desktopId} disconnected`);
    desktopConnections.delete(desktopId);
    const desktop = activeDesktops.get(desktopId);
    if (desktop) {
      desktop.status = 'idle';
    }
  };

  return response;
}

async function handleDesktopCreate(req: Request): Promise<Response> {
  const { name, metadata } = await req.json();
  
  const desktop = await createVirtualDesktop(crypto.randomUUID(), name, metadata);
  
  return new Response(JSON.stringify({
    success: true,
    desktop,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function createVirtualDesktop(id: string, name?: string, metadata?: any): Promise<VirtualDesktop> {
  const desktop: VirtualDesktop = {
    id,
    name: name || `Desktop-${id.slice(0, 8)}`,
    status: 'idle',
    lastActivity: new Date().toISOString(),
    metadata: metadata || {
      resolution: { width: 1920, height: 1080 },
      os: 'windows',
      capabilities: ['screenshot', 'automation', 'ocr']
    }
  };
  
  activeDesktops.set(id, desktop);
  
  // Store in database
  await supabase.from('virtual_desktops').insert({
    id: desktop.id,
    name: desktop.name,
    status: desktop.status,
    metadata: desktop.metadata,
    created_at: new Date().toISOString()
  });
  
  return desktop;
}

async function executeWorkflow(desktop: VirtualDesktop, workflow: WorkflowRequest) {
  console.log(`Executing workflow for desktop ${desktop.id}`);
  
  const results = [];
  
  try {
    // Step 1: Launch the program
    const launchResult = await launchProgram(desktop, workflow.programPath);
    results.push(launchResult);
    
    if (!launchResult.success) {
      throw new Error(`Failed to launch program: ${launchResult.error}`);
    }
    
    // Step 2: Wait for program to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 3: Take initial screenshot for analysis
    const screenshotResult = await takeScreenshot(desktop);
    results.push(screenshotResult);
    
    // Step 4: Execute workflow actions
    for (const action of workflow.actions) {
      const actionResult = await executeAction(desktop, action);
      results.push(actionResult);
      
      // Wait between actions
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Step 5: Perform analysis if configured
    if (workflow.analysisConfig) {
      const analysisResult = await performAnalysis(desktop, workflow.analysisConfig);
      results.push(analysisResult);
    }
    
    desktop.status = 'idle';
    
    return {
      success: true,
      results,
      executionTime: Date.now(),
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    desktop.status = 'error';
    return {
      success: false,
      error: error.message,
      results,
      timestamp: new Date().toISOString()
    };
  }
}

async function launchProgram(desktop: VirtualDesktop, programPath: string) {
  console.log(`Launching program: ${programPath} on desktop ${desktop.id}`);
  
  const connection = desktopConnections.get(desktop.id);
  if (!connection) {
    return { success: false, error: 'Desktop not connected' };
  }
  
  // Send launch command to desktop client
  connection.send(JSON.stringify({
    type: 'launch_program',
    programPath,
    timestamp: new Date().toISOString()
  }));
  
  // Simulate program launch (in real implementation, wait for confirmation)
  return {
    success: true,
    programPath,
    message: `Program launched: ${programPath}`,
    timestamp: new Date().toISOString()
  };
}

async function takeScreenshot(desktop: VirtualDesktop) {
  console.log(`Taking screenshot of desktop ${desktop.id}`);
  
  const connection = desktopConnections.get(desktop.id);
  if (!connection) {
    return { success: false, error: 'Desktop not connected' };
  }
  
  // Send screenshot command
  connection.send(JSON.stringify({
    type: 'take_screenshot',
    timestamp: new Date().toISOString()
  }));
  
  // Mock screenshot data
  return {
    success: true,
    imageData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    dimensions: desktop.metadata.resolution,
    timestamp: new Date().toISOString()
  };
}

async function executeAction(desktop: VirtualDesktop, action: WorkflowAction) {
  console.log(`Executing action ${action.type} on desktop ${desktop.id}`);
  
  const connection = desktopConnections.get(desktop.id);
  if (!connection) {
    return { success: false, error: 'Desktop not connected' };
  }
  
  // Send action to desktop client
  connection.send(JSON.stringify({
    type: 'execute_action',
    action,
    timestamp: new Date().toISOString()
  }));
  
  // Simulate action execution
  return {
    success: true,
    actionId: action.id,
    actionType: action.type,
    result: `Action ${action.type} executed successfully`,
    timestamp: new Date().toISOString()
  };
}

async function performAnalysis(desktop: VirtualDesktop, config: any) {
  console.log(`Performing analysis on desktop ${desktop.id}`);
  
  desktop.status = 'analyzing';
  
  // Simulate analysis
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    success: true,
    analysisType: 'screen_analysis',
    regions: config.regions,
    ocrResults: config.ocrEnabled ? ['Sample OCR text detected'] : [],
    insights: ['Program successfully launched', 'UI elements detected'],
    timestamp: new Date().toISOString()
  };
}

async function handleDesktopMessage(desktopId: string, message: any) {
  console.log(`Desktop ${desktopId} message:`, message.type);
  
  const desktop = activeDesktops.get(desktopId);
  if (desktop) {
    desktop.lastActivity = new Date().toISOString();
  }
  
  // Handle different message types from desktop client
  switch (message.type) {
    case 'status_update':
      if (desktop) {
        desktop.status = message.status;
      }
      break;
    case 'screenshot_data':
      // Process screenshot data
      break;
    case 'action_result':
      // Process action execution result
      break;
    default:
      console.log(`Unknown message type: ${message.type}`);
  }
}

console.log(`Virtual Desktop Service starting on port ${SERVICE_PORT}...`);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  try {
    // Health check endpoint
    if (path === '/health') {
      return await handleHealthCheck(req);
    }

    // Desktop management endpoints
    if (path === '/desktop/list' && method === 'GET') {
      return await handleDesktopList(req);
    }

    if (path === '/desktop/create' && method === 'POST') {
      return await handleCreateDesktop(req);
    }

    if (path === '/desktop/connect' && method === 'GET') {
      return await handleConnectDesktop(req);
    }

    if (path === '/workflow/start' && method === 'POST') {
      return await handleStartWorkflow(req);
    }

    if (path === '/workflow/status' && method === 'GET') {
      return await handleWorkflowStatus(req);
    }

    // Default 404 response
    return new Response(JSON.stringify({
      success: false,
      error: 'Endpoint not found',
      path,
      method,
      timestamp: new Date().toISOString()
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Virtual desktop service error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}, { port: SERVICE_PORT });