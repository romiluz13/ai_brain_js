/**
 * Change Stream Manager - Real-time Multi-Agent Coordination
 * 
 * This manager implements MongoDB Change Streams for real-time coordination
 * between multiple AI agents, enabling live updates, event-driven responses,
 * and seamless multi-agent collaboration.
 * 
 * Features:
 * - Real-time memory updates across agents
 * - Event-driven workflow coordination
 * - Live context synchronization
 * - Multi-agent conversation awareness
 * - Automatic conflict resolution
 * - Performance monitoring and optimization
 */

import { ChangeStream, Collection, Db, ChangeStreamDocument } from 'mongodb';
import { EventEmitter } from 'events';

export interface ChangeStreamConfig {
  enableMemorySync: boolean;
  enableWorkflowSync: boolean;
  enableContextSync: boolean;
  enableSafetySync: boolean;
  batchSize: number;
  maxAwaitTimeMS: number;
  resumeAfter?: any;
  startAtOperationTime?: any;
}

export interface AgentCoordinationEvent {
  type: 'memory_update' | 'workflow_step' | 'context_change' | 'safety_alert' | 'agent_join' | 'agent_leave';
  agentId: string;
  sessionId: string;
  framework: string;
  timestamp: Date;
  data: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface MultiAgentSession {
  sessionId: string;
  activeAgents: Set<string>;
  frameworks: Set<string>;
  lastActivity: Date;
  sharedContext: any[];
  coordinationRules: {
    allowMemorySharing: boolean;
    allowWorkflowHandoff: boolean;
    conflictResolution: 'first_wins' | 'last_wins' | 'merge' | 'vote';
  };
}

export class ChangeStreamManager extends EventEmitter {
  private db: Db;
  private config: ChangeStreamConfig;
  private changeStreams: Map<string, ChangeStream> = new Map();
  private activeSessions: Map<string, MultiAgentSession> = new Map();
  private isRunning: boolean = false;

  constructor(db: Db, config?: Partial<ChangeStreamConfig>) {
    super();
    this.db = db;
    this.config = {
      enableMemorySync: true,
      enableWorkflowSync: true,
      enableContextSync: true,
      enableSafetySync: true,
      batchSize: 100,
      maxAwaitTimeMS: 1000,
      ...config
    };
  }

  /**
   * Initialize change stream monitoring
   */
  async initialize(): Promise<void> {
    console.log('🔄 Initializing Change Stream Manager...');
    
    try {
      // Start change streams for different collections
      if (this.config.enableMemorySync) {
        await this.startMemoryChangeStream();
      }
      
      if (this.config.enableWorkflowSync) {
        await this.startWorkflowChangeStream();
      }
      
      if (this.config.enableContextSync) {
        await this.startContextChangeStream();
      }
      
      if (this.config.enableSafetySync) {
        await this.startSafetyChangeStream();
      }

      this.isRunning = true;
      console.log('✅ Change Stream Manager initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize Change Stream Manager:', error);
      throw error;
    }
  }

  /**
   * Register an agent for multi-agent coordination
   */
  async registerAgent(
    agentId: string,
    sessionId: string,
    framework: string,
    options: {
      allowMemorySharing?: boolean;
      allowWorkflowHandoff?: boolean;
      conflictResolution?: 'first_wins' | 'last_wins' | 'merge' | 'vote';
    } = {}
  ): Promise<void> {
    let session = this.activeSessions.get(sessionId);
    
    if (!session) {
      session = {
        sessionId,
        activeAgents: new Set(),
        frameworks: new Set(),
        lastActivity: new Date(),
        sharedContext: [],
        coordinationRules: {
          allowMemorySharing: options.allowMemorySharing ?? true,
          allowWorkflowHandoff: options.allowWorkflowHandoff ?? true,
          conflictResolution: options.conflictResolution ?? 'last_wins'
        }
      };
      this.activeSessions.set(sessionId, session);
    }

    session.activeAgents.add(agentId);
    session.frameworks.add(framework);
    session.lastActivity = new Date();

    // Emit agent join event
    this.emitCoordinationEvent({
      type: 'agent_join',
      agentId,
      sessionId,
      framework,
      timestamp: new Date(),
      data: { agentCount: session.activeAgents.size },
      priority: 'medium'
    });

    console.log(`🤝 Registered agent ${agentId} for session ${sessionId} (${session.activeAgents.size} agents active)`);
  }

  /**
   * Unregister an agent from coordination
   */
  async unregisterAgent(agentId: string, sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    
    if (session) {
      session.activeAgents.delete(agentId);
      
      // Emit agent leave event
      this.emitCoordinationEvent({
        type: 'agent_leave',
        agentId,
        sessionId,
        framework: 'unknown',
        timestamp: new Date(),
        data: { agentCount: session.activeAgents.size },
        priority: 'medium'
      });

      // Clean up empty sessions
      if (session.activeAgents.size === 0) {
        this.activeSessions.delete(sessionId);
        console.log(`🧹 Cleaned up empty session: ${sessionId}`);
      }
    }

    console.log(`👋 Unregistered agent ${agentId} from session ${sessionId}`);
  }

  /**
   * Broadcast event to all agents in a session
   */
  async broadcastToSession(
    sessionId: string,
    event: Omit<AgentCoordinationEvent, 'timestamp'>,
    excludeAgent?: string
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      return;
    }

    const fullEvent: AgentCoordinationEvent = {
      ...event,
      timestamp: new Date()
    };

    // Emit to all agents in session except the sender
    for (const agentId of session.activeAgents) {
      if (agentId !== excludeAgent) {
        this.emit(`agent:${agentId}`, fullEvent);
      }
    }

    // Also emit to session-level listeners
    this.emit(`session:${sessionId}`, fullEvent);
    
    console.log(`📡 Broadcasted ${event.type} to ${session.activeAgents.size} agents in session ${sessionId}`);
  }

  /**
   * Get active sessions and their agents
   */
  getActiveSessions(): Array<{
    sessionId: string;
    agentCount: number;
    frameworks: string[];
    lastActivity: Date;
  }> {
    return Array.from(this.activeSessions.values()).map(session => ({
      sessionId: session.sessionId,
      agentCount: session.activeAgents.size,
      frameworks: Array.from(session.frameworks),
      lastActivity: session.lastActivity
    }));
  }

  /**
   * Start memory change stream
   */
  private async startMemoryChangeStream(): Promise<void> {
    const memoryCollection = this.db.collection('agent_memory');
    
    const pipeline = [
      {
        $match: {
          $or: [
            { operationType: 'insert' },
            { operationType: 'update' },
            { operationType: 'delete' }
          ]
        }
      }
    ];

    const changeStream = memoryCollection.watch(pipeline, {
      batchSize: this.config.batchSize,
      maxAwaitTimeMS: this.config.maxAwaitTimeMS,
      resumeAfter: this.config.resumeAfter,
      startAtOperationTime: this.config.startAtOperationTime
    });

    changeStream.on('change', (change: ChangeStreamDocument) => {
      this.handleMemoryChange(change);
    });

    changeStream.on('error', (error) => {
      console.error('Memory change stream error:', error);
      this.emit('error', error);
    });

    this.changeStreams.set('memory', changeStream);
    console.log('👁️ Started memory change stream');
  }

  /**
   * Start workflow change stream
   */
  private async startWorkflowChangeStream(): Promise<void> {
    const workflowCollection = this.db.collection('agent_workflows');
    
    const pipeline = [
      {
        $match: {
          operationType: { $in: ['insert', 'update'] }
        }
      }
    ];

    const changeStream = workflowCollection.watch(pipeline, {
      batchSize: this.config.batchSize,
      maxAwaitTimeMS: this.config.maxAwaitTimeMS
    });

    changeStream.on('change', (change: ChangeStreamDocument) => {
      this.handleWorkflowChange(change);
    });

    changeStream.on('error', (error) => {
      console.error('Workflow change stream error:', error);
      this.emit('error', error);
    });

    this.changeStreams.set('workflow', changeStream);
    console.log('🔄 Started workflow change stream');
  }

  /**
   * Start context change stream
   */
  private async startContextChangeStream(): Promise<void> {
    const contextCollection = this.db.collection('agent_context');
    
    const pipeline = [
      {
        $match: {
          operationType: { $in: ['insert', 'update', 'delete'] }
        }
      }
    ];

    const changeStream = contextCollection.watch(pipeline, {
      batchSize: this.config.batchSize,
      maxAwaitTimeMS: this.config.maxAwaitTimeMS
    });

    changeStream.on('change', (change: ChangeStreamDocument) => {
      this.handleContextChange(change);
    });

    changeStream.on('error', (error) => {
      console.error('Context change stream error:', error);
      this.emit('error', error);
    });

    this.changeStreams.set('context', changeStream);
    console.log('🎯 Started context change stream');
  }

  /**
   * Start safety change stream
   */
  private async startSafetyChangeStream(): Promise<void> {
    const safetyCollection = this.db.collection('agent_safety_logs');
    
    const pipeline = [
      {
        $match: {
          operationType: 'insert',
          'fullDocument.safetyCheck.success': false
        }
      }
    ];

    const changeStream = safetyCollection.watch(pipeline, {
      batchSize: this.config.batchSize,
      maxAwaitTimeMS: this.config.maxAwaitTimeMS
    });

    changeStream.on('change', (change: ChangeStreamDocument) => {
      this.handleSafetyChange(change);
    });

    changeStream.on('error', (error) => {
      console.error('Safety change stream error:', error);
      this.emit('error', error);
    });

    this.changeStreams.set('safety', changeStream);
    console.log('🛡️ Started safety change stream');
  }

  /**
   * Handle memory changes
   */
  private handleMemoryChange(change: ChangeStreamDocument): void {
    const document = change.fullDocument;
    
    if (!document || !document.metadata) {
      return;
    }

    const sessionId = document.metadata.sessionId;
    const framework = document.metadata.framework;
    
    if (sessionId && this.activeSessions.has(sessionId)) {
      this.broadcastToSession(sessionId, {
        type: 'memory_update',
        agentId: 'system',
        sessionId,
        framework: framework || 'unknown',
        data: {
          operationType: change.operationType,
          memoryId: document.id,
          content: document.content?.substring(0, 100) + '...',
          importance: document.metadata.importance,
          type: document.metadata.type
        },
        priority: 'medium'
      });
    }
  }

  /**
   * Handle workflow changes
   */
  private handleWorkflowChange(change: ChangeStreamDocument): void {
    const document = change.fullDocument;
    
    if (!document) {
      return;
    }

    const sessionId = document.sessionId;
    const framework = document.framework;
    
    if (sessionId && this.activeSessions.has(sessionId)) {
      this.broadcastToSession(sessionId, {
        type: 'workflow_step',
        agentId: document.agentId || 'system',
        sessionId,
        framework: framework || 'unknown',
        data: {
          operationType: change.operationType,
          workflowId: document.workflowId,
          workflowName: document.name,
          status: document.status,
          stepsCompleted: document.steps?.length || 0
        },
        priority: document.status === 'failed' ? 'high' : 'medium'
      }, document.agentId);
    }
  }

  /**
   * Handle context changes
   */
  private handleContextChange(change: ChangeStreamDocument): void {
    const document = change.fullDocument;
    
    if (!document) {
      return;
    }

    const sessionId = document.sessionId;
    const framework = document.framework;
    
    if (sessionId && this.activeSessions.has(sessionId)) {
      this.broadcastToSession(sessionId, {
        type: 'context_change',
        agentId: 'system',
        sessionId,
        framework: framework || 'unknown',
        data: {
          operationType: change.operationType,
          contextId: document.contextId,
          contextType: document.contextType,
          priority: document.priority,
          relevanceScore: document.relevanceScore
        },
        priority: document.priority === 'urgent' ? 'high' : 'medium'
      });
    }
  }

  /**
   * Handle safety changes (alerts)
   */
  private handleSafetyChange(change: ChangeStreamDocument): void {
    const document = change.fullDocument;
    
    if (!document) {
      return;
    }

    const sessionId = document.sessionId;
    const framework = document.framework;
    
    if (sessionId && this.activeSessions.has(sessionId)) {
      this.broadcastToSession(sessionId, {
        type: 'safety_alert',
        agentId: document.agentId || 'system',
        sessionId,
        framework: framework || 'unknown',
        data: {
          safetyCheckType: document.safetyCheck?.type,
          riskLevel: document.metadata?.riskLevel,
          detected: document.safetyCheck?.detected,
          action: document.safetyCheck?.action
        },
        priority: 'critical'
      }, document.agentId);
    }

    // Also emit global safety alert
    this.emit('safety_alert', {
      sessionId,
      agentId: document.agentId,
      safetyCheck: document.safetyCheck,
      timestamp: new Date()
    });
  }

  /**
   * Emit coordination event
   */
  private emitCoordinationEvent(event: AgentCoordinationEvent): void {
    this.emit('coordination_event', event);
    this.emit(`event:${event.type}`, event);
  }

  /**
   * Subscribe to agent-specific events
   */
  subscribeToAgent(agentId: string, callback: (event: AgentCoordinationEvent) => void): void {
    this.on(`agent:${agentId}`, callback);
  }

  /**
   * Subscribe to session-specific events
   */
  subscribeToSession(sessionId: string, callback: (event: AgentCoordinationEvent) => void): void {
    this.on(`session:${sessionId}`, callback);
  }

  /**
   * Unsubscribe from agent events
   */
  unsubscribeFromAgent(agentId: string, callback?: (event: AgentCoordinationEvent) => void): void {
    if (callback) {
      this.off(`agent:${agentId}`, callback);
    } else {
      this.removeAllListeners(`agent:${agentId}`);
    }
  }

  /**
   * Unsubscribe from session events
   */
  unsubscribeFromSession(sessionId: string, callback?: (event: AgentCoordinationEvent) => void): void {
    if (callback) {
      this.off(`session:${sessionId}`, callback);
    } else {
      this.removeAllListeners(`session:${sessionId}`);
    }
  }

  /**
   * Get change stream statistics
   */
  getChangeStreamStats(): {
    activeStreams: number;
    activeSessions: number;
    totalAgents: number;
    isRunning: boolean;
  } {
    const totalAgents = Array.from(this.activeSessions.values())
      .reduce((sum, session) => sum + session.activeAgents.size, 0);

    return {
      activeStreams: this.changeStreams.size,
      activeSessions: this.activeSessions.size,
      totalAgents,
      isRunning: this.isRunning
    };
  }

  /**
   * Shutdown change streams
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Change Stream Manager...');
    
    // Close all change streams
    for (const [name, stream] of this.changeStreams) {
      try {
        await stream.close();
        console.log(`✅ Closed ${name} change stream`);
      } catch (error) {
        console.error(`Failed to close ${name} change stream:`, error);
      }
    }

    this.changeStreams.clear();
    this.activeSessions.clear();
    this.isRunning = false;
    this.removeAllListeners();
    
    console.log('✅ Change Stream Manager shutdown complete');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ChangeStreamConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Updated change stream configuration');
  }

  /**
   * Get current configuration
   */
  getConfig(): ChangeStreamConfig {
    return { ...this.config };
  }
}
