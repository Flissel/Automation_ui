import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Monitor, Grid, Maximize2, Settings } from 'lucide-react';
import LiveDesktopViewer from '@/components/trae/LiveDesktopViewer';

// ============================================================================
// DEMO SCENARIOS
// ============================================================================

interface DemoScenario {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  config: any;
  useCase: string;
}

const demoScenarios: DemoScenario[] = [
  {
    id: 'monitoring',
    title: 'System Monitoring',
    description: 'Low-latency monitoring for production systems',
    icon: <Monitor className="w-6 h-6" />,
    config: {
      fps: 5,
      scale_factor: 0.6,
      quality: 70,
      auto_reconnect: true,
      compression: true
    },
    useCase: 'Ideal for continuous monitoring of servers and production systems'
  },
  {
    id: 'support',
    title: 'Remote Support',
    description: 'High-quality display for technical support',
    icon: <Settings className="w-6 h-6" />,
    config: {
      fps: 15,
      scale_factor: 1.0,
      quality: 95,
      auto_reconnect: true,
      compression: false
    },
    useCase: 'Optimized for detailed remote maintenance and support sessions'
  },
  {
    id: 'presentation',
    title: 'Presentations',
    description: 'Optimized for screen sharing in meetings',
    icon: <Maximize2 className="w-6 h-6" />,
    config: {
      fps: 10,
      scale_factor: 0.8,
      quality: 85,
      auto_reconnect: true,
      compression: true
    },
    useCase: 'Perfect for meetings, training sessions and presentations'
  },
  {
    id: 'development',
    title: 'Development',
    description: 'Development environment with high image quality',
    icon: <Grid className="w-6 h-6" />,
    config: {
      fps: 20,
      scale_factor: 1.2,
      quality: 90,
      auto_reconnect: true,
      compression: false
    },
    useCase: 'For developers using remote development environments'
  }
];

const LiveDesktop: React.FC = () => {
  const navigate = useNavigate();
  const [selectedScenario, setSelectedScenario] = useState<string>('monitoring');
  const [viewMode, setViewMode] = useState<'single' | 'grid' | 'fullscreen'>('single');
  const [connectionStats, setConnectionStats] = useState<any[]>([]);

  const currentScenario = demoScenarios.find(s => s.id === selectedScenario) || demoScenarios[0];

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleConnectionChange = (viewerId: string, status: any) => {
    setConnectionStats(prev => {
      const existing = prev.findIndex(s => s.viewerId === viewerId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { viewerId, ...status, timestamp: new Date() };
        return updated;
      } else {
        return [...prev, { viewerId, ...status, timestamp: new Date() }];
      }
    });
  };

  const handleError = (viewerId: string, error: string) => {
    console.error(`Live Desktop Viewer error (${viewerId}):`, error);
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderScenarioSelector = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Application Scenarios</CardTitle>
        <CardDescription>Choose an optimized configuration for your use case</CardDescription>
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
            variant={viewMode === 'single' ? "default" : "outline"}
            onClick={() => setViewMode('single')}
          >
            Single View
          </Button>
          <Button
            variant={viewMode === 'grid' ? "default" : "outline"}
            onClick={() => setViewMode('grid')}
          >
            Grid View
          </Button>
          <Button
            variant={viewMode === 'fullscreen' ? "default" : "outline"}
            onClick={() => setViewMode('fullscreen')}
          >
            Fullscreen
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <span className="font-medium">FPS:</span>
            <span className="ml-1">{currentScenario.config.fps}</span>
          </div>
          <div>
            <span className="font-medium">Scale:</span>
            <span className="ml-1">{currentScenario.config.scale_factor}x</span>
          </div>
          <div>
            <span className="font-medium">Quality:</span>
            <span className="ml-1">{currentScenario.config.quality}%</span>
          </div>
          <div>
            <span className="font-medium">Compression:</span>
            <span className="ml-1">{currentScenario.config.compression ? 'On' : 'Off'}</span>
          </div>
          <div>
            <span className="font-medium">Auto-Reconnect:</span>
            <span className="ml-1">{currentScenario.config.auto_reconnect ? 'On' : 'Off'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderConnectionStats = () => {
    if (connectionStats.length === 0) return null;

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Connection Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {connectionStats.map((stat) => (
              <div key={stat.viewerId} className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">Viewer {stat.viewerId}</span>
                  <span className={`w-2 h-2 rounded-full ${
                    stat.connected ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>FPS: {stat.fps_actual || 0}</div>
                  <div>Latency: {stat.latency || 0}ms</div>
                  <div>Data: {Math.round((stat.bytes_received || 0) / 1024)}KB</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSingleView = () => (
    <div className="flex justify-center">
      <LiveDesktopViewer
        viewerId="main"
        width={800}
        height={600}
        initialConfig={currentScenario.config}
        onConnectionChange={(status) => handleConnectionChange('main', status)}
        onError={(error) => handleError('main', error)}
        allowFullscreen={true}
        showControls={true}
        autoStart={false}
        className="border border-border rounded-lg"
      />
    </div>
  );

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[1, 2, 3, 4].map((index) => (
        <LiveDesktopViewer
          key={index}
          viewerId={`grid-${index}`}
          width={400}
          height={300}
          initialConfig={{
            ...currentScenario.config,
            fps: Math.max(1, currentScenario.config.fps / 2),
            quality: Math.max(50, currentScenario.config.quality - 20)
          }}
          onConnectionChange={(status) => handleConnectionChange(`grid-${index}`, status)}
          onError={(error) => handleError(`grid-${index}`, error)}
          allowFullscreen={true}
          showControls={true}
          autoStart={false}
          className="border border-border rounded-lg"
        />
      ))}
    </div>
  );

  const renderFullscreenView = () => (
    <div className="flex justify-center">
      <LiveDesktopViewer
        viewerId="fullscreen"
        width={1200}
        height={800}
        initialConfig={{
          ...currentScenario.config,
          scale_factor: 1.0,
          quality: Math.min(100, currentScenario.config.quality + 10)
        }}
        onConnectionChange={(status) => handleConnectionChange('fullscreen', status)}
        onError={(error) => handleError('fullscreen', error)}
        allowFullscreen={true}
        showControls={true}
        autoStart={false}
        className="border border-border rounded-lg"
      />
    </div>
  );

  const renderViewer = () => {
    switch (viewMode) {
      case 'grid':
        return renderGridView();
      case 'fullscreen':
        return renderFullscreenView();
      default:
        return renderSingleView();
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
              Live Desktop Streaming
            </h1>
            <p className="text-muted-foreground">
              Enterprise desktop streaming and remote monitoring solutions
            </p>
          </div>
        </div>

        {/* Scenario Selector */}
        {renderScenarioSelector()}

        {/* View Mode Selector */}
        {renderViewModeSelector()}

        {/* Scenario Info */}
        {renderScenarioInfo()}

        {/* Connection Stats */}
        {renderConnectionStats()}

        {/* Viewer */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Live Desktop Stream</CardTitle>
          </CardHeader>
          <CardContent>
            {renderViewer()}
          </CardContent>
        </Card>

        {/* Implementation Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Implementation Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Docker Integration</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Automatic service discovery</li>
                  <li>• Scalable container architecture</li>
                  <li>• Load balancing for multiple viewers</li>
                  <li>• Health checks and auto-recovery</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Enterprise Usage</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Central configuration management</li>
                  <li>• User and permissions management</li>
                  <li>• Audit logging and monitoring</li>
                  <li>• Multi-tenant support</li>
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