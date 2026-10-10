const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

/** Testes de integração das rotas: precisam de um MongoDB (TEST_MONGODB_URI). */
module.exports = createJestConfig({
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
  setupFiles: ['<rootDir>/__tests__/env.js'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
  testTimeout: 30000,
});
