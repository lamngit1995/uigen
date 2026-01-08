/**
 * Vitest global setup file
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing';

// Mock environment variables for tests if not set
if (!process.env.ANTHROPIC_API_KEY) {
  process.env.ANTHROPIC_API_KEY = '';
}

// Increase timeout for CI environments
if (process.env.CI) {
  console.log('Running in CI environment');
}

// Global test configuration
export default async function setup() {
  // Any global setup needed before tests run
}
