/**
 * Enhanced AutomationWorkflowPanel - Modern UI for "record → click → execute → save → wait → next" workflow
 * 
 * Features:
 * - Modern glassmorphism design matching the main interface
 * - Smooth animations and transitions
 * - Better visual hierarchy and typography
 * - Enhanced interactive elements
 * - Responsive design with improved spacing
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  workflowIntegrationService, 
  RecordedAction, 
  AutomationWorkflow, 
  WorkflowExecution 
} from '../services/WorkflowIntegrationService';

interface AutomationWorkflowPanelProps {
  onRecordAction?: (action: RecordedAction) => void;
  isRecording?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const AutomationWorkflowPanel: React.FC<AutomationWorkflowPanelProps> = ({
  onRecordAction,
  isRecording = false,
  className = '',
  style = {}
}) => {
  // State management
  const [recordedActions, setRecordedActions] = useState<RecordedAction[]>([]);
  const [activeWorkflows, setActiveWorkflows] = useState<WorkflowExecution[]>([]);
  const [workflowTemplates, setWorkflowTemplates] = useState<AutomationWorkflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<AutomationWorkflow | null>(null);
  const [workflowName, setWorkflowName] = useState<string>('');
  const [workflowDescription, setWorkflowDescription] = useState<string>('');
  const [executionStatus, setExecutionStatus] = useState<string>('');
  const [nodeTemplates, setNodeTemplates] = useState<any>(null);
  const [isBuilding, setIsBuilding] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  // Load data on component mount
  useEffect(() => {
    loadWorkflowData();
    const interval = setInterval(refreshActiveWorkflows, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update recorded actions when they change
  useEffect(() => {
    const actions = workflowIntegrationService.getRecordedActions();
    setRecordedActions(actions);
  }, [isRecording]);

  const loadWorkflowData = async () => {
    try {
      // Load recorded actions
      const actions = workflowIntegrationService.getRecordedActions();
      setRecordedActions(actions);

      // Load workflow templates
      const templates = workflowIntegrationService.getWorkflowTemplates();
      setWorkflowTemplates(templates);

      // Load node templates from V3 API
      const nodeTemplateData = await workflowIntegrationService.getNodeTemplates();
      setNodeTemplates(nodeTemplateData);

      console.log('📋 Loaded workflow data:', { 
        actions: actions.length, 
        templates: templates.length,
        nodeTemplates: nodeTemplateData?.count || 0
      });
    } catch (error) {
      console.error('❌ Failed to load workflow data:', error);
    }
  };

  const refreshActiveWorkflows = () => {
    const workflows = workflowIntegrationService.getActiveWorkflows();
    setActiveWorkflows(workflows);
  };

  // ================================
  // WORKFLOW RECORDING ACTIONS
  // ================================

  const handleRecordClick = useCallback((x: number, y: number, button: 'left' | 'right' | 'middle' = 'left') => {
    const action = workflowIntegrationService.recordClickAction(x, y, button);
    setRecordedActions([...workflowIntegrationService.getRecordedActions()]);
    onRecordAction?.(action);
  }, [onRecordAction]);

  const handleRecordOCRRegion = useCallback((x: number, y: number, width: number, height: number, expectedText?: string) => {
    const action = workflowIntegrationService.recordOCRRegion(x, y, width, height, expectedText);
    setRecordedActions([...workflowIntegrationService.getRecordedActions()]);
    onRecordAction?.(action);
  }, [onRecordAction]);

  const handleRecordScreenshot = useCallback((region?: { x: number; y: number; width: number; height: number }) => {
    const action = workflowIntegrationService.recordScreenshot(region);
    setRecordedActions([...workflowIntegrationService.getRecordedActions()]);
    onRecordAction?.(action);
  }, [onRecordAction]);

  const clearRecordedActions = () => {
    workflowIntegrationService.clearRecordedActions();
    setRecordedActions([]);
  };

  // ================================
  // WORKFLOW BUILDING AND EXECUTION
  // ================================

  const buildWorkflowFromActions = async () => {
    if (recordedActions.length === 0) {
      alert('No actions recorded. Please record some actions first.');
      return;
    }

    if (!workflowName.trim()) {
      alert('Please enter a workflow name.');
      return;
    }

    setIsBuilding(true);
    try {
      const workflow = workflowIntegrationService.buildWorkflowFromRecordedActions(
        workflowName.trim(),
        workflowDescription.trim()
      );
      
      setSelectedWorkflow(workflow);
      setExecutionStatus(`✅ Built workflow "${workflow.name}" with ${workflow.steps.length} steps`);
      
      // Clear the recorded actions after building workflow
      clearRecordedActions();
      setWorkflowName('');
      setWorkflowDescription('');
      
    } catch (error: any) {
      setExecutionStatus(`❌ Failed to build workflow: ${error.message}`);
    } finally {
      setIsBuilding(false);
    }
  };

  const executeWorkflow = async (workflow: AutomationWorkflow) => {
    setIsExecuting(true);
    try {
      setExecutionStatus(`🚀 Starting execution of "${workflow.name}"...`);
      
      const execution = await workflowIntegrationService.executeWorkflow(workflow);
      
      if (execution.status === 'completed') {
        setExecutionStatus(`✅ Workflow "${workflow.name}" completed successfully`);
      } else if (execution.status === 'failed') {
        setExecutionStatus(`❌ Workflow "${workflow.name}" failed: ${execution.error}`);
      } else {
        setExecutionStatus(`⏳ Workflow "${workflow.name}" is ${execution.status}`);
      }
      
      refreshActiveWorkflows();
    } catch (error: any) {
      setExecutionStatus(`❌ Failed to execute workflow: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const executeSelectedWorkflow = () => {
    if (selectedWorkflow) {
      executeWorkflow(selectedWorkflow);
    }
  };

  // ================================
  // UI HELPER FUNCTIONS
  // ================================

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'click': return '🎯';
      case 'ocr_region': return '🔤';
      case 'screenshot': return '📸';
      default: return '❓';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'running': return '⏳';
      case 'pending': return '⏸️';
      default: return '❓';
    }
  };

  // ================================
  // RENDER UI
  // ================================

  return (
    <div className={`automation-workflow-panel ${className}`} style={{
      padding: '24px',
      background: 'transparent',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      height: '100%',
      overflowY: 'auto',
      ...style
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '2px solid rgba(99, 102, 241, 0.1)'
      }}>
        <h2 style={{ 
          margin: 0,
          fontSize: '24px',
          fontWeight: '700',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          🤖 Automation Workflow Panel
        </h2>
      </div>

      {/* Enhanced Recording Status */}
      <div style={{ 
        marginBottom: '24px', 
        padding: '16px', 
        background: isRecording 
          ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(21, 128, 61, 0.05))'
          : 'linear-gradient(135deg, rgba(71, 85, 105, 0.1), rgba(51, 65, 85, 0.05))',
        border: `1px solid ${isRecording ? 'rgba(34, 197, 94, 0.2)' : 'rgba(71, 85, 105, 0.2)'}`,
        borderRadius: '12px',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '8px'
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: isRecording ? '#22c55e' : '#64748b',
            animation: isRecording ? 'pulse 2s infinite' : 'none'
          }} />
          <div style={{ 
            fontWeight: '600',
            fontSize: '16px',
            color: isRecording ? '#15803d' : '#475569'
          }}>
            {isRecording ? 'Recording Actions' : 'Not Recording'}
          </div>
        </div>
        <div style={{ 
          fontSize: '14px', 
          color: '#64748b',
          marginLeft: '24px',
          lineHeight: '1.5'
        }}>
          {isRecording 
            ? 'Click, draw OCR regions, or take screenshots on the Live Desktop Canvas to capture automation actions'
            : 'Start recording to capture automation actions for your workflow'
          }
        </div>
      </div>

      {/* Enhanced Recorded Actions */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '12px' 
        }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '18px',
            fontWeight: '600',
            color: '#374151'
          }}>
            📋 Recorded Actions ({recordedActions.length})
          </h3>
          <button
            onClick={clearRecordedActions}
            disabled={recordedActions.length === 0}
            style={{
              padding: '8px 12px',
              background: recordedActions.length === 0 
                ? 'rgba(220, 53, 69, 0.3)' 
                : 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: recordedActions.length === 0 ? '#6b7280' : 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: recordedActions.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => {
              if (recordedActions.length > 0) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (recordedActions.length > 0) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            🗑️ Clear
          </button>
        </div>
        
        <div style={{ 
          maxHeight: '240px', 
          overflowY: 'auto',
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(229, 231, 235, 0.5)',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
        }}>
          {recordedActions.length === 0 ? (
            <div style={{ 
              padding: '32px', 
              textAlign: 'center', 
              color: '#6b7280',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📝</div>
              No actions recorded yet. Interact with the Live Desktop Canvas to record actions.
            </div>
          ) : (
            recordedActions.map((action, index) => (
              <div key={action.id} style={{
                padding: '16px',
                borderBottom: index < recordedActions.length - 1 ? '1px solid rgba(229, 231, 235, 0.3)' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ 
                    fontSize: '20px', 
                    marginRight: '12px',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {getActionIcon(action.type)}
                  </span>
                  <div>
                    <div style={{ 
                      fontWeight: '600',
                      fontSize: '14px',
                      color: '#374151',
                      marginBottom: '2px'
                    }}>
                      {action.metadata?.description || action.type}
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#6b7280'
                    }}>
                      {formatTimestamp(action.timestamp)}
                    </div>
                  </div>
                </div>
                <div style={{ 
                  fontSize: '11px', 
                  color: '#9ca3af',
                  fontFamily: 'monospace',
                  maxWidth: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {JSON.stringify(action.data, null, 0).substring(0, 30)}...
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Enhanced Workflow Builder */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ 
          marginBottom: '16px',
          fontSize: '18px',
          fontWeight: '600',
          color: '#374151'
        }}>
          🏗️ Build Workflow
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Workflow name..."
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            style={{
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(229, 231, 235, 0.5)',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#6366f1';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(229, 231, 235, 0.5)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <textarea
            placeholder="Workflow description (optional)..."
            value={workflowDescription}
            onChange={(e) => setWorkflowDescription(e.target.value)}
            rows={3}
            style={{
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(229, 231, 235, 0.5)',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '400',
              outline: 'none',
              resize: 'vertical',
              transition: 'all 0.2s ease',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#6366f1';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(229, 231, 235, 0.5)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
        <button
          onClick={buildWorkflowFromActions}
          disabled={recordedActions.length === 0 || !workflowName.trim() || isBuilding}
          style={{
            width: '100%',
            padding: '14px',
            background: (recordedActions.length === 0 || !workflowName.trim() || isBuilding)
              ? 'rgba(34, 197, 94, 0.3)' 
              : 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: (recordedActions.length === 0 || !workflowName.trim() || isBuilding) ? '#6b7280' : 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: (recordedActions.length === 0 || !workflowName.trim() || isBuilding) ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: (recordedActions.length === 0 || !workflowName.trim() || isBuilding) 
              ? 'none' 
              : '0 4px 12px rgba(34, 197, 94, 0.3)'
          }}
          onMouseEnter={(e) => {
            if (recordedActions.length > 0 && workflowName.trim() && !isBuilding) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(34, 197, 94, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (recordedActions.length > 0 && workflowName.trim() && !isBuilding) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
            }
          }}
        >
          {isBuilding ? (
            <>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Building...
            </>
          ) : (
            <>
              🏗️ Build Workflow from {recordedActions.length} Actions
            </>
          )}
        </button>
      </div>

      {/* Enhanced Selected Workflow */}
      {selectedWorkflow && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            marginBottom: '12px',
            fontSize: '18px',
            fontWeight: '600',
            color: '#374151'
          }}>
            🎯 Ready to Execute
          </h3>
          <div style={{
            padding: '20px',
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(21, 128, 61, 0.05))',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ 
              fontWeight: '600', 
              fontSize: '16px',
              color: '#15803d',
              marginBottom: '6px' 
            }}>
              {selectedWorkflow.name}
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: '#166534', 
              marginBottom: '12px',
              lineHeight: '1.4'
            }}>
              {selectedWorkflow.description}
            </div>
            <div style={{ 
              fontSize: '12px', 
              color: '#166534', 
              marginBottom: '16px',
              padding: '8px 12px',
              background: 'rgba(34, 197, 94, 0.1)',
              borderRadius: '8px',
              display: 'inline-block'
            }}>
              {selectedWorkflow.steps.length} steps • {selectedWorkflow.connections.length} connections
            </div>
            <button
              onClick={executeSelectedWorkflow}
              disabled={isExecuting}
              style={{
                width: '100%',
                padding: '14px',
                background: isExecuting
                  ? 'rgba(59, 130, 246, 0.3)'
                  : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: isExecuting ? '#6b7280' : 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: isExecuting ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: isExecuting ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}
              onMouseEnter={(e) => {
                if (!isExecuting) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isExecuting) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                }
              }}
            >
              {isExecuting ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Executing...
                </>
              ) : (
                <>
                  🚀 Execute Workflow
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Execution Status */}
      {executionStatus && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            marginBottom: '12px',
            fontSize: '18px',
            fontWeight: '600',
            color: '#374151'
          }}>
            📊 Execution Status
          </h3>
          <div style={{
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(229, 231, 235, 0.5)',
            borderRadius: '12px',
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            fontSize: '13px',
            lineHeight: '1.5',
            color: '#374151'
          }}>
            {executionStatus}
          </div>
        </div>
      )}

      {/* Enhanced Active Workflows */}
      {activeWorkflows.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            marginBottom: '12px',
            fontSize: '18px',
            fontWeight: '600',
            color: '#374151'
          }}>
            ⚡ Active Workflows ({activeWorkflows.length})
          </h3>
          <div style={{ 
            maxHeight: '180px', 
            overflowY: 'auto',
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(229, 231, 235, 0.5)',
            borderRadius: '12px'
          }}>
            {activeWorkflows.map((workflow, index) => (
              <div key={workflow.id} style={{
                padding: '16px',
                borderBottom: index < activeWorkflows.length - 1 ? '1px solid rgba(229, 231, 235, 0.3)' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              >
                <div>
                  <div style={{ 
                    fontWeight: '600',
                    fontSize: '14px',
                    color: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {getStatusIcon(workflow.status)} {workflow.workflowId}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#6b7280',
                    marginTop: '2px'
                  }}>
                    Started: {formatTimestamp(workflow.startTime)}
                  </div>
                </div>
                <div style={{ 
                  fontSize: '12px',
                  fontWeight: '600',
                  color: workflow.status === 'completed' ? '#22c55e' : 
                         workflow.status === 'failed' ? '#ef4444' :
                         workflow.status === 'running' ? '#f59e0b' : '#6b7280',
                  padding: '4px 8px',
                  background: workflow.status === 'completed' ? 'rgba(34, 197, 94, 0.1)' : 
                             workflow.status === 'failed' ? 'rgba(239, 68, 68, 0.1)' :
                             workflow.status === 'running' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                  borderRadius: '6px'
                }}>
                  {workflow.status.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Node Templates Info */}
      {nodeTemplates && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            marginBottom: '12px',
            fontSize: '18px',
            fontWeight: '600',
            color: '#374151'
          }}>
            🧩 Available Node Templates
          </h3>
          <div style={{
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(229, 231, 235, 0.5)',
            borderRadius: '12px'
          }}>
            <div style={{
              fontSize: '14px',
              color: '#374151',
              fontWeight: '600',
              marginBottom: '8px'
            }}>
              {nodeTemplates.count} node templates available from V3 API system
            </div>
            <div style={{ 
              fontSize: '12px',
              color: '#6b7280',
              lineHeight: '1.4'
            }}>
              Categories: triggers, actions, desktop, processing, logic, output
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Quick Actions */}
      <div style={{ marginTop: '24px' }}>
        <h3 style={{ 
          marginBottom: '16px',
          fontSize: '18px',
          fontWeight: '600',
          color: '#374151'
        }}>
          ⚡ Quick Actions
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button
            onClick={() => handleRecordScreenshot()}
            style={{
              padding: '12px',
              background: 'linear-gradient(135deg, #6b7280, #4b5563)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '13px',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(107, 114, 128, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            📸 Screenshot
          </button>
          <button
            onClick={loadWorkflowData}
            style={{
              padding: '12px',
              background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '13px',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(6, 182, 212, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            🔄 Refresh Data
          </button>
        </div>
      </div>

      {/* CSS Animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `
      }} />
    </div>
  );
};

export default AutomationWorkflowPanel;