/**
 * TRAE Visual Workflow System - Standardized Connection Validator
 * 
 * New connection validator that handles the standardized node interface
 * Author: TRAE Development Team
 * Version: 3.0.0
 */

import { 
  DataType, 
  ConnectionType, 
  StandardInputPort, 
  StandardOutputPort, 
  ConnectionValidation, 
  ConnectionInfo,
  isCompatibleConnection,
  getConnectionTypeIcon,
  getDataTypeIcon
} from '../types/standardNodeInterface';

// ============================================================================
// CONNECTION VALIDATION ENGINE
// ============================================================================

export class StandardizedConnectionValidator {
  private nodeTemplates: Map<string, any> = new Map();
  private connectionRules: Map<string, any> = new Map();
  
  constructor() {
    this.initializeDefaultRules();
  }
  
  /**
   * Register a node template for validation
   */
  registerNodeTemplate(template: any): void {
    this.nodeTemplates.set(template.id, template);
    
    // Register connection rules if provided
    if (template.connection_rules) {
      this.connectionRules.set(template.id, template.connection_rules);
    }
  }
  
  /**
   * Validate a connection between two nodes
   */
  validateConnection(connectionInfo: ConnectionInfo): ConnectionValidation {
    try {
      const sourceTemplate = this.nodeTemplates.get(connectionInfo.source_node_id);
      const targetTemplate = this.nodeTemplates.get(connectionInfo.target_node_id);
      
      if (!sourceTemplate || !targetTemplate) {
        return {
          valid: false,
          error: 'Unknown node template(s)',
          compatibility_score: 0
        };
      }
      
      // Find source and target ports
      const sourcePort = this.findOutputPort(sourceTemplate, connectionInfo.source_port_id);
      const targetPort = this.findInputPort(targetTemplate, connectionInfo.target_port_id);
      
      if (!sourcePort || !targetPort) {
        return {
          valid: false,
          error: 'Port not found',
          compatibility_score: 0
        };
      }
      
      // Check basic compatibility
      const basicValidation = isCompatibleConnection(sourcePort, targetPort);
      if (!basicValidation.valid) {
        return basicValidation;
      }
      
      // Check advanced rules
      const advancedValidation = this.validateAdvancedRules(
        sourceTemplate, 
        targetTemplate, 
        sourcePort, 
        targetPort, 
        connectionInfo
      );
      
      if (!advancedValidation.valid) {
        return advancedValidation;
      }
      
      // Check for circular dependencies
      const circularValidation = this.checkCircularDependency(connectionInfo);
      if (!circularValidation.valid) {
        return circularValidation;
      }
      
      return {
        valid: true,
        compatibility_score: this.calculateCompatibilityScore(sourcePort, targetPort),
        auto_fix_suggestion: this.generateAutoFixSuggestion(sourcePort, targetPort)
      };
      
    } catch (error) {
      return {
        valid: false,
        error: `Validation error: ${error.message}`,
        compatibility_score: 0
      };
    }
  }
  
  /**
   * Validate multiple connections for a workflow
   */
  validateWorkflowConnections(connections: ConnectionInfo[]): {
    valid: boolean;
    results: Map<string, ConnectionValidation>;
    summary: {
      total: number;
      valid: number;
      invalid: number;
      warnings: number;
    };
  } {
    const results = new Map<string, ConnectionValidation>();
    let validCount = 0;
    let warningCount = 0;
    
    for (const connection of connections) {
      const connectionId = `${connection.source_node_id}:${connection.source_port_id}->${connection.target_node_id}:${connection.target_port_id}`;
      const validation = this.validateConnection(connection);
      
      results.set(connectionId, validation);
      
      if (validation.valid) {
        validCount++;
        if (validation.warning) {
          warningCount++;
        }
      }
    }
    
    return {
      valid: validCount === connections.length,
      results,
      summary: {
        total: connections.length,
        valid: validCount,
        invalid: connections.length - validCount,
        warnings: warningCount
      }
    };
  }
  
  /**
   * Get suggested connections for a node
   */
  getSuggestedConnections(
    sourceNodeId: string, 
    sourcePortId: string, 
    availableNodes: any[]
  ): Array<{
    targetNodeId: string;
    targetPortId: string;
    compatibility: number;
    reason: string;
  }> {
    const suggestions: Array<{
      targetNodeId: string;
      targetPortId: string;
      compatibility: number;
      reason: string;
    }> = [];
    
    const sourceTemplate = this.nodeTemplates.get(sourceNodeId);
    if (!sourceTemplate) return suggestions;
    
    const sourcePort = this.findOutputPort(sourceTemplate, sourcePortId);
    if (!sourcePort) return suggestions;
    
    for (const targetNode of availableNodes) {
      if (targetNode.id === sourceNodeId) continue; // Skip self
      
      const targetTemplate = this.nodeTemplates.get(targetNode.type);
      if (!targetTemplate) continue;
      
      for (const targetPort of targetTemplate.inputs || []) {
        const connectionInfo: ConnectionInfo = {
          source_node_id: sourceNodeId,
          target_node_id: targetNode.id,
          source_port_id: sourcePortId,
          target_port_id: targetPort.id,
          connection_type: this.getBestConnectionType(sourcePort, targetPort),
          data_type: sourcePort.data_type
        };
        
        const validation = this.validateConnection(connectionInfo);
        
        if (validation.valid && validation.compatibility_score > 0.5) {
          suggestions.push({
            targetNodeId: targetNode.id,
            targetPortId: targetPort.id,
            compatibility: validation.compatibility_score,
            reason: this.generateConnectionReason(sourcePort, targetPort)
          });
        }
      }
    }
    
    // Sort by compatibility score
    suggestions.sort((a, b) => b.compatibility - a.compatibility);
    
    return suggestions.slice(0, 10); // Return top 10 suggestions
  }
  
  /**
   * Auto-fix connection issues
   */
  autoFixConnection(connectionInfo: ConnectionInfo): {
    fixed: boolean;
    newConnection?: ConnectionInfo;
    changes: string[];
  } {
    const changes: string[] = [];
    let newConnection = { ...connectionInfo };
    let fixed = false;
    
    const validation = this.validateConnection(connectionInfo);
    
    if (validation.valid) {
      return { fixed: true, newConnection, changes: [] };
    }
    
    // Try to fix data type mismatches
    if (validation.error?.includes('Data type mismatch')) {
      const sourceTemplate = this.nodeTemplates.get(connectionInfo.source_node_id);
      const targetTemplate = this.nodeTemplates.get(connectionInfo.target_node_id);
      
      if (sourceTemplate && targetTemplate) {
        const sourcePort = this.findOutputPort(sourceTemplate, connectionInfo.source_port_id);
        const targetPort = this.findInputPort(targetTemplate, connectionInfo.target_port_id);
        
        if (sourcePort && targetPort && targetPort.auto_convert) {
          // Auto-conversion is available
          changes.push(`Auto-conversion enabled: ${sourcePort.data_type} → ${targetPort.data_type}`);
          fixed = true;
        }
      }
    }
    
    // Try to fix connection type mismatches
    if (validation.error?.includes('Connection type mismatch')) {
      const sourceTemplate = this.nodeTemplates.get(connectionInfo.source_node_id);
      const targetTemplate = this.nodeTemplates.get(connectionInfo.target_node_id);
      
      if (sourceTemplate && targetTemplate) {
        const sourcePort = this.findOutputPort(sourceTemplate, connectionInfo.source_port_id);
        const targetPort = this.findInputPort(targetTemplate, connectionInfo.target_port_id);
        
        if (sourcePort && targetPort) {
          const bestConnectionType = this.getBestConnectionType(sourcePort, targetPort);
          if (bestConnectionType) {
            newConnection.connection_type = bestConnectionType;
            changes.push(`Connection type changed to: ${bestConnectionType}`);
            fixed = true;
          }
        }
      }
    }
    
    return { fixed, newConnection: fixed ? newConnection : undefined, changes };
  }
  
  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================
  
  private findOutputPort(template: any, portId: string): StandardOutputPort | null {
    return template.outputs?.find((port: any) => port.id === portId) || null;
  }
  
  private findInputPort(template: any, portId: string): StandardInputPort | null {
    return template.inputs?.find((port: any) => port.id === portId) || null;
  }
  
  private validateAdvancedRules(
    sourceTemplate: any,
    targetTemplate: any,
    sourcePort: StandardOutputPort,
    targetPort: StandardInputPort,
    connectionInfo: ConnectionInfo
  ): ConnectionValidation {
    
    // Check if target port already has maximum connections
    if (targetPort.accepts_multiple === false) {
      // TODO: Check existing connections to this port
      // This would require access to the current workflow state
    }
    
    // Check connection rules
    const sourceRules = this.connectionRules.get(sourceTemplate.id);
    const targetRules = this.connectionRules.get(targetTemplate.id);
    
    if (sourceRules?.forbidden_connections?.includes(targetTemplate.id)) {
      return {
        valid: false,
        error: `Connection forbidden by source node rules: ${sourceTemplate.label} → ${targetTemplate.label}`
      };
    }
    
    if (targetRules?.forbidden_connections?.includes(sourceTemplate.id)) {
      return {
        valid: false,
        error: `Connection forbidden by target node rules: ${sourceTemplate.label} → ${targetTemplate.label}`
      };
    }
    
    // Check trigger flow rules
    if (connectionInfo.connection_type === ConnectionType.TRIGGER_FLOW) {
      if (!sourcePort.triggers_execution) {
        return {
          valid: false,
          error: 'Source port does not support trigger execution',
          warning: 'Consider using a data flow connection instead'
        };
      }
    }
    
    return { valid: true };
  }
  
  private checkCircularDependency(connectionInfo: ConnectionInfo): ConnectionValidation {
    // TODO: Implement circular dependency detection
    // This would require access to the full workflow graph
    
    // For now, just check direct self-connection
    if (connectionInfo.source_node_id === connectionInfo.target_node_id) {
      return {
        valid: false,
        error: 'Self-connections are not allowed'
      };
    }
    
    return { valid: true };
  }
  
  private calculateCompatibilityScore(
    sourcePort: StandardOutputPort, 
    targetPort: StandardInputPort
  ): number {
    let score = 0;
    
    // Data type compatibility
    if (sourcePort.data_type === targetPort.data_type) {
      score += 0.4;
    } else if (sourcePort.data_type === DataType.ANY || targetPort.data_type === DataType.ANY) {
      score += 0.3;
    } else if (targetPort.auto_convert) {
      score += 0.2;
    }
    
    // Connection type compatibility
    const commonTypes = sourcePort.connection_types.filter(type => 
      targetPort.connection_types.includes(type)
    );
    score += (commonTypes.length / Math.max(sourcePort.connection_types.length, targetPort.connection_types.length)) * 0.3;
    
    // Priority matching
    if (sourcePort.is_primary && targetPort.priority === 1) {
      score += 0.2;
    }
    
    // Stream capability
    if (sourcePort.stream_capable && targetPort.accepts_multiple) {
      score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }
  
  private getBestConnectionType(
    sourcePort: StandardOutputPort, 
    targetPort: StandardInputPort
  ): ConnectionType | null {
    const commonTypes = sourcePort.connection_types.filter(type => 
      targetPort.connection_types.includes(type)
    );
    
    if (commonTypes.length === 0) return null;
    
    // Prioritize connection types
    const priority = [
      ConnectionType.TRIGGER_FLOW,
      ConnectionType.DATA_FLOW,
      ConnectionType.SEQUENTIAL,
      ConnectionType.EVENT_FLOW,
      ConnectionType.CONDITIONAL,
      ConnectionType.PARALLEL,
      ConnectionType.STREAM,
      ConnectionType.FEEDBACK,
      ConnectionType.ERROR_HANDLING
    ];
    
    for (const type of priority) {
      if (commonTypes.includes(type)) {
        return type;
      }
    }
    
    return commonTypes[0];
  }
  
  private generateAutoFixSuggestion(
    sourcePort: StandardOutputPort, 
    targetPort: StandardInputPort
  ): string | undefined {
    if (sourcePort.data_type !== targetPort.data_type && targetPort.auto_convert) {
      return `Auto-conversion available: ${sourcePort.data_type} → ${targetPort.data_type}`;
    }
    
    if (sourcePort.triggers_execution && targetPort.connection_types.includes(ConnectionType.TRIGGER_FLOW)) {
      return 'Consider using trigger flow connection for better execution control';
    }
    
    return undefined;
  }
  
  private generateConnectionReason(
    sourcePort: StandardOutputPort, 
    targetPort: StandardInputPort
  ): string {
    const reasons: string[] = [];
    
    if (sourcePort.data_type === targetPort.data_type) {
      reasons.push('Perfect data type match');
    } else if (targetPort.auto_convert) {
      reasons.push('Auto-conversion available');
    }
    
    const commonTypes = sourcePort.connection_types.filter(type => 
      targetPort.connection_types.includes(type)
    );
    
    if (commonTypes.length > 0) {
      reasons.push(`Compatible connection types: ${commonTypes.join(', ')}`);
    }
    
    if (sourcePort.is_primary && targetPort.priority === 1) {
      reasons.push('Primary port connection');
    }
    
    return reasons.join('; ') || 'Compatible connection';
  }
  
  private initializeDefaultRules(): void {
    // Initialize default connection rules
    // These can be overridden by specific node templates
  }
}

// ============================================================================
// CONNECTION HELPER FUNCTIONS
// ============================================================================

/**
 * Create a connection info object
 */
export function createConnectionInfo(
  sourceNodeId: string,
  sourcePortId: string,
  targetNodeId: string,
  targetPortId: string,
  connectionType: ConnectionType = ConnectionType.DATA_FLOW,
  dataType: DataType = DataType.ANY
): ConnectionInfo {
  return {
    source_node_id: sourceNodeId,
    target_node_id: targetNodeId,
    source_port_id: sourcePortId,
    target_port_id: targetPortId,
    connection_type: connectionType,
    data_type: dataType
  };
}

/**
 * Get visual representation of connection
 */
export function getConnectionVisual(connectionType: ConnectionType): {
  icon: string;
  color: string;
  style: string;
} {
  switch (connectionType) {
    case ConnectionType.TRIGGER_FLOW:
      return { icon: '⚡', color: '#FF5722', style: 'solid' };
    case ConnectionType.DATA_FLOW:
      return { icon: '📊', color: '#2196F3', style: 'solid' };
    case ConnectionType.EVENT_FLOW:
      return { icon: '📡', color: '#9C27B0', style: 'dashed' };
    case ConnectionType.SEQUENTIAL:
      return { icon: '➡️', color: '#4CAF50', style: 'solid' };
    case ConnectionType.CONDITIONAL:
      return { icon: '🔀', color: '#FF9800', style: 'dotted' };
    case ConnectionType.PARALLEL:
      return { icon: '⚡', color: '#607D8B', style: 'double' };
    case ConnectionType.STREAM:
      return { icon: '🌊', color: '#00BCD4', style: 'wavy' };
    case ConnectionType.FEEDBACK:
      return { icon: '🔄', color: '#795548', style: 'curved' };
    case ConnectionType.ERROR_HANDLING:
      return { icon: '⚠️', color: '#F44336', style: 'dashed' };
    default:
      return { icon: '🔗', color: '#9E9E9E', style: 'solid' };
  }
}

/**
 * Validate port compatibility quickly
 */
export function quickPortCompatibility(
  sourceDataType: DataType,
  targetDataType: DataType,
  sourceConnectionTypes: ConnectionType[],
  targetConnectionTypes: ConnectionType[]
): boolean {
  // Check data type compatibility
  const dataTypeCompatible = 
    sourceDataType === targetDataType ||
    sourceDataType === DataType.ANY ||
    targetDataType === DataType.ANY;
  
  // Check connection type compatibility
  const connectionTypeCompatible = sourceConnectionTypes.some(type => 
    targetConnectionTypes.includes(type)
  );
  
  return dataTypeCompatible && connectionTypeCompatible;
}

// ============================================================================
// EXPORT DEFAULT INSTANCE
// ============================================================================

export const connectionValidator = new StandardizedConnectionValidator();