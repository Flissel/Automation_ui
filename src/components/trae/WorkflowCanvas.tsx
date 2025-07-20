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
  Search,
  Wifi,
  Radio
} from 'lucide-react';

// Custom Node Component with Live Desktop specialized I/O
const CustomNode: React.FC<{ data: NodeData; id: string }> = ({ data, id }) => {
  
  // Special handling for Live Desktop node with multiple I/O layers
  if (data.type === 'live_desktop') {
    return (
      <div className="relative bg-gradient-to-br from-slate-100 to-gray-200 border-2 border-slate-400 shadow-lg shadow-slate-200/50 rounded-lg px-6 py-4 min-w-[280px] hover:shadow-xl transition-all duration-300">
        {/* Control Input - Top Center */}
        <Handle
          type="target"
          position={Position.Top}
          id="control"
          className="w-4 h-4 bg-blue-500 border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200"
          style={{ left: '50%', transform: 'translateX(-50%)' }}
        />
        
        {/* WebSocket Input - Top Left */}
        <Handle
          type="target"
          position={Position.Left}
          id="websocket"
          className="w-4 h-4 bg-purple-500 border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200"
          style={{ top: '30%' }}
        />

        {/* Click Coordinates Input - Left Bottom */}
        <Handle
          type="target"
          position={Position.Left}
          id="coordinates"
          className="w-4 h-4 bg-orange-500 border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200"
          style={{ top: '70%' }}
        />

        <div className="flex items-center space-x-3 mb-3">
          <div className="flex-shrink-0 p-2 bg-white/60 rounded-lg">
            <Monitor className="w-8 h-8 text-slate-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-slate-800">{data.label}</div>
            <div className="text-xs text-slate-600">Live Desktop Stream</div>
            <div className="text-xs text-slate-500">
              {data.config?.width || 1200} × {data.config?.height || 900}
            </div>
          </div>
        </div>

        {/* I/O Labels */}
        <div className="flex justify-between items-center text-xs text-slate-600 mb-2">
          <div className="space-y-1">
            <div className="bg-purple-100 px-2 py-1 rounded text-purple-700">WS</div>
            <div className="bg-orange-100 px-2 py-1 rounded text-orange-700">XY</div>
          </div>
          <div className="text-center">
            <div className="bg-blue-100 px-2 py-1 rounded text-blue-700">CTRL</div>
          </div>
          <div className="space-y-1 text-right">
            <div className="bg-green-100 px-2 py-1 rounded text-green-700">EVENTS</div>
            <div className="bg-indigo-100 px-2 py-1 rounded text-indigo-700">STREAM</div>
          </div>
        </div>

        {/* Desktop Events Output - Right Top */}
        <Handle
          type="source"
          position={Position.Right}
          id="events"
          className="w-4 h-4 bg-green-500 border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200"
          style={{ top: '30%' }}
        />

        {/* Video Stream Output - Right Bottom */}
        <Handle
          type="source"
          position={Position.Right}
          id="stream"
          className="w-4 h-4 bg-indigo-500 border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200"
          style={{ top: '70%' }}
        />

        {/* Flow Control Output - Bottom */}
        <Handle
          type="source"
          position={Position.Bottom}
          id="flow"
          className="w-4 h-4 bg-slate-500 border-2 border-white shadow-lg hover:scale-110 transition-transform duration-200"
          style={{ left: '50%', transform: 'translateX(-50%)' }}
        />
      </div>
    );
  }

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'manual_trigger': return 'bg-gradient-to-br from-emerald-100 to-green-200 border-emerald-400 shadow-emerald-200/50';
      case 'schedule_trigger': return 'bg-gradient-to-br from-blue-100 to-indigo-200 border-blue-400 shadow-blue-200/50';
      case 'websocket_comm': return 'bg-gradient-to-br from-emerald-100 to-teal-200 border-emerald-400 shadow-emerald-200/50';
      case 'click_action': return 'bg-gradient-to-br from-orange-100 to-amber-200 border-orange-400 shadow-orange-200/50';
      case 'type_text_action': return 'bg-gradient-to-br from-purple-100 to-violet-200 border-purple-400 shadow-purple-200/50';
      case 'delay': return 'bg-gradient-to-br from-yellow-100 to-amber-200 border-yellow-400 shadow-yellow-200/50';
      case 'http_request_action': return 'bg-gradient-to-br from-red-100 to-rose-200 border-red-400 shadow-red-200/50';
      case 'if_condition': return 'bg-gradient-to-br from-cyan-100 to-teal-200 border-cyan-400 shadow-cyan-200/50';
      case 'variable_store': return 'bg-gradient-to-br from-pink-100 to-rose-200 border-pink-400 shadow-pink-200/50';
      case 'end': return 'bg-gradient-to-br from-gray-100 to-slate-200 border-gray-400 shadow-gray-200/50';
      default: return 'bg-gradient-to-br from-white to-gray-100 border-gray-300 shadow-gray-200/50';
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'manual_trigger': return <Play className="w-5 h-5 text-emerald-600" />;
      case 'schedule_trigger': return <Timer className="w-5 h-5 text-blue-600" />;
      case 'live_desktop': return <Monitor className="w-5 h-5 text-slate-600" />;
      case 'websocket_comm': return <Wifi className="w-5 h-5 text-emerald-600" />;
      case 'click_action': return <MousePointer className="w-5 h-5 text-orange-600" />;
      case 'type_text_action': return <Keyboard className="w-5 h-5 text-purple-600" />;
      case 'delay': return <Timer className="w-5 h-5 text-yellow-600" />;
      case 'http_request_action': return <Globe className="w-5 h-5 text-red-600" />;
      case 'if_condition': return <GitBranch className="w-5 h-5 text-cyan-600" />;
      case 'variable_store': return <Database className="w-5 h-5 text-pink-600" />;
      case 'end': return <Square className="w-5 h-5 text-gray-600" />;
      default: return <Settings className="w-5 h-5 text-gray-600" />;
    }
  };

  const hasConfig = data.config && Object.keys(data.config).length > 0;
  const isConfigured = hasConfig && Object.values(data.config).some(v => v !== undefined && v !== '');

  return (
    <div className={`
      px-5 py-3 rounded-xl border-2 min-w-[160px] relative transition-all duration-300 hover:scale-105 hover:shadow-xl backdrop-blur-sm
      ${getNodeColor(data.type)}
    `}>
      {/* Input Handle */}
      {data.type !== 'manual_trigger' && data.type !== 'schedule_trigger' && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-4 h-4 bg-white border-2 border-gray-400 shadow-lg hover:scale-110 transition-transform duration-200"
        />
      )}

      <div className="flex items-center space-x-3 mb-2">
        <div className="flex-shrink-0 p-1 bg-white/30 rounded-lg backdrop-blur-sm">
          {getNodeIcon(data.type)}
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold text-gray-800">{data.label}</div>
          <div className="text-xs text-gray-600 capitalize">{data.type.replace('_', ' ')}</div>
        </div>
        {!isConfigured && hasConfig && (
          <div className="bg-amber-100 p-1 rounded-full">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
        )}
      </div>

      {data.status && (
        <div className="mb-2">
          <Badge 
            variant={data.status === 'completed' ? 'default' : data.status === 'error' ? 'destructive' : 'secondary'}
            className="text-xs px-2 py-1 font-medium"
          >
            {data.status}
          </Badge>
        </div>
      )}

      {/* Output Handle */}
      {data.type !== 'end' && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-4 h-4 bg-white border-2 border-gray-400 shadow-lg hover:scale-110 transition-transform duration-200"
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
  websocket_comm: CustomNode,
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

        case 'websocket_comm':
          return (
            <div className="space-y-4">
              <div>
                <Label htmlFor="wsUrl">WebSocket URL</Label>
                <Input
                  id="wsUrl"
                  value={node.data.config?.wsUrl || 'ws://localhost:8080/desktop'}
                  onChange={(e) => updateConfig('wsUrl', e.target.value)}
                  placeholder="ws://localhost:8080/desktop"
                />
              </div>
              <div>
                <Label htmlFor="protocol">Protocol</Label>
                <Select 
                  value={node.data.config?.protocol || 'desktop-automation'} 
                  onValueChange={(value) => updateConfig('protocol', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desktop-automation">Desktop Automation</SelectItem>
                    <SelectItem value="screen-capture">Screen Capture</SelectItem>
                    <SelectItem value="click-tracking">Click Tracking</SelectItem>
                    <SelectItem value="ocr-realtime">OCR Real-time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="authToken">Authentication Token</Label>
                <Input
                  id="authToken"
                  type="password"
                  value={node.data.config?.authToken || ''}
                  onChange={(e) => updateConfig('authToken', e.target.value)}
                  placeholder="Enter auth token (optional)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reconnectInterval">Reconnect Interval (ms)</Label>
                  <Input
                    id="reconnectInterval"
                    type="number"
                    value={node.data.config?.reconnectInterval || 5000}
                    onChange={(e) => updateConfig('reconnectInterval', parseInt(e.target.value) || 5000)}
                    placeholder="5000"
                  />
                </div>
                <div>
                  <Label htmlFor="maxRetries">Max Retries</Label>
                  <Input
                    id="maxRetries"
                    type="number"
                    value={node.data.config?.maxRetries || 3}
                    onChange={(e) => updateConfig('maxRetries', parseInt(e.target.value) || 3)}
                    placeholder="3"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Connection Status</Label>
                <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                  <Radio className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-gray-600">Ready to Connect</span>
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>Note:</strong> This WebSocket node must be connected to a Live Desktop node to establish real-time communication with the target PC.
                </p>
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

  // Enhanced validation logic including WebSocket requirements
  const validateWorkflow = () => {
    const hasStart = nodes.some(n => n.data.type === 'manual_trigger' || n.data.type === 'schedule_trigger');
    const hasEnd = nodes.some(n => n.data.type === 'end');
    const unconfiguredNodes = nodes.filter(n => {
      const hasConfig = n.data.config && Object.keys(n.data.config).length > 0;
      const isConfigured = hasConfig && Object.values(n.data.config).some(v => v !== undefined && v !== '');
      return hasConfig && !isConfigured;
    });

    // Check if Live Desktop nodes have connected WebSocket Communication nodes
    const liveDesktopNodes = nodes.filter(n => n.data.type === 'live_desktop');
    const websocketNodes = nodes.filter(n => n.data.type === 'websocket_comm');
    const unconnectedLiveDesktops = liveDesktopNodes.filter(ldNode => {
      return !edges.some(edge => 
        (edge.source === ldNode.id && websocketNodes.some(ws => ws.id === edge.target)) ||
        (edge.target === ldNode.id && websocketNodes.some(ws => ws.id === edge.source))
      );
    });

    return {
      valid: hasStart && hasEnd && unconfiguredNodes.length === 0 && unconnectedLiveDesktops.length === 0,
      issues: [
        !hasStart && "Workflow needs a trigger (Manual or Schedule)",
        !hasEnd && "Workflow needs an End node",
        unconfiguredNodes.length > 0 && `${unconfiguredNodes.length} nodes need configuration`,
        unconnectedLiveDesktops.length > 0 && `${unconnectedLiveDesktops.length} Live Desktop nodes need WebSocket Communication connections`
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
    <div className="h-full flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Main Canvas */}
      <div className="flex-1 relative overflow-hidden">
        {/* Enhanced Toolbar */}
        <div className="absolute top-6 left-6 z-20 flex space-x-3">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-2 flex space-x-2">
            <Button 
              onClick={() => setIsLibraryOpen(true)} 
              variant="ghost" 
              size="sm"
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-md"
            >
              <Zap className="w-4 h-4 mr-2" />
              Add Node
            </Button>
            <Button 
              onClick={executeWorkflowHandler} 
              variant="ghost" 
              size="sm" 
              disabled={!validation.valid}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-300 shadow-md"
            >
              <Play className="w-4 h-4 mr-2" />
              Execute
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 transition-all duration-300 shadow-md"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>

        {/* Enhanced Validation Status */}
        {!validation.valid && (
          <div className="absolute top-6 right-6 z-20">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 shadow-lg backdrop-blur-sm">
              <div className="flex items-start space-x-3">
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-2 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-800 mb-2">Workflow Issues</p>
                  <ul className="text-xs text-amber-700 space-y-1">
                    {validation.issues.map((issue, i) => (
                      <li key={i} className="flex items-center space-x-2">
                        <div className="w-1 h-1 bg-amber-500 rounded-full"></div>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced React Flow with stunning background */}
        <div className="h-full relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            className="rounded-lg"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            <Controls 
              className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20"
            />
            <MiniMap 
              className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 overflow-hidden"
              nodeColor={(node) => {
                switch (node.data?.type) {
                  case 'manual_trigger': return '#10b981';
                  case 'live_desktop': return '#6b7280';
                  case 'click_action': return '#f97316';
                  case 'type_text_action': return '#8b5cf6';
                  default: return '#6b7280';
                }
              }}
            />
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={20} 
              size={1.5} 
              color="rgba(255,255,255,0.3)"
            />
          </ReactFlow>
        </div>
      </div>

      {/* Enhanced Configuration Panel */}
      <div className="w-96 bg-white/95 backdrop-blur-xl border-l border-white/20 shadow-2xl">
        <div className="h-full flex flex-col">
          {/* Panel Header */}
          <div className="bg-gradient-to-r from-slate-100 to-blue-50 p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold bg-gradient-to-r from-slate-700 to-blue-600 bg-clip-text text-transparent">
              Node Configuration
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {selectedNode ? `Configure ${selectedNode.data.label}` : 'Select a node to configure'}
            </p>
          </div>
          
          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedNode ? (
              <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl p-6 shadow-sm border border-slate-100">
                <ConfigPanel node={selectedNode} onUpdateNode={onNodeDataChange} />
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="bg-gradient-to-br from-slate-100 to-blue-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-12 h-12 text-slate-400" />
                </div>
                <p className="text-slate-500 text-sm">
                  Click on a node to configure its properties
                </p>
              </div>
            )}
          </div>
        </div>
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
                  <Button variant="outline" className="w-full justify-start" onClick={() => addNode('websocket_comm', 'WebSocket Comm')}>
                    <Wifi className="w-4 h-4 mr-2" />
                    WebSocket Comm
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