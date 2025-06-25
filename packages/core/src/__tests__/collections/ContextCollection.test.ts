/**
 * @file ContextCollection Tests
 * Comprehensive tests for the ContextCollection component
 */

import { ContextCollection, ContextItem, ContextFilter, ContextUpdateData } from '../../collections/ContextCollection';
import { Db, Collection } from 'mongodb';

// Mock MongoDB
jest.mock('mongodb');

describe('ContextCollection', () => {
  let contextCollection: ContextCollection;
  let mockDb: jest.Mocked<Db>;
  let mockCollection: jest.Mocked<Collection>;

  beforeEach(() => {
    mockCollection = {
      createIndex: jest.fn().mockResolvedValue('index_created'),
      insertOne: jest.fn().mockResolvedValue({ insertedId: 'context_123' }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([])
      }),
      findOneAndUpdate: jest.fn().mockResolvedValue({ value: null }),
      aggregate: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([])
      }),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 })
    } as any;

    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection)
    } as any;

    contextCollection = new ContextCollection(mockDb);
  });

  describe('Index Creation', () => {
    it('should create all required indexes', async () => {
      await contextCollection.createIndexes();

      expect(mockCollection.createIndex).toHaveBeenCalledWith(
        { contextId: 1 },
        { unique: true }
      );
      expect(mockCollection.createIndex).toHaveBeenCalledWith({ source: 1 });
      expect(mockCollection.createIndex).toHaveBeenCalledWith({ 'metadata.type': 1 });
      expect(mockCollection.createIndex).toHaveBeenCalledWith({ 'metadata.framework': 1 });
      expect(mockCollection.createIndex).toHaveBeenCalledWith({ 'metadata.sessionId': 1 });
      expect(mockCollection.createIndex).toHaveBeenCalledWith({ 'metadata.userId': 1 });
      expect(mockCollection.createIndex).toHaveBeenCalledWith({ 'metadata.tags': 1 });
      expect(mockCollection.createIndex).toHaveBeenCalledWith({ relevanceScore: -1 });
      expect(mockCollection.createIndex).toHaveBeenCalledWith({ 'metadata.importance': -1 });
      expect(mockCollection.createIndex).toHaveBeenCalledWith({ 'metadata.confidence': -1 });
      expect(mockCollection.createIndex).toHaveBeenCalledWith({ 'metadata.lastUsed': -1 });
      expect(mockCollection.createIndex).toHaveBeenCalledWith({ 'metadata.usageCount': -1 });
    });

    it('should create compound indexes for performance', async () => {
      await contextCollection.createIndexes();

      expect(mockCollection.createIndex).toHaveBeenCalledWith({
        'metadata.framework': 1,
        'metadata.type': 1,
        relevanceScore: -1
      });
      expect(mockCollection.createIndex).toHaveBeenCalledWith({
        'metadata.sessionId': 1,
        'metadata.lastUsed': -1
      });
      expect(mockCollection.createIndex).toHaveBeenCalledWith({
        'metadata.userId': 1,
        'metadata.framework': 1,
        'metadata.lastUsed': -1
      });
    });

    it('should create TTL index for automatic cleanup', async () => {
      await contextCollection.createIndexes();

      expect(mockCollection.createIndex).toHaveBeenCalledWith(
        { ttl: 1 },
        { expireAfterSeconds: 0 }
      );
    });

    it('should create vector and text search indexes', async () => {
      await contextCollection.createIndexes();

      expect(mockCollection.createIndex).toHaveBeenCalledWith({ 'embedding.values': '2dsphere' });
      expect(mockCollection.createIndex).toHaveBeenCalledWith(
        {
          content: 'text',
          source: 'text',
          'metadata.tags': 'text'
        },
        { name: 'context_text_index' }
      );
    });
  });

  describe('Context Storage', () => {
    it('should store context item successfully', async () => {
      const contextData = {
        contextId: 'context_123',
        content: 'User prefers morning meetings',
        source: 'user_input',
        relevanceScore: 0.8,
        metadata: {
          type: 'preference' as const,
          framework: 'vercel-ai',
          sessionId: 'session_123',
          userId: 'user_456',
          tags: ['preference', 'scheduling'],
          importance: 0.8,
          confidence: 0.9,
          lastUsed: new Date(),
          usageCount: 0
        },
        embedding: {
          values: [0.1, 0.2, 0.3],
          model: 'text-embedding-3-small',
          dimensions: 1536
        }
      };

      const result = await contextCollection.storeContext(contextData);

      expect(mockCollection.insertOne).toHaveBeenCalled();
      expect(result.contextId).toBe('context_123');
      expect(result.content).toBe('User prefers morning meetings');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should store context without embedding', async () => {
      const contextData = {
        contextId: 'context_456',
        content: 'Simple context item',
        source: 'system',
        relevanceScore: 0.7,
        metadata: {
          type: 'knowledge' as const,
          framework: 'mastra',
          tags: [],
          importance: 0.7,
          confidence: 0.8,
          lastUsed: new Date(),
          usageCount: 0
        }
      };

      const result = await contextCollection.storeContext(contextData);

      expect(mockCollection.insertOne).toHaveBeenCalled();
      expect(result.contextId).toBe('context_456');
      expect(result.embedding).toBeUndefined();
    });

    it('should store context with TTL', async () => {
      const ttlDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      const contextData = {
        contextId: 'context_ttl',
        content: 'Temporary context',
        source: 'temp',
        relevanceScore: 0.6,
        metadata: {
          type: 'conversation' as const,
          framework: 'universal',
          tags: [],
          importance: 0.5,
          confidence: 0.7,
          lastUsed: new Date(),
          usageCount: 0
        },
        ttl: ttlDate
      };

      const result = await contextCollection.storeContext(contextData);

      expect(result.ttl).toEqual(ttlDate);
    });
  });

  describe('Context Retrieval', () => {
    it('should find context items with basic filter', async () => {
      const mockContexts = [
        {
          _id: 'doc1',
          contextId: 'context_1',
          content: 'Test context',
          source: 'test',
          relevanceScore: 0.8,
          metadata: {
            type: 'preference',
            framework: 'vercel-ai',
            tags: ['test']
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (mockCollection.find().toArray as jest.Mock).mockResolvedValue(mockContexts);

      const filter: ContextFilter = {
        type: 'preference',
        framework: 'vercel-ai'
      };

      const results = await contextCollection.findContext(filter);

      expect(mockCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'metadata.type': 'preference',
          'metadata.framework': 'vercel-ai'
        }),
        expect.any(Object)
      );
      expect(results).toHaveLength(1);
      expect(results[0].contextId).toBe('context_1');
    });

    it('should apply search options correctly', async () => {
      const filter: ContextFilter = { framework: 'mastra' };
      const options = {
        limit: 20,
        skip: 10,
        sort: { relevanceScore: -1 },
        minRelevanceScore: 0.7
      };

      await contextCollection.findContext(filter, options);

      expect(mockCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'metadata.framework': 'mastra',
          relevanceScore: { $gte: 0.7 }
        }),
        expect.any(Object)
      );
      expect(mockCollection.find().sort).toHaveBeenCalledWith({ relevanceScore: -1 });
      expect(mockCollection.find().skip).toHaveBeenCalledWith(10);
      expect(mockCollection.find().limit).toHaveBeenCalledWith(20);
    });

    it('should exclude embeddings when not requested', async () => {
      const filter: ContextFilter = { framework: 'langchain' };
      const options = { includeEmbeddings: false };

      await contextCollection.findContext(filter, options);

      expect(mockCollection.find).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          projection: { 'embedding.values': 0 }
        })
      );
    });

    it('should include embeddings when requested', async () => {
      const filter: ContextFilter = { framework: 'openai-agents' };
      const options = { includeEmbeddings: true };

      await contextCollection.findContext(filter, options);

      expect(mockCollection.find).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          projection: {}
        })
      );
    });

    it('should filter by date ranges', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      const filter: ContextFilter = {
        createdAfter: startDate,
        createdBefore: endDate,
        lastUsedAfter: startDate,
        lastUsedBefore: endDate
      };

      await contextCollection.findContext(filter);

      expect(mockCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: { $gte: startDate, $lte: endDate },
          'metadata.lastUsed': { $gte: startDate, $lte: endDate }
        }),
        expect.any(Object)
      );
    });

    it('should filter by tags using $in operator', async () => {
      const filter: ContextFilter = {
        tags: ['preference', 'scheduling', 'important']
      };

      await contextCollection.findContext(filter);

      expect(mockCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'metadata.tags': { $in: ['preference', 'scheduling', 'important'] }
        }),
        expect.any(Object)
      );
    });
  });

  describe('Context Updates', () => {
    it('should update context item successfully', async () => {
      const updatedContext = {
        _id: 'context_123',
        contextId: 'context_123',
        content: 'Updated content',
        updatedAt: new Date()
      };

      mockCollection.findOneAndUpdate.mockResolvedValue({ value: updatedContext });

      const updateData: ContextUpdateData = {
        content: 'Updated content',
        relevanceScore: 0.9
      };

      const result = await contextCollection.updateContext('context_123', updateData);

      expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
        { contextId: 'context_123' },
        {
          $set: expect.objectContaining({
            content: 'Updated content',
            relevanceScore: 0.9,
            updatedAt: expect.any(Date)
          })
        },
        { returnDocument: 'after' }
      );
      expect(result?.contextId).toBe('context_123');
    });

    it('should return null for non-existent context', async () => {
      mockCollection.findOneAndUpdate.mockResolvedValue({ value: null });

      const result = await contextCollection.updateContext('non_existent', {
        content: 'New content'
      });

      expect(result).toBeNull();
    });
  });

  describe('Usage Tracking', () => {
    it('should record context usage correctly', async () => {
      const updatedContext = {
        _id: 'context_123',
        contextId: 'context_123',
        metadata: { usageCount: 6, lastUsed: new Date() }
      };

      mockCollection.findOneAndUpdate.mockResolvedValue({ value: updatedContext });

      const result = await contextCollection.recordContextUsage('context_123');

      expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
        { contextId: 'context_123' },
        {
          $inc: { 'metadata.usageCount': 1 },
          $set: {
            'metadata.lastUsed': expect.any(Date),
            updatedAt: expect.any(Date)
          }
        },
        { returnDocument: 'after' }
      );
      expect(result?.metadata.usageCount).toBe(6);
    });
  });

  describe('Context Statistics', () => {
    it('should generate comprehensive context statistics', async () => {
      const mockStatsResult = [{
        totalCount: [{ total: 150 }],
        byType: [
          { _id: 'preference', count: 50 },
          { _id: 'knowledge', count: 60 },
          { _id: 'conversation', count: 40 }
        ],
        byFramework: [
          { _id: 'vercel-ai', count: 70 },
          { _id: 'mastra', count: 50 },
          { _id: 'langchain', count: 30 }
        ],
        averageRelevance: [{ avg: 0.78 }],
        averageUsage: [{ avg: 3.2 }],
        recentlyUsed: [{ recent: 25 }]
      }];

      (mockCollection.aggregate().toArray as jest.Mock).mockResolvedValue(mockStatsResult);

      const stats = await contextCollection.getContextStats();

      expect(stats.totalContexts).toBe(150);
      expect(stats.contextsByType).toEqual({
        'preference': 50,
        'knowledge': 60,
        'conversation': 40
      });
      expect(stats.contextsByFramework).toEqual({
        'vercel-ai': 70,
        'mastra': 50,
        'langchain': 30
      });
      expect(stats.averageRelevanceScore).toBe(0.78);
      expect(stats.averageUsageCount).toBe(3.2);
      expect(stats.recentlyUsed).toBe(25);
    });

    it('should handle empty statistics gracefully', async () => {
      const emptyStatsResult = [{
        totalCount: [],
        byType: [],
        byFramework: [],
        averageRelevance: [],
        averageUsage: [],
        recentlyUsed: []
      }];

      (mockCollection.aggregate().toArray as jest.Mock).mockResolvedValue(emptyStatsResult);

      const stats = await contextCollection.getContextStats();

      expect(stats.totalContexts).toBe(0);
      expect(stats.averageRelevanceScore).toBe(0);
      expect(stats.averageUsageCount).toBe(0);
      expect(stats.recentlyUsed).toBe(0);
    });
  });

  describe('Context Cleanup', () => {
    it('should clean up expired context items', async () => {
      mockCollection.deleteMany.mockResolvedValue({ deletedCount: 5 });

      const deletedCount = await contextCollection.cleanupExpiredContext();

      expect(mockCollection.deleteMany).toHaveBeenCalledWith({
        ttl: { $lte: expect.any(Date) }
      });
      expect(deletedCount).toBe(5);
    });

    it('should clean up old unused context items', async () => {
      mockCollection.deleteMany.mockResolvedValue({ deletedCount: 12 });

      const deletedCount = await contextCollection.cleanupUnusedContext(30);

      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      expect(mockCollection.deleteMany).toHaveBeenCalledWith({
        $and: [
          { 'metadata.lastUsed': { $lt: expect.any(Date) } },
          { 'metadata.usageCount': { $lte: 1 } },
          { 'metadata.importance': { $lt: 0.3 } }
        ]
      });
      expect(deletedCount).toBe(12);
    });

    it('should use default cleanup period', async () => {
      mockCollection.deleteMany.mockResolvedValue({ deletedCount: 8 });

      await contextCollection.cleanupUnusedContext();

      // Should use default 30 days
      expect(mockCollection.deleteMany).toHaveBeenCalled();
    });
  });

  describe('Collection Initialization', () => {
    it('should initialize collection with indexes', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await contextCollection.initialize();

      expect(mockCollection.createIndex).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('ContextCollection (context_items) initialized')
      );

      consoleSpy.mockRestore();
    });

    it('should use custom collection name', async () => {
      const customContextCollection = new ContextCollection(mockDb, 'custom_context');

      expect(mockDb.collection).toHaveBeenCalledWith('custom_context');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockCollection.insertOne.mockRejectedValue(new Error('Database error'));

      await expect(contextCollection.storeContext({
        contextId: 'test',
        content: 'test',
        source: 'test',
        relevanceScore: 0.5,
        metadata: {
          type: 'conversation',
          framework: 'test',
          tags: [],
          importance: 0.5,
          confidence: 0.5,
          lastUsed: new Date(),
          usageCount: 0
        }
      })).rejects.toThrow('Database error');
    });

    it('should handle aggregation errors in statistics', async () => {
      (mockCollection.aggregate().toArray as jest.Mock).mockRejectedValue(new Error('Aggregation failed'));

      await expect(contextCollection.getContextStats()).rejects.toThrow('Aggregation failed');
    });
  });
});
