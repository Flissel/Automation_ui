# Error Handling & Logging Guide

## Overview

This documentation describes the standardized error handling and logging strategies for the Trusted Login System. It includes best practices, implementation guidelines, and concrete code examples for consistent and effective error handling.

## Table of Contents

1. [Error Handling Strategien](#error-handling-strategien)
2. [Logging Framework](#logging-framework)
3. [Error Types & Classifications](#error-types--classifications)
4. [Backend Error Handling](#backend-error-handling)
5. [Frontend Error Handling](#frontend-error-handling)
6. [API Error Responses](#api-error-responses)
7. [Monitoring & Alerting](#monitoring--alerting)
8. [Error Recovery Strategies](#error-recovery-strategies)
9. [Testing Error Scenarios](#testing-error-scenarios)
10. [Best Practices](#best-practices)

## Error Handling Strategien

### 1. Hierarchische Fehlerbehandlung

```python
# backend/app/core/exceptions.py
from typing import Optional, Dict, Any
from enum import Enum
import traceback
import logging

class ErrorSeverity(Enum):
    """Fehler-Schweregrade"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ErrorCategory(Enum):
    """Fehler-Kategorien"""
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    VALIDATION = "validation"
    BUSINESS_LOGIC = "business_logic"
    EXTERNAL_SERVICE = "external_service"
    DATABASE = "database"
    SYSTEM = "system"
    NETWORK = "network"

class BaseApplicationError(Exception):
    """Basis-Klasse für alle Anwendungsfehler"""
    
    def __init__(
        self,
        message: str,
        error_code: str,
        category: ErrorCategory,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        details: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None
    ):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.category = category
        self.severity = severity
        self.details = details or {}
        self.cause = cause
        self.timestamp = datetime.now()
        self.trace_id = self._generate_trace_id()
    
    def _generate_trace_id(self) -> str:
        """Eindeutige Trace-ID für Fehler-Tracking"""
        import uuid
        return str(uuid.uuid4())
    
    def to_dict(self) -> Dict[str, Any]:
        """Fehler als Dictionary für Logging/API"""
        return {
            "error_code": self.error_code,
            "message": self.message,
            "category": self.category.value,
            "severity": self.severity.value,
            "details": self.details,
            "timestamp": self.timestamp.isoformat(),
            "trace_id": self.trace_id,
            "traceback": traceback.format_exc() if self.cause else None
        }
    
    def __str__(self) -> str:
        return f"[{self.error_code}] {self.message} (Trace: {self.trace_id})"

# Spezifische Fehler-Klassen
class AuthenticationError(BaseApplicationError):
    """Authentifizierungsfehler"""
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(
            message=message,
            error_code="AUTH_001",
            category=ErrorCategory.AUTHENTICATION,
            severity=ErrorSeverity.HIGH,
            details=details
        )

class AuthorizationError(BaseApplicationError):
    """Autorisierungsfehler"""
    def __init__(self, message: str, resource: str, action: str):
        super().__init__(
            message=message,
            error_code="AUTH_002",
            category=ErrorCategory.AUTHORIZATION,
            severity=ErrorSeverity.HIGH,
            details={"resource": resource, "action": action}
        )

class ValidationError(BaseApplicationError):
    """Validierungsfehler"""
    def __init__(self, message: str, field: str, value: Any):
        super().__init__(
            message=message,
            error_code="VAL_001",
            category=ErrorCategory.VALIDATION,
            severity=ErrorSeverity.MEDIUM,
            details={"field": field, "value": str(value)}
        )

class WorkflowExecutionError(BaseApplicationError):
    """Workflow-Ausführungsfehler"""
    def __init__(self, message: str, workflow_id: str, step: str):
        super().__init__(
            message=message,
            error_code="WF_001",
            category=ErrorCategory.BUSINESS_LOGIC,
            severity=ErrorSeverity.HIGH,
            details={"workflow_id": workflow_id, "step": step}
        )

class ExternalServiceError(BaseApplicationError):
    """Externe Service-Fehler"""
    def __init__(self, message: str, service: str, status_code: Optional[int] = None):
        super().__init__(
            message=message,
            error_code="EXT_001",
            category=ErrorCategory.EXTERNAL_SERVICE,
            severity=ErrorSeverity.MEDIUM,
            details={"service": service, "status_code": status_code}
        )

class DatabaseError(BaseApplicationError):
    """Datenbankfehler"""
    def __init__(self, message: str, operation: str, table: Optional[str] = None):
        super().__init__(
            message=message,
            error_code="DB_001",
            category=ErrorCategory.DATABASE,
            severity=ErrorSeverity.HIGH,
            details={"operation": operation, "table": table}
        )
```

## Logging Framework

### Strukturiertes Logging

```python
# backend/app/core/logging.py
import logging
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional
from pythonjsonlogger import jsonlogger
from app.core.config import settings

class StructuredLogger:
    """Strukturierter Logger für konsistente Log-Ausgaben"""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self._setup_logger()
    
    def _setup_logger(self):
        """Logger-Konfiguration"""
        if self.logger.handlers:
            return  # Logger bereits konfiguriert
        
        # Log-Level setzen
        self.logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper()))
        
        # JSON Formatter
        formatter = jsonlogger.JsonFormatter(
            fmt='%(asctime)s %(name)s %(levelname)s %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        # Console Handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        self.logger.addHandler(console_handler)
        
        # File Handler (optional)
        if settings.LOG_FILE:
            file_handler = logging.FileHandler(settings.LOG_FILE)
            file_handler.setFormatter(formatter)
            self.logger.addHandler(file_handler)
    
    def _create_log_context(self, **kwargs) -> Dict[str, Any]:
        """Log-Kontext erstellen"""
        context = {
            "timestamp": datetime.now().isoformat(),
            "service": "trusted-login-system",
            "version": settings.VERSION,
            "environment": settings.ENVIRONMENT
        }
        context.update(kwargs)
        return context
    
    def info(self, message: str, **kwargs):
        """Info-Log"""
        context = self._create_log_context(**kwargs)
        self.logger.info(message, extra=context)
    
    def warning(self, message: str, **kwargs):
        """Warning-Log"""
        context = self._create_log_context(**kwargs)
        self.logger.warning(message, extra=context)
    
    def error(self, message: str, error: Optional[Exception] = None, **kwargs):
        """Error-Log"""
        context = self._create_log_context(**kwargs)
        
        if error:
            if isinstance(error, BaseApplicationError):
                context.update(error.to_dict())
            else:
                context.update({
                    "error_type": type(error).__name__,
                    "error_message": str(error),
                    "traceback": traceback.format_exc()
                })
        
        self.logger.error(message, extra=context)
    
    def critical(self, message: str, error: Optional[Exception] = None, **kwargs):
        """Critical-Log"""
        context = self._create_log_context(**kwargs)
        
        if error:
            if isinstance(error, BaseApplicationError):
                context.update(error.to_dict())
            else:
                context.update({
                    "error_type": type(error).__name__,
                    "error_message": str(error),
                    "traceback": traceback.format_exc()
                })
        
        self.logger.critical(message, extra=context)
    
    def audit(self, action: str, user_id: Optional[str] = None, **kwargs):
        """Audit-Log für Sicherheits-relevante Aktionen"""
        context = self._create_log_context(
            log_type="audit",
            action=action,
            user_id=user_id,
            **kwargs
        )
        self.logger.info(f"AUDIT: {action}", extra=context)
    
    def performance(self, operation: str, duration: float, **kwargs):
        """Performance-Log"""
        context = self._create_log_context(
            log_type="performance",
            operation=operation,
            duration_ms=duration * 1000,
            **kwargs
        )
        self.logger.info(f"PERFORMANCE: {operation}", extra=context)

# Logger-Instanzen
app_logger = StructuredLogger("app")
api_logger = StructuredLogger("api")
workflow_logger = StructuredLogger("workflow")
desktop_logger = StructuredLogger("desktop")
ocr_logger = StructuredLogger("ocr")
audit_logger = StructuredLogger("audit")
```

### Logging Decorator

```python
# backend/app/core/decorators.py
import functools
import time
from typing import Callable, Any
from app.core.logging import app_logger
from app.core.exceptions import BaseApplicationError

def log_execution(logger=None, log_args=False, log_result=False):
    """Decorator für automatisches Logging von Funktionsausführungen"""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            _logger = logger or app_logger
            func_name = f"{func.__module__}.{func.__name__}"
            
            # Start-Log
            start_time = time.time()
            log_context = {"function": func_name}
            
            if log_args:
                log_context["args"] = str(args)
                log_context["kwargs"] = str(kwargs)
            
            _logger.info(f"Starting {func_name}", **log_context)
            
            try:
                # Funktion ausführen
                result = await func(*args, **kwargs)
                
                # Success-Log
                duration = time.time() - start_time
                success_context = {
                    "function": func_name,
                    "duration_ms": duration * 1000,
                    "status": "success"
                }
                
                if log_result:
                    success_context["result"] = str(result)
                
                _logger.info(f"Completed {func_name}", **success_context)
                return result
                
            except BaseApplicationError as e:
                # Application Error
                duration = time.time() - start_time
                _logger.error(
                    f"Application error in {func_name}",
                    error=e,
                    function=func_name,
                    duration_ms=duration * 1000,
                    status="application_error"
                )
                raise
                
            except Exception as e:
                # Unexpected Error
                duration = time.time() - start_time
                _logger.error(
                    f"Unexpected error in {func_name}",
                    error=e,
                    function=func_name,
                    duration_ms=duration * 1000,
                    status="unexpected_error"
                )
                raise
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            _logger = logger or app_logger
            func_name = f"{func.__module__}.{func.__name__}"
            
            # Start-Log
            start_time = time.time()
            log_context = {"function": func_name}
            
            if log_args:
                log_context["args"] = str(args)
                log_context["kwargs"] = str(kwargs)
            
            _logger.info(f"Starting {func_name}", **log_context)
            
            try:
                # Funktion ausführen
                result = func(*args, **kwargs)
                
                # Success-Log
                duration = time.time() - start_time
                success_context = {
                    "function": func_name,
                    "duration_ms": duration * 1000,
                    "status": "success"
                }
                
                if log_result:
                    success_context["result"] = str(result)
                
                _logger.info(f"Completed {func_name}", **success_context)
                return result
                
            except BaseApplicationError as e:
                # Application Error
                duration = time.time() - start_time
                _logger.error(
                    f"Application error in {func_name}",
                    error=e,
                    function=func_name,
                    duration_ms=duration * 1000,
                    status="application_error"
                )
                raise
                
            except Exception as e:
                # Unexpected Error
                duration = time.time() - start_time
                _logger.error(
                    f"Unexpected error in {func_name}",
                    error=e,
                    function=func_name,
                    duration_ms=duration * 1000,
                    status="unexpected_error"
                )
                raise
        
        # Async oder Sync Wrapper zurückgeben
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator

def audit_log(action: str, resource: Optional[str] = None):
    """Decorator für Audit-Logging"""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            # User-ID aus Kontext extrahieren (falls verfügbar)
            user_id = kwargs.get('current_user', {}).get('id') if 'current_user' in kwargs else None
            
            try:
                result = await func(*args, **kwargs)
                
                # Erfolgreiche Audit-Log
                audit_logger.audit(
                    action=action,
                    user_id=user_id,
                    resource=resource,
                    status="success",
                    function=f"{func.__module__}.{func.__name__}"
                )
                
                return result
                
            except Exception as e:
                # Fehlgeschlagene Audit-Log
                audit_logger.audit(
                    action=action,
                    user_id=user_id,
                    resource=resource,
                    status="failed",
                    error=str(e),
                    function=f"{func.__module__}.{func.__name__}"
                )
                raise
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            # User-ID aus Kontext extrahieren (falls verfügbar)
            user_id = kwargs.get('current_user', {}).get('id') if 'current_user' in kwargs else None
            
            try:
                result = func(*args, **kwargs)
                
                # Erfolgreiche Audit-Log
                audit_logger.audit(
                    action=action,
                    user_id=user_id,
                    resource=resource,
                    status="success",
                    function=f"{func.__module__}.{func.__name__}"
                )
                
                return result
                
            except Exception as e:
                # Fehlgeschlagene Audit-Log
                audit_logger.audit(
                    action=action,
                    user_id=user_id,
                    resource=resource,
                    status="failed",
                    error=str(e),
                    function=f"{func.__module__}.{func.__name__}"
                )
                raise
        
        # Async oder Sync Wrapper zurückgeben
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator
```

## Error Types & Classifications

### Error Code Schema

```python
# backend/app/core/error_codes.py
from enum import Enum

class ErrorCodes(Enum):
    """Standardisierte Error Codes"""
    
    # Authentication Errors (AUTH_xxx)
    INVALID_CREDENTIALS = "AUTH_001"
    TOKEN_EXPIRED = "AUTH_002"
    TOKEN_INVALID = "AUTH_003"
    ACCOUNT_LOCKED = "AUTH_004"
    ACCOUNT_DISABLED = "AUTH_005"
    
    # Authorization Errors (AUTHZ_xxx)
    INSUFFICIENT_PERMISSIONS = "AUTHZ_001"
    RESOURCE_ACCESS_DENIED = "AUTHZ_002"
    ROLE_REQUIRED = "AUTHZ_003"
    
    # Validation Errors (VAL_xxx)
    INVALID_INPUT = "VAL_001"
    MISSING_REQUIRED_FIELD = "VAL_002"
    INVALID_FORMAT = "VAL_003"
    VALUE_OUT_OF_RANGE = "VAL_004"
    DUPLICATE_VALUE = "VAL_005"
    
    # Workflow Errors (WF_xxx)
    WORKFLOW_NOT_FOUND = "WF_001"
    WORKFLOW_EXECUTION_FAILED = "WF_002"
    WORKFLOW_STEP_FAILED = "WF_003"
    WORKFLOW_TIMEOUT = "WF_004"
    WORKFLOW_CANCELLED = "WF_005"
    INVALID_WORKFLOW_STATE = "WF_006"
    
    # Desktop Integration Errors (DESK_xxx)
    SCREENSHOT_FAILED = "DESK_001"
    CLICK_FAILED = "DESK_002"
    KEYBOARD_INPUT_FAILED = "DESK_003"
    WINDOW_NOT_FOUND = "DESK_004"
    PERMISSION_DENIED = "DESK_005"
    
    # OCR Errors (OCR_xxx)
    OCR_PROCESSING_FAILED = "OCR_001"
    IMAGE_INVALID = "OCR_002"
    TEXT_NOT_FOUND = "OCR_003"
    OCR_SERVICE_UNAVAILABLE = "OCR_004"
    
    # Database Errors (DB_xxx)
    CONNECTION_FAILED = "DB_001"
    QUERY_FAILED = "DB_002"
    TRANSACTION_FAILED = "DB_003"
    CONSTRAINT_VIOLATION = "DB_004"
    RECORD_NOT_FOUND = "DB_005"
    
    # External Service Errors (EXT_xxx)
    SERVICE_UNAVAILABLE = "EXT_001"
    SERVICE_TIMEOUT = "EXT_002"
    INVALID_RESPONSE = "EXT_003"
    RATE_LIMIT_EXCEEDED = "EXT_004"
    
    # System Errors (SYS_xxx)
    INTERNAL_SERVER_ERROR = "SYS_001"
    CONFIGURATION_ERROR = "SYS_002"
    RESOURCE_EXHAUSTED = "SYS_003"
    FILE_SYSTEM_ERROR = "SYS_004"
    NETWORK_ERROR = "SYS_005"
```

## Backend Error Handling

### FastAPI Error Handlers

```python
# backend/app/api/error_handlers.py
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.core.exceptions import BaseApplicationError
from app.core.logging import api_logger
import traceback

def setup_error_handlers(app: FastAPI):
    """Error Handler für FastAPI registrieren"""
    
    @app.exception_handler(BaseApplicationError)
    async def application_error_handler(request: Request, exc: BaseApplicationError):
        """Handler für Anwendungsfehler"""
        api_logger.error(
            f"Application error: {exc.message}",
            error=exc,
            request_url=str(request.url),
            request_method=request.method,
            user_agent=request.headers.get("user-agent"),
            client_ip=request.client.host
        )
        
        # HTTP Status Code basierend auf Fehler-Kategorie
        status_code_map = {
            "authentication": 401,
            "authorization": 403,
            "validation": 400,
            "business_logic": 422,
            "external_service": 502,
            "database": 500,
            "system": 500,
            "network": 503
        }
        
        status_code = status_code_map.get(exc.category.value, 500)
        
        return JSONResponse(
            status_code=status_code,
            content={
                "error": {
                    "code": exc.error_code,
                    "message": exc.message,
                    "category": exc.category.value,
                    "severity": exc.severity.value,
                    "trace_id": exc.trace_id,
                    "timestamp": exc.timestamp.isoformat(),
                    "details": exc.details
                }
            }
        )
    
    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError):
        """Handler für Validierungsfehler"""
        api_logger.warning(
            "Validation error",
            errors=exc.errors(),
            request_url=str(request.url),
            request_method=request.method
        )
        
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "VAL_001",
                    "message": "Validation failed",
                    "category": "validation",
                    "severity": "medium",
                    "details": {
                        "validation_errors": exc.errors()
                    }
                }
            }
        )
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """Handler für HTTP-Exceptions"""
        api_logger.warning(
            f"HTTP exception: {exc.detail}",
            status_code=exc.status_code,
            request_url=str(request.url),
            request_method=request.method
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": f"HTTP_{exc.status_code}",
                    "message": exc.detail,
                    "category": "http",
                    "severity": "medium"
                }
            }
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """Handler für unerwartete Fehler"""
        api_logger.critical(
            f"Unexpected error: {str(exc)}",
            error=exc,
            request_url=str(request.url),
            request_method=request.method,
            traceback=traceback.format_exc()
        )
        
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "SYS_001",
                    "message": "Internal server error",
                    "category": "system",
                    "severity": "critical",
                    "details": {
                        "error_type": type(exc).__name__
                    }
                }
            }
        )
```

### Service Layer Error Handling

```python
# backend/app/services/workflow_service.py
from typing import List, Optional
from app.core.exceptions import (
    WorkflowExecutionError, 
    ValidationError, 
    DatabaseError
)
from app.core.decorators import log_execution, audit_log
from app.core.logging import workflow_logger
from app.models.workflow import Workflow

class WorkflowService:
    """Workflow Service mit umfassender Fehlerbehandlung"""
    
    @log_execution(logger=workflow_logger, log_args=True)
    @audit_log(action="create_workflow")
    async def create_workflow(self, workflow_data: dict, user_id: str) -> Workflow:
        """Workflow erstellen mit Fehlerbehandlung"""
        try:
            # Input-Validierung
            if not workflow_data.get('name'):
                raise ValidationError(
                    message="Workflow name is required",
                    field="name",
                    value=workflow_data.get('name')
                )
            
            if not workflow_data.get('steps'):
                raise ValidationError(
                    message="Workflow must have at least one step",
                    field="steps",
                    value=workflow_data.get('steps')
                )
            
            # Business Logic Validierung
            await self._validate_workflow_steps(workflow_data['steps'])
            
            # Workflow erstellen
            workflow = await self._create_workflow_record(workflow_data, user_id)
            
            workflow_logger.info(
                "Workflow created successfully",
                workflow_id=workflow.id,
                user_id=user_id,
                step_count=len(workflow_data['steps'])
            )
            
            return workflow
            
        except ValidationError:
            # Validation Errors weiterleiten
            raise
            
        except DatabaseError:
            # Database Errors weiterleiten
            raise
            
        except Exception as e:
            # Unerwartete Fehler in WorkflowExecutionError umwandeln
            workflow_logger.error(
                "Unexpected error during workflow creation",
                error=e,
                user_id=user_id,
                workflow_data=workflow_data
            )
            
            raise WorkflowExecutionError(
                message="Failed to create workflow due to unexpected error",
                workflow_id="unknown",
                step="creation"
            ) from e
    
    async def _validate_workflow_steps(self, steps: List[dict]):
        """Workflow-Schritte validieren"""
        for i, step in enumerate(steps):
            if not step.get('type'):
                raise ValidationError(
                    message=f"Step {i+1} is missing type",
                    field=f"steps[{i}].type",
                    value=step.get('type')
                )
            
            if step['type'] not in ['click', 'type', 'screenshot', 'wait']:
                raise ValidationError(
                    message=f"Invalid step type: {step['type']}",
                    field=f"steps[{i}].type",
                    value=step['type']
                )
    
    async def _create_workflow_record(self, workflow_data: dict, user_id: str) -> Workflow:
        """Workflow-Datensatz erstellen"""
        try:
            # Database Operation
            workflow = Workflow(
                name=workflow_data['name'],
                description=workflow_data.get('description', ''),
                steps=workflow_data['steps'],
                user_id=user_id
            )
            
            await workflow.save()
            return workflow
            
        except Exception as e:
            raise DatabaseError(
                message="Failed to create workflow record",
                operation="insert",
                table="workflows"
            ) from e
    
    @log_execution(logger=workflow_logger)
    @audit_log(action="execute_workflow")
    async def execute_workflow(self, workflow_id: str, user_id: str) -> dict:
        """Workflow ausführen mit umfassender Fehlerbehandlung"""
        workflow = None
        
        try:
            # Workflow laden
            workflow = await self._get_workflow(workflow_id, user_id)
            
            # Ausführung starten
            workflow_logger.info(
                "Starting workflow execution",
                workflow_id=workflow_id,
                user_id=user_id,
                step_count=len(workflow.steps)
            )
            
            execution_results = []
            
            # Schritte ausführen
            for i, step in enumerate(workflow.steps):
                try:
                    result = await self._execute_step(step, i+1, workflow_id)
                    execution_results.append(result)
                    
                    workflow_logger.info(
                        f"Step {i+1} completed successfully",
                        workflow_id=workflow_id,
                        step_type=step['type'],
                        step_number=i+1
                    )
                    
                except Exception as step_error:
                    workflow_logger.error(
                        f"Step {i+1} failed",
                        error=step_error,
                        workflow_id=workflow_id,
                        step_type=step['type'],
                        step_number=i+1
                    )
                    
                    raise WorkflowExecutionError(
                        message=f"Step {i+1} failed: {str(step_error)}",
                        workflow_id=workflow_id,
                        step=f"step_{i+1}"
                    ) from step_error
            
            # Erfolgreiche Ausführung
            result = {
                "workflow_id": workflow_id,
                "status": "completed",
                "steps_executed": len(execution_results),
                "results": execution_results
            }
            
            workflow_logger.info(
                "Workflow execution completed successfully",
                workflow_id=workflow_id,
                user_id=user_id,
                steps_executed=len(execution_results)
            )
            
            return result
            
        except WorkflowExecutionError:
            # Workflow Execution Errors weiterleiten
            raise
            
        except Exception as e:
            workflow_logger.error(
                "Unexpected error during workflow execution",
                error=e,
                workflow_id=workflow_id,
                user_id=user_id
            )
            
            raise WorkflowExecutionError(
                message="Workflow execution failed due to unexpected error",
                workflow_id=workflow_id,
                step="execution"
            ) from e
    
    async def _get_workflow(self, workflow_id: str, user_id: str) -> Workflow:
        """Workflow laden mit Fehlerbehandlung"""
        try:
            workflow = await Workflow.get_by_id_and_user(workflow_id, user_id)
            
            if not workflow:
                raise ValidationError(
                    message="Workflow not found or access denied",
                    field="workflow_id",
                    value=workflow_id
                )
            
            return workflow
            
        except ValidationError:
            raise
            
        except Exception as e:
            raise DatabaseError(
                message="Failed to load workflow",
                operation="select",
                table="workflows"
            ) from e
    
    async def _execute_step(self, step: dict, step_number: int, workflow_id: str) -> dict:
        """Einzelnen Workflow-Schritt ausführen"""
        step_type = step['type']
        
        try:
            if step_type == 'click':
                return await self._execute_click_step(step)
            elif step_type == 'type':
                return await self._execute_type_step(step)
            elif step_type == 'screenshot':
                return await self._execute_screenshot_step(step)
            elif step_type == 'wait':
                return await self._execute_wait_step(step)
            else:
                raise ValidationError(
                    message=f"Unknown step type: {step_type}",
                    field="type",
                    value=step_type
                )
                
        except Exception as e:
            workflow_logger.error(
                f"Step execution failed",
                error=e,
                workflow_id=workflow_id,
                step_number=step_number,
                step_type=step_type,
                step_data=step
            )
            raise
    
    async def _execute_click_step(self, step: dict) -> dict:
        """Click-Schritt ausführen"""
        # Implementation für Click-Schritt
        # Hier würde die Desktop-Integration aufgerufen
        pass
    
    async def _execute_type_step(self, step: dict) -> dict:
        """Type-Schritt ausführen"""
        # Implementation für Type-Schritt
        pass
    
    async def _execute_screenshot_step(self, step: dict) -> dict:
        """Screenshot-Schritt ausführen"""
        # Implementation für Screenshot-Schritt
        pass
    
    async def _execute_wait_step(self, step: dict) -> dict:
        """Wait-Schritt ausführen"""
        # Implementation für Wait-Schritt
        pass
```

## Frontend Error Handling

### React Error Boundary

```typescript
// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Error an Parent-Komponente oder Logging-Service weiterleiten
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Error an Logging-Service senden
    this.logError(error, errorInfo);
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Error an Backend-Logging-Service senden
    fetch('/api/errors/client', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(errorData)
    }).catch(err => {
      console.error('Failed to log error to server:', err);
    });

    // Lokales Logging
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Etwas ist schiefgelaufen</AlertTitle>
              <AlertDescription className="mt-2">
                Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut oder laden Sie die Seite neu.
              </AlertDescription>
            </Alert>
            
            <div className="mt-4 flex gap-2">
              <Button onClick={this.handleRetry} variant="outline" className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Erneut versuchen
              </Button>
              <Button onClick={this.handleReload} className="flex-1">
                Seite neu laden
              </Button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 p-4 bg-gray-100 rounded text-sm">
                <summary className="cursor-pointer font-medium">Error Details (Development)</summary>
                <pre className="mt-2 whitespace-pre-wrap">
                  {this.state.error.message}\n\n{this.state.error.stack}
                </pre>
                {this.state.errorInfo && (
                  <pre className="mt-2 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

### Error Handling Hook

```typescript
// src/hooks/useErrorHandler.ts
import { useCallback } from 'react';
import { toast } from 'sonner';

export interface ApiError {
  code: string;
  message: string;
  category: string;
  severity: string;
  trace_id?: string;
  details?: Record<string, any>;
}

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  fallbackMessage?: string;
  onError?: (error: ApiError | Error) => void;
}

export const useErrorHandler = () => {
  const handleError = useCallback(
    (error: unknown, options: ErrorHandlerOptions = {}) => {
      const {
        showToast = true,
        logError = true,
        fallbackMessage = 'Ein unerwarteter Fehler ist aufgetreten',
        onError
      } = options;

      let processedError: ApiError | Error;
      let displayMessage: string;

      // Error-Typ bestimmen und verarbeiten
      if (isApiError(error)) {
        processedError = error;
        displayMessage = getDisplayMessage(error);
      } else if (error instanceof Error) {
        processedError = error;
        displayMessage = error.message || fallbackMessage;
      } else {
        processedError = new Error(String(error));
        displayMessage = fallbackMessage;
      }

      // Error loggen
      if (logError) {
        logErrorToService(processedError);
      }

      // Toast anzeigen
      if (showToast) {
        const severity = isApiError(processedError) ? processedError.severity : 'medium';
        
        if (severity === 'critical' || severity === 'high') {
          toast.error(displayMessage);
        } else {
          toast.warning(displayMessage);
        }
      }

      // Custom Error Handler aufrufen
      if (onError) {
        onError(processedError);
      }

      return processedError;
    },
    []
  );

  const handleAsyncError = useCallback(
    async (asyncFn: () => Promise<any>, options: ErrorHandlerOptions = {}) => {
      try {
        return await asyncFn();
      } catch (error) {
        handleError(error, options);
        throw error; // Re-throw für weitere Behandlung
      }
    },
    [handleError]
  );

  return {
    handleError,
    handleAsyncError
  };
};

// Helper Functions
function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'category' in error
  );
}

function getDisplayMessage(error: ApiError): string {
  // Benutzerfreundliche Nachrichten für verschiedene Error Codes
  const messageMap: Record<string, string> = {
    'AUTH_001': 'Ungültige Anmeldedaten',
    'AUTH_002': 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.',
    'AUTH_003': 'Ungültiger Authentifizierungstoken',
    'AUTHZ_001': 'Sie haben keine Berechtigung für diese Aktion',
    'VAL_001': 'Die eingegebenen Daten sind ungültig',
    'WF_001': 'Workflow wurde nicht gefunden',
    'WF_002': 'Workflow-Ausführung fehlgeschlagen',
    'DESK_001': 'Screenshot konnte nicht erstellt werden',
    'OCR_001': 'Texterkennung fehlgeschlagen',
    'DB_001': 'Datenbankverbindung fehlgeschlagen',
    'EXT_001': 'Externer Service nicht verfügbar',
    'SYS_001': 'Interner Serverfehler'
  };

  return messageMap[error.code] || error.message;
}

function logErrorToService(error: ApiError | Error) {
  const errorData = {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    ...(isApiError(error) ? {
      code: error.code,
      message: error.message,
      category: error.category,
      severity: error.severity,
      trace_id: error.trace_id,
      details: error.details
    } : {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
  };

  // Error an Backend senden
  fetch('/api/errors/client', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(errorData)
  }).catch(err => {
    console.error('Failed to log error to server:', err);
  });

  // Lokales Logging
  console.error('Client error:', errorData);
}
```

### API Client mit Error Handling

```typescript
// src/lib/api-client.ts
import { ApiError } from '@/hooks/useErrorHandler';

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers
      }
    };

    // Auth Token hinzufügen falls verfügbar
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      };
    }

    try {
      const response = await fetch(url, config);
      
      // Response verarbeiten
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      // Erfolgreiche Response
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return response.text() as unknown as T;
      }
      
    } catch (error) {
      // Network oder andere Fehler
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Netzwerkfehler: Bitte überprüfen Sie Ihre Internetverbindung');
      }
      
      throw error;
    }
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: any;
    
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
      } else {
        errorData = { message: await response.text() };
      }
    } catch {
      errorData = { message: 'Unbekannter Serverfehler' };
    }

    // API Error Objekt erstellen
    const apiError: ApiError = {
      code: errorData.error?.code || `HTTP_${response.status}`,
      message: errorData.error?.message || errorData.message || response.statusText,
      category: errorData.error?.category || 'http',
      severity: errorData.error?.severity || this.getSeverityFromStatus(response.status),
      trace_id: errorData.error?.trace_id,
      details: {
        status: response.status,
        url: response.url,
        ...errorData.error?.details
      }
    };

    throw apiError;
  }

  private getSeverityFromStatus(status: number): string {
    if (status >= 500) return 'high';
    if (status >= 400) return 'medium';
    return 'low';
  }

  // HTTP Methods
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = params ? `${endpoint}?${new URLSearchParams(params)}` : endpoint;
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    });
  }
}

export const apiClient = new ApiClient();
```

## API Error Responses

### Standardisiertes Error Response Format

```json
{
  "error": {
    "code": "WF_002",
    "message": "Workflow execution failed",
    "category": "business_logic",
    "severity": "high",
    "trace_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2024-01-15T10:30:00Z",
    "details": {
      "workflow_id": "wf_123",
      "step": "step_3",
      "step_type": "click",
      "coordinates": {"x": 100, "y": 200}
    }
  }
}
```

### HTTP Status Code Mapping

| Status Code | Kategorie | Beschreibung | Beispiel Error Codes |
|-------------|-----------|--------------|---------------------|
| 400 | Bad Request | Ungültige Anfrage | VAL_001, VAL_002 |
| 401 | Unauthorized | Authentifizierung erforderlich | AUTH_001, AUTH_002 |
| 403 | Forbidden | Keine Berechtigung | AUTHZ_001, AUTHZ_002 |
| 404 | Not Found | Ressource nicht gefunden | WF_001, DB_005 |
| 422 | Unprocessable Entity | Validierungsfehler | VAL_003, VAL_004 |
| 429 | Too Many Requests | Rate Limit überschritten | EXT_004 |
| 500 | Internal Server Error | Serverfehler | SYS_001, DB_001 |
| 502 | Bad Gateway | Externe Service-Fehler | EXT_001, EXT_003 |
| 503 | Service Unavailable | Service nicht verfügbar | SYS_003, EXT_001 |

## Monitoring & Alerting

### Error Monitoring Service

```python
# backend/app/services/monitoring_service.py
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from collections import defaultdict, deque
from app.core.exceptions import BaseApplicationError, ErrorSeverity
from app.core.logging import app_logger
import asyncio
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

class ErrorMonitoringService:
    """Service für Error-Monitoring und Alerting"""
    
    def __init__(self):
        self.error_counts = defaultdict(int)
        self.error_history = deque(maxlen=1000)  # Letzte 1000 Fehler
        self.alert_thresholds = {
            ErrorSeverity.CRITICAL: 1,  # Sofort alertieren
            ErrorSeverity.HIGH: 5,      # Nach 5 Fehlern in 5 Minuten
            ErrorSeverity.MEDIUM: 20,   # Nach 20 Fehlern in 15 Minuten
            ErrorSeverity.LOW: 50       # Nach 50 Fehlern in 30 Minuten
        }
        self.alert_windows = {
            ErrorSeverity.CRITICAL: timedelta(minutes=1),
            ErrorSeverity.HIGH: timedelta(minutes=5),
            ErrorSeverity.MEDIUM: timedelta(minutes=15),
            ErrorSeverity.LOW: timedelta(minutes=30)
        }
        self.last_alerts = {}  # Cooldown für Alerts
        self.alert_cooldown = timedelta(minutes=30)
    
    async def record_error(self, error: BaseApplicationError):
        """Fehler aufzeichnen und Alerting prüfen"""
        error_record = {
            "timestamp": datetime.now(),
            "error_code": error.error_code,
            "category": error.category.value,
            "severity": error.severity.value,
            "message": error.message,
            "trace_id": error.trace_id,
            "details": error.details
        }
        
        # Fehler in Historie speichern
        self.error_history.append(error_record)
        
        # Fehler-Counter aktualisieren
        self.error_counts[error.error_code] += 1
        
        # Alerting prüfen
        await self._check_alerting(error)
        
        app_logger.info(
            "Error recorded for monitoring",
            error_code=error.error_code,
            severity=error.severity.value,
            total_count=self.error_counts[error.error_code]
        )
    
    async def _check_alerting(self, error: BaseApplicationError):
        """Alerting-Regeln prüfen"""
        severity = error.severity
        threshold = self.alert_thresholds.get(severity, 0)
        window = self.alert_windows.get(severity, timedelta(minutes=5))
        
        if threshold == 0:
            return
        
        # Fehler in Zeitfenster zählen
        now = datetime.now()
        window_start = now - window
        
        recent_errors = [
            err for err in self.error_history
            if err["timestamp"] >= window_start and 
               err["severity"] == severity.value
        ]
        
        if len(recent_errors) >= threshold:
            await self._send_alert(error, recent_errors, window)
    
    async def _send_alert(self, error: BaseApplicationError, recent_errors: List[Dict], window: timedelta):
        """Alert senden"""
        alert_key = f"{error.severity.value}_{error.category.value}"
        
        # Cooldown prüfen
        if alert_key in self.last_alerts:
            last_alert = self.last_alerts[alert_key]
            if datetime.now() - last_alert < self.alert_cooldown:
                return  # Noch im Cooldown
        
        # Alert senden
        alert_data = {
            "severity": error.severity.value,
            "category": error.category.value,
            "error_count": len(recent_errors),
            "time_window": str(window),
            "recent_error": {
                "code": error.error_code,
                "message": error.message,
                "trace_id": error.trace_id
            },
            "timestamp": datetime.now().isoformat()
        }
        
        # Email Alert
        await self._send_email_alert(alert_data)
        
        # Webhook Alert (optional)
        await self._send_webhook_alert(alert_data)
        
        # Cooldown setzen
        self.last_alerts[alert_key] = datetime.now()
        
        app_logger.critical(
            f"Alert sent: {error.severity.value} errors threshold exceeded",
            **alert_data
        )
    
    async def _send_email_alert(self, alert_data: Dict):
        """Email-Alert senden"""
        try:
            # Email-Konfiguration aus Settings
            smtp_server = "smtp.gmail.com"  # Aus Config
            smtp_port = 587
            sender_email = "alerts@trusted-login-system.com"
            sender_password = "app_password"  # Aus Secrets
            recipient_emails = ["admin@company.com", "devops@company.com"]
            
            # Email erstellen
            msg = MIMEMultipart()
            msg['From'] = sender_email
            msg['To'] = ", ".join(recipient_emails)
            msg['Subject'] = f"🚨 Alert: {alert_data['severity'].upper()} Errors - Trusted Login System"
            
            # Email-Body
            body = f"""
            Alert: High Error Rate Detected
            
            Severity: {alert_data['severity'].upper()}
            Category: {alert_data['category']}
            Error Count: {alert_data['error_count']} errors in {alert_data['time_window']}
            
            Recent Error:
            - Code: {alert_data['recent_error']['code']}
            - Message: {alert_data['recent_error']['message']}
            - Trace ID: {alert_data['recent_error']['trace_id']}
            
            Timestamp: {alert_data['timestamp']}
            
            Please investigate immediately.
            
            Best regards,
            Trusted Login System Monitoring
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            # Email senden
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(sender_email, sender_password)
            text = msg.as_string()
            server.sendmail(sender_email, recipient_emails, text)
            server.quit()
            
            app_logger.info("Email alert sent successfully", recipients=recipient_emails)
            
        except Exception as e:
            app_logger.error("Failed to send email alert", error=e)
    
    async def _send_webhook_alert(self, alert_data: Dict):
        """Webhook-Alert senden (z.B. Slack, Discord)"""
        try:
            import aiohttp
            
            webhook_url = "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
            
            slack_message = {
                "text": f"🚨 Alert: {alert_data['severity'].upper()} Errors",
                "attachments": [
                    {
                        "color": "danger" if alert_data['severity'] in ['critical', 'high'] else "warning",
                        "fields": [
                            {
                                "title": "Severity",
                                "value": alert_data['severity'].upper(),
                                "short": True
                            },
                            {
                                "title": "Category",
                                "value": alert_data['category'],
                                "short": True
                            },
                            {
                                "title": "Error Count",
                                "value": f"{alert_data['error_count']} in {alert_data['time_window']}",
                                "short": True
                            },
                            {
                                "title": "Recent Error",
                                "value": f"{alert_data['recent_error']['code']}: {alert_data['recent_error']['message']}",
                                "short": False
                            }
                        ],
                        "footer": "Trusted Login System",
                        "ts": int(datetime.now().timestamp())
                    }
                ]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(webhook_url, json=slack_message) as response:
                    if response.status == 200:
                        app_logger.info("Webhook alert sent successfully")
                    else:
                        app_logger.error(f"Failed to send webhook alert: {response.status}")
                        
        except Exception as e:
            app_logger.error("Failed to send webhook alert", error=e)
    
    def get_error_statistics(self, hours: int = 24) -> Dict:
        """Fehler-Statistiken abrufen"""
        now = datetime.now()
        since = now - timedelta(hours=hours)
        
        # Fehler im Zeitraum filtern
        recent_errors = [
            err for err in self.error_history
            if err["timestamp"] >= since
        ]
        
        # Statistiken berechnen
        stats = {
            "total_errors": len(recent_errors),
            "time_period": f"last {hours} hours",
            "by_severity": defaultdict(int),
            "by_category": defaultdict(int),
            "by_error_code": defaultdict(int),
            "error_rate_per_hour": len(recent_errors) / hours if hours > 0 else 0
        }
        
        for error in recent_errors:
            stats["by_severity"][error["severity"]] += 1
            stats["by_category"][error["category"]] += 1
            stats["by_error_code"][error["error_code"]] += 1
        
        return dict(stats)
    
    def get_top_errors(self, limit: int = 10) -> List[Dict]:
        """Häufigste Fehler abrufen"""
        error_counts = defaultdict(int)
        error_details = {}
        
        for error in self.error_history:
            code = error["error_code"]
            error_counts[code] += 1
            if code not in error_details:
                error_details[code] = {
                    "code": code,
                    "category": error["category"],
                    "severity": error["severity"],
                    "last_message": error["message"],
                    "last_seen": error["timestamp"]
                }
            else:
                # Aktuellste Informationen behalten
                if error["timestamp"] > error_details[code]["last_seen"]:
                    error_details[code]["last_message"] = error["message"]
                    error_details[code]["last_seen"] = error["timestamp"]
        
        # Nach Häufigkeit sortieren
        top_errors = sorted(
            error_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )[:limit]
        
        result = []
        for code, count in top_errors:
            details = error_details[code]
            result.append({
                "error_code": code,
                "count": count,
                "category": details["category"],
                "severity": details["severity"],
                "last_message": details["last_message"],
                "last_seen": details["last_seen"].isoformat()
            })
        
        return result

# Globale Monitoring-Instanz
error_monitor = ErrorMonitoringService()
```

### Health Check Endpoint

```python
# backend/app/api/endpoints/health.py
from fastapi import APIRouter, Depends
from app.services.monitoring_service import error_monitor
from app.core.logging import app_logger
from datetime import datetime
import psutil
import asyncio

router = APIRouter()

@router.get("/health")
async def health_check():
    """Basis Health Check"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "trusted-login-system"
    }

@router.get("/health/detailed")
async def detailed_health_check():
    """Detaillierter Health Check"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "trusted-login-system",
        "checks": {}
    }
    
    # Database Check
    try:
        # Hier würde eine echte DB-Verbindung getestet
        await asyncio.sleep(0.1)  # Simulierte DB-Abfrage
        health_status["checks"]["database"] = {
            "status": "healthy",
            "response_time_ms": 100
        }
    except Exception as e:
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_status["status"] = "degraded"
    
    # System Resources
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        health_status["checks"]["system"] = {
            "status": "healthy",
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "disk_percent": (disk.used / disk.total) * 100
        }
        
        # Warnung bei hoher Ressourcennutzung
        if cpu_percent > 80 or memory.percent > 80:
            health_status["status"] = "degraded"
            health_status["checks"]["system"]["status"] = "warning"
            
    except Exception as e:
        health_status["checks"]["system"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_status["status"] = "degraded"
    
    # Error Statistics
    try:
        error_stats = error_monitor.get_error_statistics(hours=1)
        health_status["checks"]["errors"] = {
            "status": "healthy",
            "error_count_last_hour": error_stats["total_errors"],
            "error_rate_per_hour": error_stats["error_rate_per_hour"]
        }
        
        # Warnung bei vielen Fehlern
        if error_stats["total_errors"] > 50:
            health_status["status"] = "degraded"
            health_status["checks"]["errors"]["status"] = "warning"
            
    except Exception as e:
        health_status["checks"]["errors"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_status["status"] = "degraded"
    
    return health_status

@router.get("/errors/statistics")
async def get_error_statistics(hours: int = 24):
    """Fehler-Statistiken abrufen"""
    try:
        stats = error_monitor.get_error_statistics(hours)
        top_errors = error_monitor.get_top_errors(limit=10)
        
        return {
            "statistics": stats,
            "top_errors": top_errors
        }
    except Exception as e:
        app_logger.error("Failed to get error statistics", error=e)
        raise
```

## Error Recovery Strategies

### Retry Mechanisms

```python
# backend/app/core/retry.py
import asyncio
import random
from typing import Callable, Any, Optional, Type, Union, List
from functools import wraps
from app.core.exceptions import BaseApplicationError, ExternalServiceError
from app.core.logging import app_logger

class RetryConfig:
    """Retry-Konfiguration"""
    
    def __init__(
        self,
        max_attempts: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        jitter: bool = True,
        retryable_exceptions: Optional[List[Type[Exception]]] = None
    ):
        self.max_attempts = max_attempts
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter
        self.retryable_exceptions = retryable_exceptions or [
            ExternalServiceError,
            ConnectionError,
            TimeoutError
        ]
    
    def calculate_delay(self, attempt: int) -> float:
        """Delay für Retry-Versuch berechnen"""
        delay = self.base_delay * (self.exponential_base ** (attempt - 1))
        delay = min(delay, self.max_delay)
        
        if self.jitter:
            # Jitter hinzufügen um Thundering Herd zu vermeiden
            jitter_range = delay * 0.1
            delay += random.uniform(-jitter_range, jitter_range)
        
        return max(0, delay)
    
    def is_retryable(self, exception: Exception) -> bool:
        """Prüfen ob Exception retry-fähig ist"""
        return any(
            isinstance(exception, exc_type)
            for exc_type in self.retryable_exceptions
        )

def retry_async(
    config: Optional[RetryConfig] = None,
    on_retry: Optional[Callable[[int, Exception], None]] = None
):
    """Async Retry Decorator"""
    if config is None:
        config = RetryConfig()
    
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            last_exception = None
            
            for attempt in range(1, config.max_attempts + 1):
                try:
                    result = await func(*args, **kwargs)
                    
                    # Erfolg nach Retry loggen
                    if attempt > 1:
                        app_logger.info(
                            f"Function {func.__name__} succeeded after {attempt} attempts",
                            function=func.__name__,
                            attempt=attempt,
                            total_attempts=config.max_attempts
                        )
                    
                    return result
                    
                except Exception as e:
                    last_exception = e
                    
                    # Prüfen ob Retry möglich
                    if not config.is_retryable(e) or attempt == config.max_attempts:
                        app_logger.error(
                            f"Function {func.__name__} failed permanently",
                            error=e,
                            function=func.__name__,
                            attempt=attempt,
                            total_attempts=config.max_attempts,
                            retryable=config.is_retryable(e)
                        )
                        raise
                    
                    # Retry-Delay berechnen
                    delay = config.calculate_delay(attempt)
                    
                    app_logger.warning(
                        f"Function {func.__name__} failed, retrying in {delay:.2f}s",
                        error=e,
                        function=func.__name__,
                        attempt=attempt,
                        total_attempts=config.max_attempts,
                        retry_delay=delay
                    )
                    
                    # Custom Retry Handler
                    if on_retry:
                        on_retry(attempt, e)
                    
                    # Warten vor nächstem Versuch
                    await asyncio.sleep(delay)
            
            # Sollte nie erreicht werden, aber Sicherheit
            raise last_exception
        
        return wrapper
    return decorator

def retry_sync(
    config: Optional[RetryConfig] = None,
    on_retry: Optional[Callable[[int, Exception], None]] = None
):
    """Sync Retry Decorator"""
    if config is None:
        config = RetryConfig()
    
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            import time
            last_exception = None
            
            for attempt in range(1, config.max_attempts + 1):
                try:
                    result = func(*args, **kwargs)
                    
                    # Erfolg nach Retry loggen
                    if attempt > 1:
                        app_logger.info(
                            f"Function {func.__name__} succeeded after {attempt} attempts",
                            function=func.__name__,
                            attempt=attempt,
                            total_attempts=config.max_attempts
                        )
                    
                    return result
                    
                except Exception as e:
                    last_exception = e
                    
                    # Prüfen ob Retry möglich
                    if not config.is_retryable(e) or attempt == config.max_attempts:
                        app_logger.error(
                            f"Function {func.__name__} failed permanently",
                            error=e,
                            function=func.__name__,
                            attempt=attempt,
                            total_attempts=config.max_attempts,
                            retryable=config.is_retryable(e)
                        )
                        raise
                    
                    # Retry-Delay berechnen
                    delay = config.calculate_delay(attempt)
                    
                    app_logger.warning(
                        f"Function {func.__name__} failed, retrying in {delay:.2f}s",
                        error=e,
                        function=func.__name__,
                        attempt=attempt,
                        total_attempts=config.max_attempts,
                        retry_delay=delay
                    )
                    
                    # Custom Retry Handler
                    if on_retry:
                        on_retry(attempt, e)
                    
                    # Warten vor nächstem Versuch
                    time.sleep(delay)
            
            # Sollte nie erreicht werden, aber Sicherheit
            raise last_exception
        
        return wrapper
    return decorator

# Vordefinierte Retry-Konfigurationen
QUICK_RETRY = RetryConfig(
    max_attempts=3,
    base_delay=0.5,
    max_delay=5.0
)

STANDARD_RETRY = RetryConfig(
    max_attempts=5,
    base_delay=1.0,
    max_delay=30.0
)

PATIENT_RETRY = RetryConfig(
    max_attempts=10,
    base_delay=2.0,
    max_delay=120.0
)

EXTERNAL_SERVICE_RETRY = RetryConfig(
    max_attempts=3,
    base_delay=1.0,
    max_delay=10.0,
    retryable_exceptions=[
        ExternalServiceError,
        ConnectionError,
        TimeoutError,
        OSError  # Netzwerk-Fehler
    ]
)
```

### Circuit Breaker Pattern

```python
# backend/app/core/circuit_breaker.py
import asyncio
import time
from enum import Enum
from typing import Callable, Any, Optional
from functools import wraps
from app.core.exceptions import ExternalServiceError
from app.core.logging import app_logger

class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Circuit is open, calls fail fast
    HALF_OPEN = "half_open" # Testing if service is back

class CircuitBreaker:
    """Circuit Breaker Implementation"""
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: float = 60.0,
        expected_exception: type = Exception,
        name: Optional[str] = None
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.name = name or "unnamed"
        
        self.failure_count = 0
        self.last_failure_time = None
        self.state = CircuitState.CLOSED
        self._lock = asyncio.Lock()
    
    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """Funktion über Circuit Breaker aufrufen"""
        async with self._lock:
            # State prüfen und ggf. aktualisieren
            await self._update_state()
            
            if self.state == CircuitState.OPEN:
                app_logger.warning(
                    f"Circuit breaker {self.name} is OPEN, failing fast",
                    circuit_breaker=self.name,
                    state=self.state.value,
                    failure_count=self.failure_count
                )
                raise ExternalServiceError(
                    message=f"Circuit breaker {self.name} is open",
                    service=self.name
                )
        
        # Funktion ausführen
        try:
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            
            # Erfolg - Circuit zurücksetzen
            await self._on_success()
            return result
            
        except self.expected_exception as e:
            # Erwarteter Fehler - Circuit aktualisieren
            await self._on_failure()
            raise
        except Exception as e:
            # Unerwarteter Fehler - nicht als Circuit-Fehler werten
            app_logger.error(
                f"Unexpected error in circuit breaker {self.name}",
                error=e,
                circuit_breaker=self.name
            )
            raise
    
    async def _update_state(self):
        """Circuit State aktualisieren"""
        if self.state == CircuitState.OPEN:
            if self.last_failure_time and \
               time.time() - self.last_failure_time >= self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
                app_logger.info(
                    f"Circuit breaker {self.name} moved to HALF_OPEN",
                    circuit_breaker=self.name,
                    state=self.state.value
                )
    
    async def _on_success(self):
        """Erfolgreiche Ausführung"""
        async with self._lock:
            if self.state == CircuitState.HALF_OPEN:
                # Von HALF_OPEN zu CLOSED
                self.state = CircuitState.CLOSED
                self.failure_count = 0
                self.last_failure_time = None
                
                app_logger.info(
                    f"Circuit breaker {self.name} recovered, moved to CLOSED",
                    circuit_breaker=self.name,
                    state=self.state.value
                )
            elif self.state == CircuitState.CLOSED:
                # Reset failure count bei erfolgreichem Call
                self.failure_count = 0
    
    async def _on_failure(self):
        """Fehlgeschlagene Ausführung"""
        async with self._lock:
            self.failure_count += 1
            self.last_failure_time = time.time()
            
            if self.state == CircuitState.CLOSED and \
               self.failure_count >= self.failure_threshold:
                # Von CLOSED zu OPEN
                self.state = CircuitState.OPEN
                
                app_logger.warning(
                    f"Circuit breaker {self.name} opened due to failures",
                    circuit_breaker=self.name,
                    state=self.state.value,
                    failure_count=self.failure_count,
                    threshold=self.failure_threshold
                )
            elif self.state == CircuitState.HALF_OPEN:
                # Von HALF_OPEN zurück zu OPEN
                self.state = CircuitState.OPEN
                
                app_logger.warning(
                    f"Circuit breaker {self.name} failed in HALF_OPEN, back to OPEN",
                    circuit_breaker=self.name,
                    state=self.state.value
                )
    
    def get_state(self) -> dict:
        """Aktueller State des Circuit Breakers"""
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "failure_threshold": self.failure_threshold,
            "last_failure_time": self.last_failure_time,
            "recovery_timeout": self.recovery_timeout
        }

def circuit_breaker(
    failure_threshold: int = 5,
    recovery_timeout: float = 60.0,
    expected_exception: type = Exception,
    name: Optional[str] = None
):
    """Circuit Breaker Decorator"""
    def decorator(func: Callable) -> Callable:
        breaker_name = name or f"{func.__module__}.{func.__name__}"
        breaker = CircuitBreaker(
            failure_threshold=failure_threshold,
            recovery_timeout=recovery_timeout,
            expected_exception=expected_exception,
            name=breaker_name
        )
        
        @wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            return await breaker.call(func, *args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            # Für sync Funktionen asyncio.run verwenden
            return asyncio.run(breaker.call(func, *args, **kwargs))
        
        # Breaker State als Attribut hinzufügen
        if asyncio.iscoroutinefunction(func):
            async_wrapper.circuit_breaker = breaker
            return async_wrapper
        else:
            sync_wrapper.circuit_breaker = breaker
            return sync_wrapper
    
    return decorator
```

### Graceful Degradation

```python
# backend/app/core/degradation.py
from typing import Callable, Any, Optional, Dict
from functools import wraps
from app.core.exceptions import ExternalServiceError
from app.core.logging import app_logger

class GracefulDegradation:
    """Graceful Degradation für Service-Ausfälle"""
    
    def __init__(self, fallback_func: Optional[Callable] = None):
        self.fallback_func = fallback_func
        self.degradation_active = False
        self.degradation_reason = None
    
    async def execute(
        self,
        primary_func: Callable,
        *args,
        fallback_func: Optional[Callable] = None,
        **kwargs
    ) -> Any:
        """Primäre Funktion mit Fallback ausführen"""
        try:
            # Primäre Funktion versuchen
            if asyncio.iscoroutinefunction(primary_func):
                result = await primary_func(*args, **kwargs)
            else:
                result = primary_func(*args, **kwargs)
            
            # Erfolg - Degradation deaktivieren falls aktiv
            if self.degradation_active:
                self.degradation_active = False
                self.degradation_reason = None
                app_logger.info(
                    f"Service {primary_func.__name__} recovered, degradation deactivated",
                    function=primary_func.__name__
                )
            
            return result
            
        except Exception as e:
            # Fallback verwenden
            fallback = fallback_func or self.fallback_func
            
            if fallback:
                app_logger.warning(
                    f"Primary function {primary_func.__name__} failed, using fallback",
                    error=e,
                    function=primary_func.__name__,
                    fallback_function=fallback.__name__
                )
                
                self.degradation_active = True
                self.degradation_reason = str(e)
                
                try:
                    if asyncio.iscoroutinefunction(fallback):
                        return await fallback(*args, **kwargs)
                    else:
                        return fallback(*args, **kwargs)
                except Exception as fallback_error:
                    app_logger.error(
                        f"Fallback function {fallback.__name__} also failed",
                        error=fallback_error,
                        primary_error=str(e),
                        function=primary_func.__name__
                    )
                    raise
            else:
                app_logger.error(
                    f"Function {primary_func.__name__} failed and no fallback available",
                    error=e,
                    function=primary_func.__name__
                )
                raise

def graceful_degradation(fallback_func: Optional[Callable] = None):
    """Graceful Degradation Decorator"""
    def decorator(func: Callable) -> Callable:
        degradation = GracefulDegradation(fallback_func)
        
        @wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            return await degradation.execute(func, *args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            import asyncio
            return asyncio.run(degradation.execute(func, *args, **kwargs))
        
        # Degradation State als Attribut
        if asyncio.iscoroutinefunction(func):
            async_wrapper.degradation = degradation
            return async_wrapper
        else:
            sync_wrapper.degradation = degradation
            return sync_wrapper
    
    return decorator

# Beispiel-Fallback-Funktionen
async def ocr_fallback(*args, **kwargs) -> Dict[str, Any]:
    """Fallback für OCR-Service"""
    app_logger.info("Using OCR fallback - returning empty result")
    return {
        "text": "",
        "confidence": 0.0,
        "bounding_boxes": [],
        "fallback": True,
        "message": "OCR service unavailable, using fallback"
    }

async def screenshot_fallback(*args, **kwargs) -> Dict[str, Any]:
    """Fallback für Screenshot-Service"""
    app_logger.info("Using screenshot fallback - returning placeholder")
    return {
        "image_data": None,
        "width": 0,
        "height": 0,
        "fallback": True,
        "message": "Screenshot service unavailable, using fallback"
    }

async def workflow_execution_fallback(*args, **kwargs) -> Dict[str, Any]:
    """Fallback für Workflow-Ausführung"""
    app_logger.info("Using workflow execution fallback")
    return {
        "status": "failed",
        "message": "Workflow execution service unavailable",
        "fallback": True,
        "steps_executed": 0
    }
```
```

## Testing Error Scenarios

### Unit Tests für Error Handling

```python
# backend/tests/test_error_handling.py
import pytest
import asyncio
from unittest.mock import Mock, patch
from app.core.exceptions import (
    ValidationError, AuthenticationError, WorkflowExecutionError,
    ExternalServiceError, DatabaseError
)
from app.core.retry import retry_async, RetryConfig, QUICK_RETRY
from app.core.circuit_breaker import CircuitBreaker, CircuitState
from app.services.monitoring_service import ErrorMonitoringService

class TestErrorHandling:
    """Tests für Error-Handling Mechanismen"""
    
    def test_validation_error_creation(self):
        """Test ValidationError Erstellung"""
        error = ValidationError(
            message="Invalid email format",
            field="email",
            value="invalid-email"
        )
        
        assert error.error_code == "VAL_001"
        assert error.message == "Invalid email format"
        assert error.details["field"] == "email"
        assert error.details["value"] == "invalid-email"
        assert error.severity.value == "medium"
    
    def test_authentication_error_creation(self):
        """Test AuthenticationError Erstellung"""
        error = AuthenticationError(
            message="Invalid credentials",
            user_id="user123"
        )
        
        assert error.error_code == "AUTH_001"
        assert error.message == "Invalid credentials"
        assert error.details["user_id"] == "user123"
        assert error.severity.value == "high"
    
    def test_workflow_execution_error_creation(self):
        """Test WorkflowExecutionError Erstellung"""
        error = WorkflowExecutionError(
            message="Step execution failed",
            workflow_id="wf_123",
            step_id="step_5",
            step_type="click"
        )
        
        assert error.error_code == "WF_002"
        assert error.message == "Step execution failed"
        assert error.details["workflow_id"] == "wf_123"
        assert error.details["step_id"] == "step_5"
        assert error.details["step_type"] == "click"
    
    @pytest.mark.asyncio
    async def test_retry_mechanism_success_after_failure(self):
        """Test Retry-Mechanismus bei Erfolg nach Fehlern"""
        call_count = 0
        
        @retry_async(QUICK_RETRY)
        async def failing_function():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ConnectionError("Connection failed")
            return "success"
        
        result = await failing_function()
        assert result == "success"
        assert call_count == 3
    
    @pytest.mark.asyncio
    async def test_retry_mechanism_permanent_failure(self):
        """Test Retry-Mechanismus bei permanentem Fehler"""
        call_count = 0
        
        @retry_async(QUICK_RETRY)
        async def always_failing_function():
            nonlocal call_count
            call_count += 1
            raise ConnectionError("Always fails")
        
        with pytest.raises(ConnectionError):
            await always_failing_function()
        
        assert call_count == QUICK_RETRY.max_attempts
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_opens_after_failures(self):
        """Test Circuit Breaker öffnet nach Fehlern"""
        breaker = CircuitBreaker(
            failure_threshold=3,
            recovery_timeout=1.0,
            expected_exception=ConnectionError,
            name="test_breaker"
        )
        
        async def failing_function():
            raise ConnectionError("Service unavailable")
        
        # Erste 3 Aufrufe sollten fehlschlagen und Circuit öffnen
        for i in range(3):
            with pytest.raises(ConnectionError):
                await breaker.call(failing_function)
        
        assert breaker.state == CircuitState.OPEN
        
        # Nächster Aufruf sollte sofort fehlschlagen (Circuit offen)
        with pytest.raises(ExternalServiceError):
            await breaker.call(failing_function)
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_recovery(self):
        """Test Circuit Breaker Recovery"""
        breaker = CircuitBreaker(
            failure_threshold=2,
            recovery_timeout=0.1,  # Kurze Recovery-Zeit für Test
            expected_exception=ConnectionError,
            name="test_breaker"
        )
        
        call_count = 0
        
        async def sometimes_failing_function():
            nonlocal call_count
            call_count += 1
            if call_count <= 2:
                raise ConnectionError("Service unavailable")
            return "success"
        
        # Circuit öffnen
        for i in range(2):
            with pytest.raises(ConnectionError):
                await breaker.call(sometimes_failing_function)
        
        assert breaker.state == CircuitState.OPEN
        
        # Warten auf Recovery
        await asyncio.sleep(0.2)
        
        # Erfolgreicher Aufruf sollte Circuit schließen
        result = await breaker.call(sometimes_failing_function)
        assert result == "success"
        assert breaker.state == CircuitState.CLOSED
    
    @pytest.mark.asyncio
    async def test_error_monitoring_service(self):
        """Test Error Monitoring Service"""
        monitor = ErrorMonitoringService()
        
        # Fehler aufzeichnen
        error1 = ValidationError("Test error 1", field="test")
        error2 = AuthenticationError("Test error 2", user_id="user1")
        
        await monitor.record_error(error1)
        await monitor.record_error(error2)
        
        # Statistiken prüfen
        stats = monitor.get_error_statistics(hours=1)
        assert stats["total_errors"] == 2
        assert stats["by_severity"]["medium"] == 1  # ValidationError
        assert stats["by_severity"]["high"] == 1    # AuthenticationError
        
        # Top Errors prüfen
        top_errors = monitor.get_top_errors(limit=5)
        assert len(top_errors) == 2
        assert any(err["error_code"] == "VAL_001" for err in top_errors)
        assert any(err["error_code"] == "AUTH_001" for err in top_errors)

class TestErrorIntegration:
    """Integration Tests für Error-Handling"""
    
    @pytest.mark.asyncio
    async def test_api_error_response_format(self):
        """Test API Error Response Format"""
        from fastapi.testclient import TestClient
        from app.main import create_app
        
        app = create_app()
        client = TestClient(app)
        
        # Test mit ungültigen Daten
        response = client.post(
            "/api/workflows",
            json={"invalid": "data"}
        )
        
        assert response.status_code == 422
        error_data = response.json()
        
        assert "error" in error_data
        assert "code" in error_data["error"]
        assert "message" in error_data["error"]
        assert "category" in error_data["error"]
        assert "severity" in error_data["error"]
        assert "trace_id" in error_data["error"]
    
    @pytest.mark.asyncio
    async def test_database_error_handling(self):
        """Test Database Error Handling"""
        with patch('app.database.get_db') as mock_db:
            # Simuliere DB-Fehler
            mock_db.side_effect = Exception("Database connection failed")
            
            from app.services.workflow_service import WorkflowService
            service = WorkflowService()
            
            with pytest.raises(DatabaseError):
                await service.get_workflow("test_id")
    
    @pytest.mark.asyncio
    async def test_external_service_error_handling(self):
        """Test External Service Error Handling"""
        with patch('aiohttp.ClientSession.post') as mock_post:
            # Simuliere Service-Fehler
            mock_response = Mock()
            mock_response.status = 500
            mock_response.text.return_value = asyncio.coroutine(lambda: "Internal Server Error")()
            mock_post.return_value.__aenter__.return_value = mock_response
            
            from app.services.ocr_service import OCRService
            service = OCRService()
            
            with pytest.raises(ExternalServiceError):
                await service.extract_text(b"fake_image_data")

# Pytest Fixtures
@pytest.fixture
def mock_logger():
    """Mock Logger für Tests"""
    with patch('app.core.logging.app_logger') as mock:
        yield mock

@pytest.fixture
def error_monitor():
    """Error Monitor für Tests"""
    return ErrorMonitoringService()

@pytest.fixture
async def circuit_breaker():
    """Circuit Breaker für Tests"""
    return CircuitBreaker(
        failure_threshold=3,
        recovery_timeout=1.0,
        name="test_breaker"
    )
```

### Frontend Error Testing

```typescript
// src/components/__tests__/ErrorBoundary.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';
import { ErrorFallback } from '../ErrorFallback';

// Komponente die einen Fehler wirft
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Console.error mocken um Test-Output sauber zu halten
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders error fallback when there is an error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Etwas ist schiefgelaufen')).toBeInTheDocument();
    expect(screen.getByText('Seite neu laden')).toBeInTheDocument();
  });

  it('renders custom fallback component', () => {
    const CustomFallback = () => <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('logs error to console', () => {
    const consoleSpy = jest.spyOn(console, 'error');

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(consoleSpy).toHaveBeenCalled();
  });
});
```

```typescript
// src/hooks/__tests__/useErrorHandler.test.ts
import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from '../useErrorHandler';
import { toast } from 'sonner';

// Toast mocken
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn()
  }
}));

describe('useErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles API errors correctly', () => {
    const { result } = renderHook(() => useErrorHandler());

    const apiError = {
      response: {
        status: 400,
        data: {
          error: {
            code: 'VAL_001',
            message: 'Validation failed',
            category: 'validation'
          }
        }
      }
    };

    act(() => {
      result.current.handleError(apiError);
    });

    expect(toast.error).toHaveBeenCalledWith(
      'Validation failed',
      expect.objectContaining({
        description: 'Error Code: VAL_001'
      })
    );
  });

  it('handles network errors', () => {
    const { result } = renderHook(() => useErrorHandler());

    const networkError = {
      code: 'NETWORK_ERROR',
      message: 'Network Error'
    };

    act(() => {
      result.current.handleError(networkError);
    });

    expect(toast.error).toHaveBeenCalledWith(
      'Netzwerkfehler. Bitte prüfen Sie Ihre Internetverbindung.'
    );
  });

  it('handles unknown errors', () => {
    const { result } = renderHook(() => useErrorHandler());

    const unknownError = new Error('Unknown error');

    act(() => {
      result.current.handleError(unknownError);
    });

    expect(toast.error).toHaveBeenCalledWith(
      'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'
    );
  });

  it('retries failed operations', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const mockOperation = jest.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValueOnce('Success');

    let retryResult;
    await act(async () => {
      retryResult = await result.current.retryOperation(mockOperation, 2);
    });

    expect(mockOperation).toHaveBeenCalledTimes(2);
    expect(retryResult).toBe('Success');
  });
});
```

## Best Practices

### Error Handling Guidelines

1. **Fail Fast Principle**
   - Fehler so früh wie möglich erkennen und behandeln
   - Input-Validierung an den Systemgrenzen
   - Defensive Programmierung

2. **Structured Error Information**
   - Konsistente Error-Codes verwenden
   - Strukturierte Error-Details bereitstellen
   - Trace-IDs für Debugging

3. **User-Friendly Messages**
   - Technische Details vor Benutzern verbergen
   - Klare, verständliche Fehlermeldungen
   - Handlungsempfehlungen geben

4. **Logging Strategy**
   - Strukturiertes Logging verwenden
   - Angemessene Log-Level wählen
   - Sensitive Daten nicht loggen

5. **Recovery Mechanisms**
   - Retry-Strategien für transiente Fehler
   - Circuit Breaker für externe Services
   - Graceful Degradation implementieren

### Error Prevention

```python
# backend/app/core/validation.py
from typing import Any, Dict, List, Optional, Type, Union
from pydantic import BaseModel, validator, ValidationError as PydanticValidationError
from app.core.exceptions import ValidationError

class StrictValidationMixin:
    """Mixin für strenge Validierung"""
    
    @classmethod
    def validate_and_create(cls, data: Dict[str, Any]):
        """Validierung mit besseren Fehlermeldungen"""
        try:
            return cls(**data)
        except PydanticValidationError as e:
            # Pydantic Fehler in unsere ValidationError umwandeln
            errors = []
            for error in e.errors():
                field = '.'.join(str(loc) for loc in error['loc'])
                errors.append({
                    'field': field,
                    'message': error['msg'],
                    'value': error.get('input')
                })
            
            raise ValidationError(
                message=f"Validation failed for {len(errors)} field(s)",
                field="multiple" if len(errors) > 1 else errors[0]['field'],
                validation_errors=errors
            )

class WorkflowStepModel(BaseModel, StrictValidationMixin):
    """Validiertes Workflow-Step Model"""
    
    step_type: str
    coordinates: Optional[Dict[str, int]] = None
    text_input: Optional[str] = None
    wait_time: Optional[float] = None
    
    @validator('step_type')
    def validate_step_type(cls, v):
        allowed_types = ['click', 'type', 'wait', 'screenshot', 'scroll']
        if v not in allowed_types:
            raise ValueError(f'step_type must be one of {allowed_types}')
        return v
    
    @validator('coordinates')
    def validate_coordinates(cls, v, values):
        if values.get('step_type') == 'click' and not v:
            raise ValueError('coordinates required for click steps')
        if v and ('x' not in v or 'y' not in v):
            raise ValueError('coordinates must contain x and y values')
        if v and (v['x'] < 0 or v['y'] < 0):
            raise ValueError('coordinates must be positive')
        return v
    
    @validator('text_input')
    def validate_text_input(cls, v, values):
        if values.get('step_type') == 'type' and not v:
            raise ValueError('text_input required for type steps')
        return v
    
    @validator('wait_time')
    def validate_wait_time(cls, v, values):
        if values.get('step_type') == 'wait' and v is None:
            raise ValueError('wait_time required for wait steps')
        if v is not None and v < 0:
            raise ValueError('wait_time must be positive')
        if v is not None and v > 300:  # Max 5 Minuten
            raise ValueError('wait_time cannot exceed 300 seconds')
        return v

# Defensive Programming Beispiele
def safe_divide(a: float, b: float) -> float:
    """Sichere Division mit Error Handling"""
    if not isinstance(a, (int, float)) or not isinstance(b, (int, float)):
        raise ValidationError(
            message="Division arguments must be numbers",
            field="arguments",
            value={"a": a, "b": b}
        )
    
    if b == 0:
        raise ValidationError(
            message="Division by zero is not allowed",
            field="divisor",
            value=b
        )
    
    return a / b

def safe_list_access(lst: List[Any], index: int, default: Any = None) -> Any:
    """Sicherer Listen-Zugriff"""
    if not isinstance(lst, list):
        raise ValidationError(
            message="Expected list type",
            field="list",
            value=type(lst).__name__
        )
    
    if not isinstance(index, int):
        raise ValidationError(
            message="Index must be integer",
            field="index",
            value=index
        )
    
    if index < 0 or index >= len(lst):
        if default is not None:
            return default
        raise ValidationError(
            message=f"Index {index} out of range for list of length {len(lst)}",
            field="index",
            value=index
        )
    
    return lst[index]

def safe_dict_access(d: Dict[str, Any], key: str, default: Any = None) -> Any:
    """Sicherer Dictionary-Zugriff"""
    if not isinstance(d, dict):
        raise ValidationError(
            message="Expected dictionary type",
            field="dict",
            value=type(d).__name__
        )
    
    if not isinstance(key, str):
        raise ValidationError(
            message="Key must be string",
            field="key",
            value=key
        )
    
    if key not in d:
        if default is not None:
            return default
        raise ValidationError(
            message=f"Key '{key}' not found in dictionary",
            field="key",
            value=key,
            available_keys=list(d.keys())
        )
    
    return d[key]
```

### Performance Considerations

```python
# backend/app/core/performance.py
import time
import asyncio
from typing import Callable, Any
from functools import wraps
from app.core.logging import app_logger
from app.core.exceptions import PerformanceError

def performance_monitor(
    max_execution_time: float = 30.0,
    log_slow_operations: bool = True,
    slow_threshold: float = 5.0
):
    """Performance Monitoring Decorator"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            start_time = time.time()
            
            try:
                # Timeout für lange Operationen
                result = await asyncio.wait_for(
                    func(*args, **kwargs),
                    timeout=max_execution_time
                )
                
                execution_time = time.time() - start_time
                
                # Langsame Operationen loggen
                if log_slow_operations and execution_time > slow_threshold:
                    app_logger.warning(
                        f"Slow operation detected: {func.__name__}",
                        function=func.__name__,
                        execution_time=execution_time,
                        threshold=slow_threshold
                    )
                
                return result
                
            except asyncio.TimeoutError:
                execution_time = time.time() - start_time
                app_logger.error(
                    f"Operation timeout: {func.__name__}",
                    function=func.__name__,
                    execution_time=execution_time,
                    max_time=max_execution_time
                )
                raise PerformanceError(
                    message=f"Operation {func.__name__} exceeded maximum execution time",
                    operation=func.__name__,
                    execution_time=execution_time,
                    max_time=max_execution_time
                )
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time
                
                # Timeout prüfen
                if execution_time > max_execution_time:
                    raise PerformanceError(
                        message=f"Operation {func.__name__} exceeded maximum execution time",
                        operation=func.__name__,
                        execution_time=execution_time,
                        max_time=max_execution_time
                    )
                
                # Langsame Operationen loggen
                if log_slow_operations and execution_time > slow_threshold:
                    app_logger.warning(
                        f"Slow operation detected: {func.__name__}",
                        function=func.__name__,
                        execution_time=execution_time,
                        threshold=slow_threshold
                    )
                
                return result
                
            except Exception as e:
                execution_time = time.time() - start_time
                app_logger.error(
                    f"Operation failed: {func.__name__}",
                    function=func.__name__,
                    execution_time=execution_time,
                    error=e
                )
                raise
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator
```

## Zusammenfassung

Diese umfassende Error-Handling und Logging-Dokumentation bietet eine solide Grundlage für die Fehlerbehandlung im Trusted Login System. Sie umfasst:

### Kernkomponenten
- **Strukturierte Fehlerklassen** mit konsistenten Error-Codes
- **Umfassendes Logging-System** mit strukturierten Logs
- **API Error-Handling** mit standardisierten Response-Formaten
- **Frontend Error-Boundaries** für React-Komponenten
- **Monitoring & Alerting** für proaktive Fehlererkennung

### Recovery-Mechanismen
- **Retry-Strategien** für transiente Fehler
- **Circuit Breaker Pattern** für externe Services
- **Graceful Degradation** für Service-Ausfälle
- **Performance Monitoring** für Timeout-Behandlung

### Testing & Quality
- **Umfassende Unit Tests** für alle Error-Szenarien
- **Integration Tests** für API Error-Handling
- **Frontend Error Testing** mit React Testing Library
- **Best Practices** für Error Prevention

### Implementierungsrichtlinien
1. **Fail Fast** - Fehler früh erkennen und behandeln
2. **Structured Errors** - Konsistente Error-Codes und Details
3. **User-Friendly** - Verständliche Fehlermeldungen für Benutzer
4. **Comprehensive Logging** - Strukturierte Logs für Debugging
5. **Proactive Monitoring** - Alerting für kritische Fehler
6. **Graceful Recovery** - Fallback-Strategien für Service-Ausfälle

Diese Dokumentation stellt sicher, dass das Trusted Login System robust, wartbar und benutzerfreundlich ist, auch wenn Fehler auftreten.