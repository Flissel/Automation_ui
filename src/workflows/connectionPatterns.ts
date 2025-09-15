/**
 * Node Connection Patterns and Best Practices
 * 
 * This module documents common patterns for connecting workflow nodes,
 * best practices for workflow design, and guidelines for creating
 * robust and maintainable workflows.
 */

import { NodeType } from '../types/nodes';
import { WorkflowNode, WorkflowEdge } from '../types/workflow';

/**
 * Connection pattern definition
 */
export interface ConnectionPattern {
  name: string;
  description: string;
  sourceTypes: NodeType[];
  targetTypes: NodeType[];
  dataFlow: string;
  useCases: string[];
  example: {
    source: Partial<WorkflowNode>;
    target: Partial<WorkflowNode>;
    edge: Partial<WorkflowEdge>;
  };
  bestPractices: string[];
  commonMistakes: string[];
}

/**
 * Workflow design pattern
 */
export interface WorkflowDesignPattern {
  name: string;
  description: string;
  structure: {
    phases: string[];
    nodeSequence: NodeType[];
    criticalPaths: string[];
  };
  benefits: string[];
  limitations: string[];
  whenToUse: string[];
  example: {
    nodes: Partial<WorkflowNode>[];
    edges: Partial<WorkflowEdge>[];
  };
}

/**
 * Common node connection patterns
 */
export const CONNECTION_PATTERNS: ConnectionPattern[] = [
  {
    name: "Trigger to Configuration",
    description: "Connect trigger nodes to configuration nodes to initialize workflow environment",
    sourceTypes: [NodeType.MANUAL_TRIGGER, NodeType.WEBHOOK_TRIGGER],
    targetTypes: [NodeType.WEBSOCKET_CONFIG],
    dataFlow: "Trigger event data → Configuration parameters",
    useCases: [
      "Initialize desktop connection after manual trigger",
      "Configure webhook parameters from trigger payload",
      "Set up environment variables from trigger context"
    ],
    example: {
      source: {
        id: "trigger_1",
        type: NodeType.MANUAL_TRIGGER,
        data: {
          outputs: [{ name: "trigger_data", type: "object" }]
        }
      },
      target: {
        id: "config_1",
        type: NodeType.WEBSOCKET_CONFIG,
        data: {
          inputs: [{ name: "config_params", type: "object" }]
        }
      },
      edge: {
        source: "trigger_1",
        target: "config_1",
        sourceHandle: "trigger_data",
        targetHandle: "config_params"
      }
    },
    bestPractices: [
      "Always validate trigger data before passing to configuration",
      "Use default values for missing configuration parameters",
      "Log configuration changes for debugging"
    ],
    commonMistakes: [
      "Not handling missing trigger data",
      "Hardcoding configuration values instead of using trigger data",
      "Skipping validation of configuration parameters"
    ]
  },
  {
    name: "Configuration to Interface",
    description: "Connect configuration nodes to interface nodes to establish connections",
    sourceTypes: [NodeType.WEBSOCKET_CONFIG],
    targetTypes: [NodeType.LIVE_DESKTOP],
    dataFlow: "Configuration settings → Interface connection",
    useCases: [
      "Establish desktop connection with configured parameters",
      "Initialize interface with specific settings",
      "Set up connection pools or resources"
    ],
    example: {
      source: {
        id: "config_1",
        type: NodeType.WEBSOCKET_CONFIG,
        data: {
          outputs: [{ name: "connection_config", type: "object" }]
        }
      },
      target: {
        id: "desktop_1",
        type: NodeType.LIVE_DESKTOP,
        data: {
          inputs: [{ name: "config", type: "object" }]
        }
      },
      edge: {
        source: "config_1",
        target: "desktop_1",
        sourceHandle: "connection_config",
        targetHandle: "config"
      }
    },
    bestPractices: [
      "Test connection before proceeding to next nodes",
      "Implement connection retry logic",
      "Monitor connection health throughout workflow"
    ],
    commonMistakes: [
      "Not handling connection failures gracefully",
      "Assuming connection is always successful",
      "Not cleaning up connections on workflow completion"
    ]
  },
  {
    name: "Interface to OCR",
    description: "Connect interface nodes to OCR nodes for screen analysis",
    sourceTypes: [NodeType.LIVE_DESKTOP],
    targetTypes: [NodeType.OCR_REGION, NodeType.OCR_EXTRACT],
    dataFlow: "Screen data → OCR analysis → Text extraction",
    useCases: [
      "Extract text from specific screen regions",
      "Analyze UI elements for automation",
      "Read dynamic content from applications"
    ],
    example: {
      source: {
        id: "desktop_1",
        type: NodeType.LIVE_DESKTOP,
        data: {
          outputs: [{ name: "screen_data", type: "image" }]
        }
      },
      target: {
        id: "ocr_1",
        type: NodeType.OCR_REGION,
        data: {
          inputs: [{ name: "image", type: "image" }]
        }
      },
      edge: {
        source: "desktop_1",
        target: "ocr_1",
        sourceHandle: "screen_data",
        targetHandle: "image"
      }
    },
    bestPractices: [
      "Define precise OCR regions to improve accuracy",
      "Use appropriate OCR settings for text type",
      "Validate extracted text format and content"
    ],
    commonMistakes: [
      "Using too large OCR regions leading to poor accuracy",
      "Not handling OCR failures or empty results",
      "Ignoring text preprocessing for better recognition"
    ]
  },
  {
    name: "OCR to Conditional Logic",
    description: "Connect OCR nodes to conditional nodes for decision making",
    sourceTypes: [NodeType.OCR_EXTRACT],
    targetTypes: [NodeType.IF_CONDITION],
    dataFlow: "Extracted text → Condition evaluation → Branch selection",
    useCases: [
      "Branch workflow based on screen content",
      "Validate expected text presence",
      "Handle different UI states"
    ],
    example: {
      source: {
        id: "ocr_extract_1",
        type: NodeType.OCR_EXTRACT,
        data: {
          outputs: [{ name: "extracted_text", type: "string" }]
        }
      },
      target: {
        id: "condition_1",
        type: NodeType.IF_CONDITION,
        data: {
          inputs: [{ name: "value", type: "string" }]
        }
      },
      edge: {
        source: "ocr_extract_1",
        target: "condition_1",
        sourceHandle: "extracted_text",
        targetHandle: "value"
      }
    },
    bestPractices: [
      "Use fuzzy matching for text comparison",
      "Handle case sensitivity appropriately",
      "Provide clear error messages for failed conditions"
    ],
    commonMistakes: [
      "Using exact string matching for OCR text",
      "Not trimming whitespace from extracted text",
      "Creating overly complex conditional logic"
    ]
  },
  {
    name: "Conditional to Actions",
    description: "Connect conditional nodes to action nodes for execution branching",
    sourceTypes: [NodeType.IF_CONDITION],
    targetTypes: [NodeType.CLICK_ACTION, NodeType.TYPE_TEXT_ACTION, NodeType.HTTP_REQUEST_ACTION],
    dataFlow: "Condition result → Action execution",
    useCases: [
      "Execute different actions based on conditions",
      "Handle error scenarios with alternative actions",
      "Implement workflow branching logic"
    ],
    example: {
      source: {
        id: "condition_1",
        type: NodeType.IF_CONDITION,
        data: {
          outputs: [
            { name: "true_branch", type: "boolean" },
            { name: "false_branch", type: "boolean" }
          ]
        }
      },
      target: {
        id: "click_1",
        type: NodeType.CLICK_ACTION,
        data: {
          inputs: [{ name: "trigger", type: "boolean" }]
        }
      },
      edge: {
        source: "condition_1",
        target: "click_1",
        sourceHandle: "true_branch",
        targetHandle: "trigger"
      }
    },
    bestPractices: [
      "Always handle both true and false branches",
      "Use meaningful names for conditional outputs",
      "Document the logic behind each condition"
    ],
    commonMistakes: [
      "Leaving unhandled conditional branches",
      "Creating circular dependencies in branching",
      "Not considering edge cases in conditions"
    ]
  },
  {
    name: "Actions to Data Storage",
    description: "Connect action nodes to storage nodes for result persistence",
    sourceTypes: [NodeType.CLICK_ACTION, NodeType.TYPE_TEXT_ACTION, NodeType.HTTP_REQUEST_ACTION],
    targetTypes: [NodeType.SEND_TO_FILESYSTEM, NodeType.N8N_WEBHOOK],
    dataFlow: "Action results → Data storage/transmission",
    useCases: [
      "Save action results for later analysis",
      "Send data to external systems",
      "Create audit trails of workflow execution"
    ],
    example: {
      source: {
        id: "http_1",
        type: NodeType.HTTP_REQUEST_ACTION,
        data: {
          outputs: [{ name: "response", type: "object" }]
        }
      },
      target: {
        id: "storage_1",
        type: NodeType.SEND_TO_FILESYSTEM,
        data: {
          inputs: [{ name: "data", type: "object" }]
        }
      },
      edge: {
        source: "http_1",
        target: "storage_1",
        sourceHandle: "response",
        targetHandle: "data"
      }
    },
    bestPractices: [
      "Validate data before storage",
      "Use appropriate data formats for storage",
      "Implement error handling for storage failures"
    ],
    commonMistakes: [
      "Storing sensitive data without encryption",
      "Not handling storage capacity limits",
      "Ignoring data validation before storage"
    ]
  },
  {
    name: "Storage to Results",
    description: "Connect storage nodes to result aggregation nodes",
    sourceTypes: [NodeType.SEND_TO_FILESYSTEM],
    targetTypes: [NodeType.WORKFLOW_RESULT],
    dataFlow: "Stored data → Result aggregation → Final output",
    useCases: [
      "Aggregate workflow results from multiple sources",
      "Generate final reports or summaries",
      "Prepare data for external consumption"
    ],
    example: {
      source: {
        id: "storage_1",
        type: NodeType.SEND_TO_FILESYSTEM,
        data: {
          outputs: [{ name: "file_path", type: "string" }]
        }
      },
      target: {
        id: "result_1",
        type: NodeType.WORKFLOW_RESULT,
        data: {
          inputs: [{ name: "data_source", type: "string" }]
        }
      },
      edge: {
        source: "storage_1",
        target: "result_1",
        sourceHandle: "file_path",
        targetHandle: "data_source"
      }
    },
    bestPractices: [
      "Aggregate results from all relevant sources",
      "Include metadata in final results",
      "Format results for easy consumption"
    ],
    commonMistakes: [
      "Missing data from some workflow branches",
      "Not including execution metadata",
      "Poor result formatting or structure"
    ]
  }
];

/**
 * Common workflow design patterns
 */
export const WORKFLOW_DESIGN_PATTERNS: WorkflowDesignPattern[] = [
  {
    name: "Linear Processing Pipeline",
    description: "Sequential execution of nodes with clear data flow from start to finish",
    structure: {
      phases: ["Initialization", "Processing", "Output"],
      nodeSequence: [
        NodeType.MANUAL_TRIGGER,
        NodeType.WEBSOCKET_CONFIG,
        NodeType.LIVE_DESKTOP,
        NodeType.OCR_EXTRACT,
        NodeType.SEND_TO_FILESYSTEM,
        NodeType.WORKFLOW_RESULT
      ],
      criticalPaths: ["trigger → config → desktop → ocr → storage → result"]
    },
    benefits: [
      "Simple to understand and debug",
      "Predictable execution order",
      "Easy to monitor progress"
    ],
    limitations: [
      "No parallel processing",
      "Single point of failure",
      "May be slower for complex workflows"
    ],
    whenToUse: [
      "Simple automation tasks",
      "When order of operations is critical",
      "For debugging and testing workflows"
    ],
    example: {
      nodes: [
        { id: "trigger", type: NodeType.MANUAL_TRIGGER },
        { id: "config", type: NodeType.WEBSOCKET_CONFIG },
        { id: "desktop", type: NodeType.LIVE_DESKTOP },
        { id: "ocr", type: NodeType.OCR_EXTRACT },
        { id: "storage", type: NodeType.SEND_TO_FILESYSTEM },
        { id: "result", type: NodeType.WORKFLOW_RESULT }
      ],
      edges: [
        { source: "trigger", target: "config" },
        { source: "config", target: "desktop" },
        { source: "desktop", target: "ocr" },
        { source: "ocr", target: "storage" },
        { source: "storage", target: "result" }
      ]
    }
  },
  {
    name: "Conditional Branching",
    description: "Workflow that branches based on conditions with different execution paths",
    structure: {
      phases: ["Setup", "Analysis", "Decision", "Execution", "Aggregation"],
      nodeSequence: [
        NodeType.MANUAL_TRIGGER,
        NodeType.LIVE_DESKTOP,
        NodeType.OCR_EXTRACT,
        NodeType.IF_CONDITION,
        NodeType.CLICK_ACTION,
        NodeType.TYPE_TEXT_ACTION,
        NodeType.WORKFLOW_RESULT
      ],
      criticalPaths: [
        "trigger → desktop → ocr → condition → click → result",
        "trigger → desktop → ocr → condition → type → result"
      ]
    },
    benefits: [
      "Handles different scenarios",
      "Flexible execution paths",
      "Can optimize for different conditions"
    ],
    limitations: [
      "More complex to debug",
      "Requires careful condition design",
      "May have unhandled edge cases"
    ],
    whenToUse: [
      "When workflow needs to handle multiple scenarios",
      "For adaptive automation",
      "When UI state varies"
    ],
    example: {
      nodes: [
        { id: "trigger", type: NodeType.MANUAL_TRIGGER },
        { id: "desktop", type: NodeType.LIVE_DESKTOP },
        { id: "ocr", type: NodeType.OCR_EXTRACT },
        { id: "condition", type: NodeType.IF_CONDITION },
        { id: "click", type: NodeType.CLICK_ACTION },
        { id: "type", type: NodeType.TYPE_TEXT_ACTION },
        { id: "result", type: NodeType.WORKFLOW_RESULT }
      ],
      edges: [
        { source: "trigger", target: "desktop" },
        { source: "desktop", target: "ocr" },
        { source: "ocr", target: "condition" },
        { source: "condition", target: "click", sourceHandle: "true_branch" },
        { source: "condition", target: "type", sourceHandle: "false_branch" },
        { source: "click", target: "result" },
        { source: "type", target: "result" }
      ]
    }
  },
  {
    name: "Parallel Processing",
    description: "Execute multiple independent operations simultaneously for efficiency",
    structure: {
      phases: ["Setup", "Parallel Execution", "Synchronization", "Aggregation"],
      nodeSequence: [
        NodeType.MANUAL_TRIGGER,
        NodeType.LIVE_DESKTOP,
        NodeType.OCR_REGION,
        NodeType.OCR_EXTRACT,
        NodeType.HTTP_REQUEST_ACTION,
        NodeType.WORKFLOW_RESULT
      ],
      criticalPaths: [
        "trigger → desktop → [ocr1, ocr2, http] → result"
      ]
    },
    benefits: [
      "Faster execution",
      "Better resource utilization",
      "Can handle independent operations"
    ],
    limitations: [
      "Requires synchronization",
      "More complex error handling",
      "Resource contention possible"
    ],
    whenToUse: [
      "When operations are independent",
      "For performance optimization",
      "When processing multiple data sources"
    ],
    example: {
      nodes: [
        { id: "trigger", type: NodeType.MANUAL_TRIGGER },
        { id: "desktop", type: NodeType.LIVE_DESKTOP },
        { id: "ocr1", type: NodeType.OCR_EXTRACT },
        { id: "ocr2", type: NodeType.OCR_EXTRACT },
        { id: "http", type: NodeType.HTTP_REQUEST_ACTION },
        { id: "result", type: NodeType.WORKFLOW_RESULT }
      ],
      edges: [
        { source: "trigger", target: "desktop" },
        { source: "desktop", target: "ocr1" },
        { source: "desktop", target: "ocr2" },
        { source: "desktop", target: "http" },
        { source: "ocr1", target: "result" },
        { source: "ocr2", target: "result" },
        { source: "http", target: "result" }
      ]
    }
  },
  {
    name: "Error Handling and Recovery",
    description: "Workflow with built-in error handling and recovery mechanisms",
    structure: {
      phases: ["Setup", "Primary Execution", "Error Detection", "Recovery", "Completion"],
      nodeSequence: [
        NodeType.MANUAL_TRIGGER,
        NodeType.LIVE_DESKTOP,
        NodeType.OCR_EXTRACT,
        NodeType.IF_CONDITION,
        NodeType.CLICK_ACTION,
        NodeType.DELAY,
        NodeType.WORKFLOW_RESULT
      ],
      criticalPaths: [
        "trigger → desktop → ocr → condition → click → result",
        "trigger → desktop → ocr → condition → delay → ocr → result"
      ]
    },
    benefits: [
      "Robust error handling",
      "Self-recovery capabilities",
      "Better reliability"
    ],
    limitations: [
      "More complex workflow design",
      "Longer execution time",
      "May mask underlying issues"
    ],
    whenToUse: [
      "For production workflows",
      "When reliability is critical",
      "In unstable environments"
    ],
    example: {
      nodes: [
        { id: "trigger", type: NodeType.MANUAL_TRIGGER },
        { id: "desktop", type: NodeType.LIVE_DESKTOP },
        { id: "ocr", type: NodeType.OCR_EXTRACT },
        { id: "check", type: NodeType.IF_CONDITION },
        { id: "action", type: NodeType.CLICK_ACTION },
        { id: "retry_delay", type: NodeType.DELAY },
        { id: "result", type: NodeType.WORKFLOW_RESULT }
      ],
      edges: [
        { source: "trigger", target: "desktop" },
        { source: "desktop", target: "ocr" },
        { source: "ocr", target: "check" },
        { source: "check", target: "action", sourceHandle: "success" },
        { source: "check", target: "retry_delay", sourceHandle: "failure" },
        { source: "retry_delay", target: "ocr" },
        { source: "action", target: "result" }
      ]
    }
  }
];

/**
 * Best practices for workflow design
 */
export const WORKFLOW_BEST_PRACTICES = {
  design: [
    "Start with a clear understanding of the workflow objective",
    "Break complex workflows into smaller, manageable components",
    "Use descriptive names for nodes and connections",
    "Document the purpose and logic of each node",
    "Plan for error scenarios and edge cases",
    "Consider performance implications of node connections",
    "Design for maintainability and future modifications"
  ],
  connections: [
    "Validate data types between connected nodes",
    "Use meaningful handle names for inputs and outputs",
    "Avoid circular dependencies in node connections",
    "Minimize the number of connections per node",
    "Group related nodes visually in the workflow",
    "Use consistent naming conventions for handles",
    "Document complex connection logic"
  ],
  errorHandling: [
    "Always handle potential failure scenarios",
    "Provide meaningful error messages",
    "Implement retry logic for transient failures",
    "Use timeouts to prevent hanging operations",
    "Log errors with sufficient context for debugging",
    "Consider graceful degradation for non-critical failures",
    "Test error scenarios thoroughly"
  ],
  performance: [
    "Use parallel execution where possible",
    "Minimize data transfer between nodes",
    "Cache expensive operations when appropriate",
    "Consider memory usage for large data processing",
    "Optimize OCR regions for better performance",
    "Use delays judiciously to avoid unnecessary waiting",
    "Monitor workflow execution times"
  ],
  maintenance: [
    "Version control workflow definitions",
    "Document changes and their rationale",
    "Test workflows after modifications",
    "Keep workflows as simple as possible",
    "Regular review and optimization of workflows",
    "Maintain backward compatibility when possible",
    "Archive obsolete workflows properly"
  ]
};

/**
 * Common anti-patterns to avoid
 */
export const WORKFLOW_ANTI_PATTERNS = {
  design: [
    "Creating overly complex workflows that are hard to understand",
    "Not planning for error scenarios",
    "Hardcoding values that should be configurable",
    "Creating workflows without clear objectives",
    "Ignoring performance implications",
    "Not considering maintainability"
  ],
  connections: [
    "Creating circular dependencies",
    "Using unclear or generic handle names",
    "Connecting incompatible data types",
    "Creating too many connections from a single node",
    "Not validating connection data",
    "Ignoring connection order dependencies"
  ],
  execution: [
    "Not handling node execution failures",
    "Assuming all operations will succeed",
    "Not implementing proper timeouts",
    "Ignoring resource limitations",
    "Not monitoring workflow progress",
    "Creating workflows that can't be stopped or paused"
  ]
};

/**
 * Utility functions for connection patterns
 */
export class ConnectionPatternUtils {
  /**
   * Check if two node types are compatible for connection
   */
  static areNodesCompatible(sourceType: NodeType, targetType: NodeType): boolean {
    return CONNECTION_PATTERNS.some(pattern => 
      pattern.sourceTypes.includes(sourceType) && 
      pattern.targetTypes.includes(targetType)
    );
  }

  /**
   * Get connection patterns for a specific source node type
   */
  static getPatternsForSourceType(sourceType: NodeType): ConnectionPattern[] {
    return CONNECTION_PATTERNS.filter(pattern => 
      pattern.sourceTypes.includes(sourceType)
    );
  }

  /**
   * Get connection patterns for a specific target node type
   */
  static getPatternsForTargetType(targetType: NodeType): ConnectionPattern[] {
    return CONNECTION_PATTERNS.filter(pattern => 
      pattern.targetTypes.includes(targetType)
    );
  }

  /**
   * Get recommended target node types for a source node type
   */
  static getRecommendedTargets(sourceType: NodeType): NodeType[] {
    const patterns = this.getPatternsForSourceType(sourceType);
    const targets = new Set<NodeType>();
    
    patterns.forEach(pattern => {
      pattern.targetTypes.forEach(type => targets.add(type));
    });
    
    return Array.from(targets);
  }

  /**
   * Get workflow design pattern by name
   */
  static getDesignPattern(name: string): WorkflowDesignPattern | undefined {
    return WORKFLOW_DESIGN_PATTERNS.find(pattern => pattern.name === name);
  }

  /**
   * Get all available design patterns
   */
  static getAllDesignPatterns(): WorkflowDesignPattern[] {
    return [...WORKFLOW_DESIGN_PATTERNS];
  }

  /**
   * Validate a workflow against best practices
   */
  static validateWorkflowDesign(nodes: WorkflowNode[], edges: WorkflowEdge[]): {
    isValid: boolean;
    warnings: string[];
    suggestions: string[];
  } {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    // Check for circular dependencies
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycle = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;
      
      visited.add(nodeId);
      recursionStack.add(nodeId);
      
      const outgoingEdges = edges.filter(e => e.source === nodeId);
      for (const edge of outgoingEdges) {
        if (hasCycle(edge.target)) return true;
      }
      
      recursionStack.delete(nodeId);
      return false;
    };
    
    for (const node of nodes) {
      if (hasCycle(node.id)) {
        warnings.push(`Circular dependency detected involving node: ${node.id}`);
      }
    }
    
    // Check for disconnected nodes
    const connectedNodes = new Set<string>();
    edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });
    
    const disconnectedNodes = nodes.filter(node => !connectedNodes.has(node.id));
    if (disconnectedNodes.length > 0) {
      warnings.push(`Disconnected nodes found: ${disconnectedNodes.map(n => n.id).join(', ')}`);
    }
    
    // Check for incompatible connections
    for (const edge of edges) {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      
      if (sourceNode && targetNode) {
        if (!this.areNodesCompatible(sourceNode.type, targetNode.type)) {
          warnings.push(`Potentially incompatible connection: ${sourceNode.type} → ${targetNode.type}`);
        }
      }
    }
    
    // Provide suggestions
    if (nodes.length > 10) {
      suggestions.push("Consider breaking this workflow into smaller, more manageable workflows");
    }
    
    if (edges.length === 0 && nodes.length > 1) {
      suggestions.push("Add connections between nodes to create a functional workflow");
    }
    
    return {
      isValid: warnings.length === 0,
      warnings,
      suggestions
    };
  }
}

export default {
  CONNECTION_PATTERNS,
  WORKFLOW_DESIGN_PATTERNS,
  WORKFLOW_BEST_PRACTICES,
  WORKFLOW_ANTI_PATTERNS,
  ConnectionPatternUtils
};