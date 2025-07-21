
/**
 * Simplified Connection Validator
 * Validates connections based on simplified node templates
 */

import { Node, Edge, Connection } from '@xyflow/react';
import { SIMPLIFIED_NODE_TEMPLATES } from '../../../config/simplifiedNodeTemplates';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

export class SimplifiedConnectionValidator {
  static validateConnection(params: Connection, nodes: Node[]): ValidationResult {
    const sourceNode = nodes.find(n => n.id === params.source);
    const targetNode = nodes.find(n => n.id === params.target);

    if (!sourceNode || !targetNode) {
      return { valid: false, error: 'Source or target node not found' };
    }

    // Type guard to ensure we have valid node types
    const sourceType = sourceNode.data?.type;
    const targetType = targetNode.data?.type;
    
    if (typeof sourceType !== 'string' || typeof targetType !== 'string') {
      return { valid: false, error: 'Invalid node type' };
    }

    const sourceTemplate = SIMPLIFIED_NODE_TEMPLATES[sourceType];
    const targetTemplate = SIMPLIFIED_NODE_TEMPLATES[targetType];

    if (!sourceTemplate || !targetTemplate) {
      return { valid: false, error: 'Unknown node type in connection' };
    }

    // Config nodes cannot be connected in the flow
    if (sourceTemplate.category === 'config' || targetTemplate.category === 'config') {
      return { valid: false, error: 'Config nodes cannot be connected in workflow flow' };
    }

    // Source must have output
    if (!sourceTemplate.output) {
      return { valid: false, error: `${sourceTemplate.label} cannot be used as source` };
    }

    // Target must have input
    if (!targetTemplate.input) {
      return { valid: false, error: `${targetTemplate.label} cannot accept connections` };
    }

    // Check if target accepts what source provides
    const sourceProvides = sourceTemplate.output.provides;
    const targetAccepts = targetTemplate.input.accepts;

    if (!targetAccepts.includes(sourceProvides)) {
      return {
        valid: false,
        error: `${targetTemplate.label} cannot accept ${sourceProvides} from ${sourceTemplate.label}`
      };
    }

    return { valid: true };
  }

  static validateWorkflow(nodes: Node[], edges: Edge[]): ValidationResult {
    // Must have at least one trigger
    const triggerNodes = nodes.filter(n => {
      const nodeType = n.data?.type;
      if (typeof nodeType !== 'string') return false;
      
      const template = SIMPLIFIED_NODE_TEMPLATES[nodeType];
      return template && template.category === 'triggers';
    });

    if (triggerNodes.length === 0) {
      return { valid: false, error: 'Workflow must have at least one trigger node' };
    }

    // Check for missing dependencies
    for (const node of nodes) {
      const nodeType = node.data?.type;
      if (typeof nodeType !== 'string') continue;
      
      const template = SIMPLIFIED_NODE_TEMPLATES[nodeType];
      if (template && template.dependencies.length > 0) {
        for (const dep of template.dependencies) {
          if (dep.required) {
            const depExists = nodes.some(n => n.data?.type === dep.type);
            if (!depExists) {
              return {
                valid: false,
                error: `${template.label} requires ${dep.description} but none found in workflow`
              };
            }
          }
        }
      }
    }

    // Check for orphaned nodes (except triggers and config)
    const connectedNodeIds = new Set();
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    const orphanedNodes = nodes.filter(n => {
      const nodeType = n.data?.type;
      if (typeof nodeType !== 'string') return false;
      
      const template = SIMPLIFIED_NODE_TEMPLATES[nodeType];
      return template && 
             template.category !== 'triggers' && 
             template.category !== 'config' && 
             !connectedNodeIds.has(n.id);
    });

    if (orphanedNodes.length > 0) {
      return {
        valid: true,
        warning: `${orphanedNodes.length} nodes are not connected to the workflow`
      };
    }

    return { valid: true };
  }

  static checkNodeDependencies(nodeType: string, allNodes: Node[]): ValidationResult {
    const template = SIMPLIFIED_NODE_TEMPLATES[nodeType];
    if (!template) return { valid: true };

    const missingDeps = template.dependencies.filter(dep => {
      if (!dep.required) return false;
      return !allNodes.some(n => n.data?.type === dep.type);
    });

    if (missingDeps.length > 0) {
      return {
        valid: false,
        error: `Missing required dependencies: ${missingDeps.map(d => d.description).join(', ')}`
      };
    }

    return { valid: true };
  }
}
