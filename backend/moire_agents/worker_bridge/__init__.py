"""
MoireTracker gRPC Worker Infrastructure

AutoGen 0.4 basierte gRPC Worker Architektur für:
- ClassificationWorker: Parallele LLM Icon-Klassifizierung
- VisionValidationWorker: CNN-LLM Vergleich
- ExecutionWorker: Desktop-Actions verteilen
"""

from .host import GrpcWorkerHost, start_host, stop_host
from .messages import (ClassificationResult, ClassifyIconMessage,
                       ValidationRequest, ValidationResult, WorkerStatus)

__all__ = [
    "GrpcWorkerHost",
    "start_host",
    "stop_host",
    "ClassifyIconMessage",
    "ClassificationResult",
    "ValidationRequest",
    "ValidationResult",
    "WorkerStatus",
]
