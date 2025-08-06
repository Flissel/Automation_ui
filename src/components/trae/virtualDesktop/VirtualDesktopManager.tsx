/**
 * Virtual Desktop Manager Component
 * Main interface for managing virtual desktops, applications, and automation
 * Author: TRAE Development Team
 * Version: 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Monitor, 
  Plus, 
  Play, 
  Pause, 
  Square, 
  Settings, 
  Activity,
  Cpu,
  MemoryStick,
  Network,
  HardDrive,
  Eye,
  Bot,
  Terminal
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { VirtualDesktop, VirtualDesktopEvent } from '@/types/virtualDesktop';
import { apiService } from '@/services/apiService';
import { VirtualDesktopCreator } from './VirtualDesktopCreator';
import { VirtualDesktopCard } from './VirtualDesktopCard';
import { VirtualDesktopDetails } from './VirtualDesktopDetails';
import { VirtualDesktopAutomation } from './VirtualDesktopAutomation';

interface VirtualDesktopManagerProps {
  /** WebSocket connection for real-time communication */
  websocket?: WebSocket | null;
  /** Initial view mode */
  initialView?: 'grid' | 'list';
  /** Maximum number of virtual desktops */
  maxDesktops?: number;
  /** Callback when a desktop is selected */
  onDesktopSelect?: (desktop: VirtualDesktop) => void;
  /** View mode override */
  viewMode?: 'grid' | 'list';
}

export const VirtualDesktopManager: React.FC<VirtualDesktopManagerProps> = ({
  websocket,
  initialView = 'grid',
  maxDesktops = 10,
  onDesktopSelect,
  viewMode: externalViewMode
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [desktops, setDesktops] = useState<VirtualDesktop[]>([]);
  const [selectedDesktop, setSelectedDesktop] = useState<VirtualDesktop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(externalViewMode || initialView);
  const [activeTab, setActiveTab] = useState('overview');
  const [systemStats, setSystemStats] = useState({
    totalCpuUsage: 0,
    totalMemoryUsage: 0,
    totalNetworkUsage: 0,
    activeDesktops: 0,
    streamingDesktops: 0
  });

  const { toast } = useToast();

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  useEffect(() => {
    loadDesktops();
    
    // Set up periodic stats update
    const statsInterval = setInterval(updateSystemStats, 5000);

    return () => {
      clearInterval(statsInterval);
    };
  }, []);

  useEffect(() => {
    // Update view mode when external prop changes
    if (externalViewMode) {
      setViewMode(externalViewMode);
    }
  }, [externalViewMode]);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadDesktops = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await apiService.getDesktops();
      
      if (result.success && result.data) {
        // Convert API response to VirtualDesktop format
        const desktopList: VirtualDesktop[] = result.data.map(desktop => ({
          id: desktop.id,
          name: desktop.name,
          status: desktop.status as any,
          createdAt: desktop.createdAt,
          lastActivity: desktop.lastActivity,
          connectionUrl: desktop.connectionUrl,
          metadata: desktop.metadata || {},
          // Add default values for missing properties
          resourceUsage: {
            cpuUsage: 0,
            memoryUsage: 0,
            networkUsage: 0,
            diskUsage: 0
          },
          applications: [],
          streamConfig: {
            enabled: false,
            quality: 'medium',
            frameRate: 30,
            resolution: { width: 1920, height: 1080 }
          },
          automationConfig: {
            enabled: false,
            ocrRegions: [],
            automationScripts: []
          }
        }));
        
        setDesktops(desktopList);
        updateSystemStats();
      } else {
        console.warn('Failed to load desktops:', result.error);
        setDesktops([]);
        toast({
          title: "No Desktops Found",
          description: result.error || "No virtual desktops are currently available",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error loading virtual desktops:', error);
      setDesktops([]);
      toast({
        title: "Connection Error",
        description: "Failed to connect to backend services. Please check if the services are running.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const updateSystemStats = useCallback(() => {
    const stats = {
      totalCpuUsage: 0,
      totalMemoryUsage: 0,
      totalNetworkUsage: 0,
      activeDesktops: 0,
      streamingDesktops: 0
    };

    desktops.forEach(desktop => {
      stats.totalCpuUsage += desktop.resourceUsage.cpuUsage;
      stats.totalMemoryUsage += desktop.resourceUsage.memoryUsage;
      stats.totalNetworkUsage += desktop.resourceUsage.networkUsage;
      
      if (desktop.status === 'active' || desktop.status === 'streaming') {
        stats.activeDesktops++;
      }
      
      if (desktop.status === 'streaming') {
        stats.streamingDesktops++;
      }
    });

    setSystemStats(stats);
  }, [desktops]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleVirtualDesktopEvent = useCallback((event: VirtualDesktopEvent) => {
    console.log('Virtual Desktop Event:', event);
    
    switch (event.type) {
      case 'desktop_created':
      case 'desktop_destroyed':
      case 'stream_started':
      case 'stream_stopped':
      case 'application_launched':
      case 'application_closed':
        // Reload desktops to get updated state
        loadDesktops();
        break;
      
      case 'ocr_text_detected':
        toast({
          title: "OCR Text Detected",
          description: `Text detected in ${event.data.region}: ${event.data.text}`,
        });
        break;
      
      case 'automation_triggered':
        toast({
          title: "Automation Triggered",
          description: `Script "${event.data.scriptName}" executed on desktop ${event.desktopId}`,
        });
        break;
      
      case 'error_occurred':
        toast({
          title: "Desktop Error",
          description: event.data.message || "An error occurred",
          variant: "destructive"
        });
        break;
    }
  }, [loadDesktops, toast]);

  const handleCreateDesktop = useCallback(async (config: Partial<VirtualDesktop>) => {
    try {
      if (desktops.length >= maxDesktops) {
        toast({
          title: "Maximum Desktops Reached",
          description: `Cannot create more than ${maxDesktops} virtual desktops`,
          variant: "destructive"
        });
        return;
      }

      const result = await apiService.createDesktop({
        name: config.name || 'New Desktop',
        metadata: config.metadata || {}
      });
      
      if (result.success && result.data) {
        // Convert API response to VirtualDesktop format
        const newDesktop: VirtualDesktop = {
          id: result.data.id,
          name: result.data.name,
          status: result.data.status as any,
          createdAt: result.data.createdAt,
          lastActivity: result.data.lastActivity,
          connectionUrl: result.data.connectionUrl,
          metadata: result.data.metadata || {},
          resourceUsage: {
            cpuUsage: 0,
            memoryUsage: 0,
            networkUsage: 0,
            diskUsage: 0
          },
          applications: [],
          streamConfig: {
            enabled: false,
            quality: 'medium',
            frameRate: 30,
            resolution: { width: 1920, height: 1080 }
          },
          automationConfig: {
            enabled: false,
            ocrRegions: [],
            automationScripts: []
          }
        };
        
        setDesktops(prev => [...prev, newDesktop]);
        setShowCreator(false);
        
        toast({
          title: "Desktop Created",
          description: `Virtual desktop "${newDesktop.name}" created successfully`,
        });
      } else {
        throw new Error(result.error || 'Failed to create desktop');
      }
    } catch (error) {
      console.error('Error creating virtual desktop:', error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create virtual desktop",
        variant: "destructive"
      });
    }
  }, [desktops.length, maxDesktops, toast]);

  const handleDeleteDesktop = useCallback(async (desktopId: string) => {
    try {
      const result = await apiService.deleteDesktop(desktopId);
      
      if (result.success) {
        setDesktops(prev => prev.filter(d => d.id !== desktopId));
        
        if (selectedDesktop?.id === desktopId) {
          setSelectedDesktop(null);
        }
        
        toast({
          title: "Desktop Deleted",
          description: "Virtual desktop deleted successfully",
        });
      } else {
        throw new Error(result.error || 'Failed to delete desktop');
      }
    } catch (error) {
      console.error('Error deleting virtual desktop:', error);
      toast({
        title: "Deletion Failed",
        description: error instanceof Error ? error.message : "Failed to delete virtual desktop",
        variant: "destructive"
      });
    }
  }, [selectedDesktop, toast]);

  const handleStartStream = useCallback(async (desktopId: string) => {
    try {
      const result = await apiService.connectToDesktop(desktopId);
      
      if (result.success) {
        loadDesktops(); // Refresh to get updated status
        
        toast({
          title: "Stream Started",
          description: "Desktop streaming started successfully",
        });
      } else {
        throw new Error(result.error || 'Failed to start stream');
      }
    } catch (error) {
      console.error('Error starting stream:', error);
      toast({
        title: "Stream Failed",
        description: error instanceof Error ? error.message : "Failed to start desktop stream",
        variant: "destructive"
      });
    }
  }, [loadDesktops, toast]);

  const handleStopStream = useCallback(async (desktopId: string) => {
    try {
      const result = await apiService.disconnectFromDesktop(desktopId);
      
      if (result.success) {
        loadDesktops(); // Refresh to get updated status
        
        toast({
          title: "Stream Stopped",
          description: "Desktop streaming stopped successfully",
        });
      } else {
        throw new Error(result.error || 'Failed to stop stream');
      }
    } catch (error) {
      console.error('Error stopping stream:', error);
      toast({
        title: "Stream Stop Failed",
        description: error instanceof Error ? error.message : "Failed to stop desktop stream",
        variant: "destructive"
      });
    }
  }, [loadDesktops, toast]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderSystemStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Monitor className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-sm font-medium">Active Desktops</p>
              <p className="text-2xl font-bold">{systemStats.activeDesktops}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Eye className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-sm font-medium">Streaming</p>
              <p className="text-2xl font-bold">{systemStats.streamingDesktops}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Cpu className="h-4 w-4 text-orange-500" />
            <div>
              <p className="text-sm font-medium">CPU Usage</p>
              <p className="text-2xl font-bold">{systemStats.totalCpuUsage.toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <MemoryStick className="h-4 w-4 text-purple-500" />
            <div>
              <p className="text-sm font-medium">Memory</p>
              <p className="text-2xl font-bold">{(systemStats.totalMemoryUsage / 1024).toFixed(1)}GB</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Network className="h-4 w-4 text-red-500" />
            <div>
              <p className="text-sm font-medium">Network</p>
              <p className="text-2xl font-bold">{(systemStats.totalNetworkUsage / 1000).toFixed(1)}Mbps</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderDesktopGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {desktops.map(desktop => (
        <VirtualDesktopCard
          key={desktop.id}
          desktop={desktop}
          onSelect={() => {
            setSelectedDesktop(desktop);
            onDesktopSelect?.(desktop);
          }}
          onDelete={() => handleDeleteDesktop(desktop.id)}
          onStartStream={() => handleStartStream(desktop.id)}
          onStopStream={() => handleStopStream(desktop.id)}
          isSelected={selectedDesktop?.id === desktop.id}
        />
      ))}
    </div>
  );

  const renderDesktopList = () => (
    <div className="space-y-2">
      {desktops.map(desktop => (
        <Card 
          key={desktop.id} 
          className={`cursor-pointer transition-colors ${
            selectedDesktop?.id === desktop.id ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => setSelectedDesktop(desktop)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Monitor className="h-8 w-8 text-blue-500" />
                <div>
                  <h3 className="font-semibold">{desktop.name}</h3>
                  <p className="text-sm text-gray-500">
                    {desktop.resolution?.width || 1920}x{desktop.resolution?.height || 1080} • 
                    {desktop.applications.length} apps
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={desktop.status === 'streaming' ? 'default' : 'secondary'}>
                  {desktop.status}
                </Badge>
                <div className="flex space-x-1">
                  {desktop.status === 'streaming' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStopStream(desktop.id);
                      }}
                    >
                      <Square className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartStream(desktop.id);
                      }}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading virtual desktops...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Virtual Desktop Manager</h1>
          <p className="text-gray-600">
            Manage virtual desktops, applications, and automation pipelines
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? 'List View' : 'Grid View'}
          </Button>
          <Button onClick={() => setShowCreator(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Desktop
          </Button>
        </div>
      </div>

      {/* System Statistics */}
      {renderSystemStats()}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Desktop List/Grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Virtual Desktops ({desktops.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {desktops.length === 0 ? (
                <div className="text-center py-8">
                  <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No virtual desktops created yet</p>
                  <Button onClick={() => setShowCreator(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Desktop
                  </Button>
                </div>
              ) : (
                viewMode === 'grid' ? renderDesktopGrid() : renderDesktopList()
              )}
            </CardContent>
          </Card>
        </div>

        {/* Desktop Details */}
        <div>
          {selectedDesktop ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="automation">Automation</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview">
                <VirtualDesktopDetails
                  desktop={selectedDesktop}
                  onUpdate={(updates) => {
                    virtualDesktopManager.updateDesktop(selectedDesktop.id, updates);
                    loadDesktops();
                  }}
                />
              </TabsContent>
              
              <TabsContent value="automation">
                <VirtualDesktopAutomation
                  desktop={selectedDesktop}
                  automationConfig={selectedDesktop.automationConfig}
                  onConfigUpdate={(automationConfig) => {
                    virtualDesktopManager.updateDesktop(selectedDesktop.id, { automationConfig });
                    loadDesktops();
                  }}
                />
              </TabsContent>
              
              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle>Desktop Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-500">Settings panel coming soon...</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Select a virtual desktop to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Desktop Creator Modal */}
      {showCreator && (
        <VirtualDesktopCreator
          onClose={() => setShowCreator(false)}
          onCreate={handleCreateDesktop}
        />
      )}
    </div>
  );
};