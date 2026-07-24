import { randomUUID } from 'node:crypto';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastify, { type FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import type { Env } from './env.ts';
import { type Authenticate, buildAuthenticate } from './plugins/auth.ts';
import { registerDocs } from './plugins/docs.ts';
import { registerErrorHandling } from './plugins/error-handler.ts';
import { registerMetrics } from './plugins/metrics.ts';
import { InMemoryItemsRepository } from './repositories/items-repo.ts';
import { registerHealthRoutes } from './routes/health.ts';
import { registerItemsRoutes } from './routes/items.ts';
import { ItemsService } from './services/items-service.ts';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: Authenticate;
  }
}

export interface BuildAppOptions {
  env: Env;
  /** Structured pino logging (off in unit tests). */
  logger?: boolean;
  /** Test seam: register extra routes/plugins before the app is finalized. */
  beforeReady?: (app: FastifyInstance) => void;
}

export async function buildApp({ env, logger = true, beforeReady }: BuildAppOptions): Promise<FastifyInstance> {
  const app = fastify({
    logger: logger
      ? {
          level: env.LOG_LEVEL,
          redact: ['req.headers.authorization'],
        }
      : false,
    // Correlation id per request: honor an incoming x-request-id, else mint one.
    // It is echoed on every response and carried in the error envelope.
    requestIdHeader: 'x-request-id',
    genReqId: () => randomUUID(),
    disableRequestLogging: env.NODE_ENV === 'test',
    // Graceful drain: fastify's default ('idle') falls through to
    // closeAllConnections() on close, destroying in-flight requests. With
    // `false`, Node ≥19 server.close() reaps idle keep-alive sockets itself and
    // lets active requests finish — exactly the SIGTERM drain we want.
    forceCloseConnections: false,
    // Seeded edge limits (see .env.example): max body size and a server-side
    // cap on how long a request may take end-to-end.
    bodyLimit: env.BODY_LIMIT_BYTES,
    requestTimeout: env.REQUEST_TIMEOUT_MS,
  });

  // Node only reaps idle keep-alive sockets when their keepAliveTimeout fires
  // (fastify's default is 72s), which would stall close() long past ECS
  // stopTimeout. While draining, nudge idle connections closed so close()
  // resolves as soon as in-flight requests finish.
  let idleReaper: NodeJS.Timeout | undefined;
  app.addHook('preClose', async () => {
    idleReaper = setInterval(() => app.server.closeIdleConnections(), 250);
    idleReaper.unref();
  });
  app.addHook('onClose', async () => {
    if (idleReaper) {
      clearInterval(idleReaper);
    }
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Security headers. CSP is enabled only in production: swagger-ui's inline
  // scripts (the /docs UI, absent in prod) would violate it.
  await app.register(helmet, { contentSecurityPolicy: env.APP_ENV === 'production' });

  // Seeded rate limit; /health opts out (route config) so ALB health checks
  // are never throttled. The 429 envelope is shaped by the error handler —
  // the single owner of the wire shape.
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX_PER_MINUTE,
    timeWindow: '1 minute',
  });

  app.decorate('authenticate', buildAuthenticate(env.API_TOKEN));

  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  registerErrorHandling(app);
  registerMetrics(app);
  // Swagger must register before routes so it can collect their schemas.
  await registerDocs(app, env);

  const repo = new InMemoryItemsRepository();
  const service = new ItemsService(repo);
  registerHealthRoutes(app);
  registerItemsRoutes(app, service, { allowDelay: env.APP_ENV !== 'production' });

  beforeReady?.(app);

  await app.ready();
  return app;
}
