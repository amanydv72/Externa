import { MockDexRouter } from '../../src/services/dex/MockDexRouter';
import { DEXProvider } from '../../src/models';

describe('MockDexRouter', () => {
  let router: MockDexRouter;

  beforeEach(() => {
    router = new MockDexRouter();
  });

  describe('getQuotes', () => {
    it('should fetch quotes from both Raydium and Meteora', async () => {
      const tokenIn = 'So11111111111111111111111111111111111111112'; // SOL
      const tokenOut = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC
      const amountIn = 10;

      const { raydiumQuote, meteoraQuote } = await router.getQuotes(
        tokenIn,
        tokenOut,
        amountIn
      );

      // Verify Raydium quote
      expect(raydiumQuote).toBeDefined();
      expect(raydiumQuote.provider).toBe(DEXProvider.RAYDIUM);
      expect(raydiumQuote.tokenIn).toBe(tokenIn);
      expect(raydiumQuote.tokenOut).toBe(tokenOut);
      expect(raydiumQuote.amountIn).toBe(amountIn);
      expect(raydiumQuote.amountOut).toBeGreaterThan(0);
      expect(raydiumQuote.price).toBeGreaterThan(0);
      expect(raydiumQuote.fee).toBe(0.003);

      // Verify Meteora quote
      expect(meteoraQuote).toBeDefined();
      expect(meteoraQuote.provider).toBe(DEXProvider.METEORA);
      expect(meteoraQuote.tokenIn).toBe(tokenIn);
      expect(meteoraQuote.tokenOut).toBe(tokenOut);
      expect(meteoraQuote.amountIn).toBe(amountIn);
      expect(meteoraQuote.amountOut).toBeGreaterThan(0);
      expect(meteoraQuote.price).toBeGreaterThan(0);
      expect(meteoraQuote.fee).toBe(0.002);
    });

    it('should complete within reasonable time', async () => {
      const startTime = Date.now();
      
      await router.getQuotes(
        'So11111111111111111111111111111111111111112',
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        5
      );

      const duration = Date.now() - startTime;
      
      // Should take ~200-300ms (quotes are fetched in parallel)
      expect(duration).toBeLessThan(500);
      expect(duration).toBeGreaterThan(100);
    });
  });

  describe('selectBestDex', () => {
    it('should select DEX with better output amount', async () => {
      const orderId = 'test-order-123';
      const { raydiumQuote, meteoraQuote } = await router.getQuotes(
        'So11111111111111111111111111111111111111112',
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        100
      );

      const decision = router.selectBestDex(orderId, raydiumQuote, meteoraQuote);

      expect(decision).toBeDefined();
      expect(decision.orderId).toBe(orderId);
      expect(decision.selectedProvider).toBeDefined();
      expect([DEXProvider.RAYDIUM, DEXProvider.METEORA]).toContain(
        decision.selectedProvider
      );
      expect(decision.reason).toBeDefined();
      expect(decision.raydiumQuote).toBe(raydiumQuote);
      expect(decision.meteoraQuote).toBe(meteoraQuote);
    });

    it('should provide detailed routing reason', async () => {
      const orderId = 'test-order-456';
      const { raydiumQuote, meteoraQuote } = await router.getQuotes(
        'So11111111111111111111111111111111111111112',
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        50
      );

      const decision = router.selectBestDex(orderId, raydiumQuote, meteoraQuote);

      // Reason should mention the selected DEX
      expect(decision.reason).toContain(decision.selectedProvider);
      expect(decision.reason.length).toBeGreaterThan(10);
    });
  });

  describe('getBestQuote', () => {
    it('should return best quote and routing decision', async () => {
      const orderId = 'test-order-789';
      const { quote, decision } = await router.getBestQuote(
        orderId,
        'So11111111111111111111111111111111111111112',
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        25
      );

      expect(quote).toBeDefined();
      expect(decision).toBeDefined();
      expect(quote.provider).toBe(decision.selectedProvider);
      expect(decision.orderId).toBe(orderId);
    });
  });
});
