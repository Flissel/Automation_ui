#!/usr/bin/env python3
"""
TRAE Backend Server

Main server entry point that starts the FastAPI server with integrated WebSocket support
"""

import os
import sys
import uvicorn
from pathlib import Path

# Add current directory to path for proper imports
sys.path.append(str(Path(__file__).parent))

from app.main import create_app

# Create app instance for uvicorn to import
app = create_app()

def main():
    """Main function to start the server"""
    # Get configuration
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8007))  # Changed to 8007 for WebSocket compatibility
    ws_port = int(os.getenv("WS_PORT", 8007))
    log_level = os.getenv("LOG_LEVEL", "info").lower()
    environment = os.getenv("ENVIRONMENT", "development")
    debug = os.getenv("DEBUG", "True").lower() == "true"
    
    print(f"🚀 Starting TRAE Backend v2.0.0")
    print(f"📍 Environment: {environment}")
    print(f"🐛 Debug mode: {debug}")
    print(f"🌐 API Server: {host}:{port}")
    print(f"🔌 WebSocket Server: Integrated on same port (FastAPI WebSocket support)")
    print(f"⚡ Workers: 1")
    print(f"📡 Live Desktop Integration: Enabled")
    print(f"🔧 Service Manager: Enabled")
    print("")
    print(f"📋 Available endpoints:")
    print(f"   • API: http://{host}:{port}/docs")
    print(f"   • WebSocket: ws://{host}:{port}/ws/live-desktop")
    print(f"   • Health: http://{host}:{port}/api/health")
    print("")
    
    # Create FastAPI app with integrated WebSocket support
    app = create_app()
    
    # Start FastAPI server with WebSocket support
    try:
        if debug and environment == "development":
            # Use import string for reload mode
            uvicorn.run(
                "server:app",
                host=host,
                port=port,
                log_level=log_level,
                reload=True,
                reload_dirs=["app"],
                access_log=True,
                ws_ping_interval=20,
                ws_ping_timeout=20
            )
        else:
            # Use app instance for production
            uvicorn.run(
                app=app,
                host=host,
                port=port,
                log_level=log_level,
                access_log=True,
                ws_ping_interval=20,
                ws_ping_timeout=20
            )
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Server error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()