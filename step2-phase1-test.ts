#!/usr/bin/env node

/**
 * Step 2: Phase 1 Integration Test
 * 
 * Test the integration of WorkingMemoryManager and MemoryDecayEngine
 * These are low-risk systems that use existing collections.
 */

console.log('🧠 STEP 2: PHASE 1 INTEGRATION TEST');
console.log('=' .repeat(50));
console.log('🎯 Testing: WorkingMemoryManager & MemoryDecayEngine');
console.log('📊 Risk Level: LOW (uses existing collections)');
console.log('');

import { UniversalAIBrain } from './packages/core/src/UniversalAIBrain';

const TEST_CONFIG = {
  mongoUri: 'mongodb+srv://romiluz:H97r3aQBnxWawZbx@aibrain2python.yeqhwdr.mongodb.net/?retryWrites=true&w=majority&appName=aibrain2python',
  databaseName: 'ai_brain_phase1_test_' + Date.now(),
  apiKey: 'pa-NHB7D_EtgEImAVQkjIZ6PxoGVHcTOQvUujwDeq8m9-Q',
  provider: 'voyage' as const
};

async function testPhase1Integration() {
  console.log('🔧 Initializing Universal AI Brain with Phase 1 systems...');
  
  let aiBrain: UniversalAIBrain | null = null;
  let testsPassed = 0;
  let totalTests = 0;
  
  try {
    // Initialize AI Brain
    aiBrain = new UniversalAIBrain(TEST_CONFIG);
    await aiBrain.initialize();
    console.log('✅ AI Brain initialized successfully');
    
    // Test 1: Verify WorkingMemoryManager is accessible
    totalTests++;
    console.log('\n📝 Test 1: WorkingMemoryManager Accessibility');
    try {
      const workingMemory = aiBrain.workingMemory;
      if (workingMemory) {
        console.log('✅ WorkingMemoryManager is accessible');
        testsPassed++;
      } else {
        console.log('❌ WorkingMemoryManager is not accessible');
      }
    } catch (error) {
      console.log('❌ WorkingMemoryManager access failed:', error);
    }
    
    // Test 2: Verify MemoryDecayEngine is accessible
    totalTests++;
    console.log('\n🔄 Test 2: MemoryDecayEngine Accessibility');
    try {
      const memoryDecay = aiBrain.memoryDecay;
      if (memoryDecay) {
        console.log('✅ MemoryDecayEngine is accessible');
        testsPassed++;
      } else {
        console.log('❌ MemoryDecayEngine is not accessible');
      }
    } catch (error) {
      console.log('❌ MemoryDecayEngine access failed:', error);
    }
    
    // Test 3: Test WorkingMemory operations
    totalTests++;
    console.log('\n💾 Test 3: Working Memory Operations');
    try {
      const memoryId = await aiBrain.workingMemory.storeWorkingMemory(
        'Phase 1 test working memory content',
        'phase1_test_session',
        'integration_test',
        { priority: 'high', importance: 0.9, ttlMinutes: 60 }
      );
      
      if (memoryId) {
        console.log('✅ Working memory storage successful');
        
        // Test retrieval
        const memories = await aiBrain.workingMemory.getWorkingMemories('phase1_test_session');
        if (memories.length > 0) {
          console.log(`✅ Working memory retrieval successful (${memories.length} memories)`);
          testsPassed++;
        } else {
          console.log('❌ Working memory retrieval failed - no memories found');
        }
      } else {
        console.log('❌ Working memory storage failed');
      }
    } catch (error) {
      console.log('❌ Working memory operations failed:', error);
    }
    
    // Test 4: Test MemoryDecay operations
    totalTests++;
    console.log('\n📉 Test 4: Memory Decay Operations');
    try {
      // Create test memories with different importance levels
      await aiBrain.storeMemory('High importance test memory', 'phase1_decay_agent', { importance: 0.9 });
      await aiBrain.storeMemory('Low importance test memory', 'phase1_decay_agent', { importance: 0.1 });
      
      // Test decay processing
      const decayResult = await aiBrain.memoryDecay.processMemoryDecay('phase1_decay_agent');
      if (decayResult.processed >= 0) {
        console.log(`✅ Memory decay processing successful (${decayResult.processed} memories processed)`);
        
        // Test decay statistics
        const stats = await aiBrain.memoryDecay.getDecayStatistics('phase1_decay_agent');
        if (stats.totalMemories >= 0) {
          console.log('✅ Decay statistics generation working');
          testsPassed++;
        } else {
          console.log('❌ Decay statistics failed');
        }
      } else {
        console.log('❌ Memory decay processing failed');
      }
    } catch (error) {
      console.log('❌ Memory decay operations failed:', error);
    }
    
    // Test 5: Verify existing systems still work
    totalTests++;
    console.log('\n🔗 Test 5: Existing Systems Compatibility');
    try {
      // Test that original 12 systems are still accessible
      const existingSystems = [
        'emotionalIntelligence', 'goalHierarchy', 'confidenceTracking', 'attentionManagement',
        'culturalKnowledge', 'skillCapability', 'communicationProtocol', 'temporalPlanning',
        'advancedToolInterface', 'workflowOrchestration', 'multiModalProcessing', 'humanFeedbackIntegration'
      ];
      
      let accessibleCount = 0;
      for (const systemName of existingSystems) {
        try {
          const system = (aiBrain as any)[systemName];
          if (system) accessibleCount++;
        } catch (error) {
          // System not accessible
        }
      }
      
      if (accessibleCount === 12) {
        console.log('✅ All 12 existing systems still accessible');
        
        // Test basic memory operations still work
        const memoryTest = await aiBrain.storeMemory('Integration compatibility test', 'integration_agent');
        if (memoryTest) {
          console.log('✅ Basic memory operations still functional');
          testsPassed++;
        } else {
          console.log('❌ Basic memory operations failed');
        }
      } else {
        console.log(`❌ Only ${accessibleCount}/12 existing systems accessible`);
      }
    } catch (error) {
      console.log('❌ Existing systems compatibility test failed:', error);
    }
    
  } catch (error) {
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
  
  // Results
  console.log('\n' + '=' .repeat(50));
  console.log('📊 PHASE 1 TEST RESULTS');
  console.log('=' .repeat(50));
  console.log(`Tests Passed: ${testsPassed}/${totalTests}`);
  console.log(`Success Rate: ${Math.round((testsPassed / totalTests) * 100)}%`);
  
  if (testsPassed === totalTests) {
    console.log('🎉 PHASE 1 INTEGRATION SUCCESSFUL!');
    console.log('✅ WorkingMemoryManager integrated and working');
    console.log('✅ MemoryDecayEngine integrated and working');
    console.log('✅ All existing systems still functional');
    console.log('✅ Ready to proceed to Phase 2');
    console.log('\n🧠 Current System Count: 14 (12 original + 2 Phase 1)');
  } else {
    console.log('⚠️  PHASE 1 INTEGRATION INCOMPLETE');
    console.log('❌ Some tests failed - review errors above');
    console.log('🔧 Fix issues before proceeding to Phase 2');
  }
  
  return testsPassed === totalTests;
}

// Run the test
testPhase1Integration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Phase 1 test failed:', error);
    process.exit(1);
  });
