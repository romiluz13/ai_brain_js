/**
 * @file EpisodicMemoryCollection - MongoDB Atlas rich document storage for episodic memories
 * 
 * This collection demonstrates MongoDB Atlas rich document storage capabilities for episodic memory.
 * Based on official MongoDB Atlas documentation: https://www.mongodb.com/docs/manual/tutorial/query-documents/
 * 
 * CRITICAL: This uses MongoDB Atlas EXCLUSIVE features:
 * - Rich BSON document storage (Atlas optimized)
 * - Nested documents and arrays for complex experiences
 * - Advanced querying capabilities (Atlas enhanced)
 * - Complex data modeling for episodic memories
 * 
 * Features:
 * - Rich document storage for complex episodic memories
 * - Nested documents for multi-layered experiences
 * - Array storage for sequential events and interactions
 * - Complex querying for episodic retrieval
 * - Temporal and contextual memory organization
 */

import { Db, ObjectId } from 'mongodb';
import { BaseCollection, BaseDocument } from './BaseCollection';

export interface EpisodicMemory extends BaseDocument {
  agentId: string;
  sessionId?: string;
  timestamp: Date;
  
  // Episodic memory identification
  episode: {
    id: string;
    type: 'experience' | 'interaction' | 'learning' | 'decision' | 'observation' | 'reflection';
    category: 'personal' | 'professional' | 'social' | 'educational' | 'emotional' | 'procedural';
    importance: number; // 0-1 importance score
    vividness: number; // 0-1 how vivid/clear the memory is
    confidence: number; // 0-1 confidence in memory accuracy
    
    // Core experience data (rich nested document)
    experience: {
      // What happened - the main event/experience
      event: {
        name: string;
        description: string;
        type: string;
        duration: number; // milliseconds
        outcome: 'success' | 'failure' | 'partial' | 'unknown';
        significance: number; // 0-1
      };
      
      // When it happened - temporal context
      temporal: {
        startTime: Date;
        endTime: Date;
        duration: number; // milliseconds
        timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
        dayOfWeek: string;
        season?: string;
        relativeTime: string; // "2 hours ago", "last week", etc.
      };
      
      // Where it happened - spatial context
      spatial: {
        location: string;
        environment: string;
        coordinates?: { lat: number; lng: number };
        setting: 'indoor' | 'outdoor' | 'virtual' | 'mixed';
        proximity: Record<string, number>; // distances to important objects/people
      };
      
      // Who was involved - social context (nested array)
      participants: Array<{
        id: string;
        name: string;
        role: string;
        relationship: string;
        involvement: 'primary' | 'secondary' | 'observer' | 'mentioned';
        emotions: Array<{
          emotion: string;
          intensity: number; // 0-1
          duration: number; // milliseconds
        }>;
        actions: Array<{
          action: string;
          timestamp: Date;
          impact: number; // -1 to 1
        }>;
      }>;
      
      // What was the context - environmental and situational
      context: {
        // Physical environment
        physical: {
          weather?: string;
          lighting: string;
          noise_level: number; // 0-1
          temperature?: number;
          objects: Array<{
            object: string;
            relevance: number; // 0-1
            interaction: boolean;
          }>;
        };
        
        // Social environment
        social: {
          group_size: number;
          group_dynamics: string;
          social_roles: Record<string, string>;
          communication_style: string;
          cultural_context: Record<string, any>;
        };
        
        // Cognitive environment
        cognitive: {
          mental_state: string;
          attention_level: number; // 0-1
          stress_level: number; // 0-1
          motivation: number; // 0-1
          goals: Array<{
            goal: string;
            priority: number; // 0-1
            achieved: boolean;
          }>;
        };
        
        // Emotional environment
        emotional: {
          mood: string;
          emotional_state: Array<{
            emotion: string;
            intensity: number; // 0-1
            valence: number; // -1 to 1 (negative to positive)
            arousal: number; // 0-1 (calm to excited)
          }>;
          emotional_triggers: string[];
          emotional_regulation: string;
        };
      };
      
      // Sensory details (rich nested arrays)
      sensory: {
        visual: Array<{
          description: string;
          vividness: number; // 0-1
          color_palette: string[];
          movement: boolean;
          focus_point: string;
        }>;
        auditory: Array<{
          sound: string;
          volume: number; // 0-1
          pitch: string;
          duration: number; // milliseconds
          emotional_impact: number; // -1 to 1
        }>;
        tactile: Array<{
          sensation: string;
          intensity: number; // 0-1
          texture: string;
          temperature: string;
          location: string; // on body
        }>;
        olfactory: Array<{
          smell: string;
          intensity: number; // 0-1
          pleasantness: number; // -1 to 1
          associations: string[];
        }>;
        gustatory: Array<{
          taste: string;
          intensity: number; // 0-1
          pleasantness: number; // -1 to 1
          associations: string[];
        }>;
      };
      
      // Actions and behaviors (sequential array)
      actions: Array<{
        sequence: number;
        timestamp: Date;
        actor: string; // who performed the action
        action: {
          type: string;
          description: string;
          intent: string;
          method: string;
          tools_used: string[];
          effort_level: number; // 0-1
        };
        result: {
          immediate: string;
          delayed?: string;
          unexpected?: string;
          satisfaction: number; // 0-1
        };
        learning: {
          new_knowledge: string[];
          skills_practiced: string[];
          mistakes_made: string[];
          insights_gained: string[];
        };
      }>;
      
      // Dialogue and communication (nested conversation structure)
      communication: Array<{
        sequence: number;
        timestamp: Date;
        speaker: string;
        listener: string[];
        content: {
          verbal: {
            words: string;
            tone: string;
            volume: number; // 0-1
            pace: string;
            language: string;
          };
          nonverbal: {
            gestures: string[];
            facial_expression: string;
            body_language: string;
            eye_contact: boolean;
            proximity: number; // distance in meters
          };
          intent: string;
          emotion: string;
          subtext?: string;
        };
        response: {
          immediate: string;
          emotional: string;
          behavioral: string;
          understanding: number; // 0-1
        };
      }>;
    };
    
    // Memory processing and organization
    processing: {
      // Encoding details
      encoding: {
        attention_level: number; // 0-1 during encoding
        encoding_strategy: string;
        interference: string[];
        consolidation_status: 'fresh' | 'consolidating' | 'consolidated' | 'reconsolidating';
        rehearsal_count: number;
      };
      
      // Retrieval patterns
      retrieval: {
        access_count: number;
        last_accessed: Date;
        retrieval_cues: Array<{
          cue: string;
          effectiveness: number; // 0-1
          type: 'temporal' | 'spatial' | 'semantic' | 'emotional' | 'sensory';
        }>;
        retrieval_context: Array<{
          context: string;
          success_rate: number; // 0-1
        }>;
      };
      
      // Memory connections (rich relationship mapping)
      connections: {
        // Similar episodes
        similar_episodes: Array<{
          episode_id: string;
          similarity_score: number; // 0-1
          similarity_type: 'temporal' | 'spatial' | 'semantic' | 'emotional' | 'procedural';
          shared_elements: string[];
        }>;
        
        // Causal relationships
        causal_links: Array<{
          related_episode_id: string;
          relationship_type: 'cause' | 'effect' | 'enabling' | 'preventing';
          strength: number; // 0-1
          confidence: number; // 0-1
        }>;
        
        // Thematic connections
        themes: Array<{
          theme: string;
          relevance: number; // 0-1
          related_episodes: string[];
        }>;
        
        // Emotional connections
        emotional_links: Array<{
          emotion: string;
          intensity: number; // 0-1
          related_episodes: string[];
          emotional_pattern: string;
        }>;
      };
      
      // Memory evolution and updates
      evolution: {
        original_version: Date;
        modifications: Array<{
          timestamp: Date;
          type: 'detail_added' | 'detail_changed' | 'interpretation_updated' | 'connection_added';
          description: string;
          confidence_change: number; // change in confidence
          trigger: string; // what caused the modification
        }>;
        stability: number; // 0-1 how stable/unchanging the memory is
        reconstruction_count: number; // how many times memory has been reconstructed
      };
    };
    
    // Learning and insights derived from episode (restructured to avoid parallel arrays)
    learning: {
      // Combined learning items to avoid parallel array indexing issues
      learningItems: Array<{
        id: string;
        type: 'knowledge' | 'skill' | 'insight';
        category: 'factual' | 'procedural' | 'conceptual' | 'metacognitive' | 'self_knowledge' | 'world_knowledge' | 'relationship_knowledge' | 'strategic_knowledge';
        content: string;
        confidence: number; // 0-1
        generalizability?: number; // 0-1 (for knowledge)
        application_contexts?: string[]; // (for knowledge)
        level_before?: number; // 0-1 (for skills)
        level_after?: number; // 0-1 (for skills)
        practice_quality?: number; // 0-1 (for skills)
        feedback_received?: string[]; // (for skills)
        depth?: number; // 0-1 (for insights)
        actionability?: number; // 0-1 (for insights)
        emotional_impact?: number; // -1 to 1 (for insights)
      }>;
      
      // Behavioral patterns identified
      patterns: Array<{
        pattern: string;
        frequency: number;
        effectiveness: number; // 0-1
        contexts: string[];
        recommendations: string[];
      }>;
    };
    
    // Emotional and psychological aspects
    psychology: {
      // Emotional processing
      emotions: Array<{
        emotion: string;
        intensity: number; // 0-1
        duration: number; // milliseconds
        trigger: string;
        regulation_strategy: string;
        resolution: string;
      }>;
      
      // Psychological impact
      impact: {
        self_concept: number; // -1 to 1 impact on self-concept
        confidence: number; // -1 to 1 impact on confidence
        motivation: number; // -1 to 1 impact on motivation
        stress_level: number; // -1 to 1 impact on stress
        life_satisfaction: number; // -1 to 1 impact on life satisfaction
      };
      
      // Coping and adaptation
      coping: {
        strategies_used: string[];
        effectiveness: Record<string, number>; // strategy -> effectiveness (0-1)
        support_sought: string[];
        adaptation_outcome: string;
      };
    };
  };
  
  // Metadata and quality indicators
  metadata: {
    framework: string;
    version: string;
    source: string;
    reliability: number; // 0-1
    completeness: number; // 0-1 how complete the memory record is
    lastValidated: Date;
    
    // Memory quality indicators
    quality: {
      detail_richness: number; // 0-1
      coherence: number; // 0-1 internal consistency
      plausibility: number; // 0-1 how plausible the memory is
      uniqueness: number; // 0-1 how unique/distinctive
    };
    
    // Storage and retrieval optimization
    storage: {
      compression_level: number; // 0-1
      indexing_priority: number; // 0-1
      archival_status: 'active' | 'archived' | 'compressed' | 'deleted';
      backup_copies: number;
    };
  };
}

export interface EpisodicFilter {
  agentId?: string;
  'episode.type'?: string;
  'episode.category'?: string;
  'episode.importance'?: { $gte?: number; $lte?: number };
  'episode.experience.temporal.startTime'?: { $gte?: Date; $lte?: Date };
  'episode.experience.participants.name'?: string;
  'episode.experience.spatial.location'?: string;
  timestamp?: { $gte?: Date; $lte?: Date };
}

/**
 * EpisodicMemoryCollection - Manages episodic memories using MongoDB Atlas rich document storage
 * 
 * This collection demonstrates MongoDB Atlas EXCLUSIVE features:
 * - Rich BSON document storage for complex episodic memories
 * - Nested documents and arrays for multi-layered experiences
 * - Advanced querying capabilities for episodic retrieval
 * - Complex data modeling for temporal and contextual memory organization
 * 
 * CRITICAL: Optimized for MongoDB Atlas (not local MongoDB)
 */
export class EpisodicMemoryCollection extends BaseCollection<EpisodicMemory> {
  protected collectionName = 'agent_episodic_memories';

  constructor(db: Db) {
    super(db);
    this.collection = db.collection<EpisodicMemory>(this.collectionName);
  }

  /**
   * Create indexes optimized for episodic memory retrieval and Atlas performance
   * Following MongoDB Atlas documentation for rich document storage optimization
   */
  async createIndexes(): Promise<void> {
    try {
      // Agent and episode identification index
      await this.collection.createIndex({
        agentId: 1,
        'episode.id': 1,
        'episode.type': 1,
        timestamp: -1
      }, {
        name: 'agent_episode_type',
        background: true
      });

      // Importance and temporal index for priority retrieval
      await this.collection.createIndex({
        'episode.importance': -1,
        'episode.experience.temporal.startTime': -1,
        'episode.vividness': -1
      }, {
        name: 'importance_temporal_vividness',
        background: true
      });

      // Spatial and location-based index
      await this.collection.createIndex({
        'episode.experience.spatial.location': 1,
        'episode.experience.spatial.environment': 1,
        'episode.category': 1
      }, {
        name: 'spatial_location_category',
        background: true
      });

      // Participant and social context index
      await this.collection.createIndex({
        'episode.experience.participants.name': 1,
        'episode.experience.participants.role': 1,
        'episode.type': 1
      }, {
        name: 'participants_social_context',
        background: true
      });

      // Emotional and psychological index
      await this.collection.createIndex({
        'episode.psychology.emotions.emotion': 1,
        'episode.psychology.emotions.intensity': -1,
        'episode.psychology.impact.self_concept': -1
      }, {
        name: 'emotional_psychological_impact',
        background: true
      });

      // Learning and knowledge index
      await this.collection.createIndex({
        'episode.learning.knowledge.type': 1,
        'episode.learning.insights.type': 1,
        'episode.learning.skills.skill': 1
      }, {
        name: 'learning_knowledge_skills',
        background: true
      });

      // Memory connections and relationships index
      await this.collection.createIndex({
        'episode.processing.connections.similar_episodes.episode_id': 1,
        'episode.processing.connections.causal_links.related_episode_id': 1,
        'episode.processing.connections.themes.theme': 1
      }, {
        name: 'memory_connections_relationships',
        background: true
      });

      // Retrieval and access patterns index
      await this.collection.createIndex({
        'episode.processing.retrieval.access_count': -1,
        'episode.processing.retrieval.last_accessed': -1,
        'episode.processing.encoding.consolidation_status': 1
      }, {
        name: 'retrieval_access_patterns',
        background: true
      });

      // Quality and reliability index
      await this.collection.createIndex({
        'metadata.quality.detail_richness': -1,
        'metadata.quality.coherence': -1,
        'metadata.reliability': -1
      }, {
        name: 'quality_reliability',
        background: true
      });

      console.log('✅ EpisodicMemoryCollection indexes created successfully');
      console.log('📝 Note: Optimized for MongoDB Atlas rich document storage capabilities');
    } catch (error) {
      console.error('❌ Error creating EpisodicMemoryCollection indexes:', error);
      throw error;
    }
  }

  /**
   * Store an episodic memory
   */
  async storeEpisodicMemory(memory: Omit<EpisodicMemory, '_id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const doc: EpisodicMemory = {
      ...memory,
      _id: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await this.collection.insertOne(doc);
    return result.insertedId.toString();
  }

  /**
   * Get episodic memories for an agent
   */
  async getAgentEpisodicMemories(agentId: string, filter: Partial<EpisodicFilter> = {}): Promise<EpisodicMemory[]> {
    const query: EpisodicFilter = { agentId, ...filter };
    return await this.collection.find(query).sort({ 'episode.importance': -1, timestamp: -1 }).toArray();
  }

  /**
   * Find memories by rich contextual search using MongoDB Atlas advanced querying
   * Based on official MongoDB Atlas documentation for complex document queries
   */
  async findMemoriesByContext(
    agentId: string,
    context: {
      temporal?: { startDate?: Date; endDate?: Date; timeOfDay?: string };
      spatial?: { location?: string; environment?: string };
      social?: { participants?: string[]; groupSize?: number };
      emotional?: { emotions?: string[]; minIntensity?: number };
      thematic?: { themes?: string[]; categories?: string[] };
    },
    options: {
      limit?: number;
      minImportance?: number;
      sortBy?: 'importance' | 'recency' | 'vividness' | 'relevance';
    } = {}
  ): Promise<EpisodicMemory[]> {
    const pipeline: any[] = [
      { $match: { agentId } }
    ];

    // Build complex query based on context
    const contextQuery: any = {};

    if (context.temporal) {
      if (context.temporal.startDate || context.temporal.endDate) {
        contextQuery['episode.experience.temporal.startTime'] = {};
        if (context.temporal.startDate) {
          contextQuery['episode.experience.temporal.startTime'].$gte = context.temporal.startDate;
        }
        if (context.temporal.endDate) {
          contextQuery['episode.experience.temporal.startTime'].$lte = context.temporal.endDate;
        }
      }
      if (context.temporal.timeOfDay) {
        contextQuery['episode.experience.temporal.timeOfDay'] = context.temporal.timeOfDay;
      }
    }

    if (context.spatial) {
      if (context.spatial.location) {
        contextQuery['episode.experience.spatial.location'] = { $regex: context.spatial.location, $options: 'i' };
      }
      if (context.spatial.environment) {
        contextQuery['episode.experience.spatial.environment'] = { $regex: context.spatial.environment, $options: 'i' };
      }
    }

    if (context.social) {
      if (context.social.participants && context.social.participants.length > 0) {
        contextQuery['episode.experience.participants.name'] = { $in: context.social.participants };
      }
      if (context.social.groupSize) {
        contextQuery['episode.experience.context.social.group_size'] = context.social.groupSize;
      }
    }

    if (context.emotional) {
      if (context.emotional.emotions && context.emotional.emotions.length > 0) {
        contextQuery['episode.psychology.emotions.emotion'] = { $in: context.emotional.emotions };
      }
      if (context.emotional.minIntensity) {
        contextQuery['episode.psychology.emotions.intensity'] = { $gte: context.emotional.minIntensity };
      }
    }

    if (context.thematic) {
      if (context.thematic.themes && context.thematic.themes.length > 0) {
        contextQuery['episode.processing.connections.themes.theme'] = { $in: context.thematic.themes };
      }
      if (context.thematic.categories && context.thematic.categories.length > 0) {
        contextQuery['episode.category'] = { $in: context.thematic.categories };
      }
    }

    if (options.minImportance) {
      contextQuery['episode.importance'] = { $gte: options.minImportance };
    }

    if (Object.keys(contextQuery).length > 0) {
      pipeline.push({ $match: contextQuery });
    }

    // Add sorting
    const sortField = options.sortBy || 'importance';
    const sortStage: any = {};
    switch (sortField) {
      case 'importance':
        sortStage['episode.importance'] = -1;
        break;
      case 'recency':
        sortStage['episode.experience.temporal.startTime'] = -1;
        break;
      case 'vividness':
        sortStage['episode.vividness'] = -1;
        break;
      case 'relevance':
        sortStage['episode.processing.retrieval.access_count'] = -1;
        break;
    }
    pipeline.push({ $sort: sortStage });

    // Add limit
    if (options.limit) {
      pipeline.push({ $limit: options.limit });
    }

    return await this.collection.aggregate(pipeline).toArray() as EpisodicMemory[];
  }

  /**
   * Find episodic patterns using MongoDB Atlas aggregation
   */
  async findEpisodicPatterns(agentId: string): Promise<{
    commonExperiences: Array<{ type: string; frequency: number; averageImportance: number }>;
    frequentLocations: Array<{ location: string; frequency: number; averageVividness: number }>;
    socialPatterns: Array<{ participant: string; frequency: number; averageEmotionalImpact: number }>;
    emotionalPatterns: Array<{ emotion: string; frequency: number; averageIntensity: number }>;
    learningPatterns: Array<{ knowledgeType: string; frequency: number; averageConfidence: number }>;
    temporalPatterns: Array<{ timeOfDay: string; frequency: number; averageImportance: number }>;
  }> {
    const pipeline = [
      { $match: { agentId } },
      {
        $facet: {
          commonExperiences: [
            {
              $group: {
                _id: '$episode.type',
                frequency: { $sum: 1 },
                averageImportance: { $avg: '$episode.importance' }
              }
            },
            { $sort: { frequency: -1 } },
            { $limit: 10 },
            {
              $project: {
                type: '$_id',
                frequency: 1,
                averageImportance: 1,
                _id: 0
              }
            }
          ],
          frequentLocations: [
            {
              $group: {
                _id: '$episode.experience.spatial.location',
                frequency: { $sum: 1 },
                averageVividness: { $avg: '$episode.vividness' }
              }
            },
            { $sort: { frequency: -1 } },
            { $limit: 10 },
            {
              $project: {
                location: '$_id',
                frequency: 1,
                averageVividness: 1,
                _id: 0
              }
            }
          ],
          socialPatterns: [
            { $unwind: '$episode.experience.participants' },
            {
              $group: {
                _id: '$episode.experience.participants.name',
                frequency: { $sum: 1 },
                averageEmotionalImpact: { $avg: '$episode.psychology.impact.self_concept' }
              }
            },
            { $sort: { frequency: -1 } },
            { $limit: 10 },
            {
              $project: {
                participant: '$_id',
                frequency: 1,
                averageEmotionalImpact: 1,
                _id: 0
              }
            }
          ],
          emotionalPatterns: [
            { $unwind: '$episode.psychology.emotions' },
            {
              $group: {
                _id: '$episode.psychology.emotions.emotion',
                frequency: { $sum: 1 },
                averageIntensity: { $avg: '$episode.psychology.emotions.intensity' }
              }
            },
            { $sort: { frequency: -1 } },
            { $limit: 10 },
            {
              $project: {
                emotion: '$_id',
                frequency: 1,
                averageIntensity: 1,
                _id: 0
              }
            }
          ],
          learningPatterns: [
            { $unwind: '$episode.learning.knowledge' },
            {
              $group: {
                _id: '$episode.learning.knowledge.type',
                frequency: { $sum: 1 },
                averageConfidence: { $avg: '$episode.learning.knowledge.confidence' }
              }
            },
            { $sort: { frequency: -1 } },
            {
              $project: {
                knowledgeType: '$_id',
                frequency: 1,
                averageConfidence: 1,
                _id: 0
              }
            }
          ],
          temporalPatterns: [
            {
              $group: {
                _id: '$episode.experience.temporal.timeOfDay',
                frequency: { $sum: 1 },
                averageImportance: { $avg: '$episode.importance' }
              }
            },
            { $sort: { frequency: -1 } },
            {
              $project: {
                timeOfDay: '$_id',
                frequency: 1,
                averageImportance: 1,
                _id: 0
              }
            }
          ]
        }
      }
    ];

    const results = await this.collection.aggregate(pipeline).toArray();
    return results[0] as any || {
      commonExperiences: [],
      frequentLocations: [],
      socialPatterns: [],
      emotionalPatterns: [],
      learningPatterns: [],
      temporalPatterns: []
    };
  }

  /**
   * Update memory access patterns and retrieval statistics
   */
  async updateMemoryAccess(episodeId: string, retrievalContext: string): Promise<void> {
    await this.collection.updateOne(
      { 'episode.id': episodeId },
      {
        $inc: { 'episode.processing.retrieval.access_count': 1 },
        $set: { 'episode.processing.retrieval.last_accessed': new Date() },
        $push: {
          'episode.processing.retrieval.retrieval_context': {
            context: retrievalContext,
            timestamp: new Date(),
            success_rate: 1.0
          }
        }
      }
    );
  }

  /**
   * Find related memories using rich document relationships
   */
  async findRelatedMemories(
    episodeId: string,
    relationshipTypes: Array<'similar' | 'causal' | 'thematic' | 'emotional'> = ['similar'],
    limit: number = 10
  ): Promise<Array<{
    memory: EpisodicMemory;
    relationshipType: string;
    strength: number;
    sharedElements: string[];
  }>> {
    // First get the source memory
    const sourceMemory = await this.collection.findOne({ 'episode.id': episodeId });
    if (!sourceMemory) {
      return [];
    }

    const relatedMemories = [];

    for (const relType of relationshipTypes) {
      let relatedIds: string[] = [];

      switch (relType) {
        case 'similar':
          relatedIds = sourceMemory.episode.processing.connections.similar_episodes.map(se => se.episode_id);
          break;
        case 'causal':
          relatedIds = sourceMemory.episode.processing.connections.causal_links.map(cl => cl.related_episode_id);
          break;
        case 'thematic':
          // Find memories with shared themes
          const themes = sourceMemory.episode.processing.connections.themes.map(t => t.theme);
          if (themes.length > 0) {
            const thematicMemories = await this.collection.find({
              'episode.processing.connections.themes.theme': { $in: themes },
              'episode.id': { $ne: episodeId }
            }).limit(limit).toArray();

            for (const memory of thematicMemories) {
              relatedMemories.push({
                memory,
                relationshipType: 'thematic',
                strength: 0.7, // Default thematic strength
                sharedElements: themes
              });
            }
          }
          continue;
        case 'emotional':
          // Find memories with similar emotional patterns
          const emotions = sourceMemory.episode.psychology.emotions.map(e => e.emotion);
          if (emotions.length > 0) {
            const emotionalMemories = await this.collection.find({
              'episode.psychology.emotions.emotion': { $in: emotions },
              'episode.id': { $ne: episodeId }
            }).limit(limit).toArray();

            for (const memory of emotionalMemories) {
              relatedMemories.push({
                memory,
                relationshipType: 'emotional',
                strength: 0.6, // Default emotional strength
                sharedElements: emotions
              });
            }
          }
          continue;
      }

      // For similar and causal relationships, get the actual memories
      if (relatedIds.length > 0) {
        const memories = await this.collection.find({
          'episode.id': { $in: relatedIds }
        }).limit(limit).toArray();

        for (const memory of memories) {
          const connection = relType === 'similar'
            ? sourceMemory.episode.processing.connections.similar_episodes.find(se => se.episode_id === memory.episode.id)
            : sourceMemory.episode.processing.connections.causal_links.find(cl => cl.related_episode_id === memory.episode.id);

          if (connection) {
            relatedMemories.push({
              memory,
              relationshipType: relType,
              strength: (connection as any).similarity_score || (connection as any).strength || 0.5,
              sharedElements: (connection as any).shared_elements || []
            });
          }
        }
      }
    }

    // Sort by strength and return top results
    return relatedMemories
      .sort((a, b) => b.strength - a.strength)
      .slice(0, limit);
  }

  /**
   * Get memory statistics and insights
   */
  async getMemoryStatistics(agentId: string): Promise<{
    totalMemories: number;
    averageImportance: number;
    averageVividness: number;
    memoryTypes: Record<string, number>;
    temporalDistribution: Record<string, number>;
    emotionalProfile: Record<string, number>;
    learningProgress: {
      totalKnowledge: number;
      skillsDeveloped: number;
      insightsGained: number;
    };
  }> {
    const pipeline = [
      { $match: { agentId } },
      {
        $group: {
          _id: null,
          totalMemories: { $sum: 1 },
          averageImportance: { $avg: '$episode.importance' },
          averageVividness: { $avg: '$episode.vividness' },
          memoryTypes: { $push: '$episode.type' },
          timeOfDay: { $push: '$episode.experience.temporal.timeOfDay' },
          emotions: { $push: '$episode.psychology.emotions' },
          knowledge: { $push: '$episode.learning.knowledge' },
          skills: { $push: '$episode.learning.skills' },
          insights: { $push: '$episode.learning.insights' }
        }
      }
    ];

    const results = await this.collection.aggregate(pipeline).toArray();
    const data = results[0] as any;

    if (!data) {
      return {
        totalMemories: 0,
        averageImportance: 0,
        averageVividness: 0,
        memoryTypes: {},
        temporalDistribution: {},
        emotionalProfile: {},
        learningProgress: { totalKnowledge: 0, skillsDeveloped: 0, insightsGained: 0 }
      };
    }

    // Process memory types
    const memoryTypes: Record<string, number> = {};
    data.memoryTypes.forEach((type: string) => {
      memoryTypes[type] = (memoryTypes[type] || 0) + 1;
    });

    // Process temporal distribution
    const temporalDistribution: Record<string, number> = {};
    data.timeOfDay.forEach((time: string) => {
      if (time) {
        temporalDistribution[time] = (temporalDistribution[time] || 0) + 1;
      }
    });

    // Process emotional profile
    const emotionalProfile: Record<string, number> = {};
    data.emotions.forEach((emotionArray: any[]) => {
      if (Array.isArray(emotionArray)) {
        emotionArray.forEach((emotion: any) => {
          if (emotion && emotion.emotion) {
            emotionalProfile[emotion.emotion] = (emotionalProfile[emotion.emotion] || 0) + 1;
          }
        });
      }
    });

    // Process learning progress
    const totalKnowledge = data.knowledge.reduce((sum: number, knowledgeArray: any[]) => {
      return sum + (Array.isArray(knowledgeArray) ? knowledgeArray.length : 0);
    }, 0);

    const skillsDeveloped = data.skills.reduce((sum: number, skillsArray: any[]) => {
      return sum + (Array.isArray(skillsArray) ? skillsArray.length : 0);
    }, 0);

    const insightsGained = data.insights.reduce((sum: number, insightsArray: any[]) => {
      return sum + (Array.isArray(insightsArray) ? insightsArray.length : 0);
    }, 0);

    return {
      totalMemories: data.totalMemories,
      averageImportance: data.averageImportance || 0,
      averageVividness: data.averageVividness || 0,
      memoryTypes,
      temporalDistribution,
      emotionalProfile,
      learningProgress: {
        totalKnowledge,
        skillsDeveloped,
        insightsGained
      }
    };
  }
}
