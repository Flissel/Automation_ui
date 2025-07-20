import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  MousePointer, 
  Target, 
  Settings, 
  Play, 
  Square,
  CheckCircle,
  AlertCircle,
  Clock,
  Hand,
  MousePointer2
} from 'lucide-react';

// Types for Unity AI Platform integration
interface ClickActionNodeData {
  id: string;
  label: string;
  sourceNode?: string;
  clickType: 'single' | 'double' | 'right' | 'middle' | 'drag';
  coordinates?: {
    x: number;
    y: number;
  };
  targetCoordinates?: {
    x: number;
    y: number;
  }; // For drag operations
  coordinateMode: 'absolute' | 'relative' | 'ocr_result' | 'element_detection';
  ocrTextTarget?: string;
  elementSelector?: string;
  delay?: {
    before: number;
    after: number;
  };
  retryConfig?: {
    enabled: boolean;
    maxRetries: number;
    retryDelay: number;
  };
  validation?: {
    enabled: boolean;
    expectedChange: string;
    timeout: number;
  };
  lastExecution?: {
    timestamp: string;
    success: boolean;
    coordinates: { x: number; y: number };
    duration: number;
    error?: string;
  };
  autoTrigger?: boolean;
  triggerCondition?: string;
}

interface ClickResult {
  success: boolean;
  coordinates: { x: number; y: number };
  duration: number;
  timestamp: string;
  clickType: string;
  error?: string;
  validationResult?: {
    passed: boolean;
    details: string;
  };
}

const ClickActionNode: React.FC<NodeProps<ClickActionNodeData>> = ({ 
  data, 
  id, 
  selected 
}) => {
  // State
  const [isExecuting, setIsExecuting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [localConfig, setLocalConfig] = useState({
    clickType: data.clickType || 'single',
    coordinates: data.coordinates || { x: 0, y: 0 },
    targetCoordinates: data.targetCoordinates || { x: 0, y: 0 },
    coordinateMode: data.coordinateMode || 'absolute',
    ocrTextTarget: data.ocrTextTarget || '',
    elementSelector: data.elementSelector || '',
    delay: data.delay || { before: 0, after: 0 },
    retryConfig: data.retryConfig || {
      enabled: false,
      maxRetries: 3,
      retryDelay: 1000
    },
    validation: data.validation || {
      enabled: false,
      expectedChange: '',
      timeout: 5000
    },
    autoTrigger: data.autoTrigger || false,
    triggerCondition: data.triggerCondition || ''
  });
  const [lastResult, setLastResult] = useState<ClickResult | null>(data.lastExecution || null);
  const [executionHistory, setExecutionHistory] = useState<ClickResult[]>([]);
  const [pendingOcrResult, setPendingOcrResult] = useState<any>(null);
  
  // Click execution
  const executeClick = useCallback(async (overrideCoords?: { x: number; y: number }) => {
    setIsExecuting(true);
    
    try {
      const startTime = Date.now();
      let targetCoords = overrideCoords || localConfig.coordinates;
      
      // Resolve coordinates based on mode
      if (localConfig.coordinateMode === 'ocr_result' && pendingOcrResult) {
        targetCoords = await resolveOcrCoordinates(pendingOcrResult);
      } else if (localConfig.coordinateMode === 'element_detection') {
        targetCoords = await resolveElementCoordinates(localConfig.elementSelector);
      }
      
      // Apply pre-click delay
      if (localConfig.delay.before > 0) {
        await new Promise(resolve => setTimeout(resolve, localConfig.delay.before));
      }
      
      // Execute click with retry logic
      let success = false;
      let error: string | undefined;
      let attempts = 0;
      const maxAttempts = localConfig.retryConfig.enabled ? localConfig.retryConfig.maxRetries + 1 : 1;
      
      while (!success && attempts < maxAttempts) {
        try {
          await performClick(targetCoords, localConfig.clickType);
          success = true;
        } catch (err) {
          error = err.message;
          attempts++;
          
          if (attempts < maxAttempts && localConfig.retryConfig.enabled) {
            await new Promise(resolve => setTimeout(resolve, localConfig.retryConfig.retryDelay));
          }
        }
      }
      
      // Apply post-click delay
      if (localConfig.delay.after > 0) {
        await new Promise(resolve => setTimeout(resolve, localConfig.delay.after));
      }
      
      const duration = Date.now() - startTime;
      
      // Validation
      let validationResult;
      if (success && localConfig.validation.enabled) {
        validationResult = await validateClickResult();
      }
      
      const result: ClickResult = {
        success,
        coordinates: targetCoords,
        duration,
        timestamp: new Date().toISOString(),
        clickType: localConfig.clickType,
        error,
        validationResult
      };
      
      setLastResult(result);
      setExecutionHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
      
      // Trigger Unity AI event
      await triggerUnityAIEvent(success ? 'click_completed' : 'click_failed', {
        node_id: id,
        result: result,
        coordinates: targetCoords
      });
      
    } catch (error) {
      console.error('Click execution failed:', error);
      
      const result: ClickResult = {
        success: false,
        coordinates: localConfig.coordinates,
        duration: Date.now() - Date.now(),
        timestamp: new Date().toISOString(),
        clickType: localConfig.clickType,
        error: error.message
      };
      
      setLastResult(result);
      
      // Trigger error event
      await triggerUnityAIEvent('click_error', {
        node_id: id,
        error: error.message,
        coordinates: localConfig.coordinates
      });
    } finally {
      setIsExecuting(false);
    }
  }, [localConfig, pendingOcrResult, id]);
  
  // Perform actual click via API
  const performClick = async (coords: { x: number; y: number }, clickType: string) => {
    const response = await fetch('/api/automation/click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        x: coords.x,
        y: coords.y,
        click_type: clickType,
        target_coordinates: localConfig.targetCoordinates // For drag operations
      })
    });
    
    if (!response.ok) {
      throw new Error(`Click API error: ${response.statusText}`);
    }
    
    return await response.json();
  };
  
  // Resolve coordinates from OCR result
  const resolveOcrCoordinates = async (ocrResult: any): Promise<{ x: number; y: number }> => {
    if (!localConfig.ocrTextTarget) {
      throw new Error('No OCR text target specified');
    }
    
    // Find matching text in OCR result
    const matchingWord = ocrResult.words?.find((word: any) => 
      word.text.toLowerCase().includes(localConfig.ocrTextTarget.toLowerCase())
    );
    
    if (!matchingWord) {
      throw new Error(`Text "${localConfig.ocrTextTarget}" not found in OCR result`);
    }
    
    // Calculate center of bounding box
    const [x1, y1, x2, y2] = matchingWord.bbox;
    return {
      x: Math.round((x1 + x2) / 2),
      y: Math.round((y1 + y2) / 2)
    };
  };
  
  // Resolve coordinates from element detection
  const resolveElementCoordinates = async (selector: string): Promise<{ x: number; y: number }> => {
    const response = await fetch('/api/automation/find-element', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        selector: selector,
        method: 'css' // or 'xpath', 'text', etc.
      })
    });
    
    if (!response.ok) {
      throw new Error(`Element detection failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    return {
      x: result.center_x,
      y: result.center_y
    };
  };
  
  // Validate click result
  const validateClickResult = async (): Promise<{ passed: boolean; details: string }> => {
    // Wait for expected change
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // This would implement actual validation logic
    // For now, return a simple success
    return {
      passed: true,
      details: 'Click validation passed'
    };
  };
  
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
          source: 'click_action_node',
          node_id: id,
          payload: payload,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to trigger Unity AI event:', error);
    }
  };
  
  // Handle OCR result input
  const handleOcrResult = useCallback((ocrResult: any) => {
    setPendingOcrResult(ocrResult);
    
    // Auto-trigger click if enabled
    if (localConfig.autoTrigger && localConfig.coordinateMode === 'ocr_result') {
      setTimeout(() => executeClick(), 100);
    }
  }, [localConfig.autoTrigger, localConfig.coordinateMode, executeClick]);
  
  // Configuration handlers
  const handleConfigChange = (key: string, value: any) => {
    setLocalConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const handleCoordinatesChange = (axis: 'x' | 'y', value: number) => {
    setLocalConfig(prev => ({
      ...prev,
      coordinates: {
        ...prev.coordinates,
        [axis]: value
      }
    }));
  };
  
  const handleDelayChange = (type: 'before' | 'after', value: number) => {
    setLocalConfig(prev => ({
      ...prev,
      delay: {
        ...prev.delay,
        [type]: value
      }
    }));
  };
  
  const handleRetryConfigChange = (key: string, value: any) => {
    setLocalConfig(prev => ({
      ...prev,
      retryConfig: {
        ...prev.retryConfig,
        [key]: value
      }
    }));
  };
  
  const handleValidationChange = (key: string, value: any) => {
    setLocalConfig(prev => ({
      ...prev,
      validation: {
        ...prev.validation,
        [key]: value
      }
    }));
  };
  
  // Get click type icon
  const getClickTypeIcon = (type: string) => {
    switch (type) {
      case 'double': return <MousePointer2 className="w-3 h-3" />;
      case 'right': return <Hand className="w-3 h-3" />;
      case 'drag': return <Target className="w-3 h-3" />;
      default: return <MousePointer className="w-3 h-3" />;
    }
  };
  
  // Get result status color
  const getResultStatusColor = (success: boolean) => {
    return success ? 'text-green-600' : 'text-red-600';
  };
  
  // Effects
  useEffect(() => {
    // Listen for OCR results from connected nodes
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'ocr_result' && event.data.targetNode === id) {
        handleOcrResult(event.data.result);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [id, handleOcrResult]);
  
  return (
    <div className={`click-action-node ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      {/* Input/Output Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="trigger-input"
        className="w-3 h-3 bg-blue-500"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="ocr-input"
        className="w-3 h-3 bg-purple-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="success-output"
        className="w-3 h-3 bg-green-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="result-output"
        className="w-3 h-3 bg-orange-500"
      />
      
      <Card className="w-80">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {getClickTypeIcon(localConfig.clickType)}
              {data.label || 'Click Action'}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                {localConfig.clickType}
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
          {/* Coordinates Display */}
          <div className="p-2 bg-blue-50 rounded text-xs">
            <div className="font-medium flex items-center gap-1">
              <Target className="w-3 h-3" />
              Target Coordinates ({localConfig.coordinateMode})
            </div>
            <div className="text-gray-600 mt-1">
              {localConfig.coordinateMode === 'ocr_result' && localConfig.ocrTextTarget ? (
                `Text: "${localConfig.ocrTextTarget}"`
              ) : localConfig.coordinateMode === 'element_detection' && localConfig.elementSelector ? (
                `Element: ${localConfig.elementSelector}`
              ) : (
                `X: ${localConfig.coordinates.x}, Y: ${localConfig.coordinates.y}`
              )}
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => executeClick()}
              disabled={isExecuting}
              className="flex items-center gap-1"
            >
              {isExecuting ? (
                <Clock className="w-3 h-3 animate-spin" />
              ) : (
                <Play className="w-3 h-3" />
              )}
              {isExecuting ? 'Executing...' : 'Execute Click'}
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
          
          {/* Last Result */}
          {lastResult && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm flex items-center gap-1">
                  {lastResult.success ? (
                    <CheckCircle className="w-3 h-3 text-green-600" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-red-600" />
                  )}
                  Last Execution
                </div>
                <Badge 
                  variant={lastResult.success ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {lastResult.success ? 'Success' : 'Failed'}
                </Badge>
              </div>
              
              <div className="p-2 bg-gray-50 rounded text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-medium">Coordinates:</span>
                    <br />
                    {lastResult.coordinates.x}, {lastResult.coordinates.y}
                  </div>
                  <div>
                    <span className="font-medium">Duration:</span>
                    <br />
                    {lastResult.duration}ms
                  </div>
                </div>
                
                {lastResult.error && (
                  <div className="mt-2 text-red-600">
                    <span className="font-medium">Error:</span> {lastResult.error}
                  </div>
                )}
                
                {lastResult.validationResult && (
                  <div className="mt-2">
                    <span className="font-medium">Validation:</span>
                    <span className={lastResult.validationResult.passed ? 'text-green-600' : 'text-red-600'}>
                      {lastResult.validationResult.passed ? ' Passed' : ' Failed'}
                    </span>
                  </div>
                )}
                
                <div className="mt-2 text-gray-500">
                  {new Date(lastResult.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          )}
          
          {/* Settings Panel */}
          {showSettings && (
            <div className="space-y-3 p-3 bg-gray-50 rounded">
              <div className="text-sm font-medium">Click Configuration</div>
              
              {/* Click Type */}
              <div>
                <Label className="text-xs">Click Type</Label>
                <Select
                  value={localConfig.clickType}
                  onValueChange={(value) => handleConfigChange('clickType', value)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single Click</SelectItem>
                    <SelectItem value="double">Double Click</SelectItem>
                    <SelectItem value="right">Right Click</SelectItem>
                    <SelectItem value="middle">Middle Click</SelectItem>
                    <SelectItem value="drag">Drag</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Coordinate Mode */}
              <div>
                <Label className="text-xs">Coordinate Mode</Label>
                <Select
                  value={localConfig.coordinateMode}
                  onValueChange={(value) => handleConfigChange('coordinateMode', value)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="absolute">Absolute</SelectItem>
                    <SelectItem value="relative">Relative</SelectItem>
                    <SelectItem value="ocr_result">OCR Result</SelectItem>
                    <SelectItem value="element_detection">Element Detection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Coordinate Inputs */}
              {localConfig.coordinateMode === 'absolute' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">X Coordinate</Label>
                    <Input
                      type="number"
                      value={localConfig.coordinates.x}
                      onChange={(e) => handleCoordinatesChange('x', parseInt(e.target.value) || 0)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Y Coordinate</Label>
                    <Input
                      type="number"
                      value={localConfig.coordinates.y}
                      onChange={(e) => handleCoordinatesChange('y', parseInt(e.target.value) || 0)}
                      className="text-xs"
                    />
                  </div>
                </div>
              )}
              
              {/* OCR Text Target */}
              {localConfig.coordinateMode === 'ocr_result' && (
                <div>
                  <Label className="text-xs">Target Text</Label>
                  <Input
                    value={localConfig.ocrTextTarget}
                    onChange={(e) => handleConfigChange('ocrTextTarget', e.target.value)}
                    className="text-xs"
                    placeholder="Text to find and click"
                  />
                </div>
              )}
              
              {/* Element Selector */}
              {localConfig.coordinateMode === 'element_detection' && (
                <div>
                  <Label className="text-xs">Element Selector</Label>
                  <Input
                    value={localConfig.elementSelector}
                    onChange={(e) => handleConfigChange('elementSelector', e.target.value)}
                    className="text-xs"
                    placeholder="CSS selector or XPath"
                  />
                </div>
              )}
              
              {/* Delays */}
              <div>
                <Label className="text-xs font-medium">Delays (ms)</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div>
                    <Label className="text-xs">Before</Label>
                    <Input
                      type="number"
                      value={localConfig.delay.before}
                      onChange={(e) => handleDelayChange('before', parseInt(e.target.value) || 0)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">After</Label>
                    <Input
                      type="number"
                      value={localConfig.delay.after}
                      onChange={(e) => handleDelayChange('after', parseInt(e.target.value) || 0)}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
              
              {/* Retry Configuration */}
              <div>
                <Label className="text-xs font-medium">Retry Configuration</Label>
                <div className="space-y-2 mt-1">
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={localConfig.retryConfig.enabled}
                      onChange={(e) => handleRetryConfigChange('enabled', e.target.checked)}
                      className="w-3 h-3"
                    />
                    Enable retries
                  </label>
                  
                  {localConfig.retryConfig.enabled && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Max Retries</Label>
                        <Input
                          type="number"
                          value={localConfig.retryConfig.maxRetries}
                          onChange={(e) => handleRetryConfigChange('maxRetries', parseInt(e.target.value) || 0)}
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Retry Delay (ms)</Label>
                        <Input
                          type="number"
                          value={localConfig.retryConfig.retryDelay}
                          onChange={(e) => handleRetryConfigChange('retryDelay', parseInt(e.target.value) || 0)}
                          className="text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Validation */}
              <div>
                <Label className="text-xs font-medium">Validation</Label>
                <div className="space-y-2 mt-1">
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={localConfig.validation.enabled}
                      onChange={(e) => handleValidationChange('enabled', e.target.checked)}
                      className="w-3 h-3"
                    />
                    Enable validation
                  </label>
                  
                  {localConfig.validation.enabled && (
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs">Expected Change</Label>
                        <Input
                          value={localConfig.validation.expectedChange}
                          onChange={(e) => handleValidationChange('expectedChange', e.target.value)}
                          className="text-xs"
                          placeholder="Description of expected change"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Timeout (ms)</Label>
                        <Input
                          type="number"
                          value={localConfig.validation.timeout}
                          onChange={(e) => handleValidationChange('timeout', parseInt(e.target.value) || 0)}
                          className="text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Execution History */}
          {executionHistory.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Recent Executions</div>
              <div className="max-h-20 overflow-y-auto space-y-1">
                {executionHistory.slice(0, 3).map((result, index) => (
                  <div key={index} className="text-xs p-1 bg-gray-50 rounded flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      {result.success ? (
                        <CheckCircle className="w-3 h-3 text-green-600" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-red-600" />
                      )}
                      {result.clickType} at {result.coordinates.x},{result.coordinates.y}
                    </span>
                    <span className="text-gray-500">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </span>
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

export default ClickActionNode;
export type { ClickActionNodeData, ClickResult };