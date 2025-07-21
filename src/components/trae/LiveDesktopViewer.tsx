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
  RefreshCw,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: LiveDesktopConfig = {
  fps: 10,
  scale_factor: 0.8,
  quality: 75,
  screenshot_method: 'powershell',
  connection_timeout: 30,
  auto_reconnect: true,
  compression: true
};

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

  const [config, setConfig] = useState<LiveDesktopConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig
  });

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    streaming: false,
    connection_name: null,
    latency: 0,
    fps_actual: 0,
    bytes_received: 0,
    last_frame_time: null
  });

  const [isLoading, setIsLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  // ============================================================================
  // WEBSOCKET CONNECTION
  // ============================================================================

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setIsLoading(true);
      // Note: In production, this should connect to your actual WebSocket server
      const wsUrl = `ws://localhost:8000/ws/live-desktop/${viewerId}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log(`[${viewerId}] WebSocket connected`);
        setConnectionStatus(prev => ({ ...prev, connected: true }));
        onConnectionChange?.({ ...connectionStatus, connected: true });
        setIsLoading(false);
        
        toast({
          title: "Connected",
          description: "Live desktop connection established",
        });
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'frame' && data.image) {
            drawFrame(data.image);
            setConnectionStatus(prev => ({
              ...prev,
              streaming: true,
              fps_actual: data.fps || prev.fps_actual,
              latency: data.latency || prev.latency,
              bytes_received: prev.bytes_received + (event.data.length || 0),
              last_frame_time: new Date().toISOString()
            }));
          }
        } catch (error) {
          console.error(`[${viewerId}] Failed to parse WebSocket message:`, error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error(`[${viewerId}] WebSocket error:`, error);
        const errorMessage = 'WebSocket connection failed';
        onError?.(errorMessage);
        toast({
          title: "Connection Error",
          description: errorMessage,
          variant: "destructive",
        });
      };

      wsRef.current.onclose = () => {
        console.log(`[${viewerId}] WebSocket disconnected`);
        setConnectionStatus(prev => ({ 
          ...prev, 
          connected: false, 
          streaming: false 
        }));
        onConnectionChange?.({ ...connectionStatus, connected: false, streaming: false });
        setIsLoading(false);
      };

    } catch (error) {
      console.error(`[${viewerId}] Failed to create WebSocket:`, error);
      setIsLoading(false);
      onError?.('Failed to establish connection');
    }
  }, [viewerId, connectionStatus, onConnectionChange, onError, toast]);

  // ============================================================================
  // CANVAS DRAWING
  // ============================================================================

  const drawFrame = useCallback((imageData: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = `data:image/png;base64,${imageData}`;
  }, []);

  // ============================================================================
  // CONTROL HANDLERS
  // ============================================================================

  const handleStart = useCallback(() => {
    connectWebSocket();
  }, [connectWebSocket]);

  const handleStop = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionStatus(prev => ({ 
      ...prev, 
      connected: false, 
      streaming: false 
    }));
  }, []);

  const handleReconnect = useCallback(() => {
    handleStop();
    setTimeout(() => {
      handleStart();
    }, 1000);
  }, [handleStart, handleStop]);

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  useEffect(() => {
    if (autoStart) {
      handleStart();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [autoStart, handleStart]);

  // ============================================================================
  // RENDER COMPONENTS
  // ============================================================================

  const renderControls = () => {
    if (!showControls) return null;

    return (
      <div className="flex items-center space-x-2 p-3 bg-muted/50 border-t">
        <Button
          onClick={connectionStatus.connected ? handleStop : handleStart}
          variant={connectionStatus.connected ? "destructive" : "default"}
          size="sm"
          disabled={isLoading}
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : connectionStatus.connected ? (
            <Square className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          <span className="ml-2">
            {isLoading ? 'Connecting...' : connectionStatus.connected ? 'Stop' : 'Start'}
          </span>
        </Button>

        <Button
          onClick={handleReconnect}
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          <RefreshCw className="w-4 h-4" />
          <span className="ml-2">Reconnect</span>
        </Button>

        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          {connectionStatus.connected ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
          <span>
            {connectionStatus.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {connectionStatus.streaming && (
          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
            <span>FPS: {connectionStatus.fps_actual}</span>
            <span>Latency: {connectionStatus.latency}ms</span>
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <Monitor className="w-5 h-5" />
          <span>Live Desktop - {viewerId}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="w-full h-auto bg-muted"
            style={{ aspectRatio: `${width}/${height}` }}
          />
          
          {!connectionStatus.connected && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
              <div className="text-center">
                <WifiOff className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Not connected</p>
                <Button
                  onClick={handleStart}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Connect
                </Button>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 mx-auto mb-2 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Connecting...</p>
              </div>
            </div>
          )}
        </div>

        {renderControls()}
      </CardContent>
    </Card>
  );
};

export default LiveDesktopViewer;