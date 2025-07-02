# Universal AI Brain 3.0 - Integration Guide

## 🚀 Quick Start (5 Minutes)

### Step 1: Install
```bash
npm install universal-ai-brain
```

### Step 2: Environment Setup
```bash
# Required Environment Variables
MONGODB_URI=mongodb+srv://your-connection-string
VOYAGE_API_KEY=pa-your-voyage-api-key
OPENAI_API_KEY=sk-your-openai-key  # Optional fallback
```

### Step 3: Basic Integration
```typescript
import { UniversalAIBrain } from 'universal-ai-brain';

// Initialize with Voyage AI (recommended)
const brain = UniversalAIBrain.forVoyage({
  mongoUri: process.env.MONGODB_URI!,
  apiKey: process.env.VOYAGE_API_KEY!,
});

// Initialize the brain with all 24 cognitive systems
await brain.initialize();
console.log('🧠 Universal AI Brain ready with 24 cognitive systems!');
```

## 🔌 Framework Integration Examples

### Mastra Framework
```typescript
import { MastraAdapter } from 'universal-ai-brain';
import { Agent } from '@mastra/core';
import { openai } from '@ai-sdk/openai';

// Create adapter and integrate
const adapter = new MastraAdapter();
await adapter.integrate(brain);

// Create enhanced agent
const enhancedAgent = adapter.createEnhancedAgent({
  name: "ARIA",
  instructions: "You are powered by Universal AI Brain with 24 cognitive systems.",
  model: openai('gpt-4o-mini'),
});

// Chat with enhanced agent
const messages = [{ role: 'user', content: 'Hello!' }];
const response = await enhancedAgent.generate(messages, {
  resourceId: 'session-123',
  threadId: 'thread-456',
});
```

### Vercel AI SDK
```typescript
import { VercelAIAdapter } from 'universal-ai-brain';
import { openai } from 'ai';

const adapter = new VercelAIAdapter();
await adapter.integrate(brain);

const enhancedModel = adapter.enhanceModel(openai('gpt-4'));
```

### LangChain.js
```typescript
import { LangChainJSAdapter } from 'universal-ai-brain';
import { ChatOpenAI } from 'langchain/chat_models/openai';

const adapter = new LangChainJSAdapter();
await adapter.integrate(brain);

const enhancedLLM = adapter.enhanceModel(new ChatOpenAI());
```

### OpenAI Agents
```typescript
import { OpenAIAgentsAdapter } from 'universal-ai-brain';
import OpenAI from 'openai';

const adapter = new OpenAIAgentsAdapter();
await adapter.integrate(brain);

const openai = new OpenAI();
const enhancedAssistant = await adapter.enhanceAssistant(openai, {
  assistantId: 'asst_your_assistant_id'
});
```

## ⚙️ Configuration Options

### Simple Configuration
```typescript
// Voyage AI (Recommended)
const brain = UniversalAIBrain.forVoyage({
  mongoUri: process.env.MONGODB_URI!,
  apiKey: process.env.VOYAGE_API_KEY!,
});

// OpenAI (Fallback)
const brain = UniversalAIBrain.forOpenAI({
  mongoUri: process.env.MONGODB_URI!,
  apiKey: process.env.OPENAI_API_KEY!,
});
```

### Advanced Configuration
```typescript
const brain = new UniversalAIBrain({
  mongodb: {
    connectionString: process.env.MONGODB_URI!,
    databaseName: 'my_ai_brain',
  },
  intelligence: {
    embeddingModel: 'voyage-3.5',
    vectorDimensions: 1024,
    enableHybridSearch: true,
    hybridSearchVectorWeight: 0.7,
    hybridSearchTextWeight: 0.3,
  },
  apis: {
    voyage: {
      apiKey: process.env.VOYAGE_API_KEY!,
    }
  }
});
```

## 🧠 The 24 Cognitive Systems

### Memory Systems (4)
- **Working Memory**: Short-term context management
- **Episodic Memory**: Experience-based learning
- **Semantic Memory**: Knowledge storage and retrieval
- **Memory Decay**: Intelligent forgetting

### Reasoning Systems (6)
- **Analogical Mapping**: Pattern recognition across domains
- **Causal Reasoning**: Cause-and-effect understanding
- **Attention Management**: Focus and priority handling
- **Confidence Tracking**: Uncertainty quantification
- **Context Injection**: Relevant information retrieval
- **Vector Search**: Semantic similarity matching

### Emotional Systems (3)
- **Emotional Intelligence**: Emotion recognition and response
- **Social Intelligence**: Social context understanding
- **Cultural Knowledge**: Cultural awareness and adaptation

### Social Systems (3)
- **Goal Hierarchy**: Multi-level objective management
- **Human Feedback**: Learning from human input
- **Safety Guardrails**: Ethical and safe operation

### Temporal Systems (2)
- **Temporal Planning**: Time-aware decision making
- **Skill Capability**: Ability assessment and development

### Meta Systems (6)
- **Self Improvement**: Continuous learning and optimization
- **Multimodal Processing**: Multi-format data handling
- **Tool Interface**: External tool integration
- **Workflow Orchestration**: Complex task coordination
- **Hybrid Search**: MongoDB Atlas hybrid search
- **Realtime Monitoring**: Performance and health tracking

## 🔧 Common Integration Patterns

### Pattern 1: Simple Enhancement
```typescript
// Just enhance an existing agent/model
const enhancedAgent = await adapter.enhance(baseAgent);
```

### Pattern 2: Custom Configuration
```typescript
// Configure specific cognitive systems
const enhancedAgent = await adapter.enhance(baseAgent, {
  enabledSystems: ['memory', 'reasoning', 'emotional'],
  memoryRetentionDays: 30,
  confidenceThreshold: 0.8,
});
```

### Pattern 3: Multi-Agent Coordination
```typescript
// Multiple agents sharing the same brain
const agent1 = await adapter.enhance(baseAgent1);
const agent2 = await adapter.enhance(baseAgent2);
// Both agents share memories and learning
```

## 🚨 Error Handling Guide

### Critical vs Non-Critical Errors

**✅ Safe to Ignore (Non-Critical):**
```
⚠️ NON-CRITICAL: can't $divide by zero
⚠️ NON-CRITICAL: Atlas Vector Search failed
⚠️ NON-CRITICAL: Dashboard refresh failed
```

**❌ Requires Attention (Critical):**
```
❌ CRITICAL: MongoDB connection failed
❌ CRITICAL: API key invalid
❌ CRITICAL: Brain initialization failed
```

### Common Issues & Solutions

**Issue**: "Unknown Voyage AI model"
**Solution**: Update to latest Universal AI Brain version (uses voyage-3.5)

**Issue**: MongoDB connection errors
**Solution**: Verify MONGODB_URI and network connectivity

**Issue**: API rate limits
**Solution**: Implement exponential backoff (built-in)

## 📊 Performance Optimization

### MongoDB Atlas Optimization
```typescript
// Enable hybrid search for best performance
const brain = new UniversalAIBrain({
  intelligence: {
    enableHybridSearch: true,
    hybridSearchVectorWeight: 0.7, // Adjust based on use case
    hybridSearchTextWeight: 0.3,
  }
});
```

### Memory Management
```typescript
// Configure memory retention
const brain = new UniversalAIBrain({
  intelligence: {
    memoryRetentionDays: 30, // Adjust based on needs
    maxContextLength: 4000,  // Balance context vs performance
  }
});
```

## 🔐 Security Best Practices

1. **Environment Variables**: Never hardcode API keys
2. **MongoDB Security**: Use connection strings with authentication
3. **API Rate Limits**: Built-in rate limiting and retry logic
4. **Data Privacy**: PII detection and filtering enabled by default
5. **Content Filtering**: Safety guardrails active by default

## 🧪 Testing Your Integration

```typescript
// Test basic functionality
const testResponse = await enhancedAgent.generate([
  { role: 'user', content: 'Test message' }
], { resourceId: 'test', threadId: 'test' });

console.log('✅ Integration working:', testResponse.text);
console.log('🧠 Cognitive systems used:', testResponse.cognitiveSystemsUsed);
```

## 📈 Monitoring & Analytics

```typescript
// Get brain status
const status = await brain.getStatus();
console.log('Brain health:', status);

// Monitor performance
const metrics = await brain.getMetrics();
console.log('Performance metrics:', metrics);
```

---

**Need Help?** Check the examples in `/examples` directory or create an issue on GitHub.

**Universal AI Brain 3.0** - Making AI agents truly intelligent.
