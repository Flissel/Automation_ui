# TRAE Unity AI Platform - Running Document

## Current System Status (2025-01-04)

### ✅ Working Components

#### Backend Services (All Healthy)
- **API Gateway**: `http://localhost:8090` - ✅ Healthy
- **Virtual Desktop Service**: `http://localhost:8000` - ✅ Healthy
- **Workflow Orchestrator**: `http://localhost:8001` - ✅ Healthy  
- **Desktop Automation**: `http://localhost:8002` - ✅ Healthy
- **OCR Processor**: `http://localhost:8003` - ✅ Healthy

#### Database Services
- **PostgreSQL**: `localhost:5432` - ✅ Healthy
- **Redis**: `localhost:6379` - ✅ Healthy

#### Frontend Application
- **Main Frontend**: `http://localhost:3001` - ✅ Running (Vite dev server)
- **Authentication**: ✅ Working (Supabase integration)

#### Docker Infrastructure
- All containers running and healthy
- No critical errors in logs
- Services properly communicating

### 🔧 Recent Fixes Applied
1. Fixed function name mismatches in `virtual-desktop-service.ts` and `workflow-orchestrator.ts`
2. Resolved `handleHealth` errors by correcting function calls
3. Rebuilt and restarted Docker containers
4. Started frontend on port 3001 to avoid conflicts

### 🎯 User Requirements Analysis

#### Core Functionality Needed:
1. **Desktop Streaming with Virtual Desktops**
   - Stream applications to Docker containers
   - Use clean/new Windows virtual desktops for each stream
   - Split applications across different desktops

2. **OCR Zone Management**
   - Place OCR zones on Docker-streamed content
   - Send OCR data at intervals to Redis stream or webhook
   - Real-time data processing

3. **Multi-Desktop Management**
   - Manage multiple virtual desktop environments
   - Stream different parts of desktop to different containers
   - Clean environment for each stream

### 🚧 Current Gaps & Issues

#### Missing/Incomplete Features:
1. **Virtual Desktop Creation**: No Windows virtual desktop integration
2. **Desktop Streaming**: No actual desktop capture/streaming implementation
3. **OCR Zone UI**: No interface for placing/managing OCR zones
4. **Redis Streaming**: No OCR data streaming to Redis
5. **Docker Integration**: No desktop-to-docker streaming

#### Frontend Issues:
1. Currently shows auth page (Supabase) - needs backend integration
2. Dashboard exists but needs real data integration
3. Virtual Desktop page needs implementation
4. OCR zone management UI missing

### 📋 Implementation Plan

#### Phase 1: Backend Integration
- [ ] Replace Supabase with real backend services
- [ ] Implement authentication with existing backend
- [ ] Connect frontend to backend APIs

#### Phase 2: Virtual Desktop Management
- [ ] Implement Windows virtual desktop creation/management
- [ ] Create desktop capture service
- [ ] Implement desktop streaming to Docker

#### Phase 3: OCR Zone System
- [ ] Build OCR zone placement UI
- [ ] Implement OCR processing pipeline
- [ ] Create Redis streaming for OCR data
- [ ] Add webhook support for OCR data

#### Phase 4: Multi-Desktop Streaming
- [ ] Implement multi-desktop view
- [ ] Create desktop splitting functionality
- [ ] Add real-time monitoring

### 🔍 Technical Architecture

#### Current Stack:
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Deno + TypeScript (microservices)
- **Database**: PostgreSQL + Redis
- **Infrastructure**: Docker + Docker Compose
- **Authentication**: Currently Supabase (to be replaced)

#### Required Integrations:
- Windows Virtual Desktop API
- Desktop capture (likely using native Windows APIs)
- OCR processing (Tesseract or similar)
- WebSocket for real-time streaming
- Redis streams for data pipeline

### 🧪 Testing Strategy
- Use Playwright for frontend testing
- Test each component individually
- Verify business logic thoroughly
- Test desktop streaming functionality
- Validate OCR zone placement and data flow

### 📝 Next Steps
1. Analyze current frontend pages and components
2. Test backend API endpoints
3. Implement virtual desktop management
4. Create desktop streaming proof of concept
5. Build OCR zone management system

---
*Last Updated: 2025-01-04*
*Status: System healthy, ready for feature implementation*




[{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/api/gateway.ts",
	"owner": "typescript",
	"code": "2307",
	"severity": 8,
	"message": "Cannot find module 'https://deno.land/std@0.168.0/http/server.ts' or its corresponding type declarations.",
	"source": "ts",
	"startLineNumber": 1,
	"startColumn": 23,
	"endLineNumber": 1,
	"endColumn": 69,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/api/gateway.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 10,
	"startColumn": 37,
	"endLineNumber": 10,
	"endColumn": 41,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/api/gateway.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 11,
	"startColumn": 35,
	"endLineNumber": 11,
	"endColumn": 39,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/api/gateway.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 12,
	"startColumn": 32,
	"endLineNumber": 12,
	"endColumn": 36,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/api/gateway.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 13,
	"startColumn": 27,
	"endLineNumber": 13,
	"endColumn": 31,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/api/gateway.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 52,
	"startColumn": 31,
	"endLineNumber": 52,
	"endColumn": 35,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/desktop-automation-service.ts",
	"owner": "typescript",
	"code": "2307",
	"severity": 8,
	"message": "Cannot find module 'https://deno.land/std@0.168.0/http/server.ts' or its corresponding type declarations.",
	"source": "ts",
	"startLineNumber": 4,
	"startColumn": 23,
	"endLineNumber": 4,
	"endColumn": 69,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/desktop-automation-service.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 203,
	"startColumn": 27,
	"endLineNumber": 203,
	"endColumn": 31,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/desktop-automation-service.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 239,
	"startColumn": 27,
	"endLineNumber": 239,
	"endColumn": 31,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/desktop-automation-service.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 273,
	"startColumn": 27,
	"endLineNumber": 273,
	"endColumn": 31,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/desktop-automation-service.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 310,
	"startColumn": 27,
	"endLineNumber": 310,
	"endColumn": 31,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/desktop-automation-service.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 324,
	"startColumn": 31,
	"endLineNumber": 324,
	"endColumn": 35,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/desktop-automation-service.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 328,
	"startColumn": 13,
	"endLineNumber": 328,
	"endColumn": 17,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/desktop-automation-service.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 352,
	"startColumn": 27,
	"endLineNumber": 352,
	"endColumn": 31,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/desktop-automation-service.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 436,
	"startColumn": 23,
	"endLineNumber": 436,
	"endColumn": 27,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/ocr-processor-service.ts",
	"owner": "typescript",
	"code": "2307",
	"severity": 8,
	"message": "Cannot find module 'https://deno.land/std@0.168.0/http/server.ts' or its corresponding type declarations.",
	"source": "ts",
	"startLineNumber": 4,
	"startColumn": 23,
	"endLineNumber": 4,
	"endColumn": 69,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/ocr-processor-service.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 57,
	"startColumn": 13,
	"endLineNumber": 57,
	"endColumn": 17,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/ocr-processor-service.ts",
	"owner": "typescript",
	"code": "2322",
	"severity": 8,
	"message": "Type '{ processingTime: number; success?: boolean | undefined; text?: string | undefined; regions?: OCRRegionResult[] | undefined; confidence?: number | undefined; error?: string | undefined; }' is not assignable to type 'OCRResponse'.\n  Types of property 'success' are incompatible.\n    Type 'boolean | undefined' is not assignable to type 'boolean'.\n      Type 'undefined' is not assignable to type 'boolean'.",
	"source": "ts",
	"startLineNumber": 159,
	"startColumn": 13,
	"endLineNumber": 159,
	"endColumn": 21,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/ocr-processor-service.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 249,
	"startColumn": 13,
	"endLineNumber": 249,
	"endColumn": 17,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/ocr-processor-service.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 277,
	"startColumn": 27,
	"endLineNumber": 277,
	"endColumn": 31,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/ocr-processor-service.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 291,
	"startColumn": 33,
	"endLineNumber": 291,
	"endColumn": 37,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/ocr-processor-service.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 316,
	"startColumn": 13,
	"endLineNumber": 316,
	"endColumn": 17,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/ocr-processor-service.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 333,
	"startColumn": 35,
	"endLineNumber": 333,
	"endColumn": 39,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/ocr-processor-service.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 418,
	"startColumn": 28,
	"endLineNumber": 418,
	"endColumn": 32,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/ocr-processor-service.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 426,
	"startColumn": 15,
	"endLineNumber": 426,
	"endColumn": 19,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/ocr-processor-service.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 435,
	"startColumn": 23,
	"endLineNumber": 435,
	"endColumn": 27,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/virtual-desktop-service.ts",
	"owner": "typescript",
	"code": "2307",
	"severity": 8,
	"message": "Cannot find module 'https://deno.land/std@0.168.0/http/server.ts' or its corresponding type declarations.",
	"source": "ts",
	"startLineNumber": 1,
	"startColumn": 23,
	"endLineNumber": 1,
	"endColumn": 69,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/virtual-desktop-service.ts",
	"owner": "typescript",
	"code": "2307",
	"severity": 8,
	"message": "Cannot find module 'https://esm.sh/@supabase/supabase-js@2.50.3' or its corresponding type declarations.",
	"source": "ts",
	"startLineNumber": 2,
	"startColumn": 30,
	"endLineNumber": 2,
	"endColumn": 75,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/virtual-desktop-service.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 10,
	"startColumn": 3,
	"endLineNumber": 10,
	"endColumn": 7,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/virtual-desktop-service.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 11,
	"startColumn": 3,
	"endLineNumber": 11,
	"endColumn": 7,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/virtual-desktop-service.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 59,
	"startColumn": 31,
	"endLineNumber": 59,
	"endColumn": 35,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/virtual-desktop-service.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 161,
	"startColumn": 32,
	"endLineNumber": 161,
	"endColumn": 36,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/virtual-desktop-service.ts",
	"owner": "typescript",
	"code": "2345",
	"severity": 8,
	"message": "Argument of type '{ success: boolean; error: string; programPath?: undefined; message?: undefined; timestamp?: undefined; } | { success: boolean; programPath: string; message: string; timestamp: string; error?: undefined; }' is not assignable to parameter of type 'never'.\n  Type '{ success: boolean; error: string; programPath?: undefined; message?: undefined; timestamp?: undefined; }' is not assignable to type 'never'.",
	"source": "ts",
	"startLineNumber": 246,
	"startColumn": 18,
	"endLineNumber": 246,
	"endColumn": 30,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/virtual-desktop-service.ts",
	"owner": "typescript",
	"code": "2345",
	"severity": 8,
	"message": "Argument of type '{ success: boolean; error: string; imageData?: undefined; dimensions?: undefined; timestamp?: undefined; } | { success: boolean; imageData: string; dimensions: { width: number; height: number; }; timestamp: string; error?: undefined; }' is not assignable to parameter of type 'never'.\n  Type '{ success: boolean; error: string; imageData?: undefined; dimensions?: undefined; timestamp?: undefined; }' is not assignable to type 'never'.",
	"source": "ts",
	"startLineNumber": 257,
	"startColumn": 18,
	"endLineNumber": 257,
	"endColumn": 34,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/virtual-desktop-service.ts",
	"owner": "typescript",
	"code": "2345",
	"severity": 8,
	"message": "Argument of type '{ success: boolean; error: string; actionId?: undefined; actionType?: undefined; result?: undefined; timestamp?: undefined; } | { success: boolean; actionId: string; actionType: \"click\" | \"type\" | \"screenshot\" | \"wait\" | \"launch_program\" | \"analyze_screen\"; result: string; timestamp: string; error?: undefined; }' is not assignable to parameter of type 'never'.\n  Type '{ success: boolean; error: string; actionId?: undefined; actionType?: undefined; result?: undefined; timestamp?: undefined; }' is not assignable to type 'never'.",
	"source": "ts",
	"startLineNumber": 262,
	"startColumn": 20,
	"endLineNumber": 262,
	"endColumn": 32,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/virtual-desktop-service.ts",
	"owner": "typescript",
	"code": "2345",
	"severity": 8,
	"message": "Argument of type '{ success: boolean; analysisType: string; regions: any; ocrResults: string[]; insights: string[]; timestamp: string; }' is not assignable to parameter of type 'never'.",
	"source": "ts",
	"startLineNumber": 271,
	"startColumn": 20,
	"endLineNumber": 271,
	"endColumn": 34,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/virtual-desktop-service.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'handleCreateDesktop'.",
	"source": "ts",
	"startLineNumber": 433,
	"startColumn": 20,
	"endLineNumber": 433,
	"endColumn": 39,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/virtual-desktop-service.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'handleConnectDesktop'.",
	"source": "ts",
	"startLineNumber": 437,
	"startColumn": 20,
	"endLineNumber": 437,
	"endColumn": 40,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/virtual-desktop-service.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'handleStartWorkflow'.",
	"source": "ts",
	"startLineNumber": 441,
	"startColumn": 20,
	"endLineNumber": 441,
	"endColumn": 39,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/workflow-orchestrator.ts",
	"owner": "typescript",
	"code": "2307",
	"severity": 8,
	"message": "Cannot find module 'https://deno.land/std@0.168.0/http/server.ts' or its corresponding type declarations.",
	"source": "ts",
	"startLineNumber": 1,
	"startColumn": 23,
	"endLineNumber": 1,
	"endColumn": 69,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/workflow-orchestrator.ts",
	"owner": "typescript",
	"code": "2307",
	"severity": 8,
	"message": "Cannot find module 'https://esm.sh/@supabase/supabase-js@2.50.3' or its corresponding type declarations.",
	"source": "ts",
	"startLineNumber": 2,
	"startColumn": 30,
	"endLineNumber": 2,
	"endColumn": 75,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/workflow-orchestrator.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 10,
	"startColumn": 3,
	"endLineNumber": 10,
	"endColumn": 7,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/workflow-orchestrator.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 11,
	"startColumn": 3,
	"endLineNumber": 11,
	"endColumn": 7,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/workflow-orchestrator.ts",
	"owner": "typescript",
	"code": "2304",
	"severity": 8,
	"message": "Cannot find name 'Deno'.",
	"source": "ts",
	"startLineNumber": 89,
	"startColumn": 31,
	"endLineNumber": 89,
	"endColumn": 35,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/backend/services/workflow-orchestrator.ts",
	"owner": "typescript",
	"code": "2367",
	"severity": 8,
	"message": "This comparison appears to be unintentional because the types '\"running\"' and '\"cancelled\"' have no overlap.",
	"source": "ts",
	"startLineNumber": 488,
	"startColumn": 11,
	"endLineNumber": 488,
	"endColumn": 43,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/liveDesktop/MultiDesktopStreamGrid.tsx",
	"owner": "typescript",
	"code": "2353",
	"severity": 8,
	"message": "Object literal may only specify known properties, and 'format' does not exist in type '{ fps: number; quality: number; scale: number; }'.",
	"source": "ts",
	"startLineNumber": 182,
	"startColumn": 11,
	"endLineNumber": 182,
	"endColumn": 17,
	"relatedInformation": [
		{
			"startLineNumber": 11,
			"startColumn": 3,
			"endLineNumber": 11,
			"endColumn": 12,
			"message": "The expected type comes from property 'streaming' which is declared here on type 'LiveDesktopConfig'",
			"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/types/liveDesktop.ts"
		}
	],
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/liveDesktop/MultiDesktopStreamGrid.tsx",
	"owner": "typescript",
	"code": "2353",
	"severity": 8,
	"message": "Object literal may only specify known properties, and 'autoReconnect' does not exist in type '{ timeout: number; maxReconnectAttempts: number; reconnectInterval: number; }'.",
	"source": "ts",
	"startLineNumber": 185,
	"startColumn": 11,
	"endLineNumber": 185,
	"endColumn": 24,
	"relatedInformation": [
		{
			"startLineNumber": 16,
			"startColumn": 3,
			"endLineNumber": 16,
			"endColumn": 13,
			"message": "The expected type comes from property 'connection' which is declared here on type 'LiveDesktopConfig'",
			"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/types/liveDesktop.ts"
		}
	],
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/liveDesktop/MultiDesktopStreamGrid.tsx",
	"owner": "typescript",
	"code": "2353",
	"severity": 8,
	"message": "Object literal may only specify known properties, and 'regions' does not exist in type '{ enabled: boolean; extractionInterval: number; n8nWebhookUrl?: string; autoSend: boolean; }'.",
	"source": "ts",
	"startLineNumber": 190,
	"startColumn": 11,
	"endLineNumber": 190,
	"endColumn": 18,
	"relatedInformation": [
		{
			"startLineNumber": 21,
			"startColumn": 3,
			"endLineNumber": 21,
			"endColumn": 6,
			"message": "The expected type comes from property 'ocr' which is declared here on type 'LiveDesktopConfig'",
			"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/types/liveDesktop.ts"
		}
	],
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/liveDesktop/MultiDesktopStreamGrid.tsx",
	"owner": "typescript",
	"code": "2353",
	"severity": 8,
	"message": "Object literal may only specify known properties, and 'format' does not exist in type '{ fps: number; quality: number; scale: number; }'.",
	"source": "ts",
	"startLineNumber": 568,
	"startColumn": 13,
	"endLineNumber": 568,
	"endColumn": 19,
	"relatedInformation": [
		{
			"startLineNumber": 11,
			"startColumn": 3,
			"endLineNumber": 11,
			"endColumn": 12,
			"message": "The expected type comes from property 'streaming' which is declared here on type 'LiveDesktopConfig'",
			"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/types/liveDesktop.ts"
		}
	],
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/liveDesktop/MultiDesktopStreamGrid.tsx",
	"owner": "typescript",
	"code": "2353",
	"severity": 8,
	"message": "Object literal may only specify known properties, and 'autoReconnect' does not exist in type '{ timeout: number; maxReconnectAttempts: number; reconnectInterval: number; }'.",
	"source": "ts",
	"startLineNumber": 571,
	"startColumn": 13,
	"endLineNumber": 571,
	"endColumn": 26,
	"relatedInformation": [
		{
			"startLineNumber": 16,
			"startColumn": 3,
			"endLineNumber": 16,
			"endColumn": 13,
			"message": "The expected type comes from property 'connection' which is declared here on type 'LiveDesktopConfig'",
			"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/types/liveDesktop.ts"
		}
	],
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/liveDesktop/MultiDesktopStreamGrid.tsx",
	"owner": "typescript",
	"code": "2353",
	"severity": 8,
	"message": "Object literal may only specify known properties, and 'regions' does not exist in type '{ enabled: boolean; extractionInterval: number; n8nWebhookUrl?: string; autoSend: boolean; }'.",
	"source": "ts",
	"startLineNumber": 576,
	"startColumn": 13,
	"endLineNumber": 576,
	"endColumn": 20,
	"relatedInformation": [
		{
			"startLineNumber": 21,
			"startColumn": 3,
			"endLineNumber": 21,
			"endColumn": 6,
			"message": "The expected type comes from property 'ocr' which is declared here on type 'LiveDesktopConfig'",
			"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/types/liveDesktop.ts"
		}
	],
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'enableOCR' does not exist on type 'VirtualDesktopAutomationConfig'.",
	"source": "ts",
	"startLineNumber": 68,
	"startColumn": 68,
	"endLineNumber": 68,
	"endColumn": 77,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'scripts' does not exist on type 'VirtualDesktopAutomationConfig'.",
	"source": "ts",
	"startLineNumber": 70,
	"startColumn": 100,
	"endLineNumber": 70,
	"endColumn": 107,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'triggers' does not exist on type 'VirtualDesktopAutomationConfig'.",
	"source": "ts",
	"startLineNumber": 71,
	"startColumn": 83,
	"endLineNumber": 71,
	"endColumn": 91,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'aiAgent' does not exist on type 'VirtualDesktopAutomationConfig'.",
	"source": "ts",
	"startLineNumber": 72,
	"startColumn": 99,
	"endLineNumber": 72,
	"endColumn": 106,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'x' does not exist on type 'Partial<OCRRegion>'.",
	"source": "ts",
	"startLineNumber": 90,
	"startColumn": 39,
	"endLineNumber": 90,
	"endColumn": 40,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'y' does not exist on type 'Partial<OCRRegion>'.",
	"source": "ts",
	"startLineNumber": 90,
	"startColumn": 55,
	"endLineNumber": 90,
	"endColumn": 56,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'width' does not exist on type 'Partial<OCRRegion>'.",
	"source": "ts",
	"startLineNumber": 90,
	"startColumn": 71,
	"endLineNumber": 90,
	"endColumn": 76,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'height' does not exist on type 'Partial<OCRRegion>'.",
	"source": "ts",
	"startLineNumber": 90,
	"startColumn": 91,
	"endLineNumber": 90,
	"endColumn": 97,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2353",
	"severity": 8,
	"message": "Object literal may only specify known properties, and 'x' does not exist in type 'OCRRegion'.",
	"source": "ts",
	"startLineNumber": 102,
	"startColumn": 7,
	"endLineNumber": 102,
	"endColumn": 8,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'x' does not exist on type 'Partial<OCRRegion>'.",
	"source": "ts",
	"startLineNumber": 102,
	"startColumn": 20,
	"endLineNumber": 102,
	"endColumn": 21,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'y' does not exist on type 'Partial<OCRRegion>'.",
	"source": "ts",
	"startLineNumber": 103,
	"startColumn": 20,
	"endLineNumber": 103,
	"endColumn": 21,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'width' does not exist on type 'Partial<OCRRegion>'.",
	"source": "ts",
	"startLineNumber": 104,
	"startColumn": 24,
	"endLineNumber": 104,
	"endColumn": 29,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'height' does not exist on type 'Partial<OCRRegion>'.",
	"source": "ts",
	"startLineNumber": 105,
	"startColumn": 25,
	"endLineNumber": 105,
	"endColumn": 31,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'confidence' does not exist on type 'Partial<OCRRegion>'.",
	"source": "ts",
	"startLineNumber": 107,
	"startColumn": 29,
	"endLineNumber": 107,
	"endColumn": 39,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'isActive' does not exist on type 'OCRRegion'.",
	"source": "ts",
	"startLineNumber": 133,
	"startColumn": 36,
	"endLineNumber": 133,
	"endColumn": 44,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'runOCR' does not exist on type 'VirtualDesktopManager'.",
	"source": "ts",
	"startLineNumber": 136,
	"startColumn": 52,
	"endLineNumber": 136,
	"endColumn": 58,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'code' does not exist on type 'Partial<AutomationScript>'.",
	"source": "ts",
	"startLineNumber": 162,
	"startColumn": 39,
	"endLineNumber": 162,
	"endColumn": 43,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2353",
	"severity": 8,
	"message": "Object literal may only specify known properties, and 'description' does not exist in type 'AutomationScript'.",
	"source": "ts",
	"startLineNumber": 174,
	"startColumn": 7,
	"endLineNumber": 174,
	"endColumn": 18,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'description' does not exist on type 'Partial<AutomationScript>'.",
	"source": "ts",
	"startLineNumber": 174,
	"startColumn": 30,
	"endLineNumber": 174,
	"endColumn": 41,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'code' does not exist on type 'Partial<AutomationScript>'.",
	"source": "ts",
	"startLineNumber": 175,
	"startColumn": 23,
	"endLineNumber": 175,
	"endColumn": 27,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'language' does not exist on type 'Partial<AutomationScript>'.",
	"source": "ts",
	"startLineNumber": 176,
	"startColumn": 27,
	"endLineNumber": 176,
	"endColumn": 35,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'runAutomationScript' does not exist on type 'VirtualDesktopManager'.",
	"source": "ts",
	"startLineNumber": 206,
	"startColumn": 50,
	"endLineNumber": 206,
	"endColumn": 69,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'name' does not exist on type 'Partial<AutomationTrigger>'.",
	"source": "ts",
	"startLineNumber": 243,
	"startColumn": 21,
	"endLineNumber": 243,
	"endColumn": 25,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2353",
	"severity": 8,
	"message": "Object literal may only specify known properties, and 'id' does not exist in type 'AutomationTrigger'.",
	"source": "ts",
	"startLineNumber": 253,
	"startColumn": 7,
	"endLineNumber": 253,
	"endColumn": 9,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'name' does not exist on type 'Partial<AutomationTrigger>'.",
	"source": "ts",
	"startLineNumber": 254,
	"startColumn": 24,
	"endLineNumber": 254,
	"endColumn": 28,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'action' does not exist on type 'Partial<AutomationTrigger>'.",
	"source": "ts",
	"startLineNumber": 257,
	"startColumn": 26,
	"endLineNumber": 257,
	"endColumn": 32,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'name' does not exist on type 'AutomationTrigger'.",
	"source": "ts",
	"startLineNumber": 267,
	"startColumn": 40,
	"endLineNumber": 267,
	"endColumn": 44,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'id' does not exist on type 'AutomationTrigger'.",
	"source": "ts",
	"startLineNumber": 272,
	"startColumn": 40,
	"endLineNumber": 272,
	"endColumn": 42,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2353",
	"severity": 8,
	"message": "Object literal may only specify known properties, and 'enableOCR' does not exist in type 'VirtualDesktopAutomationConfig'.",
	"source": "ts",
	"startLineNumber": 287,
	"startColumn": 9,
	"endLineNumber": 287,
	"endColumn": 18,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2554",
	"severity": 8,
	"message": "Expected 1 arguments, but got 2.",
	"source": "ts",
	"startLineNumber": 294,
	"startColumn": 63,
	"endLineNumber": 294,
	"endColumn": 69,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'x' does not exist on type 'Partial<OCRRegion>'.",
	"source": "ts",
	"startLineNumber": 408,
	"startColumn": 34,
	"endLineNumber": 408,
	"endColumn": 35,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2353",
	"severity": 8,
	"message": "Object literal may only specify known properties, and 'x' does not exist in type 'SetStateAction<Partial<OCRRegion>>'.",
	"source": "ts",
	"startLineNumber": 409,
	"startColumn": 62,
	"endLineNumber": 409,
	"endColumn": 63,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'y' does not exist on type 'Partial<OCRRegion>'.",
	"source": "ts",
	"startLineNumber": 417,
	"startColumn": 34,
	"endLineNumber": 417,
	"endColumn": 35,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2353",
	"severity": 8,
	"message": "Object literal may only specify known properties, and 'y' does not exist in type 'SetStateAction<Partial<OCRRegion>>'.",
	"source": "ts",
	"startLineNumber": 418,
	"startColumn": 62,
	"endLineNumber": 418,
	"endColumn": 63,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'width' does not exist on type 'Partial<OCRRegion>'.",
	"source": "ts",
	"startLineNumber": 426,
	"startColumn": 34,
	"endLineNumber": 426,
	"endColumn": 39,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2353",
	"severity": 8,
	"message": "Object literal may only specify known properties, and 'width' does not exist in type 'SetStateAction<Partial<OCRRegion>>'.",
	"source": "ts",
	"startLineNumber": 427,
	"startColumn": 62,
	"endLineNumber": 427,
	"endColumn": 67,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'height' does not exist on type 'Partial<OCRRegion>'.",
	"source": "ts",
	"startLineNumber": 435,
	"startColumn": 34,
	"endLineNumber": 435,
	"endColumn": 40,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2353",
	"severity": 8,
	"message": "Object literal may only specify known properties, and 'height' does not exist in type 'SetStateAction<Partial<OCRRegion>>'.",
	"source": "ts",
	"startLineNumber": 436,
	"startColumn": 62,
	"endLineNumber": 436,
	"endColumn": 68,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'isActive' does not exist on type 'OCRRegion'.",
	"source": "ts",
	"startLineNumber": 453,
	"startColumn": 42,
	"endLineNumber": 453,
	"endColumn": 50,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'isActive' does not exist on type 'OCRRegion'.",
	"source": "ts",
	"startLineNumber": 454,
	"startColumn": 29,
	"endLineNumber": 454,
	"endColumn": 37,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'x' does not exist on type 'OCRRegion'.",
	"source": "ts",
	"startLineNumber": 458,
	"startColumn": 38,
	"endLineNumber": 458,
	"endColumn": 39,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'y' does not exist on type 'OCRRegion'.",
	"source": "ts",
	"startLineNumber": 458,
	"startColumn": 50,
	"endLineNumber": 458,
	"endColumn": 51,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'width' does not exist on type 'OCRRegion'.",
	"source": "ts",
	"startLineNumber": 458,
	"startColumn": 68,
	"endLineNumber": 458,
	"endColumn": 73,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'height' does not exist on type 'OCRRegion'.",
	"source": "ts",
	"startLineNumber": 458,
	"startColumn": 83,
	"endLineNumber": 458,
	"endColumn": 89,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'language' does not exist on type 'Partial<AutomationScript>'.",
	"source": "ts",
	"startLineNumber": 513,
	"startColumn": 34,
	"endLineNumber": 513,
	"endColumn": 42,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2353",
	"severity": 8,
	"message": "Object literal may only specify known properties, and 'language' does not exist in type 'SetStateAction<Partial<AutomationScript>>'.",
	"source": "ts",
	"startLineNumber": 514,
	"startColumn": 62,
	"endLineNumber": 514,
	"endColumn": 70,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'description' does not exist on type 'Partial<AutomationScript>'.",
	"source": "ts",
	"startLineNumber": 522,
	"startColumn": 32,
	"endLineNumber": 522,
	"endColumn": 43,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2353",
	"severity": 8,
	"message": "Object literal may only specify known properties, and 'description' does not exist in type 'SetStateAction<Partial<AutomationScript>>'.",
	"source": "ts",
	"startLineNumber": 523,
	"startColumn": 60,
	"endLineNumber": 523,
	"endColumn": 71,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'code' does not exist on type 'Partial<AutomationScript>'.",
	"source": "ts",
	"startLineNumber": 530,
	"startColumn": 32,
	"endLineNumber": 530,
	"endColumn": 36,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2353",
	"severity": 8,
	"message": "Object literal may only specify known properties, and 'code' does not exist in type 'SetStateAction<Partial<AutomationScript>>'.",
	"source": "ts",
	"startLineNumber": 531,
	"startColumn": 60,
	"endLineNumber": 531,
	"endColumn": 64,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'isActive' does not exist on type 'AutomationScript'.",
	"source": "ts",
	"startLineNumber": 556,
	"startColumn": 42,
	"endLineNumber": 556,
	"endColumn": 50,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'isActive' does not exist on type 'AutomationScript'.",
	"source": "ts",
	"startLineNumber": 557,
	"startColumn": 29,
	"endLineNumber": 557,
	"endColumn": 37,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'language' does not exist on type 'AutomationScript'.",
	"source": "ts",
	"startLineNumber": 559,
	"startColumn": 52,
	"endLineNumber": 559,
	"endColumn": 60,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'description' does not exist on type 'AutomationScript'.",
	"source": "ts",
	"startLineNumber": 578,
	"startColumn": 23,
	"endLineNumber": 578,
	"endColumn": 34,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'description' does not exist on type 'AutomationScript'.",
	"source": "ts",
	"startLineNumber": 579,
	"startColumn": 67,
	"endLineNumber": 579,
	"endColumn": 78,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'code' does not exist on type 'AutomationScript'.",
	"source": "ts",
	"startLineNumber": 582,
	"startColumn": 25,
	"endLineNumber": 582,
	"endColumn": 29,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'code' does not exist on type 'AutomationScript'.",
	"source": "ts",
	"startLineNumber": 583,
	"startColumn": 25,
	"endLineNumber": 583,
	"endColumn": 29,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'lastRun' does not exist on type 'AutomationScript'.",
	"source": "ts",
	"startLineNumber": 585,
	"startColumn": 23,
	"endLineNumber": 585,
	"endColumn": 30,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'lastRun' does not exist on type 'AutomationScript'.",
	"source": "ts",
	"startLineNumber": 587,
	"startColumn": 37,
	"endLineNumber": 587,
	"endColumn": 44,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'name' does not exist on type 'Partial<AutomationTrigger>'.",
	"source": "ts",
	"startLineNumber": 618,
	"startColumn": 35,
	"endLineNumber": 618,
	"endColumn": 39,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2353",
	"severity": 8,
	"message": "Object literal may only specify known properties, and 'name' does not exist in type 'SetStateAction<Partial<AutomationTrigger>>'.",
	"source": "ts",
	"startLineNumber": 619,
	"startColumn": 64,
	"endLineNumber": 619,
	"endColumn": 68,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2322",
	"severity": 8,
	"message": "Type 'string' is not assignable to type '\"ocr_text_change\" | \"image_match\" | \"time_interval\" | \"manual\"'.",
	"source": "ts",
	"startLineNumber": 627,
	"startColumn": 64,
	"endLineNumber": 627,
	"endColumn": 68,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'id' does not exist on type 'AutomationTrigger'.",
	"source": "ts",
	"startLineNumber": 656,
	"startColumn": 31,
	"endLineNumber": 656,
	"endColumn": 33,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'name' does not exist on type 'AutomationTrigger'.",
	"source": "ts",
	"startLineNumber": 659,
	"startColumn": 56,
	"endLineNumber": 659,
	"endColumn": 60,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'isActive' does not exist on type 'AutomationTrigger'.",
	"source": "ts",
	"startLineNumber": 660,
	"startColumn": 43,
	"endLineNumber": 660,
	"endColumn": 51,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'isActive' does not exist on type 'AutomationTrigger'.",
	"source": "ts",
	"startLineNumber": 661,
	"startColumn": 30,
	"endLineNumber": 661,
	"endColumn": 38,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopAutomation.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'id' does not exist on type 'AutomationTrigger'.",
	"source": "ts",
	"startLineNumber": 672,
	"startColumn": 54,
	"endLineNumber": 672,
	"endColumn": 56,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopStream.tsx",
	"owner": "typescript",
	"code": "2554",
	"severity": 8,
	"message": "Expected 1 arguments, but got 2.",
	"source": "ts",
	"startLineNumber": 95,
	"startColumn": 59,
	"endLineNumber": 102,
	"endColumn": 8,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/components/trae/virtualDesktop/VirtualDesktopStream.tsx",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'enableAudio' does not exist on type 'VirtualDesktopStreamConfig'.",
	"source": "ts",
	"startLineNumber": 100,
	"startColumn": 36,
	"endLineNumber": 100,
	"endColumn": 47,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/pages/VirtualDesktops.tsx",
	"owner": "typescript",
	"code": "2322",
	"severity": 8,
	"message": "Type '\"streaming\" | \"running\"' is not assignable to type 'VirtualDesktopStatus'.\n  Type '\"running\"' is not assignable to type 'VirtualDesktopStatus'.",
	"source": "ts",
	"startLineNumber": 158,
	"startColumn": 19,
	"endLineNumber": 158,
	"endColumn": 25,
	"relatedInformation": [
		{
			"startLineNumber": 19,
			"startColumn": 3,
			"endLineNumber": 19,
			"endColumn": 9,
			"message": "The expected type comes from property 'status' which is declared here on type 'Partial<VirtualDesktop>'",
			"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/types/virtualDesktop.ts"
		}
	],
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/services/apiService.ts",
	"owner": "typescript",
	"code": "2322",
	"severity": 8,
	"message": "Type '{ success: boolean; data?: { desktops: VirtualDesktop[]; count: number; }; error?: string; }' is not assignable to type '{ success: boolean; data?: VirtualDesktop[]; error?: string; }'.\n  Types of property 'data' are incompatible.\n    Type '{ desktops: VirtualDesktop[]; count: number; }' is missing the following properties from type 'VirtualDesktop[]': length, pop, push, concat, and 29 more.",
	"source": "ts",
	"startLineNumber": 124,
	"startColumn": 5,
	"endLineNumber": 124,
	"endColumn": 11,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/services/apiService.ts",
	"owner": "typescript",
	"code": "2322",
	"severity": 8,
	"message": "Type '{ success: boolean; data?: { templates: WorkflowTemplate[]; count: number; }; error?: string; }' is not assignable to type '{ success: boolean; data?: WorkflowTemplate[]; error?: string; }'.\n  Types of property 'data' are incompatible.\n    Type '{ templates: WorkflowTemplate[]; count: number; }' is missing the following properties from type 'WorkflowTemplate[]': length, pop, push, concat, and 29 more.",
	"source": "ts",
	"startLineNumber": 163,
	"startColumn": 5,
	"endLineNumber": 163,
	"endColumn": 11,
	"extensionID": "vscode.typescript-language-features"
},{
	"resource": "/c:/code/autogen_project_maker/trusted-login-system/src/services/apiService.ts",
	"owner": "typescript",
	"code": "2322",
	"severity": 8,
	"message": "Type '{ success: boolean; data?: { executions: WorkflowExecution[]; count: number; }; error?: string; }' is not assignable to type '{ success: boolean; data?: WorkflowExecution[]; error?: string; }'.\n  Types of property 'data' are incompatible.\n    Type '{ executions: WorkflowExecution[]; count: number; }' is missing the following properties from type 'WorkflowExecution[]': length, pop, push, concat, and 29 more.",
	"source": "ts",
	"startLineNumber": 222,
	"startColumn": 5,
	"endLineNumber": 222,
	"endColumn": 11,
	"extensionID": "vscode.typescript-language-features"
}]