/**
 * @file GoalHierarchyCollection - MongoDB collection for hierarchical goal management
 * 
 * This collection demonstrates MongoDB's materialized paths pattern for hierarchical data,
 * enabling efficient tree operations for goal decomposition, progress tracking, and
 * dependency management. Showcases MongoDB's advanced hierarchical data capabilities.
 * 
 * Features:
 * - Materialized paths for efficient tree operations
 * - Goal decomposition and sub-goal management
 * - Progress tracking with aggregation pipelines
 * - Dependency management and constraint satisfaction
 * - Real-time goal status updates
 */

import { Db, ObjectId } from 'mongodb';
import { BaseCollection, BaseDocument } from './BaseCollection';

export interface Goal extends BaseDocument {
  agentId: string;
  sessionId?: string;
  
  // Hierarchical structure using materialized paths
  path: string; // e.g., "/root/project1/task1/subtask1"
  parentId?: ObjectId;
  level: number; // 0 = root, 1 = top-level, 2 = sub-goal, etc.
  
  // Goal definition
  goal: {
    title: string;
    description: string;
    type: 'objective' | 'task' | 'milestone' | 'action' | 'constraint';
    priority: 'critical' | 'high' | 'medium' | 'low';
    category: string; // e.g., 'customer_service', 'problem_solving', 'learning'
  };
  
  // Status and progress
  status: 'not_started' | 'in_progress' | 'blocked' | 'completed' | 'failed' | 'cancelled';
  progress: {
    percentage: number; // 0-100
    completedSubGoals: number;
    totalSubGoals: number;
    lastUpdated: Date;
  };
  
  // Temporal aspects
  timeline: {
    estimatedDuration: number; // minutes
    actualDuration?: number; // minutes
    startTime?: Date;
    endTime?: Date;
    deadline?: Date;
  };
  
  // Dependencies and constraints
  dependencies: {
    requiredGoals: ObjectId[]; // Goals that must be completed first
    blockedBy: ObjectId[]; // Goals currently blocking this one
    enables: ObjectId[]; // Goals that this one enables
    conflicts: ObjectId[]; // Goals that conflict with this one
  };
  
  // Success criteria
  successCriteria: {
    conditions: Array<{
      type: 'metric' | 'boolean' | 'threshold' | 'approval';
      description: string;
      target: any;
      current?: any;
      achieved: boolean;
    }>;
    verification: 'automatic' | 'manual' | 'external';
  };
  
  // Context and reasoning
  context: {
    trigger: string; // What initiated this goal
    reasoning: string; // Why this goal is important
    assumptions: string[]; // Assumptions made
    risks: Array<{
      description: string;
      probability: number; // 0-1
      impact: number; // 0-1
      mitigation?: string;
    }>;
  };
  
  // Learning and adaptation
  learning: {
    difficulty: number; // 0-1 (how hard was this goal)
    satisfaction: number; // 0-1 (how satisfied with outcome)
    lessons: string[]; // Lessons learned
    improvements: string[]; // Suggested improvements
  };
  
  // Metadata
  metadata: {
    framework: string;
    createdBy: 'agent' | 'user' | 'system';
    tags: string[];
    version: string;
  };
}

export interface GoalFilter {
  agentId?: string;
  sessionId?: string;
  path?: { $regex?: string };
  level?: number;
  'goal.type'?: string;
  'goal.priority'?: string;
  status?: string | { $in: string[] };
  'progress.percentage'?: { $gte?: number; $lte?: number };
  'timeline.deadline'?: { $gte?: Date; $lte?: Date };
}

export interface GoalUpdateData {
  status?: string;
  'progress.percentage'?: number;
  'progress.lastUpdated'?: Date;
  'timeline.actualDuration'?: number;
  'timeline.endTime'?: Date;
  'successCriteria.conditions'?: any[];
  'learning.difficulty'?: number;
  'learning.satisfaction'?: number;
  'learning.lessons'?: string[];
}

export interface GoalAnalyticsOptions {
  timeRange?: { start: Date; end: Date };
  includeCompleted?: boolean;
  groupBy?: 'type' | 'priority' | 'category' | 'level';
  minProgress?: number;
}

/**
 * GoalHierarchyCollection - Manages hierarchical goal structures with materialized paths
 * 
 * This collection demonstrates MongoDB's advanced capabilities for hierarchical data:
 * - Materialized paths for efficient tree operations
 * - Complex aggregation pipelines for goal analytics
 * - Dependency tracking with graph-like operations
 * - Real-time progress monitoring
 */
export class GoalHierarchyCollection extends BaseCollection<Goal> {
  protected collectionName = 'agent_goal_hierarchies';

  constructor(db: Db) {
    super(db);
    this.collection = db.collection<Goal>(this.collectionName);
  }

  /**
   * Create indexes optimized for hierarchical queries and goal management
   */
  async createIndexes(): Promise<void> {
    try {
      // Materialized path index for tree operations
      await this.collection.createIndex({ 
        path: 1 
      }, { 
        name: 'materialized_path_index',
        background: true 
      });

      // Agent and level index for efficient filtering
      await this.collection.createIndex({
        agentId: 1,
        level: 1,
        status: 1
      }, {
        name: 'agent_level_status_index',
        background: true
      });

      // Priority and deadline index for urgent goals
      await this.collection.createIndex({
        'goal.priority': 1,
        'timeline.deadline': 1,
        status: 1
      }, {
        name: 'priority_deadline_index',
        background: true
      });

      // Progress tracking index
      await this.collection.createIndex({
        agentId: 1,
        'progress.percentage': -1,
        'progress.lastUpdated': -1
      }, {
        name: 'progress_tracking_index',
        background: true
      });

      // Dependency tracking index
      await this.collection.createIndex({
        'dependencies.requiredGoals': 1
      }, {
        name: 'dependency_tracking_index',
        background: true,
        sparse: true
      });

      // Session-based goal tracking
      await this.collection.createIndex({
        sessionId: 1,
        'timeline.startTime': -1
      }, {
        name: 'session_timeline_index',
        background: true,
        sparse: true
      });

      console.log('✅ GoalHierarchyCollection indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating GoalHierarchyCollection indexes:', error);
      throw error;
    }
  }

  /**
   * Create a new goal with automatic path generation
   */
  async createGoal(goal: Omit<Goal, '_id' | 'createdAt' | 'updatedAt' | 'path' | 'level'>): Promise<ObjectId> {
    // Generate materialized path
    let path = '/root';
    let level = 0;

    if (goal.parentId) {
      const parent = await this.collection.findOne({ _id: goal.parentId });
      if (parent) {
        path = `${parent.path}/${goal.parentId.toString()}`;
        level = parent.level + 1;
      }
    }

    const goalWithPath = {
      ...goal,
      path,
      level,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await this.collection.insertOne(goalWithPath);
    return result.insertedId;
  }

  /**
   * Get goal hierarchy tree for an agent
   */
  async getGoalHierarchy(agentId: string, sessionId?: string): Promise<Goal[]> {
    const filter: any = { agentId };
    if (sessionId) {
      filter.sessionId = sessionId;
    }

    return await this.collection.find(filter)
      .sort({ path: 1, level: 1 })
      .toArray();
  }

  /**
   * Get all sub-goals of a specific goal using materialized paths
   */
  async getSubGoals(goalId: ObjectId): Promise<Goal[]> {
    const parentGoal = await this.collection.findOne({ _id: goalId });
    if (!parentGoal) {
      throw new Error('Parent goal not found');
    }

    // Use materialized path to find all descendants
    const pathRegex = new RegExp(`^${parentGoal.path}/${goalId.toString()}`);
    
    return await this.collection.find({
      path: { $regex: pathRegex }
    }).sort({ level: 1, path: 1 }).toArray();
  }

  /**
   * Get goal dependencies and check for conflicts
   */
  async getGoalDependencies(goalId: ObjectId): Promise<{
    required: Goal[];
    blockers: Goal[];
    enabled: Goal[];
    conflicts: Goal[];
    canStart: boolean;
  }> {
    const goal = await this.collection.findOne({ _id: goalId });
    if (!goal) {
      throw new Error('Goal not found');
    }

    const [required, blockers, enabled, conflicts] = await Promise.all([
      this.collection.find({ _id: { $in: goal.dependencies.requiredGoals } }).toArray(),
      this.collection.find({ _id: { $in: goal.dependencies.blockedBy } }).toArray(),
      this.collection.find({ _id: { $in: goal.dependencies.enables } }).toArray(),
      this.collection.find({ _id: { $in: goal.dependencies.conflicts } }).toArray()
    ]);

    // Check if goal can start (all required goals completed, no blockers)
    const canStart = required.every(req => req.status === 'completed') && 
                     blockers.length === 0;

    return {
      required,
      blockers,
      enabled,
      conflicts,
      canStart
    };
  }

  /**
   * Update goal progress and propagate to parent goals
   */
  async updateGoalProgress(goalId: ObjectId, progress: number): Promise<void> {
    const goal = await this.collection.findOne({ _id: goalId });
    if (!goal) {
      throw new Error('Goal not found');
    }

    // Update current goal
    await this.collection.updateOne(
      { _id: goalId },
      {
        $set: {
          'progress.percentage': progress,
          'progress.lastUpdated': new Date(),
          status: progress === 100 ? 'completed' : 'in_progress',
          updatedAt: new Date()
        }
      }
    );

    // Propagate progress to parent goals
    if (goal.parentId) {
      await this.propagateProgressToParent(goal.parentId);
    }
  }

  /**
   * Propagate progress changes to parent goals
   */
  private async propagateProgressToParent(parentId: ObjectId): Promise<void> {
    const parent = await this.collection.findOne({ _id: parentId });
    if (!parent) return;

    // Get all direct children
    const children = await this.collection.find({
      parentId: parentId
    }).toArray();

    if (children.length === 0) return;

    // Calculate average progress of children
    const totalProgress = children.reduce((sum, child) => sum + child.progress.percentage, 0);
    const avgProgress = Math.round(totalProgress / children.length);
    const completedChildren = children.filter(child => child.status === 'completed').length;

    // Update parent progress
    await this.collection.updateOne(
      { _id: parentId },
      {
        $set: {
          'progress.percentage': avgProgress,
          'progress.completedSubGoals': completedChildren,
          'progress.totalSubGoals': children.length,
          'progress.lastUpdated': new Date(),
          status: avgProgress === 100 ? 'completed' : 'in_progress',
          updatedAt: new Date()
        }
      }
    );

    // Continue propagation up the hierarchy
    if (parent.parentId) {
      await this.propagateProgressToParent(parent.parentId);
    }
  }

  /**
   * Analyze goal completion patterns using MongoDB aggregation
   */
  async analyzeGoalPatterns(agentId: string, days: number = 30): Promise<{
    completionRate: number;
    avgDuration: number;
    priorityDistribution: Array<{ priority: string; count: number; avgCompletion: number }>;
    typeAnalysis: Array<{ type: string; count: number; successRate: number }>;
    difficultyAnalysis: { avgDifficulty: number; satisfactionCorrelation: number };
    timelineAccuracy: { onTimeRate: number; avgDelay: number };
  }> {
    const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

    // Completion rate analysis
    const completionStats = await this.collection.aggregate([
      {
        $match: {
          agentId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalGoals: { $sum: 1 },
          completedGoals: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          avgDuration: {
            $avg: {
              $cond: [
                { $ne: ['$timeline.actualDuration', null] },
                '$timeline.actualDuration',
                null
              ]
            }
          }
        }
      }
    ]).toArray();

    const completionRate = completionStats[0] ? 
      (completionStats[0].completedGoals / completionStats[0].totalGoals) : 0;
    const avgDuration = completionStats[0]?.avgDuration || 0;

    // Priority distribution analysis
    const priorityDistribution = await this.collection.aggregate([
      {
        $match: {
          agentId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$goal.priority',
          count: { $sum: 1 },
          avgCompletion: { $avg: '$progress.percentage' }
        }
      },
      {
        $project: {
          priority: '$_id',
          count: 1,
          avgCompletion: { $round: ['$avgCompletion', 1] },
          _id: 0
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    // Type analysis
    const typeAnalysis = await this.collection.aggregate([
      {
        $match: {
          agentId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$goal.type',
          count: { $sum: 1 },
          successCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          type: '$_id',
          count: 1,
          successRate: {
            $round: [{ $divide: ['$successCount', '$count'] }, 3]
          },
          _id: 0
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    // Difficulty and satisfaction analysis
    const difficultyStats = await this.collection.aggregate([
      {
        $match: {
          agentId,
          createdAt: { $gte: startDate },
          'learning.difficulty': { $exists: true },
          'learning.satisfaction': { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          avgDifficulty: { $avg: '$learning.difficulty' },
          avgSatisfaction: { $avg: '$learning.satisfaction' },
          correlationData: {
            $push: {
              difficulty: '$learning.difficulty',
              satisfaction: '$learning.satisfaction'
            }
          }
        }
      }
    ]).toArray();

    const avgDifficulty = difficultyStats[0]?.avgDifficulty || 0;
    const satisfactionCorrelation = this.calculateCorrelation(
      difficultyStats[0]?.correlationData || []
    );

    // Timeline accuracy analysis
    const timelineStats = await this.collection.aggregate([
      {
        $match: {
          agentId,
          createdAt: { $gte: startDate },
          'timeline.deadline': { $exists: true },
          'timeline.endTime': { $exists: true }
        }
      },
      {
        $project: {
          onTime: {
            $cond: [
              { $lte: ['$timeline.endTime', '$timeline.deadline'] },
              1,
              0
            ]
          },
          delay: {
            $cond: [
              { $gt: ['$timeline.endTime', '$timeline.deadline'] },
              {
                $divide: [
                  { $subtract: ['$timeline.endTime', '$timeline.deadline'] },
                  1000 * 60 // Convert to minutes
                ]
              },
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          totalWithDeadlines: { $sum: 1 },
          onTimeCount: { $sum: '$onTime' },
          avgDelay: { $avg: '$delay' }
        }
      }
    ]).toArray();

    const onTimeRate = timelineStats[0] ? 
      (timelineStats[0].onTimeCount / timelineStats[0].totalWithDeadlines) : 0;
    const avgDelay = timelineStats[0]?.avgDelay || 0;

    return {
      completionRate,
      avgDuration,
      priorityDistribution: priorityDistribution as Array<{ priority: string; count: number; avgCompletion: number }>,
      typeAnalysis: typeAnalysis as Array<{ type: string; count: number; successRate: number }>,
      difficultyAnalysis: {
        avgDifficulty,
        satisfactionCorrelation
      },
      timelineAccuracy: {
        onTimeRate,
        avgDelay
      }
    };
  }

  /**
   * Calculate correlation between difficulty and satisfaction
   */
  private calculateCorrelation(data: Array<{ difficulty: number; satisfaction: number }>): number {
    if (data.length < 2) return 0;

    const n = data.length;
    const sumX = data.reduce((sum, item) => sum + item.difficulty, 0);
    const sumY = data.reduce((sum, item) => sum + item.satisfaction, 0);
    const sumXY = data.reduce((sum, item) => sum + (item.difficulty * item.satisfaction), 0);
    const sumX2 = data.reduce((sum, item) => sum + (item.difficulty * item.difficulty), 0);
    const sumY2 = data.reduce((sum, item) => sum + (item.satisfaction * item.satisfaction), 0);

    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Get goal statistics
   */
  async getGoalStats(agentId?: string): Promise<{
    totalGoals: number;
    activeGoals: number;
    completedGoals: number;
    avgProgress: number;
    goalsByLevel: Array<{ level: number; count: number }>;
  }> {
    const filter = agentId ? { agentId } : {};

    const stats = await this.collection.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalGoals: { $sum: 1 },
          activeGoals: {
            $sum: {
              $cond: [
                { $in: ['$status', ['in_progress', 'not_started']] },
                1,
                0
              ]
            }
          },
          completedGoals: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          },
          avgProgress: { $avg: '$progress.percentage' }
        }
      }
    ]).toArray();

    const goalsByLevel = await this.collection.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$level',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          level: '$_id',
          count: 1,
          _id: 0
        }
      },
      { $sort: { level: 1 } }
    ]).toArray();

    return {
      totalGoals: stats[0]?.totalGoals || 0,
      activeGoals: stats[0]?.activeGoals || 0,
      completedGoals: stats[0]?.completedGoals || 0,
      avgProgress: stats[0]?.avgProgress || 0,
      goalsByLevel: goalsByLevel as Array<{ level: number; count: number }>
    };
  }

  /**
   * Clean up completed goals older than specified days
   */
  async cleanupOldGoals(days: number = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    
    const result = await this.collection.deleteMany({
      status: 'completed',
      'timeline.endTime': { $lt: cutoffDate }
    });
    
    return result.deletedCount;
  }
}
