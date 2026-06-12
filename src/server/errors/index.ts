import { NextResponse } from 'next/server';

export class AppError extends Error {
  constructor(
    public override message: string,
    public statusCode: number = 500,
    public errors?: Record<string, string[]> | unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, errors?: Record<string, string[]> | unknown) {
    super(message, 400, errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not Found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
        ...(error.errors ? { errors: error.errors } : {}),
      },
      { status: error.statusCode }
    );
  }

  // Handle generic error
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  console.error('[Unhandled API Error]:', error);
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status: 500 }
  );
}
