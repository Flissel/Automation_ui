/**
 * TRAE Live Desktop - Shared Types and Interfaces
 * 
 * Centralized type definitions for the Live Desktop Canvas system
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

// ============================================================================
// CORE INTERFACES
// ============================================================================

export interface OCRRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  text?: string;
  confidence?: number;
}

export interface ClickAction {
  id: string;
  x: number;
  y: number;
  label: string;
  action: 'click' | 'double_click' | 'right_click';
}

export interface ScreenData {
  width: number;
  height: number;
  scale: number;
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface LiveDesktopCanvasProps {
  wsUrl: string;
  nodeId?: string;
  embedded?: boolean;
  width?: number | string;
  height?: number | string;
  config?: LiveDesktopConfig;
  onOCRRegionAdd?: (region: OCRRegion) => void;
  onOCRRegionSelect?: (region: OCRRegion) => void;
  onClickActionAdd?: (action: ClickAction) => void;
  onScreenChange?: (data: ScreenData) => void;
  onWebhookTrigger?: (payload: any) => void;
  onConnectionChange?: (connected: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
  enableDebugLogs?: boolean;
  isRecording?: boolean;
}

export interface LiveDesktopConfig {
  frameThrottleMs: number;
  enableDebugLogs: boolean;
  autoReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectDelay: number;
}

// ============================================================================
// STATE INTERFACES
// ============================================================================

export interface CanvasState {
  canvasDimensions: { width: number; height: number };
  isConnected: boolean;
  isStreaming: boolean;
  currentFrame: string | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
}

export interface InteractionState {
  isDrawingOCR: boolean;
  isAddingClick: boolean;
  selectedRegion: string | null;
  isDragging: boolean;
  isResizing: boolean;
  dragOffset: { x: number; y: number };
  resizeHandle: 'nw' | 'ne' | 'sw' | 'se' | null;
  hoveredRegion: string | null;
  hoveredHandle: string | null;
  drawStart: { x: number; y: number } | null;
  currentDraw: { x: number; y: number; width: number; height: number } | null;
}

export interface FreezeState {
  isFrozen: boolean;
  frozenFrame: string | null;
  isSelectingOCRArea: boolean;
  ocrSelectionStart: { x: number; y: number } | null;
  ocrSelectionCurrent: { x: number; y: number; width: number; height: number } | null;
}

export interface ContextMenuState {
  contextMenu: { x: number; y: number; canvasX: number; canvasY: number } | null;
}

// ============================================================================
// EVENT INTERFACES
// ============================================================================

export interface MouseEventData {
  x: number;
  y: number;
  canvasType: 'background' | 'overlay';
  event: React.MouseEvent<HTMLCanvasElement>;
}

export interface ResizeHandleInfo {
  regionId: string;
  handle: 'nw' | 'ne' | 'sw' | 'se';
}

// ============================================================================
// DRAWING INTERFACES
// ============================================================================

export interface DrawingContext {
  backgroundCtx: CanvasRenderingContext2D | null;
  overlayCtx: CanvasRenderingContext2D | null;
  canvasDimensions: { width: number; height: number };
}

export interface DrawingOptions {
  showHandles: boolean;
  selectedRegion: string | null;
  hoveredRegion: string | null;
  hoveredHandle: string | null;
}

export interface CanvasRenderState {
  lastOCRRegions: OCRRegion[];
  lastClickActions: ClickAction[];
  lastInteractionState: InteractionState;
  needsRedraw: boolean;
}

// ============================================================================
// WEBSOCKET INTERFACES
// ============================================================================

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: string;
}

export interface ConnectionConfig {
  url: string;
  reconnectAttempts: number;
  reconnectDelay: number;
  frameThrottleMs: number;
}

export interface WebSocketHandlers {
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (data: any) => void;
}

export type WebSocketState = 'disconnected' | 'connecting' | 'connected' | 'disconnecting';

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type CanvasType = 'background' | 'overlay';

// ============================================================================
// DEBUG INTERFACES
// ============================================================================

export interface DebugInfo {
  action: string;
  timestamp: string;
  data?: any;
  regions: OCRRegion[];
  selectedRegion: string | null;
  hoveredRegion: string | null;
  isFrozen: boolean;
  isSelectingOCRArea: boolean;
}

// ============================================================================
// STATE MANAGER HOOK INTERFACE
// ============================================================================

export interface StateManagerHook {
  // States
  ocrRegions: OCRRegion[];
  clickActions: ClickAction[];
  interactionState: InteractionState;
  screenData: ScreenData | null;
  config: LiveDesktopConfig;
  isConnected: boolean;
  connectionError: string | null;
  reconnectAttempts: number;
  currentFrame: string | null;
  freezeFrame: string | null;
  isFrozen: boolean;
  showContextMenu: boolean;
  contextMenuPosition: { x: number; y: number };
  isSelectingOCRArea: boolean;
  showOCRInstructions: boolean;
  
  // Setters
  setOcrRegions: React.Dispatch<React.SetStateAction<OCRRegion[]>>;
  setClickActions: React.Dispatch<React.SetStateAction<ClickAction[]>>;
  setInteractionState: (updates: Partial<InteractionState>) => void;
  setScreenData: React.Dispatch<React.SetStateAction<ScreenData | null>>;
  setConfig: React.Dispatch<React.SetStateAction<LiveDesktopConfig>>;
  setIsConnected: React.Dispatch<React.SetStateAction<boolean>>;
  setConnectionError: React.Dispatch<React.SetStateAction<string | null>>;
  setReconnectAttempts: React.Dispatch<React.SetStateAction<number>>;
  setCurrentFrame: React.Dispatch<React.SetStateAction<string | null>>;
  setFreezeFrame: React.Dispatch<React.SetStateAction<string | null>>;
  setIsFrozen: React.Dispatch<React.SetStateAction<boolean>>;
  setShowContextMenu: React.Dispatch<React.SetStateAction<boolean>>;
  setContextMenuPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setIsSelectingOCRArea: React.Dispatch<React.SetStateAction<boolean>>;
  setShowOCRInstructions: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Helpers
  resetInteractionState: () => void;
  addOCRRegion: (region: OCRRegion) => void;
  updateOCRRegion: (regionId: string, updates: Partial<OCRRegion>) => void;
  removeOCRRegion: (regionId: string) => void;
  clearOCRRegions: () => void;
  addClickAction: (action: ClickAction) => void;
  removeClickAction: (actionId: string) => void;
  clearClickActions: () => void;
  toggleFreeze: () => void;
  unfreeze: () => void;
  setConnectionState: (connected: boolean, error?: string) => void;
  showContextMenuAt: (x: number, y: number) => void;
  hideContextMenu: () => void;
  updateConfig: (updates: Partial<LiveDesktopConfig>) => void;
  resetAllStates: () => void;
  
  // Getters
  getSelectedRegion: () => OCRRegion | null;
  getRegionById: (regionId: string) => OCRRegion | null;
  getClickActionById: (actionId: string) => ClickAction | null;
  
  // Refs
  stateRef: React.MutableRefObject<{
    ocrRegions: OCRRegion[];
    clickActions: ClickAction[];
    interactionState: InteractionState;
    screenData: ScreenData | null;
    isConnected: boolean;
    currentFrame: string | null;
    isFrozen: boolean;
  }>;
}