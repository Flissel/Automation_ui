# Virtual Desktop Backend Services

This backend provides a comprehensive Virtual Desktop Management System with workflow automation capabilities. The system is designed to load virtual desktops, execute automated workflows, and analyze program behavior.

## 🏗️ Architecture

The backend consists of several microservices:

### Core Services

1. **Virtual Desktop Service** (Port 8000)
   - Manages virtual desktop instances
   - Handles WebSocket connections for real-time communication
   - Coordinates workflow execution

2. **Workflow Orchestrator** (Port 8001)
   - Manages workflow templates and execution
   - Provides predefined automation sequences
   - Handles step-by-step workflow execution

3. **API Gateway** (Port 8080)
   - Routes requests between services
   - Provides unified API endpoint
   - Handles authentication and rate limiting

### Supporting Services

4. **Desktop Automation Service** (Port 8002)
   - Executes desktop automation actions
   - Handles screenshots and UI interactions
   - Provides action simulation capabilities

5. **OCR Processing Service** (Port 8003)
   - Processes screenshots for text extraction
   - Analyzes specific screen regions
   - Provides text recognition capabilities

## 🚀 Quick Start

### Prerequisites

- [Deno](https://deno.land/) 1.40.2 or later
- [Docker](https://www.docker.com/) (optional, for containerized deployment)
- [Supabase](https://supabase.com/) account (for database)

### Local Development

1. **Clone and Setup**
   ```bash
   cd backend
   cp config/.env.example config/.env
   # Edit config/.env with your Supabase credentials
   ```

2. **Start Services**
   ```powershell
   # Windows PowerShell
   .\start-backend.ps1
   
   # With logs
   .\start-backend.ps1 -ShowLogs
   ```

3. **Verify Installation**
   - API Gateway: http://localhost:8080
   - Health Check: http://localhost:8080/health
   - API Documentation: http://localhost:8080/api/docs

### Docker Deployment

1. **Build and Start**
   ```powershell
   .\start-backend.ps1 -UseDocker -BuildImages
   ```

2. **View Status**
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

## 📋 API Endpoints

### Workflow Management

- `GET /api/v1/workflow/templates` - Get available workflow templates
- `POST /api/v1/workflow/execute` - Execute a workflow template
- `GET /api/v1/workflow/status?executionId=<id>` - Get execution status
- `POST /api/v1/workflow/stop` - Stop running workflow
- `GET /api/v1/workflow/history` - Get execution history

### Virtual Desktop Management

- `GET /api/v1/desktop/list` - List virtual desktops
- `POST /api/v1/desktop/create` - Create new virtual desktop
- `GET /api/v1/desktop/connect` - WebSocket connection for desktop

### Automation

- `POST /api/v1/automation/actions` - Execute automation actions
- `POST /api/v1/automation/screenshot` - Take screenshot
- `POST /api/v1/ocr/process` - Process image for OCR

## 🔄 Workflow Templates

The system includes predefined workflow templates:

### 1. Notepad Analysis
```json
{
  "id": "notepad-analysis",
  "name": "Notepad Text Analysis",
  "description": "Launch Notepad and analyze text content",
  "programPath": "notepad.exe"
}
```

**Steps:**
1. Launch Notepad application
2. Wait for application to load
3. Take initial screenshot
4. Type sample text
5. Analyze content with OCR

### 2. Calculator Test
```json
{
  "id": "calculator-test", 
  "name": "Calculator Automation Test",
  "description": "Launch Calculator and perform basic operations",
  "programPath": "calc.exe"
}
```

**Steps:**
1. Launch Calculator application
2. Wait for application to load
3. Perform calculation (1 + 2 = 3)
4. Analyze result display

## 🔧 Configuration

### Environment Variables

Key configuration options in `.env`:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Service Configuration
VIRTUAL_DESKTOP_SERVICE_URL=http://localhost:8000
WORKFLOW_ORCHESTRATOR_URL=http://localhost:8001
API_GATEWAY_URL=http://localhost:8080

# Virtual Desktop Settings
DEFAULT_DESKTOP_RESOLUTION_WIDTH=1920
DEFAULT_DESKTOP_RESOLUTION_HEIGHT=1080
MAX_CONCURRENT_DESKTOPS=10

# Workflow Settings
MAX_WORKFLOW_DURATION_MS=600000
WORKFLOW_RETRY_ATTEMPTS=3
```

### Database Schema

The system uses Supabase with the following tables:

- `virtual_desktops` - Desktop instance information
- `workflow_executions` - Workflow execution history
- `workflow_templates` - Custom workflow definitions
- `automation_logs` - Action execution logs

## 🔌 Integration

### Frontend Integration

Connect your frontend to the API Gateway:

```javascript
// Execute workflow
const response = await fetch('http://localhost:8080/api/v1/workflow/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    templateId: 'notepad-analysis',
    desktopId: 'desktop-123',
    parameters: {}
  })
});

// Check status
const status = await fetch(`http://localhost:8080/api/v1/workflow/status?executionId=${executionId}`);
```

### WebSocket Connection

Connect to virtual desktop for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:8000/desktop/connect?desktopId=desktop-123');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Desktop message:', message);
};
```

## 🔍 Monitoring

### Health Checks

- **API Gateway**: `GET /health`
- **Individual Services**: `GET /{service}/health`

### Logging

Services log to:
- Console (development)
- File: `/app/logs/service.log` (production)
- Docker logs: `docker-compose logs -f [service]`

### Metrics

Enable metrics collection:
```env
ENABLE_METRICS=true
METRICS_PORT=9090
```

## 🛠️ Development

### Adding New Workflow Templates

1. Edit `workflow-orchestrator.ts`
2. Add template to `workflowTemplates` array
3. Define steps and analysis configuration
4. Restart workflow orchestrator service

### Custom Actions

Extend automation capabilities by:
1. Adding action types to `virtual-desktop-service.ts`
2. Implementing action handlers
3. Testing with workflow execution

### Service Extension

Add new services by:
1. Creating service file in `services/`
2. Adding Dockerfile in `docker/`
3. Updating `docker-compose.yml`
4. Adding routes to API Gateway

## 🚨 Troubleshooting

### Common Issues

1. **Service Connection Errors**
   - Check if all services are running
   - Verify port availability
   - Check firewall settings

2. **Database Connection Issues**
   - Verify Supabase credentials in `.env`
   - Check network connectivity
   - Ensure database tables exist

3. **Workflow Execution Failures**
   - Check desktop connection status
   - Verify program paths exist
   - Review execution logs

### Debug Mode

Enable debug logging:
```env
ENABLE_DEBUG_LOGS=true
LOG_LEVEL=debug
```

## 📚 API Documentation

Full API documentation is available at:
- **Local**: http://localhost:8080/api/docs
- **Interactive**: Use tools like Postman or curl for testing

## 🔒 Security

- API key authentication for external access
- Rate limiting on all endpoints
- CORS configuration for frontend integration
- Environment variable protection

## 📄 License

This project is part of the Trusted Login System and follows the same licensing terms.