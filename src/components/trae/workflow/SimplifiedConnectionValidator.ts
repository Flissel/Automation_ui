/**
 * Simplified Connection Validator for Workflow Canvas
 * Validates node connections and workflow integrity
 */

import { Node, Edge, Connection } from '@xyflow/react';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

export interface WorkflowValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

export class SimplifiedConnectionValidator {
  private nodes: Node[];
  private edges: Edge[];

  constructor(nodes: Node[], edges: Edge[]) {
    this.nodes = nodes;
    this.edges = edges;
  }

  /**
   * Validate a single connection
   */
  validateConnection(connection: Connection, allNodes: Node[]): ValidationResult {
    const sourceNode = allNodes.find(n => n.id === connection.source);
    const targetNode = allNodes.find(n => n.id === connection.target);

    if (!sourceNode || !targetNode) {
      return {
        valid: false,
        error: 'Invalid connection: source or target node not found'
      };
    }

    // Check for self-connections
    if (connection.source === connection.target) {
      return {
        valid: false,
        error: 'Cannot connect a node to itself'
      };
    }

    // Check for duplicate connections
    const existingConnection = this.edges.find(edge => 
      edge.source === connection.source && 
      edge.target === connection.target
    );

    if (existingConnection) {
      return {
        valid: false,
        error: 'Connection already exists between these nodes'
      };
    }

    return { valid: true };
  }

  /**
   * Validate entire workflow
   */
  static validateWorkflow(nodes: Node[], edges: Edge[]): WorkflowValidationResult {
    const warnings: string[] = [];
    
    // Check for orphaned nodes
    const connectedNodeIds = new Set([
      ...edges.map(e => e.source),
      ...edges.map(e => e.target)
    ]);
    
    const orphanedNodes = nodes.filter(node => !connectedNodeIds.has(node.id));
    if (orphanedNodes.length > 0) {
      warnings.push(`${orphanedNodes.length} orphaned node(s) detected`);
    }

    // Check for circular dependencies
    if (this.hasCircularDependency(nodes, edges)) {
      return {
        valid: false,
        error: 'Circular dependency detected in workflow'
      };
    }

    return {
      valid: true,
      warnings
    };
  }

  /**
   * Check for circular dependencies using DFS
   */
  private static hasCircularDependency(nodes: Node[], edges: Edge[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        return true; // Circular dependency found
      }
      
      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      // Check all outgoing edges
      const outgoingEdges = edges.filter(edge => edge.source === nodeId);
      for (const edge of outgoingEdges) {
        if (dfs(edge.target)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    // Check each node
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) {
          return true;
        }
      }
    }

    return false;
  }
}