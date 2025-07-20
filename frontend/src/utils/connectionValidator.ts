/**
 * TRAE Visual Workflow System - Connection Validation
 * 
 * Comprehensive connection validation and edge management system
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import { Node, Edge, Connection } from 'reactflow';
import { NodeData, DataType, InputPort, OutputPort } from '../types';
import { getNodeTemplate } from '../config/nodeTemplates';

// ============================================================================
// CONNECTION VALIDATION TYPES
// ============================================================================

export interface ConnectionValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

export interface EdgeWithData extends Edge {
  sourceHandle: string;
  targetHandle: string;
  data?: {
    sourcePort: OutputPort;
    targetPort: InputPort;
    dataType: DataType;
    validated: boolean;
  };
}

export interface ConnectionInfo {
  sourceNode: Node<NodeData>;
  targetNode: Node<NodeData>;
  sourcePort: OutputPort;
  targetPort: InputPort;
  connection: Connection;
}

// ============================================================================
// DATA TYPE COMPATIBILITY MATRIX
// ============================================================================

const DATA_TYPE_COMPATIBILITY: Record<DataType, DataType[]> = {
  [DataType.ANY]: [DataType.ANY, DataType.STRING, DataType.NUMBER, DataType.BOOLEAN, DataType.OBJECT, DataType.ARRAY, DataType.IMAGE],
  [DataType.STRING]: [DataType.ANY, DataType.STRING],
  [DataType.NUMBER]: [DataType.ANY, DataType.NUMBER, DataType.STRING],
  [DataType.BOOLEAN]: [DataType.ANY, DataType.BOOLEAN, DataType.STRING],
  [DataType.OBJECT]: [DataType.ANY, DataType.OBJECT, DataType.STRING],
  [DataType.ARRAY]: [DataType.ANY, DataType.ARRAY, DataType.STRING],
  [DataType.IMAGE]: [DataType.ANY, DataType.IMAGE, DataType.STRING]
};

// ============================================================================
// CONNECTION VALIDATION FUNCTIONS
// ============================================================================

/**
 * Check if two data types are compatible
 */
export function areDataTypesCompatible(sourceType: DataType, targetType: DataType): boolean {
  const compatibleTypes = DATA_TYPE_COMPATIBILITY[sourceType] || [];
  return compatibleTypes.includes(targetType);
}

/**
 * Validate a connection between two nodes
 */
export function validateConnection(
  connection: Connection,
  nodes: Node<NodeData>[]
): ConnectionValidationResult {
  // Find source and target nodes
  const sourceNode = nodes.find(node => node.id === connection.source);
  const targetNode = nodes.find(node => node.id === connection.target);

  if (!sourceNode || !targetNode) {
    return {
      valid: false,
      error: 'Source or target node not found'
    };
  }

  // Prevent self-connections
  if (connection.source === connection.target) {
    return {
      valid: false,
      error: 'Cannot connect node to itself'
    };
  }

  // Find source and target ports
  const sourcePort = sourceNode.data.outputs.find(
    port => port.id === connection.sourceHandle
  );
  const targetPort = targetNode.data.inputs.find(
    port => port.id === connection.targetHandle
  );

  if (!sourcePort) {
    return {
      valid: false,
      error: `Source port '${connection.sourceHandle}' not found`
    };
  }

  if (!targetPort) {
    return {
      valid: false,
      error: `Target port '${connection.targetHandle}' not found`
    };
  }

  // Check data type compatibility
  if (!areDataTypesCompatible(sourcePort.type, targetPort.type)) {
    return {
      valid: false,
      error: `Incompatible data types: ${sourcePort.type} → ${targetPort.type}`
    };
  }

  // Check if target port already has a connection (if it's not multi-input)
  // This would require checking existing edges, which should be passed as parameter
  // For now, we'll assume this check is done elsewhere

  return {
    valid: true,
    warning: sourcePort.type !== targetPort.type ? 
      `Type conversion: ${sourcePort.type} → ${targetPort.type}` : undefined
  };
}

/**
 * Validate all connections in a workflow
 */
export function validateAllConnections(
  nodes: Node<NodeData>[],
  edges: Edge[]
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const edge of edges) {
    const connection: Connection = {
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || '',
      targetHandle: edge.targetHandle || ''
    };

    const result = validateConnection(connection, nodes);
    
    if (!result.valid && result.error) {
      errors.push(`Edge ${edge.id}: ${result.error}`);
    }
    
    if (result.warning) {
      warnings.push(`Edge ${edge.id}: ${result.warning}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Check for circular dependencies in the workflow
 */
export function detectCircularDependencies(
  nodes: Node<NodeData>[],
  edges: Edge[]
): { hasCircularDependency: boolean; cycles: string[][] } {
  const graph = new Map<string, string[]>();
  const cycles: string[][] = [];

  // Build adjacency list
  for (const node of nodes) {
    graph.set(node.id, []);
  }

  for (const edge of edges) {
    const neighbors = graph.get(edge.source) || [];
    neighbors.push(edge.target);
    graph.set(edge.source, neighbors);
  }

  // DFS to detect cycles
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const currentPath: string[] = [];

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    currentPath.push(nodeId);

    const neighbors = graph.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = currentPath.indexOf(neighbor);
        const cycle = currentPath.slice(cycleStart).concat([neighbor]);
        cycles.push(cycle);
        return true;
      }
    }

    recursionStack.delete(nodeId);
    currentPath.pop();
    return false;
  }

  for (const nodeId of graph.keys()) {
    if (!visited.has(nodeId)) {
      dfs(nodeId);
    }
  }

  return {
    hasCircularDependency: cycles.length > 0,
    cycles
  };
}

// ============================================================================
// EDGE CREATION AND MANAGEMENT
// ============================================================================

/**
 * Create a properly formatted edge with validation data
 */
export function createValidatedEdge(
  connection: Connection,
  nodes: Node<NodeData>[]
): EdgeWithData | null {
  const validation = validateConnection(connection, nodes);
  
  if (!validation.valid) {
    return null;
  }

  const sourceNode = nodes.find(node => node.id === connection.source);
  const targetNode = nodes.find(node => node.id === connection.target);
  
  if (!sourceNode || !targetNode) {
    return null;
  }

  const sourcePort = sourceNode.data.outputs.find(
    port => port.id === connection.sourceHandle
  );
  const targetPort = targetNode.data.inputs.find(
    port => port.id === connection.targetHandle
  );

  if (!sourcePort || !targetPort) {
    return null;
  }

  const edgeId = `${connection.source}-${connection.sourceHandle}-${connection.target}-${connection.targetHandle}`;

  return {
    id: edgeId,
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle || '',
    targetHandle: connection.targetHandle || '',
    type: 'smoothstep',
    animated: false,
    style: {
      stroke: getEdgeColor(sourcePort.type),
      strokeWidth: 2
    },
    data: {
      sourcePort,
      targetPort,
      dataType: sourcePort.type,
      validated: true
    }
  };
}

/**
 * Get edge color based on data type
 */
function getEdgeColor(dataType: DataType): string {
  switch (dataType) {
    case DataType.STRING: return '#3b82f6';
    case DataType.NUMBER: return '#10b981';
    case DataType.BOOLEAN: return '#f59e0b';
    case DataType.OBJECT: return '#8b5cf6';
    case DataType.ARRAY: return '#ef4444';
    case DataType.IMAGE: return '#06b6d4';
    case DataType.FILE: return '#84cc16';
    case DataType.ANY: return '#6b7280';
    default: return '#6b7280';
  }
}

/**
 * Get edge style based on data type and connection status
 */
export function getEdgeStyle(
  dataType: DataType,
  isActive: boolean = false,
  hasData: boolean = false
): React.CSSProperties {
  const baseColor = getEdgeColor(dataType);
  
  return {
    stroke: baseColor,
    strokeWidth: isActive ? 3 : 2,
    strokeDasharray: hasData ? '0' : '5,5',
    opacity: isActive ? 1 : 0.7,
    animation: hasData ? 'pulse 2s infinite' : 'none',
  };
}

/**
 * Get data type icon for edge labels
 */
export function getDataTypeIcon(dataType: DataType): string {
  switch (dataType) {
    case DataType.STRING: return '📝';
    case DataType.NUMBER: return '🔢';
    case DataType.BOOLEAN: return '✅';
    case DataType.OBJECT: return '📦';
    case DataType.ARRAY: return '📋';
    case DataType.IMAGE: return '🖼️';
    case DataType.FILE: return '📁';
    case DataType.ANY: return '🔗';
    default: return '❓';
  }
}

/**
 * Check if a target port can accept more connections
 */
export function canPortAcceptConnection(
  targetNodeId: string,
  targetPortId: string,
  nodes: Node<NodeData>[],
  edges: Edge[]
): boolean {
  const targetNode = nodes.find(node => node.id === targetNodeId);
  if (!targetNode) return false;

  const targetPort = targetNode.data.inputs.find(port => port.id === targetPortId);
  if (!targetPort) return false;

  // Check if port allows multiple connections (default: single connection)
  const allowMultiple = targetPort.allowMultiple || false;
  
  if (allowMultiple) {
    return true;
  }

  // Check if port already has a connection
  const existingConnection = edges.find(
    edge => edge.target === targetNodeId && edge.targetHandle === targetPortId
  );

  return !existingConnection;
}

/**
 * Get all possible connections for a source port
 */
export function getPossibleConnections(
  sourceNodeId: string,
  sourcePortId: string,
  nodes: Node<NodeData>[],
  edges: Edge[]
): Array<{ nodeId: string; portId: string; compatible: boolean }> {
  const sourceNode = nodes.find(node => node.id === sourceNodeId);
  if (!sourceNode) return [];

  const sourcePort = sourceNode.data.outputs.find(port => port.id === sourcePortId);
  if (!sourcePort) return [];

  const possibleConnections: Array<{ nodeId: string; portId: string; compatible: boolean }> = [];

  for (const targetNode of nodes) {
    if (targetNode.id === sourceNodeId) continue; // Skip self

    for (const targetPort of targetNode.data.inputs) {
      const canConnect = canPortAcceptConnection(targetNode.id, targetPort.id, nodes, edges);
      const compatible = areDataTypesCompatible(sourcePort.type, targetPort.type);
      
      if (canConnect) {
        possibleConnections.push({
          nodeId: targetNode.id,
          portId: targetPort.id,
          compatible
        });
      }
    }
  }

  return possibleConnections;
}

// ============================================================================
// HANDLE POSITIONING UTILITIES
// ============================================================================

/**
 * Calculate handle positions for a node based on its inputs and outputs
 */
export function calculateHandlePositions(
  nodeData: NodeData,
  nodeWidth: number = 200,
  nodeHeight: number = 100
): {
  inputs: Array<{ id: string; x: number; y: number }>;
  outputs: Array<{ id: string; x: number; y: number }>;
} {
  const inputPositions: Array<{ id: string; x: number; y: number }> = [];
  const outputPositions: Array<{ id: string; x: number; y: number }> = [];

  // Calculate input positions (left side)
  const inputCount = nodeData.inputs.length;
  if (inputCount > 0) {
    const inputSpacing = nodeHeight / (inputCount + 1);
    nodeData.inputs.forEach((input, index) => {
      inputPositions.push({
        id: input.id,
        x: 0,
        y: inputSpacing * (index + 1)
      });
    });
  }

  // Calculate output positions (right side)
  const outputCount = nodeData.outputs.length;
  if (outputCount > 0) {
    const outputSpacing = nodeHeight / (outputCount + 1);
    nodeData.outputs.forEach((output, index) => {
      outputPositions.push({
        id: output.id,
        x: nodeWidth,
        y: outputSpacing * (index + 1)
      });
    });
  }

  return {
    inputs: inputPositions,
    outputs: outputPositions
  };
}

/**
 * Get handle style based on data type and connection state
 */
export function getHandleStyle(
  dataType: DataType,
  isConnected: boolean = false,
  isCompatible: boolean = true
): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    width: '12px',
    height: '12px',
    border: '2px solid',
    borderRadius: '50%',
    transition: 'all 0.2s ease'
  };

  const typeColors: Record<DataType, string> = {
    [DataType.ANY]: '#6b7280',
    [DataType.STRING]: '#3b82f6',
    [DataType.NUMBER]: '#10b981',
    [DataType.BOOLEAN]: '#f59e0b',
    [DataType.OBJECT]: '#8b5cf6',
    [DataType.ARRAY]: '#ef4444',
    [DataType.IMAGE]: '#ec4899'
  };

  const color = typeColors[dataType] || '#6b7280';

  return {
    ...baseStyle,
    borderColor: color,
    backgroundColor: isConnected ? color : 'white',
    opacity: isCompatible ? 1 : 0.5,
    transform: isConnected ? 'scale(1.1)' : 'scale(1)'
  };
}