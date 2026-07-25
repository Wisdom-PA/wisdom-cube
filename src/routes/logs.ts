import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { errorEnvelopeSchema } from '../errors.ts';
import { logEntrySchema, logQuerySchema } from '../schemas/log.ts';
import type { LogService } from '../services/log-service.ts';

export function registerLogRoutes(app: FastifyInstance, service: LogService): void {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    '/logs',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['logs'],
        security: [{ bearerAuth: [] }],
        querystring: logQuerySchema,
        response: { 200: z.array(logEntrySchema), 401: errorEnvelopeSchema },
      },
    },
    async (request) => service.query(request.query)
  );

  routes.get(
    '/logs/:chainId',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['logs'],
        security: [{ bearerAuth: [] }],
        params: z.object({ chainId: z.string().min(1) }),
        response: { 200: logEntrySchema, 401: errorEnvelopeSchema, 404: errorEnvelopeSchema },
      },
    },
    async (request) => service.getChain(request.params.chainId)
  );
}
