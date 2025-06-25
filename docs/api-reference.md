# 📚 API Reference

This document provides comprehensive API documentation for the MongoDB AI Agent Boilerplate.

## Table of Contents

- [Core Classes](#core-classes)
- [Interfaces](#interfaces)
- [Storage Layer](#storage-layer)
- [Agent Engine](#agent-engine)
- [Search & Embeddings](#search--embeddings)
- [Real-time Features](#real-time-features)
- [Framework Integrations](#framework-integrations)

---

## Core Classes

### MongoConnection

Singleton class for managing MongoDB connections.

```typescript
class MongoConnection {
  static getInstance(uri: string, dbName: string): MongoConnection
  async connect(): Promise<void>
  async disconnect(): Promise<void>
  getDb(): Db
}
```

#### Methods

##### `getInstance(uri: string, dbName: string): MongoConnection`

Gets or creates a singleton instance of the MongoDB connection.

**Parameters:**
- `uri` - MongoDB connection string
- `dbName` - Database name

**Returns:** MongoConnection instance

**Example:**
```typescript
const connection = MongoConnection.getInstance(
  'mongodb+srv://user:pass@cluster.mongodb.net/',
  'ai_agents'
);
```

##### `connect(): Promise<void>`

Establishes connection to MongoDB.

**Example:**
```typescript
await connection.connect();
```

##### `disconnect(): Promise<void>`

Closes the MongoDB connection.

**Example:**
```typescript
await connection.disconnect();
```

##### `getDb(): Db`

Returns the MongoDB database instance.

**Returns:** MongoDB Db object

---

## Storage Layer

### IDataStore<T>

Generic interface for data storage operations.

```typescript
interface IDataStore<T> {
  create(item: T): Promise<T>
  findById(id: string): Promise<T | null>
  find(filter: Partial<T>): Promise<T[]>
  update(id: string, item: Partial<T>): Promise<T | null>
  delete(id: string): Promise<boolean>
}
```

#### Methods

##### `create(item: T): Promise<T>`

Creates a new document in the collection.

**Parameters:**
- `item` - Document to create

**Returns:** Created document with generated `_id`

**Example:**
```typescript
const agent = await agentStore.create({
  agent_id: 'research_agent_v1',
  name: 'Research Agent',
  status: 'active'
});
```

##### `findById(id: string): Promise<T | null>`

Finds a document by its `_id`.

**Parameters:**
- `id` - Document ID (ObjectId string)

**Returns:** Document or null if not found

**Example:**
```typescript
const agent = await agentStore.findById('507f1f77bcf86cd799439011');
```

##### `find(filter: Partial<T>): Promise<T[]>`

Finds documents matching the filter criteria.

**Parameters:**
- `filter` - MongoDB filter object

**Returns:** Array of matching documents

**Example:**
```typescript
const activeAgents = await agentStore.find({ status: 'active' });
```

##### `update(id: string, item: Partial<T>): Promise<T | null>`

Updates a document by ID.

**Parameters:**
- `id` - Document ID
- `item` - Partial document with updates

**Returns:** Updated document or null if not found

**Example:**
```typescript
const updated = await agentStore.update('507f1f77bcf86cd799439011', {
  status: 'inactive'
});
```

##### `delete(id: string): Promise<boolean>`

Deletes a document by ID.

**Parameters:**
- `id` - Document ID

**Returns:** True if deleted, false if not found

**Example:**
```typescript
const deleted = await agentStore.delete('507f1f77bcf86cd799439011');
```

### MongoDataStore<T>

MongoDB implementation of IDataStore.

```typescript
class MongoDataStore<T extends { _id?: ObjectId }> implements IDataStore<T> {
  constructor(db: Db, collectionName: string)
}
```

**Example:**
```typescript
const agentStore = new MongoDataStore<Agent>(db, 'agents');
```

### IEmbeddingStore

Interface for vector embedding operations.

```typescript
interface IEmbeddingStore {
  upsert(embedding: VectorEmbedding): Promise<void>
  query(vector: number[], filters?: Record<string, any>, limit?: number): Promise<VectorSearchResult[]>
  delete(embeddingId: string): Promise<boolean>
}
```

#### Methods

##### `upsert(embedding: VectorEmbedding): Promise<void>`

Inserts or updates a vector embedding.

**Parameters:**
- `embedding` - Vector embedding document

**Example:**
```typescript
await embeddingStore.upsert({
  embedding_id: 'doc_123',
  source_type: 'document',
  embedding: [0.1, 0.3, -0.2, ...],
  content: { text: 'Sample document content' },
  metadata: { category: 'technical' }
});
```

##### `query(vector: number[], filters?: Record<string, any>, limit?: number): Promise<VectorSearchResult[]>`

Performs vector similarity search.

**Parameters:**
- `vector` - Query vector
- `filters` - Optional metadata filters
- `limit` - Maximum results (default: 10)

**Returns:** Array of search results with similarity scores

**Example:**
```typescript
const results = await embeddingStore.query(
  queryVector,
  { category: 'technical' },
  5
);
```

### IMemoryStore

Interface for agent memory operations.

```typescript
interface IMemoryStore {
  getHistory(agentId: string, sessionId: string): Promise<ChatMessage[]>
  addMessage(agentId: string, sessionId: string, message: ChatMessage): Promise<void>
  clearHistory(agentId: string, sessionId: string): Promise<void>
}
```

#### Methods

##### `getHistory(agentId: string, sessionId: string): Promise<ChatMessage[]>`

Retrieves conversation history for an agent session.

**Parameters:**
- `agentId` - Agent identifier
- `sessionId` - Session identifier

**Returns:** Array of chat messages

**Example:**
```typescript
const history = await memoryStore.getHistory('agent_001', 'session_123');
```

##### `addMessage(agentId: string, sessionId: string, message: ChatMessage): Promise<void>`

Adds a message to the conversation history.

**Parameters:**
- `agentId` - Agent identifier
- `sessionId` - Session identifier
- `message` - Chat message to add

**Example:**
```typescript
await memoryStore.addMessage('agent_001', 'session_123', {
  role: 'user',
  content: 'Hello, I need help',
  timestamp: new Date()
});
```

---

## Agent Engine

### AgentStateManager

Manages agent state and configuration.

```typescript
class AgentStateManager {
  constructor(agentStore: IDataStore<Agent>)
  async loadState(agentId: string): Promise<Agent>
  async saveState(agent: Agent): Promise<void>
  async updateConfiguration(agentId: string, config: Partial<AgentConfiguration>): Promise<void>
}
```

#### Methods

##### `loadState(agentId: string): Promise<Agent>`

Loads agent state from storage.

**Parameters:**
- `agentId` - Agent identifier

**Returns:** Agent configuration and state

**Example:**
```typescript
const agent = await stateManager.loadState('research_agent_v1');
```

##### `saveState(agent: Agent): Promise<void>`

Saves agent state to storage.

**Parameters:**
- `agent` - Agent object to save

**Example:**
```typescript
await stateManager.saveState(updatedAgent);
```

### ToolExecutor

Executes tools and tracks performance.

```typescript
class ToolExecutor {
  constructor(toolStore: IDataStore<AgentTool>, executionStore: IDataStore<ToolExecution>)
  async execute(toolId: string, input: Record<string, any>, context: ToolExecutionContext): Promise<Record<string, any>>
  async getToolDefinition(toolId: string): Promise<AgentTool>
}
```

#### Methods

##### `execute(toolId: string, input: Record<string, any>, context: ToolExecutionContext): Promise<Record<string, any>>`

Executes a tool with given input.

**Parameters:**
- `toolId` - Tool identifier
- `input` - Tool input parameters
- `context` - Execution context

**Returns:** Tool output

**Example:**
```typescript
const result = await toolExecutor.execute('web_search', {
  query: 'MongoDB vector search',
  max_results: 5
}, {
  agent_id: 'research_agent',
  workflow_id: 'workflow_123',
  timeout_ms: 30000
});
```

### WorkflowEngine

Orchestrates multi-step agent workflows.

```typescript
class WorkflowEngine {
  constructor(
    workflowStore: IDataStore<Workflow>,
    agentStateManager: AgentStateManager,
    toolExecutor: ToolExecutor
  )
  async createWorkflow(name: string, steps: WorkflowStep[], context?: Record<string, any>): Promise<Workflow>
  async executeWorkflow(workflowId: string, options?: WorkflowExecutionOptions): Promise<void>
  async getWorkflowStatus(workflowId: string): Promise<Workflow | null>
  async cancelWorkflow(workflowId: string): Promise<void>
}
```

#### Methods

##### `createWorkflow(name: string, steps: WorkflowStep[], context?: Record<string, any>): Promise<Workflow>`

Creates a new workflow.

**Parameters:**
- `name` - Workflow name
- `steps` - Array of workflow steps
- `context` - Initial shared context

**Returns:** Created workflow

**Example:**
```typescript
const workflow = await workflowEngine.createWorkflow('research_pipeline', [
  {
    step_id: 'search',
    agent_id: 'search_agent',
    description: 'Search for information',
    tool_id: 'web_search'
  },
  {
    step_id: 'analyze',
    agent_id: 'analysis_agent',
    description: 'Analyze search results',
    depends_on: ['search'],
    tool_id: 'text_analysis'
  }
], { target: 'MongoDB' });
```

##### `executeWorkflow(workflowId: string, options?: WorkflowExecutionOptions): Promise<void>`

Executes a workflow.

**Parameters:**
- `workflowId` - Workflow identifier
- `options` - Execution options

**Example:**
```typescript
await workflowEngine.executeWorkflow('workflow_123', {
  timeout_seconds: 300,
  max_retries: 3
});
```

---

## Search & Embeddings

### HybridSearchEngine

Advanced search combining vector and text search.

```typescript
class HybridSearchEngine {
  constructor(db: Db, embeddingProvider?: EmbeddingProvider, collectionName?: string)
  async search(query: string, filters?: SearchFilters, options?: SearchOptions): Promise<HybridSearchResult[]>
  async semanticSearch(query: string, filters?: SearchFilters, limit?: number): Promise<HybridSearchResult[]>
  async textSearch(query: string, filters?: SearchFilters, limit?: number): Promise<HybridSearchResult[]>
}
```

#### Methods

##### `search(query: string, filters?: SearchFilters, options?: SearchOptions): Promise<HybridSearchResult[]>`

Performs hybrid search combining vector and text search.

**Parameters:**
- `query` - Search query
- `filters` - Search filters
- `options` - Search options

**Returns:** Array of search results with combined scores

**Example:**
```typescript
const results = await searchEngine.search(
  'MongoDB vector search tutorial',
  {
    source_type: 'documentation',
    created_after: new Date('2024-01-01')
  },
  {
    limit: 10,
    vector_weight: 0.7,
    text_weight: 0.3
  }
);
```

##### `semanticSearch(query: string, filters?: SearchFilters, limit?: number): Promise<HybridSearchResult[]>`

Performs vector-only semantic search.

**Parameters:**
- `query` - Search query
- `filters` - Search filters
- `limit` - Maximum results

**Returns:** Array of semantically similar results

**Example:**
```typescript
const semanticResults = await searchEngine.semanticSearch(
  'database performance optimization',
  { category: 'technical' },
  5
);
```

### EmbeddingProvider

Interface for generating embeddings.

```typescript
interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>
}
```

#### Implementations

##### OpenAIEmbeddingProvider

```typescript
class OpenAIEmbeddingProvider implements EmbeddingProvider {
  constructor(apiKey: string, model?: string)
  async generateEmbedding(text: string): Promise<number[]>
}
```

**Example:**
```typescript
const embeddingProvider = new OpenAIEmbeddingProvider(
  process.env.OPENAI_API_KEY!,
  'text-embedding-ada-002'
);

const embedding = await embeddingProvider.generateEmbedding(
  'MongoDB is a document database'
);
```

---

## Real-time Features

### ChangeStreamManager

Manages MongoDB change streams for real-time coordination.

```typescript
class ChangeStreamManager {
  constructor(db: Db, collectionName: string, pipeline: Document[], handler: ChangeHandler)
  async start(): Promise<void>
  async stop(): Promise<void>
}
```

#### Methods

##### `start(): Promise<void>`

Starts watching for changes.

**Example:**
```typescript
const changeManager = new ChangeStreamManager(
  db,
  'agent_workflows',
  [{ $match: { 'fullDocument.status': 'completed' } }],
  async (change) => {
    console.log('Workflow completed:', change.fullDocument.workflow_id);
    await triggerNextStep(change.fullDocument);
  }
);

await changeManager.start();
```

##### `stop(): Promise<void>`

Stops watching for changes.

**Example:**
```typescript
await changeManager.stop();
```

---

## Framework Integrations

### LangChain Integration

#### MongoDBAgentVectorStore

LangChain-compatible vector store.

```typescript
class MongoDBAgentVectorStore extends VectorStore {
  constructor(embeddingStore: IEmbeddingStore, embeddingFunction: Embeddings)
  async addDocuments(documents: Document[]): Promise<void>
  async similaritySearch(query: string, k?: number, filter?: Record<string, any>): Promise<Document[]>
}
```

**Example:**
```typescript
import { MongoDBAgentVectorStore } from '@mongodb-ai/integrations/langchain';

const vectorStore = new MongoDBAgentVectorStore(
  embeddingStore,
  new OpenAIEmbeddings()
);

await vectorStore.addDocuments([
  new Document({ pageContent: 'MongoDB tutorial', metadata: { type: 'tutorial' } })
]);

const results = await vectorStore.similaritySearch('database tutorial', 5);
```

#### MongoDBAgentChatMessageHistory

LangChain-compatible chat message history.

```typescript
class MongoDBAgentChatMessageHistory extends BaseChatMessageHistory {
  constructor(memoryStore: IMemoryStore, agentId: string, sessionId: string)
  async getMessages(): Promise<BaseChatMessage[]>
  async addMessage(message: BaseChatMessage): Promise<void>
}
```

**Example:**
```typescript
import { MongoDBAgentChatMessageHistory } from '@mongodb-ai/integrations/langchain';

const memory = new MongoDBAgentChatMessageHistory(
  memoryStore,
  'agent_001',
  'session_123'
);

const chain = new ConversationChain({
  llm: new OpenAI(),
  memory: new BufferMemory({ chatHistory: memory })
});
```

### CrewAI Integration

#### MongoDBCrewMemory

CrewAI-compatible memory system.

```typescript
class MongoDBCrewMemory extends LongTermMemory {
  constructor(connectionString: string, databaseName: string)
  save(agentId: string, memoryData: any): Promise<void>
  retrieve(agentId: string, query: string): Promise<any[]>
}
```

**Example:**
```typescript
import { MongoDBCrewMemory } from '@mongodb-ai/integrations/crewai';

const crewMemory = new MongoDBCrewMemory(
  'mongodb+srv://...',
  'ai_agents'
);

const agent = Agent({
  role: 'Research Specialist',
  memory: crewMemory
});
```

---

## Data Types

### Core Interfaces

#### Agent

```typescript
interface Agent {
  _id?: ObjectId;
  agent_id: string;
  name: string;
  description: string;
  version: string;
  status: 'active' | 'inactive' | 'deprecated';
  capabilities: string[];
  tools: AgentTool[];
  model_config: {
    provider: string;
    model: string;
    temperature: number;
    max_tokens: number;
    system_prompt: string;
  };
  performance_targets: {
    max_response_time_seconds: number;
    min_confidence_score: number;
    max_cost_per_execution: number;
  };
  created_at: Date;
  updated_at: Date;
}
```

#### VectorEmbedding

```typescript
interface VectorEmbedding {
  _id?: ObjectId;
  embedding_id: string;
  source_type: string;
  source_id: string;
  agent_id: string;
  created_at: Date;
  embedding: {
    values: number[];
    model: string;
    dimensions: number;
  };
  content: {
    text: string;
    summary?: string;
    confidence: number;
  };
  metadata: Record<string, any>;
}
```

#### Workflow

```typescript
interface Workflow {
  _id?: ObjectId;
  workflow_id: string;
  workflow_name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  created_at: Date;
  updated_at: Date;
  workflow_definition: {
    name: string;
    version: string;
    steps: WorkflowStep[];
  };
  current_step?: number;
  execution_log: WorkflowStepExecution[];
  shared_context: Record<string, any>;
  error_log: Array<{
    step_id: string;
    error: string;
    timestamp: Date;
  }>;
}
```

#### WorkflowStep

```typescript
interface WorkflowStep {
  step_id: string;
  agent_id: string;
  description: string;
  depends_on?: string[];
  timeout_seconds?: number;
  retry_count?: number;
  tool_id?: string;
  input_mapping?: Record<string, any>;
  condition?: string;
}
```

#### ChatMessage

```typescript
interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}
```

### Search Types

#### SearchFilters

```typescript
interface SearchFilters {
  source_type?: string;
  agent_id?: string;
  created_after?: Date;
  created_before?: Date;
  metadata_filters?: Record<string, any>;
  min_confidence?: number;
}
```

#### SearchOptions

```typescript
interface SearchOptions {
  limit?: number;
  vector_weight?: number;
  text_weight?: number;
  vector_index?: string;
  text_index?: string;
  include_embeddings?: boolean;
  explain_relevance?: boolean;
}
```

#### HybridSearchResult

```typescript
interface HybridSearchResult {
  _id: string;
  embedding_id: string;
  content: {
    text: string;
    summary?: string;
  };
  metadata: Record<string, any>;
  scores: {
    vector_score: number;
    text_score: number;
    combined_score: number;
  };
  relevance_explanation: string;
}
```

---

## Error Handling

### Common Errors

#### ValidationError

Thrown when schema validation fails.

```typescript
try {
  await agentStore.create(invalidAgent);
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Validation failed:', error.details);
  }
}
```

#### ConnectionError

Thrown when MongoDB connection fails.

```typescript
try {
  await connection.connect();
} catch (error) {
  if (error instanceof ConnectionError) {
    console.log('Failed to connect to MongoDB:', error.message);
  }
}
```

#### ToolExecutionError

Thrown when tool execution fails.

```typescript
try {
  await toolExecutor.execute('invalid_tool', {});
} catch (error) {
  if (error instanceof ToolExecutionError) {
    console.log('Tool execution failed:', error.message);
    console.log('Tool ID:', error.toolId);
    console.log('Input:', error.input);
  }
}
```

---

## Configuration

### Environment Variables

```typescript
interface EnvironmentConfig {
  MONGODB_URI: string;
  DATABASE_NAME: string;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
  ENABLE_METRICS?: boolean;
  VECTOR_DIMENSIONS?: number;
}
```

### Agent Configuration

```typescript
interface AgentConfiguration {
  agent_id: string;
  version: string;
  is_active: boolean;
  prompts: {
    system_prompt: string;
    [key: string]: string;
  };
  parameters: {
    temperature: number;
    max_tokens: number;
    confidence_threshold: number;
    [key: string]: any;
  };
  quality_gates: {
    min_data_points: number;
    required_fields: string[];
    validation_rules: string[];
  };
}
```

---

## Performance Optimization

### Indexing Recommendations

```typescript
// Recommended indexes for optimal performance
const recommendedIndexes = {
  agents: [
    { agent_id: 1, status: 1 },
    { capabilities: 1 },
    { created_at: -1 }
  ],
  vector_embeddings: [
    { source_type: 1, created_at: -1 },
    { agent_id: 1, created_at: -1 },
    { 'metadata.category': 1 }
  ],
  agent_workflows: [
    { status: 1, created_at: -1 },
    { workflow_id: 1 },
    { 'shared_context.priority': 1 }
  ],
  agent_memory: [
    { agent_id: 1, memory_type: 1, last_accessed: -1 },
    { created_at: -1 }
  ]
};
```

### Caching Strategies

```typescript
// Example caching configuration
const cacheConfig = {
  agent_configurations: {
    ttl: 300, // 5 minutes
    strategy: 'write-through'
  },
  embeddings: {
    ttl: 3600, // 1 hour
    strategy: 'lazy-loading'
  },
  search_results: {
    ttl: 60, // 1 minute
    strategy: 'cache-aside'
  }
};
```

---

## Migration & Schema Evolution

### Schema Versioning

```typescript
interface SchemaVersion {
  collection: string;
  version: number;
  migration_script: string;
  rollback_script?: string;
  applied_at?: Date;
}
```

### Migration Example

```typescript
// Example migration for adding new field
const migration_v2_to_v3 = {
  collection: 'agents',
  version: 3,
  up: async (db: Db) => {
    await db.collection('agents').updateMany(
      { _schema_version: { $exists: false } },
      { 
        $set: { 
          _schema_version: 3,
          enhanced_capabilities: []
        }
      }
    );
  },
  down: async (db: Db) => {
    await db.collection('agents').updateMany(
      { _schema_version: 3 },
      { 
        $unset: { 
          enhanced_capabilities: 1
        },
        $set: { _schema_version: 2 }
      }
    );
  }
};
```

---

This API reference provides comprehensive documentation for all major components of the MongoDB AI Agent Boilerplate. For more specific examples and use cases, refer to the examples directory and tutorial documentation.