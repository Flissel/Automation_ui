"""
MoireTracker V2 - Desktop Agent mit Reflection-Loop

Entry-Point für das sprachgesteuerte Desktop-Automation System:
- Interaktiver Modus für natürliche Sprachbefehle
- Reflection-Loop für intelligente Fehlerkorrektur (max 3 Runden)
- Vision-basierte Element-Erkennung
- MoireServer Integration für Screenshots

Nutzung:
    python main.py                      # Interaktiver Modus
    python main.py -t "Öffne Notepad"   # Einzelner Task
    python main.py -r                   # Mit Reflection-Loop
"""

import argparse
import asyncio
import logging
import os
import signal
import sys
from datetime import datetime
from typing import Any, Dict, Optional

# Ensure parent directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv

# Load environment from .env in MoireTracker_v2 root
env_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"
)
load_dotenv(env_path)

# Logging Setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("MoireAgent")


class DesktopAgent:
    """
    Sprachgesteuerter Desktop-Agent mit Reflection-Loop.

    Versteht natürliche Befehle wie:
    - "Öffne Notepad"
    - "Schreibe Hallo Welt"
    - "Formatiere den Text fett"
    - "Öffne Chrome und geh zu Google"
    """

    def __init__(self):
        self.orchestrator = None
        self.interaction = None
        self.moire_client = None
        self.running = False
        self.use_reflection = True  # Default: Reflection-Loop aktiviert
        self.max_reflection_rounds = 3

    async def initialize(self) -> bool:
        """Initialisiert alle Agent-Komponenten."""
        logger.info("=" * 60)
        logger.info("🤖 MoireTracker V2 - Desktop Agent")
        logger.info("=" * 60)

        try:
            # Import components
            from agents.interaction import get_interaction_agent
            from agents.orchestrator_v2 import get_orchestrator_v2
            from bridge.websocket_client import MoireWebSocketClient

            # Initialize Orchestrator
            self.orchestrator = get_orchestrator_v2()
            logger.info("✓ Orchestrator V2 initialisiert")

            # Initialize Interaction Agent
            self.interaction = get_interaction_agent()
            logger.info("✓ Interaction Agent initialisiert")

            # Initialize MoireServer Client
            moire_host = os.getenv("MOIRE_HOST", "localhost")
            moire_port = int(os.getenv("MOIRE_PORT", "8765"))
            self.moire_client = MoireWebSocketClient(host=moire_host, port=moire_port)

            # Wire up components
            self.orchestrator.set_interaction_agent(self.interaction)
            self.orchestrator.set_moire_client(self.moire_client)

            # Connect to MoireServer
            logger.info(
                f"🔌 Verbinde mit MoireServer (ws://{moire_host}:{moire_port})..."
            )
            try:
                await self.moire_client.connect()
                logger.info("✓ MoireServer verbunden")
            except Exception as e:
                logger.warning(f"⚠ MoireServer nicht verfügbar: {e}")
                logger.info("  → Agent läuft im Offline-Modus (keine Screenshots)")

            # Start orchestrator
            await self.orchestrator.start()
            logger.info("✓ Orchestrator gestartet")

            self.running = True
            return True

        except ImportError as e:
            logger.error(f"❌ Import-Fehler: {e}")
            logger.error("   Stelle sicher, dass alle Dependencies installiert sind:")
            logger.error("   pip install python-dotenv pyautogui pillow websockets")
            return False
        except Exception as e:
            logger.error(f"❌ Initialisierung fehlgeschlagen: {e}")
            return False

    def print_status(self):
        """Zeigt System-Status an."""
        if not self.orchestrator:
            print("System nicht initialisiert")
            return

        status = self.orchestrator.get_status()
        print()
        print("╔══════════════════════════════════════════╗")
        print("║          🖥️  SYSTEM STATUS               ║")
        print("╠══════════════════════════════════════════╣")
        print(
            f"║ Orchestrator:    {'✓ Aktiv' if status['running'] else '✗ Gestoppt':>22} ║"
        )
        print(
            f"║ MoireServer:     {'✓ Verbunden' if status['has_moire_client'] else '✗ Offline':>22} ║"
        )
        print(
            f"║ Interaction:     {'✓ Bereit' if status['has_interaction_agent'] else '✗ Fehlt':>22} ║"
        )
        print(
            f"║ Vision Agent:    {'✓ Verfügbar' if status.get('has_vision_agent') else '✗ Nicht verfügbar':>22} ║"
        )
        print(
            f"║ Context Tracker: {'✓ Aktiv' if status.get('has_context_tracker') else '✗ Inaktiv':>22} ║"
        )
        print(
            f"║ Reflection-Loop: {'✓ Aktiviert' if self.use_reflection else '✗ Deaktiviert':>22} ║"
        )
        print("╚══════════════════════════════════════════╝")
        print()

    async def execute(self, command: str) -> Dict[str, Any]:
        """
        Führt einen Sprachbefehl aus.

        Args:
            command: Natürlicher Sprachbefehl

        Returns:
            Dict mit Ergebnis
        """
        if not self.orchestrator:
            return {"success": False, "error": "Agent nicht initialisiert"}

        from core.event_queue import TaskStatus

        logger.info(f"\n{'─'*50}")
        logger.info(f"🎯 Befehl: {command}")
        logger.info(f"{'─'*50}")

        start_time = datetime.now()

        try:
            if self.use_reflection:
                # Mit Reflection-Loop
                logger.info(
                    f"📍 Starte mit Reflection-Loop (max {self.max_reflection_rounds} Runden)..."
                )
                result = await self.orchestrator.execute_task_with_reflection(
                    goal=command,
                    max_reflection_rounds=self.max_reflection_rounds,
                    actions_per_round=3,
                )

                elapsed = (datetime.now() - start_time).total_seconds()

                if result["success"]:
                    logger.info(
                        f"\n✅ ERFOLGREICH nach {result['total_rounds']} Runde(n)"
                    )
                    logger.info(f"   Ausgeführte Aktionen: {result['total_actions']}")
                    logger.info(f"   Dauer: {elapsed:.1f}s")
                else:
                    logger.warning(f"\n⚠ NICHT VOLLSTÄNDIG: {result['status']}")
                    logger.warning(f"   Runden: {result['total_rounds']}")
                    if result.get("error"):
                        logger.warning(f"   Fehler: {result['error']}")

                return result

            else:
                # Ohne Reflection (einfacher Modus)
                logger.info("📍 Starte ohne Reflection...")
                task = await self.orchestrator.execute_task_iterative(
                    goal=command, max_iterations=10
                )

                elapsed = (datetime.now() - start_time).total_seconds()

                if task.status == TaskStatus.COMPLETED:
                    logger.info(f"\n✅ ERFOLGREICH")
                    logger.info(f"   Aktionen: {len(task.actions)}")
                    logger.info(f"   Dauer: {elapsed:.1f}s")
                    return {"success": True, "task": task}
                else:
                    logger.warning(f"\n⚠ FEHLGESCHLAGEN: {task.error}")
                    return {"success": False, "error": task.error, "task": task}

        except Exception as e:
            logger.error(f"\n❌ Ausführungsfehler: {e}")
            return {"success": False, "error": str(e)}

    async def interactive_loop(self):
        """Interaktiver Modus für Sprachbefehle."""
        print()
        print("╔════════════════════════════════════════════════════════════╗")
        print("║          🎤 INTERAKTIVER MODUS - Desktop Agent             ║")
        print("╠════════════════════════════════════════════════════════════╣")
        print("║ Gib natürliche Befehle ein, z.B.:                          ║")
        print("║   • 'Öffne Notepad'                                        ║")
        print("║   • 'Schreibe: Hallo Welt'                                 ║")
        print("║   • 'Öffne Chrome und geh zu google.de'                    ║")
        print("║   • 'Formatiere den markierten Text fett'                  ║")
        print("╠════════════════════════════════════════════════════════════╣")
        print("║ Befehle:                                                   ║")
        print("║   status    - Zeigt System-Status                          ║")
        print("║   reflection on/off - Schaltet Reflection-Loop um          ║")
        print("║   help      - Zeigt diese Hilfe                            ║")
        print("║   quit      - Beendet den Agent                            ║")
        print("╚════════════════════════════════════════════════════════════╝")
        print()

        while self.running:
            try:
                # Get user input
                user_input = await asyncio.get_event_loop().run_in_executor(
                    None, lambda: input("🎤 > ")
                )
                user_input = user_input.strip()

                if not user_input:
                    continue

                # Handle special commands
                cmd_lower = user_input.lower()

                if cmd_lower == "quit" or cmd_lower == "exit" or cmd_lower == "q":
                    logger.info("Beende Agent...")
                    break

                if cmd_lower == "status":
                    self.print_status()
                    continue

                if cmd_lower == "help" or cmd_lower == "hilfe" or cmd_lower == "?":
                    self._print_help()
                    continue

                if cmd_lower == "reflection on":
                    self.use_reflection = True
                    print("✓ Reflection-Loop AKTIVIERT")
                    continue

                if cmd_lower == "reflection off":
                    self.use_reflection = False
                    print("✓ Reflection-Loop DEAKTIVIERT")
                    continue

                if cmd_lower.startswith("reflection "):
                    try:
                        rounds = int(cmd_lower.split()[-1])
                        self.max_reflection_rounds = max(1, min(5, rounds))
                        print(f"✓ Max Reflection-Runden: {self.max_reflection_rounds}")
                    except:
                        print("Nutzung: reflection <anzahl> oder reflection on/off")
                    continue

                # Execute command
                await self.execute(user_input)
                print()

            except EOFError:
                break
            except KeyboardInterrupt:
                print("\n")
                break
            except Exception as e:
                logger.error(f"Fehler: {e}")

    def _print_help(self):
        """Zeigt erweiterte Hilfe an."""
        print()
        print("═══════════════════════════════════════════════════════════")
        print("                    📖 HILFE - Desktop Agent               ")
        print("═══════════════════════════════════════════════════════════")
        print()
        print("BEISPIEL-BEFEHLE:")
        print("  • Öffne [App]            - 'Öffne Word', 'Öffne Chrome'")
        print("  • Schreibe: [Text]       - 'Schreibe: Hallo Welt'")
        print("  • Klicke auf [Element]   - 'Klicke auf Speichern'")
        print("  • Drücke [Taste]         - 'Drücke Enter', 'Drücke Strg+S'")
        print("  • Geh zu [URL]           - 'Geh zu google.de'")
        print("  • Markiere [Text]        - 'Markiere den ersten Absatz'")
        print("  • Formatiere [Stil]      - 'Formatiere fett'")
        print()
        print("SYSTEM-BEFEHLE:")
        print("  status          - Zeigt System-Status")
        print("  reflection on   - Aktiviert Reflection-Loop")
        print("  reflection off  - Deaktiviert Reflection-Loop")
        print("  reflection 3    - Setzt max Runden auf 3")
        print("  help            - Diese Hilfe")
        print("  quit            - Beendet den Agent")
        print()
        print("REFLECTION-LOOP:")
        print("  Der Agent analysiert nach jeder Aktion den Bildschirm")
        print("  und korrigiert automatisch Fehler (max 3 Versuche).")
        print()
        print("═══════════════════════════════════════════════════════════")
        print()

    async def shutdown(self):
        """Fährt den Agent herunter."""
        self.running = False

        if self.orchestrator:
            from agents.orchestrator_v2 import shutdown_orchestrator

            await shutdown_orchestrator()

        if self.moire_client:
            await self.moire_client.disconnect()

        logger.info("👋 Desktop Agent beendet")


async def main(
    task: Optional[str] = None, interactive: bool = True, use_reflection: bool = True
):
    """
    Hauptfunktion des Desktop-Agents.

    Args:
        task: Optionaler Task zum sofortigen Ausführen
        interactive: Ob interaktiver Modus aktiviert sein soll
        use_reflection: Ob Reflection-Loop verwendet werden soll
    """
    agent = DesktopAgent()
    agent.use_reflection = use_reflection

    # Setup signal handlers
    shutdown_event = asyncio.Event()

    def signal_handler():
        logger.info("\n⚡ Signal empfangen, beende...")
        shutdown_event.set()

    # Try to set up signal handlers (may not work on Windows)
    try:
        loop = asyncio.get_event_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, signal_handler)
    except (NotImplementedError, AttributeError):
        pass

    try:
        # Initialize
        if not await agent.initialize():
            logger.error("❌ Initialisierung fehlgeschlagen")
            return None

        # Show status
        agent.print_status()

        # Execute task if provided
        if task:
            result = await agent.execute(task)

            if not interactive:
                await agent.shutdown()
                return result

        # Interactive mode
        if interactive:
            await agent.interactive_loop()

    except Exception as e:
        logger.error(f"❌ Fehler: {e}")

    finally:
        await agent.shutdown()


def run():
    """Entry-Point für Kommandozeile."""
    parser = argparse.ArgumentParser(
        description="MoireTracker V2 - Sprachgesteuerter Desktop Agent",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Beispiele:
  python main.py                          # Interaktiver Modus
  python main.py -t "Öffne Notepad"       # Einzelner Task
  python main.py -t "Formatiere fett" -r  # Mit Reflection-Loop
  python main.py --no-reflection          # Ohne Reflection
        """,
    )

    parser.add_argument(
        "--task", "-t", type=str, help='Task zum Ausführen (z.B. "Öffne Word")'
    )

    parser.add_argument(
        "--no-interactive",
        "-n",
        action="store_true",
        help="Kein interaktiver Modus (beendet nach Task)",
    )

    parser.add_argument(
        "--reflection",
        "-r",
        action="store_true",
        default=True,
        help="Aktiviert Reflection-Loop (Standard: an)",
    )

    parser.add_argument(
        "--no-reflection", action="store_true", help="Deaktiviert Reflection-Loop"
    )

    parser.add_argument(
        "--debug", "-d", action="store_true", help="Debug-Logging aktivieren"
    )

    args = parser.parse_args()

    # Configure logging
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)

    # Determine reflection setting
    use_reflection = not args.no_reflection

    # Run
    try:
        asyncio.run(
            main(
                task=args.task,
                interactive=not args.no_interactive,
                use_reflection=use_reflection,
            )
        )
    except KeyboardInterrupt:
        logger.info("\n👋 Unterbrochen")


if __name__ == "__main__":
    run()
