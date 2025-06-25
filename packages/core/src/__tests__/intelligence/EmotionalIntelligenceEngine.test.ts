/**
 * @file EmotionalIntelligenceEngine.test.ts - Comprehensive tests for emotional intelligence
 * 
 * Tests the EmotionalIntelligenceEngine's ability to:
 * - Detect emotions from text input
 * - Store emotional states with TTL decay
 * - Analyze emotional patterns using MongoDB aggregation
 * - Provide emotional guidance for AI responses
 * - Learn from emotional interactions
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';
import { EmotionalIntelligenceEngine } from '../../intelligence/EmotionalIntelligenceEngine';
import { EmotionalStateCollection } from '../../collections/EmotionalStateCollection';

describe('EmotionalIntelligenceEngine', () => {
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let db: Db;
  let emotionalEngine: EmotionalIntelligenceEngine;
  let emotionalCollection: EmotionalStateCollection;

  beforeAll(async () => {
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    db = mongoClient.db('test-emotional-intelligence');

    // Initialize emotional intelligence engine
    emotionalEngine = new EmotionalIntelligenceEngine(db);
    emotionalCollection = new EmotionalStateCollection(db);
    
    await emotionalEngine.initialize();
  });

  afterAll(async () => {
    await mongoClient.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clean up collections before each test
    await db.collection('agent_emotional_states').deleteMany({});
  });

  describe('Emotion Detection', () => {
    it('should detect positive emotions correctly', async () => {
      const context = {
        agentId: 'test-agent-001',
        sessionId: 'session-123',
        input: 'I am so happy and excited about this amazing solution!',
        conversationHistory: [
          { role: 'user', content: 'Can you help me?' },
          { role: 'assistant', content: 'Of course! I\'d be happy to help.' }
        ]
      };

      const emotion = await emotionalEngine.detectEmotion(context);

      expect(emotion.primary).toBe('joy');
      expect(emotion.intensity).toBeGreaterThan(0.5);
      expect(emotion.valence).toBeGreaterThan(0.5);
      expect(emotion.confidence).toBeGreaterThan(0.6);
      expect(emotion.reasoning).toContain('joy');
    });

    it('should detect negative emotions correctly', async () => {
      const context = {
        agentId: 'test-agent-002',
        sessionId: 'session-456',
        input: 'I am really frustrated and angry about this terrible experience!',
        conversationHistory: []
      };

      const emotion = await emotionalEngine.detectEmotion(context);

      expect(emotion.primary).toBe('anger');
      expect(emotion.intensity).toBeGreaterThan(0.3);
      expect(emotion.valence).toBeLessThan(-0.3);
      expect(emotion.confidence).toBeGreaterThan(0.6);
    });

    it('should handle neutral emotions', async () => {
      const context = {
        agentId: 'test-agent-003',
        sessionId: 'session-789',
        input: 'Please provide information about your services.',
        conversationHistory: []
      };

      const emotion = await emotionalEngine.detectEmotion(context);

      expect(emotion.intensity).toBeLessThan(0.5);
      expect(Math.abs(emotion.valence)).toBeLessThan(0.3);
    });
  });

  describe('Emotional State Processing', () => {
    it('should process and store emotional states with TTL', async () => {
      const context = {
        agentId: 'test-agent-004',
        sessionId: 'session-abc',
        input: 'Thank you so much! This is wonderful!',
        conversationHistory: []
      };

      const detectedEmotion = await emotionalEngine.detectEmotion(context);
      const response = await emotionalEngine.processEmotionalState(
        context,
        detectedEmotion,
        'Positive user feedback',
        'user_input'
      );

      // Verify emotional response structure
      expect(response.currentEmotion).toBeDefined();
      expect(response.emotionalGuidance).toBeDefined();
      expect(response.cognitiveImpact).toBeDefined();
      expect(response.recommendations).toBeInstanceOf(Array);

      // Verify emotional guidance
      expect(response.emotionalGuidance.responseStyle).toBeDefined();
      expect(response.emotionalGuidance.empathyLevel).toBeGreaterThanOrEqual(0);
      expect(response.emotionalGuidance.empathyLevel).toBeLessThanOrEqual(1);

      // Verify cognitive impact
      expect(response.cognitiveImpact.attentionFocus).toBeInstanceOf(Array);
      expect(response.cognitiveImpact.memoryPriority).toBeGreaterThanOrEqual(0);
      expect(response.cognitiveImpact.memoryPriority).toBeLessThanOrEqual(1);

      // Verify state was stored in MongoDB
      const storedState = await emotionalCollection.getCurrentEmotionalState(
        context.agentId,
        context.sessionId
      );
      expect(storedState).toBeDefined();
      expect(storedState!.emotions.primary).toBe(detectedEmotion.primary);
      expect(storedState!.expiresAt).toBeDefined();
    });

    it('should provide appropriate emotional guidance for different emotions', async () => {
      const contexts = [
        {
          agentId: 'test-agent-005',
          input: 'I am worried about this issue',
          expectedGuidance: { supportLevel: expect.any(Number) }
        },
        {
          agentId: 'test-agent-006', 
          input: 'This is absolutely perfect!',
          expectedGuidance: { responseStyle: expect.any(String) }
        }
      ];

      for (const testContext of contexts) {
        const context = {
          agentId: testContext.agentId,
          sessionId: 'session-guidance',
          input: testContext.input,
          conversationHistory: []
        };

        const emotion = await emotionalEngine.detectEmotion(context);
        const response = await emotionalEngine.processEmotionalState(
          context,
          emotion,
          'Test trigger',
          'user_input'
        );

        expect(response.emotionalGuidance).toMatchObject(testContext.expectedGuidance);
      }
    });
  });

  describe('MongoDB Time-Series and TTL Features', () => {
    it('should store emotional states with proper TTL expiration', async () => {
      const agentId = 'test-agent-ttl';
      const sessionId = 'session-ttl';

      // Create emotional state with short TTL for testing
      const emotionalState = {
        agentId,
        sessionId,
        timestamp: new Date(),
        emotions: {
          primary: 'joy',
          intensity: 0.8,
          valence: 0.9,
          arousal: 0.6,
          dominance: 0.7
        },
        context: {
          trigger: 'Test trigger',
          triggerType: 'user_input' as const,
          conversationTurn: 1
        },
        cognitiveEffects: {
          attentionModification: 0.3,
          memoryStrength: 0.9,
          decisionBias: 0.2,
          responseStyle: 'empathetic' as const
        },
        decay: {
          halfLife: 1, // 1 minute for testing
          decayFunction: 'exponential' as const,
          baselineReturn: 2 // 2 minutes for testing
        },
        metadata: {
          framework: 'test',
          model: 'test-model',
          confidence: 0.85,
          source: 'detected' as const,
          version: '1.0.0'
        }
      };

      const stateId = await emotionalCollection.recordEmotionalState(emotionalState);
      expect(stateId).toBeDefined();

      // Verify state exists
      const currentState = await emotionalCollection.getCurrentEmotionalState(agentId, sessionId);
      expect(currentState).toBeDefined();
      expect(currentState!.expiresAt).toBeDefined();
      expect(currentState!.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should create proper MongoDB indexes for time-series optimization', async () => {
      // Verify indexes were created
      const indexes = await db.collection('agent_emotional_states').listIndexes().toArray();
      
      const indexNames = indexes.map(idx => idx.name);
      expect(indexNames).toContain('agentId_timestamp_desc');
      expect(indexNames).toContain('emotional_decay_ttl');
      expect(indexNames).toContain('emotion_intensity_analysis');
      expect(indexNames).toContain('trigger_valence_analysis');
    });
  });

  describe('Emotional Analytics and Pattern Recognition', () => {
    it('should analyze emotional patterns using MongoDB aggregation', async () => {
      const agentId = 'test-agent-analytics';
      
      // Create multiple emotional states for pattern analysis
      const emotions = [
        { primary: 'joy', valence: 0.8, trigger: 'success', triggerType: 'task_completion' },
        { primary: 'concern', valence: -0.3, trigger: 'error', triggerType: 'error' },
        { primary: 'satisfaction', valence: 0.6, trigger: 'completion', triggerType: 'task_completion' },
        { primary: 'joy', valence: 0.9, trigger: 'praise', triggerType: 'user_input' }
      ];

      for (const emotion of emotions) {
        const state = {
          agentId,
          timestamp: new Date(),
          emotions: {
            primary: emotion.primary,
            intensity: 0.7,
            valence: emotion.valence,
            arousal: 0.5,
            dominance: 0.5
          },
          context: {
            trigger: emotion.trigger,
            triggerType: emotion.triggerType as any,
            conversationTurn: 1
          },
          cognitiveEffects: {
            attentionModification: 0.1,
            memoryStrength: 0.5,
            decisionBias: 0.1,
            responseStyle: 'analytical' as const
          },
          decay: {
            halfLife: 30,
            decayFunction: 'exponential' as const,
            baselineReturn: 60
          },
          metadata: {
            framework: 'test',
            model: 'test-model',
            confidence: 0.8,
            source: 'detected' as const,
            version: '1.0.0'
          }
        };
        
        await emotionalCollection.recordEmotionalState(state);
      }

      // Analyze patterns
      const patterns = await emotionalCollection.analyzeEmotionalPatterns(agentId, 1);
      
      expect(patterns.dominantEmotions).toBeInstanceOf(Array);
      expect(patterns.dominantEmotions.length).toBeGreaterThan(0);
      expect(patterns.emotionalStability).toBeGreaterThanOrEqual(0);
      expect(patterns.emotionalStability).toBeLessThanOrEqual(1);
      expect(patterns.triggerAnalysis).toBeInstanceOf(Array);
      expect(patterns.temporalPatterns).toBeInstanceOf(Array);

      // Verify dominant emotion analysis
      const joyEmotion = patterns.dominantEmotions.find(e => e.emotion === 'joy');
      expect(joyEmotion).toBeDefined();
      expect(joyEmotion!.frequency).toBe(2); // Two joy emotions were added
    });

    it('should provide emotional learning insights', async () => {
      const agentId = 'test-agent-learning';
      
      // Add some emotional states first
      await emotionalCollection.recordEmotionalState({
        agentId,
        timestamp: new Date(),
        emotions: {
          primary: 'satisfaction',
          intensity: 0.8,
          valence: 0.7,
          arousal: 0.4,
          dominance: 0.6
        },
        context: {
          trigger: 'Problem solved',
          triggerType: 'task_completion',
          conversationTurn: 5
        },
        cognitiveEffects: {
          attentionModification: 0.2,
          memoryStrength: 0.8,
          decisionBias: 0.1,
          responseStyle: 'analytical'
        },
        decay: {
          halfLife: 30,
          decayFunction: 'exponential',
          baselineReturn: 60
        },
        metadata: {
          framework: 'test',
          model: 'test-model',
          confidence: 0.85,
          source: 'detected',
          version: '1.0.0'
        }
      });

      const learning = await emotionalEngine.analyzeEmotionalLearning(agentId, 1);
      
      expect(learning.patterns).toBeInstanceOf(Array);
      expect(learning.improvements).toBeInstanceOf(Array);
      expect(learning.calibration).toBeDefined();
      expect(learning.calibration.accuracy).toBeGreaterThanOrEqual(0);
      expect(learning.calibration.accuracy).toBeLessThanOrEqual(1);
    });
  });

  describe('Emotional Timeline and Visualization', () => {
    it('should provide emotional timeline data', async () => {
      const agentId = 'test-agent-timeline';
      const sessionId = 'session-timeline';
      
      // Create timeline of emotions
      const timelineEmotions = [
        { emotion: 'neutral', time: new Date(Date.now() - 3600000) }, // 1 hour ago
        { emotion: 'concern', time: new Date(Date.now() - 1800000) }, // 30 min ago
        { emotion: 'satisfaction', time: new Date() } // now
      ];

      for (const item of timelineEmotions) {
        await emotionalCollection.recordEmotionalState({
          agentId,
          sessionId,
          timestamp: item.time,
          emotions: {
            primary: item.emotion,
            intensity: 0.6,
            valence: item.emotion === 'satisfaction' ? 0.7 : (item.emotion === 'concern' ? -0.3 : 0),
            arousal: 0.5,
            dominance: 0.5
          },
          context: {
            trigger: `Timeline event ${item.emotion}`,
            triggerType: 'user_input',
            conversationTurn: 1
          },
          cognitiveEffects: {
            attentionModification: 0.1,
            memoryStrength: 0.5,
            decisionBias: 0.0,
            responseStyle: 'analytical'
          },
          decay: {
            halfLife: 30,
            decayFunction: 'exponential',
            baselineReturn: 60
          },
          metadata: {
            framework: 'test',
            model: 'test-model',
            confidence: 0.8,
            source: 'detected',
            version: '1.0.0'
          }
        });
      }

      const timeline = await emotionalEngine.getEmotionalTimeline(agentId, sessionId, 2);
      
      expect(timeline.timeline).toBeInstanceOf(Array);
      expect(timeline.timeline.length).toBe(3);
      expect(timeline.summary).toBeDefined();
      expect(timeline.summary.dominantEmotion).toBeDefined();
      expect(timeline.summary.avgIntensity).toBeGreaterThanOrEqual(0);
      expect(timeline.summary.emotionalStability).toBeGreaterThanOrEqual(0);
      
      // Verify timeline is sorted by timestamp
      for (let i = 1; i < timeline.timeline.length; i++) {
        expect(timeline.timeline[i].timestamp.getTime())
          .toBeGreaterThanOrEqual(timeline.timeline[i-1].timestamp.getTime());
      }
    });
  });

  describe('Performance and Statistics', () => {
    it('should provide emotional intelligence statistics', async () => {
      const agentId = 'test-agent-stats';
      
      // Add some emotional states
      await emotionalCollection.recordEmotionalState({
        agentId,
        timestamp: new Date(),
        emotions: {
          primary: 'joy',
          intensity: 0.8,
          valence: 0.9,
          arousal: 0.6,
          dominance: 0.7
        },
        context: {
          trigger: 'Success',
          triggerType: 'task_completion',
          conversationTurn: 1
        },
        cognitiveEffects: {
          attentionModification: 0.3,
          memoryStrength: 0.9,
          decisionBias: 0.2,
          responseStyle: 'empathetic'
        },
        decay: {
          halfLife: 30,
          decayFunction: 'exponential',
          baselineReturn: 60
        },
        metadata: {
          framework: 'test',
          model: 'test-model',
          confidence: 0.85,
          source: 'detected',
          version: '1.0.0'
        }
      });

      const stats = await emotionalEngine.getEmotionalStats(agentId);
      
      expect(stats.totalStates).toBeGreaterThanOrEqual(1);
      expect(stats.activeStates).toBeGreaterThanOrEqual(0);
      expect(stats.avgIntensity).toBeGreaterThanOrEqual(0);
      expect(stats.avgValence).toBeGreaterThanOrEqual(-1);
      expect(stats.avgValence).toBeLessThanOrEqual(1);
      expect(stats.dominantEmotions).toBeInstanceOf(Array);
    });

    it('should handle cleanup of expired emotional states', async () => {
      const cleanedCount = await emotionalEngine.cleanup();
      expect(cleanedCount).toBeGreaterThanOrEqual(0);
    });
  });
});
