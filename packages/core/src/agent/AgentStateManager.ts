import { IDataStore } from '../persistance/IDataStore';
import { Document } from 'mongodb';

export interface AgentState extends Document {
  agent_id: string;
  name: string;
  version: string;
  status: 'active' | 'inactive' | 'deprecated';
  model_config: {
    provider: string;
    model: string;
    [key: string]: any;
  };
  tools?: string[];
}

export interface AgentConfig extends Document {
    // Define config structure
}

export class AgentStateManager {
  private agentStore: IDataStore<AgentState>;
  private configStore: IDataStore<AgentConfig>;

  constructor(agentStore: IDataStore<AgentState>, configStore: IDataStore<AgentConfig>) {
    this.agentStore = agentStore;
    this.configStore = configStore;
  }

  async getAgentState(agentId: string): Promise<AgentState | null> {
    return this.agentStore.findOne({ agent_id: agentId });
  }

  async saveAgentState(state: AgentState): Promise<AgentState> {
    return this.agentStore.create(state);
  }
}