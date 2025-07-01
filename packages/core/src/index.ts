// ============================================================================
// UNIVERSAL AI BRAIN - CORE EXPORTS
// ============================================================================

// Core Universal AI Brain - The heart of your vision! 🧠⚡
export { UniversalAIBrain } from './UniversalAIBrain';
export { UniversalAIBrain as UniversalAIBrainV2 } from './UniversalAIBrain';
export type { UniversalAIBrainConfig, AIBrainResponse } from './UniversalAIBrain';

// Framework adapters - The magic that connects ANY framework to MongoDB! 🔌
export { BaseFrameworkAdapter } from './adapters/BaseFrameworkAdapter';
export { MastraAdapter } from './adapters/MastraAdapter';
export { VercelAIAdapter } from './adapters/VercelAIAdapter';
export { LangChainJSAdapter } from './adapters/LangChainJSAdapter';
export { OpenAIAdapter } from './adapters/OpenAIAdapter';
export { OpenAIAgentsAdapter } from './adapters/OpenAIAgentsAdapter';

// Vector Search and Embeddings
export { MongoVectorStore } from './vector/MongoVectorStore';
export { OpenAIEmbeddingProvider } from './embeddings/OpenAIEmbeddingProvider';
export { VoyageAIEmbeddingProvider } from './embeddings/VoyageAIEmbeddingProvider';

// Core types and interfaces (excluding conflicting names)
export * from './types';

// MongoDB persistence layer (enhanced with Vector Search)
export * from './persistance';

// MongoDB collections - The data layer that powers everything! 💾
export {
  BaseCollection,
  AgentCollection,
  MemoryCollection,
  ContextCollection,
  WorkflowCollection,
  ToolCollection,
  MetricsCollection,
  TracingCollection,
  CollectionManager
} from './collections/index';

// Export all collection types including tracing types
export type {
  AgentTrace,
  AgentStep,
  AgentError,
  PerformanceMetrics,
  TokenUsage,
  CostBreakdown,
  FrameworkMetadata
} from './collections/TracingCollection';

// MongoDB schemas
export * from './schemas';

// Enterprise tracing and observability - Production-grade monitoring! 🔍
export * from './tracing';

// NEW: Universal AI Brain V2 Components - Production-Ready Intelligence Layer! 🚀

// Intelligence Layer
export { SemanticMemoryEngine } from './intelligence/SemanticMemoryEngine';
export { ContextInjectionEngine } from './intelligence/ContextInjectionEngine';
export { VectorSearchEngine } from './intelligence/VectorSearchEngine';

// Safety & Guardrails
export { SafetyGuardrailsEngine } from './safety/SafetyGuardrailsEngine';
export { SafetyGuardrailsEngine as SafetyEngine } from './safety/SafetyGuardrailsEngine'; // Alias for backward compatibility
export { HallucinationDetector } from './safety/HallucinationDetector';
export { PIIDetector } from './safety/PIIDetector';
export { ComplianceAuditLogger } from './safety/ComplianceAuditLogger';
export { FrameworkSafetyIntegration } from './safety/FrameworkSafetyIntegration';

// Self-Improvement Engines
export { FailureAnalysisEngine } from './self-improvement/FailureAnalysisEngine';
export { ContextLearningEngine } from './self-improvement/ContextLearningEngine';
export { FrameworkOptimizationEngine } from './self-improvement/FrameworkOptimizationEngine';
export { SelfImprovementMetrics } from './self-improvement/SelfImprovementMetrics';
export { SelfImprovementEngine } from './intelligence/SelfImprovementEngine';

// Real-Time Monitoring & Performance
export { PerformanceAnalyticsEngine } from './monitoring/PerformanceAnalyticsEngine';
export { RealTimeMonitoringDashboard } from './monitoring/RealTimeMonitoringDashboard';

// Real-Time & Change Streams
export { WorkflowChangeStream } from './real-time/WorkflowChangeStream';

// Schema Validation
export { SchemaValidator } from './schemas/validator';

// Export aliases for backward compatibility and test expectations
export { PerformanceAnalyticsEngine as MonitoringEngine } from './monitoring/PerformanceAnalyticsEngine';
export { PerformanceAnalyticsEngine as PerformanceAnalyzer } from './monitoring/PerformanceAnalyticsEngine';
export { ContextLearningEngine as LearningEngine } from './self-improvement/ContextLearningEngine';
export { FrameworkOptimizationEngine as AdaptationEngine } from './self-improvement/FrameworkOptimizationEngine';

// Legacy exports (keeping for backward compatibility)
export * from './agent';
export * from './features';
// Note: real-time exports removed to avoid conflicts with tracing module