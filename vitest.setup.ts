/**
 * Vitest global setup file
 * Runs before all tests
 */

// Set test environment variables
if (!process.env.NODE_ENV) {
  Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-secret-key-for-testing';
}

// Mock environment variables for tests if not set
if (!process.env.ANTHROPIC_API_KEY) {
  process.env.ANTHROPIC_API_KEY = '';
}

// Log CI environment
if (process.env.CI) {
  console.log('Running in CI environment');
}

// Global test configuration
export default async function setup() {
  // Any global setup needed before tests run
}
