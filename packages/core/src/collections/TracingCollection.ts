/**
 * @file TracingCollection - Enterprise-grade agent tracing and observability
 * 
 * This collection provides comprehensive tracing for all agent operations,
 * enabling real-time monitoring, performance analysis, and debugging across
 * all framework integrations (Vercel AI, Mastra, OpenAI Agents, LangChain).
 * 
 * Features:
 * - Real-time trace monitoring with MongoDB Change Streams
 * - Performance metrics and cost tracking
 * - Error analysis and debugging information
 * - Framework-specific operation tracking
 * - Time-series data optimization
 */

import { ObjectId } from 'mongodb';
import { BaseCollection, BaseDocument } from './BaseCollection';

// Core tracing interfaces
export interface AgentStep {
  stepId: string;
  stepType: 'context_injection' | 'prompt_enhancement' | 'framework_call' | 'response_processing' | 'safety_check' | 'memory_storage';
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input?: any;
  output?: any;
  error?: AgentError;
  metadata?: Record<string, any>;
}

export interface AgentError {
  errorId: string;
  errorType: 'validation_error' | 'framework_error' | 'mongodb_error' | 'network_error' | 'timeout_error' | 'safety_violation' | 'unknown_error';
  message: string;
  stack?: string;
  code?: string | number;
  timestamp: Date;
  recoverable: boolean;
  retryCount?: number;
  context?: Record<string, any>;
}

export interface PerformanceMetrics {
  totalDuration: number; // milliseconds
  contextRetrievalTime: number;
  promptEnhancementTime: number;
  frameworkCallTime: number;
  responseProcessingTime: number;
  memoryStorageTime: number;
  
  // Resource usage
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  
  // Network metrics
  networkMetrics?: {
    requestCount: number;
    totalBytes: number;
    avgLatency: number;
  };
}

export interface ContextItem {
  contextId: string;
  source: string;
  content: string;
  relevanceScore: number;
  retrievalTime: number;
  metadata?: Record<string, any>;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  embeddingTokens?: number;
  
  // Framework-specific token details
  frameworkTokens?: {
    inputTokens: number;
    outputTokens: number;
    reasoningTokens?: number; // For models like o1
  };
}

export interface CostBreakdown {
  totalCost: number; // USD
  
  // Cost by operation type
  embeddingCost: number;
  completionCost: number;
  promptCost: number;
  
  // Framework-specific costs
  frameworkCosts?: {
    modelCost: number;
    apiCost: number;
    additionalCosts?: Record<string, number>;
  };
  
  // MongoDB costs (for Atlas usage)
  mongoCosts?: {
    vectorSearchCost: number;
    readCost: number;
    writeCost: number;
  };
  
  currency: string;
  calculatedAt: Date;
}

export interface FrameworkMetadata {
  frameworkName: 'vercel-ai' | 'mastra' | 'openai-agents' | 'langchain' | 'unknown';
  frameworkVersion?: string;
  
  // Framework-specific data
  vercelAI?: {
    model: string;
    provider: string;
    streaming: boolean;
    tools?: string[];
  };
  
  mastra?: {
    agentId: string;
    resourceId?: string;
    threadId?: string;
    workflowId?: string;
  };
  
  openaiAgents?: {
    assistantId: string;
    threadId: string;
    runId: string;
    tools?: string[];
  };
  
  langchain?: {
    chainType: string;
    memoryType?: string;
    vectorStore?: string;
    llmProvider?: string;
  };
}

// Main AgentTrace document interface
export interface AgentTrace extends BaseDocument {
  // Core identification
  traceId: string; // Unique trace identifier
  agentId: ObjectId; // Reference to agent
  sessionId: string; // User session identifier
  conversationId?: string; // Conversation context
  
  // Timing information
  startTime: Date;
  endTime?: Date;
  totalDuration?: number; // milliseconds
  
  // Trace status
  status: 'active' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  
  // Operation details
  operation: {
    type: 'generate_text' | 'stream_text' | 'generate_object' | 'chat' | 'memory_retrieval' | 'context_search' | 'custom';
    description?: string;
    userInput: string;
    finalOutput?: string;
    outputType?: 'text' | 'object' | 'stream' | 'error';
  };
  
  // Execution steps
  steps: AgentStep[];
  
  // Performance and monitoring
  performance: PerformanceMetrics;
  errors: AgentError[];
  warnings?: string[];
  
  // Context and memory
  contextUsed: ContextItem[];
  memoryOperations?: {
    retrieved: number;
    stored: number;
    updated: number;
  };
  
  // Resource usage
  tokensUsed: TokenUsage;
  cost: CostBreakdown;
  
  // Framework integration
  framework: FrameworkMetadata;
  
  // Safety and compliance
  safetyChecks?: {
    piiDetected: boolean;
    contentFiltered: boolean;
    hallucinationScore?: number;
    complianceFlags?: string[];
  };
  
  // Debugging and analysis
  debugInfo?: {
    environment: string;
    nodeVersion: string;
    memorySnapshot?: any;
    stackTrace?: string[];
  };
  
  // User and system context
  userContext?: {
    userId?: string;
    userAgent?: string;
    ipAddress?: string;
    location?: string;
  };
  
  // Tags for filtering and analysis
  tags?: string[];
  
  // Custom metadata
  metadata?: Record<string, any>;
}

/**
 * TracingCollection - Enterprise-grade agent tracing and observability
 * 
 * This collection stores comprehensive trace data for all agent operations,
 * optimized for time-series queries and real-time monitoring.
 */
export class TracingCollection extends BaseCollection<AgentTrace> {
  protected collectionName = 'agent_traces';

  constructor(db: any) {
    super(db);
    this.initializeCollection();
  }

  /**
   * Create specialized indexes for tracing queries
   */
  async createIndexes(): Promise<void> {
    await Promise.all([
      // Common indexes
      this.createCommonIndexes(),
      
      // Tracing-specific indexes
      this.collection.createIndex({ traceId: 1 }, { unique: true }),
      this.collection.createIndex({ agentId: 1, startTime: -1 }),
      this.collection.createIndex({ sessionId: 1, startTime: -1 }),
      this.collection.createIndex({ conversationId: 1, startTime: -1 }),
      
      // Status and operation indexes
      this.collection.createIndex({ status: 1, startTime: -1 }),
      this.collection.createIndex({ 'operation.type': 1, startTime: -1 }),
      this.collection.createIndex({ 'framework.frameworkName': 1, startTime: -1 }),
      
      // Performance indexes
      this.collection.createIndex({ 'performance.totalDuration': -1 }),
      this.collection.createIndex({ 'cost.totalCost': -1 }),
      this.collection.createIndex({ 'tokensUsed.totalTokens': -1 }),
      
      // Time-series indexes for analytics
      this.collection.createIndex({ startTime: -1, endTime: -1 }),
      this.collection.createIndex({ 
        startTime: -1, 
        'framework.frameworkName': 1, 
        status: 1 
      }),
      
      // Error analysis indexes
      this.collection.createIndex({ 'errors.errorType': 1, startTime: -1 }),
      this.collection.createIndex({ 'errors.recoverable': 1, startTime: -1 }),
      
      // User and session indexes
      this.collection.createIndex({ 'userContext.userId': 1, startTime: -1 }),
      this.collection.createIndex({ tags: 1, startTime: -1 }),
      
      // Compound indexes for common queries
      this.collection.createIndex({
        agentId: 1,
        status: 1,
        startTime: -1
      }),
      this.collection.createIndex({
        'framework.frameworkName': 1,
        'operation.type': 1,
        startTime: -1
      })
    ]);

    console.log('✅ TracingCollection indexes created successfully');
  }

  /**
   * Start a new trace for an agent operation
   */
  async startTrace(traceData: {
    traceId: string;
    agentId: ObjectId;
    sessionId: string;
    conversationId?: string;
    operation: AgentTrace['operation'];
    framework: FrameworkMetadata;
    userContext?: AgentTrace['userContext'];
    tags?: string[];
    metadata?: Record<string, any>;
  }): Promise<AgentTrace> {
    const trace: Omit<AgentTrace, '_id' | 'createdAt' | 'updatedAt'> = {
      ...traceData,
      startTime: new Date(),
      status: 'active',
      steps: [],
      performance: {
        totalDuration: 0,
        contextRetrievalTime: 0,
        promptEnhancementTime: 0,
        frameworkCallTime: 0,
        responseProcessingTime: 0,
        memoryStorageTime: 0
      },
      errors: [],
      contextUsed: [],
      tokensUsed: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      },
      cost: {
        totalCost: 0,
        embeddingCost: 0,
        completionCost: 0,
        promptCost: 0,
        currency: 'USD',
        calculatedAt: new Date()
      }
    };

    return await this.insertOne(trace);
  }

  /**
   * Complete a trace with final results
   */
  async completeTrace(
    traceId: string,
    completion: {
      status: 'completed' | 'failed' | 'cancelled' | 'timeout';
      finalOutput?: string;
      outputType?: AgentTrace['operation']['outputType'];
      performance?: Partial<PerformanceMetrics>;
      tokensUsed?: Partial<TokenUsage>;
      cost?: Partial<CostBreakdown>;
      errors?: AgentError[];
      warnings?: string[];
      safetyChecks?: AgentTrace['safetyChecks'];
      debugInfo?: AgentTrace['debugInfo'];
    }
  ): Promise<AgentTrace | null> {
    const endTime = new Date();

    // Calculate total duration
    const trace = await this.findOne({ traceId });
    if (!trace) {
      throw new Error(`Trace ${traceId} not found`);
    }

    const totalDuration = endTime.getTime() - trace.startTime.getTime();

    const updateData = {
      $set: {
        endTime,
        totalDuration,
        status: completion.status,
        'operation.finalOutput': completion.finalOutput,
        'operation.outputType': completion.outputType,
        updatedAt: new Date()
      },
      $push: {},
      $inc: {}
    };

    // Update performance metrics
    if (completion.performance) {
      Object.keys(completion.performance).forEach(key => {
        updateData.$set[`performance.${key}`] = completion.performance![key as keyof PerformanceMetrics];
      });
      updateData.$set['performance.totalDuration'] = totalDuration;
    }

    // Update token usage
    if (completion.tokensUsed) {
      Object.keys(completion.tokensUsed).forEach(key => {
        updateData.$set[`tokensUsed.${key}`] = completion.tokensUsed![key as keyof TokenUsage];
      });
    }

    // Update cost breakdown
    if (completion.cost) {
      Object.keys(completion.cost).forEach(key => {
        updateData.$set[`cost.${key}`] = completion.cost![key as keyof CostBreakdown];
      });
      updateData.$set['cost.calculatedAt'] = new Date();
    }

    // Add errors if any
    if (completion.errors && completion.errors.length > 0) {
      updateData.$push = { errors: { $each: completion.errors } };
    }

    // Add warnings if any
    if (completion.warnings && completion.warnings.length > 0) {
      updateData.$push = { ...updateData.$push, warnings: { $each: completion.warnings } };
    }

    // Add safety checks
    if (completion.safetyChecks) {
      updateData.$set['safetyChecks'] = completion.safetyChecks;
    }

    // Add debug info
    if (completion.debugInfo) {
      updateData.$set['debugInfo'] = completion.debugInfo;
    }

    return await this.updateOne({ traceId }, updateData);
  }

  /**
   * Add a step to an active trace
   */
  async addStep(traceId: string, step: AgentStep): Promise<AgentTrace | null> {
    return await this.updateOne(
      { traceId, status: 'active' },
      {
        $push: { steps: step },
        $set: { updatedAt: new Date() }
      }
    );
  }

  /**
   * Update a specific step in a trace
   */
  async updateStep(
    traceId: string,
    stepId: string,
    stepUpdate: Partial<AgentStep>
  ): Promise<AgentTrace | null> {
    const updateFields: Record<string, any> = {};

    Object.keys(stepUpdate).forEach(key => {
      updateFields[`steps.$.${key}`] = stepUpdate[key as keyof AgentStep];
    });

    return await this.updateOne(
      { traceId, 'steps.stepId': stepId },
      {
        $set: {
          ...updateFields,
          updatedAt: new Date()
        }
      }
    );
  }

  /**
   * Add context items used in a trace
   */
  async addContextUsed(traceId: string, contextItems: ContextItem[]): Promise<AgentTrace | null> {
    return await this.updateOne(
      { traceId },
      {
        $push: { contextUsed: { $each: contextItems } },
        $set: { updatedAt: new Date() }
      }
    );
  }

  /**
   * Record an error in a trace
   */
  async recordError(traceId: string, error: AgentError): Promise<AgentTrace | null> {
    return await this.updateOne(
      { traceId },
      {
        $push: { errors: error },
        $set: { updatedAt: new Date() }
      }
    );
  }

  /**
   * Get traces by agent with pagination and filtering
   */
  async getTracesByAgent(
    agentId: ObjectId,
    options: {
      status?: AgentTrace['status'];
      framework?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      skip?: number;
    } = {}
  ): Promise<AgentTrace[]> {
    const filter: any = { agentId };

    if (options.status) {
      filter.status = options.status;
    }

    if (options.framework) {
      filter['framework.frameworkName'] = options.framework;
    }

    if (options.startDate || options.endDate) {
      filter.startTime = {};
      if (options.startDate) {
        filter.startTime.$gte = options.startDate;
      }
      if (options.endDate) {
        filter.startTime.$lte = options.endDate;
      }
    }

    return await this.collection
      .find(filter)
      .sort({ startTime: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 50)
      .toArray();
  }

  /**
   * Get performance analytics for a time period
   */
  async getPerformanceAnalytics(
    startDate: Date,
    endDate: Date,
    groupBy: 'hour' | 'day' | 'framework' | 'operation' = 'day'
  ): Promise<any[]> {
    const pipeline: any[] = [
      {
        $match: {
          startTime: { $gte: startDate, $lte: endDate },
          status: 'completed'
        }
      }
    ];

    // Group by different dimensions
    switch (groupBy) {
      case 'hour':
        pipeline.push({
          $group: {
            _id: {
              year: { $year: '$startTime' },
              month: { $month: '$startTime' },
              day: { $dayOfMonth: '$startTime' },
              hour: { $hour: '$startTime' }
            },
            avgDuration: { $avg: '$performance.totalDuration' },
            totalTraces: { $sum: 1 },
            totalCost: { $sum: '$cost.totalCost' },
            totalTokens: { $sum: '$tokensUsed.totalTokens' },
            errorCount: { $sum: { $size: '$errors' } }
          }
        });
        break;

      case 'day':
        pipeline.push({
          $group: {
            _id: {
              year: { $year: '$startTime' },
              month: { $month: '$startTime' },
              day: { $dayOfMonth: '$startTime' }
            },
            avgDuration: { $avg: '$performance.totalDuration' },
            totalTraces: { $sum: 1 },
            totalCost: { $sum: '$cost.totalCost' },
            totalTokens: { $sum: '$tokensUsed.totalTokens' },
            errorCount: { $sum: { $size: '$errors' } }
          }
        });
        break;

      case 'framework':
        pipeline.push({
          $group: {
            _id: '$framework.frameworkName',
            avgDuration: { $avg: '$performance.totalDuration' },
            totalTraces: { $sum: 1 },
            totalCost: { $sum: '$cost.totalCost' },
            totalTokens: { $sum: '$tokensUsed.totalTokens' },
            errorCount: { $sum: { $size: '$errors' } }
          }
        });
        break;

      case 'operation':
        pipeline.push({
          $group: {
            _id: '$operation.type',
            avgDuration: { $avg: '$performance.totalDuration' },
            totalTraces: { $sum: 1 },
            totalCost: { $sum: '$cost.totalCost' },
            totalTokens: { $sum: '$tokensUsed.totalTokens' },
            errorCount: { $sum: { $size: '$errors' } }
          }
        });
        break;
    }

    pipeline.push({ $sort: { _id: 1 } });

    return await this.aggregate(pipeline);
  }

  /**
   * Get error analysis for debugging
   */
  async getErrorAnalysis(
    startDate: Date,
    endDate: Date
  ): Promise<{
    errorsByType: any[];
    errorsByFramework: any[];
    recoverableErrors: number;
    totalErrors: number;
  }> {
    const pipeline = [
      {
        $match: {
          startTime: { $gte: startDate, $lte: endDate },
          errors: { $exists: true, $ne: [] }
        }
      },
      {
        $unwind: '$errors'
      },
      {
        $facet: {
          errorsByType: [
            {
              $group: {
                _id: '$errors.errorType',
                count: { $sum: 1 },
                recoverableCount: {
                  $sum: { $cond: ['$errors.recoverable', 1, 0] }
                }
              }
            },
            { $sort: { count: -1 } }
          ],
          errorsByFramework: [
            {
              $group: {
                _id: '$framework.frameworkName',
                count: { $sum: 1 },
                errorTypes: { $addToSet: '$errors.errorType' }
              }
            },
            { $sort: { count: -1 } }
          ],
          totalStats: [
            {
              $group: {
                _id: null,
                totalErrors: { $sum: 1 },
                recoverableErrors: {
                  $sum: { $cond: ['$errors.recoverable', 1, 0] }
                }
              }
            }
          ]
        }
      }
    ];

    const result = await this.aggregate(pipeline);
    const stats = result[0];

    return {
      errorsByType: stats.errorsByType,
      errorsByFramework: stats.errorsByFramework,
      recoverableErrors: stats.totalStats[0]?.recoverableErrors || 0,
      totalErrors: stats.totalStats[0]?.totalErrors || 0
    };
  }

  /**
   * Get active traces (for real-time monitoring)
   */
  async getActiveTraces(limit: number = 100): Promise<AgentTrace[]> {
    return await this.collection
      .find({ status: 'active' })
      .sort({ startTime: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Get traces by session for conversation analysis
   */
  async getTracesBySession(
    sessionId: string,
    options: { limit?: number; skip?: number } = {}
  ): Promise<AgentTrace[]> {
    return await this.collection
      .find({ sessionId })
      .sort({ startTime: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 50)
      .toArray();
  }

  /**
   * Clean up old traces (for data retention)
   */
  async cleanupOldTraces(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.collection.deleteMany({
      startTime: { $lt: cutoffDate },
      status: { $in: ['completed', 'failed', 'cancelled'] }
    });

    return result.deletedCount;
  }
}
