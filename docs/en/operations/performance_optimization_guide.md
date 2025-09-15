# Performance Optimization Guide - Trusted Login System

## Overview

This comprehensive guide documents performance metrics, optimization strategies, and best practices for the Trusted Login System. The goal is to ensure optimal system performance with minimal resource usage.

## Table of Contents

1. [Performance-Metriken](#performance-metriken)
2. [Backend-Optimierung](#backend-optimierung)
3. [Frontend-Optimierung](#frontend-optimierung)
4. [Datenbank-Optimierung](#datenbank-optimierung)
5. [Workflow-Engine-Optimierung](#workflow-engine-optimierung)
6. [Desktop-Integration-Optimierung](#desktop-integration-optimierung)
7. [OCR-Service-Optimierung](#ocr-service-optimierung)
8. [Caching-Strategien](#caching-strategien)
9. [Monitoring & Alerting](#monitoring--alerting)
10. [Load Testing](#load-testing)
11. [Skalierungsstrategien](#skalierungsstrategien)
12. [Troubleshooting](#troubleshooting)

## Performance-Metriken

### Key Performance Indicators (KPIs)

#### Response Time Targets
- **API-Endpunkte**: < 200ms (95th percentile)
- **Workflow-Ausführung**: < 5s für einfache Workflows
- **Desktop-Aktionen**: < 100ms pro Aktion
- **OCR-Verarbeitung**: < 2s pro Bild
- **Frontend-Ladezeit**: < 3s initial load

#### Throughput Targets
- **Concurrent Users**: 100+ gleichzeitige Benutzer
- **API Requests**: 1000+ Requests/Minute
- **Workflow Executions**: 50+ gleichzeitige Ausführungen
- **Desktop Actions**: 500+ Aktionen/Minute

#### Resource Utilization
- **CPU Usage**: < 70% unter normaler Last
- **Memory Usage**: < 80% verfügbarer RAM
- **Disk I/O**: < 80% verfügbare IOPS
- **Network**: < 70% verfügbare Bandbreite

### Performance Monitoring Service

```python
# backend/app/services/performance_monitor.py
import time
import psutil
import asyncio
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import logging

@dataclass
class PerformanceMetric:
    """Performance-Metrik Datenklasse"""
    name: str
    value: float
    unit: str
    timestamp: datetime
    tags: Dict[str, str] = None
    threshold_warning: float = None
    threshold_critical: float = None

@dataclass
class SystemMetrics:
    """System-Metriken Sammlung"""
    cpu_percent: float
    memory_percent: float
    disk_usage_percent: float
    network_io: Dict[str, int]
    process_count: int
    uptime_seconds: float
    timestamp: datetime

class PerformanceMonitor:
    """Performance-Monitoring Service"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.metrics_history: List[PerformanceMetric] = []
        self.alert_thresholds = {
            'cpu_usage': {'warning': 70.0, 'critical': 85.0},
            'memory_usage': {'warning': 80.0, 'critical': 90.0},
            'response_time': {'warning': 200.0, 'critical': 500.0},
            'error_rate': {'warning': 1.0, 'critical': 5.0}
        }
        self.start_time = time.time()
    
    async def collect_system_metrics(self) -> SystemMetrics:
        """System-Metriken sammeln"""
        try:
            # CPU-Nutzung
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Speicher-Nutzung
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            
            # Festplatten-Nutzung
            disk = psutil.disk_usage('/')
            disk_usage_percent = (disk.used / disk.total) * 100
            
            # Netzwerk-I/O
            network = psutil.net_io_counters()
            network_io = {
                'bytes_sent': network.bytes_sent,
                'bytes_recv': network.bytes_recv,
                'packets_sent': network.packets_sent,
                'packets_recv': network.packets_recv
            }
            
            # Prozess-Anzahl
            process_count = len(psutil.pids())
            
            # Uptime
            uptime_seconds = time.time() - self.start_time
            
            return SystemMetrics(
                cpu_percent=cpu_percent,
                memory_percent=memory_percent,
                disk_usage_percent=disk_usage_percent,
                network_io=network_io,
                process_count=process_count,
                uptime_seconds=uptime_seconds,
                timestamp=datetime.now()
            )
            
        except Exception as e:
            self.logger.error(f"Fehler beim Sammeln der System-Metriken: {e}")
            raise
    
    def record_metric(self, metric: PerformanceMetric):
        """Performance-Metrik aufzeichnen"""
        self.metrics_history.append(metric)
        
        # Alte Metriken bereinigen (nur letzte 24h behalten)
        cutoff_time = datetime.now() - timedelta(hours=24)
        self.metrics_history = [
            m for m in self.metrics_history 
            if m.timestamp > cutoff_time
        ]
        
        # Schwellenwert-Prüfung
        self._check_thresholds(metric)
    
    def _check_thresholds(self, metric: PerformanceMetric):
        """Schwellenwerte prüfen und Alerts senden"""
        if metric.name in self.alert_thresholds:
            thresholds = self.alert_thresholds[metric.name]
            
            if metric.value >= thresholds['critical']:
                self._send_alert('critical', metric)
            elif metric.value >= thresholds['warning']:
                self._send_alert('warning', metric)
    
    def _send_alert(self, level: str, metric: PerformanceMetric):
        """Performance-Alert senden"""
        alert_message = (
            f"Performance Alert [{level.upper()}]: "
            f"{metric.name} = {metric.value}{metric.unit} "
            f"(Threshold: {self.alert_thresholds[metric.name][level]})"
        )
        
        if level == 'critical':
            self.logger.critical(alert_message)
        else:
            self.logger.warning(alert_message)
    
    def get_metrics_summary(self, hours: int = 1) -> Dict:
        """Metriken-Zusammenfassung abrufen"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        recent_metrics = [
            m for m in self.metrics_history 
            if m.timestamp > cutoff_time
        ]
        
        if not recent_metrics:
            return {}
        
        # Gruppierung nach Metrik-Namen
        grouped_metrics = {}
        for metric in recent_metrics:
            if metric.name not in grouped_metrics:
                grouped_metrics[metric.name] = []
            grouped_metrics[metric.name].append(metric.value)
        
        # Statistiken berechnen
        summary = {}
        for name, values in grouped_metrics.items():
            summary[name] = {
                'count': len(values),
                'avg': sum(values) / len(values),
                'min': min(values),
                'max': max(values),
                'p95': self._percentile(values, 95),
                'p99': self._percentile(values, 99)
            }
        
        return summary
    
    def _percentile(self, values: List[float], percentile: int) -> float:
        """Perzentil berechnen"""
        sorted_values = sorted(values)
        index = int((percentile / 100) * len(sorted_values))
        return sorted_values[min(index, len(sorted_values) - 1)]

# Performance Decorator für API-Endpunkte
def monitor_performance(metric_name: str):
    """Decorator für Performance-Monitoring"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                duration = (time.time() - start_time) * 1000  # ms
                
                # Metrik aufzeichnen
                monitor = PerformanceMonitor()
                metric = PerformanceMetric(
                    name=f"{metric_name}_response_time",
                    value=duration,
                    unit="ms",
                    timestamp=datetime.now(),
                    tags={'function': func.__name__}
                )
                monitor.record_metric(metric)
                
                return result
            except Exception as e:
                duration = (time.time() - start_time) * 1000
                
                # Fehler-Metrik aufzeichnen
                monitor = PerformanceMonitor()
                error_metric = PerformanceMetric(
                    name=f"{metric_name}_error",
                    value=1,
                    unit="count",
                    timestamp=datetime.now(),
                    tags={'function': func.__name__, 'error': str(e)}
                )
                monitor.record_metric(error_metric)
                raise
        return wrapper
    return decorator
```

## Backend-Optimierung

### FastAPI-Optimierungen

```python
# backend/app/core/performance_config.py
from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.cors import CORSMiddleware
import uvloop
import asyncio

def configure_performance(app: FastAPI):
    """FastAPI Performance-Konfiguration"""
    
    # Event Loop Optimierung
    if hasattr(asyncio, 'set_event_loop_policy'):
        asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())
    
    # Compression Middleware
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    
    # CORS mit optimierten Einstellungen
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # In Produktion spezifizieren
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        max_age=3600  # Cache preflight requests
    )
    
    # Response Headers für Caching
    @app.middleware("http")
    async def add_cache_headers(request, call_next):
        response = await call_next(request)
        
        # Static assets caching
        if request.url.path.startswith("/static/"):
            response.headers["Cache-Control"] = "public, max-age=31536000"
        
        # API responses caching
        elif request.url.path.startswith("/api/"):
            if request.method == "GET":
                response.headers["Cache-Control"] = "public, max-age=300"
        
        return response

# Async Database Connection Pool
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

class DatabaseManager:
    """Optimierte Datenbank-Verbindungsverwaltung"""
    
    def __init__(self, database_url: str):
        self.engine = create_async_engine(
            database_url,
            # Connection Pool Optimierungen
            pool_size=20,
            max_overflow=30,
            pool_pre_ping=True,
            pool_recycle=3600,
            # Query Optimierungen
            echo=False,  # In Produktion deaktivieren
            future=True
        )
        
        self.async_session = sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
    
    async def get_session(self) -> AsyncSession:
        """Optimierte Session-Erstellung"""
        async with self.async_session() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()
```

### API-Endpunkt-Optimierungen

```python
# backend/app/api/optimized_endpoints.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor

router = APIRouter()

# Thread Pool für CPU-intensive Aufgaben
executor = ThreadPoolExecutor(max_workers=4)

@router.get("/workflows/optimized")
@monitor_performance("workflows_list")
async def get_workflows_optimized(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Optimierte Workflow-Liste mit Pagination und Caching"""
    
    # Offset berechnen
    offset = (page - 1) * limit
    
    # Base Query mit optimierten Joins
    query = select(Workflow).options(
        # Eager Loading für verwandte Daten
        selectinload(Workflow.nodes),
        selectinload(Workflow.executions.and_(
            Execution.created_at >= datetime.now() - timedelta(days=30)
        ))
    )
    
    # Search Filter
    if search:
        query = query.where(
            Workflow.name.ilike(f"%{search}%")
        )
    
    # Pagination
    query = query.offset(offset).limit(limit)
    
    # Parallel Queries für bessere Performance
    workflows_task = db.execute(query)
    count_task = db.execute(
        select(func.count(Workflow.id)).where(
            Workflow.name.ilike(f"%{search}%") if search else True
        )
    )
    
    # Await both queries
    workflows_result, count_result = await asyncio.gather(
        workflows_task, count_task
    )
    
    workflows = workflows_result.scalars().all()
    total_count = count_result.scalar()
    
    return {
        "workflows": workflows,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total_count,
            "pages": (total_count + limit - 1) // limit
        }
    }

@router.post("/workflows/{workflow_id}/execute/optimized")
@monitor_performance("workflow_execution")
async def execute_workflow_optimized(
    workflow_id: str,
    execution_data: WorkflowExecutionRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Optimierte Workflow-Ausführung mit Background Tasks"""
    
    # Workflow laden mit minimalen Daten
    workflow = await db.get(Workflow, workflow_id)
    if not workflow:
        raise HTTPException(404, "Workflow not found")
    
    # Execution Record erstellen
    execution = Execution(
        id=str(uuid.uuid4()),
        workflow_id=workflow_id,
        status="queued",
        created_at=datetime.now()
    )
    db.add(execution)
    await db.commit()
    
    # Background Task für Ausführung
    background_tasks.add_task(
        execute_workflow_background,
        execution.id,
        workflow.nodes,
        execution_data.parameters
    )
    
    return {
        "execution_id": execution.id,
        "status": "queued",
        "estimated_duration": estimate_workflow_duration(workflow.nodes)
    }

async def execute_workflow_background(
    execution_id: str,
    nodes: List[dict],
    parameters: dict
):
    """Background Workflow-Ausführung"""
    try:
        # Workflow Engine mit optimierter Ausführung
        engine = WorkflowEngine()
        result = await engine.execute_optimized(nodes, parameters)
        
        # Ergebnis speichern
        async with get_db_session() as db:
            execution = await db.get(Execution, execution_id)
            execution.status = "completed"
            execution.result = result
            execution.completed_at = datetime.now()
            await db.commit()
            
    except Exception as e:
        # Fehler behandeln
        async with get_db_session() as db:
            execution = await db.get(Execution, execution_id)
            execution.status = "failed"
            execution.error = str(e)
            execution.completed_at = datetime.now()
            await db.commit()
```

## Frontend-Optimierung

### React Performance-Optimierungen

```typescript
// src/hooks/useOptimizedWorkflows.ts
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { debounce } from 'lodash';
import { Workflow } from '../types';
import { workflowApi } from '../api';

interface UseOptimizedWorkflowsOptions {
  pageSize?: number;
  searchDebounceMs?: number;
  enableInfiniteScroll?: boolean;
}

export const useOptimizedWorkflows = ({
  pageSize = 20,
  searchDebounceMs = 300,
  enableInfiniteScroll = false
}: UseOptimizedWorkflowsOptions = {}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounced search
  const debouncedSetSearch = useMemo(
    () => debounce((term: string) => {
      setDebouncedSearchTerm(term);
    }, searchDebounceMs),
    [searchDebounceMs]
  );

  useEffect(() => {
    debouncedSetSearch(searchTerm);
    return () => debouncedSetSearch.cancel();
  }, [searchTerm, debouncedSetSearch]);

  // Query configuration
  const queryConfig = {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2
  };

  // Infinite query for large datasets
  const infiniteQuery = useInfiniteQuery({
    queryKey: ['workflows', 'infinite', debouncedSearchTerm],
    queryFn: ({ pageParam = 1 }) => 
      workflowApi.getWorkflows({
        page: pageParam,
        limit: pageSize,
        search: debouncedSearchTerm
      }),
    getNextPageParam: (lastPage, pages) => {
      const hasMore = lastPage.pagination.page < lastPage.pagination.pages;
      return hasMore ? lastPage.pagination.page + 1 : undefined;
    },
    enabled: enableInfiniteScroll,
    ...queryConfig
  });

  // Regular paginated query
  const [currentPage, setCurrentPage] = useState(1);
  const paginatedQuery = useQuery({
    queryKey: ['workflows', 'paginated', currentPage, debouncedSearchTerm],
    queryFn: () => workflowApi.getWorkflows({
      page: currentPage,
      limit: pageSize,
      search: debouncedSearchTerm
    }),
    enabled: !enableInfiniteScroll,
    keepPreviousData: true,
    ...queryConfig
  });

  // Memoized workflows data
  const workflows = useMemo(() => {
    if (enableInfiniteScroll) {
      return infiniteQuery.data?.pages.flatMap(page => page.workflows) || [];
    }
    return paginatedQuery.data?.workflows || [];
  }, [enableInfiniteScroll, infiniteQuery.data, paginatedQuery.data]);

  // Optimized search handler
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    if (!enableInfiniteScroll) {
      setCurrentPage(1); // Reset to first page on search
    }
  }, [enableInfiniteScroll]);

  // Load more for infinite scroll
  const loadMore = useCallback(() => {
    if (infiniteQuery.hasNextPage && !infiniteQuery.isFetchingNextPage) {
      infiniteQuery.fetchNextPage();
    }
  }, [infiniteQuery]);

  return {
    workflows,
    searchTerm,
    setSearchTerm: handleSearch,
    isLoading: enableInfiniteScroll ? infiniteQuery.isLoading : paginatedQuery.isLoading,
    isError: enableInfiniteScroll ? infiniteQuery.isError : paginatedQuery.isError,
    error: enableInfiniteScroll ? infiniteQuery.error : paginatedQuery.error,
    
    // Pagination specific
    currentPage,
    setCurrentPage,
    pagination: paginatedQuery.data?.pagination,
    
    // Infinite scroll specific
    hasNextPage: infiniteQuery.hasNextPage,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    loadMore,
    
    // Refetch
    refetch: enableInfiniteScroll ? infiniteQuery.refetch : paginatedQuery.refetch
  };
};
```

### Component-Optimierungen

```typescript
// src/components/optimized/WorkflowList.tsx
import React, { memo, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { Workflow } from '../../types';
import { WorkflowCard } from './WorkflowCard';

interface WorkflowListProps {
  workflows: Workflow[];
  onWorkflowSelect: (workflow: Workflow) => void;
  onWorkflowExecute: (workflowId: string) => void;
  loading?: boolean;
}

// Memoized row component for virtualization
const WorkflowRow = memo(({ index, style, data }: any) => {
  const { workflows, onWorkflowSelect, onWorkflowExecute } = data;
  const workflow = workflows[index];

  return (
    <div style={style}>
      <WorkflowCard
        workflow={workflow}
        onSelect={() => onWorkflowSelect(workflow)}
        onExecute={() => onWorkflowExecute(workflow.id)}
      />
    </div>
  );
});

WorkflowRow.displayName = 'WorkflowRow';

export const WorkflowList = memo<WorkflowListProps>(({ 
  workflows, 
  onWorkflowSelect, 
  onWorkflowExecute,
  loading = false 
}) => {
  // Memoized item data for react-window
  const itemData = useMemo(() => ({
    workflows,
    onWorkflowSelect,
    onWorkflowExecute
  }), [workflows, onWorkflowSelect, onWorkflowExecute]);

  // Optimized handlers
  const handleWorkflowSelect = useCallback((workflow: Workflow) => {
    onWorkflowSelect(workflow);
  }, [onWorkflowSelect]);

  const handleWorkflowExecute = useCallback((workflowId: string) => {
    onWorkflowExecute(workflowId);
  }, [onWorkflowExecute]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Keine Workflows gefunden</p>
      </div>
    );
  }

  return (
    <div className="h-full">
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            width={width}
            itemCount={workflows.length}
            itemSize={120} // Fixed height per workflow card
            itemData={itemData}
            overscanCount={5} // Render 5 extra items for smooth scrolling
          >
            {WorkflowRow}
          </List>
        )}
      </AutoSizer>
    </div>
  );
});

WorkflowList.displayName = 'WorkflowList';
```

### Bundle-Optimierung

```typescript
// vite.config.ts - Optimierte Vite-Konfiguration
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { splitVendorChunkPlugin } from 'vite';

export default defineConfig({
  plugins: [
    react({
      // React optimizations
      babel: {
        plugins: [
          // Remove console.log in production
          process.env.NODE_ENV === 'production' && 'babel-plugin-transform-remove-console'
        ].filter(Boolean)
      }
    }),
    splitVendorChunkPlugin(),
    // Bundle analyzer
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true
    })
  ],
  
  build: {
    // Optimization settings
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    
    // Chunk splitting strategy
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@headlessui/react', '@heroicons/react'],
          'query-vendor': ['@tanstack/react-query'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers'],
          'chart-vendor': ['recharts'],
          
          // Feature chunks
          'workflow-engine': ['./src/components/workflow'],
          'desktop-integration': ['./src/components/desktop'],
          'ocr-services': ['./src/components/ocr']
        }
      }
    },
    
    // Chunk size warnings
    chunkSizeWarningLimit: 1000
  },
  
  // Development optimizations
  server: {
    hmr: {
      overlay: false // Disable error overlay for better performance
    }
  },
  
  // Resolve optimizations
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  
  // Dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tanstack/react-query',
      'react-hook-form'
    ],
    exclude: [
      // Large dependencies that should be loaded on demand
      'monaco-editor'
    ]
  }
});
```

## Datenbank-Optimierung

### Supabase-Optimierungen

```sql
-- supabase/migrations/performance_optimizations.sql

-- Indizes für häufige Abfragen
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_user_id_status 
ON workflows(user_id, status) 
WHERE status IN ('active', 'draft');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_name_search 
ON workflows USING gin(to_tsvector('english', name));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_executions_workflow_created 
ON executions(workflow_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_executions_status_created 
ON executions(status, created_at DESC) 
WHERE status IN ('running', 'queued');

-- Partitionierung für große Tabellen
CREATE TABLE executions_partitioned (
    LIKE executions INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Monatliche Partitionen
CREATE TABLE executions_2024_01 PARTITION OF executions_partitioned
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE executions_2024_02 PARTITION OF executions_partitioned
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Automatische Partitionierung (PostgreSQL 13+)
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
    start_date date;
    end_date date;
    partition_name text;
BEGIN
    start_date := date_trunc('month', CURRENT_DATE + interval '1 month');
    end_date := start_date + interval '1 month';
    partition_name := 'executions_' || to_char(start_date, 'YYYY_MM');
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF executions_partitioned
                    FOR VALUES FROM (%L) TO (%L)',
                   partition_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;

-- Materialized Views für Reporting
CREATE MATERIALIZED VIEW workflow_statistics AS
SELECT 
    w.id,
    w.name,
    w.user_id,
    COUNT(e.id) as total_executions,
    COUNT(CASE WHEN e.status = 'completed' THEN 1 END) as successful_executions,
    COUNT(CASE WHEN e.status = 'failed' THEN 1 END) as failed_executions,
    AVG(CASE WHEN e.status = 'completed' THEN 
        EXTRACT(EPOCH FROM (e.completed_at - e.created_at)) 
    END) as avg_duration_seconds,
    MAX(e.created_at) as last_execution,
    (COUNT(CASE WHEN e.status = 'completed' THEN 1 END)::float / 
     NULLIF(COUNT(e.id), 0) * 100) as success_rate
FROM workflows w
LEFT JOIN executions e ON w.id = e.workflow_id
WHERE e.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY w.id, w.name, w.user_id;

-- Index für Materialized View
CREATE UNIQUE INDEX ON workflow_statistics (id);
CREATE INDEX ON workflow_statistics (user_id, success_rate DESC);

-- Automatische Aktualisierung der Materialized View
CREATE OR REPLACE FUNCTION refresh_workflow_statistics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY workflow_statistics;
END;
$$ LANGUAGE plpgsql;

-- Trigger für automatische Aktualisierung
CREATE OR REPLACE FUNCTION trigger_refresh_statistics()
RETURNS trigger AS $$
BEGIN
    -- Asynchrone Aktualisierung nach Execution-Änderungen
    PERFORM pg_notify('refresh_stats', '');
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER execution_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON executions
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_statistics();

-- Query-Optimierung für häufige Abfragen
CREATE OR REPLACE FUNCTION get_user_workflows_optimized(
    p_user_id uuid,
    p_limit int DEFAULT 20,
    p_offset int DEFAULT 0,
    p_search text DEFAULT NULL
)
RETURNS TABLE(
    workflow_id uuid,
    workflow_name text,
    workflow_status text,
    total_executions bigint,
    success_rate numeric,
    last_execution timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id,
        w.name,
        w.status,
        COALESCE(ws.total_executions, 0),
        COALESCE(ws.success_rate, 0),
        ws.last_execution
    FROM workflows w
    LEFT JOIN workflow_statistics ws ON w.id = ws.id
    WHERE w.user_id = p_user_id
    AND (p_search IS NULL OR w.name ILIKE '%' || p_search || '%')
    ORDER BY ws.last_execution DESC NULLS LAST, w.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Connection Pooling Konfiguration
-- In der Supabase-Konfiguration:
-- max_connections = 100
-- shared_preload_libraries = 'pg_stat_statements'
-- track_activity_query_size = 2048
-- log_min_duration_statement = 1000

-- Vacuum und Analyze Automatisierung
CREATE OR REPLACE FUNCTION maintenance_cleanup()
RETURNS void AS $$
BEGIN
    -- Alte Execution-Logs bereinigen (älter als 90 Tage)
    DELETE FROM executions 
    WHERE created_at < CURRENT_DATE - INTERVAL '90 days'
    AND status IN ('completed', 'failed');
    
    -- Alte Screenshots bereinigen
    DELETE FROM files 
    WHERE created_at < CURRENT_DATE - INTERVAL '30 days'
    AND file_type = 'screenshot';
    
    -- Statistiken aktualisieren
    ANALYZE workflows;
    ANALYZE executions;
    
    -- Materialized View aktualisieren
    REFRESH MATERIALIZED VIEW CONCURRENTLY workflow_statistics;
END;
$$ LANGUAGE plpgsql;
```

### Connection Pool Management

```python
# backend/app/core/database_pool.py
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
import logging
from typing import AsyncGenerator

class OptimizedDatabaseManager:
    """Optimierte Datenbank-Verbindungsverwaltung"""
    
    def __init__(self, database_url: str, **kwargs):
        self.logger = logging.getLogger(__name__)
        
        # Optimierte Engine-Konfiguration
        self.engine = create_async_engine(
            database_url,
            
            # Connection Pool Optimierungen
            poolclass=QueuePool,
            pool_size=20,  # Basis-Pool-Größe
            max_overflow=30,  # Zusätzliche Verbindungen bei Bedarf
            pool_pre_ping=True,  # Verbindungen vor Nutzung testen
            pool_recycle=3600,  # Verbindungen nach 1h recyceln
            pool_timeout=30,  # Timeout für Pool-Verbindungen
            
            # Query Optimierungen
            echo=False,  # SQL-Logging in Produktion deaktivieren
            future=True,
            
            # Connection-spezifische Optimierungen
            connect_args={
                "server_settings": {
                    "application_name": "trusted_login_system",
                    "jit": "off",  # JIT für bessere Performance deaktivieren
                }
            },
            
            **kwargs
        )
        
        # Session Factory
        self.async_session = sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False  # Manuelles Flushing für bessere Kontrolle
        )
        
        # Connection Pool Monitoring
        self._pool_stats = {
            'total_connections': 0,
            'active_connections': 0,
            'idle_connections': 0
        }
    
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Optimierte Session mit automatischem Cleanup"""
        async with self.async_session() as session:
            try:
                # Session-spezifische Optimierungen
                await session.execute(text("SET LOCAL work_mem = '256MB'"))
                await session.execute(text("SET LOCAL random_page_cost = 1.1"))
                
                yield session
                
                # Explizites Commit nur bei Änderungen
                if session.dirty or session.new or session.deleted:
                    await session.commit()
                    
            except Exception as e:
                await session.rollback()
                self.logger.error(f"Database session error: {e}")
                raise
            finally:
                await session.close()
    
    async def execute_batch(self, statements: list, batch_size: int = 1000):
        """Batch-Ausführung für bessere Performance"""
        async with self.get_session() as session:
            for i in range(0, len(statements), batch_size):
                batch = statements[i:i + batch_size]
                
                for stmt in batch:
                    session.add(stmt)
                
                # Batch-Commit
                await session.flush()
                
                # Memory-Management
                if i % (batch_size * 10) == 0:
                    await session.commit()
                    session.expunge_all()
    
    async def get_pool_stats(self) -> dict:
        """Connection Pool Statistiken"""
        pool = self.engine.pool
        
        return {
            'pool_size': pool.size(),
            'checked_in': pool.checkedin(),
            'checked_out': pool.checkedout(),
            'overflow': pool.overflow(),
            'invalid': pool.invalid()
        }
    
    async def health_check(self) -> bool:
        """Datenbank-Gesundheitscheck"""
        try:
            async with self.get_session() as session:
                result = await session.execute(text("SELECT 1"))
                return result.scalar() == 1
        except Exception as e:
            self.logger.error(f"Database health check failed: {e}")
            return False
    
    async def close(self):
        """Sauberes Schließen aller Verbindungen"""
        await self.engine.dispose()
```

## Workflow-Engine-Optimierung

### Optimierte Workflow-Ausführung

```python
# backend/app/services/optimized_workflow_engine.py
import asyncio
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import time
import logging
from queue import PriorityQueue
import threading

@dataclass
class WorkflowNode:
    """Optimierte Workflow-Node Darstellung"""
    id: str
    type: str
    config: Dict[str, Any]
    dependencies: List[str] = None
    priority: int = 0
    estimated_duration: float = 1.0
    max_retries: int = 3
    timeout: float = 30.0

@dataclass
class ExecutionContext:
    """Ausführungskontext für Performance-Tracking"""
    execution_id: str
    workflow_id: str
    start_time: float
    variables: Dict[str, Any]
    metrics: Dict[str, float]
    thread_pool: ThreadPoolExecutor
    process_pool: ProcessPoolExecutor

class OptimizedWorkflowEngine:
    """Hochperformante Workflow-Engine"""
    
    def __init__(self, max_workers: int = 4, max_processes: int = 2):
        self.logger = logging.getLogger(__name__)
        
        # Thread Pools für verschiedene Aufgaben
        self.io_pool = ThreadPoolExecutor(
            max_workers=max_workers,
            thread_name_prefix="workflow_io"
        )
        self.cpu_pool = ProcessPoolExecutor(
            max_workers=max_processes
        )
        
        # Execution Queue mit Prioritäten
        self.execution_queue = PriorityQueue()
        self.active_executions: Dict[str, ExecutionContext] = {}
        
        # Performance Caches
        self.node_cache: Dict[str, Any] = {}
        self.execution_cache: Dict[str, Any] = {}
        
        # Metrics
        self.performance_metrics = {
            'total_executions': 0,
            'successful_executions': 0,
            'failed_executions': 0,
            'average_duration': 0.0,
            'cache_hits': 0,
            'cache_misses': 0
        }
        
        # Worker für Queue-Verarbeitung
        self._start_workers()
    
    def _start_workers(self):
        """Background Workers für Queue-Verarbeitung starten"""
        for i in range(2):  # 2 Worker Threads
            worker = threading.Thread(
                target=self._worker_loop,
                name=f"workflow_worker_{i}",
                daemon=True
            )
            worker.start()
    
    def _worker_loop(self):
        """Worker Loop für kontinuierliche Queue-Verarbeitung"""
        while True:
            try:
                # Nächste Ausführung aus Queue holen
                priority, execution_id, nodes, context = self.execution_queue.get(
                    timeout=1.0
                )
                
                # Ausführung starten
                asyncio.run(self._execute_workflow_internal(
                    execution_id, nodes, context
                ))
                
                self.execution_queue.task_done()
                
            except Exception as e:
                self.logger.error(f"Worker error: {e}")
                time.sleep(0.1)
    
    async def execute_workflow_async(
        self,
        execution_id: str,
        workflow_id: str,
        nodes: List[WorkflowNode],
        variables: Dict[str, Any] = None,
        priority: int = 0
    ) -> Dict[str, Any]:
        """Asynchrone Workflow-Ausführung mit Prioritäten"""
        
        # Execution Context erstellen
        context = ExecutionContext(
            execution_id=execution_id,
            workflow_id=workflow_id,
            start_time=time.time(),
            variables=variables or {},
            metrics={},
            thread_pool=self.io_pool,
            process_pool=self.cpu_pool
        )
        
        # In Queue einreihen
        self.execution_queue.put((
            -priority,  # Negative für höchste Priorität zuerst
            execution_id,
            nodes,
            context
        ))
        
        # Tracking
        self.active_executions[execution_id] = context
        
        return {
            "execution_id": execution_id,
            "status": "queued",
            "queue_position": self.execution_queue.qsize()
        }
    
    async def _execute_workflow_internal(
        self,
        execution_id: str,
        nodes: List[WorkflowNode],
        context: ExecutionContext
    ) -> Dict[str, Any]:
        """Interne optimierte Workflow-Ausführung"""
        
        try:
            # Dependency Graph erstellen
            dependency_graph = self._build_dependency_graph(nodes)
            
            # Parallel ausführbare Nodes identifizieren
            execution_plan = self._create_execution_plan(dependency_graph)
            
            # Ausführung in Batches
            results = {}
            for batch in execution_plan:
                batch_results = await self._execute_batch(
                    batch, context, results
                )
                results.update(batch_results)
            
            # Metriken aktualisieren
            duration = time.time() - context.start_time
            self._update_metrics(execution_id, duration, True)
            
            return {
                "status": "completed",
                "duration": duration,
                "results": results,
                "metrics": context.metrics
            }
            
        except Exception as e:
            duration = time.time() - context.start_time
            self._update_metrics(execution_id, duration, False)
            
            self.logger.error(f"Workflow execution failed: {e}")
            return {
                "status": "failed",
                "error": str(e),
                "duration": duration
            }
        
        finally:
            # Cleanup
            if execution_id in self.active_executions:
                del self.active_executions[execution_id]
    
    def _build_dependency_graph(self, nodes: List[WorkflowNode]) -> Dict[str, List[str]]:
        """Dependency Graph für optimale Ausführungsreihenfolge"""
        graph = {node.id: node.dependencies or [] for node in nodes}
        return graph
    
    def _create_execution_plan(self, dependency_graph: Dict[str, List[str]]) -> List[List[str]]:
        """Execution Plan mit parallelen Batches erstellen"""
        plan = []
        remaining_nodes = set(dependency_graph.keys())
        completed_nodes = set()
        
        while remaining_nodes:
            # Nodes ohne unerfüllte Dependencies finden
            ready_nodes = [
                node for node in remaining_nodes
                if all(dep in completed_nodes for dep in dependency_graph[node])
            ]
            
            if not ready_nodes:
                raise ValueError("Circular dependency detected")
            
            plan.append(ready_nodes)
            completed_nodes.update(ready_nodes)
            remaining_nodes -= set(ready_nodes)
        
        return plan
    
    async def _execute_batch(
        self,
        node_ids: List[str],
        context: ExecutionContext,
        previous_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Batch von Nodes parallel ausführen"""
        
        # Tasks für parallele Ausführung erstellen
        tasks = []
        for node_id in node_ids:
            task = asyncio.create_task(
                self._execute_node(node_id, context, previous_results)
            )
            tasks.append((node_id, task))
        
        # Parallel ausführen
        results = {}
        for node_id, task in tasks:
            try:
                result = await task
                results[node_id] = result
            except Exception as e:
                self.logger.error(f"Node {node_id} failed: {e}")
                results[node_id] = {"error": str(e)}
        
        return results
    
    async def _execute_node(
        self,
        node_id: str,
        context: ExecutionContext,
        previous_results: Dict[str, Any]
    ) -> Any:
        """Einzelne Node mit Caching und Optimierungen ausführen"""
        
        start_time = time.time()
        
        # Cache-Check
        cache_key = self._generate_cache_key(node_id, context.variables)
        if cache_key in self.node_cache:
            self.performance_metrics['cache_hits'] += 1
            return self.node_cache[cache_key]
        
        self.performance_metrics['cache_misses'] += 1
        
        try:
            # Node-spezifische Ausführung
            if node_id.startswith('desktop_'):
                result = await self._execute_desktop_node(
                    node_id, context, previous_results
                )
            elif node_id.startswith('ocr_'):
                result = await self._execute_ocr_node(
                    node_id, context, previous_results
                )
            else:
                result = await self._execute_generic_node(
                    node_id, context, previous_results
                )
            
            # Caching für wiederverwendbare Ergebnisse
            if self._is_cacheable(node_id):
                self.node_cache[cache_key] = result
            
            # Metriken
            duration = time.time() - start_time
            context.metrics[f"{node_id}_duration"] = duration
            
            return result
            
        except Exception as e:
            duration = time.time() - start_time
            context.metrics[f"{node_id}_error"] = str(e)
            context.metrics[f"{node_id}_duration"] = duration
            raise
    
    async def _execute_desktop_node(
        self,
        node_id: str,
        context: ExecutionContext,
        previous_results: Dict[str, Any]
    ) -> Any:
        """Desktop-Node mit Thread Pool ausführen"""
        
        loop = asyncio.get_event_loop()
        
        # CPU-intensive Aufgaben in Thread Pool
        result = await loop.run_in_executor(
            context.thread_pool,
            self._desktop_action,
            node_id,
            context.variables
        )
        
        return result
    
    async def _execute_ocr_node(
        self,
        node_id: str,
        context: ExecutionContext,
        previous_results: Dict[str, Any]
    ) -> Any:
        """OCR-Node mit Process Pool ausführen"""
        
        loop = asyncio.get_event_loop()
        
        # CPU-intensive OCR in Process Pool
        result = await loop.run_in_executor(
            context.process_pool,
            self._ocr_processing,
            node_id,
            context.variables
        )
        
        return result
    
    def _generate_cache_key(self, node_id: str, variables: Dict[str, Any]) -> str:
        """Cache-Key für Node-Ergebnisse generieren"""
        import hashlib
        import json
        
        # Relevante Variablen für Caching
        cache_vars = {k: v for k, v in variables.items() if k.startswith('cache_')}
        
        key_data = f"{node_id}:{json.dumps(cache_vars, sort_keys=True)}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def _is_cacheable(self, node_id: str) -> bool:
        """Prüfen ob Node-Ergebnis cacheable ist"""
        # OCR-Ergebnisse sind cacheable, Desktop-Aktionen nicht
        return node_id.startswith('ocr_') or node_id.startswith('file_')
    
    def _update_metrics(self, execution_id: str, duration: float, success: bool):
        """Performance-Metriken aktualisieren"""
        self.performance_metrics['total_executions'] += 1
        
        if success:
            self.performance_metrics['successful_executions'] += 1
        else:
            self.performance_metrics['failed_executions'] += 1
        
        # Rolling Average für Duration
        total = self.performance_metrics['total_executions']
        current_avg = self.performance_metrics['average_duration']
        self.performance_metrics['average_duration'] = (
            (current_avg * (total - 1) + duration) / total
        )
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Performance-Statistiken abrufen"""
        return {
            **self.performance_metrics,
            'active_executions': len(self.active_executions),
            'queue_size': self.execution_queue.qsize(),
            'cache_size': len(self.node_cache),
            'cache_hit_rate': (
                self.performance_metrics['cache_hits'] / 
                max(1, self.performance_metrics['cache_hits'] + 
                    self.performance_metrics['cache_misses'])
            ) * 100
        }
    
    async def cleanup(self):
        """Ressourcen bereinigen"""
        self.io_pool.shutdown(wait=True)
        self.cpu_pool.shutdown(wait=True)
        self.node_cache.clear()
        self.execution_cache.clear()
```

## Desktop-Integration-Optimierung

### Optimierte Screenshot-Erfassung

```python
# backend/app/services/optimized_desktop_service.py
import asyncio
import time
from typing import Optional, Tuple, Dict, Any
from PIL import Image, ImageGrab
import io
import threading
from concurrent.futures import ThreadPoolExecutor
import logging
from dataclasses import dataclass

@dataclass
class ScreenshotConfig:
    """Screenshot-Konfiguration für Optimierung"""
    quality: int = 80
    format: str = 'PNG'
    region: Optional[Tuple[int, int, int, int]] = None
    scale_factor: float = 1.0
    compression_level: int = 6
    optimize: bool = True

class OptimizedDesktopService:
    """Optimierte Desktop-Integration"""
    
    def __init__(self, max_workers: int = 4):
        self.logger = logging.getLogger(__name__)
        self.thread_pool = ThreadPoolExecutor(
            max_workers=max_workers,
            thread_name_prefix="desktop_service"
        )
        
        # Screenshot Cache für bessere Performance
        self.screenshot_cache: Dict[str, bytes] = {}
        self.cache_timestamps: Dict[str, float] = {}
        self.cache_ttl = 5.0  # 5 Sekunden Cache
        
        # Performance Metriken
        self.metrics = {
            'screenshots_taken': 0,
            'cache_hits': 0,
            'average_capture_time': 0.0,
            'total_capture_time': 0.0
        }
        
        # Optimierte PIL-Einstellungen
        Image.MAX_IMAGE_PIXELS = None  # Keine Pixel-Limits
        
    async def capture_screenshot_optimized(
        self,
        config: ScreenshotConfig = None
    ) -> bytes:
        """Optimierte Screenshot-Erfassung"""
        
        if config is None:
            config = ScreenshotConfig()
        
        # Cache-Key generieren
        cache_key = self._generate_screenshot_cache_key(config)
        
        # Cache-Check
        if self._is_cache_valid(cache_key):
            self.metrics['cache_hits'] += 1
            return self.screenshot_cache[cache_key]
        
        start_time = time.time()
        
        try:
            # Screenshot in Thread Pool erfassen
            loop = asyncio.get_event_loop()
            screenshot_data = await loop.run_in_executor(
                self.thread_pool,
                self._capture_screenshot_sync,
                config
            )
            
            # Cache aktualisieren
            self.screenshot_cache[cache_key] = screenshot_data
            self.cache_timestamps[cache_key] = time.time()
            
            # Metriken aktualisieren
            capture_time = time.time() - start_time
            self._update_capture_metrics(capture_time)
            
            return screenshot_data
            
        except Exception as e:
            self.logger.error(f"Screenshot capture failed: {e}")
            raise
    
    def _capture_screenshot_sync(self, config: ScreenshotConfig) -> bytes:
        """Synchrone Screenshot-Erfassung mit Optimierungen"""
        try:
            # Screenshot erfassen
            if config.region:
                screenshot = ImageGrab.grab(bbox=config.region)
            else:
                screenshot = ImageGrab.grab()
            
            # Skalierung anwenden
            if config.scale_factor != 1.0:
                new_size = (
                    int(screenshot.width * config.scale_factor),
                    int(screenshot.height * config.scale_factor)
                )
                screenshot = screenshot.resize(new_size, Image.Resampling.LANCZOS)
            
            # Optimierte Kompression
            buffer = io.BytesIO()
            
            if config.format.upper() == 'JPEG':
                # JPEG-Optimierung
                screenshot = screenshot.convert('RGB')
                screenshot.save(
                    buffer,
                    format='JPEG',
                    quality=config.quality,
                    optimize=config.optimize
                )
            else:
                # PNG-Optimierung
                screenshot.save(
                    buffer,
                    format='PNG',
                    compress_level=config.compression_level,
                    optimize=config.optimize
                )
            
            return buffer.getvalue()
            
        except Exception as e:
            self.logger.error(f"Sync screenshot capture failed: {e}")
            raise
    
    def _generate_screenshot_cache_key(self, config: ScreenshotConfig) -> str:
        """Cache-Key für Screenshot generieren"""
        import hashlib
        
        key_data = f"{config.region}:{config.scale_factor}:{config.quality}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """Cache-Gültigkeit prüfen"""
        if cache_key not in self.cache_timestamps:
            return False
        
        age = time.time() - self.cache_timestamps[cache_key]
        return age < self.cache_ttl
    
    def _update_capture_metrics(self, capture_time: float):
        """Capture-Metriken aktualisieren"""
        self.metrics['screenshots_taken'] += 1
        self.metrics['total_capture_time'] += capture_time
        
        # Rolling Average
        count = self.metrics['screenshots_taken']
        self.metrics['average_capture_time'] = (
            self.metrics['total_capture_time'] / count
        )
    
    async def batch_screenshots(
        self,
        configs: list[ScreenshotConfig],
        max_concurrent: int = 3
    ) -> list[bytes]:
        """Batch-Screenshot-Erfassung für bessere Performance"""
        
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def capture_with_semaphore(config):
            async with semaphore:
                return await self.capture_screenshot_optimized(config)
        
        tasks = [capture_with_semaphore(config) for config in configs]
        return await asyncio.gather(*tasks)
    
    def cleanup_cache(self):
        """Veraltete Cache-Einträge bereinigen"""
        current_time = time.time()
        expired_keys = [
            key for key, timestamp in self.cache_timestamps.items()
            if current_time - timestamp > self.cache_ttl
        ]
        
        for key in expired_keys:
            self.screenshot_cache.pop(key, None)
            self.cache_timestamps.pop(key, None)
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Performance-Statistiken abrufen"""
        return {
            **self.metrics,
            'cache_size': len(self.screenshot_cache),
            'cache_hit_rate': (
                self.metrics['cache_hits'] / 
                max(1, self.metrics['screenshots_taken'])
            ) * 100
        }
```

## OCR-Service-Optimierung

### Optimierte Texterkennung

```python
# backend/app/services/optimized_ocr_service.py
import asyncio
import time
from typing import Dict, List, Optional, Tuple
from PIL import Image
import io
import logging
from concurrent.futures import ProcessPoolExecutor
from dataclasses import dataclass
import hashlib

@dataclass
class OCRConfig:
    """OCR-Konfiguration für Optimierung"""
    language: str = 'deu+eng'
    psm: int = 6  # Page Segmentation Mode
    oem: int = 3  # OCR Engine Mode
    dpi: int = 300
    preprocessing: bool = True
    confidence_threshold: float = 60.0

class OptimizedOCRService:
    """Optimierte OCR-Service"""
    
    def __init__(self, max_workers: int = 2):
        self.logger = logging.getLogger(__name__)
        self.process_pool = ProcessPoolExecutor(
            max_workers=max_workers
        )
        
        # OCR-Cache für bessere Performance
        self.ocr_cache: Dict[str, Dict] = {}
        self.cache_timestamps: Dict[str, float] = {}
        self.cache_ttl = 300.0  # 5 Minuten Cache
        
        # Performance Metriken
        self.metrics = {
            'ocr_requests': 0,
            'cache_hits': 0,
            'average_processing_time': 0.0,
            'total_processing_time': 0.0,
            'characters_processed': 0
        }
    
    async def extract_text_optimized(
        self,
        image_data: bytes,
        config: OCRConfig = None
    ) -> Dict[str, any]:
        """Optimierte Texterkennung"""
        
        if config is None:
            config = OCRConfig()
        
        # Cache-Key generieren
        cache_key = self._generate_ocr_cache_key(image_data, config)
        
        # Cache-Check
        if self._is_cache_valid(cache_key):
            self.metrics['cache_hits'] += 1
            return self.ocr_cache[cache_key]
        
        start_time = time.time()
        
        try:
            # OCR in Process Pool ausführen
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                self.process_pool,
                self._process_ocr_sync,
                image_data,
                config
            )
            
            # Cache aktualisieren
            self.ocr_cache[cache_key] = result
            self.cache_timestamps[cache_key] = time.time()
            
            # Metriken aktualisieren
            processing_time = time.time() - start_time
            self._update_ocr_metrics(processing_time, len(result.get('text', '')))
            
            return result
            
        except Exception as e:
            self.logger.error(f"OCR processing failed: {e}")
            raise
    
    def _process_ocr_sync(self, image_data: bytes, config: OCRConfig) -> Dict:
        """Synchrone OCR-Verarbeitung mit Optimierungen"""
        try:
            import pytesseract
            from PIL import ImageEnhance, ImageFilter
            
            # Bild laden
            image = Image.open(io.BytesIO(image_data))
            
            # Preprocessing für bessere Erkennung
            if config.preprocessing:
                image = self._preprocess_image(image, config)
            
            # OCR-Konfiguration
            custom_config = (
                f'--oem {config.oem} --psm {config.psm} '
                f'-l {config.language} --dpi {config.dpi}'
            )
            
            # Text extrahieren
            text = pytesseract.image_to_string(
                image,
                config=custom_config
            )
            
            # Detaillierte Daten extrahieren
            data = pytesseract.image_to_data(
                image,
                config=custom_config,
                output_type=pytesseract.Output.DICT
            )
            
            # Konfidenz-Filtering
            filtered_text = self._filter_by_confidence(data, config.confidence_threshold)
            
            return {
                'text': text.strip(),
                'filtered_text': filtered_text,
                'confidence': self._calculate_average_confidence(data),
                'word_count': len(text.split()),
                'character_count': len(text),
                'bounding_boxes': self._extract_bounding_boxes(data)
            }
            
        except Exception as e:
            self.logger.error(f"Sync OCR processing failed: {e}")
            raise
    
    def _preprocess_image(self, image: Image.Image, config: OCRConfig) -> Image.Image:
        """Bild-Preprocessing für bessere OCR-Ergebnisse"""
        try:
            # Graustufen-Konvertierung
            if image.mode != 'L':
                image = image.convert('L')
            
            # Kontrast erhöhen
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.5)
            
            # Schärfe erhöhen
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(1.2)
            
            # Rauschen reduzieren
            image = image.filter(ImageFilter.MedianFilter(size=3))
            
            # DPI anpassen
            if config.dpi != 300:
                # Skalierung basierend auf DPI
                scale_factor = config.dpi / 300
                new_size = (
                    int(image.width * scale_factor),
                    int(image.height * scale_factor)
                )
                image = image.resize(new_size, Image.Resampling.LANCZOS)
            
            return image
            
        except Exception as e:
            self.logger.warning(f"Image preprocessing failed: {e}")
            return image
    
    def _filter_by_confidence(
        self,
        data: Dict,
        threshold: float
    ) -> str:
        """Text nach Konfidenz filtern"""
        filtered_words = []
        
        for i, conf in enumerate(data['conf']):
            if int(conf) >= threshold:
                word = data['text'][i].strip()
                if word:
                    filtered_words.append(word)
        
        return ' '.join(filtered_words)
    
    def _calculate_average_confidence(self, data: Dict) -> float:
        """Durchschnittliche Konfidenz berechnen"""
        confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
        return sum(confidences) / len(confidences) if confidences else 0.0
    
    def _extract_bounding_boxes(self, data: Dict) -> List[Dict]:
        """Bounding Boxes für erkannten Text extrahieren"""
        boxes = []
        
        for i in range(len(data['text'])):
            if data['text'][i].strip():
                boxes.append({
                    'text': data['text'][i],
                    'confidence': int(data['conf'][i]),
                    'x': data['left'][i],
                    'y': data['top'][i],
                    'width': data['width'][i],
                    'height': data['height'][i]
                })
        
        return boxes
    
    def _generate_ocr_cache_key(self, image_data: bytes, config: OCRConfig) -> str:
        """Cache-Key für OCR-Ergebnis generieren"""
        # Hash von Bilddaten und Konfiguration
        image_hash = hashlib.md5(image_data).hexdigest()
        config_hash = hashlib.md5(
            f"{config.language}:{config.psm}:{config.oem}:{config.dpi}".encode()
        ).hexdigest()
        
        return f"{image_hash}:{config_hash}"
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """Cache-Gültigkeit prüfen"""
        if cache_key not in self.cache_timestamps:
            return False
        
        age = time.time() - self.cache_timestamps[cache_key]
        return age < self.cache_ttl
    
    def _update_ocr_metrics(self, processing_time: float, character_count: int):
        """OCR-Metriken aktualisieren"""
        self.metrics['ocr_requests'] += 1
        self.metrics['total_processing_time'] += processing_time
        self.metrics['characters_processed'] += character_count
        
        # Rolling Average
        count = self.metrics['ocr_requests']
        self.metrics['average_processing_time'] = (
            self.metrics['total_processing_time'] / count
        )
    
    async def batch_ocr(
        self,
        image_data_list: List[bytes],
        config: OCRConfig = None,
        max_concurrent: int = 2
    ) -> List[Dict]:
        """Batch-OCR für bessere Performance"""
        
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def process_with_semaphore(image_data):
            async with semaphore:
                return await self.extract_text_optimized(image_data, config)
        
        tasks = [process_with_semaphore(data) for data in image_data_list]
        return await asyncio.gather(*tasks)
    
    def cleanup_cache(self):
        """Veraltete Cache-Einträge bereinigen"""
        current_time = time.time()
        expired_keys = [
            key for key, timestamp in self.cache_timestamps.items()
            if current_time - timestamp > self.cache_ttl
        ]
        
        for key in expired_keys:
            self.ocr_cache.pop(key, None)
            self.cache_timestamps.pop(key, None)
    
    def get_performance_stats(self) -> Dict[str, any]:
        """Performance-Statistiken abrufen"""
        return {
            **self.metrics,
            'cache_size': len(self.ocr_cache),
            'cache_hit_rate': (
                self.metrics['cache_hits'] / 
                max(1, self.metrics['ocr_requests'])
            ) * 100,
            'characters_per_second': (
                self.metrics['characters_processed'] / 
                max(1, self.metrics['total_processing_time'])
            )
        }
    
    async def cleanup(self):
        """Ressourcen bereinigen"""
        self.process_pool.shutdown(wait=True)
         self.ocr_cache.clear()
         self.cache_timestamps.clear()
```

## Monitoring & Alerting

### Performance Monitoring Service

```python
# backend/app/services/performance_monitoring.py
import asyncio
import time
import psutil
import logging
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import json

@dataclass
class PerformanceMetrics:
    """Performance-Metriken Datenstruktur"""
    timestamp: datetime
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    network_io: Dict[str, int]
    response_times: Dict[str, float]
    active_connections: int
    queue_sizes: Dict[str, int]
    error_rates: Dict[str, float]

class PerformanceMonitoringService:
    """Service für kontinuierliches Performance-Monitoring"""
    
    def __init__(self, alert_thresholds: Dict[str, float] = None):
        self.logger = logging.getLogger(__name__)
        
        # Standard-Schwellenwerte für Alerts
        self.alert_thresholds = alert_thresholds or {
            'cpu_usage': 80.0,
            'memory_usage': 85.0,
            'disk_usage': 90.0,
            'response_time': 2000.0,  # ms
            'error_rate': 5.0  # %
        }
        
        # Metriken-Speicher
        self.metrics_history: List[PerformanceMetrics] = []
        self.max_history_size = 1000
        
        # Alert-Status
        self.active_alerts: Dict[str, datetime] = {}
        self.alert_cooldown = timedelta(minutes=5)
        
        # Monitoring-Status
        self.is_monitoring = False
        self.monitoring_interval = 30  # Sekunden
    
    async def start_monitoring(self):
        """Performance-Monitoring starten"""
        if self.is_monitoring:
            return
        
        self.is_monitoring = True
        self.logger.info("Performance monitoring started")
        
        while self.is_monitoring:
            try:
                metrics = await self.collect_metrics()
                self.store_metrics(metrics)
                await self.check_alerts(metrics)
                
                await asyncio.sleep(self.monitoring_interval)
                
            except Exception as e:
                self.logger.error(f"Monitoring error: {e}")
                await asyncio.sleep(self.monitoring_interval)
    
    async def stop_monitoring(self):
        """Performance-Monitoring stoppen"""
        self.is_monitoring = False
        self.logger.info("Performance monitoring stopped")
    
    async def collect_metrics(self) -> PerformanceMetrics:
        """Aktuelle Performance-Metriken sammeln"""
        try:
            # System-Metriken
            cpu_usage = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            network = psutil.net_io_counters()
            
            # Netzwerk-IO
            network_io = {
                'bytes_sent': network.bytes_sent,
                'bytes_recv': network.bytes_recv,
                'packets_sent': network.packets_sent,
                'packets_recv': network.packets_recv
            }
            
            # Response Times (aus Application Metrics)
            response_times = await self.get_response_times()
            
            # Aktive Verbindungen
            active_connections = len(psutil.net_connections())
            
            # Queue-Größen (aus Application State)
            queue_sizes = await self.get_queue_sizes()
            
            # Error Rates
            error_rates = await self.get_error_rates()
            
            return PerformanceMetrics(
                timestamp=datetime.now(),
                cpu_usage=cpu_usage,
                memory_usage=memory.percent,
                disk_usage=disk.percent,
                network_io=network_io,
                response_times=response_times,
                active_connections=active_connections,
                queue_sizes=queue_sizes,
                error_rates=error_rates
            )
            
        except Exception as e:
            self.logger.error(f"Failed to collect metrics: {e}")
            raise
    
    async def get_response_times(self) -> Dict[str, float]:
        """Response Times von verschiedenen Endpunkten abrufen"""
        # Hier würden normalerweise die Response Times
        # aus dem Application Monitoring abgerufen
        return {
            'api_workflows': 150.0,
            'api_auth': 80.0,
            'api_desktop': 200.0,
            'api_ocr': 500.0
        }
    
    async def get_queue_sizes(self) -> Dict[str, int]:
        """Queue-Größen von verschiedenen Services abrufen"""
        return {
            'workflow_queue': 5,
            'screenshot_queue': 2,
            'ocr_queue': 3
        }
    
    async def get_error_rates(self) -> Dict[str, float]:
        """Error Rates von verschiedenen Services abrufen"""
        return {
            'api_errors': 1.2,
            'workflow_errors': 0.8,
            'desktop_errors': 2.1
        }
    
    def store_metrics(self, metrics: PerformanceMetrics):
        """Metriken im Verlauf speichern"""
        self.metrics_history.append(metrics)
        
        # History-Größe begrenzen
        if len(self.metrics_history) > self.max_history_size:
            self.metrics_history = self.metrics_history[-self.max_history_size:]
    
    async def check_alerts(self, metrics: PerformanceMetrics):
        """Alert-Schwellenwerte prüfen"""
        alerts_to_send = []
        
        # CPU-Usage prüfen
        if metrics.cpu_usage > self.alert_thresholds['cpu_usage']:
            alerts_to_send.append({
                'type': 'cpu_usage',
                'value': metrics.cpu_usage,
                'threshold': self.alert_thresholds['cpu_usage'],
                'message': f'High CPU usage: {metrics.cpu_usage:.1f}%'
            })
        
        # Memory-Usage prüfen
        if metrics.memory_usage > self.alert_thresholds['memory_usage']:
            alerts_to_send.append({
                'type': 'memory_usage',
                'value': metrics.memory_usage,
                'threshold': self.alert_thresholds['memory_usage'],
                'message': f'High memory usage: {metrics.memory_usage:.1f}%'
            })
        
        # Disk-Usage prüfen
        if metrics.disk_usage > self.alert_thresholds['disk_usage']:
            alerts_to_send.append({
                'type': 'disk_usage',
                'value': metrics.disk_usage,
                'threshold': self.alert_thresholds['disk_usage'],
                'message': f'High disk usage: {metrics.disk_usage:.1f}%'
            })
        
        # Response Times prüfen
        for endpoint, response_time in metrics.response_times.items():
            if response_time > self.alert_thresholds['response_time']:
                alerts_to_send.append({
                    'type': 'response_time',
                    'endpoint': endpoint,
                    'value': response_time,
                    'threshold': self.alert_thresholds['response_time'],
                    'message': f'Slow response time for {endpoint}: {response_time:.1f}ms'
                })
        
        # Error Rates prüfen
        for service, error_rate in metrics.error_rates.items():
            if error_rate > self.alert_thresholds['error_rate']:
                alerts_to_send.append({
                    'type': 'error_rate',
                    'service': service,
                    'value': error_rate,
                    'threshold': self.alert_thresholds['error_rate'],
                    'message': f'High error rate for {service}: {error_rate:.1f}%'
                })
        
        # Alerts senden (mit Cooldown)
        for alert in alerts_to_send:
            await self.send_alert(alert)
    
    async def send_alert(self, alert: Dict):
        """Alert senden (mit Cooldown-Logik)"""
        alert_key = f"{alert['type']}_{alert.get('endpoint', alert.get('service', ''))}"
        current_time = datetime.now()
        
        # Cooldown prüfen
        if alert_key in self.active_alerts:
            last_alert = self.active_alerts[alert_key]
            if current_time - last_alert < self.alert_cooldown:
                return  # Alert noch im Cooldown
        
        # Alert senden
        self.logger.warning(f"PERFORMANCE ALERT: {alert['message']}")
        
        # Alert-Timestamp aktualisieren
        self.active_alerts[alert_key] = current_time
        
        # Hier könnte Integration mit externen Alert-Systemen erfolgen
        # z.B. Slack, Email, PagerDuty, etc.
    
    def get_metrics_summary(self, hours: int = 1) -> Dict:
        """Metriken-Zusammenfassung für einen Zeitraum"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        recent_metrics = [
            m for m in self.metrics_history 
            if m.timestamp >= cutoff_time
        ]
        
        if not recent_metrics:
            return {}
        
        # Durchschnittswerte berechnen
        avg_cpu = sum(m.cpu_usage for m in recent_metrics) / len(recent_metrics)
        avg_memory = sum(m.memory_usage for m in recent_metrics) / len(recent_metrics)
        avg_disk = sum(m.disk_usage for m in recent_metrics) / len(recent_metrics)
        
        # Response Time Durchschnitte
        response_time_avgs = {}
        for endpoint in recent_metrics[0].response_times.keys():
            times = [m.response_times.get(endpoint, 0) for m in recent_metrics]
            response_time_avgs[endpoint] = sum(times) / len(times)
        
        return {
            'period_hours': hours,
            'sample_count': len(recent_metrics),
            'averages': {
                'cpu_usage': round(avg_cpu, 2),
                'memory_usage': round(avg_memory, 2),
                'disk_usage': round(avg_disk, 2),
                'response_times': response_time_avgs
            },
            'peaks': {
                'cpu_usage': max(m.cpu_usage for m in recent_metrics),
                'memory_usage': max(m.memory_usage for m in recent_metrics),
                'disk_usage': max(m.disk_usage for m in recent_metrics)
            }
        }
    
    def export_metrics(self, hours: int = 24) -> str:
        """Metriken als JSON exportieren"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        recent_metrics = [
            asdict(m) for m in self.metrics_history 
            if m.timestamp >= cutoff_time
        ]
        
        # Datetime-Objekte zu Strings konvertieren
        for metric in recent_metrics:
            metric['timestamp'] = metric['timestamp'].isoformat()
        
        return json.dumps(recent_metrics, indent=2)
```

## Performance Best Practices

### 1. Code-Optimierung

#### Async/Await Best Practices

```python
# ✅ Gut: Parallele Ausführung
async def process_multiple_workflows(workflow_ids: List[str]):
    tasks = [process_workflow(wf_id) for wf_id in workflow_ids]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return results

# ❌ Schlecht: Sequenzielle Ausführung
async def process_multiple_workflows_bad(workflow_ids: List[str]):
    results = []
    for wf_id in workflow_ids:
        result = await process_workflow(wf_id)
        results.append(result)
    return results
```

#### Memory Management

```python
# ✅ Gut: Context Manager für Ressourcen
class OptimizedImageProcessor:
    def __init__(self):
        self._temp_files = []
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        # Temporäre Dateien bereinigen
        for temp_file in self._temp_files:
            try:
                os.unlink(temp_file)
            except OSError:
                pass
        self._temp_files.clear()
    
    async def process_image(self, image_data: bytes) -> bytes:
        # Verarbeitung mit automatischer Bereinigung
        pass

# Verwendung
async with OptimizedImageProcessor() as processor:
    result = await processor.process_image(image_data)
```

### 2. Database Optimization

#### Connection Pooling

```python
# ✅ Optimierte Datenbankverbindungen
class DatabaseOptimizer:
    def __init__(self):
        self.pool_config = {
            'min_size': 5,
            'max_size': 20,
            'max_queries': 50000,
            'max_inactive_connection_lifetime': 300.0,
            'timeout': 60.0
        }
    
    async def create_optimized_pool(self):
        return await asyncpg.create_pool(
            dsn=DATABASE_URL,
            **self.pool_config
        )
```

#### Query Optimization

```sql
-- ✅ Optimierte Queries mit Indizes
CREATE INDEX CONCURRENTLY idx_workflows_user_status 
ON workflows(user_id, status) 
WHERE status IN ('running', 'pending');

-- ✅ Materialized Views für komplexe Aggregationen
CREATE MATERIALIZED VIEW workflow_statistics AS
SELECT 
    user_id,
    COUNT(*) as total_workflows,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_workflows,
    AVG(execution_time) as avg_execution_time
FROM workflows
GROUP BY user_id;

-- Automatische Aktualisierung
CREATE OR REPLACE FUNCTION refresh_workflow_statistics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY workflow_statistics;
END;
$$ LANGUAGE plpgsql;
```

### 3. Frontend Optimization

#### React Performance

```typescript
// ✅ Optimierte Component mit Memoization
const OptimizedWorkflowList = React.memo(({ workflows, onSelect }: Props) => {
    const sortedWorkflows = useMemo(() => {
        return workflows.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }, [workflows]);
    
    const handleSelect = useCallback((workflowId: string) => {
        onSelect(workflowId);
    }, [onSelect]);
    
    return (
        <VirtualizedList
            items={sortedWorkflows}
            renderItem={({ item }) => (
                <WorkflowItem 
                    key={item.id}
                    workflow={item}
                    onSelect={handleSelect}
                />
            )}
            height={400}
            itemHeight={60}
        />
    );
});
```

#### Bundle Optimization

```typescript
// vite.config.ts - Optimierte Build-Konfiguration
export default defineConfig({
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
                    utils: ['date-fns', 'lodash-es']
                }
            }
        },
        chunkSizeWarningLimit: 1000,
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true
            }
        }
    },
    optimizeDeps: {
        include: ['react', 'react-dom', 'date-fns'],
        exclude: ['@vite/client', '@vite/env']
    }
});
```

## Troubleshooting

### Häufige Performance-Probleme

#### 1. Hohe CPU-Auslastung

**Symptome:**
- Langsame Response Times
- Hohe CPU-Auslastung (>80%)
- Timeouts bei API-Requests

**Diagnose:**
```bash
# CPU-Profiling aktivieren
python -m cProfile -o profile.stats app/main.py

# Top CPU-Verbraucher anzeigen
python -c "
import pstats
p = pstats.Stats('profile.stats')
p.sort_stats('cumulative').print_stats(20)
"
```

**Lösungsansätze:**
- Async/Await korrekt implementieren
- CPU-intensive Tasks in Background Jobs verschieben
- Caching für wiederholte Berechnungen
- Process Pool für CPU-bound Operations

#### 2. Memory Leaks

**Symptome:**
- Kontinuierlich steigender Memory-Verbrauch
- Out-of-Memory Errors
- Langsamer werdende Performance

**Diagnose:**
```python
# Memory Profiling
import tracemalloc
import gc

def diagnose_memory():
    tracemalloc.start()
    
    # Code ausführen
    
    current, peak = tracemalloc.get_traced_memory()
    print(f"Current memory usage: {current / 1024 / 1024:.1f} MB")
    print(f"Peak memory usage: {peak / 1024 / 1024:.1f} MB")
    
    # Top Memory Allocations
    snapshot = tracemalloc.take_snapshot()
    top_stats = snapshot.statistics('lineno')
    
    for stat in top_stats[:10]:
        print(stat)
```

**Lösungsansätze:**
- Explizite Ressourcen-Bereinigung
- Context Manager verwenden
- Weak References für Caches
- Regelmäßige Garbage Collection

#### 3. Database Performance

**Symptome:**
- Langsame Queries
- Connection Pool Exhaustion
- Database Timeouts

**Diagnose:**
```sql
-- Langsame Queries identifizieren
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

-- Index-Nutzung prüfen
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;
```

**Lösungsansätze:**
- Fehlende Indizes hinzufügen
- Query-Optimierung
- Connection Pool konfigurieren
- Read Replicas für Read-Heavy Workloads

### Performance Monitoring Tools

#### 1. Application Performance Monitoring

```python
# APM Integration (z.B. New Relic, DataDog)
from newrelic import agent

@agent.function_trace()
async def monitored_function():
    # Automatisches Tracing
    pass

# Custom Metrics
agent.record_custom_metric('Custom/WorkflowExecutionTime', execution_time)
```

#### 2. Health Check Endpoints

```python
# backend/app/api/health.py
from fastapi import APIRouter, Depends
from app.services.performance_monitoring import PerformanceMonitoringService

router = APIRouter()

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@router.get("/health/detailed")
async def detailed_health_check(
    monitor: PerformanceMonitoringService = Depends()
):
    metrics = monitor.get_metrics_summary(hours=1)
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "metrics": metrics,
        "services": {
            "database": await check_database_health(),
            "redis": await check_redis_health(),
            "external_apis": await check_external_apis_health()
        }
    }
```

## Fazit

Diese Performance-Optimierungs-Dokumentation bietet umfassende Strategien und Implementierungen zur Verbesserung der System-Performance. Die wichtigsten Punkte:

1. **Proaktives Monitoring** - Kontinuierliche Überwachung aller System-Komponenten
2. **Caching-Strategien** - Intelligente Cache-Implementierung auf allen Ebenen
3. **Asynchrone Verarbeitung** - Optimale Nutzung von Async/Await Patterns
4. **Ressourcen-Management** - Effiziente Verwaltung von CPU, Memory und I/O
5. **Database-Optimierung** - Indizes, Connection Pooling und Query-Optimierung
6. **Frontend-Performance** - Bundle-Optimierung und React-Performance

Regelmäßige Performance-Reviews und kontinuierliche Optimierung sind entscheidend für die langfristige System-Performance.