/**
 * TRAE Visual Workflow System - Node Template Types
 * 
 * Shared interfaces and types for node templates
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

// Local type definitions to avoid circular imports with main types file
// These are duplicated here to prevent module resolution issues
export interface InputPort {
  id: string;
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  defaultValue?: any;
  allowMultiple?: boolean;
}

export interface OutputPort {
  id: string;
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  value?: any;
}

export enum NodeCategory {
  TRIGGERS = 'triggers',
  ACTIONS = 'actions',
  LOGIC = 'logic',
  DATA = 'data',
  DESKTOP = 'desktop',
  AUTOMATION = 'automation'
}

export enum NodeStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  SUCCESS = 'success',
  ERROR = 'error',
  PAUSED = 'paused'
}

export interface NodeData {
  id: string;
  type: string;
  label: string;
  description: string;
  icon: string;
  category: NodeCategory;
  color: string;
  status: NodeStatus;
  inputs: InputPort[];
  outputs: OutputPort[];
  config: Record<string, any>;
  position: { x: number; y: number };
  metadata: {
    created_at: string;
    updated_at?: string;
    template_version: string;
    execution_count?: number;
    last_execution?: string;
    error_count?: number;
    last_error?: string;
  };
  execution?: {
    start_time?: string;
    end_time?: string;
    duration_ms?: number;
    progress?: number;
    error?: string;
    result?: any;
  };
}

// ============================================================================
// NODE TEMPLATE INTERFACE MOVED TO nodeTemplate.ts
// ============================================================================

// NodeTemplate interface has been moved to ./nodeTemplate.ts to resolve import issues

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

import type { NodeTemplate } from './nodeTemplate';

/**
 * Get node template by type
 */
export function getNodeTemplate(nodeType: string, templates: Record<string, NodeTemplate>): NodeTemplate | null {
  return templates[nodeType] || null;
}

/**
 * Get all node templates by category
 */
export function getNodeTemplatesByCategory(category: NodeCategory, templates: Record<string, NodeTemplate>): NodeTemplate[] {
  return Object.values(templates).filter(template => template.category === category);
}

/**
 * Create a new node data instance from template
 */
export function createNodeFromTemplate(
  nodeType: string,
  position: { x: number; y: number },
  templates: Record<string, NodeTemplate>,
  customConfig?: Record<string, any>
): NodeData | null {
  const template = getNodeTemplate(nodeType, templates);
  if (!template) return null;

  const nodeId = `${nodeType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    id: nodeId,
    type: template.type,
    label: template.label,
    category: template.category,
    description: template.description,
    icon: template.icon,
    color: template.color,
    inputs: template.inputs.map(input => ({ ...input })),
    outputs: template.outputs.map(output => ({ ...output })),
    config: { ...template.defaultConfig, ...customConfig },
    status: NodeStatus.IDLE,
    position,
    metadata: {
      created_at: new Date().toISOString(),
      template_version: '2.0.0'
    }
  };
}

/**
 * Validate node configuration against schema
 */
export function validateNodeConfig(
  nodeType: string,
  config: Record<string, any>,
  templates: Record<string, NodeTemplate>
): { valid: boolean; errors: string[] } {
  const template = getNodeTemplate(nodeType, templates);
  if (!template) {
    return { valid: false, errors: ['Unknown node type'] };
  }

  const errors: string[] = [];
  const schema = template.configSchema;

  // Basic validation - can be extended
  for (const [key, schemaField] of Object.entries(schema)) {
    if (schemaField.required && !(key in config)) {
      errors.push(`Required field '${key}' is missing`);
    }
  }

  return { valid: errors.length === 0, errors };
}