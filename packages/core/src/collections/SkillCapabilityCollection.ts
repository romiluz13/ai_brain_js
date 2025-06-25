/**
 * @file SkillCapabilityCollection - MongoDB collection for skill and capability management
 * 
 * This collection demonstrates MongoDB's complex indexing and metadata management
 * capabilities for skill tracking, proficiency analysis, and capability matching.
 * Showcases MongoDB's advanced indexing features for multi-dimensional skill data.
 * 
 * Features:
 * - Complex multi-field indexing for skill queries
 * - Metadata management for skill taxonomies
 * - Proficiency tracking with statistical analysis
 * - Capability matching and recommendation algorithms
 * - Learning analytics and skill development tracking
 */

import { Db, ObjectId } from 'mongodb';
import { BaseCollection, BaseDocument } from './BaseCollection';

export interface SkillCapability extends BaseDocument {
  agentId: string;
  sessionId?: string;
  timestamp: Date;
  
  // Skill identification and taxonomy
  skill: {
    id: string;
    name: string;
    category: string; // e.g., 'technical', 'communication', 'analytical', 'creative'
    subcategory: string; // e.g., 'programming', 'data_analysis', 'writing'
    domain: string; // e.g., 'software_engineering', 'customer_service', 'marketing'
    tags: string[]; // Flexible tagging system
    
    // Skill hierarchy and relationships
    hierarchy: {
      level: number; // 0=root, 1=category, 2=subcategory, etc.
      parent: string; // Parent skill ID
      children: string[]; // Child skill IDs
      prerequisites: string[]; // Required prerequisite skills
      related: string[]; // Related/complementary skills
    };
    
    // Skill metadata
    metadata: {
      difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
      learningCurve: 'gentle' | 'moderate' | 'steep' | 'exponential';
      practiceRequired: 'minimal' | 'regular' | 'intensive' | 'continuous';
      transferability: number; // 0-1 how transferable to other domains
      marketDemand: number; // 0-1 current market demand
      futureRelevance: number; // 0-1 predicted future relevance
    };
  };
  
  // Proficiency assessment
  proficiency: {
    current: number; // 0-1 current proficiency level
    confidence: number; // 0-1 confidence in assessment
    lastAssessed: Date;
    assessmentHistory: Array<{
      date: Date;
      proficiency: number;
      context: string;
      evidence?: string;
    }>;
    breakdown: {
      technical: number;
      practical: number;
      theoretical: number;
      creative: number;
      collaborative: number;
    };
    calibration: {
      selfAssessment: number;
      externalAssessment: number;
      calibrationError: number;
      overconfidenceIndex: number;
    };
  };
  
  // Learning and development
  learning: {
    // Learning progress
    progress: {
      startDate: Date;
      milestones: Array<{
        date: Date;
        proficiency: number;
        description: string;
        evidence?: string;
      }>;
      currentStreak: number; // days of continuous learning
      totalPracticeTime: number; // hours of practice
      sessionsCompleted: number;
    };
    
    // Learning preferences and patterns
    preferences: {
      learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading' | 'mixed';
      preferredPace: 'slow' | 'moderate' | 'fast' | 'adaptive';
      practiceFrequency: 'daily' | 'weekly' | 'monthly' | 'irregular';
      feedbackPreference: 'immediate' | 'periodic' | 'milestone' | 'minimal';
    };
    
    // Learning resources and recommendations
    resources: {
      completed: Array<{
        type: 'course' | 'book' | 'tutorial' | 'project' | 'mentorship';
        title: string;
        provider: string;
        completionDate: Date;
        rating: number; // 1-5 effectiveness rating
        timeInvested: number; // hours
      }>;
      
      recommended: Array<{
        type: string;
        title: string;
        provider: string;
        estimatedTime: number; // hours
        difficulty: string;
        relevanceScore: number; // 0-1
        priority: 'high' | 'medium' | 'low';
      }>;
      
      inProgress: Array<{
        type: string;
        title: string;
        provider: string;
        startDate: Date;
        progress: number; // 0-1 completion percentage
        estimatedCompletion: Date;
      }>;
    };
  };
  
  // Application and usage
  application: {
    // Recent usage
    recentUsage: Array<{
      date: Date;
      context: string; // Where/how skill was used
      duration: number; // minutes
      complexity: number; // 0-1 complexity of application
      outcome: 'successful' | 'partially_successful' | 'unsuccessful';
      feedback?: string;
      improvementAreas?: string[];
    }>;
    
    // Usage patterns
    patterns: {
      frequency: number; // uses per week
      contexts: string[]; // Common usage contexts
      peakPerformanceTimes: string[]; // When skill is used best
      commonChallenges: string[]; // Frequent challenges encountered
      successFactors: string[]; // Factors that lead to success
    };
    
    // Performance metrics
    performance: {
      averageQuality: number; // 0-1 average output quality
      consistencyScore: number; // 0-1 consistency across applications
      improvementRate: number; // rate of improvement over time
      errorRate: number; // 0-1 frequency of errors
      speedMetrics: {
        averageTime: number; // average time to complete tasks
        bestTime: number; // best recorded time
        timeImprovement: number; // improvement rate in speed
      };
    };
  };
  
  // Capability matching and recommendations
  matching: {
    // Skill combinations and synergies
    synergies: Array<{
      skillId: string;
      skillName: string;
      synergyStrength: number; // 0-1 how well skills work together
      combinedProficiency: number; // 0-1 effective proficiency when combined
      useCases: string[]; // Common use cases for combination
    }>;
    
    // Gap analysis
    gaps: Array<{
      skillId: string;
      skillName: string;
      importance: number; // 0-1 importance for role/goals
      currentGap: number; // 0-1 size of proficiency gap
      learningEffort: number; // 0-1 estimated effort to close gap
      priority: 'critical' | 'high' | 'medium' | 'low';
    }>;
    
    // Role and opportunity matching
    roleMatching: Array<{
      roleTitle: string;
      matchScore: number; // 0-1 how well skills match role
      missingSkills: string[];
      strengthAreas: string[];
      developmentNeeded: string[];
    }>;
  };
  
  // Analytics and insights
  analytics: {
    // Skill development trends
    trends: {
      proficiencyTrend: number; // -1 to 1 trend in proficiency
      usageTrend: number; // -1 to 1 trend in usage frequency
      qualityTrend: number; // -1 to 1 trend in output quality
      learningVelocity: number; // rate of skill acquisition
    };
    
    // Comparative analysis
    benchmarks: {
      peerComparison: number; // -1 to 1 compared to peers
      industryStandard: number; // -1 to 1 compared to industry
      roleRequirement: number; // -1 to 1 compared to role needs
      personalGoals: number; // -1 to 1 compared to personal targets
    };
    
    // Predictions and recommendations
    predictions: {
      futureRelevance: number; // 0-1 predicted future relevance
      marketValue: number; // 0-1 predicted market value
      developmentPotential: number; // 0-1 potential for improvement
      timeToMastery: number; // estimated months to reach mastery
    };
    
    insights: string[]; // AI-generated insights about skill development
    recommendations: string[]; // Actionable recommendations
  };
  
  // Metadata and tracking
  metadata: {
    framework: string;
    version: string;
    dataSource: 'self_report' | 'assessment' | 'observation' | 'metrics' | 'mixed';
    reliability: number; // 0-1 reliability of data
    lastUpdated: Date;
    updateFrequency: 'real_time' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
    
    // Quality indicators
    quality: {
      completeness: number; // 0-1 how complete the data is
      accuracy: number; // 0-1 estimated accuracy
      freshness: number; // 0-1 how recent the data is
      consistency: number; // 0-1 consistency across sources
    };
  };
}

export interface SkillFilter {
  agentId?: string;
  'skill.category'?: string;
  'skill.domain'?: string;
  'skill.tags'?: { $in: string[] };
  'proficiency.current'?: { $gte?: number; $lte?: number };
  'skill.metadata.difficulty'?: string;
  'learning.progress.currentStreak'?: { $gte?: number };
  timestamp?: { $gte?: Date; $lte?: Date };
}

export interface SkillAnalyticsOptions {
  timeRange?: { start: Date; end: Date };
  includeInactive?: boolean;
  groupBy?: 'category' | 'domain' | 'difficulty' | 'proficiency';
  minProficiency?: number;
  skillCategories?: string[];
}

/**
 * SkillCapabilityCollection - Manages skill and capability data with complex indexing
 * 
 * This collection demonstrates MongoDB's complex indexing capabilities:
 * - Multi-field compound indexes for skill queries
 * - Text indexes for skill search and matching
 * - Sparse indexes for optional fields
 * - Partial indexes for filtered queries
 * - Geospatial-like indexes for skill similarity
 */
export class SkillCapabilityCollection extends BaseCollection<SkillCapability> {
  protected collectionName = 'agent_capabilities';

  constructor(db: Db) {
    super(db);
    this.collection = db.collection<SkillCapability>(this.collectionName);
  }

  /**
   * Create complex indexes optimized for skill management
   */
  async createIndexes(): Promise<void> {
    try {
      // Agent and skill identification index
      await this.collection.createIndex({
        agentId: 1,
        'skill.id': 1,
        timestamp: -1
      }, {
        name: 'agent_skill_timeline',
        background: true
      });

      // Skill taxonomy and categorization index
      await this.collection.createIndex({
        'skill.category': 1,
        'skill.subcategory': 1,
        'skill.domain': 1,
        'proficiency.current': -1
      }, {
        name: 'skill_taxonomy_proficiency',
        background: true
      });

      // Text index for skill search
      await this.collection.createIndex({
        'skill.name': 'text',
        'skill.tags': 'text',
        'skill.category': 'text',
        'skill.domain': 'text'
      }, {
        name: 'skill_text_search',
        background: true,
        weights: {
          'skill.name': 10,
          'skill.tags': 5,
          'skill.category': 3,
          'skill.domain': 2
        }
      });

      // Proficiency and assessment index
      await this.collection.createIndex({
        'proficiency.current': -1,
        'proficiency.confidence': -1,
        'proficiency.validation.lastAssessed': -1
      }, {
        name: 'proficiency_assessment_index',
        background: true
      });

      // Learning progress index
      await this.collection.createIndex({
        'learning.progress.currentStreak': -1,
        'learning.progress.totalPracticeTime': -1,
        'analytics.trends.learningVelocity': -1
      }, {
        name: 'learning_progress_index',
        background: true
      });

      // Skill difficulty and metadata index
      await this.collection.createIndex({
        'skill.metadata.difficulty': 1,
        'skill.metadata.marketDemand': -1,
        'skill.metadata.futureRelevance': -1
      }, {
        name: 'skill_metadata_index',
        background: true
      });

      // Application and usage patterns index
      await this.collection.createIndex({
        'application.patterns.frequency': -1,
        'application.performance.averageQuality': -1,
        'application.performance.consistencyScore': -1
      }, {
        name: 'application_performance_index',
        background: true
      });

      // Capability matching index
      await this.collection.createIndex({
        'matching.roleMatching.matchScore': -1,
        'matching.gaps.priority': 1,
        'matching.gaps.importance': -1
      }, {
        name: 'capability_matching_index',
        background: true
      });

      // Analytics and benchmarking index
      await this.collection.createIndex({
        'analytics.benchmarks.peerComparison': -1,
        'analytics.benchmarks.industryStandard': -1,
        'analytics.predictions.futureRelevance': -1
      }, {
        name: 'analytics_benchmarks_index',
        background: true
      });

      // Sparse index for certifications (only when present)
      await this.collection.createIndex({
        'proficiency.sources.certifications': 1
      }, {
        name: 'certifications_sparse_index',
        background: true,
        sparse: true
      });

      // Partial index for high-proficiency skills
      await this.collection.createIndex({
        agentId: 1,
        'skill.category': 1,
        'proficiency.current': -1
      }, {
        name: 'high_proficiency_skills',
        background: true,
        partialFilterExpression: {
          'proficiency.current': { $gte: 0.7 }
        }
      });

      console.log('✅ SkillCapabilityCollection indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating SkillCapabilityCollection indexes:', error);
      throw error;
    }
  }

  /**
   * Record a new skill capability
   */
  async recordSkillCapability(capability: Omit<SkillCapability, '_id' | 'createdAt' | 'updatedAt'>): Promise<ObjectId> {
    const capabilityWithTimestamp = {
      ...capability,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await this.collection.insertOne(capabilityWithTimestamp);
    return result.insertedId;
  }

  /**
   * Get skill capabilities for an agent
   */
  async getAgentSkills(
    agentId: string,
    filter?: Partial<SkillFilter>
  ): Promise<SkillCapability[]> {
    const query = { agentId, ...filter };
    
    return await this.collection.find(query)
      .sort({ 'proficiency.current': -1, timestamp: -1 })
      .toArray();
  }

  /**
   * Search skills using text search
   */
  async searchSkills(
    searchQuery: string,
    agentId?: string,
    options?: {
      minProficiency?: number;
      categories?: string[];
      limit?: number;
    }
  ): Promise<SkillCapability[]> {
    const query: any = {
      $text: { $search: searchQuery }
    };

    if (agentId) {
      query.agentId = agentId;
    }

    if (options?.minProficiency) {
      query['proficiency.current'] = { $gte: options.minProficiency };
    }

    if (options?.categories) {
      query['skill.category'] = { $in: options.categories };
    }

    return await this.collection.find(query)
      .sort({ score: { $meta: 'textScore' }, 'proficiency.current': -1 })
      .limit(options?.limit || 20)
      .toArray();
  }

  /**
   * Update skill proficiency
   */
  async updateSkillProficiency(
    agentId: string,
    skillId: string,
    proficiencyUpdate: Partial<SkillCapability['proficiency']>
  ): Promise<void> {
    const updateFields: any = {};
    
    Object.keys(proficiencyUpdate).forEach(key => {
      updateFields[`proficiency.${key}`] = (proficiencyUpdate as any)[key];
    });

    updateFields.updatedAt = new Date();
    updateFields['metadata.lastUpdated'] = new Date();

    await this.collection.updateOne(
      { agentId, 'skill.id': skillId },
      { $set: updateFields }
    );
  }

  /**
   * Add learning milestone
   */
  async addLearningMilestone(
    agentId: string,
    skillId: string,
    milestone: {
      proficiency: number;
      description: string;
      evidence?: string;
    }
  ): Promise<void> {
    const milestoneWithDate = {
      ...milestone,
      date: new Date()
    };

    await this.collection.updateOne(
      { agentId, 'skill.id': skillId },
      {
        $push: {
          'learning.progress.milestones': milestoneWithDate
        },
        $set: {
          updatedAt: new Date()
        }
      }
    );
  }

  /**
   * Analyze skill portfolio using MongoDB aggregation
   */
  async analyzeSkillPortfolio(agentId: string): Promise<{
    skillDistribution: Array<{ category: string; count: number; avgProficiency: number }>;
    proficiencyLevels: Array<{ level: string; count: number; percentage: number }>;
    learningTrends: Array<{ skill: string; trend: number; velocity: number }>;
    gapAnalysis: Array<{ area: string; gap: number; priority: string }>;
    recommendations: string[];
  }> {
    // Skill distribution by category
    const skillDistribution = await this.collection.aggregate([
      { $match: { agentId } },
      {
        $group: {
          _id: '$skill.category',
          count: { $sum: 1 },
          avgProficiency: { $avg: '$proficiency.current' },
          totalPracticeTime: { $sum: '$learning.progress.totalPracticeTime' }
        }
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          avgProficiency: { $round: ['$avgProficiency', 3] },
          totalPracticeTime: 1,
          _id: 0
        }
      },
      { $sort: { avgProficiency: -1 } }
    ]).toArray();

    // Proficiency level distribution
    const proficiencyLevels = await this.collection.aggregate([
      { $match: { agentId } },
      {
        $bucket: {
          groupBy: '$proficiency.current',
          boundaries: [0, 0.3, 0.6, 0.8, 1.0],
          default: 'other',
          output: {
            count: { $sum: 1 },
            skills: { $push: '$skill.name' }
          }
        }
      },
      {
        $project: {
          level: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 0] }, then: 'Beginner (0-30%)' },
                { case: { $eq: ['$_id', 0.3] }, then: 'Intermediate (30-60%)' },
                { case: { $eq: ['$_id', 0.6] }, then: 'Advanced (60-80%)' },
                { case: { $eq: ['$_id', 0.8] }, then: 'Expert (80-100%)' }
              ],
              default: 'Other'
            }
          },
          count: 1,
          _id: 0
        }
      }
    ]).toArray();

    // Calculate percentages
    const totalSkills = proficiencyLevels.reduce((sum, level) => sum + level.count, 0);
    proficiencyLevels.forEach(level => {
      (level as any).percentage = totalSkills > 0 ? Math.round((level.count / totalSkills) * 100) : 0;
    });

    // Learning trends
    const learningTrends = await this.collection.aggregate([
      { $match: { agentId } },
      {
        $project: {
          skill: '$skill.name',
          trend: '$analytics.trends.proficiencyTrend',
          velocity: '$analytics.trends.learningVelocity'
        }
      },
      { $sort: { velocity: -1 } },
      { $limit: 10 }
    ]).toArray();

    // Gap analysis
    const gapAnalysis = await this.collection.aggregate([
      { $match: { agentId } },
      { $unwind: '$matching.gaps' },
      {
        $group: {
          _id: '$matching.gaps.skillName',
          avgGap: { $avg: '$matching.gaps.currentGap' },
          priority: { $first: '$matching.gaps.priority' },
          importance: { $avg: '$matching.gaps.importance' }
        }
      },
      {
        $project: {
          area: '$_id',
          gap: { $round: ['$avgGap', 3] },
          priority: 1,
          importance: { $round: ['$importance', 3] },
          _id: 0
        }
      },
      { $sort: { importance: -1, gap: -1 } },
      { $limit: 5 }
    ]).toArray();

    // Generate recommendations
    const recommendations = this.generateSkillRecommendations(
      skillDistribution,
      proficiencyLevels,
      learningTrends,
      gapAnalysis
    );

    return {
      skillDistribution: skillDistribution as Array<{ category: string; count: number; avgProficiency: number }>,
      proficiencyLevels: proficiencyLevels as Array<{ level: string; count: number; percentage: number }>,
      learningTrends: learningTrends as Array<{ skill: string; trend: number; velocity: number }>,
      gapAnalysis: gapAnalysis as Array<{ area: string; gap: number; priority: string }>,
      recommendations
    };
  }

  /**
   * Get skill statistics
   */
  async getSkillStats(agentId?: string): Promise<{
    totalSkills: number;
    avgProficiency: number;
    highProficiencySkills: number;
    activelyLearning: number;
    totalPracticeTime: number;
    skillsByCategory: Array<{ category: string; count: number }>;
  }> {
    const filter = agentId ? { agentId } : {};

    const stats = await this.collection.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalSkills: { $sum: 1 },
          avgProficiency: { $avg: '$proficiency.current' },
          highProficiencyCount: {
            $sum: { $cond: [{ $gte: ['$proficiency.current', 0.7] }, 1, 0] }
          },
          activelyLearningCount: {
            $sum: { $cond: [{ $gt: ['$learning.progress.currentStreak', 0] }, 1, 0] }
          },
          totalPracticeTime: { $sum: '$learning.progress.totalPracticeTime' }
        }
      }
    ]).toArray();

    const categoryStats = await this.collection.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$skill.category',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          _id: 0
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    const result = stats[0] || {
      totalSkills: 0,
      avgProficiency: 0,
      highProficiencyCount: 0,
      activelyLearningCount: 0,
      totalPracticeTime: 0
    };

    return {
      totalSkills: result.totalSkills,
      avgProficiency: result.avgProficiency || 0,
      highProficiencySkills: result.highProficiencyCount,
      activelyLearning: result.activelyLearningCount,
      totalPracticeTime: result.totalPracticeTime || 0,
      skillsByCategory: categoryStats as Array<{ category: string; count: number }>
    };
  }

  /**
   * Generate skill recommendations
   */
  private generateSkillRecommendations(
    skillDistribution: any[],
    proficiencyLevels: any[],
    learningTrends: any[],
    gapAnalysis: any[]
  ): string[] {
    const recommendations = [];

    // Check for skill distribution balance
    if (skillDistribution.length > 0) {
      const maxCategory = skillDistribution[0];
      if (maxCategory.count > skillDistribution.reduce((sum, cat) => sum + cat.count, 0) * 0.6) {
        recommendations.push(`Consider diversifying beyond ${maxCategory.category} skills`);
      }
    }

    // Check proficiency levels
    const beginnerLevel = proficiencyLevels.find(level => level.level.includes('Beginner'));
    if (beginnerLevel && beginnerLevel.percentage > 50) {
      recommendations.push('Focus on advancing beginner-level skills to intermediate');
    }

    // Check learning trends
    const slowLearners = learningTrends.filter(trend => trend.velocity < 0.1);
    if (slowLearners.length > 0) {
      recommendations.push('Consider new learning approaches for slow-progressing skills');
    }

    // Check critical gaps
    const criticalGaps = gapAnalysis.filter(gap => gap.priority === 'critical');
    if (criticalGaps.length > 0) {
      recommendations.push(`Address critical skill gaps: ${criticalGaps.map(g => g.area).join(', ')}`);
    }

    return recommendations;
  }

  /**
   * Analyze skill gaps for an agent
   */
  async analyzeSkillGaps(agentId: string): Promise<Array<{
    area: string;
    gap: number;
    importance: number;
    priority: string;
  }>> {
    // Get current skills
    const currentSkills = await this.getAgentSkills(agentId);

    // Define common skill areas and their importance
    const skillAreas = [
      { area: 'Communication', importance: 0.9 },
      { area: 'Problem Solving', importance: 0.8 },
      { area: 'Leadership', importance: 0.7 },
      { area: 'Technical Skills', importance: 0.8 },
      { area: 'Project Management', importance: 0.6 },
      { area: 'Data Analysis', importance: 0.7 },
      { area: 'Critical Thinking', importance: 0.8 },
      { area: 'Teamwork', importance: 0.7 }
    ];

    const gaps = skillAreas.map(skillArea => {
      // Find if agent has this skill
      const existingSkill = currentSkills.find(skill =>
        skill.skill.name.toLowerCase().includes(skillArea.area.toLowerCase()) ||
        skill.skill.category.toLowerCase().includes(skillArea.area.toLowerCase())
      );

      const currentProficiency = existingSkill?.proficiency.current || 0;
      const targetProficiency = 0.8; // Target 80% proficiency
      const gap = Math.max(0, targetProficiency - currentProficiency);

      let priority = 'low';
      if (gap > 0.5 && skillArea.importance > 0.7) priority = 'critical';
      else if (gap > 0.3 && skillArea.importance > 0.6) priority = 'high';
      else if (gap > 0.1) priority = 'medium';

      return {
        area: skillArea.area,
        gap,
        importance: skillArea.importance,
        priority
      };
    });

    return gaps.filter(gap => gap.gap > 0).sort((a, b) => b.importance - a.importance);
  }


}
