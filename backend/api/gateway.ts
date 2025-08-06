import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Service URLs from environment variables
const VIRTUAL_DESKTOP_SERVICE_URL = Deno.env.get('VIRTUAL_DESKTOP_SERVICE_URL') || 'http://localhost:8000';
const WORKFLOW_ORCHESTRATOR_URL = Deno.env.get('WORKFLOW_ORCHESTRATOR_URL') || 'http://localhost:8001';
const DESKTOP_AUTOMATION_URL = Deno.env.get('DESKTOP_AUTOMATION_URL') || 'http://localhost:8002';
const OCR_PROCESSOR_URL = Deno.env.get('OCR_PROCESSOR_URL') || 'http://localhost:8003';

interface RouteConfig {
  path: string;
  method: string;
  serviceUrl: string;
  requiresAuth?: boolean;
  rateLimit?: number;
}

// Route configuration
const routes: RouteConfig[] = [
  // Virtual Desktop Service routes
  { path: '/api/v1/desktop/list', method: 'GET', serviceUrl: VIRTUAL_DESKTOP_SERVICE_URL },
  { path: '/api/v1/desktop/create', method: 'POST', serviceUrl: VIRTUAL_DESKTOP_SERVICE_URL },
  { path: '/api/v1/desktop/connect', method: 'GET', serviceUrl: VIRTUAL_DESKTOP_SERVICE_URL },
  { path: '/api/v1/workflow/start', method: 'POST', serviceUrl: VIRTUAL_DESKTOP_SERVICE_URL },
  { path: '/api/v1/workflow/status', method: 'GET', serviceUrl: VIRTUAL_DESKTOP_SERVICE_URL },
  
  // Workflow Orchestrator routes
  { path: '/api/v1/workflow/templates', method: 'GET', serviceUrl: WORKFLOW_ORCHESTRATOR_URL },
  { path: '/api/v1/workflow/execute', method: 'POST', serviceUrl: WORKFLOW_ORCHESTRATOR_URL },
  { path: '/api/v1/workflow/stop', method: 'POST', serviceUrl: WORKFLOW_ORCHESTRATOR_URL },
  { path: '/api/v1/workflow/history', method: 'GET', serviceUrl: WORKFLOW_ORCHESTRATOR_URL },
  
  // Desktop Automation routes
  { path: '/api/v1/automation/actions', method: 'POST', serviceUrl: DESKTOP_AUTOMATION_URL },
  { path: '/api/v1/automation/screenshot', method: 'POST', serviceUrl: DESKTOP_AUTOMATION_URL },
  { path: '/api/v1/automation/status', method: 'GET', serviceUrl: DESKTOP_AUTOMATION_URL },
  
  // OCR Processing routes
  { path: '/api/v1/ocr/process', method: 'POST', serviceUrl: OCR_PROCESSOR_URL },
  { path: '/api/v1/ocr/regions', method: 'POST', serviceUrl: OCR_PROCESSOR_URL },
];

// Rate limiting storage
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Service port configuration
const SERVICE_PORT = parseInt(Deno.env.get("SERVICE_PORT") || "8080");

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
      return await handleHealthCheck();
    }

    // API documentation endpoint
    if (path === '/api/docs') {
      return await handleApiDocs();
    }

    // Find matching route
    const route = routes.find(r => 
      path.startsWith(r.path) && r.method === method
    );

    if (!route) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Route not found',
        path,
        method,
        timestamp: new Date().toISOString()
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting check
    if (route.rateLimit) {
      const clientId = getClientId(req);
      if (!checkRateLimit(clientId, route.rateLimit)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Rate limit exceeded',
          timestamp: new Date().toISOString()
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Authentication check (if required)
    if (route.requiresAuth) {
      const authResult = await checkAuthentication(req);
      if (!authResult.valid) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Proxy request to appropriate service
    return await proxyRequest(req, route);

  } catch (error) {
    console.error('Gateway error:', error);
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

async function handleHealthCheck(): Promise<Response> {
  const services = [
    { name: 'Virtual Desktop Service', url: VIRTUAL_DESKTOP_SERVICE_URL },
    { name: 'Workflow Orchestrator', url: WORKFLOW_ORCHESTRATOR_URL },
    { name: 'Desktop Automation', url: DESKTOP_AUTOMATION_URL },
    { name: 'OCR Processor', url: OCR_PROCESSOR_URL },
  ];

  const healthChecks = await Promise.allSettled(
    services.map(async (service) => {
      try {
        const response = await fetch(`${service.url}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        return {
          name: service.name,
          status: response.ok ? 'healthy' : 'unhealthy',
          url: service.url
        };
      } catch (error) {
        return {
          name: service.name,
          status: 'unreachable',
          url: service.url,
          error: error.message
        };
      }
    })
  );

  const results = healthChecks.map(result => 
    result.status === 'fulfilled' ? result.value : {
      name: 'Unknown',
      status: 'error',
      error: result.reason
    }
  );

  const allHealthy = results.every(r => r.status === 'healthy');

  return new Response(JSON.stringify({
    success: true,
    status: allHealthy ? 'healthy' : 'degraded',
    services: results,
    timestamp: new Date().toISOString()
  }), {
    status: allHealthy ? 200 : 503,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleApiDocs(): Promise<Response> {
  const documentation = {
    title: 'Virtual Desktop Backend API',
    version: '1.0.0',
    description: 'API Gateway for Virtual Desktop Management System',
    baseUrl: '/api/v1',
    endpoints: {
      'Desktop Management': [
        'GET /desktop/list - List all virtual desktops',
        'POST /desktop/create - Create a new virtual desktop',
        'GET /desktop/connect - Connect to a virtual desktop via WebSocket',
      ],
      'Workflow Management': [
        'GET /workflow/templates - Get available workflow templates',
        'POST /workflow/execute - Execute a workflow on a virtual desktop',
        'POST /workflow/start - Start a workflow with custom actions',
        'GET /workflow/status - Get workflow execution status',
        'POST /workflow/stop - Stop a running workflow',
        'GET /workflow/history - Get workflow execution history',
      ],
      'Desktop Automation': [
        'POST /automation/actions - Execute automation actions',
        'POST /automation/screenshot - Take a screenshot',
        'GET /automation/status - Get automation service status',
      ],
      'OCR Processing': [
        'POST /ocr/process - Process image for text extraction',
        'POST /ocr/regions - Process specific regions for OCR',
      ]
    },
    services: routes.map(route => ({
      path: route.path,
      method: route.method,
      service: route.serviceUrl,
      requiresAuth: route.requiresAuth || false
    }))
  };

  return new Response(JSON.stringify(documentation, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function proxyRequest(req: Request, route: RouteConfig): Promise<Response> {
  const url = new URL(req.url);
  const targetPath = url.pathname.replace('/api/v1', '');
  const targetUrl = `${route.serviceUrl}${targetPath}${url.search}`;

  console.log(`Proxying ${req.method} ${url.pathname} -> ${targetUrl}`);

  try {
    // Prepare request headers
    const headers = new Headers();
    for (const [key, value] of req.headers.entries()) {
      if (!key.toLowerCase().startsWith('host')) {
        headers.set(key, value);
      }
    }

    // Prepare request body
    let body: BodyInit | null = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = await req.blob();
    }

    // Make request to target service
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    // Prepare response headers
    const responseHeaders = new Headers(corsHeaders);
    for (const [key, value] of response.headers.entries()) {
      if (!key.toLowerCase().startsWith('access-control-')) {
        responseHeaders.set(key, value);
      }
    }

    // Return proxied response
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });

  } catch (error) {
    console.error(`Proxy error for ${targetUrl}:`, error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Service unavailable',
      service: route.serviceUrl,
      timestamp: new Date().toISOString()
    }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

function getClientId(req: Request): string {
  // Extract client ID from IP address or headers
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  return ip;
}

function checkRateLimit(clientId: string, limit: number): boolean {
  const now = Date.now();
  const windowMs = 60000; // 1 minute window
  
  const clientData = rateLimitStore.get(clientId);
  
  if (!clientData || now > clientData.resetTime) {
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + windowMs
    });
    return true;
  }
  
  if (clientData.count >= limit) {
    return false;
  }
  
  clientData.count++;
  return true;
}

async function checkAuthentication(req: Request): Promise<{ valid: boolean; user?: any }> {
  // Implement authentication logic here
  // For now, just check for Authorization header
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false };
  }
  
  // In a real implementation, validate the token
  return { valid: true, user: { id: 'user123' } };
}

console.log(`API Gateway starting on port ${SERVICE_PORT}...`);
console.log('Available routes:');
routes.forEach(route => {
  console.log(`  ${route.method} ${route.path} -> ${route.serviceUrl}`);
});
console.log('Health check available at: /health');
console.log('API documentation available at: /api/docs');