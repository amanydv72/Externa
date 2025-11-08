import { DEXProvider } from './enums';

export interface DEXQuote {
  provider: DEXProvider;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  price: number;
  fee: number;
  priceImpact: number;
  timestamp: Date;
}

export interface SwapResult {
  success: boolean;
  txHash: string;
  executedPrice: number;
  amountOut: number;
  actualSlippage: number;
  gasUsed?: number;
  timestamp: Date;
  wsolHandling?: {
    wrappedInput: boolean;
    unwrappedOutput: boolean;
    originalTokenIn: string;
    originalTokenOut: string;
    tokenInSymbol: string;
    tokenOutSymbol: string;
  };
}

export interface RoutingDecision {
  orderId: string;
  raydiumQuote: DEXQuote;
  meteoraQuote: DEXQuote;
  selectedProvider: DEXProvider;
  reason: string;
  priceDifference: number;
  timestamp: Date;
}
