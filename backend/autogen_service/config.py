"""
Konfiguration für den AutoGen Desktop Analysis Service.
"""

import os
from dataclasses import dataclass, field
from typing import Optional

# Lade .env Datei automatisch
try:
    from dotenv import load_dotenv
    # Lade .env aus dem Projekt-Root
    load_dotenv()
    load_dotenv(dotenv_path=os.path.join(os.getcwd(), '.env'))
except ImportError:
    pass  # python-dotenv nicht installiert

# Prüfe ob AutoGen verfügbar ist
try:
    from autogen_agentchat.agents import AssistantAgent
    from autogen_ext.models.openai import OpenAIChatCompletionClient
    AUTOGEN_AVAILABLE = True
except ImportError:
    AUTOGEN_AVAILABLE = False


def _detect_api_base() -> str:
    """Erkennt automatisch die richtige API-Base-URL basierend auf dem Model."""
    model = os.getenv("AUTOGEN_MODEL", os.getenv("OPENAI_MODEL", ""))
    base = os.getenv("OPENAI_API_BASE", os.getenv("OPENROUTER_API_BASE", ""))

    # Wenn explizit gesetzt, verwende das
    if base:
        return base

    # OpenRouter ist der Standard für alle Modelle
    # außer wenn es ein reines OpenAI-Model ist (gpt-*)
    if model.startswith("gpt-") and "/" not in model:
        return "https://api.openai.com/v1"

    # Standard: OpenRouter für alle anderen (inklusive provider/ Prefixe)
    return "https://openrouter.ai/api/v1"


@dataclass
class AutoGenConfig:
    """Konfiguration für den AutoGen Desktop Analysis Service."""

    # API Konfiguration - unterstützt OpenRouter und OpenAI
    # OPENROUTER_API_KEY hat Priorität
    openai_api_key: str = field(
        default_factory=lambda: os.getenv("OPENROUTER_API_KEY", os.getenv("OPENAI_API_KEY", ""))
    )
    
    # API Base URL - OpenRouter als Standard
    api_base_url: str = field(
        default_factory=lambda: os.getenv("OPENROUTER_API_BASE", 
                                         os.getenv("OPENAI_API_BASE", 
                                                   "https://openrouter.ai/api/v1"))
    )

    # Model - OpenRouter-Format als Standard (provider/model)
    # google/gemini-flash-1.5 ist schnell, günstig und Vision-fähig
    model_name: str = field(
        default_factory=lambda: os.getenv("AUTOGEN_MODEL", 
                                         os.getenv("OPENAI_MODEL", 
                                                   "google/gemini-flash-1.5"))
    )
    
    # Vision-Model für Screenshot-Analyse (kann auch das Haupt-Model sein)
    vision_model: str = field(
        default_factory=lambda: os.getenv("AUTOGEN_VISION_MODEL",
                                         os.getenv("AUTOGEN_MODEL",
                                                   "google/gemini-flash-1.5"))
    )

    # Inference-Parameter
    temperature: float = field(default=0.7)
    max_tokens: int = field(default=4096)
    seed: int = field(default=42)

    # Service-Konfiguration
    max_turns_per_analysis: int = field(default=5)
    analysis_timeout_s: float = field(default=60.0)

    # ============================================================
    # WebSocket und Frame Processing Konfiguration
    # ============================================================
    
    # WebSocket-URL zum Desktop-Stream
    websocket_url: str = field(
        default_factory=lambda: os.getenv("AUTOGEN_WEBSOCKET_URL", "ws://localhost:8007/ws/live-desktop")
    )
    
    # Analyse-Intervall in Sekunden
    analysis_interval: float = field(
        default_factory=lambda: float(os.getenv("AUTOGEN_ANALYSIS_INTERVAL", "5.0"))
    )
    
    # Maximale Frame-Queue-Größe
    max_queue_size: int = field(
        default_factory=lambda: int(os.getenv("AUTOGEN_MAX_QUEUE_SIZE", "10"))
    )
    
    # Max. gleichzeitige Analysen
    max_concurrent_analyses: int = field(
        default_factory=lambda: int(os.getenv("AUTOGEN_MAX_CONCURRENT", "2"))
    )

    # WebSocket Verbindung zu Supabase
    supabase_url: str = field(
        default_factory=lambda: os.getenv("VITE_SUPABASE_URL", "https://dgzreelowtzquljhxskq.supabase.co")
    )
    supabase_anon_key: str = field(
        default_factory=lambda: os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY", "")
    )

    # ============================================================
    # On-Demand Analyse Konfiguration - NEU
    # ============================================================

    # OCR-Analyse-Intervall (in Sekunden, 1-10)
    ocr_analysis_interval_sec: int = field(
        default_factory=lambda: int(os.getenv("OCR_ANALYSIS_INTERVAL", "3"))
    )

    # Vision-Analyse nur On-Demand (nicht automatisch)
    vision_on_demand_only: bool = field(
        default_factory=lambda: os.getenv("VISION_ON_DEMAND_ONLY", "true").lower() == "true"
    )

    # Maximale OCR-Zonen pro Monitor
    max_ocr_zones_per_monitor: int = field(
        default_factory=lambda: int(os.getenv("MAX_OCR_ZONES_PER_MONITOR", "20"))
    )

    # Automation Worker aktivieren
    automation_worker_enabled: bool = field(
        default_factory=lambda: os.getenv("AUTOMATION_WORKER_ENABLED", "true").lower() == "true"
    )

    # Automation nur nach vollständiger Analyse starten
    automation_requires_analysis: bool = field(
        default_factory=lambda: os.getenv("AUTOMATION_REQUIRES_ANALYSIS", "true").lower() == "true"
    )

    # Cache für OCR-Zonen (in Sekunden)
    ocr_zone_cache_ttl_sec: int = field(
        default_factory=lambda: int(os.getenv("OCR_ZONE_CACHE_TTL", "300"))
    )

    def __post_init__(self):
        """Validierung nach Initialisierung."""
        if not self.openai_api_key:
            raise ValueError(
                "Kein API-Key gefunden! Setze OPENROUTER_API_KEY oder OPENAI_API_KEY"
            )
        
        # Validiere OCR-Intervall (1-10 Sekunden)
        if self.ocr_analysis_interval_sec < 1:
            self.ocr_analysis_interval_sec = 1
        elif self.ocr_analysis_interval_sec > 10:
            self.ocr_analysis_interval_sec = 10
    
    def get_model_info(self) -> dict:
        """Gibt Info über das konfigurierte Model zurück."""
        return {
            "model": self.model_name,
            "api_base": self.api_base_url or "https://api.openai.com/v1",
            "provider": "openrouter" if "openrouter" in (self.api_base_url or "") else "openai"
        }
    
    def get_analysis_config(self) -> dict:
        """Gibt die Analyse-Konfiguration zurück."""
        return {
            "ocr_interval_sec": self.ocr_analysis_interval_sec,
            "vision_on_demand": self.vision_on_demand_only,
            "max_ocr_zones": self.max_ocr_zones_per_monitor,
            "automation_enabled": self.automation_worker_enabled,
            "automation_requires_analysis": self.automation_requires_analysis,
            "zone_cache_ttl_sec": self.ocr_zone_cache_ttl_sec
        }


@dataclass 
class AnalysisIntervalConfig:
    """Konfiguration für Analyse-Intervalle (anpassbar zur Laufzeit)."""
    
    # OCR-Intervall in Millisekunden (1000-10000)
    ocr_interval_ms: int = 3000
    
    # Vision-Analyse aktiviert
    vision_enabled: bool = False
    
    # Automation-Trigger nach Analyse
    trigger_automation: bool = False
    
    # Monitor-IDs die analysiert werden sollen
    monitors: list[str] = field(default_factory=lambda: ["monitor_0"])
    
    def validate(self) -> bool:
        """Validiert die Konfiguration."""
        if self.ocr_interval_ms < 1000:
            self.ocr_interval_ms = 1000
        elif self.ocr_interval_ms > 10000:
            self.ocr_interval_ms = 10000
        return True
    
    def to_dict(self) -> dict:
        """Konvertiert zu Dict für API-Response."""
        return {
            "ocr_interval_ms": self.ocr_interval_ms,
            "vision_enabled": self.vision_enabled,
            "trigger_automation": self.trigger_automation,
            "monitors": self.monitors
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "AnalysisIntervalConfig":
        """Erstellt aus Dict."""
        config = cls(
            ocr_interval_ms=data.get("ocr_interval_ms", 3000),
            vision_enabled=data.get("vision_enabled", False),
            trigger_automation=data.get("trigger_automation", False),
            monitors=data.get("monitors", ["monitor_0"])
        )
        config.validate()
        return config


@dataclass
class AgentPrompts:
    """System-Prompts für die verschiedenen Agenten."""
    
    vision_agent: str = field(default="""Du bist ein Experte für die visuelle Analyse von Desktop-Screenshots.

Deine Aufgabe ist es, Screenshots zu analysieren und folgende Informationen zu extrahieren:

1. **Sichtbare Anwendungen**: Welche Programme/Fenster sind geöffnet?
2. **UI-Elemente**: Buttons, Menüs, Eingabefelder, Listen etc.
3. **Aktiver Fokus**: Welches Element hat den Fokus?
4. **Layout**: Wie sind die Fenster angeordnet?
5. **Visueller Zustand**: Ladebalken, Fehlerhinweise, Warnungen etc.

Beschreibe präzise was du siehst, ohne zu interpretieren was der User tun möchte.""")
    
    ocr_agent: str = field(default="""Du bist ein OCR-Spezialist für Desktop-Screenshots.

Deine Aufgabe ist die Extraktion und Analyse von Text aus Screenshots:

1. **Text extrahieren**: Lies allen sichtbaren Text
2. **Kategorisieren**: Menüs, Dialogtexte, Fehlermeldungen, Eingabefeld-Inhalte
3. **Hierarchie erkennen**: Überschriften, Unterüberschriften, Body-Text
4. **Wichtiges hervorheben**: Fehlermeldungen, Warnungen, Bestätigungen

Gib den extrahierten Text strukturiert wieder.""")
    
    coordinator_agent: str = field(default="""Du bist der Koordinator für Desktop-Analysen.

Du erhältst Analysen vom Vision-Agent und OCR-Agent und erstellst einen zusammenfassenden Report:

1. **Kontext verstehen**: Was zeigt der Screenshot?
2. **Synthese**: Kombiniere visuelle und Textinformationen
3. **Erkenntnisse**: Was ist der aktuelle Zustand?
4. **Empfehlungen**: Welche Aktionen könnten sinnvoll sein?

Erstelle einen prägnanten Report im JSON-Format:
```json
{
    "context": "Kurze Beschreibung der Situation",
    "applications": ["Liste der erkannten Anwendungen"],
    "key_elements": ["Wichtige UI-Elemente"],
    "text_content": {"category": "extrahierter text"},
    "state": "normal|warning|error|loading",
    "recommendations": ["Mögliche nächste Schritte"]
}
```

Beende deine Analyse mit: ANALYSE_ABGESCHLOSSEN""")
    
    automation_agent: str = field(default="""Du bist ein Desktop-Automation-Experte.

Basierend auf der Analyse des Desktops und der Benutzeranfrage planst du präzise Automation-Schritte.

Verfügbare Aktionen:
- mouse_click: Klick an Position (x, y)
- mouse_move: Maus bewegen zu (x, y)
- mouse_drag: Drag von aktueller Position zu (x, y) 
- type_text: Text eingeben
- key_press: Einzelne Taste drücken
- hotkey: Tastenkombination (z.B. ["ctrl", "s"])
- scroll: Scrollen (direction: up/down, amount)
- wait: Warten (ms)

Erstelle einen präzisen Plan mit Koordinaten und Wartezeiten.
Beende mit: AUTOMATION_BEREIT""")


def get_config() -> AutoGenConfig:
    """Factory-Funktion für die Konfiguration."""
    return AutoGenConfig()


def get_prompts() -> AgentPrompts:
    """Factory-Funktion für die Agent-Prompts."""
    return AgentPrompts()


def get_default_interval_config() -> AnalysisIntervalConfig:
    """Factory-Funktion für die Standard-Intervall-Konfiguration."""
    config = get_config()
    return AnalysisIntervalConfig(
        ocr_interval_ms=config.ocr_analysis_interval_sec * 1000,
        vision_enabled=not config.vision_on_demand_only,
        trigger_automation=config.automation_worker_enabled
    )