import agentSchema from './agent.schema.json';
import agentConfigurationsSchema from './agent_configurations.schema.json';
import agentMemorySchema from './agent_memory.schema.json';
import agentWorkingMemorySchema from './agent_working_memory.schema.json';
import agentToolsSchema from './agent_tools.schema.json';
import agentPerformanceMetricsSchema from './agent_performance_metrics.schema.json';
import agentWorkflowsSchema from './agent_workflows.schema.json';
import vectorEmbeddingsSchema from './vector_embeddings.schema.json';
import toolExecutionsSchema from './tool_executions.schema.json';
import tracesSchema from './traces.schema.json';
import dynamicPlansSchema from './dynamic_plans.schema.json';
import agentEmotionalStatesSchema from './agent_emotional_states.schema.json';
import agentGoalHierarchiesSchema from './agent_goal_hierarchies.schema.json';
import agentConfidenceTrackingSchema from './agent_confidence_tracking.schema.json';
import agentAttentionStatesSchema from './agent_attention_states.schema.json';
import agentCulturalKnowledgeSchema from './agent_cultural_knowledge.schema.json';
import evaluationsSchema from './evaluations.schema.json';
import humanFeedbackSchema from './human_feedback.schema.json';
import agentPermissionsSchema from './agent_permissions.schema.json';
import resourceRegistrySchema from './resource_registry.schema.json';
import secureCredentialsSchema from './secure_credentials.schema.json';
import ingestionPipelinesSchema from './ingestion_pipelines.schema.json';
import agentEventsSchema from './agent_events.schema.json';

export const schemas = {
  agent: agentSchema,
  agentConfigurations: agentConfigurationsSchema,
  agentMemory: agentMemorySchema,
  agentWorkingMemory: agentWorkingMemorySchema,
  agentTools: agentToolsSchema,
  agentPerformanceMetrics: agentPerformanceMetricsSchema,
  agentWorkflows: agentWorkflowsSchema,
  vectorEmbeddings: vectorEmbeddingsSchema,
  toolExecutions: toolExecutionsSchema,
  traces: tracesSchema,
  dynamicPlans: dynamicPlansSchema,
  evaluations: evaluationsSchema,
  humanFeedback: humanFeedbackSchema,
  agentPermissions: agentPermissionsSchema,
  resourceRegistry: resourceRegistrySchema,
  secureCredentials: secureCredentialsSchema,
  ingestionPipelines: ingestionPipelinesSchema,
  agentEvents: agentEventsSchema,
  agentEmotionalStates: agentEmotionalStatesSchema,
  agentGoalHierarchies: agentGoalHierarchiesSchema,
  agentConfidenceTracking: agentConfidenceTrackingSchema,
  agentAttentionStates: agentAttentionStatesSchema,
  agentCulturalKnowledge: agentCulturalKnowledgeSchema,
};