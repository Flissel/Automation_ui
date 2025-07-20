# TRAE Visual Workflow System - Frontend

A modern React-based frontend for the TRAE Visual Workflow System, providing an intuitive drag-and-drop interface for creating and managing visual workflows.

## 🚀 Features

### Core Workflow Management
- **Visual Node Editor**: Drag-and-drop interface using React Flow
- **Real-time Execution**: Live workflow execution with status updates
- **Node Library**: Comprehensive collection of workflow nodes
- **Property Panel**: Dynamic configuration for each node type
- **Execution Monitor**: Real-time monitoring of workflow execution

### Node Types
- **Trigger Nodes**: Event triggers, file watchers, live desktop
- **Action Nodes**: Click automation, OCR processing
- **Logic Nodes**: Conditions, loops, data transformations
- **Data Nodes**: Variables, constants, data manipulation

### Backend Integration
- **REST API**: Full integration with FastAPI backend
- **WebSocket**: Real-time communication for live updates
- **File Operations**: Upload, download, and file management
- **System Health**: Service monitoring and health checks

## 🛠️ Technology Stack

- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe development
- **React Flow** - Visual workflow editor
- **React Router** - Client-side routing
- **Axios** - HTTP client for API communication
- **React Hot Toast** - Beautiful notifications
- **Zustand** - Lightweight state management
- **Vite** - Fast build tool and dev server

## 📦 Installation

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Create a `.env.development` file:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   VITE_WS_BASE_URL=ws://localhost:8000
   VITE_APP_TITLE=TRAE Visual Workflow System
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

## 🏗️ Project Structure

```
src/
├── components/           # React components
│   ├── nodes/           # Node-specific components
│   ├── WorkflowCanvas.tsx
│   ├── NodeLibrary.tsx
│   ├── WorkflowToolbar.tsx
│   ├── PropertyPanel.tsx
│   └── ExecutionMonitor.tsx
├── services/            # API and WebSocket services
│   ├── api.ts          # REST API client
│   └── websocket.ts    # WebSocket client
├── hooks/              # Custom React hooks
│   └── index.ts        # API and WebSocket hooks
├── types/              # TypeScript type definitions
│   └── index.ts        # All type definitions
├── utils/              # Utility functions
├── pages/              # Page components
├── constants/          # Application constants
└── App.tsx             # Main application component
```

## 🎯 Usage

### Creating a Workflow

1. **Add Nodes**: Drag nodes from the library to the canvas
2. **Connect Nodes**: Click and drag between node handles to create connections
3. **Configure Nodes**: Select nodes to edit properties in the property panel
4. **Save Workflow**: Use the toolbar to save your workflow
5. **Execute Workflow**: Click the play button to start execution

### Node Configuration

#### OCR Region Node
- **Region**: Define screen area for text recognition
- **Language**: Select OCR language (default: English)
- **Confidence**: Set minimum confidence threshold

#### Click Action Node
- **Position**: Set click coordinates (x, y)
- **Button**: Choose mouse button (left, right, middle)
- **Delay**: Add delay before/after click

#### File Watcher Node
- **Path**: Directory or file to monitor
- **Events**: File system events to watch
- **Recursive**: Monitor subdirectories

#### Condition Node
- **Condition**: JavaScript expression for evaluation
- **True/False Paths**: Define execution branches

### Real-time Features

- **Live Desktop Streaming**: View desktop in real-time
- **Execution Monitoring**: Track workflow progress
- **WebSocket Updates**: Instant status updates
- **Error Handling**: Visual error indicators and messages

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Code Style

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting with React rules
- **Prettier**: Code formatting (recommended)

### Adding New Node Types

1. **Define Types**: Add node type to `types/index.ts`
2. **Create Component**: Add node component to `components/nodes/`
3. **Update Library**: Add to node definitions in `NodeLibrary.tsx`
4. **Add Configuration**: Update `PropertyPanel.tsx` for node-specific config

## 🌐 API Integration

### REST API Endpoints

- `GET /api/workflows` - List workflows
- `POST /api/workflows` - Create workflow
- `PUT /api/workflows/{id}` - Update workflow
- `DELETE /api/workflows/{id}` - Delete workflow
- `POST /api/workflows/{id}/execute` - Execute workflow
- `GET /api/health` - System health check

### WebSocket Events

- `workflow_execution_started` - Workflow execution began
- `workflow_execution_completed` - Workflow execution finished
- `node_execution_started` - Node execution began
- `node_execution_completed` - Node execution finished
- `desktop_frame` - Live desktop frame update
- `file_system_event` - File system change detected

## 🚨 Error Handling

- **API Errors**: Automatic retry with exponential backoff
- **WebSocket Reconnection**: Automatic reconnection on disconnect
- **Validation**: Client-side validation before API calls
- **User Feedback**: Toast notifications for all operations

## 🔒 Security

- **CORS**: Configured for development and production
- **Input Validation**: All user inputs validated
- **Error Sanitization**: Sensitive information filtered from errors
- **Environment Variables**: Secure configuration management

## 📱 Browser Support

- Chrome >= 90
- Firefox >= 88
- Safari >= 14
- Edge >= 90

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is part of the TRAE Visual Workflow System.

## 🆘 Support

For support and questions:
- Check the documentation
- Review existing issues
- Create a new issue with detailed information

---

**TRAE Development Team** - Building the future of visual workflow automation