/**
 * Live Desktop Stream Component
 * Enhanced streaming component with OCR region overlay
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Square, Wifi, WifiOff, Monitor, Maximize } from 'lucide-react';
import { LiveDesktopConfig, LiveDesktopStatus, OCRRegion } from '@/types/liveDesktop';
import { createWebClient, WEBSOCKET_CONFIG } from '@/config/websocketConfig';
import { useToast } from '@/hooks/use-toast';

interface LiveDesktopStreamProps {
  config: LiveDesktopConfig;
  onStatusChange: (status: LiveDesktopStatus) => void;
  onFrameReceived?: (frameData: any) => void;
  showControls?: boolean;
  enableFullscreen?: boolean;
  className?: string;
}

export const LiveDesktopStream: React.FC<LiveDesktopStreamProps> = ({
  config,
  onStatusChange,
  onFrameReceived,
  showControls = true,
  enableFullscreen = true,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const lastFrameInfoRef = useRef<{ width: number; height: number; monitorId?: string; sourceClientId?: string } | null>(null);
  const [status, setStatus] = useState<LiveDesktopStatus>({
    connected: false,
    streaming: false,
    connectionName: null,
    latency: 0,
    fpsActual: 0,
    bytesReceived: 0,
    lastFrameTime: null
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const { toast } = useToast();

  // Update parent with status changes
  useEffect(() => {
    onStatusChange(status);
  }, [status, onStatusChange]);

  // Draw frame to canvas
  const drawFrame = useCallback((imageData: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Clear canvas and draw frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      setFrameCount(prev => prev + 1);
      
      // Notify parent of new frame
      onFrameReceived?.({ 
        imageData, 
        timestamp: Date.now(), 
        frameNumber: frameCount 
      });
    };
    img.src = imageData.startsWith('data:') ? imageData : `data:image/jpeg;base64,${imageData}`;
  }, [frameCount, onFrameReceived]);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setIsConnecting(true);

    try {
      // Use centralized WebSocket client creation for consistency
      // IMPORTANT: Use WEB client type for frontend viewer and send handshake on connect
      const { websocket, handshakeMessage } = createWebClient(`live_desktop_${config.id}`);
      wsRef.current = websocket;

      websocket.onopen = () => {
        console.log('WebSocket connected');
        // Send standardized handshake so server can register this web client properly
        try {
          websocket.send(JSON.stringify(handshakeMessage));
        } catch (err) {
          console.warn('Failed to send handshake:', err);
        }

        setStatus(prev => ({
          ...prev,
          connected: true,
          connectionName: config.name
        }));
        setIsConnecting(false);

        // Connection will be established automatically
        // Configuration will be loaded from database

        toast({
          title: "Connected",
          description: `Connected to ${config.name}`,
        });
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message:', data.type);
          
          switch (data.type) {
            case 'connection_established':
              console.log('Connection established:', data);
              setStatus(prev => ({
                ...prev,
                connected: true,
                connectionName: config.name
              }));
              break;

            case 'frame_data':
              if (data.frameData) {
                // Track last frame meta info for click mapping
                lastFrameInfoRef.current = {
                  width: Number(data.width) || 0,
                  height: Number(data.height) || 0,
                  monitorId: data.monitorId || data.routingInfo?.monitorId,
                  sourceClientId: data.routingInfo?.sourceClientId || data.metadata?.clientId || undefined,
                };

                drawFrame(data.frameData);
                setStatus(prev => ({
                  ...prev,
                  streaming: true,
                  fpsActual: prev.fpsActual,
                  bytesReceived: prev.bytesReceived + (event.data.length || 0),
                  lastFrameTime: new Date().toISOString()
                }));
              }
              break;

            case 'desktop_status':
              console.log('Desktop status:', data);
              setStatus(prev => ({
                ...prev,
                streaming: data.isStreaming,
                latency: data.latency || prev.latency
              }));
              break;

            case 'desktop_disconnected':
              console.log('Desktop disconnected:', data.desktopClientId);
              setStatus(prev => ({
                ...prev,
                streaming: false,
                connectionName: null
              }));
              toast({
                title: "Desktop Disconnected",
                description: "Desktop client has disconnected",
                variant: "destructive",
              });
              break;

            case 'error':
              console.error('Server error:', data.error);
              toast({
                title: "Server Error",
                description: data.error,
                variant: "destructive",
              });
              break;
              
            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      websocket.onerror = (error) => {
        console.warn('WebSocket connection failed - live desktop service may not be available');
        // Only show toast if user explicitly tried to connect
        if (isConnecting) {
          toast({
            title: "Connection Error",
            description: "Live desktop service is not available",
            variant: "destructive",
          });
        }
        setIsConnecting(false);
      };

      websocket.onclose = () => {
        console.log('WebSocket disconnected');
        setStatus(prev => ({
          ...prev,
          connected: false,
          streaming: false,
          connectionName: null
        }));
        setIsConnecting(false);

        // Auto-reconnect if enabled
        if (config.connection.maxReconnectAttempts > 0) {
          setTimeout(() => {
            connect();
          }, config.connection.reconnectInterval * 1000);
        }
      };

      // Connection timeout
      setTimeout(() => {
        if (websocket.readyState === WebSocket.CONNECTING) {
          websocket.close();
          setIsConnecting(false);
          toast({
            title: "Connection Timeout",
            description: "Failed to connect within timeout period",
            variant: "destructive",
          });
        }
      }, config.connection.timeout * 1000);

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnecting(false);
      toast({
        title: "Connection Failed",
        description: "Unable to establish WebSocket connection",
        variant: "destructive",
      });
    }
  }, [config, drawFrame, toast]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Start/stop streaming
  const toggleStreaming = useCallback(() => {
    if (!wsRef.current) return;

    const action = status.streaming ? 'stop' : 'start';
    wsRef.current.send(JSON.stringify({
      type: action + '_stream',
      config: {
        fps: config.streaming.fps,
        quality: config.streaming.quality,
        scale: config.streaming.scale
      }
    }));
  }, [status.streaming, config]);

  // Map canvas click to remote desktop coordinates and send via WS
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    try {
      const canvas = canvasRef.current;
      const ws = wsRef.current;
      const frameInfo = lastFrameInfoRef.current;
      if (!canvas || !ws || ws.readyState !== WebSocket.OPEN || !frameInfo) {
        console.warn('Click ignored: missing canvas/ws/frameInfo or socket not open');
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Use canvas width/height as the actual drawing buffer dims
      const canvasW = canvas.width;
      const canvasH = canvas.height;
      if (!canvasW || !canvasH || !frameInfo.width || !frameInfo.height) {
        console.warn('Click ignored: invalid dimensions', { canvasW, canvasH, frameInfo });
        return;
      }

      // Normalize from canvas space to original frame pixel space
      const normX = Math.max(0, Math.min(1, clickX / canvasW));
      const normY = Math.max(0, Math.min(1, clickY / canvasH));
      const remoteX = Math.round(normX * frameInfo.width);
      const remoteY = Math.round(normY * frameInfo.height);

      const targetClientId = frameInfo.sourceClientId;
      if (!targetClientId) {
        console.warn('No sourceClientId on last frame; cannot route click');
        return;
      }

      const payload = {
        type: 'desktop_click',
        clientId: targetClientId,
        monitorId: frameInfo.monitorId || 'monitor_0',
        x: remoteX,
        y: remoteY,
        button: 'left',
        double: false,
        timestamp: new Date().toISOString(),
      } as const;

      console.log('Sending desktop_click', payload);
      ws.send(JSON.stringify(payload));

      // Optional UX feedback
      toast({ title: 'Click sent', description: `(${remoteX}, ${remoteY}) → ${payload.monitorId}`, duration: 1500 });
    } catch (err) {
      console.error('Error handling canvas click:', err);
    }
  }, [toast]);

  // Enable fullscreen
  const enterFullscreen = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (canvas.requestFullscreen) {
      canvas.requestFullscreen();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Stream Display */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              {config.name}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={status.connected ? "default" : "secondary"}>
                {status.connected ? (
                  <><Wifi className="w-3 h-3 mr-1" /> Connected</>
                ) : (
                  <><WifiOff className="w-3 h-3 mr-1" /> Disconnected</>
                )}
              </Badge>
              {status.streaming && (
                <Badge variant="outline">
                  {status.fpsActual} FPS
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="w-full bg-muted border rounded-lg"
              style={{ aspectRatio: '4/3' }}
              onClick={handleCanvasClick}
            />
            
            {!status.streaming && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/80 rounded-lg">
                <div className="text-center space-y-2">
                  <Monitor className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {status.connected ? 'Stream stopped' : 'Not connected'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Stream Info */}
          {status.streaming && (
            <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Latency:</span>
                <span className="ml-1 font-mono">{status.latency}ms</span>
              </div>
              <div>
                <span className="text-muted-foreground">Frames:</span>
                <span className="ml-1 font-mono">{frameCount}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Data:</span>
                <span className="ml-1 font-mono">
                  {Math.round(status.bytesReceived / 1024)}KB
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Last Frame:</span>
                <span className="ml-1 font-mono">
                  {status.lastFrameTime ? new Date(status.lastFrameTime).toLocaleTimeString() : 'None'}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controls */}
      {showControls && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {!status.connected ? (
                  <Button onClick={connect} disabled={isConnecting}>
                    <Play className="w-4 h-4 mr-2" />
                    {isConnecting ? 'Connecting...' : 'Connect'}
                  </Button>
                ) : (
                  <>
                    <Button onClick={toggleStreaming} disabled={!status.connected}>
                      {status.streaming ? (
                        <><Pause className="w-4 h-4 mr-2" /> Pause</>
                      ) : (
                        <><Play className="w-4 h-4 mr-2" /> Stream</>
                      )}
                    </Button>
                    <Button variant="outline" onClick={disconnect}>
                      <Square className="w-4 h-4 mr-2" />
                      Disconnect
                    </Button>
                  </>
                )}
              </div>

              {enableFullscreen && status.streaming && (
                <Button variant="outline" onClick={enterFullscreen}>
                  <Maximize className="w-4 h-4 mr-2" />
                  Fullscreen
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};