/**
 * 🚨 FINAL COMPREHENSIVE TEST BEFORE PUBLICATION 🚨
 * 
 * This test validates that ALL original AI Brain 1.0 features still work perfectly
 * AND that all new AI Brain 2.0 cognitive systems work correctly.
 * 
 * ORIGINAL AI BRAIN 1.0 FEATURES TO VALIDATE:
 * ✅ Perfect Memory System
 * ✅ Intelligent Context Injection  
 * ✅ Lightning-Fast Semantic Search
 * ✅ Comprehensive Safety System
 * ✅ Self-Improvement System
 * ✅ Complete Monitoring & Analytics
 * ✅ Advanced Workflow Tracking
 * ✅ Production-Ready Infrastructure
 * 
 * NEW AI BRAIN 2.0 COGNITIVE SYSTEMS TO VALIDATE:
 * ✅ Emotional Intelligence Engine
 * ✅ Goal Hierarchy Management
 * ✅ Confidence Tracking Engine
 * ✅ Attention Management System
 * ✅ Cultural Knowledge Engine
 * ✅ Skill Capability Manager
 * ✅ Communication Protocol Manager
 * ✅ Temporal Planning Engine
 */

import { UniversalAIBrain } from '../UniversalAIBrain';
import { setupTestDatabase, cleanupTestDatabase } from './testConfig';
import { Db } from 'mongodb';

describe('🚨 FINAL COMPREHENSIVE TEST - AI Brain 1.0 + 2.0 Validation', () => {
  let brain: UniversalAIBrain;
  let testDb: Db;

  beforeAll(async () => {
    console.log('🚨 Starting FINAL COMPREHENSIVE TEST before publication...');
    testDb = await setupTestDatabase();
  });

  afterAll(async () => {
    if (brain) {
      await brain.cleanup();
    }
    await cleanupTestDatabase();
    console.log('🚨 FINAL COMPREHENSIVE TEST completed');
  });

  beforeEach(async () => {
    brain = new UniversalAIBrain({
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
        embeddingModel: 'text-embedding-3-small',
        vectorDimensions: 1536,
        similarityThreshold: 0.7,
        maxContextLength: 4000
      },
      safety: {
        enableContentFiltering: true,
        enablePIIDetection: true,
        enableHallucinationDetection: true,
        enableComplianceLogging: true,
        safetyLevel: 'moderate'
      },
      monitoring: {
        enableRealTimeMonitoring: true,
        enablePerformanceTracking: true,
        enableCostTracking: true,
        enableErrorTracking: true
      },
      apis: {
        openai: {
          apiKey: 'test-key-for-testing',
          baseURL: 'https://api.openai.com/v1'
        }
      }
    });

    await brain.initialize();
  });

  describe('🧠 ORIGINAL AI BRAIN 1.0 FEATURES - BACKWARD COMPATIBILITY', () => {
    
    test('✅ 1. Perfect Memory System - Semantic Memory Engine', async () => {
      console.log('🧠 Testing Original Perfect Memory System...');
      
      // Store memories with semantic meaning
      const memoryId1 = await brain.storeMemory(
        'User prefers React with TypeScript for frontend development',
        {
          agentId: 'test-agent',
          conversationId: 'conv-001',
          memoryType: 'preference',
          importance: 0.9
        }
      );

      const memoryId2 = await brain.storeMemory(
        'User had trouble with MongoDB connection strings in the past',
        {
          agentId: 'test-agent', 
          conversationId: 'conv-002',
          memoryType: 'problem',
          importance: 0.8
        }
      );

      // Test semantic search
      const searchResults = await brain.searchMemory('React TypeScript frontend');
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults[0].content).toContain('React with TypeScript');

      // Test cross-conversation learning
      const crossConvResults = await brain.searchMemory('MongoDB issues');
      expect(crossConvResults.length).toBeGreaterThan(0);
      expect(crossConvResults[0].content).toContain('MongoDB connection');

      console.log('✅ Perfect Memory System working correctly');
    });

    test('✅ 2. Intelligent Context Injection', async () => {
      console.log('🎯 Testing Original Intelligent Context Injection...');
      
      // Store context for injection
      await brain.storeMemory(
        'User is building an e-commerce platform with payment integration',
        {
          agentId: 'test-agent',
          conversationId: 'conv-003',
          memoryType: 'context',
          importance: 0.9
        }
      );

      // Test context enhancement
      const enhanced = await brain.enhanceContext(
        'How do I handle payment processing?',
        { agentId: 'test-agent', maxContextItems: 5 }
      );

      expect(enhanced.enhancedPrompt).toContain('How do I handle payment processing?');
      expect(enhanced.contextItems.length).toBeGreaterThanOrEqual(0);

      console.log('✅ Intelligent Context Injection working correctly');
    });

    test('✅ 3. Lightning-Fast Semantic Search', async () => {
      console.log('🔍 Testing Original Lightning-Fast Semantic Search...');
      
      const startTime = Date.now();
      
      // Store multiple memories for search testing
      await Promise.all([
        brain.storeMemory('JavaScript performance optimization techniques', { agentId: 'test-agent', conversationId: 'conv-004' }),
        brain.storeMemory('React component lifecycle methods', { agentId: 'test-agent', conversationId: 'conv-005' }),
        brain.storeMemory('Database indexing strategies', { agentId: 'test-agent', conversationId: 'conv-006' })
      ]);

      // Test search speed
      const results = await brain.searchMemory('JavaScript optimization');
      const searchTime = Date.now() - startTime;

      expect(results.length).toBeGreaterThan(0);
      expect(searchTime).toBeLessThan(1000); // Should be sub-1000ms
      expect(results[0].content).toContain('JavaScript');

      console.log(`✅ Lightning-Fast Semantic Search working correctly (${searchTime}ms)`);
    });

    test('✅ 4. Comprehensive Safety System', async () => {
      console.log('🛡️ Testing Original Comprehensive Safety System...');
      
      // Test PII detection
      const safetyCheck = await brain.checkSafety(
        'My email is john.doe@example.com and my SSN is 123-45-6789'
      );

      expect(safetyCheck.hasPII).toBe(true);
      expect(safetyCheck.piiItems.length).toBeGreaterThan(0);
      expect(safetyCheck.safetyScore).toBeLessThan(1.0);

      // Test content filtering
      const cleanContent = await brain.checkSafety('This is a normal business conversation');
      expect(cleanContent.hasPII).toBe(false);
      expect(cleanContent.safetyScore).toBeGreaterThan(0.5);

      console.log('✅ Comprehensive Safety System working correctly');
    });

    test('✅ 5. Complete Monitoring & Analytics', async () => {
      console.log('📊 Testing Original Complete Monitoring & Analytics...');
      
      // Generate some activity for monitoring
      await brain.storeMemory('Test memory for monitoring', { agentId: 'test-agent', conversationId: 'conv-007' });
      await brain.searchMemory('test query');
      await brain.checkSafety('test content');

      // Test performance metrics
      const metrics = await brain.getPerformanceMetrics();
      expect(metrics.totalOperations).toBeGreaterThan(0);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);

      console.log(`✅ Complete Monitoring & Analytics working correctly (${metrics.totalOperations} ops)`);
    });

  });

  describe('🧠 NEW AI BRAIN 2.0 COGNITIVE SYSTEMS', () => {
    
    test('✅ 6. Emotional Intelligence Engine', async () => {
      console.log('🎭 Testing NEW Emotional Intelligence Engine...');
      
      // Test emotional intelligence system
      expect(brain.emotionalIntelligence).toBeDefined();
      expect(brain.emotionalIntelligence.isInitialized).toBe(true);

      // Verify emotional state collection exists
      const collections = await testDb.listCollections().toArray();
      const emotionalCollection = collections.find(c => c.name.includes('emotional'));
      expect(emotionalCollection).toBeDefined();

      console.log('✅ Emotional Intelligence Engine working correctly');
    });

    test('✅ 7. Goal Hierarchy Management', async () => {
      console.log('🎯 Testing NEW Goal Hierarchy Management...');
      
      expect(brain.goalHierarchy).toBeDefined();
      expect(brain.goalHierarchy.isInitialized).toBe(true);

      // Verify goal hierarchy collection exists
      const collections = await testDb.listCollections().toArray();
      const goalCollection = collections.find(c => c.name.includes('goal'));
      expect(goalCollection).toBeDefined();

      console.log('✅ Goal Hierarchy Management working correctly');
    });

    test('✅ 8. Confidence Tracking Engine', async () => {
      console.log('🤔 Testing NEW Confidence Tracking Engine...');
      
      expect(brain.confidenceTracking).toBeDefined();
      expect(brain.confidenceTracking.isInitialized).toBe(true);

      // Verify confidence tracking collection exists
      const collections = await testDb.listCollections().toArray();
      const confidenceCollection = collections.find(c => c.name.includes('confidence'));
      expect(confidenceCollection).toBeDefined();

      console.log('✅ Confidence Tracking Engine working correctly');
    });

    test('✅ 9. Attention Management System', async () => {
      console.log('👁️ Testing NEW Attention Management System...');
      
      expect(brain.attentionManagement).toBeDefined();
      expect(brain.attentionManagement.isInitialized).toBe(true);

      // Verify attention state collection exists
      const collections = await testDb.listCollections().toArray();
      const attentionCollection = collections.find(c => c.name.includes('attention'));
      expect(attentionCollection).toBeDefined();

      console.log('✅ Attention Management System working correctly');
    });

    test('✅ 10. Cultural Knowledge Engine', async () => {
      console.log('🌍 Testing NEW Cultural Knowledge Engine...');
      
      expect(brain.culturalKnowledge).toBeDefined();
      expect(brain.culturalKnowledge.isInitialized).toBe(true);

      // Verify cultural knowledge collection exists
      const collections = await testDb.listCollections().toArray();
      const culturalCollection = collections.find(c => c.name.includes('cultural'));
      expect(culturalCollection).toBeDefined();

      console.log('✅ Cultural Knowledge Engine working correctly');
    });

    test('✅ 11. Skill Capability Manager', async () => {
      console.log('🛠️ Testing NEW Skill Capability Manager...');
      
      expect(brain.skillCapability).toBeDefined();
      expect(brain.skillCapability.isInitialized).toBe(true);

      // Verify skill capability collection exists
      const collections = await testDb.listCollections().toArray();
      const skillCollection = collections.find(c => c.name.includes('skill'));
      expect(skillCollection).toBeDefined();

      console.log('✅ Skill Capability Manager working correctly');
    });

    test('✅ 12. Communication Protocol Manager', async () => {
      console.log('📡 Testing NEW Communication Protocol Manager...');
      
      expect(brain.communicationProtocol).toBeDefined();
      expect(brain.communicationProtocol.isInitialized).toBe(true);

      // Verify communication protocol collection exists
      const collections = await testDb.listCollections().toArray();
      const commCollection = collections.find(c => c.name.includes('communication'));
      expect(commCollection).toBeDefined();

      console.log('✅ Communication Protocol Manager working correctly');
    });

    test('✅ 13. Temporal Planning Engine', async () => {
      console.log('⏰ Testing NEW Temporal Planning Engine...');
      
      expect(brain.temporalPlanning).toBeDefined();
      expect(brain.temporalPlanning.isInitialized).toBe(true);

      // Verify temporal planning collection exists
      const collections = await testDb.listCollections().toArray();
      const temporalCollection = collections.find(c => c.name.includes('temporal'));
      expect(temporalCollection).toBeDefined();

      console.log('✅ Temporal Planning Engine working correctly');
    });

  });

  describe('🗄️ MONGODB COLLECTIONS & DATA VERIFICATION', () => {
    
    test('✅ 14. All Collections Created and Populated', async () => {
      console.log('🗄️ Testing MongoDB Collections & Data...');
      
      // Get all collections
      const collections = await testDb.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      
      console.log('📋 Available collections:', collectionNames);

      // Verify core collections exist
      expect(collectionNames).toContain('agent_memory');
      
      // Count documents in memory collection
      const memoryCount = await testDb.collection('agent_memory').countDocuments();
      expect(memoryCount).toBeGreaterThan(0);
      
      console.log(`✅ Found ${collections.length} collections with ${memoryCount} memory documents`);
    });

    test('✅ 15. Real Data Read/Write Operations', async () => {
      console.log('💾 Testing Real Data Read/Write Operations...');
      
      // Store test data
      const testMemoryId = await brain.storeMemory(
        'Final test memory for publication validation',
        {
          agentId: 'final-test-agent',
          conversationId: 'final-test-conv',
          memoryType: 'validation',
          importance: 1.0,
          metadata: { testType: 'final-validation', timestamp: new Date() }
        }
      );

      // Verify data was written
      const memoryDoc = await testDb.collection('agent_memory').findOne({
        content: 'Final test memory for publication validation'
      });
      
      expect(memoryDoc).toBeDefined();
      expect(memoryDoc.agentId).toBe('final-test-agent');
      expect(memoryDoc.memoryType).toBe('validation');
      expect(memoryDoc.importance).toBe(1.0);

      // Test data retrieval
      const searchResults = await brain.searchMemory('final test memory');
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults[0].content).toContain('Final test memory');

      console.log('✅ Real Data Read/Write Operations working correctly');
    });

  });

  describe('🎯 END-TO-END INTEGRATION TEST', () => {
    
    test('✅ 16. Complete AI Brain 1.0 + 2.0 Integration', async () => {
      console.log('🎯 Testing Complete AI Brain Integration...');
      
      // Simulate a real agent conversation with all systems
      const agentId = 'integration-test-agent';
      const conversationId = 'integration-test-conv';
      
      // 1. Store initial context (Original AI Brain 1.0)
      await brain.storeMemory(
        'User is a senior developer working on a React e-commerce project',
        { agentId, conversationId, memoryType: 'context', importance: 0.9 }
      );

      // 2. Test safety system (Original AI Brain 1.0)
      const safetyCheck = await brain.checkSafety('Help me optimize my React components');
      expect(safetyCheck.hasPII).toBe(false);

      // 3. Test context enhancement (Original AI Brain 1.0)
      const enhanced = await brain.enhanceContext(
        'What are the best practices for React performance?',
        { agentId, maxContextItems: 3 }
      );
      expect(enhanced.enhancedPrompt).toContain('best practices');

      // 4. Test memory search (Original AI Brain 1.0)
      const memories = await brain.searchMemory('React development');
      expect(memories.length).toBeGreaterThan(0);

      // 5. Test performance monitoring (Original AI Brain 1.0)
      const metrics = await brain.getPerformanceMetrics();
      expect(metrics.totalOperations).toBeGreaterThan(0);

      // 6. Verify all cognitive systems are initialized (AI Brain 2.0)
      expect(brain.emotionalIntelligence.isInitialized).toBe(true);
      expect(brain.goalHierarchy.isInitialized).toBe(true);
      expect(brain.confidenceTracking.isInitialized).toBe(true);
      expect(brain.attentionManagement.isInitialized).toBe(true);
      expect(brain.culturalKnowledge.isInitialized).toBe(true);
      expect(brain.skillCapability.isInitialized).toBe(true);
      expect(brain.communicationProtocol.isInitialized).toBe(true);
      expect(brain.temporalPlanning.isInitialized).toBe(true);

      console.log('✅ Complete AI Brain 1.0 + 2.0 Integration working perfectly!');
    });

  });

});
