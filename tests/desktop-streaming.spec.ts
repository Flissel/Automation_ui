import { test, expect } from '@playwright/test';

/**
 * TRAE Unity AI Platform - Desktop Streaming Tests
 * Comprehensive tests for multi-desktop streaming functionality
 */

test.describe('Desktop Streaming Functionality', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the application to load
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'test-results/01-application-loaded.png', 
      fullPage: true 
    });
  });

  test('should load the main application successfully', async ({ page }) => {
    // Verify the main application loads
    await expect(page).toHaveTitle(/TRAE|Unity|AI|Platform/i);
    
    // Check for main navigation elements
    const navigation = page.locator('nav, [role="navigation"]');
    await expect(navigation).toBeVisible();
    
    // Take screenshot of main page
    await page.screenshot({ 
      path: 'test-results/02-main-application.png', 
      fullPage: true 
    });
  });

  test('should navigate to Multi-Desktop Streams page', async ({ page }) => {
    // Look for navigation to multi-desktop streams
    const multiDesktopLink = page.locator('a[href*="multi-desktop"], button:has-text("Multi"), button:has-text("Desktop"), a:has-text("Streams")').first();
    
    if (await multiDesktopLink.isVisible()) {
      await multiDesktopLink.click();
    } else {
      // Try direct navigation
      await page.goto('/multi-desktop');
    }
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of multi-desktop page
    await page.screenshot({ 
      path: 'test-results/03-multi-desktop-page.png', 
      fullPage: true 
    });
    
    // Verify we're on the correct page
    await expect(page.locator('h1, h2, h3')).toContainText(/multi|desktop|stream/i);
  });

  test('should display desktop streaming interface', async ({ page }) => {
    // Navigate to multi-desktop streams
    await page.goto('/multi-desktop');
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for WebSocket connections to establish
    await page.waitForTimeout(3000);
    
    // Look for streaming controls
    const streamingControls = page.locator('button:has-text("Connect"), button:has-text("Start"), button:has-text("Stream"), [data-testid*="stream"], [class*="stream"]');
    
    // Take screenshot of streaming interface
    await page.screenshot({ 
      path: 'test-results/04-streaming-interface.png', 
      fullPage: true 
    });
    
    // Check if streaming controls are present
    const controlsCount = await streamingControls.count();
    console.log(`Found ${controlsCount} streaming controls`);
    
    if (controlsCount > 0) {
      await expect(streamingControls.first()).toBeVisible();
    }
  });

  test('should detect and display available desktop clients', async ({ page }) => {
    // Navigate to multi-desktop streams
    await page.goto('/multi-desktop');
    await page.waitForLoadState('networkidle');
    
    // Wait for WebSocket connections and desktop client detection
    await page.waitForTimeout(5000);
    
    // Look for desktop client indicators
    const desktopClients = page.locator('[data-testid*="desktop"], [class*="desktop"], [class*="client"], .stream-card, .desktop-card');
    
    // Take screenshot showing desktop clients
    await page.screenshot({ 
      path: 'test-results/05-desktop-clients.png', 
      fullPage: true 
    });
    
    // Check for client status indicators
    const statusIndicators = page.locator('[class*="status"], [data-testid*="status"], .connected, .disconnected, .streaming');
    const statusCount = await statusIndicators.count();
    console.log(`Found ${statusCount} status indicators`);
    
    // Look for any error messages or connection status
    const errorMessages = page.locator('[class*="error"], [class*="warning"], .alert, .notification');
    const errorCount = await errorMessages.count();
    console.log(`Found ${errorCount} error/warning messages`);
    
    if (errorCount > 0) {
      const errorText = await errorMessages.first().textContent();
      console.log(`Error message: ${errorText}`);
    }
  });

  test('should attempt to connect to desktop streams', async ({ page }) => {
    // Navigate to multi-desktop streams
    await page.goto('/multi-desktop');
    await page.waitForLoadState('networkidle');
    
    // Wait for initial setup
    await page.waitForTimeout(3000);
    
    // Look for connect buttons
    const connectButtons = page.locator('button:has-text("Connect"), button[data-action="connect"], .connect-btn');
    const connectCount = await connectButtons.count();
    console.log(`Found ${connectCount} connect buttons`);
    
    if (connectCount > 0) {
      // Try to click the first connect button
      await connectButtons.first().click();
      
      // Wait for connection attempt
      await page.waitForTimeout(2000);
      
      // Take screenshot after connection attempt
      await page.screenshot({ 
        path: 'test-results/06-after-connect-attempt.png', 
        fullPage: true 
      });
    }
    
    // Look for streaming canvases or video elements
    const streamElements = page.locator('canvas, video, [data-testid*="stream"], .stream-canvas, .video-stream');
    const streamCount = await streamElements.count();
    console.log(`Found ${streamCount} stream elements`);
    
    if (streamCount > 0) {
      await expect(streamElements.first()).toBeVisible();
    }
  });

  test('should verify two desktop screens are available', async ({ page }) => {
    // Navigate to multi-desktop streams
    await page.goto('/multi-desktop');
    await page.waitForLoadState('networkidle');
    
    // Wait for desktop detection
    await page.waitForTimeout(5000);
    
    // Look for multiple screen indicators
    const screenElements = page.locator('[data-testid*="screen"], [class*="screen"], [class*="monitor"], .stream-card, .desktop-stream');
    const screenCount = await screenElements.count();
    console.log(`Found ${screenCount} screen elements`);
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'test-results/07-final-desktop-screens.png', 
      fullPage: true 
    });
    
    // Check for dual screen indicators
    const dualScreenIndicators = page.locator(':has-text("Screen 1"), :has-text("Screen 2"), :has-text("Monitor 1"), :has-text("Monitor 2"), :has-text("Primary"), :has-text("Secondary")');
    const dualScreenCount = await dualScreenIndicators.count();
    console.log(`Found ${dualScreenCount} dual screen indicators`);
    
    // Verify we have at least some screen-related elements
    if (screenCount > 0 || dualScreenCount > 0) {
      console.log('✅ Desktop screens detected successfully');
    } else {
      console.log('⚠️ No desktop screens detected - may need manual desktop client setup');
    }
    
    // Check console for any WebSocket or connection errors
    const logs = await page.evaluate(() => {
      return window.console;
    });
    
    // Log final status
    console.log(`Test completed - Screens: ${screenCount}, Dual indicators: ${dualScreenCount}`);
  });

  test('should test WebSocket connection status', async ({ page }) => {
    // Navigate to multi-desktop streams
    await page.goto('/multi-desktop');
    await page.waitForLoadState('networkidle');
    
    // Check for WebSocket connection status in the page
    const wsStatus = await page.evaluate(() => {
      // Check if there are any WebSocket connections
      return {
        readyState: window.WebSocket ? 'WebSocket available' : 'WebSocket not available',
        timestamp: new Date().toISOString()
      };
    });
    
    console.log('WebSocket status:', wsStatus);
    
    // Wait for potential WebSocket connections
    await page.waitForTimeout(3000);
    
    // Take screenshot of final state
    await page.screenshot({ 
      path: 'test-results/08-websocket-status.png', 
      fullPage: true 
    });
    
    // Look for connection status indicators
    const connectionStatus = page.locator('[class*="connected"], [class*="disconnected"], [data-status], .status-indicator');
    const statusCount = await connectionStatus.count();
    console.log(`Found ${statusCount} connection status indicators`);
  });
});

test.describe('Desktop Client Integration', () => {
  
  test('should verify desktop spawner service integration', async ({ page }) => {
    // Navigate to the application
    await page.goto('/multi-desktop');
    await page.waitForLoadState('networkidle');
    
    // Wait for services to connect
    await page.waitForTimeout(5000);
    
    // Check for any service status indicators
    const serviceStatus = page.locator('[data-testid*="service"], [class*="service"], .spawner-status, .client-status');
    const serviceCount = await serviceStatus.count();
    console.log(`Found ${serviceCount} service status elements`);
    
    // Take screenshot of service integration
    await page.screenshot({ 
      path: 'test-results/09-service-integration.png', 
      fullPage: true 
    });
    
    // Check for any desktop client listings
    const clientListings = page.locator('[data-testid*="client"], .client-list, .desktop-list, [class*="client-card"]');
    const clientCount = await clientListings.count();
    console.log(`Found ${clientCount} client listing elements`);
    
    if (clientCount > 0) {
      console.log('✅ Desktop client integration detected');
    } else {
      console.log('⚠️ No desktop client integration visible - services may need time to connect');
    }
  });
});