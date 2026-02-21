"""
OCR Agent für die Extraktion und Analyse von Text aus Desktop-Screenshots.

Dieser Agent ist spezialisiert auf:
- Texterkennung aus Screenshots
- Fenstertitel-Extraktion
- Fehlermeldungs-Erkennung
- Code-Snippet-Erkennung
"""

import logging
from dataclasses import dataclass
from typing import Any, Optional

try:
    from autogen_agentchat.agents import AssistantAgent
    from autogen_ext.models.openai import OpenAIChatCompletionClient

    AUTOGEN_AVAILABLE = True
except ImportError:
    AUTOGEN_AVAILABLE = False
    AssistantAgent = object
    OpenAIChatCompletionClient = object


logger = logging.getLogger(__name__)


@dataclass
class OCRAnalysisResult:
    """Ergebnis einer OCR-Analyse."""
    
    window_titles: list[str]
    visible_text: list[str]
    error_messages: list[str]
    code_snippets: list[str]
    language_detected: str
    confidence: float


OCR_SYSTEM_PROMPT = """Du bist ein Experte für Texterkennung (OCR) in Desktop-Screenshots.

Deine Aufgabe ist es, allen sichtbaren Text aus Screenshots zu extrahieren und zu kategorisieren.

Analysiere folgende Texttypen:

1. **Fenstertitel & Anwendungsnamen**
   - Titel der sichtbaren Fenster
   - Namen in der Taskleiste
   - Menünamen

2. **Dokumenten-Text**
   - Text in geöffneten Dokumenten
   - E-Mail-Inhalte
   - Web-Seiten-Text

3. **UI-Beschriftungen**
   - Button-Labels
   - Menü-Einträge
   - Tooltip-Text
   - Dialog-Nachrichten

4. **Fehlermeldungen & Warnungen**
   - Error-Dialoge
   - Warnhinweise
   - System-Benachrichtigungen

5. **Code & Technischer Text**
   - Code-Snippets in Editoren
   - Terminal-Ausgaben
   - Log-Nachrichten

Gib deine Analyse im folgenden JSON-Format zurück:
```json
{
    "window_titles": ["Liste aller Fenstertitel"],
    "visible_text": [
        {
            "text": "Der extrahierte Text",
            "location": "Position im Bild",
            "type": "document|ui_label|notification|code|other",
            "importance": "high|medium|low"
        }
    ],
    "error_messages": [
        {
            "text": "Fehlermeldungstext",
            "severity": "error|warning|info",
            "source": "Quelle der Meldung"
        }
    ],
    "code_snippets": [
        {
            "code": "Der Code-Text",
            "language": "Vermutete Programmiersprache",
            "context": "IDE/Terminal/Browser"
        }
    ],
    "language_detected": "Hauptsprache des Texts (de/en/etc.)",
    "confidence": 0.0-1.0
}
```

Sei gründlich bei der Texterkennung und kategorisiere alles korrekt."""


class OCRAgent:
    """
    Wrapper-Klasse für den OCR Analysis Agent.
    
    Bietet erweiterte Funktionalität für Texterkennung
    und einfachere API für die Integration.
    """
    
    def __init__(
        self,
        model_client: Optional[Any] = None,
        api_key: Optional[str] = None,
        model_name: str = "gpt-4o",
        custom_prompt: Optional[str] = None
    ):
        """
        Initialisiert den OCR Agent.
        
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
            name="ocr_specialist",
            model_client=self.model_client,
            system_message=custom_prompt or OCR_SYSTEM_PROMPT,
            description="Extrahiert und analysiert Text aus Screenshots"
        )
        
        logger.info("OCRAgent initialisiert")
    
    def get_agent(self) -> AssistantAgent:
        """Gibt den internen AssistantAgent zurück."""
        return self.agent
    
    async def close(self) -> None:
        """Schließt Ressourcen falls eigener Client erstellt wurde."""
        if self._own_client and hasattr(self.model_client, 'close'):
            await self.model_client.close()


def create_ocr_agent(
    model_client: Optional[Any] = None,
    api_key: Optional[str] = None,
    model_name: str = "gpt-4o"
) -> AssistantAgent:
    """
    Factory-Funktion für einen einfachen OCR Agent.
    
    Args:
        model_client: Vorhandener Model Client
        api_key: OpenAI API Key
        model_name: Model-Name
        
    Returns:
        AssistantAgent für OCR-Analyse
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
        name="ocr_specialist",
        model_client=model_client,
        system_message=OCR_SYSTEM_PROMPT,
        description="Extrahiert und analysiert Text aus Screenshots"
    )