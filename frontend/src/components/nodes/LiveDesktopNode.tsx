/**
 * TRAE Live Desktop Node Component - Refactored
 * 
 * A React Flow node that embeds live desktop screen capture with OCR region design
 * Author: TRAE Development Team
 * Version: 3.0.0 - Refactored for better UX and reduced redundancy
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { 
  Monitor, 
  Settings, 
  Play, 
  Pause, 
  Eye, 
  MousePointer, 
  Lock, 
  Unlock, 
  Maximize2, 
  X, 
  Square, 
  Target, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Minus,
  Maximize,
  Trash2, 
  RotateCcw 
} from 'lucide-react';
import LiveDesktopCanvas from '../LiveDesktop';

// ============================================================================
// INTERFACES - Simplified and standardized
// ============================================================================

interface OCRRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  text?: string;
  confidence?: number;
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
  change_detection: boolean;
  change_threshold: number;
}

interface LiveDesktopNodeData {
  label: string;
  config: LiveDesktopConfig;
  ocrRegions: OCRRegion[];
  clickActions: ClickAction[];
  isStreaming: boolean;
  lastScreenshot?: string;
  screenResolution?: { width: number; height: number };
}

type LiveDesktopNodeProps = NodeProps<LiveDesktopNodeData>;

// ============================================================================
// DESIGN MODES - Clear state management
// ============================================================================

type DesignMode = 'none' | 'ocr' | 'click';
type NodeState = 'collapsed' | 'expanded' | 'designer';

// ============================================================================
// LIVE DESKTOP NODE COMPONENT - Refactored
// ============================================================================

export const LiveDesktopNode: React.FC<LiveDesktopNodeProps> = ({
  id,
  data,
  selected
}) => {
  // ============================================================================
  // STATE MANAGEMENT - Simplified and focused
  // ============================================================================

  const nodeRef = useRef<HTMLDivElement>(null);
  
  // Core node states
  const [nodeState, setNodeState] = useState<NodeState>('collapsed');
  const [isNodeLocked, setIsNodeLocked] = useState(false);
  const [designMode, setDesignMode] = useState<DesignMode>('none');
  
  // Configuration and data
  const [localConfig, setLocalConfig] = useState<LiveDesktopConfig>(data.config);
  const [ocrRegions, setOcrRegions] = useState<OCRRegion[]>(data.ocrRegions || []);
  const [clickActions, setClickActions] = useState<ClickAction[]>(data.clickActions || []);
  const [isStreaming, setIsStreaming] = useState(data.isStreaming || false);
  
  // UI states
  const [showSettings, setShowSettings] = useState(false);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const nodeWidth = nodeState === 'collapsed' ? 280 : nodeState === 'expanded' ? 480 : '95vw';
  const nodeHeight = nodeState === 'collapsed' ? 160 : nodeState === 'expanded' ? 360 : '95vh';
  const isDesignerMode = nodeState === 'designer';
  const canDesign = isNodeLocked && nodeState === 'expanded';

  // ============================================================================
  // CORE HANDLERS - Simplified logic
  // ============================================================================

  const handleConfigChange = useCallback((key: keyof LiveDesktopConfig, value: any) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleOCRRegionAdd = useCallback((region: OCRRegion) => {
    setOcrRegions(prev => [...prev, region]);
    
    // Emit standardized event for node connections
    window.dispatchEvent(new CustomEvent('node_data_output', {
      detail: {
        nodeId: id,
        outputPort: 'ocr_result',
        data: region,
        dataType: 'OBJECT'
      }
    }));
  }, [id]);

  const handleClickActionAdd = useCallback((action: ClickAction) => {
    setClickActions(prev => [...prev, action]);
    
    // Emit standardized event for node connections
    window.dispatchEvent(new CustomEvent('node_data_output', {
      detail: {
        nodeId: id,
        outputPort: 'click_action',
        data: action,
        dataType: 'OBJECT'
      }
    }));
  }, [id]);

  const handleScreenChange = useCallback((screenData: any) => {
    // Emit screen change event for connected nodes
    window.dispatchEvent(new CustomEvent('node_data_output', {
      detail: {
        nodeId: id,
        outputPort: 'screen_change',
        data: screenData,
        dataType: 'OBJECT'
      }
    }));
  }, [id]);

  // ============================================================================
  // NODE INTERACTION HANDLERS - Clear and focused
  // ============================================================================

  const toggleNodeLock = useCallback(() => {
    const newLockState = !isNodeLocked;
    setIsNodeLocked(newLockState);
    
    // Reset design mode when unlocking
    if (!newLockState) {
      setDesignMode('none');
    }
    
    // Update node draggability
    if (nodeRef.current) {
      nodeRef.current.style.pointerEvents = newLockState ? 'none' : 'auto';
      // Keep buttons clickable
      const buttons = nodeRef.current.querySelectorAll('button');
      buttons.forEach(btn => {
        btn.style.pointerEvents = 'auto';
      });
    }
  }, [isNodeLocked]);

  const toggleNodeState = useCallback(() => {
    if (nodeState === 'collapsed') {
      setNodeState('expanded');
    } else if (nodeState === 'expanded') {
      setNodeState('collapsed');
      setDesignMode('none'); // Reset design mode when collapsing
    }
  }, [nodeState]);

  const openDesigner = useCallback(() => {
    setNodeState('designer');
    setDesignMode('none'); // Reset design mode in fullscreen
  }, []);

  const closeDesigner = useCallback(() => {
    setNodeState('expanded');
    setDesignMode('none');
  }, []);

  const setOCRDesignMode = useCallback(() => {
    if (canDesign) {
      setDesignMode(designMode === 'ocr' ? 'none' : 'ocr');
      
      // Trigger canvas mode change
      const canvas = document.querySelector(`[data-node-id="${id}"] canvas`) as HTMLCanvasElement;
      if (canvas) {
        canvas.dispatchEvent(new CustomEvent('enableOCRDrawing'));
      }
    }
  }, [canDesign, designMode, id]);

  const setClickDesignMode = useCallback(() => {
    if (canDesign) {
      setDesignMode(designMode === 'click' ? 'none' : 'click');
      
      // Trigger canvas mode change
      const canvas = document.querySelector(`[data-node-id="${id}"] canvas`) as HTMLCanvasElement;
      if (canvas) {
        canvas.dispatchEvent(new CustomEvent('enableClickAction'));
      }
    }
  }, [canDesign, designMode, id]);

  // ============================================================================
  // EFFECTS - Minimal and focused
  // ============================================================================

  useEffect(() => {
    // Update parent data when local state changes
    // This would typically be handled by a context or state management system
    console.log('LiveDesktopNode state updated:', {
      config: localConfig,
      ocrRegions: ocrRegions.length,
      clickActions: clickActions.length
    });
  }, [localConfig, ocrRegions, clickActions]);

  // ============================================================================
  // RENDER COMPONENTS - Modular and clean
  // ============================================================================

  const renderSettings = () => {
    if (!showSettings) return null;

    return (
      <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4">
        <h3 className="text-sm font-semibold mb-3 text-gray-800">Live Desktop Settings</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              FPS: {localConfig.fps}
            </label>
            <input
              type="range"
              min="1"
              max="30"
              value={localConfig.fps}
              onChange={(e) => handleConfigChange('fps', parseInt(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Scale Factor: {Math.round(localConfig.scale_factor * 100)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={localConfig.scale_factor}
              onChange={(e) => handleConfigChange('scale_factor', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Quality: {localConfig.quality}%
            </label>
            <input
              type="range"
              min="10"
              max="100"
              value={localConfig.quality}
              onChange={(e) => handleConfigChange('quality', parseInt(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-700">Auto OCR</label>
            <input
              type="checkbox"
              checked={localConfig.auto_ocr}
              onChange={(e) => handleConfigChange('auto_ocr', e.target.checked)}
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
        </div>
        
        <div className="flex justify-end mt-4">
          <button
            onClick={() => setShowSettings(false)}
            className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  const renderDesignControls = () => {
    if (!canDesign) return null;

    return (
      <div className="absolute bottom-2 left-2 right-2 bg-orange-50 border border-orange-200 rounded-lg p-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-medium text-orange-800">Design Mode Active</span>
          </div>
          <div className="text-xs text-orange-600">
            {ocrRegions.length} OCR • {clickActions.length} Actions
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={setOCRDesignMode}
            className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs rounded transition-colors ${
              designMode === 'ocr' 
                ? 'bg-blue-600 text-white' 
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
            title="Draw OCR Region on Canvas"
          >
            <Eye className="w-3 h-3" />
            OCR Zone
          </button>
          
          <button
            onClick={setClickDesignMode}
            className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs rounded transition-colors ${
              designMode === 'click' 
                ? 'bg-green-600 text-white' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
            title="Add Click Action on Canvas"
          >
            <MousePointer className="w-3 h-3" />
            Click Action
          </button>
        </div>
        
        <div className="text-xs text-orange-600 mt-2 text-center">
          {designMode === 'ocr' && '🎯 Click and drag on the canvas to create OCR regions'}
          {designMode === 'click' && '🎯 Click on the canvas to add click actions'}
          {designMode === 'none' && '💡 Select a tool above to start designing'}
        </div>
      </div>
    );
  };

  const renderFullscreenDesigner = () => {
    if (!isDesignerMode) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 z-[9999] flex items-center justify-center backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl w-[96vw] h-[96vh] flex flex-col overflow-hidden border border-gray-200">
          {/* Enhanced Header with Gradient */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                  <Monitor className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Live Desktop Designer</h2>
                  <p className="text-blue-100 text-sm">{data.label}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                {/* Status Indicators */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2 bg-white bg-opacity-20 px-3 py-1 rounded-full">
                    <Eye className="w-4 h-4" />
                    <span>{ocrRegions.length} OCR</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white bg-opacity-20 px-3 py-1 rounded-full">
                    <MousePointer className="w-4 h-4" />
                    <span>{clickActions.length} Actions</span>
                  </div>
                </div>
                
                <button
                  onClick={closeDesigner}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all duration-200"
                  title="Close Designer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Enhanced Sidebar */}
            <div className="w-96 border-r border-gray-200 bg-gradient-to-b from-gray-50 to-white overflow-y-auto">
              <div className="p-6 space-y-8">
                {/* Design Tools Section */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                    <h3 className="text-lg font-semibold text-gray-800">Design Tools</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={setOCRDesignMode}
                      className={`group relative p-4 border-2 rounded-xl transition-all duration-200 ${
                        designMode === 'ocr'
                          ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-md scale-105'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${designMode === 'ocr' ? 'bg-blue-100' : 'bg-gray-100 group-hover:bg-blue-100'}`}>
                          <Eye className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">OCR Zone</div>
                          <div className="text-xs text-gray-500">Draw text recognition areas</div>
                        </div>
                      </div>
                      {designMode === 'ocr' && (
                        <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      )}
                    </button>
                    
                    <button 
                      onClick={setClickDesignMode}
                      className={`group relative p-4 border-2 rounded-xl transition-all duration-200 ${
                        designMode === 'click'
                          ? 'bg-green-50 border-green-300 text-green-700 shadow-md scale-105'
                          : 'border-gray-200 hover:border-green-300 hover:bg-green-50 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${designMode === 'click' ? 'bg-green-100' : 'bg-gray-100 group-hover:bg-green-100'}`}>
                          <MousePointer className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">Click Action</div>
                          <div className="text-xs text-gray-500">Add interactive click points</div>
                        </div>
                      </div>
                      {designMode === 'click' && (
                        <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      )}
                    </button>
                  </div>
                </div>
                
                {/* OCR Regions Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-gray-800">OCR Regions</h3>
                    </div>
                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium">
                      {ocrRegions.length}
                    </span>
                  </div>
                  
                  <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                    {ocrRegions.map((region, index) => (
                      <div key={region.id} className="group p-4 bg-white border border-blue-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-medium text-blue-800 text-sm">
                            {region.label || `Region ${index + 1}`}
                          </div>
                          <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all">
                            <X className="w-3 h-3 text-red-500" />
                          </button>
                        </div>
                        <div className="text-blue-600 text-xs mb-2 line-clamp-2">
                          {region.text || 'No text detected'}
                        </div>
                        <div className="flex items-center gap-2 text-blue-500 text-xs">
                          <span className="bg-blue-50 px-2 py-1 rounded">
                            {region.x}, {region.y}
                          </span>
                          <span className="bg-blue-50 px-2 py-1 rounded">
                            {region.width}×{region.height}
                          </span>
                        </div>
                      </div>
                    ))}
                    {ocrRegions.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No OCR regions defined</p>
                        <p className="text-xs">Select OCR Zone tool to start</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Click Actions Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-gray-800">Click Actions</h3>
                    </div>
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                      {clickActions.length}
                    </span>
                  </div>
                  
                  <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                    {clickActions.map((action, index) => (
                      <div key={action.id} className="group p-4 bg-white border border-green-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-medium text-green-800 text-sm">
                            {action.label || `Action ${index + 1}`}
                          </div>
                          <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all">
                            <X className="w-3 h-3 text-red-500" />
                          </button>
                        </div>
                        <div className="text-green-600 text-xs mb-2 capitalize">
                          {action.action}
                        </div>
                        <div className="flex items-center gap-2 text-green-500 text-xs">
                          <span className="bg-green-50 px-2 py-1 rounded">
                            {action.x}, {action.y}
                          </span>
                        </div>
                      </div>
                    ))}
                    {clickActions.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <MousePointer className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No click actions defined</p>
                        <p className="text-xs">Select Click Action tool to start</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Enhanced Canvas Area */}
            <div className="flex-1 flex flex-col bg-gray-50">
              {/* Canvas Toolbar */}
              <div className="bg-white border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-medium text-gray-700">Canvas Controls</div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Zoom In">
                        <Plus className="w-4 h-4 text-gray-600" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Zoom Out">
                        <Minus className="w-4 h-4 text-gray-600" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Fit to Screen">
                        <Maximize className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-500">
                      {designMode === 'ocr' && '🎯 Drag to create OCR regions'}
                      {designMode === 'click' && '🎯 Click to add action points'}
                      {designMode === 'none' && '💡 Select a tool to start designing'}
                    </div>
                    <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                    <span className="text-xs text-gray-600">{isStreaming ? 'Live' : 'Offline'}</span>
                  </div>
                </div>
              </div>
              
              {/* Canvas Container */}
              <div className="flex-1 p-6">
                <div className="w-full h-full bg-white rounded-xl border-2 border-gray-200 shadow-inner overflow-hidden relative">
                  <LiveDesktopCanvas
                wsUrl={`${import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8007'}`}
                nodeId={id}
                    embedded={false}
                    width="100%"
                    height="100%"
                    config={localConfig}
                    onOCRRegionAdd={handleOCRRegionAdd}
                    onOCRRegionSelect={handleOCRRegionAdd}
                    onClickActionAdd={handleClickActionAdd}
                    onScreenChange={handleScreenChange}
                    onWebhookTrigger={() => {}}
                  />
                  
                  {/* Canvas Overlay for Design Mode */}
                  {designMode !== 'none' && (
                    <div className="absolute top-4 left-4 bg-white bg-opacity-90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border">
                      <div className="flex items-center gap-2 text-sm">
                        {designMode === 'ocr' && (
                          <>
                            <Eye className="w-4 h-4 text-blue-600" />
                            <span className="text-blue-700 font-medium">OCR Mode Active</span>
                          </>
                        )}
                        {designMode === 'click' && (
                          <>
                            <MousePointer className="w-4 h-4 text-green-600" />
                            <span className="text-green-700 font-medium">Click Mode Active</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Enhanced Footer */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Quick Actions:</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (window.confirm('Clear all OCR regions and click actions?')) {
                        setOcrRegions([]);
                        setClickActions([]);
                      }
                    }}
                    className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-all duration-200 hover:shadow-sm"
                    disabled={ocrRegions.length === 0 && clickActions.length === 0}
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => {/* Export functionality */}}
                    className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition-all duration-200 hover:shadow-sm"
                  >
                    Export Config
                  </button>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={closeDesigner}
                  className="px-6 py-2 text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  Save & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER - Clean and organized
  // ============================================================================

  return (
    <>
      <div 
        ref={nodeRef}
        className={`live-desktop-node bg-white border-2 rounded-xl shadow-lg transition-all duration-300 ${
          selected ? 'border-blue-500 shadow-blue-100' : 'border-gray-300 hover:border-gray-400'
        } ${isNodeLocked ? 'ring-2 ring-blue-400 ring-opacity-50 shadow-blue-200' : ''}`}
        style={{ 
          width: nodeWidth, 
          height: nodeHeight,
          pointerEvents: isNodeLocked ? 'none' : 'auto'
        }}
        data-node-id={id}
      >
        {/* Enhanced Connection Handles */}
        <Handle
          type="target"
          position={Position.Left}
          id="trigger"
          className="w-3 h-3 bg-green-500 border-2 border-white shadow-md hover:scale-110 transition-transform"
        />
        
        <Handle
          type="source"
          position={Position.Right}
          id="screen_change"
          style={{ top: '25%' }}
          className="w-3 h-3 bg-blue-500 border-2 border-white shadow-md hover:scale-110 transition-transform"
        />
        
        <Handle
          type="source"
          position={Position.Right}
          id="ocr_result"
          style={{ top: '45%' }}
          className="w-3 h-3 bg-purple-500 border-2 border-white shadow-md hover:scale-110 transition-transform"
        />
        
        <Handle
          type="source"
          position={Position.Right}
          id="click_action"
          style={{ top: '65%' }}
          className="w-3 h-3 bg-orange-500 border-2 border-white shadow-md hover:scale-110 transition-transform"
        />

        {/* Enhanced Header with Gradient */}
        <div className={`p-4 border-b border-gray-200 bg-gradient-to-r ${
          isNodeLocked ? 'from-blue-50 to-purple-50' : 'from-gray-50 to-white'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isNodeLocked ? 'bg-blue-100' : 'bg-gray-100'}`}>
                <Monitor className={`w-5 h-5 ${isNodeLocked ? 'text-blue-600' : 'text-gray-600'}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">{data.label}</h3>
                <div className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className={isStreaming ? 'text-green-600' : 'text-red-600'}>
                    {isStreaming ? 'Live' : 'Offline'}
                  </span>
                  {isNodeLocked && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="text-blue-600">Design Mode</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Enhanced Lock Button */}
              <button
                onClick={toggleNodeLock}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isNodeLocked 
                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 shadow-md scale-105' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={isNodeLocked ? 'Unlock Node (Enable Dragging)' : 'Lock Node (Enable Design Mode)'}
                style={{ pointerEvents: 'auto' }}
              >
                {isNodeLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </button>
              
              {/* Fullscreen Designer Button */}
              <button
                onClick={openDesigner}
                className="p-2 bg-purple-100 text-purple-600 hover:bg-purple-200 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                title="Open Fullscreen Designer"
                style={{ pointerEvents: 'auto' }}
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              
              {/* Settings Button */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  showSettings
                    ? 'bg-gray-200 text-gray-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Toggle Settings"
                style={{ pointerEvents: 'auto' }}
              >
                <Settings className="w-4 h-4" />
              </button>
              
              {/* Expand/Collapse Button */}
              <button
                onClick={toggleNodeState}
                className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-all duration-200"
                title={nodeState === 'collapsed' ? 'Expand Canvas' : 'Collapse Canvas'}
                style={{ pointerEvents: 'auto' }}
              >
                {nodeState === 'collapsed' ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Design Mode Indicator */}
          {isNodeLocked && (
            <div className="mt-3 p-3 bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-blue-700">Design Mode Active</span>
                <span className="text-xs text-blue-600">• Node dragging disabled • OCR & Click design enabled</span>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Content */}
        <div className="flex-1 p-3 relative">
          {nodeState === 'expanded' ? (
            <div className="relative h-full">
              <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden h-full">
                <LiveDesktopCanvas
                wsUrl={`${import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8007'}`}
                nodeId={id}
                  embedded={true}
                  width={typeof nodeWidth === 'number' ? nodeWidth - 26 : 454}
                  height={typeof nodeHeight === 'number' ? nodeHeight - 120 : 240}
                  config={localConfig}
                  onOCRRegionAdd={handleOCRRegionAdd}
                  onOCRRegionSelect={handleOCRRegionAdd}
                  onClickActionAdd={handleClickActionAdd}
                  onScreenChange={handleScreenChange}
                  onWebhookTrigger={() => {}}
                />
              </div>
              
              {renderDesignControls()}
            </div>
          ) : (
            <div className="h-full">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 p-6 h-full">
                <div className="flex flex-col justify-center items-center text-center h-full space-y-4">
                  <div className="flex justify-center">
                    <div className="p-3 bg-white rounded-full shadow-sm">
                      <Monitor className="w-8 h-8 text-gray-400" />
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Desktop Capture</h4>
                    <p className="text-sm text-gray-500 mb-4">
                      {isStreaming ? 'Streaming live desktop' : 'Desktop stream stopped'}
                    </p>
                    
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                          <Eye className="w-4 h-4" />
                          <span className="font-medium">{ocrRegions.length}</span>
                        </div>
                        <div className="text-gray-500 text-xs">OCR Regions</div>
                      </div>
                      
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                          <MousePointer className="w-4 h-4" />
                          <span className="font-medium">{clickActions.length}</span>
                        </div>
                        <div className="text-gray-500 text-xs">Click Actions</div>
                      </div>
                      
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                          <Target className="w-4 h-4" />
                          <span className="font-medium">{localConfig.fps}</span>
                        </div>
                        <div className="text-gray-500 text-xs">FPS</div>
                      </div>
                    </div>
                  </div>
                  
                  {isNodeLocked && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-center gap-2 text-blue-700">
                        <Lock className="w-4 h-4" />
                        <span className="text-sm font-medium">Expand to design OCR zones</span>
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={() => setNodeState('expanded')}
                    className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    style={{ pointerEvents: 'auto' }}
                  >
                    Expand Canvas
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Status Bar */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">FPS: <span className="font-medium text-gray-800">{localConfig.fps}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-gray-600">Scale: <span className="font-medium text-gray-800">{Math.round(localConfig.scale_factor * 100)}%</span></span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-gray-600">Status: <span className={`font-medium ${isStreaming ? 'text-green-600' : 'text-gray-600'}`}>
                  {isStreaming ? 'Live' : 'Stopped'}
                </span></span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-gray-500">
              <span>{typeof nodeWidth === 'number' ? nodeWidth - 26 : 454}×{typeof nodeHeight === 'number' ? nodeHeight - 120 : 240}</span>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        {renderSettings()}
      </div>
      
      {/* Fullscreen Designer */}
      {renderFullscreenDesigner()}
    </>
  );
};

export default LiveDesktopNode;