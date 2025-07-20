/**
 * TRAE Visual Workflow System - Workflow Management
 * 
 * Comprehensive workflow serialization, validation, and execution management
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import { Node, Edge } from 'reactflow';
import { NodeData, NodeStatus, WorkflowExecution } from '../types';
import { validateAllConnections, detectCircularDependencies } from './connectionValidator';
import { getNodeTemplate } from '../config/nodeTemplates';

// ============================================================================
// WORKFLOW FORMAT TYPES
// ============================================================================

export interface WorkflowMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  created_at: string;
  updated_at: string;
  author: string;
  tags: string[];
  category: string;
}

export interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  data: NodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
  type?: string;
  animated?: boolean;
  style?: Record<string, any>;
  data?: Record<string, any>;
}

export interface WorkflowJSON {
  metadata: WorkflowMetadata;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: Record<string, any>;
  settings: {
    auto_save: boolean;
    execution_timeout: number;
    retry_count: number;
    parallel_execution: boolean;
    error_handling: 'stop' | 'continue' | 'retry';
  };
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface ExecutionPlan {
  execution_order: string[];
  parallel_groups: string[][];
  dependencies: Record<string, string[]>;
  estimated_duration: number;
}

// ============================================================================
// WORKFLOW SERIALIZATION
// ============================================================================

/**
 * Convert React Flow nodes and edges to workflow JSON format
 */
export function serializeWorkflow(
  nodes: Node<NodeData>[],
  edges: Edge[],
  metadata: Partial<WorkflowMetadata> = {},
  viewport: { x: number; y: number; zoom: number } = { x: 0, y: 0, zoom: 1 }
): WorkflowJSON {
  const workflowId = metadata.id || `workflow_${Date.now()}`;
  const timestamp = new Date().toISOString();

  const workflowMetadata: WorkflowMetadata = {
    id: workflowId,
    name: metadata.name || 'Untitled Workflow',
    description: metadata.description || '',
    version: metadata.version || '1.0.0',
    created_at: metadata.created_at || timestamp,
    updated_at: timestamp,
    author: metadata.author || 'Unknown',
    tags: metadata.tags || [],
    category: metadata.category || 'general'
  };

  const workflowNodes: WorkflowNode[] = nodes.map(node => ({
    id: node.id,
    type: node.data.type,
    label: node.data.label,
    position: node.position,
    data: node.data
  }));

  const workflowEdges: WorkflowEdge[] = edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle || '',
    targetHandle: edge.targetHandle || '',
    type: edge.type,
    animated: edge.animated,
    style: edge.style,
    data: edge.data
  }));

  return {
    metadata: workflowMetadata,
    nodes: workflowNodes,
    edges: workflowEdges,
    variables: {},
    settings: {
      auto_save: true,
      execution_timeout: 300000, // 5 minutes
      retry_count: 3,
      parallel_execution: false,
      error_handling: 'stop'
    },
    viewport
  };
}

/**
 * Convert workflow JSON format to React Flow nodes and edges
 */
export function deserializeWorkflow(
  workflowJson: WorkflowJSON
): {
  nodes: Node<NodeData>[];
  edges: Edge[];
  metadata: WorkflowMetadata;
  viewport: { x: number; y: number; zoom: number };
} {
  const nodes: Node<NodeData>[] = workflowJson.nodes.map(workflowNode => ({
    id: workflowNode.id,
    type: 'custom',
    position: workflowNode.position,
    data: workflowNode.data
  }));

  const edges: Edge[] = workflowJson.edges.map(workflowEdge => ({
    id: workflowEdge.id,
    source: workflowEdge.source,
    target: workflowEdge.target,
    sourceHandle: workflowEdge.sourceHandle,
    targetHandle: workflowEdge.targetHandle,
    type: workflowEdge.type || 'smoothstep',
    animated: workflowEdge.animated || false,
    style: workflowEdge.style,
    data: workflowEdge.data
  }));

  return {
    nodes,
    edges,
    metadata: workflowJson.metadata,
    viewport: workflowJson.viewport
  };
}

// ============================================================================
// WORKFLOW VALIDATION
// ============================================================================

/**
 * Comprehensive workflow validation
 */
export function validateWorkflow(
  nodes: Node<NodeData>[],
  edges: Edge[]
): WorkflowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Basic structure validation
  if (nodes.length === 0) {
    errors.push('Workflow must contain at least one node');
  }

  // Validate individual nodes
  for (const node of nodes) {
    const template = getNodeTemplate(node.data.type);
    if (!template) {
      errors.push(`Unknown node type: ${node.data.type} (${node.id})`);
      continue;
    }

    // Validate required node data
    if (!node.data.id || !node.data.type || !node.data.label) {
      errors.push(`Node ${node.id} is missing required data`);
    }

    // Validate node configuration
    if (node.data.config) {
      // Add specific validation based on node type
      // This could be expanded with schema validation
    }
  }

  // Validate connections
  const connectionValidation = validateAllConnections(nodes, edges);
  errors.push(...connectionValidation.errors);
  warnings.push(...connectionValidation.warnings);

  // Check for circular dependencies
  const circularCheck = detectCircularDependencies(nodes, edges);
  if (circularCheck.hasCircularDependency) {
    errors.push('Workflow contains circular dependencies');
    circularCheck.cycles.forEach((cycle, index) => {
      errors.push(`Circular dependency ${index + 1}: ${cycle.join(' → ')}`);
    });
  }

  // Check for isolated nodes
  const connectedNodeIds = new Set<string>();
  edges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  const isolatedNodes = nodes.filter(node => !connectedNodeIds.has(node.id));
  if (isolatedNodes.length > 0) {
    warnings.push(`Found ${isolatedNodes.length} isolated node(s): ${isolatedNodes.map(n => n.data.label).join(', ')}`);
  }

  // Check for trigger nodes
  const triggerNodes = nodes.filter(node => node.data.category === 'triggers');
  if (triggerNodes.length === 0) {
    warnings.push('Workflow has no trigger nodes - it cannot be executed automatically');
  }

  // Check for output nodes or final actions
  const outputNodes = nodes.filter(node => {
    const outgoingEdges = edges.filter(edge => edge.source === node.id);
    return outgoingEdges.length === 0;
  });

  if (outputNodes.length === 0 && nodes.length > 1) {
    warnings.push('Workflow has no terminal nodes - execution may not complete properly');
  }

  // Performance suggestions
  if (nodes.length > 50) {
    suggestions.push('Consider breaking large workflows into smaller, reusable sub-workflows');
  }

  if (edges.length > 100) {
    suggestions.push('Complex workflows may benefit from parallel execution grouping');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

// ============================================================================
// EXECUTION PLANNING
// ============================================================================

/**
 * Generate execution plan for workflow
 */
export function generateExecutionPlan(
  nodes: Node<NodeData>[],
  edges: Edge[]
): ExecutionPlan {
  const dependencies: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};
  
  // Initialize
  nodes.forEach(node => {
    dependencies[node.id] = [];
    inDegree[node.id] = 0;
  });

  // Build dependency graph
  edges.forEach(edge => {
    dependencies[edge.target].push(edge.source);
    inDegree[edge.target]++;
  });

  // Topological sort for execution order
  const executionOrder: string[] = [];
  const queue: string[] = [];
  const parallelGroups: string[][] = [];

  // Find nodes with no dependencies (triggers)
  Object.entries(inDegree).forEach(([nodeId, degree]) => {
    if (degree === 0) {
      queue.push(nodeId);
    }
  });

  while (queue.length > 0) {
    const currentGroup: string[] = [...queue];
    parallelGroups.push(currentGroup);
    queue.length = 0;

    currentGroup.forEach(nodeId => {
      executionOrder.push(nodeId);
      
      // Find nodes that depend on this node
      edges.forEach(edge => {
        if (edge.source === nodeId) {
          inDegree[edge.target]--;
          if (inDegree[edge.target] === 0) {
            queue.push(edge.target);
          }
        }
      });
    });
  }

  // Estimate execution duration (simplified)
  const estimatedDuration = nodes.length * 1000; // 1 second per node average

  return {
    execution_order: executionOrder,
    parallel_groups: parallelGroups,
    dependencies,
    estimated_duration: estimatedDuration
  };
}

// ============================================================================
// WORKFLOW UTILITIES
// ============================================================================

/**
 * Export workflow to JSON string
 */
export function exportWorkflowToJSON(
  nodes: Node<NodeData>[],
  edges: Edge[],
  metadata?: Partial<WorkflowMetadata>,
  viewport?: { x: number; y: number; zoom: number }
): string {
  const workflow = serializeWorkflow(nodes, edges, metadata, viewport);
  return JSON.stringify(workflow, null, 2);
}

/**
 * Import workflow from JSON string
 */
export function importWorkflowFromJSON(
  jsonString: string
): {
  nodes: Node<NodeData>[];
  edges: Edge[];
  metadata: WorkflowMetadata;
  viewport: { x: number; y: number; zoom: number };
} {
  try {
    const workflowJson: WorkflowJSON = JSON.parse(jsonString);
    return deserializeWorkflow(workflowJson);
  } catch (error) {
    throw new Error(`Failed to parse workflow JSON: ${error}`);
  }
}

/**
 * Clone a workflow with new IDs
 */
export function cloneWorkflow(
  nodes: Node<NodeData>[],
  edges: Edge[],
  namePrefix: string = 'Copy of '
): { nodes: Node<NodeData>[]; edges: Edge[] } {
  const idMapping: Record<string, string> = {};
  
  // Generate new IDs for nodes
  const clonedNodes: Node<NodeData>[] = nodes.map(node => {
    const newId = `${node.data.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    idMapping[node.id] = newId;
    
    return {
      ...node,
      id: newId,
      position: {
        x: node.position.x + 50,
        y: node.position.y + 50
      },
      data: {
        ...node.data,
        id: newId,
        label: namePrefix + node.data.label,
        status: NodeStatus.IDLE,
        metadata: {
          ...node.data.metadata,
          created_at: new Date().toISOString()
        }
      }
    };
  });

  // Update edge IDs and references
  const clonedEdges: Edge[] = edges.map(edge => {
    const newSource = idMapping[edge.source];
    const newTarget = idMapping[edge.target];
    
    return {
      ...edge,
      id: `${newSource}-${edge.sourceHandle}-${newTarget}-${edge.targetHandle}`,
      source: newSource,
      target: newTarget
    };
  });

  return {
    nodes: clonedNodes,
    edges: clonedEdges
  };
}

/**
 * Get workflow statistics
 */
export function getWorkflowStatistics(
  nodes: Node<NodeData>[],
  edges: Edge[]
): {
  nodeCount: number;
  edgeCount: number;
  nodesByCategory: Record<string, number>;
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedExecutionTime: number;
} {
  const nodesByCategory: Record<string, number> = {};
  
  nodes.forEach(node => {
    const category = node.data.category || 'unknown';
    nodesByCategory[category] = (nodesByCategory[category] || 0) + 1;
  });

  let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
  if (nodes.length > 20 || edges.length > 30) {
    complexity = 'complex';
  } else if (nodes.length > 10 || edges.length > 15) {
    complexity = 'moderate';
  }

  const estimatedExecutionTime = nodes.length * 1000; // 1 second per node

  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodesByCategory,
    complexity,
    estimatedExecutionTime
  };
}