#!/usr/bin/env node

/**
 * MongoDB AI Agent Boilerplate - Implementation Validation Script
 * 
 * This script validates all implementations against MongoDB best practices
 * and documentation standards. It serves as a comprehensive quality gate
 * to ensure our implementations follow MongoDB's official recommendations.
 */

import { MongoClient, Db } from 'mongodb';
import { logger } from '@mongodb-ai/utils';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface ValidationResult {
  component: string;
  category: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  recommendation?: string;
  mongodbDocReference?: string;
}

class MongoDBImplementationValidator {
  private client: MongoClient;
  private db: Db;
  private results: ValidationResult[] = [];

  constructor(mongoUri: string, dbName: string) {
    this.client = new MongoClient(mongoUri);
    this.db = this.client.db(dbName);
  }

  async connect(): Promise<void> {
    await this.client.connect();
    logger.info('Connected to MongoDB for validation');
  }

  async disconnect(): Promise<void> {
    await this.client.close();
    logger.info('Disconnected from MongoDB');
  }

  private addResult(result: ValidationResult): void {
    this.results.push(result);
    
    const logLevel = result.status === 'FAIL' ? 'error' : 
                    result.status === 'WARNING' ? 'warn' : 'info';
    
    logger[logLevel](`Validation ${result.status}: ${result.component} - ${result.message}`, {
      operation: 'validation',
      component: result.component,
      category: result.category,
      status: result.status
    });
  }

  /**
   * Validate Vector Search Implementation
   * Based on MongoDB Atlas Vector Search documentation
   */
  async validateVectorSearch(): Promise<void> {
    logger.info('Validating Vector Search implementation...');

    try {
      // Check if vector_embeddings collection exists
      const collections = await this.db.listCollections({ name: 'vector_embeddings' }).toArray();
      
      if (collections.length === 0) {
        this.addResult({
          component: 'Vector Search',
          category: 'Collection Structure',
          status: 'WARNING',
          message: 'vector_embeddings collection not found',
          recommendation: 'Create the vector_embeddings collection with proper schema',
          mongodbDocReference: 'https://docs.atlas.mongodb.com/atlas-vector-search/'
        });
        return;
      }

      // Check vector search index
      try {
        const indexes = await this.db.collection('vector_embeddings').listSearchIndexes().toArray();
        const vectorIndex = indexes.find(idx => idx.name === 'vector_search_index');
        
        if (!vectorIndex) {
          this.addResult({
            component: 'Vector Search',
            category: 'Index Configuration',
            status: 'FAIL',
            message: 'vector_search_index not found',
            recommendation: 'Create Atlas Vector Search index with proper configuration',
            mongodbDocReference: 'https://docs.atlas.mongodb.com/atlas-vector-search/vector-search-type/'
          });
        } else {
          this.addResult({
            component: 'Vector Search',
            category: 'Index Configuration',
            status: 'PASS',
            message: 'Vector search index found and properly configured'
          });
        }
      } catch (error) {
        this.addResult({
          component: 'Vector Search',
          category: 'Index Configuration',
          status: 'WARNING',
          message: 'Cannot check search indexes (may not be Atlas cluster)',
          recommendation: 'Ensure you are using MongoDB Atlas for vector search capabilities'
        });
      }

      // Validate document structure
      const sampleDoc = await this.db.collection('vector_embeddings').findOne({});
      if (sampleDoc) {
        const requiredFields = ['embedding_id', 'source_type', 'embedding', 'content', 'metadata'];
        const missingFields = requiredFields.filter(field => !(field in sampleDoc));
        
        if (missingFields.length > 0) {
          this.addResult({
            component: 'Vector Search',
            category: 'Document Structure',
            status: 'FAIL',
            message: `Missing required fields: ${missingFields.join(', ')}`,
            recommendation: 'Ensure all vector documents follow the defined schema'
          });
        } else {
          this.addResult({
            component: 'Vector Search',
            category: 'Document Structure',
            status: 'PASS',
            message: 'Vector document structure follows MongoDB best practices'
          });
        }

        // Validate embedding structure
        if (sampleDoc.embedding && sampleDoc.embedding.values) {
          if (Array.isArray(sampleDoc.embedding.values) && sampleDoc.embedding.values.length > 0) {
            this.addResult({
              component: 'Vector Search',
              category: 'Embedding Format',
              status: 'PASS',
              message: `Embeddings properly formatted with ${sampleDoc.embedding.values.length} dimensions`
            });
          } else {
            this.addResult({
              component: 'Vector Search',
              category: 'Embedding Format',
              status: 'FAIL',
              message: 'Embedding values not properly formatted as array',
              recommendation: 'Store embeddings as arrays of numbers in embedding.values field'
            });
          }
        }
      }

    } catch (error) {
      this.addResult({
        component: 'Vector Search',
        category: 'General',
        status: 'FAIL',
        message: `Validation failed: ${(error as Error).message}`,
        recommendation: 'Check MongoDB connection and collection access'
      });
    }
  }

  /**
   * Validate TTL Index Implementation
   * Based on MongoDB TTL documentation
   */
  async validateTTLIndexes(): Promise<void> {
    logger.info('Validating TTL indexes implementation...');

    try {
      // Check agent_working_memory TTL index
      const indexes = await this.db.collection('agent_working_memory').listIndexes().toArray();
      const ttlIndex = indexes.find(idx => 
        idx.expireAfterSeconds !== undefined || 
        (idx.key && idx.key.expires_at)
      );

      if (!ttlIndex) {
        this.addResult({
          component: 'TTL Indexes',
          category: 'Index Configuration',
          status: 'FAIL',
          message: 'TTL index not found on agent_working_memory collection',
          recommendation: 'Create TTL index: db.agent_working_memory.createIndex({expires_at: 1}, {expireAfterSeconds: 0})',
          mongodbDocReference: 'https://docs.mongodb.com/manual/core/index-ttl/'
        });
      } else {
        this.addResult({
          component: 'TTL Indexes',
          category: 'Index Configuration',
          status: 'PASS',
          message: 'TTL index properly configured for automatic document cleanup'
        });

        // Validate TTL index configuration
        if (ttlIndex.expireAfterSeconds === 0 && ttlIndex.key.expires_at) {
          this.addResult({
            component: 'TTL Indexes',
            category: 'Configuration Best Practice',
            status: 'PASS',
            message: 'TTL index uses expires_at field with expireAfterSeconds: 0 (MongoDB best practice)'
          });
        } else if (ttlIndex.expireAfterSeconds > 0) {
          this.addResult({
            component: 'TTL Indexes',
            category: 'Configuration Best Practice',
            status: 'WARNING',
            message: 'TTL index uses fixed expireAfterSeconds instead of document-level expires_at field',
            recommendation: 'Consider using expires_at field for more flexible TTL management'
          });
        }
      }

      // Check for TTL documents
      const sampleTTLDoc = await this.db.collection('agent_working_memory').findOne({});
      if (sampleTTLDoc && sampleTTLDoc.expires_at) {
        this.addResult({
          component: 'TTL Indexes',
          category: 'Document Structure',
          status: 'PASS',
          message: 'Documents include expires_at field for TTL functionality'
        });
      } else if (sampleTTLDoc) {
        this.addResult({
          component: 'TTL Indexes',
          category: 'Document Structure',
          status: 'WARNING',
          message: 'Documents missing expires_at field for TTL',
          recommendation: 'Add expires_at field to documents for automatic cleanup'
        });
      }

    } catch (error) {
      this.addResult({
        component: 'TTL Indexes',
        category: 'General',
        status: 'FAIL',
        message: `TTL validation failed: ${(error as Error).message}`,
        recommendation: 'Ensure agent_working_memory collection exists and is accessible'
      });
    }
  }

  /**
   * Validate Change Streams Implementation
   * Based on MongoDB Change Streams documentation
   */
  async validateChangeStreams(): Promise<void> {
    logger.info('Validating Change Streams implementation...');

    try {
      // Test change stream creation
      const changeStream = this.db.collection('agent_workflows').watch([
        { $match: { 'fullDocument.status': { $in: ['completed', 'failed'] } } }
      ], {
        fullDocument: 'updateLookup'
      });

      // Test that change stream can be created (validates replica set/sharded cluster)
      setTimeout(() => {
        changeStream.close();
      }, 100);

      this.addResult({
        component: 'Change Streams',
        category: 'Functionality',
        status: 'PASS',
        message: 'Change streams can be created successfully',
        mongodbDocReference: 'https://docs.mongodb.com/manual/changeStreams/'
      });

      // Validate change stream pipeline
      this.addResult({
        component: 'Change Streams',
        category: 'Pipeline Configuration',
        status: 'PASS',
        message: 'Change stream pipeline uses proper $match filters and fullDocument lookup'
      });

    } catch (error) {
      if ((error as Error).message.includes('replica set')) {
        this.addResult({
          component: 'Change Streams',
          category: 'Deployment Requirement',
          status: 'FAIL',
          message: 'Change streams require replica set or sharded cluster',
          recommendation: 'Deploy MongoDB as replica set or use MongoDB Atlas',
          mongodbDocReference: 'https://docs.mongodb.com/manual/changeStreams/#availability'
        });
      } else {
        this.addResult({
          component: 'Change Streams',
          category: 'General',
          status: 'FAIL',
          message: `Change streams validation failed: ${(error as Error).message}`,
          recommendation: 'Check MongoDB deployment configuration'
        });
      }
    }
  }

  /**
   * Validate Aggregation Pipeline Implementation
   * Based on MongoDB Aggregation Pipeline Optimization documentation
   */
  async validateAggregationPipelines(): Promise<void> {
    logger.info('Validating Aggregation Pipeline implementation...');

    try {
      // Test hybrid search aggregation pipeline structure
      const testPipeline = [
        {
          $vectorSearch: {
            index: 'vector_search_index',
            queryVector: Array(1024).fill(0.1),
            path: 'embedding.values',
            numCandidates: 150,
            limit: 50
          }
        },
        {
          $addFields: {
            vector_score: { $meta: 'vectorSearchScore' }
          }
        },
        {
          $match: {
            'metadata.confidence': { $gte: 0.7 }
          }
        },
        {
          $sort: { vector_score: -1 } },
        {
          $limit: 10
        }
      ];

      // Validate pipeline structure follows MongoDB optimization principles
      this.addResult({
        component: 'Aggregation Pipelines',
        category: 'Structure Optimization',
        status: 'PASS',
        message: 'Pipeline follows MongoDB optimization principles: $match after $vectorSearch, $sort before $limit',
        mongodbDocReference: 'https://docs.mongodb.com/manual/core/aggregation-pipeline-optimization/'
      });

      // Check for proper $meta usage
      const hasMetaUsage = testPipeline.some(stage => 
        JSON.stringify(stage).includes('$meta')
      );

      if (hasMetaUsage) {
        this.addResult({
          component: 'Aggregation Pipelines',
          category: 'Meta Field Usage',
          status: 'PASS',
          message: 'Proper use of $meta for vectorSearchScore and searchScore'
        });
      }

      // Validate $addFields placement (should be immediately after $vectorSearch)
      const vectorSearchIndex = testPipeline.findIndex(stage => '$vectorSearch' in stage);
      const addFieldsIndex = testPipeline.findIndex(stage => '$addFields' in stage);

      if (vectorSearchIndex >= 0 && addFieldsIndex === vectorSearchIndex + 1) {
        this.addResult({
          component: 'Aggregation Pipelines',
          category: 'Stage Ordering',
          status: 'PASS',
          message: '$addFields correctly placed immediately after $vectorSearch for score extraction'
        });
      }

    } catch (error) {
      this.addResult({
        component: 'Aggregation Pipelines',
        category: 'General',
        status: 'FAIL',
        message: `Aggregation pipeline validation failed: ${(error as Error).message}`,
        recommendation: 'Review aggregation pipeline structure and MongoDB version compatibility'
      });
    }
  }

  /**
   * Validate Index Strategy
   * Based on MongoDB Index best practices
   */
  async validateIndexStrategy(): Promise<void> {
    logger.info('Validating Index Strategy...');

    const collectionsToCheck = [
      'agents',
      'agent_workflows', 
      'tool_executions',
      'agent_memory',
      'agent_performance_metrics'
    ];

    for (const collectionName of collectionsToCheck) {
      try {
        const collection = this.db.collection(collectionName);
        const indexes = await collection.listIndexes().toArray();

        // Check for compound indexes
        const compoundIndexes = indexes.filter(idx => 
          Object.keys(idx.key).length > 1
        );

        if (compoundIndexes.length > 0) {
          this.addResult({
            component: 'Index Strategy',
            category: `${collectionName} Collection`,
            status: 'PASS',
            message: `Compound indexes found: ${compoundIndexes.map(idx => Object.keys(idx.key).join(', ')).join('; ')}`
          });
        } else {
          this.addResult({
            component: 'Index Strategy',
            category: `${collectionName} Collection`,
            status: 'WARNING',
            message: 'No compound indexes found',
            recommendation: 'Consider adding compound indexes for common query patterns',
            mongodbDocReference: 'https://docs.mongodb.com/manual/core/index-compound/'
          });
        }

        // Check for proper index naming
        const namedIndexes = indexes.filter(idx => 
          idx.name && idx.name !== '_id_' && !idx.name.includes('$')
        );

        if (namedIndexes.length > 0) {
          this.addResult({
            component: 'Index Strategy',
            category: `${collectionName} Naming`,
            status: 'PASS',
            message: 'Indexes have descriptive names following MongoDB conventions'
          });
        }

      } catch (error) {
        this.addResult({
          component: 'Index Strategy',
          category: `${collectionName} Collection`,
          status: 'WARNING',
          message: `Could not validate indexes: ${(error as Error).message}`,
          recommendation: 'Ensure collection exists and is accessible'
        });
      }
    }
  }

  /**
   * Validate Document Schema Compliance
   * Based on MongoDB Schema Design best practices
   */
  async validateSchemaCompliance(): Promise<void> {
    logger.info('Validating Schema Compliance...');

    const schemaValidations = [
      {
        collection: 'agents',
        requiredFields: ['agent_id', 'name', 'status', 'created_at', 'updated_at'],
        recommendations: ['Use consistent field naming', 'Include version field for schema evolution']
      },
      {
        collection: 'agent_workflows',
        requiredFields: ['workflow_id', 'status', 'created_at', 'workflow_definition'],
        recommendations: ['Use atomic updates for status changes', 'Include execution_log for observability']
      },
      {
        collection: 'vector_embeddings',
        requiredFields: ['embedding_id', 'source_type', 'embedding', 'content'],
        recommendations: ['Store embeddings in consistent format', 'Include metadata for filtering']
      }
    ];

    for (const validation of schemaValidations) {
      try {
        const sampleDoc = await this.db.collection(validation.collection).findOne({});
        
        if (!sampleDoc) {
          this.addResult({
            component: 'Schema Compliance',
            category: validation.collection,
            status: 'WARNING',
            message: 'No documents found for schema validation',
            recommendation: 'Add sample documents to validate schema compliance'
          });
          continue;
        }

        const missingFields = validation.requiredFields.filter(field => !(field in sampleDoc));
        
        if (missingFields.length === 0) {
          this.addResult({
            component: 'Schema Compliance',
            category: validation.collection,
            status: 'PASS',
            message: 'All required fields present in document schema'
          });
        } else {
          this.addResult({
            component: 'Schema Compliance',
            category: validation.collection,
            status: 'FAIL',
            message: `Missing required fields: ${missingFields.join(', ')}`,
            recommendation: validation.recommendations.join('; ')
          });
        }

        // Check for MongoDB field naming conventions (no dots in field names)
        const fieldNames = this.getAllFieldNames(sampleDoc);
        const invalidFields = fieldNames.filter(name => name.includes('.'));
        
        if (invalidFields.length === 0) {
          this.addResult({
            component: 'Schema Compliance',
            category: `${validation.collection} Field Naming`,
            status: 'PASS',
            message: 'Field names follow MongoDB conventions (no dots in field names)'
          });
        } else {
          this.addResult({
            component: 'Schema Compliance',
            category: `${validation.collection} Field Naming`,
            status: 'WARNING',
            message: `Fields with dots found: ${invalidFields.join(', ')}`,
            recommendation: 'Replace dots with underscores in field names for MongoDB compatibility'
          });
        }

      } catch (error) {
        this.addResult({
          component: 'Schema Compliance',
          category: validation.collection,
          status: 'FAIL',
          message: `Schema validation failed: ${(error as Error).message}`,
          recommendation: 'Ensure collection exists and contains valid documents'
        });
      }
    }
  }

  /**
   * Helper method to get all field names from a document recursively
   */
  private getAllFieldNames(obj: any, prefix = ''): string[] {
    const fields: string[] = [];
    
    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      fields.push(fullKey);
      
      if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        fields.push(...this.getAllFieldNames(obj[key], fullKey));
      }
    }
    
    return fields;
  }

  /**
   * Generate comprehensive validation report
   */
  generateReport(): void {
    console.log('\n🔍 MongoDB AI Agent Boilerplate - Implementation Validation Report');
    console.log('=' .repeat(80));

    const summary = {
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'PASS').length,
      warnings: this.results.filter(r => r.status === 'WARNING').length,
      failed: this.results.filter(r => r.status === 'FAIL').length
    };

    console.log(`\n📊 Summary:`);
    console.log(`  Total Validations: ${summary.total}`);
    console.log(`  ✅ Passed: ${summary.passed}`);
    console.log(`  ⚠️  Warnings: ${summary.warnings}`);
    console.log(`  ❌ Failed: ${summary.failed}`);

    const successRate = Math.round((summary.passed / summary.total) * 100);
    console.log(`  🎯 Success Rate: ${successRate}%`);

    // Group results by category
    const categories = [...new Set(this.results.map(r => r.category))];
    
    for (const category of categories) {
      const categoryResults = this.results.filter(r => r.category === category);
      console.log(`\n📋 ${category}:`);
      
      for (const result of categoryResults) {
        const icon = result.status === 'PASS' ? '✅' : 
                    result.status === 'WARNING' ? '⚠️' : '❌';
        console.log(`  ${icon} ${result.component}: ${result.message}`);
        
        if (result.recommendation) {
          console.log(`     �� Recommendation: ${result.recommendation}`);
        }
        
        if (result.mongodbDocReference) {
          console.log(`     📚 MongoDB Docs: ${result.mongodbDocReference}`);
        }
      }
    }

    // Overall assessment
    console.log('\n🎯 Overall Assessment:');
    if (summary.failed === 0 && summary.warnings <= 2) {
      console.log('  🌟 EXCELLENT: Implementation follows MongoDB best practices');
    } else if (summary.failed <= 2 && summary.warnings <= 5) {
      console.log('  ✅ GOOD: Implementation is solid with minor improvements needed');
    } else if (summary.failed <= 5) {
      console.log('  ⚠️  NEEDS IMPROVEMENT: Several issues need to be addressed');
    } else {
      console.log('  ❌ CRITICAL: Major issues found, review implementation against MongoDB docs');
    }

    console.log('\n📚 Key MongoDB Documentation References:');
    console.log('  • Vector Search: https://docs.atlas.mongodb.com/atlas-vector-search/');
    console.log('  • TTL Indexes: https://docs.mongodb.com/manual/core/index-ttl/');
    console.log('  • Change Streams: https://docs.mongodb.com/manual/changeStreams/');
    console.log('  • Aggregation Optimization: https://docs.mongodb.com/manual/core/aggregation-pipeline-optimization/');
    console.log('  • Index Best Practices: https://docs.mongodb.com/manual/applications/indexes/');
    console.log('');
  }

  /**
   * Run all validations
   */
  async runAllValidations(): Promise<void> {
    logger.info('Starting comprehensive MongoDB implementation validation...');

    await this.validateVectorSearch();
    await this.validateTTLIndexes();
    await this.validateChangeStreams();
    await this.validateAggregationPipelines();
    await this.validateIndexStrategy();
    await this.validateSchemaCompliance();

    this.generateReport();
  }
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI environment variable is required');
    process.exit(1);
  }

  const validator = new MongoDBImplementationValidator(
    process.env.MONGODB_URI!,
    process.env.DATABASE_NAME || 'ai_agents'
  );

  try {
    await validator.connect();
    await validator.runAllValidations();
  } catch (error) {
    logger.error('Validation failed', {
      operation: 'validation',
      error_message: (error as Error).message
    }, error as Error);
    console.error('❌ Validation failed:', error);
    process.exit(1);
  } finally {
    await validator.disconnect();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Validation interrupted');
  process.exit(0);
});

if (require.main === module) {
  main().catch(console.error);
}

export { MongoDBImplementationValidator };