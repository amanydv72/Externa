import { FastifyInstance, FastifyRequest } from 'fastify';
import { wsManager } from './WebSocketManager';
import { logger } from '../utils/logger';

interface WebSocketParams {
  orderId: string;
}

export async function registerWebSocketRoutes(server: FastifyInstance): Promise<void> {
  // WebSocket endpoint for order status updates
  server.get(
    '/ws/orders/:orderId',
    { websocket: true },
    async (connection, request: FastifyRequest<{ Params: WebSocketParams }>) => {
      const { orderId } = request.params;
      const socket = connection;

      logger.info({
        event: 'websocket_request',
        orderId,
        ip: request.ip,
      });

      try {
        // Register the connection with WebSocket manager
        wsManager.registerConnection(orderId, socket);

        // Handle incoming messages from client (optional - for ping/pong, etc.)
        socket.on('message', (message: Buffer) => {
          try {
            const data = JSON.parse(message.toString());
            
            // Handle ping
            if (data.type === 'ping') {
              socket.send(JSON.stringify({
                type: 'pong',
                timestamp: new Date(),
              }));
            }
          } catch (error) {
            logger.error({
              event: 'websocket_message_error',
              orderId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        });

      } catch (error) {
        logger.error({
          event: 'websocket_setup_error',
          orderId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        socket.close();
      }
    }
  );

  // Health check endpoint for WebSocket service
  server.get('/ws/health', async (_request, reply) => {
    const stats = wsManager.getStats();
    
    return reply.code(200).send({
      status: 'healthy',
      websocket: {
        enabled: true,
        ...stats,
      },
    });
  });

  logger.info({ event: 'websocket_routes_registered' });
}
