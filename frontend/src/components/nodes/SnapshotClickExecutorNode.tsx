/**
 * TRAE Snapshot Click Executor Node Component
 * 
 * Executes click actions on predefined coordinates from snapshot templates
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { 
  MousePointer, Play, Pause, RefreshCw, AlertCircle, CheckCircle, 
  Clock, Settings, Zap, Target, RotateCcw
} from 'lucide-react';

// ============================================================================
// INTERFACES
// ============================================================================

interface ClickActionResult {
  action_id: string;
  success: boolean;
  execution_time_ms: number;
  timestamp: string;
  error_message?: string;
  coordinates: { x: number; y: number };
  action_type: string;
}

interface SnapshotClickExecutorData {
  label: string;
  template_id?: string;
  template_name?: string;
  selected_actions: string[];
  execution_config: {
    auto_execute: boolean;
    execution_interval: number;
    retry_count: number;
    timeout: number;
    sequential_execution: boolean;
    delay_between_actions: number;
    dry_run_mode: boolean;
  };
  monitoring: {
    track_performance: boolean;
    log_results: boolean;
    alert_on_failure: boolean;
    screenshot_on_failure: boolean;
  };
  results: ClickActionResult[];
  execution_status: 'idle' | 'running' | 'paused' | 'error';
  last_execution?: string;
  performance_metrics: {
    total_executions: number;
    success_rate: number;
    average_execution_time: number;
    failed_actions: number;
  };
}

type SnapshotClickExecutorNodeProps = NodeProps<SnapshotClickExecutorData>;

// ============================================================================
// SNAPSHOT CLICK EXECUTOR NODE COMPONENT
// ============================================================================

export const SnapshotClickExecutorNode: React.FC<SnapshotClickExecutorNodeProps> = ({
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
  const [executionResults, setExecutionResults] = useState<ClickActionResult[]>(data.results || []);
  const [executionStatus, setExecutionStatus] = useState(data.execution_status || 'idle');
  const [lastExecution, setLastExecution] = useState(data.last_execution);
  const [performanceMetrics, setPerformanceMetrics] = useState(data.performance_metrics || {
    total_executions: 0,
    success_rate: 0,
    average_execution_time: 0,
    failed_actions: 0
  });
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState(data.template_id);
  const [executionInterval, setExecutionInterval] = useState<NodeJS.Timeout | null>(null);
  const [currentActionIndex, setCurrentActionIndex] = useState(0);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    loadAvailableTemplates();
  }, []);

  useEffect(() => {
    // TRAE DEBUG: Add null checks for execution_config to prevent undefined errors
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

  const executeClickActions = useCallback(async () => {
    if (!selectedTemplate || isExecuting) return;
    
    setIsExecuting(true);
    setExecutionStatus('running');
    setCurrentActionIndex(0);
    
    try {
      // Get template details
      const templateResponse = await fetch(`/api/snapshots/templates/${selectedTemplate}`);
      if (!templateResponse.ok) {
        throw new Error('Failed to load template');
      }
      
      const template = await templateResponse.json();
      const actionsToExecute = template.click_actions.filter((action: any) => 
        data.selected_actions.length === 0 || data.selected_actions.includes(action.id)
      );
      
      const results: ClickActionResult[] = [];
      const startTime = Date.now();
      
      if (data.execution_config?.sequential_execution) {
        // Execute actions sequentially
        for (let i = 0; i < actionsToExecute.length; i++) {
          const action = actionsToExecute[i];
          setCurrentActionIndex(i);
          
          try {
            const result = await executeClickAction(action);
            results.push(result);
            
            // Delay between actions if configured
            if (data.execution_config?.delay_between_actions > 0 && i < actionsToExecute.length - 1) {
              await new Promise(resolve => setTimeout(resolve, data.execution_config.delay_between_actions));
            }
          } catch (error) {
            const errorResult: ClickActionResult = {
              action_id: action.id,
              success: false,
              execution_time_ms: 0,
              timestamp: new Date().toISOString(),
              error_message: error instanceof Error ? error.message : 'Unknown error',
              coordinates: { x: action.x, y: action.y },
              action_type: action.action
            };
            results.push(errorResult);
            
            // Stop execution on failure if not configured to continue
            if (!data.execution_config?.retry_count) {
              break;
            }
          }
        }
      } else {
        // Execute actions in parallel
        const promises = actionsToExecute.map(async (action: any) => {
          return executeClickAction(action);
        });
        
        const actionResults = await Promise.allSettled(promises);
        actionResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              action_id: actionsToExecute[index].id,
              success: false,
              execution_time_ms: 0,
              timestamp: new Date().toISOString(),
              error_message: result.reason?.message || 'Unknown error',
              coordinates: { x: actionsToExecute[index].x, y: actionsToExecute[index].y },
              action_type: actionsToExecute[index].action
            });
          }
        });
      }
      
      // Update results and metrics
      setExecutionResults(results);
      setLastExecution(new Date().toISOString());
      
      // Update performance metrics
      const successfulResults = results.filter(r => r.success);
      const totalTime = Date.now() - startTime;
      
      setPerformanceMetrics(prev => {
        const newTotalExecutions = prev.total_executions + 1;
        const newSuccessRate = ((prev.success_rate * prev.total_executions) + 
          (successfulResults.length / results.length)) / newTotalExecutions;
        const newAvgExecutionTime = ((prev.average_execution_time * prev.total_executions) + 
          totalTime) / newTotalExecutions;
        const newFailedActions = prev.failed_actions + (results.length - successfulResults.length);
        
        return {
          total_executions: newTotalExecutions,
          success_rate: newSuccessRate,
          average_execution_time: newAvgExecutionTime,
          failed_actions: newFailedActions
        };
      });
      
      // Check for alerts
      if (data.monitoring.alert_on_failure && results.some(r => !r.success)) {
        console.warn('Click execution failed for some actions:', results.filter(r => !r.success));
      }
      
      setExecutionStatus('idle');
      
    } catch (error) {
      console.error('Click execution failed:', error);
      setExecutionStatus('error');
    } finally {
      setIsExecuting(false);
      setCurrentActionIndex(0);
    }
  }, [selectedTemplate, data.selected_actions, data.execution_config, data.monitoring, isExecuting]);

  const executeClickAction = useCallback(async (action: any): Promise<ClickActionResult> => {
    const startTime = Date.now();
    
    const response = await fetch('/api/snapshots/execute-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action_config: action,
        dry_run: data.execution_config?.dry_run_mode
      })
    });
    
    const executionTime = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`Click execution failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return {
      action_id: action.id,
      success: result.success,
      execution_time_ms: executionTime,
      timestamp: new Date().toISOString(),
      error_message: result.success ? undefined : result.message,
      coordinates: { x: action.x, y: action.y },
      action_type: action.action
    };
  }, [data.execution_config?.dry_run_mode]);

  const startAutoExecution = useCallback(() => {
    if (executionInterval) return;
    
    const interval = setInterval(() => {
      if (executionStatus === 'running' && !isExecuting) {
        executeClickActions();
      }
    }, data.execution_config?.execution_interval * 1000);
    
    setExecutionInterval(interval);
  }, [executionInterval, executionStatus, isExecuting, executeClickActions, data.execution_config?.execution_interval]);

  const stopAutoExecution = useCallback(() => {
    if (executionInterval) {
      clearInterval(executionInterval);
      setExecutionInterval(null);
    }
  }, [executionInterval]);

  const handleStartExecution = useCallback(() => {
    setExecutionStatus('running');
    if (!data.execution_config?.auto_execute) {
      executeClickActions();
    }
  }, [data.execution_config?.auto_execute, executeClickActions]);

  const handlePauseExecution = useCallback(() => {
    setExecutionStatus('paused');
  }, []);

  const handleStopExecution = useCallback(() => {
    setExecutionStatus('idle');
    stopAutoExecution();
  }, [stopAutoExecution]);

  const handleRetryFailedActions = useCallback(async () => {
    const failedActions = executionResults.filter(r => !r.success);
    if (failedActions.length === 0) return;
    
    // Get template and retry failed actions
    try {
      const templateResponse = await fetch(`/api/snapshots/templates/${selectedTemplate}`);
      if (!templateResponse.ok) return;
      
      const template = await templateResponse.json();
      const actionsToRetry = template.click_actions.filter((action: any) => 
        failedActions.some(failed => failed.action_id === action.id)
      );
      
      setIsExecuting(true);
      const retryResults: ClickActionResult[] = [];
      
      for (const action of actionsToRetry) {
        try {
          const result = await executeClickAction(action);
          retryResults.push(result);
        } catch (error) {
          retryResults.push({
            action_id: action.id,
            success: false,
            execution_time_ms: 0,
            timestamp: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : 'Unknown error',
            coordinates: { x: action.x, y: action.y },
            action_type: action.action
          });
        }
      }
      
      // Update results by replacing failed ones with retry results
      setExecutionResults(prev => {
        const updated = [...prev];
        retryResults.forEach(retryResult => {
          const index = updated.findIndex(r => r.action_id === retryResult.action_id);
          if (index !== -1) {
            updated[index] = retryResult;
          }
        });
        return updated;
      });
      
    } catch (error) {
      console.error('Failed to retry actions:', error);
    } finally {
      setIsExecuting(false);
    }
  }, [executionResults, selectedTemplate, executeClickAction]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderStatusIndicator = () => {
    const statusConfig = {
      idle: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100' },
      running: { icon: Play, color: 'text-blue-600', bg: 'bg-blue-100' },
      paused: { icon: Pause, color: 'text-yellow-600', bg: 'bg-yellow-100' },
      error: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' }
    };
    
    const config = statusConfig[executionStatus];
    const Icon = config.icon;
    
    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${config.bg} ${config.color}`}>
        <Icon size={12} />
        <span className="capitalize">{executionStatus}</span>
        {isExecuting && (
          <>
            <RefreshCw size={10} className="animate-spin ml-1" />
            {data.execution_config?.sequential_execution && (
              <span className="ml-1">({currentActionIndex + 1})</span>
            )}
          </>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div className="flex items-center gap-2 p-2 bg-gray-50 border-b">
      <button
        onClick={handleStartExecution}
        disabled={isExecuting || !selectedTemplate}
        className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
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
      
      <button
        onClick={handleRetryFailedActions}
        disabled={isExecuting || !executionResults.some(r => !r.success)}
        className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
      >
        <RotateCcw size={12} />
        Retry
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
      
      <div className="flex items-center gap-1">
        <input
          type="checkbox"
          id={`dry-run-${id}`}
          checked={data.execution_config?.dry_run_mode}
          onChange={(e) => {
            // Update node data
            console.log('Dry run mode:', e.target.checked);
          }}
          className="text-xs"
        />
        <label htmlFor={`dry-run-${id}`} className="text-xs text-gray-600">Dry Run</label>
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
            key={`${result.action_id}-${index}`}
            className={`p-2 text-xs rounded border ${
              result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">{result.action_id}</span>
              <div className="flex items-center gap-1">
                {result.success ? (
                  <CheckCircle size={10} className="text-green-600" />
                ) : (
                  <AlertCircle size={10} className="text-red-600" />
                )}
                <span className={`text-xs ${
                  result.success ? 'text-green-600' : 'text-red-600'
                }`}>
                  {result.success ? 'Success' : 'Failed'}
                </span>
              </div>
            </div>
            
            <div className="text-gray-700 mb-1">
              <span className="font-medium">{result.action_type}</span> at 
              <span className="font-mono">({result.coordinates.x}, {result.coordinates.y})</span>
            </div>
            
            {result.error_message && (
              <div className="text-red-600 text-xs mb-1">
                Error: {result.error_message}
              </div>
            )}
            
            <div className="text-gray-500 text-xs">
              {result.execution_time_ms}ms • {new Date(result.timestamp).toLocaleTimeString()}
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
          <span className="ml-1 font-medium">{Math.round(performanceMetrics.average_execution_time)}ms</span>
        </div>
        <div>
          <span className="text-gray-600">Failed:</span>
          <span className="ml-1 font-medium">{performanceMetrics.failed_actions}</span>
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
    border: `2px solid ${selected ? '#3b82f6' : '#f59e0b'}`,
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
        style={{ top: '20px', backgroundColor: '#f59e0b' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="success_output"
        style={{ top: '40px', backgroundColor: '#10b981' }}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <MousePointer className="text-yellow-600" size={16} />
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
          <div className="text-xs text-gray-600 mb-1">Click Executor</div>
          <div className="text-xs text-gray-500">
            {data.template_name || 'No template selected'}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {executionResults.length} actions executed
          </div>
          {data.execution_config?.dry_run_mode && (
            <div className="text-xs text-orange-500 mt-1">Dry Run Mode</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SnapshotClickExecutorNode;