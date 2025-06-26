/**
 * @file SemanticMemoryEngine - Advanced semantic memory management for Universal AI Brain
 * 
 * This engine provides sophisticated semantic memory capabilities using MongoDB Atlas Vector Search.
 * It handles memory storage, retrieval, importance scoring, and semantic relationships
 * with production-grade performance and reliability.
 * 
 * Features:
 * - Semantic memory storage with vector embeddings
 * - Intelligent memory retrieval based on semantic similarity
 * - Memory importance scoring and decay
 * - Memory clustering and relationship mapping
 * - Real-time memory analytics and optimization
 * - Framework-agnostic memory management
 */

import { MemoryCollection } from '../collections/MemoryCollection';
import { OpenAIEmbeddingProvider } from '../embeddings/OpenAIEmbeddingProvider';
import { EmbeddingProvider } from '../vector/MongoVectorStore';
import { MemoryImportance } from '../types';

export interface Memory {
  id: string;
  content: string;
  embedding?: number[];
  metadata: {
    type: 'conversation' | 'fact' | 'procedure' | 'context' | 'preference';
    importance: number; // 0-1 scale
    confidence: number; // 0-1 scale
    source: string;
    framework: string;
    sessionId: string;
    userId?: string;
    tags: string[];
    relationships: string[]; // IDs of related memories
    accessCount: number;
    lastAccessed: Date;
    created: Date;
    updated: Date;
  };
  ttl?: Date; // Time to live for temporary memories
}

export interface MemorySearchOptions {
  limit?: number;
  minImportance?: number;
  minConfidence?: number;
  types?: Memory['metadata']['type'][];
  frameworks?: string[];
  sessionId?: string;
  userId?: string;
  tags?: string[];
  includeRelated?: boolean;
  timeRange?: {
    start: Date;
    end: Date;
  };
}

export interface MemoryAnalytics {
  totalMemories: number;
  memoriesByType: Record<string, number>;
  memoriesByFramework: Record<string, number>;
  averageImportance: number;
  averageConfidence: number;
  memoryGrowthTrend: {
    date: Date;
    count: number;
  }[];
  topTags: {
    tag: string;
    count: number;
  }[];
  memoryHealth: {
    staleMemories: number;
    lowConfidenceMemories: number;
    orphanedMemories: number;
  };
}

/**
 * SemanticMemoryEngine - Advanced semantic memory management
 * 
 * Provides intelligent memory storage and retrieval using MongoDB Atlas Vector Search
 * with sophisticated importance scoring and relationship mapping.
 */
export class SemanticMemoryEngine {
  private memoryCollection: MemoryCollection;
  private embeddingProvider: EmbeddingProvider;
  private memoryCache: Map<string, Memory> = new Map();
  private cacheSize: number = 1000;

  constructor(
    memoryCollection: MemoryCollection,
    embeddingProvider?: EmbeddingProvider
  ) {
    this.memoryCollection = memoryCollection;
    this.embeddingProvider = embeddingProvider || new OpenAIEmbeddingProvider({
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'text-embedding-3-small'
    });
  }

  /**
   * Store a new memory with semantic embedding
   */
  async storeMemory(
    content: string,
    metadata: Partial<Memory['metadata']>,
    options?: {
      generateEmbedding?: boolean;
      updateIfExists?: boolean;
      ttl?: Date;
    }
  ): Promise<string> {
    const { generateEmbedding = true, updateIfExists = false, ttl } = options || {};

    // Generate embedding if requested
    let embedding: number[] | undefined;
    if (generateEmbedding) {
      try {
        embedding = await this.embeddingProvider.generateEmbedding(content);
      } catch (error) {
        console.warn('Failed to generate embedding for memory:', error);
        // Continue without embedding - memory can still be stored
      }
    }

    // Create memory object
    const memory: Memory = {
      id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      embedding,
      metadata: {
        type: 'context',
        importance: 0.5,
        confidence: 0.8,
        source: 'unknown',
        framework: 'universal',
        sessionId: 'default',
        tags: [],
        relationships: [],
        accessCount: 0,
        lastAccessed: new Date(),
        created: new Date(),
        updated: new Date(),
        ...metadata
      },
      ttl
    };

    // Store in MongoDB
    await this.memoryCollection.storeDocument(
      JSON.stringify(memory),
      {
        type: 'semantic_memory',
        memoryId: memory.id,
        memoryType: memory.metadata.type,
        importance: memory.metadata.importance,
        confidence: memory.metadata.confidence,
        framework: memory.metadata.framework,
        sessionId: memory.metadata.sessionId,
        userId: memory.metadata.userId,
        tags: memory.metadata.tags,
        ttl: memory.ttl,
        embedding: embedding
      }
    );

    // Update cache
    this.updateCache(memory);

    return memory.id;
  }

  /**
   * Retrieve memories based on semantic similarity
   */
  async retrieveRelevantMemories(
    query: string,
    options: MemorySearchOptions = {}
  ): Promise<Memory[]> {
    const {
      limit = 10,
      minImportance = 0.1,
      minConfidence = 0.3,
      types,
      frameworks,
      sessionId,
      userId,
      tags,
      includeRelated = false,
      timeRange
    } = options;

    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddingProvider.generateEmbedding(query);

      // Build filter conditions
      const filterConditions: any = {
        'metadata.type': 'semantic_memory',
        'metadata.importance': { $gte: minImportance },
        'metadata.confidence': { $gte: minConfidence }
      };

      if (types && types.length > 0) {
        filterConditions['metadata.memoryType'] = { $in: types };
      }

      if (frameworks && frameworks.length > 0) {
        filterConditions['metadata.framework'] = { $in: frameworks };
      }

      if (sessionId) {
        filterConditions['metadata.sessionId'] = sessionId;
      }

      if (userId) {
        filterConditions['metadata.userId'] = userId;
      }

      if (tags && tags.length > 0) {
        filterConditions['metadata.tags'] = { $in: tags };
      }

      if (timeRange) {
        filterConditions['metadata.created'] = {
          $gte: timeRange.start,
          $lte: timeRange.end
        };
      }

      // Execute vector search using MongoDB Atlas Vector Search
      const pipeline = [
        {
          $vectorSearch: {
            index: 'memory_vector_index',
            path: 'embedding.values',
            queryVector: queryEmbedding,
            numCandidates: Math.max(limit * 10, 100),
            limit: limit * 2, // Get more candidates for filtering
            filter: filterConditions
          }
        },
        {
          $addFields: {
            vectorScore: { $meta: 'vectorSearchScore' }
          }
        },
        {
          $match: {
            vectorScore: { $gte: 0.7 } // Minimum similarity threshold
          }
        },
        {
          $sort: {
            vectorScore: -1,
            'metadata.importance': -1,
            'metadata.lastAccessed': -1
          }
        },
        {
          $limit: limit
        }
      ];

      const results = await this.memoryCollection.aggregate(pipeline);
      const memories = results.map(this.parseMemoryFromDocument);

      // Update access tracking
      await this.updateAccessTracking(memories.map(m => m.id));

      // Include related memories if requested
      if (includeRelated) {
        const relatedMemories = await this.getRelatedMemories(memories);
        memories.push(...relatedMemories);
      }

      return memories;
    } catch (error) {
      console.error('Failed to retrieve relevant memories:', error);
      // Fallback to text-based search
      return await this.fallbackTextSearch(query, options);
    }
  }

  /**
   * Update memory importance based on usage patterns
   */
  async updateMemoryImportance(
    memoryId: string,
    importance: number,
    reason?: string
  ): Promise<void> {
    const memory = await this.getMemoryById(memoryId);
    if (!memory) {
      throw new Error(`Memory not found: ${memoryId}`);
    }

    // Update importance with decay factor
    const decayFactor = this.calculateDecayFactor(memory.metadata.created);
    const adjustedImportance = Math.max(0, Math.min(1, importance * decayFactor));

    memory.metadata.importance = adjustedImportance;
    memory.metadata.updated = new Date();

    // Store updated memory
    await this.memoryCollection.updateMemory(
      memoryId,
      {
        importance: this.convertToMemoryImportance(adjustedImportance),
        content: JSON.stringify(memory),
        metadata: {
          ...memory.metadata,
          updated: memory.metadata.updated,
          updateReason: reason || 'importance_update'
        }
      }
    );

    // Update cache
    this.updateCache(memory);
  }

  /**
   * Create relationships between memories
   */
  async createMemoryRelationship(
    memoryId1: string,
    memoryId2: string,
    relationshipType: 'similar' | 'causal' | 'temporal' | 'contextual' = 'similar'
  ): Promise<void> {
    const [memory1, memory2] = await Promise.all([
      this.getMemoryById(memoryId1),
      this.getMemoryById(memoryId2)
    ]);

    if (!memory1 || !memory2) {
      throw new Error('One or both memories not found');
    }

    // Add bidirectional relationships
    if (!memory1.metadata.relationships.includes(memoryId2)) {
      memory1.metadata.relationships.push(memoryId2);
      memory1.metadata.updated = new Date();
    }

    if (!memory2.metadata.relationships.includes(memoryId1)) {
      memory2.metadata.relationships.push(memoryId1);
      memory2.metadata.updated = new Date();
    }

    // Update both memories
    await Promise.all([
      this.memoryCollection.updateMemory(
        memoryId1,
        {
          content: JSON.stringify(memory1),
          metadata: { relationshipType, relatedTo: memoryId2 }
        }
      ),
      this.memoryCollection.updateMemory(
        memoryId2,
        {
          content: JSON.stringify(memory2),
          metadata: { relationshipType, relatedTo: memoryId1 }
        }
      )
    ]);

    // Update cache
    this.updateCache(memory1);
    this.updateCache(memory2);
  }

  /**
   * Generate comprehensive memory analytics
   */
  async generateMemoryAnalytics(timeRange?: { start: Date; end: Date }): Promise<MemoryAnalytics> {
    const matchStage = timeRange ? {
      $match: {
        'metadata.type': 'semantic_memory',
        'metadata.created': { $gte: timeRange.start, $lte: timeRange.end }
      }
    } : {
      $match: { 'metadata.type': 'semantic_memory' }
    };

    const pipeline = [
      matchStage,
      {
        $facet: {
          totalCount: [{ $count: 'total' }],
          byType: [
            { $group: { _id: '$metadata.memoryType', count: { $sum: 1 } } }
          ],
          byFramework: [
            { $group: { _id: '$metadata.framework', count: { $sum: 1 } } }
          ],
          averageImportance: [
            { $group: { _id: null, avg: { $avg: '$metadata.importance' } } }
          ],
          averageConfidence: [
            { $group: { _id: null, avg: { $avg: '$metadata.confidence' } } }
          ],
          growthTrend: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$metadata.created' } },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id': 1 } }
          ],
          topTags: [
            { $unwind: '$metadata.tags' },
            { $group: { _id: '$metadata.tags', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          healthMetrics: [
            {
              $group: {
                _id: null,
                staleMemories: {
                  $sum: {
                    $cond: [
                      { $lt: ['$metadata.lastAccessed', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] },
                      1,
                      0
                    ]
                  }
                },
                lowConfidenceMemories: {
                  $sum: { $cond: [{ $lt: ['$metadata.confidence', 0.5] }, 1, 0] }
                },
                orphanedMemories: {
                  $sum: { $cond: [{ $eq: [{ $size: '$metadata.relationships' }, 0] }, 1, 0] }
                }
              }
            }
          ]
        }
      }
    ];

    const results = await this.memoryCollection.aggregate(pipeline);
    const facetResults = results[0];

    return {
      totalMemories: facetResults.totalCount[0]?.total || 0,
      memoriesByType: this.arrayToRecord(facetResults.byType),
      memoriesByFramework: this.arrayToRecord(facetResults.byFramework),
      averageImportance: facetResults.averageImportance[0]?.avg || 0,
      averageConfidence: facetResults.averageConfidence[0]?.avg || 0,
      memoryGrowthTrend: facetResults.growthTrend.map((item: any) => ({
        date: new Date(item._id),
        count: item.count
      })),
      topTags: facetResults.topTags.map((item: any) => ({
        tag: item._id,
        count: item.count
      })),
      memoryHealth: facetResults.healthMetrics[0] || {
        staleMemories: 0,
        lowConfidenceMemories: 0,
        orphanedMemories: 0
      }
    };
  }

  // Private helper methods

  private async getMemoryById(memoryId: string): Promise<Memory | null> {
    // Check cache first
    if (this.memoryCache.has(memoryId)) {
      return this.memoryCache.get(memoryId)!;
    }

    // Query from database
    const results = await this.memoryCollection.aggregate([
      { $match: { 'metadata.memoryId': memoryId } }
    ]);

    if (results.length === 0) {
      return null;
    }

    const memory = this.parseMemoryFromDocument(results[0]);
    this.updateCache(memory);
    return memory;
  }

  private parseMemoryFromDocument(doc: any): Memory {
    const memoryData = JSON.parse(doc.content);
    return {
      ...memoryData,
      embedding: doc.embedding?.values
    };
  }

  private updateCache(memory: Memory): void {
    // Simple LRU cache implementation
    if (this.memoryCache.size >= this.cacheSize) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) this.memoryCache.delete(firstKey);
    }
    this.memoryCache.set(memory.id, memory);
  }

  private calculateDecayFactor(createdDate: Date): number {
    const ageInDays = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    // Exponential decay: importance decreases by 1% per day
    return Math.exp(-0.01 * ageInDays);
  }

  private async updateAccessTracking(memoryIds: string[]): Promise<void> {
    const updatePromises = memoryIds.map(async (memoryId) => {
      const memory = await this.getMemoryById(memoryId);
      if (memory) {
        memory.metadata.accessCount++;
        memory.metadata.lastAccessed = new Date();
        await this.memoryCollection.updateMemory(
          memoryId,
          {
            content: JSON.stringify(memory),
            metadata: { accessCount: memory.metadata.accessCount, lastAccessed: memory.metadata.lastAccessed }
          }
        );
        this.updateCache(memory);
      }
    });

    await Promise.all(updatePromises);
  }

  private convertToMemoryImportance(value: number): MemoryImportance {
    if (value >= 0.8) return MemoryImportance.CRITICAL;
    if (value >= 0.6) return MemoryImportance.HIGH;
    if (value >= 0.4) return MemoryImportance.MEDIUM;
    return MemoryImportance.LOW;
  }

  private async getRelatedMemories(memories: Memory[]): Promise<Memory[]> {
    const relatedIds = new Set<string>();
    memories.forEach(memory => {
      memory.metadata.relationships.forEach(id => relatedIds.add(id));
    });

    const relatedMemories: Memory[] = [];
    for (const id of relatedIds) {
      const memory = await this.getMemoryById(id);
      if (memory) {
        relatedMemories.push(memory);
      }
    }

    return relatedMemories;
  }

  private async fallbackTextSearch(query: string, options: MemorySearchOptions): Promise<Memory[]> {
    console.log('Falling back to text-based memory search');
    
    const pipeline = [
      {
        $match: {
          'metadata.type': 'semantic_memory',
          $text: { $search: query }
        }
      },
      { $sort: { score: { $meta: 'textScore' } } },
      { $limit: options.limit || 10 }
    ];

    try {
      const results = await this.memoryCollection.aggregate(pipeline);
      return results.map(this.parseMemoryFromDocument);
    } catch (error) {
      console.error('Text search also failed:', error);
      return [];
    }
  }

  private arrayToRecord(array: any[]): Record<string, number> {
    const record: Record<string, number> = {};
    array.forEach(item => {
      record[item._id] = item.count;
    });
    return record;
  }
}
