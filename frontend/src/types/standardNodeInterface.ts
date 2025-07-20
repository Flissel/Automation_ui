/**
 * TRAE Visual Workflow System - Standardized Node Interface
 * 
 * New standardized interface for all node types to fix connectivity issues
 * Author: TRAE Development Team
 * Version: 3.0.0
 */

// ============================================================================
// CORE ENUMS AND TYPES
// ============================================================================

export enum DataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  ARRAY = 'array',
  IMAGE = 'image',
  FILE = 'file',
  ANY = 'any',
  // New specialized types
  TRIGGER = 'trigger',
  COORDINATES = 'coordinates',
  REGION = 'region',
  EVENT = 'event'
}

export enum ConnectionType {
  // Data flow connections
  DATA_FLOW = 'data_flow',           // Standard data passing
  TRIGGER_FLOW = 'trigger_flow',     // Execution triggers
  EVENT_FLOW = 'event_flow',         // Event-based connections
  
  // Control flow connections
  SEQUENTIAL = 'sequential',         // Execute in order
  CONDITIONAL = 'conditional',       // Execute based on condition
  PARALLEL = 'parallel',            // Execute simultaneously
  
  // Special flow connections
  STREAM = 'stream',                // Continuous data stream
  FEEDBACK = 'feedback',            // Loop back connections
  ERROR_HANDLING = 'error_handling' // Error flow paths
}

export enum ExecutionType {
  SYNC = 'sync',           // Synchronous execution
  ASYNC = 'async',         // Asynchronous execution
  STREAM = 'stream',       // Streaming/continuous execution
  EVENT_DRIVEN = 'event_driven' // Event-driven execution
}

export enum NodeCategory {
  TRIGGERS = 'triggers',
  ACTIONS = 'actions',
  PROCESSING = 'processing',
  LOGIC = 'logic',
  OUTPUT = 'output',
  DESKTOP = 'desktop',
  AUTOMATION = 'automation'
}

// ============================================================================
// VALIDATION AND CONFIGURATION
// ============================================================================

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message?: string;
  validator?: (value: any) => boolean;
}

export interface ConfigField {
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'object' | 'array';
  label: string;
  description?: string;
  required?: boolean;
  default?: any;
  options?: any[];
  validation?: ValidationRule[];
  min?: number;
  max?: number;
  step?: number;
}

export interface ConfigSchema {
  [key: string]: ConfigField;
}

// ============================================================================
// STANDARDIZED PORT INTERFACES
// ============================================================================

export interface StandardInputPort {
  id: string;
  name: string;
  data_type: DataType;
  required: boolean;
  description: string;
  default_value?: any;
  validation?: ValidationRule[];
  connection_types: ConnectionType[];
  // New properties for better connectivity
  accepts_multiple?: boolean;
  auto_convert?: boolean;
  priority?: number;
}

export interface StandardOutputPort {
  id: string;
  name: string;
  data_type: DataType;
  description: string;
  connection_types: ConnectionType[];
  // New properties for better connectivity
  triggers_execution?: boolean;
  is_primary?: boolean;
  conditional?: boolean;
  stream_capable?: boolean;
}

// ============================================================================
// EXECUTION CONTEXT SYSTEM
// ============================================================================

export interface ExecutionContext {
  // Core identification
  execution_id: string;
  workflow_id: string;
  node_id: string;
  
  // Input data from connected nodes
  inputs: Record<string, any>;
  
  // Node configuration
  config: Record<string, any>;
  
  // Execution metadata
  metadata: {
    trigger_source?: string;
    execution_time?: number;
    retry_count?: number;
    parent_execution?: string;
    connection_path?: string[];
    data_lineage?: string[];
  };
  
  // Service access
  services: Record<string, any>;
  
  // State management
  state: Record<string, any>;
  
  // Context propagation
  context_data?: Record<string, any>;
}

export interface ExecutionResult {
  success: boolean;
  outputs: Record<string, any>;
  error?: string;
  metadata?: Record<string, any>;
  next_nodes?: string[];
  state_updates?: Record<string, any>;
  // New properties for better flow control
  execution_time?: number;
  retry_suggested?: boolean;
  context_updates?: Record<string, any>;
}

// ============================================================================
// STANDARDIZED NODE TEMPLATE
// ============================================================================

export interface StandardNodeTemplate {
  // Core identification
  id: string;
  type: string;
  category: NodeCategory;
  version: string;
  
  // Display properties
  label: string;
  description: string;
  icon: string;
  color: string;
  
  // Execution properties
  execution_type: ExecutionType;
  service_dependencies: string[];
  timeout_ms?: number;
  retry_count?: number;
  
  // Standardized I/O
  inputs: StandardInputPort[];
  outputs: StandardOutputPort[];
  
  // Configuration
  config_schema: ConfigSchema;
  default_config: Record<string, any>;
  
  // Connectivity rules
  connection_rules?: {
    max_inputs?: number;
    max_outputs?: number;
    required_connections?: string[];
    forbidden_connections?: string[];
    auto_connect_types?: ConnectionType[];
  };
  
  // Execution function reference
  execution_function?: string;
  
  // Documentation and help
  documentation?: {
    usage_examples?: string[];
    common_patterns?: string[];
    troubleshooting?: string[];
  };
}

// ============================================================================
// CONNECTION VALIDATION
// ============================================================================

export interface ConnectionValidation {
  valid: boolean;
  error?: string;
  warning?: string;
  auto_fix_suggestion?: string;
  compatibility_score?: number;
}

export interface ConnectionInfo {
  source_node_id: string;
  target_node_id: string;
  source_port_id: string;
  target_port_id: string;
  connection_type: ConnectionType;
  data_type: DataType;
  metadata?: Record<string, any>;
}

// ============================================================================
// WORKFLOW EXECUTION TYPES
// ============================================================================

export interface WorkflowExecutionPlan {
  execution_id: string;
  workflow_id: string;
  execution_order: string[][];  // Array of parallel execution groups
  connections: ConnectionInfo[];
  initial_context: Record<string, any>;
  execution_config: {
    parallel_execution?: boolean;
    error_handling?: 'stop' | 'continue' | 'retry';
    timeout_ms?: number;
    max_retries?: number;
  };
}

export interface NodeExecutionState {
  node_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  start_time?: string;
  end_time?: string;
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  error?: string;
  retry_count?: number;
  execution_context?: ExecutionContext;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function isCompatibleConnection(
  sourcePort: StandardOutputPort,
  targetPort: StandardInputPort
): ConnectionValidation {
  // Check data type compatibility
  if (sourcePort.data_type !== targetPort.data_type && 
      sourcePort.data_type !== DataType.ANY && 
      targetPort.data_type !== DataType.ANY) {
    return {
      valid: false,
      error: `Data type mismatch: ${sourcePort.data_type} → ${targetPort.data_type}`,
      auto_fix_suggestion: targetPort.auto_convert ? 'Auto-conversion available' : undefined
    };
  }
  
  // Check connection type compatibility
  const compatibleTypes = sourcePort.connection_types.some(type => 
    targetPort.connection_types.includes(type)
  );
  
  if (!compatibleTypes) {
    return {
      valid: false,
      error: `Connection type mismatch: ${sourcePort.connection_types.join(', ')} → ${targetPort.connection_types.join(', ')}`
    };
  }
  
  return { valid: true, compatibility_score: 1.0 };
}

export function getConnectionTypeIcon(connectionType: ConnectionType): string {
  switch (connectionType) {
    case ConnectionType.DATA_FLOW: return '📊';
    case ConnectionType.TRIGGER_FLOW: return '⚡';
    case ConnectionType.EVENT_FLOW: return '📡';
    case ConnectionType.SEQUENTIAL: return '➡️';
    case ConnectionType.CONDITIONAL: return '🔀';
    case ConnectionType.PARALLEL: return '⚡';
    case ConnectionType.STREAM: return '🌊';
    case ConnectionType.FEEDBACK: return '🔄';
    case ConnectionType.ERROR_HANDLING: return '⚠️';
    default: return '🔗';
  }
}

export function getDataTypeIcon(dataType: DataType): string {
  switch (dataType) {
    case DataType.STRING: return '📝';
    case DataType.NUMBER: return '🔢';
    case DataType.BOOLEAN: return '✅';
    case DataType.OBJECT: return '📦';
    case DataType.ARRAY: return '📋';
    case DataType.IMAGE: return '🖼️';
    case DataType.FILE: return '📁';
    case DataType.TRIGGER: return '⚡';
    case DataType.COORDINATES: return '📍';
    case DataType.REGION: return '🔲';
    case DataType.EVENT: return '📡';
    case DataType.ANY: return '🔗';
    default: return '❓';
  }
}