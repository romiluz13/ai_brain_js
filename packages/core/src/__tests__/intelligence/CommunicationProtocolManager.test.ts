/**
 * @file CommunicationProtocolManager.test.ts - Comprehensive tests for CommunicationProtocolManager
 * 
 * Tests the CommunicationProtocolManager's ability to:
 * - Negotiate communication protocols with change streams
 * - Route messages using established protocols
 * - Adapt protocols based on performance feedback
 * - Analyze communication patterns and generate analytics
 * - Demonstrate MongoDB's change streams and protocol versioning
 */

import { MongoClient, Db } from 'mongodb';
import { CommunicationProtocolManager } from '../../intelligence/CommunicationProtocolManager';
import { CommunicationProtocolCollection } from '../../collections/CommunicationProtocolCollection';

describe('CommunicationProtocolManager - Real MongoDB Integration', () => {
  let client: MongoClient;
  let db: Db;
  let protocolManager: CommunicationProtocolManager;
  let protocolCollection: CommunicationProtocolCollection;

  beforeAll(async () => {
    // Connect to test MongoDB instance
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    client = new MongoClient(uri);
    await client.connect();
    
    // Use test database
    db = client.db('test_ai_brain_communication_protocol');
    protocolManager = new CommunicationProtocolManager(db);
    protocolCollection = new CommunicationProtocolCollection(db);
    
    // Initialize the manager
    await protocolManager.initialize();
  });

  afterAll(async () => {
    // Clean up test data
    await protocolManager.cleanup();
    await db.dropDatabase();
    await client.close();
  });

  beforeEach(async () => {
    // Clear collections before each test
    await db.collection('agent_communication_protocols').deleteMany({});
  });

  describe('Protocol Negotiation with Change Streams', () => {
    it('should negotiate communication protocol between agents', async () => {
      const agentId = 'test-agent-protocol-001';
      
      const negotiationRequest = {
        agentId,
        targetAgents: ['agent-002', 'agent-003'],
        communicationType: 'request_response' as const,
        category: 'coordination' as const,
        priority: 'high' as const,
        requirements: {
          latencyTarget: 100, // 100ms
          reliabilityLevel: 'exactly_once' as const,
          securityLevel: 'enhanced' as const,
          messageFormat: 'json' as const,
          maxMessageSize: 1024 * 1024, // 1MB
          timeoutSettings: 5000 // 5 seconds
        },
        constraints: {
          allowedProtocols: ['http_rest', 'websocket'],
          forbiddenProtocols: ['ftp'],
          maxNegotiationTime: 10000, // 10 seconds
          fallbackRequired: true
        }
      };

      // Negotiate the protocol
      const negotiationResult = await protocolManager.negotiateProtocol(negotiationRequest);
      
      expect(negotiationResult.protocolId).toBeDefined();
      expect(negotiationResult.negotiationId).toBeDefined();
      expect(negotiationResult.agreedParameters).toEqual(negotiationRequest.requirements);
      expect(negotiationResult.participantConfirmations).toHaveLength(2);
      expect(negotiationResult.participantConfirmations.every(p => p.confirmed)).toBe(true);

      // Verify the protocol was recorded in MongoDB
      const recordedProtocol = await protocolCollection.collection.findOne({ 
        _id: negotiationResult.negotiationId 
      });
      
      expect(recordedProtocol).toBeDefined();
      expect(recordedProtocol!.agentId).toBe(agentId);
      expect(recordedProtocol!.protocol.type).toBe('request_response');
      expect(recordedProtocol!.protocol.category).toBe('coordination');
      expect(recordedProtocol!.protocol.priority).toBe('high');
      expect(recordedProtocol!.negotiation.process.status).toBe('in_progress');
    });

    it('should handle multiple concurrent protocol negotiations', async () => {
      const agentId = 'test-agent-concurrent';
      
      const negotiations = [
        {
          agentId,
          targetAgents: ['agent-004'],
          communicationType: 'streaming' as const,
          category: 'information_sharing' as const,
          priority: 'medium' as const,
          requirements: {
            latencyTarget: 50,
            reliabilityLevel: 'at_least_once' as const,
            securityLevel: 'basic' as const,
            messageFormat: 'protobuf' as const,
            maxMessageSize: 512 * 1024,
            timeoutSettings: 3000
          }
        },
        {
          agentId,
          targetAgents: ['agent-005', 'agent-006'],
          communicationType: 'broadcast' as const,
          category: 'status_update' as const,
          priority: 'low' as const,
          requirements: {
            latencyTarget: 200,
            reliabilityLevel: 'at_most_once' as const,
            securityLevel: 'none' as const,
            messageFormat: 'json' as const,
            maxMessageSize: 256 * 1024,
            timeoutSettings: 2000
          }
        }
      ];

      // Start concurrent negotiations
      const results = await Promise.all(
        negotiations.map(req => protocolManager.negotiateProtocol(req))
      );

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.protocolId).toBeDefined();
        expect(result.negotiationId).toBeDefined();
      });

      // Verify both protocols were recorded
      const protocols = await protocolCollection.getAgentProtocols(agentId);
      expect(protocols).toHaveLength(2);
      
      const streamingProtocol = protocols.find(p => p.protocol.type === 'streaming');
      const broadcastProtocol = protocols.find(p => p.protocol.type === 'broadcast');
      
      expect(streamingProtocol).toBeDefined();
      expect(broadcastProtocol).toBeDefined();
    });
  });

  describe('Message Routing and Delivery', () => {
    it('should route messages using established protocols', async () => {
      const agentId = 'test-agent-routing';
      
      // First establish a protocol
      const negotiationResult = await protocolManager.negotiateProtocol({
        agentId,
        targetAgents: ['agent-007', 'agent-008'],
        communicationType: 'peer_to_peer',
        category: 'task_delegation',
        priority: 'critical',
        requirements: {
          latencyTarget: 75,
          reliabilityLevel: 'exactly_once',
          securityLevel: 'maximum',
          messageFormat: 'json',
          maxMessageSize: 2 * 1024 * 1024,
          timeoutSettings: 8000
        }
      });

      // Route a message using the protocol
      const routingRequest = {
        protocolId: negotiationResult.protocolId,
        senderId: agentId,
        receiverIds: ['agent-007', 'agent-008'],
        messageType: 'task_assignment',
        priority: 'critical' as const,
        content: {
          taskId: 'task-123',
          description: 'Process data analysis',
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        },
        routing: {
          strategy: 'direct' as const,
          requireAcknowledgment: true,
          maxRetries: 3,
          timeoutMs: 5000
        }
      };

      const routingResult = await protocolManager.routeMessage(routingRequest);
      
      expect(routingResult.messageId).toBeDefined();
      expect(routingResult.routingPath).toHaveLength(2);
      expect(routingResult.deliveryStatus).toBe('delivered');
      expect(routingResult.estimatedDeliveryTime).toBeGreaterThan(0);

      // Verify routing information was updated in the protocol
      const updatedProtocol = await protocolCollection.collection.findOne({
        'protocol.id': negotiationResult.protocolId
      });
      
      expect(updatedProtocol).toBeDefined();
      expect(updatedProtocol!.routing.path).toHaveLength(1);
      expect(updatedProtocol!.routing.delivery.status).toBe('pending');
    });
  });

  describe('Protocol Adaptation and Learning', () => {
    it('should adapt protocols based on performance feedback', async () => {
      const agentId = 'test-agent-adaptation';
      
      // Establish a protocol
      const negotiationResult = await protocolManager.negotiateProtocol({
        agentId,
        targetAgents: ['agent-009'],
        communicationType: 'request_response',
        category: 'coordination',
        priority: 'medium',
        requirements: {
          latencyTarget: 100,
          reliabilityLevel: 'at_least_once',
          securityLevel: 'basic',
          messageFormat: 'json',
          maxMessageSize: 1024 * 1024,
          timeoutSettings: 5000
        }
      });

      // Simulate poor performance and request adaptation
      const adaptationRequest = {
        protocolId: negotiationResult.protocolId,
        agentId,
        performanceData: {
          latency: 1500, // High latency
          successRate: 0.75, // Low success rate
          errorRate: 0.25, // High error rate
          throughput: 10 // Low throughput
        },
        issues: ['high_latency', 'connection_timeouts', 'message_loss'],
        suggestedChanges: {
          compressionEnabled: true,
          maxRetries: 5,
          timeoutMs: 10000
        }
      };

      const adaptationResult = await protocolManager.adaptProtocol(adaptationRequest);
      
      expect(adaptationResult.adaptationId).toBeDefined();
      expect(adaptationResult.changesApplied).toEqual(
        expect.objectContaining({
          compressionEnabled: true,
          maxRetries: 5
        })
      );
      expect(adaptationResult.expectedImprovements).toEqual(
        expect.objectContaining({
          latencyReduction: expect.any(Number),
          successRateIncrease: expect.any(Number)
        })
      );
      expect(adaptationResult.riskAssessment).toBeInstanceOf(Array);

      // Verify adaptation was recorded in the protocol
      const adaptedProtocol = await protocolCollection.collection.findOne({
        'protocol.id': negotiationResult.protocolId
      });
      
      expect(adaptedProtocol).toBeDefined();
      expect(adaptedProtocol!.negotiation.learning.adaptationHistory).toHaveLength(1);
      expect(adaptedProtocol!.performance.reliability.successRate).toBeGreaterThan(0.75);
    });
  });

  describe('Communication Analytics and Pattern Recognition', () => {
    it('should analyze communication patterns and generate insights', async () => {
      const agentId = 'test-agent-analytics';

      // Create multiple protocols for analysis
      const protocols = [
        {
          agentId,
          targetAgents: ['agent-010'],
          communicationType: 'request_response' as const,
          category: 'coordination' as const,
          priority: 'high' as const
        },
        {
          agentId,
          targetAgents: ['agent-011', 'agent-012'],
          communicationType: 'broadcast' as const,
          category: 'status_update' as const,
          priority: 'medium' as const
        }
      ];

      for (const protocolReq of protocols) {
        await protocolManager.negotiateProtocol({
          ...protocolReq,
          requirements: {
            latencyTarget: 100,
            reliabilityLevel: 'exactly_once',
            securityLevel: 'enhanced',
            messageFormat: 'json',
            maxMessageSize: 1024 * 1024,
            timeoutSettings: 5000
          }
        });
      }

      // Analyze communication patterns
      const analytics = await protocolManager.analyzeCommunicationPatterns(agentId, 7);
      
      expect(analytics.protocolUsage).toBeInstanceOf(Array);
      expect(analytics.agentInteractions).toBeInstanceOf(Array);
      expect(analytics.performanceMetrics).toEqual(
        expect.objectContaining({
          overallLatency: expect.any(Number),
          overallSuccessRate: expect.any(Number),
          protocolNegotiationTime: expect.any(Number),
          adaptationEffectiveness: expect.any(Number)
        })
      );
      expect(analytics.patterns).toEqual(
        expect.objectContaining({
          peakCommunicationTimes: expect.any(Array),
          commonMessageTypes: expect.any(Array),
          frequentFailureReasons: expect.any(Array)
        })
      );
      expect(analytics.recommendations).toEqual(
        expect.objectContaining({
          protocolOptimizations: expect.any(Array),
          infrastructureImprovements: expect.any(Array),
          agentBehaviorSuggestions: expect.any(Array)
        })
      );
    });

    it('should track active protocols for an agent', async () => {
      const agentId = 'test-agent-active-protocols';
      
      // Create several protocols
      const protocolRequests = [
        { type: 'streaming', category: 'information_sharing' },
        { type: 'peer_to_peer', category: 'task_delegation' },
        { type: 'broadcast', category: 'status_update' }
      ];

      for (const req of protocolRequests) {
        await protocolManager.negotiateProtocol({
          agentId,
          targetAgents: ['agent-013'],
          communicationType: req.type as any,
          category: req.category as any,
          priority: 'medium',
          requirements: {
            latencyTarget: 100,
            reliabilityLevel: 'at_least_once',
            securityLevel: 'basic',
            messageFormat: 'json',
            maxMessageSize: 1024 * 1024,
            timeoutSettings: 5000
          }
        });
      }

      // Get active protocols
      const activeProtocols = await protocolManager.getActiveProtocols(agentId);
      
      expect(activeProtocols).toHaveLength(3);
      activeProtocols.forEach(protocol => {
        expect(protocol.protocolId).toBeDefined();
        expect(protocol.type).toBeDefined();
        expect(protocol.status).toBeDefined();
        expect(protocol.participants).toBeInstanceOf(Array);
        expect(protocol.performance).toEqual(
          expect.objectContaining({
            latency: expect.any(Number),
            successRate: expect.any(Number),
            throughput: expect.any(Number)
          })
        );
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle uninitialized manager gracefully', async () => {
      const uninitializedManager = new CommunicationProtocolManager(db);

      await expect(uninitializedManager.negotiateProtocol({
        agentId: 'test',
        targetAgents: ['agent-test'],
        communicationType: 'request_response',
        category: 'coordination',
        priority: 'medium',
        requirements: {
          latencyTarget: 100,
          reliabilityLevel: 'exactly_once',
          securityLevel: 'basic',
          messageFormat: 'json',
          maxMessageSize: 1024,
          timeoutSettings: 5000
        }
      })).rejects.toThrow('CommunicationProtocolManager must be initialized first');
    });

    it('should handle invalid protocol IDs gracefully', async () => {
      await expect(protocolManager.routeMessage({
        protocolId: 'non-existent-protocol',
        senderId: 'test-agent',
        receiverIds: ['agent-test'],
        messageType: 'test',
        priority: 'low',
        content: {},
        routing: {
          strategy: 'direct',
          requireAcknowledgment: false,
          maxRetries: 1,
          timeoutMs: 1000
        }
      })).resolves.toBeDefined(); // Should handle gracefully
    });
  });
});
