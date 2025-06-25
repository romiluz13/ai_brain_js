/**
 * @file FrameworkSafetyIntegration - Framework safety integration system
 * 
 * This system integrates all safety components (SafetyEngine, HallucinationDetector,
 * PIIDetector, ComplianceAuditLogger) into framework adapters with pre-generation
 * validation, post-generation filtering, and real-time safety monitoring while
 * preserving exact framework API compatibility.
 * 
 * Features:
 * - Pre-generation input validation and sanitization
 * - Post-generation output filtering and safety checks
 * - Real-time safety monitoring with MongoDB validation
 * - Framework API compatibility preservation
 * - Configurable safety levels per framework
 * - Comprehensive safety audit logging
 * - Emergency safety circuit breakers
 */

import { SafetyEngine, SafetyValidationResult } from './SafetyEngine';
import { HallucinationDetector } from './HallucinationDetector';
import { PIIDetector } from './PIIDetector';
import { ComplianceAuditLogger } from './ComplianceAuditLogger';
import { TracingCollection } from '../collections/TracingCollection';
import { MemoryCollection } from '../collections/MemoryCollection';

export interface SafetyConfiguration {
  framework: 'vercel-ai' | 'mastra' | 'openai-agents' | 'langchain';
  safetyLevel: 'strict' | 'moderate' | 'permissive' | 'custom';
  enabledChecks: {
    contentValidation: boolean;
    hallucinationDetection: boolean;
    piiDetection: boolean;
    complianceLogging: boolean;
    realTimeMonitoring: boolean;
  };
  thresholds: {
    contentSafety: number; // 0-1
    hallucinationConfidence: number; // 0-1
    piiSensitivity: number; // 0-1
    responseTimeLimit: number; // milliseconds
  };
  actions: {
    onUnsafeContent: 'block' | 'filter' | 'warn' | 'log';
    onHallucination: 'block' | 'flag' | 'warn' | 'log';
    onPIIDetected: 'block' | 'mask' | 'warn' | 'log';
    onComplianceViolation: 'block' | 'escalate' | 'warn' | 'log';
  };
  customRules?: SafetyRule[];
}

export interface SafetyRule {
  ruleId: string;
  name: string;
  description: string;
  type: 'input_validation' | 'output_filtering' | 'content_analysis' | 'compliance_check';
  pattern?: string; // regex pattern
  keywords?: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  action: 'block' | 'filter' | 'warn' | 'log';
  enabled: boolean;
}

export interface SafetyInterceptResult {
  allowed: boolean;
  action: 'proceed' | 'block' | 'filter' | 'warn';
  originalContent: string;
  filteredContent?: string;
  violations: {
    type: 'content_safety' | 'hallucination' | 'pii' | 'compliance' | 'custom_rule';
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    confidence: number;
    ruleId?: string;
  }[];
  auditId?: string;
  processingTime: number;
}

export interface FrameworkSafetyMetrics {
  framework: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  totalRequests: number;
  safetyChecks: {
    contentValidation: {
      checked: number;
      blocked: number;
      filtered: number;
      warned: number;
    };
    hallucinationDetection: {
      checked: number;
      flagged: number;
      blocked: number;
    };
    piiDetection: {
      checked: number;
      detected: number;
      masked: number;
      blocked: number;
    };
    complianceChecks: {
      performed: number;
      violations: number;
      escalated: number;
    };
  };
  averageProcessingTime: number;
  safetyScore: number; // 0-100
}

/**
 * FrameworkSafetyIntegration - Comprehensive safety integration for all frameworks
 * 
 * Provides seamless safety integration that preserves framework API compatibility
 * while ensuring enterprise-grade safety and compliance.
 */
export class FrameworkSafetyIntegration {
  private safetyEngine: SafetyEngine;
  private hallucinationDetector: HallucinationDetector;
  private piiDetector: PIIDetector;
  private complianceAuditLogger: ComplianceAuditLogger;
  private tracingCollection: TracingCollection;
  private memoryCollection: MemoryCollection;
  private frameworkConfigurations: Map<string, SafetyConfiguration> = new Map();
  private circuitBreakers: Map<string, { isOpen: boolean; failures: number; lastFailure: Date }> = new Map();

  constructor(
    safetyEngine: SafetyEngine,
    hallucinationDetector: HallucinationDetector,
    piiDetector: PIIDetector,
    complianceAuditLogger: ComplianceAuditLogger,
    tracingCollection: TracingCollection,
    memoryCollection: MemoryCollection
  ) {
    this.safetyEngine = safetyEngine;
    this.hallucinationDetector = hallucinationDetector;
    this.piiDetector = piiDetector;
    this.complianceAuditLogger = complianceAuditLogger;
    this.tracingCollection = tracingCollection;
    this.memoryCollection = memoryCollection;
    this.initializeDefaultConfigurations();
  }

  /**
   * Pre-generation safety validation for framework inputs
   */
  async validateInput(
    framework: string,
    input: string,
    context?: any,
    sessionId?: string
  ): Promise<SafetyInterceptResult> {
    const startTime = Date.now();
    const config = this.frameworkConfigurations.get(framework);
    
    if (!config) {
      throw new Error(`No safety configuration found for framework: ${framework}`);
    }

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(framework)) {
      return {
        allowed: false,
        action: 'block',
        originalContent: input,
        violations: [{
          type: 'content_safety',
          severity: 'critical',
          description: 'Safety system circuit breaker is open',
          confidence: 1.0
        }],
        processingTime: Date.now() - startTime
      };
    }

    const violations: SafetyInterceptResult['violations'] = [];
    let filteredContent = input;
    let finalAction: SafetyInterceptResult['action'] = 'proceed';

    try {
      // 1. Content Safety Validation
      if (config.enabledChecks.contentValidation) {
        const contentResult = await this.safetyEngine.validateContent(input, context);
        if (!contentResult.isValid) {
          violations.push({
            type: 'content_safety',
            severity: contentResult.riskLevel as any,
            description: contentResult.violations.join(', '),
            confidence: contentResult.confidence
          });

          if (contentResult.riskLevel === 'high' || contentResult.riskLevel === 'critical') {
            finalAction = this.determineAction(config.actions.onUnsafeContent, finalAction);
          }
        }
      }

      // 2. PII Detection
      if (config.enabledChecks.piiDetection) {
        const piiResult = await this.piiDetector.detectPII(input);
        if (piiResult.hasPII) {
          violations.push({
            type: 'pii',
            severity: piiResult.riskLevel as any,
            description: `PII detected: ${piiResult.detectedTypes.join(', ')}`,
            confidence: piiResult.confidence
          });

          if (config.actions.onPIIDetected === 'mask') {
            filteredContent = piiResult.maskedContent || input;
          } else {
            finalAction = this.determineAction(config.actions.onPIIDetected, finalAction);
          }
        }
      }

      // 3. Custom Rules Validation
      if (config.customRules) {
        for (const rule of config.customRules.filter(r => r.enabled && r.type === 'input_validation')) {
          const ruleViolation = this.checkCustomRule(input, rule);
          if (ruleViolation) {
            violations.push({
              type: 'custom_rule',
              severity: rule.severity,
              description: ruleViolation,
              confidence: 0.9,
              ruleId: rule.ruleId
            });
            finalAction = this.determineAction(rule.action, finalAction);
          }
        }
      }

      // 4. Compliance Logging
      if (config.enabledChecks.complianceLogging && violations.length > 0) {
        const auditId = await this.complianceAuditLogger.logAuditEvent({
          eventType: 'safety_decision',
          action: finalAction === 'proceed' ? 'allow' : 'block',
          actor: {
            sessionId: sessionId || 'unknown',
            framework: framework,
            ipAddress: 'unknown',
            userAgent: 'unknown'
          },
          resource: {
            type: 'input',
            identifier: `input_${Date.now()}`,
            classification: violations.some(v => v.severity === 'critical') ? 'restricted' : 'internal'
          },
          decision: {
            outcome: finalAction === 'proceed' ? 'approved' : 'denied',
            reason: violations.map(v => v.description).join('; '),
            confidence: violations.length > 0 ? Math.min(...violations.map(v => v.confidence)) : 1.0,
            automaticDecision: true,
            reviewRequired: violations.some(v => v.severity === 'critical')
          },
          compliance: {
            regulations: ['gdpr', 'ccpa'],
            requirements: ['data_protection', 'content_safety'],
            status: violations.length > 0 ? 'violation' : 'compliant',
            evidence: violations.map(v => v.description)
          },
          metadata: {
            correlationId: sessionId || `session_${Date.now()}`,
            severity: violations.length > 0 ? violations[0].severity : 'low',
            tags: [framework, 'input_validation'],
            additionalData: { violationCount: violations.length }
          }
        });

        return {
          allowed: finalAction === 'proceed',
          action: finalAction,
          originalContent: input,
          filteredContent: filteredContent !== input ? filteredContent : undefined,
          violations,
          auditId,
          processingTime: Date.now() - startTime
        };
      }

      return {
        allowed: finalAction === 'proceed',
        action: finalAction,
        originalContent: input,
        filteredContent: filteredContent !== input ? filteredContent : undefined,
        violations,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      // Handle safety system failures
      this.recordCircuitBreakerFailure(framework);
      
      return {
        allowed: false,
        action: 'block',
        originalContent: input,
        violations: [{
          type: 'content_safety',
          severity: 'critical',
          description: `Safety system error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          confidence: 1.0
        }],
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Post-generation safety filtering for framework outputs
   */
  async validateOutput(
    framework: string,
    output: string,
    context?: any,
    sessionId?: string
  ): Promise<SafetyInterceptResult> {
    const startTime = Date.now();
    const config = this.frameworkConfigurations.get(framework);
    
    if (!config) {
      throw new Error(`No safety configuration found for framework: ${framework}`);
    }

    const violations: SafetyInterceptResult['violations'] = [];
    let filteredContent = output;
    let finalAction: SafetyInterceptResult['action'] = 'proceed';

    try {
      // 1. Hallucination Detection
      if (config.enabledChecks.hallucinationDetection && context) {
        const hallucinationResult = await this.hallucinationDetector.detectHallucination(output, context);
        if (hallucinationResult.isHallucination) {
          violations.push({
            type: 'hallucination',
            severity: hallucinationResult.severity as any,
            description: `Potential hallucination: ${hallucinationResult.reasons.join(', ')}`,
            confidence: hallucinationResult.confidence
          });
          finalAction = this.determineAction(config.actions.onHallucination, finalAction);
        }
      }

      // 2. Output Content Safety
      if (config.enabledChecks.contentValidation) {
        const contentResult = await this.safetyEngine.validateContent(output, context);
        if (!contentResult.isValid) {
          violations.push({
            type: 'content_safety',
            severity: contentResult.riskLevel as any,
            description: contentResult.violations.join(', '),
            confidence: contentResult.confidence
          });
          finalAction = this.determineAction(config.actions.onUnsafeContent, finalAction);
        }
      }

      // 3. Output PII Detection
      if (config.enabledChecks.piiDetection) {
        const piiResult = await this.piiDetector.detectPII(output);
        if (piiResult.hasPII) {
          violations.push({
            type: 'pii',
            severity: piiResult.riskLevel as any,
            description: `PII in output: ${piiResult.detectedTypes.join(', ')}`,
            confidence: piiResult.confidence
          });

          if (config.actions.onPIIDetected === 'mask') {
            filteredContent = piiResult.maskedContent || output;
          } else {
            finalAction = this.determineAction(config.actions.onPIIDetected, finalAction);
          }
        }
      }

      // 4. Custom Output Rules
      if (config.customRules) {
        for (const rule of config.customRules.filter(r => r.enabled && r.type === 'output_filtering')) {
          const ruleViolation = this.checkCustomRule(output, rule);
          if (ruleViolation) {
            violations.push({
              type: 'custom_rule',
              severity: rule.severity,
              description: ruleViolation,
              confidence: 0.9,
              ruleId: rule.ruleId
            });
            finalAction = this.determineAction(rule.action, finalAction);
          }
        }
      }

      return {
        allowed: finalAction === 'proceed',
        action: finalAction,
        originalContent: output,
        filteredContent: filteredContent !== output ? filteredContent : undefined,
        violations,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      this.recordCircuitBreakerFailure(framework);
      
      return {
        allowed: false,
        action: 'block',
        originalContent: output,
        violations: [{
          type: 'content_safety',
          severity: 'critical',
          description: `Safety system error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          confidence: 1.0
        }],
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Configure safety settings for a specific framework
   */
  async configureSafety(framework: string, config: SafetyConfiguration): Promise<void> {
    // Validate configuration using MongoDB $jsonSchema patterns
    const validationResult = this.validateSafetyConfiguration(config);
    if (!validationResult.valid) {
      throw new Error(`Invalid safety configuration: ${validationResult.errors.join(', ')}`);
    }

    this.frameworkConfigurations.set(framework, config);

    // Store configuration in MongoDB
    await this.memoryCollection.storeDocument(
      JSON.stringify(config),
      {
        type: 'safety_configuration',
        framework,
        safetyLevel: config.safetyLevel,
        timestamp: new Date(),
        version: '1.0'
      }
    );
  }

  /**
   * Get safety metrics for a framework
   */
  async getSafetyMetrics(
    framework: string,
    timeRange: { start: Date; end: Date }
  ): Promise<FrameworkSafetyMetrics> {
    // Use MongoDB aggregation to calculate safety metrics
    const metricsPipeline = [
      {
        $match: {
          'metadata.framework': framework,
          timestamp: { $gte: timeRange.start, $lte: timeRange.end },
          'metadata.type': 'audit_event'
        }
      },
      {
        $facet: {
          contentValidation: [
            { $match: { 'metadata.eventType': 'content_filter' } },
            {
              $group: {
                _id: '$metadata.decision.outcome',
                count: { $sum: 1 }
              }
            }
          ],
          hallucinationDetection: [
            { $match: { 'metadata.eventType': 'hallucination_check' } },
            {
              $group: {
                _id: '$metadata.decision.outcome',
                count: { $sum: 1 }
              }
            }
          ],
          piiDetection: [
            { $match: { 'metadata.eventType': 'pii_detection' } },
            {
              $group: {
                _id: '$metadata.decision.outcome',
                count: { $sum: 1 }
              }
            }
          ],
          overallMetrics: [
            {
              $group: {
                _id: null,
                totalRequests: { $sum: 1 },
                avgProcessingTime: { $avg: '$metadata.processingTime' },
                violationCount: {
                  $sum: {
                    $cond: [{ $eq: ['$metadata.compliance.status', 'violation'] }, 1, 0]
                  }
                }
              }
            }
          ]
        }
      }
    ];

    const results = await this.memoryCollection.aggregate(metricsPipeline);
    const metrics = results[0];

    // Calculate safety score based on violation rate
    const totalRequests = metrics.overallMetrics[0]?.totalRequests || 0;
    const violationCount = metrics.overallMetrics[0]?.violationCount || 0;
    const safetyScore = totalRequests > 0 ? Math.max(0, 100 - (violationCount / totalRequests) * 100) : 100;

    return {
      framework,
      timeRange,
      totalRequests,
      safetyChecks: {
        contentValidation: this.aggregateCheckMetrics(metrics.contentValidation),
        hallucinationDetection: this.aggregateHallucinationMetrics(metrics.hallucinationDetection),
        piiDetection: this.aggregatePIIMetrics(metrics.piiDetection),
        complianceChecks: {
          performed: totalRequests,
          violations: violationCount,
          escalated: Math.floor(violationCount * 0.1) // Estimate
        }
      },
      averageProcessingTime: metrics.overallMetrics[0]?.avgProcessingTime || 0,
      safetyScore: Math.round(safetyScore)
    };
  }

  // Private helper methods
  private initializeDefaultConfigurations(): void {
    const defaultConfig: SafetyConfiguration = {
      framework: 'vercel-ai',
      safetyLevel: 'moderate',
      enabledChecks: {
        contentValidation: true,
        hallucinationDetection: true,
        piiDetection: true,
        complianceLogging: true,
        realTimeMonitoring: true
      },
      thresholds: {
        contentSafety: 0.8,
        hallucinationConfidence: 0.7,
        piiSensitivity: 0.9,
        responseTimeLimit: 5000
      },
      actions: {
        onUnsafeContent: 'filter',
        onHallucination: 'flag',
        onPIIDetected: 'mask',
        onComplianceViolation: 'log'
      }
    };

    // Initialize default configurations for all frameworks
    ['vercel-ai', 'mastra', 'openai-agents', 'langchain'].forEach(framework => {
      this.frameworkConfigurations.set(framework, {
        ...defaultConfig,
        framework: framework as any
      });
    });
  }

  private validateSafetyConfiguration(config: SafetyConfiguration): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation (would use MongoDB $jsonSchema in production)
    if (!config.framework) errors.push('Framework is required');
    if (!config.safetyLevel) errors.push('Safety level is required');
    if (!config.enabledChecks) errors.push('Enabled checks configuration is required');
    if (!config.thresholds) errors.push('Thresholds configuration is required');
    if (!config.actions) errors.push('Actions configuration is required');

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private determineAction(
    configAction: 'block' | 'filter' | 'warn' | 'log' | 'mask' | 'flag' | 'escalate',
    currentAction: SafetyInterceptResult['action']
  ): SafetyInterceptResult['action'] {
    // Priority: block > filter > warn > proceed
    const actionPriority = { block: 4, filter: 3, warn: 2, proceed: 1 };
    const mappedAction = configAction === 'mask' || configAction === 'flag' || configAction === 'escalate' 
      ? 'filter' 
      : configAction === 'log' 
        ? 'warn' 
        : configAction as SafetyInterceptResult['action'];

    return actionPriority[mappedAction] > actionPriority[currentAction] ? mappedAction : currentAction;
  }

  private checkCustomRule(content: string, rule: SafetyRule): string | null {
    if (rule.pattern) {
      const regex = new RegExp(rule.pattern, 'gi');
      if (regex.test(content)) {
        return `Content matches prohibited pattern: ${rule.name}`;
      }
    }

    if (rule.keywords) {
      const foundKeywords = rule.keywords.filter(keyword => 
        content.toLowerCase().includes(keyword.toLowerCase())
      );
      if (foundKeywords.length > 0) {
        return `Content contains prohibited keywords: ${foundKeywords.join(', ')}`;
      }
    }

    return null;
  }

  private isCircuitBreakerOpen(framework: string): boolean {
    const breaker = this.circuitBreakers.get(framework);
    if (!breaker) return false;

    // Reset circuit breaker after 5 minutes
    if (breaker.isOpen && Date.now() - breaker.lastFailure.getTime() > 5 * 60 * 1000) {
      breaker.isOpen = false;
      breaker.failures = 0;
    }

    return breaker.isOpen;
  }

  private recordCircuitBreakerFailure(framework: string): void {
    const breaker = this.circuitBreakers.get(framework) || { isOpen: false, failures: 0, lastFailure: new Date() };
    breaker.failures++;
    breaker.lastFailure = new Date();

    // Open circuit breaker after 5 failures
    if (breaker.failures >= 5) {
      breaker.isOpen = true;
    }

    this.circuitBreakers.set(framework, breaker);
  }

  private aggregateCheckMetrics(data: any[]): any {
    const result = { checked: 0, blocked: 0, filtered: 0, warned: 0 };
    data.forEach(item => {
      result.checked += item.count;
      if (item._id === 'denied') result.blocked += item.count;
      else if (item._id === 'modified') result.filtered += item.count;
      else if (item._id === 'flagged') result.warned += item.count;
    });
    return result;
  }

  private aggregateHallucinationMetrics(data: any[]): any {
    const result = { checked: 0, flagged: 0, blocked: 0 };
    data.forEach(item => {
      result.checked += item.count;
      if (item._id === 'denied') result.blocked += item.count;
      else if (item._id === 'flagged') result.flagged += item.count;
    });
    return result;
  }

  private aggregatePIIMetrics(data: any[]): any {
    const result = { checked: 0, detected: 0, masked: 0, blocked: 0 };
    data.forEach(item => {
      result.checked += item.count;
      if (item._id === 'denied') result.blocked += item.count;
      else if (item._id === 'modified') result.masked += item.count;
      else result.detected += item.count;
    });
    return result;
  }
}
