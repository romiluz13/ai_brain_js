/**
 * Dashboard API - Real-time Data Provider
 * 
 * This API provides real-time data for the AI Brain Dashboard,
 * aggregating statistics from all collections and systems.
 */

import { Db } from 'mongodb';
import { UniversalAIBrain } from '../../../core/src/UniversalAIBrain';

export interface DashboardStats {
  memory: {
    totalMemories: number;
    memoryTypes: Record<string, number>;
    averageImportance: number;
    workingMemories: number;
    expiredMemories: number;
  };
  performance: {
    averageResponseTime: number;
    successRate: number;
    totalInteractions: number;
    costMetrics: {
      llmCosts: number;
      embeddingCosts: number;
      totalCosts: number;
    };
  };
  safety: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    riskLevels: Record<string, number>;
    recentAlerts: Array<{
      timestamp: Date;
      type: string;
      severity: string;
      message: string;
    }>;
  };
  agents: {
    activeAgents: number;
    activeSessions: number;
    frameworks: Record<string, number>;
    coordination: Array<{
      sessionId: string;
      agentCount: number;
      lastActivity: Date;
    }>;
  };
  workflows: {
    activeWorkflows: number;
    completedWorkflows: number;
    failedWorkflows: number;
    averageDuration: number;
  };
}

export class DashboardAPI {
  private db: Db;
  private brain: UniversalAIBrain;

  constructor(db: Db, brain: UniversalAIBrain) {
    this.db = db;
    this.brain = brain;
  }

  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const [
      memoryStats,
      performanceStats,
      safetyStats,
      agentStats,
      workflowStats
    ] = await Promise.all([
      this.getMemoryStats(),
      this.getPerformanceStats(),
      this.getSafetyStats(),
      this.getAgentStats(),
      this.getWorkflowStats()
    ]);

    return {
      memory: memoryStats,
      performance: performanceStats,
      safety: safetyStats,
      agents: agentStats,
      workflows: workflowStats
    };
  }

  /**
   * Get memory statistics
   */
  private async getMemoryStats() {
    const memoryCollection = this.db.collection('agent_memory');
    const workingMemoryCollection = this.db.collection('working_memory');

    // Total memories
    const totalMemories = await memoryCollection.countDocuments();

    // Memory types distribution
    const typeAggregation = await memoryCollection.aggregate([
      {
        $group: {
          _id: '$metadata.type',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const memoryTypes: Record<string, number> = {};
    typeAggregation.forEach(item => {
      memoryTypes[item._id || 'unknown'] = item.count;
    });

    // Average importance
    const importanceAggregation = await memoryCollection.aggregate([
      {
        $group: {
          _id: null,
          avgImportance: { $avg: '$metadata.importance' }
        }
      }
    ]).toArray();

    const averageImportance = importanceAggregation[0]?.avgImportance || 0;

    // Working memories
    const workingMemories = await workingMemoryCollection.countDocuments({
      expires: { $gt: new Date() }
    });

    // Expired memories
    const expiredMemories = await workingMemoryCollection.countDocuments({
      expires: { $lt: new Date() }
    });

    return {
      totalMemories,
      memoryTypes,
      averageImportance,
      workingMemories,
      expiredMemories
    };
  }

  /**
   * Get performance statistics
   */
  private async getPerformanceStats() {
    const metricsCollection = this.db.collection('agent_metrics');
    const tracesCollection = this.db.collection('agent_traces');

    // Get recent metrics (last 24 hours)
    const recentMetrics = await metricsCollection.find({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).toArray();

    let averageResponseTime = 1250; // Default
    let totalInteractions = 0;
    let totalCosts = 0;
    let llmCosts = 0;
    let embeddingCosts = 0;

    if (recentMetrics.length > 0) {
      const responseTimes = recentMetrics.map(m => m.metrics?.responseTime?.average || 1250);
      averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;

      totalCosts = recentMetrics.reduce((sum, m) => sum + (m.metrics?.costs?.totalCosts || 0), 0);
      llmCosts = recentMetrics.reduce((sum, m) => sum + (m.metrics?.costs?.llmCosts || 0), 0);
      embeddingCosts = recentMetrics.reduce((sum, m) => sum + (m.metrics?.costs?.embeddingCosts || 0), 0);
    }

    // Get success rate from traces
    const recentTraces = await tracesCollection.find({
      'interaction.timestamp': { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).toArray();

    totalInteractions = recentTraces.length;
    const successfulInteractions = recentTraces.filter(trace => trace.interaction?.success).length;
    const successRate = totalInteractions > 0 ? successfulInteractions / totalInteractions : 0.95;

    return {
      averageResponseTime: Math.round(averageResponseTime),
      successRate,
      totalInteractions,
      costMetrics: {
        llmCosts,
        embeddingCosts,
        totalCosts
      }
    };
  }

  /**
   * Get safety statistics
   */
  private async getSafetyStats() {
    const safetyCollection = this.db.collection('agent_safety_logs');

    // Total safety checks (last 24 hours)
    const recentSafetyLogs = await safetyCollection.find({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).toArray();

    const totalChecks = recentSafetyLogs.length;
    const passedChecks = recentSafetyLogs.filter(log => log.safetyCheck?.success).length;
    const failedChecks = totalChecks - passedChecks;

    // Risk levels distribution
    const riskLevels: Record<string, number> = {};
    recentSafetyLogs.forEach(log => {
      const riskLevel = log.metadata?.riskLevel || 'unknown';
      riskLevels[riskLevel] = (riskLevels[riskLevel] || 0) + 1;
    });

    // Recent alerts (failed safety checks)
    const recentAlerts = recentSafetyLogs
      .filter(log => !log.safetyCheck?.success)
      .slice(0, 10)
      .map(log => ({
        timestamp: log.timestamp,
        type: log.safetyCheck?.type || 'unknown',
        severity: log.metadata?.riskLevel || 'medium',
        message: `${log.safetyCheck?.type} detected: ${log.safetyCheck?.detected?.join(', ') || 'unknown'}`
      }));

    return {
      totalChecks,
      passedChecks,
      failedChecks,
      riskLevels,
      recentAlerts
    };
  }

  /**
   * Get agent statistics
   */
  private async getAgentStats() {
    const contextCollection = this.db.collection('agent_context');
    const tracesCollection = this.db.collection('agent_traces');

    // Active sessions (last hour)
    const activeSessions = await contextCollection.distinct('sessionId', {
      'metadata.lastUsed': { $gte: new Date(Date.now() - 60 * 60 * 1000) }
    });

    // Active agents (last hour)
    const activeAgents = await tracesCollection.distinct('agentId', {
      'interaction.timestamp': { $gte: new Date(Date.now() - 60 * 60 * 1000) }
    });

    // Framework distribution
    const frameworkAggregation = await tracesCollection.aggregate([
      {
        $match: {
          'interaction.timestamp': { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: '$framework',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const frameworks: Record<string, number> = {};
    frameworkAggregation.forEach(item => {
      frameworks[item._id || 'unknown'] = item.count;
    });

    // Mock coordination data (would come from ChangeStreamManager in real implementation)
    const coordination = activeSessions.slice(0, 5).map(sessionId => ({
      sessionId,
      agentCount: Math.floor(Math.random() * 3) + 1,
      lastActivity: new Date(Date.now() - Math.random() * 60 * 60 * 1000)
    }));

    return {
      activeAgents: activeAgents.length,
      activeSessions: activeSessions.length,
      frameworks,
      coordination
    };
  }

  /**
   * Get workflow statistics
   */
  private async getWorkflowStats() {
    const workflowCollection = this.db.collection('agent_workflows');

    // Workflow status counts
    const statusAggregation = await workflowCollection.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    let activeWorkflows = 0;
    let completedWorkflows = 0;
    let failedWorkflows = 0;

    statusAggregation.forEach(item => {
      switch (item._id) {
        case 'running':
          activeWorkflows = item.count;
          break;
        case 'completed':
          completedWorkflows = item.count;
          break;
        case 'failed':
          failedWorkflows = item.count;
          break;
      }
    });

    // Average duration for completed workflows
    const completedWorkflowsWithDuration = await workflowCollection.find({
      status: 'completed',
      endTime: { $exists: true },
      startTime: { $exists: true }
    }).toArray();

    let averageDuration = 0;
    if (completedWorkflowsWithDuration.length > 0) {
      const totalDuration = completedWorkflowsWithDuration.reduce((sum, workflow) => {
        const duration = new Date(workflow.endTime).getTime() - new Date(workflow.startTime).getTime();
        return sum + duration;
      }, 0);
      averageDuration = Math.round(totalDuration / completedWorkflowsWithDuration.length);
    }

    return {
      activeWorkflows,
      completedWorkflows,
      failedWorkflows,
      averageDuration
    };
  }

  /**
   * Get real-time updates (for WebSocket implementation)
   */
  async getRealtimeUpdates(): Promise<{
    timestamp: Date;
    updates: Array<{
      type: string;
      data: any;
    }>;
  }> {
    // This would integrate with ChangeStreamManager for real-time updates
    return {
      timestamp: new Date(),
      updates: []
    };
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warning';
      message: string;
    }>;
  }> {
    const checks = [];

    // Check database connectivity
    try {
      await this.db.admin().ping();
      checks.push({
        name: 'Database',
        status: 'pass' as const,
        message: 'MongoDB connection healthy'
      });
    } catch (error) {
      checks.push({
        name: 'Database',
        status: 'fail' as const,
        message: 'MongoDB connection failed'
      });
    }

    // Check memory usage
    const memoryStats = await this.getMemoryStats();
    if (memoryStats.totalMemories > 50000) {
      checks.push({
        name: 'Memory Usage',
        status: 'warning' as const,
        message: 'High memory usage detected'
      });
    } else {
      checks.push({
        name: 'Memory Usage',
        status: 'pass' as const,
        message: 'Memory usage normal'
      });
    }

    // Check safety alerts
    const safetyStats = await this.getSafetyStats();
    if (safetyStats.failedChecks > safetyStats.totalChecks * 0.1) {
      checks.push({
        name: 'Safety',
        status: 'warning' as const,
        message: 'High safety failure rate'
      });
    } else {
      checks.push({
        name: 'Safety',
        status: 'pass' as const,
        message: 'Safety systems normal'
      });
    }

    // Determine overall status
    const failedChecks = checks.filter(check => check.status === 'fail').length;
    const warningChecks = checks.filter(check => check.status === 'warning').length;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (failedChecks > 0) {
      status = 'critical';
    } else if (warningChecks > 0) {
      status = 'warning';
    }

    return {
      status,
      checks
    };
  }
}
