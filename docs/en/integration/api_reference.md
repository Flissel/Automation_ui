# API Reference - Trusted Login System

## Overview

This comprehensive API reference documents all available endpoints of the Trusted Login System. The API follows REST principles and uses JSON for data transfer.

## Base URL

```
Production: https://api.trusted-login.com
Development: http://localhost:8007
```

## Authentication

Alle API-Endpunkte (außer öffentlichen) erfordern eine Authentifizierung über Bearer Token:

```http
Authorization: Bearer <your-jwt-token>
```

## Table of Contents

1. [Authentifizierung](#authentifizierung)
2. [Workflows](#workflows)
3. [Workflow execution](#workflow-execution)
4. [Desktop-Integration](#desktop-integration)
5. [Dateiverwaltung](#dateiverwaltung)
6. [OCR-Services](#ocr-services)
7. [Monitoring & Health](#monitoring--health)
8. [WebSocket-Events](#websocket-events)
9. [Fehlerbehandlung](#fehlerbehandlung)
10. [Rate Limiting](#rate-limiting)

## Authentifizierung

### POST /auth/login

User login with email and password.

**Request:**
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "def50200...",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "role": "user",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Fehler-Responses:**
```http
HTTP/1.1 401 Unauthorized
{
  "error": "invalid_credentials",
  "message": "Invalid email or password"
}

HTTP/1.1 422 Unprocessable Entity
{
  "error": "validation_error",
  "details": {
    "email": ["Invalid email format"]
  }
}
```

### POST /auth/refresh

Token-Erneuerung mit Refresh Token.

**Request:**
```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "def50200..."
}
```

**Response:**
```http
HTTP/1.1 200 OK
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### POST /auth/logout

User logout and token invalidation.

**Request:**
```http
POST /auth/logout
Authorization: Bearer <token>
```

**Response:**
```http
HTTP/1.1 200 OK
{
  "message": "Successfully logged out"
}
```

## Workflows

### GET /api/workflows

Retrieve all workflows of the authenticated user.

**Request:**
```http
GET /api/workflows?page=1&limit=20&search=automation
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Seitennummer (Standard: 1)
- `limit` (optional): Anzahl pro Seite (Standard: 20, Max: 100)
- `search` (optional): Search term for workflow names
- `status` (optional): Filter nach Status (`active`, `inactive`, `draft`)
- `sort` (optional): Sortierung (`name`, `created_at`, `updated_at`)
- `order` (optional): Sortierreihenfolge (`asc`, `desc`)

**Response:**
```http
HTTP/1.1 200 OK
{
  "workflows": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Daily Automation",
      "description": "Automated daily tasks",
      "status": "active",
      "nodes": [
        {
          "id": "node1",
          "type": "click",
          "position": {"x": 100, "y": 100},
          "config": {
            "x": 200,
            "y": 300,
            "button": "left",
            "clicks": 1
          }
        }
      ],
      "edges": [
        {
          "id": "edge1",
          "source": "node1",
          "target": "node2"
        }
      ],
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-16T14:20:00Z",
      "execution_count": 42,
      "last_execution": "2024-01-16T09:15:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

### GET /api/workflows/{workflow_id}

Retrieve a single workflow.

**Request:**
```http
GET /api/workflows/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>
```

**Response:**
```http
HTTP/1.1 200 OK
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Daily Automation",
  "description": "Automated daily tasks",
  "status": "active",
  "nodes": [...],
  "edges": [...],
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-16T14:20:00Z",
  "execution_count": 42,
  "last_execution": "2024-01-16T09:15:00Z",
  "statistics": {
    "success_rate": 95.2,
    "average_duration": 12.5,
    "total_executions": 42,
    "failed_executions": 2
  }
}
```

### POST /api/workflows

Create a new workflow.

**Request:**
```http
POST /api/workflows
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Automation Workflow",
  "description": "Description of the workflow",
  "nodes": [
    {
      "id": "start_node",
      "type": "manual_trigger",
      "position": {"x": 50, "y": 100},
      "config": {}
    },
    {
      "id": "click_node",
      "type": "click",
      "position": {"x": 200, "y": 100},
      "config": {
        "x": 500,
        "y": 300,
        "button": "left",
        "clicks": 1,
        "delay_before": 1000,
        "delay_after": 500
      }
    }
  ],
  "edges": [
    {
      "id": "edge1",
      "source": "start_node",
      "target": "click_node"
    }
  ],
  "status": "draft"
}
```

**Response:**
```http
HTTP/1.1 201 Created
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "New Automation Workflow",
  "description": "Description of the workflow",
  "status": "draft",
  "nodes": [...],
  "edges": [...],
  "created_at": "2024-01-16T15:30:00Z",
  "updated_at": "2024-01-16T15:30:00Z"
}
```

### PUT /api/workflows/{workflow_id}

Update workflow.

**Request:**
```http
PUT /api/workflows/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Workflow Name",
  "description": "Updated description",
  "nodes": [...],
  "edges": [...],
  "status": "active"
}
```

**Response:**
```http
HTTP/1.1 200 OK
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Updated Workflow Name",
  "description": "Updated description",
  "status": "active",
  "nodes": [...],
  "edges": [...],
  "updated_at": "2024-01-16T16:45:00Z"
}
```

### DELETE /api/workflows/{workflow_id}

Delete workflow.

**Request:**
```http
DELETE /api/workflows/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>
```

**Response:**
```http
HTTP/1.1 204 No Content
```

## Workflow execution

### POST /api/workflows/{workflow_id}/execute

Workflow ausführen.

**Request:**
```http
POST /api/workflows/550e8400-e29b-41d4-a716-446655440000/execute
Authorization: Bearer <token>
Content-Type: application/json

{
  "parameters": {
    "input_text": "Hello World",
    "target_application": "notepad"
  },
  "options": {
    "dry_run": false,
    "debug_mode": false,
    "timeout": 300
  }
}
```

**Response:**
```http
HTTP/1.1 200 OK
{
  "execution_id": "exec_123e4567-e89b-12d3-a456-426614174000",
  "workflow_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "running",
  "started_at": "2024-01-16T17:00:00Z",
  "estimated_duration": 15,
  "progress": {
    "current_step": 1,
    "total_steps": 5,
    "percentage": 20
  }
}
```

### GET /api/executions/{execution_id}

Ausführungsstatus abrufen.

**Request:**
```http
GET /api/executions/exec_123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer <token>
```

**Response:**
```http
HTTP/1.1 200 OK
{
  "id": "exec_123e4567-e89b-12d3-a456-426614174000",
  "workflow_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "started_at": "2024-01-16T17:00:00Z",
  "completed_at": "2024-01-16T17:00:15Z",
  "duration": 15.2,
  "result": {
    "success": true,
    "steps_executed": 5,
    "steps_failed": 0,
    "output_data": {
      "screenshot_path": "/screenshots/exec_123_final.png",
      "extracted_text": "Operation completed successfully"
    }
  },
  "logs": [
    {
      "timestamp": "2024-01-16T17:00:01Z",
      "level": "info",
      "message": "Starting workflow execution",
      "node_id": "start_node"
    },
    {
      "timestamp": "2024-01-16T17:00:05Z",
      "level": "info",
      "message": "Click action executed successfully",
      "node_id": "click_node",
      "details": {
        "coordinates": {"x": 500, "y": 300},
        "button": "left"
      }
    }
  ],
  "error": null
}
```

### POST /api/executions/{execution_id}/stop

Laufende Ausführung stoppen.

**Request:**
```http
POST /api/executions/exec_123e4567-e89b-12d3-a456-426614174000/stop
Authorization: Bearer <token>
```

**Response:**
```http
HTTP/1.1 200 OK
{
  "message": "Execution stopped successfully",
  "execution_id": "exec_123e4567-e89b-12d3-a456-426614174000",
  "status": "stopped",
  "stopped_at": "2024-01-16T17:00:10Z"
}
```

## Desktop-Integration

### POST /api/desktop/screenshot

Create a screenshot.

**Request:**
```http
POST /api/desktop/screenshot
Authorization: Bearer <token>
Content-Type: application/json

{
  "filename": "screenshot_2024_01_16.png",
  "quality": 80,
  "region": {
    "x": 0,
    "y": 0,
    "width": 1920,
    "height": 1080
  },
  "format": "png"
}
```

**Response:**
```http
HTTP/1.1 200 OK
{
  "success": true,
  "filepath": "/screenshots/screenshot_2024_01_16.png",
  "filename": "screenshot_2024_01_16.png",
  "size": 1024576,
  "dimensions": {
    "width": 1920,
    "height": 1080
  },
  "created_at": "2024-01-16T17:30:00Z",
  "url": "/api/files/screenshot_2024_01_16.png"
}
```

### POST /api/desktop/click

Perform mouse click.

**Request:**
```http
POST /api/desktop/click
Authorization: Bearer <token>
Content-Type: application/json

{
  "x": 500,
  "y": 300,
  "button": "left",
  "clicks": 1,
  "interval": 0.1,
  "delay_before": 1000,
  "delay_after": 500
}
```

**Response:**
```http
HTTP/1.1 200 OK
{
  "success": true,
  "action": "click",
  "coordinates": {"x": 500, "y": 300},
  "button": "left",
  "clicks": 1,
  "executed_at": "2024-01-16T17:35:00Z",
  "duration": 0.05
}
```

### POST /api/desktop/type

Text eingeben.

**Request:**
```http
POST /api/desktop/type
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "Hello, World!",
  "interval": 0.05,
  "delay_before": 500,
  "delay_after": 1000
}
```

**Response:**
```http
HTTP/1.1 200 OK
{
  "success": true,
  "action": "type",
  "text": "Hello, World!",
  "characters_typed": 13,
  "executed_at": "2024-01-16T17:40:00Z",
  "duration": 0.65
}
```

### POST /api/desktop/key

Tastenkombination ausführen.

**Request:**
```http
POST /api/desktop/key
Authorization: Bearer <token>
Content-Type: application/json

{
  "keys": ["ctrl", "c"],
  "delay_before": 100,
  "delay_after": 100
}
```

**Response:**
```http
HTTP/1.1 200 OK
{
  "success": true,
  "action": "key_combination",
  "keys": ["ctrl", "c"],
  "executed_at": "2024-01-16T17:45:00Z",
  "duration": 0.02
}
```

### GET /api/desktop/applications

Laufende Anwendungen abrufen.

**Request:**
```http
GET /api/desktop/applications
Authorization: Bearer <token>
```

**Response:**
```http
HTTP/1.1 200 OK
{
  "applications": [
    {
      "pid": 1234,
      "name": "notepad.exe",
      "title": "Untitled - Notepad",
      "executable": "C:\\Windows\\System32\\notepad.exe",
      "window_rect": {
        "x": 100,
        "y": 100,
        "width": 800,
        "height": 600
      },
      "is_visible": true,
      "is_minimized": false
    }
  ],
  "total_count": 1,
  "retrieved_at": "2024-01-16T17:50:00Z"
}
```

## Dateiverwaltung

### GET /api/files

Dateien auflisten.

**Request:**
```http
GET /api/files?type=screenshot&limit=50
Authorization: Bearer <token>
```

**Query Parameters:**
- `type` (optional): Dateityp (`screenshot`, `document`, `log`)
- `limit` (optional): Anzahl der Dateien (Standard: 20)
- `offset` (optional): Offset für Paginierung
- `search` (optional): Suchbegriff im Dateinamen

**Response:**
```http
HTTP/1.1 200 OK
{
  "files": [
    {
      "id": "file_123e4567-e89b-12d3-a456-426614174000",
      "filename": "screenshot_2024_01_16.png",
      "original_name": "screenshot_2024_01_16.png",
      "size": 1024576,
      "mime_type": "image/png",
      "type": "screenshot",
      "created_at": "2024-01-16T17:30:00Z",
      "url": "/api/files/screenshot_2024_01_16.png",
      "metadata": {
        "dimensions": {"width": 1920, "height": 1080},
        "quality": 80
      }
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 1
  }
}
```

### GET /api/files/{filename}

Datei herunterladen.

**Request:**
```http
GET /api/files/screenshot_2024_01_16.png
Authorization: Bearer <token>
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: image/png
Content-Length: 1024576
Content-Disposition: attachment; filename="screenshot_2024_01_16.png"

[Binary file content]
```

### DELETE /api/files/{filename}

Datei löschen.

**Request:**
```http
DELETE /api/files/screenshot_2024_01_16.png
Authorization: Bearer <token>
```

**Response:**
```http
HTTP/1.1 204 No Content
```

## OCR-Services

### POST /api/ocr/extract

Text aus Bild extrahieren.

**Request:**
```http
POST /api/ocr/extract
Authorization: Bearer <token>
Content-Type: application/json

{
  "image_path": "/screenshots/screenshot_2024_01_16.png",
  "language": "eng",
  "region": {
    "x": 100,
    "y": 100,
    "width": 400,
    "height": 200
  },
  "options": {
    "psm": 6,
    "oem": 3,
    "whitelist": "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz "
  }
}
```

**Response:**
```http
HTTP/1.1 200 OK
{
  "success": true,
  "extracted_text": "Hello World\nThis is extracted text",
  "confidence": 95.2,
  "language": "eng",
  "processing_time": 1.25,
  "word_count": 6,
  "regions": [
    {
      "text": "Hello World",
      "confidence": 98.1,
      "bbox": {"x": 120, "y": 110, "width": 180, "height": 25}
    },
    {
      "text": "This is extracted text",
      "confidence": 92.3,
      "bbox": {"x": 120, "y": 140, "width": 280, "height": 25}
    }
  ],
  "processed_at": "2024-01-16T18:00:00Z"
}
```

### POST /api/ocr/extract-from-screen

Text direkt vom Bildschirm extrahieren.

**Request:**
```http
POST /api/ocr/extract-from-screen
Authorization: Bearer <token>
Content-Type: application/json

{
  "region": {
    "x": 100,
    "y": 100,
    "width": 400,
    "height": 200
  },
  "language": "eng",
  "save_screenshot": true
}
```

**Response:**
```http
HTTP/1.1 200 OK
{
  "success": true,
  "extracted_text": "Screen text content",
  "confidence": 89.7,
  "screenshot_path": "/screenshots/ocr_region_2024_01_16_18_05.png",
  "processing_time": 2.1,
  "processed_at": "2024-01-16T18:05:00Z"
}
```

## Monitoring & Health

### GET /health

System-Gesundheitsstatus.

**Request:**
```http
GET /health
```

**Response:**
```http
HTTP/1.1 200 OK
{
  "status": "healthy",
  "timestamp": "2024-01-16T18:10:00Z",
  "version": "1.0.0",
  "uptime": 86400,
  "services": {
    "database": {
      "status": "healthy",
      "response_time": 12
    },
    "supabase": {
      "status": "healthy",
      "response_time": 45
    },
    "desktop_service": {
      "status": "healthy",
      "response_time": 5
    },
    "ocr_service": {
      "status": "healthy",
      "response_time": 23
    }
  },
  "system": {
    "cpu_usage": 15.2,
    "memory_usage": 68.5,
    "disk_usage": 45.1
  }
}
```

### GET /api/metrics

System-Metriken.

**Request:**
```http
GET /api/metrics
Authorization: Bearer <token>
```

**Response:**
```http
HTTP/1.1 200 OK
{
  "metrics": {
    "workflows": {
      "total_count": 156,
      "active_count": 89,
      "executions_today": 234,
      "success_rate_24h": 96.8
    },
    "executions": {
      "total_count": 5432,
      "running_count": 3,
      "average_duration": 18.5,
      "failed_count_24h": 8
    },
    "desktop_actions": {
      "clicks_24h": 1234,
      "screenshots_24h": 89,
      "ocr_operations_24h": 45
    },
    "performance": {
      "avg_response_time": 125,
      "p95_response_time": 450,
      "error_rate_24h": 0.2
    }
  },
  "collected_at": "2024-01-16T18:15:00Z"
}
```

## WebSocket-Events

### Verbindung

```javascript
const ws = new WebSocket('ws://localhost:8007/ws');
ws.onopen = function(event) {
    // Authentifizierung senden
    ws.send(JSON.stringify({
        type: 'auth',
        token: 'your-jwt-token'
    }));
};
```

### Event-Typen

#### Workflow execution

```json
{
  "type": "workflow_execution_started",
  "data": {
    "execution_id": "exec_123e4567-e89b-12d3-a456-426614174000",
    "workflow_id": "550e8400-e29b-41d4-a716-446655440000",
    "started_at": "2024-01-16T18:20:00Z"
  }
}

{
  "type": "workflow_execution_progress",
  "data": {
    "execution_id": "exec_123e4567-e89b-12d3-a456-426614174000",
    "current_step": 3,
    "total_steps": 5,
    "percentage": 60,
    "current_node": "ocr_node",
    "message": "Extracting text from screenshot"
  }
}

{
  "type": "workflow_execution_completed",
  "data": {
    "execution_id": "exec_123e4567-e89b-12d3-a456-426614174000",
    "status": "completed",
    "duration": 15.2,
    "completed_at": "2024-01-16T18:20:15Z",
    "result": {
      "success": true,
      "output_data": {...}
    }
  }
}
```

#### Desktop-Events

```json
{
  "type": "desktop_action_executed",
  "data": {
    "action": "click",
    "coordinates": {"x": 500, "y": 300},
    "success": true,
    "executed_at": "2024-01-16T18:25:00Z"
  }
}

{
  "type": "screenshot_captured",
  "data": {
    "filename": "screenshot_2024_01_16_18_25.png",
    "size": 1024576,
    "url": "/api/files/screenshot_2024_01_16_18_25.png",
    "captured_at": "2024-01-16T18:25:00Z"
  }
}
```

#### System-Events

```json
{
  "type": "system_alert",
  "data": {
    "level": "warning",
    "message": "High CPU usage detected",
    "metric": "cpu_usage",
    "value": 85.2,
    "threshold": 80.0,
    "timestamp": "2024-01-16T18:30:00Z"
  }
}
```

## Fehlerbehandlung

### Standard-Fehlerformat

Alle API-Fehler folgen einem einheitlichen Format:

```json
{
  "error": "error_code",
  "message": "Human readable error message",
  "details": {
    "field": ["Specific validation error"]
  },
  "timestamp": "2024-01-16T18:35:00Z",
  "request_id": "req_123e4567-e89b-12d3-a456-426614174000"
}
```

### HTTP-Status-Codes

- **200 OK**: Erfolgreiche Anfrage
- **201 Created**: Ressource erfolgreich erstellt
- **204 No Content**: Erfolgreiche Anfrage ohne Inhalt
- **400 Bad Request**: Ungültige Anfrage
- **401 Unauthorized**: Authentifizierung erforderlich
- **403 Forbidden**: Zugriff verweigert
- **404 Not Found**: Ressource nicht gefunden
- **422 Unprocessable Entity**: Validierungsfehler
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server-Fehler
- **503 Service Unavailable**: Service nicht verfügbar

### Häufige Fehlercodes

#### Authentifizierung
- `invalid_credentials`: Ungültige Anmeldedaten
- `token_expired`: Token abgelaufen
- `token_invalid`: Ungültiger Token
- `insufficient_permissions`: Unzureichende Berechtigungen

#### Validation
- `validation_error`: Eingabevalidierung fehlgeschlagen
- `missing_required_field`: Pflichtfeld fehlt
- `invalid_format`: Ungültiges Format
- `value_out_of_range`: Wert außerhalb des gültigen Bereichs

#### Workflow
- `workflow_not_found`: Workflow nicht gefunden
- `workflow_execution_failed`: Workflow execution failed
- `invalid_workflow_structure`: Ungültige Workflow-Struktur
- `node_configuration_invalid`: Ungültige Node-Konfiguration

#### Desktop
- `desktop_action_failed`: Desktop-Aktion fehlgeschlagen
- `screenshot_failed`: Screenshot-Erstellung fehlgeschlagen
- `application_not_found`: Anwendung nicht gefunden
- `coordinates_out_of_bounds`: Koordinaten außerhalb des Bildschirms

#### OCR
- `ocr_processing_failed`: OCR-Verarbeitung fehlgeschlagen
- `image_not_found`: Bild nicht gefunden
- `unsupported_image_format`: Nicht unterstütztes Bildformat
- `ocr_confidence_too_low`: OCR-Konfidenz zu niedrig

## Rate Limiting

### Limits

- **Authenticated users**: 1000 requests per hour
- **Workflow executions**: 100 per hour
- **Desktop-Aktionen**: 500 pro Stunde
- **OCR-Operationen**: 200 pro Stunde
- **Datei-Uploads**: 50 pro Stunde

### Headers

Rate-Limit-Informationen werden in Response-Headern übermittelt:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642348800
X-RateLimit-Window: 3600
```

### Rate Limit Überschreitung

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 3600

{
  "error": "rate_limit_exceeded",
  "message": "Rate limit exceeded. Try again in 3600 seconds.",
  "details": {
    "limit": 1000,
    "window": 3600,
    "reset_at": "2024-01-16T19:00:00Z"
  }
}
```

## SDK und Code-Beispiele

### Python SDK

```python
from trusted_login_sdk import TrustedLoginClient

# Client initialisieren
client = TrustedLoginClient(
    base_url="http://localhost:8007",
    api_key="your-api-key"
)

# Anmelden
auth_result = client.auth.login(
    email="user@example.com",
    password="password123"
)

# Workflow erstellen
workflow = client.workflows.create({
    "name": "Python SDK Workflow",
    "nodes": [
        {
            "id": "click1",
            "type": "click",
            "config": {"x": 100, "y": 200}
        }
    ],
    "edges": []
})

# Workflow ausführen
execution = client.workflows.execute(workflow.id)

# Status überwachen
while execution.status == "running":
    time.sleep(1)
    execution = client.executions.get(execution.id)

print(f"Execution completed: {execution.result}")
```

### JavaScript SDK

```javascript
import { TrustedLoginClient } from '@trusted-login/sdk';

// Client initialisieren
const client = new TrustedLoginClient({
  baseUrl: 'http://localhost:8007',
  apiKey: 'your-api-key'
});

// Anmelden
const authResult = await client.auth.login({
  email: 'user@example.com',
  password: 'password123'
});

// Workflow erstellen
const workflow = await client.workflows.create({
  name: 'JavaScript SDK Workflow',
  nodes: [
    {
      id: 'screenshot1',
      type: 'screenshot',
      config: { filename: 'test.png' }
    }
  ],
  edges: []
});

// Workflow ausführen mit WebSocket-Monitoring
const execution = await client.workflows.execute(workflow.id);

// WebSocket für Echtzeit-Updates
client.ws.on('workflow_execution_progress', (data) => {
  console.log(`Progress: ${data.percentage}%`);
});

client.ws.on('workflow_execution_completed', (data) => {
  console.log('Execution completed:', data.result);
});
```

### cURL-Beispiele

```bash
# Anmelden
curl -X POST http://localhost:8007/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# Workflow erstellen
curl -X POST http://localhost:8007/api/workflows \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "cURL Test Workflow",
    "nodes": [
      {
        "id": "node1",
        "type": "click",
        "config": {"x": 100, "y": 200}
      }
    ],
    "edges": []
  }'

# Screenshot erstellen
curl -X POST http://localhost:8007/api/desktop/screenshot \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test_screenshot.png",
    "quality": 80
  }'

# Datei herunterladen
curl -X GET http://localhost:8007/api/files/test_screenshot.png \
  -H "Authorization: Bearer $TOKEN" \
  -o "downloaded_screenshot.png"
```

## Versionierung

Die API verwendet semantische Versionierung (SemVer). Die aktuelle Version wird im `version`-Feld der Health-Check-Response angegeben.

### API-Versionen

- **v1.0.0**: Aktuelle stabile Version
- **v1.1.0**: Geplante Erweiterungen (Q2 2024)
- **v2.0.0**: Breaking Changes (Q4 2024)

### Backward Compatibility

Minor-Versionen sind rückwärtskompatibel. Major-Versionen können Breaking Changes enthalten und erfordern Code-Anpassungen.

## Support und Kontakt

Für technischen Support und Fragen zur API:

- **Dokumentation**: https://docs.trusted-login.com
- **Support-Email**: support@trusted-login.com
- **GitHub Issues**: https://github.com/trusted-login/issues
- **Discord Community**: https://discord.gg/trusted-login

---

*Diese API-Referenz wird kontinuierlich aktualisiert. Letzte Aktualisierung: 16. Januar 2024*