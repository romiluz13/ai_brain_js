#!/usr/bin/env node

/**
 * Universal AI Brain 3.0 - Cognitive Testing Setup Script
 * 
 * This script automates the setup process for cognitive systems testing
 * ROM's requirement: Make testing setup easier while keeping everything safe
 */

import { execSync } from 'child_process';
import { existsSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const packageRoot = join(__dirname, '..');
const testsDir = join(packageRoot, 'tests', 'cognitive-systems');
const envExamplePath = join(testsDir, '.env.example');
const envPath = join(testsDir, '.env');

console.log('🧠 Universal AI Brain 3.0 - Cognitive Testing Setup');
console.log('=' .repeat(60));
console.log('🎯 Automating cognitive systems testing setup...');
console.log('');

// Check if we're in the right directory
if (!existsSync(testsDir)) {
  console.log('❌ Error: Cognitive tests directory not found');
  console.log('   Make sure you\'re running this from the universal-ai-brain package directory');
  process.exit(1);
}

// Step 1: Install test dependencies
console.log('📦 Step 1: Installing cognitive testing dependencies...');
try {
  process.chdir(testsDir);
  console.log('   Installing dependencies in tests/cognitive-systems/...');
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully');
} catch (error) {
  console.log('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Step 2: Environment setup
console.log('\n🔧 Step 2: Setting up environment configuration...');

if (existsSync(envPath)) {
  console.log('✅ .env file already exists');
} else {
  console.log('📝 Creating .env file from template...');
  
  if (existsSync(envExamplePath)) {
    copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created from .env.example');
    
    // Interactive setup
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log('\n🔑 Environment Configuration:');
    console.log('Please provide your API credentials (press Enter to skip):');
    
    const askQuestion = (question) => {
      return new Promise((resolve) => {
        rl.question(question, (answer) => {
          resolve(answer.trim());
        });
      });
    };
    
    try {
      const mongoUri = await askQuestion('MongoDB Atlas URI (optional): ');
      const openaiKey = await askQuestion('OpenAI API Key (optional): ');
      const voyageKey = await askQuestion('Voyage AI API Key (optional): ');
      
      // Update .env file with provided values
      let envContent = readFileSync(envPath, 'utf8');
      
      if (mongoUri) {
        envContent = envContent.replace(
          'MONGODB_URI=your_mongodb_atlas_connection_string',
          `MONGODB_URI=${mongoUri}`
        );
      }
      
      if (openaiKey) {
        envContent = envContent.replace(
          'OPENAI_API_KEY=your_openai_api_key',
          `OPENAI_API_KEY=${openaiKey}`
        );
      }
      
      if (voyageKey) {
        envContent = envContent.replace(
          'VOYAGE_API_KEY=your_voyage_api_key',
          `VOYAGE_API_KEY=${voyageKey}`
        );
      }
      
      writeFileSync(envPath, envContent);
      console.log('✅ Environment configuration updated');
      
    } catch (error) {
      console.log('⚠️  Interactive setup skipped');
    } finally {
      rl.close();
    }
  } else {
    console.log('⚠️  .env.example not found, creating basic .env file...');
    const basicEnv = `# MongoDB Atlas Configuration
MONGODB_URI=your_mongodb_atlas_connection_string

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Voyage AI Configuration (for embeddings)
VOYAGE_API_KEY=your_voyage_api_key

# Testing Configuration
TEST_DATABASE_NAME=cognitive_systems_test
TEST_COLLECTION_PREFIX=test_
`;
    writeFileSync(envPath, basicEnv);
    console.log('✅ Basic .env file created');
  }
}

// Step 3: Validation
console.log('\n🔍 Step 3: Validating setup...');

// Check Node.js version
const nodeVersion = process.version;
console.log(`✅ Node.js version: ${nodeVersion}`);

// Check if package.json exists
const packageJsonPath = join(testsDir, 'package.json');
if (existsSync(packageJsonPath)) {
  console.log('✅ Test package.json found');
} else {
  console.log('❌ Test package.json not found');
}

// Check if test files exist
const testFiles = [
  'src/test-all-systems.js',
  'src/run-memory-tests.js',
  'src/full-cognitive-benchmark.js'
];

let allTestsFound = true;
for (const testFile of testFiles) {
  const testPath = join(testsDir, testFile);
  if (existsSync(testPath)) {
    console.log(`✅ ${testFile} found`);
  } else {
    console.log(`❌ ${testFile} not found`);
    allTestsFound = false;
  }
}

// Final status
console.log('\n' + '='.repeat(60));
console.log('🎉 COGNITIVE TESTING SETUP COMPLETE');
console.log('='.repeat(60));

if (allTestsFound) {
  console.log('✅ All components ready for testing');
  console.log('');
  console.log('🚀 Quick Start Commands:');
  console.log('   npm run test:cognitive           # Test all 24 systems');
  console.log('   npm run test:cognitive:memory    # Test memory systems');
  console.log('   npm run test:cognitive:benchmark # Full benchmark');
  console.log('');
  console.log('📁 Test Directory: tests/cognitive-systems/');
  console.log('🔧 Configuration: tests/cognitive-systems/.env');
} else {
  console.log('⚠️  Some test files are missing - please check the installation');
}

console.log('');
console.log('🧠 Universal AI Brain 3.0 cognitive testing is ready!');
