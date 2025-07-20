/**
 * TRAE Visual Workflow System - WebSocket Service
 * 
 * Real-time communication service for live updates
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import { WebSocketMessage, WebSocketConfig, UseWebSocketReturn } from '../types';

// ============================================================================
// WEBSOCKET EVENT TYPES
// ============================================================================

export enum WebSocketEventType {
  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
  RECONNECT = 'reconnect',

  // Workflow execution events
  WORKFLOW_STARTED = 'workflow_started',
  WORKFLOW_COMPLETED = 'workflow_completed',
  WORKFLOW_FAILED = 'workflow_failed',
  NODE_STARTED = 'node_started',
  NODE_COMPLETED = 'node_completed',
  NODE_FAILED = 'node_failed',

  // Desktop streaming events
  DESKTOP_FRAME = 'desktop_frame',
  DESKTOP_CLICK = 'desktop_click',
  DESKTOP_STREAM_STARTED = 'desktop_stream_started',
  DESKTOP_STREAM_STOPPED = 'desktop_stream_stopped',

  // File system events
  FILE_CREATED = 'file_created',
  FILE_MODIFIED = 'file_modified',
  FILE_DELETED = 'file_deleted',
  FILE_MOVED = 'file_moved',

  // System events
  SYSTEM_STATUS = 'system_status',
  SERVICE_STATUS = 'service_status',
}

// ============================================================================
// WEBSOCKET CLIENT CLASS
// ============================================================================

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private shouldReconnect = true;

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnect: true,
      reconnect_interval: 5000,
      max_reconnect_attempts: 10,
      ping_interval: 30000,
      ...config,
    };
  }

  // Connect to WebSocket
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;
      this.ws = new WebSocket(this.config.url);

      const onOpen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.startPing();
        this.emit(WebSocketEventType.CONNECT, { timestamp: new Date().toISOString() });
        resolve();
      };

      const onError = (error: Event) => {
        this.isConnecting = false;
        this.emit(WebSocketEventType.ERROR, { error: error.toString() });
        reject(new Error('WebSocket connection failed'));
      };

      const onClose = (event: CloseEvent) => {
        this.isConnecting = false;
        this.stopPing();
        this.emit(WebSocketEventType.DISCONNECT, {
          code: event.code,
          reason: event.reason,
          timestamp: new Date().toISOString(),
        });

        if (this.shouldReconnect && this.config.reconnect) {
          this.scheduleReconnect();
        }
      };

      const onMessage = (event: MessageEvent) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.addEventListener('open', onOpen);
      this.ws.addEventListener('error', onError);
      this.ws.addEventListener('close', onClose);
      this.ws.addEventListener('message', onMessage);
    });
  }

  // Disconnect from WebSocket
  disconnect(): void {
    this.shouldReconnect = false;
    this.stopPing();
    this.clearReconnectTimer();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  // Send message
  send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const messageWithTimestamp = {
        ...message,
        timestamp: message.timestamp || new Date().toISOString(),
        id: message.id || this.generateMessageId(),
      };
      this.ws.send(JSON.stringify(messageWithTimestamp));
    } else {
      throw new Error('WebSocket is not connected');
    }
  }

  // Subscribe to events
  on(eventType: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(eventType);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  // Emit event to listeners
  private emit(eventType: string, data: any): void {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event callback for ${eventType}:`, error);
        }
      });
    }
  }

  // Handle incoming messages
  private handleMessage(message: WebSocketMessage): void {
    this.emit(message.type, message.data);
  }

  // Schedule reconnection
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= (this.config.max_reconnect_attempts || 10)) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.config.max_reconnect_attempts})`);
      
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
        this.emit(WebSocketEventType.ERROR, { error: error.message });
      });
    }, this.config.reconnect_interval);
  }

  // Clear reconnect timer
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // Start ping/pong
  private startPing(): void {
    if (this.config.ping_interval && this.config.ping_interval > 0) {
      this.pingTimer = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.send({ type: 'ping', data: {} });
        }
      }, this.config.ping_interval);
    }
  }

  // Stop ping/pong
  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  // Generate unique message ID
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get connection state
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Get ready state
  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }
}

// ============================================================================
// SPECIALIZED WEBSOCKET SERVICES
// ============================================================================

// Live Desktop WebSocket Service
export class LiveDesktopWebSocket extends WebSocketClient {
  constructor(streamId: string) {
    const wsUrl = `${import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000'}/ws/desktop/live/${streamId}`;
    super({ url: wsUrl });
  }

  // Send click event
  sendClick(x: number, y: number, button: 'left' | 'right' | 'middle' = 'left'): void {
    this.send({
      type: WebSocketEventType.DESKTOP_CLICK,
      data: { x, y, button },
    });
  }

  // Subscribe to desktop frames
  onFrame(callback: (frameData: string) => void): () => void {
    return this.on(WebSocketEventType.DESKTOP_FRAME, callback);
  }
}

// Workflow Execution WebSocket Service
export class WorkflowExecutionWebSocket extends WebSocketClient {
  constructor(executionId: string) {
    const wsUrl = `${import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000'}/ws/execution/${executionId}`;
    super({ url: wsUrl });
  }

  // Subscribe to workflow events
  onWorkflowStarted(callback: (data: any) => void): () => void {
    return this.on(WebSocketEventType.WORKFLOW_STARTED, callback);
  }

  onWorkflowCompleted(callback: (data: any) => void): () => void {
    return this.on(WebSocketEventType.WORKFLOW_COMPLETED, callback);
  }

  onWorkflowFailed(callback: (data: any) => void): () => void {
    return this.on(WebSocketEventType.WORKFLOW_FAILED, callback);
  }

  onNodeStarted(callback: (data: any) => void): () => void {
    return this.on(WebSocketEventType.NODE_STARTED, callback);
  }

  onNodeCompleted(callback: (data: any) => void): () => void {
    return this.on(WebSocketEventType.NODE_COMPLETED, callback);
  }

  onNodeFailed(callback: (data: any) => void): () => void {
    return this.on(WebSocketEventType.NODE_FAILED, callback);
  }
}

// File Watcher WebSocket Service
export class FileWatcherWebSocket extends WebSocketClient {
  constructor(watcherId: string) {
    const wsUrl = `${import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000'}/ws/file-watcher/${watcherId}`;
    super({ url: wsUrl });
  }

  // Subscribe to file system events
  onFileCreated(callback: (data: any) => void): () => void {
    return this.on(WebSocketEventType.FILE_CREATED, callback);
  }

  onFileModified(callback: (data: any) => void): () => void {
    return this.on(WebSocketEventType.FILE_MODIFIED, callback);
  }

  onFileDeleted(callback: (data: any) => void): () => void {
    return this.on(WebSocketEventType.FILE_DELETED, callback);
  }

  onFileMoved(callback: (data: any) => void): () => void {
    return this.on(WebSocketEventType.FILE_MOVED, callback);
  }
}

// ============================================================================
// WEBSOCKET MANAGER
// ============================================================================

export class WebSocketManager {
  private connections: Map<string, WebSocketClient> = new Map();

  // Create or get connection
  getConnection(id: string, config: WebSocketConfig): WebSocketClient {
    if (!this.connections.has(id)) {
      const client = new WebSocketClient(config);
      this.connections.set(id, client);
    }
    return this.connections.get(id)!;
  }

  // Create live desktop connection
  createLiveDesktopConnection(streamId: string): LiveDesktopWebSocket {
    const id = `desktop_${streamId}`;
    if (!this.connections.has(id)) {
      const client = new LiveDesktopWebSocket(streamId);
      this.connections.set(id, client);
    }
    return this.connections.get(id) as LiveDesktopWebSocket;
  }

  // Create workflow execution connection
  createWorkflowExecutionConnection(executionId: string): WorkflowExecutionWebSocket {
    const id = `execution_${executionId}`;
    if (!this.connections.has(id)) {
      const client = new WorkflowExecutionWebSocket(executionId);
      this.connections.set(id, client);
    }
    return this.connections.get(id) as WorkflowExecutionWebSocket;
  }

  // Create file watcher connection
  createFileWatcherConnection(watcherId: string): FileWatcherWebSocket {
    const id = `watcher_${watcherId}`;
    if (!this.connections.has(id)) {
      const client = new FileWatcherWebSocket(watcherId);
      this.connections.set(id, client);
    }
    return this.connections.get(id) as FileWatcherWebSocket;
  }

  // Remove connection
  removeConnection(id: string): void {
    const connection = this.connections.get(id);
    if (connection) {
      connection.disconnect();
      this.connections.delete(id);
    }
  }

  // Disconnect all connections
  disconnectAll(): void {
    this.connections.forEach((connection, id) => {
      connection.disconnect();
    });
    this.connections.clear();
  }

  // Get all active connections
  getActiveConnections(): string[] {
    return Array.from(this.connections.keys()).filter(id => {
      const connection = this.connections.get(id);
      return connection?.isConnected;
    });
  }
}

// Create singleton instance
export const websocketManager = new WebSocketManager();

// Export convenience functions
export const createLiveDesktopWebSocket = (streamId: string) => 
  websocketManager.createLiveDesktopConnection(streamId);

export const createWorkflowExecutionWebSocket = (executionId: string) => 
  websocketManager.createWorkflowExecutionConnection(executionId);

export const createFileWatcherWebSocket = (watcherId: string) => 
  websocketManager.createFileWatcherConnection(watcherId);

// Export types and classes for convenience
// (Classes are already exported above with their definitions)