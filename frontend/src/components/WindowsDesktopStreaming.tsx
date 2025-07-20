import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { errorHandlingService } from '../services/ErrorHandlingService';
import { loadingStateService } from '../services/LoadingStateService';

interface WindowsDesktopConfig {
  fps: number;
  scale_factor: number;
  quality: number;
  screenshot_method: 'powershell' | 'vnc' | 'rdp';
  connection_timeout: number;
}

interface WindowsDesktopStatus {
  streaming: boolean;
  connected: boolean;
  current_connection: string | null;
  config: WindowsDesktopConfig;
  performance: {
    fps: number;
    latency: number;
    bytes_sent: number;
  };
}

interface SSHConnection {
  name: string;
  host: string;
  port: number;
  username: string;
  desktop_type: string;
  connected: boolean;
  last_connected: string | null;
}

const WindowsDesktopStreaming: React.FC = () => {
  const [status, setStatus] = useState<WindowsDesktopStatus | null>(null);
  const [connections, setConnections] = useState<SSHConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<Partial<WindowsDesktopConfig>>({
    fps: 8,
    scale_factor: 0.8,
    quality: 85,
    screenshot_method: 'powershell',
    connection_timeout: 30
  });
  const [selectedConnection, setSelectedConnection] = useState<string>('host_system');
  const [showConfig, setShowConfig] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch Windows desktop status
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/windows-desktop/status');
      const data = await response.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch (error) {
      console.error('Error fetching Windows desktop status:', error);
    }
  };

  // Fetch available SSH connections
  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/windows-desktop/connections');
      const data = await response.json();
      if (data.success) {
        setConnections(data.data.connections || []);
      }
    } catch (error) {
      console.error('Error fetching SSH connections:', error);
    }
  };

  // Start Windows desktop streaming
  const startStreaming = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/windows-desktop/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connection_name: selectedConnection,
          ...config
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Windows desktop streaming started');
        await fetchStatus();
        connectWebSocket();
      } else {
        throw new Error(data.detail || 'Failed to start streaming');
      }
    } catch (error) {
      console.error('Error starting Windows desktop streaming:', error);
      errorHandlingService.handleError(
        error instanceof Error ? error : new Error('Failed to start Windows desktop streaming'),
        {
          operation: 'windows_desktop_start',
          connection: selectedConnection,
          config,
          retryFunction: () => startStreaming()
        }
      );
    } finally {
      setLoading(false);
    }
  };

  // Stop Windows desktop streaming
  const stopStreaming = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/windows-desktop/stop', {
        method: 'POST',
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Windows desktop streaming stopped');
        await fetchStatus();
        disconnectWebSocket();
      } else {
        throw new Error(data.detail || 'Failed to stop streaming');
      }
    } catch (error) {
      console.error('Error stopping Windows desktop streaming:', error);
      errorHandlingService.handleError(
        error instanceof Error ? error : new Error('Failed to stop Windows desktop streaming'),
        {
          operation: 'windows_desktop_stop',
          connection: selectedConnection,
          retryFunction: () => stopStreaming()
        }
      );
    } finally {
      setLoading(false);
    }
  };

  // Update configuration
  const updateConfig = async () => {
    try {
      const response = await fetch('/api/windows-desktop/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Configuration updated');
        await fetchStatus();
        setShowConfig(false);
      } else {
        throw new Error(data.detail || 'Failed to update configuration');
      }
    } catch (error) {
      console.error('Error updating configuration:', error);
      errorHandlingService.handleError(
        error instanceof Error ? error : new Error('Failed to update configuration'),
        {
          operation: 'windows_desktop_config_update',
          config,
          retryFunction: () => updateConfig()
        }
      );
    }
  };

  // Test SSH connection
  const testConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/windows-desktop/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connection_name: selectedConnection,
          test_screenshot: true
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setTestResult(data.data);
        toast.success('Connection test completed');
      } else {
        throw new Error(data.detail || 'Connection test failed');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      errorHandlingService.handleError(
        error instanceof Error ? error : new Error('Connection test failed'),
        {
          operation: 'windows_desktop_connection_test',
          connection: selectedConnection,
          retryFunction: () => testConnection()
        }
      );
    } finally {
      setLoading(false);
    }
  };

  // Capture single screenshot
  const captureScreenshot = async () => {
    try {
      const response = await fetch('/api/windows-desktop/screenshot');
      const data = await response.json();
      if (data.success) {
        // Display screenshot on canvas
        if (canvasRef.current && data.data.image) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          const img = new Image();
          img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
          };
          img.src = `data:image/png;base64,${data.data.image}`;
        }
        toast.success('Screenshot captured');
      } else {
        throw new Error(data.detail || 'Failed to capture screenshot');
      }
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      errorHandlingService.handleError(
        error instanceof Error ? error : new Error('Failed to capture screenshot'),
        {
          operation: 'windows_desktop_screenshot',
          retryFunction: () => captureScreenshot()
        }
      );
    }
  };

  // WebSocket connection for real-time streaming
  const connectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/live-desktop`;
    
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      console.log('Windows desktop WebSocket connected');
    };
    
    wsRef.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'screenshot' && message.data.image) {
          // Display real-time screenshot
          if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
              canvas.width = img.width;
              canvas.height = img.height;
              ctx?.drawImage(img, 0, 0);
            };
            img.src = `data:image/png;base64,${message.data.image}`;
          }
        } else if (message.type === 'status') {
          // Update status from WebSocket
          setStatus(prevStatus => ({ ...prevStatus, ...message.data }));
        } else if (message.type === 'error') {
          console.error('WebSocket error:', message.data.message);
          errorHandlingService.handleError(
            new Error(`Windows Desktop WebSocket error: ${message.data.message}`),
            {
              operation: 'windows_desktop_websocket_message',
              messageType: message.type,
              errorMessage: message.data.message
            }
          );
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      errorHandlingService.handleError(
        new Error('Windows Desktop WebSocket connection error'),
        {
          operation: 'windows_desktop_websocket_connection',
          error: error?.toString()
        }
      );
    };
    
    wsRef.current.onclose = () => {
      console.log('Windows desktop WebSocket disconnected');
    };
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchConnections();
    
    // Refresh every 10 seconds
    const interval = setInterval(() => {
      fetchStatus();
      fetchConnections();
    }, 10000);
    
    return () => {
      clearInterval(interval);
      disconnectWebSocket();
    };
  }, []);

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginRight: '8px',
    marginBottom: '8px',
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#3b82f6',
    color: 'white',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
  };

  const successButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#10b981',
    color: 'white',
  };

  const dangerButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#ef4444',
    color: 'white',
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px', color: '#1f2937' }}>Windows Desktop Streaming</h2>
      
      {/* Status Card */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, color: '#1f2937' }}>Streaming Status</h3>
        {status ? (
          <div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontWeight: '500' }}>Status: </span>
              <span style={{ 
                color: status.streaming ? '#10b981' : '#6b7280',
                fontWeight: '500'
              }}>
                {status.streaming ? 'Streaming' : 'Stopped'}
              </span>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontWeight: '500' }}>Connection: </span>
              <span style={{ 
                color: status.connected ? '#10b981' : '#ef4444',
                fontWeight: '500'
              }}>
                {status.connected ? (status.current_connection || 'Connected') : 'Disconnected'}
              </span>
            </div>
            {status.performance && (
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontWeight: '500' }}>Performance: </span>
                <span>{status.performance.fps} FPS, {status.performance.latency}ms latency</span>
              </div>
            )}
          </div>
        ) : (
          <div>Loading status...</div>
        )}
      </div>

      {/* Connection Selection */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, color: '#1f2937' }}>SSH Connection</h3>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Select Connection:
          </label>
          <select
            value={selectedConnection}
            onChange={(e) => setSelectedConnection(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              width: '200px'
            }}
          >
            {connections.map((conn) => (
              <option key={conn.name} value={conn.name}>
                {conn.name} ({conn.host}:{conn.port})
              </option>
            ))}
          </select>
        </div>
        
        <button
          onClick={testConnection}
          disabled={loading}
          style={secondaryButtonStyle}
        >
          {loading ? 'Testing...' : 'Test Connection'}
        </button>
        
        {testResult && (
          <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
            <div><strong>Connection Test Result:</strong></div>
            <div>Connected: {testResult.connected ? '✅' : '❌'}</div>
            {testResult.screenshot_test && (
              <div>Screenshot Test: {testResult.screenshot_test.success ? '✅' : '❌'}</div>
            )}
            {testResult.screenshot_test?.resolution && (
              <div>Resolution: {testResult.screenshot_test.resolution[0]}x{testResult.screenshot_test.resolution[1]}</div>
            )}
          </div>
        )}
      </div>

      {/* Streaming Controls */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, color: '#1f2937' }}>Streaming Controls</h3>
        
        {status?.streaming ? (
          <button
            onClick={stopStreaming}
            disabled={loading}
            style={dangerButtonStyle}
          >
            {loading ? 'Stopping...' : 'Stop Streaming'}
          </button>
        ) : (
          <button
            onClick={startStreaming}
            disabled={loading}
            style={successButtonStyle}
          >
            {loading ? 'Starting...' : 'Start Streaming'}
          </button>
        )}
        
        <button
          onClick={captureScreenshot}
          style={secondaryButtonStyle}
        >
          Capture Screenshot
        </button>
        
        <button
          onClick={() => setShowConfig(!showConfig)}
          style={secondaryButtonStyle}
        >
          {showConfig ? 'Hide Config' : 'Show Config'}
        </button>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, color: '#1f2937' }}>Configuration</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>FPS:</label>
              <input
                type="number"
                min="1"
                max="30"
                value={config.fps || 8}
                onChange={(e) => setConfig({ ...config, fps: parseInt(e.target.value) })}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  width: '100%'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Scale Factor:</label>
              <input
                type="number"
                min="0.1"
                max="2.0"
                step="0.1"
                value={config.scale_factor || 0.8}
                onChange={(e) => setConfig({ ...config, scale_factor: parseFloat(e.target.value) })}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  width: '100%'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Quality (%):</label>
              <input
                type="number"
                min="10"
                max="100"
                value={config.quality || 85}
                onChange={(e) => setConfig({ ...config, quality: parseInt(e.target.value) })}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  width: '100%'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Screenshot Method:</label>
              <select
                value={config.screenshot_method || 'powershell'}
                onChange={(e) => setConfig({ ...config, screenshot_method: e.target.value as any })}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  width: '100%'
                }}
              >
                <option value="powershell">PowerShell</option>
                <option value="vnc">VNC</option>
                <option value="rdp">RDP</option>
              </select>
            </div>
          </div>
          
          <div style={{ marginTop: '16px' }}>
            <button
              onClick={updateConfig}
              style={primaryButtonStyle}
            >
              Update Configuration
            </button>
          </div>
        </div>
      )}

      {/* Desktop Display */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, color: '#1f2937' }}>Windows Desktop</h3>
        <canvas
          ref={canvasRef}
          style={{
            maxWidth: '100%',
            height: 'auto',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            backgroundColor: '#f9fafb'
          }}
        />
        {!status?.streaming && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#6b7280',
            fontSize: '16px',
            fontWeight: '500'
          }}>
            Start streaming to view Windows desktop
          </div>
        )}
      </div>
    </div>
  );
};

export default WindowsDesktopStreaming;