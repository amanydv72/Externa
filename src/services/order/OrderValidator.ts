import { CreateOrderDTO, OrderType } from '../../models';
import { isValidSolanaAddress } from '../../utils/helpers';

export class OrderValidator {
  /**
   * Validate order creation input
   */
  validateCreateOrder(orderData: CreateOrderDTO): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate order type
    if (!Object.values(OrderType).includes(orderData.type)) {
      errors.push(`Invalid order type: ${orderData.type}`);
    }

    // Validate token addresses
    if (!isValidSolanaAddress(orderData.tokenIn)) {
      errors.push(`Invalid tokenIn address: ${orderData.tokenIn}`);
    }

    if (!isValidSolanaAddress(orderData.tokenOut)) {
      errors.push(`Invalid tokenOut address: ${orderData.tokenOut}`);
    }

    // Ensure different tokens
    if (orderData.tokenIn === orderData.tokenOut) {
      errors.push('tokenIn and tokenOut must be different');
    }

    // Validate amount
    if (orderData.amountIn <= 0) {
      errors.push('amountIn must be greater than 0');
    }

    if (orderData.amountIn > 1000000) {
      errors.push('amountIn exceeds maximum allowed (1,000,000)');
    }

    // Validate slippage
    if (orderData.slippage !== undefined) {
      if (orderData.slippage < 0 || orderData.slippage > 1) {
        errors.push('slippage must be between 0 and 1');
      }

      if (orderData.slippage > 0.5) {
        errors.push('slippage exceeds recommended maximum (50%)');
      }
    }

    // Validate expected price if provided
    if (orderData.expectedPrice !== undefined && orderData.expectedPrice <= 0) {
      errors.push('expectedPrice must be greater than 0');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate market order specific rules
   */
  validateMarketOrder(orderData: CreateOrderDTO): { valid: boolean; errors: string[] } {
    const baseValidation = this.validateCreateOrder(orderData);
    
    if (!baseValidation.valid) {
      return baseValidation;
    }

    // Market orders should execute immediately
    // No additional validations needed for mock implementation

    return { valid: true, errors: [] };
  }

  /**
   * Sanitize order data
   */
  sanitizeOrderData(orderData: CreateOrderDTO): CreateOrderDTO {
    return {
      ...orderData,
      amountIn: Math.abs(orderData.amountIn),
      slippage: orderData.slippage || 0.01,
      tokenIn: orderData.tokenIn.trim(),
      tokenOut: orderData.tokenOut.trim(),
    };
  }
}

export const orderValidator = new OrderValidator();
