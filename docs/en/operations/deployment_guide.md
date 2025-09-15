# Deployment Guide - Trusted Login System

## Overview

This comprehensive deployment guide describes the different deployment options for the Trusted Login System, from local development to production environments.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Local Development](#local-development)
3. [Docker Deployment](#docker-deployment)
4. [Production Deployment](#production-deployment)
5. [Cloud Deployment](#cloud-deployment)
6. [Monitoring & Logging](#monitoring--logging)
7. [Backup & Recovery](#backup--recovery)
8. [Troubleshooting](#troubleshooting)
9. [Security Guidelines for Deployment](#security-guidelines-for-deployment)
10. [Conclusion](#conclusion)

## Cloud Deployment

### AWS Deployment

```bash
# Create instance
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-id subnet-xxxxxxxxx
```

#### 3. Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name trusted-login-alb \
  --subnets subnet-xxxxxxxxx subnet-yyyyyyyyy \
  --security-groups sg-xxxxxxxxx
```

### Vercel Deployment (Frontend)

```bash
# Install Vercel CLI
npm i -g vercel

# Deployment
vercel --prod
```

### Railway Deployment (Backend)

```bash
# Login and deploy
railway login
railway init
railway up
```

## Monitoring & Logging

### 1. Prometheus & Grafana Setup

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana

volumes:
  grafana-storage:
```

### 2. Logging Configuration

```python
# backend/app/logging_config.py
import logging
from logging.handlers import RotatingFileHandler
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno
        }
        return json.dumps(log_entry)

def setup_logging():
    # File handler
    file_handler = RotatingFileHandler(
        'logs/app.log',
        maxBytes=10485760,  # 10MB
        backupCount=5
    )
    file_handler.setFormatter(JSONFormatter())

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    ))

    # Root logger
    logging.basicConfig(
        level=logging.INFO,
        handlers=[file_handler, console_handler]
    )
```

### 3. Health Checks

```python
# backend/app/health_checks.py
from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import psutil
import time
from datetime import datetime

router = APIRouter()

start_time = time.time()

@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Comprehensive health check endpoint"""
    try:
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "uptime": time.time() - start_time,
            "system": {
                "cpu_percent": psutil.cpu_percent(),
                "memory_percent": psutil.virtual_memory().percent,
                "disk_percent": psutil.disk_usage('/').percent
            },
            "services": {
                "database": await check_database(),
                "supabase": await check_supabase(),
                "external_apis": await check_external_apis()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Health check failed: {str(e)}")

async def check_database() -> Dict[str, Any]:
    """Check database connectivity"""
    # Implementation for Database Health Check
    pass

async def check_supabase() -> Dict[str, Any]:
    """Check Supabase connectivity"""
    # Implementation for Supabase Health Check
    pass

async def check_external_apis() -> Dict[str, Any]:
    """Check external API connectivity"""
    # Implementation for External API Health Checks
    pass
```

## Backup & Recovery

### 1. Database Backup

```bash
#!/bin/bash
# backup-database.sh

DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/opt/backups/database"
DB_NAME="trusted_login_db"

# Create backup directory
mkdir -p $BACKUP_DIR

# PostgreSQL backup
pg_dump -h localhost -U postgres $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Compression
gzip $BACKUP_DIR/backup_$DATE.sql

# Delete old backups (older than 30 days)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Database backup completed: backup_$DATE.sql.gz"
```

### 2. Application Data Backup

```bash
#!/bin/bash
# backup-application.sh

DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/opt/backups/application"
APP_DIR="/opt/trusted-login-system"

# Create backup directory
mkdir -p $BACKUP_DIR

# Application files backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz \
  --exclude='node_modules' \
  --exclude='__pycache__' \
  --exclude='*.log' \
  $APP_DIR

# Runtime data backup
tar -czf $BACKUP_DIR/runtime_backup_$DATE.tar.gz \
  $APP_DIR/backend/runtime \
  $APP_DIR/backend/data

echo "Application backup completed: app_backup_$DATE.tar.gz"
```

### 3. Automated Backup Cron

```bash
# Crontab entries
# Database backup daily at 2:00 AM
0 2 * * * /opt/scripts/backup-database.sh

# Application backup weekly on Sundays at 3:00 AM
0 3 * * 0 /opt/scripts/backup-application.sh

# Log rotation daily at 1:00 AM
0 1 * * * /usr/sbin/logrotate /etc/logrotate.conf
```

### 4. Recovery Procedures

```bash
#!/bin/bash
# restore-database.sh

BACKUP_FILE=$1
DB_NAME="trusted_login_db"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    exit 1
fi

# Decompress backup
gunzip -c $BACKUP_FILE > /tmp/restore.sql

# Restore database
psql -h localhost -U postgres -d $DB_NAME < /tmp/restore.sql

# Remove temporary file
rm /tmp/restore.sql

echo "Database restore completed from: $BACKUP_FILE"
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Container does not start

```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Container status
docker-compose ps

# Restart
docker-compose restart
```

#### 2. Database connection errors

```bash
# Test Supabase connection
curl -H "apikey: YOUR_ANON_KEY" \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     "https://YOUR_PROJECT.supabase.co/rest/v1/"

# Verify environment variables
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY
```

#### 3. WebSocket connection issues

```bash
# Test WebSocket endpoint
wscat -c ws://localhost:8007/ws

# Verify Nginx WebSocket configuration
nginx -t
sudo systemctl reload nginx
```

#### 4. Performance issues

```bash
# Check system resources
top
htop
df -h
free -m

# Docker resources
docker stats

# Application logs
tail -f logs/app.log
```

### Debugging Tools

```python
# backend/app/debug_tools.py
from fastapi import APIRouter
from typing import Dict, Any
import psutil
import os
import sys

router = APIRouter()

@router.get("/debug/system")
async def system_info() -> Dict[str, Any]:
    """System debugging information"""
    return {
        "python_version": sys.version,
        "platform": sys.platform,
        "cpu_count": os.cpu_count(),
        "memory": {
            "total": psutil.virtual_memory().total,
            "available": psutil.virtual_memory().available,
            "percent": psutil.virtual_memory().percent
        },
        "disk": {
            "total": psutil.disk_usage('/').total,
            "free": psutil.disk_usage('/').free,
            "percent": psutil.disk_usage('/').percent
        },
        "environment": dict(os.environ)
    }

@router.get("/debug/config")
async def config_info() -> Dict[str, Any]:
    """Configuration debugging information"""
    return {
        "supabase_configured": bool(os.getenv("SUPABASE_URL")),
        "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
        "anthropic_configured": bool(os.getenv("ANTHROPIC_API_KEY")),
        "debug_mode": os.getenv("DEBUG", "false").lower() == "true"
    }
```

## Security Guidelines for Deployment

### 1. Secrets Management

```bash
# Use Docker secrets
echo "your_secret_value" | docker secret create db_password -

# Set environment variables securely
export SUPABASE_SERVICE_ROLE_KEY=$(cat /secure/path/service_role_key)
```

### 2. Network Security

```bash
# Firewall configuration
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 8007/tcp  # Backend internal only
```

### 3. SSL/TLS Configuration

```nginx
# Strong SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# HSTS
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# Security headers
add_header X-Frame-Options DENY always;
add_header X-Content-Type-Options nosniff always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

## Conclusion

This deployment guide provides a comprehensive walkthrough for deploying the Trusted Login System across environments. Follow the security guidelines and continuously monitor the system for optimal performance and security.

For further assistance, consult the specific documentation of each component or contact the development team.