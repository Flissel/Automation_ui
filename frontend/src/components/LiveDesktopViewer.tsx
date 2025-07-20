/**
 * TRAE Live Desktop Viewer Component
 * 
 * Universelle Live-Desktop-Anzeige für firmenweite Nutzung
 * Optimiert für Docker-Deployment und Skalierbarkeit
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Monitor, 
  Play, 
  Pause, 
  Square, 
  Settings, 
  Maximize, 
  Minimize, 
  RefreshCw,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { errorHandlingService } from '../services/ErrorHandlingService';
import { loadingStateService } from '../services/LoadingStateService';

// ============================================================================
// INTERFACES
// ============================================================================

interface LiveDesktopConfig {
  /** Frame rate für das Streaming (1-30 FPS) */
  fps: number;
  /** Skalierungsfaktor für die Anzeige (0.1-2.0) */
  scale_factor: number;
  /** Bildqualität (10-100%) */
  quality: number;
  /** Screenshot-Methode */
  screenshot_method: 'powershell' | 'vnc' | 'rdp';
  /** Verbindungs-Timeout in Sekunden */
  connection_timeout: number;
  /** Automatische Wiederverbindung */
  auto_reconnect: boolean;
  /** Kompression aktivieren */
  compression: boolean;
}

interface ConnectionStatus {
  connected: boolean;
  streaming: boolean;
  connection_name: string | null;
  latency: number;
  fps_actual: number;
  bytes_received: number;
  last_frame_time: string | null;
}

interface LiveDesktopViewerProps {
  /** Eindeutige ID für den Viewer */
  viewerId?: string;
  /** Breite des Viewers */
  width?: number;
  /** Höhe des Viewers */
  height?: number;
  /** Initiale Konfiguration */
  initialConfig?: Partial<LiveDesktopConfig>;
  /** Callback bei Verbindungsänderungen */
  onConnectionChange?: (status: ConnectionStatus) => void;
  /** Callback bei Fehlern */
  onError?: (error: string) => void;
  /** Vollbild-Modus verfügbar */
  allowFullscreen?: boolean;
  /** Steuerungsleiste anzeigen */
  showControls?: boolean;
  /** Automatisch starten */
  autoStart?: boolean;
  /** CSS-Klassen */
  className?: string;
}

// ============================================================================
// LIVE DESKTOP VIEWER COMPONENT
// ============================================================================

export const LiveDesktopViewer: React.FC<LiveDesktopViewerProps> = ({
  viewerId = 'live-desktop-viewer',
  width = 800,
  height = 600,
  initialConfig = {},
  onConnectionChange,
  onError,
  allowFullscreen = true,
  showControls = true,
  autoStart = false,
  className = ''
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const performanceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [config, setConfig] = useState<LiveDesktopConfig>({
    fps: 10,
    scale_factor: 0.8,
    quality: 85,
    screenshot_method: 'powershell',
    connection_timeout: 30,
    auto_reconnect: true,
    compression: true,
    ...initialConfig
  });

  const [status, setStatus] = useState<ConnectionStatus>({
    connected: false,
    streaming: false,
    connection_name: null,
    latency: 0,
    fps_actual: 0,
    bytes_received: 0,
    last_frame_time: null
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  // ============================================================================
  // WEBSOCKET CONNECTION MANAGEMENT
  // ============================================================================

  const connectWebSocket = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionState('connecting');
    setIsLoading(true);
    setLastError(null);

    try {
      setIsLoading(true);
      setLastError(null);
      
      // Check desktop service status (optional)
      try {
        const statusResponse = await fetch('/api/desktop/status');
        const statusData = await statusResponse.json();
        console.log('🖥️ Desktop service status:', statusData);
      } catch (error) {
        console.warn('Could not check desktop service status:', error);
      }

      // WebSocket-Verbindung aufbauen
      const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8007';
      const wsUrl = `${wsBaseUrl}/ws/live-desktop`;
      console.log('🔌 Connecting to Live Desktop WebSocket:', wsUrl);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Live Desktop WebSocket connected');
        setConnectionState('connected');
        setStatus(prev => ({ ...prev, connected: true, streaming: true }));
        setStartTime(Date.now());
        setFrameCount(0);
        
        // Performance-Monitoring starten
        startPerformanceMonitoring();
        
        if (onConnectionChange) {
          onConnectionChange({ ...status, connected: true, streaming: true });
        }
        
        toast.success('Live Desktop verbunden');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'desktop_frame' && message.data) {
            handleDesktopFrame(message.data);
          } else if (message.type === 'status_update') {
            updateConnectionStatus(message.data);
          } else if (message.type === 'error') {
            handleWebSocketError(message.data.message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('Live Desktop WebSocket disconnected', event.code, event.reason);
        setConnectionState('disconnected');
        setStatus(prev => ({ ...prev, connected: false, streaming: false }));
        stopPerformanceMonitoring();
        
        if (onConnectionChange) {
          onConnectionChange({ ...status, connected: false, streaming: false });
        }
        
        // Automatische Wiederverbindung
        if (config.auto_reconnect && event.code !== 1000) {
          scheduleReconnect();
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('Live Desktop WebSocket error:', error);
        setConnectionState('error');
        handleWebSocketError('WebSocket connection error');
      };

    } catch (error) {
      console.error('Failed to start desktop streaming:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastError(errorMessage);
      setConnectionState('error');
      
      if (onError) {
        onError(errorMessage);
      }
      
      errorHandlingService.handleError(
        new Error(`Desktop connection failed: ${errorMessage}`),
        {
          operation: 'live_desktop_connection',
          viewerId,
          errorMessage,
          retryFunction: () => connectWebSocket()
        }
      );
    } finally {
      setIsLoading(false);
    }
  }, [config, status, onConnectionChange, onError]);

  const disconnectWebSocket = useCallback(async () => {
    // WebSocket schließen
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    // Reconnect-Timer stoppen
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Performance-Monitoring stoppen
    stopPerformanceMonitoring();

    setConnectionState('disconnected');
    setStatus(prev => ({ ...prev, connected: false, streaming: false }));
    setStartTime(null);
    setFrameCount(0);
    
    if (onConnectionChange) {
      onConnectionChange({ ...status, connected: false, streaming: false });
    }
    
    toast.success('Live Desktop getrennt');
  }, [status, onConnectionChange]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      console.log('Attempting to reconnect...');
      connectWebSocket();
    }, 5000); // 5 Sekunden Wartezeit
  }, [connectWebSocket]);

  // ============================================================================
  // FRAME HANDLING
  // ============================================================================

  const handleDesktopFrame = useCallback((frameData: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Canvas-Größe anpassen
      const scaledWidth = img.width * config.scale_factor;
      const scaledHeight = img.height * config.scale_factor;
      
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;
      
      // Frame zeichnen
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
      
      // Frame-Counter aktualisieren
      setFrameCount(prev => prev + 1);
      
      // Status aktualisieren
      setStatus(prev => ({
        ...prev,
        last_frame_time: new Date().toISOString(),
        bytes_received: prev.bytes_received + (frameData.image?.length || 0)
      }));
    };
    
    img.src = frameData.image;
  }, [config.scale_factor]);

  const updateConnectionStatus = useCallback((statusData: any) => {
    setStatus(prev => ({
      ...prev,
      ...statusData
    }));
  }, []);

  const handleWebSocketError = useCallback((errorMessage: string) => {
    setLastError(errorMessage);
    setConnectionState('error');
    
    if (onError) {
      onError(errorMessage);
    }
    
    errorHandlingService.handleError(
      new Error(`LiveDesktop WebSocket error: ${errorMessage}`),
      {
        operation: 'websocket_error',
        viewerId,
        errorMessage
      }
    );
  }, [onError]);

  // ============================================================================
  // PERFORMANCE MONITORING
  // ============================================================================

  const startPerformanceMonitoring = useCallback(() => {
    performanceIntervalRef.current = setInterval(() => {
      if (startTime && frameCount > 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const actualFps = frameCount / elapsed;
        
        setStatus(prev => ({
          ...prev,
          fps_actual: Math.round(actualFps * 10) / 10
        }));
      }
    }, 1000);
  }, [startTime, frameCount]);

  const stopPerformanceMonitoring = useCallback(() => {
    if (performanceIntervalRef.current) {
      clearInterval(performanceIntervalRef.current);
      performanceIntervalRef.current = null;
    }
  }, []);

  // ============================================================================
  // UI HANDLERS
  // ============================================================================

  const toggleFullscreen = useCallback(() => {
    if (!allowFullscreen) return;
    
    const element = canvasRef.current?.parentElement;
    if (!element) return;
    
    if (!isFullscreen) {
      if (element.requestFullscreen) {
        element.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    
    setIsFullscreen(!isFullscreen);
  }, [allowFullscreen, isFullscreen]);

  const handleConfigChange = useCallback((key: keyof LiveDesktopConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const applyConfig = useCallback(async () => {
    if (!status.connected) return;
    
    // Send config update via API and WebSocket
    try {
      const response = await fetch('/api/desktop/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('Failed to update config');
      }

      // Also send via WebSocket if connected
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'config_update',
          ...config
        }));
      }
      
      toast.success('Konfiguration aktualisiert');
      setShowSettings(false);
    } catch (error) {
      console.error('Error updating config:', error);
      errorHandlingService.handleError(
        error instanceof Error ? error : new Error('Configuration update failed'),
        {
          operation: 'live_desktop_config_update',
          viewerId,
          config,
          retryFunction: () => applyConfig()
        }
      );
    }
  }, [config, status.connected]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    if (autoStart) {
      connectWebSocket();
    }
    
    return () => {
      disconnectWebSocket();
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderConnectionStatus = () => {
    const getStatusIcon = () => {
      switch (connectionState) {
        case 'connected':
          return <CheckCircle className="w-4 h-4 text-green-500" />;
        case 'connecting':
          return <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />;
        case 'error':
          return <AlertCircle className="w-4 h-4 text-red-500" />;
        default:
          return <WifiOff className="w-4 h-4 text-gray-500" />;
      }
    };

    const getStatusText = () => {
      switch (connectionState) {
        case 'connected':
          return `Verbunden • ${status.fps_actual} FPS`;
        case 'connecting':
          return 'Verbinde...';
        case 'error':
          return `Fehler: ${lastError}`;
        default:
          return 'Getrennt';
      }
    };

    return (
      <div className="flex items-center space-x-2 text-sm">
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </div>
    );
  };

  const renderControls = () => {
    if (!showControls) return null;

    return (
      <div className="absolute top-2 left-2 right-2 bg-black bg-opacity-50 rounded-lg p-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {status.connected ? (
            <button
              onClick={disconnectWebSocket}
              className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              disabled={isLoading}
            >
              <Square className="w-4 h-4" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={connectWebSocket}
              className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              disabled={isLoading}
            >
              <Play className="w-4 h-4" />
              <span>Start</span>
            </button>
          )}
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center space-x-1 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Einstellungen</span>
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
          {renderConnectionStatus()}
          
          {allowFullscreen && (
            <button
              onClick={toggleFullscreen}
              className="p-1 text-white hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    if (!showSettings) return null;

    return (
      <div className="absolute top-16 left-2 w-80 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4">
        <h3 className="text-lg font-semibold mb-4">Live Desktop Einstellungen</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              FPS: {config.fps}
            </label>
            <input
              type="range"
              min="1"
              max="30"
              value={config.fps}
              onChange={(e) => handleConfigChange('fps', parseInt(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Skalierung: {config.scale_factor}
            </label>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.1"
              value={config.scale_factor}
              onChange={(e) => handleConfigChange('scale_factor', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Qualität: {config.quality}%
            </label>
            <input
              type="range"
              min="10"
              max="100"
              value={config.quality}
              onChange={(e) => handleConfigChange('quality', parseInt(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Screenshot-Methode
            </label>
            <select
              value={config.screenshot_method}
              onChange={(e) => handleConfigChange('screenshot_method', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="powershell">PowerShell</option>
              <option value="vnc">VNC</option>
              <option value="rdp">RDP</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Automatische Wiederverbindung</label>
            <input
              type="checkbox"
              checked={config.auto_reconnect}
              onChange={(e) => handleConfigChange('auto_reconnect', e.target.checked)}
              className="rounded"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Kompression</label>
            <input
              type="checkbox"
              checked={config.compression}
              onChange={(e) => handleConfigChange('compression', e.target.checked)}
              className="rounded"
            />
          </div>
          
          <div className="flex space-x-2 pt-4">
            <button
              onClick={applyConfig}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              disabled={!status.connected}
            >
              Anwenden
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`} style={{ width, height }}>
      {/* Canvas für Desktop-Stream */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
      
      {/* Overlay für leeren Zustand */}
      {!status.streaming && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
          <div className="text-center text-white">
            <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Live Desktop</p>
            <p className="text-sm opacity-75">
              {connectionState === 'error' ? 'Verbindungsfehler' : 'Nicht verbunden'}
            </p>
            {!status.connected && !isLoading && (
              <button
                onClick={connectWebSocket}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Verbinden
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Loading-Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-center text-white">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
            <p>Verbinde...</p>
          </div>
        </div>
      )}
      
      {/* Steuerungsleiste */}
      {renderControls()}
      
      {/* Einstellungen */}
      {renderSettings()}
    </div>
  );
};

export default LiveDesktopViewer;