import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Wifi, ArrowLeft, Save, RotateCcw, Play, Square, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWorkflowStore } from '@/stores/workflowStore';

// WebSocket Configuration Interface
interface WebsocketConfig {
  url: string;
  port: number;
  reconnect: boolean;
  service_command: string;
  auto_start: boolean;
  health_check_url: string;
  process_id?: number;
  status: 'stopped' | 'starting' | 'running' | 'failed';
  filesystem_bridge: boolean;
  data_directory: string;
  file_format: 'json' | 'xml' | 'csv';
  watch_interval: number;
}

// Default configuration based on node template
const defaultConfig: WebsocketConfig = {
  url: 'ws://localhost',
  port: 8080,
  reconnect: true,
  service_command: 'node websocket-server.js',
  auto_start: false,
  health_check_url: '',
  status: 'stopped',
  filesystem_bridge: true,
  data_directory: './workflow-data',
  file_format: 'json',
  watch_interval: 1000
};

/**
 * WebSocket Configuration Page
 * Provides configuration interface for websocket_config node type
 * Handles WebSocket connection settings, service management, and filesystem integration
 */
export default function WebsocketConfig() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addNode } = useWorkflowStore();
  
  // Configuration state management
  const [config, setConfig] = useState<WebsocketConfig>(defaultConfig);
  const [isValid, setIsValid] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [serviceRunning, setServiceRunning] = useState(false);

  // Load saved configuration on component mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('websocket_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig({ ...defaultConfig, ...parsed });
      } catch (error) {
        console.error('Error loading saved WebSocket config:', error);
        toast({
          title: 'Konfiguration laden fehlgeschlagen',
          description: 'Standardkonfiguration wird verwendet.',
          variant: 'destructive'
        });
      }
    }
  }, [toast]);

  // Validate configuration whenever config changes
  useEffect(() => {
    const urlValid = config.url.trim() !== '';
    const portValid = config.port > 0 && config.port <= 65535;
    const directoryValid = config.data_directory.trim() !== '';
    const intervalValid = config.watch_interval >= 100;
    
    setIsValid(urlValid && portValid && directoryValid && intervalValid);
  }, [config]);

  // Handle configuration field updates
  const updateConfig = (field: keyof WebsocketConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  // Save configuration to localStorage and workflow store
  const handleSave = () => {
    if (!isValid) {
      toast({
        title: 'Ungültige Konfiguration',
        description: 'Bitte überprüfen Sie alle Eingabefelder.',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Save to localStorage for persistence
      localStorage.setItem('websocket_config', JSON.stringify(config));
      
      // Add to workflow store
      addNode({
        id: `websocket_config_${Date.now()}`,
        type: 'websocket_config',
        position: { x: 100, y: 100 },
        data: {
          label: 'WebSocket Config',
          config: config,
          nodeType: 'websocket_config'
        }
      });

      toast({
        title: 'Konfiguration gespeichert',
        description: 'WebSocket-Konfiguration wurde erfolgreich gespeichert.',
      });
    } catch (error) {
      console.error('Error saving WebSocket config:', error);
      toast({
        title: 'Speichern fehlgeschlagen',
        description: 'Fehler beim Speichern der Konfiguration.',
        variant: 'destructive'
      });
    }
  };

  // Reset configuration to defaults
  const handleReset = () => {
    setConfig(defaultConfig);
    localStorage.removeItem('websocket_config');
    toast({
      title: 'Konfiguration zurückgesetzt',
      description: 'Standardkonfiguration wurde wiederhergestellt.',
    });
  };

  // Test WebSocket connection
  const testConnection = async () => {
    setConnectionStatus('connecting');
    
    try {
      const wsUrl = `${config.url}:${config.port}`;
      const ws = new WebSocket(wsUrl);
      
      const timeout = setTimeout(() => {
        ws.close();
        setConnectionStatus('error');
        toast({
          title: 'Verbindungstest fehlgeschlagen',
          description: 'Timeout beim Verbindungsaufbau.',
          variant: 'destructive'
        });
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        setConnectionStatus('connected');
        ws.close();
        toast({
          title: 'Verbindung erfolgreich',
          description: 'WebSocket-Verbindung wurde erfolgreich getestet.',
        });
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        setConnectionStatus('error');
        toast({
          title: 'Verbindungstest fehlgeschlagen',
          description: 'WebSocket-Server ist nicht erreichbar.',
          variant: 'destructive'
        });
      };
    } catch (error) {
      setConnectionStatus('error');
      toast({
        title: 'Verbindungstest fehlgeschlagen',
        description: 'Fehler beim Testen der WebSocket-Verbindung.',
        variant: 'destructive'
      });
    }
  };

  // Get status badge color and icon
  const getStatusBadge = () => {
    switch (config.status) {
      case 'running':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Running</Badge>;
      case 'starting':
        return <Badge variant="secondary"><Play className="w-3 h-3 mr-1" />Starting</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline"><Square className="w-3 h-3 mr-1" />Stopped</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </Button>
        <div className="flex items-center gap-3">
          <Wifi className="w-8 h-8 text-purple-500" />
          <div>
            <h1 className="text-2xl font-bold">WebSocket Konfiguration</h1>
            <p className="text-muted-foreground">WebSocket-Service und Dateisystem-Bridge konfigurieren</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Connection Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="w-5 h-5" />
                Verbindungseinstellungen
              </CardTitle>
              <CardDescription>
                WebSocket-Server-Verbindungsparameter konfigurieren
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="url">WebSocket URL *</Label>
                  <Input
                    id="url"
                    value={config.url}
                    onChange={(e) => updateConfig('url', e.target.value)}
                    placeholder="ws://localhost"
                    className={!config.url.trim() ? 'border-red-500' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port">Port *</Label>
                  <Input
                    id="port"
                    type="number"
                    value={config.port}
                    onChange={(e) => updateConfig('port', parseInt(e.target.value) || 0)}
                    placeholder="8080"
                    min="1"
                    max="65535"
                    className={config.port <= 0 || config.port > 65535 ? 'border-red-500' : ''}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="health_check_url">Health Check URL</Label>
                <Input
                  id="health_check_url"
                  value={config.health_check_url}
                  onChange={(e) => updateConfig('health_check_url', e.target.value)}
                  placeholder="http://localhost:8080/health"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="reconnect"
                  checked={config.reconnect}
                  onCheckedChange={(checked) => updateConfig('reconnect', checked)}
                />
                <Label htmlFor="reconnect">Automatische Wiederverbindung</Label>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={testConnection}
                  disabled={connectionStatus === 'connecting' || !config.url || !config.port}
                  variant="outline"
                  size="sm"
                >
                  {connectionStatus === 'connecting' ? 'Teste...' : 'Verbindung testen'}
                </Button>
                {connectionStatus !== 'disconnected' && (
                  <Badge 
                    variant={connectionStatus === 'connected' ? 'default' : 'destructive'}
                    className={connectionStatus === 'connected' ? 'bg-green-500' : ''}
                  >
                    {connectionStatus === 'connected' ? 'Verbunden' : 
                     connectionStatus === 'connecting' ? 'Verbinde...' : 'Fehler'}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Service Management */}
          <Card>
            <CardHeader>
              <CardTitle>Service-Verwaltung</CardTitle>
              <CardDescription>
                WebSocket-Service-Konfiguration und -Status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="service_command">Service Start Command</Label>
                <Input
                  id="service_command"
                  value={config.service_command}
                  onChange={(e) => updateConfig('service_command', e.target.value)}
                  placeholder="node websocket-server.js"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto_start"
                    checked={config.auto_start}
                    onCheckedChange={(checked) => updateConfig('auto_start', checked)}
                  />
                  <Label htmlFor="auto_start">Service automatisch starten</Label>
                </div>
                {getStatusBadge()}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Service Status</Label>
                <Select value={config.status} onValueChange={(value) => updateConfig('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stopped">Stopped</SelectItem>
                    <SelectItem value="starting">Starting</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.process_id && (
                <div className="space-y-2">
                  <Label>Process ID</Label>
                  <Input value={config.process_id} disabled />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filesystem Integration */}
          <Card>
            <CardHeader>
              <CardTitle>Dateisystem-Integration</CardTitle>
              <CardDescription>
                Konfiguration für Dateisystem-Bridge und Datenverarbeitung
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="filesystem_bridge"
                  checked={config.filesystem_bridge}
                  onCheckedChange={(checked) => updateConfig('filesystem_bridge', checked)}
                />
                <Label htmlFor="filesystem_bridge">Dateisystem-Bridge aktivieren</Label>
              </div>

              {config.filesystem_bridge && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="data_directory">Datenverzeichnis *</Label>
                    <Input
                      id="data_directory"
                      value={config.data_directory}
                      onChange={(e) => updateConfig('data_directory', e.target.value)}
                      placeholder="./workflow-data"
                      className={!config.data_directory.trim() ? 'border-red-500' : ''}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="file_format">Dateiformat</Label>
                      <Select value={config.file_format} onValueChange={(value) => updateConfig('file_format', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="json">JSON</SelectItem>
                          <SelectItem value="xml">XML</SelectItem>
                          <SelectItem value="csv">CSV</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="watch_interval">Überwachungsintervall (ms) *</Label>
                      <Input
                        id="watch_interval"
                        type="number"
                        value={config.watch_interval}
                        onChange={(e) => updateConfig('watch_interval', parseInt(e.target.value) || 100)}
                        placeholder="1000"
                        min="100"
                        className={config.watch_interval < 100 ? 'border-red-500' : ''}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Aktionen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleSave}
                disabled={!isValid}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                Konfiguration speichern
              </Button>
              
              <Button
                onClick={handleReset}
                variant="outline"
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Zurücksetzen
              </Button>
            </CardContent>
          </Card>

          {/* Configuration Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Konfigurationsvorschau</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">URL:</span>
                  <span className="font-mono">{config.url}:{config.port}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reconnect:</span>
                  <span>{config.reconnect ? 'Ja' : 'Nein'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Auto Start:</span>
                  <span>{config.auto_start ? 'Ja' : 'Nein'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="capitalize">{config.status}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Filesystem:</span>
                  <span>{config.filesystem_bridge ? 'Aktiviert' : 'Deaktiviert'}</span>
                </div>
                {config.filesystem_bridge && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Format:</span>
                      <span className="uppercase">{config.file_format}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Intervall:</span>
                      <span>{config.watch_interval}ms</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Validation Status */}
          <Card>
            <CardHeader>
              <CardTitle>Validierungsstatus</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className={`flex items-center gap-2 text-sm ${
                  isValid ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isValid ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  {isValid ? 'Konfiguration gültig' : 'Konfiguration ungültig'}
                </div>
                
                {!isValid && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Erforderliche Felder:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {!config.url.trim() && <li>WebSocket URL</li>}
                      {(config.port <= 0 || config.port > 65535) && <li>Gültiger Port (1-65535)</li>}
                      {config.filesystem_bridge && !config.data_directory.trim() && <li>Datenverzeichnis</li>}
                      {config.filesystem_bridge && config.watch_interval < 100 && <li>Überwachungsintervall ≥ 100ms</li>}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}