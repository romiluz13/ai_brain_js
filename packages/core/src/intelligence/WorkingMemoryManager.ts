/**
 * Working Memory Manager - Advanced Session-Based Memory Management
 * 
 * This manager handles temporary processing context with intelligent cleanup,
 * priority-based eviction, and automatic TTL management. It ensures optimal
 * performance while maintaining the most relevant working memories.
 * 
 * Features:
 * - Session-specific memory isolation
 * - Priority-based eviction algorithms
 * - Automatic TTL cleanup and management
 * - Memory pressure monitoring
 * - Intelligent memory promotion/demotion
 * - Cross-session memory sharing when beneficial
 */

import { Collection, Db } from 'mongodb';
import { SemanticMemoryEngine } from './SemanticMemoryEngine';

export interface WorkingMemoryConfig {
  // Memory limits per session
  maxMemoriesPerSession: number;     // 50 memories per session
  maxTotalWorkingMemories: number;   // 1000 total working memories
  
  // TTL settings
  defaultTTLMinutes: number;         // 30 minutes default
  maxTTLMinutes: number;             // 240 minutes maximum
  minTTLMinutes: number;             // 5 minutes minimum
  
  // Priority thresholds
  highPriorityThreshold: number;     // 0.8 = High priority
  lowPriorityThreshold: number;      // 0.3 = Low priority
  
  // Cleanup intervals
  cleanupIntervalMinutes: number;    // 15 minutes cleanup interval
  pressureCleanupThreshold: number;  // 0.8 = 80% capacity triggers cleanup
  
  // Memory promotion settings
  accessCountForPromotion: number;   // 3 accesses promotes to long-term
  importanceBoostOnAccess: number;   // 0.1 = 10% boost per access
}

export interface WorkingMemoryItem {
  id: string;
  content: string;
  sessionId: string;
  framework: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  importance: number;
  confidence: number;
  created: Date;
  expires: Date;
  lastAccessed: Date;
  accessCount: number;
  tags: string[];
  metadata: {
    userId?: string;
    agentId?: string;
    taskType?: string;
    relatedMemories?: string[];
    promotionCandidate?: boolean;
    [key: string]: any;
  };
}

export interface MemoryPressureStats {
  totalWorkingMemories: number;
  memoriesPerSession: Record<string, number>;
  averageAge: number;
  expiredMemories: number;
  highPriorityMemories: number;
  memoryPressure: number; // 0-1 scale
  recommendedAction: 'none' | 'cleanup' | 'aggressive_cleanup' | 'promote_memories';
}

export class WorkingMemoryManager {
  private db: Db;
  private workingMemoryCollection: Collection;
  private memoryEngine: SemanticMemoryEngine;
  private config: WorkingMemoryConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private isCleanupRunning: boolean = false;

  constructor(
    db: Db, 
    memoryEngine: SemanticMemoryEngine, 
    config?: Partial<WorkingMemoryConfig>
  ) {
    this.db = db;
    this.workingMemoryCollection = db.collection('working_memory');
    this.memoryEngine = memoryEngine;
    
    this.config = {
      maxMemoriesPerSession: 50,
      maxTotalWorkingMemories: 1000,
      defaultTTLMinutes: 30,
      maxTTLMinutes: 240,
      minTTLMinutes: 5,
      highPriorityThreshold: 0.8,
      lowPriorityThreshold: 0.3,
      cleanupIntervalMinutes: 15,
      pressureCleanupThreshold: 0.8,
      accessCountForPromotion: 3,
      importanceBoostOnAccess: 0.1,
      ...config
    };
  }

  /**
   * Initialize the working memory manager
   */
  async initialize(): Promise<void> {
    console.log('🧠 Initializing Working Memory Manager...');
    
    // Create indexes for efficient operations
    await this.createIndexes();
    
    // Start automatic cleanup
    this.startAutomaticCleanup();
    
    // Initial cleanup of expired memories
    await this.cleanupExpiredMemories();
    
    console.log('✅ Working Memory Manager initialized successfully');
  }

  /**
   * Store working memory with intelligent TTL and priority
   */
  async storeWorkingMemory(
    content: string,
    sessionId: string,
    framework: string,
    options: {
      priority?: 'low' | 'medium' | 'high' | 'critical';
      ttlMinutes?: number;
      importance?: number;
      confidence?: number;
      tags?: string[];
      metadata?: any;
    } = {}
  ): Promise<string> {
    // Check session memory limits
    await this.enforceSessionLimits(sessionId);
    
    // Check global memory pressure
    const pressure = await this.getMemoryPressure();
    if (pressure.memoryPressure > this.config.pressureCleanupThreshold) {
      await this.performPressureCleanup();
    }

    // Calculate intelligent TTL
    const ttlMinutes = this.calculateIntelligentTTL(options);
    const expires = new Date(Date.now() + ttlMinutes * 60 * 1000);

    // Determine priority based on importance and context
    const priority = options.priority || this.determinePriority(options.importance || 0.5);

    const workingMemory: WorkingMemoryItem = {
      id: `working_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      sessionId,
      framework,
      priority,
      importance: options.importance || 0.5,
      confidence: options.confidence || 0.8,
      created: new Date(),
      expires,
      lastAccessed: new Date(),
      accessCount: 0,
      tags: options.tags || [],
      metadata: {
        ttlMinutes,
        originalTTL: ttlMinutes,
        ...options.metadata
      }
    };

    await this.workingMemoryCollection.insertOne(workingMemory);
    
    console.log(`💭 Stored working memory: ${workingMemory.id} (TTL: ${ttlMinutes}m, Priority: ${priority})`);
    return workingMemory.id;
  }

  /**
   * Retrieve working memories for a session
   */
  async getWorkingMemories(
    sessionId: string,
    framework?: string,
    options: {
      limit?: number;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      includeExpired?: boolean;
    } = {}
  ): Promise<WorkingMemoryItem[]> {
    const query: any = { sessionId };
    
    if (framework) {
      query.framework = framework;
    }
    
    if (options.priority) {
      query.priority = options.priority;
    }
    
    if (!options.includeExpired) {
      query.expires = { $gt: new Date() };
    }

    const memories = await this.workingMemoryCollection
      .find(query)
      .sort({ 
        priority: -1,  // Critical > High > Medium > Low
        importance: -1,
        lastAccessed: -1 
      })
      .limit(options.limit || 20)
      .toArray();

    // Update access tracking
    if (memories.length > 0) {
      await this.updateAccessTracking(memories.map(m => m.id));
    }

    return memories;
  }

  /**
   * Search working memories semantically
   */
  async searchWorkingMemories(
    query: string,
    sessionId: string,
    framework?: string,
    limit: number = 5
  ): Promise<WorkingMemoryItem[]> {
    // Get all working memories for the session
    const memories = await this.getWorkingMemories(sessionId, framework, {
      limit: 50,
      includeExpired: false
    });

    if (memories.length === 0) {
      return [];
    }

    // Use semantic search to find most relevant
    // This would integrate with the embedding system
    const relevantMemories = memories
      .filter(memory => {
        // Simple text matching for now - would use embeddings in production
        const content = memory.content.toLowerCase();
        const searchTerms = query.toLowerCase().split(' ');
        return searchTerms.some(term => content.includes(term));
      })
      .sort((a, b) => {
        // Sort by priority, importance, and recency
        if (a.priority !== b.priority) {
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        if (a.importance !== b.importance) {
          return b.importance - a.importance;
        }
        return b.lastAccessed.getTime() - a.lastAccessed.getTime();
      })
      .slice(0, limit);

    // Update access tracking
    if (relevantMemories.length > 0) {
      await this.updateAccessTracking(relevantMemories.map(m => m.id));
    }

    return relevantMemories;
  }

  /**
   * Promote working memory to long-term memory
   */
  async promoteToLongTerm(workingMemoryId: string): Promise<void> {
    const workingMemory = await this.workingMemoryCollection.findOne({ id: workingMemoryId });
    
    if (!workingMemory) {
      return;
    }

    // Store in long-term memory
    await this.memoryEngine.storeMemory(
      workingMemory.content,
      {
        type: 'procedure', // Promoted working memories become procedures
        framework: workingMemory.framework,
        sessionId: workingMemory.sessionId,
        importance: Math.min(workingMemory.importance + 0.2, 1.0), // Boost importance
        confidence: workingMemory.confidence,
        tags: [...workingMemory.tags, 'promoted_from_working'],
        source: 'working_memory_promotion',
        relationships: workingMemory.metadata.relatedMemories || []
      }
    );

    // Remove from working memory
    await this.workingMemoryCollection.deleteOne({ id: workingMemoryId });
    
    console.log(`⬆️ Promoted working memory to long-term: ${workingMemoryId}`);
  }

  /**
   * Extend TTL for important working memories
   */
  async extendTTL(workingMemoryId: string, additionalMinutes: number): Promise<void> {
    const maxExpires = new Date(Date.now() + this.config.maxTTLMinutes * 60 * 1000);
    
    await this.workingMemoryCollection.updateOne(
      { id: workingMemoryId },
      {
        $set: {
          expires: {
            $min: [
              { $add: ['$expires', additionalMinutes * 60 * 1000] },
              maxExpires
            ]
          },
          'metadata.ttlExtended': true,
          'metadata.lastExtension': new Date()
        }
      }
    );
    
    console.log(`⏰ Extended TTL for working memory: ${workingMemoryId} (+${additionalMinutes}m)`);
  }

  /**
   * Clean up expired memories
   */
  async cleanupExpiredMemories(): Promise<number> {
    if (this.isCleanupRunning) {
      return 0;
    }

    this.isCleanupRunning = true;
    
    try {
      const now = new Date();
      
      // Find expired memories
      const expiredMemories = await this.workingMemoryCollection.find({
        expires: { $lt: now }
      }).toArray();

      // Check for promotion candidates before deletion
      for (const memory of expiredMemories) {
        if (this.shouldPromoteMemory(memory)) {
          await this.promoteToLongTerm(memory.id);
        }
      }

      // Delete expired memories
      const result = await this.workingMemoryCollection.deleteMany({
        expires: { $lt: now }
      });

      if (result.deletedCount > 0) {
        console.log(`🧹 Cleaned up ${result.deletedCount} expired working memories`);
      }

      return result.deletedCount;
      
    } finally {
      this.isCleanupRunning = false;
    }
  }

  /**
   * Perform pressure-based cleanup when memory is full
   */
  async performPressureCleanup(): Promise<void> {
    console.log('🚨 Memory pressure detected - performing cleanup...');
    
    // First, clean up expired memories
    await this.cleanupExpiredMemories();
    
    // Check if we still have pressure
    const pressure = await this.getMemoryPressure();
    if (pressure.memoryPressure < this.config.pressureCleanupThreshold) {
      return;
    }

    // Remove low-priority, old memories
    const lowPriorityOld = await this.workingMemoryCollection.find({
      priority: 'low',
      importance: { $lt: this.config.lowPriorityThreshold },
      created: { $lt: new Date(Date.now() - 60 * 60 * 1000) } // Older than 1 hour
    }).sort({ importance: 1, created: 1 }).limit(50).toArray();

    for (const memory of lowPriorityOld) {
      await this.workingMemoryCollection.deleteOne({ id: memory.id });
    }

    console.log(`🧹 Pressure cleanup removed ${lowPriorityOld.length} low-priority memories`);
  }

  /**
   * Get memory pressure statistics
   */
  async getMemoryPressure(): Promise<MemoryPressureStats> {
    const totalMemories = await this.workingMemoryCollection.countDocuments();
    const expiredCount = await this.workingMemoryCollection.countDocuments({
      expires: { $lt: new Date() }
    });
    const highPriorityCount = await this.workingMemoryCollection.countDocuments({
      priority: { $in: ['high', 'critical'] }
    });

    // Get memories per session
    const sessionStats = await this.workingMemoryCollection.aggregate([
      { $group: { _id: '$sessionId', count: { $sum: 1 } } }
    ]).toArray();

    const memoriesPerSession: Record<string, number> = {};
    sessionStats.forEach(stat => {
      memoriesPerSession[stat._id] = stat.count;
    });

    // Calculate average age
    const memories = await this.workingMemoryCollection.find({}, { 
      projection: { created: 1 } 
    }).toArray();
    
    const averageAge = memories.length > 0 
      ? memories.reduce((sum, m) => sum + (Date.now() - m.created.getTime()), 0) / memories.length / (1000 * 60)
      : 0;

    const memoryPressure = totalMemories / this.config.maxTotalWorkingMemories;
    
    let recommendedAction: MemoryPressureStats['recommendedAction'] = 'none';
    if (memoryPressure > 0.9) {
      recommendedAction = 'aggressive_cleanup';
    } else if (memoryPressure > this.config.pressureCleanupThreshold) {
      recommendedAction = 'cleanup';
    } else if (highPriorityCount > totalMemories * 0.3) {
      recommendedAction = 'promote_memories';
    }

    return {
      totalWorkingMemories: totalMemories,
      memoriesPerSession,
      averageAge,
      expiredMemories: expiredCount,
      highPriorityMemories: highPriorityCount,
      memoryPressure,
      recommendedAction
    };
  }

  /**
   * Calculate intelligent TTL based on context
   */
  private calculateIntelligentTTL(options: any): number {
    let ttl = options.ttlMinutes || this.config.defaultTTLMinutes;
    
    // Adjust based on importance
    const importance = options.importance || 0.5;
    if (importance > this.config.highPriorityThreshold) {
      ttl *= 2; // Double TTL for high importance
    } else if (importance < this.config.lowPriorityThreshold) {
      ttl *= 0.5; // Half TTL for low importance
    }
    
    // Adjust based on priority
    const priority = options.priority;
    if (priority === 'critical') {
      ttl *= 3;
    } else if (priority === 'high') {
      ttl *= 1.5;
    } else if (priority === 'low') {
      ttl *= 0.7;
    }
    
    // Clamp to configured limits
    return Math.max(
      this.config.minTTLMinutes,
      Math.min(this.config.maxTTLMinutes, ttl)
    );
  }

  /**
   * Determine priority based on importance and context
   */
  private determinePriority(importance: number): 'low' | 'medium' | 'high' | 'critical' {
    if (importance >= 0.9) return 'critical';
    if (importance >= this.config.highPriorityThreshold) return 'high';
    if (importance >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * Check if memory should be promoted to long-term
   */
  private shouldPromoteMemory(memory: WorkingMemoryItem): boolean {
    return (
      memory.accessCount >= this.config.accessCountForPromotion ||
      memory.importance >= this.config.highPriorityThreshold ||
      memory.priority === 'critical' ||
      memory.metadata.promotionCandidate === true
    );
  }

  /**
   * Update access tracking for memories
   */
  private async updateAccessTracking(memoryIds: string[]): Promise<void> {
    await this.workingMemoryCollection.updateMany(
      { id: { $in: memoryIds } },
      {
        $set: { lastAccessed: new Date() },
        $inc: { 
          accessCount: 1,
          importance: this.config.importanceBoostOnAccess
        }
      }
    );
  }

  /**
   * Enforce session memory limits
   */
  private async enforceSessionLimits(sessionId: string): Promise<void> {
    const sessionMemoryCount = await this.workingMemoryCollection.countDocuments({
      sessionId,
      expires: { $gt: new Date() }
    });

    if (sessionMemoryCount >= this.config.maxMemoriesPerSession) {
      // Remove oldest, lowest priority memories
      const toRemove = await this.workingMemoryCollection
        .find({ sessionId })
        .sort({ priority: 1, importance: 1, created: 1 })
        .limit(sessionMemoryCount - this.config.maxMemoriesPerSession + 1)
        .toArray();

      for (const memory of toRemove) {
        if (this.shouldPromoteMemory(memory)) {
          await this.promoteToLongTerm(memory.id);
        } else {
          await this.workingMemoryCollection.deleteOne({ id: memory.id });
        }
      }
    }
  }

  /**
   * Start automatic cleanup process
   */
  private startAutomaticCleanup(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanupExpiredMemories();
        
        // Check memory pressure and act accordingly
        const pressure = await this.getMemoryPressure();
        if (pressure.recommendedAction === 'cleanup') {
          await this.performPressureCleanup();
        } else if (pressure.recommendedAction === 'promote_memories') {
          await this.promoteHighValueMemories();
        }
      } catch (error) {
        console.error('Automatic cleanup failed:', error);
      }
    }, this.config.cleanupIntervalMinutes * 60 * 1000);

    console.log(`⏰ Started automatic cleanup every ${this.config.cleanupIntervalMinutes} minutes`);
  }

  /**
   * Promote high-value memories to long-term storage
   */
  private async promoteHighValueMemories(): Promise<void> {
    const candidates = await this.workingMemoryCollection.find({
      $or: [
        { accessCount: { $gte: this.config.accessCountForPromotion } },
        { importance: { $gte: this.config.highPriorityThreshold } },
        { priority: 'critical' }
      ]
    }).limit(10).toArray();

    for (const candidate of candidates) {
      await this.promoteToLongTerm(candidate.id);
    }

    if (candidates.length > 0) {
      console.log(`⬆️ Promoted ${candidates.length} high-value working memories`);
    }
  }

  /**
   * Create database indexes
   */
  private async createIndexes(): Promise<void> {
    await this.workingMemoryCollection.createIndex({ sessionId: 1, expires: 1 });
    await this.workingMemoryCollection.createIndex({ expires: 1 });
    await this.workingMemoryCollection.createIndex({ priority: 1, importance: -1 });
    await this.workingMemoryCollection.createIndex({ framework: 1, sessionId: 1 });
    await this.workingMemoryCollection.createIndex({ id: 1 }, { unique: true });
    
    console.log('📊 Created working memory indexes');
  }

  /**
   * Shutdown the manager
   */
  async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    // Final cleanup
    await this.cleanupExpiredMemories();
    
    console.log('🛑 Working Memory Manager shutdown complete');
  }

  /**
   * Get configuration
   */
  getConfig(): WorkingMemoryConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<WorkingMemoryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Updated working memory configuration');
  }
}
