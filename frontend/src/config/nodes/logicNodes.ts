/**
 * TRAE Visual Workflow System - Logic Node Templates
 * 
 * Node templates for workflow logic and control flow
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import { NodeCategory, DataType } from '../../types';
import { NodeTemplate } from './nodeTemplate';

// ============================================================================
// LOGIC NODE TEMPLATES
// ============================================================================

export const LOGIC_TEMPLATES: Record<string, NodeTemplate> = {
  if_condition: {
    type: 'if_condition',
    category: NodeCategory.LOGIC,
    label: 'If Condition',
    description: 'Conditional branching based on input evaluation',
    icon: '🔀',
    color: '#f59e0b',
    inputs: [
      {
        id: 'trigger_input',
        name: 'Trigger',
        type: DataType.ANY,
        description: 'Condition trigger signal'
      },
      {
        id: 'value_a',
        name: 'Value A',
        type: DataType.ANY,
        description: 'First comparison value'
      },
      {
        id: 'value_b',
        name: 'Value B',
        type: DataType.ANY,
        description: 'Second comparison value (optional)'
      }
    ],
    outputs: [
      {
        id: 'true_output',
        name: 'True',
        type: DataType.ANY,
        description: 'Output when condition is true'
      },
      {
        id: 'false_output',
        name: 'False',
        type: DataType.ANY,
        description: 'Output when condition is false'
      },
      {
        id: 'result',
        name: 'Result',
        type: DataType.BOOLEAN,
        description: 'Condition evaluation result'
      }
    ],
    defaultConfig: {
      condition_type: 'equals',
      value_a: '',
      value_b: '',
      case_sensitive: true,
      data_type: 'auto'
    },
    configSchema: {
      condition_type: {
        type: 'select',
        label: 'Condition Type',
        options: [
          'equals',
          'not_equals',
          'greater_than',
          'less_than',
          'greater_equal',
          'less_equal',
          'contains',
          'starts_with',
          'ends_with',
          'is_empty',
          'is_not_empty',
          'regex_match'
        ],
        default: 'equals'
      },
      value_a: { type: 'string', label: 'Value A', required: true },
      value_b: { type: 'string', label: 'Value B' },
      case_sensitive: { type: 'boolean', label: 'Case Sensitive', default: true },
      data_type: {
        type: 'select',
        label: 'Data Type',
        options: ['auto', 'string', 'number', 'boolean'],
        default: 'auto'
      }
    }
  },

  loop: {
    type: 'loop',
    category: NodeCategory.LOGIC,
    label: 'Loop',
    description: 'Iterate over data or repeat actions',
    icon: '🔄',
    color: '#f59e0b',
    inputs: [
      {
        id: 'trigger_input',
        name: 'Trigger',
        type: DataType.ANY,
        description: 'Loop trigger signal'
      },
      {
        id: 'data_input',
        name: 'Data',
        type: DataType.ARRAY,
        description: 'Data to iterate over'
      }
    ],
    outputs: [
      {
        id: 'item_output',
        name: 'Current Item',
        type: DataType.ANY,
        description: 'Current iteration item'
      },
      {
        id: 'index_output',
        name: 'Index',
        type: DataType.NUMBER,
        description: 'Current iteration index'
      },
      {
        id: 'completed_output',
        name: 'Completed',
        type: DataType.ANY,
        description: 'Signal when loop completes'
      }
    ],
    defaultConfig: {
      loop_type: 'for_each',
      max_iterations: 1000,
      delay_between: 0,
      break_on_error: true
    },
    configSchema: {
      loop_type: {
        type: 'select',
        label: 'Loop Type',
        options: ['for_each', 'while', 'for_count'],
        default: 'for_each'
      },
      max_iterations: {
        type: 'number',
        label: 'Max Iterations',
        default: 1000,
        min: 1,
        max: 10000
      },
      delay_between: {
        type: 'number',
        label: 'Delay Between (ms)',
        default: 0,
        min: 0,
        max: 60000
      },
      break_on_error: {
        type: 'boolean',
        label: 'Break on Error',
        default: true
      }
    }
  },

  switch: {
    type: 'switch',
    category: NodeCategory.LOGIC,
    label: 'Switch',
    description: 'Multi-way branching based on input value',
    icon: '🎛️',
    color: '#f59e0b',
    inputs: [
      {
        id: 'trigger_input',
        name: 'Trigger',
        type: DataType.ANY,
        description: 'Switch trigger signal'
      },
      {
        id: 'value_input',
        name: 'Value',
        type: DataType.ANY,
        description: 'Value to switch on'
      }
    ],
    outputs: [
      {
        id: 'case_1',
        name: 'Case 1',
        type: DataType.ANY,
        description: 'Output for case 1'
      },
      {
        id: 'case_2',
        name: 'Case 2',
        type: DataType.ANY,
        description: 'Output for case 2'
      },
      {
        id: 'case_3',
        name: 'Case 3',
        type: DataType.ANY,
        description: 'Output for case 3'
      },
      {
        id: 'default_output',
        name: 'Default',
        type: DataType.ANY,
        description: 'Default output when no case matches'
      }
    ],
    defaultConfig: {
      cases: [
        { value: '', output: 'case_1' },
        { value: '', output: 'case_2' },
        { value: '', output: 'case_3' }
      ],
      case_sensitive: true,
      use_default: true
    },
    configSchema: {
      cases: {
        type: 'array',
        label: 'Cases',
        items: {
          type: 'object',
          properties: {
            value: { type: 'string', label: 'Value' },
            output: { type: 'string', label: 'Output' }
          }
        }
      },
      case_sensitive: {
        type: 'boolean',
        label: 'Case Sensitive',
        default: true
      },
      use_default: {
        type: 'boolean',
        label: 'Use Default Output',
        default: true
      }
    }
  },

  delay: {
    type: 'delay',
    category: NodeCategory.LOGIC,
    label: 'Delay',
    description: 'Add time delay to workflow execution',
    icon: '⏱️',
    color: '#f59e0b',
    inputs: [
      {
        id: 'trigger_input',
        name: 'Trigger',
        type: DataType.ANY,
        description: 'Delay trigger signal'
      },
      {
        id: 'duration_input',
        name: 'Duration',
        type: DataType.NUMBER,
        description: 'Delay duration in ms (optional)'
      }
    ],
    outputs: [
      {
        id: 'delayed_output',
        name: 'Output',
        type: DataType.ANY,
        description: 'Signal after delay'
      }
    ],
    defaultConfig: {
      duration_ms: 1000,
      duration_type: 'fixed',
      min_duration: 500,
      max_duration: 2000
    },
    configSchema: {
      duration_ms: {
        type: 'number',
        label: 'Duration (ms)',
        default: 1000,
        min: 0,
        max: 300000
      },
      duration_type: {
        type: 'select',
        label: 'Duration Type',
        options: ['fixed', 'random'],
        default: 'fixed'
      },
      min_duration: {
        type: 'number',
        label: 'Min Duration (ms)',
        default: 500,
        min: 0,
        max: 300000
      },
      max_duration: {
        type: 'number',
        label: 'Max Duration (ms)',
        default: 2000,
        min: 0,
        max: 300000
      }
    }
  }
};