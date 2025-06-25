/**
 * @file SemanticMemoryEngine Tests
 * Comprehensive tests for the SemanticMemoryEngine component with real MongoDB Atlas
 */

import { SemanticMemoryEngine, Memory, MemorySearchOptions } from '../../intelligence/SemanticMemoryEngine';
import { MemoryCollection } from '../../collections/MemoryCollection';
import { OpenAIEmbeddingProvider } from '../../embeddings/OpenAIEmbeddingProvider';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestEmbeddingProvider,
  createTestMemory,
  isMongoAtlasError,
  isOpenAIError,
  shouldSkipTest
} from '../testConfig';

describe('SemanticMemoryEngine', () => {
  let semanticMemoryEngine: SemanticMemoryEngine;
  let memoryCollection: MemoryCollection;
  let embeddingProvider: OpenAIEmbeddingProvider;
  let testDb: any;

  beforeAll(async () => {
    try {
      testDb = await setupTestDatabase();
      memoryCollection = new MemoryCollection(testDb);
      embeddingProvider = createTestEmbeddingProvider();

      // Initialize collection with indexes
      await memoryCollection.initialize();

      semanticMemoryEngine = new SemanticMemoryEngine(memoryCollection, embeddingProvider);
      console.log('✅ SemanticMemoryEngine test setup complete');
    } catch (error) {
      if (shouldSkipTest(error)) {
        console.log('⏭️ Skipping SemanticMemoryEngine tests due to setup failure');
        return;
      }
      throw error;
    }
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('Memory Storage', () => {
    it('should store memory with embedding generation', async () => {
      if (!testDb || !semanticMemoryEngine) {
        console.log('⏭️ Skipping test: Database not available');
        return;
      }

      try {
        const content = 'User prefers morning meetings for Universal AI Brain testing';
        const testMemory = createTestMemory();
        testMemory.content = content;
        testMemory.metadata.type = 'preference';
        testMemory.metadata.framework = 'vercel-ai';

        const memoryId = await semanticMemoryEngine.storeMemory(content, testMemory.metadata);

        expect(memoryId).toMatch(/^memory_/);
        expect(memoryId).toBeDefined();

        console.log(`✅ Successfully stored memory: ${memoryId}`);
      } catch (error) {
        if (shouldSkipTest(error)) {
          console.log('⏭️ Skipping test due to external service unavailability');
          return;
        }
        throw error;
      }
    });

    it('should handle embedding generation failure gracefully', async () => {
      mockEmbeddingProvider.generateEmbedding.mockRejectedValue(new Error('API Error'));

      const content = 'Test content';
      const metadata = {
        type: 'context' as const,
        importance: 0.5,
        confidence: 0.8,
        source: 'test',
        framework: 'test',
        sessionId: 'test',
        tags: [],
        relationships: [],
        accessCount: 0,
        lastAccessed: new Date(),
        created: new Date(),
        updated: new Date()
      };

      const memoryId = await semanticMemoryEngine.storeMemory(content, metadata);

      expect(mockMemoryCollection.storeDocument).toHaveBeenCalled();
      expect(memoryId).toMatch(/^memory_/);
    });

    it('should store memory without embedding when disabled', async () => {
      const content = 'Test content';
      const metadata = {
        type: 'context' as const,
        importance: 0.5,
        confidence: 0.8,
        source: 'test',
        framework: 'test',
        sessionId: 'test',
        tags: [],
        relationships: [],
        accessCount: 0,
        lastAccessed: new Date(),
        created: new Date(),
        updated: new Date()
      };

      const memoryId = await semanticMemoryEngine.storeMemory(content, metadata, {
        generateEmbedding: false
      });

      expect(mockEmbeddingProvider.generateEmbedding).not.toHaveBeenCalled();
      expect(mockMemoryCollection.storeDocument).toHaveBeenCalled();
      expect(memoryId).toMatch(/^memory_/);
    });
  });

  describe('Memory Retrieval', () => {
    it('should retrieve relevant memories using vector search', async () => {
      const mockMemories = [
        {
          _id: 'doc1',
          content: JSON.stringify({
            id: 'memory_1',
            content: 'User likes coffee',
            metadata: {
              type: 'preference',
              importance: 0.8,
              confidence: 0.9,
              framework: 'vercel-ai'
            }
          }),
          embedding: { values: [0.1, 0.2, 0.3] },
          vectorScore: 0.85
        }
      ];

      mockMemoryCollection.aggregate.mockResolvedValue(mockMemories);

      const query = 'What does the user like to drink?';
      const options: MemorySearchOptions = {
        limit: 5,
        minImportance: 0.5,
        frameworks: ['vercel-ai']
      };

      const memories = await semanticMemoryEngine.retrieveRelevantMemories(query, options);

      expect(mockEmbeddingProvider.generateEmbedding).toHaveBeenCalledWith(query);
      expect(mockMemoryCollection.aggregate).toHaveBeenCalled();
      expect(memories).toHaveLength(1);
      expect(memories[0].content).toBe('User likes coffee');
    });

    it('should handle vector search failure with fallback', async () => {
      mockEmbeddingProvider.generateEmbedding.mockRejectedValue(new Error('Embedding failed'));
      mockMemoryCollection.aggregate.mockResolvedValue([]);

      const query = 'Test query';
      const memories = await semanticMemoryEngine.retrieveRelevantMemories(query);

      expect(memories).toEqual([]);
    });

    it('should filter memories by type and framework', async () => {
      const query = 'Test query';
      const options: MemorySearchOptions = {
        types: ['preference', 'fact'],
        frameworks: ['vercel-ai'],
        minImportance: 0.7
      };

      await semanticMemoryEngine.retrieveRelevantMemories(query, options);

      const aggregateCall = mockMemoryCollection.aggregate.mock.calls[0][0];
      const vectorSearchStage = aggregateCall[0].$vectorSearch;
      
      expect(vectorSearchStage.filter).toEqual(
        expect.objectContaining({
          'metadata.type': 'semantic_memory',
          'metadata.importance': { $gte: 0.7 }
        })
      );
    });
  });

  describe('Memory Importance Management', () => {
    it('should update memory importance with decay factor', async () => {
      const mockMemory: Memory = {
        id: 'memory_123',
        content: 'Test memory',
        metadata: {
          type: 'context',
          importance: 0.8,
          confidence: 0.9,
          source: 'test',
          framework: 'test',
          sessionId: 'test',
          tags: [],
          relationships: [],
          accessCount: 5,
          lastAccessed: new Date(),
          created: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          updated: new Date()
        }
      };

      // Mock getMemoryById to return the memory
      mockMemoryCollection.aggregate.mockResolvedValue([{
        content: JSON.stringify(mockMemory),
        embedding: { values: [0.1, 0.2, 0.3] }
      }]);

      await semanticMemoryEngine.updateMemoryImportance('memory_123', 0.9, 'user_feedback');

      expect(mockMemoryCollection.updateDocument).toHaveBeenCalled();
    });

    it('should throw error for non-existent memory', async () => {
      mockMemoryCollection.aggregate.mockResolvedValue([]);

      await expect(
        semanticMemoryEngine.updateMemoryImportance('non_existent', 0.9)
      ).rejects.toThrow('Memory not found: non_existent');
    });
  });

  describe('Memory Relationships', () => {
    it('should create bidirectional relationships between memories', async () => {
      const memory1: Memory = {
        id: 'memory_1',
        content: 'First memory',
        metadata: {
          type: 'context',
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
      };

      const memory2: Memory = {
        id: 'memory_2',
        content: 'Second memory',
        metadata: {
          type: 'context',
          importance: 0.7,
          confidence: 0.8,
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

      // Mock getMemoryById calls
      mockMemoryCollection.aggregate
        .mockResolvedValueOnce([{ content: JSON.stringify(memory1) }])
        .mockResolvedValueOnce([{ content: JSON.stringify(memory2) }]);

      await semanticMemoryEngine.createMemoryRelationship('memory_1', 'memory_2', 'similar');

      expect(mockMemoryCollection.updateDocument).toHaveBeenCalledTimes(2);
    });

    it('should handle missing memories in relationship creation', async () => {
      mockMemoryCollection.aggregate.mockResolvedValue([]);

      await expect(
        semanticMemoryEngine.createMemoryRelationship('memory_1', 'memory_2')
      ).rejects.toThrow('One or both memories not found');
    });
  });

  describe('Memory Analytics', () => {
    it('should generate comprehensive memory analytics', async () => {
      const mockAnalyticsResult = [{
        totalCount: [{ total: 100 }],
        byType: [
          { _id: 'preference', count: 30 },
          { _id: 'fact', count: 40 },
          { _id: 'context', count: 30 }
        ],
        byFramework: [
          { _id: 'vercel-ai', count: 50 },
          { _id: 'mastra', count: 30 },
          { _id: 'langchain', count: 20 }
        ],
        averageImportance: [{ avg: 0.75 }],
        averageConfidence: [{ avg: 0.82 }],
        growthTrend: [
          { _id: '2024-01-01', count: 10 },
          { _id: '2024-01-02', count: 15 }
        ],
        topTags: [
          { _id: 'preference', count: 25 },
          { _id: 'scheduling', count: 20 }
        ],
        healthMetrics: [{
          staleMemories: 5,
          lowConfidenceMemories: 8,
          orphanedMemories: 3
        }]
      }];

      mockMemoryCollection.aggregate.mockResolvedValue(mockAnalyticsResult);

      const analytics = await semanticMemoryEngine.generateMemoryAnalytics();

      expect(analytics.totalMemories).toBe(100);
      expect(analytics.memoriesByType).toEqual({
        'preference': 30,
        'fact': 40,
        'context': 30
      });
      expect(analytics.memoriesByFramework).toEqual({
        'vercel-ai': 50,
        'mastra': 30,
        'langchain': 20
      });
      expect(analytics.averageImportance).toBe(0.75);
      expect(analytics.averageConfidence).toBe(0.82);
      expect(analytics.memoryGrowthTrend).toHaveLength(2);
      expect(analytics.topTags).toHaveLength(2);
      expect(analytics.memoryHealth.staleMemories).toBe(5);
    });

    it('should handle empty analytics gracefully', async () => {
      mockMemoryCollection.aggregate.mockResolvedValue([{
        totalCount: [],
        byType: [],
        byFramework: [],
        averageImportance: [],
        averageConfidence: [],
        growthTrend: [],
        topTags: [],
        healthMetrics: []
      }]);

      const analytics = await semanticMemoryEngine.generateMemoryAnalytics();

      expect(analytics.totalMemories).toBe(0);
      expect(analytics.averageImportance).toBe(0);
      expect(analytics.averageConfidence).toBe(0);
    });
  });

  describe('MongoDB Vector Search Integration', () => {
    it('should construct proper $vectorSearch aggregation pipeline', async () => {
      const query = 'Test query';
      await semanticMemoryEngine.retrieveRelevantMemories(query, {
        limit: 10,
        minImportance: 0.5,
        frameworks: ['vercel-ai'],
        sessionId: 'session_123'
      });

      const aggregateCall = mockMemoryCollection.aggregate.mock.calls[0][0];
      const vectorSearchStage = aggregateCall[0];

      expect(vectorSearchStage).toHaveProperty('$vectorSearch');
      expect(vectorSearchStage.$vectorSearch).toEqual(
        expect.objectContaining({
          index: 'memory_vector_index',
          path: 'embedding.values',
          queryVector: [0.1, 0.2, 0.3],
          numCandidates: expect.any(Number),
          limit: expect.any(Number),
          filter: expect.any(Object)
        })
      );
    });

    it('should include proper vector score calculation', async () => {
      await semanticMemoryEngine.retrieveRelevantMemories('test query');

      const aggregateCall = mockMemoryCollection.aggregate.mock.calls[0][0];
      const addFieldsStage = aggregateCall[1];

      expect(addFieldsStage).toHaveProperty('$addFields');
      expect(addFieldsStage.$addFields).toHaveProperty('vectorScore');
      expect(addFieldsStage.$addFields.vectorScore).toEqual({ $meta: 'vectorSearchScore' });
    });
  });
});
