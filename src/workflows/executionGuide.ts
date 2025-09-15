/**
 * Workflow Execution Guide
 * 
 * This file provides comprehensive documentation on how workflows execute,
 * how nodes connect and pass data, error handling mechanisms, and best practices
 * for designing robust workflow systems.
 */

import { WorkflowDefinition, WorkflowNode, WorkflowEdge } from '../types/workflow';
import { NodeType } from '../types/nodes';

/**
 * WORKFLOW EXECUTION FUNDAMENTALS
 * ================================
 * 
 * Workflows in this system follow a directed acyclic graph (DAG) execution model:
 * 1. Execution starts from trigger nodes (manual, webhook, etc.)
 * 2. Data flows through edges from source to target nodes
 * 3. Each node processes input data and produces output data
 * 4. Conditional nodes can create branching execution paths
 * 5. Execution completes when all paths reach terminal nodes
 */

/**
 * NODE EXECUTION ORDER
 * ===================
 * 
 * The execution engine follows these rules:
 * 1. Topological sorting determines execution order
 * 2. Nodes with no dependencies execute first (triggers)
 * 3. A node executes only when all its input dependencies are satisfied
 * 4. Parallel execution occurs when nodes have no interdependencies
 * 5. Error in any node can halt or continue execution based on error handling strategy
 */

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  startTime: Date;
  currentNode?: string;
  variables: Record<string, any>;
  errors: ExecutionError[];
  status: 'running' | 'completed' | 'failed' | 'paused';
}

export interface ExecutionError {
  nodeId: string;
  errorType: 'validation' | 'runtime' | 'network' | 'filesystem' | 'timeout';
  message: string;
  timestamp: Date;
  recoverable: boolean;
}

export interface NodeExecutionResult {
  nodeId: string;
  status: 'success' | 'error' | 'skipped';
  output?: any;
  error?: ExecutionError;
  executionTime: number;
  metadata?: Record<string, any>;
}

/**
 * DATA FLOW AND CONNECTION PATTERNS
 * =================================
 */

/**
 * Standard connection patterns between different node types
 */
export const connectionPatterns = {
  /**
   * TRIGGER → CONFIG → INTERFACE
   * Basic workflow initiation pattern
   */
  basicInitiation: {
    description: 'Standard workflow startup sequence',
    pattern: [
      { from: 'trigger', to: 'config', dataType: 'initiation' },
      { from: 'config', to: 'interface', dataType: 'configuration' }
    ],
    example: 'manual_trigger → websocket_config → live_desktop'
  },

  /**
   * INTERFACE → ACTION → RESULT
   * Main execution flow pattern
   */
  mainExecution: {
    description: 'Primary workflow execution sequence',
    pattern: [
      { from: 'interface', to: 'action', dataType: 'interface_data' },
      { from: 'action', to: 'result', dataType: 'action_output' }
    ],
    example: 'live_desktop → click_action → workflow_result'
  },

  /**
   * ACTION → CONDITION → BRANCH
   * Conditional branching pattern
   */
  conditionalBranching: {
    description: 'Decision-based execution branching',
    pattern: [
      { from: 'action', to: 'condition', dataType: 'evaluation_data' },
      { from: 'condition', to: 'branch_true', dataType: 'true_path', condition: 'true' },
      { from: 'condition', to: 'branch_false', dataType: 'false_path', condition: 'false' }
    ],
    example: 'ocr_extract → if_condition → [click_action | api_call]'
  },

  /**
   * PARALLEL → MERGE → RESULT
   * Parallel execution and result aggregation
   */
  parallelExecution: {
    description: 'Concurrent execution with result merging',
    pattern: [
      { from: 'source', to: 'parallel_1', dataType: 'shared_input' },
      { from: 'source', to: 'parallel_2', dataType: 'shared_input' },
      { from: 'parallel_1', to: 'merge', dataType: 'result_1' },
      { from: 'parallel_2', to: 'merge', dataType: 'result_2' }
    ],
    example: 'ocr_extract → [click_action + http_request] → workflow_result'
  }
};

/**
 * DATA TRANSFORMATION RULES
 * ========================
 */

export const dataTransformationRules = {
  /**
   * How data flows between different node types
   */
  nodeTypeTransformations: {
    // Trigger nodes output initiation signals
    trigger: {
      outputFormat: {
        timestamp: 'ISO string',
        triggerType: 'string',
        payload: 'any'
      },
      compatibleTargets: ['config', 'action', 'condition']
    },

    // Config nodes output configuration objects
    config: {
      outputFormat: {
        config: 'object',
        status: 'string',
        metadata: 'object'
      },
      compatibleTargets: ['interface', 'action']
    },

    // Interface nodes output interaction data
    interface: {
      outputFormat: {
        screenData: 'base64 | buffer',
        coordinates: 'object',
        metadata: 'object',
        fileSystemPath: 'string'
      },
      compatibleTargets: ['action', 'condition', 'result']
    },

    // Action nodes output execution results
    action: {
      outputFormat: {
        result: 'any',
        success: 'boolean',
        metadata: 'object',
        fileSystemPath: 'string'
      },
      compatibleTargets: ['condition', 'action', 'result', 'storage']
    },

    // Condition nodes output boolean decisions
    condition: {
      outputFormat: {
        condition: 'boolean',
        value: 'any',
        metadata: 'object'
      },
      compatibleTargets: ['action', 'condition', 'result'],
      specialHandles: ['true', 'false']
    },

    // Result nodes aggregate final outputs
    result: {
      outputFormat: {
        aggregatedResults: 'array',
        summary: 'object',
        metadata: 'object',
        exportPath: 'string'
      },
      compatibleTargets: ['storage', 'webhook']
    }
  },

  /**
   * Variable substitution patterns
   */
  variableSubstitution: {
    patterns: {
      '${TIMESTAMP}': () => new Date().toISOString(),
      '${EXECUTION_ID}': (context: ExecutionContext) => context.executionId,
      '${WORKFLOW_ID}': (context: ExecutionContext) => context.workflowId,
      '${NODE_OUTPUT}': (nodeId: string, context: ExecutionContext) => 
        context.variables[`node_${nodeId}_output`],
      '${RANDOM_UUID}': () => crypto.randomUUID(),
      '${DATE}': () => new Date().toISOString().split('T')[0]
    },
    usage: 'Variables are resolved at runtime during node execution'
  }
};

/**
 * ERROR HANDLING STRATEGIES
 * =========================
 */

export const errorHandlingStrategies = {
  /**
   * Node-level error handling
   */
  nodeLevel: {
    // Continue execution despite node failure
    continueOnError: {
      description: 'Skip failed node and continue with workflow',
      implementation: {
        onError: 'log_and_continue',
        outputDefault: null,
        markAsSkipped: true
      },
      useCases: ['Optional actions', 'Non-critical operations']
    },

    // Retry failed operations
    retryOnError: {
      description: 'Attempt to re-execute failed node',
      implementation: {
        maxRetries: 3,
        retryDelay: 1000,
        backoffStrategy: 'exponential',
        retryableErrors: ['network', 'timeout', 'temporary']
      },
      useCases: ['Network requests', 'File operations', 'External API calls']
    },

    // Fallback to alternative execution path
    fallbackPath: {
      description: 'Execute alternative node on failure',
      implementation: {
        fallbackNodeId: 'string',
        preserveOriginalError: true,
        mergeFallbackOutput: false
      },
      useCases: ['Critical operations with alternatives', 'Graceful degradation']
    }
  },

  /**
   * Workflow-level error handling
   */
  workflowLevel: {
    // Halt entire workflow on critical error
    haltOnCriticalError: {
      description: 'Stop workflow execution on unrecoverable errors',
      triggers: ['validation_error', 'security_error', 'resource_exhaustion'],
      cleanup: ['release_resources', 'save_partial_results', 'notify_operators']
    },

    // Partial execution completion
    partialCompletion: {
      description: 'Complete successfully executed branches',
      implementation: {
        savePartialResults: true,
        markIncompleteNodes: true,
        generatePartialReport: true
      }
    }
  }
};

/**
 * FILESYSTEM INTEGRATION PATTERNS
 * ===============================
 */

export const filesystemIntegration = {
  /**
   * File organization strategies
   */
  organizationPatterns: {
    // Workflow-based organization
    workflowBased: {
      structure: './workflows/{workflowId}/{executionId}/',
      benefits: ['Easy workflow tracking', 'Isolated execution data'],
      example: './workflows/desktop-automation-ocr/exec-123/screenshots/'
    },

    // Node-type based organization
    nodeTypeBased: {
      structure: './{nodeType}/{workflowId}/{executionId}/',
      benefits: ['Easy node output analysis', 'Type-specific processing'],
      example: './ocr_results/desktop-automation-ocr/exec-123/'
    },

    // Temporal organization
    temporalBased: {
      structure: './{year}/{month}/{day}/{workflowId}/',
      benefits: ['Time-based analysis', 'Automatic archiving'],
      example: './2024/01/15/desktop-automation-ocr/'
    }
  },

  /**
   * File naming conventions
   */
  namingConventions: {
    descriptive: {
      pattern: '{nodeType}_{action}_{timestamp}.{extension}',
      example: 'ocr_extract_text_20240115_143022.json'
    },
    sequential: {
      pattern: '{nodeId}_{sequence}.{extension}',
      example: 'ocr-extract_001.json'
    },
    uuid: {
      pattern: '{uuid}.{extension}',
      example: '550e8400-e29b-41d4-a716-446655440000.json'
    }
  },

  /**
   * Data persistence strategies
   */
  persistenceStrategies: {
    // Immediate persistence after each node
    immediate: {
      description: 'Save data immediately after node execution',
      pros: ['Data safety', 'Debugging capability'],
      cons: ['Performance overhead', 'Storage usage'],
      useCases: ['Critical workflows', 'Development/debugging']
    },

    // Batch persistence at workflow completion
    batch: {
      description: 'Save all data at workflow completion',
      pros: ['Better performance', 'Atomic operations'],
      cons: ['Data loss risk', 'Memory usage'],
      useCases: ['High-performance workflows', 'Temporary data']
    },

    // Selective persistence based on importance
    selective: {
      description: 'Save only important or requested data',
      configuration: {
        saveOnError: true,
        saveOnSuccess: false,
        saveSpecificNodes: ['result', 'critical_action'],
        compressionEnabled: true
      },
      useCases: ['Storage-constrained environments', 'Production workflows']
    }
  }
};

/**
 * EXECUTION MONITORING AND DEBUGGING
 * ==================================
 */

export const monitoringAndDebugging = {
  /**
   * Execution tracking
   */
  executionTracking: {
    // Real-time status updates
    realTimeStatus: {
      events: ['node_started', 'node_completed', 'node_failed', 'workflow_paused'],
      websocketEndpoint: '/ws/execution/{executionId}',
      updateFrequency: '100ms'
    },

    // Performance metrics
    performanceMetrics: {
      nodeExecutionTime: 'milliseconds',
      memoryUsage: 'bytes',
      filesystemOperations: 'count',
      networkRequests: 'count_and_latency'
    },

    // Debug information
    debugInformation: {
      nodeInputs: 'captured_when_debug_enabled',
      nodeOutputs: 'captured_when_debug_enabled',
      intermediateStates: 'captured_when_debug_enabled',
      errorStackTraces: 'always_captured'
    }
  },

  /**
   * Debugging strategies
   */
  debuggingStrategies: {
    // Step-by-step execution
    stepByStep: {
      description: 'Execute one node at a time with manual progression',
      controls: ['step_forward', 'step_back', 'inspect_state', 'modify_variables'],
      useCases: ['Workflow development', 'Issue investigation']
    },

    // Breakpoint debugging
    breakpoints: {
      description: 'Pause execution at specific nodes',
      types: ['conditional_breakpoint', 'error_breakpoint', 'manual_breakpoint'],
      actions: ['inspect_variables', 'modify_data', 'skip_node', 'restart_node']
    },

    // Execution replay
    replay: {
      description: 'Re-execute workflow with saved state',
      requirements: ['saved_execution_state', 'deterministic_nodes'],
      benefits: ['Issue reproduction', 'Testing modifications']
    }
  }
};

/**
 * BEST PRACTICES FOR WORKFLOW DESIGN
 * ==================================
 */

export const bestPractices = {
  /**
   * Workflow structure
   */
  structure: {
    // Keep workflows focused and modular
    modularity: {
      principle: 'Single responsibility per workflow',
      guidelines: [
        'Limit workflows to 10-15 nodes for maintainability',
        'Use sub-workflows for complex operations',
        'Create reusable workflow components',
        'Separate configuration from execution logic'
      ]
    },

    // Design for error resilience
    resilience: {
      principle: 'Expect and handle failures gracefully',
      guidelines: [
        'Add timeout configurations to all external operations',
        'Implement retry logic for transient failures',
        'Provide fallback paths for critical operations',
        'Validate inputs at workflow and node levels'
      ]
    },

    // Optimize for performance
    performance: {
      principle: 'Design for efficiency and scalability',
      guidelines: [
        'Use parallel execution where possible',
        'Minimize filesystem operations',
        'Cache expensive computations',
        'Implement proper resource cleanup'
      ]
    }
  },

  /**
   * Node configuration
   */
  nodeConfiguration: {
    // Use meaningful names and descriptions
    naming: {
      nodeIds: 'Use descriptive, kebab-case identifiers',
      labels: 'Use clear, action-oriented labels',
      descriptions: 'Explain the node purpose and expected behavior'
    },

    // Configure appropriate timeouts
    timeouts: {
      shortOperations: '5-10 seconds (file operations, simple calculations)',
      mediumOperations: '30-60 seconds (API calls, image processing)',
      longOperations: '5-10 minutes (large file processing, complex automation)'
    },

    // Implement proper validation
    validation: {
      inputValidation: 'Validate all input parameters before execution',
      outputValidation: 'Ensure output format matches expected schema',
      configValidation: 'Validate configuration parameters at design time'
    }
  }
};

/**
 * UTILITY FUNCTIONS FOR WORKFLOW EXECUTION
 * ========================================
 */

/**
 * Validate workflow structure and connections
 */
export function validateWorkflow(workflow: WorkflowDefinition): {
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

  // Check for result nodes
  const resultNodes = workflow.nodes.filter(node => 
    node.type === NodeType.WORKFLOW_RESULT
  );
  if (resultNodes.length === 0) {
    warnings.push('Workflow should have at least one result node');
  }

  // Validate edge connections
  for (const edge of workflow.edges) {
    const sourceNode = workflow.nodes.find(n => n.id === edge.source);
    const targetNode = workflow.nodes.find(n => n.id === edge.target);
    
    if (!sourceNode) {
      errors.push(`Edge references non-existent source node: ${edge.source}`);
    }
    if (!targetNode) {
      errors.push(`Edge references non-existent target node: ${edge.target}`);
    }
  }

  // Check for orphaned nodes
  for (const node of workflow.nodes) {
    const hasIncomingEdge = workflow.edges.some(edge => edge.target === node.id);
    const hasOutgoingEdge = workflow.edges.some(edge => edge.source === node.id);
    
    if (!hasIncomingEdge && !triggerNodes.includes(node)) {
      warnings.push(`Node ${node.id} has no incoming connections`);
    }
    if (!hasOutgoingEdge && !resultNodes.includes(node)) {
      warnings.push(`Node ${node.id} has no outgoing connections`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Calculate execution order using topological sort
 */
export function calculateExecutionOrder(workflow: WorkflowDefinition): string[] {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const order: string[] = [];

  function visit(nodeId: string): void {
    if (visiting.has(nodeId)) {
      throw new Error(`Circular dependency detected involving node: ${nodeId}`);
    }
    if (visited.has(nodeId)) {
      return;
    }

    visiting.add(nodeId);
    
    // Visit all dependencies (incoming edges)
    const dependencies = workflow.edges
      .filter(edge => edge.target === nodeId)
      .map(edge => edge.source);
    
    for (const depId of dependencies) {
      visit(depId);
    }
    
    visiting.delete(nodeId);
    visited.add(nodeId);
    order.push(nodeId);
  }

  // Start with trigger nodes
  const triggerNodes = workflow.nodes.filter(node => 
    [NodeType.MANUAL_TRIGGER, NodeType.WEBHOOK_TRIGGER].includes(node.type)
  );
  
  for (const trigger of triggerNodes) {
    visit(trigger.id);
  }

  return order;
}

/**
 * Generate execution context for workflow
 */
export function createExecutionContext(workflowId: string): ExecutionContext {
  return {
    workflowId,
    executionId: crypto.randomUUID(),
    startTime: new Date(),
    variables: {},
    errors: [],
    status: 'running'
  };
}

export default {
  connectionPatterns,
  dataTransformationRules,
  errorHandlingStrategies,
  filesystemIntegration,
  monitoringAndDebugging,
  bestPractices,
  validateWorkflow,
  calculateExecutionOrder,
  createExecutionContext
};