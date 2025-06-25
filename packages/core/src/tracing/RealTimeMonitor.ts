/**
 * @file RealTimeMonitor - Enterprise real-time trace monitoring service
 * 
 * This service provides comprehensive real-time monitoring of agent traces
 * using MongoDB Change Streams, with alerting, metrics aggregation, and
 * dashboard-ready data streams.
 * 
 * Features:
 * - Real-time trace monitoring and alerting
 * - Performance metrics aggregation
 * - Error pattern detection
 * - Cost monitoring and budget alerts
 * - Framework-specific monitoring
 * - WebSocket/SSE ready data streams
 */

import { EventEmitter } from 'events';
import { TracingEngine } from './TracingEngine';
import { ChangeStreamManager, TraceChangeEvent, ChangeStreamSubscriber } from './ChangeStreamManager';
import { TracingCollection, AgentTrace } from '../collections/TracingCollection';
import { TracingUtils } from './index';

export interface MonitoringAlert {
  id: string;
  type: 'performance' | 'error' | 'cost' | 'health' | 'custom';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  traceId?: string;
  agentId?: string;
  sessionId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  timestamp: Date;
  activeTraces: number;
  avgResponseTime: number;
  errorRate: number;
  totalCost: number;
  tokensPerSecond: number;
  frameworkBreakdown: Record<string, number>;
  operationBreakdown: Record<string, number>;
}

export interface MonitoringConfig {
  // Performance thresholds
  maxResponseTime: number; // milliseconds
  maxErrorRate: number; // percentage (0-100)
  maxCostPerHour: number; // USD
  
  // Alerting
  enableAlerts: boolean;
  alertWebhook?: string;
  
  // Metrics collection
  metricsInterval: number; // milliseconds
  retentionPeriod: number; // hours
  
  // Filtering
  monitoredAgents?: string[];
  monitoredFrameworks?: string[];
}

export interface MonitoringSubscriber {
  id: string;
  onAlert?: (alert: MonitoringAlert) => void;
  onMetrics?: (metrics: PerformanceMetrics) => void;
  onTraceUpdate?: (event: TraceChangeEvent) => void;
}

/**
 * RealTimeMonitor - Enterprise real-time trace monitoring service
 * 
 * This service provides comprehensive monitoring capabilities for the
 * Universal AI Brain with real-time alerting and metrics collection.
 */
export class RealTimeMonitor extends EventEmitter {
  private tracingEngine: TracingEngine;
  private changeStreamManager: ChangeStreamManager;
  private tracingCollection: TracingCollection;
  private config: MonitoringConfig;
  private subscribers: Map<string, MonitoringSubscriber> = new Map();
  private metricsHistory: PerformanceMetrics[] = [];
  private metricsInterval?: NodeJS.Timeout;
  private isActive: boolean = false;

  // Real-time counters
  private currentMetrics = {
    tracesStarted: 0,
    tracesCompleted: 0,
    totalErrors: 0,
    totalCost: 0,
    totalTokens: 0,
    lastResetTime: new Date()
  };

  constructor(
    tracingEngine: TracingEngine,
    changeStreamManager: ChangeStreamManager,
    tracingCollection: TracingCollection,
    config: Partial<MonitoringConfig> = {}
  ) {
    super();
    this.tracingEngine = tracingEngine;
    this.changeStreamManager = changeStreamManager;
    this.tracingCollection = tracingCollection;
    
    this.config = {
      maxResponseTime: 30000, // 30 seconds
      maxErrorRate: 5, // 5%
      maxCostPerHour: 10, // $10/hour
      enableAlerts: true,
      metricsInterval: 60000, // 1 minute
      retentionPeriod: 24, // 24 hours
      ...config
    };
  }

  /**
   * Start real-time monitoring
   */
  async start(): Promise<void> {
    if (this.isActive) {
      console.warn('⚠️ RealTimeMonitor is already active');
      return;
    }

    try {
      // Start change stream monitoring
      await this.changeStreamManager.start();
      
      // Subscribe to change events
      this.changeStreamManager.subscribe({
        id: 'real-time-monitor',
        onTraceChange: (event) => this.handleTraceChange(event),
        onError: (error) => this.handleChangeStreamError(error)
      });

      // Start metrics collection
      this.startMetricsCollection();

      this.isActive = true;
      console.log('📊 RealTimeMonitor started successfully');
    } catch (error) {
      console.error('❌ Failed to start RealTimeMonitor:', error);
      throw error;
    }
  }

  /**
   * Stop real-time monitoring
   */
  async stop(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;

    // Stop change stream
    this.changeStreamManager.unsubscribe('real-time-monitor');
    await this.changeStreamManager.stop();

    // Stop metrics collection
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    console.log('📊 RealTimeMonitor stopped');
  }

  /**
   * Subscribe to monitoring events
   */
  subscribe(subscriber: MonitoringSubscriber): void {
    this.subscribers.set(subscriber.id, subscriber);
    console.log(`📡 Monitoring subscriber ${subscriber.id} added`);
  }

  /**
   * Unsubscribe from monitoring events
   */
  unsubscribe(subscriberId: string): void {
    this.subscribers.delete(subscriberId);
    console.log(`📡 Monitoring subscriber ${subscriberId} removed`);
  }

  /**
   * Handle trace change events from change stream
   */
  private handleTraceChange(event: TraceChangeEvent): void {
    try {
      // Update real-time counters
      this.updateCounters(event);

      // Check for alerts
      this.checkAlerts(event);

      // Notify subscribers
      this.notifySubscribers('traceUpdate', event);

      // Emit event
      this.emit('traceChange', event);
    } catch (error) {
      console.error('❌ Error handling trace change:', error);
    }
  }

  /**
   * Update real-time counters based on trace changes
   */
  private updateCounters(event: TraceChangeEvent): void {
    if (!event.fullDocument) return;

    const trace = event.fullDocument;

    if (event.operationType === 'insert') {
      this.currentMetrics.tracesStarted++;
    } else if (event.operationType === 'update' && trace.status === 'completed') {
      this.currentMetrics.tracesCompleted++;
      this.currentMetrics.totalCost += trace.cost.totalCost;
      this.currentMetrics.totalTokens += trace.tokensUsed.totalTokens;
      this.currentMetrics.totalErrors += trace.errors.length;
    }
  }

  /**
   * Check for alert conditions
   */
  private checkAlerts(event: TraceChangeEvent): void {
    if (!this.config.enableAlerts || !event.fullDocument) return;

    const trace = event.fullDocument;
    const alerts: MonitoringAlert[] = [];

    // Performance alerts
    if (trace.performance.totalDuration > this.config.maxResponseTime) {
      alerts.push({
        id: `perf-${trace.traceId}`,
        type: 'performance',
        severity: trace.performance.totalDuration > this.config.maxResponseTime * 2 ? 'critical' : 'high',
        title: 'Slow Response Time',
        message: `Trace ${trace.traceId} took ${TracingUtils.formatDuration(trace.performance.totalDuration)}`,
        traceId: trace.traceId,
        agentId: trace.agentId.toString(),
        sessionId: trace.sessionId,
        timestamp: new Date(),
        metadata: { duration: trace.performance.totalDuration }
      });
    }

    // Error alerts
    if (trace.errors.length > 0) {
      const criticalErrors = trace.errors.filter(e => !e.recoverable);
      if (criticalErrors.length > 0) {
        alerts.push({
          id: `error-${trace.traceId}`,
          type: 'error',
          severity: 'critical',
          title: 'Critical Error Detected',
          message: `Trace ${trace.traceId} has ${criticalErrors.length} critical error(s)`,
          traceId: trace.traceId,
          agentId: trace.agentId.toString(),
          sessionId: trace.sessionId,
          timestamp: new Date(),
          metadata: { errors: criticalErrors }
        });
      }
    }

    // Cost alerts
    if (trace.cost.totalCost > this.config.maxCostPerHour / 3600) { // Per-operation cost threshold
      alerts.push({
        id: `cost-${trace.traceId}`,
        type: 'cost',
        severity: 'medium',
        title: 'High Cost Operation',
        message: `Trace ${trace.traceId} cost ${TracingUtils.formatCost(trace.cost.totalCost)}`,
        traceId: trace.traceId,
        agentId: trace.agentId.toString(),
        sessionId: trace.sessionId,
        timestamp: new Date(),
        metadata: { cost: trace.cost.totalCost }
      });
    }

    // Health alerts
    const health = TracingUtils.calculateTraceHealth(trace);
    if (health.score < 50) {
      alerts.push({
        id: `health-${trace.traceId}`,
        type: 'health',
        severity: health.score < 25 ? 'high' : 'medium',
        title: 'Poor Trace Health',
        message: `Trace ${trace.traceId} has health score of ${health.score}%`,
        traceId: trace.traceId,
        agentId: trace.agentId.toString(),
        sessionId: trace.sessionId,
        timestamp: new Date(),
        metadata: { healthScore: health.score, factors: health.factors }
      });
    }

    // Send alerts
    alerts.forEach(alert => this.sendAlert(alert));
  }

  /**
   * Send an alert to subscribers and external systems
   */
  private sendAlert(alert: MonitoringAlert): void {
    console.log(`🚨 Alert: ${alert.severity.toUpperCase()} - ${alert.title}`);

    // Notify subscribers
    this.notifySubscribers('alert', alert);

    // Emit event
    this.emit('alert', alert);

    // Send to webhook if configured
    if (this.config.alertWebhook) {
      this.sendWebhookAlert(alert).catch(error => {
        console.error('❌ Failed to send webhook alert:', error);
      });
    }
  }

  /**
   * Send alert to webhook
   */
  private async sendWebhookAlert(alert: MonitoringAlert): Promise<void> {
    if (!this.config.alertWebhook) return;

    try {
      const response = await fetch(this.config.alertWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(alert)
      });

      if (!response.ok) {
        throw new Error(`Webhook responded with status ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Webhook alert failed:', error);
    }
  }

  /**
   * Start periodic metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.collectMetrics().catch(error => {
        console.error('❌ Error collecting metrics:', error);
      });
    }, this.config.metricsInterval);

    // Collect initial metrics
    this.collectMetrics().catch(error => {
      console.error('❌ Error collecting initial metrics:', error);
    });
  }

  /**
   * Collect current performance metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const now = new Date();
      const activeTraces = this.tracingEngine.getActiveTraces();
      
      // Calculate error rate
      const totalTraces = this.currentMetrics.tracesCompleted || 1;
      const errorRate = (this.currentMetrics.totalErrors / totalTraces) * 100;

      // Calculate average response time (from active traces)
      const avgResponseTime = activeTraces.length > 0
        ? activeTraces.reduce((sum, trace) => sum + trace.duration, 0) / activeTraces.length
        : 0;

      // Calculate tokens per second
      const timeSinceReset = (now.getTime() - this.currentMetrics.lastResetTime.getTime()) / 1000;
      const tokensPerSecond = timeSinceReset > 0 ? this.currentMetrics.totalTokens / timeSinceReset : 0;

      // Get framework and operation breakdowns
      const frameworkBreakdown = await this.getFrameworkBreakdown();
      const operationBreakdown = await this.getOperationBreakdown();

      const metrics: PerformanceMetrics = {
        timestamp: now,
        activeTraces: activeTraces.length,
        avgResponseTime,
        errorRate,
        totalCost: this.currentMetrics.totalCost,
        tokensPerSecond,
        frameworkBreakdown,
        operationBreakdown
      };

      // Store metrics
      this.metricsHistory.push(metrics);

      // Clean up old metrics
      const cutoffTime = new Date(now.getTime() - this.config.retentionPeriod * 60 * 60 * 1000);
      this.metricsHistory = this.metricsHistory.filter(m => m.timestamp > cutoffTime);

      // Notify subscribers
      this.notifySubscribers('metrics', metrics);

      // Emit event
      this.emit('metrics', metrics);

      // Reset counters periodically (every hour)
      if (timeSinceReset > 3600) {
        this.resetCounters();
      }
    } catch (error) {
      console.error('❌ Error collecting metrics:', error);
    }
  }

  /**
   * Get framework usage breakdown
   */
  private async getFrameworkBreakdown(): Promise<Record<string, number>> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const pipeline = [
      {
        $match: {
          startTime: { $gte: oneHourAgo },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$framework.frameworkName',
          count: { $sum: 1 }
        }
      }
    ];

    const results = await this.tracingCollection.aggregate(pipeline);
    const breakdown: Record<string, number> = {};
    
    results.forEach(result => {
      breakdown[result._id] = result.count;
    });

    return breakdown;
  }

  /**
   * Get operation type breakdown
   */
  private async getOperationBreakdown(): Promise<Record<string, number>> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const pipeline = [
      {
        $match: {
          startTime: { $gte: oneHourAgo },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$operation.type',
          count: { $sum: 1 }
        }
      }
    ];

    const results = await this.tracingCollection.aggregate(pipeline);
    const breakdown: Record<string, number> = {};
    
    results.forEach(result => {
      breakdown[result._id] = result.count;
    });

    return breakdown;
  }

  /**
   * Reset performance counters
   */
  private resetCounters(): void {
    this.currentMetrics = {
      tracesStarted: 0,
      tracesCompleted: 0,
      totalErrors: 0,
      totalCost: 0,
      totalTokens: 0,
      lastResetTime: new Date()
    };
  }

  /**
   * Handle change stream errors
   */
  private handleChangeStreamError(error: Error): void {
    console.error('❌ Change stream error in monitor:', error);
    
    const alert: MonitoringAlert = {
      id: `system-error-${Date.now()}`,
      type: 'error',
      severity: 'critical',
      title: 'Monitoring System Error',
      message: `Change stream error: ${error.message}`,
      timestamp: new Date(),
      metadata: { error: error.message }
    };

    this.sendAlert(alert);
  }

  /**
   * Notify all subscribers of an event
   */
  private notifySubscribers(eventType: 'alert' | 'metrics' | 'traceUpdate', data: any): void {
    for (const subscriber of this.subscribers.values()) {
      try {
        switch (eventType) {
          case 'alert':
            if (subscriber.onAlert) {
              subscriber.onAlert(data);
            }
            break;
          case 'metrics':
            if (subscriber.onMetrics) {
              subscriber.onMetrics(data);
            }
            break;
          case 'traceUpdate':
            if (subscriber.onTraceUpdate) {
              subscriber.onTraceUpdate(data);
            }
            break;
        }
      } catch (error) {
        console.error(`❌ Error notifying subscriber ${subscriber.id}:`, error);
      }
    }
  }

  /**
   * Get current monitoring statistics
   */
  getStats(): {
    isActive: boolean;
    subscriberCount: number;
    metricsHistoryCount: number;
    currentMetrics: typeof this.currentMetrics;
    changeStreamStats: any;
  } {
    return {
      isActive: this.isActive,
      subscriberCount: this.subscribers.size,
      metricsHistoryCount: this.metricsHistory.length,
      currentMetrics: { ...this.currentMetrics },
      changeStreamStats: this.changeStreamManager.getStats()
    };
  }

  /**
   * Get recent metrics history
   */
  getMetricsHistory(hours: number = 1): PerformanceMetrics[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metricsHistory.filter(m => m.timestamp > cutoffTime);
  }
}
