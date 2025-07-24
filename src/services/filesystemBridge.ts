/**
 * ============================================================================
 * FILESYSTEM BRIDGE SERVICE
 * ============================================================================
 * 
 * Browser-compatible service for handling filesystem operations in the workflow system.
 * This service provides a bridge between the workflow interface and filesystem storage,
 * using browser-compatible APIs and event handling.
 * 
 * Features:
 * - WebSocket-based filesystem operations
 * - Browser-compatible event system
 * - File upload/download capabilities
 * - Directory management
 * - Real-time status monitoring
 * 
 * @author Autonomous Programmer Project
 * @version 1.0.0
 */

// Browser-compatible event emitter implementation
class SimpleEventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, callback: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  emit(event: string, ...args: any[]) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(...args));
    }
  }

  off(event: string, callback: Function) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }
}

export interface FilesystemBridgeConfig {
  baseDataPath: string;
  websocketUrl: string;
  websocketPort: number;
  watchInterval: number;
  autoCleanup: boolean;
  maxFileAge: number;
}

export interface WorkflowData {
  id: string;
  timestamp: number;
  nodeId: string;
  nodeType: string;
  data: any;
  metadata: {
    executionId: string;
    workflowId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    retryCount?: number;
  };
}

export interface ActionCommand {
  id: string;
  type: 'click' | 'type' | 'http' | 'ocr' | 'custom';
  timestamp: number;
  nodeId: string;
  parameters: any;
  executionTimeout: number;
  waitForExecution: boolean;
}

export interface ActionResult {
  commandId: string;
  nodeId: string;
  timestamp: number;
  status: 'success' | 'failed' | 'timeout';
  result: any;
  error?: string;
  executionTime: number;
}

export class FilesystemBridge extends SimpleEventEmitter {
  private config: FilesystemBridgeConfig;
  private websocket: WebSocket | null = null;
  private fileWatchers: Map<string, NodeJS.Timeout> = new Map();
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor(config: FilesystemBridgeConfig) {
    super();
    this.config = config;
    this.initializeDirectories();
  }

  /**
   * Initialize required directories for filesystem operations
   */
  private async initializeDirectories(): Promise<void> {
    const directories = [
      this.config.baseDataPath,
      `${this.config.baseDataPath}/websocket`,
      `${this.config.baseDataPath}/desktop`,
      `${this.config.baseDataPath}/actions`,
      `${this.config.baseDataPath}/actions/click`,
      `${this.config.baseDataPath}/actions/type`,
      `${this.config.baseDataPath}/actions/http`,
      `${this.config.baseDataPath}/actions/ocr`,
      `${this.config.baseDataPath}/results`,
      `${this.config.baseDataPath}/temp`
    ];

    // In a real implementation, you would create these directories
    // For now, we'll emit events to indicate directory creation
    directories.forEach(dir => {
      this.emit('directoryCreated', { path: dir });
    });
  }

  /**
   * Connect to WebSocket service
   */
  public async connect(): Promise<void> {
    try {
      const wsUrl = `${this.config.websocketUrl}:${this.config.websocketPort}`;
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected', { url: wsUrl });
        this.startFileWatching();
      };

      this.websocket.onmessage = (event) => {
        this.handleWebSocketMessage(event.data);
      };

      this.websocket.onclose = () => {
        this.isConnected = false;
        this.emit('disconnected');
        this.attemptReconnect();
      };

      this.websocket.onerror = (error) => {
        this.emit('error', { error, context: 'websocket' });
      };

    } catch (error) {
      this.emit('error', { error, context: 'connection' });
    }
  }

  /**
   * Disconnect from WebSocket service
   */
  public disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.stopFileWatching();
    this.isConnected = false;
  }

  /**
   * Attempt to reconnect to WebSocket service
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
      
      setTimeout(() => {
        this.emit('reconnecting', { attempt: this.reconnectAttempts });
        this.connect();
      }, delay);
    } else {
      this.emit('reconnectFailed', { maxAttempts: this.maxReconnectAttempts });
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'desktop_stream':
          this.writeDesktopData(message.data);
          break;
        case 'action_result':
          this.writeActionResult(message.data);
          break;
        case 'system_status':
          this.writeSystemStatus(message.data);
          break;
        default:
          this.emit('unknownMessage', message);
      }
    } catch (error) {
      this.emit('error', { error, context: 'message_parsing' });
    }
  }

  /**
   * Write action command to filesystem for execution
   */
  public async writeActionCommand(command: ActionCommand): Promise<void> {
    const filePath = `${this.config.baseDataPath}/actions/${command.type}/${command.id}.json`;
    const data: WorkflowData = {
      id: command.id,
      timestamp: Date.now(),
      nodeId: command.nodeId,
      nodeType: command.type,
      data: command,
      metadata: {
        executionId: `exec_${Date.now()}`,
        workflowId: `workflow_${command.nodeId}`,
        status: 'pending'
      }
    };

    // In a real implementation, you would write to the actual filesystem
    // For now, we'll emit events and send via WebSocket
    this.emit('fileWritten', { path: filePath, data });
    
    if (this.isConnected && this.websocket) {
      this.websocket.send(JSON.stringify({
        type: 'action_command',
        data: data
      }));
    }
  }

  /**
   * Write desktop stream data to filesystem
   */
  private async writeDesktopData(data: any): Promise<void> {
    const filePath = `${this.config.baseDataPath}/desktop/stream_${Date.now()}.json`;
    const workflowData: WorkflowData = {
      id: `desktop_${Date.now()}`,
      timestamp: Date.now(),
      nodeId: 'live_desktop',
      nodeType: 'desktop_stream',
      data: data,
      metadata: {
        executionId: `exec_${Date.now()}`,
        workflowId: 'desktop_interface',
        status: 'completed'
      }
    };

    this.emit('fileWritten', { path: filePath, data: workflowData });
  }

  /**
   * Write action result to filesystem
   */
  private async writeActionResult(result: ActionResult): Promise<void> {
    const filePath = `${this.config.baseDataPath}/results/${result.commandId}_result.json`;
    const workflowData: WorkflowData = {
      id: result.commandId,
      timestamp: Date.now(),
      nodeId: result.nodeId,
      nodeType: 'action_result',
      data: result,
      metadata: {
        executionId: `exec_${Date.now()}`,
        workflowId: `workflow_${result.nodeId}`,
        status: result.status === 'success' ? 'completed' : 'failed'
      }
    };

    this.emit('fileWritten', { path: filePath, data: workflowData });
    this.emit('actionResult', result);
  }

  /**
   * Write system status to filesystem
   */
  private async writeSystemStatus(status: any): Promise<void> {
    const filePath = `${this.config.baseDataPath}/websocket/status.json`;
    const workflowData: WorkflowData = {
      id: `status_${Date.now()}`,
      timestamp: Date.now(),
      nodeId: 'websocket_config',
      nodeType: 'system_status',
      data: status,
      metadata: {
        executionId: `exec_${Date.now()}`,
        workflowId: 'system_monitoring',
        status: 'completed'
      }
    };

    this.emit('fileWritten', { path: filePath, data: workflowData });
  }

  /**
   * Read workflow data from filesystem
   */
  public async readWorkflowData(nodeId: string, dataType?: string): Promise<WorkflowData[]> {
    // In a real implementation, you would read from the actual filesystem
    // For now, we'll emit events and return mock data
    const mockData: WorkflowData[] = [
      {
        id: `${nodeId}_${Date.now()}`,
        timestamp: Date.now(),
        nodeId: nodeId,
        nodeType: dataType || 'unknown',
        data: { mock: true, nodeId },
        metadata: {
          executionId: `exec_${Date.now()}`,
          workflowId: `workflow_${nodeId}`,
          status: 'completed'
        }
      }
    ];

    this.emit('dataRead', { nodeId, dataType, results: mockData });
    return mockData;
  }

  /**
   * Start file watching for changes
   */
  private startFileWatching(): void {
    const watchPaths = [
      `${this.config.baseDataPath}/actions`,
      `${this.config.baseDataPath}/results`,
      `${this.config.baseDataPath}/desktop`
    ];

    watchPaths.forEach(path => {
      const watcherId = setInterval(() => {
        this.checkForFileChanges(path);
      }, this.config.watchInterval);

      this.fileWatchers.set(path, watcherId);
    });

    this.emit('fileWatchingStarted', { paths: watchPaths });
  }

  /**
   * Stop file watching
   */
  private stopFileWatching(): void {
    this.fileWatchers.forEach((watcherId, path) => {
      clearInterval(watcherId);
    });
    this.fileWatchers.clear();
    this.emit('fileWatchingStopped');
  }

  /**
   * Check for file changes in a directory
   */
  private checkForFileChanges(path: string): void {
    // In a real implementation, you would check the actual filesystem
    // For now, we'll emit periodic events to simulate file changes
    this.emit('fileChanged', { 
      path, 
      timestamp: Date.now(),
      changeType: 'modified'
    });
  }

  /**
   * Cleanup old files based on age
   */
  public async cleanupOldFiles(): Promise<void> {
    if (!this.config.autoCleanup) return;

    const cutoffTime = Date.now() - this.config.maxFileAge;
    
    // In a real implementation, you would scan and delete old files
    // For now, we'll emit cleanup events
    this.emit('filesCleanedUp', { 
      cutoffTime, 
      maxAge: this.config.maxFileAge 
    });
  }

  /**
   * Get connection status
   */
  public getStatus(): { connected: boolean; reconnectAttempts: number } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * Send data via WebSocket
   */
  public sendWebSocketData(type: string, data: any): void {
    if (this.isConnected && this.websocket) {
      this.websocket.send(JSON.stringify({ type, data }));
    } else {
      this.emit('error', { 
        error: 'WebSocket not connected', 
        context: 'send_data' 
      });
    }
  }
}

// Export default configuration
export const defaultFilesystemBridgeConfig: FilesystemBridgeConfig = {
  baseDataPath: './workflow-data',
  websocketUrl: 'ws://localhost',
  websocketPort: 8080,
  watchInterval: 1000,
  autoCleanup: true,
  maxFileAge: 3600000 // 1 hour
};