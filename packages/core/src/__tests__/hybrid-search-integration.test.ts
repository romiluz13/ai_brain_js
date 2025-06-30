/**
 * Hybrid Search Integration Test
 * Validates that Universal AI Brain 3.0 properly integrates MongoDB Atlas Hybrid Search
 */

import { UniversalAIBrain } from '../UniversalAIBrain';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

describe('Hybrid Search Integration', () => {
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let brain: UniversalAIBrain;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();

    // Initialize Universal AI Brain with hybrid search enabled
    brain = new UniversalAIBrain({
      mongodb: {
        uri: mongoUri,
        databaseName: 'test_ai_brain'
      },
      intelligence: {
        enableHybridSearch: true,
        hybridSearchVectorWeight: 0.7,
        hybridSearchTextWeight: 0.3,
        hybridSearchFallbackToVector: true
      },
      embeddings: {
        provider: 'voyage',
        apiKey: process.env.VOYAGE_API_KEY || 'test-key'
      }
    });

    await brain.initialize();
  });

  afterAll(async () => {
    await brain.disconnect();
    await mongoClient.close();
    await mongoServer.stop();
  });

  describe('Hybrid Search Engine Access', () => {
    test('should have hybrid search engine initialized', () => {
      expect(brain.hybridSearch).toBeDefined();
      expect(typeof brain.hybridSearch.search).toBe('function');
    });

    test('should have hybrid search enabled by default', () => {
      expect(brain['config'].intelligence?.enableHybridSearch).toBe(true);
    });

    test('should have proper hybrid search weights configured', () => {
      expect(brain['config'].intelligence?.hybridSearchVectorWeight).toBe(0.7);
      expect(brain['config'].intelligence?.hybridSearchTextWeight).toBe(0.3);
    });
  });

  describe('Intelligent Search Method', () => {
    test('should use hybrid search in processRequest', async () => {
      // Store some test memory
      await brain.storeMemory('Machine learning is a subset of artificial intelligence', 'test-session');
      await brain.storeMemory('Deep learning uses neural networks with multiple layers', 'test-session');

      // Mock the hybrid search to verify it's being called
      const hybridSearchSpy = jest.spyOn(brain.hybridSearch, 'search');
      hybridSearchSpy.mockResolvedValue([
        {
          _id: 'test-id',
          content: { text: 'Machine learning is a subset of artificial intelligence' },
          scores: { combined_score: 0.95 },
          metadata: {},
          relevance_explanation: 'High semantic similarity'
        }
      ]);

      // Process request should use hybrid search
      const response = await brain.processRequest('mastra', 'What is machine learning?', {
        sessionId: 'test-session'
      });

      expect(hybridSearchSpy).toHaveBeenCalled();
      expect(response).toBeDefined();

      hybridSearchSpy.mockRestore();
    });

    test('should fallback to vector search when hybrid search fails', async () => {
      // Mock hybrid search to fail
      const hybridSearchSpy = jest.spyOn(brain.hybridSearch, 'search');
      hybridSearchSpy.mockRejectedValue(new Error('Hybrid search not supported'));

      // Mock vector search to succeed
      const vectorSearchSpy = jest.spyOn(brain['vectorSearchEngine'], 'semanticSearch');
      vectorSearchSpy.mockResolvedValue([
        {
          id: 'test-id',
          content: 'Machine learning is a subset of artificial intelligence',
          score: 0.85,
          metadata: {}
        }
      ]);

      // Process request should fallback to vector search
      const response = await brain.processRequest('mastra', 'What is machine learning?', {
        sessionId: 'test-session'
      });

      expect(hybridSearchSpy).toHaveBeenCalled();
      expect(vectorSearchSpy).toHaveBeenCalled();
      expect(response).toBeDefined();

      hybridSearchSpy.mockRestore();
      vectorSearchSpy.mockRestore();
    });
  });

  describe('Configuration Options', () => {
    test('should respect disabled hybrid search', async () => {
      // Create brain with hybrid search disabled
      const brainWithoutHybrid = new UniversalAIBrain({
        mongodb: {
          uri: mongoServer.getUri(),
          databaseName: 'test_ai_brain_no_hybrid'
        },
        intelligence: {
          enableHybridSearch: false
        },
        embeddings: {
          provider: 'voyage',
          apiKey: process.env.VOYAGE_API_KEY || 'test-key'
        }
      });

      await brainWithoutHybrid.initialize();

      // Mock vector search
      const vectorSearchSpy = jest.spyOn(brainWithoutHybrid['vectorSearchEngine'], 'semanticSearch');
      vectorSearchSpy.mockResolvedValue([]);

      // Should use vector search directly
      await brainWithoutHybrid.processRequest('mastra', 'test query');

      expect(vectorSearchSpy).toHaveBeenCalled();

      vectorSearchSpy.mockRestore();
      await brainWithoutHybrid.disconnect();
    });

    test('should use custom hybrid search weights', () => {
      const customBrain = new UniversalAIBrain({
        mongodb: {
          uri: 'mongodb://localhost:27017',
          databaseName: 'test'
        },
        intelligence: {
          hybridSearchVectorWeight: 0.8,
          hybridSearchTextWeight: 0.2
        }
      });

      expect(customBrain['config'].intelligence?.hybridSearchVectorWeight).toBe(0.8);
      expect(customBrain['config'].intelligence?.hybridSearchTextWeight).toBe(0.2);
    });
  });

  describe('Error Handling', () => {
    test('should handle hybrid search errors gracefully', async () => {
      // Mock hybrid search to fail
      const hybridSearchSpy = jest.spyOn(brain.hybridSearch, 'search');
      hybridSearchSpy.mockRejectedValue(new Error('MongoDB version not supported'));

      // Mock vector search fallback
      const vectorSearchSpy = jest.spyOn(brain['vectorSearchEngine'], 'semanticSearch');
      vectorSearchSpy.mockResolvedValue([]);

      // Should not throw error, should fallback gracefully
      await expect(brain.processRequest('mastra', 'test query')).resolves.toBeDefined();

      hybridSearchSpy.mockRestore();
      vectorSearchSpy.mockRestore();
    });
  });

  describe('Performance and Logging', () => {
    test('should log hybrid search usage', async () => {
      const consoleSpy = jest.spyOn(console, 'log');

      // Mock hybrid search
      const hybridSearchSpy = jest.spyOn(brain.hybridSearch, 'search');
      hybridSearchSpy.mockResolvedValue([]);

      await brain.processRequest('mastra', 'test query');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚀 Using MongoDB Atlas Hybrid Search with $rankFusion')
      );

      consoleSpy.mockRestore();
      hybridSearchSpy.mockRestore();
    });

    test('should log fallback to vector search', async () => {
      const consoleSpy = jest.spyOn(console, 'warn');

      // Mock hybrid search to fail
      const hybridSearchSpy = jest.spyOn(brain.hybridSearch, 'search');
      hybridSearchSpy.mockRejectedValue(new Error('Test error'));

      // Mock vector search
      const vectorSearchSpy = jest.spyOn(brain['vectorSearchEngine'], 'semanticSearch');
      vectorSearchSpy.mockResolvedValue([]);

      await brain.processRequest('mastra', 'test query');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ Hybrid search failed, falling back to vector search:')
      );

      consoleSpy.mockRestore();
      hybridSearchSpy.mockRestore();
      vectorSearchSpy.mockRestore();
    });
  });
});
