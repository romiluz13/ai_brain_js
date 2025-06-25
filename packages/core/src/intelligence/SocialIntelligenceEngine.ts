/**
 * @file SocialIntelligenceEngine - Advanced social intelligence using MongoDB Atlas $graphLookup
 * 
 * This engine demonstrates MongoDB Atlas $graphLookup capabilities for social intelligence.
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

import { Db } from 'mongodb';
import { SocialIntelligenceCollection, SocialConnection, GraphTraversalOptions } from '../collections/SocialIntelligenceCollection';

export interface SocialAnalysisRequest {
  agentId: string;
  analysisType: 'network_analysis' | 'influence_mapping' | 'community_detection' | 'relationship_strength' | 'social_patterns';
  
  // Analysis parameters
  parameters: {
    targetPersonId?: string;
    maxDepth?: number;
    minConnectionStrength?: number;
    connectionTypes?: string[];
    timeRange?: { start: Date; end: Date };
    includeInactive?: boolean;
  };
  
  // Analysis context
  context: {
    purpose: 'relationship_building' | 'influence_analysis' | 'community_mapping' | 'social_optimization' | 'conflict_resolution';
    scope: 'personal' | 'professional' | 'comprehensive';
    priority: 'high' | 'medium' | 'low';
  };
}

export interface SocialAnalysisResult {
  request: SocialAnalysisRequest;
  
  // Network analysis results
  networkAnalysis: {
    totalConnections: number;
    activeConnections: number;
    networkReach: number;
    averageConnectionStrength: number;
    networkDensity: number;
    clusteringCoefficient: number;
  };
  
  // Social influence metrics
  influenceMetrics: {
    personalInfluence: number;
    networkInfluence: number;
    authorityScore: number;
    reachEstimate: number;
    influentialConnections: Array<{
      personId: string;
      name: string;
      influenceScore: number;
      connectionPath: string[];
    }>;
  };
  
  // Community analysis
  communities: Array<{
    id: string;
    name: string;
    members: string[];
    centralMembers: string[];
    bridgeMembers: string[];
    cohesion: number;
    influence: number;
    role: 'member' | 'leader' | 'influencer' | 'bridge' | 'peripheral';
  }>;
  
  // Relationship insights
  relationships: {
    strongConnections: SocialConnection[];
    weakConnections: SocialConnection[];
    growingConnections: SocialConnection[];
    decliningConnections: SocialConnection[];
    mutualConnections: Array<{
      personId: string;
      mutualFriends: string[];
      connectionStrength: number;
    }>;
  };
  
  // Social recommendations
  recommendations: Array<{
    type: 'strengthen_connection' | 'expand_network' | 'bridge_communities' | 'leverage_influence' | 'resolve_conflict';
    priority: number;
    description: string;
    targetPersons: string[];
    expectedOutcome: string;
    actionSteps: string[];
  }>;
  
  // Analysis metadata
  metadata: {
    analysisTime: number;
    graphTraversalDepth: number;
    nodesAnalyzed: number;
    edgesAnalyzed: number;
    computationComplexity: number;
  };
}

export interface NetworkTraversalRequest {
  agentId: string;
  startingPersonId: string;
  traversalType: 'breadth_first' | 'depth_first' | 'influence_weighted' | 'strength_weighted';
  options: GraphTraversalOptions;
}

export interface CommunityDetectionRequest {
  agentId: string;
  algorithm: 'modularity' | 'label_propagation' | 'louvain' | 'leiden';
  parameters: {
    resolution?: number;
    minCommunitySize?: number;
    maxCommunities?: number;
  };
}

/**
 * SocialIntelligenceEngine - Advanced social intelligence using MongoDB Atlas $graphLookup
 * 
 * This engine demonstrates MongoDB Atlas EXCLUSIVE capabilities:
 * - $graphLookup aggregation stage for recursive social network traversal
 * - Graph-based relationship analysis and social intelligence
 * - Multi-depth social connection exploration and community detection
 * - Social influence and network position analysis
 * 
 * CRITICAL: Optimized for MongoDB Atlas (not local MongoDB)
 */
export class SocialIntelligenceEngine {
  private socialCollection: SocialIntelligenceCollection;
  private isInitialized = false;

  constructor(private db: Db) {
    this.socialCollection = new SocialIntelligenceCollection(db);
  }

  /**
   * Initialize the social intelligence engine
   */
  async initialize(): Promise<void> {
    try {
      await this.socialCollection.createIndexes();
      this.isInitialized = true;
      console.log('SocialIntelligenceEngine initialized successfully');
      console.log('📝 Note: Optimized for MongoDB Atlas $graphLookup operations');
    } catch (error) {
      console.error('Failed to initialize SocialIntelligenceEngine:', error);
      throw error;
    }
  }

  /**
   * Perform comprehensive social analysis using Atlas $graphLookup
   */
  async performSocialAnalysis(request: SocialAnalysisRequest): Promise<SocialAnalysisResult> {
    if (!this.isInitialized) {
      throw new Error('SocialIntelligenceEngine not initialized');
    }

    const startTime = Date.now();

    try {
      // Get agent's social connections
      const connections = await this.socialCollection.getAgentSocialConnections(request.agentId, {
        'connection.status': request.parameters.includeInactive ? undefined : 'active'
      });

      // Perform network analysis
      const networkAnalysis = await this.analyzeNetwork(request.agentId, connections);

      // Analyze social influence
      const influenceMetrics = await this.analyzeSocialInfluence(request.agentId, request.parameters);

      // Detect communities
      const communities = await this.detectCommunities(request.agentId);

      // Analyze relationships
      const relationships = await this.analyzeRelationships(request.agentId, connections);

      // Generate recommendations
      const recommendations = await this.generateSocialRecommendations(
        request.agentId,
        networkAnalysis,
        influenceMetrics,
        communities,
        relationships
      );

      const analysisTime = Date.now() - startTime;

      return {
        request,
        networkAnalysis,
        influenceMetrics,
        communities: communities.communities,
        relationships,
        recommendations,
        metadata: {
          analysisTime,
          graphTraversalDepth: request.parameters.maxDepth || 3,
          nodesAnalyzed: connections.length,
          edgesAnalyzed: connections.length,
          computationComplexity: this.calculateComplexity(connections.length, request.parameters.maxDepth || 3)
        }
      };
    } catch (error) {
      console.error('Social analysis failed:', error);
      throw error;
    }
  }

  /**
   * Traverse social network using Atlas $graphLookup
   */
  async traverseNetwork(request: NetworkTraversalRequest): Promise<Array<{
    person: SocialConnection;
    depth: number;
    path: string[];
    connectionStrength: number;
    influenceScore: number;
  }>> {
    if (!this.isInitialized) {
      throw new Error('SocialIntelligenceEngine not initialized');
    }

    try {
      // Use Atlas $graphLookup for network traversal
      const traversalResults = await this.socialCollection.traverseSocialNetwork(
        request.startingPersonId,
        request.options
      );

      // Enhance results with influence scores
      return traversalResults.map(result => ({
        ...result,
        influenceScore: this.calculateInfluenceScore(result.person, result.depth)
      }));
    } catch (error) {
      console.error('Network traversal failed:', error);
      throw error;
    }
  }

  /**
   * Find mutual connections between people
   */
  async findMutualConnections(
    agentId: string,
    personId1: string,
    personId2: string,
    maxDepth: number = 2
  ): Promise<Array<{
    mutualConnection: SocialConnection;
    pathToPerson1: string[];
    pathToPerson2: string[];
    strength1: number;
    strength2: number;
    bridgePotential: number;
  }>> {
    if (!this.isInitialized) {
      throw new Error('SocialIntelligenceEngine not initialized');
    }

    try {
      const mutualConnections = await this.socialCollection.findMutualConnections(
        personId1,
        personId2,
        maxDepth
      );

      // Calculate bridge potential for each mutual connection
      return mutualConnections.map(connection => ({
        ...connection,
        bridgePotential: this.calculateBridgePotential(connection.strength1, connection.strength2)
      }));
    } catch (error) {
      console.error('Mutual connection analysis failed:', error);
      throw error;
    }
  }

  /**
   * Detect social communities using graph analysis
   */
  async detectCommunities(agentId: string): Promise<{
    communities: Array<{
      id: string;
      name: string;
      members: string[];
      centralMembers: string[];
      bridgeMembers: string[];
      cohesion: number;
      influence: number;
      role: 'member' | 'leader' | 'influencer' | 'bridge' | 'peripheral';
    }>;
    networkMetrics: {
      totalNodes: number;
      totalEdges: number;
      averageClusteringCoefficient: number;
      networkDensity: number;
      averagePathLength: number;
    };
  }> {
    if (!this.isInitialized) {
      throw new Error('SocialIntelligenceEngine not initialized');
    }

    try {
      const communityAnalysis = await this.socialCollection.analyzeSocialCommunities(agentId);
      
      // Enhance communities with role analysis
      const enhancedCommunities = communityAnalysis.communities.map(community => ({
        ...community,
        role: this.determineRoleInCommunity(community, agentId)
      }));

      return {
        communities: enhancedCommunities,
        networkMetrics: communityAnalysis.networkMetrics
      };
    } catch (error) {
      console.error('Community detection failed:', error);
      throw error;
    }
  }

  /**
   * Find social influencers in the network
   */
  async findInfluencers(
    agentId: string,
    criteria: {
      minInfluence?: number;
      minConnections?: number;
      maxDepth?: number;
      targetCommunities?: string[];
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
    influenceType: 'authority' | 'connector' | 'maven' | 'salesperson';
  }>> {
    if (!this.isInitialized) {
      throw new Error('SocialIntelligenceEngine not initialized');
    }

    try {
      const influencers = await this.socialCollection.findSocialInfluencers(agentId, criteria);
      
      // Classify influence types
      return influencers.map(influencer => ({
        ...influencer,
        influenceType: this.classifyInfluenceType(influencer.centralityMetrics, influencer.influenceScore)
      }));
    } catch (error) {
      console.error('Influencer analysis failed:', error);
      throw error;
    }
  }

  /**
   * Analyze network structure and metrics
   */
  private async analyzeNetwork(agentId: string, connections: SocialConnection[]): Promise<{
    totalConnections: number;
    activeConnections: number;
    networkReach: number;
    averageConnectionStrength: number;
    networkDensity: number;
    clusteringCoefficient: number;
  }> {
    const activeConnections = connections.filter(c => c.connection.status === 'active');
    const totalStrength = activeConnections.reduce((sum, c) => sum + c.connection.strength.overall, 0);
    
    // Estimate network reach using graph traversal
    let networkReach = 0;
    if (activeConnections.length > 0) {
      const sampleConnection = activeConnections[0];
      const traversalResults = await this.socialCollection.traverseSocialNetwork(
        sampleConnection.connection.participants.source.id,
        { maxDepth: 2, minStrength: 0.3 }
      );
      networkReach = traversalResults.length;
    }

    return {
      totalConnections: connections.length,
      activeConnections: activeConnections.length,
      networkReach,
      averageConnectionStrength: activeConnections.length > 0 ? totalStrength / activeConnections.length : 0,
      networkDensity: this.calculateNetworkDensity(activeConnections),
      clusteringCoefficient: this.calculateClusteringCoefficient(activeConnections)
    };
  }

  /**
   * Analyze social influence metrics
   */
  private async analyzeSocialInfluence(agentId: string, parameters: any): Promise<{
    personalInfluence: number;
    networkInfluence: number;
    authorityScore: number;
    reachEstimate: number;
    influentialConnections: Array<{
      personId: string;
      name: string;
      influenceScore: number;
      connectionPath: string[];
    }>;
  }> {
    const influencers = await this.socialCollection.findSocialInfluencers(agentId, {
      minInfluence: 0.3,
      minConnections: 3,
      maxDepth: parameters.maxDepth || 3
    });

    const personalInfluence = influencers.length > 0 ? 
      influencers.reduce((sum, inf) => sum + inf.influenceScore, 0) / influencers.length : 0;

    return {
      personalInfluence,
      networkInfluence: personalInfluence * Math.log(influencers.length + 1),
      authorityScore: influencers.length > 0 ? 
        Math.max(...influencers.map(inf => inf.centralityMetrics.eigenvector)) : 0,
      reachEstimate: influencers.reduce((sum, inf) => sum + inf.reachEstimate, 0),
      influentialConnections: influencers.slice(0, 10).map(inf => ({
        personId: inf.person.connection.participants.target.id,
        name: inf.person.connection.participants.target.name,
        influenceScore: inf.influenceScore,
        connectionPath: [agentId, inf.person.connection.participants.target.id] // Simplified
      }))
    };
  }

  /**
   * Analyze relationship patterns and trends
   */
  private async analyzeRelationships(agentId: string, connections: SocialConnection[]): Promise<{
    strongConnections: SocialConnection[];
    weakConnections: SocialConnection[];
    growingConnections: SocialConnection[];
    decliningConnections: SocialConnection[];
    mutualConnections: Array<{
      personId: string;
      mutualFriends: string[];
      connectionStrength: number;
    }>;
  }> {
    const strongConnections = connections.filter(c => c.connection.strength.overall >= 0.7);
    const weakConnections = connections.filter(c => c.connection.strength.overall < 0.3);
    const growingConnections = connections.filter(c => (c.connection as any).evolution?.trajectory?.direction === 'strengthening');
    const decliningConnections = connections.filter(c => (c.connection as any).evolution?.trajectory?.direction === 'weakening');

    // Simplified mutual connections analysis
    const mutualConnections = connections.slice(0, 5).map(c => ({
      personId: c.connection.participants.target.id,
      mutualFriends: c.connection.context.commonalities.shared_connections,
      connectionStrength: c.connection.strength.overall
    }));

    return {
      strongConnections,
      weakConnections,
      growingConnections,
      decliningConnections,
      mutualConnections
    };
  }

  /**
   * Generate social recommendations based on analysis
   */
  private async generateSocialRecommendations(
    agentId: string,
    networkAnalysis: any,
    influenceMetrics: any,
    communities: any,
    relationships: any
  ): Promise<Array<{
    type: 'strengthen_connection' | 'expand_network' | 'bridge_communities' | 'leverage_influence' | 'resolve_conflict';
    priority: number;
    description: string;
    targetPersons: string[];
    expectedOutcome: string;
    actionSteps: string[];
  }>> {
    const recommendations = [];

    // Recommend strengthening weak but growing connections
    if (relationships.growingConnections.length > 0) {
      recommendations.push({
        type: 'strengthen_connection' as const,
        priority: 0.8,
        description: 'Focus on strengthening growing relationships',
        targetPersons: relationships.growingConnections.slice(0, 3).map((c: any) => c.connection.participants.target.id),
        expectedOutcome: 'Stronger social bonds and increased network stability',
        actionSteps: [
          'Increase interaction frequency',
          'Engage in shared activities',
          'Provide mutual support'
        ]
      });
    }

    // Recommend network expansion if network is small
    if (networkAnalysis.activeConnections < 10) {
      recommendations.push({
        type: 'expand_network' as const,
        priority: 0.7,
        description: 'Expand your social network through existing connections',
        targetPersons: relationships.strongConnections.slice(0, 2).map((c: any) => c.connection.participants.target.id),
        expectedOutcome: 'Increased network reach and opportunities',
        actionSteps: [
          'Ask for introductions',
          'Attend social events',
          'Join communities of interest'
        ]
      });
    }

    // Recommend leveraging influence if high influence score
    if (influenceMetrics.personalInfluence > 0.6) {
      recommendations.push({
        type: 'leverage_influence' as const,
        priority: 0.9,
        description: 'Leverage your social influence for positive impact',
        targetPersons: influenceMetrics.influentialConnections.slice(0, 3).map((c: any) => c.personId),
        expectedOutcome: 'Increased positive impact and leadership recognition',
        actionSteps: [
          'Share valuable insights',
          'Mentor others',
          'Lead collaborative initiatives'
        ]
      });
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Calculate influence score based on connection and depth
   */
  private calculateInfluenceScore(person: SocialConnection, depth: number): number {
    const baseInfluence = person.connection.network_position.influence.authority;
    const depthPenalty = Math.pow(0.8, depth); // Influence decreases with distance
    return baseInfluence * depthPenalty;
  }

  /**
   * Calculate bridge potential between two connections
   */
  private calculateBridgePotential(strength1: number, strength2: number): number {
    return (strength1 + strength2) / 2 * Math.min(strength1, strength2);
  }

  /**
   * Determine role in community
   */
  private determineRoleInCommunity(community: any, agentId: string): 'member' | 'leader' | 'influencer' | 'bridge' | 'peripheral' {
    if (community.centralMembers.includes(agentId)) {
      return 'leader';
    }
    if (community.bridgeMembers.includes(agentId)) {
      return 'bridge';
    }
    if (community.influence > 0.7) {
      return 'influencer';
    }
    if (community.members.includes(agentId)) {
      return 'member';
    }
    return 'peripheral';
  }

  /**
   * Classify influence type based on metrics
   */
  private classifyInfluenceType(
    centrality: any,
    influenceScore: number
  ): 'authority' | 'connector' | 'maven' | 'salesperson' {
    if (centrality.eigenvector > 0.7) {
      return 'authority';
    }
    if (centrality.betweenness > 0.6) {
      return 'connector';
    }
    if (centrality.degree > 10 && influenceScore > 0.6) {
      return 'maven';
    }
    return 'salesperson';
  }

  /**
   * Calculate network density
   */
  private calculateNetworkDensity(connections: SocialConnection[]): number {
    if (connections.length < 2) return 0;
    const uniqueNodes = new Set();
    connections.forEach(c => {
      uniqueNodes.add(c.connection.participants.source.id);
      uniqueNodes.add(c.connection.participants.target.id);
    });
    const nodeCount = uniqueNodes.size;
    const maxPossibleEdges = (nodeCount * (nodeCount - 1)) / 2;
    return connections.length / maxPossibleEdges;
  }

  /**
   * Calculate clustering coefficient
   */
  private calculateClusteringCoefficient(connections: SocialConnection[]): number {
    // Simplified clustering coefficient calculation
    const strongConnections = connections.filter(c => c.connection.strength.overall > 0.5);
    return strongConnections.length / Math.max(connections.length, 1);
  }

  /**
   * Calculate computational complexity
   */
  private calculateComplexity(nodeCount: number, depth: number): number {
    return Math.pow(nodeCount, depth) / 1000; // Normalized complexity score
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Cleanup any resources if needed
  }
}
