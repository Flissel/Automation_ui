#!/usr/bin/env python3
"""
Test V3 API server endpoints directly
"""
import requests
import json
import sys

def test_v3_endpoints():
    """Test V3 API endpoints"""
    base_url = "http://localhost:8000"
    
    endpoints = [
        "/api/v3/health",
        "/api/v3/node-templates",
    ]
    
    print("Testing V3 API endpoints...")
    
    for endpoint in endpoints:
        url = f"{base_url}{endpoint}"
        print(f"\nTesting {url}")
        
        try:
            response = requests.get(url, timeout=5)
            print(f"✓ Status: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if endpoint == "/api/v3/health":
                        print(f"✓ Health check: {data}")
                    elif endpoint == "/api/v3/node-templates":
                        templates = data.get("templates", [])
                        print(f"✓ Found {len(templates)} node templates")
                        for template in templates[:3]:  # Show first 3
                            print(f"  - {template.get('name', 'Unknown')} ({template.get('category', 'Unknown')})")
                except json.JSONDecodeError:
                    print(f"✓ Response (non-JSON): {response.text[:100]}...")
            else:
                print(f"✗ Error response: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print(f"✗ Connection failed - server might not be running")
            return False
        except requests.exceptions.Timeout:
            print(f"✗ Request timed out")
            return False
        except Exception as e:
            print(f"✗ Error: {e}")
            return False
    
    return True

def test_workflow_execution():
    """Test a simple workflow execution"""
    print("\n=== Testing Workflow Execution ===")
    
    # Simple workflow with manual trigger -> click action
    workflow = {
        "nodes": [
            {
                "id": "trigger1",
                "type": "manual_trigger",
                "config": {}
            },
            {
                "id": "click1", 
                "type": "click_action",
                "config": {
                    "coordinates": {"x": 100, "y": 100},
                    "button": "left"
                }
            }
        ],
        "connections": [
            {
                "source_node_id": "trigger1",
                "source_port": "trigger_output",
                "target_node_id": "click1",
                "target_port": "trigger_input"
            }
        ]
    }
    
    try:
        url = "http://localhost:8000/api/v3/execute-workflow"
        print(f"Testing {url}")
        
        response = requests.post(url, json=workflow, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Workflow executed successfully")
            print(f"Execution ID: {result.get('execution_id')}")
            print(f"Status: {result.get('status')}")
        else:
            print(f"✗ Workflow execution failed: {response.text}")
            
        return response.status_code == 200
        
    except Exception as e:
        print(f"✗ Workflow execution error: {e}")
        return False

def main():
    print("=== V3 API Server Test ===")
    
    # Test basic endpoints
    endpoints_ok = test_v3_endpoints()
    
    if endpoints_ok:
        # Test workflow execution
        workflow_ok = test_workflow_execution()
        
        if workflow_ok:
            print("\n✓ V3 API server is fully functional!")
        else:
            print("\n⚠ V3 API endpoints work, but workflow execution has issues")
    else:
        print("\n✗ V3 API server connection failed")
    
    return endpoints_ok

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)