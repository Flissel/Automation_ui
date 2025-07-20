/**
 * TRAE Live Desktop Canvas - Refactored Main Component
 * 
 * Modular, maintainable implementation with isolated concerns
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import React, { useEffect, useCallback, useMemo, memo } from 'react';
import { LiveDesktopCanvasProps, MouseEventData } from './types';
import { useStateManager } from './stateManager';
import { useWebSocketManager } from './webSocketManager';
import { useBackgroundRenderer, useOverlayRenderer } from './canvasRenderer';
import { useMouseHandlers } from './mouseHandlers';
import { errorHandlingService } from '../../services/ErrorHandlingService';
import { loadingStateService } from '../../services/LoadingStateService';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const LiveDesktopCanvasComponent: React.FC<LiveDesktopCanvasProps> = ({
  wsUrl,
  onOCRRegionSelect,
  onClickActionAdd,
  onConnectionChange,
  className = '',
  style = {},
  enableDebugLogs = true,
  isRecording = false
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const {
    // States
    ocrRegions,
    clickActions,
    interactionState,
    screenData,
    config,
    isConnected,
    connectionError,
    currentFrame,
    freezeFrame,
    isFrozen,
    showContextMenu,
    contextMenuPosition,
    isSelectingOCRArea,
    showOCRInstructions,
    
    // Setters
    setInteractionState,
    setCurrentFrame,
    setScreenData,
    setOcrRegions,
    setClickActions,
    setConnectionState,
    showContextMenuAt,
    hideContextMenu,
    setIsSelectingOCRArea,
    setShowOCRInstructions,
    
    // Helpers
    toggleFreeze,
    clearOCRRegions,
    clearClickActions,
    updateConfig
  } = useStateManager();

  // ============================================================================
  // INITIALIZATION - ONE TIME ONLY
  // ============================================================================
  
  useEffect(() => {
    console.log('🚀 [MAIN] LiveDesktopCanvas initialized (mount only)');
  }, []); // Empty dependencies - runs only once on mount

  // ============================================================================
  // WEBSOCKET MANAGEMENT
  // ============================================================================
  
  const webSocketManager = useWebSocketManager({
    url: wsUrl,
    onFrameReceived: setCurrentFrame,
    onScreenDataReceived: setScreenData,
    onConnectionChange: (connected) => {
      setConnectionState(connected);
      onConnectionChange?.(connected);
      
      if (!connected && connectionError) {
        errorHandlingService.handleError(
          new Error(`WebSocket connection lost: ${connectionError}`),
          {
            operation: 'WebSocket Connection',
            component: 'LiveDesktopCanvas',
            wsUrl,
            retryFunction: () => {
              console.log('🔄 [CANVAS] Attempting to reconnect...');
              webSocketManager.connect();
            }
          }
        );
      }
    },
    frameThrottleMs: config.frameThrottleMs
  });

  // ============================================================================
  // CANVAS RENDERING
  // ============================================================================
  
  const { canvasRef: backgroundCanvasRef } = useBackgroundRenderer({
    screenData,
    currentFrame,
    isFrozen,
    freezeFrame
  });
  
  const { overlayCanvasRef, forceRedraw } = useOverlayRenderer({
    ocrRegions,
    clickActions,
    interactionState,
    screenData,
    backgroundCanvasRef
  });

  // ============================================================================
  // MOUSE INTERACTION
  // ============================================================================
  
  const updateOCRAreaSelection = useCallback((x: number, y: number) => {
    // This would be implemented based on your OCR area selection logic
    console.log('🎯 [MAIN] OCR area selection update:', { x, y });
  }, []);
  
  const { handleMouseDown, handleMouseMove, handleMouseUp, getCursorStyle } = useMouseHandlers({
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
    isRecording
  });

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    try {
      console.log('🎯 [CANVAS] Canvas mouse down event captured!', {
        clientX: event.clientX,
        clientY: event.clientY,
        target: event.target,
        currentTarget: event.currentTarget
      });
      event.preventDefault();
      event.stopPropagation();
      
      // Check connection state before processing
      if (!isConnected) {
        errorHandlingService.handleError(
          new Error('Cannot interact with canvas: Not connected to desktop stream'),
          {
            operation: 'Canvas Mouse Down',
            component: 'LiveDesktopCanvas',
            connectionState: isConnected
          }
        );
        return;
      }
      
      const canvas = event.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      console.log('📐 [CANVAS] Calculated coordinates:', {
        x, y,
        canvasRect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height
        },
        canvasSize: {
          width: canvas.width,
          height: canvas.height,
          styleWidth: canvas.style.width,
          styleHeight: canvas.style.height
        }
      });
      
      const eventData: MouseEventData = {
        x,
        y,
        canvasType: 'overlay',
        event: event
      };
      
      handleMouseDown(eventData);
    } catch (error) {
      errorHandlingService.handleError(
        error instanceof Error ? error : new Error('Mouse down event failed'),
        {
          operation: 'Canvas Mouse Down Event',
          component: 'LiveDesktopCanvas',
          coordinates: {
            clientX: event.clientX,
            clientY: event.clientY
          }
        }
      );
    }
  }, [handleMouseDown, isConnected]);
  
  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    try {
      // Only process mouse move if connected (avoid spamming errors)
      if (!isConnected) return;
      
      const canvas = event.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      const eventData: MouseEventData = {
        x,
        y,
        canvasType: 'overlay',
        event: event
      };
      
      handleMouseMove(eventData);
    } catch (error) {
      // Only log errors for mouse move, don't show user notifications (too frequent)
      console.error('🚨 [CANVAS] Mouse move event error:', error);
    }
  }, [handleMouseMove, isConnected]);
  
  const handleCanvasMouseUp = useCallback(() => {
    try {
      handleMouseUp();
    } catch (error) {
      errorHandlingService.handleError(
        error instanceof Error ? error : new Error('Mouse up event failed'),
        {
          operation: 'Canvas Mouse Up',
          component: 'LiveDesktopCanvas'
        }
      );
    }
  }, [handleMouseUp]);
  
  const handleContextMenu = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    try {
      event.preventDefault();
      
      if (!isConnected) {
        errorHandlingService.handleError(
          new Error('Cannot show context menu: Not connected to desktop stream'),
          {
            operation: 'Context Menu',
            component: 'LiveDesktopCanvas',
            connectionState: isConnected
          }
        );
        return;
      }
      
      const canvas = event.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      showContextMenuAt(x, y);
    } catch (error) {
      errorHandlingService.handleError(
        error instanceof Error ? error : new Error('Context menu failed'),
        {
          operation: 'Context Menu Event',
          component: 'LiveDesktopCanvas'
        }
      );
    }
  }, [showContextMenuAt, isConnected]);

  // ============================================================================
  // TOOLBAR HANDLERS
  // ============================================================================
  
  const handleEnableOCRDrawing = useCallback(async () => {
    try {
      await loadingStateService.withLoading(
        'toggle-ocr-mode',
        'Switching OCR mode...',
        async () => {
          console.log('✏️ [MAIN] Enabling OCR drawing mode');
          setInteractionState({
            isDrawingOCR: !interactionState.isDrawingOCR,
            isAddingClick: false
          });
        }
      );
    } catch (error) {
      errorHandlingService.handleError(
        error instanceof Error ? error : new Error('Failed to toggle OCR drawing mode'),
        {
          operation: 'Toggle OCR Drawing Mode',
          component: 'LiveDesktopCanvas',
          currentMode: interactionState.isDrawingOCR ? 'enabled' : 'disabled'
        }
      );
    }
  }, [interactionState.isDrawingOCR, setInteractionState]);
  
  const handleEnableClickAction = useCallback(async () => {
    try {
      await loadingStateService.withLoading(
        'toggle-click-mode',
        'Switching click mode...',
        async () => {
          console.log('👆 [MAIN] Enabling click action mode');
          setInteractionState({
            isAddingClick: !interactionState.isAddingClick,
            isDrawingOCR: false
          });
        }
      );
    } catch (error) {
      errorHandlingService.handleError(
        error instanceof Error ? error : new Error('Failed to toggle click action mode'),
        {
          operation: 'Toggle Click Action Mode',
          component: 'LiveDesktopCanvas',
          currentMode: interactionState.isAddingClick ? 'enabled' : 'disabled'
        }
      );
    }
  }, [interactionState.isAddingClick, setInteractionState]);
  
  const handleClearAll = useCallback(async () => {
    try {
      await loadingStateService.withLoading(
        'clear-all-canvas',
        'Clearing all regions and actions...',
        async () => {
          console.log('🧹 [MAIN] Clearing all regions and actions');
          clearOCRRegions();
          clearClickActions();
        }
      );
    } catch (error) {
      errorHandlingService.handleError(
        error instanceof Error ? error : new Error('Failed to clear canvas'),
        {
          operation: 'Clear All Canvas Elements',
          component: 'LiveDesktopCanvas',
          regionsCount: ocrRegions.length,
          actionsCount: clickActions.length,
          retryFunction: () => {
            // Force clear if regular clear fails
            try {
              clearOCRRegions();
              clearClickActions();
            } catch (recoveryError) {
              console.error('Recovery clear also failed:', recoveryError);
            }
          }
        }
      );
    }
  }, [clearOCRRegions, clearClickActions, ocrRegions.length, clickActions.length]);

  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  // Update config when debug logs setting changes
  useEffect(() => {
    updateConfig({ enableDebugLogs });
  }, [enableDebugLogs, updateConfig]);
  
  // Force overlay redraw when interaction modes change
  useEffect(() => {
    forceRedraw();
  }, [interactionState.isDrawingOCR, interactionState.isAddingClick, forceRedraw]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const cursorStyle = useMemo(() => getCursorStyle(), [getCursorStyle]);
  
  const canvasStyle = useMemo(() => ({
    ...style,
    cursor: cursorStyle,
    display: 'block'
    // Removed maxWidth/maxHeight to prevent CSS scaling that breaks mouse coordinates
  }), [style, cursorStyle]);

  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div className={`live-desktop-canvas ${className}`} style={{ position: 'relative' }}>
      {/* Background Canvas - Live Stream */}
      <canvas
        ref={backgroundCanvasRef}
        style={{
          ...canvasStyle,
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1
        }}
      />
      
      {/* Overlay Canvas - OCR Regions & Interactions */}
      <canvas
        ref={overlayCanvasRef}
        style={{
          ...canvasStyle,
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 2,
          pointerEvents: 'auto',
          touchAction: 'none'
        }}
        tabIndex={0}
        onContextMenu={handleContextMenu}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onClick={(e) => console.log('🖱️ [CANVAS] Simple click captured!', { x: e.clientX, y: e.clientY })}
      />
      
      {/* Context Menu */}
      {showContextMenu && (
        <div
          style={{
            position: 'absolute',
            top: contextMenuPosition.y,
            left: contextMenuPosition.x,
            zIndex: 1000,
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
          onClick={hideContextMenu}
        >
          <div>Context Menu</div>
        </div>
      )}
      
      {/* Status Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '8px',
          fontSize: '12px',
          zIndex: 3
        }}
      >
        <div>
          Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'} | 
          OCR Regions: {ocrRegions.length} | 
          Click Actions: {clickActions.length} |
          {isFrozen && ' 🧊 FROZEN'}
        </div>
      </div>
      
      {/* Freeze Controls */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 3
        }}
      >
        <button
          onClick={toggleFreeze}
          style={{
            padding: '8px 16px',
            background: isFrozen ? '#ff6b6b' : '#4ecdc4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '8px'
          }}
        >
          {isFrozen ? '▶️ Unfreeze' : '⏸️ Freeze'}
        </button>
      </div>
      
      {/* OCR Selection Instructions */}
      {showOCRInstructions && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.9)',
            color: 'white',
            padding: '20px',
            borderRadius: '8px',
            textAlign: 'center',
            zIndex: 4
          }}
        >
          <h3>OCR Region Selection</h3>
          <p>Click and drag to select an area for OCR processing</p>
          <button
            onClick={() => setShowOCRInstructions(false)}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              background: '#4ecdc4',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Got it!
          </button>
        </div>
      )}
      
      {/* No Connection Overlay */}
      {!isConnected && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            zIndex: 5
          }}
        >
          <h2>🔌 No Connection</h2>
          <p>Attempting to connect to desktop stream...</p>
          {connectionError && (
            <p style={{ color: '#ff6b6b', marginTop: '10px' }}>
              Error: {connectionError}
            </p>
          )}
        </div>
      )}
      
      {/* Enhanced Tool Controls */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 3,
          display: 'flex',
          gap: '8px'
        }}
      >
        <button
          onClick={handleEnableOCRDrawing}
          style={{
            padding: '8px 16px',
            background: interactionState.isDrawingOCR ? '#ff6b6b' : '#4ecdc4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {interactionState.isDrawingOCR ? '❌ Stop OCR' : '✏️ Draw OCR'}
        </button>
        
        <button
          onClick={handleEnableClickAction}
          style={{
            padding: '8px 16px',
            background: interactionState.isAddingClick ? '#ff6b6b' : '#4ecdc4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {interactionState.isAddingClick ? '❌ Stop Click' : '👆 Add Click'}
        </button>
        
        <button
          onClick={handleClearAll}
          style={{
            padding: '8px 16px',
            background: '#ff6b6b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🧹 Clear All
        </button>
      </div>
    </div>
  );
};

// Custom comparison function extracted outside component
const arePropsEqual = (prevProps: LiveDesktopCanvasProps, nextProps: LiveDesktopCanvasProps): boolean => {
  console.log('🔍 [MEMO] Comparing props for React.memo...');
  
  // Check each prop individually
  const wsUrlEqual = prevProps.wsUrl === nextProps.wsUrl;
  const onOCRRegionSelectEqual = prevProps.onOCRRegionSelect === nextProps.onOCRRegionSelect;
  const onClickActionAddEqual = prevProps.onClickActionAdd === nextProps.onClickActionAdd;
  const onConnectionChangeEqual = prevProps.onConnectionChange === nextProps.onConnectionChange;
  const enableDebugLogsEqual = prevProps.enableDebugLogs === nextProps.enableDebugLogs;
  
  console.log(`🔍 [MEMO] wsUrl: ${wsUrlEqual ? '✅ SAME' : '❌ CHANGED'}`, { prev: prevProps.wsUrl, next: nextProps.wsUrl });
  console.log(`🔍 [MEMO] onOCRRegionSelect: ${onOCRRegionSelectEqual ? '✅ SAME' : '❌ CHANGED'}`);
  console.log(`🔍 [MEMO] onClickActionAdd: ${onClickActionAddEqual ? '✅ SAME' : '❌ CHANGED'}`);
  console.log(`🔍 [MEMO] onConnectionChange: ${onConnectionChangeEqual ? '✅ SAME' : '❌ CHANGED'}`);
  console.log(`🔍 [MEMO] enableDebugLogs: ${enableDebugLogsEqual ? '✅ SAME' : '❌ CHANGED'}`, { prev: prevProps.enableDebugLogs, next: nextProps.enableDebugLogs });
  
  const allPropsEqual = wsUrlEqual && onOCRRegionSelectEqual && onClickActionAddEqual && onConnectionChangeEqual && enableDebugLogsEqual;
  
  console.log(`🔍 [MEMO] Result: ${allPropsEqual ? '✅ SKIP re-render' : '❌ FORCE re-render'}`);
  
  return allPropsEqual;
};

// Create a stable singleton wrapper to prevent re-initialization
class LiveDesktopCanvasSingleton {
  private static instance: React.ComponentType<LiveDesktopCanvasProps> | null = null;
  
  static getInstance(): React.ComponentType<LiveDesktopCanvasProps> {
    if (!this.instance) {
      console.log('🏭 [SINGLETON] Creating stable LiveDesktopCanvas instance');
      // Create the memoized component once and cache it permanently
      this.instance = memo(LiveDesktopCanvasComponent, arePropsEqual);
    } else {
      console.log('♻️ [SINGLETON] Reusing cached LiveDesktopCanvas instance');
    }
    return this.instance;
  }
}

// Export the singleton instance
const LiveDesktopCanvas = LiveDesktopCanvasSingleton.getInstance();

export default LiveDesktopCanvas;