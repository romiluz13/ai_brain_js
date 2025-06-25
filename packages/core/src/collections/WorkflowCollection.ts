/**
 * @file WorkflowCollection - MongoDB collection operations for agent workflows
 * 
 * This class provides CRUD operations and specialized queries for agent workflows,
 * implementing workflow state management and execution tracking.
 */

import { Collection, Db, ObjectId } from 'mongodb';
import { AgentWorkflow, WorkflowStatus, WorkflowStep } from '../types/index';
import { BaseCollection } from './BaseCollection';

export interface WorkflowFilter {
  agentId?: string | ObjectId;
  status?: WorkflowStatus;
  framework?: string;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  startedAfter?: Date;
  startedBefore?: Date;
  completedAfter?: Date;
  completedBefore?: Date;
}

export interface WorkflowUpdateData {
  name?: string;
  description?: string;
  status?: WorkflowStatus;
  currentStepIndex?: number;
  steps?: WorkflowStep[];
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
  tags?: string[];
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface WorkflowExecutionOptions {
  resumeFromStep?: number;
  variables?: Record<string, any>;
  timeout?: number;
}

/**
 * WorkflowCollection - Complete CRUD operations for agent workflows
 * 
 * Features:
 * - Workflow state management
 * - Step-by-step execution tracking
 * - Error handling and recovery
 * - Variable management
 * - Performance monitoring
 */
export class WorkflowCollection extends BaseCollection<AgentWorkflow> {
  protected collectionName = 'agent_workflows';

  constructor(db: Db) {
    super(db);
    this.initializeCollection();
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(workflowData: Omit<AgentWorkflow, '_id' | 'createdAt' | 'updatedAt'>): Promise<AgentWorkflow> {
    const now = new Date();
    const workflow: AgentWorkflow = {
      ...workflowData,
      _id: new ObjectId(),
      createdAt: now,
      updatedAt: now,
      status: workflowData.status || 'pending',
      currentStepIndex: 0,
      variables: workflowData.variables || {},
      metadata: workflowData.metadata || {}
    };

    await this.validateDocument(workflow);
    const result = await this.collection.insertOne(workflow);
    
    if (!result.acknowledged) {
      throw new Error('Failed to create workflow');
    }

    return workflow;
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(workflowId: string | ObjectId): Promise<AgentWorkflow | null> {
    const objectId = typeof workflowId === 'string' ? new ObjectId(workflowId) : workflowId;
    return await this.collection.findOne({ _id: objectId });
  }

  /**
   * Update workflow
   */
  async updateWorkflow(workflowId: string | ObjectId, updateData: WorkflowUpdateData): Promise<AgentWorkflow | null> {
    const objectId = typeof workflowId === 'string' ? new ObjectId(workflowId) : workflowId;
    const now = new Date();

    const updateDoc = {
      ...updateData,
      updatedAt: now
    };

    const result = await this.collection.findOneAndUpdate(
      { _id: objectId },
      { $set: updateDoc },
      { returnDocument: 'after' }
    );

    return result.value;
  }

  /**
   * Update workflow status
   */
  async updateWorkflowStatus(
    workflowId: string | ObjectId,
    status: WorkflowStatus,
    error?: string
  ): Promise<boolean> {
    const objectId = typeof workflowId === 'string' ? new ObjectId(workflowId) : workflowId;
    const now = new Date();

    const updateDoc: any = {
      status,
      updatedAt: now
    };

    if (status === 'running' && !await this.hasStartedAt(objectId)) {
      updateDoc.startedAt = now;
    }

    if (status === 'completed' || status === 'failed') {
      updateDoc.completedAt = now;
    }

    if (error) {
      updateDoc.error = error;
    }

    const result = await this.collection.updateOne(
      { _id: objectId },
      { $set: updateDoc }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Update current step
   */
  async updateCurrentStep(
    workflowId: string | ObjectId,
    stepIndex: number,
    stepResult?: any
  ): Promise<boolean> {
    const objectId = typeof workflowId === 'string' ? new ObjectId(workflowId) : workflowId;
    const now = new Date();

    const updateDoc: any = {
      currentStepIndex: stepIndex,
      updatedAt: now
    };

    // Update step result if provided
    if (stepResult !== undefined) {
      updateDoc[`steps.${stepIndex}.result`] = stepResult;
      updateDoc[`steps.${stepIndex}.completedAt`] = now;
    }

    const result = await this.collection.updateOne(
      { _id: objectId },
      { $set: updateDoc }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Update workflow variables
   */
  async updateWorkflowVariables(
    workflowId: string | ObjectId,
    variables: Record<string, any>
  ): Promise<boolean> {
    const objectId = typeof workflowId === 'string' ? new ObjectId(workflowId) : workflowId;

    const result = await this.collection.updateOne(
      { _id: objectId },
      { 
        $set: { 
          variables,
          updatedAt: new Date()
        }
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Add step result
   */
  async addStepResult(
    workflowId: string | ObjectId,
    stepIndex: number,
    result: any,
    error?: string
  ): Promise<boolean> {
    const objectId = typeof workflowId === 'string' ? new ObjectId(workflowId) : workflowId;
    const now = new Date();

    const updateDoc: any = {
      [`steps.${stepIndex}.result`]: result,
      [`steps.${stepIndex}.completedAt`]: now,
      updatedAt: now
    };

    if (error) {
      updateDoc[`steps.${stepIndex}.error`] = error;
    }

    const updateResult = await this.collection.updateOne(
      { _id: objectId },
      { $set: updateDoc }
    );

    return updateResult.modifiedCount > 0;
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(workflowId: string | ObjectId): Promise<boolean> {
    const objectId = typeof workflowId === 'string' ? new ObjectId(workflowId) : workflowId;
    const result = await this.collection.deleteOne({ _id: objectId });
    return result.deletedCount > 0;
  }

  /**
   * List workflows with filtering and pagination
   */
  async listWorkflows(
    filter: WorkflowFilter = {},
    options: {
      limit?: number;
      skip?: number;
      sort?: Record<string, 1 | -1>;
    } = {}
  ): Promise<{ workflows: AgentWorkflow[]; total: number }> {
    const mongoFilter = this.buildMongoFilter(filter);
    
    const { limit = 50, skip = 0, sort = { createdAt: -1 } } = options;

    const [workflows, total] = await Promise.all([
      this.collection
        .find(mongoFilter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments(mongoFilter)
    ]);

    return { workflows, total };
  }

  /**
   * Get workflows by agent
   */
  async getAgentWorkflows(
    agentId: string | ObjectId,
    status?: WorkflowStatus
  ): Promise<AgentWorkflow[]> {
    const objectId = typeof agentId === 'string' ? new ObjectId(agentId) : agentId;
    const filter: any = { agentId: objectId };
    
    if (status) {
      filter.status = status;
    }

    return await this.collection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();
  }

  /**
   * Get running workflows
   */
  async getRunningWorkflows(): Promise<AgentWorkflow[]> {
    return await this.collection
      .find({ status: 'running' })
      .sort({ startedAt: 1 })
      .toArray();
  }

  /**
   * Get workflows by status
   */
  async getWorkflowsByStatus(status: WorkflowStatus): Promise<AgentWorkflow[]> {
    return await this.collection
      .find({ status })
      .sort({ createdAt: -1 })
      .toArray();
  }

  /**
   * Search workflows
   */
  async searchWorkflows(query: string, limit: number = 20): Promise<AgentWorkflow[]> {
    const searchFilter = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    };

    return await this.collection
      .find(searchFilter)
      .limit(limit)
      .toArray();
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStats(agentId?: string | ObjectId): Promise<{
    total: number;
    byStatus: Record<WorkflowStatus, number>;
    byFramework: Record<string, number>;
    averageExecutionTime: number;
    successRate: number;
  }> {
    const matchStage = agentId 
      ? { $match: { agentId: typeof agentId === 'string' ? new ObjectId(agentId) : agentId } }
      : { $match: {} };

    const pipeline = [
      matchStage,
      {
        $facet: {
          total: [{ $count: 'count' }],
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          byFramework: [
            { $group: { _id: '$framework', count: { $sum: 1 } } }
          ],
          executionTimes: [
            {
              $match: {
                startedAt: { $exists: true },
                completedAt: { $exists: true }
              }
            },
            {
              $project: {
                executionTime: {
                  $subtract: ['$completedAt', '$startedAt']
                }
              }
            },
            {
              $group: {
                _id: null,
                avgTime: { $avg: '$executionTime' }
              }
            }
          ],
          successRate: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                completed: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
                  }
                }
              }
            },
            {
              $project: {
                rate: {
                  $cond: [
                    { $eq: ['$total', 0] },
                    0,
                    { $divide: ['$completed', '$total'] }
                  ]
                }
              }
            }
          ]
        }
      }
    ];

    const [result] = await this.collection.aggregate(pipeline).toArray();

    return {
      total: result.total[0]?.count || 0,
      byStatus: result.byStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byFramework: result.byFramework.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      averageExecutionTime: result.executionTimes[0]?.avgTime || 0,
      successRate: result.successRate[0]?.rate || 0
    };
  }

  /**
   * Cleanup old workflows
   */
  async cleanupOldWorkflows(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    const result = await this.collection.deleteMany({
      status: { $in: ['completed', 'failed', 'cancelled'] },
      completedAt: { $lt: cutoffDate }
    });

    return result.deletedCount;
  }

  /**
   * Check if workflow has started
   */
  private async hasStartedAt(workflowId: ObjectId): Promise<boolean> {
    const workflow = await this.collection.findOne(
      { _id: workflowId },
      { projection: { startedAt: 1 } }
    );
    return !!(workflow?.startedAt);
  }

  /**
   * Build MongoDB filter from WorkflowFilter
   */
  private buildMongoFilter(filter: WorkflowFilter): any {
    const mongoFilter: any = {};

    if (filter.agentId) {
      const objectId = typeof filter.agentId === 'string' ? new ObjectId(filter.agentId) : filter.agentId;
      mongoFilter.agentId = objectId;
    }

    if (filter.status) {
      mongoFilter.status = filter.status;
    }

    if (filter.framework) {
      mongoFilter.framework = filter.framework;
    }

    if (filter.tags && filter.tags.length > 0) {
      mongoFilter.tags = { $in: filter.tags };
    }

    if (filter.createdAfter || filter.createdBefore) {
      mongoFilter.createdAt = {};
      if (filter.createdAfter) {
        mongoFilter.createdAt.$gte = filter.createdAfter;
      }
      if (filter.createdBefore) {
        mongoFilter.createdAt.$lte = filter.createdBefore;
      }
    }

    if (filter.startedAfter || filter.startedBefore) {
      mongoFilter.startedAt = {};
      if (filter.startedAfter) {
        mongoFilter.startedAt.$gte = filter.startedAfter;
      }
      if (filter.startedBefore) {
        mongoFilter.startedAt.$lte = filter.startedBefore;
      }
    }

    if (filter.completedAfter || filter.completedBefore) {
      mongoFilter.completedAt = {};
      if (filter.completedAfter) {
        mongoFilter.completedAt.$gte = filter.completedAfter;
      }
      if (filter.completedBefore) {
        mongoFilter.completedAt.$lte = filter.completedBefore;
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
      this.collection.createIndex({ agentId: 1, status: 1 }),
      this.collection.createIndex({ status: 1 }),
      this.collection.createIndex({ framework: 1 }),
      this.collection.createIndex({ createdAt: -1 }),
      this.collection.createIndex({ startedAt: -1 }),
      this.collection.createIndex({ completedAt: -1 }),
      
      // Compound indexes
      this.collection.createIndex({ agentId: 1, createdAt: -1 }),
      this.collection.createIndex({ status: 1, startedAt: 1 }),
      this.collection.createIndex({ status: 1, completedAt: -1 }),
      
      // Text search index
      this.collection.createIndex({ 
        name: 'text', 
        description: 'text' 
      }, { 
        name: 'workflow_text_search' 
      }),
      
      // Tag index
      this.collection.createIndex({ tags: 1 })
    ]);
  }
}
