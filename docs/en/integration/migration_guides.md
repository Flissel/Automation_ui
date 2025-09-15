# Migration Guides - Trusted Login System

## Overview

This documentation provides comprehensive guidance for system migrations and upgrades of the Trusted Login System. It covers all aspects from database migrations to complete system upgrades.

## Table of Contents

1. [System Migration Guides](#system-migration-guides)
2. [Upgrade Procedures](#upgrade-procedures)
3. [Data Migration](#data-migration)
4. [Environment Migration](#environment-migration)
5. [Testing and Validation](#testing-and-validation)
6. [Communication and Planning](#communication-and-planning)
7. [Emergency Procedures](#emergency-procedures)
8. [Automated Migration](#automated-migration)

---

## System Migration Guides

### Legacy System Migration

#### Preparation

**Pre-migration checklist:**
- [ ] Complete inventory of the legacy system
- [ ] Identify all data sources
- [ ] Map legacy functions to new features
- [ ] Dependency analysis
- [ ] Risk assessment

**Legacy system analysis:**
```bash
# Create system inventory
./scripts/legacy_inventory.py --output legacy_inventory.json

# Analyze database schema
pg_dump --schema-only legacy_db > legacy_schema.sql

# Document API endpoints
curl -X GET "http://legacy-system/api/docs" > legacy_api_docs.json
```

#### Migration strategy

**1. Big Bang Migration:**
```yaml
# migration_config.yaml
migration_type: "big_bang"
downtime_window: "4 hours"
rollback_time: "30 minutes"
steps:
  - backup_legacy_data
  - deploy_new_system
  - migrate_data
  - switch_dns
  - validate_system
```

**2. Parallel Migration:**
```yaml
# parallel_migration.yaml
migration_type: "parallel"
phases:
  - name: "setup_parallel"
    duration: "2 weeks"
  - name: "data_sync"
    duration: "1 week"
  - name: "cutover"
    duration: "1 day"
```

### Database Migrations

#### Supabase Migration

**Create migration script:**
```sql
-- supabase/migrations/20240101000000_legacy_migration.sql

-- Create legacy tables
CREATE TABLE IF NOT EXISTS legacy_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    migrated_at TIMESTAMP
);

-- Data transformation
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
SELECT 
    email,
    password_hash,
    created_at
FROM legacy_users
WHERE migrated_at IS NULL;

-- Update migration status
UPDATE legacy_users 
SET migrated_at = NOW() 
WHERE migrated_at IS NULL;
```

**Run migration:**
```bash
# Apply migration
supabase db push

# Validate migration
supabase db diff

# Roll back on issues
supabase db reset
```

### API version transitions

#### API versioning

**Versioning strategy:**
```python
# app/api/versioning.py
from fastapi import APIRouter, Depends
from app.core.versioning import get_api_version

# API v1 (Legacy)
router_v1 = APIRouter(prefix="/api/v1")

@router_v1.get("/workflows")
async def get_workflows_v1():
    """Legacy API endpoint - deprecated"""
    return await legacy_workflow_service.get_workflows()

# API v2 (Current)
router_v2 = APIRouter(prefix="/api/v2")

@router_v2.get("/workflows")
async def get_workflows_v2():
    """Current API endpoint"""
    return await workflow_service.get_workflows()
```

**Deprecation handling:**
```python
# app/middleware/deprecation.py
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

class DeprecationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        if request.url.path.startswith("/api/v1"):
            response.headers["Deprecation"] = "true"
            response.headers["Sunset"] = "2024-12-31"
            response.headers["Link"] = "</api/v2>; rel=\"successor-version\""
        
        return response
```

### Frontend Framework Upgrades

#### React Upgrade

**Upgrade checklist:**
- [ ] Analyze dependencies
- [ ] Review breaking changes
- [ ] Update tests
- [ ] TypeScript compatibility
- [ ] Check bundle size

**Upgrade script:**
```bash
#!/bin/bash
# scripts/react_upgrade.sh

echo "Starting React upgrade..."

# Create backup
cp package.json package.json.backup
cp package-lock.json package-lock.json.backup

# Upgrade dependencies
npm update react react-dom @types/react @types/react-dom

# Adjust TypeScript configuration
npm run type-check

# Run tests
npm run test

# Test build
npm run build

echo "React upgrade completed!"
```

---

## Upgrade Procedures

### Major Version Upgrades

#### Upgrade planning

**Pre-upgrade checklist:**
- [ ] Read release notes
- [ ] Identify breaking changes
- [ ] Check dependencies
- [ ] Prepare test environment
- [ ] Create rollback plan

**Upgrade workflow:**
```yaml
# .github/workflows/major_upgrade.yml
name: Major Version Upgrade

on:
  workflow_dispatch:
    inputs:
      target_version:
        description: 'Target version'
        required: true
        type: string

jobs:
  upgrade:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Backup current state
        run: |
          git tag "backup-$(date +%Y%m%d-%H%M%S)"
          git push origin --tags
      
      - name: Run upgrade
        run: |
          npm run upgrade:major -- ${{ github.event.inputs.target_version }}
      
      - name: Run tests
        run: |
          npm run test:all
          npm run e2e:test
      
      - name: Deploy to staging
        run: |
          npm run deploy:staging
```

### Minor-Version-Updates

#### Automated updates

**Dependabot configuration:**
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    reviewers:
      - "dev-team"
    assignees:
      - "tech-lead"
    commit-message:
      prefix: "chore"
      include: "scope"
  
  - package-ecosystem: "pip"
    directory: "/backend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 3
```

**Update-Script:**
```bash
#!/bin/bash
# scripts/minor_update.sh

set -e

echo "Starting minor version update..."

# Frontend Updates
cd frontend
npm audit fix
npm update
npm run test
npm run build

# Backend Updates
cd ../backend
pip install --upgrade pip
pip-review --auto
pytest

echo "Minor update completed successfully!"
```

### Security-Patches

#### Kritische Sicherheits-Updates

**Notfall-Update-Prozess:**
```bash
#!/bin/bash
# scripts/security_patch.sh

SEVERITY=$1
PACKAGE=$2
VERSION=$3

if [ "$SEVERITY" = "critical" ]; then
    echo "Applying critical security patch..."
    
    # Immediate update without wait time
    npm install $PACKAGE@$VERSION
    
    # Minimale Tests
    npm run test:security
    
    # Immediate deployment
    npm run deploy:production
    
    # Benachrichtigung
    curl -X POST "$SLACK_WEBHOOK" \
        -H 'Content-type: application/json' \
        --data '{"text":"Critical security patch applied: '$PACKAGE'@'$VERSION'"}'
fi
```

### Dependency-Upgrades

#### Dependency-Analyse

**Vulnerability-Scan:**
```bash
#!/bin/bash
# scripts/dependency_scan.sh

echo "Scanning for vulnerabilities..."

# NPM Audit
npm audit --audit-level=moderate

# Python Security Check
pip-audit

# Docker Image Scan
docker scout cves trusted-login-system:latest

# Generate Report
echo "Vulnerability scan completed. Check reports in ./security-reports/"
```

---

## Data Migration

### Pre-migration backup strategies

#### Full system backup

**Backup script:**
```bash
#!/bin/bash
# scripts/full_backup.sh

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/migration_$BACKUP_DATE"

mkdir -p $BACKUP_DIR

echo "Starting full system backup..."

# Database backup
pg_dump $DATABASE_URL > $BACKUP_DIR/database.sql

# Supabase backup
supabase db dump --file $BACKUP_DIR/supabase_dump.sql

# File system backup

tar -czf $BACKUP_DIR/uploads.tar.gz ./uploads/

# Configuration backup
cp -r ./config/ $BACKUP_DIR/config/
cp .env $BACKUP_DIR/.env.backup

# Docker images
docker save trusted-login-system:latest > $BACKUP_DIR/docker_image.tar

echo "Backup completed: $BACKUP_DIR"
```

#### Incremental backup

**Incremental backup system:**
```python
# scripts/incremental_backup.py
import os
import subprocess
from datetime import datetime
from pathlib import Path

class IncrementalBackup:
    def __init__(self, base_dir: str):
        self.base_dir = Path(base_dir)
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    def create_incremental_backup(self):
        """Creates incremental backup based on last full backup"""
        backup_dir = self.base_dir / f"incremental_{self.timestamp}"
        backup_dir.mkdir(exist_ok=True)
        
        # Only files changed since last backup
        last_backup = self._get_last_backup_time()
        
        cmd = [
            "rsync", "-av", "--link-dest", str(last_backup),
            "./", str(backup_dir)
        ]
        
        subprocess.run(cmd, check=True)
        
        # Database changes
        self._backup_db_changes(backup_dir, last_backup)
    
    def _get_last_backup_time(self) -> Path:
        """Determines last backup"""
        backups = list(self.base_dir.glob("*_*"))
        return max(backups, key=lambda x: x.stat().st_mtime)
    
    def _backup_db_changes(self, backup_dir: Path, since: Path):
        """Backs up only DB changes since last backup"""
        since_time = datetime.fromtimestamp(since.stat().st_mtime)
        
        # WAL files for point-in-time recovery
        subprocess.run([
            "pg_receivewal", 
            "-D", str(backup_dir / "wal"),
            "-S", "backup_slot",
            "--synchronous"
        ])

if __name__ == "__main__":
    backup = IncrementalBackup("/backups")
    backup.create_incremental_backup()
```

### Data format conversion

#### Schema-Migration

**Datenformat-Konverter:**
```python
# scripts/data_converter.py
import json
import pandas as pd
from typing import Dict, Any, List
from sqlalchemy import create_engine

class DataConverter:
    def __init__(self, source_db: str, target_db: str):
        self.source_engine = create_engine(source_db)
        self.target_engine = create_engine(target_db)
    
    def convert_user_data(self) -> None:
        """Converts user data from legacy format"""
        # Load legacy data
        legacy_users = pd.read_sql(
            "SELECT * FROM legacy_users", 
            self.source_engine
        )
        
        # Convert data format
        converted_users = []
        for _, user in legacy_users.iterrows():
            converted_user = {
                "id": str(user["id"]),  # UUID instead of integer
                "email": user["email"].lower(),  # normalization
                "profile": {
                    "username": user["username"],
                    "created_at": user["created_at"].isoformat(),
                    "preferences": self._convert_preferences(user["settings"])
                },
                "auth": {
                    "password_hash": user["password_hash"],
                    "last_login": user.get("last_login")
                }
            }
            converted_users.append(converted_user)
        
        # Write to new database
        self._insert_converted_users(converted_users)
    
    def _convert_preferences(self, legacy_settings: str) -> Dict[str, Any]:
        """Converts legacy settings to new format"""
        if not legacy_settings:
            return {"theme": "light", "notifications": True}
        
        try:
            settings = json.loads(legacy_settings)
            return {
                "theme": settings.get("ui_theme", "light"),
                "notifications": settings.get("email_notifications", True),
                "language": settings.get("lang", "en")
            }
        except json.JSONDecodeError:
            return {"theme": "light", "notifications": True}
    
    def _insert_converted_users(self, users: List[Dict[str, Any]]) -> None:
        """Inserts converted users into new DB"""
        for user in users:
            # Insert user into auth.users
            self.target_engine.execute(
                "INSERT INTO auth.users (id, email, encrypted_password) VALUES (%s, %s, %s)",
                (user["id"], user["email"], user["auth"]["password_hash"])
            )
            
            # Insert profile into public.profiles
            self.target_engine.execute(
                "INSERT INTO public.profiles (id, username, preferences) VALUES (%s, %s, %s)",
                (user["id"], user["profile"]["username"], json.dumps(user["profile"]["preferences"]))
            )
```

### Validierung nach Migration

#### Data integrity check

**Validierungs-Script:**
```python
# scripts/migration_validator.py
import asyncio
import asyncpg
from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class ValidationResult:
    check_name: str
    passed: bool
    message: str
    details: Dict[str, Any] = None

class MigrationValidator:
    def __init__(self, db_url: str):
        self.db_url = db_url
        self.results: List[ValidationResult] = []
    
    async def validate_migration(self) -> List[ValidationResult]:
        """Performs all validation checks"""
        conn = await asyncpg.connect(self.db_url)
        
        try:
            await self._validate_user_count(conn)
            await self._validate_data_integrity(conn)
            await self._validate_foreign_keys(conn)
            await self._validate_indexes(conn)
            await self._validate_permissions(conn)
        finally:
            await conn.close()
        
        return self.results
    
    async def _validate_user_count(self, conn: asyncpg.Connection):
        """Checks whether all users have been migrated"""
        legacy_count = await conn.fetchval(
            "SELECT COUNT(*) FROM legacy_users WHERE migrated_at IS NOT NULL"
        )
        new_count = await conn.fetchval(
            "SELECT COUNT(*) FROM auth.users"
        )
        
        passed = legacy_count == new_count
        self.results.append(ValidationResult(
            check_name="User Count Validation",
            passed=passed,
            message=f"Legacy: {legacy_count}, New: {new_count}",
            details={"legacy_count": legacy_count, "new_count": new_count}
        ))
    
    async def _validate_data_integrity(self, conn: asyncpg.Connection):
        """Checks data integrity"""
        # Email-Eindeutigkeit
        duplicate_emails = await conn.fetchval(
            "SELECT COUNT(*) FROM (SELECT email, COUNT(*) FROM auth.users GROUP BY email HAVING COUNT(*) > 1) AS duplicates"
        )
        
        passed = duplicate_emails == 0
        self.results.append(ValidationResult(
            check_name="Email Uniqueness",
            passed=passed,
            message=f"Duplicate emails found: {duplicate_emails}"
        ))
    
    async def _validate_foreign_keys(self, conn: asyncpg.Connection):
        """Checks foreign key constraints"""
        orphaned_profiles = await conn.fetchval(
            "SELECT COUNT(*) FROM public.profiles p LEFT JOIN auth.users u ON p.id = u.id WHERE u.id IS NULL"
        )
        
        passed = orphaned_profiles == 0
        self.results.append(ValidationResult(
            check_name="Foreign Key Integrity",
            passed=passed,
            message=f"Orphaned profiles: {orphaned_profiles}"
        ))
    
    async def _validate_indexes(self, conn: asyncpg.Connection):
        """Checks whether all indexes have been created"""
        expected_indexes = [
            "idx_users_email",
            "idx_profiles_username",
            "idx_workflows_user_id"
        ]
        
        existing_indexes = await conn.fetch(
            "SELECT indexname FROM pg_indexes WHERE schemaname = 'public'"
        )
        existing_names = {row["indexname"] for row in existing_indexes}
        
        missing_indexes = set(expected_indexes) - existing_names
        passed = len(missing_indexes) == 0
        
        self.results.append(ValidationResult(
            check_name="Index Validation",
            passed=passed,
            message=f"Missing indexes: {list(missing_indexes)}",
            details={"missing": list(missing_indexes)}
        ))
    
    async def _validate_permissions(self, conn: asyncpg.Connection):
        """Checks RLS policies and permissions"""
        policies = await conn.fetch(
            "SELECT schemaname, tablename, policyname FROM pg_policies"
        )
        
        expected_policies = [
            ("public", "profiles", "Users can view own profile"),
            ("public", "workflows", "Users can manage own workflows")
        ]
        
        existing_policies = {(p["schemaname"], p["tablename"], p["policyname"]) for p in policies}
        missing_policies = set(expected_policies) - existing_policies
        
        passed = len(missing_policies) == 0
        self.results.append(ValidationResult(
            check_name="RLS Policy Validation",
            passed=passed,
            message=f"Missing policies: {len(missing_policies)}",
            details={"missing": list(missing_policies)}
        ))

# Run validation
async def main():
    validator = MigrationValidator("postgresql://user:pass@localhost/db")
    results = await validator.validate_migration()
    
    print("Migration Validation Results:")
    print("=" * 50)
    
    all_passed = True
    for result in results:
        status = "✅ PASS" if result.passed else "❌ FAIL"
        print(f"{status} {result.check_name}: {result.message}")
        
        if not result.passed:
            all_passed = False
            if result.details:
                print(f"   Details: {result.details}")
    
    print("=" * 50)
    print(f"Overall Status: {'✅ SUCCESS' if all_passed else '❌ FAILED'}")
    
    return all_passed

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
```

## 6. Kommunikation und Planung

### Stakeholder-Kommunikation

#### Kommunikationsplan

**Stakeholder-Matrix:**
```yaml
# stakeholder_matrix.yml
stakeholders:
  executive:
    - name: "CTO"
      role: "Technical Decision Maker"
      communication_frequency: "Weekly"
      preferred_channel: "Email + Meetings"
      information_level: "High-level summary"
    
    - name: "Product Manager"
      role: "Business Requirements"
      communication_frequency: "Daily"
      preferred_channel: "Slack + Meetings"
      information_level: "Detailed progress"
  
  technical:
    - name: "Development Team"
      role: "Implementation"
      communication_frequency: "Real-time"
      preferred_channel: "Slack + Stand-ups"
      information_level: "Technical details"
    
    - name: "DevOps Team"
      role: "Infrastructure"
      communication_frequency: "Daily"
      preferred_channel: "Slack + Meetings"
      information_level: "Infrastructure status"
  
  business:
    - name: "End Users"
      role: "System Usage"
      communication_frequency: "As needed"
      preferred_channel: "Email + Portal"
      information_level: "Impact summary"
    
    - name: "Support Team"
      role: "User Support"
      communication_frequency: "Daily"
      preferred_channel: "Slack + Training"
      information_level: "Operational changes"

communication_templates:
  executive_summary:
    subject: "Migration Progress Update - Week {week}"
    sections:
      - "Executive Summary"
      - "Key Milestones Achieved"
      - "Upcoming Milestones"
      - "Risks and Mitigation"
      - "Budget Status"
  
  technical_update:
    subject: "Technical Migration Update - {date}"
    sections:
      - "Completed Tasks"
      - "Current Work"
      - "Technical Challenges"
      - "Next Steps"
      - "Support Needed"
  
  user_notification:
    subject: "System Update Notification"
    sections:
      - "What's Changing"
      - "When It Happens"
      - "What You Need to Do"
      - "Support Information"
```

**Kommunikations-Automatisierung:**
```python
# scripts/communication_automation.py
import smtplib
import yaml
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, List, Any
from datetime import datetime, timedelta
from jinja2 import Template

class CommunicationManager:
    def __init__(self, config_file: str = "stakeholder_matrix.yml"):
        with open(config_file, 'r') as f:
            self.config = yaml.safe_load(f)
        
        self.smtp_server = "smtp.company.com"
        self.smtp_port = 587
        self.sender_email = "migration-team@company.com"
        self.sender_password = "password"  # Aus Umgebungsvariable laden
    
    def send_migration_update(self, update_type: str, data: Dict[str, Any]):
        """Sendet Migration-Update an relevante Stakeholder"""
        template = self._get_template(update_type)
        
        for stakeholder_group, stakeholders in self.config['stakeholders'].items():
            for stakeholder in stakeholders:
                if self._should_notify(stakeholder, update_type):
                    message = self._create_message(
                        template=template,
                        stakeholder=stakeholder,
                        data=data
                    )
                    self._send_email(stakeholder['email'], message)
    
    def _get_template(self, update_type: str) -> Template:
        """Loads email template"""
        template_map = {
            'executive_summary': 'templates/executive_summary.html',
            'technical_update': 'templates/technical_update.html',
            'user_notification': 'templates/user_notification.html'
        }
        
        with open(template_map[update_type], 'r') as f:
            return Template(f.read())
    
    def _should_notify(self, stakeholder: Dict, update_type: str) -> bool:
        """Bestimmt ob Stakeholder benachrichtigt werden soll"""
        frequency = stakeholder.get('communication_frequency', 'weekly')
        
        if frequency == 'real-time':
            return True
        elif frequency == 'daily':
            return True  # For daily updates
        elif frequency == 'weekly':
            return datetime.now().weekday() == 0  # Montags
        
        return False
    
    def _create_message(self, template: Template, stakeholder: Dict, data: Dict) -> str:
        """Creates personalized message"""
        context = {
            'stakeholder_name': stakeholder['name'],
            'information_level': stakeholder['information_level'],
            'date': datetime.now().strftime('%Y-%m-%d'),
            **data
        }
        
        return template.render(**context)
    
    def _send_email(self, recipient: str, message: str):
        """Sendet E-Mail"""
        msg = MIMEMultipart()
        msg['From'] = self.sender_email
        msg['To'] = recipient
        msg['Subject'] = "Migration Update"
        
        msg.attach(MIMEText(message, 'html'))
        
        try:
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.sender_email, self.sender_password)
            server.send_message(msg)
            server.quit()
            print(f"Email sent to {recipient}")
        except Exception as e:
            print(f"Failed to send email to {recipient}: {e}")

# Usage
if __name__ == "__main__":
    comm_manager = CommunicationManager()
    
    update_data = {
        'migration_phase': 'Testing',
        'completion_percentage': 75,
        'key_achievements': [
            'Database migration completed',
            'API endpoints updated',
            'Frontend integration tested'
        ],
        'upcoming_milestones': [
            'User acceptance testing',
            'Performance optimization',
            'Production deployment'
        ],
        'risks': [
            {
                'description': 'Potential performance degradation',
                'mitigation': 'Additional load testing scheduled',
                'severity': 'Medium'
            }
        ]
    }
    
    comm_manager.send_migration_update('executive_summary', update_data)
```

### Downtime Planning

#### Downtime Minimization

**Maintenance Window Planning:**
```yaml
# maintenance_windows.yml
maintenance_windows:
  development:
    schedule: "Daily 02:00-04:00 UTC"
    duration: "2 hours"
    impact: "Development environment only"
    notification_required: false
  
  staging:
    schedule: "Weekly Sunday 01:00-05:00 UTC"
    duration: "4 hours"
    impact: "Staging environment unavailable"
    notification_required: true
    stakeholders: ["development_team", "qa_team"]
  
  production:
    schedule: "Monthly first Sunday 02:00-06:00 UTC"
    duration: "4 hours maximum"
    impact: "Service unavailable"
    notification_required: true
    advance_notice: "2 weeks"
    stakeholders: ["all_users", "support_team", "management"]
    approval_required: true
    rollback_plan: true

downtime_procedures:
  pre_maintenance:
    - "Send user notifications"
    - "Verify backup completion"
    - "Prepare rollback scripts"
    - "Coordinate with support team"
    - "Set up monitoring alerts"
  
  during_maintenance:
    - "Display maintenance page"
    - "Monitor system status"
    - "Execute migration steps"
    - "Validate each step"
    - "Document any issues"
  
  post_maintenance:
    - "Verify system functionality"
    - "Run smoke tests"
    - "Monitor performance"
    - "Send completion notification"
    - "Update documentation"
```

**Blue-Green Deployment:**
```bash
#!/bin/bash
# scripts/blue_green_deployment.sh

set -e

# Configuration
BLUE_ENV="production-blue"
GREEN_ENV="production-green"
LOAD_BALANCER="nginx-lb"
HEALTH_CHECK_URL="/health"
MAX_WAIT_TIME=300

echo "Starting Blue-Green Deployment..."

# Determine current environment
CURRENT_ENV=$(kubectl get service $LOAD_BALANCER -o jsonpath='{.spec.selector.version}')
if [ "$CURRENT_ENV" = "blue" ]; then
    TARGET_ENV="green"
    TARGET_DEPLOYMENT=$GREEN_ENV
else
    TARGET_ENV="blue"
    TARGET_DEPLOYMENT=$BLUE_ENV
fi

echo "Current environment: $CURRENT_ENV"
echo "Target environment: $TARGET_ENV"

# Deploy new version to target environment
echo "Deploying to $TARGET_ENV environment..."
kubectl set image deployment/$TARGET_DEPLOYMENT app=myapp:$NEW_VERSION

# Wait until deployment is ready
echo "Waiting for deployment to be ready..."
kubectl rollout status deployment/$TARGET_DEPLOYMENT --timeout=${MAX_WAIT_TIME}s

# Health Check
echo "Performing health checks..."
TARGET_IP=$(kubectl get service $TARGET_DEPLOYMENT -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

for i in {1..10}; do
    if curl -f "http://$TARGET_IP$HEALTH_CHECK_URL" > /dev/null 2>&1; then
        echo "Health check passed ($i/10)"
        break
    else
        echo "Health check failed ($i/10), retrying..."
        sleep 10
    fi
    
    if [ $i -eq 10 ]; then
        echo "Health checks failed, rolling back..."
        exit 1
    fi
done

# Smoke Tests
echo "Running smoke tests..."
python scripts/smoke_tests.py --target="http://$TARGET_IP"

if [ $? -ne 0 ]; then
    echo "Smoke tests failed, rolling back..."
    exit 1
fi

# Redirect traffic
echo "Switching traffic to $TARGET_ENV..."
kubectl patch service $LOAD_BALANCER -p '{"spec":{"selector":{"version":"'$TARGET_ENV'"}}}'

# Wait and perform final validation
echo "Waiting for traffic switch to complete..."
sleep 30

# Final health checks
echo "Performing final health checks..."
for i in {1..5}; do
    if curl -f "http://$(kubectl get service $LOAD_BALANCER -o jsonpath='{.status.loadBalancer.ingress[0].ip}')$HEALTH_CHECK_URL" > /dev/null 2>&1; then
        echo "Final health check passed ($i/5)"
        break
    else
        echo "Final health check failed ($i/5), investigating..."
        sleep 10
    fi
done

echo "Blue-Green deployment completed successfully!"
echo "Active environment: $TARGET_ENV"
echo "Previous environment: $CURRENT_ENV (available for rollback)"

# Optional: Shut down old environment after confirmation
read -p "Scale down $CURRENT_ENV environment? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    kubectl scale deployment $CURRENT_ENV --replicas=0
    echo "$CURRENT_ENV environment scaled down"
fi
```

### Rollback strategies

#### Automated rollback procedures

**Rollback-Orchestrator:**
```python
# scripts/rollback_orchestrator.py
import asyncio
import logging
from typing import List, Dict, Any
from dataclasses import dataclass
from datetime import datetime

@dataclass
class RollbackStep:
    name: str
    command: str
    timeout: int
    critical: bool
    validation_command: str = None

class RollbackOrchestrator:
    def __init__(self, config_file: str = "rollback_config.yml"):
        self.logger = logging.getLogger(__name__)
        self.rollback_steps = self._load_rollback_config(config_file)
        self.execution_log = []
    
    def _load_rollback_config(self, config_file: str) -> List[RollbackStep]:
        """Loads rollback configuration"""
        # Example configuration
        return [
            RollbackStep(
                name="Stop New Deployments",
                command="kubectl patch deployment app --type='merge' -p='{\"spec\":{\"replicas\":0}}'",
                timeout=60,
                critical=True
            ),
            RollbackStep(
                name="Switch Load Balancer",
                command="kubectl patch service lb --type='merge' -p='{\"spec\":{\"selector\":{\"version\":\"previous\"}}}'",
                timeout=30,
                critical=True,
                validation_command="curl -f http://lb-service/health"
            ),
            RollbackStep(
                name="Rollback Database",
                command="python scripts/database_rollback.py --to-snapshot=pre_migration",
                timeout=300,
                critical=True,
                validation_command="python scripts/validate_database.py"
            ),
            RollbackStep(
                name="Clear Cache",
                command="redis-cli FLUSHALL",
                timeout=10,
                critical=False
            ),
            RollbackStep(
                name="Restart Services",
                command="kubectl rollout restart deployment/app",
                timeout=120,
                critical=True,
                validation_command="kubectl rollout status deployment/app"
            )
        ]
    
    async def execute_rollback(self, reason: str = "Manual rollback") -> bool:
        """Performs full rollback"""
        self.logger.info(f"Starting rollback: {reason}")
        
        rollback_start = datetime.now()
        success = True
        
        for step in self.rollback_steps:
            step_start = datetime.now()
            
            try:
                self.logger.info(f"Executing rollback step: {step.name}")
                
                # Execute step
                result = await self._execute_command(step.command, step.timeout)
                
                if result['success']:
                    # Validierung falls vorhanden
                    if step.validation_command:
                        validation_result = await self._execute_command(
                            step.validation_command, 
                            30
                        )
                        
                        if not validation_result['success']:
                            self.logger.error(f"Validation failed for step: {step.name}")
                            if step.critical:
                                success = False
                                break
                    
                    step_duration = (datetime.now() - step_start).total_seconds()
                    self.execution_log.append({
                        'step': step.name,
                        'status': 'success',
                        'duration': step_duration,
                        'output': result['output']
                    })
                    
                    self.logger.info(f"Step completed: {step.name} ({step_duration:.1f}s)")
                
                else:
                    self.logger.error(f"Step failed: {step.name} - {result['error']}")
                    
                    self.execution_log.append({
                        'step': step.name,
                        'status': 'failed',
                        'error': result['error']
                    })
                    
                    if step.critical:
                        success = False
                        break
            
            except Exception as e:
                self.logger.error(f"Exception in step {step.name}: {e}")
                
                self.execution_log.append({
                    'step': step.name,
                    'status': 'exception',
                    'error': str(e)
                })
                
                if step.critical:
                    success = False
                    break
        
        rollback_duration = (datetime.now() - rollback_start).total_seconds()
        
        if success:
            self.logger.info(f"Rollback completed successfully in {rollback_duration:.1f}s")
        else:
            self.logger.error(f"Rollback failed after {rollback_duration:.1f}s")
        
        # Rollback-Bericht generieren
        await self._generate_rollback_report(reason, success, rollback_duration)
        
        return success
    
    async def _execute_command(self, command: str, timeout: int) -> Dict[str, Any]:
        """Executes command with timeout"""
        try:
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(), 
                timeout=timeout
            )
            
            return {
                'success': process.returncode == 0,
                'output': stdout.decode(),
                'error': stderr.decode() if process.returncode != 0 else None
            }
        
        except asyncio.TimeoutError:
            return {
                'success': False,
                'error': f"Command timed out after {timeout}s"
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _generate_rollback_report(self, reason: str, success: bool, duration: float):
        """Generates rollback report"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'reason': reason,
            'success': success,
            'duration_seconds': duration,
            'steps': self.execution_log
        }
        
        # Save report
        import json
        with open(f"rollback_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json", 'w') as f:
            json.dump(report, f, indent=2)
        
        # Notify stakeholders
        await self._notify_stakeholders(report)
    
    async def _notify_stakeholders(self, report: Dict[str, Any]):
        """Notifies stakeholders about rollback"""
        # Integration with communication system
        pass

# Perform rollback
async def main():
    orchestrator = RollbackOrchestrator()
    
    # Capture rollback reason
    reason = input("Rollback reason: ")
    
    # Request confirmation
    confirm = input(f"Execute rollback? This will revert the system to the previous state. (yes/no): ")
    
    if confirm.lower() == 'yes':
        success = await orchestrator.execute_rollback(reason)
        
        if success:
            print("✅ Rollback completed successfully!")
        else:
            print("❌ Rollback failed! Manual intervention required.")
    else:
        print("Rollback cancelled.")

if __name__ == "__main__":
    asyncio.run(main())
```

### Go-live checklists

#### Pre-go-live checklist

**Go-Live Readiness Assessment:**
```yaml
# go_live_checklist.yml
go_live_checklist:
  technical_readiness:
    infrastructure:
      - item: "Production environment provisioned"
        status: "pending"
        owner: "DevOps Team"
        due_date: "2024-01-15"
      
      - item: "Load balancers configured"
        status: "pending"
        owner: "DevOps Team"
        due_date: "2024-01-16"
      
      - item: "SSL certificates installed"
        status: "pending"
        owner: "Security Team"
        due_date: "2024-01-17"
      
      - item: "Monitoring and alerting configured"
        status: "pending"
        owner: "DevOps Team"
        due_date: "2024-01-18"
    
    application:
      - item: "All tests passing"
        status: "pending"
        owner: "QA Team"
        due_date: "2024-01-19"
      
      - item: "Performance benchmarks met"
        status: "pending"
        owner: "Development Team"
        due_date: "2024-01-20"
      
      - item: "Security scan completed"
        status: "pending"
        owner: "Security Team"
        due_date: "2024-01-21"
      
      - item: "Database migration tested"
        status: "pending"
        owner: "Database Team"
        due_date: "2024-01-22"
    
    data:
      - item: "Data backup completed"
        status: "pending"
        owner: "Database Team"
        due_date: "2024-01-23"
      
      - item: "Data migration validated"
        status: "pending"
        owner: "Database Team"
        due_date: "2024-01-24"
      
      - item: "Data integrity checks passed"
        status: "pending"
        owner: "QA Team"
        due_date: "2024-01-25"
  
  business_readiness:
    documentation:
      - item: "User documentation updated"
        status: "pending"
        owner: "Technical Writing Team"
        due_date: "2024-01-26"
      
      - item: "Admin documentation completed"
        status: "pending"
        owner: "Technical Writing Team"
        due_date: "2024-01-27"
      
      - item: "API documentation published"
        status: "pending"
        owner: "Development Team"
        due_date: "2024-01-28"
    
    training:
      - item: "Support team trained"
        status: "pending"
        owner: "Training Team"
        due_date: "2024-01-29"
      
      - item: "Admin users trained"
        status: "pending"
        owner: "Training Team"
        due_date: "2024-01-30"
      
      - item: "End user training materials ready"
        status: "pending"
        owner: "Training Team"
        due_date: "2024-01-31"
    
    communication:
      - item: "Go-live announcement prepared"
        status: "pending"
        owner: "Communications Team"
        due_date: "2024-02-01"
      
      - item: "Stakeholder notifications sent"
        status: "pending"
        owner: "Project Manager"
        due_date: "2024-02-02"
      
      - item: "Support escalation plan activated"
        status: "pending"
        owner: "Support Manager"
        due_date: "2024-02-03"
  
  operational_readiness:
    support:
      - item: "24/7 support coverage arranged"
        status: "pending"
        owner: "Support Manager"
        due_date: "2024-02-04"
      
      - item: "Incident response team on standby"
        status: "pending"
        owner: "Operations Manager"
        due_date: "2024-02-05"
      
      - item: "Rollback procedures tested"
        status: "pending"
        owner: "DevOps Team"
        due_date: "2024-02-06"
    
    monitoring:
      - item: "Real-time monitoring dashboard ready"
        status: "pending"
        owner: "DevOps Team"
        due_date: "2024-02-07"
      
      - item: "Alert thresholds configured"
        status: "pending"
        owner: "DevOps Team"
        due_date: "2024-02-08"
      
      - item: "Performance baselines established"
        status: "pending"
        owner: "Performance Team"
        due_date: "2024-02-09"

go_live_criteria:
  mandatory:
    - "All critical tests passing"
    - "Security approval obtained"
    - "Performance benchmarks met"
    - "Rollback procedures verified"
    - "Support team ready"
  
  recommended:
    - "User training completed"
    - "Documentation finalized"
    - "Monitoring fully configured"
    - "Stakeholder sign-off received"

go_no_go_decision:
  decision_makers:
    - "CTO"
    - "Product Manager"
    - "Operations Manager"
  
  decision_criteria:
    - "Technical readiness: 100%"
    - "Business readiness: 90%"
    - "Operational readiness: 100%"
  
  escalation_path:
    - "Project Manager"
    - "Engineering Director"
    - "CTO"
```

**Automated checklist validation:**
```python
# scripts/go_live_validator.py
import yaml
import asyncio
import aiohttp
from typing import Dict, List, Any
from dataclasses import dataclass
from datetime import datetime

@dataclass
class ChecklistItem:
    item: str
    status: str
    owner: str
    due_date: str
    validation_command: str = None
    automated: bool = False

class GoLiveValidator:
    def __init__(self, checklist_file: str = "go_live_checklist.yml"):
        with open(checklist_file, 'r') as f:
            self.config = yaml.safe_load(f)
        
        self.validation_results = {}
    
    async def validate_go_live_readiness(self) -> Dict[str, Any]:
        """Validates go-live readiness"""
        print("🔍 Validating Go-Live readiness...")
        
        checklist = self.config['go_live_checklist']
        
        for category, subcategories in checklist.items():
            print(f"\n📋 Validating {category}...")
            
            category_results = {}
            
            for subcategory, items in subcategories.items():
                print(f"  📝 Checking {subcategory}...")
                
                subcategory_results = []
                
                for item_data in items:
                    item = ChecklistItem(**item_data)
                    result = await self._validate_item(item)
                    subcategory_results.append(result)
                    
                    status_icon = "✅" if result['passed'] else "❌"
                    print(f"    {status_icon} {item.item}")
                
                category_results[subcategory] = subcategory_results
            
            self.validation_results[category] = category_results
        
        # Go/No-Go Entscheidung
        decision = self._make_go_no_go_decision()
        
        return {
            'validation_results': self.validation_results,
            'go_no_go_decision': decision,
            'timestamp': datetime.now().isoformat()
        }
    
    async def _validate_item(self, item: ChecklistItem) -> Dict[str, Any]:
        """Validiert einzelnes Checklisten-Element"""
        result = {
            'item': item.item,
            'owner': item.owner,
            'due_date': item.due_date,
            'passed': False,
            'message': '',
            'automated': item.automated
        }
        
        # Automated validation if available
        if item.validation_command and item.automated:
            try:
                process = await asyncio.create_subprocess_shell(
                    item.validation_command,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                
                stdout, stderr = await process.communicate()
                
                if process.returncode == 0:
                    result['passed'] = True
                    result['message'] = 'Automated validation passed'
                else:
                    result['message'] = f'Automated validation failed: {stderr.decode()}'
            
            except Exception as e:
                result['message'] = f'Validation error: {str(e)}'
        
        # Manuelle Validierung basierend auf Status
        elif item.status == 'completed':
            result['passed'] = True
            result['message'] = 'Manually marked as completed'
        elif item.status == 'pending':
            # Check if overdue
            due_date = datetime.strptime(item.due_date, '%Y-%m-%d')
            if datetime.now() > due_date:
                result['message'] = f'Overdue since {item.due_date}'
            else:
                result['message'] = f'Pending, due {item.due_date}'
        else:
            result['message'] = f'Status: {item.status}'
        
        return result
    
    def _make_go_no_go_decision(self) -> Dict[str, Any]:
        """Trifft Go/No-Go Entscheidung basierend auf Kriterien"""
        criteria = self.config['go_live_criteria']
        
        # Calculate completion rate for each category
        completion_rates = {}
        
        for category, subcategories in self.validation_results.items():
            total_items = 0
            completed_items = 0
            
            for subcategory, items in subcategories.items():
                for item in items:
                    total_items += 1
                    if item['passed']:
                        completed_items += 1
            
            completion_rates[category] = {
                'completed': completed_items,
                'total': total_items,
                'percentage': (completed_items / total_items) * 100 if total_items > 0 else 0
            }
        
        # Check mandatory criteria
        mandatory_met = True
        mandatory_status = []
        
        for criterion in criteria['mandatory']:
            # Simplified check - in practice, specific logic would be implemented here
            met = completion_rates.get('technical_readiness', {}).get('percentage', 0) >= 90
            mandatory_status.append({
                'criterion': criterion,
                'met': met
            })
            if not met:
                mandatory_met = False
        
        # Go/No-Go Entscheidung
        decision_criteria = self.config['go_no_go_decision']['decision_criteria']
        
        technical_ready = completion_rates.get('technical_readiness', {}).get('percentage', 0) >= 100
        business_ready = completion_rates.get('business_readiness', {}).get('percentage', 0) >= 90
        operational_ready = completion_rates.get('operational_readiness', {}).get('percentage', 0) >= 100
        
        go_decision = technical_ready and business_ready and operational_ready and mandatory_met
        
        return {
            'decision': 'GO' if go_decision else 'NO-GO',
            'completion_rates': completion_rates,
            'mandatory_criteria': {
                'all_met': mandatory_met,
                'details': mandatory_status
            },
            'readiness_assessment': {
                'technical': technical_ready,
                'business': business_ready,
                'operational': operational_ready
            },
            'recommendations': self._generate_recommendations(completion_rates, go_decision)
        }
    
    def _generate_recommendations(self, completion_rates: Dict, go_decision: bool) -> List[str]:
        """Generiert Empfehlungen basierend auf Validierungsergebnissen"""
        recommendations = []
        
        if not go_decision:
            recommendations.append("❌ System is not ready for Go-Live")
            
            for category, rates in completion_rates.items():
                if rates['percentage'] < 90:
                    recommendations.append(
                        f"⚠️ {category} completion rate is {rates['percentage']:.1f}% - needs improvement"
                    )
        else:
            recommendations.append("✅ System is ready for Go-Live")
            recommendations.append("🚀 All criteria met - proceed with deployment")
        
        return recommendations
    
    def generate_report(self, results: Dict[str, Any]) -> str:
        """Generates go-live readiness report"""
        report = ["# Go-Live Readiness Report"]
        report.append(f"Generated: {results['timestamp']}")
        report.append("")
        
        decision = results['go_no_go_decision']
        
        if decision['decision'] == 'GO':
            report.append("## 🟢 GO DECISION")
            report.append("**System is ready for Go-Live**")
        else:
            report.append("## 🔴 NO-GO DECISION")
            report.append("**System is NOT ready for Go-Live**")
        
        report.append("")
        report.append("## Readiness Summary")
        
        for category, rates in decision['completion_rates'].items():
            percentage = rates['percentage']
            status = "✅" if percentage >= 90 else "⚠️" if percentage >= 70 else "❌"
            report.append(f"- {status} **{category.replace('_', ' ').title()}**: {percentage:.1f}% ({rates['completed']}/{rates['total']})")
        
        report.append("")
        report.append("## Recommendations")
        
        for recommendation in decision['recommendations']:
            report.append(f"- {recommendation}")
        
        return "\n".join(report)

# Run go-live validation
async def main():
    validator = GoLiveValidator()
    
    print("🚀 Starting Go-Live Readiness Validation...")
    results = await validator.validate_go_live_readiness()
    
    # Generate report
    report = validator.generate_report(results)
    
    # Bericht speichern
    with open("go_live_readiness_report.md", "w") as f:
        f.write(report)
    
    print("\n" + "=" * 70)
    print(report)
    print("=" * 70)
    
    decision = results['go_no_go_decision']['decision']
    if decision == 'GO':
        print("\n🎉 System is ready for Go-Live!")
    else:
        print("\n🛑 System is NOT ready for Go-Live. Address issues before proceeding.")
    
    print(f"\nDetailed report saved to: go_live_readiness_report.md")

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Summary

These Migration Guides provide comprehensive instructions for system migrations and upgrades in the Trusted Login System. The documentation includes:

### 🎯 **Core Areas**

1. **System Migration Guides** - Detailed instructions for various migration scenarios
2. **Upgrade Procedures** - Structured processes for system updates
3. **Data Migration** - Secure data transfer and validation
4. **Environment Migration** - Deployment across different environments
5. **Testing and Validation** - Comprehensive quality assurance
6. **Communication and Planning** - Stakeholder management and coordination

### 🛠 **Provided Tools**

- **Automated migration scripts** for various components
- **Validation frameworks** for pre- and post-migration tests
- **Rollback orchestrator** for safe system recovery
- **Performance monitoring** for pre/post migration comparisons
- **Communication automation** for stakeholder updates
- **Go-Live checklists** with automated validation

### 📋 **Best Practices**

- **Risk minimization** through comprehensive planning and testing
- **Automation** of recurring tasks
- **Monitoring** and alerting during critical phases
- **Documentation** of all steps and decisions
- **Communication** with all relevant stakeholders
- **Rollback readiness** for all critical changes

These guides ensure that migrations and upgrades are performed systematically, safely, and with minimal downtime.

### Rollback-Verfahren

#### Automatisches Rollback

**Rollback-Script:**
```bash
#!/bin/bash
# scripts/rollback_migration.sh

set -e

BACKUP_DIR=$1
ROLLBACK_REASON=$2

if [ -z "$BACKUP_DIR" ]; then
    echo "Error: Backup directory required"
    echo "Usage: $0 <backup_dir> [reason]"
    exit 1
fi

echo "Starting rollback from backup: $BACKUP_DIR"
echo "Reason: ${ROLLBACK_REASON:-'Manual rollback'}"

# Benachrichtigung senden
curl -X POST "$SLACK_WEBHOOK" \
    -H 'Content-type: application/json' \
    --data '{"text":"🚨 ROLLBACK INITIATED: '$ROLLBACK_REASON'"}'

# Services stoppen
docker-compose down

# Restore database
echo "Restoring database..."
psql $DATABASE_URL < $BACKUP_DIR/database.sql

# Restore Supabase
echo "Restoring Supabase..."
supabase db reset
psql $SUPABASE_DB_URL < $BACKUP_DIR/supabase_dump.sql

# Restore files
echo "Restoring files..."
rm -rf ./uploads/
tar -xzf $BACKUP_DIR/uploads.tar.gz

# Restore configuration
cp $BACKUP_DIR/.env.backup .env
cp -r $BACKUP_DIR/config/ ./config/

# Restore Docker image
echo "Restoring Docker image..."
docker load < $BACKUP_DIR/docker_image.tar

# Services starten
docker-compose up -d

# Health check
echo "Waiting for services to start..."
sleep 30

# Health Check
if curl -f http://localhost:8007/health; then
    echo "✅ Rollback successful!"
    curl -X POST "$SLACK_WEBHOOK" \
        -H 'Content-type: application/json' \
        --data '{"text":"✅ Rollback completed successfully"}'
else
    echo "❌ Rollback failed - manual intervention required"
    curl -X POST "$SLACK_WEBHOOK" \
        -H 'Content-type: application/json' \
        --data '{"text":"❌ Rollback failed - manual intervention required"}'
    exit 1
fi
```

---

## Environment Migration

### Development to Staging

#### Staging deployment pipeline

**GitHub Actions Workflow:**
```yaml
# .github/workflows/deploy_staging.yml
name: Deploy to Staging

on:
  push:
    branches: [develop]
  workflow_dispatch:

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          npm ci
          cd backend && pip install -r requirements.txt
      
      - name: Run tests
        run: |
          npm run test
          cd backend && pytest
      
      - name: Build application
        run: |
          npm run build
          cd backend && python -m build
      
      - name: Deploy to staging
        env:
          STAGING_HOST: ${{ secrets.STAGING_HOST }}
          STAGING_USER: ${{ secrets.STAGING_USER }}
          STAGING_KEY: ${{ secrets.STAGING_SSH_KEY }}
        run: |
          # SSH-Setup
          mkdir -p ~/.ssh
          echo "$STAGING_KEY" > ~/.ssh/staging_key
          chmod 600 ~/.ssh/staging_key
          
          # Deployment
          scp -i ~/.ssh/staging_key -r dist/ $STAGING_USER@$STAGING_HOST:/var/www/staging/
          ssh -i ~/.ssh/staging_key $STAGING_USER@$STAGING_HOST 'cd /var/www/staging && docker-compose up -d'
      
      - name: Run smoke tests
        run: |
          npm run test:smoke -- --baseUrl=https://staging.trusted-login.com
      
      - name: Notify team
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Staging to Production

#### Production deployment

**Blue-Green-Deployment:**
```bash
#!/bin/bash
# scripts/blue_green_deploy.sh

set -e

VERSION=$1
CURRENT_ENV=$(curl -s http://lb.trusted-login.com/env)

if [ "$CURRENT_ENV" = "blue" ]; then
    TARGET_ENV="green"
    STANDBY_ENV="blue"
else
    TARGET_ENV="blue"
    STANDBY_ENV="green"
fi

echo "Deploying version $VERSION to $TARGET_ENV environment"
echo "Current active environment: $STANDBY_ENV"

# Deploy zu Standby-Umgebung
echo "Deploying to $TARGET_ENV..."
docker-compose -f docker-compose.$TARGET_ENV.yml down
docker-compose -f docker-compose.$TARGET_ENV.yml pull
docker-compose -f docker-compose.$TARGET_ENV.yml up -d

# Warten auf Startup
echo "Waiting for $TARGET_ENV to be ready..."
for i in {1..30}; do
    if curl -f http://$TARGET_ENV.trusted-login.com/health; then
        echo "$TARGET_ENV is ready!"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 10
done

# Smoke Tests
echo "Running smoke tests on $TARGET_ENV..."
npm run test:smoke -- --baseUrl=http://$TARGET_ENV.trusted-login.com

if [ $? -eq 0 ]; then
    echo "Smoke tests passed. Switching traffic to $TARGET_ENV..."
    
    # Load Balancer umschalten
    curl -X POST http://lb.trusted-login.com/switch \
        -H "Content-Type: application/json" \
        -d '{"target": "'$TARGET_ENV'"}'
    
    echo "Traffic switched to $TARGET_ENV"
    
    # Alte Umgebung nach 5 Minuten herunterfahren
    sleep 300
    docker-compose -f docker-compose.$STANDBY_ENV.yml down
    
    echo "✅ Deployment completed successfully!"
else
    echo "❌ Smoke tests failed. Keeping $STANDBY_ENV active."
    docker-compose -f docker-compose.$TARGET_ENV.yml down
    exit 1
fi
```

### Cloud-Migration

#### AWS-Migration

**Terraform configuration:**
```hcl
# infrastructure/aws/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name = "trusted-login-vpc"
  }
}

# Subnets
resource "aws_subnet" "public" {
  count = 2
  
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  
  tags = {
    Name = "trusted-login-public-${count.index + 1}"
  }
}

resource "aws_subnet" "private" {
  count = 2
  
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  
  tags = {
    Name = "trusted-login-private-${count.index + 1}"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "trusted-login-cluster"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# RDS Instance
resource "aws_db_instance" "postgres" {
  identifier = "trusted-login-db"
  
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.micro"
  
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_encrypted     = true
  
  db_name  = "trusted_login"
  username = var.db_username
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = false
  final_snapshot_identifier = "trusted-login-final-snapshot"
  
  tags = {
    Name = "trusted-login-postgres"
  }
}
```

**Migration-Script:**
```bash
#!/bin/bash
# scripts/aws_migration.sh

set -e

echo "Starting AWS migration..."

# Terraform initialisieren
cd infrastructure/aws
terraform init
terraform plan -out=migration.tfplan

echo "Review the plan above. Continue? (y/N)"
read -r response
if [[ "$response" != "y" ]]; then
    echo "Migration aborted"
    exit 1
fi

# Infrastructure erstellen
terraform apply migration.tfplan

# Retrieve outputs
DB_ENDPOINT=$(terraform output -raw db_endpoint)
ECS_CLUSTER=$(terraform output -raw ecs_cluster_name)

# Datenbank migrieren
echo "Migrating database to AWS RDS..."
pg_dump $LOCAL_DB_URL | psql "postgresql://$DB_USER:$DB_PASS@$DB_ENDPOINT/trusted_login"

# Container-Images zu ECR pushen
echo "Pushing images to ECR..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_REGISTRY

docker tag trusted-login-frontend:latest $ECR_REGISTRY/trusted-login-frontend:latest
docker tag trusted-login-backend:latest $ECR_REGISTRY/trusted-login-backend:latest

docker push $ECR_REGISTRY/trusted-login-frontend:latest
docker push $ECR_REGISTRY/trusted-login-backend:latest

# ECS Services deployen
echo "Deploying to ECS..."
aws ecs update-service --cluster $ECS_CLUSTER --service trusted-login-frontend --force-new-deployment
aws ecs update-service --cluster $ECS_CLUSTER --service trusted-login-backend --force-new-deployment

echo "✅ AWS migration completed!"
```

### Container-Migration

#### Docker zu Kubernetes

**Kubernetes-Manifeste:**
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: trusted-login
  labels:
    name: trusted-login

---
# k8s/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: trusted-login
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: trusted-login-frontend:latest
        ports:
        - containerPort: 80
        env:
        - name: REACT_APP_API_URL
          value: "http://backend-service:8000"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5

---
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: trusted-login
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: trusted-login-backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        - name: SUPABASE_URL
          valueFrom:
            secretKeyRef:
              name: supabase-secret
              key: url
        - name: SUPABASE_ANON_KEY
          valueFrom:
            secretKeyRef:
              name: supabase-secret
              key: anon-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5

---
# k8s/services.yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: trusted-login
spec:
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP

---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: trusted-login
spec:
  selector:
    app: backend
  ports:
  - port: 8000
    targetPort: 8000
  type: ClusterIP

---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: trusted-login-ingress
  namespace: trusted-login
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - trusted-login.com
    - api.trusted-login.com
    secretName: trusted-login-tls
  rules:
  - host: trusted-login.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
  - host: api.trusted-login.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 8000
```

**Migration-Script:**
```bash
#!/bin/bash
# scripts/k8s_migration.sh

set -e

echo "Starting Kubernetes migration..."

# Kubernetes-Cluster vorbereiten
kubectl create namespace trusted-login --dry-run=client -o yaml | kubectl apply -f -

# Secrets erstellen
kubectl create secret generic db-secret \
    --from-literal=url="$DATABASE_URL" \
    --namespace=trusted-login

kubectl create secret generic supabase-secret \
    --from-literal=url="$SUPABASE_URL" \
    --from-literal=anon-key="$SUPABASE_ANON_KEY" \
    --namespace=trusted-login

# Container-Images bauen und pushen
echo "Building and pushing container images..."
docker build -t $REGISTRY/trusted-login-frontend:$VERSION .
docker build -t $REGISTRY/trusted-login-backend:$VERSION ./backend

docker push $REGISTRY/trusted-login-frontend:$VERSION
docker push $REGISTRY/trusted-login-backend:$VERSION

# Kubernetes-Manifeste anwenden
echo "Deploying to Kubernetes..."
kubectl apply -f k8s/

# Check deployment status
echo "Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/frontend -n trusted-login
kubectl wait --for=condition=available --timeout=300s deployment/backend -n trusted-login

# Retrieve Ingress IP
INGRESS_IP=$(kubectl get ingress trusted-login-ingress -n trusted-login -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Application available at: https://trusted-login.com (IP: $INGRESS_IP)"

echo "✅ Kubernetes migration completed!"
```

---

## Testing und Validierung

### Pre-Migration-Tests

#### Umfassende Test-Suite

**Pre-Migration-Test-Runner:**
```python
# scripts/pre_migration_tests.py
import asyncio
import aiohttp
import asyncpg
import pytest
from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class TestResult:
    test_name: str
    passed: bool
    message: str
    execution_time: float
    details: Dict[str, Any] = None

class PreMigrationTester:
    def __init__(self, base_url: str, db_url: str):
        self.base_url = base_url
        self.db_url = db_url
        self.results: List[TestResult] = []
    
    async def run_all_tests(self) -> List[TestResult]:
        """Runs all pre-migration tests"""
        import time
        
        tests = [
            self._test_api_endpoints,
            self._test_database_connectivity,
            self._test_authentication,
            self._test_workflow_execution,
            self._test_file_operations,
            self._test_performance_baseline
        ]
        
        for test in tests:
            start_time = time.time()
            try:
                await test()
                execution_time = time.time() - start_time
                self.results.append(TestResult(
                    test_name=test.__name__,
                    passed=True,
                    message="Test passed",
                    execution_time=execution_time
                ))
            except Exception as e:
                execution_time = time.time() - start_time
                self.results.append(TestResult(
                    test_name=test.__name__,
                    passed=False,
                    message=str(e),
                    execution_time=execution_time
                ))
        
        return self.results
    
    async def _test_api_endpoints(self):
        """Tests all critical API endpoints"""
        endpoints = [
            "/health",
            "/api/v1/auth/login",
            "/api/v1/workflows",
            "/api/v1/desktop/screenshot"
        ]
        
        async with aiohttp.ClientSession() as session:
            for endpoint in endpoints:
                async with session.get(f"{self.base_url}{endpoint}") as response:
                    if response.status >= 500:
                        raise Exception(f"Endpoint {endpoint} returned {response.status}")
    
    async def _test_database_connectivity(self):
        """Tests database connection and basic operations"""
        conn = await asyncpg.connect(self.db_url)
        try:
            # Simple query
            result = await conn.fetchval("SELECT 1")
            if result != 1:
                raise Exception("Database connectivity test failed")
            
            # Check table existence
            tables = await conn.fetch(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
            )
            required_tables = {"users", "workflows", "workflow_steps"}
            existing_tables = {row["table_name"] for row in tables}
            
            missing_tables = required_tables - existing_tables
            if missing_tables:
                raise Exception(f"Missing tables: {missing_tables}")
        finally:
            await conn.close()
    
    async def _test_authentication(self):
        """Tests authentication system"""
        async with aiohttp.ClientSession() as session:
            # Test login
            login_data = {
                "email": "test@example.com",
                "password": "testpassword"
            }
            
            async with session.post(
                f"{self.base_url}/api/v1/auth/login",
                json=login_data
            ) as response:
                if response.status != 200:
                    raise Exception(f"Authentication test failed: {response.status}")
                
                data = await response.json()
                if "access_token" not in data:
                    raise Exception("No access token in response")
    
    async def _test_workflow_execution(self):
        """Tests workflow execution"""
        # Here a simple test workflow would be executed
        async with aiohttp.ClientSession() as session:
            workflow_data = {
                "name": "Pre-Migration Test Workflow",
                "steps": [
                    {"type": "screenshot", "config": {}},
                    {"type": "wait", "config": {"duration": 1}}
                ]
            }
            
            async with session.post(
                f"{self.base_url}/api/v1/workflows",
                json=workflow_data
            ) as response:
                if response.status != 201:
                    raise Exception(f"Workflow creation failed: {response.status}")
    
    async def _test_file_operations(self):
        """Tests file upload and download"""
        # Test file upload
        test_content = b"Test file content for migration testing"
        
        async with aiohttp.ClientSession() as session:
            data = aiohttp.FormData()
            data.add_field('file', test_content, filename='test.txt')
            
            async with session.post(
                f"{self.base_url}/api/v1/files/upload",
                data=data
            ) as response:
                if response.status != 200:
                    raise Exception(f"File upload failed: {response.status}")
    
    async def _test_performance_baseline(self):
        """Creates performance baseline for post-migration comparison"""
        import time
        
        # Measure API response time
        start_time = time.time()
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{self.base_url}/api/v1/workflows") as response:
                if response.status != 200:
                    raise Exception("Performance baseline test failed")
        
        response_time = time.time() - start_time
        
        # Save performance baseline
        baseline = {
            "api_response_time": response_time,
            "timestamp": time.time()
        }
        
        with open("performance_baseline.json", "w") as f:
            import json
            json.dump(baseline, f)
        
        if response_time > 2.0:  # 2 seconds threshold
            raise Exception(f"API response time too slow: {response_time}s")

# Test-Runner
async def main():
    tester = PreMigrationTester(
        base_url="http://localhost:8007",
        db_url="postgresql://user:pass@localhost/trusted_login"
    )
    
    print("Running pre-migration tests...")
    results = await tester.run_all_tests()
    
    print("\nPre-Migration Test Results:")
    print("=" * 60)
    
    total_tests = len(results)
    passed_tests = sum(1 for r in results if r.passed)
    
    for result in results:
        status = "✅ PASS" if result.passed else "❌ FAIL"
        print(f"{status} {result.test_name}: {result.message} ({result.execution_time:.2f}s)")
    
    print("=" * 60)
    print(f"Results: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("✅ All pre-migration tests passed. System ready for migration.")
        return True
    else:
        print("❌ Some tests failed. Fix issues before proceeding with migration.")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
```

### Post-Migration Validation

#### Comprehensive Validation Suite

**Post-Migration Validator:**
```python
# scripts/post_migration_validator.py
import asyncio
import aiohttp
import asyncpg
import json
import time
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

@dataclass
class ValidationResult:
    category: str
    test_name: str
    passed: bool
    message: str
    details: Optional[Dict[str, Any]] = None
    performance_impact: Optional[float] = None

class PostMigrationValidator:
    def __init__(self, base_url: str, db_url: str, baseline_file: str = "performance_baseline.json"):
        self.base_url = base_url
        self.db_url = db_url
        self.baseline_file = baseline_file
        self.results: List[ValidationResult] = []
        self.baseline_data = self._load_baseline()
    
    def _load_baseline(self) -> Dict[str, Any]:
        """Loads performance baseline"""
        try:
            with open(self.baseline_file, "r") as f:
                return json.load(f)
        except FileNotFoundError:
            return {}
    
    async def validate_migration(self) -> List[ValidationResult]:
        """Runs complete post-migration validation"""
        validation_categories = [
            ("Functionality", self._validate_functionality),
            ("Data Integrity", self._validate_data_integrity),
            ("Performance", self._validate_performance),
            ("Security", self._validate_security),
            ("Integration", self._validate_integrations)
        ]
        
        for category, validator in validation_categories:
            try:
                await validator(category)
            except Exception as e:
                self.results.append(ValidationResult(
                    category=category,
                    test_name="Category Validation",
                    passed=False,
                    message=f"Category validation failed: {str(e)}"
                ))
        
        return self.results
    
    async def _validate_functionality(self, category: str):
        """Validates functionality after migration"""
        # Test API endpoints
        async with aiohttp.ClientSession() as session:
            endpoints = [
                ("/health", "GET", None),
                ("/api/v1/workflows", "GET", None),
                ("/api/v1/desktop/screenshot", "POST", {"region": "full"})
            ]
            
            for endpoint, method, data in endpoints:
                try:
                    if method == "GET":
                        async with session.get(f"{self.base_url}{endpoint}") as response:
                            success = response.status < 400
                    else:
                        async with session.post(f"{self.base_url}{endpoint}", json=data) as response:
                            success = response.status < 400
                    
                    self.results.append(ValidationResult(
                        category=category,
                        test_name=f"API {method} {endpoint}",
                        passed=success,
                        message=f"Status: {response.status}" if 'response' in locals() else "Request failed"
                    ))
                except Exception as e:
                    self.results.append(ValidationResult(
                        category=category,
                        test_name=f"API {method} {endpoint}",
                        passed=False,
                        message=str(e)
                    ))
    
    async def _validate_data_integrity(self, category: str):
        """Validates data integrity after migration"""
        conn = await asyncpg.connect(self.db_url)
        try:
            # Check user count
            user_count = await conn.fetchval("SELECT COUNT(*) FROM auth.users")
            self.results.append(ValidationResult(
                category=category,
                test_name="User Count",
                passed=user_count > 0,
                message=f"Found {user_count} users",
                details={"count": user_count}
            ))
            
            # Check workflow integrity
            workflow_integrity = await conn.fetchval(
                "SELECT COUNT(*) FROM workflows w LEFT JOIN auth.users u ON w.user_id = u.id WHERE u.id IS NULL"
            )
            self.results.append(ValidationResult(
                category=category,
                test_name="Workflow Integrity",
                passed=workflow_integrity == 0,
                message=f"Orphaned workflows: {workflow_integrity}",
                details={"orphaned_count": workflow_integrity}
            ))
            
            # Check data type consistency
            type_errors = await conn.fetch(
                "SELECT table_name, column_name FROM information_schema.columns WHERE data_type = 'USER-DEFINED'"
            )
            self.results.append(ValidationResult(
                category=category,
                test_name="Data Type Consistency",
                passed=len(type_errors) == 0,
                message=f"Type inconsistencies: {len(type_errors)}",
                details={"type_errors": [dict(row) for row in type_errors]}
            ))
        finally:
            await conn.close()
    
    async def _validate_performance(self, category: str):
        """Validates performance after migration"""
        # Measure API response time
        start_time = time.time()
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{self.base_url}/api/v1/workflows") as response:
                current_response_time = time.time() - start_time
        
        # Compare with baseline
        baseline_time = self.baseline_data.get("api_response_time", 1.0)
        performance_impact = ((current_response_time - baseline_time) / baseline_time) * 100
        
        self.results.append(ValidationResult(
            category=category,
            test_name="API Response Time",
            passed=current_response_time <= baseline_time * 1.2,  # 20% tolerance
            message=f"Current: {current_response_time:.2f}s, Baseline: {baseline_time:.2f}s",
            performance_impact=performance_impact,
            details={
                "current_time": current_response_time,
                "baseline_time": baseline_time,
                "impact_percent": performance_impact
            }
        ))
        
        # Database performance
        conn = await asyncpg.connect(self.db_url)
        try:
            start_time = time.time()
            await conn.fetch("SELECT * FROM workflows LIMIT 100")
            db_query_time = time.time() - start_time
            
            self.results.append(ValidationResult(
            category=category,
            test_name="Database Query Performance",
            passed=db_query_time < 1.0,  # 1 second threshold
            message=f"Query time: {db_query_time:.2f}s",
            details={"query_time": db_query_time}
        ))
        finally:
            await conn.close()
    
    async def _validate_security(self, category: str):
        """Validates security aspects after migration"""
        # Check HTTPS availability
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"https://{self.base_url.replace('http://', '')}/health") as response:
                    https_available = response.status < 400
        except:
            https_available = False
        
        self.results.append(ValidationResult(
            category=category,
            test_name="HTTPS Availability",
            passed=https_available,
            message="HTTPS is available" if https_available else "HTTPS not available"
        ))
        
        # Check security headers
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{self.base_url}/") as response:
                headers = response.headers
                
                security_headers = {
                    "X-Content-Type-Options": "nosniff",
                    "X-Frame-Options": "DENY",
                    "X-XSS-Protection": "1; mode=block"
                }
                
                for header, expected in security_headers.items():
                    present = header in headers
                    self.results.append(ValidationResult(
                        category=category,
                        test_name=f"Security Header {header}",
                        passed=present,
                        message=f"Header present: {present}"
                    ))
    
    async def _validate_integrations(self, category: str):
        """Validates external integrations after migration"""
        # Test Supabase connection
        try:
            conn = await asyncpg.connect(self.db_url)
            await conn.fetchval("SELECT 1")
            await conn.close()
            supabase_ok = True
        except:
            supabase_ok = False
        
        self.results.append(ValidationResult(
            category=category,
            test_name="Supabase Connection",
            passed=supabase_ok,
            message="Supabase connection successful" if supabase_ok else "Supabase connection failed"
        ))
        
        # Test desktop service integration
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/api/v1/desktop/screenshot",
                    json={"region": "full"}
                ) as response:
                    desktop_ok = response.status < 400
        except:
            desktop_ok = False
        
        self.results.append(ValidationResult(
            category=category,
            test_name="Desktop Service Integration",
            passed=desktop_ok,
            message="Desktop service available" if desktop_ok else "Desktop service unavailable"
        ))

# Run validation
async def main():
    validator = PostMigrationValidator(
        base_url="http://localhost:8007",
        db_url="postgresql://user:pass@localhost/trusted_login"
    )
    
    print("Running post-migration validation...")
    results = await validator.validate_migration()
    
    print("\nPost-Migration Validation Results:")
    print("=" * 70)
    
    # Group results by categories
    categories = {}
    for result in results:
        if result.category not in categories:
            categories[result.category] = []
        categories[result.category].append(result)
    
    overall_success = True
    for category, category_results in categories.items():
        print(f"\n📋 {category}:")
        print("-" * 40)
        
        category_passed = sum(1 for r in category_results if r.passed)
        category_total = len(category_results)
        
        for result in category_results:
            status = "✅ PASS" if result.passed else "❌ FAIL"
            print(f"  {status} {result.test_name}: {result.message}")
            
            if result.performance_impact is not None:
                impact_str = f"({result.performance_impact:+.1f}%)"
                print(f"    Performance Impact: {impact_str}")
            
            if not result.passed:
                overall_success = False
        
        print(f"  Category Result: {category_passed}/{category_total} tests passed")
    
    print("\n" + "=" * 70)
    if overall_success:
        print("✅ Migration validation completed successfully!")
        print("🎉 System is ready for production use.")
    else:
        print("❌ Migration validation failed!")
        print("🔧 Please address the failed tests before proceeding.")
    
    return overall_success

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
```

### Performance Comparisons

#### Performance Monitoring

**Performance Comparison Tool:**
```python
# scripts/performance_comparison.py
import json
import time
import asyncio
import aiohttp
import matplotlib.pyplot as plt
from typing import Dict, List, Any
from dataclasses import dataclass
from datetime import datetime

@dataclass
class PerformanceMetric:
    name: str
    pre_migration: float
    post_migration: float
    unit: str
    threshold: float
    
    @property
    def improvement_percent(self) -> float:
        return ((self.pre_migration - self.post_migration) / self.pre_migration) * 100
    
    @property
    def within_threshold(self) -> bool:
        return abs(self.improvement_percent) <= self.threshold

class PerformanceComparator:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.metrics: List[PerformanceMetric] = []
    
    async def run_performance_comparison(self) -> List[PerformanceMetric]:
        """Runs performance comparison"""
        # Load baseline
        baseline = self._load_baseline()
        
        # Collect current metrics
        current_metrics = await self._collect_current_metrics()
        
        # Create comparison
        for metric_name, current_value in current_metrics.items():
            if metric_name in baseline:
                metric = PerformanceMetric(
                    name=metric_name,
                    pre_migration=baseline[metric_name]["value"],
                    post_migration=current_value,
                    unit=baseline[metric_name].get("unit", "ms"),
                    threshold=baseline[metric_name].get("threshold", 20.0)
                )
                self.metrics.append(metric)
        
        return self.metrics
    
    def _load_baseline(self) -> Dict[str, Any]:
        """Loads performance baseline"""
        try:
            with open("performance_baseline.json", "r") as f:
                return json.load(f)
        except FileNotFoundError:
            return {}
    
    async def _collect_current_metrics(self) -> Dict[str, float]:
        """Collects current performance metrics"""
        metrics = {}
        
        # API response time
        start_time = time.time()
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{self.base_url}/api/v1/workflows") as response:
                metrics["api_response_time"] = (time.time() - start_time) * 1000
        
        # Additional metrics...
        return metrics
    
    def generate_report(self) -> str:
        """Generates performance comparison report"""
        report = ["# Performance Comparison Report"]
        report.append(f"Generated: {datetime.now().isoformat()}")
        report.append("\n## Summary\n")
        
        total_metrics = len(self.metrics)
        within_threshold = sum(1 for m in self.metrics if m.within_threshold)
        
        report.append(f"- Total metrics compared: {total_metrics}")
        report.append(f"- Within threshold: {within_threshold}/{total_metrics}")
        report.append(f"- Success rate: {(within_threshold/total_metrics)*100:.1f}%")
        
        report.append("\n## Detailed Results\n")
        
        for metric in self.metrics:
            status = "✅" if metric.within_threshold else "⚠️"
            report.append(f"{status} **{metric.name}**")
            report.append(f"  - Pre-migration: {metric.pre_migration:.2f} {metric.unit}")
            report.append(f"  - Post-migration: {metric.post_migration:.2f} {metric.unit}")
            report.append(f"  - Change: {metric.improvement_percent:+.1f}%")
            report.append("")
        
        return "\n".join(report)
    
    def create_visualization(self, output_file: str = "performance_comparison.png"):
        """Creates visualization of performance comparisons"""
        if not self.metrics:
            return
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
        
        # Bar chart for absolute values
        names = [m.name for m in self.metrics]
        pre_values = [m.pre_migration for m in self.metrics]
        post_values = [m.post_migration for m in self.metrics]
        
        x = range(len(names))
        width = 0.35
        
        ax1.bar([i - width/2 for i in x], pre_values, width, label='Pre-Migration', alpha=0.8)
        ax1.bar([i + width/2 for i in x], post_values, width, label='Post-Migration', alpha=0.8)
        
        ax1.set_xlabel('Metrics')
        ax1.set_ylabel('Value')
        ax1.set_title('Performance Comparison: Absolute Values')
        ax1.set_xticks(x)
        ax1.set_xticklabels(names, rotation=45)
        ax1.legend()
        
        # Improvement in percent
        improvements = [m.improvement_percent for m in self.metrics]
        colors = ['green' if imp > 0 else 'red' for imp in improvements]
        
        ax2.bar(names, improvements, color=colors, alpha=0.7)
        ax2.set_xlabel('Metrics')
        ax2.set_ylabel('Improvement (%)')
        ax2.set_title('Performance Change (%)')
        ax2.axhline(y=0, color='black', linestyle='-', alpha=0.3)
        ax2.tick_params(axis='x', rotation=45)
        
        plt.tight_layout()
        plt.savefig(output_file, dpi=300, bbox_inches='tight')
        plt.close()

# Run performance comparison
async def main():
    comparator = PerformanceComparator("http://localhost:8007")
    metrics = await comparator.run_performance_comparison()
    
    if metrics:
        # Generate report
        report = comparator.generate_report()
        with open("performance_report.md", "w") as f:
            f.write(report)
        
        # Create visualization
        comparator.create_visualization()
        
        print("Performance comparison completed!")
        print("- Report saved to: performance_report.md")
        print("- Visualization saved to: performance_comparison.png")
    else:
        print("No baseline data found. Run pre-migration tests first.")

if __name__ == "__main__":
    asyncio.run(main())
```

### User Acceptance Tests

#### UAT Framework

**User Acceptance Test Suite:**
```python
# scripts/user_acceptance_tests.py
import asyncio
import json
from typing import List, Dict, Any
from dataclasses import dataclass
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

@dataclass
class UATResult:
    test_name: str
    scenario: str
    passed: bool
    message: str
    screenshot_path: str = None
    execution_time: float = 0.0

class UserAcceptanceTestSuite:
    def __init__(self, base_url: str, headless: bool = True):
        self.base_url = base_url
        self.headless = headless
        self.driver = None
        self.results: List[UATResult] = []
    
    def setup_driver(self):
        """Initializes WebDriver"""
        options = Options()
        if self.headless:
            options.add_argument("--headless")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        
        self.driver = webdriver.Chrome(options=options)
        self.driver.implicitly_wait(10)
    
    def teardown_driver(self):
        """Closes WebDriver"""
        if self.driver:
            self.driver.quit()
    
    async def run_all_uat_tests(self) -> List[UATResult]:
        """Runs all user acceptance tests"""
        self.setup_driver()
        
        try:
            test_scenarios = [
                self._test_user_registration,
                self._test_user_login,
                self._test_workflow_creation,
                self._test_workflow_execution,
                self._test_workflow_management,
                self._test_user_profile,
                self._test_responsive_design
            ]
            
            for test_scenario in test_scenarios:
                try:
                    await test_scenario()
                except Exception as e:
                    self.results.append(UATResult(
                        test_name=test_scenario.__name__,
                        scenario="Test execution",
                        passed=False,
                        message=f"Test failed with exception: {str(e)}"
                    ))
        finally:
            self.teardown_driver()
        
        return self.results
    
    async def _test_user_registration(self):
        """Tests user registration"""
        import time
        start_time = time.time()
        
        self.driver.get(f"{self.base_url}/register")
        
        # Fill out form
        email_field = self.driver.find_element(By.NAME, "email")
        password_field = self.driver.find_element(By.NAME, "password")
        confirm_password_field = self.driver.find_element(By.NAME, "confirmPassword")
        
        test_email = f"test_{int(time.time())}@example.com"
        email_field.send_keys(test_email)
        password_field.send_keys("TestPassword123!")
        confirm_password_field.send_keys("TestPassword123!")
        
        # Submit registration
        submit_button = self.driver.find_element(By.TYPE, "submit")
        submit_button.click()
        
        # Verify success
        try:
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CLASS_NAME, "success-message"))
            )
            success = True
            message = "User registration successful"
        except:
            success = False
            message = "User registration failed"
        
        execution_time = time.time() - start_time
        
        self.results.append(UATResult(
            test_name="User Registration",
            scenario="New user creates account",
            passed=success,
            message=message,
            execution_time=execution_time
        ))
    
    async def _test_user_login(self):
        """Tests user login"""
        import time
        start_time = time.time()
        
        self.driver.get(f"{self.base_url}/login")
        
        # Fill out login form
        email_field = self.driver.find_element(By.NAME, "email")
        password_field = self.driver.find_element(By.NAME, "password")
        
        email_field.send_keys("test@example.com")
        password_field.send_keys("testpassword")
        
        # Submit login
        submit_button = self.driver.find_element(By.TYPE, "submit")
        submit_button.click()
        
        # Verify dashboard redirection
        try:
            WebDriverWait(self.driver, 10).until(
                EC.url_contains("/dashboard")
            )
            success = True
            message = "Login successful, redirected to dashboard"
        except:
            success = False
            message = "Login failed or no redirect to dashboard"
        
        execution_time = time.time() - start_time
        
        self.results.append(UATResult(
            test_name="User Login",
            scenario="Existing user logs in",
            passed=success,
            message=message,
            execution_time=execution_time
        ))
    
    async def _test_workflow_creation(self):
        """Tests workflow creation"""
        import time
        start_time = time.time()
        
        # Navigate to dashboard (login assumed)
        self.driver.get(f"{self.base_url}/dashboard")
        
        # Click "New Workflow" button
        try:
            new_workflow_button = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.ID, "new-workflow-btn"))
            )
            new_workflow_button.click()
            
            # Enter workflow name
            name_field = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.NAME, "workflowName"))
            )
            name_field.send_keys("UAT Test Workflow")
            
            # Add first step
            add_step_button = self.driver.find_element(By.ID, "add-step-btn")
            add_step_button.click()
            
            # Select screenshot step
            step_type_select = self.driver.find_element(By.NAME, "stepType")
            step_type_select.send_keys("Screenshot")
            
            # Save workflow
            save_button = self.driver.find_element(By.ID, "save-workflow-btn")
            save_button.click()
            
            # Verify success
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CLASS_NAME, "workflow-saved"))
            )
            
            success = True
            message = "Workflow creation successful"
        except Exception as e:
            success = False
            message = f"Workflow creation failed: {str(e)}"
        
        execution_time = time.time() - start_time
        
        self.results.append(UATResult(
            test_name="Workflow Creation",
            scenario="User creates new workflow with steps",
            passed=success,
            message=message,
            execution_time=execution_time
        ))
    
    async def _test_workflow_execution(self):
        """Tests workflow execution"""
        import time
        start_time = time.time()
        
        # Open workflow list
        self.driver.get(f"{self.base_url}/workflows")
        
        try:
            # Select first workflow
            first_workflow = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.CLASS_NAME, "workflow-item"))
            )
            first_workflow.click()
            
            # Click "Execute" button
            execute_button = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.ID, "execute-workflow-btn"))
            )
            execute_button.click()
            
            # Start execution
            confirm_button = WebDriverWait(self.driver, 5).until(
                EC.element_to_be_clickable((By.ID, "confirm-execute-btn"))
            )
            confirm_button.click()
            
            # Verify execution status
            WebDriverWait(self.driver, 30).until(
                EC.presence_of_element_located((By.CLASS_NAME, "execution-status"))
            )
            
            status_element = self.driver.find_element(By.CLASS_NAME, "execution-status")
            status_text = status_element.text.lower()
            
            if "completed" in status_text or "success" in status_text:
                success = True
                message = "Workflow execution completed successfully"
            else:
                success = False
                message = f"Workflow execution status: {status_text}"
        
        except Exception as e:
            success = False
            message = f"Workflow execution failed: {str(e)}"
        
        execution_time = time.time() - start_time
        
        self.results.append(UATResult(
            test_name="Workflow Execution",
            scenario="User executes existing workflow",
            passed=success,
            message=message,
            execution_time=execution_time
        ))
    
    async def _test_workflow_management(self):
        """Tests workflow management"""
        import time
        start_time = time.time()
        
        self.driver.get(f"{self.base_url}/workflows")
        
        try:
            # Load workflow list
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CLASS_NAME, "workflow-list"))
            )
            
            # Edit workflow
            edit_button = self.driver.find_element(By.CLASS_NAME, "edit-workflow-btn")
            edit_button.click()
            
            # Change name
            name_field = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.NAME, "workflowName"))
            )
            name_field.clear()
            name_field.send_keys("Updated UAT Test Workflow")
            
            # Save changes
            save_button = self.driver.find_element(By.ID, "save-workflow-btn")
            save_button.click()
            
            # Verify success
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CLASS_NAME, "workflow-updated"))
            )
            
            success = True
            message = "Workflow management operations successful"
        
        except Exception as e:
            success = False
            message = f"Workflow management failed: {str(e)}"
        
        execution_time = time.time() - start_time
        
        self.results.append(UATResult(
            test_name="Workflow Management",
            scenario="User edits and updates workflow",
            passed=success,
            message=message,
            execution_time=execution_time
        ))
    
    async def _test_user_profile(self):
        """Tests user profile management"""
        import time
        start_time = time.time()
        
        self.driver.get(f"{self.base_url}/profile")
        
        try:
            # Load profile form
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.ID, "profile-form"))
            )
            
            # Change username
            username_field = self.driver.find_element(By.NAME, "username")
            username_field.clear()
            username_field.send_keys("UAT Test User")
            
            # Change settings
            theme_select = self.driver.find_element(By.NAME, "theme")
            theme_select.send_keys("Dark")
            
            # Save profile
            save_button = self.driver.find_element(By.ID, "save-profile-btn")
            save_button.click()
            
            # Verify success
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CLASS_NAME, "profile-saved"))
            )
            
            success = True
            message = "User profile management successful"
        
        except Exception as e:
            success = False
            message = f"User profile management failed: {str(e)}"
        
        execution_time = time.time() - start_time
        
        self.results.append(UATResult(
            test_name="User Profile Management",
            scenario="User updates profile settings",
            passed=success,
            message=message,
            execution_time=execution_time
        ))
    
    async def _test_responsive_design(self):
        """Tests responsive design"""
        import time
        start_time = time.time()
        
        # Test desktop view
        self.driver.set_window_size(1920, 1080)
        self.driver.get(f"{self.base_url}/dashboard")
        
        try:
            # Verify navigation
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CLASS_NAME, "navigation"))
            )
            
            # Test mobile view
            self.driver.set_window_size(375, 667)  # iPhone size
            
            # Verify mobile navigation
            mobile_menu = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CLASS_NAME, "mobile-menu"))
            )
            
            # Test tablet view
            self.driver.set_window_size(768, 1024)  # iPad size
            
            # Verify layout adjustment
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CLASS_NAME, "tablet-layout"))
            )
            
            success = True
            message = "Responsive design works across all device sizes"
        
        except Exception as e:
            success = False
            message = f"Responsive design issues: {str(e)}"
        
        execution_time = time.time() - start_time
        
        self.results.append(UATResult(
            test_name="Responsive Design",
            scenario="UI adapts to different screen sizes",
            passed=success,
            message=message,
            execution_time=execution_time
        ))
    
    def generate_uat_report(self) -> str:
        """Generates UAT report"""
        report = ["# User Acceptance Test Report"]
        report.append(f"Generated: {datetime.now().isoformat()}")
        report.append("\n## Executive Summary\n")
        
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r.passed)
        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        report.append(f"- **Total Tests**: {total_tests}")
        report.append(f"- **Passed**: {passed_tests}")
        report.append(f"- **Failed**: {total_tests - passed_tests}")
        report.append(f"- **Success Rate**: {success_rate:.1f}%")
        
        if success_rate >= 90:
            report.append("- **Overall Status**: ✅ **PASSED** - Ready for production")
        elif success_rate >= 70:
            report.append("- **Overall Status**: ⚠️ **CONDITIONAL** - Minor issues to address")
        else:
            report.append("- **Overall Status**: ❌ **FAILED** - Significant issues require attention")
        
        report.append("\n## Detailed Test Results\n")
        
        for result in self.results:
            status = "✅ PASS" if result.passed else "❌ FAIL"
            report.append(f"### {status} {result.test_name}")
            report.append(f"**Scenario**: {result.scenario}")
            report.append(f"**Result**: {result.message}")
            report.append(f"**Execution Time**: {result.execution_time:.2f}s")
            
            if result.screenshot_path:
                report.append(f"**Screenshot**: {result.screenshot_path}")
            
            report.append("")
        
        return "\n".join(report)

# Run UAT
async def main():
    uat_suite = UserAcceptanceTestSuite(
        base_url="http://localhost:3000",
        headless=False  # Für Debugging
    )
    
    print("Running User Acceptance Tests...")
    results = await uat_suite.run_all_uat_tests()
    
    # Bericht generieren
    report = uat_suite.generate_uat_report()
    with open("uat_report.md", "w") as f:
        f.write(report)
    
    print(f"\nUAT completed! {len(results)} tests executed.")
    print("Report saved to: uat_report.md")
    
    # Print summary
    passed = sum(1 for r in results if r.passed)
    total = len(results)
    print(f"Results: {passed}/{total} tests passed ({(passed/total)*100:.1f}%)")
    
    return passed == total

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
```