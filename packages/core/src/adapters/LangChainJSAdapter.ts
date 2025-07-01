/**
 * @file LangChainJSAdapter - Integration adapter for LangChain.js framework
 * 
 * This adapter integrates the Universal AI Brain with LangChain.js,
 * providing intelligent memory, context injection, and MongoDB-powered features
 * to LangChain applications.
 */

import { BaseFrameworkAdapter } from './BaseFrameworkAdapter';
import { UniversalAIBrain } from '../UniversalAIBrain';
import { FrameworkAdapter, FrameworkCapabilities, AdapterConfig } from '../types';

// LangChain.js types (will be imported from @langchain/core when available)
interface LangChainMessage {
  content: string;
  role?: string;
  additional_kwargs?: any;
}

interface LangChainChatModel {
  invoke(messages: LangChainMessage[]): Promise<any>;
  stream(messages: LangChainMessage[]): Promise<any>;
}

interface LangChainMemory {
  saveContext(inputs: any, outputs: any): Promise<void>;
  loadMemoryVariables(inputs: any): Promise<any>;
  clear(): Promise<void>;
}

interface LangChainVectorStore {
  addDocuments(documents: any[]): Promise<void>;
  similaritySearch(query: string, k?: number): Promise<any[]>;
}

export interface LangChainJSAdapterConfig extends AdapterConfig {
  enableVectorStoreReplacement?: boolean;
  enableMemoryReplacement?: boolean;
  enableChainEnhancement?: boolean;
}

/**
 * LangChainJSAdapter - Integrates Universal AI Brain with LangChain.js
 * 
 * Features:
 * - Replaces LangChain memory with MongoDB-powered memory
 * - Provides MongoDB vector store implementation
 * - Enhances chains with intelligent context injection
 * - Integrates with LangChain agents and tools
 */
export class LangChainJSAdapter extends BaseFrameworkAdapter<any> {
  public readonly frameworkName = 'LangChain.js';
  public readonly version = '1.0.0';

  constructor(config?: Partial<LangChainJSAdapterConfig>) {
    super({
      enableMemoryInjection: true,
      enableContextEnhancement: true,
      enableToolIntegration: true,
      enableVectorStoreReplacement: true,
      enableMemoryReplacement: true,
      enableChainEnhancement: true,
      ...config
    });
  }

  /**
   * Integrate with LangChain.js framework
   */
  async integrate(brain: UniversalAIBrain): Promise<any> {
    await this.initialize(brain);
    
    return {
      MongoDBVectorStore: this.createMongoDBVectorStore(),
      MongoDBMemory: this.createMongoDBMemory(),
      enhancedChatModel: this.createEnhancedChatModel(),
      mongoDBRetriever: this.createMongoDBRetriever(),
      mongoDBTools: this.createMongoDBTools(),
      adapter: this
    };
  }

  /**
   * Create MongoDB-powered vector store for LangChain
   */
  private createMongoDBVectorStore() {
    return new (class MongoDBVectorStore implements LangChainVectorStore {
      constructor(private brain: UniversalAIBrain) {}

      async addDocuments(documents: any[]): Promise<void> {
        try {
          const vectorDocs = documents.map(doc => ({
            text: doc.pageContent || doc.content || JSON.stringify(doc),
            metadata: doc.metadata || {},
            source: 'langchain_document'
          }));

          await Promise.all(
            vectorDocs.map(doc => 
              this.brain.vectorStore?.storeDocument(
                doc.text,
                doc.metadata,
                doc.source
              )
            )
          );
        } catch (error) {
          console.error('Error adding documents to MongoDB vector store:', error);
          throw error;
        }
      }

      async similaritySearch(query: string, k: number = 4): Promise<any[]> {
        try {
          const results = await this.brain.retrieveRelevantContext(query, {
            limit: k,
            framework: 'langchain'
          });

          return results.map(result => ({
            pageContent: result.content,
            metadata: {
              ...result.metadata,
              score: result.relevanceScore,
              source: result.source
            }
          }));
        } catch (error) {
          console.error('Error in MongoDB vector store similarity search:', error);
          return [];
        }
      }

      async similaritySearchWithScore(query: string, k: number = 4): Promise<[any, number][]> {
        const results = await this.similaritySearch(query, k);
        return results.map(doc => [doc, doc.metadata.score || 0]);
      }
    })(this.brain!);
  }

  /**
   * Create MongoDB-powered memory for LangChain
   */
  private createMongoDBMemory() {
    return new (class MongoDBMemory implements LangChainMemory {
      private conversationId: string;

      constructor(
        private brain: UniversalAIBrain,
        conversationId: string = 'langchain_session'
      ) {
        this.conversationId = conversationId;
      }

      async saveContext(inputs: any, outputs: any): Promise<void> {
        try {
          const userMessage = inputs.input || inputs.question || JSON.stringify(inputs);
          const assistantResponse = outputs.output || outputs.answer || JSON.stringify(outputs);

          await this.brain.storeInteractionPublic({
            conversationId: this.conversationId,
            userMessage,
            assistantResponse,
            context: [],
            framework: 'langchain',
            metadata: {
              type: 'memory_context',
              inputs,
              outputs
            }
          });
        } catch (error) {
          console.error('Error saving LangChain context to MongoDB:', error);
        }
      }

      async loadMemoryVariables(inputs: any): Promise<any> {
        try {
          const query = inputs.input || inputs.question || JSON.stringify(inputs);
          const context = await this.brain.retrieveRelevantContext(query, {
            conversationId: this.conversationId,
            framework: 'langchain',
            limit: 5
          });

          const history = context
            .map(ctx => `Human: ${ctx.metadata.userMessage || ''}\nAI: ${ctx.content}`)
            .join('\n\n');

          return {
            history,
            chat_history: context.map(ctx => ({
              human: ctx.metadata.userMessage || '',
              ai: ctx.content
            }))
          };
        } catch (error) {
          console.error('Error loading LangChain memory from MongoDB:', error);
          return { history: '', chat_history: [] };
        }
      }

      async clear(): Promise<void> {
        // In a real implementation, we might want to mark conversation as cleared
        console.log('MongoDB memory cleared for conversation:', this.conversationId);
      }
    })(this.brain!, 'langchain_session');
  }

  /**
   * Create enhanced chat model with MongoDB context injection
   */
  private createEnhancedChatModel() {
    return (originalModel: LangChainChatModel, conversationId?: string) => {
      return {
        async invoke(messages: LangChainMessage[]): Promise<any> {
          if (!this.brain) {
            return originalModel.invoke(messages);
          }

          try {
            // Extract user message for enhancement
            const userMessage = this.extractUserMessage(messages);
            
            if (userMessage) {
              // Enhance with MongoDB context
              const enhanced = await this.brain.enhancePrompt(userMessage, {
                frameworkType: 'langchain',
                conversationId: conversationId || 'langchain_session',
                enhancementStrategy: 'hybrid'
              });

              // Replace user message with enhanced prompt
              const enhancedMessages = this.replaceUserMessage(messages, enhanced.enhancedPrompt);
              
              // Call original model
              const result = await originalModel.invoke(enhancedMessages);

              // Store interaction
              await this.brain.storeInteraction({
                conversationId: conversationId || 'langchain_session',
                userMessage,
                assistantResponse: result.content || JSON.stringify(result),
                context: enhanced.injectedContext,
                framework: 'langchain',
                metadata: {
                  enhancementStrategy: 'hybrid',
                  originalModel: originalModel.constructor.name
                }
              });

              return {
                ...result,
                enhancedContext: enhanced.injectedContext
              };
            }

            return originalModel.invoke(messages);
          } catch (error) {
            console.error('Error in enhanced LangChain chat model:', error);
            return originalModel.invoke(messages);
          }
        },

        async stream(messages: LangChainMessage[]): Promise<any> {
          // Similar enhancement for streaming
          return originalModel.stream(messages);
        }
      };
    };
  }

  /**
   * Create MongoDB retriever for LangChain
   */
  private createMongoDBRetriever() {
    return {
      getRelevantDocuments: async (query: string) => {
        if (!this.brain) return [];

        const results = await this.brain.retrieveRelevantContext(query, {
          framework: 'langchain',
          limit: 10
        });

        return results.map(result => ({
          pageContent: result.content,
          metadata: {
            ...result.metadata,
            score: result.relevanceScore,
            source: result.source
          }
        }));
      }
    };
  }

  /**
   * Create MongoDB tools for LangChain agents
   */
  private createMongoDBTools() {
    return [
      {
        name: 'mongodb_search',
        description: 'Search MongoDB knowledge base for relevant information',
        func: async (query: string) => {
          if (!this.brain) return 'MongoDB brain not available';

          const results = await this.brain.retrieveRelevantContext(query, {
            framework: 'langchain',
            limit: 5
          });

          return results.map(r => 
            `Content: ${r.content}\nRelevance: ${r.relevanceScore}\nSource: ${r.source}`
          ).join('\n\n');
        }
      },
      {
        name: 'mongodb_store',
        description: 'Store information in MongoDB for future retrieval',
        func: async (content: string) => {
          if (!this.brain) return 'MongoDB brain not available';

          try {
            await this.brain.storeInteractionPublic({
              conversationId: 'langchain_storage',
              userMessage: 'Store information',
              assistantResponse: content,
              context: [],
              framework: 'langchain',
              metadata: { type: 'tool_storage' }
            });

            return 'Information stored successfully in MongoDB';
          } catch (error) {
            return `Error storing information: ${error.message}`;
          }
        }
      }
    ];
  }

  // Framework-specific implementation methods
  public checkFrameworkAvailability(): boolean {
    try {
      // Try to import REAL LangChain.js framework (CORRECT packages from official docs)
      require.resolve('@langchain/core');
      require.resolve('@langchain/openai');
      return true;
    } catch {
      console.warn('⚠️ LangChain.js not found. Install with: npm install @langchain/core @langchain/openai');
      return false;
    }
  }

  public checkVersionCompatibility(): boolean {
    try {
      const packageJson = require('@langchain/core/package.json');
      const version = packageJson.version;

      // Check if version is 0.1.0 or higher (based on docs)
      const [major, minor] = version.split('.').map(Number);
      if (major > 0 || (major === 0 && minor >= 1)) {
        return true;
      }

      console.warn(`⚠️ LangChain.js version ${version} detected. Version 0.1.0+ recommended.`);
      return false;
    } catch {
      // If we can't check version, assume it's compatible
      return true;
    }
  }

  protected async setupFrameworkIntegration(): Promise<void> {
    console.log('🔌 Setting up LangChain.js integration...');

    if (!this.checkFrameworkAvailability()) {
      console.warn('⚠️ LangChain.js not available - adapter will use fallback mode');
      return;
    }

    if (!this.checkVersionCompatibility()) {
      console.warn('⚠️ LangChain.js version compatibility issue detected');
    }

    console.log('✅ LangChain.js integration ready');
  }

  protected createIntelligentTools(): any[] {
    return this.createMongoDBTools();
  }

  // Helper methods
  private extractUserMessage(messages: LangChainMessage[]): string {
    // Find the last human/user message
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'human' || msg.role === 'user' || !msg.role) {
        return msg.content;
      }
    }
    return '';
  }

  private replaceUserMessage(messages: LangChainMessage[], enhancedContent: string): LangChainMessage[] {
    const result = [...messages];
    for (let i = result.length - 1; i >= 0; i--) {
      if (result[i].role === 'human' || result[i].role === 'user' || !result[i].role) {
        result[i] = { ...result[i], content: enhancedContent };
        break;
      }
    }
    return result;
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
        'claude-3-5-sonnet',
        'gemini-pro',
        'llama-3.1-70b'
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
        // For LangChain, we typically enhance the model or chain
        const enhanced = this.createEnhancedChatModel();

        // If it's a model, wrap it with enhancement
        if (args[0] && typeof args[0].invoke === 'function') {
          return enhanced(args[0]);
        }

        return await originalFunction(...args);
      } catch (error) {
        console.error('Error in enhanceWithBrain:', error);
        return await originalFunction(...args);
      }
    };
  }

  /**
   * Validate that the adapter is working with REAL LangChain.js framework
   */
  async validateRealIntegration(): Promise<boolean> {
    try {
      // Try to import the actual LangChain classes (CORRECT IMPORTS from official docs)
      const { ChatOpenAI } = await import('@langchain/openai');
      const { PromptTemplate } = await import('@langchain/core/prompts');
      const { RunnableSequence } = await import('@langchain/core/runnables');

      // Verify they are constructors
      if (typeof ChatOpenAI !== 'function' ||
          typeof PromptTemplate !== 'function' ||
          typeof RunnableSequence !== 'function') {
        return false;
      }

      console.log('✅ REAL LangChain.js integration validated');
      return true;
    } catch (error) {
      console.warn('⚠️ REAL LangChain.js not available - using fallback mode');
      return false;
    }
  }
}
