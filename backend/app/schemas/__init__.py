"""Schemas package for TRAE Backend

Provides Pydantic schemas for API request/response validation.
"""

from .node_schemas import (
    NodeConfigSchema,
    ClickActionConfig,
    TypeTextActionConfig,
    HttpRequestConfig,
    WebhookTriggerConfig,
    N8nWebhookConfig,
    OcrRegionConfig,
    IfConditionConfig,
    DelayConfig,
    LoggerConfig,
    ScreenshotActionConfig,
    ManualTriggerConfig,
    WebsocketConfigSchema,
    LiveDesktopConfig
)

__all__ = [
    'NodeConfigSchema',
    'ClickActionConfig',
    'TypeTextActionConfig', 
    'HttpRequestConfig',
    'WebhookTriggerConfig',
    'N8nWebhookConfig',
    'OcrRegionConfig',
    'IfConditionConfig',
    'DelayConfig',
    'LoggerConfig',
    'ScreenshotActionConfig',
    'ManualTriggerConfig',
    'WebsocketConfigSchema',
    'LiveDesktopConfig'
]