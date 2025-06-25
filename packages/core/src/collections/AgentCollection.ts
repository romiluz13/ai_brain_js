/**
 * @file AgentCollection - MongoDB collection operations for agents
 * 
 * This class provides CRUD operations and specialized queries for the agents collection,
 * implementing the complete agent lifecycle management with MongoDB.
 */

import { Collection, Db, ObjectId } from 'mongodb';
import { Agent, AgentConfiguration, AgentStatus } from '../types/index';
import { BaseCollection } from './BaseCollection';

export interface AgentFilter {
  status?: AgentStatus;
  framework?: string;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  lastActiveAfter?: Date;
  lastActiveBefore?: Date;
}

export interface AgentUpdateData {
  name?: string;
  description?: string;
  instructions?: string;
  status?: AgentStatus;
  configuration?: Partial<AgentConfiguration>;
  tags?: string[];
  metadata?: Record<string, any>;
  lastActiveAt?: Date;
}

/**
 * AgentCollection - Complete CRUD operations for agents
 * 
 * Features:
 * - Full agent lifecycle management
 * - Status tracking and updates
 * - Framework-specific agent queries
 * - Performance metrics integration
 * - Tag-based organization
 */
export class AgentCollection extends BaseCollection<Agent> {
  protected collectionName = 'agents';

  constructor(db: Db) {
    super(db);
    this.initializeCollection();
  }

  /**
   * Create a new agent
   */
  async createAgent(agentData: Omit<Agent, 'createdAt' | 'updatedAt'>): Promise<Agent> {
    const now = new Date();
    const agent: Agent = {
      ...agentData,
      _id: new ObjectId(),
      createdAt: now,
      updatedAt: now,
      status: agentData.status || AgentStatus.INACTIVE,
      lastActiveAt: agentData.lastActiveAt || now,
      metadata: agentData.metadata || {}
    };

    await this.validateDocument(agent);
    const result = await this.collection.insertOne(agent);
    
    if (!result.acknowledged) {
      throw new Error('Failed to create agent');
    }

    return agent;
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string | ObjectId): Promise<Agent | null> {
    const objectId = typeof agentId === 'string' ? new ObjectId(agentId) : agentId;
    return await this.collection.findOne({ _id: objectId });
  }

  /**
   * Get agent by name and framework
   */
  async getAgentByName(name: string, framework?: string): Promise<Agent | null> {
    const filter: any = { name };
    if (framework) {
      filter.framework = framework;
    }
    return await this.collection.findOne(filter);
  }

  /**
   * Update agent
   */
  async updateAgent(agentId: string | ObjectId, updateData: AgentUpdateData): Promise<Agent | null> {
    const objectId = typeof agentId === 'string' ? new ObjectId(agentId) : agentId;
    const now = new Date();

    const updateDoc = {
      ...updateData,
      updatedAt: now
    };

    const result = await this.collection.findOneAndUpdate(
      { _id: objectId },
      { $set: updateDoc as any },
      { returnDocument: 'after', includeResultMetadata: true } as const
    );

    return result.value;
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(agentId: string | ObjectId, status: AgentStatus): Promise<boolean> {
    const objectId = typeof agentId === 'string' ? new ObjectId(agentId) : agentId;
    const now = new Date();

    const result = await this.collection.updateOne(
      { _id: objectId },
      { 
        $set: { 
          status, 
          updatedAt: now,
          ...(status === 'active' ? { lastActiveAt: now } : {})
        }
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Update agent last active timestamp
   */
  async updateLastActive(agentId: string | ObjectId): Promise<boolean> {
    const objectId = typeof agentId === 'string' ? new ObjectId(agentId) : agentId;
    const now = new Date();

    const result = await this.collection.updateOne(
      { _id: objectId },
      { 
        $set: { 
          lastActiveAt: now,
          updatedAt: now,
          status: AgentStatus.ACTIVE
        }
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Delete agent
   */
  async deleteAgent(agentId: string | ObjectId): Promise<boolean> {
    const objectId = typeof agentId === 'string' ? new ObjectId(agentId) : agentId;
    const result = await this.collection.deleteOne({ _id: objectId });
    return result.deletedCount > 0;
  }

  /**
   * List agents with filtering and pagination
   */
  async listAgents(
    filter: AgentFilter = {},
    options: {
      limit?: number;
      skip?: number;
      sort?: Record<string, 1 | -1>;
    } = {}
  ): Promise<{ agents: Agent[]; total: number }> {
    const mongoFilter = this.buildMongoFilter(filter);
    
    const { limit = 50, skip = 0, sort = { createdAt: -1 } } = options;

    const [agents, total] = await Promise.all([
      this.collection
        .find(mongoFilter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments(mongoFilter)
    ]);

    return { agents, total };
  }

  /**
   * Get agents by framework
   */
  async getAgentsByFramework(framework: string): Promise<Agent[]> {
    return await this.collection.find({ framework }).toArray();
  }

  /**
   * Get active agents
   */
  async getActiveAgents(): Promise<Agent[]> {
    return await this.collection.find({ status: AgentStatus.ACTIVE }).toArray();
  }

  /**
   * Get agents by tags
   */
  async getAgentsByTags(tags: string[]): Promise<Agent[]> {
    return await this.collection.find({ tags: { $in: tags } }).toArray();
  }

  /**
   * Search agents by name or description
   */
  async searchAgents(query: string, limit: number = 20): Promise<Agent[]> {
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
   * Get agent statistics
   */
  async getAgentStats(): Promise<{
    total: number;
    byStatus: Record<AgentStatus, number>;
    byFramework: Record<string, number>;
    recentlyActive: number;
  }> {
    const pipeline = [
      {
        $facet: {
          total: [{ $count: 'count' }],
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          byFramework: [
            { $group: { _id: '$framework', count: { $sum: 1 } } }
          ],
          recentlyActive: [
            {
              $match: {
                lastActiveAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
              }
            },
            { $count: 'count' }
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
      recentlyActive: result.recentlyActive[0]?.count || 0
    };
  }

  /**
   * Cleanup inactive agents
   */
  async cleanupInactiveAgents(inactiveDays: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000);
    
    const result = await this.collection.deleteMany({
      status: AgentStatus.INACTIVE,
      lastActiveAt: { $lt: cutoffDate }
    });

    return result.deletedCount;
  }

  /**
   * Build MongoDB filter from AgentFilter
   */
  private buildMongoFilter(filter: AgentFilter): any {
    const mongoFilter: any = {};

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

    if (filter.lastActiveAfter || filter.lastActiveBefore) {
      mongoFilter.lastActiveAt = {};
      if (filter.lastActiveAfter) {
        mongoFilter.lastActiveAt.$gte = filter.lastActiveAfter;
      }
      if (filter.lastActiveBefore) {
        mongoFilter.lastActiveAt.$lte = filter.lastActiveBefore;
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
      this.collection.createIndex({ name: 1, framework: 1 }, { unique: true }),
      this.collection.createIndex({ status: 1 }),
      this.collection.createIndex({ framework: 1 }),
      this.collection.createIndex({ lastActiveAt: -1 }),
      this.collection.createIndex({ createdAt: -1 }),
      
      // Compound indexes
      this.collection.createIndex({ status: 1, framework: 1 }),
      this.collection.createIndex({ status: 1, lastActiveAt: -1 }),
      
      // Text search index
      this.collection.createIndex({ 
        name: 'text', 
        description: 'text' 
      }, { 
        name: 'agent_text_search' 
      }),
      
      // Tag index
      this.collection.createIndex({ tags: 1 })
    ]);
  }
}
