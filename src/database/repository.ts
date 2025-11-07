import { db } from '../config/database';
import { orders, OrderRecord, NewOrderRecord } from './schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { OrderStatus } from '../models/enums';

export class OrderRepository {
  /**
   * Create a new order
   */
  async createOrder(orderData: NewOrderRecord): Promise<OrderRecord> {
    const [order] = await db.insert(orders).values(orderData).returning();
    return order;
  }

  /**
   * Find order by ID
   */
  async findById(orderId: string): Promise<OrderRecord | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    return order;
  }

  /**
   * Update order status
   */
  async updateStatus(
    orderId: string,
    status: OrderStatus,
    additionalData?: Partial<OrderRecord>
  ): Promise<OrderRecord | undefined> {
    const [order] = await db
      .update(orders)
      .set({
        status,
        updatedAt: new Date(),
        ...(additionalData || {}),
      })
      .where(eq(orders.id, orderId))
      .returning();
    return order;
  }

  /**
   * Update order execution details
   */
  async updateExecution(
    orderId: string,
    executionData: {
      executedPrice: string;
      amountOut: string;
      dexProvider: string;
      txHash: string;
    }
  ): Promise<OrderRecord | undefined> {
    const [order] = await db
      .update(orders)
      .set({
        executedPrice: executionData.executedPrice,
        amountOut: executionData.amountOut,
        dexProvider: executionData.dexProvider as any,
        txHash: executionData.txHash,
        status: OrderStatus.CONFIRMED,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();
    return order;
  }

  /**
   * Mark order as failed
   */
  async markFailed(
    orderId: string,
    errorMessage: string,
    retryCount: number
  ): Promise<OrderRecord | undefined> {
    const [order] = await db
      .update(orders)
      .set({
        status: OrderStatus.FAILED,
        errorMessage,
        retryCount,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();
    return order;
  }

  /**
   * Increment retry count
   */
  async incrementRetry(orderId: string): Promise<OrderRecord | undefined> {
    const order = await this.findById(orderId);
    if (!order) return undefined;

    const [updatedOrder] = await db
      .update(orders)
      .set({
        retryCount: order.retryCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();
    return updatedOrder;
  }

  /**
   * Find orders by status
   */
  async findByStatus(
    status: OrderStatus | OrderStatus[],
    limit: number = 10
  ): Promise<OrderRecord[]> {
    const statusArray = Array.isArray(status) ? status : [status];
    return await db
      .select()
      .from(orders)
      .where(inArray(orders.status, statusArray))
      .orderBy(desc(orders.createdAt))
      .limit(limit);
  }

  /**
   * Find all orders with pagination
   */
  async findAll(limit: number = 10, offset: number = 0): Promise<OrderRecord[]> {
    return await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit).offset(offset);
  }

  /**
   * Count orders by status
   */
  async countByStatus(status: OrderStatus): Promise<number> {
    const result = await db
      .select({ count: orders.id })
      .from(orders)
      .where(eq(orders.status, status));
    return result.length;
  }

  /**
   * Get recent orders
   */
  async getRecentOrders(limit: number = 20): Promise<OrderRecord[]> {
    return await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit);
  }

  /**
   * Delete order (for testing purposes)
   */
  async deleteOrder(orderId: string): Promise<boolean> {
    await db.delete(orders).where(eq(orders.id, orderId));
    return true;
  }
}

export const orderRepository = new OrderRepository();
