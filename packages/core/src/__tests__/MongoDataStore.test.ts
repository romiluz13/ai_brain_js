import { ObjectId } from 'mongodb';
import { MongoDataStore } from '../persistance/MongoDataStore';
import { setupTestDb, teardownTestDb, getTestDb } from './setup';

interface TestDocument {
  _id?: ObjectId;
  name: string;
  value: number;
}

describe('MongoDataStore', () => {
  let dataStore: MongoDataStore<TestDocument>;

  beforeAll(async () => {
    await setupTestDb();
    dataStore = new MongoDataStore<TestDocument>(getTestDb(), 'test_collection');
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    // Clear the collection before each test
    await getTestDb().collection('test_collection').deleteMany({});
  });

  describe('create', () => {
    it('should create a new document', async () => {
      const testDoc: TestDocument = { name: 'test', value: 42 };
      const result = await dataStore.create(testDoc);

      expect(result._id).toBeDefined();
      expect(result.name).toBe('test');
      expect(result.value).toBe(42);
    });
  });

  describe('findById', () => {
    it('should find a document by ID', async () => {
      const testDoc: TestDocument = { name: 'test', value: 42 };
      const created = await dataStore.create(testDoc);
      
      const found = await dataStore.findById(created._id!.toString());
      
      expect(found).toBeTruthy();
      expect(found!.name).toBe('test');
      expect(found!.value).toBe(42);
    });

    it('should return null for non-existent ID', async () => {
      const nonExistentId = new ObjectId().toString();
      const result = await dataStore.findById(nonExistentId);
      
      expect(result).toBeNull();
    });
  });

  describe('find', () => {
    it('should find documents by filter', async () => {
      await dataStore.create({ name: 'test1', value: 10 });
      await dataStore.create({ name: 'test2', value: 20 });
      await dataStore.create({ name: 'test3', value: 10 });

      const results = await dataStore.find({ value: 10 });
      
      expect(results).toHaveLength(2);
      expect(results.every(doc => doc.value === 10)).toBe(true);
    });

    it('should return empty array when no matches', async () => {
      const results = await dataStore.find({ name: 'nonexistent' });
      expect(results).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should update a document', async () => {
      const testDoc: TestDocument = { name: 'test', value: 42 };
      const created = await dataStore.create(testDoc);
      
      const updated = await dataStore.update(created._id!.toString(), { value: 100 });
      
      expect(updated).toBeTruthy();
      expect(updated!.value).toBe(100);
      expect(updated!.name).toBe('test'); // Should preserve other fields
    });

    it('should return null for non-existent ID', async () => {
      const nonExistentId = new ObjectId().toString();
      const result = await dataStore.update(nonExistentId, { value: 100 });
      
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a document', async () => {
      const testDoc: TestDocument = { name: 'test', value: 42 };
      const created = await dataStore.create(testDoc);
      
      const deleted = await dataStore.delete(created._id!.toString());
      
      expect(deleted).toBe(true);
      
      // Verify it's actually deleted
      const found = await dataStore.findById(created._id!.toString());
      expect(found).toBeNull();
    });

    it('should return false for non-existent ID', async () => {
      const nonExistentId = new ObjectId().toString();
      const result = await dataStore.delete(nonExistentId);
      
      expect(result).toBe(false);
    });
  });
});