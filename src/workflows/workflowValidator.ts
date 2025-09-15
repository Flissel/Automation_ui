/**
 * Workflow Validation System
 * 
 * This module provides comprehensive validation for workflow definitions,
 * ensuring proper node connections, dependencies, and structural integrity.
 * It includes both design-time and runtime validation capabilities.
 */

import { WorkflowDefinition, WorkflowNode, WorkflowEdge } from '../types/workflow';
import { NodeType } from '../types/nodes';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
}

export interface ValidationError {
  type: 'structural' | 'connection' | 'configuration' | 'dependency';
  severity: 'critical' | 'high' | 'medium';
  nodeId?: string;
  edgeId?: string;
  message: string;
  details?: string;
  fix?: string;
}

export interface ValidationWarning {
  type: 'performance' | 'best_practice' | 'maintainability';
  nodeId?: string;
  message: string;
  recommendation?: string;
}

export interface ValidationSuggestion {
  type: 'optimization' | 'enhancement' | 'alternative';
  nodeId?: string;
  message: string;
  implementation?: string;
}

/**
 * Node compatibility matrix
 * Defines which node types can connect to which other node types
 */
const NODE_COMPATIBILITY_MATRIX: Record<NodeType, {
  canConnectTo: NodeType[];
  canReceiveFrom: NodeType[];
  maxOutgoing?: number;
  maxIncoming?: number;
  requiresIncoming?: boolean;
  requiresOutgoing?: boolean;
}> = {
  [NodeType.MANUAL_TRIGGER]: {
    canConnectTo: [NodeType.WEBSOCKET_CONFIG, NodeType.LIVE_DESKTOP, NodeType.HTTP_REQUEST_ACTION, NodeType.IF_CONDITION, NodeType.DELAY],
    canReceiveFrom: [],
    maxIncoming: 0,
    requiresOutgoing: true
  },
  [NodeType.WEBHOOK_TRIGGER]: {
    canConnectTo: [NodeType.HTTP_REQUEST_ACTION, NodeType.IF_CONDITION, NodeType.SEND_TO_FILESYSTEM, NodeType.WORKFLOW_RESULT],
    canReceiveFrom: [],
    maxIncoming: 0,
    requiresOutgoing: true
  },
  [NodeType.WEBSOCKET_CONFIG]: {
    canConnectTo: [NodeType.LIVE_DESKTOP],
    canReceiveFrom: [NodeType.MANUAL_TRIGGER, NodeType.WEBHOOK_TRIGGER],
    requiresIncoming: true,
    requiresOutgoing: true
  },
  [NodeType.LIVE_DESKTOP]: {
    canConnectTo: [NodeType.OCR_REGION, NodeType.CLICK_ACTION, NodeType.TYPE_TEXT_ACTION, NodeType.IF_CONDITION],
    canReceiveFrom: [NodeType.WEBSOCKET_CONFIG, NodeType.MANUAL_TRIGGER],
    requiresIncoming: true
  },
  [NodeType.OCR_REGION]: {
    canConnectTo: [NodeType.OCR_EXTRACT],
    canReceiveFrom: [NodeType.LIVE_DESKTOP],
    requiresIncoming: true,
    requiresOutgoing: true
  },
  [NodeType.OCR_EXTRACT]: {
    canConnectTo: [NodeType.IF_CONDITION, NodeType.SEND_TO_FILESYSTEM, NodeType.HTTP_REQUEST_ACTION, NodeType.WORKFLOW_RESULT],
    canReceiveFrom: [NodeType.OCR_REGION],
    requiresIncoming: true
  },
  [NodeType.CLICK_ACTION]: {
    canConnectTo: [NodeType.TYPE_TEXT_ACTION, NodeType.DELAY, NodeType.IF_CONDITION, NodeType.SEND_TO_FILESYSTEM, NodeType.WORKFLOW_RESULT],
    canReceiveFrom: [NodeType.LIVE_DESKTOP, NodeType.IF_CONDITION, NodeType.DELAY],
    requiresIncoming: true
  },
  [NodeType.TYPE_TEXT_ACTION]: {
    canConnectTo: [NodeType.CLICK_ACTION, NodeType.DELAY, NodeType.IF_CONDITION, NodeType.SEND_TO_FILESYSTEM, NodeType.WORKFLOW_RESULT],
    canReceiveFrom: [NodeType.LIVE_DESKTOP, NodeType.CLICK_ACTION, NodeType.IF_CONDITION, NodeType.DELAY],
    requiresIncoming: true
  },
  [NodeType.HTTP_REQUEST_ACTION]: {
    canConnectTo: [NodeType.IF_CONDITION, NodeType.SEND_TO_FILESYSTEM, NodeType.N8N_WEBHOOK, NodeType.WORKFLOW_RESULT],
    canReceiveFrom: [NodeType.MANUAL_TRIGGER, NodeType.WEBHOOK_TRIGGER, NodeType.OCR_EXTRACT, NodeType.IF_CONDITION],
    requiresIncoming: true
  },
  [NodeType.IF_CONDITION]: {
    canConnectTo: [NodeType.CLICK_ACTION, NodeType.TYPE_TEXT_ACTION, NodeType.HTTP_REQUEST_ACTION, NodeType.DELAY, NodeType.SEND_TO_FILESYSTEM, NodeType.WORKFLOW_RESULT],
    canReceiveFrom: [NodeType.MANUAL_TRIGGER, NodeType.LIVE_DESKTOP, NodeType.OCR_EXTRACT, NodeType.CLICK_ACTION, NodeType.TYPE_TEXT_ACTION, NodeType.HTTP_REQUEST_ACTION],
    requiresIncoming: true,
    requiresOutgoing: true
  },
  [NodeType.DELAY]: {
    canConnectTo: [NodeType.CLICK_ACTION, NodeType.TYPE_TEXT_ACTION, NodeType.HTTP_REQUEST_ACTION, NodeType.IF_CONDITION, NodeType.SEND_TO_FILESYSTEM, NodeType.WORKFLOW_RESULT],
    canReceiveFrom: [NodeType.MANUAL_TRIGGER, NodeType.CLICK_ACTION, NodeType.TYPE_TEXT_ACTION, NodeType.IF_CONDITION],
    requiresIncoming: true
  },
  [NodeType.N8N_WEBHOOK]: {
    canConnectTo: [NodeType.WORKFLOW_RESULT, NodeType.SEND_TO_FILESYSTEM],
    canReceiveFrom: [NodeType.HTTP_REQUEST_ACTION, NodeType.SEND_TO_FILESYSTEM],
    requiresIncoming: true
  },
  [NodeType.SEND_TO_FILESYSTEM]: {
    canConnectTo: [NodeType.WORKFLOW_RESULT, NodeType.N8N_WEBHOOK],
    canReceiveFrom: [NodeType.OCR_EXTRACT, NodeType.CLICK_ACTION, NodeType.TYPE_TEXT_ACTION, NodeType.HTTP_REQUEST_ACTION, NodeType.IF_CONDITION, NodeType.DELAY, NodeType.WEBHOOK_TRIGGER],
    requiresIncoming: true
  },
  [NodeType.WORKFLOW_RESULT]: {
    canConnectTo: [],
    canReceiveFrom: [NodeType.OCR_EXTRACT, NodeType.CLICK_ACTION, NodeType.TYPE_TEXT_ACTION, NodeType.HTTP_REQUEST_ACTION, NodeType.IF_CONDITION, NodeType.DELAY, NodeType.SEND_TO_FILESYSTEM, NodeType.N8N_WEBHOOK, NodeType.WEBHOOK_TRIGGER],
    maxOutgoing: 0,
    requiresIncoming: true
  }
};

/**
 * Required configuration fields for each node type
 */
const REQUIRED_CONFIG_FIELDS: Record<NodeType, string[]> = {
  [NodeType.MANUAL_TRIGGER]: [],
  [NodeType.WEBHOOK_TRIGGER]: ['path', 'method'],
  [NodeType.WEBSOCKET_CONFIG]: ['host', 'port'],
  [NodeType.LIVE_DESKTOP]: ['fps', 'quality'],
  [NodeType.OCR_REGION]: ['x', 'y', 'width', 'height'],
  [NodeType.OCR_EXTRACT]: ['language'],
  [NodeType.CLICK_ACTION]: ['x', 'y'],
  [NodeType.TYPE_TEXT_ACTION]: ['text'],
  [NodeType.HTTP_REQUEST_ACTION]: ['url', 'method'],
  [NodeType.IF_CONDITION]: ['condition', 'value'],
  [NodeType.DELAY]: ['duration'],
  [NodeType.N8N_WEBHOOK]: ['webhookUrl'],
  [NodeType.SEND_TO_FILESYSTEM]: ['directory', 'filename'],
  [NodeType.WORKFLOW_RESULT]: []
};

/**
 * Main workflow validator class
 */
export class WorkflowValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationWarning[] = [];
  private suggestions: ValidationSuggestion[] = [];

  /**
   * Validate a complete workflow definition
   */
  public validateWorkflow(workflow: WorkflowDefinition): ValidationResult {
    this.reset();

    // Structural validation
    this.validateStructure(workflow);
    
    // Node validation
    this.validateNodes(workflow.nodes);
    
    // Edge validation
    this.validateEdges(workflow.edges, workflow.nodes);
    
    // Connection validation
    this.validateConnections(workflow);
    
    // Flow validation
    this.validateExecutionFlow(workflow);
    
    // Performance validation
    this.validatePerformance(workflow);
    
    // Best practices validation
    this.validateBestPractices(workflow);

    return {
      isValid: this.errors.filter(e => e.severity === 'critical').length === 0,
      errors: this.errors,
      warnings: this.warnings,
      suggestions: this.suggestions
    };
  }

  /**
   * Reset validation state
   */
  private reset(): void {
    this.errors = [];
    this.warnings = [];
    this.suggestions = [];
  }

  /**
   * Validate basic workflow structure
   */
  private validateStructure(workflow: WorkflowDefinition): void {
    // Check required fields
    if (!workflow.id) {
      this.addError('structural', 'critical', undefined, undefined, 
        'Workflow must have an ID', 'Add a unique identifier for the workflow');
    }

    if (!workflow.name) {
      this.addError('structural', 'high', undefined, undefined, 
        'Workflow must have a name', 'Add a descriptive name for the workflow');
    }

    if (!workflow.nodes || workflow.nodes.length === 0) {
      this.addError('structural', 'critical', undefined, undefined, 
        'Workflow must contain at least one node', 'Add nodes to define workflow behavior');
      return;
    }

    if (!workflow.edges) {
      workflow.edges = [];
    }

    // Check for duplicate node IDs
    const nodeIds = workflow.nodes.map(n => n.id);
    const duplicateIds = nodeIds.filter((id, index) => nodeIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      this.addError('structural', 'critical', undefined, undefined, 
        `Duplicate node IDs found: ${duplicateIds.join(', ')}`, 
        'Ensure all node IDs are unique');
    }

    // Check for duplicate edge IDs
    const edgeIds = workflow.edges.map(e => e.id);
    const duplicateEdgeIds = edgeIds.filter((id, index) => edgeIds.indexOf(id) !== index);
    if (duplicateEdgeIds.length > 0) {
      this.addError('structural', 'high', undefined, undefined, 
        `Duplicate edge IDs found: ${duplicateEdgeIds.join(', ')}`, 
        'Ensure all edge IDs are unique');
    }
  }

  /**
   * Validate individual nodes
   */
  private validateNodes(nodes: WorkflowNode[]): void {
    for (const node of nodes) {
      this.validateNode(node);
    }
  }

  /**
   * Validate a single node
   */
  private validateNode(node: WorkflowNode): void {
    // Check required node fields
    if (!node.id) {
      this.addError('structural', 'critical', undefined, undefined, 
        'Node must have an ID', 'Add a unique identifier for the node');
    }

    if (!node.type) {
      this.addError('structural', 'critical', node.id, undefined, 
        'Node must have a type', 'Specify a valid node type');
      return;
    }

    if (!Object.values(NodeType).includes(node.type)) {
      this.addError('structural', 'critical', node.id, undefined, 
        `Invalid node type: ${node.type}`, 'Use a valid node type from the NodeType enum');
      return;
    }

    // Validate node configuration
    this.validateNodeConfiguration(node);

    // Validate node position
    if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
      this.addWarning('best_practice', node.id, 
        'Node should have valid position coordinates', 
        'Set x and y coordinates for proper workflow visualization');
    }

    // Validate node data
    if (!node.data) {
      this.addWarning('best_practice', node.id, 
        'Node should have data object with label and description', 
        'Add descriptive label and description for better maintainability');
    } else {
      if (!node.data.label) {
        this.addWarning('best_practice', node.id, 
          'Node should have a descriptive label', 
          'Add a clear, action-oriented label');
      }
      if (!node.data.description) {
        this.addWarning('maintainability', node.id, 
          'Node should have a description', 
          'Add a description explaining the node purpose');
      }
    }
  }

  /**
   * Validate node configuration
   */
  private validateNodeConfiguration(node: WorkflowNode): void {
    const requiredFields = REQUIRED_CONFIG_FIELDS[node.type] || [];
    const config = node.data?.config || {};

    for (const field of requiredFields) {
      if (!(field in config) || config[field] === undefined || config[field] === null || config[field] === '') {
        this.addError('configuration', 'high', node.id, undefined, 
          `Missing required configuration field: ${field}`, 
          `Add the ${field} configuration parameter`);
      }
    }

    // Type-specific validation
    this.validateTypeSpecificConfiguration(node);
  }

  /**
   * Validate type-specific configuration
   */
  private validateTypeSpecificConfiguration(node: WorkflowNode): void {
    const config = node.data?.config || {};

    switch (node.type) {
      case NodeType.WEBSOCKET_CONFIG:
        if (config.port && (config.port < 1 || config.port > 65535)) {
          this.addError('configuration', 'medium', node.id, undefined, 
            'WebSocket port must be between 1 and 65535', 
            'Use a valid port number');
        }
        break;

      case NodeType.LIVE_DESKTOP:
        if (config.fps && (config.fps < 1 || config.fps > 60)) {
          this.addWarning('performance', node.id, 
            'FPS should be between 1 and 60 for optimal performance', 
            'Adjust FPS to a reasonable value');
        }
        if (config.quality && (config.quality < 1 || config.quality > 100)) {
          this.addError('configuration', 'medium', node.id, undefined, 
            'Quality must be between 1 and 100', 
            'Set quality to a value between 1 and 100');
        }
        break;

      case NodeType.OCR_REGION:
        if (config.x < 0 || config.y < 0 || config.width <= 0 || config.height <= 0) {
          this.addError('configuration', 'medium', node.id, undefined, 
            'OCR region coordinates must be positive', 
            'Set valid coordinates and dimensions');
        }
        break;

      case NodeType.HTTP_REQUEST_ACTION:
        if (config.url && !this.isValidUrl(config.url)) {
          this.addError('configuration', 'high', node.id, undefined, 
            'Invalid URL format', 
            'Provide a valid HTTP/HTTPS URL');
        }
        if (config.method && !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method.toUpperCase())) {
          this.addError('configuration', 'medium', node.id, undefined, 
            'Invalid HTTP method', 
            'Use a valid HTTP method (GET, POST, PUT, DELETE, PATCH)');
        }
        break;

      case NodeType.DELAY:
        if (config.duration && config.duration < 0) {
          this.addError('configuration', 'medium', node.id, undefined, 
            'Delay duration must be positive', 
            'Set a positive delay duration');
        }
        if (config.duration && config.duration > 300000) { // 5 minutes
          this.addWarning('performance', node.id, 
            'Long delays may impact workflow performance', 
            'Consider if such a long delay is necessary');
        }
        break;
    }
  }

  /**
   * Validate workflow edges
   */
  private validateEdges(edges: WorkflowEdge[], nodes: WorkflowNode[]): void {
    const nodeIds = new Set(nodes.map(n => n.id));

    for (const edge of edges) {
      this.validateEdge(edge, nodeIds, nodes);
    }
  }

  /**
   * Validate a single edge
   */
  private validateEdge(edge: WorkflowEdge, nodeIds: Set<string>, nodes: WorkflowNode[]): void {
    // Check edge structure
    if (!edge.id) {
      this.addError('structural', 'high', undefined, undefined, 
        'Edge must have an ID', 'Add a unique identifier for the edge');
    }

    if (!edge.source) {
      this.addError('structural', 'critical', undefined, edge.id, 
        'Edge must have a source node', 'Specify the source node ID');
      return;
    }

    if (!edge.target) {
      this.addError('structural', 'critical', undefined, edge.id, 
        'Edge must have a target node', 'Specify the target node ID');
      return;
    }

    // Check if referenced nodes exist
    if (!nodeIds.has(edge.source)) {
      this.addError('connection', 'critical', undefined, edge.id, 
        `Edge references non-existent source node: ${edge.source}`, 
        'Ensure the source node exists in the workflow');
    }

    if (!nodeIds.has(edge.target)) {
      this.addError('connection', 'critical', undefined, edge.id, 
        `Edge references non-existent target node: ${edge.target}`, 
        'Ensure the target node exists in the workflow');
    }

    // Prevent self-loops
    if (edge.source === edge.target) {
      this.addError('connection', 'high', edge.source, edge.id, 
        'Node cannot connect to itself', 
        'Connect to a different node');
    }
  }

  /**
   * Validate node connections based on compatibility matrix
   */
  private validateConnections(workflow: WorkflowDefinition): void {
    const nodeMap = new Map(workflow.nodes.map(n => [n.id, n]));

    for (const edge of workflow.edges) {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);

      if (!sourceNode || !targetNode) continue;

      const sourceCompatibility = NODE_COMPATIBILITY_MATRIX[sourceNode.type];
      const targetCompatibility = NODE_COMPATIBILITY_MATRIX[targetNode.type];

      // Check if source can connect to target
      if (!sourceCompatibility.canConnectTo.includes(targetNode.type)) {
        this.addError('connection', 'high', sourceNode.id, edge.id, 
          `${sourceNode.type} cannot connect to ${targetNode.type}`, 
          'Check node compatibility and use appropriate connection patterns');
      }

      // Check if target can receive from source
      if (!targetCompatibility.canReceiveFrom.includes(sourceNode.type)) {
        this.addError('connection', 'high', targetNode.id, edge.id, 
          `${targetNode.type} cannot receive connections from ${sourceNode.type}`, 
          'Check node compatibility and use appropriate connection patterns');
      }
    }

    // Check connection count constraints
    this.validateConnectionCounts(workflow, nodeMap);
  }

  /**
   * Validate connection count constraints
   */
  private validateConnectionCounts(workflow: WorkflowDefinition, nodeMap: Map<string, WorkflowNode>): void {
    const incomingCounts = new Map<string, number>();
    const outgoingCounts = new Map<string, number>();

    // Count connections
    for (const edge of workflow.edges) {
      outgoingCounts.set(edge.source, (outgoingCounts.get(edge.source) || 0) + 1);
      incomingCounts.set(edge.target, (incomingCounts.get(edge.target) || 0) + 1);
    }

    // Validate against constraints
    for (const node of workflow.nodes) {
      const compatibility = NODE_COMPATIBILITY_MATRIX[node.type];
      const incoming = incomingCounts.get(node.id) || 0;
      const outgoing = outgoingCounts.get(node.id) || 0;

      // Check maximum constraints
      if (compatibility.maxIncoming && incoming > compatibility.maxIncoming) {
        this.addError('connection', 'high', node.id, undefined, 
          `Node has too many incoming connections (${incoming}/${compatibility.maxIncoming})`, 
          'Reduce the number of incoming connections');
      }

      if (compatibility.maxOutgoing && outgoing > compatibility.maxOutgoing) {
        this.addError('connection', 'high', node.id, undefined, 
          `Node has too many outgoing connections (${outgoing}/${compatibility.maxOutgoing})`, 
          'Reduce the number of outgoing connections');
      }

      // Check required constraints
      if (compatibility.requiresIncoming && incoming === 0) {
        this.addError('connection', 'high', node.id, undefined, 
          'Node requires at least one incoming connection', 
          'Add an incoming connection from a compatible node');
      }

      if (compatibility.requiresOutgoing && outgoing === 0) {
        this.addError('connection', 'high', node.id, undefined, 
          'Node requires at least one outgoing connection', 
          'Add an outgoing connection to a compatible node');
      }
    }
  }

  /**
   * Validate execution flow
   */
  private validateExecutionFlow(workflow: WorkflowDefinition): void {
    // Check for trigger nodes
    const triggerNodes = workflow.nodes.filter(node => 
      [NodeType.MANUAL_TRIGGER, NodeType.WEBHOOK_TRIGGER].includes(node.type)
    );

    if (triggerNodes.length === 0) {
      this.addError('structural', 'critical', undefined, undefined, 
        'Workflow must have at least one trigger node', 
        'Add a manual trigger or webhook trigger to start the workflow');
    }

    // Check for result nodes
    const resultNodes = workflow.nodes.filter(node => 
      node.type === NodeType.WORKFLOW_RESULT
    );

    if (resultNodes.length === 0) {
      this.addWarning('best_practice', undefined, 
        'Workflow should have at least one result node', 
        'Add a workflow result node to properly conclude the workflow');
    }

    // Check for circular dependencies
    try {
      this.detectCircularDependencies(workflow);
    } catch (error) {
      this.addError('structural', 'critical', undefined, undefined, 
        'Circular dependency detected in workflow', 
        'Remove circular connections to ensure proper execution order');
    }

    // Check for unreachable nodes
    this.validateReachability(workflow);
  }

  /**
   * Detect circular dependencies using DFS
   */
  private detectCircularDependencies(workflow: WorkflowDefinition): void {
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (nodeId: string): void => {
      if (visiting.has(nodeId)) {
        throw new Error(`Circular dependency detected involving node: ${nodeId}`);
      }
      if (visited.has(nodeId)) return;

      visiting.add(nodeId);
      
      const outgoingEdges = workflow.edges.filter(edge => edge.source === nodeId);
      for (const edge of outgoingEdges) {
        visit(edge.target);
      }
      
      visiting.delete(nodeId);
      visited.add(nodeId);
    };

    for (const node of workflow.nodes) {
      if (!visited.has(node.id)) {
        visit(node.id);
      }
    }
  }

  /**
   * Validate node reachability
   */
  private validateReachability(workflow: WorkflowDefinition): void {
    const triggerNodes = workflow.nodes.filter(node => 
      [NodeType.MANUAL_TRIGGER, NodeType.WEBHOOK_TRIGGER].includes(node.type)
    );

    if (triggerNodes.length === 0) return;

    const reachable = new Set<string>();
    const queue = [...triggerNodes.map(n => n.id)];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (reachable.has(nodeId)) continue;
      
      reachable.add(nodeId);
      
      const outgoingEdges = workflow.edges.filter(edge => edge.source === nodeId);
      for (const edge of outgoingEdges) {
        if (!reachable.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }

    // Check for unreachable nodes
    for (const node of workflow.nodes) {
      if (!reachable.has(node.id) && !triggerNodes.some(t => t.id === node.id)) {
        this.addWarning('best_practice', node.id, 
          'Node is not reachable from any trigger', 
          'Connect this node to the main execution flow or remove it');
      }
    }
  }

  /**
   * Validate performance considerations
   */
  private validatePerformance(workflow: WorkflowDefinition): void {
    // Check workflow complexity
    if (workflow.nodes.length > 20) {
      this.addWarning('performance', undefined, 
        'Large workflow may impact performance', 
        'Consider breaking into smaller sub-workflows');
    }

    // Check for excessive delays
    const delayNodes = workflow.nodes.filter(node => node.type === NodeType.DELAY);
    if (delayNodes.length > 5) {
      this.addWarning('performance', undefined, 
        'Many delay nodes may slow down execution', 
        'Review if all delays are necessary');
    }

    // Check for potential bottlenecks
    const nodeConnectionCounts = new Map<string, number>();
    for (const edge of workflow.edges) {
      nodeConnectionCounts.set(edge.target, (nodeConnectionCounts.get(edge.target) || 0) + 1);
    }

    for (const [nodeId, count] of nodeConnectionCounts) {
      if (count > 5) {
        this.addWarning('performance', nodeId, 
          'Node has many incoming connections, potential bottleneck', 
          'Consider parallel processing or workflow restructuring');
      }
    }
  }

  /**
   * Validate best practices
   */
  private validateBestPractices(workflow: WorkflowDefinition): void {
    // Check for descriptive naming
    for (const node of workflow.nodes) {
      if (node.id.length < 3) {
        this.addWarning('maintainability', node.id, 
          'Node ID should be more descriptive', 
          'Use meaningful, descriptive identifiers');
      }

      if (node.data?.label && node.data.label.length < 3) {
        this.addWarning('maintainability', node.id, 
          'Node label should be more descriptive', 
          'Use clear, action-oriented labels');
      }
    }

    // Check for error handling
    const hasErrorHandling = workflow.nodes.some(node => 
      node.data?.config?.errorHandling || 
      node.data?.config?.retryAttempts ||
      node.data?.config?.fallbackNode
    );

    if (!hasErrorHandling) {
      this.addSuggestion('enhancement', undefined, 
        'Consider adding error handling to critical nodes', 
        'Add retry logic, fallback paths, or error handling configuration');
    }

    // Check for filesystem organization
    const filesystemNodes = workflow.nodes.filter(node => 
      node.data?.config?.enableFileSystem || 
      node.type === NodeType.SEND_TO_FILESYSTEM
    );

    if (filesystemNodes.length > 0) {
      const hasOrganizedPaths = filesystemNodes.some(node => 
        node.data?.config?.fileSystemPath?.includes('${WORKFLOW_ID}') ||
        node.data?.config?.directory?.includes('${WORKFLOW_ID}')
      );

      if (!hasOrganizedPaths) {
        this.addSuggestion('optimization', undefined, 
          'Consider organizing filesystem outputs by workflow', 
          'Use ${WORKFLOW_ID} or ${EXECUTION_ID} in file paths for better organization');
      }
    }
  }

  /**
   * Helper methods for adding validation results
   */
  private addError(type: ValidationError['type'], severity: ValidationError['severity'], 
                  nodeId?: string, edgeId?: string, message?: string, fix?: string): void {
    this.errors.push({ type, severity, nodeId, edgeId, message: message || '', fix });
  }

  private addWarning(type: ValidationWarning['type'], nodeId?: string, 
                    message?: string, recommendation?: string): void {
    this.warnings.push({ type, nodeId, message: message || '', recommendation });
  }

  private addSuggestion(type: ValidationSuggestion['type'], nodeId?: string, 
                       message?: string, implementation?: string): void {
    this.suggestions.push({ type, nodeId, message: message || '', implementation });
  }

  /**
   * Utility method to validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Convenience function to validate a workflow
 */
export function validateWorkflow(workflow: WorkflowDefinition): ValidationResult {
  const validator = new WorkflowValidator();
  return validator.validateWorkflow(workflow);
}

/**
 * Export validation utilities
 */
export {
  NODE_COMPATIBILITY_MATRIX,
  REQUIRED_CONFIG_FIELDS
};

export default WorkflowValidator;