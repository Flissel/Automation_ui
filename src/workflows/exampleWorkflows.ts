/**
 * Example Workflow Templates
 * 
 * This file contains pre-designed workflow templates that demonstrate
 * the capabilities of the node system and serve as examples for users.
 * 
 * Each workflow template includes:
 * - Node definitions with proper types and configurations
 * - Edge connections showing data flow
 * - Comments explaining the workflow logic
 * - Best practices for node organization
 */

import { WorkflowDefinition, WorkflowNode, WorkflowEdge } from '../types/workflow';
import { NodeType } from '../types/nodes';

/**
 * Desktop Automation with OCR Workflow
 * 
 * This comprehensive workflow demonstrates:
 * - Manual trigger initiation
 * - Desktop interface configuration
 * - OCR text extraction and processing
 * - Conditional logic based on extracted text
 * - Automated click and type actions
 * - HTTP API integration
 * - Result aggregation and storage
 */
export const desktopAutomationWithOCRWorkflow: WorkflowDefinition = {
  id: 'desktop-automation-ocr',
  name: 'Desktop Automation with OCR',
  description: 'Automated desktop interaction using OCR text recognition and conditional logic',
  version: '1.0.0',
  nodes: [
    // 1. Manual Trigger - Start the workflow
    {
      id: 'trigger-start',
      type: NodeType.MANUAL_TRIGGER,
      position: { x: 100, y: 100 },
      data: {
        label: 'Start Automation',
        description: 'Manual trigger to initiate desktop automation',
        config: {
          triggerMessage: 'Click to start desktop automation workflow'
        }
      }
    },
    
    // 2. WebSocket Configuration - Setup desktop connection
    {
      id: 'websocket-config',
      type: NodeType.WEBSOCKET_CONFIG,
      position: { x: 300, y: 100 },
      data: {
        label: 'Desktop Connection',
        description: 'Configure WebSocket connection for desktop interface',
        config: {
          host: 'localhost',
          port: 8080,
          path: '/desktop',
          reconnectAttempts: 3,
          reconnectDelay: 1000
        }
      }
    },
    
    // 3. Live Desktop Interface - Main desktop interaction hub
    {
      id: 'desktop-interface',
      type: NodeType.LIVE_DESKTOP,
      position: { x: 500, y: 100 },
      data: {
        label: 'Desktop Interface',
        description: 'Live desktop interface for screen capture and interaction',
        config: {
          fps: 10,
          quality: 80,
          width: 1920,
          height: 1080,
          enableFileSystem: true,
          fileSystemPath: './desktop_captures'
        }
      }
    },
    
    // 4. OCR Region Definition - Define text extraction area
    {
      id: 'ocr-region',
      type: NodeType.OCR_REGION,
      position: { x: 700, y: 50 },
      data: {
        label: 'OCR Text Region',
        description: 'Define region for text extraction',
        config: {
          x: 100,
          y: 100,
          width: 400,
          height: 200,
          confidence: 0.8
        }
      }
    },
    
    // 5. OCR Text Extraction - Extract text from defined region
    {
      id: 'ocr-extract',
      type: NodeType.OCR_EXTRACT,
      position: { x: 900, y: 50 },
      data: {
        label: 'Extract Text',
        description: 'Extract text from OCR region',
        config: {
          language: 'eng',
          oem: 3,
          psm: 6,
          enableFileSystem: true,
          fileSystemPath: './ocr_results'
        }
      }
    },
    
    // 6. Conditional Logic - Decision based on extracted text
    {
      id: 'text-condition',
      type: NodeType.IF_CONDITION,
      position: { x: 700, y: 200 },
      data: {
        label: 'Text Analysis',
        description: 'Analyze extracted text and make decisions',
        config: {
          condition: 'contains',
          value: 'Login',
          caseSensitive: false
        }
      }
    },
    
    // 7. Click Action - Automated clicking based on condition
    {
      id: 'click-login',
      type: NodeType.CLICK_ACTION,
      position: { x: 500, y: 300 },
      data: {
        label: 'Click Login Button',
        description: 'Click on login button if detected',
        config: {
          x: 300,
          y: 400,
          button: 'left',
          clickCount: 1,
          enableFileSystem: true,
          fileSystemPath: './click_actions'
        }
      }
    },
    
    // 8. Type Text Action - Enter credentials
    {
      id: 'type-credentials',
      type: NodeType.TYPE_TEXT_ACTION,
      position: { x: 700, y: 300 },
      data: {
        label: 'Enter Credentials',
        description: 'Type username and password',
        config: {
          text: 'user@example.com',
          delay: 100,
          enableFileSystem: true,
          fileSystemPath: './text_actions'
        }
      }
    },
    
    // 9. HTTP Request - Send data to external service
    {
      id: 'api-notification',
      type: NodeType.HTTP_REQUEST_ACTION,
      position: { x: 900, y: 200 },
      data: {
        label: 'API Notification',
        description: 'Send automation status to external API',
        config: {
          url: 'https://api.example.com/automation/status',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ${API_TOKEN}'
          },
          body: {
            workflow: 'desktop-automation-ocr',
            status: 'completed',
            timestamp: '${TIMESTAMP}'
          }
        }
      }
    },
    
    // 10. Delay - Wait before next action
    {
      id: 'wait-delay',
      type: NodeType.DELAY,
      position: { x: 500, y: 450 },
      data: {
        label: 'Wait 2 seconds',
        description: 'Delay before final actions',
        config: {
          duration: 2000,
          unit: 'milliseconds'
        }
      }
    },
    
    // 11. Filesystem Storage - Save workflow data
    {
      id: 'save-results',
      type: NodeType.SEND_TO_FILESYSTEM,
      position: { x: 700, y: 450 },
      data: {
        label: 'Save Results',
        description: 'Store workflow results to filesystem',
        config: {
          directory: './workflow_results',
          filename: 'automation_${TIMESTAMP}.json',
          format: 'json',
          createDirectory: true,
          overwrite: false
        }
      }
    },
    
    // 12. Workflow Result - Final result aggregation
    {
      id: 'final-result',
      type: NodeType.WORKFLOW_RESULT,
      position: { x: 900, y: 450 },
      data: {
        label: 'Workflow Complete',
        description: 'Aggregate and finalize workflow results',
        config: {
          resultFormat: 'detailed',
          includeMetadata: true,
          exportFormat: 'json'
        }
      }
    }
  ],
  
  edges: [
    // Main execution flow
    { id: 'e1', source: 'trigger-start', target: 'websocket-config', type: 'default' },
    { id: 'e2', source: 'websocket-config', target: 'desktop-interface', type: 'default' },
    { id: 'e3', source: 'desktop-interface', target: 'ocr-region', type: 'default' },
    { id: 'e4', source: 'ocr-region', target: 'ocr-extract', type: 'default' },
    { id: 'e5', source: 'ocr-extract', target: 'text-condition', type: 'default' },
    
    // Conditional branches
    { id: 'e6', source: 'text-condition', target: 'click-login', type: 'conditional', sourceHandle: 'true' },
    { id: 'e7', source: 'click-login', target: 'type-credentials', type: 'default' },
    { id: 'e8', source: 'text-condition', target: 'api-notification', type: 'conditional', sourceHandle: 'false' },
    
    // Parallel execution paths
    { id: 'e9', source: 'type-credentials', target: 'wait-delay', type: 'default' },
    { id: 'e10', source: 'api-notification', target: 'save-results', type: 'default' },
    { id: 'e11', source: 'wait-delay', target: 'save-results', type: 'default' },
    { id: 'e12', source: 'save-results', target: 'final-result', type: 'default' }
  ],
  
  metadata: {
    category: 'Desktop Automation',
    tags: ['OCR', 'Desktop', 'Automation', 'Conditional Logic'],
    estimatedDuration: '30-60 seconds',
    complexity: 'Advanced',
    requirements: [
      'Desktop WebSocket connection',
      'OCR engine (Tesseract)',
      'Filesystem write permissions',
      'External API access (optional)'
    ]
  }
};

/**
 * Simple Web Scraping Workflow
 * 
 * A simpler workflow demonstrating:
 * - HTTP requests for data fetching
 * - Basic conditional logic
 * - Data storage and result aggregation
 */
export const webScrapingWorkflow: WorkflowDefinition = {
  id: 'web-scraping-basic',
  name: 'Basic Web Scraping',
  description: 'Simple web scraping workflow with data extraction and storage',
  version: '1.0.0',
  nodes: [
    {
      id: 'webhook-trigger',
      type: NodeType.WEBHOOK_TRIGGER,
      position: { x: 100, y: 100 },
      data: {
        label: 'Webhook Start',
        description: 'Webhook trigger for automated scraping',
        config: {
          path: '/scrape',
          method: 'POST',
          authentication: false
        }
      }
    },
    {
      id: 'fetch-data',
      type: NodeType.HTTP_REQUEST_ACTION,
      position: { x: 300, y: 100 },
      data: {
        label: 'Fetch Web Data',
        description: 'HTTP request to fetch web page data',
        config: {
          url: 'https://api.example.com/data',
          method: 'GET',
          headers: {
            'User-Agent': 'Workflow-Bot/1.0'
          }
        }
      }
    },
    {
      id: 'data-condition',
      type: NodeType.IF_CONDITION,
      position: { x: 500, y: 100 },
      data: {
        label: 'Data Validation',
        description: 'Check if data was successfully fetched',
        config: {
          condition: 'exists',
          value: 'data',
          caseSensitive: false
        }
      }
    },
    {
      id: 'store-data',
      type: NodeType.SEND_TO_FILESYSTEM,
      position: { x: 700, y: 100 },
      data: {
        label: 'Store Data',
        description: 'Save scraped data to filesystem',
        config: {
          directory: './scraped_data',
          filename: 'data_${TIMESTAMP}.json',
          format: 'json',
          createDirectory: true
        }
      }
    },
    {
      id: 'scraping-result',
      type: NodeType.WORKFLOW_RESULT,
      position: { x: 900, y: 100 },
      data: {
        label: 'Scraping Complete',
        description: 'Final result of web scraping workflow',
        config: {
          resultFormat: 'summary',
          includeMetadata: true
        }
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'webhook-trigger', target: 'fetch-data', type: 'default' },
    { id: 'e2', source: 'fetch-data', target: 'data-condition', type: 'default' },
    { id: 'e3', source: 'data-condition', target: 'store-data', type: 'conditional', sourceHandle: 'true' },
    { id: 'e4', source: 'store-data', target: 'scraping-result', type: 'default' },
    { id: 'e5', source: 'data-condition', target: 'scraping-result', type: 'conditional', sourceHandle: 'false' }
  ],
  metadata: {
    category: 'Web Scraping',
    tags: ['HTTP', 'Data Extraction', 'Storage'],
    estimatedDuration: '5-15 seconds',
    complexity: 'Beginner',
    requirements: ['Internet access', 'Filesystem write permissions']
  }
};

/**
 * N8N Integration Workflow
 * 
 * Demonstrates integration with external automation platforms:
 * - Manual trigger
 * - Data processing
 * - N8N webhook integration
 * - Result tracking
 */
export const n8nIntegrationWorkflow: WorkflowDefinition = {
  id: 'n8n-integration',
  name: 'N8N Integration Workflow',
  description: 'Workflow demonstrating integration with N8N automation platform',
  version: '1.0.0',
  nodes: [
    {
      id: 'manual-start',
      type: NodeType.MANUAL_TRIGGER,
      position: { x: 100, y: 100 },
      data: {
        label: 'Start Integration',
        description: 'Manual trigger to start N8N integration',
        config: {
          triggerMessage: 'Click to start N8N integration workflow'
        }
      }
    },
    {
      id: 'prepare-data',
      type: NodeType.HTTP_REQUEST_ACTION,
      position: { x: 300, y: 100 },
      data: {
        label: 'Prepare Data',
        description: 'Fetch and prepare data for N8N',
        config: {
          url: 'https://api.internal.com/workflow-data',
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ${INTERNAL_API_TOKEN}'
          }
        }
      }
    },
    {
      id: 'send-to-n8n',
      type: NodeType.N8N_WEBHOOK,
      position: { x: 500, y: 100 },
      data: {
        label: 'Send to N8N',
        description: 'Send processed data to N8N webhook',
        config: {
          webhookUrl: 'https://n8n.example.com/webhook/workflow-integration',
          method: 'POST',
          authentication: {
            type: 'header',
            key: 'X-API-Key',
            value: '${N8N_API_KEY}'
          }
        }
      }
    },
    {
      id: 'track-result',
      type: NodeType.WORKFLOW_RESULT,
      position: { x: 700, y: 100 },
      data: {
        label: 'Track Integration',
        description: 'Track N8N integration results',
        config: {
          resultFormat: 'detailed',
          includeMetadata: true,
          exportFormat: 'json'
        }
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'manual-start', target: 'prepare-data', type: 'default' },
    { id: 'e2', source: 'prepare-data', target: 'send-to-n8n', type: 'default' },
    { id: 'e3', source: 'send-to-n8n', target: 'track-result', type: 'default' }
  ],
  metadata: {
    category: 'Integration',
    tags: ['N8N', 'Webhook', 'External Integration'],
    estimatedDuration: '10-20 seconds',
    complexity: 'Intermediate',
    requirements: ['N8N instance', 'API access tokens', 'Network connectivity']
  }
};

/**
 * Export all workflow templates
 */
export const workflowTemplates = {
  desktopAutomationWithOCR: desktopAutomationWithOCRWorkflow,
  webScraping: webScrapingWorkflow,
  n8nIntegration: n8nIntegrationWorkflow
};

/**
 * Get workflow template by ID
 */
export function getWorkflowTemplate(id: string): WorkflowDefinition | undefined {
  return Object.values(workflowTemplates).find(template => template.id === id);
}

/**
 * Get all available workflow templates
 */
export function getAllWorkflowTemplates(): WorkflowDefinition[] {
  return Object.values(workflowTemplates);
}

/**
 * Get workflow templates by category
 */
export function getWorkflowTemplatesByCategory(category: string): WorkflowDefinition[] {
  return Object.values(workflowTemplates).filter(
    template => template.metadata?.category === category
  );
}

/**
 * Get workflow templates by complexity level
 */
export function getWorkflowTemplatesByComplexity(complexity: string): WorkflowDefinition[] {
  return Object.values(workflowTemplates).filter(
    template => template.metadata?.complexity === complexity
  );
}