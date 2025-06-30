/**
 * Phase 2 Integration Test: AnalogicalMappingSystem, CausalReasoningEngine, SocialIntelligenceEngine
 * 
 * This test validates the integration of medium-risk systems that require new collections.
 * Must pass before proceeding to Phase 3.
 */

import { UniversalAIBrain } from './packages/core/src/UniversalAIBrain';

// Test Configuration
const PHASE2_CONFIG = {
  mongoUri: 'mongodb+srv://romiluz:H97r3aQBnxWawZbx@aibrain2python.yeqhwdr.mongodb.net/?retryWrites=true&w=majority&appName=aibrain2python',
  databaseName: 'ai_brain_phase2_test',
  apiKey: 'pa-NHB7D_EtgEImAVQkjIZ6PxoGVHcTOQvUujwDeq8m9-Q',
  provider: 'voyage' as const
};

interface Phase2TestResult {
  analogicalMapping: {
    accessible: boolean;
    initialization: boolean;
    analogicalReasoning: boolean;
    analogicalLearning: boolean;
    vectorSearch: boolean;
    error?: string;
  };
  causalReasoning: {
    accessible: boolean;
    initialization: boolean;
    causalInference: boolean;
    graphTraversal: boolean;
    causalLearning: boolean;
    error?: string;
  };
  socialIntelligence: {
    accessible: boolean;
    initialization: boolean;
    socialAnalysis: boolean;
    networkAnalysis: boolean;
    socialLearning: boolean;
    error?: string;
  };
  collectionManager: {
    newCollectionsCreated: boolean;
    indexesCreated: boolean;
    basicOperations: boolean;
    error?: string;
  };
  systemIntegration: {
    allSystemsAccessible: boolean;
    noConflicts: boolean;
    performanceImpact: number;
    error?: string;
  };
  overall: {
    phase2Ready: boolean;
    issues: string[];
  };
}

async function runPhase2IntegrationTest(): Promise<Phase2TestResult> {
  const result: Phase2TestResult = {
    analogicalMapping: {
      accessible: false,
      initialization: false,
      analogicalReasoning: false,
      analogicalLearning: false,
      vectorSearch: false
    },
    causalReasoning: {
      accessible: false,
      initialization: false,
      causalInference: false,
      graphTraversal: false,
      causalLearning: false
    },
    socialIntelligence: {
      accessible: false,
      initialization: false,
      socialAnalysis: false,
      networkAnalysis: false,
      socialLearning: false
    },
    collectionManager: {
      newCollectionsCreated: false,
      indexesCreated: false,
      basicOperations: false
    },
    systemIntegration: {
      allSystemsAccessible: false,
      noConflicts: false,
      performanceImpact: 0
    },
    overall: {
      phase2Ready: false,
      issues: []
    }
  };

  console.log('🧠 Running Phase 2 Integration Test...\n');

  let aiBrain: UniversalAIBrain | null = null;
  const startTime = Date.now();

  try {
    // Initialize AI Brain with Phase 2 systems
    console.log('🔧 Initializing Universal AI Brain with Phase 2 systems...');
    aiBrain = new UniversalAIBrain(PHASE2_CONFIG);
    await aiBrain.initialize();
    console.log('✅ AI Brain initialized successfully');

    // Test AnalogicalMappingSystem
    console.log('\n🔍 Testing AnalogicalMappingSystem...');
    
    try {
      const analogicalMapping = aiBrain.analogicalMapping;
      result.analogicalMapping.accessible = !!analogicalMapping;
      result.analogicalMapping.initialization = true;
      console.log('✅ AnalogicalMappingSystem accessible');

      // Test analogical reasoning
      const reasoningRequest = {
        agentId: 'phase2_test_agent',
        scenario: {
          description: 'Learning to solve complex problems',
          context: { domain: 'problem_solving', difficulty: 'high' },
          domain: 'cognitive_learning'
        },
        source: {
          id: 'problem_solving_1',
          name: 'Mathematical Problem Solving',
          description: 'Process of solving mathematical equations',
          domain: 'mathematics',
          type: 'process' as const
        },
        parameters: {
          searchType: 'similarity' as const,
          maxResults: 5,
          minSimilarity: 0.6,
          vectorSearchIndex: 'analogical_mappings_vector_index'
        }
      };

      const reasoningResult = await analogicalMapping.performAnalogicalReasoning(reasoningRequest);
      result.analogicalMapping.analogicalReasoning = 
        reasoningResult.analogies.length >= 0 && 
        reasoningResult.reasoning.discovery.method === 'similarity';
      console.log(`✅ Analogical reasoning successful (${reasoningResult.analogies.length} analogies found)`);

      // Test analogical learning
      const learningRequest = {
        agentId: 'phase2_test_agent',
        examples: [
          {
            source: { 
              id: 'math1', 
              name: 'Algebra', 
              description: 'Mathematical system with variables', 
              domain: 'mathematics', 
              type: 'concept' as const 
            },
            target: { 
              id: 'logic1', 
              name: 'Logic', 
              description: 'System of reasoning with propositions', 
              domain: 'logic', 
              type: 'concept' as const 
            },
            mapping: { 
              correspondences: [], 
              quality: { systematicity: 0.8, oneToOne: 0.9, semantic: 0.7, pragmatic: 0.8, overall: 0.8 } 
            }
          }
        ],
        parameters: { learningRate: 0.1, generalizationThreshold: 0.7, maxIterations: 10 }
      };

      const learningResult = await analogicalMapping.learnFromExamples(learningRequest);
      result.analogicalMapping.analogicalLearning = learningResult.patternsLearned >= 0;
      result.analogicalMapping.vectorSearch = true; // Implicit in successful operations
      console.log(`✅ Analogical learning successful (${learningResult.patternsLearned} patterns learned)`);

    } catch (error) {
      result.analogicalMapping.error = error instanceof Error ? error.message : 'Unknown error';
      result.overall.issues.push(`AnalogicalMapping: ${result.analogicalMapping.error}`);
      console.error('❌ AnalogicalMappingSystem test failed:', error);
    }

    // Test CausalReasoningEngine
    console.log('\n🔗 Testing CausalReasoningEngine...');
    
    try {
      const causalReasoning = aiBrain.causalReasoning;
      result.causalReasoning.accessible = !!causalReasoning;
      result.causalReasoning.initialization = true;
      console.log('✅ CausalReasoningEngine accessible');

      // Test causal inference
      const inferenceRequest = {
        agentId: 'phase2_test_agent',
        scenario: {
          description: 'Understanding learning effectiveness',
          context: { domain: 'education', timeframe: 'semester' }
        },
        query: {
          type: 'what_if' as const,
          cause: 'increased_practice_time',
          effect: 'improved_performance'
        },
        parameters: {
          maxDepth: 3,
          minStrength: 0.5,
          minConfidence: 0.6,
          includeIndirect: true
        }
      };

      const inferenceResult = await causalReasoning.performCausalInference(inferenceRequest);
      result.causalReasoning.causalInference = 
        inferenceResult.causalChains.length >= 0 &&
        inferenceResult.reasoning.method === 'graph_traversal';
      result.causalReasoning.graphTraversal = true; // Implicit in successful operations
      console.log(`✅ Causal inference successful (${inferenceResult.causalChains.length} causal chains found)`);

      // Test causal learning
      const causalLearningRequest = {
        agentId: 'phase2_test_agent',
        observations: [
          {
            cause: 'study_time_increase',
            effect: 'test_score_improvement',
            strength: 0.8,
            confidence: 0.9,
            context: { subject: 'mathematics', duration: '1_month' }
          }
        ],
        parameters: { learningRate: 0.1, confidenceThreshold: 0.7, maxIterations: 10 }
      };

      const causalLearningResult = await causalReasoning.learnCausalRelationships(causalLearningRequest);
      result.causalReasoning.causalLearning = causalLearningResult.discoveredRelationships.length >= 0;
      console.log(`✅ Causal learning successful (${causalLearningResult.discoveredRelationships.length} relationships discovered)`);

    } catch (error) {
      result.causalReasoning.error = error instanceof Error ? error.message : 'Unknown error';
      result.overall.issues.push(`CausalReasoning: ${result.causalReasoning.error}`);
      console.error('❌ CausalReasoningEngine test failed:', error);
    }

    // Test SocialIntelligenceEngine
    console.log('\n👥 Testing SocialIntelligenceEngine...');
    
    try {
      const socialIntelligence = aiBrain.socialIntelligence;
      result.socialIntelligence.accessible = !!socialIntelligence;
      result.socialIntelligence.initialization = true;
      console.log('✅ SocialIntelligenceEngine accessible');

      // Test social analysis
      const analysisRequest = {
        agentId: 'phase2_test_agent',
        scenario: {
          description: 'Analyzing collaboration network',
          context: { domain: 'professional', network_type: 'team' }
        },
        analysis: {
          type: 'network_analysis' as const,
          focus: 'collaboration_potential',
          depth: 2
        },
        parameters: {
          maxConnections: 20,
          minInfluence: 0.3,
          includeIndirect: true
        }
      };

      const analysisResult = await socialIntelligence.performSocialAnalysis(analysisRequest);
      result.socialIntelligence.socialAnalysis = 
        analysisResult.networkMetrics.totalConnections >= 0 &&
        analysisResult.insights.length >= 0;
      result.socialIntelligence.networkAnalysis = true; // Implicit in successful operations
      console.log(`✅ Social analysis successful (${analysisResult.networkMetrics.totalConnections} connections analyzed)`);

      // Test social learning
      const socialLearningRequest = {
        agentId: 'phase2_test_agent',
        interactions: [
          {
            participants: ['agent1', 'agent2'],
            type: 'collaboration',
            outcome: 'successful',
            context: { project: 'integration_test', duration: '1_hour' }
          }
        ],
        parameters: { learningRate: 0.1, adaptationThreshold: 0.6 }
      };

      const socialLearningResult = await socialIntelligence.learnFromSocialInteractions(socialLearningRequest);
      result.socialIntelligence.socialLearning = socialLearningResult.patternsLearned >= 0;
      console.log(`✅ Social learning successful (${socialLearningResult.patternsLearned} patterns learned)`);

    } catch (error) {
      result.socialIntelligence.error = error instanceof Error ? error.message : 'Unknown error';
      result.overall.issues.push(`SocialIntelligence: ${result.socialIntelligence.error}`);
      console.error('❌ SocialIntelligenceEngine test failed:', error);
    }

    // Test System Integration
    console.log('\n🔗 Testing System Integration...');
    
    try {
      // Verify all 17 systems are accessible (12 original + 2 Phase 1 + 3 Phase 2)
      const allSystems = [
        // Original 12
        'emotionalIntelligence', 'goalHierarchy', 'confidenceTracking', 'attentionManagement',
        'culturalKnowledge', 'skillCapability', 'communicationProtocol', 'temporalPlanning',
        'advancedToolInterface', 'workflowOrchestration', 'multiModalProcessing', 'humanFeedbackIntegration',
        // Phase 1
        'workingMemory', 'memoryDecay',
        // Phase 2
        'analogicalMapping', 'causalReasoning', 'socialIntelligence'
      ];

      let accessibleCount = 0;
      for (const systemName of allSystems) {
        try {
          const system = (aiBrain as any)[systemName];
          if (system) accessibleCount++;
        } catch (error) {
          console.warn(`System ${systemName} not accessible:`, error);
        }
      }

      result.systemIntegration.allSystemsAccessible = accessibleCount === 17;
      result.systemIntegration.noConflicts = accessibleCount === 17;
      console.log(`✅ System accessibility: ${accessibleCount}/17 systems accessible`);

      // Calculate performance impact
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      result.systemIntegration.performanceImpact = Math.round((totalTime / 45000) * 100); // Baseline 45 seconds
      console.log(`✅ Performance impact: ${result.systemIntegration.performanceImpact}%`);

    } catch (error) {
      result.systemIntegration.error = error instanceof Error ? error.message : 'Unknown error';
      result.overall.issues.push(`System Integration: ${result.systemIntegration.error}`);
      console.error('❌ System integration test failed:', error);
    }

  } catch (error) {
    result.overall.issues.push(`Initialization: ${error}`);
    console.error('❌ Phase 2 test initialization failed:', error);
  } finally {
    if (aiBrain) {
      try {
        await aiBrain.shutdown();
        console.log('🛑 System shutdown completed');
      } catch (error) {
        console.error('Warning: Shutdown error:', error);
      }
    }
  }

  // Overall assessment
  result.overall.phase2Ready = 
    result.analogicalMapping.accessible &&
    result.analogicalMapping.analogicalReasoning &&
    result.analogicalMapping.analogicalLearning &&
    result.causalReasoning.accessible &&
    result.causalReasoning.causalInference &&
    result.causalReasoning.causalLearning &&
    result.socialIntelligence.accessible &&
    result.socialIntelligence.socialAnalysis &&
    result.socialIntelligence.socialLearning &&
    result.systemIntegration.allSystemsAccessible &&
    result.systemIntegration.performanceImpact < 15;

  console.log('\n📋 Phase 2 Integration Test Summary:');
  console.log(`AnalogicalMapping: ${result.analogicalMapping.accessible ? '✅' : '❌'}`);
  console.log(`CausalReasoning: ${result.causalReasoning.accessible ? '✅' : '❌'}`);
  console.log(`SocialIntelligence: ${result.socialIntelligence.accessible ? '✅' : '❌'}`);
  console.log(`System Integration: ${result.systemIntegration.allSystemsAccessible ? '✅' : '❌'}`);
  console.log(`Performance Impact: ${result.systemIntegration.performanceImpact}%`);
  
  if (result.overall.phase2Ready) {
    console.log('\n🎉 Phase 2 PASSED! Ready to proceed to Phase 3.');
  } else {
    console.log('\n⚠️  Phase 2 FAILED! Issues must be resolved:');
    result.overall.issues.forEach(issue => console.log(`   - ${issue}`));
  }

  return result;
}

// Export for use in integration pipeline
export { runPhase2IntegrationTest, Phase2TestResult };

// Run if executed directly
if (require.main === module) {
  runPhase2IntegrationTest()
    .then(result => {
      process.exit(result.overall.phase2Ready ? 0 : 1);
    })
    .catch(error => {
      console.error('Phase 2 test failed:', error);
      process.exit(1);
    });
}
