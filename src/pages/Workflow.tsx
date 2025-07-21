
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import SimplifiedWorkflowCanvas from '@/components/trae/SimplifiedWorkflowCanvas';

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

      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        <SimplifiedWorkflowCanvas />
      </div>
    </div>
  );
};

export default Workflow;
