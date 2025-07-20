/**
 * TRAE Visual Workflow System - Workflow Toolbar Component
 * 
 * Toolbar with workflow controls and actions
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import React, { useState } from 'react';
import DesktopSwitcher from './DesktopSwitcher';

interface WorkflowToolbarProps {
  workflowName: string;
  onWorkflowNameChange: (name: string) => void;
  onSave: () => void;
  onExecute: () => void;
  onClear: () => void;
  onToggleLibrary: () => void;
  onToggleProperties: () => void;
  isDirty: boolean;
  isExecuting: boolean;
  readOnly?: boolean;
}

const WorkflowToolbar: React.FC<WorkflowToolbarProps> = ({
  workflowName,
  onWorkflowNameChange,
  onSave,
  onExecute,
  onClear,
  onToggleLibrary,
  onToggleProperties,
  isDirty,
  isExecuting,
  readOnly = false,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(workflowName);
  const [showDesktopSwitcher, setShowDesktopSwitcher] = useState(false);

  const handleNameEdit = () => {
    if (readOnly) return;
    setIsEditingName(true);
    setTempName(workflowName);
  };

  const handleNameSave = () => {
    onWorkflowNameChange(tempName.trim() || 'Untitled Workflow');
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setTempName(workflowName);
    setIsEditingName(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      handleNameCancel();
    }
  };

  const buttonStyle = {
    padding: '8px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    borderColor: '#3b82f6',
  };

  const dangerButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#ef4444',
    color: '#ffffff',
    borderColor: '#ef4444',
  };

  const disabledButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
    cursor: 'not-allowed',
    borderColor: '#e5e7eb',
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      minHeight: '60px',
    }}>
      {/* Left Section - Workflow Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {isEditingName ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={handleKeyPress}
              onBlur={handleNameSave}
              autoFocus
              style={{
                padding: '6px 10px',
                border: '2px solid #3b82f6',
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: '600',
                outline: 'none',
                minWidth: '200px',
              }}
            />
            <button
              onClick={handleNameSave}
              style={{
                ...buttonStyle,
                padding: '6px 8px',
                backgroundColor: '#10b981',
                color: '#ffffff',
                borderColor: '#10b981',
              }}
            >
              ✓
            </button>
            <button
              onClick={handleNameCancel}
              style={{
                ...buttonStyle,
                padding: '6px 8px',
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <div
            onClick={handleNameEdit}
            style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937',
              cursor: readOnly ? 'default' : 'pointer',
              padding: '6px 10px',
              borderRadius: '4px',
              transition: 'background-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              if (!readOnly) {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {workflowName}
            {!readOnly && (
              <span style={{ fontSize: '14px', color: '#6b7280' }}>✏️</span>
            )}
            {isDirty && (
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#f59e0b',
                marginLeft: '4px',
              }} />
            )}
          </div>
        )}
      </div>

      {/* Center Section - Main Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {!readOnly && (
          <>
            <button
              onClick={onSave}
              disabled={!isDirty}
              style={isDirty ? primaryButtonStyle : disabledButtonStyle}
              onMouseEnter={(e) => {
                if (isDirty) {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }
              }}
              onMouseLeave={(e) => {
                if (isDirty) {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                }
              }}
            >
              <span>💾</span>
              Save
              {isDirty && <span style={{ fontSize: '12px' }}>(Ctrl+S)</span>}
            </button>

            <button
              onClick={onExecute}
              disabled={isExecuting}
              style={isExecuting ? disabledButtonStyle : {
                ...buttonStyle,
                backgroundColor: '#10b981',
                color: '#ffffff',
                borderColor: '#10b981',
              }}
              onMouseEnter={(e) => {
                if (!isExecuting) {
                  e.currentTarget.style.backgroundColor = '#059669';
                }
              }}
              onMouseLeave={(e) => {
                if (!isExecuting) {
                  e.currentTarget.style.backgroundColor = '#10b981';
                }
              }}
            >
              <span>{isExecuting ? '⏳' : '▶️'}</span>
              {isExecuting ? 'Executing...' : 'Execute'}
            </button>

            <button
              onClick={onClear}
              style={dangerButtonStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#dc2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ef4444';
              }}
            >
              <span>🗑️</span>
              Clear
            </button>
          </>
        )}

        {readOnly && (
          <div style={{
            padding: '8px 16px',
            backgroundColor: '#fef3c7',
            color: '#92400e',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <span>👁️</span>
            Read Only
          </div>
        )}
      </div>

      {/* Right Section - View Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={() => setShowDesktopSwitcher(true)}
          style={{
            ...buttonStyle,
            backgroundColor: '#8b5cf6',
            color: '#ffffff',
            borderColor: '#8b5cf6',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#7c3aed';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#8b5cf6';
          }}
        >
          <span>🖥️</span>
          Desktop
        </button>

        <button
          onClick={onToggleLibrary}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
          }}
        >
          <span>📚</span>
          Library
        </button>

        <button
          onClick={onToggleProperties}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
          }}
        >
          <span>⚙️</span>
          Properties
        </button>

        {/* Workflow Status Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: '#f8fafc',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#6b7280',
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isExecuting ? '#f59e0b' : isDirty ? '#ef4444' : '#10b981',
          }} />
          {isExecuting ? 'Running' : isDirty ? 'Modified' : 'Saved'}
        </div>
      </div>

      {/* Desktop Switcher Modal */}
      {showDesktopSwitcher && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '800px',
            maxHeight: '80vh',
            overflow: 'auto',
            position: 'relative',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0,
              }}>
                🖥️ Desktop Environment Switcher
              </h2>
              <button
                onClick={() => setShowDesktopSwitcher(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px',
                  borderRadius: '4px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                ✕
              </button>
            </div>
            <DesktopSwitcher />
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowToolbar;