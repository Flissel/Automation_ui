# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Trusted Login System is a modern authentication and desktop automation platform combining secure authentication with advanced desktop integration capabilities. The system enables:

- **Desktop Streaming**: Real-time desktop screen capture and streaming via WebSocket
- **Multi-Monitor Support**: Simultaneous streaming from multiple desktop clients
- **Workflow Automation**: Node-based workflow system for desktop automation tasks
- **OCR Integration**: Text extraction from desktop screens using OCR regions
- **Remote Desktop Control**: Click actions, text input, and keyboard control
- **Supabase Integration**: Edge functions for WebSocket relay and processing

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** (dev server on port 8080)
- **Tailwind CSS** + shadcn/ui components
- **Zustand** for state management
- **React Query** (@tanstack/react-query) for API/data fetching
- **React Router** for navigation
- **Playwright** for E2E testing

### Backend/Infrastructure
- **Supabase** Edge Functions (Deno runtime)
  - `live-desktop-stream`: Main WebSocket relay for desktop streaming
  - `desktop-actions`: Desktop control commands
  - `ocr-processor`: OCR text extraction
  - `filesystem-bridge`: File operations
- **PostgreSQL** (via Supabase)
- **WebSockets** for real-time communication

## Development Commands

### Core Commands
```bash
# Start development server (runs on http://0.0.0.0:8080)
npm run dev

# Build for production
npm run build

# Build in development mode
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm run preview
```

### External Repository Management
The project uses external repositories managed via scripts:
```bash
# Update external repositories from config/external-repos.json
npm run update-external

# Force update even if no changes detected
npm run update-external:force

# Update with verbose logging
npm run update-external:verbose
```

### Branch Management
```bash
# List all branches
npm run branch:list

# Switch between branches
npm run branch:switch

# Create new branch
npm run branch:create

# Update branch
npm run branch:update
```

### Testing
```bash
# Run Playwright E2E tests (default baseURL: http://localhost:5174)
npx playwright test

# Run tests in UI mode
npx playwright test --ui

# Run tests in specific browser
npx playwright test --project=chromium
```

## Architecture

### WebSocket Communication Pattern

The system uses a **relay architecture** for desktop streaming:

1. **Desktop Clients** (Python/external agents) connect to Supabase Edge Function with `client_type=desktop`
2. **Web Clients** (React frontend) connect with `client_type=web`
3. **Edge Function** (`live-desktop-stream`) acts as relay between desktop and web clients

**Important**: All WebSocket connections MUST go through the centralized configuration in `src/config/websocketConfig.ts`. This file provides:
- Base URL configuration (Supabase Edge Function URL)
- Client factory functions (`createWebClient`, `createMultiDesktopClient`, etc.)
- Handshake message standardization
- Connection utilities

**WebSocket Message Flow**:
```
Desktop Client → Edge Function → Web Client (for frames)
Web Client → Edge Function → Desktop Client (for commands)
```

**Key Message Types**:
- `handshake`: Client identification and capabilities
- `start_capture`/`stop_capture`: Control desktop streaming
- `frame_data`: Desktop screen frames (base64 encoded)
- `mouse_click`/`keyboard_input`: Remote control actions
- `start_ocr_extraction`/`stop_ocr_extraction`: OCR control
- `get_desktop_clients`: Request list of available desktop clients

### Directory Structure

```
src/
├── components/          # React components (shadcn/ui based)
│   └── layout/         # Navigation and layout components
├── config/             # Configuration files
│   └── websocketConfig.ts  # CENTRALIZED WebSocket config (MUST use this!)
├── hooks/              # React custom hooks
├── integrations/
│   └── supabase/       # Supabase client and types
├── lib/                # Utility libraries
├── pages/              # Route pages
│   ├── Dashboard.tsx
│   ├── LiveDesktop.tsx         # Single desktop stream viewer
│   ├── MultiDesktopStreams.tsx # Multiple desktop streams grid
│   ├── VirtualDesktops.tsx     # Virtual desktop management
│   ├── Workflow.tsx            # Workflow automation UI
│   └── Auth.tsx
├── services/           # Service layer for API/WebSocket communication
│   ├── desktopStreamService.ts     # Desktop streaming commands
│   ├── liveDesktopService.ts       # Live desktop integration
│   ├── desktopControlService.ts    # Remote control actions
│   ├── virtualDesktopManager.ts    # Virtual desktop management
│   └── filesystemBridge.ts         # File operations
├── stores/             # Zustand state management
│   └── workflowStore.ts
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── workflows/          # Workflow system (see workflows/README.md)
│   └── README.md       # Comprehensive workflow documentation
└── App.tsx             # Main app component with routing

supabase/
├── functions/          # Edge Functions (Deno)
│   ├── live-desktop-stream/    # Main WebSocket relay
│   ├── desktop-actions/
│   ├── ocr-processor/
│   └── filesystem-bridge/
└── config.toml         # Supabase configuration (project: dgzreelowtzquljhxskq)

scripts/
├── update-external-repos.js    # External repo management
└── branch-manager.js           # Git branch utilities
```

### Workflow System

The project includes a comprehensive node-based workflow system located in `src/workflows/`. **IMPORTANT**: Read `src/workflows/README.md` for complete documentation.

**Supported Node Types** (14 total):
- Trigger: `manual_trigger`, `webhook_trigger`
- Configuration: `websocket_config`
- Interface: `live_desktop`
- Actions: `click_action`, `type_text_action`, `http_request_action`, `delay`
- Logic: `if_condition`
- OCR: `ocr_region`, `ocr_extract`
- Integration: `n8n_webhook`, `send_to_filesystem`
- Results: `workflow_result`

**Key Workflow Files**:
- `exampleWorkflows.ts`: Pre-designed workflow templates
- `workflowValidator.ts`: Node compatibility validation
- `workflowManager.ts`: Execution coordinator
- `workflowUtils.ts`: Execution utilities

### Service Layer Pattern

Services in `src/services/` follow a static class pattern:

```typescript
export class DesktopStreamService {
  static startStream(websocket: WebSocket, desktopClientId: string, monitorId?: string): boolean {
    // Send command via WebSocket
  }

  static stopStream(websocket: WebSocket, desktopClientId: string): boolean {
    // Send command via WebSocket
  }
}
```

All WebSocket communication should use `sendWebSocketMessage()` from `websocketConfig.ts`.

### Import Aliases

The project uses `@/` for absolute imports:
```typescript
import { Button } from '@/components/ui/button';
import { DesktopStreamService } from '@/services/desktopStreamService';
import { createWebClient } from '@/config/websocketConfig';
```

## Key Development Patterns

### WebSocket Connection Setup

**ALWAYS use the centralized WebSocket config**:

#### Option 1: Manual WebSocket Management (Legacy)

```typescript
import { createWebClient, sendWebSocketMessage } from '@/config/websocketConfig';

// Create WebSocket client with standardized config
const { websocket, handshakeMessage, clientId } = createWebClient('ComponentName');

websocket.onopen = () => {
  sendWebSocketMessage(websocket, handshakeMessage);
};

websocket.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'frame_data':
      // Handle desktop frame
      break;
    case 'desktop_clients_list':
      // Handle available desktop clients
      break;
  }
};
```

#### Option 2: Automatic Reconnection Hook (Recommended)

For production-ready WebSocket connections with automatic reconnection, exponential backoff, and connection status management:

```typescript
import { useWebSocketReconnect } from '@/hooks/useWebSocketReconnect';
import { createMultiDesktopClientUrl } from '@/config/websocketConfig';
import { ConnectionStatusIndicator } from '@/components/ui/connection-status';

const MyComponent = () => {
  const { url, handshakeMessage } = createMultiDesktopClientUrl('my_component');

  const {
    websocket,
    status,
    isConnected,
    reconnectAttempt,
    lastError,
    sendMessage,
    reconnect,
    disconnect,
  } = useWebSocketReconnect({
    url,
    handshakeMessage,
    onOpen: (ws) => {
      console.log('Connected!');
      sendMessage({ type: 'get_desktop_clients' });
    },
    onMessage: (event, ws) => {
      const message = JSON.parse(event.data);
      // Handle messages
    },
  });

  return (
    <>
      <ConnectionStatusIndicator
        status={status}
        reconnectAttempt={reconnectAttempt}
        lastError={lastError}
        onReconnect={reconnect}
      />
      {/* Your component UI */}
    </>
  );
};
```

**Reconnection Features:**
- Automatic reconnection with exponential backoff (5s → 10s → 20s → 40s → 60s)
- Configurable max attempts (default: 10)
- Preserves handshake and state across reconnections
- Visual connection status indicators
- Manual reconnect/disconnect controls
- See `src/hooks/useWebSocketReconnect.example.tsx` for detailed examples

### Desktop Client Management

To get list of available desktop clients:
```typescript
import { DesktopStreamService } from '@/services/desktopStreamService';

DesktopStreamService.getDesktopClients(websocket);
```

To start/stop streaming:
```typescript
// Start stream from specific desktop client and monitor
DesktopStreamService.startStream(websocket, 'desktop_001', 'monitor_0');

// Stop stream
DesktopStreamService.stopStream(websocket, 'desktop_001');
```

### Mock Desktop Clients

The Edge Function provides mock desktop clients for testing when no real desktop clients are connected:
- `desktop_001`: Main Workstation (2 monitors)
- `desktop_002`: Development PC (1 monitor)
- `desktop_003`: Test Machine (2 monitors)

Mock clients send SVG-based frames with timestamps for visual testing.

### Component Development

The project uses shadcn/ui components. When adding new UI components:

1. Components are in `src/components/ui/`
2. Follow the shadcn/ui pattern with Radix UI primitives
3. Use Tailwind CSS for styling with `cn()` utility for conditional classes
4. TypeScript is required for all components

### State Management

- **Zustand** for global state (currently minimal, mainly `workflowStore`)
- **React Query** for server state and caching
- Local component state for UI-specific state

## Important Notes

### WebSocket URLs
- **DO NOT hardcode WebSocket URLs** in components
- **ALWAYS import from** `@/config/websocketConfig.ts`
- Edge Function URL format: `wss://{project-id}.supabase.co/functions/v1/{endpoint}`
- Current project ID: `dgzreelowtzquljhxskq`

### Environment Variables
- Vite environment variables use `VITE_` prefix
- Main variables: `VITE_BACKEND_URL`, `VITE_WS_URL`, `VITE_ENV`
- See `.env.example` for reference

### Git Pre-commit Hooks
The project uses Husky for git hooks with lint-staged:
- ESLint auto-fix on `.{js,jsx,ts,tsx}` files
- Prettier formatting on `.{js,jsx,ts,tsx,json,css,md}` files

### External Repository System
The project can pull code from external repositories defined in `config/external-repos.json`. This supports selective file copying with include/exclude patterns.

### Testing Considerations
- Playwright tests expect dev server on `http://localhost:5174` (note: different from Vite default port 8080)
- Tests run against Chromium, Firefox, and WebKit
- Update `playwright.config.ts` if changing ports

## Common Tasks

### Adding a New Page/Route
1. Create component in `src/pages/`
2. Add route in `src/App.tsx` ABOVE the catch-all `*` route
3. Add navigation link in `src/components/layout/Navigation.tsx`

### Adding a New Desktop Command
1. Add command type to `DesktopStreamService` in `src/services/desktopStreamService.ts`
2. Implement handler in `supabase/functions/live-desktop-stream/index.ts`
3. Update desktop client (external) to handle new command

### Working with Workflows
1. Review `src/workflows/README.md` for comprehensive documentation
2. Use pre-designed templates from `exampleWorkflows.ts`
3. Validate workflows with `WorkflowValidator` before execution
4. Reference node compatibility matrix for valid connections

### Debugging WebSocket Issues
1. Check `websocketConfig.ts` for correct base URL
2. Verify Edge Function is deployed and accessible
3. Check browser console for WebSocket connection errors
4. Use mock desktop clients for testing frontend without real desktop agents
5. Monitor Edge Function logs in Supabase dashboard
