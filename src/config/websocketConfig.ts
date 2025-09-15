/**
 * Centralized WebSocket Configuration for TRAE Unity AI Platform
 * Ensures consistent WebSocket URLs across all frontend components
 * 
 * IMPORTANT: This centralizes all WebSocket connections to prevent
 * hardcoded URLs throughout the codebase.
 */

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

/**
 * Get WebSocket base URL from environment variables or use default
 * Priority: VITE_WS_URL > VITE_WS_HOST:VITE_WS_PORT > localhost:8084
 */
const getWebSocketBaseUrl = (): string => {
  // Check for full WebSocket URL in environment
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  
  // Build from host and port if available
  const wsHost = import.meta.env.VITE_WS_HOST || 'localhost';
  const wsPort = import.meta.env.VITE_WS_PORT || '8084'; 
  
  return `ws://${wsHost}:${wsPort}`;
};

// ============================================================================
// WEBSOCKET ENDPOINTS
// ============================================================================

export const WEBSOCKET_CONFIG = {
  // Base WebSocket server URL
  BASE_URL: getWebSocketBaseUrl(),
  
  // WebSocket endpoint paths
  ENDPOINTS: {
    LIVE_DESKTOP: '/ws/live-desktop',
    MULTI_DESKTOP: '/ws/live-desktop', // Use same endpoint as live desktop
    FILESYSTEM_BRIDGE: '/ws/live-desktop', // Use same endpoint as live desktop
    WORKFLOW: '/ws/live-desktop', // Use same endpoint as live desktop
    DEFAULT: '/ws/live-desktop'
  },
  
  // Connection settings
  CONNECTION: {
    PING_INTERVAL: 60000,        // 60 seconds - matches server heartbeat
    PING_TIMEOUT: 10000,         // 10 seconds
    CLOSE_TIMEOUT: 10000,        // 10 seconds
    RECONNECT_DELAY: 5000,       // 5 seconds initial delay
    MAX_RECONNECT_ATTEMPTS: 10,  // Maximum reconnection attempts
    CONNECTION_TIMEOUT: 30000,   // 30 seconds connection timeout
  },
  
  // Client types for handshake identification
  CLIENT_TYPES: {
    WEB: 'web',
    DESKTOP_MANAGER: 'desktop_manager',
    DUAL_SCREEN_DESKTOP: 'dual_screen_desktop',
    MULTI_MONITOR_DESKTOP: 'multi_monitor_desktop_capture',
    DESKTOP_CAPTURE: 'desktop_capture',
    VIRTUAL_DESKTOP: 'virtual_desktop',
    FILESYSTEM_BRIDGE: 'filesystem_bridge',
  },
  
  // Capability definitions
  CAPABILITIES: {
    MULTI_STREAM_VIEWING: 'multi_stream_viewing',
    DESKTOP_SPAWNING: 'desktop_spawning',
    MULTI_INSTANCE_MANAGEMENT: 'multi_instance_management',
    FILE_OPERATIONS: 'file_operations',
    ACTION_COMMANDS: 'action_commands',
    WORKFLOW_DATA: 'workflow_data',
    DESKTOP_STREAM: 'desktop_stream',
    OCR_PROCESSING: 'ocr_processing',
  }
} as const;

// ============================================================================
// CLIENT FACTORY FUNCTIONS
// ============================================================================

/**
 * Create WebSocket connection with standardized settings
 * @param clientType - Type of client connecting
 * @param clientId - Unique client identifier
 * @param capabilities - Array of client capabilities
 * @param endpoint - WebSocket endpoint path (optional, defaults to live desktop)
 * @returns WebSocket - Configured WebSocket connection
 */
export const createWebSocketConnection = (
  clientType: string,
  clientId: string,
  capabilities: string[] = [],
  endpoint: string = WEBSOCKET_CONFIG.ENDPOINTS.LIVE_DESKTOP
): WebSocket => {
  const fullUrl = `${WEBSOCKET_CONFIG.BASE_URL}${endpoint}`;
  const ws = new WebSocket(fullUrl);
  
  // Set standard connection properties
  (ws as any).clientType = clientType;
  (ws as any).clientId = clientId;
  (ws as any).capabilities = capabilities;
  (ws as any).endpoint = endpoint;
  
  return ws;
};

/**
 * Create handshake message with standardized format
 * @param clientType - Type of client
 * @param clientId - Unique client identifier  
 * @param capabilities - Array of client capabilities
 * @param additionalInfo - Optional additional client information
 * @returns Handshake message object
 */
export const createHandshakeMessage = (
  clientType: string,
  clientId: string,
  capabilities: string[] = [],
  additionalInfo: Record<string, any> = {}
) => ({
  type: 'handshake',
  clientInfo: {
    clientType,
    clientId,
    capabilities,
    ...additionalInfo
  },
  timestamp: new Date().toISOString()
});

// ============================================================================
// PREDEFINED CLIENT CONFIGURATIONS
// ============================================================================

/**
 * Web client configuration for frontend components
 * @param componentName - Name of the component creating the connection
 * @param endpoint - Optional WebSocket endpoint (defaults to live desktop)
 */
export const createWebClient = (
  componentName: string, 
  endpoint: string = WEBSOCKET_CONFIG.ENDPOINTS.LIVE_DESKTOP
) => {
  const clientId = `web_${componentName}_${Date.now()}`;
  return {
    clientId,
    websocket: createWebSocketConnection(
      WEBSOCKET_CONFIG.CLIENT_TYPES.WEB, 
      clientId,
      [WEBSOCKET_CONFIG.CAPABILITIES.MULTI_STREAM_VIEWING],
      endpoint
    ),
    handshakeMessage: createHandshakeMessage(
      WEBSOCKET_CONFIG.CLIENT_TYPES.WEB,
      clientId,
      [WEBSOCKET_CONFIG.CAPABILITIES.MULTI_STREAM_VIEWING]
    )
  };
};

/**
 * Desktop manager client configuration
 */
export const createDesktopManagerClient = () => {
  const clientId = `desktop_manager_${Date.now()}`;
  return {
    clientId,
    websocket: createWebSocketConnection(
      WEBSOCKET_CONFIG.CLIENT_TYPES.DESKTOP_MANAGER,
      clientId,
      [
        WEBSOCKET_CONFIG.CAPABILITIES.DESKTOP_SPAWNING,
        WEBSOCKET_CONFIG.CAPABILITIES.MULTI_INSTANCE_MANAGEMENT
      ]
    ),
    handshakeMessage: createHandshakeMessage(
      WEBSOCKET_CONFIG.CLIENT_TYPES.DESKTOP_MANAGER,
      clientId,
      [
        WEBSOCKET_CONFIG.CAPABILITIES.DESKTOP_SPAWNING,
        WEBSOCKET_CONFIG.CAPABILITIES.MULTI_INSTANCE_MANAGEMENT
      ]
    )
  };
};

/**
 * Filesystem bridge client configuration
 */
export const createFilesystemBridgeClient = () => {
  const clientId = `filesystem_bridge_${Date.now()}`;
  return {
    clientId,
    websocket: createWebSocketConnection(
      WEBSOCKET_CONFIG.CLIENT_TYPES.FILESYSTEM_BRIDGE,
      clientId,
      [
        WEBSOCKET_CONFIG.CAPABILITIES.FILE_OPERATIONS,
        WEBSOCKET_CONFIG.CAPABILITIES.ACTION_COMMANDS,
        WEBSOCKET_CONFIG.CAPABILITIES.WORKFLOW_DATA
      ],
      WEBSOCKET_CONFIG.ENDPOINTS.FILESYSTEM_BRIDGE
    ),
    handshakeMessage: createHandshakeMessage(
      WEBSOCKET_CONFIG.CLIENT_TYPES.FILESYSTEM_BRIDGE,
      clientId,
      [
        WEBSOCKET_CONFIG.CAPABILITIES.FILE_OPERATIONS,
        WEBSOCKET_CONFIG.CAPABILITIES.ACTION_COMMANDS,
        WEBSOCKET_CONFIG.CAPABILITIES.WORKFLOW_DATA
      ]
    )
  };
};

/**
 * Multi-desktop streams client configuration
 * IMPORTANT: Uses 'web' client type to ensure proper registration as web client
 * and receive dual_screen_frame messages from the WebSocket server
 */
export const createMultiDesktopClient = (componentName: string) => {
  const clientId = `multi_desktop_${componentName}_${Date.now()}`;
  return {
    clientId,
    websocket: createWebSocketConnection(
      WEBSOCKET_CONFIG.CLIENT_TYPES.WEB, // Changed from MULTI_MONITOR_DESKTOP to WEB
      clientId,
      [WEBSOCKET_CONFIG.CAPABILITIES.MULTI_STREAM_VIEWING],
      WEBSOCKET_CONFIG.ENDPOINTS.MULTI_DESKTOP
    ),
    handshakeMessage: createHandshakeMessage(
      WEBSOCKET_CONFIG.CLIENT_TYPES.WEB, // Changed from MULTI_MONITOR_DESKTOP to WEB
      clientId,
      [WEBSOCKET_CONFIG.CAPABILITIES.MULTI_STREAM_VIEWING]
    )
  };
};

/**
 * Live desktop client configuration
 */
export const createLiveDesktopClient = (componentName: string) => {
  const clientId = `live_desktop_${componentName}_${Date.now()}`;
  return {
    clientId,
    websocket: createWebSocketConnection(
      WEBSOCKET_CONFIG.CLIENT_TYPES.DUAL_SCREEN_DESKTOP,
      clientId,
      [WEBSOCKET_CONFIG.CAPABILITIES.DESKTOP_STREAM],
      WEBSOCKET_CONFIG.ENDPOINTS.LIVE_DESKTOP
    ),
    handshakeMessage: createHandshakeMessage(
      WEBSOCKET_CONFIG.CLIENT_TYPES.DUAL_SCREEN_DESKTOP,
      clientId,
      [WEBSOCKET_CONFIG.CAPABILITIES.DESKTOP_STREAM]
    )
  };
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if WebSocket is in a connected state
 */
export const isWebSocketConnected = (ws: WebSocket): boolean => {
  return ws.readyState === WebSocket.OPEN;
};

/**
 * Safe WebSocket message sending with error handling
 */
export const sendWebSocketMessage = (ws: WebSocket, message: any): boolean => {
  try {
    if (isWebSocketConnected(ws)) {
      ws.send(JSON.stringify(message));
      return true;
    }
    console.warn('WebSocket not connected, message not sent:', message.type);
    return false;
  } catch (error) {
    console.error('Error sending WebSocket message:', error);
    return false;
  }
};

/**
 * Get current WebSocket configuration summary
 */
export const getWebSocketConfigSummary = () => ({
  baseUrl: WEBSOCKET_CONFIG.BASE_URL,
  environment: {
    VITE_WS_URL: import.meta.env.VITE_WS_URL,
    VITE_WS_HOST: import.meta.env.VITE_WS_HOST,
    VITE_WS_PORT: import.meta.env.VITE_WS_PORT,
  },
  isProduction: import.meta.env.PROD,
  isDevelopment: import.meta.env.DEV,
});

// ============================================================================
// DEVELOPER UTILITIES
// ============================================================================

/**
 * Log WebSocket configuration (development only)
 */
export const logWebSocketConfig = () => {
  if (import.meta.env.DEV) {
    console.group('🔌 WebSocket Configuration');
    console.log('Base URL:', WEBSOCKET_CONFIG.BASE_URL);
    console.log('Environment:', getWebSocketConfigSummary().environment);
    console.log('Client Types:', WEBSOCKET_CONFIG.CLIENT_TYPES);
    console.log('Capabilities:', WEBSOCKET_CONFIG.CAPABILITIES);
    console.groupEnd();
  }
};

// Log configuration on import in development
if (import.meta.env.DEV) {
  logWebSocketConfig();
}

export default WEBSOCKET_CONFIG;