import { ObjectId } from 'mongodb';
import { IDataStore } from '../persistance/IDataStore';
import { AgentStateManager } from './AgentStateManager';
import { ToolExecutor, ToolExecutionContext } from './ToolExecutor';
import { SchemaValidator } from '../schemas/validator';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

// Workflow interfaces matching our schema
export interface LegacyWorkflowStep {
  step_id: string;
  agent_id: string;
  description: string;
  depends_on?: string[];
  timeout_seconds?: number;
  retry_count?: number;
  tool_id?: string;
  input_mapping?: Record<string, any>;
  condition?: string; // Simple condition for conditional execution
}

export interface WorkflowStepExecution {
  step_id: string;
  agent_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  started_at?: Date;
  completed_at?: Date;
  duration_seconds?: number;
  input?: Record<string, any>;
  output?: Record<string, any>;
  cost?: number;
  tokens_used?: number;
  error?: {
    message: string;
    stack?: string;
    retry_count: number;
  };
}

export interface Workflow {
  _id?: ObjectId;
  workflow_id: string;
  workflow_name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  created_at: Date;
  updated_at: Date;
  workflow_definition: {
    name: string;
    version: string;
    steps: LegacyWorkflowStep[];
  };
  current_step?: number;
  execution_log: WorkflowStepExecution[];
  shared_context: Record<string, any>;
  error_log: Array<{
    step_id: string;
    error: string;
    timestamp: Date;
  }>;
  retry_attempts?: number;
  max_retries?: number;
}

export interface WorkflowExecutionOptions {
  timeout_seconds?: number;
  max_retries?: number;
  parallel_execution?: boolean;
  continue_on_error?: boolean;
}

export class WorkflowEngine {
  private workflowStore: IDataStore<Workflow>;
  private agentStateManager: AgentStateManager;
  private toolExecutor: ToolExecutor;

  constructor(
    workflowStore: IDataStore<Workflow>,
    agentStateManager: AgentStateManager,
    toolExecutor: ToolExecutor
  ) {
    this.workflowStore = workflowStore;
    this.agentStateManager = agentStateManager;
    this.toolExecutor = toolExecutor;
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(
    workflowName: string,
    steps: LegacyWorkflowStep[],
    initialContext: Record<string, any> = {},
    options: WorkflowExecutionOptions = {}
  ): Promise<Workflow> {
    const workflow: Workflow = {
      workflow_id: uuidv4(),
      workflow_name: workflowName,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
      workflow_definition: {
        name: workflowName,
        version: '1.0',
        steps
      },
      current_step: 0,
      execution_log: [],
      shared_context: initialContext,
      error_log: [],
      retry_attempts: 0,
      max_retries: options.max_retries || 3
    };

    // Validate workflow
    const validationData = {
      ...workflow,
      created_at: workflow.created_at.toISOString(),
      updated_at: workflow.updated_at.toISOString()
    };
    SchemaValidator.validateOrThrow('agentWorkflows', validationData);

    const created = await this.workflowStore.create(workflow);
    return created;
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflowId: string, options: WorkflowExecutionOptions = {}): Promise<void> {
    // Find workflow by workflow_id field, not _id
    const workflows = await this.workflowStore.find({ workflow_id: workflowId });
    if (workflows.length === 0) {
      throw new Error(`Workflow with ID '${workflowId}' not found.`);
    }
    const workflow = workflows[0];

    if (workflow.status === 'completed') {
      console.log(`Workflow ${workflowId} is already completed.`);
      return;
    }

    await this.updateWorkflowStatus(workflowId, 'in_progress');

    try {
      await this.executeWorkflowSequential(workflow, options);
      await this.updateWorkflowStatus(workflowId, 'completed');
      console.log(`✅ Workflow ${workflowId} completed successfully.`);
    } catch (error) {
      console.error(`❌ Workflow ${workflowId} failed:`, error);
      await this.updateWorkflowStatus(workflowId, 'failed');

      const updatedWorkflow = await this.getWorkflowStatus(workflowId);
      if (updatedWorkflow && (updatedWorkflow.retry_attempts || 0) < (updatedWorkflow.max_retries || 3)) {
        console.log(`🔄 Retrying workflow ${workflowId} (attempt ${(updatedWorkflow.retry_attempts || 0) + 1}/${updatedWorkflow.max_retries})`);
        await this.retryWorkflow(workflowId);
      }
    }
  }

  /**
   * Execute workflow steps sequentially
   */
  private async executeWorkflowSequential(workflow: Workflow, options: WorkflowExecutionOptions): Promise<void> {
    const steps = workflow.workflow_definition.steps;
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      // Check dependencies
      if (!this.areDependenciesMet(step, workflow.execution_log)) {
        console.log(`⏸️ Skipping step ${step.step_id} - dependencies not met`);
        continue;
      }

      // Check condition
      if (step.condition && !this.evaluateCondition(step.condition, workflow.shared_context)) {
        console.log(`⏸️ Skipping step ${step.step_id} - condition not met: ${step.condition}`);
        await this.logStepExecution(workflow, step, 'skipped');
        continue;
      }

      await this.executeStep(workflow, step, i);
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(workflow: Workflow, step: LegacyWorkflowStep, stepIndex: number): Promise<void> {
    const maxRetries = step.retry_count || 0;
    let attempt = 0;
    let lastError: any;

    while (attempt <= maxRetries) {
      const startTime = new Date();
      let stepExecution: WorkflowStepExecution = {
        step_id: step.step_id,
        agent_id: step.agent_id,
        status: 'in_progress',
        started_at: startTime,
        input: this.prepareStepInput(step, workflow.shared_context)
      };

      try {
        console.log(`🔄 Executing step ${step.step_id}: ${step.description} (Attempt ${attempt + 1})`);
        
        await this.updateCurrentStep(workflow.workflow_id, stepIndex);
        await this.agentStateManager.getAgentState(step.agent_id);

        const context: ToolExecutionContext = {
          agent_id: step.agent_id,
          workflow_id: workflow.workflow_id,
          timeout_ms: (step.timeout_seconds || 30) * 1000
        };

        let output: Record<string, any> = {};
        if (step.tool_id) {
          output = await this.toolExecutor.execute(step.tool_id, stepExecution.input!, context);
        } else {
          output = { message: `Step ${step.step_id} executed without tool` };
        }

        workflow.shared_context[step.step_id] = output;
        await this.updateWorkflowContext(workflow.workflow_id, workflow.shared_context);

        const endTime = new Date();
        stepExecution = {
          ...stepExecution,
          status: 'completed',
          completed_at: endTime,
          duration_seconds: (endTime.getTime() - startTime.getTime()) / 1000,
          output,
          cost: output.cost || 0,
          tokens_used: output.tokens_used || 0
        };

        await this.logStepExecution(workflow, step, 'completed', stepExecution);
        logger.info(`Step ${step.step_id} completed successfully`, {
          workflow_id: workflow.workflow_id,
          step_id: step.step_id,
          agent_id: step.agent_id,
        });
        return; // Exit loop on success

      } catch (error: any) {
        lastError = error;
        const endTime = new Date();
        stepExecution = {
          ...stepExecution,
          status: 'failed',
          completed_at: endTime,
          duration_seconds: (endTime.getTime() - startTime.getTime()) / 1000,
          error: {
            message: error.message,
            stack: error.stack,
            retry_count: attempt
          }
        };

        await this.logStepExecution(workflow, step, 'failed', stepExecution);
        await this.logError(workflow.workflow_id, step.step_id, error.message);

        attempt++;
        if (attempt <= maxRetries) {
          console.log(`🔄 Retrying step ${step.step_id} (attempt ${attempt + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retrying
        }
      }
    }

    logger.error(`Step ${step.step_id} failed after ${maxRetries + 1} attempts`, {
      workflow_id: workflow.workflow_id,
      step_id: step.step_id,
      agent_id: step.agent_id,
    }, lastError);
    throw lastError;
  }

  /**
   * Prepare input for a step based on input mapping
   */
  private prepareStepInput(step: LegacyWorkflowStep, sharedContext: Record<string, any>): Record<string, any> {
    if (!step.input_mapping) {
      return {};
    }

    const input: Record<string, any> = {};
    
    for (const [key, mapping] of Object.entries(step.input_mapping)) {
      if (typeof mapping === 'string') {
        // Simple context reference
        if (mapping.startsWith('context.')) {
          const contextKey = mapping.substring(8);
          input[key] = sharedContext[contextKey];
        } else {
          input[key] = mapping;
        }
      } else {
        input[key] = mapping;
      }
    }

    return input;
  }

  /**
   * Check if step dependencies are met
   */
  private areDependenciesMet(step: LegacyWorkflowStep, executionLog: WorkflowStepExecution[]): boolean {
    if (!step.depends_on || step.depends_on.length === 0) {
      return true;
    }

    return step.depends_on.every(depStepId => {
      const depExecution = executionLog.find(log => log.step_id === depStepId);
      return depExecution && depExecution.status === 'completed';
    });
  }

  /**
   * Evaluate a simple condition
   */
  private evaluateCondition(condition: string, context: Record<string, any>): boolean {
    try {
      // Simple condition evaluation - in production would use a proper expression engine
      if (condition.includes('exists')) {
        const key = condition.match(/exists\(([^)]+)\)/)?.[1];
        return key ? context[key] !== undefined : false;
      }
      
      if (condition.includes('equals')) {
        const match = condition.match(/equals\(([^,]+),\s*([^)]+)\)/);
        if (match) {
          const [, key, value] = match;
          return context[key] === value.replace(/['"]/g, '');
        }
      }

      return true; // Default to true for unknown conditions
    } catch (error) {
      console.warn(`Failed to evaluate condition: ${condition}`, error);
      return false;
    }
  }

  /**
   * Log step execution
   */
  private async logStepExecution(
    workflow: Workflow, 
    step: LegacyWorkflowStep,
    status: WorkflowStepExecution['status'],
    execution?: Partial<WorkflowStepExecution>
  ): Promise<void> {
    const stepExecution: WorkflowStepExecution = {
      step_id: step.step_id,
      agent_id: step.agent_id,
      status,
      ...execution
    };

    // Update execution log
    const updatedLog = [...workflow.execution_log];
    const existingIndex = updatedLog.findIndex(log => log.step_id === step.step_id);
    
    if (existingIndex >= 0) {
      updatedLog[existingIndex] = stepExecution;
    } else {
      updatedLog.push(stepExecution);
    }

    const currentWorkflow = await this.getWorkflowStatus(workflow.workflow_id);
    if (currentWorkflow?._id) {
        await this.workflowStore.update(currentWorkflow._id.toString(), {
            execution_log: updatedLog,
            updated_at: new Date()
        } as Partial<Workflow>);
    }
  }

  /**
   * Log workflow error
   */
  private async logError(workflowId: string, stepId: string, error: string): Promise<void> {
    const workflows = await this.workflowStore.find({ workflow_id: workflowId });
    if (workflows.length === 0 || !workflows[0]._id) return;
    const workflow = workflows[0];

    const errorLog = [...workflow.error_log, {
      step_id: stepId,
      error,
      timestamp: new Date()
    }];

    if (workflow._id) {
      await this.workflowStore.update(workflow._id.toString(), {
        error_log: errorLog,
        updated_at: new Date()
      } as Partial<Workflow>);
    }
  }

  /**
   * Update workflow status
   */
  private async updateWorkflowStatus(workflowId: string, status: Workflow['status']): Promise<void> {
    const workflows = await this.workflowStore.find({ workflow_id: workflowId });
    if (workflows.length > 0 && workflows[0]._id) {
      await this.workflowStore.update(workflows[0]._id.toString(), {
        status,
        updated_at: new Date()
      } as Partial<Workflow>);
    }
  }

  /**
   * Update current step
   */
  private async updateCurrentStep(workflowId: string, stepIndex: number): Promise<void> {
    const workflows = await this.workflowStore.find({ workflow_id: workflowId });
    if (workflows.length > 0 && workflows[0]._id) {
      await this.workflowStore.update(workflows[0]._id.toString(), {
        current_step: stepIndex,
        updated_at: new Date()
      } as Partial<Workflow>);
    }
  }

  /**
   * Update workflow context
   */
  private async updateWorkflowContext(workflowId: string, context: Record<string, any>): Promise<void> {
    const workflows = await this.workflowStore.find({ workflow_id: workflowId });
    if (workflows.length > 0 && workflows[0]._id) {
      await this.workflowStore.update(workflows[0]._id.toString(), {
        shared_context: context,
        updated_at: new Date()
      } as Partial<Workflow>);
    }
  }

  /**
   * Retry a failed workflow
   */
  async retryWorkflow(workflowId: string): Promise<void> {
    const workflows = await this.workflowStore.find({ workflow_id: workflowId });
    if (workflows.length === 0 || !workflows[0]._id) {
      throw new Error(`Workflow with ID '${workflowId}' not found.`);
    }
    const workflow = workflows[0];

    // Increment retry attempts
    if (workflow._id) {
      await this.workflowStore.update(workflow._id.toString(), {
        retry_attempts: (workflow.retry_attempts || 0) + 1,
        status: 'pending',
        updated_at: new Date()
      } as Partial<Workflow>);
    }

    // Re-execute workflow
    await this.executeWorkflow(workflowId);
  }

  /**
   * Cancel a workflow
   */
  async cancelWorkflow(workflowId: string): Promise<void> {
    await this.updateWorkflowStatus(workflowId, 'cancelled');
    console.log(`🛑 Workflow ${workflowId} cancelled`);
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(workflowId: string): Promise<Workflow | null> {
    const workflows = await this.workflowStore.find({ workflow_id: workflowId });
    return workflows.length > 0 ? workflows[0] : null;
  }

  /**
   * Get workflow execution summary
   */
  async getWorkflowSummary(workflowId: string): Promise<{
    workflow: Workflow;
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    totalCost: number;
    totalDuration: number;
  } | null> {
    const workflows = await this.workflowStore.find({ workflow_id: workflowId });
    if (workflows.length === 0) return null;
    const workflow = workflows[0];

    const totalSteps = workflow.workflow_definition.steps.length;
    const completedSteps = workflow.execution_log.filter(log => log.status === 'completed').length;
    const failedSteps = workflow.execution_log.filter(log => log.status === 'failed').length;
    const totalCost = workflow.execution_log.reduce((sum, log) => sum + (log.cost || 0), 0);
    const totalDuration = workflow.execution_log.reduce((sum, log) => sum + (log.duration_seconds || 0), 0);

    return {
      workflow,
      totalSteps,
      completedSteps,
      failedSteps,
      totalCost,
      totalDuration
    };
  }
}