import { FastifyInstance } from 'fastify';
import { registerOrderRoutes } from './routes/orders';

export async function registerApiRoutes(server: FastifyInstance): Promise<void> {
  // Register order routes
  await registerOrderRoutes(server);
}
