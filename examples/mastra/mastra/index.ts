import { Mastra } from '@mastra/core';
import { aiBrainTestAgent } from './agents/index';

export const mastra = new Mastra({
  agents: { aiBrainTestAgent },
});
