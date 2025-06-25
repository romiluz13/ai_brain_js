/**
 * @file CulturalKnowledgeEngine.test.ts - Comprehensive tests for CulturalKnowledgeEngine
 * 
 * Tests the CulturalKnowledgeEngine's ability to:
 * - Assess and track cultural interactions with full-text search
 * - Generate cultural recommendations with taxonomy
 * - Create cultural adaptation plans with learning analytics
 * - Provide cultural analytics and insights
 * - Demonstrate MongoDB's full-text search and cultural data management
 */

import { MongoClient, Db } from 'mongodb';
import { CulturalKnowledgeEngine } from '../../intelligence/CulturalKnowledgeEngine';
import { CulturalKnowledgeCollection } from '../../collections/CulturalKnowledgeCollection';

describe('CulturalKnowledgeEngine - Real MongoDB Integration', () => {
  let client: MongoClient;
  let db: Db;
  let culturalEngine: CulturalKnowledgeEngine;
  let culturalCollection: CulturalKnowledgeCollection;

  beforeAll(async () => {
    // Connect to test MongoDB instance
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    client = new MongoClient(uri);
    await client.connect();
    
    // Use test database
    db = client.db('test_ai_brain_cultural_knowledge');
    culturalEngine = new CulturalKnowledgeEngine(db);
    culturalCollection = new CulturalKnowledgeCollection(db);
    
    // Initialize the engine
    await culturalEngine.initialize();
  });

  afterAll(async () => {
    // Clean up test data
    await db.dropDatabase();
    await client.close();
  });

  beforeEach(async () => {
    // Clear collections before each test
    await db.collection('agent_cultural_knowledge').deleteMany({});
  });

  describe('Cultural Assessment and Knowledge Recording', () => {
    it('should assess and record cultural interactions with full-text indexing', async () => {
      const agentId = 'test-agent-cultural-001';
      
      const assessmentRequest = {
        agentId,
        sessionId: 'session-123',
        cultureId: 'japanese_business',
        cultureName: 'Japanese Business Culture',
        region: 'east_asia',
        country: 'japan',
        language: 'english',
        context: {
          situation: 'business_meeting',
          interaction_type: 'meeting' as const,
          formality_level: 'very_formal' as const,
          participants: ['client', 'manager', 'translator'],
          duration: 90,
          outcome: 'successful' as const,
          cultural_challenges: ['language_barrier', 'hierarchy_navigation']
        },
        observations: {
          communication_style: 'indirect_polite',
          behavioral_norms: ['bowing', 'business_card_ceremony', 'silence_respect'],
          values_demonstrated: ['respect', 'harmony', 'consensus', 'hierarchy'],
          taboos_encountered: ['direct_disagreement', 'interrupting'],
          successful_adaptations: ['formal_greeting', 'patient_listening', 'consensus_building'],
          areas_for_improvement: ['reading_non_verbal_cues', 'understanding_silence']
        },
        adaptation_effectiveness: {
          cultural_sensitivity: 0.85,
          communication_effectiveness: 0.75,
          relationship_building: 0.80,
          conflict_avoidance: 0.90,
          goal_achievement: 0.85
        }
      };

      // Assess the cultural interaction
      const knowledgeId = await culturalEngine.assessCulturalInteraction(assessmentRequest);
      expect(knowledgeId).toBeDefined();

      // Verify the knowledge was recorded in MongoDB
      const recordedKnowledge = await culturalCollection.collection.findOne({ _id: knowledgeId });
      expect(recordedKnowledge).toBeDefined();
      expect(recordedKnowledge!.agentId).toBe(agentId);
      expect(recordedKnowledge!.culture.name).toBe('Japanese Business Culture');
      expect(recordedKnowledge!.culture.region).toBe('east_asia');
      expect(recordedKnowledge!.adaptation.adaptation_level).toBeGreaterThan(0);

      // Verify full-text search indexing works
      const searchResults = await culturalCollection.searchCulturalKnowledge(
        agentId,
        'japanese business meeting harmony',
        { region: 'east_asia', limit: 5 }
      );
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].culture.name).toBe('Japanese Business Culture');
      expect(searchResults[0].score).toBeGreaterThan(0);
    });

    it('should handle multiple cultural assessments and track progression', async () => {
      const agentId = 'test-agent-progression';
      
      // First assessment - initial interaction
      const initialAssessment = {
        agentId,
        cultureId: 'german_business',
        cultureName: 'German Business Culture',
        region: 'europe',
        country: 'germany',
        language: 'german',
        context: {
          situation: 'negotiation',
          interaction_type: 'negotiation' as const,
          formality_level: 'formal' as const,
          participants: ['client', 'legal_advisor'],
          duration: 120,
          outcome: 'partially_successful' as const,
          cultural_challenges: ['directness_shock', 'time_pressure']
        },
        observations: {
          communication_style: 'very_direct',
          behavioral_norms: ['punctuality', 'efficiency', 'fact_focus'],
          values_demonstrated: ['precision', 'efficiency', 'honesty'],
          successful_adaptations: ['punctual_arrival', 'prepared_documentation'],
          areas_for_improvement: ['handling_directness', 'quick_decision_making']
        },
        adaptation_effectiveness: {
          cultural_sensitivity: 0.65,
          communication_effectiveness: 0.60,
          relationship_building: 0.55,
          conflict_avoidance: 0.70,
          goal_achievement: 0.65
        }
      };

      const knowledgeId1 = await culturalEngine.assessCulturalInteraction(initialAssessment);

      // Second assessment - improved interaction
      const improvedAssessment = {
        ...initialAssessment,
        context: {
          ...initialAssessment.context,
          outcome: 'successful' as const,
          cultural_challenges: []
        },
        observations: {
          ...initialAssessment.observations,
          successful_adaptations: ['punctual_arrival', 'prepared_documentation', 'direct_communication', 'quick_responses'],
          areas_for_improvement: ['building_personal_rapport']
        },
        adaptation_effectiveness: {
          cultural_sensitivity: 0.85,
          communication_effectiveness: 0.80,
          relationship_building: 0.75,
          conflict_avoidance: 0.85,
          goal_achievement: 0.90
        }
      };

      const knowledgeId2 = await culturalEngine.assessCulturalInteraction(improvedAssessment);

      // Verify progression tracking
      const culturalKnowledge = await culturalCollection.getAgentCulturalKnowledge(agentId);
      expect(culturalKnowledge).toHaveLength(2);
      
      // Check that adaptation improved
      const sortedKnowledge = culturalKnowledge.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      expect(sortedKnowledge[1].adaptation.adaptation_level).toBeGreaterThan(sortedKnowledge[0].adaptation.adaptation_level);
    });
  });

  describe('Cultural Recommendations and Insights', () => {
    it('should generate contextual cultural recommendations', async () => {
      const agentId = 'test-agent-recommendations';
      
      // Create some cultural knowledge first
      await culturalEngine.assessCulturalInteraction({
        agentId,
        cultureId: 'french_business',
        cultureName: 'French Business Culture',
        region: 'europe',
        country: 'france',
        language: 'french',
        context: {
          situation: 'client_presentation',
          interaction_type: 'presentation' as const,
          formality_level: 'formal' as const,
          participants: ['clients', 'colleagues'],
          duration: 60,
          outcome: 'successful' as const
        },
        observations: {
          communication_style: 'eloquent_formal',
          behavioral_norms: ['intellectual_discussion', 'wine_lunch', 'fashion_awareness'],
          values_demonstrated: ['sophistication', 'intellectual_rigor', 'style'],
          successful_adaptations: ['formal_presentation', 'intellectual_discussion', 'cultural_references'],
          areas_for_improvement: ['casual_conversation', 'humor_timing']
        },
        adaptation_effectiveness: {
          cultural_sensitivity: 0.80,
          communication_effectiveness: 0.85,
          relationship_building: 0.75,
          conflict_avoidance: 0.80,
          goal_achievement: 0.85
        }
      });

      // Request recommendations for a new context
      const recommendationRequest = {
        agentId,
        targetCulture: {
          region: 'europe',
          country: 'france',
          language: 'french'
        },
        context: {
          situation: 'team_meeting',
          interaction_type: 'meeting',
          formality_required: 'formal',
          participants: 8,
          duration: 90,
          objectives: ['project_planning', 'team_alignment', 'decision_making']
        },
        agent_background: {
          native_culture: 'american',
          cultural_experience: ['german', 'japanese'],
          adaptation_strengths: ['preparation', 'respect'],
          known_challenges: ['informal_communication', 'relationship_building']
        }
      };

      // Get cultural recommendations
      const recommendations = await culturalEngine.getCulturalRecommendations(recommendationRequest);

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
      
      // Verify recommendation structure
      recommendations.forEach(rec => {
        expect(rec.culture).toBeDefined();
        expect(rec.insight_type).toBeDefined();
        expect(rec.insight).toBeDefined();
        expect(rec.confidence).toBeGreaterThanOrEqual(0);
        expect(rec.confidence).toBeLessThanOrEqual(1);
        expect(rec.practical_applications).toBeInstanceOf(Array);
      });

      // Verify recommendations are sorted by confidence
      for (let i = 1; i < recommendations.length; i++) {
        expect(recommendations[i].confidence).toBeLessThanOrEqual(recommendations[i-1].confidence);
      }
    });
  });

  describe('Cultural Adaptation Planning', () => {
    it('should generate comprehensive adaptation plans', async () => {
      const agentId = 'test-agent-adaptation';
      const targetCulture = 'Chinese Business Culture';
      
      // Generate adaptation plan
      const adaptationPlan = await culturalEngine.generateAdaptationPlan(
        agentId,
        targetCulture,
        0.4 // Current adaptation level
      );

      expect(adaptationPlan.targetCulture).toBe(targetCulture);
      expect(adaptationPlan.currentAdaptationLevel).toBe(0.4);
      expect(adaptationPlan.targetAdaptationLevel).toBeGreaterThan(0.4);
      expect(adaptationPlan.adaptationStrategies).toBeInstanceOf(Array);
      expect(adaptationPlan.learningPath).toBeInstanceOf(Array);
      expect(adaptationPlan.riskAssessment).toBeDefined();

      // Verify adaptation strategies
      adaptationPlan.adaptationStrategies.forEach(strategy => {
        expect(strategy.area).toBeDefined();
        expect(strategy.current_proficiency).toBeGreaterThanOrEqual(0);
        expect(strategy.target_proficiency).toBeGreaterThan(strategy.current_proficiency);
        expect(strategy.strategies).toBeInstanceOf(Array);
        expect(strategy.timeline).toBeDefined();
        expect(strategy.resources).toBeInstanceOf(Array);
      });

      // Verify learning path
      adaptationPlan.learningPath.forEach(phase => {
        expect(phase.phase).toBeGreaterThan(0);
        expect(phase.focus_areas).toBeInstanceOf(Array);
        expect(phase.activities).toBeInstanceOf(Array);
        expect(phase.milestones).toBeInstanceOf(Array);
      });

      // Verify risk assessment
      expect(adaptationPlan.riskAssessment.potential_challenges).toBeInstanceOf(Array);
      expect(adaptationPlan.riskAssessment.mitigation_strategies).toBeInstanceOf(Array);
      expect(adaptationPlan.riskAssessment.success_indicators).toBeInstanceOf(Array);
    });
  });

  describe('Cultural Analytics and Pattern Recognition', () => {
    it('should generate comprehensive cultural analytics', async () => {
      const agentId = 'test-agent-analytics';

      // Create multiple cultural assessments
      const cultures = [
        {
          cultureId: 'indian_business',
          cultureName: 'Indian Business Culture',
          region: 'south_asia',
          country: 'india',
          adaptationLevel: 0.75
        },
        {
          cultureId: 'brazilian_business',
          cultureName: 'Brazilian Business Culture',
          region: 'south_america',
          country: 'brazil',
          adaptationLevel: 0.65
        },
        {
          cultureId: 'swedish_business',
          cultureName: 'Swedish Business Culture',
          region: 'europe',
          country: 'sweden',
          adaptationLevel: 0.85
        }
      ];

      for (const culture of cultures) {
        await culturalEngine.assessCulturalInteraction({
          agentId,
          cultureId: culture.cultureId,
          cultureName: culture.cultureName,
          region: culture.region,
          country: culture.country,
          language: 'english',
          context: {
            situation: 'business_meeting',
            interaction_type: 'meeting' as const,
            formality_level: 'formal' as const,
            participants: ['team'],
            duration: 60,
            outcome: 'successful' as const
          },
          observations: {
            communication_style: 'collaborative',
            behavioral_norms: ['teamwork', 'respect'],
            values_demonstrated: ['collaboration', 'respect'],
            successful_adaptations: ['cultural_awareness'],
            areas_for_improvement: ['language_nuances']
          },
          adaptation_effectiveness: {
            cultural_sensitivity: culture.adaptationLevel,
            communication_effectiveness: culture.adaptationLevel,
            relationship_building: culture.adaptationLevel,
            conflict_avoidance: culture.adaptationLevel,
            goal_achievement: culture.adaptationLevel
          }
        });
      }

      // Generate analytics
      const analytics = await culturalEngine.analyzeCulturalPatterns(agentId);

      expect(analytics.cultural_competency).toBeDefined();
      expect(analytics.interaction_patterns).toBeDefined();
      expect(analytics.learning_insights).toBeDefined();
      expect(analytics.recommendations).toBeDefined();

      // Verify cultural competency
      expect(analytics.cultural_competency.overall_score).toBeGreaterThan(0);
      expect(analytics.cultural_competency.strongest_cultures).toBeInstanceOf(Array);
      expect(analytics.cultural_competency.improvement_areas).toBeInstanceOf(Array);
      expect(analytics.cultural_competency.adaptation_velocity).toBeGreaterThanOrEqual(0);

      // Verify interaction patterns
      expect(analytics.interaction_patterns.most_successful_contexts).toBeInstanceOf(Array);
      expect(analytics.interaction_patterns.challenging_situations).toBeInstanceOf(Array);

      // Verify learning insights
      expect(analytics.learning_insights.fastest_learning_cultures).toBeInstanceOf(Array);
      expect(analytics.learning_insights.recommended_focus).toBeInstanceOf(Array);

      // Verify recommendations
      expect(analytics.recommendations.immediate_actions).toBeInstanceOf(Array);
      expect(analytics.recommendations.long_term_development).toBeInstanceOf(Array);
    });

    it('should track cultural adaptation updates over time', async () => {
      const agentId = 'test-agent-updates';
      const cultureId = 'korean_business';

      // Initial assessment
      await culturalEngine.assessCulturalInteraction({
        agentId,
        cultureId,
        cultureName: 'Korean Business Culture',
        region: 'east_asia',
        country: 'south_korea',
        language: 'english',
        context: {
          situation: 'client_meeting',
          interaction_type: 'meeting' as const,
          formality_level: 'very_formal' as const,
          participants: ['client'],
          duration: 90,
          outcome: 'successful' as const
        },
        observations: {
          communication_style: 'hierarchical_respectful',
          behavioral_norms: ['bowing', 'age_respect', 'hierarchy'],
          values_demonstrated: ['respect', 'hierarchy', 'harmony'],
          successful_adaptations: ['formal_greeting', 'hierarchy_respect'],
          areas_for_improvement: ['relationship_building', 'informal_conversation']
        },
        adaptation_effectiveness: {
          cultural_sensitivity: 0.70,
          communication_effectiveness: 0.65,
          relationship_building: 0.60,
          conflict_avoidance: 0.75,
          goal_achievement: 0.70
        }
      });

      // Update adaptation
      await culturalEngine.updateCulturalAdaptation(agentId, cultureId, {
        newAdaptationLevel: 0.85,
        learningInsight: 'Improved understanding of hierarchical communication patterns',
        context: 'Follow-up meeting with enhanced cultural awareness'
      });

      // Verify update
      const updatedKnowledge = await culturalCollection.getAgentCulturalKnowledge(agentId, {
        'culture.id': cultureId
      });

      expect(updatedKnowledge.length).toBeGreaterThan(0);
      const latestKnowledge = updatedKnowledge.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];

      expect(latestKnowledge.adaptation.adaptation_level).toBe(0.85);
      expect(latestKnowledge.adaptation.learning_progress.recent_learnings.length).toBeGreaterThan(0);
    });
  });

  describe('MongoDB Full-Text Search Showcase', () => {
    it('should demonstrate full-text search capabilities', async () => {
      const agentId = 'test-agent-search';

      // Create cultural knowledge with rich text content
      const culturalData = [
        {
          cultureId: 'mexican_business',
          cultureName: 'Mexican Business Culture',
          region: 'north_america',
          country: 'mexico',
          searchTerms: ['family', 'relationships', 'personal', 'warm', 'hospitality']
        },
        {
          cultureId: 'dutch_business',
          cultureName: 'Dutch Business Culture',
          region: 'europe',
          country: 'netherlands',
          searchTerms: ['direct', 'efficient', 'practical', 'egalitarian', 'consensus']
        },
        {
          cultureId: 'thai_business',
          cultureName: 'Thai Business Culture',
          region: 'southeast_asia',
          country: 'thailand',
          searchTerms: ['harmony', 'respect', 'face', 'indirect', 'patience']
        }
      ];

      for (const data of culturalData) {
        await culturalEngine.assessCulturalInteraction({
          agentId,
          cultureId: data.cultureId,
          cultureName: data.cultureName,
          region: data.region,
          country: data.country,
          language: 'english',
          context: {
            situation: 'business_interaction',
            interaction_type: 'meeting' as const,
            formality_level: 'formal' as const,
            participants: ['team'],
            duration: 60,
            outcome: 'successful' as const
          },
          observations: {
            communication_style: 'collaborative',
            behavioral_norms: data.searchTerms,
            values_demonstrated: data.searchTerms,
            successful_adaptations: ['cultural_awareness'],
            areas_for_improvement: []
          },
          adaptation_effectiveness: {
            cultural_sensitivity: 0.8,
            communication_effectiveness: 0.8,
            relationship_building: 0.8,
            conflict_avoidance: 0.8,
            goal_achievement: 0.8
          }
        });
      }

      // Test various search queries
      const searchQueries = [
        'family relationships warm',
        'direct efficient practical',
        'harmony respect patience',
        'business meeting formal'
      ];

      for (const query of searchQueries) {
        const startTime = Date.now();
        const searchResults = await culturalCollection.searchCulturalKnowledge(
          agentId,
          query,
          { limit: 10 }
        );
        const searchTime = Date.now() - startTime;

        expect(searchResults).toBeInstanceOf(Array);
        expect(searchTime).toBeLessThan(1000); // Should be fast with text indexing

        // Verify search results have scores
        searchResults.forEach(result => {
          expect(result.score).toBeGreaterThan(0);
        });

        console.log(`Full-text search for "${query}" completed in ${searchTime}ms with ${searchResults.length} results`);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle uninitialized engine gracefully', async () => {
      const uninitializedEngine = new CulturalKnowledgeEngine(db);

      await expect(uninitializedEngine.assessCulturalInteraction({
        agentId: 'test',
        cultureId: 'test',
        cultureName: 'Test',
        region: 'test',
        country: 'test',
        language: 'test',
        context: {
          situation: 'test',
          interaction_type: 'meeting' as const,
          formality_level: 'formal' as const,
          participants: [],
          duration: 60,
          outcome: 'successful' as const
        },
        observations: {
          communication_style: 'test',
          behavioral_norms: [],
          values_demonstrated: [],
          successful_adaptations: [],
          areas_for_improvement: []
        },
        adaptation_effectiveness: {
          cultural_sensitivity: 0.5,
          communication_effectiveness: 0.5,
          relationship_building: 0.5,
          conflict_avoidance: 0.5,
          goal_achievement: 0.5
        }
      })).rejects.toThrow('CulturalKnowledgeEngine must be initialized first');
    });
  });
});
