/**
 * @file AttentionStateCollection - MongoDB collection for real-time attention management
 * 
 * This collection demonstrates MongoDB's change streams and real-time capabilities for
 * cognitive attention management. Showcases MongoDB's advanced real-time features for
 * attention allocation, cognitive load balancing, and priority-based focus management.
 * 
 * Features:
 * - Real-time attention allocation with change streams
 * - Cognitive load monitoring and balancing
 * - Priority-based attention management with queues
 * - Distraction filtering and attention protection
 * - Real-time attention analytics and optimization
 */

import { Db, ObjectId, ChangeStream } from 'mongodb';
import { BaseCollection, BaseDocument } from './BaseCollection';

export interface AttentionState extends BaseDocument {
  agentId: string;
  sessionId?: string;
  timestamp: Date;
  
  // Current attention allocation
  attention: {
    primary: {
      taskId: string;
      taskType: 'conversation' | 'analysis' | 'planning' | 'execution' | 'monitoring';
      focus: number; // 0-1 attention allocation to primary task
      priority: 'critical' | 'high' | 'medium' | 'low';
      startTime: Date;
      estimatedDuration: number; // minutes
    };
    
    secondary: Array<{
      taskId: string;
      taskType: string;
      focus: number; // 0-1 attention allocation
      priority: string;
      backgroundProcessing: boolean;
    }>;
    
    // Total attention allocation (should not exceed 1.0)
    totalAllocation: number;
    
    // Attention efficiency metrics
    efficiency: {
      focusQuality: number; // 0-1 how well attention is focused
      taskSwitchingCost: number; // 0-1 cost of switching between tasks
      distractionLevel: number; // 0-1 current distraction level
      attentionStability: number; // 0-1 stability of attention over time
    };
  };
  
  // Cognitive load monitoring
  cognitiveLoad: {
    current: number; // 0-1 current cognitive load
    capacity: number; // 0-1 maximum cognitive capacity
    utilization: number; // current/capacity ratio
    overload: boolean; // true if exceeding safe capacity
    
    // Load breakdown by cognitive function
    breakdown: {
      working_memory: number; // 0-1 working memory load
      processing: number; // 0-1 processing load
      decision_making: number; // 0-1 decision making load
      communication: number; // 0-1 communication load
      monitoring: number; // 0-1 monitoring load
    };
    
    // Load management
    management: {
      loadShedding: boolean; // actively reducing load
      priorityFiltering: boolean; // filtering low priority items
      batchProcessing: boolean; // batching similar tasks
      deferredProcessing: string[]; // tasks deferred due to load
    };
  };
  
  // Priority queue management
  priorityQueue: {
    critical: Array<{
      taskId: string;
      description: string;
      arrivalTime: Date;
      deadline?: Date;
      estimatedProcessingTime: number;
      dependencies: string[];
    }>;
    
    high: Array<{
      taskId: string;
      description: string;
      arrivalTime: Date;
      deadline?: Date;
      estimatedProcessingTime: number;
    }>;
    
    medium: Array<{
      taskId: string;
      description: string;
      arrivalTime: Date;
      estimatedProcessingTime: number;
    }>;
    
    low: Array<{
      taskId: string;
      description: string;
      arrivalTime: Date;
      estimatedProcessingTime: number;
    }>;
  };
  
  // Distraction management
  distractions: {
    active: Array<{
      source: string;
      type: 'internal' | 'external' | 'system';
      intensity: number; // 0-1
      duration: number; // minutes
      impact: number; // 0-1 impact on attention
      filtered: boolean; // whether distraction was filtered
    }>;
    
    filtering: {
      enabled: boolean;
      threshold: number; // 0-1 minimum intensity to allow
      whitelist: string[]; // always allowed sources
      blacklist: string[]; // always blocked sources
      adaptiveFiltering: boolean; // learns from patterns
    };
    
    protection: {
      deepFocusMode: boolean; // maximum distraction filtering
      focusTimeRemaining: number; // minutes of protected focus time
      interruptionCost: number; // estimated cost of interruption
    };
  };
  
  // Context switching
  contextSwitching: {
    lastSwitch: Date;
    switchCount: number; // switches in current session
    avgSwitchTime: number; // average time between switches
    switchCost: number; // 0-1 estimated cost of last switch
    
    // Switch patterns
    patterns: Array<{
      fromTask: string;
      toTask: string;
      frequency: number;
      avgCost: number;
    }>;
    
    // Switch optimization
    optimization: {
      batchSimilarTasks: boolean;
      minimizeHighCostSwitches: boolean;
      scheduleBreaks: boolean;
      groupByContext: boolean;
    };
  };
  
  // Attention analytics
  analytics: {
    session: {
      totalFocusTime: number; // minutes of focused attention
      taskCompletionRate: number; // 0-1 rate of task completion
      attentionEfficiency: number; // 0-1 overall efficiency
      distractionRate: number; // distractions per hour
    };
    
    trends: {
      focusImprovement: number; // -1 to 1 trend in focus quality
      loadManagement: number; // -1 to 1 trend in load management
      efficiencyTrend: number; // -1 to 1 trend in efficiency
    };
    
    recommendations: string[]; // AI-generated recommendations
  };
  
  // Real-time monitoring
  monitoring: {
    alertsEnabled: boolean;
    thresholds: {
      overloadWarning: number; // cognitive load threshold
      focusDegradation: number; // focus quality threshold
      distractionAlert: number; // distraction level threshold
    };
    
    lastAlert: Date;
    alertHistory: Array<{
      type: 'overload' | 'focus_degradation' | 'high_distraction';
      timestamp: Date;
      severity: 'low' | 'medium' | 'high' | 'critical';
      resolved: boolean;
    }>;
  };
  
  // Metadata
  metadata: {
    framework: string;
    version: string;
    updateTrigger: 'manual' | 'automatic' | 'change_stream' | 'scheduled';
    computationTime: number; // ms to compute this state
  };
}

export interface AttentionFilter {
  agentId?: string;
  sessionId?: string;
  'attention.primary.priority'?: string;
  'cognitiveLoad.overload'?: boolean;
  'cognitiveLoad.utilization'?: { $gte?: number; $lte?: number };
  timestamp?: { $gte?: Date; $lte?: Date };
}

export interface AttentionAnalyticsOptions {
  timeRange?: { start: Date; end: Date };
  includeDistracted?: boolean;
  groupBy?: 'hour' | 'task' | 'priority';
  minFocusQuality?: number;
}

/**
 * AttentionStateCollection - Manages real-time attention states with change streams
 * 
 * This collection demonstrates MongoDB's real-time capabilities:
 * - Change streams for real-time attention monitoring
 * - Complex indexing for attention priority queries
 * - Real-time updates for cognitive load balancing
 * - Priority queue management with MongoDB operations
 * - Advanced aggregation for attention analytics
 */
export class AttentionStateCollection extends BaseCollection<AttentionState> {
  protected collectionName = 'agent_attention_states';
  private changeStream?: ChangeStream;

  constructor(db: Db) {
    super(db);
    this.collection = db.collection<AttentionState>(this.collectionName);
  }

  /**
   * Create indexes optimized for real-time attention management
   */
  async createIndexes(): Promise<void> {
    try {
      // Agent and timestamp index for real-time queries
      await this.collection.createIndex({
        agentId: 1,
        timestamp: -1
      }, {
        name: 'agent_timestamp_realtime',
        background: true
      });

      // Cognitive load monitoring index
      await this.collection.createIndex({
        'cognitiveLoad.overload': 1,
        'cognitiveLoad.utilization': -1,
        timestamp: -1
      }, {
        name: 'cognitive_load_monitoring',
        background: true
      });

      // Priority queue index
      await this.collection.createIndex({
        agentId: 1,
        'attention.primary.priority': 1,
        'attention.primary.startTime': -1
      }, {
        name: 'priority_queue_index',
        background: true
      });

      // Attention efficiency index
      await this.collection.createIndex({
        'attention.efficiency.focusQuality': -1,
        'attention.efficiency.distractionLevel': 1,
        timestamp: -1
      }, {
        name: 'attention_efficiency_index',
        background: true
      });

      // Real-time alerts index
      await this.collection.createIndex({
        'monitoring.alertsEnabled': 1,
        'cognitiveLoad.overload': 1,
        'attention.efficiency.focusQuality': 1
      }, {
        name: 'realtime_alerts_index',
        background: true
      });

      // Session analytics index
      await this.collection.createIndex({
        sessionId: 1,
        'analytics.session.attentionEfficiency': -1,
        timestamp: -1
      }, {
        name: 'session_analytics_index',
        background: true,
        sparse: true
      });

      console.log('✅ AttentionStateCollection indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating AttentionStateCollection indexes:', error);
      throw error;
    }
  }

  /**
   * Record a new attention state
   */
  async recordAttentionState(state: Omit<AttentionState, '_id' | 'createdAt' | 'updatedAt'>): Promise<ObjectId> {
    const stateWithTimestamp = {
      ...state,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await this.collection.insertOne(stateWithTimestamp);
    return result.insertedId;
  }

  /**
   * Get current attention state for an agent
   */
  async getCurrentAttentionState(agentId: string, sessionId?: string): Promise<AttentionState | null> {
    const filter: any = { agentId };
    if (sessionId) {
      filter.sessionId = sessionId;
    }

    return await this.collection.findOne(filter, {
      sort: { timestamp: -1 }
    });
  }

  /**
   * Update attention allocation in real-time
   */
  async updateAttentionAllocation(
    agentId: string,
    primaryTask: AttentionState['attention']['primary'],
    secondaryTasks: AttentionState['attention']['secondary'] = []
  ): Promise<void> {
    const totalAllocation = primaryTask.focus + 
      secondaryTasks.reduce((sum, task) => sum + task.focus, 0);

    if (totalAllocation > 1.0) {
      throw new Error('Total attention allocation cannot exceed 1.0');
    }

    const currentState = await this.getCurrentAttentionState(agentId);
    if (!currentState) {
      throw new Error('No current attention state found for agent');
    }

    await this.collection.updateOne(
      { _id: currentState._id },
      {
        $set: {
          'attention.primary': primaryTask,
          'attention.secondary': secondaryTasks,
          'attention.totalAllocation': totalAllocation,
          updatedAt: new Date(),
          'metadata.updateTrigger': 'manual'
        }
      }
    );
  }

  /**
   * Update cognitive load in real-time
   */
  async updateCognitiveLoad(
    agentId: string,
    cognitiveLoad: AttentionState['cognitiveLoad']
  ): Promise<void> {
    const currentState = await this.getCurrentAttentionState(agentId);
    if (!currentState) {
      throw new Error('No current attention state found for agent');
    }

    await this.collection.updateOne(
      { _id: currentState._id },
      {
        $set: {
          cognitiveLoad,
          updatedAt: new Date(),
          'metadata.updateTrigger': 'automatic'
        }
      }
    );
  }

  /**
   * Add task to priority queue
   */
  async addToPriorityQueue(
    agentId: string,
    priority: 'critical' | 'high' | 'medium' | 'low',
    task: {
      taskId: string;
      description: string;
      deadline?: Date;
      estimatedProcessingTime: number;
      dependencies?: string[];
    }
  ): Promise<void> {
    const currentState = await this.getCurrentAttentionState(agentId);
    if (!currentState) {
      throw new Error('No current attention state found for agent');
    }

    const queueTask = {
      ...task,
      arrivalTime: new Date(),
      dependencies: task.dependencies || []
    };

    await this.collection.updateOne(
      { _id: currentState._id },
      {
        $push: {
          [`priorityQueue.${priority}`]: queueTask
        },
        $set: {
          updatedAt: new Date()
        }
      }
    );
  }

  /**
   * Remove task from priority queue
   */
  async removeFromPriorityQueue(
    agentId: string,
    taskId: string
  ): Promise<void> {
    const currentState = await this.getCurrentAttentionState(agentId);
    if (!currentState) {
      throw new Error('No current attention state found for agent');
    }

    // Remove from all priority levels
    await this.collection.updateOne(
      { _id: currentState._id },
      {
        $pull: {
          'priorityQueue.critical': { taskId },
          'priorityQueue.high': { taskId },
          'priorityQueue.medium': { taskId },
          'priorityQueue.low': { taskId }
        },
        $set: {
          updatedAt: new Date()
        }
      }
    );
  }

  /**
   * Start change stream monitoring for real-time attention updates
   */
  async startChangeStreamMonitoring(
    callback: (change: any) => void,
    filter?: any
  ): Promise<void> {
    const pipeline = [];
    
    if (filter) {
      pipeline.push({ $match: filter });
    }

    this.changeStream = this.collection.watch(pipeline, {
      fullDocument: 'updateLookup'
    });

    this.changeStream.on('change', callback);
    this.changeStream.on('error', (error) => {
      console.error('Change stream error:', error);
    });

    console.log('👁️ Attention change stream monitoring started');
  }

  /**
   * Stop change stream monitoring
   */
  async stopChangeStreamMonitoring(): Promise<void> {
    if (this.changeStream) {
      await this.changeStream.close();
      this.changeStream = undefined;
      console.log('👁️ Attention change stream monitoring stopped');
    }
  }

  /**
   * Analyze attention patterns using MongoDB aggregation
   */
  async analyzeAttentionPatterns(agentId: string, days: number = 7): Promise<{
    focusPatterns: Array<{ taskType: string; avgFocus: number; frequency: number }>;
    cognitiveLoadTrends: Array<{ hour: number; avgLoad: number; overloadFrequency: number }>;
    distractionAnalysis: { avgDistractionLevel: number; topSources: string[]; filteringEffectiveness: number };
    efficiencyMetrics: { avgFocusQuality: number; taskSwitchingCost: number; attentionStability: number };
    recommendations: string[];
  }> {
    const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

    // Focus patterns analysis
    const focusPatterns = await this.collection.aggregate([
      {
        $match: {
          agentId,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$attention.primary.taskType',
          avgFocus: { $avg: '$attention.primary.focus' },
          frequency: { $sum: 1 }
        }
      },
      {
        $project: {
          taskType: '$_id',
          avgFocus: { $round: ['$avgFocus', 3] },
          frequency: 1,
          _id: 0
        }
      },
      { $sort: { frequency: -1 } }
    ]).toArray();

    // Cognitive load trends by hour
    const cognitiveLoadTrends = await this.collection.aggregate([
      {
        $match: {
          agentId,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $hour: '$timestamp' },
          avgLoad: { $avg: '$cognitiveLoad.utilization' },
          overloadCount: {
            $sum: { $cond: ['$cognitiveLoad.overload', 1, 0] }
          },
          totalCount: { $sum: 1 }
        }
      },
      {
        $project: {
          hour: '$_id',
          avgLoad: { $round: ['$avgLoad', 3] },
          overloadFrequency: {
            $round: [{ $divide: ['$overloadCount', '$totalCount'] }, 3]
          },
          _id: 0
        }
      },
      { $sort: { hour: 1 } }
    ]).toArray();

    // Distraction analysis
    const distractionStats = await this.collection.aggregate([
      {
        $match: {
          agentId,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          avgDistractionLevel: { $avg: '$attention.efficiency.distractionLevel' },
          allDistractions: { $push: '$distractions.active' },
          filteredCount: {
            $sum: {
              $size: {
                $filter: {
                  input: '$distractions.active',
                  cond: { $eq: ['$$this.filtered', true] }
                }
              }
            }
          },
          totalDistractions: {
            $sum: { $size: '$distractions.active' }
          }
        }
      }
    ]).toArray();

    // Efficiency metrics
    const efficiencyStats = await this.collection.aggregate([
      {
        $match: {
          agentId,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          avgFocusQuality: { $avg: '$attention.efficiency.focusQuality' },
          avgTaskSwitchingCost: { $avg: '$attention.efficiency.taskSwitchingCost' },
          avgAttentionStability: { $avg: '$attention.efficiency.attentionStability' }
        }
      }
    ]).toArray();

    // Generate recommendations
    const recommendations = this.generateAttentionRecommendations(
      focusPatterns,
      cognitiveLoadTrends,
      distractionStats[0],
      efficiencyStats[0]
    );

    return {
      focusPatterns: focusPatterns as Array<{ taskType: string; avgFocus: number; frequency: number }>,
      cognitiveLoadTrends: cognitiveLoadTrends as Array<{ hour: number; avgLoad: number; overloadFrequency: number }>,
      distractionAnalysis: {
        avgDistractionLevel: distractionStats[0]?.avgDistractionLevel || 0,
        topSources: [], // Would extract from distractions data
        filteringEffectiveness: distractionStats[0]?.totalDistractions > 0 ? 
          (distractionStats[0].filteredCount / distractionStats[0].totalDistractions) : 0
      },
      efficiencyMetrics: {
        avgFocusQuality: efficiencyStats[0]?.avgFocusQuality || 0,
        taskSwitchingCost: efficiencyStats[0]?.avgTaskSwitchingCost || 0,
        attentionStability: efficiencyStats[0]?.avgAttentionStability || 0
      },
      recommendations
    };
  }

  /**
   * Get attention statistics
   */
  async getAttentionStats(agentId?: string): Promise<{
    totalStates: number;
    avgFocusQuality: number;
    avgCognitiveLoad: number;
    overloadFrequency: number;
    avgDistractionLevel: number;
  }> {
    const filter = agentId ? { agentId } : {};

    const stats = await this.collection.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalStates: { $sum: 1 },
          avgFocusQuality: { $avg: '$attention.efficiency.focusQuality' },
          avgCognitiveLoad: { $avg: '$cognitiveLoad.utilization' },
          overloadCount: {
            $sum: { $cond: ['$cognitiveLoad.overload', 1, 0] }
          },
          avgDistractionLevel: { $avg: '$attention.efficiency.distractionLevel' }
        }
      }
    ]).toArray();

    const result = stats[0] || {
      totalStates: 0,
      avgFocusQuality: 0,
      avgCognitiveLoad: 0,
      overloadCount: 0,
      avgDistractionLevel: 0
    };

    return {
      totalStates: result.totalStates,
      avgFocusQuality: result.avgFocusQuality || 0,
      avgCognitiveLoad: result.avgCognitiveLoad || 0,
      overloadFrequency: result.totalStates > 0 ? 
        (result.overloadCount / result.totalStates) : 0,
      avgDistractionLevel: result.avgDistractionLevel || 0
    };
  }

  /**
   * Generate attention recommendations
   */
  private generateAttentionRecommendations(
    focusPatterns: any[],
    cognitiveLoadTrends: any[],
    distractionStats: any,
    efficiencyStats: any
  ): string[] {
    const recommendations = [];

    if (efficiencyStats?.avgFocusQuality < 0.6) {
      recommendations.push('Focus quality is below optimal - consider reducing task switching');
    }

    if (distractionStats?.avgDistractionLevel > 0.5) {
      recommendations.push('High distraction levels detected - enable stronger filtering');
    }

    const highLoadHours = cognitiveLoadTrends.filter(trend => trend.avgLoad > 0.8);
    if (highLoadHours.length > 0) {
      recommendations.push(`High cognitive load during hours: ${highLoadHours.map(h => h.hour).join(', ')}`);
    }

    if (efficiencyStats?.avgTaskSwitchingCost > 0.3) {
      recommendations.push('High task switching costs - consider batching similar tasks');
    }

    return recommendations;
  }
}
