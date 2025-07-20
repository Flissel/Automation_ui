import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Bug, 
  Activity, 
  Database, 
  Clock, 
  Filter,
  Download,
  Trash2,
  Settings
} from 'lucide-react';

// Types for Unity AI Platform integration
interface LoggingNodeData {
  id: string;
  label: string;
  logLevel: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  logFormat: 'simple' | 'structured' | 'json';
  destinations: Array<{
    type: 'console' | 'file' | 'redis' | 'supabase' | 'webhook';
    config: any;
    enabled: boolean;
  }>;
  qualityGates?: {
    enabled: boolean;
    rules: Array<{
      id: string;
      condition: string;
      threshold: number;
      action: 'warn' | 'fail' | 'block';
      message: string;
    }>;
  };
  filters?: {
    includePatterns: string[];
    excludePatterns: string[];
    minLevel: string;
  };
  retention?: {
    maxEntries: number;
    maxAge: number; // in hours
    autoCleanup: boolean;
  };
  metrics?: {
    enabled: boolean;
    aggregationWindow: number; // in minutes
    alertThresholds: {
      errorRate: number;
      responseTime: number;
    };
  };
  lastLogs?: Array<{
    timestamp: string;
    level: string;
    message: string;
    source: string;
    metadata?: any;
  }>;
  autoCapture?: boolean;
  captureContext?: boolean;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  message: string;
  source: string;
  nodeId?: string;
  metadata?: any;
  context?: {
    workflow: string;
    step: string;
    user: string;
    session: string;
  };
}

interface QualityGateResult {
  passed: boolean;
  failedRules: Array<{
    rule: string;
    actual: number;
    threshold: number;
    action: string;
  }>;
  metrics: {
    totalLogs: number;
    errorRate: number;
    avgResponseTime: number;
  };
}

const LoggingNode: React.FC<NodeProps<LoggingNodeData>> = ({ 
  data, 
  id, 
  selected 
}) => {
  // State
  const [showSettings, setShowSettings] = useState(false);
  const [localConfig, setLocalConfig] = useState({
    logLevel: data.logLevel || 'info',
    logFormat: data.logFormat || 'structured',
    destinations: data.destinations || [
      { type: 'console', config: {}, enabled: true },
      { type: 'redis', config: { key: 'unity_ai_logs' }, enabled: true }
    ],
    qualityGates: data.qualityGates || {
      enabled: false,
      rules: []
    },
    filters: data.filters || {
      includePatterns: [],
      excludePatterns: [],
      minLevel: 'debug'
    },
    retention: data.retention || {
      maxEntries: 1000,
      maxAge: 24,
      autoCleanup: true
    },
    metrics: data.metrics || {
      enabled: true,
      aggregationWindow: 5,
      alertThresholds: {
        errorRate: 0.1,
        responseTime: 5000
      }
    },
    autoCapture: data.autoCapture || true,
    captureContext: data.captureContext || true
  });
  const [logs, setLogs] = useState<LogEntry[]>(data.lastLogs || []);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [qualityGateStatus, setQualityGateStatus] = useState<QualityGateResult | null>(null);
  const [currentMetrics, setCurrentMetrics] = useState({
    totalLogs: 0,
    errorRate: 0,
    avgResponseTime: 0,
    logsPerMinute: 0
  });
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Log a message
  const logMessage = useCallback(async (
    level: LogEntry['level'], 
    message: string, 
    source: string = 'manual',
    metadata?: any
  ) => {
    const logEntry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      message,
      source,
      nodeId: id,
      metadata,
      context: localConfig.captureContext ? {
        workflow: 'current_workflow',
        step: 'current_step',
        user: 'current_user',
        session: 'current_session'
      } : undefined
    };
    
    // Add to local logs
    setLogs(prev => {
      const newLogs = [logEntry, ...prev];
      
      // Apply retention policy
      if (localConfig.retention.maxEntries > 0) {
        return newLogs.slice(0, localConfig.retention.maxEntries);
      }
      
      return newLogs;
    });
    
    // Send to configured destinations
    await sendToDestinations(logEntry);
    
    // Check quality gates
    if (localConfig.qualityGates.enabled) {
      await checkQualityGates();
    }
    
    // Update metrics
    updateMetrics();
    
    // Trigger Unity AI event
    await triggerUnityAIEvent('log_created', {
      node_id: id,
      log: logEntry
    });
    
  }, [id, localConfig]);
  
  // Send log to configured destinations
  const sendToDestinations = async (logEntry: LogEntry) => {
    for (const destination of localConfig.destinations) {
      if (!destination.enabled) continue;
      
      try {
        switch (destination.type) {
          case 'console':
            console.log(`[${logEntry.level.toUpperCase()}] ${logEntry.message}`, logEntry.metadata);
            break;
            
          case 'redis':
            await fetch('/api/logging/redis', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                key: destination.config.key || 'unity_ai_logs',
                entry: logEntry
              })
            });
            break;
            
          case 'supabase':
            await fetch('/api/logging/supabase', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                table: destination.config.table || 'logs',
                entry: logEntry
              })
            });
            break;
            
          case 'webhook':
            await fetch(destination.config.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(logEntry)
            });
            break;
            
          case 'file':
            await fetch('/api/logging/file', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                filename: destination.config.filename || 'unity_ai.log',
                entry: logEntry
              })
            });
            break;
        }
      } catch (error) {
        console.error(`Failed to send log to ${destination.type}:`, error);
      }
    }
  };
  
  // Check quality gates
  const checkQualityGates = async (): Promise<QualityGateResult> => {
    const recentLogs = logs.slice(0, 100); // Check last 100 logs
    const errorLogs = recentLogs.filter(log => log.level === 'error' || log.level === 'critical');
    const errorRate = recentLogs.length > 0 ? errorLogs.length / recentLogs.length : 0;
    
    const metrics = {
      totalLogs: recentLogs.length,
      errorRate,
      avgResponseTime: 0 // Would be calculated from actual response times
    };
    
    const failedRules: any[] = [];
    
    for (const rule of localConfig.qualityGates.rules) {
      let actualValue = 0;
      
      switch (rule.condition) {
        case 'error_rate':
          actualValue = errorRate;
          break;
        case 'total_errors':
          actualValue = errorLogs.length;
          break;
        case 'response_time':
          actualValue = metrics.avgResponseTime;
          break;
      }
      
      if (actualValue > rule.threshold) {
        failedRules.push({
          rule: rule.condition,
          actual: actualValue,
          threshold: rule.threshold,
          action: rule.action
        });
        
        // Execute rule action
        if (rule.action === 'fail' || rule.action === 'block') {
          await triggerUnityAIEvent('quality_gate_failed', {
            node_id: id,
            rule: rule,
            actual: actualValue
          });
        }
      }
    }
    
    const result: QualityGateResult = {
      passed: failedRules.length === 0,
      failedRules,
      metrics
    };
    
    setQualityGateStatus(result);
    return result;
  };
  
  // Update metrics
  const updateMetrics = () => {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentLogs = logs.filter(log => new Date(log.timestamp).getTime() > oneMinuteAgo);
    const errorLogs = logs.filter(log => log.level === 'error' || log.level === 'critical');
    
    setCurrentMetrics({
      totalLogs: logs.length,
      errorRate: logs.length > 0 ? errorLogs.length / logs.length : 0,
      avgResponseTime: 0, // Would be calculated from actual data
      logsPerMinute: recentLogs.length
    });
  };
  
  // Unity AI Event Trigger
  const triggerUnityAIEvent = async (eventType: string, payload: any) => {
    try {
      await fetch('/api/events/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: eventType,
          source: 'logging_node',
          node_id: id,
          payload: payload,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to trigger Unity AI event:', error);
    }
  };
  
  // Handle incoming log messages
  const handleIncomingLog = useCallback((logData: any) => {
    if (localConfig.autoCapture) {
      logMessage(
        logData.level || 'info',
        logData.message || 'Incoming log message',
        logData.source || 'external',
        logData.metadata
      );
    }
  }, [localConfig.autoCapture, logMessage]);
  
  // Filter logs
  const applyFilters = useCallback(() => {
    let filtered = logs;
    
    // Level filter
    if (filterLevel !== 'all') {
      filtered = filtered.filter(log => log.level === filterLevel);
    }
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.source.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Pattern filters
    if (localConfig.filters.includePatterns.length > 0) {
      filtered = filtered.filter(log => 
        localConfig.filters.includePatterns.some(pattern => 
          log.message.includes(pattern)
        )
      );
    }
    
    if (localConfig.filters.excludePatterns.length > 0) {
      filtered = filtered.filter(log => 
        !localConfig.filters.excludePatterns.some(pattern => 
          log.message.includes(pattern)
        )
      );
    }
    
    setFilteredLogs(filtered);
  }, [logs, filterLevel, searchTerm, localConfig.filters]);
  
  // Configuration handlers
  const handleConfigChange = (key: string, value: any) => {
    setLocalConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const addQualityGateRule = () => {
    const newRule = {
      id: `rule_${Date.now()}`,
      condition: 'error_rate',
      threshold: 0.1,
      action: 'warn',
      message: 'Error rate threshold exceeded'
    };
    
    setLocalConfig(prev => ({
      ...prev,
      qualityGates: {
        ...prev.qualityGates,
        rules: [...prev.qualityGates.rules, newRule]
      }
    }));
  };
  
  const removeQualityGateRule = (ruleId: string) => {
    setLocalConfig(prev => ({
      ...prev,
      qualityGates: {
        ...prev.qualityGates,
        rules: prev.qualityGates.rules.filter(rule => rule.id !== ruleId)
      }
    }));
  };
  
  const clearLogs = () => {
    setLogs([]);
    setFilteredLogs([]);
  };
  
  const exportLogs = () => {
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `unity_ai_logs_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };
  
  // Get level icon
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
      case 'critical':
        return <AlertTriangle className="w-3 h-3 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-3 h-3 text-yellow-500" />;
      case 'info':
        return <Info className="w-3 h-3 text-blue-500" />;
      case 'debug':
        return <Bug className="w-3 h-3 text-gray-500" />;
      default:
        return <FileText className="w-3 h-3" />;
    }
  };
  
  // Get level color
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'info':
        return 'text-blue-600 bg-blue-50';
      case 'debug':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };
  
  // Effects
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);
  
  useEffect(() => {
    updateMetrics();
  }, [logs]);
  
  useEffect(() => {
    // Listen for log messages from other nodes
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'log_message' && event.data.targetNode === id) {
        handleIncomingLog(event.data.log);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [id, handleIncomingLog]);
  
  return (
    <div className={`logging-node ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      {/* Input/Output Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="log-input"
        className="w-3 h-3 bg-blue-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="quality-gate-output"
        className="w-3 h-3 bg-green-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="metrics-output"
        className="w-3 h-3 bg-orange-500"
      />
      
      <Card className="w-96">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {data.label || 'Logging & Monitoring'}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                {logs.length} logs
              </Badge>
              {qualityGateStatus && (
                <Badge 
                  variant={qualityGateStatus.passed ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  QG {qualityGateStatus.passed ? 'Pass' : 'Fail'}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Metrics Dashboard */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-blue-50 rounded">
              <div className="font-medium">Total Logs</div>
              <div className="text-lg font-bold">{currentMetrics.totalLogs}</div>
            </div>
            <div className="p-2 bg-red-50 rounded">
              <div className="font-medium">Error Rate</div>
              <div className="text-lg font-bold">{(currentMetrics.errorRate * 100).toFixed(1)}%</div>
            </div>
            <div className="p-2 bg-green-50 rounded">
              <div className="font-medium">Logs/Min</div>
              <div className="text-lg font-bold">{currentMetrics.logsPerMinute}</div>
            </div>
            <div className="p-2 bg-yellow-50 rounded">
              <div className="font-medium">Avg Response</div>
              <div className="text-lg font-bold">{currentMetrics.avgResponseTime}ms</div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => logMessage('info', 'Manual log entry', 'user')}
              className="flex items-center gap-1"
            >
              <FileText className="w-3 h-3" />
              Log
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={exportLogs}
              className="flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              Export
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={clearLogs}
              className="flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </Button>
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-2">
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="text-xs w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search logs..."
              className="text-xs flex-1"
            />
          </div>
          
          {/* Log Display */}
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {filteredLogs.slice(0, 10).map((log) => (
              <div key={log.id} className={`p-2 rounded text-xs ${getLevelColor(log.level)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {getLevelIcon(log.level)}
                    <span className="font-medium">{log.level.toUpperCase()}</span>
                    <span className="text-gray-500">from {log.source}</span>
                  </div>
                  <span className="text-gray-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="mt-1 break-words">{log.message}</div>
                {log.metadata && (
                  <div className="mt-1 text-gray-500 font-mono">
                    {JSON.stringify(log.metadata, null, 2)}
                  </div>
                )}
              </div>
            ))}
            
            {filteredLogs.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                No logs match the current filters
              </div>
            )}
          </div>
          
          {/* Quality Gate Status */}
          {qualityGateStatus && localConfig.qualityGates.enabled && (
            <div className={`p-2 rounded text-xs ${
              qualityGateStatus.passed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              <div className="flex items-center gap-1 font-medium">
                {qualityGateStatus.passed ? (
                  <CheckCircle className="w-3 h-3" />
                ) : (
                  <AlertTriangle className="w-3 h-3" />
                )}
                Quality Gate {qualityGateStatus.passed ? 'Passed' : 'Failed'}
              </div>
              
              {qualityGateStatus.failedRules.length > 0 && (
                <div className="mt-1">
                  {qualityGateStatus.failedRules.map((rule, index) => (
                    <div key={index}>
                      {rule.rule}: {rule.actual} &gt; {rule.threshold} ({rule.action})
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Settings Panel */}
          {showSettings && (
            <div className="space-y-3 p-3 bg-gray-50 rounded">
              <div className="text-sm font-medium">Logging Configuration</div>
              
              {/* Log Level */}
              <div>
                <Label className="text-xs">Default Log Level</Label>
                <Select
                  value={localConfig.logLevel}
                  onValueChange={(value) => handleConfigChange('logLevel', value)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debug">Debug</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Auto Capture */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">Auto Capture</Label>
                <input
                  type="checkbox"
                  checked={localConfig.autoCapture}
                  onChange={(e) => handleConfigChange('autoCapture', e.target.checked)}
                  className="w-3 h-3"
                />
              </div>
              
              {/* Quality Gates */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-medium">Quality Gates</Label>
                  <input
                    type="checkbox"
                    checked={localConfig.qualityGates.enabled}
                    onChange={(e) => handleConfigChange('qualityGates', {
                      ...localConfig.qualityGates,
                      enabled: e.target.checked
                    })}
                    className="w-3 h-3"
                  />
                </div>
                
                {localConfig.qualityGates.enabled && (
                  <div className="space-y-2">
                    {localConfig.qualityGates.rules.map((rule) => (
                      <div key={rule.id} className="p-2 bg-white rounded border text-xs">
                        <div className="flex items-center justify-between">
                          <span>{rule.condition} &gt; {rule.threshold}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeQualityGateRule(rule.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addQualityGateRule}
                      className="w-full text-xs"
                    >
                      Add Rule
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Retention */}
              <div>
                <Label className="text-xs font-medium">Retention Policy</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div>
                    <Label className="text-xs">Max Entries</Label>
                    <Input
                      type="number"
                      value={localConfig.retention.maxEntries}
                      onChange={(e) => handleConfigChange('retention', {
                        ...localConfig.retention,
                        maxEntries: parseInt(e.target.value) || 0
                      })}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max Age (hours)</Label>
                    <Input
                      type="number"
                      value={localConfig.retention.maxAge}
                      onChange={(e) => handleConfigChange('retention', {
                        ...localConfig.retention,
                        maxAge: parseInt(e.target.value) || 0
                      })}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoggingNode;
export type { LoggingNodeData, LogEntry, QualityGateResult };