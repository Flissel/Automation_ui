#!/usr/bin/env python3
"""
Test V3 API functionality and debug any import issues
"""
import sys
import os
import traceback

# Add backend directory to path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(backend_dir)

def test_imports():
    """Test all V3 API imports"""
    print("Testing V3 API imports...")
    
    try:
        print("1. Testing standardized_execution_engine import...")
        from standardized_execution_engine import StandardizedExecutionEngine, NodeCategory
        print("✓ StandardizedExecutionEngine imported successfully")
        print(f"✓ NodeCategory enum: {list(NodeCategory)}")
        
        print("\n2. Testing standardized_node_templates import...")
        from standardized_node_templates import get_all_node_templates
        templates = get_all_node_templates()
        print(f"✓ Node templates loaded: {len(templates)} templates found")
        for template in templates[:3]:  # Show first 3
            print(f"  - {template.name} ({template.category})")
        
        print("\n3. Testing api_v3 import...")
        from api_v3 import router
        print("✓ V3 API router imported successfully")
        
        return True
        
    except Exception as e:
        print(f"✗ Import error: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        return False

def test_execution_engine():
    """Test execution engine functionality"""
    print("\nTesting execution engine...")
    
    try:
        from standardized_execution_engine import StandardizedExecutionEngine
        from standardized_node_templates import get_all_node_templates
        
        # Create engine
        engine = StandardizedExecutionEngine()
        
        # Register templates
        templates = get_all_node_templates()
        for template in templates:
            engine.register_node_template(template)
        
        print(f"✓ Execution engine created with {len(templates)} registered templates")
        
        # Test getting templates by category
        from standardized_execution_engine import NodeCategory
        trigger_templates = engine.get_node_templates_by_category(NodeCategory.TRIGGERS)
        action_templates = engine.get_node_templates_by_category(NodeCategory.ACTIONS)
        
        print(f"✓ Found {len(trigger_templates)} trigger templates")
        print(f"✓ Found {len(action_templates)} action templates")
        
        return True
        
    except Exception as e:
        print(f"✗ Execution engine error: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        return False

def main():
    print("=== V3 API Debug Test ===")
    
    # Test imports
    imports_ok = test_imports()
    
    if imports_ok:
        # Test execution engine
        engine_ok = test_execution_engine()
        
        if engine_ok:
            print("\n✓ All V3 API components are working correctly!")
            return True
    
    print("\n✗ V3 API has issues that need to be resolved")
    return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)