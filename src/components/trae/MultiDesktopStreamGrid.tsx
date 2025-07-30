/**
 * Multi-Desktop Stream Grid Component
 * 
 * Displays up to 4 desktop streams in a responsive grid layout
 * Handles individual stream controls and status display
 * Author: TRAE Development Team
 * Version: 1.0.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Monitor, Wifi, WifiOff } from 'lucide-react';

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface DesktopClient {
  id: string;
  connected: boolean;
  lastSeen: string;
}

interface StreamData {
  clientId: string;
  fps: number;
  quality: string;
  scale: number;
  format: string;
  dataSize: number;
}

interface MultiDesktopStreamGridProps {
  websocket: WebSocket | null;
  selectedClients: string[];
  onClientDisconnected: (clientId: string) => void;
}

// ============================================================================
// STREAM GRID COMPONENT
// ============================================================================

export const MultiDesktopStreamGrid: React.FC<MultiDesktopStreamGridProps> = ({
  websocket,
  selectedClients,
  onClientDisconnected
}) => {
  // State management for streams
  const [streamStates, setStreamStates] = useState<Record<string, {
    active: boolean;
    connected: boolean;
    frameData: string | null;
    streamInfo: StreamData | null;
  }>>({});

  // Canvas refs for each stream
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  // ============================================================================
  // INITIALIZE STREAM STATES FOR SELECTED CLIENTS
  // ============================================================================

  useEffect(() => {
    // Initialize stream states for newly selected clients
    selectedClients.forEach(clientId => {
      if (!streamStates[clientId]) {
        setStreamStates(prev => ({
          ...prev,
          [clientId]: {
            active: false,
            connected: true, // Assume connected when selected
            frameData: null,
            streamInfo: null
          }
        }));
      }
    });

    // Clean up stream states for clients no longer selected
    Object.keys(streamStates).forEach(clientId => {
      if (!selectedClients.includes(clientId)) {
        setStreamStates(prev => {
          const newState = { ...prev };
          delete newState[clientId];
          return newState;
        });
      }
    });
  }, [selectedClients]);

  // ============================================================================
  // WEBSOCKET MESSAGE HANDLING
  // ============================================================================

  useEffect(() => {
    if (!websocket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'frame_data':
            if (data.desktopClientId && selectedClients.includes(data.desktopClientId)) {
              handleFrameData(data.desktopClientId, data.frameData, data.metadata || data);
            }
            break;
            
          case 'stream_status':
          case 'desktop_stream_status':
            if (data.desktopClientId && selectedClients.includes(data.desktopClientId)) {
              handleStreamStatus(data.desktopClientId, data.status || data);
            }
            break;
            
          case 'desktop_disconnected':
            if (data.desktopClientId && selectedClients.includes(data.desktopClientId)) {
              handleClientDisconnected(data.desktopClientId);
            }
            break;
            
          default:
            console.log('Unhandled message type:', data.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    websocket.addEventListener('message', handleMessage);
    return () => websocket.removeEventListener('message', handleMessage);
  }, [websocket, selectedClients]);

  // ============================================================================
  // STREAM DATA HANDLERS
  // ============================================================================

  const handleFrameData = (clientId: string, frameData: string, streamInfo: any) => {
    setStreamStates(prev => ({
      ...prev,
      [clientId]: {
        ...prev[clientId],
        frameData,
        streamInfo: {
          clientId,
          fps: streamInfo.fps || 0,
          quality: streamInfo.quality || 'unknown',
          scale: streamInfo.scale || 1,
          format: streamInfo.format || 'jpeg',
          dataSize: streamInfo.dataSize || 0
        },
        connected: true
      }
    }));

    // Render frame to canvas
    renderFrameToCanvas(clientId, frameData);
  };

  const handleStreamStatus = (clientId: string, statusData: any) => {
    console.log('Handling stream status for', clientId, statusData);
    
    setStreamStates(prev => ({
      ...prev,
      [clientId]: {
        ...prev[clientId],
        connected: true, // If we're receiving status, client is connected
        active: statusData.streaming || statusData.active || false
      }
    }));
  };

  const handleClientDisconnected = (clientId: string) => {
    setStreamStates(prev => ({
      ...prev,
      [clientId]: {
        ...prev[clientId],
        connected: false,
        active: false,
        frameData: null
      }
    }));
    
    // Notify parent component
    onClientDisconnected(clientId);
  };

  // ============================================================================
  // CANVAS RENDERING
  // ============================================================================

  const renderFrameToCanvas = (clientId: string, frameData: string) => {
    const canvas = canvasRefs.current[clientId];
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Calculate aspect ratio and fit image
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
    };
    
    img.src = `data:image/jpeg;base64,${frameData}`;
  };

  // ============================================================================
  // STREAM CONTROLS
  // ============================================================================

  const startStream = (clientId: string) => {
    if (!websocket) return;
    
    websocket.send(JSON.stringify({
      type: 'start_desktop_stream',
      desktopClientId: clientId
    }));
    
    setStreamStates(prev => ({
      ...prev,
      [clientId]: {
        ...prev[clientId],
        active: true
      }
    }));
  };

  const stopStream = (clientId: string) => {
    if (!websocket) return;
    
    websocket.send(JSON.stringify({
      type: 'stop_desktop_stream',
      desktopClientId: clientId
    }));
    
    setStreamStates(prev => ({
      ...prev,
      [clientId]: {
        ...prev[clientId],
        active: false,
        frameData: null
      }
    }));
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const getStreamStatus = (clientId: string) => {
    const state = streamStates[clientId];
    
    if (!state?.connected) return { status: 'disconnected', color: 'destructive' };
    if (!state?.active) return { status: 'inactive', color: 'secondary' };
    return { status: 'streaming', color: 'success' };
  };

  const formatDataSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {selectedClients.map((clientId, index) => {
        const state = streamStates[clientId];
        const status = getStreamStatus(clientId);
        
        return (
          <Card key={clientId} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  Desktop {index + 1}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={status.color as any}>
                    {state?.connected ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
                    {status.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant={state?.active ? "destructive" : "default"}
                    onClick={() => state?.active ? stopStream(clientId) : startStream(clientId)}
                    disabled={!state?.connected}
                  >
                    {state?.active ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              
              {/* Stream Info */}
              {state?.streamInfo && (
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>FPS: {state.streamInfo.fps}</span>
                  <span>Quality: {state.streamInfo.quality}</span>
                  <span>Size: {formatDataSize(state.streamInfo.dataSize)}</span>
                </div>
              )}
            </CardHeader>
            
            <CardContent>
              {/* Stream Canvas */}
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                <canvas
                  ref={el => canvasRefs.current[clientId] = el}
                  width={640}
                  height={360}
                  className="w-full h-full object-contain"
                />
                
                {/* Overlay for inactive streams */}
                {!state?.active && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Monitor className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        {!state?.connected ? 'Client Disconnected' : 'Stream Inactive'}
                      </p>
                      <p className="text-xs opacity-75">
                        Client ID: {clientId}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Remove Client Button */}
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onClientDisconnected(clientId)}
                >
                  Remove from Grid
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
      
      {/* Empty slots */}
      {Array.from({ length: 4 - selectedClients.length }).map((_, index) => (
        <Card key={`empty-${index}`} className="border-dashed">
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center text-muted-foreground">
              <Monitor className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Empty Slot</p>
              <p className="text-xs">Select a client to add stream</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MultiDesktopStreamGrid;