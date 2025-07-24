/**
 * Manual Trigger Node Component
 * Interactive trigger node with execution options and visual feedback
 */

import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Play, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface ManualTriggerData {
  label: string;
  type: string;
  category: string;
  status?: 'idle' | 'running' | 'completed' | 'error';
  config?: {
    button_text?: string;
  };
  lastExecution?: {
    timestamp: string;
    success: boolean;
    duration?: number;
  };
  output?: any;
}

interface ManualTriggerNodeProps {
  data: ManualTriggerData;
  id: string;
  selected?: boolean;
}

const ManualTriggerNode: React.FC<ManualTriggerNodeProps> = ({ data, id, selected }) => {
  const [executionType, setExecutionType] = useState<'single' | 'workflow' | null>(null);
  
  const buttonText = data.config?.button_text || 'Execute';
  const isLoading = data.status === 'running';
  const isSuccess = data.status === 'completed';
  const isError = data.status === 'error';

  const handleExecute = () => {
    setExecutionType('single');
    
    // Create execution data
    const executionData = {
      triggered: true,
      timestamp: new Date().toISOString(),
      nodeId: id,
      executionType: 'single'
    };

    // Here we would trigger the actual execution
    // For now, just simulate the execution
    console.log(`Manual trigger executed: single`, executionData);
    
    // This would be connected to the execution engine
    // onExecute?.(executionData, 'single');
  };

  const getNodeStyle = () => {
    if (isLoading) {
      return 'bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-blue-400 shadow-lg shadow-blue-200/50';
    }
    if (isSuccess) {
      return 'bg-gradient-to-br from-green-100 to-emerald-200 border-2 border-green-400 shadow-lg shadow-green-200/50';
    }
    if (isError) {
      return 'bg-gradient-to-br from-red-100 to-red-200 border-2 border-red-400 shadow-lg shadow-red-200/50';
    }
    return 'bg-gradient-to-br from-emerald-100 to-green-200 border-2 border-emerald-400 shadow-lg shadow-emerald-200/50';
  };

  const getButtonIcon = () => {
    if (isLoading) return <Loader2 className="w-4 h-4 animate-spin" />;
    if (isSuccess) return <CheckCircle className="w-4 h-4" />;
    if (isError) return <XCircle className="w-4 h-4" />;
    return <Play className="w-4 h-4" />;
  };

  const getButtonText = () => {
    if (isLoading) return 'Executing...';
    if (isSuccess) return 'Executed';
    if (isError) return 'Failed';
    return buttonText;
  };

  return (
    <div className={`
      relative rounded-lg px-4 py-3 min-w-[220px] transition-all duration-300 hover:shadow-xl
      ${getNodeStyle()}
      ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
    `}>
      
      {/* Main Node Content */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 p-2 bg-white/60 rounded-lg">
            <Play className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-800">{data.label}</div>
            <div className="text-xs text-gray-600">trigger</div>
          </div>
        </div>
        
        {/* Status Badge */}
        {data.status && data.status !== 'idle' && (
          <Badge 
            variant={isSuccess ? 'default' : isError ? 'destructive' : 'secondary'}
            className="text-xs"
          >
            {data.status}
          </Badge>
        )}
      </div>

      {/* Execute Button */}
      <div className="flex justify-center">
        <button 
          onClick={handleExecute}
          disabled={isLoading}
          className={`
            p-3 rounded-full transition-all duration-200 shadow-md hover:shadow-lg
            ${isLoading ? 'bg-blue-500 cursor-not-allowed' : 
              isSuccess ? 'bg-green-500 hover:bg-green-600' : 
              isError ? 'bg-red-500 hover:bg-red-600' : 
              'bg-emerald-500 hover:bg-emerald-600 hover:scale-105'}
          `}
        >
          {getButtonIcon()}
        </button>
      </div>

      {/* Last Execution Info */}
      {data.lastExecution && (
        <div className="mt-2 text-xs text-gray-600 bg-white/40 rounded px-2 py-1">
          <div className="flex items-center justify-between">
            <span>Last executed:</span>
            <span className="font-mono">
              {new Date(data.lastExecution.timestamp).toLocaleTimeString()}
            </span>
          </div>
          {data.lastExecution.duration && (
            <div className="flex items-center justify-between">
              <span>Duration:</span>
              <span className="font-mono">{data.lastExecution.duration}ms</span>
            </div>
          )}
        </div>
      )}

      {/* Output Handle */}
      {data.output && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-emerald-400 border-2 border-white shadow-md"
          style={{ right: -6 }}
        >
          <div className="absolute -top-6 right-1/2 transform translate-x-1/2 text-xs text-gray-600 whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity bg-white px-2 py-1 rounded shadow">
            {data.output.description}
          </div>
        </Handle>
      )}
    </div>
  );
};

export default ManualTriggerNode;