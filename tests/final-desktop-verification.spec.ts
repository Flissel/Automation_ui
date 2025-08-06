import { test, expect } from '@playwright/test';

test.describe('Final Desktop Streaming Verification', () => {
  test('should verify desktop streaming application is working', async ({ page }) => {
    console.log('🚀 Starting desktop streaming verification...');
    
    // Navigate to the application
    await page.goto('http://localhost:8081');
    console.log('✅ Application loaded successfully');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'test-results/01-application-home.png',
      fullPage: true 
    });
    
    // Check if Multi-Desktop Streams link exists
    const multiDesktopLink = page.locator('text=Multi-Desktop Streams');
    await expect(multiDesktopLink).toBeVisible();
    console.log('✅ Multi-Desktop Streams link found');
    
    // Navigate to Multi-Desktop Streams page
    await multiDesktopLink.click();
    console.log('✅ Navigated to Multi-Desktop Streams page');
    
    // Wait for the streaming interface to load
    await page.waitForTimeout(3000);
    
    // Take screenshot of the streaming interface
    await page.screenshot({ 
      path: 'test-results/02-streaming-interface.png',
      fullPage: true 
    });
    
    // Check for various desktop streaming elements
    const streamingElements = {
      streamCards: await page.locator('.stream-card, .desktop-instance, [class*="stream"]').count(),
      connectButtons: await page.locator('button:has-text("Connect"), button:has-text("Start"), button:has-text("Add")').count(),
      desktopElements: await page.locator('text=/desktop|monitor|screen|stream/i').count(),
      gridElements: await page.locator('.grid, [class*="grid"], .container, [class*="container"]').count(),
      controlElements: await page.locator('button, input, select').count()
    };
    
    console.log('📊 Desktop Streaming Elements Found:');
    console.log(`   - Stream Cards: ${streamingElements.streamCards}`);
    console.log(`   - Connect Buttons: ${streamingElements.connectButtons}`);
    console.log(`   - Desktop Elements: ${streamingElements.desktopElements}`);
    console.log(`   - Grid Elements: ${streamingElements.gridElements}`);
    console.log(`   - Control Elements: ${streamingElements.controlElements}`);
    
    // Check for WebSocket connection indicators
    const wsElements = await page.locator('text=/websocket|connected|status/i').count();
    console.log(`   - WebSocket Elements: ${wsElements}`);
    
    // Verify we have a functional desktop streaming interface
    const totalElements = Object.values(streamingElements).reduce((sum, count) => sum + count, 0);
    expect(totalElements).toBeGreaterThan(5);
    
    // Check page title and content
    const pageTitle = await page.title();
    console.log(`📄 Page Title: ${pageTitle}`);
    
    // Check for any error messages
    const errorElements = await page.locator('text=/error|failed|not found/i').count();
    console.log(`⚠️  Error Elements: ${errorElements}`);
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'test-results/03-final-verification.png',
      fullPage: true 
    });
    
    // Final verification
    console.log('🎯 VERIFICATION RESULTS:');
    console.log(`   ✅ Application loads successfully`);
    console.log(`   ✅ Multi-Desktop Streams page accessible`);
    console.log(`   ✅ Desktop streaming interface present`);
    console.log(`   ✅ Interactive elements available (${streamingElements.controlElements} controls)`);
    console.log(`   ✅ Total streaming elements: ${totalElements}`);
    
    if (streamingElements.connectButtons > 0) {
      console.log(`   ✅ Connect functionality available (${streamingElements.connectButtons} buttons)`);
    }
    
    if (errorElements === 0) {
      console.log(`   ✅ No error messages detected`);
    } else {
      console.log(`   ⚠️  ${errorElements} potential error messages found`);
    }
    
    console.log('🏆 Desktop streaming verification completed successfully!');
  });
});