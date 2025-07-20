/**
 * TRAE Visual Workflow System - Property Panel Component
 * 
 * Side panel for editing node properties and configuration
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import React, { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { NodeData, NodeType } from '../types';
import { useOCR, useDesktop } from '../hooks';

interface PropertyPanelProps {
  node: Node;
  onNodeDataChange: (nodeId: string, newData: Partial<NodeData>) => void;
  onDeleteNode: (nodeId: string) => void;
  onClose: () => void;
  readOnly?: boolean;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({
  node,
  onNodeDataChange,
  onDeleteNode,
  onClose,
  readOnly = false,
}) => {
  const [localData, setLocalData] = useState<NodeData>(node.data);
  const [activeTab, setActiveTab] = useState<'general' | 'config' | 'advanced'>('general');
  
  const { supportedLanguages } = useOCR();
  const { screenInfo } = useDesktop();

  // Update local data when node changes
  useEffect(() => {
    setLocalData(node.data);
  }, [node.data]);

  const handleDataChange = (key: string, value: any) => {
    if (readOnly) return;
    
    const newData = { ...localData, [key]: value };
    setLocalData(newData);
    onNodeDataChange(node.id, { [key]: value });
  };

  const handleConfigChange = (configKey: string, value: any) => {
    if (readOnly) return;
    
    const newConfig = { ...localData.config, [configKey]: value };
    const newData = { ...localData, config: newConfig };
    setLocalData(newData);
    onNodeDataChange(node.id, { config: newConfig });
  };

  const renderGeneralTab = () => (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px',
        }}>
          Node Label
        </label>
        <input
          type="text"
          value={localData.label || ''}
          onChange={(e) => handleDataChange('label', e.target.value)}
          disabled={readOnly}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
            backgroundColor: readOnly ? '#f9fafb' : '#ffffff',
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px',
        }}>
          Description
        </label>
        <textarea
          value={localData.description || ''}
          onChange={(e) => handleDataChange('description', e.target.value)}
          disabled={readOnly}
          rows={3}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
            resize: 'vertical',
            backgroundColor: readOnly ? '#f9fafb' : '#ffffff',
          }}
          placeholder="Describe what this node does..."
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '8px',
        }}>
          Node Information
        </div>
        <div style={{
          padding: '12px',
          backgroundColor: '#f8fafc',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#6b7280',
        }}>
          <div style={{ marginBottom: '4px' }}>
            <strong>Type:</strong> {localData.type}
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong>Category:</strong> {localData.category}
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong>Status:</strong> 
            <span style={{
              marginLeft: '8px',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 
                localData.status === 'completed' ? '#dcfce7' :
                localData.status === 'error' ? '#fef2f2' :
                localData.status === 'running' ? '#dbeafe' : '#f3f4f6',
              color:
                localData.status === 'completed' ? '#166534' :
                localData.status === 'error' ? '#991b1b' :
                localData.status === 'running' ? '#1e40af' : '#374151',
            }}>
              {localData.status}
            </span>
          </div>
          <div>
            <strong>ID:</strong> {node.id}
          </div>
        </div>
      </div>
    </div>
  );

  const renderConfigTab = () => {
    switch (localData.type) {
      case 'ocr':
        return renderOCRConfig();
      case 'click':
        return renderClickConfig();
      case 'fileWatcher':
        return renderFileWatcherConfig();
      case 'condition':
        return renderConditionConfig();
      case 'ocr_click_pattern_monitor':
        return renderOCRClickPatternMonitorConfig();
      case 'enhanced_ocr_monitor':
        return renderEnhancedOCRMonitorConfig();
      case 'ocr_text_tracker':
        return renderOCRTextTrackerConfig();
      default:
        return renderGenericConfig();
    }
  };

  const renderOCRConfig = () => (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px',
        }}>
          OCR Engine
        </label>
        <select
          value={localData.config?.engine || 'tesseract'}
          onChange={(e) => handleConfigChange('engine', e.target.value)}
          disabled={readOnly}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
            backgroundColor: readOnly ? '#f9fafb' : '#ffffff',
          }}
        >
          <option value="tesseract">Tesseract</option>
          <option value="easyocr">EasyOCR</option>
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px',
        }}>
          Language
        </label>
        <select
          value={localData.config?.language || 'eng'}
          onChange={(e) => handleConfigChange('language', e.target.value)}
          disabled={readOnly}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
            backgroundColor: readOnly ? '#f9fafb' : '#ffffff',
          }}
        >
          {supportedLanguages.map(lang => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px',
        }}>
          Confidence Threshold
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={localData.config?.confidence_threshold || 60}
          onChange={(e) => handleConfigChange('confidence_threshold', parseInt(e.target.value))}
          disabled={readOnly}
          style={{ width: '100%', marginBottom: '4px' }}
        />
        <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
          {localData.config?.confidence_threshold || 60}%
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          color: '#374151',
          cursor: readOnly ? 'default' : 'pointer',
        }}>
          <input
            type="checkbox"
            checked={localData.config?.preprocess || false}
            onChange={(e) => handleConfigChange('preprocess', e.target.checked)}
            disabled={readOnly}
          />
          Enable image preprocessing
        </label>
      </div>
    </div>
  );

  const renderClickConfig = () => (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px',
        }}>
          Click Type
        </label>
        <select
          value={localData.config?.click_type || 'left'}
          onChange={(e) => handleConfigChange('click_type', e.target.value)}
          disabled={readOnly}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
            backgroundColor: readOnly ? '#f9fafb' : '#ffffff',
          }}
        >
          <option value="left">Left Click</option>
          <option value="right">Right Click</option>
          <option value="double">Double Click</option>
          <option value="middle">Middle Click</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '6px',
          }}>
            X Position
          </label>
          <input
            type="number"
            value={localData.config?.x || 0}
            onChange={(e) => handleConfigChange('x', parseInt(e.target.value))}
            disabled={readOnly}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: readOnly ? '#f9fafb' : '#ffffff',
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '6px',
          }}>
            Y Position
          </label>
          <input
            type="number"
            value={localData.config?.y || 0}
            onChange={(e) => handleConfigChange('y', parseInt(e.target.value))}
            disabled={readOnly}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: readOnly ? '#f9fafb' : '#ffffff',
            }}
          />
        </div>
      </div>

      {screenInfo && (
        <div style={{
          padding: '12px',
          backgroundColor: '#f0f9ff',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#0369a1',
          marginBottom: '16px',
        }}>
          <div><strong>Screen Resolution:</strong> {screenInfo.width} × {screenInfo.height}</div>
          <div><strong>Scale Factor:</strong> {screenInfo.scale}</div>
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px',
        }}>
          Delay (ms)
        </label>
        <input
          type="number"
          value={localData.config?.delay || 0}
          onChange={(e) => handleConfigChange('delay', parseInt(e.target.value))}
          disabled={readOnly}
          min="0"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
            backgroundColor: readOnly ? '#f9fafb' : '#ffffff',
          }}
        />
      </div>
    </div>
  );

  const renderFileWatcherConfig = () => (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px',
        }}>
          Watch Path
        </label>
        <input
          type="text"
          value={localData.config?.path || ''}
          onChange={(e) => handleConfigChange('path', e.target.value)}
          disabled={readOnly}
          placeholder="C:\\path\\to\\watch"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
            backgroundColor: readOnly ? '#f9fafb' : '#ffffff',
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px',
        }}>
          File Pattern
        </label>
        <input
          type="text"
          value={localData.config?.pattern || '*.*'}
          onChange={(e) => handleConfigChange('pattern', e.target.value)}
          disabled={readOnly}
          placeholder="*.txt, *.pdf, etc."
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
            backgroundColor: readOnly ? '#f9fafb' : '#ffffff',
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '8px',
        }}>
          Watch Events
        </div>
        {['created', 'modified', 'deleted', 'moved'].map(event => (
          <label key={event} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            color: '#374151',
            marginBottom: '6px',
            cursor: readOnly ? 'default' : 'pointer',
          }}>
            <input
              type="checkbox"
              checked={localData.config?.events?.includes(event) || false}
              onChange={(e) => {
                const events = localData.config?.events || [];
                const newEvents = e.target.checked
                  ? [...events, event]
                  : events.filter((e: string) => e !== event);
                handleConfigChange('events', newEvents);
              }}
              disabled={readOnly}
            />
            {event.charAt(0).toUpperCase() + event.slice(1)}
          </label>
        ))}
      </div>
    </div>
  );

  const renderConditionConfig = () => (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px',
        }}>
          Condition Type
        </label>
        <select
          value={localData.config?.condition_type || 'equals'}
          onChange={(e) => handleConfigChange('condition_type', e.target.value)}
          disabled={readOnly}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
            backgroundColor: readOnly ? '#f9fafb' : '#ffffff',
          }}
        >
          <option value="equals">Equals</option>
          <option value="not_equals">Not Equals</option>
          <option value="contains">Contains</option>
          <option value="greater_than">Greater Than</option>
          <option value="less_than">Less Than</option>
          <option value="regex">Regular Expression</option>
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px',
        }}>
          Compare Value
        </label>
        <input
          type="text"
          value={localData.config?.compare_value || ''}
          onChange={(e) => handleConfigChange('compare_value', e.target.value)}
          disabled={readOnly}
          placeholder="Value to compare against"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
            backgroundColor: readOnly ? '#f9fafb' : '#ffffff',
          }}
        />
      </div>
    </div>
  );

  const renderOCRClickPatternMonitorConfig = () => (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px',
        }}>
          Pattern to Monitor
        </label>
        <input
          type="text"
          value={localData.config?.pattern || ''}
          onChange={(e) => handleConfigChange('pattern', e.target.value)}
          disabled={readOnly}
          placeholder="Enter text pattern to monitor for"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
            backgroundColor: readOnly ? '#f9fafb' : '#ffffff',
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px',
        }}>
          Confidence Threshold
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={(localData.config?.confidence_threshold || 0.8) * 100}
          onChange={(e) => handleConfigChange('confidence_threshold', parseInt(e.target.value) / 100)}
          disabled={readOnly}
          style={{ width: '100%', marginBottom: '4px' }}
        />
        <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
          {Math.round((localData.config?.confidence_threshold || 0.8) * 100)}%
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px',
        }}>
          Polling Interval (ms)
        </label>
        <input
          type="number"
          value={localData.config?.polling_interval || 1000}
          onChange={(e) => handleConfigChange('polling_interval', parseInt(e.target.value))}
          disabled={readOnly}
          min="100"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
            backgroundColor: readOnly ? '#f9fafb' : '#ffffff',
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px',
        }}>
          Click Type
        </label>
        <select
          value={localData.config?.click_type || 'left'}
          onChange={(e) => handleConfigChange('click_type', e.target.value)}
          disabled={readOnly}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
            backgroundColor: readOnly ? '#f9fafb' : '#ffffff',
          }}
        >
          <option value="left">Left Click</option>
          <option value="right">Right Click</option>
          <option value="double">Double Click</option>
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          color: '#374151',
          cursor: readOnly ? 'default' : 'pointer',
        }}>
          <input
            type="checkbox"
            checked={localData.config?.case_sensitive || false}
            onChange={(e) => handleConfigChange('case_sensitive', e.target.checked)}
            disabled={readOnly}
          />
          Case sensitive pattern matching
        </label>
      </div>
    </div>
  );

  const renderEnhancedOCRMonitorConfig = () => (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px',
        }}>
          Patterns to Monitor (one per line)
        </label>
        <textarea
          value={(localData.config?.patterns || []).join('\n')}
          onChange={(e) => handleConfigChange('patterns', e.target.value.split('\n').filter(p => p.trim()))}
          disabled={readOnly}
          rows={4}
          placeholder="Pattern 1&#10;Pattern 2&#10;Pattern 3"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
            resize: 'vertical',
            backgroundColor: readOnly ? '#f9fafb' : '#ffffff',
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px',
        }}>
          Match Mode
        </label>
        <select
          value={localData.config?.match_mode || 'any'}
          onChange={(e) => handleConfigChange('match_mode', e.target.value)}
          disabled={readOnly}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
            backgroundColor: readOnly ? '#f9fafb' : '#ffffff',
          }}
        >
          <option value="any">Any pattern matches</option>
          <option value="all">All patterns must match</option>
          <option value="exact">Exact sequence match</option>
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px',
        }}>
          Confidence Threshold
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={(localData.config?.confidence_threshold || 0.8) * 100}
          onChange={(e) => handleConfigChange('confidence_threshold', parseInt(e.target.value) / 100)}
          disabled={readOnly}
          style={{ width: '100%', marginBottom: '4px' }}
        />
        <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
          {Math.round((localData.config?.confidence_threshold || 0.8) * 100)}%
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px',
        }}>
          Polling Interval (ms)
        </label>
        <input
          type="number"
          value={localData.config?.polling_interval || 2000}
          onChange={(e) => handleConfigChange('polling_interval', parseInt(e.target.value))}
          disabled={readOnly}
          min="100"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
            backgroundColor: readOnly ? '#f9fafb' : '#ffffff',
          }}
        />
      </div>
    </div>
  );

  const renderOCRTextTrackerConfig = () => (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px',
        }}>
          Target Text to Track
        </label>
        <input
          type="text"
          value={localData.config?.target_text || ''}
          onChange={(e) => handleConfigChange('target_text', e.target.value)}
          disabled={readOnly}
          placeholder="Enter text to track changes for"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
            backgroundColor: readOnly ? '#f9fafb' : '#ffffff',
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px',
        }}>
          Confidence Threshold
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={(localData.config?.confidence_threshold || 0.8) * 100}
          onChange={(e) => handleConfigChange('confidence_threshold', parseInt(e.target.value) / 100)}
          disabled={readOnly}
          style={{ width: '100%', marginBottom: '4px' }}
        />
        <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
          {Math.round((localData.config?.confidence_threshold || 0.8) * 100)}%
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px',
        }}>
          Polling Interval (ms)
        </label>
        <input
          type="number"
          value={localData.config?.polling_interval || 500}
          onChange={(e) => handleConfigChange('polling_interval', parseInt(e.target.value))}
          disabled={readOnly}
          min="100"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
            backgroundColor: readOnly ? '#f9fafb' : '#ffffff',
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          color: '#374151',
          cursor: readOnly ? 'default' : 'pointer',
        }}>
          <input
            type="checkbox"
            checked={localData.config?.track_changes || true}
            onChange={(e) => handleConfigChange('track_changes', e.target.checked)}
            disabled={readOnly}
          />
          Track text changes
        </label>
      </div>

      {localData.config?.track_changes && (
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '6px',
          }}>
            Change Threshold (%)
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={localData.config?.change_threshold || 10}
            onChange={(e) => handleConfigChange('change_threshold', parseInt(e.target.value))}
            disabled={readOnly}
            style={{ width: '100%', marginBottom: '4px' }}
          />
          <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
            {localData.config?.change_threshold || 10}%
          </div>
        </div>
      )}
    </div>
  );

  const renderGenericConfig = () => (
    <div style={{ padding: '16px' }}>
      <div style={{
        textAlign: 'center',
        color: '#6b7280',
        fontSize: '14px',
        padding: '20px',
      }}>
        No specific configuration available for this node type.
      </div>
    </div>
  );

  const renderAdvancedTab = () => (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px',
        }}>
          Timeout (seconds)
        </label>
        <input
          type="number"
          value={localData.config?.timeout || 30}
          onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value))}
          disabled={readOnly}
          min="1"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
            backgroundColor: readOnly ? '#f9fafb' : '#ffffff',
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px',
        }}>
          Retry Count
        </label>
        <input
          type="number"
          value={localData.config?.retry_count || 0}
          onChange={(e) => handleConfigChange('retry_count', parseInt(e.target.value))}
          disabled={readOnly}
          min="0"
          max="10"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
            backgroundColor: readOnly ? '#f9fafb' : '#ffffff',
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          color: '#374151',
          cursor: readOnly ? 'default' : 'pointer',
        }}>
          <input
            type="checkbox"
            checked={localData.config?.continue_on_error || false}
            onChange={(e) => handleConfigChange('continue_on_error', e.target.checked)}
            disabled={readOnly}
          />
          Continue workflow on error
        </label>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          color: '#374151',
          cursor: readOnly ? 'default' : 'pointer',
        }}>
          <input
            type="checkbox"
            checked={localData.config?.log_execution || true}
            onChange={(e) => handleConfigChange('log_execution', e.target.checked)}
            disabled={readOnly}
          />
          Log execution details
        </label>
      </div>
    </div>
  );

  const tabs = [
    { id: 'general', label: 'General', icon: '📋' },
    { id: 'config', label: 'Configuration', icon: '⚙️' },
    { id: 'advanced', label: 'Advanced', icon: '🔧' },
  ];

  return (
    <div style={{
      height: '100%',
      backgroundColor: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937',
        }}>
          Node Properties
        </h3>
        <button
          onClick={onClose}
          style={{
            border: 'none',
            background: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            color: '#6b7280',
            padding: '4px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e2e8f0',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              flex: 1,
              padding: '12px 8px',
              border: 'none',
              backgroundColor: activeTab === tab.id ? '#ffffff' : '#f8fafc',
              color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? '500' : '400',
              cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'general' && renderGeneralTab()}
        {activeTab === 'config' && renderConfigTab()}
        {activeTab === 'advanced' && renderAdvancedTab()}
      </div>

      {/* Footer */}
      {!readOnly && (
        <div style={{
          padding: '16px',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
        }}>
          <button
            onClick={() => onDeleteNode(node.id)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ef4444',
              borderRadius: '6px',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#dc2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ef4444';
            }}
          >
            <span>🗑️</span>
            Delete Node
          </button>
        </div>
      )}
    </div>
  );
};

export default PropertyPanel;