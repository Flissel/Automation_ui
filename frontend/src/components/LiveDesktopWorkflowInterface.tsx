/**
 * Enhanced LiveDesktopWorkflowInterface - Modern "record → click → execute → save → wait → next" Interface
 * 
 * Features:
 * - Resizable panels with smooth animations
 * - Modern glassmorphism design
 * - Responsive layout with better UX
 * - Enhanced visual feedback and animations
 * - Professional color scheme and typography
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import LiveDesktopCanvas from './LiveDesktop/LiveDesktopCanvasRefactored';
import AutomationWorkflowPanel from './AutomationWorkflowPanel';
import { workflowIntegrationService, RecordedAction } from '../services/WorkflowIntegrationService';
import { OCRRegion, ClickAction } from './LiveDesktop/types';

interface LiveDesktopWorkflowInterfaceProps {
  wsUrl?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const LiveDesktopWorkflowInterface: React.FC<LiveDesktopWorkflowInterfaceProps> = ({
  wsUrl = 'ws://localhost:8000/ws/live-desktop',
  className = '',
  style = {}
}) => {
  // ================================
  // STATE MANAGEMENT
  // ================================
  
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedActionCount, setRecordedActionCount] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<boolean>(false);
  const [lastActionRecorded, setLastActionRecorded] = useState<RecordedAction | null>(null);
  const [showPanel, setShowPanel] = useState<boolean>(true);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [panelWidth, setPanelWidth] = useState<number>(400);
  const [showShortcuts, setShowShortcuts] = useState<boolean>(false);
  
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ================================
  // RESIZING FUNCTIONALITY
  // ================================

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;
      const minWidth = 300;
      const maxWidth = containerRect.width * 0.6;
      
      setPanelWidth(Math.min(Math.max(newWidth, minWidth), maxWidth));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
    };

    if (isResizing) {
      document.body.style.cursor = 'ew-resize';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  const handleResizeStart = () => {
    setIsResizing(true);
  };

  // ================================
  // KEYBOARD SHORTCUTS
  // ================================

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          toggleRecording();
          break;
        case 's':
          e.preventDefault();
          handleQuickScreenshot();
          break;
        case 'p':
          e.preventDefault();
          setShowPanel(!showPanel);
          break;
        case '?':
          e.preventDefault();
          setShowShortcuts(!showShortcuts);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [showPanel, showShortcuts]);

  // ================================
  // RECORDING STATE MANAGEMENT
  // ================================

  const startRecording = useCallback(() => {
    console.log('🎬 [WORKFLOW] Starting action recording...');
    setIsRecording(true);
    workflowIntegrationService.clearRecordedActions();
    setRecordedActionCount(0);
    setLastActionRecorded(null);
  }, []);

  const stopRecording = useCallback(() => {
    console.log('⏹️ [WORKFLOW] Stopping action recording...');
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // ================================
  // CANVAS EVENT HANDLERS
  // ================================

  const handleOCRRegionSelect = useCallback((region: OCRRegion) => {
    console.log('🔤 [WORKFLOW] OCR Region selected:', region, { isRecording });
    
    if (isRecording) {
      try {
        const expectedText = region.text || region.label || undefined;
        const action = workflowIntegrationService.recordOCRRegion(
          region.x,
          region.y,
          region.width,
          region.height,
          expectedText
        );
        setLastActionRecorded(action);
        setRecordedActionCount(prev => prev + 1);
        
        console.log('✅ [WORKFLOW] OCR region action recorded:', action);
      } catch (error) {
        console.error('❌ [WORKFLOW] Failed to record OCR region:', error);
      }
    }
  }, [isRecording]);

  const handleClickActionAdd = useCallback((clickAction: ClickAction) => {
    console.log('🎯 [WORKFLOW] Click action added:', clickAction, { isRecording });
    
    if (isRecording) {
      try {
        let button: 'left' | 'right' | 'middle' = 'left';
        switch (clickAction.action) {
          case 'click':
            button = 'left';
            break;
          case 'right_click':
            button = 'right';
            break;
          case 'double_click':
            button = 'left';
            break;
        }
        
        const action = workflowIntegrationService.recordClickAction(
          clickAction.x,
          clickAction.y,
          button
        );
        
        if (clickAction.action === 'double_click') {
          action.metadata = {
            ...action.metadata,
            description: `${action.metadata?.description || 'Click action'} (double-click)`,
            tags: [...(action.metadata?.tags || []), 'double-click']
          };
        }
        
        setLastActionRecorded(action);
        setRecordedActionCount(prev => prev + 1);
        
        console.log('✅ [WORKFLOW] Click action recorded:', action);
      } catch (error) {
        console.error('❌ [WORKFLOW] Failed to record click action:', error);
      }
    }
  }, [isRecording]);

  const handleConnectionChange = useCallback((connected: boolean) => {
    console.log('🔌 [WORKFLOW] Connection status changed:', connected);
    setConnectionStatus(connected);
  }, []);

  // ================================
  // WORKFLOW PANEL HANDLERS
  // ================================

  const handleActionRecorded = useCallback((action: RecordedAction) => {
    console.log('📋 [WORKFLOW] Action recorded from panel:', action);
    setLastActionRecorded(action);
    setRecordedActionCount(prev => prev + 1);
  }, []);

  // ================================
  // QUICK ACTIONS
  // ================================

  const handleQuickScreenshot = useCallback(() => {
    console.log('📸 [WORKFLOW] Taking quick screenshot...');
    try {
      const action = workflowIntegrationService.recordScreenshot();
      setLastActionRecorded(action);
      setRecordedActionCount(prev => prev + 1);
      console.log('✅ [WORKFLOW] Screenshot action recorded:', action);
    } catch (error) {
      console.error('❌ [WORKFLOW] Failed to record screenshot:', error);
    }
  }, []);

  // ================================
  // EFFECTS
  // ================================

  useEffect(() => {
    console.log('🚀 [WORKFLOW] LiveDesktopWorkflowInterface initialized');
    
    const initialActions = workflowIntegrationService.getRecordedActions();
    setRecordedActionCount(initialActions.length);
    
    return () => {
      console.log('🛑 [WORKFLOW] LiveDesktopWorkflowInterface cleanup');
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const actions = workflowIntegrationService.getRecordedActions();
      setRecordedActionCount(actions.length);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // ================================
  // RENDER
  // ================================

  return (
    <div 
      ref={containerRef}
      className={`live-desktop-workflow-interface ${className}`} 
      style={{
        display: 'flex',
        flexDirection: 'row',
        height: '100vh',
        width: '100vw',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        ...style
      }}
    >
      
      {/* Main Canvas Area */}
      <div style={{
        flex: 1,
        position: 'relative',
        marginRight: showPanel ? `${panelWidth}px` : 0,
        transition: 'margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: showPanel ? '0 20px 20px 0' : '0',
        overflow: 'hidden'
      }}>
        
        {/* Enhanced Recording Status Bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          background: isRecording 
            ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.9) 0%, rgba(21, 128, 61, 0.9) 100%)'
            : 'linear-gradient(135deg, rgba(71, 85, 105, 0.9) 0%, rgba(51, 65, 85, 0.9) 100%)',
          backdropFilter: 'blur(20px)',
          borderBottom: `3px solid ${isRecording ? '#10b981' : '#64748b'}`,
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px'
          }}>
            {/* Recording Status */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '600',
              fontSize: '16px',
              color: 'white'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: isRecording ? '#ef4444' : '#64748b',
                animation: isRecording ? 'pulse 2s infinite' : 'none'
              }} />
              {isRecording ? 'Recording Actions' : 'Recording Stopped'}
            </div>
            
            {/* Action Counter */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              fontSize: '14px',
              color: 'white',
              fontWeight: '500'
            }}>
              <span>📊</span>
              Actions: {recordedActionCount}
            </div>
            
            {/* Last Action */}
            {lastActionRecorded && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '16px',
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.9)',
                maxWidth: '200px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                Last: {lastActionRecorded.type} at {new Date(lastActionRecorded.timestamp).toLocaleTimeString()}
              </div>
            )}
            
            {/* Connection Status */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              color: connectionStatus ? '#10b981' : '#ef4444',
              fontWeight: '500'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: connectionStatus ? '#10b981' : '#ef4444',
                animation: connectionStatus ? 'none' : 'pulse 1s infinite'
              }} />
              {connectionStatus ? 'Connected' : 'Disconnected'}
            </div>
          </div>
          
          {/* Control Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center'
          }}>
            <button
              onClick={handleQuickScreenshot}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
              }}
            >
              📸 Screenshot
            </button>
            
            <button
              onClick={toggleRecording}
              style={{
                padding: '10px 20px',
                background: isRecording 
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
                  : 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '15px',
                transition: 'all 0.2s ease',
                boxShadow: isRecording 
                  ? '0 4px 12px rgba(239, 68, 68, 0.3)' 
                  : '0 4px 12px rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = isRecording 
                  ? '0 6px 16px rgba(239, 68, 68, 0.4)' 
                  : '0 6px 16px rgba(16, 185, 129, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = isRecording 
                  ? '0 4px 12px rgba(239, 68, 68, 0.3)' 
                  : '0 4px 12px rgba(16, 185, 129, 0.3)';
              }}
            >
              {isRecording ? '⏹️ Stop Recording' : '🎬 Start Recording'}
            </button>
            
            <button
              onClick={() => setShowPanel(!showPanel)}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(6, 182, 212, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(6, 182, 212, 0.3)';
              }}
            >
              {showPanel ? '👁️ Hide Panel' : '📋 Show Panel'}
            </button>
          </div>
        </div>
        
        {/* Live Desktop Canvas */}
        <div style={{
          position: 'absolute',
          top: '70px',
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          borderRadius: '0 0 20px 20px'
        }}>
          <LiveDesktopCanvas
            wsUrl={wsUrl}
            onOCRRegionSelect={handleOCRRegionSelect}
            onClickActionAdd={handleClickActionAdd}
            onConnectionChange={handleConnectionChange}
            enableDebugLogs={true}
            isRecording={isRecording}
            style={{
              width: '100%',
              height: '100%'
            }}
          />
        </div>
        
        {/* Enhanced Recording Instructions Overlay */}
        {isRecording && (
          <div style={{
            position: 'absolute',
            top: '90px',
            left: '24px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95))',
            backdropFilter: 'blur(20px)',
            color: 'white',
            padding: '20px',
            borderRadius: '16px',
            maxWidth: '320px',
            zIndex: 5,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            animation: 'slideInFromLeft 0.5s ease-out'
          }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '600' }}>
              🎬 Recording Active
            </h4>
            <div style={{ fontSize: '14px', lineHeight: '1.5', marginBottom: '12px' }}>
              <div style={{ marginBottom: '6px' }}>• Click anywhere to record click actions</div>
              <div style={{ marginBottom: '6px' }}>• Draw OCR regions by enabling OCR mode</div>
              <div>• Use the screenshot button for full screen captures</div>
            </div>
            <div style={{ 
              fontSize: '12px', 
              opacity: 0.9, 
              padding: '8px 12px', 
              backgroundColor: 'rgba(255, 255, 255, 0.1)', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              Actions recorded: {recordedActionCount}
            </div>
          </div>
        )}
      </div>
      
      {/* Resizable Workflow Panel */}
      {showPanel && (
        <>
          {/* Resize Handle */}
          <div
            ref={resizeHandleRef}
            onMouseDown={handleResizeStart}
            style={{
              position: 'absolute',
              right: `${panelWidth - 2}px`,
              top: 0,
              bottom: 0,
              width: '4px',
              cursor: 'ew-resize',
              background: isResizing 
                ? 'linear-gradient(to bottom, #3b82f6, #8b5cf6)' 
                : 'rgba(255, 255, 255, 0.3)',
              zIndex: 20,
              transition: isResizing ? 'none' : 'background 0.2s ease',
              opacity: isResizing ? 1 : 0.7
            }}
            onMouseEnter={(e) => {
              if (!isResizing) {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.background = 'linear-gradient(to bottom, #3b82f6, #8b5cf6)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isResizing) {
                e.currentTarget.style.opacity = '0.7';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              }
            }}
          />
          
          {/* Panel Container */}
          <div style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: `${panelWidth}px`,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '20px 0 0 20px',
            overflowY: 'auto',
            boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.1)',
            transition: isResizing ? 'none' : 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 10
          }}>
            <AutomationWorkflowPanel
              onRecordAction={handleActionRecorded}
              isRecording={isRecording}
              style={{
                height: '100%',
                border: 'none',
                borderRadius: 0,
                background: 'transparent'
              }}
            />
          </div>
        </>
      )}
      
      {/* Enhanced Keyboard Shortcuts Help */}
      <div 
        style={{
          position: 'fixed',
          bottom: '24px',
          right: showPanel ? `${panelWidth + 24}px` : '24px',
          background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.8), rgba(31, 41, 55, 0.8))',
          backdropFilter: 'blur(12px)',
          color: 'white',
          padding: '16px',
          borderRadius: '12px',
          fontSize: '13px',
          zIndex: 100,
          transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          cursor: 'pointer'
        }}
        onClick={() => setShowShortcuts(!showShortcuts)}
      >
        <div style={{ fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ⌨️ Keyboard Shortcuts
          <span style={{ fontSize: '10px', opacity: 0.7 }}>
            {showShortcuts ? '▼' : '▶'}
          </span>
        </div>
        <div style={{ 
          overflow: 'hidden',
          maxHeight: showShortcuts ? '200px' : '0',
          transition: 'max-height 0.3s ease'
        }}>
          <div style={{ marginBottom: '4px' }}>Space: Toggle Recording</div>
          <div style={{ marginBottom: '4px' }}>S: Take Screenshot</div>
          <div style={{ marginBottom: '4px' }}>P: Toggle Panel</div>
          <div>?: Toggle Help</div>
        </div>
      </div>

      {/* CSS Animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          
          @keyframes slideInFromLeft {
            from {
              transform: translateX(-100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          .live-desktop-workflow-interface ::-webkit-scrollbar {
            width: 8px;
          }
          
          .live-desktop-workflow-interface ::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
          }
          
          .live-desktop-workflow-interface ::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
            border-radius: 4px;
          }
          
          .live-desktop-workflow-interface ::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.5);
          }
        `
      }} />
    </div>
  );
};

export default LiveDesktopWorkflowInterface;