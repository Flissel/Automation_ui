
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
    configSchema: {},
    defaultConfig: {}
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
      method: { type: 'select', options: ['POST', 'GET'], default: 'POST' }
    },
    defaultConfig: { path: '/webhook', method: 'POST' }
  },
  
  // CONFIG NODES (no handles)
  websocket_config: {
    id: 'websocket_config',
    type: 'websocket_config',
    label: 'WebSocket Config',
    description: 'WebSocket connection configuration',
    category: 'config',
    icon: 'Wifi',
    color: '#8b5cf6',
    // Config nodes have no input/output handles
    dependencies: [],
    configSchema: {
      url: { type: 'string', required: true, label: 'WebSocket URL' },
      reconnect: { type: 'boolean', default: true, label: 'Auto Reconnect' }
    },
    defaultConfig: { url: 'ws://localhost:8765', reconnect: true }
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
      name: 'Trigger',
      type: 'trigger',
      required: true,
      accepts: ['execution_start', 'webhook_payload'],
      description: 'Connect from trigger node',
      placeholder: 'Connect trigger here'
    },
    output: {
      id: 'desktop_output',
      name: 'Desktop Stream',
      type: 'data',
      provides: 'desktop_stream',
      description: 'Live desktop stream data'
    },
    dependencies: [
      {
        id: 'websocket_config',
        type: 'websocket_config',
        required: true,
        description: 'WebSocket configuration required',
        status: 'missing'
      }
    ],
    configSchema: {
      fps: { type: 'number', default: 30, min: 1, max: 60, label: 'FPS' },
      quality: { type: 'number', default: 80, min: 10, max: 100, label: 'Quality %' }
    },
    defaultConfig: { fps: 30, quality: 80 }
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
      name: 'Trigger',
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
  }
};
