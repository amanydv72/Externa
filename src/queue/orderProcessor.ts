import { Worker, Job } from 'bullmq';
import { redis } from '../config/redis';
import { environment } from '../config/environment';
import { orderRepository } from '../database';
import { OrderStatus } from '../models';
import { dexService } from '../services/dex';
import { cacheService } from '../services/cache';
import { wsManager } from '../websocket';
import { calculateBackoff } from '../utils/helpers';
import { OrderExecutionError } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Order job data interface
 */
interface OrderJobData {
  orderId: string;
  orderData: {
    tokenIn: string;
    tokenOut: string;
    amountIn: number;
    slippage: number;
  };
  timestamp: string;
}

/**
 * Process order job
 * Handles the complete order execution flow
 */
async function processOrder(job: Job<OrderJobData>): Promise<any> {
  const { orderId, orderData } = job.data;
  const attemptNumber = job.attemptsMade;

  logger.info(
    { orderId, attemptNumber, jobId: job.id },
    'Processing order'
  );

  try {
    // Step 1: Update status to ROUTING
    await updateOrderStatus(orderId, OrderStatus.ROUTING, 'Comparing DEX prices');
    await job.updateProgress(20);

    // Step 2: Get routing decision
    const { quote, decision } = await dexService.getRoutingDecision(
      orderId,
      orderData.tokenIn,
      orderData.tokenOut,
      orderData.amountIn
    );

    logger.info(
      {
        orderId,
        selectedDex: decision.selectedProvider,
        price: quote.price,
        reason: decision.reason,
      },
      'Routing decision made'
    );

    await job.updateProgress(40);

    // Step 3: Update status to BUILDING
    await updateOrderStatus(orderId, OrderStatus.BUILDING, 'Creating transaction');
    await job.updateProgress(60);

    // Step 4: Execute swap
    await updateOrderStatus(orderId, OrderStatus.SUBMITTED, 'Transaction sent to network');
    
    const result = await dexService.executeSwap(
      orderId,
      decision.selectedProvider,
      orderData.tokenIn,
      orderData.tokenOut,
      orderData.amountIn,
      quote.price,
      orderData.slippage
    );

    await job.updateProgress(80);

    // Step 5: Update order with execution results
    await orderRepository.updateExecution(orderId, {
      executedPrice: result.executedPrice.toString(),
      amountOut: result.amountOut.toString(),
      dexProvider: decision.selectedProvider,
      txHash: result.txHash,
    });

    // Update cache
    await cacheService.updateCachedOrderStatus(orderId, {
      status: OrderStatus.CONFIRMED,
      executedPrice: result.executedPrice,
      txHash: result.txHash,
      dexProvider: decision.selectedProvider,
    });

    // Broadcast status update (will be picked up by WebSocket in Phase 5)
    await updateOrderStatus(
      orderId,
      OrderStatus.CONFIRMED,
      `Transaction confirmed: ${result.txHash}`
    );

    await job.updateProgress(100);

    logger.info(
      {
        orderId,
        txHash: result.txHash,
        executedPrice: result.executedPrice,
        amountOut: result.amountOut,
      },
      'Order executed successfully'
    );

    return {
      success: true,
      orderId,
      txHash: result.txHash,
      executedPrice: result.executedPrice,
      amountOut: result.amountOut,
      dexProvider: decision.selectedProvider,
    };
  } catch (error) {
    logger.error({ error, orderId, attemptNumber }, 'Order processing failed');

    // Increment retry count
    await orderRepository.incrementRetry(orderId);

    // Check if we should retry
    if (attemptNumber < environment.queue.maxRetryAttempts - 1) {
      const backoffDelay = calculateBackoff(attemptNumber);
      logger.warn(
        { orderId, attemptNumber, backoffDelay },
        'Will retry order after backoff'
      );
      throw error; // Let BullMQ handle the retry
    } else {
      // Max retries reached, mark as failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await orderRepository.markFailed(orderId, errorMessage, attemptNumber + 1);
      
      await cacheService.updateCachedOrderStatus(orderId, {
        status: OrderStatus.FAILED,
        errorMessage,
      });

      await updateOrderStatus(
        orderId,
        OrderStatus.FAILED,
        `Order failed after ${attemptNumber + 1} attempts: ${errorMessage}`
      );

      logger.error({ orderId, attemptNumber }, 'Order failed permanently');
      
      throw new OrderExecutionError(
        `Order failed after ${attemptNumber + 1} attempts`,
        { orderId, error }
      );
    }
  }
}

/**
 * Update order status helper
 */
async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  message: string
): Promise<void> {
  await orderRepository.updateStatus(orderId, status);
  
  await cacheService.cacheStatusUpdate(orderId, {
    orderId,
    status,
    message,
    timestamp: new Date(),
  });

  // Broadcast WebSocket update to connected clients
  wsManager.broadcastStatusUpdate({
    orderId,
    status,
    timestamp: new Date(),
    data: { message },
  });

  logger.debug({ orderId, status, message }, 'Order status updated');
}

/**
 * Create and start the worker
 */
export const orderWorker = new Worker<OrderJobData>(
  'order-execution',
  processOrder,
  {
    connection: redis,
    concurrency: environment.queue.concurrency,
    limiter: {
      max: environment.queue.rateLimit,
      duration: 60000, // Per minute
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  }
);

// Worker event listeners
orderWorker.on('ready', () => {
  logger.info('Order worker is ready and waiting for jobs');
});

orderWorker.on('active', (job) => {
  logger.info({ jobId: job.id, orderId: job.data.orderId }, 'Worker picked up job');
});

orderWorker.on('completed', (job, result) => {
  logger.info(
    { jobId: job.id, orderId: job.data.orderId, result },
    'Worker completed job'
  );
});

orderWorker.on('failed', (job, error) => {
  logger.error(
    { jobId: job?.id, orderId: job?.data?.orderId, error },
    'Worker failed job'
  );
});

orderWorker.on('error', (error) => {
  logger.error({ error }, 'Worker error occurred');
});

orderWorker.on('stalled', (jobId) => {
  logger.warn({ jobId }, 'Job stalled');
});

/**
 * Close worker
 */
export async function closeWorker() {
  await orderWorker.close();
  logger.info('Order worker closed');
}
