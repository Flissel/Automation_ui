/**
 * Add Multiple Nodes for Testing
 * This script will add various node types to test their layouts
 */

import { chromium } from 'playwright';

async function addTestNodes() {
  console.log('🔧 Adding test nodes to workflow...\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to the workflow page
    await page.goto('http://localhost:8081/workflow');
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Page loaded successfully\n');
    
    // Wait for the add node button
    await page.waitForSelector('button:has-text("Add Node")', { timeout: 10000 });
    
    // List of nodes to add for testing
    const nodesToAdd = [
      'websocket_config',
      'live_desktop',
      'click_action',
      'type_text_action',
      'http_request_action'
    ];
    
    for (const nodeType of nodesToAdd) {
      try {
        console.log(`➕ Adding ${nodeType} node...`);
        
        // Click Add Node button
        await page.click('button:has-text("Add Node")');
        await page.waitForTimeout(500);
        
        // Look for the node template in the modal
        const nodeButton = page.locator(`button:has-text("${nodeType.replace('_', ' ')}")`).first();
        
        if (await nodeButton.isVisible()) {
          await nodeButton.click();
          await page.waitForTimeout(1000);
          console.log(`   ✅ ${nodeType} added successfully`);
        } else {
          // Try clicking on the node type directly
          await page.click(`[data-node-type="${nodeType}"]`);
          await page.waitForTimeout(1000);
          console.log(`   ✅ ${nodeType} added via data attribute`);
        }
        
      } catch (error) {
        console.log(`   ❌ Failed to add ${nodeType}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Test nodes added! Ready for layout analysis.');
    
    // Keep browser open for manual inspection
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Error adding test nodes:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the script
addTestNodes().catch(console.error);