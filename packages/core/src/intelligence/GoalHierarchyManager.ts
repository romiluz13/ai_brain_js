/**
 * @file GoalHierarchyManager - Advanced hierarchical goal management for AI agents
 * 
 * This manager provides comprehensive goal hierarchy capabilities using MongoDB's
 * materialized paths pattern for efficient tree operations. Demonstrates MongoDB's
 * advanced capabilities for hierarchical data management and complex goal tracking.
 * 
 * Features:
 * - Hierarchical goal decomposition with materialized paths
 * - Dependency tracking and constraint satisfaction
 * - Progress propagation through goal hierarchies
 * - Goal analytics and pattern recognition
 * - Real-time goal status monitoring
 * - Intelligent goal prioritization and scheduling
 */

import { Db, ObjectId } from 'mongodb';
import { GoalHierarchyCollection, Goal } from '../collections/GoalHierarchyCollection';

export interface GoalCreationRequest {
  agentId: string;
  sessionId?: string;
  parentGoalId?: ObjectId;
  title: string;
  description: string;
  type: 'objective' | 'task' | 'milestone' | 'action' | 'constraint';
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  estimatedDuration: number; // minutes
  deadline?: Date;
  successCriteria: Array<{
    type: 'metric' | 'boolean' | 'threshold' | 'approval';
    description: string;
    target: any;
  }>;
  dependencies?: {
    requiredGoals?: ObjectId[];
    conflicts?: ObjectId[];
  };
  context: {
    trigger: string;
    reasoning: string;
    assumptions?: string[];
    risks?: Array<{
      description: string;
      probability: number;
      impact: number;
      mitigation?: string;
    }>;
  };
}

export interface GoalDecompositionResult {
  parentGoal: Goal;
  subGoals: Goal[];
  decompositionStrategy: string;
  estimatedTotalDuration: number;
  criticalPath: ObjectId[];
  riskAssessment: {
    overallRisk: number;
    riskFactors: string[];
    mitigationStrategies: string[];
  };
}

export interface GoalExecutionPlan {
  goals: Goal[];
  executionOrder: ObjectId[];
  parallelGroups: ObjectId[][];
  timeline: {
    startTime: Date;
    estimatedEndTime: Date;
    milestones: Array<{
      goalId: ObjectId;
      expectedTime: Date;
      description: string;
    }>;
  };
  resourceRequirements: {
    estimatedEffort: number;
    skillsRequired: string[];
    dependencies: string[];
  };
}

export interface GoalProgressUpdate {
  goalId: ObjectId;
  progress: number;
  status?: 'not_started' | 'in_progress' | 'blocked' | 'completed' | 'failed' | 'cancelled';
  actualDuration?: number;
  learnings?: {
    difficulty?: number;
    satisfaction?: number;
    lessons?: string[];
    improvements?: string[];
  };
}

export interface GoalAnalytics {
  completionMetrics: {
    totalGoals: number;
    completedGoals: number;
    completionRate: number;
    avgCompletionTime: number;
  };
  performanceMetrics: {
    onTimeDelivery: number;
    qualityScore: number;
    efficiencyRatio: number;
  };
  learningMetrics: {
    avgDifficulty: number;
    avgSatisfaction: number;
    improvementTrends: Array<{
      category: string;
      trend: 'improving' | 'stable' | 'declining';
      rate: number;
    }>;
  };
  predictiveInsights: {
    successProbability: number;
    estimatedDuration: number;
    riskFactors: string[];
    recommendations: string[];
  };
}

/**
 * GoalHierarchyManager - Advanced hierarchical goal management for AI agents
 * 
 * This manager showcases MongoDB's materialized paths and tree operations:
 * - Efficient hierarchical goal structures
 * - Complex dependency tracking and resolution
 * - Progress propagation through goal trees
 * - Advanced analytics with aggregation pipelines
 * - Real-time goal monitoring and optimization
 */
export class GoalHierarchyManager {
  private db: Db;
  private goalCollection: GoalHierarchyCollection;
  private isInitialized: boolean = false;

  // Goal management configuration
  private config = {
    maxHierarchyDepth: 5,
    maxSubGoalsPerParent: 10,
    defaultEstimationBuffer: 1.2, // 20% buffer for estimates
    riskThresholds: {
      low: 0.3,
      medium: 0.6,
      high: 0.8
    },
    priorityWeights: {
      critical: 1.0,
      high: 0.8,
      medium: 0.6,
      low: 0.4
    }
  };

  constructor(db: Db) {
    this.db = db;
    this.goalCollection = new GoalHierarchyCollection(db);
  }

  /**
   * Initialize the goal hierarchy manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Create collection indexes
      await this.goalCollection.createIndexes();
      
      this.isInitialized = true;
      console.log('🎯 GoalHierarchyManager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize GoalHierarchyManager:', error);
      throw error;
    }
  }

  /**
   * Create a new goal with automatic hierarchy management
   */
  async createGoal(request: GoalCreationRequest): Promise<ObjectId> {
    if (!this.isInitialized) {
      throw new Error('GoalHierarchyManager must be initialized first');
    }

    // Validate hierarchy depth
    if (request.parentGoalId) {
      const parent = await this.goalCollection.findById(request.parentGoalId);
      if (parent && parent.level >= this.config.maxHierarchyDepth) {
        throw new Error(`Maximum hierarchy depth (${this.config.maxHierarchyDepth}) exceeded`);
      }
    }

    // Create goal object
    const goal: Omit<Goal, '_id' | 'createdAt' | 'updatedAt' | 'path' | 'level'> = {
      agentId: request.agentId,
      sessionId: request.sessionId,
      parentId: request.parentGoalId,
      goal: {
        title: request.title,
        description: request.description,
        type: request.type,
        priority: request.priority,
        category: request.category
      },
      status: 'not_started',
      progress: {
        percentage: 0,
        completedSubGoals: 0,
        totalSubGoals: 0,
        lastUpdated: new Date()
      },
      timeline: {
        estimatedDuration: request.estimatedDuration,
        deadline: request.deadline
      },
      dependencies: {
        requiredGoals: request.dependencies?.requiredGoals || [],
        blockedBy: [],
        enables: [],
        conflicts: request.dependencies?.conflicts || []
      },
      successCriteria: {
        conditions: request.successCriteria.map(criteria => ({
          ...criteria,
          achieved: false
        })),
        verification: 'manual'
      },
      context: {
        trigger: request.context.trigger,
        reasoning: request.context.reasoning,
        assumptions: request.context.assumptions || [],
        risks: request.context.risks || []
      },
      learning: {
        difficulty: 0,
        satisfaction: 0,
        lessons: [],
        improvements: []
      },
      metadata: {
        framework: 'universal-ai-brain',
        createdBy: 'agent',
        tags: [request.category, request.priority],
        version: '1.0.0'
      }
    };

    // Create the goal
    const goalId = await this.goalCollection.createGoal(goal);

    // Update parent goal's sub-goal count if applicable
    if (request.parentGoalId) {
      await this.updateParentSubGoalCount(request.parentGoalId);
    }

    return goalId;
  }

  /**
   * Decompose a complex goal into manageable sub-goals
   */
  async decomposeGoal(
    goalId: ObjectId,
    decompositionStrategy: 'sequential' | 'parallel' | 'hybrid' = 'hybrid'
  ): Promise<GoalDecompositionResult> {
    const parentGoal = await this.goalCollection.findById(goalId);
    if (!parentGoal) {
      throw new Error('Goal not found');
    }

    // Generate sub-goals based on the parent goal
    const subGoals = await this.generateSubGoals(parentGoal, decompositionStrategy);
    
    // Create sub-goals in the database
    const subGoalIds: ObjectId[] = [];
    for (const subGoal of subGoals) {
      const subGoalId = await this.goalCollection.createGoal({
        ...subGoal,
        parentId: goalId
      });
      subGoalIds.push(subGoalId);
    }

    // Retrieve created sub-goals
    const createdSubGoals = await Promise.all(
      subGoalIds.map(id => this.goalCollection.findById(id))
    );

    // Calculate metrics
    const estimatedTotalDuration = createdSubGoals.reduce(
      (total, goal) => total + (goal?.timeline.estimatedDuration || 0), 0
    );

    const criticalPath = this.calculateCriticalPath(createdSubGoals.filter(g => g) as Goal[]);
    const riskAssessment = this.assessDecompositionRisk(createdSubGoals.filter(g => g) as Goal[]);

    return {
      parentGoal,
      subGoals: createdSubGoals.filter(g => g) as Goal[],
      decompositionStrategy,
      estimatedTotalDuration,
      criticalPath,
      riskAssessment
    };
  }

  /**
   * Create an execution plan for a goal hierarchy
   */
  async createExecutionPlan(rootGoalId: ObjectId): Promise<GoalExecutionPlan> {
    const goals = await this.goalCollection.getSubGoals(rootGoalId);
    const rootGoal = await this.goalCollection.findById(rootGoalId);
    
    if (rootGoal) {
      goals.unshift(rootGoal);
    }

    // Determine execution order based on dependencies
    const executionOrder = this.calculateExecutionOrder(goals);
    const parallelGroups = this.identifyParallelGroups(goals, executionOrder);
    
    // Calculate timeline
    const timeline = this.calculateTimeline(goals, executionOrder);
    
    // Assess resource requirements
    const resourceRequirements = this.assessResourceRequirements(goals);

    return {
      goals,
      executionOrder,
      parallelGroups,
      timeline,
      resourceRequirements
    };
  }

  /**
   * Update goal progress with automatic propagation
   */
  async updateGoalProgress(update: GoalProgressUpdate): Promise<void> {
    const goal = await this.goalCollection.findById(update.goalId);
    if (!goal) {
      throw new Error('Goal not found');
    }

    // Update the goal
    await this.goalCollection.updateGoalProgress(update.goalId, update.progress);

    // Update additional fields if provided
    if (update.status || update.actualDuration || update.learnings) {
      const updateData: any = {};
      
      if (update.status) {
        updateData.status = update.status;
      }
      
      if (update.actualDuration) {
        updateData['timeline.actualDuration'] = update.actualDuration;
        if (update.status === 'completed') {
          updateData['timeline.endTime'] = new Date();
        }
      }
      
      if (update.learnings) {
        if (update.learnings.difficulty !== undefined) {
          updateData['learning.difficulty'] = update.learnings.difficulty;
        }
        if (update.learnings.satisfaction !== undefined) {
          updateData['learning.satisfaction'] = update.learnings.satisfaction;
        }
        if (update.learnings.lessons) {
          updateData['learning.lessons'] = update.learnings.lessons;
        }
        if (update.learnings.improvements) {
          updateData['learning.improvements'] = update.learnings.improvements;
        }
      }

      await this.goalCollection.updateOne(
        { _id: update.goalId },
        { $set: { ...updateData, updatedAt: new Date() } }
      );
    }

    // Check and update success criteria if goal is completed
    if (update.status === 'completed') {
      await this.evaluateSuccessCriteria(update.goalId);
    }
  }

  /**
   * Get comprehensive goal analytics
   */
  async getGoalAnalytics(agentId: string, days: number = 30): Promise<GoalAnalytics> {
    const patterns = await this.goalCollection.analyzeGoalPatterns(agentId, days);
    
    // Calculate completion metrics
    const completionMetrics = {
      totalGoals: patterns.priorityDistribution.reduce((sum, p) => sum + p.count, 0),
      completedGoals: Math.round(patterns.completionRate * patterns.priorityDistribution.reduce((sum, p) => sum + p.count, 0)),
      completionRate: patterns.completionRate,
      avgCompletionTime: patterns.avgDuration
    };

    // Calculate performance metrics
    const performanceMetrics = {
      onTimeDelivery: patterns.timelineAccuracy.onTimeRate,
      qualityScore: patterns.difficultyAnalysis.avgDifficulty > 0 ? 
        patterns.difficultyAnalysis.satisfactionCorrelation : 0.5,
      efficiencyRatio: patterns.avgDuration > 0 ? 
        Math.max(0, 1 - (patterns.timelineAccuracy.avgDelay / patterns.avgDuration)) : 1
    };

    // Calculate learning metrics
    const learningMetrics = {
      avgDifficulty: patterns.difficultyAnalysis.avgDifficulty,
      avgSatisfaction: patterns.difficultyAnalysis.satisfactionCorrelation,
      improvementTrends: this.calculateImprovementTrends(patterns)
    };

    // Generate predictive insights
    const predictiveInsights = this.generatePredictiveInsights(patterns);

    return {
      completionMetrics,
      performanceMetrics,
      learningMetrics,
      predictiveInsights
    };
  }

  /**
   * Get goal hierarchy visualization data
   */
  async getGoalHierarchyVisualization(agentId: string, sessionId?: string): Promise<{
    nodes: Array<{
      id: string;
      title: string;
      type: string;
      status: string;
      progress: number;
      level: number;
      priority: string;
    }>;
    edges: Array<{
      from: string;
      to: string;
      type: 'parent' | 'dependency' | 'conflict';
    }>;
    metrics: {
      totalNodes: number;
      maxDepth: number;
      completionRate: number;
    };
  }> {
    const goals = await this.goalCollection.getGoalHierarchy(agentId, sessionId);
    
    const nodes = goals.map(goal => ({
      id: goal._id!.toString(),
      title: goal.goal.title,
      type: goal.goal.type,
      status: goal.status,
      progress: goal.progress.percentage,
      level: goal.level,
      priority: goal.goal.priority
    }));

    const edges: Array<{ from: string; to: string; type: 'parent' | 'dependency' | 'conflict' }> = [];
    
    // Add parent-child relationships
    for (const goal of goals) {
      if (goal.parentId) {
        edges.push({
          from: goal.parentId.toString(),
          to: goal._id!.toString(),
          type: 'parent'
        });
      }
      
      // Add dependency relationships
      for (const depId of goal.dependencies.requiredGoals) {
        edges.push({
          from: depId.toString(),
          to: goal._id!.toString(),
          type: 'dependency'
        });
      }
      
      // Add conflict relationships
      for (const conflictId of goal.dependencies.conflicts) {
        edges.push({
          from: goal._id!.toString(),
          to: conflictId.toString(),
          type: 'conflict'
        });
      }
    }

    const metrics = {
      totalNodes: nodes.length,
      maxDepth: Math.max(...goals.map(g => g.level), 0),
      completionRate: goals.length > 0 ? 
        goals.filter(g => g.status === 'completed').length / goals.length : 0
    };

    return { nodes, edges, metrics };
  }

  /**
   * Generate sub-goals based on decomposition strategy
   */
  private async generateSubGoals(
    parentGoal: Goal, 
    strategy: 'sequential' | 'parallel' | 'hybrid'
  ): Promise<Array<Omit<Goal, '_id' | 'createdAt' | 'updatedAt' | 'path' | 'level' | 'parentId'>>> {
    // This is a simplified implementation - in a real system, this would use
    // AI/ML models to intelligently decompose goals
    const subGoals = [];
    
    const baseSubGoal = {
      agentId: parentGoal.agentId,
      sessionId: parentGoal.sessionId,
      goal: {
        ...parentGoal.goal,
        type: 'action' as const
      },
      status: 'not_started' as const,
      progress: {
        percentage: 0,
        completedSubGoals: 0,
        totalSubGoals: 0,
        lastUpdated: new Date()
      },
      timeline: {
        estimatedDuration: Math.round(parentGoal.timeline.estimatedDuration / 3)
      },
      dependencies: {
        requiredGoals: [],
        blockedBy: [],
        enables: [],
        conflicts: []
      },
      successCriteria: {
        conditions: [{
          type: 'boolean' as const,
          description: 'Sub-goal completed',
          target: true,
          achieved: false
        }],
        verification: 'automatic' as const
      },
      context: {
        trigger: `Decomposition of: ${parentGoal.goal.title}`,
        reasoning: 'Auto-generated sub-goal',
        assumptions: [],
        risks: []
      },
      learning: {
        difficulty: 0,
        satisfaction: 0,
        lessons: [],
        improvements: []
      },
      metadata: {
        framework: 'universal-ai-brain',
        createdBy: 'agent' as const,
        tags: ['auto-generated', 'sub-goal'],
        version: '1.0.0'
      }
    };

    // Generate 3 sub-goals as an example
    for (let i = 1; i <= 3; i++) {
      subGoals.push({
        ...baseSubGoal,
        goal: {
          ...baseSubGoal.goal,
          title: `${parentGoal.goal.title} - Step ${i}`,
          description: `Sub-goal ${i} for ${parentGoal.goal.title}`
        }
      });
    }

    return subGoals;
  }

  /**
   * Calculate critical path through goal hierarchy
   */
  private calculateCriticalPath(goals: Goal[]): ObjectId[] {
    // Simplified critical path calculation
    return goals
      .sort((a, b) => b.timeline.estimatedDuration - a.timeline.estimatedDuration)
      .slice(0, Math.ceil(goals.length / 2))
      .map(g => g._id!);
  }

  /**
   * Assess risk of goal decomposition
   */
  private assessDecompositionRisk(goals: Goal[]): {
    overallRisk: number;
    riskFactors: string[];
    mitigationStrategies: string[];
  } {
    const riskFactors = [];
    const mitigationStrategies = [];
    let overallRisk = 0;

    if (goals.length > this.config.maxSubGoalsPerParent) {
      riskFactors.push('Too many sub-goals may cause complexity');
      mitigationStrategies.push('Consider further grouping of sub-goals');
      overallRisk += 0.2;
    }

    const totalDuration = goals.reduce((sum, g) => sum + g.timeline.estimatedDuration, 0);
    if (totalDuration > 480) { // 8 hours
      riskFactors.push('Long total duration may impact completion');
      mitigationStrategies.push('Break down into smaller time chunks');
      overallRisk += 0.3;
    }

    return {
      overallRisk: Math.min(overallRisk, 1),
      riskFactors,
      mitigationStrategies
    };
  }

  /**
   * Calculate execution order based on dependencies
   */
  private calculateExecutionOrder(goals: Goal[]): ObjectId[] {
    // Simplified topological sort
    const sorted = [...goals].sort((a, b) => {
      if (a.dependencies.requiredGoals.includes(b._id!)) return 1;
      if (b.dependencies.requiredGoals.includes(a._id!)) return -1;
      return a.level - b.level;
    });

    return sorted.map(g => g._id!);
  }

  /**
   * Identify goals that can be executed in parallel
   */
  private identifyParallelGroups(goals: Goal[], executionOrder: ObjectId[]): ObjectId[][] {
    const groups: ObjectId[][] = [];
    const processed = new Set<string>();

    for (const goalId of executionOrder) {
      if (processed.has(goalId.toString())) continue;

      const goal = goals.find(g => g._id!.equals(goalId));
      if (!goal) continue;

      const parallelGroup = [goalId];
      processed.add(goalId.toString());

      // Find other goals at the same level with no dependencies between them
      for (const otherGoalId of executionOrder) {
        if (processed.has(otherGoalId.toString())) continue;

        const otherGoal = goals.find(g => g._id!.equals(otherGoalId));
        if (!otherGoal || otherGoal.level !== goal.level) continue;

        // Check if they can run in parallel (no dependencies)
        const hasConflict = goal.dependencies.conflicts.some(c => c.equals(otherGoalId)) ||
                           otherGoal.dependencies.conflicts.some(c => c.equals(goalId));

        if (!hasConflict) {
          parallelGroup.push(otherGoalId);
          processed.add(otherGoalId.toString());
        }
      }

      groups.push(parallelGroup);
    }

    return groups;
  }

  /**
   * Calculate timeline for goal execution
   */
  private calculateTimeline(goals: Goal[], executionOrder: ObjectId[]): {
    startTime: Date;
    estimatedEndTime: Date;
    milestones: Array<{
      goalId: ObjectId;
      expectedTime: Date;
      description: string;
    }>;
  } {
    const startTime = new Date();
    let currentTime = new Date(startTime);
    const milestones = [];

    for (const goalId of executionOrder) {
      const goal = goals.find(g => g._id!.equals(goalId));
      if (!goal) continue;

      const duration = goal.timeline.estimatedDuration * this.config.defaultEstimationBuffer;
      currentTime = new Date(currentTime.getTime() + duration * 60 * 1000);

      milestones.push({
        goalId,
        expectedTime: new Date(currentTime),
        description: `Complete: ${goal.goal.title}`
      });
    }

    return {
      startTime,
      estimatedEndTime: currentTime,
      milestones
    };
  }

  /**
   * Assess resource requirements for goals
   */
  private assessResourceRequirements(goals: Goal[]): {
    estimatedEffort: number;
    skillsRequired: string[];
    dependencies: string[];
  } {
    const estimatedEffort = goals.reduce((sum, g) => sum + g.timeline.estimatedDuration, 0);
    const skillsRequired = [...new Set(goals.map(g => g.goal.category))];
    const dependencies = [...new Set(goals.flatMap(g => g.context.assumptions))];

    return {
      estimatedEffort,
      skillsRequired,
      dependencies
    };
  }

  /**
   * Calculate improvement trends from goal patterns
   */
  private calculateImprovementTrends(patterns: any): Array<{
    category: string;
    trend: 'improving' | 'stable' | 'declining';
    rate: number;
  }> {
    // Simplified trend calculation
    return patterns.typeAnalysis.map((type: any) => ({
      category: type.type,
      trend: type.successRate > 0.7 ? 'improving' : 
             type.successRate > 0.5 ? 'stable' : 'declining',
      rate: type.successRate
    }));
  }

  /**
   * Generate predictive insights based on historical patterns
   */
  private generatePredictiveInsights(patterns: any): {
    successProbability: number;
    estimatedDuration: number;
    riskFactors: string[];
    recommendations: string[];
  } {
    const successProbability = patterns.completionRate;
    const estimatedDuration = patterns.avgDuration * this.config.defaultEstimationBuffer;
    
    const riskFactors = [];
    const recommendations = [];

    if (patterns.timelineAccuracy.onTimeRate < 0.7) {
      riskFactors.push('Historical delays in goal completion');
      recommendations.push('Add more buffer time to estimates');
    }

    if (patterns.emotionalStability < 0.5) {
      riskFactors.push('High emotional variability during goal execution');
      recommendations.push('Implement emotional regulation strategies');
    }

    return {
      successProbability,
      estimatedDuration,
      riskFactors,
      recommendations
    };
  }

  /**
   * Update parent goal's sub-goal count
   */
  private async updateParentSubGoalCount(parentId: ObjectId): Promise<void> {
    const subGoals = await this.goalCollection.getSubGoals(parentId);
    const directChildren = subGoals.filter(g => g.parentId?.equals(parentId));
    
    await this.goalCollection.updateOne(
      { _id: parentId },
      {
        $set: {
          'progress.totalSubGoals': directChildren.length,
          updatedAt: new Date()
        }
      }
    );
  }

  /**
   * Evaluate success criteria for a completed goal
   */
  private async evaluateSuccessCriteria(goalId: ObjectId): Promise<void> {
    const goal = await this.goalCollection.findById(goalId);
    if (!goal) return;

    // Mark all criteria as achieved for completed goals
    const updatedCriteria = goal.successCriteria.conditions.map(condition => ({
      ...condition,
      achieved: true,
      current: condition.target
    }));

    await this.goalCollection.updateOne(
      { _id: goalId },
      {
        $set: {
          'successCriteria.conditions': updatedCriteria,
          updatedAt: new Date()
        }
      }
    );
  }

  /**
   * Get goal hierarchy statistics
   */
  async getGoalStats(agentId?: string): Promise<{
    totalGoals: number;
    activeGoals: number;
    completedGoals: number;
    avgProgress: number;
    goalsByLevel: Array<{ level: number; count: number }>;
  }> {
    return await this.goalCollection.getGoalStats(agentId);
  }

  /**
   * Cleanup old completed goals
   */
  async cleanup(days: number = 90): Promise<number> {
    return await this.goalCollection.cleanupOldGoals(days);
  }
}
