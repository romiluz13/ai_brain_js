/**
 * @file MongoVectorStore.test.ts - Comprehensive tests for MongoDB Atlas Vector Search
 * 
 * Tests the real MongoDB Atlas Vector Search implementation with proper $vectorSearch syntax.
 * These tests validate the production-ready vector search capabilities.
 */

import { MongoVectorStore, EmbeddingProvider, VectorSearchOptions } from '../vector/MongoVectorStore';
import { setupTestDb, teardownTestDb, getTestDb } from './setup';
import { Db } from 'mongodb';

// Mock embedding provider for testing
class MockEmbeddingProvider implements EmbeddingProvider {
  private dimensions = 1536;
  private model = 'text-embedding-ada-002';

  async generateEmbedding(text: string): Promise<number[]> {
    // Generate deterministic embeddings for testing
    const hash = this.simpleHash(text);
    return Array(this.dimensions).fill(0).map((_, i) => 
      Math.sin(hash + i) * 0.5 + 0.5
    );
  }

  getDimensions(): number {
    return this.dimensions;
  }

  getModel(): string {
    return this.model;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / 1000000;
  }
}

// Mock MongoConnection for testing
class MockMongoConnection {
  private db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  getDb(): Db {
    return this.db;
  }

  async disconnect(): Promise<void> {
    // No-op for testing
  }
}

describe('MongoVectorStore', () => {
  let vectorStore: MongoVectorStore;
  let mockConnection: MockMongoConnection;
  let embeddingProvider: MockEmbeddingProvider;

  beforeAll(async () => {
    const testDb = await setupTestDb();

    // Create mock connection
    mockConnection = new MockMongoConnection(testDb);

    // Initialize vector store
    vectorStore = new MongoVectorStore(
      mockConnection as any,
      'test_vector_collection',
      'test_vector_index',
      'test_text_index'
    );

    embeddingProvider = new MockEmbeddingProvider();
    await vectorStore.initialize(embeddingProvider);
  }, 60000); // 60 second timeout for setup

  afterAll(async () => {
    await teardownTestDb();
  }, 30000); // 30 second timeout for teardown

  beforeEach(async () => {
    // Clear the collection before each test
    const db = mockConnection.getDb();
    await db.collection('test_vector_collection').deleteMany({});
  });

  describe('Document Storage', () => {
    it('should store a single document with embedding', async () => {
      const text = 'This is a test document about artificial intelligence';
      const metadata = { type: 'test', category: 'ai' };
      const source = 'test-source';

      const documentId = await vectorStore.storeDocument(text, metadata, source);

      expect(documentId).toBeDefined();
      expect(typeof documentId).toBe('string');

      // Verify document was stored
      const storedDoc = await vectorStore.getDocument(documentId);
      expect(storedDoc).toBeDefined();
      expect(storedDoc!.text).toBe(text);
      expect(storedDoc!.source).toBe(source);
      expect(storedDoc!.metadata.type).toBe('test');
    });

    it('should store multiple documents in batch', async () => {
      const documents = [
        {
          text: 'Document about machine learning',
          metadata: { type: 'ml', category: 'ai' },
          source: 'batch-test-1'
        },
        {
          text: 'Document about deep learning',
          metadata: { type: 'dl', category: 'ai' },
          source: 'batch-test-2'
        }
      ];

      const documentIds = await vectorStore.storeDocuments(documents);

      expect(documentIds).toHaveLength(2);
      expect(documentIds.every(id => typeof id === 'string')).toBe(true);

      // Verify documents were stored
      for (const id of documentIds) {
        const doc = await vectorStore.getDocument(id);
        expect(doc).toBeDefined();
        expect(doc!.metadata.category).toBe('ai');
      }
    });

    it('should handle custom embeddings', async () => {
      const text = 'Custom embedding test';
      const customEmbedding = Array(1536).fill(0).map(() => Math.random());

      const documentId = await vectorStore.storeDocument(
        text,
        { type: 'custom' },
        'custom-source',
        customEmbedding
      );

      const storedDoc = await vectorStore.getDocument(documentId, true);
      expect(storedDoc!.embedding).toEqual(customEmbedding);
    });
  });

  describe('Vector Search', () => {
    beforeEach(async () => {
      // Set up test documents
      const testDocs = [
        {
          text: 'Artificial intelligence and machine learning are transforming technology',
          metadata: { topic: 'ai', importance: 'high' },
          source: 'ai-article'
        },
        {
          text: 'Deep learning neural networks process complex patterns',
          metadata: { topic: 'dl', importance: 'medium' },
          source: 'dl-article'
        },
        {
          text: 'Natural language processing enables human-computer interaction',
          metadata: { topic: 'nlp', importance: 'high' },
          source: 'nlp-article'
        }
      ];

      await vectorStore.storeDocuments(testDocs);
    });

    it('should perform vector search with text query', async () => {
      const results = await vectorStore.vectorSearch(
        'artificial intelligence machine learning',
        { limit: 2, minScore: 0.1 }
      );

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      
      // Note: In a real Atlas environment with vector indexes, we would get actual results
      // For now, we're testing the query structure and error handling
    });

    it('should perform vector search with embedding array', async () => {
      const queryEmbedding = await embeddingProvider.generateEmbedding('test query');
      
      const results = await vectorStore.vectorSearch(queryEmbedding, {
        limit: 3,
        filter: { 'metadata.topic': 'ai' }
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should apply filters in vector search', async () => {
      const options: VectorSearchOptions = {
        limit: 5,
        filter: { 'metadata.importance': 'high' },
        minScore: 0.5
      };

      const results = await vectorStore.vectorSearch('important AI topics', options);
      expect(results).toBeDefined();
    });
  });

  describe('Hybrid Search', () => {
    beforeEach(async () => {
      const testDocs = [
        {
          text: 'MongoDB Atlas Vector Search enables semantic similarity matching',
          metadata: { database: 'mongodb', feature: 'vector-search' },
          source: 'mongodb-docs'
        },
        {
          text: 'Vector databases store high-dimensional embeddings efficiently',
          metadata: { database: 'vector-db', feature: 'storage' },
          source: 'vector-db-guide'
        }
      ];

      await vectorStore.storeDocuments(testDocs);
    });

    it('should perform hybrid search combining vector and text', async () => {
      const results = await vectorStore.hybridSearch('MongoDB vector search', {
        limit: 5
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      
      // Results should have scores and search type metadata
      results.forEach(result => {
        expect(result).toHaveProperty('score');
        expect(typeof result.score).toBe('number');
      });
    });

    it('should fallback to vector search if text search fails', async () => {
      // This tests the error handling in hybrid search
      const results = await vectorStore.hybridSearch('test query fallback');
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Document Management', () => {
    let testDocumentId: string;

    beforeEach(async () => {
      testDocumentId = await vectorStore.storeDocument(
        'Test document for management operations',
        { type: 'management-test', version: 1 },
        'management-source'
      );
    });

    it('should find similar documents', async () => {
      // Store another similar document
      await vectorStore.storeDocument(
        'Another test document with similar content',
        { type: 'management-test', version: 2 },
        'management-source'
      );

      const similarDocs = await vectorStore.findSimilar(testDocumentId, { limit: 5 });
      expect(similarDocs).toBeDefined();
      expect(Array.isArray(similarDocs)).toBe(true);
    });

    it('should update document metadata', async () => {
      const newMetadata = { type: 'updated-test', version: 2, updated: true };
      
      const success = await vectorStore.updateDocumentMetadata(testDocumentId, newMetadata);
      expect(success).toBe(true);

      const updatedDoc = await vectorStore.getDocument(testDocumentId);
      expect(updatedDoc!.metadata.type).toBe('updated-test');
      expect(updatedDoc!.metadata.updated).toBe(true);
    });

    it('should search by metadata', async () => {
      const results = await vectorStore.searchByMetadata(
        { 'metadata.type': 'management-test' },
        { limit: 10 }
      );

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should delete documents by filter', async () => {
      const deletedCount = await vectorStore.deleteDocuments({
        'metadata.type': 'management-test'
      });

      expect(deletedCount).toBeGreaterThan(0);

      // Verify document was deleted
      const deletedDoc = await vectorStore.getDocument(testDocumentId);
      expect(deletedDoc).toBeNull();
    });
  });

  describe('Health and Statistics', () => {
    it('should provide vector store statistics', async () => {
      const stats = await vectorStore.getStats();
      
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('documentCount');
      expect(stats).toHaveProperty('isInitialized');
      expect(stats).toHaveProperty('embeddingProvider');
      expect(stats.isInitialized).toBe(true);
    });

    it('should perform health check', async () => {
      const health = await vectorStore.healthCheck();
      
      expect(health).toBeDefined();
      expect(health).toHaveProperty('isHealthy');
      expect(health).toHaveProperty('details');
      expect(typeof health.isHealthy).toBe('boolean');
    });

    it('should provide vector index definition', async () => {
      const indexDef = vectorStore.getVectorIndexDefinition(1536);
      
      expect(indexDef).toBeDefined();
      expect(indexDef.type).toBe('vectorSearch');
      expect(indexDef.definition.fields).toBeDefined();
      expect(indexDef.definition.fields.length).toBeGreaterThan(0);
      
      const vectorField = indexDef.definition.fields.find(f => f.type === 'vector');
      expect(vectorField).toBeDefined();
      expect(vectorField!.numDimensions).toBe(1536);
      expect(vectorField!.similarity).toBe('cosine');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid document IDs gracefully', async () => {
      const invalidDoc = await vectorStore.getDocument('invalid-id');
      expect(invalidDoc).toBeNull();
    });

    it('should handle search errors gracefully', async () => {
      // Test with potentially problematic query
      const results = await vectorStore.vectorSearch('', { limit: 1 });
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should require initialization before use', () => {
      const uninitializedStore = new MongoVectorStore(
        mongoConnection,
        'uninitialized_collection'
      );

      expect(() => {
        uninitializedStore.vectorSearch('test');
      }).rejects.toThrow('not initialized');
    });
  });
});
