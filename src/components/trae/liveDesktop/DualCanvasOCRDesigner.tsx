/**
 * Dual Canvas OCR Designer for Live Desktop
 * Interactive dual-canvas workflow designer with OCR capabilities
 * Optimized for TRAE autonomous programming project
 * Author: TRAE Development Team
 * Version: 2.1.0
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trash2, 
  Eye, 
  EyeOff, 
  Target, 
  Save, 
  Settings, 
  Play, 
  Square, 
  Wifi, 
  WifiOff,
  Monitor,
  Grid,
  Plus,
  Download,
  Upload
} from 'lucide-react';
import { OCRRegion, LiveDesktopConfig } from '@/types/liveDesktop';
import { useToast } from '@/hooks/use-toast';

/**
 * Props interface for DualCanvasOCRDesigner component
 * Follows TRAE naming conventions and coding standards
 */
interface DualCanvasOCRDesignerProps {
  /** OCR configuration object */
  ocrConfig?: any;
  /** Function to update OCR configuration */
  setOcrConfig?: (config: any) => void;
  /** Primary monitor stream URL */
  primaryStreamUrl?: string | null;
  /** Secondary monitor stream URL */
  secondaryStreamUrl?: string | null;
  /** Connection status indicator */
  isConnected?: boolean;
  /** List of selected desktop clients */
  selectedClients?: string[];
  /** Function to handle connection */
  onConnect?: () => void;
  /** Function to handle disconnection */
  onDisconnect?: () => void;
  /** Function to handle workflow execution */
  onWorkflowExecute?: (nodeConfig: any) => void;
  /** Function to handle workflow stop */
  onWorkflowStop?: (nodeId: string) => void;
  /** Function to handle node configuration save */
  onNodeConfigSave?: (nodeConfig: any) => void;
  /** Live desktop configuration (for compatibility) */
  config?: LiveDesktopConfig;
  /** Function to handle config changes (for compatibility) */
  onConfigChange?: (config: LiveDesktopConfig) => void;
  /** CSS class name */
  className?: string;
}

/**
 * Internal state interfaces following TRAE conventions
 */
interface WorkflowNode {
  id: string;
  type: 'action' | 'interface' | 'trigger' | 'config' | 'results';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  config: any;
  isActive: boolean;
  isExecutable: boolean;
}

interface CanvasState {
  scale: number;
  offsetX: number;
  offsetY: number;
  selectedNode: string | null;
  isDrawing: boolean;
  isPanning: boolean;
}

/**
 * DualCanvasOCRDesigner Component
 * Provides dual-canvas OCR design capabilities with workflow integration
 */
export const DualCanvasOCRDesigner: React.FC<DualCanvasOCRDesignerProps> = ({
  ocrConfig,
  setOcrConfig,
  primaryStreamUrl,
  secondaryStreamUrl,
  isConnected = false,
  selectedClients = [],
  onConnect,
  onDisconnect,
  onWorkflowExecute,
  onWorkflowStop,
  onNodeConfigSave,
  config,
  onConfigChange,
  className = ""
}) => {
  // ============================================================================
  // REFS AND STATE MANAGEMENT
  // ============================================================================
  
  const primaryCanvasRef = useRef<HTMLCanvasElement>(null);
  const secondaryCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [regions, setRegions] = useState<OCRRegion[]>(config?.ocrRegions || []);
  const [workflowNodes, setWorkflowNodes] = useState<WorkflowNode[]>([]);
  const [canvasState, setCanvasState] = useState<CanvasState>({
    scale: 1.0,
    offsetX: 0,
    offsetY: 0,
    selectedNode: null,
    isDrawing: false,
    isPanning: false
  });
  
  const [activeCanvas, setActiveCanvas] = useState<'primary' | 'secondary'>('primary');
  const [designMode, setDesignMode] = useState<'ocr' | 'workflow'>('ocr');
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
  
  const { toast } = useToast();

  // Fixed canvas dimensions for consistent layout
  const CANVAS_WIDTH = 1200;
  const CANVAS_HEIGHT = 900;

  // ============================================================================
  // CANVAS INITIALIZATION AND DRAWING
  // ============================================================================

  /**
   * Draw fallback mock canvas when stream is unavailable
   * Maintains TRAE design consistency
   */
  const drawFallbackCanvas = useCallback((ctx: CanvasRenderingContext2D, gradientColors: string[]) => {
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    gradient.addColorStop(0, gradientColors[0]);
    gradient.addColorStop(1, gradientColors[1]);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Add "No Stream" indicator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(CANVAS_WIDTH / 2 - 150, CANVAS_HEIGHT / 2 - 50, 300, 100);
    
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No Stream Available', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
    
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText('Waiting for desktop stream...', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 15);
    
    // Reset text alignment
    ctx.textAlign = 'left';
  }, []);

  /**
   * Load and display stream image on canvas with proper error handling
   * Follows TRAE coding practices with clear comments
   */
  const loadStreamImage = useCallback((canvas: HTMLCanvasElement, imageUrl: string, fallbackGradient: string[]) => {
     const ctx = canvas.getContext('2d');
     if (!ctx) return;
 
     if (imageUrl && imageUrl.trim() !== '') {
       console.log(`[DualCanvasOCRDesigner] Loading stream image: ${imageUrl.substring(0, 50)}...`);
       
       const img = new Image();
       img.onload = () => {
         console.log(`[DualCanvasOCRDesigner] Stream image loaded successfully, size: ${img.width}x${img.height}`);
         
         // Clear canvas first
         ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
         
         // Calculate aspect ratio to fit image properly
         const aspectRatio = img.width / img.height;
         const canvasAspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
         
         let drawWidth = CANVAS_WIDTH;
         let drawHeight = CANVAS_HEIGHT;
         let offsetX = 0;
         let offsetY = 0;
         
         if (aspectRatio > canvasAspectRatio) {
           // Image is wider than canvas
           drawHeight = CANVAS_WIDTH / aspectRatio;
           offsetY = (CANVAS_HEIGHT - drawHeight) / 2;
         } else {
           // Image is taller than canvas
           drawWidth = CANVAS_HEIGHT * aspectRatio;
           offsetX = (CANVAS_WIDTH - drawWidth) / 2;
         }
         
         // Draw the stream image
         ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
       };
       
       img.onerror = () => {
         console.warn(`[DualCanvasOCRDesigner] Failed to load stream image, falling back to mock data`);
         drawFallbackCanvas(ctx, fallbackGradient);
       };
       
       img.src = imageUrl;
     } else {
       console.log(`[DualCanvasOCRDesigner] No stream URL provided, using fallback`);
       drawFallbackCanvas(ctx, fallbackGradient);
     }
   }, [drawFallbackCanvas]);

  /**
   * Initialize canvas backgrounds with stream data or fallback
   * Follows TRAE coding practices with clear comments
   */
  const initializeCanvases = useCallback(() => {
    const primaryCanvas = primaryCanvasRef.current;
    const secondaryCanvas = secondaryCanvasRef.current;
    
    if (!primaryCanvas || !secondaryCanvas) return;

    console.log(`[DualCanvasOCRDesigner] Initializing canvases with streams:`);
    console.log(`[DualCanvasOCRDesigner] Primary URL: ${primaryStreamUrl ? 'Available' : 'Not available'}`);
    console.log(`[DualCanvasOCRDesigner] Secondary URL: ${secondaryStreamUrl ? 'Available' : 'Not available'}`);

    // Load primary canvas with stream or fallback
    loadStreamImage(primaryCanvas, primaryStreamUrl || '', ['#1e40af', '#3b82f6']);
    
    // Load secondary canvas with stream or fallback
    loadStreamImage(secondaryCanvas, secondaryStreamUrl || '', ['#10b981', '#059669']);
  }, [primaryStreamUrl, secondaryStreamUrl, loadStreamImage]);

  /**
   * Draw OCR regions overlay with TRAE design system colors
   */
  const drawRegionsOverlay = useCallback(() => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;

    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    // Clear overlay canvas
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Draw OCR regions
    regions.forEach((region) => {
      const isSelected = canvasState.selectedNode === region.id;
      const isActive = region.isActive;
      
      // Apply TRAE design system colors
      ctx.strokeStyle = isSelected ? '#ef4444' : isActive ? '#3b82f6' : '#6b7280';
      ctx.fillStyle = isSelected ? 'rgba(239, 68, 68, 0.1)' : isActive ? 'rgba(59, 130, 246, 0.1)' : 'rgba(107, 114, 128, 0.1)';
      ctx.lineWidth = isSelected ? 3 : 2;

      // Draw region rectangle
      ctx.fillRect(region.x, region.y, region.width, region.height);
      ctx.strokeRect(region.x, region.y, region.width, region.height);

      // Draw label with proper font
      ctx.fillStyle = isSelected ? '#ef4444' : isActive ? '#3b82f6' : '#6b7280';
      ctx.font = '500 12px Inter, sans-serif';
      const labelY = region.y > 20 ? region.y - 4 : region.y + region.height + 16;
      ctx.fillText(region.label, region.x, labelY);

      // Draw status indicator for active regions
      if (isActive) {
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(region.x + region.width - 8, region.y + 8, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    // Draw workflow nodes
    workflowNodes.forEach((node) => {
      const isSelected = canvasState.selectedNode === node.id;
      const isExecutable = node.isExecutable;
      
      // Node colors based on type and state
      let nodeColor = '#6b7280';
      if (isExecutable) nodeColor = '#10b981';
      if (node.type === 'action') nodeColor = '#ef4444';
      if (node.type === 'interface') nodeColor = '#f59e0b';
      if (isSelected) nodeColor = '#8b5cf6';
      
      ctx.strokeStyle = nodeColor;
      ctx.fillStyle = isSelected ? `${nodeColor}20` : `${nodeColor}10`;
      ctx.lineWidth = isSelected ? 3 : 2;

      // Draw node rectangle
      ctx.fillRect(node.x, node.y, node.width, node.height);
      ctx.strokeRect(node.x, node.y, node.width, node.height);

      // Draw node label
      ctx.fillStyle = nodeColor;
      ctx.font = '500 12px Inter, sans-serif';
      ctx.fillText(node.label, node.x + 8, node.y + 20);
      
      // Draw node type badge
      ctx.font = '400 10px Inter, sans-serif';
      ctx.fillText(node.type.toUpperCase(), node.x + 8, node.y + node.height - 8);
    });
  }, [regions, workflowNodes, canvasState.selectedNode]);

  // ============================================================================
  // EVENT HANDLERS FOR INTERACTION
  // ============================================================================

  /**
   * Handle mouse events for region and node selection/creation
   * Implements TRAE interaction patterns
   */
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check for node/region selection
    const clickedRegion = regions.find(region =>
      x >= region.x && x <= region.x + region.width &&
      y >= region.y && y <= region.y + region.height
    );

    const clickedNode = workflowNodes.find(node =>
      x >= node.x && x <= node.x + node.width &&
      y >= node.y && y <= node.y + node.height
    );

    if (clickedRegion) {
      setCanvasState(prev => ({ ...prev, selectedNode: clickedRegion.id }));
    } else if (clickedNode) {
      setCanvasState(prev => ({ ...prev, selectedNode: clickedNode.id }));
    } else {
      setCanvasState(prev => ({ ...prev, selectedNode: null, isDrawing: true }));
    }
  }, [regions, workflowNodes]);

  /**
   * Handle workflow execution for action and interface nodes
   * Only executable nodes can be triggered
   */
  const handleNodeExecution = useCallback((nodeId: string) => {
    const node = workflowNodes.find(n => n.id === nodeId);
    if (!node || !node.isExecutable) return;

    if (node.type === 'action' || node.type === 'interface') {
      onWorkflowExecute?.(node.config);
      setIsWorkflowRunning(true);
      
      toast({
        title: "Workflow Executed",
        description: `Node "${node.label}" execution started`,
      });
    }
  }, [workflowNodes, onWorkflowExecute, toast]);

  /**
   * Add new OCR region with proper validation
   */
  const addOCRRegion = useCallback((x: number, y: number, width: number, height: number) => {
    if (width < 10 || height < 10) return;

    const newRegion: OCRRegion = {
      id: `region-${Date.now()}`,
      label: `OCR Zone ${regions.length + 1}`,
      x: Math.min(x, x + width),
      y: Math.min(y, y + height),
      width: Math.abs(width),
      height: Math.abs(height),
      isActive: true,
      lastExtractedText: '',
      extractionHistory: []
    };

    const updatedRegions = [...regions, newRegion];
    setRegions(updatedRegions);
    
    // Update config for external components
    if (config && onConfigChange) {
      onConfigChange({
        ...config,
        ocrRegions: updatedRegions,
        updatedAt: new Date().toISOString()
      });
    }

    toast({
      title: "OCR Zone Created",
      description: `Zone "${newRegion.label}" added for text extraction`,
    });
  }, [regions, config, onConfigChange, toast]);

  /**
   * Add new workflow node with type validation
   */
  const addWorkflowNode = useCallback((type: WorkflowNode['type'], x: number, y: number) => {
    const newNode: WorkflowNode = {
      id: `node-${type}-${Date.now()}`,
      type,
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
      x,
      y,
      width: 120,
      height: 60,
      config: {},
      isActive: true,
      isExecutable: type === 'action' || type === 'interface' // Only action and interface nodes are executable
    };

    setWorkflowNodes(prev => [...prev, newNode]);
    
    toast({
      title: "Workflow Node Added",
      description: `${type} node created`,
    });
  }, [toast]);

  // ============================================================================
  // CONNECTION AND STREAM MANAGEMENT
  // ============================================================================

  /**
   * Handle connection toggle with proper error handling
   */
  const handleConnectionToggle = useCallback(() => {
    if (isConnected) {
      onDisconnect?.();
      toast({
        title: "Disconnected",
        description: "WebSocket connection closed",
      });
    } else {
      onConnect?.();
      toast({
        title: "Connecting...",
        description: "Establishing WebSocket connection",
      });
    }
  }, [isConnected, onConnect, onDisconnect, toast]);

  // ============================================================================
  // EFFECTS FOR INITIALIZATION
  // ============================================================================

  useEffect(() => {
    initializeCanvases();
  }, [initializeCanvases]);

  // Watch for stream URL changes and update canvases
  useEffect(() => {
    console.log(`[DualCanvasOCRDesigner] Stream URLs changed, updating canvases`);
    initializeCanvases();
  }, [primaryStreamUrl, secondaryStreamUrl, initializeCanvases]);

  useEffect(() => {
    drawRegionsOverlay();
  }, [drawRegionsOverlay]);

  // ============================================================================
  // RENDER METHODS
  // ============================================================================

  /**
   * Render control panel with TRAE design system components
   */
  const renderControlPanel = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Dual Canvas OCR Designer</span>
          <div className="flex items-center space-x-2">
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            <Button
              variant={isConnected ? "destructive" : "default"}
              size="sm"
              onClick={handleConnectionToggle}
            >
              {isConnected ? <Square className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {isConnected ? 'Disconnect' : 'Connect'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="design-mode">Design Mode:</Label>
            <Tabs value={designMode} onValueChange={(value) => setDesignMode(value as 'ocr' | 'workflow')}>
              <TabsList>
                <TabsTrigger value="ocr">OCR Regions</TabsTrigger>
                <TabsTrigger value="workflow">Workflow Nodes</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="flex items-center space-x-2">
            <Label htmlFor="active-canvas">Active Canvas:</Label>
            <Tabs value={activeCanvas} onValueChange={(value) => setActiveCanvas(value as 'primary' | 'secondary')}>
              <TabsList>
                <TabsTrigger value="primary">Primary</TabsTrigger>
                <TabsTrigger value="secondary">Secondary</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {designMode === 'workflow' && (
            <div className="flex space-x-2">
              <Button size="sm" onClick={() => addWorkflowNode('action', 100, 100)}>
                <Plus className="w-4 h-4 mr-1" />
                Action
              </Button>
              <Button size="sm" onClick={() => addWorkflowNode('interface', 250, 100)}>
                <Plus className="w-4 h-4 mr-1" />
                Interface
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  /**
   * Render dual canvas layout with proper responsive design
   */
  const renderCanvasLayout = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Primary Canvas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Monitor className="w-5 h-5" />
            <span>Primary Monitor</span>
            {activeCanvas === 'primary' && <Badge>Active</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="relative">
            <canvas
              ref={primaryCanvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="w-full h-auto border border-border rounded-lg cursor-crosshair"
              onMouseDown={handleCanvasMouseDown}
            />
            {activeCanvas === 'primary' && (
              <canvas
                ref={overlayCanvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="absolute top-0 left-0 w-full h-auto pointer-events-none"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Secondary Canvas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Grid className="w-5 h-5" />
            <span>Secondary Monitor</span>
            {activeCanvas === 'secondary' && <Badge>Active</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="relative">
            <canvas
              ref={secondaryCanvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="w-full h-auto border border-border rounded-lg cursor-crosshair"
              onMouseDown={handleCanvasMouseDown}
            />
            {activeCanvas === 'secondary' && (
              <canvas
                ref={overlayCanvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="absolute top-0 left-0 w-full h-auto pointer-events-none"
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  /**
   * Render status and configuration panel
   */
  const renderStatusPanel = () => (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Configuration Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">OCR Regions:</span>
            <Badge variant="outline">{regions.length}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Workflow Nodes:</span>
            <Badge variant="outline">{workflowNodes.length}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Clients Connected:</span>
            <Badge variant="outline">{selectedClients.length}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // ============================================================================
  // MAIN COMPONENT RENDER
  // ============================================================================

  return (
    <div className={`dual-canvas-ocr-designer ${className}`}>
      {/* Control Panel */}
      {renderControlPanel()}
      
      {/* Canvas Layout */}
      {renderCanvasLayout()}
      
      {/* Status Panel */}
      {renderStatusPanel()}
    </div>
  );
};

export default DualCanvasOCRDesigner;