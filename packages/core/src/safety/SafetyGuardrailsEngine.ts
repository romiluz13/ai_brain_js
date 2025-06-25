/**
 * @file SafetyGuardrailsEngine - Comprehensive safety and content filtering system
 * 
 * This engine provides multi-layered safety guardrails for the Universal AI Brain,
 * including content filtering, prompt injection detection, output validation,
 * and compliance monitoring using MongoDB for safety analytics and logging.
 * 
 * Features:
 * - Multi-layered content filtering (input/output)
 * - Prompt injection attack detection
 * - Harmful content classification
 * - Compliance monitoring and reporting
 * - Real-time safety analytics with MongoDB
 * - Framework-agnostic safety enforcement
 * - Configurable safety policies
 */

import { TracingCollection } from '../collections/TracingCollection';
import { MemoryCollection } from '../collections/MemoryCollection';

export interface SafetyPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  rules: SafetyRule[];
  frameworks: string[]; // Which frameworks this applies to
  createdAt: Date;
  updatedAt: Date;
}

export interface SafetyRule {
  id: string;
  type: 'content_filter' | 'prompt_injection' | 'output_validation' | 'rate_limit' | 'compliance';
  pattern: string | RegExp;
  action: 'block' | 'warn' | 'log' | 'modify';
  threshold?: number;
  description: string;
  enabled: boolean;
}

export interface SafetyViolation {
  id: string;
  timestamp: Date;
  traceId?: string;
  sessionId: string;
  userId?: string;
  violationType: 'harmful_content' | 'prompt_injection' | 'policy_violation' | 'rate_limit' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  content: {
    input?: string;
    output?: string;
    context?: string;
  };
  policyId: string;
  ruleId: string;
  action: 'blocked' | 'warned' | 'logged' | 'modified';
  framework: string;
  metadata: Record<string, any>;
}

export interface SafetyAnalytics {
  timeRange: {
    start: Date;
    end: Date;
  };
  totalViolations: number;
  violationsByType: Record<string, number>;
  violationsBySeverity: Record<string, number>;
  violationsByFramework: Record<string, number>;
  topViolatedPolicies: {
    policyId: string;
    policyName: string;
    violationCount: number;
  }[];
  safetyTrends: {
    date: Date;
    violationCount: number;
    blockedCount: number;
  }[];
  complianceScore: number; // 0-100
}

export interface ContentAnalysisResult {
  isSafe: boolean;
  confidence: number;
  violations: {
    type: string;
    severity: string;
    description: string;
    confidence: number;
  }[];
  suggestedAction: 'allow' | 'block' | 'modify' | 'review';
  modifiedContent?: string;
}

/**
 * SafetyGuardrailsEngine - Comprehensive safety and content filtering
 * 
 * Provides multi-layered safety protection for the Universal AI Brain
 * with real-time monitoring and analytics using MongoDB.
 */
export class SafetyGuardrailsEngine {
  private tracingCollection: TracingCollection;
  private memoryCollection: MemoryCollection;
  private policies: Map<string, SafetyPolicy> = new Map();
  private violationCache: Map<string, SafetyViolation[]> = new Map();

  constructor(tracingCollection: TracingCollection, memoryCollection: MemoryCollection) {
    this.tracingCollection = tracingCollection;
    this.memoryCollection = memoryCollection;
    this.initializeDefaultPolicies();
  }

  /**
   * Analyze input content for safety violations
   */
  async analyzeInputSafety(
    input: string,
    context: {
      sessionId: string;
      userId?: string;
      framework: string;
      traceId?: string;
    }
  ): Promise<ContentAnalysisResult> {
    const violations: any[] = [];
    let confidence = 1.0;

    // Check all enabled policies
    for (const policy of this.policies.values()) {
      if (!policy.enabled || !policy.frameworks.includes(context.framework)) {
        continue;
      }

      for (const rule of policy.rules) {
        if (!rule.enabled) continue;

        const violation = await this.checkRule(input, rule, 'input');
        if (violation) {
          violations.push({
            type: violation.violationType,
            severity: violation.severity,
            description: `Policy: ${policy.name}, Rule: ${rule.description}`,
            confidence: violation.metadata.confidence || 0.9
          });

          // Log violation
          await this.logViolation({
            ...violation,
            sessionId: context.sessionId,
            userId: context.userId,
            framework: context.framework,
            traceId: context.traceId,
            content: { input }
          });
        }
      }
    }

    // Determine overall safety
    const criticalViolations = violations.filter(v => v.severity === 'critical');
    const highViolations = violations.filter(v => v.severity === 'high');

    const isSafe = criticalViolations.length === 0 && highViolations.length === 0;
    const suggestedAction = this.determineSuggestedAction(violations);

    return {
      isSafe,
      confidence: violations.length > 0 ? Math.min(...violations.map(v => v.confidence)) : 1.0,
      violations,
      suggestedAction,
      modifiedContent: suggestedAction === 'modify' ? this.sanitizeContent(input) : undefined
    };
  }

  /**
   * Analyze output content for safety violations
   */
  async analyzeOutputSafety(
    output: string,
    context: {
      sessionId: string;
      userId?: string;
      framework: string;
      traceId?: string;
      originalInput?: string;
    }
  ): Promise<ContentAnalysisResult> {
    const violations: any[] = [];

    // Check for harmful content in output
    const harmfulContentCheck = await this.detectHarmfulContent(output);
    if (!harmfulContentCheck.isSafe) {
      violations.push(...harmfulContentCheck.violations);
    }

    // Check for data leakage
    const dataLeakageCheck = await this.detectDataLeakage(output, context.originalInput);
    if (!dataLeakageCheck.isSafe) {
      violations.push(...dataLeakageCheck.violations);
    }

    // Check compliance requirements
    const complianceCheck = await this.checkCompliance(output, context.framework);
    if (!complianceCheck.isSafe) {
      violations.push(...complianceCheck.violations);
    }

    // Log violations
    for (const violation of violations) {
      await this.logViolation({
        id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        sessionId: context.sessionId,
        userId: context.userId,
        framework: context.framework,
        traceId: context.traceId,
        violationType: violation.type,
        severity: violation.severity,
        content: { output, input: context.originalInput },
        policyId: 'output_safety',
        ruleId: violation.ruleId || 'general',
        action: 'logged',
        metadata: { confidence: violation.confidence }
      });
    }

    const isSafe = violations.filter(v => v.severity === 'critical' || v.severity === 'high').length === 0;
    const suggestedAction = this.determineSuggestedAction(violations);

    return {
      isSafe,
      confidence: violations.length > 0 ? Math.min(...violations.map(v => v.confidence)) : 1.0,
      violations,
      suggestedAction,
      modifiedContent: suggestedAction === 'modify' ? this.sanitizeContent(output) : undefined
    };
  }

  /**
   * Generate safety analytics using MongoDB aggregation
   */
  async generateSafetyAnalytics(timeRange: { start: Date; end: Date }): Promise<SafetyAnalytics> {
    // Use MongoDB aggregation for comprehensive safety analytics
    const analyticsPipeline = [
      {
        $match: {
          timestamp: { $gte: timeRange.start, $lte: timeRange.end },
          'metadata.type': 'safety_violation'
        }
      },
      {
        $facet: {
          // Total violations
          totalCount: [
            { $count: 'total' }
          ],

          // Violations by type
          byType: [
            {
              $group: {
                _id: '$metadata.violationType',
                count: { $sum: 1 }
              }
            }
          ],

          // Violations by severity
          bySeverity: [
            {
              $group: {
                _id: '$metadata.severity',
                count: { $sum: 1 }
              }
            }
          ],

          // Violations by framework
          byFramework: [
            {
              $group: {
                _id: '$metadata.framework',
                count: { $sum: 1 }
              }
            }
          ],

          // Top violated policies
          topPolicies: [
            {
              $group: {
                _id: '$metadata.policyId',
                count: { $sum: 1 },
                policyName: { $first: '$metadata.policyName' }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
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
                violationCount: { $sum: 1 },
                blockedCount: {
                  $sum: {
                    $cond: [{ $eq: ['$metadata.action', 'blocked'] }, 1, 0]
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

    // Calculate compliance score
    const totalViolations = facetResults.totalCount[0]?.total || 0;
    const criticalViolations = facetResults.bySeverity.find((s: any) => s._id === 'critical')?.count || 0;
    const complianceScore = Math.max(0, 100 - (criticalViolations * 10) - (totalViolations * 0.1));

    return {
      timeRange,
      totalViolations,
      violationsByType: this.arrayToRecord(facetResults.byType),
      violationsBySeverity: this.arrayToRecord(facetResults.bySeverity),
      violationsByFramework: this.arrayToRecord(facetResults.byFramework),
      topViolatedPolicies: facetResults.topPolicies.map((p: any) => ({
        policyId: p._id,
        policyName: p.policyName || 'Unknown',
        violationCount: p.count
      })),
      safetyTrends: facetResults.dailyTrends.map((t: any) => ({
        date: new Date(t._id),
        violationCount: t.violationCount,
        blockedCount: t.blockedCount
      })),
      complianceScore: Math.round(complianceScore)
    };
  }

  /**
   * Add or update safety policy
   */
  async updateSafetyPolicy(policy: SafetyPolicy): Promise<void> {
    policy.updatedAt = new Date();
    this.policies.set(policy.id, policy);

    // Store in MongoDB for persistence
    await this.memoryCollection.storeDocument(
      JSON.stringify(policy),
      {
        type: 'safety_policy',
        policyId: policy.id,
        enabled: policy.enabled,
        severity: policy.severity
      }
    );
  }

  /**
   * Get safety violations for a session
   */
  async getSessionViolations(sessionId: string): Promise<SafetyViolation[]> {
    const pipeline = [
      {
        $match: {
          'metadata.type': 'safety_violation',
          'metadata.sessionId': sessionId
        }
      },
      { $sort: { timestamp: -1 } }
    ];

    const results = await this.memoryCollection.aggregate(pipeline);
    return results.map(this.parseViolationFromDocument);
  }

  // Private helper methods
  private initializeDefaultPolicies(): void {
    // Initialize with common safety policies
    const defaultPolicies: SafetyPolicy[] = [
      {
        id: 'harmful_content',
        name: 'Harmful Content Filter',
        description: 'Prevents generation of harmful, toxic, or inappropriate content',
        enabled: true,
        severity: 'critical',
        frameworks: ['vercel-ai', 'mastra', 'langchain', 'openai-agents'],
        rules: [
          {
            id: 'violence',
            type: 'content_filter',
            pattern: /\b(kill|murder|violence|harm|hurt|attack)\b/i,
            action: 'block',
            description: 'Violence-related content',
            enabled: true
          },
          {
            id: 'hate_speech',
            type: 'content_filter',
            pattern: /\b(hate|racist|discrimination)\b/i,
            action: 'block',
            description: 'Hate speech detection',
            enabled: true
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'prompt_injection',
        name: 'Prompt Injection Protection',
        description: 'Detects and prevents prompt injection attacks',
        enabled: true,
        severity: 'high',
        frameworks: ['vercel-ai', 'mastra', 'langchain', 'openai-agents'],
        rules: [
          {
            id: 'ignore_instructions',
            type: 'prompt_injection',
            pattern: /ignore\s+(previous|above|all)\s+instructions/i,
            action: 'block',
            description: 'Ignore instructions pattern',
            enabled: true
          },
          {
            id: 'system_override',
            type: 'prompt_injection',
            pattern: /system\s*:\s*|assistant\s*:\s*|user\s*:\s*/i,
            action: 'warn',
            description: 'System role override attempt',
            enabled: true
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    defaultPolicies.forEach(policy => {
      this.policies.set(policy.id, policy);
    });
  }

  private async checkRule(content: string, rule: SafetyRule, contentType: 'input' | 'output'): Promise<SafetyViolation | null> {
    let matches = false;
    let confidence = 0.9;

    if (typeof rule.pattern === 'string') {
      matches = content.toLowerCase().includes(rule.pattern.toLowerCase());
    } else if (rule.pattern instanceof RegExp) {
      matches = rule.pattern.test(content);
    }

    if (matches) {
      return {
        id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        sessionId: '', // Will be filled by caller
        violationType: this.mapRuleTypeToViolationType(rule.type),
        severity: 'medium', // Will be overridden by policy severity
        content: contentType === 'input' ? { input: content } : { output: content },
        policyId: '', // Will be filled by caller
        ruleId: rule.id,
        action: rule.action === 'block' ? 'blocked' : 'logged',
        framework: '', // Will be filled by caller
        metadata: { confidence, ruleType: rule.type }
      };
    }

    return null;
  }

  private async detectHarmfulContent(content: string): Promise<ContentAnalysisResult> {
    // Implement harmful content detection logic
    const violations: any[] = [];
    
    // Simple keyword-based detection (would be enhanced with ML models)
    const harmfulPatterns = [
      { pattern: /\b(suicide|self-harm|kill yourself)\b/i, severity: 'critical', type: 'self_harm' },
      { pattern: /\b(bomb|explosive|terrorism)\b/i, severity: 'critical', type: 'violence' },
      { pattern: /\b(hack|exploit|vulnerability)\b/i, severity: 'medium', type: 'security' }
    ];

    for (const { pattern, severity, type } of harmfulPatterns) {
      if (pattern.test(content)) {
        violations.push({
          type,
          severity,
          confidence: 0.8,
          ruleId: `harmful_${type}`
        });
      }
    }

    return {
      isSafe: violations.length === 0,
      confidence: 0.8,
      violations,
      suggestedAction: violations.length > 0 ? 'block' : 'allow'
    };
  }

  private async detectDataLeakage(output: string, input?: string): Promise<ContentAnalysisResult> {
    // Detect potential data leakage in output
    const violations: any[] = [];

    // Check for common data patterns
    const dataPatterns = [
      { pattern: /\b\d{3}-\d{2}-\d{4}\b/, type: 'ssn', severity: 'critical' },
      { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, type: 'credit_card', severity: 'critical' },
      { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, type: 'email', severity: 'medium' }
    ];

    for (const { pattern, type, severity } of dataPatterns) {
      if (pattern.test(output)) {
        violations.push({
          type: `data_leakage_${type}`,
          severity,
          confidence: 0.9,
          ruleId: `leakage_${type}`
        });
      }
    }

    return {
      isSafe: violations.length === 0,
      confidence: 0.9,
      violations,
      suggestedAction: violations.length > 0 ? 'modify' : 'allow'
    };
  }

  private async checkCompliance(content: string, framework: string): Promise<ContentAnalysisResult> {
    // Check framework-specific compliance requirements
    const violations: any[] = [];

    // Example compliance checks
    if (content.length > 10000) {
      violations.push({
        type: 'content_length',
        severity: 'low',
        confidence: 1.0,
        ruleId: 'max_length'
      });
    }

    return {
      isSafe: violations.length === 0,
      confidence: 1.0,
      violations,
      suggestedAction: violations.length > 0 ? 'modify' : 'allow'
    };
  }

  private determineSuggestedAction(violations: any[]): 'allow' | 'block' | 'modify' | 'review' {
    if (violations.some(v => v.severity === 'critical')) return 'block';
    if (violations.some(v => v.severity === 'high')) return 'review';
    if (violations.some(v => v.severity === 'medium')) return 'modify';
    return 'allow';
  }

  private sanitizeContent(content: string): string {
    // Basic content sanitization
    return content
      .replace(/\b(kill|murder|harm)\b/gi, '[REDACTED]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN-REDACTED]')
      .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD-REDACTED]');
  }

  private async logViolation(violation: SafetyViolation): Promise<void> {
    await this.memoryCollection.storeDocument(
      JSON.stringify(violation),
      {
        type: 'safety_violation',
        violationType: violation.violationType,
        severity: violation.severity,
        sessionId: violation.sessionId,
        framework: violation.framework,
        policyId: violation.policyId,
        action: violation.action
      }
    );
  }

  private mapRuleTypeToViolationType(ruleType: string): SafetyViolation['violationType'] {
    const mapping: Record<string, SafetyViolation['violationType']> = {
      'content_filter': 'harmful_content',
      'prompt_injection': 'prompt_injection',
      'output_validation': 'policy_violation',
      'rate_limit': 'rate_limit',
      'compliance': 'compliance'
    };
    return mapping[ruleType] || 'policy_violation';
  }

  private arrayToRecord(array: any[]): Record<string, number> {
    const record: Record<string, number> = {};
    array.forEach(item => {
      record[item._id] = item.count;
    });
    return record;
  }

  private parseViolationFromDocument(doc: any): SafetyViolation {
    const violation = JSON.parse(doc.content);
    return {
      ...violation,
      timestamp: new Date(violation.timestamp)
    };
  }
}
