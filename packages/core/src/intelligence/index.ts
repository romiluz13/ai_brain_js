/**
 * @file Intelligence Layer - Core intelligence components for Universal AI Brain
 * 
 * This module exports the core intelligence components that provide semantic memory,
 * context injection, and vector search capabilities for the Universal AI Brain.
 * These components work together to provide intelligent context-aware AI interactions.
 */

// Core Intelligence Engines
export { SemanticMemoryEngine } from './SemanticMemoryEngine';
export { ContextInjectionEngine } from './ContextInjectionEngine';
export { VectorSearchEngine } from './VectorSearchEngine';

// Cognitive Intelligence Engines
export { EmotionalIntelligenceEngine } from './EmotionalIntelligenceEngine';
export { GoalHierarchyManager } from './GoalHierarchyManager';
export { ConfidenceTrackingEngine } from './ConfidenceTrackingEngine';
export { AttentionManagementSystem } from './AttentionManagementSystem';
export { CulturalKnowledgeEngine } from './CulturalKnowledgeEngine';
export { SkillCapabilityManager } from './SkillCapabilityManager';
export { CommunicationProtocolManager } from './CommunicationProtocolManager';
export { TemporalPlanningEngine } from './TemporalPlanningEngine';

// Types and Interfaces
export type {
  Memory,
  MemorySearchOptions,
  MemoryAnalytics
} from './SemanticMemoryEngine';

export type {
  ContextItem,
  EnhancedPrompt,
  ContextOptions,
  ContextAnalytics
} from './ContextInjectionEngine';

export type {
  SearchResult,
  SearchOptions,
  HybridSearchOptions,
  SearchAnalytics
} from './VectorSearchEngine';
