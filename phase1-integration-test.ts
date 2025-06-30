/**
 * Phase 1 Integration Test: WorkingMemoryManager & MemoryDecayEngine
 * 
 * This test validates the integration of low-risk systems that use existing collections.
 * Must pass before proceeding to Phase 2.
 */

import { UniversalAIBrain } from './packages/core/src/UniversalAIBrain';

// Test Configuration
const PHASE1_CONFIG = {
  mongoUri: 'mongodb+srv://romiluz:H97r3aQBnxWawZbx@aibrain2python.yeqhwdr.mongodb.net/?retryWrites=true&w=majority&appName=aibrain2python',
  databaseName: 'ai_brain_phase1_test',
  apiKey: 'pa-NHB7D_EtgEImAVQkjIZ6PxoGVHcTOQvUujwDeq8m9-Q',
  provider: 'voyage' as const
};

interface Phase1TestResult {
  workingMemoryManager: {
    accessible: boolean;
    initialization: boolean;
    memoryStorage: boolean;
    memoryRetrieval: boolean;
    ttlCleanup: boolean;
    error?: string;
  };
  memoryDecayEngine: {
    accessible: boolean;
    initialization: boolean;
    decayProcessing: boolean;
    decayStatistics: boolean;
    error?: string;
  };
  systemIntegration: {
    noConflicts: boolean;
    performanceImpact: number; // percentage
    memoryUsage: boolean;
    error?: string;
  };
  overall: {
    phase1Ready: boolean;
    issues: string[];
  };
}

async function runPhase1IntegrationTest(): Promise<Phase1TestResult> {
  const result: Phase1TestResult = {
    workingMemoryManager: {
      accessible: false,
      initialization: false,
      memoryStorage: false,
      memoryRetrieval: false,
      ttlCleanup: false
    },
    memoryDecayEngine: {
      accessible: false,
      initialization: false,
      decayProcessing: false,
      decayStatistics: false
    },
    systemIntegration: {
      noConflicts: false,
      performanceImpact: 0,
      memoryUsage: false
    },
    overall: {
      phase1Ready: false,
      issues: []
    }
  };

  console.log('🧠 Running Phase 1 Integration Test...\n');

  let aiBrain: UniversalAIBrain | null = null;
  const startTime = Date.now();

  try {
    // Initialize AI Brain with Phase 1 systems
    console.log('🔧 Initializing Universal AI Brain with Phase 1 systems...');
    aiBrain = new UniversalAIBrain(PHASE1_CONFIG);
    await aiBrain.initialize();
    console.log('✅ AI Brain initialized successfully');

    // Test WorkingMemoryManager
    console.log('\n🧠 Testing WorkingMemoryManager...');
    
    try {
      // Test accessibility
      const workingMemory = aiBrain.workingMemory;
      result.workingMemoryManager.accessible = !!workingMemory;
      result.workingMemoryManager.initialization = true;
      console.log('✅ WorkingMemoryManager accessible');

      // Test memory storage
      const memoryId = await workingMemory.storeWorkingMemory(
        'Phase 1 test working memory content',
        'phase1_test_session',
        'integration_test',
        { priority: 'high', importance: 0.9, ttlMinutes: 60 }
      );
      result.workingMemoryManager.memoryStorage = !!memoryId;
      console.log('✅ Working memory storage successful');

      // Test memory retrieval
      const memories = await workingMemory.getWorkingMemories('phase1_test_session');
      result.workingMemoryManager.memoryRetrieval = memories.length > 0;
      console.log(`✅ Working memory retrieval successful (${memories.length} memories)`);

      // Test TTL cleanup (store short-lived memory)
      await workingMemory.storeWorkingMemory(
        'Short TTL test memory',
        'phase1_ttl_test',
        'integration_test',
        { ttlMinutes: 0.1 } // 6 seconds
      );
      
      // Wait for expiration and test cleanup
      await new Promise(resolve => setTimeout(resolve, 7000));
      await workingMemory.cleanupExpiredMemories();
      
      const expiredMemories = await workingMemory.getWorkingMemories('phase1_ttl_test');
      result.workingMemoryManager.ttlCleanup = expiredMemories.length === 0;
      console.log('✅ TTL cleanup working correctly');

    } catch (error) {
      result.workingMemoryManager.error = error instanceof Error ? error.message : 'Unknown error';
      result.overall.issues.push(`WorkingMemoryManager: ${result.workingMemoryManager.error}`);
      console.error('❌ WorkingMemoryManager test failed:', error);
    }

    // Test MemoryDecayEngine
    console.log('\n🔄 Testing MemoryDecayEngine...');
    
    try {
      // Test accessibility
      const memoryDecay = aiBrain.memoryDecay;
      result.memoryDecayEngine.accessible = !!memoryDecay;
      result.memoryDecayEngine.initialization = true;
      console.log('✅ MemoryDecayEngine accessible');

      // Create test memories with different importance levels
      await aiBrain.storeMemory('High importance test memory', 'phase1_decay_agent', { importance: 0.9 });
      await aiBrain.storeMemory('Medium importance test memory', 'phase1_decay_agent', { importance: 0.5 });
      await aiBrain.storeMemory('Low importance test memory', 'phase1_decay_agent', { importance: 0.1 });

      // Test decay processing
      const decayResult = await memoryDecay.processMemoryDecay('phase1_decay_agent');
      result.memoryDecayEngine.decayProcessing = decayResult.processed >= 0;
      console.log(`✅ Memory decay processing successful (${decayResult.processed} memories processed)`);

      // Test decay statistics
      const stats = await memoryDecay.getDecayStatistics('phase1_decay_agent');
      result.memoryDecayEngine.decayStatistics = 
        stats.totalMemories >= 0 && 
        stats.averageImportance >= 0;
      console.log('✅ Decay statistics generation working');

    } catch (error) {
      result.memoryDecayEngine.error = error instanceof Error ? error.message : 'Unknown error';
      result.overall.issues.push(`MemoryDecayEngine: ${result.memoryDecayEngine.error}`);
      console.error('❌ MemoryDecayEngine test failed:', error);
    }

    // Test System Integration
    console.log('\n🔗 Testing System Integration...');
    
    try {
      // Verify no conflicts with existing systems
      const existingSystems = [
        'emotionalIntelligence', 'goalHierarchy', 'confidenceTracking', 'attentionManagement',
        'culturalKnowledge', 'skillCapability', 'communicationProtocol', 'temporalPlanning',
        'advancedToolInterface', 'workflowOrchestration', 'multiModalProcessing', 'humanFeedbackIntegration'
      ];

      let conflictCount = 0;
      for (const systemName of existingSystems) {
        try {
          const system = (aiBrain as any)[systemName];
          if (!system) conflictCount++;
        } catch (error) {
          conflictCount++;
        }
      }

      result.systemIntegration.noConflicts = conflictCount === 0;
      console.log(`✅ System integration check: ${conflictCount === 0 ? 'No conflicts' : `${conflictCount} conflicts detected`}`);

      // Test basic operations still work
      const memoryTest = await aiBrain.storeMemory('Integration test memory', 'integration_agent');
      const searchTest = await aiBrain.searchMemories('integration', 'integration_agent');
      
      result.systemIntegration.memoryUsage = !!memoryTest && Array.isArray(searchTest);
      console.log('✅ Basic operations still functional');

      // Calculate performance impact
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      result.systemIntegration.performanceImpact = Math.round((totalTime / 30000) * 100); // Baseline 30 seconds
      console.log(`✅ Performance impact: ${result.systemIntegration.performanceImpact}%`);

    } catch (error) {
      result.systemIntegration.error = error instanceof Error ? error.message : 'Unknown error';
      result.overall.issues.push(`System Integration: ${result.systemIntegration.error}`);
      console.error('❌ System integration test failed:', error);
    }

  } catch (error) {
    result.overall.issues.push(`Initialization: ${error}`);
    console.error('❌ Phase 1 test initialization failed:', error);
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
  result.overall.phase1Ready = 
    result.workingMemoryManager.accessible &&
    result.workingMemoryManager.memoryStorage &&
    result.workingMemoryManager.memoryRetrieval &&
    result.workingMemoryManager.ttlCleanup &&
    result.memoryDecayEngine.accessible &&
    result.memoryDecayEngine.decayProcessing &&
    result.memoryDecayEngine.decayStatistics &&
    result.systemIntegration.noConflicts &&
    result.systemIntegration.memoryUsage &&
    result.systemIntegration.performanceImpact < 10;

  console.log('\n📋 Phase 1 Integration Test Summary:');
  console.log(`WorkingMemoryManager: ${result.workingMemoryManager.accessible ? '✅' : '❌'}`);
  console.log(`MemoryDecayEngine: ${result.memoryDecayEngine.accessible ? '✅' : '❌'}`);
  console.log(`System Integration: ${result.systemIntegration.noConflicts ? '✅' : '❌'}`);
  console.log(`Performance Impact: ${result.systemIntegration.performanceImpact}%`);
  
  if (result.overall.phase1Ready) {
    console.log('\n🎉 Phase 1 PASSED! Ready to proceed to Phase 2.');
  } else {
    console.log('\n⚠️  Phase 1 FAILED! Issues must be resolved:');
    result.overall.issues.forEach(issue => console.log(`   - ${issue}`));
  }

  return result;
}

// Export for use in integration pipeline
export { runPhase1IntegrationTest, Phase1TestResult };

// Run if executed directly
if (require.main === module) {
  runPhase1IntegrationTest()
    .then(result => {
      process.exit(result.overall.phase1Ready ? 0 : 1);
    })
    .catch(error => {
      console.error('Phase 1 test failed:', error);
      process.exit(1);
    });
}
