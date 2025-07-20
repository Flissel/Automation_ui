/**
 * TRAE Snapshot OCR Executor Node Component
 * 
 * Executes OCR operations on predefined zones from snapshot templates
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { 
  Eye, Play, Pause, RefreshCw, AlertCircle, CheckCircle, 
  Clock, Target, Settings, FileText, Zap
} from 'lucide-react';

// ============================================================================
// INTERFACES
// ============================================================================

interface OCRZoneResult {
  zone_id: string;
  text: string;
  confidence: number;
  processing_time_ms: number;
  timestamp: string;
  status: 'success' | 'error' | 'low_confidence';
  error_message?: string;
}

interface SnapshotOCRExecutorData {
  label: string;
  template_id?: string;
  template_name?: string;
  selected_zones: string[];
  execution_config: {
    auto_execute: boolean;
    execution_interval: number;
    retry_count: number;
    timeout: number;
    confidence_threshold: number;
    parallel_processing: boolean;
  };
  monitoring: {
    track_performance: boolean;
    log_results: boolean;
    alert_on_failure: boolean;
    alert_on_low_confidence: boolean;
  };
  results: OCRZoneResult[];
  execution_status: 'idle' | 'running' | 'paused' | 'error';
  last_execution?: string;
  performance_metrics: {
    total_executions: number;
    success_rate: number;
    average_processing_time: number;
    average_confidence: number;
  };
}

type SnapshotOCRExecutorNodeProps = NodeProps<SnapshotOCRExecutorData>;

// ============================================================================
// SNAPSHOT OCR EXECUTOR NODE COMPONENT
// ============================================================================

export const SnapshotOCRExecutorNode: React.FC<SnapshotOCRExecutorNodeProps> = ({
  id,
  data,
  selected
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<OCRZoneResult[]>(data.results || []);
  const [executionStatus, setExecutionStatus] = useState(data.execution_status || 'idle');
  const [lastExecution, setLastExecution] = useState(data.last_execution);
  const [performanceMetrics, setPerformanceMetrics] = useState(data.performance_metrics || {
    total_executions: 0,
    success_rate: 0,
    average_processing_time: 0,
    average_confidence: 0
  });
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState(data.template_id);
  const [executionInterval, setExecutionInterval] = useState<NodeJS.Timeout | null>(null);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    loadAvailableTemplates();
  }, []);

  useEffect(() => {
    if (data.execution_config?.auto_execute && executionStatus === 'running') {
      startAutoExecution();
    } else {
      stopAutoExecution();
    }
    
    return () => stopAutoExecution();
  }, [data.execution_config?.auto_execute, executionStatus]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const loadAvailableTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/snapshots/templates');
      if (response.ok) {
        const result = await response.json();
        setAvailableTemplates(result.templates || []);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }, []);

  const executeOCRZones = useCallback(async () => {
    if (!selectedTemplate || isExecuting) return;
    
    setIsExecuting(true);
    setExecutionStatus('running');
    
    try {
      // Get template details
      const templateResponse = await fetch(`/api/snapshots/templates/${selectedTemplate}`);
      if (!templateResponse.ok) {
        throw new Error('Failed to load template');
      }
      
      const template = await templateResponse.json();
      const zonesToProcess = template.ocr_zones.filter((zone: any) => 
        data.selected_zones.length === 0 || data.selected_zones.includes(zone.id)
      );
      
      const results: OCRZoneResult[] = [];
      const startTime = Date.now();
      
      // Process zones (parallel or sequential)
      if (data.execution_config?.parallel_processing) {
        const promises = zonesToProcess.map(async (zone: any) => {
          return processOCRZone(template.snapshot_metadata.id, zone);
        });
        
        const zoneResults = await Promise.allSettled(promises);
        zoneResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              zone_id: zonesToProcess[index].id,
              text: '',
              confidence: 0,
              processing_time_ms: 0,
              timestamp: new Date().toISOString(),
              status: 'error',
              error_message: result.reason?.message || 'Unknown error'
            });
          }
        });
      } else {
        for (const zone of zonesToProcess) {
          try {
            const result = await processOCRZone(template.snapshot_metadata.id, zone);
            results.push(result);
          } catch (error) {
            results.push({
              zone_id: zone.id,
              text: '',
              confidence: 0,
              processing_time_ms: 0,
              timestamp: new Date().toISOString(),
              status: 'error',
              error_message: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }
      
      // Update results and metrics
      setExecutionResults(results);
      setLastExecution(new Date().toISOString());
      
      // Update performance metrics
      const successfulResults = results.filter(r => r.status === 'success');
      const totalTime = Date.now() - startTime;
      
      setPerformanceMetrics(prev => {
        const newTotalExecutions = prev.total_executions + 1;
        const newSuccessRate = ((prev.success_rate * prev.total_executions) + 
          (successfulResults.length / results.length)) / newTotalExecutions;
        const newAvgProcessingTime = ((prev.average_processing_time * prev.total_executions) + 
          totalTime) / newTotalExecutions;
        const newAvgConfidence = successfulResults.length > 0 ? 
          successfulResults.reduce((sum, r) => sum + r.confidence, 0) / successfulResults.length : 0;
        
        return {
          total_executions: newTotalExecutions,
          success_rate: newSuccessRate,
          average_processing_time: newAvgProcessingTime,
          average_confidence: newAvgConfidence
        };
      });
      
      // Check for alerts
      if (data.monitoring.alert_on_failure && results.some(r => r.status === 'error')) {
        console.warn('OCR execution failed for some zones:', results.filter(r => r.status === 'error'));
      }
      
      if (data.monitoring.alert_on_low_confidence) {
        const lowConfidenceResults = results.filter(r => 
          r.status === 'success' && r.confidence < data.execution_config?.confidence_threshold
        );
        if (lowConfidenceResults.length > 0) {
          console.warn('Low confidence OCR results:', lowConfidenceResults);
        }
      }
      
      setExecutionStatus('idle');
      
    } catch (error) {
      console.error('OCR execution failed:', error);
      setExecutionStatus('error');
    } finally {
      setIsExecuting(false);
    }
  }, [selectedTemplate, data.selected_zones, data.execution_config, data.monitoring, isExecuting]);

  const processOCRZone = useCallback(async (snapshotId: string, zone: any): Promise<OCRZoneResult> => {
    const response = await fetch('/api/snapshots/process-ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        snapshot_id: snapshotId,
        zone_config: zone,
        return_image: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`OCR processing failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return {
      zone_id: result.zone_id,
      text: result.text,
      confidence: result.confidence,
      processing_time_ms: result.processing_time_ms,
      timestamp: new Date().toISOString(),
      status: result.confidence >= data.execution_config?.confidence_threshold ? 'success' : 'low_confidence'
    };
  }, [data.execution_config?.confidence_threshold]);

  const startAutoExecution = useCallback(() => {
    if (executionInterval) return;
    
    const interval = setInterval(() => {
      if (executionStatus === 'running' && !isExecuting) {
        executeOCRZones();
      }
    }, data.execution_config?.execution_interval * 1000);
    
    setExecutionInterval(interval);
  }, [executionInterval, executionStatus, isExecuting, executeOCRZones, data.execution_config?.execution_interval]);

  const stopAutoExecution = useCallback(() => {
    if (executionInterval) {
      clearInterval(executionInterval);
      setExecutionInterval(null);
    }
  }, [executionInterval]);

  const handleStartExecution = useCallback(() => {
    setExecutionStatus('running');
    if (!data.execution_config?.auto_execute) {
      executeOCRZones();
    }
  }, [data.execution_config?.auto_execute, executeOCRZones]);

  const handlePauseExecution = useCallback(() => {
    setExecutionStatus('paused');
  }, []);

  const handleStopExecution = useCallback(() => {
    setExecutionStatus('idle');
    stopAutoExecution();
  }, [stopAutoExecution]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderStatusIndicator = () => {
    const statusConfig = {
      idle: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100' },
      running: { icon: Play, color: 'text-green-600', bg: 'bg-green-100' },
      paused: { icon: Pause, color: 'text-yellow-600', bg: 'bg-yellow-100' },
      error: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' }
    };
    
    const config = statusConfig[executionStatus];
    const Icon = config.icon;
    
    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${config.bg} ${config.color}`}>
        <Icon size={12} />
        <span className="capitalize">{executionStatus}</span>
        {isExecuting && <RefreshCw size={10} className="animate-spin ml-1" />}
      </div>
    );
  };

  const renderControls = () => (
    <div className="flex items-center gap-2 p-2 bg-gray-50 border-b">
      <button
        onClick={handleStartExecution}
        disabled={isExecuting || !selectedTemplate}
        className="flex items-center gap-1 px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
      >
        <Play size={12} />
        Start
      </button>
      
      <button
        onClick={handlePauseExecution}
        disabled={executionStatus !== 'running'}
        className="flex items-center gap-1 px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
      >
        <Pause size={12} />
        Pause
      </button>
      
      <button
        onClick={handleStopExecution}
        disabled={executionStatus === 'idle'}
        className="flex items-center gap-1 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
      >
        <AlertCircle size={12} />
        Stop
      </button>
      
      <div className="border-l pl-2">
        <select
          value={selectedTemplate || ''}
          onChange={(e) => setSelectedTemplate(e.target.value)}
          className="text-xs border rounded px-2 py-1"
        >
          <option value="">Select Template</option>
          {availableTemplates.map(template => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </div>
      
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-gray-100 rounded"
      >
        <Settings size={12} />
      </button>
    </div>
  );

  const renderResults = () => (
    <div className="p-2 border-t">
      <div className="text-xs font-semibold mb-2">Results ({executionResults.length})</div>
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {executionResults.map((result, index) => (
          <div
            key={`${result.zone_id}-${index}`}
            className={`p-2 text-xs rounded border ${
              result.status === 'success' ? 'bg-green-50 border-green-200' :
              result.status === 'low_confidence' ? 'bg-yellow-50 border-yellow-200' :
              'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">{result.zone_id}</span>
              <div className="flex items-center gap-1">
                {result.status === 'success' && <CheckCircle size={10} className="text-green-600" />}
                {result.status === 'low_confidence' && <AlertCircle size={10} className="text-yellow-600" />}
                {result.status === 'error' && <AlertCircle size={10} className="text-red-600" />}
                <span className={`text-xs ${
                  result.status === 'success' ? 'text-green-600' :
                  result.status === 'low_confidence' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {Math.round(result.confidence * 100)}%
                </span>
              </div>
            </div>
            
            {result.text && (
              <div className="text-gray-700 mb-1 font-mono text-xs bg-white p-1 rounded border">
                "{result.text}"
              </div>
            )}
            
            {result.error_message && (
              <div className="text-red-600 text-xs">
                Error: {result.error_message}
              </div>
            )}
            
            <div className="text-gray-500 text-xs">
              {result.processing_time_ms}ms • {new Date(result.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMetrics = () => (
    <div className="p-2 border-t bg-gray-50">
      <div className="text-xs font-semibold mb-2">Performance Metrics</div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-600">Executions:</span>
          <span className="ml-1 font-medium">{performanceMetrics.total_executions}</span>
        </div>
        <div>
          <span className="text-gray-600">Success Rate:</span>
          <span className="ml-1 font-medium">{Math.round(performanceMetrics.success_rate * 100)}%</span>
        </div>
        <div>
          <span className="text-gray-600">Avg Time:</span>
          <span className="ml-1 font-medium">{Math.round(performanceMetrics.average_processing_time)}ms</span>
        </div>
        <div>
          <span className="text-gray-600">Avg Confidence:</span>
          <span className="ml-1 font-medium">{Math.round(performanceMetrics.average_confidence * 100)}%</span>
        </div>
      </div>
      
      {lastExecution && (
        <div className="text-xs text-gray-500 mt-2">
          Last: {new Date(lastExecution).toLocaleString()}
        </div>
      )}
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  const nodeStyle: React.CSSProperties = {
    background: '#ffffff',
    border: `2px solid ${selected ? '#3b82f6' : '#10b981'}`,
    borderRadius: '8px',
    minWidth: isExpanded ? '400px' : '200px',
    maxWidth: isExpanded ? '500px' : '200px',
    boxShadow: selected 
      ? '0 4px 12px rgba(59, 130, 246, 0.3)'
      : '0 2px 8px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease',
  };

  return (
    <div style={nodeStyle}>
      {/* Input/Output Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="template_input"
        style={{ top: '20px', backgroundColor: '#8b5cf6' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="trigger_input"
        style={{ top: '40px', backgroundColor: '#3b82f6' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="results_output"
        style={{ top: '20px', backgroundColor: '#10b981' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="text_output"
        style={{ top: '40px', backgroundColor: '#6366f1' }}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Target className="text-green-600" size={16} />
          <span className="font-semibold text-sm">{data.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {renderStatusIndicator()}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="w-full">
          {renderControls()}
          {renderResults()}
          {renderMetrics()}
        </div>
      )}
      
      {/* Compact View */}
      {!isExpanded && (
        <div className="p-3">
          <div className="text-xs text-gray-600 mb-1">OCR Executor</div>
          <div className="text-xs text-gray-500">
            {data.template_name || 'No template selected'}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {executionResults.length} results
          </div>
        </div>
      )}
    </div>
  );
};

export default SnapshotOCRExecutorNode;