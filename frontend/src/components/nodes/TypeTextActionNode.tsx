/**
 * TRAE Visual Workflow System - Type Text Action Node Component
 * 
 * Text typing automation node
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import React, { useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { NodeData, NodeStatus } from '../../types';
import { nodeApi } from '../../services/api';

interface TypeTextActionNodeProps {
  data: NodeData;
  selected?: boolean;
}

const TypeTextActionNode: React.FC<TypeTextActionNodeProps> = ({ data, selected }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastExecution, setLastExecution] = useState<string | null>(null);
  const [typedText, setTypedText] = useState<string>('');

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
        if (result.outputs?.typed_text) {
          setTypedText(result.outputs.typed_text);
        }
      }
    } catch (error) {
      console.error('Type text execution failed:', error);
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

  const textToType = data.config?.text || '';
  const typingSpeed = data.config?.typing_speed || 50;
  const clearBefore = data.config?.clear_before || false;
  const pressEnter = data.config?.press_enter || false;

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
        <span style={{ fontSize: '20px' }}>{typeof data.icon === 'string' ? data.icon : '⌨️'}</span>
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

      {/* Text Preview */}
      <div style={{
        backgroundColor: '#f8fafc',
        padding: '8px',
        borderRadius: '4px',
        marginBottom: '12px',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{
          fontSize: '12px',
          color: '#6b7280',
          marginBottom: '4px'
        }}>
          Text to type:
        </div>
        <div style={{
          fontSize: '13px',
          color: '#1f2937',
          fontFamily: 'monospace',
          maxHeight: '60px',
          overflowY: 'auto',
          wordBreak: 'break-word'
        }}>
          {textToType || '(No text configured)'}
        </div>
      </div>

      {/* Configuration Display */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        marginBottom: '12px',
        fontSize: '11px'
      }}>
        <div style={{
          backgroundColor: '#f1f5f9',
          padding: '6px',
          borderRadius: '3px',
          textAlign: 'center'
        }}>
          <div style={{ color: '#64748b' }}>Speed</div>
          <div style={{ color: '#1e293b', fontWeight: '500' }}>{typingSpeed}ms</div>
        </div>
        <div style={{
          backgroundColor: '#f1f5f9',
          padding: '6px',
          borderRadius: '3px',
          textAlign: 'center'
        }}>
          <div style={{ color: '#64748b' }}>Options</div>
          <div style={{ color: '#1e293b', fontWeight: '500' }}>
            {clearBefore ? '🗑️' : ''}{pressEnter ? '↵' : ''}
          </div>
        </div>
      </div>

      {/* Execute Button */}
      <button
        onClick={handleExecute}
        disabled={isExecuting || !textToType}
        style={{
          width: '100%',
          padding: '8px 12px',
          backgroundColor: isExecuting ? '#9ca3af' : (!textToType ? '#d1d5db' : '#10b981'),
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: '500',
          cursor: (isExecuting || !textToType) ? 'not-allowed' : 'pointer',
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
            Typing...
          </>
        ) : (
          <>
            ⌨️ Type Text
          </>
        )}
      </button>

      {/* Last Execution Info */}
      {lastExecution && (
        <div style={{
          fontSize: '11px',
          color: '#6b7280',
          textAlign: 'center',
          marginBottom: '4px'
        }}>
          Last typed: {lastExecution}
        </div>
      )}

      {/* Typed Text Result */}
      {typedText && (
        <div style={{
          fontSize: '11px',
          color: '#10b981',
          textAlign: 'center',
          fontFamily: 'monospace'
        }}>
          "{typedText.length > 30 ? typedText.substring(0, 30) + '...' : typedText}"
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
          top: '40%'
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="text_input"
        style={{
          background: '#3b82f6',
          border: '2px solid #ffffff',
          width: '12px',
          height: '12px',
          top: '60%'
        }}
      />

      {/* Output Handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="success_output"
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
        id="typed_text"
        style={{
          background: '#3b82f6',
          border: '2px solid #ffffff',
          width: '12px',
          height: '12px',
          top: '60%'
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

export default TypeTextActionNode;