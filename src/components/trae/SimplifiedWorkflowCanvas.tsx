
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  addEdge,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Plus,
  Play,
  Save,
  FolderOpen,
  AlertTriangle,
} from 'lucide-react';
import SimplifiedNode from './SimplifiedNode';
import { SimplifiedConnectionValidator } from './workflow/SimplifiedConnectionValidator';
import { SaveLoadDialog } from './workflow/SaveLoadDialog';
import { NodeConfigurationModal } from './workflow/NodeConfigurationModal';
import { SIMPLIFIED_NODE_TEMPLATES } from '@/config/simplifiedNodeTemplates';
import { useWorkflowStore } from '@/stores/workflowStore';

const nodeTypes = {
  simplified: SimplifiedNode,
};

interface SimplifiedWorkflowCanvasProps {
  className?: string;
}

const SimplifiedWorkflowCanvasInner: React.FC<SimplifiedWorkflowCanvasProps> = ({ className }) => {
  // Store state
  const {
    nodes: storeNodes,
    edges: storeEdges,
    setNodes: setStoreNodes,
    setEdges: setStoreEdges,
    executionResults,
    isExecuting,
    validateWorkflow,
    validateNodeConfiguration,
  } = useWorkflowStore();

  // Local state for ReactFlow
  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);
  
  // UI state
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isSaveLoadOpen, setIsSaveLoadOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Create stable references for store setters
  const stableSetStoreNodes = useCallback(setStoreNodes, [setStoreNodes]);
  const stableSetStoreEdges = useCallback(setStoreEdges, [setStoreEdges]);

  // Sync nodes with store when they change
  useEffect(() => {
    const currentNodesJson = JSON.stringify(nodes);
    const storeNodesJson = JSON.stringify(storeNodes);
    
    if (currentNodesJson !== storeNodesJson) {
      stableSetStoreNodes(nodes);
    }
  }, [nodes, storeNodes, stableSetStoreNodes]);

  // Sync edges with store when they change
  useEffect(() => {
    const currentEdgesJson = JSON.stringify(edges);
    const storeEdgesJson = JSON.stringify(storeEdges);
    
    if (currentEdgesJson !== storeEdgesJson) {
      stableSetStoreEdges(edges);
    }
  }, [edges, storeEdges, stableSetStoreEdges]);

  // Update node status based on execution results
  useEffect(() => {
    if (executionResults && Object.keys(executionResults).length > 0) {
      setNodes((nds) =>
        nds.map((node) => {
          const result = executionResults[node.id];
          if (result) {
            return {
              ...node,
              data: {
                ...node.data,
                status: result.success ? 'completed' : 'error',
                result: result.result,
                error: result.error,
              },
            };
          }
          return node;
        })
      );
    }
  }, [executionResults, setNodes]);

  // Update node status during execution
  useEffect(() => {
    if (isExecuting) {
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          data: {
            ...node.data,
            status: 'running',
          },
        }))
      );
    }
  }, [isExecuting, setNodes]);

  // Handle connections with validation
  const onConnect = useCallback(
    (params: Connection) => {
      const validator = new SimplifiedConnectionValidator(nodes, edges);
      const validation = validator.validateConnection(params, nodes);
      
      if (validation.valid) {
        setEdges((eds) => addEdge(params, eds));
        toast.success('Connection created!');
      } else {
        toast.error(validation.error || 'Invalid connection');
      }
    },
    [nodes, edges, setEdges]
  );

  // Handle node clicks
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setIsConfigModalOpen(true);
  }, []);

  // Add node function with validation and dependency handling
  const addNode = useCallback((templateId: string) => {
    const template = SIMPLIFIED_NODE_TEMPLATES[templateId];
    if (!template) {
      toast.error('Template not found');
      return;
    }

    // Check if dependencies are met
    if (template.dependencies.length > 0) {
      const missingDeps = template.dependencies.filter(dep => 
        !nodes.some(node => node.data?.type === dep)
      );
      
      if (missingDeps.length > 0) {
        toast.error(`Missing dependencies: ${missingDeps.join(', ')}`);
        return;
      }
    }

    const newNode: Node = {
      id: `${template.id}-${Date.now()}`,
      type: 'simplified',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        label: template.label,
        type: template.id,
        configured: false,
        config: {},
        color: template.color,
        description: template.description,
        inputs: template.inputs,
        outputs: template.outputs,
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setIsLibraryOpen(false);
    toast.success(`${template.label} node added!`);
  }, [nodes, setNodes]);

  // Validation with memoization
  const validation = useMemo(() => {
    const connectionValidation = SimplifiedConnectionValidator.validateWorkflow(nodes, edges);
    const storeValidation = validateWorkflow();
    
    return {
      valid: connectionValidation.valid && storeValidation.valid,
      error: connectionValidation.error || storeValidation.error,
      warnings: [...(connectionValidation.warning ? [connectionValidation.warning] : []), ...(storeValidation.warnings || [])],
    };
  }, [nodes, edges, validateWorkflow]);

  // Group templates by category
  const templatesByCategory = useMemo(() => {
    return Object.values(SIMPLIFIED_NODE_TEMPLATES).reduce((acc, template) => {
      const category = template.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(template);
      return acc;
    }, {} as Record<string, any>);
  }, []);

  return (
    <div className={`h-full w-full relative ${className || ''}`}>
      {/* Top Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Button
          onClick={() => setIsLibraryOpen(true)}
          variant="outline"
          size="sm"
          className="bg-white/90 backdrop-blur-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Node
        </Button>
        
        <Button
          onClick={() => setIsSaveLoadOpen(true)}
          variant="outline"
          size="sm"
          className="bg-white/90 backdrop-blur-sm"
        >
          <Save className="w-4 h-4 mr-2" />
          Save/Load
        </Button>
      </div>

      {/* Validation Status */}
      <div className="absolute top-4 right-4 z-10">
        {!validation.valid && (
          <Badge variant="destructive" className="bg-red-500/90 backdrop-blur-sm">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {validation.error}
          </Badge>
        )}
        {validation.valid && validation.warnings.length > 0 && (
          <Badge variant="secondary" className="bg-yellow-500/90 backdrop-blur-sm">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {validation.warnings.length} warning(s)
          </Badge>
        )}
        {validation.valid && validation.warnings.length === 0 && (
          <Badge variant="default" className="bg-green-500/90 backdrop-blur-sm">
            ✓ Valid Workflow
          </Badge>
        )}
      </div>

      {/* ReactFlow Canvas */}
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

      {/* Node Library Modal */}
      {isLibraryOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Node Library</h2>
              <Button
                onClick={() => setIsLibraryOpen(false)}
                variant="ghost"
                size="sm"
              >
                ×
              </Button>
            </div>
            
            <div className="space-y-6">
              {Object.entries(templatesByCategory).map(([category, templates]) => (
                <div key={category}>
                  <h3 className="text-lg font-medium mb-3 text-gray-700">{category}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {templates.map((template) => {
                      const canAdd = template.dependencies.length === 0 || 
                        template.dependencies.every(dep => 
                          nodes.some(node => node.data?.type === dep)
                        );
                      
                      return (
                        <div
                          key={template.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            canAdd 
                              ? 'hover:bg-gray-50 border-gray-200' 
                              : 'bg-gray-100 border-gray-300 cursor-not-allowed'
                          }`}
                          onClick={() => canAdd && addNode(template.id)}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: template.color }}
                            />
                            <span className="font-medium">{template.label}</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                          
                          {template.dependencies.length > 0 && (
                            <div className="text-xs text-gray-500">
                              Requires: {template.dependencies.join(', ')}
                            </div>
                          )}
                          
                          <div className="flex justify-between text-xs text-gray-500 mt-2">
                            <span>Inputs: {template.inputs?.length || (template.input ? 1 : 0)}</span>
                            <span>Outputs: {template.outputs?.length || (template.output ? 1 : 0)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Save/Load Dialog */}
      {isSaveLoadOpen && (
        <SaveLoadDialog
          isOpen={isSaveLoadOpen}
          onClose={() => setIsSaveLoadOpen(false)}
          nodes={nodes}
          edges={edges}
          onLoad={(loadedNodes, loadedEdges) => {
            setNodes(loadedNodes);
            setEdges(loadedEdges);
          }}
        />
      )}

      {/* Node Configuration Modal */}
      {isConfigModalOpen && selectedNode && (
        <NodeConfigurationModal
          isOpen={isConfigModalOpen}
          onClose={() => {
            setIsConfigModalOpen(false);
            setSelectedNode(null);
          }}
          node={selectedNode}
          onSave={(updatedNode) => {
            setNodes((nds) =>
              nds.map((n) => (n.id === updatedNode.id ? updatedNode : n))
            );
            setIsConfigModalOpen(false);
            setSelectedNode(null);
          }}
        />
      )}
    </div>
  );
};

const SimplifiedWorkflowCanvas: React.FC<SimplifiedWorkflowCanvasProps> = (props) => {
  return (
    <div className="h-full w-full">
      <SimplifiedWorkflowCanvasInner {...props} />
    </div>
  );
};

export default SimplifiedWorkflowCanvas;
