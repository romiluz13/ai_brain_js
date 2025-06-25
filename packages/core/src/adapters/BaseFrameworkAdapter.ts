/**
 * @file BaseFrameworkAdapter - Abstract base class for all framework adapters
 * 
 * This provides the foundation that all framework-specific adapters will extend.
 * It ensures consistent behavior and provides common functionality across all
 * framework integrations.
 */

import { UniversalAIBrain } from '../UniversalAIBrain';
import { TracingEngine } from '../tracing';
import {
  FrameworkAdapter,
  FrameworkCapabilities,
  AdapterConfig,
  BrainError,
  FrameworkIntegrationError,
  EnhancementStrategy
} from '../types';

export abstract class BaseFrameworkAdapter<T> implements FrameworkAdapter<T> {
  public abstract readonly frameworkName: string;
  public abstract readonly version: string;
  
  protected brain: UniversalAIBrain | null = null;
  protected config: AdapterConfig;
  protected isInitialized: boolean = false;

  constructor(config?: Partial<AdapterConfig>) {
    this.config = {
      enableMemoryInjection: true,
      enableContextEnhancement: true,
      enableToolIntegration: true,
      maxContextItems: 5,
      enhancementStrategy: 'hybrid',
      ...config
    };
  }

  /**
   * Abstract methods that each framework adapter must implement
   */
  public abstract integrate(brain: UniversalAIBrain, tracingEngine?: TracingEngine): Promise<T>;
  public abstract enhanceWithBrain(originalFunction: any, brain: UniversalAIBrain): any;
  public abstract getCapabilities(): FrameworkCapabilities;

  /**
   * Validate framework compatibility
   */
  public validateCompatibility(): boolean {
    try {
      // Check if framework is available
      const isAvailable = this.checkFrameworkAvailability();
      if (!isAvailable) {
        console.warn(`⚠️ ${this.frameworkName} is not available in this environment`);
        return false;
      }

      // Check version compatibility
      const isVersionCompatible = this.checkVersionCompatibility();
      if (!isVersionCompatible) {
        console.warn(`⚠️ ${this.frameworkName} version ${this.version} may not be fully compatible`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`❌ Error validating ${this.frameworkName} compatibility:`, error);
      return false;
    }
  }

  /**
   * Initialize the adapter with a brain instance
   */
  protected async initialize(brain: UniversalAIBrain): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.brain = brain;
      await this.setupFrameworkIntegration();
      this.isInitialized = true;
      console.log(`✅ ${this.frameworkName} adapter initialized successfully`);
    } catch (error) {
      throw new FrameworkIntegrationError(
        this.frameworkName,
        `Failed to initialize adapter: ${error.message}`,
        { error: error.message }
      );
    }
  }

  /**
   * Enhanced prompt generation with brain intelligence
   */
  protected async enhancePromptWithBrain(
    prompt: string,
    options?: {
      conversationId?: string;
      enhancementStrategy?: EnhancementStrategy;
      maxContextItems?: number;
    }
  ): Promise<string> {
    if (!this.brain || !this.config.enableContextEnhancement) {
      return prompt;
    }

    try {
      const enhancedPrompt = await this.brain.enhancePrompt(prompt, {
        frameworkType: this.frameworkName,
        conversationId: options?.conversationId,
        maxContextItems: options?.maxContextItems || this.config.maxContextItems,
        enhancementStrategy: options?.enhancementStrategy || this.config.enhancementStrategy
      });

      return enhancedPrompt.enhancedPrompt;
    } catch (error) {
      console.error(`Error enhancing prompt with brain:`, error);
      return prompt; // Fallback to original prompt
    }
  }

  /**
   * Store interaction for learning and memory
   */
  protected async storeInteractionWithBrain(
    userMessage: string,
    assistantResponse: string,
    conversationId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.brain || !this.config.enableMemoryInjection) {
      return;
    }

    try {
      await this.brain.storeInteractionPublic({
        conversationId,
        userMessage,
        assistantResponse,
        context: [], // Context will be populated by the brain
        metadata: {
          framework: this.frameworkName,
          adapterVersion: this.version,
          ...metadata
        },
        framework: this.frameworkName
      });
    } catch (error) {
      console.error(`Error storing interaction with brain:`, error);
      // Don't throw - this shouldn't break the main flow
    }
  }

  /**
   * Get intelligent tools from the brain
   */
  protected getIntelligentTools(): any[] {
    if (!this.brain || !this.config.enableToolIntegration) {
      return [];
    }

    // Return framework-specific intelligent tools
    return this.createIntelligentTools();
  }

  /**
   * Create conversation context for the brain
   */
  protected createConversationContext(conversationId: string): Record<string, any> {
    return {
      conversationId,
      framework: this.frameworkName,
      adapterVersion: this.version,
      config: this.config,
      timestamp: new Date()
    };
  }

  /**
   * Handle errors gracefully with fallback behavior
   */
  protected handleBrainError(error: any, fallbackValue: any): any {
    if (error instanceof BrainError) {
      console.error(`Brain error in ${this.frameworkName} adapter:`, error.message);
    } else {
      console.error(`Unexpected error in ${this.frameworkName} adapter:`, error);
    }
    
    return fallbackValue;
  }

  /**
   * Get adapter statistics
   */
  public getAdapterStats(): any {
    return {
      frameworkName: this.frameworkName,
      version: this.version,
      isInitialized: this.isInitialized,
      config: this.config,
      capabilities: this.getCapabilities(),
      brainConnected: !!this.brain
    };
  }

  // ============================================================================
  // ABSTRACT METHODS TO BE IMPLEMENTED BY SUBCLASSES
  // ============================================================================

  // Framework availability and compatibility methods are implemented below

  /**
   * Setup framework-specific integration
   */
  protected abstract setupFrameworkIntegration(): Promise<void>;

  /**
   * Create framework-specific intelligent tools
   */
  protected abstract createIntelligentTools(): any[];

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Validate configuration
   */
  protected validateConfig(): void {
    if (this.config.maxContextItems < 1) {
      throw new BrainError('maxContextItems must be at least 1', 'INVALID_CONFIG');
    }

    const validStrategies: EnhancementStrategy[] = ['semantic', 'hybrid', 'conversational', 'knowledge_graph'];
    if (!validStrategies.includes(this.config.enhancementStrategy)) {
      throw new BrainError(
        `Invalid enhancement strategy: ${this.config.enhancementStrategy}`,
        'INVALID_CONFIG'
      );
    }
  }

  /**
   * Generate unique conversation ID
   */
  protected generateConversationId(): string {
    return `${this.frameworkName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format metadata for storage
   */
  protected formatMetadata(metadata: Record<string, any>): Record<string, any> {
    return {
      ...metadata,
      framework: this.frameworkName,
      adapterVersion: this.version,
      timestamp: new Date(),
      source: 'framework_adapter'
    };
  }

  /**
   * Check if brain is available and initialized
   */
  protected ensureBrainAvailable(): void {
    if (!this.brain) {
      throw new FrameworkIntegrationError(
        this.frameworkName,
        'Brain not available. Make sure to call integrate() first.'
      );
    }
  }

  /**
   * Log adapter activity
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const prefix = `[${this.frameworkName}Adapter]`;
    
    switch (level) {
      case 'info':
        console.log(`${prefix} ${message}`, data || '');
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`, data || '');
        break;
      case 'error':
        console.error(`${prefix} ${message}`, data || '');
        break;
    }
  }

  /**
   * Cleanup adapter resources
   */
  async cleanup(): Promise<void> {
    // Default implementation - can be overridden by subclasses
    this.brain = null;
  }

  /**
   * Check if framework is available
   */
  public checkFrameworkAvailability(): boolean {
    // Default implementation - should be overridden by subclasses
    return true;
  }

  /**
   * Check version compatibility
   */
  public checkVersionCompatibility(): boolean {
    // Default implementation - should be overridden by subclasses
    return true;
  }
}
