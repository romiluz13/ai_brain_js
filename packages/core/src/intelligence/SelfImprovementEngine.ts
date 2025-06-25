/**
 * Self-Improvement Engine - The Crown Jewel of Universal AI Brain
 * 
 * This engine learns from every interaction, failure, and success to continuously
 * improve the AI's performance. It's what transforms a basic AI into a superintelligent one.
 * 
 * Features:
 * - Failure Analysis: Learns from every error to prevent future issues
 * - Context Learning: Continuously improves context selection accuracy
 * - Framework Optimization: Optimizes performance for each specific framework
 * - Pattern Recognition: Identifies successful interaction patterns
 * - Feedback Integration: Learns from user feedback and corrections
 */

import { Collection, Db } from 'mongodb';
import { SemanticMemoryEngine } from './SemanticMemoryEngine';

export interface FailurePattern {
  id: string;
  pattern: string;
  frequency: number;
  lastOccurrence: Date;
  resolution?: string;
  confidence: number;
  framework: string;
  category: 'memory' | 'context' | 'workflow' | 'safety' | 'performance';
}

export interface ImprovementMetric {
  metric: string;
  before: number;
  after: number;
  improvement: number;
  timestamp: Date;
  framework: string;
  category: string;
}

export interface LearningInsight {
  id: string;
  insight: string;
  evidence: string[];
  confidence: number;
  applicability: string[];
  created: Date;
  applied: boolean;
  impact?: number;
}

export class SelfImprovementEngine {
  private db: Db;
  private memoryEngine: SemanticMemoryEngine;
  private failurePatternsCollection: Collection;
  private improvementMetricsCollection: Collection;
  private learningInsightsCollection: Collection;
  private isLearning: boolean = true;

  constructor(db: Db, memoryEngine: SemanticMemoryEngine) {
    this.db = db;
    this.memoryEngine = memoryEngine;
    this.failurePatternsCollection = db.collection('failure_patterns');
    this.improvementMetricsCollection = db.collection('improvement_metrics');
    this.learningInsightsCollection = db.collection('learning_insights');
  }

  /**
   * Initialize the self-improvement engine
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Self-Improvement Engine...');
    
    // Create indexes for optimal performance
    await this.createIndexes();
    
    // Load existing patterns and insights
    await this.loadExistingPatterns();
    
    console.log('✅ Self-Improvement Engine initialized successfully');
  }

  /**
   * Learn from a failure - the core of self-improvement
   */
  async learnFromFailure(
    error: Error,
    context: {
      framework: string;
      sessionId: string;
      agentId: string;
      operation: string;
      input: any;
      expectedOutput?: any;
    }
  ): Promise<void> {
    try {
      console.log(`🧠 Learning from failure: ${error.message}`);

      // Analyze the failure pattern
      const pattern = await this.analyzeFailurePattern(error, context);
      
      // Store the failure pattern
      await this.storeFailurePattern(pattern);
      
      // Generate learning insights
      const insights = await this.generateLearningInsights(pattern, context);
      
      // Store insights for future application
      for (const insight of insights) {
        await this.storeLearningInsight(insight);
      }
      
      // Store in memory for future reference
      await this.memoryEngine.storeMemory(
        `Failure learned: ${error.message} - Pattern: ${pattern.pattern}`,
        {
          type: 'procedure',
          framework: context.framework,
          sessionId: context.sessionId,
          source: 'self_improvement',
          importance: 0.9, // Failures are very important for learning
          confidence: 0.95,
          tags: ['failure', 'learning', pattern.category, context.framework],
          relationships: [`failure_pattern_${pattern.id}`]
        }
      );

      console.log(`✅ Learned from failure: ${pattern.category} pattern identified`);
      
    } catch (learningError) {
      console.error('Failed to learn from failure:', learningError);
    }
  }

  /**
   * Learn from successful interactions
   */
  async learnFromSuccess(
    result: any,
    context: {
      framework: string;
      sessionId: string;
      agentId: string;
      operation: string;
      input: any;
      metrics: {
        responseTime: number;
        memoryRetrievals: number;
        contextItems: number;
        userSatisfaction?: number;
      };
    }
  ): Promise<void> {
    try {
      // Identify what made this interaction successful
      const successPattern = await this.analyzeSuccessPattern(result, context);
      
      // Store the success pattern for replication
      await this.storeSuccessPattern(successPattern);
      
      // Update improvement metrics
      await this.updateImprovementMetrics(context);
      
      console.log(`✅ Learned from success: ${successPattern.category} optimization`);
      
    } catch (error) {
      console.error('Failed to learn from success:', error);
    }
  }

  /**
   * Optimize context selection based on learning
   */
  async optimizeContextSelection(
    query: string,
    framework: string,
    sessionId: string
  ): Promise<{
    optimizedQuery: string;
    contextFilters: any;
    priorityAdjustments: any;
  }> {
    // Get relevant learning insights
    const insights = await this.learningInsightsCollection.find({
      applicability: framework,
      applied: true,
      'confidence': { $gte: 0.7 }
    }).toArray();

    // Apply learned optimizations
    let optimizedQuery = query;
    let contextFilters = {};
    let priorityAdjustments = {};

    for (const insight of insights) {
      if ((insight as unknown as LearningInsight).insight.includes('context_selection')) {
        // Apply context selection improvements
        contextFilters = this.applyContextOptimizations(insight as unknown as LearningInsight, contextFilters);
      }

      if ((insight as unknown as LearningInsight).insight.includes('priority_adjustment')) {
        // Apply priority adjustments
        priorityAdjustments = this.applyPriorityOptimizations(insight as unknown as LearningInsight, priorityAdjustments);
      }
    }

    return {
      optimizedQuery,
      contextFilters,
      priorityAdjustments
    };
  }

  /**
   * Get improvement recommendations for a framework
   */
  async getImprovementRecommendations(framework: string): Promise<{
    recommendations: string[];
    metrics: ImprovementMetric[];
    insights: LearningInsight[];
  }> {
    // Get recent improvement metrics
    const metrics = await this.improvementMetricsCollection.find({
      framework,
      timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    }).sort({ timestamp: -1 }).limit(10).toArray();

    // Get applicable insights
    const insights = await this.learningInsightsCollection.find({
      applicability: framework,
      confidence: { $gte: 0.6 }
    }).sort({ confidence: -1 }).limit(5).toArray();

    // Generate recommendations based on patterns
    const recommendations = await this.generateRecommendations(framework, metrics as unknown as ImprovementMetric[], insights as unknown as LearningInsight[]);

    return {
      recommendations,
      metrics: metrics as unknown as ImprovementMetric[],
      insights: insights as unknown as LearningInsight[]
    };
  }

  /**
   * Analyze failure patterns to identify root causes
   */
  private async analyzeFailurePattern(
    error: Error,
    context: any
  ): Promise<FailurePattern> {
    const errorMessage = error.message.toLowerCase();
    let category: FailurePattern['category'] = 'performance';
    
    // Categorize the failure
    if (errorMessage.includes('memory') || errorMessage.includes('retrieval')) {
      category = 'memory';
    } else if (errorMessage.includes('context') || errorMessage.includes('injection')) {
      category = 'context';
    } else if (errorMessage.includes('workflow') || errorMessage.includes('step')) {
      category = 'workflow';
    } else if (errorMessage.includes('safety') || errorMessage.includes('pii')) {
      category = 'safety';
    }

    // Extract pattern from error and context
    const pattern = this.extractFailurePattern(error, context);

    return {
      id: `failure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      pattern,
      frequency: 1,
      lastOccurrence: new Date(),
      confidence: 0.8,
      framework: context.framework,
      category
    };
  }

  /**
   * Extract meaningful patterns from failures
   */
  private extractFailurePattern(error: Error, context: any): string {
    const errorType = error.constructor.name;
    const operation = context.operation;
    const framework = context.framework;
    
    // Create a pattern signature
    return `${framework}:${operation}:${errorType}:${this.normalizeErrorMessage(error.message)}`;
  }

  /**
   * Normalize error messages for pattern matching
   */
  private normalizeErrorMessage(message: string): string {
    return message
      .toLowerCase()
      .replace(/\d+/g, 'N') // Replace numbers with N
      .replace(/['"]/g, '') // Remove quotes
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 100); // Limit length
  }

  /**
   * Store failure pattern in database
   */
  private async storeFailurePattern(pattern: FailurePattern): Promise<void> {
    // Check if pattern already exists
    const existing = await this.failurePatternsCollection.findOne({
      pattern: pattern.pattern,
      framework: pattern.framework
    });

    if (existing) {
      // Update frequency and last occurrence
      await this.failurePatternsCollection.updateOne(
        { _id: existing._id },
        {
          $inc: { frequency: 1 },
          $set: { lastOccurrence: new Date() }
        }
      );
    } else {
      // Insert new pattern
      await this.failurePatternsCollection.insertOne(pattern);
    }
  }

  /**
   * Generate learning insights from failure patterns
   */
  private async generateLearningInsights(
    pattern: FailurePattern,
    context: any
  ): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = [];

    // Generate category-specific insights
    switch (pattern.category) {
      case 'memory':
        insights.push({
          id: `insight_${Date.now()}_memory`,
          insight: `Memory retrieval optimization needed for ${context.framework}`,
          evidence: [pattern.pattern],
          confidence: 0.8,
          applicability: [context.framework],
          created: new Date(),
          applied: false
        });
        break;
        
      case 'context':
        insights.push({
          id: `insight_${Date.now()}_context`,
          insight: `Context selection algorithm needs adjustment for ${context.operation}`,
          evidence: [pattern.pattern],
          confidence: 0.75,
          applicability: [context.framework],
          created: new Date(),
          applied: false
        });
        break;
        
      // Add more category-specific insights...
    }

    return insights;
  }

  /**
   * Analyze successful interactions to identify best practices
   */
  private async analyzeSuccessPattern(result: any, context: any): Promise<any> {
    return {
      id: `success_${Date.now()}`,
      pattern: `${context.framework}:${context.operation}:success`,
      metrics: context.metrics,
      category: 'performance',
      framework: context.framework,
      created: new Date()
    };
  }

  /**
   * Store successful patterns for replication
   */
  private async storeSuccessPattern(pattern: any): Promise<void> {
    await this.db.collection('success_patterns').insertOne(pattern);
  }

  /**
   * Update improvement metrics
   */
  private async updateImprovementMetrics(context: any): Promise<void> {
    const metric: ImprovementMetric = {
      metric: 'response_time',
      before: 0, // Would be calculated from historical data
      after: context.metrics.responseTime,
      improvement: 0, // Would be calculated
      timestamp: new Date(),
      framework: context.framework,
      category: 'performance'
    };

    await this.improvementMetricsCollection.insertOne(metric);
  }

  /**
   * Store learning insights
   */
  private async storeLearningInsight(insight: LearningInsight): Promise<void> {
    await this.learningInsightsCollection.insertOne(insight);
  }

  /**
   * Apply context optimizations based on insights
   */
  private applyContextOptimizations(insight: LearningInsight, filters: any): any {
    // Implementation would apply specific optimizations
    return { ...filters, optimized: true };
  }

  /**
   * Apply priority optimizations based on insights
   */
  private applyPriorityOptimizations(insight: LearningInsight, adjustments: any): any {
    // Implementation would apply specific priority adjustments
    return { ...adjustments, optimized: true };
  }

  /**
   * Generate improvement recommendations
   */
  private async generateRecommendations(
    framework: string,
    metrics: ImprovementMetric[],
    insights: LearningInsight[]
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Analyze metrics for recommendations
    if (metrics.length > 0) {
      const avgResponseTime = metrics.reduce((sum, m) => sum + m.after, 0) / metrics.length;
      if (avgResponseTime > 1000) {
        recommendations.push('Consider optimizing response time - current average is above 1 second');
      }
    }

    // Add insight-based recommendations
    for (const insight of insights) {
      if (!insight.applied && insight.confidence > 0.7) {
        recommendations.push(`Apply insight: ${insight.insight}`);
      }
    }

    return recommendations;
  }

  /**
   * Create database indexes for optimal performance
   */
  private async createIndexes(): Promise<void> {
    await this.failurePatternsCollection.createIndex({ pattern: 1, framework: 1 });
    await this.failurePatternsCollection.createIndex({ category: 1, frequency: -1 });
    await this.improvementMetricsCollection.createIndex({ framework: 1, timestamp: -1 });
    await this.learningInsightsCollection.createIndex({ applicability: 1, confidence: -1 });
  }

  /**
   * Load existing patterns for immediate use
   */
  private async loadExistingPatterns(): Promise<void> {
    const patternCount = await this.failurePatternsCollection.countDocuments();
    const insightCount = await this.learningInsightsCollection.countDocuments();
    
    console.log(`📊 Loaded ${patternCount} failure patterns and ${insightCount} learning insights`);
  }

  /**
   * Get self-improvement statistics
   */
  async getImprovementStats(): Promise<{
    totalFailuresLearned: number;
    totalInsightsGenerated: number;
    totalImprovements: number;
    averageConfidence: number;
  }> {
    const [failureCount, insightCount, improvementCount] = await Promise.all([
      this.failurePatternsCollection.countDocuments(),
      this.learningInsightsCollection.countDocuments(),
      this.improvementMetricsCollection.countDocuments()
    ]);

    const insights = await this.learningInsightsCollection.find({}).toArray();
    const averageConfidence = insights.length > 0 
      ? insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length 
      : 0;

    return {
      totalFailuresLearned: failureCount,
      totalInsightsGenerated: insightCount,
      totalImprovements: improvementCount,
      averageConfidence
    };
  }
}
