# Harmonized API Documentation

## Overview

This harmonized API documentation addresses the inconsistencies identified in the architecture consistency analysis and provides a unified reference for all API endpoints of the Trusted Login System.

## Table of Contents

1. [API Base Configuration](#api-base-configuration)
2. [Health Router](#health-router)
3. [Desktop Router](#desktop-router)
4. [Automation Router](#automation-router)
5. [WebSocket Router](#websocket-router)
6. [Node Configs Router](#node-configs-router)
7. [Shell Router](#shell-router) ⚠️ **Updated**
8. [Snapshots Router](#snapshots-router)
9. [Workflows Router](#workflows-router)
10. [Harmonized Data Models](#harmonized-data-models)
11. [WebSocket Protocol Specification](#websocket-protocol-specification) ⚠️ **New**
12. [Frontend Integration Mapping](#frontend-integration-mapping) ⚠️ **New**
13. [Error Handling](#error-handling)
14. [Authentication and Authorization](#authentication-and-authorization)

## API Base Configuration

### Base URL
```
Produktion: https://api.trusted-login.com
Entwicklung: http://localhost:8007
```

### Standard-Headers
```http
Content-Type: application/json
Authorization: Bearer <token>
X-API-Version: v1
```

### Standard-Response-Format
```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId: string;
}
```

## Health Router

### GET /health/status
**Description**: Checks system status

**Response**:
```typescript
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: 'up' | 'down';
    websocket: 'up' | 'down';
    desktop: 'up' | 'down';
    automation: 'up' | 'down';
  };
  uptime: number;
  version: string;
}
```

**Frontend-Integration**: Verwendet in Health-Monitoring-Komponenten

### POST /health/restart-service
**Description**: Restarts a specific service

**Request**:
```typescript
interface RestartServiceRequest {
  serviceName: 'desktop' | 'automation' | 'websocket' | 'ocr';
  force?: boolean;
}
```

**Frontend-Integration**: Admin-Panel Service-Management

## Desktop Router

### GET /desktop/streaming-status
**Description**: Current desktop streaming status

**Response**:
```typescript
interface StreamingStatus {
  isStreaming: boolean;
  activeConnections: number;
  resolution: {
    width: number;
    height: number;
  };
  frameRate: number;
  quality: 'low' | 'medium' | 'high';
}
```

**Frontend-Integration**: Live Desktop Interface Node

### GET /desktop/config
**Description**: Retrieve desktop configuration

**Response**:
```typescript
interface DesktopConfig {
  resolution: {
    width: number;
    height: number;
  };
  captureSettings: {
    frameRate: number;
    quality: 'low' | 'medium' | 'high';
    compression: boolean;
  };
  streamingSettings: {
    enabled: boolean;
    maxConnections: number;
    bufferSize: number;
  };
}
```

### PUT /desktop/config
**Description**: Update desktop configuration

**Request**: `DesktopConfig` (siehe oben)

### GET /desktop/screen-info
**Description**: Retrieve screen information

**Response**:
```typescript
interface ScreenInfo {
  screens: Array<{
    id: number;
    primary: boolean;
    bounds: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    workArea: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    scaleFactor: number;
  }>;
  totalBounds: {
    width: number;
    height: number;
  };
}
```

### GET /desktop/screenshot
**Description**: Create screenshot

**Query Parameters**:
- `screen_id` (optional): Spezifischer Bildschirm
- `region` (optional): Format "x,y,width,height"
- `format` (optional): "png" | "jpeg" (default: "png")
- `quality` (optional): 1-100 (nur für JPEG)

**Response**: Binary image data

**Frontend-Integration**: Screenshot-Funktionalität in Desktop-Nodes

## Automation Router

### GET /automation/status
**Description**: Automation system status

**Response**:
```typescript
interface AutomationStatus {
  enabled: boolean;
  activeActions: number;
  queuedActions: number;
  lastAction: {
    type: string;
    timestamp: string;
    success: boolean;
  } | null;
}
```

### GET /automation/capabilities
**Description**: Available automation capabilities

**Response**:
```typescript
interface AutomationCapabilities {
  mouse: {
    click: boolean;
    doubleClick: boolean;
    rightClick: boolean;
    drag: boolean;
    scroll: boolean;
  };
  keyboard: {
    type: boolean;
    keyPress: boolean;
    keyCombo: boolean;
  };
  screen: {
    screenshot: boolean;
    ocr: boolean;
    elementDetection: boolean;
  };
}
```

### POST /automation/mouse/click
**Description**: Perform mouse click

**Request**:
```typescript
interface ClickRequest {
  x: number;
  y: number;
  button: 'left' | 'right' | 'middle';
  clickType: 'single' | 'double';
  delay?: number; // ms
}
```

**Response**:
```typescript
interface ClickResponse {
  success: boolean;
  executionTime: number;
  coordinates: { x: number; y: number };
}
```

**Frontend-Integration**: Click Action Node

### POST /automation/mouse/drag
**Description**: Execute drag operation

**Request**:
```typescript
interface DragRequest {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  duration?: number; // ms
  steps?: number;
}
```

### POST /automation/mouse/scroll
**Description**: Execute scroll operation

**Request**:
```typescript
interface ScrollRequest {
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right';
  amount: number;
}
```

### POST /automation/keyboard/type
**Description**: Input text

**Request**:
```typescript
interface TypeTextRequest {
  text: string;
  delay?: number; // ms zwischen Zeichen
  clearBefore?: boolean;
}
```

**Frontend-Integration**: Type Text Action Node

### POST /automation/keyboard/key-press
**Description**: Press single key

**Request**:
```typescript
interface KeyPressRequest {
  key: string; // z.B. "Enter", "Escape", "F1"
  modifiers?: Array<'ctrl' | 'alt' | 'shift' | 'meta'>;
  duration?: number; // ms
}
```

### POST /automation/keyboard/key-combination
**Description**: Execute key combination

**Request**:
```typescript
interface KeyCombinationRequest {
  keys: string[]; // z.B. ["ctrl", "c"]
  sequential?: boolean; // false = gleichzeitig, true = nacheinander
}
```

## WebSocket Router

### WebSocket-Verbindung
**Endpoint**: `ws://localhost:8007/ws`

### WebSocket-Nachrichten-Format
```typescript
interface WebSocketMessage {
  type: string;
  id: string;
  timestamp: string;
  data: any;
}
```

### GET /ws/health
**Description**: WebSocket health check

**WebSocket-Message**:
```typescript
{
  type: 'health_check',
  id: 'unique-id',
  timestamp: '2024-01-01T00:00:00Z',
  data: {}
}
```

**Response**:
```typescript
{
  type: 'health_response',
  id: 'unique-id',
  timestamp: '2024-01-01T00:00:00Z',
  data: {
    status: 'healthy',
    connections: 5
  }
}
```

### POST /ws/echo
**Description**: Echo test for WebSocket

**WebSocket-Message**:
```typescript
{
  type: 'echo',
  id: 'unique-id',
  timestamp: '2024-01-01T00:00:00Z',
  data: {
    message: 'test message'
  }
}
```

### Desktop-Streaming über WebSocket
**Message-Type**: `desktop_stream_start`

**Request**:
```typescript
{
  type: 'desktop_stream_start',
  id: 'stream-id',
  timestamp: '2024-01-01T00:00:00Z',
  data: {
    quality: 'medium',
    frameRate: 30,
    region?: {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  }
}
```

**Stream-Data-Message**:
```typescript
{
  type: 'desktop_frame',
  id: 'frame-id',
  timestamp: '2024-01-01T00:00:00Z',
  data: {
    frameData: string; // base64-encoded image
    frameNumber: number;
    timestamp: string;
  }
}
```

**Frontend-Integration**: Live Desktop Interface Node mit WebSocket-Konfiguration

### Workflow-Automation über WebSocket
**Message-Type**: `workflow_execute`

**Request**:
```typescript
{
  type: 'workflow_execute',
  id: 'workflow-execution-id',
  timestamp: '2024-01-01T00:00:00Z',
  data: {
    workflowId: string;
    nodes: NodeConfig[];
    startNodeId: string;
    context?: any;
  }
}
```

**Progress-Message**:
```typescript
{
  type: 'workflow_progress',
  id: 'workflow-execution-id',
  timestamp: '2024-01-01T00:00:00Z',
  data: {
    currentNodeId: string;
    status: 'running' | 'completed' | 'error';
    progress: number; // 0-100
    result?: any;
    error?: string;
  }
}
```

## Node Configs Router

### GET /node-configs
**Description**: Retrieve all node configurations

**Query Parameters**:
- `type` (optional): Filter nach Node-Typ
- `category` (optional): Filter nach Kategorie
- `limit` (optional): Anzahl der Ergebnisse
- `offset` (optional): Offset für Paginierung

**Response**:
```typescript
interface NodeConfigsResponse {
  configs: NodeConfig[];
  total: number;
  limit: number;
  offset: number;
}
```

### GET /node-configs/{id}
**Description**: Retrieve specific node configuration

**Response**: `NodeConfig`

### POST /node-configs
**Description**: Create new node configuration

**Request**: `NodeConfig` (ohne ID)

### PUT /node-configs/{id}
**Description**: Update node configuration

**Request**: `NodeConfig`

### DELETE /node-configs/{id}
**Description**: Delete node configuration

### GET /node-configs/templates
**Description**: Retrieve available node templates

**Response**:
```typescript
interface NodeTemplatesResponse {
  templates: {
    [nodeType: string]: {
      defaultConfig: any;
      schema: any;
      inputs: string[];
      outputs: string[];
      category: 'trigger' | 'action' | 'logic' | 'result' | 'config' | 'interface';
      description: string;
      icon?: string;
    }
  }
}
```

**Frontend-Integration**: Node-Konfigurator-Komponenten

### GET /node-configs/templates/{nodeType}
**Description**: Retrieve specific node template

## Shell Router ⚠️ **Updated for Frontend Integration**

### POST /shell/execute
**Description**: Execute shell command

**Request**:
```typescript
interface ShellCommandRequest {
  command: string;
  shell: 'powershell' | 'cmd' | 'bash';
  workingDirectory?: string;
  timeout?: number; // Sekunden
  environment?: { [key: string]: string };
  captureOutput?: boolean;
}
```

**Response**:
```typescript
interface ShellCommandResponse {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  executionTime: number;
  pid?: number;
}
```

**Frontend-Integration**: 
- **New Node Type**: `shell_command`
- **Kategorie**: `action`
- **Inputs**: `command`, `shell`, `workingDirectory`, `environment`
- **Outputs**: `stdout`, `stderr`, `exitCode`, `success`

### POST /shell/session/create
**Description**: Create new shell session

**Request**:
```typescript
interface ShellSessionRequest {
  shell: 'powershell' | 'cmd' | 'bash';
  workingDirectory?: string;
  environment?: { [key: string]: string };
}
```

**Response**:
```typescript
interface ShellSessionInfo {
  sessionId: string;
  shell: string;
  workingDirectory: string;
  pid: number;
  createdAt: string;
}
```

### POST /shell/session/{sessionId}/execute
**Description**: Execute command in existing session

**Request**:
```typescript
interface SessionCommandRequest {
  command: string;
  timeout?: number;
}
```

### GET /shell/session/{sessionId}/history
**Description**: Retrieve session command history

**Response**:
```typescript
interface CommandHistory {
  commands: Array<{
    command: string;
    timestamp: string;
    exitCode: number;
    duration: number;
  }>;
}
```

### DELETE /shell/session/{sessionId}
**Description**: Terminate shell session

### POST /shell/environment/set
**Description**: Set environment variable

**Request**:
```typescript
interface EnvironmentVariableRequest {
  name: string;
  value: string;
  scope: 'session' | 'global';
  sessionId?: string; // erforderlich wenn scope = 'session'
}
```

### POST /shell/directory/change
**Description**: Change working directory

**Request**:
```typescript
interface ChangeDirectoryRequest {
  path: string;
  sessionId?: string;
}
```

### GET /shell/processes
**Description**: List running processes

**Response**:
```typescript
interface ProcessInfo {
  pid: number;
  name: string;
  command: string;
  cpu: number;
  memory: number;
  startTime: string;
}

interface ProcessListResponse {
  processes: ProcessInfo[];
}
```

### POST /shell/process/{pid}/kill
**Description**: Terminate process

### POST /shell/process/{pid}/suspend
**Description**: Pause process

### POST /shell/process/{pid}/resume
**Description**: Resume process

## Snapshots Router

### GET /snapshots
**Description**: List all snapshots

**Query Parameters**:
- `limit` (optional): Anzahl der Ergebnisse
- `offset` (optional): Offset für Paginierung
- `type` (optional): Filter nach Snapshot-Typ

**Response**:
```typescript
interface SnapshotsResponse {
  snapshots: SnapshotInfo[];
  total: number;
}

interface SnapshotInfo {
  id: string;
  name: string;
  type: 'screenshot' | 'ocr' | 'element';
  createdAt: string;
  size: number;
  metadata: any;
}
```

### POST /snapshots
**Description**: Create new snapshot

**Request**:
```typescript
interface CreateSnapshotRequest {
  name: string;
  type: 'screenshot' | 'ocr' | 'element';
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  metadata?: any;
}
```

### GET /snapshots/{id}
**Description**: Retrieve specific snapshot

**Response**: Binary data oder JSON je nach Snapshot-Typ

### DELETE /snapshots/{id}
**Description**: Delete snapshot

### POST /snapshots/{id}/ocr
**Description**: Execute OCR on snapshot

**Request**:
```typescript
interface OCRRequest {
  language?: string;
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  options?: {
    confidence: number;
    whitelist?: string;
    blacklist?: string;
  };
}
```

**Response**:
```typescript
interface OCRResponse {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  lines: Array<{
    text: string;
    confidence: number;
    bbox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
}
```

**Frontend-Integration**: OCR Region Node, OCR Extract Node

### POST /snapshots/{id}/click
**Description**: Execute click action on snapshot element

**Request**:
```typescript
interface SnapshotClickRequest {
  x: number;
  y: number;
  button: 'left' | 'right' | 'middle';
  clickType: 'single' | 'double';
}
```

## Workflows Router

### GET /workflows/status
**Description**: Workflow system status

**Response**:
```typescript
interface WorkflowSystemStatus {
  enabled: boolean;
  activeWorkflows: number;
  queuedExecutions: number;
  totalExecutions: number;
  lastExecution: {
    workflowId: string;
    status: 'completed' | 'failed' | 'running';
    timestamp: string;
  } | null;
}
```

### GET /workflows
**Description**: Retrieve all workflows

**Query Parameters**:
- `status` (optional): Filter nach Status
- `limit` (optional): Anzahl der Ergebnisse
- `offset` (optional): Offset für Paginierung

**Response**:
```typescript
interface WorkflowsResponse {
  workflows: WorkflowInfo[];
  total: number;
}

interface WorkflowInfo {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'draft';
  createdAt: string;
  updatedAt: string;
  lastExecuted?: string;
  executionCount: number;
}
```

### POST /workflows
**Description**: Create new workflow

**Request**:
```typescript
interface CreateWorkflowRequest {
  name: string;
  description: string;
  nodes: NodeConfig[];
  connections: Array<{
    sourceNodeId: string;
    targetNodeId: string;
    sourceOutput: string;
    targetInput: string;
  }>;
  startNodeId: string;
  metadata?: any;
}
```

### GET /workflows/{id}
**Description**: Retrieve specific workflow

### PUT /workflows/{id}
**Description**: Update workflow

### DELETE /workflows/{id}
**Description**: Delete workflow

### POST /workflows/{id}/execute
**Description**: Execute workflow

**Request**:
```typescript
interface ExecuteWorkflowRequest {
  context?: any;
  async?: boolean;
}
```

**Response**:
```typescript
interface WorkflowExecutionResponse {
  executionId: string;
  status: 'started' | 'completed' | 'failed';
  result?: any;
  error?: string;
}
```

## Harmonized Data Models

### NodeConfig (Harmonisiert)
```typescript
interface NodeConfig {
  id: string;
  type: string;
  name: string;
  description?: string;
  category: 'trigger' | 'action' | 'logic' | 'result' | 'config' | 'interface';
  config: any;
  inputs: string[];
  outputs: string[];
  position?: {
    x: number;
    y: number;
  };
  metadata?: {
    icon?: string;
    color?: string;
    tags?: string[];
  };
  createdAt: string;
  updatedAt: string;
}
```

### OCR-Datenmodell (Harmonisiert)
```typescript
interface OCRRequest {
  imageData?: string; // base64 oder URL
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  language?: string;
  options?: {
    confidence: number;
    whitelist?: string;
    blacklist?: string;
    psm?: number; // Page Segmentation Mode
    oem?: number; // OCR Engine Mode
  };
}

interface OCRResponse {
  success: boolean;
  text: string;
  confidence: number;
  processingTime: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  lines: Array<{
    text: string;
    confidence: number;
    bbox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    words: number[]; // Indices der Wörter in dieser Zeile
  }>;
  paragraphs: Array<{
    text: string;
    confidence: number;
    bbox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    lines: number[]; // Indices der Zeilen in diesem Absatz
  }>;
}
```

### Workflow-Execution-Model (Harmonisiert)
```typescript
interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  duration?: number;
  context: any;
  result?: any;
  error?: {
    message: string;
    nodeId?: string;
    stack?: string;
  };
  nodeExecutions: Array<{
    nodeId: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    startTime: string;
    endTime?: string;
    input: any;
    output?: any;
    error?: string;
  }>;
  metadata: {
    triggeredBy: 'manual' | 'webhook' | 'schedule' | 'event';
    executionMode: 'sync' | 'async';
    priority: 'low' | 'normal' | 'high';
  };
}
```

## WebSocket Protocol Specification ⚠️ **New**

### Protokoll-Version
**Aktuelle Version**: `v1.0`

### Verbindungsaufbau
```javascript
const ws = new WebSocket('ws://localhost:8007/ws');
ws.onopen = () => {
  // Send authentication
  ws.send(JSON.stringify({
    type: 'auth',
    id: generateUniqueId(),
    timestamp: new Date().toISOString(),
    data: {
      token: 'bearer-token',
      version: 'v1.0'
    }
  }));
};
```

### Message-ID-Generierung
```typescript
function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
```

### Heartbeat-Protokoll
**Client → Server** (alle 30 Sekunden):
```typescript
{
  type: 'ping',
  id: generateMessageId(),
  timestamp: new Date().toISOString(),
  data: {}
}
```

**Server → Client**:
```typescript
{
  type: 'pong',
  id: 'original-ping-id',
  timestamp: new Date().toISOString(),
  data: {
    serverTime: new Date().toISOString()
  }
}
```

### Error-Handling
```typescript
{
  type: 'error',
  id: 'original-message-id',
  timestamp: new Date().toISOString(),
  data: {
    code: 'INVALID_MESSAGE_FORMAT',
    message: 'Message does not conform to protocol',
    details: {
      expectedFields: ['type', 'id', 'timestamp', 'data'],
      receivedMessage: '...'
    }
  }
}
```

### Subscription-Management
**Subscribe to Desktop Stream**:
```typescript
{
  type: 'subscribe',
  id: generateMessageId(),
  timestamp: new Date().toISOString(),
  data: {
    channel: 'desktop_stream',
    options: {
      quality: 'medium',
      frameRate: 30
    }
  }
}
```

**Unsubscribe**:
```typescript
{
  type: 'unsubscribe',
  id: generateMessageId(),
  timestamp: new Date().toISOString(),
  data: {
    channel: 'desktop_stream'
  }
}
```

## Frontend Integration Mapping ⚠️ **New**

### Node-Typ zu API-Endpunkt Mapping

| Node-Typ | API-Endpunkt | HTTP-Methode | WebSocket-Type |
|----------|--------------|--------------|----------------|
| `manual_trigger` | - | - | `workflow_execute` |
| `webhook_trigger` | `/workflows/{id}/execute` | POST | - |
| `websocket_config` | `/ws` | WebSocket | `subscribe` |
| `live_desktop` | `/desktop/screenshot` | GET | `desktop_stream` |
| `click_action` | `/automation/mouse/click` | POST | - |
| `type_text_action` | `/automation/keyboard/type` | POST | - |
| `http_request_action` | Custom URL | Custom | - |
| `ocr_region` | `/snapshots/{id}/ocr` | POST | - |
| `ocr_extract` | `/snapshots/{id}/ocr` | POST | - |
| `n8n_webhook` | External N8N | POST | - |
| `send_to_filesystem` | File System API | - | - |
| `shell_command` | `/shell/execute` | POST | - |
| `if_condition` | - | - | - |
| `delay` | - | - | - |
| `workflow_result` | - | - | `workflow_progress` |

### Service to Node Mapping

| Backend Service | Frontend Node Types | Description |
|-----------------|--------------------|--------------|
| `LiveDesktopService` | `live_desktop`, `websocket_config` | Desktop streaming and screenshot functionality |
| `ClickAutomationService` | `click_action`, `type_text_action` | Mouse and keyboard automation |
| `EnhancedOCRService` | `ocr_region`, `ocr_extract` | OCR text extraction |
| `NodeService` | All node types | Node configuration and management |
| `GraphExecutionService` | `workflow_result`, `if_condition` | Workflow execution and logic |
| `N8NIntegrationService` | `n8n_webhook` | N8N integration |
| `ShellService` | `shell_command` | Shell command execution |

### Frontend-Store-Integration

#### WorkflowStore-API-Mapping
```typescript
// WorkflowStore Methoden → API-Endpunkte
interface WorkflowStoreAPIMapping {
  loadWorkflows: () => GET('/workflows');
  saveWorkflow: (workflow) => POST('/workflows');
  updateWorkflow: (id, workflow) => PUT(`/workflows/${id}`);
  deleteWorkflow: (id) => DELETE(`/workflows/${id}`);
  executeWorkflow: (id, context) => POST(`/workflows/${id}/execute`);
  loadNodeTemplates: () => GET('/node-configs/templates');
  saveNodeConfig: (config) => POST('/node-configs');
  updateNodeConfig: (id, config) => PUT(`/node-configs/${id}`);
}
```

#### WebSocket-Store-Integration
```typescript
interface WebSocketStoreAPIMapping {
  connect: () => WebSocket('ws://localhost:8007/ws');
  subscribe: (channel, options) => WebSocket.send({type: 'subscribe', ...});
  unsubscribe: (channel) => WebSocket.send({type: 'unsubscribe', ...});
  sendMessage: (type, data) => WebSocket.send({type, data, ...});
}
```

## Error Handling

### Standard-Fehlercodes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `METHOD_NOT_ALLOWED` | 405 | HTTP method not allowed |
| `VALIDATION_ERROR` | 422 | Validation error |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service unavailable |
| `TIMEOUT` | 504 | Request timeout |

### Specific Error Codes

| Code | Description |
|------|-------------|
| `DESKTOP_NOT_AVAILABLE` | Desktop service not available |
| `AUTOMATION_DISABLED` | Automation service disabled |
| `INVALID_COORDINATES` | Invalid screen coordinates |
| `OCR_FAILED` | OCR processing failed |
| `WORKFLOW_EXECUTION_FAILED` | Workflow execution failed |
| `NODE_CONFIG_INVALID` | Node configuration invalid |
| `WEBSOCKET_CONNECTION_FAILED` | WebSocket connection failed |
| `SHELL_EXECUTION_FAILED` | Shell command failed |
| `FILESYSTEM_ACCESS_DENIED` | Filesystem access denied |

### Error-Response-Format
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: {
      field?: string;
      value?: any;
      constraint?: string;
      suggestion?: string;
    };
    timestamp: string;
    requestId: string;
    traceId?: string;
  };
}
```

### Frontend-Error-Handling
```typescript
// Beispiel für Frontend-Error-Handling
try {
  const response = await api.post('/automation/mouse/click', clickData);
  if (!response.success) {
    throw new APIError(response.error);
  }
  return response.data;
} catch (error) {
  if (error.code === 'DESKTOP_NOT_AVAILABLE') {
    // Spezifische Behandlung für Desktop-Fehler
    showDesktopConnectionDialog();
  } else if (error.code === 'INVALID_COORDINATES') {
    // Koordinaten-Validierung
    showCoordinateValidationError(error.details);
  } else {
    // General error handling
    showGenericError(error.message);
  }
}
```

## Authentication and Authorization

### Bearer Token Authentication
```http
Authorization: Bearer <jwt-token>
```

### JWT-Token-Format
```typescript
interface JWTPayload {
  sub: string; // User ID
  iat: number; // Issued at
  exp: number; // Expiration
  scope: string[]; // Permissions
  session_id: string;
}
```

### Erforderliche Scopes

| Endpoint-Gruppe | Erforderliche Scopes |
|-----------------|---------------------|
| Health | `health:read` |
| Desktop | `desktop:read`, `desktop:write` |
| Automation | `automation:execute` |
| WebSocket | `websocket:connect` |
| Node Configs | `nodes:read`, `nodes:write` |
| Shell | `shell:execute` |
| Snapshots | `snapshots:read`, `snapshots:write` |
| Workflows | `workflows:read`, `workflows:write`, `workflows:execute` |

### WebSocket Authentication
```typescript
// Nach WebSocket-Verbindung
{
  type: 'auth',
  id: generateMessageId(),
  timestamp: new Date().toISOString(),
  data: {
    token: 'bearer-jwt-token',
    version: 'v1.0'
  }
}

// Server-Response
{
  type: 'auth_success',
  id: 'auth-message-id',
  timestamp: new Date().toISOString(),
  data: {
    sessionId: 'websocket-session-id',
    permissions: ['desktop:stream', 'workflows:execute']
  }
}
```

## API-Versionierung

### Header-basierte Versionierung
```http
X-API-Version: v1
```

### URL-basierte Versionierung (Alternative)
```
/api/v1/health/status
/api/v1/desktop/screenshot
```

### Backward-Compatibility
- **v1.0**: Aktuelle Version
- **v0.9**: Legacy-Support bis 2024-06-01
- **v0.8**: Deprecated, Support bis 2024-03-01

## Rate Limiting

### Standard-Limits
- **Allgemeine API**: 1000 Requests/Stunde
- **Automation-Endpunkte**: 100 Requests/Minute
- **Desktop-Screenshots**: 60 Requests/Minute
- **WebSocket-Nachrichten**: 1000 Nachrichten/Minute

### Rate-Limit-Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Monitoring und Logging

### Request-Tracing
Jeder Request erhält eine eindeutige `X-Request-ID` für Tracing.

### Performance-Metriken
- Response-Zeit in `X-Response-Time` Header
- Server-Load in `X-Server-Load` Header

### Health Check Endpoints
- `/health/status`: General system status
- `/health/detailed`: Detailed service status
- `/health/metrics`: Performance metrics

---

## Changelog

### Version 1.1.0 (Current)
- ✅ Shell router extended for frontend integration
- ✅ WebSocket protocol specification added
- ✅ OCR data models harmonized
- ✅ Frontend integration mapping created
- ✅ Extended error handling implemented
- ✅ Service-to-node mapping documented

### Version 1.0.0
- Initial API documentation
- Basic endpoints for all routers
- Standard data models
- Basic authentication

---

**Last Updated**: 2024-01-20  
**Next Review**: 2024-02-01  
**Responsible**: Documentation Team