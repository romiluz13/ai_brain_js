/**
 * AI Brain Dashboard - Real-time Monitoring Interface
 * 
 * This dashboard provides a comprehensive real-time view of the Universal AI Brain,
 * including memory usage, performance metrics, safety monitoring, and agent coordination.
 * 
 * Features:
 * - Real-time memory analytics
 * - Performance monitoring charts
 * - Safety alerts and compliance tracking
 * - Multi-agent coordination view
 * - Workflow tracking and analytics
 * - Cost monitoring and optimization
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface DashboardData {
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

interface AIBrainDashboardProps {
  apiEndpoint: string;
  refreshInterval?: number;
  theme?: 'light' | 'dark';
}

const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#6366F1',
  secondary: '#6B7280'
};

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#8B5CF6'];

export const AIBrainDashboard: React.FC<AIBrainDashboardProps> = ({
  apiEndpoint,
  refreshInterval = 5000,
  theme = 'light'
}) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`${apiEndpoint}/dashboard/stats`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const dashboardData = await response.json();
      setData(dashboardData);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint]);

  // Set up auto-refresh
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-lg">Loading AI Brain Dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Dashboard Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={fetchData}
              className="mt-2 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div>No data available</div>;
  }

  // Prepare chart data
  const memoryTypeData = Object.entries(data.memory.memoryTypes).map(([type, count]) => ({
    name: type,
    value: count
  }));

  const safetyData = [
    { name: 'Passed', value: data.safety.passedChecks, color: COLORS.success },
    { name: 'Failed', value: data.safety.failedChecks, color: COLORS.danger }
  ];

  const frameworkData = Object.entries(data.agents.frameworks).map(([framework, count]) => ({
    name: framework,
    value: count
  }));

  const workflowData = [
    { name: 'Active', value: data.workflows.activeWorkflows, color: COLORS.info },
    { name: 'Completed', value: data.workflows.completedWorkflows, color: COLORS.success },
    { name: 'Failed', value: data.workflows.failedWorkflows, color: COLORS.danger }
  ];

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🧠 Universal AI Brain Dashboard</h1>
              <p className="text-sm text-gray-500">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="ml-2 text-sm text-gray-600">Live</span>
              </div>
              <button
                onClick={fetchData}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Memories"
            value={data.memory.totalMemories.toLocaleString()}
            subtitle={`${data.memory.workingMemories} working`}
            color={COLORS.primary}
            icon="🧠"
          />
          <MetricCard
            title="Active Agents"
            value={data.agents.activeAgents.toString()}
            subtitle={`${data.agents.activeSessions} sessions`}
            color={COLORS.success}
            icon="🤖"
          />
          <MetricCard
            title="Response Time"
            value={`${data.performance.averageResponseTime}ms`}
            subtitle={`${(data.performance.successRate * 100).toFixed(1)}% success`}
            color={COLORS.info}
            icon="⚡"
          />
          <MetricCard
            title="Total Cost"
            value={`$${data.performance.costMetrics.totalCosts.toFixed(3)}`}
            subtitle={`LLM: $${data.performance.costMetrics.llmCosts.toFixed(3)}`}
            color={COLORS.warning}
            icon="💰"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Memory Types Distribution */}
          <ChartCard title="Memory Types Distribution">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={memoryTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {memoryTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Safety Monitoring */}
          <ChartCard title="Safety Monitoring">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={safetyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill={COLORS.success} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Framework Usage */}
          <ChartCard title="Framework Usage">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={frameworkData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill={COLORS.primary} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Workflow Status */}
          <ChartCard title="Workflow Status">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={workflowData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {workflowData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Recent Safety Alerts */}
        {data.safety.recentAlerts.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4">🚨 Recent Safety Alerts</h3>
            <div className="space-y-3">
              {data.safety.recentAlerts.slice(0, 5).map((alert, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-l-4 ${
                    alert.severity === 'high' ? 'border-red-500 bg-red-50' :
                    alert.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                    'border-blue-500 bg-blue-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{alert.type}</p>
                      <p className="text-sm text-gray-600">{alert.message}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Sessions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">🤝 Active Multi-Agent Sessions</h3>
          {data.agents.coordination.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Session ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agents
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Activity
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.agents.coordination.map((session, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {session.sessionId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {session.agentCount} agents
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(session.lastActivity).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No active multi-agent sessions</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper Components
const MetricCard: React.FC<{
  title: string;
  value: string;
  subtitle: string;
  color: string;
  icon: string;
}> = ({ title, value, subtitle, color, icon }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center">
      <div className="flex-shrink-0">
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="ml-4 flex-1">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-semibold" style={{ color }}>{value}</p>
        <p className="text-sm text-gray-400">{subtitle}</p>
      </div>
    </div>
  </div>
);

const ChartCard: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <h3 className="text-lg font-semibold mb-4">{title}</h3>
    {children}
  </div>
);

export default AIBrainDashboard;
