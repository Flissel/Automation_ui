/**
 * TRAE Workflow Canvas Component
 * 
 * Visual workflow builder with drag-and-drop node system
 * Author: TRAE Development Team
 * Version: 2.0.0
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
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// NODE TYPES AND TEMPLATES
// ============================================================================

interface NodeTemplate {
  id: string;
  type: string;
  label: string;
  icon: React.ReactNode;
  category: string;
  description: string;
  defaultData: any;
}

const NODE_TEMPLATES: NodeTemplate[] = [
  {
    id: 'live-desktop',
    type: 'liveDesktop',
    label: 'Live Desktop',
    icon: <Monitor className="w-4 h-4" />,
    category: 'Display',
    description: 'Live desktop streaming and monitoring',
    defaultData: { title: 'Live Desktop', fps: 10, quality: 75 }
  },
  {
    id: 'click-action',
    type: 'clickAction',
    label: 'Click Action',
    icon: <Mouse className="w-4 h-4" />,
    category: 'Actions',
    description: 'Automated mouse click actions',
    defaultData: { title: 'Click Action', x: 0, y: 0 }
  },
  {
    id: 'type-text',
    type: 'typeText',
    label: 'Type Text',
    icon: <Keyboard className="w-4 h-4" />,
    category: 'Actions',
    description: 'Automated text input',
    defaultData: { title: 'Type Text', text: '' }
  },
  {
    id: 'screenshot',
    type: 'screenshot',
    label: 'Screenshot',
    icon: <Camera className="w-4 h-4" />,
    category: 'Capture',
    description: 'Take screenshot of desktop',
    defaultData: { title: 'Screenshot', format: 'png' }
  },
  {
    id: 'schedule',
    type: 'schedule',
    label: 'Schedule',
    icon: <Clock className="w-4 h-4" />,
    category: 'Triggers',
    description: 'Schedule workflow execution',
    defaultData: { title: 'Schedule', interval: '1h' }
  },
  {
    id: 'webhook',
    type: 'webhook',
    label: 'Webhook',
    icon: <Globe className="w-4 h-4" />,
    category: 'Triggers',
    description: 'HTTP webhook trigger',
    defaultData: { title: 'Webhook', url: '' }
  },
  {
    id: 'database',
    type: 'database',
    label: 'Database',
    icon: <Database className="w-4 h-4" />,
    category: 'Data',
    description: 'Database operations',
    defaultData: { title: 'Database', query: '' }
  }
];

// ============================================================================
// CUSTOM NODE COMPONENT
// ============================================================================

const CustomNode = ({ data, isConnectable }: any) => {
  const template = NODE_TEMPLATES.find(t => t.type === data.type);
  
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-muted min-w-[150px] relative">
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white"
        style={{ left: -6 }}
      />
      
      <div className="flex items-center space-x-2">
        {template?.icon}
        <div className="text-sm font-medium">{data.title || template?.label}</div>
      </div>
      
      <div className="mt-2 text-xs text-muted-foreground">
        {template?.description}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 rounded-full bg-green-500 border-2 border-white"
        style={{ right: -6 }}
      />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
  liveDesktop: CustomNode,
  clickAction: CustomNode,
  typeText: CustomNode,
  screenshot: CustomNode,
  schedule: CustomNode,
  webhook: CustomNode,
  database: CustomNode,
};

// ============================================================================
// NODE LIBRARY SIDEBAR
// ============================================================================

const NodeLibrary: React.FC<{ onAddNode: (template: NodeTemplate) => void }> = ({ onAddNode }) => {
  const categories = [...new Set(NODE_TEMPLATES.map(t => t.category))];

  return (
    <Card className="w-64 h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Node Library</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map(category => (
          <div key={category}>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
              {category}
            </h4>
            <div className="space-y-1">
              {NODE_TEMPLATES.filter(t => t.category === category).map(template => (
                <Button
                  key={template.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-auto p-2"
                  onClick={() => onAddNode(template)}
                >
                  <div className="flex items-start space-x-2">
                    {template.icon}
                    <div className="text-left">
                      <div className="text-xs font-medium">{template.label}</div>
                      <div className="text-xs text-muted-foreground truncate">
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
// WORKFLOW CANVAS COMPONENT
// ============================================================================

const WorkflowCanvasInner: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();
  const reactFlowInstance = useReactFlow();

  // ============================================================================
  // NODE MANAGEMENT
  // ============================================================================

  const onConnect = useCallback(
    (params: Connection) => {
      const edge = {
        ...params,
        id: `edge-${params.source}-${params.target}-${Date.now()}`,
        type: 'default',
        animated: true,
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges]
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
        type: template.type
      },
    };
    
    setNodes((nds) => [...nds, newNode]);
    
    toast({
      title: "Node Added",
      description: `${template.label} node added to workflow`,
    });
  }, [setNodes, toast]);

  // ============================================================================
  // WORKFLOW OPERATIONS
  // ============================================================================

  const executeWorkflow = useCallback(async () => {
    if (nodes.length === 0) {
      toast({
        title: "No Workflow",
        description: "Add nodes to create a workflow first",
        variant: "destructive",
      });
      return;
    }

    setIsExecuting(true);
    
    try {
      // Simulate workflow execution
      toast({
        title: "Executing Workflow",
        description: "Running automation workflow...",
      });

      // In a real implementation, this would execute the actual workflow
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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
        edgeCount: edges.length
      }
    };

    const blob = new Blob([JSON.stringify(workflow, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Workflow Saved",
      description: "Workflow downloaded as JSON file",
    });
  }, [nodes, edges, toast]);

  const clearWorkflow = useCallback(() => {
    setNodes([]);
    setEdges([]);
    toast({
      title: "Workflow Cleared",
      description: "All nodes and connections removed",
    });
  }, [setNodes, setEdges, toast]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="flex h-full">
      {/* Node Library Sidebar */}
      <NodeLibrary onAddNode={addNode} />

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-3 border-b bg-muted/50">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-semibold">Workflow Canvas</h2>
            <span className="text-sm text-muted-foreground">
              {nodes.length} nodes, {edges.length} connections
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={executeWorkflow}
              disabled={isExecuting || nodes.length === 0}
              size="sm"
            >
              <Play className="w-4 h-4 mr-2" />
              {isExecuting ? 'Executing...' : 'Execute'}
            </Button>
            
            <Button
              onClick={saveWorkflow}
              variant="outline"
              size="sm"
              disabled={nodes.length === 0}
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            
            <Button
              onClick={clearWorkflow}
              variant="outline"
              size="sm"
              disabled={nodes.length === 0}
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
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Controls />
            <MiniMap />
            <Background gap={12} size={1} />
          </ReactFlow>
        </div>
      </div>
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