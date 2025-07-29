import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Monitor, Settings, Target, Save, Workflow, Database } from 'lucide-react';
import { LiveDesktopStream } from '@/components/trae/liveDesktop/LiveDesktopStream';
import { OCRRegionDesigner } from '@/components/trae/liveDesktop/OCRRegionDesigner';
import { LiveDesktopConfigManager } from '@/components/trae/liveDesktop/LiveDesktopConfigManager';
import { LiveDesktopConfig, LiveDesktopStatus } from '@/types/liveDesktop';

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
  const [currentConfig, setCurrentConfig] = useState<LiveDesktopConfig | null>(null);
  const [streamStatus, setStreamStatus] = useState<LiveDesktopStatus>({
    connected: false,
    streaming: false,
    connectionName: null,
    latency: 0,
    fpsActual: 0,
    bytesReceived: 0,
    lastFrameTime: null
  });
  const [isDrawingEnabled, setIsDrawingEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState('stream');

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleConfigLoad = (config: LiveDesktopConfig) => {
    setCurrentConfig(config);
  };

  const handleConfigSave = (config: LiveDesktopConfig) => {
    setCurrentConfig(config);
  };

  const handleStatusChange = (status: LiveDesktopStatus) => {
    setStreamStatus(status);
  };

  const handleRegionsChange = (regions: any[]) => {
    if (currentConfig) {
      setCurrentConfig({
        ...currentConfig,
        ocrRegions: regions,
        updatedAt: new Date().toISOString()
      });
    }
  };

  const navigateToWorkflow = () => {
    navigate('/workflow');
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Live Desktop Designer</h1>
          <p className="text-muted-foreground">
            Design live desktop streams with OCR regions for workflow automation
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {currentConfig && (
          <Button onClick={navigateToWorkflow}>
            <Workflow className="w-4 h-4 mr-2" />
            Go to Workflow
          </Button>
        )}
      </div>
    </div>
  );

  const renderStatusCard = () => {
    if (!currentConfig) return null;

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Current Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm font-medium">{currentConfig.name}</div>
              <div className="text-xs text-muted-foreground">{currentConfig.description}</div>
            </div>
            <div>
              <div className="text-sm font-medium">Status</div>
              <div className="text-xs text-muted-foreground">
                {streamStatus.connected ? 'Connected' : 'Disconnected'} • 
                {streamStatus.streaming ? ' Streaming' : ' Stopped'}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium">OCR Regions</div>
              <div className="text-xs text-muted-foreground">
                {currentConfig.ocrRegions?.length || 0} regions defined
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderMainContent = () => {
    if (!currentConfig) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <Settings className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Configuration Selected</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Create or load a live desktop configuration to start designing OCR regions and workflows.
          </p>
        </div>
      );
    }

    return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="stream">Live Stream</TabsTrigger>
          <TabsTrigger value="ocr">OCR Designer</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="stream" className="space-y-4">
          <div className="relative">
            <LiveDesktopStream
              config={currentConfig}
              onStatusChange={handleStatusChange}
              showControls={true}
              enableFullscreen={true}
            />
            
            {/* OCR Region Overlay */}
            {currentConfig.ocr.enabled && (
              <div className="absolute inset-0 pointer-events-none">
                <OCRRegionDesigner
                  width={800}
                  height={600}
                  regions={currentConfig.ocrRegions || []}
                  onRegionsChange={handleRegionsChange}
                  isDrawingEnabled={false}
                  onDrawingToggle={() => {}}
                />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="ocr" className="space-y-4">
          <OCRRegionDesigner
            width={800}
            height={600}
            regions={currentConfig.ocrRegions || []}
            onRegionsChange={handleRegionsChange}
            isDrawingEnabled={isDrawingEnabled}
            onDrawingToggle={setIsDrawingEnabled}
          />
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <LiveDesktopConfigManager
            currentConfig={currentConfig}
            onConfigLoad={handleConfigLoad}
            onConfigSave={handleConfigSave}
          />
        </TabsContent>
      </Tabs>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        {renderHeader()}

        {/* Status Card */}
        {renderStatusCard()}

        {/* Main Content */}
        {!currentConfig ? (
          <Card>
            <CardContent className="pt-6">
              {renderMainContent()}
              <div className="mt-8">
                <LiveDesktopConfigManager
                  currentConfig={currentConfig}
                  onConfigLoad={handleConfigLoad}
                  onConfigSave={handleConfigSave}
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          renderMainContent()
        )}
      </div>
    </div>
  );
};

export default LiveDesktop;