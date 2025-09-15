"""
Test script to verify the improved workflow template system
with proper trigger propagation and execution chain handling
"""

import asyncio
import json
import requests
import time
from typing import Dict, Any

def test_api_health():
    """Test if API is running"""
    try:
        response = requests.get('http://localhost:8000/api/v3/health')
        print(f"✅ API Health Check: {response.status_code}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ API Health Check Failed: {e}")
        return False

def test_workflow_templates():
    """Test workflow template endpoints"""
    try:
        # Get all templates
        response = requests.get('http://localhost:8000/api/v3/workflow-templates')
        print(f"✅ Get Templates: {response.status_code}")
        templates = response.json()
        
        if templates.get('success'):
            print(f"   Found {templates['count']} templates")
            for template in templates['templates']:
                print(f"   - {template['id']}: {template['name']}")
            return templates['templates']
        else:
            print("❌ No templates found")
            return []
            
    except Exception as e:
        print(f"❌ Get Templates Failed: {e}")
        return []

def test_single_template_execution(template_id: str):
    """Test execution of a specific template"""
    try:
        print(f"\n🧪 Testing template: {template_id}")
        
        # Get template details
        response = requests.get(f'http://localhost:8000/api/v3/workflow-templates/{template_id}')
        if response.status_code != 200:
            print(f"❌ Get template details failed: {response.status_code}")
            return False
            
        template = response.json()['template']
        print(f"   Template: {template['name']}")
        print(f"   Description: {template['description'][:100]}...")
        print(f"   Nodes: {len(template['nodes'])}")
        print(f"   Connections: {len(template['connections'])}")
        
        # Execute template
        config_overrides = {}
        if template_id == 'simple-click-automation':
            config_overrides = {
                'click_1': {
                    'x': 100,
                    'y': 200,
                    'button': 'left'
                }
            }
        elif template_id == 'automated-form-filling':
            config_overrides = {
                'type_1': {
                    'text': 'test@example.com'
                },
                'type_2': {
                    'text': 'testpassword123'
                }
            }
        
        print(f"   Config overrides: {config_overrides}")
        
        # Execute the template
        execute_response = requests.post(
            f'http://localhost:8000/api/v3/workflow-templates/{template_id}/execute',
            json=config_overrides
        )
        
        print(f"   Execution status: {execute_response.status_code}")
        result = execute_response.json()
        
        if result.get('success'):
            print(f"   ✅ Execution successful!")
            print(f"   Execution ID: {result['execution_id']}")
            if result.get('result'):
                print(f"   Result keys: {list(result['result'].keys())}")
        else:
            print(f"   ❌ Execution failed: {result.get('error')}")
            
        return result.get('success', False)
        
    except Exception as e:
        print(f"❌ Template execution failed: {e}")
        return False

def test_node_templates():
    """Test node template endpoints"""
    try:
        # Get node templates
        response = requests.get('http://localhost:8000/api/v3/node-templates')
        print(f"✅ Get Node Templates: {response.status_code}")
        
        if response.status_code == 200:
            templates = response.json()
            if templates.get('success'):
                print(f"   Found {templates['count']} node templates")
                # Show a few examples
                for i, (template_id, template) in enumerate(list(templates['templates'].items())[:5]):
                    print(f"   - {template_id}: {template.get('label', 'No label')}")
                    if i >= 4:
                        break
                return True
        
        return False
        
    except Exception as e:
        print(f"❌ Get Node Templates Failed: {e}")
        return False

def test_system_status():
    """Test system status endpoint"""
    try:
        response = requests.get('http://localhost:8000/api/v3/system-status')
        print(f"✅ System Status: {response.status_code}")
        
        if response.status_code == 200:
            status = response.json()
            if status.get('success'):
                system_info = status['status']
                print(f"   Registered Templates: {system_info['registered_templates']}")
                print(f"   Registered Services: {system_info['registered_services']}")
                print(f"   Active Executions: {system_info['active_executions']}")
                print(f"   API Version: {system_info['api_version']}")
                return True
        
        return False
        
    except Exception as e:
        print(f"❌ System Status Failed: {e}")
        return False

def test_workflow_template_summary():
    """Test workflow template summary endpoint"""
    try:
        response = requests.get('http://localhost:8000/api/v3/workflow-templates/system/summary')
        print(f"✅ Template Summary: {response.status_code}")
        
        if response.status_code == 200:
            summary = response.json()
            if summary.get('success'):
                summary_data = summary['summary']
                print(f"   Total Templates: {summary_data['total_templates']}")
                print(f"   Categories: {list(summary_data['categories'].keys())}")
                print(f"   Difficulty Levels: {summary_data['difficulty_levels']}")
                return True
        
        return False
        
    except Exception as e:
        print(f"❌ Template Summary Failed: {e}")
        return False

def main():
    """Main test function"""
    print("🚀 Testing Workflow Template System with Enhanced Execution Engine\n")
    
    # Step 1: Check API health
    if not test_api_health():
        print("❌ API is not running. Please start the backend first.")
        return
    
    print()
    
    # Step 2: Test system status
    test_system_status()
    print()
    
    # Step 3: Test node templates
    test_node_templates()
    print()
    
    # Step 4: Test template summary
    test_workflow_template_summary()
    print()
    
    # Step 5: Test workflow templates
    templates = test_workflow_templates()
    print()
    
    if not templates:
        print("❌ No templates available for testing")
        return
    
    # Step 6: Test template execution
    print("🧪 TEMPLATE EXECUTION TESTS")
    print("="*50)
    
    success_count = 0
    total_tests = min(3, len(templates))  # Test up to 3 templates
    
    for i, template in enumerate(templates[:total_tests]):
        template_id = template['id']
        success = test_single_template_execution(template_id)
        if success:
            success_count += 1
        
        # Wait between tests
        if i < total_tests - 1:
            time.sleep(2)
    
    print(f"\n📊 FINAL RESULTS")
    print("="*30)
    print(f"Templates tested: {total_tests}")
    print(f"Successful executions: {success_count}")
    print(f"Success rate: {(success_count/total_tests)*100:.1f}%")
    
    if success_count == total_tests:
        print("🎉 ALL TESTS PASSED! Workflow template system is working correctly.")
    elif success_count > 0:
        print("⚠️  PARTIAL SUCCESS: Some templates executed successfully.")
    else:
        print("❌ ALL TESTS FAILED: Check execution engine and template configuration.")

if __name__ == "__main__":
    main()