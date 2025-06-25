/**
 * @file EmotionalStateCollection - MongoDB collection for agent emotional states
 * 
 * This collection stores and manages agent emotional states using MongoDB time-series
 * collections with TTL indexes for automatic emotional decay. Showcases MongoDB's
 * advanced time-series capabilities for cognitive data management.
 * 
 * Features:
 * - Time-series collection for emotional state tracking
 * - TTL indexes for automatic emotional decay
 * - Aggregation pipelines for emotional analytics
 * - Real-time emotional state monitoring
 * - Emotional trigger analysis and pattern detection
 */

import { Db, ObjectId } from 'mongodb';
import { BaseCollection, BaseDocument } from './BaseCollection';

export interface EmotionalState extends BaseDocument {
  agentId: string;
  sessionId?: string;
  timestamp: Date;
  expiresAt?: Date; // TTL field for automatic decay
  
  // Core emotional dimensions
  emotions: {
    primary: string; // joy, sadness, anger, fear, surprise, disgust, trust, anticipation
    secondary?: string[]; // complex emotions like frustration, excitement, etc.
    intensity: number; // 0.0 to 1.0
    valence: number; // -1.0 (negative) to 1.0 (positive)
    arousal: number; // 0.0 (calm) to 1.0 (excited)
    dominance: number; // 0.0 (submissive) to 1.0 (dominant)
  };
  
  // Contextual information
  context: {
    trigger: string; // What caused this emotional state
    triggerType: 'user_input' | 'task_completion' | 'error' | 'success' | 'interaction' | 'system_event';
    conversationTurn: number;
    taskId?: string;
    workflowId?: string;
    previousEmotion?: string;
  };
  
  // Cognitive impact
  cognitiveEffects: {
    attentionModification: number; // -1.0 to 1.0 (how emotion affects attention)
    memoryStrength: number; // 0.0 to 1.0 (how memorable this emotional event is)
    decisionBias: number; // -1.0 to 1.0 (how emotion biases decisions)
    responseStyle: 'analytical' | 'empathetic' | 'assertive' | 'cautious' | 'creative';
  };
  
  // Decay parameters
  decay: {
    halfLife: number; // Minutes until emotion intensity halves
    decayFunction: 'exponential' | 'linear' | 'logarithmic';
    baselineReturn: number; // Minutes to return to emotional baseline
  };
  
  // Metadata
  metadata: {
    framework: string;
    model: string;
    confidence: number; // Confidence in emotion detection
    source: 'detected' | 'inferred' | 'user_reported' | 'system_generated';
    version: string;
  };
}

export interface EmotionalStateFilter {
  agentId?: string;
  sessionId?: string;
  'emotions.primary'?: string;
  'emotions.intensity'?: { $gte?: number; $lte?: number };
  'emotions.valence'?: { $gte?: number; $lte?: number };
  'context.triggerType'?: string;
  timestamp?: { $gte?: Date; $lte?: Date };
  'metadata.confidence'?: { $gte?: number };
}

export interface EmotionalStateUpdateData {
  'emotions.intensity'?: number;
  'emotions.valence'?: number;
  'emotions.arousal'?: number;
  'emotions.dominance'?: number;
  'cognitiveEffects.attentionModification'?: number;
  'cognitiveEffects.memoryStrength'?: number;
  'cognitiveEffects.decisionBias'?: number;
  'decay.halfLife'?: number;
  expiresAt?: Date;
}

export interface EmotionalAnalyticsOptions {
  timeRange?: { start: Date; end: Date };
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  includeDecayed?: boolean;
  emotionTypes?: string[];
  minIntensity?: number;
}

/**
 * EmotionalStateCollection - Manages agent emotional states with time-series optimization
 * 
 * This collection demonstrates MongoDB's advanced capabilities for cognitive data:
 * - Time-series collections for optimal emotional state storage
 * - TTL indexes for automatic emotional decay simulation
 * - Complex aggregation pipelines for emotional analytics
 * - Real-time change streams for emotional monitoring
 */
export class EmotionalStateCollection extends BaseCollection<EmotionalState> {
  protected collectionName = 'agent_emotional_states';

  constructor(db: Db) {
    super(db);
    this.collection = db.collection<EmotionalState>(this.collectionName);
  }

  /**
   * Create indexes optimized for emotional state queries and time-series operations
   */
  async createIndexes(): Promise<void> {
    try {
      // Time-series optimization indexes
      await this.collection.createIndex({ 
        agentId: 1, 
        timestamp: -1 
      }, { 
        name: 'agentId_timestamp_desc',
        background: true 
      });

      // TTL index for automatic emotional decay
      await this.collection.createIndex({ 
        expiresAt: 1 
      }, { 
        name: 'emotional_decay_ttl',
        expireAfterSeconds: 0,
        background: true 
      });

      // Emotional analytics indexes
      await this.collection.createIndex({
        'emotions.primary': 1,
        'emotions.intensity': -1,
        timestamp: -1
      }, {
        name: 'emotion_intensity_analysis',
        background: true
      });

      // Context-based emotional triggers
      await this.collection.createIndex({
        'context.triggerType': 1,
        'emotions.valence': 1,
        timestamp: -1
      }, {
        name: 'trigger_valence_analysis',
        background: true
      });

      // Session-based emotional tracking
      await this.collection.createIndex({
        sessionId: 1,
        timestamp: 1
      }, {
        name: 'session_emotional_timeline',
        background: true,
        sparse: true
      });

      console.log('✅ EmotionalStateCollection indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating EmotionalStateCollection indexes:', error);
      throw error;
    }
  }

  /**
   * Record a new emotional state with automatic decay calculation
   */
  async recordEmotionalState(emotionalState: Omit<EmotionalState, '_id' | 'createdAt' | 'updatedAt'>): Promise<ObjectId> {
    // Calculate expiration time based on decay parameters
    const expiresAt = new Date(
      Date.now() + (emotionalState.decay.baselineReturn * 60 * 1000)
    );

    const stateWithExpiry = {
      ...emotionalState,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await this.collection.insertOne(stateWithExpiry);
    return result.insertedId;
  }

  /**
   * Get current emotional state for an agent (most recent non-expired)
   */
  async getCurrentEmotionalState(agentId: string, sessionId?: string): Promise<EmotionalState | null> {
    const filter: any = {
      agentId,
      $or: [
        { expiresAt: { $gt: new Date() } },
        { expiresAt: { $exists: false } }
      ]
    };

    if (sessionId) {
      filter.sessionId = sessionId;
    }

    return await this.collection.findOne(filter, {
      sort: { timestamp: -1 }
    });
  }

  /**
   * Get emotional timeline for an agent
   */
  async getEmotionalTimeline(
    agentId: string, 
    options: EmotionalAnalyticsOptions = {}
  ): Promise<EmotionalState[]> {
    const filter: any = { agentId };

    if (options.timeRange) {
      filter.timestamp = {
        $gte: options.timeRange.start,
        $lte: options.timeRange.end
      };
    }

    if (!options.includeDecayed) {
      filter.$or = [
        { expiresAt: { $gt: new Date() } },
        { expiresAt: { $exists: false } }
      ];
    }

    if (options.emotionTypes?.length) {
      filter['emotions.primary'] = { $in: options.emotionTypes };
    }

    if (options.minIntensity) {
      filter['emotions.intensity'] = { $gte: options.minIntensity };
    }

    return await this.collection.find(filter)
      .sort({ timestamp: 1 })
      .toArray();
  }

  /**
   * Analyze emotional patterns using MongoDB aggregation
   */
  async analyzeEmotionalPatterns(agentId: string, days: number = 7): Promise<{
    dominantEmotions: Array<{ emotion: string; frequency: number; avgIntensity: number }>;
    emotionalStability: number;
    triggerAnalysis: Array<{ trigger: string; avgValence: number; frequency: number }>;
    temporalPatterns: Array<{ hour: number; avgValence: number; avgArousal: number }>;
  }> {
    const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

    // Dominant emotions analysis
    const dominantEmotions = await this.collection.aggregate([
      {
        $match: {
          agentId,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$emotions.primary',
          frequency: { $sum: 1 },
          avgIntensity: { $avg: '$emotions.intensity' },
          totalIntensity: { $sum: '$emotions.intensity' }
        }
      },
      {
        $sort: { totalIntensity: -1 }
      },
      {
        $project: {
          emotion: '$_id',
          frequency: 1,
          avgIntensity: { $round: ['$avgIntensity', 3] },
          _id: 0
        }
      }
    ]).toArray();

    // Emotional stability (variance in valence)
    const stabilityResult = await this.collection.aggregate([
      {
        $match: {
          agentId,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          avgValence: { $avg: '$emotions.valence' },
          valenceValues: { $push: '$emotions.valence' }
        }
      },
      {
        $project: {
          stability: {
            $subtract: [
              1,
              {
                $divide: [
                  {
                    $stdDevPop: '$valenceValues'
                  },
                  2 // Max possible std dev for valence range [-1, 1]
                ]
              }
            ]
          }
        }
      }
    ]).toArray();

    const emotionalStability = stabilityResult[0]?.stability || 0;

    // Trigger analysis
    const triggerAnalysis = await this.collection.aggregate([
      {
        $match: {
          agentId,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$context.triggerType',
          frequency: { $sum: 1 },
          avgValence: { $avg: '$emotions.valence' }
        }
      },
      {
        $project: {
          trigger: '$_id',
          frequency: 1,
          avgValence: { $round: ['$avgValence', 3] },
          _id: 0
        }
      },
      {
        $sort: { frequency: -1 }
      }
    ]).toArray();

    // Temporal patterns (by hour of day)
    const temporalPatterns = await this.collection.aggregate([
      {
        $match: {
          agentId,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $hour: '$timestamp' },
          avgValence: { $avg: '$emotions.valence' },
          avgArousal: { $avg: '$emotions.arousal' }
        }
      },
      {
        $project: {
          hour: '$_id',
          avgValence: { $round: ['$avgValence', 3] },
          avgArousal: { $round: ['$avgArousal', 3] },
          _id: 0
        }
      },
      {
        $sort: { hour: 1 }
      }
    ]).toArray();

    return {
      dominantEmotions: dominantEmotions as Array<{ emotion: string; frequency: number; avgIntensity: number }>,
      emotionalStability,
      triggerAnalysis: triggerAnalysis as Array<{ trigger: string; avgValence: number; frequency: number }>,
      temporalPatterns: temporalPatterns as Array<{ hour: number; avgValence: number; avgArousal: number }>
    };
  }

  /**
   * Clean up expired emotional states (manual cleanup for testing)
   */
  async cleanupExpiredStates(): Promise<number> {
    const result = await this.collection.deleteMany({
      expiresAt: { $lte: new Date() }
    });
    return result.deletedCount;
  }

  /**
   * Get emotional state statistics
   */
  async getEmotionalStats(agentId?: string): Promise<{
    totalStates: number;
    activeStates: number;
    expiredStates: number;
    avgIntensity: number;
    avgValence: number;
  }> {
    const filter = agentId ? { agentId } : {};
    const now = new Date();

    const stats = await this.collection.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalStates: { $sum: 1 },
          activeStates: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $gt: ['$expiresAt', now] },
                    { $eq: ['$expiresAt', null] }
                  ]
                },
                1,
                0
              ]
            }
          },
          expiredStates: {
            $sum: {
              $cond: [
                { $lte: ['$expiresAt', now] },
                1,
                0
              ]
            }
          },
          avgIntensity: { $avg: '$emotions.intensity' },
          avgValence: { $avg: '$emotions.valence' }
        }
      }
    ]).toArray();

    return stats[0] as any || {
      totalStates: 0,
      activeStates: 0,
      expiredStates: 0,
      avgIntensity: 0,
      avgValence: 0
    };
  }
}
