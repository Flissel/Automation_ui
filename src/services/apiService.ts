/**
 * API Service for TRAE Unity AI Platform
 * Handles communication with backend services
 */

import { authService } from './authService';

export interface VirtualDesktop {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'connecting' | 'error';
  createdAt: string;
  lastActivity?: string;
  connectionUrl?: string;
  metadata?: Record<string, any>;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: WorkflowStep[];
  metadata: {
    tags: string[];
    estimatedDuration: number;
    category: string;
  };
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'action' | 'wait' | 'analysis';
  parameters: Record<string, any>;
  timeout: number;
  retryCount: number;
  onSuccess: string;
  onFailure: string;
}

export interface OCRRegion {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'text' | 'number' | 'barcode';
  isActive: boolean;
}

export interface WorkflowExecution {
  id: string;
  templateId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  progress: number;
  currentStep?: string;
  results?: Record<string, any>;
  error?: string;
}

class ApiService {
  private baseUrl = 'http://localhost:8007/api/v1';
  private workflowBaseUrl = 'http://localhost:8007/api/workflows';

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers = {
        'Content-Type': 'application/json',
        ...authService.getAuthHeader(),
        ...options.headers,
      };

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  // ============================================================================
  // VIRTUAL DESKTOP MANAGEMENT
  // ============================================================================

  /**
   * Get list of virtual desktops
   */
  async getDesktops(): Promise<{ success: boolean; data?: VirtualDesktop[]; error?: string }> {
    const result = await this.request<{ desktops: VirtualDesktop[]; count: number }>('/desktop/list');
    if (result.success && result.data) {
      return {
        success: true,
        data: result.data.desktops
      };
    }
    return result;
  }

  /**
   * Create a new virtual desktop
   */
  async createDesktop(config: {
    name: string;
    type?: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; data?: VirtualDesktop; error?: string }> {
    return this.request<VirtualDesktop>('/desktop/create', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  /**
   * Connect to a virtual desktop
   */
  async connectToDesktop(desktopId: string): Promise<{ success: boolean; data?: { connectionUrl: string }; error?: string }> {
    return this.request<{ connectionUrl: string }>(`/desktop/connect?id=${desktopId}`);
  }

  // ============================================================================
  // WORKFLOW MANAGEMENT
  // ============================================================================

  /**
   * Get available workflow templates
   */
  async getWorkflowTemplates(): Promise<{ success: boolean; data?: WorkflowTemplate[]; error?: string }> {
    const result = await this.request<{ templates: WorkflowTemplate[]; count: number }>('/workflow/templates');
    if (result.success && result.data) {
      return {
        success: true,
        data: result.data.templates
      };
    }
    return result;
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(config: {
    templateId: string;
    desktopId?: string;
    parameters?: Record<string, any>;
  }): Promise<{ success: boolean; data?: WorkflowExecution; error?: string }> {
    return this.request<WorkflowExecution>('/workflow/execute', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  /**
   * Start a custom workflow
   */
  async startWorkflow(config: {
    desktopId: string;
    steps: WorkflowStep[];
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; data?: WorkflowExecution; error?: string }> {
    return this.request<WorkflowExecution>('/workflow/start', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  /**
   * Get workflow execution status
   */
  async getWorkflowStatus(executionId: string): Promise<{ success: boolean; data?: WorkflowExecution; error?: string }> {
    return this.request<WorkflowExecution>(`/workflow/status?id=${executionId}`);
  }

  /**
   * Stop a running workflow
   */
  async stopWorkflow(executionId: string): Promise<{ success: boolean; error?: string }> {
    return this.request('/workflow/stop', {
      method: 'POST',
      body: JSON.stringify({ executionId })
    });
  }

  /**
   * Get workflow execution history
   */
  async getWorkflowHistory(): Promise<{ success: boolean; data?: WorkflowExecution[]; error?: string }> {
    const result = await this.request<{ executions: WorkflowExecution[]; count: number }>('/workflow/history');
    if (result.success && result.data) {
      return {
        success: true,
        data: result.data.executions
      };
    }
    return result;
  }

  // ============================================================================
  // DIRECT WORKFLOW ENDPOINTS (Advanced Features)
  // ============================================================================

  /**
   * Make request to direct workflow endpoints
   */
  private async workflowRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const url = `${this.workflowBaseUrl}${endpoint}`;
      const headers = {
        'Content-Type': 'application/json',
        ...authService.getAuthHeader(),
        ...options.headers,
      };

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Execute advanced workflow with custom nodes and edges
   */
  async executeAdvancedWorkflow(config: {
    workflow: {
      name: string;
      nodes: Array<{
        id: string;
        type: string;
        config: any;
      }>;
      edges: Array<{
        id: string;
        source: string;
        target: string;
      }>;
    };
    debug_mode?: boolean;
    step_by_step?: boolean;
  }): Promise<{ success: boolean; data?: { execution_id: string; status: string }; error?: string }> {
    return this.workflowRequest<{ execution_id: string; status: string }>('/execute', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  /**
   * Control workflow execution (pause, resume, stop, step)
   */
  async controlWorkflowExecution(
    executionId: string, 
    action: 'pause' | 'resume' | 'stop' | 'step'
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.workflowRequest(`/${executionId}/control`, {
      method: 'POST',
      body: JSON.stringify({ action })
    });
  }

  /**
   * Get detailed workflow execution status
   */
  async getAdvancedWorkflowStatus(executionId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.workflowRequest(`/${executionId}/status`);
  }

  /**
   * List all workflows
   */
  async listWorkflows(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    return this.workflowRequest('');
  }

  /**
   * Get specific workflow details
   */
  async getWorkflow(workflowId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.workflowRequest(`/${workflowId}`);
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(workflow: {
    name: string;
    description?: string;
    nodes: any[];
    edges: any[];
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.workflowRequest('', {
      method: 'POST',
      body: JSON.stringify(workflow)
    });
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(workflowId: string): Promise<{ success: boolean; error?: string }> {
    return this.workflowRequest(`/${workflowId}`, {
      method: 'DELETE'
    });
  }

  // ============================================================================
  // AUTOMATION ACTIONS
  // ============================================================================

  /**
   * Execute automation actions
   */
  async executeActions(actions: Array<{
    type: string;
    parameters: Record<string, any>;
  }>): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.request('/automation/actions', {
      method: 'POST',
      body: JSON.stringify({ actions })
    });
  }

  /**
   * Take a screenshot
   */
  async takeScreenshot(config?: {
    region?: { x: number; y: number; width: number; height: number };
    format?: 'png' | 'jpg';
  }): Promise<{ success: boolean; data?: { imageUrl: string; timestamp: string }; error?: string }> {
    return this.request('/automation/screenshot', {
      method: 'POST',
      body: JSON.stringify(config || {})
    });
  }

  // ============================================================================
  // OCR PROCESSING
  // ============================================================================

  /**
   * Process image for OCR
   */
  async processOCR(config: {
    imageData: string;
    regions?: OCRRegion[];
    options?: Record<string, any>;
  }): Promise<{ success: boolean; data?: { text: string; confidence: number; regions?: any[] }; error?: string }> {
    return this.request('/ocr/process', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  /**
   * Process specific regions for OCR
   */
  async processOCRRegions(config: {
    imageData: string;
    regions: OCRRegion[];
  }): Promise<{ success: boolean; data?: Array<{ regionId: string; text: string; confidence: number }>; error?: string }> {
    return this.request('/ocr/regions', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  // ============================================================================
  // HEALTH & STATUS
  // ============================================================================

  /**
   * Get system health status
   */
  async getHealthStatus(): Promise<{ success: boolean; data?: any; error?: string }> {
    // Use baseUrl-relative health endpoint for consistency and proxy support in dev
    const apiRoot = this.baseUrl.replace(/\/api(\/v1)?$/, '');
    const response = await fetch(`${apiRoot}/health`);
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }
    const data = await response.json();
    return { success: true, data };
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;