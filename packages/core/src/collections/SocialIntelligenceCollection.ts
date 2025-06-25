/**
 * @file SocialIntelligenceCollection - MongoDB Atlas $graphLookup for social network analysis
 * 
 * This collection demonstrates MongoDB Atlas $graphLookup capabilities for social intelligence.
 * Based on official MongoDB Atlas documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/graphLookup/
 * 
 * CRITICAL: This uses MongoDB Atlas EXCLUSIVE features:
 * - $graphLookup aggregation stage (Atlas optimized)
 * - Recursive social network traversal
 * - Graph-based relationship analysis
 * - Multi-depth social connection exploration
 * 
 * Features:
 * - Social network mapping and analysis
 * - Recursive relationship traversal using $graphLookup
 * - Social influence and connection strength analysis
 * - Community detection and social clustering
 * - Social interaction pattern recognition
 */

import { Db, ObjectId } from 'mongodb';
import { BaseCollection, BaseDocument } from './BaseCollection';

export interface SocialConnection extends BaseDocument {
  agentId: string;
  timestamp: Date;
  
  // Social connection identification
  connection: {
    id: string;
    type: 'friendship' | 'professional' | 'family' | 'romantic' | 'acquaintance' | 'mentor' | 'colleague' | 'neighbor';
    status: 'active' | 'inactive' | 'blocked' | 'pending' | 'declined';
    
    // Connection participants
    participants: {
      source: {
        id: string;
        name: string;
        type: 'agent' | 'human' | 'organization' | 'group';
        role: string;
      };
      target: {
        id: string;
        name: string;
        type: 'agent' | 'human' | 'organization' | 'group';
        role: string;
      };
    };
    
    // Connection strength and quality
    strength: {
      overall: number; // 0-1 overall connection strength
      emotional: number; // 0-1 emotional bond strength
      professional: number; // 0-1 professional relationship strength
      frequency: number; // 0-1 interaction frequency
      trust: number; // 0-1 trust level
      influence: number; // 0-1 influence level
    };
    
    // Connection context and history
    context: {
      origin: {
        how_met: string;
        when_met: Date;
        where_met: string;
        circumstances: string;
        mutual_connections: string[];
      };
      
      // Interaction patterns
      interactions: {
        total_count: number;
        recent_count: number; // last 30 days
        frequency_pattern: 'daily' | 'weekly' | 'monthly' | 'occasional' | 'rare';
        communication_channels: Array<{
          channel: 'in_person' | 'phone' | 'email' | 'text' | 'social_media' | 'video_call' | 'other';
          frequency: number; // 0-1
          preference: number; // 0-1
        }>;
        interaction_types: Array<{
          type: 'social' | 'professional' | 'support' | 'collaboration' | 'conflict' | 'casual';
          frequency: number; // 0-1
          quality: number; // 0-1
        }>;
      };
      
      // Social dynamics
      dynamics: {
        power_balance: number; // -1 to 1 (negative = target has more power)
        communication_style: 'formal' | 'informal' | 'friendly' | 'professional' | 'intimate' | 'distant';
        conflict_resolution: 'avoidant' | 'collaborative' | 'competitive' | 'accommodating' | 'compromising';
        emotional_support: number; // 0-1 level of emotional support provided/received
        reciprocity: number; // 0-1 how balanced the relationship is
      };
      
      // Shared attributes and interests
      commonalities: {
        shared_interests: string[];
        shared_values: string[];
        shared_experiences: string[];
        shared_goals: string[];
        shared_connections: string[]; // mutual friends/contacts
        compatibility_score: number; // 0-1
      };
    };
    
    // Social network position and influence
    network_position: {
      // Connection's role in broader network
      centrality: {
        degree: number; // number of direct connections
        betweenness: number; // 0-1 how often they bridge other connections
        closeness: number; // 0-1 how close they are to all other nodes
        eigenvector: number; // 0-1 influence based on connections' influence
      };
      
      // Social influence metrics
      influence: {
        reach: number; // estimated number of people they can influence
        authority: number; // 0-1 perceived expertise/authority
        persuasiveness: number; // 0-1 ability to change opinions
        network_effect: number; // 0-1 how much they amplify messages
      };
      
      // Community and group memberships
      communities: Array<{
        community_id: string;
        community_name: string;
        role: 'member' | 'leader' | 'influencer' | 'bridge' | 'peripheral';
        involvement_level: number; // 0-1
        influence_within: number; // 0-1
      }>;
    };
  };
  
  // Relationship evolution and tracking
  evolution: {
    // Historical changes in relationship
    milestones: Array<{
      timestamp: Date;
      event: string;
      impact: number; // -1 to 1 impact on relationship
      description: string;
    }>;
    
    // Relationship trajectory
    trajectory: {
      direction: 'strengthening' | 'weakening' | 'stable' | 'fluctuating';
      rate_of_change: number; // -1 to 1 how fast relationship is changing
      predicted_future: 'growing' | 'declining' | 'maintaining' | 'uncertain';
      stability: number; // 0-1 how stable the relationship is
    };
    
    // Interaction quality over time
    quality_trends: Array<{
      period: Date;
      quality_score: number; // 0-1
      satisfaction: number; // 0-1
      conflict_level: number; // 0-1
      support_level: number; // 0-1
    }>;
  };
  
  // Social intelligence insights
  insights: {
    // Behavioral patterns
    patterns: Array<{
      pattern: string;
      frequency: number; // 0-1
      significance: number; // 0-1
      context: string[];
    }>;
    
    // Social skills and competencies
    social_skills: {
      communication: number; // 0-1
      empathy: number; // 0-1
      conflict_resolution: number; // 0-1
      leadership: number; // 0-1
      collaboration: number; // 0-1
      networking: number; // 0-1
    };
    
    // Relationship recommendations
    recommendations: Array<{
      type: 'strengthen' | 'maintain' | 'distance' | 'reconnect' | 'introduce';
      priority: number; // 0-1
      reasoning: string;
      suggested_actions: string[];
    }>;
  };
  
  // Metadata and quality indicators
  metadata: {
    framework: string;
    version: string;
    source: string;
    reliability: number; // 0-1
    lastValidated: Date;
    
    // Data quality indicators
    quality: {
      completeness: number; // 0-1
      accuracy: number; // 0-1
      freshness: number; // 0-1
      consistency: number; // 0-1
    };
    
    // Graph analysis optimization
    graph_analysis: {
      last_analyzed: Date;
      analysis_depth: number; // max depth of graph traversal
      computation_time: number; // milliseconds
      network_size: number; // number of nodes analyzed
    };
  };
}

export interface SocialNetworkFilter {
  agentId?: string;
  'connection.type'?: string;
  'connection.status'?: string;
  'connection.strength.overall'?: { $gte?: number; $lte?: number };
  'connection.participants.source.id'?: string;
  'connection.participants.target.id'?: string;
  timestamp?: { $gte?: Date; $lte?: Date };
}

export interface GraphTraversalOptions {
  maxDepth?: number;
  minStrength?: number;
  connectionTypes?: string[];
  includeInactive?: boolean;
  depthField?: string;
  restrictSearchWithMatch?: Record<string, any>;
}

/**
 * SocialIntelligenceCollection - Manages social connections using MongoDB Atlas $graphLookup
 * 
 * This collection demonstrates MongoDB Atlas EXCLUSIVE features:
 * - $graphLookup aggregation stage for recursive social network traversal
 * - Graph-based relationship analysis and social intelligence
 * - Multi-depth social connection exploration and community detection
 * - Social influence and network position analysis
 * 
 * CRITICAL: Optimized for MongoDB Atlas (not local MongoDB)
 */
export class SocialIntelligenceCollection extends BaseCollection<SocialConnection> {
  protected collectionName = 'agent_social_connections';

  constructor(db: Db) {
    super(db);
    this.collection = db.collection<SocialConnection>(this.collectionName);
  }

  /**
   * Create indexes optimized for social network analysis and Atlas $graphLookup performance
   * Following MongoDB Atlas documentation for graph traversal optimization
   */
  async createIndexes(): Promise<void> {
    try {
      // Agent and connection identification index
      await this.collection.createIndex({
        agentId: 1,
        'connection.id': 1,
        'connection.status': 1,
        timestamp: -1
      }, {
        name: 'agent_connection_status',
        background: true
      });

      // Graph traversal optimization index (critical for $graphLookup performance)
      await this.collection.createIndex({
        'connection.participants.source.id': 1,
        'connection.participants.target.id': 1,
        'connection.strength.overall': -1
      }, {
        name: 'graph_traversal_optimization',
        background: true
      });

      // Social network analysis index
      await this.collection.createIndex({
        'connection.type': 1,
        'connection.strength.overall': -1,
        'connection.network_position.centrality.degree': -1
      }, {
        name: 'social_network_analysis',
        background: true
      });

      // Connection strength and quality index
      await this.collection.createIndex({
        'connection.strength.overall': -1,
        'connection.strength.trust': -1,
        'connection.strength.influence': -1,
        'connection.status': 1
      }, {
        name: 'connection_strength_quality',
        background: true
      });

      // Community and influence index
      await this.collection.createIndex({
        'connection.network_position.communities.community_id': 1,
        'connection.network_position.influence.authority': -1,
        'connection.network_position.centrality.betweenness': -1
      }, {
        name: 'community_influence',
        background: true
      });

      // Interaction patterns index
      await this.collection.createIndex({
        'connection.context.interactions.frequency_pattern': 1,
        'connection.context.interactions.total_count': -1,
        'connection.evolution.trajectory.direction': 1
      }, {
        name: 'interaction_patterns',
        background: true
      });

      // Social skills and competencies index
      await this.collection.createIndex({
        'connection.insights.social_skills.communication': -1,
        'connection.insights.social_skills.leadership': -1,
        'connection.insights.social_skills.networking': -1
      }, {
        name: 'social_skills_competencies',
        background: true
      });

      console.log('✅ SocialIntelligenceCollection indexes created successfully');
      console.log('📝 Note: Optimized for MongoDB Atlas $graphLookup performance');
    } catch (error) {
      console.error('❌ Error creating SocialIntelligenceCollection indexes:', error);
      throw error;
    }
  }

  /**
   * Store a social connection
   */
  async storeSocialConnection(connection: Omit<SocialConnection, '_id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const doc: SocialConnection = {
      ...connection,
      _id: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await this.collection.insertOne(doc);
    return result.insertedId.toString();
  }

  /**
   * Get social connections for an agent
   */
  async getAgentSocialConnections(agentId: string, filter: Partial<SocialNetworkFilter> = {}): Promise<SocialConnection[]> {
    const query: SocialNetworkFilter = { agentId, ...filter };
    return await this.collection.find(query).sort({ 'connection.strength.overall': -1, timestamp: -1 }).toArray();
  }

  /**
   * Traverse social network using MongoDB Atlas $graphLookup
   * Based on official MongoDB Atlas documentation for graph traversal
   */
  async traverseSocialNetwork(
    startingPersonId: string,
    options: GraphTraversalOptions = {}
  ): Promise<Array<{
    person: SocialConnection;
    depth: number;
    path: string[];
    connectionStrength: number;
  }>> {
    const {
      maxDepth = 3,
      minStrength = 0.1,
      connectionTypes = [],
      includeInactive = false,
      depthField = 'depth',
      restrictSearchWithMatch = {}
    } = options;

    // Build match criteria for $graphLookup restrictSearchWithMatch
    const matchCriteria: any = {
      'connection.strength.overall': { $gte: minStrength },
      ...restrictSearchWithMatch
    };

    if (!includeInactive) {
      matchCriteria['connection.status'] = 'active';
    }

    if (connectionTypes.length > 0) {
      matchCriteria['connection.type'] = { $in: connectionTypes };
    }

    const pipeline = [
      // Start with the initial person
      {
        $match: {
          'connection.participants.source.id': startingPersonId
        }
      },
      
      // Use $graphLookup to traverse the social network recursively
      {
        $graphLookup: {
          from: this.collectionName,
          startWith: '$connection.participants.target.id',
          connectFromField: 'connection.participants.target.id',
          connectToField: 'connection.participants.source.id',
          as: 'networkTraversal',
          maxDepth: maxDepth,
          depthField: depthField,
          restrictSearchWithMatch: matchCriteria
        }
      },
      
      // Unwind the traversal results
      {
        $unwind: {
          path: '$networkTraversal',
          preserveNullAndEmptyArrays: true
        }
      },
      
      // Project the results with path and strength information
      {
        $project: {
          person: '$networkTraversal',
          depth: `$networkTraversal.${depthField}`,
          connectionStrength: '$networkTraversal.connection.strength.overall',
          sourceConnection: {
            strength: '$connection.strength.overall',
            type: '$connection.type',
            participants: '$connection.participants'
          }
        }
      },
      
      // Filter out null results and sort by depth and strength
      {
        $match: {
          person: { $ne: null }
        }
      },
      
      {
        $sort: {
          depth: 1,
          connectionStrength: -1
        }
      }
    ];

    const results = await this.collection.aggregate(pipeline).toArray();
    
    // Process results to include path information
    return results.map((result: any) => ({
      person: result.person,
      depth: result.depth || 0,
      path: this.constructPath(result, startingPersonId),
      connectionStrength: result.connectionStrength || 0
    }));
  }

  /**
   * Find mutual connections between two people using $graphLookup
   */
  async findMutualConnections(
    personId1: string,
    personId2: string,
    maxDepth: number = 2
  ): Promise<Array<{
    mutualConnection: SocialConnection;
    pathToPerson1: string[];
    pathToPerson2: string[];
    strength1: number;
    strength2: number;
  }>> {
    const pipeline = [
      // Find connections from person1
      {
        $match: {
          'connection.participants.source.id': personId1,
          'connection.status': 'active'
        }
      },
      
      // Use $graphLookup to find person1's network
      {
        $graphLookup: {
          from: this.collectionName,
          startWith: '$connection.participants.target.id',
          connectFromField: 'connection.participants.target.id',
          connectToField: 'connection.participants.source.id',
          as: 'person1Network',
          maxDepth: maxDepth,
          depthField: 'depth1'
        }
      },
      
      // Find connections from person2
      {
        $lookup: {
          from: this.collectionName,
          let: { person2Id: personId2 },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$connection.participants.source.id', '$$person2Id'] },
                    { $eq: ['$connection.status', 'active'] }
                  ]
                }
              }
            },
            {
              $graphLookup: {
                from: this.collectionName,
                startWith: '$connection.participants.target.id',
                connectFromField: 'connection.participants.target.id',
                connectToField: 'connection.participants.source.id',
                as: 'person2Network',
                maxDepth: maxDepth,
                depthField: 'depth2'
              }
            }
          ],
          as: 'person2Connections'
        }
      },
      
      // Find intersections (mutual connections)
      {
        $project: {
          mutualConnections: {
            $filter: {
              input: '$person1Network',
              cond: {
                $in: [
                  '$$this.connection.participants.target.id',
                  {
                    $map: {
                      input: { $arrayElemAt: ['$person2Connections.person2Network', 0] },
                      as: 'p2conn',
                      in: '$$p2conn.connection.participants.target.id'
                    }
                  }
                ]
              }
            }
          }
        }
      },
      
      // Unwind mutual connections
      {
        $unwind: '$mutualConnections'
      },
      
      // Project final results
      {
        $project: {
          mutualConnection: '$mutualConnections',
          strength1: '$mutualConnections.connection.strength.overall',
          strength2: '$mutualConnections.connection.strength.overall' // Simplified for this example
        }
      }
    ];

    const results = await this.collection.aggregate(pipeline).toArray();
    
    return results.map((result: any) => ({
      mutualConnection: result.mutualConnection,
      pathToPerson1: [personId1, result.mutualConnection.connection.participants.target.id],
      pathToPerson2: [personId2, result.mutualConnection.connection.participants.target.id],
      strength1: result.strength1 || 0,
      strength2: result.strength2 || 0
    }));
  }

  /**
   * Analyze social network communities using graph analysis
   */
  async analyzeSocialCommunities(agentId: string): Promise<{
    communities: Array<{
      id: string;
      name: string;
      members: string[];
      centralMembers: string[];
      bridgeMembers: string[];
      cohesion: number;
      influence: number;
    }>;
    networkMetrics: {
      totalNodes: number;
      totalEdges: number;
      averageClusteringCoefficient: number;
      networkDensity: number;
      averagePathLength: number;
    };
  }> {
    const pipeline = [
      {
        $match: {
          agentId,
          'connection.status': 'active'
        }
      },
      
      // Use $graphLookup to analyze the entire network
      {
        $graphLookup: {
          from: this.collectionName,
          startWith: '$connection.participants.source.id',
          connectFromField: 'connection.participants.target.id',
          connectToField: 'connection.participants.source.id',
          as: 'fullNetwork',
          maxDepth: 5,
          depthField: 'networkDepth'
        }
      },
      
      // Group by communities
      {
        $group: {
          _id: '$connection.network_position.communities.community_id',
          members: { $addToSet: '$connection.participants.target.id' },
          connections: { $push: '$connection' },
          totalStrength: { $sum: '$connection.strength.overall' },
          avgInfluence: { $avg: '$connection.network_position.influence.authority' }
        }
      },
      
      // Calculate community metrics
      {
        $project: {
          id: '$_id',
          name: { $ifNull: ['$_id', 'Unknown Community'] },
          members: 1,
          memberCount: { $size: '$members' },
          cohesion: { $divide: ['$totalStrength', { $size: '$members' }] },
          influence: '$avgInfluence',
          centralMembers: {
            $slice: [
              {
                $map: {
                  input: '$connections',
                  as: 'conn',
                  in: {
                    $cond: [
                      { $gte: ['$$conn.network_position.centrality.degree', 5] },
                      '$$conn.participants.target.id',
                      null
                    ]
                  }
                }
              },
              5
            ]
          },
          bridgeMembers: {
            $slice: [
              {
                $map: {
                  input: '$connections',
                  as: 'conn',
                  in: {
                    $cond: [
                      { $gte: ['$$conn.network_position.centrality.betweenness', 0.5] },
                      '$$conn.participants.target.id',
                      null
                    ]
                  }
                }
              },
              5
            ]
          }
        }
      },
      
      {
        $sort: { influence: -1, memberCount: -1 }
      }
    ];

    const communityResults = await this.collection.aggregate(pipeline).toArray();
    
    // Calculate overall network metrics
    const networkMetrics = await this.calculateNetworkMetrics(agentId);
    
    return {
      communities: communityResults.map((community: any) => ({
        id: community.id || 'unknown',
        name: community.name || 'Unknown Community',
        members: community.members || [],
        centralMembers: (community.centralMembers || []).filter((m: any) => m !== null),
        bridgeMembers: (community.bridgeMembers || []).filter((m: any) => m !== null),
        cohesion: community.cohesion || 0,
        influence: community.influence || 0
      })),
      networkMetrics
    };
  }

  /**
   * Calculate network-wide metrics
   */
  private async calculateNetworkMetrics(agentId: string): Promise<{
    totalNodes: number;
    totalEdges: number;
    averageClusteringCoefficient: number;
    networkDensity: number;
    averagePathLength: number;
  }> {
    const pipeline = [
      {
        $match: {
          agentId,
          'connection.status': 'active'
        }
      },
      {
        $group: {
          _id: null,
          totalEdges: { $sum: 1 },
          uniqueNodes: {
            $addToSet: {
              $setUnion: [
                ['$connection.participants.source.id'],
                ['$connection.participants.target.id']
              ]
            }
          },
          avgClustering: { $avg: '$connection.network_position.centrality.degree' },
          avgPathLength: { $avg: '$connection.network_position.centrality.closeness' }
        }
      },
      {
        $project: {
          totalEdges: 1,
          totalNodes: { $size: { $reduce: { input: '$uniqueNodes', initialValue: [], in: { $setUnion: ['$$value', '$$this'] } } } },
          avgClustering: 1,
          avgPathLength: 1
        }
      },
      {
        $addFields: {
          networkDensity: {
            $divide: [
              { $multiply: ['$totalEdges', 2] },
              { $multiply: ['$totalNodes', { $subtract: ['$totalNodes', 1] }] }
            ]
          }
        }
      }
    ];

    const results = await this.collection.aggregate(pipeline).toArray();
    const result = results[0] || {};
    
    return {
      totalNodes: result.totalNodes || 0,
      totalEdges: result.totalEdges || 0,
      averageClusteringCoefficient: result.avgClustering || 0,
      networkDensity: result.networkDensity || 0,
      averagePathLength: result.avgPathLength || 0
    };
  }

  /**
   * Construct path for graph traversal results
   */
  private constructPath(result: any, startingPersonId: string): string[] {
    // Simplified path construction - in a real implementation, this would be more sophisticated
    const path = [startingPersonId];
    if (result.person && result.person.connection) {
      path.push(result.person.connection.participants.target.id);
    }
    return path;
  }

  /**
   * Find social influencers in the network
   */
  async findSocialInfluencers(
    agentId: string,
    criteria: {
      minInfluence?: number;
      minConnections?: number;
      maxDepth?: number;
    } = {}
  ): Promise<Array<{
    person: SocialConnection;
    influenceScore: number;
    reachEstimate: number;
    centralityMetrics: {
      degree: number;
      betweenness: number;
      closeness: number;
      eigenvector: number;
    };
  }>> {
    const {
      minInfluence = 0.5,
      minConnections = 5,
      maxDepth = 3
    } = criteria;

    const pipeline = [
      {
        $match: {
          agentId,
          'connection.status': 'active',
          'connection.network_position.influence.authority': { $gte: minInfluence },
          'connection.network_position.centrality.degree': { $gte: minConnections }
        }
      },
      
      // Use $graphLookup to calculate reach
      {
        $graphLookup: {
          from: this.collectionName,
          startWith: '$connection.participants.target.id',
          connectFromField: 'connection.participants.target.id',
          connectToField: 'connection.participants.source.id',
          as: 'reachNetwork',
          maxDepth: maxDepth,
          restrictSearchWithMatch: {
            'connection.status': 'active',
            'connection.strength.overall': { $gte: 0.3 }
          }
        }
      },
      
      // Calculate influence metrics
      {
        $addFields: {
          reachEstimate: { $size: '$reachNetwork' },
          influenceScore: {
            $multiply: [
              '$connection.network_position.influence.authority',
              { $add: [1, { $divide: [{ $size: '$reachNetwork' }, 100] }] }
            ]
          }
        }
      },
      
      // Sort by influence score
      {
        $sort: { influenceScore: -1 }
      },
      
      // Project final results
      {
        $project: {
          person: '$$ROOT',
          influenceScore: 1,
          reachEstimate: 1,
          centralityMetrics: {
            degree: '$connection.network_position.centrality.degree',
            betweenness: '$connection.network_position.centrality.betweenness',
            closeness: '$connection.network_position.centrality.closeness',
            eigenvector: '$connection.network_position.centrality.eigenvector'
          }
        }
      }
    ];

    return await this.collection.aggregate(pipeline).toArray();
  }
}
