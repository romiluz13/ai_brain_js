/**
 * @file ChangeStreamManager - Real-time MongoDB Change Streams for tracing
 * 
 * This class implements MongoDB Change Streams for real-time trace monitoring,
 * following official MongoDB patterns with proper resume token handling,
 * error recovery, and observer pattern for notifying subscribers.
 * 
 * Features:
 * - Official MongoDB Change Streams API compliance
 * - Resume token handling for reliability
 * - Observer pattern for real-time notifications
 * - Automatic error recovery and reconnection
 * - Filtered change streams for performance
 */

import { ChangeStream, ChangeStreamDocument, MongoClient, ResumeToken } from 'mongodb';
import { EventEmitter } from 'events';
import { TracingCollection, AgentTrace } from '../collections/TracingCollection';
import { MongoConnection } from '../persistance/MongoConnection';

export interface TraceChangeEvent {
  operationType: 'insert' | 'update' | 'delete' | 'replace';
  traceId: string;
  agentId: string;
  sessionId: string;
  fullDocument?: AgentTrace;
  updateDescription?: {
    updatedFields: Record<string, any>;
    removedFields: string[];
  };
  timestamp: Date;
  resumeToken: ResumeToken;
}

export interface ChangeStreamOptions {
  // Filter options
  agentId?: string;
  sessionId?: string;
  status?: AgentTrace['status'];
  framework?: string;
  
  // Stream options
  fullDocument?: 'default' | 'updateLookup' | 'whenAvailable' | 'required';
  maxAwaitTimeMS?: number;
  batchSize?: number;
  
  // Resume options
  resumeAfter?: ResumeToken;
  startAfter?: ResumeToken;
  startAtOperationTime?: Date;
}

export interface ChangeStreamSubscriber {
  id: string;
  filter?: (event: TraceChangeEvent) => boolean;
  onTraceChange: (event: TraceChangeEvent) => void;
  onError?: (error: Error) => void;
}

/**
 * ChangeStreamManager - Real-time MongoDB Change Streams for tracing
 * 
 * This class provides enterprise-grade real-time monitoring of trace changes
 * using MongoDB Change Streams with proper error handling and recovery.
 */
export class ChangeStreamManager extends EventEmitter {
  private tracingCollection: TracingCollection;
  private mongoConnection: MongoConnection;
  private changeStream?: ChangeStream<AgentTrace>;
  private subscribers: Map<string, ChangeStreamSubscriber> = new Map();
  private isActive: boolean = false;
  private resumeToken?: ResumeToken;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000; // Start with 1 second
  private options: ChangeStreamOptions;

  constructor(
    tracingCollection: TracingCollection,
    mongoConnection: MongoConnection,
    options: ChangeStreamOptions = {}
  ) {
    super();
    this.tracingCollection = tracingCollection;
    this.mongoConnection = mongoConnection;
    this.options = {
      fullDocument: 'updateLookup',
      maxAwaitTimeMS: 1000,
      batchSize: 100,
      ...options
    };
  }

  /**
   * Start the change stream with proper MongoDB patterns
   */
  async start(): Promise<void> {
    if (this.isActive) {
      console.warn('⚠️ ChangeStreamManager is already active');
      return;
    }

    try {
      await this.createChangeStream();
      this.isActive = true;
      this.reconnectAttempts = 0;
      console.log('🔄 ChangeStreamManager started successfully');
    } catch (error) {
      console.error('❌ Failed to start ChangeStreamManager:', error);
      throw error;
    }
  }

  /**
   * Stop the change stream
   */
  async stop(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    
    if (this.changeStream) {
      try {
        await this.changeStream.close();
        console.log('🛑 ChangeStreamManager stopped');
      } catch (error) {
        console.error('❌ Error stopping change stream:', error);
      }
    }
  }

  /**
   * Subscribe to trace changes with optional filtering
   */
  subscribe(subscriber: ChangeStreamSubscriber): void {
    this.subscribers.set(subscriber.id, subscriber);
    console.log(`📡 Subscriber ${subscriber.id} added to ChangeStreamManager`);
  }

  /**
   * Unsubscribe from trace changes
   */
  unsubscribe(subscriberId: string): void {
    this.subscribers.delete(subscriberId);
    console.log(`📡 Subscriber ${subscriberId} removed from ChangeStreamManager`);
  }

  /**
   * Get current resume token for external storage
   */
  getResumeToken(): ResumeToken | undefined {
    return this.resumeToken;
  }

  /**
   * Set resume token for recovery
   */
  setResumeToken(token: ResumeToken): void {
    this.resumeToken = token;
  }

  /**
   * Create and configure the MongoDB Change Stream
   */
  private async createChangeStream(): Promise<void> {
    const collection = this.tracingCollection.getCollection();
    
    // Build aggregation pipeline for filtering
    const pipeline = this.buildPipeline();
    
    // Build change stream options
    const streamOptions: any = {
      fullDocument: this.options.fullDocument,
      maxAwaitTimeMS: this.options.maxAwaitTimeMS,
      batchSize: this.options.batchSize
    };

    // Add resume options if available
    if (this.resumeToken) {
      streamOptions.resumeAfter = this.resumeToken;
    } else if (this.options.resumeAfter) {
      streamOptions.resumeAfter = this.options.resumeAfter;
    } else if (this.options.startAfter) {
      streamOptions.startAfter = this.options.startAfter;
    } else if (this.options.startAtOperationTime) {
      streamOptions.startAtOperationTime = this.options.startAtOperationTime;
    }

    // Create the change stream using official MongoDB pattern
    this.changeStream = collection.watch(pipeline, streamOptions);

    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Build aggregation pipeline for filtering changes
   */
  private buildPipeline(): any[] {
    const pipeline: any[] = [];

    // Filter by operation types we care about
    const matchStage: any = {
      $match: {
        operationType: { $in: ['insert', 'update', 'replace'] }
      }
    };

    // Add filters based on options
    if (this.options.agentId) {
      matchStage.$match['fullDocument.agentId'] = this.options.agentId;
    }

    if (this.options.sessionId) {
      matchStage.$match['fullDocument.sessionId'] = this.options.sessionId;
    }

    if (this.options.status) {
      matchStage.$match['fullDocument.status'] = this.options.status;
    }

    if (this.options.framework) {
      matchStage.$match['fullDocument.framework.frameworkName'] = this.options.framework;
    }

    pipeline.push(matchStage);

    return pipeline;
  }

  /**
   * Set up event handlers for the change stream
   */
  private setupEventHandlers(): void {
    if (!this.changeStream) {
      return;
    }

    // Handle change events
    this.changeStream.on('change', (change: ChangeStreamDocument<AgentTrace>) => {
      try {
        this.handleChange(change);
      } catch (error) {
        console.error('❌ Error handling change event:', error);
        this.emit('error', error);
      }
    });

    // Handle errors with automatic recovery
    this.changeStream.on('error', (error: Error) => {
      console.error('❌ Change stream error:', error);
      this.handleError(error);
    });

    // Handle close events
    this.changeStream.on('close', () => {
      console.log('🔄 Change stream closed');
      if (this.isActive) {
        this.attemptReconnect();
      }
    });

    // Handle end events
    this.changeStream.on('end', () => {
      console.log('🔄 Change stream ended');
      if (this.isActive) {
        this.attemptReconnect();
      }
    });
  }

  /**
   * Handle individual change events
   */
  private handleChange(change: ChangeStreamDocument<AgentTrace>): void {
    // Store resume token for recovery
    this.resumeToken = change._id;

    // Convert to our event format
    const event: TraceChangeEvent = {
      operationType: change.operationType as any,
      traceId: change.fullDocument?.traceId || '',
      agentId: change.fullDocument?.agentId?.toString() || '',
      sessionId: change.fullDocument?.sessionId || '',
      fullDocument: change.fullDocument,
      updateDescription: change.updateDescription,
      timestamp: new Date(),
      resumeToken: change._id
    };

    // Notify all subscribers
    this.notifySubscribers(event);

    // Emit event for direct listeners
    this.emit('traceChange', event);
  }

  /**
   * Notify all subscribers of a change event
   */
  private notifySubscribers(event: TraceChangeEvent): void {
    for (const subscriber of this.subscribers.values()) {
      try {
        // Apply subscriber filter if present
        if (subscriber.filter && !subscriber.filter(event)) {
          continue;
        }

        // Notify subscriber
        subscriber.onTraceChange(event);
      } catch (error) {
        console.error(`❌ Error notifying subscriber ${subscriber.id}:`, error);
        
        // Notify subscriber of error if handler exists
        if (subscriber.onError) {
          subscriber.onError(error);
        }
      }
    }
  }

  /**
   * Handle change stream errors
   */
  private handleError(error: Error): void {
    console.error('❌ Change stream error:', error);
    
    // Emit error event
    this.emit('error', error);
    
    // Attempt reconnection if still active
    if (this.isActive) {
      this.attemptReconnect();
    }
  }

  /**
   * Attempt to reconnect the change stream
   */
  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
      this.isActive = false;
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(async () => {
      try {
        await this.createChangeStream();
        this.reconnectAttempts = 0; // Reset on successful reconnection
        console.log('✅ Change stream reconnected successfully');
        this.emit('reconnected');
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
        this.attemptReconnect(); // Try again
      }
    }, delay);
  }

  /**
   * Get statistics about the change stream
   */
  getStats(): {
    isActive: boolean;
    subscriberCount: number;
    reconnectAttempts: number;
    hasResumeToken: boolean;
  } {
    return {
      isActive: this.isActive,
      subscriberCount: this.subscribers.size,
      reconnectAttempts: this.reconnectAttempts,
      hasResumeToken: !!this.resumeToken
    };
  }
}
