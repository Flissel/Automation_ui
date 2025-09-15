#!/usr/bin/env python3
"""
Simple OCR Click Pattern Test - Clean version without emoji characters
Tests the OCR Click Pattern Monitor and Enhanced OCR Monitor nodes
"""

import asyncio
import logging
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.abspath('.'))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def test_ocr_click_pattern_nodes():
    """Test OCR click pattern node templates"""
    
    print("TESTING: OCR Click Pattern Node Templates")
    print("="*60)
    
    try:
        # Import services
        from services.graph_execution_service import GraphExecutionService, ExecutionContext
        from services.comprehensive_node_templates import node_template_validator
        
        # Initialize graph service
        graph_service = GraphExecutionService()
        
        # Test 1: Verify node templates are loaded
        print("\nTEST 1: Node Template Loading")
        templates = graph_service.get_node_templates()
        print(f"  Total templates loaded: {len(templates)}")
        
        # Check for our new nodes
        ocr_click_found = False
        enhanced_ocr_found = False
        
        for template in templates:
            template_id = template.get('id', template.get('type', 'unknown'))
            if template_id == 'ocr_click_pattern_monitor':
                ocr_click_found = True
                print(f"  SUCCESS: OCR Click Pattern Monitor node found")
            elif template_id == 'enhanced_ocr_monitor':
                enhanced_ocr_found = True
                print(f"  SUCCESS: Enhanced OCR Monitor node found")
        
        print(f"  OCR Click Pattern Monitor: {'FOUND' if ocr_click_found else 'MISSING'}")
        print(f"  Enhanced OCR Monitor: {'FOUND' if enhanced_ocr_found else 'MISSING'}")
        
        # Test 2: Template validation
        print("\nTEST 2: Template Validation")
        validator_templates = node_template_validator.templates
        print(f"  Validator templates: {len(validator_templates)}")
        print(f"  Graph service templates: {len(templates)}")
        
        integration_success = len(templates) == len(validator_templates)
        print(f"  Integration status: {'SUCCESS' if integration_success else 'FAILED'}")
        
        # Test 3: Basic node execution test
        print("\nTEST 3: Basic Node Execution")
        
        # Test with a simple text input node first
        simple_node = {
            'id': 'test_text_input',
            'type': 'text_input',
            'data': {
                'properties': [
                    {'id': 'text', 'value': 'Hello OCR test!'}
                ]
            }
        }
        
        context = ExecutionContext(
            execution_id="test_execution",
            graph_id="test_graph"
        )
        
        result = await graph_service._execute_node(simple_node, {}, context)
        print(f"  Simple node execution: {'SUCCESS' if result.get('success') else 'FAILED'}")
        
        if result.get('success'):
            print(f"    Output: {result.get('outputs', {})}")
        else:
            print(f"    Error: {result.get('error', 'Unknown error')}")
        
        # Test 4: OCR Click Pattern node structure test
        print("\nTEST 4: OCR Click Pattern Node Structure")
        
        if ocr_click_found:
            # Find the OCR click pattern template
            ocr_template = None
            for template in templates:
                if template.get('id') == 'ocr_click_pattern_monitor':
                    ocr_template = template
                    break
            
            if ocr_template:
                print(f"  Template name: {ocr_template.get('name', 'Unknown')}")
                print(f"  Template category: {ocr_template.get('category', 'Unknown')}")
                print(f"  Has execution: {ocr_template.get('has_execution', False)}")
                print(f"  Service dependency: {ocr_template.get('service_dependency', 'None')}")
                
                # Check required properties
                properties = ocr_template.get('properties', [])
                print(f"  Properties count: {len(properties)}")
                
                required_props = ['target_text', 'region_x', 'region_y', 'region_width', 'region_height']
                for prop in required_props:
                    has_prop = any(p.get('id') == prop for p in properties)
                    print(f"    {prop}: {'FOUND' if has_prop else 'MISSING'}")
        
        # Test 5: Enhanced OCR Monitor node structure test
        print("\nTEST 5: Enhanced OCR Monitor Node Structure")
        
        if enhanced_ocr_found:
            # Find the Enhanced OCR monitor template
            enhanced_template = None
            for template in templates:
                if template.get('id') == 'enhanced_ocr_monitor':
                    enhanced_template = template
                    break
            
            if enhanced_template:
                print(f"  Template name: {enhanced_template.get('name', 'Unknown')}")
                print(f"  Template category: {enhanced_template.get('category', 'Unknown')}")
                print(f"  Has execution: {enhanced_template.get('has_execution', False)}")
                print(f"  Service dependency: {enhanced_template.get('service_dependency', 'None')}")
                
                # Check required properties
                properties = enhanced_template.get('properties', [])
                print(f"  Properties count: {len(properties)}")
                
                required_props = ['patterns', 'regions', 'monitor_duration', 'check_interval']
                for prop in required_props:
                    has_prop = any(p.get('id') == prop for p in properties)
                    print(f"    {prop}: {'FOUND' if has_prop else 'MISSING'}")
        
        # Summary
        print(f"\nSUMMARY:")
        print(f"  Total templates: {len(templates)}")
        print(f"  OCR Click Pattern: {'IMPLEMENTED' if ocr_click_found else 'MISSING'}")
        print(f"  Enhanced OCR Monitor: {'IMPLEMENTED' if enhanced_ocr_found else 'MISSING'}")
        print(f"  Integration: {'SUCCESS' if integration_success else 'FAILED'}")
        
        success = ocr_click_found and enhanced_ocr_found and integration_success
        print(f"  Overall status: {'SUCCESS' if success else 'FAILED'}")
        
        return success
        
    except Exception as e:
        logger.error(f"Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Main test execution"""
    print("Starting OCR Click Pattern Tests...")
    
    try:
        success = await test_ocr_click_pattern_nodes()
        
        if success:
            print("\nALL TESTS PASSED!")
            print("OCR Click Pattern implementation is working correctly.")
        else:
            print("\nSOME TESTS FAILED!")
            print("Check the output above for details.")
        
        return success
        
    except Exception as e:
        logger.error(f"Fatal test error: {e}")
        return False

if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)