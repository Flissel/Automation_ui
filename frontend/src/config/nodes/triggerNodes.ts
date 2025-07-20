/**
 * TRAE Visual Workflow System - Trigger Node Templates
 * 
 * Node templates for workflow triggers
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import { NodeCategory, DataType } from '../../types';
import { NodeTemplate } from './nodeTemplate';

// ============================================================================
// TRIGGER NODE TEMPLATES
// ============================================================================

export const TRIGGER_TEMPLATES: Record<string, NodeTemplate> = {
  manual_trigger: {
    type: 'manual_trigger',
    category: NodeCategory.TRIGGERS,
    label: 'Manual Trigger',
    description: 'Manually start workflow execution',
    icon: '▶️',
    color: '#3b82f6',
    inputs: [],
    outputs: [
      {
        id: 'trigger_output',
        name: 'Trigger',
        type: DataType.ANY,
        description: 'Workflow start signal'
      }
    ],
    defaultConfig: {
      button_text: 'Start Workflow',
      confirmation_required: false
    },
    configSchema: {
      button_text: { type: 'string', label: 'Button Text', default: 'Start Workflow' },
      confirmation_required: { type: 'boolean', label: 'Require Confirmation', default: false }
    }
  },

  file_watcher: {
    type: 'file_watcher',
    category: NodeCategory.TRIGGERS,
    label: 'File Watcher',
    description: 'Trigger on file system changes',
    icon: '📁',
    color: '#3b82f6',
    inputs: [],
    outputs: [
      {
        id: 'file_event',
        name: 'File Event',
        type: DataType.OBJECT,
        description: 'File system event data'
      },
      {
        id: 'file_path',
        name: 'File Path',
        type: DataType.STRING,
        description: 'Path of the changed file'
      }
    ],
    defaultConfig: {
      watch_path: '',
      recursive: true,
      events: ['created', 'modified', 'deleted'],
      file_patterns: ['*'],
      ignore_patterns: ['.git/*', 'node_modules/*'],
      debounce_ms: 100
    },
    configSchema: {
      watch_path: { type: 'string', label: 'Watch Path', required: true },
      recursive: { type: 'boolean', label: 'Watch Subdirectories', default: true },
      events: { type: 'multiselect', label: 'Events to Watch', options: ['created', 'modified', 'deleted', 'moved'], default: ['created', 'modified', 'deleted'] },
      file_patterns: { type: 'array', label: 'File Patterns', default: ['*'] },
      ignore_patterns: { type: 'array', label: 'Ignore Patterns', default: ['.git/*', 'node_modules/*'] },
      debounce_ms: { type: 'number', label: 'Debounce (ms)', default: 100, min: 0, max: 5000 }
    }
  },

  schedule_trigger: {
    type: 'schedule_trigger',
    category: NodeCategory.TRIGGERS,
    label: 'Schedule Trigger',
    description: 'Trigger on time-based schedule',
    icon: '⏰',
    color: '#3b82f6',
    inputs: [],
    outputs: [
      {
        id: 'schedule_output',
        name: 'Schedule',
        type: DataType.OBJECT,
        description: 'Schedule trigger data'
      },
      {
        id: 'timestamp',
        name: 'Timestamp',
        type: DataType.STRING,
        description: 'Trigger timestamp'
      }
    ],
    defaultConfig: {
      schedule_type: 'interval',
      interval_seconds: 60,
      cron_expression: '0 * * * *',
      timezone: 'UTC',
      enabled: true
    },
    configSchema: {
      schedule_type: { type: 'select', label: 'Schedule Type', options: ['interval', 'cron'], default: 'interval' },
      interval_seconds: { type: 'number', label: 'Interval (seconds)', default: 60, min: 1, max: 86400 },
      cron_expression: { type: 'string', label: 'Cron Expression', default: '0 * * * *' },
      timezone: { type: 'string', label: 'Timezone', default: 'UTC' },
      enabled: { type: 'boolean', label: 'Enabled', default: true }
    }
  },

  webhook_trigger: {
    type: 'webhook_trigger',
    category: NodeCategory.TRIGGERS,
    label: 'Webhook Trigger',
    description: 'Trigger via HTTP webhook',
    icon: '🌐',
    color: '#3b82f6',
    inputs: [],
    outputs: [
      {
        id: 'webhook_data',
        name: 'Webhook Data',
        type: DataType.OBJECT,
        description: 'HTTP request payload'
      },
      {
        id: 'headers',
        name: 'Headers',
        type: DataType.OBJECT,
        description: 'HTTP request headers'
      },
      {
        id: 'query_params',
        name: 'Query Params',
        type: DataType.OBJECT,
        description: 'URL query parameters'
      }
    ],
    defaultConfig: {
      endpoint_path: '/webhook',
      http_methods: ['POST'],
      authentication: 'none',
      api_key: '',
      response_format: 'json'
    },
    configSchema: {
      endpoint_path: { type: 'string', label: 'Endpoint Path', default: '/webhook', required: true },
      http_methods: { type: 'multiselect', label: 'HTTP Methods', options: ['GET', 'POST', 'PUT', 'DELETE'], default: ['POST'] },
      authentication: { type: 'select', label: 'Authentication', options: ['none', 'api_key', 'bearer_token'], default: 'none' },
      api_key: { type: 'string', label: 'API Key', default: '' },
      response_format: { type: 'select', label: 'Response Format', options: ['json', 'xml', 'text'], default: 'json' }
    }
  },

  live_desktop: {
    type: 'live_desktop',
    category: NodeCategory.DESKTOP,
    label: 'Live Desktop',
    description: 'Real-time desktop screen capture with OCR regions and click actions',
    icon: '🖥️',
    color: '#10b981',
    inputs: [
      {
        id: 'config_input',
        name: 'Config',
        type: DataType.OBJECT,
        required: false,
        description: 'Desktop capture configuration'
      }
    ],
    outputs: [
      {
        id: 'screen_data',
        name: 'Screen Data',
        type: DataType.OBJECT,
        description: 'Current screen capture data'
      },
      {
        id: 'ocr_results',
        name: 'OCR Results',
        type: DataType.ARRAY,
        description: 'OCR text detection results'
      },
      {
        id: 'click_events',
        name: 'Click Events',
        type: DataType.OBJECT,
        description: 'Mouse click event coordinates'
      },
      {
        id: 'screen_changes',
        name: 'Screen Changes',
        type: DataType.BOOLEAN,
        description: 'Triggers when screen content changes'
      }
    ],
    defaultConfig: {
      fps: 10,
      scale_factor: 0.6,
      quality: 80,
      auto_ocr: false,
      ocr_regions: [],
      click_actions: [],
      change_detection: false,
      change_threshold: 0.1
    },
    configSchema: {
      fps: { type: 'number', label: 'FPS', default: 10, min: 1, max: 30 },
      scale_factor: { type: 'number', label: 'Scale Factor', default: 0.6, min: 0.1, max: 1.0, step: 0.1 },
      quality: { type: 'number', label: 'Image Quality', default: 80, min: 10, max: 100 },
      auto_ocr: { type: 'boolean', label: 'Auto OCR', default: false },
      change_detection: { type: 'boolean', label: 'Change Detection', default: false },
      change_threshold: { type: 'number', label: 'Change Threshold', default: 0.1, min: 0.01, max: 1.0, step: 0.01 }
    }
  }
};