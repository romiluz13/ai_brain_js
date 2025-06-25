/**
 * @file CostMonitoringEngine - Comprehensive cost tracking and optimization system
 *
 * This engine tracks API costs, token usage, embedding costs, and MongoDB operations
 * with budget alerts, cost optimization suggestions, and detailed cost breakdown by
 * framework and operation using MongoDB's official cost monitoring patterns.
 *
 * Features:
 * - Real-time cost tracking using MongoDB time series collections
 * - Budget alerts and cost threshold monitoring
 * - Cost optimization suggestions based on usage patterns
 * - Framework-specific cost analysis and comparison
 * - Token usage efficiency tracking and optimization
 * - MongoDB Atlas cost integration and monitoring
 * - Predictive cost forecasting and budget planning
 */

import { TracingCollection, AgentTrace } from '../collections/TracingCollection';
import { MemoryCollection } from '../collections/MemoryCollection';

export interface CostEvent {
  costId: string;
  timestamp: Date;
  framework: 'vercel-ai' | 'mastra' | 'openai-agents' | 'langchain' | 'system';
  operation: {
    type: 'chat_completion' | 'embedding' | 'vector_search' | 'mongodb_operation' | 'context_retrieval';
    operationId: string;
    traceId?: string;
  };
  costs: {
    model: number;           // Model API costs (OpenAI, Anthropic, etc.)
    embedding: number;       // Embedding API costs
    mongodb: number;         // MongoDB Atlas costs
    vectorSearch: number;    // Vector search costs
    storage: number;         // Storage costs
    compute: number;         // Compute costs
    network: number;         // Network/bandwidth costs
    total: number;           // Total cost
  };
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    embeddingDimensions?: number;
    documentsProcessed: number;
    vectorSearchQueries: number;
    mongodbOperations: number;
  };
  pricing: {
    modelPricePerToken: number;
    embeddingPricePerToken: number;
    mongodbPricePerOperation: number;
    vectorSearchPricePerQuery: number;
  };
  metadata: {
    modelUsed: string;
    region?: string;
    tier?: string;
    userId?: string;
    sessionId?: string;
    tags: string[];
  };
}

export interface CostBudget {
  budgetId: string;
  name: string;
  description: string;
  scope: {
    frameworks?: string[];
    operations?: string[];
    users?: string[];
    timeRange: 'daily' | 'weekly' | 'monthly' | 'yearly';
  };
  limits: {
    totalCost: number;
    modelCost?: number;
    embeddingCost?: number;
    mongodbCost?: number;
    tokenUsage?: number;
  };
  alerts: {
    thresholds: number[]; // Percentage thresholds (e.g., [50, 75, 90, 100])
    notifications: {
      email?: string[];
      slack?: string;
      webhook?: string;
    };
  };
  currentSpend: number;
  remainingBudget: number;
  status: 'active' | 'exceeded' | 'paused';
  createdAt: Date;
  lastUpdated: Date;
}

export interface CostOptimization {
  optimizationId: string;
  timestamp: Date;
  type: 'model_selection' | 'token_efficiency' | 'caching' | 'batch_processing' | 'tier_optimization';
  framework: string;
  currentCost: number;
  optimizedCost: number;
  potentialSavings: number;
  savingsPercentage: number;
  recommendation: {
    title: string;
    description: string;
    action: string;
    implementation: 'automatic' | 'manual' | 'configuration';
    effort: 'low' | 'medium' | 'high';
    confidence: number;
  };
  impact: {
    costReduction: number;
    performanceImpact: 'positive' | 'neutral' | 'negative';
    riskLevel: 'low' | 'medium' | 'high';
  };
  status: 'pending' | 'implemented' | 'rejected' | 'expired';
}

export interface CostAnalytics {
  timeRange: {
    start: Date;
    end: Date;
  };
  totalCost: number;
  costBreakdown: {
    model: number;
    embedding: number;
    mongodb: number;
    vectorSearch: number;
    storage: number;
    compute: number;
    network: number;
  };
  frameworkCosts: {
    framework: string;
    cost: number;
    percentage: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    efficiency: number; // Cost per successful operation
  }[];
  operationCosts: {
    operation: string;
    cost: number;
    count: number;
    averageCost: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  }[];
  tokenEfficiency: {
    totalTokens: number;
    costPerToken: number;
    efficiency: number; // Successful operations per token
    wastedTokens: number; // Tokens used in failed operations
  };
  trends: {
    dailyCosts: { date: Date; cost: number }[];
    hourlyCosts: { hour: number; cost: number }[];
    costGrowthRate: number; // Percentage per day
  };
  budgetStatus: {
    totalBudget: number;
    spentAmount: number;
    remainingBudget: number;
    burnRate: number; // Cost per day
    projectedEndDate: Date;
  };
  optimizations: CostOptimization[];
}

export interface CostAlert {
  alertId: string;
  timestamp: Date;
  type: 'budget_threshold' | 'cost_spike' | 'efficiency_drop' | 'optimization_opportunity';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  budgetId?: string;
  currentCost: number;
  threshold?: number;
  recommendations: string[];
  status: 'active' | 'acknowledged' | 'resolved';
}

/**
 * CostMonitoringEngine - Comprehensive cost tracking and optimization system
 *
 * Provides real-time cost monitoring, budget management, and optimization
 * recommendations using MongoDB's official cost monitoring patterns.
 */
export class CostMonitoringEngine {
  private tracingCollection: TracingCollection;
  private memoryCollection: MemoryCollection;
  private costCollection: MemoryCollection; // Time series collection for cost data
  private budgets: Map<string, CostBudget> = new Map();
  private activeAlerts: Map<string, CostAlert> = new Map();
  private isMonitoring: boolean = false;

  constructor(
    tracingCollection: TracingCollection,
    memoryCollection: MemoryCollection,
    costCollection: MemoryCollection
  ) {
    this.tracingCollection = tracingCollection;
    this.memoryCollection = memoryCollection;
    this.costCollection = costCollection;
    this.initializeDefaultBudgets();
  }

  /**
   * Start real-time cost monitoring using MongoDB Change Streams
   */
  async startCostMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      throw new Error('Cost monitoring is already active');
    }

    this.isMonitoring = true;

    // Monitor tracing collection for cost events using MongoDB Change Streams
    const changeStream = (this.tracingCollection as any).collection.watch([
      {
        $match: {
          'fullDocument.cost': { $exists: true }
        }
      }
    ]);

    changeStream.on('change', async (change) => {
      if (change.operationType === 'insert' || change.operationType === 'update') {
        await this.processCostEvent(change.fullDocument);
      }
    });

    changeStream.on('error', (error) => {
      console.error('Cost monitoring change stream error:', error);
    });

    console.log('Cost monitoring started with MongoDB Change Streams');
  }

  /**
   * Stop cost monitoring
   */
  async stopCostMonitoring(): Promise<void> {
    this.isMonitoring = false;
    console.log('Cost monitoring stopped');
  }

  /**
   * Track cost event with MongoDB time series patterns
   */
  async trackCost(
    framework: string,
    operation: CostEvent['operation'],
    costs: CostEvent['costs'],
    usage: CostEvent['usage'],
    pricing: CostEvent['pricing'],
    metadata: CostEvent['metadata'] = { modelUsed: 'unknown', tags: [] }
  ): Promise<string> {
    const costId = `cost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const costEvent: CostEvent = {
      costId,
      timestamp: new Date(),
      framework: framework as any,
      operation,
      costs,
      usage,
      pricing,
      metadata
    };

    // Store cost event using MongoDB time series collection pattern
    await this.costCollection.storeDocument(
      JSON.stringify(costEvent),
      {
        type: 'cost_event',
        costId,
        framework,
        operationType: operation.type,
        timestamp: costEvent.timestamp,
        totalCost: costs.total,
        // Time series metadata for efficient querying
        modelUsed: metadata.modelUsed,
        region: metadata.region,
        tier: metadata.tier,
        userId: metadata.userId
      }
    );

    // Check budget alerts
    await this.checkBudgetAlerts(costEvent);

    // Check for cost optimization opportunities
    await this.checkOptimizationOpportunities(costEvent);

    return costId;
  }

  /**
   * Create cost budget with MongoDB validation
   */
  async createBudget(budget: Omit<CostBudget, 'budgetId' | 'currentSpend' | 'remainingBudget' | 'createdAt' | 'lastUpdated'>): Promise<string> {
    const budgetId = `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const costBudget: CostBudget = {
      ...budget,
      budgetId,
      currentSpend: 0,
      remainingBudget: budget.limits.totalCost,
      createdAt: new Date(),
      lastUpdated: new Date()
    };

    this.budgets.set(budgetId, costBudget);

    // Store budget with MongoDB validation
    await this.memoryCollection.storeDocument(
      JSON.stringify(costBudget),
      {
        type: 'cost_budget',
        budgetId,
        name: budget.name,
        totalLimit: budget.limits.totalCost,
        timeRange: budget.scope.timeRange,
        status: 'active'
      }
    );

    return budgetId;
  }

  /**
   * Generate comprehensive cost analytics using MongoDB aggregation
   */
  async generateCostAnalytics(timeRange: { start: Date; end: Date }): Promise<CostAnalytics> {
    // Use MongoDB $facet aggregation for comprehensive cost analysis (official pattern)
    const costPipeline = [
      {
        $match: {
          timestamp: { $gte: timeRange.start, $lte: timeRange.end },
          'metadata.type': 'cost_event'
        }
      },
      {
        $facet: {
          // Overall cost statistics
          overallCosts: [
            {
              $group: {
                _id: null,
                totalCost: { $sum: '$metadata.totalCost' },
                modelCost: { $sum: '$content.costs.model' },
                embeddingCost: { $sum: '$content.costs.embedding' },
                mongodbCost: { $sum: '$content.costs.mongodb' },
                vectorSearchCost: { $sum: '$content.costs.vectorSearch' },
                storageCost: { $sum: '$content.costs.storage' },
                computeCost: { $sum: '$content.costs.compute' },
                networkCost: { $sum: '$content.costs.network' },
                totalTokens: { $sum: '$content.usage.totalTokens' },
                totalOperations: { $sum: 1 }
              }
            }
          ],

          // Framework cost breakdown with efficiency metrics
          frameworkCosts: [
            {
              $group: {
                _id: '$metadata.framework',
                cost: { $sum: '$metadata.totalCost' },
                operationCount: { $sum: 1 },
                successfulOperations: {
                  $sum: {
                    $cond: [{ $eq: ['$content.operation.status', 'success'] }, 1, 0]
                  }
                },
                recentCost: {
                  $sum: {
                    $cond: [
                      { $gte: ['$timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
                      '$metadata.totalCost',
                      0
                    ]
                  }
                },
                olderCost: {
                  $sum: {
                    $cond: [
                      { $lt: ['$timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
                      '$metadata.totalCost',
                      0
                    ]
                  }
                }
              }
            },
            {
              $addFields: {
                efficiency: { $divide: ['$successfulOperations', '$cost'] },
                trend: {
                  $cond: [
                    { $gt: ['$recentCost', { $multiply: ['$olderCost', 1.2] }] },
                    'increasing',
                    {
                      $cond: [
                        { $lt: ['$recentCost', { $multiply: ['$olderCost', 0.8] }] },
                        'decreasing',
                        'stable'
                      ]
                    }
                  ]
                }
              }
            },
            { $sort: { cost: -1 } }
          ],

          // Operation cost analysis
          operationCosts: [
            {
              $group: {
                _id: '$metadata.operationType',
                cost: { $sum: '$metadata.totalCost' },
                count: { $sum: 1 },
                avgCost: { $avg: '$metadata.totalCost' },
                recentAvgCost: {
                  $avg: {
                    $cond: [
                      { $gte: ['$timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
                      '$metadata.totalCost',
                      null
                    ]
                  }
                },
                olderAvgCost: {
                  $avg: {
                    $cond: [
                      { $lt: ['$timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
                      '$metadata.totalCost',
                      null
                    ]
                  }
                }
              }
            },
            {
              $addFields: {
                trend: {
                  $cond: [
                    { $gt: ['$recentAvgCost', { $multiply: ['$olderAvgCost', 1.1] }] },
                    'increasing',
                    {
                      $cond: [
                        { $lt: ['$recentAvgCost', { $multiply: ['$olderAvgCost', 0.9] }] },
                        'decreasing',
                        'stable'
                      ]
                    }
                  ]
                }
              }
            },
            { $sort: { cost: -1 } }
          ],

          // Daily cost trends using MongoDB time series aggregation
          dailyTrends: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$timestamp'
                  }
                },
                cost: { $sum: '$metadata.totalCost' }
              }
            },
            { $sort: { '_id': 1 } }
          ],

          // Hourly cost patterns
          hourlyCosts: [
            {
              $group: {
                _id: { $hour: '$timestamp' },
                cost: { $avg: '$metadata.totalCost' }
              }
            },
            { $sort: { '_id': 1 } }
          ],

          // Token efficiency analysis
          tokenEfficiency: [
            {
              $group: {
                _id: null,
                totalTokens: { $sum: '$content.usage.totalTokens' },
                totalCost: { $sum: '$metadata.totalCost' },
                successfulOperations: {
                  $sum: {
                    $cond: [{ $eq: ['$content.operation.status', 'success'] }, 1, 0]
                  }
                },
                failedTokens: {
                  $sum: {
                    $cond: [
                      { $ne: ['$content.operation.status', 'success'] },
                      '$content.usage.totalTokens',
                      0
                    ]
                  }
                }
              }
            },
            {
              $addFields: {
                costPerToken: { $divide: ['$totalCost', '$totalTokens'] },
                efficiency: { $divide: ['$successfulOperations', '$totalTokens'] }
              }
            }
          ]
        }
      }
    ];

    const results = await this.costCollection.aggregate(costPipeline);
    const analytics = results[0];

    // Calculate additional metrics
    const overallCosts = analytics.overallCosts[0] || {};
    const totalCost = overallCosts.totalCost || 0;

    // Calculate cost growth rate
    const dailyTrends = analytics.dailyTrends || [];
    const costGrowthRate = this.calculateCostGrowthRate(dailyTrends);

    // Get budget status
    const budgetStatus = await this.calculateBudgetStatus(totalCost, timeRange);

    // Get optimization opportunities
    const optimizations = await this.getOptimizationOpportunities(timeRange);

    return {
      timeRange,
      totalCost,
      costBreakdown: {
        model: overallCosts.modelCost || 0,
        embedding: overallCosts.embeddingCost || 0,
        mongodb: overallCosts.mongodbCost || 0,
        vectorSearch: overallCosts.vectorSearchCost || 0,
        storage: overallCosts.storageCost || 0,
        compute: overallCosts.computeCost || 0,
        network: overallCosts.networkCost || 0
      },
      frameworkCosts: analytics.frameworkCosts.map((framework: any) => ({
        framework: framework._id,
        cost: framework.cost,
        percentage: totalCost > 0 ? (framework.cost / totalCost) * 100 : 0,
        trend: framework.trend,
        efficiency: framework.efficiency || 0
      })),
      operationCosts: analytics.operationCosts.map((operation: any) => ({
        operation: operation._id,
        cost: operation.cost,
        count: operation.count,
        averageCost: operation.avgCost,
        trend: operation.trend
      })),
      tokenEfficiency: {
        totalTokens: analytics.tokenEfficiency[0]?.totalTokens || 0,
        costPerToken: analytics.tokenEfficiency[0]?.costPerToken || 0,
        efficiency: analytics.tokenEfficiency[0]?.efficiency || 0,
        wastedTokens: analytics.tokenEfficiency[0]?.failedTokens || 0
      },
      trends: {
        dailyCosts: dailyTrends.map((day: any) => ({
          date: new Date(day._id),
          cost: day.cost
        })),
        hourlyCosts: analytics.hourlyCosts.map((hour: any) => ({
          hour: hour._id,
          cost: hour.cost
        })),
        costGrowthRate
      },
      budgetStatus,
      optimizations
    };
  }

  /**
   * Generate cost optimization recommendations
   */
  async generateOptimizationRecommendations(timeRange: { start: Date; end: Date }): Promise<CostOptimization[]> {
    const analytics = await this.generateCostAnalytics(timeRange);
    const optimizations: CostOptimization[] = [];

    // Model selection optimization
    if (analytics.costBreakdown.model > analytics.totalCost * 0.6) {
      optimizations.push({
        optimizationId: `opt_model_${Date.now()}`,
        timestamp: new Date(),
        type: 'model_selection',
        framework: 'all',
        currentCost: analytics.costBreakdown.model,
        optimizedCost: analytics.costBreakdown.model * 0.7,
        potentialSavings: analytics.costBreakdown.model * 0.3,
        savingsPercentage: 30,
        recommendation: {
          title: 'Optimize Model Selection',
          description: 'Consider using more cost-effective models for routine tasks',
          action: 'Switch to GPT-4o-mini for simple queries and use GPT-4o only for complex tasks',
          implementation: 'configuration',
          effort: 'medium',
          confidence: 0.8
        },
        impact: {
          costReduction: analytics.costBreakdown.model * 0.3,
          performanceImpact: 'neutral',
          riskLevel: 'low'
        },
        status: 'pending'
      });
    }

    // Token efficiency optimization
    if (analytics.tokenEfficiency.wastedTokens > analytics.tokenEfficiency.totalTokens * 0.1) {
      optimizations.push({
        optimizationId: `opt_tokens_${Date.now()}`,
        timestamp: new Date(),
        type: 'token_efficiency',
        framework: 'all',
        currentCost: analytics.tokenEfficiency.wastedTokens * analytics.tokenEfficiency.costPerToken,
        optimizedCost: 0,
        potentialSavings: analytics.tokenEfficiency.wastedTokens * analytics.tokenEfficiency.costPerToken,
        savingsPercentage: 10,
        recommendation: {
          title: 'Reduce Token Waste',
          description: 'Implement better error handling to reduce failed operations',
          action: 'Add retry logic and input validation to prevent failed API calls',
          implementation: 'manual',
          effort: 'medium',
          confidence: 0.9
        },
        impact: {
          costReduction: analytics.tokenEfficiency.wastedTokens * analytics.tokenEfficiency.costPerToken,
          performanceImpact: 'positive',
          riskLevel: 'low'
        },
        status: 'pending'
      });
    }

    // Caching optimization
    const repetitiveQueries = await this.detectRepetitiveQueries(timeRange);
    if (repetitiveQueries.potentialSavings > 0) {
      optimizations.push({
        optimizationId: `opt_cache_${Date.now()}`,
        timestamp: new Date(),
        type: 'caching',
        framework: 'all',
        currentCost: repetitiveQueries.currentCost,
        optimizedCost: repetitiveQueries.currentCost * 0.4,
        potentialSavings: repetitiveQueries.potentialSavings,
        savingsPercentage: 60,
        recommendation: {
          title: 'Implement Response Caching',
          description: 'Cache frequently repeated queries to reduce API calls',
          action: 'Implement semantic caching for similar queries',
          implementation: 'automatic',
          effort: 'low',
          confidence: 0.95
        },
        impact: {
          costReduction: repetitiveQueries.potentialSavings,
          performanceImpact: 'positive',
          riskLevel: 'low'
        },
        status: 'pending'
      });
    }

    return optimizations;
  }

  /**
   * Create cost alert
   */
  async createCostAlert(
    type: CostAlert['type'],
    severity: CostAlert['severity'],
    title: string,
    description: string,
    currentCost: number,
    threshold?: number,
    budgetId?: string
  ): Promise<string> {
    const alertId = `cost_alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const alert: CostAlert = {
      alertId,
      timestamp: new Date(),
      type,
      severity,
      title,
      description,
      budgetId,
      currentCost,
      threshold,
      recommendations: this.getCostAlertRecommendations(type, currentCost, threshold),
      status: 'active'
    };

    this.activeAlerts.set(alertId, alert);

    // Store alert
    await this.memoryCollection.storeDocument(
      JSON.stringify(alert),
      {
        type: 'cost_alert',
        alertId,
        severity,
        alertType: type,
        timestamp: alert.timestamp,
        currentCost,
        budgetId
      }
    );

    return alertId;
  }

  // Private helper methods
  private async processCostEvent(trace: AgentTrace): Promise<void> {
    if (!trace.cost) return;

    await this.trackCost(
      trace.framework.frameworkName,
      {
        type: trace.operation.type as any,
        operationId: trace.traceId,
        traceId: trace.traceId
      },
      {
        model: trace.cost.totalCost || 0,
        embedding: 0,
        mongodb: 0,
        vectorSearch: 0,
        storage: 0,
        compute: 0,
        network: 0,
        total: trace.cost.totalCost || 0
      },
      {
        inputTokens: trace.tokensUsed?.promptTokens || 0,
        outputTokens: trace.tokensUsed?.completionTokens || 0,
        totalTokens: trace.tokensUsed?.totalTokens || 0,
        documentsProcessed: trace.contextUsed?.length || 0,
        vectorSearchQueries: 1,
        mongodbOperations: 1
      },
      {
        modelPricePerToken: trace.cost.totalCost / (trace.tokensUsed?.totalTokens || 1),
        embeddingPricePerToken: 0.0001,
        mongodbPricePerOperation: 0.001,
        vectorSearchPricePerQuery: 0.01
      },
      {
        modelUsed: trace.framework.vercelAI?.model || trace.framework.openaiAgents?.assistantId || 'unknown',
        userId: trace.agentId.toString(),
        sessionId: trace.sessionId,
        tags: [trace.framework.frameworkName, trace.operation.type]
      }
    );
  }

  private async checkBudgetAlerts(costEvent: CostEvent): Promise<void> {
    for (const [budgetId, budget] of this.budgets) {
      if (!this.isCostEventInBudgetScope(costEvent, budget)) continue;

      // Update budget spend
      budget.currentSpend += costEvent.costs.total;
      budget.remainingBudget = budget.limits.totalCost - budget.currentSpend;
      budget.lastUpdated = new Date();

      // Check alert thresholds
      const spendPercentage = (budget.currentSpend / budget.limits.totalCost) * 100;

      for (const threshold of budget.alerts.thresholds) {
        if (spendPercentage >= threshold && spendPercentage < threshold + 5) {
          await this.createCostAlert(
            'budget_threshold',
            this.getSeverityFromThreshold(threshold),
            `Budget ${threshold}% threshold reached`,
            `Budget "${budget.name}" has reached ${threshold}% of its limit`,
            budget.currentSpend,
            threshold,
            budgetId
          );
        }
      }

      // Update budget status
      if (budget.currentSpend >= budget.limits.totalCost) {
        budget.status = 'exceeded';
      }

      this.budgets.set(budgetId, budget);
    }
  }

  private async checkOptimizationOpportunities(costEvent: CostEvent): Promise<void> {
    // Check for cost spikes
    const recentCosts = await this.getRecentCosts(costEvent.framework, 60); // Last hour
    const averageCost = recentCosts.reduce((sum, cost) => sum + cost, 0) / recentCosts.length;

    if (costEvent.costs.total > averageCost * 2) {
      await this.createCostAlert(
        'cost_spike',
        'high',
        'Cost spike detected',
        `Cost for ${costEvent.framework} operation is ${Math.round((costEvent.costs.total / averageCost) * 100)}% above average`,
        costEvent.costs.total,
        averageCost
      );
    }

    // Check token efficiency
    const tokenEfficiency = costEvent.usage.totalTokens > 0 ? 1 / costEvent.usage.totalTokens : 0;
    if (tokenEfficiency < 0.001) { // Low efficiency threshold
      await this.createCostAlert(
        'efficiency_drop',
        'medium',
        'Low token efficiency detected',
        `Operation used ${costEvent.usage.totalTokens} tokens with low efficiency`,
        costEvent.costs.total
      );
    }
  }

  private isCostEventInBudgetScope(costEvent: CostEvent, budget: CostBudget): boolean {
    // Check framework scope
    if (budget.scope.frameworks && !budget.scope.frameworks.includes(costEvent.framework)) {
      return false;
    }

    // Check operation scope
    if (budget.scope.operations && !budget.scope.operations.includes(costEvent.operation.type)) {
      return false;
    }

    // Check user scope
    if (budget.scope.users && costEvent.metadata.userId &&
        !budget.scope.users.includes(costEvent.metadata.userId)) {
      return false;
    }

    // Check time range scope
    const now = new Date();
    const budgetPeriodStart = this.getBudgetPeriodStart(budget.scope.timeRange, now);

    return costEvent.timestamp >= budgetPeriodStart;
  }

  private getBudgetPeriodStart(timeRange: CostBudget['scope']['timeRange'], now: Date): Date {
    const start = new Date(now);

    switch (timeRange) {
      case 'daily':
        start.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        start.setDate(start.getDate() - start.getDay());
        start.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'yearly':
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        break;
    }

    return start;
  }

  private getSeverityFromThreshold(threshold: number): CostAlert['severity'] {
    if (threshold >= 100) return 'critical';
    if (threshold >= 90) return 'high';
    if (threshold >= 75) return 'medium';
    return 'low';
  }

  private getCostAlertRecommendations(type: CostAlert['type'], currentCost: number, threshold?: number): string[] {
    const recommendations: Record<string, string[]> = {
      budget_threshold: [
        'Review recent high-cost operations',
        'Consider implementing cost controls',
        'Optimize model selection for routine tasks',
        'Enable response caching to reduce API calls'
      ],
      cost_spike: [
        'Investigate the cause of the cost spike',
        'Check for inefficient queries or operations',
        'Implement rate limiting if necessary',
        'Review error handling to prevent retries'
      ],
      efficiency_drop: [
        'Optimize prompt engineering to reduce token usage',
        'Implement input validation to prevent long inputs',
        'Consider using more efficient models',
        'Add response streaming to improve perceived performance'
      ],
      optimization_opportunity: [
        'Implement the suggested optimization',
        'Monitor the impact on performance',
        'Consider A/B testing the changes',
        'Document the optimization for future reference'
      ]
    };

    return recommendations[type] || ['Review cost patterns and optimize accordingly'];
  }

  private async getRecentCosts(framework: string, minutes: number): Promise<number[]> {
    const since = new Date(Date.now() - minutes * 60 * 1000);

    const pipeline = [
      {
        $match: {
          timestamp: { $gte: since },
          'metadata.type': 'cost_event',
          'metadata.framework': framework
        }
      },
      {
        $project: {
          cost: '$metadata.totalCost'
        }
      }
    ];

    const results = await this.costCollection.aggregate(pipeline);
    return results.map((result: any) => result.cost);
  }

  private calculateCostGrowthRate(dailyTrends: any[]): number {
    if (dailyTrends.length < 2) return 0;

    const firstDay = dailyTrends[0].cost;
    const lastDay = dailyTrends[dailyTrends.length - 1].cost;
    const days = dailyTrends.length - 1;

    if (firstDay === 0) return 0;

    return ((lastDay - firstDay) / firstDay) * 100 / days;
  }

  private async calculateBudgetStatus(totalCost: number, timeRange: { start: Date; end: Date }): Promise<CostAnalytics['budgetStatus']> {
    // Get active budgets
    const activeBudgets = Array.from(this.budgets.values()).filter(b => b.status === 'active');
    const totalBudget = activeBudgets.reduce((sum, budget) => sum + budget.limits.totalCost, 0);

    // Calculate burn rate (cost per day)
    const days = (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const burnRate = days > 0 ? totalCost / days : 0;

    // Project end date based on current burn rate
    const remainingBudget = totalBudget - totalCost;
    const projectedDays = burnRate > 0 ? remainingBudget / burnRate : Infinity;
    const projectedEndDate = new Date(Date.now() + projectedDays * 24 * 60 * 60 * 1000);

    return {
      totalBudget,
      spentAmount: totalCost,
      remainingBudget,
      burnRate,
      projectedEndDate
    };
  }

  private async getOptimizationOpportunities(timeRange: { start: Date; end: Date }): Promise<CostOptimization[]> {
    // Get recent optimizations
    const pipeline = [
      {
        $match: {
          timestamp: { $gte: timeRange.start, $lte: timeRange.end },
          'metadata.type': 'cost_optimization'
        }
      },
      { $sort: { timestamp: -1 } },
      { $limit: 10 }
    ];

    const results = await this.memoryCollection.aggregate(pipeline);
    return results.map((result: any) => JSON.parse(result.content));
  }

  private async detectRepetitiveQueries(timeRange: { start: Date; end: Date }): Promise<{ currentCost: number; potentialSavings: number }> {
    // Simplified detection - would implement actual query similarity analysis
    const pipeline = [
      {
        $match: {
          timestamp: { $gte: timeRange.start, $lte: timeRange.end },
          'metadata.type': 'cost_event'
        }
      },
      {
        $group: {
          _id: '$content.operation.input', // Group by similar inputs
          count: { $sum: 1 },
          totalCost: { $sum: '$metadata.totalCost' }
        }
      },
      {
        $match: {
          count: { $gte: 3 } // Queries repeated 3+ times
        }
      }
    ];

    const results = await this.costCollection.aggregate(pipeline);
    const currentCost = results.reduce((sum: number, result: any) => sum + result.totalCost, 0);
    const potentialSavings = currentCost * 0.6; // 60% savings from caching

    return { currentCost, potentialSavings };
  }

  private initializeDefaultBudgets(): void {
    // Initialize default budgets for different scopes
    this.createBudget({
      name: 'Monthly AI Operations Budget',
      description: 'Overall monthly budget for AI operations',
      scope: {
        timeRange: 'monthly'
      },
      limits: {
        totalCost: 1000, // $1000 per month
        modelCost: 700,
        embeddingCost: 200,
        mongodbCost: 100
      },
      alerts: {
        thresholds: [50, 75, 90, 100],
        notifications: {
          email: ['admin@company.com'],
          webhook: 'https://hooks.slack.com/services/...'
        }
      },
      status: 'active'
    });

    this.createBudget({
      name: 'Daily Development Budget',
      description: 'Daily budget for development and testing',
      scope: {
        timeRange: 'daily',
        frameworks: ['vercel-ai', 'mastra']
      },
      limits: {
        totalCost: 50, // $50 per day
        tokenUsage: 100000
      },
      alerts: {
        thresholds: [75, 90, 100],
        notifications: {
          email: ['dev-team@company.com']
        }
      },
      status: 'active'
    });
  }
}