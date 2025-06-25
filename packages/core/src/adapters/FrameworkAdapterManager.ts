/**
 * @file FrameworkAdapterManager.ts - Manages multiple framework adapters
 * 
 * This class provides a centralized way to manage multiple framework adapters,
 * enabling the Universal AI Brain to work with multiple TypeScript AI frameworks
 * simultaneously while maintaining optimal performance and resource usage.
 */

import { UniversalAIBrain } from '../UniversalAIBrain';
import { BaseFrameworkAdapter } from './BaseFrameworkAdapter';
import { VercelAIAdapter } from './VercelAIAdapter';
import { MastraAdapter } from './MastraAdapter';
import { OpenAIAgentsAdapter } from './OpenAIAgentsAdapter';
import { LangChainJSAdapter } from './LangChainJSAdapter';
import { FrameworkAdapter, FrameworkCapabilities, AdapterConfig } from '../types';

/**
 * Configuration for the Framework Adapter Manager
 */
export interface FrameworkAdapterManagerConfig {
  /** Whether to auto-detect available frameworks */
  autoDetectFrameworks?: boolean;
  
  /** Maximum number of adapters to manage simultaneously */
  maxAdapters?: number;
  
  /** Whether to enable performance monitoring across adapters */
  enablePerformanceMonitoring?: boolean;
  
  /** Whether to enable cross-adapter learning */
  enableCrossAdapterLearning?: boolean;
  
  /** Default configuration for all adapters */
  defaultAdapterConfig?: AdapterConfig;
  
  /** Framework-specific configurations */
  frameworkConfigs?: {
    [frameworkName: string]: AdapterConfig;
  };
}

/**
 * Information about a managed adapter
 */
export interface ManagedAdapterInfo {
  /** The adapter instance */
  adapter: BaseFrameworkAdapter;
  
  /** Framework name */
  frameworkName: string;
  
  /** Whether the adapter is currently active */
  isActive: boolean;
  
  /** Integration timestamp */
  integratedAt: Date;
  
  /** Last activity timestamp */
  lastActivity: Date;
  
  /** Performance metrics */
  metrics: {
    totalCalls: number;
    averageResponseTime: number;
    errorCount: number;
    successRate: number;
  };
  
  /** Framework capabilities */
  capabilities: FrameworkCapabilities;
}

/**
 * Manager statistics
 */
export interface ManagerStats {
  /** Total number of managed adapters */
  totalAdapters: number;
  
  /** Number of active adapters */
  activeAdapters: number;
  
  /** Supported frameworks */
  supportedFrameworks: string[];
  
  /** Overall performance metrics */
  overallMetrics: {
    totalCalls: number;
    averageResponseTime: number;
    totalErrors: number;
    overallSuccessRate: number;
  };
  
  /** Brain health status */
  brainHealth: boolean;
  
  /** Memory usage */
  memoryUsage: {
    adapters: number;
    brain: number;
    total: number;
  };
}

/**
 * Framework Adapter Manager
 * 
 * Manages multiple framework adapters and provides a unified interface
 * for integrating the Universal AI Brain with multiple TypeScript AI frameworks.
 */
export class FrameworkAdapterManager {
  private brain: UniversalAIBrain | null = null;
  private adapters: Map<string, ManagedAdapterInfo> = new Map();
  private config: FrameworkAdapterManagerConfig;
  private isInitialized = false;

  constructor(config: FrameworkAdapterManagerConfig = {}) {
    this.config = {
      autoDetectFrameworks: true,
      maxAdapters: 10,
      enablePerformanceMonitoring: true,
      enableCrossAdapterLearning: true,
      defaultAdapterConfig: {
        enablePromptEnhancement: true,
        enableLearning: true,
        enableContextInjection: true,
        maxContextItems: 5,
        enhancementStrategy: 'hybrid'
      },
      ...config
    };
  }

  /**
   * Initialize the manager with a Universal AI Brain
   */
  async initialize(brain: UniversalAIBrain): Promise<void> {
    this.brain = brain;
    
    if (this.config.autoDetectFrameworks) {
      await this.autoDetectAndRegisterFrameworks();
    }
    
    this.isInitialized = true;
  }

  /**
   * Register a framework adapter
   */
  async registerAdapter(
    adapter: BaseFrameworkAdapter,
    config?: AdapterConfig
  ): Promise<boolean> {
    if (!this.brain) {
      throw new Error('Manager not initialized. Call initialize() first.');
    }

    if (this.adapters.size >= this.config.maxAdapters!) {
      console.warn(`Maximum adapters (${this.config.maxAdapters}) reached. Cannot register ${adapter.frameworkName}.`);
      return false;
    }

    try {
      // Apply configuration
      const adapterConfig = {
        ...this.config.defaultAdapterConfig,
        ...this.config.frameworkConfigs?.[adapter.frameworkName],
        ...config
      };

      // Create new adapter instance with config
      const configuredAdapter = this.createConfiguredAdapter(adapter.frameworkName, adapterConfig);
      
      // Integrate with brain
      const result = await configuredAdapter.integrate(this.brain);
      
      if (result.success) {
        // Store adapter info
        const adapterInfo: ManagedAdapterInfo = {
          adapter: configuredAdapter,
          frameworkName: adapter.frameworkName,
          isActive: true,
          integratedAt: new Date(),
          lastActivity: new Date(),
          metrics: {
            totalCalls: 0,
            averageResponseTime: 0,
            errorCount: 0,
            successRate: 1.0
          },
          capabilities: configuredAdapter.getCapabilities()
        };

        this.adapters.set(adapter.frameworkName, adapterInfo);
        
        console.log(`✅ Registered ${adapter.frameworkName} adapter successfully`);
        return true;
      } else {
        console.error(`❌ Failed to register ${adapter.frameworkName}: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error registering ${adapter.frameworkName}:`, error);
      return false;
    }
  }

  /**
   * Get an adapter by framework name
   */
  getAdapter(frameworkName: string): BaseFrameworkAdapter | null {
    const adapterInfo = this.adapters.get(frameworkName);
    return adapterInfo?.adapter || null;
  }

  /**
   * Get all registered adapters
   */
  getAllAdapters(): ManagedAdapterInfo[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Get adapters by capability
   */
  getAdaptersByCapability(capability: keyof FrameworkCapabilities): ManagedAdapterInfo[] {
    return Array.from(this.adapters.values()).filter(
      info => info.capabilities[capability] === true
    );
  }

  /**
   * Auto-detect and register available frameworks
   */
  private async autoDetectAndRegisterFrameworks(): Promise<void> {
    console.log('🔍 Auto-detecting available AI frameworks...');

    const frameworkChecks = [
      { name: 'Vercel AI', adapter: VercelAIAdapter, check: () => this.checkFrameworkAvailability('ai') },
      { name: 'Mastra', adapter: MastraAdapter, check: () => this.checkFrameworkAvailability('@mastra/core') },
      { name: 'OpenAI Agents', adapter: OpenAIAgentsAdapter, check: () => this.checkFrameworkAvailability('@openai/agents') },
      { name: 'LangChain.js', adapter: LangChainJSAdapter, check: () => this.checkFrameworkAvailability('langchain') }
    ];

    let detectedCount = 0;
    const suggestions: string[] = [];

    for (const framework of frameworkChecks) {
      console.log(`  Checking ${framework.name}...`);

      if (await framework.check()) {
        try {
          const adapter = new framework.adapter();
          await this.registerAdapter(adapter);
          console.log(`  ✅ ${framework.name} detected and registered`);
          detectedCount++;
        } catch (error) {
          console.warn(`  ⚠️ Could not auto-register ${framework.name}:`, error.message);
        }
      } else {
        console.log(`  ❌ ${framework.name} not found`);
        suggestions.push(`Install ${framework.name}: ${this.getInstallCommand(framework.name)}`);
      }
    }

    console.log(`\n📊 Auto-detection Summary:`);
    console.log(`  - Detected ${detectedCount} frameworks`);
    console.log(`  - Registered ${this.adapters.size} adapters`);

    if (suggestions.length > 0) {
      console.log(`\n💡 Install additional frameworks:`);
      suggestions.forEach(suggestion => console.log(`  - ${suggestion}`));
    }
  }

  /**
   * Check if a framework package is available
   */
  private async checkFrameworkAvailability(packageName: string): Promise<boolean> {
    try {
      await import(packageName);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a configured adapter instance
   */
  private createConfiguredAdapter(frameworkName: string, config: AdapterConfig): BaseFrameworkAdapter {
    switch (frameworkName) {
      case 'Vercel AI':
        return new VercelAIAdapter(config);
      case 'Mastra':
        return new MastraAdapter(config);
      case 'OpenAI Agents':
        return new OpenAIAgentsAdapter(config);
      case 'LangChain.js':
        return new LangChainJSAdapter(config);
      default:
        throw new Error(`Unknown framework: ${frameworkName}`);
    }
  }

  /**
   * Update adapter metrics
   */
  updateAdapterMetrics(
    frameworkName: string,
    responseTime: number,
    success: boolean
  ): void {
    const adapterInfo = this.adapters.get(frameworkName);
    if (!adapterInfo) return;

    adapterInfo.lastActivity = new Date();
    adapterInfo.metrics.totalCalls++;
    
    if (success) {
      // Update average response time
      const totalTime = adapterInfo.metrics.averageResponseTime * (adapterInfo.metrics.totalCalls - 1);
      adapterInfo.metrics.averageResponseTime = (totalTime + responseTime) / adapterInfo.metrics.totalCalls;
    } else {
      adapterInfo.metrics.errorCount++;
    }
    
    // Update success rate
    adapterInfo.metrics.successRate = 
      (adapterInfo.metrics.totalCalls - adapterInfo.metrics.errorCount) / adapterInfo.metrics.totalCalls;
  }

  /**
   * Get manager statistics
   */
  async getStats(): Promise<ManagerStats> {
    const adapters = Array.from(this.adapters.values());
    const activeAdapters = adapters.filter(a => a.isActive);
    
    const overallMetrics = adapters.reduce(
      (acc, adapter) => ({
        totalCalls: acc.totalCalls + adapter.metrics.totalCalls,
        totalErrors: acc.totalErrors + adapter.metrics.errorCount,
        totalResponseTime: acc.totalResponseTime + 
          (adapter.metrics.averageResponseTime * adapter.metrics.totalCalls)
      }),
      { totalCalls: 0, totalErrors: 0, totalResponseTime: 0 }
    );

    return {
      totalAdapters: adapters.length,
      activeAdapters: activeAdapters.length,
      supportedFrameworks: adapters.map(a => a.frameworkName),
      overallMetrics: {
        totalCalls: overallMetrics.totalCalls,
        averageResponseTime: overallMetrics.totalCalls > 0 
          ? overallMetrics.totalResponseTime / overallMetrics.totalCalls 
          : 0,
        totalErrors: overallMetrics.totalErrors,
        overallSuccessRate: overallMetrics.totalCalls > 0
          ? (overallMetrics.totalCalls - overallMetrics.totalErrors) / overallMetrics.totalCalls
          : 1.0
      },
      brainHealth: this.brain ? await this.brain.healthCheck() : false,
      memoryUsage: {
        adapters: adapters.length * 1024, // Rough estimate
        brain: this.brain ? 5 * 1024 * 1024 : 0, // Rough estimate
        total: (adapters.length * 1024) + (this.brain ? 5 * 1024 * 1024 : 0)
      }
    };
  }

  /**
   * Deactivate an adapter
   */
  async deactivateAdapter(frameworkName: string): Promise<boolean> {
    const adapterInfo = this.adapters.get(frameworkName);
    if (!adapterInfo) return false;

    try {
      await adapterInfo.adapter.cleanup();
      adapterInfo.isActive = false;
      console.log(`✅ Deactivated ${frameworkName} adapter`);
      return true;
    } catch (error) {
      console.error(`❌ Error deactivating ${frameworkName}:`, error);
      return false;
    }
  }

  /**
   * Cleanup all adapters and resources
   */
  async cleanup(): Promise<void> {
    const cleanupPromises = Array.from(this.adapters.values()).map(
      adapterInfo => adapterInfo.adapter.cleanup()
    );

    await Promise.all(cleanupPromises);
    this.adapters.clear();
    this.brain = null;
    this.isInitialized = false;
  }

  /**
   * Check if manager is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.brain !== null;
  }

  /**
   * Get supported frameworks
   */
  getSupportedFrameworks(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Enhanced framework detection with detailed information
   */
  async detectAvailableFrameworks(): Promise<FrameworkDetectionResult> {
    const detectedFrameworks: FrameworkInfo[] = [];
    const suggestions: string[] = [];

    console.log('🔍 Performing detailed framework detection...');

    const frameworkChecks = [
      { name: 'Vercel AI', adapter: VercelAIAdapter, packageName: 'ai' },
      { name: 'Mastra', adapter: MastraAdapter, packageName: '@mastra/core' },
      { name: 'OpenAI Agents', adapter: OpenAIAgentsAdapter, packageName: '@openai/agents' },
      { name: 'LangChain.js', adapter: LangChainJSAdapter, packageName: 'langchain' }
    ];

    for (const framework of frameworkChecks) {
      console.log(`  Analyzing ${framework.name}...`);

      try {
        const adapter = new framework.adapter();
        const isAvailable = adapter.checkFrameworkAvailability();
        const isCompatible = adapter.checkVersionCompatibility();

        if (isAvailable) {
          console.log(`  ✅ ${framework.name} available`);

          // Validate REAL integration if adapter supports it
          let realIntegrationValid = true;
          if (typeof adapter.validateRealIntegration === 'function') {
            realIntegrationValid = await adapter.validateRealIntegration();
          }

          detectedFrameworks.push({
            name: framework.name,
            available: true,
            compatible: isCompatible,
            realIntegration: realIntegrationValid,
            capabilities: adapter.getCapabilities(),
            adapter: adapter,
            packageName: framework.packageName
          });
        } else {
          console.log(`  ❌ ${framework.name} not available`);
          suggestions.push(`Install ${framework.name}: ${this.getInstallCommand(framework.name)}`);
        }
      } catch (error) {
        console.warn(`  ⚠️ Error analyzing ${framework.name}:`, error.message);
        suggestions.push(`Check ${framework.name} installation: ${this.getInstallCommand(framework.name)}`);
      }
    }

    const recommendedAdapter = this.getRecommendedAdapter(detectedFrameworks);

    console.log(`\n📊 Detection Results:`);
    console.log(`  - Available: ${detectedFrameworks.length} frameworks`);
    console.log(`  - Recommended: ${recommendedAdapter || 'None'}`);

    if (suggestions.length > 0) {
      console.log(`\n💡 Installation Suggestions:`);
      suggestions.forEach(suggestion => console.log(`  - ${suggestion}`));
    }

    return {
      detectedFrameworks,
      suggestions,
      recommendedAdapter
    };
  }

  /**
   * Get installation command for a framework
   */
  private getInstallCommand(frameworkName: string): string {
    const commands = {
      'Vercel AI': 'npm install ai',
      'Mastra': 'npm install @mastra/core',
      'OpenAI Agents': 'npm install @openai/agents',
      'LangChain.js': 'npm install langchain @langchain/core'
    };

    return commands[frameworkName] || `npm install ${frameworkName.toLowerCase()}`;
  }

  /**
   * Get recommended adapter based on detected frameworks
   */
  private getRecommendedAdapter(frameworks: FrameworkInfo[]): string | null {
    if (frameworks.length === 0) return null;

    // Prioritize frameworks with real integration and compatibility
    const realIntegrationFrameworks = frameworks.filter(f => f.realIntegration && f.compatible);
    if (realIntegrationFrameworks.length > 0) {
      return realIntegrationFrameworks[0].name;
    }

    // Fallback to compatible frameworks
    const compatibleFrameworks = frameworks.filter(f => f.compatible);
    if (compatibleFrameworks.length > 0) {
      return compatibleFrameworks[0].name;
    }

    // Last resort: any available framework
    return frameworks[0].name;
  }
}
