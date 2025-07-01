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
export { WorkingMemoryManager } from './WorkingMemoryManager';
export { EpisodicMemoryEngine } from './EpisodicMemoryEngine';
export { MemoryDecayEngine } from './MemoryDecayEngine';

// Cognitive Intelligence Engines
export { EmotionalIntelligenceEngine } from './EmotionalIntelligenceEngine';
export { GoalHierarchyManager } from './GoalHierarchyManager';
export { ConfidenceTrackingEngine } from './ConfidenceTrackingEngine';
export { AttentionManagementSystem } from './AttentionManagementSystem';
export { CulturalKnowledgeEngine } from './CulturalKnowledgeEngine';
export { SkillCapabilityManager } from './SkillCapabilityManager';
export { CommunicationProtocolManager } from './CommunicationProtocolManager';
export { TemporalPlanningEngine } from './TemporalPlanningEngine';
export { SelfImprovementEngine } from './SelfImprovementEngine';
export { SocialIntelligenceEngine } from './SocialIntelligenceEngine';

// Advanced Intelligence Engines
export { AdvancedToolInterface } from './AdvancedToolInterface';
export { AnalogicalMappingSystem } from './AnalogicalMappingSystem';
export { CausalReasoningEngine } from './CausalReasoningEngine';
export { ChangeStreamManager } from './ChangeStreamManager';
export { HumanFeedbackIntegrationEngine } from './HumanFeedbackIntegrationEngine';
export { MultiModalProcessingEngine } from './MultiModalProcessingEngine';
export { NotificationManager } from './NotificationManager';
export { WorkflowOrchestrationEngine } from './WorkflowOrchestrationEngine';

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
