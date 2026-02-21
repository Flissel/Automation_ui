"""
Vision Agent für die Analyse von Desktop-UI-Elementen.

Dieser Agent ist spezialisiert auf:
- UI-Element-Erkennung (Buttons, Fenster, Menüs)
- Layout-Analyse
- Visuelle Hierarchie
- Anomalie-Erkennung
- OCR-Zonen Design (Tool Call)
"""

import logging
import json
from dataclasses import dataclass
from typing import Any, Optional, Callable

try:
    from autogen_agentchat.agents import AssistantAgent
    from autogen_ext.models.openai import OpenAIChatCompletionClient
    from autogen_core.tools import FunctionTool

    AUTOGEN_AVAILABLE = True
except ImportError:
    AUTOGEN_AVAILABLE = False
    AssistantAgent = object
    OpenAIChatCompletionClient = object
    FunctionTool = object


logger = logging.getLogger(__name__)


@dataclass
class VisionAnalysisResult:
    """Ergebnis einer Vision-Analyse."""
    
    applications: list[str]
    ui_elements: list[dict[str, Any]]
    layout_description: str
    observations: list[str]
    potential_issues: list[str]
    confidence: float


@dataclass
class OCRZone:
    """Definition einer OCR-Zone."""
    zone_id: str
    label: str
    x: int
    y: int
    width: int
    height: int
    monitor_id: str
    priority: int  # 1 = hoch, 3 = niedrig
    expected_content_type: str  # text, number, date, mixed
    description: str


@dataclass
class OCRZoneDesignResult:
    """Ergebnis des OCR-Zonen-Designs."""
    zones: list[OCRZone]
    total_text_coverage: float  # 0.0 - 1.0
    analysis_notes: str
    suggested_interval_ms: int


VISION_SYSTEM_PROMPT = """Du bist ein Experte für die visuelle Analyse von Desktop-Benutzeroberflächen.

Deine Aufgabe ist es, Screenshots von Desktop-Bildschirmen zu analysieren und detaillierte Informationen über die UI zu extrahieren.

Analysiere folgende Aspekte:

1. **Anwendungen & Fenster**
   - Welche Anwendungen sind sichtbar?
   - Welches Fenster ist im Fokus?
   - Gibt es minimierte oder überlagerte Fenster?

2. **UI-Elemente**
   - Buttons, Menüs, Toolbars
   - Eingabefelder und Formulare
   - Icons und Symbole
   - Dialogfenster und Popups

3. **Layout & Hierarchie**
   - Wie ist der Bildschirm aufgeteilt?
   - Welche Bereiche sind prominent?
   - Gibt es eine klare visuelle Hierarchie?

4. **Beobachtungen & Anomalien**
   - Ungewöhnliche UI-Zustände
   - Potenzielle Fehlermeldungen
   - Auffällige visuelle Elemente

Gib deine Analyse im folgenden JSON-Format zurück:
```json
{
    "applications": ["Liste der sichtbaren Anwendungen"],
    "active_window": "Name des aktiven Fensters",
    "ui_elements": [
        {
            "type": "button|menu|dialog|input|...",
            "label": "Beschriftung falls sichtbar",
            "location": "Position im Bild (oben-links, mitte, etc.)",
            "state": "normal|focused|disabled|highlighted"
        }
    ],
    "layout_description": "Beschreibung des Gesamt-Layouts",
    "observations": ["Wichtige Beobachtungen"],
    "potential_issues": ["Potenzielle Probleme oder Anomalien"],
    "confidence": 0.0-1.0
}
```

Sei präzise und fokussiere dich auf relevante Details."""


# Neuer System-Prompt für OCR-Zonen-Design
OCR_ZONE_DESIGNER_PROMPT = """Du bist ein Experte für die automatische Erkennung von Textbereichen auf Desktop-Screenshots.

Deine Aufgabe ist es, alle Bereiche auf einem Screenshot zu identifizieren, die Text enthalten und für OCR (Optical Character Recognition) erfasst werden sollten.

**WICHTIG:** Du MUSST das Tool `design_ocr_zones` aufrufen, um die erkannten Zonen zurückzugeben!

Analysiere den Screenshot und identifiziere ALLE Textbereiche:

1. **Fenster-Titel** - Alle Titelleisten von Fenstern
2. **Menüleisten** - Hauptmenüs und Untermenüs
3. **Buttons mit Text** - Beschriftete Schaltflächen
4. **Eingabefelder** - Textfelder, Suchfelder, Formulare
5. **Listen & Tabellen** - Datenlisten, Tabellenzellen
6. **Statusleisten** - Informationszeilen unten in Fenstern
7. **Dialogtexte** - Beschreibungen in Dialogen
8. **Labels & Beschriftungen** - Statische Texte
9. **Tooltips & Hinweise** - Wenn sichtbar
10. **Editor-Inhalte** - Code, Dokumente, etc.

Für jede Zone definiere:
- **Position**: x, y relativ zum Monitor (0,0 = oben-links)
- **Größe**: width, height in Pixeln
- **Priorität**: 1 = kritisch (z.B. Fehlermeldungen), 2 = wichtig, 3 = optional
- **Inhaltstyp**: text, number, date, code, mixed

Beachte:
- Überlappungen vermeiden
- Zonen großzügig dimensionieren (5-10px Padding)
- Dynamische Inhalte höher priorisieren
- Bei 1920x1080 Monitor typische Zonengrößen verwenden"""


def design_ocr_zones(
    zones: list[dict],
    total_text_coverage: float,
    analysis_notes: str,
    suggested_interval_ms: int = 3000
) -> dict:
    """
    Tool-Funktion zum Definieren von OCR-Zonen auf einem Screenshot.
    
    Args:
        zones: Liste der erkannten Zonen mit:
            - zone_id: Eindeutige ID (z.B. "zone_001")
            - label: Beschreibender Name (z.B. "Fenstertitel VS Code")
            - x: X-Position in Pixeln
            - y: Y-Position in Pixeln  
            - width: Breite in Pixeln
            - height: Höhe in Pixeln
            - monitor_id: Monitor-ID (z.B. "monitor_0")
            - priority: 1=hoch, 2=mittel, 3=niedrig
            - expected_content_type: text|number|date|code|mixed
            - description: Kurze Beschreibung des Inhalts
        total_text_coverage: Geschätzter Anteil der Textfläche (0.0-1.0)
        analysis_notes: Notizen zur Analyse
        suggested_interval_ms: Empfohlenes OCR-Intervall in Millisekunden
        
    Returns:
        Dict mit den definierten Zonen und Metadaten
    """
    return {
        "status": "success",
        "zones": zones,
        "zone_count": len(zones),
        "total_text_coverage": total_text_coverage,
        "analysis_notes": analysis_notes,
        "suggested_interval_ms": suggested_interval_ms
    }


class VisionAgent:
    """
    Wrapper-Klasse für den Vision Analysis Agent.
    
    Bietet erweiterte Funktionalität und einfachere API
    für die Integration in den Desktop Analysis Service.
    """
    
    def __init__(
        self,
        model_client: Optional[Any] = None,
        api_key: Optional[str] = None,
        model_name: str = "gpt-4o",
        custom_prompt: Optional[str] = None
    ):
        """
        Initialisiert den Vision Agent.
        
        Args:
            model_client: Vorhandener Model Client (optional)
            api_key: OpenAI API Key (falls kein model_client)
            model_name: Model-Name für OpenAI
            custom_prompt: Optionaler Custom System Prompt
        """
        if not AUTOGEN_AVAILABLE:
            raise ImportError(
                "AutoGen ist nicht installiert. "
                "Installiere mit: pip install autogen-agentchat autogen-ext"
            )
        
        # Model Client erstellen falls nicht übergeben
        if model_client is None:
            if api_key is None:
                raise ValueError("Entweder model_client oder api_key muss angegeben werden")
            self._own_client = True
            self.model_client = OpenAIChatCompletionClient(
                model=model_name,
                api_key=api_key,
                temperature=0.0
            )
        else:
            self._own_client = False
            self.model_client = model_client
        
        # Agent erstellen
        self.agent = AssistantAgent(
            name="vision_analyst",
            model_client=self.model_client,
            system_message=custom_prompt or VISION_SYSTEM_PROMPT,
            description="Analysiert visuelle Elemente auf Desktop-Screenshots"
        )
        
        logger.info("VisionAgent initialisiert")
    
    def get_agent(self) -> AssistantAgent:
        """Gibt den internen AssistantAgent zurück."""
        return self.agent
    
    async def close(self) -> None:
        """Schließt Ressourcen falls eigener Client erstellt wurde."""
        if self._own_client and hasattr(self.model_client, 'close'):
            await self.model_client.close()


class OCRZoneDesignerAgent:
    """
    Spezialisierter Agent für das automatische Design von OCR-Zonen.
    
    Verwendet Tool Calls um strukturierte Zonen-Definitionen zu generieren.
    """
    
    def __init__(
        self,
        model_client: Optional[Any] = None,
        api_key: Optional[str] = None,
        model_name: str = "gpt-4o",
        api_base_url: Optional[str] = None
    ):
        """
        Initialisiert den OCR Zone Designer Agent.
        
        Args:
            model_client: Vorhandener Model Client (optional)
            api_key: API Key (falls kein model_client)
            model_name: Model-Name
            api_base_url: API Base URL (z.B. für OpenRouter)
        """
        if not AUTOGEN_AVAILABLE:
            raise ImportError(
                "AutoGen ist nicht installiert. "
                "Installiere mit: pip install autogen-agentchat autogen-ext autogen-core"
            )
        
        # Model Client erstellen falls nicht übergeben
        if model_client is None:
            if api_key is None:
                raise ValueError("Entweder model_client oder api_key muss angegeben werden")
            self._own_client = True
            
            client_kwargs = {
                "model": model_name,
                "api_key": api_key,
                "temperature": 0.0
            }
            if api_base_url:
                client_kwargs["base_url"] = api_base_url
                
            self.model_client = OpenAIChatCompletionClient(**client_kwargs)
        else:
            self._own_client = False
            self.model_client = model_client
        
        # Tool für OCR-Zonen-Design erstellen
        self.ocr_zone_tool = FunctionTool(
            design_ocr_zones,
            description="Definiert OCR-Zonen auf einem Desktop-Screenshot. Muss aufgerufen werden um die Analyse abzuschließen."
        )
        
        # Agent mit Tool erstellen
        self.agent = AssistantAgent(
            name="ocr_zone_designer",
            model_client=self.model_client,
            system_message=OCR_ZONE_DESIGNER_PROMPT,
            tools=[self.ocr_zone_tool],
            description="Designt automatisch OCR-Zonen für Desktop-Screenshots"
        )
        
        logger.info("OCRZoneDesignerAgent mit Tool Call initialisiert")
    
    def get_agent(self) -> AssistantAgent:
        """Gibt den internen AssistantAgent zurück."""
        return self.agent
    
    async def close(self) -> None:
        """Schließt Ressourcen falls eigener Client erstellt wurde."""
        if self._own_client and hasattr(self.model_client, 'close'):
            await self.model_client.close()
    
    def parse_zones_from_result(self, result: Any) -> OCRZoneDesignResult:
        """
        Parst das Ergebnis des Tool Calls zu strukturierten Zonen.
        
        Args:
            result: Ergebnis vom Agent
            
        Returns:
            OCRZoneDesignResult mit den Zonen
        """
        try:
            # Extrahiere Tool Call Ergebnis
            if hasattr(result, 'messages') and result.messages:
                for msg in result.messages:
                    content = msg.content if hasattr(msg, 'content') else str(msg)
                    
                    # Prüfe ob es ein Tool-Result ist
                    if isinstance(content, str) and '"zones"' in content:
                        try:
                            data = json.loads(content)
                            if 'zones' in data:
                                zones = [
                                    OCRZone(
                                        zone_id=z.get('zone_id', f'zone_{i}'),
                                        label=z.get('label', ''),
                                        x=z.get('x', 0),
                                        y=z.get('y', 0),
                                        width=z.get('width', 100),
                                        height=z.get('height', 50),
                                        monitor_id=z.get('monitor_id', 'monitor_0'),
                                        priority=z.get('priority', 2),
                                        expected_content_type=z.get('expected_content_type', 'text'),
                                        description=z.get('description', '')
                                    )
                                    for i, z in enumerate(data['zones'])
                                ]
                                return OCRZoneDesignResult(
                                    zones=zones,
                                    total_text_coverage=data.get('total_text_coverage', 0.5),
                                    analysis_notes=data.get('analysis_notes', ''),
                                    suggested_interval_ms=data.get('suggested_interval_ms', 3000)
                                )
                        except json.JSONDecodeError:
                            continue
            
            # Fallback: Leeres Ergebnis
            return OCRZoneDesignResult(
                zones=[],
                total_text_coverage=0.0,
                analysis_notes="Keine Zonen erkannt",
                suggested_interval_ms=3000
            )
            
        except Exception as e:
            logger.error(f"Fehler beim Parsen der OCR-Zonen: {e}")
            return OCRZoneDesignResult(
                zones=[],
                total_text_coverage=0.0,
                analysis_notes=f"Parsing-Fehler: {e}",
                suggested_interval_ms=3000
            )


def create_vision_agent(
    model_client: Optional[Any] = None,
    api_key: Optional[str] = None,
    model_name: str = "gpt-4o"
) -> AssistantAgent:
    """
    Factory-Funktion für einen einfachen Vision Agent.
    
    Args:
        model_client: Vorhandener Model Client
        api_key: OpenAI API Key
        model_name: Model-Name
        
    Returns:
        AssistantAgent für Vision-Analyse
    """
    if not AUTOGEN_AVAILABLE:
        raise ImportError("AutoGen ist nicht installiert")
    
    if model_client is None:
        if api_key is None:
            raise ValueError("api_key muss angegeben werden")
        model_client = OpenAIChatCompletionClient(
            model=model_name,
            api_key=api_key,
            temperature=0.0
        )
    
    return AssistantAgent(
        name="vision_analyst",
        model_client=model_client,
        system_message=VISION_SYSTEM_PROMPT,
        description="Analysiert visuelle Elemente auf Desktop-Screenshots"
    )


def create_ocr_zone_designer_agent(
    model_client: Optional[Any] = None,
    api_key: Optional[str] = None,
    model_name: str = "gpt-4o",
    api_base_url: Optional[str] = None
) -> "OCRZoneDesignerAgent":
    """
    Factory-Funktion für den OCR Zone Designer Agent.
    
    Args:
        model_client: Vorhandener Model Client
        api_key: API Key
        model_name: Model-Name
        api_base_url: API Base URL
        
    Returns:
        OCRZoneDesignerAgent
    """
    return OCRZoneDesignerAgent(
        model_client=model_client,
        api_key=api_key,
        model_name=model_name,
        api_base_url=api_base_url
    )