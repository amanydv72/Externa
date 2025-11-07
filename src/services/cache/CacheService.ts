import { redis } from '../../config/redis';
import { Order, OrderStatusUpdate } from '../../models';
import logger from '../../utils/logger';

const CACHE_TTL = 3600; // 1 hour
const ACTIVE_ORDERS_KEY = 'active_orders';

export class CacheService {
  /**
   * Cache an active order
   */
  async cacheOrder(orderId: string, order: Order): Promise<void> {
    try {
      await redis.setex(`order:${orderId}`, CACHE_TTL, JSON.stringify(order));
      await redis.sadd(ACTIVE_ORDERS_KEY, orderId);
      logger.debug({ orderId }, 'Order cached');
    } catch (error) {
      logger.error({ error, orderId }, 'Failed to cache order');
    }
  }

  /**
   * Get cached order
   */
  async getCachedOrder(orderId: string): Promise<Order | null> {
    try {
      const cached = await redis.get(`order:${orderId}`);
      if (!cached) return null;
      
      return JSON.parse(cached);
    } catch (error) {
      logger.error({ error, orderId }, 'Failed to get cached order');
      return null;
    }
  }

  /**
   * Update cached order status
   */
  async updateCachedOrderStatus(orderId: string, statusUpdate: Partial<Order>): Promise<void> {
    try {
      const cached = await this.getCachedOrder(orderId);
      if (!cached) return;

      const updated = { ...cached, ...statusUpdate, updatedAt: new Date() };
      await redis.setex(`order:${orderId}`, CACHE_TTL, JSON.stringify(updated));
      logger.debug({ orderId, status: statusUpdate.status }, 'Cached order updated');
    } catch (error) {
      logger.error({ error, orderId }, 'Failed to update cached order');
    }
  }

  /**
   * Remove order from cache
   */
  async removeCachedOrder(orderId: string): Promise<void> {
    try {
      await redis.del(`order:${orderId}`);
      await redis.srem(ACTIVE_ORDERS_KEY, orderId);
      logger.debug({ orderId }, 'Order removed from cache');
    } catch (error) {
      logger.error({ error, orderId }, 'Failed to remove cached order');
    }
  }

  /**
   * Get all active order IDs
   */
  async getActiveOrderIds(): Promise<string[]> {
    try {
      return await redis.smembers(ACTIVE_ORDERS_KEY);
    } catch (error) {
      logger.error({ error }, 'Failed to get active order IDs');
      return [];
    }
  }

  /**
   * Cache order status update
   */
  async cacheStatusUpdate(orderId: string, update: OrderStatusUpdate): Promise<void> {
    try {
      await redis.lpush(
        `order:${orderId}:updates`,
        JSON.stringify(update)
      );
      await redis.expire(`order:${orderId}:updates`, CACHE_TTL);
    } catch (error) {
      logger.error({ error, orderId }, 'Failed to cache status update');
    }
  }

  /**
   * Get order status updates
   */
  async getStatusUpdates(orderId: string): Promise<OrderStatusUpdate[]> {
    try {
      const updates = await redis.lrange(`order:${orderId}:updates`, 0, -1);
      return updates.map((u: string) => JSON.parse(u)).reverse();
    } catch (error) {
      logger.error({ error, orderId }, 'Failed to get status updates');
      return [];
    }
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    try {
      const orderIds = await this.getActiveOrderIds();
      const keys = orderIds.map((id) => `order:${id}`);
      
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      
      await redis.del(ACTIVE_ORDERS_KEY);
      logger.info('Cache cleared');
    } catch (error) {
      logger.error({ error }, 'Failed to clear cache');
    }
  }
}

export const cacheService = new CacheService();
