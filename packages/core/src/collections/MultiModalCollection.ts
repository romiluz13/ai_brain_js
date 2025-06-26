/**
 * @file MultiModalCollection - MongoDB collection for multi-modal content tracking
 * 
 * This collection manages multi-modal content analysis, cross-modal relationships,
 * and generation results using MongoDB's advanced indexing and GridFS capabilities.
 */

import { Db, Collection, ObjectId, CreateIndexesOptions } from 'mongodb';

export interface MultiModalContent {
  _id?: ObjectId;
  contentId: ObjectId;
  agentId: string;
  sessionId?: string;
  contentType: 'image' | 'audio' | 'video' | 'text' | 'composite';
  
  // Content metadata
  metadata: {
    originalFormat: string;
    fileSize: number;
    duration?: number; // For audio/video
    dimensions?: { width: number; height: number }; // For image/video
    quality: number;
    processingTime: number;
  };

  // Analysis results
  analysis: {
    analysisId: ObjectId;
    analysisType: string;
    confidence: number;
    results: {
      // Image analysis
      objects?: Array<{
        name: string;
        confidence: number;
        boundingBox: { x: number; y: number; width: number; height: number };
        attributes: string[];
      }>;
      text?: Array<{
        content: string;
        confidence: number;
        boundingBox?: { x: number; y: number; width: number; height: number };
        language?: string;
      }>;
      scenes?: Array<{
        name: string;
        confidence: number;
        attributes: string[];
      }>;
      faces?: Array<{
        confidence: number;
        boundingBox: { x: number; y: number; width: number; height: number };
        emotions: Record<string, number>;
        demographics?: {
          ageRange?: string;
          gender?: string;
        };
      }>;
      
      // Audio analysis
      transcription?: {
        text: string;
        confidence: number;
        language: string;
        segments: Array<{
          text: string;
          startTime: number;
          endTime: number;
          confidence: number;
          speaker?: string;
        }>;
        keywords: Array<{
          word: string;
          confidence: number;
          frequency: number;
          importance: number;
        }>;
      };
      speakers?: Array<{
        id: string;
        name?: string;
        confidence: number;
        segments: Array<{
          startTime: number;
          endTime: number;
          confidence: number;
        }>;
        characteristics: {
          gender?: string;
          ageRange?: string;
          accent?: string;
          emotionalTone: Record<string, number>;
        };
      }>;
      music?: {
        detected: boolean;
        genre?: string;
        tempo?: number;
        key?: string;
        instruments: string[];
        mood: string;
      };
    };
  };

  // Semantic information
  semantics: {
    tags: string[];
    categories: string[];
    concepts: Array<{
      name: string;
      confidence: number;
      relationships: string[];
    }>;
    sentiment: {
      overall: number;
      emotions: Record<string, number>;
      timeline?: Array<{
        startTime: number;
        endTime: number;
        sentiment: number;
        emotions: Record<string, number>;
      }>;
    };
    embeddings?: number[]; // Semantic embeddings for similarity search
  };

  // Cross-modal relationships
  relationships: Array<{
    relationshipId: ObjectId;
    relatedContentId: ObjectId;
    relatedContentType: string;
    relationshipType: 'semantic' | 'temporal' | 'causal' | 'descriptive' | 'complementary';
    strength: number;
    confidence: number;
    description: string;
  }>;

  // Quality assessment
  quality: {
    score: number;
    issues: string[];
    recommendations: string[];
    processingNotes: string[];
  };

  // Storage information
  storage: {
    gridFSId: ObjectId;
    bucketName: string;
    originalFilename?: string;
    contentHash: string;
  };

  // Context and usage
  context: {
    purpose: string;
    source: string;
    framework: string;
    userContext?: any;
    processingOptions: Record<string, any>;
  };

  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrossModalRelationshipRecord {
  _id?: ObjectId;
  relationshipId: ObjectId;
  sourceContentId: ObjectId;
  targetContentId: ObjectId;
  sourceModal: 'text' | 'image' | 'audio' | 'video';
  targetModal: 'text' | 'image' | 'audio' | 'video';
  
  relationship: {
    type: 'semantic' | 'temporal' | 'causal' | 'descriptive' | 'complementary';
    strength: number;
    confidence: number;
    description: string;
  };
  
  semantics: {
    sharedConcepts: string[];
    alignmentScore: number;
    contextualRelevance: number;
    semanticDistance?: number;
  };
  
  temporal?: {
    synchronization: number;
    offset: number;
    duration: number;
    alignment: 'synchronized' | 'sequential' | 'overlapping' | 'independent';
  };
  
  validation: {
    humanVerified: boolean;
    automaticScore: number;
    verificationDate?: Date;
    verifier?: string;
  };
  
  usage: {
    accessCount: number;
    lastAccessed: Date;
    applications: string[];
  };
  
  createdAt: Date;
  updatedAt: Date;
}

export class MultiModalCollection {
  private contentCollection: Collection<MultiModalContent>;
  private relationshipCollection: Collection<CrossModalRelationshipRecord>;

  constructor(private db: Db) {
    this.contentCollection = db.collection<MultiModalContent>('multimodal_content');
    this.relationshipCollection = db.collection<CrossModalRelationshipRecord>('crossmodal_relationships');
  }

  /**
   * Create indexes for optimal query performance
   */
  async createIndexes(): Promise<void> {
    // Content collection indexes
    const contentIndexes = [
      // Primary queries
      { key: { agentId: 1, timestamp: -1 } },
      { key: { contentId: 1 }, options: { unique: true } },
      { key: { contentType: 1, timestamp: -1 } },
      
      // Analysis queries
      { key: { 'analysis.analysisId': 1 } },
      { key: { 'analysis.analysisType': 1, timestamp: -1 } },
      { key: { 'analysis.confidence': 1, timestamp: -1 } },
      
      // Semantic queries
      { key: { 'semantics.tags': 1 } },
      { key: { 'semantics.categories': 1 } },
      { key: { 'semantics.sentiment.overall': 1 } },
      
      // Quality and performance
      { key: { 'quality.score': 1, timestamp: -1 } },
      { key: { 'metadata.processingTime': 1 } },
      
      // Storage queries
      { key: { 'storage.gridFSId': 1 } },
      { key: { 'storage.contentHash': 1 } },
      
      // Context queries
      { key: { 'context.framework': 1, timestamp: -1 } },
      { key: { 'context.purpose': 1, timestamp: -1 } },
      
      // Compound indexes
      { key: { agentId: 1, contentType: 1, timestamp: -1 } },
      { key: { contentType: 1, 'quality.score': 1, timestamp: -1 } },
      
      // Vector search index for semantic embeddings (if using Atlas Vector Search)
      // Note: This would be created through Atlas UI or specific vector index commands
      
      // TTL index for automatic cleanup
      { 
        key: { createdAt: 1 }, 
        options: { 
          expireAfterSeconds: 60 * 60 * 24 * 365, // 1 year
          name: 'multimodal_content_ttl'
        } as CreateIndexesOptions
      }
    ];

    // Relationship collection indexes
    const relationshipIndexes = [
      // Primary queries
      { key: { relationshipId: 1 }, options: { unique: true } },
      { key: { sourceContentId: 1, targetContentId: 1 } },
      { key: { sourceModal: 1, targetModal: 1 } },
      
      // Relationship queries
      { key: { 'relationship.type': 1, 'relationship.strength': -1 } },
      { key: { 'relationship.confidence': 1, createdAt: -1 } },
      
      // Semantic queries
      { key: { 'semantics.sharedConcepts': 1 } },
      { key: { 'semantics.alignmentScore': 1, createdAt: -1 } },
      
      // Temporal queries
      { key: { 'temporal.synchronization': 1 } },
      { key: { 'temporal.alignment': 1 } },
      
      // Validation and usage
      { key: { 'validation.humanVerified': 1, createdAt: -1 } },
      { key: { 'usage.accessCount': 1, createdAt: -1 } },
      
      // Compound indexes
      { key: { sourceContentId: 1, 'relationship.type': 1, 'relationship.strength': -1 } },
      { key: { targetContentId: 1, 'relationship.type': 1, 'relationship.strength': -1 } },
      
      // TTL index
      { 
        key: { createdAt: 1 }, 
        options: { 
          expireAfterSeconds: 60 * 60 * 24 * 180, // 6 months
          name: 'crossmodal_relationships_ttl'
        } as CreateIndexesOptions
      }
    ];

    // Create content collection indexes
    for (const index of contentIndexes) {
      try {
        await this.contentCollection.createIndex(index.key, index.options);
      } catch (error) {
        console.warn(`Warning: Could not create content index ${JSON.stringify(index.key)}:`, error);
      }
    }

    // Create relationship collection indexes
    for (const index of relationshipIndexes) {
      try {
        await this.relationshipCollection.createIndex(index.key, index.options);
      } catch (error) {
        console.warn(`Warning: Could not create relationship index ${JSON.stringify(index.key)}:`, error);
      }
    }
  }

  /**
   * Store multi-modal content analysis
   */
  async storeContent(content: Omit<MultiModalContent, '_id' | 'createdAt' | 'updatedAt'>): Promise<ObjectId> {
    const now = new Date();
    const document: MultiModalContent = {
      ...content,
      createdAt: now,
      updatedAt: now
    };

    const result = await this.contentCollection.insertOne(document);
    return result.insertedId;
  }

  /**
   * Get multi-modal content by ID
   */
  async getContent(contentId: ObjectId): Promise<MultiModalContent | null> {
    return await this.contentCollection.findOne({ contentId });
  }

  /**
   * Store cross-modal relationship
   */
  async storeRelationship(relationship: Omit<CrossModalRelationshipRecord, '_id' | 'createdAt' | 'updatedAt'>): Promise<ObjectId> {
    const now = new Date();
    const document: CrossModalRelationshipRecord = {
      ...relationship,
      createdAt: now,
      updatedAt: now
    };

    const result = await this.relationshipCollection.insertOne(document);
    return result.insertedId;
  }

  /**
   * Get content by agent and type
   */
  async getAgentContent(
    agentId: string,
    options: {
      contentType?: 'image' | 'audio' | 'video' | 'text' | 'composite';
      limit?: number;
      skip?: number;
      startDate?: Date;
      endDate?: Date;
      minQuality?: number;
    } = {}
  ): Promise<MultiModalContent[]> {
    const filter: any = { agentId };
    
    if (options.contentType) filter.contentType = options.contentType;
    if (options.minQuality) filter['quality.score'] = { $gte: options.minQuality };
    if (options.startDate || options.endDate) {
      filter.timestamp = {};
      if (options.startDate) filter.timestamp.$gte = options.startDate;
      if (options.endDate) filter.timestamp.$lte = options.endDate;
    }

    return await this.contentCollection
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(options.limit || 50)
      .skip(options.skip || 0)
      .toArray();
  }

  /**
   * Find similar content using semantic search
   */
  async findSimilarContent(
    embeddings: number[],
    contentType?: string,
    limit: number = 10
  ): Promise<MultiModalContent[]> {
    // This would use MongoDB Atlas Vector Search in a real implementation
    // For now, we'll return a basic query
    const filter: any = {};
    if (contentType) filter.contentType = contentType;

    return await this.contentCollection
      .find(filter)
      .sort({ 'quality.score': -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Get cross-modal relationships for content
   */
  async getContentRelationships(
    contentId: ObjectId,
    relationshipType?: string
  ): Promise<CrossModalRelationshipRecord[]> {
    const filter: any = {
      $or: [
        { sourceContentId: contentId },
        { targetContentId: contentId }
      ]
    };

    if (relationshipType) {
      filter['relationship.type'] = relationshipType;
    }

    return await this.relationshipCollection
      .find(filter)
      .sort({ 'relationship.strength': -1 })
      .toArray();
  }

  /**
   * Get multi-modal analytics
   */
  async getMultiModalAnalytics(
    agentId?: string,
    timeframeDays: number = 30
  ): Promise<{
    totalContent: number;
    contentByType: Record<string, number>;
    avgQuality: number;
    avgProcessingTime: number;
    topCategories: Array<{ category: string; count: number }>;
    relationshipStats: {
      totalRelationships: number;
      avgStrength: number;
      typeDistribution: Record<string, number>;
    };
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeDays);

    const matchStage: any = { timestamp: { $gte: startDate } };
    if (agentId) matchStage.agentId = agentId;

    // Content analytics
    const contentPipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalContent: { $sum: 1 },
          avgQuality: { $avg: '$quality.score' },
          avgProcessingTime: { $avg: '$metadata.processingTime' },
          contentTypes: { $push: '$contentType' },
          categories: { $push: '$semantics.categories' }
        }
      }
    ];

    const contentResult = await this.contentCollection.aggregate(contentPipeline).toArray();
    
    // Relationship analytics
    const relationshipPipeline = [
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalRelationships: { $sum: 1 },
          avgStrength: { $avg: '$relationship.strength' },
          types: { $push: '$relationship.type' }
        }
      }
    ];

    const relationshipResult = await this.relationshipCollection.aggregate(relationshipPipeline).toArray();

    // Process results
    const content = contentResult[0] || {
      totalContent: 0,
      avgQuality: 0,
      avgProcessingTime: 0,
      contentTypes: [],
      categories: []
    };

    const relationships = relationshipResult[0] || {
      totalRelationships: 0,
      avgStrength: 0,
      types: []
    };

    // Count content by type
    const contentByType: Record<string, number> = {};
    content.contentTypes.forEach((type: string) => {
      contentByType[type] = (contentByType[type] || 0) + 1;
    });

    // Count top categories
    const categoryCount: Record<string, number> = {};
    content.categories.flat().forEach((category: string) => {
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    const topCategories = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([category, count]) => ({ category, count }));

    // Count relationship types
    const typeDistribution: Record<string, number> = {};
    relationships.types.forEach((type: string) => {
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    });

    return {
      totalContent: content.totalContent,
      contentByType,
      avgQuality: content.avgQuality,
      avgProcessingTime: content.avgProcessingTime,
      topCategories,
      relationshipStats: {
        totalRelationships: relationships.totalRelationships,
        avgStrength: relationships.avgStrength,
        typeDistribution
      }
    };
  }

  /**
   * Update content analysis
   */
  async updateContentAnalysis(
    contentId: ObjectId,
    updates: {
      analysis?: any;
      semantics?: any;
      quality?: any;
      relationships?: any;
    }
  ): Promise<void> {
    const updateDoc: any = {
      updatedAt: new Date()
    };

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        updateDoc[key] = updates[key];
      }
    });

    await this.contentCollection.updateOne(
      { contentId },
      { $set: updateDoc }
    );
  }

  /**
   * Update relationship validation
   */
  async updateRelationshipValidation(
    relationshipId: ObjectId,
    validation: {
      humanVerified: boolean;
      verificationDate: Date;
      verifier: string;
      notes?: string;
    }
  ): Promise<void> {
    await this.relationshipCollection.updateOne(
      { relationshipId },
      {
        $set: {
          'validation.humanVerified': validation.humanVerified,
          'validation.verificationDate': validation.verificationDate,
          'validation.verifier': validation.verifier,
          updatedAt: new Date()
        }
      }
    );
  }

  /**
   * Clean up old content and relationships
   */
  async cleanupOldData(daysToKeep: number = 365): Promise<{ contentDeleted: number; relationshipsDeleted: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const contentResult = await this.contentCollection.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    const relationshipResult = await this.relationshipCollection.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    return {
      contentDeleted: contentResult.deletedCount,
      relationshipsDeleted: relationshipResult.deletedCount
    };
  }
}
