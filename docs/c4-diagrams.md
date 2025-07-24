# C4 Architecture Diagrams - Trusted Login System

## Overview

This document contains C4 model diagrams for the Trusted Login System, providing a hierarchical view of the system architecture from high-level context down to detailed components.

## Level 1: System Context Diagram

```mermaid
C4Context
    title System Context Diagram - Trusted Login System

    Person(user, "End User", "Developer/Administrator using the workflow automation system")
    Person(teamMember, "Team Member", "External team member contributing to repositories")
    
    System(trustedLogin, "Trusted Login System", "Visual workflow automation platform with multi-repository integration")
    
    System_Ext(supabase, "Supabase", "Backend-as-a-Service providing authentication, database, and real-time features")
    System_Ext(externalRepos, "External Repositories", "Git repositories maintained by different teams")
    System_Ext(webServices, "Web Services", "External APIs and webhook endpoints")
    System_Ext(desktopSystem, "Desktop System", "Local desktop environment for screen capture and automation")
    
    Rel(user, trustedLogin, "Uses", "HTTPS/WebSocket")
    Rel(teamMember, externalRepos, "Maintains", "Git")
    Rel(trustedLogin, supabase, "Authenticates & stores data", "HTTPS/WebSocket")
    Rel(trustedLogin, externalRepos, "Syncs content", "Git/File System")
    Rel(trustedLogin, webServices, "Integrates via workflows", "HTTPS/WebSocket")
    Rel(trustedLogin, desktopSystem, "Captures & automates", "WebSocket/Native APIs")
```

## Level 2: Container Diagram

```mermaid
C4Container
    title Container Diagram - Trusted Login System

    Person(user, "End User")
    
    Container_Boundary(trustedLoginSystem, "Trusted Login System") {
        Container(webApp, "Web Application", "React + TypeScript", "Provides visual workflow builder and system management interface")
        Container(workflowEngine, "Workflow Engine", "JavaScript/TypeScript", "Executes node-based workflows and manages data flow")
        Container(repoManager, "Repository Manager", "Node.js Scripts", "Handles external repository synchronization and branch management")
        Container(desktopConnector, "Desktop Connector", "WebSocket Server", "Manages real-time desktop capture and automation")
    }
    
    System_Ext(supabase, "Supabase")
    System_Ext(externalRepos, "External Repositories")
    System_Ext(webServices, "Web Services")
    System_Ext(desktopSystem, "Desktop System")
    
    Rel(user, webApp, "Uses", "HTTPS")
    Rel(webApp, workflowEngine, "Triggers workflows", "JavaScript API")
    Rel(webApp, repoManager, "Manages repositories", "Node.js Scripts")
    Rel(webApp, desktopConnector, "Controls desktop", "WebSocket")
    
    Rel(webApp, supabase, "Authenticates", "HTTPS")
    Rel(workflowEngine, supabase, "Stores execution data", "HTTPS")
    Rel(repoManager, externalRepos, "Syncs", "Git/File System")
    Rel(workflowEngine, webServices, "Makes API calls", "HTTPS")
    Rel(desktopConnector, desktopSystem, "Captures screen", "Native APIs")
```

## Level 3: Component Diagram - Web Application

```mermaid
C4Component
    title Component Diagram - Web Application Container

    Container_Boundary(webApp, "Web Application") {
        Component(authComponent, "Authentication Component", "React + Supabase Auth", "Handles user login, registration, and session management")
        Component(dashboard, "Dashboard Component", "React", "Main navigation hub and system overview")
        Component(workflowBuilder, "Workflow Builder", "React + XYFlow", "Visual node-based workflow editor")
        Component(nodeManager, "Dynamic Node Manager", "React + TypeScript", "Manages workflow node types and configurations")
        Component(liveDesktop, "Live Desktop Component", "React + WebSocket", "Real-time desktop streaming and control")
        Component(monitoring, "Monitoring Component", "React + Charts", "System health and workflow execution monitoring")
        Component(settings, "Settings Component", "React", "System configuration and preferences")
        Component(uiComponents, "UI Components", "Shadcn/UI + Radix", "Reusable UI component library")
        Component(stateManager, "State Manager", "TanStack Query + Zustand", "Application state and API cache management")
        Component(router, "Router", "React Router", "Client-side routing and navigation")
    }
    
    Container_Ext(workflowEngine, "Workflow Engine")
    Container_Ext(desktopConnector, "Desktop Connector")
    System_Ext(supabase, "Supabase")
    
    Rel(authComponent, supabase, "Authenticates", "HTTPS")
    Rel(dashboard, stateManager, "Manages state")
    Rel(workflowBuilder, nodeManager, "Uses node types")
    Rel(workflowBuilder, workflowEngine, "Executes workflows")
    Rel(liveDesktop, desktopConnector, "Streams desktop", "WebSocket")
    Rel(monitoring, stateManager, "Displays metrics")
    Rel(settings, stateManager, "Updates config")
    
    Rel(dashboard, uiComponents, "Uses")
    Rel(workflowBuilder, uiComponents, "Uses")
    Rel(liveDesktop, uiComponents, "Uses")
    Rel(monitoring, uiComponents, "Uses")
    Rel(settings, uiComponents, "Uses")
    
    Rel(router, dashboard, "Routes to")
    Rel(router, workflowBuilder, "Routes to")
    Rel(router, liveDesktop, "Routes to")
    Rel(router, monitoring, "Routes to")
    Rel(router, settings, "Routes to")
```

## Level 3: Component Diagram - Workflow Engine

```mermaid
C4Component
    title Component Diagram - Workflow Engine Container

    Container_Boundary(workflowEngine, "Workflow Engine") {
        Component(nodeExecutor, "Node Executor", "TypeScript", "Executes individual workflow nodes and handles data transformation")
        Component(dataFlowManager, "Data Flow Manager", "TypeScript", "Manages data packets between nodes and validates connections")
        Component(triggerManager, "Trigger Manager", "TypeScript", "Handles workflow triggers (webhook, schedule, manual, file watch)")
        Component(nodeRegistry, "Node Registry", "TypeScript", "Registry of available node types and their configurations")
        Component(executionEngine, "Execution Engine", "TypeScript", "Orchestrates workflow execution and manages execution context")
        Component(errorHandler, "Error Handler", "TypeScript", "Handles workflow errors and provides graceful degradation")
        Component(webhookServer, "Webhook Server", "Express.js", "HTTP server for webhook triggers")
        Component(scheduler, "Scheduler", "Node.js", "Handles scheduled workflow executions")
    }
    
    Container_Ext(webApp, "Web Application")
    System_Ext(supabase, "Supabase")
    System_Ext(webServices, "Web Services")
    
    Rel(webApp, executionEngine, "Triggers execution")
    Rel(executionEngine, nodeExecutor, "Executes nodes")
    Rel(nodeExecutor, dataFlowManager, "Passes data")
    Rel(executionEngine, triggerManager, "Handles triggers")
    Rel(nodeExecutor, nodeRegistry, "Gets node config")
    Rel(executionEngine, errorHandler, "Handles errors")
    
    Rel(triggerManager, webhookServer, "Webhook triggers")
    Rel(triggerManager, scheduler, "Scheduled triggers")
    
    Rel(executionEngine, supabase, "Stores execution logs")
    Rel(nodeExecutor, webServices, "Makes API calls")
```

## Level 3: Component Diagram - Repository Manager

```mermaid
C4Component
    title Component Diagram - Repository Manager Container

    Container_Boundary(repoManager, "Repository Manager") {
        Component(syncEngine, "Sync Engine", "Node.js", "Handles repository synchronization and content filtering")
        Component(branchManager, "Branch Manager", "Node.js", "Manages branch operations across multiple repositories")
        Component(configManager, "Config Manager", "Node.js", "Manages external repository configurations and settings")
        Component(contentFilter, "Content Filter", "Node.js", "Applies include/exclude patterns for selective content sync")
        Component(conflictResolver, "Conflict Resolver", "Node.js", "Handles merge conflicts and resolution strategies")
        Component(updateScheduler, "Update Scheduler", "GitHub Actions", "Schedules automated repository updates")
        Component(teamCoordinator, "Team Coordinator", "Node.js", "Manages team attribution and coordination")
    }
    
    Container_Ext(webApp, "Web Application")
    System_Ext(externalRepos, "External Repositories")
    System_Ext(githubActions, "GitHub Actions")
    
    Rel(webApp, configManager, "Manages config")
    Rel(syncEngine, contentFilter, "Filters content")
    Rel(syncEngine, conflictResolver, "Resolves conflicts")
    Rel(branchManager, syncEngine, "Syncs branches")
    Rel(configManager, syncEngine, "Provides config")
    Rel(teamCoordinator, configManager, "Coordinates teams")
    
    Rel(syncEngine, externalRepos, "Syncs content", "Git")
    Rel(updateScheduler, githubActions, "Triggers updates")
    Rel(updateScheduler, syncEngine, "Schedules sync")
```

## Data Flow Diagram

```mermaid
flowchart TD
    A[User Interaction] --> B[React Components]
    B --> C[State Management]
    C --> D[API Layer]
    D --> E[Supabase Backend]
    
    F[Workflow Trigger] --> G[Trigger Manager]
    G --> H[Execution Engine]
    H --> I[Node Executor]
    I --> J[Data Flow Manager]
    J --> K[External Services]
    
    L[Repository Update] --> M[Sync Engine]
    M --> N[Content Filter]
    N --> O[Local Integration]
    O --> B
    
    P[Desktop Capture] --> Q[WebSocket Server]
    Q --> R[Desktop Connector]
    R --> B
    
    S[Webhook Request] --> T[Webhook Server]
    T --> G
    
    U[Scheduled Task] --> V[Scheduler]
    V --> G
    
    style A fill:#e1f5fe
    style F fill:#f3e5f5
    style L fill:#e8f5e8
    style P fill:#fff3e0
    style S fill:#fce4ec
    style U fill:#f1f8e9
```

## Deployment Architecture

```mermaid
C4Deployment
    title Deployment Diagram - Trusted Login System

    Deployment_Node(userDevice, "User Device", "Windows/macOS/Linux") {
        Container(browser, "Web Browser", "Chrome/Firefox/Safari", "Runs the React application")
        Container(desktopAgent, "Desktop Agent", "WebSocket Client", "Handles desktop capture and automation")
    }
    
    Deployment_Node(developmentEnv, "Development Environment", "Local Machine") {
        Container(viteServer, "Vite Dev Server", "Node.js", "Development server with HMR")
        Container(localScripts, "Local Scripts", "Node.js", "Repository management and build scripts")
    }
    
    Deployment_Node(supabaseCloud, "Supabase Cloud", "Cloud Infrastructure") {
        Container(authService, "Auth Service", "Supabase Auth", "User authentication and session management")
        Container(database, "PostgreSQL Database", "Supabase DB", "Application data storage")
        Container(realtimeService, "Realtime Service", "Supabase Realtime", "WebSocket connections")
    }
    
    Deployment_Node(githubInfra, "GitHub Infrastructure", "Cloud") {
        Container(githubActions, "GitHub Actions", "CI/CD", "Automated repository synchronization")
        Container(repositories, "Git Repositories", "GitHub", "Source code and external repositories")
    }
    
    Rel(browser, viteServer, "Loads app", "HTTPS")
    Rel(browser, authService, "Authenticates", "HTTPS")
    Rel(browser, database, "Stores/retrieves data", "HTTPS")
    Rel(browser, realtimeService, "Real-time updates", "WebSocket")
    Rel(desktopAgent, browser, "Desktop data", "WebSocket")
    
    Rel(localScripts, repositories, "Syncs repositories", "Git")
    Rel(githubActions, repositories, "Automated updates", "Git")
    Rel(localScripts, githubActions, "Triggers workflows", "GitHub API")
```

## Security Architecture

```mermaid
flowchart TB
    subgraph "Security Layers"
        A[Authentication Layer]
        B[Authorization Layer]
        C[Data Protection Layer]
        D[Network Security Layer]
    end
    
    subgraph "Authentication Components"
        A1[Supabase Auth]
        A2[Session Management]
        A3[Token Refresh]
    end
    
    subgraph "Authorization Components"
        B1[Route Guards]
        B2[API Permissions]
        B3[Resource Access Control]
    end
    
    subgraph "Data Protection"
        C1[Input Validation]
        C2[Data Encryption]
        C3[Secure Storage]
    end
    
    subgraph "Network Security"
        D1[HTTPS/TLS]
        D2[WebSocket Security]
        D3[CORS Configuration]
    end
    
    A --> A1
    A --> A2
    A --> A3
    
    B --> B1
    B --> B2
    B --> B3
    
    C --> C1
    C --> C2
    C --> C3
    
    D --> D1
    D --> D2
    D --> D3
    
    style A fill:#ffebee
    style B fill:#e8f5e8
    style C fill:#e3f2fd
    style D fill:#fff3e0
```

## Technology Stack Overview

```mermaid
graph TB
    subgraph "Frontend Stack"
        F1[React 18]
        F2[TypeScript]
        F3[Vite]
        F4[Tailwind CSS]
        F5[Shadcn/UI]
        F6[XYFlow]
    end
    
    subgraph "State Management"
        S1[TanStack Query]
        S2[Zustand]
        S3[React Router]
    end
    
    subgraph "Backend Services"
        B1[Supabase Auth]
        B2[Supabase Database]
        B3[Supabase Realtime]
    end
    
    subgraph "Development Tools"
        D1[ESLint]
        D2[TypeScript Compiler]
        D3[PostCSS]
        D4[Node.js Scripts]
    end
    
    subgraph "External Integrations"
        E1[Git Repositories]
        E2[GitHub Actions]
        E3[WebSocket APIs]
        E4[REST APIs]
    end
    
    F1 --> S1
    F2 --> D2
    F3 --> D3
    F4 --> F5
    F6 --> F1
    
    S1 --> B1
    S2 --> B2
    S3 --> B3
    
    D4 --> E1
    E2 --> E1
    B3 --> E3
    S1 --> E4
    
    style F1 fill:#61dafb
    style F2 fill:#3178c6
    style B1 fill:#3ecf8e
    style E1 fill:#f05032
```

---

## Notes

- **C4 Model Levels**: Context → Container → Component → Code
- **Mermaid Syntax**: Used for diagram generation and documentation
- **Security Focus**: Authentication, authorization, and data protection layers
- **Scalability**: Modular architecture supporting horizontal scaling
- **Integration**: Multi-repository workflow with external service integration

These diagrams provide a comprehensive view of the system architecture, from high-level context down to detailed component interactions, following C4 modeling best practices for software architecture documentation.