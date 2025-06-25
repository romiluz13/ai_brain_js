/**
 * @file CommunicationProtocolCollection - MongoDB collection for communication protocol management
 * 
 * This collection demonstrates MongoDB's change streams and protocol versioning capabilities
 * for real-time communication coordination between AI agents. Showcases MongoDB's advanced
 * features for protocol negotiation, message routing, and adaptation learning.
 * 
 * Features:
 * - Change streams for real-time protocol updates
 * - Protocol versioning and compatibility management
 * - Message routing and delivery tracking
 * - Communication pattern analysis
 * - Protocol adaptation and learning
 */

import { Db, ObjectId, ChangeStream } from 'mongodb';
import { BaseCollection, BaseDocument } from './BaseCollection';

export interface CommunicationProtocol extends BaseDocument {
  agentId: string;
  sessionId?: string;
  timestamp: Date;
  
  // Protocol identification
  protocol: {
    id: string;
    name: string;
    version: string;
    type: 'request_response' | 'publish_subscribe' | 'streaming' | 'broadcast' | 'peer_to_peer';
    category: 'coordination' | 'negotiation' | 'information_sharing' | 'task_delegation' | 'status_update';
    priority: 'critical' | 'high' | 'medium' | 'low';
    
    // Protocol specification
    specification: {
      messageFormat: 'json' | 'xml' | 'protobuf' | 'custom';
      encoding: 'utf8' | 'base64' | 'binary';
      compression: 'none' | 'gzip' | 'lz4' | 'snappy';
      encryption: 'none' | 'aes256' | 'rsa' | 'tls';
      authentication: 'none' | 'token' | 'certificate' | 'signature';
    };
    
    // Protocol metadata
    metadata: {
      description: string;
      author: string;
      createdDate: Date;
      lastModified: Date;
      compatibility: string[]; // Compatible protocol versions
      deprecationDate?: Date;
      replacedBy?: string; // Protocol ID that replaces this one
    };
  };
  
  // Communication participants
  participants: {
    sender: {
      agentId: string;
      role: 'initiator' | 'responder' | 'mediator' | 'observer';
      capabilities: string[];
      preferences: {
        preferredProtocols: string[];
        maxMessageSize: number;
        timeoutSettings: number;
        retryPolicy: 'none' | 'linear' | 'exponential' | 'custom';
      };
    };
    
    receivers: Array<{
      agentId: string;
      role: 'primary' | 'secondary' | 'backup' | 'observer';
      status: 'active' | 'inactive' | 'busy' | 'unavailable';
      lastSeen: Date;
      acknowledgmentRequired: boolean;
      deliveryConfirmed: boolean;
    }>;
    
    // Group communication settings
    group: {
      id?: string;
      name?: string;
      type: 'adhoc' | 'persistent' | 'temporary' | 'hierarchical';
      membershipPolicy: 'open' | 'closed' | 'invite_only' | 'approval_required';
      moderationEnabled: boolean;
      maxParticipants?: number;
    };
  };
  
  // Message routing and delivery
  routing: {
    // Routing strategy
    strategy: 'direct' | 'broadcast' | 'multicast' | 'anycast' | 'load_balanced';
    path: Array<{
      agentId: string;
      timestamp: Date;
      action: 'forward' | 'process' | 'filter' | 'transform' | 'cache';
      latency: number; // milliseconds
      success: boolean;
      errorCode?: string;
    }>;
    
    // Delivery tracking
    delivery: {
      attempts: number;
      maxAttempts: number;
      lastAttempt: Date;
      nextRetry?: Date;
      status: 'pending' | 'delivered' | 'failed' | 'expired' | 'cancelled';
      confirmations: Array<{
        agentId: string;
        timestamp: Date;
        status: 'received' | 'processed' | 'acknowledged' | 'rejected';
        responseTime: number;
      }>;
    };
    
    // Quality of service
    qos: {
      reliability: 'at_most_once' | 'at_least_once' | 'exactly_once';
      ordering: 'none' | 'fifo' | 'priority' | 'causal' | 'total';
      durability: 'memory' | 'disk' | 'replicated' | 'persistent';
      latencyTarget: number; // milliseconds
      throughputTarget: number; // messages per second
    };
  };
  
  // Protocol negotiation
  negotiation: {
    // Negotiation process
    process: {
      initiated: Date;
      completed?: Date;
      status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'timeout';
      rounds: Array<{
        round: number;
        timestamp: Date;
        proposer: string;
        proposal: {
          protocolId: string;
          parameters: Record<string, any>;
          constraints: Record<string, any>;
        };
        responses: Array<{
          agentId: string;
          decision: 'accept' | 'reject' | 'counter' | 'defer';
          reasoning: string;
          counterProposal?: Record<string, any>;
        }>;
      }>;
    };
    
    // Negotiation outcome
    outcome: {
      agreedProtocol: string;
      parameters: Record<string, any>;
      validUntil: Date;
      renegotiationTriggers: string[];
      fallbackProtocols: string[];
    };
    
    // Adaptation learning
    learning: {
      successRate: number; // 0-1
      averageNegotiationTime: number; // milliseconds
      commonFailureReasons: string[];
      preferredParameters: Record<string, any>;
      adaptationHistory: Array<{
        date: Date;
        change: string;
        reason: string;
        impact: number; // -1 to 1
      }>;
    };
  };
  
  // Performance metrics
  performance: {
    // Latency metrics
    latency: {
      negotiation: number; // milliseconds
      firstMessage: number; // milliseconds
      averageMessage: number; // milliseconds
      endToEnd: number; // milliseconds
    };
    
    // Throughput metrics
    throughput: {
      messagesPerSecond: number;
      bytesPerSecond: number;
      peakThroughput: number;
      sustainedThroughput: number;
    };
    
    // Reliability metrics
    reliability: {
      successRate: number; // 0-1
      errorRate: number; // 0-1
      timeoutRate: number; // 0-1
      retransmissionRate: number; // 0-1
    };
    
    // Efficiency metrics
    efficiency: {
      protocolOverhead: number; // bytes
      compressionRatio: number; // 0-1
      bandwidthUtilization: number; // 0-1
      resourceUsage: {
        cpu: number; // 0-1
        memory: number; // bytes
        network: number; // bytes
      };
    };
  };
  
  // Analytics and insights
  analytics: {
    // Usage patterns
    patterns: {
      peakUsageTimes: string[];
      commonMessageTypes: string[];
      frequentParticipants: string[];
      typicalSessionDuration: number; // milliseconds
      messageVolumeDistribution: Record<string, number>;
    };
    
    // Trend analysis
    trends: {
      usageGrowth: number; // -1 to 1
      performanceImprovement: number; // -1 to 1
      errorReduction: number; // -1 to 1
      adaptationEffectiveness: number; // 0-1
    };
    
    // Predictions
    predictions: {
      futureUsage: number;
      expectedPerformance: number;
      recommendedOptimizations: string[];
      riskFactors: string[];
    };
    
    insights: string[]; // AI-generated insights
    recommendations: string[]; // Actionable recommendations
  };
  
  // Metadata and tracking
  metadata: {
    framework: string;
    version: string;
    environment: 'development' | 'testing' | 'staging' | 'production';
    region: string;
    lastUpdated: Date;
    
    // Quality indicators
    quality: {
      completeness: number; // 0-1
      accuracy: number; // 0-1
      freshness: number; // 0-1
      consistency: number; // 0-1
    };
  };
}

export interface ProtocolFilter {
  agentId?: string;
  'protocol.type'?: string;
  'protocol.category'?: string;
  'protocol.priority'?: string;
  'participants.sender.agentId'?: string;
  'routing.delivery.status'?: string;
  'negotiation.process.status'?: string;
  timestamp?: { $gte?: Date; $lte?: Date };
}

/**
 * CommunicationProtocolCollection - Manages communication protocols with change streams
 * 
 * This collection demonstrates MongoDB's change streams capabilities:
 * - Real-time protocol updates and notifications
 * - Protocol versioning and compatibility tracking
 * - Message routing and delivery monitoring
 * - Communication pattern analysis
 * - Protocol adaptation and learning
 */
export class CommunicationProtocolCollection extends BaseCollection<CommunicationProtocol> {
  protected collectionName = 'agent_communication_protocols';
  private changeStream?: ChangeStream;

  constructor(db: Db) {
    super(db);
    this.collection = db.collection<CommunicationProtocol>(this.collectionName);
  }

  /**
   * Create indexes optimized for communication protocol management
   */
  async createIndexes(): Promise<void> {
    try {
      // Agent and protocol identification index
      await this.collection.createIndex({
        agentId: 1,
        'protocol.id': 1,
        'protocol.version': 1,
        timestamp: -1
      }, {
        name: 'agent_protocol_version',
        background: true
      });

      // Protocol type and category index
      await this.collection.createIndex({
        'protocol.type': 1,
        'protocol.category': 1,
        'protocol.priority': 1,
        'negotiation.process.status': 1
      }, {
        name: 'protocol_classification',
        background: true
      });

      // Communication participants index
      await this.collection.createIndex({
        'participants.sender.agentId': 1,
        'participants.receivers.agentId': 1,
        'participants.group.id': 1
      }, {
        name: 'communication_participants',
        background: true
      });

      // Message routing and delivery index
      await this.collection.createIndex({
        'routing.delivery.status': 1,
        'routing.delivery.lastAttempt': -1,
        'routing.qos.reliability': 1
      }, {
        name: 'routing_delivery_tracking',
        background: true
      });

      // Performance metrics index
      await this.collection.createIndex({
        'performance.latency.averageMessage': 1,
        'performance.throughput.messagesPerSecond': -1,
        'performance.reliability.successRate': -1
      }, {
        name: 'performance_metrics',
        background: true
      });

      // Protocol negotiation index
      await this.collection.createIndex({
        'negotiation.process.status': 1,
        'negotiation.process.initiated': -1,
        'negotiation.learning.successRate': -1
      }, {
        name: 'protocol_negotiation',
        background: true
      });

      // Analytics and trends index
      await this.collection.createIndex({
        'analytics.trends.usageGrowth': -1,
        'analytics.trends.performanceImprovement': -1,
        'analytics.patterns.peakUsageTimes': 1
      }, {
        name: 'analytics_trends',
        background: true
      });

      console.log('✅ CommunicationProtocolCollection indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating CommunicationProtocolCollection indexes:', error);
      throw error;
    }
  }

  /**
   * Record a new communication protocol
   */
  async recordProtocol(protocol: Omit<CommunicationProtocol, '_id' | 'createdAt' | 'updatedAt'>): Promise<ObjectId> {
    const protocolWithTimestamp = {
      ...protocol,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await this.collection.insertOne(protocolWithTimestamp);
    return result.insertedId;
  }

  /**
   * Get protocols for an agent
   */
  async getAgentProtocols(
    agentId: string,
    filter?: Partial<ProtocolFilter>
  ): Promise<CommunicationProtocol[]> {
    const query = { agentId, ...filter };

    return await this.collection.find(query)
      .sort({ timestamp: -1 })
      .toArray();
  }

  /**
   * Update protocol status
   */
  async updateProtocolStatus(
    protocolId: ObjectId,
    status: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const updateFields: any = {
      'negotiation.process.status': status,
      updatedAt: new Date()
    };

    if (metadata) {
      Object.keys(metadata).forEach(key => {
        updateFields[key] = metadata[key];
      });
    }

    await this.collection.updateOne(
      { _id: protocolId },
      { $set: updateFields }
    );
  }

  /**
   * Start change stream monitoring for real-time protocol updates
   */
  startChangeStreamMonitoring(
    callback: (change: any) => void,
    filter?: Record<string, any>
  ): void {
    const pipeline = filter ? [{ $match: filter }] : [];

    this.changeStream = this.collection.watch(pipeline, {
      fullDocument: 'updateLookup'
    });

    this.changeStream.on('change', callback);
    this.changeStream.on('error', (error) => {
      console.error('Change stream error:', error);
    });

    console.log('✅ Change stream monitoring started for communication protocols');
  }

  /**
   * Stop change stream monitoring
   */
  stopChangeStreamMonitoring(): void {
    if (this.changeStream) {
      this.changeStream.close();
      this.changeStream = undefined;
      console.log('✅ Change stream monitoring stopped');
    }
  }

  /**
   * Analyze protocol performance using aggregation
   */
  async analyzeProtocolPerformance(agentId?: string): Promise<{
    averageLatency: number;
    successRate: number;
    throughputMetrics: any;
    commonFailures: string[];
    recommendations: string[];
  }> {
    const filter = agentId ? { agentId } : {};

    const performanceStats = await this.collection.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          avgLatency: { $avg: '$performance.latency.averageMessage' },
          avgSuccessRate: { $avg: '$performance.reliability.successRate' },
          avgThroughput: { $avg: '$performance.throughput.messagesPerSecond' },
          totalProtocols: { $sum: 1 }
        }
      }
    ]).toArray();

    const failureAnalysis = await this.collection.aggregate([
      { $match: filter },
      { $unwind: '$negotiation.learning.commonFailureReasons' },
      {
        $group: {
          _id: '$negotiation.learning.commonFailureReasons',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]).toArray();

    const stats = performanceStats[0] || {
      avgLatency: 0,
      avgSuccessRate: 0,
      avgThroughput: 0,
      totalProtocols: 0
    };

    const commonFailures = failureAnalysis.map(f => f._id);
    const recommendations = this.generatePerformanceRecommendations(stats, commonFailures);

    return {
      averageLatency: stats.avgLatency || 0,
      successRate: stats.avgSuccessRate || 0,
      throughputMetrics: {
        messagesPerSecond: stats.avgThroughput || 0,
        totalProtocols: stats.totalProtocols
      },
      commonFailures,
      recommendations
    };
  }

  /**
   * Get protocol compatibility matrix
   */
  async getProtocolCompatibility(): Promise<Array<{
    protocolId: string;
    version: string;
    compatibleWith: string[];
    deprecationStatus: string;
  }>> {
    return await this.collection.aggregate([
      {
        $group: {
          _id: '$protocol.id',
          latestVersion: { $max: '$protocol.version' },
          compatibility: { $first: '$protocol.metadata.compatibility' },
          deprecationDate: { $first: '$protocol.metadata.deprecationDate' },
          replacedBy: { $first: '$protocol.metadata.replacedBy' }
        }
      },
      {
        $project: {
          protocolId: '$_id',
          version: '$latestVersion',
          compatibleWith: '$compatibility',
          deprecationStatus: {
            $cond: {
              if: { $ne: ['$deprecationDate', null] },
              then: 'deprecated',
              else: 'active'
            }
          },
          _id: 0
        }
      }
    ]).toArray();
  }

  private generatePerformanceRecommendations(stats: any, failures: string[]): string[] {
    const recommendations = [];

    if (stats.avgLatency > 1000) {
      recommendations.push('Consider optimizing message routing for better latency');
    }

    if (stats.avgSuccessRate < 0.9) {
      recommendations.push('Improve error handling and retry mechanisms');
    }

    if (failures.includes('timeout')) {
      recommendations.push('Adjust timeout settings based on network conditions');
    }

    if (failures.includes('incompatible_protocol')) {
      recommendations.push('Implement better protocol negotiation strategies');
    }

    return recommendations;
  }
}
