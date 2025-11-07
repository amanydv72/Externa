// Jest setup file
beforeAll(() => {
  // Setup code before all tests
});

afterAll(() => {
  // Cleanup code after all tests
});

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/order_engine_test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
