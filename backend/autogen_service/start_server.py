#!/usr/bin/env python3
"""
Start-Script für den AutoGen API Server.
Lädt automatisch die .env Datei und zeigt Konfiguration an.
"""

import os
import sys

# Füge den Pfad zum Backend-Modul hinzu
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Lade .env Datei
try:
    from dotenv import load_dotenv
    # Lade .env aus verschiedenen möglichen Pfaden
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    env_file = os.path.join(project_root, '.env')
    if os.path.exists(env_file):
        load_dotenv(env_file)
        print(f"✅ .env Datei geladen: {env_file}")
    else:
        print(f"⚠️  Keine .env Datei gefunden: {env_file}")
except ImportError:
    print("⚠️  python-dotenv nicht installiert - .env wird nicht automatisch geladen")

# Zeige Konfiguration
print("\n" + "="*60)
print("   AutoGen API Server - Konfiguration")
print("="*60)

openrouter_key = os.getenv('OPENROUTER_API_KEY', '')
openai_key = os.getenv('OPENAI_API_KEY', '')
model = os.getenv('AUTOGEN_MODEL', 'openai/gpt-4o')
base_url = os.getenv('OPENAI_API_BASE', 'https://openrouter.ai/api/v1')

print(f"   Model:          {model}")
print(f"   API Base URL:   {base_url}")
print(f"   OpenRouter Key: {'✅ SET (' + openrouter_key[:10] + '...)' if openrouter_key else '❌ NICHT GESETZT'}")
print(f"   OpenAI Key:     {'✅ SET' if openai_key else '❌ NICHT GESETZT'}")
print("="*60 + "\n")

# Prüfe ob AutoGen verfügbar ist
try:
    from autogen_agentchat.agents import AssistantAgent
    print("✅ AutoGen ist verfügbar")
except ImportError as e:
    print(f"⚠️  AutoGen nicht verfügbar: {e}")
    print("   Der Server wird im Mock-Modus starten")

# Starte den Server
if __name__ == "__main__":
    import uvicorn
    
    print("\n🚀 Starte AutoGen API Server auf http://0.0.0.0:8008")
    print("   Health-Check: http://localhost:8008/health")
    print("   Dokumentation: http://localhost:8008/docs")
    print("\n" + "="*60 + "\n")
    
    uvicorn.run(
        "backend.autogen_service.api_server:app",
        host="0.0.0.0",
        port=8008,
        reload=True,
        log_level="info"
    )