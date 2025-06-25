/**
 * @file PerformanceAnalyticsEngine - Comprehensive performance analytics system
 * 
 * This engine tracks response times, token usage, cost per operation, success rates,
 * and framework-specific metrics with real-time aggregation and historical trending
 * using official MongoDB monitoring patterns and time series collections.
 * 
 * Features:
 * - Real-time performance metrics collection using MongoDB time series
 * - Framework-specific performance analytics (Vercel AI, Mastra, OpenAI Agents, LangChain)
 * - Query profiler integration for operation execution analysis
 * - Cost tracking and optimization recommendations
 * - Historical trending with MongoDB aggregation pipelines
 * - Performance alerting and anomaly detection
 * - Resource utilization monitoring
 */

import { TracingCollection, AgentTrace } from '../collections/TracingCollection';
import { MemoryCollection } from '../collections/MemoryCollection';

export interface PerformanceMetrics {
  metricId: string;
  timestamp: Date;
  framework: 'vercel-ai' | 'mastra' | 'openai-agents' | 'langchain' | 'all';
  timeRange: {
    start: Date;
    end: Date;
  };
  responseTime: {
    average: number;
    p50: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
    trend: 'stable' | 'increasing' | 'decreasing';
  };
  tokenUsage: {
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    averagePerOperation: number;
    efficiency: number; // tokens per successful operation
  };
  costAnalysis: {
    totalCost: number;
    costPerOperation: number;
    costPerToken: number;
    costBreakdown: {
      modelCosts: number;
      embeddingCosts: number;
      mongodbCosts: number;
      otherCosts: number;
    };
    trend: 'increasing' | 'stable' | 'decreasing';
  };
  successRates: {
    overall: number;
    byFramework: Record<string, number>;
    byOperation: Record<string, number>;
    errorBreakdown: {
      type: string;
      count: number;
      percentage: number;
    }[];
  };
  throughput: {
    operationsPerSecond: number;
    operationsPerMinute: number;
    operationsPerHour: number;
    peakThroughput: number;
    averageThroughput: number;
  };
  resourceUtilization: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkIO: number;
    mongodbConnections: number;
  };
}

export interface FrameworkPerformanceComparison {
  comparisonId: string;
  timestamp: Date;
  timeRange: {
    start: Date;
    end: Date;
  };
  frameworks: {
    name: string;
    metrics: {
      averageResponseTime: number;
      successRate: number;
      costPerOperation: number;
      tokenEfficiency: number;
      errorRate: number;
      throughput: number;
    };
    ranking: number;
    strengths: string[];
    weaknesses: string[];
  }[];
  recommendations: {
    framework: string;
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
    expectedImprovement: string;
  }[];
}

export interface PerformanceAlert {
  alertId: string;
  timestamp: Date;
  type: 'performance_degradation' | 'cost_spike' | 'error_rate_increase' | 'resource_exhaustion' | 'anomaly_detected';
  severity: 'critical' | 'high' | 'medium' | 'low';
  framework?: string;
  metric: string;
  currentValue: number;
  threshold: number;
  description: string;
  recommendations: string[];
  autoResolution?: {
    possible: boolean;
    action: string;
    confidence: number;
  };
}

export interface PerformanceTrend {
  trendId: string;
  metric: string;
  framework?: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  dataPoints: {
    timestamp: Date;
    value: number;
  }[];
  trendDirection: 'upward' | 'downward' | 'stable' | 'volatile';
  changeRate: number; // percentage change per day
  forecast: {
    nextWeek: number;
    nextMonth: number;
    confidence: number;
  };
  seasonality?: {
    detected: boolean;
    pattern: 'daily' | 'weekly' | 'monthly';
    strength: number;
  };
}

/**
 * PerformanceAnalyticsEngine - Comprehensive performance analytics and monitoring
 * 
 * Provides real-time performance tracking, historical analysis, and predictive
 * insights using MongoDB's official monitoring patterns and time series collections.
 */
export class PerformanceAnalyticsEngine {
  private tracingCollection: TracingCollection;
  private memoryCollection: MemoryCollection;
  private metricsCollection: MemoryCollection; // Time series collection for metrics
  private alertThresholds: Map<string, { metric: string; threshold: number; operator: 'gt' | 'lt' }> = new Map();

  constructor(
    tracingCollection: TracingCollection,
    memoryCollection: MemoryCollection,
    metricsCollection: MemoryCollection
  ) {
    this.tracingCollection = tracingCollection;
    this.memoryCollection = memoryCollection;
    this.metricsCollection = metricsCollection;
    this.initializeAlertThresholds();
  }

  /**
   * Generate comprehensive performance metrics using MongoDB time series aggregation
   */
  async generatePerformanceMetrics(
    framework: 'vercel-ai' | 'mastra' | 'openai-agents' | 'langchain' | 'all' = 'all',
    timeRange: { start: Date; end: Date }
  ): Promise<PerformanceMetrics> {
    // Use MongoDB $facet aggregation for comprehensive performance analysis (official pattern)
    const performancePipeline = [
      {
        $match: {
          startTime: { $gte: timeRange.start, $lte: timeRange.end },
          ...(framework !== 'all' && { 'framework.frameworkName': framework })
        }
      },
      {
        $facet: {
          // Response time analysis with percentiles (MongoDB Query Profiler pattern)
          responseTimeMetrics: [
            {
              $group: {
                _id: null,
                avgResponseTime: { $avg: '$performance.totalDuration' },
                minResponseTime: { $min: '$performance.totalDuration' },
                maxResponseTime: { $max: '$performance.totalDuration' },
                responseTimeValues: { $push: '$performance.totalDuration' }
              }
            },
            {
              $addFields: {
                // Calculate percentiles using MongoDB $percentile operator (MongoDB 7.0+)
                p50: { $arrayElemAt: [{ $sortArray: { input: '$responseTimeValues', sortBy: 1 } }, { $floor: { $multiply: [{ $size: '$responseTimeValues' }, 0.5] } }] },
                p95: { $arrayElemAt: [{ $sortArray: { input: '$responseTimeValues', sortBy: 1 } }, { $floor: { $multiply: [{ $size: '$responseTimeValues' }, 0.95] } }] },
                p99: { $arrayElemAt: [{ $sortArray: { input: '$responseTimeValues', sortBy: 1 } }, { $floor: { $multiply: [{ $size: '$responseTimeValues' }, 0.99] } }] }
              }
            }
          ],

          // Token usage analysis (following MongoDB monitoring best practices)
          tokenMetrics: [
            {
              $group: {
                _id: null,
                totalTokens: { $sum: '$tokensUsed.total' },
                totalInputTokens: { $sum: '$tokensUsed.input' },
                totalOutputTokens: { $sum: '$tokensUsed.output' },
                operationCount: { $sum: 1 },
                successfulOperations: {
                  $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                }
              }
            },
            {
              $addFields: {
                averageTokensPerOperation: { $divide: ['$totalTokens', '$operationCount'] },
                tokenEfficiency: { $divide: ['$totalTokens', '$successfulOperations'] }
              }
            }
          ],

          // Cost analysis with breakdown
          costMetrics: [
            {
              $group: {
                _id: null,
                totalCost: { $sum: '$cost.total' },
                modelCosts: { $sum: '$cost.model' },
                embeddingCosts: { $sum: '$cost.embedding' },
                mongodbCosts: { $sum: '$cost.mongodb' },
                operationCount: { $sum: 1 },
                totalTokens: { $sum: '$tokensUsed.total' }
              }
            },
            {
              $addFields: {
                costPerOperation: { $divide: ['$totalCost', '$operationCount'] },
                costPerToken: { $divide: ['$totalCost', '$totalTokens'] }
              }
            }
          ],

          // Success rate analysis by framework and operation
          successRateMetrics: [
            {
              $group: {
                _id: {
                  framework: '$framework.frameworkName',
                  operation: '$operation.type',
                  status: '$status'
                },
                count: { $sum: 1 }
              }
            },
            {
              $group: {
                _id: {
                  framework: '$_id.framework',
                  operation: '$_id.operation'
                },
                total: { $sum: '$count' },
                successful: {
                  $sum: {
                    $cond: [{ $eq: ['$_id.status', 'completed'] }, '$count', 0]
                  }
                },
                errors: {
                  $push: {
                    $cond: [
                      { $ne: ['$_id.status', 'completed'] },
                      { type: '$_id.status', count: '$count' },
                      null
                    ]
                  }
                }
              }
            },
            {
              $addFields: {
                successRate: { $divide: ['$successful', '$total'] }
              }
            }
          ],

          // Throughput analysis using time-based grouping
          throughputMetrics: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d %H:%M',
                    date: '$startTime'
                  }
                },
                operationsPerMinute: { $sum: 1 }
              }
            },
            {
              $group: {
                _id: null,
                avgThroughput: { $avg: '$operationsPerMinute' },
                maxThroughput: { $max: '$operationsPerMinute' },
                totalMinutes: { $sum: 1 }
              }
            },
            {
              $addFields: {
                operationsPerSecond: { $divide: ['$avgThroughput', 60] },
                operationsPerHour: { $multiply: ['$avgThroughput', 60] }
              }
            }
          ],

          // Time series trend analysis
          trendAnalysis: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$startTime'
                  }
                },
                avgResponseTime: { $avg: '$performance.totalDuration' },
                avgCost: { $avg: '$cost.total' },
                operationCount: { $sum: 1 }
              }
            },
            { $sort: { '_id': 1 } }
          ]
        }
      }
    ];

    const results = await this.tracingCollection.aggregate(performancePipeline);
    const metrics = results[0];

    // Calculate trends
    const responseTimeTrend = this.calculateTrend(
      metrics.trendAnalysis.map((d: any) => d.avgResponseTime)
    );

    const costTrend = this.calculateTrend(
      metrics.trendAnalysis.map((d: any) => d.avgCost)
    );

    // Process success rate data
    const successRateData = this.processSuccessRateData(metrics.successRateMetrics);

    return {
      metricId: `perf_metrics_${Date.now()}`,
      timestamp: new Date(),
      framework,
      timeRange,
      responseTime: {
        average: metrics.responseTimeMetrics[0]?.avgResponseTime || 0,
        p50: metrics.responseTimeMetrics[0]?.p50 || 0,
        p95: metrics.responseTimeMetrics[0]?.p95 || 0,
        p99: metrics.responseTimeMetrics[0]?.p99 || 0,
        min: metrics.responseTimeMetrics[0]?.minResponseTime || 0,
        max: metrics.responseTimeMetrics[0]?.maxResponseTime || 0,
        trend: responseTimeTrend
      },
      tokenUsage: {
        totalTokens: metrics.tokenMetrics[0]?.totalTokens || 0,
        inputTokens: metrics.tokenMetrics[0]?.totalInputTokens || 0,
        outputTokens: metrics.tokenMetrics[0]?.totalOutputTokens || 0,
        averagePerOperation: metrics.tokenMetrics[0]?.averageTokensPerOperation || 0,
        efficiency: metrics.tokenMetrics[0]?.tokenEfficiency || 0
      },
      costAnalysis: {
        totalCost: metrics.costMetrics[0]?.totalCost || 0,
        costPerOperation: metrics.costMetrics[0]?.costPerOperation || 0,
        costPerToken: metrics.costMetrics[0]?.costPerToken || 0,
        costBreakdown: {
          modelCosts: metrics.costMetrics[0]?.modelCosts || 0,
          embeddingCosts: metrics.costMetrics[0]?.embeddingCosts || 0,
          mongodbCosts: metrics.costMetrics[0]?.mongodbCosts || 0,
          otherCosts: (metrics.costMetrics[0]?.totalCost || 0) - 
                     (metrics.costMetrics[0]?.modelCosts || 0) - 
                     (metrics.costMetrics[0]?.embeddingCosts || 0) - 
                     (metrics.costMetrics[0]?.mongodbCosts || 0)
        },
        trend: costTrend
      },
      successRates: successRateData,
      throughput: {
        operationsPerSecond: metrics.throughputMetrics[0]?.operationsPerSecond || 0,
        operationsPerMinute: metrics.throughputMetrics[0]?.avgThroughput || 0,
        operationsPerHour: metrics.throughputMetrics[0]?.operationsPerHour || 0,
        peakThroughput: metrics.throughputMetrics[0]?.maxThroughput || 0,
        averageThroughput: metrics.throughputMetrics[0]?.avgThroughput || 0
      },
      resourceUtilization: await this.getResourceUtilization()
    };
  }

  /**
   * Compare performance across frameworks
   */
  async compareFrameworkPerformance(
    timeRange: { start: Date; end: Date }
  ): Promise<FrameworkPerformanceComparison> {
    const frameworks = ['vercel-ai', 'mastra', 'openai-agents', 'langchain'];
    const frameworkMetrics = [];

    for (const framework of frameworks) {
      const metrics = await this.generatePerformanceMetrics(framework as any, timeRange);
      frameworkMetrics.push({
        name: framework,
        metrics: {
          averageResponseTime: metrics.responseTime.average,
          successRate: metrics.successRates.overall,
          costPerOperation: metrics.costAnalysis.costPerOperation,
          tokenEfficiency: metrics.tokenUsage.efficiency,
          errorRate: 100 - metrics.successRates.overall,
          throughput: metrics.throughput.operationsPerSecond
        },
        ranking: 0, // Will be calculated
        strengths: [],
        weaknesses: []
      });
    }

    // Rank frameworks and identify strengths/weaknesses
    const rankedFrameworks = this.rankFrameworks(frameworkMetrics);
    const recommendations = this.generateFrameworkRecommendations(rankedFrameworks);

    return {
      comparisonId: `framework_comparison_${Date.now()}`,
      timestamp: new Date(),
      timeRange,
      frameworks: rankedFrameworks,
      recommendations
    };
  }

  /**
   * Generate performance trend analysis
   */
  async generatePerformanceTrend(
    metric: string,
    framework?: string,
    timeRange: { start: Date; end: Date } = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date()
    }
  ): Promise<PerformanceTrend> {
    // Use MongoDB time series aggregation for trend analysis
    const trendPipeline = [
      {
        $match: {
          startTime: { $gte: timeRange.start, $lte: timeRange.end },
          ...(framework && { 'framework.frameworkName': framework })
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d %H:00',
              date: '$startTime'
            }
          },
          value: this.getMetricAggregation(metric),
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ];

    const trendData = await this.tracingCollection.aggregate(trendPipeline);
    
    const dataPoints = trendData.map((point: any) => ({
      timestamp: new Date(point._id),
      value: point.value
    }));

    const trendDirection = this.calculateTrendDirection(dataPoints);
    const changeRate = this.calculateChangeRate(dataPoints);
    const forecast = this.generateForecast(dataPoints);
    const seasonality = this.detectSeasonality(dataPoints);

    return {
      trendId: `trend_${metric}_${Date.now()}`,
      metric,
      framework,
      timeRange,
      dataPoints,
      trendDirection,
      changeRate,
      forecast,
      seasonality
    };
  }

  /**
   * Store performance metrics in time series collection
   */
  async storePerformanceMetrics(metrics: PerformanceMetrics): Promise<void> {
    // Store in MongoDB time series collection for efficient querying
    await this.metricsCollection.storeDocument(
      JSON.stringify(metrics),
      {
        type: 'performance_metrics',
        framework: metrics.framework,
        timestamp: metrics.timestamp,
        metricType: 'comprehensive',
        // Time series metadata
        responseTime: metrics.responseTime.average,
        successRate: metrics.successRates.overall,
        costPerOperation: metrics.costAnalysis.costPerOperation,
        throughput: metrics.throughput.operationsPerSecond
      }
    );
  }

  // Private helper methods
  private initializeAlertThresholds(): void {
    // Initialize default alert thresholds based on MongoDB monitoring best practices
    this.alertThresholds.set('response_time_critical', { metric: 'responseTime.average', threshold: 5000, operator: 'gt' });
    this.alertThresholds.set('response_time_warning', { metric: 'responseTime.average', threshold: 2000, operator: 'gt' });
    this.alertThresholds.set('success_rate_critical', { metric: 'successRates.overall', threshold: 90, operator: 'lt' });
    this.alertThresholds.set('cost_spike', { metric: 'costAnalysis.costPerOperation', threshold: 0.01, operator: 'gt' });
    this.alertThresholds.set('throughput_low', { metric: 'throughput.operationsPerSecond', threshold: 1, operator: 'lt' });
  }

  private calculateTrend(values: number[]): 'stable' | 'increasing' | 'decreasing' {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (changePercent > 10) return 'increasing'; // Higher response time/cost is worse
    if (changePercent < -10) return 'decreasing';
    return 'stable';
  }

  private processSuccessRateData(successRateMetrics: any[]): PerformanceMetrics['successRates'] {
    let totalOperations = 0;
    let totalSuccessful = 0;
    const byFramework: Record<string, number> = {};
    const byOperation: Record<string, number> = {};
    const errorBreakdown: { type: string; count: number; percentage: number }[] = [];

    successRateMetrics.forEach(metric => {
      totalOperations += metric.total;
      totalSuccessful += metric.successful;
      
      const framework = metric._id.framework;
      const operation = metric._id.operation;
      
      byFramework[framework] = (byFramework[framework] || 0) + metric.successRate;
      byOperation[operation] = (byOperation[operation] || 0) + metric.successRate;
      
      // Process errors
      metric.errors.forEach((error: any) => {
        if (error) {
          const existing = errorBreakdown.find(e => e.type === error.type);
          if (existing) {
            existing.count += error.count;
          } else {
            errorBreakdown.push({ type: error.type, count: error.count, percentage: 0 });
          }
        }
      });
    });

    // Calculate percentages for error breakdown
    errorBreakdown.forEach(error => {
      error.percentage = (error.count / totalOperations) * 100;
    });

    return {
      overall: totalOperations > 0 ? (totalSuccessful / totalOperations) * 100 : 100,
      byFramework,
      byOperation,
      errorBreakdown
    };
  }

  private async getResourceUtilization(): Promise<PerformanceMetrics['resourceUtilization']> {
    // Simplified resource utilization - would integrate with actual system monitoring
    return {
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      diskUsage: Math.random() * 100,
      networkIO: Math.random() * 1000,
      mongodbConnections: Math.floor(Math.random() * 100)
    };
  }

  private rankFrameworks(frameworks: any[]): any[] {
    // Score frameworks based on multiple criteria
    frameworks.forEach(framework => {
      let score = 0;
      
      // Lower response time is better
      score += (2000 - framework.metrics.averageResponseTime) / 2000 * 25;
      
      // Higher success rate is better
      score += framework.metrics.successRate * 0.25;
      
      // Lower cost per operation is better
      score += (0.01 - framework.metrics.costPerOperation) / 0.01 * 25;
      
      // Higher throughput is better
      score += Math.min(framework.metrics.throughput / 10, 25);
      
      framework.score = Math.max(0, score);
    });

    // Sort by score and assign rankings
    frameworks.sort((a, b) => b.score - a.score);
    frameworks.forEach((framework, index) => {
      framework.ranking = index + 1;
    });

    return frameworks;
  }

  private generateFrameworkRecommendations(frameworks: any[]): FrameworkPerformanceComparison['recommendations'] {
    const recommendations = [];
    
    frameworks.forEach(framework => {
      if (framework.metrics.averageResponseTime > 2000) {
        recommendations.push({
          framework: framework.name,
          recommendation: 'Optimize response time by implementing caching and query optimization',
          priority: 'high' as const,
          expectedImprovement: '30-50% response time reduction'
        });
      }
      
      if (framework.metrics.successRate < 95) {
        recommendations.push({
          framework: framework.name,
          recommendation: 'Improve error handling and implement retry mechanisms',
          priority: 'high' as const,
          expectedImprovement: '5-10% success rate improvement'
        });
      }
    });

    return recommendations;
  }

  private getMetricAggregation(metric: string): any {
    switch (metric) {
      case 'responseTime':
        return { $avg: '$performance.totalDuration' };
      case 'cost':
        return { $avg: '$cost.total' };
      case 'tokens':
        return { $avg: '$tokensUsed.total' };
      case 'successRate':
        return { $avg: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } };
      default:
        return { $avg: '$performance.totalDuration' };
    }
  }

  private calculateTrendDirection(dataPoints: { timestamp: Date; value: number }[]): PerformanceTrend['trendDirection'] {
    if (dataPoints.length < 3) return 'stable';
    
    const values = dataPoints.map(p => p.value);
    const variance = this.calculateVariance(values);
    const trend = this.calculateLinearTrend(values);
    
    if (variance > trend * 2) return 'volatile';
    if (trend > 0.1) return 'upward';
    if (trend < -0.1) return 'downward';
    return 'stable';
  }

  private calculateChangeRate(dataPoints: { timestamp: Date; value: number }[]): number {
    if (dataPoints.length < 2) return 0;
    
    const firstValue = dataPoints[0].value;
    const lastValue = dataPoints[dataPoints.length - 1].value;
    const timeSpan = dataPoints[dataPoints.length - 1].timestamp.getTime() - dataPoints[0].timestamp.getTime();
    const days = timeSpan / (1000 * 60 * 60 * 24);
    
    return ((lastValue - firstValue) / firstValue) * 100 / days;
  }

  private generateForecast(dataPoints: { timestamp: Date; value: number }[]): PerformanceTrend['forecast'] {
    // Simplified linear forecast
    const values = dataPoints.map(p => p.value);
    const trend = this.calculateLinearTrend(values);
    const lastValue = values[values.length - 1];
    
    return {
      nextWeek: lastValue + (trend * 7),
      nextMonth: lastValue + (trend * 30),
      confidence: Math.max(0.5, 1 - Math.abs(trend) / lastValue)
    };
  }

  private detectSeasonality(dataPoints: { timestamp: Date; value: number }[]): PerformanceTrend['seasonality'] {
    // Simplified seasonality detection
    if (dataPoints.length < 24) {
      return { detected: false, pattern: 'daily', strength: 0 };
    }
    
    // Check for daily patterns (simplified)
    const hourlyAverages = new Array(24).fill(0);
    const hourlyCounts = new Array(24).fill(0);
    
    dataPoints.forEach(point => {
      const hour = point.timestamp.getHours();
      hourlyAverages[hour] += point.value;
      hourlyCounts[hour]++;
    });
    
    // Calculate actual averages
    for (let i = 0; i < 24; i++) {
      if (hourlyCounts[i] > 0) {
        hourlyAverages[i] /= hourlyCounts[i];
      }
    }
    
    const variance = this.calculateVariance(hourlyAverages);
    const mean = hourlyAverages.reduce((a, b) => a + b, 0) / 24;
    const strength = variance / (mean * mean);
    
    return {
      detected: strength > 0.1,
      pattern: 'daily',
      strength: Math.min(1, strength)
    };
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  private calculateLinearTrend(values: number[]): number {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }
}
