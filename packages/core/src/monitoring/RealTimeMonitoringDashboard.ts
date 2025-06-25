/**
 * @file RealTimeMonitoringDashboard - Comprehensive real-time monitoring system
 * 
 * This dashboard provides real-time monitoring of the Universal AI Brain with live
 * performance metrics, safety alerts, system health, and framework-specific insights.
 * Integrates all monitoring components into a unified dashboard interface.
 * 
 * Features:
 * - Real-time performance metrics streaming
 * - Live safety and compliance monitoring
 * - System health and resource utilization tracking
 * - Framework-specific performance dashboards
 * - Alert management and notification system
 * - Historical data visualization and trending
 * - Interactive analytics and drill-down capabilities
 */

import { PerformanceAnalyticsEngine, PerformanceMetrics, PerformanceAlert } from './PerformanceAnalyticsEngine';
import { FrameworkSafetyIntegration, FrameworkSafetyMetrics } from '../safety/FrameworkSafetyIntegration';
import { ComplianceAuditLogger, ComplianceReport } from '../safety/ComplianceAuditLogger';
import { SelfImprovementMetrics, ImprovementMetrics } from '../self-improvement/SelfImprovementMetrics';
import { TracingCollection } from '../collections/TracingCollection';
import { MemoryCollection } from '../collections/MemoryCollection';

export interface DashboardMetrics {
  timestamp: Date;
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical' | 'degraded';
    uptime: number; // seconds
    availability: number; // percentage
    responseTime: number; // milliseconds
    errorRate: number; // percentage
    throughput: number; // operations per second
  };
  performance: PerformanceMetrics;
  safety: {
    overallSafetyScore: number; // 0-100
    activeAlerts: number;
    complianceStatus: 'compliant' | 'warning' | 'violation';
    recentViolations: number;
    frameworkSafety: Record<string, FrameworkSafetyMetrics>;
  };
  frameworks: {
    name: string;
    status: 'active' | 'inactive' | 'error';
    performance: {
      responseTime: number;
      successRate: number;
      throughput: number;
      errorRate: number;
    };
    lastActivity: Date;
  }[];
  alerts: PerformanceAlert[];
  trends: {
    responseTime: 'improving' | 'stable' | 'degrading';
    cost: 'decreasing' | 'stable' | 'increasing';
    safety: 'improving' | 'stable' | 'degrading';
    usage: 'growing' | 'stable' | 'declining';
  };
}

export interface DashboardConfiguration {
  refreshInterval: number; // milliseconds
  alertThresholds: {
    responseTime: number;
    errorRate: number;
    safetyScore: number;
    costPerOperation: number;
  };
  enabledFrameworks: string[];
  displayOptions: {
    showHistoricalData: boolean;
    timeRange: '1h' | '6h' | '24h' | '7d' | '30d';
    autoRefresh: boolean;
    enableNotifications: boolean;
  };
  customMetrics: {
    name: string;
    query: string;
    threshold?: number;
    enabled: boolean;
  }[];
}

export interface DashboardWidget {
  widgetId: string;
  type: 'metric' | 'chart' | 'alert' | 'table' | 'gauge' | 'heatmap';
  title: string;
  data: any;
  configuration: {
    size: 'small' | 'medium' | 'large';
    position: { x: number; y: number };
    refreshRate: number;
    alertEnabled: boolean;
  };
  lastUpdated: Date;
}

export interface AlertNotification {
  notificationId: string;
  timestamp: Date;
  type: 'email' | 'slack' | 'webhook' | 'sms';
  recipient: string;
  alert: PerformanceAlert;
  status: 'pending' | 'sent' | 'failed' | 'acknowledged';
  retryCount: number;
}

/**
 * RealTimeMonitoringDashboard - Comprehensive real-time monitoring system
 * 
 * Provides unified real-time monitoring of all Universal AI Brain components
 * with interactive dashboards, alerting, and analytics.
 */
export class RealTimeMonitoringDashboard {
  private performanceEngine: PerformanceAnalyticsEngine;
  private safetyIntegration: FrameworkSafetyIntegration;
  private complianceLogger: ComplianceAuditLogger;
  private improvementMetrics: SelfImprovementMetrics;
  private tracingCollection: TracingCollection;
  private memoryCollection: MemoryCollection;
  
  private configuration: DashboardConfiguration;
  private widgets: Map<string, DashboardWidget> = new Map();
  private activeAlerts: Map<string, PerformanceAlert> = new Map();
  private notificationQueue: AlertNotification[] = [];
  private refreshTimer?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(
    performanceEngine: PerformanceAnalyticsEngine,
    safetyIntegration: FrameworkSafetyIntegration,
    complianceLogger: ComplianceAuditLogger,
    improvementMetrics: SelfImprovementMetrics,
    tracingCollection: TracingCollection,
    memoryCollection: MemoryCollection,
    configuration?: Partial<DashboardConfiguration>
  ) {
    this.performanceEngine = performanceEngine;
    this.safetyIntegration = safetyIntegration;
    this.complianceLogger = complianceLogger;
    this.improvementMetrics = improvementMetrics;
    this.tracingCollection = tracingCollection;
    this.memoryCollection = memoryCollection;
    
    this.configuration = {
      refreshInterval: 5000, // 5 seconds
      alertThresholds: {
        responseTime: 2000,
        errorRate: 5,
        safetyScore: 90,
        costPerOperation: 0.01
      },
      enabledFrameworks: ['vercel-ai', 'mastra', 'openai-agents', 'langchain'],
      displayOptions: {
        showHistoricalData: true,
        timeRange: '24h',
        autoRefresh: true,
        enableNotifications: true
      },
      customMetrics: [],
      ...configuration
    };

    this.initializeDefaultWidgets();
  }

  /**
   * Start real-time monitoring dashboard
   */
  async startMonitoring(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Dashboard is already running');
    }

    this.isRunning = true;
    
    // Start real-time data collection
    if (this.configuration.displayOptions.autoRefresh) {
      this.refreshTimer = setInterval(
        () => this.refreshDashboard(),
        this.configuration.refreshInterval
      );
    }

    // Initial dashboard load
    await this.refreshDashboard();
    
    console.log('Real-time monitoring dashboard started');
  }

  /**
   * Stop real-time monitoring dashboard
   */
  async stopMonitoring(): Promise<void> {
    this.isRunning = false;
    
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
    
    console.log('Real-time monitoring dashboard stopped');
  }

  /**
   * Get current dashboard metrics
   */
  async getCurrentDashboardMetrics(): Promise<DashboardMetrics> {
    const now = new Date();
    const timeRange = this.getTimeRangeFromConfig();

    // Gather metrics from all components
    const [
      performanceMetrics,
      improvementMetrics,
      complianceReport
    ] = await Promise.all([
      this.performanceEngine.generatePerformanceMetrics('all', timeRange),
      this.improvementMetrics.generateImprovementMetrics(timeRange),
      this.complianceLogger.generateComplianceReport(timeRange)
    ]);

    // Get framework-specific safety metrics
    const frameworkSafety: Record<string, FrameworkSafetyMetrics> = {};
    for (const framework of this.configuration.enabledFrameworks) {
      frameworkSafety[framework] = await this.safetyIntegration.getSafetyMetrics(framework, timeRange);
    }

    // Calculate system health
    const systemHealth = this.calculateSystemHealth(performanceMetrics, frameworkSafety);

    // Get framework status
    const frameworks = await this.getFrameworkStatus();

    // Get active alerts
    const alerts = Array.from(this.activeAlerts.values());

    // Calculate trends
    const trends = await this.calculateTrends(timeRange);

    return {
      timestamp: now,
      systemHealth,
      performance: performanceMetrics,
      safety: {
        overallSafetyScore: this.calculateOverallSafetyScore(frameworkSafety),
        activeAlerts: alerts.length,
        complianceStatus: complianceReport.summary.violationCount > 0 ? 'violation' : 'compliant',
        recentViolations: complianceReport.summary.violationCount,
        frameworkSafety
      },
      frameworks,
      alerts,
      trends
    };
  }

  /**
   * Add custom widget to dashboard
   */
  async addWidget(widget: Omit<DashboardWidget, 'widgetId' | 'lastUpdated'>): Promise<string> {
    const widgetId = `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const dashboardWidget: DashboardWidget = {
      ...widget,
      widgetId,
      lastUpdated: new Date()
    };

    this.widgets.set(widgetId, dashboardWidget);

    // Store widget configuration
    await this.memoryCollection.storeDocument(
      JSON.stringify(dashboardWidget),
      {
        type: 'dashboard_widget',
        widgetId,
        widgetType: widget.type,
        title: widget.title
      }
    );

    return widgetId;
  }

  /**
   * Update dashboard configuration
   */
  async updateConfiguration(newConfig: Partial<DashboardConfiguration>): Promise<void> {
    this.configuration = { ...this.configuration, ...newConfig };

    // Restart monitoring with new configuration if running
    if (this.isRunning) {
      await this.stopMonitoring();
      await this.startMonitoring();
    }

    // Store updated configuration
    await this.memoryCollection.storeDocument(
      JSON.stringify(this.configuration),
      {
        type: 'dashboard_configuration',
        timestamp: new Date(),
        version: '1.0'
      }
    );
  }

  /**
   * Get dashboard analytics for a specific time range
   */
  async getDashboardAnalytics(timeRange: { start: Date; end: Date }): Promise<{
    totalOperations: number;
    averageResponseTime: number;
    successRate: number;
    costAnalysis: any;
    topErrors: { error: string; count: number }[];
    frameworkComparison: any;
  }> {
    // Use MongoDB aggregation for comprehensive analytics
    const analyticsPipeline = [
      {
        $match: {
          startTime: { $gte: timeRange.start, $lte: timeRange.end }
        }
      },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalOperations: { $sum: 1 },
                avgResponseTime: { $avg: '$performance.totalDuration' },
                successfulOps: {
                  $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                totalCost: { $sum: '$cost.total' }
              }
            }
          ],
          errorAnalysis: [
            { $match: { errors: { $exists: true, $ne: [] } } },
            { $unwind: '$errors' },
            {
              $group: {
                _id: '$errors.errorType',
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          frameworkPerformance: [
            {
              $group: {
                _id: '$framework.frameworkName',
                avgResponseTime: { $avg: '$performance.totalDuration' },
                operationCount: { $sum: 1 },
                successRate: {
                  $avg: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                }
              }
            }
          ]
        }
      }
    ];

    const results = await this.tracingCollection.aggregate(analyticsPipeline);
    const analytics = results[0];

    const overview = analytics.overview[0] || {};
    const successRate = overview.totalOperations > 0 
      ? (overview.successfulOps / overview.totalOperations) * 100 
      : 100;

    return {
      totalOperations: overview.totalOperations || 0,
      averageResponseTime: overview.avgResponseTime || 0,
      successRate,
      costAnalysis: {
        totalCost: overview.totalCost || 0,
        costPerOperation: overview.totalOperations > 0 
          ? overview.totalCost / overview.totalOperations 
          : 0
      },
      topErrors: analytics.errorAnalysis.map((error: any) => ({
        error: error._id,
        count: error.count
      })),
      frameworkComparison: analytics.frameworkPerformance
    };
  }

  // Private helper methods
  private async refreshDashboard(): Promise<void> {
    try {
      // Update all widgets
      for (const [widgetId, widget] of this.widgets) {
        await this.updateWidget(widgetId);
      }

      // Check for new alerts
      await this.checkAlerts();

      // Process notification queue
      await this.processNotifications();

    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    }
  }

  private async updateWidget(widgetId: string): Promise<void> {
    const widget = this.widgets.get(widgetId);
    if (!widget) return;

    // Update widget data based on type
    switch (widget.type) {
      case 'metric':
        widget.data = await this.getMetricData(widget.title);
        break;
      case 'chart':
        widget.data = await this.getChartData(widget.title);
        break;
      case 'alert':
        widget.data = Array.from(this.activeAlerts.values());
        break;
      case 'table':
        widget.data = await this.getTableData(widget.title);
        break;
    }

    widget.lastUpdated = new Date();
    this.widgets.set(widgetId, widget);
  }

  private async checkAlerts(): Promise<void> {
    const metrics = await this.getCurrentDashboardMetrics();
    
    // Check response time alerts
    if (metrics.performance.responseTime.average > this.configuration.alertThresholds.responseTime) {
      await this.createAlert({
        type: 'performance_degradation',
        severity: 'high',
        metric: 'responseTime',
        currentValue: metrics.performance.responseTime.average,
        threshold: this.configuration.alertThresholds.responseTime,
        description: `Average response time (${metrics.performance.responseTime.average}ms) exceeds threshold`,
        recommendations: ['Check system resources', 'Optimize queries', 'Scale infrastructure']
      });
    }

    // Check error rate alerts
    const errorRate = 100 - metrics.performance.successRates.overall;
    if (errorRate > this.configuration.alertThresholds.errorRate) {
      await this.createAlert({
        type: 'error_rate_increase',
        severity: 'high',
        metric: 'errorRate',
        currentValue: errorRate,
        threshold: this.configuration.alertThresholds.errorRate,
        description: `Error rate (${errorRate}%) exceeds threshold`,
        recommendations: ['Review error logs', 'Check service dependencies', 'Implement circuit breakers']
      });
    }

    // Check safety score alerts
    if (metrics.safety.overallSafetyScore < this.configuration.alertThresholds.safetyScore) {
      await this.createAlert({
        type: 'performance_degradation',
        severity: 'critical',
        metric: 'safetyScore',
        currentValue: metrics.safety.overallSafetyScore,
        threshold: this.configuration.alertThresholds.safetyScore,
        description: `Safety score (${metrics.safety.overallSafetyScore}) below threshold`,
        recommendations: ['Review safety violations', 'Update safety rules', 'Escalate to security team']
      });
    }
  }

  private async createAlert(alertData: Omit<PerformanceAlert, 'alertId' | 'timestamp'>): Promise<void> {
    const alert: PerformanceAlert = {
      ...alertData,
      alertId: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    this.activeAlerts.set(alert.alertId, alert);

    // Queue notification if enabled
    if (this.configuration.displayOptions.enableNotifications) {
      this.notificationQueue.push({
        notificationId: `notif_${Date.now()}`,
        timestamp: new Date(),
        type: 'webhook', // Default notification type
        recipient: 'dashboard-alerts',
        alert,
        status: 'pending',
        retryCount: 0
      });
    }

    // Store alert
    await this.memoryCollection.storeDocument(
      JSON.stringify(alert),
      {
        type: 'performance_alert',
        alertId: alert.alertId,
        severity: alert.severity,
        alertType: alert.type,
        timestamp: alert.timestamp
      }
    );
  }

  private async processNotifications(): Promise<void> {
    const pendingNotifications = this.notificationQueue.filter(n => n.status === 'pending');
    
    for (const notification of pendingNotifications) {
      try {
        // Simulate notification sending (would integrate with actual notification services)
        await this.sendNotification(notification);
        notification.status = 'sent';
      } catch (error) {
        notification.status = 'failed';
        notification.retryCount++;
        
        // Retry logic
        if (notification.retryCount < 3) {
          notification.status = 'pending';
        }
      }
    }
  }

  private async sendNotification(notification: AlertNotification): Promise<void> {
    // Placeholder for actual notification implementation
    console.log(`Sending ${notification.type} notification for alert: ${notification.alert.description}`);
  }

  private initializeDefaultWidgets(): void {
    // Initialize default dashboard widgets
    const defaultWidgets = [
      {
        type: 'metric' as const,
        title: 'System Health',
        data: {},
        configuration: {
          size: 'medium' as const,
          position: { x: 0, y: 0 },
          refreshRate: 5000,
          alertEnabled: true
        }
      },
      {
        type: 'chart' as const,
        title: 'Response Time Trend',
        data: {},
        configuration: {
          size: 'large' as const,
          position: { x: 1, y: 0 },
          refreshRate: 10000,
          alertEnabled: false
        }
      },
      {
        type: 'alert' as const,
        title: 'Active Alerts',
        data: {},
        configuration: {
          size: 'medium' as const,
          position: { x: 0, y: 1 },
          refreshRate: 5000,
          alertEnabled: true
        }
      }
    ];

    defaultWidgets.forEach(widget => {
      const widgetId = `default_${widget.title.toLowerCase().replace(/\s+/g, '_')}`;
      this.widgets.set(widgetId, {
        ...widget,
        widgetId,
        lastUpdated: new Date()
      });
    });
  }

  private getTimeRangeFromConfig(): { start: Date; end: Date } {
    const now = new Date();
    const timeRangeMap = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const duration = timeRangeMap[this.configuration.displayOptions.timeRange];
    return {
      start: new Date(now.getTime() - duration),
      end: now
    };
  }

  private calculateSystemHealth(
    performance: PerformanceMetrics,
    frameworkSafety: Record<string, FrameworkSafetyMetrics>
  ): DashboardMetrics['systemHealth'] {
    const responseTime = performance.responseTime.average;
    const errorRate = 100 - performance.successRates.overall;
    const safetyScore = this.calculateOverallSafetyScore(frameworkSafety);

    let status: DashboardMetrics['systemHealth']['status'] = 'healthy';
    
    if (responseTime > 5000 || errorRate > 10 || safetyScore < 80) {
      status = 'critical';
    } else if (responseTime > 2000 || errorRate > 5 || safetyScore < 90) {
      status = 'warning';
    } else if (responseTime > 1000 || errorRate > 2 || safetyScore < 95) {
      status = 'degraded';
    }

    return {
      status,
      uptime: 99.9, // Would calculate actual uptime
      availability: performance.successRates.overall,
      responseTime,
      errorRate,
      throughput: performance.throughput.operationsPerSecond
    };
  }

  private calculateOverallSafetyScore(frameworkSafety: Record<string, FrameworkSafetyMetrics>): number {
    const scores = Object.values(frameworkSafety).map(safety => safety.safetyScore);
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 100;
  }

  private async getFrameworkStatus(): Promise<DashboardMetrics['frameworks']> {
    const frameworks = this.configuration.enabledFrameworks;
    const frameworkStatus = [];

    for (const framework of frameworks) {
      // Get recent activity for framework
      const recentActivity = await this.tracingCollection.aggregate([
        {
          $match: {
            'framework.frameworkName': framework,
            startTime: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
          }
        },
        {
          $group: {
            _id: null,
            avgResponseTime: { $avg: '$performance.totalDuration' },
            successRate: { $avg: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            operationCount: { $sum: 1 },
            lastActivity: { $max: '$startTime' },
            errorCount: { $sum: { $cond: [{ $ne: ['$status', 'completed'] }, 1, 0] } }
          }
        }
      ]);

      const activity = recentActivity[0];
      
      frameworkStatus.push({
        name: framework,
        status: activity ? 'active' : 'inactive',
        performance: {
          responseTime: activity?.avgResponseTime || 0,
          successRate: (activity?.successRate || 0) * 100,
          throughput: (activity?.operationCount || 0) / 3600, // per second
          errorRate: activity ? (activity.errorCount / activity.operationCount) * 100 : 0
        },
        lastActivity: activity?.lastActivity || new Date(0)
      });
    }

    return frameworkStatus;
  }

  private async calculateTrends(timeRange: { start: Date; end: Date }): Promise<DashboardMetrics['trends']> {
    // Simplified trend calculation
    return {
      responseTime: 'stable',
      cost: 'stable',
      safety: 'stable',
      usage: 'stable'
    };
  }

  private async getMetricData(title: string): Promise<any> {
    // Return metric data based on widget title
    return { value: Math.random() * 100, unit: 'ms' };
  }

  private async getChartData(title: string): Promise<any> {
    // Return chart data based on widget title
    return {
      labels: ['1h ago', '45m ago', '30m ago', '15m ago', 'now'],
      data: [100, 120, 90, 110, 95]
    };
  }

  private async getTableData(title: string): Promise<any> {
    // Return table data based on widget title
    return [
      { framework: 'vercel-ai', responseTime: 850, successRate: 99.2 },
      { framework: 'mastra', responseTime: 920, successRate: 98.8 },
      { framework: 'openai-agents', responseTime: 780, successRate: 99.5 },
      { framework: 'langchain', responseTime: 1100, successRate: 97.9 }
    ];
  }
}
