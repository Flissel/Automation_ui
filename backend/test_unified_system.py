"""Test the Unified System - LLM Intent Router with Moire Agent tools.

Tests that Claude can use both Stufe 1 (low-level) and Stufe 2 (high-level) tools.
"""
import requests
import json
import sys

BASE_URL = "http://localhost:8007"

def test_health():
    """Verify 21 tools are available."""
    r = requests.get(f"{BASE_URL}/api/llm/intent/health")
    data = r.json()
    print(f"Health: {json.dumps(data, indent=2)}")
    assert data["tools_count"] == 21, f"Expected 21 tools, got {data['tools_count']}"
    print("PASS: 21 tools available\n")

def test_vision_analyze():
    """Test vision_analyze tool - should use Gemini Vision to analyze screen."""
    print("=" * 60)
    print("TEST: vision_analyze (Stufe 2)")
    print("Intent: 'analysiere meinen bildschirm mit ki vision - was siehst du?'")
    print("=" * 60)

    r = requests.post(
        f"{BASE_URL}/api/llm/intent/stream",
        json={"text": "analysiere meinen bildschirm mit ki vision - was siehst du?"},
        stream=True,
        timeout=120
    )

    tools_used = []
    for line in r.iter_lines(decode_unicode=True):
        if not line or not line.startswith("data: "):
            continue
        data = json.loads(line[6:])
        evt = data.get("type", "")

        if evt == "thinking":
            content = data.get("content", "")
            if content:
                print(f"  [thinking] {content[:120]}")
        elif evt == "tool_start":
            tool = data.get("tool", "")
            tools_used.append(tool)
            print(f"  >> Tool: {tool}({json.dumps(data.get('params', {}), ensure_ascii=False)[:100]})")
        elif evt == "tool_result":
            success = data.get("success", False)
            result = json.dumps(data.get("result", {}), ensure_ascii=False)
            print(f"  << Result: success={success}, {result[:200]}")
        elif evt == "done":
            print(f"\n  Summary: {data.get('summary', '')[:300]}")
            print(f"  Tools used: {tools_used}")
            print(f"  Steps: {data.get('total_steps', 0)}, Iterations: {data.get('iterations', 0)}")
            print(f"  Duration: {data.get('duration_ms', 0):.0f}ms")

    has_vision = "vision_analyze" in tools_used
    print(f"\nResult: {'PASS' if has_vision else 'WARN'} - vision_analyze {'used' if has_vision else 'not used'}")
    print()
    return has_vision

def test_plan_task():
    """Test plan_task tool - should create a plan for multi-step task."""
    print("=" * 60)
    print("TEST: plan_task (Stufe 2)")
    print("Intent: 'erstelle einen plan um notepad zu oeffnen und hello world zu schreiben'")
    print("=" * 60)

    r = requests.post(
        f"{BASE_URL}/api/llm/intent/stream",
        json={"text": "erstelle einen plan um notepad zu oeffnen und hello world zu schreiben"},
        stream=True,
        timeout=120
    )

    tools_used = []
    for line in r.iter_lines(decode_unicode=True):
        if not line or not line.startswith("data: "):
            continue
        data = json.loads(line[6:])
        evt = data.get("type", "")

        if evt == "thinking":
            content = data.get("content", "")
            if content:
                print(f"  [thinking] {content[:120]}")
        elif evt == "tool_start":
            tool = data.get("tool", "")
            tools_used.append(tool)
            print(f"  >> Tool: {tool}({json.dumps(data.get('params', {}), ensure_ascii=False)[:100]})")
        elif evt == "tool_result":
            success = data.get("success", False)
            result = json.dumps(data.get("result", {}), ensure_ascii=False)
            print(f"  << Result: success={success}, {result[:300]}")
        elif evt == "done":
            print(f"\n  Summary: {data.get('summary', '')[:300]}")
            print(f"  Tools used: {tools_used}")
            print(f"  Steps: {data.get('total_steps', 0)}, Iterations: {data.get('iterations', 0)}")
            print(f"  Duration: {data.get('duration_ms', 0):.0f}ms")

    has_plan = "plan_task" in tools_used
    print(f"\nResult: {'PASS' if has_plan else 'WARN'} - plan_task {'used' if has_plan else 'not used'}")
    print()
    return has_plan

def test_stufe1_still_works():
    """Test that simple commands still use Stufe 1 tools."""
    print("=" * 60)
    print("TEST: Stufe 1 still works")
    print("Intent: 'lies den bildschirm'")
    print("=" * 60)

    r = requests.post(
        f"{BASE_URL}/api/llm/intent/stream",
        json={"text": "lies den bildschirm"},
        stream=True,
        timeout=120
    )

    tools_used = []
    for line in r.iter_lines(decode_unicode=True):
        if not line or not line.startswith("data: "):
            continue
        data = json.loads(line[6:])
        evt = data.get("type", "")

        if evt == "tool_start":
            tool = data.get("tool", "")
            tools_used.append(tool)
            print(f"  >> Tool: {tool}")
        elif evt == "tool_result":
            success = data.get("success", False)
            print(f"  << Result: success={success}")
        elif evt == "done":
            print(f"\n  Summary: {data.get('summary', '')[:200]}")
            print(f"  Tools used: {tools_used}")

    has_screen_read = "screen_read" in tools_used
    print(f"\nResult: {'PASS' if has_screen_read else 'WARN'} - screen_read {'used' if has_screen_read else 'not used'}")
    print()
    return has_screen_read


if __name__ == "__main__":
    print("Unified Desktop Automation System - Integration Tests")
    print("=" * 60)

    # Health check first
    test_health()

    # Run specified test or all
    test_name = sys.argv[1] if len(sys.argv) > 1 else "all"

    if test_name == "vision":
        test_vision_analyze()
    elif test_name == "plan":
        test_plan_task()
    elif test_name == "stufe1":
        test_stufe1_still_works()
    elif test_name == "all":
        results = []
        results.append(("plan_task", test_plan_task()))
        results.append(("vision_analyze", test_vision_analyze()))
        results.append(("stufe1", test_stufe1_still_works()))

        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        for name, passed in results:
            print(f"  {name}: {'PASS' if passed else 'WARN'}")
