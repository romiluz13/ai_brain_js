require('dotenv').config({ path: '.env.test' });

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/**/__tests__/**',
    '!packages/*/src/**/*.test.ts',
    '!packages/*/src/**/*.spec.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 60000, // Increased for MongoDB Atlas
  verbose: true,
  maxWorkers: 1, // Run tests sequentially for MongoDB Atlas
  forceExit: true,
  detectOpenHandles: true,
  projects: [
    {
      displayName: 'core',
      testMatch: ['<rootDir>/packages/core/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/packages/core/jest.setup.ts'],
    },
    {
      displayName: 'integrations',
      testMatch: ['<rootDir>/packages/integrations/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/packages/integrations/jest.setup.ts'],
    },
    {
      displayName: 'utils',
      testMatch: ['<rootDir>/packages/utils/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/packages/utils/jest.setup.ts'],
    },
  ],
};
