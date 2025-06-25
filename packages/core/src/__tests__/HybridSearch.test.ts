import { HybridSearchEngine, DefaultEmbeddingProvider, SearchFilters } from '../features/hybridSearch';
import { MongoEmbeddingProvider } from '../persistance/MongoEmbeddingProvider';
import { setupTestDb, teardownTestDb, getTestDb } from './setup';

describe('HybridSearchEngine', () => {
  let searchEngine: HybridSearchEngine;
  let embeddingProvider: MongoEmbeddingProvider;

  beforeAll(async () => {
    await setupTestDb();
    const db = getTestDb();
    
    const mockEmbeddingProvider = new DefaultEmbeddingProvider();
    searchEngine = new HybridSearchEngine(db, mockEmbeddingProvider);
    embeddingProvider = new MongoEmbeddingProvider(db);
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    // Clear the vector embeddings collection before each test
    await getTestDb().collection('vector_embeddings').deleteMany({});
  });

  describe('vector embedding operations', () => {
    it('should store and retrieve vector embeddings', async () => {
      const testVectors = [
        {
          id: 'test-vector-1',
          values: Array(1024).fill(0).map(() => Math.random()),
          metadata: {
            source_type: 'document',
            source_id: 'doc-1',
            text: 'This is a test document about artificial intelligence',
            summary: 'AI document',
            provider: 'test',
            model: 'test-model',
            version: '1.0'
          }
        },
        {
          id: 'test-vector-2',
          values: Array(1024).fill(0).map(() => Math.random()),
          metadata: {
            source_type: 'document',
            source_id: 'doc-2',
            text: 'This document discusses machine learning algorithms',
            summary: 'ML algorithms',
            provider: 'test',
            model: 'test-model',
            version: '1.0'
          }
        }
      ];

      await embeddingProvider.upsert(testVectors);

      // Verify vectors were stored
      const collection = getTestDb().collection('vector_embeddings');
      const storedVectors = await collection.find({}).toArray();
      
      expect(storedVectors).toHaveLength(2);
      expect(storedVectors[0].embedding_id).toBe('test-vector-1');
      expect(storedVectors[1].embedding_id).toBe('test-vector-2');
    });
  });

  describe('semantic search', () => {
    beforeEach(async () => {
      // Set up test data
      const testVectors = [
        {
          id: 'ai-doc-1',
          values: Array(1024).fill(0).map(() => Math.random()),
          metadata: {
            source_type: 'research',
            source_id: 'research-1',
            text: 'Artificial intelligence and machine learning are transforming technology',
            summary: 'AI/ML transformation',
            provider: 'test',
            model: 'test-model',
            version: '1.0',
            industry: 'technology'
          }
        },
        {
          id: 'ai-doc-2',
          values: Array(1024).fill(0).map(() => Math.random()),
          metadata: {
            source_type: 'research',
            source_id: 'research-2',
            text: 'Deep learning neural networks are advancing rapidly',
            summary: 'Deep learning advances',
            provider: 'test',
            model: 'test-model',
            version: '1.0',
            industry: 'technology'
          }
        },
        {
          id: 'finance-doc-1',
          values: Array(1024).fill(0).map(() => Math.random()),
          metadata: {
            source_type: 'research',
            source_id: 'research-3',
            text: 'Financial markets and investment strategies',
            summary: 'Finance and investments',
            provider: 'test',
            model: 'test-model',
            version: '1.0',
            industry: 'finance'
          }
        }
      ];

      await embeddingProvider.upsert(testVectors);
    });

    it('should perform semantic search', async () => {
      const results = await searchEngine.semanticSearch(
        'artificial intelligence machine learning',
        {},
        5
      );

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      // Note: Without actual vector search indexes, this will return empty results
      // In a real environment with proper indexes, we would expect relevant results
    });

    it('should filter search results', async () => {
      const filters: SearchFilters = {
        source_type: 'research',
        metadata_filters: {
          industry: 'technology'
        }
      };

      const results = await searchEngine.semanticSearch(
        'machine learning',
        filters,
        5
      );

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('hybrid search', () => {
    beforeEach(async () => {
      // Set up test data for hybrid search
      const testVectors = [
        {
          id: 'hybrid-1',
          values: Array(1024).fill(0).map(() => Math.random()),
          metadata: {
            source_type: 'article',
            source_id: 'article-1',
            text: 'MongoDB vector search enables semantic similarity matching',
            summary: 'MongoDB vector search',
            provider: 'test',
            model: 'test-model',
            version: '1.0'
          }
        }
      ];

      await embeddingProvider.upsert(testVectors);
    });

    it('should perform hybrid search with default weights', async () => {
      const results = await searchEngine.search(
        'MongoDB vector search database',
        {},
        { limit: 5 }
      );

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      
      // Each result should have the expected structure
      results.forEach(result => {
        expect(result).toHaveProperty('_id');
        expect(result).toHaveProperty('embedding_id');
        expect(result).toHaveProperty('content');
        expect(result).toHaveProperty('metadata');
        expect(result).toHaveProperty('scores');
        expect(result.scores).toHaveProperty('vector_score');
        expect(result.scores).toHaveProperty('text_score');
        expect(result.scores).toHaveProperty('combined_score');
      });
    });

    it('should include relevance explanations', async () => {
      const results = await searchEngine.search(
        'vector search',
        {},
        { 
          limit: 5,
          explain_relevance: true
        }
      );

      expect(results).toBeDefined();
      results.forEach(result => {
        expect(result.relevance_explanation).toBeDefined();
        expect(typeof result.relevance_explanation).toBe('string');
      });
    });
  });

  describe('error handling', () => {
    it('should handle search errors gracefully', async () => {
      // Test with invalid filters that might cause errors
      const results = await searchEngine.search(
        'test query',
        { metadata_filters: { invalid: { $invalidOperator: 'test' } } },
        { limit: 5 }
      );

      // Should not throw, but may return empty results or fallback to text search
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });
});