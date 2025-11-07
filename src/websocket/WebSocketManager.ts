import { WebSocket } from '@fastify/websocket';
import { logger } from '../utils/logger';
import { OrderStatus } from '../models/enums';

interface ConnectionInfo {
  ws: WebSocket;
  orderId: string;
  connectedAt: Date;
}

interface StatusUpdate {
  orderId: string;
  status: OrderStatus;
  timestamp: Date;
  data?: Record<string, any>;
}

export class WebSocketManager {
  private connections: Map<string, Set<ConnectionInfo>> = new Map();
  private connectionCount = 0;

  /**
   * Register a WebSocket connection for a specific order
   */
  registerConnection(orderId: string, ws: WebSocket): void {
    const connectionInfo: ConnectionInfo = {
      ws,
      orderId,
      connectedAt: new Date(),
    };

    if (!this.connections.has(orderId)) {
      this.connections.set(orderId, new Set());
    }

    this.connections.get(orderId)!.add(connectionInfo);
    this.connectionCount++;

    logger.info({
      event: 'websocket_connected',
      orderId,
      totalConnections: this.connectionCount,
    });

    // Setup cleanup on connection close
    ws.on('close', () => {
      this.removeConnection(orderId, connectionInfo);
    });

    ws.on('error', (error) => {
      logger.error({
        event: 'websocket_error',
        orderId,
        error: error.message,
      });
      this.removeConnection(orderId, connectionInfo);
    });

    // Send initial connection confirmation
    this.sendToClient(ws, {
      type: 'connected',
      orderId,
      timestamp: new Date(),
    });
  }

  /**
   * Remove a specific connection
   */
  private removeConnection(orderId: string, connectionInfo: ConnectionInfo): void {
    const orderConnections = this.connections.get(orderId);
    if (orderConnections) {
      orderConnections.delete(connectionInfo);
      this.connectionCount--;

      if (orderConnections.size === 0) {
        this.connections.delete(orderId);
      }

      logger.info({
        event: 'websocket_disconnected',
        orderId,
        totalConnections: this.connectionCount,
      });
    }
  }

  /**
   * Broadcast status update to all clients watching an order
   */
  broadcastStatusUpdate(update: StatusUpdate): void {
    const orderConnections = this.connections.get(update.orderId);
    
    if (!orderConnections || orderConnections.size === 0) {
      logger.debug({
        event: 'no_websocket_listeners',
        orderId: update.orderId,
      });
      return;
    }

    const message = {
      type: 'status_update',
      orderId: update.orderId,
      status: update.status,
      timestamp: update.timestamp,
      ...update.data,
    };

    let successCount = 0;
    let failureCount = 0;

    orderConnections.forEach((conn) => {
      try {
        if (conn.ws.readyState === WebSocket.OPEN) {
          this.sendToClient(conn.ws, message);
          successCount++;
        } else {
          failureCount++;
          this.removeConnection(update.orderId, conn);
        }
      } catch (error) {
        failureCount++;
        logger.error({
          event: 'broadcast_error',
          orderId: update.orderId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    logger.info({
      event: 'status_broadcasted',
      orderId: update.orderId,
      status: update.status,
      successCount,
      failureCount,
    });
  }

  /**
   * Send message to a specific client
   */
  private sendToClient(ws: WebSocket, message: Record<string, any>): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast to all connections for an order
   */
  broadcastToOrder(orderId: string, message: Record<string, any>): void {
    const orderConnections = this.connections.get(orderId);
    
    if (!orderConnections) {
      return;
    }

    orderConnections.forEach((conn) => {
      this.sendToClient(conn.ws, message);
    });
  }

  /**
   * Get active connections count for an order
   */
  getConnectionCount(orderId?: string): number {
    if (orderId) {
      return this.connections.get(orderId)?.size || 0;
    }
    return this.connectionCount;
  }

  /**
   * Get all active order IDs
   */
  getActiveOrders(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Close all connections for an order
   */
  closeOrderConnections(orderId: string, reason?: string): void {
    const orderConnections = this.connections.get(orderId);
    
    if (!orderConnections) {
      return;
    }

    const closeMessage = {
      type: 'closing',
      orderId,
      reason: reason || 'Order completed',
      timestamp: new Date(),
    };

    orderConnections.forEach((conn) => {
      try {
        this.sendToClient(conn.ws, closeMessage);
        conn.ws.close();
      } catch (error) {
        logger.error({
          event: 'close_connection_error',
          orderId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    this.connections.delete(orderId);
    logger.info({
      event: 'order_connections_closed',
      orderId,
      reason,
    });
  }

  /**
   * Close all connections (for graceful shutdown)
   */
  closeAll(): void {
    const orderIds = Array.from(this.connections.keys());
    
    orderIds.forEach((orderId) => {
      this.closeOrderConnections(orderId, 'Server shutting down');
    });

    logger.info({
      event: 'all_websockets_closed',
      closedOrders: orderIds.length,
    });
  }

  /**
   * Get statistics about WebSocket connections
   */
  getStats(): {
    totalConnections: number;
    activeOrders: number;
    ordersWithMultipleConnections: number;
  } {
    let ordersWithMultipleConnections = 0;

    this.connections.forEach((connections) => {
      if (connections.size > 1) {
        ordersWithMultipleConnections++;
      }
    });

    return {
      totalConnections: this.connectionCount,
      activeOrders: this.connections.size,
      ordersWithMultipleConnections,
    };
  }
}

// Singleton instance
export const wsManager = new WebSocketManager();
