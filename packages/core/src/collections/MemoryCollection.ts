/**
 * @file MemoryCollection - MongoDB collection operations for agent memory
 * 
 * This class provides CRUD operations and specialized queries for agent memory,
 * implementing TTL (Time To Live) management and semantic search capabilities.
 */

import { Collection, Db, ObjectId } from 'mongodb';
import { AgentMemory, MemoryType, MemoryImportance } from '../types/index';
import { BaseCollection } from './BaseCollection';

export interface MemoryFilter {
  agentId?: string | ObjectId;
  conversationId?: string;
  memoryType?: MemoryType;
  importance?: MemoryImportance;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  expiresAfter?: Date;
  expiresBefore?: Date;
}

export interface MemoryUpdateData {
  content?: string;
  importance?: MemoryImportance;
  tags?: string[];
  metadata?: Record<string, any>;
  expiresAt?: Date;
  accessCount?: number;
  lastAccessedAt?: Date;
}

export interface MemorySearchOptions {
  limit?: number;
  minImportance?: MemoryImportance;
  includeExpired?: boolean;
  sortBy?: 'relevance' | 'importance' | 'recency' | 'access_count';
}

/**
 * MemoryCollection - Complete CRUD operations for agent memory
 * 
 * Features:
 * - TTL (Time To Live) memory management
 * - Semantic search with vector embeddings
 * - Memory importance scoring
 * - Conversation-based memory organization
 * - Automatic cleanup of expired memories
 */
export class MemoryCollection extends BaseCollection<AgentMemory> {
  protected collectionName = 'agent_memory';

  constructor(db: Db) {
    super(db);
    this.initializeCollection();
  }

  /**
   * Store a document (generic method for compatibility)
   */
  async storeDocument(content: string, metadata: Record<string, any> = {}): Promise<string> {
    const memoryData = {
      agentId: metadata.agentId || 'system',
      conversationId: metadata.conversationId || 'system',
      memoryType: metadata.type || 'document',
      content: content,
      importance: metadata.importance || 0.5,
      metadata: metadata
    };

    const memory = await this.createMemory(memoryData);
    return memory._id.toString();
  }

  /**
   * Create a new memory
   */
  async createMemory(memoryData: Omit<AgentMemory, '_id' | 'createdAt' | 'updatedAt'>): Promise<AgentMemory> {
    const now = new Date();
    const memory: AgentMemory = {
      ...memoryData,
      _id: new ObjectId(),
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
      lastAccessed: now
    };

    await this.validateDocument(memory);
    const result = await this.collection.insertOne(memory);
    
    if (!result.acknowledged) {
      throw new Error('Failed to create memory');
    }

    return memory;
  }

  /**
   * Get memory by ID
   */
  async getMemory(memoryId: string | ObjectId): Promise<AgentMemory | null> {
    const objectId = typeof memoryId === 'string' ? new ObjectId(memoryId) : memoryId;
    const memory = await this.collection.findOne({ _id: objectId });
    
    if (memory) {
      // Update access tracking
      await this.updateAccessTracking(memory._id!);
    }
    
    return memory;
  }

  /**
   * Update memory
   */
  async updateMemory(memoryId: string | ObjectId, updateData: MemoryUpdateData): Promise<AgentMemory | null> {
    const objectId = typeof memoryId === 'string' ? new ObjectId(memoryId) : memoryId;
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
   * Delete memory
   */
  async deleteMemory(memoryId: string | ObjectId): Promise<boolean> {
    const objectId = typeof memoryId === 'string' ? new ObjectId(memoryId) : memoryId;
    const result = await this.collection.deleteOne({ _id: objectId });
    return result.deletedCount > 0;
  }

  /**
   * Get memories for an agent
   */
  async getAgentMemories(
    agentId: string | ObjectId,
    options: {
      conversationId?: string;
      memoryType?: MemoryType;
      limit?: number;
      includeExpired?: boolean;
    } = {}
  ): Promise<AgentMemory[]> {
    const objectId = typeof agentId === 'string' ? new ObjectId(agentId) : agentId;
    const { conversationId, memoryType, limit = 100, includeExpired = false } = options;

    const filter: any = { agentId: objectId };
    
    if (conversationId) {
      filter.conversationId = conversationId;
    }
    
    if (memoryType) {
      filter.memoryType = memoryType;
    }
    
    if (!includeExpired) {
      filter.$or = [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ];
    }

    return await this.collection
      .find(filter)
      .sort({ importance: -1, createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Get conversation memories
   */
  async getConversationMemories(
    conversationId: string,
    options: {
      agentId?: string | ObjectId;
      limit?: number;
      includeExpired?: boolean;
    } = {}
  ): Promise<AgentMemory[]> {
    const { agentId, limit = 100, includeExpired = false } = options;

    const filter: any = { conversationId };
    
    if (agentId) {
      const objectId = typeof agentId === 'string' ? new ObjectId(agentId) : agentId;
      filter.agentId = objectId;
    }
    
    if (!includeExpired) {
      filter.$or = [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ];
    }

    return await this.collection
      .find(filter)
      .sort({ createdAt: 1 }) // Chronological order for conversations
      .limit(limit)
      .toArray();
  }

  /**
   * Search memories by content
   */
  async searchMemories(
    query: string,
    filter: MemoryFilter = {},
    options: MemorySearchOptions = {}
  ): Promise<AgentMemory[]> {
    const { limit = 20, minImportance, includeExpired = false, sortBy = 'relevance' } = options;

    const mongoFilter = this.buildMongoFilter(filter);
    
    // Add text search
    mongoFilter.$text = { $search: query };
    
    // Add importance filter
    if (minImportance) {
      mongoFilter.importance = { $gte: minImportance };
    }
    
    // Add expiration filter
    if (!includeExpired) {
      mongoFilter.$or = [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ];
    }

    // Determine sort order
    let sort: any;
    switch (sortBy) {
      case 'relevance':
        sort = { score: { $meta: 'textScore' } };
        break;
      case 'importance':
        sort = { importance: -1, createdAt: -1 };
        break;
      case 'recency':
        sort = { createdAt: -1 };
        break;
      case 'access_count':
        sort = { accessCount: -1, createdAt: -1 };
        break;
      default:
        sort = { score: { $meta: 'textScore' } };
    }

    return await this.collection
      .find(mongoFilter)
      .sort(sort)
      .limit(limit)
      .toArray();
  }

  /**
   * Get memories by importance
   */
  async getMemoriesByImportance(
    importance: MemoryImportance,
    filter: MemoryFilter = {},
    limit: number = 50
  ): Promise<AgentMemory[]> {
    const mongoFilter = this.buildMongoFilter(filter);
    mongoFilter.importance = importance;

    return await this.collection
      .find(mongoFilter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Update memory importance
   */
  async updateMemoryImportance(
    memoryId: string | ObjectId,
    importance: MemoryImportance
  ): Promise<boolean> {
    const objectId = typeof memoryId === 'string' ? new ObjectId(memoryId) : memoryId;
    
    const result = await this.collection.updateOne(
      { _id: objectId },
      { 
        $set: {
          importance: this.convertImportanceToNumber(importance),
          updatedAt: new Date()
        }
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Update access tracking
   */
  async updateAccessTracking(memoryId: string | ObjectId): Promise<boolean> {
    const objectId = typeof memoryId === 'string' ? new ObjectId(memoryId) : memoryId;
    
    const result = await this.collection.updateOne(
      { _id: objectId },
      { 
        $inc: { accessCount: 1 },
        $set: { lastAccessedAt: new Date() }
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Set memory expiration
   */
  async setMemoryExpiration(
    memoryId: string | ObjectId,
    expiresAt: Date | null
  ): Promise<boolean> {
    const objectId = typeof memoryId === 'string' ? new ObjectId(memoryId) : memoryId;
    
    const updateDoc: any = expiresAt
      ? { $set: { expiresAt, updatedAt: new Date() } }
      : { $unset: { expiresAt: 1 }, $set: { updatedAt: new Date() } };

    const result = await this.collection.updateOne(
      { _id: objectId },
      updateDoc
    );

    return result.modifiedCount > 0;
  }

  /**
   * Cleanup expired memories
   */
  async cleanupExpiredMemories(): Promise<number> {
    const result = await this.collection.deleteMany({
      expiresAt: { $lt: new Date() }
    });

    return result.deletedCount;
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats(agentId?: string | ObjectId): Promise<{
    total: number;
    byType: Record<MemoryType, number>;
    byImportance: Record<MemoryImportance, number>;
    expired: number;
    averageAccessCount: number;
  }> {
    const matchStage = agentId 
      ? { $match: { agentId: typeof agentId === 'string' ? new ObjectId(agentId) : agentId } }
      : { $match: {} };

    const pipeline = [
      matchStage,
      {
        $facet: {
          total: [{ $count: 'count' }],
          byType: [
            { $group: { _id: '$memoryType', count: { $sum: 1 } } }
          ],
          byImportance: [
            { $group: { _id: '$importance', count: { $sum: 1 } } }
          ],
          expired: [
            {
              $match: {
                expiresAt: { $lt: new Date() }
              }
            },
            { $count: 'count' }
          ],
          averageAccess: [
            { $group: { _id: null, avg: { $avg: '$accessCount' } } }
          ]
        }
      }
    ];

    const [result] = await this.collection.aggregate(pipeline).toArray();

    return {
      total: result.total[0]?.count || 0,
      byType: result.byType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byImportance: result.byImportance.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      expired: result.expired[0]?.count || 0,
      averageAccessCount: result.averageAccess[0]?.avg || 0
    };
  }

  /**
   * Build MongoDB filter from MemoryFilter
   */
  private buildMongoFilter(filter: MemoryFilter): any {
    const mongoFilter: any = {};

    if (filter.agentId) {
      const objectId = typeof filter.agentId === 'string' ? new ObjectId(filter.agentId) : filter.agentId;
      mongoFilter.agentId = objectId;
    }

    if (filter.conversationId) {
      mongoFilter.conversationId = filter.conversationId;
    }

    if (filter.memoryType) {
      mongoFilter.memoryType = filter.memoryType;
    }

    if (filter.importance) {
      mongoFilter.importance = filter.importance;
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

    if (filter.expiresAfter || filter.expiresBefore) {
      mongoFilter.expiresAt = {};
      if (filter.expiresAfter) {
        mongoFilter.expiresAt.$gte = filter.expiresAfter;
      }
      if (filter.expiresBefore) {
        mongoFilter.expiresAt.$lte = filter.expiresBefore;
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
      this.collection.createIndex({ agentId: 1, conversationId: 1 }),
      this.collection.createIndex({ agentId: 1, memoryType: 1 }),
      this.collection.createIndex({ conversationId: 1 }),
      this.collection.createIndex({ importance: -1 }),
      this.collection.createIndex({ createdAt: -1 }),
      this.collection.createIndex({ lastAccessedAt: -1 }),
      this.collection.createIndex({ accessCount: -1 }),
      
      // TTL index for automatic cleanup
      this.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      
      // Compound indexes
      this.collection.createIndex({ agentId: 1, importance: -1, createdAt: -1 }),
      this.collection.createIndex({ conversationId: 1, createdAt: 1 }),
      
      // Text search index
      this.collection.createIndex({ 
        content: 'text',
        'metadata.summary': 'text'
      }, { 
        name: 'memory_text_search',
        weights: { content: 10, 'metadata.summary': 5 }
      }),
      
      // Tag index
      this.collection.createIndex({ tags: 1 })
    ]);
  }

  /**
   * Convert MemoryImportance enum to number
   */
  private convertImportanceToNumber(importance: MemoryImportance): number {
    switch (importance) {
      case MemoryImportance.LOW: return 1;
      case MemoryImportance.MEDIUM: return 2;
      case MemoryImportance.HIGH: return 3;
      case MemoryImportance.CRITICAL: return 4;
      default: return 2;
    }
  }
}
