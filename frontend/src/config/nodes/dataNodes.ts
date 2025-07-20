/**
 * TRAE Visual Workflow System - Data Node Templates
 * 
 * Node templates for data processing and manipulation
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import { NodeCategory, DataType } from '../../types';
import { NodeTemplate } from './nodeTemplate';

// ============================================================================
// DATA NODE TEMPLATES
// ============================================================================

export const DATA_TEMPLATES: Record<string, NodeTemplate> = {
  variable_store: {
    type: 'variable_store',
    category: NodeCategory.DATA,
    label: 'Variable Store',
    description: 'Store and retrieve workflow variables',
    icon: '📦',
    color: '#8b5cf6',
    inputs: [
      {
        id: 'trigger_input',
        name: 'Trigger',
        type: DataType.ANY,
        description: 'Store trigger signal'
      },
      {
        id: 'value_input',
        name: 'Value',
        type: DataType.ANY,
        description: 'Value to store'
      },
      {
        id: 'key_input',
        name: 'Key',
        type: DataType.STRING,
        description: 'Variable key (optional)'
      }
    ],
    outputs: [
      {
        id: 'stored_value',
        name: 'Stored Value',
        type: DataType.ANY,
        description: 'The stored value'
      },
      {
        id: 'success',
        name: 'Success',
        type: DataType.BOOLEAN,
        description: 'Storage success status'
      }
    ],
    defaultConfig: {
      variable_key: '',
      default_value: '',
      persist: false,
      scope: 'workflow',
      data_type: 'auto'
    },
    configSchema: {
      variable_key: {
        type: 'string',
        label: 'Variable Key',
        required: true
      },
      default_value: {
        type: 'string',
        label: 'Default Value',
        default: ''
      },
      persist: {
        type: 'boolean',
        label: 'Persist Between Runs',
        default: false
      },
      scope: {
        type: 'select',
        label: 'Variable Scope',
        options: ['workflow', 'global', 'session'],
        default: 'workflow'
      },
      data_type: {
        type: 'select',
        label: 'Data Type',
        options: ['auto', 'string', 'number', 'boolean', 'object', 'array'],
        default: 'auto'
      }
    }
  },

  json_parser: {
    type: 'json_parser',
    category: NodeCategory.DATA,
    label: 'JSON Parser',
    description: 'Parse and manipulate JSON data',
    icon: '🔧',
    color: '#8b5cf6',
    inputs: [
      {
        id: 'trigger_input',
        name: 'Trigger',
        type: DataType.ANY,
        description: 'Parser trigger signal'
      },
      {
        id: 'json_input',
        name: 'JSON',
        type: DataType.STRING,
        description: 'JSON string to parse'
      },
      {
        id: 'path_input',
        name: 'Path',
        type: DataType.STRING,
        description: 'JSON path (optional)'
      }
    ],
    outputs: [
      {
        id: 'parsed_data',
        name: 'Parsed Data',
        type: DataType.OBJECT,
        description: 'Parsed JSON object'
      },
      {
        id: 'extracted_value',
        name: 'Extracted Value',
        type: DataType.ANY,
        description: 'Value at specified path'
      },
      {
        id: 'success',
        name: 'Success',
        type: DataType.BOOLEAN,
        description: 'Parsing success status'
      },
      {
        id: 'error_message',
        name: 'Error',
        type: DataType.STRING,
        description: 'Error message if parsing fails'
      }
    ],
    defaultConfig: {
      json_string: '',
      json_path: '',
      operation: 'parse',
      strict_mode: true,
      output_format: 'object'
    },
    configSchema: {
      json_string: {
        type: 'textarea',
        label: 'JSON String',
        default: ''
      },
      json_path: {
        type: 'string',
        label: 'JSON Path (e.g., $.data.items[0])',
        default: ''
      },
      operation: {
        type: 'select',
        label: 'Operation',
        options: ['parse', 'extract', 'validate', 'stringify'],
        default: 'parse'
      },
      strict_mode: {
        type: 'boolean',
        label: 'Strict Mode',
        default: true
      },
      output_format: {
        type: 'select',
        label: 'Output Format',
        options: ['object', 'string', 'array'],
        default: 'object'
      }
    }
  },

  text_processor: {
    type: 'text_processor',
    category: NodeCategory.DATA,
    label: 'Text Processor',
    description: 'Process and transform text data',
    icon: '📝',
    color: '#8b5cf6',
    inputs: [
      {
        id: 'trigger_input',
        name: 'Trigger',
        type: DataType.ANY,
        description: 'Processor trigger signal'
      },
      {
        id: 'text_input',
        name: 'Text',
        type: DataType.STRING,
        description: 'Text to process'
      }
    ],
    outputs: [
      {
        id: 'processed_text',
        name: 'Processed Text',
        type: DataType.STRING,
        description: 'Processed text output'
      },
      {
        id: 'metadata',
        name: 'Metadata',
        type: DataType.OBJECT,
        description: 'Processing metadata'
      }
    ],
    defaultConfig: {
      operation: 'trim',
      case_transform: 'none',
      find_text: '',
      replace_text: '',
      regex_pattern: '',
      regex_flags: 'g',
      split_delimiter: '',
      join_delimiter: ' '
    },
    configSchema: {
      operation: {
        type: 'select',
        label: 'Operation',
        options: [
          'trim',
          'uppercase',
          'lowercase',
          'capitalize',
          'replace',
          'regex_replace',
          'split',
          'join',
          'substring',
          'length'
        ],
        default: 'trim'
      },
      case_transform: {
        type: 'select',
        label: 'Case Transform',
        options: ['none', 'upper', 'lower', 'title', 'sentence'],
        default: 'none'
      },
      find_text: {
        type: 'string',
        label: 'Find Text',
        default: ''
      },
      replace_text: {
        type: 'string',
        label: 'Replace Text',
        default: ''
      },
      regex_pattern: {
        type: 'string',
        label: 'Regex Pattern',
        default: ''
      },
      regex_flags: {
        type: 'string',
        label: 'Regex Flags',
        default: 'g'
      },
      split_delimiter: {
        type: 'string',
        label: 'Split Delimiter',
        default: ''
      },
      join_delimiter: {
        type: 'string',
        label: 'Join Delimiter',
        default: ' '
      }
    }
  },

  data_transformer: {
    type: 'data_transformer',
    category: NodeCategory.DATA,
    label: 'Data Transformer',
    description: 'Transform data between different formats',
    icon: '🔄',
    color: '#8b5cf6',
    inputs: [
      {
        id: 'trigger_input',
        name: 'Trigger',
        type: DataType.ANY,
        description: 'Transform trigger signal'
      },
      {
        id: 'data_input',
        name: 'Data',
        type: DataType.ANY,
        description: 'Data to transform'
      }
    ],
    outputs: [
      {
        id: 'transformed_data',
        name: 'Transformed Data',
        type: DataType.ANY,
        description: 'Transformed data output'
      },
      {
        id: 'success',
        name: 'Success',
        type: DataType.BOOLEAN,
        description: 'Transformation success status'
      }
    ],
    defaultConfig: {
      input_format: 'auto',
      output_format: 'json',
      transformation_rules: [],
      preserve_structure: true,
      handle_errors: 'skip'
    },
    configSchema: {
      input_format: {
        type: 'select',
        label: 'Input Format',
        options: ['auto', 'json', 'xml', 'csv', 'yaml', 'text'],
        default: 'auto'
      },
      output_format: {
        type: 'select',
        label: 'Output Format',
        options: ['json', 'xml', 'csv', 'yaml', 'text'],
        default: 'json'
      },
      transformation_rules: {
        type: 'array',
        label: 'Transformation Rules',
        items: {
          type: 'object',
          properties: {
            source_path: { type: 'string', label: 'Source Path' },
            target_path: { type: 'string', label: 'Target Path' },
            transform_function: { type: 'string', label: 'Transform Function' }
          }
        }
      },
      preserve_structure: {
        type: 'boolean',
        label: 'Preserve Structure',
        default: true
      },
      handle_errors: {
        type: 'select',
        label: 'Error Handling',
        options: ['skip', 'stop', 'default_value'],
        default: 'skip'
      }
    }
  }
};