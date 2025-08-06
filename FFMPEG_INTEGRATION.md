# 🎬 FFmpeg Integration für TRAE Unity AI Platform

## 📋 Übersicht

FFmpeg wurde erfolgreich in die TRAE Unity AI Platform integriert und bietet umfassende Video- und Audio-Verarbeitungsfunktionen.

## ✅ Installation Status

- **FFmpeg Version**: 7.1 (installiert)
- **Installationsort**: `tools/ffmpeg/`
- **Wrapper-Skript**: `ffmpeg.bat`
- **Test-Status**: ✅ Alle Funktionen getestet

## 🚀 Schnellstart

### 1. FFmpeg Setup (falls noch nicht installiert)
```batch
setup-ffmpeg.bat
```

### 2. FFmpeg testen
```batch
test-ffmpeg.bat
```

### 3. Anwendung mit FFmpeg starten
```batch
start-all.bat
```

## 🛠️ Verfügbare Funktionen

### Video-Verarbeitung
- **Format-Konvertierung**: MP4, AVI, MOV, WebM
- **Komprimierung**: Verschiedene Qualitätsstufen (CRF 18-28)
- **Auflösung ändern**: Beliebige Zielauflösungen
- **Framerate anpassen**: 24fps, 30fps, 60fps, etc.

### Audio-Verarbeitung
- **Audio-Extraktion**: Aus Videos extrahieren
- **Format-Konvertierung**: MP3, AAC, WAV, FLAC
- **Bitrate-Anpassung**: 128k, 192k, 320k

### Thumbnail-Erstellung
- **Video-Thumbnails**: JPEG, PNG
- **Zeitstempel-Auswahl**: Beliebige Position im Video
- **Größen-Anpassung**: Verschiedene Auflösungen

### Erweiterte Funktionen
- **Video-Informationen**: Dauer, Auflösung, Codecs, Bitrate
- **Batch-Verarbeitung**: Mehrere Dateien gleichzeitig
- **Video-Kombination**: Mehrere Videos zusammenfügen

## 📁 Projektstruktur

```
trusted-login-system/
├── tools/
│   └── ffmpeg/                    # FFmpeg-Installation
│       ├── ffmpeg.exe
│       ├── ffprobe.exe
│       └── ffplay.exe
├── src/
│   ├── services/
│   │   └── ffmpeg-service.js      # FFmpeg-Service-Klasse
│   ├── components/
│   │   └── media/
│   │       └── MediaProcessor.tsx # React-Komponente
│   └── api/
│       └── media.js               # REST-API-Endpunkte
├── test-output/                   # Test-Dateien
│   ├── test-video.mp4
│   ├── thumbnail.jpg
│   ├── audio.mp3
│   └── compressed.mp4
├── setup-ffmpeg.bat              # Automatisches Setup
├── test-ffmpeg.bat               # Funktionstest
└── ffmpeg.bat                    # Wrapper-Skript
```

## 🔧 API-Endpunkte

### Status überprüfen
```http
GET /api/media/status
```

### Datei hochladen
```http
POST /api/media/upload
Content-Type: multipart/form-data
```

### Video konvertieren
```http
POST /api/media/convert
Content-Type: application/json

{
  "inputFile": "video.mp4",
  "outputFormat": "webm",
  "options": {
    "videoCodec": "libvpx-vp9",
    "videoBitrate": "1M",
    "resolution": "1280x720"
  }
}
```

### Audio extrahieren
```http
POST /api/media/extract-audio
Content-Type: application/json

{
  "inputFile": "video.mp4",
  "options": {
    "codec": "mp3",
    "bitrate": "192k"
  }
}
```

### Thumbnail erstellen
```http
POST /api/media/thumbnail
Content-Type: application/json

{
  "inputFile": "video.mp4",
  "options": {
    "timestamp": "00:00:05",
    "size": "640x360"
  }
}
```

### Video komprimieren
```http
POST /api/media/compress
Content-Type: application/json

{
  "inputFile": "video.mp4",
  "options": {
    "quality": "23",
    "preset": "medium"
  }
}
```

### Video-Informationen abrufen
```http
POST /api/media/info
Content-Type: application/json

{
  "inputFile": "video.mp4"
}
```

### Datei herunterladen
```http
GET /api/media/download/:filename
```

## 💻 Programmatische Nutzung

### JavaScript/Node.js
```javascript
import ffmpegService from './src/services/ffmpeg-service.js';

// Video konvertieren
const result = await ffmpegService.convertVideo(
  'input.mp4',
  'output.webm',
  {
    videoCodec: 'libvpx-vp9',
    videoBitrate: '1M'
  }
);

// Audio extrahieren
await ffmpegService.extractAudio(
  'video.mp4',
  'audio.mp3',
  { bitrate: '192k' }
);

// Thumbnail erstellen
await ffmpegService.createThumbnail(
  'video.mp4',
  'thumb.jpg',
  { timestamp: '00:00:05' }
);
```

### React-Komponente
```jsx
import MediaProcessor from './src/components/media/MediaProcessor';

function App() {
  return (
    <div>
      <MediaProcessor />
    </div>
  );
}
```

## 🎯 Anwendungsfälle

### Content Management
- **Video-Upload**: Automatische Konvertierung zu Web-Formaten
- **Thumbnail-Generierung**: Für Video-Previews
- **Audio-Extraktion**: Für Podcasts oder Musik

### Streaming & Broadcasting
- **Format-Optimierung**: Für verschiedene Geräte
- **Komprimierung**: Bandbreiten-optimiert
- **Live-Streaming**: Vorbereitung von Inhalten

### Automation & Workflows
- **Batch-Verarbeitung**: Große Mengen von Medien
- **Qualitätskontrolle**: Automatische Optimierung
- **Integration**: Mit anderen TRAE-Services

## 🔍 Unterstützte Formate

### Video-Eingabe
- MP4, AVI, MOV, MKV, WebM, FLV, 3GP
- H.264, H.265, VP8, VP9, AV1

### Video-Ausgabe
- MP4 (H.264/H.265)
- WebM (VP8/VP9)
- AVI (verschiedene Codecs)
- MOV (QuickTime)

### Audio-Eingabe
- MP3, AAC, WAV, FLAC, OGG, WMA
- Dolby Digital, DTS

### Audio-Ausgabe
- MP3 (LAME)
- AAC (Advanced Audio Coding)
- WAV (unkomprimiert)
- FLAC (verlustfrei)
- OGG Vorbis

### Bild-Ausgabe
- JPEG, PNG, BMP, TIFF
- WebP, AVIF

## ⚡ Performance-Optimierung

### Hardware-Beschleunigung
- **NVIDIA NVENC**: GPU-beschleunigte Kodierung
- **Intel Quick Sync**: Hardware-Kodierung
- **AMD VCE**: GPU-Unterstützung

### Preset-Optionen
- **ultrafast**: Schnellste Kodierung
- **fast**: Gute Balance
- **medium**: Standard (empfohlen)
- **slow**: Bessere Qualität
- **veryslow**: Beste Qualität

### Qualitäts-Einstellungen
- **CRF 18**: Sehr hohe Qualität
- **CRF 23**: Hohe Qualität (Standard)
- **CRF 28**: Mittlere Qualität
- **CRF 32**: Niedrige Qualität

## 🛡️ Sicherheit & Limits

### Datei-Limits
- **Maximale Dateigröße**: 500MB
- **Unterstützte Formate**: Whitelist-basiert
- **Upload-Verzeichnis**: Isoliert (`uploads/`)

### Sicherheitsmaßnahmen
- **Eingabe-Validierung**: Alle Parameter geprüft
- **Pfad-Traversal-Schutz**: Sichere Dateipfade
- **Temporäre Dateien**: Automatische Bereinigung
- **Fehlerbehandlung**: Robuste Error-Handling

## 🔧 Troubleshooting

### Häufige Probleme

#### FFmpeg nicht gefunden
```
❌ FFmpeg ist nicht verfügbar
```
**Lösung**: `setup-ffmpeg.bat` ausführen

#### Codec nicht unterstützt
```
❌ Unknown encoder 'libx264'
```
**Lösung**: FFmpeg neu installieren mit allen Codecs

#### Datei zu groß
```
❌ File size exceeds limit
```
**Lösung**: Datei komprimieren oder Limit erhöhen

#### Speicherplatz
```
❌ No space left on device
```
**Lösung**: Temporäre Dateien löschen (`/api/media/cleanup`)

### Debug-Modus
```javascript
// Detaillierte Ausgabe aktivieren
const result = await ffmpegService.convertVideo(
  'input.mp4',
  'output.mp4',
  { silent: false }
);
```

### Log-Dateien
- **FFmpeg-Logs**: Console-Ausgabe
- **API-Logs**: Express-Server-Logs
- **Error-Logs**: Fehlerbehandlung

## 📊 Monitoring

### Metriken
- **Verarbeitungszeit**: Pro Operation
- **Dateigröße**: Eingabe vs. Ausgabe
- **Erfolgsrate**: Prozentuale Erfolge
- **Ressourcenverbrauch**: CPU/Memory

### Status-Überwachung
```javascript
// Service-Status prüfen
const status = ffmpegService.checkAvailability();
console.log('FFmpeg verfügbar:', status);
```

## 🚀 Nächste Schritte

### Geplante Features
- **Batch-Upload**: Mehrere Dateien gleichzeitig
- **Progress-Tracking**: Echtzeit-Fortschritt
- **Cloud-Integration**: S3/Azure-Storage
- **Streaming**: Live-Video-Verarbeitung

### Integration-Möglichkeiten
- **AI-Services**: Automatische Untertitel
- **CDN**: Content-Delivery-Optimierung
- **Analytics**: Nutzungsstatistiken
- **Workflows**: Automatisierte Pipelines

## 📞 Support

Bei Problemen oder Fragen zur FFmpeg-Integration:

1. **Dokumentation prüfen**: Diese Datei und `STARTUP_GUIDE.md`
2. **Tests ausführen**: `test-ffmpeg.bat`
3. **Logs überprüfen**: Console-Ausgabe analysieren
4. **Community**: GitHub Issues oder Diskussionen

---

**Status**: ✅ Vollständig integriert und getestet  
**Version**: 1.0.0  
**Letzte Aktualisierung**: $(Get-Date -Format "yyyy-MM-dd")  
**Kompatibilität**: Windows 10/11, Node.js 16+