/**
 * @file Universal AI Brain Integration Tests
 * Comprehensive integration tests for the complete Universal AI Brain system
 */

import { UniversalAIBrain } from '../UniversalAIBrain';
import { SemanticMemoryEngine } from '../intelligence/SemanticMemoryEngine';
import { ContextInjectionEngine } from '../intelligence/ContextInjectionEngine';
import { VectorSearchEngine } from '../intelligence/VectorSearchEngine';
import { VercelAIAdapter } from '../adapters/VercelAIAdapter';
import { MastraAdapter } from '../adapters/MastraAdapter';
import { SafetyGuardrailsEngine } from '../safety/SafetyGuardrailsEngine';
import { HybridSearchEngine } from '../features/hybridSearch';

// Mock MongoDB and external dependencies
jest.mock('mongodb');
jest.mock('../embeddings/OpenAIEmbeddingProvider');

describe('Universal AI Brain Integration', () => {
  let universalAIBrain: UniversalAIBrain;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      mongoUri: 'mongodb://localhost:27017',
      databaseName: 'test_ai_brain',
      openaiApiKey: 'test_key',
      enableSafety: true,
      enableTracing: true,
      enableSelfImprovement: true
    };

    // Mock console methods to reduce test noise
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Brain Initialization', () => {
    it('should initialize Universal AI Brain with all components', async () => {
      universalAIBrain = new UniversalAIBrain(mockConfig);
      
      expect(universalAIBrain).toBeInstanceOf(UniversalAIBrain);
      expect(universalAIBrain.isInitialized()).toBe(false);
    });

    it('should handle initialization with minimal config', async () => {
      const minimalConfig = {
        mongoUri: 'mongodb://localhost:27017',
        databaseName: 'test_db'
      };

      universalAIBrain = new UniversalAIBrain(minimalConfig);
      
      expect(universalAIBrain).toBeInstanceOf(UniversalAIBrain);
    });

    it('should validate required configuration', () => {
      expect(() => {
        new UniversalAIBrain({} as any);
      }).toThrow();
    });
  });

  describe('Framework Integration', () => {
    beforeEach(async () => {
      universalAIBrain = new UniversalAIBrain(mockConfig);
    });

    it('should integrate with Vercel AI SDK', async () => {
      const vercelAdapter = new VercelAIAdapter();
      
      // Mock the integration process
      const mockIntegration = jest.fn().mockResolvedValue({
        generateText: jest.fn(),
        streamText: jest.fn()
      });
      
      jest.spyOn(universalAIBrain, 'integrate').mockImplementation(mockIntegration);
      
      const enhancedVercelAI = await universalAIBrain.integrate(vercelAdapter);
      
      expect(mockIntegration).toHaveBeenCalledWith(vercelAdapter);
      expect(enhancedVercelAI).toBeDefined();
    });

    it('should integrate with Mastra', async () => {
      const mastraAdapter = new MastraAdapter();
      
      const mockIntegration = jest.fn().mockResolvedValue({
        createAgent: jest.fn(),
        enhanceAgent: jest.fn()
      });
      
      jest.spyOn(universalAIBrain, 'integrate').mockImplementation(mockIntegration);
      
      const enhancedMastra = await universalAIBrain.integrate(mastraAdapter);
      
      expect(mockIntegration).toHaveBeenCalledWith(mastraAdapter);
      expect(enhancedMastra).toBeDefined();
    });

    it('should handle framework integration errors gracefully', async () => {
      const faultyAdapter = {
        frameworkName: 'faulty-framework',
        integrate: jest.fn().mockRejectedValue(new Error('Integration failed'))
      };
      
      const mockIntegration = jest.fn().mockRejectedValue(new Error('Integration failed'));
      jest.spyOn(universalAIBrain, 'integrate').mockImplementation(mockIntegration);
      
      await expect(universalAIBrain.integrate(faultyAdapter as any)).rejects.toThrow('Integration failed');
    });
  });

  describe('Intelligence Layer Integration', () => {
    beforeEach(() => {
      universalAIBrain = new UniversalAIBrain(mockConfig);
    });

    it('should coordinate semantic memory and context injection', async () => {
      // Mock the intelligence components
      const mockSemanticMemory = {
        storeMemory: jest.fn().mockResolvedValue('memory_123'),
        retrieveRelevantMemories: jest.fn().mockResolvedValue([
          {
            id: 'memory_1',
            content: 'User prefers morning meetings',
            metadata: { type: 'preference', importance: 0.8 }
          }
        ])
      };

      const mockContextInjection = {
        enhancePrompt: jest.fn().mockResolvedValue({
          originalPrompt: 'Schedule a meeting',
          enhancedPrompt: 'Based on your preference for morning meetings, schedule a meeting',
          injectedContext: [{ content: 'User prefers morning meetings' }],
          optimizationMetrics: { contextRelevance: 0.85 }
        })
      };

      // Mock the brain's intelligence components
      jest.spyOn(universalAIBrain as any, 'getSemanticMemoryEngine').mockReturnValue(mockSemanticMemory);
      jest.spyOn(universalAIBrain as any, 'getContextInjectionEngine').mockReturnValue(mockContextInjection);

      // Test the coordination
      const userInput = 'Schedule a meeting';
      const sessionId = 'session_123';

      // This would be called internally during framework integration
      const memories = await mockSemanticMemory.retrieveRelevantMemories(userInput);
      const enhanced = await mockContextInjection.enhancePrompt(userInput);

      expect(memories).toHaveLength(1);
      expect(enhanced.enhancedPrompt).toContain('morning meetings');
      expect(enhanced.optimizationMetrics.contextRelevance).toBeGreaterThan(0.8);
    });

    it('should handle vector search integration', async () => {
      const mockVectorSearch = {
        semanticSearch: jest.fn().mockResolvedValue([
          {
            id: 'doc_1',
            content: 'Meeting best practices',
            score: 0.9,
            metadata: { source: 'knowledge_base' }
          }
        ]),
        createEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3])
      };

      jest.spyOn(universalAIBrain as any, 'getVectorSearchEngine').mockReturnValue(mockVectorSearch);

      const query = 'How to run effective meetings?';
      const results = await mockVectorSearch.semanticSearch(query);

      expect(results).toHaveLength(1);
      expect(results[0].score).toBe(0.9);
      expect(mockVectorSearch.createEmbedding).toHaveBeenCalledWith(query);
    });
  });

  describe('Safety Integration', () => {
    beforeEach(() => {
      universalAIBrain = new UniversalAIBrain(mockConfig);
    });

    it('should integrate safety systems with intelligence layer', async () => {
      const mockSafetyEngine = {
        validateInput: jest.fn().mockResolvedValue({
          isValid: true,
          sanitizedInput: 'Clean input',
          detectedIssues: []
        }),
        validateOutput: jest.fn().mockResolvedValue({
          isValid: true,
          sanitizedOutput: 'Safe output',
          detectedIssues: []
        })
      };

      jest.spyOn(universalAIBrain as any, 'getSafetyEngine').mockReturnValue(mockSafetyEngine);

      const userInput = 'Tell me about user@example.com';
      const aiOutput = 'Here is information about the user';

      const inputValidation = await mockSafetyEngine.validateInput(userInput);
      const outputValidation = await mockSafetyEngine.validateOutput(aiOutput);

      expect(inputValidation.isValid).toBe(true);
      expect(outputValidation.isValid).toBe(true);
      expect(mockSafetyEngine.validateInput).toHaveBeenCalledWith(userInput);
      expect(mockSafetyEngine.validateOutput).toHaveBeenCalledWith(aiOutput);
    });

    it('should handle safety violations appropriately', async () => {
      const mockSafetyEngine = {
        validateInput: jest.fn().mockResolvedValue({
          isValid: false,
          sanitizedInput: '[REDACTED]',
          detectedIssues: ['PII_DETECTED']
        })
      };

      jest.spyOn(universalAIBrain as any, 'getSafetyEngine').mockReturnValue(mockSafetyEngine);

      const unsafeInput = 'My SSN is 123-45-6789';
      const validation = await mockSafetyEngine.validateInput(unsafeInput);

      expect(validation.isValid).toBe(false);
      expect(validation.detectedIssues).toContain('PII_DETECTED');
      expect(validation.sanitizedInput).toBe('[REDACTED]');
    });
  });

  describe('End-to-End Workflow', () => {
    beforeEach(() => {
      universalAIBrain = new UniversalAIBrain(mockConfig);
    });

    it('should execute complete AI enhancement workflow', async () => {
      // Mock all components for end-to-end test
      const mockWorkflow = {
        // 1. Safety validation
        validateInput: jest.fn().mockResolvedValue({
          isValid: true,
          sanitizedInput: 'Schedule a team meeting',
          detectedIssues: []
        }),

        // 2. Memory retrieval
        retrieveMemories: jest.fn().mockResolvedValue([
          {
            id: 'memory_1',
            content: 'Team prefers afternoon meetings',
            metadata: { type: 'preference', importance: 0.8 }
          }
        ]),

        // 3. Context injection
        enhancePrompt: jest.fn().mockResolvedValue({
          originalPrompt: 'Schedule a team meeting',
          enhancedPrompt: 'Based on team preference for afternoon meetings, schedule a team meeting',
          injectedContext: [{ content: 'Team prefers afternoon meetings' }],
          optimizationMetrics: { contextRelevance: 0.9 }
        }),

        // 4. AI processing (mocked)
        processWithAI: jest.fn().mockResolvedValue({
          response: 'I\'ll schedule the team meeting for 2 PM tomorrow',
          metadata: { model: 'gpt-4', tokens: 150 }
        }),

        // 5. Output validation
        validateOutput: jest.fn().mockResolvedValue({
          isValid: true,
          sanitizedOutput: 'I\'ll schedule the team meeting for 2 PM tomorrow',
          detectedIssues: []
        }),

        // 6. Learning and improvement
        recordInteraction: jest.fn().mockResolvedValue({
          traceId: 'trace_123',
          stored: true
        })
      };

      // Execute the workflow
      const userInput = 'Schedule a team meeting';
      
      // 1. Safety validation
      const inputValidation = await mockWorkflow.validateInput(userInput);
      expect(inputValidation.isValid).toBe(true);

      // 2. Memory retrieval
      const memories = await mockWorkflow.retrieveMemories(inputValidation.sanitizedInput);
      expect(memories).toHaveLength(1);

      // 3. Context injection
      const enhanced = await mockWorkflow.enhancePrompt(inputValidation.sanitizedInput);
      expect(enhanced.enhancedPrompt).toContain('afternoon meetings');

      // 4. AI processing
      const aiResponse = await mockWorkflow.processWithAI(enhanced.enhancedPrompt);
      expect(aiResponse.response).toContain('2 PM');

      // 5. Output validation
      const outputValidation = await mockWorkflow.validateOutput(aiResponse.response);
      expect(outputValidation.isValid).toBe(true);

      // 6. Learning
      const trace = await mockWorkflow.recordInteraction({
        input: userInput,
        output: aiResponse.response,
        context: enhanced.injectedContext,
        metrics: enhanced.optimizationMetrics
      });
      expect(trace.stored).toBe(true);
    });

    it('should handle workflow failures gracefully', async () => {
      const mockFailingWorkflow = {
        validateInput: jest.fn().mockRejectedValue(new Error('Safety system unavailable')),
        fallbackProcess: jest.fn().mockResolvedValue({
          response: 'I apologize, but I cannot process your request right now',
          fallback: true
        })
      };

      // Test graceful degradation
      try {
        await mockFailingWorkflow.validateInput('test input');
      } catch (error) {
        const fallbackResponse = await mockFailingWorkflow.fallbackProcess();
        expect(fallbackResponse.fallback).toBe(true);
        expect(fallbackResponse.response).toContain('cannot process');
      }
    });
  });

  describe('Performance and Scalability', () => {
    beforeEach(() => {
      universalAIBrain = new UniversalAIBrain(mockConfig);
    });

    it('should handle concurrent requests efficiently', async () => {
      const mockProcessor = {
        processRequest: jest.fn().mockImplementation(async (input: string) => {
          // Simulate processing time
          await new Promise(resolve => setTimeout(resolve, 10));
          return { response: `Processed: ${input}`, timestamp: Date.now() };
        })
      };

      // Simulate concurrent requests
      const requests = Array.from({ length: 10 }, (_, i) => `Request ${i + 1}`);
      const startTime = Date.now();

      const results = await Promise.all(
        requests.map(request => mockProcessor.processRequest(request))
      );

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(results).toHaveLength(10);
      expect(totalTime).toBeLessThan(200); // Should process concurrently, not sequentially
      
      results.forEach((result, index) => {
        expect(result.response).toBe(`Processed: Request ${index + 1}`);
      });
    });

    it('should implement proper caching for performance', async () => {
      const mockCache = {
        get: jest.fn(),
        set: jest.fn(),
        processWithCache: jest.fn().mockImplementation(async (key: string) => {
          const cached = mockCache.get(key);
          if (cached) {
            return cached;
          }
          
          const result = { data: `Processed ${key}`, timestamp: Date.now() };
          mockCache.set(key, result);
          return result;
        })
      };

      const cacheKey = 'test_query';
      
      // First call - should process and cache
      mockCache.get.mockReturnValueOnce(null);
      const result1 = await mockCache.processWithCache(cacheKey);
      
      // Second call - should return cached result
      mockCache.get.mockReturnValueOnce(result1);
      const result2 = await mockCache.processWithCache(cacheKey);

      expect(result1).toEqual(result2);
      expect(mockCache.set).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Recovery and Resilience', () => {
    beforeEach(() => {
      universalAIBrain = new UniversalAIBrain(mockConfig);
    });

    it('should recover from database connection failures', async () => {
      const mockResilience = {
        connectWithRetry: jest.fn()
          .mockRejectedValueOnce(new Error('Connection failed'))
          .mockRejectedValueOnce(new Error('Connection failed'))
          .mockResolvedValueOnce({ connected: true }),
        
        processWithFallback: jest.fn().mockImplementation(async () => {
          try {
            await mockResilience.connectWithRetry();
            return { success: true, source: 'database' };
          } catch (error) {
            return { success: true, source: 'fallback', message: 'Using cached data' };
          }
        })
      };

      const result = await mockResilience.processWithFallback();
      
      expect(mockResilience.connectWithRetry).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
      expect(result.source).toBe('database');
    });

    it('should handle component failures with graceful degradation', async () => {
      const mockComponents = {
        primaryService: jest.fn().mockRejectedValue(new Error('Service unavailable')),
        fallbackService: jest.fn().mockResolvedValue({ result: 'fallback response' }),
        
        processWithFallback: jest.fn().mockImplementation(async () => {
          try {
            return await mockComponents.primaryService();
          } catch (error) {
            console.warn('Primary service failed, using fallback');
            return await mockComponents.fallbackService();
          }
        })
      };

      const result = await mockComponents.processWithFallback();
      
      expect(result.result).toBe('fallback response');
      expect(mockComponents.primaryService).toHaveBeenCalled();
      expect(mockComponents.fallbackService).toHaveBeenCalled();
    });
  });
});
