/**
 * @file ConfidenceTrackingCollection - MongoDB collection for multi-dimensional confidence tracking
 * 
 * This collection demonstrates MongoDB's statistical aggregation capabilities for
 * uncertainty quantification, confidence calibration, and prediction accuracy tracking.
 * Showcases MongoDB's advanced analytics for cognitive confidence data.
 * 
 * Features:
 * - Multi-dimensional confidence tracking with statistical aggregations
 * - Uncertainty quantification and calibration analysis
 * - Prediction accuracy tracking with time-series optimization
 * - Confidence decay and temporal confidence modeling
 * - Real-time confidence monitoring and alerting
 */

import { Db, ObjectId } from 'mongodb';
import { BaseCollection, BaseDocument } from './BaseCollection';

export interface ConfidenceRecord extends BaseDocument {
  agentId: string;
  sessionId?: string;
  timestamp: Date;
  
  // Context of the confidence measurement
  context: {
    task: string; // What task/decision this confidence relates to
    taskType: 'prediction' | 'classification' | 'generation' | 'reasoning' | 'decision';
    domain: string; // Domain of expertise (e.g., 'customer_service', 'technical_support')
    complexity: number; // 0-1 scale of task complexity
    novelty: number; // 0-1 scale of how novel/unfamiliar the task is
    stakes: 'low' | 'medium' | 'high' | 'critical'; // Importance of being correct
  };
  
  // Multi-dimensional confidence measurements
  confidence: {
    overall: number; // 0-1 overall confidence score
    epistemic: number; // 0-1 knowledge-based uncertainty (what we don't know)
    aleatoric: number; // 0-1 data-based uncertainty (inherent randomness)
    calibrated: number; // 0-1 calibrated confidence (adjusted for historical accuracy)
    
    // Confidence breakdown by aspect
    aspects: {
      factualAccuracy: number; // Confidence in factual correctness
      completeness: number; // Confidence in response completeness
      relevance: number; // Confidence in response relevance
      clarity: number; // Confidence in response clarity
      appropriateness: number; // Confidence in response appropriateness
    };
    
    // Confidence sources
    sources: {
      modelIntrinsic: number; // Confidence from the AI model itself
      retrievalQuality: number; // Confidence from information retrieval
      contextRelevance: number; // Confidence from context matching
      historicalPerformance: number; // Confidence from past performance
      domainExpertise: number; // Confidence from domain knowledge
    };
  };
  
  // Prediction/decision details
  prediction: {
    type: 'binary' | 'multiclass' | 'regression' | 'ranking' | 'generation';
    value: any; // The actual prediction/decision made
    alternatives?: Array<{
      value: any;
      confidence: number;
      reasoning: string;
    }>;
    probability?: number; // Predicted probability (for probabilistic predictions)
    distribution?: Array<{ value: any; probability: number }>; // Full probability distribution
  };
  
  // Actual outcome (filled in later for calibration)
  actual?: {
    value: any; // The actual correct answer/outcome
    correct: boolean; // Whether the prediction was correct
    accuracy?: number; // Accuracy score (0-1) for continuous predictions
    feedback?: string; // Human feedback on the prediction
    verificationTime: Date; // When the outcome was verified
    verificationSource: 'automatic' | 'human' | 'external_system';
  };
  
  // Calibration metrics (computed)
  calibration?: {
    brier: number; // Brier score for probabilistic predictions
    logLoss: number; // Log loss for probabilistic predictions
    reliability: number; // Reliability (calibration) score
    resolution: number; // Resolution (discrimination) score
    sharpness: number; // Sharpness (confidence) score
    overconfidence: number; // Measure of overconfidence bias
    underconfidence: number; // Measure of underconfidence bias
  };
  
  // Temporal aspects
  temporal: {
    decayRate: number; // How quickly this confidence should decay (per hour)
    halfLife: number; // Half-life of confidence relevance (hours)
    expiresAt?: Date; // When this confidence measurement expires
    seasonality?: string; // Time-based patterns (e.g., 'weekday', 'business_hours')
  };
  
  // Learning and adaptation
  learning: {
    surprisal: number; // How surprising was the actual outcome
    informationGain: number; // How much we learned from this instance
    modelUpdate: boolean; // Whether this should trigger model updates
    confidenceAdjustment: number; // Suggested adjustment to future confidence
  };
  
  // Metadata
  metadata: {
    framework: string;
    model: string;
    version: string;
    features: string[]; // Features used for this prediction
    computationTime: number; // Time taken to compute (ms)
    memoryUsage?: number; // Memory used (MB)
  };
}

export interface ConfidenceFilter {
  agentId?: string;
  sessionId?: string;
  'context.taskType'?: string;
  'context.domain'?: string;
  'context.stakes'?: string;
  'confidence.overall'?: { $gte?: number; $lte?: number };
  'prediction.type'?: string;
  timestamp?: { $gte?: Date; $lte?: Date };
  'actual.correct'?: boolean;
}

export interface ConfidenceAnalyticsOptions {
  timeRange?: { start: Date; end: Date };
  groupBy?: 'taskType' | 'domain' | 'stakes' | 'hour' | 'day';
  includeUnverified?: boolean;
  minConfidence?: number;
  maxConfidence?: number;
}

/**
 * ConfidenceTrackingCollection - Manages multi-dimensional confidence tracking
 * 
 * This collection demonstrates MongoDB's advanced statistical capabilities:
 * - Complex aggregation pipelines for confidence analytics
 * - Statistical functions for calibration analysis
 * - Time-series optimization for confidence tracking
 * - Multi-dimensional indexing for confidence queries
 */
export class ConfidenceTrackingCollection extends BaseCollection<ConfidenceRecord> {
  protected collectionName = 'agent_confidence_tracking';

  constructor(db: Db) {
    super(db);
    this.collection = db.collection<ConfidenceRecord>(this.collectionName);
  }

  /**
   * Create indexes optimized for confidence tracking and analytics
   */
  async createIndexes(): Promise<void> {
    try {
      // Agent and timestamp index for time-series queries
      await this.collection.createIndex({
        agentId: 1,
        timestamp: -1
      }, {
        name: 'agent_timestamp_index',
        background: true
      });

      // Confidence analytics index
      await this.collection.createIndex({
        'confidence.overall': -1,
        'context.taskType': 1,
        'context.domain': 1
      }, {
        name: 'confidence_analytics_index',
        background: true
      });

      // Calibration analysis index
      await this.collection.createIndex({
        'actual.correct': 1,
        'prediction.probability': 1,
        'confidence.overall': 1
      }, {
        name: 'calibration_analysis_index',
        background: true,
        sparse: true
      });

      // Task type and domain index
      await this.collection.createIndex({
        'context.taskType': 1,
        'context.domain': 1,
        'context.stakes': 1,
        timestamp: -1
      }, {
        name: 'task_domain_stakes_index',
        background: true
      });

      // TTL index for confidence expiration
      await this.collection.createIndex({
        'temporal.expiresAt': 1
      }, {
        name: 'confidence_expiration_ttl',
        expireAfterSeconds: 0,
        background: true,
        sparse: true
      });

      // Performance tracking index
      await this.collection.createIndex({
        'metadata.computationTime': 1,
        'confidence.overall': -1
      }, {
        name: 'performance_tracking_index',
        background: true
      });

      console.log('✅ ConfidenceTrackingCollection indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating ConfidenceTrackingCollection indexes:', error);
      throw error;
    }
  }

  /**
   * Record a new confidence measurement
   */
  async recordConfidence(confidence: Omit<ConfidenceRecord, '_id' | 'createdAt' | 'updatedAt'>): Promise<ObjectId> {
    const confidenceWithTimestamp = {
      ...confidence,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await this.collection.insertOne(confidenceWithTimestamp);
    return result.insertedId;
  }

  /**
   * Update confidence record with actual outcome for calibration
   */
  async updateWithActual(
    confidenceId: ObjectId,
    actual: ConfidenceRecord['actual']
  ): Promise<void> {
    if (!actual) return;

    // Calculate calibration metrics
    const record = await this.collection.findOne({ _id: confidenceId });
    if (!record) {
      throw new Error('Confidence record not found');
    }

    const calibration = this.calculateCalibrationMetrics(record, actual);
    const learning = this.calculateLearningMetrics(record, actual);

    await this.collection.updateOne(
      { _id: confidenceId },
      {
        $set: {
          actual,
          calibration,
          learning,
          updatedAt: new Date()
        }
      }
    );
  }

  /**
   * Get confidence statistics for an agent
   */
  async getConfidenceStats(agentId: string, days: number = 7): Promise<{
    totalPredictions: number;
    verifiedPredictions: number;
    avgConfidence: number;
    accuracy: number;
    calibrationError: number;
    overconfidenceRate: number;
    underconfidenceRate: number;
    confidenceByDomain: Array<{ domain: string; avgConfidence: number; accuracy: number }>;
  }> {
    const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

    const stats = await this.collection.aggregate([
      {
        $match: {
          agentId,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalPredictions: { $sum: 1 },
          verifiedPredictions: {
            $sum: { $cond: [{ $ne: ['$actual', null] }, 1, 0] }
          },
          avgConfidence: { $avg: '$confidence.overall' },
          correctPredictions: {
            $sum: { $cond: [{ $eq: ['$actual.correct', true] }, 1, 0] }
          },
          totalCalibrationError: {
            $sum: {
              $cond: [
                { $ne: ['$calibration.reliability', null] },
                { $abs: { $subtract: ['$confidence.overall', '$prediction.probability'] } },
                0
              ]
            }
          },
          overconfidentCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$actual.correct', null] },
                    { $gt: ['$confidence.overall', 0.8] },
                    { $eq: ['$actual.correct', false] }
                  ]
                },
                1,
                0
              ]
            }
          },
          underconfidentCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$actual.correct', null] },
                    { $lt: ['$confidence.overall', 0.5] },
                    { $eq: ['$actual.correct', true] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]).toArray();

    // Get confidence by domain
    const domainStats = await this.collection.aggregate([
      {
        $match: {
          agentId,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$context.domain',
          avgConfidence: { $avg: '$confidence.overall' },
          totalPredictions: { $sum: 1 },
          correctPredictions: {
            $sum: { $cond: [{ $eq: ['$actual.correct', true] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          domain: '$_id',
          avgConfidence: { $round: ['$avgConfidence', 3] },
          accuracy: {
            $cond: [
              { $gt: ['$totalPredictions', 0] },
              { $round: [{ $divide: ['$correctPredictions', '$totalPredictions'] }, 3] },
              0
            ]
          },
          _id: 0
        }
      }
    ]).toArray();

    const result = stats[0] || {
      totalPredictions: 0,
      verifiedPredictions: 0,
      avgConfidence: 0,
      correctPredictions: 0,
      totalCalibrationError: 0,
      overconfidentCount: 0,
      underconfidentCount: 0
    };

    return {
      totalPredictions: result.totalPredictions,
      verifiedPredictions: result.verifiedPredictions,
      avgConfidence: result.avgConfidence || 0,
      accuracy: result.verifiedPredictions > 0 ? 
        (result.correctPredictions / result.verifiedPredictions) : 0,
      calibrationError: result.verifiedPredictions > 0 ? 
        (result.totalCalibrationError / result.verifiedPredictions) : 0,
      overconfidenceRate: result.verifiedPredictions > 0 ? 
        (result.overconfidentCount / result.verifiedPredictions) : 0,
      underconfidenceRate: result.verifiedPredictions > 0 ? 
        (result.underconfidentCount / result.verifiedPredictions) : 0,
      confidenceByDomain: domainStats
    };
  }

  /**
   * Analyze confidence calibration using MongoDB aggregation
   */
  async analyzeCalibration(agentId: string, options: ConfidenceAnalyticsOptions = {}): Promise<{
    calibrationCurve: Array<{ confidenceBin: number; accuracy: number; count: number }>;
    reliabilityDiagram: Array<{ predicted: number; observed: number; count: number }>;
    brierScore: number;
    logLoss: number;
    ece: number; // Expected Calibration Error
    mce: number; // Maximum Calibration Error
  }> {
    const filter: any = { agentId, 'actual.correct': { $ne: null } };
    
    if (options.timeRange) {
      filter.timestamp = {
        $gte: options.timeRange.start,
        $lte: options.timeRange.end
      };
    }

    // Calibration curve analysis
    const calibrationCurve = await this.collection.aggregate([
      { $match: filter },
      {
        $addFields: {
          confidenceBin: {
            $multiply: [
              { $floor: { $multiply: ['$confidence.overall', 10] } },
              0.1
            ]
          }
        }
      },
      {
        $group: {
          _id: '$confidenceBin',
          accuracy: { $avg: { $cond: ['$actual.correct', 1, 0] } },
          count: { $sum: 1 },
          avgConfidence: { $avg: '$confidence.overall' }
        }
      },
      {
        $project: {
          confidenceBin: '$_id',
          accuracy: { $round: ['$accuracy', 3] },
          count: 1,
          _id: 0
        }
      },
      { $sort: { confidenceBin: 1 } }
    ]).toArray();

    // Reliability diagram (predicted vs observed)
    const reliabilityDiagram = await this.collection.aggregate([
      { $match: filter },
      {
        $addFields: {
          predictedBin: {
            $cond: [
              { $ne: ['$prediction.probability', null] },
              {
                $multiply: [
                  { $floor: { $multiply: ['$prediction.probability', 10] } },
                  0.1
                ]
              },
              {
                $multiply: [
                  { $floor: { $multiply: ['$confidence.overall', 10] } },
                  0.1
                ]
              }
            ]
          }
        }
      },
      {
        $group: {
          _id: '$predictedBin',
          observed: { $avg: { $cond: ['$actual.correct', 1, 0] } },
          predicted: { $avg: '$confidence.overall' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          predicted: { $round: ['$predicted', 3] },
          observed: { $round: ['$observed', 3] },
          count: 1,
          _id: 0
        }
      },
      { $sort: { predicted: 1 } }
    ]).toArray();

    // Calculate overall metrics
    const overallMetrics = await this.collection.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          brierScore: {
            $avg: {
              $pow: [
                {
                  $subtract: [
                    { $cond: ['$actual.correct', 1, 0] },
                    '$confidence.overall'
                  ]
                },
                2
              ]
            }
          },
          logLoss: {
            $avg: {
              $cond: [
                '$actual.correct',
                { $multiply: [-1, { $ln: '$confidence.overall' }] },
                { $multiply: [-1, { $ln: { $subtract: [1, '$confidence.overall'] } }] }
              ]
            }
          },
          calibrationErrors: {
            $push: {
              $abs: {
                $subtract: [
                  { $cond: ['$actual.correct', 1, 0] },
                  '$confidence.overall'
                ]
              }
            }
          }
        }
      }
    ]).toArray();

    const metrics = overallMetrics[0] || {
      brierScore: 0,
      logLoss: 0,
      calibrationErrors: []
    };

    // Calculate ECE and MCE
    const calibrationErrors = metrics.calibrationErrors || [];
    const ece = calibrationErrors.length > 0 ? 
      calibrationErrors.reduce((sum: number, err: number) => sum + err, 0) / calibrationErrors.length : 0;
    const mce = calibrationErrors.length > 0 ? Math.max(...calibrationErrors) : 0;

    return {
      calibrationCurve,
      reliabilityDiagram,
      brierScore: metrics.brierScore || 0,
      logLoss: metrics.logLoss || 0,
      ece,
      mce
    };
  }

  /**
   * Get confidence trends over time
   */
  async getConfidenceTrends(
    agentId: string,
    days: number = 30,
    granularity: 'hour' | 'day' = 'day'
  ): Promise<Array<{
    timestamp: Date;
    avgConfidence: number;
    accuracy: number;
    predictionCount: number;
    calibrationError: number;
  }>> {
    const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    
    const dateFormat = granularity === 'hour' ? 
      { $dateToString: { format: '%Y-%m-%d %H:00:00', date: '$timestamp' } } :
      { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } };

    return await this.collection.aggregate([
      {
        $match: {
          agentId,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: dateFormat,
          avgConfidence: { $avg: '$confidence.overall' },
          predictionCount: { $sum: 1 },
          correctPredictions: {
            $sum: { $cond: [{ $eq: ['$actual.correct', true] }, 1, 0] }
          },
          verifiedPredictions: {
            $sum: { $cond: [{ $ne: ['$actual.correct', null] }, 1, 0] }
          },
          calibrationError: {
            $avg: {
              $cond: [
                { $ne: ['$actual.correct', null] },
                {
                  $abs: {
                    $subtract: [
                      { $cond: ['$actual.correct', 1, 0] },
                      '$confidence.overall'
                    ]
                  }
                },
                null
              ]
            }
          }
        }
      },
      {
        $project: {
          timestamp: { $dateFromString: { dateString: '$_id' } },
          avgConfidence: { $round: ['$avgConfidence', 3] },
          accuracy: {
            $cond: [
              { $gt: ['$verifiedPredictions', 0] },
              { $round: [{ $divide: ['$correctPredictions', '$verifiedPredictions'] }, 3] },
              null
            ]
          },
          predictionCount: 1,
          calibrationError: { $round: ['$calibrationError', 3] },
          _id: 0
        }
      },
      { $sort: { timestamp: 1 } }
    ]).toArray();
  }

  /**
   * Calculate calibration metrics for a prediction
   */
  private calculateCalibrationMetrics(
    record: ConfidenceRecord,
    actual: ConfidenceRecord['actual']
  ): ConfidenceRecord['calibration'] {
    if (!actual) return undefined;

    const predicted = record.prediction.probability || record.confidence.overall;
    const correct = actual.correct ? 1 : 0;

    // Brier score
    const brier = Math.pow(correct - predicted, 2);

    // Log loss
    const logLoss = correct === 1 ? 
      -Math.log(Math.max(predicted, 1e-15)) : 
      -Math.log(Math.max(1 - predicted, 1e-15));

    // Reliability (calibration error)
    const reliability = Math.abs(correct - predicted);

    // Resolution (discrimination ability)
    const resolution = Math.pow(predicted - 0.5, 2);

    // Sharpness (confidence level)
    const sharpness = Math.abs(predicted - 0.5);

    // Overconfidence/underconfidence
    const overconfidence = predicted > 0.8 && correct === 0 ? predicted - 0.8 : 0;
    const underconfidence = predicted < 0.5 && correct === 1 ? 0.5 - predicted : 0;

    return {
      brier,
      logLoss,
      reliability,
      resolution,
      sharpness,
      overconfidence,
      underconfidence
    };
  }

  /**
   * Calculate learning metrics from prediction outcome
   */
  private calculateLearningMetrics(
    record: ConfidenceRecord,
    actual: ConfidenceRecord['actual']
  ): ConfidenceRecord['learning'] {
    if (!actual) {
      return {
        surprisal: 0,
        informationGain: 0,
        modelUpdate: false,
        confidenceAdjustment: 0
      };
    }

    const predicted = record.prediction.probability || record.confidence.overall;
    const correct = actual.correct ? 1 : 0;

    // Surprisal (negative log probability of actual outcome)
    const surprisal = correct === 1 ? 
      -Math.log2(Math.max(predicted, 1e-15)) : 
      -Math.log2(Math.max(1 - predicted, 1e-15));

    // Information gain (reduction in uncertainty)
    const informationGain = surprisal > 2 ? surprisal / 10 : 0; // Normalize

    // Whether this should trigger model updates
    const modelUpdate = surprisal > 3 || Math.abs(predicted - correct) > 0.5;

    // Suggested confidence adjustment
    const confidenceAdjustment = correct === 1 ? 
      Math.max(0, 0.8 - predicted) : 
      Math.min(0, 0.2 - predicted);

    return {
      surprisal,
      informationGain,
      modelUpdate,
      confidenceAdjustment
    };
  }

  /**
   * Clean up expired confidence records
   */
  async cleanupExpiredRecords(): Promise<number> {
    const result = await this.collection.deleteMany({
      'temporal.expiresAt': { $lte: new Date() }
    });
    return result.deletedCount;
  }
}
