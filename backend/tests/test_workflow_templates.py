"""
Test script to verify workflow template system functionality
"""

import requests
import json
import asyncio
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_URL = "http://localhost:8000/api/v3"

async def test_workflow_templates():
    """Test all workflow template endpoints"""
    
    print("🧪 Testing Workflow Template System")
    print("=" * 50)
    
    # Test 1: Get workflow template summary
    print("\n1. Testing workflow template summary...")
    try:
        response = requests.get(f"{BASE_URL}/workflow-templates/system/summary")
        if response.status_code == 200:
            summary = response.json()
            print(f"✅ Summary endpoint working")
            print(f"   Total templates: {summary['summary']['total_templates']}")
            print(f"   Categories: {list(summary['summary']['categories'].keys())}")
            print(f"   Difficulty distribution: {summary['summary']['difficulty_distribution']}")
        else:
            print(f"❌ Summary endpoint failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Summary endpoint error: {str(e)}")
    
    # Test 2: Get all workflow templates
    print("\n2. Testing get all workflow templates...")
    try:
        response = requests.get(f"{BASE_URL}/workflow-templates")
        if response.status_code == 200:
            templates = response.json()
            print(f"✅ All templates endpoint working")
            print(f"   Retrieved {templates['count']} templates")
            if templates['templates']:
                first_template = templates['templates'][0]
                print(f"   First template: {first_template['name']}")
                print(f"   Category: {first_template['category']}")
                print(f"   Nodes: {len(first_template['nodes'])}")
                print(f"   Connections: {len(first_template['connections'])}")
        else:
            print(f"❌ All templates endpoint failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ All templates endpoint error: {str(e)}")
    
    # Test 3: Get template by category
    print("\n3. Testing get templates by category...")
    try:
        response = requests.get(f"{BASE_URL}/workflow-templates?category=Desktop Automation")
        if response.status_code == 200:
            templates = response.json()
            print(f"✅ Category filter working")
            print(f"   Desktop Automation templates: {templates['count']}")
        else:
            print(f"❌ Category filter failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Category filter error: {str(e)}")
    
    # Test 4: Search templates
    print("\n4. Testing template search...")
    try:
        response = requests.get(f"{BASE_URL}/workflow-templates?search=click")
        if response.status_code == 200:
            templates = response.json()
            print(f"✅ Search functionality working")
            print(f"   Templates containing 'click': {templates['count']}")
        else:
            print(f"❌ Search failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Search error: {str(e)}")
    
    # Test 5: Get specific template
    print("\n5. Testing get specific template...")
    try:
        response = requests.get(f"{BASE_URL}/workflow-templates/simple_click_automation")
        if response.status_code == 200:
            template = response.json()
            print(f"✅ Specific template endpoint working")
            print(f"   Template: {template['template']['name']}")
            print(f"   Description: {template['template']['description']}")
            print(f"   Nodes: {len(template['template']['nodes'])}")
            print(f"   Connections: {len(template['template']['connections'])}")
        else:
            print(f"❌ Specific template failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Specific template error: {str(e)}")
    
    # Test 6: Test template execution (dry run)
    print("\n6. Testing template execution...")
    try:
        execution_data = {
            "config_overrides": {
                "trigger_1": {
                    "trigger_message": "Test execution from API"
                }
            }
        }
        response = requests.post(
            f"{BASE_URL}/workflow-templates/simple_click_automation/execute", 
            json=execution_data
        )
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Template execution endpoint working")
            print(f"   Execution ID: {result['execution_id']}")
            print(f"   Success: {result['success']}")
            if result.get('error'):
                print(f"   Error: {result['error']}")
        else:
            print(f"❌ Template execution failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Template execution error: {str(e)}")
    
    # Test 7: Test node templates compatibility
    print("\n7. Testing node templates compatibility...")
    try:
        response = requests.get(f"{BASE_URL}/node-templates")
        if response.status_code == 200:
            node_templates = response.json()
            print(f"✅ Node templates accessible: {node_templates['count']} templates")
        else:
            print(f"❌ Node templates failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Node templates error: {str(e)}")
    
    print("\n" + "=" * 50)
    print("🏁 Workflow Template System Test Complete")

if __name__ == "__main__":
    asyncio.run(test_workflow_templates())