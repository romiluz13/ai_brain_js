/**
 * @file Test Configuration for Universal AI Brain
 * Real MongoDB Atlas and OpenAI configuration for production testing
 */

import { MongoClient, Db } from 'mongodb';
import { OpenAIEmbeddingProvider } from '../embeddings/OpenAIEmbeddingProvider';
import { VoyageAIEmbeddingProvider } from '../embeddings/VoyageAIEmbeddingProvider';

export interface TestConfig {
  mongoUri: string;
  databaseName: string;
  openaiApiKey: string;
  voyageApiKey: string;
  testTimeout: number;
  embeddingProvider: 'openai' | 'voyage';
}

export const testConfig: TestConfig = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  databaseName: process.env.DATABASE_NAME || 'universal_ai_brain_test',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  voyageApiKey: process.env.VOYAGE_API_KEY || '',
  testTimeout: 120000, // Increased timeout for real API calls
  embeddingProvider: (process.env.EMBEDDING_PROVIDER as 'openai' | 'voyage') || 'voyage' // Prefer Voyage AI as requested
};

// Global test database connection
let testDb: Db | null = null;
let testClient: MongoClient | null = null;

export async function setupTestDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (testDb && testClient) {
    return { client: testClient, db: testDb };
  }

  try {
    // Follow official MongoDB Node.js driver patterns from docs
    testClient = new MongoClient(testConfig.mongoUri, {
      // Connection pool settings (following MongoDB docs)
      maxPoolSize: 150, // Increased for better performance as per docs
      minPoolSize: 5,
      maxIdleTimeMS: 30000,

      // Timeout settings (following MongoDB docs)
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,

      // Reliability settings (following MongoDB docs)
      retryWrites: true,
      retryReads: true,

      // Atlas-specific optimizations
      compressors: ['snappy', 'zlib'],
      readPreference: 'primary',
      writeConcern: { w: 'majority', j: true }
    });

    // Explicit connection as recommended in MongoDB docs for testing
    await testClient.connect();

    // Verify connection with ping as shown in MongoDB docs
    await testClient.db('admin').command({ ping: 1 });

    testDb = testClient.db(testConfig.databaseName);

    console.log(`✅ Connected to MongoDB Atlas test database: ${testConfig.databaseName}`);
    console.log(`🔗 Connection verified with ping command`);
    return { client: testClient, db: testDb };
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB Atlas:', error);
    throw error;
  }
}

export async function cleanupTestDatabase(client?: MongoClient): Promise<void> {
  const clientToClose = client || testClient;
  const dbToClean = client ? client.db(testConfig.databaseName) : testDb;

  if (dbToClean) {
    try {
      // Clean up test collections following MongoDB best practices
      const collections = await dbToClean.listCollections().toArray();
      for (const collection of collections) {
        if (collection.name.includes('test') || collection.name.includes('temp')) {
          await dbToClean.collection(collection.name).deleteMany({});
        }
      }
      console.log('🧹 Cleaned up test collections');
    } catch (error) {
      console.warn('⚠️ Warning: Could not clean up test collections:', error);
    }
  }

  if (clientToClose) {
    try {
      // Follow MongoDB docs pattern for graceful shutdown
      await clientToClose.close();

      // Reset global variables only if using global client
      if (!client) {
        testClient = null;
        testDb = null;
      }

      console.log('✅ MongoDB Atlas connection closed gracefully');
    } catch (error) {
      console.warn('⚠️ Warning: Could not close MongoDB connection:', error);
      // Don't throw - allow tests to continue
    }
  }
}

export function createTestEmbeddingProvider(): OpenAIEmbeddingProvider | VoyageAIEmbeddingProvider {
  if (testConfig.embeddingProvider === 'voyage') {
    return new VoyageAIEmbeddingProvider({
      apiKey: testConfig.voyageApiKey,
      model: 'voyage-3', // Latest Voyage model
      dimensions: 1024
    });
  } else {
    return new OpenAIEmbeddingProvider({
      apiKey: testConfig.openaiApiKey,
      model: 'text-embedding-3-small', // Use smaller model for faster tests
      dimensions: 1536
    });
  }
}

export function createVoyageEmbeddingProvider(): VoyageAIEmbeddingProvider {
  return new VoyageAIEmbeddingProvider({
    apiKey: testConfig.voyageApiKey,
    model: 'voyage-3',
    dimensions: 1024
  });
}

export function createOpenAIEmbeddingProvider(): OpenAIEmbeddingProvider {
  return new OpenAIEmbeddingProvider({
    apiKey: testConfig.openaiApiKey,
    model: 'text-embedding-3-small',
    dimensions: 1536
  });
}

export function generateTestId(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createTestMemory() {
  return {
    id: generateTestId(),
    content: 'Test memory content for Universal AI Brain',
    metadata: {
      type: 'test' as const,
      importance: 0.8,
      confidence: 0.9,
      source: 'test_suite',
      framework: 'universal',
      sessionId: generateTestId(),
      tags: ['test', 'memory'],
      relationships: [],
      accessCount: 0,
      lastAccessed: new Date(),
      created: new Date(),
      updated: new Date()
    }
  };
}

export function createTestContext() {
  return {
    contextId: generateTestId(),
    content: 'Test context for Universal AI Brain',
    source: 'test_suite',
    relevanceScore: 0.85,
    metadata: {
      type: 'test' as const,
      framework: 'universal',
      sessionId: generateTestId(),
      userId: 'test_user',
      tags: ['test', 'context'],
      importance: 0.8,
      confidence: 0.9,
      lastUsed: new Date(),
      usageCount: 0
    },
    embedding: {
      values: Array.from({ length: 1536 }, () => Math.random() - 0.5),
      model: 'text-embedding-3-small',
      dimensions: 1536
    }
  };
}

// Test utilities for MongoDB Atlas Vector Search
export const vectorSearchTestUtils = {
  createVectorSearchIndex: async (db: Db, collectionName: string, indexName: string) => {
    try {
      // Note: Vector search indexes must be created through Atlas UI or API
      // This is a placeholder for documentation
      console.log(`📝 Vector search index '${indexName}' should be created for collection '${collectionName}'`);
      console.log('Index definition:');
      console.log(JSON.stringify({
        mappings: {
          fields: {
            'embedding.values': {
              type: 'knnVector',
              dimensions: 1536,
              similarity: 'cosine'
            }
          }
        }
      }, null, 2));
    } catch (error) {
      console.warn(`⚠️ Could not create vector search index: ${error}`);
    }
  },

  testVectorSearchQuery: (queryVector: number[]) => [
    {
      $vectorSearch: {
        index: 'memory_vector_index',
        path: 'embedding.values',
        queryVector: queryVector,
        numCandidates: 150,
        limit: 10,
        filter: { 'metadata.type': 'test' }
      }
    },
    {
      $addFields: {
        vectorScore: { $meta: 'vectorSearchScore' }
      }
    },
    {
      $match: {
        vectorScore: { $gte: 0.7 }
      }
    }
  ]
};

// Error handling utilities
export function isMongoAtlasError(error: any): boolean {
  return error?.message?.includes('$vectorSearch') || 
         error?.message?.includes('Atlas') ||
         error?.code === 40324; // Vector search not available
}

export function isOpenAIError(error: any): boolean {
  return error?.message?.includes('OpenAI') ||
         error?.status === 401 ||
         error?.status === 429;
}

export function shouldSkipTest(error?: any): boolean {
  // Skip tests if MongoDB URI is not available
  if (!testConfig.mongoUri || testConfig.mongoUri.includes('your-connection-string')) {
    console.log('⏭️ Skipping test: MongoDB URI not available');
    return true;
  }

  // Skip tests that require Atlas Vector Search if not available
  if (error && isMongoAtlasError(error)) {
    console.log('⏭️ Skipping test: MongoDB Atlas Vector Search not available');
    return true;
  }

  // Skip tests that require OpenAI if API key is invalid
  if (error && isOpenAIError(error)) {
    console.log('⏭️ Skipping test: OpenAI API not available');
    return true;
  }

  return false;
}

export function shouldSkipEmbeddingTest(): boolean {
  // Skip embedding tests if no API keys are available
  if (!hasRealApiKeys()) {
    console.log('⏭️ Skipping embedding test: No valid API keys available');
    return true;
  }
  return false;
}

export function hasRealApiKeys(): boolean {
  // Check if we have real API keys (not placeholder values)
  const hasOpenAI = testConfig.openaiApiKey &&
    testConfig.openaiApiKey.startsWith('sk-') &&
    testConfig.openaiApiKey.length > 20;

  const hasVoyage = testConfig.voyageApiKey &&
    testConfig.voyageApiKey.startsWith('pa-') &&
    testConfig.voyageApiKey.length > 20;

  console.log(`🔑 API Keys Status: OpenAI=${hasOpenAI}, Voyage=${hasVoyage}`);
  return hasOpenAI || hasVoyage;
}
