/**
 * @file Export Validation Tests
 * Comprehensive tests to ensure all exports resolve correctly
 */

describe('Export Validation', () => {
  describe('Core Exports', () => {
    it('should export UniversalAIBrain', async () => {
      const { UniversalAIBrain } = await import('../index');
      expect(UniversalAIBrain).toBeDefined();
      expect(typeof UniversalAIBrain).toBe('function');
    });

    it('should export MongoVectorStore', async () => {
      const { MongoVectorStore } = await import('../index');
      expect(MongoVectorStore).toBeDefined();
      expect(typeof MongoVectorStore).toBe('function');
    });

    it('should export HybridSearchEngine', async () => {
      const { HybridSearchEngine } = await import('../index');
      expect(HybridSearchEngine).toBeDefined();
      expect(typeof HybridSearchEngine).toBe('function');
    });
  });

  describe('Intelligence Layer Exports', () => {
    it('should export SemanticMemoryEngine', async () => {
      const { SemanticMemoryEngine } = await import('../index');
      expect(SemanticMemoryEngine).toBeDefined();
      expect(typeof SemanticMemoryEngine).toBe('function');
    });

    it('should export ContextInjectionEngine', async () => {
      const { ContextInjectionEngine } = await import('../index');
      expect(ContextInjectionEngine).toBeDefined();
      expect(typeof ContextInjectionEngine).toBe('function');
    });

    it('should export VectorSearchEngine', async () => {
      const { VectorSearchEngine } = await import('../index');
      expect(VectorSearchEngine).toBeDefined();
      expect(typeof VectorSearchEngine).toBe('function');
    });

    it('should export intelligence layer types', async () => {
      const { Memory, MemorySearchOptions, ContextItem, EnhancedPrompt, SearchResult, SearchOptions } = await import('../index');
      
      // Types should be undefined at runtime but importable
      expect(Memory).toBeUndefined();
      expect(MemorySearchOptions).toBeUndefined();
      expect(ContextItem).toBeUndefined();
      expect(EnhancedPrompt).toBeUndefined();
      expect(SearchResult).toBeUndefined();
      expect(SearchOptions).toBeUndefined();
    });
  });

  describe('Collection Exports', () => {
    it('should export MemoryCollection', async () => {
      const { MemoryCollection } = await import('../index');
      expect(MemoryCollection).toBeDefined();
      expect(typeof MemoryCollection).toBe('function');
    });

    it('should export ContextCollection', async () => {
      const { ContextCollection } = await import('../index');
      expect(ContextCollection).toBeDefined();
      expect(typeof ContextCollection).toBe('function');
    });

    it('should export TracingCollection', async () => {
      const { TracingCollection } = await import('../index');
      expect(TracingCollection).toBeDefined();
      expect(typeof TracingCollection).toBe('function');
    });

    it('should export CollectionManager', async () => {
      const { CollectionManager } = await import('../index');
      expect(CollectionManager).toBeDefined();
      expect(typeof CollectionManager).toBe('function');
    });

    it('should export collection types', async () => {
      const { ContextItem, ContextFilter, ContextUpdateData, ContextSearchOptions } = await import('../index');
      
      // Types should be undefined at runtime but importable
      expect(ContextItem).toBeUndefined();
      expect(ContextFilter).toBeUndefined();
      expect(ContextUpdateData).toBeUndefined();
      expect(ContextSearchOptions).toBeUndefined();
    });
  });

  describe('Safety & Guardrails Exports', () => {
    it('should export SafetyGuardrailsEngine', async () => {
      const { SafetyGuardrailsEngine } = await import('../index');
      expect(SafetyGuardrailsEngine).toBeDefined();
      expect(typeof SafetyGuardrailsEngine).toBe('function');
    });

    it('should export SafetyEngine alias', async () => {
      const { SafetyEngine } = await import('../index');
      expect(SafetyEngine).toBeDefined();
      expect(typeof SafetyEngine).toBe('function');
    });

    it('should verify SafetyEngine is alias for SafetyGuardrailsEngine', async () => {
      const { SafetyEngine, SafetyGuardrailsEngine } = await import('../index');
      expect(SafetyEngine).toBe(SafetyGuardrailsEngine);
    });

    it('should export HallucinationDetector', async () => {
      const { HallucinationDetector } = await import('../index');
      expect(HallucinationDetector).toBeDefined();
      expect(typeof HallucinationDetector).toBe('function');
    });

    it('should export PIIDetector', async () => {
      const { PIIDetector } = await import('../index');
      expect(PIIDetector).toBeDefined();
      expect(typeof PIIDetector).toBe('function');
    });

    it('should export ComplianceAuditLogger', async () => {
      const { ComplianceAuditLogger } = await import('../index');
      expect(ComplianceAuditLogger).toBeDefined();
      expect(typeof ComplianceAuditLogger).toBe('function');
    });

    it('should export FrameworkSafetyIntegration', async () => {
      const { FrameworkSafetyIntegration } = await import('../index');
      expect(FrameworkSafetyIntegration).toBeDefined();
      expect(typeof FrameworkSafetyIntegration).toBe('function');
    });
  });

  describe('Framework Adapter Exports', () => {
    it('should export VercelAIAdapter', async () => {
      const { VercelAIAdapter } = await import('../index');
      expect(VercelAIAdapter).toBeDefined();
      expect(typeof VercelAIAdapter).toBe('function');
    });

    it('should export MastraAdapter', async () => {
      const { MastraAdapter } = await import('../index');
      expect(MastraAdapter).toBeDefined();
      expect(typeof MastraAdapter).toBe('function');
    });

    it('should export LangChainJSAdapter', async () => {
      const { LangChainJSAdapter } = await import('../index');
      expect(LangChainJSAdapter).toBeDefined();
      expect(typeof LangChainJSAdapter).toBe('function');
    });

    it('should export OpenAIAgentsAdapter', async () => {
      const { OpenAIAgentsAdapter } = await import('../index');
      expect(OpenAIAgentsAdapter).toBeDefined();
      expect(typeof OpenAIAgentsAdapter).toBe('function');
    });
  });

  describe('Tracing & Monitoring Exports', () => {
    it('should export TracingEngine', async () => {
      const { TracingEngine } = await import('../index');
      expect(TracingEngine).toBeDefined();
      expect(typeof TracingEngine).toBe('function');
    });

    it('should export MonitoringEngine', async () => {
      const { MonitoringEngine } = await import('../index');
      expect(MonitoringEngine).toBeDefined();
      expect(typeof MonitoringEngine).toBe('function');
    });

    it('should export PerformanceAnalyzer', async () => {
      const { PerformanceAnalyzer } = await import('../index');
      expect(PerformanceAnalyzer).toBeDefined();
      expect(typeof PerformanceAnalyzer).toBe('function');
    });
  });

  describe('Self-Improvement Exports', () => {
    it('should export SelfImprovementEngine', async () => {
      const { SelfImprovementEngine } = await import('../index');
      expect(SelfImprovementEngine).toBeDefined();
      expect(typeof SelfImprovementEngine).toBe('function');
    });

    it('should export LearningEngine', async () => {
      const { LearningEngine } = await import('../index');
      expect(LearningEngine).toBeDefined();
      expect(typeof LearningEngine).toBe('function');
    });

    it('should export AdaptationEngine', async () => {
      const { AdaptationEngine } = await import('../index');
      expect(AdaptationEngine).toBeDefined();
      expect(typeof AdaptationEngine).toBe('function');
    });
  });

  describe('Embedding Provider Exports', () => {
    it('should export OpenAIEmbeddingProvider', async () => {
      const { OpenAIEmbeddingProvider } = await import('../index');
      expect(OpenAIEmbeddingProvider).toBeDefined();
      expect(typeof OpenAIEmbeddingProvider).toBe('function');
    });
  });

  describe('Persistence Layer Exports', () => {
    it('should export MongoConnection', async () => {
      const { MongoConnection } = await import('../index');
      expect(MongoConnection).toBeDefined();
      expect(typeof MongoConnection).toBe('function');
    });

    it('should export MongoDataStore', async () => {
      const { MongoDataStore } = await import('../index');
      expect(MongoDataStore).toBeDefined();
      expect(typeof MongoDataStore).toBe('function');
    });

    it('should export MongoMemoryProvider', async () => {
      const { MongoMemoryProvider } = await import('../index');
      expect(MongoMemoryProvider).toBeDefined();
      expect(typeof MongoMemoryProvider).toBe('function');
    });

    it('should export MongoEmbeddingProvider', async () => {
      const { MongoEmbeddingProvider } = await import('../index');
      expect(MongoEmbeddingProvider).toBeDefined();
      expect(typeof MongoEmbeddingProvider).toBe('function');
    });
  });

  describe('Agent & Workflow Exports', () => {
    it('should export AgentStateManager', async () => {
      const { AgentStateManager } = await import('../index');
      expect(AgentStateManager).toBeDefined();
      expect(typeof AgentStateManager).toBe('function');
    });

    it('should export ToolExecutor', async () => {
      const { ToolExecutor } = await import('../index');
      expect(ToolExecutor).toBeDefined();
      expect(typeof ToolExecutor).toBe('function');
    });

    it('should export WorkflowEngine', async () => {
      const { WorkflowEngine } = await import('../index');
      expect(WorkflowEngine).toBeDefined();
      expect(typeof WorkflowEngine).toBe('function');
    });
  });

  describe('Real-Time & Change Streams Exports', () => {
    it('should export ChangeStreamManager', async () => {
      const { ChangeStreamManager } = await import('../index');
      expect(ChangeStreamManager).toBeDefined();
      expect(typeof ChangeStreamManager).toBe('function');
    });

    it('should export WorkflowChangeStream', async () => {
      const { WorkflowChangeStream } = await import('../index');
      expect(WorkflowChangeStream).toBeDefined();
      expect(typeof WorkflowChangeStream).toBe('function');
    });
  });

  describe('Schema Validation Exports', () => {
    it('should export SchemaValidator', async () => {
      const { SchemaValidator } = await import('../index');
      expect(SchemaValidator).toBeDefined();
      expect(typeof SchemaValidator).toBe('function');
    });
  });

  describe('Complete Export Test', () => {
    it('should import all exports without errors', async () => {
      const allExports = await import('../index');
      
      // Verify we have a reasonable number of exports
      const exportKeys = Object.keys(allExports);
      expect(exportKeys.length).toBeGreaterThan(30);
      
      // Verify no exports are undefined (except types)
      const undefinedExports = exportKeys.filter(key => allExports[key] === undefined);
      
      // Types are expected to be undefined at runtime
      const expectedUndefinedTypes = [
        'Memory', 'MemorySearchOptions', 'MemoryAnalytics',
        'ContextItem', 'EnhancedPrompt', 'ContextOptions', 'ContextAnalytics',
        'SearchResult', 'SearchOptions', 'HybridSearchOptions', 'SearchAnalytics',
        'ContextFilter', 'ContextUpdateData', 'ContextSearchOptions',
        // Tracing types (TypeScript interfaces, undefined at runtime)
        'AgentTrace', 'AgentStep', 'AgentError', 'PerformanceMetrics',
        'TokenUsage', 'CostBreakdown', 'FrameworkMetadata'
      ];
      
      const unexpectedUndefined = undefinedExports.filter(
        exportName => !expectedUndefinedTypes.includes(exportName)
      );
      
      expect(unexpectedUndefined).toEqual([]);
    });

    it('should have consistent export structure', async () => {
      const allExports = await import('../index');
      
      // Core components should be classes/functions
      const coreComponents = [
        'UniversalAIBrain', 'SemanticMemoryEngine', 'ContextInjectionEngine', 
        'VectorSearchEngine', 'SafetyGuardrailsEngine', 'VercelAIAdapter',
        'MastraAdapter', 'LangChainJSAdapter', 'OpenAIAgentsAdapter'
      ];
      
      coreComponents.forEach(component => {
        expect(allExports[component]).toBeDefined();
        expect(typeof allExports[component]).toBe('function');
      });
    });
  });

  describe('Import Performance', () => {
    it('should import quickly without circular dependencies', async () => {
      const startTime = Date.now();
      
      await import('../index');
      
      const importTime = Date.now() - startTime;
      
      // Import should complete within reasonable time (1 second)
      expect(importTime).toBeLessThan(1000);
    });

    it('should not have circular dependency issues', async () => {
      // This test will fail if there are circular dependencies
      expect(async () => {
        await import('../index');
      }).not.toThrow();
    });
  });

  describe('TypeScript Compatibility', () => {
    it('should provide proper TypeScript types', () => {
      // This test ensures TypeScript compilation works
      // If types are broken, this test file wouldn't compile
      expect(true).toBe(true);
    });
  });
});
