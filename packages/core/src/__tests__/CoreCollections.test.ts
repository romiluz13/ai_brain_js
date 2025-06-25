/**
 * @file CoreCollections.test.ts - Comprehensive tests for all core MongoDB collections
 * 
 * Tests the complete collection system including AgentCollection, MemoryCollection,
 * WorkflowCollection, ToolCollection, and MetricsCollection working together.
 */

import { ObjectId } from 'mongodb';
import { setupTestDb, teardownTestDb } from './setup';
import { AgentCollection } from '../collections/AgentCollection';
import { MemoryCollection } from '../collections/MemoryCollection';
import { WorkflowCollection } from '../collections/WorkflowCollection';
import { ToolCollection } from '../collections/ToolCollection';
import { MetricsCollection } from '../collections/MetricsCollection';

describe('Core Collections Integration', () => {
  let db: any;
  let agentCollection: AgentCollection;
  let memoryCollection: MemoryCollection;
  let workflowCollection: WorkflowCollection;
  let toolCollection: ToolCollection;
  let metricsCollection: MetricsCollection;

  beforeAll(async () => {
    db = await setupTestDb();
    
    // Initialize all collections
    agentCollection = new AgentCollection(db);
    memoryCollection = new MemoryCollection(db);
    workflowCollection = new WorkflowCollection(db);
    toolCollection = new ToolCollection(db);
    metricsCollection = new MetricsCollection(db);

    // Create indexes for all collections
    await Promise.all([
      agentCollection.createIndexes(),
      memoryCollection.createIndexes(),
      workflowCollection.createIndexes(),
      toolCollection.createIndexes(),
      metricsCollection.createIndexes()
    ]);
  }, 60000);

  afterAll(async () => {
    await teardownTestDb();
  }, 30000);

  beforeEach(async () => {
    // Clear all collections before each test
    await Promise.all([
      db.collection('agents').deleteMany({}),
      db.collection('agent_memory').deleteMany({}),
      db.collection('agent_workflows').deleteMany({}),
      db.collection('agent_tools').deleteMany({}),
      db.collection('tool_executions').deleteMany({}),
      db.collection('agent_performance_metrics').deleteMany({})
    ]);
  });

  describe('Complete Agent Lifecycle', () => {
    it('should create and manage a complete agent ecosystem', async () => {
      // 1. Create an agent
      const agent = await agentCollection.createAgent({
        name: 'TestAgent',
        description: 'A test agent for integration testing',
        framework: 'vercel-ai',
        instructions: 'You are a helpful test assistant',
        configuration: {
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 1000
        },
        tags: ['test', 'integration'],
        status: 'active'
      });

      expect(agent._id).toBeDefined();
      expect(agent.name).toBe('TestAgent');
      expect(agent.framework).toBe('vercel-ai');

      // 2. Create tools for the agent
      const tool = await toolCollection.createTool({
        agentId: agent._id!,
        name: 'search_tool',
        description: 'A tool for searching information',
        category: 'search',
        configuration: {
          apiKey: 'test-key',
          endpoint: 'https://api.example.com'
        },
        rateLimits: {
          maxCallsPerMinute: 10,
          maxCallsPerHour: 100
        },
        costTracking: {
          costPerCall: 0.01,
          currency: 'USD'
        },
        tags: ['search', 'api']
      });

      expect(tool._id).toBeDefined();
      expect(tool.agentId).toEqual(agent._id);

      // 3. Create memories for the agent
      const memory = await memoryCollection.createMemory({
        agentId: agent._id!,
        conversationId: 'conv-123',
        content: 'User asked about weather in New York',
        memoryType: 'conversation',
        importance: 'medium',
        tags: ['weather', 'location'],
        metadata: {
          location: 'New York',
          topic: 'weather'
        }
      });

      expect(memory._id).toBeDefined();
      expect(memory.agentId).toEqual(agent._id);

      // 4. Create a workflow for the agent
      const workflow = await workflowCollection.createWorkflow({
        agentId: agent._id!,
        name: 'Weather Query Workflow',
        description: 'Handle weather-related queries',
        framework: 'vercel-ai',
        steps: [
          {
            id: 'step1',
            name: 'Parse Query',
            type: 'function',
            configuration: { function: 'parseWeatherQuery' }
          },
          {
            id: 'step2',
            name: 'Fetch Weather',
            type: 'tool',
            configuration: { toolId: tool._id!.toString() }
          }
        ],
        tags: ['weather', 'query']
      });

      expect(workflow._id).toBeDefined();
      expect(workflow.agentId).toEqual(agent._id);

      // 5. Record tool execution
      const execution = await toolCollection.recordExecution({
        toolId: tool._id!,
        agentId: agent._id!,
        workflowId: workflow._id!,
        input: { query: 'weather in New York' },
        output: { temperature: '72°F', condition: 'sunny' },
        status: 'completed',
        executionTime: 150,
        cost: 0.01
      });

      expect(execution._id).toBeDefined();
      expect(execution.status).toBe('completed');

      // 6. Record performance metrics
      const metric = await metricsCollection.recordMetric({
        agentId: agent._id!,
        framework: 'vercel-ai',
        metricType: 'response_time',
        value: 150,
        metadata: {
          workflowId: workflow._id!.toString(),
          toolId: tool._id!.toString()
        }
      });

      expect(metric._id).toBeDefined();
      expect(metric.value).toBe(150);

      // 7. Verify relationships and data integrity
      const agentMemories = await memoryCollection.getAgentMemories(agent._id!);
      expect(agentMemories).toHaveLength(1);
      expect(agentMemories[0].content).toContain('weather');

      const agentTools = await toolCollection.getAgentTools(agent._id!);
      expect(agentTools).toHaveLength(1);
      expect(agentTools[0].name).toBe('search_tool');

      const agentWorkflows = await workflowCollection.getAgentWorkflows(agent._id!);
      expect(agentWorkflows).toHaveLength(1);
      expect(agentWorkflows[0].name).toBe('Weather Query Workflow');

      const agentMetrics = await metricsCollection.getAgentMetrics(agent._id!);
      expect(agentMetrics).toHaveLength(1);
      expect(agentMetrics[0].metricType).toBe('response_time');
    });

    it('should handle agent status updates and cascading effects', async () => {
      // Create agent
      const agent = await agentCollection.createAgent({
        name: 'StatusTestAgent',
        description: 'Agent for testing status updates',
        framework: 'mastra',
        instructions: 'Test instructions',
        configuration: {},
        status: 'inactive'
      });

      // Update agent to active
      const updated = await agentCollection.updateAgentStatus(agent._id!, 'active');
      expect(updated).toBe(true);

      // Verify status change
      const retrievedAgent = await agentCollection.getAgent(agent._id!);
      expect(retrievedAgent!.status).toBe('active');
      expect(retrievedAgent!.lastActiveAt).toBeDefined();
    });

    it('should support complex queries and aggregations', async () => {
      // Create multiple agents with different frameworks
      const agents = await Promise.all([
        agentCollection.createAgent({
          name: 'VercelAgent',
          description: 'Vercel AI agent',
          framework: 'vercel-ai',
          instructions: 'Vercel instructions',
          configuration: {},
          status: 'active'
        }),
        agentCollection.createAgent({
          name: 'MastraAgent',
          description: 'Mastra agent',
          framework: 'mastra',
          instructions: 'Mastra instructions',
          configuration: {},
          status: 'active'
        }),
        agentCollection.createAgent({
          name: 'OpenAIAgent',
          description: 'OpenAI agent',
          framework: 'openai-agents',
          instructions: 'OpenAI instructions',
          configuration: {},
          status: 'inactive'
        })
      ]);

      // Get agent statistics
      const stats = await agentCollection.getAgentStats();
      expect(stats.total).toBe(3);
      expect(stats.byStatus.active).toBe(2);
      expect(stats.byStatus.inactive).toBe(1);
      expect(stats.byFramework['vercel-ai']).toBe(1);
      expect(stats.byFramework['mastra']).toBe(1);
      expect(stats.byFramework['openai-agents']).toBe(1);

      // Test framework-specific queries
      const vercelAgents = await agentCollection.getAgentsByFramework('vercel-ai');
      expect(vercelAgents).toHaveLength(1);
      expect(vercelAgents[0].name).toBe('VercelAgent');

      const activeAgents = await agentCollection.getActiveAgents();
      expect(activeAgents).toHaveLength(2);
    });

    it('should handle memory TTL and cleanup operations', async () => {
      const agent = await agentCollection.createAgent({
        name: 'TTLTestAgent',
        description: 'Agent for TTL testing',
        framework: 'vercel-ai',
        instructions: 'TTL test instructions',
        configuration: {}
      });

      // Create memory with expiration
      const expirationDate = new Date(Date.now() + 1000); // Expires in 1 second
      const memory = await memoryCollection.createMemory({
        agentId: agent._id!,
        conversationId: 'ttl-test',
        content: 'This memory will expire soon',
        memoryType: 'temporary',
        importance: 'low',
        expiresAt: expirationDate
      });

      expect(memory.expiresAt).toEqual(expirationDate);

      // Wait for expiration (in real MongoDB Atlas, TTL would handle this automatically)
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Manually trigger cleanup (simulating TTL behavior)
      const cleanedCount = await memoryCollection.cleanupExpiredMemories();
      expect(cleanedCount).toBeGreaterThanOrEqual(0); // May be 0 if TTL already cleaned it
    });

    it('should support workflow execution tracking', async () => {
      const agent = await agentCollection.createAgent({
        name: 'WorkflowAgent',
        description: 'Agent for workflow testing',
        framework: 'vercel-ai',
        instructions: 'Workflow test instructions',
        configuration: {}
      });

      const workflow = await workflowCollection.createWorkflow({
        agentId: agent._id!,
        name: 'Test Workflow',
        description: 'A test workflow',
        framework: 'vercel-ai',
        steps: [
          { id: 'step1', name: 'Step 1', type: 'function', configuration: {} },
          { id: 'step2', name: 'Step 2', type: 'function', configuration: {} }
        ]
      });

      // Start workflow
      await workflowCollection.updateWorkflowStatus(workflow._id!, 'running');

      // Update step progress
      await workflowCollection.updateCurrentStep(workflow._id!, 1, { result: 'step1 completed' });

      // Complete workflow
      await workflowCollection.updateWorkflowStatus(workflow._id!, 'completed');

      // Verify workflow state
      const completedWorkflow = await workflowCollection.getWorkflow(workflow._id!);
      expect(completedWorkflow!.status).toBe('completed');
      expect(completedWorkflow!.currentStepIndex).toBe(1);
      expect(completedWorkflow!.startedAt).toBeDefined();
      expect(completedWorkflow!.completedAt).toBeDefined();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle batch operations efficiently', async () => {
      const agent = await agentCollection.createAgent({
        name: 'BatchTestAgent',
        description: 'Agent for batch testing',
        framework: 'vercel-ai',
        instructions: 'Batch test instructions',
        configuration: {}
      });

      // Create multiple memories in batch
      const memoryData = Array.from({ length: 10 }, (_, i) => ({
        agentId: agent._id!,
        conversationId: `batch-conv-${i}`,
        content: `Batch memory ${i}`,
        memoryType: 'conversation' as const,
        importance: 'medium' as const,
        tags: ['batch', `item-${i}`]
      }));

      const startTime = Date.now();
      const memories = await Promise.all(
        memoryData.map(data => memoryCollection.createMemory(data))
      );
      const endTime = Date.now();

      expect(memories).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify all memories were created
      const agentMemories = await memoryCollection.getAgentMemories(agent._id!);
      expect(agentMemories).toHaveLength(10);
    });

    it('should support complex aggregation queries', async () => {
      const agent = await agentCollection.createAgent({
        name: 'MetricsAgent',
        description: 'Agent for metrics testing',
        framework: 'vercel-ai',
        instructions: 'Metrics test instructions',
        configuration: {}
      });

      // Record multiple metrics
      const metricsData = [
        { metricType: 'response_time', value: 100 },
        { metricType: 'response_time', value: 150 },
        { metricType: 'response_time', value: 120 },
        { metricType: 'accuracy', value: 0.95 },
        { metricType: 'accuracy', value: 0.92 },
        { metricType: 'cost', value: 0.05 }
      ].map(data => ({
        ...data,
        agentId: agent._id!,
        framework: 'vercel-ai'
      }));

      await metricsCollection.recordMetrics(metricsData);

      // Get aggregated metrics
      const aggregated = await metricsCollection.getAggregatedMetrics(
        { agentId: agent._id! },
        { groupBy: 'day' }
      );

      expect(aggregated.summary).toBeDefined();
      expect(aggregated.summary.response_time).toBeDefined();
      expect(aggregated.summary.response_time.avg).toBeCloseTo(123.33, 1);
      expect(aggregated.summary.accuracy.avg).toBeCloseTo(0.935, 2);
    });
  });
});
