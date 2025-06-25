/**
 * @file ToolCollection - MongoDB collection operations for agent tools
 * 
 * This class provides CRUD operations and specialized queries for agent tools,
 * implementing tool execution tracking, rate limiting, and cost monitoring.
 */

import { Collection, Db, ObjectId } from 'mongodb';
import { AgentTool, ToolExecution, ToolStatus } from '../types/index';
import { BaseCollection } from './BaseCollection';

export interface ToolFilter {
  agentId?: string | ObjectId;
  status?: ToolStatus;
  category?: string;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  lastUsedAfter?: Date;
  lastUsedBefore?: Date;
}

export interface ToolUpdateData {
  name?: string;
  description?: string;
  status?: ToolStatus;
  configuration?: Record<string, any>;
  rateLimits?: {
    maxCallsPerMinute?: number;
    maxCallsPerHour?: number;
    maxCallsPerDay?: number;
  };
  costTracking?: {
    costPerCall?: number;
    currency?: string;
  };
  tags?: string[];
  metadata?: Record<string, any>;
  lastUsedAt?: Date;
}

export interface ToolExecutionFilter {
  toolId?: string | ObjectId;
  agentId?: string | ObjectId;
  status?: 'pending' | 'running' | 'completed' | 'failed';
  executedAfter?: Date;
  executedBefore?: Date;
}

/**
 * ToolCollection - Complete CRUD operations for agent tools
 * 
 * Features:
 * - Tool lifecycle management
 * - Execution tracking and monitoring
 * - Rate limiting enforcement
 * - Cost tracking and analysis
 * - Performance metrics
 */
export class ToolCollection extends BaseCollection<AgentTool> {
  protected collectionName = 'agent_tools';
  private executionCollection: Collection<ToolExecution>;

  constructor(db: Db) {
    super(db);
    this.initializeCollection();
    this.executionCollection = db.collection<ToolExecution>('tool_executions');
  }

  /**
   * Create a new tool
   */
  async createTool(toolData: Omit<AgentTool, '_id' | 'createdAt' | 'updatedAt'>): Promise<AgentTool> {
    const now = new Date();
    const tool: AgentTool = {
      ...toolData,
      _id: new ObjectId(),
      createdAt: now,
      updatedAt: now,
      status: toolData.status || 'active',
      executionCount: 0,
      totalCost: 0,
      metadata: toolData.metadata || {}
    };

    await this.validateDocument(tool);
    const result = await this.collection.insertOne(tool);
    
    if (!result.acknowledged) {
      throw new Error('Failed to create tool');
    }

    return tool;
  }

  /**
   * Get tool by ID
   */
  async getTool(toolId: string | ObjectId): Promise<AgentTool | null> {
    const objectId = typeof toolId === 'string' ? new ObjectId(toolId) : toolId;
    return await this.collection.findOne({ _id: objectId });
  }

  /**
   * Get tool by name and agent
   */
  async getToolByName(name: string, agentId?: string | ObjectId): Promise<AgentTool | null> {
    const filter: any = { name };
    if (agentId) {
      const objectId = typeof agentId === 'string' ? new ObjectId(agentId) : agentId;
      filter.agentId = objectId;
    }
    return await this.collection.findOne(filter);
  }

  /**
   * Update tool
   */
  async updateTool(toolId: string | ObjectId, updateData: ToolUpdateData): Promise<AgentTool | null> {
    const objectId = typeof toolId === 'string' ? new ObjectId(toolId) : toolId;
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
   * Update tool status
   */
  async updateToolStatus(toolId: string | ObjectId, status: ToolStatus): Promise<boolean> {
    const objectId = typeof toolId === 'string' ? new ObjectId(toolId) : toolId;
    
    const result = await this.collection.updateOne(
      { _id: objectId },
      { 
        $set: { 
          status,
          updatedAt: new Date()
        }
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Delete tool
   */
  async deleteTool(toolId: string | ObjectId): Promise<boolean> {
    const objectId = typeof toolId === 'string' ? new ObjectId(toolId) : toolId;
    const result = await this.collection.deleteOne({ _id: objectId });
    return result.deletedCount > 0;
  }

  /**
   * List tools with filtering and pagination
   */
  async listTools(
    filter: ToolFilter = {},
    options: {
      limit?: number;
      skip?: number;
      sort?: Record<string, 1 | -1>;
    } = {}
  ): Promise<{ tools: AgentTool[]; total: number }> {
    const mongoFilter = this.buildMongoFilter(filter);
    
    const { limit = 50, skip = 0, sort = { createdAt: -1 } } = options;

    const [tools, total] = await Promise.all([
      this.collection
        .find(mongoFilter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments(mongoFilter)
    ]);

    return { tools, total };
  }

  /**
   * Get tools by agent
   */
  async getAgentTools(agentId: string | ObjectId, status?: ToolStatus): Promise<AgentTool[]> {
    const objectId = typeof agentId === 'string' ? new ObjectId(agentId) : agentId;
    const filter: any = { agentId: objectId };
    
    if (status) {
      filter.status = status;
    }

    return await this.collection
      .find(filter)
      .sort({ name: 1 })
      .toArray();
  }

  /**
   * Get tools by category
   */
  async getToolsByCategory(category: string): Promise<AgentTool[]> {
    return await this.collection
      .find({ category })
      .sort({ name: 1 })
      .toArray();
  }

  /**
   * Search tools
   */
  async searchTools(query: string, limit: number = 20): Promise<AgentTool[]> {
    const searchFilter = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } }
      ]
    };

    return await this.collection
      .find(searchFilter)
      .limit(limit)
      .toArray();
  }

  /**
   * Record tool execution
   */
  async recordExecution(executionData: Omit<ToolExecution, '_id' | 'createdAt'>): Promise<ToolExecution> {
    const now = new Date();
    const execution: ToolExecution = {
      ...executionData,
      _id: new ObjectId(),
      createdAt: now
    };

    const result = await this.executionCollection.insertOne(execution);
    
    if (!result.acknowledged) {
      throw new Error('Failed to record tool execution');
    }

    // Update tool statistics
    await this.updateToolStats(execution.toolId, execution.cost || 0);

    return execution;
  }

  /**
   * Update tool statistics after execution
   */
  async updateToolStats(toolId: string | ObjectId, cost: number = 0): Promise<boolean> {
    const objectId = typeof toolId === 'string' ? new ObjectId(toolId) : toolId;
    
    const result = await this.collection.updateOne(
      { _id: objectId },
      { 
        $inc: { 
          executionCount: 1,
          totalCost: cost
        },
        $set: { 
          lastUsedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Check rate limits for tool
   */
  async checkRateLimit(toolId: string | ObjectId): Promise<{
    allowed: boolean;
    limits: {
      perMinute: { current: number; max: number; allowed: boolean };
      perHour: { current: number; max: number; allowed: boolean };
      perDay: { current: number; max: number; allowed: boolean };
    };
  }> {
    const objectId = typeof toolId === 'string' ? new ObjectId(toolId) : toolId;
    
    // Get tool rate limits
    const tool = await this.collection.findOne(
      { _id: objectId },
      { projection: { rateLimits: 1 } }
    );

    if (!tool?.rateLimits) {
      return {
        allowed: true,
        limits: {
          perMinute: { current: 0, max: Infinity, allowed: true },
          perHour: { current: 0, max: Infinity, allowed: true },
          perDay: { current: 0, max: Infinity, allowed: true }
        }
      };
    }

    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Count executions in different time windows
    const [perMinute, perHour, perDay] = await Promise.all([
      this.executionCollection.countDocuments({
        toolId: objectId,
        createdAt: { $gte: oneMinuteAgo }
      }),
      this.executionCollection.countDocuments({
        toolId: objectId,
        createdAt: { $gte: oneHourAgo }
      }),
      this.executionCollection.countDocuments({
        toolId: objectId,
        createdAt: { $gte: oneDayAgo }
      })
    ]);

    const limits = {
      perMinute: {
        current: perMinute,
        max: tool.rateLimits.maxCallsPerMinute || Infinity,
        allowed: perMinute < (tool.rateLimits.maxCallsPerMinute || Infinity)
      },
      perHour: {
        current: perHour,
        max: tool.rateLimits.maxCallsPerHour || Infinity,
        allowed: perHour < (tool.rateLimits.maxCallsPerHour || Infinity)
      },
      perDay: {
        current: perDay,
        max: tool.rateLimits.maxCallsPerDay || Infinity,
        allowed: perDay < (tool.rateLimits.maxCallsPerDay || Infinity)
      }
    };

    const allowed = limits.perMinute.allowed && limits.perHour.allowed && limits.perDay.allowed;

    return { allowed, limits };
  }

  /**
   * Get tool executions
   */
  async getToolExecutions(
    filter: ToolExecutionFilter = {},
    options: {
      limit?: number;
      skip?: number;
      sort?: Record<string, 1 | -1>;
    } = {}
  ): Promise<{ executions: ToolExecution[]; total: number }> {
    const mongoFilter = this.buildExecutionFilter(filter);
    
    const { limit = 50, skip = 0, sort = { createdAt: -1 } } = options;

    const [executions, total] = await Promise.all([
      this.executionCollection
        .find(mongoFilter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.executionCollection.countDocuments(mongoFilter)
    ]);

    return { executions, total };
  }

  /**
   * Get tool statistics
   */
  async getToolStats(toolId?: string | ObjectId): Promise<{
    total: number;
    byStatus: Record<ToolStatus, number>;
    byCategory: Record<string, number>;
    totalExecutions: number;
    totalCost: number;
    averageCostPerExecution: number;
    mostUsedTools: Array<{ name: string; executionCount: number }>;
  }> {
    const matchStage = toolId 
      ? { $match: { _id: typeof toolId === 'string' ? new ObjectId(toolId) : toolId } }
      : { $match: {} };

    const pipeline = [
      matchStage,
      {
        $facet: {
          total: [{ $count: 'count' }],
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          byCategory: [
            { $group: { _id: '$category', count: { $sum: 1 } } }
          ],
          totals: [
            {
              $group: {
                _id: null,
                totalExecutions: { $sum: '$executionCount' },
                totalCost: { $sum: '$totalCost' }
              }
            }
          ],
          mostUsed: [
            { $sort: { executionCount: -1 } },
            { $limit: 10 },
            {
              $project: {
                name: 1,
                executionCount: 1
              }
            }
          ]
        }
      }
    ];

    const [result] = await this.collection.aggregate(pipeline).toArray();

    const totals = result.totals[0] || { totalExecutions: 0, totalCost: 0 };

    return {
      total: result.total[0]?.count || 0,
      byStatus: result.byStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byCategory: result.byCategory.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      totalExecutions: totals.totalExecutions,
      totalCost: totals.totalCost,
      averageCostPerExecution: totals.totalExecutions > 0 
        ? totals.totalCost / totals.totalExecutions 
        : 0,
      mostUsedTools: result.mostUsed
    };
  }

  /**
   * Cleanup old executions
   */
  async cleanupOldExecutions(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    const result = await this.executionCollection.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    return result.deletedCount;
  }

  /**
   * Build MongoDB filter from ToolFilter
   */
  private buildMongoFilter(filter: ToolFilter): any {
    const mongoFilter: any = {};

    if (filter.agentId) {
      const objectId = typeof filter.agentId === 'string' ? new ObjectId(filter.agentId) : filter.agentId;
      mongoFilter.agentId = objectId;
    }

    if (filter.status) {
      mongoFilter.status = filter.status;
    }

    if (filter.category) {
      mongoFilter.category = filter.category;
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

    if (filter.lastUsedAfter || filter.lastUsedBefore) {
      mongoFilter.lastUsedAt = {};
      if (filter.lastUsedAfter) {
        mongoFilter.lastUsedAt.$gte = filter.lastUsedAfter;
      }
      if (filter.lastUsedBefore) {
        mongoFilter.lastUsedAt.$lte = filter.lastUsedBefore;
      }
    }

    return mongoFilter;
  }

  /**
   * Build MongoDB filter from ToolExecutionFilter
   */
  private buildExecutionFilter(filter: ToolExecutionFilter): any {
    const mongoFilter: any = {};

    if (filter.toolId) {
      const objectId = typeof filter.toolId === 'string' ? new ObjectId(filter.toolId) : filter.toolId;
      mongoFilter.toolId = objectId;
    }

    if (filter.agentId) {
      const objectId = typeof filter.agentId === 'string' ? new ObjectId(filter.agentId) : filter.agentId;
      mongoFilter.agentId = objectId;
    }

    if (filter.status) {
      mongoFilter.status = filter.status;
    }

    if (filter.executedAfter || filter.executedBefore) {
      mongoFilter.createdAt = {};
      if (filter.executedAfter) {
        mongoFilter.createdAt.$gte = filter.executedAfter;
      }
      if (filter.executedBefore) {
        mongoFilter.createdAt.$lte = filter.executedBefore;
      }
    }

    return mongoFilter;
  }

  /**
   * Create indexes for optimal performance
   */
  async createIndexes(): Promise<void> {
    // Tool collection indexes
    await Promise.all([
      // Primary indexes
      this.collection.createIndex({ agentId: 1, name: 1 }, { unique: true }),
      this.collection.createIndex({ status: 1 }),
      this.collection.createIndex({ category: 1 }),
      this.collection.createIndex({ createdAt: -1 }),
      this.collection.createIndex({ lastUsedAt: -1 }),
      this.collection.createIndex({ executionCount: -1 }),
      
      // Compound indexes
      this.collection.createIndex({ agentId: 1, status: 1 }),
      this.collection.createIndex({ category: 1, status: 1 }),
      
      // Text search index
      this.collection.createIndex({ 
        name: 'text', 
        description: 'text',
        category: 'text'
      }, { 
        name: 'tool_text_search' 
      }),
      
      // Tag index
      this.collection.createIndex({ tags: 1 })
    ]);

    // Tool execution collection indexes
    await Promise.all([
      this.executionCollection.createIndex({ toolId: 1, createdAt: -1 }),
      this.executionCollection.createIndex({ agentId: 1, createdAt: -1 }),
      this.executionCollection.createIndex({ status: 1 }),
      this.executionCollection.createIndex({ createdAt: -1 }),
      
      // Compound indexes for rate limiting
      this.executionCollection.createIndex({ toolId: 1, createdAt: 1 })
    ]);
  }
}
