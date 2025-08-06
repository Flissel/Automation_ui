import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Monitor, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Settings, 
  Wifi, 
  WifiOff,
  Play,
  Square,
  RefreshCw
} from 'lucide-react';

interface DualScreenData {
  screen1: {
    imageData: string;
    timestamp: number;
    width: number;
    height: number;
    clientId: string;
  } | null;
  screen2: {
    imageData: string;
    timestamp: number;
    width: number;
    height: number;
    clientId: string;
  } | null;
}

interface DualScreenViewerProps {
  websocket: WebSocket | null;
  isConnected: boolean;
  onReconnect: () => void;
}

export const DualScreenViewer: React.FC<DualScreenViewerProps> = ({
  websocket,
  isConnected,
  onReconnect
}) => {
  // State für Dual-Screen-Daten
  const [dualScreenData, setDualScreenData] = useState<DualScreenData>({
    screen1: null,
    screen2: null
  });
  
  // State für UI-Kontrollen
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedScreen, setSelectedScreen] = useState<'both' | 'screen1' | 'screen2'>('both');
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  const [frameCount, setFrameCount] = useState({ screen1: 0, screen2: 0 });
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'streaming'>('disconnected');
  
  // Refs für Canvas-Elemente
  const screen1CanvasRef = useRef<HTMLCanvasElement>(null);
  const screen2CanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // WebSocket-Nachrichtenbehandlung
  useEffect(() => {
    if (!websocket) return;
    
    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'frame_data' && message.routingInfo?.isDualScreen) {
          const screenIndex = message.routingInfo.screenIndex;
          const screenKey = screenIndex === 0 ? 'screen1' : 'screen2';
          
          // Aktualisiere Screen-Daten
          setDualScreenData(prev => ({
            ...prev,
            [screenKey]: {
              imageData: `data:image/jpeg;base64,${message.frameData}`,
              timestamp: message.metadata.timestamp,
              width: message.width,
              height: message.height,
              clientId: message.metadata.clientId
            }
          }));
          
          // Aktualisiere Frame-Counter
          setFrameCount(prev => ({
            ...prev,
            [screenKey]: prev[screenKey] + 1
          }));
          
          setLastUpdateTime(Date.now());
          setConnectionStatus('streaming');
          
          console.log(`Dual-Screen Frame empfangen: ${screenKey}`, {
            width: message.width,
            height: message.height,
            clientId: message.metadata.clientId
          });
        }
      } catch (error) {
        console.error('Fehler beim Verarbeiten der WebSocket-Nachricht:', error);
      }
    };
    
    websocket.addEventListener('message', handleMessage);
    
    return () => {
      websocket.removeEventListener('message', handleMessage);
    };
  }, [websocket]);
  
  // Canvas-Rendering für Screen 1
  useEffect(() => {
    if (!dualScreenData.screen1 || !screen1CanvasRef.current) return;
    
    const canvas = screen1CanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
      // Setze Canvas-Größe
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Zeichne Bild
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      // Füge Overlay-Informationen hinzu
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 200, 60);
      
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.fillText('Screen 1 (Primary)', 15, 25);
      ctx.fillText(`${img.width}x${img.height}`, 15, 40);
      ctx.fillText(`Frames: ${frameCount.screen1}`, 15, 55);
    };
    img.src = dualScreenData.screen1.imageData;
  }, [dualScreenData.screen1, frameCount.screen1]);
  
  // Canvas-Rendering für Screen 2
  useEffect(() => {
    if (!dualScreenData.screen2 || !screen2CanvasRef.current) return;
    
    const canvas = screen2CanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
      // Setze Canvas-Größe
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Zeichne Bild
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      // Füge Overlay-Informationen hinzu
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 200, 60);
      
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.fillText('Screen 2 (Secondary)', 15, 25);
      ctx.fillText(`${img.width}x${img.height}`, 15, 40);
      ctx.fillText(`Frames: ${frameCount.screen2}`, 15, 55);
    };
    img.src = dualScreenData.screen2.imageData;
  }, [dualScreenData.screen2, frameCount.screen2]);
  
  // Streaming-Kontrollen
  const startDualScreenStream = useCallback(() => {
    if (!websocket || !isConnected) return;
    
    // Suche nach Dual-Screen-Clients
    websocket.send(JSON.stringify({
      type: 'get_desktop_clients',
      timestamp: new Date().toISOString()
    }));
    
    // Starte Streaming für beide Bildschirme
    setTimeout(() => {
      websocket.send(JSON.stringify({
        type: 'start_desktop_stream',
        desktopClientId: 'dual_screen_client',
        config: {
          fps: 15,
          quality: 85,
          scale: 1.0,
          format: 'jpeg',
          dualScreen: true
        },
        timestamp: new Date().toISOString()
      }));
    }, 1000);
    
    setIsStreaming(true);
    console.log('Dual-Screen-Streaming gestartet');
  }, [websocket, isConnected]);
  
  const stopDualScreenStream = useCallback(() => {
    if (!websocket) return;
    
    websocket.send(JSON.stringify({
      type: 'stop_desktop_stream',
      desktopClientId: 'dual_screen_client',
      timestamp: new Date().toISOString()
    }));
    
    setIsStreaming(false);
    setConnectionStatus('connected');
    console.log('Dual-Screen-Streaming gestoppt');
  }, [websocket]);
  
  // Fullscreen-Toggle
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);
  
  // Screen-Auswahl
  const selectScreen = useCallback((screen: 'both' | 'screen1' | 'screen2') => {
    setSelectedScreen(screen);
  }, []);
  
  // Status-Badge-Komponente
  const StatusBadge = () => {
    const getStatusColor = () => {
      switch (connectionStatus) {
        case 'streaming': return 'bg-green-500';
        case 'connected': return 'bg-blue-500';
        case 'disconnected': return 'bg-red-500';
        default: return 'bg-gray-500';
      }
    };
    
    const getStatusIcon = () => {
      switch (connectionStatus) {
        case 'streaming': return <Wifi className="w-3 h-3" />;
        case 'connected': return <Wifi className="w-3 h-3" />;
        case 'disconnected': return <WifiOff className="w-3 h-3" />;
        default: return <WifiOff className="w-3 h-3" />;
      }
    };
    
    return (
      <Badge className={`${getStatusColor()} text-white flex items-center gap-1`}>
        {getStatusIcon()}
        {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
      </Badge>
    );
  };
  
  return (
    <div ref={containerRef} className={`dual-screen-viewer ${isFullscreen ? 'fullscreen' : ''}`}>
      <Card className="w-full h-full">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Monitor className="w-6 h-6 text-blue-600" />
              <div>
                <CardTitle className="text-xl">Dual Screen Viewer</CardTitle>
                <CardDescription>
                  Gleichzeitige Anzeige beider Bildschirme
                </CardDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <StatusBadge />
              
              {/* Screen-Auswahl */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <Button
                  variant={selectedScreen === 'both' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => selectScreen('both')}
                  className="px-3 py-1 text-xs"
                >
                  Beide
                </Button>
                <Button
                  variant={selectedScreen === 'screen1' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => selectScreen('screen1')}
                  className="px-3 py-1 text-xs"
                >
                  Screen 1
                </Button>
                <Button
                  variant={selectedScreen === 'screen2' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => selectScreen('screen2')}
                  className="px-3 py-1 text-xs"
                >
                  Screen 2
                </Button>
              </div>
              
              {/* Streaming-Kontrollen */}
              {!isStreaming ? (
                <Button
                  onClick={startDualScreenStream}
                  disabled={!isConnected}
                  className="flex items-center gap-2"
                  size="sm"
                >
                  <Play className="w-4 h-4" />
                  Start Stream
                </Button>
              ) : (
                <Button
                  onClick={stopDualScreenStream}
                  variant="destructive"
                  className="flex items-center gap-2"
                  size="sm"
                >
                  <Square className="w-4 h-4" />
                  Stop Stream
                </Button>
              )}
              
              {/* Weitere Kontrollen */}
              <Button
                variant="outline"
                size="sm"
                onClick={onReconnect}
                disabled={isConnected}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                className="flex items-center gap-2"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4">
          {/* Dual-Screen-Display */}
          <div className={`dual-screen-container ${selectedScreen}`}>
            {(selectedScreen === 'both' || selectedScreen === 'screen1') && (
              <div className="screen-container screen1-container">
                <div className="screen-header">
                  <h3 className="text-sm font-medium text-gray-700">
                    Primary Screen
                  </h3>
                  {dualScreenData.screen1 && (
                    <div className="text-xs text-gray-500">
                      {dualScreenData.screen1.width}x{dualScreenData.screen1.height} • 
                      Frames: {frameCount.screen1}
                    </div>
                  )}
                </div>
                
                <div className="screen-display">
                  {dualScreenData.screen1 ? (
                    <canvas
                      ref={screen1CanvasRef}
                      className="screen-canvas"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain'
                      }}
                    />
                  ) : (
                    <div className="screen-placeholder">
                      <Monitor className="w-16 h-16 text-gray-400 mb-4" />
                      <p className="text-gray-500">Warte auf Screen 1...</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {(selectedScreen === 'both' || selectedScreen === 'screen2') && (
              <div className="screen-container screen2-container">
                <div className="screen-header">
                  <h3 className="text-sm font-medium text-gray-700">
                    Secondary Screen
                  </h3>
                  {dualScreenData.screen2 && (
                    <div className="text-xs text-gray-500">
                      {dualScreenData.screen2.width}x{dualScreenData.screen2.height} • 
                      Frames: {frameCount.screen2}
                    </div>
                  )}
                </div>
                
                <div className="screen-display">
                  {dualScreenData.screen2 ? (
                    <canvas
                      ref={screen2CanvasRef}
                      className="screen-canvas"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain'
                      }}
                    />
                  ) : (
                    <div className="screen-placeholder">
                      <Monitor className="w-16 h-16 text-gray-400 mb-4" />
                      <p className="text-gray-500">Warte auf Screen 2...</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Status-Informationen */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Status:</span>
                <span className="ml-2 text-gray-600">{connectionStatus}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Letztes Update:</span>
                <span className="ml-2 text-gray-600">
                  {lastUpdateTime ? new Date(lastUpdateTime).toLocaleTimeString() : 'Nie'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Screen 1 Frames:</span>
                <span className="ml-2 text-gray-600">{frameCount.screen1}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Screen 2 Frames:</span>
                <span className="ml-2 text-gray-600">{frameCount.screen2}</span>
              </div>
            </div>
          </div>
          
          {/* Verbindungsstatus */}
          {!isConnected && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <WifiOff className="w-5 h-5" />
                <span className="font-medium">Keine Verbindung zum WebSocket-Server</span>
              </div>
              <p className="text-red-600 text-sm mt-1">
                Bitte stellen Sie sicher, dass der WebSocket-Server läuft und versuchen Sie es erneut.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <style jsx>{`
        .dual-screen-viewer.fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 9999;
          background: white;
        }
        
        .dual-screen-container {
          display: grid;
          gap: 1rem;
          height: 60vh;
        }
        
        .dual-screen-container.both {
          grid-template-columns: 1fr 1fr;
        }
        
        .dual-screen-container.screen1,
        .dual-screen-container.screen2 {
          grid-template-columns: 1fr;
        }
        
        .screen-container {
          display: flex;
          flex-direction: column;
          border: 2px solid #e5e7eb;
          border-radius: 0.5rem;
          overflow: hidden;
          background: #f9fafb;
        }
        
        .screen-header {
          padding: 0.75rem;
          background: #f3f4f6;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .screen-display {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        
        .screen-canvas {
          border-radius: 0.25rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .screen-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #6b7280;
        }
        
        @media (max-width: 768px) {
          .dual-screen-container.both {
            grid-template-columns: 1fr;
            grid-template-rows: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
};