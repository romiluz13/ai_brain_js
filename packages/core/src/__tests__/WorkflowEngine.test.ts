import { WorkflowEngine, Workflow, WorkflowStep } from '../agent/WorkflowEngine';
import { AgentStateManager, AgentState, AgentConfig } from '../agent/AgentStateManager';
import { ToolExecutor, ToolDefinition, ToolExecutionLog } from '../agent/ToolExecutor';
import { MongoDataStore } from '../persistance/MongoDataStore';
import { setupTestDb, teardownTestDb, getTestDb } from './setup';

describe('WorkflowEngine', () => {
  let workflowEngine: WorkflowEngine;
  let workflowStore: MongoDataStore<Workflow>;
  let agentStateManager: AgentStateManager;
  let toolExecutor: ToolExecutor;

  beforeAll(async () => {
    await setupTestDb();
    const db = getTestDb();
    
    workflowStore = new MongoDataStore<Workflow>(db, 'agent_workflows');
    const agentStore = new MongoDataStore<AgentState>(db, 'agents');
    const configStore = new MongoDataStore<AgentConfig>(db, 'agent_configurations');
    const toolStore = new MongoDataStore<ToolDefinition>(db, 'agent_tools');
    const executionStore = new MongoDataStore<ToolExecutionLog>(db, 'tool_executions');
    
    agentStateManager = new AgentStateManager(agentStore, configStore);
    toolExecutor = new ToolExecutor(toolStore, executionStore);
    workflowEngine = new WorkflowEngine(workflowStore, agentStateManager, toolExecutor);

    // Create a test agent
    await agentStateManager.saveAgentState({
      agent_id: 'test-agent',
      name: 'Test Agent',
      version: '1.0.0',
      status: 'active',
      model_config: {
        provider: 'openai',
        model: 'gpt-4',
        system_prompt: 'You are a test agent'
      }
    });
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    // Clear collections before each test
    await getTestDb().collection('agent_workflows').deleteMany({});
    await getTestDb().collection('tool_executions').deleteMany({});
    await getTestDb().collection('agent_tools').deleteMany({});

    // Create tool definitions needed for the tests
    await toolExecutor.createTool({
        tool_id: 'text_analysis',
        name: 'Text Analysis',
        description: 'Analyzes text.',
        version: '1.0',
        status: 'active',
        input_schema: {},
        output_schema: {},
        execute: async () => ({})
    });
    await toolExecutor.createTool({
        tool_id: 'internal_db_lookup',
        name: 'Internal DB Lookup',
        description: 'Looks up data in DB.',
        version: '1.0',
        status: 'active',
        input_schema: {},
        output_schema: {},
        execute: async () => ({})
    });
    await toolExecutor.createTool({
        tool_id: 'failing_tool',
        name: 'Failing Tool',
        description: 'A tool that always fails.',
        version: '1.0',
        status: 'active',
        input_schema: {},
        output_schema: {},
        execute: async () => { throw new Error('Tool failure'); }
    });
    await toolExecutor.createTool({
        tool_id: 'retry_tool',
        name: 'Retry Tool',
        description: 'A tool that fails a few times.',
        version: '1.0',
        status: 'active',
        input_schema: {},
        output_schema: {},
        execute: async () => ({})
    });
  });

  describe('workflow creation', () => {
    it('should create a simple workflow', async () => {
      const steps: WorkflowStep[] = [
        {
          step_id: 'step1',
          agent_id: 'test-agent',
          description: 'Execute text analysis',
          tool_id: 'text_analysis',
          input_mapping: {
            text: 'Hello world',
            analysis_type: 'sentiment'
          }
        }
      ];

      const workflow = await workflowEngine.createWorkflow(
        'Test Workflow',
        steps,
        { initial_data: 'test' }
      );

      expect(workflow._id).toBeDefined();
      expect(workflow.workflow_name).toBe('Test Workflow');
      expect(workflow.status).toBe('pending');
      expect(workflow.workflow_definition.steps).toHaveLength(1);
      expect(workflow.shared_context.initial_data).toBe('test');
    });

    it('should create workflow with dependencies', async () => {
      const steps: WorkflowStep[] = [
        {
          step_id: 'step1',
          agent_id: 'test-agent',
          description: 'First step',
          tool_id: 'text_analysis',
          input_mapping: { text: 'test' }
        },
        {
          step_id: 'step2',
          agent_id: 'test-agent',
          description: 'Second step',
          depends_on: ['step1'],
          tool_id: 'internal_db_lookup',
          input_mapping: { collection: 'test' }
        }
      ];

      const workflow = await workflowEngine.createWorkflow('Dependent Workflow', steps);

      expect(workflow.workflow_definition.steps).toHaveLength(2);
      expect(workflow.workflow_definition.steps[1].depends_on).toContain('step1');
    });
  });

  describe('workflow execution', () => {
    it('should execute a simple workflow', async () => {
      const steps: WorkflowStep[] = [
        {
          step_id: 'analysis_step',
          agent_id: 'test-agent',
          description: 'Analyze text sentiment',
          tool_id: 'text_analysis',
          input_mapping: {
            text: 'This is a positive message',
            analysis_type: 'sentiment'
          }
        }
      ];

      const workflow = await workflowEngine.createWorkflow('Simple Workflow', steps);
      
      await workflowEngine.executeWorkflow(workflow.workflow_id);

      // Check workflow status
      const updatedWorkflow = await workflowEngine.getWorkflowStatus(workflow.workflow_id);
      expect(updatedWorkflow!.status).toBe('completed');
      expect(updatedWorkflow!.execution_log).toHaveLength(1);
      expect(updatedWorkflow!.execution_log[0].status).toBe('completed');
      expect(updatedWorkflow!.shared_context.analysis_step).toBeDefined();
    });

    it('should execute workflow with multiple steps', async () => {
      const steps: WorkflowStep[] = [
        {
          step_id: 'step1',
          agent_id: 'test-agent',
          description: 'First analysis',
          tool_id: 'text_analysis',
          input_mapping: { text: 'First text' }
        },
        {
          step_id: 'step2',
          agent_id: 'test-agent',
          description: 'Second analysis',
          tool_id: 'text_analysis',
          input_mapping: { text: 'Second text' }
        }
      ];

      const workflow = await workflowEngine.createWorkflow('Multi-step Workflow', steps);
      
      await workflowEngine.executeWorkflow(workflow.workflow_id);

      const updatedWorkflow = await workflowEngine.getWorkflowStatus(workflow.workflow_id);
      expect(updatedWorkflow!.status).toBe('completed');
      expect(updatedWorkflow!.execution_log).toHaveLength(2);
      expect(updatedWorkflow!.shared_context.step1).toBeDefined();
      expect(updatedWorkflow!.shared_context.step2).toBeDefined();
    });

    it('should handle workflow step dependencies', async () => {
      const steps: WorkflowStep[] = [
        {
          step_id: 'first',
          agent_id: 'test-agent',
          description: 'First step',
          tool_id: 'text_analysis',
          input_mapping: { text: 'dependency test' }
        },
        {
          step_id: 'second',
          agent_id: 'test-agent',
          description: 'Second step depends on first',
          depends_on: ['first'],
          tool_id: 'internal_db_lookup',
          input_mapping: { collection: 'test' }
        }
      ];

      const workflow = await workflowEngine.createWorkflow('Dependency Workflow', steps);
      
      await workflowEngine.executeWorkflow(workflow.workflow_id);

      const updatedWorkflow = await workflowEngine.getWorkflowStatus(workflow.workflow_id);
      expect(updatedWorkflow!.status).toBe('completed');
      
      // Check execution order
      const firstExecution = updatedWorkflow!.execution_log.find(log => log.step_id === 'first');
      const secondExecution = updatedWorkflow!.execution_log.find(log => log.step_id === 'second');
      
      expect(firstExecution!.started_at!.getTime()).toBeLessThan(secondExecution!.started_at!.getTime());
    });

    it('should skip steps with unmet dependencies', async () => {
      const steps: WorkflowStep[] = [
        {
          step_id: 'independent',
          agent_id: 'test-agent',
          description: 'Independent step',
          tool_id: 'text_analysis',
          input_mapping: { text: 'test' }
        },
        {
          step_id: 'dependent',
          agent_id: 'test-agent',
          description: 'Depends on non-existent step',
          depends_on: ['non_existent_step'],
          tool_id: 'text_analysis',
          input_mapping: { text: 'test' }
        }
      ];

      const workflow = await workflowEngine.createWorkflow('Skip Workflow', steps);
      
      await workflowEngine.executeWorkflow(workflow.workflow_id);

      const updatedWorkflow = await workflowEngine.getWorkflowStatus(workflow.workflow_id);
      expect(updatedWorkflow!.status).toBe('completed');
      expect(updatedWorkflow!.execution_log).toHaveLength(1); // Only independent step executed
      expect(updatedWorkflow!.execution_log[0].step_id).toBe('independent');
    });
  });

  describe('workflow error handling', () => {
    it('should handle step failures', async () => {
      // Register a tool that fails

      const steps: WorkflowStep[] = [
        {
          step_id: 'failing_step',
          agent_id: 'test-agent',
          description: 'This step will fail',
          tool_id: 'failing_tool',
          input_mapping: {}
        }
      ];

      const workflow = await workflowEngine.createWorkflow('Failing Workflow', steps);
      
      await workflowEngine.executeWorkflow(workflow.workflow_id);

      const updatedWorkflow = await workflowEngine.getWorkflowStatus(workflow.workflow_id);
      expect(updatedWorkflow!.status).toBe('failed');
      expect(updatedWorkflow!.execution_log[0].status).toBe('failed');
      expect(updatedWorkflow!.error_log).toHaveLength(1);
    });

    it('should retry failed steps', async () => {
      let callCount = 0;

      const steps: WorkflowStep[] = [
        {
          step_id: 'retry_step',
          agent_id: 'test-agent',
          description: 'Step with retries',
          tool_id: 'retry_tool',
          retry_count: 3,
          input_mapping: {}
        }
      ];

      const workflow = await workflowEngine.createWorkflow('Retry Workflow', steps);
      
      await workflowEngine.executeWorkflow(workflow.workflow_id);

      const updatedWorkflow = await workflowEngine.getWorkflowStatus(workflow.workflow_id);
      expect(updatedWorkflow!.status).toBe('completed');
      expect(callCount).toBe(3); // Should have retried until success
    });
  });

  describe('workflow management', () => {
    it('should cancel a workflow', async () => {
      const steps: WorkflowStep[] = [
        {
          step_id: 'step1',
          agent_id: 'test-agent',
          description: 'Test step',
          tool_id: 'text_analysis',
          input_mapping: { text: 'test' }
        }
      ];

      const workflow = await workflowEngine.createWorkflow('Cancellable Workflow', steps);
      
      await workflowEngine.cancelWorkflow(workflow.workflow_id);

      const updatedWorkflow = await workflowEngine.getWorkflowStatus(workflow.workflow_id);
      expect(updatedWorkflow!.status).toBe('cancelled');
    });

    it('should get workflow summary', async () => {
      const steps: WorkflowStep[] = [
        {
          step_id: 'step1',
          agent_id: 'test-agent',
          description: 'First step',
          tool_id: 'text_analysis',
          input_mapping: { text: 'test' }
        },
        {
          step_id: 'step2',
          agent_id: 'test-agent',
          description: 'Second step',
          tool_id: 'internal_db_lookup',
          input_mapping: { collection: 'test' }
        }
      ];

      const workflow = await workflowEngine.createWorkflow('Summary Workflow', steps);
      
      await workflowEngine.executeWorkflow(workflow.workflow_id);

      const summary = await workflowEngine.getWorkflowSummary(workflow.workflow_id);
      
      expect(summary).toBeDefined();
      expect(summary!.totalSteps).toBe(2);
      expect(summary!.completedSteps).toBe(2);
      expect(summary!.failedSteps).toBe(0);
      expect(summary!.totalDuration).toBeGreaterThan(0);
    });
  });

  describe('conditional execution', () => {
    it('should execute steps based on conditions', async () => {
      const steps: WorkflowStep[] = [
        {
          step_id: 'setup',
          agent_id: 'test-agent',
          description: 'Setup step',
          tool_id: 'text_analysis',
          input_mapping: { text: 'setup' }
        },
        {
          step_id: 'conditional',
          agent_id: 'test-agent',
          description: 'Conditional step',
          condition: 'exists(setup)',
          tool_id: 'internal_db_lookup',
          input_mapping: { collection: 'test' }
        }
      ];

      const workflow = await workflowEngine.createWorkflow('Conditional Workflow', steps);
      
      await workflowEngine.executeWorkflow(workflow.workflow_id);

      const updatedWorkflow = await workflowEngine.getWorkflowStatus(workflow.workflow_id);
      expect(updatedWorkflow!.status).toBe('completed');
      expect(updatedWorkflow!.execution_log).toHaveLength(2); // Both steps should execute
    });

    it('should skip steps when conditions are not met', async () => {
      const steps: WorkflowStep[] = [
        {
          step_id: 'setup',
          agent_id: 'test-agent',
          description: 'Setup step',
          tool_id: 'text_analysis',
          input_mapping: { text: 'setup' }
        },
        {
          step_id: 'conditional',
          agent_id: 'test-agent',
          description: 'Conditional step',
          condition: 'exists(nonexistent)',
          tool_id: 'internal_db_lookup',
          input_mapping: { collection: 'test' }
        }
      ];

      const workflow = await workflowEngine.createWorkflow('Skip Conditional Workflow', steps);
      
      await workflowEngine.executeWorkflow(workflow.workflow_id);

      const updatedWorkflow = await workflowEngine.getWorkflowStatus(workflow.workflow_id);
      expect(updatedWorkflow!.status).toBe('completed');
      expect(updatedWorkflow!.execution_log).toHaveLength(2);
      expect(updatedWorkflow!.execution_log[1].status).toBe('skipped');
    });
  });
});