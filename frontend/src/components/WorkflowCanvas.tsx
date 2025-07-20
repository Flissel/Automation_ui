/**
 * TRAE Visual Workflow System - Workflow Canvas Component
 * 
 * Enhanced React Flow canvas with full backend integration
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  NodeTypes,
  EdgeTypes,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { toast } from 'react-hot-toast';
import { errorHandlingService } from '../services/ErrorHandlingService';
import { loadingStateService } from '../services/LoadingStateService';

import {
  WorkflowGraph,
  NodeData,
  WorkflowEdge,
  NodeType,
  NodeCategory,
  NodeStatus,
  WorkflowExecution,
  OutputPort,
} from '../types';
import { useWorkflows, useWorkflowExecution } from '../hooks';
import { DataType } from '../types';
import { validateConnection } from '../utils/connectionValidator';
import CustomNode from './nodes/CustomNode';
import LiveDesktopNode from './nodes/LiveDesktopNode';
import RealtimeOCRActionNode from './nodes/RealtimeOCRActionNode';
import OCRNode from './nodes/OCRNode';
import ClickActionNode from './nodes/ClickActionNode';
import LoggingNode from './nodes/LoggingNode';
import SnapshotDesignerNode from './nodes/SnapshotDesignerNode';
import SnapshotOCRExecutorNode from './nodes/SnapshotOCRExecutorNode';
import SnapshotClickExecutorNode from './nodes/SnapshotClickExecutorNode';
import ManualTriggerNode from './nodes/ManualTriggerNode';
import ScreenshotActionNode from './nodes/ScreenshotActionNode';
import TypeTextActionNode from './nodes/TypeTextActionNode';
import HttpRequestActionNode from './nodes/HttpRequestActionNode';
import FileWatcherNode from './nodes/FileWatcherNode';
import ScheduleTriggerNode from './nodes/ScheduleTriggerNode';
import WebhookTriggerNode from './nodes/WebhookTriggerNode';
import WorkflowToolbar from './WorkflowToolbar';
import NodeLibrary from './NodeLibrary';
import PropertyPanel from './PropertyPanel';
import ExecutionMonitor from './ExecutionMonitor';
import EnhancedEdge, { EnhancedEdgeData } from './EnhancedEdge';

// Define custom node types - mapping all node types to their specific components
const nodeTypes: NodeTypes = {
  // Base types
  custom: CustomNode,
  trigger: CustomNode,
  event_trigger: CustomNode,
  condition: CustomNode,
  variable: CustomNode,
  constant: CustomNode,
  data_transform: CustomNode,
  
  // Trigger nodes
  manual_trigger: ManualTriggerNode as any,
  file_watcher: FileWatcherNode as any,
  schedule_trigger: ScheduleTriggerNode as any,
  webhook_trigger: WebhookTriggerNode as any,
  live_desktop: LiveDesktopNode,
  
  // Action nodes
  click_action: ClickActionNode,
  ocr_action: OCRNode,
  ocr_region: OCRNode,
  realtime_ocr_action: RealtimeOCRActionNode,
  screenshot_action: ScreenshotActionNode as any,
  type_text_action: TypeTextActionNode as any,
  http_request_action: HttpRequestActionNode as any,
  
  // Logic nodes
  if_condition: CustomNode,
  loop: CustomNode,
  switch: CustomNode,
  delay: CustomNode,
  
  // Data nodes
  variable_store: CustomNode,
  json_parser: CustomNode,
  text_processor: CustomNode,
  data_transformer: CustomNode,
  
  // Snapshot nodes
  snapshot_creator: SnapshotDesignerNode,
  ocr_zone_designer: SnapshotDesignerNode,
  click_zone_designer: SnapshotDesignerNode,
  snapshot_ocr_executor: SnapshotOCRExecutorNode,
  snapshot_click_executor: SnapshotClickExecutorNode,
  template_manager: CustomNode,
  
  // Utility nodes
  logging: LoggingNode,
  
  // Advanced automation nodes
  ocr_click_pattern_monitor: CustomNode,
  enhanced_ocr_monitor: CustomNode,
  ocr_text_tracker: CustomNode,
};

// Define custom edge types with enhanced visualization
const edgeTypes: EdgeTypes = {
  default: EnhancedEdge,
  enhanced: EnhancedEdge,
};

interface WorkflowCanvasProps {
  workflowId?: string;
  readOnly?: boolean;
  onWorkflowChange?: (workflow: WorkflowGraph) => void;
  onExecutionStart?: (executionId: string) => void;
}

const WorkflowCanvasInner: React.FC<WorkflowCanvasProps> = ({
  workflowId,
  readOnly = false,
  onWorkflowChange,
  onExecutionStart,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [isPropertyPanelOpen, setIsPropertyPanelOpen] = useState(false);
  const [currentExecution, setCurrentExecution] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [isDirty, setIsDirty] = useState(false);

  const reactFlowInstance = useReactFlow();
  const { workflows, createWorkflow, updateWorkflow, executeWorkflow } = useWorkflows();
  const { execution, loading: executionLoading } = useWorkflowExecution(currentExecution);

  // Load workflow if workflowId is provided
  useEffect(() => {
    if (workflowId && workflows.length > 0) {
      const workflow = workflows.find(w => w.id === workflowId);
      if (workflow) {
        setWorkflowName(workflow.name);
        setNodes(workflow.nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: {
            ...node,
            status: 'idle' as NodeStatus,
          },
        })));
        setEdges(workflow.edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
        })));
        setIsDirty(false);
      }
    }
  }, [workflowId, workflows]);

  // Update execution status on nodes and edges
  useEffect(() => {
    if (execution && execution.node_results) {
      // Update node statuses
      setNodes(currentNodes => 
        currentNodes.map(node => {
          const result = execution.node_results[node.id];
          if (result) {
            return {
              ...node,
              data: {
                ...node.data,
                status: result.success ? 'completed' : 'error',
                executionResult: result,
              },
            };
          }
          return node;
        })
      );
      
      // Update edge data flow indicators
      setEdges(currentEdges => 
        currentEdges.map(edge => {
          const sourceResult = execution.node_results[edge.source];
          const targetResult = execution.node_results[edge.target];
          
          if (edge.data && (sourceResult || targetResult)) {
            const hasData = sourceResult?.success && sourceResult.outputs;
            const isActive = false; // TODO: Add status tracking for execution results
            
            return {
              ...edge,
              data: {
                ...edge.data,
                hasData,
                isActive,
                lastDataTransfer: hasData ? new Date().toISOString() : edge.data.lastDataTransfer,
                transferCount: hasData ? (edge.data.transferCount || 0) + 1 : edge.data.transferCount,
              },
            };
          }
          return edge;
        })
      );
    }
  }, [execution, setNodes, setEdges]);

  // Handle node connections with validation
  const onConnect = useCallback(
    (params: Connection) => {
      if (readOnly) return;
      
      // Find source and target nodes
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);
      
      if (!sourceNode || !targetNode) {
        errorHandlingService.handleError(
          new Error('Invalid connection: nodes not found'),
          {
            operation: 'node_connection',
            sourceId: params.source,
            targetId: params.target
          }
        );
        return;
      }
      
      // Validate connection
      const validation = validateConnection(params, nodes);
      
      if (!validation.valid) {
        errorHandlingService.handleError(
          new Error(`Connection validation failed: ${validation.error}`),
          {
            operation: 'connection_validation',
            sourceId: params.source,
            targetId: params.target,
            validationError: validation.error
          }
        );
        return;
      }
      
      // Determine data type for the connection
      const sourceOutput = sourceNode.data.outputs?.find((o: OutputPort) => o.id === params.sourceHandle);
      const dataType = sourceOutput?.type || DataType.ANY;
      
      // Create enhanced edge with data flow information
      const enhancedEdgeData: EnhancedEdgeData = {
        dataType,
        isActive: false,
        hasData: false,
        sourceName: sourceNode.data.label,
        targetName: targetNode.data.label,
        transferCount: 0,
      };
      
      const newEdge = {
        ...params,
        id: `edge-${params.source}-${params.target}-${Date.now()}`,
        type: 'enhanced',
        data: enhancedEdgeData,
      };
      
      setEdges((eds) => addEdge(newEdge, eds));
      setIsDirty(true);
      toast.success('Connection created successfully!');
    },
    [readOnly, nodes, setEdges]
  );

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setIsPropertyPanelOpen(true);
  }, []);

  // Handle node data updates
  const onNodeDataChange = useCallback((nodeId: string, newData: Partial<NodeData>) => {
    if (readOnly) return;
    
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...newData,
            },
          };
        }
        return node;
      })
    );
    setIsDirty(true);
  }, [readOnly, setNodes]);

  // Add new node from library
  const onAddNode = useCallback((nodeType: string, nodeCategory: NodeCategory) => {
    if (readOnly) return;
    
    const position = reactFlowInstance.screenToFlowPosition({
      x: Math.random() * 400 + 100,
      y: Math.random() * 400 + 100,
    });

    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: nodeType,
      position,
      data: {
        label: `${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} Node`,
        type: nodeType,
        category: nodeCategory,
        status: 'idle',
        config: {},
        inputs: {},
        outputs: {},
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setSelectedNode(newNode);
    setIsPropertyPanelOpen(true);
    setIsDirty(true);
  }, [readOnly, reactFlowInstance, setNodes]);

  // Delete selected node
  const onDeleteNode = useCallback((nodeId: string) => {
    if (readOnly) return;
    
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
      setIsPropertyPanelOpen(false);
    }
    setIsDirty(true);
  }, [readOnly, selectedNode, setNodes, setEdges]);

  // Save workflow
  const onSaveWorkflow = useCallback(async () => {
    const { data, error } = await errorHandlingService.withErrorHandling(
      async () => {
        return await loadingStateService.withLoading(
          'save-workflow',
          'Saving workflow...',
          async () => {
            const workflowData: Partial<WorkflowGraph> = {
              name: workflowName,
              nodes: nodes.map(node => ({
                id: node.id,
                type: node.type as NodeType,
                position: node.position,
                data: node.data,
                label: node.data?.label || node.type,
                description: node.data?.description || '',
                icon: node.data?.icon || '⚙️',
                category: node.data?.category || 'unknown',
                inputs: node.data?.inputs || [],
                outputs: node.data?.outputs || [],
                config: node.data?.config || {},
                template: node.data?.template || node.type,
                color: node.data?.color || '#6b7280',
                status: node.data?.status || 'idle',
                metadata: node.data?.metadata || {}
              })),
              edges: edges.map(edge => ({
                id: edge.id,
                source: edge.source,
                target: edge.target,
                sourceHandle: edge.sourceHandle || 'output',
                targetHandle: edge.targetHandle || 'input',
              })),
            };

            let savedWorkflow;
            if (workflowId) {
              savedWorkflow = await updateWorkflow(workflowId, workflowData);
              toast.success('Workflow updated successfully!');
            } else {
              savedWorkflow = await createWorkflow(workflowData);
              toast.success('Workflow created successfully!');
            }

            return savedWorkflow;
          }
        );
      },
      {
        operation: 'workflow_save',
        workflowName,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        retryFunction: () => onSaveWorkflow()
      }
    );

    if (data) {
      if (onWorkflowChange) {
        onWorkflowChange(data);
      }
      setIsDirty(false);
    }
  }, [workflowId, workflowName, nodes, edges, updateWorkflow, createWorkflow, onWorkflowChange]);

  // Execute workflow
  const onExecuteWorkflow = useCallback(async () => {
    if (!workflowId) {
      errorHandlingService.handleError(
        new Error('Workflow must be saved before execution'),
        {
          operation: 'workflow_execution_validation',
          workflowId: null
        }
      );
      return;
    }

    await errorHandlingService.withErrorHandling(
      async () => {
        return await loadingStateService.withLoading(
          'execute-workflow',
          'Starting workflow execution...',
          async () => {
            // Reset node statuses
            setNodes(currentNodes =>
              currentNodes.map(node => ({
                ...node,
                data: {
                  ...node.data,
                  status: 'idle' as NodeStatus,
                  executionResult: undefined,
                },
              }))
            );

            const result = await executeWorkflow(workflowId);
            
            if (result?.id) {
              setCurrentExecution(result.id);
              if (onExecutionStart) {
                onExecutionStart(result.id);
              }
              toast.success('Workflow execution started!');
            }
            
            return result;
          }
        );
      },
      {
        operation: 'workflow_execution',
        workflowId,
        retryFunction: () => onExecuteWorkflow(),
        executeFunction: (id: string) => executeWorkflow(id)
      }
    );
  }, [workflowId, executeWorkflow, onExecutionStart, setNodes]);

  // Clear canvas
  const onClearCanvas = useCallback(() => {
    if (readOnly) return;
    
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setIsPropertyPanelOpen(false);
    setCurrentExecution(null);
    setIsDirty(true);
  }, [readOnly, setNodes, setEdges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (readOnly) return;
      
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 's':
            event.preventDefault();
            onSaveWorkflow();
            break;
          case 'Delete':
          case 'Backspace':
            if (selectedNode) {
              event.preventDefault();
              onDeleteNode(selectedNode.id);
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [readOnly, selectedNode, onSaveWorkflow, onDeleteNode]);

  const canvasStyle = useMemo(() => ({
    width: '100%',
    height: '100%',
    backgroundColor: '#f8fafc',
  }), []);

  return (
    <div className="workflow-canvas-container" style={{ display: 'flex', height: '100vh' }}>
      {/* Node Library Sidebar */}
      {isLibraryOpen && (
        <div style={{ width: '300px', borderRight: '1px solid #e2e8f0' }}>
          <NodeLibrary onAddNode={onAddNode} />
        </div>
      )}

      {/* Main Canvas Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <WorkflowToolbar
          workflowName={workflowName}
          onWorkflowNameChange={setWorkflowName}
          onSave={onSaveWorkflow}
          onExecute={onExecuteWorkflow}
          onClear={onClearCanvas}
          onToggleLibrary={() => setIsLibraryOpen(!isLibraryOpen)}
          onToggleProperties={() => setIsPropertyPanelOpen(!isPropertyPanelOpen)}
          isDirty={isDirty}
          isExecuting={executionLoading}
          readOnly={readOnly}
        />

        {/* React Flow Canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            style={canvasStyle}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            minZoom={0.1}
            maxZoom={2}
            attributionPosition="bottom-left"
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#cbd5e1"
            />
            <Controls position="bottom-right" />
            <MiniMap
              position="bottom-left"
              nodeColor={(node) => {
                switch (node.data?.status) {
                  case 'running': return '#3b82f6';
                  case 'completed': return '#10b981';
                  case 'error': return '#ef4444';
                  default: return '#6b7280';
                }
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
            />
          </ReactFlow>

          {/* Execution Monitor Overlay */}
          {currentExecution && (
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              zIndex: 1000,
            }}>
              <ExecutionMonitor
                executionId={currentExecution}
                onClose={() => setCurrentExecution(null)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Property Panel Sidebar */}
      {isPropertyPanelOpen && selectedNode && (
        <div style={{ width: '350px', borderLeft: '1px solid #e2e8f0' }}>
          <PropertyPanel
            node={selectedNode}
            onNodeDataChange={onNodeDataChange}
            onDeleteNode={onDeleteNode}
            onClose={() => setIsPropertyPanelOpen(false)}
            readOnly={readOnly}
          />
        </div>
      )}
    </div>
  );
};

// Wrapper component with ReactFlowProvider
const WorkflowCanvas: React.FC<WorkflowCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
};

export default WorkflowCanvas;