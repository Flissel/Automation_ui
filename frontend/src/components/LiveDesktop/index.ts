/**
 * TRAE Live Desktop - Module Exports
 * 
 * Centralized exports for all LiveDesktop modules
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

// Main Component
export { default as LiveDesktopCanvas } from './LiveDesktopCanvasRefactored';

// Default export for backward compatibility
export { default } from './LiveDesktopCanvasRefactored';

// Types
export * from './types';

// Modules
export * from './stateManager';
export * from './webSocketManager';
export * from './canvasRenderer';
export * from './mouseHandlers';
export * from './drawingUtils';

// Legacy component (for comparison/fallback)
export { default as LiveDesktopCanvasLegacy } from '../LiveDesktopCanvas';