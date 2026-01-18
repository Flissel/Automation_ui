import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Wifi, WifiOff, RefreshCw, Scan } from 'lucide-react';
import { MoireCanvas, type CanvasData, type DetectionBox } from '@/components/trae/moire';
import { WEBSOCKET_CONFIG, createMultiDesktopClient, sendWebSocketMessage } from '@/config/websocketConfig';

/**
 * MoireAnalysis Page
 * 
 * Live desktop stream analysis using the MoireCanvas component.
 * Connects to WebSocket for frame data and displays detection boxes.
 */
const MoireAnalysis: React.FC = () => {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Stream state
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [availableClients, setAvailableClients] = useState<any[]>([]);
  const [latestFrame, setLatestFrame] = useState<string | null>(null);
  
  // Moiré analysis state
  const [moireEnabled, setMoireEnabled] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [detectionData, setDetectionData] = useState<CanvasData>({ boxes: [], regions: [] });
  const [analysisStatus, setAnalysisStatus] = useState<string>('Waiting for stream...');
  
  const wsRef = useRef<WebSocket | null>(null);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('✅ WebSocket already connected');
      return;
    }

    console.log('🔗 Connecting to WebSocket for Moiré analysis...');
    setIsLoading(true);
    setConnectionError(null);

    try {
      const { clientId, websocket, handshakeMessage } = createMultiDesktopClient('moire_analysis');
      wsRef.current = websocket;

      websocket.onopen = () => {
        console.log('✅ Moiré Analysis WebSocket connected');
        setIsConnected(true);
        setIsLoading(false);
        setConnectionError(null);

        // Send handshake
        sendWebSocketMessage(websocket, handshakeMessage);

        // Request desktop clients
        setTimeout(() => {
          if (websocket.readyState === WebSocket.OPEN) {
            sendWebSocketMessage(websocket, {
              type: 'get_desktop_clients',
              timestamp: new Date().toISOString()
            });
          }
        }, 500);
      };

      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      websocket.onclose = (event) => {
        console.log('🔌 Moiré Analysis WebSocket closed:', event.code);
        setIsConnected(false);
        setIsLoading(false);
        
        if (event.code !== 1000) {
          setConnectionError(`Connection closed: ${event.reason || 'Unknown reason'}`);
        }
      };

      websocket.onerror = (error) => {
        console.error('❌ Moiré Analysis WebSocket error:', error);
        setIsLoading(false);
        setConnectionError('WebSocket connection error');
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setIsLoading(false);
      setConnectionError('Failed to create WebSocket connection');
    }
  }, []);

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setSelectedClient(null);
    setLatestFrame(null);
    setDetectionData({ boxes: [], regions: [] });
  }, []);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'desktop_clients_list': {
        const clients = (message.clients || []).map((client: any) => ({
          ...client,
          id: client.clientId || client.id
        }));
        setAvailableClients(clients);
        
        // Auto-select first connected client
        const connectedClients = clients.filter((c: any) => c.connected);
        if (connectedClients.length > 0 && !selectedClient) {
          selectClient(connectedClients[0].id);
        }
        break;
      }

      case 'frame_data':
      case 'dual_screen_frame': {
        // Extract frame data
        const frameData = message.frameData || message.image_data;
        const format = message.metadata?.format || message.format || 'jpeg';
        
        if (frameData) {
          const imageUrl = `data:image/${format};base64,${frameData}`;
          setLatestFrame(imageUrl);
          
          // If auto-refresh is on, trigger analysis
          if (autoRefresh) {
            performMoireAnalysis(frameData);
          }
          
          setAnalysisStatus(`Frame received at ${new Date().toLocaleTimeString()}`);
        }
        break;
      }

      case 'moire_detection_result': {
        // Handle detection results from analysis
        if (message.boxes) {
          setDetectionData({
            boxes: message.boxes,
            regions: message.regions || [],
            stats: message.stats
          });
          setAnalysisStatus(`Detected ${message.boxes.length} components`);
        }
        break;
      }

      case 'desktop_connected':
        setAvailableClients(prev => {
          const exists = prev.some(c => c.id === message.desktopClientId);
          if (!exists) {
            return [...prev, { id: message.desktopClientId, connected: true }];
          }
          return prev;
        });
        break;

      case 'desktop_disconnected':
        setAvailableClients(prev => prev.filter(c => c.id !== message.desktopClientId));
        if (selectedClient === message.desktopClientId) {
          setSelectedClient(null);
          setLatestFrame(null);
        }
        break;

      default:
        console.log('Unhandled Moiré message type:', message.type);
    }
  }, [selectedClient, autoRefresh]);

  // Select a client and start streaming
  const selectClient = useCallback((clientId: string) => {
    setSelectedClient(clientId);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Start streaming from the selected client
      sendWebSocketMessage(wsRef.current, {
        type: 'start_stream',
        desktopClientId: clientId,
        monitorId: 'monitor_0',
        timestamp: new Date().toISOString()
      });
      
      setAnalysisStatus(`Streaming from ${clientId.substring(0, 8)}...`);
    }
  }, []);

  // Perform Moiré pattern analysis on current frame
  const performMoireAnalysis = useCallback((frameData?: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setAnalysisStatus('Not connected - cannot analyze');
      return;
    }

    setAnalysisStatus('Analyzing frame...');
    
    // Send analysis request to backend
    sendWebSocketMessage(wsRef.current, {
      type: 'analyze_frame',
      desktopClientId: selectedClient,
      frameData: frameData,
      moireEnabled: moireEnabled,
      timestamp: new Date().toISOString()
    });
  }, [selectedClient, moireEnabled]);

  // Handle refresh request from MoireCanvas
  const handleRefreshRequest = useCallback(() => {
    performMoireAnalysis();
  }, [performMoireAnalysis]);

  // Handle box click
  const handleBoxClick = useCallback((box: DetectionBox) => {
    console.log('Box clicked:', box);
    setAnalysisStatus(`Selected: Box #${box.id} at (${box.x}, ${box.y})`);
  }, []);

  // Handle moiré toggle
  const handleMoireToggle = useCallback((enabled: boolean) => {
    setMoireEnabled(enabled);
    setAnalysisStatus(`Moiré detection: ${enabled ? 'ON' : 'OFF'}`);
  }, []);

  // Connect on mount
  useEffect(() => {
    connectWebSocket();
    return () => {
      disconnectWebSocket();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Eye className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Moiré Analysis</h1>
          </div>
          <p className="text-muted-foreground">
            Live desktop stream component detection and analysis
          </p>
        </div>

        {/* Connection Status & Controls */}
        <Card className="mb-4">
          <CardContent className="py-4">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Wifi className="w-5 h-5 text-green-500" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-500" />
                )}
                <span className={isConnected ? 'text-green-500' : 'text-red-500'}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {/* Connection Buttons */}
              {!isConnected ? (
                <Button onClick={connectWebSocket} disabled={isLoading}>
                  {isLoading ? 'Connecting...' : 'Connect'}
                </Button>
              ) : (
                <Button variant="outline" onClick={disconnectWebSocket}>
                  Disconnect
                </Button>
              )}

              {/* Client Selector */}
              {isConnected && availableClients.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Desktop:</span>
                  <select
                    value={selectedClient || ''}
                    onChange={(e) => selectClient(e.target.value)}
                    className="px-3 py-1 border rounded bg-background text-foreground"
                  >
                    <option value="">Select client...</option>
                    {availableClients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name || client.id.substring(0, 12)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Manual Analysis Button */}
              <Button
                variant="secondary"
                onClick={() => performMoireAnalysis()}
                disabled={!isConnected || !selectedClient}
              >
                <Scan className="w-4 h-4 mr-2" />
                Analyze Frame
              </Button>

              {/* Status */}
              <span className="ml-auto text-sm text-muted-foreground">
                {analysisStatus}
              </span>
            </div>

            {connectionError && (
              <p className="text-red-500 text-sm mt-2">{connectionError}</p>
            )}
          </CardContent>
        </Card>

        {/* Main Canvas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Detection Canvas
              {detectionData.boxes.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({detectionData.boxes.length} components detected)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <MoireCanvas
              data={detectionData}
              backgroundImage={latestFrame || undefined}
              autoRefresh={autoRefresh}
              autoRefreshInterval={5000}
              onRefreshRequest={handleRefreshRequest}
              onBoxClick={handleBoxClick}
              onMoireToggle={handleMoireToggle}
              moireEnabled={moireEnabled}
              isConnected={isConnected}
              height="calc(100vh - 320px)"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default memo(MoireAnalysis);