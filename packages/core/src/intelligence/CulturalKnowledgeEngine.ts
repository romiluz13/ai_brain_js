/**
 * @file CulturalKnowledgeEngine - Advanced cultural intelligence for AI agents
 * 
 * This engine provides comprehensive cultural knowledge and adaptation capabilities using MongoDB's
 * full-text search and cultural taxonomy features. Demonstrates MongoDB's advanced capabilities
 * for cultural data management, text search, and context-aware cultural recommendations.
 * 
 * Features:
 * - Full-text search for cultural knowledge discovery
 * - Cultural taxonomy and hierarchical organization
 * - Context-aware cultural norm adaptation
 * - Cultural learning and pattern recognition
 * - Multi-language and regional cultural support
 * - Real-time cultural recommendation system
 */

import { Db, ObjectId } from 'mongodb';
import { CulturalKnowledgeCollection, CulturalKnowledge } from '../collections/CulturalKnowledgeCollection';

export interface CulturalAssessmentRequest {
  agentId: string;
  sessionId?: string;
  cultureId: string;
  cultureName: string;
  region: string;
  country: string;
  language: string;
  context: {
    situation: string;
    interaction_type: 'meeting' | 'negotiation' | 'presentation' | 'social' | 'customer_service';
    formality_level: 'very_formal' | 'formal' | 'neutral' | 'informal' | 'very_informal';
    participants: string[];
    duration: number; // minutes
    outcome: 'successful' | 'partially_successful' | 'unsuccessful';
    cultural_challenges?: string[];
  };
  observations: {
    communication_style: string;
    behavioral_norms: string[];
    values_demonstrated: string[];
    taboos_encountered?: string[];
    successful_adaptations: string[];
    areas_for_improvement: string[];
  };
  adaptation_effectiveness: {
    cultural_sensitivity: number; // 0-1
    communication_effectiveness: number; // 0-1
    relationship_building: number; // 0-1
    conflict_avoidance: number; // 0-1
    goal_achievement: number; // 0-1
  };
}

export interface CulturalRecommendationRequest {
  agentId: string;
  targetCulture: {
    region: string;
    country: string;
    language?: string;
    subculture?: string;
  };
  context: {
    situation: string;
    interaction_type: string;
    formality_required: string;
    participants: number;
    duration: number;
    objectives: string[];
  };
  agent_background: {
    native_culture: string;
    cultural_experience: string[];
    adaptation_strengths: string[];
    known_challenges: string[];
  };
}

export interface CulturalAdaptationPlan {
  targetCulture: string;
  currentAdaptationLevel: number;
  targetAdaptationLevel: number;
  adaptationStrategies: Array<{
    area: string;
    current_proficiency: number;
    target_proficiency: number;
    strategies: string[];
    timeline: string;
    resources: string[];
  }>;
  learningPath: Array<{
    phase: number;
    focus_areas: string[];
    activities: string[];
    duration: string;
    milestones: string[];
  }>;
  riskAssessment: {
    potential_challenges: string[];
    mitigation_strategies: string[];
    success_indicators: string[];
  };
}

export interface CulturalInsight {
  culture: string;
  insight_type: 'norm' | 'value' | 'behavior' | 'communication' | 'business';
  insight: string;
  context: string;
  confidence: number;
  supporting_evidence: string[];
  practical_applications: string[];
  potential_pitfalls: string[];
}

export interface CulturalAnalytics {
  cultural_competency: {
    overall_score: number;
    strongest_cultures: Array<{ culture: string; score: number }>;
    improvement_areas: Array<{ area: string; priority: string }>;
    adaptation_velocity: number;
  };
  interaction_patterns: {
    most_successful_contexts: string[];
    challenging_situations: string[];
    cultural_preferences: string[];
    adaptation_strategies: string[];
  };
  learning_insights: {
    fastest_learning_cultures: string[];
    learning_patterns: string[];
    knowledge_gaps: string[];
    recommended_focus: string[];
  };
  recommendations: {
    immediate_actions: string[];
    long_term_development: string[];
    cultural_immersion_opportunities: string[];
    skill_building_priorities: string[];
  };
}

/**
 * CulturalKnowledgeEngine - Advanced cultural intelligence and adaptation engine
 * 
 * Provides comprehensive cultural knowledge management, adaptation planning,
 * and context-aware cultural recommendations using MongoDB's full-text search
 * and cultural taxonomy capabilities.
 */
export class CulturalKnowledgeEngine {
  private culturalKnowledgeCollection: CulturalKnowledgeCollection;
  private isInitialized = false;

  constructor(private db: Db) {
    this.culturalKnowledgeCollection = new CulturalKnowledgeCollection(db);
  }

  /**
   * Initialize the cultural knowledge engine
   */
  async initialize(): Promise<void> {
    try {
      await this.culturalKnowledgeCollection.createIndexes();
      this.isInitialized = true;
      console.log('CulturalKnowledgeEngine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize CulturalKnowledgeEngine:', error);
      throw error;
    }
  }

  /**
   * Assess and record cultural interaction
   */
  async assessCulturalInteraction(request: CulturalAssessmentRequest): Promise<ObjectId> {
    if (!this.isInitialized) {
      throw new Error('CulturalKnowledgeEngine must be initialized first');
    }

    // Calculate overall adaptation level
    const adaptationLevel = this.calculateAdaptationLevel(request.adaptation_effectiveness);
    
    // Generate cultural insights
    const culturalInsights = this.generateCulturalInsights(request);
    
    // Determine cultural characteristics
    const culturalCharacteristics = this.inferCulturalCharacteristics(request);

    // Create cultural knowledge record
    const culturalKnowledge: Omit<CulturalKnowledge, '_id' | 'createdAt' | 'updatedAt'> = {
      agentId: request.agentId,
      sessionId: request.sessionId,
      timestamp: new Date(),
      culture: {
        id: request.cultureId,
        name: request.cultureName,
        region: request.region,
        country: request.country,
        language: request.language,
        hierarchy: {
          level: this.determineCulturalLevel(request.region, request.country),
          parent: this.determineParentCulture(request.region),
          children: [],
          influences: this.determineInfluences(request.region, request.country),
          similarities: this.findSimilarCultures(request.region, request.country)
        },
        metadata: culturalCharacteristics
      },
      norms: this.extractCulturalNorms(request),
      knowledge: this.buildCulturalKnowledge(request, culturalInsights),
      adaptation: {
        adaptation_level: adaptationLevel,
        learning_progress: {
          areas_mastered: request.observations.successful_adaptations,
          areas_improving: request.observations.areas_for_improvement,
          areas_struggling: request.context.cultural_challenges || [],
          recent_learnings: [{
            date: new Date(),
            insight: `Cultural interaction in ${request.context.situation}`,
            context: request.context.interaction_type,
            confidence: adaptationLevel
          }]
        },
        sensitivity: {
          cultural_awareness: request.adaptation_effectiveness.cultural_sensitivity,
          bias_recognition: this.assessBiasRecognition(request),
          inclusive_behavior: request.adaptation_effectiveness.relationship_building,
          cross_cultural_effectiveness: this.calculateCrossCulturalEffectiveness(request.adaptation_effectiveness)
        },
        strategies: {
          communication_adjustments: this.identifyCommAdjustments(request),
          behavior_modifications: this.identifyBehaviorMods(request),
          learning_approaches: this.suggestLearningApproaches(request),
          feedback_incorporation: this.suggestFeedbackMethods(request)
        }
      },
      application: {
        recent_usage: [{
          date: new Date(),
          context: request.context.situation,
          situation: request.context.interaction_type,
          adaptation_used: request.observations.successful_adaptations,
          effectiveness: adaptationLevel,
          feedback: request.context.outcome,
          lessons_learned: request.observations.areas_for_improvement
        }],
        patterns: {
          most_effective_contexts: [request.context.interaction_type],
          challenging_situations: request.context.cultural_challenges || [],
          successful_adaptations: request.observations.successful_adaptations,
          areas_for_improvement: request.observations.areas_for_improvement
        },
        interactions: {
          successful_interactions: request.context.outcome === 'successful' ? 1 : 0,
          cultural_misunderstandings: request.context.cultural_challenges?.length || 0,
          adaptation_successes: request.observations.successful_adaptations.length,
          learning_opportunities: request.observations.areas_for_improvement.length
        }
      }
    };

    return await this.culturalKnowledgeCollection.recordCulturalKnowledge(culturalKnowledge);
  }

  /**
   * Get cultural recommendations for a specific context
   */
  async getCulturalRecommendations(request: CulturalRecommendationRequest): Promise<Array<CulturalInsight>> {
    if (!this.isInitialized) {
      throw new Error('CulturalKnowledgeEngine must be initialized first');
    }

    // Search for relevant cultural knowledge
    const searchResults = await this.culturalKnowledgeCollection.searchCulturalKnowledge(
      request.agentId,
      `${request.targetCulture.country} ${request.context.situation} ${request.context.interaction_type}`,
      {
        region: request.targetCulture.region,
        language: request.targetCulture.language,
        limit: 10
      }
    );

    // Get contextual recommendations
    const contextualRecommendations = await this.culturalKnowledgeCollection.getCulturalRecommendations(
      request.agentId,
      {
        situation: request.context.situation,
        region: request.targetCulture.region,
        formality_required: request.context.formality_required,
        interaction_type: request.context.interaction_type
      }
    );

    // Generate cultural insights
    const insights: CulturalInsight[] = [];

    // Add insights from search results
    searchResults.forEach(result => {
      insights.push({
        culture: result.culture.name,
        insight_type: 'behavior',
        insight: `Based on previous interactions in ${result.culture.name}`,
        context: request.context.situation,
        confidence: result.score * result.adaptation.adaptation_level,
        supporting_evidence: result.adaptation.learning_progress.recent_learnings.map(l => l.insight),
        practical_applications: result.adaptation.strategies.communication_adjustments,
        potential_pitfalls: result.application.patterns.challenging_situations
      });
    });

    // Add insights from contextual recommendations
    contextualRecommendations.forEach(rec => {
      insights.push({
        culture: rec.culture,
        insight_type: 'communication',
        insight: rec.recommendations.join('. '),
        context: request.context.situation,
        confidence: rec.confidence,
        supporting_evidence: [rec.reasoning],
        practical_applications: rec.recommendations,
        potential_pitfalls: []
      });
    });

    return insights.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Generate cultural adaptation plan
   */
  async generateAdaptationPlan(
    agentId: string,
    targetCulture: string,
    currentLevel?: number
  ): Promise<CulturalAdaptationPlan> {
    if (!this.isInitialized) {
      throw new Error('CulturalKnowledgeEngine must be initialized first');
    }

    // Get current cultural knowledge
    const existingKnowledge = await this.culturalKnowledgeCollection.getAgentCulturalKnowledge(agentId, {
      'culture.name': targetCulture
    });

    const currentAdaptationLevel = currentLevel ||
      (existingKnowledge.length > 0 ? existingKnowledge[0].adaptation.adaptation_level : 0);

    const targetAdaptationLevel = Math.min(1.0, currentAdaptationLevel + 0.3);

    // Define adaptation strategies
    const adaptationStrategies = [
      {
        area: 'Communication Style',
        current_proficiency: currentAdaptationLevel,
        target_proficiency: targetAdaptationLevel,
        strategies: [
          'Practice formal/informal communication patterns',
          'Learn cultural greeting and farewell customs',
          'Understand non-verbal communication norms'
        ],
        timeline: '2-4 weeks',
        resources: ['Cultural communication guides', 'Language learning apps', 'Native speaker practice']
      },
      {
        area: 'Business Etiquette',
        current_proficiency: currentAdaptationLevel * 0.8,
        target_proficiency: targetAdaptationLevel,
        strategies: [
          'Study meeting and negotiation protocols',
          'Learn gift-giving and hospitality norms',
          'Understand hierarchy and decision-making processes'
        ],
        timeline: '3-6 weeks',
        resources: ['Business culture guides', 'Professional mentoring', 'Cultural workshops']
      },
      {
        area: 'Social Norms',
        current_proficiency: currentAdaptationLevel * 0.9,
        target_proficiency: targetAdaptationLevel,
        strategies: [
          'Understand family and relationship dynamics',
          'Learn about taboo topics and sensitive areas',
          'Practice appropriate humor and conversation topics'
        ],
        timeline: '4-8 weeks',
        resources: ['Cultural immersion experiences', 'Social interaction practice', 'Cultural mentors']
      }
    ];

    // Create learning path
    const learningPath = [
      {
        phase: 1,
        focus_areas: ['Basic cultural awareness', 'Communication fundamentals'],
        activities: ['Cultural orientation', 'Language basics', 'Observation exercises'],
        duration: '2 weeks',
        milestones: ['Understand basic cultural values', 'Can engage in simple interactions']
      },
      {
        phase: 2,
        focus_areas: ['Business and professional norms', 'Relationship building'],
        activities: ['Professional interaction practice', 'Mentoring sessions', 'Case study analysis'],
        duration: '4 weeks',
        milestones: ['Effective professional interactions', 'Building cultural relationships']
      },
      {
        phase: 3,
        focus_areas: ['Advanced cultural nuances', 'Leadership in cultural context'],
        activities: ['Complex scenario practice', 'Cultural leadership training', 'Peer teaching'],
        duration: '6 weeks',
        milestones: ['Navigate complex cultural situations', 'Mentor others in cultural adaptation']
      }
    ];

    // Risk assessment
    const riskAssessment = {
      potential_challenges: [
        'Cultural stereotyping and bias',
        'Over-generalization of cultural norms',
        'Resistance to changing communication style',
        'Misunderstanding cultural context'
      ],
      mitigation_strategies: [
        'Regular feedback and reflection sessions',
        'Diverse cultural exposure and practice',
        'Continuous learning and adaptation mindset',
        'Cultural mentor guidance and support'
      ],
      success_indicators: [
        'Increased cultural sensitivity scores',
        'Positive feedback from cultural interactions',
        'Successful achievement of cultural objectives',
        'Reduced cultural misunderstandings'
      ]
    };

    return {
      targetCulture,
      currentAdaptationLevel,
      targetAdaptationLevel,
      adaptationStrategies,
      learningPath,
      riskAssessment
    };
  }

  /**
   * Analyze cultural patterns and generate analytics
   */
  async analyzeCulturalPatterns(agentId: string): Promise<CulturalAnalytics> {
    if (!this.isInitialized) {
      throw new Error('CulturalKnowledgeEngine must be initialized first');
    }

    const adaptationAnalysis = await this.culturalKnowledgeCollection.analyzeCulturalAdaptation(agentId);
    const culturalKnowledge = await this.culturalKnowledgeCollection.getAgentCulturalKnowledge(agentId);

    // Calculate cultural competency
    const cultural_competency = {
      overall_score: adaptationAnalysis.overallAdaptation,
      strongest_cultures: adaptationAnalysis.strongestCultures.map((c: any) => ({
        culture: c.culture,
        score: c.adaptation
      })),
      improvement_areas: adaptationAnalysis.improvementAreas,
      adaptation_velocity: this.calculateAdaptationVelocity(culturalKnowledge)
    };

    // Analyze interaction patterns
    const interaction_patterns = this.analyzeInteractionPatterns(culturalKnowledge);

    // Generate learning insights
    const learning_insights = this.generateLearningInsights(culturalKnowledge, adaptationAnalysis);

    // Create recommendations
    const recommendations = {
      immediate_actions: adaptationAnalysis.recommendations.slice(0, 3),
      long_term_development: this.generateLongTermRecommendations(adaptationAnalysis),
      cultural_immersion_opportunities: this.suggestImmersionOpportunities(culturalKnowledge),
      skill_building_priorities: this.identifySkillPriorities(adaptationAnalysis.improvementAreas)
    };

    return {
      cultural_competency,
      interaction_patterns,
      learning_insights,
      recommendations
    };
  }

  /**
   * Update cultural adaptation based on new experience
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
    if (!this.isInitialized) {
      throw new Error('CulturalKnowledgeEngine must be initialized first');
    }

    await this.culturalKnowledgeCollection.updateCulturalAdaptation(
      agentId,
      cultureId,
      adaptationUpdate
    );
  }

  // Private helper methods
  private calculateAdaptationLevel(effectiveness: any): number {
    const weights = {
      cultural_sensitivity: 0.25,
      communication_effectiveness: 0.25,
      relationship_building: 0.2,
      conflict_avoidance: 0.15,
      goal_achievement: 0.15
    };

    return Object.entries(weights).reduce((sum, [key, weight]) => {
      return sum + (effectiveness[key] || 0) * weight;
    }, 0);
  }

  private generateCulturalInsights(request: CulturalAssessmentRequest): string[] {
    const insights = [];

    if (request.observations.values_demonstrated.length > 0) {
      insights.push(`Key values: ${request.observations.values_demonstrated.join(', ')}`);
    }

    if (request.observations.behavioral_norms.length > 0) {
      insights.push(`Behavioral norms: ${request.observations.behavioral_norms.join(', ')}`);
    }

    if (request.observations.successful_adaptations.length > 0) {
      insights.push(`Successful adaptations: ${request.observations.successful_adaptations.join(', ')}`);
    }

    return insights;
  }

  private inferCulturalCharacteristics(request: CulturalAssessmentRequest): any {
    // Infer cultural characteristics based on observations
    const formality = request.context.formality_level;
    const directness = this.inferDirectness(request.observations.communication_style);
    const collectivism = this.inferCollectivism(request.observations.values_demonstrated);

    return {
      formality,
      directness,
      hierarchy: 'moderate',
      collectivism,
      uncertainty_avoidance: 0.5,
      power_distance: 0.5,
      time_orientation: 'present'
    };
  }

  private determineCulturalLevel(region: string, country: string): number {
    // Simple hierarchy: global=0, regional=1, national=2, local=3
    return 2; // National level
  }

  private determineParentCulture(region: string): string {
    return region; // Region is parent of country
  }

  private determineInfluences(region: string, country: string): string[] {
    // Simplified influence mapping
    const influences: Record<string, string[]> = {
      'north_america': ['european', 'indigenous'],
      'europe': ['mediterranean', 'nordic'],
      'east_asia': ['confucian', 'buddhist'],
      'middle_east': ['islamic', 'persian']
    };
    return influences[region] || [];
  }

  private findSimilarCultures(region: string, country: string): string[] {
    // Simplified similarity mapping
    const similarities: Record<string, string[]> = {
      'united_states': ['canada', 'australia', 'united_kingdom'],
      'germany': ['austria', 'switzerland', 'netherlands'],
      'japan': ['south_korea', 'singapore'],
      'brazil': ['argentina', 'mexico', 'colombia']
    };
    return similarities[country] || [];
  }

  private extractCulturalNorms(request: CulturalAssessmentRequest): any {
    return {
      communication: {
        greeting_style: 'Standard greeting observed',
        addressing_style: request.context.formality_level,
        conversation_pace: 'moderate',
        silence_comfort: 0.5,
        interruption_tolerance: 0.5,
        small_talk_importance: 0.6,
        eye_contact_norms: 'Moderate eye contact',
        personal_space: 1.2
      },
      business: {
        meeting_style: request.context.formality_level,
        decision_making: 'collaborative',
        punctuality_importance: 0.8,
        relationship_building: 0.7,
        gift_giving_norms: 'Appropriate gifts welcomed',
        dress_code_expectations: 'Business appropriate',
        negotiation_style: 'Collaborative approach'
      },
      social: {
        hospitality_expectations: 'Warm hospitality',
        family_importance: 0.8,
        age_respect: 0.7,
        gender_roles: 'Evolving roles',
        religious_considerations: [],
        taboo_topics: request.observations.taboos_encountered || [],
        humor_appropriateness: 'Context-dependent'
      }
    };
  }

  private buildCulturalKnowledge(request: CulturalAssessmentRequest, insights: string[]): any {
    return {
      context: {
        historical_background: `Cultural context for ${request.cultureName}`,
        key_values: request.observations.values_demonstrated,
        cultural_symbols: [],
        important_holidays: [],
        traditional_practices: [],
        modern_adaptations: request.observations.successful_adaptations
      },
      linguistic: {
        primary_language: request.language,
        common_phrases: [],
        non_verbal_cues: [],
        communication_styles: [request.observations.communication_style]
      },
      business_insights: {
        work_culture: `${request.context.interaction_type} focused`,
        leadership_styles: [],
        team_dynamics: 'Collaborative',
        conflict_resolution: 'Direct communication',
        feedback_culture: 'Open feedback',
        innovation_approach: 'Balanced approach'
      }
    };
  }

  private assessBiasRecognition(request: CulturalAssessmentRequest): number {
    // Simple assessment based on cultural challenges encountered
    const challenges = request.context.cultural_challenges?.length || 0;
    return Math.max(0.3, 1.0 - (challenges * 0.2));
  }

  private calculateCrossCulturalEffectiveness(effectiveness: any): number {
    return (effectiveness.communication_effectiveness + effectiveness.relationship_building) / 2;
  }

  private identifyCommAdjustments(request: CulturalAssessmentRequest): string[] {
    const adjustments = [];

    if (request.context.formality_level === 'very_formal') {
      adjustments.push('Use formal language and titles');
    }

    if (request.observations.communication_style.includes('indirect')) {
      adjustments.push('Practice indirect communication patterns');
    }

    return adjustments;
  }

  private identifyBehaviorMods(request: CulturalAssessmentRequest): string[] {
    return request.observations.areas_for_improvement.map(area =>
      `Modify behavior for ${area}`
    );
  }

  private suggestLearningApproaches(request: CulturalAssessmentRequest): string[] {
    return [
      'Observational learning',
      'Cultural mentoring',
      'Immersive experiences',
      'Reflective practice'
    ];
  }

  private suggestFeedbackMethods(request: CulturalAssessmentRequest): string[] {
    return [
      'Regular cultural check-ins',
      'Peer feedback sessions',
      'Cultural mentor guidance',
      'Self-reflection exercises'
    ];
  }

  private inferDirectness(communicationStyle: string): string {
    if (communicationStyle.toLowerCase().includes('direct')) return 'direct';
    if (communicationStyle.toLowerCase().includes('indirect')) return 'indirect';
    return 'moderate';
  }

  private inferCollectivism(values: string[]): number {
    const collectivistValues = ['teamwork', 'harmony', 'consensus', 'group', 'family'];
    const individualistValues = ['independence', 'achievement', 'individual', 'personal'];

    const collectivistScore = values.filter(v =>
      collectivistValues.some(cv => v.toLowerCase().includes(cv))
    ).length;

    const individualistScore = values.filter(v =>
      individualistValues.some(iv => v.toLowerCase().includes(iv))
    ).length;

    if (collectivistScore > individualistScore) return 0.7;
    if (individualistScore > collectivistScore) return 0.3;
    return 0.5;
  }

  private calculateAdaptationVelocity(culturalKnowledge: CulturalKnowledge[]): number {
    if (culturalKnowledge.length === 0) return 0;

    // Calculate average learning velocity based on recent learnings
    const totalVelocity = culturalKnowledge.reduce((sum, culture) => {
      const recentLearnings = culture.adaptation.learning_progress.recent_learnings;
      if (recentLearnings.length < 2) return sum;

      const timeSpan = recentLearnings.length * 7; // Assume weekly learnings
      const confidenceGain = recentLearnings[recentLearnings.length - 1].confidence -
                            recentLearnings[0].confidence;

      return sum + (confidenceGain / timeSpan);
    }, 0);

    return totalVelocity / culturalKnowledge.length;
  }

  private analyzeInteractionPatterns(culturalKnowledge: CulturalKnowledge[]): any {
    const allPatterns = culturalKnowledge.map(c => c.application.patterns);

    return {
      most_successful_contexts: this.getMostFrequent(
        allPatterns.flatMap(p => p.most_effective_contexts)
      ),
      challenging_situations: this.getMostFrequent(
        allPatterns.flatMap(p => p.challenging_situations)
      ),
      cultural_preferences: this.getMostFrequent(
        culturalKnowledge.map(c => c.culture.name)
      ),
      adaptation_strategies: this.getMostFrequent(
        allPatterns.flatMap(p => p.successful_adaptations)
      )
    };
  }

  private generateLearningInsights(culturalKnowledge: CulturalKnowledge[], adaptationAnalysis: any): any {
    const fastestLearning = culturalKnowledge
      .filter(c => c.adaptation.learning_progress.recent_learnings.length > 0)
      .sort((a, b) => b.adaptation.adaptation_level - a.adaptation.adaptation_level)
      .slice(0, 3)
      .map(c => c.culture.name);

    return {
      fastest_learning_cultures: fastestLearning,
      learning_patterns: ['Observational learning', 'Practice-based improvement'],
      knowledge_gaps: adaptationAnalysis.improvementAreas.map((area: any) => area.area),
      recommended_focus: adaptationAnalysis.strongestCultures.slice(0, 2).map((c: any) => c.culture)
    };
  }

  private generateLongTermRecommendations(adaptationAnalysis: any): string[] {
    const recommendations = [
      'Develop cultural mentoring relationships',
      'Pursue formal cultural competency training',
      'Engage in cross-cultural leadership opportunities'
    ];

    if (adaptationAnalysis.overallAdaptation < 0.6) {
      recommendations.unshift('Focus on foundational cultural competency building');
    }

    return recommendations;
  }

  private suggestImmersionOpportunities(culturalKnowledge: CulturalKnowledge[]): string[] {
    const cultures = culturalKnowledge.map(c => c.culture.name);

    return [
      `Cultural exchange programs in ${cultures[0] || 'target cultures'}`,
      'International assignment opportunities',
      'Cross-cultural project leadership',
      'Cultural community engagement',
      'Language immersion programs'
    ];
  }

  private identifySkillPriorities(improvementAreas: any[]): string[] {
    const priorities = improvementAreas
      .filter(area => area.priority === 'high')
      .map(area => area.area);

    if (priorities.length === 0) {
      return ['Cultural sensitivity development', 'Cross-cultural communication'];
    }

    return priorities;
  }

  private getMostFrequent(items: string[]): string[] {
    const frequency: Record<string, number> = {};

    items.forEach(item => {
      frequency[item] = (frequency[item] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([item]) => item);
  }
}
