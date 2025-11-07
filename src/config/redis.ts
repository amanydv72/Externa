import Redis from 'ioredis';
import { environment } from './environment';

// Create Redis client
export const redis = new Redis({
  host: environment.redis.host,
  port: environment.redis.port,
  password: environment.redis.password,
  maxRetriesPerRequest: null, // Required for BullMQ
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Test Redis connection
export async function testRedisConnection(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error('Redis connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeRedisConnection(): Promise<void> {
  await redis.quit();
}

// Event handlers
redis.on('error', (error) => {
  console.error('Redis error:', error);
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});
