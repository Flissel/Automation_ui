/**
 * TRAE Live Desktop Canvas Component
 * 
 * Real-time desktop screen capture with OCR regions and click actions
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Square, MousePointer, Eye, Settings } from 'lucide-react';

// ============================================================================
// INTERFACES
// ============================================================================

interface OCRRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  text?: string;
  confidence?: number;
}

interface ClickAction {
  id: string;
  x: number;
  y: number;
  label: string;
  action: 'click' | 'double_click' | 'right_click';
}

interface ScreenData {
  image: string;
  resolution: { width: number; height: number };
  timestamp: string;
}

interface LiveDesktopCanvasProps {
  nodeId?: string;
  embedded?: boolean;
  width?: number | string;
  height?: number | string;
  config?: {
    fps: number;
    scale_factor: number;
    quality: number;
    auto_ocr: boolean;
    change_detection: boolean;
    change_threshold: number;
  };
  onOCRRegionAdd?: (region: OCRRegion) => void;
  onOCRRegionSelect?: (region: OCRRegion) => void;
  onClickActionAdd?: (action: ClickAction) => void;
  onScreenChange?: (data: ScreenData) => void;
  onWebhookTrigger?: (payload: any) => void;
}

// ============================================================================
// LIVE DESKTOP CANVAS COMPONENT
// ============================================================================

const LiveDesktopCanvas: React.FC<LiveDesktopCanvasProps> = ({
  nodeId = 'live-desktop',
  embedded = false,
  width = 400,
  height = 300,
  config = {
    fps: 5,
    scale_factor: 0.6,
    quality: 80,
    auto_ocr: false,
    change_detection: false,
    change_threshold: 0.1
  },
  onOCRRegionAdd,
  onOCRRegionSelect,
  onClickActionAdd,
  onScreenChange,
  onWebhookTrigger
}) => {
  // ============================================================================
  // STATE MANAGEMENT - ALL STATE DECLARATIONS FIRST
  // ============================================================================

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const frameThrottleMs = 1000 / (config.fps || 10); // Throttle based on config FPS
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 400, height: 300 });
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentFrame, setCurrentFrame] = useState<ScreenData | null>(null);
  const [ocrRegions, setOcrRegions] = useState<OCRRegion[]>([]);
  const [clickActions, setClickActions] = useState<ClickAction[]>([]);
  const [isDrawingOCR, setIsDrawingOCR] = useState(false);
  const [isAddingClick, setIsAddingClick] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDraw, setCurrentDraw] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');

  // Enhanced drag and drop state
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);
  
  // Context menu state for right-click OCR region creation
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; canvasX: number; canvasY: number } | null>(null);
  
  // Freeze functionality state
  const [isFrozen, setIsFrozen] = useState(false);
  const [frozenFrame, setFrozenFrame] = useState<string | null>(null);
  const [isSelectingOCRArea, setIsSelectingOCRArea] = useState(false);
  const [ocrSelectionStart, setOcrSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [ocrSelectionCurrent, setOcrSelectionCurrent] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // ============================================================================
  // DEBUG UTILITIES FOR OCR REGIONS (Must be defined before drawing functions)
  // ============================================================================

  const debugOCRRegions = useCallback((action: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.group(`🔍 [OCR DEBUG] ${action} - ${timestamp}`);
    console.log('📊 Current OCR Regions Count:', ocrRegions.length);
    console.log('📋 OCR Regions State:', ocrRegions);
    console.log('🎯 Selected Region:', selectedRegion);
    console.log('🖱️ Hovered Region:', hoveredRegion);
    console.log('🧊 Is Frozen:', isFrozen);
    console.log('✏️ Is Selecting OCR Area:', isSelectingOCRArea);
    if (data) {
      console.log('📦 Additional Data:', data);
    }
    console.groupEnd();
  }, [ocrRegions, selectedRegion, hoveredRegion, isFrozen, isSelectingOCRArea]);

  const validateOCRRegion = useCallback((region: OCRRegion): boolean => {
    const isValid = region.id && 
                   typeof region.x === 'number' && 
                   typeof region.y === 'number' && 
                   typeof region.width === 'number' && 
                   typeof region.height === 'number' && 
                   region.width > 0 && 
                   region.height > 0;
    
    if (!isValid) {
      console.error('❌ [OCR DEBUG] Invalid OCR Region:', region);
    } else {
      console.log('✅ [OCR DEBUG] Valid OCR Region:', region);
    }
    
    return isValid;
  }, []);

  // ============================================================================
  // DRAWING FUNCTIONS (Must be defined before useEffect hooks that use them)
  // ============================================================================

  const drawOCRSelection = useCallback((ctx: CanvasRenderingContext2D, selection: { x: number; y: number; width: number; height: number }) => {
    ctx.save();
    
    // Draw selection rectangle
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
    
    // Draw selection fill
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.fillRect(selection.x, selection.y, selection.width, selection.height);
    
    // Draw corner handles
    const handleSize = 8;
    ctx.fillStyle = '#3b82f6';
    ctx.setLineDash([]);
    
    // Top-left
    ctx.fillRect(selection.x - handleSize/2, selection.y - handleSize/2, handleSize, handleSize);
    // Top-right
    ctx.fillRect(selection.x + selection.width - handleSize/2, selection.y - handleSize/2, handleSize, handleSize);
    // Bottom-left
    ctx.fillRect(selection.x - handleSize/2, selection.y + selection.height - handleSize/2, handleSize, handleSize);
    // Bottom-right
    ctx.fillRect(selection.x + selection.width - handleSize/2, selection.y + selection.height - handleSize/2, handleSize, handleSize);
    
    ctx.restore();
  }, []);

  const drawFreezeOverlay = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.save();
    
    // Draw freeze indicator
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw freeze border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.strokeRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw freeze text
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🧊 DESKTOP FROZEN - Select OCR Area', ctx.canvas.width / 2, 30);
    
    ctx.restore();
  }, []);

  // Helper function to draw resize handles
  const drawResizeHandles = useCallback((ctx: CanvasRenderingContext2D, region: OCRRegion) => {
    const handleSize = 10; // Increased size for better visibility
    const handles = [
      { id: 'nw', x: region.x - handleSize/2, y: region.y - handleSize/2 },
      { id: 'ne', x: region.x + region.width - handleSize/2, y: region.y - handleSize/2 },
      { id: 'sw', x: region.x - handleSize/2, y: region.y + region.height - handleSize/2 },
      { id: 'se', x: region.x + region.width - handleSize/2, y: region.y + region.height - handleSize/2 }
    ];
    
    handles.forEach(handle => {
      // Draw handle with better visibility
      const isHovered = hoveredHandle === `${region.id}-${handle.id}`;
      
      // Draw shadow for better visibility
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      
      // Fill handle
      ctx.fillStyle = isHovered ? '#1d4ed8' : '#3b82f6';
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      // Draw border
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
      
      // Add inner border for better contrast
      ctx.strokeStyle = '#1e40af';
      ctx.lineWidth = 1;
      ctx.strokeRect(handle.x + 1, handle.y + 1, handleSize - 2, handleSize - 2);
    });
  }, [hoveredHandle]);

  // ============================================================================
  // OCR REGIONS DRAWING FUNCTION (Must be defined before useEffect)
  // ============================================================================

  const drawOCRRegions = useCallback((ctx: CanvasRenderingContext2D) => {
    console.log('🎨 [OCR DEBUG] Drawing OCR Regions - Start');
    console.log('📊 [OCR DEBUG] Total regions to draw:', ocrRegions.length);
    
    if (ocrRegions.length === 0) {
      console.log('⚠️ [OCR DEBUG] No OCR regions to draw');
      return;
    }

    ocrRegions.forEach((region, index) => {
      console.log(`🔍 [OCR DEBUG] Drawing region ${index + 1}/${ocrRegions.length}:`, {
        id: region.id,
        label: region.label,
        coordinates: { x: region.x, y: region.y },
        dimensions: { width: region.width, height: region.height },
        text: region.text || 'No text detected'
      });

      // Validate region before drawing
      if (!validateOCRRegion(region)) {
        console.error(`❌ [OCR DEBUG] Skipping invalid region ${region.id}`);
        return;
      }

      const isSelected = selectedRegion === region.id;
      const isHovered = hoveredRegion === region.id;
      
      console.log(`🎯 [OCR DEBUG] Region ${region.id} state:`, {
        isSelected,
        isHovered,
        selectedRegion,
        hoveredRegion
      });
      
      // Draw region border with enhanced visibility
      ctx.strokeStyle = isSelected ? '#1d4ed8' : isHovered ? '#3b82f6' : '#ef4444';
      ctx.lineWidth = isSelected ? 4 : 3;
      ctx.setLineDash(isSelected ? [] : [8, 4]);
      
      // Add semi-transparent background fill for better visibility
      ctx.fillStyle = isSelected 
        ? 'rgba(29, 78, 216, 0.1)' 
        : isHovered 
          ? 'rgba(59, 130, 246, 0.1)' 
          : 'rgba(239, 68, 68, 0.05)';
      
      try {
        // Fill the region background first
        ctx.fillRect(region.x, region.y, region.width, region.height);
        
        // Add shadow for better visibility on top layer
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        // Draw the border
        ctx.strokeRect(region.x, region.y, region.width, region.height);
        console.log(`✅ [OCR DEBUG] Successfully drew border for region ${region.id}`);
      } catch (error) {
        console.error(`❌ [OCR DEBUG] Error drawing border for region ${region.id}:`, error);
      }
      
      // Reset shadow for other elements
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      // Draw selection handles for selected region
      if (isSelected) {
        console.log(`🔧 [OCR DEBUG] Drawing resize handles for selected region ${region.id}`);
        try {
          drawResizeHandles(ctx, region);
          console.log(`✅ [OCR DEBUG] Successfully drew resize handles for region ${region.id}`);
        } catch (error) {
          console.error(`❌ [OCR DEBUG] Error drawing resize handles for region ${region.id}:`, error);
        }
      }
      
      // Draw label background with enhanced styling
      const labelText = region.label;
      ctx.font = 'bold 14px Arial';
      const labelWidth = ctx.measureText(labelText).width + 12;
      const labelHeight = 22;
      
      console.log(`🏷️ [OCR DEBUG] Drawing label for region ${region.id}:`, {
        text: labelText,
        width: labelWidth,
        height: labelHeight,
        position: { x: region.x, y: region.y - labelHeight }
      });
      
      try {
        // Add shadow to label background
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        ctx.fillStyle = isSelected ? '#1d4ed8' : '#ef4444';
        ctx.fillRect(region.x, region.y - labelHeight, labelWidth, labelHeight);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Draw label text with better contrast
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(labelText, region.x + 6, region.y - 6);
        console.log(`✅ [OCR DEBUG] Successfully drew label for region ${region.id}`);
      } catch (error) {
        console.error(`❌ [OCR DEBUG] Error drawing label for region ${region.id}:`, error);
      }
      
      // Draw detected text if available
      if (region.text) {
        console.log(`📝 [OCR DEBUG] Drawing detected text for region ${region.id}:`, region.text);
        try {
          ctx.fillStyle = '#10b981';
          ctx.font = '10px Arial';
          ctx.fillText(region.text, region.x + 5, region.y + 15);
          console.log(`✅ [OCR DEBUG] Successfully drew detected text for region ${region.id}`);
        } catch (error) {
          console.error(`❌ [OCR DEBUG] Error drawing detected text for region ${region.id}:`, error);
        }
      } else {
        console.log(`ℹ️ [OCR DEBUG] No detected text for region ${region.id}`);
      }
    });
    
    ctx.setLineDash([]);
    console.log('🎨 [OCR DEBUG] Drawing OCR Regions - Complete');
  }, [ocrRegions, selectedRegion, hoveredRegion, drawResizeHandles, validateOCRRegion]);

  // ============================================================================
  // OCR REGION VISIBILITY (Removed periodic redraw to fix blinking)
  // ============================================================================

  // OCR regions are now drawn only when needed through the main canvas redraw cycle

  // ============================================================================
  // WEBSOCKET CONNECTION
  // ============================================================================

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    
    try {
      // Use environment variable for WebSocket URL, all pointing to port 8007 now
      const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8007';
      const wsUrl = wsBaseUrl; // No need to replace port since everything is on 8007 now
      console.log('🔌 Connecting to Live Desktop WebSocket:', wsUrl);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Live Desktop WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('connected');
        setIsStreaming(true);
        
        // Send start_streaming message to ensure streaming begins
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const startMessage = {
            type: 'start_streaming'
          };
          wsRef.current.send(JSON.stringify(startMessage));
          console.log('Sent start_streaming message to WebSocket server');
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'desktop_frame' && message.data) {
            const screenData: ScreenData = message.data;
            
            // Only update frame if not frozen and throttle frame rate
            if (!isFrozen) {
              const now = Date.now();
              const timeSinceLastFrame = now - lastFrameTimeRef.current;
              
              // Throttle frame updates to prevent blinking
              if (timeSinceLastFrame >= frameThrottleMs) {
                lastFrameTimeRef.current = now;
                setCurrentFrame(screenData);
                drawFrameOnCanvas(screenData.image);
                
                // Trigger screen change callback
                if (onScreenChange) {
                  onScreenChange(screenData);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('Live Desktop WebSocket disconnected');
        setIsConnected(false);
        setIsStreaming(false);
        setConnectionStatus('disconnected');
      };

      wsRef.current.onerror = (error) => {
        console.error('Live Desktop WebSocket error:', error);
        setConnectionStatus('error');
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
    }
  }, [onScreenChange, isFrozen, frameThrottleMs]);

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsStreaming(false);
    setConnectionStatus('disconnected');
  }, []);

  // ============================================================================
  // DRAWING FUNCTIONS (Must be defined before drawFrameOnCanvas)
  // ============================================================================

  const drawClickActions = useCallback((ctx: CanvasRenderingContext2D) => {
    clickActions.forEach((action) => {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(action.x, action.y, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw label
      ctx.fillStyle = '#ef4444';
      ctx.font = '12px Arial';
      ctx.fillText(action.label, action.x + 12, action.y + 4);
    });
  }, [clickActions]);

  // ============================================================================
  // CANVAS DRAWING
  // ============================================================================

  const drawFrameOnCanvas = useCallback((imageData: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use the appropriate image data (frozen or live)
    const imageToUse = isFrozen && frozenFrame ? frozenFrame : imageData;
    
    const img = new Image();
    img.onload = () => {
      // Use requestAnimationFrame for smoother rendering
      requestAnimationFrame(() => {
        // Clear canvas only once
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Layer 1: Draw the main desktop image (bottom layer)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Layer 2: Draw freeze overlay if frozen (semi-transparent overlay)
        if (isFrozen) {
          drawFreezeOverlay(ctx);
        }
        
        // Layer 3: Draw click actions (middle layer)
        drawClickActions(ctx);
        
        // Layer 4: Draw current OCR selection if active (temporary selection)
        if (isSelectingOCRArea && ocrSelectionCurrent) {
          drawOCRSelection(ctx, ocrSelectionCurrent);
        }
        
        // Layer 5: Draw OCR regions (TOP LAYER - always visible)
        drawOCRRegions(ctx);
        
        console.log('🎨 [OCR DEBUG] Canvas layers drawn in order: Desktop → Freeze → ClickActions → Selection → OCR Regions (top)');
      });
    };
    
    // Set image source to trigger loading
    img.src = imageToUse;
  }, [drawOCRRegions, drawClickActions, drawOCRSelection, drawFreezeOverlay, isFrozen, frozenFrame, isSelectingOCRArea, ocrSelectionCurrent]);

  // Force canvas redraw with current frame data
  const forceCanvasRedraw = useCallback(() => {
    console.log('🔄 [OCR DEBUG] Forcing canvas redraw');
    if (currentFrame) {
      drawFrameOnCanvas(currentFrame.image);
    } else {
      console.warn('⚠️ [OCR DEBUG] No current frame available for redraw');
    }
  }, [currentFrame, drawFrameOnCanvas]);

  // ============================================================================
  // FREEZE FUNCTIONALITY
  // ============================================================================

  const freezeDesktop = useCallback(() => {
    setIsFrozen(true);
    if (currentFrame) {
      setFrozenFrame(currentFrame.image);
    }
    console.log('🧊 Desktop frozen for OCR area selection');
  }, [currentFrame]);

  const unfreezeDesktop = useCallback(() => {
    setIsFrozen(false);
    setFrozenFrame(null);
    setIsSelectingOCRArea(false);
    setOcrSelectionStart(null);
    setOcrSelectionCurrent(null);
    setContextMenu(null);
    console.log('🔥 Desktop unfrozen');
  }, []);

  // ============================================================================
  // OCR AREA SELECTION WITH FREEZE
  // ============================================================================

  const startOCRAreaSelection = useCallback((x: number, y: number) => {
    console.log('🎯 [OCR DEBUG] Starting OCR area selection:', { x, y });
    debugOCRRegions('START_OCR_AREA_SELECTION', { startPoint: { x, y } });
    
    freezeDesktop();
    setIsSelectingOCRArea(true);
    setOcrSelectionStart({ x, y });
    setOcrSelectionCurrent({ x, y, width: 0, height: 0 });
    
    console.log('✅ [OCR DEBUG] OCR area selection started successfully');
  }, [freezeDesktop, debugOCRRegions]);

  const updateOCRAreaSelection = useCallback((x: number, y: number) => {
    if (!isSelectingOCRArea || !ocrSelectionStart) {
      console.log('⚠️ [OCR DEBUG] Cannot update OCR area selection - not in selection mode or no start point');
      return;
    }
    
    const width = x - ocrSelectionStart.x;
    const height = y - ocrSelectionStart.y;
    
    const newSelection = {
      x: Math.min(ocrSelectionStart.x, x),
      y: Math.min(ocrSelectionStart.y, y),
      width: Math.abs(width),
      height: Math.abs(height)
    };
    
    console.log('📐 [OCR DEBUG] Updating OCR area selection:', {
      currentPoint: { x, y },
      startPoint: ocrSelectionStart,
      calculatedDimensions: { width, height },
      finalSelection: newSelection
    });
    
    setOcrSelectionCurrent(newSelection);
  }, [isSelectingOCRArea, ocrSelectionStart]);

  const submitOCRArea = useCallback((label: string = 'OCR Region') => {
    console.log('📝 [OCR DEBUG] Submitting OCR area with label:', label);
    debugOCRRegions('SUBMIT_OCR_AREA', { 
      label, 
      selection: ocrSelectionCurrent,
      minDimensions: { width: 10, height: 10 }
    });

    if (!ocrSelectionCurrent || ocrSelectionCurrent.width < 10 || ocrSelectionCurrent.height < 10) {
      console.warn('⚠️ [OCR DEBUG] OCR area too small or invalid, cancelling submission:', {
        selection: ocrSelectionCurrent,
        minWidth: 10,
        minHeight: 10
      });
      unfreezeDesktop();
      return;
    }

    const newRegion: OCRRegion = {
      id: `ocr-${Date.now()}`,
      x: ocrSelectionCurrent.x,
      y: ocrSelectionCurrent.y,
      width: ocrSelectionCurrent.width,
      height: ocrSelectionCurrent.height,
      label
    };

    console.log('🆕 [OCR DEBUG] Creating new OCR region:', newRegion);

    // Validate the new region
    if (!validateOCRRegion(newRegion)) {
      console.error('❌ [OCR DEBUG] Failed to create valid OCR region, aborting submission');
      unfreezeDesktop();
      return;
    }

    setOcrRegions(prev => {
      const updated = [...prev, newRegion];
      console.log('📊 [OCR DEBUG] Updated OCR regions array:', {
        previousCount: prev.length,
        newCount: updated.length,
        addedRegion: newRegion
      });
      return updated;
    });
    
    if (onOCRRegionAdd) {
      console.log('🔄 [OCR DEBUG] Calling onOCRRegionAdd callback');
      onOCRRegionAdd(newRegion);
    } else {
      console.log('ℹ️ [OCR DEBUG] No onOCRRegionAdd callback provided');
    }

    // Unfreeze desktop after submission
    unfreezeDesktop();
    
    console.log('✅ [OCR DEBUG] OCR area submitted successfully:', newRegion);
    debugOCRRegions('OCR_AREA_SUBMITTED', { submittedRegion: newRegion });
  }, [ocrSelectionCurrent, onOCRRegionAdd, unfreezeDesktop, validateOCRRegion, debugOCRRegions]);

  const cancelOCRAreaSelection = useCallback(() => {
    console.log('❌ [OCR DEBUG] Cancelling OCR area selection');
    debugOCRRegions('CANCEL_OCR_AREA_SELECTION', { 
      wasSelecting: isSelectingOCRArea,
      selectionStart: ocrSelectionStart,
      selectionCurrent: ocrSelectionCurrent
    });
    
    unfreezeDesktop();
    console.log('✅ [OCR DEBUG] OCR area selection cancelled successfully');
  }, [unfreezeDesktop, debugOCRRegions, isSelectingOCRArea, ocrSelectionStart, ocrSelectionCurrent]);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  // Helper function to check if point is inside region
  const isPointInRegion = useCallback((x: number, y: number, region: OCRRegion): boolean => {
    const isInside = x >= region.x && x <= region.x + region.width && 
                     y >= region.y && y <= region.y + region.height;
    
    console.log(`🎯 [OCR DEBUG] Point in region check:`, {
      point: { x, y },
      region: { 
        id: region.id, 
        bounds: { 
          left: region.x, 
          right: region.x + region.width, 
          top: region.y, 
          bottom: region.y + region.height 
        }
      },
      isInside
    });
    
    return isInside;
  }, []);

  // Helper function to check if point is on resize handle
  const getResizeHandle = useCallback((x: number, y: number, region: OCRRegion): string | null => {
    const handleSize = 10; // Match the size used in drawResizeHandles
    const tolerance = 10; // Increased tolerance for easier clicking
    
    // Match the exact coordinates used in drawResizeHandles
    const handles = [
      { id: 'nw', hx: region.x, hy: region.y },
      { id: 'ne', hx: region.x + region.width, hy: region.y },
      { id: 'sw', hx: region.x, hy: region.y + region.height },
      { id: 'se', hx: region.x + region.width, hy: region.y + region.height }
    ];
    
    console.log(`🔧 [OCR DEBUG] Checking resize handles for region ${region.id}:`, {
      point: { x, y },
      tolerance,
      handles: handles.map(h => ({
        id: h.id,
        position: { x: h.hx, y: h.hy },
        distance: Math.sqrt(Math.pow(x - h.hx, 2) + Math.pow(y - h.hy, 2))
      }))
    });
    
    for (const handle of handles) {
      const distance = Math.sqrt(Math.pow(x - handle.hx, 2) + Math.pow(y - handle.hy, 2));
      if (distance <= tolerance) {
        const handleId = `${region.id}-${handle.id}`;
        console.log(`✅ [OCR DEBUG] Found resize handle: ${handleId} at distance ${distance.toFixed(2)}`);
        return handleId;
      }
    }
    
    console.log(`❌ [OCR DEBUG] No resize handle found for region ${region.id}`);
    return null;
  }, []);

  // Helper function to find region at point
  const getRegionAtPoint = useCallback((x: number, y: number): OCRRegion | null => {
    console.log(`🔍 [OCR DEBUG] Finding region at point:`, { x, y });
    console.log(`📊 [OCR DEBUG] Checking ${ocrRegions.length} regions`);
    
    // Check from top to bottom (last drawn = on top)
    for (let i = ocrRegions.length - 1; i >= 0; i--) {
      const region = ocrRegions[i];
      console.log(`🔍 [OCR DEBUG] Checking region ${i + 1}/${ocrRegions.length}: ${region.id}`);
      
      if (isPointInRegion(x, y, region)) {
        console.log(`✅ [OCR DEBUG] Found region at point: ${region.id}`);
        return region;
      }
    }
    
    console.log(`❌ [OCR DEBUG] No region found at point: { x: ${x}, y: ${y} }`);
    return null;
  }, [ocrRegions, isPointInRegion]);

  const drawCurrentSelection = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!currentDraw) return;
    
    ctx.strokeStyle = isDrawingOCR ? '#3b82f6' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(currentDraw.x, currentDraw.y, currentDraw.width, currentDraw.height);
    ctx.setLineDash([]);
  }, [currentDraw, isDrawingOCR]);

  // ============================================================================
  // ENHANCED MOUSE INTERACTION
  // ============================================================================

  const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    console.log('🖱️ [OCR DEBUG] Mouse down event:', {
      coordinates: { x, y },
      canvasRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      modes: {
        isDrawingOCR,
        isAddingClick,
        isSelectingOCRArea,
        isFrozen
      }
    });

    debugOCRRegions('MOUSE_DOWN', { 
      coordinates: { x, y }, 
      modes: { isDrawingOCR, isAddingClick, isSelectingOCRArea, isFrozen }
    });

    if (isDrawingOCR) {
      console.log('✏️ [OCR DEBUG] Starting new OCR region drawing');
      // Start drawing new OCR region
      setDrawStart({ x, y });
      setCurrentDraw({ x, y, width: 0, height: 0 });
    } else if (isAddingClick) {
      console.log('👆 [OCR DEBUG] Adding click action');
      // Add click action
      const newAction: ClickAction = {
        id: `click-${Date.now()}`,
        x,
        y,
        label: `Click ${clickActions.length + 1}`,
        action: 'click'
      };
      
      console.log('🆕 [OCR DEBUG] Created new click action:', newAction);
      setClickActions(prev => [...prev, newAction]);
      
      if (onClickActionAdd) {
        onClickActionAdd(newAction);
      }
      
      setIsAddingClick(false);
    } else {
      // Handle region selection and dragging
      const regionAtPoint = getRegionAtPoint(x, y);
      
      if (regionAtPoint) {
        console.log(`🎯 [OCR DEBUG] Found region at mouse position: ${regionAtPoint.id}`);
        
        // Check if clicking on resize handle
        const handleId = getResizeHandle(x, y, regionAtPoint);
        
        if (handleId) {
          console.log(`🔧 [OCR DEBUG] Starting resize operation on handle: ${handleId}`);
          // Start resizing
          setSelectedRegion(regionAtPoint.id);
          setIsResizing(true);
          setResizeHandle(handleId.split('-')[1] as 'nw' | 'ne' | 'sw' | 'se');
          
          // Notify region selection
          if (onOCRRegionSelect) {
            console.log('🔄 [OCR DEBUG] Calling onOCRRegionSelect callback for resize');
            onOCRRegionSelect(regionAtPoint);
          }
        } else {
          console.log(`🚚 [OCR DEBUG] Starting drag operation on region: ${regionAtPoint.id}`);
          // Start dragging
          setSelectedRegion(regionAtPoint.id);
          setIsDragging(true);
          setDragOffset({
            x: x - regionAtPoint.x,
            y: y - regionAtPoint.y
          });
          
          console.log('📍 [OCR DEBUG] Drag offset calculated:', {
            x: x - regionAtPoint.x,
            y: y - regionAtPoint.y
          });
          
          // Notify region selection
          if (onOCRRegionSelect) {
            console.log('🔄 [OCR DEBUG] Calling onOCRRegionSelect callback for drag');
            onOCRRegionSelect(regionAtPoint);
          }
        }
      } else {
        console.log('🚫 [OCR DEBUG] No region found at mouse position - deselecting');
        // Clicked on empty space - deselect
        setSelectedRegion(null);
      }
    }
  }, [isDrawingOCR, isAddingClick, clickActions.length, onClickActionAdd, getRegionAtPoint, getResizeHandle, onOCRRegionSelect, debugOCRRegions, isSelectingOCRArea, isFrozen]);

  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Only log mouse move for significant operations to avoid spam
    const isSignificantOperation = isDrawingOCR || isDragging || isResizing || isSelectingOCRArea;

    if (isDrawingOCR && drawStart) {
      const newDraw = {
        x: Math.min(drawStart.x, x),
        y: Math.min(drawStart.y, y),
        width: Math.abs(x - drawStart.x),
        height: Math.abs(y - drawStart.y)
      };
      
      console.log('✏️ [OCR DEBUG] Drawing OCR region:', {
        startPoint: drawStart,
        currentPoint: { x, y },
        calculatedRegion: newDraw
      });
      
      // Drawing new OCR region
      setCurrentDraw(newDraw);
    } else if (isSelectingOCRArea) {
      console.log('🎯 [OCR DEBUG] Updating OCR area selection during mouse move');
      updateOCRAreaSelection(x, y);
    } else if (isDragging && selectedRegion) {
      const newX = x - dragOffset.x;
      const newY = y - dragOffset.y;
      
      console.log(`🚚 [OCR DEBUG] Dragging region ${selectedRegion}:`, {
        mousePosition: { x, y },
        dragOffset,
        newPosition: { x: Math.max(0, newX), y: Math.max(0, newY) }
      });
      
      // Dragging existing region
      setOcrRegions(prev => prev.map(region => 
        region.id === selectedRegion 
          ? { ...region, x: Math.max(0, newX), y: Math.max(0, newY) }
          : region
      ));
    } else if (isResizing && selectedRegion && resizeHandle) {
      // Resizing existing region
      const region = ocrRegions.find(r => r.id === selectedRegion);
      if (!region) {
        console.error(`❌ [OCR DEBUG] Cannot find region ${selectedRegion} for resizing`);
        return;
      }
      
      let newRegion = { ...region };
      
      console.log(`🔧 [OCR DEBUG] Resizing region ${selectedRegion} with handle ${resizeHandle}:`, {
        originalRegion: region,
        mousePosition: { x, y }
      });
      
      switch (resizeHandle) {
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
      
      console.log(`📐 [OCR DEBUG] Calculated new region dimensions:`, {
        newRegion,
        meetsMinimumSize: newRegion.width >= 10 && newRegion.height >= 10
      });
      
      // Ensure minimum size
      if (newRegion.width >= 10 && newRegion.height >= 10) {
        setOcrRegions(prev => prev.map(r => 
          r.id === selectedRegion ? newRegion : r
        ));
      } else {
        console.warn(`⚠️ [OCR DEBUG] Region ${selectedRegion} resize blocked - below minimum size`);
      }
    } else {
      // Update hover states (only log when hover state changes)
      const regionAtPoint = getRegionAtPoint(x, y);
      
      if (regionAtPoint && hoveredRegion !== regionAtPoint.id) {
        console.log(`🖱️ [OCR DEBUG] Hovering over region: ${regionAtPoint.id}`);
      } else if (!regionAtPoint && hoveredRegion) {
        console.log('🖱️ [OCR DEBUG] No longer hovering over any region');
      }
      
      if (regionAtPoint) {
        setHoveredRegion(regionAtPoint.id);
        
        // Check for handle hover
        const handleId = getResizeHandle(x, y, regionAtPoint);
        
        if (handleId && hoveredHandle !== handleId) {
          console.log(`🔧 [OCR DEBUG] Hovering over resize handle: ${handleId}`);
        } else if (!handleId && hoveredHandle) {
          console.log('🔧 [OCR DEBUG] No longer hovering over resize handle');
        }
        
        setHoveredHandle(handleId);
        
        // Update cursor
        if (handleId) {
          const handleType = handleId.split('-')[1];
          canvas.style.cursor = handleType === 'nw' || handleType === 'se' ? 'nw-resize' : 'ne-resize';
        } else {
          canvas.style.cursor = 'move';
        }
      } else {
        setHoveredRegion(null);
        setHoveredHandle(null);
        canvas.style.cursor = isDrawingOCR ? 'crosshair' : isAddingClick ? 'pointer' : 'default';
      }
    }
  }, [isDrawingOCR, drawStart, isDragging, isResizing, selectedRegion, resizeHandle, dragOffset, ocrRegions, getRegionAtPoint, getResizeHandle, isAddingClick, isSelectingOCRArea, updateOCRAreaSelection, hoveredRegion, hoveredHandle]);

  // ============================================================================
  // RIGHT-CLICK CONTEXT MENU FOR OCR REGIONS
  // ============================================================================

  const handleCanvasContextMenu = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault(); // Prevent default browser context menu
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    
    // Set context menu position (screen coordinates for positioning)
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      canvasX,
      canvasY
    });
  }, []);

  // Handle context menu actions
  const handleAddOCRRegion = useCallback((size: 'small' | 'medium' | 'large') => {
    if (!contextMenu) {
      console.error('❌ [OCR DEBUG] Cannot add OCR region - no context menu data');
      return;
    }
    
    console.log(`🎯 [OCR DEBUG] Adding OCR region via context menu:`, {
      size,
      contextMenuPosition: { x: contextMenu.canvasX, y: contextMenu.canvasY },
      currentRegionCount: ocrRegions.length
    });
    
    // Define region sizes
    const sizes = {
      small: { width: 80, height: 40 },
      medium: { width: 120, height: 60 },
      large: { width: 200, height: 100 }
    };
    
    const regionSize = sizes[size];
    
    console.log(`📏 [OCR DEBUG] Using region size:`, regionSize);
    
    // Create new OCR region centered at click position
    const newRegion: OCRRegion = {
      id: `ocr-${Date.now()}`,
      x: Math.max(0, contextMenu.canvasX - regionSize.width / 2),
      y: Math.max(0, contextMenu.canvasY - regionSize.height / 2),
      width: regionSize.width,
      height: regionSize.height,
      label: `OCR ${ocrRegions.length + 1}`
    };
    
    console.log('✅ [OCR DEBUG] Created new OCR region via context menu:', newRegion);
    debugOCRRegions([...ocrRegions, newRegion], 'After context menu region creation');
    
    // Add region to state
    setOcrRegions(prev => [...prev, newRegion]);
    setSelectedRegion(newRegion.id);
    
    console.log(`🎯 [OCR DEBUG] Selected new region: ${newRegion.id}`);
    
    // Trigger callback
    if (onOCRRegionAdd) {
      console.log('📢 [OCR DEBUG] Triggering onOCRRegionAdd callback for context menu region');
      onOCRRegionAdd(newRegion);
    }
    
    // Force canvas redraw to show the new region immediately
    setTimeout(() => {
      forceCanvasRedraw();
      console.log('🎨 [OCR DEBUG] Forced canvas redraw after adding OCR region');
    }, 10);
    
    // Close context menu
    setContextMenu(null);
    console.log('🧹 [OCR DEBUG] Context menu closed');
  }, [contextMenu, ocrRegions, onOCRRegionAdd, debugOCRRegions, forceCanvasRedraw]);

  // Close context menu when clicking elsewhere
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleCanvasMouseUp = useCallback(() => {
    console.log('🖱️ [OCR DEBUG] Mouse up event triggered:', {
      isDrawingOCR,
      isDragging,
      isResizing,
      currentDraw,
      selectedRegion,
      resizeHandle
    });

    if (isDrawingOCR && currentDraw && drawStart) {
      console.log('✏️ [OCR DEBUG] Finishing OCR region drawing:', {
        drawStart,
        currentDraw,
        meetsMinimumSize: currentDraw.width > 10 && currentDraw.height > 10
      });
      
      // Finish drawing new OCR region
      if (currentDraw.width > 10 && currentDraw.height > 10) {
        const newRegion: OCRRegion = {
          id: `ocr-${Date.now()}`,
          x: currentDraw.x,
          y: currentDraw.y,
          width: currentDraw.width,
          height: currentDraw.height,
          label: `OCR ${ocrRegions.length + 1}`
        };
        
        console.log('✅ [OCR DEBUG] Creating new OCR region:', newRegion);
        debugOCRRegions([...ocrRegions, newRegion], 'After creating new region');
        
        setOcrRegions(prev => [...prev, newRegion]);
        
        if (onOCRRegionAdd) {
          console.log('📢 [OCR DEBUG] Triggering onOCRRegionAdd callback');
          onOCRRegionAdd(newRegion);
        }
        
        // Force canvas redraw to show the new region immediately
        setTimeout(() => {
          forceCanvasRedraw();
          console.log('🎨 [OCR DEBUG] Forced canvas redraw after drawing OCR region');
        }, 10);
      } else {
        console.warn('⚠️ [OCR DEBUG] OCR region too small, not creating:', {
          width: currentDraw.width,
          height: currentDraw.height,
          minimumRequired: { width: 10, height: 10 }
        });
      }
      
      console.log('🧹 [OCR DEBUG] Cleaning up drawing state');
      setDrawStart(null);
      setCurrentDraw(null);
      setIsDrawingOCR(false);
    } else if (isDragging) {
      console.log(`🚚 [OCR DEBUG] Finishing drag operation for region: ${selectedRegion}`);
      
      // Finish dragging
      setIsDragging(false);
      setDragOffset({ x: 0, y: 0 });
      
      console.log('✅ [OCR DEBUG] Drag operation completed');
    } else if (isResizing) {
      console.log(`🔧 [OCR DEBUG] Finishing resize operation for region: ${selectedRegion} with handle: ${resizeHandle}`);
      
      // Finish resizing
      setIsResizing(false);
      setResizeHandle(null);
      
      console.log('✅ [OCR DEBUG] Resize operation completed');
    } else {
      console.log('ℹ️ [OCR DEBUG] Mouse up with no active operation');
    }
  }, [isDrawingOCR, currentDraw, drawStart, ocrRegions, onOCRRegionAdd, isDragging, isResizing, selectedRegion, resizeHandle, debugOCRRegions, forceCanvasRedraw]);

  // ============================================================================
  // KEYBOARD INTERACTION
  // ============================================================================

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    console.log(`⌨️ [OCR DEBUG] Key pressed: ${event.key}`, {
      selectedRegion,
      isDrawingOCR,
      isAddingClick,
      currentRegionCount: ocrRegions.length
    });

    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (selectedRegion) {
        console.log(`🗑️ [OCR DEBUG] Deleting region: ${selectedRegion}`);
        
        const regionToDelete = ocrRegions.find(r => r.id === selectedRegion);
        if (regionToDelete) {
          console.log('📋 [OCR DEBUG] Region being deleted:', regionToDelete);
        }
        
        setOcrRegions(prev => {
          const newRegions = prev.filter(region => region.id !== selectedRegion);
          debugOCRRegions(newRegions, 'After deleting region');
          return newRegions;
        });
        
        setSelectedRegion(null);
        console.log('✅ [OCR DEBUG] Region deleted and selection cleared');
        
        // Force canvas redraw to update the display
        setTimeout(() => {
          forceCanvasRedraw();
          console.log('🎨 [OCR DEBUG] Forced canvas redraw after deleting OCR region');
        }, 10);
        
        event.preventDefault();
      } else {
        console.log('⚠️ [OCR DEBUG] Delete key pressed but no region selected');
      }
    } else if (event.key === 'Escape') {
      console.log('🚪 [OCR DEBUG] Escape key pressed - clearing all active states');
      
      const stateChanges = {
        selectedRegion: selectedRegion ? 'cleared' : 'already null',
        isDrawingOCR: isDrawingOCR ? 'disabled' : 'already disabled',
        isAddingClick: isAddingClick ? 'disabled' : 'already disabled'
      };
      
      console.log('📊 [OCR DEBUG] State changes from Escape:', stateChanges);
      
      setSelectedRegion(null);
      setIsDrawingOCR(false);
      setIsAddingClick(false);
      event.preventDefault();
      
      console.log('✅ [OCR DEBUG] All states cleared via Escape');
    }
  }, [selectedRegion, isDrawingOCR, isAddingClick, ocrRegions, debugOCRRegions, forceCanvasRedraw]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Calculate canvas dimensions when width/height are percentages
  useEffect(() => {
    const updateCanvasDimensions = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        
        let actualWidth: number;
        let actualHeight: number;
        
        // Handle percentage or string values
        if (typeof width === 'string' && width.includes('%')) {
          actualWidth = containerRect.width;
        } else if (typeof width === 'string') {
          actualWidth = parseInt(width) || 400;
        } else {
          actualWidth = width;
        }
        
        if (typeof height === 'string' && height.includes('%')) {
          actualHeight = containerRect.height;
        } else if (typeof height === 'string') {
          actualHeight = parseInt(height) || 300;
        } else {
          actualHeight = height;
        }
        
        // Ensure minimum dimensions
        actualWidth = Math.max(actualWidth, 100);
        actualHeight = Math.max(actualHeight, 100);
        
        setCanvasDimensions({ width: actualWidth, height: actualHeight });
      } else {
        // Fallback to numeric values
        const actualWidth = typeof width === 'number' ? width : 400;
        const actualHeight = typeof height === 'number' ? height : 300;
        setCanvasDimensions({ width: actualWidth, height: actualHeight });
      }
    };
    

    
    // Initial calculation
    updateCanvasDimensions();
    
    // Update on resize
    const resizeObserver = new ResizeObserver(updateCanvasDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [width, height]);

  useEffect(() => {
    // Add keyboard event listeners
    document.addEventListener('keydown', handleKeyDown);
    
    // 🎯 NEW: Add custom event listeners for design mode activation
    const canvas = canvasRef.current;
    if (canvas) {
      const handleEnableOCRDrawing = () => {
        setIsDrawingOCR(true);
        setIsAddingClick(false);
        setSelectedRegion(null);
      };
      
      const handleEnableClickAction = () => {
        setIsAddingClick(true);
        setIsDrawingOCR(false);
        setSelectedRegion(null);
      };
      
      canvas.addEventListener('enableOCRDrawing', handleEnableOCRDrawing);
      canvas.addEventListener('enableClickAction', handleEnableClickAction);
      
      // Add data attribute for node identification
      canvas.setAttribute('data-node-id', nodeId);
      
      // 🎨 NEW: Draw OCR regions immediately when canvas is ready
      if (ocrRegions.length > 0) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          console.log('🎨 [OCR DEBUG] Canvas initialized - drawing existing OCR regions');
          requestAnimationFrame(() => {
            drawOCRRegions(ctx);
          });
        }
      }
      
      return () => {
        canvas.removeEventListener('enableOCRDrawing', handleEnableOCRDrawing);
        canvas.removeEventListener('enableClickAction', handleEnableClickAction);
      };
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      disconnectWebSocket();
    };
  }, [disconnectWebSocket, handleKeyDown, nodeId, ocrRegions, drawOCRRegions]);

  // ============================================================================
  // RENDER
  // ============================================================================

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Error';
      default: return 'Disconnected';
    }
  };

  return (
    <div className={`live-desktop-canvas ${embedded ? 'embedded' : 'standalone'}`}>
      {/* Header Controls */}
      {!embedded && (
        <div className="flex items-center justify-between p-3 bg-gray-100 border-b">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
            <span className="text-sm font-medium">{getStatusText()}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={isConnected ? disconnectWebSocket : connectWebSocket}
              className={`px-3 py-1 rounded text-sm font-medium ${
                isConnected 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isConnected ? (
                <><Pause className="w-4 h-4 inline mr-1" />Stop</>
              ) : (
                <><Play className="w-4 h-4 inline mr-1" />Start</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Canvas Container */}
      <div ref={containerRef} className="relative" style={{ width, height }} onClick={handleCloseContextMenu}>
        <canvas
          ref={canvasRef}
          width={canvasDimensions.width}
          height={canvasDimensions.height}
          className="w-full h-full cursor-crosshair"
          onContextMenu={handleCanvasContextMenu}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          style={{ 
            cursor: isSelectingOCRArea ? 'crosshair' : 'default',
            filter: isFrozen ? 'brightness(0.9) contrast(1.1)' : 'none'
          }}
        />
        
        {/* Right-Click Context Menu */}
        {contextMenu && (
          <div 
            className="fixed bg-white border border-gray-300 rounded-lg shadow-lg py-2 z-50"
            style={{ 
              left: contextMenu.x, 
              top: contextMenu.y,
              minWidth: '180px'
            }}
          >
            <button
              onClick={() => handleAddOCRRegion('medium')}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
            >
              <div className="w-6 h-3 bg-blue-300 border border-blue-400 rounded"></div>
              Add OCR Region
            </button>
            <div className="border-t border-gray-200 mt-1 pt-1">
              <div className="px-3 py-1 text-xs text-gray-400">
                Right-click to add • Drag to move • Resize corners
              </div>
            </div>
          </div>
        )}
        
        {/* Status Bar */}
        <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'connecting' ? 'bg-yellow-500' : 
              connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
            }`} />
            <span className="text-xs text-white bg-black bg-opacity-50 px-2 py-1 rounded">
              {connectionStatus.toUpperCase()}
              {isFrozen && ' - FROZEN'}
            </span>
          </div>
          
          {/* Freeze Controls */}
          {isFrozen && (
            <div className="flex items-center gap-2">
              <button
                onClick={cancelOCRAreaSelection}
                className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => submitOCRArea('OCR Region')}
                className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                disabled={!ocrSelectionCurrent || ocrSelectionCurrent.width < 10 || ocrSelectionCurrent.height < 10}
              >
                Submit
              </button>
            </div>
          )}
         
         {/* OCR Selection Instructions */}
         {isSelectingOCRArea && (
           <div className="absolute bottom-4 left-4 right-4 bg-blue-600 text-white p-3 rounded-lg shadow-lg">
             <div className="text-sm font-semibold mb-1">🎯 OCR Area Selection Mode</div>
             <div className="text-xs opacity-90">
               Drag to select area • Press Enter to submit • Press Escape to cancel
             </div>
           </div>
         )}
       </div>

        {/* No Connection Overlay */}
        {!isConnected && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <Square className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Desktop not connected</p>
              <button
                onClick={connectWebSocket}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Connect
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Tool Controls */}
      <div className="flex items-center gap-2 p-2 bg-gray-50 border-t">
        <button
          onClick={() => {
            setIsDrawingOCR(!isDrawingOCR);
            setIsAddingClick(false);
            setSelectedRegion(null);
          }}
          className={`px-3 py-1 rounded text-sm font-medium ${
            isDrawingOCR 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
          title="Draw new OCR region (drag to create)"
        >
          <Eye className="w-4 h-4 inline mr-1" />
          OCR Region
        </button>
        
        <button
          onClick={() => {
            setIsAddingClick(!isAddingClick);
            setIsDrawingOCR(false);
            setSelectedRegion(null);
          }}
          className={`px-3 py-1 rounded text-sm font-medium ${
            isAddingClick 
              ? 'bg-red-500 text-white' 
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
          title="Add click action (click to place)"
        >
          <MousePointer className="w-4 h-4 inline mr-1" />
          Click Action
        </button>
        
        {/* Clear All Button */}
        <button
          onClick={() => {
            if (window.confirm('Clear all OCR regions and click actions?')) {
              setOcrRegions([]);
              setClickActions([]);
              setSelectedRegion(null);
            }
          }}
          className="px-2 py-1 rounded text-xs bg-red-100 hover:bg-red-200 text-red-700"
          title="Clear all regions and actions"
          disabled={ocrRegions.length === 0 && clickActions.length === 0}
        >
          Clear All
        </button>
        
        {/* Delete Selected Button */}
        {selectedRegion && (
          <button
            onClick={() => {
              setOcrRegions(prev => prev.filter(region => region.id !== selectedRegion));
              setSelectedRegion(null);
            }}
            className="px-2 py-1 rounded text-xs bg-red-500 hover:bg-red-600 text-white"
            title="Delete selected region (Del key)"
          >
            Delete
          </button>
        )}
        
        <div className="flex-1" />
        
        {/* Status Info */}
        <div className="text-xs text-gray-500 space-x-2">
          <span>OCR: {ocrRegions.length}</span>
          <span>|</span>
          <span>Clicks: {clickActions.length}</span>
          {selectedRegion && (
            <>
              <span>|</span>
              <span className="text-blue-600 font-medium">Selected: {ocrRegions.find(r => r.id === selectedRegion)?.label}</span>
            </>
          )}
        </div>
        
        {/* Help Text */}
        <div className="text-xs text-gray-400 ml-2">
          {isDrawingOCR ? 'Drag to create OCR region' : 
           isAddingClick ? 'Click to add action point' :
           selectedRegion ? 'Drag to move • Drag corners to resize • Del to delete' :
           'Click region to select • Draw new regions with OCR button'}
        </div>
      </div>
    </div>
  );
};

export default LiveDesktopCanvas;