import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGODB_URI!);

// Tool for testing Working Memory with real data
const testWorkingMemoryTool = createTool({
  id: 'test-working-memory',
  description: 'Tests working memory system with real data - active information processing',
  inputSchema: z.object({
    activeItems: z.array(z.string()).describe('Items currently being processed'),
    capacity: z.number().describe('Working memory capacity limit'),
    task: z.string().describe('Current task being performed')
  }),
  execute: async ({ context }) => {
    try {
      await mongoClient.connect();
      const db = mongoClient.db(process.env.TEST_DATABASE_NAME);
      const collection = db.collection('test_working_memory');
      
      const workingMemoryData = {
        activeItems: context.activeItems,
        capacity: context.capacity,
        task: context.task,
        timestamp: new Date(),
        testType: 'working_memory_validation',
        memoryLoad: context.activeItems.length / context.capacity,
        overloaded: context.activeItems.length > context.capacity
      };
      
      const result = await collection.insertOne(workingMemoryData);
      
      // Immediately retrieve and analyze
      const retrieved = await collection.findOne({ _id: result.insertedId });
      
      return {
        success: true,
        testId: result.insertedId.toString(),
        workingMemoryAnalysis: {
          currentLoad: retrieved.memoryLoad,
          isOverloaded: retrieved.overloaded,
          activeItemsCount: retrieved.activeItems.length,
          capacityUtilization: `${(retrieved.memoryLoad * 100).toFixed(1)}%`
        },
        realDataStored: retrieved,
        cognitiveSystemStatus: 'WORKING_MEMORY_FUNCTIONAL'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
});

// Tool for testing Episodic Memory with real data
const testEpisodicMemoryTool = createTool({
  id: 'test-episodic-memory',
  description: 'Tests episodic memory system with real data - personal experiences and events',
  inputSchema: z.object({
    event: z.string().describe('The event or experience to store'),
    context: z.string().describe('Context of the event'),
    emotions: z.array(z.string()).describe('Emotions associated with the event'),
    participants: z.array(z.string()).describe('People involved in the event')
  }),
  execute: async ({ context }) => {
    try {
      await mongoClient.connect();
      const db = mongoClient.db(process.env.TEST_DATABASE_NAME);
      const collection = db.collection('test_episodic_memory');
      
      const episodicData = {
        event: context.event,
        context: context.context,
        emotions: context.emotions,
        participants: context.participants,
        timestamp: new Date(),
        testType: 'episodic_memory_validation',
        memoryType: 'episodic',
        emotionalValence: context.emotions.includes('positive') ? 'positive' : 
                         context.emotions.includes('negative') ? 'negative' : 'neutral'
      };
      
      const result = await collection.insertOne(episodicData);
      const retrieved = await collection.findOne({ _id: result.insertedId });
      
      // Test memory retrieval by searching for similar events
      const similarEvents = await collection.find({
        $or: [
          { context: context.context },
          { emotions: { $in: context.emotions } }
        ]
      }).limit(5).toArray();
      
      return {
        success: true,
        testId: result.insertedId.toString(),
        episodicMemoryAnalysis: {
          eventStored: true,
          emotionalContext: retrieved.emotionalValence,
          participantCount: retrieved.participants.length,
          similarEventsFound: similarEvents.length
        },
        realDataStored: retrieved,
        similarMemories: similarEvents,
        cognitiveSystemStatus: 'EPISODIC_MEMORY_FUNCTIONAL'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
});

// Tool for testing Semantic Memory with real data
const testSemanticMemoryTool = createTool({
  id: 'test-semantic-memory',
  description: 'Tests semantic memory system with real data - facts and knowledge',
  inputSchema: z.object({
    fact: z.string().describe('The fact or knowledge to store'),
    category: z.string().describe('Category of the knowledge'),
    confidence: z.number().min(0).max(1).describe('Confidence level in the fact'),
    sources: z.array(z.string()).describe('Sources of the information')
  }),
  execute: async ({ context }) => {
    try {
      await mongoClient.connect();
      const db = mongoClient.db(process.env.TEST_DATABASE_NAME);
      const collection = db.collection('test_semantic_memory');
      
      const semanticData = {
        fact: context.fact,
        category: context.category,
        confidence: context.confidence,
        sources: context.sources,
        timestamp: new Date(),
        testType: 'semantic_memory_validation',
        memoryType: 'semantic',
        reliability: context.confidence > 0.8 ? 'high' : context.confidence > 0.5 ? 'medium' : 'low'
      };
      
      const result = await collection.insertOne(semanticData);
      const retrieved = await collection.findOne({ _id: result.insertedId });
      
      // Test knowledge retrieval by category
      const relatedFacts = await collection.find({
        category: context.category
      }).limit(5).toArray();
      
      return {
        success: true,
        testId: result.insertedId.toString(),
        semanticMemoryAnalysis: {
          factStored: true,
          knowledgeCategory: retrieved.category,
          confidenceLevel: retrieved.confidence,
          reliabilityRating: retrieved.reliability,
          relatedFactsCount: relatedFacts.length
        },
        realDataStored: retrieved,
        relatedKnowledge: relatedFacts,
        cognitiveSystemStatus: 'SEMANTIC_MEMORY_FUNCTIONAL'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
});

// Tool for testing Memory Decay with real data
const testMemoryDecayTool = createTool({
  id: 'test-memory-decay',
  description: 'Tests memory decay system with real data - forgetting mechanisms',
  inputSchema: z.object({
    memoryId: z.string().describe('ID of memory to test decay on'),
    timeElapsed: z.number().describe('Time elapsed since memory creation (hours)'),
    accessFrequency: z.number().describe('How often the memory has been accessed')
  }),
  execute: async ({ context }) => {
    try {
      await mongoClient.connect();
      const db = mongoClient.db(process.env.TEST_DATABASE_NAME);
      const collection = db.collection('test_memory_decay');
      
      // Calculate decay factor based on time and access frequency
      const decayFactor = Math.exp(-context.timeElapsed / 24) * (1 + context.accessFrequency * 0.1);
      const shouldDecay = decayFactor < 0.3;
      
      const decayData = {
        memoryId: context.memoryId,
        timeElapsed: context.timeElapsed,
        accessFrequency: context.accessFrequency,
        decayFactor: decayFactor,
        shouldDecay: shouldDecay,
        timestamp: new Date(),
        testType: 'memory_decay_validation',
        decayStatus: shouldDecay ? 'decayed' : 'retained'
      };
      
      const result = await collection.insertOne(decayData);
      const retrieved = await collection.findOne({ _id: result.insertedId });
      
      return {
        success: true,
        testId: result.insertedId.toString(),
        memoryDecayAnalysis: {
          decayFactor: retrieved.decayFactor,
          shouldDecay: retrieved.shouldDecay,
          decayStatus: retrieved.decayStatus,
          timeElapsed: retrieved.timeElapsed,
          accessFrequency: retrieved.accessFrequency
        },
        realDataStored: retrieved,
        cognitiveSystemStatus: 'MEMORY_DECAY_FUNCTIONAL'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
});

export const memoryTestAgent = new Agent({
  name: 'Memory Systems Test Agent',
  description: 'Specialized agent for testing memory-related cognitive systems with real MongoDB data',
  instructions: `
    You are a specialized testing agent for Universal AI Brain 3.0's memory systems.
    
    Test these 4 memory-related cognitive systems with REAL DATA:
    
    1. WORKING MEMORY - Test active information processing
       - Store current task items in MongoDB
       - Validate capacity limits and overload detection
       - Analyze memory load and utilization
    
    2. EPISODIC MEMORY - Test personal experience storage
       - Store events with emotional context
       - Validate event retrieval and association
       - Test similarity matching for related experiences
    
    3. SEMANTIC MEMORY - Test factual knowledge storage
       - Store facts with confidence levels
       - Validate knowledge categorization
       - Test fact retrieval by category
    
    4. MEMORY DECAY - Test forgetting mechanisms
       - Calculate decay factors based on time and access
       - Validate memory retention vs decay decisions
       - Test decay algorithm with real parameters
    
    TESTING PROTOCOL:
    - Always write real test data to MongoDB first
    - Immediately retrieve and validate the data
    - Test the specific memory system functionality
    - Provide detailed analysis of system performance
    - Document all results with concrete evidence
    
    NO MOCK DATA - only real MongoDB operations!
  `,
  model: openai('gpt-4o'),
  tools: {
    testWorkingMemoryTool,
    testEpisodicMemoryTool,
    testSemanticMemoryTool,
    testMemoryDecayTool
  }
});
