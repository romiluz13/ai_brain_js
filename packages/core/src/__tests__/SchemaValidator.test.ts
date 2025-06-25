import { SchemaValidator } from '../schemas/validator';

describe('SchemaValidator', () => {
  describe('agent schema validation', () => {
    it('should validate a correct agent document', () => {
      const validAgent = {
        agent_id: 'test-agent-1',
        name: 'Test Agent',
        version: '1.0.0',
        status: 'active',
        model_config: {
          provider: 'openai',
          model: 'gpt-4'
        }
      };

      const result = SchemaValidator.validate('agent', validAgent);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject agent with missing required fields', () => {
      const invalidAgent = {
        name: 'Test Agent',
        // Missing agent_id, version, status, model_config
      };

      const result = SchemaValidator.validate('agent', invalidAgent);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should reject agent with invalid status', () => {
      const invalidAgent = {
        agent_id: 'test-agent-1',
        name: 'Test Agent',
        version: '1.0.0',
        status: 'invalid-status', // Should be 'active', 'inactive', or 'deprecated'
        model_config: {
          provider: 'openai',
          model: 'gpt-4'
        }
      };

      const result = SchemaValidator.validate('agent', invalidAgent);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('agent working memory schema validation', () => {
    it('should validate a correct working memory document', () => {
      const validWorkingMemory = {
        session_id: 'session-123',
        agent_id: 'agent-456',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        context_window: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: new Date().toISOString()
          }
        ]
      };

      const result = SchemaValidator.validate('agentWorkingMemory', validWorkingMemory);
      expect(result.valid).toBe(true);
    });

    it('should reject working memory with invalid role', () => {
      const invalidWorkingMemory = {
        session_id: 'session-123',
        agent_id: 'agent-456',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        context_window: [
          {
            role: 'invalid-role', // Should be 'user', 'assistant', 'system', or 'tool'
            content: 'Hello',
            timestamp: new Date().toISOString()
          }
        ]
      };

      const result = SchemaValidator.validate('agentWorkingMemory', invalidWorkingMemory);
      expect(result.valid).toBe(false);
    });
  });

  describe('vector embeddings schema validation', () => {
    it('should validate a correct vector embedding document', () => {
      const validEmbedding = {
        embedding_id: 'emb-123',
        source_type: 'document',
        source_id: 'doc-456',
        embedding: {
          values: [0.1, 0.2, 0.3],
          meta: {
            provider: 'openai',
            model: 'text-embedding-ada-002',
            version: '1.0'
          }
        },
        content: {
          text: 'This is a test document'
        }
      };

      const result = SchemaValidator.validate('vectorEmbeddings', validEmbedding);
      expect(result.valid).toBe(true);
    });

    it('should reject embedding with missing content', () => {
      const invalidEmbedding = {
        embedding_id: 'emb-123',
        source_type: 'document',
        source_id: 'doc-456',
        embedding: {
          values: [0.1, 0.2, 0.3],
          meta: {
            provider: 'openai',
            model: 'text-embedding-ada-002',
            version: '1.0'
          }
        }
        // Missing content field
      };

      const result = SchemaValidator.validate('vectorEmbeddings', invalidEmbedding);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateOrThrow', () => {
    it('should not throw for valid data', () => {
      const validAgent = {
        agent_id: 'test-agent-1',
        name: 'Test Agent',
        version: '1.0.0',
        status: 'active',
        model_config: {
          provider: 'openai',
          model: 'gpt-4'
        }
      };

      expect(() => {
        SchemaValidator.validateOrThrow('agent', validAgent);
      }).not.toThrow();
    });

    it('should throw for invalid data', () => {
      const invalidAgent = {
        name: 'Test Agent'
        // Missing required fields
      };

      expect(() => {
        SchemaValidator.validateOrThrow('agent', invalidAgent);
      }).toThrow();
    });
  });

  describe('getAvailableSchemas', () => {
    it('should return list of available schemas', () => {
      const schemas = SchemaValidator.getAvailableSchemas();
      
      expect(schemas).toContain('agent');
      expect(schemas).toContain('agentWorkingMemory');
      expect(schemas).toContain('vectorEmbeddings');
      expect(schemas.length).toBeGreaterThan(10);
    });
  });
});