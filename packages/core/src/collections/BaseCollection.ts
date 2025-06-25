/**
 * @file BaseCollection - Base class for MongoDB collection operations
 * 
 * This class provides common functionality for all MongoDB collections,
 * including validation, error handling, and basic CRUD operations.
 */

import { Collection, Db, ObjectId, OptionalUnlessRequiredId, WithId } from 'mongodb';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export interface BaseDocument {
  _id?: ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaginationOptions {
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
}

export interface PaginatedResult<T> {
  documents: T[];
  total: number;
  hasMore: boolean;
  page: number;
  totalPages: number;
}

/**
 * BaseCollection - Abstract base class for MongoDB collections
 * 
 * Features:
 * - JSON Schema validation
 * - Common CRUD operations
 * - Error handling and logging
 * - Pagination utilities
 * - Index management
 */
export abstract class BaseCollection<T extends BaseDocument> {
  protected abstract collectionName: string;
  protected collection: Collection<T>;
  protected db: Db;
  protected ajv: Ajv;
  protected schema?: object;

  constructor(db: Db) {
    this.db = db;

    // Initialize AJV for schema validation
    this.ajv = new Ajv({ allErrors: true, removeAdditional: true });
    addFormats(this.ajv);
  }

  /**
   * Initialize the collection - must be called after constructor
   */
  protected initializeCollection(): void {
    if (!this.collection) {
      this.collection = this.db.collection<T>(this.collectionName);
      this.loadSchema();
    }
  }

  /**
   * Load JSON schema for validation
   */
  protected loadSchema(): void {
    try {
      // Try to load schema from schemas directory
      const schemaPath = `../schemas/${this.collectionName}.json`;
      this.schema = require(schemaPath);
    } catch (error) {
      console.warn(`⚠️ No schema found for collection ${this.collectionName}`);
    }
  }

  /**
   * Validate document against JSON schema
   */
  protected async validateDocument(document: T): Promise<void> {
    if (!this.schema) {
      return; // No validation if no schema
    }

    const validate = this.ajv.compile(this.schema);
    const valid = validate(document);

    if (!valid) {
      const errors = validate.errors?.map(err => 
        `${err.instancePath} ${err.message}`
      ).join(', ');
      throw new Error(`Document validation failed: ${errors}`);
    }
  }

  /**
   * Generic find with pagination
   */
  async findPaginated(
    filter: any = {},
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<T>> {
    const { limit = 50, skip = 0, sort = { createdAt: -1 } } = options;
    const page = Math.floor(skip / limit) + 1;

    const [documents, total] = await Promise.all([
      this.collection
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return {
      documents: documents.map(doc => doc as unknown as T),
      total,
      hasMore,
      page,
      totalPages
    };
  }

  /**
   * Find many documents (alias for compatibility)
   */
  async findMany(
    filter: any = {},
    options: {
      limit?: number;
      sort?: any;
    } = {}
  ): Promise<WithId<T>[]> {
    return await this.collection
      .find(filter)
      .sort(options.sort || { createdAt: -1 })
      .limit(options.limit || 50)
      .toArray();
  }

  /**
   * Generic find one
   */
  async findOne(filter: any): Promise<WithId<T> | null> {
    return await this.collection.findOne(filter);
  }

  /**
   * Generic find by ID
   */
  async findById(id: string | ObjectId): Promise<WithId<T> | null> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return await this.collection.findOne({ _id: objectId } as any);
  }

  /**
   * Generic insert one
   */
  async insertOne(document: OptionalUnlessRequiredId<T>): Promise<T> {
    const now = new Date();
    const docWithTimestamps = {
      ...document,
      _id: new ObjectId(),
      createdAt: now,
      updatedAt: now
    } as T;

    await this.validateDocument(docWithTimestamps);
    
    const result = await this.collection.insertOne(docWithTimestamps as any);
    
    if (!result.acknowledged) {
      throw new Error(`Failed to insert document into ${this.collectionName}`);
    }

    return docWithTimestamps;
  }

  /**
   * Generic insert many
   */
  async insertMany(documents: OptionalUnlessRequiredId<T>[]): Promise<T[]> {
    const now = new Date();
    const docsWithTimestamps = documents.map(doc => ({
      ...doc,
      _id: new ObjectId(),
      createdAt: now,
      updatedAt: now
    })) as T[];

    // Validate all documents
    for (const doc of docsWithTimestamps) {
      await this.validateDocument(doc);
    }

    const result = await this.collection.insertMany(docsWithTimestamps as any);
    
    if (!result.acknowledged) {
      throw new Error(`Failed to insert documents into ${this.collectionName}`);
    }

    return docsWithTimestamps;
  }

  /**
   * Generic update one
   */
  async updateOne(
    filter: any,
    update: any,
    options: { upsert?: boolean } = {}
  ): Promise<WithId<T> | null> {
    const updateDoc = {
      ...update,
      $set: {
        ...update.$set,
        updatedAt: new Date()
      }
    };

    const result = await this.collection.findOneAndUpdate(
      filter,
      updateDoc,
      {
        returnDocument: 'after',
        includeResultMetadata: false,
        ...options
      }
    );

    return result;
  }

  /**
   * Generic update by ID
   */
  async updateById(
    id: string | ObjectId,
    update: any,
    options: { upsert?: boolean } = {}
  ): Promise<WithId<T> | null> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return await this.updateOne({ _id: objectId }, update, options);
  }

  /**
   * Generic delete one
   */
  async deleteOne(filter: any): Promise<boolean> {
    const result = await this.collection.deleteOne(filter);
    return result.deletedCount > 0;
  }

  /**
   * Generic delete by ID
   */
  async deleteById(id: string | ObjectId): Promise<boolean> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return await this.deleteOne({ _id: objectId });
  }

  /**
   * Generic delete many
   */
  async deleteMany(filter: any): Promise<number> {
    const result = await this.collection.deleteMany(filter);
    return result.deletedCount;
  }

  /**
   * Count documents
   */
  async count(filter: any = {}): Promise<number> {
    return await this.collection.countDocuments(filter);
  }

  /**
   * Check if document exists
   */
  async exists(filter: any): Promise<boolean> {
    const count = await this.collection.countDocuments(filter, { limit: 1 });
    return count > 0;
  }

  /**
   * Get distinct values
   */
  async distinct(field: string, filter: any = {}): Promise<any[]> {
    return await this.collection.distinct(field, filter);
  }

  /**
   * Aggregate pipeline with proper typing
   */
  async aggregate<R = any>(pipeline: any[]): Promise<R[]> {
    const results = await this.collection.aggregate(pipeline).toArray();
    return results as R[];
  }

  /**
   * Create text search index
   */
  async createTextIndex(fields: Record<string, 'text'>, options: any = {}): Promise<void> {
    await this.collection.createIndex(fields, {
      name: `${this.collectionName}_text_search`,
      ...options
    });
  }

  /**
   * Text search
   */
  async textSearch(
    query: string,
    options: {
      limit?: number;
      skip?: number;
      filter?: any;
    } = {}
  ): Promise<WithId<T>[]> {
    const { limit = 20, skip = 0, filter = {} } = options;
    
    const searchFilter = {
      $text: { $search: query },
      ...filter
    };

    const documents = await this.collection
      .find(searchFilter)
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limit)
      .toArray();

    return documents;
  }

  /**
   * Bulk write operations
   */
  async bulkWrite(operations: any[]): Promise<any> {
    return await this.collection.bulkWrite(operations);
  }

  /**
   * Get collection statistics
   */
  async getStats(): Promise<{
    documentCount: number;
    avgDocumentSize: number;
    totalSize: number;
    indexCount: number;
  }> {
    const stats = await this.db.command({ collStats: this.collectionName });
    
    return {
      documentCount: stats.count || 0,
      avgDocumentSize: stats.avgObjSize || 0,
      totalSize: stats.size || 0,
      indexCount: stats.nindexes || 0
    };
  }

  /**
   * Create common indexes
   */
  async createCommonIndexes(): Promise<void> {
    await Promise.all([
      this.collection.createIndex({ createdAt: -1 }),
      this.collection.createIndex({ updatedAt: -1 })
    ]);
  }

  /**
   * Initialize collection - creates indexes and ensures collection is ready
   */
  async initialize(): Promise<void> {
    try {
      await this.createIndexes();
      console.log(`✅ Collection ${this.collectionName} initialized successfully`);
    } catch (error) {
      console.error(`❌ Failed to initialize collection ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Abstract method for creating collection-specific indexes
   */
  abstract createIndexes(): Promise<void>;

  /**
   * Drop collection
   */
  async drop(): Promise<void> {
    await this.collection.drop();
  }

  /**
   * Get collection name
   */
  getCollectionName(): string {
    return this.collectionName;
  }

  /**
   * Get MongoDB collection instance
   */
  getCollection(): Collection<T> {
    return this.collection;
  }
}
