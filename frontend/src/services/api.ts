/**
 * TRAE Visual Workflow System - API Service Layer
 * 
 * Comprehensive API client for all backend services
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import {
  ApiResponse,
  WorkflowGraph,
  WorkflowExecution,
  NodeData,
  ExecutionContext,
  ExecutionResult,
  ScreenshotOptions,
  ClickOptions,
  LiveDesktopConfig,
  OCRConfig,
  OCRResult,
  FileWatchConfig,
  FileSystemEvent,
  SystemHealth,
  TraeApiError
} from '../types';

// ============================================================================
// API CLIENT CONFIGURATION
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';

class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new TraeApiError(
          data.code || 'API_ERROR',
          data.message || `HTTP ${response.status}: ${response.statusText}`,
          data.details
        );
      }

      return {
        success: true,
        data: data.workflow || data.workflows || data.data || data,
        message: data.message,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof TraeApiError) {
        throw error;
      }

      throw new TraeApiError(
        'NETWORK_ERROR',
        error instanceof Error ? error.message : 'Unknown network error'
      );
    }
  }

  // GET request
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return this.request<T>(url.pathname + url.search);
  }

  // POST request
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // File upload
  async upload<T>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  }
}

// Create singleton instance
const apiClient = new ApiClient();

// ============================================================================
// WORKFLOW GRAPH API
// ============================================================================

export const workflowApi = {
  // Get all workflows
  async getWorkflows(): Promise<ApiResponse<WorkflowGraph[]>> {
    return apiClient.get<WorkflowGraph[]>('/api/workflows');
  },

  // Get workflow by ID
  async getWorkflow(id: string): Promise<ApiResponse<WorkflowGraph>> {
    return apiClient.get<WorkflowGraph>(`/api/workflows/${id}`);
  },

  // Create new workflow
  async createWorkflow(workflow: Partial<WorkflowGraph>): Promise<ApiResponse<WorkflowGraph>> {
    return apiClient.post<WorkflowGraph>('/api/workflows', workflow);
  },

  // Update workflow
  async updateWorkflow(id: string, workflow: Partial<WorkflowGraph>): Promise<ApiResponse<WorkflowGraph>> {
    return apiClient.put<WorkflowGraph>(`/api/workflows/${id}`, workflow);
  },

  // Delete workflow
  async deleteWorkflow(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/api/workflows/${id}`);
  },

  // Execute workflow
  async executeWorkflow(id: string, inputs?: Record<string, any>): Promise<ApiResponse<WorkflowExecution>> {
    return apiClient.post<WorkflowExecution>(`/api/workflows/${id}/execute`, { inputs });
  },

  // Get workflow execution status
  async getExecutionStatus(executionId: string): Promise<ApiResponse<WorkflowExecution>> {
    return apiClient.get<WorkflowExecution>(`/api/executions/${executionId}`);
  },

  // Cancel workflow execution
  async cancelExecution(executionId: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`/api/executions/${executionId}/cancel`);
  },
};

// ============================================================================
// NODE SYSTEM API
// ============================================================================

export const nodeApi = {
  // Get available node types
  async getNodeTypes(): Promise<ApiResponse<Record<string, any>>> {
    return apiClient.get<Record<string, any>>('/api/nodes/types');
  },

  // Get node definition
  async getNodeDefinition(nodeType: string): Promise<ApiResponse<any>> {
    return apiClient.get<any>(`/api/nodes/types/${nodeType}`);
  },

  // Execute single node
  async executeNode(context: ExecutionContext): Promise<ApiResponse<ExecutionResult>> {
    return apiClient.post<ExecutionResult>('/api/nodes/execute', context);
  },

  // Validate node configuration
  async validateNode(nodeData: NodeData): Promise<ApiResponse<{ valid: boolean; errors?: string[] }>> {
    return apiClient.post<{ valid: boolean; errors?: string[] }>('/api/nodes/validate', nodeData);
  },
};

// ============================================================================
// DESKTOP INTEGRATION API
// ============================================================================

export const desktopApi = {
  // Take screenshot
  async takeScreenshot(options?: ScreenshotOptions): Promise<ApiResponse<{ image_data: string; metadata: any }>> {
    return apiClient.post<{ image_data: string; metadata: any }>('/api/snapshots/create', options);
  },

  // Perform click
  async performClick(options: ClickOptions): Promise<ApiResponse<{ success: boolean; metadata: any }>> {
    return apiClient.post<{ success: boolean; metadata: any }>('/api/desktop/click', options);
  },

  // Get screen info
  async getScreenInfo(): Promise<ApiResponse<{ width: number; height: number; scale: number }>> {
    return apiClient.get<{ width: number; height: number; scale: number }>('/api/desktop/screen-info');
  },

  // Start live desktop stream
  async startLiveStream(config?: LiveDesktopConfig): Promise<ApiResponse<{ stream_id: string; ws_url: string }>> {
    return apiClient.post<{ stream_id: string; ws_url: string }>('/api/desktop/live/start', config);
  },

  // Stop live desktop stream
  async stopLiveStream(streamId: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`/api/desktop/live/${streamId}/stop`);
  },

  // Get active streams
  async getActiveStreams(): Promise<ApiResponse<Array<{ stream_id: string; config: LiveDesktopConfig; created_at: string }>>> {
    return apiClient.get<Array<{ stream_id: string; config: LiveDesktopConfig; created_at: string }>>('/api/desktop/live/streams');
  },

  // Desktop switching functions
  async getDesktopStatus(): Promise<ApiResponse<any>> {
    return apiClient.get<any>('/api/desktop/current');
  },

  async getDesktopTargets(): Promise<ApiResponse<any>> {
    return apiClient.get<any>('/api/desktop/targets');
  },

  async switchDesktop(targetId: string): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/api/desktop/switch', { target_id: targetId });
  },

  async getSSHConnections(): Promise<ApiResponse<any>> {
    return apiClient.get<any>('/api/desktop/ssh/connections');
  },

  async addSSHConnection(connectionData: any): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/api/desktop/ssh/add', connectionData);
  },

  async connectSSH(connectionId: string): Promise<ApiResponse<any>> {
    return apiClient.post<any>(`/api/desktop/ssh/connect/${connectionId}`);
  },

  async disconnectSSH(connectionId: string): Promise<ApiResponse<any>> {
    return apiClient.post<any>(`/api/desktop/ssh/disconnect/${connectionId}`);
  },

  // Windows Desktop Streaming API
  async getWindowsDesktopStatus(): Promise<ApiResponse<any>> {
    return apiClient.get<any>('/api/windows-desktop/status');
  },

  async startWindowsDesktopStreaming(config: any): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/api/windows-desktop/start', config);
  },

  async stopWindowsDesktopStreaming(): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/api/windows-desktop/stop');
  },

  async updateWindowsDesktopConfig(config: any): Promise<ApiResponse<any>> {
    return apiClient.put<any>('/api/windows-desktop/config', config);
  },

  async testWindowsConnection(connectionData: any): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/api/windows-desktop/test-connection', connectionData);
  },

  async captureWindowsScreenshot(): Promise<ApiResponse<any>> {
    return apiClient.get<any>('/api/windows-desktop/screenshot');
  },

  async getWindowsConnections(): Promise<ApiResponse<any>> {
    return apiClient.get<any>('/api/windows-desktop/connections');
  },

  async switchDesktopTarget(targetData: any): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/api/windows-desktop/switch-desktop', targetData);
  },

  async getHybridDesktopStatus(): Promise<ApiResponse<any>> {
    return apiClient.get<any>('/api/windows-desktop/hybrid-status');
  },

  async getWindowsDesktopHealth(): Promise<ApiResponse<any>> {
    return apiClient.get<any>('/api/windows-desktop/health');
  },
};

// ============================================================================
// OCR SERVICE API
// ============================================================================

export const ocrApi = {
  // Process image with OCR
  async processImage(imageData: string, config?: OCRConfig): Promise<ApiResponse<OCRResult>> {
    return apiClient.post<OCRResult>('/api/ocr/process', {
      image_data: imageData,
      config: config || {},
    });
  },

  // Process image file
  async processImageFile(file: File, config?: OCRConfig): Promise<ApiResponse<OCRResult>> {
    return apiClient.upload<OCRResult>('/api/ocr/process-file', file, config);
  },

  // Get supported languages
  async getSupportedLanguages(engine?: 'tesseract' | 'easyocr'): Promise<ApiResponse<string[]>> {
    return apiClient.get<string[]>('/api/ocr/languages', { engine });
  },

  // Get OCR engine info
  async getEngineInfo(): Promise<ApiResponse<Record<string, any>>> {
    return apiClient.get<Record<string, any>>('/api/ocr/engines');
  },

  // OCR Monitoring functions
  async startMonitoring(region: any, config: any = {}): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/api/ocr-monitoring/start', {
      region,
      config
    });
  },

  async stopMonitoring(): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/api/ocr-monitoring/stop');
  },

  async getMonitoringStatus(): Promise<ApiResponse<any>> {
    return apiClient.get<any>('/api/ocr-monitoring/status');
  },

  async getMonitoringHealth(): Promise<ApiResponse<any>> {
    return apiClient.get<any>('/api/ocr-monitoring/health');
  },

  async updateMonitoringConfig(config: any): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/api/ocr-monitoring/config', config);
  },

  async testOCRRegion(region: any): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/api/ocr-monitoring/test-region', { region });
  },

  async getCurrentText(): Promise<ApiResponse<any>> {
    return apiClient.get<any>('/api/ocr-monitoring/current-text');
  },
};

// ============================================================================
// FILE WATCHER API
// ============================================================================

export const fileWatcherApi = {
  // Start watching directory
  async startWatching(config: FileWatchConfig): Promise<ApiResponse<{ watcher_id: string }>> {
    return apiClient.post<{ watcher_id: string }>('/api/file-watcher/start', config);
  },

  // Stop watching
  async stopWatching(watcherId: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`/api/file-watcher/${watcherId}/stop`);
  },

  // Get active watchers
  async getActiveWatchers(): Promise<ApiResponse<Array<{ watcher_id: string; config: FileWatchConfig; created_at: string }>>> {
    return apiClient.get<Array<{ watcher_id: string; config: FileWatchConfig; created_at: string }>>('/api/file-watcher/watchers');
  },

  // Get recent events
  async getRecentEvents(watcherId?: string, limit?: number): Promise<ApiResponse<FileSystemEvent[]>> {
    return apiClient.get<FileSystemEvent[]>('/api/file-watcher/events', {
      watcher_id: watcherId,
      limit: limit || 100,
    });
  },
};

// ============================================================================
// SYSTEM HEALTH API
// ============================================================================

export const systemApi = {
  // Get system health
  async getHealth(): Promise<ApiResponse<SystemHealth>> {
    return apiClient.get<SystemHealth>('/api/health');
  },

  // Get service status
  async getServiceStatus(serviceName: string): Promise<ApiResponse<any>> {
    return apiClient.get<any>(`/api/health/${serviceName}`);
  },

  // Get system info
  async getSystemInfo(): Promise<ApiResponse<Record<string, any>>> {
    return apiClient.get<Record<string, any>>('/api/system/info');
  },
};

// ============================================================================
// PLAYWRIGHT API
// ============================================================================

export interface PlaywrightActionRequest {
  action: string;
  url?: string;
  selector?: string;
  value?: string;
  wait_condition?: string;
  timeout?: number;
  extraction_type?: string;
  attribute_name?: string;
  browser_config?: {
    headless?: boolean;
    viewport?: { width: number; height: number };
    user_agent?: string;
    timeout?: number;
  };
  page_analysis?: {
    enabled?: boolean;
    detect_forms?: boolean;
    detect_buttons?: boolean;
    detect_links?: boolean;
    detect_inputs?: boolean;
    generate_suggestions?: boolean;
    max_elements?: number;
  };
}

export interface ElementSuggestion {
  type: string;
  selector: string;
  element: string;
  description: string;
  confidence: number;
  suggested_node_type: string;
  priority: number;
}

export interface PlaywrightResponse {
  success: boolean;
  action: string;
  data?: any;
  error?: string;
  execution_time: number;
  suggestions: ElementSuggestion[];
}

export interface PageAnalysisRequest {
  url: string;
  analysis_config?: {
    enabled?: boolean;
    detect_forms?: boolean;
    detect_buttons?: boolean;
    detect_links?: boolean;
    detect_inputs?: boolean;
    generate_suggestions?: boolean;
    max_elements?: number;
  };
  browser_config?: {
    headless?: boolean;
    viewport?: { width: number; height: number };
    user_agent?: string;
    timeout?: number;
  };
}

export const playwrightApi = {
  // Execute Playwright action
  async executeAction(request: PlaywrightActionRequest): Promise<ApiResponse<PlaywrightResponse>> {
    return apiClient.post<PlaywrightResponse>('/api/playwright/execute', request);
  },

  // Analyze page elements
  async analyzePage(request: PageAnalysisRequest): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/api/playwright/analyze-page-endpoint', request);
  },

  // Get browser status
  async getBrowserStatus(): Promise<ApiResponse<any>> {
    return apiClient.get<any>('/api/playwright/browser-status');
  },

  // Close browser
  async closeBrowser(): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/api/playwright/close-browser');
  },

  // Health check
  async healthCheck(): Promise<ApiResponse<any>> {
    return apiClient.get<any>('/api/playwright/health');
  },

  // Navigate to URL
  async navigate(url: string, options?: Partial<PlaywrightActionRequest>): Promise<ApiResponse<PlaywrightResponse>> {
    return this.executeAction({
      action: 'navigate',
      url,
      ...options
    });
  },

  // Click element
  async click(selector: string, options?: Partial<PlaywrightActionRequest>): Promise<ApiResponse<PlaywrightResponse>> {
    return this.executeAction({
      action: 'click',
      selector,
      ...options
    });
  },

  // Fill input field
  async fill(selector: string, value: string, options?: Partial<PlaywrightActionRequest>): Promise<ApiResponse<PlaywrightResponse>> {
    return this.executeAction({
      action: 'fill',
      selector,
      value,
      ...options
    });
  },

  // Select option
  async select(selector: string, value: string, options?: Partial<PlaywrightActionRequest>): Promise<ApiResponse<PlaywrightResponse>> {
    return this.executeAction({
      action: 'select',
      selector,
      value,
      ...options
    });
  },

  // Extract text/data
  async extract(selector: string, extractionType: string = 'text', options?: Partial<PlaywrightActionRequest>): Promise<ApiResponse<PlaywrightResponse>> {
    return this.executeAction({
      action: 'extract',
      selector,
      extraction_type: extractionType,
      ...options
    });
  },

  // Take screenshot
  async screenshot(options?: Partial<PlaywrightActionRequest>): Promise<ApiResponse<PlaywrightResponse>> {
    return this.executeAction({
      action: 'screenshot',
      ...options
    });
  },

  // Wait for element
  async waitFor(selector: string, options?: Partial<PlaywrightActionRequest>): Promise<ApiResponse<PlaywrightResponse>> {
    return this.executeAction({
      action: 'wait',
      selector,
      ...options
    });
  },

  // Analyze page and get suggestions
  async getPageSuggestions(url: string, options?: Partial<PageAnalysisRequest>): Promise<ApiResponse<any>> {
    return this.analyzePage({
      url,
      analysis_config: {
        enabled: true,
        detect_forms: true,
        detect_buttons: true,
        detect_links: true,
        detect_inputs: true,
        generate_suggestions: true,
        max_elements: 50,
        ...options?.analysis_config
      },
      ...options
    });
  }
};

// ============================================================================
// WEBSOCKET API
// ============================================================================

export const websocketApi = {
  // Get WebSocket URL for live desktop
  getLiveDesktopUrl(streamId: string): string {
    return `${WS_BASE_URL}/ws/desktop/live/${streamId}`;
  },

  // Get WebSocket URL for workflow execution
  getWorkflowExecutionUrl(executionId: string): string {
    return `${WS_BASE_URL}/ws/execution/${executionId}`;
  },

  // Get WebSocket URL for file watcher events
  getFileWatcherUrl(watcherId: string): string {
    return `${WS_BASE_URL}/ws/file-watcher/${watcherId}`;
  },

  // Get general WebSocket URL
  getGeneralUrl(): string {
    return `${WS_BASE_URL}/ws`;
  },

  // Get Windows desktop streaming WebSocket URL
  getWindowsDesktopStreamUrl(): string {
    return `${WS_BASE_URL}/ws/live-desktop`;
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const apiUtils = {
  // Convert File to base64
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // Convert base64 to blob URL
  base64ToBlobUrl(base64: string, mimeType: string = 'image/png'): string {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return URL.createObjectURL(blob);
  },

  // Handle API errors
  handleApiError(error: unknown): string {
    if (error instanceof TraeApiError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'An unknown error occurred';
  },
};

// Export the main API client for custom requests
export { apiClient };

// Export all APIs as default
export default {
  workflow: workflowApi,
  node: nodeApi,
  desktop: desktopApi,
  ocr: ocrApi,
  fileWatcher: fileWatcherApi,
  system: systemApi,
  playwright: playwrightApi,
  websocket: websocketApi,
  utils: apiUtils,
};