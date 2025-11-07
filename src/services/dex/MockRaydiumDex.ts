import { DEXQuote, DEXProvider } from '../../models';
import { environment } from '../../config/environment';
import { sleep, randomDelay } from '../../utils/helpers';
import logger from '../../utils/logger';

/**
 * Mock implementation of Raydium DEX
 * Simulates realistic price quotes with variance
 */
export class MockRaydiumDex {
  private readonly fee = environment.dex.raydiumFee;
  private readonly basePrice = environment.dex.mockBasePrice;

  /**
   * Get quote from Raydium pool
   * Simulates network delay of ~200ms
   */
  async getQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: number
  ): Promise<DEXQuote> {
    // Simulate network delay
    await sleep(randomDelay(150, 250));

    // Calculate price with variance (±2% from base)
    const priceVariance = 0.98 + Math.random() * 0.04;
    const price = this.basePrice * priceVariance;

    // Calculate output amount after fees
    const feeAmount = amountIn * this.fee;
    const amountAfterFee = amountIn - feeAmount;
    const amountOut = amountAfterFee * price;

    // Calculate price impact (higher for larger trades)
    const priceImpact = this.calculatePriceImpact(amountIn);

    const quote: DEXQuote = {
      provider: DEXProvider.RAYDIUM,
      tokenIn,
      tokenOut,
      amountIn,
      amountOut,
      price,
      fee: this.fee,
      priceImpact,
      timestamp: new Date(),
    };

    logger.debug(
      {
        provider: 'Raydium',
        price,
        amountOut,
        fee: this.fee,
        priceImpact,
      },
      'Raydium quote generated'
    );

    return quote;
  }

  /**
   * Calculate price impact based on trade size
   * Larger trades have higher impact
   */
  private calculatePriceImpact(amountIn: number): number {
    // Base impact + size-based impact
    const baseImpact = 0.001; // 0.1%
    const sizeImpact = Math.min(amountIn / 10000, 0.02); // Up to 2%
    return baseImpact + sizeImpact;
  }
}
