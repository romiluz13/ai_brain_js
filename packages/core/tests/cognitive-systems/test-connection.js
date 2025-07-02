#!/usr/bin/env node

/**
 * Quick connection test for MongoDB Atlas and OpenAI
 * Validates that ROM's credentials work before running full cognitive tests
 */

import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

console.log('🔗 Testing MongoDB Atlas Connection...');
console.log('=' .repeat(50));

async function testMongoConnection() {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    
    console.log('📡 Connecting to MongoDB Atlas...');
    await client.connect();
    
    console.log('✅ Connected successfully!');
    
    // Test database access
    const db = client.db('cognitive_systems_test');
    const collections = await db.listCollections().toArray();
    
    console.log(`📊 Database: cognitive_systems_test`);
    console.log(`📁 Existing collections: ${collections.length}`);
    
    // Test write operation
    const testCollection = db.collection('connection_test');
    const testDoc = {
      test: 'connection_validation',
      timestamp: new Date(),
      status: 'success'
    };
    
    const result = await testCollection.insertOne(testDoc);
    console.log(`✅ Test write successful - ID: ${result.insertedId}`);
    
    // Test read operation
    const retrieved = await testCollection.findOne({ _id: result.insertedId });
    console.log(`✅ Test read successful - Retrieved: ${retrieved.test}`);
    
    // Clean up test document
    await testCollection.deleteOne({ _id: result.insertedId });
    console.log(`🧹 Test document cleaned up`);
    
    await client.close();
    console.log('✅ MongoDB Atlas connection test PASSED');
    
    return true;
  } catch (error) {
    console.log(`❌ MongoDB connection failed: ${error.message}`);
    return false;
  }
}

async function testOpenAIConnection() {
  console.log('\n🤖 Testing OpenAI API Connection...');
  console.log('=' .repeat(50));
  
  if (!process.env.OPENAI_API_KEY) {
    console.log('❌ OPENAI_API_KEY not found in environment');
    return false;
  }
  
  try {
    // Simple test without importing the full OpenAI SDK
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ OpenAI API connection successful`);
      console.log(`📊 Available models: ${data.data.length}`);
      return true;
    } else {
      console.log(`❌ OpenAI API error: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ OpenAI connection failed: ${error.message}`);
    return false;
  }
}

async function testVoyageConnection() {
  console.log('\n🚀 Testing Voyage AI Connection...');
  console.log('=' .repeat(50));
  
  if (!process.env.VOYAGE_API_KEY) {
    console.log('❌ VOYAGE_API_KEY not found in environment');
    return false;
  }
  
  console.log('✅ Voyage API key found');
  console.log('🔑 Key preview:', process.env.VOYAGE_API_KEY.substring(0, 10) + '...');
  
  // Note: We'll test Voyage integration in the actual cognitive tests
  return true;
}

async function runConnectionTests() {
  console.log('🧠 Universal AI Brain 3.0 - Connection Testing');
  console.log('🎯 Validating ROM\'s credentials before cognitive testing\n');
  
  const mongoOk = await testMongoConnection();
  const openaiOk = await testOpenAIConnection();
  const voyageOk = await testVoyageConnection();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 CONNECTION TEST RESULTS');
  console.log('='.repeat(50));
  
  console.log(`🔗 MongoDB Atlas: ${mongoOk ? '✅ READY' : '❌ FAILED'}`);
  console.log(`🤖 OpenAI API: ${openaiOk ? '✅ READY' : '❌ FAILED'}`);
  console.log(`🚀 Voyage AI: ${voyageOk ? '✅ READY' : '❌ FAILED'}`);
  
  const allReady = mongoOk && openaiOk && voyageOk;
  
  if (allReady) {
    console.log('\n🎉 ALL SYSTEMS READY FOR COGNITIVE TESTING!');
    console.log('🚀 You can now run:');
    console.log('   node src/run-memory-tests.js');
    console.log('   npm run test:all');
  } else {
    console.log('\n⚠️  Some connections failed. Please check your credentials.');
  }
  
  return allReady;
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runConnectionTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Connection testing failed:', error);
      process.exit(1);
    });
}
