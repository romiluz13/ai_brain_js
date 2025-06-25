// Setup for utils package tests

// Test utilities for utils package
(global as any).utilsTestUtils = {
  createMockLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }),
  
  captureConsoleOutput: () => {
    const logs: string[] = [];
    const originalLog = console.log;
    
    console.log = jest.fn((message) => {
      logs.push(message);
    });
    
    return {
      logs,
      restore: () => {
        console.log = originalLog;
      }
    };
  }
};
