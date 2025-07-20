/**
 * TRAE Live Desktop Demo Page
 * 
 * Demonstriert verschiedene Anwendungsfälle des LiveDesktopViewer
 * für firmenweite Implementierung
 * Author: TRAE Development Team
 * Version: 2.0.0
 */

import React, { useState } from 'react';
import { Monitor, Grid, Maximize2, Settings, Users, Building } from 'lucide-react';
import LiveDesktopViewer from '../components/LiveDesktopViewer';
import { toast } from 'react-hot-toast';
import { errorHandlingService } from '../services/ErrorHandlingService';

// ============================================================================
// DEMO SCENARIOS
// ============================================================================

interface DemoScenario {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  config: any;
  useCase: string;
}

const demoScenarios: DemoScenario[] = [
  {
    id: 'monitoring',
    title: 'System-Monitoring',
    description: 'Überwachung von Produktionssystemen mit niedriger Latenz',
    icon: <Monitor className="w-6 h-6" />,
    config: {
      fps: 5,
      scale_factor: 0.6,
      quality: 70,
      auto_reconnect: true,
      compression: true
    },
    useCase: 'Ideal für kontinuierliche Überwachung von Servern und Produktionssystemen'
  },
  {
    id: 'support',
    title: 'Remote Support',
    description: 'Hochqualitative Anzeige für technischen Support',
    icon: <Users className="w-6 h-6" />,
    config: {
      fps: 15,
      scale_factor: 1.0,
      quality: 95,
      auto_reconnect: true,
      compression: false
    },
    useCase: 'Optimiert für detaillierte Fernwartung und Support-Sessions'
  },
  {
    id: 'presentation',
    title: 'Präsentationen',
    description: 'Optimiert für Bildschirmfreigabe in Meetings',
    icon: <Building className="w-6 h-6" />,
    config: {
      fps: 10,
      scale_factor: 0.8,
      quality: 85,
      auto_reconnect: true,
      compression: true
    },
    useCase: 'Perfekt für Meetings, Schulungen und Präsentationen'
  },
  {
    id: 'development',
    title: 'Entwicklung',
    description: 'Entwicklungsumgebung mit hoher Bildqualität',
    icon: <Grid className="w-6 h-6" />,
    config: {
      fps: 20,
      scale_factor: 1.2,
      quality: 90,
      auto_reconnect: true,
      compression: false
    },
    useCase: 'Für Entwickler, die Remote-Entwicklungsumgebungen nutzen'
  }
];

// ============================================================================
// LIVE DESKTOP DEMO COMPONENT
// ============================================================================

export const LiveDesktopDemo: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<string>('monitoring');
  const [viewMode, setViewMode] = useState<'single' | 'grid' | 'fullscreen'>('single');
  const [connectionStats, setConnectionStats] = useState<any[]>([]);

  const currentScenario = demoScenarios.find(s => s.id === selectedScenario) || demoScenarios[0];

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleConnectionChange = (viewerId: string, status: any) => {
    setConnectionStats(prev => {
      const existing = prev.findIndex(s => s.viewerId === viewerId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { viewerId, ...status, timestamp: new Date() };
        return updated;
      } else {
        return [...prev, { viewerId, ...status, timestamp: new Date() }];
      }
    });
  };

  const handleError = (viewerId: string, error: string) => {
    errorHandlingService.handleError(
      new Error(`Live Desktop Viewer error: ${error}`),
      {
        operation: 'live_desktop_demo_viewer',
        viewerId,
        error
      }
    );
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderScenarioSelector = () => (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-4">Anwendungsszenarien</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {demoScenarios.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => setSelectedScenario(scenario.id)}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedScenario === scenario.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-3 mb-2">
              {scenario.icon}
              <h3 className="font-medium">{scenario.title}</h3>
            </div>
            <p className="text-sm text-gray-600 text-left">{scenario.description}</p>
          </button>
        ))}
      </div>
    </div>
  );

  const renderViewModeSelector = () => (
    <div className="mb-6">
      <h3 className="text-lg font-medium mb-3">Anzeigemodus</h3>
      <div className="flex space-x-2">
        <button
          onClick={() => setViewMode('single')}
          className={`px-4 py-2 rounded ${
            viewMode === 'single'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Einzelansicht
        </button>
        <button
          onClick={() => setViewMode('grid')}
          className={`px-4 py-2 rounded ${
            viewMode === 'grid'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Grid-Ansicht
        </button>
        <button
          onClick={() => setViewMode('fullscreen')}
          className={`px-4 py-2 rounded ${
            viewMode === 'fullscreen'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Vollbild
        </button>
      </div>
    </div>
  );

  const renderScenarioInfo = () => (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3 mb-2">
        {currentScenario.icon}
        <h3 className="text-lg font-semibold">{currentScenario.title}</h3>
      </div>
      <p className="text-gray-700 mb-3">{currentScenario.useCase}</p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
        <div>
          <span className="font-medium">FPS:</span>
          <span className="ml-1">{currentScenario.config.fps}</span>
        </div>
        <div>
          <span className="font-medium">Skalierung:</span>
          <span className="ml-1">{currentScenario.config.scale_factor}x</span>
        </div>
        <div>
          <span className="font-medium">Qualität:</span>
          <span className="ml-1">{currentScenario.config.quality}%</span>
        </div>
        <div>
          <span className="font-medium">Kompression:</span>
          <span className="ml-1">{currentScenario.config.compression ? 'An' : 'Aus'}</span>
        </div>
        <div>
          <span className="font-medium">Auto-Reconnect:</span>
          <span className="ml-1">{currentScenario.config.auto_reconnect ? 'An' : 'Aus'}</span>
        </div>
      </div>
    </div>
  );

  const renderConnectionStats = () => {
    if (connectionStats.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">Verbindungsstatistiken</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {connectionStats.map((stat) => (
            <div key={stat.viewerId} className="p-3 bg-white border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">Viewer {stat.viewerId}</span>
                <span className={`w-2 h-2 rounded-full ${
                  stat.connected ? 'bg-green-500' : 'bg-red-500'
                }`} />
              </div>
              <div className="space-y-1 text-xs text-gray-600">
                <div>FPS: {stat.fps_actual || 0}</div>
                <div>Latenz: {stat.latency || 0}ms</div>
                <div>Bytes: {Math.round((stat.bytes_received || 0) / 1024)}KB</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSingleView = () => (
    <div className="flex justify-center">
      <LiveDesktopViewer
        viewerId="main"
        width={800}
        height={600}
        initialConfig={currentScenario.config}
        onConnectionChange={(status) => handleConnectionChange('main', status)}
        onError={(error) => handleError('main', error)}
        allowFullscreen={true}
        showControls={true}
        autoStart={false}
        className="border border-gray-300 rounded-lg"
      />
    </div>
  );

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[1, 2, 3, 4].map((index) => (
        <LiveDesktopViewer
          key={index}
          viewerId={`grid-${index}`}
          width={400}
          height={300}
          initialConfig={{
            ...currentScenario.config,
            fps: Math.max(1, currentScenario.config.fps / 2), // Reduzierte FPS für Grid
            quality: Math.max(50, currentScenario.config.quality - 20) // Reduzierte Qualität
          }}
          onConnectionChange={(status) => handleConnectionChange(`grid-${index}`, status)}
          onError={(error) => handleError(`grid-${index}`, error)}
          allowFullscreen={true}
          showControls={true}
          autoStart={false}
          className="border border-gray-300 rounded-lg"
        />
      ))}
    </div>
  );

  const renderFullscreenView = () => (
    <div className="flex justify-center">
      <LiveDesktopViewer
        viewerId="fullscreen"
        width={1200}
        height={800}
        initialConfig={{
          ...currentScenario.config,
          scale_factor: 1.0, // Vollskalierung für Vollbild
          quality: Math.min(100, currentScenario.config.quality + 10) // Höhere Qualität
        }}
        onConnectionChange={(status) => handleConnectionChange('fullscreen', status)}
        onError={(error) => handleError('fullscreen', error)}
        allowFullscreen={true}
        showControls={true}
        autoStart={false}
        className="border border-gray-300 rounded-lg"
      />
    </div>
  );

  const renderViewer = () => {
    switch (viewMode) {
      case 'grid':
        return renderGridView();
      case 'fullscreen':
        return renderFullscreenView();
      default:
        return renderSingleView();
    }
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Live Desktop Viewer Demo
          </h1>
          <p className="text-gray-600">
            Demonstriert verschiedene Anwendungsfälle für firmenweite Live-Desktop-Streaming-Lösungen
          </p>
        </div>

        {/* Scenario Selector */}
        {renderScenarioSelector()}

        {/* View Mode Selector */}
        {renderViewModeSelector()}

        {/* Scenario Info */}
        {renderScenarioInfo()}

        {/* Connection Stats */}
        {renderConnectionStats()}

        {/* Viewer */}
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-4">Live Desktop Stream</h3>
          {renderViewer()}
        </div>

        {/* Implementation Guide */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Implementierungshinweise</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Docker-Integration</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Automatische Service-Erkennung</li>
                <li>• Skalierbare Container-Architektur</li>
                <li>• Load Balancing für mehrere Viewer</li>
                <li>• Health Checks und Auto-Recovery</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Firmenweite Nutzung</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Zentrale Konfigurationsverwaltung</li>
                <li>• Benutzer- und Rechteverwaltung</li>
                <li>• Audit-Logging und Monitoring</li>
                <li>• Multi-Tenant-Unterstützung</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Nächste Schritte</h4>
            <p className="text-sm text-blue-800">
              1. Docker-Services mit <code className="bg-blue-200 px-1 rounded">docker stack deploy</code> starten<br/>
              2. LiveDesktopViewer-Komponente in Ihre Anwendung integrieren<br/>
              3. Konfiguration an Ihre Anforderungen anpassen<br/>
              4. Monitoring und Logging einrichten
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveDesktopDemo;