/**
 * @file OpenAIAdapter - Integration adapter for OpenAI Chat Completions API
 * 
 * This adapter integrates the Universal AI Brain with the official OpenAI Node.js client,
 * providing intelligent memory, context injection, and MongoDB-powered features
 * to OpenAI chat completions.
 */

import { BaseFrameworkAdapter } from './BaseFrameworkAdapter';
import { UniversalAIBrain } from '../UniversalAIBrain';
import { FrameworkAdapter, FrameworkCapabilities, AdapterConfig } from '../types';
import OpenAI from 'openai';

export interface OpenAIAdapterConfig extends AdapterConfig {
  enableChatEnhancement?: boolean;
  enableStreamingSupport?: boolean;
  openaiApiKey?: string;
  baseURL?: string;
  organization?: string;
  project?: string;
}

/**
 * OpenAIAdapter - Integrates Universal AI Brain with OpenAI Chat Completions API
 * 
 * Features:
 * - Enhances OpenAI chat completions with MongoDB context injection
 * - Provides MongoDB-powered tools for chat
 * - Supports streaming and function calling
 * - Integrates with official OpenAI Node.js client
 */
export class OpenAIAdapter extends BaseFrameworkAdapter<OpenAI.Chat.Completions.ChatCompletion> {
  public readonly frameworkName = 'OpenAI';
  public readonly version = '1.0.0';
  private openaiClient?: OpenAI;

  constructor(config?: Partial<OpenAIAdapterConfig>) {
    super({
      enableMemoryInjection: true,
      enableContextEnhancement: true,
      enableToolIntegration: true,
      enableChatEnhancement: true,
      enableStreamingSupport: true,
      ...config
    });
  }

  get capabilities(): FrameworkCapabilities {
    return {
      supportsStreaming: true,
      supportsTools: true,
      supportsMemory: true,
      supportsMultiModal: true,
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

  getCapabilities(): FrameworkCapabilities {
    return this.capabilities;
  }

  /**
   * Integrate with OpenAI Chat Completions API
   */
  async integrate(brain: UniversalAIBrain): Promise<any> {
    await this.initialize(brain);
    
    // Initialize OpenAI client
    const config = this.config as OpenAIAdapterConfig;
    this.openaiClient = new OpenAI({
      apiKey: config.openaiApiKey || process.env.OPENAI_API_KEY,
      baseURL: config.baseURL,
      organization: config.organization,
      project: config.project
    });

    return {
      createEnhancedChat: this.createEnhancedChat.bind(this),
      createEnhancedStream: this.createEnhancedStream.bind(this),
      createMongoDBTools: this.createMongoDBTools.bind(this),
      enhancedClient: this.createEnhancedClient(),
      adapter: this
    };
  }

  /**
   * Create enhanced OpenAI chat completion with MongoDB superpowers
   */
  createEnhancedChat() {
    if (!this.brain || !this.openaiClient) {
      throw new Error('OpenAIAdapter not initialized. Call integrate() first.');
    }

    return async (
      params: OpenAI.Chat.Completions.ChatCompletionCreateParams,
      options?: { conversationId?: string; enhanceContext?: boolean }
    ): Promise<OpenAI.Chat.Completions.ChatCompletion> => {
      try {
        const conversationId = options?.conversationId || `openai_${Date.now()}`;
        const enhanceContext = options?.enhanceContext !== false;

        // Extract user message for context enhancement
        const userMessage = this.extractUserMessage(params.messages);
        
        if (enhanceContext && userMessage) {
          // Enhance with MongoDB context
          const enhanced = await this.brain!.enhancePrompt(userMessage, {
            conversationId,
            maxContextItems: 5,
            includeMemories: true,
            includeVectorSearch: true
          });

          // Replace user message with enhanced prompt
          params.messages = this.replaceUserMessage(params.messages, enhanced.enhancedPrompt);
        }

        // Add MongoDB tools if not provided
        if (!params.tools && this.config.enableToolIntegration) {
          params.tools = this.createMongoDBTools();
        }

        // Call real OpenAI API (ensure non-streaming)
        const nonStreamParams = { ...params, stream: false };
        const result = await this.openaiClient!.chat.completions.create(nonStreamParams) as OpenAI.Chat.Completions.ChatCompletion;

        // Store interaction for learning
        if (userMessage) {
          await this.brain!.storeInteractionPublic({
            conversationId,
            userMessage,
            assistantResponse: result.choices[0]?.message?.content || '',
            context: enhanceContext ? 'enhanced' : 'standard',
            framework: 'openai',
            metadata: {
              model: params.model,
              tokensUsed: result.usage?.total_tokens || 0,
              enhancementStrategy: enhanceContext ? 'hybrid' : 'none'
            }
          });
        }

        return result;
      } catch (error) {
        console.error('Error in enhanced OpenAI chat:', error);
        throw error;
      }
    };
  }

  /**
   * Create enhanced OpenAI streaming chat completion
   */
  createEnhancedStream() {
    if (!this.brain || !this.openaiClient) {
      throw new Error('OpenAIAdapter not initialized. Call integrate() first.');
    }

    return async (
      params: OpenAI.Chat.Completions.ChatCompletionCreateParams,
      options?: { conversationId?: string; enhanceContext?: boolean }
    ): Promise<Stream<OpenAI.Chat.Completions.ChatCompletionChunk>> => {
      try {
        const conversationId = options?.conversationId || `openai_stream_${Date.now()}`;
        const enhanceContext = options?.enhanceContext !== false;

        // Extract user message for context enhancement
        const userMessage = this.extractUserMessage(params.messages);
        
        if (enhanceContext && userMessage) {
          // Enhance with MongoDB context
          const enhanced = await this.brain!.enhancePrompt(userMessage, {
            conversationId,
            maxContextItems: 5,
            includeMemories: true,
            includeVectorSearch: true
          });

          // Replace user message with enhanced prompt
          params.messages = this.replaceUserMessage(params.messages, enhanced.enhancedPrompt);
        }

        // Add MongoDB tools if not provided
        if (!params.tools && this.config.enableToolIntegration) {
          params.tools = this.createMongoDBTools();
        }

        // Enable streaming
        const streamParams = { ...params, stream: true };

        // Call real OpenAI streaming API
        const stream = await this.openaiClient!.chat.completions.create(streamParams) as Stream<OpenAI.Chat.Completions.ChatCompletionChunk>;

        return stream;
      } catch (error) {
        console.error('Error in enhanced OpenAI streaming:', error);
        throw error;
      }
    };
  }

  /**
   * Create enhanced OpenAI client with all methods enhanced
   */
  createEnhancedClient(): OpenAI {
    if (!this.openaiClient) {
      throw new Error('OpenAIAdapter not initialized. Call integrate() first.');
    }

    // Create a proxy that enhances the chat.completions.create method
    const enhancedClient = new Proxy(this.openaiClient, {
      get: (target, prop) => {
        if (prop === 'chat') {
          return new Proxy(target.chat, {
            get: (chatTarget, chatProp) => {
              if (chatProp === 'completions') {
                return new Proxy(chatTarget.completions, {
                  get: (completionsTarget, completionsProp) => {
                    if (completionsProp === 'create') {
                      return this.createEnhancedChat();
                    }
                    return completionsTarget[completionsProp];
                  }
                });
              }
              return chatTarget[chatProp];
            }
          });
        }
        return target[prop];
      }
    });

    return enhancedClient;
  }

  // Helper methods
  private extractUserMessage(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]): string | null {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (lastUserMessage && 'content' in lastUserMessage && typeof lastUserMessage.content === 'string') {
      return lastUserMessage.content;
    }
    return null;
  }

  private replaceUserMessage(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    enhancedContent: string
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const result = [...messages];
    for (let i = result.length - 1; i >= 0; i--) {
      if (result[i].role === 'user') {
        result[i] = { role: 'user', content: enhancedContent };
        break;
      }
    }
    return result;
  }

  private createMongoDBTools(): OpenAI.Chat.Completions.ChatCompletionTool[] {
    return [
      {
        type: 'function',
        function: {
          name: 'search_memory',
          description: 'Search MongoDB memory for relevant information',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              limit: { type: 'number', description: 'Maximum results', default: 5 }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'store_memory',
          description: 'Store information in MongoDB memory',
          parameters: {
            type: 'object',
            properties: {
              content: { type: 'string', description: 'Content to store' },
              type: { type: 'string', description: 'Memory type', default: 'fact' }
            },
            required: ['content']
          }
        }
      }
    ];
  }

  // Framework-specific implementation methods
  public checkFrameworkAvailability(): boolean {
    try {
      require.resolve('openai');
      return true;
    } catch {
      console.warn('⚠️ OpenAI package not found. Install with: npm install openai');
      return false;
    }
  }

  public checkVersionCompatibility(): boolean {
    try {
      const openaiPackage = require('openai/package.json');
      const version = openaiPackage.version;
      // Check for v4+ (current major version)
      return version.startsWith('4.');
    } catch {
      return false;
    }
  }

  protected async setupFrameworkIntegration(): Promise<void> {
    console.log('🔌 Setting up OpenAI integration...');

    if (!this.checkFrameworkAvailability()) {
      console.warn('⚠️ OpenAI package not available - adapter will use fallback mode');
      return;
    }

    if (!this.checkVersionCompatibility()) {
      console.warn('⚠️ OpenAI package version compatibility issue detected');
    }

    console.log('✅ OpenAI integration ready');
  }

  protected createIntelligentTools(): any[] {
    return this.createMongoDBTools();
  }

  /**
   * Enhance OpenAI request with brain capabilities
   */
  async enhanceWithBrain(input: any, options?: any): Promise<any> {
    if (!this.brain) {
      throw new Error('Brain not initialized');
    }

    // If it's a chat completion request, enhance it
    if (input.messages) {
      const userMessage = this.extractUserMessage(input.messages);
      if (userMessage) {
        const enhanced = await this.brain.enhancePrompt(userMessage, {
          conversationId: options?.conversationId || `openai_${Date.now()}`,
          maxContextItems: 5,
          includeMemories: true,
          includeVectorSearch: true
        });

        // Replace user message with enhanced prompt
        input.messages = this.replaceUserMessage(input.messages, enhanced.enhancedPrompt);
      }
    }

    return input;
  }
}

// Type imports for streaming
type Stream<T> = AsyncIterable<T> & {
  controller: AbortController;
};
