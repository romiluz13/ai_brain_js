/**
 * @file HumanFeedbackCollection - MongoDB collection for human feedback and approval tracking
 * 
 * This collection manages human feedback records, approval workflows, and learning
 * analytics using MongoDB's advanced indexing and change stream capabilities.
 */

import { Db, Collection, ObjectId, CreateIndexesOptions } from 'mongodb';

export interface FeedbackRecord {
  _id?: ObjectId;
  feedbackId: ObjectId;
  agentId: string;
  sessionId?: string;
  type: 'approval' | 'feedback' | 'correction' | 'validation' | 'learning';
  
  // Approval specific data
  approval?: {
    requestId: ObjectId;
    action: {
      type: 'decision' | 'execution' | 'response' | 'workflow' | 'critical_operation';
      description: string;
      parameters: Record<string, any>;
      context: string;
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
    };
    confidence: {
      aiConfidence: number;
      uncertaintyAreas: string[];
      riskFactors: string[];
      alternativeOptions: any[];
    };
    result: {
      status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'timeout' | 'auto_approved';
      approved: boolean;
      approver: string;
      approvalTime: Date;
      reasoning: string;
      conditions?: string[];
      modifications?: Record<string, any>;
    };
    workflow: {
      escalationCount: number;
      timeToDecision: number;
      approversInvolved: string[];
      consensusLevel?: number;
    };
  };

  // Feedback specific data
  feedback?: {
    interactionId: ObjectId;
    originalResponse: string;
    expectedResponse?: string;
    feedbackContent: string;
    rating: number; // 1-5 scale
    categories: string[];
    specificity: 'general' | 'specific' | 'detailed';
    improvements: string[];
    learningPoints: string[];
  };

  // Human expert information
  human: {
    expertId: string;
    expertiseLevel: 'novice' | 'intermediate' | 'expert' | 'domain_expert';
    expertiseAreas: string[];
    confidence: number;
    timeSpent: number;
    role?: string;
  };

  // Context information
  context: {
    taskType: string;
    domain: string;
    complexity: number;
    source: string;
    framework: string;
    workflowId?: ObjectId;
    parentInteractionId?: ObjectId;
  };

  // Learning and improvement tracking
  learning: {
    patterns: Array<{
      pattern: string;
      frequency: number;
      confidence: number;
      applicability: string[];
    }>;
    improvements: Array<{
      area: string;
      suggestion: string;
      priority: number;
      implementation: string;
      status: 'pending' | 'implemented' | 'rejected';
    }>;
    calibration: {
      confidenceAdjustment: number;
      biasCorrection: number;
      uncertaintyReduction: number;
    };
    validation: {
      crossValidated: boolean;
      consensusLevel: number;
      expertiseWeight: number;
      reliabilityScore: number;
    };
  };

  // Quality and impact metrics
  quality: {
    feedbackQuality: number;
    actionableInsights: number;
    implementationSuccess: number;
    longTermImpact: number;
  };

  // Status and tracking
  status: 'active' | 'processed' | 'implemented' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  implementedAt?: Date;
}

export interface ExpertiseProfile {
  _id?: ObjectId;
  expertId: string;
  profile: {
    name: string;
    role: string;
    department?: string;
    expertiseAreas: Array<{
      domain: string;
      level: 'novice' | 'intermediate' | 'expert' | 'domain_expert';
      yearsExperience: number;
      certifications: string[];
      specializations: string[];
    }>;
    preferences: {
      communicationStyle: string;
      feedbackFrequency: string;
      approvalThresholds: Record<string, number>;
      notificationMethods: string[];
    };
  };
  performance: {
    approvalAccuracy: number;
    feedbackQuality: number;
    responseTime: number;
    consensusRate: number;
    learningContribution: number;
    totalApprovals: number;
    totalFeedback: number;
  };
  availability: {
    schedule: Record<string, any>;
    currentLoad: number;
    maxConcurrentApprovals: number;
    escalationPreferences: string[];
    timeZone: string;
    workingHours: {
      start: string;
      end: string;
      days: string[];
    };
  };
  createdAt: Date;
  updatedAt: Date;
  lastActive: Date;
}

export class HumanFeedbackCollection {
  private feedbackCollection: Collection<FeedbackRecord>;
  private expertiseCollection: Collection<ExpertiseProfile>;

  constructor(private db: Db) {
    this.feedbackCollection = db.collection<FeedbackRecord>('human_feedback');
    this.expertiseCollection = db.collection<ExpertiseProfile>('expertise_profiles');
  }

  /**
   * Create indexes for optimal query performance
   */
  async createIndexes(): Promise<void> {
    // Feedback collection indexes
    const feedbackIndexes = [
      // Primary queries
      { key: { agentId: 1, timestamp: -1 } },
      { key: { feedbackId: 1 }, options: { unique: true } },
      { key: { type: 1, timestamp: -1 } },
      { key: { status: 1, timestamp: -1 } },
      
      // Approval specific indexes
      { key: { 'approval.requestId': 1 } },
      { key: { 'approval.result.status': 1, timestamp: -1 } },
      { key: { 'approval.result.approver': 1, timestamp: -1 } },
      { key: { 'approval.action.riskLevel': 1, timestamp: -1 } },
      
      // Feedback specific indexes
      { key: { 'feedback.interactionId': 1 } },
      { key: { 'feedback.rating': 1, timestamp: -1 } },
      { key: { 'feedback.categories': 1 } },
      
      // Human expert indexes
      { key: { 'human.expertId': 1, timestamp: -1 } },
      { key: { 'human.expertiseLevel': 1, timestamp: -1 } },
      { key: { 'human.expertiseAreas': 1 } },
      
      // Context indexes
      { key: { 'context.taskType': 1, timestamp: -1 } },
      { key: { 'context.domain': 1, timestamp: -1 } },
      { key: { 'context.framework': 1, timestamp: -1 } },
      
      // Learning indexes
      { key: { 'learning.patterns.pattern': 1 } },
      { key: { 'learning.improvements.area': 1 } },
      { key: { 'learning.validation.reliabilityScore': 1, timestamp: -1 } },
      
      // Quality indexes
      { key: { 'quality.feedbackQuality': 1, timestamp: -1 } },
      { key: { 'quality.implementationSuccess': 1, timestamp: -1 } },
      
      // Compound indexes for complex queries
      { key: { agentId: 1, type: 1, timestamp: -1 } },
      { key: { 'human.expertId': 1, type: 1, timestamp: -1 } },
      { key: { status: 1, priority: 1, timestamp: -1 } },
      { key: { 'context.domain': 1, 'human.expertiseLevel': 1, timestamp: -1 } },
      
      // TTL index for automatic cleanup
      { 
        key: { createdAt: 1 }, 
        options: { 
          expireAfterSeconds: 60 * 60 * 24 * 365, // 1 year
          name: 'feedback_ttl'
        } as CreateIndexesOptions
      }
    ];

    // Expertise collection indexes
    const expertiseIndexes = [
      // Primary queries
      { key: { expertId: 1 }, options: { unique: true } },
      { key: { 'profile.expertiseAreas.domain': 1 } },
      { key: { 'profile.expertiseAreas.level': 1 } },
      
      // Performance indexes
      { key: { 'performance.approvalAccuracy': 1 } },
      { key: { 'performance.feedbackQuality': 1 } },
      { key: { 'performance.responseTime': 1 } },
      
      // Availability indexes
      { key: { 'availability.currentLoad': 1 } },
      { key: { 'availability.maxConcurrentApprovals': 1 } },
      { key: { lastActive: -1 } },
      
      // Compound indexes
      { key: { 'profile.expertiseAreas.domain': 1, 'performance.approvalAccuracy': -1 } },
      { key: { 'availability.currentLoad': 1, 'performance.responseTime': 1 } }
    ];

    // Create feedback collection indexes
    for (const index of feedbackIndexes) {
      try {
        await this.feedbackCollection.createIndex(index.key, index.options);
      } catch (error) {
        console.warn(`Warning: Could not create feedback index ${JSON.stringify(index.key)}:`, error);
      }
    }

    // Create expertise collection indexes
    for (const index of expertiseIndexes) {
      try {
        await this.expertiseCollection.createIndex(index.key, index.options);
      } catch (error) {
        console.warn(`Warning: Could not create expertise index ${JSON.stringify(index.key)}:`, error);
      }
    }
  }

  /**
   * Store feedback record
   */
  async storeFeedback(feedback: Omit<FeedbackRecord, '_id' | 'createdAt' | 'updatedAt'>): Promise<ObjectId> {
    const now = new Date();
    const document: FeedbackRecord = {
      ...feedback,
      createdAt: now,
      updatedAt: now
    };

    const result = await this.feedbackCollection.insertOne(document);
    return result.insertedId;
  }

  /**
   * Get feedback record by ID
   */
  async getFeedback(feedbackId: ObjectId): Promise<FeedbackRecord | null> {
    return await this.feedbackCollection.findOne({ feedbackId });
  }

  /**
   * Store or update expertise profile
   */
  async storeExpertiseProfile(profile: Omit<ExpertiseProfile, '_id' | 'createdAt' | 'updatedAt'>): Promise<ObjectId> {
    const now = new Date();
    
    const existingProfile = await this.expertiseCollection.findOne({ expertId: profile.expertId });
    
    if (existingProfile) {
      await this.expertiseCollection.updateOne(
        { expertId: profile.expertId },
        { 
          $set: { 
            ...profile, 
            updatedAt: now 
          } 
        }
      );
      return existingProfile._id!;
    } else {
      const document: ExpertiseProfile = {
        ...profile,
        createdAt: now,
        updatedAt: now
      };
      
      const result = await this.expertiseCollection.insertOne(document);
      return result.insertedId;
    }
  }

  /**
   * Get expertise profile by expert ID
   */
  async getExpertiseProfile(expertId: string): Promise<ExpertiseProfile | null> {
    return await this.expertiseCollection.findOne({ expertId });
  }

  /**
   * Get feedback records for an agent
   */
  async getAgentFeedback(
    agentId: string,
    options: {
      type?: 'approval' | 'feedback' | 'correction' | 'validation' | 'learning';
      status?: 'active' | 'processed' | 'implemented' | 'archived';
      expertId?: string;
      limit?: number;
      skip?: number;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<FeedbackRecord[]> {
    const filter: any = { agentId };
    
    if (options.type) filter.type = options.type;
    if (options.status) filter.status = options.status;
    if (options.expertId) filter['human.expertId'] = options.expertId;
    if (options.startDate || options.endDate) {
      filter.timestamp = {};
      if (options.startDate) filter.timestamp.$gte = options.startDate;
      if (options.endDate) filter.timestamp.$lte = options.endDate;
    }

    return await this.feedbackCollection
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(options.limit || 100)
      .skip(options.skip || 0)
      .toArray();
  }

  /**
   * Get pending approvals
   */
  async getPendingApprovals(expertId?: string): Promise<FeedbackRecord[]> {
    const filter: any = {
      type: 'approval',
      'approval.result.status': 'pending'
    };

    if (expertId) {
      filter['human.expertId'] = expertId;
    }

    return await this.feedbackCollection
      .find(filter)
      .sort({ 'approval.action.riskLevel': -1, timestamp: 1 }) // High risk first, oldest first
      .toArray();
  }

  /**
   * Update feedback status
   */
  async updateFeedbackStatus(
    feedbackId: ObjectId,
    updates: {
      status?: 'active' | 'processed' | 'implemented' | 'archived';
      processedAt?: Date;
      implementedAt?: Date;
      learning?: any;
      quality?: any;
    }
  ): Promise<void> {
    const updateDoc: any = {
      updatedAt: new Date()
    };

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        updateDoc[key] = updates[key];
      }
    });

    await this.feedbackCollection.updateOne(
      { feedbackId },
      { $set: updateDoc }
    );
  }

  /**
   * Update expert performance metrics
   */
  async updateExpertPerformance(
    expertId: string,
    metrics: {
      approvalAccuracy?: number;
      feedbackQuality?: number;
      responseTime?: number;
      consensusRate?: number;
      learningContribution?: number;
      totalApprovals?: number;
      totalFeedback?: number;
    }
  ): Promise<void> {
    const updateDoc: any = {
      updatedAt: new Date(),
      lastActive: new Date()
    };

    Object.keys(metrics).forEach(key => {
      if (metrics[key] !== undefined) {
        updateDoc[`performance.${key}`] = metrics[key];
      }
    });

    await this.expertiseCollection.updateOne(
      { expertId },
      { $set: updateDoc }
    );
  }

  /**
   * Get feedback analytics
   */
  async getFeedbackAnalytics(
    agentId?: string,
    timeframeDays: number = 30
  ): Promise<{
    totalFeedback: number;
    feedbackByType: Record<string, number>;
    avgQuality: number;
    avgResponseTime: number;
    implementationRate: number;
    topExperts: Array<{ expertId: string; feedbackCount: number; avgQuality: number }>;
    improvementAreas: Array<{ area: string; frequency: number; avgPriority: number }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeDays);

    const matchStage: any = { timestamp: { $gte: startDate } };
    if (agentId) matchStage.agentId = agentId;

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalFeedback: { $sum: 1 },
          feedbackTypes: { $push: '$type' },
          avgQuality: { $avg: '$quality.feedbackQuality' },
          avgResponseTime: { $avg: '$human.timeSpent' },
          implementedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'implemented'] }, 1, 0] }
          },
          experts: { $push: { expertId: '$human.expertId', quality: '$quality.feedbackQuality' } },
          improvements: { $push: '$learning.improvements' }
        }
      }
    ];

    const result = await this.feedbackCollection.aggregate(pipeline).toArray();
    
    if (result.length === 0) {
      return {
        totalFeedback: 0,
        feedbackByType: {},
        avgQuality: 0,
        avgResponseTime: 0,
        implementationRate: 0,
        topExperts: [],
        improvementAreas: []
      };
    }

    const data = result[0];

    // Process feedback by type
    const feedbackByType: Record<string, number> = {};
    data.feedbackTypes.forEach((type: string) => {
      feedbackByType[type] = (feedbackByType[type] || 0) + 1;
    });

    // Process top experts
    const expertStats: Record<string, { count: number; totalQuality: number }> = {};
    data.experts.forEach((expert: any) => {
      if (!expertStats[expert.expertId]) {
        expertStats[expert.expertId] = { count: 0, totalQuality: 0 };
      }
      expertStats[expert.expertId].count++;
      expertStats[expert.expertId].totalQuality += expert.quality || 0;
    });

    const topExperts = Object.entries(expertStats)
      .map(([expertId, stats]) => ({
        expertId,
        feedbackCount: stats.count,
        avgQuality: stats.totalQuality / stats.count
      }))
      .sort((a, b) => b.feedbackCount - a.feedbackCount)
      .slice(0, 10);

    // Process improvement areas
    const improvementStats: Record<string, { count: number; totalPriority: number }> = {};
    data.improvements.flat().forEach((improvement: any) => {
      if (!improvementStats[improvement.area]) {
        improvementStats[improvement.area] = { count: 0, totalPriority: 0 };
      }
      improvementStats[improvement.area].count++;
      improvementStats[improvement.area].totalPriority += improvement.priority || 0;
    });

    const improvementAreas = Object.entries(improvementStats)
      .map(([area, stats]) => ({
        area,
        frequency: stats.count,
        avgPriority: stats.totalPriority / stats.count
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    return {
      totalFeedback: data.totalFeedback,
      feedbackByType,
      avgQuality: data.avgQuality || 0,
      avgResponseTime: data.avgResponseTime || 0,
      implementationRate: data.totalFeedback > 0 ? data.implementedCount / data.totalFeedback : 0,
      topExperts,
      improvementAreas
    };
  }

  /**
   * Find available experts by expertise
   */
  async findAvailableExperts(
    requiredExpertise: string[],
    maxLoad?: number
  ): Promise<ExpertiseProfile[]> {
    const filter: any = {
      'profile.expertiseAreas.domain': { $in: requiredExpertise }
    };

    if (maxLoad !== undefined) {
      filter['availability.currentLoad'] = { $lte: maxLoad };
    }

    return await this.expertiseCollection
      .find(filter)
      .sort({ 'performance.approvalAccuracy': -1, 'performance.responseTime': 1 })
      .toArray();
  }

  /**
   * Clean up old feedback records
   */
  async cleanupOldFeedback(daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.feedbackCollection.deleteMany({
      createdAt: { $lt: cutoffDate },
      status: { $in: ['processed', 'implemented', 'archived'] }
    });

    return result.deletedCount;
  }
}
