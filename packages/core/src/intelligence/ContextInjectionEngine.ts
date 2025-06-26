/**
 * @file ContextInjectionEngine - Intelligent context injection for Universal AI Brain
 * 
 * This engine provides sophisticated context injection capabilities that enhance
 * AI framework prompts with relevant semantic context from MongoDB. It optimizes
 * context selection, formatting, and injection for maximum relevance and efficiency.
 * 
 * Features:
 * - Intelligent context selection based on semantic relevance
 * - Framework-specific context formatting and optimization
 * - Context compression and summarization
 * - Real-time context analytics and optimization
 * - Multi-modal context support (text, metadata, relationships)
 * - Context caching and performance optimization
 */

import { SemanticMemoryEngine, Memory } from './SemanticMemoryEngine';
import { VectorSearchEngine } from './VectorSearchEngine';
import { OpenAIEmbeddingProvider } from '../embeddings/OpenAIEmbeddingProvider';

export interface ContextItem {
  id: string;
  content: string;
  type: 'memory' | 'fact' | 'procedure' | 'example' | 'preference' | 'relationship';
  relevanceScore: number; // 0-1 scale
  importance: number; // 0-1 scale
  source: string;
  metadata: Record<string, any>;
  relationships?: string[]; // Related context IDs
}

export interface EnhancedPrompt {
  originalPrompt: string;
  enhancedPrompt: string;
  injectedContext: ContextItem[];
  contextSummary: string;
  optimizationMetrics: {
    contextRelevance: number;
    contextDensity: number;
    tokenCount: number;
    compressionRatio: number;
  };
  framework: string;
  timestamp: Date;
}

export interface ContextOptions {
  maxContextItems?: number;
  maxTokens?: number;
  minRelevanceScore?: number;
  includeRelationships?: boolean;
  contextTypes?: ContextItem['type'][];
  framework?: string;
  sessionId?: string;
  userId?: string;
  compressionLevel?: 'none' | 'light' | 'medium' | 'aggressive';
  prioritizeRecent?: boolean;
  includeMetadata?: boolean;
}

export interface ContextAnalytics {
  totalContextInjections: number;
  averageRelevanceScore: number;
  averageContextItems: number;
  averageTokenCount: number;
  frameworkUsage: Record<string, number>;
  contextTypeUsage: Record<string, number>;
  performanceMetrics: {
    averageInjectionTime: number;
    cacheHitRate: number;
    compressionEfficiency: number;
  };
  qualityMetrics: {
    userSatisfactionScore: number;
    contextAccuracyScore: number;
    relevanceImprovement: number;
  };
}

/**
 * ContextInjectionEngine - Intelligent context injection for AI frameworks
 * 
 * Enhances AI prompts with relevant semantic context using MongoDB-powered
 * semantic search and intelligent context optimization.
 */
export class ContextInjectionEngine {
  private semanticMemoryEngine: SemanticMemoryEngine;
  private vectorSearchEngine: VectorSearchEngine;
  private contextCache: Map<string, ContextItem[]> = new Map();
  private cacheSize: number = 500;
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor(
    semanticMemoryEngine: SemanticMemoryEngine,
    vectorSearchEngine: VectorSearchEngine
  ) {
    this.semanticMemoryEngine = semanticMemoryEngine;
    this.vectorSearchEngine = vectorSearchEngine;
  }

  /**
   * Enhance a prompt with relevant context
   */
  async enhancePrompt(
    prompt: string,
    options: ContextOptions = {}
  ): Promise<EnhancedPrompt> {
    const startTime = Date.now();
    
    const {
      maxContextItems = 5,
      maxTokens = 2000,
      minRelevanceScore = 0.6,
      includeRelationships = true,
      contextTypes,
      framework = 'universal',
      sessionId,
      userId,
      compressionLevel = 'medium',
      prioritizeRecent = true,
      includeMetadata = false
    } = options;

    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(prompt, options);
      
      // Check cache first
      let relevantContext = this.getFromCache(cacheKey);
      
      if (!relevantContext) {
        // Select relevant context
        relevantContext = await this.selectRelevantContext(prompt, {
          maxContextItems,
          minRelevanceScore,
          contextTypes,
          sessionId,
          userId,
          includeRelationships,
          prioritizeRecent
        });
        
        // Cache the results
        this.setCache(cacheKey, relevantContext);
      }

      // Optimize context for the specific framework
      const optimizedContext = await this.optimizeContextForFramework(
        relevantContext,
        framework,
        maxTokens,
        compressionLevel
      );

      // Inject context into prompt
      const enhancedPrompt = this.injectContextIntoPrompt(
        prompt,
        optimizedContext,
        framework,
        includeMetadata
      );

      // Generate context summary
      const contextSummary = this.generateContextSummary(optimizedContext);

      // Calculate optimization metrics
      const optimizationMetrics = this.calculateOptimizationMetrics(
        prompt,
        enhancedPrompt,
        optimizedContext,
        startTime
      );

      return {
        originalPrompt: prompt,
        enhancedPrompt,
        injectedContext: optimizedContext,
        contextSummary,
        optimizationMetrics,
        framework,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Context injection failed:', error);
      
      // Return original prompt with minimal context on failure
      return {
        originalPrompt: prompt,
        enhancedPrompt: prompt,
        injectedContext: [],
        contextSummary: 'Context injection failed - using original prompt',
        optimizationMetrics: {
          contextRelevance: 0,
          contextDensity: 0,
          tokenCount: this.estimateTokenCount(prompt),
          compressionRatio: 1
        },
        framework,
        timestamp: new Date()
      };
    }
  }

  /**
   * Select relevant context items based on semantic similarity
   */
  async selectRelevantContext(
    query: string,
    options: ContextOptions
  ): Promise<ContextItem[]> {
    const {
      maxContextItems = 5,
      minRelevanceScore = 0.6,
      contextTypes,
      sessionId,
      userId,
      includeRelationships = true,
      prioritizeRecent = true
    } = options;

    // Get relevant memories from semantic memory engine
    const memories = await this.semanticMemoryEngine.retrieveRelevantMemories(query, {
      limit: maxContextItems * 2, // Get more candidates for filtering
      minConfidence: minRelevanceScore,
      types: contextTypes as any,
      sessionId,
      userId,
      includeRelated: includeRelationships
    });

    // Get additional context from vector search
    const vectorResults = await this.vectorSearchEngine.semanticSearch(query, {
      limit: maxContextItems,
      minScore: minRelevanceScore,
      filters: {
        sessionId,
        userId
      }
    });

    // Combine and deduplicate context items
    const contextItems: ContextItem[] = [];
    const seenIds = new Set<string>();

    // Process memories
    memories.forEach(memory => {
      if (!seenIds.has(memory.id)) {
        contextItems.push(this.memoryToContextItem(memory));
        seenIds.add(memory.id);
      }
    });

    // Process vector search results
    vectorResults.forEach(result => {
      if (!seenIds.has(result.id)) {
        contextItems.push(this.vectorResultToContextItem(result));
        seenIds.add(result.id);
      }
    });

    // Sort by relevance and importance
    contextItems.sort((a, b) => {
      const scoreA = a.relevanceScore * 0.7 + a.importance * 0.3;
      const scoreB = b.relevanceScore * 0.7 + b.importance * 0.3;
      
      if (prioritizeRecent) {
        // Add recency bonus
        const ageA = this.getContextAge(a);
        const ageB = this.getContextAge(b);
        const recencyBonusA = Math.exp(-ageA / 7); // Decay over 7 days
        const recencyBonusB = Math.exp(-ageB / 7);
        
        return (scoreB + recencyBonusB * 0.1) - (scoreA + recencyBonusA * 0.1);
      }
      
      return scoreB - scoreA;
    });

    // Filter by minimum relevance score and limit
    return contextItems
      .filter(item => item.relevanceScore >= minRelevanceScore)
      .slice(0, maxContextItems);
  }

  /**
   * Optimize context for specific framework
   */
  async optimizeContextForFramework(
    context: ContextItem[],
    framework: string,
    maxTokens: number,
    compressionLevel: 'none' | 'light' | 'medium' | 'aggressive'
  ): Promise<ContextItem[]> {
    let optimizedContext = [...context];

    // Apply framework-specific optimizations
    switch (framework) {
      case 'vercel-ai':
        optimizedContext = this.optimizeForVercelAI(optimizedContext);
        break;
      case 'mastra':
        optimizedContext = this.optimizeForMastra(optimizedContext);
        break;
      case 'langchain':
        optimizedContext = this.optimizeForLangChain(optimizedContext);
        break;
      case 'openai-agents':
        optimizedContext = this.optimizeForOpenAIAgents(optimizedContext);
        break;
    }

    // Apply compression if needed
    if (compressionLevel !== 'none') {
      optimizedContext = await this.compressContext(optimizedContext, compressionLevel, maxTokens);
    }

    // Ensure token limit
    optimizedContext = this.enforceTokenLimit(optimizedContext, maxTokens);

    return optimizedContext;
  }

  /**
   * Inject context into prompt with framework-specific formatting
   */
  private injectContextIntoPrompt(
    prompt: string,
    context: ContextItem[],
    framework: string,
    includeMetadata: boolean
  ): string {
    if (context.length === 0) {
      return prompt;
    }

    const contextSection = this.formatContextForFramework(context, framework, includeMetadata);
    
    // Framework-specific injection patterns
    switch (framework) {
      case 'vercel-ai':
        return `${contextSection}\n\nUser Query: ${prompt}`;
      
      case 'mastra':
        return `Context:\n${contextSection}\n\nTask: ${prompt}`;
      
      case 'langchain':
        return `Relevant Context:\n${contextSection}\n\nHuman: ${prompt}`;
      
      case 'openai-agents':
        return `# Context\n${contextSection}\n\n# User Request\n${prompt}`;
      
      default:
        return `Context: ${contextSection}\n\nQuery: ${prompt}`;
    }
  }

  /**
   * Format context items for specific framework
   */
  private formatContextForFramework(
    context: ContextItem[],
    framework: string,
    includeMetadata: boolean
  ): string {
    return context.map((item, index) => {
      let formatted = `${index + 1}. ${item.content}`;
      
      if (includeMetadata && Object.keys(item.metadata).length > 0) {
        const metadataStr = Object.entries(item.metadata)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        formatted += ` (${metadataStr})`;
      }
      
      return formatted;
    }).join('\n');
  }

  /**
   * Generate a summary of injected context
   */
  private generateContextSummary(context: ContextItem[]): string {
    if (context.length === 0) {
      return 'No context injected';
    }

    const typeCount = context.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgRelevance = context.reduce((sum, item) => sum + item.relevanceScore, 0) / context.length;

    const typeSummary = Object.entries(typeCount)
      .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
      .join(', ');

    return `Injected ${context.length} context items (${typeSummary}) with average relevance ${avgRelevance.toFixed(2)}`;
  }

  /**
   * Calculate optimization metrics
   */
  private calculateOptimizationMetrics(
    originalPrompt: string,
    enhancedPrompt: string,
    context: ContextItem[],
    startTime: number
  ): EnhancedPrompt['optimizationMetrics'] {
    const originalTokens = this.estimateTokenCount(originalPrompt);
    const enhancedTokens = this.estimateTokenCount(enhancedPrompt);
    const contextTokens = enhancedTokens - originalTokens;

    const contextRelevance = context.length > 0 
      ? context.reduce((sum, item) => sum + item.relevanceScore, 0) / context.length 
      : 0;

    const contextDensity = contextTokens > 0 ? context.length / contextTokens : 0;
    const compressionRatio = originalTokens / enhancedTokens;

    return {
      contextRelevance,
      contextDensity,
      tokenCount: enhancedTokens,
      compressionRatio
    };
  }

  // Private helper methods

  private memoryToContextItem(memory: Memory): ContextItem {
    return {
      id: memory.id,
      content: memory.content,
      type: memory.metadata.type as ContextItem['type'],
      relevanceScore: memory.metadata.confidence,
      importance: memory.metadata.importance,
      source: memory.metadata.source,
      metadata: {
        framework: memory.metadata.framework,
        sessionId: memory.metadata.sessionId,
        userId: memory.metadata.userId,
        tags: memory.metadata.tags,
        created: memory.metadata.created,
        accessCount: memory.metadata.accessCount
      },
      relationships: memory.metadata.relationships
    };
  }

  private vectorResultToContextItem(result: any): ContextItem {
    return {
      id: result.id,
      content: result.content,
      type: 'fact',
      relevanceScore: result.score,
      importance: result.metadata?.importance || 0.5,
      source: result.metadata?.source || 'vector_search',
      metadata: result.metadata || {},
      relationships: result.metadata?.relationships || []
    };
  }

  private getContextAge(context: ContextItem): number {
    const created = context.metadata.created;
    if (!created) return 0;
    
    const createdDate = new Date(created);
    return (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24); // Days
  }

  private optimizeForVercelAI(context: ContextItem[]): ContextItem[] {
    // Vercel AI prefers concise, structured context
    return context.map(item => ({
      ...item,
      content: this.truncateContent(item.content, 200)
    }));
  }

  private optimizeForMastra(context: ContextItem[]): ContextItem[] {
    // Mastra works well with procedural context
    return context.filter(item => 
      item.type === 'procedure' || item.type === 'example' || item.type === 'fact'
    );
  }

  private optimizeForLangChain(context: ContextItem[]): ContextItem[] {
    // LangChain handles longer context well
    return context; // No specific optimization needed
  }

  private optimizeForOpenAIAgents(context: ContextItem[]): ContextItem[] {
    // OpenAI Agents prefer structured, role-based context
    return context.map(item => ({
      ...item,
      content: `[${item.type.toUpperCase()}] ${item.content}`
    }));
  }

  private async compressContext(
    context: ContextItem[],
    level: 'light' | 'medium' | 'aggressive',
    maxTokens: number
  ): Promise<ContextItem[]> {
    // Simple compression - in production, could use AI summarization
    const compressionRatios = {
      light: 0.8,
      medium: 0.6,
      aggressive: 0.4
    };

    const ratio = compressionRatios[level];
    const targetLength = Math.floor(maxTokens * ratio);

    return context.map(item => ({
      ...item,
      content: this.truncateContent(item.content, targetLength / context.length)
    }));
  }

  private enforceTokenLimit(context: ContextItem[], maxTokens: number): ContextItem[] {
    let totalTokens = 0;
    const result: ContextItem[] = [];

    for (const item of context) {
      const itemTokens = this.estimateTokenCount(item.content);
      if (totalTokens + itemTokens <= maxTokens) {
        result.push(item);
        totalTokens += itemTokens;
      } else {
        break;
      }
    }

    return result;
  }

  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength - 3) + '...';
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private generateCacheKey(prompt: string, options: ContextOptions): string {
    const keyData = {
      prompt: prompt.substring(0, 100), // First 100 chars
      maxItems: options.maxContextItems,
      framework: options.framework,
      sessionId: options.sessionId,
      userId: options.userId
    };
    return JSON.stringify(keyData);
  }

  private getFromCache(key: string): ContextItem[] | null {
    const cached = this.contextCache.get(key);
    if (!cached) return null;

    // Check TTL (simplified - in production, store timestamp with data)
    return cached;
  }

  private setCache(key: string, context: ContextItem[]): void {
    if (this.contextCache.size >= this.cacheSize) {
      const firstKey = this.contextCache.keys().next().value;
      if (firstKey) {
        this.contextCache.delete(firstKey);
      }
    }
    this.contextCache.set(key, context);
  }
}
