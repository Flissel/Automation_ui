import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Monitor, Grid, Play, Square, Settings, RefreshCw, Maximize2, Plus } from 'lucide-react';
import { MultiDesktopStreamGrid } from '@/components/trae/liveDesktop/MultiDesktopStreamGrid';
import { DualCanvasOCRDesigner } from '@/components/trae/liveDesktop/DualCanvasOCRDesigner';

interface DesktopClient {
  id: string;
  connected: boolean;
  streaming: boolean;
  timestamp: string;
}

interface DesktopScreen {
  id: string;
  name: string;
  thumbnail?: string;
  isActive: boolean;
  resolution: {
    width: number;
    height: number;
  };
  connected: boolean;
}

const MultiDesktopStreams: React.FC = () => {
  const navigate = useNavigate();
  
  const [availableClients, setAvailableClients] = useState<DesktopClient[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Real desktop clients state - fetched from WebSocket server
  const [desktopClients, setDesktopClients] = useState<any[]>([]);
  const [desktopScreens, setDesktopScreens] = useState<DesktopScreen[]>([]);
  const [latestScreenshots, setLatestScreenshots] = useState<{[clientId: string]: string}>({});
  
  // State for OCR configuration
  const [ocrConfig, setOcrConfig] = useState({
    regions: [],
    isActive: false,
    extractionInterval: 5000,
    confidenceThreshold: 0.8
  });

  // Grid view only - simplified
  const [viewMode, setViewMode] = useState<'grid'>('grid');

  const wsRef = useRef<WebSocket | null>(null);
  // WEBSOCKET CONNECTION
  // ============================================================================

  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected, skipping connection attempt');
      return;
    }

    console.log('Attempting to connect to WebSocket server at ws://localhost:8084');
    setIsLoading(true);
    
    try {
      const ws = new WebSocket('ws://localhost:8084');
      wsRef.current = ws;
      console.log('WebSocket instance created, waiting for connection...');
      
      ws.onopen = () => {
      console.log('WebSocket connected for multi-desktop streams');
      setIsConnected(true);
      setIsLoading(false);
      
      // Register as web client
      ws.send(JSON.stringify({
        type: 'handshake',
        clientInfo: {
          clientType: 'web',
          clientId: `web_client_${Date.now()}`,
          capabilities: ['multi_stream_viewing']
        },
        timestamp: new Date().toISOString()
      }));

      // Request available desktop clients
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'get_desktop_clients',
          timestamp: new Date().toISOString()
        }));
      }, 1000);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'handshake_ack':
            console.log('Handshake acknowledged:', message);
            break;
            
          case 'desktop_clients_list':
            console.log('Received desktop clients list:', message.clients);
            setAvailableClients(message.clients);
            setDesktopClients(message.clients || []);
            
            // ============================================================================
            // AUTOMATISCHES STREAMING ALLER VERFÜGBAREN DESKTOPS
            // ============================================================================
            
            // Auto-select ALL connected clients for streaming (nicht nur 4)
            const connectedClients = (message.clients || []).filter((client: any) => client.connected);
            console.log(`🖥️ Automatisches Streaming für ${connectedClients.length} verfügbare Desktop-Clients wird gestartet...`);
            
            if (connectedClients.length > 0) {
              // Alle verfügbaren Clients auswählen (nicht auf 4 begrenzen)
              const clientIds = connectedClients.map((client: any) => client.id);
              setSelectedClients(clientIds);
              
              // Auto-start streaming für ALLE verfügbaren Clients mit Multi-Monitor-Support
              setTimeout(() => {
                clientIds.forEach((clientId, index) => {
                  console.log(`🚀 Starte automatisches Streaming für Client ${index + 1}/${clientIds.length}: ${clientId}`);
                  
                  // Start streaming für alle Monitore dieses Clients
                  ['monitor_0', 'monitor_1', 'monitor_2', 'monitor_3'].forEach(monitorId => {
                    wsRef.current?.send(JSON.stringify({
                      type: 'start_desktop_stream',
                      desktopClientId: clientId,
                      monitorId: monitorId,
                      timestamp: new Date().toISOString(),
                      autoStart: true // Flag für automatischen Start
                    }));
                  });
                });
                
                console.log(`✅ Automatisches Streaming für alle ${clientIds.length} Desktop-Clients initialisiert`);
              }, 1000);
            } else {
              console.log('⚠️ Keine verbundenen Desktop-Clients für automatisches Streaming gefunden');
            }
            
            // Request screenshots von allen verbundenen Clients
            (message.clients || []).forEach((client: any) => {
              if (client.connected) {
                requestScreenshot(client.id);
              }
            });
            break;
            
          case 'desktop_connected':
            console.log('🔗 Neuer Desktop-Client verbunden:', message.desktopClientId);
            
            // Automatisch den neuen Client zur Auswahl hinzufügen
            setSelectedClients(prev => {
              if (!prev.includes(message.desktopClientId)) {
                const newSelection = [...prev, message.desktopClientId];
                
                // Automatisches Streaming für den neuen Client starten
                setTimeout(() => {
                  console.log(`🚀 Starte automatisches Streaming für neuen Client: ${message.desktopClientId}`);
                  
                  ['monitor_0', 'monitor_1', 'monitor_2', 'monitor_3'].forEach(monitorId => {
                    wsRef.current?.send(JSON.stringify({
                      type: 'start_desktop_stream',
                      desktopClientId: message.desktopClientId,
                      monitorId: monitorId,
                      timestamp: new Date().toISOString(),
                      autoStart: true
                    }));
                  });
                  
                  console.log(`✅ Automatisches Streaming für neuen Client ${message.desktopClientId} gestartet`);
                }, 500);
                
                return newSelection;
              }
              return prev;
            });
            
            // Refresh client list
            ws.send(JSON.stringify({
              type: 'get_desktop_clients',
              timestamp: new Date().toISOString()
            }));
            break;
            
          case 'desktop_disconnected':
            console.log('Desktop client disconnected:', message.desktopClientId);
            setAvailableClients(prev => 
              prev.filter(client => client.id !== message.desktopClientId)
            );
            setSelectedClients(prev => 
              prev.filter(id => id !== message.desktopClientId)
            );
            setDesktopClients(prev => prev.filter(client => client.id !== message.desktopClientId));
            setDesktopScreens(prev => prev.filter(screen => screen.id !== message.desktopClientId));
            
            // Remove screenshot from cache
            setLatestScreenshots(prev => {
              const updated = { ...prev };
              delete updated[message.desktopClientId];
              return updated;
            });
            break;
            
          case 'frame_data':
            console.log('Frame data received:', {
              clientId: message.metadata?.clientId,
              monitorId: message.monitorId,
              dimensions: `${message.width}x${message.height}`,
              isMultiMonitor: message.routingInfo?.isMultiMonitor
            });
            
            // Handle multi-monitor frame data
            if (message.metadata?.clientId && message.frameData) {
              const imageUrl = `data:image/jpeg;base64,${message.frameData}`;
              const clientId = message.metadata.clientId;
              const monitorId = message.monitorId || 'monitor_0';
              
              // Create a unique key for this monitor stream
              const streamKey = `${clientId}_${monitorId}`;
              
              // Update screenshot cache with monitor-specific key
              setLatestScreenshots(prev => ({
                ...prev,
                [streamKey]: imageUrl,
                [clientId]: imageUrl // Also update the main client key for backward compatibility
              }));
              
              // Update or create desktop screen entries for each monitor
              setDesktopScreens(prev => {
                const existingScreenIndex = prev.findIndex(screen => 
                  screen.id === streamKey
                );
                
                if (existingScreenIndex >= 0) {
                  // Update existing screen
                  return prev.map((screen, index) => 
                    index === existingScreenIndex 
                      ? { ...screen, thumbnail: imageUrl, connected: true }
                      : screen
                  );
                } else {
                  // Create new screen entry for this monitor
                  const monitorDisplayName = monitorId === 'monitor_0' ? 'Primary' : 
                                           monitorId === 'monitor_1' ? 'Secondary' : 
                                           `Monitor ${monitorId.replace('monitor_', '')}`;
                  
                  const newScreen: DesktopScreen = {
                    id: streamKey,
                    name: `${monitorDisplayName} (${clientId.substring(0, 8)})`,
                    isActive: prev.length === 0, // First monitor is active by default
                    resolution: { 
                      width: message.width || 1920, 
                      height: message.height || 1080 
                    },
                    connected: true,
                    thumbnail: imageUrl
                  };
                  return [...prev, newScreen];
                }
              });
            }
            break;
            
          case 'connection_established':
            console.log('Connection established:', message);
            break;
            
          case 'desktop_stream_status':
            console.log('Desktop stream status:', message);
            break;
            
          case 'ping':
            // Handle ping messages silently - these are keep-alive messages
            break;
            
          default:
            console.log('Unhandled message type:', message.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      setIsLoading(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsLoading(false);
    };
    
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsLoading(false);
      return;
    }
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setAvailableClients([]);
    setSelectedClients([]);
    setDesktopScreens([]); // Clear desktop screens to prevent stale data
    setLatestScreenshots({}); // Clear screenshot cache
  };

  // ============================================================================
  // CLIENT MANAGEMENT
  // ============================================================================

  const generatePlaceholderThumbnail = (index: number) => {
    const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
    const color = colors[index % colors.length];
    return `data:image/svg+xml;base64,${btoa(`<svg width="320" height="180" viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="320" height="180" fill="${color}"/><rect x="20" y="20" width="280" height="140" fill="#FFFFFF" rx="8"/><rect x="40" y="40" width="240" height="100" fill="#F9FAFB"/></svg>`)}`;
  };

  const requestScreenshot = (clientId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'request_screenshot',
        clientId: clientId,
        timestamp: new Date().toISOString()
      }));
    }
  };

  const refreshClientList = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'get_desktop_clients',
        timestamp: new Date().toISOString()
      }));
    }
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev => {
      const isCurrentlySelected = prev.includes(clientId);
      const newSelection = isCurrentlySelected 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]; // Keine Begrenzung auf 4 Clients
      
      // Auto-start streaming für neu ausgewählte Clients mit Multi-Monitor-Support
      if (!isCurrentlySelected && newSelection.includes(clientId) && wsRef.current) {
        setTimeout(() => {
          console.log(`🚀 Starte Streaming für ausgewählten Client: ${clientId}`);
          
          // Start streaming für alle Monitore dieses Clients (bis zu 4 Monitore)
          ['monitor_0', 'monitor_1', 'monitor_2', 'monitor_3'].forEach(monitorId => {
            wsRef.current?.send(JSON.stringify({
              type: 'start_desktop_stream',
              desktopClientId: clientId,
              monitorId: monitorId,
              timestamp: new Date().toISOString(),
              autoStart: true
            }));
          });
          
          console.log(`✅ Streaming für Client ${clientId} gestartet`);
        }, 500);
      }
      
      // Stop streaming wenn Client abgewählt wird
      if (isCurrentlySelected && !newSelection.includes(clientId) && wsRef.current) {
        console.log(`🛑 Stoppe Streaming für abgewählten Client: ${clientId}`);
        
        ['monitor_0', 'monitor_1', 'monitor_2', 'monitor_3'].forEach(monitorId => {
          wsRef.current?.send(JSON.stringify({
            type: 'stop_desktop_stream',
            desktopClientId: clientId,
            monitorId: monitorId,
            timestamp: new Date().toISOString()
          }));
        });
        
        console.log(`✅ Streaming für Client ${clientId} gestoppt`);
      }
      
      return newSelection;
    });
  };

  const selectAllClients = () => {
    // Alle verfügbaren verbundenen Clients auswählen (keine Begrenzung auf 4)
    const connectableClients = availableClients
      .filter(client => client.connected)
      .map(client => client.id);
    
    console.log(`🖥️ Alle verfügbaren Desktop-Clients auswählen: ${connectableClients.length} Clients`);
    setSelectedClients(connectableClients);
    
    // Auto-start streaming für ALLE ausgewählten Clients mit Multi-Monitor-Support
    if (wsRef.current && connectableClients.length > 0) {
      setTimeout(() => {
        connectableClients.forEach((clientId, index) => {
          console.log(`🚀 Starte Streaming für Client ${index + 1}/${connectableClients.length}: ${clientId}`);
          
          // Start streaming für alle Monitore jedes Clients (bis zu 4 Monitore)
          ['monitor_0', 'monitor_1', 'monitor_2', 'monitor_3'].forEach(monitorId => {
            wsRef.current?.send(JSON.stringify({
              type: 'start_desktop_stream',
              desktopClientId: clientId,
              monitorId: monitorId,
              timestamp: new Date().toISOString(),
              autoStart: true
            }));
          });
        });
        
        console.log(`✅ Streaming für alle ${connectableClients.length} Desktop-Clients gestartet`);
      }, 500);
    } else {
      console.log('⚠️ Keine verbundenen Desktop-Clients zum Streamen verfügbar');
    }
  };

  const clearSelection = () => {
    // Stop streaming für alle aktuell ausgewählten Clients
    if (wsRef.current && selectedClients.length > 0) {
      console.log(`🛑 Stoppe Streaming für alle ${selectedClients.length} ausgewählten Clients`);
      
      selectedClients.forEach((clientId, index) => {
        console.log(`🛑 Stoppe Streaming für Client ${index + 1}/${selectedClients.length}: ${clientId}`);
        
        ['monitor_0', 'monitor_1', 'monitor_2', 'monitor_3'].forEach(monitorId => {
          wsRef.current?.send(JSON.stringify({
            type: 'stop_desktop_stream',
            desktopClientId: clientId,
            monitorId: monitorId,
            timestamp: new Date().toISOString()
          }));
        });
      });
      
      console.log('✅ Streaming für alle Clients gestoppt');
    }
    
    setSelectedClients([]);
  };

  // ============================================================================
  // DESKTOP SCREEN MANAGEMENT
  // ============================================================================

  const switchToDesktop = (desktopId: string) => {
    setDesktopScreens(prev => 
      prev.map(desktop => ({
        ...desktop,
        isActive: desktop.id === desktopId
      }))
    );
    console.log(`Switched to desktop: ${desktopId}`);
  };

  const createNewDesktop = () => {
    const newDesktopId = `desktop_${desktopScreens.length + 1}`;
    const newDesktop: DesktopScreen = {
      id: newDesktopId,
      name: `Desktop ${desktopScreens.length + 1}`,
      isActive: false,
      resolution: { width: 1920, height: 1080 },
      connected: true,
      thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjNkI3Mjg0Ii8+CjxyZWN0IHg9IjIwIiB5PSIyMCIgd2lkdGg9IjI4MCIgaGVpZ2h0PSIxNDAiIGZpbGw9IiNGRkZGRkYiIHJ4PSI4Ii8+CjxyZWN0IHg9IjQwIiB5PSI0MCIgd2lkdGg9IjI0MCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNGOUZBRkIiLz4KPHN2Zz4K'
    };
    
    setDesktopScreens(prev => [...prev, newDesktop]);
    console.log(`Created new desktop: ${newDesktopId}`);
  };

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  useEffect(() => {
    // Auto-connect to WebSocket server when component mounts
    connectWebSocket();
    
    return () => {
      disconnectWebSocket();
    };
  }, []);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderDesktopScreensGrid = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Grid className="w-6 h-6" />
          <span>Available Desktop Screens</span>
        </CardTitle>
        <CardDescription>
          Select a desktop screen to view or create a new one
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* Existing Desktop Screens */}
          {desktopScreens.map((desktop) => (
            <div
              key={desktop.id}
              className={`relative group cursor-pointer transition-all duration-200 hover:scale-105 ${
                desktop.isActive ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => switchToDesktop(desktop.id)}
            >
              <Card className={`overflow-hidden ${desktop.isActive ? 'bg-primary/5' : 'hover:bg-muted/50'}`}>
                <CardContent className="p-0">
                  {/* Desktop Thumbnail */}
                  <div className="relative aspect-video bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden">
                    {desktop.thumbnail ? (
                      <img 
                        src={desktop.thumbnail} 
                        alt={desktop.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Monitor className="w-12 h-12 text-white/70" />
                      </div>
                    )}
                    
                    {/* Active Indicator */}
                    {desktop.isActive && (
                      <div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                    
                    {/* Connection Status */}
                    <div className={`absolute bottom-2 left-2 w-2 h-2 rounded-full ${
                      desktop.connected ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                  </div>
                  
                  {/* Desktop Info */}
                  <div className="p-3">
                    <h3 className="font-medium text-sm text-center">{desktop.name}</h3>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      {desktop.resolution.width} × {desktop.resolution.height}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
          
          {/* New Desktop Button */}
          <div
            className="relative group cursor-pointer transition-all duration-200 hover:scale-105"
            onClick={createNewDesktop}
          >
            <Card className="overflow-hidden hover:bg-muted/50 border-dashed border-2">
              <CardContent className="p-0">
                {/* New Desktop Placeholder */}
                <div className="relative aspect-video bg-muted/30 flex items-center justify-center">
                  <div className="text-center">
                    <Plus className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Neuer Desktop</p>
                  </div>
                </div>
                
                {/* New Desktop Info */}
                <div className="p-3">
                  <h3 className="font-medium text-sm text-center text-muted-foreground">
                    Neuen Desktop erstellen
                  </h3>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    Klicken zum Hinzufügen
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderConnectionStatus = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Monitor className="w-6 h-6" />
          <span>Multi-Desktop Stream Connection</span>
        </CardTitle>
        <CardDescription>
          Manage connections to multiple desktop clients for simultaneous streaming
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">
              {isConnected ? 'Connected to WebSocket Server' : 'Disconnected'}
            </span>
          </div>
          <div className="flex space-x-2">
            {!isConnected ? (
              <Button onClick={connectWebSocket} disabled={isLoading}>
                <Play className="w-4 h-4 mr-2" />
                {isLoading ? 'Connecting...' : 'Connect'}
              </Button>
            ) : (
              <Button onClick={disconnectWebSocket} variant="outline">
                <Square className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderClientSelector = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Grid className="w-6 h-6" />
            <span>Available Desktop Clients</span>
          </div>
          <Button onClick={refreshClientList} variant="outline" size="sm" disabled={!isConnected}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>
          Select up to 4 desktop clients for simultaneous streaming (Selected: {selectedClients.length}/4)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {availableClients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Monitor className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No desktop clients available</p>
            <p className="text-sm">Start desktop clients to see them here</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex space-x-2 mb-4">
              <Button onClick={selectAllClients} variant="outline" size="sm">
                Select All (Max 4)
              </Button>
              <Button onClick={clearSelection} variant="outline" size="sm">
                Clear Selection
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {availableClients.map((client) => (
                <Card 
                  key={client.id}
                  className={`cursor-pointer transition-all ${
                    selectedClients.includes(client.id) 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:bg-muted/50'
                  } ${!client.connected ? 'opacity-50' : ''}`}
                  onClick={() => client.connected && toggleClientSelection(client.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{client.id}</span>
                      <div className={`w-2 h-2 rounded-full ${
                        client.connected ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {client.connected ? 'Connected' : 'Disconnected'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(client.timestamp).toLocaleTimeString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Memoize selectedClientsWithMonitors to prevent infinite re-renders
  // Note: Only depends on selectedClients to prevent unnecessary re-renders
  // when availableClients updates frequently via WebSocket events
  const selectedClientsWithMonitors = useMemo(() => {
    return selectedClients.map(clientId => {
      return {
        clientId,
        clientName: `Desktop ${clientId.substring(0, 8)}`,
        monitors: [
          { 
            monitorId: 'monitor_0', 
            name: 'Primary Display',
            resolution: { width: 1920, height: 1080 }
          },
          { 
            monitorId: 'monitor_1', 
            name: 'Secondary Display',
            resolution: { width: 1920, height: 1080 }
          }
        ]
      };
    });
  }, [selectedClients]); // Removed availableClients dependency to prevent infinite re-renders

  const renderStreamGrid = () => {
    if (!isConnected || selectedClients.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Grid className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ready for Multi-Stream</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {!isConnected 
                ? 'Connect to the WebSocket server and select desktop clients to start streaming.'
                : 'Select desktop clients above to start multi-stream viewing.'
              }
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <MultiDesktopStreamGrid 
        selectedClients={selectedClientsWithMonitors}
        serverUrl="ws://localhost:8084"
        maxStreams={8} // Support up to 8 streams (4 clients × 2 monitors each)
        gridLayout="auto"
        enableFullscreen={true}
        enableControls={true}
        latestScreenshots={latestScreenshots}
        websocketInstance={wsRef.current}
        onClientDisconnected={(clientId) => {
          console.log(`Client disconnected: ${clientId}`);
          setSelectedClients(prev => prev.filter(id => id !== clientId));
        }}
        onStreamStatusChange={(streamId, status) => {
          console.log(`Stream ${streamId} status changed:`, status);
        }}
        onFrameReceived={(streamId, frameData) => {
          console.log(`Frame received for stream ${streamId}`);
        }}
      />
    );
  };

  const renderDualCanvasOCRDesigner = () => {
    // Get primary and secondary monitor streams from selected clients
    const primaryStreamUrl = selectedClients.length > 0 
      ? latestScreenshots[`${selectedClients[0]}_monitor_0`] || latestScreenshots[selectedClients[0]]
      : null;
    
    const secondaryStreamUrl = selectedClients.length > 0 
      ? latestScreenshots[`${selectedClients[0]}_monitor_1`] || 
        (selectedClients.length > 1 ? latestScreenshots[`${selectedClients[1]}_monitor_0`] || latestScreenshots[selectedClients[1]] : null)
      : null;

    return (
      <DualCanvasOCRDesigner
        ocrConfig={ocrConfig}
        setOcrConfig={setOcrConfig}
        primaryStreamUrl={primaryStreamUrl}
        secondaryStreamUrl={secondaryStreamUrl}
        isConnected={isConnected}
        selectedClients={selectedClients}
        onConnect={connectWebSocket}
        onDisconnect={disconnectWebSocket}
      />
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Multi-Desktop Screens
            </h1>
            <p className="text-muted-foreground">
              Manage and view multiple desktop screens
            </p>
          </div>
          
          {/* Grid View Only */}
          <div className="flex items-center space-x-2">
            <div className="flex bg-muted rounded-lg p-1">
              <Button
                variant="default"
                size="sm"
                className="flex items-center space-x-2"
              >
                <Grid className="w-4 h-4" />
                <span>Grid View</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Grid View Content */}
        {/* Desktop Screens Grid */}
        {renderDesktopScreensGrid()}

        {/* Connection Status */}
        {renderConnectionStatus()}

        {/* Client Selector */}
        {renderClientSelector()}

        {/* Stream Grid */}
        {renderStreamGrid()}

        {/* Dual Canvas OCR Designer */}
        {renderDualCanvasOCRDesigner()}
      </div>
    </div>
  );
};

export default MultiDesktopStreams;