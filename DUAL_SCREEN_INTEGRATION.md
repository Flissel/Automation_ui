# Dual-Screen Integration - TRAE Unity AI Platform

## 📋 Übersicht

Die Dual-Screen Integration ermöglicht es, beide Bildschirme (Screen 1 und Screen 2) des gesamten Desktops gleichzeitig zu erfassen, das Video am Übergang zu schneiden und die Bilder asynchron an separate Desktop-Views zu senden, sodass beide Screens auf zwei separaten Desktops angezeigt werden.

## 🎯 Funktionalitäten

### ✅ Implementierte Features

1. **Simultane Dual-Screen Erfassung**
   - Erfassung beider Bildschirme gleichzeitig
   - Automatische Bildaufteilung am Übergang
   - Asynchrone Übertragung an separate Views

2. **WebSocket Integration**
   - Dual-Screen Client-Typ Unterstützung
   - Erweiterte Message-Handler
   - Automatische Client-Erkennung und -Verwaltung

3. **React UI-Komponenten**
   - `DualScreenViewer` für Dual-Screen Anzeige
   - Integration in `MultiDesktopStreams`
   - View-Mode Umschaltung (Grid/Dual-Screen)

4. **Python Capture Client**
   - `dual_screen_capture_client.py` für Screen-Erfassung
   - Automatische Bildverarbeitung und -aufteilung
   - Performance-Optimierung

## 📁 Dateistruktur

```
trusted-login-system/
├── src/
│   ├── components/
│   │   └── trae/
│   │       └── liveDesktop/
│   │           ├── DualScreenViewer.tsx          # Dual-Screen React Komponente
│   │           └── MultiDesktopStreams.tsx       # Erweiterte Multi-Desktop Streams
│   └── pages/
│       └── trae/
│           └── liveDesktop/
│               └── MultiDesktopStreams.tsx       # Hauptseite mit Dual-Screen Support
├── dual_screen_capture_client.py                # Python Capture Client
├── dual-screen-websocket-handler.js             # WebSocket Handler für Dual-Screen
├── local-websocket-server.js                    # Erweiterte WebSocket Server
├── test_dual_screen.py                          # Test-Skript
└── DUAL_SCREEN_INTEGRATION.md                   # Diese Dokumentation
```

## 🚀 Quick Start

### 1. WebSocket Server starten

```bash
cd C:\code\autogen_project_maker\trusted-login-system
node local-websocket-server.js
```

### 2. React Frontend starten

```bash
npm start
# oder
yarn start
```

### 3. Dual-Screen Capture Client starten

```bash
python dual_screen_capture_client.py
```

### 4. Web-Interface öffnen

Navigiere zu: `http://localhost:3000/trae/liveDesktop/MultiDesktopStreams`

## 🔧 Konfiguration

### WebSocket Server Konfiguration

Der WebSocket Server läuft standardmäßig auf Port `8084` und unterstützt folgende Client-Typen:

- `desktop` - Standard Desktop Clients
- `web` - Web Browser Clients
- `spawner` - Desktop Spawner Clients
- `dual_screen_desktop` - **NEU**: Dual-Screen Desktop Clients

### Dual-Screen Client Konfiguration

```python
# dual_screen_capture_client.py Konfiguration
WEBSOCKET_URL = "ws://localhost:8084"
CAPTURE_FPS = 10
COMPRESSION_QUALITY = 85
SPLIT_THRESHOLD = 0.1  # Schwellenwert für Bildaufteilung
```

### React Komponenten Konfiguration

```typescript
// DualScreenViewer.tsx Konfiguration
const WEBSOCKET_URL = 'ws://localhost:8084';
const RECONNECT_INTERVAL = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;
```

## 📡 WebSocket Nachrichten-Protokoll

### Client → Server

#### Handshake
```json
{
  "type": "handshake",
  "client_type": "dual_screen_desktop",
  "client_id": "dual_screen_client_123",
  "capabilities": {
    "dual_screen_capture": true,
    "screen_splitting": true,
    "async_transmission": true,
    "supported_formats": ["png", "jpeg"],
    "max_resolution": "3840x2160",
    "compression": true
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Dual-Screen Frame
```json
{
  "type": "dual_screen_frame",
  "client_id": "dual_screen_client_123",
  "screen_id": 1,
  "image_data": "base64_encoded_image_data",
  "width": 1920,
  "height": 1080,
  "format": "png",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "frame_number": 42,
  "metadata": {
    "capture_method": "dual_screen_split",
    "compression_ratio": 0.8,
    "processing_time_ms": 15
  }
}
```

### Server → Client

#### Handshake Bestätigung
```json
{
  "type": "handshake_ack",
  "client_id": "dual_screen_client_123",
  "server_capabilities": {
    "dual_screen_support": true,
    "max_clients": 10,
    "supported_formats": ["png", "jpeg", "webp"]
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Dual-Screen Client Verbunden
```json
{
  "type": "dual_screen_connected",
  "client_id": "dual_screen_client_123",
  "capabilities": { ... },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🎮 Verwendung

### 1. Dual-Screen Modus aktivieren

1. Öffne das Multi-Desktop Streams Interface
2. Klicke auf "Dual Screen" Button im Header
3. Wähle einen verfügbaren Dual-Screen Client aus
4. Die beiden Screens werden automatisch in separaten Views angezeigt

### 2. View-Modi

- **Grid View**: Standard Multi-Desktop Grid-Ansicht
- **Dual Screen**: Spezialisierte Dual-Screen Ansicht mit zwei separaten Canvas-Elementen

### 3. Steuerung

- **Fullscreen**: Vollbild-Modus für einzelne Screens
- **Screen Selection**: Auswahl zwischen Screen 1 und Screen 2
- **Auto-Refresh**: Automatische Aktualisierung der Client-Liste

## 🔍 Technische Details

### Screen-Erfassung und -Aufteilung

Der `dual_screen_capture_client.py` verwendet folgende Techniken:

1. **Multi-Monitor Detection**: Automatische Erkennung aller verfügbaren Monitore
2. **Combined Screenshot**: Erfassung eines kombinierten Screenshots aller Monitore
3. **Intelligent Splitting**: Aufteilung basierend auf Monitor-Grenzen
4. **Async Processing**: Asynchrone Verarbeitung und Übertragung

### Performance-Optimierung

- **Frame Rate Control**: Konfigurierbare FPS (Standard: 10 FPS)
- **Compression**: JPEG-Kompression mit einstellbarer Qualität
- **Async Transmission**: Parallele Übertragung beider Screen-Daten
- **Error Recovery**: Automatische Wiederverbindung bei Verbindungsfehlern

### WebSocket Server Erweiterungen

- **Client Type Management**: Erweiterte Client-Typ-Verwaltung
- **Dual-Screen State Tracking**: Verfolgung von Dual-Screen Client-Zuständen
- **Enhanced Message Routing**: Verbesserte Nachrichten-Weiterleitung
- **Connection Monitoring**: Überwachung von Client-Verbindungen

## 🧪 Testing

### Automatisierte Tests

```bash
# Dual-Screen Funktionalität testen
python test_dual_screen.py
```

Der Test überprüft:
- WebSocket Verbindung
- Handshake-Prozess
- Frame-Übertragung
- Performance-Metriken

### Manuelle Tests

1. **Verbindungstest**: Überprüfe WebSocket-Verbindung
2. **Capture-Test**: Teste Screen-Erfassung
3. **Display-Test**: Überprüfe Anzeige in beiden Views
4. **Performance-Test**: Messe FPS und Latenz

## 📊 Monitoring und Debugging

### Logging

Alle Komponenten verwenden strukturiertes Logging:

- **WebSocket Server**: Console-Logs mit Timestamps
- **Python Client**: File + Console Logging
- **React Components**: Browser Console Logs

### Performance-Metriken

- **Frame Rate**: Tatsächliche vs. Ziel-FPS
- **Latency**: Zeit von Capture bis Display
- **Bandwidth**: Datenübertragungsrate
- **Error Rate**: Fehlerrate bei Übertragung

### Debug-Modi

```python
# Python Client Debug-Modus
DEBUG_MODE = True
VERBOSE_LOGGING = True
SAVE_DEBUG_IMAGES = True
```

```typescript
// React Component Debug-Modus
const DEBUG_MODE = process.env.NODE_ENV === 'development';
const VERBOSE_LOGGING = true;
```

## 🔧 Troubleshooting

### Häufige Probleme

#### 1. WebSocket Verbindung fehlgeschlagen
```
Lösung: Überprüfe ob der WebSocket Server läuft
Command: node local-websocket-server.js
```

#### 2. Keine Dual-Screen Clients verfügbar
```
Lösung: Starte den Dual-Screen Capture Client
Command: python dual_screen_capture_client.py
```

#### 3. Schlechte Performance
```
Lösungen:
- Reduziere FPS in der Konfiguration
- Erhöhe Kompression
- Überprüfe Netzwerk-Latenz
```

#### 4. Bildaufteilung funktioniert nicht
```
Lösungen:
- Überprüfe Monitor-Konfiguration
- Justiere SPLIT_THRESHOLD
- Teste mit verschiedenen Auflösungen
```

### Debug-Befehle

```bash
# WebSocket Server Status
netstat -an | findstr :8084

# Python Dependencies überprüfen
pip list | findstr -i "websocket\|pillow\|asyncio"

# React Build überprüfen
npm run build
```

## 🚀 Nächste Schritte

### Geplante Erweiterungen

1. **Multi-Client Support**: Unterstützung für mehrere Dual-Screen Clients
2. **Recording Functionality**: Aufzeichnung von Dual-Screen Sessions
3. **Advanced Splitting**: KI-basierte intelligente Bildaufteilung
4. **Mobile Support**: Dual-Screen Anzeige auf mobilen Geräten
5. **Cloud Integration**: Cloud-basierte Dual-Screen Verarbeitung

### Performance-Verbesserungen

1. **Hardware Acceleration**: GPU-beschleunigte Bildverarbeitung
2. **Adaptive Quality**: Dynamische Qualitätsanpassung
3. **Predictive Caching**: Vorhersagende Zwischenspeicherung
4. **Network Optimization**: Netzwerk-optimierte Übertragung

## 📞 Support

Bei Problemen oder Fragen zur Dual-Screen Integration:

1. Überprüfe diese Dokumentation
2. Führe die automatisierten Tests aus
3. Überprüfe die Log-Dateien
4. Kontaktiere das TRAE Unity AI Platform Team

## 📄 Lizenz

Diese Dual-Screen Integration ist Teil der TRAE Unity AI Platform und unterliegt den gleichen Lizenzbedingungen.

---

**Version**: 1.0.0  
**Letzte Aktualisierung**: 2024-01-15  
**Autor**: TRAE Unity AI Platform Team