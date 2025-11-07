import { SwapResult, DEXProvider } from '../../models';
import { environment } from '../../config/environment';
import { sleep, randomDelay, generateMockTxHash } from '../../utils/helpers';
import logger from '../../utils/logger';

/**
 * Mock Swap Executor
 * Simulates actual swap execution on the selected DEX
 */
export class MockSwapExecutor {
  /**
   * Execute swap on the selected DEX
   * Simulates 2-3 second execution time
   */
  async executeSwap(
    orderId: string,
    dexProvider: DEXProvider,
    tokenIn: string,
    tokenOut: string,
    amountIn: number,
    expectedPrice: number,
    slippage: number
  ): Promise<SwapResult> {
    logger.info(
      {
        orderId,
        dexProvider,
        tokenIn,
        tokenOut,
        amountIn,
        expectedPrice,
        slippage,
      },
      'Executing swap on DEX'
    );

    // Simulate execution delay (2-3 seconds)
    const executionDelay = randomDelay(
      environment.dex.executionDelayMin,
      environment.dex.executionDelayMax
    );
    await sleep(executionDelay);

    // Simulate possible slippage during execution
    const actualSlippage = Math.random() * slippage * 0.8; // 0-80% of max slippage
    const executedPrice = expectedPrice * (1 - actualSlippage);

    // Calculate final output amount
    const fee = dexProvider === DEXProvider.RAYDIUM 
      ? environment.dex.raydiumFee 
      : environment.dex.meteoraFee;
    
    const amountAfterFee = amountIn * (1 - fee);
    const amountOut = amountAfterFee * executedPrice;

    // Generate mock transaction hash
    const txHash = generateMockTxHash();

    // Simulate gas usage (in lamports, 1 SOL = 1e9 lamports)
    const gasUsed = randomDelay(5000, 15000); // 5k-15k lamports (~$0.0001-0.0003)

    const result: SwapResult = {
      success: true,
      txHash,
      executedPrice,
      amountOut,
      actualSlippage,
      gasUsed,
      timestamp: new Date(),
    };

    logger.info(
      {
        orderId,
        dexProvider,
        txHash,
        executedPrice,
        amountOut,
        actualSlippage: `${(actualSlippage * 100).toFixed(4)}%`,
        gasUsed,
      },
      'Swap executed successfully'
    );

    return result;
  }

  /**
   * Simulate swap failure (for testing retry logic)
   * Used randomly or when testing error scenarios
   */
  async executeSwapWithFailure(
    _orderId: string,
    failureRate: number = 0.1 // 10% failure rate
  ): Promise<SwapResult> {
    // Simulate network delay
    await sleep(randomDelay(1000, 2000));

    // Random failure
    if (Math.random() < failureRate) {
      throw new Error('Swap execution failed: Insufficient liquidity');
    }

    // If not failed, return mock success (simplified)
    return {
      success: true,
      txHash: generateMockTxHash(),
      executedPrice: 1.0,
      amountOut: 100,
      actualSlippage: 0.001,
      timestamp: new Date(),
    };
  }

  /**
   * Validate slippage tolerance
   * Returns true if execution price is within acceptable slippage
   */
  validateSlippage(expectedPrice: number, executedPrice: number, maxSlippage: number): boolean {
    const actualSlippage = Math.abs((expectedPrice - executedPrice) / expectedPrice);
    return actualSlippage <= maxSlippage;
  }
}

export const mockSwapExecutor = new MockSwapExecutor();
