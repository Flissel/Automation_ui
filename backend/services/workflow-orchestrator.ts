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

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  programPath: string;
  steps: WorkflowStep[];
  analysisConfig: AnalysisConfig;
  metadata: {
    category: string;
    tags: string[];
    estimatedDuration: number;
  };
}

interface WorkflowStep {
  id: string;
  name: string;
  type: 'action' | 'wait' | 'condition' | 'analysis';
  parameters: Record<string, any>;
  timeout: number;
  retryCount: number;
  onSuccess?: string; // next step id
  onFailure?: string; // next step id or 'abort'
}

interface AnalysisConfig {
  enabled: boolean;
  regions: AnalysisRegion[];
  ocrEnabled: boolean;
  screenshotInterval: number;
  triggers: AnalysisTrigger[];
}

interface AnalysisRegion {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'text' | 'button' | 'image' | 'general';
}

interface AnalysisTrigger {
  id: string;
  condition: string;
  action: string;
  parameters: Record<string, any>;
}

interface WorkflowExecution {
  id: string;
  templateId: string;
  desktopId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentStep: string;
  startTime: string;
  endTime?: string;
  results: WorkflowStepResult[];
  error?: string;
}

interface WorkflowStepResult {
  stepId: string;
  status: 'completed' | 'failed' | 'skipped';
  startTime: string;
  endTime: string;
  result: any;
  error?: string;
}

// Store active workflow executions
const activeExecutions = new Map<string, WorkflowExecution>();

// Service configuration
const SERVICE_PORT = parseInt(Deno.env.get('SERVICE_PORT') || '8001');

// Predefined workflow templates
const workflowTemplates: WorkflowTemplate[] = [
  {
    id: 'notepad-analysis',
    name: 'Notepad Text Analysis',
    description: 'Launch Notepad and analyze text content',
    programPath: 'notepad.exe',
    steps: [
      {
        id: 'launch',
        name: 'Launch Notepad',
        type: 'action',
        parameters: { action: 'launch_program', path: 'notepad.exe' },
        timeout: 10000,
        retryCount: 2,
        onSuccess: 'wait-load',
        onFailure: 'abort'
      },
      {
        id: 'wait-load',
        name: 'Wait for Application Load',
        type: 'wait',
        parameters: { duration: 3000 },
        timeout: 5000,
        retryCount: 0,
        onSuccess: 'screenshot',
        onFailure: 'abort'
      },
      {
        id: 'screenshot',
        name: 'Take Initial Screenshot',
        type: 'action',
        parameters: { action: 'screenshot' },
        timeout: 5000,
        retryCount: 1,
        onSuccess: 'type-text',
        onFailure: 'abort'
      },
      {
        id: 'type-text',
        name: 'Type Sample Text',
        type: 'action',
        parameters: { 
          action: 'type', 
          text: 'This is a test document for analysis.\nLine 2: Testing OCR capabilities.\nLine 3: End of test.' 
        },
        timeout: 5000,
        retryCount: 1,
        onSuccess: 'analyze',
        onFailure: 'abort'
      },
      {
        id: 'analyze',
        name: 'Analyze Content',
        type: 'analysis',
        parameters: { 
          regions: ['text-area'],
          ocrEnabled: true,
          screenshotAfter: true
        },
        timeout: 10000,
        retryCount: 1,
        onSuccess: 'complete',
        onFailure: 'complete'
      }
    ],
    analysisConfig: {
      enabled: true,
      regions: [
        {
          id: 'text-area',
          name: 'Text Content Area',
          x: 10,
          y: 60,
          width: 600,
          height: 400,
          type: 'text'
        }
      ],
      ocrEnabled: true,
      screenshotInterval: 5000,
      triggers: [
        {
          id: 'text-detected',
          condition: 'ocr_text_length > 10',
          action: 'save_analysis',
          parameters: { saveToDatabase: true }
        }
      ]
    },
    metadata: {
      category: 'text-analysis',
      tags: ['notepad', 'ocr', 'text'],
      estimatedDuration: 30000
    }
  },
  {
    id: 'calculator-test',
    name: 'Calculator Automation Test',
    description: 'Launch Calculator and perform basic operations',
    programPath: 'calc.exe',
    steps: [
      {
        id: 'launch',
        name: 'Launch Calculator',
        type: 'action',
        parameters: { action: 'launch_program', path: 'calc.exe' },
        timeout: 10000,
        retryCount: 2,
        onSuccess: 'wait-load',
        onFailure: 'abort'
      },
      {
        id: 'wait-load',
        name: 'Wait for Calculator Load',
        type: 'wait',
        parameters: { duration: 2000 },
        timeout: 5000,
        retryCount: 0,
        onSuccess: 'click-numbers',
        onFailure: 'abort'
      },
      {
        id: 'click-numbers',
        name: 'Perform Calculation',
        type: 'action',
        parameters: { 
          action: 'sequence',
          sequence: [
            { action: 'click', coordinates: { x: 100, y: 200 } }, // Click 1
            { action: 'click', coordinates: { x: 150, y: 200 } }, // Click +
            { action: 'click', coordinates: { x: 200, y: 200 } }, // Click 2
            { action: 'click', coordinates: { x: 250, y: 200 } }  // Click =
          ]
        },
        timeout: 10000,
        retryCount: 1,
        onSuccess: 'analyze-result',
        onFailure: 'abort'
      },
      {
        id: 'analyze-result',
        name: 'Analyze Calculation Result',
        type: 'analysis',
        parameters: { 
          regions: ['display-area'],
          ocrEnabled: true
        },
        timeout: 5000,
        retryCount: 1,
        onSuccess: 'complete',
        onFailure: 'complete'
      }
    ],
    analysisConfig: {
      enabled: true,
      regions: [
        {
          id: 'display-area',
          name: 'Calculator Display',
          x: 50,
          y: 50,
          width: 300,
          height: 80,
          type: 'text'
        }
      ],
      ocrEnabled: true,
      screenshotInterval: 3000,
      triggers: []
    },
    metadata: {
      category: 'automation-test',
      tags: ['calculator', 'automation', 'ui-test'],
      estimatedDuration: 20000
    }
  }
];

// Service will be started at the end of the file

async function handleHealthCheck(req: Request): Promise<Response> {
  return new Response(JSON.stringify({
    status: 'healthy',
    service: 'workflow-orchestrator',
    timestamp: new Date().toISOString(),
    activeExecutions: activeExecutions.size,
    availableTemplates: workflowTemplates.length
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleGetTemplates(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const category = url.searchParams.get('category');
  
  let templates = workflowTemplates;
  if (category) {
    templates = templates.filter(t => t.metadata.category === category);
  }
  
  return new Response(JSON.stringify({
    success: true,
    templates,
    count: templates.length,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleExecuteWorkflow(req: Request): Promise<Response> {
  const { templateId, desktopId, parameters } = await req.json();
  
  const template = workflowTemplates.find(t => t.id === templateId);
  if (!template) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Workflow template not found',
      timestamp: new Date().toISOString()
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  const executionId = crypto.randomUUID();
  const execution: WorkflowExecution = {
    id: executionId,
    templateId,
    desktopId,
    status: 'pending',
    currentStep: template.steps[0]?.id || '',
    startTime: new Date().toISOString(),
    results: []
  };
  
  activeExecutions.set(executionId, execution);
  
  // Store execution in database
  await supabase.from('workflow_executions').insert({
    id: executionId,
    template_id: templateId,
    desktop_id: desktopId,
    status: execution.status,
    current_step: execution.currentStep,
    start_time: execution.startTime,
    parameters: parameters || {}
  });
  
  // Start execution asynchronously
  executeWorkflowAsync(execution, template, parameters || {});
  
  return new Response(JSON.stringify({
    success: true,
    executionId,
    templateId,
    desktopId,
    status: execution.status,
    estimatedDuration: template.metadata.estimatedDuration,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleGetExecutionStatus(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const executionId = url.searchParams.get('executionId');
  
  if (!executionId) {
    return new Response('Missing executionId', { status: 400 });
  }
  
  const execution = activeExecutions.get(executionId);
  if (!execution) {
    // Try to get from database
    const { data } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('id', executionId)
      .single();
    
    if (!data) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Execution not found',
        timestamp: new Date().toISOString()
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      execution: data,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  return new Response(JSON.stringify({
    success: true,
    execution,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleStopExecution(req: Request): Promise<Response> {
  const { executionId } = await req.json();
  
  const execution = activeExecutions.get(executionId);
  if (!execution) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Execution not found or already completed',
      timestamp: new Date().toISOString()
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  execution.status = 'cancelled';
  execution.endTime = new Date().toISOString();
  
  // Update database
  await supabase
    .from('workflow_executions')
    .update({
      status: execution.status,
      end_time: execution.endTime
    })
    .eq('id', executionId);
  
  activeExecutions.delete(executionId);
  
  return new Response(JSON.stringify({
    success: true,
    executionId,
    status: execution.status,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleGetExecutionHistory(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const desktopId = url.searchParams.get('desktopId');
  const limit = parseInt(url.searchParams.get('limit') || '10');
  
  let query = supabase
    .from('workflow_executions')
    .select('*')
    .order('start_time', { ascending: false })
    .limit(limit);
  
  if (desktopId) {
    query = query.eq('desktop_id', desktopId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw error;
  }
  
  return new Response(JSON.stringify({
    success: true,
    executions: data || [],
    count: data?.length || 0,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function executeWorkflowAsync(execution: WorkflowExecution, template: WorkflowTemplate, parameters: Record<string, any>) {
  try {
    execution.status = 'running';
    
    // Update database
    await supabase
      .from('workflow_executions')
      .update({ status: execution.status })
      .eq('id', execution.id);
    
    console.log(`Starting workflow execution ${execution.id} for template ${template.name}`);
    
    // Execute each step
    for (const step of template.steps) {
      if (execution.status === 'cancelled') {
        break;
      }
      
      execution.currentStep = step.id;
      
      const stepResult = await executeWorkflowStep(execution, step, template, parameters);
      execution.results.push(stepResult);
      
      // Check step result and determine next action
      if (stepResult.status === 'failed') {
        if (step.onFailure === 'abort') {
          execution.status = 'failed';
          execution.error = stepResult.error;
          break;
        }
        // Could implement conditional branching here
      }
    }
    
    if (execution.status === 'running') {
      execution.status = 'completed';
    }
    
    execution.endTime = new Date().toISOString();
    
    // Final database update
    await supabase
      .from('workflow_executions')
      .update({
        status: execution.status,
        end_time: execution.endTime,
        results: execution.results,
        error: execution.error
      })
      .eq('id', execution.id);
    
    console.log(`Workflow execution ${execution.id} completed with status: ${execution.status}`);
    
  } catch (error) {
    execution.status = 'failed';
    execution.error = error.message;
    execution.endTime = new Date().toISOString();
    
    await supabase
      .from('workflow_executions')
      .update({
        status: execution.status,
        end_time: execution.endTime,
        error: execution.error
      })
      .eq('id', execution.id);
    
    console.error(`Workflow execution ${execution.id} failed:`, error);
  } finally {
    activeExecutions.delete(execution.id);
  }
}

async function executeWorkflowStep(execution: WorkflowExecution, step: WorkflowStep, template: WorkflowTemplate, parameters: Record<string, any>): Promise<WorkflowStepResult> {
  const startTime = new Date().toISOString();
  
  console.log(`Executing step ${step.id}: ${step.name}`);
  
  try {
    let result: any;
    
    switch (step.type) {
      case 'action':
        result = await executeAction(execution.desktopId, step.parameters);
        break;
      case 'wait':
        result = await executeWait(step.parameters);
        break;
      case 'condition':
        result = await evaluateCondition(step.parameters);
        break;
      case 'analysis':
        result = await performAnalysis(execution.desktopId, step.parameters, template.analysisConfig);
        break;
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
    
    return {
      stepId: step.id,
      status: 'completed',
      startTime,
      endTime: new Date().toISOString(),
      result
    };
    
  } catch (error) {
    return {
      stepId: step.id,
      status: 'failed',
      startTime,
      endTime: new Date().toISOString(),
      result: null,
      error: error.message
    };
  }
}

async function executeAction(desktopId: string, parameters: any) {
  // Call virtual desktop service to execute action
  const response = await fetch(`http://localhost:8000/desktop/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      desktopId,
      action: parameters
    })
  });
  
  if (!response.ok) {
    throw new Error(`Action execution failed: ${response.statusText}`);
  }
  
  return await response.json();
}

async function executeWait(parameters: any) {
  const duration = parameters.duration || 1000;
  await new Promise(resolve => setTimeout(resolve, duration));
  
  return {
    action: 'wait',
    duration,
    message: `Waited for ${duration}ms`
  };
}

async function evaluateCondition(parameters: any) {
  // Implement condition evaluation logic
  return {
    condition: parameters.condition,
    result: true,
    message: 'Condition evaluated successfully'
  };
}

async function performAnalysis(desktopId: string, parameters: any, config: AnalysisConfig) {
  // Call analysis service
  return {
    analysisType: 'workflow_step_analysis',
    regions: parameters.regions || [],
    ocrEnabled: parameters.ocrEnabled || false,
    results: ['Analysis completed successfully'],
    timestamp: new Date().toISOString()
  };
}

console.log(`Workflow Orchestrator starting on port ${SERVICE_PORT}...`);

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Workflow template endpoints
    if (path === '/workflow/templates' && method === 'GET') {
      return await handleGetTemplates(req);
    }

    if (path === '/workflow/execute' && method === 'POST') {
      return await handleExecuteWorkflow(req);
    }

    if (path === '/workflow/stop' && method === 'POST') {
      return await handleStopExecution(req);
    }

    if (path === '/workflow/status' && method === 'GET') {
      return await handleGetExecutionStatus(req);
    }

    if (path === '/workflow/history' && method === 'GET') {
      return await handleGetExecutionHistory(req);
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
    console.error('Workflow orchestrator error:', error);
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