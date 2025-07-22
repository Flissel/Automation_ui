
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import SimplifiedWorkflowCanvas from '@/components/trae/SimplifiedWorkflowCanvas';
import ExecutionHistory from '@/components/trae/ExecutionHistory';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Workflow: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Simplified Workflow Builder</h1>
            <p className="text-sm text-muted-foreground">n8n-style visual workflow automation</p>
          </div>
        </div>
      </div>

      {/* Canvas and Debug Panel */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={70} minSize={30}>
            <SimplifiedWorkflowCanvas />
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={30} minSize={20} maxSize={60}>
            <div className="h-full bg-card border-t">
              <Tabs defaultValue="executions" className="h-full flex flex-col">
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                  <TabsTrigger 
                    value="executions" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    Executions
                  </TabsTrigger>
                  <TabsTrigger 
                    value="console" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    Console
                  </TabsTrigger>
                  <TabsTrigger 
                    value="variables" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    Variables
                  </TabsTrigger>
                  <TabsTrigger 
                    value="settings" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    Settings
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="executions" className="flex-1 p-4 m-0">
                  <ExecutionHistory />
                </TabsContent>
                
                <TabsContent value="console" className="flex-1 p-4 m-0">
                  <div className="h-full">
                    <h3 className="text-sm font-medium text-foreground mb-2">Debug Console</h3>
                    <p className="text-xs text-muted-foreground">Log stream and debug output will appear here</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="variables" className="flex-1 p-4 m-0">
                  <div className="h-full">
                    <h3 className="text-sm font-medium text-foreground mb-2">Node Variables</h3>
                    <p className="text-xs text-muted-foreground">Node input/output data and variables will appear here</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="settings" className="flex-1 p-4 m-0">
                  <div className="h-full">
                    <h3 className="text-sm font-medium text-foreground mb-2">Panel Settings</h3>
                    <p className="text-xs text-muted-foreground">Execution panel configuration options will appear here</p>
                  </div>
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
