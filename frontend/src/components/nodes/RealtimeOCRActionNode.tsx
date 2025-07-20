/**
 * TRAE Real-time OCR Action Node Component
 * 
 * A React Flow node for continuous text recognition from Live Desktop regions
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Eye, Play, Pause, Settings, Zap, Clock, Target } from 'lucide-react';
import api from '../../services/api';

// ============================================================================
// INTERFACES
// ============================================================================

interface RealtimeOCRActionNodeData {
  label: string;
  config: {
    monitoring_interval: number;
    interval_unit: 'seconds' | 'minutes';
    language: string;
    confidence_threshold: number;
    similarity_threshold: number;
    auto_start: boolean;
    region: { x: number; y: number; width: number; height: number };
    webhook_enabled: boolean;
    webhook_url: string;
    change_detection: boolean;
    preprocessing: {
      grayscale: boolean;
      threshold: boolean;
      denoise: boolean;
    };
  };
  isMonitoring: boolean;
  currentText?: string;
  lastConfidence?: number;
  textChangeCount?: number;
  lastUpdate?: string;
}

type RealtimeOCRActionNodeProps = NodeProps<RealtimeOCRActionNodeData>;

// ============================================================================
// REAL-TIME OCR ACTION NODE COMPONENT
// ============================================================================

export const RealtimeOCRActionNode: React.FC<RealtimeOCRActionNodeProps> = ({
  id,
  data,
  selected
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [showSettings, setShowSettings] = useState(false);
  const [localConfig, setLocalConfig] = useState(() => {
    // Default configuration
    const defaultConfig = {
      monitoring_interval: 5,
      interval_unit: 'seconds' as 'seconds' | 'minutes',
      language: 'eng',
      confidence_threshold: 0.7,
      similarity_threshold: 0.8,
      auto_start: false,
      region: { x: 0, y: 0, width: 100, height: 100 },
      webhook_enabled: false,
      webhook_url: '',
      change_detection: true,
      preprocessing: {
        grayscale: false,
        threshold: false,
        denoise: false
      }
    };
    
    // Merge with data.config, ensuring critical properties have fallback values
    const mergedConfig = {
      ...defaultConfig,
      ...data.config
    };
    
    // Ensure these critical properties always have valid values
    return {
      ...mergedConfig,
      interval_unit: mergedConfig.interval_unit || defaultConfig.interval_unit,
      monitoring_interval: mergedConfig.monitoring_interval || defaultConfig.monitoring_interval,
      language: mergedConfig.language || defaultConfig.language
    };
  });
  const [isMonitoring, setIsMonitoring] = useState(data.isMonitoring || false);
  const [currentText, setCurrentText] = useState(data.currentText || '');
  const [lastConfidence, setLastConfidence] = useState(data.lastConfidence || 0);
  const [textChangeCount, setTextChangeCount] = useState(data.textChangeCount || 0);
  const [lastUpdate, setLastUpdate] = useState(data.lastUpdate || '');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connected' | 'monitoring'>('disconnected');
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleConfigChange = useCallback((key: string, value: any) => {
    setLocalConfig(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const startMonitoring = useCallback(async () => {
    try {
      // Start OCR monitoring via API
      const response = await api.ocr.startMonitoring(
        {
          ...localConfig.region,
          name: `ocr_region_${id}`
        },
        {
          webhook_url: localConfig.webhook_enabled ? localConfig.webhook_url : undefined,
          monitoring_interval: localConfig.interval_unit === 'minutes' 
            ? localConfig.monitoring_interval * 60 
            : localConfig.monitoring_interval,
          similarity_threshold: localConfig.similarity_threshold,
          enabled: true
        }
      );

      if (response.success) {
        setIsMonitoring(true);
        setConnectionStatus('monitoring');
        console.log('OCR monitoring started for node:', id);
        
        // Start local polling for updates
        startLocalPolling();
      } else {
        console.error('Failed to start OCR monitoring:', response.error);
      }
    } catch (error) {
      console.error('Error starting OCR monitoring:', error);
    }
  }, [id, localConfig]);

  const stopMonitoring = useCallback(async () => {
    try {
      // Stop OCR monitoring via API
      const response = await api.ocr.stopMonitoring();

      if (response.success) {
        setIsMonitoring(false);
        setConnectionStatus('connected');
        console.log('OCR monitoring stopped for node:', id);
        
        // Stop local polling
        stopLocalPolling();
      } else {
        console.error('Failed to stop OCR monitoring:', response.error);
      }
    } catch (error) {
      console.error('Error stopping OCR monitoring:', error);
    }
  }, [id]);

  const startLocalPolling = useCallback(() => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
    }

    const pollInterval = localConfig.interval_unit === 'minutes' 
      ? localConfig.monitoring_interval * 60 * 1000
      : localConfig.monitoring_interval * 1000;

    monitoringIntervalRef.current = setInterval(async () => {
      try {
        // Get monitoring status and results
        const response = await api.ocr.getMonitoringStatus();
        if (response.success && response.data) {
          const statusData = response.data;
          
          // Update local state with monitoring results
          if (statusData.current_text !== currentText) {
            setCurrentText(statusData.current_text || '');
            setTextChangeCount(prev => prev + 1);
          }
          
          setLastConfidence(statusData.confidence || 0);
          setLastUpdate(new Date().toLocaleTimeString());
        }
      } catch (error) {
        console.error('Error polling OCR status:', error);
      }
    }, pollInterval);
  }, [localConfig, currentText]);

  const stopLocalPolling = useCallback(() => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }
  }, []);

  const toggleSettings = useCallback(() => {
    setShowSettings(prev => !prev);
  }, []);

  const toggleMonitoring = useCallback(() => {
    if (isMonitoring) {
      stopMonitoring();
    } else {
      startMonitoring();
    }
  }, [isMonitoring, startMonitoring, stopMonitoring]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      stopLocalPolling();
    };
  }, [stopLocalPolling]);

  useEffect(() => {
    // Auto-start monitoring if configured (delayed to avoid render issues)
    if (localConfig.auto_start && !isMonitoring) {
      const timer = setTimeout(() => {
        startMonitoring();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [localConfig.auto_start, isMonitoring, startMonitoring]);

  useEffect(() => {
    // Update polling interval when config changes
    if (isMonitoring) {
      startLocalPolling();
    }
  }, [localConfig.monitoring_interval, localConfig.interval_unit, isMonitoring, startLocalPolling]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderSettings = () => {
    if (!showSettings) return null;

    return (
      <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4">
        <h3 className="text-sm font-semibold mb-3">Real-time OCR Settings</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Monitoring Interval: {localConfig.monitoring_interval} {localConfig.interval_unit}
            </label>
            <input
              type="range"
              min="1"
              max={localConfig.interval_unit === 'minutes' ? 60 : 300}
              value={localConfig.monitoring_interval}
              onChange={(e) => handleConfigChange('monitoring_interval', parseInt(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Interval Unit</label>
            <select
              value={localConfig.interval_unit}
              onChange={(e) => handleConfigChange('interval_unit', e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
            >
              <option value="seconds">Seconds</option>
              <option value="minutes">Minutes</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Language</label>
            <select
              value={localConfig.language}
              onChange={(e) => handleConfigChange('language', e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
            >
              <option value="eng">English</option>
              <option value="deu">German</option>
              <option value="eng+deu">English + German</option>
              <option value="spa">Spanish</option>
              <option value="fra">French</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Confidence Threshold: {Math.round(localConfig.confidence_threshold * 100)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={localConfig.confidence_threshold}
              onChange={(e) => handleConfigChange('confidence_threshold', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-700">Auto Start</label>
            <input
              type="checkbox"
              checked={localConfig.auto_start}
              onChange={(e) => handleConfigChange('auto_start', e.target.checked)}
              className="rounded"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-700">Change Detection</label>
            <input
              type="checkbox"
              checked={localConfig.change_detection}
              onChange={(e) => handleConfigChange('change_detection', e.target.checked)}
              className="rounded"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-700">Enable Webhook</label>
            <input
              type="checkbox"
              checked={localConfig.webhook_enabled}
              onChange={(e) => handleConfigChange('webhook_enabled', e.target.checked)}
              className="rounded"
            />
          </div>
          
          {localConfig.webhook_enabled && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Webhook URL</label>
              <input
                type="text"
                value={localConfig.webhook_url}
                onChange={(e) => handleConfigChange('webhook_url', e.target.value)}
                placeholder="https://your-webhook-url.com"
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
              />
            </div>
          )}
        </div>
        
        <div className="flex justify-end mt-4">
          <button
            onClick={toggleSettings}
            className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'monitoring': return 'bg-green-500';
      case 'connected': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'monitoring': return 'Monitoring';
      case 'connected': return 'Connected';
      default: return 'Disconnected';
    }
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div 
      className={`realtime-ocr-action-node bg-white border-2 rounded-lg shadow-lg ${
        selected ? 'border-purple-500' : 'border-gray-300'
      }`}
      style={{ width: 280, minHeight: 180 }}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="live_desktop_input"
        style={{ top: '30%' }}
        className="w-3 h-3 bg-blue-500"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="region_input"
        style={{ top: '70%' }}
        className="w-3 h-3 bg-orange-500"
      />
      
      {/* Output Handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="text_output"
        style={{ top: '25%' }}
        className="w-3 h-3 bg-green-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="text_changed"
        style={{ top: '45%' }}
        className="w-3 h-3 bg-red-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="confidence_output"
        style={{ top: '65%' }}
        className="w-3 h-3 bg-yellow-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="region_data"
        style={{ top: '85%' }}
        className="w-3 h-3 bg-purple-500"
      />

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-purple-600" />
          <span className="font-semibold text-sm">{data.label}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={toggleSettings}
            className="p-1 hover:bg-gray-100 rounded"
            title="Settings"
          >
            <Settings className="w-4 h-4 text-gray-600" />
          </button>
          
          <button
            onClick={toggleMonitoring}
            className={`p-1 hover:bg-gray-100 rounded ${
              isMonitoring ? 'text-red-600' : 'text-green-600'
            }`}
            title={isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          >
            {isMonitoring ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="space-y-2">
          {/* Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
              <span className="text-xs text-gray-600">{getStatusText()}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>{localConfig.monitoring_interval}{localConfig.interval_unit?.charAt(0) || 's'}</span>
            </div>
          </div>
          
          {/* Current Text */}
          <div className="bg-gray-50 rounded p-2 min-h-[40px]">
            <div className="text-xs text-gray-500 mb-1">Detected Text:</div>
            <div className="text-sm font-mono text-gray-800 break-words">
              {currentText || 'No text detected'}
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              <span>Conf: {Math.round(lastConfidence * 100)}%</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>Changes: {textChangeCount}</span>
            </div>
          </div>
          
          {lastUpdate && (
            <div className="text-xs text-gray-400 text-center">
              Last update: {lastUpdate}
            </div>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {renderSettings()}
    </div>
  );
};

export default RealtimeOCRActionNode;