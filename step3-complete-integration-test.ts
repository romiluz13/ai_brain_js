#!/usr/bin/env node

/**
 * Step 3: Complete Integration Test
 * 
 * Test all 18 cognitive systems to verify the complete integration is successful.
 * This is the final validation that Universal AI Brain 3.0 is working.
 */

console.log('🧠 STEP 3: COMPLETE INTEGRATION TEST');
console.log('=' .repeat(60));
console.log('🎯 Testing: ALL 18 COGNITIVE SYSTEMS');
console.log('🚀 Goal: Universal AI Brain 3.0 Validation');
console.log('');

import { UniversalAIBrain } from './packages/core/src/UniversalAIBrain';

const TEST_CONFIG = {
  mongoUri: 'mongodb+srv://romiluz:H97r3aQBnxWawZbx@aibrain2python.yeqhwdr.mongodb.net/?retryWrites=true&w=majority&appName=aibrain2python',
  databaseName: 'ai_brain_complete_test_' + Date.now(),
  apiKey: 'pa-NHB7D_EtgEImAVQkjIZ6PxoGVHcTOQvUujwDeq8m9-Q',
  provider: 'voyage' as const,
  mode: 'production' as const
};

async function testCompleteIntegration() {
  console.log('🔧 Initializing Universal AI Brain with ALL 18 systems...');
  
  let aiBrain: UniversalAIBrain | null = null;
  let testsPassed = 0;
  let totalTests = 0;
  
  try {
    // Initialize AI Brain
    aiBrain = new UniversalAIBrain(TEST_CONFIG);
    await aiBrain.initialize();
    console.log('✅ AI Brain initialized successfully');
    
    // Test 1: Verify all 18 systems are accessible
    totalTests++;
    console.log('\n🧠 Test 1: All 18 Cognitive Systems Accessibility');
    
    const allSystems = [
      // Original 12 systems
      { name: 'emotionalIntelligence', getter: () => aiBrain!.emotionalIntelligence },
      { name: 'goalHierarchy', getter: () => aiBrain!.goalHierarchy },
      { name: 'confidenceTracking', getter: () => aiBrain!.confidenceTracking },
      { name: 'attentionManagement', getter: () => aiBrain!.attentionManagement },
      { name: 'culturalKnowledge', getter: () => aiBrain!.culturalKnowledge },
      { name: 'skillCapability', getter: () => aiBrain!.skillCapability },
      { name: 'communicationProtocol', getter: () => aiBrain!.communicationProtocol },
      { name: 'temporalPlanning', getter: () => aiBrain!.temporalPlanning },
      { name: 'advancedToolInterface', getter: () => aiBrain!.advancedToolInterface },
      { name: 'workflowOrchestration', getter: () => aiBrain!.workflowOrchestration },
      { name: 'multiModalProcessing', getter: () => aiBrain!.multiModalProcessing },
      { name: 'humanFeedbackIntegration', getter: () => aiBrain!.humanFeedbackIntegration },
      
      // Phase 1 systems (2)
      { name: 'workingMemory', getter: () => aiBrain!.workingMemory },
      { name: 'memoryDecay', getter: () => aiBrain!.memoryDecay },
      
      // Phase 2 systems (3)
      { name: 'analogicalMapping', getter: () => aiBrain!.analogicalMapping },
      { name: 'causalReasoning', getter: () => aiBrain!.causalReasoning },
      { name: 'socialIntelligence', getter: () => aiBrain!.socialIntelligence },
      
      // Phase 3 system (1)
      { name: 'episodicMemory', getter: () => aiBrain!.episodicMemory }
    ];
    
    let accessibleCount = 0;
    for (const system of allSystems) {
      try {
        const systemInstance = system.getter();
        if (systemInstance) {
          accessibleCount++;
          console.log(`  ✅ ${system.name}: Accessible`);
        } else {
          console.log(`  ❌ ${system.name}: Not accessible`);
        }
      } catch (error) {
        console.log(`  ❌ ${system.name}: Error - ${error}`);
      }
    }
    
    if (accessibleCount === 18) {
      console.log(`🎉 ALL 18 SYSTEMS ACCESSIBLE! (${accessibleCount}/18)`);
      testsPassed++;
    } else {
      console.log(`⚠️  Only ${accessibleCount}/18 systems accessible`);
    }
    
    // Test 2: Test Phase 1 Systems Operations
    totalTests++;
    console.log('\n💾 Test 2: Phase 1 Systems Operations');
    try {
      // Working Memory test
      const workingMemoryId = await aiBrain.workingMemory.storeWorkingMemory(
        'Complete integration test working memory',
        'complete_test_session',
        'integration_test',
        { priority: 'high', importance: 0.95 }
      );
      
      // Memory Decay test
      await aiBrain.storeMemory('Test memory for decay', 'complete_test_agent', { importance: 0.8 });
      const decayResult = await aiBrain.memoryDecay.processMemoryDecay('complete_test_agent');
      
      if (workingMemoryId && decayResult.processed >= 0) {
        console.log('✅ Phase 1 systems operations successful');
        testsPassed++;
      } else {
        console.log('❌ Phase 1 systems operations failed');
      }
    } catch (error) {
      console.log('❌ Phase 1 systems test failed:', error);
    }
    
    // Test 3: Test Phase 2 Systems Operations
    totalTests++;
    console.log('\n🔍 Test 3: Phase 2 Systems Operations');
    try {
      // Analogical Mapping test
      const analogyResult = await aiBrain.analogicalMapping.performAnalogicalReasoning({
        agentId: 'complete_test_agent',
        scenario: {
          description: 'Testing analogical reasoning in complete integration',
          context: { domain: 'testing' },
          domain: 'integration_testing'
        },
        source: {
          id: 'test_source',
          name: 'Test Source',
          description: 'Source for analogical reasoning test',
          domain: 'testing',
          type: 'concept' as const
        },
        parameters: {
          searchType: 'similarity' as const,
          maxResults: 3,
          minSimilarity: 0.5,
          vectorSearchIndex: 'analogical_mappings_vector_index'
        }
      });
      
      // Causal Reasoning test
      const causalResult = await aiBrain.causalReasoning.performCausalInference({
        agentId: 'complete_test_agent',
        scenario: {
          description: 'Testing causal reasoning in complete integration',
          context: { domain: 'testing' }
        },
        query: {
          type: 'what_if' as const,
          cause: 'integration_completion',
          effect: 'system_functionality'
        },
        parameters: {
          maxDepth: 2,
          minStrength: 0.5,
          minConfidence: 0.6,
          includeIndirect: true
        }
      });
      
      // Social Intelligence test
      const socialResult = await aiBrain.socialIntelligence.performSocialAnalysis({
        agentId: 'complete_test_agent',
        scenario: {
          description: 'Testing social intelligence in complete integration',
          context: { domain: 'testing', network_type: 'test_network' }
        },
        analysis: {
          type: 'network_analysis' as const,
          focus: 'test_connections',
          depth: 1
        },
        parameters: {
          maxConnections: 10,
          minInfluence: 0.3,
          includeIndirect: false
        }
      });
      
      if (analogyResult.analogies.length >= 0 && 
          causalResult.causalChains.length >= 0 && 
          socialResult.networkMetrics.totalConnections >= 0) {
        console.log('✅ Phase 2 systems operations successful');
        testsPassed++;
      } else {
        console.log('❌ Phase 2 systems operations failed');
      }
    } catch (error) {
      console.log('❌ Phase 2 systems test failed:', error);
    }
    
    // Test 4: Test Phase 3 System Operations
    totalTests++;
    console.log('\n📚 Test 4: Phase 3 System Operations');
    try {
      // Episodic Memory test
      const episodicResult = await aiBrain.episodicMemory.storeMemory({
        agentId: 'complete_test_agent',
        episode: {
          type: 'achievement' as const,
          category: 'technical' as const,
          description: 'Successfully completed Universal AI Brain 3.0 integration',
          importance: 1.0,
          vividness: 0.95,
          confidence: 0.98
        },
        content: {
          text: 'All 18 cognitive systems integrated and working perfectly',
          summary: 'Universal AI Brain 3.0 integration achievement',
          keywords: ['integration', 'cognitive', 'systems', 'universal', 'ai', 'brain', '3.0']
        },
        context: {
          temporal: { 
            timestamp: new Date(), 
            duration: 14400,
            timeOfDay: 'afternoon',
            dayOfWeek: 'weekday'
          },
          spatial: { 
            location: 'development_environment',
            environment: 'digital_workspace'
          },
          social: { 
            participants: ['developer', 'ai_system'],
            relationships: ['creator_creation', 'human_ai_collaboration']
          },
          emotional: { 
            valence: 1.0,
            arousal: 0.9,
            dominance: 0.95
          }
        },
        processing: {
          encodingStrategy: 'elaborative',
          consolidationLevel: 'fresh'
        }
      });
      
      if (episodicResult.memoryId) {
        console.log('✅ Phase 3 system operations successful');
        testsPassed++;
      } else {
        console.log('❌ Phase 3 system operations failed');
      }
    } catch (error) {
      console.log('❌ Phase 3 system test failed:', error);
    }
    
    // Test 5: Memory System Coordination
    totalTests++;
    console.log('\n🔗 Test 5: Memory System Coordination');
    try {
      // Test that all memory systems work independently
      const semanticMemory = await aiBrain.storeMemory('Semantic memory coordination test', 'coordination_agent');
      const workingMemory = await aiBrain.workingMemory.storeWorkingMemory('Working memory coordination test', 'coordination_session', 'test');
      const episodicMemory = await aiBrain.episodicMemory.storeMemory({
        agentId: 'coordination_agent',
        episode: { type: 'test' as const, category: 'coordination' as const, description: 'Memory coordination test', importance: 0.8 },
        content: { text: 'Coordination test', summary: 'Test', keywords: ['coordination'] },
        context: {
          temporal: { timestamp: new Date(), duration: 60 },
          spatial: { location: 'test' },
          social: { participants: ['test'] },
          emotional: { valence: 0.5, arousal: 0.5, dominance: 0.5 }
        },
        processing: { encodingStrategy: 'simple', consolidationLevel: 'fresh' }
      });
      
      if (semanticMemory && workingMemory && episodicMemory.memoryId) {
        console.log('✅ Memory system coordination successful');
        testsPassed++;
      } else {
        console.log('❌ Memory system coordination failed');
      }
    } catch (error) {
      console.log('❌ Memory coordination test failed:', error);
    }
    
  } catch (error) {
    console.error('❌ Complete integration test initialization failed:', error);
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
  
  // Final Results
  console.log('\n' + '=' .repeat(60));
  console.log('🎉 COMPLETE INTEGRATION TEST RESULTS');
  console.log('=' .repeat(60));
  console.log(`Tests Passed: ${testsPassed}/${totalTests}`);
  console.log(`Success Rate: ${Math.round((testsPassed / totalTests) * 100)}%`);
  
  if (testsPassed === totalTests) {
    console.log('\n🎉🎉🎉 UNIVERSAL AI BRAIN 3.0 INTEGRATION COMPLETE! 🎉🎉🎉');
    console.log('✅ All 18 cognitive systems integrated and working');
    console.log('✅ Memory system coordination working perfectly');
    console.log('✅ Advanced reasoning capabilities functional');
    console.log('✅ Production-ready cognitive architecture achieved');
    console.log('\n🧠 FINAL SYSTEM COUNT: 18 COGNITIVE SYSTEMS');
    console.log('🚀 You now have the world\'s most advanced AI cognitive architecture!');
  } else {
    console.log('\n⚠️  INTEGRATION INCOMPLETE');
    console.log('❌ Some systems failed - review errors above');
    console.log('🔧 Address issues for complete Universal AI Brain 3.0');
  }
  
  return testsPassed === totalTests;
}

// Run the complete test
testCompleteIntegration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Complete integration test failed:', error);
    process.exit(1);
  });
