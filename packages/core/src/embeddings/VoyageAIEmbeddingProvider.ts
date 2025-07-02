/**
 * @file VoyageAIEmbeddingProvider - Production-ready Voyage AI embedding implementation
 * 
 * This provides Voyage AI embedding generation for the Universal AI Brain.
 * Voyage AI offers state-of-the-art embeddings that outperform OpenAI for retrieval tasks.
 * Supports all Voyage AI models with proper error handling, rate limiting, and batch processing.
 */

import { EmbeddingProvider } from '../vector/MongoVectorStore';

export interface VoyageAIConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  maxRetries?: number;
  timeout?: number;
  batchSize?: number;
  inputType?: 'query' | 'document' | null;
  outputDimension?: number;
  outputDtype?: 'float' | 'int8' | 'uint8' | 'binary' | 'ubinary';
}

export interface VoyageEmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    total_tokens: number;
  };
}

/**
 * VoyageAIEmbeddingProvider - Production-ready Voyage AI embedding implementation
 * 
 * Features:
 * - Support for all Voyage AI models (voyage-3.5, voyage-3-large, voyage-code-3, etc.)
 * - Automatic retry with exponential backoff
 * - Batch processing for efficiency
 * - Rate limiting and error handling
 * - Token counting and cost tracking
 * - Flexible dimensions and quantization support
 */
export class VoyageAIEmbeddingProvider implements EmbeddingProvider {
  private config: Required<VoyageAIConfig>;
  private requestCount: number = 0;
  private totalTokens: number = 0;

  constructor(config: VoyageAIConfig) {
    this.config = {
      maxRetries: 3,
      timeout: 30000,
      batchSize: 128, // Voyage AI supports up to 1000, but 128 is more conservative
      baseUrl: 'https://api.voyageai.com/v1',
      inputType: null,
      outputDimension: undefined, // Use model default - will be set by model dimensions
      outputDtype: 'float',
      ...config
    };

    this.validateConfig();
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    try {
      const embeddings = await this.generateEmbeddings([text]);
      return embeddings[0];
    } catch (error) {
      console.error('Error generating Voyage AI embedding:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate Voyage AI embedding: ${errorMessage}`);
    }
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      throw new Error('Texts array cannot be empty');
    }

    // Filter out empty texts
    const validTexts = texts.filter(text => text && text.trim().length > 0);
    if (validTexts.length === 0) {
      throw new Error('No valid texts provided');
    }

    try {
      // Process in batches if needed
      if (validTexts.length > this.config.batchSize) {
        return this.processBatches(validTexts);
      }

      return this.callVoyageAPI(validTexts);
    } catch (error) {
      console.error('Error generating Voyage AI embeddings:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate Voyage AI embeddings: ${errorMessage}`);
    }
  }

  /**
   * Get the embedding dimensions for the current model
   */
  getDimensions(): number {
    // Return configured dimension or model defaults
    if (this.config.outputDimension) {
      return this.config.outputDimension;
    }

    // Model default dimensions
    const modelDimensions: Record<string, number> = {
      'voyage-3.5': 1024,
      'voyage-3.5-lite': 1024,
      'voyage-3-large': 1024,
      'voyage-code-3': 1024,
      'voyage-finance-2': 1024,
      'voyage-law-2': 1024,
      'voyage-multilingual-2': 1024,
      'voyage-large-2': 1536,
      'voyage-large-2-instruct': 1024,
      'voyage-code-2': 1536,
      'voyage-2': 1024,
      'voyage-3': 1024,
      'voyage-3-lite': 512
    };

    return modelDimensions[this.config.model] || 1024;
  }

  /**
   * Get the model name
   */
  getModel(): string {
    return this.config.model;
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): { requestCount: number; totalTokens: number } {
    return {
      requestCount: this.requestCount,
      totalTokens: this.totalTokens
    };
  }

  /**
   * Process texts in batches
   */
  private async processBatches(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    
    for (let i = 0; i < texts.length; i += this.config.batchSize) {
      const batch = texts.slice(i, i + this.config.batchSize);
      const batchResults = await this.callVoyageAPI(batch);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Call Voyage AI API with retry logic
   */
  private async callVoyageAPI(texts: string[]): Promise<number[][]> {
    let lastError: Error = new Error('Unknown error occurred');

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.makeAPIRequest(texts);
        
        this.requestCount++;
        this.totalTokens += response.usage.total_tokens;

        return response.data.map(item => item.embedding);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === this.config.maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          throw error;
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Make the actual API request to Voyage AI
   */
  private async makeAPIRequest(texts: string[]): Promise<VoyageEmbeddingResponse> {
    const requestBody: any = {
      input: texts.length === 1 ? texts[0] : texts,
      model: this.config.model
    };

    // Add optional parameters
    if (this.config.inputType) {
      requestBody.input_type = this.config.inputType;
    }
    if (this.config.outputDimension) {
      requestBody.output_dimension = this.config.outputDimension;
    }
    if (this.config.outputDtype !== 'float') {
      requestBody.output_dtype = this.config.outputDtype;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        throw new Error(`Voyage AI API error: ${response.status} - ${errorData.message || response.statusText}`);
      }

      const data = await response.json() as VoyageEmbeddingResponse;
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Voyage AI API request timeout after ${this.config.timeout}ms`);
      }
      
      throw error;
    }
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Retry on network errors, timeouts, and 5xx server errors
    if (error.name === 'AbortError') return true;
    if (error.message?.includes('timeout')) return true;
    if (error.message?.includes('ECONNRESET')) return true;
    if (error.message?.includes('ENOTFOUND')) return true;
    
    // Check HTTP status codes
    const statusMatch = error.message?.match(/(\d{3})/);
    if (statusMatch) {
      const status = parseInt(statusMatch[1]);
      return status >= 500 || status === 429; // Server errors or rate limiting
    }

    return false;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error('Voyage AI API key is required');
    }

    if (!this.config.model) {
      throw new Error('Voyage AI model is required');
    }

    // Validate API key format
    if (!this.config.apiKey.startsWith('pa-')) {
      throw new Error('Invalid Voyage AI API key format. Should start with "pa-"');
    }

    // Validate model name
    const validModels = [
      'voyage-3.5', 'voyage-3.5-lite', 'voyage-3-large', 'voyage-code-3',
      'voyage-finance-2', 'voyage-law-2', 'voyage-multilingual-2',
      'voyage-large-2', 'voyage-large-2-instruct', 'voyage-code-2',
      'voyage-2', 'voyage-3', 'voyage-3-lite'
    ];

    if (!validModels.includes(this.config.model)) {
      console.warn(`Unknown Voyage AI model: ${this.config.model}. Proceeding anyway...`);
    }
  }

  /**
   * Create a Voyage AI provider with recommended settings for different use cases
   */
  static forGeneralPurpose(apiKey: string): VoyageAIEmbeddingProvider {
    return new VoyageAIEmbeddingProvider({
      apiKey,
      model: 'voyage-3.5', // Best general-purpose model
      inputType: 'document'
    });
  }

  static forCode(apiKey: string): VoyageAIEmbeddingProvider {
    return new VoyageAIEmbeddingProvider({
      apiKey,
      model: 'voyage-code-3', // Optimized for code
      inputType: 'document'
    });
  }

  static forQuery(apiKey: string): VoyageAIEmbeddingProvider {
    return new VoyageAIEmbeddingProvider({
      apiKey,
      model: 'voyage-3.5',
      inputType: 'query'
    });
  }

  static forHighPerformance(apiKey: string): VoyageAIEmbeddingProvider {
    return new VoyageAIEmbeddingProvider({
      apiKey,
      model: 'voyage-3-large', // Best quality
      inputType: 'document'
    });
  }

  static forLowLatency(apiKey: string): VoyageAIEmbeddingProvider {
    return new VoyageAIEmbeddingProvider({
      apiKey,
      model: 'voyage-3.5-lite', // Optimized for speed
      inputType: 'document'
    });
  }
}
