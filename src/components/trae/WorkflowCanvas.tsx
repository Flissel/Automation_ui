/**
 * TRAE Desktop Automation Workflow Canvas
 * 
 * Professional workflow builder for desktop automation tasks
 * Author: TRAE Development Team
 * Version: 3.0.0
 */

import React, { useState, useCallback, useMemo } from 'react';
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
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Play, 
  Save, 
  Upload, 
  Download,
  Trash2,
  Settings,
  Plus,
  Monitor,
  Mouse,
  Keyboard,
  Camera,
  Clock,
  Globe,
  Database,
  Eye,
  Zap,
  GitBranch,
  FileText,
  Timer,
  Webhook,
  Search,
  RotateCcw,
  Pause,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// NODE CONFIGURATION INTERFACES
// ============================================================================

interface BaseNodeData {
  id: string;
  type: string;
  label: string;
  description?: string;
  isConfigured?: boolean;
}

interface ClickNodeData extends BaseNodeData {
  x: number;
  y: number;
  clickType: 'left' | 'right' | 'double';
  waitAfter: number;
}

interface TypeNodeData extends BaseNodeData {
  text: string;
  delay: number;
  clearBefore: boolean;
}

interface ScreenshotNodeData extends BaseNodeData {
  region: { x: number; y: number; width: number; height: number } | null;
  filename: string;
  format: 'png' | 'jpg';
}

interface OCRNodeData extends BaseNodeData {
  region: { x: number; y: number; width: number; height: number } | null;
  confidence: number;
  outputVariable: string;
}

interface WaitNodeData extends BaseNodeData {
  duration: number;
  waitType: 'fixed' | 'element' | 'condition';
}

interface APINodeData extends BaseNodeData {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: string;
  body: string;
  outputVariable: string;
}

// ============================================================================
// NODE TEMPLATES
// ============================================================================

interface NodeTemplate {
  id: string;
  type: string;
  label: string;
  icon: React.ReactNode;
  category: string;
  description: string;
  color: string;
  defaultData: any;
}

const NODE_TEMPLATES: NodeTemplate[] = [
  // Triggers
  {
    id: 'start',
    type: 'start',
    label: 'Start',
    icon: <Play className="w-4 h-4" />,
    category: 'Triggers',
    description: 'Workflow starting point',
    color: 'border-green-500 bg-green-50',
    defaultData: { label: 'Start Workflow' }
  },
  {
    id: 'schedule',
    type: 'schedule',
    label: 'Schedule',
    icon: <Clock className="w-4 h-4" />,
    category: 'Triggers',
    description: 'Run on schedule (cron)',
    color: 'border-blue-500 bg-blue-50',
    defaultData: { label: 'Schedule', cron: '0 9 * * *', timezone: 'UTC' }
  },
  {
    id: 'webhook',
    type: 'webhook',
    label: 'Webhook',
    icon: <Webhook className="w-4 h-4" />,
    category: 'Triggers',
    description: 'HTTP webhook trigger',
    color: 'border-purple-500 bg-purple-50',
    defaultData: { label: 'Webhook', endpoint: '/trigger', method: 'POST' }
  },

  // Desktop Actions
  {
    id: 'click',
    type: 'click',
    label: 'Click',
    icon: <Mouse className="w-4 h-4" />,
    category: 'Desktop Actions',
    description: 'Click at coordinates',
    color: 'border-orange-500 bg-orange-50',
    defaultData: { label: 'Click', x: 100, y: 100, clickType: 'left', waitAfter: 500 }
  },
  {
    id: 'type',
    type: 'type',
    label: 'Type Text',
    icon: <Keyboard className="w-4 h-4" />,
    category: 'Desktop Actions',
    description: 'Type text input',
    color: 'border-orange-500 bg-orange-50',
    defaultData: { label: 'Type Text', text: '', delay: 50, clearBefore: false }
  },
  {
    id: 'screenshot',
    type: 'screenshot',
    label: 'Screenshot',
    icon: <Camera className="w-4 h-4" />,
    category: 'Desktop Actions',
    description: 'Capture screen region',
    color: 'border-orange-500 bg-orange-50',
    defaultData: { label: 'Screenshot', region: null, filename: 'capture.png', format: 'png' }
  },
  {
    id: 'ocr',
    type: 'ocr',
    label: 'OCR Text',
    icon: <Search className="w-4 h-4" />,
    category: 'Desktop Actions',
    description: 'Extract text from screen',
    color: 'border-orange-500 bg-orange-50',
    defaultData: { label: 'OCR Text', region: null, confidence: 0.8, outputVariable: 'ocrResult' }
  },

  // Logic & Control
  {
    id: 'wait',
    type: 'wait',
    label: 'Wait',
    icon: <Timer className="w-4 h-4" />,
    category: 'Logic & Control',
    description: 'Pause execution',
    color: 'border-yellow-500 bg-yellow-50',
    defaultData: { label: 'Wait', duration: 1000, waitType: 'fixed' }
  },
  {
    id: 'condition',
    type: 'condition',
    label: 'If Condition',
    icon: <GitBranch className="w-4 h-4" />,
    category: 'Logic & Control',
    description: 'Conditional branching',
    color: 'border-yellow-500 bg-yellow-50',
    defaultData: { label: 'If Condition', condition: '', variable: '', operator: '==', value: '' }
  },
  {
    id: 'loop',
    type: 'loop',
    label: 'Loop',
    icon: <RotateCcw className="w-4 h-4" />,
    category: 'Logic & Control',
    description: 'Repeat actions',
    color: 'border-yellow-500 bg-yellow-50',
    defaultData: { label: 'Loop', iterations: 5, condition: '' }
  },

  // Data & API
  {
    id: 'variable',
    type: 'variable',
    label: 'Set Variable',
    icon: <FileText className="w-4 h-4" />,
    category: 'Data & API',
    description: 'Store data in variable',
    color: 'border-indigo-500 bg-indigo-50',
    defaultData: { label: 'Set Variable', variableName: '', value: '', type: 'string' }
  },
  {
    id: 'api',
    type: 'api',
    label: 'API Request',
    icon: <Globe className="w-4 h-4" />,
    category: 'Data & API',
    description: 'HTTP API call',
    color: 'border-indigo-500 bg-indigo-50',
    defaultData: { label: 'API Request', url: '', method: 'GET', headers: '{}', body: '', outputVariable: 'apiResponse' }
  },
  
  // End
  {
    id: 'end',
    type: 'end',
    label: 'End',
    icon: <CheckCircle className="w-4 h-4" />,
    category: 'Control',
    description: 'Workflow endpoint',
    color: 'border-red-500 bg-red-50',
    defaultData: { label: 'End Workflow', success: true }
  }
];

// ============================================================================
// CUSTOM NODE COMPONENT
// ============================================================================

const AutomationNode = ({ data, selected }: any) => {
  const template = NODE_TEMPLATES.find(t => t.type === data.type);
  const isConfigured = data.isConfigured || false;
  
  return (
    <div className={`
      px-3 py-2 shadow-lg rounded-lg border-2 min-w-[160px] relative
      ${template?.color || 'border-gray-300 bg-gray-50'}
      ${selected ? 'ring-2 ring-blue-400' : ''}
      ${!isConfigured && data.type !== 'start' && data.type !== 'end' ? 'border-dashed opacity-70' : ''}
    `}>
      {/* Input Handle (except for start nodes) */}
      {data.type !== 'start' && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 rounded-full bg-gray-400 border-2 border-white"
          style={{ left: -6 }}
        />
      )}
      
      <div className="flex items-center space-x-2 mb-1">
        <div className="flex-shrink-0">
          {template?.icon}
        </div>
        <div className="text-sm font-semibold text-gray-800 truncate">
          {data.label || template?.label}
        </div>
      </div>
      
      <div className="text-xs text-gray-600 mb-2">
        {template?.description}
      </div>

      {/* Configuration Status */}
      {!isConfigured && data.type !== 'start' && data.type !== 'end' && (
        <div className="flex items-center space-x-1 text-xs text-orange-600">
          <AlertCircle className="w-3 h-3" />
          <span>Not configured</span>
        </div>
      )}

      {/* Output Handle (except for end nodes) */}
      {data.type !== 'end' && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 rounded-full bg-gray-400 border-2 border-white"
          style={{ right: -6 }}
        />
      )}

      {/* Special handles for condition nodes */}
      {data.type === 'condition' && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="w-3 h-3 rounded-full bg-green-500 border-2 border-white"
            style={{ bottom: -6, left: '25%' }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="w-3 h-3 rounded-full bg-red-500 border-2 border-white"
            style={{ bottom: -6, right: '25%' }}
          />
        </>
      )}
    </div>
  );
};

const nodeTypes = {
  start: AutomationNode,
  click: AutomationNode,
  type: AutomationNode,
  screenshot: AutomationNode,
  ocr: AutomationNode,
  wait: AutomationNode,
  condition: AutomationNode,
  loop: AutomationNode,
  variable: AutomationNode,
  api: AutomationNode,
  schedule: AutomationNode,
  webhook: AutomationNode,
  end: AutomationNode,
};

// ============================================================================
// NODE LIBRARY SIDEBAR
// ============================================================================

const NodeLibrary: React.FC<{ onAddNode: (template: NodeTemplate) => void }> = ({ onAddNode }) => {
  const categories = [...new Set(NODE_TEMPLATES.map(t => t.category))];

  return (
    <Card className="w-72 h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Automation Nodes</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
        {categories.map(category => (
          <div key={category}>
            <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
              {category}
            </h4>
            <div className="space-y-2">
              {NODE_TEMPLATES.filter(t => t.category === category).map(template => (
                <Button
                  key={template.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-auto p-3 text-left"
                  onClick={() => onAddNode(template)}
                >
                  <div className="flex items-start space-x-3 w-full">
                    <div className="flex-shrink-0 mt-0.5">
                      {template.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {template.label}
                      </div>
                      <div className="text-xs text-gray-500 leading-tight">
                        {template.description}
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// NODE CONFIGURATION PANEL
// ============================================================================

const NodeConfigPanel: React.FC<{ 
  selectedNode: Node | null; 
  onUpdateNode: (nodeId: string, data: any) => void;
  onClose: () => void;
}> = ({ selectedNode, onUpdateNode, onClose }) => {
  const [config, setConfig] = useState<any>(selectedNode?.data || {});

  const handleSave = () => {
    if (selectedNode) {
      onUpdateNode(selectedNode.id, { ...config, isConfigured: true });
      onClose();
    }
  };

  if (!selectedNode) return null;

  const template = NODE_TEMPLATES.find(t => t.type === selectedNode.data.type);

  const renderConfigForm = () => {
    switch (selectedNode.data.type) {
      case 'click':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="x">X Coordinate</Label>
                <Input
                  id="x"
                  type="number"
                  value={config.x || 0}
                  onChange={(e) => setConfig({...config, x: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <Label htmlFor="y">Y Coordinate</Label>
                <Input
                  id="y"
                  type="number"
                  value={config.y || 0}
                  onChange={(e) => setConfig({...config, y: parseInt(e.target.value)})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="clickType">Click Type</Label>
              <select 
                id="clickType"
                className="w-full p-2 border rounded"
                value={config.clickType || 'left'}
                onChange={(e) => setConfig({...config, clickType: e.target.value})}
              >
                <option value="left">Left Click</option>
                <option value="right">Right Click</option>
                <option value="double">Double Click</option>
              </select>
            </div>
            <div>
              <Label htmlFor="waitAfter">Wait After (ms)</Label>
              <Input
                id="waitAfter"
                type="number"
                value={config.waitAfter || 500}
                onChange={(e) => setConfig({...config, waitAfter: parseInt(e.target.value)})}
              />
            </div>
          </div>
        );

      case 'type':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="text">Text to Type</Label>
              <Textarea
                id="text"
                value={config.text || ''}
                onChange={(e) => setConfig({...config, text: e.target.value})}
                placeholder="Enter text to type..."
              />
            </div>
            <div>
              <Label htmlFor="delay">Typing Delay (ms)</Label>
              <Input
                id="delay"
                type="number"
                value={config.delay || 50}
                onChange={(e) => setConfig({...config, delay: parseInt(e.target.value)})}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="clearBefore"
                checked={config.clearBefore || false}
                onChange={(e) => setConfig({...config, clearBefore: e.target.checked})}
              />
              <Label htmlFor="clearBefore">Clear field before typing</Label>
            </div>
          </div>
        );

      case 'wait':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="duration">Duration (ms)</Label>
              <Input
                id="duration"
                type="number"
                value={config.duration || 1000}
                onChange={(e) => setConfig({...config, duration: parseInt(e.target.value)})}
              />
            </div>
            <div>
              <Label htmlFor="waitType">Wait Type</Label>
              <select 
                id="waitType"
                className="w-full p-2 border rounded"
                value={config.waitType || 'fixed'}
                onChange={(e) => setConfig({...config, waitType: e.target.value})}
              >
                <option value="fixed">Fixed Duration</option>
                <option value="element">Wait for Element</option>
                <option value="condition">Wait for Condition</option>
              </select>
            </div>
          </div>
        );

      case 'api':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={config.url || ''}
                onChange={(e) => setConfig({...config, url: e.target.value})}
                placeholder="https://api.example.com/endpoint"
              />
            </div>
            <div>
              <Label htmlFor="method">Method</Label>
              <select 
                id="method"
                className="w-full p-2 border rounded"
                value={config.method || 'GET'}
                onChange={(e) => setConfig({...config, method: e.target.value})}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div>
              <Label htmlFor="outputVariable">Output Variable</Label>
              <Input
                id="outputVariable"
                value={config.outputVariable || ''}
                onChange={(e) => setConfig({...config, outputVariable: e.target.value})}
                placeholder="variableName"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center text-gray-500 py-8">
            <Settings className="w-8 h-8 mx-auto mb-2" />
            <p>No configuration needed for this node type.</p>
          </div>
        );
    }
  };

  return (
    <Card className="w-80 h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center space-x-2">
          <Settings className="w-4 h-4" />
          <span>Configure Node</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
          {template?.icon}
          <div>
            <div className="font-medium">{template?.label}</div>
            <div className="text-xs text-muted-foreground">{template?.description}</div>
          </div>
        </div>

        <div>
          <Label htmlFor="nodeLabel">Node Label</Label>
          <Input
            id="nodeLabel"
            value={config.label || ''}
            onChange={(e) => setConfig({...config, label: e.target.value})}
            placeholder={template?.label}
          />
        </div>

        {renderConfigForm()}

        <div className="flex space-x-2 pt-4">
          <Button onClick={handleSave} className="flex-1">
            Save Configuration
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// WORKFLOW CANVAS COMPONENT
// ============================================================================

const WorkflowCanvasInner: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();

  const onConnect = useCallback(
    (params: Connection) => {
      // Handle special condition node connections
      const sourceNode = nodes.find(n => n.id === params.source);
      let edgeLabel = '';
      
      if (sourceNode?.data.type === 'condition') {
        edgeLabel = params.sourceHandle === 'true' ? 'True' : 'False';
      }

      const edge = {
        ...params,
        id: `edge-${params.source}-${params.target}-${Date.now()}`,
        type: 'default',
        animated: false,
        label: edgeLabel,
        style: params.sourceHandle === 'false' ? { stroke: '#ef4444' } : { stroke: '#10b981' }
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges, nodes]
  );

  const addNode = useCallback((template: NodeTemplate) => {
    const newNode: Node = {
      id: `${template.type}-${Date.now()}`,
      type: template.type,
      position: { 
        x: Math.random() * 400 + 100, 
        y: Math.random() * 300 + 100 
      },
      data: { 
        ...template.defaultData,
        type: template.type,
        isConfigured: template.type === 'start' || template.type === 'end'
      },
    };
    
    setNodes((nds) => [...nds, newNode]);
    
    toast({
      title: "Node Added",
      description: `${template.label} node added to workflow`,
    });
  }, [setNodes, toast]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const updateNode = useCallback((nodeId: string, newData: any) => {
    setNodes((nds) => nds.map(node => 
      node.id === nodeId 
        ? { ...node, data: { ...node.data, ...newData } }
        : node
    ));
  }, [setNodes]);

  const executeWorkflow = useCallback(async () => {
    const startNodes = nodes.filter(n => n.data.type === 'start');
    
    if (startNodes.length === 0) {
      toast({
        title: "No Start Node",
        description: "Add a Start node to begin your workflow",
        variant: "destructive",
      });
      return;
    }

    const unconfiguredNodes = nodes.filter(n => 
      !n.data.isConfigured && n.data.type !== 'start' && n.data.type !== 'end'
    );

    if (unconfiguredNodes.length > 0) {
      toast({
        title: "Unconfigured Nodes",
        description: `${unconfiguredNodes.length} nodes need configuration`,
        variant: "destructive",
      });
      return;
    }

    setIsExecuting(true);
    
    try {
      toast({
        title: "Executing Workflow",
        description: "Running desktop automation workflow...",
      });

      // Simulate workflow execution
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast({
        title: "Workflow Complete",
        description: `Successfully executed ${nodes.length} nodes`,
      });
    } catch (error) {
      toast({
        title: "Execution Failed",
        description: "Workflow execution encountered an error",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  }, [nodes, toast]);

  const saveWorkflow = useCallback(() => {
    const workflow = {
      nodes,
      edges,
      metadata: {
        created: new Date().toISOString(),
        nodeCount: nodes.length,
        edgeCount: edges.length,
        version: '3.0.0'
      }
    };

    const blob = new Blob([JSON.stringify(workflow, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `automation-workflow-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Workflow Saved",
      description: "Automation workflow downloaded as JSON file",
    });
  }, [nodes, edges, toast]);

  const clearWorkflow = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    toast({
      title: "Workflow Cleared",
      description: "All nodes and connections removed",
    });
  }, [setNodes, setEdges, toast]);

  const configuredCount = nodes.filter(n => n.data.isConfigured).length;
  const totalNodes = nodes.length;

  return (
    <div className="flex h-full">
      {/* Node Library Sidebar */}
      <NodeLibrary onAddNode={addNode} />

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold">Desktop Automation Workflow</h2>
            <div className="text-sm text-muted-foreground">
              {totalNodes} nodes ({configuredCount} configured), {edges.length} connections
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={executeWorkflow}
              disabled={isExecuting || totalNodes === 0}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="w-4 h-4 mr-2" />
              {isExecuting ? 'Executing...' : 'Execute'}
            </Button>
            
            <Button
              onClick={saveWorkflow}
              variant="outline"
              size="sm"
              disabled={totalNodes === 0}
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            
            <Button
              onClick={clearWorkflow}
              variant="outline"
              size="sm"
              disabled={totalNodes === 0}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>

        {/* ReactFlow Canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
            className="bg-gray-50"
          >
            <Controls />
            <MiniMap 
              nodeColor={(node) => {
                const template = NODE_TEMPLATES.find(t => t.type === node.data?.type);
                return template?.color.includes('green') ? '#22c55e' :
                       template?.color.includes('blue') ? '#3b82f6' :
                       template?.color.includes('orange') ? '#f97316' :
                       template?.color.includes('yellow') ? '#eab308' :
                       template?.color.includes('purple') ? '#a855f7' :
                       template?.color.includes('indigo') ? '#6366f1' :
                       template?.color.includes('red') ? '#ef4444' : '#6b7280';
              }}
            />
            <Background gap={20} size={1} />
          </ReactFlow>
        </div>
      </div>

      {/* Configuration Panel */}
      {selectedNode && (
        <NodeConfigPanel
          selectedNode={selectedNode}
          onUpdateNode={updateNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
};

// ============================================================================
// EXPORTED COMPONENT WITH PROVIDER
// ============================================================================

export const WorkflowCanvas: React.FC = () => {
  return (
    <ReactFlowProvider>
      <div className="h-full">
        <WorkflowCanvasInner />
      </div>
    </ReactFlowProvider>
  );
};

export default WorkflowCanvas;