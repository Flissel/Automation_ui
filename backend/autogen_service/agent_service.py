"""
Desktop Analysis Service mit AutoGen Multi-Agent-Team.

Dieses Modul implementiert die Kernlogik für die automatische Analyse
von Desktop-Screenshots durch ein koordiniertes Team von KI-Agenten.
"""

import asyncio
import base64
import json
import logging
from io import BytesIO
from typing import Any, Optional

from PIL import Image

from .config import AutoGenConfig, AgentPrompts, get_config, get_prompts
from .desktop_bridge import DesktopClientBridge, get_desktop_bridge, send_command_to_desktop
from .agents.automation_agent import AutomationAgent, AutomationPlan
# OCR Analysis System Prompt
OCR_TEXT_ANALYSIS_PROMPT = """Du bist ein Experte für die semantische Analyse von OCR-extrahiertem Text.

Deine Aufgabe ist es, aus OCR-Text wertvolle Informationen zu extrahieren und zu kategorisieren.

Analysiere den bereitgestellten Text und erstelle:

1. **Zusammenfassung**: Kurze Beschreibung des Inhalts
2. **Erkenntnisse (Insights)**: Wichtige Informationen aus dem Text
3. **Aktionspunkte**: Wenn der Text Aufgaben oder Handlungen erwähnt
4. **Muster**: Erkannte Muster wie Datumswerte, Zahlen, URLs, E-Mails
5. **Kategorien**: Semantische Gruppierung des Textes

Gib deine Analyse im folgenden JSON-Format zurück:
```json
{
    "summary": "Kurze Zusammenfassung",
    "insights": ["Erkenntnis 1", "Erkenntnis 2"],
    "action_items": ["Aktion 1", "Aktion 2"],
    "patterns": [
        {"type": "date", "description": "Gefundenes Datum", "confidence": 0.9}
    ],
    "categories": [
        {"category": "Finanzen", "items": ["Betrag: 100€"]}
    ]
}
```

Sei präzise und fokussiere dich auf relevante Informationen."""

# AutoGen Imports (werden bei Installation verfügbar)
try:
    from autogen_agentchat.agents import AssistantAgent
    from autogen_agentchat.messages import MultiModalMessage
    from autogen_agentchat.teams import RoundRobinGroupChat
    from autogen_agentchat.conditions import TextMentionTermination
    from autogen_ext.models.openai import OpenAIChatCompletionClient
    from autogen_core import Image as AGImage
    from autogen_core.models import ModelInfo

    AUTOGEN_AVAILABLE = True
except ImportError:
    AUTOGEN_AVAILABLE = False


logger = logging.getLogger(__name__)


def _get_model_info(model_name: str) -> "ModelInfo":
    """
    Erstellt ModelInfo für das angegebene Model.
    Erforderlich für nicht-OpenAI-Models wie OpenRouter.
    """
    # Standard-Werte für unbekannte Models
    return ModelInfo(
        vision=True,  # Aktiviere Vision-Fähigkeiten
        function_calling=True,
        json_output=True,
        family="unknown",  # OpenRouter unterstützt viele Familien
    )


class DesktopAnalysisService:
    """
    Service für die automatische Analyse von Desktop-Screenshots
    durch ein Multi-Agent-Team.
    
    Verwendet AutoGen 4.0 mit folgenden Agenten:
    - Vision Agent: Analysiert visuelle Elemente
    - OCR Agent: Extrakt Text aus Screenshots
    - Coordinator Agent: Aggregiert Ergebnisse
    - Automation Agent: Plant und führt UI-Aktionen aus
    """
    
    def __init__(
        self,
        config: Optional[AutoGenConfig] = None,
        prompts: Optional[AgentPrompts] = None,
        desktop_bridge: Optional[DesktopClientBridge] = None
    ):
        """
        Initialisiert den Desktop Analysis Service.
        
        Args:
            config: Konfiguration für den Service (optional)
            prompts: Custom Prompts für die Agenten (optional)
            desktop_bridge: Bridge zum Desktop-Client (optional)
        """
        if not AUTOGEN_AVAILABLE:
            raise ImportError(
                "AutoGen ist nicht installiert. "
                "Installiere mit: pip install autogen-agentchat autogen-ext autogen-core"
            )
        
        self.config = config or get_config()
        self.prompts = prompts or get_prompts()
        
        # Desktop Bridge für Automation
        self.desktop_bridge = desktop_bridge or get_desktop_bridge()
        
        # Model Client initialisieren
        # Für nicht-OpenAI-Models benötigen wir model_info
        model_info = _get_model_info(self.config.model_name)
        
        self.model_client = OpenAIChatCompletionClient(
            model=self.config.model_name,
            api_key=self.config.openai_api_key,
            base_url=self.config.api_base_url if self.config.api_base_url else None,
            seed=self.config.seed,
            temperature=self.config.temperature,
            model_info=model_info
        )

        # Agenten initialisieren
        self._setup_agents()
        
        # Analyse-Statistiken
        self.stats = {
            "total_analyses": 0,
            "successful_analyses": 0,
            "failed_analyses": 0,
            "avg_analysis_time": 0.0,
            "automation_commands_sent": 0,
            "automation_commands_successful": 0
        }
        
        logger.info(
            f"DesktopAnalysisService initialisiert mit Model: {self.config.model_name}"
        )
    
    def _setup_agents(self) -> None:
        """Initialisiert das Multi-Agent-Team."""
        
        # Vision Agent für UI-Analyse
        self.vision_agent = AssistantAgent(
            name="vision_analyst",
            model_client=self.model_client,
            system_message=self.prompts.vision_agent,
            description="Analysiert visuelle Elemente auf Desktop-Screenshots"
        )
        
        # OCR Agent für Textextraktion
        self.ocr_agent = AssistantAgent(
            name="ocr_specialist",
            model_client=self.model_client,
            system_message=self.prompts.ocr_agent,
            description="Extrahiert und analysiert Text aus Screenshots"
        )
        
        # Coordinator Agent
        self.coordinator = AssistantAgent(
            name="analysis_coordinator",
            model_client=self.model_client,
            system_message=self.prompts.coordinator_agent,
            description="Koordiniert die Analyse und erstellt Reports"
        )
        
        # Automation Agent - NEU
        self.automation_agent_wrapper = AutomationAgent(
            model_client=self.model_client,
            command_callback=send_command_to_desktop
        )
        self.automation_agent = self.automation_agent_wrapper.get_agent()
        
        logger.info("Multi-Agent-Team (inkl. Automation) erfolgreich initialisiert")
    
    def _decode_frame(self, frame_data: str) -> Image.Image:
        """
        Dekodiert Base64-Frame-Daten zu einem PIL Image.
        
        Args:
            frame_data: Base64-kodierte Bilddaten
            
        Returns:
            PIL Image Objekt
        """
        image_bytes = base64.b64decode(frame_data)
        return Image.open(BytesIO(image_bytes))
    
    async def analyze_frame(
        self,
        frame_data: str,
        monitor_id: str = "monitor_0",
        context: Optional[dict[str, Any]] = None
    ) -> dict[str, Any]:
        """
        Analysiert einen einzelnen Frame durch das Multi-Agent-Team.
        
        Args:
            frame_data: Base64-kodiertes JPEG-Bild
            monitor_id: ID des Monitors (monitor_0 oder monitor_1)
            context: Optionaler Kontext für die Analyse
            
        Returns:
            Dict mit Analyseergebnissen
        """
        import time
        start_time = time.time()
        self.stats["total_analyses"] += 1
        
        try:
            # Dekodiere Base64 zu PIL Image
            pil_image = self._decode_frame(frame_data)
            
            # Konvertiere zu AutoGen Image
            ag_image = AGImage(pil_image)
            
            # Erstelle Kontext-String
            context_str = ""
            if context:
                context_str = f"\n\nZusätzlicher Kontext: {json.dumps(context)}"

            # Erstelle Multi-Modal Message
            message = MultiModalMessage(
                content=[
                    f"Analysiere diesen Desktop-Screenshot von {monitor_id}.{context_str}",
                    ag_image
                ],
                source="frame_processor"
            )

            # Termination-Bedingung für das Team
            termination = TextMentionTermination("ANALYSE_ABGESCHLOSSEN")
            
            # Analyse durch Team
            team = RoundRobinGroupChat(
                participants=[
                    self.vision_agent,
                    self.ocr_agent,
                    self.coordinator
                ],
                termination_condition=termination,
                max_turns=self.config.max_turns_per_analysis
            )
            
            result = await team.run(task=message)
            
            # Berechne Analyse-Zeit
            analysis_time = time.time() - start_time
            self._update_stats(analysis_time, success=True)
            
            # Extrahiere finale Antwort
            final_response = result.messages[-1].content if result.messages else ""
            
            # Versuche JSON aus der Antwort zu extrahieren
            parsed_analysis = self._parse_analysis_response(final_response)
            
            return {
                "monitor_id": monitor_id,
                "analysis": parsed_analysis,
                "raw_response": final_response,
                "agents_involved": [
                    "vision_analyst",
                    "ocr_specialist", 
                    "analysis_coordinator"
                ],
                "analysis_time": analysis_time,
                "status": "success"
            }
            
        except Exception as e:
            analysis_time = time.time() - start_time
            self._update_stats(analysis_time, success=False)
            
            logger.error(f"Analyse fehlgeschlagen für {monitor_id}: {e}")
            
            return {
                "monitor_id": monitor_id,
                "error": str(e),
                "analysis_time": analysis_time,
                "status": "error"
            }

    async def analyze_and_automate(
        self,
        frame_data: str,
        task_instruction: str,
        monitor_id: str = "monitor_0",
        auto_execute: bool = False,
        context: Optional[dict[str, Any]] = None
    ) -> dict[str, Any]:
        """
        Analysiert einen Screenshot und plant/führt Automation aus.

        Kompletter Workflow:
        1. Vision + OCR analysieren den Screenshot
        2. Coordinator fasst zusammen
        3. Automation Agent plant Aktionen basierend auf Task
        4. Optional: Automatische Ausführung
        
        Args:
            frame_data: Base64-kodiertes JPEG-Bild
            task_instruction: Was soll automatisiert werden
            monitor_id: ID des Monitors
            auto_execute: Automatisch ausführen ohne Bestätigung
            context: Optionaler Kontext
            
        Returns:
            Dict mit Analyse, Plan und optional Ergebnissen
        """
        import time
        start_time = time.time()
        
        try:
            # Schritt 1: Screenshot analysieren
            analysis_result = await self.analyze_frame(frame_data, monitor_id, context)
            
            if analysis_result.get("status") != "success":
                return {
                    "status": "analysis_failed",
                    "error": analysis_result.get("error", "Unbekannter Fehler"),
                    "analysis": analysis_result
                }
            
            # Schritt 2: Automation-Plan erstellen
            automation_request = f"""Basierend auf der folgenden Desktop-Analyse, erstelle einen Automation-Plan für diese Aufgabe:

**Aufgabe:** {task_instruction}

**Screenshot-Analyse:**
{json.dumps(analysis_result.get('analysis', {}), indent=2, ensure_ascii=False)}

**Monitor:** {monitor_id}

Erstelle einen präzisen Plan mit Maus- und Tastatur-Aktionen."""

            # Termination für Automation
            automation_termination = TextMentionTermination("AUTOMATION_BEREIT")
            
            # Team für Automation-Planung
            automation_team = RoundRobinGroupChat(
                participants=[self.automation_agent],
                termination_condition=automation_termination,
                max_turns=3
            )
            
            from autogen_agentchat.messages import TextMessage
            automation_message = TextMessage(
                content=automation_request,
                source="automation_planner"
            )
            
            plan_result = await automation_team.run(task=automation_message)
            
            # Plan parsen
            plan_response = plan_result.messages[-1].content if plan_result.messages else ""
            automation_plan = self.automation_agent_wrapper.parse_automation_response(plan_response)
            
            result = {
                "status": "planned",
                "analysis": analysis_result.get("analysis"),
                "task_instruction": task_instruction,
                "automation_plan": {
                    "goal": automation_plan.goal if automation_plan else "",
                    "steps": [
                        {
                            "type": cmd.command_type,
                            "params": cmd.params,
                            "description": cmd.description,
                            "wait_after_ms": cmd.wait_after_ms
                        }
                        for cmd in (automation_plan.steps if automation_plan else [])
                    ],
                    "requires_confirmation": automation_plan.requires_confirmation if automation_plan else True
                },
                "raw_plan_response": plan_response,
                "processing_time": time.time() - start_time
            }
            
            # Schritt 3: Optional automatisch ausführen
            if auto_execute and automation_plan:
                execution_result = await self.automation_agent_wrapper.execute_plan(
                    automation_plan,
                    confirm_callback=None  # Keine Bestätigung bei auto_execute
                )
                
                result["status"] = "executed" if execution_result.get("success") else "execution_failed"
                result["execution_result"] = execution_result
                
                self.stats["automation_commands_sent"] += len(automation_plan.steps)
                if execution_result.get("success"):
                    self.stats["automation_commands_successful"] += len(automation_plan.steps)
            
            return result
            
        except Exception as e:
            logger.error(f"Analyze and automate fehlgeschlagen: {e}")
            return {
                "status": "error",
                "error": str(e),
                "processing_time": time.time() - start_time
            }
    
    async def execute_automation_plan(
        self,
        plan_data: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Führt einen bereits erstellten Automation-Plan aus.
        
        Args:
            plan_data: Dict mit goal, steps
            
        Returns:
            Ausführungsergebnis
        """
        try:
            from .agents.automation_agent import AutomationCommand, AutomationPlan
            
            # Konvertiere zu AutomationPlan
            steps = []
            for step in plan_data.get("steps", []):
                steps.append(AutomationCommand(
                    command_type=step.get("type"),
                    params={k: v for k, v in step.items() if k not in ["type", "description", "wait_after_ms"]},
                    description=step.get("description", ""),
                    wait_after_ms=step.get("wait_after_ms", 500)
                ))
            
            plan = AutomationPlan(
                goal=plan_data.get("goal", ""),
                steps=steps,
                estimated_duration_ms=sum(s.wait_after_ms for s in steps),
                requires_confirmation=False  # Bei expliziter Ausführung keine Bestätigung
            )
            
            result = await self.automation_agent_wrapper.execute_plan(plan)
            
            self.stats["automation_commands_sent"] += len(steps)
            if result.get("success"):
                self.stats["automation_commands_successful"] += len(steps)
            
            return result
            
        except Exception as e:
            logger.error(f"Plan-Ausführung fehlgeschlagen: {e}")
            return {"success": False, "error": str(e)}
    
    async def send_single_command(
        self,
        command: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Sendet einen einzelnen Command an den Desktop-Client.
        
        Args:
            command: Command mit type und Parametern
            
        Returns:
            Ergebnis
        """
        try:
            result = await send_command_to_desktop(command)
            
            self.stats["automation_commands_sent"] += 1
            if result.get("success"):
                self.stats["automation_commands_successful"] += 1
            
            return result
            
        except Exception as e:
            logger.error(f"Command fehlgeschlagen: {e}")
            return {"success": False, "error": str(e)}

    def set_target_desktop_client(self, client_id: str) -> None:
        """Setzt den Ziel-Desktop-Client für Automation."""
        self.desktop_bridge.set_desktop_client_id(client_id)

    async def get_available_desktop_clients(self) -> list[dict[str, Any]]:
        """Holt verfügbare Desktop-Clients."""
        return await self.desktop_bridge.get_available_clients()
    
    async def analyze_ocr_results(
        self,
        ocr_results: list[dict[str, Any]],
        context: Optional[dict[str, Any]] = None,
        options: Optional[dict[str, Any]] = None
    ) -> dict[str, Any]:
        """
        Analysiert OCR-extrahierte Texte semantisch durch das Multi-Agent-Team.
        
        Args:
            ocr_results: Liste von OCR-Ergebnissen mit region_id, text, confidence
            context: Optionaler Kontext (workflow_name, analysis_goal)
            options: Optionen (include_action_items, detect_patterns, categorize_text)
            
        Returns:
            Dict mit semantischer Analyse der OCR-Texte
        """
        import time
        start_time = time.time()
        self.stats["total_analyses"] += 1
        
        options = options or {}
        include_action_items = options.get("include_action_items", True)
        detect_patterns = options.get("detect_patterns", True)
        categorize_text = options.get("categorize_text", True)
        
        try:
            # Baue den Analyse-Prompt
            text_sections = []
            for result in ocr_results:
                region_id = result.get("region_id", "unknown")
                region_label = result.get("region_label", region_id)
                text = result.get("text", "")
                confidence = result.get("confidence", 0.0)
                
                if text.strip():
                    text_sections.append(
                        f"[Region: {region_label}] (Confidence: {confidence:.2f})\n{text}"
                    )
            
            if not text_sections:
                return {
                    "analysis": {
                        "summary": "Kein Text zur Analyse verfügbar",
                        "insights": [],
                        "action_items": [],
                        "patterns": [],
                        "categories": []
                    },
                    "agents_involved": [],
                    "processing_time_ms": int((time.time() - start_time) * 1000),
                    "status": "no_text"
                }
            
            combined_text = "\n\n".join(text_sections)
            
            # Kontext-String
            context_str = ""
            if context:
                if context.get("workflow_name"):
                    context_str += f"\nWorkflow: {context['workflow_name']}"
                if context.get("analysis_goal"):
                    context_str += f"\nAnalyse-Ziel: {context['analysis_goal']}"
            
            # Analyse-Anfrage
            analysis_request = f"""Analysiere die folgenden OCR-extrahierten Texte:{context_str}

---
 OCR TEXT START ---
{combined_text}
--- OCR TEXT END ---

Erstelle eine strukturierte Analyse mit:
{f'- Zusammenfassung des Inhalts' if True else ''}
{f'- Wichtige Erkenntnisse (Insights)' if True else ''}
{f'- Aktionspunkte falls vorhanden' if include_action_items else ''}
{f'- Erkannte Muster (Daten, Zahlen, URLs, etc.)' if detect_patterns else ''}
{f'- Semantische Kategorisierung' if categorize_text else ''}

Antworte im JSON-Format."""
            
            # Erstelle speziellen OCR-Analyse-Agenten
            ocr_text_analyst = AssistantAgent(
                name="ocr_text_analyst",
                model_client=self.model_client,
                system_message=OCR_TEXT_ANALYSIS_PROMPT,
                description="Analysiert OCR-extrahierten Text semantisch"
            )
            
            # Termination-Bedingung
            termination = TextMentionTermination("ANALYSE_ABGESCHLOSSEN")
            
            # Analyse durch Team (nur OCR-Analyst und Coordinator)
            team = RoundRobinGroupChat(
                participants=[
                    ocr_text_analyst,
                    self.coordinator
                ],
                termination_condition=termination,
                max_turns=3  # Schnellere Analyse für Text
            )
            
            from autogen_agentchat.messages import TextMessage
            message = TextMessage(
                content=analysis_request,
                source="ocr_analysis_request"
            )
            
            result = await team.run(task=message)
            
            # Berechne Analyse-Zeit
            analysis_time = time.time() - start_time
            self._update_stats(analysis_time, success=True)
            
            # Extrahiere finale Antwort
            final_response = result.messages[-1].content if result.messages else ""
            
            # Parse JSON aus der Antwort
            parsed_analysis = self._parse_ocr_analysis_response(final_response)
            
            return {
                "analysis": parsed_analysis,
                "agents_involved": ["ocr_text_analyst", "analysis_coordinator"],
                "processing_time_ms": int(analysis_time * 1000),
                "raw_response": final_response,
                "status": "success"
            }
            
        except Exception as e:
            analysis_time = time.time() - start_time
            self._update_stats(analysis_time, success=False)
            
            logger.error(f"OCR-Text-Analyse fehlgeschlagen: {e}")
            
            return {
                "analysis": {
                    "summary": "",
                    "insights": [],
                    "action_items": [],
                    "patterns": [],
                    "categories": []
                },
                "error": str(e),
                "processing_time_ms": int(analysis_time * 1000),
                "status": "error"
            }
    
    def _parse_ocr_analysis_response(self, response: str) -> dict[str, Any]:
        """
        Parst die OCR-Analyse-Antwort und extrahiert strukturierte Daten.
        
        Args:
            response: Rohe Antwort vom Agent
            
        Returns:
            Strukturierte Analyse als Dict
        """
        default_result = {
            "summary": "",
            "insights": [],
            "action_items": [],
            "patterns": [],
            "categories": []
        }
        
        try:
            # Suche nach JSON-Block in der Antwort
            if "```json" in response:
                json_start = response.find("```json") + 7
                json_end = response.find("```", json_start)
                json_str = response[json_start:json_end].strip()
                parsed = json.loads(json_str)
                return {
                    "summary": parsed.get("summary", ""),
                    "insights": parsed.get("insights", []),
                    "action_items": parsed.get("action_items", []),
                    "patterns": parsed.get("patterns", []),
                    "categories": parsed.get("categories", [])
                }
            elif "{" in response and "}" in response:
                # Versuche direkt als JSON zu parsen
                json_start = response.find("{")
                json_end = response.rfind("}") + 1
                json_str = response[json_start:json_end]
                parsed = json.loads(json_str)
                return {
                    "summary": parsed.get("summary", ""),
                    "insights": parsed.get("insights", []),
                    "action_items": parsed.get("action_items", []),
                    "patterns": parsed.get("patterns", []),
                    "categories": parsed.get("categories", [])
                }
        except json.JSONDecodeError as e:
            logger.warning(f"JSON-Parsing fehlgeschlagen: {e}")
        
        # Fallback: Extrahiere Text als Summary
        return {
            **default_result,
            "summary": response[:500] if response else "",  # Ersten 500 Zeichen als Summary
            "raw_text": response
        }
    
    def _parse_analysis_response(self, response: str) -> dict[str, Any]:
        """
        Versucht, JSON aus der Agent-Antwort zu extrahieren.
        
        Args:
            response: Rohe Antwort vom Coordinator Agent
            
        Returns:
            Geparste Analyse als Dict
        """
        try:
            # Suche nach JSON-Block in der Antwort
            if "```json" in response:
                json_start = response.find("```json") + 7
                json_end = response.find("```", json_start)
                json_str = response[json_start:json_end].strip()
                return json.loads(json_str)
            elif "{" in response and "}" in response:
                # Versuche direkt als JSON zu parsen
                json_start = response.find("{")
                json_end = response.rfind("}") + 1
                json_str = response[json_start:json_end]
                return json.loads(json_str)
        except json.JSONDecodeError:
            pass
        
        # Fallback: Strukturierte Textanalyse
        return {
            "raw_text": response,
            "parsed": False
        }
    
    def _update_stats(self, analysis_time: float, success: bool) -> None:
        """Aktualisiert die Analyse-Statistiken."""
        if success:
            self.stats["successful_analyses"] += 1
        else:
            self.stats["failed_analyses"] += 1
        
        # Rolling Average für Analyse-Zeit
        total = self.stats["total_analyses"]
        current_avg = self.stats["avg_analysis_time"]
        self.stats["avg_analysis_time"] = (
            (current_avg * (total - 1) + analysis_time) / total
        )
    
    async def analyze_dual_screen(
        self,
        frame1_data: str,
        frame2_data: str,
        context: Optional[dict[str, Any]] = None
    ) -> dict[str, Any]:
        """
        Analysiert beide Bildschirme parallel.
        
        Args:
            frame1_data: Base64-kodiertes Bild von Monitor 1
            frame2_data: Base64-kodiertes Bild von Monitor 2
            context: Optionaler gemeinsamer Kontext
            
        Returns:
            Dict mit Analysen beider Monitore
        """
        # Parallele Analyse beider Monitore
        results = await asyncio.gather(
            self.analyze_frame(frame1_data, "monitor_0", context),
            self.analyze_frame(frame2_data, "monitor_1", context),
            return_exceptions=True
        )
        
        return {
            "monitor_0": results[0] if not isinstance(results[0], Exception) else {
                "error": str(results[0]),
                "status": "error"
            },
            "monitor_1": results[1] if not isinstance(results[1], Exception) else {
                "error": str(results[1]),
                "status": "error"
            },
            "dual_screen_analysis": True
        }
    
    def get_stats(self) -> dict[str, Any]:
        """Gibt die aktuellen Analyse-Statistiken zurück."""
        return self.stats.copy()
    
    async def close(self) -> None:
        """Schließt alle Ressourcen."""
        try:
            await self.model_client.close()
            logger.info("DesktopAnalysisService geschlossen")
        except Exception as e:
            logger.error(f"Fehler beim Schließen des Service: {e}")


class MockDesktopAnalysisService:
    """
    Mock-Service für Tests ohne AutoGen-Installation.
    """
    
    def __init__(self, *args: Any, **kwargs: Any):
        self.stats = {
            "total_analyses": 0,
            "successful_analyses": 0,
            "failed_analyses": 0,
            "avg_analysis_time": 0.0
        }
    
    async def analyze_frame(
        self,
        frame_data: str,
        monitor_id: str = "monitor_0",
        context: Optional[dict[str, Any]] = None
    ) -> dict[str, Any]:
        """Mock-Analyse für Tests."""
        await asyncio.sleep(0.1)  # Simuliere Verarbeitung
        self.stats["total_analyses"] += 1
        self.stats["successful_analyses"] += 1
        
        return {
            "monitor_id": monitor_id,
            "analysis": {
                "summary": "Mock-Analyse: Desktop-Screenshot empfangen",
                "applications": ["Mock App 1", "Mock App 2"],
                "confidence": 0.95
            },
            "status": "success",
            "mock": True
        }
    
    async def analyze_dual_screen(
        self,
        frame1_data: str,
        frame2_data: str,
        context: Optional[dict[str, Any]] = None
    ) -> dict[str, Any]:
        """Mock-Dual-Screen-Analyse für Tests."""
        return {
            "monitor_0": await self.analyze_frame(frame1_data, "monitor_0"),
            "monitor_1": await self.analyze_frame(frame2_data, "monitor_1"),
            "dual_screen_analysis": True,
            "mock": True
        }
    
    def get_stats(self) -> dict[str, Any]:
        return self.stats.copy()
    
    async def close(self) -> None:
        pass


def create_analysis_service(
    config: Optional[AutoGenConfig] = None,
    use_mock: bool = False
) -> DesktopAnalysisService | MockDesktopAnalysisService:
    """
    Factory-Funktion für den Analysis Service.
    
    Args:
        config: Konfiguration für den Service
        use_mock: Wenn True, wird der Mock-Service zurückgegeben
        
    Returns:
        DesktopAnalysisService oder MockDesktopAnalysisService
    """
    if use_mock or not AUTOGEN_AVAILABLE:
        logger.warning(
            "Verwende MockDesktopAnalysisService "
            f"(use_mock={use_mock}, AUTOGEN_AVAILABLE={AUTOGEN_AVAILABLE})"
        )
        return MockDesktopAnalysisService(config)
    
    return DesktopAnalysisService(config)