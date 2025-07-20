/**
 * TRAE Visual Workflow System - Node Templates
 * 
 * This file re-exports all node templates from the modular structure.
 * The actual templates are now organized in separate files by category.
 * 
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

// Re-export everything from the new modular structure
export * from './nodes/index';

// Import for backward compatibility
import NODE_TEMPLATES from './nodes/index';

// Default export for backward compatibility
export default NODE_TEMPLATES;

// Legacy exports for backward compatibility
import {
  TRIGGER_TEMPLATES,
  ACTION_TEMPLATES,
  LOGIC_TEMPLATES,
  DATA_TEMPLATES,
  getTemplate as getNodeTemplate,
  getTemplatesByCategory as getNodeTemplatesByCategory,
  createNode as createNodeFromTemplate,
  validateConfig as validateNodeConfig
} from './nodes/index';

export {
  TRIGGER_TEMPLATES,
  ACTION_TEMPLATES,
  LOGIC_TEMPLATES,
  DATA_TEMPLATES,
  getNodeTemplate,
  getNodeTemplatesByCategory,
  createNodeFromTemplate,
  validateNodeConfig
};