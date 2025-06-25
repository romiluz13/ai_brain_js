/**
 * @file Tracing Module - Enterprise-grade agent tracing and observability
 * 
 * This module provides comprehensive tracing capabilities for the Universal AI Brain,
 * enabling real-time monitoring, performance analysis, and debugging across all
 * framework integrations.
 */

// Core tracing engine
export { TracingEngine } from './TracingEngine';

// Real-time monitoring with MongoDB Change Streams
export { ChangeStreamManager } from './ChangeStreamManager';
export type {
  TraceChangeEvent,
  ChangeStreamOptions,
  ChangeStreamSubscriber
} from './ChangeStreamManager';

// Enterprise real-time monitoring service
export { RealTimeMonitor } from './RealTimeMonitor';
export type {
  MonitoringAlert,
  PerformanceMetrics,
  MonitoringConfig,
  MonitoringSubscriber
} from './RealTimeMonitor';

// Tracing collection and types
export {
  TracingCollection,
  AgentTrace,
  AgentStep,
  AgentError,
  ContextItem,
  TokenUsage,
  CostBreakdown,
  FrameworkMetadata
} from '../collections/TracingCollection';

// Import types for internal use (to avoid conflicts with RealTimeMonitor exports)
import type {
  PerformanceMetrics as TracingPerformanceMetrics,
  AgentError,
  ContextItem,
  TokenUsage,
  CostBreakdown,
  FrameworkMetadata,
  AgentTrace,
  AgentStep
} from '../collections/TracingCollection';

// Import TracingEngine for internal use
import type { TracingEngine } from './TracingEngine';

// Tracing engine types
export type {
  TraceStartOptions,
  StepStartOptions,
  StepCompleteOptions,
  TraceCompleteOptions
} from './TracingEngine';

// Utility functions for tracing
export class TracingUtils {
  /**
   * Generate a standardized error object for tracing
   */
  static createAgentError(
    errorType: AgentError['errorType'],
    message: string,
    originalError?: Error,
    recoverable: boolean = true,
    context?: Record<string, any>
  ): AgentError {
    return {
      errorId: require('uuid').v4(),
      errorType,
      message,
      stack: originalError?.stack,
      code: (originalError as any)?.code,
      timestamp: new Date(),
      recoverable,
      retryCount: 0,
      context
    };
  }

  /**
   * Create performance metrics from timing data
   */
  static createPerformanceMetrics(timings: {
    contextRetrievalTime?: number;
    promptEnhancementTime?: number;
    frameworkCallTime?: number;
    responseProcessingTime?: number;
    memoryStorageTime?: number;
  }): TracingPerformanceMetrics {
    const totalDuration = Object.values(timings).reduce((sum, time) => sum + (time || 0), 0);
    
    return {
      totalDuration,
      contextRetrievalTime: timings.contextRetrievalTime || 0,
      promptEnhancementTime: timings.promptEnhancementTime || 0,
      frameworkCallTime: timings.frameworkCallTime || 0,
      responseProcessingTime: timings.responseProcessingTime || 0,
      memoryStorageTime: timings.memoryStorageTime || 0,
      memoryUsage: process.memoryUsage ? {
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external
      } : undefined
    };
  }

  /**
   * Create context item for tracing
   */
  static createContextItem(
    source: string,
    content: string,
    relevanceScore: number,
    retrievalTime: number,
    metadata?: Record<string, any>
  ): ContextItem {
    return {
      contextId: require('uuid').v4(),
      source,
      content,
      relevanceScore,
      retrievalTime,
      metadata
    };
  }

  /**
   * Create token usage tracking
   */
  static createTokenUsage(
    promptTokens: number,
    completionTokens: number,
    embeddingTokens?: number,
    frameworkTokens?: TokenUsage['frameworkTokens']
  ): TokenUsage {
    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      embeddingTokens,
      frameworkTokens
    };
  }

  /**
   * Create cost breakdown for tracing
   */
  static createCostBreakdown(
    costs: {
      embeddingCost?: number;
      completionCost?: number;
      promptCost?: number;
      frameworkCosts?: CostBreakdown['frameworkCosts'];
      mongoCosts?: CostBreakdown['mongoCosts'];
    },
    currency: string = 'USD'
  ): CostBreakdown {
    const totalCost = (costs.embeddingCost || 0) + 
                     (costs.completionCost || 0) + 
                     (costs.promptCost || 0) +
                     (costs.frameworkCosts?.modelCost || 0) +
                     (costs.frameworkCosts?.apiCost || 0) +
                     (costs.mongoCosts?.vectorSearchCost || 0) +
                     (costs.mongoCosts?.readCost || 0) +
                     (costs.mongoCosts?.writeCost || 0);

    return {
      totalCost,
      embeddingCost: costs.embeddingCost || 0,
      completionCost: costs.completionCost || 0,
      promptCost: costs.promptCost || 0,
      frameworkCosts: costs.frameworkCosts,
      mongoCosts: costs.mongoCosts,
      currency,
      calculatedAt: new Date()
    };
  }

  /**
   * Create framework metadata for different frameworks
   */
  static createFrameworkMetadata(
    frameworkName: FrameworkMetadata['frameworkName'],
    frameworkData: Partial<FrameworkMetadata>
  ): FrameworkMetadata {
    return {
      frameworkName,
      frameworkVersion: frameworkData.frameworkVersion,
      vercelAI: frameworkData.vercelAI,
      mastra: frameworkData.mastra,
      openaiAgents: frameworkData.openaiAgents,
      langchain: frameworkData.langchain
    };
  }

  /**
   * Format trace duration for display
   */
  static formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    } else if (milliseconds < 60000) {
      return `${(milliseconds / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(milliseconds / 60000);
      const seconds = ((milliseconds % 60000) / 1000).toFixed(0);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Format cost for display
   */
  static formatCost(cost: number, currency: string = 'USD'): string {
    if (cost < 0.01) {
      return `<$0.01 ${currency}`;
    }
    return `$${cost.toFixed(4)} ${currency}`;
  }

  /**
   * Calculate trace health score based on performance and errors
   */
  static calculateTraceHealth(trace: AgentTrace): {
    score: number; // 0-100
    factors: {
      performance: number;
      errors: number;
      completion: number;
    };
  } {
    let performanceScore = 100;
    let errorScore = 100;
    let completionScore = 100;

    // Performance scoring (based on duration)
    if (trace.performance.totalDuration > 30000) { // > 30s
      performanceScore = 20;
    } else if (trace.performance.totalDuration > 10000) { // > 10s
      performanceScore = 50;
    } else if (trace.performance.totalDuration > 5000) { // > 5s
      performanceScore = 80;
    }

    // Error scoring
    if (trace.errors.length > 0) {
      const recoverableErrors = trace.errors.filter(e => e.recoverable).length;
      const nonRecoverableErrors = trace.errors.length - recoverableErrors;
      
      errorScore = Math.max(0, 100 - (nonRecoverableErrors * 50) - (recoverableErrors * 20));
    }

    // Completion scoring
    if (trace.status === 'completed') {
      completionScore = 100;
    } else if (trace.status === 'failed') {
      completionScore = 0;
    } else if (trace.status === 'cancelled') {
      completionScore = 30;
    } else if (trace.status === 'timeout') {
      completionScore = 10;
    } else {
      completionScore = 50; // active
    }

    const overallScore = (performanceScore * 0.4) + (errorScore * 0.4) + (completionScore * 0.2);

    return {
      score: Math.round(overallScore),
      factors: {
        performance: performanceScore,
        errors: errorScore,
        completion: completionScore
      }
    };
  }

  /**
   * Extract key metrics from a trace for dashboard display
   */
  static extractKeyMetrics(trace: AgentTrace): {
    duration: string;
    cost: string;
    tokens: number;
    errors: number;
    health: number;
    framework: string;
    operation: string;
  } {
    const health = this.calculateTraceHealth(trace);
    
    return {
      duration: this.formatDuration(trace.performance.totalDuration),
      cost: this.formatCost(trace.cost.totalCost, trace.cost.currency),
      tokens: trace.tokensUsed.totalTokens,
      errors: trace.errors.length,
      health: health.score,
      framework: trace.framework.frameworkName,
      operation: trace.operation.type
    };
  }
}

/**
 * Tracing decorators for automatic method tracing
 */
export class TracingDecorators {
  /**
   * Decorator to automatically trace method execution
   */
  static trace(stepType: AgentStep['stepType']) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
      const method = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const tracingEngine = this.tracingEngine as TracingEngine;
        const traceId = this.currentTraceId as string;

        if (!tracingEngine || !traceId) {
          // No tracing available, call original method
          return method.apply(this, args);
        }

        const stepId = await tracingEngine.startStep(traceId, {
          stepType,
          input: args.length > 0 ? args[0] : undefined,
          metadata: {
            method: propertyName,
            className: target.constructor.name
          }
        });

        try {
          const result = await method.apply(this, args);
          
          await tracingEngine.completeStep(traceId, stepId, {
            output: result
          });

          return result;
        } catch (error) {
          const agentError = TracingUtils.createAgentError(
            'framework_error',
            `Error in ${propertyName}: ${error.message}`,
            error,
            true,
            { method: propertyName, className: target.constructor.name }
          );

          await tracingEngine.completeStep(traceId, stepId, {
            error: agentError
          });

          throw error;
        }
      };
    };
  }
}
