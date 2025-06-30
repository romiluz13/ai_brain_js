/**
 * Baseline System Health Check
 * 
 * Verifies that all 12 currently integrated cognitive systems are working correctly
 * before proceeding with integration of the 6 additional systems.
 */

import { UniversalAIBrain } from './packages/core/src/UniversalAIBrain';

// Test Configuration
const TEST_CONFIG = {
  mongoUri: 'mongodb+srv://romiluz:H97r3aQBnxWawZbx@aibrain2python.yeqhwdr.mongodb.net/?retryWrites=true&w=majority&appName=aibrain2python',
  databaseName: 'ai_brain_baseline_test',
  apiKey: 'pa-NHB7D_EtgEImAVQkjIZ6PxoGVHcTOQvUujwDeq8m9-Q',
  provider: 'voyage' as const
};

interface BaselineTestResult {
  initialization: {
    success: boolean;
    error?: string;
  };
  cognitiveSystemsStatus: {
    [systemName: string]: {
      accessible: boolean;
      initialized: boolean;
      error?: string;
    };
  };
  basicOperations: {
    memoryStorage: boolean;
    contextInjection: boolean;
    vectorSearch: boolean;
    error?: string;
  };
  overall: {
    healthy: boolean;
    issues: string[];
    readyForIntegration: boolean;
  };
}

async function runBaselineSystemTest(): Promise<BaselineTestResult> {
  const result: BaselineTestResult = {
    initialization: { success: false },
    cognitiveSystemsStatus: {},
    basicOperations: {
      memoryStorage: false,
      contextInjection: false,
      vectorSearch: false
    },
    overall: {
      healthy: false,
      issues: [],
      readyForIntegration: false
    }
  };

  console.log('🧠 Running Baseline System Health Check...\n');

  let aiBrain: UniversalAIBrain | null = null;

  try {
    // Test 1: System Initialization
    console.log('🔧 Testing Universal AI Brain Initialization...');
    aiBrain = new UniversalAIBrain(TEST_CONFIG);
    await aiBrain.initialize();
    result.initialization.success = true;
    console.log('✅ Universal AI Brain initialized successfully');

    // Test 2: Verify all 12 cognitive systems are accessible
    console.log('\n🧠 Testing Cognitive Systems Accessibility...');
    
    const cognitiveSystemTests = [
      // Core 8 Cognitive Systems
      { name: 'EmotionalIntelligence', getter: () => aiBrain!.emotionalIntelligence },
      { name: 'GoalHierarchy', getter: () => aiBrain!.goalHierarchy },
      { name: 'ConfidenceTracking', getter: () => aiBrain!.confidenceTracking },
      { name: 'AttentionManagement', getter: () => aiBrain!.attentionManagement },
      { name: 'CulturalKnowledge', getter: () => aiBrain!.culturalKnowledge },
      { name: 'SkillCapability', getter: () => aiBrain!.skillCapability },
      { name: 'CommunicationProtocol', getter: () => aiBrain!.communicationProtocol },
      { name: 'TemporalPlanning', getter: () => aiBrain!.temporalPlanning },
      
      // Enhanced 4 Systems (AI Brain 2.0)
      { name: 'AdvancedToolInterface', getter: () => aiBrain!.advancedToolInterface },
      { name: 'WorkflowOrchestration', getter: () => aiBrain!.workflowOrchestration },
      { name: 'MultiModalProcessing', getter: () => aiBrain!.multiModalProcessing },
      { name: 'HumanFeedbackIntegration', getter: () => aiBrain!.humanFeedbackIntegration }
    ];

    for (const test of cognitiveSystemTests) {
      try {
        const system = test.getter();
        result.cognitiveSystemsStatus[test.name] = {
          accessible: !!system,
          initialized: true
        };
        console.log(`✅ ${test.name}: Accessible and initialized`);
      } catch (error) {
        result.cognitiveSystemsStatus[test.name] = {
          accessible: false,
          initialized: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        result.overall.issues.push(`${test.name}: ${result.cognitiveSystemsStatus[test.name].error}`);
        console.log(`❌ ${test.name}: Failed - ${result.cognitiveSystemsStatus[test.name].error}`);
      }
    }

    // Test 3: Basic Operations
    console.log('\n🔧 Testing Basic Operations...');
    
    try {
      // Test memory storage
      const memoryResult = await aiBrain.storeMemory(
        'Baseline test memory for integration verification',
        'baseline_test_agent',
        { type: 'test', importance: 0.8 }
      );
      result.basicOperations.memoryStorage = !!memoryResult;
      console.log('✅ Memory storage: Working');
    } catch (error) {
      result.basicOperations.error = `Memory storage failed: ${error}`;
      result.overall.issues.push(result.basicOperations.error);
      console.log('❌ Memory storage: Failed');
    }

    try {
      // Test context injection
      const contextResult = await aiBrain.injectContext(
        'Test context for baseline verification',
        'baseline_test_agent'
      );
      result.basicOperations.contextInjection = !!contextResult;
      console.log('✅ Context injection: Working');
    } catch (error) {
      result.basicOperations.error = `Context injection failed: ${error}`;
      result.overall.issues.push(result.basicOperations.error);
      console.log('❌ Context injection: Failed');
    }

    try {
      // Test vector search
      const searchResult = await aiBrain.searchMemories(
        'baseline test',
        'baseline_test_agent',
        { limit: 5 }
      );
      result.basicOperations.vectorSearch = Array.isArray(searchResult);
      console.log('✅ Vector search: Working');
    } catch (error) {
      result.basicOperations.error = `Vector search failed: ${error}`;
      result.overall.issues.push(result.basicOperations.error);
      console.log('❌ Vector search: Failed');
    }

  } catch (error) {
    result.initialization.error = error instanceof Error ? error.message : 'Unknown initialization error';
    result.overall.issues.push(`Initialization: ${result.initialization.error}`);
    console.error('❌ System initialization failed:', error);
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
  const accessibleSystems = Object.values(result.cognitiveSystemsStatus).filter(s => s.accessible).length;
  const totalSystems = Object.keys(result.cognitiveSystemsStatus).length;
  
  result.overall.healthy = 
    result.initialization.success &&
    accessibleSystems === 12 &&
    result.basicOperations.memoryStorage &&
    result.basicOperations.contextInjection &&
    result.basicOperations.vectorSearch;

  result.overall.readyForIntegration = result.overall.healthy && result.overall.issues.length === 0;

  console.log('\n📋 Baseline System Health Summary:');
  console.log(`Initialization: ${result.initialization.success ? '✅' : '❌'}`);
  console.log(`Cognitive Systems: ${accessibleSystems}/${totalSystems} accessible`);
  console.log(`Memory Operations: ${result.basicOperations.memoryStorage ? '✅' : '❌'}`);
  console.log(`Context Operations: ${result.basicOperations.contextInjection ? '✅' : '❌'}`);
  console.log(`Vector Search: ${result.basicOperations.vectorSearch ? '✅' : '❌'}`);
  
  if (result.overall.readyForIntegration) {
    console.log('\n🎉 Baseline system is HEALTHY and READY for integration!');
  } else {
    console.log('\n⚠️  Baseline system has issues that must be resolved:');
    result.overall.issues.forEach(issue => console.log(`   - ${issue}`));
  }

  return result;
}

// Export for use in integration tests
export { runBaselineSystemTest, BaselineTestResult };

// Run if executed directly
if (require.main === module) {
  runBaselineSystemTest()
    .then(result => {
      process.exit(result.overall.readyForIntegration ? 0 : 1);
    })
    .catch(error => {
      console.error('Baseline test failed:', error);
      process.exit(1);
    });
}
