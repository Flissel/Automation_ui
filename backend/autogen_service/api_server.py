#!/usr/bin/env python3
"""
FastAPI Server für AutoGen OCR-Analyse API.

Bietet REST-Endpunkte für die semantische Analyse von OCR-Ergebnissen
durch das AutoGen Multi-Agent-Team sowie Desktop-Automation.

Usage:
    uvicorn backend.autogen_service.api_server:app --host 0.0.0.0 --port 8008 --reload

Endpoints:
    GET  /health                   - Health Check
    POST /api/v1/analyze-ocr       - OCR-Text semantisch analysieren
    GET  /api/v1/stats             - Analyse-Statistiken abrufen
    POST /api/v1/automate          - Screenshot analysieren + Automation planen
    POST /api/v1/execute-plan      - Automation-Plan ausführen
    POST /api/v1/send-command      - Einzelnen Command senden
    GET  /api/v1/desktop-clients   - Verfügbare Desktop-Clients auflisten
    POST /api/v1/set-target-client - Ziel-Client setzen

    # NEU: On-Demand Analyse
    POST /api/v1/design-ocr-zones  - OCR-Zonen automatisch designen
    GET  /api/v1/analysis-config   - Analyse-Konfiguration abrufen
    POST /api/v1/analysis-config   - Analyse-Konfiguration setzen
    POST /api/v1/trigger-analysis  - On-Demand Analyse triggern
    POST /api/v1/analyze-and-run   - Analyse + Automation in einem Schritt
"""

import asyncio
import logging
import time
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import (
    get_config, 
    AutoGenConfig, 
    AnalysisIntervalConfig, 
    get_default_interval_config
)
from .agent_service import (
    DesktopAnalysisService, 
    MockDesktopAnalysisService,
    create_analysis_service,
    AUTOGEN_AVAILABLE
)

# Logging Setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ==============================================================================
# Pydantic Models
# ==============================================================================

class OCRRegionCoordinates(BaseModel):
    """Koordinaten einer OCR-Region."""
    x: int = Field(ge=0, description="X-Koordinate")
    y: int = Field(ge=0, description="Y-Koordinate")
    width: int = Field(gt=0, description="Breite")
    height: int = Field(gt=0, description="Höhe")

class OCRResultItem(BaseModel):
    """Einzelnes OCR-Ergebnis für Analyse."""
    region_id: str = Field(..., description="ID der OCR-Region")
    region_label: str = Field(default="", description="Label der Region")
    text: str = Field(..., description="Extrahierter Text")
    confidence: float = Field(ge=0.0, le=1.0, description="OCR-Konfidenz")
    coordinates: OCRRegionCoordinates | None = None
    monitor_id: str = Field(default="monitor_0")

class AnalysisContext(BaseModel):
    """Kontext für die Analyse."""
    workflow_name: str | None = None
    monitor_setup: str = Field(default="single", pattern="^(single|dual)$")
    analysis_goal: str | None = None
    previous_analysis: str | None = None

class AnalysisOptions(BaseModel):
    """Optionen für die Analyse."""
    include_action_items: bool = Field(default=True)
    detect_patterns: bool = Field(default=True)
    categorize_text: bool = Field(default=True)
    max_processing_time_ms: int = Field(default=30000, ge=1000, le=120000)

class AnalyzeOCRRequest(BaseModel):
    """Request für OCR-Text-Analyse."""
    ocr_results: list[OCRResultItem] = Field(..., min_length=1)
    context: AnalysisContext | None = None
    options: AnalysisOptions = Field(default_factory=AnalysisOptions)

class PatternResult(BaseModel):
    """Erkanntes Muster."""
    type: str
    description: str
    confidence: float

class CategoryResult(BaseModel):
    """Semantische Kategorie."""
    category: str
    items: list[str]

class AnalysisResultData(BaseModel):
    """Analyseergebnis-Daten."""
    summary: str = ""
    insights: list[str] = Field(default_factory=list)
    action_items: list[str] = Field(default_factory=list)
    patterns: list[PatternResult] = Field(default_factory=list)
    categories: list[CategoryResult] = Field(default_factory=list)

class AnalyzeOCRResponse(BaseModel):
    """Response für OCR-Text-Analyse."""
    success: bool
    analysis: AnalysisResultData
    agents_involved: list[str] = Field(default_factory=list)
    processing_time_ms: int
    raw_response: str | None = None
    error: str | None = None

class HealthResponse(BaseModel):
    """Health Check Response."""
    status: str
    autogen_available: bool
    service_type: str
    version: str = "2.0.0"

class StatsResponse(BaseModel):
    """Statistiken Response."""
    total_analyses: int
    successful_analyses: int
    failed_analyses: int
    avg_analysis_time: float
    automation_commands_sent: int = 0
    automation_commands_successful: int = 0

# ==============================================================================
# Automation Models
# ==============================================================================

class AutomationRequest(BaseModel):
    """Request für Automation mit Screenshot-Analyse."""
    frame_data: str = Field(..., description="Base64-kodiertes JPEG-Bild")
    task_instruction: str = Field(..., description="Was soll automatisiert werden")
    monitor_id: str = Field(default="monitor_0")
    auto_execute: bool = Field(default=False, description="Automatisch ausführen")
    context: dict | None = None

class AutomationCommand(BaseModel):
    """Einzelner Automation-Command."""
    type: str = Field(..., description="Command-Typ: mouse_click, type_text, etc.")
    x: int | None = None
    y: int | None = None
    text: str | None = None
    key: str | None = None
    keys: list[str] | None = None
    button: str = "left"
    monitor_id: str = Field(default="monitor_0")
    wait_after_ms: int = Field(default=500)

class AutomationStep(BaseModel):
    """Schritt im Automation-Plan."""
    type: str
    params: dict
    description: str = ""
    wait_after_ms: int = 500

class AutomationPlanRequest(BaseModel):
    """Request zum Ausführen eines Automation-Plans."""
    goal: str = ""
    steps: list[AutomationStep]

class AutomationResponse(BaseModel):
    """Response für Automation-Requests."""
    status: str
    analysis: dict | None = None
    automation_plan: dict | None = None
    execution_result: dict | None = None
    processing_time: float = 0.0
    error: str | None = None

class DesktopClientInfo(BaseModel):
    """Info über einen Desktop-Client."""
    client_id: str
    hostname: str = ""
    monitors: list[str] = Field(default_factory=list)
    last_seen: str | None = None
    status: str = "unknown"

class SetTargetClientRequest(BaseModel):
    """Request zum Setzen des Ziel-Clients."""
    client_id: str

# ==============================================================================
# NEU: On-Demand Analyse Models
# ==============================================================================

class OCRZoneDefinition(BaseModel):
    """Definition einer einzelnen OCR-Zone."""
    zone_id: str = Field(..., description="Eindeutige Zone-ID")
    label: str = Field(..., description="Beschreibender Name der Zone")
    x: int = Field(ge=0, description="X-Position")
    y: int = Field(ge=0, description="Y-Position")
    width: int = Field(gt=0, description="Breite")
    height: int = Field(gt=0, description="Höhe")
    monitor_id: str = Field(default="monitor_0")
    priority: int = Field(default=2, ge=1, le=3, description="1=hoch, 2=mittel, 3=niedrig")
    expected_content_type: str = Field(default="text", description="text|number|date|code|mixed")
    description: str = Field(default="")

class DesignOCRZonesRequest(BaseModel):
    """Request für automatisches OCR-Zonen-Design."""
    frame_data: str = Field(..., description="Base64-kodiertes JPEG-Bild")
    monitor_id: str = Field(default="monitor_0")
    monitor_width: int = Field(default=1920)
    monitor_height: int = Field(default=1080)
    existing_zones: list[OCRZoneDefinition] = Field(default_factory=list)

class DesignOCRZonesResponse(BaseModel):
    """Response mit automatisch designten OCR-Zonen."""
    success: bool
    zones: list[OCRZoneDefinition]
    zone_count: int
    total_text_coverage: float = Field(ge=0.0, le=1.0)
    suggested_interval_ms: int
    analysis_notes: str = ""
    processing_time_ms: int
    error: str | None = None

class AnalysisConfigRequest(BaseModel):
    """Request zum Setzen der Analyse-Konfiguration."""
    ocr_interval_ms: int = Field(default=3000, ge=1000, le=10000, description="OCR-Intervall in ms")
    vision_enabled: bool = Field(default=False, description="Vision-Analyse aktivieren")
    trigger_automation: bool = Field(default=False, description="Automation nach Analyse")
    monitors: list[str] = Field(default_factory=lambda: ["monitor_0"])

class AnalysisConfigResponse(BaseModel):
    """Response mit aktueller Analyse-Konfiguration."""
    ocr_interval_ms: int
    vision_enabled: bool
    trigger_automation: bool
    monitors: list[str]
    automation_worker_enabled: bool
    max_ocr_zones: int

class TriggerAnalysisRequest(BaseModel):
    """Request zum manuellen Trigger einer Analyse."""
    frame_data: str = Field(..., description="Base64-kodiertes JPEG-Bild")
    monitor_id: str = Field(default="monitor_0")
    ocr_zones: list[OCRZoneDefinition] = Field(default_factory=list)
    run_vision_analysis: bool = Field(default=True)
    run_ocr_analysis: bool = Field(default=True)
    trigger_automation: bool = Field(default=False)
    automation_instruction: str | None = None

class TriggerAnalysisResponse(BaseModel):
    """Response für On-Demand Analyse."""
    success: bool
    vision_analysis: dict | None = None
    ocr_results: list[dict] = Field(default_factory=list)
    automation_plan: dict | None = None
    execution_result: dict | None = None
    processing_time_ms: int
    error: str | None = None

class AnalyzeAndRunRequest(BaseModel):
    """Request für kombinierte Analyse + Automation."""
    frame_data: str = Field(..., description="Base64-kodiertes JPEG-Bild")
    monitor_id: str = Field(default="monitor_0")
    task_instruction: str = Field(..., description="Automation-Aufgabe")
    design_ocr_zones: bool = Field(default=True, description="OCR-Zonen automatisch designen")
    auto_execute: bool = Field(default=False, description="Automation sofort ausführen")

class AnalyzeAndRunResponse(BaseModel):
    """Response für kombinierte Analyse + Automation."""
    success: bool
    phases: dict = Field(default_factory=dict)
    ocr_zones: list[OCRZoneDefinition] = Field(default_factory=list)
    automation_plan: dict | None = None
    execution_result: dict | None = None
    total_processing_time_ms: int
    error: str | None = None

# ==============================================================================
# Application State
# ==============================================================================

_analysis_service: DesktopAnalysisService | MockDesktopAnalysisService | None = None
_current_config: AnalysisIntervalConfig | None = None


def get_analysis_service() -> DesktopAnalysisService | MockDesktopAnalysisService:
    """Holt die Service-Instanz."""
    global _analysis_service
    if _analysis_service is None:
        raise RuntimeError("Analysis service not initialized")
    return _analysis_service


def get_current_config() -> AnalysisIntervalConfig:
    """Holt die aktuelle Analyse-Konfiguration."""
    global _current_config
    if _current_config is None:
        _current_config = get_default_interval_config()
    return _current_config


def set_current_config(config: AnalysisIntervalConfig) -> None:
    """Setzt die aktuelle Analyse-Konfiguration."""
    global _current_config
    config.validate()
    _current_config = config


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    global _analysis_service, _current_config
    
    logger.info("🚀 Starte AutoGen OCR Analysis API Server v2.0...")
    
    use_mock = not AUTOGEN_AVAILABLE
    
    if use_mock:
        logger.warning("⚠️  AutoGen nicht verfügbar - verwende Mock-Service")
    
    try:
        config = get_config()
        _analysis_service = create_analysis_service(config, use_mock=use_mock)
        _current_config = get_default_interval_config()
        logger.info(f"✅ Analysis Service initialisiert (mock={use_mock})")
        logger.info(f"📊 Analyse-Konfiguration: {_current_config.to_dict()}")
    except ValueError as e:
        logger.warning(f"⚠️  Config-Fehler: {e} - verwende Mock-Service")
        _analysis_service = MockDesktopAnalysisService()
        _current_config = AnalysisIntervalConfig()
    
    yield
    
    logger.info("🛑 Beende AutoGen OCR Analysis API Server...")
    if _analysis_service:
        await _analysis_service.close()
    logger.info("👋 Server beendet")

# ==============================================================================
# FastAPI App
# ==============================================================================

app = FastAPI(
    title="AutoGen Desktop Analysis API",
    description="REST API für Desktop-Analyse mit On-Demand OCR-Zonen-Design und Automation",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
# Health & Stats Endpoints
# ==============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health Check Endpoint."""
    service = get_analysis_service()
    is_mock = isinstance(service, MockDesktopAnalysisService)
    
    return HealthResponse(
        status="healthy",
        autogen_available=AUTOGEN_AVAILABLE,
        service_type="mock" if is_mock else "autogen",
        version="2.0.0"
    )


@app.get("/api/v1/stats", response_model=StatsResponse)
async def get_stats():
    """Holt die Analyse-Statistiken."""
    service = get_analysis_service()
    stats = service.get_stats()
    
    return StatsResponse(
        total_analyses=stats.get("total_analyses", 0),
        successful_analyses=stats.get("successful_analyses", 0),
        failed_analyses=stats.get("failed_analyses", 0),
        avg_analysis_time=stats.get("avg_analysis_time", 0.0),
        automation_commands_sent=stats.get("automation_commands_sent", 0),
        automation_commands_successful=stats.get("automation_commands_successful", 0)
    )

# ==============================================================================
# Analyse-Konfiguration Endpoints
# ==============================================================================

@app.get("/api/v1/analysis-config", response_model=AnalysisConfigResponse)
async def get_analysis_config():
    """Holt die aktuelle Analyse-Konfiguration."""
    config = get_current_config()
    autogen_config = get_config()
    
    return AnalysisConfigResponse(
        ocr_interval_ms=config.ocr_interval_ms,
        vision_enabled=config.vision_enabled,
        trigger_automation=config.trigger_automation,
        monitors=config.monitors,
        automation_worker_enabled=autogen_config.automation_worker_enabled,
        max_ocr_zones=autogen_config.max_ocr_zones_per_monitor
    )

@app.post("/api/v1/analysis-config", response_model=AnalysisConfigResponse)
async def set_analysis_config(request: AnalysisConfigRequest):
    """Setzt die Analyse-Konfiguration."""
    new_config = AnalysisIntervalConfig(
        ocr_interval_ms=request.ocr_interval_ms,
        vision_enabled=request.vision_enabled,
        trigger_automation=request.trigger_automation,
        monitors=request.monitors
    )
    set_current_config(new_config)
    autogen_config = get_config()
    
    logger.info(f"[CONFIG] Neue Konfiguration gesetzt: {new_config.to_dict()}")
    
    return AnalysisConfigResponse(
        ocr_interval_ms=new_config.ocr_interval_ms,
        vision_enabled=new_config.vision_enabled,
        trigger_automation=new_config.trigger_automation,
        monitors=new_config.monitors,
        automation_worker_enabled=autogen_config.automation_worker_enabled,
        max_ocr_zones=autogen_config.max_ocr_zones_per_monitor
    )

# ==============================================================================
# On-Demand OCR-Zonen-Design Endpoint
# ==============================================================================

@app.post("/api/v1/design-ocr-zones", response_model=DesignOCRZonesResponse)
async def design_ocr_zones(request: DesignOCRZonesRequest):
    """
    Analysiert einen Screenshot und designt automatisch OCR-Zonen.
    
    Verwendet den Vision Agent mit Tool Calls um alle Textbereiche
    zu identifizieren und optimale OCR-Zonen zu definieren.
    """
    start_time = time.time()
    
    try:
        from .agents.vision_agent import create_ocr_zone_designer_agent
        
        config = get_config()
        
        zone_designer = create_ocr_zone_designer_agent(
            api_key=config.openai_api_key,
            model_name=config.model_name,
            api_base_url=config.api_base_url if config.api_base_url else None
        )
        
        from PIL import Image
        from io import BytesIO
        import base64
        
        image_bytes = base64.b64decode(request.frame_data)
        pil_image = Image.open(BytesIO(image_bytes))
        
        try:
            from autogen_agentchat.messages import MultiModalMessage
            from autogen_agentchat.teams import RoundRobinGroupChat
            from autogen_agentchat.conditions import TextMentionTermination
            from autogen_core import Image as AGImage
        except ImportError:
            return DesignOCRZonesResponse(
                success=True,
                zones=[
                    OCRZoneDefinition(
                        zone_id="mock_zone_1",
                        label="Mock Titelleiste",
                        x=0, y=0, width=request.monitor_width, height=30,
                        monitor_id=request.monitor_id,
                        priority=2,
                        expected_content_type="text",
                        description="Mock Zone für Tests"
                    )
                ],
                zone_count=1,
                total_text_coverage=0.1,
                suggested_interval_ms=3000,
                analysis_notes="Mock Response - AutoGen nicht installiert",
                processing_time_ms=100,
                error=None
            )

        ag_image = AGImage(pil_image)

        context_info = f"""Monitor: {request.monitor_id}
Auflösung: {request.monitor_width}x{request.monitor_height}
Existierende Zonen: {len(request.existing_zones)}"""
        
        message = MultiModalMessage(
            content=[
                f"Analysiere diesen Desktop-Screenshot und identifiziere ALLE Textbereiche für OCR.\n\n{context_info}\n\nRufe das Tool 'design_ocr_zones' auf mit allen erkannten Zonen!",
                ag_image
            ],
            source="ocr_zone_designer"
        )

        termination = TextMentionTermination("ZONEN_DEFINIERT")

        team = RoundRobinGroupChat(
            participants=[zone_designer.get_agent()],
            termination_condition=termination,
            max_turns=3
        )

        result = await team.run(task=message)

        zone_result = zone_designer.parse_zones_from_result(result)

        zones = [
            OCRZoneDefinition(
                zone_id=z.zone_id,
                label=z.label,
                x=z.x,
                y=z.y,
                width=z.width,
                height=z.height,
                monitor_id=z.monitor_id,
                priority=z.priority,
                expected_content_type=z.expected_content_type,
                description=z.description
            )
            for z in zone_result.zones
        ]
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        return DesignOCRZonesResponse(
            success=True,
            zones=zones,
            zone_count=len(zones),
            total_text_coverage=zone_result.total_text_coverage,
            suggested_interval_ms=zone_result.suggested_interval_ms,
            analysis_notes=zone_result.analysis_notes,
            processing_time_ms=processing_time_ms,
            error=None
        )
    except Exception as e:
        logger.error(f"OCR-Zonen-Design fehlgeschlagen: {e}")
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        return DesignOCRZonesResponse(
            success=False,
            zones=[],
            zone_count=0,
            total_text_coverage=0.0,
            suggested_interval_ms=3000,
            analysis_notes="",
            processing_time_ms=processing_time_ms,
            error=str(e)
        )

# ==============================================================================
# On-Demand Analyse Endpoint
# ==============================================================================

@app.post("/api/v1/trigger-analysis", response_model=TriggerAnalysisResponse)
async def trigger_analysis(request: TriggerAnalysisRequest):
    """
    Triggert eine On-Demand Analyse.
    
    Kombiniert Vision-Analyse und OCR basierend auf definierten Zonen.
    Optional kann auch Automation getriggert werden.
    """
    service = get_analysis_service()
    start_time = time.time()
    
    try:
        result = {
            "vision_analysis": None,
            "ocr_results": [],
            "automation_plan": None,
            "execution_result": None
        }
        
        if request.run_vision_analysis:
            vision_result = await service.analyze_frame(
                frame_data=request.frame_data,
                monitor_id=request.monitor_id,
                context={"trigger": "on_demand"}
            )
            result["vision_analysis"] = vision_result.get("analysis")
        
        if request.run_ocr_analysis and request.ocr_zones:
            ocr_results = []
            for zone in request.ocr_zones:
                ocr_results.append({
                    "zone_id": zone.zone_id,
                    "label": zone.label,
                    "text": "",
                    "confidence": 0.0,
                    "coordinates": {
                        "x": zone.x,
                        "y": zone.y,
                        "width": zone.width,
                        "height": zone.height
                    }
                })
            result["ocr_results"] = ocr_results
        
        if request.trigger_automation and request.automation_instruction:
            automation_result = await service.analyze_and_automate(
                frame_data=request.frame_data,
                task_instruction=request.automation_instruction,
                monitor_id=request.monitor_id,
                auto_execute=False,
                context={
                    "vision_analysis": result["vision_analysis"],
                    "ocr_results": result["ocr_results"]
                }
            )
            result["automation_plan"] = automation_result.get("automation_plan")
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        return TriggerAnalysisResponse(
            success=True,
            vision_analysis=result["vision_analysis"],
            ocr_results=result["ocr_results"],
            automation_plan=result["automation_plan"],
            execution_result=result["execution_result"],
            processing_time_ms=processing_time_ms,
            error=None
        )
    except Exception as e:
        logger.error(f"On-Demand Analyse fehlgeschlagen: {e}")
        processing_time_ms = int((time.time() - start_time) * 1000)
        return TriggerAnalysisResponse(
            success=False,
            vision_analysis=None,
            ocr_results=[],
            automation_plan=None,
            execution_result=None,
            processing_time_ms=processing_time_ms,
            error=str(e)
        )

# ==============================================================================
# Kombinierte Analyse + Automation
# ==============================================================================

@app.post("/api/v1/analyze-and-run", response_model=AnalyzeAndRunResponse)
async def analyze_and_run(request: AnalyzeAndRunRequest):
    """
    Führt eine vollständige Analyse durch und plant/führt Automation aus.
    
    Workflow:
    1. Vision-Analyse des Screenshots
    2. Optional: Automatisches OCR-Zonen-Design
    3. OCR-Extraktion aus den Zonen
    4. Automation-Planung basierend auf Analyse
    5. Optional: Sofortige Ausführung
    """
    service = get_analysis_service()
    start_time = time.time()
    
    phases = {
        "vision": {"status": "pending", "time_ms": 0},
        "ocr_zones": {"status": "pending", "time_ms": 0},
        "ocr": {"status": "pending", "time_ms": 0},
        "automation": {"status": "pending", "time_ms": 0}
    }
    
    try:
        ocr_zones = []
        
        phase_start = time.time()
        vision_result = await service.analyze_frame(
            frame_data=request.frame_data,
            monitor_id=request.monitor_id,
            context={"task": request.task_instruction}
        )
        phases["vision"] = {
            "status": "success" if vision_result.get("status") == "success" else "error",
            "time_ms": int((time.time() - phase_start) * 1000),
            "result": vision_result.get("analysis")
        }
        
        if request.design_ocr_zones:
            phase_start = time.time()
            try:
                zones_response = await design_ocr_zones(DesignOCRZonesRequest(
                    frame_data=request.frame_data,
                    monitor_id=request.monitor_id
                ))
                ocr_zones = zones_response.zones
                phases["ocr_zones"] = {
                    "status": "success" if zones_response.success else "error",
                    "time_ms": zones_response.processing_time_ms,
                    "zone_count": zones_response.zone_count
                }
            except Exception as e:
                phases["ocr_zones"] = {
                    "status": "error",
                    "time_ms": int((time.time() - phase_start) * 1000),
                    "error": str(e)
                }
        else:
            phases["ocr_zones"] = {"status": "skipped", "time_ms": 0}
        
        phases["ocr"] = {"status": "pending", "time_ms": 0, "note": "OCR-Integration ausstehend"}
        
        phase_start = time.time()
        automation_result = await service.analyze_and_automate(
            frame_data=request.frame_data,
            task_instruction=request.task_instruction,
            monitor_id=request.monitor_id,
            auto_execute=request.auto_execute,
            context={
                "vision_analysis": phases["vision"].get("result"),
                "ocr_zones": [z.model_dump() for z in ocr_zones]
            }
        )
        
        phases["automation"] = {
            "status": automation_result.get("status", "unknown"),
            "time_ms": int((time.time() - phase_start) * 1000)
        }
        
        total_time_ms = int((time.time() - start_time) * 1000)
        
        return AnalyzeAndRunResponse(
            success=True,
            phases=phases,
            ocr_zones=ocr_zones,
            automation_plan=automation_result.get("automation_plan"),
            execution_result=automation_result.get("execution_result"),
            total_processing_time_ms=total_time_ms,
            error=None
        )
    except Exception as e:
        logger.error(f"Analyze-and-Run fehlgeschlagen: {e}")
        total_time_ms = int((time.time() - start_time) * 1000)
        return AnalyzeAndRunResponse(
            success=False,
            phases=phases,
            ocr_zones=[],
            automation_plan=None,
            execution_result=None,
            total_processing_time_ms=total_time_ms,
            error=str(e)
        )

# ==============================================================================
# Bestehende Endpoints
# ==============================================================================

@app.post("/api/v1/analyze-ocr", response_model=AnalyzeOCRResponse)
async def analyze_ocr(request: AnalyzeOCRRequest):
    """
    Analysiert OCR-extrahierten Text semantisch.
    
    Das Multi-Agent-Team erkennt:
    - Wichtige Informationen und Erkenntnisse
    - Aktionspunkte und Aufgaben
    - Muster wie Daten, Zahlen, URLs
    - Semantische Kategorien
    """
    service = get_analysis_service()
    
    ocr_results = [
        {
            "region_id": r.region_id,
            "region_label": r.region_label or r.region_id,
            "text": r.text,
            "confidence": r.confidence,
            "coordinates": r.coordinates.model_dump() if r.coordinates else None,
            "monitor_id": r.monitor_id
        }
        for r in request.ocr_results
    ]
    
    context = request.context.model_dump() if request.context else None
    options = request.options.model_dump() if request.options else {}
    
    try:
        result = await service.analyze_ocr_results(
            ocr_results=ocr_results,
            context=context,
            options=options
        )
        
        analysis_data = result.get("analysis", {})
        
        return AnalyzeOCRResponse(
            success=result.get("status") == "success",
            analysis=AnalysisResultData(
                summary=analysis_data.get("summary", ""),
                insights=analysis_data.get("insights", []),
                action_items=analysis_data.get("action_items", []),
                patterns=[
                    PatternResult(**p) for p in analysis_data.get("patterns", [])
                ],
                categories=[
                    CategoryResult(**c) for c in analysis_data.get("categories", [])
                ]
            ),
            agents_involved=result.get("agents_involved", []),
            processing_time_ms=result.get("processing_time_ms", 0),
            raw_response=result.get("raw_response"),
            error=result.get("error")
        )
        
    except Exception as e:
        logger.error(f"Analyse-Fehler: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/analyze-frame")
async def analyze_frame(request: Request):
    """
    Analysiert einen einzelnen Frame (Legacy-Endpoint für Kompatibilität).
    """
    service = get_analysis_service()
    
    try:
        data = await request.json()
        frame_data = data.get("frame_data")
        monitor_id = data.get("monitor_id", "monitor_0")
        context = data.get("context")
        
        if not frame_data:
            raise HTTPException(status_code=400, detail="frame_data is required")
        
        result = await service.analyze_frame(
            frame_data=frame_data,
            monitor_id=monitor_id,
            context=context
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Frame-Analyse-Fehler: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/automate", response_model=AutomationResponse)
async def automate(request: AutomationRequest):
    """
    Analysiert Screenshot und erstellt Automation-Plan.
    """
    service = get_analysis_service()
    start_time = time.time()
    
    try:
        result = await service.analyze_and_automate(
            frame_data=request.frame_data,
            task_instruction=request.task_instruction,
            monitor_id=request.monitor_id,
            auto_execute=request.auto_execute,
            context=request.context
        )
        
        processing_time = time.time() - start_time
        
        return AutomationResponse(
            status=result.get("status", "unknown"),
            analysis=result.get("analysis"),
            automation_plan=result.get("automation_plan"),
            execution_result=result.get("execution_result"),
            processing_time=processing_time,
            error=result.get("error")
        )
    except Exception as e:
        logger.error(f"Automation-Fehler: {e}")
        return AutomationResponse(
            status="error",
            processing_time=time.time() - start_time,
            error=str(e)
        )


@app.post("/api/v1/execute-plan", response_model=AutomationResponse)
async def execute_plan(request: AutomationPlanRequest):
    """
    Führt einen Automation-Plan aus.
    """
    service = get_analysis_service()
    start_time = time.time()
    
    try:
        plan = {
            "goal": request.goal,
            "steps": [step.model_dump() for step in request.steps]
        }
        
        result = await service.execute_automation_plan(plan)
        
        return AutomationResponse(
            status=result.get("status", "unknown"),
            execution_result=result,
            processing_time=time.time() - start_time,
            error=result.get("error")
        )
    except Exception as e:
        logger.error(f"Plan-Ausführung fehlgeschlagen: {e}")
        return AutomationResponse(
            status="error",
            processing_time=time.time() - start_time,
            error=str(e)
        )


@app.post("/api/v1/send-command", response_model=AutomationResponse)
async def send_command(command: AutomationCommand):
    """
    Sendet einen einzelnen Automation-Command.
    """
    service = get_analysis_service()
    start_time = time.time()
    
    try:
        result = await service.send_single_command(command.model_dump())
        
        return AutomationResponse(
            status=result.get("status", "unknown"),
            execution_result=result,
            processing_time=time.time() - start_time,
            error=result.get("error")
        )
    except Exception as e:
        logger.error(f"Command-Fehler: {e}")
        return AutomationResponse(
            status="error",
            processing_time=time.time() - start_time,
            error=str(e)
        )


@app.get("/api/v1/desktop-clients", response_model=list[DesktopClientInfo])
async def get_desktop_clients():
    """
    Listet alle verfügbaren Desktop-Clients.
    """
    service = get_analysis_service()
    
    try:
        clients = await service.get_available_clients()
        return [DesktopClientInfo(**c) for c in clients]
    except Exception as e:
        logger.error(f"Client-Liste Fehler: {e}")
        return []


@app.post("/api/v1/set-target-client")
async def set_target_client(request: SetTargetClientRequest):
    """
    Setzt den Ziel-Client für Automation-Commands.
    """
    service = get_analysis_service()
    
    try:
        result = await service.set_target_client(request.client_id)
        return {"status": "success", "client_id": request.client_id, "result": result}
    except Exception as e:
        logger.error(f"Target-Client setzen fehlgeschlagen: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==============================================================================
# Video Recording & Analysis Endpoints
# ==============================================================================

# Pydantic Models for Video API
class VideoStartRequest(BaseModel):
    """Request to start video recording."""
    filename: str = Field(..., description="Base filename for the recording")
    monitor_id: int = Field(default=0, description="Monitor to record")
    metadata: dict[str, Any] | None = Field(default=None, description="Optional metadata")

class VideoAnalyzeRequest(BaseModel):
    """Request to analyze a video with VideoSurfer."""
    video_path: str = Field(..., description="Path to the video file")
    question: str = Field(..., description="Question about the video content")

class VideoScreenshotRequest(BaseModel):
    """Request to get a screenshot from a video."""
    video_path: str = Field(..., description="Path to the video file")
    timestamp_seconds: float = Field(..., ge=0, description="Timestamp in seconds")
    output_path: str | None = Field(default=None, description="Optional output path")

class VideoBatchAnalyzeRequest(BaseModel):
    """Request to analyze a video with multiple questions."""
    video_path: str = Field(..., description="Path to the video file")
    questions: list[str] = Field(..., min_length=1, description="Questions to ask")


@app.post("/api/v1/video/start")
async def video_start_recording(request: VideoStartRequest):
    """
    Start recording desktop frames to a video file.

    The frames will be accumulated until stop is called.
    """
    try:
        from .video_processor import get_video_processor
        processor = get_video_processor()

        session = await processor.start_recording(
            filename=request.filename,
            monitor_id=request.monitor_id,
            metadata=request.metadata
        )

        return {
            "status": "recording",
            "session": {
                "filename": session.filename,
                "start_time": session.start_time,
                "monitor_id": request.monitor_id
            }
        }
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to start recording: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/video/stop")
async def video_stop_recording():
    """
    Stop recording and encode the video file.

    Returns the path to the encoded video file.
    """
    try:
        from .video_processor import get_video_processor
        processor = get_video_processor()

        video_path = await processor.stop_recording()

        if video_path:
            return {
                "status": "completed",
                "video_path": video_path
            }
        else:
            raise HTTPException(
                status_code=400,
                detail="No recording in progress or no frames captured"
            )
    except Exception as e:
        logger.error(f"Failed to stop recording: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/video/status")
async def video_recording_status():
    """Get current recording status."""
    try:
        from .video_processor import get_video_processor
        processor = get_video_processor()
        return processor.get_recording_status()
    except Exception as e:
        logger.error(f"Failed to get recording status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/video/list")
async def video_list_recordings():
    """List all video recordings."""
    try:
        from .video_processor import get_video_processor
        processor = get_video_processor()
        return {"recordings": processor.list_recordings()}
    except Exception as e:
        logger.error(f"Failed to list recordings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/video/analyze")
async def video_analyze(request: VideoAnalyzeRequest):
    """
    Analyze a video file with VideoSurfer.

    Uses GPT-4o vision to answer questions about the video content.
    """
    try:
        from .agents.video_surfer_agent import get_video_surfer_agent
        agent = get_video_surfer_agent()

        if not agent.is_available():
            raise HTTPException(
                status_code=503,
                detail="VideoSurfer not available. Check OPENAI_API_KEY and dependencies."
            )

        result = await agent.analyze_video(
            video_path=request.video_path,
            question=request.question
        )

        if result.get("success"):
            return result
        else:
            raise HTTPException(status_code=500, detail=result.get("error"))

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Video analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/video/screenshot")
async def video_get_screenshot(request: VideoScreenshotRequest):
    """
    Extract a screenshot from a video at a specific timestamp.

    Returns the screenshot as base64 or saves to the specified path.
    """
    try:
        from .agents.video_surfer_agent import get_video_surfer_agent
        agent = get_video_surfer_agent()

        result = await agent.get_screenshot(
            video_path=request.video_path,
            timestamp_seconds=request.timestamp_seconds,
            output_path=request.output_path
        )

        if result.get("success"):
            return result
        else:
            raise HTTPException(status_code=500, detail=result.get("error"))

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Screenshot extraction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/video/duration")
async def video_get_duration(video_path: str):
    """Get the duration of a video file."""
    try:
        from .agents.video_surfer_agent import get_video_surfer_agent
        agent = get_video_surfer_agent()

        result = await agent.get_video_duration(video_path)

        if result.get("success"):
            return result
        else:
            raise HTTPException(status_code=500, detail=result.get("error"))

    except Exception as e:
        logger.error(f"Failed to get video duration: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/video/batch-analyze")
async def video_batch_analyze(request: VideoBatchAnalyzeRequest):
    """
    Analyze a video with multiple questions.

    Returns answers for each question.
    """
    try:
        from .agents.video_surfer_agent import get_video_surfer_agent
        agent = get_video_surfer_agent()

        if not agent.is_available():
            raise HTTPException(
                status_code=503,
                detail="VideoSurfer not available. Check OPENAI_API_KEY and dependencies."
            )

        result = await agent.batch_analyze(
            video_path=request.video_path,
            questions=request.questions
        )

        return result

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Batch analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==============================================================================
# Main Entry Point
# ==============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8008)