import { pgTable, uuid, varchar, decimal, timestamp, integer, text } from 'drizzle-orm/pg-core';
import { OrderStatus, OrderType, DEXProvider } from '../models/enums';

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 20 }).$type<OrderType>().notNull(),
  status: varchar('status', { length: 20 }).$type<OrderStatus>().notNull().default(OrderStatus.PENDING),
  
  // Token details
  tokenIn: varchar('token_in', { length: 100 }).notNull(),
  tokenOut: varchar('token_out', { length: 100 }).notNull(),
  amountIn: decimal('amount_in', { precision: 20, scale: 8 }).notNull(),
  amountOut: decimal('amount_out', { precision: 20, scale: 8 }),
  
  // Pricing
  expectedPrice: decimal('expected_price', { precision: 20, scale: 8 }),
  executedPrice: decimal('executed_price', { precision: 20, scale: 8 }),
  slippage: decimal('slippage', { precision: 5, scale: 4 }).notNull().default('0.01'),
  
  // Execution details
  dexProvider: varchar('dex_provider', { length: 20 }).$type<DEXProvider>(),
  txHash: varchar('tx_hash', { length: 200 }),
  
  // Error handling
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').notNull().default(0),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
});

export type OrderRecord = typeof orders.$inferSelect;
export type NewOrderRecord = typeof orders.$inferInsert;
