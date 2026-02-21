#!/usr/bin/env python3
"""
Start-Script für den AutoGen Desktop Analysis Agent Service.

Dieses Script startet den Frame Processor, der sich mit dem 
Desktop-Stream verbindet und Frames zur Analyse an das 
Multi-Agent-Team weiterleitet.

Zusätzlich startet es einen HTTP-Server auf Port 8008 für:
- /health - Health Check
- /api/v1/analyze-ocr - OCR-Text-Analyse

Usage:
    python run_agent_service.py [--websocket-url URL] [--interval SECONDS] [--mock] [--debug]

Beispiele:
    # Starte mit Standard-Konfiguration
    python run_agent_service.py

    # Starte mit Mock-Service (ohne OpenAI API)
    python run_agent_service.py --mock

    # Starte mit Custom-URL und Debug-Output
    python run_agent_service.py --websocket-url ws://localhost:8085 --debug

Umgebungsvariablen:
    OPENAI_API_KEY          - OpenAI API Key (erforderlich für echte Analyse)
    AUTOGEN_WEBSOCKET_URL   - WebSocket URL des Desktop-Streams
    AUTOGEN_ANALYSIS_INTERVAL - Analyse-Intervall in Sekunden
"""

import asyncio
import json
import logging
import os
import sys
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from autogen_service.config import get_config, AutoGenConfig
from autogen_service.frame_processor import FrameProcessor


# HTTP Server Port
HTTP_PORT = int(os.getenv("AUTOGEN_HTTP_PORT", "8008"))

# Banner
BANNER = """
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   🤖 AutoGen Desktop Analysis Agent Service                      ║
║                                                                  ║
║   Multi-Agent Team für automatische Desktop-Analyse              ║
║   - Vision Agent: UI-Element-Erkennung                           ║
║   - OCR Agent: Texterkennung                                     ║
║   - Coordinator: Report-Erstellung                               ║
║                                                                  ║
║   HTTP API: http://localhost:{port}                              ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
""".format(port=HTTP_PORT)


# ============================================================================
# FastAPI HTTP Server
# ============================================================================

app = FastAPI(
    title="AutoGen OCR Analysis Service",
    description="HTTP API für AutoGen Multi-Agent OCR-Analyse",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Models
class OCRCoordinates(BaseModel):
    x: float
    y: float
    width: float
    height: float

class OCRRegion(BaseModel):
    region_id: str
    region_label: str
    text: str
    confidence: float
    coordinates: OCRCoordinates
    monitor_id: str

class OCRAnalysisContext(BaseModel):
    workflowName: Optional[str] = None
    monitorSetup: Optional[str] = "single"
    analysisGoal: Optional[str] = None
    previousAnalysis: Optional[str] = None

class OCRAnalysisOptions(BaseModel):
    include_action_items: bool = True
    detect_patterns: bool = True
    categorize_text: bool = True
    max_processing_time_ms: int = 30000

class OCRAnalysisRequest(BaseModel):
    ocr_results: list[OCRRegion]
    context: Optional[OCRAnalysisContext] = None
    options: Optional[OCRAnalysisOptions] = None

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    timestamp: str
    model: str
    connected: bool

# Global state
_config: Optional[AutoGenConfig] = None
_use_mock: bool = False


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health Check Endpoint."""
    global _config
    return HealthResponse(
        status="healthy",
        service="autogen-ocr-service",
        version="1.0.0",
        timestamp=datetime.now().isoformat(),
        model=_config.model_name if _config else "unknown",
        connected=True
    )


@app.post("/api/v1/analyze-ocr")
async def analyze_ocr(request: OCRAnalysisRequest):
    """
    Analysiert OCR-Ergebnisse mit AutoGen Multi-Agent System.
    
    Verwendet das konfigurierte LLM (OpenRouter/OpenAI) für semantische Analyse.
    """
    global _config, _use_mock
    
    start_time = datetime.now()
    
    try:
        # Sammle alle Texte
        texts = []
        for region in request.ocr_results:
            texts.append({
                "region": region.region_label,
                "text": region.text,
                "confidence": region.confidence
            })
        
        if not texts:
            raise HTTPException(status_code=400, detail="Keine OCR-Ergebnisse vorhanden")
        
        # In Mock-Modus: Einfache Zusammenfassung
        if _use_mock:
            analysis = {
                "summary": f"Mock-Analyse von {len(texts)} Regionen",
                "insights": [f"Region '{t['region']}' enthält Text" for t in texts[:3]],
                "action_items": ["Dies ist eine Mock-Analyse"],
                "patterns": [],
                "categories": []
            }
        else:
            # Echte Analyse mit OpenRouter/OpenAI
            try:
                import openai
                
                client = openai.OpenAI(
                    api_key=_config.openai_api_key,
                    base_url=_config.api_base_url
                )
                
                # Prompt für Analyse
                prompt = f"""Analysiere die folgenden OCR-extrahierten Texte von einem Desktop-Screenshot:

{json.dumps(texts, indent=2, ensure_ascii=False)}

Erstelle eine strukturierte Analyse mit:
1. summary: Kurze Zusammenfassung des Inhalts
2. insights: Liste von wichtigen Erkenntnissen
3. action_items: Mögliche Aktionen basierend auf dem Inhalt
4. patterns: Erkannte Muster (Typ, Beschreibung, Konfidenz)
5. categories: Semantische Kategorien mit zugehörigen Items

Antworte im JSON-Format."""

                response = client.chat.completions.create(
                    model=_config.model_name,
                    messages=[
                        {"role": "system", "content": "Du bist ein Experte für Desktop-UI-Analyse und OCR-Ergebnisinterpretation."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3,
                    max_tokens=2000
                )
                
                # Parse Response
                response_text = response.choices[0].message.content
                
                # Versuche JSON zu extrahieren
                try:
                    # Falls in Markdown-Codeblock
                    if "```json" in response_text:
                        json_str = response_text.split("```json")[1].split("```")[0]
                    elif "```" in response_text:
                        json_str = response_text.split("```")[1].split("```")[0]
                    else:
                        json_str = response_text
                    
                    analysis = json.loads(json_str)
                except json.JSONDecodeError:
                    # Fallback: Strukturierte Response erstellen
                    analysis = {
                        "summary": response_text[:200],
                        "insights": [response_text[:500]],
                        "action_items": [],
                        "patterns": [],
                        "categories": []
                    }
                    
            except Exception as e:
                logging.error(f"LLM-Analyse fehlgeschlagen: {e}")
                analysis = {
                    "summary": f"Analyse fehlgeschlagen: {str(e)}",
                    "insights": [],
                    "action_items": [],
                    "patterns": [],
                    "categories": []
                }
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return {
            "success": True,
            "analysis": analysis,
            "agents_involved": ["ocr_specialist", "analysis_coordinator"],
            "processing_time_ms": processing_time,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"OCR-Analyse Fehler: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def run_http_server():
    """Startet den HTTP-Server in einem separaten Thread."""
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=HTTP_PORT,
        log_level="info"
    )


# ============================================================================
# Analysis Result Handler
# ============================================================================

class AnalysisResultHandler:
    """Handler für Analyse-Ergebnisse mit Logging und optionaler Speicherung."""
    
    def __init__(self, output_dir: str = "analysis_results"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        self.results_count = 0
        
    def handle_result(self, result: dict[str, Any]) -> None:
        """
        Verarbeitet ein Analyse-Ergebnis.
        
        Args:
            result: Analyseergebnis vom Agent-Team
        """
        self.results_count += 1
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        monitor_id = result.get("monitor_id", "unknown")
        status = result.get("status", "unknown")
        
        # Konsolenausgabe
        print(f"\n{'='*70}")
        print(f"📊 Analyse #{self.results_count} - {monitor_id}")
        print(f"   Status: {'✅' if status == 'success' else '❌'} {status}")
        print(f"   Zeit: {timestamp}")
        
        if status == "success":
            analysis = result.get("analysis", {})
            if isinstance(analysis, dict):
                summary = analysis.get("summary", "Keine Zusammenfassung")
                print(f"   Zusammenfassung: {summary}")
                
                key_findings = analysis.get("key_findings", [])
                if key_findings:
                    print(f"   Erkenntnisse:")
                    for finding in key_findings[:3]:
                        print(f"      • {finding}")
            else:
                print(f"   Analyse: {str(analysis)[:200]}...")
        else:
            error = result.get("error", "Unbekannter Fehler")
            print(f"   Fehler: {error}")
        
        print(f"{'='*70}\n")
        
        # Optional: Ergebnis speichern
        self._save_result(result, timestamp, monitor_id)
    
    def _save_result(
        self, 
        result: dict[str, Any], 
        timestamp: str, 
        monitor_id: str
    ) -> None:
        """Speichert Ergebnis als JSON-Datei."""
        try:
            filename = f"analysis_{timestamp}_{monitor_id}.json"
            filepath = self.output_dir / filename
            
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(result, f, indent=2, ensure_ascii=False, default=str)
                
            logging.debug(f"Ergebnis gespeichert: {filepath}")
        except Exception as e:
            logging.error(f"Fehler beim Speichern des Ergebnisses: {e}")


def setup_logging(debug: bool = False) -> None:
    """Konfiguriert das Logging."""
    log_level = logging.DEBUG if debug else logging.INFO
    
    # Formatierung
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"
    
    # Konsolen-Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(logging.Formatter(log_format, date_format))
    
    # Root-Logger konfigurieren
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_logger.addHandler(console_handler)
    
    # Reduziere Verbosity von externen Bibliotheken
    logging.getLogger("websockets").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)


def print_config(config: AutoGenConfig) -> None:
    """Gibt die aktuelle Konfiguration aus."""
    print("\n📋 Konfiguration:")
    print(f"   WebSocket URL: {config.websocket_url}")
    print(f"   Model: {config.model_name}")
    print(f"   Analyse-Intervall: {config.analysis_interval}s")
    print(f"   Max Queue Size: {config.max_queue_size}")
    print(f"   Max Concurrent: {config.max_concurrent_analyses}")
    
    # API Key Status (ohne den Key zu zeigen)
    api_key_status = "✅ Gesetzt" if config.openai_api_key else "❌ Nicht gesetzt"
    print(f"   OpenAI API Key: {api_key_status}")
    print()


async def run_service(
    websocket_url: str | None = None,
    interval: float = 5.0,
    use_mock: bool = False,
    debug: bool = False
) -> None:
    """
    Hauptfunktion zum Starten des Agent Service.
    
    Args:
        websocket_url: Optionale WebSocket-URL
        interval: Analyse-Intervall in Sekunden
        use_mock: Wenn True, wird der Mock-Service verwendet
        debug: Wenn True, wird Debug-Logging aktiviert
    """
    # Logging einrichten
    setup_logging(debug)
    logger = logging.getLogger(__name__)
    
    # Banner anzeigen
    print(BANNER)
    
    # Konfiguration erstellen
    try:
        config = get_config()
    except ValueError as e:
        if use_mock:
            # Bei Mock können wir auch ohne API Key starten
            config = AutoGenConfig()
            config.openai_api_key = "mock-key"
        else:
            print(f"\n❌ Konfigurationsfehler: {e}")
            print("   Setze OPENAI_API_KEY oder starte mit --mock")
            sys.exit(1)
    
    # Konfiguration überschreiben
    if websocket_url:
        config.websocket_url = websocket_url
    config.analysis_interval = interval
    
    # Konfiguration anzeigen
    print_config(config)
    
    # Result Handler erstellen
    result_handler = AnalysisResultHandler()
    
    # Frame Processor erstellen
    print("🚀 Starte AutoGen Agent Service...")
    
    processor = FrameProcessor(
        config=config,
        on_analysis_complete=result_handler.handle_result,
        use_mock_service=use_mock
    )
    
    if use_mock:
        print("⚠️  MOCK-MODUS: Analysen werden simuliert (keine echte KI)")
    
    print("📡 Verbinde mit Desktop-Stream...")
    print("   Drücke Ctrl+C zum Beenden\n")
    
    try:
        await processor.connect_and_process()
    except KeyboardInterrupt:
        logger.info("Service durch Benutzer unterbrochen")
    except Exception as e:
        logger.error(f"Service-Fehler: {e}")
        raise
    finally:
        print("\n🛑 Beende Service...")
        await processor.stop()
        
        # Statistiken anzeigen
        stats = processor.get_stats()
        print("\n📊 Finale Statistiken:")
        print(f"   Frames empfangen: {stats['processor']['frames_received']}")
        print(f"   Frames analysiert: {stats['processor']['frames_analyzed']}")
        print(f"   Analyse-Fehler: {stats['processor']['analysis_errors']}")
        print(f"   Ergebnisse gespeichert: {result_handler.results_count}")
        print("\n👋 Service beendet")


def main() -> None:
    """Einstiegspunkt für das Script."""
    global _config, _use_mock
    import argparse
    
    parser = argparse.ArgumentParser(
        description="AutoGen Desktop Analysis Agent Service",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Beispiele:
  %(prog)s                           Starte mit Standard-Konfiguration
  %(prog)s --mock                    Starte im Mock-Modus (ohne OpenAI)
  %(prog)s --interval 10             Analysiere alle 10 Sekunden
  %(prog)s --debug                   Aktiviere Debug-Logging
  
Umgebungsvariablen:
  OPENAI_API_KEY                     OpenAI API Key (erforderlich)
  AUTOGEN_WEBSOCKET_URL              WebSocket URL des Desktop-Streams
  AUTOGEN_ANALYSIS_INTERVAL          Standard-Analyse-Intervall
        """
    )
    
    parser.add_argument(
        "--websocket-url",
        type=str,
        default=None,
        help="WebSocket-URL des Desktop-Streams"
    )
    
    parser.add_argument(
        "--interval",
        type=float,
        default=5.0,
        help="Analyse-Intervall in Sekunden (Standard: 5.0)"
    )
    
    parser.add_argument(
        "--mock",
        action="store_true",
        help="Mock-Service verwenden (ohne echte KI-Analyse)"
    )
    
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Debug-Logging aktivieren"
    )
    
    args = parser.parse_args()
    
    # Globale Config setzen für HTTP-Server
    _use_mock = args.mock
    try:
        _config = get_config()
    except ValueError:
        if args.mock:
            _config = AutoGenConfig()
            _config.openai_api_key = "mock-key"
        else:
            _config = AutoGenConfig()
    
    # HTTP Server im Daemon-Thread starten
    http_thread = threading.Thread(target=run_http_server, daemon=True)
    http_thread.start()
    print(f"🌐 HTTP API gestartet auf Port {HTTP_PORT}")
    
    # Service starten
    try:
        asyncio.run(run_service(
            websocket_url=args.websocket_url,
            interval=args.interval,
            use_mock=args.mock,
            debug=args.debug
        ))
    except KeyboardInterrupt:
        print("\n⛔ Unterbrochen")
    except Exception as e:
        print(f"\n💥 Kritischer Fehler: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()