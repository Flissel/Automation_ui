import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { 
  Eye, 
  FileText, 
  Target, 
  Settings, 
  Play, 
  Square,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';

// Types for Unity AI Platform integration
interface OCRNodeData {
  id: string;
  label: string;
  sourceNode?: string;
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  ocrEngine?: 'tesseract' | 'easyocr' | 'paddleocr';
  language?: string;
  confidence_threshold?: number;
  preprocessing?: {
    grayscale: boolean;
    blur: boolean;
    threshold: boolean;
    deskew: boolean;
  };
  postprocessing?: {
    remove_whitespace: boolean;
    filter_confidence: boolean;
    regex_filter?: string;
  };
  lastResult?: {
    text: string;
    confidence: number;
    timestamp: string;
    processing_time: number;
    words?: Array<{
      text: string;
      confidence: number;
      bbox: [number, number, number, number];
    }>;
  };
  autoTrigger?: boolean;
  triggerOnChange?: boolean;
}

interface OCRResult {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox: [number, number, number, number];
  }>;
  processing_time: number;
  timestamp: string;
}

const OCRNode: React.FC<NodeProps<OCRNodeData>> = ({ 
  data, 
  id, 
  selected 
}) => {
  // State
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [localConfig, setLocalConfig] = useState({
    ocrEngine: data.ocrEngine || 'tesseract',
    language: data.language || 'eng',
    confidence_threshold: data.confidence_threshold || 0.6,
    preprocessing: data.preprocessing || {
      grayscale: true,
      blur: false,
      threshold: true,
      deskew: false
    },
    postprocessing: data.postprocessing || {
      remove_whitespace: true,
      filter_confidence: true,
      regex_filter: ''
    },
    autoTrigger: data.autoTrigger || false,
    triggerOnChange: data.triggerOnChange || false
  });
  const [lastResult, setLastResult] = useState<OCRResult | null>(data.lastResult || null);
  const [region, setRegion] = useState(data.region || null);
  const [processingHistory, setProcessingHistory] = useState<OCRResult[]>([]);
  
  // OCR Processing
  const processOCR = useCallback(async () => {
    if (!region || !data.sourceNode) {
      console.warn('OCR Node: No region or source node specified');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const startTime = Date.now();
      
      // Call OCR API
      const response = await fetch('/api/ocr/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source_node: data.sourceNode,
          region: region,
          engine: localConfig.ocrEngine,
          language: localConfig.language,
          preprocessing: localConfig.preprocessing,
          postprocessing: localConfig.postprocessing,
          confidence_threshold: localConfig.confidence_threshold
        })
      });
      
      if (!response.ok) {
        throw new Error(`OCR API error: ${response.statusText}`);
      }
      
      const result = await response.json();
      const processingTime = Date.now() - startTime;
      
      const ocrResult: OCRResult = {
        text: result.text || '',
        confidence: result.confidence || 0,
        words: result.words || [],
        processing_time: processingTime,
        timestamp: new Date().toISOString()
      };
      
      setLastResult(ocrResult);
      setProcessingHistory(prev => [ocrResult, ...prev.slice(0, 9)]); // Keep last 10 results
      
      // Trigger Unity AI event
      await triggerUnityAIEvent('ocr_completed', {
        node_id: id,
        result: ocrResult,
        region: region
      });
      
    } catch (error) {
      console.error('OCR processing failed:', error);
      
      // Trigger error event
      await triggerUnityAIEvent('ocr_error', {
        node_id: id,
        error: error.message,
        region: region
      });
    } finally {
      setIsProcessing(false);
    }
  }, [region, data.sourceNode, localConfig, id]);
  
  // Unity AI Event Trigger
  const triggerUnityAIEvent = async (eventType: string, payload: any) => {
    try {
      await fetch('/api/events/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: eventType,
          source: 'ocr_node',
          node_id: id,
          payload: payload,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to trigger Unity AI event:', error);
    }
  };
  
  // Region selection from parent node
  const handleRegionUpdate = useCallback((newRegion: any) => {
    setRegion(newRegion);
    
    // Auto-trigger OCR if enabled
    if (localConfig.autoTrigger) {
      setTimeout(() => processOCR(), 100);
    }
  }, [localConfig.autoTrigger, processOCR]);
  
  // Configuration handlers
  const handleConfigChange = (key: string, value: any) => {
    setLocalConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const handlePreprocessingChange = (key: string, value: boolean) => {
    setLocalConfig(prev => ({
      ...prev,
      preprocessing: {
        ...prev.preprocessing,
        [key]: value
      }
    }));
  };
  
  const handlePostprocessingChange = (key: string, value: any) => {
    setLocalConfig(prev => ({
      ...prev,
      postprocessing: {
        ...prev.postprocessing,
        [key]: value
      }
    }));
  };
  
  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  // Get confidence badge variant
  const getConfidenceBadgeVariant = (confidence: number) => {
    if (confidence >= 0.8) return 'default';
    if (confidence >= 0.6) return 'secondary';
    return 'destructive';
  };
  
  // Effects
  useEffect(() => {
    // Listen for region updates from source node
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'region_selected' && event.data.targetNode === id) {
        handleRegionUpdate(event.data.region);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [id, handleRegionUpdate]);
  
  return (
    <div className={`ocr-node ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      {/* Input/Output Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="image-input"
        className="w-3 h-3 bg-blue-500"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="region-input"
        className="w-3 h-3 bg-purple-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="text-output"
        className="w-3 h-3 bg-green-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="data-output"
        className="w-3 h-3 bg-orange-500"
      />
      
      <Card className="w-80">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="w-4 h-4" />
              {data.label || 'OCR Text Recognition'}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                {localConfig.ocrEngine}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Region Info */}
          {region && (
            <div className="p-2 bg-blue-50 rounded text-xs">
              <div className="font-medium flex items-center gap-1">
                <Target className="w-3 h-3" />
                Selected Region
              </div>
              <div className="text-gray-600 mt-1">
                {Math.round(region.x)}, {Math.round(region.y)} - 
                {Math.round(region.width)}×{Math.round(region.height)}
              </div>
            </div>
          )}
          
          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={processOCR}
              disabled={isProcessing || !region || !data.sourceNode}
              className="flex items-center gap-1"
            >
              {isProcessing ? (
                <Clock className="w-3 h-3 animate-spin" />
              ) : (
                <Play className="w-3 h-3" />
              )}
              {isProcessing ? 'Processing...' : 'Run OCR'}
            </Button>
            
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Label>Auto:</Label>
              <input
                type="checkbox"
                checked={localConfig.autoTrigger}
                onChange={(e) => handleConfigChange('autoTrigger', e.target.checked)}
                className="w-3 h-3"
              />
            </div>
          </div>
          
          {/* Results */}
          {lastResult && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  OCR Result
                </div>
                <Badge 
                  variant={getConfidenceBadgeVariant(lastResult.confidence)}
                  className="text-xs"
                >
                  {(lastResult.confidence * 100).toFixed(1)}%
                </Badge>
              </div>
              
              <Textarea
                value={lastResult.text}
                readOnly
                className="text-xs h-20 resize-none"
                placeholder="No text detected"
              />
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{lastResult.processing_time}ms</span>
                <span>{lastResult.words?.length || 0} words</span>
                <span>{new Date(lastResult.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          )}
          
          {/* Settings Panel */}
          {showSettings && (
            <div className="space-y-3 p-3 bg-gray-50 rounded">
              <div className="text-sm font-medium">OCR Configuration</div>
              
              {/* Engine Selection */}
              <div>
                <Label className="text-xs">OCR Engine</Label>
                <select
                  value={localConfig.ocrEngine}
                  onChange={(e) => handleConfigChange('ocrEngine', e.target.value)}
                  className="w-full text-xs p-1 border rounded"
                >
                  <option value="tesseract">Tesseract</option>
                  <option value="easyocr">EasyOCR</option>
                  <option value="paddleocr">PaddleOCR</option>
                </select>
              </div>
              
              {/* Language */}
              <div>
                <Label className="text-xs">Language</Label>
                <Input
                  value={localConfig.language}
                  onChange={(e) => handleConfigChange('language', e.target.value)}
                  className="text-xs"
                  placeholder="eng"
                />
              </div>
              
              {/* Confidence Threshold */}
              <div>
                <Label className="text-xs">Confidence Threshold: {localConfig.confidence_threshold}</Label>
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
              
              {/* Preprocessing */}
              <div>
                <Label className="text-xs font-medium">Preprocessing</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {Object.entries(localConfig.preprocessing).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => handlePreprocessingChange(key, e.target.checked)}
                        className="w-3 h-3"
                      />
                      {key.replace('_', ' ')}
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Postprocessing */}
              <div>
                <Label className="text-xs font-medium">Postprocessing</Label>
                <div className="space-y-1 mt-1">
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={localConfig.postprocessing.remove_whitespace}
                      onChange={(e) => handlePostprocessingChange('remove_whitespace', e.target.checked)}
                      className="w-3 h-3"
                    />
                    Remove whitespace
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={localConfig.postprocessing.filter_confidence}
                      onChange={(e) => handlePostprocessingChange('filter_confidence', e.target.checked)}
                      className="w-3 h-3"
                    />
                    Filter by confidence
                  </label>
                  <Input
                    value={localConfig.postprocessing.regex_filter || ''}
                    onChange={(e) => handlePostprocessingChange('regex_filter', e.target.value)}
                    className="text-xs"
                    placeholder="Regex filter (optional)"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Processing History */}
          {processingHistory.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Recent Results</div>
              <div className="max-h-20 overflow-y-auto space-y-1">
                {processingHistory.slice(0, 3).map((result, index) => (
                  <div key={index} className="text-xs p-1 bg-gray-50 rounded flex items-center justify-between">
                    <span className="truncate flex-1">
                      {result.text.substring(0, 30)}{result.text.length > 30 ? '...' : ''}
                    </span>
                    <Badge 
                      variant={getConfidenceBadgeVariant(result.confidence)}
                      className="text-xs ml-2"
                    >
                      {(result.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OCRNode;
export type { OCRNodeData, OCRResult };