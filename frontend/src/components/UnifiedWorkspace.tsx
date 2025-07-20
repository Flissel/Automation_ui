/**
 * Minimalistic Node Canvas Component
 * 
 * A clean, focused interface containing only:
 * - Node library sidebar
 * - Interactive canvas for node workflows
 * - Essential workflow controls
 * 
 * Author: TRAE Development Team
 * Version: 2.0.0 - Minimalistic Edition
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  Connection,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { createNodeFromTemplate, getNodeTemplate } from '../config/nodeTemplates'
import { NODE_TEMPLATES } from '../config/nodes'
import { validateConnection, createValidatedEdge, validateAllConnections } from '../utils/connectionValidator'
import { 
  validateWorkflow, 
  exportWorkflowToJSON, 
  importWorkflowFromJSON, 
  generateExecutionPlan,
  getWorkflowStatistics 
} from '../utils/workflowManager'
import CustomNode from './nodes/CustomNode'
import { LiveDesktopNodeMinimal as LiveDesktopNode } from './nodes/LiveDesktopNodeMinimal'
import SnapshotDesignerNode from './nodes/SnapshotDesignerNode'
import SnapshotOCRExecutorNode from './nodes/SnapshotOCRExecutorNode'
import SnapshotClickExecutorNode from './nodes/SnapshotClickExecutorNode'
import OCRNode from './nodes/OCRNode'
import ClickActionNode from './nodes/ClickActionNode'
import LoggingNode from './nodes/LoggingNode'
import RealtimeOCRActionNode from './nodes/RealtimeOCRActionNode'
import ManualTriggerNode from './nodes/ManualTriggerNode'
import ScreenshotActionNode from './nodes/ScreenshotActionNode'
import TypeTextActionNode from './nodes/TypeTextActionNode'
import HttpRequestActionNode from './nodes/HttpRequestActionNode'
import FileWatcherNode from './nodes/FileWatcherNode'
import ScheduleTriggerNode from './nodes/ScheduleTriggerNode'
import WebhookTriggerNode from './nodes/WebhookTriggerNode'
// import PlaywrightNode from './nodes/PlaywrightNode' // Not implemented yet
const PlaywrightNode = CustomNode // Temporary placeholder
import {
  Play,
  Trash2,
  Zap,
  Database,
  Globe,
  Code,
  GitBranch,
  Activity,
  Server,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Loader,
  Loader2,
  Layers,
  MousePointer,
  Camera,
  Keyboard,
  Mail,
  Hash,
  Cpu,
  Monitor,
  Command,
  Move,
  Move3D,
  ArrowUpDown,
  Save,
  Upload,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { errorHandlingService } from '../services/ErrorHandlingService'
import { loadingStateService } from '../services/LoadingStateService'

// Icon mapping function to convert string names to icon components
const getIconComponent = (iconName: string | any) => {
  // If it's already a component, return it
  if (typeof iconName === 'function') return iconName
  
  // Map string names to icon components
  const iconMap: { [key: string]: any } = {
    Play,
    Camera,
    MousePointer,
    FileText,
    GitBranch,
    Eye,
    Globe,
    Clock,
    Server,
    Activity,
    Keyboard,
    Database,
    Mail,
    RefreshCw,
    Code,
    Hash,
    Monitor,
    Command,
    Move,
    Move3D,
    ArrowUpDown,
    Zap,
    Cpu
  }
  
  return iconMap[iconName] || Activity
}

// Category configuration helper
const getCategoryConfig = (category: string) => {
  const configs: Record<string, { name: string; icon: any; color: string }> = {
    triggers: { name: 'Triggers', icon: Zap, color: 'bg-yellow-500' },
    actions: { name: 'Actions', icon: Activity, color: 'bg-blue-500' },
    logic: { name: 'Logic', icon: GitBranch, color: 'bg-green-500' },
    data: { name: 'Data', icon: Database, color: 'bg-purple-500' },
    desktop: { name: 'Desktop Control', icon: Layers, color: 'bg-indigo-500' },
    automation: { name: 'Advanced Automation', icon: Cpu, color: 'bg-red-500' }
  };
  
  return configs[category.toLowerCase()] || { name: category, icon: Activity, color: 'bg-gray-500' };
};

// Dynamic Node Categories Generation from NODE_TEMPLATES
const generateNodeCategories = () => {
  const categories: Record<string, {
    name: string;
    icon: any;
    color: string;
    nodes: Array<{ type: string; label: string; icon: any }>;
  }> = {};
  
  // Iterate through all node templates and organize by category
  Object.entries(NODE_TEMPLATES).forEach(([nodeType, template]) => {
    // Skip templates without proper category
    if (!template || !template.category) {
      console.warn(`Template ${nodeType} has no category, skipping`);
      return;
    }
    
    const categoryKey = template.category.toLowerCase();
    
    // Initialize category if it doesn't exist
    if (!categories[categoryKey]) {
      const categoryConfig = getCategoryConfig(template.category);
      categories[categoryKey] = {
        name: categoryConfig.name,
        icon: categoryConfig.icon,
        color: categoryConfig.color,
        nodes: []
      };
    }
    
    // Add node to category
    categories[categoryKey].nodes.push({
      type: nodeType,
      label: template.label || nodeType,
      icon: getIconComponent(template.icon)
    });
  });
  
  return categories;
};

// Generate node categories dynamically
const nodeCategories = generateNodeCategories();



// Node types for React Flow - Map all specific node types to their components
const createNodeTypes = () => ({
  // Base types
  custom: CustomNode,
  
  // Trigger types (matching template names)
  manual_trigger: ManualTriggerNode,
  file_watcher: FileWatcherNode,
  schedule_trigger: ScheduleTriggerNode,
  webhook_trigger: WebhookTriggerNode,
  live_desktop: LiveDesktopNode,
  
  // Action types (matching template names)
  click_action: ClickActionNode,
  ocr_action: OCRNode,
  realtime_ocr_action: RealtimeOCRActionNode,
  screenshot_action: ScreenshotActionNode,
  type_text_action: TypeTextActionNode,
  http_request_action: HttpRequestActionNode,
  file_operation_action: CustomNode,
  database_query_action: CustomNode,
  
  // Advanced Automation nodes
  ocr_click_pattern_monitor: CustomNode,
  enhanced_ocr_monitor: CustomNode,
  ocr_text_tracker: CustomNode,
 
  
  // Logic types (matching template names)
  if_condition: CustomNode,
  loop: CustomNode,
  switch: CustomNode,
  delay: CustomNode,
  transform_data: CustomNode,
  
  // Data types (matching template names)
  variable_store: CustomNode,
  json_parser: CustomNode,
  text_processor: CustomNode,
  data_transformer: CustomNode,
  
  // Snapshot-based nodes (matching template names)
  snapshot_creator: SnapshotDesignerNode,
  ocr_zone_designer: SnapshotDesignerNode,
  click_zone_designer: SnapshotDesignerNode,
  snapshot_ocr_executor: SnapshotOCRExecutorNode,
  snapshot_click_executor: SnapshotClickExecutorNode,
  
  // Utility nodes
  logging: LoggingNode,
  
  // Legacy compatibility (old names)
  webhook: CustomNode,
  schedule: ScheduleTriggerNode,
  file_watch: FileWatcherNode,
  api_trigger: CustomNode,
  screenshot: ScreenshotActionNode,
  ocr_text: OCRNode,
  type_text: TypeTextActionNode,
  http_request: HttpRequestActionNode,
  file_operation: CustomNode,
  database_query: CustomNode,
  email_send: CustomNode,
  condition: CustomNode,
  transform: CustomNode,
  variable: CustomNode,
  window_control: CustomNode,
  key_press: CustomNode,
  mouse_move: CustomNode,
  drag_drop: CustomNode,
  scroll_action: CustomNode,
})

// Main Minimalistic Canvas Component
const MinimalisticCanvasContent = () => {
  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedCategory, setSelectedCategory] = useState<string>('triggers')
  const [isExecuting, setIsExecuting] = useState(false)
  const [showNodePanel, setShowNodePanel] = useState(true)
  
  // Debug: Log state changes
  useEffect(() => {
    console.log('TRAE DEBUG: showNodePanel changed:', showNodePanel);
    console.log('TRAE DEBUG: selectedCategory changed:', selectedCategory);
  }, [showNodePanel, selectedCategory])
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  
  // Create nodeTypes using useMemo to ensure stable reference
  const nodeTypes = useMemo(() => {
    const types = createNodeTypes()
    console.log('TRAE DEBUG: nodeTypes created with useMemo:', Object.keys(types))
    console.log('TRAE DEBUG: manual_trigger nodeType:', types.manual_trigger)
    return types
  }, [])
  
  // Load mock workflow data on component mount
  useEffect(() => {
    const loadWorkflows = async () => {
      await errorHandlingService.withErrorHandling(
        async () => {
          return await loadingStateService.withLoading('load-workflows', 'Loading workflows...', async () => {
            // Use real API to get workflows
            const { workflowApi } = await import('../services/api')
            const response = await workflowApi.getWorkflows()
            
            if (response.success && response.data && response.data.length > 0) {
              const workflow = response.data[0] // Load first workflow
              
              // Convert workflow nodes to React Flow format
              const flowNodes = workflow.nodes.map((node: any) => ({
                ...node,
                data: {
                  ...(node.data || {})
                  // Keep icon as string, don't convert to React component
                }
              }))
              
              setNodes(flowNodes)
              setEdges(workflow.edges)
              return { success: true, message: 'Workflow loaded successfully' }
            } else {
              // If no workflows exist, start with empty canvas
              console.log('No workflows found, starting with empty canvas')
              return { success: true, message: 'Starting with empty canvas' }
            }
          })
        },
        {
          operation: 'load_workflows',
          context: { component: 'UnifiedWorkspace' }
        }
      )
    }
    
    loadWorkflows()
  }, [])
  
  // Node creation
  const addNode = useCallback((nodeType: string, category: string) => {
    const newPosition = { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 }
    
    // Debug: Log node creation details
    console.log('TRAE DEBUG: Creating node with type:', nodeType)
    console.log('TRAE DEBUG: Available nodeTypes:', Object.keys(nodeTypes))
    console.log('TRAE DEBUG: nodeType exists in nodeTypes:', nodeType in nodeTypes)
    
    // Create node from template with proper data structure
    const nodeData = createNodeFromTemplate(nodeType, newPosition)
    if (!nodeData) {
      console.error(`Failed to create node from template: ${nodeType}`)
      return
    }
    
    const newNode: Node = {
      id: nodeData.id,
      type: nodeType, // Use the actual node type instead of 'custom'
      position: newPosition,
      data: {
        ...nodeData,
        category: category, // Add category for enhanced styling
      },
    }
    
    console.log('TRAE DEBUG: Created node:', newNode)
    
    setNodes((nds) => [...nds, newNode])
    // Use success callback instead of toast for node addition
    console.log(`Node added: ${nodeData.label}`)
  }, [setNodes, nodeTypes])
  
  // Connection handling
  const onConnect = useCallback(
    (params: Connection) => {
      // Validate the connection before creating the edge
      const validationResult = validateConnection(params, nodes)
      
      if (!validationResult.valid) {
        console.warn(`Connection rejected: ${validationResult.error}`)
        errorHandlingService.handleError(new Error(`Connection rejected: ${validationResult.error}`), {
          category: 'VALIDATION',
          severity: 'MEDIUM',
          operation: 'connection_validation',
          context: { source: params.source, target: params.target }
        })
        return
      }

      // Create a validated edge with proper data
      const validatedEdge = createValidatedEdge(params, nodes)
      
      if (validatedEdge) {
        setEdges((eds) => addEdge(validatedEdge as any, eds))
        
        if ((validationResult as any).warning) {
          console.warn(`Connection warning: ${(validationResult as any).warning}`)
          errorHandlingService.handleError(new Error(`Connection warning: ${(validationResult as any).warning}`), {
            category: 'VALIDATION',
            severity: 'LOW',
            operation: 'connection_validation',
            context: { source: params.source, target: params.target },
            userMessage: `Warning: ${(validationResult as any).warning}`
          })
        }
      }
    },
    [setEdges, nodes]
  )
  
  // Workflow validation
  const validateCurrentWorkflow = useCallback(() => {
    const validation = validateWorkflow(nodes, edges);
    
    if (validation.valid) {
      console.log('Workflow validation passed!');
    } else {
      errorHandlingService.handleError(new Error(`Workflow validation failed: ${validation.errors.length} error(s)`), {
        category: 'VALIDATION',
        severity: 'HIGH',
        operation: 'workflow_validation',
        context: { errors: validation.errors, nodeCount: nodes.length, edgeCount: edges.length },
        technicalDetails: validation.errors.join(', ')
      });
      validation.errors.forEach(error => console.error('Validation Error:', error));
    }
    
    if (validation.warnings.length > 0) {
      validation.warnings.forEach(warning => console.warn('Validation Warning:', warning));
    }
    
    return validation;
  }, [nodes, edges]);

  // Workflow execution - simplified
  const executeWorkflow = useCallback(async () => {
    if (nodes.length === 0) {
      errorHandlingService.handleError(new Error('No nodes to execute'), {
        category: 'USER_INPUT',
        severity: 'LOW',
        operation: 'workflow_execution',
        userMessage: 'Keine Nodes zum Ausführen'
      });
      return
    }

    // Validate workflow before execution
    const validation = validateCurrentWorkflow();
    if (!validation.valid) {
      errorHandlingService.handleError(new Error('Cannot execute invalid workflow'), {
        category: 'VALIDATION',
        severity: 'HIGH',
        operation: 'workflow_execution',
        userMessage: 'Cannot execute invalid workflow'
      });
      return;
    }
    
    await errorHandlingService.withErrorHandling(
      async () => {
        return await loadingStateService.withLoading('execute-workflow', 'Workflow wird ausgeführt...', async () => {
          setIsExecuting(true)
          
          try {
            // Generate execution plan
            const executionPlan = generateExecutionPlan(nodes, edges);
            console.log('Execution Plan:', executionPlan);

            // Reset all nodes to idle
            setNodes((nds) =>
              nds.map((node) => ({
                ...node,
                data: { ...node.data, status: 'idle' },
              }))
            )

            // Execute nodes in planned order
            for (const nodeId of executionPlan.execution_order) {
              const node = nodes.find(n => n.id === nodeId);
              if (!node) continue;
              
              // Set node to executing
              setNodes((nds) =>
                nds.map((n) =>
                  n.id === nodeId
                    ? { ...n, data: { ...n.data, status: 'running' } }
                    : n
                )
              )

              // Simulate processing time based on node type
              const processingTime = getNodeProcessingTime(node.data.type);
              await new Promise((resolve) => setTimeout(resolve, processingTime))

              // Set node to completed
              const success = Math.random() > 0.15 // 85% success rate
              setNodes((nds) =>
                nds.map((n) =>
                  n.id === nodeId
                    ? { ...n, data: { ...n.data, status: success ? 'success' : 'error' } }
                    : n
                )
              )
            }

            return { success: true, message: 'Workflow abgeschlossen' }
          } finally {
            setIsExecuting(false)
          }
        });
      },
      {
        operation: 'workflow_execution',
        context: { nodeCount: nodes.length, edgeCount: edges.length },
        retryFunction: () => executeWorkflow()
      }
    );
  }, [nodes, edges, setNodes, validateCurrentWorkflow]);

  // Get processing time based on node type
  const getNodeProcessingTime = (nodeType: string): number => {
    const processingTimes: Record<string, number> = {
      'manual_trigger': 100,
      'click_action': 500,
      'ocr_text': 800,
      'screenshot': 600,
      'type_text': 700,
      'http_request': 1200,
      'condition': 200,
      'delay': 1000,
      'variable': 300,
      'transform': 400
    };
    return processingTimes[nodeType] || 800;
  };
  
  // Save workflow
  const saveWorkflow = useCallback(async () => {
    await errorHandlingService.withErrorHandling(
      async () => {
        return await loadingStateService.withLoading('save-workflow', 'Saving workflow...', async () => {
          const workflowJson = exportWorkflowToJSON(nodes, edges, {
            name: 'My Workflow',
            description: 'Created with TRAE Visual Workflow System'
          });
          
          // Create download link
          const blob = new Blob([workflowJson], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `workflow_${Date.now()}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          return { success: true, message: 'Workflow saved successfully!' };
        });
      },
      {
        operation: 'save_workflow',
        context: { nodeCount: nodes.length, edgeCount: edges.length },
        retryFunction: () => saveWorkflow()
      }
    );
  }, [nodes, edges]);

  // Load workflow
  const loadWorkflow = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      await errorHandlingService.withErrorHandling(
        async () => {
          return await loadingStateService.withLoading('load-workflow', 'Loading workflow...', async () => {
            const jsonString = e.target?.result as string;
            const { nodes: loadedNodes, edges: loadedEdges } = importWorkflowFromJSON(jsonString);
            
            setNodes(loadedNodes);
            setEdges(loadedEdges);
            
            return { success: true, message: 'Workflow loaded successfully!' };
          });
        },
        {
          operation: 'load_workflow',
          context: { fileName: file.name, fileSize: file.size },
          retryFunction: () => loadWorkflow(event)
        }
      );
    };
    reader.readAsText(file);
  }, [setNodes, setEdges]);

  // Clear workspace
  const clearWorkspace = useCallback(async () => {
    await errorHandlingService.withErrorHandling(
      async () => {
        return await loadingStateService.withLoading('clear-workspace', 'Clearing workspace...', async () => {
          setNodes([])
          setEdges([])
          return { success: true, message: 'Canvas geleert' };
        });
      },
      {
        operation: 'clear_workspace',
        context: { nodeCount: nodes.length, edgeCount: edges.length }
      }
    );
  }, [setNodes, setEdges, nodes.length, edges.length])

  // Get workflow statistics
  const workflowStats = useMemo(() => {
    return getWorkflowStatistics(nodes, edges);
  }, [nodes, edges]);
  
  return (
    <>
      <div className="h-screen bg-gray-50 flex">
        {/* Node Library Sidebar - Always visible for debugging */}
      <AnimatePresence>
        {true && (
          <motion.div
            initial={{ width: 280, opacity: 1 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-sm"
          >
              {/* Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Node Bibliothek</h3>
                  <button
                    onClick={() => setShowNodePanel(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  >
                    <Layers className="w-4 h-4" />
                  </button>
                </div>
              
              {/* Category Selection */}
              <div className="space-y-1">
                {Object.entries(nodeCategories).map(([key, category]) => {
                  const IconComponent = category.icon
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(key)}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors ${
                        selectedCategory === key
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className={`p-1 rounded ${category.color}`}>
                        <IconComponent className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm font-medium">{category.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            
            {/* Node List */}
            <div className="p-4 overflow-y-auto flex-1">
              {/* Debug info */}
              <div className="mb-2 text-xs text-gray-500">
                Selected: {selectedCategory || 'none'} | Available: {Object.keys(nodeCategories).join(', ')}
              </div>
              
              {(() => {
                console.log('TRAE DEBUG: Rendering node list');
                console.log('TRAE DEBUG: selectedCategory:', selectedCategory);
                console.log('TRAE DEBUG: nodeCategories keys:', Object.keys(nodeCategories));
                console.log('TRAE DEBUG: selectedCategory exists:', selectedCategory in nodeCategories);
                if (selectedCategory && nodeCategories[selectedCategory as keyof typeof nodeCategories]) {
                  console.log('TRAE DEBUG: Category nodes:', nodeCategories[selectedCategory as keyof typeof nodeCategories].nodes);
                }
                return null;
              })()}
              
              {selectedCategory && nodeCategories[selectedCategory as keyof typeof nodeCategories] ? (
                <div className="space-y-2">
                  {nodeCategories[selectedCategory as keyof typeof nodeCategories].nodes.map((node) => {
                    const IconComponent = node.icon
                    console.log('TRAE DEBUG: Rendering node button:', node.label, node.type);
                    return (
                      <button
                        key={node.type}
                        onClick={() => addNode(node.type, selectedCategory)}
                        className="w-full flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-left group"
                      >
                        <IconComponent className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                        <span className="text-sm font-medium text-gray-900 group-hover:text-blue-900">{node.label}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  {selectedCategory ? `Category '${selectedCategory}' not found` : 'No category selected'}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Minimal Toolbar */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            {!showNodePanel && (
              <button
                onClick={() => setShowNodePanel(true)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                title="Node Bibliothek öffnen"
              >
                <Layers className="w-4 h-4" />
              </button>
            )}
            
            <button
              onClick={validateCurrentWorkflow}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Validate</span>
            </button>
            
            <button
              onClick={saveWorkflow}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Save</span>
            </button>
            
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".json"
                onChange={loadWorkflow}
                className="hidden"
              />
              <div className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                <FileText className="w-4 h-4" />
                <span>Load</span>
              </div>
            </label>
            
            <button
              onClick={executeWorkflow}
              disabled={isExecuting || nodes.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isExecuting ? <Loader className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>{isExecuting ? 'Läuft...' : 'Starten'}</span>
            </button>
            
            <button
              onClick={clearWorkspace}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Löschen</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{nodes.length}</span> Nodes • <span className="font-medium">{edges.length}</span> Verbindungen
            </div>
          </div>
        </div>
        
        {/* React Flow Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes as any}
            fitView
            className="bg-gray-50"
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            onInit={(reactFlowInstance) => {
              // Make React Flow instance globally accessible for ManualTriggerNode
              (window as any).reactFlowInstance = reactFlowInstance;
              console.log('TRAE DEBUG: React Flow instance initialized and made globally accessible');
            }}
          >
            <Background color="#f3f4f6" gap={20} />
            <Controls className="bg-white border border-gray-200 rounded-lg shadow-sm" />
            <MiniMap 
              className="bg-white border border-gray-200 rounded-lg shadow-sm"
              nodeColor="#3b82f6"
              maskColor="rgba(0, 0, 0, 0.1)"
            />
          </ReactFlow></div>
        </div>
        
        {/* Workflow Status Bar */}
        <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg p-3 shadow-lg">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Nodes: {workflowStats.nodeCount || 0}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Connections: {workflowStats.edgeCount || 0}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Triggers: {workflowStats.nodesByCategory.trigger || 0}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                Actions: {workflowStats.nodesByCategory.action || 0}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {workflowStats.nodeCount > 0 && (
                <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                  Complexity: {workflowStats.complexity}
                </span>
              )}
              {isExecuting && (
                <span className="flex items-center gap-1 text-blue-600">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Executing...
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// Main component with React Flow Provider
const UnifiedWorkspace = () => {
  return (
    <ReactFlowProvider>
      <MinimalisticCanvasContent />
    </ReactFlowProvider>
  )
}

export default UnifiedWorkspace