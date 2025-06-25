/**
 * @file OpenAIAgentsAdapter - Integration adapter for OpenAI Agents JS framework
 * 
 * This adapter integrates the Universal AI Brain with OpenAI Agents JS,
 * providing intelligent memory, context injection, and MongoDB-powered features
 * to OpenAI Agents applications.
 */

import { BaseFrameworkAdapter } from './BaseFrameworkAdapter';
import { UniversalAIBrain } from '../brain/UniversalAIBrain';
import { FrameworkAdapter, FrameworkCapabilities, AdapterConfig } from '../types';

// OpenAI Agents types (will be imported from @openai/agents when available)
interface OpenAIAgent {
  name?: string;
  instructions?: string;
  model?: string;
  tools?: any[];
  run(input: string, options?: any): Promise<any>;
  stream(input: string, options?: any): Promise<any>;
}

interface OpenAITool {
  name: string;
  description: string;
  input_schema?: any;
  output_schema?: any;
  func: (args: any) => Promise<any>;
}

interface OpenAIRunResult {
  finalOutput: string;
  history: any[];
  state: any;
}

export interface OpenAIAgentsAdapterConfig extends AdapterConfig {
  enableAgentEnhancement?: boolean;
  enableToolIntegration?: boolean;
  enableMemoryPersistence?: boolean;
}

/**
 * OpenAIAgentsAdapter - Integrates Universal AI Brain with OpenAI Agents JS
 * 
 * Features:
 * - Enhances OpenAI agents with MongoDB context injection
 * - Provides MongoDB-powered tools for agents
 * - Persists agent conversations and state in MongoDB
 * - Integrates with OpenAI Agents handoff system
 */
export class OpenAIAgentsAdapter extends BaseFrameworkAdapter<OpenAIAgent> {
  public readonly frameworkName = 'OpenAI Agents JS';
  public readonly version = '1.0.0';

  private enhancedAgents: Map<string, OpenAIAgent> = new Map();

  constructor(config?: Partial<OpenAIAgentsAdapterConfig>) {
    super({
      enableMemoryInjection: true,
      enableContextEnhancement: true,
      enableToolIntegration: true,
      enableAgentEnhancement: true,
      enableMemoryPersistence: true,
      ...config
    });
  }

  /**
   * Integrate with OpenAI Agents JS framework
   */
  async integrate(brain: UniversalAIBrain): Promise<any> {
    await this.initialize(brain);
    
    return {
      createEnhancedAgent: this.createEnhancedAgent.bind(this),
      createMongoDBTools: this.createMongoDBTools.bind(this),
      enhanceExistingAgent: this.enhanceExistingAgent.bind(this),
      mongoDBMemoryTool: this.createMemoryTool(),
      adapter: this
    };
  }

  /**
   * Create an enhanced OpenAI agent with MongoDB superpowers
   */
  createEnhancedAgent(config: {
    name?: string;
    instructions?: string;
    model?: string;
    tools?: OpenAITool[];
    conversationId?: string;
  }): OpenAIAgent {
    if (!this.brain) {
      throw new Error('OpenAIAgentsAdapter not initialized. Call integrate() first.');
    }

    const agentId = config.name?.toLowerCase().replace(/\s+/g, '_') || 'openai_agent';
    const conversationId = config.conversationId || agentId;

    // Add MongoDB tools to the agent's tools
    const mongoDBTools = this.createMongoDBTools();
    const allTools = [...(config.tools || []), ...mongoDBTools];

    const enhancedAgent: OpenAIAgent = {
      name: config.name,
      instructions: config.instructions,
      model: config.model,
      tools: allTools,

      // Enhanced run method with context injection
      run: async (input: string, options?: any) => {
        try {
          // Enhance input with MongoDB context
          const enhanced = await this.brain!.enhancePrompt(input, {
            frameworkType: 'openai-agents',
            conversationId,
            enhancementStrategy: 'hybrid'
          });

          // Call original OpenAI agent with enhanced input
          const result = await this.callOriginalAgent(
            config,
            enhanced.enhancedPrompt,
            { ...options, tools: allTools }
          );

          // Store interaction for learning
          await this.brain!.storeInteraction({
            conversationId,
            userMessage: input,
            assistantResponse: result.finalOutput || JSON.stringify(result),
            context: enhanced.injectedContext,
            framework: 'openai-agents',
            metadata: {
              agentName: config.name,
              model: config.model,
              enhancementStrategy: 'hybrid',
              toolsUsed: result.toolsUsed || []
            }
          });

          return {
            ...result,
            enhancedContext: enhanced.injectedContext,
            originalInput: input,
            enhancedInput: enhanced.enhancedPrompt
          };
        } catch (error) {
          console.error('Error in enhanced OpenAI agent run:', error);
          // Fallback to original agent
          return this.callOriginalAgent(config, input, options);
        }
      },

      // Enhanced stream method
      stream: async (input: string, options?: any) => {
        try {
          const enhanced = await this.brain!.enhancePrompt(input, {
            frameworkType: 'openai-agents',
            conversationId,
            enhancementStrategy: 'hybrid'
          });

          const stream = await this.callOriginalAgentStream(
            config,
            enhanced.enhancedPrompt,
            { ...options, tools: allTools }
          );

          // Store interaction when stream completes
          this.storeStreamInteraction(conversationId, input, enhanced.injectedContext, config.name, stream);

          return stream;
        } catch (error) {
          console.error('Error in enhanced OpenAI agent stream:', error);
          return this.callOriginalAgentStream(config, input, options);
        }
      }
    };

    this.enhancedAgents.set(agentId, enhancedAgent);
    return enhancedAgent;
  }

  /**
   * Enhance an existing OpenAI agent with MongoDB capabilities
   */
  enhanceExistingAgent(agent: OpenAIAgent, conversationId?: string): OpenAIAgent {
    if (!this.brain) {
      throw new Error('OpenAIAgentsAdapter not initialized. Call integrate() first.');
    }

    const agentId = agent.name?.toLowerCase().replace(/\s+/g, '_') || 'enhanced_agent';
    const convId = conversationId || agentId;

    // Store original methods
    const originalRun = agent.run;
    const originalStream = agent.stream;

    // Add MongoDB tools
    const mongoDBTools = this.createMongoDBTools();
    agent.tools = [...(agent.tools || []), ...mongoDBTools];

    // Enhance run method
    agent.run = async (input: string, options?: any) => {
      try {
        const enhanced = await this.brain!.enhancePrompt(input, {
          frameworkType: 'openai-agents',
          conversationId: convId,
          enhancementStrategy: 'hybrid'
        });

        const result = await originalRun.call(agent, enhanced.enhancedPrompt, options);

        await this.brain!.storeInteraction({
          conversationId: convId,
          userMessage: input,
          assistantResponse: result.finalOutput || JSON.stringify(result),
          context: enhanced.injectedContext,
          framework: 'openai-agents',
          metadata: {
            agentName: agent.name,
            enhanced: true
          }
        });

        return result;
      } catch (error) {
        console.error('Error in enhanced agent run:', error);
        return originalRun.call(agent, input, options);
      }
    };

    // Enhance stream method
    agent.stream = async (input: string, options?: any) => {
      try {
        const enhanced = await this.brain!.enhancePrompt(input, {
          frameworkType: 'openai-agents',
          conversationId: convId,
          enhancementStrategy: 'hybrid'
        });

        return originalStream.call(agent, enhanced.enhancedPrompt, options);
      } catch (error) {
        console.error('Error in enhanced agent stream:', error);
        return originalStream.call(agent, input, options);
      }
    };

    return agent;
  }

  /**
   * Create MongoDB-powered tools for OpenAI agents
   */
  private createMongoDBTools(): OpenAITool[] {
    return [
      {
        name: 'search_mongodb_knowledge',
        description: 'Search the MongoDB knowledge base for relevant information',
        input_schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results',
              default: 5
            }
          },
          required: ['query']
        },
        func: async ({ query, limit = 5 }: { query: string; limit?: number }) => {
          if (!this.brain) return 'MongoDB brain not available';

          const results = await this.brain.retrieveRelevantContext(query, {
            limit,
            framework: 'openai-agents'
          });

          return results.map(r => ({
            content: r.content,
            relevanceScore: r.relevanceScore,
            source: r.source,
            metadata: r.metadata
          }));
        }
      },
      {
        name: 'store_mongodb_memory',
        description: 'Store information in MongoDB for future reference',
        input_schema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The content to store'
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata'
            }
          },
          required: ['content']
        },
        func: async ({ content, metadata = {} }: { content: string; metadata?: any }) => {
          if (!this.brain) return 'MongoDB brain not available';

          try {
            await this.brain.storeInteraction({
              conversationId: 'openai-agents-memory',
              userMessage: 'Store memory',
              assistantResponse: content,
              context: [],
              framework: 'openai-agents',
              metadata: {
                type: 'tool_storage',
                ...metadata
              }
            });

            return 'Information stored successfully in MongoDB';
          } catch (error) {
            return `Error storing information: ${error.message}`;
          }
        }
      }
    ];
  }

  /**
   * Create a memory tool for persistent conversations
   */
  private createMemoryTool(): OpenAITool {
    return {
      name: 'mongodb_memory',
      description: 'Access conversation memory and context from MongoDB',
      input_schema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['retrieve', 'store'],
            description: 'Whether to retrieve or store memory'
          },
          query: {
            type: 'string',
            description: 'Query for retrieving memory or content to store'
          },
          conversationId: {
            type: 'string',
            description: 'Conversation ID for context'
          }
        },
        required: ['action', 'query']
      },
      func: async ({ action, query, conversationId }: { 
        action: 'retrieve' | 'store'; 
        query: string; 
        conversationId?: string;
      }) => {
        if (!this.brain) return 'MongoDB brain not available';

        if (action === 'retrieve') {
          const results = await this.brain.retrieveRelevantContext(query, {
            conversationId,
            framework: 'openai-agents',
            limit: 10
          });

          return results.map(r => ({
            content: r.content,
            timestamp: r.timestamp,
            relevanceScore: r.relevanceScore
          }));
        } else {
          await this.brain.storeInteraction({
            conversationId: conversationId || 'openai-agents-default',
            userMessage: 'Memory storage',
            assistantResponse: query,
            context: [],
            framework: 'openai-agents',
            metadata: { type: 'memory_tool' }
          });

          return 'Memory stored successfully';
        }
      }
    };
  }

  // Framework-specific implementation methods
  protected checkFrameworkAvailability(): boolean {
    try {
      // Try to import REAL OpenAI Agents framework
      require.resolve('@openai/agents');
      return true;
    } catch {
      console.warn('⚠️ OpenAI Agents JS not found. Install with: npm install @openai/agents');
      return false;
    }
  }

  protected checkVersionCompatibility(): boolean {
    try {
      const packageJson = require('@openai/agents/package.json');
      const version = packageJson.version;

      // Check if version is 0.0.1 or higher (based on docs)
      const [major, minor, patch] = version.split('.').map(Number);
      if (major > 0 || (major === 0 && minor >= 0 && patch >= 1)) {
        return true;
      }

      console.warn(`⚠️ OpenAI Agents JS version ${version} detected. Version 0.0.1+ recommended.`);
      return false;
    } catch {
      // If we can't check version, assume it's compatible
      return true;
    }
  }

  protected async setupFrameworkIntegration(): Promise<void> {
    console.log('🔌 Setting up OpenAI Agents JS integration...');

    if (!this.checkFrameworkAvailability()) {
      console.warn('⚠️ OpenAI Agents JS not available - adapter will use fallback mode');
      return;
    }

    if (!this.checkVersionCompatibility()) {
      console.warn('⚠️ OpenAI Agents JS version compatibility issue detected');
    }

    console.log('✅ OpenAI Agents JS integration ready');
  }

  protected createIntelligentTools(): any[] {
    return this.createMongoDBTools();
  }

  // Helper methods - REAL OpenAI Agents integration
  private async callOriginalAgent(config: any, input: string, options?: any): Promise<any> {
    try {
      // Import REAL OpenAI Agents classes
      const { Agent, run } = await import('@openai/agents');

      // Create REAL OpenAI Agent
      const agent = new Agent({
        name: config.name || 'Enhanced Agent',
        instructions: config.instructions || 'You are an enhanced agent powered by MongoDB context.',
        tools: config.tools || [],
        handoffs: config.handoffs || [],
        guardrails: config.guardrails || []
      });

      // Call REAL OpenAI Agents run function
      const result = await run(agent, input, options);

      return {
        finalOutput: result.finalOutput,
        history: result.history || [],
        state: result.state || { completed: true },
        toolsUsed: result.newItems?.filter(item => item.type === 'tool_call') || [],
        lastAgent: result.lastAgent,
        runId: result.runId
      };
    } catch (error) {
      // If OpenAI Agents not available, provide graceful fallback
      if (error.code === 'MODULE_NOT_FOUND') {
        console.warn('⚠️ OpenAI Agents JS not installed. Install with: npm install @openai/agents');
        return {
          finalOutput: `[Fallback] Enhanced response would be generated here with MongoDB context. Install '@openai/agents' package for real integration.`,
          history: [{ role: 'user', content: input }],
          state: { completed: true, fallback: true },
          toolsUsed: []
        };
      }
      throw error;
    }
  }

  private async callOriginalAgentStream(config: any, input: string, options?: any): Promise<any> {
    try {
      // Import REAL OpenAI Agents classes
      const { Agent, run } = await import('@openai/agents');

      // Create REAL OpenAI Agent
      const agent = new Agent({
        name: config.name || 'Enhanced Streaming Agent',
        instructions: config.instructions || 'You are an enhanced streaming agent powered by MongoDB context.',
        tools: config.tools || [],
        handoffs: config.handoffs || [],
        guardrails: config.guardrails || []
      });

      // Call REAL OpenAI Agents run function with streaming
      const stream = await run(agent, input, { ...options, stream: true });

      return stream;
    } catch (error) {
      // If OpenAI Agents not available, provide graceful fallback
      if (error.code === 'MODULE_NOT_FOUND') {
        console.warn('⚠️ OpenAI Agents JS not installed. Install with: npm install @openai/agents');
        return {
          async *[Symbol.asyncIterator]() {
            yield { type: 'text', content: '[Fallback] Enhanced streaming response would be generated here with MongoDB context. ' };
            yield { type: 'text', content: 'Install "@openai/agents" package for real integration.' };
          }
        };
      }
      throw error;
    }
  }

  private async storeStreamInteraction(
    conversationId: string,
    input: string,
    context: any[],
    agentName?: string,
    stream?: any
  ): Promise<void> {
    // Collect stream response and store interaction
    // This would be implemented based on actual OpenAI Agents stream format
  }

  /**
   * Get framework capabilities
   */
  getCapabilities(): FrameworkCapabilities {
    return {
      supportsStreaming: true,
      supportsTools: true,
      supportsMultiModal: true,
      supportsMemory: true,
      supportedModels: [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-3.5-turbo',
        'gpt-4o-realtime-preview'
      ],
      maxContextLength: 128000
    };
  }

  /**
   * Enhanced framework integration method
   */
  enhanceWithBrain(originalFunction: any, brain: UniversalAIBrain): any {
    return async (...args: any[]) => {
      try {
        // Extract agent configuration from arguments
        const config = args[0];
        if (config && typeof config === 'object') {
          // Create enhanced agent instead of original
          return this.createEnhancedAgent(config);
        }

        return await originalFunction(...args);
      } catch (error) {
        console.error('Error in enhanceWithBrain:', error);
        return await originalFunction(...args);
      }
    };
  }

  /**
   * Validate that the adapter is working with REAL OpenAI Agents framework
   */
  async validateRealIntegration(): Promise<boolean> {
    try {
      // Try to import the actual OpenAI Agents classes
      const { Agent, run, tool } = await import('@openai/agents');

      // Verify they are functions/constructors
      if (typeof Agent !== 'function' ||
          typeof run !== 'function' ||
          typeof tool !== 'function') {
        return false;
      }

      console.log('✅ REAL OpenAI Agents JS integration validated');
      return true;
    } catch (error) {
      console.warn('⚠️ REAL OpenAI Agents JS not available - using fallback mode');
      return false;
    }
  }
}
