"""End-to-End Evaluation - Plan + Execute + Vision Verify

Tests a real desktop automation task with vision-based verification.
"""
import requests
import json
import time
import sys

BASE_URL = "http://localhost:8007"

def run_e2e(intent: str, description: str):
    """Run a single end-to-end test with SSE streaming."""
    print(f"\n{'='*70}")
    print(f"E2E TEST: {description}")
    print(f"Intent: \"{intent}\"")
    print(f"{'='*70}")

    start = time.time()
    tools_used = []
    summary = ""

    try:
        r = requests.post(
            f"{BASE_URL}/api/llm/intent/stream",
            json={"text": intent},
            stream=True,
            timeout=300
        )

        for line in r.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data: "):
                continue
            try:
                data = json.loads(line[6:])
            except json.JSONDecodeError:
                continue

            evt = data.get("type", "")

            if evt == "thinking":
                content = data.get("content", "")
                if content:
                    preview = content.replace("\n", " ")[:200]
                    print(f"  [denkt] {preview}")

            elif evt == "tool_start":
                tool = data.get("tool", "")
                params = data.get("params", {})
                tools_used.append(tool)
                params_str = json.dumps(params, ensure_ascii=False)
                if len(params_str) > 150:
                    params_str = params_str[:150] + "..."
                print(f"  >> {tool}({params_str})")

            elif evt == "tool_result":
                success = data.get("success", False)
                result = data.get("result", {})
                status = "OK" if success else "FAIL"
                result_str = json.dumps(result, ensure_ascii=False)
                if len(result_str) > 300:
                    result_str = result_str[:300] + "..."
                print(f"  << {status}: {result_str}")

            elif evt == "done":
                summary = data.get("summary", "")
                iters = data.get("iterations", 0)
                steps = data.get("total_steps", 0)
                elapsed = time.time() - start
                print(f"\n  ERGEBNIS:")
                print(f"    Tools:       {tools_used}")
                print(f"    Schritte:    {steps}")
                print(f"    Iterationen: {iters}")
                print(f"    Dauer:       {elapsed:.1f}s")
                if summary:
                    s = summary.replace("\n", " ")
                    if len(s) > 400:
                        s = s[:400] + "..."
                    print(f"    Summary:     {s}")

            elif evt == "error":
                print(f"  ERROR: {data.get('message', '')[:200]}")

    except Exception as e:
        print(f"  EXCEPTION: {e}")

    return tools_used


if __name__ == "__main__":
    test = sys.argv[1] if len(sys.argv) > 1 else "notepad"

    if test == "notepad":
        # Test: Open notepad, type text, verify with vision
        run_e2e(
            "oeffne notepad, schreib 'Hello World' rein, und pruefe dann mit vision ob es geklappt hat",
            "Notepad oeffnen + Text schreiben + Vision-Verifizierung"
        )

    elif test == "calc":
        # Test: Open calculator, do math, verify
        run_e2e(
            "oeffne den windows rechner, berechne 42 mal 17, und lies das ergebnis mit vision ab",
            "Rechner oeffnen + Berechnung + Vision-Ergebnis ablesen"
        )

    elif test == "focus":
        # Test: Simple vision check of current state
        run_e2e(
            "analysiere meinen bildschirm mit vision und sag mir welche programme offen sind",
            "Vision-Analyse: Programme erkennen"
        )

    elif test == "verify":
        # Test: Just vision verify what's on screen now
        run_e2e(
            "nutze vision_analyze um den bildschirm zu pruefen - ist notepad offen? was steht drin?",
            "Vision-Verifizierung: Notepad pruefen"
        )

    elif test == "custom":
        # Custom intent from command line
        intent = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else "was siehst du auf dem bildschirm?"
        run_e2e(intent, f"Custom: {intent[:50]}")

    else:
        print("Usage: python eval_e2e.py [notepad|calc|focus|verify|custom <intent>]")
