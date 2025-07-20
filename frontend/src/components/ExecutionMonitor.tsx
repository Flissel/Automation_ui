/**
 * TRAE Visual Workflow System - Execution Monitor Component
 * 
 * Real-time workflow execution monitoring overlay
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import React, { useState, useEffect } from 'react';
import { WorkflowExecution, NodeStatus } from '../types';
import { useWorkflowExecution } from '../hooks';

interface ExecutionMonitorProps {
  executionId: string;
  onClose: () => void;
}

const ExecutionMonitor: React.FC<ExecutionMonitorProps> = ({
  executionId,
  onClose,
}) => {
  const { execution, loading, error, cancelExecution } = useWorkflowExecution(executionId);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'failed': return '#ef4444';
      case 'cancelled': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return '⏳';
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'cancelled': return '⏹️';
      default: return '⏸️';
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : Date.now();
    const duration = Math.floor((end - start) / 1000);
    
    if (duration < 60) {
      return `${duration}s`;
    } else if (duration < 3600) {
      return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    } else {
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  const getNodeStats = () => {
    if (!execution?.node_results) {
      return { total: 0, completed: 0, failed: 0, running: 0 };
    }

    const results = Object.values(execution.node_results);
    return {
      total: results.length,
      completed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success && r.error).length,
      running: results.filter(r => r.metadata?.status === 'running').length,
    };
  };

  const nodeStats = getNodeStats();
  const progress = nodeStats.total > 0 ? ((nodeStats.completed + nodeStats.failed) / nodeStats.total) * 100 : 0;

  if (loading && !execution) {
    return (
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        padding: '16px',
        minWidth: '300px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#6b7280',
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid #e5e7eb',
            borderTop: '2px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          Loading execution data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #ef4444',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        padding: '16px',
        minWidth: '300px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}>
          <span style={{ color: '#ef4444', fontWeight: '500' }}>❌ Execution Error</span>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              color: '#6b7280',
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>
          {error}
        </div>
      </div>
    );
  }

  if (!execution) {
    return null;
  }

  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      minWidth: '320px',
      maxWidth: '400px',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8fafc',
        borderRadius: '8px 8px 0 0',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ fontSize: '16px' }}>
            {getStatusIcon(execution.status)}
          </span>
          <span style={{
            fontWeight: '500',
            color: getStatusColor(execution.status),
          }}>
            {execution.status.charAt(0).toUpperCase() + execution.status.slice(1)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              border: 'none',
              background: 'none',
              fontSize: '14px',
              cursor: 'pointer',
              color: '#6b7280',
            }}
          >
            {isExpanded ? '🔽' : '▶️'}
          </button>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              color: '#6b7280',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {isExpanded && (
        <div style={{ padding: '16px' }}>
          {/* Progress Bar */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
            }}>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                Progress
              </span>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                {Math.round(progress)}%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: getStatusColor(execution.status),
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '16px',
          }}>
            <div style={{
              padding: '8px',
              backgroundColor: '#f0f9ff',
              borderRadius: '6px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#0369a1' }}>
                {nodeStats.completed}
              </div>
              <div style={{ fontSize: '12px', color: '#0369a1' }}>Completed</div>
            </div>
            <div style={{
              padding: '8px',
              backgroundColor: '#fef2f2',
              borderRadius: '6px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#dc2626' }}>
                {nodeStats.failed}
              </div>
              <div style={{ fontSize: '12px', color: '#dc2626' }}>Failed</div>
            </div>
          </div>

          {/* Execution Info */}
          <div style={{
            fontSize: '12px',
            color: '#6b7280',
            marginBottom: '12px',
          }}>
            <div style={{ marginBottom: '4px' }}>
              <strong>Started:</strong> {new Date(execution.start_time).toLocaleTimeString()}
            </div>
            <div style={{ marginBottom: '4px' }}>
              <strong>Duration:</strong> {formatDuration(execution.start_time, execution.end_time)}
            </div>
            <div>
              <strong>Execution ID:</strong> {execution.id.slice(0, 8)}...
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {execution.status === 'running' && (
              <button
                onClick={cancelExecution}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #ef4444',
                  borderRadius: '6px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ef4444';
                }}
              >
                ⏹️ Cancel
              </button>
            )}
            <button
              onClick={() => setShowDetails(!showDetails)}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                color: '#374151',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
              }}
            >
              📊 {showDetails ? 'Hide' : 'Show'} Details
            </button>
          </div>

          {/* Detailed Node Results */}
          {showDetails && execution.node_results && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#f8fafc',
              borderRadius: '6px',
              maxHeight: '200px',
              overflowY: 'auto',
            }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px',
              }}>
                Node Results
              </div>
              {Object.entries(execution.node_results).map(([nodeId, result]) => (
                <div
                  key={nodeId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    marginBottom: '4px',
                    backgroundColor: '#ffffff',
                    borderRadius: '4px',
                    fontSize: '12px',
                  }}
                >
                  <span style={{ color: '#6b7280' }}>
                    {nodeId.slice(0, 12)}...
                  </span>
                  <span style={{
                    color: result.success ? '#10b981' : '#ef4444',
                    fontWeight: '500',
                  }}>
                    {result.success ? '✅' : '❌'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Error Details */}
          {execution.error && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#fef2f2',
              borderRadius: '6px',
              border: '1px solid #fecaca',
            }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#dc2626',
                marginBottom: '6px',
              }}>
                Error Details
              </div>
              <div style={{
                fontSize: '12px',
                color: '#991b1b',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
              }}>
                {execution.error}
              </div>
            </div>
          )}
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default ExecutionMonitor;