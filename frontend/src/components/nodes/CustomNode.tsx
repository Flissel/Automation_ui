/**
 * TRAE Visual Workflow System - Custom Node Component
 * 
 * Base React Flow node component with visual status indicators
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData, NodeStatus, DataType } from '../../types';
import { calculateHandlePositions, getHandleStyle } from '../../utils/connectionValidator';

interface CustomNodeProps extends NodeProps {
  data: NodeData;
}

const CustomNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
  const getStatusColor = (status: NodeStatus) => {
    switch (status) {
      case 'idle': return '#6b7280';
      case 'running': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'failed': return '#ef4444';
      case 'skipped': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: NodeStatus) => {
    switch (status) {
      case 'idle': return '⏸️';
      case 'running': return '⏳';
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'skipped': return '⏭️';
      default: return '⏸️';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'trigger': return '#8b5cf6';
      case 'action': return '#3b82f6';
      case 'logic': return '#f59e0b';
      case 'data': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'trigger': return '⚡';
      case 'action': return '🎯';
      case 'logic': return '🔀';
      case 'data': return '📊';
      default: return '📦';
    }
  };

  const nodeStyle: React.CSSProperties = {
    background: '#ffffff',
    border: `2px solid ${selected ? '#3b82f6' : getCategoryColor(data.category)}`,
    borderRadius: '8px',
    padding: '12px',
    minWidth: '180px',
    boxShadow: selected 
      ? '0 4px 12px rgba(59, 130, 246, 0.3)'
      : '0 2px 8px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease',
    position: 'relative',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  };

  const titleStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
  };

  const statusStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: getStatusColor(data.status),
    fontWeight: '500',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px',
    fontWeight: '500',
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#9ca3af',
    lineHeight: '1.3',
    marginTop: '4px',
  };

  const categoryBadgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-8px',
    left: '8px',
    backgroundColor: getCategoryColor(data.category),
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: '600',
    padding: '2px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const progressBarStyle: React.CSSProperties = {
    width: '100%',
    height: '3px',
    backgroundColor: '#e5e7eb',
    borderRadius: '2px',
    marginTop: '8px',
    overflow: 'hidden',
  };

  const progressFillStyle: React.CSSProperties = {
    height: '100%',
    backgroundColor: getStatusColor(data.status),
    width: data.status === 'running' ? '60%' : data.status === 'completed' ? '100%' : '0%',
    transition: 'width 0.3s ease',
  };

  const handleStyle: React.CSSProperties = {
    width: '12px',
    height: '12px',
    backgroundColor: getCategoryColor(data.category),
    border: '2px solid #ffffff',
    borderRadius: '50%',
  };

  const getDataTypeColor = (dataType: DataType) => {
    switch (dataType) {
      case DataType.STRING: return '#3b82f6';
      case DataType.NUMBER: return '#10b981';
      case DataType.BOOLEAN: return '#f59e0b';
      case DataType.OBJECT: return '#8b5cf6';
      case DataType.ARRAY: return '#ef4444';
      case DataType.IMAGE: return '#06b6d4';
      case DataType.FILE: return '#84cc16';
      case DataType.ANY: return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getDataTypeIcon = (dataType: DataType) => {
    switch (dataType) {
      case DataType.STRING: return '📝';
      case DataType.NUMBER: return '🔢';
      case DataType.BOOLEAN: return '✅';
      case DataType.OBJECT: return '📦';
      case DataType.ARRAY: return '📋';
      case DataType.IMAGE: return '🖼️';
      case DataType.FILE: return '📁';
      case DataType.ANY: return '🔗';
      default: return '❓';
    }
  };

  return (
    <div style={nodeStyle}>
      {/* Input Handles */}
      {data.inputs.map((input, index) => (
        <Handle
          key={`input-${input.id}`}
          type="target"
          position={Position.Left}
          id={input.id}
          style={{
            ...handleStyle,
            backgroundColor: getDataTypeColor(input.type),
            top: `${30 + (index * 25)}px`,
            left: '-6px',
          }}
          title={`${input.name} (${input.type})${input.required ? ' *' : ''}`}
        />
      ))}

      {/* Output Handles */}
      {data.outputs.map((output, index) => (
        <Handle
          key={`output-${output.id}`}
          type="source"
          position={Position.Right}
          id={output.id}
          style={{
            ...handleStyle,
            backgroundColor: getDataTypeColor(output.type),
            top: `${30 + (index * 25)}px`,
            right: '-6px',
          }}
          title={`${output.name} (${output.type})`}
        />
      ))}

      {/* Category Badge */}
      <div style={categoryBadgeStyle}>
        {getCategoryIcon(data.category)} {data.category}
      </div>

      {/* Header */}
      <div style={headerStyle}>
        <div style={titleStyle}>
          <span>{data.icon || '📦'}</span>
          <span>{data.label || data.type}</span>
        </div>
        <div style={statusStyle}>
          <span>{getStatusIcon(data.status)}</span>
          <span>{data.status}</span>
        </div>
      </div>

      {/* Node Type */}
      <div style={labelStyle}>
        {data.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </div>

      {/* Input/Output Port Information */}
      {(data.inputs.length > 0 || data.outputs.length > 0) && (
        <div style={{
          fontSize: '10px',
          color: '#6b7280',
          marginTop: '8px',
          padding: '6px',
          backgroundColor: '#f8fafc',
          borderRadius: '4px',
          border: '1px solid #e2e8f0',
        }}>
          {/* Input Ports */}
          {data.inputs.length > 0 && (
            <div style={{ marginBottom: '4px' }}>
              <div style={{ fontWeight: '600', marginBottom: '2px' }}>📥 Inputs:</div>
              {data.inputs.map((input, index) => (
                <div key={input.id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  marginBottom: '1px'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: getDataTypeColor(input.type),
                  }} />
                  <span>{getDataTypeIcon(input.type)}</span>
                  <span>{input.name}</span>
                  {input.required && <span style={{ color: '#ef4444' }}>*</span>}
                </div>
              ))}
            </div>
          )}
          
          {/* Output Ports */}
          {data.outputs.length > 0 && (
            <div>
              <div style={{ fontWeight: '600', marginBottom: '2px' }}>📤 Outputs:</div>
              {data.outputs.map((output, index) => (
                <div key={output.id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  marginBottom: '1px'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: getDataTypeColor(output.type),
                  }} />
                  <span>{getDataTypeIcon(output.type)}</span>
                  <span>{output.name}</span>
                  {output.value && (
                    <span style={{ 
                      color: '#10b981',
                      fontSize: '9px',
                      fontWeight: '500'
                    }}>✓</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Configuration Summary */}
      {data.config && Object.keys(data.config).length > 0 && (
        <div style={{
          fontSize: '11px',
          color: '#4b5563',
          backgroundColor: '#f9fafb',
          padding: '6px 8px',
          borderRadius: '4px',
          marginTop: '6px',
          border: '1px solid #e5e7eb',
        }}>
          {/* Show key configuration details */}
          {data.type === 'ocr_region' && data.config.region && (
            <div>📍 Region: {data.config.region.width}×{data.config.region.height}</div>
          )}
          {data.type === 'click_action' && data.config.position && (
            <div>🖱️ Click: ({data.config.position.x}, {data.config.position.y})</div>
          )}
          {data.type === 'file_watcher' && data.config.path && (
            <div>📁 Watch: {data.config.path.split('/').pop() || data.config.path}</div>
          )}
          {data.type === 'condition' && data.config.condition && (
            <div>🔀 If: {data.config.condition.slice(0, 20)}...</div>
          )}
          {data.type === 'event_trigger' && data.config.event_type && (
            <div>⚡ Event: {data.config.event_type}</div>
          )}
          {data.type === 'live_desktop' && (
            <div>🖥️ Desktop Stream</div>
          )}
        </div>
      )}

      {/* Description */}
      {data.description && (
        <div style={descriptionStyle}>
          {data.description.length > 60 
            ? `${data.description.slice(0, 60)}...` 
            : data.description
          }
        </div>
      )}

      {/* Progress Bar for Running Status */}
      {data.status === 'running' && (
        <div style={progressBarStyle}>
          <div style={progressFillStyle} />
        </div>
      )}

      {/* Error Indicator */}
      {data.status === 'failed' && data.error && (
        <div style={{
          marginTop: '6px',
          padding: '4px 6px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '4px',
          fontSize: '10px',
          color: '#dc2626',
          fontWeight: '500',
        }}>
          ⚠️ {data.error.length > 40 ? `${data.error.slice(0, 40)}...` : data.error}
        </div>
      )}

      {/* Execution Time */}
      {(data.status === 'completed' || data.status === 'failed') && data.executionTime && (
        <div style={{
          marginTop: '4px',
          fontSize: '10px',
          color: '#9ca3af',
          textAlign: 'right',
        }}>
          ⏱️ {data.executionTime}ms
        </div>
      )}

      {/* Input Handles */}
      {data.inputs && data.inputs.length > 0 && (
        <>
          {data.inputs.map((input, index) => {
            const handlePositions = calculateHandlePositions(data, 200, 120);
            const position = handlePositions.inputs[index];
            
            return (
              <Handle
                key={input.id}
                type="target"
                position={Position.Left}
                id={input.id}
                style={{
                  ...getHandleStyle(input.type, false, true),
                  top: position ? `${(position.y / 120) * 100}%` : `${30 + (index * 25)}px`,
                }}
                title={`${input.name} (${input.type})${input.required ? ' *' : ''}\n${input.description || ''}`}
              />
            );
          })}
        </>
      )}

      {/* Output Handles */}
      {data.outputs && data.outputs.length > 0 && (
        <>
          {data.outputs.map((output, index) => {
            const handlePositions = calculateHandlePositions(data, 200, 120);
            const position = handlePositions.outputs[index];
            
            return (
              <Handle
                key={output.id}
                type="source"
                position={Position.Right}
                id={output.id}
                style={{
                  ...getHandleStyle(output.type, false, true),
                  top: position ? `${(position.y / 120) * 100}%` : `${30 + (index * 25)}px`,
                }}
                title={`${output.name} (${output.type})\n${output.description || ''}`}
              />
            );
          })}
        </>
      )}

      {/* Default handles if no specific inputs/outputs defined */}
      {(!data.inputs || data.inputs.length === 0) && data.category !== 'trigger' && (
        <Handle
          type="target"
          position={Position.Left}
          style={handleStyle}
          title="Input"
        />
      )}
      
      {(!data.outputs || data.outputs.length === 0) && (
        <Handle
          type="source"
          position={Position.Right}
          style={handleStyle}
          title="Output"
        />
      )}
    </div>
  );
};

export default CustomNode;