import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Monitor, Grid, Maximize2, Settings, Workflow, Database } from 'lucide-react';
import { LiveDesktopInterface } from '@/components/trae/LiveDesktopInterface';
import { WorkflowResult } from '@/components/trae/WorkflowResult';

// ============================================================================
// DEMO SCENARIOS
// ============================================================================

interface DemoScenario {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  websocketConfig: any;
  triggers: any[];
  actions: any[];
  useCase: string;
}

const demoScenarios: DemoScenario[] = [
  {
    id: 'monitoring',
    title: 'System Monitoring',
    description: 'Automated monitoring with filesystem data collection',
    icon: <Monitor className="w-6 h-6" />,
    websocketConfig: {
      url: 'ws://localhost',
      port: 8080,
      autoReconnect: true,
      enableFilesystemBridge: true,
      dataDirectory: './monitoring-data'
    },
    triggers: [
      {
        id: 'schedule-trigger',
        type: 'schedule_trigger',
        config: { interval: 30000, enabled: true },
        label: 'Every 30 seconds'
      }
    ],
    actions: [
      {
        id: 'click-action',
        type: 'click_action',
        config: { x: 100, y: 100, clickType: 'left' },
        label: 'Monitor Click'
      },
      {
        id: 'send-to-filesystem-action',
        type: 'send_to_filesystem_action',
        config: {
          output_directory: './monitoring-data',
          filename_template: 'metrics_{timestamp}',
          file_format: 'json',
          include_metadata: true
        },
        label: 'Save Metrics to Filesystem'
      }
    ],
    useCase: 'Continuous monitoring with automated data collection to filesystem'
  },
  {
    id: 'support',
    title: 'Remote Support',
    description: 'Interactive support session with result tracking',
    icon: <Settings className="w-6 h-6" />,
    websocketConfig: {
      url: 'ws://localhost',
      port: 8080,
      autoReconnect: true,
      enableFilesystemBridge: true,
      dataDirectory: './support-data'
    },
    triggers: [
      {
        id: 'manual-trigger',
        type: 'manual_trigger',
        config: { enabled: true },
        label: 'Manual Support Action'
      }
    ],
    actions: [
      {
        id: 'type-action',
        type: 'type_text_action',
        config: { text: 'Support command', delay: 100 },
        label: 'Type Support Command'
      },
      {
        id: 'send-to-filesystem-action',
        type: 'send_to_filesystem_action',
        config: {
          output_directory: './support-data',
          filename_template: 'session_{timestamp}_{id}',
          file_format: 'json',
          include_metadata: true,
          notify_on_success: true
        },
        label: 'Save Session Data'
      }
    ],
    useCase: 'Manual support actions with comprehensive result logging'
  },
  {
    id: 'workflow',
    title: 'Workflow Automation',
    description: 'Complex workflow with multiple actions and result aggregation',
    icon: <Workflow className="w-6 h-6" />,
    websocketConfig: {
      url: 'ws://localhost',
      port: 8080,
      autoReconnect: true,
      enableFilesystemBridge: true,
      dataDirectory: './workflow-data'
    },
    triggers: [
      {
        id: 'webhook-trigger',
        type: 'webhook_trigger',
        config: { path: '/workflow-start', enabled: true },
        label: 'Webhook Trigger'
      }
    ],
    actions: [
      {
        id: 'click-action',
        type: 'click_action',
        config: { x: 200, y: 150, clickType: 'left' },
        label: 'Primary Click'
      },
      {
        id: 'type-action',
        type: 'type_text_action',
        config: { text: 'Automated workflow', delay: 50 },
        label: 'Type Workflow Data'
      },
      {
        id: 'send-to-filesystem-action',
        type: 'send_to_filesystem_action',
        config: {
          output_directory: './workflow-data',
          filename_template: 'workflow_{type}_{timestamp}',
          file_format: 'json',
          create_backup: true,
          retry_on_error: true
        },
        label: 'Save Workflow Results'
      }
    ],
    useCase: 'Multi-step automated workflows with comprehensive result tracking'
  },
  {
    id: 'data-collection',
    title: 'Data Collection',
    description: 'Continuous data collection with filesystem persistence',
    icon: <Database className="w-6 h-6" />,
    websocketConfig: {
      url: 'ws://localhost',
      port: 8080,
      autoReconnect: true,
      enableFilesystemBridge: true,
      dataDirectory: './collection-data'
    },
    triggers: [
      {
        id: 'schedule-trigger',
        type: 'schedule_trigger',
        config: { interval: 60000, enabled: true },
        label: 'Every minute'
      }
    ],
    actions: [
      {
        id: 'data-action',
        type: 'http_request_action',
        config: { url: 'http://localhost:3000/api/data', method: 'GET' },
        label: 'Collect Data'
      },
      {
        id: 'send-to-filesystem-csv',
        type: 'send_to_filesystem_action',
        config: {
          output_directory: './collection-data',
          filename_template: 'data_{timestamp}',
          file_format: 'csv',
          validate_data: true,
          notify_on_success: true
        },
        label: 'Save as CSV'
      },
      {
        id: 'send-to-filesystem-backup',
        type: 'send_to_filesystem_action',
        config: {
          output_directory: './collection-data/backup',
          filename_template: 'backup_{timestamp}',
          file_format: 'json',
          include_metadata: true,
          compress_data: true
        },
        label: 'Create Backup'
      }
    ],
    useCase: 'Automated data collection with filesystem-based persistence and analysis'
  }
];

const LiveDesktop: React.FC = () => {
  const navigate = useNavigate();
  const [selectedScenario, setSelectedScenario] = useState<string>('monitoring');
  const [viewMode, setViewMode] = useState<'interface' | 'results' | 'combined'>('interface');
  const [interfaceStatus, setInterfaceStatus] = useState<any>({});
  const [resultData, setResultData] = useState<any[]>([]);

  const currentScenario = demoScenarios.find(s => s.id === selectedScenario) || demoScenarios[0];

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleInterfaceStatusChange = (status: any) => {
    setInterfaceStatus(status);
  };

  const handleResultUpdate = (results: any[]) => {
    setResultData(results);
  };

  const handleError = (component: string, error: string) => {
    console.error(`${component} error:`, error);
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderScenarioSelector = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Workflow Scenarios</CardTitle>
        <CardDescription>Choose a workflow configuration for your use case</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {demoScenarios.map((scenario) => (
            <Button
              key={scenario.id}
              variant={selectedScenario === scenario.id ? "default" : "outline"}
              className="h-auto p-4 flex-col items-start space-y-2"
              onClick={() => setSelectedScenario(scenario.id)}
            >
              <div className="flex items-center space-x-2 w-full">
                {scenario.icon}
                <span className="font-medium">{scenario.title}</span>
              </div>
              <p className="text-xs text-left opacity-70">{scenario.description}</p>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderViewModeSelector = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Display Mode</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2">
          <Button
            variant={viewMode === 'interface' ? "default" : "outline"}
            onClick={() => setViewMode('interface')}
          >
            Interface View
          </Button>
          <Button
            variant={viewMode === 'results' ? "default" : "outline"}
            onClick={() => setViewMode('results')}
          >
            Results View
          </Button>
          <Button
            variant={viewMode === 'combined' ? "default" : "outline"}
            onClick={() => setViewMode('combined')}
          >
            Combined View
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderScenarioInfo = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {currentScenario.icon}
          <span>{currentScenario.title}</span>
        </CardTitle>
        <CardDescription>{currentScenario.useCase}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium">WebSocket:</span>
            <span className="ml-1">{currentScenario.websocketConfig.url}:{currentScenario.websocketConfig.port}</span>
          </div>
          <div>
            <span className="font-medium">Triggers:</span>
            <span className="ml-1">{currentScenario.triggers.length} configured</span>
          </div>
          <div>
            <span className="font-medium">Actions:</span>
            <span className="ml-1">{currentScenario.actions.length} configured</span>
          </div>
          <div>
            <span className="font-medium">Data Directory:</span>
            <span className="ml-1">{currentScenario.websocketConfig.dataDirectory}</span>
          </div>
          <div>
            <span className="font-medium">Auto-Reconnect:</span>
            <span className="ml-1">{currentScenario.websocketConfig.autoReconnect ? 'On' : 'Off'}</span>
          </div>
          <div>
            <span className="font-medium">Filesystem Bridge:</span>
            <span className="ml-1">{currentScenario.websocketConfig.enableFilesystemBridge ? 'Enabled' : 'Disabled'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderInterfaceStatus = () => {
    if (!interfaceStatus || Object.keys(interfaceStatus).length === 0) return null;

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Interface Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">WebSocket</span>
                <span className={`w-2 h-2 rounded-full ${
                  interfaceStatus.websocketConnected ? 'bg-green-500' : 'bg-red-500'
                }`} />
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div>Status: {interfaceStatus.websocketConnected ? 'Connected' : 'Disconnected'}</div>
                <div>Port: {interfaceStatus.websocketPort || 'N/A'}</div>
              </div>
            </div>
            
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">Filesystem Bridge</span>
                <span className={`w-2 h-2 rounded-full ${
                  interfaceStatus.filesystemBridgeActive ? 'bg-green-500' : 'bg-red-500'
                }`} />
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div>Status: {interfaceStatus.filesystemBridgeActive ? 'Active' : 'Inactive'}</div>
                <div>Data Path: {interfaceStatus.dataPath || 'N/A'}</div>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">Active Triggers</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {interfaceStatus.activeTriggers || 0}
                </span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div>Running: {interfaceStatus.runningTriggers || 0}</div>
                <div>Total: {interfaceStatus.totalTriggers || 0}</div>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">Actions Executed</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  {interfaceStatus.executedActions || 0}
                </span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div>Success: {interfaceStatus.successfulActions || 0}</div>
                <div>Failed: {interfaceStatus.failedActions || 0}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderInterfaceView = () => (
    <div className="flex justify-center">
      <LiveDesktopInterface
        interfaceId={`interface-${currentScenario.id}`}
        websocketConfig={currentScenario.websocketConfig}
        triggers={currentScenario.triggers}
        actions={currentScenario.actions}
        autoStart={true}
        onStatusChange={handleInterfaceStatusChange}
        onError={(error) => handleError('LiveDesktopInterface', error)}
        className="w-full max-w-4xl"
      />
    </div>
  );

  const renderResultsView = () => (
    <div className="flex justify-center">
      <WorkflowResult
        resultId={`results-${currentScenario.id}`}
        refreshInterval={5000}
        onResultUpdate={(aggregation) => handleResultUpdate([])}
        onError={(error) => handleError('WorkflowResult', error)}
        className="w-full max-w-4xl"
      />
    </div>
  );

  const renderCombinedView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Live Desktop Interface</h3>
        <LiveDesktopInterface
          interfaceId={`interface-${currentScenario.id}`}
          websocketConfig={currentScenario.websocketConfig}
          triggers={currentScenario.triggers}
          actions={currentScenario.actions}
          autoStart={true}
          onStatusChange={handleInterfaceStatusChange}
          onError={(error) => handleError('LiveDesktopInterface', error)}
          className="w-full"
        />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Workflow Results</h3>
        <WorkflowResult
          resultId={`results-${currentScenario.id}`}
          refreshInterval={5000}
          onResultUpdate={(aggregation) => handleResultUpdate([])}
          onError={(error) => handleError('WorkflowResult', error)}
          className="w-full"
        />
      </div>
    </div>
  );

  // ============================================================================
  // MAIN CONTENT RENDERING
  // ============================================================================

  const renderMainContent = () => {
    switch (viewMode) {
      case 'interface':
        return renderInterfaceView();
      case 'results':
        return renderResultsView();
      case 'combined':
        return renderCombinedView();
      default:
        return renderInterfaceView();
    }
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Live Desktop Interface
            </h1>
            <p className="text-muted-foreground">
              Filesystem-based workflow automation with WebSocket connectivity
            </p>
          </div>
        </div>

        {/* Scenario Selector */}
        {renderScenarioSelector()}

        {/* View Mode Selector */}
        {renderViewModeSelector()}

        {/* Scenario Info */}
        {renderScenarioInfo()}

        {/* Interface Status */}
        {renderInterfaceStatus()}

        {/* Main Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              {viewMode === 'interface' && 'Live Desktop Interface'}
              {viewMode === 'results' && 'Workflow Results'}
              {viewMode === 'combined' && 'Combined Interface & Results'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderMainContent()}
          </CardContent>
        </Card>

        {/* Implementation Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Filesystem-Based Architecture</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Interface Node Features</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• WebSocket configuration management</li>
                  <li>• Trigger and action coordination</li>
                  <li>• Filesystem bridge integration</li>
                  <li>• Real-time status monitoring</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Result Collection</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Automated data aggregation</li>
                  <li>• Filesystem-based persistence</li>
                  <li>• Real-time result filtering</li>
                  <li>• Export capabilities (JSON, CSV, XML)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">WebSocket Integration</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Bidirectional communication</li>
                  <li>• Automatic reconnection</li>
                  <li>• File-based message queuing</li>
                  <li>• Error handling and recovery</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Workflow Automation</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Multiple trigger types</li>
                  <li>• Action chaining and coordination</li>
                  <li>• Result tracking and analytics</li>
                  <li>• Scalable architecture</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LiveDesktop;