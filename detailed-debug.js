/**
 * Detailed Node Layout Debugger
 * Analyzes specific layout issues and CSS properties
 */

import { chromium } from 'playwright';

async function detailedNodeDebug() {
  console.log('🔍 Starting Detailed Node Layout Debug...\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to the workflow page
    await page.goto('http://localhost:8081/workflow');
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Page loaded successfully\n');
    
    // Wait for nodes to be rendered
    await page.waitForSelector('.react-flow__node', { timeout: 10000 });
    
    // Get detailed analysis of the first node
    const nodeAnalysis = await page.evaluate(() => {
      const node = document.querySelector('.react-flow__node');
      if (!node) return null;
      
      const rect = node.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(node);
      
      // Get the inner content div
      const innerDiv = node.querySelector('div[style*="height"]');
      const innerRect = innerDiv ? innerDiv.getBoundingClientRect() : null;
      const innerStyle = innerDiv ? window.getComputedStyle(innerDiv) : null;
      
      // Get all child elements and their dimensions
      const children = Array.from(node.children).map((child, index) => {
        const childRect = child.getBoundingClientRect();
        const childStyle = window.getComputedStyle(child);
        return {
          index,
          tagName: child.tagName,
          className: child.className,
          dimensions: {
            width: childRect.width,
            height: childRect.height
          },
          style: {
            height: childStyle.height,
            minHeight: childStyle.minHeight,
            maxHeight: childStyle.maxHeight,
            padding: childStyle.padding,
            margin: childStyle.margin,
            boxSizing: childStyle.boxSizing
          }
        };
      });
      
      return {
        outerNode: {
          dimensions: {
            width: rect.width,
            height: rect.height
          },
          style: {
            height: computedStyle.height,
            minHeight: computedStyle.minHeight,
            maxHeight: computedStyle.maxHeight,
            padding: computedStyle.padding,
            margin: computedStyle.margin,
            boxSizing: computedStyle.boxSizing,
            transform: computedStyle.transform,
            scale: computedStyle.scale
          }
        },
        innerDiv: innerDiv ? {
          dimensions: {
            width: innerRect.width,
            height: innerRect.height
          },
          style: {
            height: innerStyle.height,
            minHeight: innerStyle.minHeight,
            maxHeight: innerStyle.maxHeight,
            padding: innerStyle.padding,
            margin: innerStyle.margin
          },
          inlineStyle: innerDiv.getAttribute('style')
        } : null,
        children,
        reactFlowTransform: {
          viewport: document.querySelector('.react-flow__viewport')?.style.transform || 'none'
        }
      };
    });
    
    if (!nodeAnalysis) {
      console.log('❌ No node found for analysis');
      return;
    }
    
    console.log('📊 DETAILED NODE ANALYSIS\n');
    console.log('🔸 Outer Node Container:');
    console.log(`   Actual Dimensions: ${nodeAnalysis.outerNode.dimensions.width.toFixed(1)}px × ${nodeAnalysis.outerNode.dimensions.height.toFixed(1)}px`);
    console.log(`   CSS Height: ${nodeAnalysis.outerNode.style.height}`);
    console.log(`   Min/Max Height: ${nodeAnalysis.outerNode.style.minHeight} / ${nodeAnalysis.outerNode.style.maxHeight}`);
    console.log(`   Padding: ${nodeAnalysis.outerNode.style.padding}`);
    console.log(`   Margin: ${nodeAnalysis.outerNode.style.margin}`);
    console.log(`   Box Sizing: ${nodeAnalysis.outerNode.style.boxSizing}`);
    console.log(`   Transform: ${nodeAnalysis.outerNode.style.transform}`);
    console.log(`   Scale: ${nodeAnalysis.outerNode.style.scale}`);
    
    if (nodeAnalysis.innerDiv) {
      console.log('\n🔸 Inner Content Div:');
      console.log(`   Actual Dimensions: ${nodeAnalysis.innerDiv.dimensions.width.toFixed(1)}px × ${nodeAnalysis.innerDiv.dimensions.height.toFixed(1)}px`);
      console.log(`   CSS Height: ${nodeAnalysis.innerDiv.style.height}`);
      console.log(`   Inline Style: ${nodeAnalysis.innerDiv.inlineStyle}`);
      console.log(`   Padding: ${nodeAnalysis.innerDiv.style.padding}`);
    }
    
    console.log('\n🔸 Child Elements:');
    nodeAnalysis.children.forEach(child => {
      console.log(`   ${child.index + 1}. ${child.tagName} (${child.className.substring(0, 50)}...)`);
      console.log(`      Dimensions: ${child.dimensions.width.toFixed(1)}px × ${child.dimensions.height.toFixed(1)}px`);
      console.log(`      Height: ${child.style.height}`);
    });
    
    console.log('\n🔸 React Flow Transform:');
    console.log(`   Viewport Transform: ${nodeAnalysis.reactFlowTransform.viewport}`);
    
    // Check for scaling issues
    const expectedHeight = 140;
    const actualHeight = nodeAnalysis.outerNode.dimensions.height;
    const scaleFactor = actualHeight / expectedHeight;
    
    console.log('\n🔍 SCALING ANALYSIS:');
    console.log(`   Expected Height: ${expectedHeight}px`);
    console.log(`   Actual Height: ${actualHeight.toFixed(1)}px`);
    console.log(`   Scale Factor: ${scaleFactor.toFixed(2)}x`);
    
    if (scaleFactor > 1.5) {
      console.log('   ⚠️  Node appears to be scaled up significantly!');
    } else if (scaleFactor < 0.8) {
      console.log('   ⚠️  Node appears to be scaled down!');
    } else {
      console.log('   ✅ Scale factor looks reasonable');
    }
    
    // Test tooltip visibility
    console.log('\n🎯 Testing Handle Tooltip...');
    const handle = await page.locator('.react-flow__handle').first();
    if (await handle.isVisible()) {
      await handle.hover();
      await page.waitForTimeout(1000);
      
      const tooltipVisible = await page.evaluate(() => {
        const tooltips = document.querySelectorAll('[class*="tooltip"], div[class*="absolute"][class*="opacity"]');
        return Array.from(tooltips).some(tooltip => {
          const style = window.getComputedStyle(tooltip);
          return style.opacity !== '0' && style.display !== 'none';
        });
      });
      
      console.log(`   Tooltip Visible: ${tooltipVisible ? '✅ Yes' : '❌ No'}`);
    }
    
    // Take a detailed screenshot
    await page.screenshot({ 
      path: 'detailed-node-debug.png', 
      fullPage: true 
    });
    console.log('\n📸 Detailed screenshot saved as detailed-node-debug.png');
    
  } catch (error) {
    console.error('❌ Error during detailed analysis:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the detailed debug analysis
detailedNodeDebug().catch(console.error);