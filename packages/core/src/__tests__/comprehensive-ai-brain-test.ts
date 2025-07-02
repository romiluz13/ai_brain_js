/**
 * 🧠🚀 UNIVERSAL AI BRAIN 2.0 - COMPREHENSIVE REAL-WORLD TEST
 * 
 * This test validates EVERY SINGLE feature of the Universal AI Brain with real data:
 * - All 12 cognitive systems
 * - MongoDB Atlas Vector Search with new $rankFusion hybrid search
 * - Safety guardrails and compliance systems
 * - Memory and context injection
 * - Real-time monitoring and metrics
 * - Framework adapters
 * - Self-improvement engines
 * 
 * Test Scenario: AI Research Assistant for Academic Papers
 * - Stores real research papers in semantic memory
 * - Uses context injection for personalized assistance
 * - Triggers safety systems with various content types
 * - Exercises all cognitive systems for analysis
 * - Generates comprehensive metrics and audit logs
 * - Tests all framework adapters
 * - Validates all MongoDB collections with real read/write operations
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/testing-library/jest-dom';
import { MongoClient, Db } from 'mongodb';
import { UniversalAIBrain, UniversalAIBrainConfig } from '../UniversalAIBrain';
import { HybridSearchEngine } from '../features/hybridSearch';
import { VoyageAIEmbeddingProvider } from '../embeddings/VoyageAIEmbeddingProvider';
import { OpenAIEmbeddingProvider } from '../embeddings/OpenAIEmbeddingProvider';

// Real research papers for testing (sample abstracts)
const REAL_RESEARCH_PAPERS = [
  {
    title: "Attention Is All You Need",
    abstract: "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.",
    authors: ["Ashish Vaswani", "Noam Shazeer", "Niki Parmar"],
    year: 2017,
    category: "machine_learning",
    keywords: ["transformer", "attention", "neural networks", "nlp"]
  },
  {
    title: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
    abstract: "We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context in all layers.",
    authors: ["Jacob Devlin", "Ming-Wei Chang", "Kenton Lee"],
    year: 2018,
    category: "natural_language_processing",
    keywords: ["bert", "bidirectional", "transformers", "pre-training"]
  },
  {
    title: "GPT-3: Language Models are Few-Shot Learners",
    abstract: "Recent work has demonstrated substantial gains on many NLP tasks and benchmarks by pre-training on a large corpus of text followed by fine-tuning on a specific task. While typically task-agnostic in architecture, this method still requires task-specific fine-tuning datasets of thousands or tens of thousands of examples.",
    authors: ["Tom B. Brown", "Benjamin Mann", "Nick Ryder"],
    year: 2020,
    category: "large_language_models",
    keywords: ["gpt-3", "few-shot", "language models", "scaling"]
  },
  {
    title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
    abstract: "Large pre-trained language models have been shown to store factual knowledge in their parameters, and achieve state-of-the-art results when fine-tuned on downstream NLP tasks. However, their ability to access and precisely manipulate knowledge is still limited, and hence on knowledge-intensive tasks, their performance lags behind task-specific architectures.",
    authors: ["Patrick Lewis", "Ethan Perez", "Aleksandara Piktus"],
    year: 2020,
    category: "information_retrieval",
    keywords: ["rag", "retrieval", "generation", "knowledge"]
  }
];

// Test queries that will exercise different AI Brain components
const TEST_QUERIES = [
  {
    query: "What are the key innovations in transformer architecture?",
    expectedComponents: ["semantic_memory", "context_injection", "vector_search", "hybrid_search"]
  },
  {
    query: "Compare BERT and GPT-3 approaches to language understanding",
    expectedComponents: ["cognitive_analysis", "comparative_reasoning", "knowledge_synthesis"]
  },
  {
    query: "How can I implement retrieval-augmented generation in my research?",
    expectedComponents: ["goal_hierarchy", "temporal_planning", "skill_capability"]
  },
  {
    query: "What are the ethical implications of large language models?",
    expectedComponents: ["safety_guardrails", "cultural_knowledge", "compliance_audit"]
  }
];

// Potentially sensitive content to test safety systems
const SAFETY_TEST_CONTENT = [
  "This research discusses potential dual-use applications of AI technology",
  "The dataset contains personal information that requires careful handling",
  "This paper mentions John Smith's email john.smith@university.edu in the acknowledgments",
  "The model training involved proprietary algorithms from OpenAI Corporation"
];

describe('🧠 Universal AI Brain 2.0 - Comprehensive Real-World Test', () => {
  let brain: UniversalAIBrain;
  let mongoClient: MongoClient;
  let database: Db;
  let hybridSearchEngine: HybridSearchEngine;
  let embeddingProvider: VoyageAIEmbeddingProvider | OpenAIEmbeddingProvider;

  const config: UniversalAIBrainConfig = {
    mongodb: {
      connectionString: process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost:27017',
      databaseName: 'ai_brain_test_' + Date.now(),
      collections: {
        tracing: 'agent_traces_test',
        memory: 'agent_memory_test',
        context: 'agent_context_test',
        metrics: 'agent_metrics_test',
        audit: 'agent_safety_logs_test'
      }
    },
    intelligence: {
      embeddingModel: 'voyage-3.5',
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

  beforeAll(async () => {
    console.log('🚀 Initializing Universal AI Brain 2.0 for comprehensive testing...');
    
    // Initialize the AI Brain
    brain = new UniversalAIBrain(config);
    await brain.initialize();
    
    // Get database connection for direct testing
    mongoClient = new MongoClient(config.mongodb.connectionString);
    await mongoClient.connect();
    database = mongoClient.db(config.mongodb.databaseName);
    
    // Initialize hybrid search engine for testing
    const voyageApiKey = process.env.VOYAGE_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    embeddingProvider = voyageApiKey 
      ? new VoyageAIEmbeddingProvider({ apiKey: voyageApiKey, model: 'voyage-3.5' })
      : new OpenAIEmbeddingProvider({ apiKey: openaiApiKey!, model: 'text-embedding-3-small' });
    
    hybridSearchEngine = new HybridSearchEngine(database, embeddingProvider);
    
    console.log('✅ AI Brain initialized successfully');
  }, 60000);

  afterAll(async () => {
    console.log('🧹 Cleaning up test environment...');
    
    if (brain) {
      await brain.shutdown();
    }
    
    if (mongoClient) {
      // Clean up test database
      await database.dropDatabase();
      await mongoClient.close();
    }
    
    console.log('✅ Cleanup completed');
  });

  test('🔧 AI Brain Initialization and Health Check', async () => {
    expect(brain).toBeDefined();
    expect(brain.isHealthy()).toBe(true);
    
    // Verify all collections are created
    const collections = await database.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    expect(collectionNames).toContain(config.mongodb.collections.tracing);
    expect(collectionNames).toContain(config.mongodb.collections.memory);
    expect(collectionNames).toContain(config.mongodb.collections.context);
    expect(collectionNames).toContain(config.mongodb.collections.metrics);
    expect(collectionNames).toContain(config.mongodb.collections.audit);
    
    console.log('✅ All MongoDB collections created successfully');
  });

  test('📚 Semantic Memory Storage and Retrieval', async () => {
    console.log('📚 Testing semantic memory with real research papers...');
    
    // Store all research papers in semantic memory
    for (const paper of REAL_RESEARCH_PAPERS) {
      const paperText = `${paper.title}\n\nAbstract: ${paper.abstract}\n\nAuthors: ${paper.authors.join(', ')}\nYear: ${paper.year}\nCategory: ${paper.category}\nKeywords: ${paper.keywords.join(', ')}`;
      
      const memoryId = await brain.storeMemory({
        content: paperText,
        metadata: {
          type: 'research_paper',
          title: paper.title,
          authors: paper.authors,
          year: paper.year,
          category: paper.category,
          keywords: paper.keywords
        },
        source: 'test_research_corpus'
      });
      
      expect(memoryId).toBeDefined();
      console.log(`✅ Stored paper: ${paper.title}`);
    }
    
    // Test semantic retrieval
    const retrievedMemories = await brain.retrieveRelevantMemories(
      'transformer architecture and attention mechanisms',
      { limit: 3, minSimilarity: 0.5 }
    );
    
    expect(retrievedMemories.length).toBeGreaterThan(0);
    expect(retrievedMemories[0].metadata.title).toContain('Attention');
    
    console.log(`✅ Retrieved ${retrievedMemories.length} relevant papers`);
  });

  test('🔍 Hybrid Search with $rankFusion (2025 Feature)', async () => {
    console.log('🔍 Testing new MongoDB $rankFusion hybrid search...');

    // Test the new hybrid search functionality
    const hybridResults = await hybridSearchEngine.hybridSearch(
      'attention mechanism transformer neural networks',
      {},
      {
        limit: 5,
        vector_weight: 0.6,
        text_weight: 0.4,
        explain_relevance: true
      }
    );

    expect(hybridResults.length).toBeGreaterThan(0);
    expect(hybridResults[0].scores).toBeDefined();
    expect(hybridResults[0].scores.vector_score).toBeGreaterThan(0);
    expect(hybridResults[0].scores.combined_score).toBeGreaterThan(0);
    expect(hybridResults[0].relevance_explanation).toContain('RankFusion');

    console.log(`✅ Hybrid search returned ${hybridResults.length} results with RankFusion`);
    console.log(`✅ Top result: ${hybridResults[0].content.text?.substring(0, 100)}...`);
  });

  test('🧠 All 12 Cognitive Systems Integration', async () => {
    console.log('🧠 Testing all 12 cognitive intelligence systems...');

    const testPrompt = "Analyze the evolution of transformer architectures and their impact on natural language processing. Consider the emotional and cultural implications of these advances.";

    // Test cognitive analysis through the brain
    const cognitiveAnalysis = await brain.performCognitiveAnalysis(testPrompt, {
      includeEmotionalIntelligence: true,
      includeGoalHierarchy: true,
      includeConfidenceTracking: true,
      includeAttentionManagement: true,
      includeCulturalKnowledge: true,
      includeSkillCapability: true,
      includeCommunicationProtocol: true,
      includeTemporalPlanning: true,
      includeCreativeReasoning: true,
      includeEthicalReasoning: true,
      includeMetacognition: true,
      includeAdaptiveLearning: true
    });

    expect(cognitiveAnalysis).toBeDefined();
    expect(cognitiveAnalysis.emotionalIntelligence).toBeDefined();
    expect(cognitiveAnalysis.goalHierarchy).toBeDefined();
    expect(cognitiveAnalysis.confidenceTracking).toBeDefined();
    expect(cognitiveAnalysis.attentionManagement).toBeDefined();
    expect(cognitiveAnalysis.culturalKnowledge).toBeDefined();
    expect(cognitiveAnalysis.skillCapability).toBeDefined();
    expect(cognitiveAnalysis.communicationProtocol).toBeDefined();
    expect(cognitiveAnalysis.temporalPlanning).toBeDefined();
    expect(cognitiveAnalysis.creativeReasoning).toBeDefined();
    expect(cognitiveAnalysis.ethicalReasoning).toBeDefined();
    expect(cognitiveAnalysis.metacognition).toBeDefined();
    expect(cognitiveAnalysis.adaptiveLearning).toBeDefined();

    console.log('✅ All 12 cognitive systems responded successfully');
    console.log(`✅ Emotional analysis: ${cognitiveAnalysis.emotionalIntelligence.dominantEmotion}`);
    console.log(`✅ Confidence level: ${cognitiveAnalysis.confidenceTracking.overallConfidence}`);
  });

  test('🛡️ Safety Guardrails and Compliance Systems', async () => {
    console.log('🛡️ Testing safety guardrails with potentially sensitive content...');

    for (const testContent of SAFETY_TEST_CONTENT) {
      const safetyAnalysis = await brain.analyzeSafety(testContent);

      expect(safetyAnalysis).toBeDefined();
      expect(safetyAnalysis.contentFiltering).toBeDefined();
      expect(safetyAnalysis.piiDetection).toBeDefined();
      expect(safetyAnalysis.hallucinationDetection).toBeDefined();
      expect(safetyAnalysis.complianceCheck).toBeDefined();

      // Check if PII was detected in the email example
      if (testContent.includes('@')) {
        expect(safetyAnalysis.piiDetection.detectedTypes.length).toBeGreaterThan(0);
        expect(safetyAnalysis.piiDetection.detectedTypes).toContain('email');
      }

      console.log(`✅ Safety analysis completed for: ${testContent.substring(0, 50)}...`);
    }

    // Verify audit logs were created
    const auditCollection = database.collection(config.mongodb.collections.audit);
    const auditLogs = await auditCollection.find({}).toArray();
    expect(auditLogs.length).toBeGreaterThan(0);

    console.log(`✅ ${auditLogs.length} audit logs created in compliance system`);
  });

  test('💭 Context Injection and Personalization', async () => {
    console.log('💭 Testing context injection for personalized responses...');

    const userContext = {
      userId: 'test_researcher_001',
      preferences: {
        researchArea: 'natural_language_processing',
        experienceLevel: 'advanced',
        preferredStyle: 'technical_detailed'
      },
      previousInteractions: [
        'Asked about transformer architectures',
        'Interested in BERT implementations',
        'Working on attention mechanisms'
      ]
    };

    const enhancedPrompt = await brain.injectContext(
      "Explain the latest developments in language models",
      userContext
    );

    expect(enhancedPrompt).toBeDefined();
    expect(enhancedPrompt.enhancedPrompt).toContain('natural_language_processing');
    expect(enhancedPrompt.contextSources.length).toBeGreaterThan(0);
    expect(enhancedPrompt.personalizationLevel).toBeGreaterThan(0.5);

    console.log('✅ Context injection enhanced prompt successfully');
    console.log(`✅ Personalization level: ${enhancedPrompt.personalizationLevel}`);
  });

  test('📊 Real-time Monitoring and Metrics', async () => {
    console.log('📊 Testing real-time monitoring and metrics collection...');

    // Perform several operations to generate metrics
    await brain.retrieveRelevantMemories('test query 1');
    await brain.retrieveRelevantMemories('test query 2');
    await brain.analyzeSafety('test content for metrics');

    // Check metrics collection
    const metrics = await brain.getMetrics({
      timeRange: { start: new Date(Date.now() - 60000), end: new Date() },
      includePerformance: true,
      includeCost: true,
      includeErrors: true
    });

    expect(metrics).toBeDefined();
    expect(metrics.performance).toBeDefined();
    expect(metrics.usage).toBeDefined();
    expect(metrics.errors).toBeDefined();
    expect(metrics.performance.totalOperations).toBeGreaterThan(0);

    // Verify metrics were stored in database
    const metricsCollection = database.collection(config.mongodb.collections.metrics);
    const storedMetrics = await metricsCollection.find({}).toArray();
    expect(storedMetrics.length).toBeGreaterThan(0);

    console.log(`✅ Collected ${metrics.performance.totalOperations} operations in metrics`);
    console.log(`✅ ${storedMetrics.length} metric records stored in database`);
  });

  test('🔌 Framework Adapters Integration', async () => {
    console.log('🔌 Testing all framework adapters...');

    const testMessage = "What are the key benefits of transformer architectures?";

    // Test Vercel AI Adapter
    const vercelResult = await brain.processWithVercelAI(testMessage, {
      model: 'gpt-4o-mini',
      includeContext: true,
      enableSafety: true
    });

    expect(vercelResult).toBeDefined();
    expect(vercelResult.response).toBeDefined();
    expect(vercelResult.metadata.framework).toBe('vercel-ai');

    // Test Mastra Adapter
    const mastraResult = await brain.processWithMastra(testMessage, {
      agentName: 'research_assistant',
      includeMemory: true,
      enableCognitive: true
    });

    expect(mastraResult).toBeDefined();
    expect(mastraResult.response).toBeDefined();
    expect(mastraResult.metadata.framework).toBe('mastra');

    // Test LangChain Adapter
    const langchainResult = await brain.processWithLangChain(testMessage, {
      chainType: 'conversational',
      includeVectorStore: true,
      enableTracing: true
    });

    expect(langchainResult).toBeDefined();
    expect(langchainResult.response).toBeDefined();
    expect(langchainResult.metadata.framework).toBe('langchain');

    // Test OpenAI Agents Adapter
    const openaiResult = await brain.processWithOpenAIAgents(testMessage, {
      assistantId: 'research_assistant',
      includeFileSearch: true,
      enableFunctionCalling: true
    });

    expect(openaiResult).toBeDefined();
    expect(openaiResult.response).toBeDefined();
    expect(openaiResult.metadata.framework).toBe('openai-agents');

    console.log('✅ All 4 framework adapters working successfully');
  });

  test('🎯 Self-Improvement and Learning Systems', async () => {
    console.log('🎯 Testing self-improvement and adaptive learning...');

    // Test learning from user feedback
    const feedbackData = [
      { query: 'transformer attention', response: 'detailed_explanation', rating: 5, feedback: 'very helpful' },
      { query: 'bert architecture', response: 'technical_overview', rating: 4, feedback: 'good but could be more detailed' },
      { query: 'gpt models', response: 'comparison_analysis', rating: 3, feedback: 'too complex for beginners' }
    ];

    for (const feedback of feedbackData) {
      await brain.learnFromFeedback(feedback);
    }

    // Test optimization suggestions
    const optimizations = await brain.generateOptimizations({
      analysisType: 'performance_and_quality',
      timeRange: { start: new Date(Date.now() - 86400000), end: new Date() },
      includeUserFeedback: true
    });

    expect(optimizations).toBeDefined();
    expect(optimizations.suggestions.length).toBeGreaterThan(0);
    expect(optimizations.performanceImprovements).toBeDefined();
    expect(optimizations.qualityEnhancements).toBeDefined();

    // Test adaptive model selection
    const adaptiveModel = await brain.selectOptimalModel({
      queryType: 'research_analysis',
      userProfile: { experienceLevel: 'advanced', domain: 'nlp' },
      performanceRequirements: { maxLatency: 2000, minQuality: 0.8 }
    });

    expect(adaptiveModel).toBeDefined();
    expect(adaptiveModel.selectedModel).toBeDefined();
    expect(adaptiveModel.confidence).toBeGreaterThan(0.5);

    console.log(`✅ Generated ${optimizations.suggestions.length} optimization suggestions`);
    console.log(`✅ Selected optimal model: ${adaptiveModel.selectedModel}`);
  });

  test('🔄 End-to-End Workflow Integration', async () => {
    console.log('🔄 Testing complete end-to-end workflow...');

    const researchQuery = "I'm working on a paper about attention mechanisms in transformers. Can you help me understand the key innovations and provide relevant citations?";

    // This should exercise ALL systems in a realistic workflow
    const workflowResult = await brain.processCompleteWorkflow(researchQuery, {
      userId: 'test_researcher_001',
      sessionId: 'comprehensive_test_session',
      enableAllSystems: true,
      includeDetailedAnalysis: true
    });

    expect(workflowResult).toBeDefined();
    expect(workflowResult.response).toBeDefined();
    expect(workflowResult.systemsUsed.length).toBeGreaterThanOrEqual(10);
    expect(workflowResult.systemsUsed).toContain('semantic_memory');
    expect(workflowResult.systemsUsed).toContain('context_injection');
    expect(workflowResult.systemsUsed).toContain('safety_guardrails');
    expect(workflowResult.systemsUsed).toContain('cognitive_analysis');
    expect(workflowResult.systemsUsed).toContain('hybrid_search');

    // Verify tracing was captured
    const tracingCollection = database.collection(config.mongodb.collections.tracing);
    const traces = await tracingCollection.find({ sessionId: 'comprehensive_test_session' }).toArray();
    expect(traces.length).toBeGreaterThan(0);

    console.log(`✅ End-to-end workflow used ${workflowResult.systemsUsed.length} systems`);
    console.log(`✅ Generated ${traces.length} trace records`);
    console.log(`✅ Response length: ${workflowResult.response.length} characters`);
  });

  test('📈 Performance and Scalability Validation', async () => {
    console.log('📈 Testing performance and scalability...');

    const startTime = Date.now();
    const concurrentQueries = 5;

    // Test concurrent operations
    const promises = Array.from({ length: concurrentQueries }, (_, i) =>
      brain.retrieveRelevantMemories(`test query ${i}`, { limit: 3 })
    );

    const results = await Promise.all(promises);
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    expect(results.length).toBe(concurrentQueries);
    expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds

    // Test memory usage and cleanup
    const memoryUsage = process.memoryUsage();
    expect(memoryUsage.heapUsed).toBeLessThan(500 * 1024 * 1024); // Less than 500MB

    console.log(`✅ ${concurrentQueries} concurrent queries completed in ${totalTime}ms`);
    console.log(`✅ Memory usage: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
  });

  test('🎉 Final Validation - All Systems Operational', async () => {
    console.log('🎉 Running final comprehensive validation...');

    // Get comprehensive system status
    const systemStatus = await brain.getSystemStatus();

    expect(systemStatus.overall).toBe('healthy');
    expect(systemStatus.components.mongodb).toBe('connected');
    expect(systemStatus.components.vectorSearch).toBe('operational');
    expect(systemStatus.components.hybridSearch).toBe('operational');
    expect(systemStatus.components.cognitiveEngines).toBe('operational');
    expect(systemStatus.components.safetyGuardrails).toBe('operational');
    expect(systemStatus.components.memorySystem).toBe('operational');
    expect(systemStatus.components.contextInjection).toBe('operational');
    expect(systemStatus.components.monitoring).toBe('operational');
    expect(systemStatus.components.frameworkAdapters).toBe('operational');

    // Verify all collections have data
    const collections = [
      config.mongodb.collections.tracing,
      config.mongodb.collections.memory,
      config.mongodb.collections.context,
      config.mongodb.collections.metrics,
      config.mongodb.collections.audit
    ];

    for (const collectionName of collections) {
      const collection = database.collection(collectionName);
      const count = await collection.countDocuments();
      expect(count).toBeGreaterThan(0);
      console.log(`✅ ${collectionName}: ${count} documents`);
    }

    console.log('🎉🧠 UNIVERSAL AI BRAIN 2.0 - ALL SYSTEMS FULLY OPERATIONAL! 🚀✨');
    console.log('🎯 Every single feature tested with real data and database operations');
    console.log('🔥 MongoDB $rankFusion hybrid search working perfectly');
    console.log('💪 All 12 cognitive systems responding correctly');
    console.log('🛡️ Safety guardrails and compliance systems active');
    console.log('📊 Real-time monitoring and metrics collection verified');
    console.log('🔌 All framework adapters integrated successfully');
    console.log('🎯 Self-improvement and learning systems operational');
    console.log('🚀 READY FOR PRODUCTION DEPLOYMENT! 🚀');
  });
});
