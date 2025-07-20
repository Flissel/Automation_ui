/**
 * TRAE Snapshot Designer Node Component
 * 
 * Interactive snapshot-based OCR zone and click action designer
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { 
  Camera, Settings, Play, Pause, Eye, MousePointer, 
  Plus, Trash2, Edit3, Save, Download, Upload,
  Grid, Target, Crosshair, Move, RotateCcw
} from 'lucide-react';

// ============================================================================
// INTERFACES
// ============================================================================

interface OCRZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  language: string;
  confidence_threshold: number;
  preprocessing: {
    grayscale: boolean;
    threshold: boolean;
    denoise: boolean;
    scale_factor: number;
  };
  text?: string;
  confidence?: number;
  isSelected?: boolean;
}

interface ClickAction {
  id: string;
  x: number;
  y: number;
  label: string;
  action: 'left' | 'right' | 'double' | 'middle';
  wait_before: number;
  wait_after: number;
  retry_count: number;
  timeout: number;
  isSelected?: boolean;
}

interface SnapshotDesignerData {
  label: string;
  snapshot_image?: string;
  snapshot_metadata?: {
    timestamp: string;
    resolution: { width: number; height: number };
    monitor_index: number;
  };
  ocr_zones: OCRZone[];
  click_actions: ClickAction[];
  config: {
    grid_snap: boolean;
    grid_size: number;
    show_coordinates: boolean;
    show_confidence: boolean;
    default_zone_size: { width: number; height: number };
    default_language: string;
    default_confidence_threshold: number;
  };
}

type SnapshotDesignerNodeProps = NodeProps<SnapshotDesignerData> & {
  type?: string;
};

// ============================================================================
// SNAPSHOT DESIGNER NODE COMPONENT
// ============================================================================

export const SnapshotDesignerNode: React.FC<SnapshotDesignerNodeProps> = ({
  id,
  data,
  selected,
  type
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Get the appropriate title based on node type
  const getNodeTitle = () => {
    switch (type) {
      case 'snapshot_creator':
        return 'Snapshot Creator';
      case 'ocr_zone_designer':
        return 'OCR Zone Designer';
      case 'click_zone_designer':
        return 'Click Zone Designer';
      default:
        return 'Snapshot Designer';
    }
  };

  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [designMode, setDesignMode] = useState<'ocr' | 'click' | 'view'>('view');
  const [ocrZones, setOcrZones] = useState<OCRZone[]>(data.ocr_zones || []);
  const [clickActions, setClickActions] = useState<ClickAction[]>(data.click_actions || []);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [newZone, setNewZone] = useState<Partial<OCRZone> | null>(null);
  const [showZoneEditor, setShowZoneEditor] = useState(false);
  const [showActionEditor, setShowActionEditor] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (designMode === 'view') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicking on existing zone/action
    if (designMode === 'ocr') {
      const clickedZone = ocrZones.find(zone => 
        x >= zone.x && x <= zone.x + zone.width &&
        y >= zone.y && y <= zone.y + zone.height
      );
      
      if (clickedZone) {
        setSelectedZone(clickedZone.id);
        return;
      }
    }
    
    if (designMode === 'click') {
      const clickedAction = clickActions.find(action => 
        Math.abs(x - action.x) <= 10 && Math.abs(y - action.y) <= 10
      );
      
      if (clickedAction) {
        setSelectedAction(clickedAction.id);
        return;
      }
    }
    
    // Start creating new zone/action
    setIsDragging(true);
    setDragStart({ x, y });
    
    if (designMode === 'ocr') {
      const newId = `zone_${Date.now()}`;
      setNewZone({
        id: newId,
        x: data.config.grid_snap ? Math.round(x / data.config.grid_size) * data.config.grid_size : x,
        y: data.config.grid_snap ? Math.round(y / data.config.grid_size) * data.config.grid_size : y,
        width: 0,
        height: 0,
        label: `Zone ${ocrZones.length + 1}`,
        language: data.config.default_language,
        confidence_threshold: data.config.default_confidence_threshold,
        preprocessing: {
          grayscale: true,
          threshold: false,
          denoise: false,
          scale_factor: 1.0
        }
      });
    }
  }, [designMode, ocrZones, clickActions, data.config]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStart || designMode === 'view') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (designMode === 'ocr' && newZone) {
      const width = Math.abs(x - dragStart.x);
      const height = Math.abs(y - dragStart.y);
      const finalX = Math.min(x, dragStart.x);
      const finalY = Math.min(y, dragStart.y);
      
      setNewZone(prev => prev ? {
        ...prev,
        x: data.config.grid_snap ? Math.round(finalX / data.config.grid_size) * data.config.grid_size : finalX,
        y: data.config.grid_snap ? Math.round(finalY / data.config.grid_size) * data.config.grid_size : finalY,
        width: data.config.grid_snap ? Math.round(width / data.config.grid_size) * data.config.grid_size : width,
        height: data.config.grid_snap ? Math.round(height / data.config.grid_size) * data.config.grid_size : height
      } : null);
    }
  }, [isDragging, dragStart, designMode, newZone, data.config]);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || designMode === 'view') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (designMode === 'ocr' && newZone && newZone.width && newZone.height) {
      if (newZone.width > 10 && newZone.height > 10) {
        setOcrZones(prev => [...prev, newZone as OCRZone]);
        setSelectedZone(newZone.id!);
        setShowZoneEditor(true);
      }
    } else if (designMode === 'click') {
      const newAction: ClickAction = {
        id: `action_${Date.now()}`,
        x: data.config.grid_snap ? Math.round(x / data.config.grid_size) * data.config.grid_size : x,
        y: data.config.grid_snap ? Math.round(y / data.config.grid_size) * data.config.grid_size : y,
        label: `Click ${clickActions.length + 1}`,
        action: 'left',
        wait_before: 0,
        wait_after: 500,
        retry_count: 3,
        timeout: 5000
      };
      
      setClickActions(prev => [...prev, newAction]);
      setSelectedAction(newAction.id);
      setShowActionEditor(true);
    }
    
    setIsDragging(false);
    setDragStart(null);
    setNewZone(null);
  }, [isDragging, designMode, newZone, clickActions, data.config]);

  const handleDeleteZone = useCallback((zoneId: string) => {
    setOcrZones(prev => prev.filter(zone => zone.id !== zoneId));
    if (selectedZone === zoneId) {
      setSelectedZone(null);
      setShowZoneEditor(false);
    }
  }, [selectedZone]);

  const handleDeleteAction = useCallback((actionId: string) => {
    setClickActions(prev => prev.filter(action => action.id !== actionId));
    if (selectedAction === actionId) {
      setSelectedAction(null);
      setShowActionEditor(false);
    }
  }, [selectedAction]);

  const handleCreateSnapshot = useCallback(async () => {
    console.log('DEBUG: handleCreateSnapshot called');
    try {
      // Call API to create snapshot from live desktop
      console.log('DEBUG: Making API call to /api/snapshots/create');
      const response = await fetch('/api/snapshots/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monitor_index: 0,
          include_metadata: true,
          format: 'png'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        // Update node data with new snapshot
        console.log('Snapshot created:', result);
      }
    } catch (error) {
      console.error('Failed to create snapshot:', error);
    }
  }, []);

  const handleSaveTemplate = useCallback(async () => {
    const template = {
      name: `Template_${Date.now()}`,
      snapshot_metadata: data.snapshot_metadata,
      ocr_zones: ocrZones,
      click_actions: clickActions,
      created_at: new Date().toISOString()
    };
    
    try {
      const response = await fetch('/api/snapshots/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      });
      
      if (response.ok) {
        console.log('Template saved successfully');
      }
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  }, [data.snapshot_metadata, ocrZones, clickActions]);

  // ============================================================================
  // CANVAS RENDERING
  // ============================================================================

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.snapshot_image) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw snapshot image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Draw grid if enabled
      if (data.config.grid_snap) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        
        for (let x = 0; x < canvas.width; x += data.config.grid_size) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        
        for (let y = 0; y < canvas.height; y += data.config.grid_size) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
      }
      
      // Draw OCR zones
      ocrZones.forEach(zone => {
        ctx.strokeStyle = zone.id === selectedZone ? '#3b82f6' : '#10b981';
        ctx.fillStyle = zone.id === selectedZone ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)';
        ctx.lineWidth = 2;
        
        ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
        ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
        
        // Draw zone label
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.fillText(zone.label, zone.x + 4, zone.y + 16);
        
        if (data.config.show_coordinates) {
          ctx.fillText(`(${zone.x}, ${zone.y})`, zone.x + 4, zone.y + zone.height - 4);
        }
        
        if (data.config.show_confidence && zone.confidence) {
          ctx.fillText(`${Math.round(zone.confidence * 100)}%`, zone.x + zone.width - 40, zone.y + 16);
        }
      });
      
      // Draw new zone being created
      if (newZone && newZone.width && newZone.height) {
        ctx.strokeStyle = '#8b5cf6';
        ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        ctx.fillRect(newZone.x!, newZone.y!, newZone.width, newZone.height);
        ctx.strokeRect(newZone.x!, newZone.y!, newZone.width, newZone.height);
        
        ctx.setLineDash([]);
      }
      
      // Draw click actions
      clickActions.forEach(action => {
        const isSelected = action.id === selectedAction;
        ctx.fillStyle = isSelected ? '#ef4444' : '#f59e0b';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        
        // Draw click indicator
        ctx.beginPath();
        ctx.arc(action.x, action.y, isSelected ? 12 : 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Draw action label
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.fillText(action.label, action.x + 15, action.y + 4);
        
        if (data.config.show_coordinates) {
          ctx.fillText(`(${action.x}, ${action.y})`, action.x + 15, action.y + 16);
        }
      });
    };
    
    img.src = data.snapshot_image;
  }, [data.snapshot_image, data.config, ocrZones, clickActions, selectedZone, selectedAction, newZone]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderToolbar = () => (
    <div className="flex items-center gap-2 p-2 bg-gray-50 border-b">
      <button
        onClick={handleCreateSnapshot}
        className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        <Camera size={12} />
        Snapshot
      </button>
      
      <div className="flex items-center gap-1 border-l pl-2">
        <button
          onClick={() => setDesignMode('view')}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
            designMode === 'view' ? 'bg-gray-200' : 'hover:bg-gray-100'
          }`}
        >
          <Eye size={12} />
          View
        </button>
        
        <button
          onClick={() => setDesignMode('ocr')}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
            designMode === 'ocr' ? 'bg-green-200' : 'hover:bg-gray-100'
          }`}
        >
          <Target size={12} />
          OCR
        </button>
        
        <button
          onClick={() => setDesignMode('click')}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
            designMode === 'click' ? 'bg-yellow-200' : 'hover:bg-gray-100'
          }`}
        >
          <Crosshair size={12} />
          Click
        </button>
      </div>
      
      <div className="flex items-center gap-1 border-l pl-2">
        <button
          onClick={handleSaveTemplate}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          <Save size={12} />
          Save
        </button>
        
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-gray-100 rounded"
        >
          <Settings size={12} />
        </button>
      </div>
    </div>
  );

  const renderCanvas = () => (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={data.snapshot_metadata?.resolution.width || 800}
        height={data.snapshot_metadata?.resolution.height || 600}
        className="border cursor-crosshair"
        style={{ maxWidth: '100%', maxHeight: '400px' }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
      />
      
      {designMode !== 'view' && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
          {designMode === 'ocr' ? 'Drag to create OCR zone' : 'Click to add click action'}
        </div>
      )}
    </div>
  );

  const renderZonesList = () => (
    <div className="p-2 border-t">
      <div className="text-xs font-semibold mb-2">OCR Zones ({ocrZones.length})</div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {ocrZones.map(zone => (
          <div
            key={zone.id}
            className={`flex items-center justify-between p-1 text-xs rounded ${
              zone.id === selectedZone ? 'bg-blue-100' : 'bg-gray-50'
            }`}
          >
            <span className="truncate">{zone.label}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setSelectedZone(zone.id);
                  setShowZoneEditor(true);
                }}
                className="text-blue-500 hover:text-blue-700"
              >
                <Edit3 size={10} />
              </button>
              <button
                onClick={() => handleDeleteZone(zone.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderActionsList = () => (
    <div className="p-2 border-t">
      <div className="text-xs font-semibold mb-2">Click Actions ({clickActions.length})</div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {clickActions.map(action => (
          <div
            key={action.id}
            className={`flex items-center justify-between p-1 text-xs rounded ${
              action.id === selectedAction ? 'bg-yellow-100' : 'bg-gray-50'
            }`}
          >
            <span className="truncate">{action.label}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setSelectedAction(action.id);
                  setShowActionEditor(true);
                }}
                className="text-blue-500 hover:text-blue-700"
              >
                <Edit3 size={10} />
              </button>
              <button
                onClick={() => handleDeleteAction(action.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  const nodeStyle: React.CSSProperties = {
    background: '#ffffff',
    border: `2px solid ${selected ? '#3b82f6' : '#8b5cf6'}`,
    borderRadius: '8px',
    minWidth: isExpanded ? '600px' : '200px',
    maxWidth: isExpanded ? '800px' : '200px',
    boxShadow: selected 
      ? '0 4px 12px rgba(59, 130, 246, 0.3)'
      : '0 2px 8px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease',
  };

  return (
    <div ref={containerRef} style={nodeStyle}>
      {/* Input/Output Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="snapshot_input"
        style={{ top: '20px', backgroundColor: '#8b5cf6' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="live_desktop_input"
        style={{ top: '40px', backgroundColor: '#3b82f6' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="zones_output"
        style={{ top: '20px', backgroundColor: '#10b981' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="template_output"
        style={{ top: '40px', backgroundColor: '#6366f1' }}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Camera className="text-purple-600" size={16} />
          <span className="font-semibold text-sm">{getNodeTitle()}</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-500 hover:text-gray-700"
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="w-full">
          {renderToolbar()}
          
          {data.snapshot_image ? (
            <>
              {renderCanvas()}
              {renderZonesList()}
              {renderActionsList()}
            </>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Camera size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No snapshot available</p>
              <p className="text-xs">Create a snapshot to start designing zones</p>
            </div>
          )}
        </div>
      )}
      
      {/* Compact View */}
      {!isExpanded && (
        <div className="p-3">
          <div className="text-xs text-gray-600 mb-1">{getNodeTitle()}</div>
          <div className="text-xs text-gray-500">
            {ocrZones.length} OCR zones, {clickActions.length} click actions
          </div>
          {data.snapshot_metadata && (
            <div className="text-xs text-gray-400 mt-1">
              {data.snapshot_metadata.resolution.width}×{data.snapshot_metadata.resolution.height}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SnapshotDesignerNode;