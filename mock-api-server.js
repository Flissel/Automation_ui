/**
 * Mock API Server for TRAE Unity AI Platform
 * Provides mock endpoints for development when backend services are not available
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8091;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data
const mockExecutions = [
  {
    id: 'exec-001',
    templateId: 'notepad-analysis',
    status: 'completed',
    startTime: new Date(Date.now() - 300000).toISOString(),
    endTime: new Date(Date.now() - 240000).toISOString(),
    progress: 100,
    currentStep: 'Analysis Complete',
    results: {
      textExtracted: 'Sample text from notepad',
      analysisComplete: true
    }
  },
  {
    id: 'exec-002',
    templateId: 'web-automation',
    status: 'running',
    startTime: new Date(Date.now() - 120000).toISOString(),
    progress: 65,
    currentStep: 'Filling form data',
    results: {
      pageLoaded: true,
      formFilled: false
    }
  },
  {
    id: 'exec-003',
    templateId: 'data-extraction',
    status: 'failed',
    startTime: new Date(Date.now() - 600000).toISOString(),
    endTime: new Date(Date.now() - 580000).toISOString(),
    progress: 30,
    currentStep: 'Data validation failed',
    error: 'Invalid data format detected',
    results: {
      dataExtracted: false,
      errorDetails: 'Format validation failed'
    }
  }
];

const mockDesktops = [
  {
    id: 'desktop-001',
    name: 'Windows Desktop 1',
    status: 'active',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    lastActivity: new Date(Date.now() - 3600000).toISOString(),
    connectionUrl: 'ws://localhost:8084/desktop-001',
    metadata: {
      os: 'Windows 11',
      resolution: '1920x1080'
    }
  },
  {
    id: 'desktop-002',
    name: 'Linux Desktop 1',
    status: 'inactive',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    lastActivity: new Date(Date.now() - 7200000).toISOString(),
    connectionUrl: 'ws://localhost:8084/desktop-002',
    metadata: {
      os: 'Ubuntu 22.04',
      resolution: '1920x1080'
    }
  }
];

const mockTemplates = [
  {
    id: 'notepad-analysis',
    name: 'Notepad Text Analysis',
    description: 'Automated text extraction and analysis from Notepad',
    category: 'Text Processing',
    steps: [
      {
        id: 'step-1',
        name: 'Open Notepad',
        type: 'action',
        parameters: { application: 'notepad.exe' },
        timeout: 5000,
        retryCount: 3,
        onSuccess: 'step-2',
        onFailure: 'error'
      },
      {
        id: 'step-2',
        name: 'Extract Text',
        type: 'analysis',
        parameters: { method: 'ocr' },
        timeout: 10000,
        retryCount: 2,
        onSuccess: 'complete',
        onFailure: 'error'
      }
    ],
    metadata: {
      tags: ['text', 'analysis', 'automation'],
      estimatedDuration: 30000,
      category: 'Text Processing'
    }
  },
  {
    id: 'web-automation',
    name: 'Web Form Automation',
    description: 'Automated web form filling and submission',
    category: 'Web Automation',
    steps: [
      {
        id: 'step-1',
        name: 'Open Browser',
        type: 'action',
        parameters: { url: 'https://example.com/form' },
        timeout: 10000,
        retryCount: 3,
        onSuccess: 'step-2',
        onFailure: 'error'
      },
      {
        id: 'step-2',
        name: 'Fill Form',
        type: 'action',
        parameters: { formData: {} },
        timeout: 15000,
        retryCount: 2,
        onSuccess: 'complete',
        onFailure: 'error'
      }
    ],
    metadata: {
      tags: ['web', 'automation', 'forms'],
      estimatedDuration: 45000,
      category: 'Web Automation'
    }
  }
];

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Mock API Server',
    version: '1.0.0'
  });
});

// API Documentation
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Mock API Server',
    version: '1.0.0',
    description: 'Mock API endpoints for development',
    endpoints: {
      'Health': ['GET /health'],
      'Workflow': [
        'GET /api/v1/workflow/history',
        'GET /api/v1/workflow/templates',
        'POST /api/v1/workflow/execute'
      ],
      'Desktop': [
        'GET /api/v1/desktop/list',
        'POST /api/v1/desktop/create'
      ]
    }
  });
});

// Workflow endpoints
app.get('/api/v1/workflow/history', (req, res) => {
  console.log('📋 Workflow history requested');
  res.json({
    success: true,
    executions: mockExecutions,
    count: mockExecutions.length
  });
});

app.get('/api/v1/workflow/templates', (req, res) => {
  console.log('📋 Workflow templates requested');
  res.json({
    success: true,
    templates: mockTemplates,
    count: mockTemplates.length
  });
});

app.post('/api/v1/workflow/execute', (req, res) => {
  console.log('🚀 Workflow execution requested:', req.body);
  const newExecution = {
    id: `exec-${Date.now()}`,
    templateId: req.body.templateId || 'unknown',
    status: 'pending',
    startTime: new Date().toISOString(),
    progress: 0,
    currentStep: 'Initializing...',
    results: {}
  };
  
  mockExecutions.unshift(newExecution);
  res.json({
    success: true,
    data: newExecution
  });
});

app.get('/api/v1/workflow/status', (req, res) => {
  const executionId = req.query.id;
  const execution = mockExecutions.find(e => e.id === executionId);
  
  if (execution) {
    res.json({
      success: true,
      data: execution
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'Execution not found'
    });
  }
});

// Desktop endpoints
app.get('/api/v1/desktop/list', (req, res) => {
  console.log('🖥️ Desktop list requested');
  res.json({
    success: true,
    desktops: mockDesktops,
    count: mockDesktops.length
  });
});

app.post('/api/v1/desktop/create', (req, res) => {
  console.log('🖥️ Desktop creation requested:', req.body);
  const newDesktop = {
    id: `desktop-${Date.now()}`,
    name: req.body.name || 'New Desktop',
    status: 'connecting',
    createdAt: new Date().toISOString(),
    connectionUrl: `ws://localhost:8084/desktop-${Date.now()}`,
    metadata: req.body.metadata || {}
  };
  
  mockDesktops.push(newDesktop);
  res.json({
    success: true,
    data: newDesktop
  });
});

// Catch-all for unhandled routes
app.use((req, res) => {
  console.log(`❓ Unhandled request: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    method: req.method,
    path: req.originalUrl
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Mock API Server started successfully!');
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 API docs: http://localhost:${PORT}/api/docs`);
  console.log('');
  console.log('🔗 Available endpoints:');
  console.log('  • GET  /api/v1/workflow/history');
  console.log('  • GET  /api/v1/workflow/templates');
  console.log('  • POST /api/v1/workflow/execute');
  console.log('  • GET  /api/v1/desktop/list');
  console.log('  • POST /api/v1/desktop/create');
  console.log('');
  console.log('✅ Ready to serve frontend requests!');
});