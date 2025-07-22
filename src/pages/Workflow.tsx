
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import SimplifiedWorkflowCanvas from '@/components/trae/SimplifiedWorkflowCanvas';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

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
              <div className="p-4">
                <h3 className="text-sm font-medium text-muted-foreground">Execution Panel</h3>
                <p className="text-xs text-muted-foreground mt-1">Debug and execution information will appear here</p>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default Workflow;
