/**
 * TRAE Live Desktop - Canvas Renderer
 * 
 * Core canvas rendering logic with optimized dual-canvas approach
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import { useRef, useCallback, useEffect } from 'react';
import { OCRRegion, ClickAction, ScreenData, CanvasRenderState, InteractionState } from './types';
import { 
  clearCanvas, 
  drawSingleOCRRegion, 
  drawOCRSelection, 
  drawSingleClickAction, 
  drawFreezeOverlay,
  DRAWING_CONSTANTS 
} from './drawingUtils';

// ============================================================================
// CANVAS UTILITIES
// ============================================================================

/**
 * Updates canvas dimensions to match container or screen data
 */
export const updateCanvasDimensions = (
  canvas: HTMLCanvasElement,
  screenData: ScreenData | null,
  containerWidth?: number,
  containerHeight?: number
): void => {
  const width = screenData?.resolution?.width || containerWidth || 800;
  const height = screenData?.resolution?.height || containerHeight || 600;
  
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    console.log('📐 [CANVAS] Dimensions updated:', { width, height });
  }
};

/**
 * Gets canvas context with optimized settings
 */
export const getOptimizedContext = (canvas: HTMLCanvasElement): CanvasRenderingContext2D | null => {
  const ctx = canvas.getContext('2d', {
    alpha: true,
    desynchronized: true,
    willReadFrequently: false
  });
  
  if (ctx) {
    // Optimize for performance
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }
  
  return ctx;
};

// ============================================================================
// BACKGROUND CANVAS RENDERER
// ============================================================================

export interface UseBackgroundRendererProps {
  screenData: ScreenData | null;
  currentFrame: string | null;
  isFrozen: boolean;
  freezeFrame: string | null;
}

export const useBackgroundRenderer = ({
  screenData,
  currentFrame,
  isFrozen,
  freezeFrame
}: UseBackgroundRendererProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const lastFrameRef = useRef<string | null>(null);
  
  // ============================================================================
  // BACKGROUND DRAWING
  // ============================================================================
  
  const drawBackground = useCallback((frameData: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = getOptimizedContext(canvas);
    if (!ctx) return;
    
    // Skip if same frame to avoid unnecessary redraws
    if (frameData === lastFrameRef.current) {
      return;
    }
    
    console.log('🖼️ [BACKGROUND] Drawing frame');
    
    // Create or reuse image element
    if (!imageRef.current) {
      imageRef.current = new Image();
    }
    
    const img = imageRef.current;
    
    img.onload = () => {
      requestAnimationFrame(() => {
        // Clear canvas
        clearCanvas(ctx);
        
        // Draw desktop image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Draw freeze overlay if frozen
        if (isFrozen) {
          drawFreezeOverlay(ctx);
        }
        
        console.log('✅ [BACKGROUND] Frame rendered');
      });
    };
    
    img.onerror = () => {
      console.error('💥 [BACKGROUND] Failed to load frame');
    };
    
    // Check if frameData is already a data URL (from backend)
    if (frameData.startsWith('data:image/')) {
      img.src = frameData;
    } else {
      // Legacy format - wrap with data URL
      img.src = `data:image/png;base64,${frameData}`;
    }
    lastFrameRef.current = frameData;
  }, [isFrozen]);
  
  // ============================================================================
  // FRAME UPDATES
  // ============================================================================
  
  useEffect(() => {
    const frameToRender = isFrozen ? freezeFrame : currentFrame;
    if (frameToRender) {
      drawBackground(frameToRender);
    }
  }, [currentFrame, freezeFrame, isFrozen, drawBackground]);
  
  // ============================================================================
  // CANVAS DIMENSION UPDATES
  // ============================================================================
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && screenData) {
      updateCanvasDimensions(canvas, screenData);
    }
  }, [screenData]);
  
  return {
    canvasRef,
    drawBackground
  };
};

// ============================================================================
// OVERLAY CANVAS RENDERER
// ============================================================================

export interface UseOverlayRendererProps {
  ocrRegions: OCRRegion[];
  clickActions: ClickAction[];
  interactionState: InteractionState;
  screenData: ScreenData | null;
  backgroundCanvasRef: React.RefObject<HTMLCanvasElement>;
}

export const useOverlayRenderer = ({
  ocrRegions,
  clickActions,
  interactionState,
  screenData,
  backgroundCanvasRef
}: UseOverlayRendererProps) => {
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const renderStateRef = useRef<CanvasRenderState>({
    lastOCRRegions: [],
    lastClickActions: [],
    lastInteractionState: {} as InteractionState,
    needsRedraw: true
  });
  
  // ============================================================================
  // OVERLAY DRAWING
  // ============================================================================
  
  const drawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    
    const ctx = getOptimizedContext(canvas);
    if (!ctx) return;
    
    console.log('🎨 [OVERLAY] Drawing overlay');
    
    requestAnimationFrame(() => {
      // Clear overlay
      clearCanvas(ctx);
      
      // Draw OCR regions
      ocrRegions.forEach(region => {
        drawSingleOCRRegion(ctx, region, {
          selectedRegion: interactionState.selectedRegion,
          hoveredRegion: interactionState.hoveredRegion,
          showHandles: region.id === interactionState.selectedRegion,
          hoveredHandle: interactionState.hoveredHandle
        });
      });
      
      // Draw current OCR selection
      if (interactionState.currentDraw) {
        drawOCRSelection(ctx, interactionState.currentDraw);
      }
      
      // Draw click actions
      clickActions.forEach(action => {
        drawSingleClickAction(ctx, action);
      });
      
      console.log('✅ [OVERLAY] Overlay rendered');
    });
  }, [ocrRegions, clickActions, interactionState]);
  
  // ============================================================================
  // SMART REDRAW LOGIC
  // ============================================================================
  
  const shouldRedraw = useCallback((): boolean => {
    const state = renderStateRef.current;
    
    // Force redraw if flagged
    if (state.needsRedraw) {
      return true;
    }
    
    // Check if OCR regions changed
    if (ocrRegions.length !== state.lastOCRRegions.length ||
        ocrRegions.some((region, index) => {
          const lastRegion = state.lastOCRRegions[index];
          return !lastRegion || 
                 region.id !== lastRegion.id ||
                 region.x !== lastRegion.x ||
                 region.y !== lastRegion.y ||
                 region.width !== lastRegion.width ||
                 region.height !== lastRegion.height;
        })) {
      return true;
    }
    
    // Check if click actions changed
    if (clickActions.length !== state.lastClickActions.length ||
        clickActions.some((action, index) => {
          const lastAction = state.lastClickActions[index];
          return !lastAction ||
                 action.id !== lastAction.id ||
                 action.x !== lastAction.x ||
                 action.y !== lastAction.y;
        })) {
      return true;
    }
    
    // Check if interaction state changed
    const { lastInteractionState } = state;
    if (interactionState.selectedRegion !== lastInteractionState.selectedRegion ||
        interactionState.hoveredRegion !== lastInteractionState.hoveredRegion ||
        interactionState.hoveredHandle !== lastInteractionState.hoveredHandle ||
        JSON.stringify(interactionState.currentDraw) !== JSON.stringify(lastInteractionState.currentDraw)) {
      return true;
    }
    
    return false;
  }, [ocrRegions, clickActions, interactionState]);
  
  // ============================================================================
  // OVERLAY UPDATES
  // ============================================================================
  
  useEffect(() => {
    if (shouldRedraw()) {
      drawOverlay();
      
      // Update render state
      renderStateRef.current = {
        lastOCRRegions: [...ocrRegions],
        lastClickActions: [...clickActions],
        lastInteractionState: { ...interactionState },
        needsRedraw: false
      };
    }
  }, [ocrRegions, clickActions, interactionState, shouldRedraw, drawOverlay]);
  
  // ============================================================================
  // CANVAS DIMENSION SYNC
  // ============================================================================
  
  useEffect(() => {
    const overlayCanvas = overlayCanvasRef.current;
    const backgroundCanvas = backgroundCanvasRef.current;
    
    if (overlayCanvas && backgroundCanvas) {
      // Sync dimensions with background canvas
      if (overlayCanvas.width !== backgroundCanvas.width ||
          overlayCanvas.height !== backgroundCanvas.height) {
        overlayCanvas.width = backgroundCanvas.width;
        overlayCanvas.height = backgroundCanvas.height;
        overlayCanvas.style.width = backgroundCanvas.style.width;
        overlayCanvas.style.height = backgroundCanvas.style.height;
        
        console.log('🔄 [OVERLAY] Dimensions synced with background');
        renderStateRef.current.needsRedraw = true;
      }
    }
  }, [screenData, backgroundCanvasRef]);
  
  // Force redraw when screen data changes
  useEffect(() => {
    renderStateRef.current.needsRedraw = true;
  }, [screenData]);
  
  return {
    overlayCanvasRef,
    drawOverlay,
    forceRedraw: () => {
      renderStateRef.current.needsRedraw = true;
      drawOverlay();
    }
  };
};