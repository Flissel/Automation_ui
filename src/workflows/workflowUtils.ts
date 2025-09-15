/**
 * Workflow Execution Utilities
 * 
 * This module provides utilities for workflow execution, dependency management,
 * execution order calculation, and runtime coordination. It includes algorithms
 * for topological sorting, dependency resolution, and execution state management.
 */

import { WorkflowDefinition, WorkflowNode, WorkflowEdge } from '../types/workflow';
import { NodeType } from '../types/nodes';

/**
 * Execution order result interface
 */
export interface ExecutionOrder {
  order: string[]; // Node IDs in execution order
  levels: string[][]; // Nodes grouped by execution level (parallel execution possible)
  dependencies: Map<string, string[]>; // Node dependencies map
  criticalPath: string[]; // Critical path through the workflow
}

/**
 * Execution context for a workflow run
 */
export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  startTime: Date;
  variables: Map<string, any>;
  nodeResults: Map<string, any>;
  currentNode?: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  metadata: {
    totalNodes: number;
    completedNodes: number;
    failedNodes: number;
    skippedNodes: number;
  };
}

/**
 * Node execution state
 */
export interface NodeExecutionState {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  result?: any;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

/**
 * Dependency graph node
 */
interface DependencyNode {
  id: string;
  dependencies: Set<string>;
  dependents: Set<string>;
  level: number;
  visited: boolean;
  inProgress: boolean;
}

/**
 * Workflow execution utilities class
 */
export class WorkflowExecutionUtils {
  /**
   * Calculate execution order using topological sorting
   */
  public static calculateExecutionOrder(workflow: WorkflowDefinition): ExecutionOrder {
    const nodes = new Map<string, DependencyNode>();
    
    // Initialize dependency nodes
    for (const node of workflow.nodes) {
      nodes.set(node.id, {
        id: node.id,
        dependencies: new Set(),
        dependents: new Set(),
        level: 0,
        visited: false,
        inProgress: false
      });
    }

    // Build dependency graph
    for (const edge of workflow.edges) {
      const sourceNode = nodes.get(edge.source);
      const targetNode = nodes.get(edge.target);
      
      if (sourceNode && targetNode) {
        targetNode.dependencies.add(edge.source);
        sourceNode.dependents.add(edge.target);
      }
    }

    // Perform topological sort
    const order: string[] = [];
    const levels: string[][] = [];
    const queue: string[] = [];

    // Find nodes with no dependencies (starting points)
    for (const [nodeId, node] of nodes) {
      if (node.dependencies.size === 0) {
        queue.push(nodeId);
        node.level = 0;
      }
    }

    // Process nodes level by level
    let currentLevel = 0;
    while (queue.length > 0) {
      const currentLevelNodes: string[] = [];
      const nextQueue: string[] = [];

      // Process all nodes at current level
      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        const node = nodes.get(nodeId)!;
        
        if (node.level === currentLevel) {
          currentLevelNodes.push(nodeId);
          order.push(nodeId);
          node.visited = true;

          // Update dependents
          for (const dependentId of node.dependents) {
            const dependent = nodes.get(dependentId)!;
            dependent.dependencies.delete(nodeId);
            
            // If all dependencies are satisfied, add to next level
            if (dependent.dependencies.size === 0 && !dependent.visited) {
              dependent.level = currentLevel + 1;
              nextQueue.push(dependentId);
            }
          }
        } else {
          nextQueue.push(nodeId);
        }
      }

      if (currentLevelNodes.length > 0) {
        levels.push(currentLevelNodes);
      }

      queue.push(...nextQueue);
      currentLevel++;

      // Prevent infinite loops
      if (currentLevel > workflow.nodes.length) {
        throw new Error('Circular dependency detected in workflow');
      }
    }

    // Check for unprocessed nodes (circular dependencies)
    const unprocessed = workflow.nodes.filter(node => !nodes.get(node.id)?.visited);
    if (unprocessed.length > 0) {
      throw new Error(`Circular dependency detected involving nodes: ${unprocessed.map(n => n.id).join(', ')}`);
    }

    // Calculate critical path
    const criticalPath = this.calculateCriticalPath(workflow, nodes);

    // Build dependencies map
    const dependencies = new Map<string, string[]>();
    for (const [nodeId, node] of nodes) {
      dependencies.set(nodeId, Array.from(node.dependencies));
    }

    return {
      order,
      levels,
      dependencies,
      criticalPath
    };
  }

  /**
   * Calculate critical path through the workflow
   */
  private static calculateCriticalPath(workflow: WorkflowDefinition, nodes: Map<string, DependencyNode>): string[] {
    const triggerNodes = workflow.nodes.filter(node => 
      [NodeType.MANUAL_TRIGGER, NodeType.WEBHOOK_TRIGGER].includes(node.type)
    );
    
    const resultNodes = workflow.nodes.filter(node => 
      node.type === NodeType.WORKFLOW_RESULT
    );

    if (triggerNodes.length === 0 || resultNodes.length === 0) {
      return [];
    }

    // Find longest path from trigger to result
    let longestPath: string[] = [];
    
    for (const trigger of triggerNodes) {
      for (const result of resultNodes) {
        const path = this.findLongestPath(trigger.id, result.id, workflow.edges, nodes);
        if (path.length > longestPath.length) {
          longestPath = path;
        }
      }
    }

    return longestPath;
  }

  /**
   * Find longest path between two nodes
   */
  private static findLongestPath(startId: string, endId: string, edges: WorkflowEdge[], nodes: Map<string, DependencyNode>): string[] {
    const visited = new Set<string>();
    const path: string[] = [];
    let longestPath: string[] = [];

    const dfs = (nodeId: string): void => {
      if (visited.has(nodeId)) return;
      
      visited.add(nodeId);
      path.push(nodeId);

      if (nodeId === endId) {
        if (path.length > longestPath.length) {
          longestPath = [...path];
        }
      } else {
        const outgoingEdges = edges.filter(edge => edge.source === nodeId);
        for (const edge of outgoingEdges) {
          dfs(edge.target);
        }
      }

      path.pop();
      visited.delete(nodeId);
    };

    dfs(startId);
    return longestPath;
  }

  /**
   * Create execution context for a workflow run
   */
  public static createExecutionContext(workflowId: string, executionId: string, totalNodes: number): ExecutionContext {
    return {
      workflowId,
      executionId,
      startTime: new Date(),
      variables: new Map(),
      nodeResults: new Map(),
      status: 'pending',
      metadata: {
        totalNodes,
        completedNodes: 0,
        failedNodes: 0,
        skippedNodes: 0
      }
    };
  }

  /**
   * Create node execution state
   */
  public static createNodeExecutionState(nodeId: string, maxRetries: number = 3): NodeExecutionState {
    return {
      nodeId,
      status: 'pending',
      retryCount: 0,
      maxRetries
    };
  }

  /**
   * Check if node dependencies are satisfied
   */
  public static areDependenciesSatisfied(nodeId: string, dependencies: Map<string, string[]>, nodeStates: Map<string, NodeExecutionState>): boolean {
    const nodeDependencies = dependencies.get(nodeId) || [];
    
    return nodeDependencies.every(depId => {
      const depState = nodeStates.get(depId);
      return depState && depState.status === 'completed';
    });
  }

  /**
   * Get next executable nodes
   */
  public static getNextExecutableNodes(dependencies: Map<string, string[]>, nodeStates: Map<string, NodeExecutionState>): string[] {
    const executable: string[] = [];
    
    for (const [nodeId, state] of nodeStates) {
      if (state.status === 'pending' && this.areDependenciesSatisfied(nodeId, dependencies, nodeStates)) {
        executable.push(nodeId);
      }
    }
    
    return executable;
  }

  /**
   * Update execution context with node result
   */
  public static updateExecutionContext(context: ExecutionContext, nodeId: string, result: any, status: 'completed' | 'failed' | 'skipped'): void {
    context.nodeResults.set(nodeId, result);
    
    switch (status) {
      case 'completed':
        context.metadata.completedNodes++;
        break;
      case 'failed':
        context.metadata.failedNodes++;
        break;
      case 'skipped':
        context.metadata.skippedNodes++;
        break;
    }

    // Update overall status
    const totalProcessed = context.metadata.completedNodes + context.metadata.failedNodes + context.metadata.skippedNodes;
    
    if (context.metadata.failedNodes > 0 && context.status !== 'failed') {
      context.status = 'failed';
    } else if (totalProcessed === context.metadata.totalNodes) {
      context.status = 'completed';
    }
  }

  /**
   * Calculate workflow progress percentage
   */
  public static calculateProgress(context: ExecutionContext): number {
    const totalProcessed = context.metadata.completedNodes + context.metadata.failedNodes + context.metadata.skippedNodes;
    return Math.round((totalProcessed / context.metadata.totalNodes) * 100);
  }

  /**
   * Get workflow execution summary
   */
  public static getExecutionSummary(context: ExecutionContext): {
    duration: number;
    progress: number;
    status: string;
    nodesSummary: {
      total: number;
      completed: number;
      failed: number;
      skipped: number;
      pending: number;
    };
  } {
    const now = new Date();
    const duration = now.getTime() - context.startTime.getTime();
    const progress = this.calculateProgress(context);
    const pending = context.metadata.totalNodes - (context.metadata.completedNodes + context.metadata.failedNodes + context.metadata.skippedNodes);

    return {
      duration,
      progress,
      status: context.status,
      nodesSummary: {
        total: context.metadata.totalNodes,
        completed: context.metadata.completedNodes,
        failed: context.metadata.failedNodes,
        skipped: context.metadata.skippedNodes,
        pending
      }
    };
  }

  /**
   * Validate execution prerequisites
   */
  public static validateExecutionPrerequisites(workflow: WorkflowDefinition): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for trigger nodes
    const triggerNodes = workflow.nodes.filter(node => 
      [NodeType.MANUAL_TRIGGER, NodeType.WEBHOOK_TRIGGER].includes(node.type)
    );
    
    if (triggerNodes.length === 0) {
      errors.push('Workflow must have at least one trigger node');
    }

    // Check for orphaned nodes
    try {
      const executionOrder = this.calculateExecutionOrder(workflow);
      if (executionOrder.order.length !== workflow.nodes.length) {
        warnings.push('Some nodes may not be reachable from triggers');
      }
    } catch (error) {
      errors.push(`Execution order calculation failed: ${error}`);
    }

    // Check for required configurations
    for (const node of workflow.nodes) {
      if (!node.data?.config && this.requiresConfiguration(node.type)) {
        warnings.push(`Node ${node.id} (${node.type}) may require configuration`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if node type requires configuration
   */
  private static requiresConfiguration(nodeType: NodeType): boolean {
    const configRequiredTypes = [
      NodeType.WEBSOCKET_CONFIG,
      NodeType.LIVE_DESKTOP,
      NodeType.OCR_REGION,
      NodeType.OCR_EXTRACT,
      NodeType.CLICK_ACTION,
      NodeType.TYPE_TEXT_ACTION,
      NodeType.HTTP_REQUEST_ACTION,
      NodeType.IF_CONDITION,
      NodeType.DELAY,
      NodeType.N8N_WEBHOOK,
      NodeType.SEND_TO_FILESYSTEM
    ];
    
    return configRequiredTypes.includes(nodeType);
  }

  /**
   * Generate execution plan
   */
  public static generateExecutionPlan(workflow: WorkflowDefinition): {
    executionOrder: ExecutionOrder;
    estimatedDuration: number;
    parallelizationOpportunities: string[][];
    criticalPathNodes: string[];
    resourceRequirements: {
      filesystem: boolean;
      network: boolean;
      desktop: boolean;
      ocr: boolean;
    };
  } {
    const executionOrder = this.calculateExecutionOrder(workflow);
    
    // Estimate duration (simplified)
    const estimatedDuration = this.estimateWorkflowDuration(workflow);
    
    // Find parallelization opportunities
    const parallelizationOpportunities = executionOrder.levels.filter(level => level.length > 1);
    
    // Analyze resource requirements
    const resourceRequirements = this.analyzeResourceRequirements(workflow);
    
    return {
      executionOrder,
      estimatedDuration,
      parallelizationOpportunities,
      criticalPathNodes: executionOrder.criticalPath,
      resourceRequirements
    };
  }

  /**
   * Estimate workflow duration (simplified)
   */
  private static estimateWorkflowDuration(workflow: WorkflowDefinition): number {
    let totalDuration = 0;
    
    for (const node of workflow.nodes) {
      switch (node.type) {
        case NodeType.DELAY:
          const delayDuration = node.data?.config?.duration || 1000;
          totalDuration += delayDuration;
          break;
        case NodeType.HTTP_REQUEST_ACTION:
          totalDuration += 2000; // Estimated 2 seconds for HTTP request
          break;
        case NodeType.OCR_EXTRACT:
          totalDuration += 3000; // Estimated 3 seconds for OCR
          break;
        case NodeType.CLICK_ACTION:
        case NodeType.TYPE_TEXT_ACTION:
          totalDuration += 500; // Estimated 0.5 seconds for UI actions
          break;
        default:
          totalDuration += 100; // Minimal processing time
          break;
      }
    }
    
    return totalDuration;
  }

  /**
   * Analyze resource requirements
   */
  private static analyzeResourceRequirements(workflow: WorkflowDefinition): {
    filesystem: boolean;
    network: boolean;
    desktop: boolean;
    ocr: boolean;
  } {
    const requirements = {
      filesystem: false,
      network: false,
      desktop: false,
      ocr: false
    };
    
    for (const node of workflow.nodes) {
      switch (node.type) {
        case NodeType.SEND_TO_FILESYSTEM:
          requirements.filesystem = true;
          break;
        case NodeType.HTTP_REQUEST_ACTION:
        case NodeType.N8N_WEBHOOK:
        case NodeType.WEBHOOK_TRIGGER:
          requirements.network = true;
          break;
        case NodeType.LIVE_DESKTOP:
        case NodeType.CLICK_ACTION:
        case NodeType.TYPE_TEXT_ACTION:
          requirements.desktop = true;
          break;
        case NodeType.OCR_REGION:
        case NodeType.OCR_EXTRACT:
          requirements.ocr = true;
          break;
      }
      
      // Check for filesystem integration in node config
      if (node.data?.config?.enableFileSystem) {
        requirements.filesystem = true;
      }
    }
    
    return requirements;
  }

  /**
   * Create execution checkpoint
   */
  public static createCheckpoint(context: ExecutionContext, nodeStates: Map<string, NodeExecutionState>): {
    timestamp: Date;
    contextSnapshot: any;
    nodeStatesSnapshot: any;
    canResume: boolean;
  } {
    return {
      timestamp: new Date(),
      contextSnapshot: {
        workflowId: context.workflowId,
        executionId: context.executionId,
        startTime: context.startTime,
        variables: Object.fromEntries(context.variables),
        nodeResults: Object.fromEntries(context.nodeResults),
        currentNode: context.currentNode,
        status: context.status,
        metadata: { ...context.metadata }
      },
      nodeStatesSnapshot: Object.fromEntries(
        Array.from(nodeStates.entries()).map(([id, state]) => [id, { ...state }])
      ),
      canResume: context.status === 'running' || context.status === 'paused'
    };
  }

  /**
   * Restore execution from checkpoint
   */
  public static restoreFromCheckpoint(checkpoint: any): {
    context: ExecutionContext;
    nodeStates: Map<string, NodeExecutionState>;
  } {
    const context: ExecutionContext = {
      ...checkpoint.contextSnapshot,
      variables: new Map(Object.entries(checkpoint.contextSnapshot.variables)),
      nodeResults: new Map(Object.entries(checkpoint.contextSnapshot.nodeResults))
    };
    
    const nodeStates = new Map(
      Object.entries(checkpoint.nodeStatesSnapshot).map(([id, state]: [string, any]) => [id, state])
    );
    
    return { context, nodeStates };
  }
}

/**
 * Export utility functions
 */
export const {
  calculateExecutionOrder,
  createExecutionContext,
  createNodeExecutionState,
  areDependenciesSatisfied,
  getNextExecutableNodes,
  updateExecutionContext,
  calculateProgress,
  getExecutionSummary,
  validateExecutionPrerequisites,
  generateExecutionPlan,
  createCheckpoint,
  restoreFromCheckpoint
} = WorkflowExecutionUtils;

export default WorkflowExecutionUtils;