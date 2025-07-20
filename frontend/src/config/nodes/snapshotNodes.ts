/**
 * TRAE Visual Workflow System - Snapshot-based Node Templates
 * 
 * Node templates for snapshot-based OCR zones and automation
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import { NodeCategory, DataType } from '../../types';
import { NodeTemplate } from './nodeTemplate';

// ============================================================================
// SNAPSHOT-BASED NODE TEMPLATES
// ============================================================================

export const SNAPSHOT_TEMPLATES: Record<string, NodeTemplate> = {
  snapshot_creator: {
    type: 'snapshot_creator',
    category: NodeCategory.DESKTOP,
    label: 'Snapshot Creator',
    description: 'Create freeze frame snapshots from live desktop stream for zone design',
    icon: '📸',
    color: '#8b5cf6',
    inputs: [
      {
        id: 'live_desktop_input',
        name: 'Live Desktop',
        type: DataType.OBJECT,
        description: 'Live Desktop stream connection'
      },
      {
        id: 'trigger_input',
        name: 'Trigger',
        type: DataType.ANY,
        description: 'Snapshot trigger signal'
      }
    ],
    outputs: [
      {
        id: 'snapshot_output',
        name: 'Snapshot',
        type: DataType.IMAGE,
        description: 'Created snapshot image'
      },
      {
        id: 'snapshot_metadata',
        name: 'Metadata',
        type: DataType.OBJECT,
        description: 'Snapshot metadata (timestamp, resolution, etc.)'
      },
      {
        id: 'zones_template',
        name: 'Zones Template',
        type: DataType.OBJECT,
        description: 'OCR and click zones template'
      }
    ],
    defaultConfig: {
      auto_create: false,
      save_to_file: true,
      file_format: 'png',
      quality: 95,
      filename_template: 'snapshot_{timestamp}',
      output_directory: './snapshots',
      include_metadata: true,
      monitor_index: 0,
      capture_cursor: false
    },
    configSchema: {
      auto_create: { type: 'boolean', label: 'Auto Create Snapshots', default: false },
      save_to_file: { type: 'boolean', label: 'Save to File', default: true },
      file_format: { type: 'select', label: 'File Format', options: ['png', 'jpg', 'bmp'], default: 'png' },
      quality: { type: 'number', label: 'Quality (%)', default: 95, min: 1, max: 100 },
      filename_template: { type: 'string', label: 'Filename Template', default: 'snapshot_{timestamp}' },
      output_directory: { type: 'string', label: 'Output Directory', default: './snapshots' },
      include_metadata: { type: 'boolean', label: 'Include Metadata', default: true },
      monitor_index: { type: 'number', label: 'Monitor Index', default: 0, min: 0, max: 10 },
      capture_cursor: { type: 'boolean', label: 'Capture Cursor', default: false }
    }
  },

  ocr_zone_designer: {
    type: 'ocr_zone_designer',
    category: NodeCategory.DESKTOP,
    label: 'OCR Zone Designer',
    description: 'Design and configure OCR zones on snapshots with drag & drop interface',
    icon: '🎯',
    color: '#3b82f6',
    inputs: [
      {
        id: 'snapshot_input',
        name: 'Snapshot',
        type: DataType.IMAGE,
        description: 'Snapshot image for zone design'
      },
      {
        id: 'existing_zones',
        name: 'Existing Zones',
        type: DataType.ARRAY,
        description: 'Existing OCR zones (optional)'
      }
    ],
    outputs: [
      {
        id: 'ocr_zones',
        name: 'OCR Zones',
        type: DataType.ARRAY,
        description: 'Configured OCR zones'
      },
      {
        id: 'zones_template',
        name: 'Zones Template',
        type: DataType.OBJECT,
        description: 'Reusable zones template'
      },
      {
        id: 'zone_config',
        name: 'Zone Config',
        type: DataType.OBJECT,
        description: 'Complete zone configuration'
      }
    ],
    defaultConfig: {
      default_zone_size: { width: 200, height: 50 },
      grid_snap: true,
      grid_size: 10,
      show_coordinates: true,
      show_confidence: true,
      auto_name_zones: true,
      zone_naming_pattern: 'Zone_{index}',
      default_language: 'eng+deu',
      default_confidence_threshold: 0.7,
      enable_preprocessing: true,
      preprocessing_options: {
        grayscale: true,
        threshold: false,
        denoise: false,
        scale_factor: 1.0
      }
    },
    configSchema: {
      default_zone_size: { type: 'object', label: 'Default Zone Size', properties: { width: 'number', height: 'number' } },
      grid_snap: { type: 'boolean', label: 'Snap to Grid', default: true },
      grid_size: { type: 'number', label: 'Grid Size (px)', default: 10, min: 1, max: 50 },
      show_coordinates: { type: 'boolean', label: 'Show Coordinates', default: true },
      show_confidence: { type: 'boolean', label: 'Show Confidence', default: true },
      auto_name_zones: { type: 'boolean', label: 'Auto Name Zones', default: true },
      zone_naming_pattern: { type: 'string', label: 'Zone Naming Pattern', default: 'Zone_{index}' },
      default_language: { type: 'select', label: 'Default Language', options: ['eng', 'deu', 'eng+deu', 'spa', 'fra', 'chi_sim'], default: 'eng+deu' },
      default_confidence_threshold: { type: 'number', label: 'Default Confidence Threshold', default: 0.7, min: 0.1, max: 1.0, step: 0.1 },
      enable_preprocessing: { type: 'boolean', label: 'Enable Preprocessing', default: true },
      preprocessing_options: { type: 'object', label: 'Preprocessing Options' }
    }
  },

  click_zone_designer: {
    type: 'click_zone_designer',
    category: NodeCategory.AUTOMATION,
    label: 'Click Zone Designer',
    description: 'Design and configure click actions on snapshots with visual positioning',
    icon: '🖱️',
    color: '#10b981',
    inputs: [
      {
        id: 'snapshot_input',
        name: 'Snapshot',
        type: DataType.IMAGE,
        description: 'Snapshot image for click design'
      },
      {
        id: 'existing_actions',
        name: 'Existing Actions',
        type: DataType.ARRAY,
        description: 'Existing click actions (optional)'
      }
    ],
    outputs: [
      {
        id: 'click_actions',
        name: 'Click Actions',
        type: DataType.ARRAY,
        description: 'Configured click actions'
      },
      {
        id: 'actions_template',
        name: 'Actions Template',
        type: DataType.OBJECT,
        description: 'Reusable actions template'
      },
      {
        id: 'action_config',
        name: 'Action Config',
        type: DataType.OBJECT,
        description: 'Complete action configuration'
      }
    ],
    defaultConfig: {
      default_click_type: 'left',
      show_click_indicators: true,
      indicator_size: 20,
      auto_name_actions: true,
      action_naming_pattern: 'Click_{index}',
      default_wait_before: 0,
      default_wait_after: 500,
      default_retry_count: 3,
      default_timeout: 5000,
      enable_coordinates_validation: true,
      coordinate_tolerance: 5
    },
    configSchema: {
      default_click_type: { type: 'select', label: 'Default Click Type', options: ['left', 'right', 'double', 'middle'], default: 'left' },
      show_click_indicators: { type: 'boolean', label: 'Show Click Indicators', default: true },
      indicator_size: { type: 'number', label: 'Indicator Size (px)', default: 20, min: 10, max: 50 },
      auto_name_actions: { type: 'boolean', label: 'Auto Name Actions', default: true },
      action_naming_pattern: { type: 'string', label: 'Action Naming Pattern', default: 'Click_{index}' },
      default_wait_before: { type: 'number', label: 'Default Wait Before (ms)', default: 0, min: 0, max: 10000 },
      default_wait_after: { type: 'number', label: 'Default Wait After (ms)', default: 500, min: 0, max: 10000 },
      default_retry_count: { type: 'number', label: 'Default Retry Count', default: 3, min: 0, max: 10 },
      default_timeout: { type: 'number', label: 'Default Timeout (ms)', default: 5000, min: 1000, max: 30000 },
      enable_coordinates_validation: { type: 'boolean', label: 'Enable Coordinates Validation', default: true },
      coordinate_tolerance: { type: 'number', label: 'Coordinate Tolerance (px)', default: 5, min: 1, max: 20 }
    }
  },

  snapshot_ocr_executor: {
    type: 'snapshot_ocr_executor',
    category: NodeCategory.ACTIONS,
    label: 'Snapshot OCR Executor',
    description: 'Execute OCR on predefined zones from snapshot templates during workflow execution',
    icon: '🔍',
    color: '#8b5cf6',
    inputs: [
      {
        id: 'trigger_input',
        name: 'Trigger',
        type: DataType.ANY,
        description: 'Execution trigger signal'
      },
      {
        id: 'zones_template',
        name: 'Zones Template',
        type: DataType.OBJECT,
        description: 'OCR zones template'
      },
      {
        id: 'live_desktop_input',
        name: 'Live Desktop',
        type: DataType.OBJECT,
        description: 'Live Desktop stream connection'
      }
    ],
    outputs: [
      {
        id: 'ocr_results',
        name: 'OCR Results',
        type: DataType.ARRAY,
        description: 'OCR results for all zones'
      },
      {
        id: 'extracted_texts',
        name: 'Extracted Texts',
        type: DataType.OBJECT,
        description: 'Extracted texts by zone name'
      },
      {
        id: 'confidence_scores',
        name: 'Confidence Scores',
        type: DataType.OBJECT,
        description: 'Confidence scores by zone name'
      },
      {
        id: 'execution_status',
        name: 'Execution Status',
        type: DataType.OBJECT,
        description: 'Execution status and metrics'
      }
    ],
    defaultConfig: {
      execute_all_zones: true,
      parallel_execution: true,
      max_parallel_zones: 5,
      timeout_per_zone: 10000,
      retry_failed_zones: true,
      max_retries: 2,
      confidence_threshold_override: null,
      language_override: null,
      save_debug_images: false,
      debug_output_directory: './debug/ocr'
    },
    configSchema: {
      execute_all_zones: { type: 'boolean', label: 'Execute All Zones', default: true },
      parallel_execution: { type: 'boolean', label: 'Parallel Execution', default: true },
      max_parallel_zones: { type: 'number', label: 'Max Parallel Zones', default: 5, min: 1, max: 20 },
      timeout_per_zone: { type: 'number', label: 'Timeout per Zone (ms)', default: 10000, min: 1000, max: 60000 },
      retry_failed_zones: { type: 'boolean', label: 'Retry Failed Zones', default: true },
      max_retries: { type: 'number', label: 'Max Retries', default: 2, min: 0, max: 5 },
      confidence_threshold_override: { type: 'number', label: 'Confidence Threshold Override', required: false, min: 0.1, max: 1.0, step: 0.1 },
      language_override: { type: 'select', label: 'Language Override', options: ['eng', 'deu', 'eng+deu', 'spa', 'fra', 'chi_sim'], required: false },
      save_debug_images: { type: 'boolean', label: 'Save Debug Images', default: false },
      debug_output_directory: { type: 'string', label: 'Debug Output Directory', default: './debug/ocr' }
    }
  },

  snapshot_click_executor: {
    type: 'snapshot_click_executor',
    category: NodeCategory.ACTIONS,
    label: 'Snapshot Click Executor',
    description: 'Execute click actions on predefined coordinates from snapshot templates during workflow execution',
    icon: '👆',
    color: '#10b981',
    inputs: [
      {
        id: 'trigger_input',
        name: 'Trigger',
        type: DataType.ANY,
        description: 'Execution trigger signal'
      },
      {
        id: 'actions_template',
        name: 'Actions Template',
        type: DataType.OBJECT,
        description: 'Click actions template'
      },
      {
        id: 'live_desktop_input',
        name: 'Live Desktop',
        type: DataType.OBJECT,
        description: 'Live Desktop stream connection'
      }
    ],
    outputs: [
      {
        id: 'click_results',
        name: 'Click Results',
        type: DataType.ARRAY,
        description: 'Click results for all actions'
      },
      {
        id: 'success_status',
        name: 'Success Status',
        type: DataType.OBJECT,
        description: 'Success status by action name'
      },
      {
        id: 'execution_metrics',
        name: 'Execution Metrics',
        type: DataType.OBJECT,
        description: 'Execution timing and metrics'
      },
      {
        id: 'execution_status',
        name: 'Execution Status',
        type: DataType.OBJECT,
        description: 'Overall execution status'
      }
    ],
    defaultConfig: {
      execute_all_actions: true,
      sequential_execution: true,
      delay_between_actions: 100,
      timeout_per_action: 5000,
      retry_failed_actions: true,
      max_retries: 2,
      coordinate_validation: true,
      validation_tolerance: 5,
      screenshot_before_click: false,
      screenshot_after_click: false,
      debug_output_directory: './debug/clicks'
    },
    configSchema: {
      execute_all_actions: { type: 'boolean', label: 'Execute All Actions', default: true },
      sequential_execution: { type: 'boolean', label: 'Sequential Execution', default: true },
      delay_between_actions: { type: 'number', label: 'Delay Between Actions (ms)', default: 100, min: 0, max: 5000 },
      timeout_per_action: { type: 'number', label: 'Timeout per Action (ms)', default: 5000, min: 1000, max: 30000 },
      retry_failed_actions: { type: 'boolean', label: 'Retry Failed Actions', default: true },
      max_retries: { type: 'number', label: 'Max Retries', default: 2, min: 0, max: 5 },
      coordinate_validation: { type: 'boolean', label: 'Coordinate Validation', default: true },
      validation_tolerance: { type: 'number', label: 'Validation Tolerance (px)', default: 5, min: 1, max: 20 },
      screenshot_before_click: { type: 'boolean', label: 'Screenshot Before Click', default: false },
      screenshot_after_click: { type: 'boolean', label: 'Screenshot After Click', default: false },
      debug_output_directory: { type: 'string', label: 'Debug Output Directory', default: './debug/clicks' }
    }
  },

  template_manager: {
    type: 'template_manager',
    category: NodeCategory.DATA,
    label: 'Template Manager',
    description: 'Save, load, and manage OCR/Click zone templates for reuse across workflows',
    icon: '📋',
    color: '#6366f1',
    inputs: [
      {
        id: 'template_input',
        name: 'Template',
        type: DataType.OBJECT,
        description: 'Template to save/process'
      },
      {
        id: 'operation_input',
        name: 'Operation',
        type: DataType.STRING,
        description: 'Operation to perform (save/load/delete)'
      }
    ],
    outputs: [
      {
        id: 'template_output',
        name: 'Template',
        type: DataType.OBJECT,
        description: 'Loaded or processed template'
      },
      {
        id: 'operation_result',
        name: 'Operation Result',
        type: DataType.OBJECT,
        description: 'Operation result and status'
      },
      {
        id: 'available_templates',
        name: 'Available Templates',
        type: DataType.ARRAY,
        description: 'List of available templates'
      }
    ],
    defaultConfig: {
      template_directory: './templates',
      auto_backup: true,
      backup_directory: './templates/backups',
      template_format: 'json',
      include_metadata: true,
      version_control: true,
      max_versions: 10,
      compression: false
    },
    configSchema: {
      template_directory: { type: 'string', label: 'Template Directory', default: './templates' },
      auto_backup: { type: 'boolean', label: 'Auto Backup', default: true },
      backup_directory: { type: 'string', label: 'Backup Directory', default: './templates/backups' },
      template_format: { type: 'select', label: 'Template Format', options: ['json', 'yaml', 'xml'], default: 'json' },
      include_metadata: { type: 'boolean', label: 'Include Metadata', default: true },
      version_control: { type: 'boolean', label: 'Version Control', default: true },
      max_versions: { type: 'number', label: 'Max Versions', default: 10, min: 1, max: 50 },
      compression: { type: 'boolean', label: 'Compression', default: false }
    }
  }
};

// ============================================================================
// EXPORT
// ============================================================================

export default SNAPSHOT_TEMPLATES;