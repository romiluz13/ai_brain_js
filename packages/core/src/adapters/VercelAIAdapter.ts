/**
 * @file VercelAIAdapter - Integration adapter for Vercel AI SDK
 * 
 * This adapter integrates the Universal AI Brain with Vercel AI SDK,
 * providing intelligent memory, context injection, and MongoDB-powered features
 * to AI SDK applications.
 */

import { BaseFrameworkAdapter } from './BaseFrameworkAdapter';
import { UniversalAIBrain } from '../UniversalAIBrain';
import { ObjectId } from 'mongodb';
import { FrameworkAdapter, FrameworkCapabilities, AdapterConfig } from '../types';
import { TracingEngine, TracingUtils, FrameworkMetadata } from '../tracing';

// Vercel AI SDK types (will be imported from 'ai' when available)
interface AISDKMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  id?: string;
}

interface AISDKGenerateOptions {
  model?: any;
  messages: AISDKMessage[];
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
  toolChoice?: any;
}

interface AISDKStreamOptions extends AISDKGenerateOptions {
  onFinish?: (result: any) => void;
  onChunk?: (chunk: any) => void;
}

export interface VercelAIAdapterConfig extends Omit<AdapterConfig, 'enableToolIntegration'> {
  enableStreamEnhancement?: boolean;
  enableToolIntegration?: boolean;
  enableChatMemory?: boolean;
}

/**
 * VercelAIAdapter - Integrates Universal AI Brain with Vercel AI SDK
 * 
 * Features:
 * - Enhances generateText and streamText with MongoDB context
 * - Provides intelligent memory for chat applications
 * - Integrates MongoDB vector search as tools
 * - Supports both streaming and non-streaming responses
 */
export class VercelAIAdapter extends BaseFrameworkAdapter<any> {
  public readonly frameworkName = 'Vercel AI SDK';
  public readonly version = '1.0.0';

  private originalGenerateText?: Function;
  private originalStreamText?: Function;
  private originalGenerateObject?: Function;
  private tracingEngine?: TracingEngine;

  constructor(config?: Partial<VercelAIAdapterConfig>) {
    super({
      enableMemoryInjection: true,
      enableContextEnhancement: true,
      enableToolIntegration: true,
      enableStreamEnhancement: true,
      enableChatMemory: true,
      ...config
    });
  }

  /**
   * Integrate with Vercel AI SDK
   */
  async integrate(brain: UniversalAIBrain, tracingEngine?: TracingEngine): Promise<any> {
    await this.initialize(brain);
    this.tracingEngine = tracingEngine;

    // Return enhanced AI SDK functions
    return {
      generateText: this.createEnhancedGenerateText(),
      streamText: this.createEnhancedStreamText(),
      generateObject: this.createEnhancedGenerateObject(),
      createMongoDBTools: this.createMongoDBTools(),
      adapter: this
    };
  }

  /**
   * Create enhanced generateText function with MongoDB context injection and enterprise tracing
   */
  private createEnhancedGenerateText() {
    return async (options: AISDKGenerateOptions & { conversationId?: string }) => {
      if (!this.brain) {
        throw new Error('VercelAIAdapter not initialized. Call integrate() first.');
      }

      let traceId: string | undefined;
      let contextStepId: string | undefined;
      let frameworkStepId: string | undefined;

      try {
        // Extract user message for enhancement
        const userMessage = this.extractLatestUserMessage(options.messages);

        // Start enterprise tracing if available
        if (this.tracingEngine && userMessage) {
          const frameworkMetadata: FrameworkMetadata = {
            frameworkName: 'vercel-ai',
            frameworkVersion: this.version,
            vercelAI: {
              model: options.model?.modelId || 'unknown',
              provider: options.model?.provider || 'unknown',
              streaming: false,
              tools: options.tools?.map(t => t.name || 'unnamed') || []
            }
          };

          traceId = await this.tracingEngine.startTrace({
            agentId: new ObjectId(this.brain.getAgentId()),
            sessionId: options.conversationId || 'vercel-ai-session',
            conversationId: options.conversationId,
            operation: {
              type: 'generate_text',
              description: 'Vercel AI generateText with MongoDB enhancement',
              userInput: userMessage
            },
            framework: frameworkMetadata,
            tags: ['vercel-ai', 'generate-text', 'mongodb-enhanced']
          });
        }

        if (userMessage) {
          // Start context injection step
          if (traceId) {
            contextStepId = await this.tracingEngine!.startStep(traceId, {
              stepType: 'context_injection',
              input: { userMessage, strategy: 'hybrid' }
            });
          }

          // Enhance prompt with MongoDB context
          const enhanced = await this.brain.enhancePrompt(userMessage, {
            frameworkType: 'vercel-ai',
            conversationId: options.conversationId,
            enhancementStrategy: 'hybrid'
          });

          // Complete context injection step
          if (traceId && contextStepId) {
            await this.tracingEngine!.completeStep(traceId, contextStepId, {
              output: {
                enhancedPrompt: enhanced.enhancedPrompt,
                contextCount: enhanced.injectedContext.length,
                relevanceScores: enhanced.injectedContext.map(c => c.relevanceScore)
              }
            });

            // Record context used
            const contextItems = enhanced.injectedContext.map(ctx =>
              TracingUtils.createContextItem(
                ctx.source,
                ctx.content,
                ctx.relevanceScore,
                0, // We don't have individual retrieval times
                ctx.metadata
              )
            );
            await this.tracingEngine!.recordContextUsed(traceId, contextItems);
          }

          // Replace user message with enhanced prompt
          const enhancedMessages = this.replaceUserMessage(options.messages, enhanced.enhancedPrompt);

          // Start framework call step
          if (traceId) {
            frameworkStepId = await this.tracingEngine!.startStep(traceId, {
              stepType: 'framework_call',
              input: {
                model: options.model?.modelId,
                temperature: options.temperature,
                maxTokens: options.maxTokens,
                messageCount: enhancedMessages.length
              }
            });
          }

          // Call AI SDK with enhanced messages
          const result = await this.callAISDKGenerateText({
            ...options,
            messages: enhancedMessages
          });

          // Complete framework call step
          if (traceId && frameworkStepId) {
            await this.tracingEngine!.completeStep(traceId, frameworkStepId, {
              output: {
                text: result.text,
                finishReason: result.finishReason,
                usage: result.usage
              }
            });
          }

          // Store interaction for learning
          await this.brain.storeInteractionPublic({
            conversationId: options.conversationId || 'vercel-ai-session',
            userMessage,
            assistantResponse: result.text,
            context: enhanced.injectedContext,
            framework: 'vercel-ai',
            metadata: {
              model: options.model?.modelId || 'unknown',
              enhancementStrategy: 'hybrid',
              temperature: options.temperature,
              maxTokens: options.maxTokens,
              traceId
            }
          });

          // Complete trace
          if (traceId) {
            await this.tracingEngine!.completeTrace(traceId, {
              status: 'completed',
              finalOutput: result.text,
              outputType: 'text',
              tokensUsed: result.usage ? TracingUtils.createTokenUsage(
                result.usage.promptTokens || 0,
                result.usage.completionTokens || 0,
                0,
                {
                  inputTokens: result.usage.promptTokens || 0,
                  outputTokens: result.usage.completionTokens || 0
                }
              ) : undefined,
              cost: result.usage ? TracingUtils.createCostBreakdown({
                completionCost: this.calculateCost(result.usage.completionTokens || 0, 'completion'),
                promptCost: this.calculateCost(result.usage.promptTokens || 0, 'prompt')
              }) : undefined
            });
          }

          return {
            ...result,
            enhancedContext: enhanced.injectedContext,
            originalPrompt: userMessage,
            enhancedPrompt: enhanced.enhancedPrompt,
            traceId
          };
        }

        // No user message to enhance, call original
        const result = await this.callAISDKGenerateText(options);

        // Complete trace for non-enhanced calls
        if (traceId) {
          await this.tracingEngine!.completeTrace(traceId, {
            status: 'completed',
            finalOutput: result.text || 'No output',
            outputType: 'text'
          });
        }

        return result;
      } catch (error) {
        console.error('Error in enhanced generateText:', error);

        // Record error in trace
        if (traceId) {
          const agentError = TracingUtils.createAgentError(
            'framework_error',
            `Vercel AI generateText error: ${error.message}`,
            error,
            true,
            { method: 'generateText', framework: 'vercel-ai' }
          );

          await this.tracingEngine!.recordError(traceId, agentError);
          await this.tracingEngine!.completeTrace(traceId, {
            status: 'failed',
            errors: [agentError]
          });
        }

        // Fallback to original AI SDK
        return this.callAISDKGenerateText(options);
      }
    };
  }

  /**
   * Create enhanced streamText function with MongoDB context injection and enterprise tracing
   */
  private createEnhancedStreamText() {
    return async (options: AISDKStreamOptions & { conversationId?: string }) => {
      if (!this.brain) {
        throw new Error('VercelAIAdapter not initialized. Call integrate() first.');
      }

      let traceId: string | undefined;
      let contextStepId: string | undefined;
      let frameworkStepId: string | undefined;

      try {
        const userMessage = this.extractLatestUserMessage(options.messages);

        // Start enterprise tracing if available
        if (this.tracingEngine && userMessage) {
          const frameworkMetadata: FrameworkMetadata = {
            frameworkName: 'vercel-ai',
            frameworkVersion: this.version,
            vercelAI: {
              model: options.model?.modelId || 'unknown',
              provider: options.model?.provider || 'unknown',
              streaming: true,
              tools: options.tools?.map(t => t.name || 'unnamed') || []
            }
          };

          traceId = await this.tracingEngine.startTrace({
            agentId: new ObjectId(this.brain.getAgentId()),
            sessionId: options.conversationId || 'vercel-ai-session',
            conversationId: options.conversationId,
            operation: {
              type: 'stream_text',
              description: 'Vercel AI streamText with MongoDB enhancement',
              userInput: userMessage
            },
            framework: frameworkMetadata,
            tags: ['vercel-ai', 'stream-text', 'mongodb-enhanced']
          });
        }

        if (userMessage) {
          // Start context injection step
          if (traceId) {
            contextStepId = await this.tracingEngine!.startStep(traceId, {
              stepType: 'context_injection',
              input: { userMessage, strategy: 'hybrid' }
            });
          }

          const enhanced = await this.brain.enhancePrompt(userMessage, {
            frameworkType: 'vercel-ai',
            conversationId: options.conversationId,
            enhancementStrategy: 'hybrid'
          });

          // Complete context injection step
          if (traceId && contextStepId) {
            await this.tracingEngine!.completeStep(traceId, contextStepId, {
              output: {
                enhancedPrompt: enhanced.enhancedPrompt,
                contextCount: enhanced.injectedContext.length,
                relevanceScores: enhanced.injectedContext.map(c => c.relevanceScore)
              }
            });

            // Record context used
            const contextItems = enhanced.injectedContext.map(ctx =>
              TracingUtils.createContextItem(
                ctx.source,
                ctx.content,
                ctx.relevanceScore,
                0,
                ctx.metadata
              )
            );
            await this.tracingEngine!.recordContextUsed(traceId, contextItems);
          }

          const enhancedMessages = this.replaceUserMessage(options.messages, enhanced.enhancedPrompt);

          // Start framework call step
          if (traceId) {
            frameworkStepId = await this.tracingEngine!.startStep(traceId, {
              stepType: 'framework_call',
              input: {
                model: options.model?.modelId,
                streaming: true,
                messageCount: enhancedMessages.length
              }
            });
          }

          // Wrap onFinish to store interaction and complete tracing
          const originalOnFinish = options.onFinish;
          const enhancedOnFinish = async (result: any) => {
            try {
              // Complete framework call step
              if (traceId && frameworkStepId) {
                await this.tracingEngine!.completeStep(traceId, frameworkStepId, {
                  output: {
                    text: result.text || '',
                    finishReason: result.finishReason,
                    usage: result.usage
                  }
                });
              }

              // Store interaction
              await this.brain!.storeInteractionPublic({
                conversationId: options.conversationId || 'vercel-ai-session',
                userMessage,
                assistantResponse: result.text || '',
                context: enhanced.injectedContext,
                framework: 'vercel-ai',
                metadata: {
                  model: options.model?.modelId || 'unknown',
                  enhancementStrategy: 'hybrid',
                  streaming: true,
                  traceId
                }
              });

              // Complete trace
              if (traceId) {
                await this.tracingEngine!.completeTrace(traceId, {
                  status: 'completed',
                  finalOutput: result.text || '',
                  outputType: 'stream',
                  tokensUsed: result.usage ? TracingUtils.createTokenUsage(
                    result.usage.promptTokens || 0,
                    result.usage.completionTokens || 0,
                    0,
                    {
                      inputTokens: result.usage.promptTokens || 0,
                      outputTokens: result.usage.completionTokens || 0
                    }
                  ) : undefined,
                  cost: result.usage ? TracingUtils.createCostBreakdown({
                    completionCost: this.calculateCost(result.usage.completionTokens || 0, 'completion'),
                    promptCost: this.calculateCost(result.usage.promptTokens || 0, 'prompt')
                  }) : undefined
                });
              }
            } catch (error) {
              console.error('Error in enhanced onFinish:', error);

              // Record error in trace
              if (traceId) {
                const agentError = TracingUtils.createAgentError(
                  'framework_error',
                  `Stream completion error: ${error.message}`,
                  error,
                  true,
                  { method: 'streamText', phase: 'onFinish' }
                );

                await this.tracingEngine!.recordError(traceId, agentError);
                await this.tracingEngine!.completeTrace(traceId, {
                  status: 'failed',
                  errors: [agentError]
                });
              }
            }

            if (originalOnFinish) {
              originalOnFinish(result);
            }
          };

          return this.callAISDKStreamText({
            ...options,
            messages: enhancedMessages,
            onFinish: enhancedOnFinish
          });
        }

        // No user message to enhance
        const result = await this.callAISDKStreamText(options);

        // Complete trace for non-enhanced calls
        if (traceId) {
          await this.tracingEngine!.completeTrace(traceId, {
            status: 'completed',
            finalOutput: 'Stream completed',
            outputType: 'stream'
          });
        }

        return result;
      } catch (error) {
        console.error('Error in enhanced streamText:', error);

        // Record error in trace
        if (traceId) {
          const agentError = TracingUtils.createAgentError(
            'framework_error',
            `Vercel AI streamText error: ${error.message}`,
            error,
            true,
            { method: 'streamText', framework: 'vercel-ai' }
          );

          await this.tracingEngine!.recordError(traceId, agentError);
          await this.tracingEngine!.completeTrace(traceId, {
            status: 'failed',
            errors: [agentError]
          });
        }

        return this.callAISDKStreamText(options);
      }
    };
  }

  /**
   * Create enhanced generateObject function with MongoDB context injection and enterprise tracing
   */
  private createEnhancedGenerateObject() {
    return async (options: AISDKGenerateOptions & {
      schema: any;
      conversationId?: string;
    }) => {
      if (!this.brain) {
        throw new Error('VercelAIAdapter not initialized. Call integrate() first.');
      }

      let traceId: string | undefined;
      let contextStepId: string | undefined;
      let frameworkStepId: string | undefined;

      try {
        const userMessage = this.extractLatestUserMessage(options.messages);

        // Start enterprise tracing if available
        if (this.tracingEngine && userMessage) {
          const frameworkMetadata: FrameworkMetadata = {
            frameworkName: 'vercel-ai',
            frameworkVersion: this.version,
            vercelAI: {
              model: options.model?.modelId || 'unknown',
              provider: options.model?.provider || 'unknown',
              streaming: false,
              tools: options.tools?.map(t => t.name || 'unnamed') || []
            }
          };

          traceId = await this.tracingEngine.startTrace({
            agentId: new ObjectId(this.brain.getAgentId()),
            sessionId: options.conversationId || 'vercel-ai-session',
            conversationId: options.conversationId,
            operation: {
              type: 'generate_object',
              description: 'Vercel AI generateObject with MongoDB enhancement',
              userInput: userMessage
            },
            framework: frameworkMetadata,
            tags: ['vercel-ai', 'generate-object', 'mongodb-enhanced', 'structured-output']
          });
        }

        if (userMessage) {
          // Start context injection step
          if (traceId) {
            contextStepId = await this.tracingEngine!.startStep(traceId, {
              stepType: 'context_injection',
              input: { userMessage, strategy: 'hybrid', outputType: 'structured' }
            });
          }

          const enhanced = await this.brain.enhancePrompt(userMessage, {
            frameworkType: 'vercel-ai',
            conversationId: options.conversationId,
            enhancementStrategy: 'hybrid'
          });

          // Complete context injection step
          if (traceId && contextStepId) {
            await this.tracingEngine!.completeStep(traceId, contextStepId, {
              output: {
                enhancedPrompt: enhanced.enhancedPrompt,
                contextCount: enhanced.injectedContext.length,
                relevanceScores: enhanced.injectedContext.map(c => c.relevanceScore)
              }
            });

            // Record context used
            const contextItems = enhanced.injectedContext.map(ctx =>
              TracingUtils.createContextItem(
                ctx.source,
                ctx.content,
                ctx.relevanceScore,
                0,
                ctx.metadata
              )
            );
            await this.tracingEngine!.recordContextUsed(traceId, contextItems);
          }

          const enhancedMessages = this.replaceUserMessage(options.messages, enhanced.enhancedPrompt);

          // Start framework call step
          if (traceId) {
            frameworkStepId = await this.tracingEngine!.startStep(traceId, {
              stepType: 'framework_call',
              input: {
                model: options.model?.modelId,
                outputType: 'structured',
                schema: options.schema,
                messageCount: enhancedMessages.length
              }
            });
          }

          const result = await this.callAISDKGenerateObject({
            ...options,
            messages: enhancedMessages
          });

          // Complete framework call step
          if (traceId && frameworkStepId) {
            await this.tracingEngine!.completeStep(traceId, frameworkStepId, {
              output: {
                object: result.object,
                finishReason: result.finishReason,
                usage: result.usage
              }
            });
          }

          // Store interaction
          await this.brain.storeInteractionPublic({
            conversationId: options.conversationId || 'vercel-ai-session',
            userMessage,
            assistantResponse: JSON.stringify(result.object),
            context: enhanced.injectedContext,
            framework: 'vercel-ai',
            metadata: {
              model: options.model?.modelId || 'unknown',
              enhancementStrategy: 'hybrid',
              outputType: 'structured',
              schema: options.schema,
              traceId
            }
          });

          // Complete trace
          if (traceId) {
            await this.tracingEngine!.completeTrace(traceId, {
              status: 'completed',
              finalOutput: JSON.stringify(result.object),
              outputType: 'object',
              tokensUsed: result.usage ? TracingUtils.createTokenUsage(
                result.usage.promptTokens || 0,
                result.usage.completionTokens || 0,
                0,
                {
                  inputTokens: result.usage.promptTokens || 0,
                  outputTokens: result.usage.completionTokens || 0
                }
              ) : undefined,
              cost: result.usage ? TracingUtils.createCostBreakdown({
                completionCost: this.calculateCost(result.usage.completionTokens || 0, 'completion'),
                promptCost: this.calculateCost(result.usage.promptTokens || 0, 'prompt')
              }) : undefined
            });
          }

          return {
            ...result,
            enhancedContext: enhanced.injectedContext,
            traceId
          };
        }

        // No user message to enhance
        const result = await this.callAISDKGenerateObject(options);

        // Complete trace for non-enhanced calls
        if (traceId) {
          await this.tracingEngine!.completeTrace(traceId, {
            status: 'completed',
            finalOutput: JSON.stringify(result.object || {}),
            outputType: 'object'
          });
        }

        return result;
      } catch (error) {
        console.error('Error in enhanced generateObject:', error);

        // Record error in trace
        if (traceId) {
          const agentError = TracingUtils.createAgentError(
            'framework_error',
            `Vercel AI generateObject error: ${error.message}`,
            error,
            true,
            { method: 'generateObject', framework: 'vercel-ai' }
          );

          await this.tracingEngine!.recordError(traceId, agentError);
          await this.tracingEngine!.completeTrace(traceId, {
            status: 'failed',
            errors: [agentError]
          });
        }

        return this.callAISDKGenerateObject(options);
      }
    };
  }

  /**
   * Create MongoDB-powered tools for AI SDK
   */
  private createMongoDBTools() {
    return {
      searchKnowledgeBase: {
        description: 'Search the MongoDB knowledge base for relevant information',
        parameters: {
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
        execute: async ({ query, limit = 5 }: { query: string; limit?: number }) => {
          if (!this.brain) return { error: 'Brain not initialized' };
          
          const results = await this.brain.retrieveRelevantContext(query, {
            limit,
            framework: 'vercel-ai'
          });

          return {
            results: results.map(r => ({
              content: r.content,
              relevanceScore: r.relevanceScore,
              source: r.source,
              metadata: r.metadata
            }))
          };
        }
      },

      storeMemory: {
        description: 'Store information in MongoDB memory for future reference',
        parameters: {
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
        execute: async ({ content, metadata = {} }: { content: string; metadata?: any }) => {
          if (!this.brain) return { error: 'Brain not initialized' };
          
          try {
            await this.brain.storeInteractionPublic({
              conversationId: 'vercel-ai-memory',
              userMessage: 'Store memory',
              assistantResponse: content,
              context: [],
              framework: 'vercel-ai',
              metadata: {
                type: 'memory_storage',
                ...metadata
              }
            });

            return { success: true, message: 'Memory stored successfully' };
          } catch (error) {
            return { error: `Failed to store memory: ${error.message}` };
          }
        }
      }
    };
  }

  // Framework-specific implementation methods
  public checkFrameworkAvailability(): boolean {
    try {
      // Try to import REAL Vercel AI SDK
      require.resolve('ai');
      return true;
    } catch {
      console.warn('⚠️ Vercel AI SDK not found. Install with: npm install ai');
      return false;
    }
  }

  public checkVersionCompatibility(): boolean {
    try {
      const packageJson = require('ai/package.json');
      const version = packageJson.version;

      // Check if version is 3.0.0 or higher (based on docs)
      const majorVersion = parseInt(version.split('.')[0]);
      if (majorVersion >= 3) {
        return true;
      }

      console.warn(`⚠️ Vercel AI SDK version ${version} detected. Version 3.0.0+ recommended.`);
      return false;
    } catch {
      // If we can't check version, assume it's compatible
      return true;
    }
  }

  protected async setupFrameworkIntegration(): Promise<void> {
    console.log('🔌 Setting up Vercel AI SDK integration...');

    if (!this.checkFrameworkAvailability()) {
      console.warn('⚠️ Vercel AI SDK not available - adapter will use fallback mode');
      return;
    }

    if (!this.checkVersionCompatibility()) {
      console.warn('⚠️ Vercel AI SDK version compatibility issue detected');
    }

    console.log('✅ Vercel AI SDK integration ready');
  }

  protected createIntelligentTools(): any[] {
    return Object.values(this.createMongoDBTools());
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
        'claude-3-5-sonnet',
        'claude-3-haiku',
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
    // This method provides a way to enhance any AI SDK function
    return async (...args: any[]) => {
      try {
        // Extract prompt from arguments
        const options = args[0];
        if (options?.messages) {
          const userMessage = this.extractLatestUserMessage(options.messages);
          if (userMessage) {
            const enhanced = await brain.enhancePrompt(userMessage, {
              frameworkType: 'vercel-ai'
            });

            options.messages = this.replaceUserMessage(options.messages, enhanced.enhancedPrompt);
          }
        }

        return await originalFunction(...args);
      } catch (error) {
        console.error('Error in enhanceWithBrain:', error);
        return await originalFunction(...args);
      }
    };
  }

  /**
   * Validate that the adapter is working with REAL Vercel AI SDK
   */
  async validateRealIntegration(): Promise<boolean> {
    try {
      // Try to import the actual AI SDK functions
      const { generateText, streamText, generateObject } = await import('ai');

      // Verify they are functions
      if (typeof generateText !== 'function' ||
          typeof streamText !== 'function' ||
          typeof generateObject !== 'function') {
        return false;
      }

      console.log('✅ REAL Vercel AI SDK integration validated');
      return true;
    } catch (error) {
      console.warn('⚠️ REAL Vercel AI SDK not available - using fallback mode');
      return false;
    }
  }

  // Helper methods
  private extractLatestUserMessage(messages: AISDKMessage[]): string {
    const userMessages = messages.filter(m => m.role === 'user');
    return userMessages[userMessages.length - 1]?.content || '';
  }

  private calculateCost(tokens: number, type: 'prompt' | 'completion'): number {
    // Basic cost calculation - should be enhanced with actual model pricing
    const costPerToken = type === 'completion' ? 0.00006 : 0.00003; // GPT-4 pricing example
    return tokens * costPerToken;
  }

  private replaceUserMessage(messages: AISDKMessage[], enhancedContent: string): AISDKMessage[] {
    const result = [...messages];
    for (let i = result.length - 1; i >= 0; i--) {
      if (result[i].role === 'user') {
        result[i] = { ...result[i], content: enhancedContent };
        break;
      }
    }
    return result;
  }

  // REAL AI SDK calls - NO MOCKS!
  private async callAISDKGenerateText(options: AISDKGenerateOptions): Promise<any> {
    try {
      // Import REAL Vercel AI SDK generateText function
      const { generateText } = await import('ai');

      // Call REAL generateText with actual options
      const result = await generateText(options as any);

      return result;
    } catch (error) {
      // If AI SDK not available, provide graceful fallback
      if (error.code === 'MODULE_NOT_FOUND') {
        console.warn('⚠️ Vercel AI SDK not installed. Install with: npm install ai');
        return {
          text: `[Fallback] Enhanced response would be generated here with MongoDB context. Install 'ai' package for real integration.`,
          usage: { totalTokens: 0 },
          finishReason: 'fallback'
        };
      }
      throw error;
    }
  }

  private async callAISDKStreamText(options: AISDKStreamOptions): Promise<any> {
    try {
      // Import REAL Vercel AI SDK streamText function
      const { streamText } = await import('ai');

      // Call REAL streamText with actual options
      const result = await streamText(options as any);

      return result;
    } catch (error) {
      // If AI SDK not available, provide graceful fallback
      if (error.code === 'MODULE_NOT_FOUND') {
        console.warn('⚠️ Vercel AI SDK not installed. Install with: npm install ai');
        return {
          textStream: async function* () {
            yield '[Fallback] Enhanced streaming response would be generated here with MongoDB context. ';
            yield 'Install "ai" package for real integration.';
          },
          fullStream: async function* () {
            yield { type: 'text-delta', textDelta: '[Fallback] Enhanced streaming response would be generated here with MongoDB context. ' };
            yield { type: 'text-delta', textDelta: 'Install "ai" package for real integration.' };
          }
        };
      }
      throw error;
    }
  }

  private async callAISDKGenerateObject(options: any): Promise<any> {
    try {
      // Import REAL Vercel AI SDK generateObject function
      const { generateObject } = await import('ai');

      // Call REAL generateObject with actual options
      const result = await generateObject(options);

      return result;
    } catch (error) {
      // If AI SDK not available, provide graceful fallback
      if (error.code === 'MODULE_NOT_FOUND') {
        console.warn('⚠️ Vercel AI SDK not installed. Install with: npm install ai');
        return {
          object: {
            message: '[Fallback] Enhanced structured response would be generated here with MongoDB context. Install "ai" package for real integration.',
            fallback: true
          },
          usage: { totalTokens: 0 }
        };
      }
      throw error;
    }
  }
}
