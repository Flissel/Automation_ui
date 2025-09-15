# Developer Onboarding Guide - Trusted Login System

## Willkommen im Entwicklerteam!

This documentation guides you through the complete onboarding process for the Trusted Login System. You will receive all necessary information to contribute productively.

## Table of Contents

1. [Projekt-Übersicht](#projekt-übersicht)
2. [Entwicklungsumgebung Setup](#entwicklungsumgebung-setup)
3. [Architektur-Verständnis](#architektur-verständnis)
4. [Code-Standards & Guidelines](#code-standards--guidelines)
5. [Entwicklungs-Workflow](#entwicklungs-workflow)
6. [Testing-Strategien](#testing-strategien)
7. [Debugging & Troubleshooting](#debugging--troubleshooting)
8. [Deployment-Prozess](#deployment-prozess)
9. [Team-Kommunikation](#team-kommunikation)
10. [Ressourcen & Referenzen](#ressourcen--referenzen)

## Project Overview

### Mission Statement

Das Trusted Login System automatisiert Login-Prozesse und Desktop-Interaktionen durch eine sichere, benutzerfreundliche Plattform, die Workflows für repetitive Aufgaben erstellt und ausführt.

### Technologie-Stack

#### Frontend
- **Framework**: React 18 mit TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **UI Components**: Shadcn/ui
- **Icons**: Lucide React
- **Notifications**: Sonner

#### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Real-time**: WebSockets
- **Task Queue**: Celery (optional)

#### Desktop Integration
- **Screenshot**: PyAutoGUI, Pillow
- **OCR**: Tesseract, Google Vision API
- **Automation**: PyAutoGUI, Windows API
- **Cross-platform**: Python multiprocessing

#### DevOps & Tools
- **Version Control**: Git
- **CI/CD**: GitHub Actions
- **Containerization**: Docker
- **Monitoring**: Prometheus, Grafana
- **Documentation**: Markdown, Sphinx

### Projekt-Struktur

```
trusted-login-system/
├── src/                     # React App source
│   ├── components/          # Wiederverwendbare Komponenten
│   ├── pages/               # Seiten-Komponenten
│   ├── hooks/               # Custom React Hooks
│   ├── stores/              # Zustand State Management
│   ├── utils/               # Utility-Funktionen
│   └── types/               # TypeScript-Typen
├── public/                  # Statische Assets
├── package.json             # App Dependencies and scripts
├── backend/                 # FastAPI Backend
│   ├── app/
│   │   ├── api/            # API-Endpunkte
│   │   ├── core/           # Kern-Konfiguration
│   │   ├── models/         # Datenmodelle
│   │   ├── services/       # Business Logic
│   │   └── utils/          # Backend-Utilities
│   ├── tests/              # Backend-Tests
│   └── requirements.txt    # Python-Dependencies
├── desktop/                # Desktop-Integration
│   ├── services/           # Desktop-Services
│   ├── automation/         # Automatisierungs-Module
│   └── ocr/               # OCR-Integration
├── docs/                   # Dokumentation
├── scripts/                # Build & Deployment Scripts
├── docker/                 # Docker-Konfigurationen
└── .github/               # GitHub Actions
```

## Entwicklungsumgebung Setup

### Prerequisites

#### System-Anforderungen
- **OS**: Windows 10/11, macOS 10.15+, oder Linux Ubuntu 18.04+
- **RAM**: Mindestens 8 GB (16 GB empfohlen)
- **Storage**: 10 GB freier Speicherplatz
- **Internet**: Stabile Breitbandverbindung

#### Erforderliche Software

1. **Git** (Version 2.30+)
   ```bash
   # Windows (mit Chocolatey)
   choco install git
   
   # macOS (mit Homebrew)
   brew install git
   
   # Linux (Ubuntu/Debian)
   sudo apt-get install git
   ```

2. **Node.js** (Version 18+)
   ```bash
   # Windows (mit Chocolatey)
   choco install nodejs
   
   # macOS (mit Homebrew)
   brew install node
   
   # Linux (mit NodeSource)
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Python** (Version 3.11+)
   ```bash
   # Windows (mit Chocolatey)
   choco install python
   
   # macOS (mit Homebrew)
   brew install python@3.11
   
   # Linux (Ubuntu/Debian)
   sudo apt-get install python3.11 python3.11-pip python3.11-venv
   ```

4. **Docker** (Optional, für Containerisierung)
   ```bash
   # Windows/macOS: Docker Desktop herunterladen
   # Linux (Ubuntu)
   sudo apt-get install docker.io docker-compose
   ```

### Repository Setup

#### 1. Repository klonen
```bash
git clone https://github.com/your-org/trusted-login-system.git
cd trusted-login-system
```

#### 2. Frontend Setup
```bash
cd frontend
npm install

# Entwicklungsserver starten
npm run dev
```

#### 3. Backend Setup
```bash
cd backend

# Virtuelle Umgebung erstellen
python -m venv venv

# Virtuelle Umgebung aktivieren
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# Dependencies installieren
pip install -r requirements.txt

# Entwicklungsserver starten
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 4. Desktop Service Setup
```bash
cd desktop

# Dependencies installieren
pip install -r requirements.txt

# Service starten
python main.py
```

### Umgebungsvariablen

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_DESKTOP_SERVICE_URL=http://localhost:8001
```

#### Backend (.env)
```env
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=postgresql://user:password@localhost:5432/trusted_login

# Security
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# External Services
GOOGLE_VISION_API_KEY=your_google_vision_key
TESSERACT_PATH=/usr/bin/tesseract

# Development
DEBUG=True
LOG_LEVEL=DEBUG
```

#### Desktop Service (.env)
```env
# API Configuration
BACKEND_URL=http://localhost:8000
SERVICE_PORT=8001

# OCR Configuration
TESSERACT_PATH=/usr/bin/tesseract
OCR_LANGUAGES=eng,deu

# Performance
MAX_WORKERS=4
SCREENSHOT_QUALITY=85
CACHE_SIZE=100
```

### IDE-Konfiguration

#### Visual Studio Code (Empfohlen)

**Erforderliche Extensions:**
```json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.black-formatter",
    "ms-python.isort",
    "ms-python.pylint",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "ms-vscode.vscode-eslint",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-vscode.vscode-docker"
  ]
}
```

**Workspace Settings (.vscode/settings.json):**
```json
{
  "python.defaultInterpreterPath": "./backend/venv/bin/python",
  "python.formatting.provider": "black",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  }
}
```

#### PyCharm (Alternative)

1. Projekt öffnen
2. Python Interpreter konfigurieren (backend/venv)
3. Code Style auf Black konfigurieren
4. Pylint als Linter aktivieren
5. TypeScript Support aktivieren

### Datenbank Setup

#### Supabase (Empfohlen)

1. **Supabase-Projekt erstellen**
   - Besuchen Sie https://supabase.com
   - Erstellen Sie ein neues Projekt
   - Notieren Sie URL und API-Keys

2. **Tabellen erstellen**
   ```sql
   -- Workflows Tabelle
   CREATE TABLE workflows (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     name VARCHAR(255) NOT NULL,
     description TEXT,
     steps JSONB NOT NULL,
     user_id UUID REFERENCES auth.users(id),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     is_active BOOLEAN DEFAULT true
   );
   
   -- Executions Tabelle
   CREATE TABLE executions (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     workflow_id UUID REFERENCES workflows(id),
     status VARCHAR(50) NOT NULL,
     started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     completed_at TIMESTAMP WITH TIME ZONE,
     error_message TEXT,
     logs JSONB,
     user_id UUID REFERENCES auth.users(id)
   );
   
   -- Screenshots Tabelle
   CREATE TABLE screenshots (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     execution_id UUID REFERENCES executions(id),
     file_path VARCHAR(500) NOT NULL,
     taken_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     metadata JSONB
   );
   ```

3. **Row Level Security (RLS) aktivieren**
   ```sql
   -- RLS für workflows
   ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users can view own workflows" ON workflows
     FOR SELECT USING (auth.uid() = user_id);
   CREATE POLICY "Users can insert own workflows" ON workflows
     FOR INSERT WITH CHECK (auth.uid() = user_id);
   CREATE POLICY "Users can update own workflows" ON workflows
     FOR UPDATE USING (auth.uid() = user_id);
   CREATE POLICY "Users can delete own workflows" ON workflows
     FOR DELETE USING (auth.uid() = user_id);
   
   -- RLS für executions
   ALTER TABLE executions ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users can view own executions" ON executions
     FOR SELECT USING (auth.uid() = user_id);
   CREATE POLICY "Users can insert own executions" ON executions
     FOR INSERT WITH CHECK (auth.uid() = user_id);
   ```

#### Lokale PostgreSQL (Alternative)

```bash
# Docker verwenden
docker run --name postgres-dev \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=trusted_login \
  -p 5432:5432 \
  -d postgres:14

# Migrations ausführen
cd backend
alembic upgrade head
```

## Architektur-Verständnis

### System-Architektur

```mermaid
graph TB
    subgraph "Frontend (React)"
        UI[User Interface]
        Store[Zustand Store]
        API[API Client]
    end
    
    subgraph "Backend (FastAPI)"
        Auth[Authentication]
        WorkflowAPI[Workflow API]
        ExecutionAPI[Execution API]
        WebSocket[WebSocket Handler]
    end
    
    subgraph "Desktop Service (Python)"
        Screenshot[Screenshot Service]
        OCR[OCR Service]
        Automation[Automation Service]
        FileSystem[File System Bridge]
    end
    
    subgraph "External Services"
        Supabase[(Supabase)]
        GoogleVision[Google Vision API]
        Tesseract[Tesseract OCR]
    end
    
    UI --> Store
    Store --> API
    API --> Auth
    API --> WorkflowAPI
    API --> ExecutionAPI
    API --> WebSocket
    
    WorkflowAPI --> Supabase
    ExecutionAPI --> Supabase
    Auth --> Supabase
    
    WebSocket --> Screenshot
    WebSocket --> OCR
    WebSocket --> Automation
    
    OCR --> GoogleVision
    OCR --> Tesseract
    Screenshot --> FileSystem
```

### Datenfluss

#### Workflow Creation
1. **Frontend**: Benutzer erstellt Workflow in UI
2. **State Management**: Workflow-Daten in Zustand Store
3. **API Call**: POST /api/workflows
4. **Backend**: Validierung und Speicherung in Supabase
5. **Response**: Bestätigung an Frontend

#### Workflow Execution
1. **Frontend**: Benutzer startet Workflow
2. **API Call**: POST /api/executions
3. **Backend**: Execution-Record erstellen
4. **WebSocket**: Verbindung zu Desktop Service
5. **Desktop Service**: Schritte ausführen
6. **Real-time Updates**: Status-Updates via WebSocket
7. **Completion**: Ergebnis in Datenbank speichern

### Komponenten-Architektur

#### Frontend-Komponenten
```typescript
// Komponenten-Hierarchie
App
├── Layout
│   ├── Header
│   ├── Sidebar
│   └── Main
├── Pages
│   ├── Dashboard
│   ├── WorkflowList
│   ├── WorkflowEditor
│   └── ExecutionHistory
└── Components
    ├── WorkflowCard
    ├── StepEditor
    ├── ExecutionStatus
    └── Common (Button, Input, Modal, etc.)
```

#### Backend-Services
```python
# Service-Architektur
app/
├── api/
│   ├── auth.py          # Authentifizierung
│   ├── workflows.py     # Workflow-Management
│   ├── executions.py    # Ausführungs-Management
│   └── websocket.py     # Real-time Communication
├── services/
│   ├── workflow_service.py
│   ├── execution_service.py
│   ├── desktop_service.py
│   └── notification_service.py
├── models/
│   ├── workflow.py
│   ├── execution.py
│   └── user.py
└── core/
    ├── config.py
    ├── security.py
    └── database.py
```

## Code-Standards & Guidelines

### Python (Backend)

#### Code Style
- **Formatter**: Black (Line length: 88)
- **Import Sorting**: isort
- **Linting**: Pylint, Flake8
- **Type Hints**: Mandatory für alle Funktionen

#### Beispiel-Code
```python
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException


class WorkflowCreate(BaseModel):
    """Schema für Workflow-Erstellung."""
    name: str
    description: Optional[str] = None
    steps: List[dict]


class WorkflowService:
    """Service für Workflow-Management."""
    
    def __init__(self, db_session: Session) -> None:
        self.db = db_session
    
    async def create_workflow(
        self, 
        workflow_data: WorkflowCreate, 
        user_id: str
    ) -> Workflow:
        """Erstellt einen neuen Workflow.
        
        Args:
            workflow_data: Workflow-Daten
            user_id: ID des Benutzers
            
        Returns:
            Erstellter Workflow
            
        Raises:
            HTTPException: Bei Validierungsfehlern
        """
        try:
            workflow = Workflow(
                name=workflow_data.name,
                description=workflow_data.description,
                steps=workflow_data.steps,
                user_id=user_id
            )
            self.db.add(workflow)
            await self.db.commit()
            return workflow
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=400, 
                detail=f"Workflow creation failed: {str(e)}"
            )
```

#### Naming Conventions
- **Variablen**: snake_case
- **Funktionen**: snake_case
- **Klassen**: PascalCase
- **Konstanten**: UPPER_SNAKE_CASE
- **Private Methoden**: _leading_underscore

#### Docstring Format
```python
def complex_function(param1: str, param2: int = 10) -> bool:
    """Kurze Beschreibung der Funktion.
    
    Längere Beschreibung falls notwendig. Erklärt was die
    Funktion macht und warum sie existiert.
    
    Args:
        param1: Beschreibung des ersten Parameters
        param2: Beschreibung des zweiten Parameters (default: 10)
        
    Returns:
        Beschreibung des Rückgabewerts
        
    Raises:
        ValueError: Wenn param1 leer ist
        TypeError: Wenn param2 nicht int ist
        
    Example:
        >>> complex_function("test", 5)
        True
    """
    pass
```

### TypeScript (Frontend)

#### Code Style
- **Formatter**: Prettier
- **Linting**: ESLint mit TypeScript-Regeln
- **Import Organization**: Automatisch sortiert

#### Beispiel-Code
```typescript
import React, { useState, useEffect } from 'react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Workflow, WorkflowStep } from '@/types/workflow';

interface WorkflowEditorProps {
  workflowId?: string;
  onSave?: (workflow: Workflow) => void;
}

/**
 * Komponente für die Bearbeitung von Workflows.
 * 
 * @param workflowId - Optional: ID des zu bearbeitenden Workflows
 * @param onSave - Callback-Funktion beim Speichern
 */
export const WorkflowEditor: React.FC<WorkflowEditorProps> = ({
  workflowId,
  onSave
}) => {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { createWorkflow, updateWorkflow, getWorkflow } = useWorkflowStore();

  useEffect(() => {
    if (workflowId) {
      loadWorkflow(workflowId);
    }
  }, [workflowId]);

  const loadWorkflow = async (id: string): Promise<void> => {
    try {
      setIsLoading(true);
      const loadedWorkflow = await getWorkflow(id);
      setWorkflow(loadedWorkflow);
    } catch (error) {
      toast.error('Fehler beim Laden des Workflows');
      console.error('Workflow load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!workflow) return;

    try {
      setIsLoading(true);
      const savedWorkflow = workflowId 
        ? await updateWorkflow(workflowId, workflow)
        : await createWorkflow(workflow);
      
      toast.success('Workflow erfolgreich gespeichert');
      onSave?.(savedWorkflow);
    } catch (error) {
      toast.error('Fehler beim Speichern des Workflows');
      console.error('Workflow save error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div>Laden...</div>;
  }

  return (
    <div className="workflow-editor">
      {/* Editor-Inhalt */}
      <Button onClick={handleSave} disabled={isLoading}>
        Speichern
      </Button>
    </div>
  );
};
```

#### Naming Conventions
- **Variablen**: camelCase
- **Funktionen**: camelCase
- **Komponenten**: PascalCase
- **Interfaces/Types**: PascalCase
- **Konstanten**: UPPER_SNAKE_CASE
- **Files**: kebab-case oder PascalCase (Komponenten)

#### Type Definitions
```typescript
// types/workflow.ts
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  userId: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface WorkflowStep {
  id: string;
  type: StepType;
  config: StepConfig;
  order: number;
}

export type StepType = 
  | 'screenshot'
  | 'click'
  | 'input'
  | 'wait'
  | 'ocr'
  | 'condition';

export interface StepConfig {
  [key: string]: unknown;
}

// Spezifische Step-Configs
export interface ScreenshotStepConfig extends StepConfig {
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  filename?: string;
  quality?: number;
}

export interface ClickStepConfig extends StepConfig {
  x: number;
  y: number;
  button: 'left' | 'right' | 'middle';
  clickType: 'single' | 'double';
  waitAfter?: number;
}
```

### CSS/Styling Guidelines

#### Tailwind CSS
- **Utility-First**: Verwenden Sie Tailwind-Klassen
- **Custom Components**: Nur bei wiederverwendbaren Patterns
- **Responsive Design**: Mobile-first Ansatz

```typescript
// Gutes Beispiel
const Button = ({ variant = 'primary', size = 'md', children, ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  
  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'border border-input hover:bg-accent hover:text-accent-foreground'
  };
  
  const sizeClasses = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 py-2',
    lg: 'h-11 px-8 text-lg'
  };
  
  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
      {...props}
    >
      {children}
    </button>
  );
};
```

## Entwicklungs-Workflow

### Git Workflow

#### Branch-Strategie
```
main                    # Produktions-Branch
├── develop            # Entwicklungs-Branch
├── feature/           # Feature-Branches
│   ├── feature/workflow-editor
│   ├── feature/ocr-integration
│   └── feature/user-dashboard
├── bugfix/            # Bugfix-Branches
│   ├── bugfix/login-error
│   └── bugfix/screenshot-quality
├── hotfix/            # Hotfix-Branches
│   └── hotfix/security-patch
└── release/           # Release-Branches
    └── release/v1.2.0
```

#### Commit-Nachrichten
```
# Format
<type>(<scope>): <subject>

<body>

<footer>

# Typen
feat:     Neue Funktion
fix:      Bugfix
docs:     Documentation
style:    Formatierung
refactor: Code-Refactoring
test:     Tests
chore:    Build/Tools

# Beispiele
feat(workflow): add step validation
fix(ocr): improve text recognition accuracy
docs(api): update endpoint documentation
refactor(auth): simplify token validation
test(workflow): add integration tests
```

#### Pull Request Prozess

1. **Branch erstellen**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/new-feature
   ```

2. **Entwicklung**
   ```bash
   # Regelmäßige Commits
   git add .
   git commit -m "feat(scope): description"
   
   # Develop aktuell halten
   git fetch origin
   git rebase origin/develop
   ```

3. **Pull Request erstellen**
   - Aussagekräftiger Titel
   - Detaillierte Beschreibung
   - Screenshots bei UI-Änderungen
   - Tests durchgeführt
   - Documentation updated

4. **Code Review**
   - Mindestens 2 Reviewer
   - Alle Checks müssen grün sein
   - Feedback addressieren

5. **Merge**
   - Squash and Merge für Features
   - Merge Commit für Releases

### Entwicklungs-Zyklen

#### Daily Workflow
1. **Morgens**: Stand-up Meeting (9:00 Uhr)
2. **Entwicklung**: Feature-Arbeit
3. **Mittags**: Code Review
4. **Afternoon**: Testing & Documentation
5. **Abends**: Commit & Push

#### Sprint-Planung (2 Wochen)
- **Montag**: Sprint Planning
- **Mittwoch**: Mid-Sprint Review
- **Freitag**: Sprint Review & Retrospective

#### Release-Zyklen
- **Minor Releases**: Monatlich
- **Patch Releases**: Bei Bedarf
- **Major Releases**: Quartalsweise

### Code Review Guidelines

#### Was zu prüfen ist
1. **Funktionalität**: Code macht was er soll
2. **Lesbarkeit**: Code ist verständlich
3. **Performance**: Keine offensichtlichen Probleme
4. **Security**: No security vulnerabilities
5. **Tests**: Ausreichende Test-Abdeckung
6. **Documentation**: Code is documented

#### Review-Checklist
```markdown
## Code Review Checklist

### Funktionalität
- [ ] Feature funktioniert wie spezifiziert
- [ ] Edge Cases sind behandelt
- [ ] Error Handling ist implementiert

### Code-Qualität
- [ ] Code folgt Style Guidelines
- [ ] Naming ist aussagekräftig
- [ ] Keine Code-Duplikation
- [ ] Angemessene Kommentare

### Performance
- [ ] Keine offensichtlichen Performance-Probleme
- [ ] Effiziente Algorithmen verwendet
- [ ] Memory Leaks vermieden

### Security
- [ ] Input-Validierung implementiert
- [ ] Keine hardcoded Secrets
- [ ] SQL Injection vermieden
- [ ] XSS-Schutz implementiert

### Tests
- [ ] Unit Tests vorhanden
- [ ] Integration Tests bei Bedarf
- [ ] Test Coverage ausreichend

### Documentation
- [ ] Code ist selbst-dokumentierend
- [ ] Komplexe Logik kommentiert
- [ ] API documentation updated
```

## Testing-Strategien

### Test-Pyramide

```
        /\        E2E Tests (wenige)
       /  \       
      /    \      Integration Tests (einige)
     /      \     
    /        \    Unit Tests (viele)
   /__________\   
```

### Backend-Testing

#### Unit Tests
```python
# tests/test_workflow_service.py
import pytest
from unittest.mock import Mock, patch
from app.services.workflow_service import WorkflowService
from app.models.workflow import Workflow


class TestWorkflowService:
    """Tests für WorkflowService."""
    
    @pytest.fixture
    def mock_db_session(self):
        """Mock für Datenbank-Session."""
        return Mock()
    
    @pytest.fixture
    def workflow_service(self, mock_db_session):
        """WorkflowService-Instanz für Tests."""
        return WorkflowService(mock_db_session)
    
    async def test_create_workflow_success(self, workflow_service, mock_db_session):
        """Test erfolgreiche Workflow-Erstellung."""
        # Arrange
        workflow_data = {
            "name": "Test Workflow",
            "description": "Test Description",
            "steps": [{"type": "screenshot"}]
        }
        user_id = "user123"
        
        # Act
        result = await workflow_service.create_workflow(workflow_data, user_id)
        
        # Assert
        assert result.name == "Test Workflow"
        assert result.user_id == user_id
        mock_db_session.add.assert_called_once()
        mock_db_session.commit.assert_called_once()
    
    async def test_create_workflow_validation_error(self, workflow_service):
        """Test Workflow-Erstellung mit Validierungsfehler."""
        # Arrange
        invalid_data = {"name": ""}  # Leerer Name
        user_id = "user123"
        
        # Act & Assert
        with pytest.raises(ValueError, match="Name is required"):
            await workflow_service.create_workflow(invalid_data, user_id)
```

#### Integration Tests
```python
# tests/test_api_integration.py
import pytest
from httpx import AsyncClient
from app.main import app


@pytest.mark.asyncio
class TestWorkflowAPI:
    """Integration Tests für Workflow API."""
    
    async def test_create_workflow_endpoint(self):
        """Test Workflow-Erstellung über API."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Arrange
            workflow_data = {
                "name": "API Test Workflow",
                "description": "Created via API",
                "steps": [{"type": "screenshot", "config": {}}]
            }
            
            # Act
            response = await client.post(
                "/api/workflows",
                json=workflow_data,
                headers={"Authorization": "Bearer test_token"}
            )
            
            # Assert
            assert response.status_code == 201
            data = response.json()
            assert data["name"] == "API Test Workflow"
            assert "id" in data
```

### Frontend-Testing

#### Unit Tests (React Testing Library)
```typescript
// src/components/__tests__/WorkflowCard.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { WorkflowCard } from '../WorkflowCard';
import type { Workflow } from '@/types/workflow';

const mockWorkflow: Workflow = {
  id: '1',
  name: 'Test Workflow',
  description: 'Test Description',
  steps: [],
  userId: 'user1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  isActive: true
};

describe('WorkflowCard', () => {
  it('renders workflow information correctly', () => {
    render(<WorkflowCard workflow={mockWorkflow} />);
    
    expect(screen.getByText('Test Workflow')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });
  
  it('calls onExecute when execute button is clicked', async () => {
    const mockOnExecute = vi.fn();
    
    render(
      <WorkflowCard 
        workflow={mockWorkflow} 
        onExecute={mockOnExecute} 
      />
    );
    
    const executeButton = screen.getByRole('button', { name: /ausführen/i });
    fireEvent.click(executeButton);
    
    await waitFor(() => {
      expect(mockOnExecute).toHaveBeenCalledWith(mockWorkflow.id);
    });
  });
  
  it('shows inactive state for inactive workflows', () => {
    const inactiveWorkflow = { ...mockWorkflow, isActive: false };
    
    render(<WorkflowCard workflow={inactiveWorkflow} />);
    
    expect(screen.getByText(/inaktiv/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ausführen/i })).toBeDisabled();
  });
});
```

#### E2E Tests (Playwright)
```typescript
// tests/e2e/workflow-creation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Workflow Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });
  
  test('should create a new workflow', async ({ page }) => {
    // Navigate to workflow creation
    await page.click('[data-testid="new-workflow-button"]');
    await expect(page).toHaveURL('/workflows/new');
    
    // Fill workflow details
    await page.fill('[data-testid="workflow-name"]', 'E2E Test Workflow');
    await page.fill('[data-testid="workflow-description"]', 'Created by E2E test');
    
    // Add a screenshot step
    await page.click('[data-testid="add-step-button"]');
    await page.selectOption('[data-testid="step-type"]', 'screenshot');
    await page.fill('[data-testid="step-filename"]', 'test-screenshot.png');
    
    // Save workflow
    await page.click('[data-testid="save-workflow-button"]');
    
    // Verify success
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page).toHaveURL('/workflows');
    await expect(page.locator('text=E2E Test Workflow')).toBeVisible();
  });
  
  test('should execute workflow', async ({ page }) => {
    // Assume workflow exists
    await page.goto('/workflows');
    
    // Find and execute workflow
    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    await workflowCard.locator('[data-testid="execute-button"]').click();
    
    // Verify execution started
    await expect(page.locator('[data-testid="execution-status"]')).toContainText('Running');
    
    // Wait for completion (with timeout)
    await expect(page.locator('[data-testid="execution-status"]')).toContainText('Completed', { timeout: 30000 });
  });
});
```

### Test-Konfiguration

#### pytest.ini
```ini
[tool:pytest]
addopts = 
    --strict-markers
    --strict-config
    --cov=app
    --cov-report=html
    --cov-report=term-missing
    --cov-fail-under=80
testpaths = tests
markers =
    unit: Unit tests
    integration: Integration tests
    e2e: End-to-end tests
    slow: Slow running tests
```

#### vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'html'],
      threshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

## Debugging & Troubleshooting

### Debugging-Tools

#### Backend-Debugging
```python
# app/core/logging.py
import logging
import sys
from typing import Any


def setup_logging(level: str = "INFO") -> None:
    """Konfiguriert Logging für die Anwendung."""
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler("app.log")
        ]
    )


class DebugMiddleware:
    """Middleware für Request/Response Debugging."""
    
    def __init__(self, app: Any) -> None:
        self.app = app
    
    async def __call__(self, scope: dict, receive: Any, send: Any) -> None:
        if scope["type"] == "http":
            # Log Request
            logger = logging.getLogger(__name__)
            logger.debug(f"Request: {scope['method']} {scope['path']}")
            
            # Process Request
            await self.app(scope, receive, send)
```

#### Frontend-Debugging
```typescript
// src/utils/debug.ts
interface DebugConfig {
  enabled: boolean;
  level: 'error' | 'warn' | 'info' | 'debug';
}

const debugConfig: DebugConfig = {
  enabled: import.meta.env.DEV,
  level: 'debug'
};

export const debug = {
  error: (message: string, ...args: any[]) => {
    if (debugConfig.enabled) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (debugConfig.enabled) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    if (debugConfig.enabled) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },
  debug: (message: string, ...args: any[]) => {
    if (debugConfig.enabled && debugConfig.level === 'debug') {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
};

// React DevTools Integration
export const useDebugValue = (value: any, formatter?: (value: any) => any) => {
  if (debugConfig.enabled) {
    React.useDebugValue(value, formatter);
  }
};
```

### Häufige Probleme

#### Problem: CORS-Fehler
```python
# backend/app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### Problem: WebSocket-Verbindung fehlschlägt
```typescript
// src/hooks/useWebSocket.ts
import { useEffect, useRef, useState } from 'react';

export const useWebSocket = (url: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  
  const connect = () => {
    try {
      ws.current = new WebSocket(url);
      
      ws.current.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      };
      
      ws.current.onclose = () => {
        setIsConnected(false);
        
        // Automatic reconnection
        if (reconnectAttempts.current < maxReconnectAttempts) {
          setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, 1000 * Math.pow(2, reconnectAttempts.current));
        }
      };
      
      ws.current.onerror = (event) => {
        setError('WebSocket connection failed');
        console.error('WebSocket error:', event);
      };
    } catch (err) {
      setError('Failed to create WebSocket connection');
    }
  };
  
  useEffect(() => {
    connect();
    
    return () => {
      ws.current?.close();
    };
  }, [url]);
  
  return { isConnected, error, ws: ws.current };
};
```

#### Problem: Desktop Service nicht erreichbar
```python
# desktop/health_check.py
import asyncio
import aiohttp
from typing import Dict, Any


async def check_desktop_service_health() -> Dict[str, Any]:
    """Überprüft die Gesundheit des Desktop Services."""
    health_status = {
        "status": "healthy",
        "checks": {
            "screenshot_service": False,
            "ocr_service": False,
            "automation_service": False,
            "file_system": False
        },
        "errors": []
    }
    
    try:
        # Screenshot Service Test
        from services.screenshot_service import ScreenshotService
        screenshot_service = ScreenshotService()
        await screenshot_service.take_screenshot("health_check.png")
        health_status["checks"]["screenshot_service"] = True
    except Exception as e:
        health_status["errors"].append(f"Screenshot service: {str(e)}")
    
    try:
        # OCR Service Test
        from services.ocr_service import OCRService
        ocr_service = OCRService()
        # Test mit einem kleinen Testbild
        result = await ocr_service.extract_text("health_check.png")
        health_status["checks"]["ocr_service"] = True
    except Exception as e:
        health_status["errors"].append(f"OCR service: {str(e)}")
    
    # Gesamtstatus bestimmen
    if health_status["errors"]:
        health_status["status"] = "unhealthy"
    
    return health_status
```

### Performance-Debugging

#### Backend-Profiling
```python
# app/middleware/profiling.py
import time
import cProfile
import pstats
from typing import Callable
from fastapi import Request, Response


async def profile_request(request: Request, call_next: Callable) -> Response:
    """Profiling-Middleware für Performance-Analyse."""
    if request.url.path.startswith("/api/"):
        # Profiling starten
        profiler = cProfile.Profile()
        profiler.enable()
        
        start_time = time.time()
        
        # Request verarbeiten
        response = await call_next(request)
        
        # Profiling beenden
        profiler.disable()
        process_time = time.time() - start_time
        
        # Langsame Requests loggen
        if process_time > 1.0:  # > 1 Sekunde
            stats = pstats.Stats(profiler)
            stats.sort_stats('cumulative')
            # Stats in Datei speichern oder loggen
            
        response.headers["X-Process-Time"] = str(process_time)
        return response
    
    return await call_next(request)
```

#### Frontend-Performance
```typescript
// src/utils/performance.ts
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  startMeasure(name: string): void {
    performance.mark(`${name}-start`);
  }
  
  endMeasure(name: string): number {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const measure = performance.getEntriesByName(name)[0];
    const duration = measure.duration;
    
    // Metrik speichern
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(duration);
    
    // Cleanup
    performance.clearMarks(`${name}-start`);
    performance.clearMarks(`${name}-end`);
    performance.clearMeasures(name);
    
    return duration;
  }
  
  getAverageTime(name: string): number {
    const times = this.metrics.get(name) || [];
    return times.reduce((a, b) => a + b, 0) / times.length;
  }
  
  logSlowOperations(threshold: number = 100): void {
    this.metrics.forEach((times, name) => {
      const avg = this.getAverageTime(name);
      if (avg > threshold) {
        console.warn(`Slow operation detected: ${name} (${avg.toFixed(2)}ms avg)`);
      }
    });
  }
}

// React Hook für Performance-Monitoring
export const usePerformanceMonitor = (operationName: string) => {
  const monitor = PerformanceMonitor.getInstance();
  
  const startMeasure = () => monitor.startMeasure(operationName);
  const endMeasure = () => monitor.endMeasure(operationName);
  
  return { startMeasure, endMeasure };
};
```

## Deployment-Prozess

### Lokale Entwicklung

#### Docker Compose Setup
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - VITE_API_URL=http://localhost:8000
      - VITE_DESKTOP_SERVICE_URL=http://localhost:8001
    depends_on:
      - backend
  
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    environment:
      - DEBUG=True
      - DATABASE_URL=postgresql://postgres:password@db:5432/trusted_login
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    depends_on:
      - db
  
  desktop:
    build:
      context: ./desktop
      dockerfile: Dockerfile.dev
    ports:
      - "8001:8001"
    volumes:
      - ./desktop:/app
      - /tmp/.X11-unix:/tmp/.X11-unix:rw
    environment:
      - DISPLAY=${DISPLAY}
      - BACKEND_URL=http://backend:8000
    depends_on:
      - backend
  
  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=trusted_login
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

#### Entwicklungs-Scripts
```bash
#!/bin/bash
# scripts/dev-setup.sh

set -e

echo "Setting up development environment..."

# Environment variables laden
if [ -f .env ]; then
    export $(cat .env | xargs)
fi

# Docker Compose starten
docker-compose -f docker-compose.dev.yml up -d

echo "Waiting for services to start..."
sleep 10

# Database migrations
echo "Running database migrations..."
docker-compose -f docker-compose.dev.yml exec backend alembic upgrade head

# Frontend dependencies
echo "Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Backend dependencies
echo "Installing backend dependencies..."
cd backend && pip install -r requirements.txt && cd ..

echo "Development environment ready!"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:8000"
echo "Desktop Service: http://localhost:8001"
```

### Staging-Deployment

#### GitHub Actions Workflow
```yaml
# .github/workflows/staging.yml
name: Deploy to Staging

on:
  push:
    branches: [develop]
  pull_request:
    branches: [develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install Python dependencies
      run: |
        cd backend
        pip install -r requirements.txt
        pip install pytest pytest-cov
    
    - name: Install Node.js dependencies
      run: |
        cd frontend
        npm ci
    
    - name: Run Python tests
      run: |
        cd backend
        pytest --cov=app --cov-report=xml
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
    
    - name: Run TypeScript tests
      run: |
        npm run test:coverage
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        files: ./backend/coverage.xml,./coverage/lcov.info
  
  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
    
    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1
    
    - name: Build and push Docker images
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        ECR_REPOSITORY_FRONTEND: trusted-login-frontend
        ECR_REPOSITORY_BACKEND: trusted-login-backend
        IMAGE_TAG: ${{ github.sha }}
      run: |
        # Frontend
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY_FRONTEND:$IMAGE_TAG .
        docker push $ECR_REGISTRY/$ECR_REPOSITORY_FRONTEND:$IMAGE_TAG
        
        # Backend
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY_BACKEND:$IMAGE_TAG ./backend
        docker push $ECR_REGISTRY/$ECR_REPOSITORY_BACKEND:$IMAGE_TAG
    
    - name: Deploy to staging
      run: |
        # Update ECS service or Kubernetes deployment
        aws ecs update-service \
          --cluster staging-cluster \
          --service trusted-login-service \
          --force-new-deployment
```

### Produktions-Deployment

#### Production Dockerfile
```dockerfile
# Dockerfile.prod (root)
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```dockerfile
# backend/Dockerfile.prod
FROM python:3.11-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY . .

# Non-root user
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app
USER app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Kubernetes Deployment
```yaml
# k8s/production/deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: trusted-login-frontend
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: trusted-login-frontend
  template:
    metadata:
      labels:
        app: trusted-login-frontend
    spec:
      containers:
      - name: frontend
        image: your-registry/trusted-login-frontend:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: trusted-login-backend
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: trusted-login-backend
  template:
    metadata:
      labels:
        app: trusted-login-backend
    spec:
      containers:
      - name: backend
        image: your-registry/trusted-login-backend:latest
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
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Monitoring & Observability

#### Health Checks
```python
# backend/app/api/health.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
import asyncio
import aiohttp

router = APIRouter()

@router.get("/health")
async def health_check():
    """Basis Health Check."""
    return {"status": "healthy", "service": "trusted-login-backend"}

@router.get("/health/detailed")
async def detailed_health_check(db: Session = Depends(get_db)):
    """Detaillierter Health Check."""
    checks = {
        "database": await check_database(db),
        "supabase": await check_supabase(),
        "desktop_service": await check_desktop_service()
    }
    
    overall_status = "healthy" if all(check["status"] == "healthy" for check in checks.values()) else "unhealthy"
    
    return {
        "status": overall_status,
        "checks": checks,
        "timestamp": datetime.utcnow().isoformat()
    }

async def check_database(db: Session) -> dict:
    try:
        db.execute("SELECT 1")
        return {"status": "healthy", "response_time_ms": 0}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
```

## Team-Kommunikation

### Kommunikationskanäle

#### Slack/Discord Channels
- **#general**: Allgemeine Diskussionen
- **#development**: Entwicklungs-spezifische Themen
- **#frontend**: Frontend-Entwicklung
- **#backend**: Backend-Entwicklung
- **#devops**: Deployment & Infrastructure
- **#bugs**: Bug-Reports und Fixes
- **#releases**: Release-Ankündigungen

#### Meeting-Struktur

**Daily Standups (15 min)**
- Was habe ich gestern gemacht?
- Was mache ich heute?
- Gibt es Blocker?

**Sprint Planning (2h)**
- Backlog Review
- Story Estimation
- Sprint Goal Definition
- Task Assignment

**Sprint Review (1h)**
- Demo der Features
- Stakeholder Feedback
- Retrospective

**Code Review Sessions**
- Wöchentliche Sessions
- Architektur-Diskussionen
- Best Practice Sharing

### Dokumentations-Standards

#### Code-Kommentare
```python
# Gute Kommentare
def calculate_workflow_complexity(steps: List[WorkflowStep]) -> float:
    """Berechnet die Komplexität eines Workflows.
    
    Die Komplexität basiert auf:
    - Anzahl der Schritte
    - Verschachtelung von Bedingungen
    - Verwendung von Schleifen
    
    Args:
        steps: Liste der Workflow-Schritte
        
    Returns:
        Komplexitätswert zwischen 0.0 und 1.0
    """
    base_complexity = len(steps) * 0.1
    
    # Zusätzliche Komplexität für Bedingungen
    condition_complexity = sum(
        0.2 for step in steps 
        if step.type == 'condition'
    )
    
    # Verschachtelungstiefe berücksichtigen
    nesting_penalty = calculate_nesting_depth(steps) * 0.1
    
    return min(base_complexity + condition_complexity + nesting_penalty, 1.0)
```

#### README-Standards
```markdown
# Component/Service Name

## Übersicht
Kurze Beschreibung was die Komponente macht.

## Installation
```bash
npm install
# oder
pip install -r requirements.txt
```

## Verwendung
```typescript
import { ComponentName } from './component';

const example = new ComponentName({
  option1: 'value1',
  option2: 'value2'
});
```

## API
### Methoden
- `method1(param: Type): ReturnType` - Beschreibung
- `method2(param: Type): ReturnType` - Beschreibung

## Konfiguration
| Option | Type | Default | Beschreibung |
|--------|------|---------|-------------|
| option1 | string | 'default' | Was macht diese Option |

## Tests
```bash
npm test
# oder
pytest
```

## Beitragen
Siehe [CONTRIBUTING.md](../CONTRIBUTING.md)
```

## Ressourcen & Referenzen

### Interne Dokumentation
- [API-Referenz](./api_reference.md)
- [Architektur-Dokumentation](./architecture.md)
- [Deployment-Guide](./deployment_guide.md)
- [Testing-Dokumentation](./testing_documentation.md)
- [Performance-Optimierung](./performance_optimization_guide.md)
- [Error-Handling](./error_handling_guide.md)
- [Integration-Guides](./integration_guides.md)
- [Benutzer-Dokumentation](./user_documentation.md)

### Externe Ressourcen

#### Frontend
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Zustand Documentation](https://github.com/pmndrs/zustand)

#### Backend
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Python Type Hints](https://docs.python.org/3/library/typing.html)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Pydantic Documentation](https://docs.pydantic.dev/)

#### Database
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

#### DevOps
- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [GitHub Actions](https://docs.github.com/en/actions)

### Lernpfade

#### Für neue Frontend-Entwickler
1. **Woche 1**: React Basics, TypeScript Grundlagen
2. **Woche 2**: Projekt-Setup, Komponenten-Architektur
3. **Woche 3**: State Management, API-Integration
4. **Woche 4**: Testing, Performance-Optimierung

#### Für neue Backend-Entwickler
1. **Woche 1**: Python Basics, FastAPI Einführung
2. **Woche 2**: Datenbank-Design, API-Entwicklung
3. **Woche 3**: Authentication, WebSockets
4. **Woche 4**: Testing, Deployment

#### Für neue DevOps-Engineers
1. **Woche 1**: Docker, Container-Orchestrierung
2. **Woche 2**: CI/CD-Pipelines, GitHub Actions
3. **Woche 3**: Monitoring, Logging
4. **Woche 4**: Security, Performance-Tuning

### Support & Hilfe

#### Erste Anlaufstellen
1. **Dokumentation**: Immer zuerst die Docs checken
2. **Team-Chat**: Schnelle Fragen im entsprechenden Channel
3. **Code Review**: Bei komplexeren Problemen
4. **Pair Programming**: Für schwierige Debugging-Sessions

#### Eskalationspfad
1. **Level 1**: Team-Kollegen
2. **Level 2**: Tech Lead
3. **Level 3**: Engineering Manager
4. **Level 4**: CTO

#### Externe Hilfe
- **Stack Overflow**: Für allgemeine Programmier-Fragen
- **GitHub Issues**: Für Framework-spezifische Probleme
- **Discord/Slack Communities**: Für Community-Support

### Onboarding-Checkliste

#### Erste Woche
- [ ] Entwicklungsumgebung eingerichtet
- [ ] Repository geklont und lokal lauffähig
- [ ] Zugang zu allen Tools und Services
- [ ] Team-Mitglieder kennengelernt
- [ ] Erste kleine Aufgabe abgeschlossen

#### Erste Monat
- [ ] Architektur verstanden
- [ ] Erste Feature implementiert
- [ ] Code Review durchgeführt
- [ ] Tests geschrieben
- [ ] Dokumentation beigetragen

#### Erste 3 Monate
- [ ] Eigenständige Feature-Entwicklung
- [ ] Mentoring neuer Entwickler
- [ ] Architektur-Entscheidungen mitgetroffen
- [ ] Performance-Optimierungen durchgeführt
- [ ] Deployment-Prozess verstanden

---

**Willkommen im Team! 🚀**

Bei Fragen oder Problemen zögern Sie nicht, das Team zu kontaktieren. Wir sind hier, um Ihnen zu helfen und freuen uns auf Ihre Beiträge zum Trusted Login System!
