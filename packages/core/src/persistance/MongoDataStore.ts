import { Collection, Db, ObjectId, Filter, FindOptions, UpdateFilter, Document } from 'mongodb';
import { IDataStore } from './IDataStore';

export class MongoDataStore<T extends Document> implements IDataStore<T> {
  private collection: Collection<T>;

  constructor(db: Db, collectionName: string) {
    this.collection = db.collection<T>(collectionName);
  }

  async create(item: T): Promise<T> {
    const result = await this.collection.insertOne(item as any);
    return { ...item, _id: result.insertedId } as T;
  }

  async read(id: string): Promise<T | null> {
    const result = await this.collection.findOne({ _id: new ObjectId(id) } as any);
    return result as T | null;
  }

  async find(filter: Filter<T>, options?: FindOptions<T>): Promise<T[]> {
    const results = await this.collection.find(filter, options).toArray();
    return results as T[];
  }

  async findOne(filter: Filter<T>, options?: FindOptions<T>): Promise<T | null> {
    const result = await this.collection.findOne(filter, options);
    return result as T | null;
  }

  async update(id: string, item: UpdateFilter<T> | Partial<T>): Promise<T | null> {
    // Check if item is already a MongoDB update document (has atomic operators)
    const hasAtomicOperators = item && typeof item === 'object' &&
      Object.keys(item).some(key => key.startsWith('$'));

    const updateDoc = hasAtomicOperators ? item as UpdateFilter<T> : { $set: item as Partial<T> };

    await this.collection.updateOne({ _id: new ObjectId(id) } as any, updateDoc);
    return this.read(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) } as any);
    return result.deletedCount === 1;
  }
}