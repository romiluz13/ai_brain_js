/**
 * @file PIIDetector - Comprehensive PII detection and data leakage prevention system
 * 
 * This system identifies and masks personally identifiable information, prevents data
 * leakage, implements data anonymization, and ensures compliance with privacy
 * regulations (GDPR, CCPA) using MongoDB for analytics and pattern tracking.
 * 
 * Features:
 * - Multi-pattern PII detection (SSN, credit cards, emails, phones, etc.)
 * - Real-time data leakage prevention
 * - GDPR/CCPA compliance monitoring
 * - Configurable anonymization strategies
 * - Privacy analytics with MongoDB
 * - Framework-agnostic privacy protection
 * - Automated redaction and masking
 */

import { TracingCollection } from '../collections/TracingCollection';
import { MemoryCollection } from '../collections/MemoryCollection';

export interface PIIDetectionResult {
  hasPII: boolean;
  detectedPII: PIIMatch[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  sanitizedContent: string;
  complianceStatus: {
    gdpr: 'compliant' | 'violation' | 'warning';
    ccpa: 'compliant' | 'violation' | 'warning';
    hipaa: 'compliant' | 'violation' | 'warning';
  };
  recommendations: string[];
}

export interface PIIMatch {
  type: PIIType;
  value: string;
  maskedValue: string;
  location: {
    startIndex: number;
    endIndex: number;
  };
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  regulation: ('gdpr' | 'ccpa' | 'hipaa')[];
}

export type PIIType = 
  | 'ssn'
  | 'credit_card'
  | 'email'
  | 'phone'
  | 'ip_address'
  | 'passport'
  | 'driver_license'
  | 'bank_account'
  | 'medical_record'
  | 'date_of_birth'
  | 'full_name'
  | 'address'
  | 'tax_id'
  | 'biometric'
  | 'financial_account';

export interface PIIPattern {
  type: PIIType;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  maskingStrategy: 'full' | 'partial' | 'hash' | 'tokenize';
  regulations: ('gdpr' | 'ccpa' | 'hipaa')[];
  description: string;
}

export interface DataLeakageAnalysis {
  timeRange: {
    start: Date;
    end: Date;
  };
  totalScans: number;
  piiDetectionRate: number;
  leakagesByType: Record<PIIType, number>;
  leakagesBySeverity: Record<string, number>;
  complianceViolations: {
    gdpr: number;
    ccpa: number;
    hipaa: number;
  };
  frameworkComparison: {
    framework: string;
    piiDetectionRate: number;
    violationCount: number;
  }[];
  trends: {
    date: Date;
    piiCount: number;
    violationCount: number;
  }[];
}

export interface AnonymizationConfig {
  strategy: 'mask' | 'hash' | 'tokenize' | 'remove' | 'generalize';
  preserveFormat: boolean;
  customMaskChar: string;
  hashSalt?: string;
  tokenMapping?: Map<string, string>;
}

/**
 * PIIDetector - Comprehensive PII detection and data leakage prevention
 * 
 * Provides enterprise-grade privacy protection with real-time PII detection,
 * automated anonymization, and compliance monitoring using MongoDB analytics.
 */
export class PIIDetector {
  private tracingCollection: TracingCollection;
  private memoryCollection: MemoryCollection;
  private piiPatterns: PIIPattern[];
  private anonymizationConfigs: Map<PIIType, AnonymizationConfig> = new Map();

  constructor(tracingCollection: TracingCollection, memoryCollection: MemoryCollection) {
    this.tracingCollection = tracingCollection;
    this.memoryCollection = memoryCollection;
    this.initializePIIPatterns();
    this.initializeAnonymizationConfigs();
  }

  /**
   * Scan content for PII and data leakage risks
   */
  async scanForPII(
    content: string,
    context: {
      sessionId: string;
      userId?: string;
      framework: string;
      traceId?: string;
      contentType: 'input' | 'output' | 'context';
    }
  ): Promise<PIIDetectionResult> {
    const detectedPII: PIIMatch[] = [];

    // Scan for each PII pattern
    for (const pattern of this.piiPatterns) {
      const matches = this.findPIIMatches(content, pattern);
      detectedPII.push(...matches);
    }

    // Calculate risk level
    const riskLevel = this.calculateRiskLevel(detectedPII);

    // Generate sanitized content
    const sanitizedContent = this.sanitizeContent(content, detectedPII);

    // Check compliance status
    const complianceStatus = this.checkComplianceStatus(detectedPII);

    // Generate recommendations
    const recommendations = this.generateRecommendations(detectedPII, riskLevel);

    // Log PII detection for analytics
    await this.logPIIDetection({
      content: context.contentType,
      framework: context.framework,
      sessionId: context.sessionId,
      traceId: context.traceId,
      piiCount: detectedPII.length,
      riskLevel,
      detectedTypes: detectedPII.map(pii => pii.type),
      complianceStatus
    });

    return {
      hasPII: detectedPII.length > 0,
      detectedPII,
      riskLevel,
      sanitizedContent,
      complianceStatus,
      recommendations
    };
  }

  /**
   * Anonymize content using specified strategy
   */
  async anonymizeContent(
    content: string,
    strategy: 'conservative' | 'balanced' | 'aggressive' = 'balanced'
  ): Promise<string> {
    const scanResult = await this.scanForPII(content, {
      sessionId: 'anonymization',
      framework: 'system',
      contentType: 'input'
    });

    if (!scanResult.hasPII) {
      return content;
    }

    let anonymizedContent = content;

    // Apply anonymization based on strategy
    for (const piiMatch of scanResult.detectedPII) {
      const config = this.getAnonymizationConfig(piiMatch.type, strategy);
      const anonymizedValue = this.applyAnonymization(piiMatch.value, config);
      
      anonymizedContent = anonymizedContent.replace(piiMatch.value, anonymizedValue);
    }

    return anonymizedContent;
  }

  /**
   * Generate data leakage analytics using MongoDB aggregation
   */
  async generateDataLeakageAnalytics(timeRange: { start: Date; end: Date }): Promise<DataLeakageAnalysis> {
    // Use MongoDB aggregation for comprehensive PII analytics
    const analyticsPipeline = [
      {
        $match: {
          timestamp: { $gte: timeRange.start, $lte: timeRange.end },
          'metadata.type': 'pii_detection'
        }
      },
      {
        $facet: {
          // Overall statistics
          overallStats: [
            {
              $group: {
                _id: null,
                totalScans: { $sum: 1 },
                piiDetections: {
                  $sum: {
                    $cond: [{ $gt: ['$metadata.piiCount', 0] }, 1, 0]
                  }
                }
              }
            }
          ],

          // PII by type
          piiByType: [
            { $unwind: '$metadata.detectedTypes' },
            {
              $group: {
                _id: '$metadata.detectedTypes',
                count: { $sum: 1 }
              }
            }
          ],

          // PII by severity
          piiBySeverity: [
            {
              $group: {
                _id: '$metadata.riskLevel',
                count: { $sum: 1 }
              }
            }
          ],

          // Compliance violations
          complianceViolations: [
            {
              $group: {
                _id: null,
                gdprViolations: {
                  $sum: {
                    $cond: [{ $eq: ['$metadata.complianceStatus.gdpr', 'violation'] }, 1, 0]
                  }
                },
                ccpaViolations: {
                  $sum: {
                    $cond: [{ $eq: ['$metadata.complianceStatus.ccpa', 'violation'] }, 1, 0]
                  }
                },
                hipaaViolations: {
                  $sum: {
                    $cond: [{ $eq: ['$metadata.complianceStatus.hipaa', 'violation'] }, 1, 0]
                  }
                }
              }
            }
          ],

          // Framework comparison
          frameworkStats: [
            {
              $group: {
                _id: '$metadata.framework',
                totalScans: { $sum: 1 },
                piiDetections: {
                  $sum: {
                    $cond: [{ $gt: ['$metadata.piiCount', 0] }, 1, 0]
                  }
                },
                violations: {
                  $sum: {
                    $cond: [
                      {
                        $or: [
                          { $eq: ['$metadata.complianceStatus.gdpr', 'violation'] },
                          { $eq: ['$metadata.complianceStatus.ccpa', 'violation'] },
                          { $eq: ['$metadata.complianceStatus.hipaa', 'violation'] }
                        ]
                      },
                      1,
                      0
                    ]
                  }
                }
              }
            }
          ],

          // Daily trends
          dailyTrends: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$timestamp'
                  }
                },
                piiCount: { $sum: '$metadata.piiCount' },
                violationCount: {
                  $sum: {
                    $cond: [
                      {
                        $or: [
                          { $eq: ['$metadata.complianceStatus.gdpr', 'violation'] },
                          { $eq: ['$metadata.complianceStatus.ccpa', 'violation'] },
                          { $eq: ['$metadata.complianceStatus.hipaa', 'violation'] }
                        ]
                      },
                      1,
                      0
                    ]
                  }
                }
              }
            },
            { $sort: { '_id': 1 } }
          ]
        }
      }
    ];

    const results = await this.memoryCollection.aggregate(analyticsPipeline);
    const facetResults = results[0];

    const overallStats = facetResults.overallStats[0] || { totalScans: 0, piiDetections: 0 };
    const complianceViolations = facetResults.complianceViolations[0] || { 
      gdprViolations: 0, 
      ccpaViolations: 0, 
      hipaaViolations: 0 
    };

    const piiDetectionRate = overallStats.totalScans > 0 
      ? (overallStats.piiDetections / overallStats.totalScans) * 100 
      : 0;

    return {
      timeRange,
      totalScans: overallStats.totalScans,
      piiDetectionRate: Math.round(piiDetectionRate * 100) / 100,
      leakagesByType: this.arrayToRecord(facetResults.piiByType),
      leakagesBySeverity: this.arrayToRecord(facetResults.piiBySeverity),
      complianceViolations: {
        gdpr: complianceViolations.gdprViolations,
        ccpa: complianceViolations.ccpaViolations,
        hipaa: complianceViolations.hipaaViolations
      },
      frameworkComparison: facetResults.frameworkStats.map((stat: any) => ({
        framework: stat._id,
        piiDetectionRate: stat.totalScans > 0 ? (stat.piiDetections / stat.totalScans) * 100 : 0,
        violationCount: stat.violations
      })),
      trends: facetResults.dailyTrends.map((trend: any) => ({
        date: new Date(trend._id),
        piiCount: trend.piiCount,
        violationCount: trend.violationCount
      }))
    };
  }

  /**
   * Check if content is compliant with specific regulation
   */
  async checkRegulationCompliance(
    content: string,
    regulation: 'gdpr' | 'ccpa' | 'hipaa'
  ): Promise<{ compliant: boolean; violations: PIIMatch[]; recommendations: string[] }> {
    const scanResult = await this.scanForPII(content, {
      sessionId: 'compliance_check',
      framework: 'system',
      contentType: 'input'
    });

    const violations = scanResult.detectedPII.filter(pii => 
      pii.regulation.includes(regulation) && pii.severity !== 'low'
    );

    const compliant = violations.length === 0;
    const recommendations = this.generateComplianceRecommendations(violations, regulation);

    return {
      compliant,
      violations,
      recommendations
    };
  }

  // Private helper methods
  private initializePIIPatterns(): void {
    this.piiPatterns = [
      {
        type: 'ssn',
        pattern: /\b\d{3}-\d{2}-\d{4}\b|\b\d{9}\b/g,
        severity: 'critical',
        maskingStrategy: 'partial',
        regulations: ['gdpr', 'ccpa'],
        description: 'Social Security Number'
      },
      {
        type: 'credit_card',
        pattern: /\b(?:\d{4}[\s-]?){3}\d{4}\b/g,
        severity: 'critical',
        maskingStrategy: 'partial',
        regulations: ['gdpr', 'ccpa'],
        description: 'Credit Card Number'
      },
      {
        type: 'email',
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        severity: 'medium',
        maskingStrategy: 'partial',
        regulations: ['gdpr', 'ccpa'],
        description: 'Email Address'
      },
      {
        type: 'phone',
        pattern: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
        severity: 'medium',
        maskingStrategy: 'partial',
        regulations: ['gdpr', 'ccpa'],
        description: 'Phone Number'
      },
      {
        type: 'ip_address',
        pattern: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
        severity: 'low',
        maskingStrategy: 'partial',
        regulations: ['gdpr'],
        description: 'IP Address'
      },
      {
        type: 'date_of_birth',
        pattern: /\b(?:0[1-9]|1[0-2])[-\/](?:0[1-9]|[12][0-9]|3[01])[-\/](?:19|20)\d{2}\b/g,
        severity: 'high',
        maskingStrategy: 'full',
        regulations: ['gdpr', 'ccpa', 'hipaa'],
        description: 'Date of Birth'
      },
      {
        type: 'medical_record',
        pattern: /\b(?:MRN|Medical Record|Patient ID)[\s:]*\d+\b/gi,
        severity: 'critical',
        maskingStrategy: 'full',
        regulations: ['hipaa', 'gdpr'],
        description: 'Medical Record Number'
      }
    ];
  }

  private initializeAnonymizationConfigs(): void {
    // Set default anonymization configs for each PII type
    this.anonymizationConfigs.set('ssn', {
      strategy: 'mask',
      preserveFormat: true,
      customMaskChar: '*'
    });

    this.anonymizationConfigs.set('credit_card', {
      strategy: 'mask',
      preserveFormat: true,
      customMaskChar: '*'
    });

    this.anonymizationConfigs.set('email', {
      strategy: 'mask',
      preserveFormat: true,
      customMaskChar: '*'
    });

    // Add more configs as needed
  }

  private findPIIMatches(content: string, pattern: PIIPattern): PIIMatch[] {
    const matches: PIIMatch[] = [];
    let match;

    while ((match = pattern.pattern.exec(content)) !== null) {
      const value = match[0];
      const maskedValue = this.maskValue(value, pattern.maskingStrategy);

      matches.push({
        type: pattern.type,
        value,
        maskedValue,
        location: {
          startIndex: match.index,
          endIndex: match.index + value.length
        },
        confidence: 0.9, // High confidence for regex matches
        severity: pattern.severity,
        regulation: pattern.regulations
      });
    }

    return matches;
  }

  private maskValue(value: string, strategy: string): string {
    switch (strategy) {
      case 'full':
        return '*'.repeat(value.length);
      case 'partial':
        if (value.length <= 4) return '*'.repeat(value.length);
        return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
      case 'hash':
        // Simple hash for demo - use proper crypto in production
        return `[HASH:${value.length}]`;
      case 'tokenize':
        return `[TOKEN:${Math.random().toString(36).substr(2, 8)}]`;
      default:
        return '*'.repeat(value.length);
    }
  }

  private calculateRiskLevel(detectedPII: PIIMatch[]): 'low' | 'medium' | 'high' | 'critical' {
    if (detectedPII.some(pii => pii.severity === 'critical')) return 'critical';
    if (detectedPII.some(pii => pii.severity === 'high')) return 'high';
    if (detectedPII.some(pii => pii.severity === 'medium')) return 'medium';
    return detectedPII.length > 0 ? 'low' : 'low';
  }

  private sanitizeContent(content: string, detectedPII: PIIMatch[]): string {
    let sanitized = content;
    
    // Sort by position (descending) to avoid index shifting
    const sortedPII = detectedPII.sort((a, b) => b.location.startIndex - a.location.startIndex);
    
    for (const pii of sortedPII) {
      sanitized = sanitized.substring(0, pii.location.startIndex) + 
                 pii.maskedValue + 
                 sanitized.substring(pii.location.endIndex);
    }

    return sanitized;
  }

  private checkComplianceStatus(detectedPII: PIIMatch[]): PIIDetectionResult['complianceStatus'] {
    const gdprViolations = detectedPII.filter(pii => 
      pii.regulation.includes('gdpr') && pii.severity !== 'low'
    );
    const ccpaViolations = detectedPII.filter(pii => 
      pii.regulation.includes('ccpa') && pii.severity !== 'low'
    );
    const hipaaViolations = detectedPII.filter(pii => 
      pii.regulation.includes('hipaa') && pii.severity !== 'low'
    );

    return {
      gdpr: gdprViolations.length > 0 ? 'violation' : 'compliant',
      ccpa: ccpaViolations.length > 0 ? 'violation' : 'compliant',
      hipaa: hipaaViolations.length > 0 ? 'violation' : 'compliant'
    };
  }

  private generateRecommendations(detectedPII: PIIMatch[], riskLevel: string): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'critical') {
      recommendations.push('Immediate action required: Critical PII detected');
      recommendations.push('Consider blocking or heavily redacting this content');
    }

    if (detectedPII.some(pii => pii.type === 'ssn' || pii.type === 'credit_card')) {
      recommendations.push('Financial information detected - ensure PCI DSS compliance');
    }

    if (detectedPII.some(pii => pii.type === 'medical_record')) {
      recommendations.push('Medical information detected - ensure HIPAA compliance');
    }

    if (detectedPII.length > 0) {
      recommendations.push('Apply appropriate anonymization before storing or transmitting');
    }

    return recommendations;
  }

  private generateComplianceRecommendations(violations: PIIMatch[], regulation: string): string[] {
    const recommendations: string[] = [];

    if (violations.length === 0) {
      recommendations.push(`Content appears compliant with ${regulation.toUpperCase()}`);
      return recommendations;
    }

    recommendations.push(`${violations.length} ${regulation.toUpperCase()} violations detected`);
    
    const violationTypes = [...new Set(violations.map(v => v.type))];
    recommendations.push(`Violation types: ${violationTypes.join(', ')}`);
    
    recommendations.push('Consider anonymization or removal of detected PII');
    
    if (regulation === 'gdpr') {
      recommendations.push('Ensure data subject consent and right to erasure compliance');
    }

    return recommendations;
  }

  private getAnonymizationConfig(piiType: PIIType, strategy: string): AnonymizationConfig {
    const baseConfig = this.anonymizationConfigs.get(piiType) || {
      strategy: 'mask',
      preserveFormat: true,
      customMaskChar: '*'
    };

    // Adjust based on strategy
    switch (strategy) {
      case 'conservative':
        return { ...baseConfig, strategy: 'mask' };
      case 'aggressive':
        return { ...baseConfig, strategy: 'remove' };
      default:
        return baseConfig;
    }
  }

  private applyAnonymization(value: string, config: AnonymizationConfig): string {
    switch (config.strategy) {
      case 'remove':
        return '[REDACTED]';
      case 'hash':
        return `[HASH:${value.length}]`;
      case 'tokenize':
        return `[TOKEN:${Math.random().toString(36).substr(2, 8)}]`;
      case 'generalize':
        return '[PERSONAL_INFO]';
      default:
        return this.maskValue(value, 'partial');
    }
  }

  private async logPIIDetection(logData: any): Promise<void> {
    await this.memoryCollection.storeDocument(
      JSON.stringify(logData),
      {
        type: 'pii_detection',
        framework: logData.framework,
        sessionId: logData.sessionId,
        traceId: logData.traceId,
        piiCount: logData.piiCount,
        riskLevel: logData.riskLevel,
        detectedTypes: logData.detectedTypes,
        complianceStatus: logData.complianceStatus
      }
    );
  }

  private arrayToRecord(array: any[]): Record<string, number> {
    const record: Record<string, number> = {};
    array.forEach(item => {
      record[item._id] = item.count;
    });
    return record;
  }
}
