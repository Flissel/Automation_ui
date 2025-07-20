/**
 * TRAE Visual Workflow System - Node Templates Index
 * 
 * Main export file for all node templates and utilities
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

// Import all node template categories
import { TRIGGER_TEMPLATES } from './triggerNodes';
import { ACTION_TEMPLATES } from './actionNodes';
import { LOGIC_TEMPLATES } from './logicNodes';
import { DATA_TEMPLATES } from './dataNodes';
import { SNAPSHOT_TEMPLATES } from './snapshotNodes';
import { ADVANCED_AUTOMATION_TEMPLATES } from './advancedAutomationNodes';

// Import types and utilities
import * as NodeTemplateModule from './nodeTemplate';
import type { NodeTemplate } from './nodeTemplate';
import {
  getNodeTemplate,
  getNodeTemplatesByCategory,
  createNodeFromTemplate,
  validateNodeConfig
} from './types';

// Re-export types and utilities
export {
  NodeTemplate,
  getNodeTemplate,
  getNodeTemplatesByCategory,
  createNodeFromTemplate,
  validateNodeConfig
};

// Re-export individual template categories
export {
  TRIGGER_TEMPLATES,
  ACTION_TEMPLATES,
  LOGIC_TEMPLATES,
  DATA_TEMPLATES,
  SNAPSHOT_TEMPLATES,
  ADVANCED_AUTOMATION_TEMPLATES
};

// ============================================================================
// COMBINED NODE TEMPLATES
// ============================================================================

/**
 * All available node templates combined into a single object
 */
export const NODE_TEMPLATES: Record<string, NodeTemplate> = {
  ...TRIGGER_TEMPLATES,
  ...ACTION_TEMPLATES,
  ...LOGIC_TEMPLATES,
  ...DATA_TEMPLATES,
  ...SNAPSHOT_TEMPLATES,
  ...ADVANCED_AUTOMATION_TEMPLATES
};

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Get all available node types
 */
export function getAllNodeTypes(): string[] {
  return Object.keys(NODE_TEMPLATES);
}

/**
 * Get node template by type (convenience wrapper)
 */
export function getTemplate(nodeType: string): NodeTemplate | null {
  return getNodeTemplate(nodeType, NODE_TEMPLATES);
}

/**
 * Get templates by category (convenience wrapper)
 */
export function getTemplatesByCategory(category: string): NodeTemplate[] {
  return getNodeTemplatesByCategory(category as any, NODE_TEMPLATES);
}

/**
 * Create node from template (convenience wrapper)
 */
export function createNode(
  nodeType: string,
  position: { x: number; y: number },
  customConfig?: Record<string, any>
) {
  return createNodeFromTemplate(nodeType, position, NODE_TEMPLATES, customConfig);
}

/**
 * Validate node configuration (convenience wrapper)
 */
export function validateConfig(
  nodeType: string,
  config: Record<string, any>
) {
  return validateNodeConfig(nodeType, config, NODE_TEMPLATES);
}

/**
 * Get all templates as an array
 */
export function getAllTemplates(): NodeTemplate[] {
  return Object.values(NODE_TEMPLATES);
}

/**
 * Search templates by label or description
 */
export function searchTemplates(query: string): NodeTemplate[] {
  const lowercaseQuery = query.toLowerCase();
  return getAllTemplates().filter(template => 
    template.label.toLowerCase().includes(lowercaseQuery) ||
    template.description.toLowerCase().includes(lowercaseQuery)
  );
}

/**
 * Get template statistics
 */
export function getTemplateStats() {
  const templates = getAllTemplates();
  const categories = new Set(templates.map(t => t.category));
  
  return {
    total: templates.length,
    categories: Array.from(categories),
    categoryCount: categories.size,
    byCategory: Object.fromEntries(
      Array.from(categories).map(category => [
        category,
        templates.filter(t => t.category === category).length
      ])
    )
  };
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default NODE_TEMPLATES;