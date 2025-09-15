#!/usr/bin/env python3
"""
Playwright Configuration for TRAE Remote Desktop System E2E Tests

Author: TRAE Development Team
Version: 1.0.0
"""

import os
from pathlib import Path
from typing import Dict, Any

# Base configuration
BASE_DIR = Path(__file__).parent.parent.parent
TEST_OUTPUT_DIR = BASE_DIR / "test_output"

# Default test configuration
TEST_CONFIG = {
    # Service URLs
    "frontend_url": "http://localhost:5174",
    "backend_url": "http://localhost:8000",
    
    # Browser settings
    "headless": False,  # Set to True for CI/CD
    "slow_mo": 100,    # Slow down actions for debugging
    
    # Timeouts (in milliseconds)
    "action_timeout": 30000,
    "navigation_timeout": 30000,
    "test_timeout": 60000,
    
    # Viewport settings
    "viewport": {"width": 1280, "height": 720},
    
    # Test output settings
    "screenshots_on_failure": True,
    "video_on_failure": True,
    "trace_on_failure": True,
    
    # Output directories
    "test_output_dir": str(TEST_OUTPUT_DIR),
    "screenshots_dir": str(TEST_OUTPUT_DIR / "screenshots"),
    "videos_dir": str(TEST_OUTPUT_DIR / "videos"),
    "traces_dir": str(TEST_OUTPUT_DIR / "traces"),
    "test_data_dir": str(BASE_DIR / "test_data"),
    
    # Browser configurations
    "browsers": ["chromium", "firefox", "webkit"],
    "default_browser": "chromium",
    
    # Test data
    "test_images_dir": str(BASE_DIR / "test_data" / "images"),
    "test_templates_dir": str(BASE_DIR / "test_data" / "templates"),
}

# Environment-specific overrides
ENVIRONMENT_CONFIGS = {
    "development": {
        "headless": False,
        "slow_mo": 100,
        "frontend_url": "http://localhost:5174",
        "backend_url": "http://localhost:8000",
    },
    "ci": {
        "headless": True,
        "slow_mo": 0,
        "action_timeout": 15000,
        "navigation_timeout": 15000,
        "test_timeout": 30000,
    },
    "production": {
        "headless": True,
        "slow_mo": 0,
        "frontend_url": "https://trae.example.com",
        "backend_url": "https://api.trae.example.com",
    }
}


def get_test_config(environment: str = None) -> Dict[str, Any]:
    """Get test configuration for specified environment"""
    config = TEST_CONFIG.copy()
    
    # Determine environment
    if environment is None:
        environment = os.getenv("TRAE_TEST_ENV", "development")
    
    # Apply environment-specific overrides
    if environment in ENVIRONMENT_CONFIGS:
        config.update(ENVIRONMENT_CONFIGS[environment])
    
    # Apply environment variable overrides
    env_overrides = {
        "frontend_url": os.getenv("TRAE_FRONTEND_URL"),
        "backend_url": os.getenv("TRAE_BACKEND_URL"),
        "headless": os.getenv("TRAE_HEADLESS", "").lower() in ["true", "1", "yes"],
    }
    
    for key, value in env_overrides.items():
        if value is not None:
            config[key] = value
    
    # Ensure output directories exist
    for dir_key in ["test_output_dir", "screenshots_dir", "videos_dir", "traces_dir", "test_data_dir"]:
        os.makedirs(config[dir_key], exist_ok=True)
    
    return config


def get_browser_config(browser_name: str = "chromium") -> Dict[str, Any]:
    """Get browser-specific configuration"""
    base_config = {
        "headless": TEST_CONFIG["headless"],
        "slow_mo": TEST_CONFIG["slow_mo"],
        "args": [
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-web-security",
            "--allow-running-insecure-content",
        ]
    }
    
    browser_specific = {
        "chromium": {
            "args": base_config["args"] + [
                "--disable-blink-features=AutomationControlled",
                "--disable-features=VizDisplayCompositor",
            ]
        },
        "firefox": {
            "firefox_user_prefs": {
                "dom.webdriver.enabled": False,
                "useAutomationExtension": False,
            }
        },
        "webkit": {
            # WebKit-specific settings
        }
    }
    
    config = base_config.copy()
    if browser_name in browser_specific:
        config.update(browser_specific[browser_name])
    
    return config


def get_context_config() -> Dict[str, Any]:
    """Get browser context configuration"""
    config = get_test_config()
    
    return {
        "viewport": config["viewport"],
        "ignore_https_errors": True,
        "accept_downloads": True,
        "record_video_dir": config["videos_dir"] if config["video_on_failure"] else None,
        "record_video_size": config["viewport"],
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "extra_http_headers": {
            "Accept-Language": "en-US,en;q=0.9",
        },
        "permissions": ["clipboard-read", "clipboard-write"],
        "color_scheme": "light",
    }


# Test selectors and data
TEST_SELECTORS = {
    # Main interface
    "main_content": '[data-testid="main-content"]',
    "main_navigation": '[data-testid="main-navigation"]',
    "loading_spinner": '[data-testid="loading"]',
    
    # Node system
    "node_canvas": '[data-testid="node-canvas"]',
    "node_palette": '[data-testid="node-palette"]',
    "node_snapshot_creator": '[data-testid="node-snapshot-creator"]',
    "node_ocr_executor": '[data-testid="node-ocr-executor"]',
    "node_click_executor": '[data-testid="node-click-executor"]',
    
    # Snapshot interface
    "snapshot_interface": '[data-testid="snapshot-interface"]',
    "capture_snapshot": '[data-testid="capture-snapshot"]',
    "snapshot_preview": '[data-testid="snapshot-preview"]',
    "snapshot_list": '[data-testid="snapshot-list"]',
    
    # OCR interface
    "ocr_section": '[data-testid="ocr-section"]',
    "create_ocr_zone": '[data-testid="create-ocr-zone"]',
    "ocr_zone_designer": '[data-testid="ocr-zone-designer"]',
    "language_select": '[data-testid="language-select"]',
    "ocr_results": '[data-testid="ocr-results"]',
    
    # Automation interface
    "automation_section": '[data-testid="automation-controls"]',
    "create_click_action": '[data-testid="create-click-action"]',
    "click_type_select": '[data-testid="click-type-select"]',
    "automation_controls": '[data-testid="automation-controls"]',
    
    # Workflow execution
    "execute_workflow": '[data-testid="execute-workflow"]',
    "execution_status": '[data-testid="execution-status"]',
    "execution_log": '[data-testid="execution-log"]',
    
    # Status and feedback
    "connection_status": '[data-testid="connection-status"]',
    "error_message": '[data-testid="error-message"]',
    "success_message": '[data-testid="success-message"]',
    "notification_container": '[data-testid="notifications"]',
}

# Test data
TEST_DATA = {
    "sample_text": "Hello, TRAE Remote Desktop System!",
    "ocr_languages": ["eng", "deu", "fra", "spa"],
    "click_types": ["single", "double", "right"],
    "test_coordinates": {"x": 100, "y": 100},
    "test_dimensions": {"width": 200, "height": 150},
}

# Export main configuration
__all__ = [
    "TEST_CONFIG",
    "ENVIRONMENT_CONFIGS",
    "TEST_SELECTORS",
    "TEST_DATA",
    "get_test_config",
    "get_browser_config",
    "get_context_config",
]