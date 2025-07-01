/**
 * @file VectorSearchEngine - Advanced vector search capabilities for Universal AI Brain
 * 
 * This engine provides sophisticated vector search functionality using MongoDB Atlas Vector Search.
 * It handles semantic search, hybrid search, embedding generation, and search optimization
 * with production-grade performance and reliability.
 * 
 * Features:
 * - Semantic vector search using MongoDB Atlas Vector Search
 * - Hybrid search combining vector and text search
 * - Multiple embedding provider support
 * - Search result ranking and filtering
 * - Real-time search analytics and optimization
 * - Search caching and performance optimization
 */

import { Db, ObjectId } from 'mongodb';
import { OpenAIEmbeddingProvider } from '../embeddings/OpenAIEmbeddingProvider';
import { EmbeddingProvider } from '../vector/MongoVectorStore';

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
  embedding?: number[];
  explanation?: string;
}

export interface SearchOptions {
  limit?: number;
  minScore?: number;
  maxCandidates?: number;
  includeEmbeddings?: boolean;
  includeExplanation?: boolean;
  filters?: Record<string, any>;
  boost?: {
    field: string;
    factor: number;
  }[];
}

export interface HybridSearchOptions extends SearchOptions {
  vectorWeight?: number;
  textWeight?: number;
  textQuery?: string;
}

export interface SearchAnalytics {
  totalSearches: number;
  averageLatency: number;
  averageResultCount: number;
  searchTypeDistribution: {
    semantic: number;
    hybrid: number;
    text: number;
  };
  popularQueries: {
    query: string;
    count: number;
    averageScore: number;
  }[];
  performanceMetrics: {
    cacheHitRate: number;
    averageEmbeddingTime: number;
    averageSearchTime: number;
  };
  qualityMetrics: {
    averageRelevanceScore: number;
    zeroResultRate: number;
    userSatisfactionScore: number;
  };
}

/**
 * VectorSearchEngine - Advanced vector search using MongoDB Atlas Vector Search
 * 
 * Provides semantic search, hybrid search, and embedding generation capabilities
 * with intelligent result ranking and optimization.
 */
export class VectorSearchEngine {
  private db: Db;
  private embeddingProvider: EmbeddingProvider;
  private collectionName: string;
  private vectorIndexName: string;
  private textIndexName: string;
  private searchCache: Map<string, { results: SearchResult[]; timestamp: number }> = new Map();
  private cacheSize: number = 1000;
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor(
    db: Db,
    embeddingProvider?: EmbeddingProvider,
    collectionName: string = 'vector_embeddings',
    vectorIndexName: string = 'vector_search_index',
    textIndexName: string = 'text_search_index'
  ) {
    this.db = db;
    this.embeddingProvider = embeddingProvider || new OpenAIEmbeddingProvider({
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'text-embedding-3-small'
    });
    this.collectionName = collectionName;
    this.vectorIndexName = vectorIndexName;
    this.textIndexName = textIndexName;
  }

  /**
   * Perform semantic search using vector similarity
   */
  async semanticSearch(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const startTime = Date.now();
    
    const {
      limit = 10,
      minScore = 0.7,
      maxCandidates,
      includeEmbeddings = false,
      includeExplanation = false,
      filters = {},
      boost = []
    } = options;

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey('semantic', query, options);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Generate query embedding
      const queryEmbedding = await this.createEmbedding(query);

      // Build aggregation pipeline
      const pipeline = this.buildVectorSearchPipeline(
        queryEmbedding,
        {
          limit,
          minScore,
          maxCandidates: maxCandidates || Math.max(limit * 10, 150),
          filters,
          boost,
          includeEmbeddings,
          includeExplanation
        }
      );

      // Execute search
      const collection = this.db.collection(this.collectionName);
      const results = await collection.aggregate(pipeline).toArray();

      // Process results
      const searchResults = this.processSearchResults(results, 'semantic', includeExplanation);

      // Cache results
      this.setCache(cacheKey, searchResults);

      // Log analytics
      this.logSearchAnalytics('semantic', query, searchResults, Date.now() - startTime);

      return searchResults;
    } catch (error) {
      console.error('Semantic search failed:', error);
      return [];
    }
  }

  /**
   * Perform hybrid search combining vector and text search
   */
  async hybridSearch(
    query: string,
    options: HybridSearchOptions = {}
  ): Promise<SearchResult[]> {
    const startTime = Date.now();
    
    const {
      limit = 10,
      minScore = 0.6,
      vectorWeight = 0.7,
      textWeight = 0.3,
      textQuery,
      filters = {},
      includeEmbeddings = false,
      includeExplanation = false
    } = options;

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey('hybrid', query, options);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Generate query embedding
      const queryEmbedding = await this.createEmbedding(query);

      // Build hybrid search pipeline
      const pipeline = this.buildHybridSearchPipeline(
        query,
        queryEmbedding,
        {
          limit,
          minScore,
          vectorWeight,
          textWeight,
          textQuery: textQuery || query,
          filters,
          includeEmbeddings,
          includeExplanation
        }
      );

      // Execute search
      const collection = this.db.collection(this.collectionName);
      const results = await collection.aggregate(pipeline).toArray();

      // Process results
      const searchResults = this.processSearchResults(results, 'hybrid', includeExplanation);

      // Cache results
      this.setCache(cacheKey, searchResults);

      // Log analytics
      this.logSearchAnalytics('hybrid', query, searchResults, Date.now() - startTime);

      return searchResults;
    } catch (error) {
      console.error('Hybrid search failed:', error);
      // Fallback to semantic search
      return await this.semanticSearch(query, options);
    }
  }

  /**
   * Create embedding for text
   */
  async createEmbedding(text: string): Promise<number[]> {
    try {
      return await this.embeddingProvider.generateEmbedding(text);
    } catch (error) {
      console.error('Failed to create embedding:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Embedding generation failed: ${errorMessage}`);
    }
  }

  /**
   * Store document with automatic embedding generation
   * Following MongoDB Atlas Vector Search patterns from official docs
   */
  async storeDocument(
    content: string,
    metadata: Record<string, any> = {},
    documentId?: string
  ): Promise<string> {
    try {
      // Generate embedding for the content
      const embedding = await this.createEmbedding(content);

      // Create document following MongoDB Atlas Vector Search format
      const document = {
        _id: documentId || new Date().getTime().toString(),
        content: { text: content },
        metadata: {
          ...metadata,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        // Store embedding in the format expected by Atlas Vector Search
        embedding: {
          values: embedding
        }
      };

      const collection = this.db.collection(this.collectionName);

      // Use upsert to handle both insert and update cases
      const result = await collection.replaceOne(
        { _id: new ObjectId(document._id) },
        document,
        { upsert: true }
      );

      console.log(`✅ Document stored with ID: ${document._id}`);
      return document._id;
    } catch (error) {
      console.error('Failed to store document:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Document storage failed: ${errorMessage}`);
    }
  }

  /**
   * Perform text-only search
   */
  async textSearch(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const startTime = Date.now();
    
    const {
      limit = 10,
      filters = {},
      includeExplanation = false
    } = options;

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey('text', query, options);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Build text search pipeline
      const pipeline = [
        {
          $search: {
            index: this.textIndexName,
            compound: {
              must: [
                {
                  text: {
                    query: query,
                    path: ['content.text', 'content.summary']
                  }
                }
              ],
              filter: Object.keys(filters).length > 0 ? [filters] : []
            }
          }
        },
        {
          $addFields: {
            textScore: { $meta: 'searchScore' }
          }
        },
        { $sort: { textScore: -1 } },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            content: 1,
            metadata: 1,
            textScore: 1,
            ...(includeExplanation && {
              explanation: {
                $concat: ['Text search score: ', { $toString: '$textScore' }]
              }
            })
          }
        }
      ];

      // Execute search
      const collection = this.db.collection(this.collectionName);
      const results = await collection.aggregate(pipeline).toArray();

      // Process results
      const searchResults = results.map(doc => ({
        id: doc._id.toString(),
        content: doc.content?.text || doc.content || '',
        score: doc.textScore || 0,
        metadata: doc.metadata || {},
        explanation: doc.explanation
      }));

      // Cache results
      this.setCache(cacheKey, searchResults);

      // Log analytics
      this.logSearchAnalytics('text', query, searchResults, Date.now() - startTime);

      return searchResults;
    } catch (error) {
      console.error('Text search failed:', error);
      return [];
    }
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSearchSuggestions(
    partialQuery: string,
    limit: number = 5
  ): Promise<string[]> {
    try {
      const collection = this.db.collection(this.collectionName);
      const pipeline = [
        {
          $search: {
            index: this.textIndexName,
            autocomplete: {
              query: partialQuery,
              path: 'content.text'
            }
          }
        },
        { $limit: limit },
        {
          $project: {
            suggestion: { $substr: ['$content.text', 0, 100] }
          }
        }
      ];

      const results = await collection.aggregate(pipeline).toArray();
      return results.map(doc => doc.suggestion);
    } catch (error) {
      console.error('Failed to get search suggestions:', error);
      return [];
    }
  }

  // Private helper methods

  private buildVectorSearchPipeline(
    queryEmbedding: number[],
    options: {
      limit: number;
      minScore: number;
      maxCandidates: number;
      filters: Record<string, any>;
      boost: { field: string; factor: number }[];
      includeEmbeddings: boolean;
      includeExplanation: boolean;
    }
  ): any[] {
    const pipeline: any[] = [
      {
        $vectorSearch: {
          index: this.vectorIndexName,
          path: 'embedding.values',
          queryVector: queryEmbedding,
          numCandidates: options.maxCandidates,
          limit: options.limit * 2, // Get more for filtering
          filter: options.filters
        }
      },
      {
        $addFields: {
          vectorScore: { $meta: 'vectorSearchScore' }
        }
      },
      {
        $match: {
          vectorScore: { $gte: options.minScore }
        }
      }
    ];

    // Apply boost factors
    if (options.boost.length > 0) {
      const boostExpression = options.boost.reduce((expr: any, boost: any) => {
        return {
          $add: [
            expr,
            {
              $multiply: [
                { $ifNull: [`$${boost.field}`, 0] },
                boost.factor
              ]
            }
          ]
        };
      }, { $literal: 0 } as any);

      pipeline.push({
        $addFields: {
          boostedScore: {
            $add: ['$vectorScore', boostExpression]
          }
        }
      });

      pipeline.push({ $sort: { boostedScore: -1 } });
    } else {
      pipeline.push({ $sort: { vectorScore: -1 } });
    }

    pipeline.push({ $limit: options.limit });

    // Project final results
    const projection: any = {
      _id: 1,
      content: 1,
      metadata: 1,
      vectorScore: 1
    };

    if (options.includeEmbeddings) {
      projection['embedding.values'] = 1;
    }

    if (options.includeExplanation) {
      projection.explanation = {
        $concat: [
          'Vector similarity: ',
          { $toString: { $round: ['$vectorScore', 3] } }
        ]
      };
    }

    pipeline.push({ $project: projection });

    return pipeline;
  }

  private buildHybridSearchPipeline(
    query: string,
    queryEmbedding: number[],
    options: {
      limit: number;
      minScore: number;
      vectorWeight: number;
      textWeight: number;
      textQuery: string;
      filters: Record<string, any>;
      includeEmbeddings: boolean;
      includeExplanation: boolean;
    }
  ): any[] {
    // CORRECT $rankFusion implementation for MongoDB 8.1+
    return [
      {
        $rankFusion: {
          input: {
            pipelines: {
              vectorPipeline: [
                {
                  $vectorSearch: {
                    index: this.vectorIndexName,
                    path: 'embedding.values',
                    queryVector: queryEmbedding,
                    numCandidates: Math.max(options.limit * 10, 150),
                    limit: options.limit * 2,
                    filter: options.filters
                  }
                }
              ],
              textPipeline: [
                {
                  $search: {
                    index: this.textIndexName,
                    compound: {
                      must: [
                        {
                          text: {
                            query: options.textQuery,
                            path: ['content.text', 'content.summary']
                          }
                        }
                      ],
                      filter: Object.keys(options.filters).length > 0 ? [options.filters] : []
                    }
                  }
                },
                { $limit: options.limit * 2 }
              ]
            }
          },
          combination: {
            weights: {
              vectorPipeline: options.vectorWeight,
              textPipeline: options.textWeight
            }
          },
          scoreDetails: true
        }
      },
      // Project results AFTER $rankFusion (this is allowed)
      {
        $project: {
          _id: 1,
          content: 1,
          metadata: 1,
          hybridScore: { $meta: 'scoreDetails' },
          ...(options.includeEmbeddings && { 'embedding.values': 1 }),
          ...(options.includeExplanation && {
            explanation: {
              $concat: [
                'Hybrid search using $rankFusion with weights - Vector: ',
                { $toString: options.vectorWeight },
                ', Text: ',
                { $toString: options.textWeight }
              ]
            }
          })
        }
      },
      // Filter by minimum score and limit results
      {
        $match: {
          'hybridScore.value': { $gte: options.minScore }
        }
      },
      { $limit: options.limit }
    ];
  }

  private processSearchResults(
    results: any[],
    searchType: string,
    includeExplanation: boolean
  ): SearchResult[] {
    return results.map(doc => ({
      id: doc._id.toString(),
      content: doc.content?.text || doc.content || '',
      score: doc.hybridScore?.value || doc.combinedScore || doc.vectorScore || doc.textScore || 0,
      metadata: doc.metadata || {},
      embedding: doc.embedding?.values,
      explanation: doc.explanation || (includeExplanation ? `${searchType} search result` : undefined)
    }));
  }

  private generateCacheKey(type: string, query: string, options: any): string {
    const keyData = {
      type,
      query: query.substring(0, 100),
      limit: options.limit,
      minScore: options.minScore,
      filters: JSON.stringify(options.filters || {})
    };
    return JSON.stringify(keyData);
  }

  private getFromCache(key: string): SearchResult[] | null {
    const cached = this.searchCache.get(key);
    if (!cached) return null;

    // Check TTL
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.searchCache.delete(key);
      return null;
    }

    return cached.results;
  }

  private setCache(key: string, results: SearchResult[]): void {
    if (this.searchCache.size >= this.cacheSize) {
      const firstKey = this.searchCache.keys().next().value;
      if (firstKey) {
        this.searchCache.delete(firstKey);
      }
    }
    this.searchCache.set(key, { results, timestamp: Date.now() });
  }

  private logSearchAnalytics(
    type: string,
    query: string,
    results: SearchResult[],
    latency: number
  ): void {
    // In production, this would send analytics to a monitoring system
    console.log(`Search Analytics: ${type} search for "${query.substring(0, 50)}" returned ${results.length} results in ${latency}ms`);
  }
}
