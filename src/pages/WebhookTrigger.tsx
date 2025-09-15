import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { 
  Webhook, 
  ArrowLeft,
  Settings,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  History
} from "lucide-react";
import { SIMPLIFIED_NODE_TEMPLATES } from "@/config/simplifiedNodeTemplates";

/**
 * Webhook Trigger Node Configuration Page
 * 
 * Provides a dedicated interface for configuring webhook trigger nodes
 * that can receive HTTP requests to start workflow executions.
 * 
 * Features:
 * - Webhook path and method configuration
 * - URL generation and copying
 * - Execution history tracking
 * - Real-time configuration preview
 * - Save/Load configuration
 */
const WebhookTrigger = () => {
  const [user, setUser] = useState(authService.getCurrentUser());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState({
    path: '/webhook/trigger',
    method: 'POST'
  });
  const [isConfigValid, setIsConfigValid] = useState(true);
  const [executionHistory, setExecutionHistory] = useState([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get the webhook trigger template for reference
  const nodeTemplate = SIMPLIFIED_NODE_TEMPLATES.webhook_trigger;

  useEffect(() => {
    // Check authentication
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    
    if (!currentUser) {
      navigate("/auth");
      return;
    }

    // Load saved configuration if exists
    loadConfiguration();
    loadExecutionHistory();
  }, [navigate]);

  useEffect(() => {
    // Validate configuration
    validateConfiguration();
  }, [config]);

  /**
   * Load saved configuration from localStorage or use defaults
   */
  const loadConfiguration = () => {
    try {
      const savedConfig = localStorage.getItem('webhook_trigger_config');
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig({ ...nodeTemplate.defaultConfig, ...parsedConfig });
      } else {
        setConfig(nodeTemplate.defaultConfig);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      setConfig(nodeTemplate.defaultConfig);
      toast({
        title: "Configuration Error",
        description: "Failed to load saved configuration. Using defaults.",
        variant: "destructive",
      });
    }
  };

  /**
   * Load execution history from localStorage
   */
  const loadExecutionHistory = () => {
    try {
      const savedHistory = localStorage.getItem('webhook_execution_history');
      if (savedHistory) {
        setExecutionHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error('Error loading execution history:', error);
    }
  };

  /**
   * Validate current configuration against schema
   */
  const validateConfiguration = () => {
    const schema = nodeTemplate.configSchema;
    let valid = true;

    // Check required fields
    if (schema.path?.required && !config.path?.trim()) {
      valid = false;
    }
    if (schema.method?.required && !config.method?.trim()) {
      valid = false;
    }

    // Check path format (should start with /)
    if (config.path && !config.path.startsWith('/')) {
      valid = false;
    }

    setIsConfigValid(valid);
  };

  /**
   * Save configuration to localStorage
   */
  const saveConfiguration = async () => {
    if (!isConfigValid) {
      toast({
        title: "Invalid Configuration",
        description: "Please fix configuration errors before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      localStorage.setItem('webhook_trigger_config', JSON.stringify(config));
      
      toast({
        title: "Configuration Saved",
        description: "Webhook trigger configuration has been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: "Save Error",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Reset configuration to defaults
   */
  const resetConfiguration = () => {
    setConfig(nodeTemplate.defaultConfig);
    toast({
      title: "Configuration Reset",
      description: "Configuration has been reset to defaults.",
    });
  };

  /**
   * Generate webhook URL
   */
  const getWebhookUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/api${config.path}`;
  };

  /**
   * Copy webhook URL to clipboard
   */
  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(getWebhookUrl());
      toast({
        title: "URL Copied",
        description: "Webhook URL has been copied to clipboard.",
      });
    } catch (error) {
      console.error('Error copying URL:', error);
      toast({
        title: "Copy Error",
        description: "Failed to copy URL to clipboard.",
        variant: "destructive",
      });
    }
  };

  /**
   * Test webhook (simulation)
   */
  const testWebhook = () => {
    const execution = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      method: config.method,
      path: config.path,
      status: 'success'
    };
    
    const newHistory = [execution, ...executionHistory.slice(0, 9)];
    setExecutionHistory(newHistory);
    localStorage.setItem('webhook_execution_history', JSON.stringify(newHistory));
    
    toast({
      title: "Webhook Test",
      description: `Webhook triggered: ${config.method} ${config.path}`,
    });
  };

  /**
   * Handle input changes
   */
  const handleInputChange = (field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Webhook Trigger Configuration
              </h1>
              <p className="text-muted-foreground mt-1">
                Configure HTTP webhook endpoints for workflow triggers
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isConfigValid ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <span className="text-sm text-muted-foreground">
              {isConfigValid ? 'Valid Configuration' : 'Invalid Configuration'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Webhook Configuration</span>
              </CardTitle>
              <CardDescription>
                {nodeTemplate.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Webhook Path Configuration */}
              <div className="space-y-2">
                <Label htmlFor="path">
                  {nodeTemplate.configSchema.path.label}
                </Label>
                <Input
                  id="path"
                  type="text"
                  value={config.path}
                  onChange={(e) => handleInputChange('path', e.target.value)}
                  placeholder="/webhook/trigger"
                  className={!isConfigValid && (!config.path?.trim() || !config.path.startsWith('/')) ? 'border-red-500' : ''}
                />
                <p className="text-sm text-muted-foreground">
                  URL path for the webhook endpoint (must start with /)
                </p>
              </div>

              {/* HTTP Method Configuration */}
              <div className="space-y-2">
                <Label htmlFor="method">
                  {nodeTemplate.configSchema.method.label}
                </Label>
                <Select
                  value={config.method}
                  onValueChange={(value) => handleInputChange('method', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select HTTP method" />
                  </SelectTrigger>
                  <SelectContent>
                    {nodeTemplate.configSchema.method.options.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  HTTP method that will trigger the webhook
                </p>
              </div>

              {/* Generated Webhook URL */}
              <div className="space-y-2">
                <Label>Generated Webhook URL</Label>
                <div className="flex space-x-2">
                  <Input
                    value={getWebhookUrl()}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyWebhookUrl}
                    className="flex items-center space-x-1"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use this URL to trigger workflows from external systems
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={saveConfiguration}
                  disabled={!isConfigValid || isSaving}
                  className="flex items-center space-x-2"
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={resetConfiguration}
                >
                  Reset to Defaults
                </Button>
                <Button
                  variant="outline"
                  onClick={testWebhook}
                  className="flex items-center space-x-2"
                >
                  <Webhook className="w-4 h-4" />
                  <span>Test Webhook</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Execution History Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <History className="w-5 h-5" />
                <span>Execution History</span>
              </CardTitle>
              <CardDescription>
                Recent webhook executions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {executionHistory.length > 0 ? (
                <div className="space-y-2">
                  {executionHistory.map((execution, index) => (
                    <div key={execution.id} className="border rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant={execution.status === 'success' ? 'default' : 'destructive'}>
                          {execution.method}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(execution.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-sm font-mono">
                        {execution.path}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Webhook className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No executions yet</p>
                  <p className="text-xs">Test the webhook to see history</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview and Documentation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Preview Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Webhook className="w-5 h-5" />
                <span>Webhook Preview</span>
              </CardTitle>
              <CardDescription>
                Preview how your webhook will work
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* cURL Example */}
              <div className="space-y-2">
                <Label>cURL Example</Label>
                <div className="bg-muted p-3 rounded-lg font-mono text-sm overflow-x-auto">
                  {`curl -X ${config.method} \\
  "${getWebhookUrl()}" \\
  -H "Content-Type: application/json" \\
  -d '{"data": "your_payload"}'`}
                </div>
              </div>

              {/* Node Information */}
              <div className="space-y-3">
                <h4 className="font-medium">Node Information</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <span className="ml-2 font-mono">{nodeTemplate.type}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Category:</span>
                    <span className="ml-2 capitalize">{nodeTemplate.category}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Outputs:</span>
                    <span className="ml-2">{nodeTemplate.outputs?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Dependencies:</span>
                    <span className="ml-2">{nodeTemplate.dependencies?.length || 0}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Instructions</CardTitle>
              <CardDescription>
                How to use webhook triggers effectively
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Setup Steps</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>1. Configure the webhook path and HTTP method</li>
                    <li>2. Copy the generated webhook URL</li>
                    <li>3. Configure your external system to call this URL</li>
                    <li>4. Test the webhook to ensure it works</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Best Practices</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Use descriptive paths like /webhook/order-created</li>
                    <li>• Choose appropriate HTTP methods (POST for data)</li>
                    <li>• Monitor execution history for debugging</li>
                    <li>• Connect outputs to interface or action nodes</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common actions for webhook trigger configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/workflow')}
              >
                Go to Workflow Editor
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                Back to Dashboard
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('/docs/webhook-trigger', '_blank')}
                className="flex items-center space-x-1"
              >
                <ExternalLink className="w-4 h-4" />
                <span>View Documentation</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WebhookTrigger;