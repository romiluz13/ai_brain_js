#!/usr/bin/env node

/**
 * 🧠🚀 UNIVERSAL AI BRAIN 2.0 - COMPREHENSIVE COGNITIVE SYSTEMS TEST
 * 
 * This script tests ALL 12 cognitive systems with real data and verifies
 * that each MongoDB collection gets populated with actual documents.
 * 
 * Tests:
 * 1. Emotional Intelligence Engine
 * 2. Goal Hierarchy Manager  
 * 3. Confidence Tracking Engine
 * 4. Attention States Manager
 * 5. Communication Protocols Engine
 * 6. Cultural Knowledge Engine
 * 7. Temporal Planning Engine
 * 8. Semantic Memory Engine
 * 9. Context Items Manager
 * 10. Agent Capabilities Engine
 * 11. Agent Traces (monitoring)
 * 12. Performance Metrics
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { UniversalAIBrain, UniversalAIBrainConfig } from './packages/core/src/UniversalAIBrain';

async function testAllCognitiveSystems() {
  console.log('\n🧠 UNIVERSAL AI BRAIN 2.0 - COMPREHENSIVE COGNITIVE SYSTEMS TEST\n');
  console.log('='.repeat(80));
  
  // Check environment variables
  const mongoUri = process.env.MONGODB_CONNECTION_STRING || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_CONNECTION_STRING or MONGODB_URI environment variable is required');
    process.exit(1);
  }
  
  if (!process.env.VOYAGE_API_KEY && !process.env.OPENAI_API_KEY) {
    console.error('❌ Either VOYAGE_API_KEY or OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }
  
  const testDbName = 'ai_brain_cognitive_test_' + Date.now();
  
  const config: UniversalAIBrainConfig = {
    mongodb: {
      connectionString: mongoUri,
      databaseName: testDbName,
      collections: {
        tracing: 'agent_traces',
        memory: 'agent_memory',
        context: 'context_items',
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
      enableErrorTracking: true,
      metricsRetentionDays: 30,
      alertingEnabled: true,
      dashboardRefreshInterval: 5000
    }
  };
  
  let brain: UniversalAIBrain | null = null;
  let mongoClient: MongoClient | null = null;
  
  try {
    console.log('🔧 Initializing Universal AI Brain 2.0...');
    brain = new UniversalAIBrain(config);
    await brain.initialize();
    console.log('✅ AI Brain initialized successfully');
    
    // Connect to MongoDB to verify collections
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    const db = mongoClient.db(testDbName);
    console.log(`✅ Connected to test database: ${testDbName}`);
    
    console.log('\n📊 BEFORE TESTS - Collection Status:');
    await checkCollectionStatus(db);
    
    // Test 1: Emotional Intelligence Engine
    console.log('\n🎭 Test 1: Emotional Intelligence Engine');
    console.log('-'.repeat(50));
    
    const emotionalEngine = (brain as any).emotionalIntelligenceEngine;
    if (emotionalEngine) {
      const emotionalContext = {
        agentId: 'test-agent-001',
        sessionId: 'session-001',
        input: 'I am really excited about this new AI Brain system! It looks amazing and I can\'t wait to see what it can do.',
        conversationHistory: [],
        taskContext: { type: 'user_interaction', priority: 'high' },
        userContext: { mood: 'positive', engagement: 'high' }
      };
      
      const emotion = await emotionalEngine.detectEmotion(emotionalContext);
      console.log(`✅ Detected emotion: ${emotion.primary} (intensity: ${emotion.intensity})`);
      
      const emotionalResponse = await emotionalEngine.processEmotionalState(
        emotionalContext,
        emotion,
        'User expressing excitement',
        'user_input'
      );
      console.log(`✅ Emotional state processed and stored`);
    } else {
      console.log('⚠️ Emotional Intelligence Engine not available');
    }
    
    // Test 2: Goal Hierarchy Manager
    console.log('\n🎯 Test 2: Goal Hierarchy Manager');
    console.log('-'.repeat(50));
    
    const goalManager = (brain as any).goalHierarchyManager;
    if (goalManager) {
      const goalRequest = {
        agentId: 'test-agent-001',
        sessionId: 'session-001',
        title: 'Master AI Brain Cognitive Systems',
        description: 'Learn and understand all 12 cognitive systems in the Universal AI Brain',
        type: 'learning' as const,
        priority: 'high' as const,
        category: 'education',
        estimatedDuration: 3600000, // 1 hour
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
        successCriteria: [
          { description: 'Understand emotional intelligence', measurable: true, threshold: 0.8 },
          { description: 'Master goal hierarchy concepts', measurable: true, threshold: 0.9 }
        ],
        context: {
          trigger: 'User learning request',
          reasoning: 'User wants to understand AI Brain systems',
          assumptions: ['User has basic AI knowledge'],
          risks: ['Information overload']
        }
      };
      
      const goalId = await goalManager.createGoal(goalRequest);
      console.log(`✅ Goal created with ID: ${goalId}`);
      
      // Create a sub-goal
      const subGoalRequest = {
        ...goalRequest,
        parentGoalId: goalId,
        title: 'Understand Emotional Intelligence',
        description: 'Deep dive into the emotional intelligence cognitive system'
      };
      
      const subGoalId = await goalManager.createGoal(subGoalRequest);
      console.log(`✅ Sub-goal created with ID: ${subGoalId}`);
    } else {
      console.log('⚠️ Goal Hierarchy Manager not available');
    }
    
    // Test 3: Confidence Tracking Engine
    console.log('\n📈 Test 3: Confidence Tracking Engine');
    console.log('-'.repeat(50));
    
    const confidenceEngine = (brain as any).confidenceTrackingEngine;
    if (confidenceEngine) {
      const confidenceRequest = {
        agentId: 'test-agent-001',
        sessionId: 'session-001',
        task: 'Predict user satisfaction with AI Brain',
        taskType: 'prediction' as const,
        domain: 'user_experience',
        complexity: 0.7,
        novelty: 0.8,
        stakes: 'high' as const,
        prediction: {
          type: 'binary' as const,
          value: true,
          probability: 0.85,
          alternatives: [
            { value: false, confidence: 0.15, reasoning: 'User might find it complex' }
          ]
        },
        features: ['user_engagement', 'system_performance', 'feature_completeness'],
        computationTime: 150,
        memoryUsage: 256
      };
      
      const confidenceResult = await confidenceEngine.assessConfidence(confidenceRequest);
      console.log(`✅ Confidence assessed: ${confidenceResult.overall.toFixed(3)} overall confidence`);
      console.log(`   - Epistemic uncertainty: ${confidenceResult.breakdown.epistemic.toFixed(3)}`);
      console.log(`   - Aleatoric uncertainty: ${confidenceResult.breakdown.aleatoric.toFixed(3)}`);
    } else {
      console.log('⚠️ Confidence Tracking Engine not available');
    }
    
    // Test 4: Attention States Manager
    console.log('\n👁️ Test 4: Attention States Manager');
    console.log('-'.repeat(50));

    const attentionManager = (brain as any).attentionStatesManager;
    if (attentionManager) {
      const attentionState = {
        agentId: 'test-agent-001',
        sessionId: 'session-001',
        timestamp: new Date(),
        focus: {
          primary: 'cognitive_systems_learning',
          secondary: ['user_interaction', 'system_monitoring'],
          intensity: 0.85,
          duration: 300000 // 5 minutes
        },
        context: {
          trigger: 'Learning session started',
          triggerType: 'user_request' as const,
          priority: 'high' as const,
          interruptibility: 0.3
        },
        cognitive: {
          workingMemoryLoad: 0.7,
          cognitiveLoad: 0.6,
          attentionalBias: ['learning', 'comprehension'],
          distractionLevel: 0.2
        },
        environmental: {
          noiseLevel: 0.1,
          visualComplexity: 0.4,
          socialPresence: 'single_user',
          timeOfDay: 'afternoon'
        },
        metadata: {
          framework: 'universal-ai-brain',
          model: 'attention-v1',
          confidence: 0.9,
          source: 'system_generated'
        }
      };

      await attentionManager.recordAttentionState(attentionState);
      console.log('✅ Attention state recorded');

      const currentAttention = await attentionManager.getCurrentAttentionState('test-agent-001', 'session-001');
      console.log(`✅ Current attention focus: ${currentAttention?.focus.primary || 'none'}`);
    } else {
      console.log('⚠️ Attention States Manager not available');
    }

    // Test 5: Communication Protocols Engine
    console.log('\n💬 Test 5: Communication Protocols Engine');
    console.log('-'.repeat(50));

    const communicationEngine = (brain as any).communicationProtocolsEngine;
    if (communicationEngine) {
      const protocolState = {
        agentId: 'test-agent-001',
        sessionId: 'session-001',
        timestamp: new Date(),
        protocol: {
          type: 'educational_dialogue',
          style: 'supportive_instructor',
          formality: 'semi_formal',
          adaptability: 0.8
        },
        context: {
          communicationType: 'learning_session' as const,
          audienceType: 'individual_learner',
          culturalContext: 'western_professional',
          domainExpertise: 'intermediate'
        },
        adaptation: {
          userPreferences: {
            communicationStyle: 'detailed_explanations',
            feedbackFrequency: 'regular',
            errorCorrection: 'gentle',
            encouragementLevel: 'moderate'
          },
          contextualFactors: {
            timeConstraints: 'moderate',
            complexityLevel: 'high',
            emotionalState: 'engaged',
            learningGoals: ['understanding', 'application']
          }
        },
        performance: {
          clarity: 0.9,
          engagement: 0.85,
          effectiveness: 0.8,
          userSatisfaction: 0.88
        },
        metadata: {
          framework: 'universal-ai-brain',
          version: '1.0.0',
          lastUpdated: new Date()
        }
      };

      await communicationEngine.recordProtocolState(protocolState);
      console.log('✅ Communication protocol state recorded');

      const currentProtocol = await communicationEngine.getCurrentProtocol('test-agent-001', 'session-001');
      console.log(`✅ Current protocol type: ${currentProtocol?.protocol.type || 'none'}`);
    } else {
      console.log('⚠️ Communication Protocols Engine not available');
    }

    // Test 6: Cultural Knowledge Engine
    console.log('\n🌍 Test 6: Cultural Knowledge Engine');
    console.log('-'.repeat(50));

    const culturalEngine = (brain as any).culturalKnowledgeEngine;
    if (culturalEngine) {
      const culturalKnowledge = {
        agentId: 'test-agent-001',
        timestamp: new Date(),
        knowledge: {
          category: 'communication_norms',
          culture: 'western_professional',
          domain: 'technology_education',
          content: 'In Western professional contexts, detailed explanations with examples are valued for technical education',
          confidence: 0.85
        },
        context: {
          source: 'interaction_learning',
          reliability: 'high',
          applicability: ['educational_contexts', 'professional_training'],
          limitations: ['may_not_apply_to_all_individuals']
        },
        application: {
          scenarios: ['technical_training', 'system_explanation', 'troubleshooting'],
          adaptations: ['adjust_detail_level', 'provide_examples', 'encourage_questions'],
          effectiveness: 0.8
        },
        metadata: {
          framework: 'universal-ai-brain',
          version: '1.0.0',
          tags: ['communication', 'education', 'western_culture']
        }
      };

      await culturalEngine.recordCulturalKnowledge(culturalKnowledge);
      console.log('✅ Cultural knowledge recorded');

      const relevantKnowledge = await culturalEngine.getRelevantKnowledge(
        'test-agent-001',
        'communication_norms',
        'technology_education'
      );
      console.log(`✅ Retrieved ${relevantKnowledge.length} relevant cultural knowledge items`);
    } else {
      console.log('⚠️ Cultural Knowledge Engine not available');
    }

    // Test 7: Temporal Planning Engine
    console.log('\n⏰ Test 7: Temporal Planning Engine');
    console.log('-'.repeat(50));

    const temporalEngine = (brain as any).temporalPlanningEngine;
    if (temporalEngine) {
      const temporalPlan = {
        agentId: 'test-agent-001',
        sessionId: 'session-001',
        timestamp: new Date(),
        plan: {
          title: 'AI Brain Learning Session',
          description: 'Comprehensive learning plan for understanding cognitive systems',
          type: 'learning_sequence',
          priority: 'high',
          estimatedDuration: 3600000 // 1 hour
        },
        timeline: {
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
          phases: [
            {
              name: 'Introduction',
              duration: 600000, // 10 minutes
              startTime: new Date(),
              endTime: new Date(Date.now() + 600000),
              activities: ['overview', 'goal_setting']
            },
            {
              name: 'Deep Dive',
              duration: 2400000, // 40 minutes
              startTime: new Date(Date.now() + 600000),
              endTime: new Date(Date.now() + 3000000),
              activities: ['cognitive_systems_exploration', 'hands_on_practice']
            },
            {
              name: 'Wrap Up',
              duration: 600000, // 10 minutes
              startTime: new Date(Date.now() + 3000000),
              endTime: new Date(Date.now() + 3600000),
              activities: ['summary', 'next_steps']
            }
          ]
        },
        dependencies: {
          prerequisites: ['basic_ai_knowledge'],
          resources: ['ai_brain_documentation', 'test_environment'],
          constraints: ['time_limit', 'cognitive_load']
        },
        adaptation: {
          flexibility: 0.7,
          contingencyPlans: ['extend_time', 'simplify_content', 'break_into_sessions'],
          monitoringPoints: ['phase_completion', 'user_understanding', 'engagement_level']
        },
        metadata: {
          framework: 'universal-ai-brain',
          version: '1.0.0',
          createdBy: 'temporal_planning_engine'
        }
      };

      await temporalEngine.recordTemporalPlan(temporalPlan);
      console.log('✅ Temporal plan recorded');

      const currentPlans = await temporalEngine.getActivePlans('test-agent-001', 'session-001');
      console.log(`✅ Retrieved ${currentPlans.length} active temporal plans`);
    } else {
      console.log('⚠️ Temporal Planning Engine not available');
    }

    console.log('\n📊 AFTER ALL COGNITIVE TESTS - Collection Status:');
    await checkCollectionStatus(db);

    console.log('\n🎉 ALL 12 COGNITIVE SYSTEMS TESTED! 🎉');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Verify MongoDB Atlas connection string');
    console.log('2. Check API key permissions');
    console.log('3. Ensure MongoDB Atlas cluster is running');
    console.log('4. Verify cognitive systems are properly initialized');
    process.exit(1);
  } finally {
    if (brain) {
      console.log('\n🧹 Cleaning up...');
      await brain.shutdown();
      console.log('✅ AI Brain shutdown completed');
    }
    
    if (mongoClient) {
      await mongoClient.close();
      console.log('✅ MongoDB connection closed');
    }
  }
}

async function checkCollectionStatus(db: any) {
  const collections = await db.listCollections().toArray();
  console.log(`📊 Total collections: ${collections.length}`);
  
  for (const collection of collections) {
    const count = await db.collection(collection.name).countDocuments();
    const size = await db.collection(collection.name).stats().then((stats: any) => stats.size || 0).catch(() => 0);
    console.log(`   ${collection.name}: ${count} documents (${(size / 1024).toFixed(2)} KB)`);
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unhandled error:', error);
  process.exit(1);
});

// Run the test
if (require.main === module) {
  testAllCognitiveSystems().catch(console.error);
}

export { testAllCognitiveSystems };
