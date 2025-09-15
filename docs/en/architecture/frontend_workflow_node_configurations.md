# Frontend Workflow Node Configurations Documentation

## Overview

This documentation describes all available node configurations for the frontend workflow route and their integration with the backend system.

## Node-Kategorien

### 1. Triggers
- **manual_trigger**: Manueller Workflow-Start
- **webhook_trigger**: HTTP-Webhook-basierter Trigger

### 2. Config
- **websocket_config**: WebSocket-Verbindungskonfiguration

### 3. Interface
- **live_desktop**: Live-Desktop-Interaktion

### 4. Actions
- **click_action**: Mausklick-Aktionen
- **type_text_action**: Texteingabe-Aktionen
- **http_request_action**: HTTP-Anfragen
- **ocr_region**: OCR-Regionsdefinition
- **ocr_extract**: OCR-Textextraktion
- **n8n_webhook**: N8N-Integration
- **send_to_filesystem**: Dateisystem-Export

### 5. Logic
- **if_condition**: Bedingte Logik
- **delay**: Zeitverzögerung

### 6. Results
- **workflow_result**: Ergebnis-Aggregation

## Detaillierte Node-Konfigurationen

### Manual Trigger

```typescript
interface ManualTriggerConfig {
  name: string;
  description?: string;
  enabled: boolean;
}

// Default Config
{
  name: "Manual Start",
  description: "Manually triggered workflow",
  enabled: true
}
```

**Inputs**: Keine  
**Outputs**: `trigger_data`  
**Dependencies**: Keine  
**Filesystem Integration**: Trigger-Events werden in `filesystem/triggers/` gespeichert

### Webhook Trigger

```typescript
interface WebhookTriggerConfig {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  authentication?: {
    type: 'none' | 'bearer' | 'basic';
    token?: string;
    username?: string;
    password?: string;
  };
  responseFormat: 'json' | 'text' | 'xml';
  timeout: number;
}

// Default Config
{
  endpoint: "/webhook/trigger",
  method: "POST",
  authentication: { type: "none" },
  responseFormat: "json",
  timeout: 30000
}
```

**Inputs**: HTTP Request Data  
**Outputs**: `webhook_data`  
**Dependencies**: Keine  
**Filesystem Integration**: Webhook-Daten werden in `filesystem/webhooks/` gespeichert

### WebSocket Config

```typescript
interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval?: number;
  authentication?: {
    type: 'none' | 'token' | 'custom';
    token?: string;
    headers?: Record<string, string>;
  };
}

// Default Config
{
  url: "ws://localhost:8080",
  protocols: [],
  reconnectInterval: 5000,
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000,
  authentication: { type: "none" }
}
```

**Inputs**: `config_data`  
**Outputs**: `websocket_connection`  
**Dependencies**: Keine  
**Filesystem Integration**: Verbindungsstatus in `filesystem/websockets/`

### Live Desktop

```typescript
interface LiveDesktopConfig {
  captureRegion?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  refreshRate: number;
  quality: 'low' | 'medium' | 'high';
  enableInteraction: boolean;
}

// Default Config
{
  captureRegion: null, // Full screen
  refreshRate: 30,
  quality: "medium",
  enableInteraction: true
}
```

**Inputs**: `desktop_config`  
**Outputs**: `desktop_stream`  
**Dependencies**: Desktop Automation Service  
**Filesystem Integration**: Screenshots in `filesystem/desktop/captures/`

### Click Action

```typescript
interface ClickActionConfig {
  coordinates?: { x: number; y: number };
  elementSelector?: string;
  clickType: 'left' | 'right' | 'double' | 'middle';
  delay: number;
  retries: number;
  waitForElement?: boolean;
  timeout: number;
}

// Default Config
{
  coordinates: { x: 0, y: 0 },
  elementSelector: "",
  clickType: "left",
  delay: 100,
  retries: 3,
  waitForElement: false,
  timeout: 5000
}
```

**Inputs**: `click_target`  
**Outputs**: `click_result`  
**Dependencies**: Desktop Automation Service  
**Filesystem Integration**: Aktionen werden in `filesystem/actions/clicks/` protokolliert

### Type Text Action

```typescript
interface TypeTextActionConfig {
  text: string;
  target?: {
    coordinates?: { x: number; y: number };
    elementSelector?: string;
  };
  typingSpeed: number;
  clearBefore: boolean;
  pressEnter: boolean;
  delay: number;
}

// Default Config
{
  text: "",
  target: {},
  typingSpeed: 50,
  clearBefore: false,
  pressEnter: false,
  delay: 100
}
```

**Inputs**: `text_input`  
**Outputs**: `type_result`  
**Dependencies**: Desktop Automation Service  
**Filesystem Integration**: Texteingaben werden in `filesystem/actions/typing/` gespeichert

### HTTP Request Action

```typescript
interface HttpRequestActionConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout: number;
  retries: number;
  authentication?: {
    type: 'none' | 'bearer' | 'basic' | 'api-key';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
  responseFormat: 'json' | 'text' | 'blob';
}

// Default Config
{
  url: "",
  method: "GET",
  headers: {},
  body: null,
  timeout: 30000,
  retries: 3,
  authentication: { type: "none" },
  responseFormat: "json"
}
```

**Inputs**: `request_data`  
**Outputs**: `response_data`  
**Dependencies**: Keine  
**Filesystem Integration**: Requests/Responses in `filesystem/http/`

### OCR Region

```typescript
interface OcrRegionConfig {
  region: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  language: string;
  confidence: number;
  preprocessing?: {
    grayscale: boolean;
    contrast: number;
    brightness: number;
    blur: number;
  };
}

// Default Config
{
  region: { x: 0, y: 0, width: 100, height: 100 },
  language: "eng",
  confidence: 0.7,
  preprocessing: {
    grayscale: true,
    contrast: 1.0,
    brightness: 1.0,
    blur: 0
  }
}
```

**Inputs**: `region_data`  
**Outputs**: `ocr_region`  
**Dependencies**: OCR Service  
**Filesystem Integration**: Regionen werden in `filesystem/ocr/regions/` definiert

### OCR Extract

```typescript
interface OcrExtractConfig {
  interval: number;
  confidence: number;
  preprocessing?: {
    grayscale: boolean;
    contrast: number;
    brightness: number;
    denoise: boolean;
  };
  outputFormat: 'text' | 'json' | 'structured';
  saveImages: boolean;
}

// Default Config
{
  interval: 1000,
  confidence: 0.8,
  preprocessing: {
    grayscale: true,
    contrast: 1.2,
    brightness: 1.0,
    denoise: true
  },
  outputFormat: "text",
  saveImages: false
}
```

**Inputs**: `ocr_region`  
**Outputs**: `extracted_text`  
**Dependencies**: OCR Service, OCR Region  
**Filesystem Integration**: Extrahierte Texte in `filesystem/ocr/extracts/`

### N8N Webhook

```typescript
interface N8nWebhookConfig {
  webhookUrl: string;
  apiKey?: string;
  timeout: number;
  retries: number;
  dataMapping?: Record<string, string>;
  headers?: Record<string, string>;
}

// Default Config
{
  webhookUrl: "",
  apiKey: "",
  timeout: 30000,
  retries: 3,
  dataMapping: {},
  headers: { "Content-Type": "application/json" }
}
```

**Inputs**: `webhook_data`  
**Outputs**: `n8n_response`  
**Dependencies**: Keine  
**Filesystem Integration**: N8N-Daten werden in `filesystem/n8n/` gespeichert

### Send to Filesystem

```typescript
interface SendToFilesystemConfig {
  directory: string;
  filename?: string;
  format: 'json' | 'csv' | 'txt' | 'xml';
  includeMetadata: boolean;
  overwrite: boolean;
  compression?: 'none' | 'gzip' | 'zip';
  errorHandling: 'ignore' | 'retry' | 'fail';
}

// Default Config
{
  directory: "filesystem/exports/",
  filename: "",
  format: "json",
  includeMetadata: true,
  overwrite: false,
  compression: "none",
  errorHandling: "retry"
}
```

**Inputs**: `export_data`  
**Outputs**: `file_path`  
**Dependencies**: Keine  
**Filesystem Integration**: Direkte Dateisystem-Operationen

### If Condition

```typescript
interface IfConditionConfig {
  condition: {
    left: string;
    operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'startsWith' | 'endsWith';
    right: string;
  };
  dataType: 'string' | 'number' | 'boolean';
  caseSensitive?: boolean;
}

// Default Config
{
  condition: {
    left: "",
    operator: "==",
    right: ""
  },
  dataType: "string",
  caseSensitive: true
}
```

**Inputs**: `condition_data`  
**Outputs**: `true_branch`, `false_branch`  
**Dependencies**: Keine  
**Filesystem Integration**: Bedingungsresultate in `filesystem/logic/conditions/`

### Delay

```typescript
interface DelayConfig {
  duration: number;
  unit: 'ms' | 's' | 'm' | 'h';
  variableDelay?: {
    enabled: boolean;
    min: number;
    max: number;
  };
}

// Default Config
{
  duration: 1000,
  unit: "ms",
  variableDelay: {
    enabled: false,
    min: 500,
    max: 1500
  }
}
```

**Inputs**: `delay_trigger`  
**Outputs**: `delay_complete`  
**Dependencies**: Keine  
**Filesystem Integration**: Delay-Logs in `filesystem/logic/delays/`

### Workflow Result

```typescript
interface WorkflowResultConfig {
  resultFormat: 'summary' | 'detailed' | 'raw';
  includeTimestamps: boolean;
  includeErrors: boolean;
  exportPath?: string;
  aggregation?: {
    enabled: boolean;
    groupBy: string[];
    functions: ('count' | 'sum' | 'avg' | 'min' | 'max')[];
  };
}

// Default Config
{
  resultFormat: "summary",
  includeTimestamps: true,
  includeErrors: true,
  exportPath: "filesystem/results/",
  aggregation: {
    enabled: false,
    groupBy: [],
    functions: ["count"]
  }
}
```

**Inputs**: `workflow_data`  
**Outputs**: `final_result`  
**Dependencies**: Alle vorherigen Nodes  
**Filesystem Integration**: Finale Ergebnisse in `filesystem/results/`

## Backend-API-Endpunkte

### Node Configuration Management

```
GET    /api/node-configs/                    # Alle Node-Konfigurationen abrufen
GET    /api/node-configs/{node_type}         # Spezifische Node-Konfiguration abrufen
POST   /api/node-configs/                    # Neue Node-Konfiguration erstellen
PUT    /api/node-configs/{node_id}           # Node-Konfiguration aktualisieren
DELETE /api/node-configs/{node_id}           # Node-Konfiguration löschen
```

### JSON-Template-Strukturen

```json
{
  "id": "string",
  "type": "node_type",
  "name": "string",
  "description": "string",
  "config": {
    // Node-spezifische Konfiguration
  },
  "inputs": ["input_name"],
  "outputs": ["output_name"],
  "dependencies": ["dependency_node_type"],
  "filesystemIntegration": {
    "enabled": true,
    "basePath": "filesystem/node_type/",
    "dataFormat": "json"
  },
  "metadata": {
    "created": "timestamp",
    "updated": "timestamp",
    "version": "1.0.0"
  }
}
```

### CRUD-Operationen

#### Create Node Configuration
```http
POST /api/node-configs/
Content-Type: application/json

{
  "type": "click_action",
  "name": "Main Button Click",
  "config": {
    "coordinates": { "x": 100, "y": 200 },
    "clickType": "left",
    "delay": 100
  }
}
```

#### Update Node Configuration
```http
PUT /api/node-configs/node_123
Content-Type: application/json

{
  "config": {
    "coordinates": { "x": 150, "y": 250 },
    "clickType": "double"
  }
}
```

## Frontend-Integration

### Workflow-Route Verwendung

Die Workflow-Route (`/workflow`) verwendet die Node-Konfigurationen über mehrere Komponenten:

#### SimplifiedWorkflowCanvas
```typescript
// Verwendung in SimplifiedWorkflowCanvas.tsx
const nodeTemplates = useNodeTemplates();
const { nodes, edges, updateNodeConfig } = useWorkflowStore();

// Node-Konfiguration laden
const loadNodeConfig = async (nodeType: string) => {
  const response = await fetch(`/api/node-configs/${nodeType}`);
  return response.json();
};

// Node-Konfiguration speichern
const saveNodeConfig = async (nodeId: string, config: any) => {
  await fetch(`/api/node-configs/${nodeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config })
  });
};
```

#### WorkflowStore Zustand-Management
```typescript
// workflowStore.ts
interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  nodeConfigs: Record<string, any>;
  
  // Actions
  addNode: (nodeType: string) => void;
  updateNodeConfig: (nodeId: string, config: any) => void;
  loadWorkflow: (workflowId: string) => Promise<void>;
  saveWorkflow: () => Promise<void>;
}

const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  nodeConfigs: {},
  
  addNode: (nodeType) => {
    const template = nodeTemplates[nodeType];
    const newNode = {
      id: generateId(),
      type: nodeType,
      data: {
        config: template.defaultConfig,
        inputs: template.inputs,
        outputs: template.outputs
      }
    };
    set(state => ({ nodes: [...state.nodes, newNode] }));
  },
  
  updateNodeConfig: async (nodeId, config) => {
    await saveNodeConfig(nodeId, config);
    set(state => ({
      nodeConfigs: {
        ...state.nodeConfigs,
        [nodeId]: config
      }
    }));
  }
}));
```

### Node-Konfigurator-Komponenten

Jeder Node-Typ hat eine dedizierte Konfigurator-Komponente:

```typescript
// WorkflowNodeConfigurator.tsx
interface NodeConfiguratorProps {
  nodeType: string;
  config: any;
  onConfigChange: (config: any) => void;
}

const WorkflowNodeConfigurator: React.FC<NodeConfiguratorProps> = ({
  nodeType,
  config,
  onConfigChange
}) => {
  const renderConfigurator = () => {
    switch (nodeType) {
      case 'click_action':
        return <ClickActionConfigurator config={config} onChange={onConfigChange} />;
      case 'type_text_action':
        return <TypeTextActionConfigurator config={config} onChange={onConfigChange} />;
      case 'http_request_action':
        return <HttpRequestActionConfigurator config={config} onChange={onConfigChange} />;
      // ... weitere Node-Typen
      default:
        return <GenericConfigurator config={config} onChange={onConfigChange} />;
    }
  };
  
  return (
    <div className="node-configurator">
      <h3>{nodeType} Configuration</h3>
      {renderConfigurator()}
    </div>
  );
};
```

## Filesystem-Bridge-Architektur

### Datenfluss-Übersicht

```
Frontend (React) ↔ Backend (FastAPI) ↔ Filesystem Bridge ↔ Local Filesystem
     ↓                    ↓                    ↓                 ↓
  Workflow UI      Node Configs API     File Operations    Data Storage
  Node Canvas      Validation          Event Monitoring    Result Files
  Configuration    Execution           Status Updates      Logs & Cache
```

### Filesystem-Struktur

```
filesystem/
├── triggers/
│   ├── manual/
│   └── webhooks/
├── configs/
│   ├── websockets/
│   └── desktop/
├── actions/
│   ├── clicks/
│   ├── typing/
│   └── http/
├── ocr/
│   ├── regions/
│   ├── extracts/
│   └── images/
├── logic/
│   ├── conditions/
│   └── delays/
├── results/
│   ├── workflows/
│   └── exports/
├── n8n/
│   ├── webhooks/
│   └── responses/
└── logs/
    ├── execution/
    └── errors/
```

### Konfiguration der Dateipfade

```typescript
// filesystem-config.ts
export const FILESYSTEM_CONFIG = {
  basePath: 'filesystem/',
  paths: {
    triggers: 'triggers/',
    configs: 'configs/',
    actions: 'actions/',
    ocr: 'ocr/',
    logic: 'logic/',
    results: 'results/',
    n8n: 'n8n/',
    logs: 'logs/'
  },
  formats: {
    default: 'json',
    logs: 'txt',
    images: 'png',
    exports: 'csv'
  },
  monitoring: {
    enabled: true,
    interval: 1000,
    events: ['create', 'update', 'delete']
  }
};
```

### Filesystem-Bridge-Integration

```typescript
// filesystem-bridge.ts
class FilesystemBridge {
  private basePath: string;
  private watchers: Map<string, FileWatcher>;
  
  constructor(config: FilesystemConfig) {
    this.basePath = config.basePath;
    this.watchers = new Map();
  }
  
  async writeNodeData(nodeType: string, nodeId: string, data: any): Promise<void> {
    const path = `${this.basePath}${nodeType}/${nodeId}.json`;
    await fs.writeFile(path, JSON.stringify(data, null, 2));
    this.notifyChange(nodeType, nodeId, 'write');
  }
  
  async readNodeData(nodeType: string, nodeId: string): Promise<any> {
    const path = `${this.basePath}${nodeType}/${nodeId}.json`;
    const content = await fs.readFile(path, 'utf-8');
    return JSON.parse(content);
  }
  
  watchNodeType(nodeType: string, callback: (event: FileEvent) => void): void {
    const watcher = new FileWatcher(`${this.basePath}${nodeType}/`);
    watcher.on('change', callback);
    this.watchers.set(nodeType, watcher);
  }
  
  private notifyChange(nodeType: string, nodeId: string, operation: string): void {
    // WebSocket-Benachrichtigung an Frontend
    this.websocket.emit('filesystem-change', {
      nodeType,
      nodeId,
      operation,
      timestamp: new Date().toISOString()
    });
  }
}
```

## Verwendungsbeispiele

### Workflow-Erstellung

```typescript
// Beispiel: Einfacher Click-Workflow
const createClickWorkflow = async () => {
  // 1. Manual Trigger erstellen
  const trigger = await createNode('manual_trigger', {
    name: 'Start Click Workflow',
    enabled: true
  });
  
  // 2. Click Action erstellen
  const clickAction = await createNode('click_action', {
    coordinates: { x: 500, y: 300 },
    clickType: 'left',
    delay: 100
  });
  
  // 3. Result Node erstellen
  const result = await createNode('workflow_result', {
    resultFormat: 'summary',
    includeTimestamps: true
  });
  
  // 4. Nodes verbinden
  await createEdge(trigger.id, clickAction.id);
  await createEdge(clickAction.id, result.id);
  
  // 5. Workflow speichern
  await saveWorkflow({
    name: 'Simple Click Workflow',
    nodes: [trigger, clickAction, result],
    edges: getEdges()
  });
};
```

### OCR-Workflow

```typescript
// Beispiel: OCR-Text-Extraktion
const createOcrWorkflow = async () => {
  const trigger = await createNode('manual_trigger', {
    name: 'Start OCR Extraction'
  });
  
  const ocrRegion = await createNode('ocr_region', {
    region: { x: 100, y: 100, width: 400, height: 200 },
    language: 'eng',
    confidence: 0.8
  });
  
  const ocrExtract = await createNode('ocr_extract', {
    interval: 2000,
    confidence: 0.9,
    outputFormat: 'structured'
  });
  
  const sendToFilesystem = await createNode('send_to_filesystem', {
    directory: 'filesystem/exports/ocr/',
    format: 'json',
    includeMetadata: true
  });
  
  // Workflow-Kette erstellen
  await createEdge(trigger.id, ocrRegion.id);
  await createEdge(ocrRegion.id, ocrExtract.id);
  await createEdge(ocrExtract.id, sendToFilesystem.id);
};
```

## Fazit

Diese Dokumentation bietet eine vollständige Übersicht über alle verfügbaren Node-Konfigurationen im Frontend-Workflow-System. Jeder Node-Typ ist detailliert beschrieben mit seinen Konfigurationsoptionen, Ein-/Ausgängen, Abhängigkeiten und Filesystem-Integration.

Die Backend-API-Endpunkte ermöglichen eine vollständige CRUD-Funktionalität für Node-Konfigurationen, während die Frontend-Integration über den WorkflowStore und spezialisierte Konfigurator-Komponenten eine benutzerfreundliche Workflow-Erstellung ermöglicht.

Die Filesystem-Bridge-Architektur sorgt für eine nahtlose Kommunikation zwischen Frontend, Backend und lokalem Dateisystem, wodurch eine robuste und skalierbare Workflow-Ausführung gewährleistet wird.