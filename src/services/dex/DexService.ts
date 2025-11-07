import { mockDexRouter } from './MockDexRouter';
import { mockSwapExecutor } from './MockSwapExecutor';
import { DEXQuote, RoutingDecision, SwapResult, DEXProvider } from '../../models';
import { DEXRoutingError, OrderExecutionError } from '../../utils/errors';
import logger from '../../utils/logger';

/**
 * DEX Service
 * High-level service for DEX operations including routing and execution
 */
export class DexService {
  /**
   * Get quotes from all DEXs
   */
  async getQuotes(
    tokenIn: string,
    tokenOut: string,
    amountIn: number
  ): Promise<{
    raydiumQuote: DEXQuote;
    meteoraQuote: DEXQuote;
  }> {
    try {
      return await mockDexRouter.getQuotes(tokenIn, tokenOut, amountIn);
    } catch (error) {
      logger.error({ error, tokenIn, tokenOut, amountIn }, 'Failed to get DEX quotes');
      throw new DEXRoutingError('Failed to fetch quotes from DEXs', { error });
    }
  }

  /**
   * Get routing decision (which DEX to use)
   */
  async getRoutingDecision(
    orderId: string,
    tokenIn: string,
    tokenOut: string,
    amountIn: number
  ): Promise<{
    quote: DEXQuote;
    decision: RoutingDecision;
  }> {
    try {
      return await mockDexRouter.getBestQuote(orderId, tokenIn, tokenOut, amountIn);
    } catch (error) {
      logger.error({ error, orderId }, 'Failed to get routing decision');
      throw new DEXRoutingError('Failed to determine best DEX route', { error });
    }
  }

  /**
   * Execute swap on selected DEX
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
    try {
      const result = await mockSwapExecutor.executeSwap(
        orderId,
        dexProvider,
        tokenIn,
        tokenOut,
        amountIn,
        expectedPrice,
        slippage
      );

      // Validate slippage
      const isSlippageValid = mockSwapExecutor.validateSlippage(
        expectedPrice,
        result.executedPrice,
        slippage
      );

      if (!isSlippageValid) {
        throw new OrderExecutionError(
          `Slippage exceeded tolerance: expected ${expectedPrice}, got ${result.executedPrice}`,
          { expectedPrice, executedPrice: result.executedPrice, maxSlippage: slippage }
        );
      }

      return result;
    } catch (error) {
      logger.error({ error, orderId, dexProvider }, 'Failed to execute swap');
      throw new OrderExecutionError('Failed to execute swap on DEX', { error });
    }
  }

  /**
   * Complete flow: route and execute
   */
  async routeAndExecute(
    orderId: string,
    tokenIn: string,
    tokenOut: string,
    amountIn: number,
    slippage: number
  ): Promise<{
    decision: RoutingDecision;
    result: SwapResult;
  }> {
    logger.info({ orderId }, 'Starting route and execute flow');

    // Step 1: Get routing decision
    const { quote, decision } = await this.getRoutingDecision(
      orderId,
      tokenIn,
      tokenOut,
      amountIn
    );

    // Step 2: Execute swap on selected DEX
    const result = await this.executeSwap(
      orderId,
      decision.selectedProvider,
      tokenIn,
      tokenOut,
      amountIn,
      quote.price,
      slippage
    );

    logger.info(
      {
        orderId,
        selectedDex: decision.selectedProvider,
        txHash: result.txHash,
      },
      'Route and execute completed successfully'
    );

    return { decision, result };
  }

  /**
   * Estimate output amount without executing
   */
  async estimateOutput(
    tokenIn: string,
    tokenOut: string,
    amountIn: number
  ): Promise<{
    raydiumEstimate: number;
    meteoraEstimate: number;
    bestEstimate: number;
    bestProvider: DEXProvider;
  }> {
    const { raydiumQuote, meteoraQuote } = await this.getQuotes(tokenIn, tokenOut, amountIn);

    const raydiumEstimate = raydiumQuote.amountOut;
    const meteoraEstimate = meteoraQuote.amountOut;
    const bestEstimate = Math.max(raydiumEstimate, meteoraEstimate);
    const bestProvider =
      raydiumEstimate >= meteoraEstimate ? DEXProvider.RAYDIUM : DEXProvider.METEORA;

    return {
      raydiumEstimate,
      meteoraEstimate,
      bestEstimate,
      bestProvider,
    };
  }
}

export const dexService = new DexService();
