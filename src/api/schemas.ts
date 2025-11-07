import { Type } from '@sinclair/typebox';
import { OrderStatus, OrderType } from '../models/enums';

/**
 * Request schema for order execution
 */
export const ExecuteOrderSchema = Type.Object({
  tokenIn: Type.String({
    description: 'Input token address (Solana)',
    minLength: 32,
    maxLength: 44,
  }),
  tokenOut: Type.String({
    description: 'Output token address (Solana)',
    minLength: 32,
    maxLength: 44,
  }),
  amountIn: Type.Number({
    description: 'Input amount',
    minimum: 0.000001,
  }),
  slippage: Type.Optional(
    Type.Number({
      description: 'Slippage tolerance (e.g., 0.01 for 1%)',
      minimum: 0.0001,
      maximum: 0.5,
      default: 0.01,
    })
  ),
  orderType: Type.Optional(
    Type.Enum(OrderType, {
      description: 'Order type',
      default: OrderType.MARKET,
    })
  ),
});

/**
 * Response schema for order execution
 */
export const ExecuteOrderResponseSchema = Type.Object({
  success: Type.Boolean(),
  orderId: Type.String(),
  status: Type.Enum(OrderStatus),
  message: Type.String(),
  websocketUrl: Type.Optional(Type.String()),
  data: Type.Optional(
    Type.Object({
      tokenIn: Type.String(),
      tokenOut: Type.String(),
      amountIn: Type.Number(),
      slippage: Type.Number(),
      orderType: Type.String(),
      createdAt: Type.String(),
    })
  ),
});

/**
 * Response schema for get order by ID
 */
export const GetOrderResponseSchema = Type.Object({
  success: Type.Boolean(),
  order: Type.Optional(
    Type.Object({
      id: Type.String(),
      tokenIn: Type.String(),
      tokenOut: Type.String(),
      amountIn: Type.String(),
      amountOut: Type.Optional(Type.String()),
      slippage: Type.String(),
      status: Type.Enum(OrderStatus),
      orderType: Type.Enum(OrderType),
      dexProvider: Type.Optional(Type.String()),
      executedPrice: Type.Optional(Type.String()),
      txHash: Type.Optional(Type.String()),
      errorMessage: Type.Optional(Type.String()),
      retryCount: Type.Number(),
      createdAt: Type.String(),
      updatedAt: Type.String(),
    })
  ),
  error: Type.Optional(Type.String()),
});

/**
 * Query parameters for listing orders
 */
export const ListOrdersQuerySchema = Type.Object({
  status: Type.Optional(Type.Enum(OrderStatus)),
  limit: Type.Optional(
    Type.Number({
      minimum: 1,
      maximum: 100,
      default: 20,
    })
  ),
  offset: Type.Optional(
    Type.Number({
      minimum: 0,
      default: 0,
    })
  ),
});

/**
 * Response schema for listing orders
 */
export const ListOrdersResponseSchema = Type.Object({
  success: Type.Boolean(),
  orders: Type.Array(
    Type.Object({
      id: Type.String(),
      tokenIn: Type.String(),
      tokenOut: Type.String(),
      amountIn: Type.String(),
      amountOut: Type.Optional(Type.String()),
      status: Type.Enum(OrderStatus),
      orderType: Type.Enum(OrderType),
      dexProvider: Type.Optional(Type.String()),
      executedPrice: Type.Optional(Type.String()),
      txHash: Type.Optional(Type.String()),
      createdAt: Type.String(),
      updatedAt: Type.String(),
    })
  ),
  pagination: Type.Object({
    limit: Type.Number(),
    offset: Type.Number(),
    total: Type.Number(),
  }),
});

/**
 * Error response schema
 */
export const ErrorResponseSchema = Type.Object({
  success: Type.Literal(false),
  error: Type.String(),
  message: Type.String(),
  statusCode: Type.Number(),
});
