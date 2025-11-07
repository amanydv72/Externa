import { randomBytes } from 'crypto';

/**
 * Sleep utility for adding delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a random delay between min and max milliseconds
 */
export function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a mock transaction hash (Solana format)
 */
export function generateMockTxHash(): string {
  const bytes = randomBytes(32);
  return bytes.toString('base64').replace(/[+/=]/g, '').substring(0, 88);
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoff(attemptNumber: number, baseDelay: number = 1000): number {
  const maxDelay = 30000; // 30 seconds max
  const delay = Math.min(baseDelay * Math.pow(2, attemptNumber), maxDelay);
  // Add jitter (±20%)
  const jitter = delay * 0.2 * (Math.random() * 2 - 1);
  return Math.floor(delay + jitter);
}

/**
 * Format number to fixed decimal places
 */
export function formatNumber(value: number, decimals: number = 8): string {
  return value.toFixed(decimals);
}

/**
 * Calculate percentage difference between two values
 */
export function calculatePercentageDiff(value1: number, value2: number): number {
  return ((value2 - value1) / value1) * 100;
}

/**
 * Validate Solana address format (mock validation)
 */
export function isValidSolanaAddress(address: string): boolean {
  // Basic validation: base58 string, 32-44 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}
