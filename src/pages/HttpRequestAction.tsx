import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { ArrowLeft, Save, RotateCcw, Play, Globe, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// HTTP Request Action Configuration Interface
interface HttpRequestActionConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: Record<string, string>;
  body?: string;
  timeout: number;
  follow_redirects: boolean;
}

// Default configuration for HTTP requests
const defaultConfig: HttpRequestActionConfig = {
  url: '',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: '',
  timeout: 30000,
  follow_redirects: true
};

const HttpRequestAction: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<HttpRequestActionConfig>(defaultConfig);

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">HTTP Request Action</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            HTTP Request Configuration
          </CardTitle>
          <CardDescription>
            Configure HTTP request parameters for your workflow action
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                placeholder="https://api.example.com/endpoint"
                value={config.url}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">Method</Label>
              <Select
                value={config.method}
                onValueChange={(value: 'GET' | 'POST' | 'PUT' | 'DELETE') =>
                  setConfig({ ...config, method: value })
                }
              >
                <SelectTrigger>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Request Body</Label>
            <Textarea
              id="body"
              placeholder="Request body (JSON, XML, etc.)"
              value={config.body || ''}
              onChange={(e) => setConfig({ ...config, body: e.target.value })}
              rows={6}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              onClick={() => {
                // Save configuration logic
                toast.success('Configuration saved successfully!');
              }}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Configuration
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfig(defaultConfig)}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                // Test request logic
                toast.info('Testing HTTP request...');
              }}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Test Request
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HttpRequestAction;