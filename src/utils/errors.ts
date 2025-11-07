export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    super(
      identifier ? `${resource} with id ${identifier} not found` : `${resource} not found`,
      404,
      'NOT_FOUND'
    );
  }
}

export class OrderExecutionError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'ORDER_EXECUTION_ERROR', details);
  }
}

export class DEXRoutingError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'DEX_ROUTING_ERROR', details);
  }
}

export class QueueError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'QUEUE_ERROR', details);
  }
}
