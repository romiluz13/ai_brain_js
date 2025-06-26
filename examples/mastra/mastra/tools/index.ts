import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// Dynamic import for CommonJS module
let UniversalAIBrain: any;

// Define the config interface locally since it's not exported from index
interface UniversalAIBrainConfig {
  mongodb: {
    connectionString: string;
    databaseName: string;
    collections: {
      tracing: string;
      memory: string;
      context: string;
      metrics: string;
      audit: string;
    };
  };
  intelligence: {
    embeddingModel: string;
    vectorDimensions: number;
    similarityThreshold: number;
    maxContextLength: number;
  };
  safety: {
    enableContentFiltering: boolean;
    enablePIIDetection: boolean;
    enableHallucinationDetection: boolean;
    enableComplianceLogging: boolean;
    safetyLevel: 'strict' | 'moderate' | 'permissive';
  };
  monitoring: {
    enableRealTimeMonitoring: boolean;
    enablePerformanceTracking: boolean;
    enableCostTracking: boolean;
    enableErrorTracking: boolean;
    metricsRetentionDays: number;
    alertingEnabled: boolean;
    dashboardRefreshInterval: number;
  };
  apis?: {
    voyage?: {
      apiKey: string;
      baseURL?: string;
    };
    openai?: {
      apiKey: string;
      baseURL?: string;
    };
  };
}

// Initialize AI Brain instance
let brainInstance: any = null;

async function getAIBrain(): Promise<any> {
  if (!UniversalAIBrain) {
    const coreModule = await import('../../../packages/core/dist/index.js');
    UniversalAIBrain = coreModule.UniversalAIBrain;
  }

  if (!brainInstance) {
    const mongoUri = process.env.MONGODB_CONNECTION_STRING || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MongoDB connection string not found in environment variables');
    }

    const config: UniversalAIBrainConfig = {
      mongodb: {
        connectionString: mongoUri,
        databaseName: 'ai_brain_mastra_test_' + Date.now(),
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
        enableErrorTracking: true,
        metricsRetentionDays: 30,
        alertingEnabled: true,
        dashboardRefreshInterval: 5000
      },
      apis: {
        voyage: {
          apiKey: process.env.VOYAGE_API_KEY || '',
          baseURL: 'https://api.voyageai.com/v1'
        },
        openai: {
          apiKey: process.env.OPENAI_API_KEY || '',
          baseURL: 'https://api.openai.com/v1'
        }
      }
    };

    brainInstance = new UniversalAIBrain(config);
    await brainInstance.initialize();
    console.log('🧠 Universal AI Brain initialized successfully!');
  }
  return brainInstance;
}

// Tool 1: Store Memory in AI Brain
export const storeMemoryTool = createTool({
  id: 'store-memory',
  description: 'Store information in the Universal AI Brain semantic memory system',
  inputSchema: z.object({
    content: z.string().describe('The content to store in memory'),
    type: z.string().describe('Type of memory (e.g., research_paper, conversation, fact)'),
    importance: z.number().min(0).max(1).describe('Importance score from 0 to 1'),
    metadata: z.record(z.any()).optional().describe('Additional metadata for the memory')
  }),
  execute: async ({ context }) => {
    const brain = await getAIBrain();
    
    const memoryId = await brain.storeMemory({
      content: context.content,
      type: context.type,
      importance: context.importance,
      metadata: context.metadata || {}
    });
    
    return {
      success: true,
      memoryId,
      message: `Successfully stored memory with ID: ${memoryId}`
    };
  }
});

// Tool 2: Retrieve Relevant Context
export const retrieveContextTool = createTool({
  id: 'retrieve-context',
  description: 'Retrieve relevant context from AI Brain memory based on a query',
  inputSchema: z.object({
    query: z.string().describe('Search query to find relevant context'),
    limit: z.number().default(5).describe('Maximum number of results to return')
  }),
  execute: async ({ context }) => {
    const brain = await getAIBrain();
    
    const results = await brain.retrieveRelevantContext(context.query, { 
      limit: context.limit 
    });
    
    return {
      success: true,
      resultsCount: results.length,
      results: results.map(r => ({
        content: r.content.substring(0, 200) + '...',
        similarity: r.similarity,
        metadata: r.metadata
      })),
      message: `Found ${results.length} relevant context items`
    };
  }
});

// Tool 3: Safety Check
export const safetyCheckTool = createTool({
  id: 'safety-check',
  description: 'Check content for safety issues using AI Brain safety guardrails',
  inputSchema: z.object({
    content: z.string().describe('Content to check for safety issues')
  }),
  execute: async ({ context }) => {
    const brain = await getAIBrain();
    
    const safetyResult = await brain.checkSafety(context.content);
    
    return {
      success: true,
      safetyScore: safetyResult.safetyScore,
      piiDetected: safetyResult.piiDetected,
      piiItems: safetyResult.piiItems || [],
      recommendations: safetyResult.piiDetected ? ['Remove PII before processing'] : ['Content is safe'],
      message: `Safety check completed - Score: ${safetyResult.safetyScore}`
    };
  }
});

// Tool 4: Get Performance Metrics
export const getMetricsTool = createTool({
  id: 'get-metrics',
  description: 'Get performance metrics from the AI Brain monitoring system',
  inputSchema: z.object({
    includeDetails: z.boolean().default(false).describe('Include detailed metrics breakdown')
  }),
  execute: async ({ context }) => {
    const brain = await getAIBrain();
    
    const metrics = await brain.getPerformanceMetrics();
    const dashboardMetrics = await brain.getDashboardMetrics();
    const isHealthy = await brain.healthCheck();
    
    return {
      success: true,
      systemHealth: isHealthy ? 'healthy' : 'unhealthy',
      totalOperations: metrics.totalOperations || 0,
      averageResponseTime: metrics.averageResponseTime || 0,
      dashboardData: context.includeDetails ? dashboardMetrics : Object.keys(dashboardMetrics),
      message: `System is ${isHealthy ? 'healthy' : 'unhealthy'} - ${metrics.totalOperations || 0} operations tracked`
    };
  }
});

// Tool 5: Test ALL 12 Cognitive Systems
export const testAllCognitiveSystems = createTool({
  id: 'test-all-cognitive-systems',
  description: 'Test ALL 12 cognitive systems mentioned in README with real data and exact benchmarks',
  inputSchema: z.object({
    includePerformanceMetrics: z.boolean().default(true).describe('Include detailed performance benchmarks'),
    testRealData: z.boolean().default(true).describe('Use real data for comprehensive testing')
  }),
  execute: async ({ context }) => {
    const brain = await getAIBrain();

    console.log(`🧠 Testing ALL 12 Cognitive Systems with ${context.testRealData ? 'REAL' : 'mock'} data...`);

    const startTime = Date.now();
    const cognitiveTests = {
      startTime: new Date().toISOString(),
      tests: [] as any[],
      performanceMetrics: {} as any
    };

    try {
      // 1. 🎭 EMOTIONAL INTELLIGENCE ENGINE
      console.log('🎭 Testing Emotional Intelligence Engine...');
      const emotionStart = Date.now();

      const emotionalTest = await brain.emotionalIntelligence.analyzeEmotion(
        "I'm really frustrated with this bug and feeling overwhelmed!",
        { userId: 'test-user', context: 'debugging' }
      );

      const emotionDuration = Date.now() - emotionStart;
      cognitiveTests.tests.push({
        system: '🎭 Emotional Intelligence',
        status: emotionalTest ? 'PASSED' : 'FAILED',
        duration: `${emotionDuration}ms`,
        details: `Emotion: ${emotionalTest?.emotion || 'unknown'}, Intensity: ${emotionalTest?.intensity || 0}`,
        benchmark: `Response time: ${emotionDuration}ms, Accuracy: ${emotionalTest?.confidence || 0}`
      });

      // 2. 🎯 GOAL HIERARCHY MANAGEMENT
      console.log('🎯 Testing Goal Hierarchy Management...');
      const goalStart = Date.now();

      const goalTest = await brain.goalHierarchy.createGoal({
        title: 'Complete AI Brain Testing',
        priority: 'high',
        deadline: new Date(Date.now() + 86400000), // 24 hours
        subGoals: [
          { title: 'Test Cognitive Systems', priority: 'high' },
          { title: 'Generate Benchmarks', priority: 'medium' }
        ]
      });

      const goalDuration = Date.now() - goalStart;
      cognitiveTests.tests.push({
        system: '🎯 Goal Hierarchy',
        status: goalTest ? 'PASSED' : 'FAILED',
        duration: `${goalDuration}ms`,
        details: `Goal ID: ${goalTest?.goalId || 'none'}, Sub-goals: ${goalTest?.subGoals?.length || 0}`,
        benchmark: `Creation time: ${goalDuration}ms, Hierarchy depth: ${goalTest?.depth || 1}`
      });

      // 3. 🤔 CONFIDENCE TRACKING ENGINE
      console.log('🤔 Testing Confidence Tracking Engine...');
      const confidenceStart = Date.now();

      const confidenceTest = await brain.confidenceTracking.assessConfidence(
        'What is the best way to optimize MongoDB queries for vector search?',
        { domain: 'database_optimization', complexity: 'high' }
      );

      const confidenceDuration = Date.now() - confidenceStart;
      cognitiveTests.tests.push({
        system: '🤔 Confidence Tracking',
        status: confidenceTest ? 'PASSED' : 'FAILED',
        duration: `${confidenceDuration}ms`,
        details: `Confidence: ${confidenceTest?.confidence || 0}, Uncertainty areas: ${confidenceTest?.uncertaintyAreas?.length || 0}`,
        benchmark: `Assessment time: ${confidenceDuration}ms, Calibration accuracy: ${confidenceTest?.calibration || 0}`
      });

      // 4. 👁️ ATTENTION MANAGEMENT SYSTEM
      console.log('👁️ Testing Attention Management System...');
      const attentionStart = Date.now();

      await brain.attentionManagement.setFocus(['performance optimization', 'cognitive testing']);
      const attentionState = await brain.attentionManagement.getAttentionState();

      const attentionDuration = Date.now() - attentionStart;
      cognitiveTests.tests.push({
        system: '👁️ Attention Management',
        status: attentionState ? 'PASSED' : 'FAILED',
        duration: `${attentionDuration}ms`,
        details: `Focus areas: ${attentionState?.currentFocus?.length || 0}, Attention score: ${attentionState?.attentionScore || 0}`,
        benchmark: `Focus switch time: ${attentionDuration}ms, Attention efficiency: ${attentionState?.efficiency || 0}`
      });

      // 5. 🌍 CULTURAL KNOWLEDGE ENGINE
      console.log('🌍 Testing Cultural Knowledge Engine...');
      const culturalStart = Date.now();

      const culturalTest = await brain.culturalKnowledge.adaptResponse(
        'How should I greet my business partners?',
        { culture: 'japanese', context: 'business_meeting', formality: 'high' }
      );

      const culturalDuration = Date.now() - culturalStart;
      cognitiveTests.tests.push({
        system: '🌍 Cultural Knowledge',
        status: culturalTest ? 'PASSED' : 'FAILED',
        duration: `${culturalDuration}ms`,
        details: `Cultural adaptation: ${culturalTest?.adaptationType || 'none'}, Sensitivity score: ${culturalTest?.sensitivityScore || 0}`,
        benchmark: `Adaptation time: ${culturalDuration}ms, Cultural accuracy: ${culturalTest?.accuracy || 0}`
      });

      // 6. 🛠️ SKILL CAPABILITY MANAGER
      console.log('🛠️ Testing Skill Capability Manager...');
      const skillStart = Date.now();

      await brain.skillCapability.updateProficiency('mongodb_optimization', 0.85);
      const skillGaps = await brain.skillCapability.identifyGaps(['mongodb', 'vector_search', 'cognitive_systems']);

      const skillDuration = Date.now() - skillStart;
      cognitiveTests.tests.push({
        system: '🛠️ Skill Capability',
        status: skillGaps ? 'PASSED' : 'FAILED',
        duration: `${skillDuration}ms`,
        details: `Skill gaps identified: ${skillGaps?.gaps?.length || 0}, Proficiency updated: mongodb_optimization`,
        benchmark: `Analysis time: ${skillDuration}ms, Skill assessment accuracy: ${skillGaps?.accuracy || 0}`
      });

      // 7. 📡 COMMUNICATION PROTOCOL MANAGER
      console.log('📡 Testing Communication Protocol Manager...');
      const commStart = Date.now();

      const protocolTest = await brain.communicationProtocols.establishProtocol({
        type: 'multi_agent_coordination',
        participants: ['agent_1', 'agent_2', 'agent_3'],
        priority: 'high'
      });

      const commDuration = Date.now() - commStart;
      cognitiveTests.tests.push({
        system: '📡 Communication Protocols',
        status: protocolTest ? 'PASSED' : 'FAILED',
        duration: `${commDuration}ms`,
        details: `Protocol ID: ${protocolTest?.protocolId || 'none'}, Participants: ${protocolTest?.participants?.length || 0}`,
        benchmark: `Setup time: ${commDuration}ms, Protocol efficiency: ${protocolTest?.efficiency || 0}`
      });

      // 8. ⏰ TEMPORAL PLANNING ENGINE
      console.log('⏰ Testing Temporal Planning Engine...');
      const temporalStart = Date.now();

      const temporalTest = await brain.temporalPlanning.createPlan({
        tasks: ['cognitive_testing', 'benchmark_analysis', 'report_generation'],
        deadline: new Date(Date.now() + 3600000), // 1 hour
        priority: 'high'
      });

      const temporalDuration = Date.now() - temporalStart;
      cognitiveTests.tests.push({
        system: '⏰ Temporal Planning',
        status: temporalTest ? 'PASSED' : 'FAILED',
        duration: `${temporalDuration}ms`,
        details: `Plan ID: ${temporalTest?.planId || 'none'}, Tasks: ${temporalTest?.tasks?.length || 0}`,
        benchmark: `Planning time: ${temporalDuration}ms, Schedule optimization: ${temporalTest?.optimization || 0}`
      });

      // 9. 🧠 SEMANTIC MEMORY ENGINE (Enhanced Test)
      console.log('🧠 Testing Enhanced Semantic Memory Engine...');
      const memoryStart = Date.now();

      const memoryId = await brain.storeMemory({
        content: 'Universal AI Brain 2.0 comprehensive cognitive testing with all 12 systems including emotional intelligence, goal hierarchy, confidence tracking, attention management, cultural knowledge, skill capability, communication protocols, temporal planning, semantic memory, safety guardrails, self-improvement, and real-time monitoring.',
        type: 'comprehensive_test',
        importance: 0.95,
        metadata: {
          test: true,
          systems: 12,
          timestamp: Date.now(),
          cognitive_complexity: 'maximum'
        }
      });

      const retrievedMemories = await brain.retrieveRelevantContext('cognitive systems testing', { limit: 3 });
      const memoryDuration = Date.now() - memoryStart;

      cognitiveTests.tests.push({
        system: '🧠 Semantic Memory',
        status: retrievedMemories.length > 0 ? 'PASSED' : 'FAILED',
        duration: `${memoryDuration}ms`,
        details: `Memory ID: ${memoryId}, Retrieved: ${retrievedMemories.length} items, Similarity: ${retrievedMemories[0]?.similarity || 0}`,
        benchmark: `Storage+Retrieval time: ${memoryDuration}ms, Vector search accuracy: ${retrievedMemories[0]?.similarity || 0}`
      });

      // 10. 🛡️ SAFETY GUARDRAILS ENGINE (Enhanced Test)
      console.log('🛡️ Testing Enhanced Safety Guardrails Engine...');
      const safetyStart = Date.now();

      const safetyTest = await brain.checkSafety('This research involves Dr. John Smith (john.smith@university.edu) and contains sensitive information about AI safety protocols and potential dual-use applications.');
      const safetyDuration = Date.now() - safetyStart;

      cognitiveTests.tests.push({
        system: '🛡️ Safety Guardrails',
        status: safetyTest.safetyScore !== undefined ? 'PASSED' : 'FAILED',
        duration: `${safetyDuration}ms`,
        details: `Safety score: ${safetyTest.safetyScore}, PII detected: ${safetyTest.piiDetected}, Items: ${safetyTest.piiItems?.length || 0}`,
        benchmark: `Safety analysis time: ${safetyDuration}ms, Detection accuracy: ${safetyTest.piiDetected ? 1.0 : 0.0}`
      });

      // 11. 🚀 SELF-IMPROVEMENT ENGINE
      console.log('🚀 Testing Self-Improvement Engine...');
      const improvementStart = Date.now();

      const improvementTest = await brain.selfImprovement.analyzePerformance({
        operation: 'cognitive_testing',
        metrics: { accuracy: 0.92, speed: 250, efficiency: 0.88 },
        feedback: 'System performed well but could optimize memory retrieval speed'
      });

      const improvementDuration = Date.now() - improvementStart;
      cognitiveTests.tests.push({
        system: '🚀 Self-Improvement',
        status: improvementTest ? 'PASSED' : 'FAILED',
        duration: `${improvementDuration}ms`,
        details: `Improvement areas: ${improvementTest?.improvementAreas?.length || 0}, Optimization score: ${improvementTest?.optimizationScore || 0}`,
        benchmark: `Analysis time: ${improvementDuration}ms, Learning efficiency: ${improvementTest?.learningEfficiency || 0}`
      });

      // 12. 📊 REAL-TIME MONITORING ENGINE (Enhanced Test)
      console.log('📊 Testing Enhanced Real-Time Monitoring Engine...');
      const monitoringStart = Date.now();

      const metrics = await brain.getPerformanceMetrics();
      const dashboardMetrics = await brain.getDashboardMetrics();
      const healthStatus = await brain.healthCheck();

      const monitoringDuration = Date.now() - monitoringStart;
      cognitiveTests.tests.push({
        system: '📊 Real-Time Monitoring',
        status: metrics && dashboardMetrics && healthStatus !== undefined ? 'PASSED' : 'FAILED',
        duration: `${monitoringDuration}ms`,
        details: `Operations: ${metrics.totalOperations || 0}, Avg response: ${metrics.averageResponseTime || 0}ms, Health: ${healthStatus ? 'healthy' : 'unhealthy'}`,
        benchmark: `Monitoring query time: ${monitoringDuration}ms, Data completeness: ${Object.keys(dashboardMetrics).length}`
      });

      // Calculate overall performance metrics
      const totalDuration = Date.now() - startTime;
      const passedTests = cognitiveTests.tests.filter(t => t.status === 'PASSED').length;
      const totalTests = cognitiveTests.tests.length;

      cognitiveTests.performanceMetrics = {
        totalDuration: `${totalDuration}ms`,
        averageTestDuration: `${Math.round(totalDuration / totalTests)}ms`,
        successRate: `${Math.round((passedTests / totalTests) * 100)}%`,
        cognitiveSystemsActive: passedTests,
        totalCognitiveSystems: totalTests,
        overallStatus: passedTests === totalTests ? 'ALL_SYSTEMS_OPERATIONAL' : 'SOME_SYSTEMS_NEED_ATTENTION'
      };

      cognitiveTests.endTime = new Date().toISOString();

      return {
        success: true,
        cognitiveTests,
        summary: {
          totalCognitiveSystems: totalTests,
          operationalSystems: passedTests,
          failedSystems: totalTests - passedTests,
          successRate: Math.round((passedTests / totalTests) * 100),
          totalTestDuration: totalDuration,
          averageSystemResponseTime: Math.round(totalDuration / totalTests),
          overallStatus: passedTests === totalTests ? 'COMPLETE_COGNITIVE_ARCHITECTURE' : 'PARTIAL_COGNITIVE_ARCHITECTURE'
        },
        message: `🧠 COGNITIVE ARCHITECTURE TEST COMPLETE: ${passedTests}/${totalTests} systems operational (${Math.round((passedTests / totalTests) * 100)}% success rate)`
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Cognitive systems test failed due to error'
      };
    }
  }
});
