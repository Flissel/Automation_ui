
import { Node, Edge, Connection } from '@xyflow/react';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

export interface NodeConnectionRules {
  allowedSources: string[];
  allowedTargets: string[];
  maxInputs?: number;
  maxOutputs?: number;
  requiredInputs?: string[];
}

const NODE_CONNECTION_RULES: Record<string, NodeConnectionRules> = {
  live_desktop: {
    allowedSources: ['websocket_comm', 'manual_trigger', 'schedule_trigger'],
    allowedTargets: ['click_action', 'type_text_action', 'ocr_action'],
    maxInputs: 3,
    maxOutputs: 10,
  },
  websocket_comm: {
    allowedSources: ['manual_trigger', 'schedule_trigger'],
    allowedTargets: ['live_desktop'],
    maxInputs: 1,
    maxOutputs: 5,
  },
  click_action: {
    allowedSources: ['live_desktop', 'if_condition', 'delay'],
    allowedTargets: ['delay', 'if_condition', 'variable_store', 'end'],
    maxInputs: 2,
    maxOutputs: 3,
  },
  type_text_action: {
    allowedSources: ['live_desktop', 'if_condition', 'delay', 'variable_store'],
    allowedTargets: ['delay', 'if_condition', 'variable_store', 'end'],
    maxInputs: 2,
    maxOutputs: 2,
  },
  if_condition: {
    allowedSources: ['live_desktop', 'click_action', 'type_text_action', 'variable_store'],
    allowedTargets: ['click_action', 'type_text_action', 'delay', 'end'],
    maxInputs: 1,
    maxOutputs: 2,
  },
  delay: {
    allowedSources: ['click_action', 'type_text_action', 'if_condition'],
    allowedTargets: ['click_action', 'type_text_action', 'if_condition', 'end'],
    maxInputs: 1,
    maxOutputs: 1,
  },
  variable_store: {
    allowedSources: ['live_desktop', 'click_action', 'type_text_action'],
    allowedTargets: ['if_condition', 'type_text_action'],
    maxInputs: 3,
    maxOutputs: 5,
  },
  manual_trigger: {
    allowedSources: [],
    allowedTargets: ['live_desktop', 'websocket_comm'],
    maxInputs: 0,
    maxOutputs: 3,
  },
  schedule_trigger: {
    allowedSources: [],
    allowedTargets: ['live_desktop', 'websocket_comm'],
    maxInputs: 0,
    maxOutputs: 3,
  },
  end: {
    allowedSources: ['click_action', 'type_text_action', 'if_condition', 'delay'],
    allowedTargets: [],
    maxInputs: 10,
    maxOutputs: 0,
  },
};

export class ConnectionValidator {
  static validateConnection(params: Connection, nodes: Node[]): ValidationResult {
    const sourceNode = nodes.find(n => n.id === params.source);
    const targetNode = nodes.find(n => n.id === params.target);

    if (!sourceNode || !targetNode) {
      return { valid: false, error: 'Source or target node not found' };
    }

    const sourceRules = NODE_CONNECTION_RULES[(sourceNode.data as any)?.type];
    const targetRules = NODE_CONNECTION_RULES[(targetNode.data as any)?.type];

    if (!sourceRules || !targetRules) {
      return { valid: false, error: 'Unknown node type in connection' };
    }

    // Check if target is allowed for source
    if (!sourceRules.allowedTargets.includes((targetNode.data as any)?.type)) {
      return {
        valid: false,
        error: `${(sourceNode.data as any)?.type} cannot connect to ${(targetNode.data as any)?.type}`
      };
    }

    // Check if source is allowed for target
    if (!targetRules.allowedSources.includes((sourceNode.data as any)?.type)) {
      return {
        valid: false,
        error: `${(targetNode.data as any)?.type} cannot accept connections from ${(sourceNode.data as any)?.type}`
      };
    }

    return { valid: true };
  }

  static validateWorkflow(nodes: Node[], edges: Edge[]): ValidationResult {
    // Check for required start nodes
    const hasValidStart = nodes.some(n => 
      (n.data as any)?.type === 'manual_trigger' || (n.data as any)?.type === 'schedule_trigger'
    );

    if (!hasValidStart) {
      return { valid: false, error: 'Workflow must have a trigger node (Manual or Schedule)' };
    }

    // Check for end nodes
    const hasEnd = nodes.some(n => (n.data as any)?.type === 'end');
    if (!hasEnd) {
      return { valid: false, error: 'Workflow must have an End node' };
    }

    // Check Live Desktop + WebSocket requirement
    const liveDesktopNodes = nodes.filter(n => (n.data as any)?.type === 'live_desktop');
    const websocketNodes = nodes.filter(n => (n.data as any)?.type === 'websocket_comm');

    if (liveDesktopNodes.length > 0 && websocketNodes.length === 0) {
      return { 
        valid: false, 
        error: 'Live Desktop nodes require WebSocket Communication nodes' 
      };
    }

    // Check for orphaned nodes
    const connectedNodeIds = new Set();
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    const orphanedNodes = nodes.filter(n => 
      !connectedNodeIds.has(n.id) && 
      (n.data as any)?.type !== 'manual_trigger' && 
      (n.data as any)?.type !== 'schedule_trigger'
    );

    if (orphanedNodes.length > 0) {
      return {
        valid: true,
        warning: `${orphanedNodes.length} nodes are not connected to the workflow`
      };
    }

    return { valid: true };
  }
}
