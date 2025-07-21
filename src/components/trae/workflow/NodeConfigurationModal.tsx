import React, { useState, useEffect } from 'react';
import { X, Settings, Webhook, Clock } from 'lucide-react';
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

  const renderConfigFields = () => {
    switch (node.data.type) {
      case 'manual_trigger':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={config.description || ''}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                placeholder="Describe what triggers this workflow..."
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
                value={config.endpoint_path || '/webhook'}
                onChange={(e) => setConfig({ ...config, endpoint_path: e.target.value })}
                placeholder="/webhook"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="http_methods">HTTP Methods</Label>
              <select
                id="http_methods"
                value={config.http_methods?.[0] || 'POST'}
                onChange={(e) => setConfig({ ...config, http_methods: [e.target.value] })}
                className="mt-1 w-full px-3 py-2 border border-input rounded-md"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div>
              <Label htmlFor="authentication">Authentication</Label>
              <select
                id="authentication"
                value={config.authentication || 'none'}
                onChange={(e) => setConfig({ ...config, authentication: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-input rounded-md"
              >
                <option value="none">None</option>
                <option value="api_key">API Key</option>
                <option value="bearer_token">Bearer Token</option>
              </select>
            </div>
            {config.authentication === 'api_key' && (
              <div>
                <Label htmlFor="api_key">API Key</Label>
                <Input
                  id="api_key"
                  type="password"
                  value={config.api_key || ''}
                  onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                  placeholder="Enter API key..."
                  className="mt-1"
                />
              </div>
            )}
          </div>
        );
        
      case 'websocket_config':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="url">WebSocket URL</Label>
              <Input
                id="url"
                value={config.url || 'ws://localhost:8080'}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                placeholder="ws://localhost:8080"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="protocol">Protocol</Label>
              <Input
                id="protocol"
                value={config.protocol || ''}
                onChange={(e) => setConfig({ ...config, protocol: e.target.value })}
                placeholder="Optional protocol"
                className="mt-1"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="reconnect"
                checked={config.reconnect !== false}
                onChange={(e) => setConfig({ ...config, reconnect: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="reconnect">Auto Reconnect</Label>
            </div>
            <div>
              <Label htmlFor="timeout">Connection Timeout (ms)</Label>
              <Input
                id="timeout"
                type="number"
                value={config.timeout || 30000}
                onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value) })}
                className="mt-1"
              />
            </div>
          </div>
        );

      case 'click_action':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="selector">CSS Selector</Label>
              <Input
                id="selector"
                value={config.selector || ''}
                onChange={(e) => setConfig({ ...config, selector: e.target.value })}
                placeholder="e.g., .button-class or #button-id"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="waitTime">Wait Time (ms)</Label>
              <Input
                id="waitTime"
                type="number"
                value={config.waitTime || 1000}
                onChange={(e) => setConfig({ ...config, waitTime: parseInt(e.target.value) })}
                className="mt-1"
              />
            </div>
          </div>
        );

      case 'http_request':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={config.url || ''}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                placeholder="https://api.example.com/endpoint"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="method">Method</Label>
              <select
                id="method"
                value={config.method || 'GET'}
                onChange={(e) => setConfig({ ...config, method: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-input rounded-md"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div>
              <Label htmlFor="headers">Headers (JSON)</Label>
              <Textarea
                id="headers"
                value={JSON.stringify(config.headers || {}, null, 2)}
                onChange={(e) => {
                  try {
                    setConfig({ ...config, headers: JSON.parse(e.target.value) });
                  } catch {
                    // Invalid JSON, keep the text for user to fix
                  }
                }}
                placeholder='{"Content-Type": "application/json"}'
                className="mt-1"
              />
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
                <p className="text-sm font-medium capitalize">{node.data.type.replace('_', ' ')}</p>
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
                    <span className="ml-2 font-mono">{node.data.type}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <span className="ml-2 capitalize">{node.data.status || 'idle'}</span>
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
