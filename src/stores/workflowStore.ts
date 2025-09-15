import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Node, Edge } from '@xyflow/react';
import { LiveDesktopConfig } from '@/types/liveDesktop';

// Execution state types
export interface ExecutionState {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startTime?: string;
  endTime?: string;
  currentNodeId?: string;
  progress: {
    totalNodes: number;
    completedNodes: number;
    failedNodes: number;
  };
  debugMode: boolean;
  stepByStep: boolean;
}

export interface NodeExecutionResult {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: string;
  endTime?: string;
  outputData?: any;
  error?: string;
  logs: string[];
}

export interface ExecutionVariable {
  name: string;
  value: any;
  type: string;
  nodeId: string;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

interface WorkflowState {
  // Current workflow state
  nodes: Node[];
  edges: Edge[];
  workflowName: string;
  selectedNode: Node | null;
  
  // Live Desktop integration
  availableLiveDesktops: LiveDesktopConfig[];
  
  // Execution state
  currentExecution: ExecutionState | null;
  executionHistory: ExecutionState[];
  nodeResults: Record<string, NodeExecutionResult>;
  executionVariables: Record<string, ExecutionVariable>;
  executionLogs: string[];
  
  // WebSocket connection
  wsConnected: boolean;
  wsMessages: WebSocketMessage[];
  
  // Debug features
  debugMode: boolean;
  stepByStep: boolean;
  breakpoints: Set<string>; // Node IDs where execution should pause
  
  // UI state persistence
  panelSizes: {
    canvas: number;
    debug: number;
  };
  activeDebugTab: string;
  isLibraryOpen: boolean;
  
  // Actions
  setNodes: (nodes: Node[] | ((prevNodes: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[]) => void;
  setWorkflowName: (name: string) => void;
  setSelectedNode: (node: Node | null) => void;
  setPanelSizes: (sizes: { canvas: number; debug: number }) => void;
  setActiveDebugTab: (tab: string) => void;
  setIsLibraryOpen: (isOpen: boolean) => void;
  
  // Live Desktop operations
  setAvailableLiveDesktops: (configs: LiveDesktopConfig[]) => void;
  addLiveDesktopConfig: (config: LiveDesktopConfig) => void;
  
  // Workflow operations
  addNode: (node: Node) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<Node>) => void;
  addEdge: (edge: Edge) => void;
  removeEdge: (edgeId: string) => void;
  clearWorkflow: () => void;
  
  // Execution operations
  startExecution: (debugMode?: boolean, stepByStep?: boolean) => Promise<void>;
  pauseExecution: () => Promise<void>;
  resumeExecution: () => Promise<void>;
  stopExecution: () => Promise<void>;
  stepExecution: () => Promise<void>;
  
  // Execution state management
  setCurrentExecution: (execution: ExecutionState | null) => void;
  updateNodeResult: (nodeId: string, result: NodeExecutionResult) => void;
  addExecutionLog: (message: string) => void;
  clearExecutionLogs: () => void;
  setExecutionVariable: (name: string, variable: ExecutionVariable) => void;
  
  // Debug operations
  setDebugMode: (enabled: boolean) => void;
  setStepByStep: (enabled: boolean) => void;
  toggleBreakpoint: (nodeId: string) => void;
  clearBreakpoints: () => void;
  
  // WebSocket operations
  setWsConnected: (connected: boolean) => void;
  addWsMessage: (message: WebSocketMessage) => void;
  clearWsMessages: () => void;
  
  // Validation
  validateWorkflow: () => { isValid: boolean; errors: string[] };
  validateNodeConfiguration: (nodeId: string) => { isValid: boolean; errors: string[] };
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      // Initial state
      nodes: [],
      edges: [],
      workflowName: 'Untitled Workflow',
      selectedNode: null,
      
      // Live Desktop state
      availableLiveDesktops: [],
      
      // Execution state
      currentExecution: null,
      executionHistory: [],
      nodeResults: {},
      executionVariables: {},
      executionLogs: [],
      
      // WebSocket connection
      wsConnected: false,
      wsMessages: [],
      
      // Debug features
      debugMode: false,
      stepByStep: false,
      breakpoints: new Set(),
      
      // UI state
      panelSizes: {
        canvas: 70,
        debug: 30
      },
      activeDebugTab: 'executions',
      isLibraryOpen: false,
      
      // Actions
      setNodes: (nodes) => set(state => ({ 
        nodes: typeof nodes === 'function' ? nodes(state.nodes) : nodes 
      })),
      setEdges: (edges) => set({ edges }),
      setWorkflowName: (workflowName) => set({ workflowName }),
      setSelectedNode: (selectedNode) => set({ selectedNode }),
      setPanelSizes: (panelSizes) => set({ panelSizes }),
      setActiveDebugTab: (activeDebugTab) => set({ activeDebugTab }),
      setIsLibraryOpen: (isLibraryOpen) => set({ isLibraryOpen }),
      
      // Live Desktop operations
      setAvailableLiveDesktops: (availableLiveDesktops) => set({ availableLiveDesktops }),
      addLiveDesktopConfig: (config) => set((state) => ({
        availableLiveDesktops: [...state.availableLiveDesktops, config]
      })),
      
      // Workflow operations
      addNode: (node) => set((state) => ({
        nodes: [...state.nodes, node]
      })),
      
      removeNode: (nodeId) => set((state) => ({
        nodes: state.nodes.filter(n => n.id !== nodeId),
        edges: state.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
        selectedNode: state.selectedNode?.id === nodeId ? null : state.selectedNode
      })),
      
      updateNode: (nodeId, updates) => set((state) => ({
        nodes: state.nodes.map(node => 
          node.id === nodeId ? { ...node, ...updates } : node
        )
      })),
      
      addEdge: (edge) => set((state) => ({
        edges: [...state.edges, edge]
      })),
      
      removeEdge: (edgeId) => set((state) => ({
        edges: state.edges.filter(e => e.id !== edgeId)
      })),
      
      clearWorkflow: () => set({
        nodes: [],
        edges: [],
        workflowName: 'Untitled Workflow',
        selectedNode: null,
        currentExecution: null,
        nodeResults: {},
        executionVariables: {},
        executionLogs: [],
        breakpoints: new Set()
      }),
      
      // Execution operations
      startExecution: async (debugMode = false, stepByStep = false) => {
        const state = get();
        const validation = state.validateWorkflow();
        
        if (!validation.isValid) {
          state.addExecutionLog(`❌ Workflow validation failed: ${validation.errors.join(', ')}`);
          return;
        }
        
        const executionId = `exec_${Date.now()}`;
        const execution: ExecutionState = {
          id: executionId,
          workflowId: state.workflowName,
          status: 'running',
          startTime: new Date().toISOString(),
          progress: {
            totalNodes: state.nodes.length,
            completedNodes: 0,
            failedNodes: 0
          },
          debugMode,
          stepByStep
        };
        
        set({ 
          currentExecution: execution,
          debugMode,
          stepByStep,
          nodeResults: {},
          executionVariables: {},
          executionLogs: [`🚀 Starting workflow execution: ${executionId}`]
        });
        
        try {
          // Call backend API to start execution
          state.addExecutionLog(`🔄 Connecting to backend at http://localhost:8007...`);
          
          // First create the workflow if it doesn't exist
          let workflowId = `workflow_${Date.now()}`;
          const createResponse = await fetch('http://localhost:8007/api/workflows/', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              name: state.workflowName,
              nodes: state.nodes.map(node => ({
                id: node.id,
                type: node.type,
                config: node.data
              })),
              edges: state.edges.map(edge => ({
                id: edge.id,
                source: edge.source,
                target: edge.target
              }))
            })
          });
          
          if (!createResponse.ok) {
            let errorMessage = `HTTP ${createResponse.status}: ${createResponse.statusText}`;
            try {
              const errorData = await createResponse.json();
              if (errorData.error) {
                errorMessage = errorData.error;
              } else if (errorData.detail) {
                errorMessage = errorData.detail;
              }
            } catch (parseError) {
              // If we can't parse the error response, use the status text
              state.addExecutionLog(`⚠️ Could not parse error response: ${parseError}`);
            }
            throw new Error(errorMessage);
          }
          
          const createResult = await createResponse.json();
          workflowId = createResult.workflow.id;
          
          // Execute the workflow using the advanced endpoint
          const response = await fetch(`http://localhost:8007/api/workflows/${workflowId}/execute/advanced`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              debug_mode: debugMode,
              step_by_step: stepByStep,
              variables: {},
              execution_mode: 'parallel'
            })
          });
          
          // Enhanced error handling with detailed response information
          if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
              const errorData = await response.json();
              if (errorData.error) {
                errorMessage = errorData.error;
              } else if (errorData.detail) {
                errorMessage = errorData.detail;
              }
            } catch (parseError) {
              // If we can't parse the error response, use the status text
              state.addExecutionLog(`⚠️ Could not parse error response: ${parseError}`);
            }
            throw new Error(errorMessage);
          }
          
          // Parse and validate response
          const result = await response.json();
          if (!result || typeof result !== 'object') {
            throw new Error('Invalid response format from backend');
          }
          
          // Update execution with backend response
          if (result.execution_id) {
            set(state => ({
              currentExecution: state.currentExecution ? {
                ...state.currentExecution,
                id: result.execution_id
              } : null
            }));
            state.addExecutionLog(`✅ Execution started successfully: ${result.execution_id}`);
          } else {
            state.addExecutionLog(`✅ Execution started (no execution ID returned)`);
          }
          
          // Log additional response data if available
          if (result.status) {
            state.addExecutionLog(`📊 Initial status: ${result.status}`);
          }
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          state.addExecutionLog(`❌ Failed to start execution: ${errorMessage}`);
          
          // Check if it's a network error
          if (errorMessage.includes('fetch') || errorMessage.includes('NetworkError')) {
            state.addExecutionLog(`🔌 Network error - please ensure backend is running on http://localhost:8007`);
          }
          
          set(state => ({
            currentExecution: state.currentExecution ? {
              ...state.currentExecution,
              status: 'failed',
              endTime: new Date().toISOString()
            } : null
          }));
        }
      },
      
      pauseExecution: async () => {
        const state = get();
        if (!state.currentExecution?.id) {
          state.addExecutionLog('⚠️ No active execution to pause');
          return;
        }
        
        try {
          const response = await fetch(`http://localhost:8007/api/workflows/executions/${state.currentExecution.id}/control`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ action: 'pause' })
          });
          
          if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
              const errorData = await response.json();
              if (errorData.error) errorMessage = errorData.error;
              else if (errorData.detail) errorMessage = errorData.detail;
            } catch (parseError) {
              // Use status text if can't parse error response
            }
            throw new Error(errorMessage);
          }
          
          const result = await response.json();
          set(state => ({
            currentExecution: state.currentExecution ? {
              ...state.currentExecution,
              status: 'paused'
            } : null
          }));
          state.addExecutionLog('⏸️ Execution paused successfully');
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          state.addExecutionLog(`❌ Failed to pause execution: ${errorMessage}`);
        }
      },
      
      resumeExecution: async () => {
        const state = get();
        if (!state.currentExecution?.id) {
          state.addExecutionLog('⚠️ No active execution to resume');
          return;
        }
        
        try {
          const response = await fetch(`http://localhost:8007/api/workflows/executions/${state.currentExecution.id}/control`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ action: 'resume' })
          });
          
          if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
              const errorData = await response.json();
              if (errorData.error) errorMessage = errorData.error;
              else if (errorData.detail) errorMessage = errorData.detail;
            } catch (parseError) {
              // Use status text if can't parse error response
            }
            throw new Error(errorMessage);
          }
          
          const result = await response.json();
          set(state => ({
            currentExecution: state.currentExecution ? {
              ...state.currentExecution,
              status: 'running'
            } : null
          }));
          state.addExecutionLog('▶️ Execution resumed successfully');
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          state.addExecutionLog(`❌ Failed to resume execution: ${errorMessage}`);
        }
      },
      
      stopExecution: async () => {
        const state = get();
        if (!state.currentExecution?.id) {
          state.addExecutionLog('⚠️ No active execution to stop');
          return;
        }
        
        try {
          const response = await fetch(`http://localhost:8007/api/workflows/executions/${state.currentExecution.id}/control`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ action: 'stop' })
          });
          
          if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
              const errorData = await response.json();
              if (errorData.error) errorMessage = errorData.error;
              else if (errorData.detail) errorMessage = errorData.detail;
            } catch (parseError) {
              // Use status text if can't parse error response
            }
            throw new Error(errorMessage);
          }
          
          const result = await response.json();
          set(state => ({
            currentExecution: state.currentExecution ? {
              ...state.currentExecution,
              status: 'stopped',
              endTime: new Date().toISOString()
            } : null
          }));
          state.addExecutionLog('⏹️ Execution stopped successfully');
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          state.addExecutionLog(`❌ Failed to stop execution: ${errorMessage}`);
        }
      },
      
      stepExecution: async () => {
        const state = get();
        if (!state.currentExecution?.id) {
          state.addExecutionLog('⚠️ No active execution to step');
          return;
        }
        
        try {
          const response = await fetch(`http://localhost:8007/api/workflows/executions/${state.currentExecution.id}/control`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ action: 'step' })
          });
          
          if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
              const errorData = await response.json();
              if (errorData.error) errorMessage = errorData.error;
              else if (errorData.detail) errorMessage = errorData.detail;
            } catch (parseError) {
              // Use status text if can't parse error response
            }
            throw new Error(errorMessage);
          }
          
          const result = await response.json();
          state.addExecutionLog('👣 Executed one step successfully');
          
          // Update execution status if provided in response
          if (result.status && state.currentExecution) {
            set(state => ({
              currentExecution: state.currentExecution ? {
                ...state.currentExecution,
                status: result.status
              } : null
            }));
          }
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          state.addExecutionLog(`❌ Failed to step execution: ${errorMessage}`);
        }
      },
      
      // Execution state management
      setCurrentExecution: (execution) => set({ currentExecution: execution }),
      
      updateNodeResult: (nodeId, result) => set(state => ({
        nodeResults: {
          ...state.nodeResults,
          [nodeId]: result
        },
        currentExecution: state.currentExecution ? {
          ...state.currentExecution,
          currentNodeId: result.status === 'running' ? nodeId : state.currentExecution.currentNodeId,
          progress: {
            ...state.currentExecution.progress,
            completedNodes: Object.values({
              ...state.nodeResults,
              [nodeId]: result
            }).filter(r => r.status === 'completed').length,
            failedNodes: Object.values({
              ...state.nodeResults,
              [nodeId]: result
            }).filter(r => r.status === 'failed').length
          }
        } : null
      })),
      
      addExecutionLog: (message) => set(state => ({
        executionLogs: [
          ...state.executionLogs,
          `[${new Date().toLocaleTimeString()}] ${message}`
        ]
      })),
      
      clearExecutionLogs: () => set({ executionLogs: [] }),
      
      setExecutionVariable: (name, variable) => set(state => ({
        executionVariables: {
          ...state.executionVariables,
          [name]: variable
        }
      })),
      
      // Debug operations
      setDebugMode: (debugMode) => set({ debugMode }),
      setStepByStep: (stepByStep) => set({ stepByStep }),
      
      toggleBreakpoint: (nodeId) => set(state => {
        const newBreakpoints = new Set(state.breakpoints);
        if (newBreakpoints.has(nodeId)) {
          newBreakpoints.delete(nodeId);
        } else {
          newBreakpoints.add(nodeId);
        }
        return { breakpoints: newBreakpoints };
      }),
      
      clearBreakpoints: () => set({ breakpoints: new Set() }),
      
      // WebSocket operations
      setWsConnected: (wsConnected) => set({ wsConnected }),
      
      addWsMessage: (message) => set(state => ({
        wsMessages: [...state.wsMessages.slice(-99), message] // Keep last 100 messages
      })),
      
      clearWsMessages: () => set({ wsMessages: [] }),
      
      // Validation
      validateWorkflow: () => {
        const state = get();
        const errors: string[] = [];
        
        if (state.nodes.length === 0) {
          errors.push('Workflow must contain at least one node');
        }
        
        // Check for trigger nodes
        const triggerNodes = state.nodes.filter(node => 
          node.type === 'manual_trigger' || node.type === 'webhook_trigger'
        );
        
        if (triggerNodes.length === 0) {
          errors.push('Workflow must contain at least one trigger node');
        }
        
        // Validate each node configuration
        for (const node of state.nodes) {
          const nodeValidation = get().validateNodeConfiguration(node.id);
          if (!nodeValidation.isValid) {
            errors.push(`Node ${node.id}: ${nodeValidation.errors.join(', ')}`);
          }
        }
        
        return {
          isValid: errors.length === 0,
          errors
        };
      },
      
      validateNodeConfiguration: (nodeId) => {
        const state = get();
        const node = state.nodes.find(n => n.id === nodeId);
        const errors: string[] = [];
        
        if (!node) {
          errors.push('Node not found');
          return { isValid: false, errors };
        }
        
        const config = node.data || {};
        
        // Type-specific validation
        switch (node.type) {
          case 'click_action':
            if (typeof config.x !== 'number' || typeof config.y !== 'number') {
              errors.push('Click action requires valid x and y coordinates');
            }
            break;
            
          case 'type_text_action':
            if (!config.text || typeof config.text !== 'string') {
              errors.push('Type text action requires text input');
            }
            break;
            
          case 'http_request':
            if (!config.url || typeof config.url !== 'string') {
              errors.push('HTTP request requires valid URL');
            }
            break;
            
          case 'webhook_trigger':
            if (!config.webhook_url || typeof config.webhook_url !== 'string') {
              errors.push('Webhook trigger requires valid webhook URL');
            }
            break;
            
          case 'n8n_webhook':
            if (!config.webhook_url || typeof config.webhook_url !== 'string') {
              errors.push('N8N webhook requires valid webhook URL');
            }
            break;
            
          case 'ocr_region':
            if (typeof config.x !== 'number' || typeof config.y !== 'number' ||
                typeof config.width !== 'number' || typeof config.height !== 'number') {
              errors.push('OCR region requires valid coordinates and dimensions');
            }
            break;
        }
        
        return {
          isValid: errors.length === 0,
          errors
        };
      }
    }),
    {
      name: 'workflow-storage',
      // Only persist UI state, not workflow data
      partialize: (state) => ({
        panelSizes: state.panelSizes,
        activeDebugTab: state.activeDebugTab,
        isLibraryOpen: state.isLibraryOpen,
        workflowName: state.workflowName
      })
    }
  )
);