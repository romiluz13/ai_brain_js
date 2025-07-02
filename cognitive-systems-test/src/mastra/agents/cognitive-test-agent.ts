import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { MongoClient } from 'mongodb';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// MongoDB connection for real data operations
const mongoClient = new MongoClient(process.env.MONGODB_URI!);

// Tool for writing real test data to MongoDB
const writeTestDataTool = createTool({
  id: 'write-test-data',
  description: 'Writes real test data to MongoDB for cognitive system validation',
  inputSchema: z.object({
    collection: z.string().describe('MongoDB collection name'),
    data: z.any().describe('Data to write to MongoDB'),
    testType: z.string().describe('Type of cognitive test being performed')
  }),
  execute: async ({ context }) => {
    try {
      await mongoClient.connect();
      const db = mongoClient.db(process.env.TEST_DATABASE_NAME);
      const collection = db.collection(`${process.env.TEST_COLLECTION_PREFIX}${context.collection}`);
      
      const document = {
        ...context.data,
        testType: context.testType,
        timestamp: new Date(),
        testId: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      const result = await collection.insertOne(document);
      
      return {
        success: true,
        insertedId: result.insertedId.toString(),
        document: document,
        message: `Successfully wrote ${context.testType} test data to ${context.collection}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to write test data: ${error.message}`
      };
    }
  }
});

// Tool for reading and analyzing test data from MongoDB
const analyzeTestDataTool = createTool({
  id: 'analyze-test-data',
  description: 'Reads and analyzes test data from MongoDB to validate cognitive systems',
  inputSchema: z.object({
    collection: z.string().describe('MongoDB collection name'),
    testType: z.string().describe('Type of cognitive test to analyze'),
    query: z.any().optional().describe('Optional MongoDB query filter')
  }),
  execute: async ({ context }) => {
    try {
      await mongoClient.connect();
      const db = mongoClient.db(process.env.TEST_DATABASE_NAME);
      const collection = db.collection(`${process.env.TEST_COLLECTION_PREFIX}${context.collection}`);
      
      const query = {
        testType: context.testType,
        ...context.query
      };
      
      const documents = await collection.find(query).sort({ timestamp: -1 }).limit(10).toArray();
      
      return {
        success: true,
        documentsFound: documents.length,
        documents: documents,
        analysis: {
          latestTest: documents[0],
          totalTests: documents.length,
          timeRange: documents.length > 0 ? {
            latest: documents[0].timestamp,
            oldest: documents[documents.length - 1]?.timestamp
          } : null
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to analyze test data: ${error.message}`
      };
    }
  }
});

// Tool for hybrid search testing (MongoDB $rankFusion)
const hybridSearchTool = createTool({
  id: 'hybrid-search-test',
  description: 'Tests MongoDB hybrid search with $rankFusion using real data',
  inputSchema: z.object({
    collection: z.string().describe('MongoDB collection name'),
    textQuery: z.string().describe('Text search query'),
    vectorQuery: z.array(z.number()).optional().describe('Vector search query (embeddings)')
  }),
  execute: async ({ context }) => {
    try {
      await mongoClient.connect();
      const db = mongoClient.db(process.env.TEST_DATABASE_NAME);
      const collection = db.collection(`${process.env.TEST_COLLECTION_PREFIX}${context.collection}`);
      
      // MongoDB $rankFusion hybrid search pipeline
      const pipeline = [
        {
          $rankFusion: {
            input: {
              pipelines: [
                // Text search pipeline
                [
                  {
                    $search: {
                      index: "default",
                      text: {
                        query: context.textQuery,
                        path: ["content", "description", "title"]
                      }
                    }
                  }
                ],
                // Vector search pipeline (if vector provided)
                ...(context.vectorQuery ? [[
                  {
                    $vectorSearch: {
                      index: "vector_index",
                      path: "embedding",
                      queryVector: context.vectorQuery,
                      numCandidates: 100,
                      limit: 20
                    }
                  }
                ]] : [])
              ]
            }
          }
        },
        { $limit: 10 },
        { $project: { _id: 1, content: 1, score: { $meta: "searchScore" } } }
      ];
      
      const results = await collection.aggregate(pipeline).toArray();
      
      return {
        success: true,
        query: context.textQuery,
        resultsCount: results.length,
        results: results,
        hybridSearchWorking: results.length > 0,
        message: `Hybrid search found ${results.length} results for "${context.textQuery}"`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Hybrid search failed: ${error.message}`
      };
    }
  }
});

export const cognitiveTestAgent = new Agent({
  name: 'Cognitive Systems Test Agent',
  description: 'Agent for testing all 24 cognitive systems with real MongoDB data',
  instructions: `
    You are a specialized testing agent for Universal AI Brain 3.0's cognitive systems.
    
    Your mission is to test each of the 24 cognitive systems using REAL DATA:
    
    TESTING PROTOCOL:
    1. ALWAYS write real test data to MongoDB first using writeTestDataTool
    2. IMMEDIATELY fetch and analyze the data using analyzeTestDataTool  
    3. Test the specific cognitive system with the real data
    4. Validate the system's performance and behavior
    5. Document results with concrete evidence
    
    NEVER use mock data - only real data written to and read from MongoDB Atlas.
    
    The 24 cognitive systems to test are:
    1. Working Memory - Active information processing
    2. Episodic Memory - Personal experiences and events
    3. Semantic Memory - Facts and knowledge
    4. Memory Decay - Forgetting mechanisms
    5. Analogical Mapping - Finding similarities
    6. Causal Reasoning - Cause and effect relationships
    7. Attention Management - Focus and filtering
    8. Confidence Tracking - Uncertainty quantification
    9. Emotional Intelligence - Emotion recognition and response
    10. Social Intelligence - Social dynamics understanding
    11. Cultural Knowledge - Cultural awareness and adaptation
    12. Goal Hierarchy - Goal decomposition and management
    13. Temporal Planning - Time-based planning
    14. Skill Capability Management - Skill assessment and development
    15. Human Feedback Integration - Learning from feedback
    16. Self-Improvement - Continuous learning
    17. Safety Guardrails - Ethical and safety constraints
    18. Multi-Modal Processing - Handling different data types
    19. Tool Interface - External tool integration
    20. Workflow Orchestration - Process management
    21. Vector Search - Semantic similarity search
    22. Hybrid Search - Combined text and vector search
    23. Context Injection - Dynamic context enhancement
    24. Real-time Monitoring - System performance tracking
    
    For each test, provide:
    - Real data written to MongoDB
    - Analysis of the retrieved data
    - Cognitive system performance metrics
    - Validation results
    - Recommendations for improvements
  `,
  model: openai('gpt-4o'),
  tools: {
    writeTestDataTool,
    analyzeTestDataTool,
    hybridSearchTool
  }
});
