#!/bin/bash
# Health check script for backend services

# Get service port from environment variable or use default
PORT=${SERVICE_PORT:-8000}

# Perform health check
curl -f http://localhost:${PORT}/health || exit 1