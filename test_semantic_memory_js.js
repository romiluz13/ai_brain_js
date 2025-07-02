/**
 * COMPREHENSIVE TEST SUITE FOR SEMANTIC MEMORY ENGINE WITH HYBRID SEARCH
 * 
 * This test validates the core functionality of MongoDB Atlas Hybrid Search
 * with $rankFusion, vector search, and text search capabilities.
 */

const { MongoClient } = require('mongodb');
const { SemanticMemoryEngine } = require('./packages/core/src/intelligence/SemanticMemoryEngine');

class SemanticMemoryTest {
  constructor() {
    this.db = null;
    this.engine = null;
    this.testResults = [];
    this.testMemories = [];
  }

  async setup() {
    console.log('🔧 Setting up SemanticMemoryEngine test...');
    
    // Connect to MongoDB Atlas (required for hybrid search)
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    this.db = client.db('ai_brain_test');
    
    // Initialize engine
    this.engine = new SemanticMemoryEngine(this.db);
    await this.engine.initialize();
    
    console.log('✅ Setup complete');
  }

  async seedTestData() {
    console.log('\n🌱 Seeding test data...');
    
    const testData = [
      {
        content: 'Our Q3 revenue increased 23% due to the new mobile app launch in Southeast Asia',
        metadata: { type: 'business', quarter: 'Q3', region: 'Southeast Asia' }
      },
      {
        content: 'The machine learning model achieved 94% accuracy on the test dataset',
        metadata: { type: 'technical', domain: 'AI', accuracy: 0.94 }
      },
      {
        content: 'Customer satisfaction scores improved significantly after implementing the new support system',
        metadata: { type: 'customer', metric: 'satisfaction' }
      },
      {
        content: 'The artificial intelligence project exceeded expectations with ROI of 150%',
        metadata: { type: 'business', domain: 'AI', roi: 1.5 }
      },
      {
        content: 'Database performance optimization reduced query time by 40%',
        metadata: { type: 'technical', domain: 'database', improvement: 0.4 }
      },
      {
        content: 'Mobile application downloads reached 1 million users in the first month',
        metadata: { type: 'product', platform: 'mobile', users: 1000000 }
      }
    ];

    for (const data of testData) {
      try {
        const memoryId = await this.engine.storeMemory(
          data.content,
          'test-session',
          data.metadata
        );
        this.testMemories.push({ id: memoryId, ...data });
        console.log(`   ✅ Stored: "${data.content.substring(0, 50)}..."`);
      } catch (error) {
        console.log(`   ❌ Failed to store: ${error.message}`);
      }
    }

    // Wait for indexing
    console.log('   ⏳ Waiting for indexing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async testHybridSearch() {
    console.log('\n🧪 Testing Hybrid Search ($rankFusion)...');

    const testCases = [
      {
        name: 'Business ROI Query',
        query: 'What was our ROI on the machine learning project?',
        expectedKeywords: ['ROI', 'machine learning', 'artificial intelligence'],
        expectedType: 'business'
      },
      {
        name: 'Mobile Performance Query',
        query: 'How did our mobile app perform?',
        expectedKeywords: ['mobile', 'app', 'downloads'],
        expectedType: 'product'
      },
      {
        name: 'Technical Optimization Query',
        query: 'What database improvements were made?',
        expectedKeywords: ['database', 'optimization', 'performance'],
        expectedType: 'technical'
      },
      {
        name: 'Customer Experience Query',
        query: 'How are customers responding to our changes?',
        expectedKeywords: ['customer', 'satisfaction', 'support'],
        expectedType: 'customer'
      }
    ];

    for (const testCase of testCases) {
      try {
        console.log(`\n📊 ${testCase.name}:`);
        console.log(`   Query: "${testCase.query}"`);

        // Test hybrid search
        const hybridResults = await this.engine.hybridSearch(testCase.query, {
          limit: 3,
          vectorWeight: 0.7,
          textWeight: 0.3,
          includeExplanation: true
        });

        console.log(`   Hybrid Results: ${hybridResults.length} found`);
        hybridResults.forEach((result, index) => {
          console.log(`     ${index + 1}. Score: ${result.score.toFixed(3)} - "${result.content.substring(0, 60)}..."`);
          if (result.explanation) {
            console.log(`        Explanation: ${result.explanation}`);
          }
        });

        // Test vector search only
        const vectorResults = await this.engine.semanticSearch(testCase.query, {
          limit: 3,
          includeExplanation: true
        });

        console.log(`   Vector Results: ${vectorResults.length} found`);

        // Test text search only
        const textResults = await this.engine.textSearch(testCase.query, {
          limit: 3
        });

        console.log(`   Text Results: ${textResults.length} found`);

        // Validate hybrid search found relevant results
        const passed = hybridResults.length > 0 && 
                      hybridResults[0].score > 0.5 &&
                      hybridResults.some(r => 
                        testCase.expectedKeywords.some(keyword => 
                          r.content.toLowerCase().includes(keyword.toLowerCase())
                        )
                      );

        this.testResults.push({
          test: testCase.name,
          passed,
          details: {
            hybridCount: hybridResults.length,
            vectorCount: vectorResults.length,
            textCount: textResults.length,
            topScore: hybridResults[0]?.score || 0
          }
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

  async testRankFusionAdvantage() {
    console.log('\n🧪 Testing $rankFusion Advantage...');

    try {
      const query = 'machine learning ROI performance';

      // Get results from all search types
      const hybridResults = await this.engine.hybridSearch(query, { limit: 5 });
      const vectorResults = await this.engine.semanticSearch(query, { limit: 5 });
      const textResults = await this.engine.textSearch(query, { limit: 5 });

      console.log('\n📊 $rankFusion Comparison:');
      console.log(`   Hybrid Search: ${hybridResults.length} results`);
      console.log(`   Vector Search: ${vectorResults.length} results`);
      console.log(`   Text Search: ${textResults.length} results`);

      // Analyze result diversity
      const hybridContent = new Set(hybridResults.map(r => r.id));
      const vectorContent = new Set(vectorResults.map(r => r.id));
      const textContent = new Set(textResults.map(r => r.id));

      const hybridUnique = hybridContent.size;
      const combinedUnique = new Set([...vectorContent, ...textContent]).size;

      console.log(`   Hybrid Unique Results: ${hybridUnique}`);
      console.log(`   Combined V+T Unique: ${combinedUnique}`);

      // Check if hybrid search combines results effectively
      const hasVectorResults = hybridResults.some(hr => 
        vectorResults.some(vr => vr.id === hr.id)
      );
      const hasTextResults = hybridResults.some(hr => 
        textResults.some(tr => tr.id === hr.id)
      );

      console.log(`   Includes Vector Results: ${hasVectorResults ? '✅' : '❌'}`);
      console.log(`   Includes Text Results: ${hasTextResults ? '✅' : '❌'}`);

      const passed = hybridResults.length > 0 && (hasVectorResults || hasTextResults);

      this.testResults.push({
        test: '$rankFusion Advantage',
        passed,
        details: {
          hybridCount: hybridResults.length,
          hasVector: hasVectorResults,
          hasText: hasTextResults
        }
      });

      console.log(`   Result: ${passed ? '✅ PASSED' : '❌ FAILED'}`);

    } catch (error) {
      console.log(`   Result: ❌ ERROR - ${error.message}`);
      this.testResults.push({
        test: '$rankFusion Advantage',
        passed: false,
        details: { error: error.message }
      });
    }
  }

  async testMemoryAnalytics() {
    console.log('\n🧪 Testing Memory Analytics...');

    try {
      const analytics = await this.engine.getMemoryAnalytics('test-session');

      console.log('\n📊 Memory Analytics:');
      console.log(`   Total Memories: ${analytics.totalMemories}`);
      console.log(`   Average Relevance: ${analytics.averageRelevance.toFixed(3)}`);
      console.log(`   Memory Categories: ${Object.keys(analytics.memoryCategories).length}`);
      console.log(`   Search Performance: ${analytics.searchPerformance.averageLatency}ms`);

      // Validate analytics
      const passed = analytics.totalMemories > 0 &&
                    analytics.averageRelevance >= 0 &&
                    Object.keys(analytics.memoryCategories).length > 0;

      this.testResults.push({
        test: 'Memory Analytics',
        passed,
        details: {
          totalMemories: analytics.totalMemories,
          categories: Object.keys(analytics.memoryCategories).length
        }
      });

      console.log(`   Result: ${passed ? '✅ PASSED' : '❌ FAILED'}`);

    } catch (error) {
      console.log(`   Result: ❌ ERROR - ${error.message}`);
      this.testResults.push({
        test: 'Memory Analytics',
        passed: false,
        details: { error: error.message }
      });
    }
  }

  async testMemoryEvolution() {
    console.log('\n🧪 Testing Memory Evolution...');

    try {
      // Store a memory and access it multiple times
      const memoryId = await this.engine.storeMemory(
        'This is a test memory for evolution tracking',
        'evolution-test-session',
        { type: 'test', importance: 'high' }
      );

      // Simulate multiple accesses
      for (let i = 0; i < 5; i++) {
        await this.engine.semanticSearch('test memory evolution', {
          sessionId: 'evolution-test-session'
        });
      }

      // Check if memory strength increased
      const memories = await this.engine.getMemories('evolution-test-session');
      const testMemory = memories.find(m => m.id === memoryId);

      console.log('\n📊 Memory Evolution:');
      console.log(`   Memory ID: ${memoryId}`);
      console.log(`   Access Count: ${testMemory?.accessCount || 0}`);
      console.log(`   Strength: ${testMemory?.strength || 0}`);

      const passed = testMemory && testMemory.accessCount > 0;

      this.testResults.push({
        test: 'Memory Evolution',
        passed,
        details: {
          accessCount: testMemory?.accessCount || 0,
          strength: testMemory?.strength || 0
        }
      });

      console.log(`   Result: ${passed ? '✅ PASSED' : '❌ FAILED'}`);

    } catch (error) {
      console.log(`   Result: ❌ ERROR - ${error.message}`);
      this.testResults.push({
        test: 'Memory Evolution',
        passed: false,
        details: { error: error.message }
      });
    }
  }

  async runAllTests() {
    try {
      await this.setup();
      await this.seedTestData();
      await this.testHybridSearch();
      await this.testRankFusionAdvantage();
      await this.testMemoryAnalytics();
      await this.testMemoryEvolution();
      
      this.printSummary();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 SEMANTIC MEMORY ENGINE TEST SUMMARY');
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
      console.log('\n🎉 SEMANTIC MEMORY ENGINE WITH HYBRID SEARCH IS WORKING!');
      console.log('🚀 MongoDB Atlas $rankFusion is functioning correctly!');
    } else {
      console.log('\n⚠️  SEMANTIC MEMORY ENGINE NEEDS ATTENTION!');
    }
  }
}

// Run the test
if (require.main === module) {
  const test = new SemanticMemoryTest();
  test.runAllTests().catch(console.error);
}

module.exports = SemanticMemoryTest;
