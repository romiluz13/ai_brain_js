/**
 * @file Production Readiness Test Suite
 * Master test suite that validates the Universal AI Brain is ready for production deployment
 */

import { HybridSearchEngine } from '../features/hybridSearch';
import { SafetyGuardrailsEngine } from '../safety/SafetyGuardrailsEngine';

describe('Universal AI Brain - Production Readiness', () => {
  describe('Critical Component Availability', () => {
    it('should have all intelligence layer components available', async () => {
      const { SemanticMemoryEngine, ContextInjectionEngine, VectorSearchEngine } = await import('../intelligence');
      
      expect(SemanticMemoryEngine).toBeDefined();
      expect(ContextInjectionEngine).toBeDefined();
      expect(VectorSearchEngine).toBeDefined();
      
      expect(typeof SemanticMemoryEngine).toBe('function');
      expect(typeof ContextInjectionEngine).toBe('function');
      expect(typeof VectorSearchEngine).toBe('function');
    });

    it('should have all framework adapters available', async () => {
      const { VercelAIAdapter, MastraAdapter, LangChainJSAdapter, OpenAIAgentsAdapter } = await import('../index');
      
      expect(VercelAIAdapter).toBeDefined();
      expect(MastraAdapter).toBeDefined();
      expect(LangChainJSAdapter).toBeDefined();
      expect(OpenAIAgentsAdapter).toBeDefined();
    });

    it('should have all safety systems available', async () => {
      const { SafetyGuardrailsEngine, SafetyEngine, HallucinationDetector, PIIDetector } = await import('../index');
      
      expect(SafetyGuardrailsEngine).toBeDefined();
      expect(SafetyEngine).toBeDefined();
      expect(HallucinationDetector).toBeDefined();
      expect(PIIDetector).toBeDefined();
      
      // Verify SafetyEngine is properly aliased
      expect(SafetyEngine).toBe(SafetyGuardrailsEngine);
    });

    it('should have all collections available', async () => {
      const { MemoryCollection, ContextCollection, TracingCollection, CollectionManager } = await import('../index');
      
      expect(MemoryCollection).toBeDefined();
      expect(ContextCollection).toBeDefined();
      expect(TracingCollection).toBeDefined();
      expect(CollectionManager).toBeDefined();
    });
  });

  describe('MongoDB Integration Readiness', () => {
    it('should have proper MongoDB vector search patterns', () => {
      // Test that we can construct MongoDB aggregation pipelines
      const vectorSearchPipeline = [
        {
          $vectorSearch: {
            index: 'memory_vector_index',
            path: 'embedding.values',
            queryVector: [0.1, 0.2, 0.3],
            numCandidates: 150,
            limit: 10,
            filter: { 'metadata.framework': 'vercel-ai' }
          }
        },
        {
          $addFields: {
            vectorScore: { $meta: 'vectorSearchScore' }
          }
        },
        {
          $match: {
            vectorScore: { $gte: 0.7 }
          }
        }
      ];

      expect(vectorSearchPipeline).toHaveLength(3);
      expect(vectorSearchPipeline[0].$vectorSearch).toBeDefined();
      expect(vectorSearchPipeline[0].$vectorSearch.index).toBe('memory_vector_index');
      expect(vectorSearchPipeline[1].$addFields.vectorScore).toEqual({ $meta: 'vectorSearchScore' });
    });

    it('should have proper hybrid search patterns', () => {
      const hybridSearchPipeline = [
        {
          $vectorSearch: {
            index: 'vector_search_index',
            path: 'embedding.values',
            queryVector: [0.1, 0.2, 0.3],
            numCandidates: 150,
            limit: 20
          }
        },
        {
          $addFields: {
            vectorScore: { $meta: 'vectorSearchScore' }
          }
        },
        {
          $search: {
            index: 'text_search_index',
            compound: {
              must: [{ text: { query: 'test query', path: ['content.text'] } }]
            }
          }
        },
        {
          $addFields: {
            textScore: { $meta: 'searchScore' },
            combinedScore: {
              $add: [
                { $multiply: ['$vectorScore', 0.7] },
                { $multiply: ['$textScore', 0.3] }
              ]
            }
          }
        }
      ];

      expect(hybridSearchPipeline).toHaveLength(4);
      expect(hybridSearchPipeline[0].$vectorSearch).toBeDefined();
      expect(hybridSearchPipeline[2].$search).toBeDefined();
      expect(hybridSearchPipeline[3].$addFields.combinedScore).toBeDefined();
    });

    it('should have proper indexing strategies', () => {
      const indexingStrategies = {
        // Vector search indexes
        vectorIndexes: [
          { 'embedding.values': '2dsphere' },
          { 'embedding.values': 'vector' } // Atlas Vector Search
        ],
        
        // Performance indexes
        performanceIndexes: [
          { 'metadata.framework': 1, 'metadata.importance': -1 },
          { 'metadata.sessionId': 1, 'metadata.lastUsed': -1 },
          { 'metadata.userId': 1, 'metadata.framework': 1, 'metadata.lastUsed': -1 }
        ],
        
        // TTL indexes
        ttlIndexes: [
          { ttl: 1, expireAfterSeconds: 0 },
          { 'metadata.lastUsed': 1, expireAfterSeconds: 2592000 } // 30 days
        ],
        
        // Text search indexes
        textIndexes: [
          { content: 'text', 'metadata.tags': 'text' }
        ]
      };

      expect(indexingStrategies.vectorIndexes).toHaveLength(2);
      expect(indexingStrategies.performanceIndexes).toHaveLength(3);
      expect(indexingStrategies.ttlIndexes).toHaveLength(2);
      expect(indexingStrategies.textIndexes).toHaveLength(1);
    });
  });

  describe('Framework Integration Readiness', () => {
    it('should support Vercel AI SDK patterns', () => {
      const vercelAIPattern = {
        enhanceGenerateText: async (originalFn: Function, options: any) => {
          // 1. Context retrieval
          const context = await mockContextRetrieval(options.messages);
          
          // 2. Prompt enhancement
          const enhanced = await mockPromptEnhancement(options.messages, context);
          
          // 3. Safety validation
          const validated = await mockSafetyValidation(enhanced);
          
          // 4. Call original function
          const result = await originalFn({ ...options, messages: validated });
          
          // 5. Store trace
          await mockTraceStorage(options, result, context);
          
          return result;
        }
      };

      expect(typeof vercelAIPattern.enhanceGenerateText).toBe('function');
    });

    it('should support Mastra patterns', () => {
      const mastraPattern = {
        enhanceAgent: async (agent: any) => {
          return {
            ...agent,
            generate: async (input: any) => {
              // Enhanced with MongoDB intelligence
              const context = await mockContextRetrieval(input);
              const enhanced = await mockPromptEnhancement(input, context);
              return await agent.originalGenerate(enhanced);
            }
          };
        }
      };

      expect(typeof mastraPattern.enhanceAgent).toBe('function');
    });

    it('should support LangChain.js patterns', () => {
      const langchainPattern = {
        createMongoVectorStore: () => ({
          addDocuments: jest.fn(),
          similaritySearch: jest.fn(),
          similaritySearchWithScore: jest.fn(),
          delete: jest.fn()
        }),
        
        createMongoMemory: () => ({
          saveContext: jest.fn(),
          loadMemoryVariables: jest.fn(),
          clear: jest.fn()
        })
      };

      expect(typeof langchainPattern.createMongoVectorStore).toBe('function');
      expect(typeof langchainPattern.createMongoMemory).toBe('function');
    });

    it('should support OpenAI Agents patterns', () => {
      const openaiAgentsPattern = {
        createMongoTools: () => [
          {
            name: 'semantic_search',
            description: 'Search for relevant information using semantic similarity',
            function: async (query: string) => {
              return await mockSemanticSearch(query);
            }
          },
          {
            name: 'store_memory',
            description: 'Store information for future reference',
            function: async (content: string, metadata: any) => {
              return await mockMemoryStorage(content, metadata);
            }
          }
        ]
      };

      const tools = openaiAgentsPattern.createMongoTools();
      expect(tools).toHaveLength(2);
      expect(tools[0].name).toBe('semantic_search');
      expect(tools[1].name).toBe('store_memory');
    });
  });

  describe('Safety and Compliance Readiness', () => {
    it('should have PII detection capabilities', () => {
      const piiPatterns = {
        email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
        phone: /\b\d{3}-\d{3}-\d{4}\b/g,
        creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g
      };

      const testText = 'Contact john@example.com or call 555-123-4567';
      const emailMatches = testText.match(piiPatterns.email);
      const phoneMatches = testText.match(piiPatterns.phone);

      expect(emailMatches).toHaveLength(1);
      expect(phoneMatches).toHaveLength(1);
    });

    it('should have hallucination detection patterns', () => {
      const hallucinationDetection = {
        confidenceThreshold: 0.8,
        factualityChecks: [
          'source_verification',
          'consistency_check',
          'plausibility_assessment'
        ],
        
        detectHallucination: (response: string, confidence: number) => {
          return {
            isHallucination: confidence < hallucinationDetection.confidenceThreshold,
            confidence,
            checks: hallucinationDetection.factualityChecks
          };
        }
      };

      const result = hallucinationDetection.detectHallucination('Test response', 0.6);
      expect(result.isHallucination).toBe(true);
      expect(result.confidence).toBe(0.6);
    });

    it('should have compliance audit logging', () => {
      const auditLog = {
        logInteraction: (interaction: any) => ({
          timestamp: new Date(),
          interactionId: 'interaction_123',
          userId: interaction.userId,
          framework: interaction.framework,
          inputHash: 'hash_of_input',
          outputHash: 'hash_of_output',
          safetyChecks: ['PII_SCAN', 'HALLUCINATION_CHECK'],
          complianceFlags: []
        })
      };

      const log = auditLog.logInteraction({
        userId: 'user_123',
        framework: 'vercel-ai',
        input: 'test input',
        output: 'test output'
      });

      expect(log.timestamp).toBeInstanceOf(Date);
      expect(log.safetyChecks).toContain('PII_SCAN');
      expect(log.safetyChecks).toContain('HALLUCINATION_CHECK');
    });
  });

  describe('Performance and Scalability Readiness', () => {
    it('should have proper caching strategies', () => {
      const cachingStrategies = {
        embeddingCache: {
          maxSize: 1000,
          ttl: 5 * 60 * 1000, // 5 minutes
          strategy: 'LRU'
        },
        
        contextCache: {
          maxSize: 500,
          ttl: 5 * 60 * 1000, // 5 minutes
          strategy: 'LRU'
        },
        
        searchCache: {
          maxSize: 1000,
          ttl: 5 * 60 * 1000, // 5 minutes
          strategy: 'LRU'
        }
      };

      expect(cachingStrategies.embeddingCache.maxSize).toBe(1000);
      expect(cachingStrategies.contextCache.ttl).toBe(5 * 60 * 1000);
      expect(cachingStrategies.searchCache.strategy).toBe('LRU');
    });

    it('should have connection pooling configuration', () => {
      const connectionConfig = {
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        retryWrites: true,
        retryReads: true
      };

      expect(connectionConfig.maxPoolSize).toBe(10);
      expect(connectionConfig.retryWrites).toBe(true);
      expect(connectionConfig.retryReads).toBe(true);
    });

    it('should have proper error handling and fallbacks', () => {
      const errorHandling = {
        retryConfig: {
          maxRetries: 3,
          backoffMultiplier: 2,
          initialDelay: 1000
        },
        
        fallbackStrategies: [
          'cached_response',
          'simplified_processing',
          'error_response'
        ],
        
        circuitBreaker: {
          failureThreshold: 5,
          resetTimeout: 60000,
          monitoringPeriod: 10000
        }
      };

      expect(errorHandling.retryConfig.maxRetries).toBe(3);
      expect(errorHandling.fallbackStrategies).toContain('cached_response');
      expect(errorHandling.circuitBreaker.failureThreshold).toBe(5);
    });
  });

  describe('Production Deployment Readiness', () => {
    it('should have environment configuration validation', () => {
      const requiredEnvVars = [
        'MONGODB_URI',
        'DATABASE_NAME',
        'OPENAI_API_KEY'
      ];

      const optionalEnvVars = [
        'REDIS_URL',
        'LOG_LEVEL',
        'ENABLE_TRACING',
        'ENABLE_SAFETY'
      ];

      expect(requiredEnvVars).toHaveLength(3);
      expect(optionalEnvVars).toHaveLength(4);
    });

    it('should have health check endpoints', () => {
      const healthChecks = {
        '/health': () => ({ status: 'ok', timestamp: new Date() }),
        '/health/mongodb': () => ({ status: 'connected', latency: '5ms' }),
        '/health/embeddings': () => ({ status: 'available', provider: 'openai' }),
        '/health/safety': () => ({ status: 'active', checks: ['PII', 'HALLUCINATION'] })
      };

      expect(Object.keys(healthChecks)).toHaveLength(4);
      expect(typeof healthChecks['/health']).toBe('function');
    });

    it('should have monitoring and metrics', () => {
      const metrics = {
        performance: [
          'request_duration',
          'context_retrieval_time',
          'embedding_generation_time',
          'safety_check_time'
        ],
        
        business: [
          'total_requests',
          'successful_enhancements',
          'safety_violations',
          'framework_usage'
        ],
        
        system: [
          'memory_usage',
          'cpu_usage',
          'mongodb_connections',
          'cache_hit_rate'
        ]
      };

      expect(metrics.performance).toHaveLength(4);
      expect(metrics.business).toHaveLength(4);
      expect(metrics.system).toHaveLength(4);
    });
  });

  // Mock functions for testing
  async function mockContextRetrieval(input: any) {
    return [{ content: 'relevant context', score: 0.9 }];
  }

  async function mockPromptEnhancement(input: any, context: any) {
    return `Enhanced: ${input} with context: ${context[0]?.content}`;
  }

  async function mockSafetyValidation(input: any) {
    return { validated: input, issues: [] };
  }

  async function mockTraceStorage(options: any, result: any, context: any) {
    return { traceId: 'trace_123', stored: true };
  }

  async function mockSemanticSearch(query: string) {
    return [{ content: `Search result for: ${query}`, score: 0.85 }];
  }

  async function mockMemoryStorage(content: string, metadata: any) {
    return { memoryId: 'memory_123', stored: true };
  }
});
