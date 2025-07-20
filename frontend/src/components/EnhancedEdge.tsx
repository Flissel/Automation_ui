/**
 * TRAE Visual Workflow System - Enhanced Edge Component
 * 
 * Interactive edge component with data flow visualization
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import React, { useState } from 'react';
import {
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
} from 'reactflow';
import { DataType } from '../types';
import { getEdgeStyle, getDataTypeIcon } from '../utils/connectionValidator';

interface EnhancedEdgeData {
  dataType: DataType;
  isActive?: boolean;
  hasData?: boolean;
  lastDataTransfer?: string;
  transferCount?: number;
  sourceName?: string;
  targetName?: string;
}

interface EnhancedEdgeProps extends EdgeProps {
  data?: EnhancedEdgeData;
}

const EnhancedEdge: React.FC<EnhancedEdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const dataType = data?.dataType || DataType.ANY;
  const isActive = data?.isActive || false;
  const hasData = data?.hasData || false;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeStyle = {
    ...getEdgeStyle(dataType, isActive || isHovered, hasData),
    ...style,
  };

  const handleEdgeClick = () => {
    setShowDetails(!showDetails);
  };

  const getDataTypeColor = (type: DataType) => {
    switch (type) {
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

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={edgeStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleEdgeClick}
      />
      
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          {/* Data Type Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'white',
              border: `2px solid ${getDataTypeColor(dataType)}`,
              borderRadius: '12px',
              padding: '2px 6px',
              fontSize: '10px',
              fontWeight: '600',
              color: getDataTypeColor(dataType),
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease',
              transform: isHovered ? 'scale(1.1)' : 'scale(1)',
            }}
            onClick={handleEdgeClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <span>{getDataTypeIcon(dataType)}</span>
            <span>{dataType}</span>
            {hasData && (
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  animation: 'pulse 1s infinite',
                }}
              />
            )}
          </div>

          {/* Detailed Information Panel */}
          {showDetails && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginTop: '8px',
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '8px',
                fontSize: '11px',
                color: '#4b5563',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                minWidth: '200px',
                zIndex: 1000,
              }}
            >
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                Connection Details
              </div>
              
              <div style={{ marginBottom: '2px' }}>
                <strong>Type:</strong> {dataType}
              </div>
              
              {data?.sourceName && (
                <div style={{ marginBottom: '2px' }}>
                  <strong>From:</strong> {data.sourceName}
                </div>
              )}
              
              {data?.targetName && (
                <div style={{ marginBottom: '2px' }}>
                  <strong>To:</strong> {data.targetName}
                </div>
              )}
              
              <div style={{ marginBottom: '2px' }}>
                <strong>Status:</strong> 
                <span style={{ 
                  color: hasData ? '#10b981' : '#6b7280',
                  marginLeft: '4px'
                }}>
                  {hasData ? 'Active' : 'Idle'}
                </span>
              </div>
              
              {data?.transferCount && (
                <div style={{ marginBottom: '2px' }}>
                  <strong>Transfers:</strong> {data.transferCount}
                </div>
              )}
              
              {data?.lastDataTransfer && (
                <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                  Last: {new Date(data.lastDataTransfer).toLocaleTimeString()}
                </div>
              )}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>

      {/* Data Flow Animation */}
      {hasData && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${sourceX + (targetX - sourceX) * 0.3}px,${sourceY + (targetY - sourceY) * 0.3}px)`,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: getDataTypeColor(dataType),
                animation: 'dataFlow 2s linear infinite',
                boxShadow: `0 0 8px ${getDataTypeColor(dataType)}`,
              }}
            />
          </div>
        </EdgeLabelRenderer>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes dataFlow {
          0% { transform: translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(${targetX - sourceX}px) translateY(${targetY - sourceY}px); opacity: 0; }
        }
      `}</style>
    </>
  );
};

export default EnhancedEdge;
export type { EnhancedEdgeData, EnhancedEdgeProps };