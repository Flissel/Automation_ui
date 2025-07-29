
import { test } from '@playwright/test';
import { expect } from '@playwright/test';

test('AddAllNodes_2025-07-28', async ({ page, context }) => {
  
    // Click element
    await page.click('button:has-text("Add Node")');

    // Click element
    await page.click('button:has-text("HTTP Request")');

    // Click element
    await page.click('text=OCR Extract');

    // Click element
    await page.click('button:has-text("Add Node")');

    // Click element
    await page.click('text=IF Condition');

    // Click element
    await page.click('button:has-text("Add Node")');

    // Click element
    await page.click('text=Delay');

    // Click element
    await page.click('button:has-text("Add Node")');

    // Click element
    await page.click('text=Workflow Results');

    // Take screenshot
    await page.screenshot({ path: 'all_nodes_added_final.png', { fullPage: true } });
});