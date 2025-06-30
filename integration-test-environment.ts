/**
 * Integration Test Environment Setup
 * 
 * This script verifies the environment is ready for cognitive system integration
 * by testing MongoDB Atlas connectivity and Voyage API functionality.
 */

import { MongoClient } from 'mongodb';
import { VoyageAIEmbeddingProvider } from './packages/core/src/embeddings/VoyageAIEmbeddingProvider';

// Environment Configuration
const MONGODB_URI = 'mongodb+srv://romiluz:H97r3aQBnxWawZbx@aibrain2python.yeqhwdr.mongodb.net/?retryWrites=true&w=majority&appName=aibrain2python';
const VOYAGE_API_KEY = 'pa-NHB7D_EtgEImAVQkjIZ6PxoGVHcTOQvUujwDeq8m9-Q';
const DATABASE_NAME = 'ai_brain_integration_test';

interface EnvironmentTestResult {
  mongodb: {
    connected: boolean;
    databaseAccessible: boolean;
    collectionsCreatable: boolean;
    error?: string;
  };
  voyageAI: {
    connected: boolean;
    embeddingGeneration: boolean;
    error?: string;
  };
  overall: {
    ready: boolean;
    issues: string[];
  };
}

async function testEnvironmentSetup(): Promise<EnvironmentTestResult> {
  const result: EnvironmentTestResult = {
    mongodb: {
      connected: false,
      databaseAccessible: false,
      collectionsCreatable: false
    },
    voyageAI: {
      connected: false,
      embeddingGeneration: false
    },
    overall: {
      ready: false,
      issues: []
    }
  };

  console.log('🔍 Testing Environment Setup for Cognitive System Integration...\n');

  // Test MongoDB Atlas Connection
  console.log('📊 Testing MongoDB Atlas Connection...');
  let mongoClient: MongoClient | null = null;
  
  try {
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    result.mongodb.connected = true;
    console.log('✅ MongoDB Atlas connection successful');

    // Test database access
    const db = mongoClient.db(DATABASE_NAME);
    await db.admin().ping();
    result.mongodb.databaseAccessible = true;
    console.log('✅ Database access confirmed');

    // Test collection creation
    const testCollection = db.collection('integration_test');
    await testCollection.insertOne({ test: 'integration_test', timestamp: new Date() });
    await testCollection.deleteOne({ test: 'integration_test' });
    result.mongodb.collectionsCreatable = true;
    console.log('✅ Collection operations working');

  } catch (error) {
    result.mongodb.error = error instanceof Error ? error.message : 'Unknown MongoDB error';
    result.overall.issues.push(`MongoDB: ${result.mongodb.error}`);
    console.error('❌ MongoDB Atlas connection failed:', error);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }

  // Test Voyage AI API
  console.log('\n🚀 Testing Voyage AI API...');
  try {
    const voyageProvider = new VoyageAIEmbeddingProvider({
      apiKey: VOYAGE_API_KEY,
      model: 'voyage-large-2-instruct'
    });

    result.voyageAI.connected = true;
    console.log('✅ Voyage AI provider initialized');

    // Test embedding generation
    const testEmbedding = await voyageProvider.generateEmbedding('Test embedding for integration verification');
    if (testEmbedding && testEmbedding.length > 0) {
      result.voyageAI.embeddingGeneration = true;
      console.log(`✅ Embedding generation working (${testEmbedding.length} dimensions)`);
    } else {
      throw new Error('Empty embedding returned');
    }

  } catch (error) {
    result.voyageAI.error = error instanceof Error ? error.message : 'Unknown Voyage AI error';
    result.overall.issues.push(`Voyage AI: ${result.voyageAI.error}`);
    console.error('❌ Voyage AI API test failed:', error);
  }

  // Overall assessment
  result.overall.ready = 
    result.mongodb.connected && 
    result.mongodb.databaseAccessible && 
    result.mongodb.collectionsCreatable &&
    result.voyageAI.connected && 
    result.voyageAI.embeddingGeneration;

  console.log('\n📋 Environment Test Summary:');
  console.log('MongoDB Atlas:', result.mongodb.connected ? '✅' : '❌');
  console.log('Database Access:', result.mongodb.databaseAccessible ? '✅' : '❌');
  console.log('Collection Ops:', result.mongodb.collectionsCreatable ? '✅' : '❌');
  console.log('Voyage AI:', result.voyageAI.connected ? '✅' : '❌');
  console.log('Embeddings:', result.voyageAI.embeddingGeneration ? '✅' : '❌');
  
  if (result.overall.ready) {
    console.log('\n🎉 Environment is READY for cognitive system integration!');
  } else {
    console.log('\n⚠️  Environment has issues that must be resolved:');
    result.overall.issues.forEach(issue => console.log(`   - ${issue}`));
  }

  return result;
}

// Run the test if this file is executed directly
if (require.main === module) {
  testEnvironmentSetup()
    .then(result => {
      process.exit(result.overall.ready ? 0 : 1);
    })
    .catch(error => {
      console.error('Environment test failed:', error);
      process.exit(1);
    });
}

export { testEnvironmentSetup, EnvironmentTestResult };
