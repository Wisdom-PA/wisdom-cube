import { z } from 'zod';

// The wire shape of every error this service returns. The Python backend ships
// the identical shape as a Pydantic model — byte-identical across languages:
// { "error": { "code", "message", "requestId" } }
export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
  }),
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

// The ONLY place the wire shape is constructed (mirrors py-backend's single
// _envelope helper) — key order here is the byte-parity contract.
export function buildErrorEnvelope(code: string, message: string, requestId: string): ErrorEnvelope {
  return { error: { code, message, requestId } };
}

// Typed errors services/routes throw; the error handler maps them to HTTP.
// Never construct error responses by hand — throw one of these.
export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super('NOT_FOUND', message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Missing or invalid credentials') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super('CONFLICT', message, 409);
  }
}

export class InvalidInputError extends AppError {
  constructor(message = 'Invalid input') {
    super('VALIDATION', message, 400);
  }
}
