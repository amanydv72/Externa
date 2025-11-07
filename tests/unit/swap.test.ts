import { MockSwapExecutor } from '../../src/services/dex/MockSwapExecutor';
import { DEXProvider } from '../../src/models';

describe('MockSwapExecutor', () => {
  let executor: MockSwapExecutor;

  beforeEach(() => {
    executor = new MockSwapExecutor();
  });

  describe('executeSwap', () => {
    it('should execute swap successfully', async () => {
      const result = await executor.executeSwap(
        'test-order-123',
        DEXProvider.RAYDIUM,
        'So11111111111111111111111111111111111111112',
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        10,
        1.0,
        0.01
      );

      expect(result.success).toBe(true);
      expect(result.txHash).toBeDefined();
      expect(result.txHash.length).toBeGreaterThan(30);
      expect(result.executedPrice).toBeGreaterThan(0);
      expect(result.amountOut).toBeGreaterThan(0);
      expect(result.actualSlippage).toBeLessThanOrEqual(0.01);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should simulate execution delay of 2-3 seconds', async () => {
      const startTime = Date.now();

      await executor.executeSwap(
        'test-order-456',
        DEXProvider.METEORA,
        'So11111111111111111111111111111111111111112',
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        5,
        1.0,
        0.01
      );

      const duration = Date.now() - startTime;

      // Should take 2-3 seconds
      expect(duration).toBeGreaterThanOrEqual(2000);
      expect(duration).toBeLessThan(3500);
    });

    it('should include gas usage in result', async () => {
      const result = await executor.executeSwap(
        'test-order-789',
        DEXProvider.RAYDIUM,
        'So11111111111111111111111111111111111111112',
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        20,
        1.0,
        0.01
      );

      expect(result.gasUsed).toBeDefined();
      expect(result.gasUsed).toBeGreaterThan(0);
      expect(result.gasUsed).toBeLessThan(20000); // Reasonable gas range
    });
  });

  describe('validateSlippage', () => {
    it('should validate slippage within tolerance', () => {
      const expectedPrice = 1.0;
      const executedPrice = 0.995; // 0.5% slippage
      const maxSlippage = 0.01; // 1% max

      const isValid = executor.validateSlippage(expectedPrice, executedPrice, maxSlippage);

      expect(isValid).toBe(true);
    });

    it('should reject slippage exceeding tolerance', () => {
      const expectedPrice = 1.0;
      const executedPrice = 0.98; // 2% slippage
      const maxSlippage = 0.01; // 1% max

      const isValid = executor.validateSlippage(expectedPrice, executedPrice, maxSlippage);

      expect(isValid).toBe(false);
    });

    it('should handle zero slippage', () => {
      const expectedPrice = 1.0;
      const executedPrice = 1.0;
      const maxSlippage = 0.01;

      const isValid = executor.validateSlippage(expectedPrice, executedPrice, maxSlippage);

      expect(isValid).toBe(true);
    });
  });
});
