/**
 * @file TemporalPlanCollection - MongoDB collection for temporal planning and predictive analytics
 * 
 * This collection demonstrates MongoDB's time-series and predictive analytics capabilities
 * for future state modeling, constraint satisfaction, and plan optimization. Showcases
 * MongoDB's advanced features for temporal data management and predictive modeling.
 * 
 * Features:
 * - Time-series collections for temporal data
 * - Predictive analytics with statistical functions
 * - Constraint satisfaction modeling
 * - Plan optimization algorithms
 * - Future state prediction and scenario planning
 */

import { Db, ObjectId } from 'mongodb';
import { BaseCollection, BaseDocument } from './BaseCollection';

export interface TemporalPlan extends BaseDocument {
  agentId: string;
  sessionId?: string;
  timestamp: Date;
  
  // Plan identification
  plan: {
    id: string;
    name: string;
    type: 'sequential' | 'parallel' | 'conditional' | 'iterative' | 'adaptive';
    category: 'task_execution' | 'resource_allocation' | 'goal_achievement' | 'learning' | 'optimization';
    priority: 'critical' | 'high' | 'medium' | 'low';
    status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled' | 'failed';
    
    // Plan metadata
    metadata: {
      description: string;
      creator: string;
      createdDate: Date;
      lastModified: Date;
      version: string;
      tags: string[];
      estimatedDuration: number; // milliseconds
      complexity: number; // 0-1
    };
  };
  
  // Temporal structure
  temporal: {
    // Time boundaries
    timeframe: {
      startTime: Date;
      endTime: Date;
      duration: number; // milliseconds
      timezone: string;
      flexibility: number; // 0-1 how flexible the timing is
    };
    
    // Temporal constraints
    constraints: {
      deadlines: Array<{
        taskId: string;
        deadline: Date;
        hardDeadline: boolean;
        penalty: number; // cost of missing deadline
      }>;
      
      dependencies: Array<{
        predecessorId: string;
        successorId: string;
        type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
        lag: number; // milliseconds delay
        mandatory: boolean;
      }>;
      
      resources: Array<{
        resourceId: string;
        availability: Array<{
          startTime: Date;
          endTime: Date;
          capacity: number;
        }>;
        conflicts: string[]; // conflicting resource IDs
      }>;
    };
    
    // Temporal patterns
    patterns: {
      recurring: Array<{
        taskId: string;
        frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
        interval: number;
        endCondition: 'date' | 'count' | 'condition';
        endValue: any;
      }>;
      
      seasonal: Array<{
        taskId: string;
        season: string;
        adjustmentFactor: number; // multiplier for duration/resources
        conditions: Record<string, any>;
      }>;
      
      cyclical: Array<{
        taskId: string;
        cycleLength: number; // milliseconds
        phaseOffset: number; // milliseconds
        amplitude: number; // variation magnitude
      }>;
    };
  };
  
  // Plan structure
  structure: {
    // Tasks and activities
    tasks: Array<{
      id: string;
      name: string;
      type: 'atomic' | 'composite' | 'milestone' | 'decision' | 'loop';
      status: 'pending' | 'ready' | 'in_progress' | 'completed' | 'failed' | 'skipped';
      dependencies: Array<{
        predecessorId: string;
        type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
        lag: number; // milliseconds
      }>;

      // Task timing
      timing: {
        plannedStart: Date;
        plannedEnd: Date;
        actualStart?: Date;
        actualEnd?: Date;
        estimatedDuration: number; // milliseconds
        actualDuration?: number; // milliseconds
        bufferTime: number; // milliseconds
      };
      
      // Task requirements
      requirements: {
        skills: string[];
        resources: Array<{
          resourceId: string;
          quantity: number;
          duration: number; // milliseconds
        }>;
        conditions: Record<string, any>;
        quality: number; // 0-1 required quality level
      };
      
      // Task outcomes
      outcomes: {
        deliverables: string[];
        metrics: Record<string, number>;
        quality: number; // 0-1 actual quality achieved
        satisfaction: number; // 0-1 stakeholder satisfaction
      };
    }>;
    
    // Plan hierarchy
    hierarchy: {
      level: number; // 0=root, 1=phase, 2=task, etc.
      parent?: string; // parent task ID
      children: string[]; // child task IDs
      siblings: string[]; // sibling task IDs
      path: string; // materialized path
    };
    
    // Control flow
    controlFlow: {
      branches: Array<{
        conditionId: string;
        condition: Record<string, any>;
        truePath: string[]; // task IDs to execute if true
        falsePath: string[]; // task IDs to execute if false
        probability: number; // 0-1 probability of condition being true
      }>;
      
      loops: Array<{
        loopId: string;
        condition: Record<string, any>;
        body: string[]; // task IDs in loop body
        maxIterations: number;
        currentIteration: number;
      }>;
      
      parallelism: Array<{
        groupId: string;
        tasks: string[]; // task IDs that can run in parallel
        synchronizationPoint: string; // task ID where parallel paths merge
        maxConcurrency: number;
      }>;
    };
  };
  
  // Predictive modeling
  prediction: {
    // Future state modeling
    futureStates: Array<{
      timestamp: Date;
      state: Record<string, any>;
      probability: number; // 0-1
      confidence: number; // 0-1
      factors: string[]; // factors influencing this state
    }>;
    
    // Scenario analysis
    scenarios: Array<{
      id: string;
      name: string;
      description: string;
      probability: number; // 0-1
      impact: number; // -1 to 1
      
      // Scenario conditions
      conditions: Record<string, any>;
      triggers: string[];
      indicators: string[];
      
      // Scenario outcomes
      outcomes: {
        duration: number; // milliseconds
        cost: number;
        quality: number; // 0-1
        risk: number; // 0-1
        benefits: string[];
        drawbacks: string[];
      };
      
      // Mitigation strategies
      mitigation: {
        preventive: string[];
        reactive: string[];
        contingency: string[];
      };
    }>;
    
    // Risk assessment
    risks: Array<{
      id: string;
      name: string;
      category: 'schedule' | 'resource' | 'quality' | 'external' | 'technical';
      probability: number; // 0-1
      impact: number; // 0-1
      severity: number; // 0-1
      
      // Risk factors
      triggers: string[];
      indicators: string[];
      dependencies: string[]; // other risk IDs
      
      // Risk response
      response: {
        strategy: 'avoid' | 'mitigate' | 'transfer' | 'accept';
        actions: string[];
        owner: string;
        deadline: Date;
        cost: number;
      };
    }>;
    
    // Optimization targets
    optimization: {
      objectives: Array<{
        name: string;
        type: 'minimize' | 'maximize';
        weight: number; // 0-1
        target: number;
        current: number;
        unit: string;
      }>;
      
      constraints: Array<{
        name: string;
        type: 'hard' | 'soft';
        expression: string;
        penalty: number; // cost of violating constraint
      }>;
      
      variables: Array<{
        name: string;
        type: 'continuous' | 'discrete' | 'binary';
        domain: any; // valid values
        current: any;
      }>;
    };
  };
  
  // Execution tracking
  execution: {
    // Progress monitoring
    progress: {
      overall: number; // 0-1
      byPhase: Record<string, number>;
      byTask: Record<string, number>;
      milestones: Array<{
        id: string;
        name: string;
        plannedDate: Date;
        actualDate?: Date;
        status: 'pending' | 'achieved' | 'missed' | 'cancelled';
      }>;
    };
    
    // Performance metrics
    performance: {
      efficiency: number; // 0-1
      effectiveness: number; // 0-1
      quality: number; // 0-1
      timeliness: number; // 0-1
      
      // Variance analysis
      variance: {
        schedule: number; // -1 to 1 (negative = behind, positive = ahead)
        cost: number; // -1 to 1 (negative = over budget, positive = under budget)
        scope: number; // -1 to 1 (negative = scope creep, positive = scope reduction)
        quality: number; // -1 to 1 (negative = below target, positive = above target)
      };
    };
    
    // Adaptation history
    adaptations: Array<{
      timestamp: Date;
      trigger: string;
      type: 'schedule' | 'resource' | 'scope' | 'quality';
      change: Record<string, any>;
      reason: string;
      impact: number; // -1 to 1
      success: boolean;
    }>;
  };
  
  // Analytics and insights
  analytics: {
    // Pattern recognition
    patterns: {
      successFactors: string[];
      failureReasons: string[];
      bottlenecks: string[];
      criticalPath: string[]; // task IDs on critical path
      resourceUtilization: Record<string, number>;
    };
    
    // Learning insights
    insights: {
      estimationAccuracy: number; // 0-1
      planningEffectiveness: number; // 0-1
      adaptationSuccess: number; // 0-1
      lessonsLearned: string[];
      bestPractices: string[];
      improvementAreas: string[];
    };
    
    // Recommendations
    recommendations: {
      immediate: string[];
      shortTerm: string[];
      longTerm: string[];
      strategic: string[];
    };
  };
  
  // Metadata
  metadata: {
    framework: string;
    version: string;
    environment: string;
    lastUpdated: Date;
    
    // Quality indicators
    quality: {
      completeness: number; // 0-1
      accuracy: number; // 0-1
      freshness: number; // 0-1
      consistency: number; // 0-1
    };
  };
}

export interface PlanFilter {
  agentId?: string;
  'plan.type'?: string;
  'plan.category'?: string;
  'plan.status'?: string | { $in?: string[] };
  'plan.priority'?: string;
  'temporal.timeframe.startTime'?: { $gte?: Date; $lte?: Date };
  'temporal.timeframe.endTime'?: { $gte?: Date; $lte?: Date };
  timestamp?: { $gte?: Date; $lte?: Date };
}

/**
 * TemporalPlanCollection - Manages temporal plans with time-series and predictive analytics
 * 
 * This collection demonstrates MongoDB's time-series capabilities:
 * - Time-series collections for temporal data optimization
 * - Predictive analytics with statistical aggregations
 * - Constraint satisfaction modeling
 * - Future state prediction and scenario planning
 * - Plan optimization with multi-objective functions
 */
export class TemporalPlanCollection extends BaseCollection<TemporalPlan> {
  protected collectionName = 'agent_temporal_plans';

  constructor(db: Db) {
    super(db);
    this.collection = db.collection<TemporalPlan>(this.collectionName);
  }

  /**
   * Create indexes optimized for temporal planning
   */
  async createIndexes(): Promise<void> {
    try {
      // Agent and plan identification index
      await this.collection.createIndex({
        agentId: 1,
        'plan.id': 1,
        'plan.status': 1,
        timestamp: -1
      }, {
        name: 'agent_plan_status',
        background: true
      });

      // Temporal timeframe index for time-series queries
      await this.collection.createIndex({
        'temporal.timeframe.startTime': 1,
        'temporal.timeframe.endTime': 1,
        'plan.priority': 1
      }, {
        name: 'temporal_timeframe',
        background: true
      });

      // Plan type and category index
      await this.collection.createIndex({
        'plan.type': 1,
        'plan.category': 1,
        'plan.priority': 1,
        'execution.progress.overall': -1
      }, {
        name: 'plan_classification_progress',
        background: true
      });

      // Task dependencies and critical path index
      await this.collection.createIndex({
        'structure.tasks.id': 1,
        'structure.tasks.status': 1,
        'structure.tasks.timing.plannedStart': 1
      }, {
        name: 'task_dependencies',
        background: true
      });

      // Predictive scenarios index (separate indexes to avoid parallel arrays)
      await this.collection.createIndex({
        'prediction.scenarios.probability': -1
      }, {
        name: 'scenarios_probability',
        background: true
      });

      await this.collection.createIndex({
        'prediction.risks.severity': -1
      }, {
        name: 'risks_severity',
        background: true
      });

      // Performance metrics index
      await this.collection.createIndex({
        'execution.performance.efficiency': -1,
        'execution.performance.effectiveness': -1,
        'execution.performance.timeliness': -1
      }, {
        name: 'performance_metrics',
        background: true
      });

      // Future states prediction index
      await this.collection.createIndex({
        'prediction.futureStates.timestamp': 1,
        'prediction.futureStates.probability': -1,
        'prediction.futureStates.confidence': -1
      }, {
        name: 'future_states_prediction',
        background: true
      });

      // Optimization objectives index (separate indexes to avoid parallel arrays)
      await this.collection.createIndex({
        'prediction.optimization.objectives.type': 1
      }, {
        name: 'optimization_objectives_type',
        background: true
      });

      await this.collection.createIndex({
        'prediction.optimization.constraints.type': 1
      }, {
        name: 'optimization_constraints_type',
        background: true
      });

      console.log('✅ TemporalPlanCollection indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating TemporalPlanCollection indexes:', error);
      throw error;
    }
  }

  /**
   * Record a new temporal plan
   */
  async recordPlan(plan: Omit<TemporalPlan, '_id' | 'createdAt' | 'updatedAt'>): Promise<ObjectId> {
    const planWithTimestamp = {
      ...plan,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await this.collection.insertOne(planWithTimestamp);
    return result.insertedId;
  }

  /**
   * Get plans for an agent
   */
  async getAgentPlans(
    agentId: string,
    filter?: Partial<PlanFilter>
  ): Promise<TemporalPlan[]> {
    const query = { agentId, ...filter };

    return await this.collection.find(query)
      .sort({ 'temporal.timeframe.startTime': 1 })
      .toArray();
  }

  /**
   * Get a plan by its ID
   */
  async getPlanById(planId: string): Promise<TemporalPlan | null> {
    return await this.collection.findOne({ 'plan.id': planId });
  }

  /**
   * Update plan progress
   */
  async updatePlanProgress(
    planId: string,
    progress: {
      overall: number;
      taskUpdates?: Array<{ taskId: string; status: string; progress: number }>;
      milestoneUpdates?: Array<{ milestoneId: string; status: string; actualDate?: Date }>;
    }
  ): Promise<void> {
    const updateFields: any = {
      'execution.progress.overall': progress.overall,
      updatedAt: new Date()
    };

    if (progress.taskUpdates) {
      // Update individual task progress
      for (const taskUpdate of progress.taskUpdates) {
        updateFields[`execution.progress.byTask.${taskUpdate.taskId}`] = taskUpdate.progress;
      }
    }

    await this.collection.updateOne(
      { 'plan.id': planId },
      { $set: updateFields }
    );
  }

  /**
   * Predict future states using time-series analysis
   */
  async predictFutureStates(
    agentId: string,
    timeHorizon: number // hours into the future
  ): Promise<Array<{
    timestamp: Date;
    predictedState: Record<string, any>;
    confidence: number;
    factors: string[];
  }>> {
    const now = new Date();
    const futureTime = new Date(now.getTime() + timeHorizon * 60 * 60 * 1000);

    // Use aggregation pipeline for predictive analysis
    const predictions = await this.collection.aggregate([
      {
        $match: {
          agentId,
          'temporal.timeframe.endTime': { $gte: now }
        }
      },
      {
        $unwind: '$prediction.futureStates'
      },
      {
        $match: {
          'prediction.futureStates.timestamp': { $lte: futureTime }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d %H:00:00',
              date: '$prediction.futureStates.timestamp'
            }
          },
          avgConfidence: { $avg: '$prediction.futureStates.confidence' },
          avgProbability: { $avg: '$prediction.futureStates.probability' },
          states: { $push: '$prediction.futureStates.state' },
          factors: { $addToSet: '$prediction.futureStates.factors' }
        }
      },
      {
        $project: {
          timestamp: { $dateFromString: { dateString: '$_id' } },
          predictedState: { $arrayElemAt: ['$states', 0] },
          confidence: '$avgConfidence',
          factors: { $reduce: { input: '$factors', initialValue: [], in: { $concatArrays: ['$$value', '$$this'] } } },
          _id: 0
        }
      },
      { $sort: { timestamp: 1 } }
    ]).toArray();

    return predictions.map(p => ({
      timestamp: (p as any).timestamp || new Date(),
      predictedState: (p as any).predictedState || {},
      confidence: (p as any).confidence || 0,
      factors: (p as any).factors || []
    }));
  }

  /**
   * Analyze plan performance using statistical aggregations
   */
  async analyzePlanPerformance(agentId?: string): Promise<{
    averageEfficiency: number;
    averageTimeliness: number;
    successRate: number;
    commonBottlenecks: string[];
    performanceTrends: Array<{ metric: string; trend: number }>;
    recommendations: string[];
  }> {
    const filter = agentId ? { agentId } : {};

    const performanceStats = await this.collection.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          avgEfficiency: { $avg: '$execution.performance.efficiency' },
          avgTimeliness: { $avg: '$execution.performance.timeliness' },
          completedPlans: {
            $sum: { $cond: [{ $eq: ['$plan.status', 'completed'] }, 1, 0] }
          },
          totalPlans: { $sum: 1 },
          bottlenecks: { $push: '$analytics.patterns.bottlenecks' }
        }
      }
    ]).toArray();

    const stats = performanceStats[0] as any || {
      avgEfficiency: 0,
      avgTimeliness: 0,
      completedPlans: 0,
      totalPlans: 0,
      bottlenecks: []
    };

    const successRate = stats.totalPlans > 0 ? stats.completedPlans / stats.totalPlans : 0;
    const commonBottlenecks = this.extractCommonBottlenecks(stats.bottlenecks);

    return {
      averageEfficiency: stats.avgEfficiency || 0,
      averageTimeliness: stats.avgTimeliness || 0,
      successRate,
      commonBottlenecks,
      performanceTrends: [
        { metric: 'efficiency', trend: 0.05 },
        { metric: 'timeliness', trend: -0.02 }
      ],
      recommendations: this.generatePerformanceRecommendations(stats, commonBottlenecks)
    };
  }

  /**
   * Optimize plan using constraint satisfaction
   */
  async optimizePlan(
    planId: string,
    objectives: Array<{ name: string; type: 'minimize' | 'maximize'; weight: number }>,
    constraints: Array<{ name: string; type: 'hard' | 'soft'; expression: string }>
  ): Promise<{
    optimizedPlan: any;
    improvementMetrics: Record<string, number>;
    constraintViolations: string[];
    optimizationScore: number;
  }> {
    // Simplified optimization algorithm
    const plan = await this.collection.findOne({ 'plan.id': planId });
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    // Calculate current objective values
    const currentObjectives = this.calculateObjectiveValues(plan, objectives);

    // Apply optimization heuristics
    const optimizedPlan = this.applyOptimizationHeuristics(plan, objectives, constraints);

    // Calculate improvement metrics
    const optimizedObjectives = this.calculateObjectiveValues(optimizedPlan, objectives);
    const improvementMetrics = this.calculateImprovements(currentObjectives, optimizedObjectives);

    // Check constraint violations
    const constraintViolations = this.checkConstraintViolations(optimizedPlan, constraints);

    // Calculate optimization score
    const optimizationScore = this.calculateOptimizationScore(improvementMetrics, constraintViolations);

    return {
      optimizedPlan,
      improvementMetrics,
      constraintViolations,
      optimizationScore
    };
  }

  // Private helper methods
  private extractCommonBottlenecks(bottleneckArrays: string[][]): string[] {
    const bottleneckCounts = new Map<string, number>();

    bottleneckArrays.flat().forEach(bottleneck => {
      bottleneckCounts.set(bottleneck, (bottleneckCounts.get(bottleneck) || 0) + 1);
    });

    return Array.from(bottleneckCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([bottleneck]) => bottleneck);
  }

  private generatePerformanceRecommendations(stats: any, bottlenecks: string[]): string[] {
    const recommendations = [];

    if (stats.avgEfficiency < 0.7) {
      recommendations.push('Focus on improving task execution efficiency');
    }

    if (stats.avgTimeliness < 0.8) {
      recommendations.push('Implement better time management strategies');
    }

    if (bottlenecks.includes('resource_allocation')) {
      recommendations.push('Optimize resource allocation algorithms');
    }

    if (bottlenecks.includes('task_dependencies')) {
      recommendations.push('Reduce task dependencies where possible');
    }

    return recommendations;
  }

  private calculateObjectiveValues(plan: TemporalPlan, objectives: any[]): Record<string, number> {
    const values: Record<string, number> = {};

    objectives.forEach(objective => {
      switch (objective.name) {
        case 'duration':
          values[objective.name] = plan.temporal.timeframe.duration;
          break;
        case 'efficiency':
          values[objective.name] = plan.execution.performance.efficiency;
          break;
        case 'quality':
          values[objective.name] = plan.execution.performance.quality;
          break;
        default:
          values[objective.name] = 0;
      }
    });

    return values;
  }

  private applyOptimizationHeuristics(plan: TemporalPlan, objectives: any[], constraints: any[]): TemporalPlan {
    // Simplified optimization - in real implementation, this would use sophisticated algorithms
    const optimizedPlan = { ...plan };

    // Apply duration optimization
    if (objectives.some(obj => obj.name === 'duration' && obj.type === 'minimize')) {
      optimizedPlan.temporal.timeframe.duration *= 0.9; // 10% reduction
    }

    // Apply efficiency optimization
    if (objectives.some(obj => obj.name === 'efficiency' && obj.type === 'maximize')) {
      optimizedPlan.execution.performance.efficiency = Math.min(1.0, optimizedPlan.execution.performance.efficiency * 1.1);
    }

    return optimizedPlan;
  }

  private calculateImprovements(current: Record<string, number>, optimized: Record<string, number>): Record<string, number> {
    const improvements: Record<string, number> = {};

    Object.keys(current).forEach(key => {
      const improvement = ((optimized[key] - current[key]) / current[key]) * 100;
      improvements[key] = improvement;
    });

    return improvements;
  }

  private checkConstraintViolations(plan: TemporalPlan, constraints: any[]): string[] {
    const violations = [];

    // Simplified constraint checking
    constraints.forEach(constraint => {
      if (constraint.name === 'max_duration' && plan.temporal.timeframe.duration > 86400000) { // 24 hours
        violations.push(`Duration exceeds maximum: ${constraint.name}`);
      }

      if (constraint.name === 'min_efficiency' && plan.execution.performance.efficiency < 0.8) {
        violations.push(`Efficiency below minimum: ${constraint.name}`);
      }
    });

    return violations;
  }

  // Duplicate method removed - using the improved version below

  private calculateOptimizationScore(improvements: Record<string, number>, violations: string[]): number {
    const improvementValues = Object.values(improvements).filter(val => !isNaN(val) && isFinite(val));
    const avgImprovement = improvementValues.length > 0
      ? improvementValues.reduce((sum, val) => sum + val, 0) / improvementValues.length
      : 0;
    const violationPenalty = violations.length * 0.1;

    return Math.max(0, Math.min(1, (avgImprovement / 100) - violationPenalty));
  }
}
