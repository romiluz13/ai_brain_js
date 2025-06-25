/**
 * @file Defines the interface for an agent's memory store.
 * This interface provides a contract for managing the conversational history
 * and working memory of an AI agent.
 */

import { Document } from 'mongodb';

/**
 * Represents a single message in a conversation.
 */
export interface Message extends Document {
  /** The role of the message sender (e.g., 'user', 'assistant', 'tool'). */
  role: string;
  /** The content of the message. */
  content: string;
  /** The timestamp of the message. */
  timestamp: Date;
}

/**
 * Represents the metadata for a session.
 */
export interface SessionMetadata extends Document {
  /** The agent ID. */
  agentId: string;
  /** The session ID. */
  sessionId: string;
  /** The number of messages in the session. */
  messageCount: number;
  /** The timestamp of the last message. */
  lastMessageAt: Date;
  /** Any other custom metadata. */
  [key: string]: any;
}

/**
 * Defines the interface for an agent's memory store.
 */
export interface IMemoryStore {
  /**
   * Adds a message to an agent's session history.
   * @param agentId The ID of the agent.
   * @param sessionId The ID of the session.
   * @param message The message to add.
   * @returns A promise that resolves when the operation is complete.
   */
  addMessage(agentId: string, sessionId: string, message: Message): Promise<void>;

  /**
   * Retrieves the message history for an agent's session.
   * @param agentId The ID of the agent.
   * @param sessionId The ID of the session.
   * @param options Options for retrieving the history, such as the number of messages to return.
   * @returns A promise that resolves with an array of messages.
   */
  getHistory(agentId: string, sessionId: string, options?: { limit?: number }): Promise<Message[]>;

  /**
   * Clears the message history for an agent's session.
   * @param agentId The ID of the agent.
   * @param sessionId The ID of the session.
   * @returns A promise that resolves when the operation is complete.
   */
  clearSession(agentId: string, sessionId: string): Promise<void>;

  /**
   * Retrieves the metadata for a session.
   * @param agentId The ID of the agent.
   * @param sessionId The ID of the session.
   * @returns A promise that resolves with the session metadata, or null if not found.
   */
  getSessionMetadata(agentId: string, sessionId: string): Promise<SessionMetadata | null>;

  /**
   * Updates the metadata for a session.
   * @param agentId The ID of the agent.
   * @param sessionId The ID of the session.
   * @param metadata The metadata to update.
   * @returns A promise that resolves when the operation is complete.
   */
  updateSessionMetadata(agentId: string, sessionId: string, metadata: Partial<SessionMetadata>): Promise<void>;
}