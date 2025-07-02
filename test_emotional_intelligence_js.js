/**
 * COMPREHENSIVE TEST SUITE FOR EMOTIONAL INTELLIGENCE ENGINE
 * 
 * This test suite validates the complete functionality of the EmotionalIntelligenceEngine
 * by testing real emotional analysis, pattern matching, and response generation.
 */

const { MongoClient } = require('mongodb');
const { EmotionalIntelligenceEngine } = require('./packages/core/src/intelligence/EmotionalIntelligenceEngine');

class EmotionalIntelligenceTest {
  constructor() {
    this.db = null;
    this.engine = null;
    this.testResults = [];
  }

  async setup() {
    console.log('🔧 Setting up EmotionalIntelligenceEngine test...');
    
    // Connect to MongoDB (use test database)
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
    await client.connect();
    this.db = client.db('ai_brain_test');
    
    // Initialize engine
    this.engine = new EmotionalIntelligenceEngine(this.db);
    await this.engine.initialize();
    
    console.log('✅ Setup complete');
  }

  async testEmotionDetection() {
    console.log('\n🧪 Testing Emotion Detection...');
    
    const testCases = [
      {
        name: 'Joy Detection',
        input: 'I am so happy and excited about this amazing project!',
        expectedPrimary: 'joy',
        expectedValence: 'positive'
      },
      {
        name: 'Anger Detection',
        input: 'I am really frustrated and angry about this terrible situation!',
        expectedPrimary: 'anger',
        expectedValence: 'negative'
      },
      {
        name: 'Fear Detection',
        input: 'I am scared and worried about what might happen next.',
        expectedPrimary: 'fear',
        expectedValence: 'negative'
      },
      {
        name: 'Neutral Detection',
        input: 'The weather is cloudy today.',
        expectedPrimary: 'neutral',
        expectedValence: 'neutral'
      },
      {
        name: 'Mixed Emotions',
        input: 'I am excited but also nervous about the presentation tomorrow.',
        expectedPrimary: ['anticipation', 'fear'], // Could be either
        expectedValence: 'mixed'
      }
    ];

    for (const testCase of testCases) {
      try {
        const context = {
          agentId: 'test-agent',
          sessionId: 'test-session',
          input: testCase.input,
          conversationHistory: [],
          taskContext: { type: 'general' },
          userContext: { mood: 'neutral' }
        };

        const result = await this.engine.detectEmotion(context);
        
        console.log(`\n📊 ${testCase.name}:`);
        console.log(`   Input: "${testCase.input}"`);
        console.log(`   Detected: ${result.primary} (intensity: ${result.intensity.toFixed(2)})`);
        console.log(`   Valence: ${result.valence.toFixed(2)}`);
        console.log(`   Arousal: ${result.arousal.toFixed(2)}`);
        console.log(`   Dominance: ${result.dominance.toFixed(2)}`);
        console.log(`   Confidence: ${result.confidence.toFixed(2)}`);

        // Validate results
        let passed = true;
        if (Array.isArray(testCase.expectedPrimary)) {
          passed = testCase.expectedPrimary.includes(result.primary);
        } else {
          passed = result.primary === testCase.expectedPrimary;
        }

        // Validate valence direction
        if (testCase.expectedValence === 'positive' && result.valence <= 0) passed = false;
        if (testCase.expectedValence === 'negative' && result.valence >= 0) passed = false;
        if (testCase.expectedValence === 'neutral' && Math.abs(result.valence) > 0.3) passed = false;

        this.testResults.push({
          test: testCase.name,
          passed,
          details: { expected: testCase.expectedPrimary, actual: result.primary }
        });

        console.log(`   Result: ${passed ? '✅ PASSED' : '❌ FAILED'}`);

      } catch (error) {
        console.log(`   Result: ❌ ERROR - ${error.message}`);
        this.testResults.push({
          test: testCase.name,
          passed: false,
          details: { error: error.message }
        });
      }
    }
  }

  async testEmotionalStateProcessing() {
    console.log('\n🧪 Testing Emotional State Processing...');

    try {
      const context = {
        agentId: 'test-agent',
        sessionId: 'test-session',
        input: 'I just completed a challenging project successfully!',
        conversationHistory: [],
        taskContext: { type: 'project_completion' },
        userContext: { mood: 'neutral' }
      };

      // First detect emotion
      const detectedEmotion = await this.engine.detectEmotion(context);
      
      // Then process emotional state
      const emotionalResponse = await this.engine.processEmotionalState(
        context,
        detectedEmotion,
        'project_completion',
        'task_completion'
      );

      console.log('\n📊 Emotional State Processing:');
      console.log(`   Detected Emotion: ${detectedEmotion.primary}`);
      console.log(`   Response Style: ${emotionalResponse.responseGuidance.style}`);
      console.log(`   Empathy Level: ${emotionalResponse.responseGuidance.empathyLevel}`);
      console.log(`   Cognitive Effects:`);
      console.log(`     Attention: ${emotionalResponse.cognitiveEffects.attentionModification.toFixed(2)}`);
      console.log(`     Memory: ${emotionalResponse.cognitiveEffects.memoryStrength.toFixed(2)}`);
      console.log(`     Decision: ${emotionalResponse.cognitiveEffects.decisionBias.toFixed(2)}`);

      // Validate response
      const passed = emotionalResponse.responseGuidance.style !== undefined &&
                    emotionalResponse.cognitiveEffects.attentionModification !== undefined;

      this.testResults.push({
        test: 'Emotional State Processing',
        passed,
        details: { responseStyle: emotionalResponse.responseGuidance.style }
      });

      console.log(`   Result: ${passed ? '✅ PASSED' : '❌ FAILED'}`);

    } catch (error) {
      console.log(`   Result: ❌ ERROR - ${error.message}`);
      this.testResults.push({
        test: 'Emotional State Processing',
        passed: false,
        details: { error: error.message }
      });
    }
  }

  async testEmotionalPatternAnalysis() {
    console.log('\n🧪 Testing Emotional Pattern Analysis...');

    try {
      // Simulate multiple emotional interactions
      const interactions = [
        'I am excited about this new opportunity!',
        'This is really frustrating me.',
        'I feel confident about the solution.',
        'I am worried about the deadline.',
        'This is absolutely fantastic!'
      ];

      for (const input of interactions) {
        const context = {
          agentId: 'test-agent',
          sessionId: 'pattern-test-session',
          input,
          conversationHistory: [],
          taskContext: { type: 'general' },
          userContext: { mood: 'neutral' }
        };

        const emotion = await this.engine.detectEmotion(context);
        await this.engine.processEmotionalState(context, emotion, input, 'user_input');
      }

      // Analyze patterns
      const patterns = await this.engine.analyzeEmotionalLearning('test-agent', 1);

      console.log('\n📊 Emotional Pattern Analysis:');
      console.log(`   Dominant Emotions: ${patterns.dominantEmotions.join(', ')}`);
      console.log(`   Emotional Stability: ${patterns.emotionalStability.toFixed(2)}`);
      console.log(`   Pattern Insights: ${patterns.insights.length} insights found`);

      const passed = patterns.dominantEmotions.length > 0 &&
                    patterns.emotionalStability >= 0 &&
                    patterns.insights.length > 0;

      this.testResults.push({
        test: 'Emotional Pattern Analysis',
        passed,
        details: { dominantEmotions: patterns.dominantEmotions }
      });

      console.log(`   Result: ${passed ? '✅ PASSED' : '❌ FAILED'}`);

    } catch (error) {
      console.log(`   Result: ❌ ERROR - ${error.message}`);
      this.testResults.push({
        test: 'Emotional Pattern Analysis',
        passed: false,
        details: { error: error.message }
      });
    }
  }

  async testRealWorldScenarios() {
    console.log('\n🧪 Testing Real-World Scenarios...');

    const scenarios = [
      {
        name: 'Customer Support - Angry Customer',
        input: 'This is absolutely ridiculous! Your service is terrible and I want my money back!',
        expectedResponse: 'empathetic',
        expectedIntensity: 'high'
      },
      {
        name: 'Project Management - Success',
        input: 'We just hit all our milestones ahead of schedule! The team is amazing!',
        expectedResponse: 'celebratory',
        expectedIntensity: 'high'
      },
      {
        name: 'Technical Support - Confusion',
        input: 'I am not sure how to configure this setting. Can you help me understand?',
        expectedResponse: 'helpful',
        expectedIntensity: 'low'
      }
    ];

    for (const scenario of scenarios) {
      try {
        const context = {
          agentId: 'test-agent',
          sessionId: `scenario-${scenario.name.replace(/\s+/g, '-')}`,
          input: scenario.input,
          conversationHistory: [],
          taskContext: { type: 'customer_interaction' },
          userContext: { mood: 'neutral' }
        };

        const emotion = await this.engine.detectEmotion(context);
        const response = await this.engine.processEmotionalState(context, emotion, scenario.input, 'user_input');

        console.log(`\n📊 ${scenario.name}:`);
        console.log(`   Input: "${scenario.input}"`);
        console.log(`   Emotion: ${emotion.primary} (${emotion.intensity.toFixed(2)})`);
        console.log(`   Response Style: ${response.responseGuidance.style}`);
        console.log(`   Empathy Level: ${response.responseGuidance.empathyLevel}`);

        // Basic validation - emotion should be detected with reasonable intensity
        const passed = emotion.primary !== 'neutral' || emotion.intensity > 0.1;

        this.testResults.push({
          test: scenario.name,
          passed,
          details: { emotion: emotion.primary, intensity: emotion.intensity }
        });

        console.log(`   Result: ${passed ? '✅ PASSED' : '❌ FAILED'}`);

      } catch (error) {
        console.log(`   Result: ❌ ERROR - ${error.message}`);
        this.testResults.push({
          test: scenario.name,
          passed: false,
          details: { error: error.message }
        });
      }
    }
  }

  async runAllTests() {
    try {
      await this.setup();
      await this.testEmotionDetection();
      await this.testEmotionalStateProcessing();
      await this.testEmotionalPatternAnalysis();
      await this.testRealWorldScenarios();
      
      this.printSummary();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 EMOTIONAL INTELLIGENCE ENGINE TEST SUMMARY');
    console.log('='.repeat(60));

    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    const percentage = ((passed / total) * 100).toFixed(1);

    console.log(`\n✅ Passed: ${passed}/${total} (${percentage}%)`);
    console.log(`❌ Failed: ${total - passed}/${total}`);

    console.log('\n📋 Detailed Results:');
    this.testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`   ${status} ${result.test}`);
      if (!result.passed && result.details.error) {
        console.log(`      Error: ${result.details.error}`);
      }
    });

    if (percentage >= 80) {
      console.log('\n🎉 EMOTIONAL INTELLIGENCE ENGINE IS WORKING CORRECTLY!');
    } else {
      console.log('\n⚠️  EMOTIONAL INTELLIGENCE ENGINE NEEDS ATTENTION!');
    }
  }
}

// Run the test
if (require.main === module) {
  const test = new EmotionalIntelligenceTest();
  test.runAllTests().catch(console.error);
}

module.exports = EmotionalIntelligenceTest;
