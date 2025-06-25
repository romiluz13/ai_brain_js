/**
 * @file SkillCapabilityManager - Advanced skill and capability management for AI agents
 * 
 * This manager provides comprehensive skill tracking and capability management using MongoDB's
 * complex indexing and metadata management capabilities. Demonstrates MongoDB's advanced
 * features for multi-dimensional skill data, proficiency analytics, and capability matching.
 * 
 * Features:
 * - Complex multi-field indexing for skill queries
 * - Proficiency tracking with statistical analysis
 * - Capability matching and recommendation algorithms
 * - Learning analytics and skill development tracking
 * - Skill gap analysis and development planning
 * - Real-time skill assessment and adaptation
 */

import { Db, ObjectId } from 'mongodb';
import { SkillCapabilityCollection, SkillCapability } from '../collections/SkillCapabilityCollection';

export interface SkillAssessmentRequest {
  agentId: string;
  sessionId?: string;
  skillId: string;
  skillName: string;
  category: string;
  subcategory: string;
  domain: string;
  context: {
    taskType: string;
    complexity: number;
    duration: number;
    outcome: 'successful' | 'partially_successful' | 'unsuccessful';
    evidence?: string;
    feedback?: string;
  };
  performance: {
    accuracy: number; // 0-1
    efficiency: number; // 0-1
    quality: number; // 0-1
    creativity?: number; // 0-1
    collaboration?: number; // 0-1
  };
  environment: {
    pressure: 'low' | 'medium' | 'high';
    support: 'minimal' | 'moderate' | 'extensive';
    resources: 'limited' | 'adequate' | 'abundant';
    timeConstraints: 'relaxed' | 'moderate' | 'tight';
  };
}

export interface SkillDevelopmentPlan {
  agentId: string;
  targetSkills: Array<{
    skillId: string;
    skillName: string;
    currentProficiency: number;
    targetProficiency: number;
    priority: 'critical' | 'high' | 'medium' | 'low';
    estimatedTimeToTarget: number; // hours
    learningPath: Array<{
      step: number;
      activity: string;
      duration: number; // hours
      resources: string[];
      milestones: string[];
    }>;
  }>;
  timeline: {
    startDate: Date;
    estimatedCompletionDate: Date;
    milestones: Array<{
      date: Date;
      description: string;
      skillsToAssess: string[];
    }>;
  };
  recommendations: {
    learningStyle: string;
    practiceFrequency: string;
    focusAreas: string[];
    potentialChallenges: string[];
    successStrategies: string[];
  };
}

export interface CapabilityMatchingRequest {
  agentId: string;
  requiredSkills: Array<{
    skillId: string;
    skillName: string;
    minimumProficiency: number;
    importance: number; // 0-1
    category: string;
  }>;
  taskContext: {
    type: string;
    complexity: number;
    duration: number;
    domain: string;
    constraints?: string[];
  };
  preferences?: {
    prioritizeExperience?: boolean;
    allowSkillGaps?: boolean;
    maxGapTolerance?: number;
  };
}

export interface CapabilityMatchResult {
  overallMatch: number; // 0-1
  skillMatches: Array<{
    skillId: string;
    skillName: string;
    required: number;
    current: number;
    gap: number;
    confidence: number;
    evidence: string[];
  }>;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  riskAssessment: {
    overallRisk: number;
    riskFactors: string[];
    mitigationStrategies: string[];
  };
}

export interface SkillAnalytics {
  proficiencyDistribution: {
    beginner: number;
    intermediate: number;
    advanced: number;
    expert: number;
  };
  learningMetrics: {
    averageLearningRate: number;
    skillsInDevelopment: number;
    completedSkills: number;
    totalPracticeHours: number;
    averageSessionDuration: number;
  };
  performanceMetrics: {
    averageAccuracy: number;
    averageEfficiency: number;
    averageQuality: number;
    improvementTrend: number;
    consistencyScore: number;
  };
  gapAnalysis: {
    criticalGaps: Array<{
      skillName: string;
      currentGap: number;
      importance: number;
      priority: string;
    }>;
    developmentOpportunities: string[];
    strengthAreas: string[];
  };
  recommendations: {
    focusAreas: string[];
    learningPriorities: string[];
    skillCombinations: string[];
    nextSteps: string[];
  };
}

/**
 * SkillCapabilityManager - Advanced skill and capability management engine
 * 
 * Provides comprehensive skill tracking, proficiency analysis, capability matching,
 * and learning analytics using MongoDB's complex indexing and aggregation capabilities.
 */
export class SkillCapabilityManager {
  private skillCapabilityCollection: SkillCapabilityCollection;
  private isInitialized = false;

  constructor(private db: Db) {
    this.skillCapabilityCollection = new SkillCapabilityCollection(db);
  }

  /**
   * Initialize the skill capability manager
   */
  async initialize(): Promise<void> {
    try {
      await this.skillCapabilityCollection.createIndexes();
      this.isInitialized = true;
      console.log('SkillCapabilityManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SkillCapabilityManager:', error);
      throw error;
    }
  }

  /**
   * Assess and record skill performance
   */
  async assessSkill(request: SkillAssessmentRequest): Promise<ObjectId> {
    if (!this.isInitialized) {
      throw new Error('SkillCapabilityManager must be initialized first');
    }

    // Calculate proficiency based on performance metrics
    const proficiency = this.calculateProficiency(request.performance, request.environment);
    
    // Determine confidence level based on evidence and context
    const confidence = this.calculateConfidence(request.context, request.performance);

    // Create skill capability record
    const skillCapability: Omit<SkillCapability, '_id' | 'createdAt' | 'updatedAt'> = {
      agentId: request.agentId,
      sessionId: request.sessionId,
      timestamp: new Date(),
      skill: {
        id: request.skillId,
        name: request.skillName,
        category: request.category,
        subcategory: request.subcategory,
        domain: request.domain,
        tags: this.generateSkillTags(request),
        hierarchy: {
          level: this.determineSkillLevel(request.category, request.subcategory),
          parent: this.determineParentSkill(request.category, request.subcategory),
          children: [],
          prerequisites: this.determinePrerequisites(request.skillId),
          related: this.findRelatedSkills(request.skillId, request.category)
        },
        metadata: {
          difficulty: this.assessDifficulty(request.context.complexity),
          learningCurve: this.assessLearningCurve(request.skillId),
          practiceRequired: this.assessPracticeRequirement(request.skillId),
          transferability: this.assessTransferability(request.domain),
          marketDemand: this.assessMarketDemand(request.skillId),
          futureRelevance: this.assessFutureRelevance(request.skillId)
        }
      },
      proficiency: {
        current: proficiency.overall,
        confidence: confidence,
        lastAssessed: new Date(),
        assessmentHistory: [{
          date: new Date(),
          proficiency: proficiency.overall,
          context: request.context.taskType,
          evidence: request.context.evidence || 'Performance assessment'
        }],
        breakdown: {
          technical: proficiency.technical,
          practical: proficiency.practical,
          theoretical: proficiency.theoretical,
          creative: proficiency.creative || 0.5,
          collaborative: proficiency.collaborative || 0.5
        },
        calibration: {
          selfAssessment: proficiency.overall,
          externalAssessment: proficiency.overall,
          calibrationError: 0,
          overconfidenceIndex: 0
        }
      },
      learning: {
        progress: {
          startDate: new Date(),
          milestones: [{
            date: new Date(),
            proficiency: proficiency.overall,
            description: `Initial assessment: ${request.context.outcome}`,
            evidence: request.context.evidence
          }],
          currentStreak: 1,
          totalPracticeTime: request.context.duration,
          sessionsCompleted: 1
        },
        preferences: {
          learningStyle: this.inferLearningStyle(request.performance),
          preferredPace: this.inferPreferredPace(request.context.duration),
          practiceFrequency: 'weekly',
          feedbackPreference: 'immediate'
        },
        analytics: {
          learningRate: this.calculateLearningRate(proficiency.overall),
          retentionRate: 0.8, // Default, will be updated over time
          difficultyPreference: request.context.complexity,
          motivationFactors: this.identifyMotivationFactors(request.context.outcome),
          learningPatterns: this.identifyLearningPatterns(request.performance)
        }
      },
      application: {
        recentUsage: [{
          date: new Date(),
          context: request.context.taskType,
          duration: request.context.duration,
          complexity: request.context.complexity,
          outcome: request.context.outcome,
          feedback: request.context.feedback,
          improvementAreas: this.identifyImprovementAreas(request.performance)
        }],
        patterns: {
          frequency: 1,
          contexts: [request.context.taskType],
          peakPerformanceTimes: ['current'],
          commonChallenges: this.identifyCommonChallenges(request.performance),
          successFactors: this.identifySuccessFactors(request.performance, request.environment)
        },
        effectiveness: {
          taskSuccessRate: request.context.outcome === 'successful' ? 1.0 : 0.5,
          qualityConsistency: proficiency.overall,
          adaptabilityScore: this.calculateAdaptabilityScore(request.environment),
          innovationIndex: proficiency.creative || 0.5,
          collaborationEffectiveness: proficiency.collaborative || 0.5
        }
      },
      matching: {
        synergies: [],
        gaps: [],
        recommendations: this.generateInitialRecommendations(request, proficiency)
      }
    };

    return await this.skillCapabilityCollection.recordSkillCapability(skillCapability);
  }

  /**
   * Generate skill development plan for an agent
   */
  async generateDevelopmentPlan(agentId: string, targetSkills?: string[]): Promise<SkillDevelopmentPlan> {
    if (!this.isInitialized) {
      throw new Error('SkillCapabilityManager must be initialized first');
    }

    // Get current skills
    const currentSkills = await this.skillCapabilityCollection.getAgentSkills(agentId);

    // Analyze skill gaps
    const gapAnalysis = await this.skillCapabilityCollection.analyzeSkillGaps(agentId);

    // Determine target skills (either provided or from gap analysis)
    const skillsToTarget = targetSkills || gapAnalysis.map(gap => gap.area);

    const targetSkillPlans = await Promise.all(
      skillsToTarget.map(async (skillName) => {
        const currentSkill = currentSkills.find(s => s.skill.name === skillName);
        const currentProficiency = currentSkill?.proficiency.current || 0;
        const targetProficiency = Math.min(currentProficiency + 0.3, 1.0); // Aim for 30% improvement

        return {
          skillId: currentSkill?.skill.id || `skill_${skillName.toLowerCase().replace(/\s+/g, '_')}`,
          skillName,
          currentProficiency,
          targetProficiency,
          priority: this.determinePriority(skillName, gapAnalysis),
          estimatedTimeToTarget: this.estimateTimeToTarget(currentProficiency, targetProficiency),
          learningPath: this.generateLearningPath(skillName, currentProficiency, targetProficiency)
        };
      })
    );

    const timeline = this.generateTimeline(targetSkillPlans);
    const recommendations = this.generateLearningRecommendations(currentSkills, gapAnalysis);

    return {
      agentId,
      targetSkills: targetSkillPlans,
      timeline,
      recommendations
    };
  }

  /**
   * Match agent capabilities to requirements
   */
  async matchCapabilities(request: CapabilityMatchingRequest): Promise<CapabilityMatchResult> {
    if (!this.isInitialized) {
      throw new Error('SkillCapabilityManager must be initialized first');
    }

    const agentSkills = await this.skillCapabilityCollection.getAgentSkills(request.agentId);

    const skillMatches = request.requiredSkills.map(required => {
      const agentSkill = agentSkills.find(s =>
        s.skill.id === required.skillId || s.skill.name === required.skillName
      );

      const current = agentSkill?.proficiency.current || 0;
      const gap = Math.max(0, required.minimumProficiency - current);
      const confidence = agentSkill?.proficiency.confidence || 0;

      return {
        skillId: required.skillId,
        skillName: required.skillName,
        required: required.minimumProficiency,
        current,
        gap,
        confidence,
        evidence: agentSkill?.proficiency.assessmentHistory.map(h => h.evidence) || []
      };
    });

    const overallMatch = this.calculateOverallMatch(skillMatches, request.requiredSkills);
    const strengths = this.identifyStrengths(skillMatches);
    const gaps = this.identifyGaps(skillMatches);
    const recommendations = this.generateMatchingRecommendations(skillMatches, request);
    const riskAssessment = this.assessMatchingRisk(skillMatches, request);

    return {
      overallMatch,
      skillMatches,
      strengths,
      gaps,
      recommendations,
      riskAssessment
    };
  }

  /**
   * Analyze skill patterns and generate analytics
   */
  async analyzeSkillPatterns(agentId: string, timeframeDays: number = 30): Promise<SkillAnalytics> {
    if (!this.isInitialized) {
      throw new Error('SkillCapabilityManager must be initialized first');
    }

    // Get skill portfolio analysis from collection
    const portfolioAnalysis = await this.skillCapabilityCollection.analyzeSkillPortfolio(agentId);

    // Transform to SkillAnalytics format
    const proficiencyDistribution = this.transformProficiencyDistribution(portfolioAnalysis.proficiencyLevels);
    const learningMetrics = await this.calculateLearningMetrics(agentId);
    const performanceMetrics = await this.calculatePerformanceMetrics(agentId);

    return {
      proficiencyDistribution,
      learningMetrics,
      performanceMetrics,
      gapAnalysis: {
        criticalGaps: portfolioAnalysis.gapAnalysis.filter(gap => gap.priority === 'critical').map(gap => ({
          skillName: gap.area,
          currentGap: gap.gap,
          importance: 0.8, // Default importance
          priority: gap.priority
        })),
        developmentOpportunities: portfolioAnalysis.recommendations,
        strengthAreas: portfolioAnalysis.skillDistribution
          .filter(skill => skill.avgProficiency > 0.8)
          .map(skill => skill.category)
      },
      recommendations: {
        focusAreas: portfolioAnalysis.gapAnalysis.slice(0, 3).map(gap => gap.area),
        learningPriorities: portfolioAnalysis.recommendations,
        skillCombinations: ['Technical + Communication', 'Leadership + Problem Solving'],
        nextSteps: ['Focus on critical gaps', 'Practice regularly', 'Seek feedback']
      }
    };
  }

  /**
   * Update skill proficiency based on new evidence
   */
  async updateSkillProficiency(
    agentId: string,
    skillId: string,
    proficiencyUpdate: {
      newProficiency: number;
      evidence: string;
      context: string;
    }
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('SkillCapabilityManager must be initialized first');
    }

    await this.skillCapabilityCollection.updateSkillProficiency(agentId, skillId, {
      current: proficiencyUpdate.newProficiency,
      lastAssessed: new Date(),
      assessmentHistory: [{
        date: new Date(),
        proficiency: proficiencyUpdate.newProficiency,
        context: proficiencyUpdate.context,
        evidence: proficiencyUpdate.evidence
      }]
    });
  }

  // Private helper methods
  private calculateProficiency(performance: any, environment: any): any {
    const baseScore = (performance.accuracy + performance.efficiency + performance.quality) / 3;

    // Adjust for environment difficulty
    const environmentMultiplier = this.getEnvironmentMultiplier(environment);
    const adjustedScore = Math.min(1.0, baseScore * environmentMultiplier);

    return {
      overall: adjustedScore,
      technical: performance.accuracy,
      practical: performance.efficiency,
      theoretical: performance.quality,
      creative: performance.creativity,
      collaborative: performance.collaboration
    };
  }

  private calculateConfidence(context: any, performance: any): number {
    let confidence = 0.7; // Base confidence

    // Adjust based on outcome
    if (context.outcome === 'successful') confidence += 0.2;
    else if (context.outcome === 'unsuccessful') confidence -= 0.3;

    // Adjust based on evidence quality
    if (context.evidence) confidence += 0.1;

    // Adjust based on performance consistency
    const performanceValues = Object.values(performance).filter(v => typeof v === 'number') as number[];
    const variance = this.calculateVariance(performanceValues);
    confidence -= variance * 0.2;

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private generateSkillTags(request: SkillAssessmentRequest): string[] {
    const tags = [
      request.category,
      request.subcategory,
      request.domain,
      request.context.taskType
    ];

    // Add performance-based tags
    if (request.performance.accuracy > 0.8) tags.push('high-accuracy');
    if (request.performance.efficiency > 0.8) tags.push('efficient');
    if (request.performance.quality > 0.8) tags.push('high-quality');

    return tags.filter(Boolean);
  }

  private determineSkillLevel(category: string, subcategory: string): number {
    // Simple hierarchy: category=1, subcategory=2
    return subcategory ? 2 : 1;
  }

  private determineParentSkill(category: string, subcategory: string): string {
    return subcategory ? category : '';
  }

  private determinePrerequisites(skillId: string): string[] {
    // Simplified prerequisite mapping
    const prerequisites: Record<string, string[]> = {
      'advanced_programming': ['basic_programming', 'data_structures'],
      'machine_learning': ['statistics', 'programming', 'mathematics'],
      'project_management': ['communication', 'planning', 'leadership']
    };
    return prerequisites[skillId] || [];
  }

  private findRelatedSkills(skillId: string, category: string): string[] {
    // Simplified related skills mapping
    const relatedSkills: Record<string, string[]> = {
      'programming': ['debugging', 'testing', 'code_review'],
      'communication': ['presentation', 'writing', 'listening'],
      'analysis': ['critical_thinking', 'problem_solving', 'research']
    };
    return relatedSkills[category] || [];
  }

  private assessDifficulty(complexity: number): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    if (complexity < 0.3) return 'beginner';
    if (complexity < 0.6) return 'intermediate';
    if (complexity < 0.8) return 'advanced';
    return 'expert';
  }

  private assessLearningCurve(skillId: string): 'gentle' | 'moderate' | 'steep' | 'exponential' {
    // Simplified mapping based on skill complexity
    const complexSkills = ['machine_learning', 'advanced_programming', 'system_design'];
    if (complexSkills.includes(skillId)) return 'steep';
    return 'moderate';
  }

  private assessPracticeRequirement(skillId: string): 'minimal' | 'regular' | 'intensive' | 'continuous' {
    const practiceIntensive = ['programming', 'communication', 'problem_solving'];
    if (practiceIntensive.includes(skillId)) return 'regular';
    return 'minimal';
  }

  private assessTransferability(domain: string): number {
    // Higher transferability for general skills
    const transferabilityMap: Record<string, number> = {
      'general': 0.9,
      'communication': 0.8,
      'analytical': 0.7,
      'technical': 0.5,
      'domain_specific': 0.3
    };
    return transferabilityMap[domain] || 0.6;
  }

  private assessMarketDemand(skillId: string): number {
    // Simplified market demand assessment
    const highDemandSkills = ['programming', 'data_analysis', 'communication', 'problem_solving'];
    return highDemandSkills.includes(skillId) ? 0.8 : 0.6;
  }

  private assessFutureRelevance(skillId: string): number {
    // Simplified future relevance assessment
    const futureRelevantSkills = ['ai_literacy', 'data_analysis', 'critical_thinking', 'creativity'];
    return futureRelevantSkills.includes(skillId) ? 0.9 : 0.7;
  }

  private inferLearningStyle(performance: any): 'visual' | 'auditory' | 'kinesthetic' | 'reading' | 'mixed' {
    // Simplified inference based on performance patterns
    if (performance.creativity > 0.7) return 'visual';
    if (performance.collaboration > 0.7) return 'auditory';
    return 'mixed';
  }

  private inferPreferredPace(duration: number): 'slow' | 'moderate' | 'fast' | 'adaptive' {
    // Infer pace preference from task duration
    if (duration > 120) return 'slow';
    if (duration > 60) return 'moderate';
    return 'fast';
  }

  private calculateLearningRate(proficiency: number): number {
    // Higher initial proficiency suggests faster learning
    return Math.min(0.1, proficiency * 0.15);
  }

  private identifyMotivationFactors(outcome: string): string[] {
    const factors = ['achievement', 'learning', 'recognition'];
    if (outcome === 'successful') factors.push('success_driven');
    return factors;
  }

  private identifyLearningPatterns(performance: any): string[] {
    const patterns = [];
    if (performance.accuracy > performance.efficiency) patterns.push('accuracy_focused');
    if (performance.efficiency > performance.quality) patterns.push('speed_focused');
    if (performance.quality > 0.8) patterns.push('quality_focused');
    return patterns;
  }

  private identifyImprovementAreas(performance: any): string[] {
    const areas = [];
    if (performance.accuracy < 0.7) areas.push('accuracy');
    if (performance.efficiency < 0.7) areas.push('efficiency');
    if (performance.quality < 0.7) areas.push('quality');
    return areas;
  }

  private identifyCommonChallenges(performance: any): string[] {
    const challenges = [];
    if (performance.accuracy < 0.6) challenges.push('precision_issues');
    if (performance.efficiency < 0.6) challenges.push('time_management');
    if (performance.quality < 0.6) challenges.push('quality_control');
    return challenges;
  }

  private identifySuccessFactors(performance: any, environment: any): string[] {
    const factors = [];
    if (performance.accuracy > 0.8) factors.push('attention_to_detail');
    if (performance.efficiency > 0.8) factors.push('time_management');
    if (environment.support === 'extensive') factors.push('collaborative_environment');
    return factors;
  }

  private calculateAdaptabilityScore(environment: any): number {
    let score = 0.5;
    if (environment.pressure === 'high') score += 0.2;
    if (environment.resources === 'limited') score += 0.2;
    if (environment.timeConstraints === 'tight') score += 0.1;
    return Math.min(1.0, score);
  }

  private generateInitialRecommendations(request: SkillAssessmentRequest, proficiency: any): string[] {
    const recommendations = [];

    if (proficiency.overall < 0.6) {
      recommendations.push('Focus on fundamental skill development');
    }

    if (request.performance.accuracy < 0.7) {
      recommendations.push('Practice accuracy-focused exercises');
    }

    if (request.performance.efficiency < 0.7) {
      recommendations.push('Work on time management and efficiency');
    }

    return recommendations;
  }

  private getEnvironmentMultiplier(environment: any): number {
    let multiplier = 1.0;

    // Adjust for pressure
    if (environment.pressure === 'high') multiplier += 0.1;
    else if (environment.pressure === 'low') multiplier -= 0.1;

    // Adjust for support
    if (environment.support === 'extensive') multiplier += 0.1;
    else if (environment.support === 'minimal') multiplier -= 0.1;

    // Adjust for resources
    if (environment.resources === 'abundant') multiplier += 0.05;
    else if (environment.resources === 'limited') multiplier -= 0.1;

    return Math.max(0.5, Math.min(1.5, multiplier));
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return variance;
  }

  private determinePriority(skillName: string, gapAnalysis: any[]): 'critical' | 'high' | 'medium' | 'low' {
    const gap = gapAnalysis.find(g => g.area === skillName);
    if (!gap) return 'medium';

    if (gap.importance > 0.8) return 'critical';
    if (gap.importance > 0.6) return 'high';
    if (gap.importance > 0.4) return 'medium';
    return 'low';
  }

  private estimateTimeToTarget(current: number, target: number): number {
    const gap = target - current;
    // Estimate 10 hours per 0.1 proficiency improvement
    return Math.max(5, gap * 100);
  }

  private generateLearningPath(skillName: string, current: number, target: number): any[] {
    const gap = target - current;
    const steps = Math.ceil(gap / 0.1); // Break into 0.1 increments

    return Array.from({ length: steps }, (_, i) => ({
      step: i + 1,
      activity: `${skillName} practice session ${i + 1}`,
      duration: 10, // hours
      resources: [`${skillName} learning materials`, 'Practice exercises'],
      milestones: [`Achieve ${(current + (i + 1) * 0.1).toFixed(1)} proficiency`]
    }));
  }

  private generateTimeline(targetSkillPlans: any[]): any {
    const startDate = new Date();
    const totalHours = targetSkillPlans.reduce((sum, plan) => sum + plan.estimatedTimeToTarget, 0);
    const estimatedCompletionDate = new Date(startDate.getTime() + totalHours * 60 * 60 * 1000);

    const milestones = targetSkillPlans.map((plan, index) => ({
      date: new Date(startDate.getTime() + (index + 1) * (totalHours / targetSkillPlans.length) * 60 * 60 * 1000),
      description: `Complete ${plan.skillName} development`,
      skillsToAssess: [plan.skillName]
    }));

    return {
      startDate,
      estimatedCompletionDate,
      milestones
    };
  }

  private generateLearningRecommendations(currentSkills: any[], gapAnalysis: any[]): any {
    return {
      learningStyle: 'mixed', // Could be inferred from current skills
      practiceFrequency: 'weekly',
      focusAreas: gapAnalysis.slice(0, 3).map(gap => gap.area),
      potentialChallenges: ['Time management', 'Consistency', 'Motivation'],
      successStrategies: ['Regular practice', 'Incremental progress', 'Feedback loops']
    };
  }

  private calculateOverallMatch(skillMatches: any[], requiredSkills: any[]): number {
    const weightedSum = skillMatches.reduce((sum, match, index) => {
      const weight = requiredSkills[index].importance;
      const matchScore = Math.max(0, 1 - match.gap);
      return sum + (matchScore * weight);
    }, 0);

    const totalWeight = requiredSkills.reduce((sum, skill) => sum + skill.importance, 0);
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private identifyStrengths(skillMatches: any[]): string[] {
    return skillMatches
      .filter(match => match.gap <= 0)
      .map(match => match.skillName);
  }

  private identifyGaps(skillMatches: any[]): string[] {
    return skillMatches
      .filter(match => match.gap > 0.1)
      .map(match => `${match.skillName} (gap: ${match.gap.toFixed(2)})`);
  }

  private generateMatchingRecommendations(skillMatches: any[], request: any): string[] {
    const recommendations = [];

    const significantGaps = skillMatches.filter(match => match.gap > 0.2);
    if (significantGaps.length > 0) {
      recommendations.push(`Address skill gaps in: ${significantGaps.map(g => g.skillName).join(', ')}`);
    }

    const lowConfidence = skillMatches.filter(match => match.confidence < 0.6);
    if (lowConfidence.length > 0) {
      recommendations.push(`Gain more experience in: ${lowConfidence.map(g => g.skillName).join(', ')}`);
    }

    return recommendations;
  }

  private assessMatchingRisk(skillMatches: any[], request: any): any {
    const criticalGaps = skillMatches.filter(match => match.gap > 0.3).length;
    const lowConfidence = skillMatches.filter(match => match.confidence < 0.5).length;

    let overallRisk = 0;
    const riskFactors = [];

    if (criticalGaps > 0) {
      overallRisk += criticalGaps * 0.3;
      riskFactors.push(`${criticalGaps} critical skill gaps`);
    }

    if (lowConfidence > 0) {
      overallRisk += lowConfidence * 0.2;
      riskFactors.push(`${lowConfidence} skills with low confidence`);
    }

    const mitigationStrategies = [];
    if (criticalGaps > 0) mitigationStrategies.push('Intensive skill development program');
    if (lowConfidence > 0) mitigationStrategies.push('Supervised practice and mentoring');

    return {
      overallRisk: Math.min(1.0, overallRisk),
      riskFactors,
      mitigationStrategies
    };
  }

  private transformProficiencyDistribution(proficiencyLevels: any[]): any {
    const distribution = {
      beginner: 0,
      intermediate: 0,
      advanced: 0,
      expert: 0
    };

    proficiencyLevels.forEach(level => {
      if (level.level.toLowerCase().includes('beginner')) {
        distribution.beginner = level.count;
      } else if (level.level.toLowerCase().includes('intermediate')) {
        distribution.intermediate = level.count;
      } else if (level.level.toLowerCase().includes('advanced')) {
        distribution.advanced = level.count;
      } else if (level.level.toLowerCase().includes('expert')) {
        distribution.expert = level.count;
      }
    });

    return distribution;
  }

  private async calculateLearningMetrics(agentId: string): Promise<any> {
    const skills = await this.skillCapabilityCollection.getAgentSkills(agentId);

    const totalPracticeHours = skills.reduce((sum, skill) =>
      sum + (skill.learning.progress.totalPracticeTime || 0), 0
    );

    const skillsInDevelopment = skills.filter(skill =>
      skill.learning.progress.currentStreak > 0
    ).length;

    const completedSkills = skills.filter(skill =>
      skill.proficiency.current >= 0.8
    ).length;

    const averageSessionDuration = totalPracticeHours > 0 ?
      totalPracticeHours / Math.max(1, skills.length) : 0;

    return {
      averageLearningRate: 0.1, // Simplified
      skillsInDevelopment,
      completedSkills,
      totalPracticeHours,
      averageSessionDuration
    };
  }

  private async calculatePerformanceMetrics(agentId: string): Promise<any> {
    const skills = await this.skillCapabilityCollection.getAgentSkills(agentId);

    if (skills.length === 0) {
      return {
        averageAccuracy: 0,
        averageEfficiency: 0,
        averageQuality: 0,
        improvementTrend: 0,
        consistencyScore: 0
      };
    }

    const averageAccuracy = skills.reduce((sum, skill) =>
      sum + (skill.proficiency.breakdown.technical || 0), 0
    ) / skills.length;

    const averageEfficiency = skills.reduce((sum, skill) =>
      sum + (skill.proficiency.breakdown.practical || 0), 0
    ) / skills.length;

    const averageQuality = skills.reduce((sum, skill) =>
      sum + (skill.proficiency.breakdown.theoretical || 0), 0
    ) / skills.length;

    return {
      averageAccuracy,
      averageEfficiency,
      averageQuality,
      improvementTrend: 0.05, // Simplified
      consistencyScore: 0.8 // Simplified
    };
  }
}
