#!/usr/bin/env node

/**
 * Step 1: Environment Check
 * 
 * Before we start integration, let's verify our environment is properly set up
 * with the MongoDB Atlas connection and Voyage AI API key.
 */

console.log('🔍 STEP 1: ENVIRONMENT CHECK');
console.log('=' .repeat(50));

// Test MongoDB Atlas Connection
const MONGODB_URI = 'mongodb+srv://romiluz:H97r3aQBnxWawZbx@aibrain2python.yeqhwdr.mongodb.net/?retryWrites=true&w=majority&appName=aibrain2python';
const VOYAGE_API_KEY = 'pa-NHB7D_EtgEImAVQkjIZ6PxoGVHcTOQvUujwDeq8m9-Q';

console.log('📊 MongoDB URI:', MONGODB_URI.substring(0, 50) + '...');
console.log('🚀 Voyage API Key:', VOYAGE_API_KEY.substring(0, 20) + '...');

// Test basic MongoDB connection
import { MongoClient } from 'mongodb';

async function testEnvironment() {
  console.log('\n🧪 Testing MongoDB Atlas Connection...');
  
  let client: MongoClient | null = null;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db('integration_test');
    await db.admin().ping();
    
    console.log('✅ MongoDB Atlas connection successful!');
    
    // Test basic collection operation
    const testCollection = db.collection('test');
    const testDoc = { test: true, timestamp: new Date() };
    await testCollection.insertOne(testDoc);
    await testCollection.deleteOne({ test: true });
    
    console.log('✅ MongoDB operations working!');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
  
  console.log('\n🚀 Testing Voyage AI API...');
  
  try {
    // Simple test of Voyage AI (we'll import the provider)
    const { VoyageAIEmbeddingProvider } = await import('./packages/core/src/embeddings/VoyageAIEmbeddingProvider');
    
    const provider = new VoyageAIEmbeddingProvider({
      apiKey: VOYAGE_API_KEY,
      model: 'voyage-large-2-instruct'
    });
    
    const embedding = await provider.generateEmbedding('Test embedding for environment check');
    
    if (embedding && embedding.length > 0) {
      console.log(`✅ Voyage AI working! Generated ${embedding.length}-dimensional embedding`);
    } else {
      throw new Error('Empty embedding returned');
    }
    
  } catch (error) {
    console.error('❌ Voyage AI test failed:', error);
    process.exit(1);
  }
  
  console.log('\n🎉 Environment check PASSED! Ready for integration.');
  console.log('=' .repeat(50));
}

testEnvironment().catch(error => {
  console.error('Environment check failed:', error);
  process.exit(1);
});
