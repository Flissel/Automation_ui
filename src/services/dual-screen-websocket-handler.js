/**
 * Dual-Screen WebSocket Handler
 * Verwaltet WebSocket-Verbindungen für Dual-Screen-Capture und -Streaming
 * 
 * Funktionen:
 * - Dual-Screen-Client-Erkennung
 * - Asynchrone Frame-Verarbeitung
 * - Screen-Splitting und -Routing
 * - Automatische Reconnection
 * - Performance-Monitoring
 */

class DualScreenWebSocketHandler {
  constructor() {
    this.websocket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.heartbeatInterval = null;
    this.frameBuffer = new Map();
    this.screenClients = new Map();
    this.streamingConfig = {
      fps: 15,
      quality: 85,
      scale: 1.0,
      format: 'jpeg',
      dualScreen: true
    };
    
    // Event-Callbacks
    this.onConnectionChange = null;
    this.onFrameReceived = null;
    this.onError = null;
    this.onClientUpdate = null;
    
    // Performance-Metriken
    this.metrics = {
      framesReceived: { screen1: 0, screen2: 0 },
      bytesReceived: 0,
      lastFrameTime: { screen1: 0, screen2: 0 },
      averageFps: { screen1: 0, screen2: 0 },
      connectionUptime: 0,
      reconnections: 0
    };
    
    console.log('DualScreenWebSocketHandler initialisiert');
  }
  
  /**
   * Verbindung zum WebSocket-Server herstellen
   */
  async connect(url = 'ws://localhost:8080') {
    try {
      console.log(`Verbinde zu WebSocket-Server: ${url}`);
      
      this.websocket = new WebSocket(url);
      
      // Event-Listener einrichten
      this.websocket.onopen = this.handleOpen.bind(this);
      this.websocket.onmessage = this.handleMessage.bind(this);
      this.websocket.onclose = this.handleClose.bind(this);
      this.websocket.onerror = this.handleError.bind(this);
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket-Verbindung Timeout'));
        }, 10000);
        
        this.websocket.onopen = (event) => {
          clearTimeout(timeout);
          this.handleOpen(event);
          resolve(true);
        };
        
        this.websocket.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });
      
    } catch (error) {
      console.error('Fehler beim Verbinden zum WebSocket:', error);
      throw error;
    }
  }
  
  /**
   * WebSocket-Verbindung schließen
   */
  disconnect() {
    console.log('Trenne WebSocket-Verbindung...');
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    this.isConnected = false;
    this.reconnectAttempts = 0;
    
    if (this.onConnectionChange) {
      this.onConnectionChange(false);
    }
  }
  
  /**
   * WebSocket-Verbindung öffnen
   */
  handleOpen(event) {
    console.log('WebSocket-Verbindung hergestellt');
    
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.metrics.connectionUptime = Date.now();
    
    // Heartbeat starten
    this.startHeartbeat();
    
    // Handshake senden
    this.sendHandshake();
    
    // Desktop-Clients abfragen
    setTimeout(() => {
      this.requestDesktopClients();
    }, 1000);
    
    if (this.onConnectionChange) {
      this.onConnectionChange(true);
    }
  }
  
  /**
   * WebSocket-Nachrichten verarbeiten
   */
  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'handshake_response':
          this.handleHandshakeResponse(message);
          break;
          
        case 'desktop_clients':
          this.handleDesktopClients(message);
          break;
          
        case 'frame_data':
          this.handleFrameData(message);
          break;
          
        case 'client_connected':
        case 'client_disconnected':
          this.handleClientUpdate(message);
          break;
          
        case 'error':
          this.handleServerError(message);
          break;
          
        case 'pong':
          // Heartbeat-Antwort
          break;

        case 'connection_established':
          console.log('Verbindung hergestellt:', message);
          // Handle connection establishment if needed
          break;

        case 'handshake_ack':
          console.log('Handshake bestätigt:', message);
          // Handle handshake acknowledgment if needed
          break;

        case 'ping':
          // Respond to ping with pong if needed
          // console.log('Ping erhalten');
          break;

        case 'desktop_stream_status':
          console.log('Desktop-Stream-Status:', message);
          // Handle desktop stream status updates
          break;
          
        default:
          console.log('Unbekannter Nachrichtentyp:', message.type);
      }
      
    } catch (error) {
      console.error('Fehler beim Verarbeiten der WebSocket-Nachricht:', error);
    }
  }
  
  /**
   * WebSocket-Verbindung geschlossen
   */
  handleClose(event) {
    console.log('WebSocket-Verbindung geschlossen:', event.code, event.reason);
    
    this.isConnected = false;
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.onConnectionChange) {
      this.onConnectionChange(false);
    }
    
    // Automatische Wiederverbindung
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }
  
  /**
   * WebSocket-Fehler behandeln
   */
  handleError(error) {
    console.error('WebSocket-Fehler:', error);
    
    if (this.onError) {
      this.onError(error);
    }
  }
  
  /**
   * Handshake senden
   */
  sendHandshake() {
    const handshake = {
      type: 'handshake',
      clientType: 'dual_screen_viewer',
      version: '1.0.0',
      capabilities: [
        'dual_screen_capture',
        'async_frame_processing',
        'screen_splitting',
        'high_fps_streaming'
      ],
      timestamp: new Date().toISOString()
    };
    
    this.sendMessage(handshake);
    console.log('Handshake gesendet');
  }
  
  /**
   * Handshake-Antwort verarbeiten
   */
  handleHandshakeResponse(message) {
    console.log('Handshake-Antwort erhalten:', message);
    
    if (message.status === 'success') {
      console.log('Handshake erfolgreich, Server-Version:', message.serverVersion);
    } else {
      console.error('Handshake fehlgeschlagen:', message.error);
    }
  }
  
  /**
   * Desktop-Clients abfragen
   */
  requestDesktopClients() {
    const request = {
      type: 'get_desktop_clients',
      filter: {
        supportsDualScreen: true,
        isActive: true
      },
      timestamp: new Date().toISOString()
    };
    
    this.sendMessage(request);
    console.log('Desktop-Clients angefragt');
  }
  
  /**
   * Desktop-Clients verarbeiten
   */
  handleDesktopClients(message) {
    console.log('Desktop-Clients erhalten:', message.clients);
    
    // Clients nach Dual-Screen-Unterstützung filtern
    const dualScreenClients = message.clients.filter(client => 
      client.capabilities && client.capabilities.includes('dual_screen_capture')
    );
    
    // Screen-Clients-Map aktualisieren
    this.screenClients.clear();
    dualScreenClients.forEach(client => {
      this.screenClients.set(client.id, client);
    });
    
    if (this.onClientUpdate) {
      this.onClientUpdate(dualScreenClients);
    }
    
    console.log(`${dualScreenClients.length} Dual-Screen-Clients gefunden`);
  }
  
  /**
   * Frame-Daten verarbeiten
   */
  handleFrameData(message) {
    try {
      // Prüfe ob es sich um Dual-Screen-Daten handelt
      if (!message.routingInfo || !message.routingInfo.isDualScreen) {
        return;
      }
      
      const screenIndex = message.routingInfo.screenIndex;
      const screenKey = screenIndex === 0 ? 'screen1' : 'screen2';
      
      // Metriken aktualisieren
      this.updateFrameMetrics(screenKey, message);
      
      // Frame-Buffer aktualisieren
      this.frameBuffer.set(screenKey, {
        frameData: message.frameData,
        metadata: message.metadata,
        width: message.width,
        height: message.height,
        timestamp: Date.now(),
        screenIndex: screenIndex
      });
      
      // Callback aufrufen
      if (this.onFrameReceived) {
        this.onFrameReceived(screenKey, {
          imageData: `data:image/jpeg;base64,${message.frameData}`,
          timestamp: message.metadata.timestamp,
          width: message.width,
          height: message.height,
          clientId: message.metadata.clientId,
          screenIndex: screenIndex
        });
      }
      
      console.log(`Frame für ${screenKey} verarbeitet:`, {
        size: message.frameData.length,
        dimensions: `${message.width}x${message.height}`,
        clientId: message.metadata.clientId
      });
      
    } catch (error) {
      console.error('Fehler beim Verarbeiten der Frame-Daten:', error);
    }
  }
  
  /**
   * Client-Updates verarbeiten
   */
  handleClientUpdate(message) {
    console.log('Client-Update:', message);
    
    if (message.type === 'client_connected') {
      if (message.client.capabilities && message.client.capabilities.includes('dual_screen_capture')) {
        this.screenClients.set(message.client.id, message.client);
      }
    } else if (message.type === 'client_disconnected') {
      this.screenClients.delete(message.clientId);
    }
    
    if (this.onClientUpdate) {
      this.onClientUpdate(Array.from(this.screenClients.values()));
    }
  }
  
  /**
   * Server-Fehler verarbeiten
   */
  handleServerError(message) {
    console.error('Server-Fehler:', message.error);
    
    if (this.onError) {
      this.onError(new Error(message.error));
    }
  }
  
  /**
   * Dual-Screen-Streaming starten
   */
  startDualScreenStream(clientId = null, config = {}) {
    // Verwende ersten verfügbaren Dual-Screen-Client falls keiner angegeben
    if (!clientId && this.screenClients.size > 0) {
      clientId = Array.from(this.screenClients.keys())[0];
    }
    
    if (!clientId) {
      throw new Error('Kein Dual-Screen-Client verfügbar');
    }
    
    const streamConfig = {
      ...this.streamingConfig,
      ...config
    };
    
    const request = {
      type: 'start_desktop_stream',
      desktopClientId: clientId,
      config: streamConfig,
      dualScreen: true,
      timestamp: new Date().toISOString()
    };
    
    this.sendMessage(request);
    console.log('Dual-Screen-Streaming gestartet:', { clientId, config: streamConfig });
    
    return clientId;
  }
  
  /**
   * Dual-Screen-Streaming stoppen
   */
  stopDualScreenStream(clientId) {
    const request = {
      type: 'stop_desktop_stream',
      desktopClientId: clientId,
      timestamp: new Date().toISOString()
    };
    
    this.sendMessage(request);
    console.log('Dual-Screen-Streaming gestoppt:', clientId);
  }
  
  /**
   * Streaming-Konfiguration aktualisieren
   */
  updateStreamConfig(config) {
    this.streamingConfig = {
      ...this.streamingConfig,
      ...config
    };
    
    console.log('Streaming-Konfiguration aktualisiert:', this.streamingConfig);
  }
  
  /**
   * Frame-Metriken aktualisieren
   */
  updateFrameMetrics(screenKey, message) {
    const now = Date.now();
    const lastTime = this.metrics.lastFrameTime[screenKey];
    
    // Frame-Counter erhöhen
    this.metrics.framesReceived[screenKey]++;
    
    // Bytes-Counter erhöhen
    this.metrics.bytesReceived += message.frameData.length;
    
    // FPS berechnen
    if (lastTime > 0) {
      const timeDiff = now - lastTime;
      const fps = 1000 / timeDiff;
      
      // Gleitender Durchschnitt für FPS
      const currentAvg = this.metrics.averageFps[screenKey];
      this.metrics.averageFps[screenKey] = currentAvg === 0 ? fps : (currentAvg * 0.9 + fps * 0.1);
    }
    
    this.metrics.lastFrameTime[screenKey] = now;
  }
  
  /**
   * Heartbeat starten
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.sendMessage({
          type: 'ping',
          timestamp: new Date().toISOString()
        });
      }
    }, 30000); // Alle 30 Sekunden
  }
  
  /**
   * Wiederverbindung planen
   */
  scheduleReconnect() {
    this.reconnectAttempts++;
    this.metrics.reconnections++;
    
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Wiederverbindung in ${delay}ms (Versuch ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Wiederverbindung fehlgeschlagen:', error);
      });
    }, delay);
  }
  
  /**
   * Nachricht senden
   */
  sendMessage(message) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket nicht verbunden, Nachricht verworfen:', message.type);
    }
  }
  
  /**
   * Aktuellen Frame für Screen abrufen
   */
  getCurrentFrame(screenKey) {
    return this.frameBuffer.get(screenKey) || null;
  }
  
  /**
   * Verfügbare Screen-Clients abrufen
   */
  getAvailableClients() {
    return Array.from(this.screenClients.values());
  }
  
  /**
   * Performance-Metriken abrufen
   */
  getMetrics() {
    const uptime = this.metrics.connectionUptime > 0 ? 
      Date.now() - this.metrics.connectionUptime : 0;
    
    return {
      ...this.metrics,
      connectionUptime: uptime,
      isConnected: this.isConnected,
      availableClients: this.screenClients.size,
      bufferSize: this.frameBuffer.size
    };
  }
  
  /**
   * Event-Listener setzen
   */
  setEventListeners(listeners) {
    this.onConnectionChange = listeners.onConnectionChange || null;
    this.onFrameReceived = listeners.onFrameReceived || null;
    this.onError = listeners.onError || null;
    this.onClientUpdate = listeners.onClientUpdate || null;
  }
  
  /**
   * Handler zurücksetzen
   */
  reset() {
    this.disconnect();
    this.frameBuffer.clear();
    this.screenClients.clear();
    this.metrics = {
      framesReceived: { screen1: 0, screen2: 0 },
      bytesReceived: 0,
      lastFrameTime: { screen1: 0, screen2: 0 },
      averageFps: { screen1: 0, screen2: 0 },
      connectionUptime: 0,
      reconnections: 0
    };
    
    console.log('DualScreenWebSocketHandler zurückgesetzt');
  }
}

// Export für Node.js und Browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DualScreenWebSocketHandler;
} else if (typeof window !== 'undefined') {
  window.DualScreenWebSocketHandler = DualScreenWebSocketHandler;
}

console.log('DualScreenWebSocketHandler-Modul geladen');