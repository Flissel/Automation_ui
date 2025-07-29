
import React, { useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Save, Download, Upload, Maximize2, Minimize2 } from 'lucide-react';
import SimplifiedWorkflowCanvas from '@/components/trae/SimplifiedWorkflowCanvas';
import ExecutionHistory from '@/components/trae/ExecutionHistory';
import ConsoleLog from '@/components/trae/ConsoleLog';
import WorkflowVariables from '@/components/trae/WorkflowVariables';
import WorkflowSettings from '@/components/trae/WorkflowSettings';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWorkflowStore } from '@/stores/workflowStore';
import AppHeader from '@/components/layout/AppHeader';

const Workflow: React.FC = () => {
  const {
    nodes,
    edges,
    setNodes,
    panelSizes,
    setPanelSizes,
    activeDebugTab,
    setActiveDebugTab,
    workflowName,
    setWorkflowName
  } = useWorkflowStore();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            console.log('Save workflow');
            break;
          case 'o':
            e.preventDefault();
            console.log('Open workflow');
            break;
          case 'Enter':
            e.preventDefault();
            console.log('Execute workflow');
            break;
        }
      }
      
      if (e.key === 'F5') {
        e.preventDefault();
        console.log('Execute workflow');
      }
      
      // Tab switching
      if (e.ctrlKey && e.key >= '1' && e.key <= '4') {
        e.preventDefault();
        const tabs = ['executions', 'console', 'variables', 'settings'];
        setActiveDebugTab(tabs[parseInt(e.key) - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveDebugTab]);

  // Panel resize handler with constraints
  const handlePanelResize = useCallback((sizes: number[]) => {
    const canvasSize = Math.max(30, Math.min(80, sizes[0]));
    const debugSize = 100 - canvasSize;
    
    setPanelSizes({
      canvas: canvasSize,
      debug: debugSize
    });
  }, [setPanelSizes]);

  const headerActions = (
    <div className="flex items-center space-x-2">
      <Button variant="outline" size="sm">
        <Upload className="w-4 h-4 mr-2" />
        Load
      </Button>
      <Button variant="outline" size="sm">
        <Download className="w-4 h-4 mr-2" />
        Save
      </Button>
      <Button size="sm">
        <Play className="w-4 h-4 mr-2" />
        Execute
      </Button>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <AppHeader 
        title={workflowName}
        subtitle="n8n-style visual workflow automation"
        actions={headerActions}
      />

      {/* Canvas and Debug Panel */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup 
          direction="vertical" 
          onLayout={handlePanelResize}
          className="min-h-0"
        >
          <ResizablePanel 
            defaultSize={panelSizes.canvas} 
            minSize={30}
            maxSize={80}
            className="min-h-0"
          >
            <SimplifiedWorkflowCanvas />
          </ResizablePanel>
          
          <ResizableHandle withHandle className="hover:bg-primary/20 transition-colors" />
          
          <ResizablePanel 
            defaultSize={panelSizes.debug}
            minSize={20} 
            maxSize={70}
            className="min-h-0"
          >
            <div className="h-full bg-card border-t">
              <Tabs 
                value={activeDebugTab}
                onValueChange={setActiveDebugTab}
                className="h-full flex flex-col"
              >
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 shrink-0">
                  <TabsTrigger 
                    value="executions" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent relative"
                  >
                    Executions
                    <kbd className="ml-2 text-xs opacity-60">Ctrl+1</kbd>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="console" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent relative"
                  >
                    Console
                    <kbd className="ml-2 text-xs opacity-60">Ctrl+2</kbd>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="variables" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent relative"
                  >
                    Variables
                    <kbd className="ml-2 text-xs opacity-60">Ctrl+3</kbd>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="settings" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent relative"
                  >
                    Settings
                    <kbd className="ml-2 text-xs opacity-60">Ctrl+4</kbd>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="executions" className="flex-1 p-4 m-0 min-h-0 overflow-auto">
                  <ExecutionHistory 
                    nodes={nodes} 
                    edges={edges} 
                    workflowName={workflowName}
                    onNodeUpdate={(nodeId, updates) => {
                      setNodes(prevNodes => 
                        prevNodes.map(node => 
                          node.id === nodeId ? { ...node, data: { ...node.data, ...updates } } : node
                        )
                      );
                    }}
                  />
                </TabsContent>
                
                <TabsContent value="console" className="flex-1 p-4 m-0 min-h-0 overflow-auto">
                  <ConsoleLog />
                </TabsContent>
                
                <TabsContent value="variables" className="flex-1 m-0 min-h-0 overflow-auto">
                  <WorkflowVariables />
                </TabsContent>
                
                <TabsContent value="settings" className="flex-1 m-0 min-h-0 overflow-auto">
                  <WorkflowSettings />
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default Workflow;
