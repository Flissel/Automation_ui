/**
 * TRAE Visual Workflow System - Webhook Trigger Node Component
 * 
 * A React Flow node for webhook-based triggers
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  Globe, 
  Play, 
  Pause, 
  Settings, 
  Copy, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Hash
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface WebhookTriggerNodeData {
  id: string;
  label: string;
  webhookUrl?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  authentication?: {
    type: 'none' | 'bearer' | 'basic' | 'api_key';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
  responseFormat?: 'json' | 'xml' | 'text';
  timeout?: number;
  retries?: number;
  isActive?: boolean;
  lastTriggered?: string;
  triggerCount?: number;
}

interface WebhookRequest {
  id: string;
  timestamp: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  ip: string;
  userAgent: string;
}

const WebhookTriggerNode: React.FC<NodeProps<WebhookTriggerNodeData>> = ({ 
  data, 
  id, 
  selected 
}) => {
  // State
  const [isActive, setIsActive] = useState(data.isActive || false);
  const [showSettings, setShowSettings] = useState(false);
  const [recentRequests, setRecentRequests] = useState<WebhookRequest[]>([]);
  const [localConfig, setLocalConfig] = useState({
    method: data.method || 'POST',
    headers: data.headers || {},
    authentication: data.authentication || { type: 'none' as const },
    responseFormat: data.responseFormat || 'json',
    timeout: data.timeout || 30,
    retries: data.retries || 3
  });
  const [webhookUrl, setWebhookUrl] = useState(data.webhookUrl || '');
  const [triggerCount, setTriggerCount] = useState(data.triggerCount || 0);
  const [lastTriggered, setLastTriggered] = useState(data.lastTriggered);

  // Generate webhook URL if not exists
  useEffect(() => {
    if (!webhookUrl) {
      const generatedUrl = `https://api.trae.ai/webhooks/${id}`;
      setWebhookUrl(generatedUrl);
    }
  }, [id, webhookUrl]);

  // Simulate webhook activity
  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        // Simulate random webhook requests
        if (Math.random() < 0.1) { // 10% chance every second
          const newRequest: WebhookRequest = {
            id: `req-${Date.now()}`,
            timestamp: new Date().toISOString(),
            method: localConfig.method,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'External-Service/1.0',
              ...localConfig.headers
            },
            body: {
              event: 'test_event',
              data: { message: 'Hello from webhook!' },
              timestamp: new Date().toISOString()
            },
            ip: '192.168.1.' + Math.floor(Math.random() * 255),
            userAgent: 'External-Service/1.0'
          };
          
          setRecentRequests(prev => [newRequest, ...prev.slice(0, 9)]); // Keep last 10
          setTriggerCount(prev => prev + 1);
          setLastTriggered(new Date().toISOString());
          
          toast.success('Webhook triggered!');
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isActive, localConfig]);

  // Toggle webhook active state
  const toggleWebhook = useCallback(() => {
    setIsActive(prev => {
      const newState = !prev;
      toast.success(newState ? 'Webhook activated' : 'Webhook deactivated');
      return newState;
    });
  }, []);

  // Copy webhook URL
  const copyWebhookUrl = useCallback(() => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook URL copied to clipboard!');
  }, [webhookUrl]);

  // Test webhook
  const testWebhook = useCallback(() => {
    const testRequest: WebhookRequest = {
      id: `test-${Date.now()}`,
      timestamp: new Date().toISOString(),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TRAE-Test/1.0'
      },
      body: {
        event: 'test',
        message: 'Test webhook request from TRAE'
      },
      ip: '127.0.0.1',
      userAgent: 'TRAE-Test/1.0'
    };
    
    setRecentRequests(prev => [testRequest, ...prev.slice(0, 9)]);
    setTriggerCount(prev => prev + 1);
    setLastTriggered(new Date().toISOString());
    
    toast.success('Test webhook sent!');
  }, []);

  return (
    <Card className={`min-w-[320px] ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-500" />
            <CardTitle className="text-sm font-medium">{data.label}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="h-6 w-6 p-0"
            >
              <Settings className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Webhook URL */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Webhook URL</Label>
          <div className="flex gap-1">
            <Input
              value={webhookUrl}
              readOnly
              className="text-xs font-mono"
              placeholder="Generating webhook URL..."
            />
            <Button
              variant="outline"
              size="sm"
              onClick={copyWebhookUrl}
              className="px-2"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Status and Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Hash className="h-3 w-3 text-gray-500" />
              <span className="text-gray-600">Triggers:</span>
              <span className="font-medium">{triggerCount}</span>
            </div>
            {lastTriggered && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-gray-500" />
                <span className="text-gray-600">Last:</span>
                <span className="font-medium">
                  {new Date(lastTriggered).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-1">
            {isActive ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button
            variant={isActive ? 'destructive' : 'default'}
            size="sm"
            onClick={toggleWebhook}
            className="flex-1 text-xs"
          >
            {isActive ? (
              <>
                <Pause className="h-3 w-3 mr-1" />
                Deactivate
              </>
            ) : (
              <>
                <Play className="h-3 w-3 mr-1" />
                Activate
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={testWebhook}
            className="text-xs"
          >
            Test
          </Button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="space-y-3 pt-2 border-t">
            <div className="space-y-2">
              <Label className="text-xs font-medium">HTTP Method</Label>
              <Select
                value={localConfig.method}
                onValueChange={(value: 'GET' | 'POST' | 'PUT' | 'DELETE') => 
                  setLocalConfig(prev => ({ ...prev, method: value }))
                }
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Response Format</Label>
              <Select
                value={localConfig.responseFormat}
                onValueChange={(value: 'json' | 'xml' | 'text') => 
                  setLocalConfig(prev => ({ ...prev, responseFormat: value }))
                }
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="xml">XML</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Timeout (s)</Label>
                <Input
                  type="number"
                  value={localConfig.timeout}
                  onChange={(e) => setLocalConfig(prev => ({ 
                    ...prev, 
                    timeout: parseInt(e.target.value) || 30 
                  }))}
                  className="text-xs"
                  min="1"
                  max="300"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Retries</Label>
                <Input
                  type="number"
                  value={localConfig.retries}
                  onChange={(e) => setLocalConfig(prev => ({ 
                    ...prev, 
                    retries: parseInt(e.target.value) || 3 
                  }))}
                  className="text-xs"
                  min="0"
                  max="10"
                />
              </div>
            </div>
          </div>
        )}

        {/* Recent Requests */}
        {recentRequests.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs font-medium">Recent Requests</Label>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {recentRequests.slice(0, 3).map((request) => (
                <div key={request.id} className="text-xs p-2 bg-gray-50 rounded border">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{request.method}</span>
                    <span className="text-gray-500">
                      {new Date(request.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-gray-600 truncate">
                    From: {request.ip}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="webhook_output"
        className="w-3 h-3 bg-blue-500"
      />
    </Card>
  );
};

export default WebhookTriggerNode;