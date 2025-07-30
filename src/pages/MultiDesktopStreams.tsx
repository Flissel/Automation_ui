import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Monitor, Grid, Play, Square, Settings, RefreshCw, Maximize2 } from 'lucide-react';
import { MultiDesktopStreamGrid } from '@/components/trae/liveDesktop/MultiDesktopStreamGrid';

interface DesktopClient {
  id: string;
  connected: boolean;
  streaming: boolean;
  timestamp: string;
}

const MultiDesktopStreams: React.FC = () => {
  const navigate = useNavigate();
  
  const [availableClients, setAvailableClients] = useState<DesktopClient[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  // WEBSOCKET CONNECTION
  // ============================================================================

  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setIsLoading(true);
    const ws = new WebSocket('ws://localhost:8084');
    wsRef.current = ws;

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
            break;
            
          case 'desktop_connected':
            console.log('Desktop client connected:', message.desktopClientId);
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
            break;
            
          case 'frame_data':
            // Frame data is handled directly by MultiDesktopStreamGrid component
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
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setAvailableClients([]);
    setSelectedClients([]);
  };

  // ============================================================================
  // CLIENT MANAGEMENT
  // ============================================================================

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
      if (prev.includes(clientId)) {
        return prev.filter(id => id !== clientId);
      } else if (prev.length < 4) {
        return [...prev, clientId];
      }
      return prev;
    });
  };

  const selectAllClients = () => {
    const connectableClients = availableClients
      .filter(client => client.connected)
      .slice(0, 4)
      .map(client => client.id);
    setSelectedClients(connectableClients);
  };

  const clearSelection = () => {
    setSelectedClients([]);
  };

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  useEffect(() => {
    return () => {
      disconnectWebSocket();
    };
  }, []);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

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
        websocket={wsRef.current}
        selectedClients={selectedClients}
        onClientDisconnected={(clientId) => {
          setSelectedClients(prev => prev.filter(id => id !== clientId));
        }}
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
        <div className="mb-8 flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Multi-Desktop Streams
            </h1>
            <p className="text-muted-foreground">
              View up to 4 desktop screens simultaneously
            </p>
          </div>
        </div>

        {/* Connection Status */}
        {renderConnectionStatus()}

        {/* Client Selector */}
        {renderClientSelector()}

        {/* Stream Grid */}
        {renderStreamGrid()}
      </div>
    </div>
  );
};

export default MultiDesktopStreams;