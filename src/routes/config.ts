import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { errorEnvelopeSchema } from '../errors.ts';
import { cubeConfigSchema, patchConfigSchema } from '../schemas/config.ts';
import type { ConfigService } from '../services/config-service.ts';

export function registerConfigRoutes(app: FastifyInstance, service: ConfigService): void {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    '/config',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['cube'],
        security: [{ bearerAuth: [] }],
        response: { 200: cubeConfigSchema, 401: errorEnvelopeSchema },
      },
    },
    async () => service.get()
  );

  routes.patch(
    '/config',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['cube'],
        security: [{ bearerAuth: [] }],
        body: patchConfigSchema,
        response: { 200: cubeConfigSchema, 400: errorEnvelopeSchema, 401: errorEnvelopeSchema },
      },
    },
    async (request) => service.patch(request.body)
  );
}
