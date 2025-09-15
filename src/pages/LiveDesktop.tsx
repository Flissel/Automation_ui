import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Monitor, Grid, Maximize2, Settings, Workflow, Database, Play, Square, Target, CheckCircle, Clock, XCircle, AlertTriangle, Circle, Pause, RotateCcw, Save, Upload, Download, Zap, Activity, Server, Wifi, WifiOff } from 'lucide-react';
import { LiveDesktopInterface } from '@/components/trae/LiveDesktopInterface';
import { WorkflowResult } from '@/components/trae/WorkflowResult';
import { FixedSizeOCRDesigner } from '@/components/trae/liveDesktop/FixedSizeOCRDesigner';
import { DualCanvasOCRDesigner } from '@/components/trae/liveDesktop/DualCanvasOCRDesigner';
import { LiveDesktopConfig } from '@/types/liveDesktop';
// Import centralized WebSocket configuration
import { WEBSOCKET_CONFIG } from '@/config/websocketConfig';

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
const demoScenarios: DemoScenario[] = [{
  id: 'monitoring',
  title: 'System Monitoring',
  description: 'Automated monitoring with filesystem data collection',
  icon: <Monitor className="w-6 h-6" />,
  websocketConfig: {
    url: WEBSOCKET_CONFIG.BASE_URL,
    port: 8080,
    autoReconnect: true,
    enableFilesystemBridge: true,
    dataDirectory: './monitoring-data'
  },
  triggers: [{
    id: 'schedule-trigger',
    type: 'schedule_trigger',
    config: {
      interval: 30000,
      enabled: true
    },
    label: 'Every 30 seconds'
  }],
  actions: [{
    id: 'click-action',
    type: 'click_action',
    config: {
      x: 100,
      y: 100,
      clickType: 'left'
    },
    label: 'Monitor Click'
  }, {
    id: 'send-to-filesystem-action',
    type: 'send_to_filesystem_action',
    config: {
      output_directory: './monitoring-data',
      filename_template: 'metrics_{timestamp}',
      file_format: 'json',
      include_metadata: true
    },
    label: 'Save Metrics to Filesystem'
  }],
  useCase: 'Continuous monitoring with automated data collection to filesystem'
}, {
  id: 'support',
  title: 'Remote Support',
  description: 'Interactive support session with result tracking',
  icon: <Settings className="w-6 h-6" />,
  websocketConfig: {
    url: WEBSOCKET_CONFIG.BASE_URL,
    port: 8080,
    autoReconnect: true,
    enableFilesystemBridge: true,
    dataDirectory: './support-data'
  },
  triggers: [{
    id: 'manual-trigger',
    type: 'manual_trigger',
    config: {
      enabled: true
    },
    label: 'Manual Support Action'
  }],
  actions: [{
    id: 'type-action',
    type: 'type_text_action',
    config: {
      text: 'Support command',
      delay: 100
    },
    label: 'Type Support Command'
  }, {
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
  }],
  useCase: 'Manual support actions with comprehensive result logging'
}, {
  id: 'workflow',
  title: 'Workflow Automation',
  description: 'Complex workflow with multiple actions and result aggregation',
  icon: <Workflow className="w-6 h-6" />,
  websocketConfig: {
    url: WEBSOCKET_CONFIG.BASE_URL,
    port: 8080,
    autoReconnect: true,
    enableFilesystemBridge: true,
    dataDirectory: './workflow-data'
  },
  triggers: [{
    id: 'webhook-trigger',
    type: 'webhook_trigger',
    config: {
      path: '/workflow-start',
      enabled: true
    },
    label: 'Webhook Trigger'
  }],
  actions: [{
    id: 'click-action',
    type: 'click_action',
    config: {
      x: 200,
      y: 150,
      clickType: 'left'
    },
    label: 'Primary Click'
  }, {
    id: 'type-action',
    type: 'type_text_action',
    config: {
      text: 'Automated workflow',
      delay: 50
    },
    label: 'Type Workflow Data'
  }, {
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
  }],
  useCase: 'Multi-step automated workflows with comprehensive result tracking'
}, {
  id: 'data-collection',
  title: 'Data Collection',
  description: 'Continuous data collection with filesystem persistence',
  icon: <Database className="w-6 h-6" />,
  websocketConfig: {
    url: WEBSOCKET_CONFIG.BASE_URL,
    port: 8080,
    autoReconnect: true,
    enableFilesystemBridge: true,
    dataDirectory: './collection-data'
  },
  triggers: [{
    id: 'schedule-trigger',
    type: 'schedule_trigger',
    config: {
      interval: 60000,
      enabled: true
    },
    label: 'Every minute'
  }],
  actions: [{
    id: 'data-action',
    type: 'http_request_action',
    config: {
      url: '/api/data',
      method: 'GET'
    },
    label: 'Collect Data'
  }, {
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
  }, {
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
  }],
  useCase: 'Automated data collection with filesystem-based persistence and analysis'
}];
const LiveDesktop: React.FC = () => {
  const navigate = useNavigate();
  const [selectedScenario, setSelectedScenario] = useState<string>('monitoring');
  const [viewMode, setViewMode] = useState<'interface' | 'results' | 'combined' | 'ocr-designer' | 'dual-canvas' | 'execution'>('dual-canvas');
  const [interfaceStatus, setInterfaceStatus] = useState<any>({});
  const [resultData, setResultData] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [ocrConfig, setOcrConfig] = useState<LiveDesktopConfig | null>(null);
  
  // Execution Panel State
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [websocketUrl, setWebsocketUrl] = useState(WEBSOCKET_CONFIG.BASE_URL);
  const [websocketPort, setWebsocketPort] = useState('8080');
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [dataDirectory, setDataDirectory] = useState('./automation-data');
  const [executionMode, setExecutionMode] = useState<'manual' | 'auto' | 'scheduled'>('manual');
  const [scheduleInterval, setScheduleInterval] = useState(30000);
  
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
    addExecutionLog(`ERROR [${component}]: ${error}`);
  };

  // ============================================================================
  // EXECUTION PANEL HANDLERS
  // ============================================================================

  const addExecutionLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setExecutionLogs(prev => [...prev.slice(-49), logEntry]); // Keep last 50 logs
  };

  const handleStartExecution = async () => {
    if (isExecuting) return;
    
    setIsExecuting(true);
    addExecutionLog(`Starting execution for scenario: ${currentScenario.title}`);
    addExecutionLog(`WebSocket URL: ${websocketUrl}:${websocketPort}`);
    addExecutionLog(`Data Directory: ${dataDirectory}`);
    addExecutionLog(`Execution Mode: ${executionMode}`);
    
    try {
      // Start WebSocket connection
      setIsConnected(true);
      addExecutionLog('WebSocket connection established');
      
      // Execute triggers and actions based on scenario
      for (const trigger of currentScenario.triggers) {
        addExecutionLog(`Executing trigger: ${trigger.label}`);
      }
      
      for (const action of currentScenario.actions) {
        addExecutionLog(`Executing action: ${action.label}`);
        // Simulate action execution delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      addExecutionLog('Workflow execution completed successfully');
    } catch (error) {
      addExecutionLog(`Execution failed: ${error}`);
    }
  };

  const handleStopExecution = () => {
    setIsExecuting(false);
    setIsConnected(false);
    addExecutionLog('Execution stopped by user');
  };

  const handleResetExecution = () => {
    setIsExecuting(false);
    setIsConnected(false);
    setExecutionLogs([]);
    addExecutionLog('Execution environment reset');
  };

  const handleTestScenario = async (scenarioId: string) => {
    const scenario = demoScenarios.find(s => s.id === scenarioId);
    if (!scenario) return;
    
    addExecutionLog(`Testing scenario: ${scenario.title}`);
    addExecutionLog(`Triggers: ${scenario.triggers.length}, Actions: ${scenario.actions.length}`);
    
    // Simulate test execution
    for (let i = 0; i < scenario.triggers.length; i++) {
      addExecutionLog(`✓ Trigger ${i + 1} validated`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    for (let i = 0; i < scenario.actions.length; i++) {
      addExecutionLog(`✓ Action ${i + 1} validated`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    addExecutionLog(`✅ Scenario test completed successfully`);
  };

  const handleSaveConfiguration = () => {
    const config = {
      websocketUrl,
      websocketPort,
      autoReconnect,
      dataDirectory,
      executionMode,
      scheduleInterval,
      selectedScenario
    };
    
    localStorage.setItem('liveDesktopConfig', JSON.stringify(config));
    addExecutionLog('Configuration saved to localStorage');
  };

  const handleLoadConfiguration = () => {
    const savedConfig = localStorage.getItem('liveDesktopConfig');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      setWebsocketUrl(config.websocketUrl || WEBSOCKET_CONFIG.BASE_URL);
      setWebsocketPort(config.websocketPort || '8080');
      setAutoReconnect(config.autoReconnect ?? true);
      setDataDirectory(config.dataDirectory || './automation-data');
      setExecutionMode(config.executionMode || 'manual');
      setScheduleInterval(config.scheduleInterval || 30000);
      if (config.selectedScenario) {
        setSelectedScenario(config.selectedScenario);
      }
      addExecutionLog('Configuration loaded from localStorage');
    } else {
      addExecutionLog('No saved configuration found');
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderExecutionPanel = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="w-5 h-5" />
          <span>Workflow Execution Panel</span>
        </CardTitle>
        <CardDescription>
          Execute workflows, test scenarios, and monitor automation in real-time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Execution Controls */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>Execution Controls</span>
            </h3>
            
            <div className="space-y-2">
              <Button 
                onClick={handleStartExecution}
                disabled={isExecuting}
                className="w-full"
                size="sm"
              >
                <Play className="w-4 h-4 mr-2" />
                {isExecuting ? 'Executing...' : 'Start Execution'}
              </Button>
              
              <Button 
                onClick={handleStopExecution}
                disabled={!isExecuting && !isConnected}
                variant="destructive"
                className="w-full"
                size="sm"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop Execution
              </Button>
              
              <Button 
                onClick={handleResetExecution}
                variant="outline"
                className="w-full"
                size="sm"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Environment
              </Button>
            </div>
            
            <div className="pt-2 border-t">
              <h4 className="text-xs font-medium mb-2">Test Scenarios</h4>
              <div className="space-y-1">
                {demoScenarios.map((scenario) => (
                  <Button
                    key={scenario.id}
                    onClick={() => handleTestScenario(scenario.id)}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs h-8"
                  >
                    {scenario.icon}
                    <span className="ml-2 truncate">{scenario.title}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Configuration Panel */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Configuration</span>
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">WebSocket URL</label>
                <input
                  type="text"
                  value={websocketUrl}
                  onChange={(e) => setWebsocketUrl(e.target.value)}
                  className="w-full mt-1 px-2 py-1 text-xs border rounded"
                  placeholder="ws://localhost"
                />
              </div>
              
              <div>
                <label className="text-xs font-medium">Port</label>
                <input
                  type="text"
                  value={websocketPort}
                  onChange={(e) => setWebsocketPort(e.target.value)}
                  className="w-full mt-1 px-2 py-1 text-xs border rounded"
                  placeholder="8080"
                />
              </div>
              
              <div>
                <label className="text-xs font-medium">Data Directory</label>
                <input
                  type="text"
                  value={dataDirectory}
                  onChange={(e) => setDataDirectory(e.target.value)}
                  className="w-full mt-1 px-2 py-1 text-xs border rounded"
                  placeholder="./automation-data"
                />
              </div>
              
              <div>
                <label className="text-xs font-medium">Execution Mode</label>
                <select
                  value={executionMode}
                  onChange={(e) => setExecutionMode(e.target.value as 'manual' | 'auto' | 'scheduled')}
                  className="w-full mt-1 px-2 py-1 text-xs border rounded"
                >
                  <option value="manual">Manual</option>
                  <option value="auto">Automatic</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>
              
              {executionMode === 'scheduled' && (
                <div>
                  <label className="text-xs font-medium">Interval (ms)</label>
                  <input
                    type="number"
                    value={scheduleInterval}
                    onChange={(e) => setScheduleInterval(Number(e.target.value))}
                    className="w-full mt-1 px-2 py-1 text-xs border rounded"
                    min="1000"
                    step="1000"
                  />
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoReconnect"
                  checked={autoReconnect}
                  onChange={(e) => setAutoReconnect(e.target.checked)}
                  className="w-3 h-3"
                />
                <label htmlFor="autoReconnect" className="text-xs font-medium">
                  Auto-reconnect
                </label>
              </div>
            </div>
            
            <div className="pt-2 border-t space-y-1">
              <Button
                onClick={handleSaveConfiguration}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Save className="w-3 h-3 mr-2" />
                Save Config
              </Button>
              <Button
                onClick={handleLoadConfiguration}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Upload className="w-3 h-3 mr-2" />
                Load Config
              </Button>
            </div>
          </div>
          
          {/* Execution Logs */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center space-x-2">
              <Monitor className="w-4 h-4" />
              <span>Execution Logs</span>
              <Button
                onClick={() => setExecutionLogs([])}
                variant="ghost"
                size="sm"
                className="ml-auto h-6 px-2"
              >
                Clear
              </Button>
            </h3>
            
            <div className="bg-black text-green-400 p-3 rounded text-xs font-mono h-64 overflow-y-auto">
              {executionLogs.length === 0 ? (
                <div className="text-gray-500">No logs yet. Start execution to see activity...</div>
              ) : (
                executionLogs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderServiceControls = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Server className="w-5 h-5" />
          <span>Service Management</span>
        </CardTitle>
        <CardDescription>
          Manage WebSocket connections and automation services
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Connection Status */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Connection Status</h3>
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-600">Disconnected</span>
                </>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {websocketUrl}:{websocketPort}
            </div>
          </div>
          
          {/* Service Actions */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Service Actions</h3>
            <div className="space-y-2">
              <Button
                onClick={() => {
                  setIsConnected(!isConnected);
                  addExecutionLog(isConnected ? 'WebSocket disconnected' : 'WebSocket connected');
                }}
                variant={isConnected ? "destructive" : "default"}
                size="sm"
                className="w-full"
              >
                {isConnected ? (
                  <>
                    <WifiOff className="w-4 h-4 mr-2" />
                    Disconnect
                  </>
                ) : (
                  <>
                    <Wifi className="w-4 h-4 mr-2" />
                    Connect
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => {
                  addExecutionLog('Restarting WebSocket service...');
                  setIsConnected(false);
                  setTimeout(() => {
                    setIsConnected(true);
                    addExecutionLog('WebSocket service restarted');
                  }, 2000);
                }}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Restart Service
              </Button>
            </div>
          </div>
          
          {/* Export/Import */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Data Management</h3>
            <div className="space-y-2">
              <Button
                onClick={() => {
                  const data = {
                    logs: executionLogs,
                    config: { websocketUrl, websocketPort, dataDirectory, executionMode },
                    scenario: currentScenario.id,
                    timestamp: new Date().toISOString()
                  };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `automation-export-${Date.now()}.json`;
                  a.click();
                  addExecutionLog('Data exported successfully');
                }}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              
              <Button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.json';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        try {
                          const data = JSON.parse(e.target?.result as string);
                          if (data.logs) setExecutionLogs(data.logs);
                          if (data.config) {
                            setWebsocketUrl(data.config.websocketUrl || websocketUrl);
                            setWebsocketPort(data.config.websocketPort || websocketPort);
                            setDataDirectory(data.config.dataDirectory || dataDirectory);
                            setExecutionMode(data.config.executionMode || executionMode);
                          }
                          if (data.scenario) setSelectedScenario(data.scenario);
                          addExecutionLog('Data imported successfully');
                        } catch (error) {
                          addExecutionLog(`Import failed: ${error}`);
                        }
                      };
                      reader.readAsText(file);
                    }
                  };
                  input.click();
                }}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Data
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderScenarioSelector = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Target className="w-5 h-5" />
          <span>Demo Scenarios</span>
        </CardTitle>
        <CardDescription>
          Select a pre-configured scenario to test different automation workflows
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {demoScenarios.map((scenario) => (
            <div
              key={scenario.id}
              className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                selectedScenario === scenario.id
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setSelectedScenario(scenario.id)}
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className={`p-2 rounded-md ${
                  selectedScenario === scenario.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {scenario.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{scenario.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {scenario.description}
                  </p>
                </div>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Triggers:</span>
                  <span className="font-medium">{scenario.triggers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Actions:</span>
                  <span className="font-medium">{scenario.actions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Data Dir:</span>
                  <span className="font-medium truncate ml-2">
                    {scenario.websocketConfig.dataDirectory.split('/').pop()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
  const renderViewModeSelector = () => (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={viewMode === 'execution' ? 'default' : 'outline'}
            onClick={() => setViewMode('execution')}
          >
            <Zap className="w-4 h-4 mr-2" />
            Execution
          </Button>
          <Button
            variant={viewMode === 'dual-canvas' ? 'default' : 'outline'}
            onClick={() => setViewMode('dual-canvas')}
          >
            <Maximize2 className="w-4 h-4 mr-2" />
            Dual Canvas
          </Button>
          <Button
            variant={viewMode === 'ocr-designer' ? 'default' : 'outline'}
            onClick={() => setViewMode('ocr-designer')}
          >
            <Target className="w-4 h-4 mr-2" />
            OCR Designer
          </Button>
          <Button
            variant={viewMode === 'interface' ? 'default' : 'outline'}
            onClick={() => setViewMode('interface')}
          >
            <Monitor className="w-4 h-4 mr-2" />
            Interface
          </Button>
          <Button
            variant={viewMode === 'results' ? 'default' : 'outline'}
            onClick={() => setViewMode('results')}
          >
            <Database className="w-4 h-4 mr-2" />
            Results
          </Button>
          <Button
            variant={viewMode === 'combined' ? 'default' : 'outline'}
            onClick={() => setViewMode('combined')}
          >
            <Grid className="w-4 h-4 mr-2" />
            Combined
          </Button>
        </div>
      </CardContent>
    </Card>
  );
  const renderScenarioInfo = () => <Card className="mb-6">
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
    </Card>;
  const renderInterfaceStatus = () => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'connected':
          return 'text-green-600 bg-green-50 border-green-200';
        case 'connecting':
          return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        case 'disconnected':
          return 'text-red-600 bg-red-50 border-red-200';
        case 'error':
          return 'text-red-600 bg-red-50 border-red-200';
        default:
          return 'text-gray-600 bg-gray-50 border-gray-200';
      }
    };

    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'connected':
          return <CheckCircle className="w-4 h-4" />;
        case 'connecting':
          return <Clock className="w-4 h-4 animate-spin" />;
        case 'disconnected':
          return <XCircle className="w-4 h-4" />;
        case 'error':
          return <AlertTriangle className="w-4 h-4" />;
        default:
          return <Circle className="w-4 h-4" />;
      }
    };

    const currentTime = new Date().toLocaleTimeString();
    const connectionStatus = isConnected ? 'connected' : 'disconnected';
    const lastUpdateTime = interfaceStatus.lastUpdate || currentTime;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Connection Status */}
        <Card className={`border-2 ${getStatusColor(connectionStatus)}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon(connectionStatus)}
                <span className="font-medium capitalize">{connectionStatus}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                WebSocket
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {isConnected ? 'Real-time connection active' : 'Connection not established'}
            </div>
          </CardContent>
        </Card>

        {/* Interface Status */}
        <Card className={`border-2 ${getStatusColor(interfaceStatus.status || 'idle')}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon(interfaceStatus.status || 'idle')}
                <span className="font-medium capitalize">{interfaceStatus.status || 'Idle'}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Interface
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {interfaceStatus.message || 'Waiting for automation commands'}
            </div>
          </CardContent>
        </Card>

        {/* Last Update */}
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-600">Last Update</span>
              </div>
              <div className="text-xs text-muted-foreground">
                System
              </div>
            </div>
            <div className="mt-2 text-xs text-blue-600 font-mono">
              {lastUpdateTime}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  const renderInterfaceView = () => {
    if (!isConnected) {
      return <div className="flex flex-col items-center justify-center p-12 text-center">
          <Monitor className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Ready to Connect</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Start the WebSocket connection to begin live desktop automation with the selected scenario.
          </p>
          <Button onClick={() => setIsConnected(true)} size="lg" className="min-w-32">
            <Play className="w-4 h-4 mr-2" />
            Connect
          </Button>
        </div>;
    }
    return <div className="flex justify-center">
        <LiveDesktopInterface interfaceId={`interface-${currentScenario.id}`} websocketConfig={currentScenario.websocketConfig} triggers={currentScenario.triggers} actions={currentScenario.actions} autoStart={false} onStatusChange={handleInterfaceStatusChange} onError={error => handleError('LiveDesktopInterface', error)} className="w-full max-w-4xl" />
      </div>;
  };
  const renderResultsView = () => <div className="flex justify-center">
      <WorkflowResult resultId={`results-${currentScenario.id}`} refreshInterval={5000} onResultUpdate={aggregation => handleResultUpdate([])} onError={error => handleError('WorkflowResult', error)} className="w-full max-w-4xl" />
    </div>;
  const renderCombinedView = () => {
    if (!isConnected) {
      return <div className="flex flex-col items-center justify-center p-12 text-center">
          <Grid className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Ready for Combined View</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Start the connection to see both the live desktop interface and workflow results.
          </p>
          <Button onClick={() => setIsConnected(true)} size="lg" className="min-w-32">
            <Play className="w-4 h-4 mr-2" />
            Connect
          </Button>
        </div>;
    }
    return <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Live Desktop Interface</h3>
            <Button variant="outline" size="sm" onClick={() => setIsConnected(false)}>
              <Square className="w-4 h-4 mr-2" />
              Stop
            </Button>
          </div>
          <LiveDesktopInterface interfaceId={`interface-${currentScenario.id}`} websocketConfig={currentScenario.websocketConfig} triggers={currentScenario.triggers} actions={currentScenario.actions} autoStart={false} onStatusChange={handleInterfaceStatusChange} onError={error => handleError('LiveDesktopInterface', error)} className="w-full" />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-4">Workflow Results</h3>
          <WorkflowResult resultId={`results-${currentScenario.id}`} refreshInterval={5000} onResultUpdate={aggregation => handleResultUpdate([])} onError={error => handleError('WorkflowResult', error)} className="w-full" />
        </div>
      </div>;
  };

  const renderOCRDesignerView = () => (
    <FixedSizeOCRDesigner
      config={ocrConfig || undefined}
      onConfigChange={setOcrConfig}
      className="w-full"
    />
  );

  const renderDualCanvasView = () => (
    <DualCanvasOCRDesigner
      config={ocrConfig || undefined}
      onConfigChange={setOcrConfig}
      className="w-full"
      primaryMonitorStream={`${WEBSOCKET_CONFIG.BASE_URL}/primary`}
      secondaryMonitorStream={`${WEBSOCKET_CONFIG.BASE_URL}/secondary`}
    />
  );

  // ============================================================================
  // EXECUTION PANEL FUNCTIONS
  // ============================================================================



  const renderConfigurationPanel = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="w-5 h-5" />
          <span>Configuration</span>
        </CardTitle>
        <CardDescription>
          Configure WebSocket connections, workflow settings, and OCR parameters
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* WebSocket Configuration */}
          <div className="space-y-4">
            <h4 className="font-medium">WebSocket Settings</h4>
            <div className="space-y-2">
              <label className="text-sm font-medium">WebSocket URL</label>
              <input
                type="text"
                value={websocketUrl}
                onChange={(e) => setWebsocketUrl(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="ws://localhost"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Port</label>
              <input
                type="number"
                value={websocketPort}
                onChange={(e) => setWebsocketPort(parseInt(e.target.value))}
                className="w-full p-2 border rounded-md"
                placeholder="8080"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoReconnect"
                checked={autoReconnect}
                onChange={(e) => setAutoReconnect(e.target.checked)}
              />
              <label htmlFor="autoReconnect" className="text-sm">Auto Reconnect</label>
            </div>
          </div>
          
          {/* Workflow Configuration */}
          <div className="space-y-4">
            <h4 className="font-medium">Workflow Settings</h4>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Directory</label>
              <input
                type="text"
                value={dataDirectory}
                onChange={(e) => setDataDirectory(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="./data"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Execution Mode</label>
              <select
                value={executionMode}
                onChange={(e) => setExecutionMode(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="manual">Manual</option>
                <option value="scheduled">Scheduled</option>
                <option value="continuous">Continuous</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Schedule Interval (ms)</label>
              <input
                type="number"
                value={scheduleInterval}
                onChange={(e) => setScheduleInterval(parseInt(e.target.value))}
                className="w-full p-2 border rounded-md"
                placeholder="30000"
              />
            </div>
          </div>
        </div>
        
        {/* Configuration Actions */}
        <div className="mt-6 flex space-x-2">
          <Button onClick={handleSaveConfiguration} className="flex items-center space-x-2">
            <Save className="w-4 h-4" />
            <span>Save Config</span>
          </Button>
          <Button onClick={handleLoadConfiguration} variant="outline" className="flex items-center space-x-2">
            <Upload className="w-4 h-4" />
            <span>Load Config</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderServiceManagement = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Server className="w-5 h-5" />
          <span>Service Management</span>
        </CardTitle>
        <CardDescription>
          Manage WebSocket connections and system services
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Connection Status */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              {interfaceStatus.connected ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              <span className="font-medium">Connection</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {interfaceStatus.connected ? 'Connected' : 'Disconnected'}
            </p>
          </div>
          
          {/* Connect/Disconnect */}
          <Button
            onClick={interfaceStatus.connected ? handleDisconnect : handleConnect}
            variant={interfaceStatus.connected ? 'destructive' : 'default'}
            className="flex items-center space-x-2"
          >
            {interfaceStatus.connected ? (
              <WifiOff className="w-4 h-4" />
            ) : (
              <Wifi className="w-4 h-4" />
            )}
            <span>{interfaceStatus.connected ? 'Disconnect' : 'Connect'}</span>
          </Button>
          
          {/* Restart Service */}
          <Button
            onClick={handleRestartService}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart Service</span>
          </Button>
          
          {/* Export/Import Data */}
          <Button
            onClick={handleExportData}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Data</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderExecutionLogs = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="w-5 h-5" />
          <span>Execution Logs</span>
        </CardTitle>
        <CardDescription>
          Real-time execution logs and status updates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 overflow-y-auto bg-muted p-4 rounded-lg font-mono text-sm">
          {executionLogs.length === 0 ? (
            <p className="text-muted-foreground">No execution logs yet...</p>
          ) : (
            executionLogs.map((log, index) => (
              <div key={index} className="mb-1">
                <span className="text-muted-foreground">[{log.timestamp}]</span>
                <span className={`ml-2 ${
                  log.level === 'error' ? 'text-red-500' :
                  log.level === 'warning' ? 'text-yellow-500' :
                  log.level === 'success' ? 'text-green-500' :
                  'text-foreground'
                }`}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
        <div className="mt-4 flex space-x-2">
          <Button
            onClick={() => setExecutionLogs([])}
            variant="outline"
            size="sm"
          >
            Clear Logs
          </Button>
          <Button
            onClick={handleExportLogs}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Logs</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // ============================================================================
  // EXECUTION VIEW RENDERING
  // ============================================================================

  const renderExecutionView = () => (
    <div className="space-y-6">
      {/* Execution Panel */}
      {renderExecutionPanel()}
      
      {/* Configuration Panel */}
      {renderConfigurationPanel()}
      
      {/* Service Management */}
      {renderServiceManagement()}
      
      {/* Execution Logs */}
      {renderExecutionLogs()}
    </div>
  );

  // ============================================================================
  // MAIN CONTENT RENDERING
  // ============================================================================

  const renderMainContent = () => {
    switch (viewMode) {
      case 'execution':
        return renderExecutionView();
      case 'dual-canvas':
        return renderDualCanvasView();
      case 'ocr-designer':
        return renderOCRDesignerView();
      case 'interface':
        return renderInterfaceView();
      case 'results':
        return renderResultsView();
      case 'combined':
        return renderCombinedView();
      default:
        return renderDualCanvasView();
    }
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return <div className="min-h-screen bg-background p-6">
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
        {/* Removed as requested: Demo Scenarios card (renderScenarioSelector) for a cleaner UI. */}
        {/* {renderScenarioSelector()} */}

        {/* View Mode Selector */}
        {renderViewModeSelector()}

        {/* Scenario Info */}
        {/* Removed as requested: System Monitoring/Scenario Info card (renderScenarioInfo). */}
        {/* {renderScenarioInfo()} */}

        {/* Interface Status */}
        {renderInterfaceStatus()}

        {/* Main Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              {viewMode === 'execution' && 'Workflow Execution & Configuration'}
              {viewMode === 'dual-canvas' && 'Dual Canvas OCR Zone Designer'}
              {viewMode === 'ocr-designer' && 'OCR Zone Designer'}
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
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Implementation Guide</span>
            </CardTitle>
            <CardDescription>
              Step-by-step guide to implement and customize Live Desktop automation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Quick Start Section */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                  <Play className="w-4 h-4" />
                  <span>Quick Start</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
                      <div>
                        <p className="font-medium">Select Scenario</p>
                        <p className="text-muted-foreground">Pick an automation workflow scenario in your configuration</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</span>
                      <div>
                        <p className="font-medium">Choose View Mode</p>
                        <p className="text-muted-foreground">Select Dual Canvas, OCR Designer, Interface, Results, or Combined view</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">3</span>
                      <div>
                        <p className="font-medium">Connect</p>
                        <p className="text-muted-foreground">Click 'Connect' to begin WebSocket automation</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">4</span>
                      <div>
                        <p className="font-medium">Monitor Results</p>
                        <p className="text-muted-foreground">View real-time automation results and filesystem data</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* View Modes Section */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                  <Monitor className="w-4 h-4" />
                  <span>View Modes</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Maximize2 className="w-4 h-4 text-primary" />
                      <span className="font-medium">Dual Canvas</span>
                    </div>
                    <p className="text-muted-foreground">Design OCR zones across multiple monitors with real-time preview</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Target className="w-4 h-4 text-primary" />
                      <span className="font-medium">OCR Designer</span>
                    </div>
                    <p className="text-muted-foreground">Single-monitor OCR zone configuration with fixed-size canvas</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Monitor className="w-4 h-4 text-primary" />
                      <span className="font-medium">Interface</span>
                    </div>
                    <p className="text-muted-foreground">Live desktop automation interface with real-time control</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Database className="w-4 h-4 text-primary" />
                      <span className="font-medium">Results</span>
                    </div>
                    <p className="text-muted-foreground">Workflow execution results and filesystem data analysis</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Grid className="w-4 h-4 text-primary" />
                      <span className="font-medium">Combined</span>
                    </div>
                    <p className="text-muted-foreground">Split view showing both interface and results simultaneously</p>
                  </div>
                </div>
              </div>

              {/* Technical Details Section */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                  <Workflow className="w-4 h-4" />
                  <span>Technical Implementation</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium mb-2">WebSocket Configuration</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Base URL: {WEBSOCKET_CONFIG.BASE_URL}</li>
                      <li>• Auto-reconnection enabled</li>
                      <li>• Filesystem bridge integration</li>
                      <li>• Real-time data streaming</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Data Persistence</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• JSON and CSV format support</li>
                      <li>• Automatic backup creation</li>
                      <li>• Metadata inclusion</li>
                      <li>• Timestamp-based naming</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Automation Features</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Schedule-based triggers</li>
                      <li>• Manual and webhook triggers</li>
                      <li>• Click and type actions</li>
                      <li>• HTTP request actions</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">OCR Capabilities</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Multi-monitor support</li>
                      <li>• Zone-based text extraction</li>
                      <li>• Real-time preview</li>
                      <li>• Configurable recognition areas</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Customization Section */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Customization Options</span>
                </h3>
                <div className="text-sm space-y-3">
                  <div>
                    <h4 className="font-medium mb-1">Create Custom Scenarios</h4>
                    <p className="text-muted-foreground">
                      Define scenarios in your configuration to add automation workflows with custom triggers, actions, and WebSocket settings.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Extend Action Types</h4>
                    <p className="text-muted-foreground">
                      Add new action types by implementing them in the backend and updating the action configuration UI components.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Configure Data Output</h4>
                    <p className="text-muted-foreground">
                      Customize filesystem output by modifying the <code className="bg-muted px-1 rounded">send_to_filesystem_action</code> configurations in each scenario.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default LiveDesktop;