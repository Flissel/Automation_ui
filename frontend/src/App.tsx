import React, { useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { UnifiedWorkspace } from './components';
import LiveDesktopDemo from './pages/LiveDesktopDemo';
import LiveDesktopWorkflowInterface from './components/LiveDesktopWorkflowInterface';
import ErrorDisplayContainer from './components/ErrorDisplay/ErrorDisplayContainer';

import { Monitor, Workflow, Home, Wifi } from 'lucide-react';
import './App.css';

const Navigation: React.FC = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Live Desktop Automation', icon: <Monitor className="w-4 h-4" /> },
    { path: '/workflow-canvas', label: 'Workflow Canvas', icon: <Workflow className="w-4 h-4" /> },
    { path: '/live-desktop-demo', label: 'Live Desktop Demo', icon: <Wifi className="w-4 h-4" /> },
  ];
  
  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <Home className="w-6 h-6" />
          <span className="text-xl font-semibold">TRAE Unity AI Platform</span>
        </div>
        <div className="flex space-x-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-2 px-3 py-2 rounded transition-colors ${
                location.pathname === item.path
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

function App() {
  // Memoize the LiveDesktopWorkflowInterface to prevent unnecessary re-renders
  const memoizedLiveDesktopWorkflow = useMemo(() => (
    <LiveDesktopWorkflowInterface
      key="stable-workflow-interface"
      wsUrl="ws://localhost:8000/ws/live-desktop"
      style={{
        height: '100%',
        width: '100%'
      }}
    />
  ), []);

  return (
    <Router>
      <div className="App" style={{ height: '100vh', width: '100vw' }}>
        <Navigation />
        <div style={{ height: 'calc(100vh - 72px)', overflow: 'auto' }}>
          <Routes>
            <Route path="/" element={memoizedLiveDesktopWorkflow} />
            <Route path="/workflow-canvas" element={<UnifiedWorkspace />} />
            <Route path="/live-desktop-demo" element={<LiveDesktopDemo />} />
          </Routes>
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <ErrorDisplayContainer />
      </div>
    </Router>
  );
}

export default App;