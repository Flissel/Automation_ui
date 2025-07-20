/**
 * TRAE Visual Workflow System - React Hooks
 * 
 * Custom hooks for API and WebSocket integration
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  UseApiReturn,
  UseWebSocketReturn,
  WebSocketMessage,
  WorkflowGraph,
  WorkflowExecution,
  NodeData,
  SystemHealth,
  OCRResult,
  FileSystemEvent,
  ApiResponse,
  TraeApiError,
} from '../types';
import { workflowApi, nodeApi, systemApi, desktopApi, ocrApi, fileWatcherApi } from '../services/api';
import {
  WebSocketClient,
  LiveDesktopWebSocket,
  WorkflowExecutionWebSocket,
  FileWatcherWebSocket,
  websocketManager,
  WebSocketEventType,
} from '../services/websocket';

// ============================================================================
// API HOOKS
// ============================================================================

/**
 * Generic API hook for data fetching
 */
export function useApi<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  dependencies: any[] = []
): UseApiReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiCall();
      setData(response.data || null);
    } catch (err) {
      const errorMessage = err instanceof TraeApiError ? err.message : 'An error occurred';
      setError(errorMessage);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, Array.isArray(dependencies) ? dependencies : []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * Hook for managing workflows
 */
export function useWorkflows() {
  const [workflows, setWorkflows] = useState<WorkflowGraph[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await workflowApi.getWorkflows();
      setWorkflows(response.data || []);
    } catch (err) {
      setError(err instanceof TraeApiError ? err.message : 'Failed to fetch workflows');
    } finally {
      setLoading(false);
    }
  }, []);

  const createWorkflow = useCallback(async (workflow: Partial<WorkflowGraph>) => {
    try {
      const response = await workflowApi.createWorkflow(workflow);
      if (response.data) {
        setWorkflows(prev => [...(prev || []), response.data!]);
      }
      return response.data;
    } catch (err) {
      throw err;
    }
  }, []);

  const updateWorkflow = useCallback(async (id: string, updates: Partial<WorkflowGraph>) => {
    try {
      const response = await workflowApi.updateWorkflow(id, updates);
      if (response.data) {
        setWorkflows(prev => (prev || []).map(w => w.id === id ? response.data! : w));
      }
      return response.data;
    } catch (err) {
      throw err;
    }
  }, []);

  const deleteWorkflow = useCallback(async (id: string) => {
    try {
      await workflowApi.deleteWorkflow(id);
      setWorkflows(prev => (prev || []).filter(w => w.id !== id));
    } catch (err) {
      throw err;
    }
  }, []);

  const executeWorkflow = useCallback(async (id: string, inputs?: Record<string, any>) => {
    try {
      const response = await workflowApi.executeWorkflow(id, inputs);
      return response.data;
    } catch (err) {
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  return {
    workflows,
    loading,
    error,
    refetch: fetchWorkflows,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    executeWorkflow,
  };
}

/**
 * Hook for workflow execution monitoring
 */
export function useWorkflowExecution(executionId: string | null) {
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WorkflowExecutionWebSocket | null>(null);

  const fetchExecution = useCallback(async () => {
    if (!executionId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await workflowApi.getExecutionStatus(executionId);
      setExecution(response.data || null);
    } catch (err) {
      setError(err instanceof TraeApiError ? err.message : 'Failed to fetch execution');
    } finally {
      setLoading(false);
    }
  }, [executionId]);

  const cancelExecution = useCallback(async () => {
    if (!executionId) return;

    try {
      await workflowApi.cancelExecution(executionId);
      await fetchExecution();
    } catch (err) {
      throw err;
    }
  }, [executionId, fetchExecution]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!executionId) return;

    const ws = websocketManager.createWorkflowExecutionConnection(executionId);
    wsRef.current = ws;

    const unsubscribers = [
      ws.onWorkflowStarted((data) => {
        setExecution(prev => prev ? { ...prev, status: 'running' } : null);
      }),
      ws.onWorkflowCompleted((data) => {
        setExecution(prev => prev ? { ...prev, status: 'completed', end_time: new Date().toISOString() } : null);
      }),
      ws.onWorkflowFailed((data) => {
        setExecution(prev => prev ? { ...prev, status: 'failed', error: data.error, end_time: new Date().toISOString() } : null);
      }),
      ws.onNodeStarted((data) => {
        setExecution(prev => {
          if (!prev) return null;
          return {
            ...prev,
            node_results: {
              ...prev.node_results,
              [data.node_id]: { success: false, outputs: {}, metadata: { status: 'running' } },
            },
          };
        });
      }),
      ws.onNodeCompleted((data) => {
        setExecution(prev => {
          if (!prev) return null;
          return {
            ...prev,
            node_results: {
              ...prev.node_results,
              [data.node_id]: data.result,
            },
          };
        });
      }),
      ws.onNodeFailed((data) => {
        setExecution(prev => {
          if (!prev) return null;
          return {
            ...prev,
            node_results: {
              ...prev.node_results,
              [data.node_id]: { success: false, outputs: {}, error: data.error },
            },
          };
        });
      }),
    ];

    ws.connect().catch(console.error);

    return () => {
      unsubscribers.forEach(unsub => unsub());
      websocketManager.removeConnection(`execution_${executionId}`);
    };
  }, [executionId]);

  useEffect(() => {
    fetchExecution();
  }, [fetchExecution]);

  return {
    execution,
    loading,
    error,
    refetch: fetchExecution,
    cancelExecution,
  };
}

/**
 * Hook for desktop operations
 */
export function useDesktop() {
  const [screenInfo, setScreenInfo] = useState<{ width: number; height: number; scale: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const takeScreenshot = useCallback(async (options?: any) => {
    try {
      setLoading(true);
      const response = await desktopApi.takeScreenshot(options);
      return response.data;
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const performClick = useCallback(async (options: any) => {
    try {
      const response = await desktopApi.performClick(options);
      return response.data;
    } catch (err) {
      throw err;
    }
  }, []);

  const startLiveStream = useCallback(async (config?: any) => {
    try {
      const response = await desktopApi.startLiveStream(config);
      return response.data;
    } catch (err) {
      throw err;
    }
  }, []);

  const stopLiveStream = useCallback(async (streamId: string) => {
    try {
      await desktopApi.stopLiveStream(streamId);
    } catch (err) {
      throw err;
    }
  }, []);

  const fetchScreenInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await desktopApi.getScreenInfo();
      setScreenInfo(response.data || null);
    } catch (err) {
      setError(err instanceof TraeApiError ? err.message : 'Failed to fetch screen info');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScreenInfo();
  }, [fetchScreenInfo]);

  return {
    screenInfo,
    loading,
    error,
    takeScreenshot,
    performClick,
    startLiveStream,
    stopLiveStream,
    refetch: fetchScreenInfo,
  };
}

/**
 * Hook for OCR operations
 */
export function useOCR() {
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processImage = useCallback(async (imageData: string, config?: any): Promise<OCRResult> => {
    try {
      setLoading(true);
      const response = await ocrApi.processImage(imageData, config);
      return response.data!;
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const processImageFile = useCallback(async (file: File, config?: any): Promise<OCRResult> => {
    try {
      setLoading(true);
      const response = await ocrApi.processImageFile(file, config);
      return response.data!;
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSupportedLanguages = useCallback(async (engine?: 'tesseract' | 'easyocr') => {
    try {
      const response = await ocrApi.getSupportedLanguages(engine);
      setSupportedLanguages(response.data || []);
    } catch (err) {
      setError(err instanceof TraeApiError ? err.message : 'Failed to fetch languages');
    }
  }, []);

  useEffect(() => {
    fetchSupportedLanguages();
  }, [fetchSupportedLanguages]);

  return {
    supportedLanguages,
    loading,
    error,
    processImage,
    processImageFile,
    refetchLanguages: fetchSupportedLanguages,
  };
}

/**
 * Hook for file watching
 */
export function useFileWatcher() {
  const [watchers, setWatchers] = useState<any[]>([]);
  const [events, setEvents] = useState<FileSystemEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watcherConnections = useRef<Map<string, FileWatcherWebSocket>>(new Map());

  const startWatching = useCallback(async (config: any) => {
    try {
      const response = await fileWatcherApi.startWatching(config);
      const watcherId = response.data?.watcher_id;
      
      if (watcherId) {
        // Create WebSocket connection for real-time events
        const ws = websocketManager.createFileWatcherConnection(watcherId);
        watcherConnections.current.set(watcherId, ws);

        // Subscribe to file system events
        ws.onFileCreated((data) => {
          setEvents(prev => [data, ...prev.slice(0, 99)]); // Keep last 100 events
        });
        ws.onFileModified((data) => {
          setEvents(prev => [data, ...prev.slice(0, 99)]);
        });
        ws.onFileDeleted((data) => {
          setEvents(prev => [data, ...prev.slice(0, 99)]);
        });
        ws.onFileMoved((data) => {
          setEvents(prev => [data, ...prev.slice(0, 99)]);
        });

        await ws.connect();
        await fetchWatchers();
      }
      
      return response.data;
    } catch (err) {
      throw err;
    }
  }, []);

  const stopWatching = useCallback(async (watcherId: string) => {
    try {
      await fileWatcherApi.stopWatching(watcherId);
      
      // Close WebSocket connection
      const ws = watcherConnections.current.get(watcherId);
      if (ws) {
        ws.disconnect();
        watcherConnections.current.delete(watcherId);
      }
      
      await fetchWatchers();
    } catch (err) {
      throw err;
    }
  }, []);

  const fetchWatchers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fileWatcherApi.getActiveWatchers();
      setWatchers(response.data || []);
    } catch (err) {
      setError(err instanceof TraeApiError ? err.message : 'Failed to fetch watchers');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRecentEvents = useCallback(async (watcherId?: string, limit?: number) => {
    try {
      const response = await fileWatcherApi.getRecentEvents(watcherId, limit);
      setEvents(response.data || []);
    } catch (err) {
      setError(err instanceof TraeApiError ? err.message : 'Failed to fetch events');
    }
  }, []);

  useEffect(() => {
    fetchWatchers();
    fetchRecentEvents();
  }, [fetchWatchers, fetchRecentEvents]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      watcherConnections.current.forEach((ws) => {
        ws.disconnect();
      });
      watcherConnections.current.clear();
    };
  }, []);

  return {
    watchers,
    events,
    loading,
    error,
    startWatching,
    stopWatching,
    refetchWatchers: fetchWatchers,
    refetchEvents: fetchRecentEvents,
  };
}

/**
 * Hook for system health monitoring
 */
export function useSystemHealth() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await systemApi.getHealth();
      setHealth(response.data || null);
    } catch (err) {
      setError(err instanceof TraeApiError ? err.message : 'Failed to fetch system health');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh health status
  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return {
    health,
    loading,
    error,
    refetch: fetchHealth,
  };
}

// ============================================================================
// WEBSOCKET HOOKS
// ============================================================================

/**
 * Generic WebSocket hook
 */
export function useWebSocket(url: string, options?: Partial<any>): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocketClient | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.isConnected) return;

    const ws = new WebSocketClient({ url, ...options });
    wsRef.current = ws;

    ws.on(WebSocketEventType.CONNECT, () => {
      setIsConnected(true);
      setError(null);
    });

    ws.on(WebSocketEventType.DISCONNECT, () => {
      setIsConnected(false);
    });

    ws.on(WebSocketEventType.ERROR, (data) => {
      setError(data.error);
    });

    // Listen to all message types
    const messageTypes = Object.values(WebSocketEventType);
    messageTypes.forEach(type => {
      ws.on(type, (data) => {
        setLastMessage({ type, data, timestamp: new Date().toISOString() });
      });
    });

    ws.connect().catch(err => {
      setError(err.message);
    });
  }, [url, options]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.isConnected) {
      wsRef.current.send(message);
    } else {
      setError('WebSocket is not connected');
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
    error,
  };
}

/**
 * Hook for live desktop streaming
 */
export function useLiveDesktop(streamId: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<LiveDesktopWebSocket | null>(null);

  const connect = useCallback(() => {
    if (!streamId || wsRef.current?.isConnected) return;

    const ws = websocketManager.createLiveDesktopConnection(streamId);
    wsRef.current = ws;

    ws.on(WebSocketEventType.CONNECT, () => {
      setIsConnected(true);
      setError(null);
    });

    ws.on(WebSocketEventType.DISCONNECT, () => {
      setIsConnected(false);
    });

    ws.on(WebSocketEventType.ERROR, (data) => {
      setError(data.error);
    });

    ws.onFrame((frameData) => {
      setCurrentFrame(frameData);
    });

    ws.connect().catch(err => {
      setError(err.message);
    });
  }, [streamId]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current = null;
      setIsConnected(false);
      setCurrentFrame(null);
    }
  }, []);

  const sendClick = useCallback((x: number, y: number, button?: 'left' | 'right' | 'middle') => {
    if (wsRef.current?.isConnected) {
      wsRef.current.sendClick(x, y, button);
    }
  }, []);

  useEffect(() => {
    if (streamId) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [streamId, connect, disconnect]);

  return {
    isConnected,
    currentFrame,
    error,
    connect,
    disconnect,
    sendClick,
  };
}

// Export all hooks
export default {
  useApi,
  useWorkflows,
  useWorkflowExecution,
  useDesktop,
  useOCR,
  useFileWatcher,
  useSystemHealth,
  useWebSocket,
  useLiveDesktop,
};