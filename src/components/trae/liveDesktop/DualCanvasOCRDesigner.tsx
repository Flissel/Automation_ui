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
  Upload,
  Maximize2,
  X,
  ScanText,
  Loader2
} from 'lucide-react';
import { OCRRegion, LiveDesktopConfig } from '@/types/liveDesktop';
import { useToast } from '@/hooks/use-toast';
import { OCRBackendService } from '@/services/ocrBackendService';
import type { OCRResult } from '@/types/ocr';

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
  drawStartX: number;
  drawStartY: number;
  drawCurrentX: number;
  drawCurrentY: number;
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
    isPanning: false,
    drawStartX: 0,
    drawStartY: 0,
    drawCurrentX: 0,
    drawCurrentY: 0
  });
  
  const [activeCanvas, setActiveCanvas] = useState<'primary' | 'secondary'>('primary');
  const [expandedMonitor, setExpandedMonitor] = useState<'primary' | 'secondary' | null>(null);

  // OCR extraction state
  const [isExtracting, setIsExtracting] = useState(false);
  const [autoOCREnabled, setAutoOCREnabled] = useState(false);
  const [ocrResults, setOcrResults] = useState<OCRResult[]>([]);
  const [previousOcrResults, setPreviousOcrResults] = useState<OCRResult[]>([]);
  const [textChanges, setTextChanges] = useState<Map<string, { previous: string; current: string; timestamp: string }>>(new Map());
  const [backendHealthy, setBackendHealthy] = useState(false);

  const { toast } = useToast();

  // Fixed canvas dimensions for consistent layout
  const CANVAS_WIDTH = 1200;
  const CANVAS_HEIGHT = 900;

  // Auto-OCR interval reference
  const autoOCRIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

    // Draw current drawing region (if actively drawing)
    if (canvasState.isDrawing) {
      const x = Math.min(canvasState.drawStartX, canvasState.drawCurrentX);
      const y = Math.min(canvasState.drawStartY, canvasState.drawCurrentY);
      const width = Math.abs(canvasState.drawCurrentX - canvasState.drawStartX);
      const height = Math.abs(canvasState.drawCurrentY - canvasState.drawStartY);

      // Draw semi-transparent blue rectangle for active drawing
      ctx.strokeStyle = '#3b82f6';
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]); // Dashed line for active drawing

      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);

      ctx.setLineDash([]); // Reset line dash

      // Draw dimensions label
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.fillText(`${Math.round(width)} × ${Math.round(height)}`, x + 5, y + 20);
    }

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
  }, [regions, workflowNodes, canvasState.selectedNode, canvasState.isDrawing, canvasState.drawStartX, canvasState.drawStartY, canvasState.drawCurrentX, canvasState.drawCurrentY]);

  // ============================================================================
  // REGION AND NODE MANAGEMENT
  // ============================================================================

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
   * Delete OCR region by ID
   */
  const deleteOCRRegion = useCallback((regionId: string) => {
    const updatedRegions = regions.filter(r => r.id !== regionId);
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
      title: "OCR Zone Deleted",
      description: "Zone removed successfully",
    });
  }, [regions, config, onConfigChange, toast]);

  /**
   * Delete selected region/node
   */
  const handleDeleteSelected = useCallback(() => {
    if (!canvasState.selectedNode) return;

    const selectedRegion = regions.find(r => r.id === canvasState.selectedNode);
    if (selectedRegion) {
      deleteOCRRegion(selectedRegion.id);
      setCanvasState(prev => ({ ...prev, selectedNode: null }));
    }
  }, [canvasState.selectedNode, regions, deleteOCRRegion]);

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
  // EVENT HANDLERS FOR INTERACTION
  // ============================================================================

  /**
   * Handle mouse events for region and node selection/creation
   * Implements TRAE interaction patterns
   */
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();

    // Calculate actual canvas coordinates considering scaling
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

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
      // Start drawing new region/node
      setCanvasState(prev => ({
        ...prev,
        selectedNode: null,
        isDrawing: true,
        drawStartX: x,
        drawStartY: y,
        drawCurrentX: x,
        drawCurrentY: y
      }));
    }
  }, [regions, workflowNodes]);

  /**
   * Handle mouse move for drawing regions
   */
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasState.isDrawing) return;

    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();

    // Calculate actual canvas coordinates considering scaling
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setCanvasState(prev => ({
      ...prev,
      drawCurrentX: x,
      drawCurrentY: y
    }));
  }, [canvasState.isDrawing]);

  /**
   * Handle mouse up to finish drawing
   */
  const handleCanvasMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasState.isDrawing) return;

    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();

    // Calculate actual canvas coordinates considering scaling
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const width = Math.abs(x - canvasState.drawStartX);
    const height = Math.abs(y - canvasState.drawStartY);

    // Only create region if it's large enough
    if (width >= 20 && height >= 20) {
      addOCRRegion(
        Math.min(canvasState.drawStartX, x),
        Math.min(canvasState.drawStartY, y),
        width,
        height
      );
    }

    // Reset drawing state
    setCanvasState(prev => ({
      ...prev,
      isDrawing: false,
      drawStartX: 0,
      drawStartY: 0,
      drawCurrentX: 0,
      drawCurrentY: 0
    }));
  }, [canvasState.isDrawing, canvasState.drawStartX, canvasState.drawStartY, addOCRRegion]);

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

  // ============================================================================
  // OCR EXTRACTION LOGIC
  // ============================================================================

  /**
   * Check OCR backend health on mount
   */
  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const healthy = await OCRBackendService.isHealthy();
        setBackendHealthy(healthy);
        if (healthy) {
          console.log('[OCRDesigner] OCR backend is healthy');
        }
      } catch (error) {
        console.error('[OCRDesigner] Failed to check backend health:', error);
        setBackendHealthy(false);
      }
    };

    checkBackendHealth();
  }, []);

  /**
   * Extract OCR text from all active regions
   */
  const extractOCRText = useCallback(async () => {
    if (!backendHealthy) {
      toast({
        title: "OCR Backend Not Available",
        description: "Please ensure OCR backend is running on port 8007",
        variant: "destructive"
      });
      return;
    }

    if (regions.length === 0) {
      toast({
        title: "No OCR Zones Defined",
        description: "Draw regions on the canvas to extract text",
        variant: "default"
      });
      return;
    }

    setIsExtracting(true);

    try {
      // Get the current active canvas with retry logic
      const canvasRef = activeCanvas === 'primary' ? primaryCanvasRef : secondaryCanvasRef;
      let canvas = canvasRef.current;

      // Retry logic: wait for canvas to be available
      if (!canvas) {
        console.warn('[DualCanvasOCRDesigner] Canvas ref is null, waiting for canvas to mount...');

        // Wait up to 2 seconds for canvas to become available
        for (let i = 0; i < 20; i++) {
          await new Promise(resolve => setTimeout(resolve, 100));
          canvas = canvasRef.current;
          if (canvas) {
            console.log('[DualCanvasOCRDesigner] Canvas ref now available after retry');
            break;
          }
        }

        if (!canvas) {
          console.error('[DualCanvasOCRDesigner] Canvas ref is still null after retries:', {
            activeCanvas,
            primaryCanvasRef: primaryCanvasRef.current,
            secondaryCanvasRef: secondaryCanvasRef.current,
            primaryStreamUrl,
            secondaryStreamUrl
          });
          throw new Error(`Canvas not available for ${activeCanvas} monitor after waiting. Stream may not be loaded yet.`);
        }
      }

      // Check if canvas has content
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const isEmpty = imageData.data.every((value, index) => index % 4 === 3 || value === 0);

        if (isEmpty) {
          console.warn('[DualCanvasOCRDesigner] Canvas is empty - no frame data loaded');
          throw new Error(`No frame data on ${activeCanvas} monitor canvas. Please wait for stream to load.`);
        }
      }

      // Convert canvas to base64
      const imageData = OCRBackendService.canvasToBase64(canvas);

      // Prepare regions for OCR
      const ocrRegions = regions.map(region => ({
        id: region.id,
        x: region.x,
        y: region.y,
        width: region.width,
        height: region.height,
        label: region.label,
        language: 'eng'
      }));

      // Extract text from all regions
      const response = await OCRBackendService.extractText(imageData, ocrRegions);

      if (response.success) {
        // Detect text changes
        const newChanges = new Map(textChanges);
        let changeCount = 0;

        response.results.forEach(result => {
          const previousResult = previousOcrResults.find(r => r.zone_id === result.zone_id);
          if (previousResult && previousResult.text !== result.text) {
            newChanges.set(result.zone_id, {
              previous: previousResult.text,
              current: result.text,
              timestamp: result.metadata.timestamp
            });
            changeCount++;
          }
        });

        setTextChanges(newChanges);
        setPreviousOcrResults(response.results);
        setOcrResults(response.results);

        // Update regions with extracted text
        const updatedRegions = regions.map(region => {
          const result = response.results.find(r => r.zone_id === region.id);
          if (result) {
            return {
              ...region,
              lastExtractedText: result.text,
              extractionHistory: [
                ...(region.extractionHistory || []),
                {
                  text: result.text,
                  confidence: result.confidence,
                  timestamp: result.metadata.timestamp
                }
              ]
            };
          }
          return region;
        });

        setRegions(updatedRegions);

        toast({
          title: "OCR Extraction Complete",
          description: changeCount > 0
            ? `${changeCount} text change${changeCount !== 1 ? 's' : ''} detected`
            : `Extracted text from ${response.results.length} region${response.results.length !== 1 ? 's' : ''}`,
        });
      }
    } catch (error) {
      console.error('[OCRDesigner] OCR extraction failed:', error);
      toast({
        title: "OCR Extraction Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsExtracting(false);
    }
  }, [regions, activeCanvas, backendHealthy, toast]);

  /**
   * Toggle auto-OCR mode
   */
  const toggleAutoOCR = useCallback(() => {
    if (autoOCREnabled) {
      // Stop auto-OCR
      if (autoOCRIntervalRef.current) {
        clearInterval(autoOCRIntervalRef.current);
        autoOCRIntervalRef.current = null;
      }
      setAutoOCREnabled(false);
      toast({
        title: "Auto-OCR Disabled",
        description: "Continuous text extraction stopped",
      });
    } else {
      // Start auto-OCR
      setAutoOCREnabled(true);
      extractOCRText(); // Extract immediately

      autoOCRIntervalRef.current = setInterval(() => {
        extractOCRText();
      }, 5000); // Extract every 5 seconds

      toast({
        title: "Auto-OCR Enabled",
        description: "Extracting text every 5 seconds",
      });
    }
  }, [autoOCREnabled, extractOCRText, toast]);

  /**
   * Cleanup auto-OCR interval on unmount
   */
  useEffect(() => {
    return () => {
      if (autoOCRIntervalRef.current) {
        clearInterval(autoOCRIntervalRef.current);
      }
    };
  }, []);

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

  /**
   * Handle monitor expansion to fullscreen
   */
  const handleExpandMonitor = useCallback((monitor: 'primary' | 'secondary') => {
    setExpandedMonitor(monitor);
    setActiveCanvas(monitor);
  }, []);

  /**
   * Handle closing fullscreen monitor view
   */
  const handleCloseExpanded = useCallback(() => {
    setExpandedMonitor(null);
  }, []);

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
  }, [drawRegionsOverlay, canvasState]);

  // ESC key to close fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expandedMonitor) {
        handleCloseExpanded();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [expandedMonitor, handleCloseExpanded]);

  // ============================================================================
  // RENDER METHODS
  // ============================================================================

  /**
   * Render minimal control panel
   */
  const renderControlPanel = () => (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">OCR Designer</h2>
        <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
          {isConnected ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
          {isConnected ? 'Connected' : 'Disconnected'}
        </Badge>
        <Badge variant={backendHealthy ? "default" : "secondary"} className="text-xs">
          {backendHealthy ? '🟢 OCR Ready' : '🔴 OCR Offline'}
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        <Tabs value={activeCanvas} onValueChange={(value) => setActiveCanvas(value as 'primary' | 'secondary')}>
          <TabsList className="h-8">
            <TabsTrigger value="primary" className="text-xs">Monitor 1</TabsTrigger>
            <TabsTrigger value="secondary" className="text-xs">Monitor 2</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* OCR Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={extractOCRText}
            disabled={isExtracting || !backendHealthy || regions.length === 0}
          >
            {isExtracting ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <ScanText className="w-4 h-4 mr-1" />
                Extract OCR
              </>
            )}
          </Button>

          <div className="flex items-center gap-2 border rounded px-2 py-1">
            <Label htmlFor="auto-ocr" className="text-xs cursor-pointer">
              Auto-OCR
            </Label>
            <Switch
              id="auto-ocr"
              checked={autoOCREnabled}
              onCheckedChange={toggleAutoOCR}
              disabled={!backendHealthy || regions.length === 0}
            />
          </div>
        </div>

        {canvasState.selectedNode && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteSelected}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );

  /**
   * Render minimal canvas layout
   */
  const renderCanvasLayout = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Primary Canvas */}
      <div className="relative border rounded-lg overflow-hidden bg-background">
        <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
          <Badge variant={activeCanvas === 'primary' ? "default" : "secondary"} className="text-xs">
            Monitor 1
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 z-10 h-7 w-7 p-0"
          onClick={() => handleExpandMonitor('primary')}
          title="Fullscreen"
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
        <div className="relative p-2">
          <canvas
            ref={primaryCanvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full h-auto rounded cursor-crosshair"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />
          {activeCanvas === 'primary' && (
            <canvas
              ref={overlayCanvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="absolute top-2 left-2 w-[calc(100%-1rem)] h-auto pointer-events-none"
            />
          )}
        </div>
      </div>

      {/* Secondary Canvas */}
      <div className="relative border rounded-lg overflow-hidden bg-background">
        <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
          <Badge variant={activeCanvas === 'secondary' ? "default" : "secondary"} className="text-xs">
            Monitor 2
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 z-10 h-7 w-7 p-0"
          onClick={() => handleExpandMonitor('secondary')}
          title="Fullscreen"
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
        <div className="relative p-2">
          <canvas
            ref={secondaryCanvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full h-auto rounded cursor-crosshair"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />
          {activeCanvas === 'secondary' && (
            <canvas
              ref={overlayCanvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="absolute top-2 left-2 w-[calc(100%-1rem)] h-auto pointer-events-none"
            />
          )}
        </div>
      </div>
    </div>
  );

  /**
   * Render minimal fullscreen monitor view
   */
  const renderExpandedMonitor = () => {
    if (!expandedMonitor) return null;

    const canvasRef = expandedMonitor === 'primary' ? primaryCanvasRef : secondaryCanvasRef;
    const monitorNum = expandedMonitor === 'primary' ? '1' : '2';

    return (
      <div
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col"
        onClick={handleCloseExpanded}
      >
        {/* Minimal header */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20" onClick={(e) => e.stopPropagation()}>
          <Badge variant="outline" className="bg-background/50 backdrop-blur">
            Monitor {monitorNum}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="bg-background/50 backdrop-blur h-8 w-8 p-0"
            onClick={handleCloseExpanded}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Fullscreen canvas container */}
        <div className="flex-1 flex items-center justify-center p-8" onClick={(e) => e.stopPropagation()}>
          <div className="relative w-full h-full flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="max-w-full max-h-full rounded shadow-2xl cursor-crosshair"
              style={{
                width: 'auto',
                height: 'auto',
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
              }}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            />
            {activeCanvas === expandedMonitor && (
              <canvas
                ref={overlayCanvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="absolute pointer-events-none"
                style={{
                  width: 'auto',
                  height: 'auto',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
              />
            )}
          </div>
        </div>

        {/* Minimal footer hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <p className="text-xs text-white/60">ESC oder außerhalb klicken zum Schließen</p>
        </div>
      </div>
    );
  };


  // ============================================================================
  // MAIN COMPONENT RENDER
  // ============================================================================

  return (
    <div className={`dual-canvas-ocr-designer ${className}`}>
      {/* Minimal Control Panel */}
      {renderControlPanel()}

      {/* Canvas Layout */}
      {renderCanvasLayout()}

      {/* OCR Regions Info (minimal) */}
      {regions.length > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Target className="w-3 h-3" />
          <span>{regions.length} OCR Zone{regions.length !== 1 ? 'n' : ''} definiert</span>
        </div>
      )}

      {/* OCR Results Display */}
      {ocrResults.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ScanText className="w-4 h-4" />
                OCR Extraction Results
              </div>
              <div className="flex items-center gap-2">
                {textChanges.size > 0 && (
                  <Badge variant="default" className="text-xs bg-orange-500">
                    {textChanges.size} Change{textChanges.size !== 1 ? 's' : ''}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  {ocrResults.length} Region{ocrResults.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {ocrResults.map((result) => {
                const region = regions.find(r => r.id === result.zone_id);
                const hasChanged = textChanges.has(result.zone_id);
                const change = textChanges.get(result.zone_id);

                return (
                  <div
                    key={result.zone_id}
                    className={`border rounded-lg p-3 space-y-1 ${hasChanged ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {region?.label || result.zone_id}
                        </span>
                        {hasChanged && (
                          <Badge variant="default" className="text-xs bg-orange-500">
                            Changed
                          </Badge>
                        )}
                      </div>
                      <Badge
                        variant={result.confidence >= 0.9 ? "default" : result.confidence >= 0.7 ? "secondary" : "destructive"}
                        className="text-xs"
                      >
                        {(result.confidence * 100).toFixed(1)}% confidence
                      </Badge>
                    </div>

                    {hasChanged && change && (
                      <div className="space-y-1 mb-2">
                        <div className="text-xs text-muted-foreground">Previous:</div>
                        <p className="text-sm font-mono bg-red-100 dark:bg-red-950/30 p-2 rounded line-through">
                          {change.previous || '(empty)'}
                        </p>
                        <div className="text-xs text-muted-foreground">Current:</div>
                      </div>
                    )}

                    <p className={`text-sm font-mono p-2 rounded ${hasChanged ? 'bg-green-100 dark:bg-green-950/30' : 'bg-muted'}`}>
                      {result.text || '(empty)'}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Engine: {result.metadata.engine}</span>
                      <span>•</span>
                      <span>{result.metadata.processing_time}ms</span>
                      <span>•</span>
                      <span>{new Date(result.metadata.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expanded Monitor Fullscreen View */}
      {renderExpandedMonitor()}
    </div>
  );
};

export default DualCanvasOCRDesigner;