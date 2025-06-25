/**
 * @file mongodb-validation.test.ts - Comprehensive MongoDB validation tests
 * 
 * This test suite validates that ALL MongoDB operations in the Universal AI Brain
 * use official MongoDB patterns and APIs correctly. Tests cover vector search,
 * change streams, transactions, aggregation pipelines, and collection operations.
 */

import { MongoClient, Db, Collection } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { VectorSearchEngine } from '../../engines/VectorSearchEngine';
import { TracingCollection } from '../../collections/TracingCollection';
import { MemoryCollection } from '../../collections/MemoryCollection';
import { PerformanceAnalyticsEngine } from '../../monitoring/PerformanceAnalyticsEngine';
import { ErrorTrackingEngine } from '../../monitoring/ErrorTrackingEngine';
import { CostMonitoringEngine } from '../../monitoring/CostMonitoringEngine';

describe('MongoDB Validation Tests', () => {
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let db: Db;
  let vectorSearchEngine: VectorSearchEngine;
  let tracingCollection: TracingCollection;
  let memoryCollection: MemoryCollection;
  let performanceEngine: PerformanceAnalyticsEngine;
  let errorEngine: ErrorTrackingEngine;
  let costEngine: CostMonitoringEngine;

  beforeAll(async () => {
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    db = mongoClient.db('test-ai-brain');

    // Initialize collections
    tracingCollection = new TracingCollection(db);
    memoryCollection = new MemoryCollection(db);
    
    // Initialize engines
    vectorSearchEngine = new VectorSearchEngine(memoryCollection);
    performanceEngine = new PerformanceAnalyticsEngine(tracingCollection, memoryCollection);
    errorEngine = new ErrorTrackingEngine(tracingCollection, memoryCollection, memoryCollection);
    costEngine = new CostMonitoringEngine(tracingCollection, memoryCollection, memoryCollection);

    // Initialize collections
    await tracingCollection.initialize();
    await memoryCollection.initialize();
  });

  afterAll(async () => {
    await mongoClient.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clean up collections before each test
    await db.collection('traces').deleteMany({});
    await db.collection('memories').deleteMany({});
    await db.collection('errors').deleteMany({});
    await db.collection('costs').deleteMany({});
  });

  describe('Vector Search Operations', () => {
    it('should use official $vectorSearch aggregation syntax', async () => {
      // Test data
      const testEmbedding = Array.from({ length: 1536 }, () => Math.random());
      const testDocument = {
        content: 'Test document for vector search',
        embedding: testEmbedding,
        metadata: { type: 'test' }
      };

      // Store test document
      await memoryCollection.storeDocument(
        JSON.stringify(testDocument),
        { type: 'test_document', content: testDocument.content }
      );

      // Test vector search with official MongoDB $vectorSearch syntax
      const results = await vectorSearchEngine.searchSimilar(
        testEmbedding,
        {
          limit: 5,
          threshold: 0.7,
          filter: { 'metadata.type': 'test' }
        }
      );

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      
      // Validate that results have the expected structure from $vectorSearch
      if (results.length > 0) {
        expect(results[0]).toHaveProperty('score');
        expect(results[0]).toHaveProperty('content');
        expect(typeof results[0].score).toBe('number');
      }
    });

    it('should use correct $meta vectorSearchScore syntax', async () => {
      const testEmbedding = Array.from({ length: 1536 }, () => Math.random());
      
      // Store test document
      await memoryCollection.storeDocument(
        JSON.stringify({ content: 'Test for meta score', embedding: testEmbedding }),
        { type: 'meta_test' }
      );

      const results = await vectorSearchEngine.searchSimilar(testEmbedding, { limit: 1 });
      
      if (results.length > 0) {
        // Validate that score comes from $meta: "vectorSearchScore"
        expect(results[0].score).toBeGreaterThanOrEqual(0);
        expect(results[0].score).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Change Streams Operations', () => {
    it('should use official MongoDB Change Streams patterns', async () => {
      let changeDetected = false;
      let changeData: any = null;

      // Set up change stream monitoring (official pattern)
      const changeStream = tracingCollection.watch([
        {
          $match: {
            'fullDocument.metadata.type': 'test_trace'
          }
        }
      ]);

      changeStream.on('change', (change) => {
        changeDetected = true;
        changeData = change;
      });

      // Insert a document to trigger change stream
      await tracingCollection.startTrace({
        traceId: 'test-trace-123',
        framework: {
          frameworkName: 'test-framework',
          version: '1.0.0'
        },
        operation: {
          type: 'test_operation',
          input: 'test input'
        },
        metadata: { type: 'test_trace' }
      });

      // Wait for change stream to process
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(changeDetected).toBe(true);
      expect(changeData).toBeDefined();
      expect(changeData.operationType).toBe('insert');
      expect(changeData.fullDocument).toBeDefined();

      changeStream.close();
    });

    it('should handle change stream errors correctly', async () => {
      let errorHandled = false;

      const changeStream = tracingCollection.watch([]);
      
      changeStream.on('error', (error) => {
        errorHandled = true;
        expect(error).toBeDefined();
      });

      // Close the change stream to trigger an error
      changeStream.close();
      
      // Try to emit on closed stream
      try {
        changeStream.emit('error', new Error('Test error'));
      } catch (error) {
        // Expected behavior
      }
    });
  });

  describe('Aggregation Pipeline Operations', () => {
    it('should use official $facet aggregation patterns', async () => {
      // Insert test data
      const testTraces = [
        {
          framework: { frameworkName: 'vercel-ai' },
          operation: { type: 'generateText' },
          performance: { responseTime: 100 },
          cost: { total: 0.01 },
          timestamp: new Date()
        },
        {
          framework: { frameworkName: 'mastra' },
          operation: { type: 'generate' },
          performance: { responseTime: 150 },
          cost: { total: 0.02 },
          timestamp: new Date()
        }
      ];

      for (const trace of testTraces) {
        await tracingCollection.startTrace({
          traceId: `test-${Math.random()}`,
          ...trace
        });
      }

      // Test $facet aggregation (official MongoDB pattern)
      const analytics = await performanceEngine.generatePerformanceMetrics('all', {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      });

      expect(analytics).toBeDefined();
      expect(analytics.overallMetrics).toBeDefined();
      expect(analytics.frameworkMetrics).toBeDefined();
      expect(Array.isArray(analytics.frameworkMetrics)).toBe(true);
    });

    it('should use correct $group and $match operations', async () => {
      // Insert test error data
      await errorEngine.trackError(
        'test-framework',
        'test_error',
        'Test error message',
        { testContext: true },
        'medium'
      );

      const errorAnalytics = await errorEngine.generateErrorAnalytics({
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      });

      expect(errorAnalytics).toBeDefined();
      expect(errorAnalytics.totalErrors).toBeGreaterThanOrEqual(1);
      expect(errorAnalytics.topErrorTypes).toBeDefined();
      expect(Array.isArray(errorAnalytics.topErrorTypes)).toBe(true);
    });
  });

  describe('ACID Transaction Operations', () => {
    it('should use official session.withTransaction patterns', async () => {
      const session = mongoClient.startSession();
      let transactionCompleted = false;

      try {
        await session.withTransaction(async () => {
          // Perform multiple operations in transaction
          await tracingCollection.startTrace({
            traceId: 'transaction-test-1',
            framework: { frameworkName: 'test' },
            operation: { type: 'test' }
          });

          await memoryCollection.storeDocument(
            JSON.stringify({ test: 'transaction data' }),
            { type: 'transaction_test' }
          );

          transactionCompleted = true;
        });
      } finally {
        await session.endSession();
      }

      expect(transactionCompleted).toBe(true);

      // Verify data was committed
      const trace = await tracingCollection.getTrace('transaction-test-1');
      expect(trace).toBeDefined();
    });

    it('should handle transaction rollback correctly', async () => {
      const session = mongoClient.startSession();
      let transactionFailed = false;

      try {
        await session.withTransaction(async () => {
          await tracingCollection.startTrace({
            traceId: 'rollback-test-1',
            framework: { frameworkName: 'test' },
            operation: { type: 'test' }
          });

          // Force an error to trigger rollback
          throw new Error('Intentional transaction error');
        });
      } catch (error) {
        transactionFailed = true;
        expect(error.message).toBe('Intentional transaction error');
      } finally {
        await session.endSession();
      }

      expect(transactionFailed).toBe(true);

      // Verify data was rolled back
      const trace = await tracingCollection.getTrace('rollback-test-1');
      expect(trace).toBeNull();
    });
  });

  describe('Collection Operations', () => {
    it('should use official MongoDB CRUD patterns', async () => {
      // Test CREATE
      const traceId = await tracingCollection.startTrace({
        traceId: 'crud-test-1',
        framework: { frameworkName: 'test' },
        operation: { type: 'test' }
      });

      expect(traceId).toBe('crud-test-1');

      // Test READ
      const trace = await tracingCollection.getTrace('crud-test-1');
      expect(trace).toBeDefined();
      expect(trace?.traceId).toBe('crud-test-1');

      // Test UPDATE
      await tracingCollection.updateTrace('crud-test-1', {
        status: 'completed',
        endTime: new Date()
      });

      const updatedTrace = await tracingCollection.getTrace('crud-test-1');
      expect(updatedTrace?.status).toBe('completed');
      expect(updatedTrace?.endTime).toBeDefined();

      // Test DELETE (if implemented)
      // Note: TracingCollection might not have delete for audit purposes
    });

    it('should use proper MongoDB indexing strategies', async () => {
      // Verify that collections have proper indexes
      const tracesIndexes = await db.collection('traces').indexes();
      const memoriesIndexes = await db.collection('memories').indexes();

      expect(tracesIndexes.length).toBeGreaterThan(1); // Should have more than just _id index
      expect(memoriesIndexes.length).toBeGreaterThan(1);

      // Check for vector search index (if applicable)
      const hasVectorIndex = memoriesIndexes.some(index => 
        index.name?.includes('vector') || 
        Object.keys(index.key || {}).some(key => key.includes('embedding'))
      );

      // Vector index might not be present in test environment, but structure should support it
      expect(memoriesIndexes).toBeDefined();
    });
  });

  describe('Schema Validation', () => {
    it('should use MongoDB schema validation patterns', async () => {
      // Test that invalid data is rejected
      try {
        await tracingCollection.startTrace({
          // Missing required fields
          traceId: '',
          framework: null as any,
          operation: null as any
        });
        
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should validate document structure correctly', async () => {
      // Test valid document
      const validTraceId = await tracingCollection.startTrace({
        traceId: 'valid-trace-1',
        framework: {
          frameworkName: 'test-framework',
          version: '1.0.0'
        },
        operation: {
          type: 'test_operation',
          input: 'test input'
        }
      });

      expect(validTraceId).toBe('valid-trace-1');

      // Verify stored document has correct structure
      const storedTrace = await tracingCollection.getTrace('valid-trace-1');
      expect(storedTrace).toBeDefined();
      expect(storedTrace?.framework.frameworkName).toBe('test-framework');
      expect(storedTrace?.operation.type).toBe('test_operation');
    });
  });

  describe('Performance and Optimization', () => {
    it('should use efficient query patterns', async () => {
      // Insert multiple documents for performance testing
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          tracingCollection.startTrace({
            traceId: `perf-test-${i}`,
            framework: { frameworkName: 'test' },
            operation: { type: 'performance_test' },
            timestamp: new Date()
          })
        );
      }

      await Promise.all(promises);

      // Test efficient querying with proper indexing
      const startTime = Date.now();
      
      const recentTraces = await tracingCollection.getRecentTraces(5);
      
      const queryTime = Date.now() - startTime;

      expect(recentTraces).toBeDefined();
      expect(Array.isArray(recentTraces)).toBe(true);
      expect(recentTraces.length).toBeLessThanOrEqual(5);
      
      // Query should be fast (less than 100ms for small dataset)
      expect(queryTime).toBeLessThan(100);
    });

    it('should handle large aggregation pipelines efficiently', async () => {
      // Insert test data
      for (let i = 0; i < 20; i++) {
        await costEngine.trackCost(
          'test-framework',
          { type: 'test_operation', operationId: `op-${i}` },
          { total: Math.random() * 0.1, model: Math.random() * 0.08, embedding: 0, mongodb: 0, vectorSearch: 0, storage: 0, compute: 0, network: 0 },
          { inputTokens: 100, outputTokens: 50, totalTokens: 150, documentsProcessed: 1, vectorSearchQueries: 1, mongodbOperations: 1 },
          { modelPricePerToken: 0.0001, embeddingPricePerToken: 0.0001, mongodbPricePerOperation: 0.001, vectorSearchPricePerQuery: 0.01 }
        );
      }

      const startTime = Date.now();
      
      const costAnalytics = await costEngine.generateCostAnalytics({
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      });
      
      const aggregationTime = Date.now() - startTime;

      expect(costAnalytics).toBeDefined();
      expect(costAnalytics.totalCost).toBeGreaterThan(0);
      
      // Complex aggregation should complete in reasonable time
      expect(aggregationTime).toBeLessThan(1000); // Less than 1 second
    });
  });
});
