export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, code = 'INTERNAL_ERROR', statusCode = 500, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class ExtractionError extends AppError {
  constructor(message: string) {
    super(message, 'EXTRACTION_ERROR', 422);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized admin access') {
    super(message, 'UNAUTHORIZED', 403);
  }
}

export class DuplicateMessageError extends AppError {
  constructor(message: string = 'Message already processed or currently processing') {
    super(message, 'DUPLICATE_MESSAGE', 409);
  }
}
