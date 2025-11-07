import { OrderRecord } from '../database/schema';
import { Order } from '../models/Order';
import { OrderType, OrderStatus, DEXProvider } from '../models/enums';

/**
 * Map database record to domain model
 */
export function mapOrderRecordToOrder(record: OrderRecord): Order {
  return {
    id: record.id,
    type: record.type as OrderType,
    status: record.status as OrderStatus,
    tokenIn: record.tokenIn,
    tokenOut: record.tokenOut,
    amountIn: parseFloat(record.amountIn),
    amountOut: record.amountOut ? parseFloat(record.amountOut) : undefined,
    expectedPrice: record.expectedPrice ? parseFloat(record.expectedPrice) : undefined,
    executedPrice: record.executedPrice ? parseFloat(record.executedPrice) : undefined,
    slippage: parseFloat(record.slippage),
    dexProvider: record.dexProvider as DEXProvider | undefined,
    txHash: record.txHash || undefined,
    errorMessage: record.errorMessage || undefined,
    retryCount: record.retryCount,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    completedAt: record.completedAt || undefined,
  };
}

/**
 * Map domain model to database record (for insert)
 */
export function mapOrderToNewRecord(order: Partial<Order>): any {
  return {
    type: order.type,
    status: order.status || OrderStatus.PENDING,
    tokenIn: order.tokenIn,
    tokenOut: order.tokenOut,
    amountIn: order.amountIn?.toString(),
    expectedPrice: order.expectedPrice?.toString(),
    slippage: order.slippage?.toString() || '0.01',
    retryCount: 0,
  };
}

/**
 * Format order response for API
 */
export function formatOrderResponse(order: Order) {
  return {
    id: order.id,
    type: order.type,
    status: order.status,
    tokenPair: {
      tokenIn: order.tokenIn,
      tokenOut: order.tokenOut,
    },
    amounts: {
      amountIn: order.amountIn,
      amountOut: order.amountOut,
    },
    pricing: {
      expectedPrice: order.expectedPrice,
      executedPrice: order.executedPrice,
      slippage: order.slippage,
    },
    execution: {
      dexProvider: order.dexProvider,
      txHash: order.txHash,
    },
    metadata: {
      retryCount: order.retryCount,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      completedAt: order.completedAt,
    },
    error: order.errorMessage,
  };
}
