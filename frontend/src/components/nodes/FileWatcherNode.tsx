/**
 * TRAE Visual Workflow System - File Watcher Trigger Node Component
 * 
 * File system monitoring trigger node
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { NodeData, NodeStatus } from '../../types';
import { nodeApi } from '../../services/api';

interface FileWatcherNodeProps {
  data: NodeData;
  selected?: boolean;
}

const FileWatcherNode: React.FC<FileWatcherNodeProps> = ({ data, selected }) => {
  const [isWatching, setIsWatching] = useState(false);
  const [lastEvent, setLastEvent] = useState<any>(null);
  const [eventCount, setEventCount] = useState(0);
  const [watchStartTime, setWatchStartTime] = useState<string | null>(null);

  const handleStartWatching = useCallback(async () => {
    if (isWatching) return;

    setIsWatching(true);
    setWatchStartTime(new Date().toLocaleTimeString());
    setEventCount(0);
    
    try {
      const result = await nodeApi.executeNode({
        workflow_id: 'current',
        execution_id: `exec_${Date.now()}`,
        node_id: data.id,
        inputs: {},
        config: { ...data.config, action: 'start_watching' }
      });

      if (!result.success) {
        setIsWatching(false);
        setWatchStartTime(null);
      }
    } catch (error) {
      console.error('File watcher start failed:', error);
      setIsWatching(false);
      setWatchStartTime(null);
    }
  }, [data.id, data.config, isWatching]);

  const handleStopWatching = useCallback(async () => {
    if (!isWatching) return;

    try {
      await nodeApi.executeNode({
        workflow_id: 'current',
        execution_id: `exec_${Date.now()}`,
        node_id: data.id,
        inputs: {},
        config: { ...data.config, action: 'stop_watching' }
      });
    } catch (error) {
      console.error('File watcher stop failed:', error);
    } finally {
      setIsWatching(false);
      setWatchStartTime(null);
    }
  }, [data.id, data.config, isWatching]);

  // Simulate file events for demo purposes
  useEffect(() => {
    if (!isWatching) return;

    const interval = setInterval(() => {
      // Simulate random file events
      if (Math.random() > 0.95) {
        const events = ['created', 'modified', 'deleted'];
        const event = {
          type: events[Math.floor(Math.random() * events.length)],
          path: `/example/file_${Date.now()}.txt`,
          timestamp: new Date().toISOString()
        };
        setLastEvent(event);
        setEventCount(prev => prev + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isWatching]);

  const getStatusColor = () => {
    switch (data.status) {
      case NodeStatus.RUNNING: return '#f59e0b';
      case NodeStatus.SUCCESS: return '#10b981';
      case NodeStatus.ERROR: return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'created': return '#10b981';
      case 'modified': return '#f59e0b';
      case 'deleted': return '#ef4444';
      case 'moved': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const watchPath = data.config?.watch_path || '';
  const recursive = data.config?.recursive || true;
  const events = data.config?.events || ['created', 'modified', 'deleted'];
  const debounceMs = data.config?.debounce_ms || 100;

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
        <span style={{ fontSize: '20px' }}>{typeof data.icon === 'string' ? data.icon : '📁'}</span>
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
            backgroundColor: isWatching ? '#10b981' : getStatusColor(),
          }}
        />
      </div>

      {/* Watch Configuration */}
      <div style={{
        backgroundColor: '#f8fafc',
        padding: '10px',
        borderRadius: '6px',
        marginBottom: '12px',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{
          fontSize: '12px',
          color: '#6b7280',
          marginBottom: '4px'
        }}>
          Watch Path:
        </div>
        <div style={{
          fontSize: '11px',
          color: '#1f2937',
          fontFamily: 'monospace',
          wordBreak: 'break-all',
          marginBottom: '8px'
        }}>
          {watchPath || '(No path configured)'}
        </div>
        <div style={{
          display: 'flex',
          gap: '8px',
          fontSize: '10px'
        }}>
          <span style={{
            backgroundColor: recursive ? '#dcfce7' : '#f3f4f6',
            color: recursive ? '#166534' : '#6b7280',
            padding: '2px 6px',
            borderRadius: '3px'
          }}>
            {recursive ? '📁 Recursive' : '📄 Single'}
          </span>
          <span style={{
            backgroundColor: '#f1f5f9',
            color: '#64748b',
            padding: '2px 6px',
            borderRadius: '3px'
          }}>
            {debounceMs}ms debounce
          </span>
        </div>
      </div>

      {/* Watched Events */}
      <div style={{
        marginBottom: '12px'
      }}>
        <div style={{
          fontSize: '11px',
          color: '#6b7280',
          marginBottom: '6px'
        }}>
          Watching for:
        </div>
        <div style={{
          display: 'flex',
          gap: '4px',
          flexWrap: 'wrap'
        }}>
          {events.map((event: string) => (
            <span
              key={event}
              style={{
                backgroundColor: getEventTypeColor(event),
                color: 'white',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '10px',
                fontWeight: '500'
              }}
            >
              {event}
            </span>
          ))}
        </div>
      </div>

      {/* Status Display */}
      {isWatching && (
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
              🟢 Watching Active
            </span>
            <span style={{
              fontSize: '10px',
              color: '#166534'
            }}>
              {eventCount} events
            </span>
          </div>
          {watchStartTime && (
            <div style={{
              fontSize: '10px',
              color: '#166534'
            }}>
              Started: {watchStartTime}
            </div>
          )}
        </div>
      )}

      {/* Last Event */}
      {lastEvent && (
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
            Last Event:
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '2px'
          }}>
            <span style={{
              backgroundColor: getEventTypeColor(lastEvent.type),
              color: 'white',
              padding: '1px 4px',
              borderRadius: '2px',
              fontSize: '9px',
              fontWeight: '500'
            }}>
              {lastEvent.type}
            </span>
            <span style={{
              fontSize: '10px',
              color: '#1f2937',
              fontFamily: 'monospace'
            }}>
              {lastEvent.path}
            </span>
          </div>
          <div style={{
            fontSize: '9px',
            color: '#6b7280'
          }}>
            {new Date(lastEvent.timestamp).toLocaleTimeString()}
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
          onClick={handleStartWatching}
          disabled={isWatching || !watchPath}
          style={{
            flex: 1,
            padding: '6px 10px',
            backgroundColor: (isWatching || !watchPath) ? '#d1d5db' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '500',
            cursor: (isWatching || !watchPath) ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          ▶️ Start
        </button>
        <button
          onClick={handleStopWatching}
          disabled={!isWatching}
          style={{
            flex: 1,
            padding: '6px 10px',
            backgroundColor: !isWatching ? '#d1d5db' : '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '500',
            cursor: !isWatching ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          ⏹️ Stop
        </button>
      </div>

      {/* Output Handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="file_event"
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
        id="file_path"
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

export default FileWatcherNode;