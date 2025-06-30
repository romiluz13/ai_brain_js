/**
 * @file Collections Index - Export all MongoDB collection classes
 * 
 * This file exports all collection classes for the Universal AI Brain,
 * providing a centralized access point for MongoDB operations.
 */

// Base collection class
export { BaseCollection } from './BaseCollection';

// Core collection classes
export { AgentCollection } from './AgentCollection';
export { MemoryCollection } from './MemoryCollection';
export { ContextCollection } from './ContextCollection';
export { WorkflowCollection } from './WorkflowCollection';
export { ToolCollection } from './ToolCollection';
export { MetricsCollection } from './MetricsCollection';
export { TracingCollection } from './TracingCollection';

// Cognitive collection classes
export { EmotionalStateCollection } from './EmotionalStateCollection';
export { GoalHierarchyCollection } from './GoalHierarchyCollection';
export { ConfidenceTrackingCollection } from './ConfidenceTrackingCollection';
export { AttentionStateCollection } from './AttentionStateCollection';
export { CulturalKnowledgeCollection } from './CulturalKnowledgeCollection';
export { SkillCapabilityCollection } from './SkillCapabilityCollection';
export { CommunicationProtocolCollection } from './CommunicationProtocolCollection';
export { TemporalPlanCollection } from './TemporalPlanCollection';

// Phase 2 Integration: Advanced Cognitive Collections
export { AnalogicalMappingCollection } from './AnalogicalMappingCollection';
export { CausalRelationshipCollection } from './CausalRelationshipCollection';
export { SocialIntelligenceCollection } from './SocialIntelligenceCollection';
export { EpisodicMemoryCollection } from './EpisodicMemoryCollection';

// Collection filter and update types
export type {
  AgentFilter,
  AgentUpdateData
} from './AgentCollection';

export type {
  MemoryFilter,
  MemoryUpdateData,
  MemorySearchOptions
} from './MemoryCollection';

export type {
  ContextItem,
  ContextFilter,
  ContextUpdateData,
  ContextSearchOptions
} from './ContextCollection';

export type {
  WorkflowFilter,
  WorkflowUpdateData,
  WorkflowExecutionOptions
} from './WorkflowCollection';

export type {
  ToolFilter,
  ToolUpdateData,
  ToolExecutionFilter
} from './ToolCollection';

export type {
  MetricsFilter,
  MetricsAggregationOptions,
  TimeSeriesPoint
} from './MetricsCollection';

export type {
  AgentTrace,
  AgentStep,
  AgentError,
  PerformanceMetrics,
  // ContextItem, // Removed duplicate - already exported from ContextCollection
  TokenUsage,
  CostBreakdown,
  FrameworkMetadata
} from './TracingCollection';

export type {
  EmotionalState,
  EmotionalStateFilter,
  EmotionalStateUpdateData,
  EmotionalAnalyticsOptions
} from './EmotionalStateCollection';

export type {
  Goal,
  GoalFilter,
  GoalUpdateData,
  GoalAnalyticsOptions
} from './GoalHierarchyCollection';

export type {
  ConfidenceRecord,
  ConfidenceFilter,
  ConfidenceAnalyticsOptions
} from './ConfidenceTrackingCollection';

export type {
  AttentionState,
  AttentionFilter,
  AttentionAnalyticsOptions
} from './AttentionStateCollection';

export type {
  CulturalKnowledge,
  CulturalFilter,
  CulturalAnalyticsOptions
} from './CulturalKnowledgeCollection';

// Base collection types
export type {
  BaseDocument,
  PaginationOptions,
  PaginatedResult
} from './BaseCollection';

/**
 * Collection Manager - Centralized management of all collections
 */
import { Db } from 'mongodb';
import { AgentCollection } from './AgentCollection';
import { MemoryCollection } from './MemoryCollection';
import { ContextCollection } from './ContextCollection';
import { WorkflowCollection } from './WorkflowCollection';
import { ToolCollection } from './ToolCollection';
import { MetricsCollection } from './MetricsCollection';
import { TracingCollection } from './TracingCollection';
import { EmotionalStateCollection } from './EmotionalStateCollection';
import { GoalHierarchyCollection } from './GoalHierarchyCollection';
import { ConfidenceTrackingCollection } from './ConfidenceTrackingCollection';
import { AttentionStateCollection } from './AttentionStateCollection';
import { CulturalKnowledgeCollection } from './CulturalKnowledgeCollection';
import { AnalogicalMappingCollection } from './AnalogicalMappingCollection';
import { CausalRelationshipCollection } from './CausalRelationshipCollection';
import { SocialIntelligenceCollection } from './SocialIntelligenceCollection';
import { EpisodicMemoryCollection } from './EpisodicMemoryCollection';

export class CollectionManager {
  private db: Db;
  
  // Collection instances
  public agents: AgentCollection;
  public memory: MemoryCollection;
  public context: ContextCollection;
  public workflows: WorkflowCollection;
  public tools: ToolCollection;
  public metrics: MetricsCollection;
  public tracing: TracingCollection;

  // Cognitive collection instances
  public emotionalStates: EmotionalStateCollection;
  public goalHierarchies: GoalHierarchyCollection;
  public confidenceTracking: ConfidenceTrackingCollection;
  public attentionStates: AttentionStateCollection;
  public culturalKnowledge: CulturalKnowledgeCollection;

  // Phase 2 Integration: Advanced cognitive collection instances
  public analogicalMappings: AnalogicalMappingCollection;
  public causalRelationships: CausalRelationshipCollection;
  public socialIntelligence: SocialIntelligenceCollection;
  public episodicMemories: EpisodicMemoryCollection;

  constructor(db: Db) {
    this.db = db;
    
    // Initialize all collections
    this.agents = new AgentCollection(db);
    this.memory = new MemoryCollection(db);
    this.context = new ContextCollection(db);
    this.workflows = new WorkflowCollection(db);
    this.tools = new ToolCollection(db);
    this.metrics = new MetricsCollection(db);
    this.tracing = new TracingCollection(db);

    // Initialize cognitive collections
    this.emotionalStates = new EmotionalStateCollection(db);
    this.goalHierarchies = new GoalHierarchyCollection(db);
    this.confidenceTracking = new ConfidenceTrackingCollection(db);
    this.attentionStates = new AttentionStateCollection(db);
    this.culturalKnowledge = new CulturalKnowledgeCollection(db);

    // Initialize Phase 2 advanced cognitive collections
    this.analogicalMappings = new AnalogicalMappingCollection(db);
    this.causalRelationships = new CausalRelationshipCollection(db);
    this.socialIntelligence = new SocialIntelligenceCollection(db);
    this.episodicMemories = new EpisodicMemoryCollection(db);
  }

  /**
   * Initialize all collections and create indexes
   */
  async initialize(): Promise<void> {
    console.log('🔧 Initializing MongoDB collections...');
    
    try {
      // Create indexes for all collections in parallel
      await Promise.all([
        this.agents.createIndexes(),
        this.memory.createIndexes(),
        this.context.createIndexes(),
        this.workflows.createIndexes(),
        this.tools.createIndexes(),
        this.metrics.createIndexes(),
        this.tracing.createIndexes(),
        this.emotionalStates.createIndexes(),
        this.goalHierarchies.createIndexes(),
        this.confidenceTracking.createIndexes(),
        this.attentionStates.createIndexes(),
        this.culturalKnowledge.createIndexes(),
        // Phase 2 Integration: Advanced cognitive collections
        this.analogicalMappings.createIndexes(),
        this.causalRelationships.createIndexes(),
        this.socialIntelligence.createIndexes(),
        this.episodicMemories.createIndexes()
      ]);

      console.log('✅ All collection indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating collection indexes:', error);
      throw error;
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(): Promise<{
    agents: any;
    memory: any;
    context: any;
    workflows: any;
    tools: any;
    metrics: any;
    tracing: any;
  }> {
    const [agentStats, memoryStats, contextStats, workflowStats, toolStats, metricsStats, tracingStats] = await Promise.all([
      this.agents.getStats(),
      this.memory.getStats(),
      this.context.getContextStats(),
      this.workflows.getStats(),
      this.tools.getStats(),
      this.metrics.getStats(),
      this.tracing.getStats()
    ]);

    return {
      agents: agentStats,
      memory: memoryStats,
      context: contextStats,
      workflows: workflowStats,
      tools: toolStats,
      metrics: metricsStats,
      tracing: tracingStats
    };
  }

  /**
   * Cleanup old data from all collections
   */
  async cleanupOldData(options: {
    agentInactiveDays?: number;
    memoryExpirationDays?: number;
    workflowCompletedDays?: number;
    toolExecutionDays?: number;
    metricsRetentionDays?: number;
    tracingRetentionDays?: number;
  } = {}): Promise<{
    agentsDeleted: number;
    memoriesDeleted: number;
    workflowsDeleted: number;
    toolExecutionsDeleted: number;
    metricsDeleted: number;
    tracesDeleted: number;
  }> {
    const {
      agentInactiveDays = 30,
      memoryExpirationDays = 0, // Only expired memories
      workflowCompletedDays = 30,
      toolExecutionDays = 30,
      metricsRetentionDays = 90,
      tracingRetentionDays = 30
    } = options;

    console.log('🧹 Starting cleanup of old data...');

    const [
      agentsDeleted,
      memoriesDeleted,
      workflowsDeleted,
      toolExecutionsDeleted,
      metricsDeleted,
      tracesDeleted
    ] = await Promise.all([
      this.agents.cleanupInactiveAgents(agentInactiveDays),
      memoryExpirationDays > 0
        ? this.memory.cleanupExpiredMemories()
        : this.memory.cleanupExpiredMemories(), // Only cleanup expired
      this.workflows.cleanupOldWorkflows(workflowCompletedDays),
      this.tools.cleanupOldExecutions(toolExecutionDays),
      this.metrics.cleanupOldMetrics(metricsRetentionDays),
      this.tracing.cleanupOldTraces(tracingRetentionDays)
    ]);

    const result = {
      agentsDeleted,
      memoriesDeleted,
      workflowsDeleted,
      toolExecutionsDeleted,
      metricsDeleted,
      tracesDeleted
    };

    console.log('✅ Cleanup completed:', result);
    return result;
  }

  /**
   * Health check for all collections
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    collections: Record<string, { accessible: boolean; documentCount: number; error?: string }>;
  }> {
    const collections = ['agents', 'memory', 'context', 'workflows', 'tools', 'metrics', 'tracing'];
    const results: Record<string, { accessible: boolean; documentCount: number; error?: string }> = {};
    let allHealthy = true;

    for (const collectionName of collections) {
      try {
        const collection = this[collectionName as keyof this] as any;
        const count = await collection.count();
        results[collectionName] = {
          accessible: true,
          documentCount: count
        };
      } catch (error) {
        results[collectionName] = {
          accessible: false,
          documentCount: 0,
          error: error.message
        };
        allHealthy = false;
      }
    }

    return {
      healthy: allHealthy,
      collections: results
    };
  }

  /**
   * Drop all collections (use with caution!)
   */
  async dropAllCollections(): Promise<void> {
    console.warn('⚠️ Dropping all collections...');
    
    await Promise.all([
      this.agents.drop().catch(() => {}), // Ignore errors if collection doesn't exist
      this.memory.drop().catch(() => {}),
      this.context.drop().catch(() => {}),
      this.workflows.drop().catch(() => {}),
      this.tools.drop().catch(() => {}),
      this.metrics.drop().catch(() => {}),
      this.tracing.drop().catch(() => {})
    ]);

    console.log('✅ All collections dropped');
  }

  /**
   * Get database instance
   */
  getDatabase(): Db {
    return this.db;
  }

  /**
   * Get collection by name
   */
  getCollection(name: string): any {
    switch (name) {
      case 'agents':
        return this.agents;
      case 'memory':
        return this.memory;
      case 'context':
        return this.context;
      case 'workflows':
        return this.workflows;
      case 'tools':
        return this.tools;
      case 'metrics':
        return this.metrics;
      case 'tracing':
        return this.tracing;
      default:
        throw new Error(`Unknown collection: ${name}`);
    }
  }
}
