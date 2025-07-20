/**
 * TRAE Visual Workflow System - Advanced Automation Node Templates
 * 
 * Advanced OCR monitoring and automation node templates
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import { NodeCategory, DataType } from '../../types';
import { NodeTemplate } from './nodeTemplate';

// ============================================================================
// ADVANCED AUTOMATION NODE TEMPLATES
// ============================================================================

export const ADVANCED_AUTOMATION_TEMPLATES: Record<string, NodeTemplate> = {
  ocr_click_pattern_monitor: {
    type: 'ocr_click_pattern_monitor',
    category: NodeCategory.ACTIONS,
    label: 'OCR Click Pattern Monitor',
    description: 'Advanced OCR monitoring with automatic click actions on text pattern detection',
    icon: '🎯',
    color: '#8b5cf6',
    inputs: [
      {
        id: 'trigger_input',
        name: 'Trigger',
        type: DataType.ANY,
        description: 'Monitor trigger signal'
      },
      {
        id: 'live_desktop_input',
        name: 'Live Desktop',
        type: DataType.OBJECT,
        description: 'Live Desktop connection'
      }
    ],
    outputs: [
      {
        id: 'pattern_detected',
        name: 'Pattern Detected',
        type: DataType.BOOLEAN,
        description: 'Triggers when target pattern is found'
      },
      {
        id: 'click_executed',
        name: 'Click Executed',
        type: DataType.BOOLEAN,
        description: 'Triggers when click action is performed'
      },
      {
        id: 'detected_text',
        name: 'Detected Text',
        type: DataType.STRING,
        description: 'Text that matched the pattern'
      },
      {
        id: 'click_coordinates',
        name: 'Click Coordinates',
        type: DataType.OBJECT,
        description: 'Coordinates where click was executed'
      }
    ],
    defaultConfig: {
      target_pattern: '',
      similarity_threshold: 0.8,
      monitoring_interval: 3,
      click_offset_x: 0,
      click_offset_y: 0,
      click_button: 'left',
      auto_click: true,
      max_monitoring_duration: 300,
      language: 'eng+deu',
      confidence_threshold: 0.7,
      region: { x: 0, y: 0, width: 400, height: 200 },
      enable_logging: true,
      continuous_monitoring: true
    },
    configSchema: {
      target_pattern: { 
        type: 'string', 
        label: 'Target Text Pattern', 
        required: true,
        description: 'Text pattern to search for and click on'
      },
      similarity_threshold: { 
        type: 'number', 
        label: 'Pattern Similarity Threshold', 
        default: 0.8, 
        min: 0.1, 
        max: 1.0, 
        step: 0.1,
        description: 'How closely the text must match (0.1-1.0)'
      },
      monitoring_interval: { 
        type: 'number', 
        label: 'Monitoring Interval (seconds)', 
        default: 3, 
        min: 1, 
        max: 60,
        description: 'How often to check for the pattern'
      },
      click_offset_x: { 
        type: 'number', 
        label: 'Click Offset X (pixels)', 
        default: 0,
        description: 'Horizontal offset from detected text center'
      },
      click_offset_y: { 
        type: 'number', 
        label: 'Click Offset Y (pixels)', 
        default: 0,
        description: 'Vertical offset from detected text center'
      },
      click_button: { 
        type: 'select', 
        label: 'Click Button', 
        options: ['left', 'right', 'middle'], 
        default: 'left'
      },
      auto_click: { 
        type: 'boolean', 
        label: 'Auto-Click When Found', 
        default: true,
        description: 'Automatically click when pattern is detected'
      },
      max_monitoring_duration: { 
        type: 'number', 
        label: 'Max Duration (seconds)', 
        default: 300, 
        min: 10, 
        max: 3600,
        description: 'Maximum time to monitor before stopping'
      },
      language: { 
        type: 'select', 
        label: 'OCR Language', 
        options: ['eng', 'deu', 'eng+deu', 'spa', 'fra', 'chi_sim'], 
        default: 'eng+deu'
      },
      confidence_threshold: { 
        type: 'number', 
        label: 'OCR Confidence Threshold', 
        default: 0.7, 
        min: 0.1, 
        max: 1.0, 
        step: 0.1,
        description: 'Minimum OCR confidence required'
      },
      region: { 
        type: 'object', 
        label: 'Monitoring Region', 
        properties: { 
          x: { type: 'number', label: 'X', default: 0 }, 
          y: { type: 'number', label: 'Y', default: 0 }, 
          width: { type: 'number', label: 'Width', default: 400 }, 
          height: { type: 'number', label: 'Height', default: 200 } 
        },
        description: 'Screen region to monitor'
      },
      enable_logging: { 
        type: 'boolean', 
        label: 'Enable Detailed Logging', 
        default: true 
      },
      continuous_monitoring: { 
        type: 'boolean', 
        label: 'Continuous Monitoring', 
        default: true,
        description: 'Continue monitoring after first detection'
      }
    }
  },

  enhanced_ocr_monitor: {
    type: 'enhanced_ocr_monitor',
    category: NodeCategory.ACTIONS,
    label: 'Enhanced OCR Monitor',
    description: 'Advanced multi-pattern OCR monitoring with flexible region and pattern matching',
    icon: '🔍',
    color: '#6366f1',
    inputs: [
      {
        id: 'trigger_input',
        name: 'Trigger',
        type: DataType.ANY,
        description: 'Monitor trigger signal'
      },
      {
        id: 'live_desktop_input',
        name: 'Live Desktop',
        type: DataType.OBJECT,
        description: 'Live Desktop connection'
      }
    ],
    outputs: [
      {
        id: 'patterns_detected',
        name: 'Patterns Detected',
        type: DataType.ARRAY,
        description: 'Array of detected text patterns with locations'
      },
      {
        id: 'text_changes',
        name: 'Text Changes',
        type: DataType.BOOLEAN,
        description: 'Triggers when monitored text changes'
      },
      {
        id: 'current_text',
        name: 'Current Text',
        type: DataType.STRING,
        description: 'Latest detected text from all regions'
      },
      {
        id: 'regions_data',
        name: 'Regions Data',
        type: DataType.ARRAY,
        description: 'Data from each monitored region'
      },
      {
        id: 'monitoring_stats',
        name: 'Monitoring Statistics',
        type: DataType.OBJECT,
        description: 'Performance and detection statistics'
      }
    ],
    defaultConfig: {
      patterns: [''],
      regions: [{ x: 0, y: 0, width: 300, height: 100, name: 'Region 1' }],
      monitor_duration: 60,
      detection_interval: 2,
      similarity_threshold: 0.85
    },
    configSchema: {
      patterns: {
        type: 'array',
        label: 'Text Patterns to Monitor',
        description: 'List of text patterns to detect',
        itemType: 'string',
        minItems: 1,
        default: ['']
      },
      regions: {
        type: 'array',
        label: 'Monitoring Regions',
        description: 'Screen regions to monitor',
        itemType: 'object',
        itemProperties: {
          x: { type: 'number', label: 'X Position', default: 0 },
          y: { type: 'number', label: 'Y Position', default: 0 },
          width: { type: 'number', label: 'Width', default: 300 },
          height: { type: 'number', label: 'Height', default: 100 },
          name: { type: 'string', label: 'Region Name', default: 'Region' }
        },
        minItems: 1,
        default: [{ x: 0, y: 0, width: 300, height: 100, name: 'Region 1' }]
      },
      monitor_duration: {
        type: 'number',
        label: 'Monitor Duration (seconds)',
        default: 60,
        min: 5,
        max: 3600,
        description: 'How long to monitor before stopping'
      },
      detection_interval: {
        type: 'number',
        label: 'Detection Interval (seconds)',
        default: 2,
        min: 0.5,
        max: 30,
        step: 0.5,
        description: 'Time between detection attempts'
      },
      similarity_threshold: {
        type: 'number',
        label: 'Text Similarity Threshold',
        default: 0.85,
        min: 0.1,
        max: 1.0,
        step: 0.05,
        description: 'Minimum similarity for pattern matching'
      }
    }
  },

  ocr_text_tracker: {
    type: 'ocr_text_tracker',
    category: NodeCategory.ACTIONS,
    label: 'OCR Text Tracker',
    description: 'Track specific text elements across the screen with change detection',
    icon: '📍',
    color: '#10b981',
    inputs: [
      {
        id: 'trigger_input',
        name: 'Trigger',
        type: DataType.ANY,
        description: 'Tracking trigger signal'
      }
    ],
    outputs: [
      {
        id: 'tracked_text',
        name: 'Tracked Text',
        type: DataType.STRING,
        description: 'Currently tracked text value'
      },
      {
        id: 'text_location',
        name: 'Text Location',
        type: DataType.OBJECT,
        description: 'Screen coordinates of tracked text'
      },
      {
        id: 'change_detected',
        name: 'Change Detected',
        type: DataType.BOOLEAN,
        description: 'Triggers when text changes'
      }
    ],
    defaultConfig: {
      track_pattern: '',
      tracking_region: { x: 0, y: 0, width: 200, height: 50 },
      update_interval: 1,
      change_threshold: 0.1,
      language: 'eng'
    },
    configSchema: {
      track_pattern: { 
        type: 'string', 
        label: 'Text to Track', 
        required: true,
        description: 'Specific text or pattern to track'
      },
      tracking_region: { 
        type: 'object', 
        label: 'Tracking Region',
        properties: { 
          x: { type: 'number', default: 0 }, 
          y: { type: 'number', default: 0 }, 
          width: { type: 'number', default: 200 }, 
          height: { type: 'number', default: 50 } 
        }
      },
      update_interval: { 
        type: 'number', 
        label: 'Update Interval (seconds)', 
        default: 1, 
        min: 0.5, 
        max: 60 
      },
      change_threshold: { 
        type: 'number', 
        label: 'Change Threshold', 
        default: 0.1, 
        min: 0.01, 
        max: 1.0, 
        step: 0.01 
      },
      language: { 
        type: 'select', 
        label: 'OCR Language', 
        options: ['eng', 'deu', 'spa', 'fra'], 
        default: 'eng' 
      }
    }
  }
};