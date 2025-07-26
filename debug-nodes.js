/**
 * Playwright Node Layout Debugger
 * Analyzes each node's layout, dimensions, and styling
 */

import { chromium } from 'playwright';

async function debugNodeLayouts() {
  console.log('🔍 Starting Node Layout Debug Analysis...\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to the workflow page
    await page.goto('http://localhost:8081/workflow');
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Page loaded successfully\n');
    
    // Wait for nodes to be rendered
    await page.waitForSelector('.react-flow__node', { timeout: 10000 });
    
    // Get all nodes
    const nodes = await page.locator('.react-flow__node').all();
    console.log(`📊 Found ${nodes.length} nodes to analyze\n`);
    
    // Analyze each node
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      
      try {
        // Get node information
        const nodeInfo = await node.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(el);
          
          // Get node label
          const labelElement = el.querySelector('[class*="font-bold"]');
          const label = labelElement ? labelElement.textContent : 'Unknown';
          
          // Get category
          const categoryElement = el.querySelector('[class*="text-gray-600"][class*="capitalize"]');
          const category = categoryElement ? categoryElement.textContent : 'Unknown';
          
          // Get handles
          const handles = Array.from(el.querySelectorAll('.react-flow__handle')).map(handle => {
            const handleRect = handle.getBoundingClientRect();
            const handleStyle = window.getComputedStyle(handle);
            return {
              type: handle.classList.contains('react-flow__handle-left') ? 'input' : 'output',
              position: {
                x: handleRect.x - rect.x,
                y: handleRect.y - rect.y
              },
              size: {
                width: handleRect.width,
                height: handleRect.height
              },
              backgroundColor: handleStyle.backgroundColor,
              className: handle.className
            };
          });
          
          // Get badges
          const badges = Array.from(el.querySelectorAll('[class*="badge"]')).map(badge => ({
            text: badge.textContent,
            className: badge.className
          }));
          
          return {
            label,
            category,
            dimensions: {
              width: rect.width,
              height: rect.height
            },
            position: {
              x: rect.x,
              y: rect.y
            },
            styling: {
              backgroundColor: computedStyle.backgroundColor,
              borderColor: computedStyle.borderColor,
              borderWidth: computedStyle.borderWidth,
              borderRadius: computedStyle.borderRadius,
              boxShadow: computedStyle.boxShadow,
              padding: computedStyle.padding
            },
            handles,
            badges,
            className: el.className
          };
        });
        
        console.log(`🔸 Node ${i + 1}: ${nodeInfo.label}`);
        console.log(`   Category: ${nodeInfo.category}`);
        console.log(`   Dimensions: ${nodeInfo.dimensions.width.toFixed(1)}px × ${nodeInfo.dimensions.height.toFixed(1)}px`);
        console.log(`   Handles: ${nodeInfo.handles.length} (${nodeInfo.handles.filter(h => h.type === 'input').length} inputs, ${nodeInfo.handles.filter(h => h.type === 'output').length} outputs)`);
        console.log(`   Badges: ${nodeInfo.badges.length}`);
        
        // Check for layout issues
        const issues = [];
        
        // Check consistent height
        if (nodeInfo.dimensions.height < 100 || nodeInfo.dimensions.height > 200) {
          issues.push(`Unusual height: ${nodeInfo.dimensions.height.toFixed(1)}px`);
        }
        
        // Check handle positioning
        nodeInfo.handles.forEach((handle, idx) => {
          if (handle.position.y < 20 || handle.position.y > nodeInfo.dimensions.height - 20) {
            issues.push(`Handle ${idx + 1} positioned too close to edge`);
          }
        });
        
        // Check for overlapping handles
        for (let j = 0; j < nodeInfo.handles.length - 1; j++) {
          for (let k = j + 1; k < nodeInfo.handles.length; k++) {
            const handle1 = nodeInfo.handles[j];
            const handle2 = nodeInfo.handles[k];
            const distance = Math.abs(handle1.position.y - handle2.position.y);
            if (distance < 30 && handle1.type === handle2.type) {
              issues.push(`Handles ${j + 1} and ${k + 1} too close (${distance.toFixed(1)}px apart)`);
            }
          }
        }
        
        if (issues.length > 0) {
          console.log(`   ⚠️  Issues: ${issues.join(', ')}`);
        } else {
          console.log(`   ✅ Layout looks good`);
        }
        
        console.log('');
        
      } catch (error) {
        console.log(`   ❌ Error analyzing node ${i + 1}: ${error.message}\n`);
      }
    }
    
    // Take a screenshot for visual inspection
    await page.screenshot({ 
      path: 'node-layout-debug.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot saved as node-layout-debug.png\n');
    
    // Test connector hover states
    console.log('🎯 Testing connector hover states...\n');
    
    const handles = await page.locator('.react-flow__handle').all();
    for (let i = 0; i < Math.min(handles.length, 5); i++) {
      const handle = handles[i];
      
      try {
        await handle.hover();
        await page.waitForTimeout(500);
        
        const tooltipVisible = await page.locator('[class*="tooltip"]').isVisible().catch(() => false);
        console.log(`   Handle ${i + 1}: Tooltip ${tooltipVisible ? '✅ visible' : '❌ not visible'}`);
        
      } catch (error) {
        console.log(`   Handle ${i + 1}: ❌ Error testing hover - ${error.message}`);
      }
    }
    
    console.log('\n🎉 Node layout analysis complete!');
    
  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the debug analysis
debugNodeLayouts().catch(console.error);