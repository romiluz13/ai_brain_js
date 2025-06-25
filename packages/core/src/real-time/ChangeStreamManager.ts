import { Collection, Db, ChangeStream, Document } from 'mongodb';

export type ChangeHandler = (change: Document) => Promise<void>;

export class ChangeStreamManager {
  private changeStream?: ChangeStream;
  private db: Db;
  private collectionName: string;
  private pipeline: Document[];
  private handler: ChangeHandler;

  constructor(db: Db, collectionName: string, pipeline: Document[], handler: ChangeHandler) {
    this.db = db;
    this.collectionName = collectionName;
    this.pipeline = pipeline;
    this.handler = handler;
  }

  public async start(): Promise<void> {
    const collection = this.db.collection(this.collectionName);
    this.changeStream = collection.watch(this.pipeline);

    this.changeStream.on('change', this.handler);

    this.changeStream.on('error', (error) => {
      console.error(`Change stream error on collection ${this.collectionName}:`, error);
      // In a production system, you would add reconnection logic here.
    });

    console.log(`Watching for changes on ${this.collectionName}...`);
  }

  public async stop(): Promise<void> {
    if (this.changeStream) {
      await this.changeStream.close();
      console.log(`Stopped watching for changes on ${this.collectionName}.`);
    }
  }
}