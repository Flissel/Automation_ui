/**
 * Multi-Desktop Stream Grid Component
 * 
 * Displays multiple desktop streams simultaneously in a grid layout
 * Supports up to 4 concurrent desktop streams with individual controls
 * Author: TRAE Development Team
 * Version: 1.0.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LiveDesktopConfig, LiveDesktopStatus } from '@/types/liveDesktop';
import { MultiStreamManager } from './MultiStreamManager';
import { 
  Play, 
  Pause, 
  Square, 
  Monitor, 
  Wifi, 
  WifiOff, 
  Activity,
  Settings,
  Maximize2,
  Minimize2,
  RefreshCw,
  Zap
} from 'lucide-react';

/**
 * Enhanced Multi-Desktop Stream Grid for TRAE Unity AI Platform
 * Displays multiple desktop streams in a responsive grid layout using individual WebSocket connections
 * Follows TRAE naming conventions and coding standards
 */

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

interface StreamState {
  /** Unique stream identifier */
  streamId: string;
  /** Client ID this stream belongs to */
  clientId: string;
  /** Monitor identifier */
  monitorId: string;
  /** Display name for UI */
  displayName: string;
  /** Current stream status */
  status: LiveDesktopStatus;
  /** Canvas reference for rendering */
  canvasRef: React.RefObject<HTMLCanvasElement>;
  /** Stream configuration */
  config: LiveDesktopConfig;
  /** Last frame timestamp */
  lastFrameTime: Date | null;
  /** Frame count for performance monitoring */
  frameCount: number;
  /** Stream quality metrics */
  quality: {
    fps: number;
    latency: number;
    bandwidth: number;
  };
  /** Connection state */
  isConnected: boolean;
  /** Streaming state */
  isStreaming: boolean;
}

interface MultiDesktopStreamGridProps {
  /** Selected clients with their streams */
  selectedClients: Array<{
    clientId: string;
    clientName: string;
    monitors: Array<{
      monitorId: string;
      name: string;
      resolution: { width: number; height: number };
    }>;
  }>;
  /** WebSocket server URL */
  serverUrl?: string;
  /** Maximum number of concurrent streams */
  maxStreams?: number;
  /** Grid layout configuration */
  gridLayout?: 'auto' | '1x1' | '2x2' | '3x3' | '4x4';
  /** Stream configuration */
  streamConfig?: Partial<LiveDesktopConfig>;
  /** Enable fullscreen mode for individual streams */
  enableFullscreen?: boolean;
  /** Enable stream controls */
  enableControls?: boolean;
  /** CSS class name */
  className?: string;
  /** Callback when stream status changes */
  onStreamStatusChange?: (streamId: string, status: LiveDesktopStatus) => void;
  /** Callback when stream is selected */
  onStreamSelect?: (streamId: string) => void;
}

// ============================================================================
// MULTI-DESKTOP STREAM GRID COMPONENT
// ============================================================================

export const MultiDesktopStreamGrid: React.FC<MultiDesktopStreamGridProps> = ({
  selectedClients = [],
  serverUrl = 'ws://localhost:8085',
  maxStreams = 4,
  gridLayout = 'auto',
  streamConfig = {},
  enableFullscreen = true,
  enableControls = true,
  className = '',
  onStreamStatusChange,
  onStreamSelect
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [streamStates, setStreamStates] = useState<Map<string, StreamState>>(new Map());
  const [fullscreenStream, setFullscreenStream] = useState<string | null>(null);
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [globalControls, setGlobalControls] = useState({
    isAllConnected: false,
    isAllStreaming: false,
    connectionCount: 0,
    streamingCount: 0
  });

  // Performance monitoring
  const [performanceMetrics, setPerformanceMetrics] = useState<Map<string, {
    fps: number;
    latency: number;
    frameCount: number;
    lastUpdate: Date;
  }>>(new Map());

  // ============================================================================
  // CALLBACK HANDLERS
  // ============================================================================

  /**
   * Update global control states
   */
  const updateGlobalControls = useCallback(() => {
    const streams = Array.from(streamStates.values());
    const connectedCount = streams.filter(s => s.isConnected).length;
    const streamingCount = streams.filter(s => s.isStreaming).length;
    
    setGlobalControls({
      isAllConnected: connectedCount === streams.length && streams.length > 0,
      isAllStreaming: streamingCount === streams.length && streams.length > 0,
      connectionCount: connectedCount,
      streamingCount: streamingCount
    });
  }, [streamStates]);

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
=======
  /**
   * Update global control states
   */
  const updateGlobalControls = useCallback(() => {
    const streams = Array.from(streamStates.values());
    const connectedCount = streams.filter(s => s.isConnected).length;
    const streamingCount = streams.filter(s => s.isStreaming).length;
>>>>>>> 82a8998 ( Fix multi-monitor desktop streaming redundancy and display issues)
    
    setGlobalControls({
      isAllConnected: connectedCount === streams.length && streams.length > 0,
      isAllStreaming: streamingCount === streams.length && streams.length > 0,
      connectionCount: connectedCount,
      streamingCount: streamingCount
    });
  }, [streamStates]);





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

    // Use setStreamStates callback to access current state and avoid stale closure
    setStreamStates(currentStates => {
      // Debug: Log all available streams and their clientIds
      const allStreams = Array.from(currentStates.values());
      console.log(`[DEBUG] handleStreamStatus - Looking for clientId: "${clientId}"`);
      console.log(`[DEBUG] Available streams:`, allStreams.map(s => ({
        streamId: s.streamId,
        clientId: s.clientId,
        monitorId: s.monitorId
      })));

      // Find all streams for this client (for multi-monitor support)
      const clientStreams = Array.from(currentStates.values()).filter(s => s.clientId === clientId);
      console.log(`[DEBUG] Found ${clientStreams.length} streams for clientId: "${clientId}"`);
      
      if (clientStreams.length === 0) {
        console.warn(`No streams found for clientId: ${clientId}`);
        return currentStates; // Return unchanged state
      }

      console.log(`[MultiDesktopStreamGrid] Updating status for ${clientStreams.length} streams of client: ${clientId}`, message);

      // Update all streams for this client
      const newMap = new Map(currentStates);
      let updatedCount = 0;
      
      clientStreams.forEach(stream => {
        const updatedStream = newMap.get(stream.streamId);
        if (updatedStream) {
          // Extract status information from message
          const isStreaming = message.streaming !== undefined ? message.streaming : message.status?.streaming;
          const isConnected = message.connected !== undefined ? message.connected : message.status?.connected;
          const status = message.status?.status || (isStreaming ? 'streaming' : (isConnected ? 'connected' : 'disconnected'));
          
          updatedStream.status = status;
          updatedStream.isConnected = isConnected !== undefined ? isConnected : true;
          updatedStream.isStreaming = isStreaming !== undefined ? isStreaming : false;
          newMap.set(stream.streamId, updatedStream);
          updatedCount++;
          
          console.log(`[MultiDesktopStreamGrid] Updated stream ${stream.streamId}: connected=${updatedStream.isConnected}, streaming=${updatedStream.isStreaming}, status=${updatedStream.status}`);
        }
      });
      
      console.log(`[MultiDesktopStreamGrid] Updated ${updatedCount} streams for client ${clientId}`);

      // Callback for status change (call for each stream)
      if (onStreamStatusChange) {
        clientStreams.forEach(stream => {
          const status = message.status?.status || (message.streaming ? 'streaming' : 'connected');
          onStreamStatusChange(stream.streamId, status);
        });
      }

      return newMap;
    });
  }, [onStreamStatusChange]); // Removed streamStates dependency to avoid stale closure

  // ============================================================================
  // DESKTOP CLIENT MANAGEMENT
  // ============================================================================

  const handleDesktopConnected = useCallback((clientId: string) => {
    if (!clientId || typeof clientId !== 'string') {
      console.warn('Invalid clientId for desktop connection:', clientId);
      return;
    }

    setStreamStates(prev => {
      if (prev.size >= maxStreams) {
        console.warn(`Maximum streams (${maxStreams}) reached, ignoring new desktop client`);
        return prev;
      }

      const streamId = `stream_${clientId}`;
      const canvasRef = React.createRef<HTMLCanvasElement>();

      const newStream: StreamState = {
        streamId,
        clientId,
        monitorId: 'monitor_0',
        displayName: `Desktop ${prev.size + 1}`,
        status: 'connected',
        canvasRef,
        config: {
          fps: 30,
          quality: 80,
          scale: 1.0,
          format: 'jpeg',
          enableMouse: true,
          enableKeyboard: true
        },
        lastFrameTime: null,
        frameCount: 0,
        quality: {
          fps: 0,
          latency: 0,
          bandwidth: 0
        },
        isConnected: true,
        isStreaming: false
      };

      const newStates = new Map(prev);
      newStates.set(streamId, newStream);
      
      console.log(`Desktop client connected: ${clientId} -> Stream: ${streamId}`);
      return newStates;
    });
  }, [maxStreams]);

  const handleDesktopDisconnected = useCallback((clientId: string) => {
    if (!clientId || typeof clientId !== 'string') {
      console.warn('Invalid clientId for desktop disconnection:', clientId);
      return;
    }

    const streamToRemove = Array.from(streamStates.values()).find(s => s.clientId === clientId);
    if (streamToRemove) {
      setStreamStates(prev => {
        const newMap = new Map(prev);
        newMap.delete(streamToRemove.streamId);
        return newMap;
      });
      
      if (selectedStream === streamToRemove.streamId) {
        setSelectedStream(null);
      }
      if (fullscreenStream === streamToRemove.streamId) {
        setFullscreenStream(null);
      }

      console.log(`Desktop client disconnected: ${clientId}`);
    } else {
      console.warn(`No stream found for disconnected clientId: ${clientId}`);
    }
  }, [streamStates, selectedStream, fullscreenStream]);

  // ============================================================================
  // FRAME HANDLING
  // ============================================================================

  /**
   * Handle incoming frame data from WebSocket
   */
  const handleFrameData = useCallback((message: any) => {
    if (!message || !message.frameData) {
      console.warn('[MultiDesktopStreamGrid] Invalid frame data message:', message);
      return;
    }

    // Extract client and monitor information from message
    const clientId = message.metadata?.clientId || message.clientId;
    const monitorId = message.monitorId || 'monitor_0';
    
    if (!clientId) {
      console.warn('[MultiDesktopStreamGrid] Frame data missing clientId:', message);
      return;
    }

    // Try multiple stream ID formats to find the correct stream
    const effectiveMonitorId = monitorId || 'monitor_0';
    const possibleStreamIds = [
      `${clientId}_${effectiveMonitorId}`,        // Format: clientId_monitorId
      `${clientId}_monitor_0`,                    // Format: clientId_monitor_0 (fallback)
      `${clientId}_monitor_1`,                    // Format: clientId_monitor_1 (fallback)
      `stream_${clientId}`,                       // Format: stream_clientId
      clientId                                     // Format: clientId only
    ];
    
    console.log(`[MultiDesktopStreamGrid] Processing frame data for client: ${clientId}, monitor: ${monitorId}`, {
      clientId,
      monitorId,
      frameSize: message.frameData?.length || 0,
      dimensions: `${message.width}x${message.height}`,
      possibleStreamIds
    });

    // Update stream state with new frame data
    setStreamStates(prev => {
      const newStates = new Map(prev);
      let foundStream = null;
      let foundStreamId = null;
      
      // Try to find the stream using different ID formats
      for (const streamId of possibleStreamIds) {
        const stream = newStates.get(streamId);
        if (stream) {
          foundStream = stream;
          foundStreamId = streamId;
          break;
        }
      }
      
      // If no exact match found, try to find by monitor ID
      if (!foundStream) {
        for (const [streamId, stream] of newStates.entries()) {
          if (stream.clientId === clientId && stream.monitorId === effectiveMonitorId) {
            foundStream = stream;
            foundStreamId = streamId;
            console.log(`[MultiDesktopStreamGrid] Found stream by clientId and monitorId match: ${streamId}`);
            break;
          }
        }
      }
      
      // If still no match, try to find by client ID only (for backward compatibility)
      if (!foundStream) {
        for (const [streamId, stream] of newStates.entries()) {
          if (stream.clientId === clientId) {
            foundStream = stream;
            foundStreamId = streamId;
            console.log(`[MultiDesktopStreamGrid] Found stream by clientId only: ${streamId}`);
            break;
          }
        }
      }
      
      if (foundStream && foundStreamId) {
        // Update stream with frame data
        foundStream.lastFrameTime = new Date();
        foundStream.frameCount++;
        foundStream.isConnected = true;
        foundStream.isStreaming = true;
        foundStream.status = 'streaming';
        
        // Update quality metrics
        foundStream.quality = {
          fps: message.metadata?.fps || foundStream.quality.fps,
          latency: message.metadata?.latency || foundStream.quality.latency,
          bandwidth: message.metadata?.bandwidth || foundStream.quality.bandwidth
        };
        
        newStates.set(foundStreamId, foundStream);
        
        // Render frame to canvas using the current stream data
        renderFrameToCanvasWithStream(foundStream, message.frameData);
        
        // Notify parent component
        handleFrameReceived(foundStreamId, message);
        
        console.log(`[MultiDesktopStreamGrid] Successfully processed frame for stream: ${foundStreamId}`);
      } else {
        console.warn(`[MultiDesktopStreamGrid] No stream found for client: ${clientId}, monitor: ${monitorId}`);
        console.log('Tried stream IDs:', possibleStreamIds);
        console.log('Available streams:', Array.from(newStates.keys()));
        console.log('Available stream details:', Array.from(newStates.values()).map(s => ({
          streamId: s.streamId,
          clientId: s.clientId,
          monitorId: s.monitorId
        })));
      }
      
      return newStates;
    });
  }, []);

  /**
   * Handle WebSocket messages
   */
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

      case 'connection_established':
        console.log('[MultiDesktopStreamGrid] Connection established:', message);
        // Handle connection establishment if needed
        break;

      case 'handshake_ack':
        console.log('[MultiDesktopStreamGrid] Handshake acknowledged:', message);
        // Handle handshake acknowledgment if needed
        break;

      case 'ping':
        // Respond to ping with pong if needed
        // console.log('[MultiDesktopStreamGrid] Received ping');
        break;

      default:
        console.log('Unhandled message type:', message.type);
    }
  }, [handleDesktopConnected, handleDesktopDisconnected, handleFrameData, handleStreamStatus]);

  /**
   * Handle stream status changes
   */
  const handleStreamStatusChange = useCallback((streamId: string, status: LiveDesktopStatus) => {
    console.log(`[MultiDesktopStreamGrid] Stream status changed: ${streamId} -> ${status}`);
    
    setStreamStates(prev => {
      const newStates = new Map(prev);
      const stream = newStates.get(streamId);
      if (stream) {
        stream.status = status;
        stream.isConnected = status === 'connected' || status === 'streaming';
        stream.isStreaming = status === 'streaming';
        newStates.set(streamId, stream);
      }
      return newStates;
    });

    // Notify parent component
    onStreamStatusChange?.(streamId, status);
  }, [onStreamStatusChange]);

  /**
   * Handle frame received
   */
  const handleFrameReceived = useCallback((streamId: string, frameData: any) => {
    // Update performance metrics
    setPerformanceMetrics(prev => {
      const newMetrics = new Map(prev);
      const current = newMetrics.get(streamId) || {
        fps: 0,
        latency: 0,
        frameCount: 0,
        lastUpdate: new Date()
      };

      const now = new Date();
      const timeDiff = now.getTime() - current.lastUpdate.getTime();
      
      newMetrics.set(streamId, {
        ...current,
        frameCount: current.frameCount + 1,
        fps: timeDiff > 0 ? Math.round(1000 / timeDiff) : current.fps,
        latency: frameData.latency || 0,
        lastUpdate: now
      });

      return newMetrics;
    });

    // Update stream state
    setStreamStates(prev => {
      const newStates = new Map(prev);
      const stream = newStates.get(streamId);
      if (stream) {
        stream.lastFrameTime = new Date();
        stream.frameCount++;
        newStates.set(streamId, stream);
      }
      return newStates;
    });
  }, []);

  /**
   * Handle stream connected
   */
  const handleStreamConnected = useCallback((streamId: string) => {
    console.log(`[MultiDesktopStreamGrid] Stream connected: ${streamId}`);
    // Global controls will be updated automatically via useEffect when streamStates changes
  }, []);

  /**
   * Handle stream disconnected
   */
  const handleStreamDisconnected = useCallback((streamId: string) => {
    console.log(`[MultiDesktopStreamGrid] Stream disconnected: ${streamId}`);
    // Global controls will be updated automatically via useEffect when streamStates changes
  }, []);

  /**
   * Get status badge variant
   */
  const getStatusBadgeVariant = useCallback((status: LiveDesktopStatus) => {
    switch (status) {
      case 'connected': return 'default';
      case 'streaming': return 'default';
      case 'disconnected': return 'secondary';
      case 'error': return 'destructive';
      default: return 'secondary';
    }
  }, []);

  /**
   * Get status icon
   */
  const getStatusIcon = useCallback((status: LiveDesktopStatus, isConnected: boolean) => {
    if (!isConnected) return <WifiOff className="w-4 h-4" />;
    if (status === 'streaming') return <Activity className="w-4 h-4" />;
    if (status === 'connected') return <Wifi className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  }, []);

  // Initialize streams based on selected clients
  useEffect(() => {
    console.log(`[MultiDesktopStreamGrid] Updating streams for ${selectedClients.length} clients`);
    
    // Create new streams for selected clients
    const newStreams = new Map<string, StreamState>();
    let streamCount = 0;

    selectedClients.forEach(client => {
      client.monitors.forEach(monitor => {
        if (streamCount >= maxStreams) return;

        const streamId = `${client.clientId}_${monitor.monitorId}`;
        const canvasRef = React.createRef<HTMLCanvasElement>();

        const stream: StreamState = {
          streamId,
          clientId: client.clientId,
          monitorId: monitor.monitorId,
          status: 'disconnected',
          canvasRef,
          config: {
            fps: 15,
            quality: 85,
            scale: 1.0,
            format: 'jpeg',
            enableMouse: true,
            enableKeyboard: true,
            ...streamConfig
          },
          lastFrameTime: null,
          frameCount: 0,
          quality: {
            fps: 0,
            latency: 0,
            bandwidth: 0
          },
          isConnected: false,
          isStreaming: false
        };

        newStreams.set(streamId, stream);
        streamCount++;
        
        console.log(`[MultiDesktopStreamGrid] Created stream: ${streamId} for ${client.clientId} - ${monitor.name}`);
      });
    });

    setStreamStates(newStreams);
  }, [selectedClients, maxStreams]); // Removed streamConfig from dependency array to prevent infinite re-renders

  // ============================================================================
  // UTILITY FUNCTIONS (that depend on streamManager)
  // ============================================================================

  /**
   * Get grid layout classes based on number of streams
   */
  const getGridLayoutClasses = useCallback(() => {
    const streamCount = streamStates.size;
    
    if (gridLayout !== 'auto') {
      return `grid-cols-${gridLayout.split('x')[1]} grid-rows-${gridLayout.split('x')[0]}`;
    }

    // Auto layout based on stream count
    if (streamCount <= 1) return 'grid-cols-1 grid-rows-1';
    if (streamCount <= 2) return 'grid-cols-2 grid-rows-1';
    if (streamCount <= 4) return 'grid-cols-2 grid-rows-2';
    if (streamCount <= 6) return 'grid-cols-3 grid-rows-2';
    if (streamCount <= 9) return 'grid-cols-3 grid-rows-3';
    return 'grid-cols-4 grid-rows-4';
  }, [gridLayout, streamStates]);

  const websocketRef = useRef<WebSocket | null>(null);

  // ============================================================================
  // WEBSOCKET CONNECTION MANAGEMENT
  // ============================================================================

  const connectWebSocket = useCallback(() => {

    try {
      const ws = new WebSocket('ws://localhost:8085');
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
          // Use the current handleWebSocketMessage function without creating a dependency
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
        console.warn('Multi-stream WebSocket connection failed - service may not be available');
      };

    } catch (error) {
      console.warn('WebSocket connection failed - multi-stream service may not be available');
    }
  }, []); // Empty dependency array to prevent recreation

  // ============================================================================
  // DESKTOP CLIENT MANAGEMENT (moved to earlier position)
  // ============================================================================

  // ============================================================================
  // FRAME HANDLING (moved to earlier position)
  // ============================================================================

  // ============================================================================
  // STREAM CONTROL FUNCTIONS
  // ============================================================================

  /**
   * Connect individual stream
   * Note: Server doesn't have separate connection step, so we mark as connected immediately
   */
  const connectStream = useCallback((streamId: string) => {
    console.log(`[MultiDesktopStreamGrid] Connecting stream: ${streamId}`);
    
    // Update stream state to connected immediately since server doesn't have separate connection step
    setStreamStates(prev => {
      const newStates = new Map(prev);
      const currentStream = newStates.get(streamId);
      if (currentStream) {
        newStates.set(streamId, {
          ...currentStream,
          isConnected: true,
          status: 'connected',
          lastUpdate: new Date().toISOString()
        });
      }
      return newStates;
    });
  }, []); // No dependencies needed since we access state via setStreamStates callback

  /**
   * Disconnect individual stream
   * Note: Server doesn't have separate disconnect message, so we update state locally
   */
  const disconnectStream = useCallback((streamId: string) => {
    console.log(`[MultiDesktopStreamGrid] Disconnecting stream: ${streamId}`);
    
    // Update stream state to disconnected since server doesn't have separate disconnect handling
    setStreamStates(prev => {
      const newStates = new Map(prev);
      const currentStream = newStates.get(streamId);
      if (currentStream) {
        newStates.set(streamId, {
          ...currentStream,
          isConnected: false,
          isStreaming: false,
          status: 'disconnected',
          lastUpdate: new Date().toISOString()
        });
      }
      return newStates;
    });
  }, []); // No dependencies needed since we access state via setStreamStates callback

  /**
   * Start individual stream
   */
  const startStream = useCallback((streamId: string) => {
    console.log(`[MultiDesktopStreamGrid] Starting stream: ${streamId}`);
    
    // Access current stream data via setStreamStates callback
    setStreamStates(prev => {
      const stream = prev.get(streamId);
      if (!stream || !stream.isConnected) {
        console.log(`[MultiDesktopStreamGrid] Cannot start stream ${streamId}: not found or not connected`);
        return prev; // Return unchanged state
      }

      // Send start message via WebSocket with correct field names
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        const startMessage = {
          type: 'start_desktop_stream',
          desktopClientId: stream.clientId, // Use desktopClientId as expected by server
          monitorId: stream.monitorId,
          streamId: streamId,
          config: stream.config,
          timestamp: new Date().toISOString()
        };
        websocketRef.current.send(JSON.stringify(startMessage));
      }
      
      return prev; // Return unchanged state since WebSocket response will update streaming status
    });
  }, []); // No dependencies needed since we access state via setStreamStates callback

  /**
   * Stop individual stream
   */
  const stopStream = useCallback((streamId: string) => {
    console.log(`[MultiDesktopStreamGrid] Stopping stream: ${streamId}`);
    
    // Access current stream data via setStreamStates callback
    setStreamStates(prev => {
      const stream = prev.get(streamId);
      if (!stream) {
        console.log(`[MultiDesktopStreamGrid] Cannot stop stream ${streamId}: not found`);
        return prev; // Return unchanged state
      }

      // Send stop message via WebSocket with correct field names
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        const stopMessage = {
          type: 'stop_desktop_stream',
          desktopClientId: stream.clientId, // Use desktopClientId as expected by server
          monitorId: stream.monitorId,
          streamId: streamId,
          timestamp: new Date().toISOString()
        };
        websocketRef.current.send(JSON.stringify(stopMessage));
      }
      
      return prev; // Return unchanged state since WebSocket response will update streaming status
    });
  }, []); // No dependencies needed since we access state via setStreamStates callback

  /**
   * Connect all streams
   */
  const handleConnectAll = useCallback(() => {
    console.log('[MultiDesktopStreamGrid] Connecting all streams...');
    // Access current streamStates via setStreamStates callback to get latest state
    setStreamStates(currentStreams => {
      console.log(`[MultiDesktopStreamGrid] Found ${currentStreams.size} streams to check for connection`);
      currentStreams.forEach((stream, streamId) => {
        console.log(`[MultiDesktopStreamGrid] Stream ${streamId}: isConnected=${stream.isConnected}`);
        if (!stream.isConnected) {
          console.log(`[MultiDesktopStreamGrid] Connecting stream: ${streamId}`);
          connectStream(streamId);
        }
      });
      return currentStreams; // Return unchanged state since connectStream handles updates
    });
  }, [connectStream]); // Add connectStream dependency

  /**
   * Disconnect all streams
   */
  const handleDisconnectAll = useCallback(() => {
    console.log('[MultiDesktopStreamGrid] Disconnecting all streams...');
    // Access current streamStates via setStreamStates callback to get latest state
    setStreamStates(currentStreams => {
      console.log(`[MultiDesktopStreamGrid] Found ${currentStreams.size} streams to check for disconnection`);
      currentStreams.forEach((stream, streamId) => {
        if (stream.isConnected) {
          console.log(`[MultiDesktopStreamGrid] Disconnecting stream: ${streamId}`);
          disconnectStream(streamId);
        }
      });
      return currentStreams; // Return unchanged state since disconnectStream handles updates
    });
  }, [disconnectStream]); // Add disconnectStream dependency

  /**
   * Start all streams
   */
  const handleStartAll = useCallback(() => {
    console.log('[MultiDesktopStreamGrid] Starting all streams...');
    // Access current streamStates via setStreamStates callback to get latest state
    setStreamStates(currentStreams => {
      console.log(`[MultiDesktopStreamGrid] Found ${currentStreams.size} streams to check for starting`);
      currentStreams.forEach((stream, streamId) => {
        console.log(`[MultiDesktopStreamGrid] Stream ${streamId}: isConnected=${stream.isConnected}, isStreaming=${stream.isStreaming}`);
        if (stream.isConnected && !stream.isStreaming) {
          console.log(`[MultiDesktopStreamGrid] Starting stream: ${streamId}`);
          startStream(streamId);
        }
      });
      return currentStreams; // Return unchanged state since startStream handles updates
    });
  }, [startStream]); // Add startStream dependency

  /**
   * Stop all streams
   */
  const handleStopAll = useCallback(() => {
    console.log('[MultiDesktopStreamGrid] Stopping all streams...');
    // Access current streamStates via setStreamStates callback to get latest state
    setStreamStates(currentStreams => {
      console.log(`[MultiDesktopStreamGrid] Found ${currentStreams.size} streams to check for stopping`);
      currentStreams.forEach((stream, streamId) => {
        if (stream.isStreaming) {
          console.log(`[MultiDesktopStreamGrid] Stopping stream: ${streamId}`);
          stopStream(streamId);
        }
      });
      return currentStreams; // Return unchanged state since stopStream handles updates
    });
  }, [stopStream]); // Add stopStream dependency

  /**
   * Start individual stream
   */
  const handleStartStream = useCallback((streamId: string) => {
    console.log(`[MultiDesktopStreamGrid] Starting stream: ${streamId}`);
    startStream(streamId);
  }, []);

  /**
   * Stop individual stream
   */
  const handleStopStream = useCallback((streamId: string) => {
    console.log(`[MultiDesktopStreamGrid] Stopping stream: ${streamId}`);
    stopStream(streamId);
  }, []);

  /**
   * Toggle fullscreen for a stream
   */
  const handleToggleFullscreen = useCallback((streamId: string) => {
    setFullscreenStream(prev => prev === streamId ? null : streamId);
  }, []);

  /**
   * Select a stream
   */
  const handleSelectStream = useCallback((streamId: string) => {
    setSelectedStream(streamId);
    onStreamSelect?.(streamId);
  }, [onStreamSelect]);

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  // ============================================================================
  // STREAM CONTROLS
  // ============================================================================

  const startAllStreams = useCallback(() => {
    // Use current streamStates without dependency to prevent re-creation
    Array.from(streamStates.keys()).forEach(streamId => startStream(streamId));
  }, []); // Remove dependencies

  const stopAllStreams = useCallback(() => {
    // Use current streamStates without dependency to prevent re-creation
    Array.from(streamStates.keys()).forEach(streamId => stopStream(streamId));
  }, []); // Remove dependencies

  // ============================================================================
  // CANVAS RENDERING
  // ============================================================================

  const renderFrameToCanvasWithStream = useCallback((stream: StreamState, frameData: string) => {
    if (!stream.canvasRef.current) {
      console.warn(`Cannot render frame: canvas not available for stream ${stream.streamId}`);
      console.log('Stream canvas ref:', stream.canvasRef);
      return;
    }

    try {
      const canvas = stream.canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.warn(`Cannot get 2D context for stream: ${stream.streamId}`);
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
          console.error(`Error drawing frame for stream ${stream.streamId}:`, drawError);
        }
      };

      img.onerror = (error) => {
        console.error(`Error loading image for stream ${stream.streamId}:`, error);
      };

      img.src = `data:image/jpeg;base64,${frameData}`;

    } catch (error) {
      console.error(`Error processing frame for stream ${stream.streamId}:`, error);
    }
  }, []); // Remove streamStates dependency

  /**
   * Legacy renderFrameToCanvas function for backward compatibility
   */
  const renderFrameToCanvas = useCallback((streamId: string, frameData: string) => {
    // Use setStreamStates callback to access current state
    setStreamStates(prev => {
      const stream = prev.get(streamId);
      if (stream) {
        // Call the new function with the stream data
        renderFrameToCanvasWithStream(stream, frameData);
      } else {
        console.warn(`Cannot render frame: stream ${streamId} not found`);
        console.log('Available streams:', Array.from(prev.keys()));
      }
      return prev; // Return unchanged state
    });
  }, [renderFrameToCanvasWithStream]);

  /**
   * Handle fullscreen toggle
   */
  const handleFullscreenToggle = useCallback((streamId: string) => {
    setFullscreenStream(prev => prev === streamId ? null : streamId);
  }, []);

  // ============================================================================
  // LAYOUT CALCULATION
  // ============================================================================

  const getGridLayout = useCallback(() => {
    // Use current streamStates size without dependency to prevent re-creation
    const streamCount = streamStates.size;
    
    switch (gridLayout) {
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
  }, [gridLayout]); // Only depend on gridLayout, not streamStates.size

  // ============================================================================
  // EFFECTS
  // ============================================================================



  /**
   * Auto-connect streams when they are initialized
   * Only trigger when the size changes, not when individual stream states change
   */
  useEffect(() => {
    if (streamStates.size > 0) {
      // Auto-connect all streams after a short delay
      const timer = setTimeout(() => {
        // Connect all streams directly without depending on handleConnectAll
        streamStates.forEach((stream, streamId) => {
          if (!stream.isConnected) {
            connectStream(streamId);
          }
        });
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [streamStates.size]); // Only depend on size, not the full streamStates

  /**
   * Update global controls when stream states change
   * Use a timer-based approach to prevent excessive updates
   */
  const prevGlobalControlsRef = useRef<GlobalControls>({
    isAllConnected: false,
    isAllStreaming: false,
    connectionCount: 0,
    streamingCount: 0
  });
  
  const updateGlobalControlsRef = useRef<() => void>();
  
  updateGlobalControlsRef.current = () => {
    const streams = Array.from(streamStates.values());
    const connectedCount = streams.filter(s => s.isConnected).length;
    const streamingCount = streams.filter(s => s.isStreaming).length;
    const totalCount = streams.length;
    
    const newGlobalControls = {
      isAllConnected: connectedCount === totalCount && totalCount > 0,
      isAllStreaming: streamingCount === totalCount && totalCount > 0,
      connectionCount: connectedCount,
      streamingCount: streamingCount
    };
    
    // Only update if values have actually changed
    const prev = prevGlobalControlsRef.current;
    if (
      prev.isAllConnected !== newGlobalControls.isAllConnected ||
      prev.isAllStreaming !== newGlobalControls.isAllStreaming ||
      prev.connectionCount !== newGlobalControls.connectionCount ||
      prev.streamingCount !== newGlobalControls.streamingCount
    ) {
      console.log('[MultiDesktopStreamGrid] Updating global controls:', newGlobalControls);
      setGlobalControls(newGlobalControls);
      prevGlobalControlsRef.current = newGlobalControls;
    }
  };
  
  // Debounced update effect
  useEffect(() => {
    const timer = setTimeout(() => {
      updateGlobalControlsRef.current?.();
    }, 100); // Small delay to batch updates
    
    return () => clearTimeout(timer);
  }, [streamStates]);

  /**
   * Connect WebSocket when component mounts
   */
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
<<<<<<< HEAD
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
  }, [selectedClients, streamStates]);

  // ============================================================================
  // RENDER
  // ============================================================================

  const gridLayoutClasses = getGridLayoutClasses();

  return (
    <div className={`multi-desktop-stream-grid ${className}`}>
      {/* Global Controls */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Multi-Desktop Stream ({streamStates.size}/{maxStreams})
            <Badge variant="outline" className="ml-auto">
              {globalControls.connectionCount} Connected | {globalControls.streamingCount} Streaming
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={handleConnectAll} 
              size="sm"
              disabled={globalControls.isAllConnected}
            >
              <Wifi className="h-4 w-4 mr-1" />
              Connect All
            </Button>
            <Button 
              onClick={handleDisconnectAll} 
              variant="outline" 
              size="sm"
              disabled={globalControls.connectionCount === 0}
            >
              <WifiOff className="h-4 w-4 mr-1" />
              Disconnect All
            </Button>
            <Button 
              onClick={handleStartAll} 
              size="sm"
              disabled={!globalControls.isAllConnected || globalControls.isAllStreaming}
            >
              <Play className="h-4 w-4 mr-1" />
              Start All
            </Button>
            <Button 
              onClick={handleStopAll} 
              variant="outline" 
              size="sm"
              disabled={globalControls.streamingCount === 0}
            >
              <Square className="h-4 w-4 mr-1" />
              Stop All
            </Button>
            <Badge variant="outline">
              Layout: {gridLayout}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stream Grid */}
      <div 
        className={`grid gap-4 ${gridLayoutClasses}`}
      >
        {Array.from(streamStates.values()).map((stream) => {
          const isFullscreen = fullscreenStream === stream.streamId;
          const isSelected = selectedStream === stream.streamId;
          const metrics = performanceMetrics.get(stream.streamId);

          return (
            <Card 
              key={stream.streamId} 
              className={`relative transition-all duration-200 ${
                isSelected ? 'ring-2 ring-primary' : ''
              } ${
                isFullscreen ? 'fixed inset-4 z-50' : ''
              }`}
              onClick={() => handleSelectStream(stream.streamId)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm truncate">{stream.displayName}</CardTitle>
                  <div className="flex gap-1 items-center">
                    <Badge 
                      variant={getStatusBadgeVariant(stream.status)}
                      className="text-xs flex items-center gap-1"
                    >
                      {getStatusIcon(stream.status, stream.isConnected)}
                      {stream.status}
                    </Badge>
                    {enableControls && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            stream.isStreaming ? handleStopStream(stream.streamId) : handleStartStream(stream.streamId);
                          }}
                          disabled={!stream.isConnected}
                        >
                          {stream.isStreaming ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                        </Button>
                        {enableFullscreen && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFullscreen(stream.streamId);
                            }}
                          >
                            {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
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
                  width={800}
                  height={600}
                  className="w-full bg-muted border rounded cursor-pointer"
                  style={{ aspectRatio: '4/3' }}
                />
                <div className="mt-2 text-xs text-muted-foreground flex justify-between">
                  <span>
                    FPS: {metrics?.fps || 0} | 
                    Latency: {stream.quality.latency}ms
                  </span>
                  <span>
                    Frames: {stream.frameCount}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* No Streams Message */}
      {streamStates.size === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Monitor className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Streams Configured</h3>
            <p className="text-muted-foreground">
              Select desktop clients and monitors to display multiple streams here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MultiDesktopStreamGrid;