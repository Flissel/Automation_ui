#!/usr/bin/env python3
"""
End-to-End Integration Tests for TRAE Remote Desktop System
Comprehensive testing for localhost environments using Playwright

Author: TRAE Development Team
Version: 1.0.0
"""

import pytest
import asyncio
import time
import json
import base64
from pathlib import Path
from typing import Dict, Any, Optional
from playwright.async_api import async_playwright, Page, Browser, BrowserContext
from PIL import Image
import io

# Import test utilities
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from playwright_config import TEST_CONFIG, get_test_config


class TRAELocalhostE2ETests:
    """End-to-end tests for TRAE Remote Desktop System on localhost"""
    
    def __init__(self):
        self.config = get_test_config()
        self.frontend_url = self.config["frontend_url"]
        self.backend_url = self.config["backend_url"]
        self.test_data_dir = Path(self.config["test_data_dir"])
        
    @pytest.fixture(scope="class")
    async def browser_context(self):
        """Create browser context for tests"""
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=self.config["headless"],
                slow_mo=self.config["slow_mo"]
            )
            
            context = await browser.new_context(
                viewport=self.config["viewport"],
                ignore_https_errors=True,
                record_video_dir=self.config["videos_dir"] if self.config["video_on_failure"] else None,
                record_video_size=self.config["viewport"]
            )
            
            # Enable tracing for debugging
            if self.config["trace_on_failure"]:
                await context.tracing.start(screenshots=True, snapshots=True)
            
            yield context
            
            # Cleanup
            if self.config["trace_on_failure"]:
                await context.tracing.stop(path=f"{self.config['traces_dir']}/trace.zip")
            
            await context.close()
            await browser.close()
    
    @pytest.fixture
    async def page(self, browser_context):
        """Create a new page for each test"""
        page = await browser_context.new_page()
        
        # Set timeouts
        page.set_default_timeout(self.config["action_timeout"])
        page.set_default_navigation_timeout(self.config["navigation_timeout"])
        
        yield page
        
        await page.close()
    
    @pytest.mark.e2e
    @pytest.mark.localhost
    async def test_frontend_loads_successfully(self, page: Page):
        """Test that the frontend loads successfully"""
        # Navigate to frontend
        response = await page.goto(self.frontend_url)
        assert response.status == 200
        
        # Wait for main content to load
        await page.wait_for_selector('[data-testid="main-content"]', timeout=10000)
        
        # Check page title
        title = await page.title()
        assert "TRAE" in title
        
        # Take screenshot for verification
        await page.screenshot(path=f"{self.config['screenshots_dir']}/frontend_loaded.png")
    
    @pytest.mark.e2e
    @pytest.mark.localhost
    async def test_backend_health_check(self, page: Page):
        """Test backend health endpoint"""
        # Navigate to backend health endpoint
        response = await page.goto(f"{self.backend_url}/api/health")
        assert response.status == 200
        
        # Check response content
        content = await page.content()
        assert "status" in content.lower()
    
    @pytest.mark.e2e
    @pytest.mark.localhost
    @pytest.mark.ui
    async def test_node_system_interface(self, page: Page):
        """Test the visual node system interface"""
        await page.goto(self.frontend_url)
        
        # Wait for node system to load
        await page.wait_for_selector('[data-testid="node-canvas"]', timeout=15000)
        
        # Check if node palette is visible
        node_palette = page.locator('[data-testid="node-palette"]')
        await node_palette.wait_for(state="visible")
        
        # Test adding a node
        snapshot_node = page.locator('[data-testid="node-snapshot-creator"]')
        if await snapshot_node.count() > 0:
            await snapshot_node.click()
            
            # Verify node was added to canvas
            canvas_nodes = page.locator('[data-testid="node-canvas"] .react-flow__node')
            await canvas_nodes.first.wait_for(state="visible")
        
        await page.screenshot(path=f"{self.config['screenshots_dir']}/node_system.png")
    
    @pytest.mark.e2e
    @pytest.mark.localhost
    @pytest.mark.snapshot
    async def test_snapshot_creation_workflow(self, page: Page):
        """Test complete snapshot creation workflow"""
        await page.goto(self.frontend_url)
        
        # Navigate to snapshot section
        await page.wait_for_selector('[data-testid="main-navigation"]')
        
        # Look for snapshot or desktop menu item
        snapshot_nav = page.locator('text="Snapshots"').or_(page.locator('text="Desktop"'))
        if await snapshot_nav.count() > 0:
            await snapshot_nav.click()
            
            # Wait for snapshot interface
            await page.wait_for_selector('[data-testid="snapshot-interface"]', timeout=10000)
            
            # Test snapshot capture button
            capture_btn = page.locator('[data-testid="capture-snapshot"]').or_(
                page.locator('button:has-text("Take Screenshot")')
            )
            
            if await capture_btn.count() > 0:
                await capture_btn.click()
                
                # Wait for snapshot to be captured
                await page.wait_for_timeout(2000)
                
                # Check if snapshot appears in the interface
                snapshot_preview = page.locator('[data-testid="snapshot-preview"]').or_(
                    page.locator('img[alt*="snapshot"]')
                )
                
                if await snapshot_preview.count() > 0:
                    await snapshot_preview.wait_for(state="visible")
        
        await page.screenshot(path=f"{self.config['screenshots_dir']}/snapshot_workflow.png")
    
    @pytest.mark.e2e
    @pytest.mark.localhost
    @pytest.mark.ocr
    async def test_ocr_zone_design_workflow(self, page: Page):
        """Test OCR zone design and execution workflow"""
        await page.goto(self.frontend_url)
        
        # Wait for interface to load
        await page.wait_for_selector('[data-testid="main-content"]')
        
        # Look for OCR-related interface elements
        ocr_section = page.locator('text="OCR"').or_(page.locator('[data-testid="ocr-section"]'))
        
        if await ocr_section.count() > 0:
            await ocr_section.click()
            
            # Wait for OCR interface
            await page.wait_for_timeout(1000)
            
            # Test OCR zone creation if interface is available
            zone_creator = page.locator('[data-testid="create-ocr-zone"]').or_(
                page.locator('button:has-text("Create Zone")')
            )
            
            if await zone_creator.count() > 0:
                await zone_creator.click()
                
                # Test zone configuration
                await page.wait_for_timeout(1000)
                
                # Look for zone configuration options
                language_select = page.locator('select[name="language"]').or_(
                    page.locator('[data-testid="language-select"]')
                )
                
                if await language_select.count() > 0:
                    await language_select.select_option("eng")
        
        await page.screenshot(path=f"{self.config['screenshots_dir']}/ocr_workflow.png")
    
    @pytest.mark.e2e
    @pytest.mark.localhost
    @pytest.mark.automation
    async def test_click_automation_workflow(self, page: Page):
        """Test click automation setup and execution"""
        await page.goto(self.frontend_url)
        
        # Wait for main interface
        await page.wait_for_selector('[data-testid="main-content"]')
        
        # Look for automation or click-related interface
        automation_section = page.locator('text="Automation"').or_(
            page.locator('[data-testid="automation-section"]')
        )
        
        if await automation_section.count() > 0:
            await automation_section.click()
            
            # Wait for automation interface
            await page.wait_for_timeout(1000)
            
            # Test click action creation
            click_creator = page.locator('[data-testid="create-click-action"]').or_(
                page.locator('button:has-text("Add Click")')
            )
            
            if await click_creator.count() > 0:
                await click_creator.click()
                
                # Test click configuration
                await page.wait_for_timeout(1000)
                
                # Look for click configuration options
                click_type = page.locator('select[name="clickType"]').or_(
                    page.locator('[data-testid="click-type-select"]')
                )
                
                if await click_type.count() > 0:
                    await click_type.select_option("single")
        
        await page.screenshot(path=f"{self.config['screenshots_dir']}/automation_workflow.png")
    
    @pytest.mark.e2e
    @pytest.mark.localhost
    async def test_workflow_execution(self, page: Page):
        """Test complete workflow execution"""
        await page.goto(self.frontend_url)
        
        # Wait for interface to load
        await page.wait_for_selector('[data-testid="main-content"]')
        
        # Look for workflow execution controls
        execute_btn = page.locator('[data-testid="execute-workflow"]').or_(
            page.locator('button:has-text("Execute")')
        ).or_(page.locator('button:has-text("Run")'))
        
        if await execute_btn.count() > 0:
            await execute_btn.click()
            
            # Wait for execution to start
            await page.wait_for_timeout(2000)
            
            # Look for execution status indicators
            status_indicator = page.locator('[data-testid="execution-status"]').or_(
                page.locator('.execution-status')
            )
            
            if await status_indicator.count() > 0:
                await status_indicator.wait_for(state="visible")
        
        await page.screenshot(path=f"{self.config['screenshots_dir']}/workflow_execution.png")
    
    @pytest.mark.e2e
    @pytest.mark.localhost
    async def test_websocket_connection(self, page: Page):
        """Test WebSocket connection for real-time updates"""
        await page.goto(self.frontend_url)
        
        # Wait for page to load
        await page.wait_for_selector('[data-testid="main-content"]')
        
        # Check WebSocket connection status in browser console
        console_messages = []
        
        def handle_console(msg):
            console_messages.append(msg.text)
        
        page.on("console", handle_console)
        
        # Wait for potential WebSocket connections
        await page.wait_for_timeout(3000)
        
        # Look for WebSocket-related console messages or UI indicators
        connection_status = page.locator('[data-testid="connection-status"]').or_(
            page.locator('.connection-indicator')
        )
        
        # Take screenshot of final state
        await page.screenshot(path=f"{self.config['screenshots_dir']}/websocket_test.png")
    
    @pytest.mark.e2e
    @pytest.mark.localhost
    async def test_error_handling(self, page: Page):
        """Test error handling and user feedback"""
        await page.goto(self.frontend_url)
        
        # Wait for interface to load
        await page.wait_for_selector('[data-testid="main-content"]')
        
        # Test invalid operations to trigger error handling
        # This is a placeholder - specific error scenarios would be added based on the actual UI
        
        # Look for error messages or notifications
        error_container = page.locator('[data-testid="error-message"]').or_(
            page.locator('.error-notification')
        ).or_(page.locator('.toast-error'))
        
        # Take screenshot of error state if any
        await page.screenshot(path=f"{self.config['screenshots_dir']}/error_handling.png")
    
    @pytest.mark.e2e
    @pytest.mark.localhost
    async def test_responsive_design(self, page: Page):
        """Test responsive design across different viewport sizes"""
        viewports = [
            {"width": 1920, "height": 1080},  # Desktop
            {"width": 1366, "height": 768},   # Laptop
            {"width": 768, "height": 1024},   # Tablet
        ]
        
        for i, viewport in enumerate(viewports):
            await page.set_viewport_size(viewport["width"], viewport["height"])
            await page.goto(self.frontend_url)
            
            # Wait for content to load
            await page.wait_for_selector('[data-testid="main-content"]')
            
            # Take screenshot for each viewport
            await page.screenshot(
                path=f"{self.config['screenshots_dir']}/responsive_{viewport['width']}x{viewport['height']}.png"
            )
            
            # Test that main navigation is accessible
            nav = page.locator('[data-testid="main-navigation"]')
            if await nav.count() > 0:
                await nav.wait_for(state="visible")


# Test utility functions
async def wait_for_backend_ready(backend_url: str, timeout: int = 30) -> bool:
    """Wait for backend to be ready"""
    import aiohttp
    
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{backend_url}/api/health") as response:
                    if response.status == 200:
                        return True
        except:
            pass
        
        await asyncio.sleep(1)
    
    return False


async def wait_for_frontend_ready(frontend_url: str, timeout: int = 30) -> bool:
    """Wait for frontend to be ready"""
    import aiohttp
    
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(frontend_url) as response:
                    if response.status == 200:
                        return True
        except:
            pass
        
        await asyncio.sleep(1)
    
    return False


# Pytest configuration for this test module
def pytest_configure(config):
    """Configure pytest for E2E tests"""
    # Ensure screenshot directory exists
    os.makedirs(TEST_CONFIG["screenshots_dir"], exist_ok=True)
    os.makedirs(TEST_CONFIG["videos_dir"], exist_ok=True)
    os.makedirs(TEST_CONFIG["traces_dir"], exist_ok=True)


@pytest.fixture(scope="session", autouse=True)
async def ensure_services_running():
    """Ensure both frontend and backend services are running before tests"""
    config = get_test_config()
    
    # Check if backend is ready
    backend_ready = await wait_for_backend_ready(config["backend_url"])
    if not backend_ready:
        pytest.skip("Backend service not available")
    
    # Check if frontend is ready
    frontend_ready = await wait_for_frontend_ready(config["frontend_url"])
    if not frontend_ready:
        pytest.skip("Frontend service not available")
    
    yield
    
    # Cleanup after all tests
    print("\nE2E tests completed. Check screenshots and videos for results.")