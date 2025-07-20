
import React, { useState, useCallback } from 'react';
import { Node, Edge } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, Square, Pause, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export interface ExecutionResult {
  nodeId: string;
  success: boolean;
  output?: any;
  error?: string;
  duration: number;
  timestamp: Date;
}

export interface ExecutionState {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  currentNodeId?: string;
  progress: number;
  results: ExecutionResult[];
  startTime?: Date;
  endTime?: Date;
}

interface ExecutionEngineProps {
  nodes: Node[];
  edges: Edge[];
  onNodeUpdate: (nodeId: string, updates: any) => void;
  onExecutionComplete?: (results: ExecutionResult[]) => void;
}

export const ExecutionEngine: React.FC<ExecutionEngineProps> = ({
  nodes,
  edges,
  onNodeUpdate,
  onExecutionComplete
}) => {
  const [executionState, setExecutionState] = useState<ExecutionState>({
    status: 'idle',
    progress: 0,
    results: []
  });

  const findExecutionOrder = useCallback(() => {
    const visited = new Set<string>();
    const order: string[] = [];
    
    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      // Add dependencies first
      const incomingEdges = edges.filter(e => e.target === nodeId);
      incomingEdges.forEach(edge => visit(edge.source));
      
      order.push(nodeId);
    };

    // Start with trigger nodes
    const triggerNodes = nodes.filter(n => 
      (n.data as any)?.type === 'manual_trigger' || (n.data as any)?.type === 'schedule_trigger'
    );
    
    triggerNodes.forEach(node => visit(node.id));
    
    return order;
  }, [nodes, edges]);

  const executeNode = async (nodeId: string): Promise<ExecutionResult> => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const startTime = Date.now();
    
    // Update node status to running
    onNodeUpdate(nodeId, { status: 'running' });

    try {
      // Simulate node execution based on type
      let output: any = {};
      let duration = 1000; // Default 1 second

      switch ((node.data as any)?.type) {
        case 'manual_trigger':
          output = { triggered: true };
          duration = 100;
          break;
          
        case 'websocket_comm':
          // Simulate WebSocket connection
          await new Promise(resolve => setTimeout(resolve, 500));
          output = { connected: true, url: (node.data as any)?.config?.url };
          duration = 500;
          break;
          
        case 'live_desktop':
          // Simulate desktop capture
          await new Promise(resolve => setTimeout(resolve, 1000));
          output = { 
            captured: true, 
            resolution: `${(node.data as any)?.config?.width || 1920}x${(node.data as any)?.config?.height || 1080}` 
          };
          duration = 1000;
          break;
          
        case 'click_action':
          await new Promise(resolve => setTimeout(resolve, 300));
          output = { 
            clicked: true, 
            coordinates: { x: (node.data as any)?.config?.x || 100, y: (node.data as any)?.config?.y || 100 } 
          };
          duration = 300;
          break;
          
        case 'type_text_action':
          await new Promise(resolve => setTimeout(resolve, 500));
          output = { typed: true, text: (node.data as any)?.config?.text || 'Default text' };
          duration = 500;
          break;
          
        case 'delay':
          const delayTime = ((node.data as any)?.config?.duration || 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delayTime));
          output = { delayed: true, duration: delayTime };
          duration = delayTime;
          break;
          
        case 'if_condition':
          // Simulate condition check
          await new Promise(resolve => setTimeout(resolve, 200));
          const conditionMet = Math.random() > 0.5; // Random for demo
          output = { condition: conditionMet };
          duration = 200;
          break;
          
        default:
          await new Promise(resolve => setTimeout(resolve, 500));
          output = { executed: true };
          duration = 500;
      }

      const actualDuration = Date.now() - startTime;
      
      // Update node status to completed
      onNodeUpdate(nodeId, { 
        status: 'completed',
        executionResult: { success: true, output, duration: actualDuration }
      });

      return {
        nodeId,
        success: true,
        output,
        duration: actualDuration,
        timestamp: new Date()
      };
      
    } catch (error) {
      const actualDuration = Date.now() - startTime;
      
      // Update node status to error
      onNodeUpdate(nodeId, { 
        status: 'error',
        executionResult: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      });

      return {
        nodeId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: actualDuration,
        timestamp: new Date()
      };
    }
  };

  const startExecution = useCallback(async () => {
    if (executionState.status === 'running') return;

    const executionOrder = findExecutionOrder();
    if (executionOrder.length === 0) {
      toast.error('No nodes to execute');
      return;
    }

    // Reset all node statuses
    nodes.forEach(node => {
      onNodeUpdate(node.id, { status: 'idle' });
    });

    setExecutionState({
      status: 'running',
      progress: 0,
      results: [],
      startTime: new Date()
    });

    toast.success('Workflow execution started');

    const results: ExecutionResult[] = [];

    try {
      for (let i = 0; i < executionOrder.length; i++) {
        const nodeId = executionOrder[i];
        
        setExecutionState(prev => ({
          ...prev,
          currentNodeId: nodeId,
          progress: (i / executionOrder.length) * 100
        }));

        const result = await executeNode(nodeId);
        results.push(result);

        if (!result.success) {
          // Stop execution on error
          setExecutionState(prev => ({
            ...prev,
            status: 'error',
            progress: 100,
            results,
            endTime: new Date()
          }));
          
          toast.error(`Execution failed at node: ${nodeId}`);
          return;
        }
      }

      // Execution completed successfully
      setExecutionState({
        status: 'completed',
        progress: 100,
        results,
        startTime: executionState.startTime,
        endTime: new Date()
      });

      toast.success('Workflow execution completed successfully');
      
      if (onExecutionComplete) {
        onExecutionComplete(results);
      }

    } catch (error) {
      setExecutionState(prev => ({
        ...prev,
        status: 'error',
        progress: 100,
        results,
        endTime: new Date()
      }));
      
      toast.error('Execution failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }, [executionState.status, nodes, edges, findExecutionOrder, executeNode, onNodeUpdate, onExecutionComplete]);

  const stopExecution = useCallback(() => {
    setExecutionState(prev => ({
      ...prev,
      status: 'idle',
      currentNodeId: undefined,
      endTime: new Date()
    }));
    
    // Reset all node statuses
    nodes.forEach(node => {
      onNodeUpdate(node.id, { status: 'idle' });
    });
    
    toast.info('Execution stopped');
  }, [nodes, onNodeUpdate]);

  const resetExecution = useCallback(() => {
    setExecutionState({
      status: 'idle',
      progress: 0,
      results: []
    });
    
    // Reset all node statuses
    nodes.forEach(node => {
      onNodeUpdate(node.id, { status: 'idle' });
    });
  }, [nodes, onNodeUpdate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Play className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return <Square className="w-4 h-4" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Execution Engine</span>
          <Badge className={getStatusColor(executionState.status)}>
            {getStatusIcon(executionState.status)}
            <span className="ml-2 capitalize">{executionState.status}</span>
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Control Buttons */}
        <div className="flex space-x-2">
          <Button
            onClick={startExecution}
            disabled={executionState.status === 'running'}
            className="flex-1"
          >
            <Play className="w-4 h-4 mr-2" />
            Execute
          </Button>
          
          <Button
            variant="outline"
            onClick={stopExecution}
            disabled={executionState.status !== 'running'}
          >
            <Square className="w-4 h-4 mr-2" />
            Stop
          </Button>
          
          <Button
            variant="outline"
            onClick={resetExecution}
            disabled={executionState.status === 'running'}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>

        {/* Progress Bar */}
        {executionState.status === 'running' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(executionState.progress)}%</span>
            </div>
            <Progress value={executionState.progress} className="w-full" />
            {executionState.currentNodeId && (
              <p className="text-sm text-muted-foreground">
                Executing: {String(nodes.find(n => n.id === executionState.currentNodeId)?.data?.label || 'Unknown Node')}
              </p>
            )}
          </div>
        )}

        {/* Execution Results */}
        {executionState.results.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Execution Results</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {executionState.results.map((result, index) => (
                <div key={index} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                  <span>{String(nodes.find(n => n.id === result.nodeId)?.data?.label || 'Unknown Node')}</span>
                  <div className="flex items-center space-x-2">
                    <Badge variant={result.success ? 'default' : 'destructive'}>
                      {result.success ? 'Success' : 'Error'}
                    </Badge>
                    <span className="text-muted-foreground">{result.duration}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Execution Stats */}
        {executionState.endTime && (
          <div className="text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Total Duration:</span>
              <span>
                {executionState.startTime && executionState.endTime
                  ? `${executionState.endTime.getTime() - executionState.startTime.getTime()}ms`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Success Rate:</span>
              <span>
                {executionState.results.length > 0
                  ? `${Math.round((executionState.results.filter(r => r.success).length / executionState.results.length) * 100)}%`
                  : 'N/A'}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
