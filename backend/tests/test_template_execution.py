import requests
import json

# Test template execution with correct IDs
def test_template_execution():
    # Get available templates first
    r = requests.get('http://localhost:8000/api/v3/workflow-templates')
    if r.status_code != 200:
        print(f"Error getting templates: {r.status_code}")
        return
    
    templates = r.json()['templates']
    print(f"Testing execution for {len(templates)} templates:")
    
    for template in templates:
        template_id = template['id']
        template_name = template['name']
        print(f"\n=== Testing: {template_name} (ID: {template_id}) ===")
        
        # Test template execution
        execution_data = {
            "inputs": {
                "start_trigger": {
                    "triggered": True,
                    "timestamp": "2024-01-20T10:00:00Z"
                }
            }
        }
        
        try:
            r2 = requests.post(
                f'http://localhost:8000/api/v3/workflow-templates/{template_id}/execute',
                json=execution_data
            )
            print(f"Execution status: {r2.status_code}")
            if r2.status_code == 200:
                result = r2.json()
                print(f"✅ Success: {result.get('message', 'Template executed')}")
                if 'execution_results' in result:
                    print(f"   Nodes executed: {len(result['execution_results'])}")
            elif r2.status_code == 404:
                print(f"❌ 404 Error: Template not found")
                print(f"   Response: {r2.text}")
            else:
                print(f"❌ Error {r2.status_code}: {r2.text}")
                
        except Exception as e:
            print(f"❌ Exception: {e}")

if __name__ == "__main__":
    test_template_execution()