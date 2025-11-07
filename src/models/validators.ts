import { z } from 'zod';
import { OrderType } from '../models/enums';

/**
 * Schema for creating a new order
 */
export const createOrderSchema = z.object({
  type: z.nativeEnum(OrderType),
  tokenIn: z.string().min(32).max(100),
  tokenOut: z.string().min(32).max(100),
  amountIn: z.number().positive(),
  slippage: z.number().min(0).max(1).optional().default(0.01),
  expectedPrice: z.number().positive().optional(),
});

export type CreateOrderDTO = z.infer<typeof createOrderSchema>;

/**
 * Schema for order query filters
 */
export const orderQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.number().int().positive().max(100).optional().default(10),
  offset: z.number().int().min(0).optional().default(0),
});

export type OrderQueryDTO = z.infer<typeof orderQuerySchema>;

/**
 * Schema for order ID parameter
 */
export const orderIdSchema = z.object({
  id: z.string().uuid(),
});

export type OrderIdDTO = z.infer<typeof orderIdSchema>;
