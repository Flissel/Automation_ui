# Maintenance Procedures - Trusted Login System

## Overview

This document defines routine maintenance tasks, verification steps, and operational checks to keep the Trusted Login System healthy and secure. Use it as a runbook for daily, weekly, and monthly activities.

## Table of Contents

1. [Routine Maintenance Tasks](#routine-maintenance-tasks)
   - [Daily](#daily)
   - [Weekly](#weekly)
   - [Monthly](#monthly)
2. [Health Checks](#health-checks)
3. [Log Review](#log-review)
4. [Database Maintenance](#database-maintenance)
5. [Performance Analysis](#performance-analysis)
6. [Security Scans](#security-scans)
7. [Backup and Restore Verification](#backup-and-restore-verification)
8. [Dependency Updates](#dependency-updates)
9. [Capacity Review](#capacity-review)
10. [Change Management Checklist](#change-management-checklist)

## Routine Maintenance Tasks

### Daily
- Verify backend health endpoint returns healthy status.
- Check error rates and recent alerts in monitoring.
- Spot-check application functionality (login, a simple workflow).

```bash
# Health check (expects status: healthy)
curl -s http://localhost:8007/health | jq '.status'
```

### Weekly
- Review logs for errors, warnings, and slow operations.
- Validate backups exist for the last 7 days and are readable (see backup verification).
- Run quick security checks for backend and frontend dependencies.

### Monthly
- Perform database maintenance during a maintenance window (VACUUM/ANALYZE/REINDEX as needed).
- Review performance dashboards and update capacity plans.
- Apply minor dependency updates and re-run full test suite.

## Health Checks

- Backend health endpoint should include uptime and basic system metrics.
- Confirm critical integrations (database, external APIs, storage) are reachable.

```bash
# Basic request
curl -s http://localhost:8007/health | jq

# Optional: fail CI/automation if not healthy
STATUS=$(curl -s http://localhost:8007/health | jq -r '.status')
[ "$STATUS" = "healthy" ] || { echo "Health check failed"; exit 1; }
```

## Log Review

- Review recent application logs for exceptions and high-latency operations.
- Focus on recurring errors, spikes, and timeouts.

```powershell
# Tail application logs (PowerShell)
Get-Content -Path logs/app.log -Tail 200 -Wait
```

## Database Maintenance

Run during low-traffic windows and after recent full backups:

```sql
-- Analyze tables for better query planning
VACUUM (ANALYZE);

-- Identify tables with many dead tuples
SELECT relname, n_dead_tup
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 10;

-- Reindex if fragmentation or bloat is high
-- REINDEX DATABASE trusted_login_db;
```

Checklist:
- Check slow query logs and add missing indexes where justified.
- Verify connection pool sizes and timeouts match workload.

## Performance Analysis

- Review p95/p99 latencies, error rates, and throughput in monitoring.
- Inspect resource utilization: CPU, memory, disk I/O, and network.
- For suspected regressions, compare metrics to previous releases and recent changes.

## Security Scans

Run lightweight scans regularly and full scans monthly:

```bash
# Frontend (Node)
npm audit --production || true

# Backend (Python)
pip install -U pip pip-audit bandit >/dev/null
pip-audit -r backend/requirements.txt || true
bandit -q -r backend/app || true
```

Also verify:
- Access keys and secrets are rotated according to policy.
- Authentication/authorization paths work as expected.

## Backup and Restore Verification

- Ensure daily database backups are created and retained per policy.
- Monthly, perform a restore test into a temporary database and validate integrity.

```bash
# Example backup (PostgreSQL)
pg_dump -h localhost -U postgres trusted_login_db > /opt/backups/backup_$(date +"%Y%m%d_%H%M%S").sql

# Example restore (to temp database)
createdb -h localhost -U postgres trusted_login_db_tmp
psql -h localhost -U postgres trusted_login_db_tmp < /path/to/backup.sql
```

## Dependency Updates

- Review outdated packages and plan updates.

```bash
# Frontend
npm outdated
npm update

# Backend (Python)
pip list --outdated
# Prefer pinning and testing before upgrading in production
```

## Capacity Review

- Compare current utilization (CPU, memory, storage, network) with thresholds.
- Review active users, workflow execution volume, and OCR usage trends.
- Plan scaling actions (instance size/count, DB resources, caching strategies).

## Change Management Checklist

Before changes:
- Change ticket approved with rollback plan and test evidence.
- Maintenance window scheduled and stakeholders informed.

After changes:
- Post-change health checks and smoke tests completed.
- Metrics and logs reviewed for regressions.
- Documentation updated (versions, procedures, and known issues).