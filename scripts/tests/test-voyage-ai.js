/**
 * Test Script for Voyage AI Integration
 * Tests the new Voyage AI embedding provider with the provided API key
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testVoyageAIIntegration() {
  console.log('🚀 Testing Voyage AI Integration...\n');

  const mongoUri = process.env.MONGODB_URI;
  const databaseName = process.env.DATABASE_NAME || 'universal_ai_brain';
  const voyageApiKey = process.env.VOYAGE_API_KEY;

  let client;
  let testsPassed = 0;
  let testsTotal = 0;

  try {
    // Test 1: Environment Configuration
    testsTotal++;
    console.log('📊 Test 1: Environment Configuration');
    
    if (voyageApiKey && voyageApiKey.startsWith('pa-')) {
      console.log('✅ Voyage AI API key found and valid format');
      testsPassed++;
    } else {
      console.log('❌ Voyage AI API key missing or invalid format');
    }

    // Test 2: MongoDB Connection
    testsTotal++;
    console.log('\n📊 Test 2: MongoDB Atlas Connection');
    
    client = new MongoClient(mongoUri, {
      maxPoolSize: 5,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      retryReads: true
    });

    await client.connect();
    const db = client.db(databaseName);
    
    const result = await db.admin().ping();
    if (result.ok === 1) {
      console.log('✅ MongoDB Atlas connection successful');
      testsPassed++;
    } else {
      console.log('❌ MongoDB Atlas ping failed');
    }

    // Test 3: Voyage AI API Connection
    testsTotal++;
    console.log('\n📊 Test 3: Voyage AI API Connection');
    
    try {
      const response = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${voyageApiKey}`
        },
        body: JSON.stringify({
          input: 'Universal AI Brain test embedding',
          model: 'voyage-3.5'
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data[0] && data.data[0].embedding && Array.isArray(data.data[0].embedding)) {
          console.log('✅ Voyage AI API connection successful');
          console.log(`   📏 Embedding dimensions: ${data.data[0].embedding.length}`);
          console.log(`   🎯 Model used: ${data.model}`);
          console.log(`   📊 Tokens used: ${data.usage.total_tokens}`);
          testsPassed++;
        } else {
          console.log('❌ Voyage AI API response invalid');
        }
      } else if (response.status === 401) {
        console.log('❌ Voyage AI API key invalid');
      } else if (response.status === 429) {
        console.log('⚠️ Voyage AI API rate limited');
      } else {
        console.log(`❌ Voyage AI API connection failed: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Voyage AI API test failed:', error.message);
    }

    // Test 4: Embedding Quality Test
    testsTotal++;
    console.log('\n📊 Test 4: Embedding Quality Test');
    
    try {
      const testTexts = [
        'MongoDB Atlas Vector Search for AI applications',
        'Database vector search for artificial intelligence',
        'Cooking recipes for Italian pasta dishes'
      ];

      const embeddings = [];
      for (const text of testTexts) {
        const response = await fetch('https://api.voyageai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${voyageApiKey}`
          },
          body: JSON.stringify({
            input: text,
            model: 'voyage-3.5',
            input_type: 'document'
          })
        });

        if (response.ok) {
          const data = await response.json();
          embeddings.push(data.data[0].embedding);
        }
      }

      if (embeddings.length === 3) {
        // Calculate cosine similarity between first two (should be high)
        const similarity1 = cosineSimilarity(embeddings[0], embeddings[1]);
        // Calculate cosine similarity between first and third (should be lower)
        const similarity2 = cosineSimilarity(embeddings[0], embeddings[2]);

        console.log(`   🔗 Similarity (AI texts): ${similarity1.toFixed(3)}`);
        console.log(`   🔗 Similarity (AI vs Cooking): ${similarity2.toFixed(3)}`);

        if (similarity1 > similarity2 && similarity1 > 0.7) {
          console.log('✅ Embedding quality test passed - semantic understanding works!');
          testsPassed++;
        } else {
          console.log('❌ Embedding quality test failed - poor semantic understanding');
        }
      } else {
        console.log('❌ Could not generate all test embeddings');
      }
    } catch (error) {
      console.log('❌ Embedding quality test failed:', error.message);
    }

    // Test 5: Vector Storage Test
    testsTotal++;
    console.log('\n📊 Test 5: Vector Storage Test');
    
    try {
      const collection = db.collection('test_embeddings');
      
      // Generate embedding for test document
      const response = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${voyageApiKey}`
        },
        body: JSON.stringify({
          input: 'Universal AI Brain with Voyage AI embeddings',
          model: 'voyage-3.5',
          input_type: 'document'
        })
      });

      if (response.ok) {
        const data = await response.json();
        const embedding = data.data[0].embedding;

        // Store in MongoDB
        const document = {
          id: `test_${Date.now()}`,
          content: 'Universal AI Brain with Voyage AI embeddings',
          embedding: {
            values: embedding,
            model: 'voyage-3.5',
            dimensions: embedding.length
          },
          metadata: {
            type: 'test',
            created: new Date(),
            provider: 'voyage-ai'
          }
        };

        const insertResult = await collection.insertOne(document);
        const retrievedDoc = await collection.findOne({ id: document.id });

        if (insertResult.insertedId && retrievedDoc && retrievedDoc.embedding.values.length === embedding.length) {
          console.log('✅ Vector storage test successful');
          console.log(`   📏 Stored embedding dimensions: ${retrievedDoc.embedding.dimensions}`);
          testsPassed++;
        } else {
          console.log('❌ Vector storage test failed');
        }

        // Clean up
        await collection.deleteOne({ id: document.id });
      } else {
        console.log('❌ Could not generate embedding for storage test');
      }
    } catch (error) {
      console.log('❌ Vector storage test failed:', error.message);
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }

  // Close MongoDB connection
  if (client) {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB Atlas');
  }

  // Final Results
  console.log('\n' + '='.repeat(60));
  console.log('🎯 VOYAGE AI INTEGRATION TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Tests Passed: ${testsPassed}/${testsTotal}`);
  console.log(`📊 Success Rate: ${Math.round((testsPassed / testsTotal) * 100)}%`);
  
  if (testsPassed === testsTotal) {
    console.log('\n🎉 ALL VOYAGE AI TESTS PASSED! 🚀');
    console.log('✅ Voyage AI API: Ready');
    console.log('✅ MongoDB Atlas: Ready');
    console.log('✅ Embedding Quality: Excellent');
    console.log('✅ Vector Storage: Ready');
    console.log('\n🧠 Universal AI Brain with Voyage AI: PRODUCTION READY!');
  } else {
    console.log('\n⚠️ Some tests failed - check configuration');
  }
  
  return testsPassed === testsTotal;
}

// Helper function to calculate cosine similarity
function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// Run the tests
testVoyageAIIntegration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
