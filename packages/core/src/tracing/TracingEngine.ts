/**
 * @file TracingEngine - Real-time agent tracing and observability engine
 * 
 * This is the core orchestrator for enterprise-grade agent tracing, providing
 * real-time monitoring, performance analysis, and debugging capabilities across
 * all framework integrations.
 * 
 * Features:
 * - MongoDB transactions for trace consistency
 * - Real-time trace lifecycle management
 * - Performance metrics collection
 * - Error tracking and recovery
 * - Framework-agnostic tracing
 */

import { ObjectId, ClientSession } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { TracingCollection, AgentTrace, AgentStep, AgentError, PerformanceMetrics, ContextItem, TokenUsage, CostBreakdown, FrameworkMetadata } from '../collections/TracingCollection';
import { MongoConnection } from '../persistance/MongoConnection';

export interface TraceStartOptions {
  agentId: ObjectId;
  sessionId: string;
  conversationId?: string;
  operation: {
    type: AgentTrace['operation']['type'];
    description?: string;
    userInput: string;
  };
  framework: FrameworkMetadata;
  userContext?: AgentTrace['userContext'];
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface StepStartOptions {
  stepType: AgentStep['stepType'];
  input?: any;
  metadata?: Record<string, any>;
}

export interface StepCompleteOptions {
  output?: any;
  error?: AgentError;
  metadata?: Record<string, any>;
}

export interface TraceCompleteOptions {
  status: 'completed' | 'failed' | 'cancelled' | 'timeout';
  finalOutput?: string;
  outputType?: AgentTrace['operation']['outputType'];
  tokensUsed?: Partial<TokenUsage>;
  cost?: Partial<CostBreakdown>;
  errors?: AgentError[];
  warnings?: string[];
  safetyChecks?: AgentTrace['safetyChecks'];
  debugInfo?: AgentTrace['debugInfo'];
}

/**
 * TracingEngine - Core orchestrator for real-time agent tracing
 * 
 * This class manages the complete lifecycle of agent traces with MongoDB
 * transactions for consistency and real-time monitoring capabilities.
 */
export class TracingEngine {
  private tracingCollection: TracingCollection;
  private mongoConnection: MongoConnection;
  private activeTraces: Map<string, {
    trace: AgentTrace;
    session?: ClientSession;
    startTime: Date;
    currentStep?: string;
  }> = new Map();

  constructor(tracingCollection: TracingCollection, mongoConnection: MongoConnection) {
    this.tracingCollection = tracingCollection;
    this.mongoConnection = mongoConnection;
  }

  /**
   * Start a new trace with MongoDB transaction
   */
  async startTrace(options: TraceStartOptions): Promise<string> {
    const traceId = uuidv4();
    const session = this.mongoConnection.getClient().startSession();
    
    try {
      await session.withTransaction(async () => {
        const trace = await this.tracingCollection.startTrace({
          traceId,
          ...options
        });

        // Store in active traces for real-time monitoring
        this.activeTraces.set(traceId, {
          trace,
          session,
          startTime: new Date(),
          currentStep: undefined
        });

        console.log(`🔍 Trace started: ${traceId} for agent ${options.agentId}`);
      });

      return traceId;
    } catch (error) {
      await session.endSession();
      console.error(`❌ Failed to start trace: ${error.message}`);
      throw new Error(`Failed to start trace: ${error.message}`);
    }
  }

  /**
   * Start a new step within a trace
   */
  async startStep(traceId: string, options: StepStartOptions): Promise<string> {
    const activeTrace = this.activeTraces.get(traceId);
    if (!activeTrace) {
      throw new Error(`Trace ${traceId} not found or not active`);
    }

    const stepId = uuidv4();
    const step: AgentStep = {
      stepId,
      stepType: options.stepType,
      startTime: new Date(),
      status: 'running',
      input: options.input,
      metadata: options.metadata
    };

    try {
      await this.tracingCollection.addStep(traceId, step);
      
      // Update active trace
      activeTrace.currentStep = stepId;
      
      console.log(`⚡ Step started: ${stepId} (${options.stepType}) in trace ${traceId}`);
      return stepId;
    } catch (error) {
      console.error(`❌ Failed to start step: ${error.message}`);
      throw new Error(`Failed to start step: ${error.message}`);
    }
  }

  /**
   * Complete a step within a trace
   */
  async completeStep(
    traceId: string, 
    stepId: string, 
    options: StepCompleteOptions
  ): Promise<void> {
    const activeTrace = this.activeTraces.get(traceId);
    if (!activeTrace) {
      throw new Error(`Trace ${traceId} not found or not active`);
    }

    const endTime = new Date();
    const stepUpdate: Partial<AgentStep> = {
      endTime,
      status: options.error ? 'failed' : 'completed',
      output: options.output,
      error: options.error,
      metadata: { ...options.metadata }
    };

    // Calculate duration if we have the step start time
    const trace = await this.tracingCollection.findOne({ traceId });
    if (trace) {
      const step = trace.steps.find(s => s.stepId === stepId);
      if (step) {
        stepUpdate.duration = endTime.getTime() - step.startTime.getTime();
      }
    }

    try {
      await this.tracingCollection.updateStep(traceId, stepId, stepUpdate);
      
      // Clear current step if this was it
      if (activeTrace.currentStep === stepId) {
        activeTrace.currentStep = undefined;
      }
      
      console.log(`✅ Step completed: ${stepId} in trace ${traceId}`);
    } catch (error) {
      console.error(`❌ Failed to complete step: ${error.message}`);
      throw new Error(`Failed to complete step: ${error.message}`);
    }
  }

  /**
   * Record context items used in a trace
   */
  async recordContextUsed(traceId: string, contextItems: ContextItem[]): Promise<void> {
    try {
      await this.tracingCollection.addContextUsed(traceId, contextItems);
      console.log(`📝 Recorded ${contextItems.length} context items for trace ${traceId}`);
    } catch (error) {
      console.error(`❌ Failed to record context: ${error.message}`);
      // Don't throw - this is not critical for the main flow
    }
  }

  /**
   * Record an error in a trace
   */
  async recordError(traceId: string, error: AgentError): Promise<void> {
    try {
      await this.tracingCollection.recordError(traceId, error);
      console.log(`🚨 Error recorded in trace ${traceId}: ${error.errorType}`);
    } catch (recordError) {
      console.error(`❌ Failed to record error: ${recordError.message}`);
      // Don't throw - this is not critical for the main flow
    }
  }

  /**
   * Complete a trace with final results
   */
  async completeTrace(traceId: string, options: TraceCompleteOptions): Promise<void> {
    const activeTrace = this.activeTraces.get(traceId);
    if (!activeTrace) {
      throw new Error(`Trace ${traceId} not found or not active`);
    }

    try {
      // Calculate performance metrics
      const endTime = new Date();
      const totalDuration = endTime.getTime() - activeTrace.startTime.getTime();
      
      const performance: Partial<PerformanceMetrics> = {
        totalDuration,
        // Add memory usage if available
        memoryUsage: process.memoryUsage ? {
          heapUsed: process.memoryUsage().heapUsed,
          heapTotal: process.memoryUsage().heapTotal,
          external: process.memoryUsage().external
        } : undefined
      };

      await this.tracingCollection.completeTrace(traceId, {
        ...options,
        performance
      });

      // Clean up active trace
      if (activeTrace.session) {
        await activeTrace.session.endSession();
      }
      this.activeTraces.delete(traceId);

      console.log(`🎯 Trace completed: ${traceId} (${options.status}) - ${totalDuration}ms`);
    } catch (error) {
      console.error(`❌ Failed to complete trace: ${error.message}`);
      throw new Error(`Failed to complete trace: ${error.message}`);
    }
  }

  /**
   * Get active traces for real-time monitoring
   */
  getActiveTraces(): Array<{
    traceId: string;
    agentId: ObjectId;
    sessionId: string;
    startTime: Date;
    currentStep?: string;
    duration: number;
  }> {
    const now = new Date();
    return Array.from(this.activeTraces.entries()).map(([traceId, data]) => ({
      traceId,
      agentId: data.trace.agentId,
      sessionId: data.trace.sessionId,
      startTime: data.startTime,
      currentStep: data.currentStep,
      duration: now.getTime() - data.startTime.getTime()
    }));
  }

  /**
   * Force cleanup of stale traces (for error recovery)
   */
  async cleanupStaleTraces(maxAgeMinutes: number = 30): Promise<number> {
    const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    let cleanedCount = 0;

    for (const [traceId, data] of this.activeTraces.entries()) {
      if (data.startTime < cutoffTime) {
        try {
          // Mark as timeout and complete
          await this.completeTrace(traceId, {
            status: 'timeout',
            errors: [{
              errorId: uuidv4(),
              errorType: 'timeout_error',
              message: `Trace timed out after ${maxAgeMinutes} minutes`,
              timestamp: new Date(),
              recoverable: false
            }]
          });
          cleanedCount++;
        } catch (error) {
          console.error(`Failed to cleanup stale trace ${traceId}:`, error);
          // Force remove from active traces
          if (data.session) {
            await data.session.endSession().catch(() => {});
          }
          this.activeTraces.delete(traceId);
        }
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} stale traces`);
    }

    return cleanedCount;
  }

  /**
   * Get trace statistics
   */
  getStats(): {
    activeTraces: number;
    averageTraceAge: number;
    oldestTraceAge: number;
  } {
    const now = new Date();
    const traces = Array.from(this.activeTraces.values());
    
    if (traces.length === 0) {
      return {
        activeTraces: 0,
        averageTraceAge: 0,
        oldestTraceAge: 0
      };
    }

    const ages = traces.map(trace => now.getTime() - trace.startTime.getTime());
    const averageAge = ages.reduce((sum, age) => sum + age, 0) / ages.length;
    const oldestAge = Math.max(...ages);

    return {
      activeTraces: traces.length,
      averageTraceAge: averageAge,
      oldestTraceAge: oldestAge
    };
  }
}
