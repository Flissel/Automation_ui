/**
 * Workflow System Index
 * 
 * This module provides a comprehensive workflow design and execution system
 * for the node-based workflow platform. It includes pre-designed templates,
 * execution utilities, validation logic, and best practices documentation.
 * 
 * @author SOLO Coding Agent
 * @version 1.0.0
 */

// Core workflow components
export { 
  WorkflowManager, 
  defaultWorkflowManager,
  type WorkflowExecutionEvents,
  type WorkflowExecutionOptions,
  type WorkflowExecutionResult,
  type NodeExecutor
} from './workflowManager';

// Example workflow templates
export {
  EXAMPLE_WORKFLOWS,
  getWorkflowTemplate,
  getWorkflowsByCategory,
  getAllWorkflowTemplates,
  type WorkflowTemplate,
  type WorkflowCategory
} from './exampleWorkflows';

// Execution guide and documentation
export {
  WORKFLOW_EXECUTION_GUIDE,
  NODE_EXECUTION_PATTERNS,
  ERROR_HANDLING_STRATEGIES,
  FILESYSTEM_INTEGRATION_GUIDE,
  MONITORING_AND_DEBUGGING,
  WORKFLOW_DESIGN_BEST_PRACTICES as EXECUTION_BEST_PRACTICES,
  WorkflowExecutionUtils as ExecutionUtils,
  type ExecutionContext,
  type NodeExecutionState,
  type ExecutionOrder,
  type ExecutionMetadata
} from './executionGuide';

// Workflow validation system
export {
  WorkflowValidator,
  NODE_COMPATIBILITY_MATRIX,
  VALIDATION_RULES,
  type ValidationResult,
  type ValidationError,
  type ValidationRule
} from './workflowValidator';

// Workflow utilities
export {
  WorkflowExecutionUtils,
  type ExecutionContext as WorkflowExecutionContext,
  type NodeExecutionState as WorkflowNodeExecutionState,
  type ExecutionOrder as WorkflowExecutionOrder,
  type ExecutionMetadata as WorkflowExecutionMetadata
} from './workflowUtils';

// Connection patterns and design guidelines
export {
  CONNECTION_PATTERNS,
  WORKFLOW_DESIGN_PATTERNS,
  WORKFLOW_BEST_PRACTICES,
  WORKFLOW_ANTI_PATTERNS,
  ConnectionPatternUtils,
  type ConnectionPattern,
  type WorkflowDesignPattern
} from './connectionPatterns';

/**
 * Workflow System Configuration
 */
export interface WorkflowSystemConfig {
  enableDebugMode?: boolean;
  defaultTimeout?: number;
  maxConcurrentNodes?: number;
  enableCheckpoints?: boolean;
  checkpointInterval?: number;
  retryFailedNodes?: boolean;
  continueOnError?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Default workflow system configuration
 */
export const DEFAULT_WORKFLOW_CONFIG: WorkflowSystemConfig = {
  enableDebugMode: false,
  defaultTimeout: 300000, // 5 minutes
  maxConcurrentNodes: 3,
  enableCheckpoints: true,
  checkpointInterval: 30000, // 30 seconds
  retryFailedNodes: true,
  continueOnError: false,
  logLevel: 'info'
};

/**
 * Workflow System Statistics
 */
export interface WorkflowSystemStats {
  totalWorkflows: number;
  totalTemplates: number;
  totalConnectionPatterns: number;
  totalDesignPatterns: number;
  supportedNodeTypes: number;
  validationRules: number;
}

/**
 * Get workflow system statistics
 */
export function getWorkflowSystemStats(): WorkflowSystemStats {
  return {
    totalWorkflows: EXAMPLE_WORKFLOWS.length,
    totalTemplates: EXAMPLE_WORKFLOWS.length,
    totalConnectionPatterns: CONNECTION_PATTERNS.length,
    totalDesignPatterns: WORKFLOW_DESIGN_PATTERNS.length,
    supportedNodeTypes: Object.keys(NODE_COMPATIBILITY_MATRIX).length,
    validationRules: VALIDATION_RULES.length
  };
}

/**
 * Workflow System API
 * 
 * Provides a high-level API for working with the workflow system
 */
export class WorkflowSystem {
  private manager: WorkflowManager;
  private validator: WorkflowValidator;
  private config: WorkflowSystemConfig;

  constructor(config: Partial<WorkflowSystemConfig> = {}) {
    this.config = { ...DEFAULT_WORKFLOW_CONFIG, ...config };
    this.manager = new WorkflowManager();
    this.validator = new WorkflowValidator();
    
    // Apply configuration
    this.applyConfiguration();
  }

  /**
   * Apply system configuration
   */
  private applyConfiguration(): void {
    // Configuration would be applied to manager and validator
    // This is a placeholder for actual configuration logic
  }

  /**
   * Get workflow manager instance
   */
  public getManager(): WorkflowManager {
    return this.manager;
  }

  /**
   * Get workflow validator instance
   */
  public getValidator(): WorkflowValidator {
    return this.validator;
  }

  /**
   * Get system configuration
   */
  public getConfig(): WorkflowSystemConfig {
    return { ...this.config };
  }

  /**
   * Update system configuration
   */
  public updateConfig(newConfig: Partial<WorkflowSystemConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.applyConfiguration();
  }

  /**
   * Get system statistics
   */
  public getStats(): WorkflowSystemStats {
    return getWorkflowSystemStats();
  }

  /**
   * Initialize the workflow system with default executors
   */
  public async initialize(): Promise<void> {
    // This would register default node executors
    // For now, this is a placeholder
    console.log('Workflow system initialized with configuration:', this.config);
  }

  /**
   * Cleanup system resources
   */
  public cleanup(): void {
    this.manager.cleanup();
  }
}

/**
 * Default workflow system instance
 */
export const defaultWorkflowSystem = new WorkflowSystem();

/**
 * Quick start functions for common operations
 */
export const QuickStart = {
  /**
   * Create a new workflow manager with default configuration
   */
  createManager: (config?: Partial<WorkflowSystemConfig>) => {
    const system = new WorkflowSystem(config);
    return system.getManager();
  },

  /**
   * Validate a workflow using default validator
   */
  validateWorkflow: (workflow: any) => {
    const validator = new WorkflowValidator();
    return validator.validateWorkflow(workflow);
  },

  /**
   * Get a workflow template by name
   */
  getTemplate: (name: string) => {
    return getWorkflowTemplate(name);
  },

  /**
   * Get connection patterns for node types
   */
  getConnectionPatterns: (sourceType?: any, targetType?: any) => {
    if (sourceType && targetType) {
      return ConnectionPatternUtils.areNodesCompatible(sourceType, targetType);
    }
    if (sourceType) {
      return ConnectionPatternUtils.getPatternsForSourceType(sourceType);
    }
    if (targetType) {
      return ConnectionPatternUtils.getPatternsForTargetType(targetType);
    }
    return CONNECTION_PATTERNS;
  },

  /**
   * Get design pattern by name
   */
  getDesignPattern: (name: string) => {
    return ConnectionPatternUtils.getDesignPattern(name);
  }
};

/**
 * Workflow system version information
 */
export const VERSION_INFO = {
  version: '1.0.0',
  buildDate: new Date().toISOString(),
  features: [
    'Node-based workflow execution',
    'Pre-designed workflow templates',
    'Comprehensive validation system',
    'Connection pattern documentation',
    'Error handling and recovery',
    'Parallel execution support',
    'Checkpoint and resume functionality',
    'Real-time monitoring and debugging'
  ],
  supportedNodeTypes: [
    'manual_trigger',
    'webhook_trigger',
    'websocket_config',
    'live_desktop',
    'click_action',
    'type_text_action',
    'http_request_action',
    'if_condition',
    'delay',
    'ocr_region',
    'ocr_extract',
    'n8n_webhook',
    'send_to_filesystem',
    'workflow_result'
  ]
};

/**
 * Export everything for convenience
 */
export default {
  // Core classes
  WorkflowSystem,
  WorkflowManager,
  WorkflowValidator,
  WorkflowExecutionUtils,
  ConnectionPatternUtils,
  
  // Default instances
  defaultWorkflowSystem,
  defaultWorkflowManager,
  
  // Configuration
  DEFAULT_WORKFLOW_CONFIG,
  
  // Data
  EXAMPLE_WORKFLOWS,
  CONNECTION_PATTERNS,
  WORKFLOW_DESIGN_PATTERNS,
  WORKFLOW_BEST_PRACTICES,
  NODE_COMPATIBILITY_MATRIX,
  
  // Utilities
  QuickStart,
  getWorkflowSystemStats,
  
  // Version info
  VERSION_INFO
};

/**
 * Usage Examples and Documentation
 * 
 * @example Basic workflow execution
 * ```typescript
 * import { defaultWorkflowManager, getWorkflowTemplate } from './workflows';
 * 
 * // Get a pre-designed workflow template
 * const template = getWorkflowTemplate('Desktop Automation with OCR');
 * 
 * if (template) {
 *   // Execute the workflow
 *   const result = await defaultWorkflowManager.executeWorkflow(
 *     template.workflow,
 *     {
 *       debugMode: true,
 *       maxConcurrentNodes: 2
 *     },
 *     {
 *       onWorkflowStart: (context) => console.log('Workflow started:', context.executionId),
 *       onWorkflowComplete: (context) => console.log('Workflow completed:', context.executionId),
 *       onProgress: (progress) => console.log('Progress:', progress)
 *     }
 *   );
 *   
 *   console.log('Execution result:', result);
 * }
 * ```
 * 
 * @example Workflow validation
 * ```typescript
 * import { QuickStart } from './workflows';
 * 
 * const workflow = {
 *   id: 'my-workflow',
 *   name: 'My Custom Workflow',
 *   nodes: [...],
 *   edges: [...]
 * };
 * 
 * const validation = QuickStart.validateWorkflow(workflow);
 * 
 * if (!validation.isValid) {
 *   console.error('Validation errors:', validation.errors);
 * } else {
 *   console.log('Workflow is valid!');
 * }
 * ```
 * 
 * @example Using connection patterns
 * ```typescript
 * import { ConnectionPatternUtils, NodeType } from './workflows';
 * 
 * // Check if two node types can be connected
 * const canConnect = ConnectionPatternUtils.areNodesCompatible(
 *   NodeType.MANUAL_TRIGGER,
 *   NodeType.WEBSOCKET_CONFIG
 * );
 * 
 * // Get recommended target nodes for a source node
 * const recommendations = ConnectionPatternUtils.getRecommendedTargets(
 *   NodeType.LIVE_DESKTOP
 * );
 * 
 * console.log('Can connect:', canConnect);
 * console.log('Recommended targets:', recommendations);
 * ```
 * 
 * @example Custom workflow system
 * ```typescript
 * import { WorkflowSystem } from './workflows';
 * 
 * const customSystem = new WorkflowSystem({
 *   enableDebugMode: true,
 *   maxConcurrentNodes: 5,
 *   defaultTimeout: 600000, // 10 minutes
 *   continueOnError: true
 * });
 * 
 * await customSystem.initialize();
 * 
 * const manager = customSystem.getManager();
 * // Use the manager for workflow execution
 * ```
 */