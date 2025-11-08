import { mockDexRouter } from './MockDexRouter';
import { mockSwapExecutor } from './MockSwapExecutor';
import { DEXQuote, RoutingDecision, SwapResult, DEXProvider } from '../../models';
import { DEXRoutingError, OrderExecutionError } from '../../utils/errors';
import { wsolHandler } from '../../utils/wsolHandler';
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
      // Validate token addresses first
      const validation = wsolHandler.validateTokenAddresses(tokenIn, tokenOut);
      if (!validation.isValid) {
        throw new DEXRoutingError(
          `Invalid token pair: ${validation.errors.join(', ')}`,
          { tokenIn, tokenOut, errors: validation.errors }
        );
      }

      // Normalize tokens for DEX compatibility (convert SOL → WSOL)
      const { tokenIn: normalizedTokenIn, tokenOut: normalizedTokenOut } = 
        wsolHandler.normalizeTokenPair(tokenIn, tokenOut);

      // Log WSOL conversion if it occurred
      if (normalizedTokenIn !== tokenIn || normalizedTokenOut !== tokenOut) {
        logger.info({
          originalTokenIn: tokenIn,
          originalTokenOut: tokenOut,
          normalizedTokenIn,
          normalizedTokenOut,
          tokenInSymbol: wsolHandler.getTokenSymbol(tokenIn),
          tokenOutSymbol: wsolHandler.getTokenSymbol(tokenOut),
        }, 'Normalized tokens for DEX compatibility');
      }

      // Get quotes using normalized tokens
      return await mockDexRouter.getQuotes(normalizedTokenIn, normalizedTokenOut, amountIn);
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
    wrapInstructions: any; // WSOL wrap/unwrap instructions
  }> {
    try {
      // Generate WSOL instructions
      const wrapInstructions = wsolHandler.getWrapInstructions(tokenIn, tokenOut, amountIn);
      
      // Use normalized tokens for DEX routing
      const result = await mockDexRouter.getBestQuote(
        orderId, 
        wrapInstructions.normalizedTokenIn, 
        wrapInstructions.normalizedTokenOut, 
        amountIn
      );

      // Log WSOL handling details
      if (wrapInstructions.needsWrapIn || wrapInstructions.needsUnwrapOut) {
        logger.info({
          orderId,
          needsWrapIn: wrapInstructions.needsWrapIn,
          needsUnwrapOut: wrapInstructions.needsUnwrapOut,
          originalTokenIn: tokenIn,
          originalTokenOut: tokenOut,
          tokenInSymbol: wsolHandler.getTokenSymbol(tokenIn),
          tokenOutSymbol: wsolHandler.getTokenSymbol(tokenOut),
        }, 'WSOL wrap/unwrap instructions generated');
      }

      return {
        ...result,
        wrapInstructions,
      };
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
      // Generate WSOL instructions
      const wrapInstructions = wsolHandler.getWrapInstructions(tokenIn, tokenOut, amountIn);

      // Execute swap with normalized tokens
      const result = await mockSwapExecutor.executeSwap(
        orderId,
        dexProvider,
        wrapInstructions.normalizedTokenIn,
        wrapInstructions.normalizedTokenOut,
        amountIn,
        expectedPrice,
        slippage
      );

      // Enhance result with WSOL information
      const enhancedResult: SwapResult = {
        ...result,
        // Add WSOL handling metadata
        wsolHandling: {
          wrappedInput: wrapInstructions.needsWrapIn,
          unwrappedOutput: wrapInstructions.needsUnwrapOut,
          originalTokenIn: wrapInstructions.originalTokenIn,
          originalTokenOut: wrapInstructions.originalTokenOut,
          tokenInSymbol: wsolHandler.getTokenSymbol(tokenIn),
          tokenOutSymbol: wsolHandler.getTokenSymbol(tokenOut),
        },
      };

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

      // Log successful execution with WSOL details
      if (wrapInstructions.needsWrapIn || wrapInstructions.needsUnwrapOut) {
        logger.info({
          orderId,
          dexProvider,
          txHash: result.txHash,
          wsolWrapped: wrapInstructions.needsWrapIn,
          wsolUnwrapped: wrapInstructions.needsUnwrapOut,
          swapPath: `${wsolHandler.getTokenSymbol(tokenIn)} → ${wsolHandler.getTokenSymbol(tokenOut)}`,
        }, 'Swap executed with WSOL handling');
      }

      return enhancedResult;
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
    wrapInstructions: any;
  }> {
    logger.info({ 
      orderId, 
      swapPath: `${wsolHandler.getTokenSymbol(tokenIn)} → ${wsolHandler.getTokenSymbol(tokenOut)}`,
      amountIn,
    }, 'Starting route and execute flow');

    // Step 1: Get routing decision (includes WSOL handling)
    const { quote, decision, wrapInstructions } = await this.getRoutingDecision(
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
        swapPath: `${wsolHandler.getTokenSymbol(tokenIn)} → ${wsolHandler.getTokenSymbol(tokenOut)}`,
        wsolWrapped: wrapInstructions.needsWrapIn,
        wsolUnwrapped: wrapInstructions.needsUnwrapOut,
      },
      'Route and execute completed successfully'
    );

    return { decision, result, wrapInstructions };
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
    wrapInstructions: any;
    swapPath: string;
  }> {
    // Generate WSOL instructions for display purposes
    const wrapInstructions = wsolHandler.getWrapInstructions(tokenIn, tokenOut, amountIn);
    
    // Get quotes using the existing method (which now handles WSOL internally)
    const { raydiumQuote, meteoraQuote } = await this.getQuotes(tokenIn, tokenOut, amountIn);

    const raydiumEstimate = raydiumQuote.amountOut;
    const meteoraEstimate = meteoraQuote.amountOut;
    const bestEstimate = Math.max(raydiumEstimate, meteoraEstimate);
    const bestProvider =
      raydiumEstimate >= meteoraEstimate ? DEXProvider.RAYDIUM : DEXProvider.METEORA;

    const swapPath = `${wsolHandler.getTokenSymbol(tokenIn)} → ${wsolHandler.getTokenSymbol(tokenOut)}`;

    return {
      raydiumEstimate,
      meteoraEstimate,
      bestEstimate,
      bestProvider,
      wrapInstructions,
      swapPath,
    };
  }
}

export const dexService = new DexService();
