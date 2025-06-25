/**
 * @file AttentionManagementSystem - Real-time cognitive attention management for AI agents
 * 
 * This system provides comprehensive attention management using MongoDB's change streams
 * and real-time capabilities. Demonstrates MongoDB's advanced real-time features for
 * cognitive load balancing, priority-based focus management, and distraction filtering.
 * 
 * Features:
 * - Real-time attention allocation with change streams
 * - Cognitive load monitoring and balancing
 * - Priority-based attention management with queues
 * - Distraction filtering and attention protection
 * - Context switching optimization
 * - Real-time attention analytics and alerts
 */

import { Db, ObjectId } from 'mongodb';
import { AttentionStateCollection, AttentionState } from '../collections/AttentionStateCollection';

export interface AttentionAllocationRequest {
  agentId: string;
  sessionId?: string;
  primaryTask: {
    taskId: string;
    taskType: 'conversation' | 'analysis' | 'planning' | 'execution' | 'monitoring';
    priority: 'critical' | 'high' | 'medium' | 'low';
    estimatedDuration: number; // minutes
    complexity: number; // 0-1
  };
  secondaryTasks?: Array<{
    taskId: string;
    taskType: string;
    priority: string;
    backgroundProcessing: boolean;
    maxFocus: number; // 0-1 maximum attention to allocate
  }>;
  contextualFactors: {
    urgency: number; // 0-1
    stakesLevel: 'low' | 'medium' | 'high' | 'critical';
    interruptibility: number; // 0-1 how interruptible the task is
    cognitiveComplexity: number; // 0-1
  };
}

export interface AttentionAllocation {
  stateId: ObjectId;
  allocation: {
    primary: { taskId: string; focus: number };
    secondary: Array<{ taskId: string; focus: number }>;
    totalAllocation: number;
  };
  cognitiveLoad: {
    current: number;
    projected: number;
    capacity: number;
    overloadRisk: number;
  };
  recommendations: string[];
  monitoring: {
    alertsEnabled: boolean;
    expectedDuration: number;
    nextReview: Date;
  };
}

export interface CognitiveLoadAssessment {
  current: number; // 0-1 current load
  capacity: number; // 0-1 available capacity
  utilization: number; // current/capacity ratio
  overload: boolean;
  breakdown: {
    working_memory: number;
    processing: number;
    decision_making: number;
    communication: number;
    monitoring: number;
  };
  recommendations: string[];
  loadManagement: {
    shouldShed: boolean;
    shouldDefer: string[];
    shouldBatch: string[];
  };
}

export interface DistractionFilter {
  enabled: boolean;
  threshold: number; // 0-1 minimum intensity to allow
  whitelist: string[];
  blacklist: string[];
  adaptiveFiltering: boolean;
  deepFocusMode: boolean;
  effectiveness: number; // 0-1 current filtering effectiveness
}

export interface AttentionAnalytics {
  efficiency: {
    focusQuality: number;
    taskSwitchingCost: number;
    attentionStability: number;
    distractionImpact: number;
  };
  patterns: {
    peakFocusHours: number[];
    optimalTaskDuration: number;
    switchingPatterns: Array<{
      from: string;
      to: string;
      cost: number;
      frequency: number;
    }>;
  };
  optimization: {
    recommendations: string[];
    potentialImprovements: Array<{
      area: string;
      impact: number;
      effort: number;
    }>;
  };
}

/**
 * AttentionManagementSystem - Real-time cognitive attention management
 * 
 * This system showcases MongoDB's real-time capabilities:
 * - Change streams for real-time attention monitoring
 * - Real-time updates for cognitive load balancing
 * - Priority queue management with MongoDB operations
 * - Complex aggregation for attention analytics
 * - Real-time alerting and monitoring
 */
export class AttentionManagementSystem {
  private db: Db;
  private attentionCollection: AttentionStateCollection;
  private isInitialized: boolean = false;
  private changeStreamActive: boolean = false;

  // Attention management configuration
  private config = {
    cognitiveLoad: {
      maxSafeUtilization: 0.85,
      overloadThreshold: 0.95,
      warningThreshold: 0.75,
      recoveryThreshold: 0.65
    },
    attention: {
      minPrimaryFocus: 0.6,
      maxTotalAllocation: 1.0,
      maxSecondaryTasks: 3,
      switchingCostThreshold: 0.3
    },
    distraction: {
      defaultThreshold: 0.4,
      deepFocusThreshold: 0.8,
      adaptiveLearningRate: 0.1
    },
    monitoring: {
      updateInterval: 30, // seconds
      alertCooldown: 300, // seconds
      analyticsWindow: 3600 // seconds
    }
  };

  constructor(db: Db) {
    this.db = db;
    this.attentionCollection = new AttentionStateCollection(db);
  }

  /**
   * Initialize the attention management system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Create collection indexes
      await this.attentionCollection.createIndexes();
      
      this.isInitialized = true;
      console.log('👁️ AttentionManagementSystem initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize AttentionManagementSystem:', error);
      throw error;
    }
  }

  /**
   * Allocate attention based on task requirements and current state
   */
  async allocateAttention(request: AttentionAllocationRequest): Promise<AttentionAllocation> {
    if (!this.isInitialized) {
      throw new Error('AttentionManagementSystem must be initialized first');
    }

    // Get current attention state
    const currentState = await this.attentionCollection.getCurrentAttentionState(
      request.agentId,
      request.sessionId
    );

    // Assess cognitive load
    const cognitiveLoad = await this.assessCognitiveLoad(request, currentState);

    // Calculate optimal attention allocation
    const allocation = this.calculateOptimalAllocation(request, cognitiveLoad);

    // Create new attention state
    const attentionState = this.createAttentionState(request, allocation, cognitiveLoad);

    // Store attention state
    const stateId = await this.attentionCollection.recordAttentionState(attentionState);

    // Generate recommendations
    const recommendations = this.generateAttentionRecommendations(allocation, cognitiveLoad);

    return {
      stateId,
      allocation: {
        primary: { taskId: request.primaryTask.taskId, focus: allocation.primary.focus },
        secondary: allocation.secondary.map(s => ({ taskId: s.taskId, focus: s.focus })),
        totalAllocation: allocation.totalAllocation
      },
      cognitiveLoad: {
        current: cognitiveLoad.current,
        projected: cognitiveLoad.utilization,
        capacity: cognitiveLoad.capacity,
        overloadRisk: cognitiveLoad.overload ? 1.0 : cognitiveLoad.utilization
      },
      recommendations,
      monitoring: {
        alertsEnabled: true,
        expectedDuration: request.primaryTask.estimatedDuration,
        nextReview: new Date(Date.now() + (this.config.monitoring.updateInterval * 1000))
      }
    };
  }

  /**
   * Start real-time attention monitoring with change streams
   */
  async startRealTimeMonitoring(
    agentId: string,
    onAttentionChange: (change: any) => void,
    onCognitiveOverload: (state: AttentionState) => void
  ): Promise<void> {
    if (this.changeStreamActive) {
      console.log('👁️ Real-time monitoring already active');
      return;
    }

    // Set up change stream monitoring
    await this.attentionCollection.startChangeStreamMonitoring(
      (change) => {
        // Handle attention state changes
        if (change.fullDocument?.agentId === agentId) {
          onAttentionChange(change);

          // Check for cognitive overload
          if (change.fullDocument.cognitiveLoad?.overload) {
            onCognitiveOverload(change.fullDocument);
          }
        }
      },
      {
        'fullDocument.agentId': agentId,
        'fullDocument.cognitiveLoad.overload': true
      }
    );

    this.changeStreamActive = true;
    console.log(`👁️ Real-time attention monitoring started for agent: ${agentId}`);
  }

  /**
   * Stop real-time attention monitoring
   */
  async stopRealTimeMonitoring(): Promise<void> {
    if (!this.changeStreamActive) {
      return;
    }

    await this.attentionCollection.stopChangeStreamMonitoring();
    this.changeStreamActive = false;
    console.log('👁️ Real-time attention monitoring stopped');
  }

  /**
   * Update cognitive load in real-time
   */
  async updateCognitiveLoad(
    agentId: string,
    loadUpdate: Partial<AttentionState['cognitiveLoad']>
  ): Promise<void> {
    const currentState = await this.attentionCollection.getCurrentAttentionState(agentId);
    if (!currentState) {
      throw new Error('No current attention state found for agent');
    }

    const updatedLoad = {
      ...currentState.cognitiveLoad,
      ...loadUpdate,
      utilization: (loadUpdate.current || currentState.cognitiveLoad.current) / 
                   (loadUpdate.capacity || currentState.cognitiveLoad.capacity)
    };

    // Check for overload
    updatedLoad.overload = updatedLoad.utilization > this.config.cognitiveLoad.overloadThreshold;

    await this.attentionCollection.updateCognitiveLoad(agentId, updatedLoad);
  }

  /**
   * Manage priority queue for attention allocation
   */
  async managePriorityQueue(
    agentId: string,
    action: 'add' | 'remove' | 'reorder',
    taskData?: {
      taskId: string;
      description: string;
      priority: 'critical' | 'high' | 'medium' | 'low';
      estimatedProcessingTime: number;
      deadline?: Date;
      dependencies?: string[];
    }
  ): Promise<void> {
    if (action === 'add' && taskData) {
      await this.attentionCollection.addToPriorityQueue(
        agentId,
        taskData.priority,
        taskData
      );
    } else if (action === 'remove' && taskData) {
      await this.attentionCollection.removeFromPriorityQueue(agentId, taskData.taskId);
    }
    // Reorder would be implemented with more complex queue management
  }

  /**
   * Configure distraction filtering
   */
  async configureDistractionFilter(
    agentId: string,
    filterConfig: Partial<DistractionFilter>
  ): Promise<void> {
    const currentState = await this.attentionCollection.getCurrentAttentionState(agentId);
    if (!currentState) {
      throw new Error('No current attention state found for agent');
    }

    const updatedFiltering = {
      ...currentState.distractions.filtering,
      ...filterConfig
    };

    // Update the attention state with new filtering configuration
    await this.attentionCollection.updateOne(
      { _id: currentState._id },
      {
        $set: {
          'distractions.filtering': updatedFiltering,
          updatedAt: new Date()
        }
      }
    );
  }

  /**
   * Analyze attention patterns and provide insights
   */
  async analyzeAttentionPatterns(agentId: string, days: number = 7): Promise<AttentionAnalytics> {
    const patterns = await this.attentionCollection.analyzeAttentionPatterns(agentId, days);

    // Calculate efficiency metrics
    const efficiency = {
      focusQuality: patterns.efficiencyMetrics.avgFocusQuality,
      taskSwitchingCost: patterns.efficiencyMetrics.taskSwitchingCost,
      attentionStability: patterns.efficiencyMetrics.attentionStability,
      distractionImpact: patterns.distractionAnalysis.avgDistractionLevel
    };

    // Extract patterns
    const focusPatterns = patterns.focusPatterns;
    const peakFocusHours = patterns.cognitiveLoadTrends
      .filter(trend => trend.avgLoad < 0.6) // Low load = high focus potential
      .map(trend => trend.hour);

    const optimalTaskDuration = this.calculateOptimalTaskDuration(focusPatterns);

    // Generate optimization recommendations
    const recommendations = this.generateOptimizationRecommendations(patterns);
    const potentialImprovements = this.identifyImprovementAreas(patterns);

    return {
      efficiency,
      patterns: {
        peakFocusHours,
        optimalTaskDuration,
        switchingPatterns: [] // Would be extracted from context switching data
      },
      optimization: {
        recommendations,
        potentialImprovements
      }
    };
  }

  /**
   * Get real-time attention statistics
   */
  async getAttentionStats(agentId?: string): Promise<{
    totalStates: number;
    avgFocusQuality: number;
    avgCognitiveLoad: number;
    overloadFrequency: number;
    avgDistractionLevel: number;
    currentStatus: 'optimal' | 'warning' | 'overload' | 'unknown';
  }> {
    const stats = await this.attentionCollection.getAttentionStats(agentId);
    
    // Determine current status
    let currentStatus: 'optimal' | 'warning' | 'overload' | 'unknown' = 'unknown';
    if (agentId) {
      const currentState = await this.attentionCollection.getCurrentAttentionState(agentId);
      if (currentState) {
        if (currentState.cognitiveLoad.overload) {
          currentStatus = 'overload';
        } else if (currentState.cognitiveLoad.utilization > this.config.cognitiveLoad.warningThreshold) {
          currentStatus = 'warning';
        } else {
          currentStatus = 'optimal';
        }
      }
    }

    return {
      ...stats,
      currentStatus
    };
  }

  /**
   * Assess cognitive load based on current state and new requirements
   */
  private async assessCognitiveLoad(
    request: AttentionAllocationRequest,
    currentState: AttentionState | null
  ): Promise<CognitiveLoadAssessment> {
    // Base cognitive load calculation
    let baseLoad = 0.3; // Minimum baseline load

    // Add load based on task complexity
    baseLoad += request.primaryTask.complexity * 0.4;

    // Add load for secondary tasks
    if (request.secondaryTasks) {
      baseLoad += request.secondaryTasks.length * 0.1;
    }

    // Add load based on contextual factors
    baseLoad += request.contextualFactors.cognitiveComplexity * 0.2;
    baseLoad += (1 - request.contextualFactors.interruptibility) * 0.1;

    // Adjust based on current state
    if (currentState) {
      const currentUtilization = currentState.cognitiveLoad.utilization;
      baseLoad = Math.max(baseLoad, currentUtilization * 0.8); // Carry forward some load
    }

    const capacity = 1.0; // Assume full capacity for now
    const utilization = Math.min(baseLoad / capacity, 1.5); // Allow temporary overload
    const overload = utilization > this.config.cognitiveLoad.overloadThreshold;

    // Breakdown by cognitive function
    const breakdown = {
      working_memory: Math.min(0.3 + (request.primaryTask.complexity * 0.4), 1.0),
      processing: Math.min(0.2 + (request.contextualFactors.cognitiveComplexity * 0.5), 1.0),
      decision_making: Math.min(0.1 + (request.contextualFactors.urgency * 0.3), 1.0),
      communication: request.primaryTask.taskType === 'conversation' ? 0.8 : 0.2,
      monitoring: (request.secondaryTasks?.length || 0) * 0.2
    };

    // Generate recommendations
    const recommendations = [];
    if (overload) {
      recommendations.push('Cognitive overload detected - consider reducing task complexity');
      recommendations.push('Defer non-critical secondary tasks');
    }
    if (utilization > this.config.cognitiveLoad.warningThreshold) {
      recommendations.push('High cognitive load - monitor for signs of fatigue');
    }

    // Load management suggestions
    const loadManagement = {
      shouldShed: overload,
      shouldDefer: overload ? (request.secondaryTasks?.map(t => t.taskId) || []) : [],
      shouldBatch: utilization > 0.7 ? ['similar_tasks'] : []
    };

    return {
      current: baseLoad,
      capacity,
      utilization,
      overload,
      breakdown,
      recommendations,
      loadManagement
    };
  }

  /**
   * Calculate optimal attention allocation
   */
  private calculateOptimalAllocation(
    request: AttentionAllocationRequest,
    cognitiveLoad: CognitiveLoadAssessment
  ): AttentionState['attention'] {
    // Start with primary task focus
    let primaryFocus = Math.max(this.config.attention.minPrimaryFocus, 0.9 - cognitiveLoad.utilization * 0.3);

    // Adjust based on priority and urgency
    const priorityBoost = {
      critical: 0.1,
      high: 0.05,
      medium: 0.0,
      low: -0.05
    };
    primaryFocus += priorityBoost[request.primaryTask.priority];
    primaryFocus += request.contextualFactors.urgency * 0.1;

    // Ensure within bounds
    primaryFocus = Math.min(Math.max(primaryFocus, this.config.attention.minPrimaryFocus), 1.0);

    // Allocate remaining attention to secondary tasks
    const remainingAttention = Math.max(0, this.config.attention.maxTotalAllocation - primaryFocus);
    const secondaryTasks = [];

    if (request.secondaryTasks && remainingAttention > 0) {
      const maxSecondary = Math.min(request.secondaryTasks.length, this.config.attention.maxSecondaryTasks);
      const attentionPerSecondary = remainingAttention / maxSecondary;

      for (let i = 0; i < maxSecondary; i++) {
        const task = request.secondaryTasks[i];
        const focus = Math.min(attentionPerSecondary, task.maxFocus);
        
        secondaryTasks.push({
          taskId: task.taskId,
          taskType: task.taskType,
          focus,
          priority: task.priority,
          backgroundProcessing: task.backgroundProcessing
        });
      }
    }

    const totalAllocation = primaryFocus + secondaryTasks.reduce((sum, task) => sum + task.focus, 0);

    return {
      primary: {
        taskId: request.primaryTask.taskId,
        taskType: request.primaryTask.taskType,
        focus: primaryFocus,
        priority: request.primaryTask.priority,
        startTime: new Date(),
        estimatedDuration: request.primaryTask.estimatedDuration
      },
      secondary: secondaryTasks,
      totalAllocation,
      efficiency: {
        focusQuality: Math.max(0.5, 1.0 - (cognitiveLoad.utilization * 0.5)),
        taskSwitchingCost: secondaryTasks.length * 0.1,
        distractionLevel: Math.min(0.5, cognitiveLoad.utilization * 0.3),
        attentionStability: Math.max(0.3, 1.0 - (secondaryTasks.length * 0.2))
      }
    };
  }

  /**
   * Create attention state object
   */
  private createAttentionState(
    request: AttentionAllocationRequest,
    attention: AttentionState['attention'],
    cognitiveLoad: CognitiveLoadAssessment
  ): Omit<AttentionState, '_id' | 'createdAt' | 'updatedAt'> {
    return {
      agentId: request.agentId,
      sessionId: request.sessionId,
      timestamp: new Date(),
      attention,
      cognitiveLoad: {
        current: cognitiveLoad.current,
        capacity: cognitiveLoad.capacity,
        utilization: cognitiveLoad.utilization,
        overload: cognitiveLoad.overload,
        breakdown: cognitiveLoad.breakdown,
        management: {
          loadShedding: cognitiveLoad.loadManagement.shouldShed,
          priorityFiltering: cognitiveLoad.utilization > 0.7,
          batchProcessing: cognitiveLoad.loadManagement.shouldBatch.length > 0,
          deferredProcessing: cognitiveLoad.loadManagement.shouldDefer
        }
      },
      priorityQueue: {
        critical: [],
        high: [],
        medium: [],
        low: []
      },
      distractions: {
        active: [],
        filtering: {
          enabled: true,
          threshold: this.config.distraction.defaultThreshold,
          whitelist: ['critical_alerts'],
          blacklist: ['social_media'],
          adaptiveFiltering: true
        },
        protection: {
          deepFocusMode: request.contextualFactors.stakesLevel === 'critical',
          focusTimeRemaining: request.primaryTask.estimatedDuration,
          interruptionCost: 1.0 - request.contextualFactors.interruptibility
        }
      },
      contextSwitching: {
        lastSwitch: new Date(),
        switchCount: 0,
        avgSwitchTime: 0,
        switchCost: 0,
        patterns: [],
        optimization: {
          batchSimilarTasks: true,
          minimizeHighCostSwitches: true,
          scheduleBreaks: cognitiveLoad.utilization > 0.8,
          groupByContext: true
        }
      },
      analytics: {
        session: {
          totalFocusTime: 0,
          taskCompletionRate: 0,
          attentionEfficiency: attention.efficiency.focusQuality,
          distractionRate: 0
        },
        trends: {
          focusImprovement: 0,
          loadManagement: 0,
          efficiencyTrend: 0
        },
        recommendations: cognitiveLoad.recommendations
      },
      monitoring: {
        alertsEnabled: true,
        thresholds: {
          overloadWarning: this.config.cognitiveLoad.warningThreshold,
          focusDegradation: 0.6,
          distractionAlert: this.config.distraction.defaultThreshold
        },
        lastAlert: new Date(),
        alertHistory: []
      },
      metadata: {
        framework: 'universal-ai-brain',
        version: '1.0.0',
        updateTrigger: 'manual',
        computationTime: 50
      }
    };
  }

  /**
   * Generate attention recommendations
   */
  private generateAttentionRecommendations(
    allocation: AttentionState['attention'],
    cognitiveLoad: CognitiveLoadAssessment
  ): string[] {
    const recommendations = [];

    if (allocation.efficiency.focusQuality < 0.7) {
      recommendations.push('Focus quality is suboptimal - consider reducing distractions');
    }

    if (allocation.secondary.length > 2) {
      recommendations.push('Multiple secondary tasks detected - consider prioritizing');
    }

    if (cognitiveLoad.overload) {
      recommendations.push('Cognitive overload detected - immediate load reduction recommended');
    }

    if (allocation.efficiency.taskSwitchingCost > this.config.attention.switchingCostThreshold) {
      recommendations.push('High task switching cost - batch similar tasks when possible');
    }

    return recommendations;
  }

  /**
   * Calculate optimal task duration based on focus patterns
   */
  private calculateOptimalTaskDuration(focusPatterns: any[]): number {
    // Simple heuristic - would be more sophisticated in practice
    const avgFocus = focusPatterns.reduce((sum, p) => sum + p.avgFocus, 0) / focusPatterns.length;
    return avgFocus > 0.8 ? 45 : avgFocus > 0.6 ? 30 : 20; // minutes
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(patterns: any): string[] {
    const recommendations = [];

    if (patterns.efficiencyMetrics.avgFocusQuality < 0.7) {
      recommendations.push('Improve focus quality by reducing multitasking');
    }

    if (patterns.distractionAnalysis.avgDistractionLevel > 0.4) {
      recommendations.push('Strengthen distraction filtering mechanisms');
    }

    if (patterns.cognitiveLoadTrends.some((t: any) => t.overloadFrequency > 0.2)) {
      recommendations.push('Schedule regular breaks during high-load periods');
    }

    return recommendations;
  }

  /**
   * Identify improvement areas
   */
  private identifyImprovementAreas(patterns: any): Array<{
    area: string;
    impact: number;
    effort: number;
  }> {
    const improvements = [];

    if (patterns.efficiencyMetrics.taskSwitchingCost > 0.3) {
      improvements.push({
        area: 'Task Batching',
        impact: 0.8,
        effort: 0.3
      });
    }

    if (patterns.distractionAnalysis.filteringEffectiveness < 0.7) {
      improvements.push({
        area: 'Distraction Filtering',
        impact: 0.7,
        effort: 0.4
      });
    }

    return improvements;
  }

  /**
   * Cleanup and shutdown
   */
  async cleanup(): Promise<void> {
    if (this.changeStreamActive) {
      await this.stopRealTimeMonitoring();
    }
  }
}
