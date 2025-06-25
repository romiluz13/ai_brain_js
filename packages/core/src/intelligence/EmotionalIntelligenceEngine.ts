/**
 * @file EmotionalIntelligenceEngine - Advanced emotional intelligence for AI agents
 *
 * This engine provides comprehensive emotional intelligence capabilities using MongoDB
 * time-series collections with TTL indexes for automatic emotional decay. Demonstrates
 * MongoDB's advanced capabilities for cognitive data management.
 *
 * Features:
 * - Real-time emotion detection and tracking
 * - Automatic emotional decay with TTL indexes
 * - Emotional pattern analysis and learning
 * - Context-aware emotional responses
 * - Emotional memory and state transitions
 * - Cognitive impact assessment
 */

import { Db } from 'mongodb';
import { EmotionalStateCollection, EmotionalState } from '../collections/EmotionalStateCollection';

export interface EmotionDetectionResult {
  primary: string;
  secondary?: string[];
  intensity: number;
  valence: number;
  arousal: number;
  dominance: number;
  confidence: number;
  reasoning: string;
}

export interface EmotionalContext {
  agentId: string;
  sessionId?: string;
  input: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  taskContext?: {
    taskId?: string;
    workflowId?: string;
    taskType?: string;
    progress?: number;
  };
  userContext?: {
    mood?: string;
    urgency?: number;
    satisfaction?: number;
  };
}

export interface EmotionalResponse {
  currentEmotion: EmotionalState;
  emotionalGuidance: {
    responseStyle: string;
    toneAdjustment: string;
    empathyLevel: number;
    assertivenessLevel: number;
    supportLevel: number;
  };
  cognitiveImpact: {
    attentionFocus: string[];
    memoryPriority: number;
    decisionBias: string;
    riskTolerance: number;
  };
  recommendations: string[];
}

export interface EmotionalLearning {
  patterns: Array<{
    trigger: string;
    emotionalResponse: string;
    effectiveness: number;
    frequency: number;
  }>;
  improvements: Array<{
    area: string;
    suggestion: string;
    priority: number;
  }>;
  calibration: {
    accuracy: number;
    bias: number;
    consistency: number;
  };
}

/**
 * EmotionalIntelligenceEngine - Advanced emotional intelligence for AI agents
 *
 * This engine showcases MongoDB's time-series and TTL capabilities for emotional data:
 * - Time-series collections for emotional state tracking
 * - TTL indexes for automatic emotional decay
 * - Complex aggregation pipelines for emotional analytics
 * - Real-time emotional pattern recognition
 * - Emotional memory and learning systems
 */
export class EmotionalIntelligenceEngine {
  private db: Db;
  private emotionalStateCollection: EmotionalStateCollection;
  private isInitialized: boolean = false;

  // Emotional intelligence configuration
  private config = {
    decaySettings: {
      defaultHalfLife: 30, // minutes
      defaultBaselineReturn: 60, // minutes
      decayFunction: 'exponential' as const
    },
    detectionThresholds: {
      minConfidence: 0.6,
      intensityThreshold: 0.1,
      valenceThreshold: 0.05
    },
    cognitiveImpact: {
      attentionWeight: 0.3,
      memoryWeight: 0.4,
      decisionWeight: 0.3
    }
  };

  constructor(db: Db) {
    this.db = db;
    this.emotionalStateCollection = new EmotionalStateCollection(db);
  }

  /**
   * Initialize the emotional intelligence engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Create collection indexes
      await this.emotionalStateCollection.createIndexes();

      this.isInitialized = true;
      console.log('🎭 EmotionalIntelligenceEngine initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize EmotionalIntelligenceEngine:', error);
      throw error;
    }
  }

  /**
   * Detect emotions from input text and context
   */
  async detectEmotion(context: EmotionalContext): Promise<EmotionDetectionResult> {
    if (!this.isInitialized) {
      throw new Error('EmotionalIntelligenceEngine must be initialized first');
    }

    // Get current emotional state for context
    const currentState = await this.emotionalStateCollection.getCurrentEmotionalState(
      context.agentId,
      context.sessionId
    );

    // Analyze input for emotional content
    const emotionAnalysis = await this.analyzeEmotionalContent(
      context.input,
      context.conversationHistory,
      currentState
    );

    // Consider task and user context
    const contextualAdjustment = this.adjustForContext(
      emotionAnalysis,
      context.taskContext,
      context.userContext
    );

    return {
      ...contextualAdjustment,
      confidence: Math.min(emotionAnalysis.confidence * 0.9, 1.0), // Slight confidence reduction for realism
      reasoning: this.generateEmotionalReasoning(emotionAnalysis, context)
    };
  }

  /**
   * Process emotional state and provide intelligent response guidance
   */
  async processEmotionalState(
    context: EmotionalContext,
    detectedEmotion: EmotionDetectionResult,
    trigger: string,
    triggerType: 'user_input' | 'task_completion' | 'error' | 'success' | 'interaction' | 'system_event'
  ): Promise<EmotionalResponse> {
    // Create emotional state record
    const emotionalState: Omit<EmotionalState, '_id' | 'createdAt' | 'updatedAt'> = {
      agentId: context.agentId,
      sessionId: context.sessionId,
      timestamp: new Date(),
      emotions: {
        primary: detectedEmotion.primary,
        secondary: detectedEmotion.secondary,
        intensity: detectedEmotion.intensity,
        valence: detectedEmotion.valence,
        arousal: detectedEmotion.arousal,
        dominance: detectedEmotion.dominance
      },
      context: {
        trigger,
        triggerType,
        conversationTurn: context.conversationHistory?.length || 0,
        taskId: context.taskContext?.taskId,
        workflowId: context.taskContext?.workflowId
      },
      cognitiveEffects: this.calculateCognitiveEffects(detectedEmotion),
      decay: {
        halfLife: this.config.decaySettings.defaultHalfLife,
        decayFunction: this.config.decaySettings.decayFunction,
        baselineReturn: this.config.decaySettings.defaultBaselineReturn
      },
      metadata: {
        framework: 'universal-ai-brain',
        model: 'emotional-intelligence-v1',
        confidence: detectedEmotion.confidence,
        source: 'detected',
        version: '1.0.0'
      }
    };

    // Store emotional state
    await this.emotionalStateCollection.recordEmotionalState(emotionalState);

    // Generate response guidance
    const emotionalGuidance = this.generateEmotionalGuidance(detectedEmotion);
    const cognitiveImpact = this.assessCognitiveImpact(detectedEmotion);
    const recommendations = await this.generateRecommendations(context, detectedEmotion);

    return {
      currentEmotion: { ...emotionalState, _id: undefined } as EmotionalState,
      emotionalGuidance,
      cognitiveImpact,
      recommendations
    };
  }

  /**
   * Analyze emotional patterns and provide learning insights
   */
  async analyzeEmotionalLearning(agentId: string, days: number = 7): Promise<EmotionalLearning> {
    const patterns = await this.emotionalStateCollection.analyzeEmotionalPatterns(agentId, days);

    // Extract learning patterns
    const learningPatterns = patterns.triggerAnalysis.map(trigger => ({
      trigger: trigger.trigger,
      emotionalResponse: this.interpretValence(trigger.avgValence),
      effectiveness: Math.abs(trigger.avgValence), // Higher absolute valence = more effective
      frequency: trigger.frequency
    }));

    // Generate improvement suggestions
    const improvements = this.generateImprovementSuggestions(patterns);

    // Calculate calibration metrics
    const calibration = await this.calculateEmotionalCalibration(agentId, days);

    return {
      patterns: learningPatterns,
      improvements,
      calibration
    };
  }

  /**
   * Get emotional timeline for visualization
   */
  async getEmotionalTimeline(agentId: string, sessionId?: string, hours: number = 24): Promise<{
    timeline: Array<{
      timestamp: Date;
      emotion: string;
      intensity: number;
      valence: number;
      trigger: string;
    }>;
    summary: {
      dominantEmotion: string;
      avgIntensity: number;
      avgValence: number;
      emotionalStability: number;
    };
  }> {
    const startTime = new Date(Date.now() - (hours * 60 * 60 * 1000));

    const timeline = await this.emotionalStateCollection.getEmotionalTimeline(agentId, {
      timeRange: { start: startTime, end: new Date() },
      includeDecayed: false
    });

    const timelineData = timeline.map(state => ({
      timestamp: state.timestamp,
      emotion: state.emotions.primary,
      intensity: state.emotions.intensity,
      valence: state.emotions.valence,
      trigger: state.context.trigger
    }));

    // Calculate summary statistics
    const summary = this.calculateTimelineSummary(timeline);

    return {
      timeline: timelineData,
      summary
    };
  }

  /**
   * Analyze emotional content using pattern matching and heuristics
   */
  private async analyzeEmotionalContent(
    input: string,
    conversationHistory?: Array<{ role: string; content: string }>,
    currentState?: EmotionalState | null
  ): Promise<EmotionDetectionResult> {
    // Emotional keyword patterns
    const emotionalPatterns = {
      joy: ['happy', 'excited', 'great', 'wonderful', 'amazing', 'fantastic', 'love', 'perfect'],
      sadness: ['sad', 'disappointed', 'upset', 'down', 'depressed', 'unhappy', 'terrible'],
      anger: ['angry', 'mad', 'furious', 'annoyed', 'frustrated', 'irritated', 'outraged'],
      fear: ['scared', 'afraid', 'worried', 'anxious', 'nervous', 'concerned', 'panic'],
      surprise: ['surprised', 'shocked', 'amazed', 'unexpected', 'wow', 'incredible'],
      disgust: ['disgusted', 'awful', 'horrible', 'gross', 'terrible', 'hate'],
      trust: ['trust', 'confident', 'reliable', 'sure', 'certain', 'believe'],
      anticipation: ['excited', 'looking forward', 'can\'t wait', 'eager', 'hopeful']
    };

    const inputLower = input.toLowerCase();
    const emotionScores: Record<string, number> = {};

    // Calculate emotion scores based on keyword matching
    for (const [emotion, keywords] of Object.entries(emotionalPatterns)) {
      emotionScores[emotion] = keywords.reduce((score, keyword) => {
        const matches = (inputLower.match(new RegExp(keyword, 'g')) || []).length;
        return score + matches;
      }, 0);
    }

    // Find primary emotion
    const primaryEmotion = Object.entries(emotionScores)
      .sort(([,a], [,b]) => b - a)[0];

    const primary = primaryEmotion[1] === 0 ? 'neutral' : primaryEmotion[0];
    const intensity = primaryEmotion[1] === 0 ? 0.1 : Math.min(primaryEmotion[1] * 0.3, 1.0);

    // Calculate valence based on emotion type
    const valenceMap: Record<string, number> = {
      joy: 0.8, sadness: -0.7, anger: -0.6, fear: -0.5,
      surprise: 0.2, disgust: -0.8, trust: 0.6, anticipation: 0.4,
      neutral: 0.0
    };

    const valence = valenceMap[primary] || 0;

    // Calculate arousal (how activating the emotion is)
    const arousalMap: Record<string, number> = {
      joy: 0.7, sadness: 0.3, anger: 0.9, fear: 0.8,
      surprise: 0.9, disgust: 0.6, trust: 0.4, anticipation: 0.6,
      neutral: 0.3
    };

    const arousal = arousalMap[primary] || 0.5;

    // Calculate dominance (how much control the emotion implies)
    const dominanceMap: Record<string, number> = {
      joy: 0.6, sadness: 0.2, anger: 0.8, fear: 0.1,
      surprise: 0.3, disgust: 0.4, trust: 0.7, anticipation: 0.5,
      neutral: 0.5
    };

    const dominance = dominanceMap[primary] || 0.5;

    // Determine secondary emotions
    const secondary = Object.entries(emotionScores)
      .filter(([emotion, score]) => emotion !== primary && score > 0)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([emotion]) => emotion);

    return {
      primary,
      secondary: secondary.length > 0 ? secondary : undefined,
      intensity,
      valence,
      arousal,
      dominance,
      confidence: Math.min(0.7 + (intensity * 0.3), 1.0),
      reasoning: `Detected ${primary} emotion based on keyword analysis with intensity ${intensity.toFixed(2)}`
    };
  }

  /**
   * Adjust emotion detection based on context
   */
  private adjustForContext(
    emotion: EmotionDetectionResult,
    taskContext?: EmotionalContext['taskContext'],
    userContext?: EmotionalContext['userContext']
  ): EmotionDetectionResult {
    let adjustedIntensity = emotion.intensity;
    let adjustedValence = emotion.valence;

    // Task context adjustments
    if (taskContext) {
      if (taskContext.taskType === 'error_handling') {
        adjustedValence = Math.min(adjustedValence - 0.2, 1.0);
        adjustedIntensity = Math.min(adjustedIntensity + 0.1, 1.0);
      }

      if (taskContext.progress && taskContext.progress > 0.8) {
        adjustedValence = Math.min(adjustedValence + 0.1, 1.0);
      }
    }

    // User context adjustments
    if (userContext) {
      if (userContext.urgency && userContext.urgency > 0.7) {
        adjustedIntensity = Math.min(adjustedIntensity + 0.2, 1.0);
      }

      if (userContext.satisfaction && userContext.satisfaction < 0.3) {
        adjustedValence = Math.min(adjustedValence - 0.3, 1.0);
      }
    }

    return {
      ...emotion,
      intensity: adjustedIntensity,
      valence: adjustedValence
    };
  }

  /**
   * Calculate cognitive effects of emotional state
   */
  private calculateCognitiveEffects(emotion: EmotionDetectionResult) {
    // Attention modification based on arousal and valence
    const attentionModification = (emotion.arousal - 0.5) * emotion.intensity;

    // Memory strength based on intensity and arousal
    const memoryStrength = Math.min((emotion.intensity + emotion.arousal) / 2, 1.0);

    // Decision bias based on valence and dominance
    const decisionBias = emotion.valence * emotion.dominance * emotion.intensity;

    // Response style based on emotional dimensions
    let responseStyle: 'analytical' | 'empathetic' | 'assertive' | 'cautious' | 'creative';

    if (emotion.dominance > 0.6 && emotion.valence > 0) {
      responseStyle = 'assertive';
    } else if (emotion.valence > 0.3 && emotion.arousal < 0.5) {
      responseStyle = 'empathetic';
    } else if (emotion.arousal > 0.7) {
      responseStyle = 'creative';
    } else if (emotion.valence < -0.3) {
      responseStyle = 'cautious';
    } else {
      responseStyle = 'analytical';
    }

    return {
      attentionModification,
      memoryStrength,
      decisionBias,
      responseStyle
    };
  }

  /**
   * Generate emotional guidance for response style
   */
  private generateEmotionalGuidance(emotion: EmotionDetectionResult) {
    const guidance = {
      responseStyle: emotion.dominance > 0.6 ? 'confident' : 'supportive',
      toneAdjustment: emotion.valence > 0 ? 'positive' : 'understanding',
      empathyLevel: Math.max(0.3, 1 - emotion.dominance),
      assertivenessLevel: emotion.dominance * emotion.intensity,
      supportLevel: emotion.valence < 0 ? 0.8 : 0.5
    };

    return guidance;
  }

  /**
   * Assess cognitive impact of emotional state
   */
  private assessCognitiveImpact(emotion: EmotionDetectionResult) {
    const attentionFocus = [];

    if (emotion.arousal > 0.7) {
      attentionFocus.push('immediate_response', 'user_satisfaction');
    }
    if (emotion.valence < -0.5) {
      attentionFocus.push('problem_solving', 'error_prevention');
    }
    if (emotion.intensity > 0.8) {
      attentionFocus.push('emotional_regulation', 'response_quality');
    }

    return {
      attentionFocus,
      memoryPriority: emotion.intensity * emotion.arousal,
      decisionBias: emotion.valence > 0 ? 'optimistic' : 'cautious',
      riskTolerance: emotion.dominance * (1 - Math.abs(emotion.valence))
    };
  }

  /**
   * Generate recommendations based on emotional state
   */
  private async generateRecommendations(
    context: EmotionalContext,
    emotion: EmotionDetectionResult
  ): Promise<string[]> {
    const recommendations = [];

    if (emotion.intensity > 0.8) {
      recommendations.push('Consider emotional regulation techniques');
    }

    if (emotion.valence < -0.5) {
      recommendations.push('Focus on problem resolution and user support');
    }

    if (emotion.arousal > 0.7) {
      recommendations.push('Maintain calm and measured responses');
    }

    if (emotion.dominance < 0.3) {
      recommendations.push('Provide reassurance and build confidence');
    }

    return recommendations;
  }

  /**
   * Generate emotional reasoning explanation
   */
  private generateEmotionalReasoning(
    emotion: EmotionDetectionResult,
    context: EmotionalContext
  ): string {
    return `Detected ${emotion.primary} emotion (intensity: ${emotion.intensity.toFixed(2)}, ` +
           `valence: ${emotion.valence.toFixed(2)}) based on input analysis and contextual factors. ` +
           `This suggests a ${emotion.valence > 0 ? 'positive' : 'negative'} emotional state with ` +
           `${emotion.arousal > 0.5 ? 'high' : 'low'} activation level.`;
  }

  /**
   * Interpret valence score as emotional category
   */
  private interpretValence(valence: number): string {
    if (valence > 0.3) return 'positive';
    if (valence < -0.3) return 'negative';
    return 'neutral';
  }

  /**
   * Generate improvement suggestions based on emotional patterns
   */
  private generateImprovementSuggestions(patterns: any): Array<{
    area: string;
    suggestion: string;
    priority: number;
  }> {
    const improvements = [];

    if (patterns.emotionalStability < 0.5) {
      improvements.push({
        area: 'emotional_stability',
        suggestion: 'Implement emotional regulation techniques to improve stability',
        priority: 1
      });
    }

    const negativePatterns = patterns.triggerAnalysis.filter((t: any) => t.avgValence < -0.3);
    if (negativePatterns.length > patterns.triggerAnalysis.length * 0.6) {
      improvements.push({
        area: 'negative_triggers',
        suggestion: 'Focus on positive reframing and solution-oriented responses',
        priority: 2
      });
    }

    return improvements;
  }

  /**
   * Calculate emotional calibration metrics
   */
  private async calculateEmotionalCalibration(agentId: string, days: number): Promise<{
    accuracy: number;
    bias: number;
    consistency: number;
  }> {
    // This would typically involve comparing predicted vs actual emotional outcomes
    // For now, return simulated metrics
    return {
      accuracy: 0.75,
      bias: 0.1,
      consistency: 0.8
    };
  }

  /**
   * Calculate timeline summary statistics
   */
  private calculateTimelineSummary(timeline: EmotionalState[]) {
    if (timeline.length === 0) {
      return {
        dominantEmotion: 'neutral',
        avgIntensity: 0,
        avgValence: 0,
        emotionalStability: 1
      };
    }

    const emotionCounts: Record<string, number> = {};
    let totalIntensity = 0;
    let totalValence = 0;
    const valences = [];

    for (const state of timeline) {
      emotionCounts[state.emotions.primary] = (emotionCounts[state.emotions.primary] || 0) + 1;
      totalIntensity += state.emotions.intensity;
      totalValence += state.emotions.valence;
      valences.push(state.emotions.valence);
    }

    const dominantEmotion = Object.entries(emotionCounts)
      .sort(([,a], [,b]) => b - a)[0][0];

    const avgIntensity = totalIntensity / timeline.length;
    const avgValence = totalValence / timeline.length;

    // Calculate emotional stability (inverse of valence variance)
    const valenceVariance = valences.reduce((sum, v) => sum + Math.pow(v - avgValence, 2), 0) / valences.length;
    const emotionalStability = Math.max(0, 1 - (valenceVariance / 2)); // Normalize to 0-1

    return {
      dominantEmotion,
      avgIntensity,
      avgValence,
      emotionalStability
    };
  }

  /**
   * Get emotional intelligence statistics
   */
  async getEmotionalStats(agentId?: string): Promise<{
    totalStates: number;
    activeStates: number;
    avgIntensity: number;
    avgValence: number;
    dominantEmotions: Array<{ emotion: string; frequency: number }>;
  }> {
    const stats = await this.emotionalStateCollection.getEmotionalStats(agentId);

    // Get dominant emotions (this would need additional aggregation)
    const dominantEmotions = [
      { emotion: 'neutral', frequency: 0.4 },
      { emotion: 'joy', frequency: 0.3 },
      { emotion: 'concern', frequency: 0.2 },
      { emotion: 'satisfaction', frequency: 0.1 }
    ];

    return {
      ...stats,
      dominantEmotions
    };
  }

  /**
   * Cleanup expired emotional states
   */
  async cleanup(): Promise<number> {
    return await this.emotionalStateCollection.cleanupExpiredStates();
  }
}