/**
 * @file Defines the interface for an embedding store.
 * This interface provides a contract for storing and querying vector embeddings,
 * which are essential for semantic search and other AI capabilities.
 */

import { Document } from 'mongodb';

/**
 * Represents a vector embedding.
 */
export interface Embedding {
  /** The vector values. */
  values: number[];
  /** The model used to generate the embedding. */
  model: string;
}

/**
 * Represents a document with an embedding.
 * @template T The type of the document.
 */
export interface EmbeddedDocument<T extends Document> {
  /** The original document. */
  document: T;
  /** The vector embedding of the document. */
  embedding: Embedding;
}

/**
 * Represents the result of a similarity search.
 * @template T The type of the document.
 */
export interface SimilaritySearchResult<T extends Document> {
  /** The document found. */
  document: T;
  /** The similarity score. */
  score: number;
}

/**
 * Defines the interface for an embedding store.
 * @template T The type of the document being stored.
 */
export interface IEmbeddingStore<T extends Document> {
  /**
   * Adds a document and its embedding to the store.
   * @param doc The document to add.
   * @returns A promise that resolves when the operation is complete.
   */
  add(doc: EmbeddedDocument<T>): Promise<void>;

  /**
   * Adds multiple documents and their embeddings to the store.
   * @param docs The documents to add.
   * @returns A promise that resolves when the operation is complete.
   */
  addMany(docs: EmbeddedDocument<T>[]): Promise<void>;

  /**
   * Finds documents in the store that are similar to the given query vector.
   * @param query The query vector.
   * @param options Options for the search, such as the number of results to return.
   * @returns A promise that resolves with an array of similarity search results.
   */
  findSimilar(query: number[], options?: { k?: number; filter?: any }): Promise<SimilaritySearchResult<T>[]>;
}