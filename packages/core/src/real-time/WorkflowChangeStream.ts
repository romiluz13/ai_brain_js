import { Db, Document } from 'mongodb';
import { ChangeStreamManager } from './ChangeStreamManager';
import { logger } from '../utils/logger';

export class WorkflowChangeStream {
  private changeStreamManager: ChangeStreamManager;

  constructor(db: Db) {
    const pipeline = [
      {
        $match: {
          'updateDescription.updatedFields.status': { $exists: true }
        }
      }
    ];

    this.changeStreamManager = new ChangeStreamManager(
      db,
      'agent_workflows',
      pipeline,
      this.handleWorkflowChange.bind(this)
    );
  }

  private async handleWorkflowChange(change: Document): Promise<void> {
    logger.info('Workflow status changed:', {
      workflow_id: change.documentKey._id,
      status: change.updateDescription.updatedFields.status
    });
  }

  public async start(): Promise<void> {
    await this.changeStreamManager.start();
  }

  public async stop(): Promise<void> {
    await this.changeStreamManager.stop();
  }
}