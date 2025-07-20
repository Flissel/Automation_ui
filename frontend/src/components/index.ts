/**
 * TRAE Visual Workflow System - Components Index
 * 
 * Central export file for all React components
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

// Main workflow components
export { default as WorkflowCanvas } from './WorkflowCanvas';
export { default as NodeLibrary } from './NodeLibrary';
export { default as PropertyPanel } from './PropertyPanel';
export { default as ExecutionMonitor } from './ExecutionMonitor';
export { default as WorkflowToolbar } from './WorkflowToolbar';
export { default as UnifiedWorkspace } from './UnifiedWorkspace';
export { default as DesktopSwitcher } from './DesktopSwitcher';
export { default as LiveDesktopCanvas } from './LiveDesktop';
export { default as WindowsDesktopStreaming } from './WindowsDesktopStreaming';
export { default as LiveDesktopViewer } from './LiveDesktopViewer';

// Node components
export { default as CustomNode } from './nodes/CustomNode';
export { default as RealtimeOCRActionNode } from './nodes/RealtimeOCRActionNode';

// Re-export types for convenience
export type {
  NodeComponentProps,
  CanvasProps,
  PropertyPanelProps,
} from '../types';