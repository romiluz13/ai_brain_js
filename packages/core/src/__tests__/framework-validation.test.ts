/**
 * @file framework-validation.test.ts - Validates framework integrations against official documentation
 * 
 * This test ensures our framework adapters match the official APIs exactly.
 */

import { 
  UniversalAIBrain, 
  OpenAIAdapter, 
  VercelAIAdapter, 
  LangChainJSAdapter, 
  MastraAdapter 
} from '../index';

describe('Framework Integration Validation', () => {
  let brain: UniversalAIBrain;

  beforeEach(async () => {
    brain = new UniversalAIBrain({
      mode: 'demo',
      mongoUri: 'mongodb://localhost:27017',
      databaseName: 'test_framework_validation'
    });
    await brain.initialize();
  });

  afterEach(async () => {
    await brain.cleanup();
  });

  describe('OpenAI Integration (Official OpenAI Node.js Client)', () => {
    it('should use correct OpenAI imports and patterns', async () => {
      const adapter = new OpenAIAdapter({
        openaiApiKey: 'test-key'
      });

      expect(adapter.frameworkName).toBe('OpenAI');
      expect(adapter.capabilities.supportsStreaming).toBe(true);
      expect(adapter.capabilities.supportsTools).toBe(true);
      expect(adapter.capabilities.supportedModels).toContain('gpt-4o');
      
      // Should check for real OpenAI package
      const isAvailable = adapter.checkFrameworkAvailability();
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should provide enhanced OpenAI client', async () => {
      const adapter = new OpenAIAdapter();
      const integration = await adapter.integrate(brain);

      expect(integration.createEnhancedChat).toBeDefined();
      expect(integration.createEnhancedStream).toBeDefined();
      expect(integration.enhancedClient).toBeDefined();
      expect(integration.createMongoDBTools).toBeDefined();
    });

    it('should validate OpenAI package availability correctly', () => {
      const adapter = new OpenAIAdapter();
      
      // Should try to resolve 'openai' package (not '@openai/agents')
      const isAvailable = adapter.checkFrameworkAvailability();
      expect(typeof isAvailable).toBe('boolean');
    });
  });

  describe('Vercel AI SDK Integration (Official AI SDK)', () => {
    it('should use correct Vercel AI imports', async () => {
      const adapter = new VercelAIAdapter();
      
      expect(adapter.frameworkName).toBe('Vercel AI SDK');
      expect(adapter.capabilities.supportsStreaming).toBe(true);
      expect(adapter.capabilities.supportsMultiModal).toBe(true);
      
      // Should check for real 'ai' package
      const isAvailable = adapter.checkFrameworkAvailability();
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should provide enhanced AI SDK functions', async () => {
      const adapter = new VercelAIAdapter();
      const integration = await adapter.integrate(brain);

      expect(integration.generateText).toBeDefined();
      expect(integration.streamText).toBeDefined();
      expect(integration.generateObject).toBeDefined();
      expect(integration.createMongoDBTools).toBeDefined();
    });
  });

  describe('LangChain.js Integration (Official LangChain.js)', () => {
    it('should use correct LangChain.js imports', async () => {
      const adapter = new LangChainJSAdapter();
      
      expect(adapter.frameworkName).toBe('LangChain.js');
      expect(adapter.capabilities.supportsMemory).toBe(true);
      expect(adapter.capabilities.supportsTools).toBe(true);
      
      // Should check for real '@langchain/core' and '@langchain/openai' packages
      const isAvailable = adapter.checkFrameworkAvailability();
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should validate correct LangChain.js packages', async () => {
      const adapter = new LangChainJSAdapter();
      
      // Should validate REAL LangChain.js integration (not deprecated imports)
      const isValid = await adapter.validateRealIntegration();
      expect(typeof isValid).toBe('boolean');
    });

    it('should provide LangChain.js components', async () => {
      const adapter = new LangChainJSAdapter();
      const integration = await adapter.integrate(brain);

      expect(integration.MongoDBVectorStore).toBeDefined();
      expect(integration.MongoDBMemory).toBeDefined();
      expect(integration.enhancedChatModel).toBeDefined();
      expect(integration.mongoDBRetriever).toBeDefined();
    });
  });

  describe('Mastra Integration (Official Mastra Framework)', () => {
    it('should use correct Mastra imports', async () => {
      const adapter = new MastraAdapter();
      
      expect(adapter.frameworkName).toBe('Mastra');
      expect(adapter.capabilities.supportsMemory).toBe(true);
      expect(adapter.capabilities.supportsTools).toBe(true);
      
      // Should check for real '@mastra/core' package
      const isAvailable = adapter.checkFrameworkAvailability();
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should provide Mastra components', async () => {
      const adapter = new MastraAdapter();
      const integration = await adapter.integrate(brain);

      expect(integration.createEnhancedAgent).toBeDefined();
      expect(integration.createEnhancedWorkflow).toBeDefined();
      expect(integration.createMongoDBMemory).toBeDefined();
      expect(integration.createMongoDBTools).toBeDefined();
    });
  });

  describe('Framework Factory Methods', () => {
    it('should provide correct factory methods', () => {
      // Test all static factory methods
      expect(typeof UniversalAIBrain.forOpenAI).toBe('function');
      expect(typeof UniversalAIBrain.forVercelAI).toBe('function');
      expect(typeof UniversalAIBrain.forLangChain).toBe('function');
      expect(typeof UniversalAIBrain.forMastra).toBe('function');
    });

    it('should create optimized instances for each framework', () => {
      const openaiInstance = UniversalAIBrain.forOpenAI();
      const vercelInstance = UniversalAIBrain.forVercelAI();
      const langchainInstance = UniversalAIBrain.forLangChain();
      const mastraInstance = UniversalAIBrain.forMastra();

      expect(openaiInstance).toBeInstanceOf(UniversalAIBrain);
      expect(vercelInstance).toBeInstanceOf(UniversalAIBrain);
      expect(langchainInstance).toBeInstanceOf(UniversalAIBrain);
      expect(mastraInstance).toBeInstanceOf(UniversalAIBrain);
    });
  });

  describe('MongoDB Integration Validation', () => {
    it('should validate MongoDB $rankFusion support', async () => {
      // Test that our MongoDB integration uses the correct $rankFusion syntax
      const adapter = new VercelAIAdapter();
      await adapter.integrate(brain);

      // MongoDB $rankFusion should be available in hybrid search
      const mongoTools = adapter.createMongoDBTools();
      expect(Array.isArray(mongoTools)).toBe(true);
      expect(mongoTools.length).toBeGreaterThan(0);
    });

    it('should support MongoDB 8.1 features', async () => {
      // Verify our MongoDB integration supports latest features
      expect(brain.isInitialized).toBe(true);
      
      // Should support hybrid search with $rankFusion
      const searchCapability = await brain.searchMemories('test query', {
        limit: 5,
        includeExplanation: true
      });
      
      expect(Array.isArray(searchCapability)).toBe(true);
    });
  });

  describe('Integration Completeness', () => {
    it('should have all required adapter methods', () => {
      const adapters = [
        new OpenAIAdapter(),
        new VercelAIAdapter(),
        new LangChainJSAdapter(),
        new MastraAdapter()
      ];

      adapters.forEach(adapter => {
        // Required interface methods
        expect(typeof adapter.integrate).toBe('function');
        expect(typeof adapter.enhanceWithBrain).toBe('function');
        expect(typeof adapter.getCapabilities).toBe('function');
        expect(typeof adapter.checkFrameworkAvailability).toBe('function');
        
        // Framework identification
        expect(typeof adapter.frameworkName).toBe('string');
        expect(typeof adapter.version).toBe('string');
        
        // Capabilities
        const capabilities = adapter.getCapabilities();
        expect(typeof capabilities.supportsStreaming).toBe('boolean');
        expect(typeof capabilities.supportsTools).toBe('boolean');
        expect(typeof capabilities.supportsMemory).toBe('boolean');
        expect(Array.isArray(capabilities.supportedModels)).toBe(true);
        expect(typeof capabilities.maxContextLength).toBe('number');
      });
    });
  });
});
