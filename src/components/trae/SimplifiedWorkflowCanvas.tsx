
/**
 * Simplified Workflow Canvas - n8n Style
 * Clean, minimal workflow builder with standardized data flow
 */

import React, { useCallback, useState, useMemo, useEffect } from 'react';
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
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Play, Plus, Save, FolderOpen } from 'lucide-react';

import SimplifiedNode from './SimplifiedNode';
import { SimplifiedConnectionValidator } from './workflow/SimplifiedConnectionValidator';
import { SaveLoadDialog } from './workflow/SaveLoadDialog';
import { NodeConfigurationModal } from './workflow/NodeConfigurationModal';
import { SIMPLIFIED_NODE_TEMPLATES } from '../../config/simplifiedNodeTemplates';

// Define node types
const nodeTypes: NodeTypes = {
  simplified: SimplifiedNode,
};

interface SimplifiedWorkflowCanvasProps {
  workflowId?: string;
  readOnly?: boolean;
}

const SimplifiedWorkflowCanvasInner: React.FC<SimplifiedWorkflowCanvasProps> = ({
  workflowId,
  readOnly = false,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([
    {
      id: '1',
      type: 'simplified',
      position: { x: 250, y: 50 },
      data: { 
        ...SIMPLIFIED_NODE_TEMPLATES.manual_trigger,
        status: 'idle'
      },
    }
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isSaveLoadOpen, setIsSaveLoadOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const reactFlowInstance = useReactFlow();

  // Validate connections
  const onConnect = useCallback(
    (params: Connection) => {
      if (readOnly) return;
      
      const validation = SimplifiedConnectionValidator.validateConnection(params, nodes);
      
      if (!validation.valid) {
        toast.error(`Connection failed: ${validation.error}`);
        return;
      }
      
      if (validation.warning) {
        toast.warning(validation.warning);
      }
      
      const newEdge = {
        ...params,
        id: `edge-${params.source}-${params.target}-${Date.now()}`,
        type: 'default',
        animated: true,
        style: { stroke: '#000000', strokeWidth: 2 }
      };
      
      setEdges((eds) => addEdge(newEdge, eds));
      toast.success('Connection created!');
    },
    [readOnly, nodes, setEdges]
  );

  // Event listener for config button clicks
  useEffect(() => {
    const handleOpenNodeConfig = (event: CustomEvent) => {
      const { nodeId, nodeData } = event.detail;
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        setSelectedNode(node);
        setIsConfigModalOpen(true);
      }
    };

    window.addEventListener('openNodeConfig', handleOpenNodeConfig as EventListener);
    return () => {
      window.removeEventListener('openNodeConfig', handleOpenNodeConfig as EventListener);
    };
  }, [nodes]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    // Only for node selection - config moved to dedicated button
    console.log('Node selected:', node.id);
  }, []);

  const addNode = useCallback((templateId: string) => {
    if (readOnly) return;
    
    const template = SIMPLIFIED_NODE_TEMPLATES[templateId];
    if (!template) return;

    const position = reactFlowInstance.screenToFlowPosition({
      x: Math.random() * 400 + 100,
      y: Math.random() * 400 + 100,
    });

    const depValidation = SimplifiedConnectionValidator.checkNodeDependencies(templateId, nodes);
    
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: 'simplified',
      position,
      data: {
        ...template,
        status: 'idle',
        dependencies: template.dependencies.map(dep => ({
          ...dep,
          status: nodes.some(n => n.data?.type === dep.type) ? 'connected' : 'missing'
        }))
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setIsLibraryOpen(false);
    
    if (!depValidation.valid) {
      toast.warning(`Added ${template.label} - ${depValidation.error}`);
    } else {
      toast.success(`Added ${template.label}!`);
    }
  }, [readOnly, reactFlowInstance, setNodes, nodes]);

  const validation = useMemo(() => {
    return SimplifiedConnectionValidator.validateWorkflow(nodes, edges);
  }, [nodes, edges]);

  const templatesByCategory = useMemo(() => {
    const grouped: Record<string, typeof SIMPLIFIED_NODE_TEMPLATES[string][]> = {};
    Object.values(SIMPLIFIED_NODE_TEMPLATES).forEach(template => {
      if (!grouped[template.category]) {
        grouped[template.category] = [];
      }
      grouped[template.category].push(template);
    });
    return grouped;
  }, []);

  // Handle workflow loading
  const handleLoadWorkflow = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    setNodes(newNodes);
    setEdges(newEdges);
  }, [setNodes, setEdges]);

  // Handle node configuration updates
  const handleNodeConfigSave = useCallback((nodeId: string, newData: any) => {
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
    setIsConfigModalOpen(false);
    toast.success('Node configuration updated!');
  }, [setNodes]);

  // Handle node deletion
  const handleNodeDelete = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setIsConfigModalOpen(false);
    toast.success('Node deleted!');
  }, [setNodes, setEdges]);

  return (
    <div className="h-full flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Main Canvas */}
      <div className="flex-1 relative overflow-hidden">
        {/* Toolbar */}
        <div className="absolute top-6 left-6 z-20 flex space-x-3">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-2 flex space-x-2">
            <Button 
              onClick={() => setIsLibraryOpen(!isLibraryOpen)} 
              variant="ghost" 
              size="sm"
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Node
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              disabled={!validation.valid}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500"
            >
              <Play className="w-4 h-4 mr-2" />
              Execute
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsSaveLoadOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsSaveLoadOpen(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Load
            </Button>
          </div>
        </div>

        {/* Validation Status */}
        {!validation.valid && (
          <div className="absolute top-6 right-6 z-20">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 shadow-lg backdrop-blur-sm max-w-sm">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Workflow Issues</p>
                  <p className="text-xs text-amber-700 mt-1">{validation.error}</p>
                </div>
              </div>
            </div>
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
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          <Controls className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20" />
          <MiniMap 
            className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20"
            nodeColor={(node) => {
              switch (node.data?.status) {
                case 'running': return '#3b82f6';
                case 'completed': return '#10b981';
                case 'error': return '#ef4444';
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

      {/* Node Library Sidebar */}
      {isLibraryOpen && (
        <div className="w-80 bg-white/95 backdrop-blur-xl border-l border-white/20 shadow-2xl">
          <div className="h-full flex flex-col">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-700">Node Library</h3>
              <p className="text-sm text-slate-600 mt-1">Simplified workflow nodes</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {Object.entries(templatesByCategory).map(([category, templates]) => (
                <div key={category} className="mb-6">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 capitalize">
                    {category}
                  </h4>
                  <div className="space-y-2">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => addNode(template.id)}
                        className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                      >
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                            style={{ backgroundColor: template.color }}
                          >
                            {template.label.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-slate-800">
                              {template.label}
                            </div>
                            <div className="text-xs text-slate-600">
                              {template.description}
                            </div>
                            {template.dependencies.length > 0 && (
                              <div className="mt-1">
                                <Badge variant="outline" className="text-xs">
                                  Requires config
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Save/Load Dialog */}
      <SaveLoadDialog
        isOpen={isSaveLoadOpen}
        onClose={() => setIsSaveLoadOpen(false)}
        nodes={nodes}
        edges={edges}
        onLoadWorkflow={handleLoadWorkflow}
      />

      {/* Node Configuration Modal */}
      <NodeConfigurationModal
        node={selectedNode as any}
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onSave={handleNodeConfigSave}
        onDelete={handleNodeDelete}
      />
    </div>
  );
};

const SimplifiedWorkflowCanvas: React.FC<SimplifiedWorkflowCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <SimplifiedWorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
};

export default SimplifiedWorkflowCanvas;
