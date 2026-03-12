export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, message, 'BAD_REQUEST');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(403, message, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message: string) {
    super(422, message, 'UNPROCESSABLE_ENTITY');
  }
}

export class InternalServerError extends AppError {
  constructor(message: string) {
    super(500, message, 'INTERNAL_SERVER_ERROR');
  }
}
