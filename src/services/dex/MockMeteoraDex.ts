import { DEXQuote, DEXProvider } from '../../models';
import { environment } from '../../config/environment';
import { sleep, randomDelay } from '../../utils/helpers';
import logger from '../../utils/logger';

/**
 * Mock implementation of Meteora DEX
 * Simulates realistic price quotes with different variance pattern
 */
export class MockMeteoraDex {
  private readonly fee = environment.dex.meteoraFee;
  private readonly basePrice = environment.dex.mockBasePrice;

  /**
   * Get quote from Meteora pool
   * Simulates network delay of ~200ms
   */
  async getQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: number
  ): Promise<DEXQuote> {
    // Simulate network delay
    await sleep(randomDelay(150, 250));

    // Calculate price with variance (±2.5% from base, slightly different from Raydium)
    const priceVariance = 0.97 + Math.random() * 0.05;
    const price = this.basePrice * priceVariance;

    // Calculate output amount after fees
    const feeAmount = amountIn * this.fee;
    const amountAfterFee = amountIn - feeAmount;
    const amountOut = amountAfterFee * price;

    // Calculate price impact (slightly better for large trades due to dynamic AMM)
    const priceImpact = this.calculatePriceImpact(amountIn);

    const quote: DEXQuote = {
      provider: DEXProvider.METEORA,
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
        provider: 'Meteora',
        price,
        amountOut,
        fee: this.fee,
        priceImpact,
      },
      'Meteora quote generated'
    );

    return quote;
  }

  /**
   * Calculate price impact based on trade size
   * Meteora's dynamic AMM typically has lower impact
   */
  private calculatePriceImpact(amountIn: number): number {
    // Base impact + size-based impact (slightly better than Raydium)
    const baseImpact = 0.0008; // 0.08%
    const sizeImpact = Math.min(amountIn / 12000, 0.015); // Up to 1.5%
    return baseImpact + sizeImpact;
  }
}
