# AutoGen OCR Analysis Service

Multi-Agent-Service für intelligente Desktop-Screenshot-Analyse und **automatisierte UI-Steuerung** mit AutoGen 4.0.

## 🚀 Features

- **Multi-Agent-Team**: Vision Agent, OCR Agent, Coordinator Agent, **Automation Agent**
- **Screenshot-Analyse**: Visuelle UI-Analyse mit GPT-4 Vision
- **OCR-Text-Extraktion**: Semantische Textanalyse
- **🆕 Desktop-Automation**: KI-gesteuerte Maus/Tastatur-Aktionen
- **Dual-Screen-Support**: Parallele Analyse beider Monitore
- **REST API**: FastAPI-basierte Endpunkte
- **WebSocket-Bridge**: Echtzeit-Kommunikation mit Desktop-Clients

## 📁 Projektstruktur

```
backend/autogen_service/
├── agents/
│   ├── __init__.py
│   ├── automation_agent.py  # 🆕 Maus/Tastatur-Automation
│   ├── coordinator.py
│   ├── ocr_agent.py
│   └── vision_agent.py
├── __init__.py
├── agent_service.py         # Haupt-Service-Klasse
├── api_server.py            # FastAPI REST API
├── config.py                # Konfiguration
├── desktop_bridge.py        # 🆕 WebSocket/HTTP Bridge
├── frame_processor.py
├── requirements.txt
├── run_agent_service.py
├── test_automation.py       # 🆕 Test-Script
└── README.md
```

## 🛠️ Installation

```bash
cd backend/autogen_service
pip install -r requirements.txt
```

### Umgebungsvariablen

```bash
# Erforderlich
export OPENAI_API_KEY="sk-..."

# Optional (für Desktop-Bridge)
export VITE_SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

## 🚀 Server starten

```bash
# Development
uvicorn backend.autogen_service.api_server:app --host 0.0.0.0 --port 8008 --reload

# Production
uvicorn backend.autogen_service.api_server:app --host 0.0.0.0 --port 8008 --workers 4
```

## 📡 API Endpoints

### Health & Stats

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/health` | GET | Health Check |
| `/api/v1/stats` | GET | Analyse-Statistiken |

### Analyse

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/v1/analyze-ocr` | POST | OCR-Text semantisch analysieren |
| `/api/v1/analyze-frame` | POST | Screenshot analysieren |

### 🆕 Automation

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/v1/automate` | POST | Screenshot analysieren + Automation planen |
| `/api/v1/execute-plan` | POST | Automation-Plan ausführen |
| `/api/v1/send-command` | POST | Einzelnen Command senden |
| `/api/v1/desktop-clients` | GET | Verfügbare Desktop-Clients |
| `/api/v1/set-target-client` | POST | Ziel-Client setzen |

## 📝 API-Beispiele

### 1. Screenshot analysieren + Automation planen

```bash
curl -X POST http://localhost:8008/api/v1/automate \
  -H "Content-Type: application/json" \
  -d '{
    "frame_data": "<base64_jpeg>",
    "task_instruction": "Klicke auf den Button Speichern",
    "monitor_id": "monitor_0",
    "auto_execute": false
  }'
```

**Response:**
```json
{
  "status": "planned",
  "analysis": { ... },
  "automation_plan": {
    "goal": "Button 'Speichern' anklicken",
    "steps": [
      {
        "type": "mouse_click",
        "params": {"x": 850, "y": 520, "monitorId": "monitor_0"},
        "description": "Klick auf Speichern-Button",
        "wait_after_ms": 500
      }
    ],
    "requires_confirmation": true
  },
  "processing_time": 2.5
}
```

### 2. Automation-Plan ausführen

```bash
curl -X POST http://localhost:8008/api/v1/execute-plan \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "Datei speichern",
    "steps": [
      {
        "type": "mouse_click",
        "params": {"x": 850, "y": 520},
        "description": "Klick auf Speichern",
        "wait_after_ms": 500
      }
    ]
  }'
```

### 3. Einzelnen Command senden

```bash
curl -X POST http://localhost:8008/api/v1/send-command \
  -H "Content-Type: application/json" \
  -d '{
    "type": "mouse_click",
    "x": 500,
    "y": 300,
    "button": "left",
    "monitor_id": "monitor_0"
  }'
```

### 4. Verfügbare Clients abrufen

```bash
curl http://localhost:8008/api/v1/desktop-clients
```

**Response:**
```json
[
  {
    "client_id": "desktop_abc123",
    "hostname": "DESKTOP-PC",
    "monitors": ["monitor_0", "monitor_1"],
    "status": "connected"
  }
]
```

## 🎮 Verfügbare Automation-Commands

| Command | Beschreibung | Parameter |
|---------|--------------|-----------|
| `mouse_click` | Mausklick | `x`, `y`, `button`, `double` |
| `mouse_move` | Maus bewegen | `x`, `y`, `duration` |
| `mouse_drag` | Drag & Drop | `startX`, `startY`, `endX`, `endY` |
| `type_text` | Text eingeben | `text`, `interval` |
| `key_press` | Taste drücken | `key`, `modifiers` |
| `hotkey` | Tastenkombination | `keys` (Array) |
| `scroll` | Scrollen | `x`, `y`, `scrollAmount`, `direction` |

## 🧪 Tests ausführen

```bash
# Automation-API testen
python -m backend.autogen_service.test_automation

# Alternativ direkt
cd backend/autogen_service
python test_automation.py
```

## 🏗️ Architektur

```
┌──────────────────────────────────────────────────────────────┐
│                      Frontend/Browser                        │
│              (React + DualCanvasOCRDesigner)                │
└─────────────────────────┬────────────────────────────────────┘
                          │ REST/WebSocket
┌─────────────────────────▼────────────────────────────────────┐
│                   AutoGen API Server                         │
│                 (FastAPI, Port 8008)                        │
├──────────────────────────────────────────────────────────────┤
│ ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐  │
│ │ Vision Agent│  │ OCR Agent  │  │ Coordinator Agent   │   │
│ └─────────────┘  └─────────────┘  └──────────────────────┘  │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐    │
│ │              🆕 Automation Agent                      │    │
│ │  - Plant Maus/Tastatur-Aktionen                      │    │
│ │  - Basiert auf Screenshot-Analyse                    │    │
│ └──────────────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────────┤
│                  Desktop Bridge                              │
│           (WebSocket + HTTP Fallback)                       │
└─────────────────────────┬────────────────────────────────────┘
                          │ WebSocket/Commands
┌─────────────────────────▼────────────────────────────────────┐
│              Supabase Edge Function                          │
│            (live-desktop-stream)                            │
└─────────────────────────┬────────────────────────────────────┘
                          │ WebSocket
┌─────────────────────────▼────────────────────────────────────┐
│              Desktop Client (Python)                         │
│         dual_screen_capture_client.py                       │
├──────────────────────────────────────────────────────────────┤
│ ┌────────────┐  ┌────────────┐  ┌────────────────────────┐  │
│ │ Screenshot │  │  Command  │  │     pyautogui         │   │
│ │  Capture   │  │  Queue    │  │ (Maus/Tastatur)       │   │
│ └────────────┘  └────────────┘  └────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## 🔒 Sicherheitshinweise

1. **Bestätigung erforderlich**: `requires_confirmation: true` bei kritischen Aktionen
2. **Rate Limiting**: Empfohlen für Production
3. **Authentication**: Service-Keys für API-Zugriff
4. **Logging**: Alle Automation-Commands werden protokolliert

## 🐛 Troubleshooting

### AutoGen nicht verfügbar
```bash
pip install autogen-agentchat autogen-ext autogen-core
```

### Desktop-Client nicht verbunden
1. Prüfe ob `dual_screen_capture_client.py` läuft
2. Prüfe WebSocket-Verbindung in den Logs
3. Verifiziere Supabase-Konfiguration

### Commands werden nicht ausgeführt
1. Prüfe `pyautogui` Installation auf dem Desktop-Client
2. Prüfe Berechtigungen (Administrator für UI-Automation)
3. Prüfe Monitor-ID (`monitor_0` vs `monitor_1`)

## 📚 Weiterführende Links

- [AutoGen 4.0 Dokumentation](https://microsoft.github.io/autogen/)
- [OpenAI Vision API](https://platform.openai.com/docs/guides/vision)
- [PyAutoGUI](https://pyautogui.readthedocs.io/)