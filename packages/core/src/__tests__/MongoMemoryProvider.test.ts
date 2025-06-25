import { MongoMemoryProvider } from '../persistance/MongoMemoryProvider';
import { ChatMessage } from '../persistance/IMemoryStore';
import { setupTestDb, teardownTestDb, getTestDb } from './setup';

describe('MongoMemoryProvider', () => {
  let memoryProvider: MongoMemoryProvider;
  const agentId = 'test-agent-1';
  const sessionId = 'test-session-1';

  beforeAll(async () => {
    await setupTestDb();
    memoryProvider = new MongoMemoryProvider(getTestDb(), 1); // 1 hour TTL for testing
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    // Clear the collection before each test
    await getTestDb().collection('agent_working_memory').deleteMany({});
  });

  describe('addMessage and getHistory', () => {
    it('should add and retrieve messages', async () => {
      const message1: ChatMessage = {
        role: 'user',
        content: 'Hello, agent!',
        timestamp: new Date()
      };

      const message2: ChatMessage = {
        role: 'assistant',
        content: 'Hello! How can I help you?',
        timestamp: new Date()
      };

      await memoryProvider.addMessage(agentId, sessionId, message1);
      await memoryProvider.addMessage(agentId, sessionId, message2);

      const history = await memoryProvider.getHistory(agentId, sessionId);

      expect(history).toHaveLength(2);
      expect(history[0].content).toBe('Hello, agent!');
      expect(history[1].content).toBe('Hello! How can I help you?');
    });

    it('should return empty array for non-existent session', async () => {
      const history = await memoryProvider.getHistory('non-existent', 'non-existent');
      expect(history).toHaveLength(0);
    });

    it('should create new document when adding first message', async () => {
      const message: ChatMessage = {
        role: 'user',
        content: 'First message',
        timestamp: new Date()
      };

      await memoryProvider.addMessage(agentId, sessionId, message);

      const history = await memoryProvider.getHistory(agentId, sessionId);
      expect(history).toHaveLength(1);
      expect(history[0].content).toBe('First message');
    });
  });

  describe('working state management', () => {
    it('should update and retrieve working state', async () => {
      const workingState = {
        current_task: 'research',
        progress: 0.5,
        next_action: 'search_web',
        confidence: 0.8,
        variables: { query: 'test query' }
      };

      await memoryProvider.updateWorkingState(agentId, sessionId, workingState);
      const retrieved = await memoryProvider.getWorkingState(agentId, sessionId);

      expect(retrieved).toEqual(workingState);
    });

    it('should return null for non-existent working state', async () => {
      const state = await memoryProvider.getWorkingState('non-existent', 'non-existent');
      expect(state).toBeNull();
    });
  });

  describe('temporary findings management', () => {
    it('should update and retrieve temporary findings', async () => {
      const findings = {
        company_name: 'Test Corp',
        industry: 'Technology',
        key_insights: ['Growing fast', 'Well funded']
      };

      await memoryProvider.updateTempFindings(agentId, sessionId, findings);
      const retrieved = await memoryProvider.getTempFindings(agentId, sessionId);

      expect(retrieved).toEqual(findings);
    });

    it('should return null for non-existent findings', async () => {
      const findings = await memoryProvider.getTempFindings('non-existent', 'non-existent');
      expect(findings).toBeNull();
    });
  });

  describe('session management', () => {
    it('should clear a session', async () => {
      const message: ChatMessage = {
        role: 'user',
        content: 'Test message',
        timestamp: new Date()
      };

      await memoryProvider.addMessage(agentId, sessionId, message);
      
      // Verify message exists
      let history = await memoryProvider.getHistory(agentId, sessionId);
      expect(history).toHaveLength(1);

      // Clear session
      await memoryProvider.clearSession(agentId, sessionId);

      // Verify session is cleared
      history = await memoryProvider.getHistory(agentId, sessionId);
      expect(history).toHaveLength(0);
    });

    it('should get active sessions for an agent', async () => {
      const session1 = 'session-1';
      const session2 = 'session-2';

      const message: ChatMessage = {
        role: 'user',
        content: 'Test',
        timestamp: new Date()
      };

      await memoryProvider.addMessage(agentId, session1, message);
      await memoryProvider.addMessage(agentId, session2, message);

      const sessions = await memoryProvider.getActiveSessions(agentId);
      
      expect(sessions).toHaveLength(2);
      expect(sessions).toContain(session1);
      expect(sessions).toContain(session2);
    });
  });
});