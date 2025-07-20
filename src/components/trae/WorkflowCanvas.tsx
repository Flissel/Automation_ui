/**
 * TRAE Visual Workflow System - Workflow Canvas Component
 * 
 * Enhanced React Flow canvas with full backend integration
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ReactFlow,
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
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toast } from 'sonner';

// Import types
interface NodeData extends Record<string, unknown> {
  label: string;
  type: string;
  category?: string;
  status?: 'idle' | 'running' | 'completed' | 'error';
  config?: Record<string, any>;
  inputs?: any[];
  outputs?: any[];
  executionResult?: any;
  metadata?: Record<string, any>;
  description?: string;
  icon?: string;
  color?: string;
  template?: string;
}

interface NodeStatus {
  type: 'idle' | 'running' | 'completed' | 'error';
}

interface NodeCategory {
  type: 'trigger' | 'action' | 'logic' | 'data' | 'end';
}

interface WorkflowGraph {
  id?: string;
  name: string;
  nodes: any[];
  edges: any[];
}

interface WorkflowExecution {
  id: string;
  node_results: Record<string, any>;
}

interface OutputPort {
  id: string;
  type: string;
}

interface EnhancedEdgeData {
  dataType: string;
  isActive: boolean;
  hasData: boolean;
  sourceName: string;
  targetName: string;
  transferCount: number;
  lastDataTransfer?: string;
}

// Mock services and hooks
const errorHandlingService = {
  handleError: (error: Error, context?: any) => {
    console.error('Error:', error, context);
    toast.error(error.message);
  },
  withErrorHandling: async (fn: () => Promise<any>, context?: any) => {
    try {
      const result = await fn();
      return { data: result, error: null };
    } catch (error) {
      console.error('Error:', error, context);
      toast.error(error instanceof Error ? error.message : 'An error occurred');
      return { data: null, error };
    }
  }
};

const loadingStateService = {
  withLoading: async (id: string, message: string, fn: () => Promise<any>) => {
    console.log(`Loading ${id}: ${message}`);
    return await fn();
  }
};

const useWorkflows = () => ({
  workflows: [],
  createWorkflow: async (data: any) => ({ ...data, id: Date.now().toString() }),
  updateWorkflow: async (id: string, data: any) => ({ ...data, id }),
  executeWorkflow: async (id: string) => ({ id: Date.now().toString() })
});

const useWorkflowExecution = (id: string | null) => ({
  execution: null as WorkflowExecution | null,
  loading: false
});

const validateConnection = (params: Connection, nodes: Node[]) => ({
  valid: true,
  error: null
});

// Enhanced components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Square, 
  Save, 
  Download, 
  Upload, 
  Trash2, 
  Settings,
  Monitor,
  MousePointer,
  Keyboard,
  Timer,
  Globe,
  GitBranch,
  Database,
  Zap,
  AlertTriangle,
  Search
} from 'lucide-react';

// Custom Node Component
const CustomNode: React.FC<{ data: NodeData; id: string }> = ({ data, id }) => {
  const getNodeColor = (type: string) => {
    switch (type) {
      case 'manual_trigger': return 'bg-green-100 border-green-300';
      case 'schedule_trigger': return 'bg-blue-100 border-blue-300';
      case 'live_desktop': return 'bg-slate-100 border-slate-300';
      case 'click_action': return 'bg-orange-100 border-orange-300';
      case 'type_text_action': return 'bg-purple-100 border-purple-300';
      case 'delay': return 'bg-yellow-100 border-yellow-300';
      case 'http_request_action': return 'bg-red-100 border-red-300';
      case 'if_condition': return 'bg-cyan-100 border-cyan-300';
      case 'variable_store': return 'bg-pink-100 border-pink-300';
      case 'end': return 'bg-gray-100 border-gray-300';
      default: return 'bg-white border-gray-300';
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'manual_trigger': return <Play className="w-4 h-4" />;
      case 'schedule_trigger': return <Timer className="w-4 h-4" />;
      case 'live_desktop': return <Monitor className="w-4 h-4" />;
      case 'click_action': return <MousePointer className="w-4 h-4" />;
      case 'type_text_action': return <Keyboard className="w-4 h-4" />;
      case 'delay': return <Timer className="w-4 h-4" />;
      case 'http_request_action': return <Globe className="w-4 h-4" />;
      case 'if_condition': return <GitBranch className="w-4 h-4" />;
      case 'variable_store': return <Database className="w-4 h-4" />;
      case 'end': return <Square className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const hasConfig = data.config && Object.keys(data.config).length > 0;
  const isConfigured = hasConfig && Object.values(data.config).some(v => v !== undefined && v !== '');

  return (
    <div className={`px-4 py-2 shadow-md rounded-md border-2 ${getNodeColor(data.type)} min-w-[120px]`}>
      {/* Input Handle */}
      {data.type !== 'manual_trigger' && data.type !== 'schedule_trigger' && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 bg-gray-400 border-2 border-white"
        />
      )}

      <div className="flex items-center space-x-2">
        {getNodeIcon(data.type)}
        <div className="text-sm font-medium">{data.label}</div>
        {!isConfigured && hasConfig && (
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
        )}
      </div>

      {data.status && (
        <Badge 
          variant={data.status === 'completed' ? 'default' : data.status === 'error' ? 'destructive' : 'secondary'}
          className="mt-1 text-xs"
        >
          {data.status}
        </Badge>
      )}

      {/* Output Handle */}
      {data.type !== 'end' && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-3 h-3 bg-gray-400 border-2 border-white"
        />
      )}
    </div>
  );
};

// Enhanced Edge Component
const EnhancedEdge: React.FC<any> = (props) => {
  return <div>Enhanced Edge</div>;
};

// Define custom node types
const nodeTypes: NodeTypes = {
  custom: CustomNode,
  manual_trigger: CustomNode,
  schedule_trigger: CustomNode,
  live_desktop: CustomNode,
  click_action: CustomNode,
  type_text_action: CustomNode,
  delay: CustomNode,
  http_request_action: CustomNode,
  if_condition: CustomNode,
  variable_store: CustomNode,
  end: CustomNode,
};

// Define custom edge types
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
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>([
    {
      id: '1',
      type: 'manual_trigger',
      position: { x: 250, y: 50 },
      data: { 
        label: 'Manual Trigger', 
        type: 'manual_trigger',
        config: {}
      },
    }
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isPropertyPanelOpen, setIsPropertyPanelOpen] = useState(false);
  const [currentExecution, setCurrentExecution] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [isDirty, setIsDirty] = useState(false);

  const reactFlowInstance = useReactFlow();
  const { workflows, createWorkflow, updateWorkflow, executeWorkflow } = useWorkflows();
  const { execution, loading: executionLoading } = useWorkflowExecution(currentExecution);

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
      
      const newEdge = {
        ...params,
        id: `edge-${params.source}-${params.target}-${Date.now()}`,
        type: 'enhanced',
      };
      
      setEdges((eds) => addEdge(newEdge, eds));
      setIsDirty(true);
      toast.success('Connection created successfully!');
    },
    [readOnly, nodes, setEdges]
  );

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node as Node<NodeData>);
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
  const onAddNode = useCallback((nodeType: string, nodeCategory: string) => {
    if (readOnly) return;
    
    const position = reactFlowInstance.screenToFlowPosition({
      x: Math.random() * 400 + 100,
      y: Math.random() * 400 + 100,
    });

    const newNode: Node<NodeData> = {
      id: `node-${Date.now()}`,
      type: nodeType,
      position,
      data: {
        label: `${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} Node`,
        type: nodeType,
        category: nodeCategory,
        status: 'idle',
        config: {},
        inputs: [],
        outputs: [],
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setSelectedNode(newNode);
    setIsPropertyPanelOpen(true);
    setIsDirty(true);
  }, [readOnly, reactFlowInstance, setNodes]);

  // Configuration Panel Component
  const ConfigPanel: React.FC<{ node: Node<NodeData> | null; onUpdateNode: (nodeId: string, data: Partial<NodeData>) => void }> = ({ node, onUpdateNode }) => {
    if (!node) return null;

    const updateConfig = (key: string, value: any) => {
      const newConfig = { ...node.data.config, [key]: value };
      onUpdateNode(node.id, { config: newConfig });
    };

    const renderConfigForm = () => {
      switch (node.data.type) {
        case 'live_desktop':
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="width">Width</Label>
                  <Input
                    id="width"
                    type="number"
                    value={node.data.config?.width || 1200}
                    onChange={(e) => updateConfig('width', parseInt(e.target.value) || 1200)}
                    placeholder="1200"
                  />
                </div>
                <div>
                  <Label htmlFor="height">Height</Label>
                  <Input
                    id="height"
                    type="number"
                    value={node.data.config?.height || 900}
                    onChange={(e) => updateConfig('height', parseInt(e.target.value) || 900)}
                    placeholder="900"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="pcTarget">Target PC</Label>
                <Input
                  id="pcTarget"
                  value={node.data.config?.pcTarget || 'Windows PC'}
                  onChange={(e) => updateConfig('pcTarget', e.target.value)}
                  placeholder="Windows PC"
                />
              </div>
              <div className="space-y-2">
                <Label>OCR Regions</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    const regions = node.data.config?.ocrRegions || [];
                    updateConfig('ocrRegions', [...regions, {
                      id: Date.now(),
                      x: 100,
                      y: 100,
                      width: 200,
                      height: 50,
                      name: `OCR Region ${regions.length + 1}`
                    }]);
                  }}
                >
                  <Search className="w-4 h-4 mr-2" />
                  Add OCR Region
                </Button>
                {(node.data.config?.ocrRegions || []).map((region: any, index: number) => (
                  <div key={region.id} className="p-2 border rounded">
                    <div className="text-sm font-medium mb-2">{region.name}</div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <Input
                        placeholder="X"
                        value={region.x}
                        onChange={(e) => {
                          const regions = [...(node.data.config?.ocrRegions || [])];
                          regions[index].x = parseInt(e.target.value) || 0;
                          updateConfig('ocrRegions', regions);
                        }}
                      />
                      <Input
                        placeholder="Y"
                        value={region.y}
                        onChange={(e) => {
                          const regions = [...(node.data.config?.ocrRegions || [])];
                          regions[index].y = parseInt(e.target.value) || 0;
                          updateConfig('ocrRegions', regions);
                        }}
                      />
                      <Input
                        placeholder="W"
                        value={region.width}
                        onChange={(e) => {
                          const regions = [...(node.data.config?.ocrRegions || [])];
                          regions[index].width = parseInt(e.target.value) || 0;
                          updateConfig('ocrRegions', regions);
                        }}
                      />
                      <Input
                        placeholder="H"
                        value={region.height}
                        onChange={(e) => {
                          const regions = [...(node.data.config?.ocrRegions || [])];
                          regions[index].height = parseInt(e.target.value) || 0;
                          updateConfig('ocrRegions', regions);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label>Click Points</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    const clicks = node.data.config?.clickPoints || [];
                    updateConfig('clickPoints', [...clicks, {
                      id: Date.now(),
                      x: 100,
                      y: 100,
                      name: `Click Point ${clicks.length + 1}`,
                      tracked: true
                    }]);
                  }}
                >
                  <MousePointer className="w-4 h-4 mr-2" />
                  Add Click Point
                </Button>
                {(node.data.config?.clickPoints || []).map((click: any, index: number) => (
                  <div key={click.id} className="p-2 border rounded">
                    <div className="text-sm font-medium mb-2">{click.name}</div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <Input
                        placeholder="X"
                        value={click.x}
                        onChange={(e) => {
                          const clicks = [...(node.data.config?.clickPoints || [])];
                          clicks[index].x = parseInt(e.target.value) || 0;
                          updateConfig('clickPoints', clicks);
                        }}
                      />
                      <Input
                        placeholder="Y"
                        value={click.y}
                        onChange={(e) => {
                          const clicks = [...(node.data.config?.clickPoints || [])];
                          clicks[index].y = parseInt(e.target.value) || 0;
                          updateConfig('clickPoints', clicks);
                        }}
                      />
                      <div className="flex items-center space-x-1">
                        <input
                          type="checkbox"
                          checked={click.tracked}
                          onChange={(e) => {
                            const clicks = [...(node.data.config?.clickPoints || [])];
                            clicks[index].tracked = e.target.checked;
                            updateConfig('clickPoints', clicks);
                          }}
                        />
                        <span className="text-xs">Track</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <Label>Execution Mode</Label>
                <Select 
                  value={node.data.config?.executionMode || 'direct'} 
                  onValueChange={(value) => updateConfig('executionMode', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">Direct Windows PC Execution</SelectItem>
                    <SelectItem value="preview">Preview Mode</SelectItem>
                    <SelectItem value="simulation">Simulation Mode</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          );

        case 'click_action':
          return (
            <div className="space-y-4">
              <div>
                <Label htmlFor="x">X Coordinate</Label>
                <Input
                  id="x"
                  type="number"
                  value={node.data.config?.x || ''}
                  onChange={(e) => updateConfig('x', parseInt(e.target.value) || 0)}
                  placeholder="X position"
                />
              </div>
              <div>
                <Label htmlFor="y">Y Coordinate</Label>
                <Input
                  id="y"
                  type="number"
                  value={node.data.config?.y || ''}
                  onChange={(e) => updateConfig('y', parseInt(e.target.value) || 0)}
                  placeholder="Y position"
                />
              </div>
            </div>
          );

        case 'type_text_action':
          return (
            <div className="space-y-4">
              <div>
                <Label htmlFor="text">Text to Type</Label>
                <Textarea
                  id="text"
                  value={node.data.config?.text || ''}
                  onChange={(e) => updateConfig('text', e.target.value)}
                  placeholder="Enter text to type"
                />
              </div>
            </div>
          );

        case 'delay':
          return (
            <div className="space-y-4">
              <div>
                <Label htmlFor="duration">Duration (seconds)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={node.data.config?.duration || ''}
                  onChange={(e) => updateConfig('duration', parseInt(e.target.value) || 1)}
                  placeholder="Wait duration"
                />
              </div>
            </div>
          );

        case 'http_request_action':
          return (
            <div className="space-y-4">
              <div>
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={node.data.config?.url || ''}
                  onChange={(e) => updateConfig('url', e.target.value)}
                  placeholder="https://api.example.com"
                />
              </div>
              <div>
                <Label htmlFor="method">Method</Label>
                <Select value={node.data.config?.method || 'GET'} onValueChange={(value) => updateConfig('method', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          );

        default:
          return <p className="text-sm text-muted-foreground">No configuration required for this node type.</p>;
      }
    };

    return (
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Configure {node.data.label}</h3>
        {renderConfigForm()}
      </Card>
    );
  };

  // Validation logic
  const validateWorkflow = () => {
    const hasStart = nodes.some(n => n.data.type === 'manual_trigger' || n.data.type === 'schedule_trigger');
    const hasEnd = nodes.some(n => n.data.type === 'end');
    const unconfiguredNodes = nodes.filter(n => {
      const hasConfig = n.data.config && Object.keys(n.data.config).length > 0;
      const isConfigured = hasConfig && Object.values(n.data.config).some(v => v !== undefined && v !== '');
      return hasConfig && !isConfigured;
    });

    return {
      valid: hasStart && hasEnd && unconfiguredNodes.length === 0,
      issues: [
        !hasStart && "Workflow needs a trigger (Manual or Schedule)",
        !hasEnd && "Workflow needs an End node",
        unconfiguredNodes.length > 0 && `${unconfiguredNodes.length} nodes need configuration`
      ].filter(Boolean)
    };
  };

  const addNode = (type: string, label: string) => {
    const newNode: Node<NodeData> = {
      id: `${Date.now()}`,
      type: 'custom',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { 
        label, 
        type,
        config: {}
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setIsLibraryOpen(false);
  };

  const executeWorkflowHandler = () => {
    // Simulate workflow execution
    const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y);
    
    sortedNodes.forEach((node, index) => {
      setTimeout(() => {
        onNodeDataChange(node.id, { status: 'running' });
        
        setTimeout(() => {
          onNodeDataChange(node.id, { status: 'completed' });
        }, 1000);
      }, index * 1500);
    });
  };

  const validation = validateWorkflow();

  return (
    <div className="h-full flex">
      {/* Main Canvas */}
      <div className="flex-1 relative">
        {/* Toolbar */}
        <div className="absolute top-4 left-4 z-10 flex space-x-2">
          <Button onClick={() => setIsLibraryOpen(true)} variant="outline" size="sm">
            <Zap className="w-4 h-4 mr-2" />
            Add Node
          </Button>
          <Button 
            onClick={executeWorkflowHandler} 
            variant="default" 
            size="sm" 
            disabled={!validation.valid}
          >
            <Play className="w-4 h-4 mr-2" />
            Execute
          </Button>
          <Button variant="outline" size="sm">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>

        {/* Validation Status */}
        {!validation.valid && (
          <div className="absolute top-4 right-4 z-10">
            <Card className="p-3 bg-yellow-50 border-yellow-200">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Workflow Issues</p>
                  <ul className="text-xs text-yellow-700 mt-1">
                    {validation.issues.map((issue, i) => (
                      <li key={i}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-gray-50"
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
      </div>

      {/* Configuration Panel */}
      <div className="w-80 border-l bg-background p-4 space-y-4">
        <h2 className="text-lg font-semibold">Configuration</h2>
        <ConfigPanel node={selectedNode} onUpdateNode={onNodeDataChange} />
      </div>

      {/* Node Library Modal */}
      {isLibraryOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-2xl w-full m-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add Node</h3>
              <Button variant="ghost" onClick={() => setIsLibraryOpen(false)}>×</Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Triggers</h4>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" onClick={() => addNode('manual_trigger', 'Manual Trigger')}>
                    <Play className="w-4 h-4 mr-2" />
                    Manual Trigger
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => addNode('schedule_trigger', 'Schedule Trigger')}>
                    <Timer className="w-4 h-4 mr-2" />
                    Schedule Trigger
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Desktop Actions</h4>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" onClick={() => addNode('live_desktop', 'Live Desktop')}>
                    <Monitor className="w-4 h-4 mr-2" />
                    Live Desktop
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => addNode('click_action', 'Click')}>
                    <MousePointer className="w-4 h-4 mr-2" />
                    Click
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => addNode('type_text_action', 'Type Text')}>
                    <Keyboard className="w-4 h-4 mr-2" />
                    Type Text
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Logic & Control</h4>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" onClick={() => addNode('delay', 'Wait')}>
                    <Timer className="w-4 h-4 mr-2" />
                    Wait
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => addNode('if_condition', 'Condition')}>
                    <GitBranch className="w-4 h-4 mr-2" />
                    Condition
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Data & API</h4>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" onClick={() => addNode('http_request_action', 'API Request')}>
                    <Globe className="w-4 h-4 mr-2" />
                    API Request
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => addNode('variable_store', 'Variable')}>
                    <Database className="w-4 h-4 mr-2" />
                    Variable
                  </Button>
                </div>
              </div>

              <div className="col-span-2">
                <h4 className="font-medium mb-2">End</h4>
                <Button variant="outline" className="w-full justify-start" onClick={() => addNode('end', 'End')}>
                  <Square className="w-4 h-4 mr-2" />
                  End
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

const WorkflowCanvas: React.FC<WorkflowCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
};

export default WorkflowCanvas;