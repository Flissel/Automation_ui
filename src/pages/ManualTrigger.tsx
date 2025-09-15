import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { 
  Play, 
  ArrowLeft,
  Settings,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { SIMPLIFIED_NODE_TEMPLATES } from "@/config/simplifiedNodeTemplates";

/**
 * Manual Trigger Node Configuration Page
 * 
 * Provides a dedicated interface for configuring manual trigger nodes
 * that can be used to start workflow executions manually.
 * 
 * Features:
 * - Button text customization
 * - Real-time configuration preview
 * - Save/Load configuration
 * - Integration with workflow system
 */
const ManualTrigger = () => {
  const [user, setUser] = useState(authService.getCurrentUser());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState({
    button_text: 'Start Workflow'
  });
  const [isConfigValid, setIsConfigValid] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get the manual trigger template for reference
  const nodeTemplate = SIMPLIFIED_NODE_TEMPLATES.manual_trigger;

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
      const savedConfig = localStorage.getItem('manual_trigger_config');
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
   * Validate current configuration against schema
   */
  const validateConfiguration = () => {
    const schema = nodeTemplate.configSchema;
    let valid = true;

    // Check required fields
    if (schema.button_text?.required && !config.button_text?.trim()) {
      valid = false;
    }

    // Check minimum length
    if (config.button_text && config.button_text.length < 1) {
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
      localStorage.setItem('manual_trigger_config', JSON.stringify(config));
      
      toast({
        title: "Configuration Saved",
        description: "Manual trigger configuration has been saved successfully.",
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
   * Test trigger execution (simulation)
   */
  const testTrigger = () => {
    toast({
      title: "Trigger Test",
      description: `Trigger executed with button text: "${config.button_text}"`
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
      <div className="max-w-4xl mx-auto space-y-6">
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
                Manual Trigger Configuration
              </h1>
              <p className="text-muted-foreground mt-1">
                Configure manual workflow trigger settings
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Trigger Configuration</span>
              </CardTitle>
              <CardDescription>
                {nodeTemplate.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Button Text Configuration */}
              <div className="space-y-2">
                <Label htmlFor="button_text">
                  {nodeTemplate.configSchema.button_text.label}
                </Label>
                <Input
                  id="button_text"
                  type="text"
                  value={config.button_text}
                  onChange={(e) => handleInputChange('button_text', e.target.value)}
                  placeholder="Enter button text"
                  className={!isConfigValid && !config.button_text?.trim() ? 'border-red-500' : ''}
                />
                <p className="text-sm text-muted-foreground">
                  Text displayed on the trigger button in workflows
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
              </div>
            </CardContent>
          </Card>

          {/* Preview Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Play className="w-5 h-5" />
                <span>Trigger Preview</span>
              </CardTitle>
              <CardDescription>
                Preview how your trigger will appear in workflows
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Trigger Button Preview */}
              <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Trigger Button Preview:
                  </div>
                  <Button
                    onClick={testTrigger}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                    size="lg"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {config.button_text || 'Start Workflow'}
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    Click to test trigger execution
                  </div>
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

              {/* Usage Instructions */}
              <div className="space-y-2">
                <h4 className="font-medium">Usage Instructions</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Use this trigger to manually start workflow executions</li>
                  <li>• Connect the output to interface nodes or action nodes</li>
                  <li>• Customize the button text to match your workflow purpose</li>
                  <li>• Test the trigger using the preview button above</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common actions for manual trigger configuration
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
                onClick={() => window.open('/docs/manual-trigger', '_blank')}
              >
                View Documentation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManualTrigger;