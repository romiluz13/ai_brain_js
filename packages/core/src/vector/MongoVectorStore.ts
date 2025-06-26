/**
 * @file MongoVectorStore - Production-ready MongoDB Atlas Vector Search implementation
 * 
 * Based on MongoDB's official documentation and production RAG implementation.
 * This provides the core vector search capabilities for the Universal AI Brain.
 * 
 * Features:
 * - Atlas Vector Search with proper indexing
 * - Hybrid search (vector + text)
 * - Automatic embedding generation
 * - Performance optimization
 * - Error handling and fallbacks
 */

import { Collection, Db, ObjectId, Document } from 'mongodb';
import { MongoConnection } from '../persistance/MongoConnection';

export interface VectorDocument {
  _id?: ObjectId;
  text: string;
  embedding: number[];
  metadata: Record<string, any>;
  source: string;
  timestamp: Date;
  chunkIndex?: number;
  parentDocumentId?: string;
  tokenCount?: number;
}

export interface VectorSearchOptions {
  limit?: number;
  numCandidates?: number;
  filter?: Record<string, any>;
  minScore?: number;
  index?: string;
  includeEmbeddings?: boolean;
  searchType?: 'vector' | 'hybrid' | 'text';
}

export interface VectorSearchResult extends VectorDocument {
  score: number;
}

export interface VectorIndexDefinition {
  name: string;
  type: 'vectorSearch';
  definition: {
    fields: Array<{
      type: 'vector' | 'filter';
      path: string;
      numDimensions?: number;
      similarity?: 'euclidean' | 'cosine' | 'dotProduct';
      quantization?: 'none' | 'scalar' | 'binary';
    }>;
  };
}

export interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
  getDimensions(): number;
  getModel(): string;
}

/**
 * MongoVectorStore - Production-ready MongoDB Atlas Vector Search implementation
 * 
 * This class provides comprehensive vector search capabilities using MongoDB Atlas Vector Search.
 * It follows MongoDB's best practices for production RAG applications.
 */
export class MongoVectorStore {
  private collection: Collection<VectorDocument>;
  private db: Db;
  private vectorIndexName: string;
  private textIndexName: string;
  private embeddingProvider: EmbeddingProvider | null = null;
  private isInitialized: boolean = false;

  constructor(
    mongoConnection: MongoConnection,
    collectionName: string = 'embedded_content',
    vectorIndexName: string = 'vector_index',
    textIndexName: string = 'text_index'
  ) {
    this.db = mongoConnection.getDb();
    this.collection = this.db.collection<VectorDocument>(collectionName);
    this.vectorIndexName = vectorIndexName;
    this.textIndexName = textIndexName;
  }

  /**
   * Initialize the vector store with embedding provider
   */
  async initialize(embeddingProvider: EmbeddingProvider): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.embeddingProvider = embeddingProvider;
    
    // Ensure indexes exist
    await this.ensureIndexes();
    
    this.isInitialized = true;
    console.log('✅ MongoVectorStore initialized successfully');
  }

  /**
   * Store a document with its vector embedding
   */
  async storeDocument(
    text: string,
    metadata: Record<string, any> = {},
    source: string = 'unknown',
    embedding?: number[]
  ): Promise<string> {
    this.ensureInitialized();

    try {
      // Generate embedding if not provided
      const vectorEmbedding = embedding || await this.generateEmbedding(text);

      const document: VectorDocument = {
        text,
        embedding: vectorEmbedding,
        metadata: {
          ...metadata,
          indexed_at: new Date()
        },
        source,
        timestamp: new Date(),
        tokenCount: this.estimateTokenCount(text)
      };

      const result = await this.collection.insertOne(document);
      return result.insertedId.toString();
    } catch (error) {
      console.error('Error storing document:', error);
      throw new Error(`Failed to store document: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Store multiple documents in batch
   */
  async storeDocuments(
    documents: Array<{
      text: string;
      metadata?: Record<string, any>;
      source?: string;
      embedding?: number[];
    }>
  ): Promise<string[]> {
    this.ensureInitialized();

    try {
      const vectorDocuments: VectorDocument[] = await Promise.all(
        documents.map(async (doc) => ({
          text: doc.text,
          embedding: doc.embedding || await this.generateEmbedding(doc.text),
          metadata: {
            ...doc.metadata,
            indexed_at: new Date()
          },
          source: doc.source || 'unknown',
          timestamp: new Date(),
          tokenCount: this.estimateTokenCount(doc.text)
        }))
      );

      const result = await this.collection.insertMany(vectorDocuments);
      return Object.values(result.insertedIds).map(id => id.toString());
    } catch (error) {
      console.error('Error storing documents:', error);
      throw new Error(`Failed to store documents: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Perform vector search using MongoDB Atlas Vector Search
   * Based on MongoDB's production RAG implementation
   */
  async vectorSearch(
    query: string | number[],
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    this.ensureInitialized();

    const {
      limit = 10,
      numCandidates = 50,
      filter = {},
      minScore = 0.7,
      index = this.vectorIndexName
    } = options;

    try {
      // Generate embedding for text query
      const queryEmbedding = typeof query === 'string' 
        ? await this.generateEmbedding(query)
        : query;

      const pipeline = [
        {
          $vectorSearch: {
            index,
            queryVector: queryEmbedding,
            path: "embedding",
            filter,
            limit,
            numCandidates
          }
        },
        {
          $addFields: {
            score: {
              $meta: "vectorSearchScore"
            }
          }
        },
        {
          $match: {
            score: { $gte: minScore }
          }
        }
      ];

      // Add projection to exclude embeddings if not needed
      if (!options.includeEmbeddings) {
        (pipeline as any[]).push({
          $project: {
            embedding: 0
          }
        });
      }

      const results = await this.collection.aggregate<VectorSearchResult>(pipeline).toArray();
      return results;
    } catch (error) {
      console.error('Error in vector search:', error);
      throw new Error(`Vector search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Hybrid search combining vector search with text search
   * Essential for production RAG applications
   */
  async hybridSearch(
    query: string,
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    this.ensureInitialized();

    try {
      // Get vector search results
      const vectorResults = await this.vectorSearch(query, {
        ...options,
        searchType: 'vector'
      });

      // Get text search results
      const textResults = await this.textSearch(query, options);

      // Merge and deduplicate results
      const combinedResults = new Map<string, VectorSearchResult>();
      
      // Add vector results with higher weight (0.7)
      vectorResults.forEach(result => {
        const id = result._id!.toString();
        combinedResults.set(id, { 
          ...result, 
          score: result.score * 0.7,
          metadata: { ...result.metadata, searchType: 'vector' }
        });
      });

      // Add text results with lower weight (0.3)
      textResults.forEach(result => {
        const id = result._id!.toString();
        if (!combinedResults.has(id)) {
          combinedResults.set(id, { 
            ...result, 
            score: result.score * 0.3,
            metadata: { ...result.metadata, searchType: 'text' }
          });
        } else {
          // Boost score for documents found in both searches
          const existing = combinedResults.get(id)!;
          existing.score = Math.min(existing.score + (result.score * 0.3), 1.0);
          existing.metadata.searchType = 'hybrid';
        }
      });

      return Array.from(combinedResults.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, options.limit || 10);
    } catch (error) {
      console.error('Error in hybrid search:', error);
      // Fallback to vector search only
      return this.vectorSearch(query, options);
    }
  }

  /**
   * Text search using MongoDB text indexes
   */
  async textSearch(
    query: string,
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    try {
      const pipeline = [
        {
          $search: {
            index: this.textIndexName,
            text: {
              query: query,
              path: ['text', 'metadata.title', 'metadata.description']
            }
          }
        },
        {
          $addFields: {
            score: { $meta: 'searchScore' }
          }
        },
        {
          $limit: options.limit || 10
        }
      ];

      if (options.filter && Object.keys(options.filter).length > 0) {
        (pipeline as any[]).splice(1, 0, { $match: options.filter });
      }

      const results = await this.collection.aggregate<VectorSearchResult>(pipeline).toArray();
      return results;
    } catch (error) {
      console.warn('Text search failed, this is normal if text index is not created:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  /**
   * Find similar documents to a given document ID
   */
  async findSimilar(
    documentId: string,
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    this.ensureInitialized();

    try {
      // Get the document's embedding
      const document = await this.collection.findOne({ _id: new ObjectId(documentId) });
      if (!document) {
        throw new Error(`Document with ID ${documentId} not found`);
      }

      // Search for similar documents
      return this.vectorSearch(document.embedding, {
        ...options,
        filter: {
          _id: { $ne: new ObjectId(documentId) }, // Exclude the original document
          ...options.filter
        }
      });
    } catch (error) {
      console.error('Error finding similar documents:', error);
      throw new Error(`Failed to find similar documents: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Private helper methods will be added in the next part...
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('MongoVectorStore not initialized. Call initialize() first.');
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.embeddingProvider) {
      throw new Error('Embedding provider not configured');
    }
    return this.embeddingProvider.generateEmbedding(text);
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private async ensureIndexes(): Promise<void> {
    try {
      // Create text search index for hybrid search
      await this.collection.createIndex(
        {
          text: "text",
          "metadata.title": "text",
          "metadata.description": "text"
        },
        {
          name: this.textIndexName,
          background: true
        }
      );

      // Create compound indexes for filtering
      await this.collection.createIndex({ source: 1, timestamp: -1 });
      await this.collection.createIndex({ "metadata.type": 1 });
      await this.collection.createIndex({ timestamp: -1 });

      console.log('✅ MongoDB indexes created successfully');
    } catch (error) {
      console.warn('⚠️ Some indexes may already exist:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Create vector search index definition for Atlas
   * This needs to be created in Atlas UI or via Atlas CLI
   */
  getVectorIndexDefinition(dimensions: number = 1536): VectorIndexDefinition {
    return {
      name: this.vectorIndexName,
      type: 'vectorSearch',
      definition: {
        fields: [
          {
            type: 'vector',
            path: 'embedding',
            numDimensions: dimensions,
            similarity: 'cosine'
          },
          {
            type: 'filter',
            path: 'source'
          },
          {
            type: 'filter',
            path: 'metadata.type'
          },
          {
            type: 'filter',
            path: 'timestamp'
          }
        ]
      }
    };
  }

  /**
   * Get collection statistics
   */
  async getStats(): Promise<any> {
    try {
      const [count, sampleDoc] = await Promise.all([
        this.collection.countDocuments(),
        this.collection.findOne({}, { projection: { embedding: 0 } })
      ]);

      // Get collection stats using database command
      const stats = await this.db.command({ collStats: this.collection.collectionName });

      return {
        collectionStats: stats,
        documentCount: count,
        sampleDocument: sampleDoc,
        indexName: this.vectorIndexName,
        isInitialized: this.isInitialized,
        embeddingProvider: this.embeddingProvider?.getModel() || 'none'
      };
    } catch (error) {
      console.error('Error getting vector store stats:', error);
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Delete documents by filter
   */
  async deleteDocuments(filter: Record<string, any>): Promise<number> {
    try {
      const result = await this.collection.deleteMany(filter);
      return result.deletedCount;
    } catch (error) {
      console.error('Error deleting documents:', error);
      throw new Error(`Failed to delete documents: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update document metadata
   */
  async updateDocumentMetadata(
    documentId: string,
    metadata: Record<string, any>
  ): Promise<boolean> {
    try {
      const result = await this.collection.updateOne(
        { _id: new ObjectId(documentId) },
        {
          $set: {
            metadata: {
              ...metadata,
              updated_at: new Date()
            }
          }
        }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Error updating document metadata:', error);
      throw new Error(`Failed to update document: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get document by ID
   */
  async getDocument(documentId: string, includeEmbedding: boolean = false): Promise<VectorDocument | null> {
    try {
      const projection = includeEmbedding ? {} : { embedding: 0 };
      return await this.collection.findOne(
        { _id: new ObjectId(documentId) },
        { projection }
      );
    } catch (error) {
      console.error('Error getting document:', error);
      return null;
    }
  }

  /**
   * Search documents by metadata
   */
  async searchByMetadata(
    filter: Record<string, any>,
    options: { limit?: number; sort?: Record<string, 1 | -1> } = {}
  ): Promise<VectorDocument[]> {
    try {
      const { limit = 10, sort = { timestamp: -1 } } = options;

      return await this.collection
        .find(filter, { projection: { embedding: 0 } })
        .sort(sort)
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('Error searching by metadata:', error);
      throw new Error(`Failed to search by metadata: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get recent documents
   */
  async getRecentDocuments(
    limit: number = 10,
    source?: string
  ): Promise<VectorDocument[]> {
    const filter = source ? { source } : {};
    return this.searchByMetadata(filter, {
      limit,
      sort: { timestamp: -1 }
    });
  }

  /**
   * Cleanup old documents
   */
  async cleanupOldDocuments(
    olderThanDays: number,
    source?: string
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const filter: Record<string, any> = {
      timestamp: { $lt: cutoffDate }
    };

    if (source) {
      filter.source = source;
    }

    return this.deleteDocuments(filter);
  }

  /**
   * Perform health check
   */
  async healthCheck(): Promise<{ isHealthy: boolean; details: any }> {
    try {
      const stats = await this.getStats();
      const testQuery = await this.vectorSearch('test query', { limit: 1 });

      return {
        isHealthy: true,
        details: {
          isInitialized: this.isInitialized,
          documentCount: stats.documentCount,
          embeddingProvider: stats.embeddingProvider,
          canQuery: testQuery !== null
        }
      };
    } catch (error) {
      return {
        isHealthy: false,
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }
}
