import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';
import { ArrowLeft, Play, RotateCcw, Download, CheckCircle, XCircle, Clock, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { SIMPLIFIED_NODE_TEMPLATES } from '../config/simplifiedNodeTemplates';

// Interface für Test-Status
interface TestStatus {
  status: 'not_tested' | 'testing' | 'success' | 'failed';
  timestamp?: string;
  result?: Record<string, unknown>;
  error?: string;
  duration?: number;
}

// Interface für Node-Test-Konfiguration
interface NodeTestConfig {
  nodeType: string;
  config: Record<string, unknown>;
  testStatus: TestStatus;
}

// Interface für Test-Ergebnisse
interface TestResults {
  [nodeType: string]: NodeTestConfig;
}

/**
 * Manual Trigger Test Page
 * Comprehensive testing interface for all node types
 * Allows individual testing of each node type with configuration
 */
export default function ManualTriggerTest() {
  const navigate = useNavigate();
  
  // State Management
  const [testResults, setTestResults] = useState<TestResults>({});
  const [selectedNodeType, setSelectedNodeType] = useState<string>('');
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Filter out websocket_config and live_desktop as specified
  const testableNodeTypes = Object.keys(SIMPLIFIED_NODE_TEMPLATES).filter(
    nodeType => !['websocket_config', 'live_desktop'].includes(nodeType)
  );

  /**
   * Initialize test results from localStorage on component mount
   */
  useEffect(() => {
    const savedResults = localStorage.getItem('manual_trigger_test_results');
    if (savedResults) {
      try {
        const parsed = JSON.parse(savedResults);
        setTestResults(parsed);
      } catch (error) {
        console.error('Error parsing saved test results:', error);
        initializeTestResults();
      }
    } else {
      initializeTestResults();
    }
  }, [initializeTestResults]);

  /**
   * Initialize test results for all testable node types
   */
  const initializeTestResults = useCallback(() => {
    const initialResults: TestResults = {};
    testableNodeTypes.forEach(nodeType => {
      const template = SIMPLIFIED_NODE_TEMPLATES[nodeType];
      initialResults[nodeType] = {
        nodeType,
        config: { ...template.defaultConfig },
        testStatus: { status: 'not_tested' }
      };
    });
    setTestResults(initialResults);
    saveTestResults(initialResults);
  }, [testableNodeTypes]);

  /**
   * Save test results to localStorage
   */
  const saveTestResults = (results: TestResults) => {
    localStorage.setItem('manual_trigger_test_results', JSON.stringify(results));
  };

  /**
   * Update configuration for a specific node type
   */
  const updateNodeConfig = (nodeType: string, configKey: string, value: unknown) => {
    setTestResults(prev => {
      const updated = {
        ...prev,
        [nodeType]: {
          ...prev[nodeType],
          config: {
            ...prev[nodeType].config,
            [configKey]: value
          }
        }
      };
      saveTestResults(updated);
      return updated;
    });
  };

  /**
   * Execute test for a specific node type
   */
  const executeNodeTest = async (nodeType: string) => {
    const startTime = Date.now();
    
    // Update status to testing
    setTestResults(prev => {
      const updated = {
        ...prev,
        [nodeType]: {
          ...prev[nodeType],
          testStatus: { status: 'testing' as const, timestamp: new Date().toISOString() }
        }
      };
      saveTestResults(updated);
      return updated;
    });

    try {
      // Simulate API call to backend for node execution
      const response = await fetch('/api/node-system/execute-single', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeType,
          config: testResults[nodeType].config,
          testMode: true
        })
      });

      const result = await response.json();
      const duration = Date.now() - startTime;

      if (response.ok) {
        // Test successful
        setTestResults(prev => {
          const updated = {
            ...prev,
            [nodeType]: {
              ...prev[nodeType],
              testStatus: {
                status: 'success' as const,
                timestamp: new Date().toISOString(),
                result,
                duration
              }
            }
          };
          saveTestResults(updated);
          return updated;
        });
        toast.success(`${SIMPLIFIED_NODE_TEMPLATES[nodeType].label} test successful!`);
      } else {
        throw new Error(result.error || 'Test failed');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Test failed
      setTestResults(prev => {
        const updated = {
          ...prev,
          [nodeType]: {
            ...prev[nodeType],
            testStatus: {
              status: 'failed' as const,
              timestamp: new Date().toISOString(),
              error: errorMessage,
              duration
            }
          }
        };
        saveTestResults(updated);
        return updated;
      });
      toast.error(`${SIMPLIFIED_NODE_TEMPLATES[nodeType].label} test failed: ${errorMessage}`);
    }
  };

  /**
   * Execute all tests sequentially
   */
  const executeAllTests = async () => {
    setIsTestingAll(true);
    toast.info('Starting comprehensive node testing...');
    
    for (const nodeType of testableNodeTypes) {
      await executeNodeTest(nodeType);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setIsTestingAll(false);
    toast.success('All node tests completed!');
  };

  /**
   * Reset all test results
   */
  const resetAllTests = () => {
    initializeTestResults();
    toast.info('All test results have been reset.');
  };

  /**
   * Export test results as JSON
   */
  const exportTestResults = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      testResults,
      summary: getTestSummary()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manual-trigger-test-results-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Test results exported successfully!');
  };

  /**
   * Get test summary statistics
   */
  const getTestSummary = () => {
    const total = testableNodeTypes.length;
    const tested = Object.values(testResults).filter(r => r.testStatus.status !== 'not_tested').length;
    const successful = Object.values(testResults).filter(r => r.testStatus.status === 'success').length;
    const failed = Object.values(testResults).filter(r => r.testStatus.status === 'failed').length;
    const progress = (tested / total) * 100;
    
    return { total, tested, successful, failed, progress };
  };

  /**
   * Get status badge for a test result
   */
  const getStatusBadge = (status: TestStatus['status']) => {
    switch (status) {
      case 'not_tested':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Not Tested</Badge>;
      case 'testing':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1 animate-spin" />Testing...</Badge>;
      case 'success':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Success</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  /**
   * Render configuration form for a node type
   */
  const renderNodeConfigForm = (nodeType: string) => {
    const template = SIMPLIFIED_NODE_TEMPLATES[nodeType];
    const config = testResults[nodeType]?.config || {};
    
    return (
      <div className="space-y-4">
        <h4 className="font-medium">Configuration</h4>
        {Object.entries(template.configSchema).map(([key, schema]: [string, Record<string, unknown>]) => {
          if (schema.hidden) return null;
          
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={`${nodeType}-${key}`}>{schema.label || key}</Label>
              {schema.type === 'string' && (
                <Input
                  id={`${nodeType}-${key}`}
                  value={config[key] || ''}
                  onChange={(e) => updateNodeConfig(nodeType, key, e.target.value)}
                  placeholder={schema.default || ''}
                />
              )}
              {schema.type === 'number' && (
                <Input
                  id={`${nodeType}-${key}`}
                  type="number"
                  value={config[key] || schema.default || 0}
                  onChange={(e) => updateNodeConfig(nodeType, key, parseInt(e.target.value))}
                  min={schema.min}
                  max={schema.max}
                />
              )}
              {schema.type === 'boolean' && (
                <div className="flex items-center space-x-2">
                  <input
                    id={`${nodeType}-${key}`}
                    type="checkbox"
                    checked={config[key] || false}
                    onChange={(e) => updateNodeConfig(nodeType, key, e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor={`${nodeType}-${key}`}>{schema.label || key}</Label>
                </div>
              )}
              {schema.type === 'select' && (
                <Select
                  value={config[key] || schema.default}
                  onValueChange={(value) => updateNodeConfig(nodeType, key, value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {schema.options.map((option: string) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {schema.type === 'object' && (
                <Textarea
                  id={`${nodeType}-${key}`}
                  value={JSON.stringify(config[key] || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      updateNodeConfig(nodeType, key, parsed);
                    } catch (error) {
                      // Invalid JSON, don't update
                    }
                  }}
                  placeholder="{}"
                  rows={3}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const summary = getTestSummary();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/workflow')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Workflow
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Manual Trigger Test Suite</h1>
            <p className="text-muted-foreground">
              Comprehensive testing interface for all node types
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button onClick={exportTestResults} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Results
          </Button>
          <Button onClick={resetAllTests} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset All
          </Button>
          <Button 
            onClick={executeAllTests} 
            disabled={isTestingAll}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Play className="w-4 h-4 mr-2" />
            {isTestingAll ? 'Testing All...' : 'Test All Nodes'}
          </Button>
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Test Progress Overview</CardTitle>
          <CardDescription>
            {summary.tested} of {summary.total} nodes tested
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={summary.progress} className="w-full" />
            <div className="flex justify-between text-sm">
              <span>Total: {summary.total}</span>
              <span>Tested: {summary.tested}</span>
              <span className="text-green-600">Success: {summary.successful}</span>
              <span className="text-red-600">Failed: {summary.failed}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Node Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Testing</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {testableNodeTypes.map(nodeType => {
              const template = SIMPLIFIED_NODE_TEMPLATES[nodeType];
              const testResult = testResults[nodeType];
              
              return (
                <Card key={nodeType} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{template.label}</CardTitle>
                      {getStatusBadge(testResult?.testStatus.status || 'not_tested')}
                    </div>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>Category:</span>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                      
                      {testResult?.testStatus.timestamp && (
                        <div className="text-xs text-muted-foreground">
                          Last tested: {new Date(testResult.testStatus.timestamp).toLocaleString()}
                        </div>
                      )}
                      
                      {testResult?.testStatus.duration && (
                        <div className="text-xs text-muted-foreground">
                          Duration: {testResult.testStatus.duration}ms
                        </div>
                      )}
                      
                      {testResult?.testStatus.error && (
                        <div className="text-xs text-red-600">
                          Error: {testResult.testStatus.error}
                        </div>
                      )}
                      
                      <Button 
                        onClick={() => executeNodeTest(nodeType)}
                        disabled={testResult?.testStatus.status === 'testing'}
                        className="w-full"
                        size="sm"
                      >
                        <Play className="w-3 h-3 mr-2" />
                        {testResult?.testStatus.status === 'testing' ? 'Testing...' : 'Test Node'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Detailed Testing Tab */}
        <TabsContent value="detailed" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Node Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Node Type</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedNodeType} onValueChange={setSelectedNodeType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a node type to configure" />
                  </SelectTrigger>
                  <SelectContent>
                    {testableNodeTypes.map(nodeType => {
                      const template = SIMPLIFIED_NODE_TEMPLATES[nodeType];
                      return (
                        <SelectItem key={nodeType} value={nodeType}>
                          {template.label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Configuration Panel */}
            {selectedNodeType && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <Settings className="w-5 h-5" />
                        <span>{SIMPLIFIED_NODE_TEMPLATES[selectedNodeType].label}</span>
                      </CardTitle>
                      <CardDescription>
                        {SIMPLIFIED_NODE_TEMPLATES[selectedNodeType].description}
                      </CardDescription>
                    </div>
                    {getStatusBadge(testResults[selectedNodeType]?.testStatus.status || 'not_tested')}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {renderNodeConfigForm(selectedNodeType)}
                    
                    <Separator />
                    
                    <div className="flex space-x-2">
                      <Button 
                        onClick={() => executeNodeTest(selectedNodeType)}
                        disabled={testResults[selectedNodeType]?.testStatus.status === 'testing'}
                        className="flex-1"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {testResults[selectedNodeType]?.testStatus.status === 'testing' ? 'Testing...' : 'Test Node'}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          const template = SIMPLIFIED_NODE_TEMPLATES[selectedNodeType];
                          updateNodeConfig(selectedNodeType, 'reset', template.defaultConfig);
                          setTestResults(prev => ({
                            ...prev,
                            [selectedNodeType]: {
                              ...prev[selectedNodeType],
                              config: { ...template.defaultConfig }
                            }
                          }));
                        }}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset Config
                      </Button>
                    </div>
                    
                    {/* Test Results Display */}
                    {testResults[selectedNodeType]?.testStatus.result && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Test Result</h4>
                        <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
                          {JSON.stringify(testResults[selectedNodeType].testStatus.result, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}