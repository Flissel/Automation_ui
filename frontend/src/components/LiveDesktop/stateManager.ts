/**
 * TRAE Live Desktop - State Manager
 * 
 * Centralized state management for LiveDesktopCanvas
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import { useState, useCallback, useRef } from 'react';
import { 
  OCRRegion, 
  ClickAction, 
  ScreenData, 
  InteractionState, 
  LiveDesktopConfig,
  StateManagerHook 
} from './types';

// ============================================================================
// DEFAULT STATES
// ============================================================================

const DEFAULT_INTERACTION_STATE: InteractionState = {
  selectedRegion: null,
  hoveredRegion: null,
  hoveredHandle: null,
  isDragging: false,
  isResizing: false,
  isDrawingOCR: false,
  isAddingClick: false,
  drawStart: null,
  currentDraw: null,
  dragOffset: { x: 0, y: 0 },
  resizeHandle: null
};

const DEFAULT_CONFIG: LiveDesktopConfig = {
  frameThrottleMs: 16, // ~60fps
  enableDebugLogs: true,
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelay: 2000
};

// ============================================================================
// STATE MANAGER HOOK
// ============================================================================

export const useStateManager = (): StateManagerHook => {
  // ============================================================================
  // CORE STATES
  // ============================================================================
  
  const [ocrRegions, setOcrRegions] = useState<OCRRegion[]>([]);
  const [clickActions, setClickActions] = useState<ClickAction[]>([]);
  const [interactionState, setInteractionStateInternal] = useState<InteractionState>(DEFAULT_INTERACTION_STATE);
  const [screenData, setScreenData] = useState<ScreenData | null>(null);
  const [config, setConfig] = useState<LiveDesktopConfig>(DEFAULT_CONFIG);
  
  // ============================================================================
  // CONNECTION STATES
  // ============================================================================
  
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  
  // ============================================================================
  // FRAME STATES
  // ============================================================================
  
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);
  const [freezeFrame, setFreezeFrame] = useState<string | null>(null);
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  
  // ============================================================================
  // UI STATES
  // ============================================================================
  
  const [showContextMenu, setShowContextMenu] = useState<boolean>(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSelectingOCRArea, setIsSelectingOCRArea] = useState<boolean>(false);
  const [showOCRInstructions, setShowOCRInstructions] = useState<boolean>(false);
  
  // ============================================================================
  // REFS FOR PERFORMANCE
  // ============================================================================
  
  const stateRef = useRef({
    ocrRegions,
    clickActions,
    interactionState,
    screenData,
    isConnected,
    currentFrame,
    isFrozen
  });
  
  // Update ref when states change
  stateRef.current = {
    ocrRegions,
    clickActions,
    interactionState,
    screenData,
    isConnected,
    currentFrame,
    isFrozen
  };

  // ============================================================================
  // INTERACTION STATE HELPERS
  // ============================================================================
  
  const setInteractionState = useCallback((updates: Partial<InteractionState>) => {
    setInteractionStateInternal(prev => {
      const newState = { ...prev, ...updates };
      
      if (config.enableDebugLogs) {
        console.log('🔄 [STATE] Interaction state updated:', {
          changes: updates,
          newState
        });
      }
      
      return newState;
    });
  }, [config.enableDebugLogs]);
  
  const resetInteractionState = useCallback(() => {
    console.log('🔄 [STATE] Resetting interaction state');
    setInteractionStateInternal(DEFAULT_INTERACTION_STATE);
  }, []);

  // ============================================================================
  // OCR REGION HELPERS
  // ============================================================================
  
  const addOCRRegion = useCallback((region: OCRRegion) => {
    console.log('➕ [STATE] Adding OCR region:', region.id);
    setOcrRegions(prev => [...prev, region]);
  }, []);
  
  const updateOCRRegion = useCallback((regionId: string, updates: Partial<OCRRegion>) => {
    console.log('📝 [STATE] Updating OCR region:', regionId, updates);
    setOcrRegions(prev => prev.map(region => 
      region.id === regionId ? { ...region, ...updates } : region
    ));
  }, []);
  
  const removeOCRRegion = useCallback((regionId: string) => {
    console.log('🗑️ [STATE] Removing OCR region:', regionId);
    setOcrRegions(prev => prev.filter(region => region.id !== regionId));
    
    // Clear selection if removing selected region
    if (interactionState.selectedRegion === regionId) {
      setInteractionState({ selectedRegion: null });
    }
  }, [interactionState.selectedRegion, setInteractionState]);
  
  const clearOCRRegions = useCallback(() => {
    console.log('🧹 [STATE] Clearing all OCR regions');
    setOcrRegions([]);
    resetInteractionState();
  }, [resetInteractionState]);

  // ============================================================================
  // CLICK ACTION HELPERS
  // ============================================================================
  
  const addClickAction = useCallback((action: ClickAction) => {
    console.log('👆 [STATE] Adding click action:', action.id);
    setClickActions(prev => [...prev, action]);
  }, []);
  
  const removeClickAction = useCallback((actionId: string) => {
    console.log('🗑️ [STATE] Removing click action:', actionId);
    setClickActions(prev => prev.filter(action => action.id !== actionId));
  }, []);
  
  const clearClickActions = useCallback(() => {
    console.log('🧹 [STATE] Clearing all click actions');
    setClickActions([]);
  }, []);

  // ============================================================================
  // FREEZE HELPERS
  // ============================================================================
  
  const toggleFreeze = useCallback(() => {
    const newFrozenState = !isFrozen;
    console.log(`${newFrozenState ? '🧊' : '▶️'} [STATE] ${newFrozenState ? 'Freezing' : 'Unfreezing'} stream`);
    
    if (newFrozenState && currentFrame) {
      setFreezeFrame(currentFrame);
    }
    
    setIsFrozen(newFrozenState);
  }, [isFrozen, currentFrame]);
  
  const unfreeze = useCallback(() => {
    console.log('▶️ [STATE] Unfreezing stream');
    setIsFrozen(false);
    setFreezeFrame(null);
  }, []);

  // ============================================================================
  // CONNECTION HELPERS
  // ============================================================================
  
  const setConnectionState = useCallback((connected: boolean, error?: string) => {
    console.log(`🔗 [STATE] Connection ${connected ? 'established' : 'lost'}`);
    setIsConnected(connected);
    setConnectionError(error || null);
    
    if (connected) {
      setReconnectAttempts(0);
    }
  }, []);

  // ============================================================================
  // CONTEXT MENU HELPERS
  // ============================================================================
  
  const showContextMenuAt = useCallback((x: number, y: number) => {
    setContextMenuPosition({ x, y });
    setShowContextMenu(true);
  }, []);
  
  const hideContextMenu = useCallback(() => {
    setShowContextMenu(false);
  }, []);

  // ============================================================================
  // CONFIG HELPERS
  // ============================================================================
  
  const updateConfig = useCallback((updates: Partial<LiveDesktopConfig>) => {
    console.log('⚙️ [STATE] Updating config:', updates);
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================
  
  const resetAllStates = useCallback(() => {
    console.log('🔄 [STATE] Resetting all states');
    setOcrRegions([]);
    setClickActions([]);
    resetInteractionState();
    setCurrentFrame(null);
    setFreezeFrame(null);
    setIsFrozen(false);
    hideContextMenu();
    setIsSelectingOCRArea(false);
    setShowOCRInstructions(false);
  }, [resetInteractionState, hideContextMenu]);

  // ============================================================================
  // STATE GETTERS
  // ============================================================================
  
  const getSelectedRegion = useCallback((): OCRRegion | null => {
    return ocrRegions.find(region => region.id === interactionState.selectedRegion) || null;
  }, [ocrRegions, interactionState.selectedRegion]);
  
  const getRegionById = useCallback((regionId: string): OCRRegion | null => {
    return ocrRegions.find(region => region.id === regionId) || null;
  }, [ocrRegions]);
  
  const getClickActionById = useCallback((actionId: string): ClickAction | null => {
    return clickActions.find(action => action.id === actionId) || null;
  }, [clickActions]);

  // ============================================================================
  // RETURN STATE MANAGER
  // ============================================================================
  
  return {
    // States
    ocrRegions,
    clickActions,
    interactionState,
    screenData,
    config,
    isConnected,
    connectionError,
    reconnectAttempts,
    currentFrame,
    freezeFrame,
    isFrozen,
    showContextMenu,
    contextMenuPosition,
    isSelectingOCRArea,
    showOCRInstructions,
    
    // Setters
    setOcrRegions,
    setClickActions,
    setInteractionState,
    setScreenData,
    setConfig,
    setIsConnected,
    setConnectionError,
    setReconnectAttempts,
    setCurrentFrame,
    setFreezeFrame,
    setIsFrozen,
    setShowContextMenu,
    setContextMenuPosition,
    setIsSelectingOCRArea,
    setShowOCRInstructions,
    
    // Helpers
    resetInteractionState,
    addOCRRegion,
    updateOCRRegion,
    removeOCRRegion,
    clearOCRRegions,
    addClickAction,
    removeClickAction,
    clearClickActions,
    toggleFreeze,
    unfreeze,
    setConnectionState,
    showContextMenuAt,
    hideContextMenu,
    updateConfig,
    resetAllStates,
    
    // Getters
    getSelectedRegion,
    getRegionById,
    getClickActionById,
    
    // Refs
    stateRef
  };
};