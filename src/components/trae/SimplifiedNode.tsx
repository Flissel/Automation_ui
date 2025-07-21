
/**
 * Simplified Node Component - n8n Style
 * Single input/output with clear visual indicators
 */

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { NodeDependency } from '../../types/dataFlow';

interface SimplifiedNodeData {
  label: string;
  type: string;
  category: string;
  status?: 'idle' | 'running' | 'completed' | 'error';
  config?: Record<string, any>;
  dependencies?: NodeDependency[];
  input?: any;
  output?: any;
  description?: string;
  icon?: string;
  color?: string;
}

interface SimplifiedNodeProps {
  data: SimplifiedNodeData;
  id: string;
  selected?: boolean;
}

const SimplifiedNode: React.FC<SimplifiedNodeProps> = ({ data, id, selected }) => {
  const isConfigNode = data.category === 'config';
  const isTriggerNode = data.category === 'triggers';
  
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

  // Node styling based on category
  const getNodeStyle = () => {
    if (isConfigNode) {
      return `bg-gradient-to-br from-purple-100 to-violet-200 border-2 border-purple-400 shadow-lg shadow-purple-200/50`;
    }
    
    switch (data.category) {
      case 'triggers':
        return `bg-gradient-to-br from-emerald-100 to-green-200 border-2 border-emerald-400 shadow-lg shadow-emerald-200/50`;
      case 'actions':
        return `bg-gradient-to-br from-blue-100 to-indigo-200 border-2 border-blue-400 shadow-lg shadow-blue-200/50`;
      case 'logic':
        return `bg-gradient-to-br from-cyan-100 to-teal-200 border-2 border-cyan-400 shadow-lg shadow-cyan-200/50`;
      default:
        return `bg-gradient-to-br from-gray-100 to-slate-200 border-2 border-gray-400 shadow-lg shadow-gray-200/50`;
    }
  };

  return (
    <div className={`
      relative rounded-lg px-4 py-3 min-w-[200px] transition-all duration-300 hover:shadow-xl cursor-pointer
      ${getNodeStyle()}
      ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
    `}>
      
      {/* Input Handle - only for non-trigger nodes */}
      {!isTriggerNode && !isConfigNode && data.input && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 bg-gray-400 border-2 border-white shadow-md"
          style={{ left: -6 }}
        >
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity bg-white px-2 py-1 rounded shadow">
            {data.input.description}
          </div>
        </Handle>
      )}

      {/* Main Node Content */}
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0 p-2 bg-white/60 rounded-lg">
          <IconComponent className="w-6 h-6" style={{ color: data.color }} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold text-gray-800">{data.label}</div>
          <div className="text-xs text-gray-600">{data.category}</div>
          
          {/* Status Badges */}
          <div className="flex items-center mt-1 space-x-1">
            {!isConfigured && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                <AlertTriangle className="w-3 h-3 mr-1 text-amber-500" />
                Not configured
              </Badge>
            )}
            
            {hasMissingDeps && (
              <Badge variant="destructive" className="text-xs px-2 py-0.5">
                <XCircle className="w-3 h-3 mr-1" />
                Missing deps
              </Badge>
            )}
            
            {data.status && (
              <Badge 
                variant={data.status === 'completed' ? 'default' : data.status === 'error' ? 'destructive' : 'secondary'}
                className="text-xs px-2 py-0.5"
              >
                {data.status}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Dependency Indicators */}
      {data.dependencies && data.dependencies.length > 0 && (
        <div className="mt-2 text-xs">
          {data.dependencies.map((dep, index) => (
            <div key={dep.id} className="flex items-center space-x-1 text-gray-600">
              {dep.status === 'connected' ? (
                <CheckCircle className="w-3 h-3 text-green-500" />
              ) : (
                <XCircle className="w-3 h-3 text-red-500" />
              )}
              <span>Requires: {dep.description}</span>
            </div>
          ))}
        </div>
      )}

      {/* Output Handle - only for non-config nodes */}
      {!isConfigNode && data.output && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-gray-400 border-2 border-white shadow-md"
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

export default SimplifiedNode;
