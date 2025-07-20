import React, { useState, useCallback, useEffect } from 'react';
import { ReactFlow, Node, Edge, addEdge, Connection, useNodesState, useEdgesState } from 'reactflow';
import api from '../../../services/api';

// Types for intelligent connection analysis
interface ElementRelationship {
  sourceElement: string;
  targetElement: string;
  relationshipType: 'sequential' | 'conditional' | 'parallel' | 'hierarchical';
  confidence: number;
  description: string;
}

interface ConnectionSuggestion {
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: 'success' | 'error' | 'next' | 'parallel' | 'conditional';
  label?: string;
  confidence: number;
  reasoning: string;
}

interface PageContext {
  url: string;
  pageType: 'form' | 'ecommerce' | 'navigation' | 'content' | 'unknown';
  elements: any[];
  relationships: ElementRelationship[];
}

const IntelligentConnectionExample: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const [connectionSuggestions, setConnectionSuggestions] = useState<ConnectionSuggestion[]>([]);
  const [selectedUrl, setSelectedUrl] = useState('https://example.com');

  // Analyze page for intelligent connections
  const analyzePageForConnections = useCallback(async (url: string) => {
    setIsAnalyzing(true);
    try {
      // Step 1: Get page analysis with element detection
      const analysisResponse = await api.playwright.getPageSuggestions(url, {
        analysis_config: {
          enabled: true,
          detect_forms: true,
          detect_buttons: true,
          detect_links: true,
          detect_inputs: true,
          generate_suggestions: true,
          max_elements: 50
        }
      });

      if (!analysisResponse.success) {
        throw new Error('Failed to analyze page');
      }

      const suggestions = analysisResponse.data.analysis.suggestions;
      
      // Step 2: Determine page type and context
      const context = determinePageContext(url, suggestions);
      setPageContext(context);

      // Step 3: Generate nodes from suggestions
      const generatedNodes = generateNodesFromSuggestions(suggestions, context);
      
      // Step 4: Analyze element relationships
      const relationships = analyzeElementRelationships(suggestions, context);
      
      // Step 5: Generate intelligent connections
      const connections = generateIntelligentConnections(generatedNodes, relationships, context);
      setConnectionSuggestions(connections);

      // Step 6: Create workflow with intelligent edges
      const { nodes: finalNodes, edges: finalEdges } = createWorkflowWithConnections(
        generatedNodes,
        connections
      );

      setNodes(finalNodes);
      setEdges(finalEdges);

    } catch (error) {
      console.error('Error analyzing page:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [setNodes, setEdges]);

  // Determine the type and context of the page
  const determinePageContext = (url: string, suggestions: any[]): PageContext => {
    const formElements = suggestions.filter(s => s.type === 'fill' || s.element.includes('form'));
    const buttonElements = suggestions.filter(s => s.type === 'click' && s.element.includes('button'));
    const linkElements = suggestions.filter(s => s.type === 'click' && s.element.includes('link'));
    const commerceKeywords = ['cart', 'checkout', 'buy', 'purchase', 'price', 'product'];
    
    let pageType: PageContext['pageType'] = 'unknown';
    
    // Determine page type based on elements and URL
    if (formElements.length > 3) {
      pageType = 'form';
    } else if (suggestions.some(s => commerceKeywords.some(keyword => 
      s.element.toLowerCase().includes(keyword) || s.description?.toLowerCase().includes(keyword)
    ))) {
      pageType = 'ecommerce';
    } else if (linkElements.length > buttonElements.length) {
      pageType = 'navigation';
    } else {
      pageType = 'content';
    }

    return {
      url,
      pageType,
      elements: suggestions,
      relationships: []
    };
  };

  // Generate nodes from page analysis suggestions
  const generateNodesFromSuggestions = (suggestions: any[], context: PageContext): Node[] => {
    const nodes: Node[] = [];
    
    // Add navigation node
    nodes.push({
      id: 'navigate',
      type: 'playwright_action',
      position: { x: 100, y: 100 },
      data: {
        label: 'Navigate to Page',
        config: {
          action: 'navigate',
          url: context.url
        }
      }
    });

    // Generate nodes based on suggestions
    suggestions.forEach((suggestion, index) => {
      const nodeId = `${suggestion.type}-${index}`;
      const position = calculateNodePosition(index, suggestion.type, context.pageType);
      
      nodes.push({
        id: nodeId,
        type: 'playwright_action',
        position,
        data: {
          label: suggestion.description || `${suggestion.type} action`,
          config: {
            action: suggestion.type,
            selector: suggestion.selector,
            value: suggestion.suggested_value || '',
            description: suggestion.description
          },
          suggestion: suggestion
        }
      });
    });

    return nodes;
  };

  // Calculate intelligent node positioning
  const calculateNodePosition = (index: number, type: string, pageType: string) => {
    const baseX = 300;
    const baseY = 100;
    const spacing = 200;
    
    switch (pageType) {
      case 'form':
        // Sequential layout for forms
        return { x: baseX, y: baseY + (index * spacing) };
      case 'ecommerce':
        // Branched layout for e-commerce
        if (type === 'click') {
          return { x: baseX + 300, y: baseY + (index * 150) };
        }
        return { x: baseX, y: baseY + (index * 150) };
      case 'navigation':
        // Horizontal layout for navigation
        return { x: baseX + (index * spacing), y: baseY };
      default:
        // Grid layout for unknown types
        const cols = 3;
        const row = Math.floor(index / cols);
        const col = index % cols;
        return { x: baseX + (col * spacing), y: baseY + (row * spacing) };
    }
  };

  // Analyze relationships between elements
  const analyzeElementRelationships = (suggestions: any[], context: PageContext): ElementRelationship[] => {
    const relationships: ElementRelationship[] = [];
    
    for (let i = 0; i < suggestions.length; i++) {
      for (let j = i + 1; j < suggestions.length; j++) {
        const source = suggestions[i];
        const target = suggestions[j];
        
        const relationship = determineRelationship(source, target, context);
        if (relationship) {
          relationships.push(relationship);
        }
      }
    }
    
    return relationships.sort((a, b) => b.confidence - a.confidence);
  };

  // Determine relationship between two elements
  const determineRelationship = (source: any, target: any, context: PageContext): ElementRelationship | null => {
    // Sequential relationships (form fields)
    if (source.type === 'fill' && target.type === 'fill') {
      const sourceOrder = getElementOrder(source.selector);
      const targetOrder = getElementOrder(target.selector);
      
      if (targetOrder > sourceOrder) {
        return {
          sourceElement: source.selector,
          targetElement: target.selector,
          relationshipType: 'sequential',
          confidence: 0.8,
          description: `Fill ${source.description} before ${target.description}`
        };
      }
    }
    
    // Submit relationship (form field to submit button)
    if (source.type === 'fill' && target.type === 'click' && 
        target.element.toLowerCase().includes('submit')) {
      return {
        sourceElement: source.selector,
        targetElement: target.selector,
        relationshipType: 'sequential',
        confidence: 0.9,
        description: `Fill ${source.description} then submit form`
      };
    }
    
    // Conditional relationships (success/error paths)
    if (source.type === 'click' && target.type === 'extract') {
      if (target.element.toLowerCase().includes('error')) {
        return {
          sourceElement: source.selector,
          targetElement: target.selector,
          relationshipType: 'conditional',
          confidence: 0.7,
          description: `Handle error after ${source.description}`
        };
      }
      if (target.element.toLowerCase().includes('success')) {
        return {
          sourceElement: source.selector,
          targetElement: target.selector,
          relationshipType: 'conditional',
          confidence: 0.7,
          description: `Handle success after ${source.description}`
        };
      }
    }
    
    // Parallel relationships (multiple extractions)
    if (source.type === 'extract' && target.type === 'extract') {
      return {
        sourceElement: source.selector,
        targetElement: target.selector,
        relationshipType: 'parallel',
        confidence: 0.6,
        description: `Extract ${source.description} and ${target.description} simultaneously`
      };
    }
    
    return null;
  };

  // Get element order based on DOM position
  const getElementOrder = (selector: string): number => {
    // Simple heuristic based on selector complexity and common patterns
    if (selector.includes('email')) return 1;
    if (selector.includes('password')) return 2;
    if (selector.includes('confirm')) return 3;
    if (selector.includes('submit')) return 10;
    
    // Default ordering based on selector
    return selector.length;
  };

  // Generate intelligent connections between nodes
  const generateIntelligentConnections = (
    nodes: Node[],
    relationships: ElementRelationship[],
    context: PageContext
  ): ConnectionSuggestion[] => {
    const connections: ConnectionSuggestion[] = [];
    
    // Connect navigation node to first action
    if (nodes.length > 1) {
      connections.push({
        sourceNodeId: 'navigate',
        targetNodeId: nodes[1].id,
        edgeType: 'next',
        label: 'Start',
        confidence: 1.0,
        reasoning: 'Navigation must happen before any page interactions'
      });
    }
    
    // Generate connections based on relationships
    relationships.forEach(relationship => {
      const sourceNode = nodes.find(n => 
        n.data.suggestion?.selector === relationship.sourceElement
      );
      const targetNode = nodes.find(n => 
        n.data.suggestion?.selector === relationship.targetElement
      );
      
      if (sourceNode && targetNode) {
        let edgeType: ConnectionSuggestion['edgeType'] = 'next';
        
        switch (relationship.relationshipType) {
          case 'sequential':
            edgeType = 'next';
            break;
          case 'conditional':
            edgeType = relationship.description.includes('error') ? 'error' : 'success';
            break;
          case 'parallel':
            edgeType = 'parallel';
            break;
        }
        
        connections.push({
          sourceNodeId: sourceNode.id,
          targetNodeId: targetNode.id,
          edgeType,
          label: relationship.relationshipType,
          confidence: relationship.confidence,
          reasoning: relationship.description
        });
      }
    });
    
    return connections.sort((a, b) => b.confidence - a.confidence);
  };

  // Create workflow with intelligent connections
  const createWorkflowWithConnections = (
    nodes: Node[],
    connections: ConnectionSuggestion[]
  ): { nodes: Node[]; edges: Edge[] } => {
    const edges: Edge[] = [];
    
    connections.forEach((connection, index) => {
      const edgeStyle = getEdgeStyle(connection.edgeType);
      
      edges.push({
        id: `edge-${index}`,
        source: connection.sourceNodeId,
        target: connection.targetNodeId,
        label: connection.label,
        style: edgeStyle,
        data: {
          confidence: connection.confidence,
          reasoning: connection.reasoning
        }
      });
    });
    
    return { nodes, edges };
  };

  // Get edge styling based on type
  const getEdgeStyle = (edgeType: string) => {
    switch (edgeType) {
      case 'success':
        return { stroke: '#10b981', strokeWidth: 2 };
      case 'error':
        return { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5,5' };
      case 'parallel':
        return { stroke: '#8b5cf6', strokeWidth: 2 };
      case 'conditional':
        return { stroke: '#f59e0b', strokeWidth: 2 };
      default:
        return { stroke: '#6b7280', strokeWidth: 2 };
    }
  };

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Control Panel */}
      <div className="bg-white border-b p-4 flex items-center gap-4">
        <input
          type="url"
          value={selectedUrl}
          onChange={(e) => setSelectedUrl(e.target.value)}
          placeholder="Enter URL to analyze"
          className="flex-1 px-3 py-2 border rounded-md"
        />
        <button
          onClick={() => analyzePageForConnections(selectedUrl)}
          disabled={isAnalyzing}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Page'}
        </button>
      </div>

      {/* Page Context Info */}
      {pageContext && (
        <div className="bg-gray-50 border-b p-4">
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium">Page Type:</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
              {pageContext.pageType}
            </span>
            <span className="font-medium">Elements Found:</span>
            <span>{pageContext.elements.length}</span>
            <span className="font-medium">Connections:</span>
            <span>{connectionSuggestions.length}</span>
          </div>
        </div>
      )}

      {/* Connection Suggestions Panel */}
      {connectionSuggestions.length > 0 && (
        <div className="bg-white border-b p-4 max-h-32 overflow-y-auto">
          <h3 className="font-medium mb-2">Intelligent Connection Suggestions:</h3>
          <div className="space-y-1 text-sm">
            {connectionSuggestions.slice(0, 5).map((suggestion, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  suggestion.confidence > 0.8 ? 'bg-green-500' :
                  suggestion.confidence > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="text-gray-600">
                  {suggestion.reasoning} (confidence: {(suggestion.confidence * 100).toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* React Flow Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          className="bg-gray-50"
        >
          {/* Add controls, minimap, etc. as needed */}
        </ReactFlow>
      </div>

      {/* Analysis Results */}
      {pageContext && (
        <div className="bg-white border-t p-4 max-h-48 overflow-y-auto">
          <h3 className="font-medium mb-2">Analysis Results:</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-700">Detected Elements:</h4>
              <ul className="mt-1 space-y-1">
                {pageContext.elements.slice(0, 5).map((element, index) => (
                  <li key={index} className="text-gray-600">
                    {element.type}: {element.description}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-700">Relationship Analysis:</h4>
              <ul className="mt-1 space-y-1">
                {pageContext.relationships.slice(0, 5).map((rel, index) => (
                  <li key={index} className="text-gray-600">
                    {rel.relationshipType}: {rel.description}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntelligentConnectionExample;