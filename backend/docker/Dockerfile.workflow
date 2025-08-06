# Workflow Orchestrator Service Dockerfile
FROM denoland/deno:1.40.2

# Set working directory
WORKDIR /app

# Create app user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy service files
COPY services/workflow-orchestrator.ts ./services/
COPY config/ ./config/

# Create necessary directories
RUN mkdir -p /app/logs /app/temp /app/workflows && \
    chown -R appuser:appuser /app

# Cache dependencies
RUN deno cache services/workflow-orchestrator.ts

# Health check script
COPY docker/healthcheck.sh ./
RUN chmod +x healthcheck.sh

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8001

# Environment variables
ENV DENO_ENV=production
ENV SERVICE_NAME=workflow-orchestrator
ENV SERVICE_PORT=8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD ./healthcheck.sh

# Start the service
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "--allow-write", "services/workflow-orchestrator.ts"]