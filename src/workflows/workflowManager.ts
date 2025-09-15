/**
 * Workflow Manager
 * 
 * This module provides a comprehensive workflow management system that coordinates
 * workflow execution, state management, error handling, and monitoring. It serves
 * as the central orchestrator for all workflow operations.
 */

import { WorkflowDefinition, WorkflowNode, WorkflowEdge } from '../types/workflow';
import { NodeType } from '../types/nodes';
import { 
  WorkflowExecutionUtils, 
  ExecutionContext, 
  NodeExecutionState, 
  ExecutionOrder 
} from './workflowUtils';
import { WorkflowValidator, ValidationResult } from './workflowValidator';

/**
 * Workflow execution events
 */
export interface WorkflowExecutionEvents {
  onWorkflowStart?: (context: ExecutionContext) => void;
  onWorkflowComplete?: (context: ExecutionContext) => void;
  onWorkflowFailed?: (context: ExecutionContext, error: string) => void;
  onWorkflowPaused?: (context: ExecutionContext) => void;
  onWorkflowResumed?: (context: ExecutionContext) => void;
  onNodeStart?: (nodeId: string, context: ExecutionContext) => void;
  onNodeComplete?: (nodeId: string, result: any, context: ExecutionContext) => void;
  onNodeFailed?: (nodeId: string, error: string, context: ExecutionContext) => void;
  onNodeSkipped?: (nodeId: string, reason: string, context: ExecutionContext) => void;
  onProgress?: (progress: number, context: ExecutionContext) => void;
}

/**
 * Workflow execution options
 */
export interface WorkflowExecutionOptions {
  debugMode?: boolean;
  stepByStep?: boolean;
  maxConcurrentNodes?: number;
  timeout?: number;
  retryFailedNodes?: boolean;
  continueOnError?: boolean;
  saveCheckpoints?: boolean;
  checkpointInterval?: number;
  variables?: Record<string, any>;
}

/**
 * Workflow execution result
 */
export interface WorkflowExecutionResult {
  success: boolean;
  executionId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: 'completed' | 'failed' | 'cancelled' | 'timeout';
  results: Map<string, any>;
  errors: string[];
  warnings: string[];
  nodeExecutions: Map<string, NodeExecutionState>;
  finalContext: ExecutionContext;
}

/**
 * Node executor interface
 */
export interface NodeExecutor {
  canExecute(nodeType: NodeType): boolean;
  execute(node: WorkflowNode, context: ExecutionContext, inputs: any): Promise<any>;
  validate?(node: WorkflowNode): ValidationResult;
  getEstimatedDuration?(node: WorkflowNode): number;
}

/**
 * Workflow Manager class
 */
export class WorkflowManager {
  private executors: Map<NodeType, NodeExecutor> = new Map();
  private runningExecutions: Map<string, ExecutionContext> = new Map();
  private executionStates: Map<string, Map<string, NodeExecutionState>> = new Map();
  private validator: WorkflowValidator = new WorkflowValidator();
  private checkpoints: Map<string, any> = new Map();

  /**
   * Register a node executor
   */
  public registerExecutor(nodeType: NodeType, executor: NodeExecutor): void {
    this.executors.set(nodeType, executor);
  }

  /**
   * Unregister a node executor
   */
  public unregisterExecutor(nodeType: NodeType): void {
    this.executors.delete(nodeType);
  }

  /**
   * Get registered executors
   */
  public getRegisteredExecutors(): NodeType[] {
    return Array.from(this.executors.keys());
  }

  /**
   * Validate workflow before execution
   */
  public validateWorkflow(workflow: WorkflowDefinition): ValidationResult {
    const result = this.validator.validateWorkflow(workflow);
    
    // Additional validation for registered executors
    for (const node of workflow.nodes) {
      const executor = this.executors.get(node.type);
      if (!executor) {
        result.errors.push({
          type: 'dependency',
          severity: 'critical',
          nodeId: node.id,
          message: `No executor registered for node type: ${node.type}`,
          fix: `Register an executor for ${node.type} before executing the workflow`
        });
        result.isValid = false;
      } else if (executor.validate) {
        const nodeValidation = executor.validate(node);
        result.errors.push(...nodeValidation.errors);
        result.warnings.push(...nodeValidation.warnings);
        result.suggestions.push(...nodeValidation.suggestions);
        if (!nodeValidation.isValid) {
          result.isValid = false;
        }
      }
    }
    
    return result;
  }

  /**
   * Execute workflow
   */
  public async executeWorkflow(
    workflow: WorkflowDefinition,
    options: WorkflowExecutionOptions = {},
    events: WorkflowExecutionEvents = {}
  ): Promise<WorkflowExecutionResult> {
    const executionId = this.generateExecutionId();
    
    try {
      // Validate workflow
      const validation = this.validateWorkflow(workflow);
      if (!validation.isValid) {
        throw new Error(`Workflow validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Calculate execution order
      const executionOrder = WorkflowExecutionUtils.calculateExecutionOrder(workflow);
      
      // Create execution context
      const context = WorkflowExecutionUtils.createExecutionContext(
        workflow.id,
        executionId,
        workflow.nodes.length
      );
      
      // Initialize variables
      if (options.variables) {
        for (const [key, value] of Object.entries(options.variables)) {
          context.variables.set(key, value);
        }
      }
      
      // Initialize node states
      const nodeStates = new Map<string, NodeExecutionState>();
      for (const node of workflow.nodes) {
        const maxRetries = node.data?.config?.maxRetries || 3;
        nodeStates.set(node.id, WorkflowExecutionUtils.createNodeExecutionState(node.id, maxRetries));
      }
      
      // Store execution state
      this.runningExecutions.set(executionId, context);
      this.executionStates.set(executionId, nodeStates);
      
      // Start execution
      context.status = 'running';
      events.onWorkflowStart?.(context);
      
      const startTime = new Date();
      
      try {
        await this.executeWorkflowInternal(
          workflow,
          context,
          nodeStates,
          executionOrder,
          options,
          events
        );
        
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();
        
        // Determine final status
        let finalStatus: 'completed' | 'failed' | 'cancelled' | 'timeout';
        if (context.status === 'completed') {
          finalStatus = 'completed';
          events.onWorkflowComplete?.(context);
        } else if (context.status === 'failed') {
          finalStatus = 'failed';
          events.onWorkflowFailed?.(context, context.error || 'Unknown error');
        } else if (context.status === 'cancelled') {
          finalStatus = 'cancelled';
        } else {
          finalStatus = 'timeout';
        }
        
        return {
          success: finalStatus === 'completed',
          executionId,
          startTime,
          endTime,
          duration,
          status: finalStatus,
          results: context.nodeResults,
          errors: this.collectErrors(nodeStates),
          warnings: validation.warnings.map(w => w.message),
          nodeExecutions: nodeStates,
          finalContext: context
        };
        
      } catch (error) {
        context.status = 'failed';
        context.error = error instanceof Error ? error.message : String(error);
        events.onWorkflowFailed?.(context, context.error);
        
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();
        
        return {
          success: false,
          executionId,
          startTime,
          endTime,
          duration,
          status: 'failed',
          results: context.nodeResults,
          errors: [context.error, ...this.collectErrors(nodeStates)],
          warnings: validation.warnings.map(w => w.message),
          nodeExecutions: nodeStates,
          finalContext: context
        };
      }
      
    } finally {
      // Cleanup
      this.runningExecutions.delete(executionId);
      this.executionStates.delete(executionId);
      this.checkpoints.delete(executionId);
    }
  }

  /**
   * Internal workflow execution logic
   */
  private async executeWorkflowInternal(
    workflow: WorkflowDefinition,
    context: ExecutionContext,
    nodeStates: Map<string, NodeExecutionState>,
    executionOrder: ExecutionOrder,
    options: WorkflowExecutionOptions,
    events: WorkflowExecutionEvents
  ): Promise<void> {
    const nodeMap = new Map(workflow.nodes.map(n => [n.id, n]));
    const maxConcurrent = options.maxConcurrentNodes || 3;
    const timeout = options.timeout || 300000; // 5 minutes default
    
    const startTime = Date.now();
    let currentLevelIndex = 0;
    
    while (currentLevelIndex < executionOrder.levels.length && context.status === 'running') {
      // Check timeout
      if (Date.now() - startTime > timeout) {
        context.status = 'failed';
        context.error = 'Workflow execution timeout';
        break;
      }
      
      const currentLevel = executionOrder.levels[currentLevelIndex];
      const executableNodes = currentLevel.filter(nodeId => {
        const state = nodeStates.get(nodeId)!;
        return state.status === 'pending' && 
               WorkflowExecutionUtils.areDependenciesSatisfied(nodeId, executionOrder.dependencies, nodeStates);
      });
      
      if (executableNodes.length === 0) {
        currentLevelIndex++;
        continue;
      }
      
      // Execute nodes in batches for concurrency control
      const batches = this.createBatches(executableNodes, maxConcurrent);
      
      for (const batch of batches) {
        if (context.status !== 'running') break;
        
        const promises = batch.map(nodeId => 
          this.executeNode(nodeId, nodeMap.get(nodeId)!, context, nodeStates, options, events)
        );
        
        await Promise.allSettled(promises);
        
        // Update progress
        const progress = WorkflowExecutionUtils.calculateProgress(context);
        events.onProgress?.(progress, context);
        
        // Save checkpoint if enabled
        if (options.saveCheckpoints && options.checkpointInterval) {
          const checkpoint = WorkflowExecutionUtils.createCheckpoint(context, nodeStates);
          this.checkpoints.set(context.executionId, checkpoint);
        }
        
        // Check if we should continue on error
        if (context.metadata.failedNodes > 0 && !options.continueOnError) {
          context.status = 'failed';
          context.error = 'Node execution failed and continueOnError is disabled';
          break;
        }
        
        // Step-by-step mode
        if (options.stepByStep) {
          context.status = 'paused';
          events.onWorkflowPaused?.(context);
          // In a real implementation, this would wait for user input
          // For now, we'll continue automatically
          context.status = 'running';
          events.onWorkflowResumed?.(context);
        }
      }
      
      currentLevelIndex++;
    }
    
    // Final status determination
    if (context.status === 'running') {
      const totalProcessed = context.metadata.completedNodes + context.metadata.failedNodes + context.metadata.skippedNodes;
      if (totalProcessed === context.metadata.totalNodes) {
        context.status = context.metadata.failedNodes > 0 ? 'failed' : 'completed';
      }
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    nodeId: string,
    node: WorkflowNode,
    context: ExecutionContext,
    nodeStates: Map<string, NodeExecutionState>,
    options: WorkflowExecutionOptions,
    events: WorkflowExecutionEvents
  ): Promise<void> {
    const state = nodeStates.get(nodeId)!;
    const executor = this.executors.get(node.type);
    
    if (!executor) {
      state.status = 'failed';
      state.error = `No executor registered for node type: ${node.type}`;
      WorkflowExecutionUtils.updateExecutionContext(context, nodeId, null, 'failed');
      events.onNodeFailed?.(nodeId, state.error, context);
      return;
    }
    
    try {
      state.status = 'running';
      state.startTime = new Date();
      context.currentNode = nodeId;
      
      events.onNodeStart?.(nodeId, context);
      
      // Prepare inputs from previous nodes
      const inputs = this.prepareNodeInputs(nodeId, context);
      
      // Execute node
      const result = await executor.execute(node, context, inputs);
      
      // Update state
      state.status = 'completed';
      state.endTime = new Date();
      state.duration = state.endTime.getTime() - state.startTime!.getTime();
      state.result = result;
      
      WorkflowExecutionUtils.updateExecutionContext(context, nodeId, result, 'completed');
      events.onNodeComplete?.(nodeId, result, context);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      state.retryCount++;
      
      if (state.retryCount < state.maxRetries && options.retryFailedNodes) {
        // Retry the node
        state.status = 'pending';
        state.error = `Retry ${state.retryCount}/${state.maxRetries}: ${errorMessage}`;
        
        // Add delay before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * state.retryCount));
        
        // Recursive retry
        return this.executeNode(nodeId, node, context, nodeStates, options, events);
      } else {
        // Final failure
        state.status = 'failed';
        state.endTime = new Date();
        state.duration = state.endTime.getTime() - state.startTime!.getTime();
        state.error = errorMessage;
        
        WorkflowExecutionUtils.updateExecutionContext(context, nodeId, null, 'failed');
        events.onNodeFailed?.(nodeId, errorMessage, context);
      }
    } finally {
      context.currentNode = undefined;
    }
  }

  /**
   * Prepare inputs for node execution
   */
  private prepareNodeInputs(nodeId: string, context: ExecutionContext): any {
    const inputs: any = {
      variables: Object.fromEntries(context.variables),
      nodeResults: Object.fromEntries(context.nodeResults),
      executionId: context.executionId,
      workflowId: context.workflowId
    };
    
    return inputs;
  }

  /**
   * Create execution batches for concurrency control
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Collect errors from node states
   */
  private collectErrors(nodeStates: Map<string, NodeExecutionState>): string[] {
    const errors: string[] = [];
    for (const [nodeId, state] of nodeStates) {
      if (state.status === 'failed' && state.error) {
        errors.push(`Node ${nodeId}: ${state.error}`);
      }
    }
    return errors;
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Pause workflow execution
   */
  public pauseExecution(executionId: string): boolean {
    const context = this.runningExecutions.get(executionId);
    if (context && context.status === 'running') {
      context.status = 'paused';
      return true;
    }
    return false;
  }

  /**
   * Resume workflow execution
   */
  public resumeExecution(executionId: string): boolean {
    const context = this.runningExecutions.get(executionId);
    if (context && context.status === 'paused') {
      context.status = 'running';
      return true;
    }
    return false;
  }

  /**
   * Cancel workflow execution
   */
  public cancelExecution(executionId: string): boolean {
    const context = this.runningExecutions.get(executionId);
    if (context && (context.status === 'running' || context.status === 'paused')) {
      context.status = 'cancelled';
      return true;
    }
    return false;
  }

  /**
   * Get execution status
   */
  public getExecutionStatus(executionId: string): {
    context?: ExecutionContext;
    nodeStates?: Map<string, NodeExecutionState>;
    summary?: any;
  } {
    const context = this.runningExecutions.get(executionId);
    const nodeStates = this.executionStates.get(executionId);
    
    if (!context || !nodeStates) {
      return {};
    }
    
    const summary = WorkflowExecutionUtils.getExecutionSummary(context);
    
    return {
      context,
      nodeStates,
      summary
    };
  }

  /**
   * Get all running executions
   */
  public getRunningExecutions(): string[] {
    return Array.from(this.runningExecutions.keys());
  }

  /**
   * Get execution checkpoint
   */
  public getCheckpoint(executionId: string): any {
    return this.checkpoints.get(executionId);
  }

  /**
   * Restore execution from checkpoint
   */
  public async restoreFromCheckpoint(checkpointData: any): Promise<string> {
    const { context, nodeStates } = WorkflowExecutionUtils.restoreFromCheckpoint(checkpointData);
    
    this.runningExecutions.set(context.executionId, context);
    this.executionStates.set(context.executionId, nodeStates);
    
    return context.executionId;
  }

  /**
   * Get workflow execution statistics
   */
  public getExecutionStatistics(): {
    totalExecutions: number;
    runningExecutions: number;
    averageExecutionTime: number;
    successRate: number;
    mostUsedNodeTypes: { type: NodeType; count: number }[];
  } {
    // This would typically be implemented with persistent storage
    // For now, return current running executions
    return {
      totalExecutions: 0,
      runningExecutions: this.runningExecutions.size,
      averageExecutionTime: 0,
      successRate: 0,
      mostUsedNodeTypes: []
    };
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.runningExecutions.clear();
    this.executionStates.clear();
    this.checkpoints.clear();
  }
}

/**
 * Default workflow manager instance
 */
export const defaultWorkflowManager = new WorkflowManager();

export default WorkflowManager;