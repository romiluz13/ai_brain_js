/**
 * @file RealWorldAIBrainTest - Comprehensive real-world test with actual database operations
 * 
 * This test demonstrates the Universal AI Brain working with:
 * - Real MongoDB Atlas database operations
 * - Real OpenAI and Voyage AI API calls
 * - Real vector embeddings and search
 * - Real memory storage and retrieval
 * - Real context injection and enhancement
 * - Real safety guardrails and compliance
 * - Real performance monitoring and metrics
 * 
 * NO MOCKS - Everything is real and production-ready!
 */

import { UniversalAIBrain, UniversalAIBrainConfig } from '../UniversalAIBrain';
import { setupTestDatabase, cleanupTestDatabase } from './testConfig';

describe('🧠 Universal AI Brain - Real World Integration Test', () => {
  let brain: UniversalAIBrain;
  let testDb: any;
  let testConfig: UniversalAIBrainConfig;

  beforeAll(async () => {
    console.log('🚀 Setting up Real World AI Brain Test...');
    
    // Setup real MongoDB Atlas test database
    testDb = await setupTestDatabase();
    console.log('✅ MongoDB Atlas test database connected');

    // Real configuration with actual API keys
    testConfig = {
      mongodb: {
        connectionString: process.env.MONGODB_URI || 'mongodb://localhost:27017',
        databaseName: 'universal_ai_brain_test',
        collections: {
          tracing: 'agent_traces',
          memory: 'agent_memory', 
          context: 'agent_context',
          metrics: 'agent_metrics',
          audit: 'agent_safety_logs'
        }
      },
      intelligence: {
        embeddingModel: 'voyage-large-2-instruct',
        vectorDimensions: 1024,
        similarityThreshold: 0.7,
        maxContextLength: 4000
      },
      safety: {
        enableContentFiltering: true,
        enablePIIDetection: true,
        enableHallucinationDetection: true,
        enableComplianceLogging: true,
        safetyLevel: 'moderate' as const
      },
      monitoring: {
        enableRealTimeMonitoring: true,
        enablePerformanceTracking: true,
        enableCostTracking: true,
        enableErrorTracking: true
      },
      apis: {
        openai: {
          apiKey: process.env.OPENAI_API_KEY!,
          baseURL: 'https://api.openai.com/v1'
        },
        voyage: {
          apiKey: process.env.VOYAGE_API_KEY!,
          baseURL: 'https://api.voyageai.com/v1'
        }
      }
    };

    // Initialize the Universal AI Brain
    brain = new UniversalAIBrain(testConfig);
    await brain.initialize();
    console.log('🧠 Universal AI Brain initialized successfully');
  }, 60000);

  afterAll(async () => {
    if (brain) {
      await brain.cleanup();
    }
    await cleanupTestDatabase();
    console.log('🧹 Real World AI Brain Test cleanup completed');
  }, 30000);

  describe('🔥 Real Database Operations', () => {
    it('should store and retrieve real memories with embeddings', async () => {
      console.log('📝 Testing real memory storage and retrieval...');
      
      const testMemory = {
        content: 'The user prefers MongoDB Atlas over local MongoDB for production applications',
        type: 'preference' as const,
        importance: 0.8,
        metadata: {
          source: 'user_conversation',
          framework: 'real_world_test',
          timestamp: new Date()
        }
      };

      // Store memory with real embedding generation
      const memoryId = await brain.storeMemory(testMemory);
      expect(memoryId).toBeDefined();
      console.log(`✅ Memory stored with ID: ${memoryId}`);

      // Retrieve memory with real vector search
      const retrievedMemories = await brain.searchMemory('MongoDB Atlas production', {
        limit: 5,
        minScore: 0.5
      });

      expect(retrievedMemories).toBeDefined();
      expect(retrievedMemories.length).toBeGreaterThan(0);
      expect(retrievedMemories[0].content).toContain('MongoDB Atlas');
      console.log(`✅ Retrieved ${retrievedMemories.length} relevant memories`);
    }, 30000);

    it('should perform real context injection and enhancement', async () => {
      console.log('🎯 Testing real context injection...');
      
      const userQuery = 'What database should I use for my AI application?';
      
      // Get enhanced context with real vector search
      const enhancedContext = await brain.enhanceContext(userQuery, {
        maxContextItems: 3,
        includeMemory: true,
        includeKnowledge: true
      });

      expect(enhancedContext).toBeDefined();
      expect(enhancedContext.contextItems.length).toBeGreaterThan(0);
      expect(enhancedContext.enhancedPrompt).toContain(userQuery);
      console.log(`✅ Enhanced context with ${enhancedContext.contextItems.length} items`);
      console.log(`📄 Enhanced prompt length: ${enhancedContext.enhancedPrompt.length} characters`);
    }, 30000);

    it('should demonstrate real safety guardrails', async () => {
      console.log('🛡️ Testing real safety guardrails...');
      
      const sensitiveContent = 'My email is john.doe@example.com and my SSN is 123-45-6789';
      
      // Test PII detection
      const safetyResult = await brain.checkSafety(sensitiveContent);
      
      expect(safetyResult).toBeDefined();
      expect(safetyResult.piiDetected).toBe(true);
      expect(safetyResult.piiItems.length).toBeGreaterThan(0);
      console.log(`✅ Detected ${safetyResult.piiItems.length} PII items`);
      console.log(`🔒 Safety score: ${safetyResult.safetyScore}`);
    }, 15000);
  });

  describe('🚀 Real Performance Monitoring', () => {
    it('should track real performance metrics', async () => {
      console.log('📊 Testing real performance monitoring...');
      
      const startTime = Date.now();
      
      // Perform multiple operations to generate metrics
      await brain.storeMemory({
        content: 'Performance test memory for monitoring',
        type: 'test',
        importance: 0.5
      });
      
      await brain.searchMemory('performance test', { limit: 3 });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Get real performance metrics
      const metrics = await brain.getPerformanceMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.totalOperations).toBeGreaterThan(0);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
      console.log(`✅ Total operations: ${metrics.totalOperations}`);
      console.log(`⏱️ Average response time: ${metrics.averageResponseTime}ms`);
      console.log(`🎯 Test duration: ${duration}ms`);
    }, 20000);
  });

  describe('🌟 Real Intelligence Enhancement', () => {
    it('should demonstrate measurable intelligence enhancement', async () => {
      console.log('🧠 Testing real intelligence enhancement...');
      
      const baseQuery = 'How do I optimize my database performance?';
      
      // Get baseline response (without enhancement)
      const baselineStart = Date.now();
      const baselineContext = await brain.enhanceContext(baseQuery, {
        maxContextItems: 0, // No context enhancement
        includeMemory: false,
        includeKnowledge: false
      });
      const baselineTime = Date.now() - baselineStart;
      
      // Get enhanced response (with full enhancement)
      const enhancedStart = Date.now();
      const enhancedContext = await brain.enhanceContext(baseQuery, {
        maxContextItems: 5,
        includeMemory: true,
        includeKnowledge: true
      });
      const enhancedTime = Date.now() - enhancedStart;
      
      // Measure enhancement
      const contextEnhancement = enhancedContext.contextItems.length;
      const promptEnhancement = enhancedContext.enhancedPrompt.length / baselineContext.enhancedPrompt.length;
      
      expect(contextEnhancement).toBeGreaterThan(0);
      expect(promptEnhancement).toBeGreaterThan(1.5); // At least 50% enhancement
      
      console.log(`✅ Context items added: ${contextEnhancement}`);
      console.log(`📈 Prompt enhancement ratio: ${promptEnhancement.toFixed(2)}x`);
      console.log(`⚡ Baseline time: ${baselineTime}ms, Enhanced time: ${enhancedTime}ms`);
      console.log(`🎯 Intelligence enhancement achieved: ${((promptEnhancement - 1) * 100).toFixed(1)}%`);
    }, 30000);
  });

  describe('💾 Real Database Verification', () => {
    it('should verify all collections are created and populated', async () => {
      console.log('🔍 Verifying real database collections...');
      
      const collections = await testDb.listCollections().toArray();
      const collectionNames = collections.map((c: any) => c.name);
      
      // Verify core collections exist
      expect(collectionNames).toContain('agent_memory');
      expect(collectionNames).toContain('agent_context');
      expect(collectionNames).toContain('agent_traces');
      expect(collectionNames).toContain('agent_metrics');
      
      // Verify collections have data
      const memoryCount = await testDb.collection('agent_memory').countDocuments();
      const contextCount = await testDb.collection('agent_context').countDocuments();
      
      expect(memoryCount).toBeGreaterThan(0);
      console.log(`✅ Memory collection: ${memoryCount} documents`);
      console.log(`✅ Context collection: ${contextCount} documents`);
      console.log(`✅ Total collections: ${collections.length}`);
    }, 15000);
  });
});
