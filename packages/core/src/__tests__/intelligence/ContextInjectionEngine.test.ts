/**
 * @file ContextInjectionEngine Tests
 * Comprehensive tests for the ContextInjectionEngine component
 */

import { ContextInjectionEngine, ContextItem, ContextOptions, EnhancedPrompt } from '../../intelligence/ContextInjectionEngine';
import { SemanticMemoryEngine } from '../../intelligence/SemanticMemoryEngine';
import { VectorSearchEngine } from '../../intelligence/VectorSearchEngine';

// Mock dependencies
jest.mock('../../intelligence/SemanticMemoryEngine');
jest.mock('../../intelligence/VectorSearchEngine');

describe('ContextInjectionEngine', () => {
  let contextInjectionEngine: ContextInjectionEngine;
  let mockSemanticMemoryEngine: jest.Mocked<SemanticMemoryEngine>;
  let mockVectorSearchEngine: jest.Mocked<VectorSearchEngine>;

  beforeEach(() => {
    mockSemanticMemoryEngine = new SemanticMemoryEngine({} as any) as jest.Mocked<SemanticMemoryEngine>;
    mockVectorSearchEngine = new VectorSearchEngine({} as any) as jest.Mocked<VectorSearchEngine>;

    // Mock methods
    mockSemanticMemoryEngine.retrieveRelevantMemories = jest.fn().mockResolvedValue([]);
    mockVectorSearchEngine.semanticSearch = jest.fn().mockResolvedValue([]);

    contextInjectionEngine = new ContextInjectionEngine(mockSemanticMemoryEngine, mockVectorSearchEngine);
  });

  describe('Prompt Enhancement', () => {
    it('should enhance prompt with relevant context', async () => {
      const mockMemories = [
        {
          id: 'memory_1',
          content: 'User prefers morning meetings',
          metadata: {
            type: 'preference' as const,
            importance: 0.8,
            confidence: 0.9,
            source: 'user_input',
            framework: 'vercel-ai',
            sessionId: 'session_123',
            tags: ['preference', 'scheduling'],
            relationships: [],
            accessCount: 5,
            lastAccessed: new Date(),
            created: new Date(),
            updated: new Date()
          }
        }
      ];

      const mockVectorResults = [
        {
          id: 'vector_1',
          content: 'Meeting best practices',
          score: 0.85,
          metadata: { source: 'knowledge_base' }
        }
      ];

      mockSemanticMemoryEngine.retrieveRelevantMemories.mockResolvedValue(mockMemories);
      mockVectorSearchEngine.semanticSearch.mockResolvedValue(mockVectorResults);

      const prompt = 'Schedule a meeting for next week';
      const options: ContextOptions = {
        framework: 'vercel-ai',
        sessionId: 'session_123',
        maxContextItems: 5
      };

      const enhanced = await contextInjectionEngine.enhancePrompt(prompt, options);

      expect(enhanced.originalPrompt).toBe(prompt);
      expect(enhanced.enhancedPrompt).toContain(prompt);
      expect(enhanced.injectedContext).toHaveLength(2);
      expect(enhanced.framework).toBe('vercel-ai');
      expect(enhanced.optimizationMetrics.contextRelevance).toBeGreaterThan(0);
    });

    it('should handle empty context gracefully', async () => {
      mockSemanticMemoryEngine.retrieveRelevantMemories.mockResolvedValue([]);
      mockVectorSearchEngine.semanticSearch.mockResolvedValue([]);

      const prompt = 'Hello world';
      const enhanced = await contextInjectionEngine.enhancePrompt(prompt);

      expect(enhanced.originalPrompt).toBe(prompt);
      expect(enhanced.enhancedPrompt).toBe(prompt);
      expect(enhanced.injectedContext).toHaveLength(0);
      expect(enhanced.contextSummary).toBe('No context injected');
    });

    it('should handle context selection failure gracefully', async () => {
      mockSemanticMemoryEngine.retrieveRelevantMemories.mockRejectedValue(new Error('Memory error'));
      mockVectorSearchEngine.semanticSearch.mockRejectedValue(new Error('Vector error'));

      const prompt = 'Test prompt';
      const enhanced = await contextInjectionEngine.enhancePrompt(prompt);

      expect(enhanced.originalPrompt).toBe(prompt);
      expect(enhanced.enhancedPrompt).toBe(prompt);
      expect(enhanced.injectedContext).toHaveLength(0);
      expect(enhanced.contextSummary).toContain('Context injection failed');
    });
  });

  describe('Context Selection', () => {
    it('should select relevant context from multiple sources', async () => {
      const mockMemories = [
        {
          id: 'memory_1',
          content: 'User likes coffee',
          metadata: {
            type: 'preference' as const,
            importance: 0.8,
            confidence: 0.9,
            source: 'user_input',
            framework: 'vercel-ai',
            sessionId: 'session_123',
            tags: ['preference'],
            relationships: [],
            accessCount: 5,
            lastAccessed: new Date(),
            created: new Date(),
            updated: new Date()
          }
        }
      ];

      const mockVectorResults = [
        {
          id: 'vector_1',
          content: 'Coffee brewing guide',
          score: 0.85,
          metadata: { source: 'knowledge_base' }
        }
      ];

      mockSemanticMemoryEngine.retrieveRelevantMemories.mockResolvedValue(mockMemories);
      mockVectorSearchEngine.semanticSearch.mockResolvedValue(mockVectorResults);

      const query = 'What should I drink?';
      const options: ContextOptions = {
        maxContextItems: 3,
        minRelevanceScore: 0.7,
        contextTypes: ['preference', 'fact']
      };

      const context = await contextInjectionEngine.selectRelevantContext(query, options);

      expect(mockSemanticMemoryEngine.retrieveRelevantMemories).toHaveBeenCalledWith(
        query,
        expect.objectContaining({
          limit: 6, // maxContextItems * 2
          minConfidence: 0.7,
          types: ['preference', 'fact']
        })
      );

      expect(mockVectorSearchEngine.semanticSearch).toHaveBeenCalledWith(
        query,
        expect.objectContaining({
          limit: 3,
          minScore: 0.7
        })
      );

      expect(context).toHaveLength(2);
    });

    it('should prioritize recent context when enabled', async () => {
      const oldMemory = {
        id: 'memory_old',
        content: 'Old preference',
        metadata: {
          type: 'preference' as const,
          importance: 0.8,
          confidence: 0.9,
          source: 'user_input',
          framework: 'vercel-ai',
          sessionId: 'session_123',
          tags: ['preference'],
          relationships: [],
          accessCount: 1,
          lastAccessed: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          created: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          updated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      };

      const recentMemory = {
        id: 'memory_recent',
        content: 'Recent preference',
        metadata: {
          type: 'preference' as const,
          importance: 0.7,
          confidence: 0.8,
          source: 'user_input',
          framework: 'vercel-ai',
          sessionId: 'session_123',
          tags: ['preference'],
          relationships: [],
          accessCount: 5,
          lastAccessed: new Date(),
          created: new Date(),
          updated: new Date()
        }
      };

      mockSemanticMemoryEngine.retrieveRelevantMemories.mockResolvedValue([oldMemory, recentMemory]);
      mockVectorSearchEngine.semanticSearch.mockResolvedValue([]);

      const context = await contextInjectionEngine.selectRelevantContext('test query', {
        prioritizeRecent: true,
        maxContextItems: 2
      });

      // Recent memory should be prioritized despite lower importance
      expect(context[0].id).toBe('memory_recent');
    });

    it('should filter by minimum relevance score', async () => {
      const highRelevanceMemory = {
        id: 'memory_high',
        content: 'High relevance',
        metadata: {
          type: 'fact' as const,
          importance: 0.9,
          confidence: 0.9,
          source: 'test',
          framework: 'test',
          sessionId: 'test',
          tags: [],
          relationships: [],
          accessCount: 0,
          lastAccessed: new Date(),
          created: new Date(),
          updated: new Date()
        }
      };

      const lowRelevanceMemory = {
        id: 'memory_low',
        content: 'Low relevance',
        metadata: {
          type: 'fact' as const,
          importance: 0.3,
          confidence: 0.4,
          source: 'test',
          framework: 'test',
          sessionId: 'test',
          tags: [],
          relationships: [],
          accessCount: 0,
          lastAccessed: new Date(),
          created: new Date(),
          updated: new Date()
        }
      };

      mockSemanticMemoryEngine.retrieveRelevantMemories.mockResolvedValue([highRelevanceMemory, lowRelevanceMemory]);
      mockVectorSearchEngine.semanticSearch.mockResolvedValue([]);

      const context = await contextInjectionEngine.selectRelevantContext('test query', {
        minRelevanceScore: 0.8
      });

      // Only high relevance memory should be included
      expect(context).toHaveLength(1);
      expect(context[0].id).toBe('memory_high');
    });
  });

  describe('Framework-Specific Optimization', () => {
    it('should optimize context for Vercel AI', async () => {
      const contextItems: ContextItem[] = [
        {
          id: 'context_1',
          content: 'This is a very long piece of context that should be truncated for Vercel AI optimization because it prefers concise, structured context for better performance',
          type: 'fact',
          relevanceScore: 0.8,
          importance: 0.7,
          source: 'test',
          metadata: {}
        }
      ];

      const optimized = await contextInjectionEngine.optimizeContextForFramework(
        contextItems,
        'vercel-ai',
        1000,
        'medium'
      );

      expect(optimized[0].content.length).toBeLessThan(contextItems[0].content.length);
    });

    it('should optimize context for Mastra', async () => {
      const contextItems: ContextItem[] = [
        {
          id: 'context_1',
          content: 'User preference',
          type: 'preference',
          relevanceScore: 0.8,
          importance: 0.7,
          source: 'test',
          metadata: {}
        },
        {
          id: 'context_2',
          content: 'Step-by-step procedure',
          type: 'procedure',
          relevanceScore: 0.9,
          importance: 0.8,
          source: 'test',
          metadata: {}
        },
        {
          id: 'context_3',
          content: 'Random conversation',
          type: 'memory',
          relevanceScore: 0.7,
          importance: 0.6,
          source: 'test',
          metadata: {}
        }
      ];

      const optimized = await contextInjectionEngine.optimizeContextForFramework(
        contextItems,
        'mastra',
        1000,
        'none'
      );

      // Mastra should filter for procedural context
      const procedureItems = optimized.filter(item => 
        item.type === 'procedure' || item.type === 'example' || item.type === 'fact'
      );
      expect(procedureItems.length).toBeGreaterThan(0);
    });

    it('should optimize context for OpenAI Agents', async () => {
      const contextItems: ContextItem[] = [
        {
          id: 'context_1',
          content: 'User preference',
          type: 'preference',
          relevanceScore: 0.8,
          importance: 0.7,
          source: 'test',
          metadata: {}
        }
      ];

      const optimized = await contextInjectionEngine.optimizeContextForFramework(
        contextItems,
        'openai-agents',
        1000,
        'none'
      );

      // OpenAI Agents should add role-based prefixes
      expect(optimized[0].content).toContain('[PREFERENCE]');
    });
  });

  describe('Prompt Injection Patterns', () => {
    it('should inject context with Vercel AI pattern', async () => {
      const contextItems: ContextItem[] = [
        {
          id: 'context_1',
          content: 'User likes coffee',
          type: 'preference',
          relevanceScore: 0.8,
          importance: 0.7,
          source: 'test',
          metadata: {}
        }
      ];

      const enhanced = contextInjectionEngine['injectContextIntoPrompt'](
        'What should I drink?',
        contextItems,
        'vercel-ai',
        false
      );

      expect(enhanced).toContain('1. User likes coffee');
      expect(enhanced).toContain('User Query: What should I drink?');
    });

    it('should inject context with Mastra pattern', async () => {
      const contextItems: ContextItem[] = [
        {
          id: 'context_1',
          content: 'Meeting procedure',
          type: 'procedure',
          relevanceScore: 0.9,
          importance: 0.8,
          source: 'test',
          metadata: {}
        }
      ];

      const enhanced = contextInjectionEngine['injectContextIntoPrompt'](
        'Schedule a meeting',
        contextItems,
        'mastra',
        false
      );

      expect(enhanced).toContain('Context:');
      expect(enhanced).toContain('Task: Schedule a meeting');
    });

    it('should inject context with LangChain pattern', async () => {
      const contextItems: ContextItem[] = [
        {
          id: 'context_1',
          content: 'Relevant information',
          type: 'fact',
          relevanceScore: 0.8,
          importance: 0.7,
          source: 'test',
          metadata: {}
        }
      ];

      const enhanced = contextInjectionEngine['injectContextIntoPrompt'](
        'Answer this question',
        contextItems,
        'langchain',
        false
      );

      expect(enhanced).toContain('Relevant Context:');
      expect(enhanced).toContain('Human: Answer this question');
    });

    it('should inject context with OpenAI Agents pattern', async () => {
      const contextItems: ContextItem[] = [
        {
          id: 'context_1',
          content: 'Important context',
          type: 'fact',
          relevanceScore: 0.8,
          importance: 0.7,
          source: 'test',
          metadata: {}
        }
      ];

      const enhanced = contextInjectionEngine['injectContextIntoPrompt'](
        'Process this request',
        contextItems,
        'openai-agents',
        false
      );

      expect(enhanced).toContain('# Context');
      expect(enhanced).toContain('# User Request');
    });

    it('should include metadata when requested', async () => {
      const contextItems: ContextItem[] = [
        {
          id: 'context_1',
          content: 'Test content',
          type: 'fact',
          relevanceScore: 0.8,
          importance: 0.7,
          source: 'test',
          metadata: { framework: 'vercel-ai', confidence: 0.9 }
        }
      ];

      const enhanced = contextInjectionEngine['injectContextIntoPrompt'](
        'Test prompt',
        contextItems,
        'universal',
        true
      );

      expect(enhanced).toContain('framework: vercel-ai');
      expect(enhanced).toContain('confidence: 0.9');
    });
  });

  describe('Context Caching', () => {
    it('should cache context results', async () => {
      const mockMemories = [
        {
          id: 'memory_1',
          content: 'Cached memory',
          metadata: {
            type: 'fact' as const,
            importance: 0.8,
            confidence: 0.9,
            source: 'test',
            framework: 'test',
            sessionId: 'test',
            tags: [],
            relationships: [],
            accessCount: 0,
            lastAccessed: new Date(),
            created: new Date(),
            updated: new Date()
          }
        }
      ];

      mockSemanticMemoryEngine.retrieveRelevantMemories.mockResolvedValue(mockMemories);
      mockVectorSearchEngine.semanticSearch.mockResolvedValue([]);

      const prompt = 'Test prompt';
      const options: ContextOptions = {
        framework: 'vercel-ai',
        sessionId: 'session_123'
      };

      // First call
      await contextInjectionEngine.enhancePrompt(prompt, options);
      
      // Second call with same parameters
      await contextInjectionEngine.enhancePrompt(prompt, options);

      // Memory engine should only be called once due to caching
      expect(mockSemanticMemoryEngine.retrieveRelevantMemories).toHaveBeenCalledTimes(1);
    });
  });

  describe('Optimization Metrics', () => {
    it('should calculate proper optimization metrics', async () => {
      const contextItems: ContextItem[] = [
        {
          id: 'context_1',
          content: 'Test context',
          type: 'fact',
          relevanceScore: 0.8,
          importance: 0.7,
          source: 'test',
          metadata: {}
        }
      ];

      mockSemanticMemoryEngine.retrieveRelevantMemories.mockResolvedValue([]);
      mockVectorSearchEngine.semanticSearch.mockResolvedValue([]);

      // Mock selectRelevantContext to return our test context
      jest.spyOn(contextInjectionEngine, 'selectRelevantContext').mockResolvedValue(contextItems);

      const enhanced = await contextInjectionEngine.enhancePrompt('Test prompt');

      expect(enhanced.optimizationMetrics.contextRelevance).toBe(0.8);
      expect(enhanced.optimizationMetrics.contextDensity).toBeGreaterThan(0);
      expect(enhanced.optimizationMetrics.tokenCount).toBeGreaterThan(0);
      expect(enhanced.optimizationMetrics.compressionRatio).toBeGreaterThan(0);
    });
  });
});
