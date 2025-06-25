import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';

let mongod: MongoMemoryServer;
let client: MongoClient;
let db: Db;

export async function setupTestDb(): Promise<Db> {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  client = new MongoClient(uri);
  await client.connect();
  db = client.db('test_ai_agents');
  return db;
}

export async function teardownTestDb(): Promise<void> {
  if (client) {
    await client.close();
  }
  if (mongod) {
    await mongod.stop();
  }
}

export function getTestDb(): Db {
  return db;
}