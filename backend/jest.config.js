/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js'],
  collectCoverageFrom: ['src/**/*.ts'],
  coveragePathIgnorePatterns: ['node_modules', 'dist'],
  // globalSetup: runs once in main process (schema push to test.db)
  globalSetup: '<rootDir>/jest.setup.js',
  // setupFiles: runs in EACH worker process BEFORE imports — sets env vars
  // so dotenv.config() in server.ts won't override them (dotenv skips existing keys)
  setupFiles: ['<rootDir>/jest.env.js'],
  // Prevent bcrypt / async operations from timing out
  testTimeout: 15000,
  // Reset mocks between tests
  clearMocks: true,
};
