import React, { useState, useEffect } from 'react';
import { X, Settings, Webhook, Clock, Play, Square, RefreshCw, Info, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Node } from '@xyflow/react';
import { WebhookExecutionHistory } from './WebhookExecutionHistory';
import { SIMPLIFIED_NODE_TEMPLATES } from '@/config/simplifiedNodeTemplates';

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
  
  // Get node template to access configSchema
  const nodeTemplate = node?.data?.type ? SIMPLIFIED_NODE_TEMPLATES[node.data.type as keyof typeof SIMPLIFIED_NODE_TEMPLATES] : null;

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
    if (node && nodeTemplate) {
      setLabel(node.data.label || '');
      // Initialize config with defaults if not set
      const currentConfig = node.data.config || {};
      const defaultConfig = nodeTemplate.defaultConfig || {};
      setConfig({ ...defaultConfig, ...currentConfig });
      setServiceStatus(node.data.config?.status || 'stopped');
    }
  }, [node, nodeTemplate]);

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

  // Dynamic configuration field renderer based on configSchema
  const renderConfigField = (fieldKey: string, fieldConfig: any) => {
    const value = config[fieldKey];
    
    switch (fieldConfig.type) {
      case 'string':
        return (
          <div key={fieldKey}>
            <Label htmlFor={fieldKey}>{fieldConfig.label || fieldKey}</Label>
            <Input
              id={fieldKey}
              value={value || fieldConfig.default || ''}
              onChange={(e) => setConfig({ ...config, [fieldKey]: e.target.value })}
              placeholder={fieldConfig.placeholder || `Enter ${fieldConfig.label || fieldKey}`}
              required={fieldConfig.required}
            />
            {fieldConfig.description && (
              <p className="text-xs text-muted-foreground mt-1">{fieldConfig.description}</p>
            )}
          </div>
        );
      
      case 'number':
        return (
          <div key={fieldKey}>
            <Label htmlFor={fieldKey}>{fieldConfig.label || fieldKey}</Label>
            <Input
              id={fieldKey}
              type="number"
              value={value || fieldConfig.default || 0}
              onChange={(e) => setConfig({ ...config, [fieldKey]: parseInt(e.target.value) || 0 })}
              min={fieldConfig.min}
              max={fieldConfig.max}
              required={fieldConfig.required}
            />
            {fieldConfig.description && (
              <p className="text-xs text-muted-foreground mt-1">{fieldConfig.description}</p>
            )}
          </div>
        );
      
      case 'boolean':
        return (
          <div key={fieldKey} className="flex items-center space-x-2">
            <Checkbox
              id={fieldKey}
              checked={value !== undefined ? value : fieldConfig.default || false}
              onCheckedChange={(checked) => setConfig({ ...config, [fieldKey]: checked })}
            />
            <Label htmlFor={fieldKey}>{fieldConfig.label || fieldKey}</Label>
            {fieldConfig.description && (
              <p className="text-xs text-muted-foreground ml-6">{fieldConfig.description}</p>
            )}
          </div>
        );
      
      case 'select':
        return (
          <div key={fieldKey}>
            <Label htmlFor={fieldKey}>{fieldConfig.label || fieldKey}</Label>
            <Select
              value={value || fieldConfig.default}
              onValueChange={(newValue) => setConfig({ ...config, [fieldKey]: newValue })}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${fieldConfig.label || fieldKey}`} />
              </SelectTrigger>
              <SelectContent>
                {fieldConfig.options?.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldConfig.description && (
              <p className="text-xs text-muted-foreground mt-1">{fieldConfig.description}</p>
            )}
          </div>
        );
      
      case 'object':
        return (
          <div key={fieldKey}>
            <Label htmlFor={fieldKey}>{fieldConfig.label || fieldKey}</Label>
            <Textarea
              id={fieldKey}
              value={JSON.stringify(value || fieldConfig.default || {}, null, 2)}
              onChange={(e) => {
                try {
                  setConfig({ ...config, [fieldKey]: JSON.parse(e.target.value) });
                } catch {
                  // Invalid JSON, keep raw value for now
                }
              }}
              placeholder={`Enter ${fieldConfig.label || fieldKey} as JSON`}
              rows={4}
            />
            {fieldConfig.description && (
              <p className="text-xs text-muted-foreground mt-1">{fieldConfig.description}</p>
            )}
          </div>
        );
      
      default:
        return (
          <div key={fieldKey}>
            <Label htmlFor={fieldKey}>{fieldConfig.label || fieldKey}</Label>
            <Input
              id={fieldKey}
              value={value || fieldConfig.default || ''}
              onChange={(e) => setConfig({ ...config, [fieldKey]: e.target.value })}
              placeholder={`Enter ${fieldConfig.label || fieldKey}`}
            />
          </div>
        );
    }
  };

  // Function to render configuration fields based on node template
  const renderConfigFields = () => {
    if (!node || !nodeTemplate?.configSchema) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No configuration options available for this node.</p>
        </div>
      );
    }

    const configSchema = nodeTemplate.configSchema;
    const fields = Object.entries(configSchema).filter(([_, fieldConfig]: [string, any]) => !fieldConfig.hidden);

    if (fields.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">This node has no configurable options.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {fields.map(([fieldKey, fieldConfig]) => renderConfigField(fieldKey, fieldConfig))}
      </div>
    );
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
