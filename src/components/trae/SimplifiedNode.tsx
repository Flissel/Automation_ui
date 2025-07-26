
/**
 * Simplified Node Component - n8n Style
 * Enhanced with C4 Architecture-compliant connectors and improved layout
 */

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, Database, Wifi, Zap } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { NodeDependency } from '../../types/dataFlow';
import ManualTriggerNode from './workflow/ManualTriggerNode';

interface SimplifiedNodeData {
  label: string;
  type: string;
  category: string;
  status?: 'idle' | 'running' | 'completed' | 'error';
  config?: Record<string, any>;
  dependencies?: NodeDependency[];
  input?: any;
  output?: any;
  inputs?: Array<{
    id: string;
    label: string;
    description?: string;
    accepts?: string[];
    type?: string;
  }>;
  outputs?: Array<{
    id: string;
    label: string;
    description?: string;
    type?: string;
    provides?: string;
  }>;
  description?: string;
  icon?: string;
  color?: string;
}

interface SimplifiedNodeProps {
  data: SimplifiedNodeData;
  id: string;
  selected?: boolean;
}

// C4 Architecture Connector Styling with improved positioning
const getConnectorStyle = (type: string, provides?: string, accepts?: string[]) => {
  // Config connections (purple) - WebSocket Service → Live Desktop Interface
  if (type === 'config' || provides === 'websocket_connection') {
    return {
      className: 'w-4 h-4 bg-purple-500 border-2 border-white shadow-lg hover:bg-purple-600 transition-all duration-200 hover:scale-110',
      icon: <Wifi className="w-2 h-2 text-white" />,
      color: '#8b5cf6'
    };
  }
  
  // Trigger connections (green) - Manual Trigger → Live Desktop Interface
  if (type === 'trigger' || provides === 'execution_start' || provides === 'webhook_payload') {
    return {
      className: 'w-4 h-4 bg-emerald-500 border-2 border-white shadow-lg hover:bg-emerald-600 transition-all duration-200 hover:scale-110',
      icon: <Zap className="w-2 h-2 text-white" />,
      color: '#10b981'
    };
  }
  
  // Filesystem connections (orange) - Actions → Filesystem Bridge
  if (provides === 'filesystem_bridge' || accepts?.includes('filesystem_bridge')) {
    return {
      className: 'w-4 h-4 bg-orange-500 border-2 border-white shadow-lg hover:bg-orange-600 transition-all duration-200 hover:scale-110',
      icon: <Database className="w-2 h-2 text-white" />,
      color: '#f97316'
    };
  }
  
  // Data connections (blue) - Interface → Actions → Logic → Results
  return {
    className: 'w-4 h-4 bg-blue-500 border-2 border-white shadow-lg hover:bg-blue-600 transition-all duration-200 hover:scale-110',
    icon: null,
    color: '#3b82f6'
  };
};

const SimplifiedNode: React.FC<SimplifiedNodeProps> = ({ data, id, selected }) => {
  // Special handling for manual trigger nodes
  if (data.type === 'manual_trigger') {
    return <ManualTriggerNode data={data} id={id} selected={selected} />;
  }

  const isConfigNode = data.category === 'config';
  const isTriggerNode = data.category === 'triggers';
  const isInterfaceNode = data.category === 'interface';
  
  // Get Lucide icon component
  const IconComponent = data.icon && (LucideIcons as any)[data.icon] 
    ? (LucideIcons as any)[data.icon] 
    : LucideIcons.Settings;

  // Check if node is properly configured
  const isConfigured = data.config && Object.keys(data.config).length > 0 
    ? Object.values(data.config).some(v => v !== undefined && v !== '')
    : false;

  // Check dependencies status
  const missingDependencies = data.dependencies?.filter(dep => dep.status === 'missing') || [];
  const hasMissingDeps = missingDependencies.length > 0;

  // Node styling based on category with C4 architecture colors
  const getNodeStyle = () => {
    if (isConfigNode) {
      return `bg-gradient-to-br from-purple-50 to-violet-100 border-2 border-purple-300 shadow-lg shadow-purple-200/30`;
    }
    
    if (isInterfaceNode) {
      return `bg-gradient-to-br from-slate-50 to-gray-100 border-2 border-slate-300 shadow-lg shadow-slate-200/30`;
    }
    
    switch (data.category) {
      case 'triggers':
        return `bg-gradient-to-br from-emerald-50 to-green-100 border-2 border-emerald-300 shadow-lg shadow-emerald-200/30`;
      case 'actions':
        return `bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-300 shadow-lg shadow-blue-200/30`;
      case 'logic':
        return `bg-gradient-to-br from-cyan-50 to-teal-100 border-2 border-cyan-300 shadow-lg shadow-cyan-200/30`;
      case 'results':
        return `bg-gradient-to-br from-amber-50 to-yellow-100 border-2 border-amber-300 shadow-lg shadow-amber-200/30`;
      default:
        return `bg-gradient-to-br from-gray-50 to-slate-100 border-2 border-gray-300 shadow-lg shadow-gray-200/30`;
    }
  };

  // Calculate handle positions for multiple inputs/outputs with improved spacing
  const inputHandles = data.inputs || (data.input ? [{ 
    id: 'input', 
    name: 'Input',
    label: 'Input', 
    description: data.input.description,
    type: data.input.type,
    accepts: data.input.accepts
  }] : []);
  
  const outputHandles = data.outputs || (data.output ? [{ 
    id: 'output', 
    name: 'Output',
    label: 'Output', 
    description: data.output.description,
    type: data.output.type,
    provides: data.output.provides
  }] : []);
  
  // Improved height calculation with better spacing - make Live Desktop Interface bigger
  const baseHeight = isInterfaceNode ? 140 : 100;
  const handleSpacing = 35;
  const maxHandles = Math.max(inputHandles.length, outputHandles.length);
  const nodeHeight = Math.max(baseHeight, baseHeight + (maxHandles - 1) * handleSpacing);

  // Calculate handle positions with better distribution
  const getHandlePosition = (index: number, total: number) => {
    if (total === 1) return nodeHeight / 2;
    const startOffset = 45;
    const availableSpace = nodeHeight - 90; // Leave space at top and bottom
    return startOffset + (index * (availableSpace / (total - 1)));
  };

  return (
    <div className={`
      relative rounded-xl px-5 py-4 ${isInterfaceNode ? 'min-w-[300px] max-w-[340px]' : 'min-w-[240px] max-w-[280px]'} transition-all duration-300 hover:shadow-xl cursor-pointer
      ${getNodeStyle()}
      ${selected ? 'ring-2 ring-blue-500 ring-offset-2 scale-105' : 'hover:scale-102'}
    `} style={{ height: `${nodeHeight}px` }}>
      
      {/* Multiple Input Handles - only for non-trigger nodes */}
      {!isTriggerNode && !isConfigNode && inputHandles.map((input, index) => {
        const topPosition = getHandlePosition(index, inputHandles.length);
        const connectorStyle = getConnectorStyle(input.type || 'data', undefined, input.accepts);
        
        return (
          <Handle
            key={input.id}
            id={input.id}
            type="target"
            position={Position.Left}
            className={connectorStyle.className}
            style={{ left: -8, top: topPosition }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              {connectorStyle.icon || <div className="w-1 h-1 bg-white rounded-full" />}
            </div>
            {/* Improved tooltip positioning */}
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 text-xs text-gray-700 whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity bg-white px-3 py-2 rounded-lg shadow-xl z-30 border border-gray-200 pointer-events-none">
              <div className="font-semibold text-gray-800">{input.name || input.label}</div>
              {input.description && (
                <div className="text-gray-600 mt-1">{input.description}</div>
              )}
              {input.accepts && (
                <div className="text-xs text-blue-600 mt-1 font-medium">
                  Accepts: {input.accepts.join(', ')}
                </div>
              )}
              {/* Tooltip arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
            </div>
          </Handle>
        );
      })}

      {/* Main Node Content with improved layout */}
      <div className="flex flex-col h-full">
        {/* Header Section */}
        <div className="flex items-center space-x-3 mb-3">
          <div className="flex-shrink-0 p-2.5 bg-white/80 rounded-lg shadow-sm">
            <IconComponent className="w-6 h-6" style={{ color: data.color || '#6b7280' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-gray-800 truncate">{data.label}</div>
            <div className="text-xs text-gray-600 capitalize">{data.category}</div>
          </div>
        </div>

        {/* C4 Architecture Badge */}
        {isInterfaceNode && (
          <div className="mb-2">
            <Badge variant="outline" className="text-xs px-2 py-1 bg-slate-100 border-slate-300">
              Central Hub
            </Badge>
          </div>
        )}
        
        {/* Status Badges with improved layout */}
        <div className="flex flex-wrap gap-1 mb-3">
          {!isConfigured && (
            <Badge variant="secondary" className="text-xs px-2 py-1 bg-amber-100 text-amber-800 border-amber-200">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Not configured
            </Badge>
          )}
          
          {hasMissingDeps && (
            <Badge variant="destructive" className="text-xs px-2 py-1">
              <XCircle className="w-3 h-3 mr-1" />
              Missing deps
            </Badge>
          )}
          
          {data.status && (
            <Badge 
              variant={data.status === 'completed' ? 'default' : data.status === 'error' ? 'destructive' : 'secondary'}
              className="text-xs px-2 py-1"
            >
              {data.status}
            </Badge>
          )}
        </div>

        {/* Input/Output Labels for Interface Nodes with improved spacing */}
        {isInterfaceNode && (inputHandles.length > 1 || outputHandles.length > 1) && (
          <div className="flex-1 flex justify-between text-xs">
            <div className="space-y-2">
              {inputHandles.map((input, index) => {
                const connectorStyle = getConnectorStyle(input.type || 'data', undefined, input.accepts);
                return (
                  <div key={input.id} className="text-gray-600 flex items-center">
                    <div 
                      className="w-2 h-2 rounded-full mr-2 shadow-sm" 
                      style={{ backgroundColor: connectorStyle.color }}
                    />
                    <span className="truncate">{input.name || input.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="space-y-2 text-right">
              {outputHandles.map((output, index) => {
                const connectorStyle = getConnectorStyle(output.type || 'data', output.provides);
                return (
                  <div key={output.id} className="text-gray-600 flex items-center justify-end">
                    <span className="truncate">{output.name || output.label}</span>
                    <div 
                      className="w-2 h-2 rounded-full ml-2 shadow-sm" 
                      style={{ backgroundColor: connectorStyle.color }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dependency Indicators with improved styling */}
        {data.dependencies && data.dependencies.length > 0 && (
          <div className="mt-auto pt-2 border-t border-gray-200">
            <div className="text-xs space-y-1">
              {data.dependencies.slice(0, 2).map((dep, index) => (
                <div key={dep.id} className="flex items-center space-x-2 text-gray-600">
                  {dep.status === 'connected' ? (
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                  )}
                  <span className="truncate">{dep.description}</span>
                </div>
              ))}
              {data.dependencies.length > 2 && (
                <div className="text-gray-500 text-xs">
                  +{data.dependencies.length - 2} more dependencies
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Multiple Output Handles - only for non-config nodes */}
      {!isConfigNode && outputHandles.map((output, index) => {
        const topPosition = getHandlePosition(index, outputHandles.length);
        const connectorStyle = getConnectorStyle(output.type || 'data', output.provides);
        
        return (
          <Handle
            key={output.id}
            id={output.id}
            type="source"
            position={Position.Right}
            className={connectorStyle.className}
            style={{ right: -8, top: topPosition }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              {connectorStyle.icon || <div className="w-1 h-1 bg-white rounded-full" />}
            </div>
            {/* Improved tooltip positioning */}
            <div className="absolute -top-12 right-1/2 transform translate-x-1/2 text-xs text-gray-700 whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity bg-white px-3 py-2 rounded-lg shadow-xl z-30 border border-gray-200 pointer-events-none">
              <div className="font-semibold text-gray-800">{output.name || output.label}</div>
              {output.description && (
                <div className="text-gray-600 mt-1">{output.description}</div>
              )}
              {output.provides && (
                <div className="text-xs text-green-600 mt-1 font-medium">
                  Provides: {output.provides}
                </div>
              )}
              {/* Tooltip arrow */}
              <div className="absolute top-full right-1/2 transform translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
            </div>
          </Handle>
        );
      })}

      {/* Config Node Output Handle - Special styling for WebSocket Service */}
      {isConfigNode && outputHandles.map((output, index) => {
        const topPosition = getHandlePosition(index, outputHandles.length);
        const connectorStyle = getConnectorStyle('config', output.provides);
        
        return (
          <Handle
            key={output.id}
            id={output.id}
            type="source"
            position={Position.Right}
            className={connectorStyle.className}
            style={{ right: -8, top: topPosition }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              {connectorStyle.icon}
            </div>
            {/* Improved tooltip for config nodes */}
            <div className="absolute -top-12 right-1/2 transform translate-x-1/2 text-xs text-gray-700 whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity bg-purple-50 px-3 py-2 rounded-lg shadow-xl z-30 border border-purple-200 pointer-events-none">
              <div className="font-semibold text-purple-800">{output.name || output.label}</div>
              {output.description && (
                <div className="text-gray-600 mt-1">{output.description}</div>
              )}
              <div className="text-xs text-purple-600 mt-1 font-medium">
                Config Connection
              </div>
              {/* Tooltip arrow */}
              <div className="absolute top-full right-1/2 transform translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-purple-50"></div>
            </div>
          </Handle>
        );
      })}
    </div>
  );
};

export default SimplifiedNode;
