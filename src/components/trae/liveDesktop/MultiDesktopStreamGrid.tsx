/**
 * Multi-Desktop Stream Grid Component
 * 
 * Displays multiple desktop streams simultaneously in a grid layout
 * Supports up to 4 concurrent desktop streams with individual controls
 * Author: TRAE Development Team
 * Version: 1.0.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Monitor, Play, Pause, Square, Maximize, Settings, Volume2, VolumeX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LiveDesktopConfig, LiveDesktopStatus } from '@/types/liveDesktop';

// ============================================================================
// INTERFACES
// ============================================================================

interface DesktopStreamInstance {
  id: string;
  clientId: string;
  name: string;
  status: LiveDesktopStatus;
  config: LiveDesktopConfig;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isActive: boolean;
  lastFrameTime: Date | null;
}

interface MultiDesktopStreamGridProps {
  /** WebSocket connection */
  websocket?: WebSocket | null;
  /** Selected client IDs */
  selectedClients?: string[];
  /** Maximum number of concurrent streams */
  maxStreams?: number;
  /** Grid layout (2x2, 1x4, 4x1) */
  layout?: '2x2' | '1x4' | '4x1' | 'auto';
  /** Enable individual stream controls */
  enableIndividualControls?: boolean;
  /** Enable fullscreen mode for individual streams */
  enableFullscreen?: boolean;
  /** Callback when stream status changes */
  onStreamStatusChange?: (streamId: string, status: LiveDesktopStatus) => void;
  /** Callback when frame is received */
  onFrameReceived?: (streamId: string, frameData: any) => void;
  /** Frame data received callback registration */
  onFrameDataReceived?: (callback: (message: any) => void) => void;
  /** Callback when client disconnects */
  onClientDisconnected?: (clientId: string) => void;
  /** CSS classes */
  className?: string;
}

// ============================================================================
// MULTI-DESKTOP STREAM GRID COMPONENT
// ============================================================================

export const MultiDesktopStreamGrid: React.FC<MultiDesktopStreamGridProps> = ({
  websocket,
  selectedClients = [],
  maxStreams = 4,
  layout = '2x2',
  enableIndividualControls = true,
  enableFullscreen = true,
  onStreamStatusChange,
  onFrameReceived,
  onFrameDataReceived,
  onClientDisconnected,
  className = ''
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [streams, setStreams] = useState<Map<string, DesktopStreamInstance>>(new Map());
  const [activeStreams, setActiveStreams] = useState<string[]>([]);
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [fullscreenStream, setFullscreenStream] = useState<string | null>(null);
  const [globalControls, setGlobalControls] = useState({
    startAll: false,
    stopAll: false,
    muteAll: false
  });

  const websocketRef = useRef<WebSocket | null>(null);

  // ============================================================================
  // WEBSOCKET CONNECTION MANAGEMENT
  // ============================================================================

  const connectWebSocket = useCallback(() => {
    // Use provided websocket if available, otherwise create new connection
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocketRef.current = websocket;
      console.log('Using provided WebSocket connection for multi-stream');
      return;
    }

    try {
      const ws = new WebSocket('ws://localhost:8084');
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log('Multi-stream WebSocket connected');
        
        // Send handshake for web client
        const handshake = {
          type: 'handshake',
          clientInfo: {
            clientType: 'web_multi_stream',
            clientId: `multi_stream_${Date.now()}`,
            capabilities: ['multi_stream', 'frame_display', 'stream_control']
          }
        };
        ws.send(JSON.stringify(handshake));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('Multi-stream WebSocket disconnected');
        // Auto-reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (error) => {
        console.error('Multi-stream WebSocket error:', error);
      };

    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  }, [websocket]);

  // ============================================================================
  // DESKTOP CLIENT MANAGEMENT
  // ============================================================================

  const handleDesktopConnected = useCallback((clientId: string) => {
    if (!clientId || typeof clientId !== 'string') {
      console.warn('Invalid clientId for desktop connection:', clientId);
      return;
    }

    if (streams.size >= maxStreams) {
      console.warn(`Maximum streams (${maxStreams}) reached, ignoring new desktop client`);
      return;
    }

    const streamId = `stream_${clientId}`;
    const canvasRef = React.createRef<HTMLCanvasElement>();

    const newStream: DesktopStreamInstance = {
      id: streamId,
      clientId,
      name: `Desktop ${streams.size + 1}`,
      status: {
        connected: true,
        streaming: false,
        connectionName: `Desktop ${streams.size + 1}`,
        latency: 0,
        fpsActual: 0,
        bytesReceived: 0,
        lastFrameTime: ''
      },
      config: {
        id: `config_${clientId}`,
        name: `Desktop ${streams.size + 1} Config`,
        description: `Configuration for Desktop ${streams.size + 1}`,
        websocketUrl: 'ws://localhost:8084',
        streaming: {
          fps: 30,
          quality: 80,
          scale: 1.0,
          format: 'jpeg'
        },
        connection: {
          timeout: 30000,
          maxReconnectAttempts: 5,
          reconnectInterval: 3000,
          autoReconnect: true
        },
        ocr: {
          enabled: false,
          extractionInterval: 5,
          autoSend: false,
          regions: []
        },
        ocrRegions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      canvasRef,
      isActive: false,
      lastFrameTime: null
    };

    setStreams(prev => new Map(prev.set(streamId, newStream)));
    setActiveStreams(prev => [...prev, streamId]);

    console.log(`Desktop client connected: ${clientId} -> Stream: ${streamId}`);
  }, [streams, maxStreams]);

  const handleDesktopDisconnected = useCallback((clientId: string) => {
    if (!clientId || typeof clientId !== 'string') {
      console.warn('Invalid clientId for desktop disconnection:', clientId);
      return;
    }

    const streamToRemove = Array.from(streams.values()).find(s => s.clientId === clientId);
    if (streamToRemove) {
      setStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(streamToRemove.id);
        return newMap;
      });
      setActiveStreams(prev => prev.filter(id => id !== streamToRemove.id));
      
      if (selectedStream === streamToRemove.id) {
        setSelectedStream(null);
      }
      if (fullscreenStream === streamToRemove.id) {
        setFullscreenStream(null);
      }

      // Notify parent component
      if (onClientDisconnected) {
        onClientDisconnected(clientId);
      }

      console.log(`Desktop client disconnected: ${clientId}`);
    } else {
      console.warn(`No stream found for disconnected clientId: ${clientId}`);
    }
  }, [streams, selectedStream, fullscreenStream, onClientDisconnected]);

  // ============================================================================
  // FRAME HANDLING
  // ============================================================================

  const handleFrameData = useCallback((message: any) => {
    // Comprehensive null/undefined checks
    if (!message || typeof message !== 'object') {
      console.warn('Received null, undefined, or invalid frame data message:', message);
      return;
    }

    // Check for clientId with multiple fallbacks
    let clientId: string | null = null;
    
    try {
      clientId = message.desktopClientId || 
                 (message.metadata && message.metadata.clientId) || 
                 message.clientId ||
                 null;
    } catch (error) {
      console.error('Error extracting clientId from message:', error, message);
      return;
    }

    if (!clientId) {
      console.warn('Frame data message missing clientId:', message);
      return;
    }

    // Check for frameData
    const frameData = message.frameData || message.data;
    if (!frameData) {
      console.warn('Frame data message missing frameData:', message);
      return;
    }

    // Find the stream for this client
    const stream = Array.from(streams.values()).find(s => s.clientId === clientId);
    if (!stream) {
      console.warn(`No stream found for clientId: ${clientId}`);
      return;
    }

    // Update stream status with frame info
    setStreams(prev => {
      const newMap = new Map(prev);
      const updatedStream = newMap.get(stream.id);
      if (updatedStream) {
        updatedStream.status.streaming = true;
        updatedStream.status.lastFrameTime = new Date().toISOString();
        updatedStream.status.bytesReceived += frameData.length || 0;
        updatedStream.lastFrameTime = new Date();
        newMap.set(stream.id, updatedStream);
      }
      return newMap;
    });

    // Render frame to canvas
    renderFrameToCanvas(stream.id, frameData);

    // Callback for frame received
    if (onFrameReceived) {
      onFrameReceived(stream.id, message);
    }

    console.log(`Frame received for stream ${stream.id}, size: ${frameData.length || 0} bytes`);
  }, [streams, onFrameReceived]);

  // ============================================================================
  // STREAM STATUS HANDLING
  // ============================================================================

  const handleStreamStatus = useCallback((message: any) => {
    if (!message || typeof message !== 'object') {
      console.warn('Received null, undefined, or invalid stream status message:', message);
      return;
    }

    const clientId = message.desktopClientId || message.clientId;
    if (!clientId) {
      console.warn('Stream status message missing clientId:', message);
      return;
    }

    const stream = Array.from(streams.values()).find(s => s.clientId === clientId);
    if (!stream) {
      console.warn(`No stream found for clientId: ${clientId}`);
      return;
    }

    // Update stream status
    setStreams(prev => {
      const newMap = new Map(prev);
      const updatedStream = newMap.get(stream.id);
      if (updatedStream) {
        updatedStream.status = {
          ...updatedStream.status,
          ...message.status,
          connectionName: message.status?.connectionName || `Desktop ${clientId}`
        };
        newMap.set(stream.id, updatedStream);
      }
      return newMap;
    });

    // Callback for status change
    if (onStreamStatusChange) {
      onStreamStatusChange(stream.id, message.status);
    }

    console.log(`Stream status updated for ${stream.id}:`, message.status);
  }, [streams, onStreamStatusChange]);

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  const handleWebSocketMessage = useCallback((message: any) => {
    if (!message || typeof message !== 'object') {
      console.warn('Received null, undefined, or invalid message:', message);
      return;
    }

    if (!message.type) {
      console.warn('Message missing type field:', message);
      return;
    }

    switch (message.type) {
      case 'desktop_connected':
        if (message.desktopClientId) {
          handleDesktopConnected(message.desktopClientId);
        } else {
          console.warn('desktop_connected message missing desktopClientId:', message);
        }
        break;

      case 'desktop_disconnected':
        if (message.desktopClientId) {
          handleDesktopDisconnected(message.desktopClientId);
        } else {
          console.warn('desktop_disconnected message missing desktopClientId:', message);
        }
        break;

      case 'frame_data':
        handleFrameData(message);
        break;

      case 'desktop_stream_status':
        handleStreamStatus(message);
        break;

      default:
        console.log('Unhandled message type:', message.type);
    }
  }, [handleDesktopConnected, handleDesktopDisconnected, handleFrameData, handleStreamStatus]);

  // ============================================================================
  // STREAM CONTROLS
  // ============================================================================

  const startStream = useCallback((streamId: string) => {
    const stream = streams.get(streamId);
    if (!stream || !websocketRef.current) return;

    const startMessage = {
      type: 'start_desktop_stream',
      targetClientId: stream.clientId,
      config: stream.config.streaming
    };

    websocketRef.current.send(JSON.stringify(startMessage));
    console.log(`Starting stream: ${streamId}`);
  }, [streams]);

  const stopStream = useCallback((streamId: string) => {
    const stream = streams.get(streamId);
    if (!stream || !websocketRef.current) return;

    const stopMessage = {
      type: 'stop_desktop_stream',
      targetClientId: stream.clientId
    };

    websocketRef.current.send(JSON.stringify(stopMessage));
    console.log(`Stopping stream: ${streamId}`);
  }, [streams]);

  const startAllStreams = useCallback(() => {
    activeStreams.forEach(streamId => startStream(streamId));
  }, [activeStreams, startStream]);

  const stopAllStreams = useCallback(() => {
    activeStreams.forEach(streamId => stopStream(streamId));
  }, [activeStreams, stopStream]);

  // ============================================================================
  // CANVAS RENDERING
  // ============================================================================

  const renderFrameToCanvas = useCallback((streamId: string, frameData: string) => {
    const stream = streams.get(streamId);
    if (!stream || !stream.canvasRef.current) {
      console.warn(`Cannot render frame: stream ${streamId} not found or canvas not available`);
      return;
    }

    try {
      const canvas = stream.canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.warn(`Cannot get 2D context for stream: ${streamId}`);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Draw frame with aspect ratio preservation
          const canvasAspect = canvas.width / canvas.height;
          const imgAspect = img.width / img.height;
          
          let drawWidth, drawHeight, drawX, drawY;
          
          if (imgAspect > canvasAspect) {
            // Image is wider than canvas
            drawWidth = canvas.width;
            drawHeight = canvas.width / imgAspect;
            drawX = 0;
            drawY = (canvas.height - drawHeight) / 2;
          } else {
            // Image is taller than canvas
            drawWidth = canvas.height * imgAspect;
            drawHeight = canvas.height;
            drawX = (canvas.width - drawWidth) / 2;
            drawY = 0;
          }
          
          ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        } catch (drawError) {
          console.error(`Error drawing frame for stream ${streamId}:`, drawError);
        }
      };

      img.onerror = (error) => {
        console.error(`Error loading image for stream ${streamId}:`, error);
      };

      img.src = `data:image/jpeg;base64,${frameData}`;

    } catch (error) {
      console.error(`Error processing frame for stream ${streamId}:`, error);
    }
  }, [streams]);

  // ============================================================================
  // LAYOUT CALCULATION
  // ============================================================================

  const getGridLayout = useCallback(() => {
    const streamCount = activeStreams.length;
    
    switch (layout) {
      case '2x2':
        return { cols: 2, rows: 2 };
      case '1x4':
        return { cols: 1, rows: 4 };
      case '4x1':
        return { cols: 4, rows: 1 };
      case 'auto':
      default:
        if (streamCount <= 1) return { cols: 1, rows: 1 };
        if (streamCount <= 2) return { cols: 2, rows: 1 };
        if (streamCount <= 4) return { cols: 2, rows: 2 };
        return { cols: 3, rows: 2 };
    }
  }, [layout, activeStreams.length]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, [connectWebSocket]);

  // Register frame data callback with parent
  useEffect(() => {
    if (onFrameDataReceived) {
      onFrameDataReceived(handleFrameData);
    }
  }, [onFrameDataReceived, handleFrameData]);

  // Create streams for selected clients
  useEffect(() => {
    selectedClients.forEach((clientId, index) => {
      const streamId = `stream_${clientId}`;
      
      // Check if stream already exists
      if (streams.has(streamId)) return;
      
      const canvasRef = React.createRef<HTMLCanvasElement>();

      const newStream: DesktopStreamInstance = {
        id: streamId,
        clientId,
        name: `Desktop ${index + 1}`,
        status: {
          connected: true,
          streaming: false,
          connectionName: `Desktop ${index + 1}`,
          latency: 0,
          fpsActual: 0,
          bytesReceived: 0,
          lastFrameTime: ''
        },
        config: {
          id: `config_${clientId}`,
          name: `Desktop ${index + 1} Config`,
          description: `Configuration for Desktop ${index + 1}`,
          websocketUrl: 'ws://localhost:8084',
          streaming: {
            fps: 30,
            quality: 80,
            scale: 1.0,
            format: 'jpeg'
          },
          connection: {
            timeout: 30000,
            maxReconnectAttempts: 5,
            reconnectInterval: 3000,
            autoReconnect: true
          },
          ocr: {
            enabled: false,
            extractionInterval: 5,
            autoSend: false,
            regions: []
          },
          ocrRegions: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        canvasRef,
        isActive: true,
        lastFrameTime: null
      };

      setStreams(prev => new Map(prev.set(streamId, newStream)));
      setActiveStreams(prev => [...prev, streamId]);

      console.log(`Created stream for selected client: ${clientId} -> Stream: ${streamId}`);
    });

    // Remove streams for clients that are no longer selected
    const currentStreamIds = Array.from(streams.keys());
    currentStreamIds.forEach(streamId => {
      const stream = streams.get(streamId);
      if (stream && !selectedClients.includes(stream.clientId)) {
        setStreams(prev => {
          const newMap = new Map(prev);
          newMap.delete(streamId);
          return newMap;
        });
        setActiveStreams(prev => prev.filter(id => id !== streamId));
        console.log(`Removed stream for unselected client: ${stream.clientId}`);
      }
    });
  }, [selectedClients, streams]);

  // ============================================================================
  // RENDER
  // ============================================================================

  const gridLayout = getGridLayout();

  return (
    <div className={`multi-desktop-stream-grid ${className}`}>
      {/* Global Controls */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Multi-Desktop Stream ({activeStreams.length}/{maxStreams})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={startAllStreams} size="sm">
              <Play className="h-4 w-4 mr-1" />
              Start All
            </Button>
            <Button onClick={stopAllStreams} variant="outline" size="sm">
              <Pause className="h-4 w-4 mr-1" />
              Stop All
            </Button>
            <Badge variant="outline">
              Layout: {layout}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stream Grid */}
      <div 
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
          gridTemplateRows: `repeat(${gridLayout.rows}, 1fr)`
        }}
      >
        {activeStreams.map((streamId) => {
          const stream = streams.get(streamId);
          if (!stream) return null;

          return (
            <Card key={streamId} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{stream.name}</CardTitle>
                  <div className="flex gap-1">
                    <Badge 
                      variant={stream.status.streaming ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {stream.status.streaming ? "Live" : "Idle"}
                    </Badge>
                    {enableIndividualControls && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startStream(streamId)}
                          disabled={stream.status.streaming}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => stopStream(streamId)}
                          disabled={!stream.status.streaming}
                        >
                          <Square className="h-3 w-3" />
                        </Button>
                        {enableFullscreen && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setFullscreenStream(streamId)}
                          >
                            <Maximize className="h-3 w-3" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <canvas
                  ref={stream.canvasRef}
                  width={400}
                  height={300}
                  className="w-full bg-muted border rounded"
                  style={{ aspectRatio: '4/3' }}
                />
                <div className="mt-2 text-xs text-muted-foreground">
                  FPS: {stream.status.fpsActual} | 
                  Latency: {stream.status.latency}ms |
                  Client: {stream.clientId.substring(0, 8)}...
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* No Streams Message */}
      {activeStreams.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Monitor className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Desktop Clients Connected</h3>
            <p className="text-muted-foreground">
              Start desktop capture clients to see multiple streams here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MultiDesktopStreamGrid;