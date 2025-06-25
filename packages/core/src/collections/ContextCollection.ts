/**
 * @file ContextCollection - MongoDB collection for context management
 * 
 * This collection manages context items used for intelligent prompt enhancement.
 * It stores context with vector embeddings for semantic search and provides
 * efficient retrieval and management of contextual information.
 * 
 * Features:
 * - Context storage with vector embeddings
 * - Semantic search capabilities
 * - Context relevance scoring
 * - TTL (Time To Live) support
 * - Framework-specific context organization
 */

import { Db, ObjectId } from 'mongodb';
import { BaseCollection, BaseDocument } from './BaseCollection';

export interface ContextItem extends BaseDocument {
  contextId: string;
  content: string;
  source: string;
  relevanceScore: number;
  metadata: {
    type: 'conversation' | 'knowledge' | 'procedure' | 'example' | 'reference';
    framework: string;
    sessionId?: string;
    userId?: string;
    tags: string[];
    importance: number; // 0-1 scale
    confidence: number; // 0-1 scale
    lastUsed: Date;
    usageCount: number;
  };
  embedding?: {
    values: number[];
    model: string;
    dimensions: number;
  };
  ttl?: Date; // Time to live for temporary context
}

export interface ContextFilter {
  contextId?: string;
  source?: string;
  type?: ContextItem['metadata']['type'];
  framework?: string;
  sessionId?: string;
  userId?: string;
  tags?: string[];
  minRelevanceScore?: number;
  minImportance?: number;
  minConfidence?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  lastUsedAfter?: Date;
  lastUsedBefore?: Date;
}

export interface ContextUpdateData {
  content?: string;
  source?: string;
  relevanceScore?: number;
  metadata?: Partial<ContextItem['metadata']>;
  embedding?: ContextItem['embedding'];
  ttl?: Date;
}

export interface ContextSearchOptions {
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
  includeEmbeddings?: boolean;
  minRelevanceScore?: number;
}

/**
 * ContextCollection - Complete CRUD operations for context items
 * 
 * Features:
 * - Context lifecycle management
 * - Vector embedding storage and search
 * - Relevance scoring and optimization
 * - Framework-specific context queries
 * - TTL-based automatic cleanup
 */
export class ContextCollection extends BaseCollection<ContextItem> {
  protected collectionName = 'context_items';

  constructor(db: Db, collectionName?: string) {
    super(db);
    if (collectionName) {
      this.collectionName = collectionName;
    }
    this.initializeCollection();
  }

  /**
   * Create database indexes for optimal performance
   */
  async createIndexes(): Promise<void> {
    await Promise.all([
      // Primary indexes
      this.collection.createIndex({ contextId: 1 }, { unique: true }),
      this.collection.createIndex({ source: 1 }),
      this.collection.createIndex({ 'metadata.type': 1 }),
      this.collection.createIndex({ 'metadata.framework': 1 }),
      this.collection.createIndex({ 'metadata.sessionId': 1 }),
      this.collection.createIndex({ 'metadata.userId': 1 }),
      this.collection.createIndex({ 'metadata.tags': 1 }),
      
      // Performance indexes
      this.collection.createIndex({ relevanceScore: -1 }),
      this.collection.createIndex({ 'metadata.importance': -1 }),
      this.collection.createIndex({ 'metadata.confidence': -1 }),
      this.collection.createIndex({ 'metadata.lastUsed': -1 }),
      this.collection.createIndex({ 'metadata.usageCount': -1 }),
      
      // Compound indexes for common queries
      this.collection.createIndex({ 
        'metadata.framework': 1, 
        'metadata.type': 1, 
        relevanceScore: -1 
      }),
      this.collection.createIndex({ 
        'metadata.sessionId': 1, 
        'metadata.lastUsed': -1 
      }),
      this.collection.createIndex({ 
        'metadata.userId': 1, 
        'metadata.framework': 1,
        'metadata.lastUsed': -1 
      }),
      
      // TTL index for automatic cleanup
      this.collection.createIndex({ ttl: 1 }, { expireAfterSeconds: 0 }),
      
      // Vector search index (for MongoDB Atlas Vector Search)
      this.collection.createIndex({ 'embedding.values': '2dsphere' }),
      
      // Text search index
      this.collection.createIndex({ 
        content: 'text', 
        source: 'text',
        'metadata.tags': 'text'
      }, { name: 'context_text_index' })
    ]);
  }

  /**
   * Store a new context item
   */
  async storeContext(contextData: Omit<ContextItem, '_id' | 'createdAt' | 'updatedAt'>): Promise<ContextItem> {
    const context: Omit<ContextItem, '_id'> = {
      ...contextData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await this.collection.insertOne(context as ContextItem);
    return { ...context, _id: result.insertedId } as ContextItem;
  }

  /**
   * Find context items by filter
   */
  async findContext(
    filter: ContextFilter = {},
    options: ContextSearchOptions = {}
  ): Promise<ContextItem[]> {
    const mongoFilter = this.buildMongoFilter(filter);
    const { 
      limit = 50, 
      skip = 0, 
      sort = { 'metadata.lastUsed': -1 },
      includeEmbeddings = false,
      minRelevanceScore
    } = options;

    // Add relevance score filter if specified
    if (minRelevanceScore !== undefined) {
      mongoFilter.relevanceScore = { $gte: minRelevanceScore };
    }

    const projection = includeEmbeddings ? {} : { 'embedding.values': 0 };

    return await this.collection
      .find(mongoFilter, { projection })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  /**
   * Update context item
   */
  async updateContext(
    contextId: string,
    updateData: ContextUpdateData
  ): Promise<ContextItem | null> {
    return await this.updateOne(
      { contextId },
      {
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      }
    );
  }

  /**
   * Increment usage count and update last used timestamp
   */
  async recordContextUsage(contextId: string): Promise<ContextItem | null> {
    return await this.updateOne(
      { contextId },
      {
        $inc: { 'metadata.usageCount': 1 },
        $set: { 
          'metadata.lastUsed': new Date(),
          updatedAt: new Date()
        }
      }
    );
  }

  /**
   * Get context statistics
   */
  async getContextStats(): Promise<{
    totalContexts: number;
    contextsByType: Record<string, number>;
    contextsByFramework: Record<string, number>;
    averageRelevanceScore: number;
    averageUsageCount: number;
    recentlyUsed: number;
  }> {
    const pipeline = [
      {
        $facet: {
          totalCount: [{ $count: 'total' }],
          byType: [
            { $group: { _id: '$metadata.type', count: { $sum: 1 } } }
          ],
          byFramework: [
            { $group: { _id: '$metadata.framework', count: { $sum: 1 } } }
          ],
          averageRelevance: [
            { $group: { _id: null, avg: { $avg: '$relevanceScore' } } }
          ],
          averageUsage: [
            { $group: { _id: null, avg: { $avg: '$metadata.usageCount' } } }
          ],
          recentlyUsed: [
            {
              $match: {
                'metadata.lastUsed': {
                  $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                }
              }
            },
            { $count: 'recent' }
          ]
        }
      }
    ];

    const results = await this.collection.aggregate(pipeline).toArray();
    const facetResults = results[0];

    return {
      totalContexts: facetResults.totalCount[0]?.total || 0,
      contextsByType: this.arrayToRecord(facetResults.byType),
      contextsByFramework: this.arrayToRecord(facetResults.byFramework),
      averageRelevanceScore: facetResults.averageRelevance[0]?.avg || 0,
      averageUsageCount: facetResults.averageUsage[0]?.avg || 0,
      recentlyUsed: facetResults.recentlyUsed[0]?.recent || 0
    };
  }

  /**
   * Clean up expired context items
   */
  async cleanupExpiredContext(): Promise<number> {
    const result = await this.collection.deleteMany({
      ttl: { $lte: new Date() }
    });
    return result.deletedCount;
  }

  /**
   * Clean up old unused context items
   */
  async cleanupUnusedContext(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    
    const result = await this.collection.deleteMany({
      $and: [
        { 'metadata.lastUsed': { $lt: cutoffDate } },
        { 'metadata.usageCount': { $lte: 1 } },
        { 'metadata.importance': { $lt: 0.3 } }
      ]
    });
    
    return result.deletedCount;
  }

  /**
   * Initialize collection with proper setup
   */
  async initialize(): Promise<void> {
    await this.createIndexes();
    console.log(`✅ ContextCollection (${this.collectionName}) initialized`);
  }

  // Private helper methods

  private buildMongoFilter(filter: ContextFilter): any {
    const mongoFilter: any = {};

    if (filter.contextId) mongoFilter.contextId = filter.contextId;
    if (filter.source) mongoFilter.source = filter.source;
    if (filter.type) mongoFilter['metadata.type'] = filter.type;
    if (filter.framework) mongoFilter['metadata.framework'] = filter.framework;
    if (filter.sessionId) mongoFilter['metadata.sessionId'] = filter.sessionId;
    if (filter.userId) mongoFilter['metadata.userId'] = filter.userId;
    if (filter.tags && filter.tags.length > 0) {
      mongoFilter['metadata.tags'] = { $in: filter.tags };
    }
    if (filter.minRelevanceScore !== undefined) {
      mongoFilter.relevanceScore = { $gte: filter.minRelevanceScore };
    }
    if (filter.minImportance !== undefined) {
      mongoFilter['metadata.importance'] = { $gte: filter.minImportance };
    }
    if (filter.minConfidence !== undefined) {
      mongoFilter['metadata.confidence'] = { $gte: filter.minConfidence };
    }

    // Date range filters
    if (filter.createdAfter || filter.createdBefore) {
      mongoFilter.createdAt = {};
      if (filter.createdAfter) mongoFilter.createdAt.$gte = filter.createdAfter;
      if (filter.createdBefore) mongoFilter.createdAt.$lte = filter.createdBefore;
    }

    if (filter.lastUsedAfter || filter.lastUsedBefore) {
      mongoFilter['metadata.lastUsed'] = {};
      if (filter.lastUsedAfter) mongoFilter['metadata.lastUsed'].$gte = filter.lastUsedAfter;
      if (filter.lastUsedBefore) mongoFilter['metadata.lastUsed'].$lte = filter.lastUsedBefore;
    }

    return mongoFilter;
  }

  private arrayToRecord(array: any[]): Record<string, number> {
    const record: Record<string, number> = {};
    array.forEach(item => {
      record[item._id] = item.count;
    });
    return record;
  }
}
