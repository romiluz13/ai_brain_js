/**
 * @file Defines the core interface for a generic data store.
 * This interface provides a contract for basic CRUD (Create, Read, Update, Delete)
 * operations, abstracting the underlying database technology.
 */

import { Filter, FindOptions, UpdateFilter, Document } from 'mongodb';

/**
 * Represents a generic data store providing basic CRUD operations.
 * @template T The type of the document stored in the data store.
 */
export interface IDataStore<T extends Document> {
  /**
   * Creates a new document in the data store.
   * @param item The document to create.
   * @returns The created document.
   */
  create(item: T): Promise<T>;

  /**
   * Reads a single document from the data store.
   * @param id The unique identifier of the document to read.
   * @returns The document if found, otherwise null.
   */
  read(id: string): Promise<T | null>;

  /**
   * Updates an existing document in the data store.
   * @param id The unique identifier of the document to update.
   * @param item The fields to update in the document.
   * @returns The updated document.
   */
  update(id: string, item: UpdateFilter<T>): Promise<T | null>;

  /**
   * Deletes a document from the data store.
   * @param id The unique identifier of the document to delete.
   * @returns True if the document was deleted, otherwise false.
   */
  delete(id: string): Promise<boolean>;

  /**
   * Finds documents in the data store that match the given filter.
   * @param filter The filter to apply to the query.
   * @param options Optional find options.
   * @returns An array of documents that match the filter.
   */
  find(filter: Filter<T>, options?: FindOptions<T>): Promise<T[]>;

  /**
   * Finds a single document in the data store that matches the given filter.
   * @param filter The filter to apply to the query.
   * @param options Optional find options.
   * @returns The first document that matches the filter, or null if no document is found.
   */
  findOne(filter: Filter<T>, options?: FindOptions<T>): Promise<T | null>;
}