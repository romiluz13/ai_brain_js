// Global Jest setup
require('dotenv').config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
// MongoDB URI is now loaded from .env.test file
// process.env.MONGODB_URI should contain the Atlas connection string
// process.env.OPENAI_API_KEY should contain the real API key

// Global test timeout (increased for MongoDB Atlas)
jest.setTimeout(60000);

// Global test configuration
global.testConfig = {
  mongoUri: process.env.MONGODB_URI,
  databaseName: process.env.DATABASE_NAME || 'universal_ai_brain_test',
  openaiApiKey: process.env.OPENAI_API_KEY,
  testTimeout: 60000,
};

// Mock console methods in tests to reduce noise
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test utilities
global.testUtils = {
  generateTestId: () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  createMockAgent: () => ({
    agent_id: global.testUtils.generateTestId(),
    name: 'Test Agent',
    version: '1.0.0',
    status: 'active',
    created_at: new Date(),
    updated_at: new Date(),
    capabilities: ['test'],
    tools: [],
    model_config: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 1000,
      system_prompt: 'You are a test agent'
    },
    performance_targets: {
      max_response_time_seconds: 30,
      min_confidence_score: 0.7,
      max_cost_per_execution: 0.50
    }
  })
};
