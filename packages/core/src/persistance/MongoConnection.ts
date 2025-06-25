import { MongoClient, Db, MongoClientOptions } from 'mongodb';

export interface MongoConnectionConfig {
  uri: string;
  dbName: string;
  options?: MongoClientOptions;
}

export class MongoConnection {
  private static instance: MongoConnection;
  private client: MongoClient;
  private db: Db;
  private config: MongoConnectionConfig;
  private isConnected: boolean = false;

  private constructor(config: MongoConnectionConfig) {
    this.config = config;

    // Optimized connection options for Atlas
    const defaultOptions: MongoClientOptions = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      retryReads: true,
      ...config.options
    };

    this.client = new MongoClient(config.uri, defaultOptions);
    this.db = this.client.db(config.dbName);
  }

  public static getInstance(config: MongoConnectionConfig): MongoConnection {
    if (!MongoConnection.instance) {
      MongoConnection.instance = new MongoConnection(config);
    }
    return MongoConnection.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await this.client.connect();

      // Test the connection
      await this.client.db('admin').command({ ping: 1 });

      this.isConnected = true;
      console.log(`✅ Connected to MongoDB Atlas: ${this.config.dbName}`);
    } catch (error) {
      this.isConnected = false;
      console.error('❌ MongoDB connection failed:', error);
      throw new Error(`Failed to connect to MongoDB: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.client.close();
      this.isConnected = false;
      console.log('✅ Disconnected from MongoDB Atlas');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public getDb(): Db {
    if (!this.isConnected) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }
    return this.db;
  }

  public getClient(): MongoClient {
    if (!this.isConnected) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }
    return this.client;
  }

  public isConnectionActive(): boolean {
    return this.isConnected;
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.client.db('admin').command({ ping: 1 });
      return true;
    } catch {
      return false;
    }
  }
}