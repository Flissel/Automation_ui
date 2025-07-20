/**
 * TRAE Live Desktop - Mouse Event Handler
 * 
 * Centralized mouse interaction handling for OCR regions and canvas
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import { useCallback } from 'react';
import { OCRRegion, ClickAction, MouseEventData, ResizeHandleInfo, InteractionState } from './types';
import { DRAWING_CONSTANTS } from './drawingUtils';

// ============================================================================
// MOUSE INTERACTION UTILITIES
// ============================================================================

/**
 * Gets the resize handle at a specific point for a region
 */
export const getResizeHandle = (
  x: number, 
  y: number, 
  region: OCRRegion
): ResizeHandleInfo | null => {
  const handleSize = DRAWING_CONSTANTS.HANDLE_SIZE;
  const tolerance = DRAWING_CONSTANTS.HANDLE_TOLERANCE;
  const halfHandle = handleSize / 2;
  
  const handles = [
    { id: 'nw', x: region.x - halfHandle, y: region.y - halfHandle },
    { id: 'ne', x: region.x + region.width - halfHandle, y: region.y - halfHandle },
    { id: 'sw', x: region.x - halfHandle, y: region.y + region.height - halfHandle },
    { id: 'se', x: region.x + region.width - halfHandle, y: region.y + region.height - halfHandle }
  ];
  
  for (const handle of handles) {
    const distance = Math.sqrt(
      Math.pow(x - (handle.x + halfHandle), 2) + 
      Math.pow(y - (handle.y + halfHandle), 2)
    );
    
    if (distance <= tolerance) {
      console.log('🔧 [MOUSE] Resize handle detected:', { 
        handle: handle.id, 
        distance, 
        tolerance,
        region: region.id 
      });
      return {
        regionId: region.id,
        handle: handle.id as 'nw' | 'ne' | 'sw' | 'se'
      };
    }
  }
  
  return null;
};

/**
 * Gets the OCR region at a specific point
 */
export const getRegionAtPoint = (
  x: number, 
  y: number, 
  regions: OCRRegion[]
): OCRRegion | null => {
  // Check regions in reverse order (top to bottom in z-index)
  for (let i = regions.length - 1; i >= 0; i--) {
    const region = regions[i];
    if (x >= region.x && 
        x <= region.x + region.width && 
        y >= region.y && 
        y <= region.y + region.height) {
      console.log('🎯 [MOUSE] Region found at point:', { 
        point: { x, y }, 
        region: region.id,
        bounds: { x: region.x, y: region.y, width: region.width, height: region.height }
      });
      return region;
    }
  }
  
  console.log('🚫 [MOUSE] No region found at point:', { x, y });
  return null;
};

/**
 * Calculates the cursor style based on hover state
 */
export const getCursorStyle = (
  hoveredRegion: string | null,
  hoveredHandle: string | null,
  isDrawingOCR: boolean,
  isAddingClick: boolean,
  isSelectingOCRArea: boolean
): string => {
  if (isDrawingOCR || isSelectingOCRArea) return 'crosshair';
  if (isAddingClick) return 'pointer';
  if (hoveredHandle) {
    const handle = hoveredHandle.split('-')[1];
    switch (handle) {
      case 'nw':
      case 'se':
        return 'nw-resize';
      case 'ne':
      case 'sw':
        return 'ne-resize';
      default:
        return 'default';
    }
  }
  if (hoveredRegion) return 'move';
  return 'default';
};

// ============================================================================
// MOUSE EVENT HANDLERS HOOK
// ============================================================================

export interface UseMouseHandlersProps {
  ocrRegions: OCRRegion[];
  clickActions: ClickAction[];
  interactionState: InteractionState;
  setInteractionState: (state: Partial<InteractionState>) => void;
  setOcrRegions: React.Dispatch<React.SetStateAction<OCRRegion[]>>;
  setClickActions: React.Dispatch<React.SetStateAction<ClickAction[]>>;
  onOCRRegionSelect?: (region: OCRRegion) => void;
  onClickActionAdd?: (action: ClickAction) => void;
  isSelectingOCRArea: boolean;
  isFrozen: boolean;
  updateOCRAreaSelection: (x: number, y: number) => void;
  isRecording?: boolean;
}

export const useMouseHandlers = ({
  ocrRegions,
  clickActions,
  interactionState,
  setInteractionState,
  setOcrRegions,
  setClickActions,
  onOCRRegionSelect,
  onClickActionAdd,
  isSelectingOCRArea,
  isFrozen,
  updateOCRAreaSelection,
  isRecording = false
}: UseMouseHandlersProps) => {
  
  // ============================================================================
  // MOUSE DOWN HANDLER
  // ============================================================================
  
  const handleMouseDown = useCallback((eventData: MouseEventData) => {
    const { x, y, canvasType } = eventData;
    
    console.log('🖱️ [MOUSE] Mouse down:', {
      coordinates: { x, y },
      canvasType,
      modes: {
        isDrawingOCR: interactionState.isDrawingOCR,
        isAddingClick: interactionState.isAddingClick,
        isSelectingOCRArea,
        isFrozen
      }
    });

    if (interactionState.isDrawingOCR) {
      console.log('✏️ [MOUSE] Starting new OCR region drawing');
      setInteractionState({
        drawStart: { x, y },
        currentDraw: { x, y, width: 0, height: 0 }
      });
    } else if (interactionState.isAddingClick || isRecording) {
      console.log(`👆 [MOUSE] Adding click action (${interactionState.isAddingClick ? 'manual mode' : 'recording mode'})`);
      const newAction: ClickAction = {
        id: `click-${Date.now()}`,
        x,
        y,
        label: `Click ${clickActions.length + 1}`,
        action: 'click'
      };
      
      setClickActions(prev => [...prev, newAction]);
      
      if (onClickActionAdd) {
        console.log('📤 [MOUSE] Calling onClickActionAdd callback');
        onClickActionAdd(newAction);
      }
      
      // Only disable isAddingClick if we were in manual mode, not recording mode
      if (interactionState.isAddingClick) {
        setInteractionState({ isAddingClick: false });
      }
    } else {
      // Handle region selection and dragging
      const regionAtPoint = getRegionAtPoint(x, y, ocrRegions);
      
      if (regionAtPoint) {
        console.log(`🎯 [MOUSE] Found region: ${regionAtPoint.id}`);
        
        // Check if clicking on resize handle
        const handleInfo = getResizeHandle(x, y, regionAtPoint);
        
        if (handleInfo) {
          console.log(`🔧 [MOUSE] Starting resize: ${handleInfo.handle}`);
          setInteractionState({
            selectedRegion: regionAtPoint.id,
            isResizing: true,
            resizeHandle: handleInfo.handle
          });
          
          if (onOCRRegionSelect) {
            onOCRRegionSelect(regionAtPoint);
          }
        } else {
          console.log(`🚚 [MOUSE] Starting drag: ${regionAtPoint.id}`);
          setInteractionState({
            selectedRegion: regionAtPoint.id,
            isDragging: true,
            dragOffset: {
              x: x - regionAtPoint.x,
              y: y - regionAtPoint.y
            }
          });
          
          if (onOCRRegionSelect) {
            onOCRRegionSelect(regionAtPoint);
          }
        }
      } else {
        console.log('🚫 [MOUSE] No region found - deselecting');
        setInteractionState({ selectedRegion: null });
      }
    }
  }, [
    interactionState.isDrawingOCR,
    interactionState.isAddingClick,
    clickActions.length,
    ocrRegions,
    setInteractionState,
    setClickActions,
    onClickActionAdd,
    onOCRRegionSelect,
    isSelectingOCRArea,
    isFrozen,
    isRecording
  ]);

  // ============================================================================
  // MOUSE MOVE HANDLER
  // ============================================================================
  
  const handleMouseMove = useCallback((eventData: MouseEventData) => {
    const { x, y } = eventData;

    if (interactionState.isDrawingOCR && interactionState.drawStart) {
      const newDraw = {
        x: Math.min(interactionState.drawStart.x, x),
        y: Math.min(interactionState.drawStart.y, y),
        width: Math.abs(x - interactionState.drawStart.x),
        height: Math.abs(y - interactionState.drawStart.y)
      };
      
      console.log('✏️ [MOUSE] Drawing OCR region:', newDraw);
      setInteractionState({ currentDraw: newDraw });
    } else if (isSelectingOCRArea) {
      console.log('🎯 [MOUSE] Updating OCR area selection');
      updateOCRAreaSelection(x, y);
    } else if (interactionState.isDragging && interactionState.selectedRegion) {
      const newX = x - interactionState.dragOffset.x;
      const newY = y - interactionState.dragOffset.y;
      
      console.log(`🚚 [MOUSE] Dragging region ${interactionState.selectedRegion}:`, {
        newPosition: { x: Math.max(0, newX), y: Math.max(0, newY) }
      });
      
      setOcrRegions(prev => prev.map(region => 
        region.id === interactionState.selectedRegion 
          ? { ...region, x: Math.max(0, newX), y: Math.max(0, newY) }
          : region
      ));
    } else if (interactionState.isResizing && interactionState.selectedRegion && interactionState.resizeHandle) {
      const region = ocrRegions.find(r => r.id === interactionState.selectedRegion);
      if (!region) return;
      
      let newRegion = { ...region };
      
      console.log(`🔧 [MOUSE] Resizing region ${interactionState.selectedRegion} with handle ${interactionState.resizeHandle}`);
      
      switch (interactionState.resizeHandle) {
        case 'nw':
          newRegion.width = region.x + region.width - x;
          newRegion.height = region.y + region.height - y;
          newRegion.x = x;
          newRegion.y = y;
          break;
        case 'ne':
          newRegion.width = x - region.x;
          newRegion.height = region.y + region.height - y;
          newRegion.y = y;
          break;
        case 'sw':
          newRegion.width = region.x + region.width - x;
          newRegion.height = y - region.y;
          newRegion.x = x;
          break;
        case 'se':
          newRegion.width = x - region.x;
          newRegion.height = y - region.y;
          break;
      }
      
      // Ensure minimum size
      if (newRegion.width >= DRAWING_CONSTANTS.MIN_REGION_SIZE && 
          newRegion.height >= DRAWING_CONSTANTS.MIN_REGION_SIZE) {
        setOcrRegions(prev => prev.map(r => 
          r.id === interactionState.selectedRegion ? newRegion : r
        ));
      }
    } else {
      // Handle hover states
      const regionAtPoint = getRegionAtPoint(x, y, ocrRegions);
      let newHoveredRegion: string | null = null;
      let newHoveredHandle: string | null = null;
      
      if (regionAtPoint) {
        const handleInfo = getResizeHandle(x, y, regionAtPoint);
        if (handleInfo) {
          newHoveredHandle = `${handleInfo.regionId}-${handleInfo.handle}`;
        } else {
          newHoveredRegion = regionAtPoint.id;
        }
      }
      
      // Only update if hover state changed to avoid unnecessary re-renders
      if (newHoveredRegion !== interactionState.hoveredRegion || 
          newHoveredHandle !== interactionState.hoveredHandle) {
        setInteractionState({
          hoveredRegion: newHoveredRegion,
          hoveredHandle: newHoveredHandle
        });
      }
    }
  }, [
    interactionState.isDrawingOCR,
    interactionState.drawStart,
    interactionState.isDragging,
    interactionState.isResizing,
    interactionState.selectedRegion,
    interactionState.resizeHandle,
    interactionState.dragOffset,
    interactionState.hoveredRegion,
    interactionState.hoveredHandle,
    ocrRegions,
    setInteractionState,
    setOcrRegions,
    isSelectingOCRArea,
    updateOCRAreaSelection
  ]);

  // ============================================================================
  // MOUSE UP HANDLER
  // ============================================================================
  
  const handleMouseUp = useCallback(() => {
    console.log('🖱️ [MOUSE] Mouse up - ending interactions');
    
    if (interactionState.isDrawingOCR && interactionState.currentDraw) {
      const { currentDraw } = interactionState;
      
      // Only create region if it meets minimum size
      if (currentDraw.width >= DRAWING_CONSTANTS.MIN_REGION_SIZE && 
          currentDraw.height >= DRAWING_CONSTANTS.MIN_REGION_SIZE) {
        const newRegion: OCRRegion = {
          id: `ocr-${Date.now()}`,
          x: currentDraw.x,
          y: currentDraw.y,
          width: currentDraw.width,
          height: currentDraw.height,
          label: `OCR ${ocrRegions.length + 1}`
        };
        
        console.log('✅ [MOUSE] Creating new OCR region:', newRegion);
        setOcrRegions(prev => [...prev, newRegion]);
        
        if (onOCRRegionSelect) {
          onOCRRegionSelect(newRegion);
        }
      } else {
        console.warn('⚠️ [MOUSE] OCR region too small, not creating');
      }
    }
    
    // Reset all interaction states
    setInteractionState({
      isDragging: false,
      isResizing: false,
      drawStart: null,
      currentDraw: null,
      resizeHandle: null
    });
  }, [
    interactionState.isDrawingOCR,
    interactionState.currentDraw,
    ocrRegions.length,
    setInteractionState,
    setOcrRegions,
    onOCRRegionSelect
  ]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    getCursorStyle: useCallback(() => getCursorStyle(
      interactionState.hoveredRegion,
      interactionState.hoveredHandle,
      interactionState.isDrawingOCR,
      interactionState.isAddingClick,
      isSelectingOCRArea
    ), [
      interactionState.hoveredRegion,
      interactionState.hoveredHandle,
      interactionState.isDrawingOCR,
      interactionState.isAddingClick,
      isSelectingOCRArea
    ])
  };
};