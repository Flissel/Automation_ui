import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Play,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Terminal,
  Shield
} from 'lucide-react';

const SETUP_API_URL = 'http://localhost:3001';

interface SetupLog {
  type: 'info' | 'success' | 'error' | 'stdout' | 'stderr';
  message: string;
  timestamp: Date;
}

export default function DesktopClientSetup() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [clientRunning, setClientRunning] = useState<boolean | null>(null);
  const [setupLogs, setSetupLogs] = useState<SetupLog[]>([]);
  const [isRunningSetup, setIsRunningSetup] = useState(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAdminStatus();
    checkClientStatus();

    // Poll client status every 5 seconds
    const interval = setInterval(checkClientStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Auto-scroll logs to bottom
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [setupLogs]);

  const addLog = (type: SetupLog['type'], message: string) => {
    setSetupLogs(prev => [...prev, {
      type,
      message,
      timestamp: new Date()
    }]);
  };

  const checkAdminStatus = async () => {
    try {
      const response = await fetch(`${SETUP_API_URL}/api/setup/check-admin`);
      const data = await response.json();
      setIsAdmin(data.isAdmin);
    } catch (error) {
      console.error('Failed to check admin status:', error);
      setIsAdmin(null);
    }
  };

  const checkClientStatus = async () => {
    try {
      const response = await fetch(`${SETUP_API_URL}/api/setup/status`);
      const data = await response.json();
      setClientRunning(data.clientRunning);
    } catch (error) {
      console.error('Failed to check client status:', error);
      setClientRunning(null);
    }
  };

  const handleRunSetup = async () => {
    if (!isAdmin) {
      addLog('error', 'Setup API must run with Administrator privileges');
      return;
    }

    setIsRunningSetup(true);
    setSetupLogs([]);
    addLog('info', 'Starting permission setup...');

    try {
      const response = await fetch(`${SETUP_API_URL}/api/setup/run-permissions`, {
        method: 'POST'
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6));
                addLog(data.type, data.message);
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }

      addLog('success', 'Setup completed! Please restart your computer.');
    } catch (error) {
      addLog('error', `Setup failed: ${error}`);
    } finally {
      setIsRunningSetup(false);
    }
  };

  const handleCheckPermissions = async () => {
    setIsCheckingPermissions(true);
    setSetupLogs([]);
    addLog('info', 'Running diagnostics...');

    try {
      const response = await fetch(`${SETUP_API_URL}/api/setup/check-permissions`, {
        method: 'POST'
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6));
                addLog(data.type, data.message);
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }

      addLog('success', 'Diagnostics completed');
    } catch (error) {
      addLog('error', `Diagnostics failed: ${error}`);
    } finally {
      setIsCheckingPermissions(false);
    }
  };

  const handleRestartClient = async () => {
    addLog('info', 'Restarting desktop client...');

    try {
      const response = await fetch(`${SETUP_API_URL}/api/setup/restart-client`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        addLog('success', 'Desktop client restarted successfully');
        setTimeout(checkClientStatus, 2000);
      } else {
        addLog('error', 'Failed to restart desktop client');
      }
    } catch (error) {
      addLog('error', `Restart failed: ${error}`);
    }
  };

  const getStatusBadge = (status: boolean | null) => {
    if (status === null) {
      return <Badge variant="outline">Checking...</Badge>;
    }
    return status ? (
      <Badge className="bg-green-500">
        <CheckCircle className="h-3 w-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        Inactive
      </Badge>
    );
  };

  const getLogIcon = (type: SetupLog['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'info':
        return <AlertTriangle className="h-4 w-4 text-blue-500" />;
      default:
        return <Terminal className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Desktop Client Setup</h1>
          <p className="text-muted-foreground mt-1">
            Configure permissions and manage the desktop capture client
          </p>
        </div>
        <Settings className="h-8 w-8 text-muted-foreground" />
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Setup API Status</span>
              {getStatusBadge(isAdmin)}
            </CardTitle>
            <CardDescription>
              Permission setup requires Administrator privileges
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAdmin === false && (
              <Alert variant="destructive">
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Setup API is not running as Administrator. Start it with admin privileges to enable setup features.
                </AlertDescription>
              </Alert>
            )}
            {isAdmin === true && (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Setup API has Administrator privileges. All features available.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Desktop Client</span>
              {getStatusBadge(clientRunning)}
            </CardTitle>
            <CardDescription>
              Python screen capture agent status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleRestartClient}
              disabled={clientRunning === null}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Restart Client
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Actions</CardTitle>
          <CardDescription>
            Configure Windows permissions and test screen capture
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleRunSetup}
              disabled={!isAdmin || isRunningSetup}
              size="lg"
              className="w-full"
            >
              <Play className="h-4 w-4 mr-2" />
              {isRunningSetup ? 'Running Setup...' : 'Run Permission Setup'}
            </Button>

            <Button
              onClick={handleCheckPermissions}
              disabled={isCheckingPermissions}
              variant="outline"
              size="lg"
              className="w-full"
            >
              <Terminal className="h-4 w-4 mr-2" />
              {isCheckingPermissions ? 'Checking...' : 'Check Permissions'}
            </Button>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Permission setup will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Enable Windows screen capture permissions</li>
                <li>Configure power settings to prevent monitor sleep</li>
                <li>Optionally create auto-start task on login</li>
                <li>Test screen capture from all monitors</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Output Logs */}
      {setupLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Setup Output</CardTitle>
            <CardDescription>
              Real-time logs from setup scripts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-white p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
              {setupLogs.map((log, index) => (
                <div key={index} className="flex items-start gap-2 mb-2">
                  {getLogIcon(log.type)}
                  <span className="text-gray-400 text-xs">
                    [{log.timestamp.toLocaleTimeString()}]
                  </span>
                  <span className="flex-1 whitespace-pre-wrap">{log.message}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Setup (Alternative)</CardTitle>
          <CardDescription>
            If the automated setup doesn't work, use these batch files
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div>
              <strong>1. Permission Setup:</strong> Right-click{' '}
              <code className="bg-black text-white px-2 py-1 rounded">RUN-SETUP.bat</code>{' '}
              → Run as administrator
            </div>
            <div>
              <strong>2. Check Status:</strong> Double-click{' '}
              <code className="bg-black text-white px-2 py-1 rounded">CHECK-PERMISSIONS.bat</code>
            </div>
            <div>
              <strong>3. Start Client:</strong> Double-click{' '}
              <code className="bg-black text-white px-2 py-1 rounded">START-CLIENT.bat</code>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            All batch files are located in the <code>desktop-client</code> folder
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
