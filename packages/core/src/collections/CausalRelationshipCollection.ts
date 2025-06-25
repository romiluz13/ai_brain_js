/**
 * @file CausalRelationshipCollection - MongoDB collection for causal reasoning and relationship mapping
 * 
 * This collection demonstrates MongoDB's $graphLookup capabilities for causal reasoning.
 * Based on official MongoDB documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/graphLookup/
 * 
 * Features:
 * - $graphLookup for recursive causal chain traversal
 * - Graph operations for cause-effect relationships
 * - Causal inference and reasoning
 * - Multi-level causal analysis
 * - Causal strength and confidence tracking
 */

import { Db, ObjectId } from 'mongodb';
import { BaseCollection, BaseDocument } from './BaseCollection';

export interface CausalRelationship extends BaseDocument {
  agentId: string;
  sessionId?: string;
  timestamp: Date;
  
  // Causal relationship identification
  relationship: {
    id: string;
    type: 'direct' | 'indirect' | 'conditional' | 'probabilistic' | 'temporal';
    category: 'physical' | 'logical' | 'social' | 'economic' | 'psychological' | 'temporal';
    strength: number; // 0-1 causal strength
    confidence: number; // 0-1 confidence in relationship
    
    // Cause definition
    cause: {
      id: string;
      name: string;
      description: string;
      type: 'event' | 'action' | 'condition' | 'state' | 'decision';
      attributes: Record<string, any>;
      context: {
        temporal: { startTime?: Date; endTime?: Date; duration?: number };
        spatial: { location?: string; scope?: string };
        social: { actors?: string[]; stakeholders?: string[] };
        environmental: Record<string, any>;
      };
    };
    
    // Effect definition
    effect: {
      id: string;
      name: string;
      description: string;
      type: 'event' | 'action' | 'condition' | 'state' | 'outcome';
      attributes: Record<string, any>;
      magnitude: number; // -1 to 1 (negative = harmful, positive = beneficial)
      probability: number; // 0-1 probability of effect occurring
      delay: number; // milliseconds between cause and effect
      duration: number; // milliseconds effect lasts
    };
    
    // Causal mechanism
    mechanism: {
      description: string;
      steps: Array<{
        step: number;
        description: string;
        type: 'physical' | 'logical' | 'social' | 'psychological';
        intermediateState: Record<string, any>;
      }>;
      conditions: Array<{
        condition: string;
        required: boolean;
        probability: number;
      }>;
      moderators: Array<{
        factor: string;
        effect: 'amplify' | 'diminish' | 'reverse' | 'delay';
        strength: number; // 0-1
      }>;
    };
  };
  
  // Evidence and validation (restructured to avoid parallel arrays)
  evidence: {
    // Empirical evidence - combined into single array to avoid parallel array indexing issues
    empirical: {
      evidenceItems: Array<{
        id: string;
        type: 'observation' | 'experiment';
        timestamp: Date;
        observer?: string; // for observations
        design?: string; // for experiments
        description: string;
        results?: Record<string, any>; // for experiments
        pValue?: number; // for experiments
        effectSize?: number; // for experiments
        reliability: number; // 0-1
        confidence: number; // 0-1
        context: Record<string, any>;
      }>;
      correlations: Array<{
        variable1: string;
        variable2: string;
        coefficient: number; // -1 to 1
        significance: number; // 0-1
        sampleSize: number;
      }>;
    };
    
    // Theoretical evidence
    theoretical: {
      theories: Array<{
        name: string;
        description: string;
        support: number; // 0-1
        predictions: string[];
      }>;
      models: Array<{
        name: string;
        type: 'mathematical' | 'computational' | 'conceptual';
        accuracy: number; // 0-1
        parameters: Record<string, any>;
      }>;
      analogies: Array<{
        domain: string;
        similarity: number; // 0-1
        relevance: number; // 0-1
      }>;
    };
    
    // Counter-evidence
    counterEvidence: Array<{
      type: 'observation' | 'experiment' | 'theory';
      description: string;
      strength: number; // 0-1
      refutation: string;
    }>;
  };
  
  // Causal network context
  network: {
    // Parent causes (what causes this cause)
    parentCauses: Array<{
      causeId: string;
      relationshipType: string;
      strength: number; // 0-1
      directness: 'direct' | 'indirect';
    }>;
    
    // Child effects (what this effect causes)
    childEffects: Array<{
      effectId: string;
      relationshipType: string;
      strength: number; // 0-1
      directness: 'direct' | 'indirect';
    }>;
    
    // Confounding variables
    confounders: Array<{
      variable: string;
      type: 'common_cause' | 'mediator' | 'moderator' | 'collider';
      strength: number; // 0-1
      controlled: boolean;
    }>;
    
    // Alternative explanations
    alternatives: Array<{
      explanation: string;
      plausibility: number; // 0-1
      evidence: string[];
      refutation?: string;
    }>;
  };
  
  // Temporal aspects
  temporal: {
    // Timing relationships
    timing: {
      precedence: 'before' | 'simultaneous' | 'after' | 'cyclical';
      lag: number; // milliseconds between cause and effect
      periodicity?: number; // milliseconds for cyclical relationships
      persistence: number; // milliseconds effect persists
    };
    
    // Temporal patterns
    patterns: {
      trend: 'increasing' | 'decreasing' | 'stable' | 'cyclical' | 'random';
      seasonality?: string;
      threshold?: number; // threshold for effect to occur
      saturation?: number; // point where additional cause has no effect
    };
    
    // Historical context
    history: Array<{
      timestamp: Date;
      event: string;
      impact: number; // -1 to 1
      context: Record<string, any>;
    }>;
  };
  
  // Inference and reasoning
  inference: {
    // Causal inference methods
    methods: Array<{
      method: 'correlation' | 'experiment' | 'natural_experiment' | 'instrumental_variable' | 'regression_discontinuity';
      result: Record<string, any>;
      validity: number; // 0-1
      assumptions: string[];
    }>;
    
    // Reasoning chain
    reasoning: Array<{
      step: number;
      premise: string;
      conclusion: string;
      logic: 'deductive' | 'inductive' | 'abductive';
      confidence: number; // 0-1
    }>;
    
    // Uncertainty quantification
    uncertainty: {
      epistemic: number; // 0-1 uncertainty due to lack of knowledge
      aleatory: number; // 0-1 uncertainty due to randomness
      model: number; // 0-1 uncertainty in causal model
      measurement: number; // 0-1 uncertainty in measurements
    };
  };
  
  // Learning and adaptation
  learning: {
    // Learning history
    updates: Array<{
      timestamp: Date;
      type: 'strength_update' | 'mechanism_refinement' | 'evidence_addition' | 'model_revision';
      change: Record<string, any>;
      reason: string;
      confidence: number; // 0-1
    }>;
    
    // Prediction accuracy
    predictions: Array<{
      timestamp: Date;
      predicted: any;
      actual: any;
      accuracy: number; // 0-1
      error: number;
    }>;
    
    // Model performance
    performance: {
      accuracy: number; // 0-1
      precision: number; // 0-1
      recall: number; // 0-1
      f1Score: number; // 0-1
      calibration: number; // 0-1
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
      plausibility: number; // 0-1
    };
  };
}

export interface CausalFilter {
  agentId?: string;
  'relationship.type'?: string;
  'relationship.category'?: string;
  'relationship.cause.id'?: string;
  'relationship.effect.id'?: string;
  'relationship.strength'?: { $gte?: number; $lte?: number };
  'relationship.confidence'?: { $gte?: number; $lte?: number };
  timestamp?: { $gte?: Date; $lte?: Date };
}

/**
 * CausalRelationshipCollection - Manages causal relationships using MongoDB's $graphLookup
 * 
 * This collection demonstrates MongoDB's graph operations capabilities:
 * - $graphLookup for recursive causal chain traversal
 * - Graph operations for cause-effect relationships
 * - Causal inference and reasoning algorithms
 * - Multi-level causal analysis and network mapping
 */
export class CausalRelationshipCollection extends BaseCollection<CausalRelationship> {
  protected collectionName = 'agent_causal_relationships';

  constructor(db: Db) {
    super(db);
    this.collection = db.collection<CausalRelationship>(this.collectionName);
  }

  /**
   * Create indexes optimized for causal reasoning and graph operations
   * Following MongoDB documentation for $graphLookup optimization
   */
  async createIndexes(): Promise<void> {
    try {
      // Agent and relationship identification index
      await this.collection.createIndex({
        agentId: 1,
        'relationship.id': 1,
        'relationship.type': 1,
        timestamp: -1
      }, {
        name: 'agent_relationship_type',
        background: true
      });

      // Causal strength and confidence index
      await this.collection.createIndex({
        'relationship.strength': -1,
        'relationship.confidence': -1,
        'relationship.category': 1
      }, {
        name: 'causal_strength_confidence',
        background: true
      });

      // Cause-effect relationship index (for $graphLookup)
      await this.collection.createIndex({
        'relationship.cause.id': 1
      }, {
        name: 'cause_id_lookup',
        background: true
      });

      await this.collection.createIndex({
        'relationship.effect.id': 1
      }, {
        name: 'effect_id_lookup',
        background: true
      });

      // Network traversal indexes (for graph operations)
      await this.collection.createIndex({
        'network.parentCauses.causeId': 1
      }, {
        name: 'parent_causes_lookup',
        background: true
      });

      await this.collection.createIndex({
        'network.childEffects.effectId': 1
      }, {
        name: 'child_effects_lookup',
        background: true
      });

      // Temporal analysis index
      await this.collection.createIndex({
        'temporal.timing.precedence': 1,
        'temporal.timing.lag': 1,
        'relationship.strength': -1
      }, {
        name: 'temporal_causal_analysis',
        background: true
      });

      // Evidence quality index
      await this.collection.createIndex({
        'evidence.empirical.observations.reliability': -1,
        'evidence.empirical.experiments.confidence': -1,
        'metadata.quality.completeness': -1
      }, {
        name: 'evidence_quality',
        background: true
      });

      console.log('✅ CausalRelationshipCollection indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating CausalRelationshipCollection indexes:', error);
      throw error;
    }
  }

  /**
   * Store a causal relationship
   */
  async storeCausalRelationship(relationship: Omit<CausalRelationship, '_id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const doc: CausalRelationship = {
      ...relationship,
      _id: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await this.collection.insertOne(doc);
    return result.insertedId.toString();
  }

  /**
   * Get causal relationships for an agent
   */
  async getAgentCausalRelationships(agentId: string, filter: Partial<CausalFilter> = {}): Promise<CausalRelationship[]> {
    const query: CausalFilter = { agentId, ...filter };
    return await this.collection.find(query).sort({ timestamp: -1 }).toArray();
  }

  /**
   * Find causal patterns for an agent
   */
  async findCausalPatterns(agentId: string): Promise<{
    strongestCauses: Array<{ causeId: string; averageStrength: number; frequency: number }>;
    commonEffects: Array<{ effectId: string; frequency: number; averageImpact: number }>;
    causalCategories: Array<{ category: string; count: number; averageStrength: number }>;
    temporalPatterns: Array<{ pattern: string; frequency: number; averageDelay: number }>;
  }> {
    const relationships = await this.getAgentCausalRelationships(agentId);

    const strongestCauses = relationships
      .filter(r => r.relationship.type === 'direct')
      .map(r => ({
        causeId: r.relationship.cause.id,
        averageStrength: r.relationship.strength,
        frequency: 1
      }));

    const commonEffects = relationships
      .map(r => ({
        effectId: r.relationship.effect.id,
        frequency: 1,
        averageImpact: r.relationship.effect.magnitude
      }));

    const causalCategories = relationships
      .reduce((acc, r) => {
        const existing = acc.find(c => c.category === r.relationship.category);
        if (existing) {
          existing.count++;
          existing.averageStrength = (existing.averageStrength + r.relationship.strength) / 2;
        } else {
          acc.push({
            category: r.relationship.category,
            count: 1,
            averageStrength: r.relationship.strength
          });
        }
        return acc;
      }, [] as Array<{ category: string; count: number; averageStrength: number }>);

    const temporalPatterns = relationships
      .filter(r => r.relationship.type === 'temporal')
      .map(r => ({
        pattern: `${r.relationship.cause.id} -> ${r.relationship.effect.id}`,
        frequency: 1,
        averageDelay: r.relationship.effect.delay || 0
      }));

    return { strongestCauses, commonEffects, causalCategories, temporalPatterns };
  }

  /**
   * Traverse causal chain using MongoDB's $graphLookup
   * Based on official MongoDB documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/graphLookup/
   */
  async traverseCausalChain(
    startCauseId: string,
    direction: 'forward' | 'backward' | 'both' = 'forward',
    maxDepth: number = 5
  ): Promise<Array<{
    relationship: CausalRelationship;
    depth: number;
    path: string[];
    totalStrength: number;
  }>> {
    const pipeline: any[] = [];

    if (direction === 'forward' || direction === 'both') {
      // Forward traversal: cause -> effect -> next cause
      pipeline.push({
        $match: { 'relationship.cause.id': startCauseId }
      });

      pipeline.push({
        $graphLookup: {
          from: this.collectionName,
          startWith: '$relationship.effect.id',
          connectFromField: 'relationship.effect.id',
          connectToField: 'relationship.cause.id',
          as: 'causalChain',
          maxDepth: maxDepth,
          depthField: 'depth'
        }
      });
    }

    if (direction === 'backward' || direction === 'both') {
      // Backward traversal: effect -> cause -> previous effect
      if (direction === 'both') {
        pipeline.push({
          $unionWith: {
            coll: this.collectionName,
            pipeline: [
              { $match: { 'relationship.effect.id': startCauseId } },
              {
                $graphLookup: {
                  from: this.collectionName,
                  startWith: '$relationship.cause.id',
                  connectFromField: 'relationship.cause.id',
                  connectToField: 'relationship.effect.id',
                  as: 'causalChain',
                  maxDepth: maxDepth,
                  depthField: 'depth'
                }
              }
            ]
          }
        });
      } else {
        pipeline.push({
          $match: { 'relationship.effect.id': startCauseId }
        });

        pipeline.push({
          $graphLookup: {
            from: this.collectionName,
            startWith: '$relationship.cause.id',
            connectFromField: 'relationship.cause.id',
            connectToField: 'relationship.effect.id',
            as: 'causalChain',
            maxDepth: maxDepth,
            depthField: 'depth'
          }
        });
      }
    }

    // Process results to calculate path strength and create readable output
    pipeline.push({
      $addFields: {
        totalStrength: {
          $multiply: [
            '$relationship.strength',
            { $avg: '$causalChain.relationship.strength' }
          ]
        },
        path: {
          $concatArrays: [
            ['$relationship.cause.id'],
            '$causalChain.relationship.effect.id'
          ]
        }
      }
    });

    pipeline.push({
      $sort: { totalStrength: -1, depth: 1 }
    });

    const results = await this.collection.aggregate(pipeline).toArray();

    return results.map(result => ({
      relationship: result as CausalRelationship,
      depth: (result as any).depth || 0,
      path: (result as any).path || [],
      totalStrength: (result as any).totalStrength || 0
    }));
  }
}
