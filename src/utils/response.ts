import { FastifyReply } from 'fastify';
import { AppError, ValidationError } from './errors';
import logger from './logger';

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  timestamp: string;
}

/**
 * Send success response
 */
export function sendSuccess<T>(reply: FastifyReply, data: T, statusCode: number = 200): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };

  reply.code(statusCode).send(response);
}

/**
 * Send error response
 */
export function sendError(
  reply: FastifyReply,
  error: Error | AppError,
  statusCode?: number
): void {
  let code = statusCode || 500;
  let message = error.message;
  let errorCode: string | undefined;
  let details: any;

  if (error instanceof AppError) {
    code = error.statusCode;
    errorCode = error.code;
    details = error.details;
  }

  const response: ApiResponse = {
    success: false,
    error: {
      message,
      code: errorCode,
      details,
    },
    timestamp: new Date().toISOString(),
  };

  logger.error({ error, statusCode: code }, 'API Error');
  reply.code(code).send(response);
}

/**
 * Handle validation errors
 */
export function handleValidationError(reply: FastifyReply, errors: string[]): void {
  const error = new ValidationError('Validation failed', { errors });
  sendError(reply, error);
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: {
    limit: number;
    offset: number;
    total?: number;
  }
) {
  return {
    items: data,
    pagination: {
      limit: pagination.limit,
      offset: pagination.offset,
      total: pagination.total || data.length,
      hasMore: pagination.total ? pagination.offset + data.length < pagination.total : false,
    },
  };
}
