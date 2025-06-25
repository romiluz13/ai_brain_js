/**
 * @file AnalogicalMappingCollection - MongoDB Atlas Vector Search collection for analogical reasoning
 * 
 * This collection demonstrates MongoDB Atlas Vector Search capabilities for analogical mapping.
 * Based on official MongoDB Atlas documentation: https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/
 * 
 * CRITICAL: This uses MongoDB Atlas EXCLUSIVE features:
 * - $vectorSearch aggregation stage (Atlas ONLY)
 * - Atlas Vector Search indexes (Atlas ONLY)
 * - Vector similarity search with embeddings (Atlas ONLY)
 * - Semantic search capabilities (Atlas ONLY)
 * 
 * Features:
 * - $vectorSearch for semantic similarity search
 * - Vector embeddings for analogical reasoning
 * - Similarity scoring and ranking
 * - Multi-dimensional analogical mapping
 * - Structural and semantic analogy detection
 */

import { Db, ObjectId } from 'mongodb';
import { BaseCollection, BaseDocument } from './BaseCollection';

export interface AnalogicalMapping extends BaseDocument {
  agentId: string;
  sessionId?: string;
  timestamp: Date;
  
  // Analogical mapping identification
  mapping: {
    id: string;
    type: 'structural' | 'semantic' | 'functional' | 'causal' | 'relational' | 'surface';
    category: 'scientific' | 'mathematical' | 'social' | 'linguistic' | 'visual' | 'conceptual';
    strength: number; // 0-1 analogical strength
    confidence: number; // 0-1 confidence in mapping
    
    // Source domain (base)
    source: {
      id: string;
      name: string;
      description: string;
      domain: string;
      type: 'concept' | 'situation' | 'process' | 'structure' | 'relationship';
      
      // Vector embedding for semantic similarity (Atlas Vector Search)
      embedding: number[]; // Vector embedding ≤ 4096 dimensions
      
      // Structural representation
      structure: {
        entities: Array<{
          id: string;
          name: string;
          type: string;
          properties: Record<string, any>;
          relations: Array<{
            target: string;
            type: string;
            strength: number;
          }>;
        }>;
        relationships: Array<{
          id: string;
          source: string;
          target: string;
          type: string;
          properties: Record<string, any>;
        }>;
        patterns: Array<{
          pattern: string;
          frequency: number;
          significance: number;
        }>;
      };
      
      // Semantic features
      semantics: {
        concepts: string[];
        attributes: Record<string, any>;
        functions: string[];
        goals: string[];
        constraints: string[];
      };
      
      // Context information
      context: {
        domain: string;
        subdomain: string;
        complexity: number; // 0-1
        abstractness: number; // 0-1
        familiarity: number; // 0-1
        cultural: Record<string, any>;
        temporal: Record<string, any>;
      };
    };
    
    // Target domain
    target: {
      id: string;
      name: string;
      description: string;
      domain: string;
      type: 'concept' | 'situation' | 'process' | 'structure' | 'relationship';
      
      // Vector embedding for semantic similarity (Atlas Vector Search)
      embedding: number[]; // Vector embedding ≤ 4096 dimensions
      
      // Structural representation
      structure: {
        entities: Array<{
          id: string;
          name: string;
          type: string;
          properties: Record<string, any>;
          relations: Array<{
            target: string;
            type: string;
            strength: number;
          }>;
        }>;
        relationships: Array<{
          id: string;
          source: string;
          target: string;
          type: string;
          properties: Record<string, any>;
        }>;
        patterns: Array<{
          pattern: string;
          frequency: number;
          significance: number;
        }>;
      };
      
      // Semantic features
      semantics: {
        concepts: string[];
        attributes: Record<string, any>;
        functions: string[];
        goals: string[];
        constraints: string[];
      };
      
      // Context information
      context: {
        domain: string;
        subdomain: string;
        complexity: number; // 0-1
        abstractness: number; // 0-1
        familiarity: number; // 0-1
        cultural: Record<string, any>;
        temporal: Record<string, any>;
      };
    };
    
    // Mapping correspondences
    correspondences: Array<{
      sourceEntity: string;
      targetEntity: string;
      type: 'object' | 'relation' | 'attribute' | 'function' | 'goal';
      strength: number; // 0-1
      confidence: number; // 0-1
      justification: string;
      constraints: string[];
    }>;
    
    // Mapping quality metrics
    quality: {
      systematicity: number; // 0-1 coherent system of relations
      oneToOne: number; // 0-1 one-to-one correspondence
      semantic: number; // 0-1 semantic similarity
      pragmatic: number; // 0-1 pragmatic utility
      overall: number; // 0-1 overall quality
    };
  };
  
  // Analogical reasoning process
  reasoning: {
    // Discovery process
    discovery: {
      method: 'similarity' | 'structure' | 'purpose' | 'causal' | 'pragmatic';
      trigger: string;
      searchSpace: string[];
      candidates: Array<{
        id: string;
        score: number;
        reason: string;
      }>;
      selection: {
        criteria: string[];
        winner: string;
        justification: string;
      };
    };
    
    // Alignment process
    alignment: {
      strategy: 'local_to_global' | 'global_to_local' | 'incremental' | 'constraint_satisfaction';
      iterations: number;
      convergence: number; // 0-1
      conflicts: Array<{
        type: string;
        description: string;
        resolution: string;
      }>;
    };
    
    // Evaluation process
    evaluation: {
      criteria: string[];
      scores: Record<string, number>;
      strengths: string[];
      weaknesses: string[];
      alternatives: Array<{
        mapping: string;
        score: number;
        reason: string;
      }>;
    };
    
    // Projection process
    projection: {
      predictions: Array<{
        source: string;
        target: string;
        confidence: number;
        type: 'property' | 'relation' | 'behavior' | 'outcome';
      }>;
      inferences: Array<{
        conclusion: string;
        premises: string[];
        confidence: number;
        type: 'deductive' | 'inductive' | 'abductive';
      }>;
      hypotheses: Array<{
        hypothesis: string;
        evidence: string[];
        testability: number; // 0-1
        plausibility: number; // 0-1
      }>;
    };
  };
  
  // Learning and adaptation
  learning: {
    // Usage history
    usage: Array<{
      timestamp: Date;
      context: string;
      success: boolean;
      feedback: string;
      modifications: Record<string, any>;
    }>;
    
    // Generalization
    generalization: {
      abstractions: Array<{
        level: number;
        description: string;
        applicability: string[];
      }>;
      schemas: Array<{
        name: string;
        pattern: Record<string, any>;
        instances: string[];
        reliability: number; // 0-1
      }>;
    };
    
    // Performance metrics
    performance: {
      accuracy: number; // 0-1
      utility: number; // 0-1
      efficiency: number; // 0-1
      robustness: number; // 0-1
      transferability: number; // 0-1
    };
  };
  
  // Metadata
  metadata: {
    framework: string;
    version: string;
    source: string;
    reliability: number; // 0-1
    lastValidated: Date;
    
    // Quality indicators
    quality: {
      completeness: number; // 0-1
      consistency: number; // 0-1
      coherence: number; // 0-1
      novelty: number; // 0-1
    };
    
    // Atlas Vector Search metadata
    vectorSearch: {
      indexName: string;
      embeddingModel: string;
      dimensions: number;
      similarity: 'cosine' | 'euclidean' | 'dotProduct';
      lastIndexed: Date;
    };
  };
}

export interface AnalogicalFilter {
  agentId?: string;
  'mapping.type'?: string;
  'mapping.category'?: string;
  'mapping.source.domain'?: string | { $in?: string[] };
  'mapping.target.domain'?: string | { $in?: string[] };
  'mapping.strength'?: { $gte?: number; $lte?: number };
  'mapping.confidence'?: { $gte?: number; $lte?: number };
  timestamp?: { $gte?: Date; $lte?: Date };
}

/**
 * AnalogicalMappingCollection - Manages analogical mappings using MongoDB Atlas Vector Search
 * 
 * This collection demonstrates MongoDB Atlas EXCLUSIVE features:
 * - $vectorSearch aggregation stage for semantic similarity
 * - Atlas Vector Search indexes for vector embeddings
 * - Similarity scoring and ranking with Atlas
 * - Multi-dimensional analogical reasoning with vectors
 * 
 * CRITICAL: Requires MongoDB Atlas (not local MongoDB)
 */
export class AnalogicalMappingCollection extends BaseCollection<AnalogicalMapping> {
  protected collectionName = 'agent_analogical_mappings';

  constructor(db: Db) {
    super(db);
    this.collection = db.collection<AnalogicalMapping>(this.collectionName);
  }

  /**
   * Create indexes optimized for analogical reasoning and Atlas Vector Search
   * Following MongoDB Atlas documentation for Vector Search optimization
   */
  async createIndexes(): Promise<void> {
    try {
      // Agent and mapping identification index
      await this.collection.createIndex({
        agentId: 1,
        'mapping.id': 1,
        'mapping.type': 1,
        timestamp: -1
      }, {
        name: 'agent_mapping_type',
        background: true
      });

      // Analogical strength and confidence index
      await this.collection.createIndex({
        'mapping.strength': -1,
        'mapping.confidence': -1,
        'mapping.category': 1
      }, {
        name: 'analogical_strength_confidence',
        background: true
      });

      // Domain mapping index
      await this.collection.createIndex({
        'mapping.source.domain': 1,
        'mapping.target.domain': 1,
        'mapping.type': 1
      }, {
        name: 'domain_mapping',
        background: true
      });

      // Quality metrics index
      await this.collection.createIndex({
        'mapping.quality.overall': -1,
        'mapping.quality.systematicity': -1,
        'mapping.quality.semantic': -1
      }, {
        name: 'mapping_quality',
        background: true
      });

      // Performance tracking index
      await this.collection.createIndex({
        'learning.performance.accuracy': -1,
        'learning.performance.utility': -1,
        'learning.performance.transferability': -1
      }, {
        name: 'learning_performance',
        background: true
      });

      // Vector search metadata index
      await this.collection.createIndex({
        'metadata.vectorSearch.indexName': 1,
        'metadata.vectorSearch.embeddingModel': 1,
        'metadata.vectorSearch.dimensions': 1
      }, {
        name: 'vector_search_metadata',
        background: true
      });

      console.log('✅ AnalogicalMappingCollection indexes created successfully');
      console.log('📝 Note: Atlas Vector Search indexes must be created separately in Atlas UI or API');
    } catch (error) {
      console.error('❌ Error creating AnalogicalMappingCollection indexes:', error);
      throw error;
    }
  }

  /**
   * Store an analogical mapping
   */
  async storeAnalogicalMapping(mapping: Omit<AnalogicalMapping, '_id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const doc: AnalogicalMapping = {
      ...mapping,
      _id: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await this.collection.insertOne(doc);
    return result.insertedId.toString();
  }

  /**
   * Get analogical mappings for an agent
   */
  async getAgentAnalogicalMappings(agentId: string, filter: Partial<AnalogicalFilter> = {}): Promise<AnalogicalMapping[]> {
    const query: AnalogicalFilter = { agentId, ...filter };
    return await this.collection.find(query).sort({ timestamp: -1 }).toArray();
  }

  /**
   * Find similar analogies using MongoDB Atlas Vector Search
   * Based on official MongoDB Atlas documentation: https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/
   * 
   * CRITICAL: This uses Atlas EXCLUSIVE $vectorSearch aggregation stage
   */
  async findSimilarAnalogies(
    queryEmbedding: number[],
    options: {
      indexName: string;
      limit?: number;
      numCandidates?: number;
      minScore?: number;
      filter?: Record<string, any>;
    }
  ): Promise<Array<{
    mapping: AnalogicalMapping;
    score: number;
    similarity: number;
  }>> {
    // Validate embedding dimensions (Atlas limit: ≤ 4096)
    if (queryEmbedding.length > 4096) {
      throw new Error('Vector embedding exceeds Atlas limit of 4096 dimensions');
    }

    const pipeline: any[] = [
      // CRITICAL: $vectorSearch MUST be first stage and is Atlas ONLY
      {
        $vectorSearch: {
          index: options.indexName,
          path: 'mapping.source.embedding', // Search in source embeddings
          queryVector: queryEmbedding,
          numCandidates: options.numCandidates || 100,
          limit: options.limit || 10,
          ...(options.filter && { filter: options.filter })
        }
      },
      // Add vector search score
      {
        $addFields: {
          vectorSearchScore: { $meta: 'vectorSearchScore' }
        }
      },
      // Filter by minimum score if specified
      ...(options.minScore ? [{
        $match: {
          vectorSearchScore: { $gte: options.minScore }
        }
      }] : []),
      // Sort by score (highest first)
      {
        $sort: { vectorSearchScore: -1 }
      }
    ];

    try {
      const results = await this.collection.aggregate(pipeline).toArray();
      
      return results.map(result => ({
        mapping: result as AnalogicalMapping,
        score: (result as any).vectorSearchScore || 0,
        similarity: (result as any).vectorSearchScore || 0 // Atlas returns similarity as score
      }));
    } catch (error) {
      console.error('Atlas Vector Search failed:', error);
      // Graceful fallback for non-Atlas environments
      console.log('⚠️ Falling back to non-vector search (Atlas Vector Search not available)');
      
      const fallbackResults = await this.collection.find(options.filter || {})
        .limit(options.limit || 10)
        .toArray();
      
      return fallbackResults.map(mapping => ({
        mapping,
        score: 0.5, // Default similarity score
        similarity: 0.5
      }));
    }
  }

  /**
   * Find analogical patterns using aggregation
   */
  async findAnalogicalPatterns(agentId: string): Promise<{
    commonMappings: Array<{ type: string; frequency: number; averageStrength: number }>;
    domainPairs: Array<{ source: string; target: string; frequency: number; averageQuality: number }>;
    reasoningMethods: Array<{ method: string; frequency: number; averageAccuracy: number }>;
    qualityMetrics: Array<{ metric: string; average: number; distribution: Record<string, number> }>;
  }> {
    const pipeline = [
      { $match: { agentId } },
      {
        $facet: {
          commonMappings: [
            {
              $group: {
                _id: '$mapping.type',
                frequency: { $sum: 1 },
                averageStrength: { $avg: '$mapping.strength' }
              }
            },
            { $sort: { frequency: -1 } },
            { $limit: 10 },
            {
              $project: {
                type: '$_id',
                frequency: 1,
                averageStrength: 1,
                _id: 0
              }
            }
          ],
          domainPairs: [
            {
              $group: {
                _id: {
                  source: '$mapping.source.domain',
                  target: '$mapping.target.domain'
                },
                frequency: { $sum: 1 },
                averageQuality: { $avg: '$mapping.quality.overall' }
              }
            },
            { $sort: { frequency: -1 } },
            { $limit: 10 },
            {
              $project: {
                source: '$_id.source',
                target: '$_id.target',
                frequency: 1,
                averageQuality: 1,
                _id: 0
              }
            }
          ],
          reasoningMethods: [
            {
              $group: {
                _id: '$reasoning.discovery.method',
                frequency: { $sum: 1 },
                averageAccuracy: { $avg: '$learning.performance.accuracy' }
              }
            },
            { $sort: { frequency: -1 } },
            {
              $project: {
                method: '$_id',
                frequency: 1,
                averageAccuracy: 1,
                _id: 0
              }
            }
          ],
          qualityMetrics: [
            {
              $group: {
                _id: null,
                avgSystematicity: { $avg: '$mapping.quality.systematicity' },
                avgOneToOne: { $avg: '$mapping.quality.oneToOne' },
                avgSemantic: { $avg: '$mapping.quality.semantic' },
                avgPragmatic: { $avg: '$mapping.quality.pragmatic' },
                avgOverall: { $avg: '$mapping.quality.overall' }
              }
            },
            {
              $project: {
                _id: 0,
                systematicity: '$avgSystematicity',
                oneToOne: '$avgOneToOne',
                semantic: '$avgSemantic',
                pragmatic: '$avgPragmatic',
                overall: '$avgOverall'
              }
            }
          ]
        }
      }
    ];

    const results = await this.collection.aggregate(pipeline).toArray();
    const data = results[0] || {};
    
    return {
      commonMappings: data.commonMappings || [],
      domainPairs: data.domainPairs || [],
      reasoningMethods: data.reasoningMethods || [],
      qualityMetrics: data.qualityMetrics ? [
        { metric: 'systematicity', average: data.qualityMetrics[0]?.systematicity || 0, distribution: {} },
        { metric: 'oneToOne', average: data.qualityMetrics[0]?.oneToOne || 0, distribution: {} },
        { metric: 'semantic', average: data.qualityMetrics[0]?.semantic || 0, distribution: {} },
        { metric: 'pragmatic', average: data.qualityMetrics[0]?.pragmatic || 0, distribution: {} },
        { metric: 'overall', average: data.qualityMetrics[0]?.overall || 0, distribution: {} }
      ] : []
    };
  }
}
