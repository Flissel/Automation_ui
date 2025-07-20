/**
 * TRAE Visual Workflow System - HTTP Request Action Node Component
 * 
 * HTTP API request automation node
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import React, { useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { NodeData, NodeStatus } from '../../types';
import { nodeApi } from '../../services/api';

interface HttpRequestActionNodeProps {
  data: NodeData;
  selected?: boolean;
}

const HttpRequestActionNode: React.FC<HttpRequestActionNodeProps> = ({ data, selected }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastExecution, setLastExecution] = useState<string | null>(null);
  const [responseData, setResponseData] = useState<any>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);

  const handleExecute = useCallback(async () => {
    if (isExecuting) return;

    setIsExecuting(true);
    try {
      const result = await nodeApi.executeNode({
        workflow_id: 'current',
        execution_id: `exec_${Date.now()}`,
        node_id: data.id,
        inputs: {},
        config: data.config
      });

      if (result.success) {
        setLastExecution(new Date().toLocaleTimeString());
        if (result.outputs?.response_data) {
          setResponseData(result.outputs.response_data);
        }
        if (result.outputs?.status_code) {
          setStatusCode(result.outputs.status_code);
        }
      }
    } catch (error) {
      console.error('HTTP request execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  }, [data.id, data.config, isExecuting]);

  const getStatusColor = () => {
    switch (data.status) {
      case NodeStatus.RUNNING: return '#f59e0b';
      case NodeStatus.SUCCESS: return '#10b981';
      case NodeStatus.ERROR: return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusCodeColor = (code: number) => {
    if (code >= 200 && code < 300) return '#10b981';
    if (code >= 300 && code < 400) return '#f59e0b';
    if (code >= 400) return '#ef4444';
    return '#6b7280';
  };

  const url = data.config?.url || '';
  const method = data.config?.method || 'GET';
  const timeout = data.config?.timeout || 30000;

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return '#10b981';
      case 'POST': return '#3b82f6';
      case 'PUT': return '#f59e0b';
      case 'DELETE': return '#ef4444';
      case 'PATCH': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  return (
    <div
      style={{
        background: '#ffffff',
        border: `2px solid ${selected ? '#3b82f6' : '#e5e7eb'}`,
        borderRadius: '8px',
        padding: '16px',
        minWidth: '300px',
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
        <span style={{ fontSize: '20px' }}>{typeof data.icon === 'string' ? data.icon : '🌐'}</span>
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
            backgroundColor: getStatusColor(),
          }}
        />
      </div>

      {/* Request Configuration */}
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
            backgroundColor: getMethodColor(method),
            color: 'white',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '600',
            minWidth: '50px',
            textAlign: 'center'
          }}>
            {method}
          </span>
          <div style={{
            fontSize: '12px',
            color: '#1f2937',
            fontFamily: 'monospace',
            flex: 1,
            wordBreak: 'break-all'
          }}>
            {url || '(No URL configured)'}
          </div>
        </div>
        <div style={{
          fontSize: '11px',
          color: '#6b7280'
        }}>
          Timeout: {timeout}ms
        </div>
      </div>

      {/* Response Status */}
      {statusCode && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
          padding: '8px',
          backgroundColor: '#f1f5f9',
          borderRadius: '4px'
        }}>
          <span style={{
            backgroundColor: getStatusCodeColor(statusCode),
            color: 'white',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '11px',
            fontWeight: '600'
          }}>
            {statusCode}
          </span>
          <span style={{
            fontSize: '12px',
            color: '#64748b'
          }}>
            {statusCode >= 200 && statusCode < 300 ? 'Success' :
             statusCode >= 300 && statusCode < 400 ? 'Redirect' :
             statusCode >= 400 && statusCode < 500 ? 'Client Error' :
             statusCode >= 500 ? 'Server Error' : 'Unknown'}
          </span>
        </div>
      )}

      {/* Response Preview */}
      {responseData && (
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '8px',
          borderRadius: '4px',
          marginBottom: '12px',
          border: '1px solid #e5e7eb',
          maxHeight: '80px',
          overflowY: 'auto'
        }}>
          <div style={{
            fontSize: '11px',
            color: '#6b7280',
            marginBottom: '4px'
          }}>
            Response:
          </div>
          <pre style={{
            fontSize: '10px',
            color: '#1f2937',
            fontFamily: 'monospace',
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {typeof responseData === 'string' ? responseData : JSON.stringify(responseData, null, 2)}
          </pre>
        </div>
      )}

      {/* Execute Button */}
      <button
        onClick={handleExecute}
        disabled={isExecuting || !url}
        style={{
          width: '100%',
          padding: '8px 12px',
          backgroundColor: isExecuting ? '#9ca3af' : (!url ? '#d1d5db' : '#10b981'),
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: '500',
          cursor: (isExecuting || !url) ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          marginBottom: '8px'
        }}
      >
        {isExecuting ? (
          <>
            <div style={{
              width: '12px',
              height: '12px',
              border: '2px solid #ffffff',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            Sending...
          </>
        ) : (
          <>
            🌐 Send Request
          </>
        )}
      </button>

      {/* Last Execution Info */}
      {lastExecution && (
        <div style={{
          fontSize: '11px',
          color: '#6b7280',
          textAlign: 'center'
        }}>
          Last request: {lastExecution}
        </div>
      )}

      {/* Input Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="trigger_input"
        style={{
          background: '#6b7280',
          border: '2px solid #ffffff',
          width: '12px',
          height: '12px',
          top: '30%'
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="url_input"
        style={{
          background: '#3b82f6',
          border: '2px solid #ffffff',
          width: '12px',
          height: '12px',
          top: '50%'
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="data_input"
        style={{
          background: '#8b5cf6',
          border: '2px solid #ffffff',
          width: '12px',
          height: '12px',
          top: '70%'
        }}
      />

      {/* Output Handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="response_data"
        style={{
          background: '#10b981',
          border: '2px solid #ffffff',
          width: '12px',
          height: '12px',
          top: '25%'
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="status_code"
        style={{
          background: '#f59e0b',
          border: '2px solid #ffffff',
          width: '12px',
          height: '12px',
          top: '45%'
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="headers"
        style={{
          background: '#3b82f6',
          border: '2px solid #ffffff',
          width: '12px',
          height: '12px',
          top: '65%'
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="success"
        style={{
          background: '#8b5cf6',
          border: '2px solid #ffffff',
          width: '12px',
          height: '12px',
          top: '85%'
        }}
      />

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default HttpRequestActionNode;