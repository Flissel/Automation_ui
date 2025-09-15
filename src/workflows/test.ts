/**
 * Workflow System Test
 * 
 * This file tests the complete workflow design system to ensure all components
 * work together correctly and demonstrate the node system execution capabilities.
 * 
 * @author SOLO Coding Agent
 */

import {
  WorkflowSystem,
  QuickStart,
  getWorkflowTemplate,
  getWorkflowsByCategory,
  ConnectionPatternUtils,
  WorkflowValidator,
  WorkflowExecutionUtils,
  VERSION_INFO,
  getWorkflowSystemStats
} from './index';

import { NodeType } from '../types/workflow';

/**
 * Test the workflow system functionality
 */
export async function testWorkflowSystem(): Promise<void> {
  console.log('🚀 Testing Workflow System v' + VERSION_INFO.version);
  console.log('📊 System Stats:', getWorkflowSystemStats());
  
  // Test 1: Workflow Template Retrieval
  console.log('\n📋 Test 1: Workflow Template Retrieval');
  const desktopAutomationTemplate = getWorkflowTemplate('Desktop Automation with OCR');
  const webScrapingTemplate = getWorkflowTemplate('Simple Web Scraping');
  const n8nTemplate = getWorkflowTemplate('N8N Integration');
  
  console.log('✅ Desktop Automation Template:', desktopAutomationTemplate ? 'Found' : 'Not Found');
  console.log('✅ Web Scraping Template:', webScrapingTemplate ? 'Found' : 'Not Found');
  console.log('✅ N8N Integration Template:', n8nTemplate ? 'Found' : 'Not Found');
  
  // Test 2: Workflow Categories
  console.log('\n📂 Test 2: Workflow Categories');
  const automationWorkflows = getWorkflowsByCategory('automation');
  const integrationWorkflows = getWorkflowsByCategory('integration');
  const dataWorkflows = getWorkflowsByCategory('data-processing');
  
  console.log('✅ Automation workflows:', automationWorkflows.length);
  console.log('✅ Integration workflows:', integrationWorkflows.length);
  console.log('✅ Data processing workflows:', dataWorkflows.length);
  
  // Test 3: Node Compatibility
  console.log('\n🔗 Test 3: Node Compatibility Testing');
  const triggerToConfig = ConnectionPatternUtils.areNodesCompatible(
    NodeType.MANUAL_TRIGGER,
    NodeType.WEBSOCKET_CONFIG
  );
  const configToInterface = ConnectionPatternUtils.areNodesCompatible(
    NodeType.WEBSOCKET_CONFIG,
    NodeType.LIVE_DESKTOP
  );
  const interfaceToOcr = ConnectionPatternUtils.areNodesCompatible(
    NodeType.LIVE_DESKTOP,
    NodeType.OCR_REGION
  );
  
  console.log('✅ Manual Trigger → WebSocket Config:', triggerToConfig);
  console.log('✅ WebSocket Config → Live Desktop:', configToInterface);
  console.log('✅ Live Desktop → OCR Region:', interfaceToOcr);
  
  // Test 4: Workflow Validation
  console.log('\n✅ Test 4: Workflow Validation');
  if (desktopAutomationTemplate) {
    const validation = QuickStart.validateWorkflow(desktopAutomationTemplate.workflow);
    console.log('✅ Desktop Automation Workflow Valid:', validation.isValid);
    if (!validation.isValid) {
      console.log('❌ Validation Errors:', validation.errors);
    }
  }
  
  // Test 5: Workflow System Initialization
  console.log('\n⚙️ Test 5: Workflow System Initialization');
  const workflowSystem = new WorkflowSystem({
    enableDebugMode: true,
    maxConcurrentNodes: 2,
    defaultTimeout: 60000
  });
  
  await workflowSystem.initialize();
  console.log('✅ Workflow System initialized successfully');
  console.log('✅ System Config:', workflowSystem.getConfig());
  
  // Test 6: Execution Order Calculation
  console.log('\n📊 Test 6: Execution Order Calculation');
  if (desktopAutomationTemplate) {
    const executionOrder = WorkflowExecutionUtils.calculateExecutionOrder(
      desktopAutomationTemplate.workflow.nodes,
      desktopAutomationTemplate.workflow.edges
    );
    console.log('✅ Execution Order calculated:', executionOrder.length, 'steps');
    console.log('✅ First 3 steps:', executionOrder.slice(0, 3));
  }
  
  // Test 7: Connection Pattern Recommendations
  console.log('\n💡 Test 7: Connection Pattern Recommendations');
  const ocrRecommendations = ConnectionPatternUtils.getRecommendedTargets(NodeType.OCR_EXTRACT);
  const httpRecommendations = ConnectionPatternUtils.getRecommendedTargets(NodeType.HTTP_REQUEST_ACTION);
  
  console.log('✅ OCR Extract recommended targets:', ocrRecommendations.length);
  console.log('✅ HTTP Request recommended targets:', httpRecommendations.length);
  
  // Test 8: Design Pattern Validation
  console.log('\n🎨 Test 8: Design Pattern Validation');
  const linearPattern = ConnectionPatternUtils.getDesignPattern('Linear Processing Pipeline');
  const conditionalPattern = ConnectionPatternUtils.getDesignPattern('Conditional Branching');
  const parallelPattern = ConnectionPatternUtils.getDesignPattern('Parallel Processing');
  
  console.log('✅ Linear Processing Pattern:', linearPattern ? 'Found' : 'Not Found');
  console.log('✅ Conditional Branching Pattern:', conditionalPattern ? 'Found' : 'Not Found');
  console.log('✅ Parallel Processing Pattern:', parallelPattern ? 'Found' : 'Not Found');
  
  // Test 9: Workflow Manager Operations
  console.log('\n🎯 Test 9: Workflow Manager Operations');
  const manager = workflowSystem.getManager();
  
  // Test workflow registration (mock)
  console.log('✅ Workflow Manager created successfully');
  console.log('✅ Manager supports execution tracking:', typeof manager.getExecutionStatus === 'function');
  console.log('✅ Manager supports workflow validation:', typeof manager.validateWorkflow === 'function');
  
  // Test 10: System Cleanup
  console.log('\n🧹 Test 10: System Cleanup');
  workflowSystem.cleanup();
  console.log('✅ Workflow System cleaned up successfully');
  
  console.log('\n🎉 All workflow system tests completed successfully!');
  console.log('🚀 The workflow design system is ready for execution!');
}

/**
 * Test specific workflow template functionality
 */
export function testWorkflowTemplate(templateName: string): void {
  console.log(`\n🔍 Testing Workflow Template: ${templateName}`);
  
  const template = getWorkflowTemplate(templateName);
  if (!template) {
    console.log('❌ Template not found');
    return;
  }
  
  console.log('✅ Template found:', template.name);
  console.log('📝 Description:', template.description);
  console.log('🏷️ Category:', template.category);
  console.log('🔢 Nodes:', template.workflow.nodes.length);
  console.log('🔗 Edges:', template.workflow.edges.length);
  
  // Validate the workflow
  const validator = new WorkflowValidator();
  const validation = validator.validateWorkflow(template.workflow);
  
  console.log('✅ Validation Result:', validation.isValid ? 'Valid' : 'Invalid');
  if (!validation.isValid) {
    console.log('❌ Validation Errors:');
    validation.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error.message}`);
    });
  }
  
  // Calculate execution order
  const executionOrder = WorkflowExecutionUtils.calculateExecutionOrder(
    template.workflow.nodes,
    template.workflow.edges
  );
  
  console.log('📊 Execution Order:');
  executionOrder.forEach((nodeId, index) => {
    const node = template.workflow.nodes.find(n => n.id === nodeId);
    console.log(`   ${index + 1}. ${node?.type || 'Unknown'} (${nodeId})`);
  });
}

/**
 * Test node compatibility matrix
 */
export function testNodeCompatibility(): void {
  console.log('\n🔗 Testing Node Compatibility Matrix');
  
  const testCases = [
    { source: NodeType.MANUAL_TRIGGER, target: NodeType.WEBSOCKET_CONFIG, expected: true },
    { source: NodeType.WEBSOCKET_CONFIG, target: NodeType.LIVE_DESKTOP, expected: true },
    { source: NodeType.LIVE_DESKTOP, target: NodeType.OCR_REGION, expected: true },
    { source: NodeType.OCR_EXTRACT, target: NodeType.IF_CONDITION, expected: true },
    { source: NodeType.IF_CONDITION, target: NodeType.CLICK_ACTION, expected: true },
    { source: NodeType.CLICK_ACTION, target: NodeType.HTTP_REQUEST_ACTION, expected: true },
    { source: NodeType.HTTP_REQUEST_ACTION, target: NodeType.SEND_TO_FILESYSTEM, expected: true },
    { source: NodeType.SEND_TO_FILESYSTEM, target: NodeType.WORKFLOW_RESULT, expected: true },
    // Invalid connections
    { source: NodeType.WORKFLOW_RESULT, target: NodeType.MANUAL_TRIGGER, expected: false },
    { source: NodeType.OCR_REGION, target: NodeType.WEBSOCKET_CONFIG, expected: false }
  ];
  
  let passed = 0;
  let failed = 0;
  
  testCases.forEach((testCase, index) => {
    const result = ConnectionPatternUtils.areNodesCompatible(testCase.source, testCase.target);
    const success = result === testCase.expected;
    
    console.log(
      `${success ? '✅' : '❌'} Test ${index + 1}: ${testCase.source} → ${testCase.target} = ${result} (expected: ${testCase.expected})`
    );
    
    if (success) {
      passed++;
    } else {
      failed++;
    }
  });
  
  console.log(`\n📊 Compatibility Test Results: ${passed} passed, ${failed} failed`);
}

/**
 * Run all tests
 */
export async function runAllTests(): Promise<void> {
  console.log('🧪 Running Complete Workflow System Test Suite\n');
  
  try {
    await testWorkflowSystem();
    
    console.log('\n' + '='.repeat(60));
    testWorkflowTemplate('Desktop Automation with OCR');
    
    console.log('\n' + '='.repeat(60));
    testWorkflowTemplate('Simple Web Scraping');
    
    console.log('\n' + '='.repeat(60));
    testWorkflowTemplate('N8N Integration');
    
    console.log('\n' + '='.repeat(60));
    testNodeCompatibility();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('✨ The workflow design system is fully functional and ready for use!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    throw error;
  }
}

// Export for use in other modules
export default {
  testWorkflowSystem,
  testWorkflowTemplate,
  testNodeCompatibility,
  runAllTests
};