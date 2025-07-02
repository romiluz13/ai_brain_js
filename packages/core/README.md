# 🧠 Universal AI Brain 3.3

**The world's most comprehensive cognitive architecture for AI agents with 24 cognitive systems, MongoDB 8.1 hybrid search, and latest Voyage 3.5 embeddings.**

Transform ANY AI framework into a truly intelligent system with semantic memory, emotional intelligence, goal hierarchy, and 21 other cognitive systems.

## 🚀 Quick Start (5 Minutes)

```bash
npm install universal-ai-brain
```

### Simple Setup with Latest Voyage 3.5 (Recommended)
```typescript
import { UniversalAIBrain } from 'universal-ai-brain';

// 🎯 Latest Voyage 3.5 model (strongest embeddings)
const brain = UniversalAIBrain.forVoyage({
  mongoUri: process.env.MONGODB_URI,
  apiKey: process.env.VOYAGE_API_KEY,
});

await brain.initialize();
console.log('🧠 Universal AI Brain ready with 24 cognitive systems!');
```

### Framework Integration Examples
```typescript
// 🎯 Mastra Framework
const brain = UniversalAIBrain.forMastra({
  mongoUri: process.env.MONGODB_URI,
  apiKey: process.env.VOYAGE_API_KEY
});

// ⚡ Vercel AI SDK
const brain = UniversalAIBrain.forVercelAI({
  mongoUri: process.env.MONGODB_URI,
  apiKey: process.env.OPENAI_API_KEY
});

// 🦜 LangChain.js
const brain = UniversalAIBrain.forLangChain({
  mongoUri: process.env.MONGODB_URI,
  apiKey: process.env.OPENAI_API_KEY
});

// 🤖 OpenAI Agents
const brain = UniversalAIBrain.forOpenAI({
  mongoUri: process.env.MONGODB_URI,
  apiKey: process.env.OPENAI_API_KEY
});
```

## 🧠 The 24 Cognitive Systems

### 🧠 **Core Memory** (4 Systems)
- **Semantic Memory** - Knowledge storage and retrieval
- **Working Memory** - Short-term context management
- **Episodic Memory** - Experience-based learning
- **Memory Decay** - Intelligent forgetting

### 🎯 **Intelligence** (6 Systems)
- **Emotional Intelligence** - Emotion recognition and response
- **Cultural Knowledge** - Cultural awareness and adaptation
- **Confidence Tracking** - Uncertainty quantification
- **Self Improvement** - Continuous learning and optimization
- **Causal Reasoning** - Cause-and-effect understanding
- **Analogical Mapping** - Pattern recognition across domains

### ⚡ **Management** (6 Systems)
- **Attention Management** - Focus and priority handling
- **Goal Hierarchy** - Multi-level objective management
- **Temporal Planning** - Time-aware decision making
- **Social Intelligence** - Social context understanding
- **Skill Capability** - Ability assessment and development
- **Change Stream** - Real-time data monitoring

### 🔧 **Advanced Tools** (8 Systems)
- **Advanced Tool Interface** - External tool integration
- **Workflow Orchestration** - Complex task coordination
- **Communication Protocol** - Multi-agent coordination
- **Multi-Modal Processing** - Multi-format data handling
- **Human Feedback Integration** - Learning from human input
- **Notification Manager** - Event-driven notifications
- **Vector Search** - Semantic similarity matching
- **Context Injection** - Relevant information retrieval

## 🔥 **MongoDB 8.1 Hybrid Search - World's First $rankFusion**

✅ **Latest MongoDB 8.1** - Cutting-edge database features
✅ **$rankFusion Aggregation** - Combines vector + text search
✅ **Atlas Vector Search** - Semantic similarity at scale
✅ **Hybrid Search by Default** - Best of both worlds
✅ **Production Tested** - Real MongoDB Atlas 8.1 cluster
✅ **Performance Optimized** - Automatic query optimization

## 🎯 **Framework Support**

✅ **Mastra** - `UniversalAIBrain.forMastra()`
✅ **Vercel AI SDK** - `UniversalAIBrain.forVercelAI()`
✅ **LangChain.js** - `UniversalAIBrain.forLangChain()`
✅ **OpenAI Agents** - `UniversalAIBrain.forOpenAI()`
✅ **Framework Agnostic** - Works with ANY TypeScript AI framework

## ⚡ **Latest Features in 3.3**

🆕 **Voyage 3.5 Embeddings** - Latest and strongest embedding model
🆕 **Smart Provider Selection** - Respects user choice (forOpenAI vs forVoyage)
🆕 **5-Minute Integration Guide** - Complete setup documentation
🆕 **Error Classification** - Clear distinction between critical vs non-critical errors
🆕 **Enhanced Documentation** - Framework-specific examples and troubleshooting

## 📖 **Documentation**

📖 **[Complete Integration Guide →](https://github.com/romiluz13/ai_brain_js/blob/main/INTEGRATION_GUIDE.md)**
🎯 **[Framework Examples →](https://github.com/romiluz13/ai_brain_js/tree/main/examples/)**
📚 **[Full Documentation →](https://github.com/romiluz13/ai_brain_js#readme)**

## 🏗️ **Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    Your AI Framework                        │
│              (Mastra, Vercel AI, LangChain, etc.)          │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                Universal AI Brain 3.3                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │   Memory    │ │Intelligence │ │    MongoDB 8.1          │ │
│  │  Systems    │ │  Systems    │ │   Hybrid Search         │ │
│  │    (4)      │ │    (14)     │ │   $rankFusion           │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                MongoDB Atlas 8.1                           │
│        Vector Search + Text Search + $rankFusion           │
└─────────────────────────────────────────────────────────────┘
```

## 🧪 **Testing All 24 Cognitive Systems**

```bash
# Test all cognitive systems with real MongoDB data
npm test

# Test specific cognitive systems
npm run test:cognitive:memory
npm run test:cognitive:benchmark

# Setup cognitive system tests
npm run setup:cognitive
```

## 📦 **Requirements**

- **Node.js 18+** - Modern JavaScript runtime
- **MongoDB Atlas** - For vector search and hybrid search
- **API Keys** - Voyage AI (recommended) or OpenAI
- **TypeScript** - For best development experience

## 🚨 **Error Handling Guide**

### ✅ **Safe to Ignore (Non-Critical)**
```
⚠️ NON-CRITICAL: can't $divide by zero
⚠️ NON-CRITICAL: Atlas Vector Search failed
⚠️ NON-CRITICAL: Dashboard refresh failed
```

### ❌ **Requires Attention (Critical)**
```
❌ CRITICAL: MongoDB connection failed
❌ CRITICAL: API key invalid
❌ CRITICAL: Brain initialization failed
```

## 🔐 **Environment Setup**

```bash
# Required Environment Variables
MONGODB_URI=mongodb+srv://your-connection-string
VOYAGE_API_KEY=pa-your-voyage-api-key
OPENAI_API_KEY=sk-your-openai-key  # Optional fallback
```

## 📄 **License**

MIT License - see [LICENSE](https://github.com/romiluz13/ai_brain_js/blob/main/LICENSE) file for details.

## 🔗 **Links**

- **[GitHub Repository](https://github.com/romiluz13/ai_brain_js)** - Source code and issues
- **[Integration Guide](https://github.com/romiluz13/ai_brain_js/blob/main/INTEGRATION_GUIDE.md)** - Complete setup guide
- **[Examples](https://github.com/romiluz13/ai_brain_js/tree/main/examples/)** - Framework examples
- **[npm Package](https://www.npmjs.com/package/universal-ai-brain)** - Install via npm

---

**🧠 Universal AI Brain 3.3 - Making AI agents truly intelligent with 24 cognitive systems.** ⚡
