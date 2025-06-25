/**
 * Memory Decay Engine - Intelligent Memory Evolution
 * 
 * This engine manages the lifecycle of memories, automatically adjusting their
 * importance based on access patterns, time decay, and relevance. It ensures
 * that the most valuable memories stay prominent while outdated ones fade.
 * 
 * Features:
 * - Time-based decay: Memories naturally lose importance over time
 * - Access pattern analysis: Frequently accessed memories gain importance
 * - Relevance scoring: Context-relevant memories are prioritized
 * - Memory type-specific decay: Different types decay at different rates
 * - Automatic cleanup: Removes truly obsolete memories
 * - Relationship preservation: Maintains important memory connections
 */

import { Collection, Db } from 'mongodb';

export interface MemoryDecayConfig {
  // Base decay rates per memory type (per day)
  decayRates: {
    conversation: number;    // 0.05 = 5% per day
    procedure: number;       // 0.02 = 2% per day  
    fact: number;           // 0.01 = 1% per day
    working: number;        // 0.3 = 30% per day (fast decay)
    preference: number;     // 0.005 = 0.5% per day (slow decay)
  };
  
  // Access pattern multipliers
  accessMultipliers: {
    recentAccess: number;   // 1.2 = 20% boost for recent access
    frequentAccess: number; // 1.5 = 50% boost for frequent access
    noAccess: number;       // 0.8 = 20% penalty for no access
  };
  
  // Cleanup thresholds
  cleanupThresholds: {
    minImportance: number;  // 0.1 = Remove memories below 10% importance
    maxAge: number;         // 90 days = Remove memories older than 90 days
    maxMemories: number;    // 10000 = Keep only top 10k memories
  };
  
  // Relationship preservation
  preserveRelationships: boolean; // Keep memories with important relationships
  relationshipBonus: number;      // 0.1 = 10% bonus for connected memories
}

export interface MemoryDecayStats {
  totalMemories: number;
  memoriesDecayed: number;
  memoriesRemoved: number;
  averageImportance: number;
  oldestMemory: Date;
  newestMemory: Date;
  memoryTypes: Record<string, number>;
}

export class MemoryDecayEngine {
  private db: Db;
  private memoryCollection: Collection;
  private decayStatsCollection: Collection;
  private config: MemoryDecayConfig;
  private isRunning: boolean = false;

  constructor(db: Db, config?: Partial<MemoryDecayConfig>) {
    this.db = db;
    this.memoryCollection = db.collection('agent_memory');
    this.decayStatsCollection = db.collection('memory_decay_stats');
    
    // Default configuration
    this.config = {
      decayRates: {
        conversation: 0.05,  // 5% per day
        procedure: 0.02,     // 2% per day
        fact: 0.01,          // 1% per day
        working: 0.3,        // 30% per day
        preference: 0.005    // 0.5% per day
      },
      accessMultipliers: {
        recentAccess: 1.2,   // 20% boost
        frequentAccess: 1.5, // 50% boost
        noAccess: 0.8        // 20% penalty
      },
      cleanupThresholds: {
        minImportance: 0.1,  // 10% minimum
        maxAge: 90,          // 90 days
        maxMemories: 10000   // 10k memories max
      },
      preserveRelationships: true,
      relationshipBonus: 0.1,
      ...config
    };
  }

  /**
   * Initialize the memory decay engine
   */
  async initialize(): Promise<void> {
    console.log('🧠 Initializing Memory Decay Engine...');
    
    // Create indexes for efficient decay operations
    await this.createIndexes();
    
    // Schedule periodic decay operations
    this.scheduleDecayOperations();
    
    console.log('✅ Memory Decay Engine initialized successfully');
  }

  /**
   * Run memory decay process - the core intelligence
   */
  async runDecayProcess(): Promise<MemoryDecayStats> {
    if (this.isRunning) {
      console.log('⚠️ Decay process already running, skipping...');
      return this.getDecayStats();
    }

    this.isRunning = true;
    console.log('🔄 Starting memory decay process...');

    try {
      const startTime = Date.now();
      const stats: MemoryDecayStats = {
        totalMemories: 0,
        memoriesDecayed: 0,
        memoriesRemoved: 0,
        averageImportance: 0,
        oldestMemory: new Date(),
        newestMemory: new Date(),
        memoryTypes: {}
      };

      // Get all memories for processing
      const memories = await this.memoryCollection.find({}).toArray();
      stats.totalMemories = memories.length;

      if (memories.length === 0) {
        console.log('📭 No memories to process');
        return stats;
      }

      // Calculate stats
      const importanceSum = memories.reduce((sum, m) => sum + (m.metadata?.importance || 0), 0);
      stats.averageImportance = importanceSum / memories.length;
      
      const dates = memories.map(m => new Date(m.metadata?.created || Date.now()));
      stats.oldestMemory = new Date(Math.min(...dates.map(d => d.getTime())));
      stats.newestMemory = new Date(Math.max(...dates.map(d => d.getTime())));

      // Count memory types
      memories.forEach(memory => {
        const type = memory.metadata?.type || 'unknown';
        stats.memoryTypes[type] = (stats.memoryTypes[type] || 0) + 1;
      });

      // Process each memory
      for (const memory of memories) {
        const decayResult = await this.processMemoryDecay(memory);
        
        if (decayResult.removed) {
          stats.memoriesRemoved++;
        } else if (decayResult.decayed) {
          stats.memoriesDecayed++;
        }
      }

      // Cleanup phase - remove memories below threshold
      await this.cleanupObsoleteMemories(stats);

      // Store decay statistics
      await this.storeDecayStats(stats, Date.now() - startTime);

      console.log(`✅ Memory decay complete: ${stats.memoriesDecayed} decayed, ${stats.memoriesRemoved} removed`);
      
      return stats;

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process decay for a single memory
   */
  private async processMemoryDecay(memory: any): Promise<{
    decayed: boolean;
    removed: boolean;
    newImportance?: number;
  }> {
    const metadata = memory.metadata || {};
    const currentImportance = metadata.importance || 0.5;
    const memoryType = metadata.type || 'conversation';
    const created = new Date(metadata.created || Date.now());
    const lastAccessed = new Date(metadata.lastAccessed || created);
    const accessCount = metadata.accessCount || 0;

    // Calculate time-based decay
    const daysSinceCreated = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    const daysSinceAccessed = (Date.now() - lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
    
    const baseDecayRate = this.config.decayRates[memoryType] || this.config.decayRates.conversation;
    const timeDecay = Math.pow(1 - baseDecayRate, daysSinceCreated);

    // Calculate access pattern multiplier
    let accessMultiplier = 1.0;
    
    if (daysSinceAccessed < 1) {
      // Recent access bonus
      accessMultiplier *= this.config.accessMultipliers.recentAccess;
    } else if (daysSinceAccessed > 30) {
      // No recent access penalty
      accessMultiplier *= this.config.accessMultipliers.noAccess;
    }
    
    if (accessCount > 5) {
      // Frequent access bonus
      accessMultiplier *= this.config.accessMultipliers.frequentAccess;
    }

    // Calculate relationship bonus
    let relationshipBonus = 0;
    if (this.config.preserveRelationships && metadata.relationships?.length > 0) {
      relationshipBonus = this.config.relationshipBonus * metadata.relationships.length;
    }

    // Calculate new importance
    let newImportance = currentImportance * timeDecay * accessMultiplier + relationshipBonus;
    newImportance = Math.max(0, Math.min(1, newImportance)); // Clamp between 0 and 1

    // Check if memory should be removed
    const shouldRemove = this.shouldRemoveMemory(memory, newImportance, daysSinceCreated);
    
    if (shouldRemove) {
      await this.memoryCollection.deleteOne({ _id: memory._id });
      return { decayed: false, removed: true };
    }

    // Update memory if importance changed significantly
    const importanceChange = Math.abs(newImportance - currentImportance);
    if (importanceChange > 0.01) { // 1% threshold
      await this.memoryCollection.updateOne(
        { _id: memory._id },
        {
          $set: {
            'metadata.importance': newImportance,
            'metadata.lastDecay': new Date(),
            'metadata.decayHistory': [
              ...(metadata.decayHistory || []).slice(-9), // Keep last 10 entries
              {
                date: new Date(),
                oldImportance: currentImportance,
                newImportance,
                reason: 'automatic_decay'
              }
            ]
          }
        }
      );
      
      return { decayed: true, removed: false, newImportance };
    }

    return { decayed: false, removed: false };
  }

  /**
   * Determine if a memory should be removed
   */
  private shouldRemoveMemory(memory: any, importance: number, age: number): boolean {
    const metadata = memory.metadata || {};
    
    // Never remove memories explicitly marked as permanent
    if (metadata.permanent) {
      return false;
    }

    // Remove if importance is too low
    if (importance < this.config.cleanupThresholds.minImportance) {
      return true;
    }

    // Remove if too old (except for important memories)
    if (age > this.config.cleanupThresholds.maxAge && importance < 0.5) {
      return true;
    }

    // Remove working memories that have expired TTL
    if (metadata.type === 'working' && metadata.ttl && new Date() > new Date(metadata.ttl)) {
      return true;
    }

    return false;
  }

  /**
   * Cleanup obsolete memories to maintain performance
   */
  private async cleanupObsoleteMemories(stats: MemoryDecayStats): Promise<void> {
    const totalMemories = await this.memoryCollection.countDocuments();
    
    if (totalMemories <= this.config.cleanupThresholds.maxMemories) {
      return; // No cleanup needed
    }

    console.log(`🧹 Cleaning up memories: ${totalMemories} > ${this.config.cleanupThresholds.maxMemories}`);

    // Keep only the most important memories
    const memoriesToKeep = this.config.cleanupThresholds.maxMemories;
    const memoriesToRemove = totalMemories - memoriesToKeep;

    // Remove least important memories
    const leastImportant = await this.memoryCollection
      .find({})
      .sort({ 'metadata.importance': 1, 'metadata.created': 1 })
      .limit(memoriesToRemove)
      .toArray();

    const idsToRemove = leastImportant.map(m => m._id);
    
    if (idsToRemove.length > 0) {
      const result = await this.memoryCollection.deleteMany({
        _id: { $in: idsToRemove }
      });
      
      stats.memoriesRemoved += result.deletedCount;
      console.log(`🗑️ Removed ${result.deletedCount} least important memories`);
    }
  }

  /**
   * Boost memory importance (when accessed or referenced)
   */
  async boostMemoryImportance(
    memoryId: string,
    boost: number = 0.1,
    reason: string = 'accessed'
  ): Promise<void> {
    const memory = await this.memoryCollection.findOne({ id: memoryId });
    
    if (!memory) {
      return;
    }

    const currentImportance = memory.metadata?.importance || 0.5;
    const newImportance = Math.min(1.0, currentImportance + boost);

    await this.memoryCollection.updateOne(
      { id: memoryId },
      {
        $set: {
          'metadata.importance': newImportance,
          'metadata.lastAccessed': new Date(),
          'metadata.lastBoost': new Date()
        },
        $inc: {
          'metadata.accessCount': 1
        },
        $push: {
          'metadata.decayHistory': {
            $each: [{
              date: new Date(),
              oldImportance: currentImportance,
              newImportance,
              reason: `boost_${reason}`
            }],
            $slice: -10 // Keep last 10 entries
          }
        } as any
      }
    );

    console.log(`⚡ Boosted memory ${memoryId}: ${currentImportance.toFixed(3)} → ${newImportance.toFixed(3)}`);
  }

  /**
   * Get memory decay statistics
   */
  async getDecayStats(): Promise<MemoryDecayStats> {
    const memories = await this.memoryCollection.find({}).toArray();
    
    if (memories.length === 0) {
      return {
        totalMemories: 0,
        memoriesDecayed: 0,
        memoriesRemoved: 0,
        averageImportance: 0,
        oldestMemory: new Date(),
        newestMemory: new Date(),
        memoryTypes: {}
      };
    }

    const importanceSum = memories.reduce((sum, m) => sum + (m.metadata?.importance || 0), 0);
    const dates = memories.map(m => new Date(m.metadata?.created || Date.now()));
    
    const memoryTypes: Record<string, number> = {};
    memories.forEach(memory => {
      const type = memory.metadata?.type || 'unknown';
      memoryTypes[type] = (memoryTypes[type] || 0) + 1;
    });

    return {
      totalMemories: memories.length,
      memoriesDecayed: 0, // Would be calculated during actual decay
      memoriesRemoved: 0, // Would be calculated during actual decay
      averageImportance: importanceSum / memories.length,
      oldestMemory: new Date(Math.min(...dates.map(d => d.getTime()))),
      newestMemory: new Date(Math.max(...dates.map(d => d.getTime()))),
      memoryTypes
    };
  }

  /**
   * Store decay statistics for analysis
   */
  private async storeDecayStats(stats: MemoryDecayStats, duration: number): Promise<void> {
    await this.decayStatsCollection.insertOne({
      ...stats,
      timestamp: new Date(),
      duration,
      config: this.config
    });
  }

  /**
   * Schedule periodic decay operations
   */
  private scheduleDecayOperations(): void {
    // Run decay every 6 hours
    setInterval(async () => {
      try {
        await this.runDecayProcess();
      } catch (error) {
        console.error('Scheduled decay process failed:', error);
      }
    }, 6 * 60 * 60 * 1000); // 6 hours

    console.log('⏰ Scheduled automatic memory decay every 6 hours');
  }

  /**
   * Create database indexes for efficient operations
   */
  private async createIndexes(): Promise<void> {
    await this.memoryCollection.createIndex({ 'metadata.importance': 1 });
    await this.memoryCollection.createIndex({ 'metadata.created': 1 });
    await this.memoryCollection.createIndex({ 'metadata.lastAccessed': 1 });
    await this.memoryCollection.createIndex({ 'metadata.type': 1 });
    await this.memoryCollection.createIndex({ 'metadata.ttl': 1 });
    
    console.log('📊 Created memory decay indexes');
  }

  /**
   * Update decay configuration
   */
  updateConfig(newConfig: Partial<MemoryDecayConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Updated memory decay configuration');
  }

  /**
   * Get current configuration
   */
  getConfig(): MemoryDecayConfig {
    return { ...this.config };
  }
}
