import React, { useState, useEffect } from 'react';
import { X, Settings, Webhook, Clock, Play, Square, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Node } from '@xyflow/react';
import { WebhookExecutionHistory } from './WebhookExecutionHistory';

interface NodeData extends Record<string, unknown> {
  label: string;
  type: string;
  status?: 'idle' | 'running' | 'completed' | 'error';
  config?: Record<string, any>;
  executionResult?: any;
}

interface NodeConfigurationModalProps {
  node: Node<NodeData> | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (nodeId: string, newData: Partial<NodeData>) => void;
  onDelete?: (nodeId: string) => void;
}

export const NodeConfigurationModal: React.FC<NodeConfigurationModalProps> = ({
  node,
  isOpen,
  onClose,
  onSave,
  onDelete
}) => {
  const [label, setLabel] = useState('');
  const [config, setConfig] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState('config');
  const [serviceStatus, setServiceStatus] = useState('stopped');
  
  // Mock execution history for webhook triggers
  const [executionHistory] = useState([
    {
      id: '1',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      method: 'POST',
      path: '/webhook',
      status: 'success' as const,
      duration: 145,
      payload: { message: 'Hello World', userId: 123 }
    },
    {
      id: '2', 
      timestamp: new Date(Date.now() - 600000).toISOString(),
      method: 'POST',
      path: '/webhook',
      status: 'error' as const,
      duration: 89,
      error: 'Invalid authentication token'
    }
  ]);

  useEffect(() => {
    if (node) {
      setLabel(node.data.label || '');
      setConfig(node.data.config || {});
      setServiceStatus(node.data.config?.status || 'stopped');
    }
  }, [node]);

  if (!isOpen || !node) return null;

  const handleSave = () => {
    onSave(node.id, {
      label,
      config
    });
    onClose();
  };

  const handleDelete = () => {
    if (onDelete && node) {
      onDelete(node.id);
      onClose();
    }
  };

  // Service Management for WebSocket Config
  const handleServiceAction = (action: 'start' | 'stop' | 'restart') => {
    const newStatus = action === 'start' ? 'starting' : action === 'stop' ? 'stopped' : 'starting';
    setServiceStatus(newStatus);
    setConfig({ ...config, status: newStatus });
    
    // Simulate service start/stop
    setTimeout(() => {
      const finalStatus = action === 'stop' ? 'stopped' : 'running';
      setServiceStatus(finalStatus);
      setConfig(prev => ({ ...prev, status: finalStatus }));
    }, 2000);
  };

  const renderConfigFields = () => {
    switch (node.data.type) {
      case 'manual_trigger':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="button_text">Button Text</Label>
              <Input
                id="button_text"
                value={config.button_text || ''}
                onChange={(e) => setConfig({ ...config, button_text: e.target.value })}
                placeholder="Start Workflow"
                className="mt-1"
              />
            </div>
          </div>
        );
        
      case 'webhook_trigger':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="endpoint_path">Endpoint Path</Label>
              <Input
                id="endpoint_path"
                value={config.path || '/webhook'}
                onChange={(e) => setConfig({ ...config, path: e.target.value })}
                placeholder="/webhook"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="http_methods">HTTP Method</Label>
              <select
                id="http_methods"
                value={config.method || 'POST'}
                onChange={(e) => setConfig({ ...config, method: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-input rounded-md"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
          </div>
        );
        
      case 'websocket_config':
        return (
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">Service Status</h4>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    serviceStatus === 'running' ? 'bg-green-500' :
                    serviceStatus === 'starting' ? 'bg-yellow-500 animate-pulse' :
                    serviceStatus === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                  }`} />
                  <span className="text-sm capitalize">{serviceStatus}</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleServiceAction('start')}
                  disabled={serviceStatus === 'running' || serviceStatus === 'starting'}
                >
                  <Play className="w-3 h-3 mr-1" />
                  Start
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleServiceAction('stop')}
                  disabled={serviceStatus === 'stopped'}
                >
                  <Square className="w-3 h-3 mr-1" />
                  Stop
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleServiceAction('restart')}
                  disabled={serviceStatus === 'stopped'}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Restart
                </Button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="url">WebSocket URL</Label>
              <Input
                id="url"
                value={config.url || 'ws://localhost'}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                placeholder="ws://localhost"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                type="number"
                value={config.port || 8080}
                onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="service_command">Service Start Command</Label>
              <Input
                id="service_command"
                value={config.service_command || ''}
                onChange={(e) => setConfig({ ...config, service_command: e.target.value })}
                placeholder="node websocket-server.js"
                className="mt-1"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="auto_start"
                checked={config.auto_start || false}
                onChange={(e) => setConfig({ ...config, auto_start: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="auto_start">Auto Start Service</Label>
            </div>
            
            <div>
              <Label htmlFor="health_check_url">Health Check URL</Label>
              <Input
                id="health_check_url"
                value={config.health_check_url || ''}
                onChange={(e) => setConfig({ ...config, health_check_url: e.target.value })}
                placeholder="http://localhost:8080/health"
                className="mt-1"
              />
            </div>
          </div>
        );

      case 'live_desktop':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="width">Width</Label>
                <Input
                  id="width"
                  type="number"
                  value={config.width || 1200}
                  onChange={(e) => setConfig({ ...config, width: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  type="number"
                  value={config.height || 900}
                  onChange={(e) => setConfig({ ...config, height: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="fps">FPS: {config.fps || 30}</Label>
              <input
                type="range"
                id="fps"
                min="1"
                max="60"
                value={config.fps || 30}
                onChange={(e) => setConfig({ ...config, fps: parseInt(e.target.value) })}
                className="w-full mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="quality">Quality: {config.quality || 80}%</Label>
              <input
                type="range"
                id="quality"
                min="10"
                max="100"
                value={config.quality || 80}
                onChange={(e) => setConfig({ ...config, quality: parseInt(e.target.value) })}
                className="w-full mt-1"
              />
            </div>
          </div>
        );

      case 'click_action':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="x">X Coordinate</Label>
                <Input
                  id="x"
                  type="number"
                  value={config.x || 0}
                  onChange={(e) => setConfig({ ...config, x: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="y">Y Coordinate</Label>
                <Input
                  id="y"
                  type="number"
                  value={config.y || 0}
                  onChange={(e) => setConfig({ ...config, y: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="button">Mouse Button</Label>
              <select
                id="button"
                value={config.button || 'left'}
                onChange={(e) => setConfig({ ...config, button: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-input rounded-md"
              >
                <option value="left">Left Click</option>
                <option value="right">Right Click</option>
                <option value="middle">Middle Click</option>
              </select>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="genericConfig">Configuration (JSON)</Label>
              <Textarea
                id="genericConfig"
                value={JSON.stringify(config, null, 2)}
                onChange={(e) => {
                  try {
                    setConfig(JSON.parse(e.target.value));
                  } catch {
                    // Invalid JSON, keep the text for user to fix
                  }
                }}
                placeholder="{}"
                className="mt-1"
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 p-6 bg-card max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Configure {node.data.label}</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mb-4">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'config'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Configuration
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'info'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Information
          </button>
          {node.data.type === 'webhook_trigger' && (
            <button
              onClick={() => setActiveTab('executions')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'executions'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Webhook className="w-4 h-4 inline mr-1" />
              Executions
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'config' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="nodeLabel">Node Label</Label>
                <Input
                  id="nodeLabel"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Enter node label..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Node Type</Label>
                <p className="text-sm font-medium capitalize">{String(node.data.type).replace('_', ' ')}</p>
              </div>

              {renderConfigFields()}
            </div>
          )}

          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <h3 className="font-medium mb-2">Node Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <span className="ml-2 font-mono">{String(node.data.type)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <span className="ml-2 capitalize">{String(node.data.status || 'idle')}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Node ID:</span>
                    <span className="ml-2 font-mono text-xs">{node.id}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'executions' && node.data.type === 'webhook_trigger' && (
            <div className="space-y-4">
              <WebhookExecutionHistory 
                executions={executionHistory}
                onClearHistory={() => {
                  console.log('Clear execution history');
                }}
              />
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6">
          <div>
            {onDelete && (
              <Button variant="destructive" onClick={handleDelete}>
                Delete Node
              </Button>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
