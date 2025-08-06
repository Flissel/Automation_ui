import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { apiService, VirtualDesktop, WorkflowTemplate, WorkflowExecution } from "@/services/apiService";
import { 
  Monitor, 
  Workflow, 
  Settings, 
  LogOut,
  Activity,
  Server,
  Users,
  BarChart3,
  Grid,
  Layers,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw
} from "lucide-react";

const Dashboard = () => {
  const [user, setUser] = useState(authService.getCurrentUser());
  const [isLoading, setIsLoading] = useState(true);
  const [desktops, setDesktops] = useState<VirtualDesktop[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Listen for auth changes
    const unsubscribe = authService.onAuthStateChange((user) => {
      setUser(user);
      setIsLoading(false);
      
      if (!user) {
        navigate("/auth");
      }
    });

    // Check current user
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setIsLoading(false);
    
    if (!currentUser) {
      navigate("/auth");
    }

    return unsubscribe;
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Load all data in parallel with graceful error handling
      const [desktopsData, workflowsData, executionsData, healthData] = await Promise.allSettled([
        apiService.getDesktops(),
        apiService.getWorkflowTemplates(),
        apiService.getWorkflowHistory(),
        apiService.getHealthStatus()
      ]);

      // Handle desktops
      if (desktopsData.status === 'fulfilled' && desktopsData.value.success) {
        setDesktops(desktopsData.value.data || []);
      } else {
        console.warn('Failed to load desktops:', desktopsData.status === 'fulfilled' ? desktopsData.value.error : desktopsData.reason);
        setDesktops([]);
      }

      // Handle workflows
      if (workflowsData.status === 'fulfilled' && workflowsData.value.success) {
        setWorkflows(workflowsData.value.data || []);
      } else {
        console.warn('Failed to load workflows:', workflowsData.status === 'fulfilled' ? workflowsData.value.error : workflowsData.reason);
        setWorkflows([]);
      }

      // Handle executions with graceful fallback
      if (executionsData.status === 'fulfilled' && executionsData.value.success) {
        setExecutions(executionsData.value.data || []);
      } else {
        console.warn('Failed to load executions:', executionsData.status === 'fulfilled' ? executionsData.value.error : executionsData.reason);
        // Set empty array instead of showing error to user for better UX
        setExecutions([]);
      }

      // Handle health status
      if (healthData.status === 'fulfilled' && healthData.value.success) {
        setHealthStatus(healthData.value.data);
      } else {
        console.warn('Failed to load health status:', healthData.status === 'fulfilled' ? healthData.value.error : healthData.reason);
        // Set default health status
        setHealthStatus({
          status: 'unknown',
          services: [],
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Dashboard partially loaded",
        description: "Some dashboard data could not be loaded. Please try refreshing.",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast({
      title: "Dashboard refreshed",
      description: "All data has been updated",
    });
  };

  const handleSignOut = async () => {
    await authService.signOut();
    navigate("/auth");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  const quickActions = [
    {
      title: "Live Desktop Streaming",
      description: "Monitor and control remote desktops in real-time",
      icon: <Monitor className="w-8 h-8" />,
      action: () => navigate("/live-desktop"),
      color: "bg-blue-500"
    },
    {
      title: "Virtual Desktops",
      description: "Manage virtual desktop environments for automation",
      icon: <Layers className="w-8 h-8" />,
      action: () => navigate("/virtual-desktops"),
      color: "bg-indigo-500"
    },
    {
      title: "Multi-Desktop Streams",
      description: "View up to 4 desktop streams simultaneously",
      icon: <Grid className="w-8 h-8" />,
      action: () => navigate("/multi-desktop"),
      color: "bg-purple-500"
    },
    {
      title: "Workflow Automation",
      description: "Create and manage automated workflows",
      icon: <Workflow className="w-8 h-8" />,
      action: () => navigate("/workflow"),
      color: "bg-green-500"
    },
    {
      title: "System Monitoring",
      description: "View system performance and metrics",
      icon: <Activity className="w-8 h-8" />,
      action: () => navigate("/monitoring"),
      color: "bg-orange-500"
    },
    {
      title: "Settings",
      description: "Configure your TRAE automation platform",
      icon: <Settings className="w-8 h-8" />,
      action: () => navigate("/settings"),
      color: "bg-gray-500"
    }
  ];

  // Calculate real-time stats from backend data
  const activeDesktops = desktops.filter(d => d.status === 'active').length;
  const runningWorkflows = executions.filter(e => e.status === 'running').length;
  const totalWorkflows = executions.length;
  const successRate = totalWorkflows > 0 
    ? Math.round((executions.filter(e => e.status === 'completed').length / totalWorkflows) * 100)
    : 0;

  const stats = [
    { 
      label: "Active Desktops", 
      value: activeDesktops.toString(), 
      icon: <Monitor className="w-5 h-5" />,
      status: activeDesktops > 0 ? 'success' : 'warning'
    },
    { 
      label: "Running Workflows", 
      value: runningWorkflows.toString(), 
      icon: <Workflow className="w-5 h-5" />,
      status: 'info'
    },
    { 
      label: "Available Templates", 
      value: workflows.length.toString(), 
      icon: <Layers className="w-5 h-5" />,
      status: 'info'
    },
    { 
      label: "Success Rate", 
      value: `${successRate}%`, 
      icon: <BarChart3 className="w-5 h-5" />,
      status: successRate >= 80 ? 'success' : successRate >= 60 ? 'warning' : 'error'
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <Monitor className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-xl font-semibold">TRAE Unity AI Platform</h1>
              <p className="text-sm text-muted-foreground">Desktop Automation & Remote Management</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm"
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <div className="text-right">
              <p className="text-sm font-medium">{user?.email || 'User'}</p>
              <p className="text-xs text-muted-foreground">Administrator</p>
            </div>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back!</h2>
          <p className="text-muted-foreground">
            Access your desktop automation tools and manage remote systems from this unified dashboard.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="relative">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-muted-foreground">
                      {stat.icon}
                    </div>
                    {stat.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {stat.status === 'warning' && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                    {stat.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                    {stat.status === 'info' && <Clock className="w-4 h-4 text-blue-500" />}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {quickActions.map((action, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={action.action}>
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center text-white mb-4`}>
                    {action.icon}
                  </div>
                  <h4 className="font-semibold mb-2">{action.title}</h4>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system events and workflow executions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Show recent workflow executions */}
              {executions.slice(0, 5).map((execution, index) => {
                const getStatusIcon = (status: string) => {
                  switch (status) {
                    case 'completed':
                      return <CheckCircle className="w-5 h-5 text-green-500" />;
                    case 'running':
                      return <Clock className="w-5 h-5 text-blue-500" />;
                    case 'failed':
                      return <AlertCircle className="w-5 h-5 text-red-500" />;
                    default:
                      return <Workflow className="w-5 h-5 text-gray-500" />;
                  }
                };

                const getTimeAgo = (timestamp: string) => {
                  const now = new Date();
                  const time = new Date(timestamp);
                  const diffMs = now.getTime() - time.getTime();
                  const diffMins = Math.floor(diffMs / 60000);
                  
                  if (diffMins < 1) return 'Just now';
                  if (diffMins < 60) return `${diffMins} minutes ago`;
                  const diffHours = Math.floor(diffMins / 60);
                  if (diffHours < 24) return `${diffHours} hours ago`;
                  const diffDays = Math.floor(diffHours / 24);
                  return `${diffDays} days ago`;
                };

                const template = workflows.find(w => w.id === execution.templateId);

                return (
                  <div key={execution.id} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                    {getStatusIcon(execution.status)}
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Workflow "{template?.name || 'Unknown'}" {execution.status}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {execution.status === 'running' && execution.progress && `Progress: ${execution.progress}% • `}
                        {getTimeAgo(execution.startTime)}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Show active desktops */}
              {desktops.filter(d => d.status === 'active').slice(0, 3).map((desktop, index) => (
                <div key={desktop.id} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                  <Monitor className="w-5 h-5 text-blue-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Desktop "{desktop.name}" connected</p>
                    <p className="text-xs text-muted-foreground">
                      Status: {desktop.status} • {desktop.lastActivity ? `Last activity: ${new Date(desktop.lastActivity).toLocaleTimeString()}` : 'Active now'}
                    </p>
                  </div>
                </div>
              ))}

              {/* Show message if no activity */}
              {executions.length === 0 && desktops.length === 0 && (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                  <p className="text-xs text-muted-foreground">Start a workflow or connect a desktop to see activity here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;