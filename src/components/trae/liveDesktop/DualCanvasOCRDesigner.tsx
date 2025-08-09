/**
 * Dual Canvas OCR Zone Designer Component
 * Interactive dual canvas overlay for designing OCR zones on two monitors
 * Follows TRAE Unity AI Platform naming conventions and coding standards
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Monitor,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { LiveDesktopConfig } from '@/types/liveDesktop';

interface DualCanvasOCRDesignerProps {
  config?: LiveDesktopConfig;
  onConfigChange?: (config: LiveDesktopConfig) => void;
  className?: string;
  primaryStreamUrl?: string | null;
  secondaryStreamUrl?: string | null;
  ocrConfig?: any;
  setOcrConfig?: (config: any) => void;
  isConnected?: boolean;
  selectedClients?: string[];
  onConnect?: () => void;
  onDisconnect?: () => void;
}



export const DualCanvasOCRDesigner: React.FC<DualCanvasOCRDesignerProps> = ({
  config,
  onConfigChange,
  className = "",
  primaryStreamUrl,
  secondaryStreamUrl,
  ocrConfig,
  setOcrConfig,
  isConnected,
  selectedClients,
  onConnect,
  onDisconnect
}) => {
  // Stream canvas references for both monitors (OCR overlay removed)
  const primaryStreamCanvasRef = useRef<HTMLCanvasElement>(null);
  const secondaryStreamCanvasRef = useRef<HTMLCanvasElement>(null);

  // Component state
  const [isExpanded, setIsExpanded] = useState(true);

  // Canvas dimensions - 70% of real monitor size (1920x1080 -> 1344x756)
  const CANVAS_WIDTH = 1920;
  const CANVAS_HEIGHT = 1080;
  const DISPLAY_SCALE = 0.7; // 70% scale for optimal viewing and drawing precision
  const DISPLAY_WIDTH = Math.round(CANVAS_WIDTH * DISPLAY_SCALE); // 1344px
  const DISPLAY_HEIGHT = Math.round(CANVAS_HEIGHT * DISPLAY_SCALE); // 756px

  // ============================================================================
  // STREAM RENDERING FUNCTIONS
  // ============================================================================

  // Render actual monitor stream to canvas with proper aspect ratio handling
  const renderStreamToCanvas = useCallback((
    canvasRef: React.RefObject<HTMLCanvasElement>, 
    streamUrl: string | undefined,
    monitorType: 'primary' | 'secondary'
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If no stream URL provided, show placeholder
    if (!streamUrl) {
      // Create placeholder background
      const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      if (monitorType === 'primary') {
        gradient.addColorStop(0, '#1e40af');
        gradient.addColorStop(1, '#3b82f6');
      } else {
        gradient.addColorStop(0, '#7c3aed');
        gradient.addColorStop(1, '#a855f7');
      }
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Add placeholder text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${monitorType === 'primary' ? 'Primary' : 'Secondary'} Monitor`, 
        CANVAS_WIDTH / 2, 
        CANVAS_HEIGHT / 2 - 20
      );
      ctx.font = '24px Arial';
      ctx.fillText('No Stream Available', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
      ctx.textAlign = 'left';
      return;
    }

    // Create image element to load stream data
    const img = new Image();
    
    img.onload = () => {
      try {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Calculate aspect ratio preserving dimensions
        const canvasAspect = canvas.width / canvas.height;
        const imgAspect = img.width / img.height;
        
        let drawWidth, drawHeight, drawX, drawY;
        
        if (imgAspect > canvasAspect) {
          // Image is wider than canvas - fit to width
          drawWidth = canvas.width;
          drawHeight = canvas.width / imgAspect;
          drawX = 0;
          drawY = (canvas.height - drawHeight) / 2;
        } else {
          // Image is taller than canvas - fit to height
          drawHeight = canvas.height;
          drawWidth = canvas.height * imgAspect;
          drawX = (canvas.width - drawWidth) / 2;
          drawY = 0;
        }
        
        // Draw stream image with calculated dimensions
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        
        console.log(`[DualCanvasOCRDesigner] Rendered ${monitorType} monitor stream: ${img.width}x${img.height} -> ${Math.round(drawWidth)}x${Math.round(drawHeight)}`);
        
      } catch (error) {
        console.error(`[DualCanvasOCRDesigner] Error rendering ${monitorType} monitor stream:`, error);
      }
    };
    
    img.onerror = (error) => {
      console.error(`[DualCanvasOCRDesigner] Error loading ${monitorType} monitor stream:`, error);
      
      // Show error placeholder
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Stream Error', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.textAlign = 'left';
    };
    
    // Set image source - handle both data URLs and base64 strings
    if (streamUrl.startsWith('data:')) {
      img.src = streamUrl;
    } else {
      img.src = `data:image/jpeg;base64,${streamUrl}`;
    }
  }, []);

  // Update stream canvases when stream URLs change
  useEffect(() => {
    console.log('[DualCanvasOCRDesigner] Updating primary monitor stream:', !!primaryStreamUrl);
    renderStreamToCanvas(primaryStreamCanvasRef, primaryStreamUrl, 'primary');
  }, [primaryStreamUrl, renderStreamToCanvas]);

  useEffect(() => {
    console.log('[DualCanvasOCRDesigner] Updating secondary monitor stream:', !!secondaryStreamUrl);
    renderStreamToCanvas(secondaryStreamCanvasRef, secondaryStreamUrl, 'secondary');
  }, [secondaryStreamUrl, renderStreamToCanvas]);



  // ============================================================================
  // SIMPLIFIED STREAM DISPLAY (OCR functionality removed)
  // ============================================================================

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderStreamSection = (
    title: string,
    monitorType: 'primary' | 'secondary',
    streamCanvasRef: React.RefObject<HTMLCanvasElement>
  ) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Monitor className="w-5 h-5" />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <Badge variant="outline">
          Stream Only
        </Badge>
      </div>

      {/* Main stream container - 70% scale container for 1920x1080 display (1344x756) */}
      <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600" style={{ height: `${DISPLAY_HEIGHT}px` }}>
        {/* Stream canvas only - OCR overlay removed */}
        <div className="absolute inset-0 w-full h-full">
          <canvas
            ref={streamCanvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full h-full"
            style={{ 
              width: `${DISPLAY_WIDTH}px`, 
              height: `${DISPLAY_HEIGHT}px`,
              objectFit: 'contain'
            }}
          />
        </div>
      </div>

    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Monitor className="w-6 h-6" />
            <span>Desktop Stream Viewer</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            {/* Compact WebSocket Connection Controls */}
            <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
            <Button
              size="sm"
              variant={isConnected ? "destructive" : "default"}
              className="h-8 px-3"
              onClick={isConnected ? onDisconnect : onConnect}
            >
              {isConnected ? "Disconnect" : "Connect"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Primary Monitor Stream */}
          {renderStreamSection(
            "Primary Monitor (1920x1080)",
            'primary',
            primaryStreamCanvasRef
          )}

          <Separator />

          {/* Secondary Monitor Stream */}
          {renderStreamSection(
            "Secondary Monitor (1920x1080)",
            'secondary',
            secondaryStreamCanvasRef
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default DualCanvasOCRDesigner;