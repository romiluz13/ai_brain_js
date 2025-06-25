import { Collection, Db, Document } from 'mongodb';
import { IEmbeddingStore, EmbeddedDocument, SimilaritySearchResult } from './IEmbeddingStore';

export class MongoEmbeddingProvider<T extends Document> implements IEmbeddingStore<T> {
  private collection: Collection<EmbeddedDocument<T>>;
  private indexName: string;

  constructor(db: Db, collectionName: string, indexName: string) {
    this.collection = db.collection<EmbeddedDocument<T>>(collectionName);
    this.indexName = indexName;
  }

  async add(doc: EmbeddedDocument<T>): Promise<void> {
    await this.collection.insertOne(doc as any);
  }

  async addMany(docs: EmbeddedDocument<T>[]): Promise<void> {
    await this.collection.insertMany(docs as any);
  }

  async findSimilar(query: number[], options?: { k?: number; filter?: any }): Promise<SimilaritySearchResult<T>[]> {
    const limit = options?.k ?? 10;
    const numCandidates = Math.max(limit * 10, 150);

    const pipeline: Document[] = [
      {
        $vectorSearch: {
          index: this.indexName,
          path: 'embedding.values',
          queryVector: query,
          numCandidates,
          limit,
          filter: options?.filter || {},
        },
      },
      {
        $addFields: {
          score: { $meta: 'vectorSearchScore' },
        },
      },
      {
        $project: {
          document: 1,
          score: 1,
          _id: 0,
        },
      },
    ];

    const results = await this.collection.aggregate(pipeline).toArray();
    return results as SimilaritySearchResult<T>[];
  }

  /**
   * Enhanced vector search with metadata filtering and score thresholds
   * Based on MongoDB's production RAG implementation
   */
  async vectorSearchWithMetadata(
    query: number[],
    options?: {
      k?: number;
      filter?: any;
      minScore?: number;
      includeMetadata?: boolean;
    }
  ): Promise<SimilaritySearchResult<T>[]> {
    const limit = options?.k ?? 10;
    const numCandidates = Math.max(limit * 10, 150);
    const minScore = options?.minScore ?? 0.7;

    const pipeline: Document[] = [
      {
        $vectorSearch: {
          index: this.indexName,
          path: 'embedding.values',
          queryVector: query,
          numCandidates,
          limit,
          filter: options?.filter || {},
        },
      },
      {
        $addFields: {
          score: { $meta: 'vectorSearchScore' },
        },
      },
      {
        $match: {
          score: { $gte: minScore }
        }
      }
    ];

    if (options?.includeMetadata) {
      pipeline.push({
        $project: {
          document: 1,
          score: 1,
          metadata: 1,
          _id: 1,
        },
      });
    } else {
      pipeline.push({
        $project: {
          document: 1,
          score: 1,
          _id: 0,
        },
      });
    }

    const results = await this.collection.aggregate(pipeline).toArray();
    return results as SimilaritySearchResult<T>[];
  }

  /**
   * Hybrid search combining vector search with text search
   * Essential for production RAG applications
   */
  async hybridSearch(
    query: number[],
    textQuery?: string,
    options?: { k?: number; filter?: any; minScore?: number }
  ): Promise<SimilaritySearchResult<T>[]> {
    // First get vector search results
    const vectorResults = await this.vectorSearchWithMetadata(query, options);

    if (!textQuery) {
      return vectorResults;
    }

    // Combine with text search for hybrid results
    const textSearchPipeline = [
      {
        $search: {
          index: 'text_index', // Assumes text search index exists
          text: {
            query: textQuery,
            path: ['document.text', 'document.content'] // Adjust paths as needed
          }
        }
      },
      {
        $addFields: {
          score: { $meta: 'searchScore' }
        }
      },
      {
        $limit: options?.k ?? 10
      }
    ];

    try {
      const textResults = await this.collection.aggregate(textSearchPipeline).toArray();

      // Merge and deduplicate results
      const combinedResults = new Map<string, SimilaritySearchResult<T>>();

      // Add vector results with higher weight
      vectorResults.forEach(result => {
        const key = result.document._id?.toString() || JSON.stringify(result.document);
        combinedResults.set(key, { ...result, score: result.score * 0.7 });
      });

      // Add text results with lower weight
      textResults.forEach(result => {
        const key = result._id?.toString() || JSON.stringify(result);
        if (!combinedResults.has(key)) {
          combinedResults.set(key, {
            document: result,
            score: result.score * 0.3
          } as SimilaritySearchResult<T>);
        }
      });

      return Array.from(combinedResults.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, options?.k || 10);
    } catch (error) {
      console.warn('Text search failed, falling back to vector search only:', error);
      return vectorResults;
    }
  }

  /**
   * Get collection statistics for monitoring
   */
  async getStats(): Promise<any> {
    try {
      const stats = await this.collection.aggregate([
        { $collStats: { count: {} } }
      ]).toArray();
      return stats[0] || null;
    } catch (error) {
      console.error('Error getting collection stats:', error);
      return null;
    }
  }
}