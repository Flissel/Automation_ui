#!/usr/bin/env python3
"""
Test script to validate the unified node system
Verifies that GraphExecutionService now uses comprehensive templates
"""

import asyncio
import json
import sys
import os
import logging

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.graph_execution_service import GraphExecutionService
from services.comprehensive_node_templates import node_template_validator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_unified_node_system():
    """Test the unified node system"""
    
    print("🔍 Testing Unified Node System")
    print("=" * 50)
    
    # Initialize GraphExecutionService
    graph_service = GraphExecutionService()
    
    # Test 1: Verify template loading
    print("\n📋 Test 1: Template Loading")
    templates = graph_service.get_node_templates()
    print(f"   • Total templates loaded: {len(templates)}")
    
    print("   • Available templates:")
    for template in templates:
        template_id = template.get('id', template.get('type', 'unknown'))
        name = template.get('name', 'Unknown')
        category = template.get('category', 'Unknown')
        has_execution = template.get('has_execution', False)
        service_dep = template.get('service_dependency', 'None')
        
        execution_status = "✅" if has_execution else "❌"
        print(f"     {execution_status} {template_id}: {name} ({category}) - Service: {service_dep}")
    
    # Test 2: Verify comprehensive templates integration
    print(f"\n🔗 Test 2: Comprehensive Templates Integration")
    validator_templates = node_template_validator.templates
    print(f"   • Validator templates: {len(validator_templates)}")
    print(f"   • Graph service templates: {len(templates)}")
    
    integration_success = len(templates) == len(validator_templates)
    print(f"   • Integration success: {'✅' if integration_success else '❌'}")
    
    # Test 3: Template execution validation
    print(f"\n⚙️ Test 3: Template Execution Validation")
    
    # Test simple node execution (text_input)
    simple_node = {
        'id': 'test_text_input',
        'type': 'text_input',
        'data': {
            'properties': [
                {'id': 'text', 'value': 'Hello, unified system!'}
            ]
        }
    }
    
    try:
        from services.graph_execution_service import ExecutionContext, ExecutionStatus
        context = ExecutionContext(
            execution_id="test_execution",
            graph_id="test_graph"
        )
        
        result = await graph_service._execute_node(simple_node, {}, context)
        print(f"   • Text input execution: {'✅' if result['success'] else '❌'}")
        if result['success']:
            print(f"     Output: {result['outputs']}")
        else:
            print(f"     Error: {result['error']}")
            
    except Exception as e:
        print(f"   • Text input execution: ❌ - Error: {str(e)}")
    
    # Test 4: Service dependency check
    print(f"\n🔧 Test 4: Service Dependencies")
    service_deps = {}
    for template in templates:
        service_dep = template.get('service_dependency')
        if service_dep:
            if service_dep not in service_deps:
                service_deps[service_dep] = []
            service_deps[service_dep].append(template.get('id', template.get('type')))
    
    print(f"   • Required services: {len(service_deps)}")
    for service, nodes in service_deps.items():
        print(f"     • {service}: {', '.join(nodes)}")
    
    # Test 5: Node execution with different types
    print(f"\n🎯 Test 5: Multi-Node Type Execution")
    
    test_nodes = [
        {
            'id': 'test_condition',
            'type': 'condition',
            'data': {'properties': []}
        },
        {
            'id': 'test_text_processor',
            'type': 'text_processor',
            'data': {'properties': [{'id': 'operation', 'value': 'uppercase'}]}
        }
    ]
    
    for test_node in test_nodes:
        try:
            context = ExecutionContext(
                execution_id="test_execution_multi",
                graph_id="test_graph"
            )
            
            test_inputs = {'text': 'test input'} if 'processor' in test_node['type'] else {'condition': True}
            result = await graph_service._execute_node(test_node, test_inputs, context)
            
            node_type = test_node['type']
            status = "✅" if result['success'] else "❌"
            print(f"   • {node_type}: {status}")
            
            if result['success']:
                print(f"     Output: {result['outputs']}")
            else:
                print(f"     Error: {result['error']}")
                
        except Exception as e:
            print(f"   • {test_node['type']}: ❌ - Error: {str(e)}")
    
    # Summary
    print(f"\n📊 Summary")
    print(f"   • Comprehensive template integration: {'✅' if integration_success else '❌'}")
    print(f"   • Total node types available: {len(templates)}")
    print(f"   • Service dependencies identified: {len(service_deps)}")
    
    return {
        'total_templates': len(templates),
        'integration_success': integration_success,
        'service_dependencies': service_deps,
        'templates': [t.get('id', t.get('type')) for t in templates]
    }

if __name__ == "__main__":
    try:
        result = asyncio.run(test_unified_node_system())
        print(f"\n🎉 Unified Node System Test Completed!")
        print(f"Templates: {result['templates']}")
    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()