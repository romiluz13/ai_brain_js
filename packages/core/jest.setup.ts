import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';

let mongod: MongoMemoryServer;
let mongoClient: MongoClient;
let testDb: Db;

// Setup in-memory MongoDB for testing
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  mongoClient = new MongoClient(uri);
  await mongoClient.connect();
  testDb = mongoClient.db('ai_agents_test');
  
  // Store for use in tests
  (global as any).testDb = testDb;
  (global as any).mongoClient = mongoClient;
});

afterAll(async () => {
  if (mongoClient) {
    await mongoClient.close();
  }
  if (mongod) {
    await mongod.stop();
  }
});

// Clean up collections between tests
afterEach(async () => {
  if (testDb) {
    const collections = await testDb.listCollections().toArray();
    for (const collection of collections) {
      await testDb.collection(collection.name).deleteMany({});
    }
  }
});

// Test utilities specific to core package
(global as any).coreTestUtils = {
  createTestCollection: async (name: string) => {
    return testDb.collection(name);
  },
  
  insertTestData: async (collectionName: string, data: any[]) => {
    const collection = testDb.collection(collectionName);
    const result = await collection.insertMany(data);
    return result.insertedIds;
  },
  
  createMockEmbedding: (dimensions: number = 1024) => {
    return Array.from({ length: dimensions }, () => Math.random() * 2 - 1);
  },
  
  createMockWorkflow: () => ({
    workflow_id: `test_workflow_${Date.now()}`,
    workflow_name: 'Test Workflow',
    status: 'pending',
    created_at: new Date(),
    updated_at: new Date(),
    workflow_definition: {
      name: 'Test Workflow',
      version: '1.0',
      steps: [
        {
          step_id: 'step_1',
          agent_id: 'test_agent',
          description: 'Test step',
          timeout_seconds: 30,
          retry_count: 3
        }
      ]
    },
    current_step: 0,
    execution_log: [],
    shared_context: {},
    error_log: [],
    retry_attempts: 0,
    max_retries: 3
  })
};
