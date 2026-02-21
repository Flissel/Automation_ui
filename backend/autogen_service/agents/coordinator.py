"""
Coordinator Agent für die Orchestrierung der Analyse-Ergebnisse.

Dieser Agent ist verantwortlich für:
- Aggregation der Ergebnisse von Vision und OCR Agenten
- Erstellung strukturierter Reports
- Priorisierung von Erkenntnissen
- Handlungsempfehlungen
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
class CoordinatedAnalysisResult:
    """Koordiniertes Analyseergebnis."""
    
    summary: str
    active_task: str
    key_findings: list[str]
    recommendations: list[str]
    priority_items: list[dict[str, Any]]
    confidence: float


COORDINATOR_SYSTEM_PROMPT = """Du bist der Koordinator eines Desktop-Analyse-Teams.

Deine Aufgabe ist es, die Ergebnisse der anderen Agenten (Vision-Analyst und OCR-Spezialist) zusammenzuführen und einen strukturierten Analyse-Report zu erstellen.

**Deine Verantwortlichkeiten:**

1. **Ergebnis-Aggregation**
   - Fasse die Erkenntnisse beider Agenten zusammen
   - Identifiziere übereinstimmende Beobachtungen
   - Löse Widersprüche auf

2. **Kontext-Interpretation**
   - Was macht der Benutzer gerade?
   - Welche Aufgabe wird bearbeitet?
   - Wie ist der Workflow-Status?

3. **Priorisierung**
   - Welche Informationen sind am wichtigsten?
   - Gibt es dringende Probleme oder Fehler?
   - Was benötigt sofortige Aufmerksamkeit?

4. **Empfehlungen**
   - Handlungsvorschläge basierend auf der Analyse
   - Optimierungspotenziale
   - Warnungen bei Anomalien

**Report-Format:**

Erstelle deinen Report im folgenden JSON-Format:
```json
{
    "summary": "Kurze Zusammenfassung der Desktop-Aktivität (1-2 Sätze)",
    "active_task": "Beschreibung der aktuellen Benutzer-Aufgabe",
    "context": {
        "application": "Hauptanwendung in Verwendung",
        "activity_type": "coding|browsing|communication|document_editing|other",
        "workflow_stage": "Wo im Arbeitsablauf befindet sich der Benutzer"
    },
    "key_findings": [
        "Wichtigste Erkenntnis 1",
        "Wichtigste Erkenntnis 2"
    ],
    "detected_issues": [
        {
            "type": "error|warning|info",
            "description": "Beschreibung des Problems",
            "source": "Wo wurde es erkannt",
            "priority": "high|medium|low"
        }
    ],
    "recommendations": [
        "Handlungsempfehlung 1",
        "Handlungsempfehlung 2"
    ],
    "priority_items": [
        {
            "item": "Dringender Punkt",
            "reason": "Warum dringend",
            "action": "Empfohlene Aktion"
        }
    ],
    "confidence": 0.0-1.0
}
```

Beende deine Analyse immer mit "ANALYSE_ABGESCHLOSSEN" um das Team-Meeting zu beenden.

**Wichtig:** 
- Sei präzise und fokussiert
- Priorisiere relevante Informationen
- Gib konkrete, umsetzbare Empfehlungen
- Bewerte deine Konfidenz ehrlich"""


class CoordinatorAgent:
    """
    Wrapper-Klasse für den Coordinator Agent.
    
    Aggregiert Ergebnisse und erstellt finale Reports.
    """
    
    def __init__(
        self,
        model_client: Optional[Any] = None,
        api_key: Optional[str] = None,
        model_name: str = "gpt-4o",
        custom_prompt: Optional[str] = None
    ):
        """
        Initialisiert den Coordinator Agent.
        
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
            name="analysis_coordinator",
            model_client=self.model_client,
            system_message=custom_prompt or COORDINATOR_SYSTEM_PROMPT,
            description="Koordiniert die Analyse und erstellt strukturierte Reports"
        )
        
        logger.info("CoordinatorAgent initialisiert")
    
    def get_agent(self) -> AssistantAgent:
        """Gibt den internen AssistantAgent zurück."""
        return self.agent
    
    async def close(self) -> None:
        """Schließt Ressourcen falls eigener Client erstellt wurde."""
        if self._own_client and hasattr(self.model_client, 'close'):
            await self.model_client.close()


def create_coordinator_agent(
    model_client: Optional[Any] = None,
    api_key: Optional[str] = None,
    model_name: str = "gpt-4o"
) -> AssistantAgent:
    """
    Factory-Funktion für einen einfachen Coordinator Agent.
    
    Args:
        model_client: Vorhandener Model Client
        api_key: OpenAI API Key
        model_name: Model-Name
        
    Returns:
        AssistantAgent für Koordination
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
        name="analysis_coordinator",
        model_client=model_client,
        system_message=COORDINATOR_SYSTEM_PROMPT,
        description="Koordiniert die Analyse und erstellt strukturierte Reports"
    )