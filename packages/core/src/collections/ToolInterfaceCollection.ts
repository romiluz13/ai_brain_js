/**
 * @file ToolInterfaceCollection - MongoDB collection for tool execution tracking
 * 
 * This collection manages tool execution records, performance metrics, and validation
 * results using MongoDB's advanced indexing and aggregation capabilities.
 */

import { Db, Collection, ObjectId, CreateIndexesOptions } from 'mongodb';

export interface ToolExecution {
  _id?: ObjectId;
  executionId: ObjectId;
  agentId: string;
  sessionId?: string;
  toolName: string;
  toolVersion?: string;
  parameters: Record<string, any>;
  result?: any;
  success: boolean;
  error?: {
    type: string;
    message: string;
    code?: string;
    recoverable: boolean;
  };
  validation: {
    passed: boolean;
    score: number;
    issues: string[];
  };
  performance: {
    executionTime: number;
    memoryUsage?: number;
    retryCount: number;
    recoveryActions: string[];
  };
  humanInteraction?: {
    approvalRequired: boolean;
    approvalStatus: 'pending' | 'approved' | 'rejected';
    approver?: string;
    feedback?: string;
  };
  context: {
    taskId?: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    source: string;
    framework: string;
  };
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class ToolInterfaceCollection {
  private collection: Collection<ToolExecution>;

  constructor(private db: Db) {
    this.collection = db.collection<ToolExecution>('tool_executions');
  }

  /**
   * Create indexes for optimal query performance
   */
  async createIndexes(): Promise<void> {
    const indexes = [
      // Primary queries
      { key: { agentId: 1, timestamp: -1 } },
      { key: { toolName: 1, timestamp: -1 } },
      { key: { executionId: 1 }, options: { unique: true } },
      
      // Performance analytics
      { key: { toolName: 1, success: 1, timestamp: -1 } },
      { key: { 'context.priority': 1, timestamp: -1 } },
      
      // Human interaction tracking
      { key: { 'humanInteraction.approvalStatus': 1, timestamp: -1 } },
      
      // Compound indexes for complex queries
      { key: { agentId: 1, toolName: 1, timestamp: -1 } },
      { key: { success: 1, 'performance.executionTime': 1 } },
      
      // TTL index for automatic cleanup (optional)
      { 
        key: { createdAt: 1 }, 
        options: { 
          expireAfterSeconds: 60 * 60 * 24 * 90, // 90 days
          name: 'tool_execution_ttl'
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
   * Record a tool execution
   */
  async recordExecution(execution: Omit<ToolExecution, '_id' | 'createdAt' | 'updatedAt'>): Promise<ObjectId> {
    const now = new Date();
    const document: ToolExecution = {
      ...execution,
      createdAt: now,
      updatedAt: now
    };

    const result = await this.collection.insertOne(document);
    return result.insertedId;
  }

  /**
   * Get tool execution by ID
   */
  async getExecution(executionId: ObjectId): Promise<ToolExecution | null> {
    return await this.collection.findOne({ executionId });
  }

  /**
   * Get tool executions for an agent
   */
  async getAgentExecutions(
    agentId: string, 
    options: {
      limit?: number;
      skip?: number;
      toolName?: string;
      success?: boolean;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<ToolExecution[]> {
    const filter: any = { agentId };
    
    if (options.toolName) filter.toolName = options.toolName;
    if (options.success !== undefined) filter.success = options.success;
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
   * Get tool performance analytics
   */
  async getToolPerformanceAnalytics(
    toolName: string,
    timeframeDays: number = 30
  ): Promise<{
    totalExecutions: number;
    successRate: number;
    avgExecutionTime: number;
    errorRate: number;
    retryRate: number;
    humanInterventionRate: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeDays);

    const pipeline = [
      {
        $match: {
          toolName,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalExecutions: { $sum: 1 },
          successfulExecutions: {
            $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] }
          },
          totalExecutionTime: { $sum: '$performance.executionTime' },
          totalRetries: { $sum: '$performance.retryCount' },
          humanInterventions: {
            $sum: { $cond: [{ $eq: ['$humanInteraction.approvalRequired', true] }, 1, 0] }
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
          avgExecutionTime: {
            $cond: [
              { $eq: ['$totalExecutions', 0] },
              0,
              { $divide: ['$totalExecutionTime', '$totalExecutions'] }
            ]
          },
          errorRate: {
            $cond: [
              { $eq: ['$totalExecutions', 0] },
              0,
              { $divide: [{ $subtract: ['$totalExecutions', '$successfulExecutions'] }, '$totalExecutions'] }
            ]
          },
          retryRate: {
            $cond: [
              { $eq: ['$totalExecutions', 0] },
              0,
              { $divide: ['$totalRetries', '$totalExecutions'] }
            ]
          },
          humanInterventionRate: {
            $cond: [
              { $eq: ['$totalExecutions', 0] },
              0,
              { $divide: ['$humanInterventions', '$totalExecutions'] }
            ]
          }
        }
      }
    ];

    const result = await this.collection.aggregate(pipeline).toArray();
    
    if (result.length === 0) {
      return {
        totalExecutions: 0,
        successRate: 0,
        avgExecutionTime: 0,
        errorRate: 0,
        retryRate: 0,
        humanInterventionRate: 0
      };
    }

    return result[0] as {
      totalExecutions: number;
      successRate: number;
      avgExecutionTime: number;
      errorRate: number;
      retryRate: number;
      humanInterventionRate: number;
    };
  }

  /**
   * Get execution trends over time
   */
  async getExecutionTrends(
    toolName?: string,
    timeframeDays: number = 30
  ): Promise<Array<{
    date: Date;
    totalExecutions: number;
    successRate: number;
    avgExecutionTime: number;
  }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeDays);

    const matchStage: any = { timestamp: { $gte: startDate } };
    if (toolName) matchStage.toolName = toolName;

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
          totalExecutionTime: { $sum: '$performance.executionTime' }
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
          avgExecutionTime: {
            $cond: [
              { $eq: ['$totalExecutions', 0] },
              0,
              { $divide: ['$totalExecutionTime', '$totalExecutions'] }
            ]
          }
        }
      },
      { $sort: { date: 1 } }
    ];

    return await this.collection.aggregate(pipeline).toArray() as {
      date: Date;
      totalExecutions: number;
      successRate: number;
      avgExecutionTime: number;
    }[];
  }

  /**
   * Update execution status (for human approval workflows)
   */
  async updateExecutionStatus(
    executionId: ObjectId,
    updates: {
      humanInteraction?: {
        approvalStatus: 'pending' | 'approved' | 'rejected';
        approver?: string;
        feedback?: string;
      };
      success?: boolean;
      result?: any;
    }
  ): Promise<void> {
    const updateDoc: any = {
      updatedAt: new Date()
    };

    if (updates.humanInteraction) {
      updateDoc['humanInteraction.approvalStatus'] = updates.humanInteraction.approvalStatus;
      if (updates.humanInteraction.approver) {
        updateDoc['humanInteraction.approver'] = updates.humanInteraction.approver;
      }
      if (updates.humanInteraction.feedback) {
        updateDoc['humanInteraction.feedback'] = updates.humanInteraction.feedback;
      }
    }

    if (updates.success !== undefined) {
      updateDoc.success = updates.success;
    }

    if (updates.result) {
      updateDoc.result = updates.result;
    }

    await this.collection.updateOne(
      { executionId },
      { $set: updateDoc }
    );
  }

  /**
   * Get pending human approvals
   */
  async getPendingApprovals(approver?: string): Promise<ToolExecution[]> {
    const filter: any = {
      'humanInteraction.approvalStatus': 'pending'
    };

    if (approver) {
      filter['humanInteraction.approvers'] = approver;
    }

    return await this.collection
      .find(filter)
      .sort({ timestamp: 1 }) // Oldest first
      .toArray();
  }

  /**
   * Clean up old executions (manual cleanup)
   */
  async cleanupOldExecutions(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.collection.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    return result.deletedCount;
  }
}
