/**
 * TRAE Visual Workflow System - Manual Trigger Node Component
 * 
 * Manual trigger node for starting workflows
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import React, { useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { NodeData, NodeStatus } from '../../types';
import { workflowApi } from '../../services/api';

interface ManualTriggerNodeProps {
  data: NodeData;
  selected?: boolean;
}

const ManualTriggerNode: React.FC<ManualTriggerNodeProps> = ({ data, selected }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastExecution, setLastExecution] = useState<string | null>(null);

  const handleTrigger = useCallback(async () => {
    if (isExecuting) return;

    setIsExecuting(true);
    try {
      // Get the current workflow from the canvas
      const reactFlowInstance = (window as any).reactFlowInstance;
      if (!reactFlowInstance) {
        throw new Error('React Flow instance not available');
      }

      const nodes = reactFlowInstance.getNodes();
      const edges = reactFlowInstance.getEdges();

      if (nodes.length === 0) {
        throw new Error('No nodes in workflow to execute');
      }

      // Create workflow definition
      const workflowDefinition = {
        name: `Workflow_${Date.now()}`,
        description: 'Auto-generated workflow from manual trigger',
        nodes: nodes.map((node: any) => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data
        })),
        edges: edges.map((edge: any) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          source_handle: edge.sourceHandle,
          target_handle: edge.targetHandle
        })),
        metadata: {
          triggered_by: 'manual_trigger',
          trigger_node_id: data.id,
          created_at: new Date().toISOString()
        }
      };

      // Create workflow in backend
      const createResult = await workflowApi.createWorkflow(workflowDefinition);
      if (!createResult.success || !createResult.data) {
        throw new Error('Failed to create workflow');
      }

      const workflowId = createResult.data.id;
      console.log('TRAE DEBUG: Created workflow with ID:', workflowId);

      // Execute the workflow
      const executeResult = await workflowApi.executeWorkflow(workflowId);
      if (executeResult.success) {
        setLastExecution(new Date().toLocaleTimeString());
        console.log('TRAE DEBUG: Workflow execution started:', executeResult.data);
      } else {
        throw new Error('Failed to execute workflow');
      }
    } catch (error) {
      console.error('Manual trigger execution failed:', error);
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

  const buttonText = data.config?.button_text || 'Start Workflow';
  const confirmationRequired = data.config?.confirmation_required || false;

  return (
    <div
      style={{
        background: '#ffffff',
        border: `2px solid ${selected ? '#3b82f6' : '#e5e7eb'}`,
        borderRadius: '8px',
        padding: '16px',
        minWidth: '200px',
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
        <span style={{ fontSize: '20px' }}>{typeof data.icon === 'string' ? data.icon : '▶️'}</span>
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

      {/* Trigger Button */}
      <div style={{ marginBottom: '12px' }}>
        <button
          onClick={handleTrigger}
          disabled={isExecuting}
          style={{
            width: '100%',
            padding: '10px 16px',
            backgroundColor: isExecuting ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isExecuting ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {isExecuting ? (
            <>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #ffffff',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Executing...
            </>
          ) : (
            <>
              ▶️ {buttonText}
            </>
          )}
        </button>
      </div>

      {/* Last Execution Info */}
      {lastExecution && (
        <div style={{
          fontSize: '12px',
          color: '#6b7280',
          textAlign: 'center',
          marginBottom: '8px'
        }}>
          Last triggered: {lastExecution}
        </div>
      )}

      {/* Configuration Info */}
      {confirmationRequired && (
        <div style={{
          fontSize: '12px',
          color: '#f59e0b',
          textAlign: 'center',
          marginBottom: '8px'
        }}>
          ⚠️ Confirmation required
        </div>
      )}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="trigger_output"
        style={{
          background: '#10b981',
          border: '2px solid #ffffff',
          width: '12px',
          height: '12px'
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

export default ManualTriggerNode;