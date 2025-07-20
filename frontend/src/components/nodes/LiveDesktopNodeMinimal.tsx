/**
 * TRAE Live Desktop Node - Minimalistic Edition
 * 
 * A clean, single-workflow node that combines all desktop capture functionality
 * Author: TRAE Development Team
 * Version: 4.0.0 - Minimalistic Single Workflow
 */

import React, { useState, useCallback, useRef } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { 
  Monitor, 
  Settings, 
  Eye, 
  MousePointer, 
  Lock, 
  Unlock, 
  ChevronDown, 
  ChevronUp,
  Play,
  Pause,
  Target
} from 'lucide-react';
import LiveDesktopCanvas from '../LiveDesktop';

// ============================================================================
// INTERFACES - Simplified
// ============================================================================

interface OCRRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  text?: string;
}

interface ClickAction {
  id: string;
  x: number;
  y: number;
  label: string;
  action: 'click' | 'double_click' | 'right_click';
}

interface LiveDesktopConfig {
  fps: number;
  scale_factor: number;
  quality: number;
  auto_ocr: boolean;
}

interface LiveDesktopNodeData {
  label: string;
  config: LiveDesktopConfig;
  ocrRegions: OCRRegion[];
  clickActions: ClickAction[];
  isStreaming: boolean;
}

interface LiveDesktopNodeProps extends NodeProps {
  data: LiveDesktopNodeData;
}

// ============================================================================
// MAIN COMPONENT - Single Workflow Design
// ============================================================================

export const LiveDesktopNodeMinimal: React.FC<LiveDesktopNodeProps> = ({
  id,
  data,
  selected
}) => {
  // ============================================================================
  // STATE - Minimal and focused
  // ============================================================================
  
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDesignMode, setIsDesignMode] = useState(false);
  const [designTool, setDesignTool] = useState<'ocr' | 'click' | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isStreaming, setIsStreaming] = useState(data.isStreaming || false);
  const [config, setConfig] = useState<LiveDesktopConfig>(data.config);
  const [ocrRegions, setOcrRegions] = useState<OCRRegion[]>(data.ocrRegions || []);
  const [clickActions, setClickActions] = useState<ClickAction[]>(data.clickActions || []);
  
  // Desktop tracking for relative scaling
  const [realDesktopSize, setRealDesktopSize] = useState({ width: 1920, height: 1080 });
  const [canvasSize] = useState({ width: 1200, height: 900 }); // Fixed canvas size

  // ============================================================================
  // HANDLERS - Streamlined for single workflow
  // ============================================================================

  // Toggle expansion with proper node locking
  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
    if (isExpanded && isDesignMode) {
      // Exit design mode when collapsing
      setIsDesignMode(false);
      setDesignTool(null);
      // Re-enable node dragging
      enableNodeDragging();
    }
  }, [isExpanded, isDesignMode]);

  // Toggle design mode with node locking
  const toggleDesignMode = useCallback(() => {
    const newDesignMode = !isDesignMode;
    setIsDesignMode(newDesignMode);
    
    if (newDesignMode) {
      // Disable node dragging when entering design mode
      disableNodeDragging();
      setDesignTool('ocr'); // Default to OCR tool
      
      // Set a data attribute for CSS targeting
      if (nodeRef.current) {
        nodeRef.current.setAttribute('data-locked', 'true');
      }
    } else {
      // Re-enable node dragging when exiting design mode
      enableNodeDragging();
      setDesignTool(null);
      
      // Remove the data attribute
      if (nodeRef.current) {
        nodeRef.current.removeAttribute('data-locked');
      }
    }
  }, [isDesignMode]);

  // Node dragging control functions
  const { setNodes } = useReactFlow();
  
  const disableNodeDragging = useCallback(() => {
    // Update the node to be non-draggable using React Flow's setNodes
    setNodes((nodes) => 
      nodes.map((node) => 
        node.id === id 
          ? { ...node, draggable: false, selectable: true }
          : node
      )
    );
    
    // Also set the DOM attribute for visual feedback
    if (nodeRef.current) {
      nodeRef.current.style.cursor = 'default';
      nodeRef.current.setAttribute('data-draggable', 'false');
    }
  }, [id, setNodes]);

  const enableNodeDragging = useCallback(() => {
    // Re-enable node dragging using React Flow's setNodes
    setNodes((nodes) => 
      nodes.map((node) => 
        node.id === id 
          ? { ...node, draggable: true, selectable: true }
          : node
      )
    );
    
    // Reset DOM attributes
    if (nodeRef.current) {
      nodeRef.current.style.cursor = '';
      nodeRef.current.setAttribute('data-draggable', 'true');
    }
  }, [id, setNodes]);

  // Track real desktop size for relative scaling
  const updateDesktopSize = useCallback((width: number, height: number) => {
    setRealDesktopSize({ width, height });
  }, []);

  // Calculate relative scale factor
  const getRelativeScale = useCallback(() => {
    const scaleX = canvasSize.width / realDesktopSize.width;
    const scaleY = canvasSize.height / realDesktopSize.height;
    return Math.min(scaleX, scaleY); // Use the smaller scale to maintain aspect ratio
  }, [canvasSize, realDesktopSize]);

  const selectDesignTool = useCallback((tool: 'ocr' | 'click') => {
    const newTool = designTool === tool ? null : tool;
    setDesignTool(newTool);
    
    // Communicate with canvas to enable/disable drawing modes
    const canvas = document.querySelector(`[data-node-id="${id}"] canvas`) as HTMLCanvasElement;
    if (canvas) {
      if (newTool === 'ocr') {
        canvas.dispatchEvent(new CustomEvent('enableOCRDrawing'));
      } else if (newTool === 'click') {
        canvas.dispatchEvent(new CustomEvent('enableClickAction'));
      }
      // Note: When newTool is null, the canvas will handle this through its own state management
    }
  }, [designTool, id]);

  const toggleStreaming = useCallback(() => {
    setIsStreaming(!isStreaming);
  }, [isStreaming]);

  const handleOCRRegionAdd = useCallback((region: OCRRegion) => {
    // Apply relative scaling to OCR region coordinates
    const relativeScale = getRelativeScale();
    const scaledRegion = {
      ...region,
      x: Math.round(region.x / relativeScale),
      y: Math.round(region.y / relativeScale),
      width: Math.round(region.width / relativeScale),
      height: Math.round(region.height / relativeScale)
    };
    
    setOcrRegions(prev => [...prev, scaledRegion]);
    
    // Emit event for node connections
    window.dispatchEvent(new CustomEvent('node_data_output', {
      detail: {
        nodeId: id,
        outputPort: 'ocr_result',
        data: scaledRegion,
        dataType: 'OBJECT'
      }
    }));
  }, [id, getRelativeScale]);

  const handleClickActionAdd = useCallback((action: ClickAction) => {
    // Apply relative scaling to click action coordinates
    const relativeScale = getRelativeScale();
    const scaledAction = {
      ...action,
      x: Math.round(action.x / relativeScale),
      y: Math.round(action.y / relativeScale)
    };
    
    setClickActions(prev => [...prev, scaledAction]);
    
    // Emit event for node connections
    window.dispatchEvent(new CustomEvent('node_data_output', {
      detail: {
        nodeId: id,
        outputPort: 'click_action',
        data: scaledAction,
        dataType: 'OBJECT'
      }
    }));
  }, [id, getRelativeScale]);

  const handleScreenChange = useCallback((screenData: any) => {
    // Update real desktop size when screen data is received
    if (screenData.width && screenData.height) {
      updateDesktopSize(screenData.width, screenData.height);
    }
    
    // Emit screen change event
    window.dispatchEvent(new CustomEvent('node_data_output', {
      detail: {
        nodeId: id,
        outputPort: 'screen_change',
        data: screenData,
        dataType: 'OBJECT'
      }
    }));
  }, [id, updateDesktopSize]);

  // ============================================================================
  // RENDER - Single Clean Workflow
  // ============================================================================

  // Updated dimensions to properly accommodate 1200x900 canvas
  const nodeWidth = isExpanded ? 1240 : 280;  // 1200 + 40px padding
  const nodeHeight = isExpanded ? 1000 : 120; // 900 + 100px for header and controls

  return (
    <>
      <div 
        ref={nodeRef}
        className={`bg-white border-2 rounded-lg shadow-lg transition-all duration-300 ${
          selected ? 'border-blue-500 shadow-blue-200' : 'border-gray-300'
        } ${isDesignMode ? 'ring-2 ring-orange-400 ring-opacity-50' : ''}`}
        style={{ 
          width: nodeWidth, 
          height: nodeHeight
        }}
        data-draggable={!isDesignMode}
      >
        {/* Connection Handles */}
        <Handle
          type="target"
          position={Position.Left}
          id="trigger"
          className="w-3 h-3 bg-green-500 border-2 border-white"
        />
        
        <Handle
          type="source"
          position={Position.Right}
          id="screen_change"
          style={{ top: '30%' }}
          className="w-3 h-3 bg-blue-500 border-2 border-white"
        />
        
        <Handle
          type="source"
          position={Position.Right}
          id="ocr_result"
          style={{ top: '50%' }}
          className="w-3 h-3 bg-purple-500 border-2 border-white"
        />
        
        <Handle
          type="source"
          position={Position.Right}
          id="click_action"
          style={{ top: '70%' }}
          className="w-3 h-3 bg-orange-500 border-2 border-white"
        />

        {/* Header */}
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-800">{data.label}</span>
              <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
            
            <div className="flex items-center gap-1">
              {/* Streaming Toggle */}
              <button
                onClick={toggleStreaming}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title={isStreaming ? 'Stop Stream' : 'Start Stream'}
                style={{ pointerEvents: 'auto' }}
              >
                {isStreaming ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
              
              {/* Settings */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Settings"
                style={{ pointerEvents: 'auto' }}
              >
                <Settings className="w-3 h-3" />
              </button>
              
              {/* Design Mode Toggle */}
              {isExpanded && (
                <button
                  onClick={toggleDesignMode}
                  className={`p-1 rounded transition-colors ${
                    isDesignMode ? 'bg-orange-100 text-orange-600' : 'hover:bg-gray-200'
                  }`}
                  title={isDesignMode ? 'Exit Design Mode' : 'Enter Design Mode'}
                  style={{ pointerEvents: 'auto' }}
                >
                  {isDesignMode ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                </button>
              )}
              
              {/* Expand/Collapse */}
              <button
                onClick={toggleExpanded}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title={isExpanded ? 'Collapse' : 'Expand'}
                style={{ pointerEvents: 'auto' }}
              >
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {isExpanded ? (
          <div className="p-3 h-full overflow-auto">
            {/* Design Tools Bar */}
            {isDesignMode && (
              <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-orange-800">Design Tools</span>
                  <span className="text-xs text-orange-600">
                    {ocrRegions.length} OCR • {clickActions.length} Actions
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => selectDesignTool('ocr')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      designTool === 'ocr' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white border border-blue-200 text-blue-600 hover:bg-blue-50'
                    }`}
                    style={{ pointerEvents: 'auto' }}
                  >
                    <Eye className="w-3 h-3 inline mr-1" />
                    OCR Region
                  </button>
                  <button
                    onClick={() => selectDesignTool('click')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      designTool === 'click' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-white border border-green-200 text-green-600 hover:bg-green-50'
                    }`}
                    style={{ pointerEvents: 'auto' }}
                  >
                    <MousePointer className="w-3 h-3 inline mr-1" />
                    Click Action
                  </button>
                </div>
              </div>
            )}

            {/* Canvas Container - Full 1200x900 display */}
            <div 
              className="relative bg-gray-100 rounded border overflow-hidden"
              style={{ 
                width: '1200px',
                height: '900px',
                maxWidth: '100%'
              }}
            >
              <LiveDesktopCanvas
                wsUrl={`${import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8007'}`}
                nodeId={id}
                embedded={true}
                width={canvasSize.width}
                height={canvasSize.height}
                config={{
                  fps: config.fps,
                  scale_factor: config.scale_factor,
                  quality: config.quality,
                  auto_ocr: config.auto_ocr,
                  change_detection: false,
                  change_threshold: 0.1
                }}
                onOCRRegionAdd={handleOCRRegionAdd}
                onClickActionAdd={handleClickActionAdd}
                onScreenChange={handleScreenChange}
              />
              
              {/* Design Mode Indicator */}
              {designTool && (
                <div className="absolute top-2 left-2 bg-white bg-opacity-90 px-2 py-1 rounded text-xs">
                  {designTool === 'ocr' && (
                    <span className="text-blue-600">🎯 Draw OCR regions</span>
                  )}
                  {designTool === 'click' && (
                    <span className="text-green-600">🎯 Click to add actions</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Collapsed View
          <div className="p-3">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>{isStreaming ? 'Streaming' : 'Offline'}</span>
              <span>{ocrRegions.length + clickActions.length} regions</span>
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-3">
            <h4 className="text-sm font-medium mb-3">Settings</h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  FPS: {config.fps}
                </label>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={config.fps}
                  onChange={(e) => setConfig(prev => ({ ...prev, fps: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Scale: {Math.round(config.scale_factor * 100)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={config.scale_factor}
                  onChange={(e) => setConfig(prev => ({ ...prev, scale_factor: parseFloat(e.target.value) }))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Quality: {config.quality}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={config.quality}
                  onChange={(e) => setConfig(prev => ({ ...prev, quality: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto-ocr"
                  checked={config.auto_ocr}
                  onChange={(e) => setConfig(prev => ({ ...prev, auto_ocr: e.target.checked }))}
                />
                <label htmlFor="auto-ocr" className="text-xs text-gray-600">Auto OCR</label>
              </div>
            </div>
            
            <button
              onClick={() => setShowSettings(false)}
              className="mt-3 w-full px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default LiveDesktopNodeMinimal;