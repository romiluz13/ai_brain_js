/**
 * @file EpisodicMemoryEngine - Advanced episodic memory system using MongoDB Atlas rich document storage
 * 
 * This engine demonstrates MongoDB Atlas rich document storage capabilities for episodic memory.
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
 * - Contextual memory retrieval and organization
 * - Temporal and spatial memory indexing
 * - Emotional and social memory patterns
 * - Learning and insight extraction from experiences
 */

import { Db } from 'mongodb';
import { EpisodicMemoryCollection, EpisodicMemory } from '../collections/EpisodicMemoryCollection';

export interface MemoryStorageRequest {
  agentId: string;
  experience: {
    event: {
      name: string;
      description: string;
      type: string;
      duration: number;
      outcome: 'success' | 'failure' | 'partial' | 'unknown';
      significance: number;
    };
    temporal: {
      startTime: Date;
      endTime: Date;
      timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
      dayOfWeek: string;
    };
    spatial: {
      location: string;
      environment: string;
      setting: 'indoor' | 'outdoor' | 'virtual' | 'mixed';
    };
    participants: Array<{
      name: string;
      role: string;
      relationship: string;
      involvement: 'primary' | 'secondary' | 'observer' | 'mentioned';
    }>;
    context: Record<string, any>;
    emotions: Array<{
      emotion: string;
      intensity: number;
      valence: number;
      arousal: number;
    }>;
  };
  
  // Memory processing parameters
  processing: {
    importance: number;
    vividness: number;
    confidence: number;
    encodingStrategy: string;
  };
  
  // Learning and insights
  learning?: {
    knowledge: Array<{
      type: 'factual' | 'procedural' | 'conceptual' | 'metacognitive';
      content: string;
      confidence: number;
    }>;
    skills: Array<{
      skill: string;
      levelBefore: number;
      levelAfter: number;
    }>;
    insights: Array<{
      insight: string;
      type: 'self_knowledge' | 'world_knowledge' | 'relationship_knowledge' | 'strategic_knowledge';
      depth: number;
    }>;
  };
}

export interface MemoryRetrievalRequest {
  agentId: string;
  query: {
    type: 'contextual' | 'temporal' | 'spatial' | 'social' | 'emotional' | 'thematic' | 'free_text';
    parameters: Record<string, any>;
  };
  
  // Retrieval constraints
  constraints: {
    timeRange?: { start: Date; end: Date };
    minImportance?: number;
    maxResults?: number;
    includeRelated?: boolean;
    sortBy?: 'importance' | 'recency' | 'vividness' | 'relevance';
  };
  
  // Context for retrieval
  context: {
    currentSituation?: string;
    currentEmotions?: string[];
    currentGoals?: string[];
    retrievalPurpose: 'decision_making' | 'learning' | 'reflection' | 'planning' | 'social_interaction';
  };
}

export interface MemoryRetrievalResult {
  query: MemoryRetrievalRequest['query'];
  
  // Retrieved memories
  memories: Array<{
    memory: EpisodicMemory;
    relevanceScore: number;
    retrievalReason: string;
    contextualFit: number;
  }>;
  
  // Related memories
  relatedMemories: Array<{
    memory: EpisodicMemory;
    relationshipType: string;
    strength: number;
    sharedElements: string[];
  }>;
  
  // Memory patterns and insights
  patterns: {
    temporalPatterns: Array<{ pattern: string; frequency: number; significance: number }>;
    spatialPatterns: Array<{ pattern: string; frequency: number; significance: number }>;
    socialPatterns: Array<{ pattern: string; frequency: number; significance: number }>;
    emotionalPatterns: Array<{ pattern: string; frequency: number; significance: number }>;
  };
  
  // Retrieval metadata
  metadata: {
    retrievalTime: number;
    memoriesExplored: number;
    patternsDetected: number;
    retrievalStrategy: string;
  };
}

export interface MemoryAnalysisRequest {
  agentId: string;
  analysisType: 'patterns' | 'insights' | 'learning_progress' | 'emotional_profile' | 'social_network' | 'temporal_trends';
  timeRange?: { start: Date; end: Date };
  focusAreas?: string[];
}

/**
 * EpisodicMemoryEngine - Advanced episodic memory using MongoDB Atlas rich document storage
 * 
 * This engine demonstrates MongoDB Atlas EXCLUSIVE capabilities:
 * - Rich BSON document storage for complex episodic memories
 * - Nested documents and arrays for multi-layered experiences
 * - Advanced querying capabilities for contextual memory retrieval
 * - Complex data modeling for temporal and spatial memory organization
 * 
 * CRITICAL: Optimized for MongoDB Atlas (not local MongoDB)
 */
export class EpisodicMemoryEngine {
  private episodicCollection: EpisodicMemoryCollection;
  private isInitialized = false;

  constructor(private db: Db) {
    this.episodicCollection = new EpisodicMemoryCollection(db);
  }

  /**
   * Initialize the episodic memory engine
   */
  async initialize(): Promise<void> {
    try {
      await this.episodicCollection.createIndexes();
      this.isInitialized = true;
      console.log('EpisodicMemoryEngine initialized successfully');
      console.log('📝 Note: Optimized for MongoDB Atlas rich document storage');
    } catch (error) {
      console.error('Failed to initialize EpisodicMemoryEngine:', error);
      throw error;
    }
  }

  /**
   * Store an episodic memory using Atlas rich document storage
   */
  async storeMemory(request: MemoryStorageRequest): Promise<{
    memoryId: string;
    processingInsights: string[];
    connections: Array<{ type: string; relatedMemoryId: string; strength: number }>;
  }> {
    if (!this.isInitialized) {
      throw new Error('EpisodicMemoryEngine not initialized');
    }

    try {
      // Create rich episodic memory document
      const episodicMemory: Omit<EpisodicMemory, '_id' | 'createdAt' | 'updatedAt'> = {
        agentId: request.agentId,
        timestamp: new Date(),
        episode: {
          id: `episode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: this.categorizeExperience(request.experience),
          category: this.determineCategory(request.experience),
          importance: request.processing.importance,
          vividness: request.processing.vividness,
          confidence: request.processing.confidence,
          
          experience: {
            event: request.experience.event,
            temporal: {
              ...request.experience.temporal,
              duration: request.experience.event.duration,
              relativeTime: this.calculateRelativeTime(request.experience.temporal.startTime)
            },
            spatial: {
              ...request.experience.spatial,
              proximity: {}
            },
            participants: request.experience.participants.map((p, index) => ({
              id: (p as any).id || `participant_${index}`,
              ...p,
              emotions: request.experience.emotions.map(e => ({
                emotion: e.emotion,
                intensity: e.intensity,
                duration: request.experience.event.duration
              })),
              actions: []
            })),
            context: {
              physical: {
                lighting: 'unknown',
                noise_level: 0.5,
                objects: []
              },
              social: {
                group_size: request.experience.participants.length,
                group_dynamics: 'unknown',
                social_roles: {},
                communication_style: 'unknown',
                cultural_context: request.experience.context
              },
              cognitive: {
                mental_state: 'unknown',
                attention_level: 0.8,
                stress_level: 0.3,
                motivation: 0.7,
                goals: []
              },
              emotional: {
                mood: 'neutral',
                emotional_state: request.experience.emotions,
                emotional_triggers: [],
                emotional_regulation: 'unknown'
              }
            },
            sensory: {
              visual: [],
              auditory: [],
              tactile: [],
              olfactory: [],
              gustatory: []
            },
            actions: [],
            communication: []
          },
          
          processing: {
            encoding: {
              attention_level: 0.8,
              encoding_strategy: request.processing.encodingStrategy,
              interference: [],
              consolidation_status: 'fresh',
              rehearsal_count: 0
            },
            retrieval: {
              access_count: 0,
              last_accessed: new Date(),
              retrieval_cues: [],
              retrieval_context: []
            },
            connections: {
              similar_episodes: [],
              causal_links: [],
              themes: [],
              emotional_links: []
            },
            evolution: {
              original_version: new Date(),
              modifications: [],
              stability: 1.0,
              reconstruction_count: 0
            }
          },
          
          learning: {
            learningItems: [
              ...(request.learning?.knowledge || []).map((k: any) => ({
                id: k.id || `knowledge_${Date.now()}`,
                type: 'knowledge' as const,
                category: k.category || 'conceptual' as const,
                content: k.content || '',
                confidence: k.confidence || 0.5,
                source: k.source || 'experience',
                timestamp: new Date(),
                context: k.context || {},
                importance: k.importance || 0.5,
                retention_strength: k.retention_strength || 0.5,
                last_accessed: new Date(),
                access_count: 1
              })),
              ...(request.learning?.skills || []).map((s: any) => ({
                id: s.id || `skill_${Date.now()}`,
                type: 'skill' as const,
                category: s.category || 'procedural' as const,
                content: s.content || '',
                confidence: s.confidence || 0.5,
                source: s.source || 'experience',
                timestamp: new Date(),
                context: s.context || {},
                importance: s.importance || 0.5,
                retention_strength: s.retention_strength || 0.5,
                last_accessed: new Date(),
                access_count: 1
              })),
              ...(request.learning?.insights || []).map((i: any) => ({
                id: i.id || `insight_${Date.now()}`,
                type: 'insight' as const,
                category: i.category || 'metacognitive' as const,
                content: i.content || '',
                confidence: i.confidence || 0.5,
                source: i.source || 'experience',
                timestamp: new Date(),
                context: i.context || {},
                importance: i.importance || 0.5,
                retention_strength: i.retention_strength || 0.5,
                last_accessed: new Date(),
                access_count: 1
              }))
            ],
            patterns: []
          },
          
          psychology: {
            emotions: request.experience.emotions.map(e => ({
              emotion: e.emotion,
              intensity: e.intensity,
              duration: request.experience.event.duration,
              trigger: 'experience',
              regulation_strategy: 'unknown',
              resolution: 'unknown'
            })),
            impact: {
              self_concept: 0,
              confidence: 0,
              motivation: 0,
              stress_level: 0,
              life_satisfaction: 0
            },
            coping: {
              strategies_used: [],
              effectiveness: {},
              support_sought: [],
              adaptation_outcome: 'unknown'
            }
          }
        },
        
        metadata: {
          framework: 'episodic-memory-engine',
          version: '1.0.0',
          source: 'direct_experience',
          reliability: request.processing.confidence,
          completeness: 0.8,
          lastValidated: new Date(),
          quality: {
            detail_richness: request.processing.vividness,
            coherence: 0.9,
            plausibility: 0.95,
            uniqueness: 0.7
          },
          storage: {
            compression_level: 0,
            indexing_priority: request.processing.importance,
            archival_status: 'active',
            backup_copies: 1
          }
        }
      };

      // Store the memory
      const memoryId = await this.episodicCollection.storeEpisodicMemory(episodicMemory);

      // Find connections to existing memories
      const connections = await this.findMemoryConnections(request.agentId, episodicMemory);

      // Generate processing insights
      const processingInsights = this.generateProcessingInsights(episodicMemory, connections);

      return {
        memoryId,
        processingInsights,
        connections
      };
    } catch (error) {
      console.error('Memory storage failed:', error);
      throw error;
    }
  }

  /**
   * Retrieve memories using contextual search with Atlas rich document queries
   */
  async retrieveMemories(request: MemoryRetrievalRequest): Promise<MemoryRetrievalResult> {
    if (!this.isInitialized) {
      throw new Error('EpisodicMemoryEngine not initialized');
    }

    const startTime = Date.now();

    try {
      let memories: EpisodicMemory[] = [];
      let retrievalStrategy = 'unknown';

      // Use different retrieval strategies based on query type
      switch (request.query.type) {
        case 'contextual':
          memories = await this.episodicCollection.findMemoriesByContext(
            request.agentId,
            request.query.parameters,
            {
              limit: request.constraints.maxResults,
              minImportance: request.constraints.minImportance,
              sortBy: request.constraints.sortBy
            }
          );
          retrievalStrategy = 'contextual_search';
          break;
          
        case 'temporal':
          memories = await this.episodicCollection.findMemoriesByContext(
            request.agentId,
            { temporal: request.query.parameters },
            {
              limit: request.constraints.maxResults,
              minImportance: request.constraints.minImportance,
              sortBy: 'recency'
            }
          );
          retrievalStrategy = 'temporal_search';
          break;
          
        case 'spatial':
          memories = await this.episodicCollection.findMemoriesByContext(
            request.agentId,
            { spatial: request.query.parameters },
            {
              limit: request.constraints.maxResults,
              minImportance: request.constraints.minImportance,
              sortBy: request.constraints.sortBy
            }
          );
          retrievalStrategy = 'spatial_search';
          break;
          
        case 'emotional':
          memories = await this.episodicCollection.findMemoriesByContext(
            request.agentId,
            { emotional: request.query.parameters },
            {
              limit: request.constraints.maxResults,
              minImportance: request.constraints.minImportance,
              sortBy: 'importance'
            }
          );
          retrievalStrategy = 'emotional_search';
          break;
          
        default:
          memories = await this.episodicCollection.getAgentEpisodicMemories(
            request.agentId,
            {
              'episode.importance': { $gte: request.constraints.minImportance || 0 }
            }
          );
          retrievalStrategy = 'general_search';
      }

      // Calculate relevance scores
      const scoredMemories = memories.map(memory => ({
        memory,
        relevanceScore: this.calculateRelevanceScore(memory, request),
        retrievalReason: this.determineRetrievalReason(memory, request),
        contextualFit: this.calculateContextualFit(memory, request.context)
      }));

      // Get related memories if requested
      let relatedMemories: any[] = [];
      if (request.constraints.includeRelated && scoredMemories.length > 0) {
        const topMemory = scoredMemories[0];
        relatedMemories = await this.episodicCollection.findRelatedMemories(
          topMemory.memory.episode.id,
          ['similar', 'thematic', 'emotional'],
          5
        );
      }

      // Detect patterns
      const patterns = await this.detectMemoryPatterns(memories);

      // Update access patterns for retrieved memories
      for (const scoredMemory of scoredMemories) {
        await this.episodicCollection.updateMemoryAccess(
          scoredMemory.memory.episode.id,
          request.context.retrievalPurpose
        );
      }

      const retrievalTime = Date.now() - startTime;

      return {
        query: request.query,
        memories: scoredMemories,
        relatedMemories,
        patterns,
        metadata: {
          retrievalTime,
          memoriesExplored: memories.length,
          patternsDetected: Object.keys(patterns).length,
          retrievalStrategy
        }
      };
    } catch (error) {
      console.error('Memory retrieval failed:', error);
      throw error;
    }
  }

  /**
   * Analyze memory patterns and insights
   */
  async analyzeMemories(request: MemoryAnalysisRequest): Promise<{
    analysis: Record<string, any>;
    insights: string[];
    recommendations: string[];
  }> {
    if (!this.isInitialized) {
      throw new Error('EpisodicMemoryEngine not initialized');
    }

    try {
      let analysis: Record<string, any> = {};
      const insights: string[] = [];
      const recommendations: string[] = [];

      switch (request.analysisType) {
        case 'patterns':
          analysis = await this.episodicCollection.findEpisodicPatterns(request.agentId);
          insights.push(`Found ${analysis.commonExperiences?.length || 0} common experience types`);
          insights.push(`Identified ${analysis.frequentLocations?.length || 0} frequent locations`);
          break;
          
        case 'learning_progress':
          const stats = await this.episodicCollection.getMemoryStatistics(request.agentId);
          analysis = stats.learningProgress;
          insights.push(`Total knowledge items: ${analysis.totalKnowledge}`);
          insights.push(`Skills developed: ${analysis.skillsDeveloped}`);
          insights.push(`Insights gained: ${analysis.insightsGained}`);
          break;
          
        case 'emotional_profile':
          const emotionalStats = await this.episodicCollection.getMemoryStatistics(request.agentId);
          analysis = emotionalStats.emotionalProfile;
          const topEmotion = Object.entries(analysis).sort(([,a], [,b]) => (b as number) - (a as number))[0];
          if (topEmotion) {
            insights.push(`Most frequent emotion: ${topEmotion[0]} (${topEmotion[1]} occurrences)`);
          }
          break;
          
        default:
          analysis = await this.episodicCollection.getMemoryStatistics(request.agentId);
          insights.push(`Total memories: ${analysis.totalMemories}`);
          insights.push(`Average importance: ${analysis.averageImportance?.toFixed(2)}`);
      }

      // Generate recommendations based on analysis
      if (request.analysisType === 'learning_progress') {
        if (analysis.totalKnowledge < 10) {
          recommendations.push('Focus on capturing more learning experiences');
        }
        if (analysis.skillsDeveloped < 5) {
          recommendations.push('Engage in more skill-building activities');
        }
      }

      return { analysis, insights, recommendations };
    } catch (error) {
      console.error('Memory analysis failed:', error);
      throw error;
    }
  }

  /**
   * Get memory statistics for an agent
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
    if (!this.isInitialized) {
      throw new Error('EpisodicMemoryEngine not initialized');
    }

    return await this.episodicCollection.getMemoryStatistics(agentId);
  }

  /**
   * Categorize experience type
   */
  private categorizeExperience(experience: any): 'experience' | 'interaction' | 'learning' | 'decision' | 'observation' | 'reflection' {
    if (experience.participants && experience.participants.length > 1) {
      return 'interaction';
    }
    if (experience.event.type.includes('learn') || experience.event.type.includes('study')) {
      return 'learning';
    }
    if (experience.event.type.includes('decide') || experience.event.type.includes('choice')) {
      return 'decision';
    }
    if (experience.event.type.includes('observe') || experience.event.type.includes('watch')) {
      return 'observation';
    }
    if (experience.event.type.includes('reflect') || experience.event.type.includes('think')) {
      return 'reflection';
    }
    return 'experience';
  }

  /**
   * Determine memory category
   */
  private determineCategory(experience: any): 'personal' | 'professional' | 'social' | 'educational' | 'emotional' | 'procedural' {
    if (experience.context && experience.context.work) {
      return 'professional';
    }
    if (experience.participants && experience.participants.length > 0) {
      return 'social';
    }
    if (experience.event.type.includes('learn') || experience.event.type.includes('education')) {
      return 'educational';
    }
    if (experience.emotions && experience.emotions.length > 0) {
      return 'emotional';
    }
    if (experience.event.type.includes('procedure') || experience.event.type.includes('process')) {
      return 'procedural';
    }
    return 'personal';
  }

  /**
   * Calculate relative time description
   */
  private calculateRelativeTime(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 1) {
      return 'just now';
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)} hours ago`;
    } else if (diffHours < 168) {
      return `${Math.floor(diffHours / 24)} days ago`;
    } else {
      return `${Math.floor(diffHours / 168)} weeks ago`;
    }
  }

  /**
   * Find connections to existing memories
   */
  private async findMemoryConnections(agentId: string, memory: any): Promise<Array<{ type: string; relatedMemoryId: string; strength: number }>> {
    // Simplified connection finding - in real implementation, this would be more sophisticated
    const recentMemories = await this.episodicCollection.getAgentEpisodicMemories(agentId, {
      'episode.experience.temporal.startTime': { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    const connections = [];
    for (const recentMemory of recentMemories.slice(0, 5)) {
      if (recentMemory.episode.id !== memory.episode.id) {
        connections.push({
          type: 'temporal',
          relatedMemoryId: recentMemory.episode.id,
          strength: 0.6
        });
      }
    }

    return connections;
  }

  /**
   * Generate processing insights
   */
  private generateProcessingInsights(memory: any, connections: any[]): string[] {
    const insights = [];
    
    insights.push(`Memory encoded with ${memory.episode.vividness.toFixed(2)} vividness`);
    insights.push(`Importance level: ${memory.episode.importance.toFixed(2)}`);
    
    if (connections.length > 0) {
      insights.push(`Connected to ${connections.length} related memories`);
    }
    
    if (memory.episode.learning.knowledge.length > 0) {
      insights.push(`Captured ${memory.episode.learning.knowledge.length} knowledge items`);
    }

    return insights;
  }

  /**
   * Calculate relevance score for memory retrieval
   */
  private calculateRelevanceScore(memory: EpisodicMemory, request: MemoryRetrievalRequest): number {
    let score = memory.episode.importance * 0.4; // Base importance
    score += memory.episode.vividness * 0.3; // Vividness factor
    score += memory.episode.confidence * 0.3; // Confidence factor
    
    // Adjust based on recency
    const daysSince = (Date.now() - memory.episode.experience.temporal.startTime.getTime()) / (1000 * 60 * 60 * 24);
    const recencyFactor = Math.exp(-daysSince / 30); // Exponential decay over 30 days
    score *= (0.7 + 0.3 * recencyFactor);
    
    return Math.min(score, 1.0);
  }

  /**
   * Determine retrieval reason
   */
  private determineRetrievalReason(memory: EpisodicMemory, request: MemoryRetrievalRequest): string {
    if (request.query.type === 'temporal') {
      return 'temporal_match';
    }
    if (request.query.type === 'spatial') {
      return 'spatial_match';
    }
    if (request.query.type === 'emotional') {
      return 'emotional_match';
    }
    return 'general_relevance';
  }

  /**
   * Calculate contextual fit
   */
  private calculateContextualFit(memory: EpisodicMemory, context: any): number {
    let fit = 0.5; // Base fit
    
    // Adjust based on current emotions
    if (context.currentEmotions && memory.episode.psychology.emotions) {
      const emotionMatch = context.currentEmotions.some((emotion: string) =>
        memory.episode.psychology.emotions.some(memEmotion => memEmotion.emotion === emotion)
      );
      if (emotionMatch) {
        fit += 0.3;
      }
    }
    
    return Math.min(fit, 1.0);
  }

  /**
   * Detect patterns in retrieved memories
   */
  private async detectMemoryPatterns(memories: EpisodicMemory[]): Promise<{
    temporalPatterns: Array<{ pattern: string; frequency: number; significance: number }>;
    spatialPatterns: Array<{ pattern: string; frequency: number; significance: number }>;
    socialPatterns: Array<{ pattern: string; frequency: number; significance: number }>;
    emotionalPatterns: Array<{ pattern: string; frequency: number; significance: number }>;
  }> {
    // Simplified pattern detection
    const temporalPatterns = [];
    const spatialPatterns = [];
    const socialPatterns = [];
    const emotionalPatterns = [];

    // Detect temporal patterns
    const timeOfDayCount: Record<string, number> = {};
    memories.forEach(memory => {
      const timeOfDay = memory.episode.experience.temporal.timeOfDay;
      timeOfDayCount[timeOfDay] = (timeOfDayCount[timeOfDay] || 0) + 1;
    });

    Object.entries(timeOfDayCount).forEach(([timeOfDay, count]) => {
      if (count > 1) {
        temporalPatterns.push({
          pattern: `Frequent ${timeOfDay} activities`,
          frequency: count,
          significance: count / memories.length
        });
      }
    });

    // Detect spatial patterns
    const locationCount: Record<string, number> = {};
    memories.forEach(memory => {
      const location = memory.episode.experience.spatial.location;
      locationCount[location] = (locationCount[location] || 0) + 1;
    });

    Object.entries(locationCount).forEach(([location, count]) => {
      if (count > 1) {
        spatialPatterns.push({
          pattern: `Frequent visits to ${location}`,
          frequency: count,
          significance: count / memories.length
        });
      }
    });

    return {
      temporalPatterns,
      spatialPatterns,
      socialPatterns,
      emotionalPatterns
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Cleanup any resources if needed
  }
}
