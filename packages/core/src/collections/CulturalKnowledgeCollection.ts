/**
 * @file CulturalKnowledgeCollection - MongoDB collection for cultural knowledge and context management
 * 
 * This collection demonstrates MongoDB's full-text search and cultural taxonomy capabilities
 * for managing cultural knowledge, norms, and context-aware behavior adaptation.
 * Showcases MongoDB's advanced text indexing and cultural data management features.
 * 
 * Features:
 * - Full-text search for cultural knowledge discovery
 * - Cultural taxonomy and hierarchical organization
 * - Context-aware cultural norm adaptation
 * - Cultural learning and pattern recognition
 * - Multi-language and regional cultural support
 */

import { Db, ObjectId } from 'mongodb';
import { BaseCollection, BaseDocument } from './BaseCollection';

export interface CulturalKnowledge extends BaseDocument {
  agentId: string;
  sessionId?: string;
  timestamp: Date;
  
  // Cultural identification and taxonomy
  culture: {
    id: string;
    name: string;
    region: string; // e.g., 'north_america', 'east_asia', 'europe'
    country: string;
    subculture?: string; // e.g., 'corporate', 'academic', 'startup'
    language: string;
    
    // Cultural hierarchy and relationships
    hierarchy: {
      level: number; // 0=global, 1=regional, 2=national, 3=local
      parent: string; // Parent culture ID
      children: string[]; // Child culture IDs
      influences: string[]; // Cultures that influence this one
      similarities: string[]; // Similar cultures
    };
    
    // Cultural metadata
    metadata: {
      formality: 'very_formal' | 'formal' | 'neutral' | 'informal' | 'very_informal';
      directness: 'very_direct' | 'direct' | 'moderate' | 'indirect' | 'very_indirect';
      hierarchy: 'flat' | 'moderate' | 'hierarchical' | 'very_hierarchical';
      collectivism: number; // 0-1 (0=individualistic, 1=collectivistic)
      uncertainty_avoidance: number; // 0-1
      power_distance: number; // 0-1
      time_orientation: 'past' | 'present' | 'future' | 'mixed';
    };
  };
  
  // Cultural norms and behaviors
  norms: {
    // Communication norms
    communication: {
      greeting_style: string;
      addressing_style: string; // formal titles, first names, etc.
      conversation_pace: 'slow' | 'moderate' | 'fast';
      silence_comfort: number; // 0-1 comfort with silence
      interruption_tolerance: number; // 0-1
      small_talk_importance: number; // 0-1
      eye_contact_norms: string;
      personal_space: number; // meters
    };
    
    // Business and professional norms
    business: {
      meeting_style: 'formal' | 'informal' | 'structured' | 'flexible';
      decision_making: 'consensus' | 'hierarchical' | 'individual' | 'collaborative';
      punctuality_importance: number; // 0-1
      relationship_building: number; // 0-1 importance before business
      gift_giving_norms: string;
      dress_code_expectations: string;
      negotiation_style: string;
    };
    
    // Social and interpersonal norms
    social: {
      hospitality_expectations: string;
      family_importance: number; // 0-1
      age_respect: number; // 0-1
      gender_roles: string;
      religious_considerations: string[];
      taboo_topics: string[];
      humor_appropriateness: string;
    };
  };
  
  // Cultural knowledge and insights
  knowledge: {
    // Historical and contextual knowledge
    context: {
      historical_background: string;
      key_values: string[];
      cultural_symbols: string[];
      important_holidays: string[];
      traditional_practices: string[];
      modern_adaptations: string[];
    };
    
    // Language and communication patterns
    linguistic: {
      primary_language: string;
      common_phrases: Array<{
        phrase: string;
        meaning: string;
        context: string;
        formality: string;
      }>;
      non_verbal_cues: Array<{
        gesture: string;
        meaning: string;
        appropriateness: string;
      }>;
      communication_styles: string[];
    };
    
    // Business and professional insights
    business_insights: {
      work_culture: string;
      leadership_styles: string[];
      team_dynamics: string;
      conflict_resolution: string;
      feedback_culture: string;
      innovation_approach: string;
    };
  };
  
  // Cultural adaptation and learning
  adaptation: {
    // Agent's cultural adaptation progress
    adaptation_level: number; // 0-1 how well adapted
    learning_progress: {
      areas_mastered: string[];
      areas_improving: string[];
      areas_struggling: string[];
      recent_learnings: Array<{
        date: Date;
        insight: string;
        context: string;
        confidence: number;
      }>;
    };
    
    // Cultural sensitivity and awareness
    sensitivity: {
      cultural_awareness: number; // 0-1
      bias_recognition: number; // 0-1
      inclusive_behavior: number; // 0-1
      cross_cultural_effectiveness: number; // 0-1
    };
    
    // Adaptation strategies
    strategies: {
      communication_adjustments: string[];
      behavior_modifications: string[];
      learning_approaches: string[];
      feedback_incorporation: string[];
    };
  };
  
  // Cultural context and application
  application: {
    // Recent cultural applications
    recent_usage: Array<{
      date: Date;
      context: string; // Where cultural knowledge was applied
      situation: string;
      adaptation_used: string[];
      effectiveness: number; // 0-1
      feedback?: string;
      lessons_learned?: string[];
    }>;
    
    // Cultural effectiveness patterns
    patterns: {
      most_effective_contexts: string[];
      challenging_situations: string[];
      successful_adaptations: string[];
      areas_for_improvement: string[];
    };
    
    // Cross-cultural interactions
    interactions: {
      successful_interactions: number;
      cultural_misunderstandings: number;
      adaptation_successes: number;
      learning_opportunities: number;
    };
  };
}

export interface CulturalFilter {
  region?: string;
  country?: string;
  language?: string;
  formality?: string;
  'culture.name'?: string;
  'culture.metadata.formality'?: string;
  'culture.metadata.directness'?: string;
  'adaptation.adaptation_level'?: { $gte?: number; $lte?: number };
}

export interface CulturalAnalyticsOptions {
  includeTemporalTrends?: boolean;
  includeCrossReferences?: boolean;
  includeRecommendations?: boolean;
  timeRange?: { start: Date; end: Date };
}

/**
 * CulturalKnowledgeCollection - Manages cultural knowledge with full-text search
 * 
 * This collection demonstrates MongoDB's full-text search capabilities:
 * - Text indexes for cultural knowledge discovery
 * - Multi-language text search support
 * - Cultural taxonomy with hierarchical queries
 * - Context-aware cultural recommendations
 * - Cultural pattern analysis and learning
 */
export class CulturalKnowledgeCollection extends BaseCollection<CulturalKnowledge> {
  protected collectionName = 'agent_cultural_knowledge';

  constructor(db: Db) {
    super(db);
    this.collection = db.collection<CulturalKnowledge>(this.collectionName);
  }

  /**
   * Create indexes optimized for cultural knowledge management
   */
  async createIndexes(): Promise<void> {
    try {
      // Agent and culture identification index
      await this.collection.createIndex({
        agentId: 1,
        'culture.id': 1,
        timestamp: -1
      }, {
        name: 'agent_culture_timeline',
        background: true
      });

      // Cultural taxonomy and hierarchy index
      await this.collection.createIndex({
        'culture.region': 1,
        'culture.country': 1,
        'culture.language': 1,
        'adaptation.adaptation_level': -1
      }, {
        name: 'cultural_taxonomy_adaptation',
        background: true
      });

      // Full-text search index for cultural knowledge (following SkillCapabilityCollection pattern)
      await this.collection.createIndex({
        'culture.name': 'text',
        'knowledge.context.key_values': 'text',
        'knowledge.context.traditional_practices': 'text',
        'knowledge.business_insights.work_culture': 'text',
        'knowledge.linguistic.communication_styles': 'text',
        'norms.communication.greeting_style': 'text',
        'norms.business.meeting_style': 'text'
      }, {
        name: 'cultural_knowledge_text_search',
        background: true,
        weights: {
          'culture.name': 10,
          'knowledge.context.key_values': 5,
          'knowledge.context.traditional_practices': 3,
          'knowledge.business_insights.work_culture': 3,
          'knowledge.linguistic.communication_styles': 2,
          'norms.communication.greeting_style': 2,
          'norms.business.meeting_style': 2
        }
      });

      // Cultural metadata and characteristics index
      await this.collection.createIndex({
        'culture.metadata.formality': 1,
        'culture.metadata.directness': 1,
        'culture.metadata.hierarchy': 1,
        'culture.metadata.collectivism': 1
      }, {
        name: 'cultural_characteristics',
        background: true
      });

      // Cultural adaptation and effectiveness index
      await this.collection.createIndex({
        'adaptation.adaptation_level': -1,
        'adaptation.sensitivity.cultural_awareness': -1,
        'application.interactions.successful_interactions': -1
      }, {
        name: 'cultural_adaptation_effectiveness',
        background: true
      });

      // Cultural hierarchy and relationships index
      await this.collection.createIndex({
        'culture.hierarchy.level': 1,
        'culture.hierarchy.parent': 1,
        'culture.hierarchy.influences': 1
      }, {
        name: 'cultural_hierarchy_relationships',
        background: true
      });

      // Sparse index for subcultural knowledge
      await this.collection.createIndex({
        'culture.subculture': 1,
        'adaptation.adaptation_level': -1
      }, {
        name: 'subcultural_adaptation',
        background: true,
        sparse: true
      });

      console.log('✅ CulturalKnowledgeCollection indexes created successfully');
    } catch (error) {
      console.error('Failed to create CulturalKnowledgeCollection indexes:', error);
      throw error;
    }
  }

  /**
   * Record cultural knowledge
   */
  async recordCulturalKnowledge(knowledge: Omit<CulturalKnowledge, '_id' | 'createdAt' | 'updatedAt'>): Promise<ObjectId> {
    const knowledgeWithTimestamp = {
      ...knowledge,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await this.collection.insertOne(knowledgeWithTimestamp);
    return result.insertedId;
  }

  /**
   * Get cultural knowledge for an agent
   */
  async getAgentCulturalKnowledge(
    agentId: string,
    filter?: Partial<CulturalFilter>
  ): Promise<CulturalKnowledge[]> {
    const query = { agentId, ...filter };

    return await this.collection.find(query)
      .sort({ 'adaptation.adaptation_level': -1, timestamp: -1 })
      .toArray();
  }

  /**
   * Search cultural knowledge using full-text search (following SkillCapabilityCollection pattern)
   */
  async searchCulturalKnowledge(
    agentId: string,
    searchText: string,
    options?: {
      region?: string;
      language?: string;
      limit?: number;
    }
  ): Promise<Array<CulturalKnowledge & { score: number }>> {
    const query: any = {
      agentId,
      $text: { $search: searchText }
    };

    if (options?.region) {
      query['culture.region'] = options.region;
    }

    if (options?.language) {
      query['culture.language'] = options.language;
    }

    const results = await this.collection.find(query)
      .sort({ score: { $meta: 'textScore' }, 'adaptation.adaptation_level': -1 })
      .limit(options?.limit || 10)
      .toArray();

    return results.map(result => ({
      ...result,
      score: 1.0 // Simplified score since textScore metadata is complex
    }));
  }

  /**
   * Find similar cultures based on characteristics
   */
  async findSimilarCultures(
    cultureId: string,
    characteristics: {
      formality?: string;
      directness?: string;
      collectivism?: number;
      power_distance?: number;
    },
    limit: number = 5
  ): Promise<CulturalKnowledge[]> {
    const query: any = {
      'culture.id': { $ne: cultureId }
    };

    if (characteristics.formality) {
      query['culture.metadata.formality'] = characteristics.formality;
    }

    if (characteristics.directness) {
      query['culture.metadata.directness'] = characteristics.directness;
    }

    if (characteristics.collectivism !== undefined) {
      query['culture.metadata.collectivism'] = {
        $gte: characteristics.collectivism - 0.2,
        $lte: characteristics.collectivism + 0.2
      };
    }

    if (characteristics.power_distance !== undefined) {
      query['culture.metadata.power_distance'] = {
        $gte: characteristics.power_distance - 0.2,
        $lte: characteristics.power_distance + 0.2
      };
    }

    return await this.collection.find(query)
      .sort({ 'adaptation.adaptation_level': -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Get cultural recommendations for a context
   */
  async getCulturalRecommendations(
    agentId: string,
    context: {
      situation: string;
      region?: string;
      formality_required?: string;
      interaction_type?: string;
    }
  ): Promise<Array<{
    culture: string;
    recommendations: string[];
    confidence: number;
    reasoning: string;
  }>> {
    // Find relevant cultural knowledge
    const relevantCultures = await this.collection.find({
      agentId,
      ...(context.region && { 'culture.region': context.region }),
      ...(context.formality_required && { 'culture.metadata.formality': context.formality_required })
    }).toArray();

    return relevantCultures.map(culture => {
      const recommendations = this.generateContextualRecommendations(culture, context);
      const confidence = this.calculateRecommendationConfidence(culture, context);
      const reasoning = this.generateRecommendationReasoning(culture, context);

      return {
        culture: culture.culture.name,
        recommendations,
        confidence,
        reasoning
      };
    });
  }

  /**
   * Analyze cultural adaptation patterns
   */
  async analyzeCulturalAdaptation(agentId: string): Promise<{
    overallAdaptation: number;
    strongestCultures: Array<{ culture: string; adaptation: number }>;
    improvementAreas: Array<{ area: string; priority: string }>;
    learningTrends: Array<{ culture: string; trend: number }>;
    recommendations: string[];
  }> {
    const culturalKnowledge = await this.getAgentCulturalKnowledge(agentId);

    if (culturalKnowledge.length === 0) {
      return {
        overallAdaptation: 0,
        strongestCultures: [],
        improvementAreas: [],
        learningTrends: [],
        recommendations: ['Start building cultural knowledge base']
      };
    }

    // Calculate overall adaptation
    const overallAdaptation = culturalKnowledge.reduce((sum, culture) =>
      sum + culture.adaptation.adaptation_level, 0
    ) / culturalKnowledge.length;

    // Find strongest cultures
    const strongestCultures = culturalKnowledge
      .sort((a, b) => b.adaptation.adaptation_level - a.adaptation.adaptation_level)
      .slice(0, 5)
      .map(culture => ({
        culture: culture.culture.name,
        adaptation: culture.adaptation.adaptation_level
      }));

    // Identify improvement areas
    const improvementAreas = this.identifyImprovementAreas(culturalKnowledge);

    // Calculate learning trends
    const learningTrends = this.calculateLearningTrends(culturalKnowledge);

    // Generate recommendations
    const recommendations = this.generateAdaptationRecommendations(
      overallAdaptation,
      strongestCultures,
      improvementAreas
    );

    return {
      overallAdaptation,
      strongestCultures,
      improvementAreas,
      learningTrends,
      recommendations
    };
  }

  /**
   * Update cultural adaptation level
   */
  async updateCulturalAdaptation(
    agentId: string,
    cultureId: string,
    adaptationUpdate: {
      newAdaptationLevel: number;
      learningInsight: string;
      context: string;
    }
  ): Promise<void> {
    await this.collection.updateOne(
      { agentId, 'culture.id': cultureId },
      {
        $set: {
          'adaptation.adaptation_level': adaptationUpdate.newAdaptationLevel,
          updatedAt: new Date()
        },
        $push: {
          'adaptation.learning_progress.recent_learnings': {
            date: new Date(),
            insight: adaptationUpdate.learningInsight,
            context: adaptationUpdate.context,
            confidence: Math.min(1.0, adaptationUpdate.newAdaptationLevel + 0.1)
          }
        }
      }
    );
  }

  // Private helper methods
  private generateContextualRecommendations(
    culture: CulturalKnowledge,
    context: any
  ): string[] {
    const recommendations = [];

    // Communication recommendations
    if (context.interaction_type === 'meeting') {
      recommendations.push(`Use ${culture.norms.business.meeting_style} meeting approach`);
      recommendations.push(`Respect ${culture.norms.business.punctuality_importance > 0.7 ? 'strict' : 'flexible'} timing`);
    }

    // Formality recommendations
    if (context.formality_required) {
      recommendations.push(`Maintain ${culture.culture.metadata.formality} communication style`);
      recommendations.push(`Use ${culture.norms.communication.addressing_style} addressing`);
    }

    // General cultural recommendations
    recommendations.push(`Consider ${culture.culture.metadata.directness} communication approach`);

    if (culture.culture.metadata.collectivism > 0.6) {
      recommendations.push('Emphasize group harmony and consensus');
    } else {
      recommendations.push('Focus on individual contributions and achievements');
    }

    return recommendations;
  }

  private calculateRecommendationConfidence(
    culture: CulturalKnowledge,
    context: any
  ): number {
    let confidence = culture.adaptation.adaptation_level;

    // Boost confidence for well-known contexts
    if (culture.application.patterns.most_effective_contexts.includes(context.situation)) {
      confidence += 0.2;
    }

    // Reduce confidence for challenging situations
    if (culture.application.patterns.challenging_situations.includes(context.situation)) {
      confidence -= 0.1;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private generateRecommendationReasoning(
    culture: CulturalKnowledge,
    context: any
  ): string {
    const reasons = [];

    reasons.push(`Based on ${culture.culture.name} cultural norms`);
    reasons.push(`Adaptation level: ${(culture.adaptation.adaptation_level * 100).toFixed(0)}%`);

    if (culture.application.interactions.successful_interactions > 5) {
      reasons.push(`Proven effectiveness in similar contexts`);
    }

    return reasons.join('. ');
  }

  private identifyImprovementAreas(culturalKnowledge: CulturalKnowledge[]): Array<{ area: string; priority: string }> {
    const areas = [];

    // Check for low adaptation levels
    const lowAdaptationCultures = culturalKnowledge.filter(c => c.adaptation.adaptation_level < 0.6);
    if (lowAdaptationCultures.length > 0) {
      areas.push({
        area: `Cultural adaptation for ${lowAdaptationCultures.map(c => c.culture.name).join(', ')}`,
        priority: 'high'
      });
    }

    // Check for cultural sensitivity
    const lowSensitivity = culturalKnowledge.filter(c => c.adaptation.sensitivity.cultural_awareness < 0.7);
    if (lowSensitivity.length > 0) {
      areas.push({
        area: 'Cultural awareness and sensitivity',
        priority: 'medium'
      });
    }

    // Check for cross-cultural effectiveness
    const lowEffectiveness = culturalKnowledge.filter(c =>
      c.adaptation.sensitivity.cross_cultural_effectiveness < 0.7
    );
    if (lowEffectiveness.length > 0) {
      areas.push({
        area: 'Cross-cultural communication effectiveness',
        priority: 'medium'
      });
    }

    return areas;
  }

  private calculateLearningTrends(culturalKnowledge: CulturalKnowledge[]): Array<{ culture: string; trend: number }> {
    return culturalKnowledge.map(culture => {
      const recentLearnings = culture.adaptation.learning_progress.recent_learnings;

      if (recentLearnings.length < 2) {
        return { culture: culture.culture.name, trend: 0 };
      }

      // Calculate trend based on recent learning confidence
      const recent = recentLearnings.slice(-3);
      const trend = recent.length > 1 ?
        (recent[recent.length - 1].confidence - recent[0].confidence) / recent.length : 0;

      return { culture: culture.culture.name, trend };
    });
  }

  private generateAdaptationRecommendations(
    overallAdaptation: number,
    strongestCultures: any[],
    improvementAreas: any[]
  ): string[] {
    const recommendations = [];

    if (overallAdaptation < 0.5) {
      recommendations.push('Focus on building foundational cultural knowledge');
      recommendations.push('Practice cultural observation and reflection');
    } else if (overallAdaptation < 0.7) {
      recommendations.push('Deepen understanding of cultural nuances');
      recommendations.push('Seek feedback on cultural interactions');
    } else {
      recommendations.push('Maintain cultural competency through regular practice');
      recommendations.push('Consider mentoring others in cultural adaptation');
    }

    if (improvementAreas.length > 0) {
      recommendations.push(`Priority areas: ${improvementAreas.slice(0, 2).map(a => a.area).join(', ')}`);
    }

    if (strongestCultures.length > 0) {
      recommendations.push(`Leverage strengths in ${strongestCultures[0].culture} cultural context`);
    }

    return recommendations;
  }
}
