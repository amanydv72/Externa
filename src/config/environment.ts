import { config } from 'dotenv';

config();

export const environment = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',

  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/order_engine',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'order_engine',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // Queue
  queue: {
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '10', 10),
    rateLimit: parseInt(process.env.QUEUE_RATE_LIMIT || '100', 10),
    maxRetryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10),
  },

  // DEX Mock Configuration
  dex: {
    mockBasePrice: parseFloat(process.env.MOCK_BASE_PRICE || '1.0'),
    raydiumFee: parseFloat(process.env.RAYDIUM_FEE || '0.003'),
    meteoraFee: parseFloat(process.env.METEORA_FEE || '0.002'),
    executionDelayMin: parseInt(process.env.EXECUTION_DELAY_MIN || '2000', 10),
    executionDelayMax: parseInt(process.env.EXECUTION_DELAY_MAX || '3000', 10),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: process.env.NODE_ENV === 'development',
  },
};
