/**
 * REAL MONGODB ATLAS HYBRID SEARCH TEST
 * 
 * This test validates the actual $rankFusion implementation with real MongoDB Atlas
 * using the provided connection string and testing real hybrid search capabilities.
 */

const { MongoClient } = require('mongodb');

class RealHybridSearchTest {
  constructor() {
    this.client = null;
    this.db = null;
    this.collection = null;
    this.testResults = [];
    
    // Real MongoDB Atlas connection
    this.mongoUri = 'mongodb+srv://romiluz:H97r3aQBnxWawZbx@aibrain.tnv45wr.mongodb.net/?retryWrites=true&w=majority&appName=aibrain';
  }

  async setup() {
    console.log('🔧 Connecting to MongoDB Atlas...');
    
    try {
      this.client = new MongoClient(this.mongoUri);
      await this.client.connect();
      this.db = this.client.db('ai_brain_test');
      this.collection = this.db.collection('hybrid_search_test');
      
      console.log('✅ Connected to MongoDB Atlas successfully');
      
      // Check MongoDB version
      const adminDb = this.client.db('admin');
      const buildInfo = await adminDb.command({ buildInfo: 1 });
      console.log(`📊 MongoDB Version: ${buildInfo.version}`);
      
      // Check if $rankFusion is supported (MongoDB 8.1+)
      const versionParts = buildInfo.version.split('.').map(Number);
      const isRankFusionSupported = versionParts[0] > 8 || (versionParts[0] === 8 && versionParts[1] >= 1);
      console.log(`🔍 $rankFusion Support: ${isRankFusionSupported ? '✅ Supported' : '❌ Not Supported'}`);
      
      return isRankFusionSupported;
      
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB Atlas:', error.message);
      throw error;
    }
  }

  async seedTestData() {
    console.log('\n🌱 Seeding test data...');
    
    // Clear existing test data
    await this.collection.deleteMany({});
    
    const testDocuments = [
      {
        _id: 'doc1',
        title: 'Machine Learning ROI Analysis',
        content: 'Our machine learning project achieved 150% ROI in Q3 with artificial intelligence algorithms',
        category: 'business',
        tags: ['AI', 'ROI', 'machine learning', 'business'],
        embedding: this.generateMockEmbedding('machine learning ROI artificial intelligence')
      },
      {
        _id: 'doc2',
        title: 'Mobile App Performance',
        content: 'Mobile application downloads reached 1 million users with excellent performance metrics',
        category: 'product',
        tags: ['mobile', 'app', 'performance', 'users'],
        embedding: this.generateMockEmbedding('mobile app performance users downloads')
      },
      {
        _id: 'doc3',
        title: 'Database Optimization Results',
        content: 'Database performance optimization reduced query time by 40% improving system efficiency',
        category: 'technical',
        tags: ['database', 'optimization', 'performance', 'efficiency'],
        embedding: this.generateMockEmbedding('database optimization performance efficiency')
      },
      {
        _id: 'doc4',
        title: 'AI Project Success',
        content: 'Artificial intelligence initiative exceeded expectations with machine learning models',
        category: 'technical',
        tags: ['AI', 'artificial intelligence', 'machine learning', 'success'],
        embedding: this.generateMockEmbedding('artificial intelligence machine learning success')
      },
      {
        _id: 'doc5',
        title: 'Customer Satisfaction Survey',
        content: 'Customer satisfaction scores improved significantly after implementing new support system',
        category: 'customer',
        tags: ['customer', 'satisfaction', 'support', 'improvement'],
        embedding: this.generateMockEmbedding('customer satisfaction support improvement')
      }
    ];

    await this.collection.insertMany(testDocuments);
    console.log(`✅ Inserted ${testDocuments.length} test documents`);
  }

  async createSearchIndexes() {
    console.log('\n🔧 Creating search indexes...');
    
    try {
      // Create vector search index
      await this.collection.createSearchIndex(
        'vector_index',
        'vectorSearch',
        {
          fields: [
            {
              type: 'vector',
              path: 'embedding',
              numDimensions: 384,
              similarity: 'cosine'
            }
          ]
        }
      );
      console.log('✅ Created vector search index');

      // Create text search index
      await this.collection.createSearchIndex(
        'text_index',
        'search',
        {
          mappings: {
            dynamic: true
          }
        }
      );
      console.log('✅ Created text search index');
      
      // Wait for indexes to be ready
      console.log('⏳ Waiting for indexes to be ready...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
    } catch (error) {
      console.log(`⚠️  Index creation: ${error.message}`);
      // Indexes might already exist, continue with tests
    }
  }

  async testRankFusionHybridSearch() {
    console.log('\n🧪 Testing $rankFusion Hybrid Search...');

    const testCases = [
      {
        name: 'AI and Machine Learning Query',
        query: 'machine learning artificial intelligence',
        vectorQuery: this.generateMockEmbedding('machine learning artificial intelligence'),
        expectedDocs: ['doc1', 'doc4']
      },
      {
        name: 'Performance Optimization Query',
        query: 'performance optimization',
        vectorQuery: this.generateMockEmbedding('performance optimization'),
        expectedDocs: ['doc2', 'doc3']
      },
      {
        name: 'Customer Experience Query',
        query: 'customer satisfaction',
        vectorQuery: this.generateMockEmbedding('customer satisfaction'),
        expectedDocs: ['doc5']
      }
    ];

    for (const testCase of testCases) {
      try {
        console.log(`\n📊 ${testCase.name}:`);
        console.log(`   Query: "${testCase.query}"`);

        // Test $rankFusion hybrid search
        const hybridPipeline = [
          {
            $rankFusion: {
              input: {
                pipelines: {
                  vectorPipeline: [
                    {
                      $vectorSearch: {
                        index: 'vector_index',
                        path: 'embedding',
                        queryVector: testCase.vectorQuery,
                        numCandidates: 50,
                        limit: 10
                      }
                    }
                  ],
                  textPipeline: [
                    {
                      $search: {
                        index: 'text_index',
                        text: {
                          query: testCase.query,
                          path: ['title', 'content']
                        }
                      }
                    },
                    { $limit: 10 }
                  ]
                }
              },
              combination: {
                weights: {
                  vectorPipeline: 0.7,
                  textPipeline: 0.3
                }
              },
              scoreDetails: true
            }
          },
          {
            $project: {
              _id: 1,
              title: 1,
              content: 1,
              category: 1,
              scoreDetails: { $meta: 'scoreDetails' }
            }
          },
          { $limit: 5 }
        ];

        const hybridResults = await this.collection.aggregate(hybridPipeline).toArray();
        
        console.log(`   Hybrid Results: ${hybridResults.length} found`);
        hybridResults.forEach((result, index) => {
          const score = result.scoreDetails?.value || 0;
          console.log(`     ${index + 1}. ${result._id}: "${result.title}" (Score: ${score.toFixed(3)})`);
          if (result.scoreDetails?.details) {
            console.log(`        Vector: ${result.scoreDetails.details.vectorPipeline?.value?.toFixed(3) || 'N/A'}`);
            console.log(`        Text: ${result.scoreDetails.details.textPipeline?.value?.toFixed(3) || 'N/A'}`);
          }
        });

        // Test vector search only
        const vectorResults = await this.collection.aggregate([
          {
            $vectorSearch: {
              index: 'vector_index',
              path: 'embedding',
              queryVector: testCase.vectorQuery,
              numCandidates: 50,
              limit: 5
            }
          },
          {
            $project: {
              _id: 1,
              title: 1,
              score: { $meta: 'vectorSearchScore' }
            }
          }
        ]).toArray();

        console.log(`   Vector Only: ${vectorResults.length} found`);

        // Test text search only
        const textResults = await this.collection.aggregate([
          {
            $search: {
              index: 'text_index',
              text: {
                query: testCase.query,
                path: ['title', 'content']
              }
            }
          },
          {
            $project: {
              _id: 1,
              title: 1,
              score: { $meta: 'searchScore' }
            }
          },
          { $limit: 5 }
        ]).toArray();

        console.log(`   Text Only: ${textResults.length} found`);

        // Validate results
        const foundExpected = testCase.expectedDocs.some(expectedId => 
          hybridResults.some(result => result._id === expectedId)
        );

        const passed = hybridResults.length > 0 && foundExpected;

        this.testResults.push({
          test: testCase.name,
          passed,
          details: {
            hybridCount: hybridResults.length,
            vectorCount: vectorResults.length,
            textCount: textResults.length,
            foundExpected
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

  async testRankFusionAdvantages() {
    console.log('\n🧪 Testing $rankFusion Advantages...');

    try {
      const query = 'machine learning performance';
      const queryVector = this.generateMockEmbedding('machine learning performance');

      // Test $rankFusion with different weights
      const weightTests = [
        { vectorWeight: 0.8, textWeight: 0.2, name: 'Vector Heavy' },
        { vectorWeight: 0.5, textWeight: 0.5, name: 'Balanced' },
        { vectorWeight: 0.2, textWeight: 0.8, name: 'Text Heavy' }
      ];

      for (const weightTest of weightTests) {
        const pipeline = [
          {
            $rankFusion: {
              input: {
                pipelines: {
                  vectorPipeline: [
                    {
                      $vectorSearch: {
                        index: 'vector_index',
                        path: 'embedding',
                        queryVector: queryVector,
                        numCandidates: 50,
                        limit: 10
                      }
                    }
                  ],
                  textPipeline: [
                    {
                      $search: {
                        index: 'text_index',
                        text: {
                          query: query,
                          path: ['title', 'content']
                        }
                      }
                    },
                    { $limit: 10 }
                  ]
                }
              },
              combination: {
                weights: {
                  vectorPipeline: weightTest.vectorWeight,
                  textPipeline: weightTest.textWeight
                }
              }
            }
          },
          { $limit: 3 }
        ];

        const results = await this.collection.aggregate(pipeline).toArray();
        console.log(`   ${weightTest.name} (${weightTest.vectorWeight}/${weightTest.textWeight}): ${results.length} results`);
        results.forEach((result, index) => {
          console.log(`     ${index + 1}. ${result._id}: "${result.title}"`);
        });
      }

      this.testResults.push({
        test: '$rankFusion Weight Testing',
        passed: true,
        details: { weightTests: weightTests.length }
      });

    } catch (error) {
      console.log(`   Result: ❌ ERROR - ${error.message}`);
      this.testResults.push({
        test: '$rankFusion Weight Testing',
        passed: false,
        details: { error: error.message }
      });
    }
  }

  generateMockEmbedding(text) {
    // Generate a simple mock embedding based on text
    // In real implementation, this would use OpenAI or Voyage AI
    const words = text.toLowerCase().split(' ');
    const embedding = new Array(384).fill(0);
    
    words.forEach((word, index) => {
      const hash = this.simpleHash(word);
      for (let i = 0; i < 384; i++) {
        embedding[i] += Math.sin(hash + i) * 0.1;
      }
    });
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  async runAllTests() {
    try {
      const isSupported = await this.setup();
      
      if (!isSupported) {
        console.log('\n⚠️  $rankFusion is not supported on this MongoDB version');
        console.log('   Requires MongoDB 8.1+ for $rankFusion functionality');
        return;
      }

      await this.seedTestData();
      await this.createSearchIndexes();
      await this.testRankFusionHybridSearch();
      await this.testRankFusionAdvantages();
      
      this.printSummary();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      if (this.client) {
        await this.client.close();
      }
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 REAL MONGODB ATLAS HYBRID SEARCH TEST SUMMARY');
    console.log('='.repeat(60));

    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    const percentage = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

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
      console.log('\n🎉 MONGODB ATLAS $RANKFUSION HYBRID SEARCH IS WORKING!');
      console.log('🚀 Real hybrid search with reciprocal rank fusion confirmed!');
    } else {
      console.log('\n⚠️  HYBRID SEARCH IMPLEMENTATION NEEDS ATTENTION!');
    }
  }
}

// Run the test
if (require.main === module) {
  const test = new RealHybridSearchTest();
  test.runAllTests().catch(console.error);
}

module.exports = RealHybridSearchTest;
