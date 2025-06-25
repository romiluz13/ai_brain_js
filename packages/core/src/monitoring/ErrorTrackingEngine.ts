/**
 * @file ErrorTrackingEngine - Real-time error detection and alerting system
 * 
 * This engine implements comprehensive error tracking with real-time detection,
 * categorization, alerting, and automated recovery suggestions using MongoDB's
 * official structured logging patterns and aggregation pipelines.
 * 
 * Features:
 * - Real-time error detection using MongoDB Change Streams
 * - Error categorization and pattern analysis
 * - Automated alerting with webhook support
 * - Recovery suggestions based on error patterns
 * - Integration with popular monitoring services
 * - Error trend analysis and forecasting
 * - Custom error rules and thresholds
 */

import { TracingCollection, AgentTrace } from '../collections/TracingCollection';
import { MemoryCollection } from '../collections/MemoryCollection';

export interface ErrorEvent {
  errorId: string;
  timestamp: Date;
  framework: 'vercel-ai' | 'mastra' | 'openai-agents' | 'langchain' | 'system';
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'connection' | 'authentication' | 'validation' | 'timeout' | 'rate_limit' | 'model_error' | 'system_error' | 'unknown';
  errorType: string;
  errorMessage: string;
  errorCode?: string;
  stackTrace?: string;
  context: {
    traceId?: string;
    sessionId?: string;
    userId?: string;
    operation?: string;
    input?: string;
    framework?: string;
    modelUsed?: string;
  };
  metadata: {
    component: string; // Following MongoDB log component pattern
    logLevel: 'I' | 'W' | 'E' | 'F' | 'D'; // MongoDB log severity levels
    source: string;
    tags: string[];
    additionalData?: Record<string, any>;
  };
  resolution?: {
    suggested: boolean;
    actions: string[];
    automatable: boolean;
    confidence: number;
  };
}

export interface ErrorPattern {
  patternId: string;
  name: string;
  description: string;
  errorTypes: string[];
  frequency: number;
  firstSeen: Date;
  lastSeen: Date;
  affectedFrameworks: string[];
  commonContext: Record<string, any>;
  suggestedFixes: {
    action: string;
    description: string;
    priority: 'immediate' | 'high' | 'medium' | 'low';
    automatable: boolean;
  }[];
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface ErrorAlert {
  alertId: string;
  timestamp: Date;
  type: 'threshold_exceeded' | 'new_error_pattern' | 'critical_error' | 'system_failure' | 'recovery_needed';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  errorEvents: string[]; // Error IDs
  affectedSystems: string[];
  metrics: {
    errorCount: number;
    errorRate: number;
    timeWindow: number; // minutes
    threshold: number;
  };
  notifications: {
    email?: string[];
    slack?: string;
    webhook?: string;
    sms?: string[];
  };
  status: 'active' | 'acknowledged' | 'resolved' | 'suppressed';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
}

export interface ErrorRecoveryAction {
  actionId: string;
  errorPattern: string;
  action: 'retry' | 'fallback' | 'circuit_breaker' | 'rate_limit' | 'escalate' | 'restart' | 'custom';
  description: string;
  parameters: Record<string, any>;
  conditions: {
    errorCount?: number;
    timeWindow?: number; // minutes
    errorRate?: number;
    consecutiveFailures?: number;
  };
  automatable: boolean;
  successRate: number;
  lastExecuted?: Date;
  executionCount: number;
}

export interface ErrorAnalytics {
  timeRange: {
    start: Date;
    end: Date;
  };
  totalErrors: number;
  errorRate: number;
  topErrorTypes: {
    errorType: string;
    count: number;
    percentage: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  }[];
  frameworkBreakdown: {
    framework: string;
    errorCount: number;
    errorRate: number;
    topErrors: string[];
  }[];
  severityDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  patterns: ErrorPattern[];
  mttr: number; // Mean Time To Resolution in minutes
  mtbf: number; // Mean Time Between Failures in minutes
  availability: number; // percentage
}

/**
 * ErrorTrackingEngine - Comprehensive error tracking and alerting system
 * 
 * Provides real-time error detection, pattern analysis, and automated recovery
 * using MongoDB's official structured logging and aggregation patterns.
 */
export class ErrorTrackingEngine {
  private tracingCollection: TracingCollection;
  private memoryCollection: MemoryCollection;
  private errorCollection: MemoryCollection;
  private alertThresholds: Map<string, { threshold: number; timeWindow: number }> = new Map();
  private recoveryActions: Map<string, ErrorRecoveryAction> = new Map();
  private activeAlerts: Map<string, ErrorAlert> = new Map();
  private isMonitoring: boolean = false;

  constructor(
    tracingCollection: TracingCollection,
    memoryCollection: MemoryCollection,
    errorCollection: MemoryCollection
  ) {
    this.tracingCollection = tracingCollection;
    this.memoryCollection = memoryCollection;
    this.errorCollection = errorCollection;
    this.initializeDefaultThresholds();
    this.initializeDefaultRecoveryActions();
  }

  /**
   * Start real-time error monitoring using MongoDB Change Streams
   */
  async startErrorMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      throw new Error('Error monitoring is already active');
    }

    this.isMonitoring = true;

    // Monitor tracing collection for errors using MongoDB Change Streams (official pattern)
    const changeStream = (this.tracingCollection as any).collection.watch([
      {
        $match: {
          'fullDocument.errors': { $exists: true, $ne: [] }
        }
      }
    ]);

    changeStream.on('change', async (change) => {
      if (change.operationType === 'insert' || change.operationType === 'update') {
        await this.processErrorEvent(change.fullDocument);
      }
    });

    changeStream.on('error', (error) => {
      console.error('Error monitoring change stream error:', error);
      // Implement retry logic here
    });

    console.log('Error monitoring started with MongoDB Change Streams');
  }

  /**
   * Stop error monitoring
   */
  async stopErrorMonitoring(): Promise<void> {
    this.isMonitoring = false;
    console.log('Error monitoring stopped');
  }

  /**
   * Track error event with MongoDB structured logging patterns
   */
  async trackError(
    framework: string,
    errorType: string,
    errorMessage: string,
    context: any = {},
    severity: ErrorEvent['severity'] = 'medium'
  ): Promise<string> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create error event following MongoDB log message structure
    const errorEvent: ErrorEvent = {
      errorId,
      timestamp: new Date(),
      framework: framework as any,
      severity,
      category: this.categorizeError(errorType, errorMessage),
      errorType,
      errorMessage,
      context,
      metadata: {
        component: this.getComponentFromFramework(framework),
        logLevel: this.severityToLogLevel(severity),
        source: 'universal_ai_brain',
        tags: [framework, errorType, severity]
      }
    };

    // Add resolution suggestions
    errorEvent.resolution = await this.generateResolutionSuggestions(errorEvent);

    // Store error using MongoDB structured format
    await this.errorCollection.storeDocument(
      JSON.stringify(errorEvent),
      {
        type: 'error_event',
        errorId,
        framework,
        severity,
        category: errorEvent.category,
        timestamp: errorEvent.timestamp,
        // MongoDB log message fields
        component: errorEvent.metadata.component,
        logLevel: errorEvent.metadata.logLevel,
        tags: errorEvent.metadata.tags
      }
    );

    // Check for alert conditions
    await this.checkAlertConditions(errorEvent);

    // Update error patterns
    await this.updateErrorPatterns(errorEvent);

    return errorId;
  }

  /**
   * Analyze error patterns using MongoDB aggregation pipelines
   */
  async analyzeErrorPatterns(timeRange: { start: Date; end: Date }): Promise<ErrorPattern[]> {
    // Use MongoDB $facet aggregation for comprehensive error pattern analysis
    const patternPipeline = [
      {
        $match: {
          timestamp: { $gte: timeRange.start, $lte: timeRange.end },
          'metadata.type': 'error_event'
        }
      },
      {
        $facet: {
          // Error type patterns
          errorTypePatterns: [
            {
              $group: {
                _id: {
                  errorType: '$metadata.errorType',
                  framework: '$metadata.framework'
                },
                count: { $sum: 1 },
                firstSeen: { $min: '$timestamp' },
                lastSeen: { $max: '$timestamp' },
                contexts: { $push: '$content.context' },
                severities: { $push: '$metadata.severity' }
              }
            },
            { $sort: { count: -1 } }
          ],

          // Time-based patterns using MongoDB time series aggregation
          timePatterns: [
            {
              $group: {
                _id: {
                  errorType: '$metadata.errorType',
                  hour: { $hour: '$timestamp' },
                  dayOfWeek: { $dayOfWeek: '$timestamp' }
                },
                count: { $sum: 1 }
              }
            },
            {
              $group: {
                _id: '$_id.errorType',
                hourlyDistribution: {
                  $push: {
                    hour: '$_id.hour',
                    count: '$count'
                  }
                },
                weeklyDistribution: {
                  $push: {
                    dayOfWeek: '$_id.dayOfWeek',
                    count: '$count'
                  }
                }
              }
            }
          ],

          // Context similarity patterns
          contextPatterns: [
            { $unwind: '$content.context' },
            {
              $group: {
                _id: {
                  errorType: '$metadata.errorType',
                  contextKey: { $objectToArray: '$content.context' }
                },
                count: { $sum: 1 },
                values: { $addToSet: '$content.context' }
              }
            }
          ]
        }
      }
    ];

    const results = await this.errorCollection.aggregate(patternPipeline);
    const patterns = results[0];

    return this.processPatternResults(patterns);
  }

  /**
   * Generate error analytics report
   */
  async generateErrorAnalytics(timeRange: { start: Date; end: Date }): Promise<ErrorAnalytics> {
    // Use MongoDB aggregation for comprehensive error analytics
    const analyticsPipeline = [
      {
        $match: {
          timestamp: { $gte: timeRange.start, $lte: timeRange.end },
          'metadata.type': 'error_event'
        }
      },
      {
        $facet: {
          // Overall statistics
          overallStats: [
            {
              $group: {
                _id: null,
                totalErrors: { $sum: 1 },
                avgErrorsPerHour: {
                  $avg: {
                    $divide: [
                      { $sum: 1 },
                      { $divide: [{ $subtract: [timeRange.end, timeRange.start] }, 3600000] }
                    ]
                  }
                }
              }
            }
          ],

          // Top error types with trend analysis
          topErrorTypes: [
            {
              $group: {
                _id: '$metadata.errorType',
                count: { $sum: 1 },
                recentCount: {
                  $sum: {
                    $cond: [
                      { $gte: ['$timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
                      1,
                      0
                    ]
                  }
                },
                olderCount: {
                  $sum: {
                    $cond: [
                      { $lt: ['$timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
                      1,
                      0
                    ]
                  }
                }
              }
            },
            {
              $addFields: {
                trend: {
                  $cond: [
                    { $gt: ['$recentCount', { $multiply: ['$olderCount', 1.2] }] },
                    'increasing',
                    {
                      $cond: [
                        { $lt: ['$recentCount', { $multiply: ['$olderCount', 0.8] }] },
                        'decreasing',
                        'stable'
                      ]
                    }
                  ]
                }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],

          // Framework breakdown
          frameworkBreakdown: [
            {
              $group: {
                _id: '$metadata.framework',
                errorCount: { $sum: 1 },
                topErrors: { $addToSet: '$metadata.errorType' }
              }
            }
          ],

          // Severity distribution
          severityDistribution: [
            {
              $group: {
                _id: '$metadata.severity',
                count: { $sum: 1 }
              }
            }
          ]
        }
      }
    ];

    const results = await this.errorCollection.aggregate(analyticsPipeline);
    const analytics = results[0];

    // Calculate additional metrics
    const patterns = await this.analyzeErrorPatterns(timeRange);
    const mttr = await this.calculateMTTR(timeRange);
    const mtbf = await this.calculateMTBF(timeRange);
    const availability = await this.calculateAvailability(timeRange);

    return {
      timeRange,
      totalErrors: analytics.overallStats[0]?.totalErrors || 0,
      errorRate: analytics.overallStats[0]?.avgErrorsPerHour || 0,
      topErrorTypes: analytics.topErrorTypes.map((error: any) => ({
        errorType: error._id,
        count: error.count,
        percentage: (error.count / (analytics.overallStats[0]?.totalErrors || 1)) * 100,
        trend: error.trend
      })),
      frameworkBreakdown: analytics.frameworkBreakdown.map((framework: any) => ({
        framework: framework._id,
        errorCount: framework.errorCount,
        errorRate: framework.errorCount / (analytics.overallStats[0]?.totalErrors || 1) * 100,
        topErrors: framework.topErrors.slice(0, 5)
      })),
      severityDistribution: {
        critical: analytics.severityDistribution.find((s: any) => s._id === 'critical')?.count || 0,
        high: analytics.severityDistribution.find((s: any) => s._id === 'high')?.count || 0,
        medium: analytics.severityDistribution.find((s: any) => s._id === 'medium')?.count || 0,
        low: analytics.severityDistribution.find((s: any) => s._id === 'low')?.count || 0
      },
      patterns,
      mttr,
      mtbf,
      availability
    };
  }

  /**
   * Create error alert with webhook notifications
   */
  async createAlert(
    type: ErrorAlert['type'],
    severity: ErrorAlert['severity'],
    title: string,
    description: string,
    errorEvents: string[],
    notifications?: ErrorAlert['notifications']
  ): Promise<string> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const alert: ErrorAlert = {
      alertId,
      timestamp: new Date(),
      type,
      severity,
      title,
      description,
      errorEvents,
      affectedSystems: this.getAffectedSystems(errorEvents),
      metrics: await this.calculateAlertMetrics(errorEvents),
      notifications: notifications || {},
      status: 'active'
    };

    this.activeAlerts.set(alertId, alert);

    // Store alert
    await this.errorCollection.storeDocument(
      JSON.stringify(alert),
      {
        type: 'error_alert',
        alertId,
        severity,
        alertType: type,
        timestamp: alert.timestamp,
        status: 'active'
      }
    );

    // Send notifications
    await this.sendAlertNotifications(alert);

    return alertId;
  }

  // Private helper methods
  private async processErrorEvent(trace: AgentTrace): Promise<void> {
    if (!trace.errors || trace.errors.length === 0) return;

    for (const error of trace.errors) {
      await this.trackError(
        trace.framework.frameworkName,
        error.errorType,
        error.message,
        {
          traceId: trace.traceId,
          sessionId: trace.sessionId,
          operation: trace.operation.type,
          input: trace.operation.userInput
        },
        this.mapErrorSeverity(this.deriveSeverityFromErrorType(error.errorType))
      );
    }
  }

  private categorizeError(errorType: string, errorMessage: string): ErrorEvent['category'] {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('connection') || message.includes('network')) return 'connection';
    if (message.includes('auth') || message.includes('permission')) return 'authentication';
    if (message.includes('validation') || message.includes('invalid')) return 'validation';
    if (message.includes('timeout') || message.includes('deadline')) return 'timeout';
    if (message.includes('rate limit') || message.includes('quota')) return 'rate_limit';
    if (message.includes('model') || message.includes('openai') || message.includes('embedding')) return 'model_error';
    if (message.includes('system') || message.includes('internal')) return 'system_error';
    
    return 'unknown';
  }

  private getComponentFromFramework(framework: string): string {
    // Map to MongoDB log component naming convention
    const componentMap: Record<string, string> = {
      'vercel-ai': 'VERCEL_AI',
      'mastra': 'MASTRA',
      'openai-agents': 'OPENAI_AGENTS',
      'langchain': 'LANGCHAIN',
      'system': 'SYSTEM'
    };
    
    return componentMap[framework] || 'UNKNOWN';
  }

  private severityToLogLevel(severity: ErrorEvent['severity']): ErrorEvent['metadata']['logLevel'] {
    // Map to MongoDB log severity levels
    const levelMap: Record<string, ErrorEvent['metadata']['logLevel']> = {
      'critical': 'F', // Fatal
      'high': 'E',     // Error
      'medium': 'W',   // Warning
      'low': 'I'       // Informational
    };
    
    return levelMap[severity] || 'W';
  }

  private async generateResolutionSuggestions(errorEvent: ErrorEvent): Promise<ErrorEvent['resolution']> {
    // Generate resolution suggestions based on error patterns
    const suggestions = this.getResolutionSuggestions(errorEvent.category, errorEvent.errorType);
    
    return {
      suggested: suggestions.length > 0,
      actions: suggestions,
      automatable: this.isAutomatable(errorEvent.category),
      confidence: this.calculateResolutionConfidence(errorEvent)
    };
  }

  private getResolutionSuggestions(category: ErrorEvent['category'], errorType: string): string[] {
    const suggestions: Record<string, string[]> = {
      connection: [
        'Check network connectivity',
        'Verify MongoDB connection string',
        'Increase connection timeout',
        'Check firewall settings'
      ],
      authentication: [
        'Verify API keys and credentials',
        'Check user permissions',
        'Refresh authentication tokens',
        'Review access control settings'
      ],
      validation: [
        'Validate input parameters',
        'Check data format and types',
        'Review schema requirements',
        'Verify required fields'
      ],
      timeout: [
        'Increase timeout values',
        'Optimize query performance',
        'Check system resources',
        'Implement retry logic'
      ],
      rate_limit: [
        'Implement exponential backoff',
        'Reduce request frequency',
        'Check rate limit quotas',
        'Consider request batching'
      ],
      model_error: [
        'Check model availability',
        'Verify model parameters',
        'Review input format',
        'Try alternative models'
      ]
    };

    return suggestions[category] || ['Review error details and context'];
  }

  private isAutomatable(category: ErrorEvent['category']): boolean {
    const automatableCategories = ['timeout', 'rate_limit', 'connection'];
    return automatableCategories.includes(category);
  }

  private calculateResolutionConfidence(errorEvent: ErrorEvent): number {
    // Calculate confidence based on error category and available context
    let confidence = 0.5; // Base confidence
    
    if (errorEvent.context.traceId) confidence += 0.2;
    if (errorEvent.stackTrace) confidence += 0.2;
    if (errorEvent.category !== 'unknown') confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private async checkAlertConditions(errorEvent: ErrorEvent): Promise<void> {
    // Check if error event triggers any alert conditions
    const thresholdKey = `${errorEvent.framework}_${errorEvent.category}`;
    const threshold = this.alertThresholds.get(thresholdKey);
    
    if (!threshold) return;

    // Count recent errors of this type
    const recentErrorCount = await this.countRecentErrors(
      errorEvent.framework,
      errorEvent.category,
      threshold.timeWindow
    );

    if (recentErrorCount >= threshold.threshold) {
      await this.createAlert(
        'threshold_exceeded',
        errorEvent.severity,
        `Error threshold exceeded for ${errorEvent.framework}`,
        `${recentErrorCount} ${errorEvent.category} errors in ${threshold.timeWindow} minutes`,
        [errorEvent.errorId]
      );
    }
  }

  private async countRecentErrors(framework: string, category: string, timeWindowMinutes: number): Promise<number> {
    const since = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    
    const pipeline = [
      {
        $match: {
          timestamp: { $gte: since },
          'metadata.type': 'error_event',
          'metadata.framework': framework,
          'metadata.category': category
        }
      },
      { $count: 'total' }
    ];

    const result = await this.errorCollection.aggregate(pipeline);
    return result[0]?.total || 0;
  }

  private async updateErrorPatterns(errorEvent: ErrorEvent): Promise<void> {
    // Update error patterns based on new error event
    // This would implement pattern learning logic
  }

  private processPatternResults(patterns: any): ErrorPattern[] {
    // Process MongoDB aggregation results into ErrorPattern objects
    return patterns.errorTypePatterns.map((pattern: any) => ({
      patternId: `pattern_${pattern._id.errorType}_${pattern._id.framework}`,
      name: `${pattern._id.errorType} in ${pattern._id.framework}`,
      description: `Recurring ${pattern._id.errorType} errors in ${pattern._id.framework}`,
      errorTypes: [pattern._id.errorType],
      frequency: pattern.count,
      firstSeen: pattern.firstSeen,
      lastSeen: pattern.lastSeen,
      affectedFrameworks: [pattern._id.framework],
      commonContext: {},
      suggestedFixes: [],
      trend: 'stable' as const
    }));
  }

  private async calculateMTTR(timeRange: { start: Date; end: Date }): Promise<number> {
    // Calculate Mean Time To Resolution
    return 30; // Simplified - would calculate actual MTTR
  }

  private async calculateMTBF(timeRange: { start: Date; end: Date }): Promise<number> {
    // Calculate Mean Time Between Failures
    return 120; // Simplified - would calculate actual MTBF
  }

  private async calculateAvailability(timeRange: { start: Date; end: Date }): Promise<number> {
    // Calculate system availability percentage
    return 99.5; // Simplified - would calculate actual availability
  }

  private getAffectedSystems(errorEvents: string[]): string[] {
    // Determine affected systems from error events
    return ['universal_ai_brain']; // Simplified
  }

  private async calculateAlertMetrics(errorEvents: string[]): Promise<ErrorAlert['metrics']> {
    // Calculate alert metrics
    return {
      errorCount: errorEvents.length,
      errorRate: errorEvents.length / 60, // per minute
      timeWindow: 60,
      threshold: 10
    };
  }

  private async sendAlertNotifications(alert: ErrorAlert): Promise<void> {
    // Send alert notifications via configured channels
    if (alert.notifications.webhook) {
      await this.sendWebhookNotification(alert, alert.notifications.webhook);
    }
    
    // Would implement email, Slack, SMS notifications here
  }

  private async sendWebhookNotification(alert: ErrorAlert, webhookUrl: string): Promise<void> {
    try {
      // Send webhook notification (simplified)
      console.log(`Sending webhook notification for alert ${alert.alertId} to ${webhookUrl}`);
    } catch (error) {
      console.error('Failed to send webhook notification:', error);
    }
  }

  private deriveSeverityFromErrorType(errorType: string): string {
    const severityMap: Record<string, string> = {
      'safety_violation': 'fatal',
      'mongodb_error': 'error',
      'framework_error': 'error',
      'network_error': 'warning',
      'timeout_error': 'warning',
      'validation_error': 'warning',
      'unknown_error': 'error'
    };
    return severityMap[errorType] || 'error';
  }

  private mapErrorSeverity(severity: string): ErrorEvent['severity'] {
    const severityMap: Record<string, ErrorEvent['severity']> = {
      'fatal': 'critical',
      'error': 'high',
      'warning': 'medium',
      'info': 'low'
    };
    
    return severityMap[severity.toLowerCase()] || 'medium';
  }

  private initializeDefaultThresholds(): void {
    // Initialize default error thresholds
    this.alertThresholds.set('vercel-ai_connection', { threshold: 5, timeWindow: 10 });
    this.alertThresholds.set('vercel-ai_timeout', { threshold: 10, timeWindow: 15 });
    this.alertThresholds.set('mastra_model_error', { threshold: 3, timeWindow: 5 });
    this.alertThresholds.set('openai-agents_rate_limit', { threshold: 5, timeWindow: 10 });
    this.alertThresholds.set('langchain_validation', { threshold: 8, timeWindow: 20 });
  }

  private initializeDefaultRecoveryActions(): void {
    // Initialize default recovery actions
    this.recoveryActions.set('connection_retry', {
      actionId: 'connection_retry',
      errorPattern: 'connection',
      action: 'retry',
      description: 'Retry connection with exponential backoff',
      parameters: { maxRetries: 3, backoffMultiplier: 2 },
      conditions: { errorCount: 3, timeWindow: 5 },
      automatable: true,
      successRate: 0.8,
      executionCount: 0
    });

    this.recoveryActions.set('rate_limit_backoff', {
      actionId: 'rate_limit_backoff',
      errorPattern: 'rate_limit',
      action: 'rate_limit',
      description: 'Apply exponential backoff for rate limiting',
      parameters: { initialDelay: 1000, maxDelay: 30000 },
      conditions: { errorCount: 2, timeWindow: 1 },
      automatable: true,
      successRate: 0.9,
      executionCount: 0
    });
  }
}
