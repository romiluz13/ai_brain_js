import { Mastra } from '@mastra/core';
import { UniversalAIBrain } from 'universal-ai-brain';
import { cognitiveTestAgent } from './agents/cognitive-test-agent';
import { memoryTestAgent } from './agents/memory-test-agent';
import { reasoningTestAgent } from './agents/reasoning-test-agent';
import { emotionalTestAgent } from './agents/emotional-test-agent';
import { socialTestAgent } from './agents/social-test-agent';
import { temporalTestAgent } from './agents/temporal-test-agent';
import { metaTestAgent } from './agents/meta-test-agent';

// Initialize Universal AI Brain with real MongoDB Atlas
const brain = UniversalAIBrain.forOpenAI({
  mongoUri: process.env.MONGODB_URI,
  apiKey: process.env.OPENAI_API_KEY,
  databaseName: process.env.TEST_DATABASE_NAME || 'cognitive_systems_test'
});

export const mastra = new Mastra({
  agents: {
    cognitiveTestAgent,
    memoryTestAgent,
    reasoningTestAgent,
    emotionalTestAgent,
    socialTestAgent,
    temporalTestAgent,
    metaTestAgent
  }
});

export { brain };
