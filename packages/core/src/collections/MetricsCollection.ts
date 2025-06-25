/**
 * @file MetricsCollection - MongoDB collection operations for performance metrics
 * 
 * This class provides CRUD operations and specialized queries for agent performance metrics,
 * implementing time series data collection and analytics.
 */

import { Collection, Db, ObjectId } from 'mongodb';
import { AgentPerformanceMetrics } from '../types/index';
import { BaseCollection } from './BaseCollection';

export interface MetricsFilter {
  agentId?: string | ObjectId;
  framework?: string;
  metricType?: string;
  recordedAfter?: Date;
  recordedBefore?: Date;
}

export interface MetricsAggregationOptions {
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  metrics?: string[];
  limit?: number;
}

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

/**
 * MetricsCollection - Complete CRUD operations for performance metrics
 * 
 * Features:
 * - Time series metrics collection
 * - Performance analytics and aggregation
 * - Real-time monitoring capabilities
 * - Historical trend analysis
 * - Custom metric types support
 */
export class MetricsCollection extends BaseCollection<AgentPerformanceMetrics> {
  protected collectionName = 'agent_performance_metrics';

  constructor(db: Db) {
    super(db);
    this.initializeCollection();
  }

  /**
   * Record a new metric
   */
  async recordMetric(metricData: Omit<AgentPerformanceMetrics, '_id' | 'createdAt'>): Promise<AgentPerformanceMetrics> {
    const now = new Date();
    const metric: AgentPerformanceMetrics = {
      ...metricData,
      _id: new ObjectId(),
      createdAt: now,
      recordedAt: metricData.recordedAt || now
    };

    await this.validateDocument(metric);
    const result = await this.collection.insertOne(metric);
    
    if (!result.acknowledged) {
      throw new Error('Failed to record metric');
    }

    return metric;
  }

  /**
   * Record multiple metrics in batch
   */
  async recordMetrics(metricsData: Omit<AgentPerformanceMetrics, '_id' | 'createdAt'>[]): Promise<AgentPerformanceMetrics[]> {
    const now = new Date();
    const metrics = metricsData.map(data => ({
      ...data,
      _id: new ObjectId(),
      createdAt: now,
      recordedAt: data.recordedAt || now
    })) as AgentPerformanceMetrics[];

    // Validate all metrics
    for (const metric of metrics) {
      await this.validateDocument(metric);
    }

    const result = await this.collection.insertMany(metrics);
    
    if (!result.acknowledged) {
      throw new Error('Failed to record metrics');
    }

    return metrics;
  }

  /**
   * Get metrics for an agent
   */
  async getAgentMetrics(
    agentId: string | ObjectId,
    options: {
      metricType?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<AgentPerformanceMetrics[]> {
    const objectId = typeof agentId === 'string' ? new ObjectId(agentId) : agentId;
    const { metricType, startDate, endDate, limit = 1000 } = options;

    const filter: any = { agentId: objectId };
    
    if (metricType) {
      filter.metricType = metricType;
    }
    
    if (startDate || endDate) {
      filter.recordedAt = {};
      if (startDate) {
        filter.recordedAt.$gte = startDate;
      }
      if (endDate) {
        filter.recordedAt.$lte = endDate;
      }
    }

    return await this.collection
      .find(filter)
      .sort({ recordedAt: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Get latest metrics for an agent
   */
  async getLatestMetrics(
    agentId: string | ObjectId,
    metricTypes?: string[]
  ): Promise<Record<string, AgentPerformanceMetrics>> {
    const objectId = typeof agentId === 'string' ? new ObjectId(agentId) : agentId;
    
    const pipeline = [
      {
        $match: {
          agentId: objectId,
          ...(metricTypes ? { metricType: { $in: metricTypes } } : {})
        }
      },
      {
        $sort: { recordedAt: -1 }
      },
      {
        $group: {
          _id: '$metricType',
          latestMetric: { $first: '$$ROOT' }
        }
      }
    ];

    const results = await this.collection.aggregate(pipeline).toArray();
    
    return results.reduce((acc, item) => {
      acc[item._id] = item.latestMetric;
      return acc;
    }, {});
  }

  /**
   * Get aggregated metrics over time
   */
  async getAggregatedMetrics(
    filter: MetricsFilter = {},
    options: MetricsAggregationOptions = {}
  ): Promise<{
    timeSeries: Array<{
      timestamp: Date;
      metrics: Record<string, { avg: number; min: number; max: number; count: number }>;
    }>;
    summary: Record<string, { avg: number; min: number; max: number; total: number }>;
  }> {
    const { groupBy = 'hour', metrics = [], limit = 100 } = options;
    const mongoFilter = this.buildMongoFilter(filter);

    // Define grouping format based on groupBy
    const groupFormat = this.getGroupFormat(groupBy);

    const pipeline = [
      { $match: mongoFilter },
      {
        $group: {
          _id: {
            timestamp: groupFormat,
            metricType: '$metricType'
          },
          avg: { $avg: '$value' },
          min: { $min: '$value' },
          max: { $max: '$value' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.timestamp',
          metrics: {
            $push: {
              type: '$_id.metricType',
              avg: '$avg',
              min: '$min',
              max: '$max',
              count: '$count'
            }
          }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: limit }
    ];

    const timeSeriesResults = await this.collection.aggregate(pipeline).toArray();

    // Format time series data
    const timeSeries = timeSeriesResults.map(item => ({
      timestamp: item._id,
      metrics: item.metrics.reduce((acc, metric) => {
        acc[metric.type] = {
          avg: metric.avg,
          min: metric.min,
          max: metric.max,
          count: metric.count
        };
        return acc;
      }, {})
    }));

    // Calculate summary statistics
    const summaryPipeline = [
      { $match: mongoFilter },
      {
        $group: {
          _id: '$metricType',
          avg: { $avg: '$value' },
          min: { $min: '$value' },
          max: { $max: '$value' },
          total: { $sum: 1 }
        }
      }
    ];

    const summaryResults = await this.collection.aggregate(summaryPipeline).toArray();
    const summary = summaryResults.reduce((acc, item) => {
      acc[item._id] = {
        avg: item.avg,
        min: item.min,
        max: item.max,
        total: item.total
      };
      return acc;
    }, {});

    return { timeSeries, summary };
  }

  /**
   * Get performance trends
   */
  async getPerformanceTrends(
    agentId: string | ObjectId,
    metricType: string,
    days: number = 7
  ): Promise<{
    trend: 'improving' | 'declining' | 'stable';
    changePercentage: number;
    dataPoints: TimeSeriesPoint[];
  }> {
    const objectId = typeof agentId === 'string' ? new ObjectId(agentId) : agentId;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const pipeline = [
      {
        $match: {
          agentId: objectId,
          metricType,
          recordedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$recordedAt'
            }
          },
          avgValue: { $avg: '$value' },
          timestamp: { $first: '$recordedAt' }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const results = await this.collection.aggregate(pipeline).toArray();
    
    const dataPoints: TimeSeriesPoint[] = results.map(item => ({
      timestamp: new Date(item._id),
      value: item.avgValue
    }));

    if (dataPoints.length < 2) {
      return {
        trend: 'stable',
        changePercentage: 0,
        dataPoints
      };
    }

    // Calculate trend
    const firstValue = dataPoints[0].value;
    const lastValue = dataPoints[dataPoints.length - 1].value;
    const changePercentage = ((lastValue - firstValue) / firstValue) * 100;

    let trend: 'improving' | 'declining' | 'stable';
    if (Math.abs(changePercentage) < 5) {
      trend = 'stable';
    } else if (changePercentage > 0) {
      trend = 'improving';
    } else {
      trend = 'declining';
    }

    return {
      trend,
      changePercentage,
      dataPoints
    };
  }

  /**
   * Get real-time metrics dashboard data
   */
  async getDashboardData(agentId?: string | ObjectId): Promise<{
    currentMetrics: Record<string, number>;
    recentTrends: Record<string, { value: number; change: number }>;
    alerts: Array<{ metric: string; value: number; threshold: number; severity: 'warning' | 'critical' }>;
  }> {
    const filter: any = {};
    if (agentId) {
      const objectId = typeof agentId === 'string' ? new ObjectId(agentId) : agentId;
      filter.agentId = objectId;
    }

    // Get latest metrics
    const latestMetrics = await this.getLatestMetrics(agentId);
    const currentMetrics = Object.entries(latestMetrics).reduce((acc, [type, metric]) => {
      acc[type] = metric.value;
      return acc;
    }, {});

    // Get recent trends (last 24 hours vs previous 24 hours)
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const previous24h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const trendsPipeline = [
      { $match: { ...filter, recordedAt: { $gte: previous24h } } },
      {
        $group: {
          _id: {
            metricType: '$metricType',
            period: {
              $cond: [
                { $gte: ['$recordedAt', last24h] },
                'recent',
                'previous'
              ]
            }
          },
          avgValue: { $avg: '$value' }
        }
      },
      {
        $group: {
          _id: '$_id.metricType',
          recent: {
            $sum: {
              $cond: [{ $eq: ['$_id.period', 'recent'] }, '$avgValue', 0]
            }
          },
          previous: {
            $sum: {
              $cond: [{ $eq: ['$_id.period', 'previous'] }, '$avgValue', 0]
            }
          }
        }
      }
    ];

    const trendsResults = await this.collection.aggregate(trendsPipeline).toArray();
    const recentTrends = trendsResults.reduce((acc, item) => {
      const change = item.previous > 0 
        ? ((item.recent - item.previous) / item.previous) * 100 
        : 0;
      acc[item._id] = {
        value: item.recent,
        change
      };
      return acc;
    }, {});

    // Generate alerts (simplified - in real implementation, use configurable thresholds)
    const alerts = [];
    for (const [metric, data] of Object.entries(recentTrends)) {
      if (Math.abs(data.change) > 50) {
        alerts.push({
          metric,
          value: data.value,
          threshold: 50,
          severity: Math.abs(data.change) > 100 ? 'critical' : 'warning'
        });
      }
    }

    return {
      currentMetrics,
      recentTrends,
      alerts
    };
  }

  /**
   * Cleanup old metrics
   */
  async cleanupOldMetrics(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    const result = await this.collection.deleteMany({
      recordedAt: { $lt: cutoffDate }
    });

    return result.deletedCount;
  }

  /**
   * Get group format for time aggregation
   */
  private getGroupFormat(groupBy: string): any {
    switch (groupBy) {
      case 'hour':
        return {
          $dateToString: {
            format: '%Y-%m-%d %H:00:00',
            date: '$recordedAt'
          }
        };
      case 'day':
        return {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$recordedAt'
          }
        };
      case 'week':
        return {
          $dateToString: {
            format: '%Y-W%U',
            date: '$recordedAt'
          }
        };
      case 'month':
        return {
          $dateToString: {
            format: '%Y-%m',
            date: '$recordedAt'
          }
        };
      default:
        return {
          $dateToString: {
            format: '%Y-%m-%d %H:00:00',
            date: '$recordedAt'
          }
        };
    }
  }

  /**
   * Build MongoDB filter from MetricsFilter
   */
  private buildMongoFilter(filter: MetricsFilter): any {
    const mongoFilter: any = {};

    if (filter.agentId) {
      const objectId = typeof filter.agentId === 'string' ? new ObjectId(filter.agentId) : filter.agentId;
      mongoFilter.agentId = objectId;
    }

    if (filter.framework) {
      mongoFilter.framework = filter.framework;
    }

    if (filter.metricType) {
      mongoFilter.metricType = filter.metricType;
    }

    if (filter.recordedAfter || filter.recordedBefore) {
      mongoFilter.recordedAt = {};
      if (filter.recordedAfter) {
        mongoFilter.recordedAt.$gte = filter.recordedAfter;
      }
      if (filter.recordedBefore) {
        mongoFilter.recordedAt.$lte = filter.recordedBefore;
      }
    }

    return mongoFilter;
  }

  /**
   * Create indexes for optimal performance
   */
  async createIndexes(): Promise<void> {
    await Promise.all([
      // Primary indexes
      this.collection.createIndex({ agentId: 1, metricType: 1, recordedAt: -1 }),
      this.collection.createIndex({ metricType: 1, recordedAt: -1 }),
      this.collection.createIndex({ framework: 1, recordedAt: -1 }),
      this.collection.createIndex({ recordedAt: -1 }),
      
      // Compound indexes for aggregation
      this.collection.createIndex({ agentId: 1, recordedAt: -1 }),
      this.collection.createIndex({ metricType: 1, framework: 1, recordedAt: -1 }),
      
      // Time series optimization
      this.collection.createIndex({ recordedAt: 1 }),
      
      // TTL index for automatic cleanup (optional)
      // this.collection.createIndex({ recordedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })
    ]);
  }
}
