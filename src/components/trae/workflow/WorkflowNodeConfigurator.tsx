import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  ReactFlowProvider,
  ReactFlowInstance,
  NodeTypes
} from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Download,
  Upload,
  Save,
  Trash2,
  Settings,
  Play,
  Plus,
  Copy,
  FileJson,
  Workflow,
  Monitor,
  MousePointer,
  Keyboard,
  Globe,
  GitBranch,
  Wifi,
  Webhook
} from 'lucide-react';
import { toast } from 'sonner';
import { SIMPLIFIED_NODE_TEMPLATES, SimplifiedNodeTemplate } from '@/config/simplifiedNodeTemplates';
import { SimplifiedNode } from '../SimplifiedNode';
import { NodeConfigurationModal } from './NodeConfigurationModal';
import { WorkflowStorage } from '@/utils/workflowStorage';

// Icon mapping for node templates
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Play: Play,
  Webhook: Webhook,
  Wifi: Wifi,
  Monitor: Monitor,
  MousePointer: MousePointer,
  Keyboard: Keyboard,
  Globe: Globe,
  GitBranch: GitBranch,
};

// Node types for ReactFlow
const nodeTypes: NodeTypes = {
  simplified: SimplifiedNode,
};

interface WorkflowNodeConfiguratorProps {
  onWorkflowExport?: (workflowData: any) => void;
  className?: string;
}

/**
 * WorkflowNodeConfigurator Component
 * 
 * Comprehensive workflow node configuration interface for the multi-desktop page.
 * Allows users to:
 * - Configure all available workflow nodes
 * - Create node connections via drag-and-drop
 * - Export/import workflow JSON objects
 * - Seamlessly integrate with the main workflow page
 * 
 * @param onWorkflowExport - Callback when workflow is exported
 * @param className - Additional CSS classes
 */
export const WorkflowNodeConfigurator: React.FC<WorkflowNodeConfiguratorProps> = ({
  onWorkflowExport,
  className = ''
}) => {
  // ReactFlow state management
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // UI state management
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [workflowName, setWorkflowName] = useState('Untitled Multi-Desktop Workflow');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [exportJsonText, setExportJsonText] = useState('');

  // Node template categories for organization
  const nodeCategories = {
    triggers: Object.values(SIMPLIFIED_NODE_TEMPLATES).filter(t => t.category === 'triggers'),
    config: Object.values(SIMPLIFIED_NODE_TEMPLATES).filter(t => t.category === 'config'),
    interface: Object.values(SIMPLIFIED_NODE_TEMPLATES).filter(t => t.category === 'interface'),
    actions: Object.values(SIMPLIFIED_NODE_TEMPLATES).filter(t => t.category === 'actions'),
    logic: Object.values(SIMPLIFIED_NODE_TEMPLATES).filter(t => t.category === 'logic'),
    results: Object.values(SIMPLIFIED_NODE_TEMPLATES).filter(t => t.category === 'results')
  };

  /**
   * Handle connection creation between nodes
   * Validates connection compatibility based on node templates
   */
  const onConnect = useCallback(
    (params: Connection) => {
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);
      
      if (!sourceNode || !targetNode) {
        toast.error('Invalid connection: Source or target node not found');
        return;
      }

      // Basic connection validation
      const sourceTemplate = SIMPLIFIED_NODE_TEMPLATES[sourceNode.data?.type];
      const targetTemplate = SIMPLIFIED_NODE_TEMPLATES[targetNode.data?.type];
      
      if (!sourceTemplate || !targetTemplate) {
        toast.error('Invalid connection: Node template not found');
        return;
      }

      // Create the edge with proper styling
      const newEdge = {
        ...params,
        id: `edge-${params.source}-${params.target}`,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#64748b', strokeWidth: 2 }
      };

      setEdges((eds) => addEdge(newEdge, eds));
      toast.success('Connection created successfully');
    },
    [nodes, setEdges]
  );

  /**
   * Handle drag and drop of new nodes from the template library
   */
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const templateId = event.dataTransfer.getData('application/reactflow');
      const template = SIMPLIFIED_NODE_TEMPLATES[templateId];
      
      if (!template || !reactFlowInstance) {
        toast.error('Failed to add node: Template or ReactFlow instance not found');
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `${template.id}-${Date.now()}`,
        type: 'simplified',
        position,
        data: {
          type: template.type,
          label: template.label,
          config: { ...template.defaultConfig },
          template: template
        },
      };

      setNodes((nds) => nds.concat(newNode));
      toast.success(`Added ${template.label} node`);
    },
    [reactFlowInstance, setNodes]
  );

  /**
   * Handle node selection for configuration
   */
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  /**
   * Open configuration modal for selected node
   */
  const handleConfigureNode = useCallback(() => {
    if (selectedNode) {
      setIsConfigModalOpen(true);
    }
  }, [selectedNode]);

  /**
   * Save node configuration from modal
   */
  const handleNodeConfigSave = useCallback((nodeId: string, config: Record<string, any>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                config: { ...node.data.config, ...config },
              },
            }
          : node
      )
    );
    setIsConfigModalOpen(false);
    toast.success('Node configuration saved');
  }, [setNodes]);

  /**
   * Delete selected node and its connections
   */
  const handleDeleteNode = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
      setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedNode(null);
      toast.success('Node deleted');
    }
  }, [selectedNode, setNodes, setEdges]);

  /**
   * Clear entire workflow
   */
  const handleClearWorkflow = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setWorkflowName('Untitled Multi-Desktop Workflow');
    setWorkflowDescription('');
    toast.success('Workflow cleared');
  }, [setNodes, setEdges]);

  /**
   * Export workflow as JSON object compatible with main workflow page
   */
  const handleExportWorkflow = useCallback(() => {
    const workflowData = {
      id: `multi-desktop-workflow-${Date.now()}`,
      name: workflowName,
      description: workflowDescription,
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.data?.type || 'unknown',
        position: node.position,
        data: {
          ...node.data,
          label: node.data?.label || 'Untitled Node'
        }
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle
      })),
      settings: {
        createdFrom: 'multi-desktop-configurator',
        createdAt: new Date().toISOString(),
        nodeCount: nodes.length,
        edgeCount: edges.length
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setExportJsonText(JSON.stringify(workflowData, null, 2));
    setIsExportDialogOpen(true);
    
    // Call external export handler if provided
    if (onWorkflowExport) {
      onWorkflowExport(workflowData);
    }
  }, [nodes, edges, workflowName, workflowDescription, onWorkflowExport]);

  /**
   * Import workflow from JSON
   */
  const handleImportWorkflow = useCallback(() => {
    try {
      const workflowData = JSON.parse(importJsonText);
      
      // Validate basic structure
      if (!workflowData.nodes || !workflowData.edges) {
        throw new Error('Invalid workflow format: Missing nodes or edges');
      }

      // Convert imported data to ReactFlow format
      const importedNodes: Node[] = workflowData.nodes.map((node: any) => ({
        id: node.id,
        type: 'simplified',
        position: node.position || { x: 0, y: 0 },
        data: {
          type: node.type,
          label: node.data?.label || node.type,
          config: node.data?.config || {},
          template: SIMPLIFIED_NODE_TEMPLATES[node.type]
        }
      }));

      const importedEdges: Edge[] = workflowData.edges.map((edge: any) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#64748b', strokeWidth: 2 }
      }));

      setNodes(importedNodes);
      setEdges(importedEdges);
      setWorkflowName(workflowData.name || 'Imported Workflow');
      setWorkflowDescription(workflowData.description || '');
      setIsImportDialogOpen(false);
      setImportJsonText('');
      
      toast.success(`Imported workflow: ${workflowData.name}`);
    } catch (error) {
      toast.error(`Import