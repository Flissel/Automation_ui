import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Node, Edge } from '@xyflow/react';

interface WorkflowState {
  // Current workflow state
  nodes: Node[];
  edges: Edge[];
  workflowName: string;
  selectedNode: Node | null;
  
  // UI state persistence
  panelSizes: {
    canvas: number;
    debug: number;
  };
  activeDebugTab: string;
  isLibraryOpen: boolean;
  
  // Actions
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setWorkflowName: (name: string) => void;
  setSelectedNode: (node: Node | null) => void;
  setPanelSizes: (sizes: { canvas: number; debug: number }) => void;
  setActiveDebugTab: (tab: string) => void;
  setIsLibraryOpen: (isOpen: boolean) => void;
  
  // Workflow operations
  addNode: (node: Node) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<Node>) => void;
  addEdge: (edge: Edge) => void;
  removeEdge: (edgeId: string) => void;
  clearWorkflow: () => void;
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      // Initial state
      nodes: [],
      edges: [],
      workflowName: 'Untitled Workflow',
      selectedNode: null,
      
      // UI state
      panelSizes: {
        canvas: 70,
        debug: 30
      },
      activeDebugTab: 'executions',
      isLibraryOpen: false,
      
      // Actions
      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),
      setWorkflowName: (workflowName) => set({ workflowName }),
      setSelectedNode: (selectedNode) => set({ selectedNode }),
      setPanelSizes: (panelSizes) => set({ panelSizes }),
      setActiveDebugTab: (activeDebugTab) => set({ activeDebugTab }),
      setIsLibraryOpen: (isLibraryOpen) => set({ isLibraryOpen }),
      
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
        selectedNode: null
      })
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