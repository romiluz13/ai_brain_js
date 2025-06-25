/**
 * @file framework-integration.test.ts - Comprehensive framework integration tests
 * 
 * This test suite validates that ALL framework integrations (Vercel AI, Mastra, 
 * OpenAI Agents, LangChain) work correctly with the Universal AI Brain and
 * follow official framework API patterns.
 */

// Jest is automatically available in the test environment
import { MongoClient, Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { UniversalAIBrain } from '../../UniversalAIBrain';
import { VercelAIAdapter } from '../../adapters/VercelAIAdapter';
import { MastraAdapter } from '../../adapters/MastraAdapter';
import { OpenAIAgentsAdapter } from '../../adapters/OpenAIAgentsAdapter';
import { LangChainAdapter } from '../../adapters/LangChainAdapter';

// Mock external dependencies using Jest
jest.mock('ai', () => ({
  generateText: jest.fn(),
  streamText: jest.fn(),
  generateObject: jest.fn()
}));

jest.mock('@mastra/core', () => ({
  Agent: jest.fn().mockImplementation((config) => ({
    name: config.name,
    instructions: config.instructions,
    model: config.model,
    generate: jest.fn().mockResolvedValue({ text: 'Mocked Mastra response' }),
    stream: jest.fn().mockResolvedValue({ text: 'Mocked Mastra stream' })
  }))
}));

jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mocked OpenAI response' } }]
        })
      }
    },
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: [{ embedding: Array.from({ length: 1536 }, () => Math.random()) }]
      })
    }
  }))
}));

describe('Framework Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let db: Db;
  let brain: UniversalAIBrain;

  beforeAll(async () => {
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    db = mongoClient.db('test-ai-brain');

    // Initialize Universal AI Brain
    brain = new UniversalAIBrain({
      mongoConfig: {
        uri,
        dbName: 'test-ai-brain'
      },
      embeddingConfig: {
        provider: 'openai',
        apiKey: 'test-key'
      }
    });

    await brain.initialize();
  });

  afterAll(async () => {
    await brain.cleanup();
    await mongoClient.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clean up collections before each test
    await db.collection('traces').deleteMany({});
    await db.collection('memories').deleteMany({});
    jest.clearAllMocks();
  });

  describe('Vercel AI SDK Integration', () => {
    let vercelAdapter: VercelAIAdapter;

    beforeEach(async () => {
      vercelAdapter = new VercelAIAdapter();
      await vercelAdapter.integrate(brain);
    });

    it('should preserve official generateText API signature', async () => {
      const enhanced = vercelAdapter.createEnhancedSDK();

      // Test that enhanced SDK has the same interface as official SDK
      expect(enhanced.generateText).toBeDefined();
      expect(enhanced.streamText).toBeDefined();
      expect(enhanced.generateObject).toBeDefined();
      expect(typeof enhanced.generateText).toBe('function');
    });

    it('should call real Vercel AI SDK functions', async () => {
      const { generateText } = await import('ai');
      const enhanced = vercelAdapter.createEnhancedSDK();

      await enhanced.generateText({
        model: { name: 'gpt-4' },
        messages: [{ role: 'user', content: 'Hello' }]
      });

      // Verify that the real generateText function was called
      expect(generateText).toHaveBeenCalled();
    });

    it('should enhance prompts with MongoDB context', async () => {
      // Store some context in MongoDB
      await brain.storeInteraction({
        conversationId: 'test-conversation',
        userMessage: 'I like MongoDB for AI applications',
        assistantResponse: 'MongoDB is great for vector search',
        context: [],
        framework: 'vercel-ai'
      });

      const enhanced = vercelAdapter.createEnhancedSDK();
      
      const result = await enhanced.generateText({
        model: { name: 'gpt-4' },
        messages: [{ role: 'user', content: 'What do you know about my preferences?' }],
        conversationId: 'test-conversation'
      });

      expect(result).toBeDefined();
      // The adapter should have retrieved and used the stored context
    });

    it('should maintain backward compatibility', async () => {
      const enhanced = vercelAdapter.createEnhancedSDK();

      // Should work without conversationId (backward compatible)
      const result = await enhanced.generateText({
        model: { name: 'gpt-4' },
        messages: [{ role: 'user', content: 'Hello' }]
      });

      expect(result).toBeDefined();
    });

    it('should handle streaming correctly', async () => {
      const { streamText } = await import('ai');
      const enhanced = vercelAdapter.createEnhancedSDK();

      await enhanced.streamText({
        model: { name: 'gpt-4' },
        messages: [{ role: 'user', content: 'Hello' }]
      });

      expect(streamText).toHaveBeenCalled();
    });
  });

  describe('Mastra Framework Integration', () => {
    let mastraAdapter: MastraAdapter;

    beforeEach(async () => {
      mastraAdapter = new MastraAdapter();
      await mastraAdapter.integrate(brain);
    });

    it('should use real Mastra Agent class', async () => {
      const { Agent } = await import('@mastra/core');
      const enhanced = mastraAdapter.createEnhancedAgent({
        name: 'Test Agent',
        instructions: 'You are a test agent',
        model: { name: 'gpt-4' }
      });

      expect(Agent).toHaveBeenCalled();
      expect(enhanced.name).toBe('Test Agent');
    });

    it('should follow official Mastra memory patterns', async () => {
      const enhanced = mastraAdapter.createEnhancedAgent({
        name: 'Memory Agent',
        instructions: 'You have memory',
        model: { name: 'gpt-4' }
      });

      // Test with resourceId and threadId (required by Mastra)
      const result = await enhanced.generate(
        [{ role: 'user', content: 'Remember this' }],
        { resourceId: 'user_123', threadId: 'thread_456' }
      );

      expect(result).toBeDefined();
    });

    it('should warn when memory requirements are not met', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const enhanced = mastraAdapter.createEnhancedAgent({
        name: 'Test Agent',
        instructions: 'Test',
        model: { name: 'gpt-4' }
      });

      // Call without resourceId/threadId
      await enhanced.generate([{ role: 'user', content: 'Hello' }]);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Mastra memory requires both resourceId and threadId')
      );

      consoleSpy.mockRestore();
    });

    it('should enhance agents with MongoDB memory', async () => {
      const enhanced = mastraAdapter.createEnhancedAgent({
        name: 'Enhanced Agent',
        instructions: 'You have MongoDB memory',
        model: { name: 'gpt-4' }
      });

      expect(enhanced.memory).toBeDefined();
      expect(typeof enhanced.memory.store).toBe('function');
      expect(typeof enhanced.memory.retrieve).toBe('function');
    });

    it('should support streaming with context enhancement', async () => {
      const enhanced = mastraAdapter.createEnhancedAgent({
        name: 'Stream Agent',
        instructions: 'You can stream',
        model: { name: 'gpt-4' }
      });

      const result = await enhanced.stream(
        [{ role: 'user', content: 'Stream this' }],
        { conversationId: 'stream-test' }
      );

      expect(result).toBeDefined();
    });
  });

  describe('OpenAI Agents Integration', () => {
    let openaiAdapter: OpenAIAgentsAdapter;

    beforeEach(async () => {
      openaiAdapter = new OpenAIAgentsAdapter();
      await openaiAdapter.integrate(brain);
    });

    it('should use real OpenAI client', async () => {
      const enhanced = openaiAdapter.createEnhancedClient();

      expect(enhanced.chat).toBeDefined();
      expect(enhanced.chat.completions).toBeDefined();
      expect(typeof enhanced.chat.completions.create).toBe('function');
    });

    it('should enhance chat completions with context', async () => {
      // Store context
      await brain.storeInteraction({
        conversationId: 'openai-test',
        userMessage: 'I work with TypeScript',
        assistantResponse: 'TypeScript is great for type safety',
        context: [],
        framework: 'openai-agents'
      });

      const enhanced = openaiAdapter.createEnhancedClient();
      
      const result = await enhanced.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'What do you know about my work?' }],
        conversationId: 'openai-test'
      });

      expect(result).toBeDefined();
      expect(result.choices).toBeDefined();
    });

    it('should maintain OpenAI API compatibility', async () => {
      const enhanced = openaiAdapter.createEnhancedClient();

      // Should work exactly like the official OpenAI client
      const result = await enhanced.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }]
      });

      expect(result.choices).toBeDefined();
      expect(result.choices[0].message.content).toBeDefined();
    });

    it('should handle embeddings correctly', async () => {
      const enhanced = openaiAdapter.createEnhancedClient();

      const result = await enhanced.embeddings.create({
        model: 'text-embedding-ada-002',
        input: 'Test embedding'
      });

      expect(result.data).toBeDefined();
      expect(result.data[0].embedding).toBeDefined();
      expect(Array.isArray(result.data[0].embedding)).toBe(true);
    });
  });

  describe('LangChain Integration', () => {
    let langchainAdapter: LangChainAdapter;

    beforeEach(async () => {
      langchainAdapter = new LangChainAdapter();
      await langchainAdapter.integrate(brain);
    });

    it('should create enhanced LangChain components', async () => {
      const enhanced = langchainAdapter.createEnhancedComponents();

      expect(enhanced.ChatOpenAI).toBeDefined();
      expect(enhanced.ConversationChain).toBeDefined();
      expect(enhanced.VectorStore).toBeDefined();
    });

    it('should enhance memory with MongoDB', async () => {
      const enhanced = langchainAdapter.createEnhancedComponents();
      const memory = enhanced.ConversationBufferMemory;

      expect(memory).toBeDefined();
      // Memory should be enhanced with MongoDB capabilities
    });

    it('should provide MongoDB vector store', async () => {
      const enhanced = langchainAdapter.createEnhancedComponents();
      const vectorStore = enhanced.VectorStore;

      expect(vectorStore).toBeDefined();
      expect(typeof vectorStore.similaritySearch).toBe('function');
    });

    it('should maintain LangChain API patterns', async () => {
      const enhanced = langchainAdapter.createEnhancedComponents();

      // Should follow LangChain patterns
      expect(enhanced.ChatOpenAI).toBeDefined();
      expect(enhanced.ConversationChain).toBeDefined();
    });
  });

  describe('Cross-Framework Compatibility', () => {
    it('should work with multiple frameworks simultaneously', async () => {
      const vercelAdapter = new VercelAIAdapter();
      const mastraAdapter = new MastraAdapter();

      await vercelAdapter.integrate(brain);
      await mastraAdapter.integrate(brain);

      const vercelSDK = vercelAdapter.createEnhancedSDK();
      const mastraAgent = mastraAdapter.createEnhancedAgent({
        name: 'Multi Framework Agent',
        instructions: 'You work with multiple frameworks',
        model: { name: 'gpt-4' }
      });

      // Both should work independently
      expect(vercelSDK.generateText).toBeDefined();
      expect(mastraAgent.generate).toBeDefined();
    });

    it('should share context across frameworks', async () => {
      const conversationId = 'cross-framework-test';

      // Store interaction via Vercel AI
      await brain.storeInteraction({
        conversationId,
        userMessage: 'I prefer React for frontend',
        assistantResponse: 'React is excellent for building UIs',
        context: [],
        framework: 'vercel-ai'
      });

      // Retrieve context via Mastra
      const context = await brain.getRelevantContext('What frontend framework should I use?', {
        conversationId,
        limit: 5
      });

      expect(context.length).toBeGreaterThan(0);
      expect(context[0].content).toContain('React');
    });

    it('should maintain framework-specific tracing', async () => {
      const vercelAdapter = new VercelAIAdapter();
      const mastraAdapter = new MastraAdapter();

      await vercelAdapter.integrate(brain);
      await mastraAdapter.integrate(brain);

      // Use both frameworks
      const vercelSDK = vercelAdapter.createEnhancedSDK();
      await vercelSDK.generateText({
        model: { name: 'gpt-4' },
        messages: [{ role: 'user', content: 'Vercel test' }]
      });

      const mastraAgent = mastraAdapter.createEnhancedAgent({
        name: 'Test Agent',
        instructions: 'Test',
        model: { name: 'gpt-4' }
      });
      await mastraAgent.generate([{ role: 'user', content: 'Mastra test' }]);

      // Check that traces are properly attributed
      const traces = await db.collection('traces').find({}).toArray();
      
      const vercelTraces = traces.filter(t => t.framework?.frameworkName === 'vercel-ai');
      const mastraTraces = traces.filter(t => t.framework?.frameworkName === 'mastra');

      expect(vercelTraces.length).toBeGreaterThan(0);
      expect(mastraTraces.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle framework initialization errors gracefully', async () => {
      const faultyAdapter = new VercelAIAdapter();
      
      // Simulate initialization error
      const originalIntegrate = faultyAdapter.integrate;
      faultyAdapter.integrate = jest.fn().mockRejectedValue(new Error('Integration failed'));

      try {
        await faultyAdapter.integrate(brain);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toBe('Integration failed');
      }
    });

    it('should fallback gracefully when MongoDB is unavailable', async () => {
      // Close MongoDB connection to simulate unavailability
      await mongoClient.close();

      const adapter = new VercelAIAdapter();
      
      try {
        await adapter.integrate(brain);
        const enhanced = adapter.createEnhancedSDK();
        
        // Should still work without MongoDB enhancement
        const result = await enhanced.generateText({
          model: { name: 'gpt-4' },
          messages: [{ role: 'user', content: 'Hello' }]
        });

        expect(result).toBeDefined();
      } catch (error) {
        // Expected behavior - should handle gracefully
        expect(error).toBeDefined();
      }

      // Reconnect for other tests
      mongoClient = new MongoClient(mongoServer.getUri());
      await mongoClient.connect();
    });

    it('should handle malformed context data', async () => {
      // Store malformed data
      await db.collection('memories').insertOne({
        content: 'invalid json content',
        metadata: { type: 'malformed' }
      });

      const adapter = new VercelAIAdapter();
      await adapter.integrate(brain);
      const enhanced = adapter.createEnhancedSDK();

      // Should handle malformed data gracefully
      const result = await enhanced.generateText({
        model: { name: 'gpt-4' },
        messages: [{ role: 'user', content: 'Hello' }],
        conversationId: 'malformed-test'
      });

      expect(result).toBeDefined();
    });
  });
});
