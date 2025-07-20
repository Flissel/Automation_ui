/**
 * WorkflowIntegrationService - Bridges Live Desktop Canvas with V3 API Workflow System
 * 
 * This service implements the user's vision of "record → click → execute → save → wait → next"
 * workflow pattern by converting Live Desktop Canvas interactions into executable V3 API workflows.
 */

import { v4 as uuidv4 } from 'uuid';
import { errorHandlingService } from './ErrorHandlingService';
import { loadingStateService } from './LoadingStateService';

// Types for workflow integration
export interface RecordedAction {
  id: string;
  type: 'click' | 'ocr_region' | 'screenshot';
  timestamp: number;
  data: any;
  metadata?: {
    description?: string;
    tags?: string[];
  };
}

export interface ClickAction extends RecordedAction {
  type: 'click';
  data: {
    x: number;
    y: number;
    button?: 'left' | 'right' | 'middle';
  };
}

export interface OCRRegionAction extends RecordedAction {
  type: 'ocr_region';
  data: {
    x: number;
    y: number;
    width: number;
    height: number;
    expectedText?: string;
  };
}

export interface ScreenshotAction extends RecordedAction {
  type: 'screenshot';
  data: {
    region?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
}

export interface WorkflowStep {
  id: string;
  nodeType: string;
  config: any;
  inputs: Record<string, any>;
  outputs?: Record<string, any>;
  nextSteps?: string[];
  condition?: {
    type: 'always' | 'conditional';
    operator?: string;
    value?: any;
  };
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  connections: Array<{
    source: { nodeId: string; portId: string };
    target: { nodeId: string; portId: string };
  }>;
  metadata: {
    created: number;
    lastModified: number;
    version: string;
    tags: string[];
  };
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  startTime: number;
  endTime?: number;
  currentStep?: string;
  results: Record<string, any>;
  error?: string;
}

export class WorkflowIntegrationService {
  private baseUrl = 'http://localhost:8000/api/v3';
  private recordedActions: RecordedAction[] = [];
  private activeWorkflows: Map<string, WorkflowExecution> = new Map();
  private workflowTemplates: Map<string, AutomationWorkflow> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  // ================================
  // RECORDING ACTIONS FROM LIVE DESKTOP CANVAS
  // ================================

  /**
   * Record a click action from the Live Desktop Canvas
   */
  recordClickAction(x: number, y: number, button: 'left' | 'right' | 'middle' = 'left', metadata?: any): ClickAction {
    const action: ClickAction = {
      id: uuidv4(),
      type: 'click',
      timestamp: Date.now(),
      data: { x, y, button },
      metadata: {
        description: `Click at (${x}, ${y})`,
        tags: ['click', 'interaction'],
        ...metadata
      }
    };

    this.recordedActions.push(action);
    console.log('🎯 Recorded click action:', action);
    return action;
  }

  /**
   * Record an OCR region action from the Live Desktop Canvas
   */
  recordOCRRegion(x: number, y: number, width: number, height: number, expectedText?: string, metadata?: any): OCRRegionAction {
    const action: OCRRegionAction = {
      id: uuidv4(),
      type: 'ocr_region',
      timestamp: Date.now(),
      data: { x, y, width, height, expectedText },
      metadata: {
        description: `OCR region (${x}, ${y}) ${width}x${height}`,
        tags: ['ocr', 'text-extraction'],
        ...metadata
      }
    };

    this.recordedActions.push(action);
    console.log('🔤 Recorded OCR region:', action);
    return action;
  }

  /**
   * Record a screenshot action from the Live Desktop Canvas
   */
  recordScreenshot(region?: { x: number; y: number; width: number; height: number }, metadata?: any): ScreenshotAction {
    const action: ScreenshotAction = {
      id: uuidv4(),
      type: 'screenshot',
      timestamp: Date.now(),
      data: { region },
      metadata: {
        description: region ? `Screenshot region (${region.x}, ${region.y}) ${region.width}x${region.height}` : 'Full screenshot',
        tags: ['screenshot', 'capture'],
        ...metadata
      }
    };

    this.recordedActions.push(action);
    console.log('📸 Recorded screenshot action:', action);
    return action;
  }

  // ================================
  // WORKFLOW BUILDING FROM RECORDED ACTIONS
  // ================================

  /**
   * Convert recorded actions into a V3 API compatible workflow
   * Implements the "record → click → execute → save → wait → next" pattern
   */
  buildWorkflowFromRecordedActions(name: string, description: string = ''): AutomationWorkflow {
    const workflowId = uuidv4();
    const steps: WorkflowStep[] = [];
    const connections: any[] = [];

    // Add manual trigger as the starting point
    const triggerStep: WorkflowStep = {
      id: 'trigger_start',
      nodeType: 'manual_trigger',
      config: {
        trigger_message: `Start automation: ${name}`
      },
      inputs: {},
      nextSteps: []
    };
    steps.push(triggerStep);

    let previousStepId = 'trigger_start';

    // Convert each recorded action into workflow steps
    this.recordedActions.forEach((action, index) => {
      let currentStep: WorkflowStep;

      switch (action.type) {
        case 'click':
          const clickAction = action as ClickAction;
          currentStep = {
            id: `click_${index}`,
            nodeType: 'click_action',
            config: {
              click_type: clickAction.data.button || 'left',
              wait_after_click: 500 // Default 500ms wait
            },
            inputs: {
              coordinates_input: {
                x: clickAction.data.x,
                y: clickAction.data.y
              }
            }
          };
          break;

        case 'ocr_region':
          const ocrAction = action as OCRRegionAction;
          currentStep = {
            id: `ocr_${index}`,
            nodeType: 'ocr_region',
            config: {
              language: 'eng',
              confidence_threshold: 60,
              preprocessing: ['enhance_contrast']
            },
            inputs: {
              region_input: {
                x: ocrAction.data.x,
                y: ocrAction.data.y,
                width: ocrAction.data.width,
                height: ocrAction.data.height
              }
            }
          };
          break;

        case 'screenshot':
          const screenshotAction = action as ScreenshotAction;
          currentStep = {
            id: `screenshot_${index}`,
            nodeType: 'screenshot_action',
            config: {
              image_format: 'png',
              quality: 90
            },
            inputs: screenshotAction.data.region ? {
              region_input: screenshotAction.data.region
            } : {}
          };
          break;

        default:
          return; // Skip unknown action types
      }

      steps.push(currentStep);

      // Create connection from previous step to current step
      if (previousStepId) {
        connections.push({
          source: { 
            nodeId: previousStepId, 
            portId: previousStepId === 'trigger_start' ? 'trigger_output' : 'next_trigger' 
          },
          target: { 
            nodeId: currentStep.id, 
            portId: action.type === 'click' ? 'trigger_input' : 'trigger_input' 
          }
        });
      }

      previousStepId = currentStep.id;
    });

    // Add a final display output step to show results
    if (steps.length > 1) {
      const displayStep: WorkflowStep = {
        id: 'display_results',
        nodeType: 'display_output',
        config: {
          format: 'pretty_json',
          title: `Results: ${name}`
        },
        inputs: {}
      };
      steps.push(displayStep);

      // Connect the last action step to the display step
      if (previousStepId !== 'trigger_start') {
        connections.push({
          source: { nodeId: previousStepId, portId: 'next_trigger' },
          target: { nodeId: 'display_results', portId: 'data_input' }
        });
      }
    }

    const workflow: AutomationWorkflow = {
      id: workflowId,
      name,
      description: description || `Automation workflow with ${this.recordedActions.length} recorded actions`,
      steps,
      connections,
      metadata: {
        created: Date.now(),
        lastModified: Date.now(),
        version: '1.0.0',
        tags: ['live-desktop', 'automation', 'recorded']
      }
    };

    console.log('🏗️ Built workflow from recorded actions:', workflow);
    return workflow;
  }

  // ================================
  // WORKFLOW EXECUTION VIA V3 API
  // ================================

  /**
   * Execute a workflow using the V3 API
   * Implements the complete "record → click → execute → save → wait → next" cycle
   */
  async executeWorkflow(workflow: AutomationWorkflow): Promise<WorkflowExecution> {
    const result = await errorHandlingService.withErrorHandling(
      async () => {
        return await loadingStateService.withLoading(
          `workflow-execution-${workflow.id}`,
          `Executing workflow: ${workflow.name}`,
          async () => {
            const executionId = uuidv4();
            
            const execution: WorkflowExecution = {
              id: executionId,
              workflowId: workflow.id,
              status: 'pending',
              startTime: Date.now(),
              results: {}
            };

            this.activeWorkflows.set(executionId, execution);

            console.log('🚀 Starting workflow execution:', workflow.name);
            execution.status = 'running';

            // Convert workflow to V3 API format
            const v3Workflow = {
              workflow_id: workflow.id,
              nodes: workflow.steps.map(step => ({
                id: step.id,
                type: step.nodeType,
                config: step.config,
                inputs: step.inputs
              })),
              connections: workflow.connections,
              config: {
                execution_type: 'sequential',
                timeout_ms: 30000,
                retry_count: 1
              },
              initial_context: {
                workflow_name: workflow.name,
                execution_id: executionId
              }
            };

            // Execute via V3 API
            const response = await fetch(`${this.baseUrl}/execute-workflow`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(v3Workflow)
            });

            if (!response.ok) {
              throw new Error(`Workflow execution failed: ${response.statusText}`);
            }

            const result = await response.json();
            
            execution.status = result.success ? 'completed' : 'failed';
            execution.endTime = Date.now();
            execution.results = result.result || {};
            execution.error = result.error;

            console.log('✅ Workflow execution completed:', execution);
            this.activeWorkflows.set(executionId, execution);
            return execution;
          }
        );
      },
      {
        category: 'EXECUTION',
        severity: 'HIGH',
        operation: 'workflow_execution',
        context: { workflowId: workflow.id, workflowName: workflow.name },
        userMessage: `Failed to execute workflow "${workflow.name}". Please check the workflow configuration and try again.`,
        recoveryActions: [
          {
            label: 'Retry Execution',
            action: () => this.executeWorkflow(workflow)
          }
        ]
      }
    );

    if (result.error || !result.data) {
      // Create a failed execution object to return
      const failedExecution: WorkflowExecution = {
        id: uuidv4(),
        workflowId: workflow.id,
        status: 'failed',
        startTime: Date.now(),
        endTime: Date.now(),
        results: {},
        error: result.error?.message || 'Unknown error occurred'
      };
      return failedExecution;
    }

    return result.data;
  }

  /**
   * Execute a single node using the V3 API
   */
  async executeSingleNode(nodeType: string, config: any, inputs: any): Promise<any> {
    const result = await errorHandlingService.withErrorHandling(
      async () => {
        return await loadingStateService.withLoading(
          `node-execution-${nodeType}`,
          `Executing ${nodeType} node`,
          async () => {
            const nodeExecution = {
              node_id: uuidv4(),
              node_type: nodeType,
              inputs,
              config,
              execution_id: uuidv4()
            };

            const response = await fetch(`${this.baseUrl}/execute-node`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(nodeExecution)
            });

            if (!response.ok) {
              throw new Error(`Node execution failed: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('🔧 Single node execution result:', result);
            return result;
          }
        );
      },
      {
        category: 'EXECUTION',
        severity: 'MEDIUM',
        operation: 'node_execution',
        context: { nodeType, config, inputs },
        userMessage: `Failed to execute ${nodeType} node. Please check the node configuration and try again.`,
        recoveryActions: [
          {
            label: 'Retry Node Execution',
            action: () => this.executeSingleNode(nodeType, config, inputs)
          }
        ]
      }
    );

    if (result.error || !result.data) {
      throw new Error(result.error?.message || 'Node execution failed');
    }

    return result.data;
  }

  // ================================
  // WORKFLOW MANAGEMENT
  // ================================

  /**
   * Get available node templates from V3 API
   */
  async getNodeTemplates(): Promise<any> {
    const result = await errorHandlingService.withErrorHandling(
      async () => {
        return await loadingStateService.withLoading(
          'fetch-node-templates',
          'Loading node templates',
          async () => {
            const response = await fetch(`${this.baseUrl}/node-templates`);
            if (!response.ok) {
              throw new Error(`Failed to fetch node templates: ${response.statusText}`);
            }
            return await response.json();
          }
        );
      },
      {
        category: 'NETWORK',
        severity: 'MEDIUM',
        operation: 'fetch_node_templates',
        context: { baseUrl: this.baseUrl },
        userMessage: 'Failed to load node templates. Please check your connection and try again.',
        recoveryActions: [
          {
            label: 'Retry Loading Templates',
            action: () => this.getNodeTemplates()
          }
        ]
      }
    );

    if (result.error || !result.data) {
      throw new Error(result.error?.message || 'Failed to fetch node templates');
    }

    return result.data;
  }

  /**
   * Clear recorded actions
   */
  clearRecordedActions(): void {
    this.recordedActions = [];
    console.log('🗑️ Cleared recorded actions');
  }

  /**
   * Get current recorded actions
   */
  getRecordedActions(): RecordedAction[] {
    return [...this.recordedActions];
  }

  /**
   * Get workflow execution status
   */
  getWorkflowExecution(executionId: string): WorkflowExecution | undefined {
    return this.activeWorkflows.get(executionId);
  }

  /**
   * Get all active workflows
   */
  getActiveWorkflows(): WorkflowExecution[] {
    return Array.from(this.activeWorkflows.values());
  }

  // ================================
  // DEFAULT WORKFLOW TEMPLATES
  // ================================

  private initializeDefaultTemplates(): void {
    // Create default automation templates for common patterns
    const clickAndExtractTemplate: AutomationWorkflow = {
      id: 'template_click_extract',
      name: 'Click and Extract Text',
      description: 'Click on a location and extract text from a region',
      steps: [
        {
          id: 'trigger',
          nodeType: 'manual_trigger',
          config: { trigger_message: 'Start click and extract' },
          inputs: {}
        },
        {
          id: 'click',
          nodeType: 'click_action',
          config: { click_type: 'left', wait_after_click: 1000 },
          inputs: {}
        },
        {
          id: 'extract',
          nodeType: 'ocr_region',
          config: { language: 'eng', confidence_threshold: 60 },
          inputs: {}
        },
        {
          id: 'display',
          nodeType: 'display_output',
          config: { format: 'pretty_json', title: 'Extracted Text' },
          inputs: {}
        }
      ],
      connections: [
        { source: { nodeId: 'trigger', portId: 'trigger_output' }, target: { nodeId: 'click', portId: 'trigger_input' } },
        { source: { nodeId: 'click', portId: 'next_trigger' }, target: { nodeId: 'extract', portId: 'trigger_input' } },
        { source: { nodeId: 'extract', portId: 'extracted_text' }, target: { nodeId: 'display', portId: 'data_input' } }
      ],
      metadata: {
        created: Date.now(),
        lastModified: Date.now(),
        version: '1.0.0',
        tags: ['template', 'click', 'ocr']
      }
    };

    this.workflowTemplates.set('template_click_extract', clickAndExtractTemplate);
  }

  /**
   * Get workflow templates
   */
  getWorkflowTemplates(): AutomationWorkflow[] {
    return Array.from(this.workflowTemplates.values());
  }
}

export const workflowIntegrationService = new WorkflowIntegrationService();