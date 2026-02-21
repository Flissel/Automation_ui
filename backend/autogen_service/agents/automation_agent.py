"""
Automation Agent für Desktop-UI-Steuerung.

Dieser Agent ist spezialisiert auf:
- Formulierung von Maus/Tastatur-Befehlen basierend auf Analyse
- Planung von Automation-Sequenzen
- Koordination mit dem Desktop-Client
"""

import json
import logging
from dataclasses import dataclass
from typing import Any, Callable, Optional

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
class AutomationCommand:
    """Einzelner Automation-Befehl."""
    
    command_type: str  # mouse_click, mouse_move, type_text, key_press, hotkey, scroll
    params: dict[str, Any]
    description: str
    wait_after_ms: int = 500


@dataclass
class AutomationPlan:
    """Plan mit mehreren Automation-Schritten."""
    
    goal: str
    steps: list[AutomationCommand]
    estimated_duration_ms: int
    requires_confirmation: bool = True


AUTOMATION_SYSTEM_PROMPT = """Du bist ein Desktop-Automation-Agent.

Deine Aufgabe ist es, basierend auf Screenshot-Analysen und Benutzeranweisungen konkrete Automation-Befehle zu formulieren.

**Verfügbare Befehle:**

1. **mouse_click** - Mausklick an Position
   ```json
   {"type": "mouse_click", "monitorId": "monitor_0", "x": 500, "y": 300, "button": "left", "double": false}
   ```

2. **mouse_move** - Maus bewegen ohne Klick
   ```json
   {"type": "mouse_move", "monitorId": "monitor_0", "x": 500, "y": 300, "duration": 0.2}
   ```

3. **mouse_drag** - Drag & Drop
   ```json
   {"type": "mouse_drag", "monitorId": "monitor_0", "startX": 100, "startY": 100, "endX": 300, "endY": 300, "button": "left", "duration": 0.5}
   ```

4. **type_text** - Text eingeben
   ```json
   {"type": "type_text", "text": "Hello World", "interval": 0.02}
   ```

5. **key_press** - Einzelne Taste drücken
   ```json
   {"type": "key_press", "key": "enter", "modifiers": []}
   ```

6. **hotkey** - Tastenkombination
   ```json
   {"type": "hotkey", "keys": ["ctrl", "s"]}
   ```

7. **scroll** - Scrollen
   ```json
   {"type": "scroll", "monitorId": "monitor_0", "x": 500, "y": 300, "scrollAmount": 3, "direction": "vertical"}
   ```

**Wichtige Regeln:**

1. **Koordinaten**: Verwende die Koordinaten aus der Vision-Analyse. Zähle von der oberen linken Ecke.

2. **Monitor**: Bei Dual-Screen nutze `monitor_0` (links) oder `monitor_1` (rechts).

3. **Sequenzen**: Für komplexe Aktionen erstelle mehrere Schritte mit Wartezeiten.

4. **Sicherheit**: Vermeide destruktive Aktionen ohne explizite Bestätigung.

**Output-Format:**

Antworte mit einem JSON-Objekt im folgenden Format:
```json
{
    "goal": "Was soll erreicht werden",
    "commands": [
        {
            "type": "mouse_click",
            "monitorId": "monitor_0",
            "x": 100,
            "y": 200,
            "button": "left",
            "description": "Klick auf Button XYZ",
            "wait_after_ms": 500
        }
    ],
    "requires_confirmation": true,
    "reasoning": "Warum diese Aktionen"
}
```

Wenn du die Aufgabe abgeschlossen hast, beende mit "AUTOMATION_BEREIT"."""


class AutomationAgent:
    """
    Agent für Desktop-Automation.
    
    Formuliert Befehle basierend auf Analyse-Ergebnissen und
    sendet sie an den Desktop-Client.
    """
    
    def __init__(
        self,
        model_client: Optional[Any] = None,
        api_key: Optional[str] = None,
        model_name: str = "gpt-4o",
        custom_prompt: Optional[str] = None,
        command_callback: Optional[Callable[[dict], Any]] = None
    ):
        """
        Initialisiert den Automation Agent.
        
        Args:
            model_client: Vorhandener Model Client (optional)
            api_key: OpenAI API Key (falls kein model_client)
            model_name: Model-Name für OpenAI
            custom_prompt: Optionaler Custom System Prompt
            command_callback: Callback zum Senden von Commands an Desktop-Client
        """
        if not AUTOGEN_AVAILABLE:
            raise ImportError(
                "AutoGen ist nicht installiert. "
                "Installiere mit: pip install autogen-agentchat autogen-ext"
            )
        
        # Command callback für Desktop-Client-Kommunikation
        self.command_callback = command_callback
        
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
            name="automation_agent",
            model_client=self.model_client,
            system_message=custom_prompt or AUTOMATION_SYSTEM_PROMPT,
            description="Plant und führt Desktop-Automation-Befehle aus"
        )
        
        # Command-Historie
        self.command_history: list[dict] = []
        
        logger.info("AutomationAgent initialisiert")
    
    def get_agent(self) -> AssistantAgent:
        """Gibt den internen AssistantAgent zurück."""
        return self.agent
    
    def set_command_callback(self, callback: Callable[[dict], Any]) -> None:
        """Setzt den Callback zum Senden von Commands."""
        self.command_callback = callback
    
    def parse_automation_response(self, response: str) -> Optional[AutomationPlan]:
        """
        Parst die Agent-Antwort in einen Automation-Plan.
        
        Args:
            response: Rohe Antwort vom Agent
            
        Returns:
            AutomationPlan oder None bei Fehler
        """
        try:
            # Suche nach JSON-Block
            if "```json" in response:
                json_start = response.find("```json") + 7
                json_end = response.find("```", json_start)
                json_str = response[json_start:json_end].strip()
            elif "{" in response and "}" in response:
                json_start = response.find("{")
                json_end = response.rfind("}") + 1
                json_str = response[json_start:json_end]
            else:
                logger.warning("Kein JSON in Antwort gefunden")
                return None
            
            data = json.loads(json_str)
            
            # Konvertiere zu AutomationPlan
            commands = []
            for cmd in data.get("commands", []):
                commands.append(AutomationCommand(
                    command_type=cmd.get("type", "unknown"),
                    params={k: v for k, v in cmd.items() if k not in ["type", "description", "wait_after_ms"]},
                    description=cmd.get("description", ""),
                    wait_after_ms=cmd.get("wait_after_ms", 500)
                ))
            
            return AutomationPlan(
                goal=data.get("goal", ""),
                steps=commands,
                estimated_duration_ms=sum(c.wait_after_ms for c in commands),
                requires_confirmation=data.get("requires_confirmation", True)
            )
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON-Parsing fehlgeschlagen: {e}")
            return None
        except Exception as e:
            logger.error(f"Fehler beim Parsen der Automation-Antwort: {e}")
            return None
    
    async def execute_command(self, command: AutomationCommand) -> dict[str, Any]:
        """
        Führt einen einzelnen Automation-Befehl aus.
        
        Args:
            command: Der auszuführende Befehl
            
        Returns:
            Ergebnis der Ausführung
        """
        if not self.command_callback:
            logger.error("Kein Command-Callback konfiguriert")
            return {"success": False, "error": "No command callback configured"}
        
        try:
            # Baue Command-Message
            cmd_message = {
                "type": command.command_type,
                **command.params
            }
            
            # Sende an Desktop-Client
            result = await self.command_callback(cmd_message)
            
            # Speichere in Historie
            self.command_history.append({
                "command": cmd_message,
                "description": command.description,
                "result": result
            })
            
            return {"success": True, "result": result}
            
        except Exception as e:
            logger.error(f"Command-Ausführung fehlgeschlagen: {e}")
            return {"success": False, "error": str(e)}
    
    async def execute_plan(self, plan: AutomationPlan, confirm_callback: Optional[Callable] = None) -> dict[str, Any]:
        """
        Führt einen kompletten Automation-Plan aus.
        
        Args:
            plan: Der auszuführende Plan
            confirm_callback: Optionaler Callback für Bestätigung
            
        Returns:
            Zusammenfassung der Ausführung
        """
        import asyncio
        
        results = []
        
        # Bestätigung einholen falls erforderlich
        if plan.requires_confirmation and confirm_callback:
            confirmed = await confirm_callback(plan)
            if not confirmed:
                return {"success": False, "error": "Plan nicht bestätigt", "executed": 0}
        
        # Führe jeden Schritt aus
        for i, command in enumerate(plan.steps):
            logger.info(f"Führe Schritt {i+1}/{len(plan.steps)} aus: {command.description}")
            
            result = await self.execute_command(command)
            results.append(result)
            
            if not result.get("success"):
                logger.error(f"Schritt {i+1} fehlgeschlagen: {result.get('error')}")
                return {
                    "success": False,
                    "error": f"Schritt {i+1} fehlgeschlagen",
                    "executed": i,
                    "results": results
                }
            
            # Warte zwischen Schritten
            if command.wait_after_ms > 0:
                await asyncio.sleep(command.wait_after_ms / 1000)
        
        return {
            "success": True,
            "executed": len(plan.steps),
            "results": results
        }
    
    def get_command_history(self) -> list[dict]:
        """Gibt die Command-Historie zurück."""
        return self.command_history.copy()
    
    def clear_history(self) -> None:
        """Löscht die Command-Historie."""
        self.command_history.clear()
    
    async def close(self) -> None:
        """Schließt Ressourcen falls eigener Client erstellt wurde."""
        if self._own_client and hasattr(self.model_client, 'close'):
            await self.model_client.close()


def create_automation_agent(
    model_client: Optional[Any] = None,
    api_key: Optional[str] = None,
    model_name: str = "gpt-4o"
) -> AssistantAgent:
    """
    Factory-Funktion für einen einfachen Automation Agent.
    
    Args:
        model_client: Vorhandener Model Client
        api_key: OpenAI API Key
        model_name: Model-Name
        
    Returns:
        AssistantAgent für Automation
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
        name="automation_agent",
        model_client=model_client,
        system_message=AUTOMATION_SYSTEM_PROMPT,
        description="Plant und führt Desktop-Automation-Befehle aus"
    )