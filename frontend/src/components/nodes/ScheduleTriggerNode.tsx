/**
 * TRAE Visual Workflow System - Schedule Trigger Node Component
 * 
 * Time-based scheduling trigger node
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { NodeData, NodeStatus } from '../../types';
import { nodeApi } from "../../services/api";

interface ScheduleTriggerNodeProps {
  data: NodeData;
  selected?: boolean;
}

const ScheduleTriggerNode: React.FC<ScheduleTriggerNodeProps> = ({ data, selected }) => {
  const [isScheduled, setIsScheduled] = useState(false);
  const [nextExecution, setNextExecution] = useState<string | null>(null);
  const [executionCount, setExecutionCount] = useState(0);
  const [lastExecution, setLastExecution] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  const handleStartSchedule = useCallback(async () => {
    if (isScheduled) return;

    setIsScheduled(true);
    setExecutionCount(0);
    
    try {
      const result = await nodeApi.executeNode({
        workflow_id: 'current',
        execution_id: `exec_${Date.now()}`,
        node_id: data.id,
        inputs: {},
        config: { ...data.config, action: 'start_schedule' }
      });

      if (result.success && result.outputs?.next_execution) {
        setNextExecution(result.outputs.next_execution);
      } else {
        setIsScheduled(false);
      }
    } catch (error) {
      console.error('Schedule start failed:', error);
      setIsScheduled(false);
    }
  }, [data.id, data.config, isScheduled]);

  const handleStopSchedule = useCallback(async () => {
    if (!isScheduled) return;

    try {
      await nodeApi.executeNode({
        workflow_id: 'current',
        execution_id: `exec_${Date.now()}`,
        node_id: data.id,
        inputs: {},
        config: { ...data.config, action: 'stop_schedule' }
      });
    } catch (error) {
      console.error('Schedule stop failed:', error);
    } finally {
      setIsScheduled(false);
      setNextExecution(null);
      setTimeRemaining('');
    }
  }, [data.id, data.config, isScheduled]);

  // Calculate next execution time and countdown
  useEffect(() => {
    if (!isScheduled || !data.config?.enabled) return;

    const scheduleType = data.config?.schedule_type || 'interval';
    const intervalSeconds = data.config?.interval_seconds || 60;

    if (scheduleType === 'interval') {
      const interval = setInterval(() => {
        const now = new Date();
        const next = new Date(now.getTime() + intervalSeconds * 1000);
        setNextExecution(next.toLocaleTimeString());
        
        // Simulate execution
        if (Math.random() > 0.9) {
          setLastExecution(now.toLocaleTimeString());
          setExecutionCount(prev => prev + 1);
        }
        
        // Calculate time remaining
        const remaining = Math.max(0, intervalSeconds - (now.getSeconds() % intervalSeconds));
        setTimeRemaining(`${remaining}s`);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isScheduled, data.config]);

  const getStatusColor = () => {
    switch (data.status) {
      case NodeStatus.RUNNING: return '#f59e0b';
      case NodeStatus.SUCCESS: return '#10b981';
      case NodeStatus.ERROR: return '#ef4444';
      default: return '#6b7280';
    }
  };

  const scheduleType = data.config?.schedule_type || 'interval';
  const intervalSeconds = data.config?.interval_seconds || 60;
  const cronExpression = data.config?.cron_expression || '0 * * * *';
  const timezone = data.config?.timezone || 'UTC';
  const enabled = data.config?.enabled !== false;

  const formatInterval = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div
      style={{
        background: '#ffffff',
        border: `2px solid ${selected ? '#3b82f6' : '#e5e7eb'}`,
        borderRadius: '8px',
        padding: '16px',
        minWidth: '280px',
        boxShadow: selected ? '0 4px 12px rgba(59, 130, 246, 0.15)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '12px',
        gap: '8px'
      }}>
        <span style={{ fontSize: '20px' }}>{typeof data.icon === 'string' ? data.icon : '⏰'}</span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '2px'
          }}>
            {data.label}
          </div>
          <div style={{
            fontSize: '12px',
            color: '#6b7280'
          }}>
            {data.description}
          </div>
        </div>
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isScheduled ? '#10b981' : getStatusColor(),
          }}
        />
      </div>

      {/* Schedule Configuration */}
      <div style={{
        backgroundColor: '#f8fafc',
        padding: '10px',
        borderRadius: '6px',
        marginBottom: '12px',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px'
        }}>
          <span style={{
            backgroundColor: scheduleType === 'interval' ? '#3b82f6' : '#8b5cf6',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '600'
          }}>
            {scheduleType.toUpperCase()}
          </span>
          <div style={{
            fontSize: '12px',
            color: '#1f2937',
            fontFamily: 'monospace'
          }}>
            {scheduleType === 'interval' ? formatInterval(intervalSeconds) : cronExpression}
          </div>
        </div>
        <div style={{
          display: 'flex',
          gap: '8px',
          fontSize: '10px'
        }}>
          <span style={{
            backgroundColor: enabled ? '#dcfce7' : '#fef2f2',
            color: enabled ? '#166534' : '#dc2626',
            padding: '2px 6px',
            borderRadius: '3px'
          }}>
            {enabled ? '✅ Enabled' : '❌ Disabled'}
          </span>
          <span style={{
            backgroundColor: '#f1f5f9',
            color: '#64748b',
            padding: '2px 6px',
            borderRadius: '3px'
          }}>
            {timezone}
          </span>
        </div>
      </div>

      {/* Status Display */}
      {isScheduled && (
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          padding: '8px',
          borderRadius: '4px',
          marginBottom: '12px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px'
          }}>
            <span style={{
              fontSize: '11px',
              color: '#166534',
              fontWeight: '500'
            }}>
              🟢 Schedule Active
            </span>
            <span style={{
              fontSize: '10px',
              color: '#166534'
            }}>
              {executionCount} runs
            </span>
          </div>
          {nextExecution && (
            <div style={{
              fontSize: '10px',
              color: '#166534',
              marginBottom: '2px'
            }}>
              Next: {nextExecution}
            </div>
          )}
          {timeRemaining && (
            <div style={{
              fontSize: '10px',
              color: '#166534'
            }}>
              In: {timeRemaining}
            </div>
          )}
        </div>
      )}

      {/* Execution History */}
      {lastExecution && (
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '8px',
          borderRadius: '4px',
          marginBottom: '12px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            fontSize: '11px',
            color: '#6b7280',
            marginBottom: '4px'
          }}>
            Last Execution:
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{
              fontSize: '10px',
              color: '#1f2937',
              fontFamily: 'monospace'
            }}>
              {lastExecution}
            </span>
            <span style={{
              backgroundColor: '#10b981',
              color: 'white',
              padding: '1px 4px',
              borderRadius: '2px',
              fontSize: '9px',
              fontWeight: '500'
            }}>
              SUCCESS
            </span>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '8px'
      }}>
        <button
          onClick={handleStartSchedule}
          disabled={isScheduled || !enabled}
          style={{
            flex: 1,
            padding: '6px 10px',
            backgroundColor: (isScheduled || !enabled) ? '#d1d5db' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '500',
            cursor: (isScheduled || !enabled) ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          ▶️ Start
        </button>
        <button
          onClick={handleStopSchedule}
          disabled={!isScheduled}
          style={{
            flex: 1,
            padding: '6px 10px',
            backgroundColor: !isScheduled ? '#d1d5db' : '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '500',
            cursor: !isScheduled ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          ⏹️ Stop
        </button>
      </div>

      {/* Manual Trigger */}
      <button
        onClick={() => {
          setLastExecution(new Date().toLocaleTimeString());
          setExecutionCount(prev => prev + 1);
        }}
        style={{
          width: '100%',
          padding: '6px 10px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
          marginBottom: '8px'
        }}
      >
        🚀 Trigger Now
      </button>

      {/* Output Handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="schedule_output"
        style={{
          background: '#10b981',
          border: '2px solid #ffffff',
          width: '12px',
          height: '12px',
          top: '40%'
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="timestamp"
        style={{
          background: '#3b82f6',
          border: '2px solid #ffffff',
          width: '12px',
          height: '12px',
          top: '60%'
        }}
      />
    </div>
  );
};

export default ScheduleTriggerNode;