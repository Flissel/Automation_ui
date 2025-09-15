/**
 * TRAE Workflow Screen Executor
 * 
 * Integrates screenshot execution and screen automation with the workflow system
 * Connects desktop stream to workflow nodes for automated screen operations
 * 
 * Author: TRAE Development Team
 * Version: 1.0.0
 */

import { screenshotExecutionService, ScreenshotConfig, AutomationAction, ScreenshotData, AutomationResult } from './screenshotExecutionService';
import { toast } from 'sonner';

// Workflow node execution context
export interface WorkflowExecutionContext {
  nodeId: string;
  workflowId: string;
  executionId: string;
  inputData: any;
  nodeConfig: any;
  previousResults: Map<string, any>;
}

// Execution result for workflow system
export interface WorkflowNodeResult {
  nodeId: string;
  success: boolean;
  outputData: any;
  executionTime: number;
  error?: string;
  metadata: {
    timestamp: number;
    nodeType: string;
    dataSize?: number;
    screenshotCount?: number;
  };
}

class WorkflowScreenExecutor {
  private activeExecutions: Map<string, boolean> = new Map();
  private executionResults: Map<string, WorkflowNodeResult> = new Map();

  /**
   * Execute screenshot_execution node
   */
  async executeScreenshotNode(context: WorkflowExecutionContext): Promise<WorkflowNodeResult> {
    const startTime = Date.now();
    const { nodeId, nodeConfig } = context;

    console.log(`📸 Executing screenshot node: ${nodeId}`);
    this.activeExecutions.set(nodeId, true);

    try {
      // Ensure connection to desktop stream
      if (!screenshotExecutionService.isStreamConnected()) {
        console.log('🔌 Connecting to desktop stream...');
        const connected = await screenshotExecutionService.initializeStreamConnection();
        if (!connected) {
          throw new Error('Failed to connect to desktop stream');
        }
        toast.success('Connected to desktop stream');
      }

      // Convert node config to screenshot config
      const screenshotConfig: ScreenshotConfig = this.convertToScreenshotConfig(nodeConfig);

      // Execute screenshot capture
      const screenshots = await screenshotExecutionService.executeScreenshot(screenshotConfig);

      if (screenshots.length === 0) {
        throw new Error('No screenshots captured from stream');
      }

      // Analyze screenshots if enabled
      const analysisResults = [];
      if (screenshotConfig.enable_analysis) {
        for (const screenshot of screenshots) {
          const analysis = await screenshotExecutionService.analyzeScreen(screenshot, screenshotConfig);
          analysisResults.push({
            monitor_id: screenshot.monitor_id,
            analysis
          });
        }
      }

      // Prepare output data for next nodes
      const outputData = {
        screenshots,
        analysis: analysisResults,
        metadata: {
          capture_mode: screenshotConfig.capture_mode,
          monitor_selection: screenshotConfig.monitor_selection,
          timestamp: Date.now(),
          source: 'desktop_stream'
        }
      };

      const result: WorkflowNodeResult = {
        nodeId,
        success: true,
        outputData,
        executionTime: Date.now() - startTime,
        metadata: {
          timestamp: Date.now(),
          nodeType: 'screenshot_execution',
          screenshotCount: screenshots.length,
          dataSize: this.calculateDataSize(outputData)
        }
      };

      this.executionResults.set(nodeId, result);
      console.log(`✅ Screenshot node completed: ${nodeId} (${screenshots.length} screenshots)`);
      toast.success(`Screenshot captured: ${screenshots.length} images`);

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Screenshot node failed: ${nodeId}`, error);
      
      const result: WorkflowNodeResult = {
        nodeId,
        success: false,
        outputData: null,
        executionTime: Date.now() - startTime,
        error: errorMessage,
        metadata: {
          timestamp: Date.now(),
          nodeType: 'screenshot_execution'
        }
      };

      this.executionResults.set(nodeId, result);
      toast.error(`Screenshot failed: ${errorMessage}`);
      return result;

    } finally {
      this.activeExecutions.delete(nodeId);
    }
  }

  /**
   * Execute screen_automation node
   */
  async executeAutomationNode(context: WorkflowExecutionContext): Promise<WorkflowNodeResult> {
    const startTime = Date.now();
    const { nodeId, nodeConfig, inputData } = context;

    console.log(`🤖 Executing automation node: ${nodeId}`);
    this.activeExecutions.set(nodeId, true);

    try {
      // Validate input data (should come from screenshot node)
      if (!inputData || !inputData.screenshots || inputData.screenshots.length === 0) {
        throw new Error('No screenshot data received from previous node');
      }

      const screenshots: ScreenshotData[] = inputData.screenshots;
      const automationAction: AutomationAction = this.convertToAutomationAction(nodeConfig);

      // Execute automation on the first available screenshot
      // (or specific monitor if configured)
      const targetScreenshot = this.selectTargetScreenshot(screenshots, nodeConfig);
      
      if (!targetScreenshot) {
        throw new Error('No suitable screenshot found for automation');
      }

      console.log(`🎯 Executing automation on ${targetScreenshot.monitor_id}`);
      const automationResult = await screenshotExecutionService.executeAutomation(automationAction, targetScreenshot);

      // Prepare output data
      const outputData = {
        automation_result: automationResult,
        original_screenshots: screenshots,
        target_monitor: targetScreenshot.monitor_id,
        action_performed: automationAction.action_type,
        metadata: {
          timestamp: Date.now(),
          execution_time: automationResult.execution_time,
          retry_count: automationResult.retry_count,
          success: automationResult.success
        }
      };

      const result: WorkflowNodeResult = {
        nodeId,
        success: automationResult.success,
        outputData,
        executionTime: Date.now() - startTime,
        error: automationResult.error_message,
        metadata: {
          timestamp: Date.now(),
          nodeType: 'screen_automation',
          dataSize: this.calculateDataSize(outputData)
        }
      };

      this.executionResults.set(nodeId, result);
      
      if (automationResult.success) {
        console.log(`✅ Automation node completed: ${nodeId}`);
        toast.success(`Automation completed: ${automationAction.action_type}`);
      } else {
        console.log(`⚠️ Automation node failed: ${nodeId}`);
        toast.error(`Automation failed: ${automationResult.error_message}`);
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Automation node failed: ${nodeId}`, error);
      
      const result: WorkflowNodeResult = {
        nodeId,
        success: false,
        outputData: null,
        executionTime: Date.now() - startTime,
        error: errorMessage,
        metadata: {
          timestamp: Date.now(),
          nodeType: 'screen_automation'
        }
      };

      this.executionResults.set(nodeId, result);
      toast.error(`Automation failed: ${errorMessage}`);
      return result;

    } finally {
      this.activeExecutions.delete(nodeId);
    }
  }

  /**
   * Execute any screen-related workflow node
   */
  async executeNode(context: WorkflowExecutionContext): Promise<WorkflowNodeResult> {
    const { nodeConfig } = context;
    const nodeType = nodeConfig?.type || 'unknown';

    switch (nodeType) {
      case 'screenshot_execution':
        return this.executeScreenshotNode(context);
      
      case 'screen_automation':
        return this.executeAutomationNode(context);
      
      default:
        throw new Error(`Unsupported node type: ${nodeType}`);
    }
  }

  /**
   * Convert workflow node config to screenshot config
   */
  private convertToScreenshotConfig(nodeConfig: any): ScreenshotConfig {
    return {
      capture_mode: nodeConfig.capture_mode || 'dual_monitor',
      monitor_selection: nodeConfig.monitor_selection || 'both_monitors',
      region: nodeConfig.region || { x: 0, y: 0, width: 1920, height: 1080 },
      image_format: nodeConfig.image_format || 'jpeg',
      image_quality: nodeConfig.image_quality || 85,
      resize_image: nodeConfig.resize_image || false,
      target_width: nodeConfig.target_width || 1920,
      target_height: nodeConfig.target_height || 1080,
      capture_interval: nodeConfig.capture_interval || 5000,
      auto_capture: nodeConfig.auto_capture || false,
      trigger_on_change: nodeConfig.trigger_on_change || true,
      change_threshold: nodeConfig.change_threshold || 0.05,
      enable_analysis: nodeConfig.enable_analysis || true,
      detect_ui_elements: nodeConfig.detect_ui_elements || true,
      detect_text_regions: nodeConfig.detect_text_regions || true,
      detect_clickable_areas: nodeConfig.detect_clickable_areas || true,
      save_screenshots: nodeConfig.save_screenshots || true,
      screenshot_directory: nodeConfig.screenshot_directory || './workflow-data/screenshots',
      filename_pattern: nodeConfig.filename_pattern || 'screenshot_{timestamp}_{monitor}',
      keep_history: nodeConfig.keep_history || true,
      max_history_files: nodeConfig.max_history_files || 50,
      pass_to_next_node: nodeConfig.pass_to_next_node || true,
      include_metadata: nodeConfig.include_metadata || true,
      execution_timeout: nodeConfig.execution_timeout || 10000
    };
  }

  /**
   * Convert workflow node config to automation action
   */
  private convertToAutomationAction(nodeConfig: any): AutomationAction {
    return {
      action_type: nodeConfig.action_type || 'click_element',
      target_element: nodeConfig.target_element || 'by_coordinates',
      coordinates: nodeConfig.coordinates || { x: 100, y: 100 },
      search_text: nodeConfig.search_text || '',
      image_template: nodeConfig.image_template || '',
      text_to_type: nodeConfig.text_to_type || '',
      key_combination: nodeConfig.key_combination || '',
      scroll_direction: nodeConfig.scroll_direction || 'down',
      scroll_amount: nodeConfig.scroll_amount || 3,
      wait_before_action: nodeConfig.wait_before_action || 1000,
      wait_after_action: nodeConfig.wait_after_action || 500,
      retry_attempts: nodeConfig.retry_attempts || 3,
      element_timeout: nodeConfig.element_timeout || 5000,
      verify_action: nodeConfig.verify_action || true,
      take_screenshot_after: nodeConfig.take_screenshot_after || true,
      continue_on_error: nodeConfig.continue_on_error || false,
      fallback_action: nodeConfig.fallback_action || 'retry'
    };
  }

  /**
   * Select target screenshot for automation
   */
  private selectTargetScreenshot(screenshots: ScreenshotData[], nodeConfig: any): ScreenshotData | null {
    if (screenshots.length === 0) return null;

    // If specific monitor is configured, use that
    const targetMonitor = nodeConfig.target_monitor;
    if (targetMonitor) {
      const targetScreenshot = screenshots.find(s => s.monitor_id === targetMonitor);
      if (targetScreenshot) return targetScreenshot;
    }

    // Otherwise, use the first available screenshot
    return screenshots[0];
  }

  /**
   * Calculate approximate data size for metadata
   */
  private calculateDataSize(data: any): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  /**
   * Get execution result for a node
   */
  getExecutionResult(nodeId: string): WorkflowNodeResult | null {
    return this.executionResults.get(nodeId) || null;
  }

  /**
   * Check if node is currently executing
   */
  isNodeExecuting(nodeId: string): boolean {
    return this.activeExecutions.get(nodeId) || false;
  }

  /**
   * Get all execution results
   */
  getAllExecutionResults(): Map<string, WorkflowNodeResult> {
    return new Map(this.executionResults);
  }

  /**
   * Clear execution results
   */
  clearExecutionResults(): void {
    this.executionResults.clear();
  }

  /**
   * Stop all active executions
   */
  stopAllExecutions(): void {
    this.activeExecutions.clear();
    console.log('🛑 All screen executions stopped');
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    activeExecutions: number;
  } {
    const results = Array.from(this.executionResults.values());
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const avgTime = results.length > 0 
      ? results.reduce((sum, r) => sum + r.executionTime, 0) / results.length 
      : 0;

    return {
      totalExecutions: results.length,
      successfulExecutions: successful.length,
      failedExecutions: failed.length,
      averageExecutionTime: Math.round(avgTime),
      activeExecutions: this.activeExecutions.size
    };
  }
}

// Export singleton instance
export const workflowScreenExecutor = new WorkflowScreenExecutor();
export default workflowScreenExecutor;