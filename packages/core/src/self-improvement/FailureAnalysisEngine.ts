/**
 * @file FailureAnalysisEngine - Intelligent failure pattern analysis and improvement suggestions
 * 
 * This engine analyzes failure patterns from agent traces using MongoDB aggregation
 * pipelines to identify context gaps, detect prompt weaknesses, and suggest
 * improvements for the Universal AI Brain.
 * 
 * Features:
 * - Multi-dimensional failure analysis using MongoDB $facet
 * - Pattern detection with $bucket aggregations
 * - Context gap identification
 * - Prompt weakness detection
 * - Automated improvement suggestions
 * - Framework-specific failure analysis
 */

import { TracingCollection, AgentTrace, AgentError } from '../collections/TracingCollection';
import { MemoryCollection } from '../collections/MemoryCollection';

export interface FailurePattern {
  id: string;
  type: 'context_gap' | 'prompt_weakness' | 'framework_error' | 'timeout' | 'safety_violation' | 'unknown';
  frequency: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  examples: string[];
  suggestedFix: string;
  affectedFrameworks: string[];
  firstSeen: Date;
  lastSeen: Date;
  metadata?: Record<string, any>;
}

export interface ContextGap {
  missingTopic: string;
  frequency: number;
  relatedQueries: string[];
  suggestedSources: string[];
  priority: 'low' | 'medium' | 'high';
}

export interface PromptWeakness {
  pattern: string;
  description: string;
  frequency: number;
  failureRate: number;
  suggestedImprovement: string;
  examples: string[];
}

export interface FailureAnalysisReport {
  analysisId: string;
  timestamp: Date;
  timeRange: {
    start: Date;
    end: Date;
  };
  summary: {
    totalFailures: number;
    failureRate: number;
    mostCommonType: string;
    criticalIssues: number;
  };
  patterns: FailurePattern[];
  contextGaps: ContextGap[];
  promptWeaknesses: PromptWeakness[];
  frameworkAnalysis: {
    framework: string;
    failureRate: number;
    commonErrors: string[];
  }[];
  recommendations: {
    priority: 'immediate' | 'high' | 'medium' | 'low';
    action: string;
    description: string;
    estimatedImpact: string;
  }[];
}

/**
 * FailureAnalysisEngine - Intelligent failure pattern analysis
 * 
 * Uses MongoDB aggregation pipelines to analyze failure patterns and
 * provide actionable insights for improving the Universal AI Brain.
 */
export class FailureAnalysisEngine {
  private tracingCollection: TracingCollection;
  private memoryCollection: MemoryCollection;

  constructor(tracingCollection: TracingCollection, memoryCollection: MemoryCollection) {
    this.tracingCollection = tracingCollection;
    this.memoryCollection = memoryCollection;
  }

  /**
   * Analyze failures over a time period using MongoDB $facet aggregation
   */
  async analyzeFailures(
    startDate: Date,
    endDate: Date,
    options: {
      minFrequency?: number;
      includeRecoverable?: boolean;
      frameworks?: string[];
    } = {}
  ): Promise<FailureAnalysisReport> {
    const { minFrequency = 2, includeRecoverable = true, frameworks } = options;

    // Build match criteria
    const matchCriteria: any = {
      startTime: { $gte: startDate, $lte: endDate },
      errors: { $exists: true, $ne: [] }
    };

    if (!includeRecoverable) {
      matchCriteria['errors.recoverable'] = false;
    }

    if (frameworks && frameworks.length > 0) {
      matchCriteria['framework.frameworkName'] = { $in: frameworks };
    }

    // Multi-dimensional failure analysis using MongoDB $facet (official pattern)
    const pipeline = [
      { $match: matchCriteria },
      { $unwind: '$errors' },
      {
        $facet: {
          // Failure type analysis
          failuresByType: [
            {
              $bucket: {
                groupBy: '$errors.errorType',
                boundaries: [
                  'context_gap',
                  'framework_error', 
                  'mongodb_error',
                  'network_error',
                  'safety_violation',
                  'timeout_error',
                  'validation_error'
                ],
                default: 'unknown_error',
                output: {
                  count: { $sum: 1 },
                  severity: {
                    $push: {
                      $cond: [
                        { $eq: ['$errors.recoverable', false] },
                        'critical',
                        'medium'
                      ]
                    }
                  },
                  examples: {
                    $push: {
                      message: '$errors.message',
                      traceId: '$traceId',
                      timestamp: '$errors.timestamp'
                    }
                  },
                  frameworks: { $addToSet: '$framework.frameworkName' }
                }
              }
            }
          ],

          // Framework-specific analysis
          failuresByFramework: [
            {
              $group: {
                _id: '$framework.frameworkName',
                totalFailures: { $sum: 1 },
                errorTypes: { $addToSet: '$errors.errorType' },
                avgDuration: { $avg: '$performance.totalDuration' },
                recoverableCount: {
                  $sum: { $cond: ['$errors.recoverable', 1, 0] }
                }
              }
            },
            { $sort: { totalFailures: -1 } }
          ],

          // Time-based pattern analysis
          failuresByTime: [
            {
              $group: {
                _id: {
                  hour: { $hour: '$errors.timestamp' },
                  dayOfWeek: { $dayOfWeek: '$errors.timestamp' }
                },
                count: { $sum: 1 },
                errorTypes: { $addToSet: '$errors.errorType' }
              }
            },
            { $sort: { count: -1 } }
          ],

          // Context analysis
          contextAnalysis: [
            {
              $group: {
                _id: '$operation.userInput',
                failureCount: { $sum: 1 },
                errorTypes: { $addToSet: '$errors.errorType' },
                contextUsed: { $first: '$contextUsed' }
              }
            },
            { $match: { failureCount: { $gte: minFrequency } } },
            { $sort: { failureCount: -1 } },
            { $limit: 20 }
          ]
        }
      }
    ];

    const analysisResults = await this.tracingCollection.aggregate(pipeline);
    const facetResults = analysisResults[0];

    // Process results into structured report
    const patterns = await this.extractFailurePatterns(facetResults.failuresByType, minFrequency);
    const contextGaps = await this.identifyContextGaps(facetResults.contextAnalysis);
    const promptWeaknesses = await this.detectPromptWeaknesses(facetResults.contextAnalysis);
    const frameworkAnalysis = this.analyzeFrameworkFailures(facetResults.failuresByFramework);

    // Calculate summary statistics
    const totalFailures = facetResults.failuresByType.reduce((sum: number, bucket: any) => sum + bucket.count, 0);
    const totalTraces = await this.getTotalTraces(startDate, endDate);
    const failureRate = totalTraces > 0 ? (totalFailures / totalTraces) * 100 : 0;

    const mostCommonType = facetResults.failuresByType.length > 0 
      ? facetResults.failuresByType.reduce((max: any, current: any) => 
          current.count > max.count ? current : max
        )._id
      : 'none';

    const criticalIssues = patterns.filter(p => p.severity === 'critical').length;

    // Generate recommendations
    const recommendations = this.generateRecommendations(patterns, contextGaps, promptWeaknesses, frameworkAnalysis);

    return {
      analysisId: `analysis_${Date.now()}`,
      timestamp: new Date(),
      timeRange: { start: startDate, end: endDate },
      summary: {
        totalFailures,
        failureRate: Math.round(failureRate * 100) / 100,
        mostCommonType,
        criticalIssues
      },
      patterns,
      contextGaps,
      promptWeaknesses,
      frameworkAnalysis,
      recommendations
    };
  }

  /**
   * Extract failure patterns from bucket analysis results
   */
  private async extractFailurePatterns(bucketResults: any[], minFrequency: number): Promise<FailurePattern[]> {
    const patterns: FailurePattern[] = [];

    for (const bucket of bucketResults) {
      if (bucket.count >= minFrequency) {
        const criticalCount = bucket.severity.filter((s: string) => s === 'critical').length;
        const severity = criticalCount > bucket.count * 0.5 ? 'critical' :
                        criticalCount > 0 ? 'high' :
                        bucket.count > 10 ? 'medium' : 'low';

        patterns.push({
          id: `pattern_${bucket._id}_${Date.now()}`,
          type: bucket._id,
          frequency: bucket.count,
          severity,
          description: this.getPatternDescription(bucket._id, bucket.count),
          examples: bucket.examples.slice(0, 3).map((e: any) => e.message),
          suggestedFix: this.getSuggestedFix(bucket._id),
          affectedFrameworks: bucket.frameworks,
          firstSeen: new Date(Math.min(...bucket.examples.map((e: any) => new Date(e.timestamp).getTime()))),
          lastSeen: new Date(Math.max(...bucket.examples.map((e: any) => new Date(e.timestamp).getTime())))
        });
      }
    }

    return patterns.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Identify context gaps from failed queries
   */
  private async identifyContextGaps(contextAnalysis: any[]): Promise<ContextGap[]> {
    const gaps: ContextGap[] = [];

    for (const item of contextAnalysis) {
      // Analyze queries that failed due to lack of context
      if (item.errorTypes.includes('context_gap') || 
          (item.contextUsed && item.contextUsed.length === 0)) {
        
        const missingTopic = await this.extractTopicFromQuery(item._id);
        const suggestedSources = await this.suggestContextSources(missingTopic);

        gaps.push({
          missingTopic,
          frequency: item.failureCount,
          relatedQueries: [item._id],
          suggestedSources,
          priority: item.failureCount > 5 ? 'high' : 
                   item.failureCount > 2 ? 'medium' : 'low'
        });
      }
    }

    return gaps.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Detect prompt weaknesses from failure patterns
   */
  private async detectPromptWeaknesses(contextAnalysis: any[]): Promise<PromptWeakness[]> {
    const weaknesses: PromptWeakness[] = [];

    for (const item of contextAnalysis) {
      const query = item._id;
      const failureCount = item.failureCount;
      
      // Analyze prompt patterns that lead to failures
      const patterns = this.extractPromptPatterns(query);
      
      for (const pattern of patterns) {
        const existingWeakness = weaknesses.find(w => w.pattern === pattern);
        
        if (existingWeakness) {
          existingWeakness.frequency += failureCount;
          existingWeakness.examples.push(query);
        } else {
          weaknesses.push({
            pattern,
            description: this.getPromptWeaknessDescription(pattern),
            frequency: failureCount,
            failureRate: 0, // Will be calculated later
            suggestedImprovement: this.getSuggestedPromptImprovement(pattern),
            examples: [query]
          });
        }
      }
    }

    return weaknesses.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Analyze framework-specific failures
   */
  private analyzeFrameworkFailures(frameworkResults: any[]): FailureAnalysisReport['frameworkAnalysis'] {
    return frameworkResults.map(result => ({
      framework: result._id,
      failureRate: Math.round((result.totalFailures / (result.totalFailures + result.recoverableCount)) * 100),
      commonErrors: result.errorTypes.slice(0, 3)
    }));
  }

  /**
   * Generate actionable recommendations based on analysis
   */
  private generateRecommendations(
    patterns: FailurePattern[],
    contextGaps: ContextGap[],
    promptWeaknesses: PromptWeakness[],
    frameworkAnalysis: FailureAnalysisReport['frameworkAnalysis']
  ): FailureAnalysisReport['recommendations'] {
    const recommendations: FailureAnalysisReport['recommendations'] = [];

    // Critical pattern recommendations
    const criticalPatterns = patterns.filter(p => p.severity === 'critical');
    if (criticalPatterns.length > 0) {
      recommendations.push({
        priority: 'immediate',
        action: 'Fix Critical Failure Patterns',
        description: `Address ${criticalPatterns.length} critical failure patterns affecting system reliability`,
        estimatedImpact: 'High - Immediate stability improvement'
      });
    }

    // Context gap recommendations
    const highPriorityGaps = contextGaps.filter(g => g.priority === 'high');
    if (highPriorityGaps.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Expand Knowledge Base',
        description: `Add content for ${highPriorityGaps.length} high-priority missing topics`,
        estimatedImpact: 'Medium - Improved context relevance'
      });
    }

    // Framework-specific recommendations
    const problematicFrameworks = frameworkAnalysis.filter(f => f.failureRate > 10);
    if (problematicFrameworks.length > 0) {
      recommendations.push({
        priority: 'medium',
        action: 'Framework Integration Review',
        description: `Review integration patterns for frameworks with high failure rates`,
        estimatedImpact: 'Medium - Better framework compatibility'
      });
    }

    return recommendations;
  }

  // Helper methods
  private getPatternDescription(type: string, frequency: number): string {
    const descriptions: Record<string, string> = {
      'context_gap': `Insufficient context provided for ${frequency} queries`,
      'framework_error': `Framework integration issues in ${frequency} operations`,
      'timeout_error': `Operation timeouts affecting ${frequency} requests`,
      'safety_violation': `Safety policy violations in ${frequency} interactions`,
      'validation_error': `Input validation failures in ${frequency} cases`
    };
    return descriptions[type] || `Unknown error pattern with ${frequency} occurrences`;
  }

  private getSuggestedFix(type: string): string {
    const fixes: Record<string, string> = {
      'context_gap': 'Expand knowledge base and improve context retrieval algorithms',
      'framework_error': 'Review framework integration patterns and error handling',
      'timeout_error': 'Optimize query performance and increase timeout thresholds',
      'safety_violation': 'Strengthen content filtering and safety validation',
      'validation_error': 'Improve input validation and error messaging'
    };
    return fixes[type] || 'Investigate root cause and implement appropriate fixes';
  }

  private async extractTopicFromQuery(query: string): Promise<string> {
    // Simple topic extraction - could be enhanced with NLP
    const words = query.toLowerCase().split(' ');
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const keywords = words.filter(word => !stopWords.includes(word) && word.length > 3);
    return keywords.slice(0, 3).join(' ') || 'unknown topic';
  }

  private async suggestContextSources(topic: string): Promise<string[]> {
    // Suggest potential sources for missing context
    return [
      `Documentation about ${topic}`,
      `FAQ entries for ${topic}`,
      `Best practices for ${topic}`,
      `Examples and tutorials for ${topic}`
    ];
  }

  private extractPromptPatterns(query: string): string[] {
    const patterns: string[] = [];
    
    // Detect common problematic patterns
    if (query.length < 10) patterns.push('too_short');
    if (query.includes('?') && query.split('?').length > 3) patterns.push('multiple_questions');
    if (!/[.!?]$/.test(query.trim())) patterns.push('incomplete_sentence');
    if (query.split(' ').length > 100) patterns.push('too_verbose');
    
    return patterns;
  }

  private getPromptWeaknessDescription(pattern: string): string {
    const descriptions: Record<string, string> = {
      'too_short': 'Queries are too brief to provide sufficient context',
      'multiple_questions': 'Multiple questions in single query cause confusion',
      'incomplete_sentence': 'Incomplete sentences lead to ambiguous requests',
      'too_verbose': 'Overly long queries dilute the main request'
    };
    return descriptions[pattern] || 'Unknown prompt pattern issue';
  }

  private getSuggestedPromptImprovement(pattern: string): string {
    const improvements: Record<string, string> = {
      'too_short': 'Encourage users to provide more context and details',
      'multiple_questions': 'Guide users to ask one question at a time',
      'incomplete_sentence': 'Prompt users to complete their thoughts',
      'too_verbose': 'Help users focus on the main question'
    };
    return improvements[pattern] || 'Provide better prompt guidance';
  }

  private async getTotalTraces(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.tracingCollection.aggregate([
      {
        $match: {
          startTime: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $count: 'total'
      }
    ]);
    
    return result[0]?.total || 0;
  }
}
