
/**
 * Simplified Node Templates - n8n Style
 * Each node has exactly 1 input and 1 output (except config nodes)
 */

import { NodeInputSpec, NodeOutputSpec, NodeDependency } from '../types/dataFlow';

export interface SimplifiedNodeTemplate {
  id: string;
  type: string;
  label: string;
  description: string;
  category: 'triggers' | 'actions' | 'logic' | 'config';
  icon: string;
  color: string;
  
  // Simplified I/O - max 1 input, 1 output
  input?: NodeInputSpec;
  output?: NodeOutputSpec;
  
  // Dependencies (config nodes, services)
  dependencies: NodeDependency[];
  
  // Configuration schema
  configSchema: Record<string, any>;
  defaultConfig: Record<string, any>;
}

export const SIMPLIFIED_NODE_TEMPLATES: Record<string, SimplifiedNodeTemplate> = {
  // TRIGGER NODES
  manual_trigger: {
    id: 'manual_trigger',
    type: 'manual_trigger',
    label: 'Manual Trigger',
    description: 'Start workflow manually',
    category: 'triggers',
    icon: 'Play',
    color: '#10b981',
    // No input for triggers
    output: {
      id: 'trigger_output',
      name: 'Trigger',
      type: 'trigger',
      provides: 'execution_start',
      description: 'Workflow execution trigger'
    },
    dependencies: [],
    configSchema: {
      button_text: { type: 'string', default: 'Start Workflow', label: 'Button Text' }
    },
    defaultConfig: { button_text: 'Start Workflow' }
  },
  
  webhook_trigger: {
    id: 'webhook_trigger',
    type: 'webhook_trigger',
    label: 'Webhook',
    description: 'Trigger via HTTP webhook',
    category: 'triggers',
    icon: 'Webhook',
    color: '#3b82f6',
    output: {
      id: 'webhook_output',
      name: 'Webhook Data',
      type: 'data',
      provides: 'webhook_payload',
      description: 'HTTP request data'
    },
    dependencies: [],
    configSchema: {
      path: { type: 'string', required: true, label: 'Webhook Path' },
      method: { type: 'select', options: ['POST', 'GET'], default: 'POST' },
      execution_history: { type: 'array', default: [], hidden: true }
    },
    defaultConfig: { 
      path: '/webhook', 
      method: 'POST',
      execution_history: []
    }
  },
  
  // CONFIG NODES (no handles)
  websocket_config: {
    id: 'websocket_config',
    type: 'websocket_config',
    label: 'WebSocket Service',
    description: 'WebSocket service configuration and management',
    category: 'config',
    icon: 'Wifi',
    color: '#8b5cf6',
    // Config nodes now have output to connect to other nodes
    output: {
      id: 'websocket_output',
      name: 'WebSocket Connection',
      type: 'config',
      provides: 'websocket_connection',
      description: 'WebSocket connection configuration'
    },
    dependencies: [],
    configSchema: {
      url: { type: 'string', required: true, label: 'WebSocket URL' },
      port: { type: 'number', default: 8080, label: 'Port' },
      reconnect: { type: 'boolean', default: true, label: 'Auto Reconnect' },
      service_command: { type: 'string', label: 'Service Start Command' },
      auto_start: { type: 'boolean', default: false, label: 'Auto Start Service' },
      health_check_url: { type: 'string', label: 'Health Check URL' },
      process_id: { type: 'number', label: 'Process ID (auto-filled)' },
      status: { type: 'select', options: ['stopped', 'starting', 'running', 'failed'], default: 'stopped' }
    },
    defaultConfig: { 
      url: 'ws://localhost', 
      port: 8080,
      reconnect: true,
      service_command: 'node websocket-server.js',
      auto_start: false,
      status: 'stopped'
    }
  },
  
  // ACTION NODES
  live_desktop: {
    id: 'live_desktop',
    type: 'live_desktop',
    label: 'Live Desktop',
    description: 'Stream desktop view via WebSocket',
    category: 'actions',
    icon: 'Monitor',
    color: '#64748b',
    input: {
      id: 'desktop_input',
      name: 'Trigger + WebSocket',
      type: 'trigger',
      required: true,
      accepts: ['execution_start', 'webhook_payload', 'websocket_connection'],
      description: 'Connect trigger and WebSocket config',
      placeholder: 'Connect trigger and WebSocket config here'
    },
    output: {
      id: 'desktop_output',
      name: 'Desktop Stream',
      type: 'data',
      provides: 'desktop_stream',
      description: 'Live desktop stream data'
    },
    dependencies: [],
    configSchema: {
      fps: { type: 'number', default: 30, min: 1, max: 60, label: 'FPS' },
      quality: { type: 'number', default: 80, min: 10, max: 100, label: 'Quality %' },
      width: { type: 'number', default: 1200, label: 'Width' },
      height: { type: 'number', default: 900, label: 'Height' }
    },
    defaultConfig: { fps: 30, quality: 80, width: 1200, height: 900 }
  },
  
  click_action: {
    id: 'click_action',
    type: 'click_action',
    label: 'Click',
    description: 'Perform mouse click',
    category: 'actions',
    icon: 'MousePointer',
    color: '#f97316',
    input: {
      id: 'click_input',
      name: 'Desktop Data',
      type: 'data',
      required: true,
      accepts: ['desktop_stream', 'coordinates'],
      description: 'Connect from desktop or coordinates',
      placeholder: 'Connect desktop stream'
    },
    output: {
      id: 'click_output',
      name: 'Click Result',
      type: 'data',
      provides: 'click_result',
      description: 'Click action result'
    },
    dependencies: [],
    configSchema: {
      x: { type: 'number', required: true, label: 'X Coordinate' },
      y: { type: 'number', required: true, label: 'Y Coordinate' },
      button: { type: 'select', options: ['left', 'right', 'middle'], default: 'left' }
    },
    defaultConfig: { x: 0, y: 0, button: 'left' }
  },
  
  type_text_action: {
    id: 'type_text_action',
    type: 'type_text_action',
    label: 'Type Text',
    description: 'Type text at current cursor position',
    category: 'actions',
    icon: 'Keyboard',
    color: '#8b5cf6',
    input: {
      id: 'type_input',
      name: 'Action Result',
      type: 'data',
      required: true,
      accepts: ['click_result', 'desktop_stream', 'text'],
      description: 'Connect from previous action',
      placeholder: 'Connect action result'
    },
    output: {
      id: 'type_output',
      name: 'Type Result',
      type: 'data',
      provides: 'type_result',
      description: 'Text typing result'
    },
    dependencies: [],
    configSchema: {
      text: { type: 'string', required: true, label: 'Text to Type' },
      delay: { type: 'number', default: 100, min: 0, label: 'Delay (ms)' }
    },
    defaultConfig: { text: '', delay: 100 }
  },
  
  http_request_action: {
    id: 'http_request_action',
    type: 'http_request_action',
    label: 'HTTP Request',
    description: 'Make HTTP request',
    category: 'actions',
    icon: 'Globe',
    color: '#ef4444',
    input: {
      id: 'http_input',
      name: 'Data',
      type: 'data',
      required: true,
      accepts: ['type_result', 'click_result', 'webhook_payload'],
      description: 'Connect data to send',
      placeholder: 'Connect data source'
    },
    output: {
      id: 'http_output',
      name: 'Response',
      type: 'data',
      provides: 'http_response',
      description: 'HTTP response data'
    },
    dependencies: [],
    configSchema: {
      url: { type: 'string', required: true, label: 'URL' },
      method: { type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE'], default: 'POST' },
      headers: { type: 'object', default: {}, label: 'Headers' }
    },
    defaultConfig: { url: '', method: 'POST', headers: {} }
  },
  
  // LOGIC NODES
  if_condition: {
    id: 'if_condition',
    type: 'if_condition',
    label: 'IF Condition',
    description: 'Conditional logic branch',
    category: 'logic',
    icon: 'GitBranch',
    color: '#06b6d4',
    input: {
      id: 'condition_input',
      name: 'Data',
      type: 'data',
      required: true,
      accepts: ['http_response', 'click_result', 'type_result'],
      description: 'Data to evaluate',
      placeholder: 'Connect data to check'
    },
    output: {
      id: 'condition_output',
      name: 'Result',
      type: 'data',
      provides: 'condition_result',
      description: 'Condition evaluation result'
    },
    dependencies: [],
    configSchema: {
      condition: { type: 'string', required: true, label: 'Condition' },
      operator: { type: 'select', options: ['equals', 'contains', 'greater', 'less'], default: 'equals' }
    },
    defaultConfig: { condition: '', operator: 'equals' }
  },
  
  delay: {
    id: 'delay',
    type: 'delay',
    label: 'Delay',
    description: 'Wait for specified time',
    category: 'logic',
    icon: 'Timer',
    color: '#eab308',
    input: {
      id: 'delay_input',
      name: 'Trigger',
      type: 'data',
      required: true,
      accepts: ['click_result', 'type_result', 'condition_result'],
      description: 'Previous action result',
      placeholder: 'Connect previous action'
    },
    output: {
      id: 'delay_output',
      name: 'Continue',
      type: 'data',
      provides: 'delay_complete',
      description: 'Delay completion signal'
    },
    dependencies: [],
    configSchema: {
      duration: { type: 'number', required: true, min: 100, label: 'Duration (ms)' }
    },
    defaultConfig: { duration: 1000 }
  },

  // OCR NODES
  ocr_region: {
    id: 'ocr_region',
    type: 'ocr_region',
    label: 'OCR Region',
    description: 'Define text extraction region on desktop',
    category: 'actions',
    icon: 'ScanText',
    color: '#9333ea',
    input: {
      id: 'ocr_region_input',
      name: 'Desktop Stream',
      type: 'data',
      required: true,
      accepts: ['desktop_stream'],
      description: 'Connect from Live Desktop',
      placeholder: 'Connect desktop stream'
    },
    output: {
      id: 'ocr_region_output',
      name: 'OCR Region',
      type: 'data',
      provides: 'ocr_region_data',
      description: 'OCR region configuration'
    },
    dependencies: [],
    configSchema: {
      x: { type: 'number', required: true, label: 'X Position' },
      y: { type: 'number', required: true, label: 'Y Position' },
      width: { type: 'number', required: true, label: 'Width' },
      height: { type: 'number', required: true, label: 'Height' },
      label: { type: 'string', default: 'Region 1', label: 'Region Label' },
      enabled: { type: 'boolean', default: true, label: 'Enabled' }
    },
    defaultConfig: { x: 100, y: 100, width: 200, height: 50, label: 'Region 1', enabled: true }
  },

  ocr_extract: {
    id: 'ocr_extract',
    type: 'ocr_extract',
    label: 'OCR Extract',
    description: 'Extract text from defined regions',
    category: 'actions',
    icon: 'FileText',
    color: '#dc2626',
    input: {
      id: 'ocr_extract_input',
      name: 'OCR Region',
      type: 'data',
      required: true,
      accepts: ['ocr_region_data'],
      description: 'Connect from OCR Region',
      placeholder: 'Connect OCR region'
    },
    output: {
      id: 'ocr_extract_output',
      name: 'Extracted Text',
      type: 'data',
      provides: 'extracted_text',
      description: 'Extracted text data'
    },
    dependencies: [],
    configSchema: {
      interval: { type: 'number', default: 240000, min: 10000, label: 'Extraction Interval (ms)' },
      confidence_threshold: { type: 'number', default: 0.7, min: 0, max: 1, label: 'Confidence Threshold' },
      auto_start: { type: 'boolean', default: true, label: 'Auto Start Extraction' },
      preprocessing: { 
        type: 'select', 
        options: ['none', 'grayscale', 'threshold', 'blur'], 
        default: 'grayscale',
        label: 'Image Preprocessing'
      }
    },
    defaultConfig: { 
      interval: 240000, // 4 minutes
      confidence_threshold: 0.7,
      auto_start: true,
      preprocessing: 'grayscale'
    }
  },

  n8n_webhook: {
    id: 'n8n_webhook',
    type: 'n8n_webhook',
    label: 'N8N Webhook',
    description: 'Send data to N8N for interpretation',
    category: 'actions',
    icon: 'Webhook',
    color: '#ea580c',
    input: {
      id: 'n8n_input',
      name: 'Text Data',
      type: 'data',
      required: true,
      accepts: ['extracted_text'],
      description: 'Connect extracted text',
      placeholder: 'Connect extracted text'
    },
    output: {
      id: 'n8n_output',
      name: 'N8N Response',
      type: 'data',
      provides: 'n8n_response',
      description: 'N8N interpretation response'
    },
    dependencies: [],
    configSchema: {
      webhook_url: { type: 'string', required: true, label: 'N8N Webhook URL' },
      api_key: { type: 'string', label: 'API Key (optional)' },
      timeout: { type: 'number', default: 30000, label: 'Timeout (ms)' },
      retry_attempts: { type: 'number', default: 3, min: 1, max: 10, label: 'Retry Attempts' },
      data_format: {
        type: 'select',
        options: ['json', 'form-data', 'raw'],
        default: 'json',
        label: 'Data Format'
      }
    },
    defaultConfig: { 
      webhook_url: '',
      timeout: 30000,
      retry_attempts: 3,
      data_format: 'json'
    }
  },

  lebas_system: {
    id: 'lebas_system',
    type: 'lebas_system',
    label: 'Lebas System',
    description: 'Forward comments to Lebas system',
    category: 'actions',
    icon: 'MessageSquare',
    color: '#059669',
    input: {
      id: 'lebas_input',
      name: 'N8N Response',
      type: 'data',
      required: true,
      accepts: ['n8n_response'],
      description: 'Connect N8N response',
      placeholder: 'Connect N8N response'
    },
    output: {
      id: 'lebas_output',
      name: 'Lebas Result',
      type: 'data',
      provides: 'lebas_result',
      description: 'Lebas system response'
    },
    dependencies: [],
    configSchema: {
      lebas_endpoint: { type: 'string', required: true, label: 'Lebas System Endpoint' },
      auth_token: { type: 'string', label: 'Authentication Token' },
      task_type: { 
        type: 'select',
        options: ['comment', 'task', 'notification', 'analysis'],
        default: 'comment',
        label: 'Task Type'
      },
      priority: {
        type: 'select',
        options: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
        label: 'Priority Level'
      },
      auto_execute: { type: 'boolean', default: true, label: 'Auto Execute Tasks' }
    },
    defaultConfig: { 
      lebas_endpoint: '',
      task_type: 'comment',
      priority: 'medium',
      auto_execute: true
    }
  }
};
