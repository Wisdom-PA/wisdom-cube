import type { FastifyError, FastifyInstance } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { AppError, buildErrorEnvelope } from '../errors.ts';

// Maps typed errors → HTTP responses in the shared envelope shape.
// Internals and stack traces never reach the client: unknown errors are logged
// server-side and returned as a generic INTERNAL envelope.
// NOTE on 405: Fastify's router treats a method-miss on a known path as 404,
// while FastAPI emits 405 METHOD_NOT_ALLOWED — a documented router-level
// divergence; the envelope SHAPE stays identical either way.
export function registerErrorHandling(app: FastifyInstance): void {
  app.setNotFoundHandler((request, reply) => {
    // Path only (no query string) — keeps the message byte-identical with py-backend.
    const path = request.url.split('?')[0];
    void reply
      .status(404)
      .send(buildErrorEnvelope('NOT_FOUND', `Route ${request.method} ${path} not found`, request.id));
  });

  app.setErrorHandler((error, request, reply) => {
    const requestId = request.id;

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(buildErrorEnvelope(error.code, error.message, requestId));
    }

    const fastifyError = error as Partial<FastifyError>;

    // Fastify's body-limit rejection, mapped into the envelope.
    if (fastifyError.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
      return reply.status(413).send(buildErrorEnvelope('PAYLOAD_TOO_LARGE', 'Request body too large', requestId));
    }

    // @fastify/rate-limit rejection, mapped into the envelope.
    if (fastifyError.statusCode === 429) {
      return reply
        .status(429)
        .send(buildErrorEnvelope('RATE_LIMITED', fastifyError.message ?? 'Rate limit exceeded', requestId));
    }

    if (hasZodFastifySchemaValidationErrors(error)) {
      const message = error.validation.map((issue) => `${issue.instancePath || 'input'}: ${issue.message}`).join('; ');
      return reply.status(400).send(buildErrorEnvelope('VALIDATION', message, requestId));
    }

    request.log.error({ err: error }, 'unhandled error');
    return reply.status(500).send(buildErrorEnvelope('INTERNAL', 'Internal Server Error', requestId));
  });
}
