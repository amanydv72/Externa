import { OrderStatus, OrderType, DEXProvider } from './enums';

export interface Order {
  id: string;
  type: OrderType;
  status: OrderStatus;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut?: number;
  expectedPrice?: number;
  executedPrice?: number;
  slippage: number;
  dexProvider?: DEXProvider;
  txHash?: string;
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface CreateOrderInput {
  type: OrderType;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  slippage?: number;
  expectedPrice?: number;
}

export interface OrderStatusUpdate {
  orderId: string;
  status: OrderStatus;
  message?: string;
  txHash?: string;
  executedPrice?: number;
  dexProvider?: DEXProvider;
  error?: string;
  timestamp: Date;
}
