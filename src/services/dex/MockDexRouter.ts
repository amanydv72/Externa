import { DEXQuote, RoutingDecision, DEXProvider } from '../../models';
import { MockRaydiumDex } from './MockRaydiumDex';
import { MockMeteoraDex } from './MockMeteoraDex';
import { calculatePercentageDiff } from '../../utils/helpers';
import logger from '../../utils/logger';

/**
 * Mock DEX Router
 * Compares quotes from Raydium and Meteora and selects the best execution venue
 */
export class MockDexRouter {
  private raydium: MockRaydiumDex;
  private meteora: MockMeteoraDex;

  constructor() {
    this.raydium = new MockRaydiumDex();
    this.meteora = new MockMeteoraDex();
  }

  /**
   * Get quotes from both DEXs in parallel
   */
  async getQuotes(
    tokenIn: string,
    tokenOut: string,
    amountIn: number
  ): Promise<{
    raydiumQuote: DEXQuote;
    meteoraQuote: DEXQuote;
  }> {
    logger.info({ tokenIn, tokenOut, amountIn }, 'Fetching quotes from both DEXs');

    // Fetch quotes in parallel for efficiency
    const [raydiumQuote, meteoraQuote] = await Promise.all([
      this.raydium.getQuote(tokenIn, tokenOut, amountIn),
      this.meteora.getQuote(tokenIn, tokenOut, amountIn),
    ]);

    return { raydiumQuote, meteoraQuote };
  }

  /**
   * Compare quotes and select the best DEX
   * Returns routing decision with detailed reasoning
   */
  selectBestDex(
    orderId: string,
    raydiumQuote: DEXQuote,
    meteoraQuote: DEXQuote
  ): RoutingDecision {
    // Calculate effective output (amount out - price impact)
    const raydiumEffective = raydiumQuote.amountOut * (1 - raydiumQuote.priceImpact);
    const meteoraEffective = meteoraQuote.amountOut * (1 - meteoraQuote.priceImpact);

    // Determine best DEX
    const selectedProvider =
      raydiumEffective >= meteoraEffective ? DEXProvider.RAYDIUM : DEXProvider.METEORA;

    const selectedQuote = selectedProvider === DEXProvider.RAYDIUM ? raydiumQuote : meteoraQuote;
    const otherQuote = selectedProvider === DEXProvider.RAYDIUM ? meteoraQuote : raydiumQuote;

    // Calculate percentage difference
    const priceDifference = calculatePercentageDiff(otherQuote.price, selectedQuote.price);

    // Generate reasoning
    const reason = this.generateRoutingReason(
      selectedProvider,
      selectedQuote,
      otherQuote,
      priceDifference
    );

    const decision: RoutingDecision = {
      orderId,
      raydiumQuote,
      meteoraQuote,
      selectedProvider,
      reason,
      priceDifference,
      timestamp: new Date(),
    };

    logger.info(
      {
        orderId,
        selectedProvider,
        raydiumPrice: raydiumQuote.price,
        meteoraPrice: meteoraQuote.price,
        raydiumOut: raydiumQuote.amountOut,
        meteoraOut: meteoraQuote.amountOut,
        priceDifference: `${priceDifference.toFixed(2)}%`,
        reason,
      },
      'DEX routing decision made'
    );

    return decision;
  }

  /**
   * Generate human-readable routing reason
   */
  private generateRoutingReason(
    selected: DEXProvider,
    selectedQuote: DEXQuote,
    otherQuote: DEXQuote,
    priceDiff: number
  ): string {
    const reasons: string[] = [];

    // Price difference
    if (Math.abs(priceDiff) > 1) {
      reasons.push(`${Math.abs(priceDiff).toFixed(2)}% better price`);
    }

    // Output amount
    const outputDiff = calculatePercentageDiff(otherQuote.amountOut, selectedQuote.amountOut);
    if (outputDiff > 0.5) {
      reasons.push(`${outputDiff.toFixed(2)}% more output`);
    }

    // Lower fees
    if (selectedQuote.fee < otherQuote.fee) {
      const feeDiff = ((otherQuote.fee - selectedQuote.fee) * 100).toFixed(2);
      reasons.push(`${feeDiff}% lower fees`);
    }

    // Lower price impact
    if (selectedQuote.priceImpact < otherQuote.priceImpact) {
      const impactDiff = ((otherQuote.priceImpact - selectedQuote.priceImpact) * 100).toFixed(2);
      reasons.push(`${impactDiff}% lower price impact`);
    }

    if (reasons.length === 0) {
      return `${selected} selected with similar pricing`;
    }

    return `${selected} offers: ${reasons.join(', ')}`;
  }

  /**
   * Get best quote directly (convenience method)
   */
  async getBestQuote(
    orderId: string,
    tokenIn: string,
    tokenOut: string,
    amountIn: number
  ): Promise<{
    quote: DEXQuote;
    decision: RoutingDecision;
  }> {
    const { raydiumQuote, meteoraQuote } = await this.getQuotes(tokenIn, tokenOut, amountIn);
    const decision = this.selectBestDex(orderId, raydiumQuote, meteoraQuote);
    const quote = decision.selectedProvider === DEXProvider.RAYDIUM ? raydiumQuote : meteoraQuote;

    return { quote, decision };
  }
}

export const mockDexRouter = new MockDexRouter();
