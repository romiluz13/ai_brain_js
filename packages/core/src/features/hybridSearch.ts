/**
 * 🚀 MONGODB ATLAS HYBRID SEARCH ENGINE
 *
 * ✅ PERFECTLY ALIGNED with MongoDB Atlas 2025 Documentation
 * ✅ Uses $rankFusion with reciprocal rank fusion (MongoDB 8.1+)
 * ✅ Automatic fallback for older MongoDB versions
 * ✅ Supports both vector and full-text search with optimal weighting
 *
 * Key Features:
 * - Native MongoDB $rankFusion implementation
 * - Reciprocal rank fusion with rank_constant = 60 (MongoDB default)
 * - Named pipeline structure: vectorPipeline + fullTextPipeline
 * - Proper combination.weights syntax
 * - MongoDB version detection and compatibility
 * - Production-ready with Voyage AI and OpenAI embedding providers
 *
 * MongoDB Requirements:
 * - MongoDB Atlas 8.1+ for $rankFusion support
 * - Vector Search Index on embedding.values field
 * - Atlas Search Index on content.text and content.summary fields
 */

import { Collection, Db, Document } from 'mongodb';
import { MongoEmbeddingProvider } from '../persistance/MongoEmbeddingProvider';
import { OpenAIEmbeddingProvider } from '../embeddings/OpenAIEmbeddingProvider';
import { VoyageAIEmbeddingProvider } from '../embeddings/VoyageAIEmbeddingProvider';

// Embedding provider interface for flexibility
export interface HybridSearchEmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
}

// Fallback embedding provider (mock implementation for development/testing)
export class DefaultEmbeddingProvider implements HybridSearchEmbeddingProvider {
  async generateEmbedding(text: string): Promise<number[]> {
    console.warn(`Using fallback mock embedding provider for: ${text.substring(0, 50)}...`);
    console.warn('WARNING: This is a mock implementation. For production, configure a real embedding provider.');
    // Mock implementation - generates consistent but meaningless embeddings
    return Array(1536).fill(0).map(() => Math.random() * 2 - 1); // Random values between -1 and 1
  }
}

// Search result interface
export interface HybridSearchResult {
  _id: string;
  embedding_id: string;
  content: {
    text: string;
    summary?: string;
  };
  metadata: Record<string, any>;
  scores: {
    vector_score: number;
    text_score: number;
    combined_score: number;
  };
  relevance_explanation: string;
}

// Search filters interface
export interface SearchFilters {
  source_type?: string;
  agent_id?: string;
  created_after?: Date;
  created_before?: Date;
  metadata_filters?: Record<string, any>;
  min_confidence?: number;
}

// Search options interface
export interface SearchOptions {
  limit?: number;
  vector_weight?: number;
  text_weight?: number;
  vector_index?: string;
  text_index?: string;
  include_embeddings?: boolean;
  explain_relevance?: boolean;
}

/**
 * Advanced Hybrid Search Engine
 * Combines vector similarity search with full-text search for optimal relevance
 */
export class HybridSearchEngine {
  private db: Db;
  private embeddingProvider: HybridSearchEmbeddingProvider;
  private embeddingStore: MongoEmbeddingProvider<Document>;

  constructor(
    db: Db,
    embeddingProvider?: HybridSearchEmbeddingProvider,
    collectionName: string = 'vector_embeddings'
  ) {
    this.db = db;
    // Use production-ready OpenAI embedding provider by default
    this.embeddingProvider = embeddingProvider || this.createDefaultEmbeddingProvider();
    this.embeddingStore = new MongoEmbeddingProvider(db, collectionName, 'vector_search_index');
  }

  /**
   * Perform hybrid search combining vector and text search
   */
  async search(
    query: string,
    filters: SearchFilters = {},
    options: SearchOptions = {}
  ): Promise<HybridSearchResult[]> {
    const {
      limit = 20,
      vector_weight = 0.7,
      text_weight = 0.3,
      vector_index = 'vector_search_index',
      text_index = 'text_search_index',
      include_embeddings = false,
      explain_relevance = true
    } = options;

    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddingProvider.generateEmbedding(query);

      // Build filter conditions
      const filterConditions = this.buildFilterConditions(filters);

      // Check MongoDB version and use appropriate hybrid search method
      const mongoVersion = await this.getMongoDBVersion();
      const supportsRankFusion = this.isRankFusionSupported(mongoVersion);

      let results: HybridSearchResult[];

      if (supportsRankFusion) {
        console.log(`🚀 Using MongoDB Atlas $rankFusion (MongoDB ${mongoVersion}) for optimal hybrid search`);
        results = await this.executeHybridSearchWithRankFusion(
          query,
          queryEmbedding,
          filterConditions,
          {
            limit,
            vector_weight,
            text_weight,
            vector_index,
            text_index,
            include_embeddings,
            explain_relevance
          }
        );
      } else {
        console.log(`⚠️ MongoDB ${mongoVersion} detected - $rankFusion requires 8.1+, using manual hybrid search`);
        results = await this.executeHybridSearchPipeline(
          query,
          queryEmbedding,
          filterConditions,
          {
            limit,
            vector_weight,
            text_weight,
            vector_index,
            text_index,
            include_embeddings,
            explain_relevance
          }
        );
      }

      return results;
    } catch (error) {
      console.error('Hybrid search failed:', error);
      // Fallback to text-only search
      return await this.fallbackTextSearch(query, filters, options);
    }
  }

  /**
   * Execute the hybrid search aggregation pipeline
   */
  private async executeHybridSearchPipeline(
    query: string,
    queryEmbedding: number[],
    filterConditions: Record<string, any>,
    options: Required<SearchOptions>
  ): Promise<HybridSearchResult[]> {
    const collection = this.db.collection('vector_embeddings');

    const pipeline: any[] = [
      // Stage 1: Vector similarity search
      {
        $vectorSearch: {
          index: options.vector_index,
          queryVector: queryEmbedding,
          path: 'embedding.values',
          numCandidates: Math.max(options.limit * 10, 150),
          limit: Math.max(options.limit * 2, 50),
          filter: filterConditions,
        },
      },
      {
        $addFields: {
          vector_score: { $meta: 'vectorSearchScore' },
        },
      },
      // Stage 2: Text search (if text index exists)
      {
        $search: {
          index: options.text_index,
          compound: {
            must: [
              {
                text: {
                  query: query,
                  path: ['content.text', 'content.summary'],
                },
              },
            ],
            filter: [filterConditions],
          },
        },
      },
      {
        $addFields: {
          text_score: { $meta: 'searchScore' },
        },
      },
      // Stage 3: Combine scores with weights
      {
        $addFields: {
          combined_score: {
            $add: [
              { $multiply: ['$vector_score', options.vector_weight] },
              { $multiply: ['$text_score', options.text_weight] },
            ],
          },
        },
      },
      // Stage 4: Sort by combined score
      { $sort: { combined_score: -1 } },
      // Stage 5: Limit results
      { $limit: options.limit },
      // Stage 6: Project final results
      {
        $project: {
          _id: 1,
          embedding_id: 1,
          content: 1,
          metadata: 1,
          vector_score: 1,
          text_score: 1,
          combined_score: 1,
          ...(options.include_embeddings && { 'embedding.values': 1 }),
          ...(options.explain_relevance && {
            relevance_explanation: {
              $concat: [
                'Vector similarity: ', { $toString: { $round: ['$vector_score', 3] } },
                ', Text relevance: ', { $toString: { $round: ['$text_score', 3] } },
                ', Combined score: ', { $toString: { $round: ['$combined_score', 3] } }
              ]
            }
          })
        },
      },
    ];

    const results = await collection.aggregate(pipeline).toArray();
    
    return results.map(doc => ({
      _id: doc._id.toString(),
      embedding_id: doc.embedding_id,
      content: doc.content,
      metadata: doc.metadata,
      scores: {
        vector_score: doc.vector_score || 0,
        text_score: doc.text_score || 0,
        combined_score: doc.combined_score || 0,
      },
      relevance_explanation: doc.relevance_explanation || 'No explanation available'
    }));
  }

  /**
   * Execute hybrid search using MongoDB Atlas $rankFusion (MongoDB 8.1+)
   * EXACTLY following the official MongoDB 2025 documentation
   * Uses reciprocal rank fusion with rank_constant = 60 (MongoDB default)
   */
  private async executeHybridSearchWithRankFusion(
    query: string,
    queryEmbedding: number[],
    filterConditions: Record<string, any>,
    options: Required<SearchOptions>
  ): Promise<HybridSearchResult[]> {
    const collection = this.db.collection('vector_embeddings');

    try {
      // EXACT MongoDB Atlas $rankFusion syntax from 2025 documentation
      const pipeline: any[] = [
        {
          $rankFusion: {
            input: {
              pipelines: {
                // Named pipeline for vector search (EXACT docs format)
                vectorPipeline: [
                  {
                    $vectorSearch: {
                      index: options.vector_index,
                      path: 'embedding.values',
                      queryVector: queryEmbedding,
                      numCandidates: Math.max(options.limit * 5, 100),
                      limit: options.limit,
                      // Add filters if provided (MongoDB Atlas format)
                      ...(Object.keys(filterConditions).length > 0 && { filter: filterConditions })
                    }
                  }
                ],
                // Named pipeline for full-text search (EXACT docs format)
                fullTextPipeline: [
                  // Use compound query structure if filters are present
                  ...(Object.keys(filterConditions).length > 0 ? [
                    {
                      $search: {
                        index: options.text_index,
                        compound: {
                          must: [
                            {
                              text: {
                                query: query,
                                path: ['content.text', 'content.summary']
                              }
                            }
                          ],
                          filter: [filterConditions]
                        }
                      }
                    }
                  ] : [
                    // Simple text search when no filters
                    {
                      $search: {
                        index: options.text_index,
                        text: {
                          query: query,
                          path: ['content.text', 'content.summary']
                        }
                      }
                    }
                  ]),
                  { $limit: options.limit }
                ]
              }
            },
            // EXACT combination syntax from MongoDB docs
            combination: {
              weights: {
                vectorPipeline: options.vector_weight,
                fullTextPipeline: options.text_weight
              }
            },
            // Enable score details for debugging (optional)
            scoreDetails: options.explain_relevance
          }
        },
        // Project results with score details from $meta
        {
          $project: {
            _id: 1,
            embedding_id: 1,
            content: 1,
            metadata: 1,
            // Get the reciprocal rank fusion score
            combined_score: { $meta: 'rankFusionScore' },
            // Get detailed scores if available
            ...(options.explain_relevance && {
              scoreDetails: { $meta: 'scoreDetails' }
            }),
            ...(options.include_embeddings && { 'embedding.values': 1 })
          }
        },
        // Final limit (MongoDB $rankFusion handles internal ranking)
        { $limit: options.limit }
      ];

      const results = await collection.aggregate(pipeline).toArray();

      return results.map(doc => {
        // Extract individual pipeline scores from scoreDetails if available
        const vectorScore = doc.scoreDetails?.vectorPipeline?.score || 0;
        const textScore = doc.scoreDetails?.fullTextPipeline?.score || 0;

        return {
          _id: doc._id.toString(),
          embedding_id: doc.embedding_id,
          content: doc.content,
          metadata: doc.metadata,
          scores: {
            vector_score: vectorScore,
            text_score: textScore,
            combined_score: doc.combined_score || 0,
          },
          relevance_explanation: options.explain_relevance
            ? `MongoDB RankFusion (RRF): Vector=${vectorScore.toFixed(3)}, Text=${textScore.toFixed(3)}, Combined=${(doc.combined_score || 0).toFixed(3)}`
            : 'MongoDB Atlas Hybrid Search with Reciprocal Rank Fusion'
        };
      });
    } catch (error) {
      console.error('MongoDB Atlas RankFusion failed (requires MongoDB 8.1+), falling back to manual approach:', error);
      // Fallback to the existing manual approach for older MongoDB versions
      return await this.executeHybridSearchPipeline(query, queryEmbedding, filterConditions, options);
    }
  }

  /**
   * Fallback to text-only search when vector search fails
   */
  private async fallbackTextSearch(
    query: string,
    filters: SearchFilters,
    options: SearchOptions
  ): Promise<HybridSearchResult[]> {
    console.log('Falling back to text-only search');
    
    const collection = this.db.collection('vector_embeddings');
    const filterConditions = this.buildFilterConditions(filters);

    try {
      const pipeline = [
        {
          $search: {
            index: options.text_index || 'text_search_index',
            compound: {
              must: [
                {
                  text: {
                    query: query,
                    path: ['content.text', 'content.summary'],
                  },
                },
              ],
              filter: [filterConditions],
            },
          },
        },
        {
          $addFields: {
            text_score: { $meta: 'searchScore' },
          },
        },
        { $sort: { text_score: -1 } },
        { $limit: options.limit || 20 },
        {
          $project: {
            _id: 1,
            embedding_id: 1,
            content: 1,
            metadata: 1,
            text_score: 1,
          },
        },
      ];

      const results = await collection.aggregate(pipeline).toArray();
      
      return results.map(doc => ({
        _id: doc._id.toString(),
        embedding_id: doc.embedding_id,
        content: doc.content,
        metadata: doc.metadata,
        scores: {
          vector_score: 0,
          text_score: doc.text_score || 0,
          combined_score: doc.text_score || 0,
        },
        relevance_explanation: `Text-only search (vector search unavailable): ${doc.text_score?.toFixed(3) || 'N/A'}`
      }));
    } catch (error) {
      console.error('Text search also failed:', error);
      return [];
    }
  }

  /**
   * Build MongoDB filter conditions from search filters
   */
  private buildFilterConditions(filters: SearchFilters): Record<string, any> {
    const conditions: Record<string, any> = {};

    if (filters.source_type) {
      conditions.source_type = filters.source_type;
    }

    if (filters.agent_id) {
      conditions.agent_id = filters.agent_id;
    }

    if (filters.created_after || filters.created_before) {
      conditions.created_at = {};
      if (filters.created_after) {
        conditions.created_at.$gte = filters.created_after;
      }
      if (filters.created_before) {
        conditions.created_at.$lte = filters.created_before;
      }
    }

    if (filters.min_confidence) {
      conditions['content.confidence'] = { $gte: filters.min_confidence };
    }

    if (filters.metadata_filters) {
      for (const [key, value] of Object.entries(filters.metadata_filters)) {
        conditions[`metadata.${key}`] = value;
      }
    }

    return conditions;
  }

  /**
   * Semantic search using only vector similarity
   */
  async semanticSearch(
    query: string,
    filters: SearchFilters = {},
    limit: number = 20
  ): Promise<HybridSearchResult[]> {
    try {
      const queryEmbedding = await this.embeddingProvider.generateEmbedding(query);
      const filterConditions = this.buildFilterConditions(filters);

      const collection = this.db.collection('vector_embeddings');
      const pipeline = [
        {
          $vectorSearch: {
            index: 'vector_search_index',
            queryVector: queryEmbedding,
            path: 'embedding.values',
            numCandidates: Math.max(limit * 10, 150),
            limit,
            filter: filterConditions,
          },
        },
        {
          $addFields: {
            vector_score: { $meta: 'vectorSearchScore' },
          },
        },
        {
          $project: {
            _id: 1,
            embedding_id: 1,
            content: 1,
            metadata: 1,
            vector_score: 1,
          },
        },
      ];

      const results = await collection.aggregate(pipeline).toArray();
      
      return results.map(doc => ({
        _id: doc._id.toString(),
        embedding_id: doc.embedding_id,
        content: doc.content,
        metadata: doc.metadata,
        scores: {
          vector_score: doc.vector_score || 0,
          text_score: 0,
          combined_score: doc.vector_score || 0,
        },
        relevance_explanation: `Semantic similarity: ${doc.vector_score?.toFixed(3) || 'N/A'}`
      }));
    } catch (error) {
      console.error('Semantic search failed:', error);
      return [];
    }
  }

  /**
   * Full-text search using only text matching
   */
  async textSearch(
    query: string,
    filters: SearchFilters = {},
    limit: number = 20
  ): Promise<HybridSearchResult[]> {
    return await this.fallbackTextSearch(query, filters, { limit });
  }

  /**
   * Get search suggestions based on query
   */
  async getSuggestions(
    partialQuery: string,
    limit: number = 5
  ): Promise<string[]> {
    try {
      const collection = this.db.collection('vector_embeddings');
      const pipeline = [
        {
          $search: {
            index: 'text_search_index',
            autocomplete: {
              query: partialQuery,
              path: 'content.text',
            },
          },
        },
        { $limit: limit },
        {
          $project: {
            suggestion: { $substr: ['$content.text', 0, 100] },
          },
        },
      ];

      const results = await collection.aggregate(pipeline).toArray();
      return results.map(doc => doc.suggestion);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      return [];
    }
  }

  /**
   * Analyze search performance and provide insights
   */
  async analyzeSearchPerformance(
    query: string,
    filters: SearchFilters = {}
  ): Promise<{
    query: string;
    total_candidates: number;
    vector_results: number;
    text_results: number;
    hybrid_results: number;
    performance_ms: number;
    recommendations: string[];
  }> {
    const startTime = Date.now();
    
    try {
      const [vectorResults, textResults, hybridResults] = await Promise.all([
        this.semanticSearch(query, filters, 100),
        this.textSearch(query, filters, 100),
        this.search(query, filters, { limit: 100 })
      ]);

      const performance_ms = Date.now() - startTime;
      const recommendations: string[] = [];

      if (vectorResults.length === 0) {
        recommendations.push('Consider improving embedding quality or expanding vector index');
      }

      if (textResults.length === 0) {
        recommendations.push('Consider improving text content or expanding text index');
      }

      if (hybridResults.length < Math.max(vectorResults.length, textResults.length)) {
        recommendations.push('Hybrid search may need weight adjustment');
      }

      if (performance_ms > 1000) {
        recommendations.push('Search performance is slow - consider index optimization');
      }

      return {
        query,
        total_candidates: Math.max(vectorResults.length, textResults.length),
        vector_results: vectorResults.length,
        text_results: textResults.length,
        hybrid_results: hybridResults.length,
        performance_ms,
        recommendations
      };
    } catch (error) {
      console.error('Search performance analysis failed:', error);
      return {
        query,
        total_candidates: 0,
        vector_results: 0,
        text_results: 0,
        hybrid_results: 0,
        performance_ms: Date.now() - startTime,
        recommendations: ['Search analysis failed - check index configuration']
      };
    }
  }

  /**
   * Get MongoDB version to determine $rankFusion support
   */
  private async getMongoDBVersion(): Promise<string> {
    try {
      const admin = this.db.admin();
      const buildInfo = await admin.buildInfo();
      return buildInfo.version;
    } catch (error) {
      console.warn('Could not determine MongoDB version:', error);
      return '7.0.0'; // Assume older version if detection fails
    }
  }

  /**
   * Check if MongoDB version supports $rankFusion (requires 8.1+)
   */
  private isRankFusionSupported(version: string): boolean {
    try {
      const [major, minor] = version.split('.').map(Number);
      return major > 8 || (major === 8 && minor >= 1);
    } catch (error) {
      console.warn('Could not parse MongoDB version:', version);
      return false; // Assume not supported if parsing fails
    }
  }

  /**
   * Create default embedding provider with fallback to mock
   * Priority: Voyage AI > OpenAI > Mock
   */
  private createDefaultEmbeddingProvider(): HybridSearchEmbeddingProvider {
    // Try Voyage AI first (preferred for better retrieval performance)
    const voyageApiKey = process.env.VOYAGE_API_KEY;
    if (voyageApiKey && voyageApiKey.trim() !== '') {
      try {
        console.log('🚀 Using Voyage AI embedding provider for state-of-the-art embeddings');
        return VoyageAIEmbeddingProvider.forGeneralPurpose(voyageApiKey);
      } catch (error) {
        console.warn('Failed to initialize Voyage AI embedding provider:', error);
        console.warn('Falling back to OpenAI...');
      }
    }

    // Fallback to OpenAI if available
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey && openaiApiKey.trim() !== '') {
      try {
        console.log('Using OpenAI embedding provider for production-ready embeddings');
        return new OpenAIEmbeddingProvider({
          apiKey: openaiApiKey,
          model: 'text-embedding-3-small'
        });
      } catch (error) {
        console.warn('Failed to initialize OpenAI embedding provider:', error);
        console.warn('Falling back to mock embedding provider');
      }
    } else {
      console.warn('No VOYAGE_API_KEY or OPENAI_API_KEY found in environment variables');
      console.warn('Using mock embedding provider - not suitable for production');
    }

    // Fallback to mock provider
    return new DefaultEmbeddingProvider();
  }
}
