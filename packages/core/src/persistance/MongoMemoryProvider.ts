import { Collection, Db, ObjectId } from 'mongodb';
import { IMemoryStore, Message, SessionMetadata } from './IMemoryStore';
import { SchemaValidator } from '../schemas/validator';

const MEMORY_COLLECTION = 'agent_working_memory';

interface ContextMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  tool_name?: string;
  tool_input?: any;
  tool_output?: any;
}

interface WorkingState {
  current_task?: string;
  progress?: number;
  next_action?: string;
  confidence?: number;
  variables?: Record<string, any>;
}

interface AgentWorkingMemoryDoc {
  _id?: ObjectId;
  session_id: string;
  agent_id: string;
  created_at: Date;
  expires_at: Date;
  context_window: ContextMessage[];
  working_state?: WorkingState;
  temp_findings?: Record<string, any>;
}

export class MongoMemoryProvider implements IMemoryStore {
  private collection: Collection<AgentWorkingMemoryDoc>;
  private ttlHours: number;

  constructor(db: Db, ttlHours: number = 3) {
    this.collection = db.collection<AgentWorkingMemoryDoc>(MEMORY_COLLECTION);
    this.ttlHours = ttlHours;
  }

  async getHistory(agentId: string, sessionId: string, options?: { limit?: number }): Promise<Message[]> {
    const memory = await this.collection.findOne({
      agent_id: agentId,
      session_id: sessionId
    });

    if (!memory) {
      return [];
    }

    const messages = memory.context_window.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp
    }));

    if (options?.limit) {
      return messages.slice(-options.limit);
    }

    return messages;
  }

  async addMessage(agentId: string, sessionId: string, message: Message): Promise<void> {
    const ttlMs = this.ttlHours * 60 * 60 * 1000;
    const now = new Date();
    const expires_at = new Date(now.getTime() + ttlMs);

    const contextMessage: ContextMessage = {
      role: message.role as 'user' | 'assistant' | 'system' | 'tool',
      content: message.content,
      timestamp: message.timestamp || now
    };

    // Try to update existing document
    const result = await this.collection.updateOne(
      { agent_id: agentId, session_id: sessionId },
      {
        $push: { context_window: contextMessage },
        $set: { expires_at },
      }
    );

    // If no document exists, create a new one
    if (result.matchedCount === 0) {
      const newDoc: AgentWorkingMemoryDoc = {
        session_id: sessionId,
        agent_id: agentId,
        created_at: now,
        expires_at,
        context_window: [contextMessage],
        working_state: {
          current_task: 'conversation',
          progress: 0,
          confidence: 1.0,
          variables: {}
        },
        temp_findings: {}
      };

      // Convert dates to ISO strings for validation
      const validationDoc = {
        ...newDoc,
        created_at: newDoc.created_at.toISOString(),
        expires_at: newDoc.expires_at.toISOString(),
        context_window: newDoc.context_window.map(msg => ({
          ...msg,
          timestamp: msg.timestamp.toISOString()
        }))
      };

      // Validate the document
      SchemaValidator.validateOrThrow('agentWorkingMemory', validationDoc);

      await this.collection.insertOne(newDoc);
    }
  }

  async clearSession(agentId: string, sessionId: string): Promise<void> {
    await this.collection.deleteOne({ agent_id: agentId, session_id: sessionId });
  }

  async getSessionMetadata(agentId: string, sessionId: string): Promise<SessionMetadata | null> {
    const memory = await this.collection.findOne(
      { agent_id: agentId, session_id: sessionId },
      { projection: { agent_id: 1, session_id: 1, context_window: { $slice: -1 } } }
    );

    if (!memory) {
      return null;
    }

    return {
      agentId: memory.agent_id,
      sessionId: memory.session_id,
      messageCount: memory.context_window.length,
      lastMessageAt: memory.context_window[0]?.timestamp,
    };
  }

  async updateSessionMetadata(agentId: string, sessionId: string, metadata: Partial<SessionMetadata>): Promise<void> {
    await this.collection.updateOne(
      { agent_id: agentId, session_id: sessionId },
      { $set: metadata },
      { upsert: true }
    );
  }
}