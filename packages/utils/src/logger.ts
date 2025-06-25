import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

// Log levels following MongoDB conventions
export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

// Structured log context for AI agents
export interface LogContext {
  trace_id?: string;
  workflow_id?: string;
  agent_id?: string;
  session_id?: string;
  tool_id?: string;
  step_id?: string;
  customer_id?: string;
  operation?: string;
  duration_ms?: number;
  cost_usd?: number;
  tokens_used?: number;
  confidence_score?: number;
  error_code?: string;
  metadata?: Record<string, any>;
  status?: string;
}

// Performance metrics for MongoDB operations
export interface MongoOperationMetrics {
  operation_type: 'find' | 'insert' | 'update' | 'delete' | 'aggregate' | 'vectorSearch';
  collection: string;
  duration_ms: number;
  documents_examined?: number;
  documents_returned?: number;
  index_used?: string;
  execution_stats?: Record<string, any>;
}

// Agent performance metrics
export interface AgentMetrics {
  agent_id: string;
  operation: string;
  success: boolean;
  duration_ms: number;
  cost_usd?: number;
  tokens_used?: number;
  confidence_score?: number;
  error_message?: string;
}

class StructuredLogger {
  private logger: pino.Logger;
  private defaultContext: LogContext;

  constructor(options: {
    level?: LogLevel;
    service_name?: string;
    environment?: string;
    version?: string;
  } = {}) {
    const {
      level = LogLevel.INFO,
      service_name = 'mongodb-ai-agent',
      environment = process.env.NODE_ENV || 'development',
      version = process.env.npm_package_version || '1.0.0'
    } = options;

    this.defaultContext = {
      trace_id: uuidv4()
    };

    // Configure Pino with MongoDB-friendly structured logging
    this.logger = pino({
      level,
      base: {
        service: service_name,
        environment,
        version,
        hostname: process.env.HOSTNAME || 'unknown',
        pid: process.pid
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => ({ level: label }),
        log: (object) => {
          // Ensure MongoDB-compatible field names (no dots in keys)
          const sanitized = this.sanitizeForMongoDB(object);
          return sanitized;
        }
      },
      serializers: {
        error: pino.stdSerializers.err,
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res
      }
    });
  }

  /**
   * Sanitize log object for MongoDB storage (remove dots from keys)
   */
  private sanitizeForMongoDB(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeForMongoDB(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Replace dots with underscores for MongoDB compatibility
      const sanitizedKey = key.replace(/\./g, '_');
      sanitized[sanitizedKey] = this.sanitizeForMongoDB(value);
    }

    return sanitized;
  }

  /**
   * Set default context for all subsequent logs
   */
  setContext(context: Partial<LogContext>): void {
    this.defaultContext = { ...this.defaultContext, ...context };
  }

  /**
   * Get current trace ID
   */
  getTraceId(): string {
    return this.defaultContext.trace_id || uuidv4();
  }

  /**
   * Create a new trace ID
   */
  newTrace(): string {
    const traceId = uuidv4();
    this.defaultContext.trace_id = traceId;
    return traceId;
  }

  /**
   * Log with structured context
   */
  private logWithContext(level: LogLevel, message: string, context: LogContext = {}, error?: Error): void {
    const logContext = {
      ...this.defaultContext,
      ...context,
      timestamp: new Date().toISOString(),
      message
    };

    if (error) {
        this.logger[level]({ ...logContext, err: error }, message);
    } else {
        this.logger[level](logContext, message);
    }
  }

  /**
   * Log trace level message
   */
  trace(message: string, context: LogContext = {}): void {
    this.logWithContext(LogLevel.TRACE, message, context);
  }

  /**
   * Log debug level message
   */
  debug(message: string, context: LogContext = {}): void {
    this.logWithContext(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info level message
   */
  info(message: string, context: LogContext = {}): void {
    this.logWithContext(LogLevel.INFO, message, context);
  }

  /**
   * Log warning level message
   */
  warn(message: string, context: LogContext = {}, error?: Error): void {
    this.logWithContext(LogLevel.WARN, message, context, error);
  }

  /**
   * Log error level message
   */
  error(message: string, context: LogContext = {}, error?: Error): void {
    this.logWithContext(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log fatal level message
   */
  fatal(message: string, context: LogContext = {}, error?: Error): void {
    this.logWithContext(LogLevel.FATAL, message, context, error);
  }

  /**
   * Log MongoDB operation metrics
   */
  mongoOperation(metrics: MongoOperationMetrics, context: LogContext = {}): void {
    this.info('MongoDB operation completed', {
      ...context,
      operation: 'mongodb_operation',
      ...metrics,
      metadata: {
        mongo_metrics: metrics,
        ...context.metadata
      }
    });
  }

  /**
   * Log agent performance metrics
   */
  agentMetrics(metrics: AgentMetrics, context: LogContext = {}): void {
    this.info('Agent operation completed', {
      ...context,
      agent_id: metrics.agent_id,
      operation: metrics.operation,
      duration_ms: metrics.duration_ms,
      cost_usd: metrics.cost_usd,
      tokens_used: metrics.tokens_used,
      confidence_score: metrics.confidence_score,
      metadata: {
        agent_metrics: metrics,
        success: metrics.success,
        ...context.metadata
      }
    });

    if (!metrics.success && metrics.error_message) {
      this.error('Agent operation failed', {
        ...context,
        agent_id: metrics.agent_id,
        operation: metrics.operation,
        error_code: 'AGENT_OPERATION_FAILED',
        metadata: {
          error_message: metrics.error_message,
          ...context.metadata
        }
      });
    }
  }

  /**
   * Log workflow step execution
   */
  workflowStep(
    stepId: string,
    status: 'started' | 'completed' | 'failed',
    context: LogContext = {},
    error?: Error
  ): void {
    const message = `Workflow step ${status}`;
    const stepContext = {
      ...context,
      step_id: stepId,
      operation: 'workflow_step',
      step_status: status
    };

    if (status === 'failed' && error) {
      this.error(message, stepContext, error);
    } else {
      this.info(message, stepContext);
    }
  }

  /**
   * Log tool execution
   */
  toolExecution(
    toolId: string,
    status: 'started' | 'completed' | 'failed',
    context: LogContext = {},
    error?: Error
  ): void {
    const message = `Tool execution ${status}`;
    const toolContext = {
      ...context,
      tool_id: toolId,
      operation: 'tool_execution',
      tool_status: status
    };

    if (status === 'failed' && error) {
      this.error(message, toolContext, error);
    } else {
      this.info(message, toolContext);
    }
  }

  /**
   * Log vector search operation
   */
  vectorSearch(
    query: string,
    resultsCount: number,
    duration: number,
    context: LogContext = {}
  ): void {
    this.info('Vector search completed', {
      ...context,
      operation: 'vector_search',
      duration_ms: duration,
      metadata: {
        query_length: query.length,
        results_count: resultsCount,
        search_type: 'vector',
        ...context.metadata
      }
    });
  }

  /**
   * Log hybrid search operation
   */
  hybridSearch(
    query: string,
    vectorResults: number,
    textResults: number,
    combinedResults: number,
    duration: number,
    context: LogContext = {}
  ): void {
    this.info('Hybrid search completed', {
      ...context,
      operation: 'hybrid_search',
      duration_ms: duration,
      metadata: {
        query_length: query.length,
        vector_results: vectorResults,
        text_results: textResults,
        combined_results: combinedResults,
        search_type: 'hybrid',
        ...context.metadata
      }
    });
  }

  /**
   * Log customer interaction
   */
  customerInteraction(
    customerId: string,
    interactionType: string,
    success: boolean,
    context: LogContext = {}
  ): void {
    this.info('Customer interaction logged', {
      ...context,
      customer_id: customerId,
      operation: 'customer_interaction',
      metadata: {
        interaction_type: interactionType,
        success,
        ...context.metadata
      }
    });
  }

  /**
   * Log change stream event
   */
  changeStreamEvent(
    collection: string,
    operationType: string,
    documentId: string,
    context: LogContext = {}
  ): void {
    this.info('Change stream event processed', {
      ...context,
      operation: 'change_stream',
      metadata: {
        collection,
        operation_type: operationType,
        document_id: documentId,
        ...context.metadata
      }
    });
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): StructuredLogger {
    const childLogger = new StructuredLogger();
    childLogger.logger = this.logger.child(context);
    childLogger.defaultContext = { ...this.defaultContext, ...context };
    return childLogger;
  }

  /**
   * Measure and log execution time
   */
  async measureTime<T>(
    operation: string,
    fn: () => Promise<T>,
    context: LogContext = {}
  ): Promise<T> {
    const startTime = Date.now();
    const traceId = this.getTraceId();
    
    this.debug(`Starting ${operation}`, {
      ...context,
      trace_id: traceId,
      operation
    });

    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      
      this.info(`Completed ${operation}`, {
        ...context,
        trace_id: traceId,
        operation,
        duration_ms: duration,
        metadata: {
          ...context.metadata,
          success: true
        }
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.error(`Failed ${operation}`, {
        ...context,
        trace_id: traceId,
        operation,
        duration_ms: duration,
        metadata: {
          ...context.metadata,
          success: false
        }
      }, error as Error);

      throw error;
    }
  }

  /**
   * Create a performance timer
   */
  startTimer(operation: string, context: LogContext = {}): () => void {
    const startTime = Date.now();
    const traceId = this.getTraceId();

    this.debug(`Timer started for ${operation}`, {
      ...context,
      trace_id: traceId,
      operation
    });

    return () => {
      const duration = Date.now() - startTime;
      this.info(`Timer completed for ${operation}`, {
        ...context,
        trace_id: traceId,
        operation,
        duration_ms: duration
      });
    };
  }
}

// Global logger instance
export const logger = new StructuredLogger({
  level: (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO,
  service_name: process.env.SERVICE_NAME || 'mongodb-ai-agent',
  environment: process.env.NODE_ENV || 'development',
  version: process.env.npm_package_version || '1.0.0'
});

// Export types and classes
export { StructuredLogger };
export default logger;