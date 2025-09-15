import React, { useState } from 'react';
import { Play, Pause, Square, SkipForward, Bug, Eye, EyeOff, Settings, Terminal, Variable } from 'lucide-react';
import { useWorkflowStore } from '../../stores/workflowStore';
import { useWebSocket } from '../../hooks/useWebSocket';

interface DebugBarProps {
  className?: string;
}

export const DebugBar: React.FC<DebugBarProps> = ({ className = '' }) => {
  const [showLogs, setShowLogs] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const {
    currentExecution,
    debugMode,
    stepByStep,
    executionLogs,
    executionVariables,
    nodeResults,
    breakpoints,
    wsConnected,
    startExecution,
    pauseExecution,
    resumeExecution,
    stopExecution,
    stepExecution,
    setDebugMode,
    setStepByStep,
    clearExecutionLogs,
    clearBreakpoints,
    validateWorkflow
  } = useWorkflowStore();

  const { connect, disconnect } = useWebSocket();

  const isRunning = currentExecution?.status === 'running';
  const isPaused = currentExecution?.status === 'paused';
  const isCompleted = currentExecution?.status === 'completed';
  const isFailed = currentExecution?.status === 'failed';

  const handleStartExecution = async () => {
    const validation = validateWorkflow();
    if (!validation.isValid) {
      alert(`Workflow validation failed:\n${validation.errors.join('\n')}`);
      return;
    }
    await startExecution(debugMode, stepByStep);
  };

  const getStatusColor = () => {
    if (isRunning) return 'text-green-500';
    if (isPaused) return 'text-yellow-500';
    if (isCompleted) return 'text-blue-500';
    if (isFailed) return 'text-red-500';
    return 'text-gray-500';
  };

  const getStatusText = () => {
    if (isRunning) return 'Running';
    if (isPaused) return 'Paused';
    if (isCompleted) return 'Completed';
    if (isFailed) return 'Failed';
    return 'Ready';
  };

  const getProgressPercentage = () => {
    if (!currentExecution?.progress) return 0;
    const { totalNodes, completedNodes } = currentExecution.progress;
    return totalNodes > 0 ? (completedNodes / totalNodes) * 100 : 0;
  };

  return (
    <div className={`bg-gray-900 border-t border-gray-700 p-4 ${className}`}>
      {/* Main Control Bar */}
      <div className="flex items-center justify-between mb-4">
        {/* Execution Controls */}
        <div className="flex items-center space-x-2">
          {!isRunning && !isPaused ? (
            <button
              onClick={handleStartExecution}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              disabled={!wsConnected}
            >
              <Play size={16} />
              <span>Start</span>
            </button>
          ) : null}

          {isRunning ? (
            <button
              onClick={pauseExecution}
              className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
            >
              <Pause size={16} />
              <span>Pause</span>
            </button>
          ) : null}

          {isPaused ? (
            <button
              onClick={resumeExecution}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Play size={16} />
              <span>Resume</span>
            </button>
          ) : null}

          {(isRunning || isPaused) ? (
            <button
              onClick={stopExecution}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <Square size={16} />
              <span>Stop</span>
            </button>
          ) : null}

          {stepByStep && isPaused ? (
            <button
              onClick={stepExecution}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <SkipForward size={16} />
              <span>Step</span>
            </button>
          ) : null}
        </div>

        {/* Status and Progress */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-300">
              {wsConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          <div className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </div>

          {currentExecution && (
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
              <span className="text-sm text-gray-300">
                {currentExecution.progress?.completedNodes || 0}/{currentExecution.progress?.totalNodes || 0}
              </span>
            </div>
          )}
        </div>

        {/* Debug Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setDebugMode(!debugMode)}
            className={`p-2 rounded-lg transition-colors ${
              debugMode ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Toggle Debug Mode"
          >
            <Bug size={16} />
          </button>

          <button
            onClick={() => setStepByStep(!stepByStep)}
            className={`p-2 rounded-lg transition-colors ${
              stepByStep ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Toggle Step-by-Step Mode"
          >
            <SkipForward size={16} />
          </button>

          <button
            onClick={() => setShowLogs(!showLogs)}
            className={`p-2 rounded-lg transition-colors ${
              showLogs ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Toggle Execution Logs"
          >
            <Terminal size={16} />
          </button>

          <button
            onClick={() => setShowVariables(!showVariables)}
            className={`p-2 rounded-lg transition-colors ${
              showVariables ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Toggle Variables Inspector"
          >
            <Variable size={16} />
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${
              showSettings ? 'bg-gray-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Debug Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Expandable Panels */}
      <div className="space-y-4">
        {/* Execution Logs */}
        {showLogs && (
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-200">Execution Logs</h3>
              <button
                onClick={clearExecutionLogs}
                className="text-xs text-gray-400 hover:text-gray-200"
              >
                Clear
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {executionLogs.length === 0 ? (
                <div className="text-sm text-gray-500">No logs yet...</div>
              ) : (
                executionLogs.map((log, index) => (
                  <div key={index} className="text-sm text-gray-300 font-mono">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Variables Inspector */}
        {showVariables && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-200 mb-2">Variables</h3>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {Object.keys(executionVariables).length === 0 ? (
                <div className="text-sm text-gray-500">No variables yet...</div>
              ) : (
                Object.entries(executionVariables).map(([name, variable]) => (
                  <div key={name} className="bg-gray-700 rounded p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-blue-300">{name}</span>
                      <span className="text-xs text-gray-400">{variable.type}</span>
                    </div>
                    <div className="text-sm text-gray-300 font-mono break-all">
                      {typeof variable.value === 'object' 
                        ? JSON.stringify(variable.value, null, 2)
                        : String(variable.value)
                      }
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Debug Settings */}
        {showSettings && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-200 mb-3">Debug Settings</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Debug Mode</span>
                <button
                  onClick={() => setDebugMode(!debugMode)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    debugMode ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    debugMode ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Step-by-Step</span>
                <button
                  onClick={() => setStepByStep(!stepByStep)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    stepByStep ? 'bg-purple-600' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    stepByStep ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Breakpoints ({breakpoints.size})</span>
                <button
                  onClick={clearBreakpoints}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Clear All
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">WebSocket</span>
                <div className="flex space-x-2">
                  {!wsConnected ? (
                    <button
                      onClick={connect}
                      className="text-xs text-green-400 hover:text-green-300"
                    >
                      Connect
                    </button>
                  ) : (
                    <button
                      onClick={disconnect}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};