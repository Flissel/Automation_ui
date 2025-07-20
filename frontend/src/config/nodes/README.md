# TRAE Node Templates - Modular Structure

This directory contains the refactored node templates for the TRAE Visual Workflow System, organized into smaller, more maintainable files.

## Directory Structure

```
nodes/
├── README.md              # This documentation file
├── index.ts              # Main export file with all templates and utilities
├── types.ts              # Shared interfaces and helper functions
├── triggerNodes.ts       # Trigger node templates
├── actionNodes.ts        # Action node templates
├── logicNodes.ts         # Logic and control flow node templates
└── dataNodes.ts          # Data processing node templates
```

## File Descriptions

### `types.ts`
Contains:
- `NodeTemplate` interface definition
- Helper functions: `getNodeTemplate`, `getNodeTemplatesByCategory`, `createNodeFromTemplate`, `validateNodeConfig`
- Shared utilities for working with node templates

### `triggerNodes.ts`
Defines trigger node templates:
- `manual_trigger` - Manually start workflow execution
- `file_watcher` - Trigger on file system changes
- `schedule_trigger` - Trigger on time-based schedule
- `webhook_trigger` - Trigger via HTTP webhook

### `actionNodes.ts`
Defines action node templates:
- `click_action` - Perform mouse click on UI element
- `ocr_action` - Extract text from images using OCR
- `screenshot_action` - Capture screen or window screenshot
- `type_text_action` - Type text into active input field
- `http_request_action` - Make HTTP requests to APIs

### `logicNodes.ts`
Defines logic and control flow node templates:
- `if_condition` - Conditional branching based on input evaluation
- `loop` - Iterate over data or repeat actions
- `switch` - Multi-way branching based on input value
- `delay` - Add time delay to workflow execution

### `dataNodes.ts`
Defines data processing node templates:
- `variable_store` - Store and retrieve workflow variables
- `json_parser` - Parse and manipulate JSON data
- `text_processor` - Process and transform text data
- `data_transformer` - Transform data between different formats

### `index.ts`
Main export file that:
- Combines all node templates into a single `NODE_TEMPLATES` object
- Re-exports all individual template categories
- Provides convenience functions for working with templates
- Maintains backward compatibility with the original API

## Usage

### Import All Templates
```typescript
import { NODE_TEMPLATES } from './config/nodes';
```

### Import Specific Categories
```typescript
import { TRIGGER_TEMPLATES, ACTION_TEMPLATES } from './config/nodes';
```

### Import Helper Functions
```typescript
import { 
  getTemplate, 
  createNode, 
  validateConfig 
} from './config/nodes';
```

### Backward Compatibility
The original `nodeTemplates.ts` file now re-exports everything from this modular structure, so existing imports will continue to work:

```typescript
// This still works
import { NODE_TEMPLATES, getNodeTemplate } from './config/nodeTemplates';
```

## Benefits of Refactoring

1. **Maintainability**: Each file focuses on a specific category of nodes
2. **Readability**: Smaller files are easier to navigate and understand
3. **Modularity**: Individual categories can be modified without affecting others
4. **Scalability**: New node types can be added to appropriate category files
5. **Team Development**: Multiple developers can work on different categories simultaneously
6. **Testing**: Each category can be unit tested independently
7. **Documentation**: Each file can have focused documentation for its node types

## Adding New Nodes

1. Determine the appropriate category for your new node
2. Add the node template to the corresponding file (e.g., `actionNodes.ts` for actions)
3. Follow the existing pattern and include all required properties
4. The node will automatically be included in the combined `NODE_TEMPLATES` object

## Migration Notes

- All existing functionality is preserved
- No breaking changes to the public API
- Original `nodeTemplates.ts` file now acts as a compatibility layer
- All imports and usage patterns remain the same

## Version

Version: 2.0.0
Author: TRAE Development Team