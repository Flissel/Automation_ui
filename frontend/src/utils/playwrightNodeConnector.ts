import { Node, Edge } from 'reactflow';
import { playwrightApi } from '../services/api';
import { 
  IntelligentConnectionAnalyzer, 
  ConnectionSuggestion, 
  PageContext,
  ElementRelationship,
  COMMON_CONNECTION_RULES 
} from './intelligentConnections';

// Types for node connection logic
export interface PlaywrightNodeConnection {
  sourceNodeId: string;
  targetNodeId: string;
  connectionType: 'sequential' | 'conditional' | 'parallel' | 'hierarchical';
  confidence: number;
  reasoning: string;
  elementContext: {
    sourceElement: ElementInfo;
    targetElement: ElementInfo;
    relationship: ElementRelationship;
  };
}

export interface ElementInfo {
  selector: string;
  tagName: string;
  type?: string;
  text?: string;
  attributes: Record<string, string>;
  position: { x: number; y: number; width: number; height: number };
  isVisible: boolean;
  isInteractable: boolean;
}

export interface NodeConnectionContext {
  url: string;
  pageType: string;
  flowPattern: string;
  elements: ElementInfo[];
  existingNodes: Node[];
  connectionRules: any[];
}

export interface SmartConnectionResult {
  connections: PlaywrightNodeConnection[];
  suggestedNodes: Node[];
  suggestedEdges: Edge[];
  pageContext: PageContext;
  confidence: number;
  reasoning: string[];
}

// Main class for intelligent Playwright node connections
export class PlaywrightNodeConnector {
  private analyzer: IntelligentConnectionAnalyzer;
  private connectionHistory: Map<string, PlaywrightNodeConnection[]> = new Map();
  private elementCache: Map<string, ElementInfo[]> = new Map();

  constructor() {
    this.analyzer = new IntelligentConnectionAnalyzer();
  }

  /**
   * Analyze a webpage and generate intelligent node connections
   */
  async analyzeAndConnect(
    url: string, 
    existingNodes: Node[] = [],
    options: {
      maxConnections?: number;
      minConfidence?: number;
      enableParallelConnections?: boolean;
      enableConditionalConnections?: boolean;
      customRules?: any[];
    } = {}
  ): Promise<SmartConnectionResult> {
    try {
      // Step 1: Analyze the page for elements and context
      const pageAnalysis = await this.analyzePage(url);
      
      // Step 2: Generate intelligent connections
      const connectionResult = await this.analyzer.analyzeConnections(
        url,
        {
          maxConnections: options.maxConnections || 10,
          minConfidence: options.minConfidence || 0.6,
          enableParallelConnections: options.enableParallelConnections ?? true,
          enableConditionalConnections: options.enableConditionalConnections ?? true,
          customRules: options.customRules || COMMON_CONNECTION_RULES
        }
      );

      // Step 3: Convert to Playwright node connections
      const playwrightConnections = this.convertToPlaywrightConnections(
        connectionResult.suggestions,
        pageAnalysis.elements,
        existingNodes
      );

      // Step 4: Generate suggested nodes and edges
      const { suggestedNodes, suggestedEdges } = this.generateNodesAndEdges(
        playwrightConnections,
        pageAnalysis,
        existingNodes
      );

      // Step 5: Calculate overall confidence and reasoning
      const overallConfidence = this.calculateOverallConfidence(playwrightConnections);
      const reasoning = this.generateReasoningExplanation(
        playwrightConnections,
        pageAnalysis
      );

      // Cache results
      this.connectionHistory.set(url, playwrightConnections);
      this.elementCache.set(url, pageAnalysis.elements);

      return {
        connections: playwrightConnections,
        suggestedNodes,
        suggestedEdges,
        pageContext: connectionResult.context,
        confidence: overallConfidence,
        reasoning
      };

    } catch (error) {
      console.error('Error in analyzeAndConnect:', error);
      throw new Error(`Failed to analyze and connect nodes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze page elements using Playwright
   */
  private async analyzePage(url: string): Promise<{ elements: ElementInfo[]; pageType: string }> {
    try {
      // Use Playwright API to analyze the page
      const response = await playwrightApi.analyzePage({
        url,
        options: {
          includeHidden: false,
          includeNonInteractable: false,
          maxElements: 50,
          analysisDepth: 'detailed'
        }
      });

      // Convert API response to ElementInfo format
      const elements: ElementInfo[] = response.elements.map(element => ({
        selector: element.selector,
        tagName: element.tagName,
        type: element.attributes?.type,
        text: element.text,
        attributes: element.attributes || {},
        position: element.boundingBox || { x: 0, y: 0, width: 0, height: 0 },
        isVisible: element.isVisible ?? true,
        isInteractable: element.isInteractable ?? true
      }));

      return {
        elements,
        pageType: response.pageType || 'unknown'
      };

    } catch (error) {
      console.error('Error analyzing page:', error);
      // Fallback to mock data for demo purposes
      return this.generateMockElements(url);
    }
  }

  /**
   * Convert connection suggestions to Playwright-specific connections
   */
  private convertToPlaywrightConnections(
    suggestions: ConnectionSuggestion[],
    elements: ElementInfo[],
    existingNodes: Node[]
  ): PlaywrightNodeConnection[] {
    return suggestions.map(suggestion => {
      const sourceElement = elements.find(el => el.selector === suggestion.sourceElement);
      const targetElement = elements.find(el => el.selector === suggestion.targetElement);

      if (!sourceElement || !targetElement) {
        throw new Error(`Element not found for connection: ${suggestion.sourceElement} -> ${suggestion.targetElement}`);
      }

      return {
        sourceNodeId: this.generateNodeId(sourceElement),
        targetNodeId: this.generateNodeId(targetElement),
        connectionType: suggestion.type,
        confidence: suggestion.confidence,
        reasoning: suggestion.reasoning,
        elementContext: {
          sourceElement,
          targetElement,
          relationship: suggestion.relationship
        }
      };
    });
  }

  /**
   * Generate React Flow nodes and edges from connections
   */
  private generateNodesAndEdges(
    connections: PlaywrightNodeConnection[],
    pageAnalysis: { elements: ElementInfo[]; pageType: string },
    existingNodes: Node[]
  ): { suggestedNodes: Node[]; suggestedEdges: Edge[] } {
    const nodeMap = new Map<string, Node>();
    const edges: Edge[] = [];

    // Create nodes for each unique element
    connections.forEach(connection => {
      // Source node
      if (!nodeMap.has(connection.sourceNodeId)) {
        const sourceNode = this.createPlaywrightNode(
          connection.elementContext.sourceElement,
          connection.sourceNodeId
        );
        nodeMap.set(connection.sourceNodeId, sourceNode);
      }

      // Target node
      if (!nodeMap.has(connection.targetNodeId)) {
        const targetNode = this.createPlaywrightNode(
          connection.elementContext.targetElement,
          connection.targetNodeId
        );
        nodeMap.set(connection.targetNodeId, targetNode);
      }

      // Create edge
      const edge: Edge = {
        id: `${connection.sourceNodeId}-${connection.targetNodeId}`,
        source: connection.sourceNodeId,
        target: connection.targetNodeId,
        type: this.getEdgeType(connection.connectionType),
        data: {
          connectionType: connection.connectionType,
          confidence: connection.confidence,
          reasoning: connection.reasoning,
          relationship: connection.elementContext.relationship
        },
        style: this.getEdgeStyle(connection),
        label: this.getEdgeLabel(connection)
      };
      edges.push(edge);
    });

    // Position nodes intelligently
    const positionedNodes = this.positionNodes(Array.from(nodeMap.values()), pageAnalysis);

    return {
      suggestedNodes: positionedNodes,
      suggestedEdges: edges
    };
  }

  /**
   * Create a Playwright node from an element
   */
  private createPlaywrightNode(element: ElementInfo, nodeId: string): Node {
    const action = this.determineNodeAction(element);
    const position = this.calculateNodePosition(element);

    return {
      id: nodeId,
      type: 'playwright_action',
      position,
      data: {
        label: this.generateNodeLabel(element, action),
        action,
        selector: element.selector,
        value: element.text || '',
        url: '', // Will be set by the workflow
        waitCondition: 'networkidle',
        timeout: 30000,
        extractionType: action === 'extract' ? 'text' : undefined,
        elementInfo: element,
        confidence: 0.8,
        reasoning: `Auto-generated ${action} action for ${element.tagName}${element.type ? `[type="${element.type}"]` : ''}`
      }
    };
  }

  /**
   * Determine the appropriate action for an element
   */
  private determineNodeAction(element: ElementInfo): string {
    const tagName = element.tagName.toLowerCase();
    const type = element.type?.toLowerCase();
    const text = element.text?.toLowerCase() || '';

    // Button or clickable elements
    if (tagName === 'button' || 
        (tagName === 'input' && type === 'button') ||
        (tagName === 'input' && type === 'submit') ||
        element.attributes.role === 'button' ||
        text.includes('click') || text.includes('submit')) {
      return 'click';
    }

    // Input fields
    if (tagName === 'input' && ['text', 'email', 'password', 'search', 'url'].includes(type || '')) {
      return 'fill';
    }

    // Textarea
    if (tagName === 'textarea') {
      return 'fill';
    }

    // Select dropdown
    if (tagName === 'select') {
      return 'select';
    }

    // Links
    if (tagName === 'a') {
      return 'click';
    }

    // Text content for extraction
    if (element.text && element.text.length > 0) {
      return 'extract';
    }

    // Default to click for interactive elements
    if (element.isInteractable) {
      return 'click';
    }

    return 'extract';
  }

  /**
   * Generate a descriptive label for the node
   */
  private generateNodeLabel(element: ElementInfo, action: string): string {
    const tagName = element.tagName.toLowerCase();
    const type = element.type;
    const text = element.text?.slice(0, 30) || '';
    const id = element.attributes.id;
    const className = element.attributes.class;

    let label = action.charAt(0).toUpperCase() + action.slice(1);

    if (text) {
      label += ` "${text}"`;
    } else if (id) {
      label += ` #${id}`;
    } else if (className) {
      label += ` .${className.split(' ')[0]}`;
    } else {
      label += ` ${tagName}${type ? `[${type}]` : ''}`;
    }

    return label;
  }

  /**
   * Calculate node position based on element position
   */
  private calculateNodePosition(element: ElementInfo): { x: number; y: number } {
    // Scale down the actual element position for the flow canvas
    const scale = 0.3;
    return {
      x: element.position.x * scale,
      y: element.position.y * scale
    };
  }

  /**
   * Position nodes intelligently to avoid overlaps
   */
  private positionNodes(nodes: Node[], pageAnalysis: { elements: ElementInfo[]; pageType: string }): Node[] {
    const positioned = [...nodes];
    const spacing = 200;
    const gridCols = Math.ceil(Math.sqrt(nodes.length));

    positioned.forEach((node, index) => {
      const row = Math.floor(index / gridCols);
      const col = index % gridCols;
      
      // Use element position as base, but ensure proper spacing
      const elementPos = node.data.elementInfo?.position;
      if (elementPos) {
        node.position = {
          x: Math.max(col * spacing, elementPos.x * 0.3),
          y: Math.max(row * spacing, elementPos.y * 0.3)
        };
      } else {
        node.position = {
          x: col * spacing,
          y: row * spacing
        };
      }
    });

    return positioned;
  }

  /**
   * Get edge type based on connection type
   */
  private getEdgeType(connectionType: string): string {
    switch (connectionType) {
      case 'conditional':
        return 'smoothstep';
      case 'parallel':
        return 'straight';
      case 'hierarchical':
        return 'step';
      default:
        return 'default';
    }
  }

  /**
   * Get edge style based on connection properties
   */
  private getEdgeStyle(connection: PlaywrightNodeConnection): React.CSSProperties {
    const confidence = connection.confidence;
    
    return {
      strokeWidth: Math.max(1, confidence * 3),
      stroke: confidence > 0.8 ? '#10b981' : confidence > 0.6 ? '#3b82f6' : '#6b7280',
      strokeDasharray: connection.connectionType === 'conditional' ? '5,5' : undefined
    };
  }

  /**
   * Get edge label based on connection
   */
  private getEdgeLabel(connection: PlaywrightNodeConnection): string {
    const confidence = Math.round(connection.confidence * 100);
    return `${connection.connectionType} (${confidence}%)`;
  }

  /**
   * Generate a unique node ID from an element
   */
  private generateNodeId(element: ElementInfo): string {
    // Create a hash-like ID from element properties
    const identifier = element.attributes.id || 
                      element.attributes.name || 
                      element.selector.replace(/[^a-zA-Z0-9]/g, '_');
    
    return `playwright_${identifier}_${Date.now()}`;
  }

  /**
   * Calculate overall confidence from all connections
   */
  private calculateOverallConfidence(connections: PlaywrightNodeConnection[]): number {
    if (connections.length === 0) return 0;
    
    const totalConfidence = connections.reduce((sum, conn) => sum + conn.confidence, 0);
    return totalConfidence / connections.length;
  }

  /**
   * Generate reasoning explanation for the connections
   */
  private generateReasoningExplanation(
    connections: PlaywrightNodeConnection[],
    pageAnalysis: { elements: ElementInfo[]; pageType: string }
  ): string[] {
    const reasoning: string[] = [];
    
    reasoning.push(`Analyzed ${pageAnalysis.elements.length} elements on ${pageAnalysis.pageType} page`);
    reasoning.push(`Generated ${connections.length} intelligent connections`);
    
    const connectionTypes = connections.reduce((acc, conn) => {
      acc[conn.connectionType] = (acc[conn.connectionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(connectionTypes).forEach(([type, count]) => {
      reasoning.push(`${count} ${type} connection${count > 1 ? 's' : ''}`);
    });
    
    const highConfidenceCount = connections.filter(c => c.confidence > 0.8).length;
    if (highConfidenceCount > 0) {
      reasoning.push(`${highConfidenceCount} high-confidence connection${highConfidenceCount > 1 ? 's' : ''}`);
    }
    
    return reasoning;
  }

  /**
   * Generate mock elements for demo purposes
   */
  private generateMockElements(url: string): { elements: ElementInfo[]; pageType: string } {
    const mockElements: ElementInfo[] = [
      {
        selector: '#email',
        tagName: 'input',
        type: 'email',
        text: '',
        attributes: { id: 'email', type: 'email', placeholder: 'Enter email' },
        position: { x: 100, y: 100, width: 200, height: 40 },
        isVisible: true,
        isInteractable: true
      },
      {
        selector: '#password',
        tagName: 'input',
        type: 'password',
        text: '',
        attributes: { id: 'password', type: 'password', placeholder: 'Enter password' },
        position: { x: 100, y: 160, width: 200, height: 40 },
        isVisible: true,
        isInteractable: true
      },
      {
        selector: '#login-btn',
        tagName: 'button',
        type: 'submit',
        text: 'Login',
        attributes: { id: 'login-btn', type: 'submit' },
        position: { x: 100, y: 220, width: 100, height: 40 },
        isVisible: true,
        isInteractable: true
      }
    ];

    return {
      elements: mockElements,
      pageType: 'form'
    };
  }

  /**
   * Get cached connections for a URL
   */
  getCachedConnections(url: string): PlaywrightNodeConnection[] | undefined {
    return this.connectionHistory.get(url);
  }

  /**
   * Get cached elements for a URL
   */
  getCachedElements(url: string): ElementInfo[] | undefined {
    return this.elementCache.get(url);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.connectionHistory.clear();
    this.elementCache.clear();
  }
}

// Export singleton instance
export const playwrightNodeConnector = new PlaywrightNodeConnector();

// Utility functions
export const createPlaywrightNodeConnection = async (
  url: string,
  options?: {
    maxConnections?: number;
    minConfidence?: number;
    enableParallelConnections?: boolean;
    enableConditionalConnections?: boolean;
  }
): Promise<SmartConnectionResult> => {
  return playwrightNodeConnector.analyzeAndConnect(url, [], options);
};

export const generatePlaywrightWorkflow = async (
  url: string,
  existingNodes: Node[] = []
): Promise<{ nodes: Node[]; edges: Edge[] }> => {
  const result = await playwrightNodeConnector.analyzeAndConnect(url, existingNodes);
  return {
    nodes: result.suggestedNodes,
    edges: result.suggestedEdges
  };
};