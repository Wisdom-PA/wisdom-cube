import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';
import type { Env } from '../env.ts';

// Interactive API docs at /docs + raw OpenAPI spec at /docs/json, generated
// from the Zod route schemas (the schema is the single source of truth for the
// API surface — the spec is never hand-written). Mounted only outside
// production; in production both routes 404.
export async function registerDocs(app: FastifyInstance, env: Env): Promise<void> {
  if (env.APP_ENV === 'production') {
    return;
  }

  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Wisdom Cube API',
        version: '0.1.0',
        description: 'On-device home assistant API — cube↔app contract',
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer' },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  await app.register(swaggerUi, { routePrefix: '/docs' });
}
