/**
 * @file Core Types and Interfaces for Universal AI Brain
 * 
 * This file defines all the core TypeScript interfaces and types used throughout
 * the Universal AI Brain system. These types ensure type safety and provide
 * clear contracts for framework integrations.
 */

import { ObjectId } from 'mongodb';

// ============================================================================
// CORE BRAIN TYPES
// ============================================================================

export interface BrainConfig {
  mongoConfig: {
    uri: string;
    dbName: string;
  };
  embeddingConfig: {
    provider: 'openai' | 'cohere' | 'huggingface' | 'azure-openai';
    model: string;
    apiKey: string;
    dimensions: number;
    baseUrl?: string; // For custom endpoints
  };
  vectorSearchConfig: {
    indexName: string;
    collectionName: string;
    minScore: number;
    maxResults: number;
  };
  features?: {
    enableHybridSearch?: boolean;
    enableConversationMemory?: boolean;
    enableKnowledgeGraph?: boolean;
    enableRealTimeUpdates?: boolean;
  };
}

export interface Context {
  id: string;
  content: string;
  metadata: Record<string, any>;
  relevanceScore: number;
  source: string;
  timestamp: Date;
  type?: 'semantic' | 'conversational' | 'knowledge_graph' | 'real_time';
}

export interface EnhancedPrompt {
  originalPrompt: string;
  enhancedPrompt: string;
  injectedContext: Context[];
  metadata: {
    frameworkType: string;
    enhancementStrategy: string;
    contextSources: string[];
    processingTime: number;
    tokenCount?: number;
  };
}

export interface Interaction {
  id: string;
  conversationId: string;
  userMessage: string;
  assistantResponse: string;
  context: Context[];
  metadata: Record<string, any>;
  timestamp: Date;
  framework: string;
  performance?: {
    responseTime: number;
    contextRetrievalTime: number;
    embeddingTime: number;
  };
}

export interface Conversation {
  id: string;
  framework: string;
  title?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  interactionCount: number;
  tags?: string[];
}

// ============================================================================
// FRAMEWORK ADAPTER TYPES
// ============================================================================

export interface FrameworkAdapter<T> {
  frameworkName: string;
  version: string;
  integrate(brain: UniversalAIBrain): T;
  enhanceWithBrain(originalFunction: any, brain: UniversalAIBrain): any;
  validateCompatibility(): boolean;
  getCapabilities(): FrameworkCapabilities;
}

export interface FrameworkCapabilities {
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsMultiModal: boolean;
  supportsMemory: boolean;
  supportedModels: string[];
  maxContextLength: number;
}

export interface AdapterConfig {
  enableMemoryInjection: boolean;
  enableContextEnhancement: boolean;
  enableToolIntegration: boolean;
  maxContextItems: number;
  enhancementStrategy: 'semantic' | 'hybrid' | 'conversational';
}

// ============================================================================
// MEMORY AND SEARCH TYPES
// ============================================================================

export interface MemorySearchOptions {
  limit?: number;
  timeRange?: {
    start: Date;
    end: Date;
  };
  conversationId?: string;
  framework?: string;
  minRelevanceScore?: number;
  searchType?: 'semantic' | 'hybrid' | 'text';
  includeMetadata?: boolean;
  filters?: Record<string, any>;
}

export interface VectorSearchOptions {
  limit?: number;
  numCandidates?: number;
  filter?: Record<string, any>;
  minScore?: number;
  index?: string;
  includeEmbeddings?: boolean;
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
  source: string;
  timestamp: Date;
  embedding?: number[];
}

// ============================================================================
// KNOWLEDGE GRAPH TYPES
// ============================================================================

export interface KnowledgeNode {
  id: string;
  type: string;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeRelation {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: string;
  strength: number;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  relations: KnowledgeRelation[];
  metadata: {
    totalNodes: number;
    totalRelations: number;
    lastUpdated: Date;
  };
}

// ============================================================================
// EMBEDDING AND VECTOR TYPES
// ============================================================================

export interface EmbeddingRequest {
  text: string;
  model?: string;
  metadata?: Record<string, any>;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  dimensions: number;
  tokenCount?: number;
  processingTime: number;
}

export interface VectorDocument {
  id: string;
  text: string;
  embedding: number[];
  metadata: Record<string, any>;
  source: string;
  timestamp: Date;
  chunkIndex?: number;
  parentDocumentId?: string;
}

// ============================================================================
// PERFORMANCE AND MONITORING TYPES
// ============================================================================

export interface BrainStats {
  isHealthy: boolean;
  collections: {
    embeddings: any;
    interactions: number;
    conversations: number;
    knowledgeNodes?: number;
  };
  performance: {
    averageResponseTime: number;
    averageContextRetrievalTime: number;
    averageEmbeddingTime: number;
    totalRequests: number;
  };
  lastUpdated: Date;
  version: string;
}

export interface PerformanceMetrics {
  requestId: string;
  operation: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class BrainError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'BrainError';
  }
}

export class FrameworkIntegrationError extends BrainError {
  constructor(frameworkName: string, message: string, details?: Record<string, any>) {
    super(`Framework integration error (${frameworkName}): ${message}`, 'FRAMEWORK_INTEGRATION_ERROR', details);
    this.name = 'FrameworkIntegrationError';
  }
}

export class VectorSearchError extends BrainError {
  constructor(message: string, details?: Record<string, any>) {
    super(`Vector search error: ${message}`, 'VECTOR_SEARCH_ERROR', details);
    this.name = 'VectorSearchError';
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type SupportedFramework = 'mastra' | 'vercel-ai' | 'langchain' | 'openai-agents';

export type EnhancementStrategy = 'semantic' | 'hybrid' | 'conversational' | 'knowledge_graph';

export type EmbeddingProvider = 'openai' | 'voyage-ai' | 'cohere' | 'huggingface' | 'azure-openai';

export type SearchType = 'semantic' | 'hybrid' | 'text' | 'knowledge_graph';

// Re-export from UniversalAIBrain for convenience
export type { UniversalAIBrain } from '../UniversalAIBrain';

// ============================================================================
// CONFIGURATION VALIDATION
// ============================================================================

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FrameworkValidationResult {
  isCompatible: boolean;
  version: string;
  missingFeatures: string[];
  recommendations: string[];
}

// ============================================================================
// FRAMEWORK DETECTION TYPES
// ============================================================================

export interface FrameworkInfo {
  name: string;
  available: boolean;
  compatible: boolean;
  realIntegration?: boolean;
  capabilities: FrameworkCapabilities;
  adapter: any;
  packageName?: string;
  version?: string;
}

export interface FrameworkDetectionResult {
  detectedFrameworks: FrameworkInfo[];
  suggestions: string[];
  recommendedAdapter: string | null;
}

export interface ManagedAdapterInfo {
  frameworkName: string;
  adapter: any;
  config: AdapterConfig;
  capabilities: FrameworkCapabilities;
  isActive: boolean;
  registeredAt: Date;
  lastActivity: Date;
  metrics: {
    totalCalls: number;
    successRate: number;
    averageResponseTime: number;
    errorCount: number;
  };
}

export interface ManagerStats {
  totalAdapters: number;
  activeAdapters: number;
  supportedFrameworks: string[];
  overallMetrics: {
    totalCalls: number;
    averageResponseTime: number;
    totalErrors: number;
    overallSuccessRate: number;
  };
  brainHealth: boolean;
  memoryUsage: {
    adapters: number;
    brain: number;
    total: number;
  };
}

export interface FrameworkAdapterManagerConfig {
  autoDetectFrameworks?: boolean;
  maxAdapters?: number;
  enablePerformanceMonitoring?: boolean;
  enableCrossAdapterLearning?: boolean;
  defaultAdapterConfig?: AdapterConfig;
}
