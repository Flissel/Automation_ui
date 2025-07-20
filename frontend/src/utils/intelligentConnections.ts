import { Node, Edge } from 'reactflow';
import api from '../services/api';

// Core types for intelligent connection system
export interface ElementRelationship {
  sourceElement: string;
  targetElement: string;
  relationshipType: 'sequential' | 'conditional' | 'parallel' | 'hierarchical' | 'dependent';
  confidence: number;
  description: string;
  priority: number;
}

export interface ConnectionSuggestion {
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: 'success' | 'error' | 'next' | 'parallel' | 'conditional' | 'trigger';
  label?: string;
  confidence: number;
  reasoning: string;
  metadata?: Record<string, any>;
}

export interface PageContext {
  url: string;
  pageType: 'form' | 'ecommerce' | 'navigation' | 'content' | 'dashboard' | 'unknown';
  elements: any[];
  relationships: ElementRelationship[];
  flowPattern: 'linear' | 'branched' | 'parallel' | 'cyclic' | 'hub';
}

export interface IntelligentConnectionConfig {
  maxConnections?: number;
  minConfidence?: number;
  enableParallelConnections?: boolean;
  enableConditionalConnections?: boolean;
  prioritizeSequentialFlow?: boolean;
  customRules?: ConnectionRule[];
}

export interface ConnectionRule {
  name: string;
  condition: (source: any, target: any, context: PageContext) => boolean;
  relationship: Omit<ElementRelationship, 'sourceElement' | 'targetElement'>;
}

// Default configuration
const DEFAULT_CONFIG: IntelligentConnectionConfig = {
  maxConnections: 20,
  minConfidence: 0.5,
  enableParallelConnections: true,
  enableConditionalConnections: true,
  prioritizeSequentialFlow: true,
  customRules: []
};

/**
 * Main class for intelligent node connection analysis
 */
export class IntelligentConnectionAnalyzer {
  private config: IntelligentConnectionConfig;

  constructor(config: Partial<IntelligentConnectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze a webpage and generate intelligent node connections
   */
  async analyzePageForConnections(
    url: string,
    analysisConfig?: any
  ): Promise<{
    context: PageContext;
    nodes: Node[];
    edges: Edge[];
    suggestions: ConnectionSuggestion[];
  }> {
    // Step 1: Get page analysis
    const pageAnalysis = await this.getPageAnalysis(url, analysisConfig);
    
    // Step 2: Determine page context
    const context = this.determinePageContext(url, pageAnalysis);
    
    // Step 3: Generate nodes
    const nodes = this.generateNodesFromAnalysis(pageAnalysis, context);
    
    // Step 4: Analyze relationships
    const relationships = this.analyzeElementRelationships(pageAnalysis, context);
    context.relationships = relationships;
    
    // Step 5: Generate intelligent connections
    const suggestions = this.generateIntelligentConnections(nodes, relationships, context);
    
    // Step 6: Create edges from suggestions
    const edges = this.createEdgesFromSuggestions(suggestions);
    
    return { context, nodes, edges, suggestions };
  }

  /**
   * Get page analysis from Playwright API
   */
  private async getPageAnalysis(url: string, config?: any): Promise<any[]> {
    const response = await api.playwright.getPageSuggestions(url, {
      analysis_config: {
        enabled: true,
        detect_forms: true,
        detect_buttons: true,
        detect_links: true,
        detect_inputs: true,
        generate_suggestions: true,
        max_elements: 50,
        ...config
      }
    });

    if (!response.success) {
      throw new Error(`Failed to analyze page: ${response.error}`);
    }

    return response.data.analysis.suggestions || [];
  }

  /**
   * Determine page type and context from analysis
   */
  private determinePageContext(url: string, suggestions: any[]): PageContext {
    const elementCounts = this.categorizeElements(suggestions);
    const pageType = this.classifyPageType(elementCounts, url);
    const flowPattern = this.determineFlowPattern(suggestions, pageType);

    return {
      url,
      pageType,
      elements: suggestions,
      relationships: [],
      flowPattern
    };
  }

  /**
   * Categorize elements by type
   */
  private categorizeElements(suggestions: any[]) {
    return {
      forms: suggestions.filter(s => s.type === 'fill' || s.element.includes('form')),
      buttons: suggestions.filter(s => s.type === 'click' && s.element.includes('button')),
      links: suggestions.filter(s => s.type === 'click' && s.element.includes('link')),
      inputs: suggestions.filter(s => s.type === 'fill'),
      extractions: suggestions.filter(s => s.type === 'extract'),
      navigations: suggestions.filter(s => s.type === 'navigate')
    };
  }

  /**
   * Classify page type based on element analysis
   */
  private classifyPageType(elementCounts: any, url: string): PageContext['pageType'] {
    const { forms, buttons, links, extractions } = elementCounts;
    
    // E-commerce indicators
    const commerceKeywords = ['cart', 'checkout', 'buy', 'purchase', 'price', 'product', 'shop'];
    const hasCommerceElements = commerceKeywords.some(keyword => 
      url.toLowerCase().includes(keyword)
    );
    
    // Dashboard indicators
    const dashboardKeywords = ['dashboard', 'admin', 'panel', 'analytics', 'metrics'];
    const hasDashboardElements = dashboardKeywords.some(keyword => 
      url.toLowerCase().includes(keyword)
    );
    
    if (hasDashboardElements || extractions.length > 5) {
      return 'dashboard';
    }
    
    if (forms.length > 3 && buttons.length > 0) {
      return 'form';
    }
    
    if (hasCommerceElements) {
      return 'ecommerce';
    }
    
    if (links.length > buttons.length && links.length > 5) {
      return 'navigation';
    }
    
    if (extractions.length > 2) {
      return 'content';
    }
    
    return 'unknown';
  }

  /**
   * Determine the flow pattern of the page
   */
  private determineFlowPattern(suggestions: any[], pageType: string): PageContext['flowPattern'] {
    switch (pageType) {
      case 'form':
        return 'linear';
      case 'ecommerce':
        return 'branched';
      case 'dashboard':
        return 'hub';
      case 'navigation':
        return 'parallel';
      default:
        return suggestions.length > 10 ? 'parallel' : 'linear';
    }
  }

  /**
   * Generate nodes from page analysis
   */
  private generateNodesFromAnalysis(suggestions: any[], context: PageContext): Node[] {
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

    // Generate nodes from suggestions
    suggestions.forEach((suggestion, index) => {
      const nodeId = `${suggestion.type}-${index}`;
      const position = this.calculateNodePosition(index, suggestion, context);
      
      nodes.push({
        id: nodeId,
        type: 'playwright_action',
        position,
        data: {
          label: this.generateNodeLabel(suggestion),
          config: {
            action: suggestion.type,
            selector: suggestion.selector,
            value: suggestion.suggested_value || '',
            description: suggestion.description
          },
          suggestion: suggestion,
          metadata: {
            confidence: suggestion.confidence,
            priority: suggestion.priority,
            elementType: this.getElementType(suggestion)
          }
        }
      });
    });

    return nodes;
  }

  /**
   * Calculate intelligent node positioning
   */
  private calculateNodePosition(index: number, suggestion: any, context: PageContext) {
    const baseX = 300;
    const baseY = 100;
    const spacing = 200;
    
    switch (context.flowPattern) {
      case 'linear':
        return { x: baseX, y: baseY + (index * spacing) };
      
      case 'branched':
        const branchIndex = Math.floor(index / 3);
        const itemInBranch = index % 3;
        return { 
          x: baseX + (branchIndex * spacing), 
          y: baseY + (itemInBranch * 150) 
        };
      
      case 'parallel':
        return { x: baseX + (index * spacing), y: baseY };
      
      case 'hub':
        const angle = (index * 2 * Math.PI) / context.elements.length;
        const radius = 300;
        return {
          x: baseX + radius * Math.cos(angle),
          y: baseY + radius * Math.sin(angle)
        };
      
      default:
        const cols = 3;
        const row = Math.floor(index / cols);
        const col = index % cols;
        return { x: baseX + (col * spacing), y: baseY + (row * spacing) };
    }
  }

  /**
   * Generate a descriptive label for a node
   */
  private generateNodeLabel(suggestion: any): string {
    const action = suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1);
    const element = suggestion.description || suggestion.element || 'element';
    return `${action}: ${element.substring(0, 30)}${element.length > 30 ? '...' : ''}`;
  }

  /**
   * Get element type from suggestion
   */
  private getElementType(suggestion: any): string {
    if (suggestion.element.includes('button')) return 'button';
    if (suggestion.element.includes('input')) return 'input';
    if (suggestion.element.includes('link')) return 'link';
    if (suggestion.element.includes('form')) return 'form';
    return 'unknown';
  }

  /**
   * Analyze relationships between elements
   */
  private analyzeElementRelationships(suggestions: any[], context: PageContext): ElementRelationship[] {
    const relationships: ElementRelationship[] = [];
    
    // Apply built-in relationship rules
    relationships.push(...this.applySequentialRules(suggestions, context));
    relationships.push(...this.applyConditionalRules(suggestions, context));
    relationships.push(...this.applyParallelRules(suggestions, context));
    relationships.push(...this.applyHierarchicalRules(suggestions, context));
    
    // Apply custom rules
    if (this.config.customRules) {
      relationships.push(...this.applyCustomRules(suggestions, context));
    }
    
    return relationships
      .filter(rel => rel.confidence >= (this.config.minConfidence || 0.5))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.config.maxConnections || 20);
  }

  /**
   * Apply sequential relationship rules
   */
  private applySequentialRules(suggestions: any[], context: PageContext): ElementRelationship[] {
    const relationships: ElementRelationship[] = [];
    
    // Form field sequences
    const formFields = suggestions.filter(s => s.type === 'fill');
    for (let i = 0; i < formFields.length - 1; i++) {
      const current = formFields[i];
      const next = formFields[i + 1];
      
      const order = this.getFormFieldOrder(current, next);
      if (order.isSequential) {
        relationships.push({
          sourceElement: current.selector,
          targetElement: next.selector,
          relationshipType: 'sequential',
          confidence: order.confidence,
          description: `Fill ${current.description} before ${next.description}`,
          priority: 1
        });
      }
    }
    
    // Form to submit button
    const submitButtons = suggestions.filter(s => 
      s.type === 'click' && s.element.toLowerCase().includes('submit')
    );
    
    formFields.forEach(field => {
      submitButtons.forEach(button => {
        relationships.push({
          sourceElement: field.selector,
          targetElement: button.selector,
          relationshipType: 'sequential',
          confidence: 0.9,
          description: `Fill ${field.description} then submit`,
          priority: 2
        });
      });
    });
    
    return relationships;
  }

  /**
   * Apply conditional relationship rules
   */
  private applyConditionalRules(suggestions: any[], context: PageContext): ElementRelationship[] {
    const relationships: ElementRelationship[] = [];
    
    const clickActions = suggestions.filter(s => s.type === 'click');
    const extractions = suggestions.filter(s => s.type === 'extract');
    
    clickActions.forEach(action => {
      extractions.forEach(extraction => {
        const isErrorPath = extraction.element.toLowerCase().includes('error');
        const isSuccessPath = extraction.element.toLowerCase().includes('success');
        
        if (isErrorPath || isSuccessPath) {
          relationships.push({
            sourceElement: action.selector,
            targetElement: extraction.selector,
            relationshipType: 'conditional',
            confidence: isErrorPath || isSuccessPath ? 0.8 : 0.6,
            description: `Handle ${isErrorPath ? 'error' : 'success'} after ${action.description}`,
            priority: 3
          });
        }
      });
    });
    
    return relationships;
  }

  /**
   * Apply parallel relationship rules
   */
  private applyParallelRules(suggestions: any[], context: PageContext): ElementRelationship[] {
    const relationships: ElementRelationship[] = [];
    
    if (!this.config.enableParallelConnections) return relationships;
    
    const extractions = suggestions.filter(s => s.type === 'extract');
    
    // Multiple data extractions can run in parallel
    for (let i = 0; i < extractions.length - 1; i++) {
      for (let j = i + 1; j < extractions.length; j++) {
        relationships.push({
          sourceElement: extractions[i].selector,
          targetElement: extractions[j].selector,
          relationshipType: 'parallel',
          confidence: 0.7,
          description: `Extract ${extractions[i].description} and ${extractions[j].description} simultaneously`,
          priority: 4
        });
      }
    }
    
    return relationships;
  }

  /**
   * Apply hierarchical relationship rules
   */
  private applyHierarchicalRules(suggestions: any[], context: PageContext): ElementRelationship[] {
    const relationships: ElementRelationship[] = [];
    
    // Navigation triggers other actions
    const navigations = suggestions.filter(s => s.type === 'navigate');
    const otherActions = suggestions.filter(s => s.type !== 'navigate');
    
    navigations.forEach(nav => {
      otherActions.forEach(action => {
        relationships.push({
          sourceElement: nav.selector || 'navigate',
          targetElement: action.selector,
          relationshipType: 'hierarchical',
          confidence: 0.95,
          description: `Navigate then ${action.description}`,
          priority: 0
        });
      });
    });
    
    return relationships;
  }

  /**
   * Apply custom relationship rules
   */
  private applyCustomRules(suggestions: any[], context: PageContext): ElementRelationship[] {
    const relationships: ElementRelationship[] = [];
    
    this.config.customRules?.forEach(rule => {
      for (let i = 0; i < suggestions.length; i++) {
        for (let j = 0; j < suggestions.length; j++) {
          if (i !== j && rule.condition(suggestions[i], suggestions[j], context)) {
            relationships.push({
              sourceElement: suggestions[i].selector,
              targetElement: suggestions[j].selector,
              ...rule.relationship
            });
          }
        }
      }
    });
    
    return relationships;
  }

  /**
   * Determine form field order
   */
  private getFormFieldOrder(field1: any, field2: any): { isSequential: boolean; confidence: number } {
    const commonSequences = [
      ['email', 'password'],
      ['first', 'last'],
      ['name', 'email'],
      ['email', 'confirm'],
      ['password', 'confirm']
    ];
    
    for (const sequence of commonSequences) {
      if (field1.element.toLowerCase().includes(sequence[0]) && 
          field2.element.toLowerCase().includes(sequence[1])) {
        return { isSequential: true, confidence: 0.9 };
      }
    }
    
    // Fallback to DOM order heuristic
    const order1 = this.getElementDOMOrder(field1.selector);
    const order2 = this.getElementDOMOrder(field2.selector);
    
    if (order2 > order1) {
      return { isSequential: true, confidence: 0.6 };
    }
    
    return { isSequential: false, confidence: 0 };
  }

  /**
   * Get element DOM order heuristic
   */
  private getElementDOMOrder(selector: string): number {
    // Simple heuristic based on selector patterns
    if (selector.includes('email')) return 1;
    if (selector.includes('password')) return 2;
    if (selector.includes('confirm')) return 3;
    if (selector.includes('submit')) return 10;
    return selector.length; // Fallback
  }

  /**
   * Generate intelligent connections from relationships
   */
  private generateIntelligentConnections(
    nodes: Node[],
    relationships: ElementRelationship[],
    context: PageContext
  ): ConnectionSuggestion[] {
    const suggestions: ConnectionSuggestion[] = [];
    
    // Connect navigation to first actions
    const navNode = nodes.find(n => n.id === 'navigate');
    if (navNode && nodes.length > 1) {
      const firstAction = nodes.find(n => n.id !== 'navigate');
      if (firstAction) {
        suggestions.push({
          sourceNodeId: navNode.id,
          targetNodeId: firstAction.id,
          edgeType: 'trigger',
          label: 'Start',
          confidence: 1.0,
          reasoning: 'Navigation must happen before page interactions'
        });
      }
    }
    
    // Generate connections from relationships
    relationships.forEach(relationship => {
      const sourceNode = nodes.find(n => 
        n.data.suggestion?.selector === relationship.sourceElement ||
        (relationship.sourceElement === 'navigate' && n.id === 'navigate')
      );
      const targetNode = nodes.find(n => 
        n.data.suggestion?.selector === relationship.targetElement
      );
      
      if (sourceNode && targetNode) {
        const edgeType = this.mapRelationshipToEdgeType(relationship);
        
        suggestions.push({
          sourceNodeId: sourceNode.id,
          targetNodeId: targetNode.id,
          edgeType,
          label: this.generateEdgeLabel(relationship),
          confidence: relationship.confidence,
          reasoning: relationship.description,
          metadata: {
            relationshipType: relationship.relationshipType,
            priority: relationship.priority
          }
        });
      }
    });
    
    return suggestions
      .sort((a, b) => {
        // Sort by priority first, then confidence
        const priorityA = a.metadata?.priority || 5;
        const priorityB = b.metadata?.priority || 5;
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        return b.confidence - a.confidence;
      })
      .slice(0, this.config.maxConnections || 20);
  }

  /**
   * Map relationship type to edge type
   */
  private mapRelationshipToEdgeType(relationship: ElementRelationship): ConnectionSuggestion['edgeType'] {
    switch (relationship.relationshipType) {
      case 'sequential':
        return 'next';
      case 'conditional':
        return relationship.description.includes('error') ? 'error' : 'success';
      case 'parallel':
        return 'parallel';
      case 'hierarchical':
        return 'trigger';
      default:
        return 'next';
    }
  }

  /**
   * Generate edge label from relationship
   */
  private generateEdgeLabel(relationship: ElementRelationship): string {
    switch (relationship.relationshipType) {
      case 'sequential':
        return 'Next';
      case 'conditional':
        return relationship.description.includes('error') ? 'Error' : 'Success';
      case 'parallel':
        return 'Parallel';
      case 'hierarchical':
        return 'Trigger';
      default:
        return 'Connect';
    }
  }

  /**
   * Create edges from connection suggestions
   */
  private createEdgesFromSuggestions(suggestions: ConnectionSuggestion[]): Edge[] {
    return suggestions.map((suggestion, index) => ({
      id: `edge-${index}`,
      source: suggestion.sourceNodeId,
      target: suggestion.targetNodeId,
      label: suggestion.label,
      style: this.getEdgeStyle(suggestion.edgeType),
      data: {
        confidence: suggestion.confidence,
        reasoning: suggestion.reasoning,
        metadata: suggestion.metadata
      }
    }));
  }

  /**
   * Get edge styling based on type
   */
  private getEdgeStyle(edgeType: string) {
    const styles = {
      success: { stroke: '#10b981', strokeWidth: 2 },
      error: { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5,5' },
      parallel: { stroke: '#8b5cf6', strokeWidth: 2 },
      conditional: { stroke: '#f59e0b', strokeWidth: 2 },
      trigger: { stroke: '#3b82f6', strokeWidth: 3 },
      next: { stroke: '#6b7280', strokeWidth: 2 }
    };
    
    return styles[edgeType as keyof typeof styles] || styles.next;
  }
}

// Export utility functions
export const createIntelligentConnections = async (
  url: string,
  config?: Partial<IntelligentConnectionConfig>
) => {
  const analyzer = new IntelligentConnectionAnalyzer(config);
  return analyzer.analyzePageForConnections(url);
};

export const createCustomConnectionRule = (
  name: string,
  condition: ConnectionRule['condition'],
  relationship: ConnectionRule['relationship']
): ConnectionRule => ({
  name,
  condition,
  relationship
});

// Pre-defined custom rules for common scenarios
export const COMMON_CONNECTION_RULES: ConnectionRule[] = [
  createCustomConnectionRule(
    'E-commerce Add to Cart',
    (source, target) => 
      source.element.includes('product') && target.element.includes('cart'),
    {
      relationshipType: 'sequential',
      confidence: 0.85,
      description: 'Add product to cart',
      priority: 2
    }
  ),
  createCustomConnectionRule(
    'Login Flow',
    (source, target) => 
      source.element.includes('login') && target.element.includes('dashboard'),
    {
      relationshipType: 'conditional',
      confidence: 0.9,
      description: 'Navigate to dashboard after login',
      priority: 1
    }
  ),
  createCustomConnectionRule(
    'Search and Results',
    (source, target) => 
      source.element.includes('search') && target.element.includes('result'),
    {
      relationshipType: 'sequential',
      confidence: 0.8,
      description: 'Extract results after search',
      priority: 2
    }
  )
];