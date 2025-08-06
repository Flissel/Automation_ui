/**
 * Virtual Desktops Page
 * Main page for managing virtual desktop environments
 * Author: TRAE Development Team
 * Version: 1.0.0
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Monitor, 
  Plus, 
  Settings, 
  Activity,
  Eye,
  Bot,
  Grid3X3,
  List
} from 'lucide-react';
import { VirtualDesktopManager } from '@/components/trae/virtualDesktop/VirtualDesktopManager';
import { VirtualDesktopDetails } from '@/components/trae/virtualDesktop/VirtualDesktopDetails';
import { VirtualDesktopStream } from '@/components/trae/virtualDesktop/VirtualDesktopStream';
import { VirtualDesktopAutomation } from '@/components/trae/virtualDesktop/VirtualDesktopAutomation';
import { VirtualDesktop, VirtualDesktopAutomationConfig } from '@/types/virtualDesktop';

const VirtualDesktops: React.FC = () => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [selectedDesktop, setSelectedDesktop] = useState<VirtualDesktop | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleDesktopSelect = (desktop: VirtualDesktop) => {
    setSelectedDesktop(desktop);
    setActiveTab('overview');
  };

  const handleDesktopUpdate = (updates: Partial<VirtualDesktop>) => {
    if (selectedDesktop) {
      setSelectedDesktop({ ...selectedDesktop, ...updates });
    }
  };

  const handleAutomationConfigUpdate = (config: VirtualDesktopAutomationConfig) => {
    if (selectedDesktop) {
      setSelectedDesktop({
        ...selectedDesktop,
        automationConfig: config
      });
    }
  };

  const handleBackToManager = () => {
    setSelectedDesktop(null);
    setActiveTab('overview');
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderManagerView = () => (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Virtual Desktops</h1>
          <p className="text-muted-foreground">
            Manage virtual desktop environments for automation and analysis
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Virtual Desktop Manager */}
      <VirtualDesktopManager
        onDesktopSelect={handleDesktopSelect}
        viewMode={viewMode}
      />
    </div>
  );

  const renderDesktopDetailView = () => {
    if (!selectedDesktop) return null;

    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={handleBackToManager}
            >
              ← Back to Manager
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{selectedDesktop.name}</h1>
              <p className="text-muted-foreground">
                Virtual Desktop Management & Control
              </p>
            </div>
          </div>
        </div>

        {/* Desktop Detail Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center">
              <Monitor className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="stream" className="flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Live Stream
            </TabsTrigger>
            <TabsTrigger value="automation" className="flex items-center">
              <Bot className="h-4 w-4 mr-2" />
              Automation
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <VirtualDesktopDetails
              desktop={selectedDesktop}
              onUpdate={handleDesktopUpdate}
            />
          </TabsContent>

          <TabsContent value="stream" className="mt-6">
            <VirtualDesktopStream
              desktop={selectedDesktop}
              streamConfig={selectedDesktop.streamConfig}
              showControls={true}
              allowInteraction={true}
              onStreamStatusChange={(isStreaming) => {
                handleDesktopUpdate({
                  status: isStreaming ? 'streaming' : 'running'
                });
              }}
            />
          </TabsContent>

          <TabsContent value="automation" className="mt-6">
            <VirtualDesktopAutomation
              desktop={selectedDesktop}
              automationConfig={selectedDesktop.automationConfig}
              onConfigUpdate={handleAutomationConfigUpdate}
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Desktop Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Settings className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Advanced Settings</p>
                  <p className="text-sm">Desktop configuration options coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {selectedDesktop ? renderDesktopDetailView() : renderManagerView()}
      </div>
    </div>
  );
};

export default VirtualDesktops;