import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { environment } from './config/environment';
import { testDatabaseConnection, closeDatabaseConnection } from './config/database';
import { testRedisConnection, closeRedisConnection } from './config/redis';
import logger from './utils/logger';

// Initialize Fastify
const fastify = Fastify({
  logger: {
    level: environment.logging.level,
    transport: environment.logging.prettyPrint
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  },
});

// Register plugins
async function registerPlugins() {
  // CORS
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  // WebSocket support
  await fastify.register(websocket, {
    options: {
      maxPayload: 1048576, // 1MB
    },
  });
}

// Health check route
fastify.get('/health', async () => {
  const dbHealthy = await testDatabaseConnection();
  const redisHealthy = await testRedisConnection();

  return {
    status: dbHealthy && redisHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealthy ? 'connected' : 'disconnected',
      redis: redisHealthy ? 'connected' : 'disconnected',
    },
  };
});

// Root route
fastify.get('/', async () => {
  return {
    name: 'Order Execution Engine',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      orders: '/api/orders',
    },
  };
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received, starting graceful shutdown...`);
  
  try {
    await fastify.close();
    await closeDatabaseConnection();
    await closeRedisConnection();
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during shutdown');
    process.exit(1);
  }
}

// Start server
async function start() {
  try {
    // Register plugins
    await registerPlugins();

    // Test connections
    const dbHealthy = await testDatabaseConnection();
    const redisHealthy = await testRedisConnection();

    if (!dbHealthy || !redisHealthy) {
      throw new Error('Required services are not available');
    }

    // Start listening
    await fastify.listen({
      port: environment.port,
      host: environment.host,
    });

    logger.info(`Server running at http://${environment.host}:${environment.port}`);

    // Setup shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Start the server
start();

export default fastify;
