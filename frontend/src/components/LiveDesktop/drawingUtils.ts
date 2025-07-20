/**
 * TRAE Live Desktop - Drawing Utilities
 * 
 * Centralized drawing functions for OCR regions, handles, and overlays
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import { OCRRegion, ClickAction, DrawingOptions } from './types';

// ============================================================================
// DRAWING CONSTANTS
// ============================================================================

export const DRAWING_CONSTANTS = {
  HANDLE_SIZE: 10,
  HANDLE_TOLERANCE: 10,
  MIN_REGION_SIZE: 10,
  SELECTION_DASH: [5, 5],
  COLORS: {
    OCR_REGION: '#3b82f6',
    OCR_REGION_SELECTED: '#1d4ed8',
    OCR_REGION_HOVERED: '#60a5fa',
    HANDLE: '#ffffff',
    HANDLE_BORDER: '#1d4ed8',
    CLICK_ACTION: '#ef4444',
    FREEZE_OVERLAY: 'rgba(59, 130, 246, 0.1)',
    SELECTION: 'rgba(59, 130, 246, 0.2)'
  }
} as const;

// ============================================================================
// OCR REGION DRAWING
// ============================================================================

/**
 * Draws all OCR regions on the overlay canvas
 */
export const drawOCRRegions = (
  ctx: CanvasRenderingContext2D,
  regions: OCRRegion[],
  options: DrawingOptions
): void => {
  console.log('🎨 [DRAWING] Drawing OCR regions:', { count: regions.length, options });
  
  regions.forEach(region => {
    drawSingleOCRRegion(ctx, region, options);
  });
};

/**
 * Draws a single OCR region with proper styling
 */
export const drawSingleOCRRegion = (
  ctx: CanvasRenderingContext2D,
  region: OCRRegion,
  options: DrawingOptions
): void => {
  const isSelected = options.selectedRegion === region.id;
  const isHovered = options.hoveredRegion === region.id;
  
  ctx.save();
  
  // Determine colors based on state
  let strokeColor = DRAWING_CONSTANTS.COLORS.OCR_REGION;
  let fillColor = 'rgba(59, 130, 246, 0.1)';
  
  if (isSelected) {
    strokeColor = DRAWING_CONSTANTS.COLORS.OCR_REGION_SELECTED;
    fillColor = 'rgba(29, 78, 216, 0.2)';
  } else if (isHovered) {
    strokeColor = DRAWING_CONSTANTS.COLORS.OCR_REGION_HOVERED;
    fillColor = 'rgba(96, 165, 250, 0.15)';
  }
  
  // Draw region background
  ctx.fillStyle = fillColor;
  ctx.fillRect(region.x, region.y, region.width, region.height);
  
  // Draw region border
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = isSelected ? 3 : 2;
  ctx.setLineDash([]);
  ctx.strokeRect(region.x, region.y, region.width, region.height);
  
  // Draw region label
  drawRegionLabel(ctx, region, isSelected);
  
  // Draw resize handles if selected and enabled
  if (isSelected && options.showHandles) {
    drawResizeHandles(ctx, region, options.hoveredHandle);
  }
  
  ctx.restore();
};

/**
 * Draws region label with background
 */
export const drawRegionLabel = (
  ctx: CanvasRenderingContext2D,
  region: OCRRegion,
  isSelected: boolean
): void => {
  const label = region.label || region.id;
  const fontSize = 12;
  const padding = 4;
  
  ctx.font = `${fontSize}px Arial`;
  const textMetrics = ctx.measureText(label);
  const textWidth = textMetrics.width;
  const textHeight = fontSize;
  
  // Position label above region, or below if not enough space
  const labelX = region.x;
  const labelY = region.y > textHeight + padding * 2 ? region.y - padding : region.y + region.height + textHeight + padding;
  
  // Draw label background
  ctx.fillStyle = isSelected ? DRAWING_CONSTANTS.COLORS.OCR_REGION_SELECTED : DRAWING_CONSTANTS.COLORS.OCR_REGION;
  ctx.fillRect(labelX, labelY - textHeight - padding, textWidth + padding * 2, textHeight + padding * 2);
  
  // Draw label text
  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, labelX + padding, labelY - padding);
};

/**
 * Draws resize handles for selected regions
 */
export const drawResizeHandles = (
  ctx: CanvasRenderingContext2D,
  region: OCRRegion,
  hoveredHandle: string | null
): void => {
  const handleSize = DRAWING_CONSTANTS.HANDLE_SIZE;
  const halfHandle = handleSize / 2;
  
  const handles = [
    { id: `${region.id}-nw`, x: region.x - halfHandle, y: region.y - halfHandle },
    { id: `${region.id}-ne`, x: region.x + region.width - halfHandle, y: region.y - halfHandle },
    { id: `${region.id}-sw`, x: region.x - halfHandle, y: region.y + region.height - halfHandle },
    { id: `${region.id}-se`, x: region.x + region.width - halfHandle, y: region.y + region.height - halfHandle }
  ];
  
  handles.forEach(handle => {
    const isHovered = hoveredHandle === handle.id;
    
    ctx.save();
    
    // Draw handle shadow for better visibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    
    // Draw handle background
    ctx.fillStyle = isHovered ? '#fbbf24' : DRAWING_CONSTANTS.COLORS.HANDLE;
    ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
    
    // Draw handle border
    ctx.strokeStyle = DRAWING_CONSTANTS.COLORS.HANDLE_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
    
    // Draw inner border for better contrast
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(handle.x + 1, handle.y + 1, handleSize - 2, handleSize - 2);
    
    ctx.restore();
  });
};

// ============================================================================
// CLICK ACTION DRAWING
// ============================================================================

/**
 * Draws all click actions on the canvas
 */
export const drawClickActions = (
  ctx: CanvasRenderingContext2D,
  actions: ClickAction[]
): void => {
  console.log('🎯 [DRAWING] Drawing click actions:', { count: actions.length });
  
  actions.forEach(action => {
    drawSingleClickAction(ctx, action);
  });
};

/**
 * Draws a single click action marker
 */
export const drawSingleClickAction = (
  ctx: CanvasRenderingContext2D,
  action: ClickAction
): void => {
  const radius = 8;
  
  ctx.save();
  
  // Draw click marker shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  
  // Draw click marker
  ctx.beginPath();
  ctx.arc(action.x, action.y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = DRAWING_CONSTANTS.COLORS.CLICK_ACTION;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Draw action type indicator
  ctx.fillStyle = '#ffffff';
  ctx.font = '10px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const indicator = action.action === 'double_click' ? '2' : 
                   action.action === 'right_click' ? 'R' : '1';
  ctx.fillText(indicator, action.x, action.y);
  
  // Draw action label
  if (action.label) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = DRAWING_CONSTANTS.COLORS.CLICK_ACTION;
    ctx.font = '11px Arial';
    ctx.fillText(action.label, action.x + radius + 4, action.y - radius);
  }
  
  ctx.restore();
};

// ============================================================================
// SELECTION AND OVERLAY DRAWING
// ============================================================================

/**
 * Draws OCR area selection rectangle
 */
export const drawOCRSelection = (
  ctx: CanvasRenderingContext2D,
  selection: { x: number; y: number; width: number; height: number }
): void => {
  ctx.save();
  
  // Draw selection rectangle
  ctx.strokeStyle = DRAWING_CONSTANTS.COLORS.OCR_REGION;
  ctx.lineWidth = 2;
  ctx.setLineDash(DRAWING_CONSTANTS.SELECTION_DASH);
  ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
  
  // Draw selection fill
  ctx.fillStyle = DRAWING_CONSTANTS.COLORS.SELECTION;
  ctx.fillRect(selection.x, selection.y, selection.width, selection.height);
  
  // Draw corner handles
  const handleSize = 8;
  ctx.fillStyle = DRAWING_CONSTANTS.COLORS.OCR_REGION;
  ctx.setLineDash([]);
  
  const handles = [
    { x: selection.x - handleSize/2, y: selection.y - handleSize/2 },
    { x: selection.x + selection.width - handleSize/2, y: selection.y - handleSize/2 },
    { x: selection.x - handleSize/2, y: selection.y + selection.height - handleSize/2 },
    { x: selection.x + selection.width - handleSize/2, y: selection.y + selection.height - handleSize/2 }
  ];
  
  handles.forEach(handle => {
    ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
  });
  
  ctx.restore();
};

/**
 * Draws freeze overlay when desktop is frozen
 */
export const drawFreezeOverlay = (ctx: CanvasRenderingContext2D): void => {
  ctx.save();
  
  // Draw freeze indicator
  ctx.fillStyle = DRAWING_CONSTANTS.COLORS.FREEZE_OVERLAY;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  
  // Draw freeze border
  ctx.strokeStyle = DRAWING_CONSTANTS.COLORS.OCR_REGION;
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 10]);
  ctx.strokeRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  
  ctx.restore();
};

/**
 * Draws current drawing rectangle while user is dragging
 */
export const drawCurrentDraw = (
  ctx: CanvasRenderingContext2D,
  draw: { x: number; y: number; width: number; height: number }
): void => {
  ctx.save();
  
  // Draw drawing rectangle
  ctx.strokeStyle = DRAWING_CONSTANTS.COLORS.OCR_REGION;
  ctx.lineWidth = 2;
  ctx.setLineDash(DRAWING_CONSTANTS.SELECTION_DASH);
  ctx.strokeRect(draw.x, draw.y, draw.width, draw.height);
  
  // Draw semi-transparent fill
  ctx.fillStyle = DRAWING_CONSTANTS.COLORS.SELECTION;
  ctx.fillRect(draw.x, draw.y, draw.width, draw.height);
  
  ctx.restore();
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Clears the entire canvas
 */
export const clearCanvas = (ctx: CanvasRenderingContext2D): void => {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
};

/**
 * Validates if a region meets minimum size requirements
 */
export const isValidRegionSize = (region: { width: number; height: number }): boolean => {
  return region.width >= DRAWING_CONSTANTS.MIN_REGION_SIZE && 
         region.height >= DRAWING_CONSTANTS.MIN_REGION_SIZE;
};