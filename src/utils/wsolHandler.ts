/**
 * Wrapped SOL Handler
 * Handles conversion between native SOL and WSOL for DEX compatibility
 */

// Solana token addresses
export const NATIVE_SOL_ADDRESS = "11111111111111111111111111111111";
export const WRAPPED_SOL_ADDRESS = "So11111111111111111111111111111111111111112";

export interface WrapInstructions {
  needsWrapIn: boolean;
  needsUnwrapOut: boolean;
  wrapAmount: number;
  originalTokenIn: string;
  originalTokenOut: string;
  normalizedTokenIn: string;
  normalizedTokenOut: string;
}

export class WrappedSolHandler {
  /**
   * Check if an address is native SOL
   */
  isNativeSol(tokenAddress: string): boolean {
    return tokenAddress === NATIVE_SOL_ADDRESS;
  }

  /**
   * Check if an address is wrapped SOL
   */
  isWrappedSol(tokenAddress: string): boolean {
    return tokenAddress === WRAPPED_SOL_ADDRESS;
  }

  /**
   * Convert native SOL address to WSOL if needed
   */
  normalizeTokenAddress(tokenAddress: string): string {
    if (this.isNativeSol(tokenAddress)) {
      return WRAPPED_SOL_ADDRESS;
    }
    return tokenAddress;
  }

  /**
   * Normalize both token addresses for DEX compatibility
   */
  normalizeTokenPair(tokenIn: string, tokenOut: string): {
    tokenIn: string;
    tokenOut: string;
  } {
    return {
      tokenIn: this.normalizeTokenAddress(tokenIn),
      tokenOut: this.normalizeTokenAddress(tokenOut),
    };
  }

  /**
   * Generate wrap/unwrap instructions for a swap
   */
  getWrapInstructions(
    originalTokenIn: string,
    originalTokenOut: string,
    amountIn: number
  ): WrapInstructions {
    const normalizedTokenIn = this.normalizeTokenAddress(originalTokenIn);
    const normalizedTokenOut = this.normalizeTokenAddress(originalTokenOut);

    const needsWrapIn = this.isNativeSol(originalTokenIn);
    const needsUnwrapOut = this.isNativeSol(originalTokenOut);

    return {
      needsWrapIn,
      needsUnwrapOut,
      wrapAmount: needsWrapIn ? amountIn : 0,
      originalTokenIn,
      originalTokenOut,
      normalizedTokenIn,
      normalizedTokenOut,
    };
  }

  /**
   * Get human-readable token symbol
   */
  getTokenSymbol(tokenAddress: string): string {
    if (this.isNativeSol(tokenAddress)) {
      return 'SOL';
    }
    if (this.isWrappedSol(tokenAddress)) {
      return 'WSOL';
    }
    
    // Common token mappings (you can extend this)
    const tokenMap: Record<string, string> = {
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
      'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'mSOL',
    };

    return tokenMap[tokenAddress] || `${tokenAddress.slice(0, 8)}...`;
  }

  /**
   * Validate token addresses
   */
  validateTokenAddresses(tokenIn: string, tokenOut: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check if tokens are the same
    if (tokenIn === tokenOut) {
      errors.push('Input and output tokens cannot be the same');
    }

    // Check if normalized tokens are the same (SOL → WSOL case)
    const normalizedIn = this.normalizeTokenAddress(tokenIn);
    const normalizedOut = this.normalizeTokenAddress(tokenOut);
    
    if (normalizedIn === normalizedOut && normalizedIn === WRAPPED_SOL_ADDRESS) {
      errors.push('Cannot swap between SOL and WSOL (they represent the same asset)');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export const wsolHandler = new WrappedSolHandler();