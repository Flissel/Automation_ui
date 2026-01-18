#!/usr/bin/env python3
"""
OCR Configuration Management
Provides centralized configuration for OCR services with validation and environment support
"""

import logging
import os
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


class OCREngine(str, Enum):
    """Supported OCR engines"""

    TESSERACT = "tesseract"
    EASYOCR = "easyocr"
    PADDLEOCR = "paddleocr"


class PreprocessingMode(str, Enum):
    """Image preprocessing modes"""

    ADAPTIVE_THRESHOLD = "adaptive_threshold"
    GAUSSIAN_BLUR = "gaussian_blur"
    MORPHOLOGICAL = "morphological"
    COMBINED = "combined"
    NONE = "none"


class PSMMode(int, Enum):
    """Tesseract Page Segmentation Modes"""

    OSD_ONLY = 0
    AUTO_OSD = 1
    AUTO_ONLY = 2
    AUTO = 3
    SINGLE_COLUMN = 4
    SINGLE_BLOCK_VERT = 5
    SINGLE_BLOCK = 6
    SINGLE_LINE = 7
    SINGLE_WORD = 8
    CIRCLE_WORD = 9
    SINGLE_CHAR = 10
    SPARSE_TEXT = 11
    SPARSE_TEXT_OSD = 12
    RAW_LINE = 13


class OCRServiceConfig(BaseSettings):
    """OCR Service Configuration"""

    # Core OCR settings
    engine: OCREngine = Field(
        default=OCREngine.TESSERACT, description="OCR engine to use"
    )
    default_language: str = Field(default="eng", description="Default OCR language")
    supported_languages: List[str] = Field(
        default=["eng", "deu", "fra", "spa", "ita", "rus", "chi_sim", "jpn"],
        description="List of supported OCR languages",
    )

    # Quality and performance settings
    confidence_threshold: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Minimum confidence threshold for OCR results",
    )
    preprocessing_mode: PreprocessingMode = Field(
        default=PreprocessingMode.ADAPTIVE_THRESHOLD,
        description="Image preprocessing mode",
    )
    psm_mode: PSMMode = Field(
        default=PSMMode.SINGLE_BLOCK, description="Tesseract page segmentation mode"
    )

    # Performance settings
    max_concurrent_requests: int = Field(
        default=5, ge=1, le=20, description="Maximum concurrent OCR requests"
    )
    request_timeout: float = Field(
        default=30.0, ge=1.0, le=300.0, description="OCR request timeout in seconds"
    )
    cache_enabled: bool = Field(default=True, description="Enable OCR result caching")
    cache_ttl: int = Field(
        default=300, ge=60, le=3600, description="Cache TTL in seconds"
    )

    # Image processing settings
    max_image_size: int = Field(
        default=4096, ge=512, le=8192, description="Maximum image dimension in pixels"
    )
    image_quality: int = Field(
        default=95, ge=50, le=100, description="Image quality for processing (1-100)"
    )

    # Tesseract specific settings
    tesseract_cmd: Optional[str] = Field(
        default=None, description="Path to tesseract executable"
    )
    tesseract_config: str = Field(
        default="--oem 3", description="Additional tesseract configuration"
    )

    # Monitoring and logging
    enable_performance_monitoring: bool = Field(
        default=True, description="Enable performance monitoring"
    )
    log_level: str = Field(default="INFO", description="Logging level for OCR service")

    @field_validator("supported_languages")
    @classmethod
    def validate_languages(cls, v):
        """Validate supported languages list"""
        if not v or len(v) == 0:
            raise ValueError("At least one language must be supported")
        return v

    @field_validator("default_language")
    @classmethod
    def validate_default_language(cls, v, info):
        """Validate default language is in supported languages"""
        # In Pydantic v2, access other field values through info.data
        supported = info.data.get(
            "supported_languages",
            ["eng", "deu", "fra", "spa", "ita", "rus", "chi_sim", "jpn"],
        )
        if v not in supported:
            raise ValueError(f"Default language '{v}' must be in supported languages")
        return v

    class Config:
        env_prefix = "OCR_"
        case_sensitive = False
        env_file = ".env"
        env_file_encoding = "utf-8"


class OCRMonitoringConfig(BaseSettings):
    """OCR Monitoring Service Configuration"""

    # Webhook settings
    webhook_url: str = Field(default="", description="Webhook URL for notifications")
    webhook_timeout: float = Field(
        default=10.0, ge=1.0, le=60.0, description="Webhook request timeout in seconds"
    )
    webhook_retry_count: int = Field(
        default=3, ge=0, le=10, description="Number of webhook retry attempts"
    )
    webhook_retry_delay: float = Field(
        default=5.0,
        ge=1.0,
        le=30.0,
        description="Delay between webhook retries in seconds",
    )

    # Monitoring settings
    monitoring_interval: float = Field(
        default=30.0, ge=1.0, le=300.0, description="Monitoring interval in seconds"
    )
    similarity_threshold: float = Field(
        default=0.85,
        ge=0.0,
        le=1.0,
        description="Text similarity threshold for change detection",
    )
    enabled: bool = Field(default=True, description="Enable OCR monitoring")

    # OCR settings for monitoring
    ocr_language: str = Field(
        default="eng+deu", description="OCR language for monitoring"
    )
    ocr_confidence_threshold: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="OCR confidence threshold for monitoring",
    )

    # Performance settings
    max_monitoring_regions: int = Field(
        default=10, ge=1, le=50, description="Maximum number of monitoring regions"
    )

    class Config:
        env_prefix = "OCR_MONITORING_"
        case_sensitive = False
        env_file = ".env"
        env_file_encoding = "utf-8"


class ConfigManager:
    """Configuration manager for OCR services"""

    def __init__(self):
        self._ocr_config: Optional[OCRServiceConfig] = None
        self._monitoring_config: Optional[OCRMonitoringConfig] = None
        self._initialized = False

    def initialize(self) -> None:
        """Initialize configuration manager"""
        try:
            self._ocr_config = OCRServiceConfig()
            self._monitoring_config = OCRMonitoringConfig()
            self._initialized = True
            logger.info("Configuration manager initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize configuration manager: {e}")
            raise

    @property
    def ocr(self) -> OCRServiceConfig:
        """Get OCR service configuration"""
        if not self._initialized or not self._ocr_config:
            raise RuntimeError("Configuration manager not initialized")
        return self._ocr_config

    @property
    def monitoring(self) -> OCRMonitoringConfig:
        """Get OCR monitoring configuration"""
        if not self._initialized or not self._monitoring_config:
            raise RuntimeError("Configuration manager not initialized")
        return self._monitoring_config

    def reload(self) -> None:
        """Reload configuration from environment"""
        logger.info("Reloading configuration")
        self.initialize()

    def get_tesseract_config(self) -> str:
        """Get complete tesseract configuration string"""
        config_parts = [self.ocr.tesseract_config]
        config_parts.append(f"--psm {self.ocr.psm_mode.value}")
        config_parts.append(f"-l {self.ocr.default_language}")
        return " ".join(config_parts)

    def validate_environment(self) -> Dict[str, Any]:
        """Validate environment configuration"""
        validation_results = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "config_summary": {},
        }

        try:
            # Validate OCR configuration
            ocr_config = self.ocr
            validation_results["config_summary"]["ocr"] = {
                "engine": ocr_config.engine.value,
                "default_language": ocr_config.default_language,
                "supported_languages_count": len(ocr_config.supported_languages),
                "confidence_threshold": ocr_config.confidence_threshold,
                "cache_enabled": ocr_config.cache_enabled,
            }

            # Validate monitoring configuration
            monitoring_config = self.monitoring
            validation_results["config_summary"]["monitoring"] = {
                "enabled": monitoring_config.enabled,
                "webhook_configured": bool(monitoring_config.webhook_url),
                "monitoring_interval": monitoring_config.monitoring_interval,
                "similarity_threshold": monitoring_config.similarity_threshold,
            }

            # Check for potential issues
            if not monitoring_config.webhook_url and monitoring_config.enabled:
                validation_results["warnings"].append(
                    "Monitoring is enabled but no webhook URL is configured"
                )

            if ocr_config.confidence_threshold < 0.5:
                validation_results["warnings"].append(
                    "OCR confidence threshold is very low, may result in poor quality text"
                )

        except Exception as e:
            validation_results["valid"] = False
            validation_results["errors"].append(f"Configuration validation failed: {e}")

        return validation_results


# Global configuration manager instance
config_manager = ConfigManager()


def get_config() -> ConfigManager:
    """Get global configuration manager instance"""
    if not config_manager._initialized:
        config_manager.initialize()
    return config_manager
