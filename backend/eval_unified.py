"""Interactive Evaluation - Unified Desktop Automation System

Tests the agent across different task categories to evaluate
when it chooses Stufe 1 vs Stufe 2 tools correctly.
"""
import requests
import json
import sys
import time

BASE_URL = "http://localhost:8007"

# Color codes for terminal
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

EVAL_SCENARIOS = [
    # (Category, Intent, Expected tools, Description)
    {
        "category": "Stufe 1 - Einfach",
        "intent": "welches fenster ist gerade aktiv?",
        "expected": ["get_focus"],
        "desc": "Einfache Abfrage -> sollte nur get_focus nutzen"
    },
    {
        "category": "Stufe 2 - Vision",
        "intent": "schau dir meinen bildschirm an und beschreibe was du siehst - nutze die ki vision",
        "expected": ["vision_analyze"],
        "desc": "Vision-Analyse -> sollte vision_analyze (Gemini) nutzen"
    },
    {
        "category": "Stufe 2 - Planung",
        "intent": "erstelle mir einen plan um den windows rechner zu oeffnen und 123+456 zu berechnen",
        "expected": ["plan_task"],
        "desc": "Planungs-Aufgabe -> sollte plan_task nutzen"
    },
    {
        "category": "Stufe 2 - Plan+Execute",
        "intent": "oeffne notepad",
        "expected": ["plan_task", "execute_plan"],
        "desc": "Mehrstufige Aufgabe -> sollte plan_task + execute_plan nutzen"
    },
    {
        "category": "Kommunikation",
        "intent": "schick peter eine nachricht: das unified system funktioniert",
        "expected": ["send_message"],
        "desc": "Messaging -> sollte send_message nutzen (nicht Desktop-Automation)"
    },
]


def run_scenario(scenario, index, total):
    """Run a single evaluation scenario."""
    cat = scenario["category"]
    intent = scenario["intent"]
    expected = scenario["expected"]
    desc = scenario["desc"]

    print(f"\n{'='*70}")
    print(f"{BOLD}[{index}/{total}] {cat}{RESET}")
    print(f"  Intent:   \"{intent}\"")
    print(f"  Erwartet: {expected}")
    print(f"  Info:     {desc}")
    print(f"{'='*70}")

    start = time.time()
    tools_used = []
    summary = ""
    iterations = 0
    total_steps = 0

    try:
        r = requests.post(
            f"{BASE_URL}/api/llm/intent/stream",
            json={"text": intent},
            stream=True,
            timeout=180
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
                    # Show first 150 chars of thinking
                    preview = content.replace("\n", " ")[:150]
                    print(f"  {CYAN}[denkt]{RESET} {preview}")

            elif evt == "tool_start":
                tool = data.get("tool", "")
                params = data.get("params", {})
                tools_used.append(tool)
                params_str = json.dumps(params, ensure_ascii=False)
                if len(params_str) > 120:
                    params_str = params_str[:120] + "..."
                print(f"  {YELLOW}>> {tool}{RESET}({params_str})")

            elif evt == "tool_result":
                success = data.get("success", False)
                result = data.get("result", {})
                color = GREEN if success else RED
                # Show condensed result
                result_str = json.dumps(result, ensure_ascii=False)
                if len(result_str) > 200:
                    result_str = result_str[:200] + "..."
                print(f"  {color}<< {'OK' if success else 'FAIL'}{RESET} {result_str}")

            elif evt == "done":
                summary = data.get("summary", "")
                iterations = data.get("iterations", 0)
                total_steps = data.get("total_steps", 0)

            elif evt == "error":
                print(f"  {RED}ERROR: {data.get('message', '')}{RESET}")

    except requests.exceptions.Timeout:
        print(f"  {RED}TIMEOUT after 180s{RESET}")
        return {"passed": False, "tools": tools_used, "reason": "timeout"}
    except Exception as e:
        print(f"  {RED}ERROR: {e}{RESET}")
        return {"passed": False, "tools": tools_used, "reason": str(e)}

    elapsed = time.time() - start

    # Evaluate results
    expected_found = [t for t in expected if t in tools_used]
    all_expected = len(expected_found) == len(expected)

    print(f"\n  {BOLD}Ergebnis:{RESET}")
    print(f"    Tools genutzt:   {tools_used}")
    print(f"    Erwartet:        {expected}")
    print(f"    Match:           {expected_found} / {expected}")
    print(f"    Schritte:        {total_steps}, Iterationen: {iterations}")
    print(f"    Dauer:           {elapsed:.1f}s")

    if summary:
        # Truncate summary for display
        s = summary.replace("\n", " ")
        if len(s) > 250:
            s = s[:250] + "..."
        print(f"    Zusammenfassung: {s}")

    status = GREEN + "PASS" + RESET if all_expected else YELLOW + "PARTIAL" + RESET
    print(f"    Status:          {status}")

    return {
        "passed": all_expected,
        "tools": tools_used,
        "expected": expected,
        "elapsed": elapsed,
        "iterations": iterations,
        "steps": total_steps
    }


def main():
    # Health check
    print(f"{BOLD}Unified Desktop Automation System - Evaluation{RESET}")
    print(f"{'='*70}")

    try:
        r = requests.get(f"{BASE_URL}/api/llm/intent/health", timeout=5)
        health = r.json()
        print(f"  Status:  {health['status']}")
        print(f"  Model:   {health['model']}")
        print(f"  Tools:   {health['tools_count']}")
        print(f"  MaxIter: {health['max_iterations']}")
    except Exception as e:
        print(f"{RED}Backend nicht erreichbar: {e}{RESET}")
        sys.exit(1)

    if health["tools_count"] != 21:
        print(f"{RED}Erwartet 21 Tools, gefunden {health['tools_count']}{RESET}")
        sys.exit(1)

    # Select scenarios
    if len(sys.argv) > 1:
        try:
            idx = int(sys.argv[1]) - 1
            scenarios = [EVAL_SCENARIOS[idx]]
            start_idx = idx + 1
        except (ValueError, IndexError):
            # Search by keyword
            keyword = sys.argv[1].lower()
            scenarios = [s for s in EVAL_SCENARIOS if keyword in s["category"].lower() or keyword in s["intent"].lower()]
            start_idx = 1
            if not scenarios:
                print(f"Kein Szenario gefunden fuer '{sys.argv[1]}'")
                print("Verfuegbare Szenarien:")
                for i, s in enumerate(EVAL_SCENARIOS):
                    print(f"  {i+1}. [{s['category']}] {s['intent']}")
                sys.exit(1)
    else:
        scenarios = EVAL_SCENARIOS
        start_idx = 1

    print(f"\n  Szenarien: {len(scenarios)}")

    # Run scenarios
    results = []
    for i, scenario in enumerate(scenarios):
        result = run_scenario(scenario, start_idx + i, len(EVAL_SCENARIOS))
        results.append((scenario, result))

    # Summary
    print(f"\n\n{'='*70}")
    print(f"{BOLD}EVALUATION SUMMARY{RESET}")
    print(f"{'='*70}")

    passed = sum(1 for _, r in results if r["passed"])
    total = len(results)
    total_time = sum(r["elapsed"] for _, r in results)

    for scenario, result in results:
        status = f"{GREEN}PASS{RESET}" if result["passed"] else f"{YELLOW}PARTIAL{RESET}"
        tools_str = ", ".join(result["tools"]) if result["tools"] else "keine"
        print(f"  {status} [{scenario['category']}] {tools_str} ({result['elapsed']:.1f}s)")

    print(f"\n  Gesamt: {passed}/{total} bestanden, {total_time:.1f}s total")


if __name__ == "__main__":
    main()
