import React, { useState, useEffect } from 'react';
import { X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Node } from '@xyflow/react';

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
      <Card className="w-full max-w-md mx-4 p-6 bg-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Configure Node</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

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
