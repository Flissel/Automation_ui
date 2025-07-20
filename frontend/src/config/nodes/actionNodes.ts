/**
 * TRAE Visual Workflow System - Action Node Templates
 * 
 * Node templates for workflow actions
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import { NodeCategory, DataType } from '../../types';
import { NodeTemplate } from './nodeTemplate';

// ============================================================================
// ACTION NODE TEMPLATES
// ============================================================================

export const ACTION_TEMPLATES: Record<string, NodeTemplate> = {
  click_action: {
    type: 'click_action',
    category: NodeCategory.ACTIONS,
    label: 'Click Action',
    description: 'Perform mouse click on UI element',
    icon: '👆',
    color: '#10b981',
    inputs: [
      {
        id: 'trigger_input',
        name: 'Trigger',
        type: DataType.ANY,
        description: 'Action trigger signal'
      },
      {
        id: 'selector_input',
        name: 'Selector',
        type: DataType.STRING,
        description: 'Element selector (optional)'
      }
    ],
    outputs: [
      {
        id: 'success_output',
        name: 'Success',
        type: DataType.BOOLEAN,
        description: 'Click success status'
      },
      {
        id: 'element_data',
        name: 'Element Data',
        type: DataType.OBJECT,
        description: 'Clicked element information'
      }
    ],
    defaultConfig: {
      selector: '',
      click_type: 'left',
      wait_before: 0,
      wait_after: 500,
      retry_count: 3,
      timeout: 5000
    },
    configSchema: {
      selector: { type: 'string', label: 'Element Selector', required: true },
      click_type: { type: 'select', label: 'Click Type', options: ['left', 'right', 'double'], default: 'left' },
      wait_before: { type: 'number', label: 'Wait Before (ms)', default: 0, min: 0, max: 10000 },
      wait_after: { type: 'number', label: 'Wait After (ms)', default: 500, min: 0, max: 10000 },
      retry_count: { type: 'number', label: 'Retry Count', default: 3, min: 0, max: 10 },
      timeout: { type: 'number', label: 'Timeout (ms)', default: 5000, min: 1000, max: 30000 }
    }
  },

  ocr_action: {
    type: 'ocr_action',
    category: NodeCategory.ACTIONS,
    label: 'OCR Action',
    description: 'Extract text from images using OCR',
    icon: '👁️',
    color: '#10b981',
    inputs: [
      {
        id: 'trigger_input',
        name: 'Trigger',
        type: DataType.ANY,
        description: 'Action trigger signal'
      },
      {
        id: 'image_input',
        name: 'Image',
        type: DataType.IMAGE,
        description: 'Image to process (optional)'
      }
    ],
    outputs: [
      {
        id: 'extracted_text',
        name: 'Text',
        type: DataType.STRING,
        description: 'Extracted text content'
      },
      {
        id: 'confidence',
        name: 'Confidence',
        type: DataType.NUMBER,
        description: 'OCR confidence score'
      },
      {
        id: 'word_data',
        name: 'Word Data',
        type: DataType.ARRAY,
        description: 'Detailed word-level data'
      }
    ],
    defaultConfig: {
      source_type: 'screenshot',
      region: { x: 0, y: 0, width: 0, height: 0 },
      language: 'eng',
      psm: 6,
      preprocessing: {
        grayscale: true,
        threshold: false,
        denoise: false,
        scale_factor: 1.0
      },
      output_format: 'text'
    },
    configSchema: {
      source_type: { type: 'select', label: 'Source Type', options: ['screenshot', 'file', 'input'], default: 'screenshot' },
      region: { type: 'object', label: 'Capture Region', properties: { x: 'number', y: 'number', width: 'number', height: 'number' } },
      language: { type: 'select', label: 'Language', options: ['eng', 'spa', 'fra', 'deu', 'chi_sim', 'chi_tra'], default: 'eng' },
      psm: { type: 'select', label: 'Page Segmentation Mode', options: [3, 6, 7, 8, 13], default: 6 },
      preprocessing: { type: 'object', label: 'Preprocessing Options' },
      output_format: { type: 'select', label: 'Output Format', options: ['text', 'json', 'xml'], default: 'text' }
    }
  },

  realtime_ocr_action: {
    type: 'realtime_ocr_action',
    category: NodeCategory.ACTIONS,
    label: 'Real-time OCR Action',
    description: 'Continuous text recognition from Live Desktop regions with configurable intervals',
    icon: '🔍',
    color: '#8b5cf6',
    inputs: [
      {
        id: 'live_desktop_input',
        name: 'Live Desktop',
        type: DataType.OBJECT,
        description: 'Live Desktop connection'
      },
      {
        id: 'region_input',
        name: 'OCR Region',
        type: DataType.OBJECT,
        description: 'OCR region coordinates (optional)'
      }
    ],
    outputs: [
      {
        id: 'text_output',
        name: 'Current Text',
        type: DataType.STRING,
        description: 'Currently detected text'
      },
      {
        id: 'text_changed',
        name: 'Text Changed',
        type: DataType.BOOLEAN,
        description: 'Triggers when text changes'
      },
      {
        id: 'confidence_output',
        name: 'Confidence',
        type: DataType.NUMBER,
        description: 'OCR confidence score'
      },
      {
        id: 'region_data',
        name: 'Region Data',
        type: DataType.OBJECT,
        description: 'OCR region information'
      }
    ],
    defaultConfig: {
      monitoring_interval: 5,
      interval_unit: 'seconds',
      language: 'eng+deu',
      confidence_threshold: 0.7,
      similarity_threshold: 0.85,
      auto_start: true,
      region: { x: 0, y: 0, width: 200, height: 50 },
      webhook_enabled: false,
      webhook_url: '',
      change_detection: true,
      preprocessing: {
        grayscale: true,
        threshold: false,
        denoise: false
      }
    },
    configSchema: {
      monitoring_interval: { type: 'number', label: 'Monitoring Interval', default: 5, min: 1, max: 300 },
      interval_unit: { type: 'select', label: 'Interval Unit', options: ['seconds', 'minutes'], default: 'seconds' },
      language: { type: 'select', label: 'OCR Language', options: ['eng', 'deu', 'eng+deu', 'spa', 'fra', 'chi_sim'], default: 'eng+deu' },
      confidence_threshold: { type: 'number', label: 'Confidence Threshold', default: 0.7, min: 0.1, max: 1.0, step: 0.1 },
      similarity_threshold: { type: 'number', label: 'Text Change Threshold', default: 0.85, min: 0.1, max: 1.0, step: 0.05 },
      auto_start: { type: 'boolean', label: 'Auto Start Monitoring', default: true },
      region: { type: 'object', label: 'OCR Region', properties: { x: 'number', y: 'number', width: 'number', height: 'number' } },
      webhook_enabled: { type: 'boolean', label: 'Enable Webhook', default: false },
      webhook_url: { type: 'string', label: 'Webhook URL', required: false },
      change_detection: { type: 'boolean', label: 'Detect Text Changes', default: true },
      preprocessing: { type: 'object', label: 'Image Preprocessing' }
    }
  },

  screenshot_action: {
    type: 'screenshot_action',
    category: NodeCategory.ACTIONS,
    label: 'Screenshot Action',
    description: 'Capture screen or window screenshot',
    icon: '📸',
    color: '#10b981',
    inputs: [
      {
        id: 'trigger_input',
        name: 'Trigger',
        type: DataType.ANY,
        description: 'Action trigger signal'
      }
    ],
    outputs: [
      {
        id: 'image_output',
        name: 'Image',
        type: DataType.IMAGE,
        description: 'Captured screenshot'
      },
      {
        id: 'file_path',
        name: 'File Path',
        type: DataType.STRING,
        description: 'Saved image file path'
      },
      {
        id: 'metadata',
        name: 'Metadata',
        type: DataType.OBJECT,
        description: 'Screenshot metadata'
      }
    ],
    defaultConfig: {
      capture_type: 'fullscreen',
      region: { x: 0, y: 0, width: 0, height: 0 },
      save_to_file: true,
      file_format: 'png',
      quality: 90,
      filename_template: 'screenshot_{timestamp}',
      output_directory: './screenshots'
    },
    configSchema: {
      capture_type: { type: 'select', label: 'Capture Type', options: ['fullscreen', 'window', 'region'], default: 'fullscreen' },
      region: { type: 'object', label: 'Capture Region', properties: { x: 'number', y: 'number', width: 'number', height: 'number' } },
      save_to_file: { type: 'boolean', label: 'Save to File', default: true },
      file_format: { type: 'select', label: 'File Format', options: ['png', 'jpg', 'bmp'], default: 'png' },
      quality: { type: 'number', label: 'Quality (%)', default: 90, min: 1, max: 100 },
      filename_template: { type: 'string', label: 'Filename Template', default: 'screenshot_{timestamp}' },
      output_directory: { type: 'string', label: 'Output Directory', default: './screenshots' }
    }
  },

  type_text_action: {
    type: 'type_text_action',
    category: NodeCategory.ACTIONS,
    label: 'Type Text Action',
    description: 'Type text into active input field',
    icon: '⌨️',
    color: '#10b981',
    inputs: [
      {
        id: 'trigger_input',
        name: 'Trigger',
        type: DataType.ANY,
        description: 'Action trigger signal'
      },
      {
        id: 'text_input',
        name: 'Text',
        type: DataType.STRING,
        description: 'Text to type (optional)'
      }
    ],
    outputs: [
      {
        id: 'success_output',
        name: 'Success',
        type: DataType.BOOLEAN,
        description: 'Typing success status'
      },
      {
        id: 'typed_text',
        name: 'Typed Text',
        type: DataType.STRING,
        description: 'Text that was typed'
      }
    ],
    defaultConfig: {
      text: '',
      typing_speed: 50,
      clear_before: false,
      press_enter: false,
      wait_before: 0,
      wait_after: 500
    },
    configSchema: {
      text: { type: 'textarea', label: 'Text to Type', required: true },
      typing_speed: { type: 'number', label: 'Typing Speed (ms/char)', default: 50, min: 1, max: 1000 },
      clear_before: { type: 'boolean', label: 'Clear Before Typing', default: false },
      press_enter: { type: 'boolean', label: 'Press Enter After', default: false },
      wait_before: { type: 'number', label: 'Wait Before (ms)', default: 0, min: 0, max: 10000 },
      wait_after: { type: 'number', label: 'Wait After (ms)', default: 500, min: 0, max: 10000 }
    }
  },

  http_request_action: {
    type: 'http_request_action',
    category: NodeCategory.ACTIONS,
    label: 'HTTP Request',
    description: 'Make HTTP requests to APIs',
    icon: '🌐',
    color: '#10b981',
    inputs: [
      {
        id: 'trigger_input',
        name: 'Trigger',
        type: DataType.ANY,
        description: 'Action trigger signal'
      },
      {
        id: 'url_input',
        name: 'URL',
        type: DataType.STRING,
        description: 'Request URL (optional)'
      },
      {
        id: 'data_input',
        name: 'Data',
        type: DataType.OBJECT,
        description: 'Request data (optional)'
      }
    ],
    outputs: [
      {
        id: 'response_data',
        name: 'Response Data',
        type: DataType.OBJECT,
        description: 'HTTP response body'
      },
      {
        id: 'status_code',
        name: 'Status Code',
        type: DataType.NUMBER,
        description: 'HTTP status code'
      },
      {
        id: 'headers',
        name: 'Headers',
        type: DataType.OBJECT,
        description: 'Response headers'
      },
      {
        id: 'success',
        name: 'Success',
        type: DataType.BOOLEAN,
        description: 'Request success status'
      }
    ],
    defaultConfig: {
      url: '',
      method: 'GET',
      headers: {},
      data: {},
      timeout: 30000,
      follow_redirects: true,
      verify_ssl: true,
      auth: {
        type: 'none',
        username: '',
        password: '',
        token: ''
      }
    },
    configSchema: {
      url: { type: 'string', label: 'URL', required: true },
      method: { type: 'select', label: 'HTTP Method', options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], default: 'GET' },
      headers: { type: 'object', label: 'Headers' },
      data: { type: 'object', label: 'Request Data' },
      timeout: { type: 'number', label: 'Timeout (ms)', default: 30000, min: 1000, max: 300000 },
      follow_redirects: { type: 'boolean', label: 'Follow Redirects', default: true },
      verify_ssl: { type: 'boolean', label: 'Verify SSL', default: true },
      auth: { type: 'object', label: 'Authentication' }
    }
  },

  playwright_action: {
    type: 'playwright_action',
    category: NodeCategory.ACTIONS,
    label: 'Playwright Browser Action',
    description: 'Advanced browser automation with intelligent element detection and auto-suggestions',
    icon: '🌐',
    color: '#8b5cf6',
    inputs: [
      {
        id: 'trigger_input',
        name: 'Trigger',
        type: DataType.ANY,
        description: 'Action trigger signal'
      },
      {
        id: 'url_input',
        name: 'URL',
        type: DataType.STRING,
        description: 'Target URL (optional)'
      },
      {
        id: 'selector_input',
        name: 'Selector',
        type: DataType.STRING,
        description: 'Element selector (optional)'
      },
      {
        id: 'value_input',
        name: 'Value',
        type: DataType.STRING,
        description: 'Input value (optional)'
      }
    ],
    outputs: [
      {
        id: 'success_output',
        name: 'Success',
        type: DataType.BOOLEAN,
        description: 'Action success status'
      },
      {
        id: 'data_output',
        name: 'Data',
        type: DataType.OBJECT,
        description: 'Extracted data or element information'
      },
      {
        id: 'error_output',
        name: 'Error',
        type: DataType.STRING,
        description: 'Error information if action fails'
      },
      {
        id: 'suggestions_output',
        name: 'Element Suggestions',
        type: DataType.ARRAY,
        description: 'Auto-detected page elements for follow-up actions'
      }
    ],
    defaultConfig: {
      action: 'navigate',
      url: '',
      selector: '',
      value: '',
      waitCondition: 'load',
      timeout: 30000,
      extractionType: 'text',
      attributeName: '',
      pageAnalysis: {
        enabled: true,
        detectForms: true,
        detectButtons: true,
        detectLinks: true,
        detectInputs: true,
        generateSuggestions: true
      },
      autoConnections: {
        enabled: true,
        suggestedNodes: []
      },
      browserConfig: {
        headless: false,
        viewport: { width: 1280, height: 720 },
        userAgent: ''
      }
    },
    configSchema: {
      action: { 
        type: 'select', 
        label: 'Action Type', 
        options: ['navigate', 'click', 'fill', 'select', 'wait', 'extract', 'screenshot', 'analyze_page'], 
        default: 'navigate' 
      },
      url: { type: 'string', label: 'URL', required: false },
      selector: { type: 'string', label: 'Element Selector', required: false },
      value: { type: 'string', label: 'Input Value', required: false },
      waitCondition: { 
        type: 'select', 
        label: 'Wait Condition', 
        options: ['load', 'networkidle', 'domcontentloaded', 'element_visible'], 
        default: 'load' 
      },
      timeout: { type: 'number', label: 'Timeout (ms)', default: 30000, min: 1000, max: 300000 },
      extractionType: { 
        type: 'select', 
        label: 'Extraction Type', 
        options: ['text', 'attribute', 'html', 'all_elements'], 
        default: 'text' 
      },
      attributeName: { type: 'string', label: 'Attribute Name', required: false },
      pageAnalysis: { 
        type: 'object', 
        label: 'Page Analysis Settings',
        properties: {
          enabled: { type: 'boolean', default: true },
          detectForms: { type: 'boolean', default: true },
          detectButtons: { type: 'boolean', default: true },
          detectLinks: { type: 'boolean', default: true },
          detectInputs: { type: 'boolean', default: true },
          generateSuggestions: { type: 'boolean', default: true }
        }
      },
      autoConnections: {
        type: 'object',
        label: 'Auto-Connection Settings',
        properties: {
          enabled: { type: 'boolean', default: true }
        }
      },
      browserConfig: {
        type: 'object',
        label: 'Browser Configuration',
        properties: {
          headless: { type: 'boolean', default: false },
          viewport: { 
            type: 'object', 
            properties: { 
              width: { type: 'number', default: 1280 }, 
              height: { type: 'number', default: 720 } 
            } 
          },
          userAgent: { type: 'string', required: false }
        }
      }
    }
  }
};