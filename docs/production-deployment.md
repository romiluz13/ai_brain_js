# Production Deployment Guide

This guide provides comprehensive instructions for deploying the Universal AI Brain with framework adapters in production environments. Follow these steps to achieve 70% intelligence enhancement in your production AI applications.

## 🎯 Overview

The Universal AI Brain is designed to be production-ready from day one. This guide covers:

- **MongoDB Atlas Setup** - Vector search configuration
- **Framework Integration** - Production-ready adapter deployment
- **Performance Optimization** - Scaling and monitoring
- **Security Best Practices** - API keys and access control
- **Monitoring & Observability** - Health checks and metrics
- **Disaster Recovery** - Backup and failover strategies

## 📋 Prerequisites

### Required Services
- **MongoDB Atlas** (M10+ cluster recommended for production)
- **OpenAI API** (or compatible embedding provider)
- **Node.js** 18+ runtime environment
- **TypeScript** 4.9+ for type safety

### Environment Requirements
- **Memory**: Minimum 2GB RAM per instance
- **CPU**: 2+ cores recommended
- **Storage**: 10GB+ for logs and temporary data
- **Network**: Stable internet connection for MongoDB Atlas

## 🚀 Step 1: MongoDB Atlas Production Setup

### 1.1 Create Production Cluster

```bash
# Create M10+ cluster for production workloads
# Recommended: M30 for high-traffic applications
```

**Atlas Configuration:**
- **Cluster Tier**: M10 minimum (M30+ for high traffic)
- **Region**: Choose closest to your application
- **Backup**: Enable continuous backup
- **Security**: Enable authentication and IP whitelisting

### 1.2 Configure Vector Search Index

```javascript
// Vector search index configuration
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "metadata.framework"
    },
    {
      "type": "filter", 
      "path": "metadata.topic"
    },
    {
      "type": "filter",
      "path": "metadata.userId"
    }
  ]
}
```

### 1.3 Database Schema Setup

```typescript
// Production database schema
const productionSchema = {
  // Collections
  interactions: {
    indexes: [
      { conversationId: 1, timestamp: -1 },
      { userId: 1, framework: 1 },
      { "metadata.topic": 1 }
    ]
  },
  conversations: {
    indexes: [
      { userId: 1, lastActivity: -1 },
      { framework: 1, status: 1 }
    ]
  },
  embeddings: {
    indexes: [
      { "metadata.framework": 1 },
      { "metadata.userId": 1 },
      { createdAt: -1 }
    ]
  }
};
```

## 🔧 Step 2: Production Configuration

### 2.1 Environment Variables

```bash
# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB_NAME=universal_ai_brain_prod
MONGODB_MAX_POOL_SIZE=50
MONGODB_TIMEOUT_MS=30000

# Embedding Provider
OPENAI_API_KEY=sk-your-production-api-key
EMBEDDING_MODEL=text-embedding-ada-002
EMBEDDING_DIMENSIONS=1536

# Vector Search
VECTOR_INDEX_NAME=production_vector_index
VECTOR_COLLECTION_NAME=embeddings
VECTOR_MIN_SCORE=0.7
VECTOR_MAX_RESULTS=10

# Performance
MAX_CONTEXT_ITEMS=5
ENHANCEMENT_STRATEGY=hybrid
ENABLE_CACHING=true
CACHE_TTL_SECONDS=3600

# Monitoring
ENABLE_METRICS=true
ENABLE_HEALTH_CHECKS=true
LOG_LEVEL=info
METRICS_COLLECTION_INTERVAL=60000

# Security
API_RATE_LIMIT=1000
ENABLE_CORS=true
ALLOWED_ORIGINS=https://yourdomain.com
```

### 2.2 Production Brain Configuration

```typescript
// config/production.ts
import { BrainConfig } from '@universal-ai-brain/core';

export const productionConfig: BrainConfig = {
  mongoConfig: {
    uri: process.env.MONGODB_URI!,
    dbName: process.env.MONGODB_DB_NAME!,
    options: {
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '50'),
      serverSelectionTimeoutMS: parseInt(process.env.MONGODB_TIMEOUT_MS || '30000'),
      retryWrites: true,
      w: 'majority'
    }
  },
  embeddingConfig: {
    provider: 'openai',
    model: process.env.EMBEDDING_MODEL || 'text-embedding-ada-002',
    apiKey: process.env.OPENAI_API_KEY!,
    dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '1536'),
    batchSize: 100,
    timeout: 30000
  },
  vectorSearchConfig: {
    indexName: process.env.VECTOR_INDEX_NAME || 'production_vector_index',
    collectionName: process.env.VECTOR_COLLECTION_NAME || 'embeddings',
    minScore: parseFloat(process.env.VECTOR_MIN_SCORE || '0.7'),
    maxResults: parseInt(process.env.VECTOR_MAX_RESULTS || '10')
  },
  performanceConfig: {
    enableCaching: process.env.ENABLE_CACHING === 'true',
    cacheTTL: parseInt(process.env.CACHE_TTL_SECONDS || '3600'),
    maxConcurrentRequests: 100,
    requestTimeout: 30000
  },
  monitoringConfig: {
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    enableHealthChecks: process.env.ENABLE_HEALTH_CHECKS === 'true',
    metricsInterval: parseInt(process.env.METRICS_COLLECTION_INTERVAL || '60000')
  }
};
```

## 🏗️ Step 3: Framework Adapter Deployment

### 3.1 Initialize Universal AI Brain

```typescript
// src/brain/production-brain.ts
import { UniversalAIBrain } from '@universal-ai-brain/core';
import { FrameworkAdapterManager } from '@universal-ai-brain/core/adapters';
import { productionConfig } from '../config/production';

export class ProductionBrain {
  private brain: UniversalAIBrain;
  private manager: FrameworkAdapterManager;

  constructor() {
    this.brain = new UniversalAIBrain(productionConfig);
    this.manager = new FrameworkAdapterManager({
      autoDetectFrameworks: true,
      enablePerformanceMonitoring: true,
      enableCrossAdapterLearning: true,
      maxAdapters: 10
    });
  }

  async initialize(): Promise<void> {
    try {
      // Initialize brain
      await this.brain.initialize();
      
      // Initialize adapter manager
      await this.manager.initialize(this.brain);
      
      console.log('✅ Production Universal AI Brain initialized');
    } catch (error) {
      console.error('❌ Failed to initialize brain:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const brainHealth = await this.brain.healthCheck();
      const managerHealth = this.manager.isReady();
      
      return brainHealth && managerHealth;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  getBrain(): UniversalAIBrain {
    return this.brain;
  }

  getManager(): FrameworkAdapterManager {
    return this.manager;
  }

  async shutdown(): Promise<void> {
    await this.manager.cleanup();
    await this.brain.cleanup();
  }
}
```

### 3.2 Framework-Specific Production Setup

#### Vercel AI SDK Production

```typescript
// src/adapters/production-vercel.ts
import { VercelAIAdapter } from '@universal-ai-brain/vercel-ai';
import { ProductionBrain } from '../brain/production-brain';

export async function setupVercelAIProduction(brain: ProductionBrain) {
  const adapter = new VercelAIAdapter({
    enablePromptEnhancement: true,
    enableLearning: true,
    enableContextInjection: true,
    maxContextItems: 5,
    enhancementStrategy: 'hybrid',
    enableMetrics: true
  });

  const enhanced = await adapter.integrate(brain.getBrain());
  
  // Export enhanced functions for your application
  return {
    generateText: enhanced.generateText,
    streamText: enhanced.streamText,
    generateObject: enhanced.generateObject,
    createMongoDBTools: enhanced.createMongoDBTools
  };
}
```

#### Next.js API Route Example

```typescript
// pages/api/ai/generate.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { ProductionBrain } from '../../../src/brain/production-brain';
import { setupVercelAIProduction } from '../../../src/adapters/production-vercel';

let brain: ProductionBrain;
let vercelAI: any;

// Initialize once
async function initializeIfNeeded() {
  if (!brain) {
    brain = new ProductionBrain();
    await brain.initialize();
    vercelAI = await setupVercelAIProduction(brain);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await initializeIfNeeded();

    const { messages, conversationId } = req.body;

    const result = await vercelAI.generateText({
      model: openai('gpt-4o'),
      messages,
      conversationId
    });

    res.status(200).json({
      text: result.text,
      enhancedContext: result.enhancedContext,
      metadata: result.metadata
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

## 📊 Step 4: Monitoring & Observability

### 4.1 Health Check Endpoint

```typescript
// pages/api/health.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const isHealthy = await brain.healthCheck();
    const stats = await brain.getBrain().getStats();
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      stats: {
        interactions: stats.collections.interactions,
        conversations: stats.collections.conversations,
        averageResponseTime: stats.performance.averageResponseTime,
        errorRate: stats.performance.errorRate
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
}
```

### 4.2 Metrics Collection

```typescript
// src/monitoring/metrics.ts
export class ProductionMetrics {
  private brain: UniversalAIBrain;

  constructor(brain: UniversalAIBrain) {
    this.brain = brain;
  }

  async collectMetrics(): Promise<any> {
    const stats = await this.brain.getStats();
    
    return {
      timestamp: new Date().toISOString(),
      performance: {
        averageResponseTime: stats.performance.averageResponseTime,
        requestsPerMinute: stats.performance.requestsPerMinute,
        errorRate: stats.performance.errorRate,
        cacheHitRate: stats.performance.cacheHitRate
      },
      usage: {
        totalInteractions: stats.collections.interactions,
        totalConversations: stats.collections.conversations,
        totalEmbeddings: stats.collections.embeddings
      },
      health: {
        mongoConnection: stats.isHealthy,
        embeddingProvider: stats.embeddingProvider.isHealthy,
        vectorSearch: stats.vectorSearch.isHealthy
      }
    };
  }
}
```

## 🔒 Step 5: Security Best Practices

### 5.1 API Security

```typescript
// middleware/security.ts
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

export const securityMiddleware = [
  helmet(),
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.API_RATE_LIMIT || '1000'),
    message: 'Too many requests from this IP'
  })
];
```

### 5.2 Environment Security

```bash
# Use secrets management
# AWS Secrets Manager, Azure Key Vault, or similar

# Rotate API keys regularly
# Monitor for unusual usage patterns
# Enable MongoDB Atlas IP whitelisting
# Use VPC peering for enhanced security
```

## 🚀 Step 6: Deployment Strategies

### 6.1 Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### 6.2 Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: universal-ai-brain
spec:
  replicas: 3
  selector:
    matchLabels:
      app: universal-ai-brain
  template:
    metadata:
      labels:
        app: universal-ai-brain
    spec:
      containers:
      - name: app
        image: your-registry/universal-ai-brain:latest
        ports:
        - containerPort: 3000
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: uri
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
```

## 📈 Step 7: Performance Optimization

### 7.1 Scaling Strategies

- **Horizontal Scaling**: Multiple instances behind load balancer
- **Connection Pooling**: Optimize MongoDB connections
- **Caching**: Redis for frequently accessed data
- **CDN**: Cache static assets and responses

### 7.2 Performance Monitoring

```typescript
// Monitor key metrics:
// - Response time < 500ms
// - Error rate < 1%
// - Memory usage < 80%
// - CPU usage < 70%
// - MongoDB connection pool utilization
```

## 🔄 Step 8: Disaster Recovery

### 8.1 Backup Strategy

- **MongoDB Atlas**: Continuous backup enabled
- **Application State**: Stateless design for easy recovery
- **Configuration**: Version controlled and automated deployment

### 8.2 Failover Plan

1. **Health Check Failures**: Automatic instance replacement
2. **Database Issues**: MongoDB Atlas automatic failover
3. **API Provider Issues**: Graceful degradation to basic responses
4. **Complete Outage**: Documented recovery procedures

## ✅ Production Checklist

- [ ] MongoDB Atlas M10+ cluster configured
- [ ] Vector search index created and optimized
- [ ] Environment variables secured
- [ ] Health checks implemented
- [ ] Monitoring and alerting configured
- [ ] Security middleware enabled
- [ ] Rate limiting configured
- [ ] Backup strategy verified
- [ ] Load testing completed
- [ ] Documentation updated
- [ ] Team training completed

## 🎯 Success Metrics

After deployment, monitor these key indicators:

- **Intelligence Enhancement**: 70%+ improvement in response quality
- **Performance**: <500ms average response time
- **Reliability**: 99.9%+ uptime
- **User Satisfaction**: Measurable improvement in user engagement
- **Cost Efficiency**: Optimized resource utilization

---

**🚀 Your Universal AI Brain is now production-ready and delivering 70% intelligence enhancement to your AI applications!**
