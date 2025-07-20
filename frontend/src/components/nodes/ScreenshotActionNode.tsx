/**
 * TRAE Visual Workflow System - Screenshot Action Node Component
 * 
 * Screenshot capture node for screen automation
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import React, { useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { NodeData, NodeStatus } from '../../types';
import { nodeApi } from '../../services/api';

interface ScreenshotActionNodeProps {
  data: NodeData;
  selected?: boolean;
}

const ScreenshotActionNode: React.FC<ScreenshotActionNodeProps> = ({ data, selected }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastScreenshot, setLastScreenshot] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
        setLastScreenshot(new Date().toLocaleTimeString());
        if (result.outputs?.image_output) {
          setPreviewImage(result.outputs.image_output);
        }
      }
    } catch (error) {
      console.error('Screenshot execution failed:', error);
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

  const captureType = data.config?.capture_type || 'fullscreen';
  const fileFormat = data.config?.file_format || 'png';
  const saveToFile = data.config?.save_to_file || true;

  return (
    <div
      style={{
        background: '#ffffff',
        border: `2px solid ${selected ? '#3b82f6' : '#e5e7eb'}`,
        borderRadius: '8px',
        padding: '16px',
        minWidth: '250px',
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
        <span style={{ fontSize: '20px' }}>{typeof data.icon === 'string' ? data.icon : '📷'}</span>
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

      {/* Configuration Display */}
      <div style={{
        backgroundColor: '#f8fafc',
        padding: '8px',
        borderRadius: '4px',
        marginBottom: '12px',
        fontSize: '12px'
      }}>
        <div style={{ marginBottom: '4px' }}>
          <strong>Type:</strong> {captureType}
        </div>
        <div style={{ marginBottom: '4px' }}>
          <strong>Format:</strong> {fileFormat.toUpperCase()}
        </div>
        <div>
          <strong>Save:</strong> {saveToFile ? 'Yes' : 'No'}
        </div>
      </div>

      {/* Preview Image */}
      {previewImage && (
        <div style={{
          marginBottom: '12px',
          border: '1px solid #e5e7eb',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <img
            src={previewImage}
            alt="Screenshot preview"
            style={{
              width: '100%',
              height: '80px',
              objectFit: 'cover'
            }}
          />
        </div>
      )}

      {/* Execute Button */}
      <button
        onClick={handleExecute}
        disabled={isExecuting}
        style={{
          width: '100%',
          padding: '8px 12px',
          backgroundColor: isExecuting ? '#9ca3af' : '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: '500',
          cursor: isExecuting ? 'not-allowed' : 'pointer',
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
            Capturing...
          </>
        ) : (
          <>
            📸 Take Screenshot
          </>
        )}
      </button>

      {/* Last Execution Info */}
      {lastScreenshot && (
        <div style={{
          fontSize: '11px',
          color: '#6b7280',
          textAlign: 'center'
        }}>
          Last capture: {lastScreenshot}
        </div>
      )}

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="trigger_input"
        style={{
          background: '#6b7280',
          border: '2px solid #ffffff',
          width: '12px',
          height: '12px'
        }}
      />

      {/* Output Handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="image_output"
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
      <Handle
        type="source"
        position={Position.Right}
        id="metadata"
        style={{
          background: '#8b5cf6',
          border: '2px solid #ffffff',
          width: '12px',
          height: '12px',
          top: '80%'
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

export default ScreenshotActionNode;