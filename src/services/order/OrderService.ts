import { orderRepository } from '../../database';
import { CreateOrderDTO, OrderStatus, OrderType } from '../../models';
import { mapOrderRecordToOrder, mapOrderToNewRecord, formatOrderResponse } from '../../database';
import logger from '../../utils/logger';

export class OrderService {
  /**
   * Create a new order
   */
  async createOrder(orderData: CreateOrderDTO) {
    try {
      logger.info({ orderData }, 'Creating new order');

      const newOrderRecord = mapOrderToNewRecord({
        type: orderData.type,
        tokenIn: orderData.tokenIn,
        tokenOut: orderData.tokenOut,
        amountIn: orderData.amountIn,
        expectedPrice: orderData.expectedPrice,
        slippage: orderData.slippage,
      });

      const createdRecord = await orderRepository.createOrder(newOrderRecord);
      const order = mapOrderRecordToOrder(createdRecord);

      logger.info({ orderId: order.id }, 'Order created successfully');

      return {
        success: true,
        order,
        formatted: formatOrderResponse(order),
      };
    } catch (error) {
      logger.error({ error, orderData }, 'Failed to create order');
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string) {
    try {
      const record = await orderRepository.findById(orderId);
      
      if (!record) {
        return {
          success: false,
          error: 'Order not found',
        };
      }

      const order = mapOrderRecordToOrder(record);
      return {
        success: true,
        order,
        formatted: formatOrderResponse(order),
      };
    } catch (error) {
      logger.error({ error, orderId }, 'Failed to get order');
      throw error;
    }
  }

  /**
   * Get orders with filters
   */
  async getOrders(filters: { status?: string; limit?: number; offset?: number }) {
    try {
      const { status, limit = 10, offset = 0 } = filters;

      const records = await orderRepository.findAll({
        status: status as OrderStatus,
        limit,
        offset,
      });

      const orders = records.map(mapOrderRecordToOrder);
      const formatted = orders.map(formatOrderResponse);

      return {
        success: true,
        orders,
        formatted,
        pagination: {
          limit,
          offset,
          count: orders.length,
        },
      };
    } catch (error) {
      logger.error({ error, filters }, 'Failed to get orders');
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    additionalData?: any
  ) {
    try {
      const record = await orderRepository.updateStatus(orderId, status, additionalData);
      
      if (!record) {
        return {
          success: false,
          error: 'Order not found',
        };
      }

      const order = mapOrderRecordToOrder(record);
      logger.info({ orderId, status }, 'Order status updated');

      return {
        success: true,
        order,
      };
    } catch (error) {
      logger.error({ error, orderId, status }, 'Failed to update order status');
      throw error;
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStats() {
    try {
      const [pending, routing, confirmed, failed] = await Promise.all([
        orderRepository.countByStatus(OrderStatus.PENDING),
        orderRepository.countByStatus(OrderStatus.ROUTING),
        orderRepository.countByStatus(OrderStatus.CONFIRMED),
        orderRepository.countByStatus(OrderStatus.FAILED),
      ]);

      return {
        success: true,
        stats: {
          pending,
          routing,
          processing: routing,
          confirmed,
          failed,
          total: pending + routing + confirmed + failed,
        },
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get order stats');
      throw error;
    }
  }

  /**
   * Validate order data
   */
  async validateOrder(orderData: {
    tokenIn: string;
    tokenOut: string;
    amountIn: number;
    slippage: number;
    orderType: OrderType;
  }) {
    const errors: string[] = [];

    // Validate token addresses (basic Solana address format)
    if (orderData.tokenIn.length < 32 || orderData.tokenIn.length > 44) {
      errors.push('Invalid tokenIn address');
    }
    if (orderData.tokenOut.length < 32 || orderData.tokenOut.length > 44) {
      errors.push('Invalid tokenOut address');
    }

    // Validate amounts
    if (orderData.amountIn <= 0) {
      errors.push('amountIn must be greater than 0');
    }

    // Validate slippage
    if (orderData.slippage < 0.0001 || orderData.slippage > 0.5) {
      errors.push('Slippage must be between 0.01% and 50%');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get cached order from cache service
   */
  async getCachedOrder(_orderId: string) {
    // This would typically use cacheService
    // For now, return null to fall back to database
    return null;
  }
}

export const orderService = new OrderService();
