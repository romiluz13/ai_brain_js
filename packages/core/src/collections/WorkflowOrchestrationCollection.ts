/**
 * @file WorkflowOrchestrationCollection - MongoDB collection for workflow orchestration tracking
 * 
 * This collection manages workflow execution records, routing decisions, and performance
 * analytics using MongoDB's advanced indexing and aggregation capabilities.
 */

import { Db, Collection, ObjectId, CreateIndexesOptions } from 'mongodb';

export interface WorkflowExecution {
  _id?: ObjectId;
  executionId: ObjectId;
  agentId: string;
  sessionId?: string;
  workflowType: 'routing' | 'parallel' | 'evaluation';
  
  // Routing specific data
  routing?: {
    request: {
      input: string;
      taskType: string;
      complexity: number;
      priority: string;
      cognitiveSystemsNeeded: string[];
    };
    path: {
      route: Array<{
        systemName: string;
        order: number;
        parallel: boolean;
        dependencies: string[];
        estimatedDuration: number;
        actualDuration?: number;
        confidence: number;
        success?: boolean;
      }>;
      estimatedTotalTime: number;
      actualTotalTime?: number;
      confidence: number;
    };
    alternatives: any[];
    riskAssessment: {
      level: string;
      factors: string[];
      mitigations: string[];
    };
  };

  // Parallel execution specific data
  parallel?: {
    request: {
      tasks: Array<{
        taskId: string;
        name: string;
        type: string;
        dependencies: string[];
        priority: number;
      }>;
      coordination: {
        strategy: string;
        timeout: number;
        failureHandling: string;
      };
      optimization: {
        maxConcurrency: number;
        loadBalancing: boolean;
      };
    };
    results: Array<{
      taskId: string;
      success: boolean;
      executionTime: number;
      resourceUsage: {
        memory?: number;
        cpu?: number;
      };
    }>;
    performance: {
      totalExecutionTime: number;
      parallelEfficiency: number;
      resourceUtilization: number;
      bottlenecks: string[];
    };
  };

  // Evaluation specific data
  evaluation?: {
    workflowId: ObjectId;
    metrics: {
      efficiency: number;
      accuracy: number;
      reliability: number;
      userSatisfaction: number;
      resourceUtilization: number;
    };
    feedback: {
      positive: string[];
      negative: string[];
      suggestions: string[];
      userRating?: number;
    };
    optimization: {
      bottlenecks: any[];
      improvements: any[];
      nextIterationChanges: string[];
    };
    learning: {
      patterns: string[];
      insights: string[];
      applicableScenarios: string[];
    };
  };

  // Common fields
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  success: boolean;
  error?: {
    type: string;
    message: string;
    code?: string;
  };
  
  context: {
    source: string;
    framework: string;
    userContext?: any;
  };
  
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class WorkflowOrchestrationCollection {
  private collection: Collection<WorkflowExecution>;

  constructor(private db: Db) {
    this.collection = db.collection<WorkflowExecution>('workflow_executions');
  }

  /**
   * Create indexes for optimal query performance
   */
  async createIndexes(): Promise<void> {
    const indexes = [
      // Primary queries
      { key: { agentId: 1, timestamp: -1 } },
      { key: { executionId: 1 }, options: { unique: true } },
      { key: { workflowType: 1, timestamp: -1 } },
      
      // Status and performance queries
      { key: { status: 1, timestamp: -1 } },
      { key: { success: 1, timestamp: -1 } },
      { key: { duration: 1, timestamp: -1 } },
      
      // Routing specific indexes
      { key: { 'routing.request.taskType': 1, timestamp: -1 } },
      { key: { 'routing.path.confidence': 1, timestamp: -1 } },
      { key: { 'routing.riskAssessment.level': 1, timestamp: -1 } },
      
      // Parallel execution indexes
      { key: { 'parallel.request.coordination.strategy': 1, timestamp: -1 } },
      { key: { 'parallel.performance.parallelEfficiency': 1, timestamp: -1 } },
      
      // Evaluation indexes
      { key: { 'evaluation.workflowId': 1, timestamp: -1 } },
      { key: { 'evaluation.metrics.efficiency': 1, timestamp: -1 } },
      { key: { 'evaluation.feedback.userRating': 1, timestamp: -1 } },
      
      // Compound indexes for complex queries
      { key: { agentId: 1, workflowType: 1, timestamp: -1 } },
      { key: { success: 1, workflowType: 1, timestamp: -1 } },
      { key: { 'context.framework': 1, timestamp: -1 } },
      
      // TTL index for automatic cleanup (optional)
      { 
        key: { createdAt: 1 }, 
        options: { 
          expireAfterSeconds: 60 * 60 * 24 * 180, // 180 days
          name: 'workflow_execution_ttl'
        } as CreateIndexesOptions
      }
    ];

    for (const index of indexes) {
      try {
        await this.collection.createIndex(index.key, index.options);
      } catch (error) {
        console.warn(`Warning: Could not create index ${JSON.stringify(index.key)}:`, error);
      }
    }
  }

  /**
   * Record a workflow execution
   */
  async recordExecution(execution: Omit<WorkflowExecution, '_id' | 'createdAt' | 'updatedAt'>): Promise<ObjectId> {
    const now = new Date();
    const document: WorkflowExecution = {
      ...execution,
      createdAt: now,
      updatedAt: now
    };

    const result = await this.collection.insertOne(document);
    return result.insertedId;
  }

  /**
   * Get workflow execution by ID
   */
  async getWorkflowExecution(executionId: ObjectId): Promise<WorkflowExecution | null> {
    return await this.collection.findOne({ executionId });
  }

  /**
   * Update workflow execution status
   */
  async updateExecutionStatus(
    executionId: ObjectId,
    updates: {
      status?: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
      endTime?: Date;
      duration?: number;
      success?: boolean;
      error?: any;
      routing?: any;
      parallel?: any;
      evaluation?: any;
    }
  ): Promise<void> {
    const updateDoc: any = {
      updatedAt: new Date()
    };

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        updateDoc[key] = updates[key];
      }
    });

    await this.collection.updateOne(
      { executionId },
      { $set: updateDoc }
    );
  }

  /**
   * Get workflow executions for an agent
   */
  async getAgentWorkflows(
    agentId: string,
    options: {
      workflowType?: 'routing' | 'parallel' | 'evaluation';
      status?: string;
      limit?: number;
      skip?: number;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<WorkflowExecution[]> {
    const filter: any = { agentId };
    
    if (options.workflowType) filter.workflowType = options.workflowType;
    if (options.status) filter.status = options.status;
    if (options.startDate || options.endDate) {
      filter.timestamp = {};
      if (options.startDate) filter.timestamp.$gte = options.startDate;
      if (options.endDate) filter.timestamp.$lte = options.endDate;
    }

    return await this.collection
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(options.limit || 100)
      .skip(options.skip || 0)
      .toArray();
  }

  /**
   * Get workflow performance analytics
   */
  async getWorkflowAnalytics(
    workflowType?: 'routing' | 'parallel' | 'evaluation',
    timeframeDays: number = 30
  ): Promise<{
    totalExecutions: number;
    successRate: number;
    avgDuration: number;
    avgEfficiency: number;
    topPerformingPatterns: any[];
    commonFailures: any[];
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeDays);

    const matchStage: any = { timestamp: { $gte: startDate } };
    if (workflowType) matchStage.workflowType = workflowType;

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalExecutions: { $sum: 1 },
          successfulExecutions: {
            $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] }
          },
          totalDuration: { $sum: '$duration' },
          avgEfficiency: {
            $avg: {
              $cond: [
                { $eq: ['$workflowType', 'parallel'] },
                '$parallel.performance.parallelEfficiency',
                { $cond: [
                  { $eq: ['$workflowType', 'evaluation'] },
                  '$evaluation.metrics.efficiency',
                  0.8 // Default for routing
                ]}
              ]
            }
          }
        }
      },
      {
        $project: {
          totalExecutions: 1,
          successRate: {
            $cond: [
              { $eq: ['$totalExecutions', 0] },
              0,
              { $divide: ['$successfulExecutions', '$totalExecutions'] }
            ]
          },
          avgDuration: {
            $cond: [
              { $eq: ['$totalExecutions', 0] },
              0,
              { $divide: ['$totalDuration', '$totalExecutions'] }
            ]
          },
          avgEfficiency: 1
        }
      }
    ];

    const result = await this.collection.aggregate(pipeline).toArray();
    
    if (result.length === 0) {
      return {
        totalExecutions: 0,
        successRate: 0,
        avgDuration: 0,
        avgEfficiency: 0,
        topPerformingPatterns: [],
        commonFailures: []
      };
    }

    // Get top performing patterns and common failures
    const topPerformingPatterns = await this.getTopPerformingPatterns(workflowType, timeframeDays);
    const commonFailures = await this.getCommonFailures(workflowType, timeframeDays);

    return {
      totalExecutions: result[0]?.totalExecutions || 0,
      successRate: result[0]?.successRate || 0,
      avgDuration: result[0]?.avgDuration || 0,
      avgEfficiency: result[0]?.avgEfficiency || 0,
      topPerformingPatterns,
      commonFailures
    };
  }

  /**
   * Get routing performance by cognitive system
   */
  async getRoutingPerformanceBySystem(timeframeDays: number = 30): Promise<Array<{
    systemName: string;
    totalUsage: number;
    avgConfidence: number;
    successRate: number;
    avgDuration: number;
  }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeDays);

    const pipeline = [
      {
        $match: {
          workflowType: 'routing',
          timestamp: { $gte: startDate }
        }
      },
      { $unwind: '$routing.path.route' },
      {
        $group: {
          _id: '$routing.path.route.systemName',
          totalUsage: { $sum: 1 },
          avgConfidence: { $avg: '$routing.path.route.confidence' },
          successfulExecutions: {
            $sum: { $cond: [{ $eq: ['$routing.path.route.success', true] }, 1, 0] }
          },
          totalDuration: { $sum: '$routing.path.route.actualDuration' }
        }
      },
      {
        $project: {
          systemName: '$_id',
          totalUsage: 1,
          avgConfidence: 1,
          successRate: {
            $cond: [
              { $eq: ['$totalUsage', 0] },
              0,
              { $divide: ['$successfulExecutions', '$totalUsage'] }
            ]
          },
          avgDuration: {
            $cond: [
              { $eq: ['$totalUsage', 0] },
              0,
              { $divide: ['$totalDuration', '$totalUsage'] }
            ]
          }
        }
      },
      { $sort: { totalUsage: -1 } }
    ];

    return await this.collection.aggregate(pipeline).toArray() as {
      systemName: string;
      totalUsage: number;
      avgConfidence: number;
      successRate: number;
      avgDuration: number;
    }[];
  }

  /**
   * Get parallel execution patterns
   */
  async getParallelExecutionPatterns(timeframeDays: number = 30): Promise<Array<{
    strategy: string;
    totalExecutions: number;
    avgEfficiency: number;
    avgConcurrency: number;
    successRate: number;
  }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeDays);

    const pipeline = [
      {
        $match: {
          workflowType: 'parallel',
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$parallel.request.coordination.strategy',
          totalExecutions: { $sum: 1 },
          avgEfficiency: { $avg: '$parallel.performance.parallelEfficiency' },
          avgConcurrency: { $avg: '$parallel.request.optimization.maxConcurrency' },
          successfulExecutions: {
            $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          strategy: '$_id',
          totalExecutions: 1,
          avgEfficiency: 1,
          avgConcurrency: 1,
          successRate: {
            $cond: [
              { $eq: ['$totalExecutions', 0] },
              0,
              { $divide: ['$successfulExecutions', '$totalExecutions'] }
            ]
          }
        }
      },
      { $sort: { totalExecutions: -1 } }
    ];

    return await this.collection.aggregate(pipeline).toArray() as {
      strategy: string;
      totalExecutions: number;
      avgEfficiency: number;
      avgConcurrency: number;
      successRate: number;
    }[];
  }

  /**
   * Get workflow trends over time
   */
  async getWorkflowTrends(
    workflowType?: 'routing' | 'parallel' | 'evaluation',
    timeframeDays: number = 30
  ): Promise<Array<{
    date: Date;
    totalExecutions: number;
    successRate: number;
    avgDuration: number;
    avgEfficiency: number;
  }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeDays);

    const matchStage: any = { timestamp: { $gte: startDate } };
    if (workflowType) matchStage.workflowType = workflowType;

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          },
          totalExecutions: { $sum: 1 },
          successfulExecutions: {
            $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] }
          },
          totalDuration: { $sum: '$duration' },
          avgEfficiency: {
            $avg: {
              $cond: [
                { $eq: ['$workflowType', 'parallel'] },
                '$parallel.performance.parallelEfficiency',
                { $cond: [
                  { $eq: ['$workflowType', 'evaluation'] },
                  '$evaluation.metrics.efficiency',
                  0.8
                ]}
              ]
            }
          }
        }
      },
      {
        $project: {
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          totalExecutions: 1,
          successRate: {
            $cond: [
              { $eq: ['$totalExecutions', 0] },
              0,
              { $divide: ['$successfulExecutions', '$totalExecutions'] }
            ]
          },
          avgDuration: {
            $cond: [
              { $eq: ['$totalExecutions', 0] },
              0,
              { $divide: ['$totalDuration', '$totalExecutions'] }
            ]
          },
          avgEfficiency: 1
        }
      },
      { $sort: { date: 1 } }
    ];

    return await this.collection.aggregate(pipeline).toArray() as {
      date: Date;
      totalExecutions: number;
      successRate: number;
      avgDuration: number;
      avgEfficiency: number;
    }[];
  }

  /**
   * Get top performing patterns
   */
  private async getTopPerformingPatterns(workflowType?: string, timeframeDays: number = 30): Promise<any[]> {
    // Implementation for getting top performing patterns
    return [];
  }

  /**
   * Get common failures
   */
  private async getCommonFailures(workflowType?: string, timeframeDays: number = 30): Promise<any[]> {
    // Implementation for getting common failures
    return [];
  }

  /**
   * Clean up old workflow executions
   */
  async cleanupOldExecutions(daysToKeep: number = 180): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.collection.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    return result.deletedCount;
  }
}
