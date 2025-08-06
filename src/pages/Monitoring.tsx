import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Activity, Server, Cpu, HardDrive, Network, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { apiService } from '@/services/apiService';
import { useToast } from '@/hooks/use-toast';

interface HealthStatus {
  status: string;
  services: Array<{
    name: string;
    status: string;
    lastCheck: string;
    responseTime?: number;
  }>;
  timestamp: string;
  systemMetrics?: {
    cpuUsage: number;
    memoryUsage: number;
    networkIO: number;
    activeConnections: number;
  };
}

const Monitoring: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load health status from backend
  const loadHealthStatus = async () => {
    try {
      const result = await apiService.getHealthStatus();
      
      if (result.success && result.data) {
        setHealthStatus(result.data);
      } else {
        console.warn('Failed to load health status:', result.error);
        // Set default health status for better UX
        setHealthStatus({
          status: 'unknown',
          services: [
            { name: 'Virtual Desktop Service', status: 'unknown', lastCheck: new Date().toISOString() },
            { name: 'Workflow Orchestrator', status: 'unknown', lastCheck: new Date().toISOString() },
            { name: 'Desktop Automation', status: 'unknown', lastCheck: new Date().toISOString() },
            { name: 'OCR Processor', status: 'unknown', lastCheck: new Date().toISOString() }
          ],
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error loading health status:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to backend services. Please check if the services are running.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadHealthStatus();
    setIsRefreshing(false);
    toast({
      title: "Monitoring Data Refreshed",
      description: "System health status has been updated",
    });
  };

  useEffect(() => {
    loadHealthStatus();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadHealthStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Generate metrics from health status or use defaults
  const metrics = healthStatus?.systemMetrics ? [
    { 
      label: 'CPU Usage', 
      value: `${healthStatus.systemMetrics.cpuUsage}%`, 
      icon: <Cpu className="w-5 h-5" />, 
      color: healthStatus.systemMetrics.cpuUsage > 80 ? 'text-red-500' : healthStatus.systemMetrics.cpuUsage > 60 ? 'text-yellow-500' : 'text-green-500'
    },
    { 
      label: 'Memory Usage', 
      value: `${healthStatus.systemMetrics.memoryUsage}%`, 
      icon: <HardDrive className="w-5 h-5" />, 
      color: healthStatus.systemMetrics.memoryUsage > 80 ? 'text-red-500' : healthStatus.systemMetrics.memoryUsage > 60 ? 'text-yellow-500' : 'text-green-500'
    },
    { 
      label: 'Network I/O', 
      value: `${healthStatus.systemMetrics.networkIO} MB/s`, 
      icon: <Network className="w-5 h-5" />, 
      color: 'text-blue-500'
    },
    { 
      label: 'Active Connections', 
      value: healthStatus.systemMetrics.activeConnections.toString(), 
      icon: <Server className="w-5 h-5" />, 
      color: 'text-purple-500'
    },
  ] : [
    { label: 'CPU Usage', value: 'N/A', icon: <Cpu className="w-5 h-5" />, color: 'text-gray-500' },
    { label: 'Memory Usage', value: 'N/A', icon: <HardDrive className="w-5 h-5" />, color: 'text-gray-500' },
    { label: 'Network I/O', value: 'N/A', icon: <Network className="w-5 h-5" />, color: 'text-gray-500' },
    { label: 'Active Connections', value: 'N/A', icon: <Server className="w-5 h-5" />, color: 'text-gray-500' },
  ];

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'running':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'unhealthy':
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'running':
        return 'text-green-500';
      case 'degraded':
      case 'warning':
        return 'text-yellow-500';
      case 'unhealthy':
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">System Monitoring</h1>
              <p className="text-muted-foreground">Real-time system health and performance metrics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {healthStatus && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted">
                {getStatusIcon(healthStatus.status)}
                <span className={`text-sm font-medium ${getStatusColor(healthStatus.status)}`}>
                  {healthStatus.status.charAt(0).toUpperCase() + healthStatus.status.slice(1)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                    <p className={`text-2xl font-bold ${metric.color}`}>{metric.value}</p>
                  </div>
                  <div className={metric.color}>
                    {metric.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Service Status */}
        {healthStatus && (
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Service Status
                </CardTitle>
                <CardDescription>
                  Current status of all system services
                  {healthStatus.timestamp && (
                    <span className="ml-2 text-xs">
                      Last updated: {new Date(healthStatus.timestamp).toLocaleString()}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {healthStatus.services.map((service, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(service.status)}
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Last check: {new Date(service.lastCheck).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${getStatusColor(service.status)}`}>
                          {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                        </p>
                        {service.responseTime && (
                          <p className="text-xs text-muted-foreground">
                            {service.responseTime}ms
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Advanced Features */}
        <Card>
          <CardHeader>
            <CardTitle>Advanced Monitoring Features</CardTitle>
            <CardDescription>Additional monitoring capabilities coming soon</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Enhanced Monitoring Dashboard</h3>
              <p className="text-muted-foreground mb-6">
                Advanced monitoring features are in development to provide deeper insights into system performance.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 border rounded-lg">
                  <div className="font-medium mb-1">Real-time Alerts</div>
                  <div className="text-muted-foreground">Instant notifications for system issues</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="font-medium mb-1">Historical Charts</div>
                  <div className="text-muted-foreground">Performance trends over time</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="font-medium mb-1">Log Aggregation</div>
                  <div className="text-muted-foreground">Centralized logging and analysis</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Monitoring;