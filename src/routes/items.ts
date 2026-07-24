import { setTimeout as sleep } from 'node:timers/promises';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { errorEnvelopeSchema } from '../errors.ts';
import type { ItemsService } from '../services/items-service.ts';

// Routes stay thin: parse/validate input (Zod schemas below), call ONE service
// method, shape the response. Business logic lives in ItemsService.
export const itemSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  createdAt: z.iso.datetime(),
});

export const createItemSchema = z.object({
  name: z.string().min(1).max(200),
});

const listItemsQuerySchema = z.object({
  // Simulates slow handlers for the graceful-shutdown drain test. HONOURED ONLY
  // OUTSIDE PRODUCTION (see allowDelay below) so it can't be used as a
  // connection-holding lever against a deployed service.
  delayMs: z.coerce.number().int().min(0).max(2000).default(0),
});

export interface ItemsRouteOptions {
  /** Honour the delayMs test-support query param (false in production). */
  allowDelay: boolean;
}

export function registerItemsRoutes(
  app: FastifyInstance,
  service: ItemsService,
  { allowDelay }: ItemsRouteOptions
): void {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    '/items',
    {
      schema: {
        tags: ['items'],
        querystring: listItemsQuerySchema,
        response: { 200: z.array(itemSchema), 400: errorEnvelopeSchema },
      },
    },
    async (request) => {
      if (allowDelay && request.query.delayMs > 0) {
        await sleep(request.query.delayMs);
      }
      return service.list();
    }
  );

  routes.get(
    '/items/:id',
    {
      schema: {
        tags: ['items'],
        params: z.object({ id: z.uuid() }),
        response: { 200: itemSchema, 400: errorEnvelopeSchema, 404: errorEnvelopeSchema },
      },
    },
    // Lowercase before lookup: z.uuid() accepts uppercase, but ids are stored
    // canonical-lowercase — py-backend normalizes via UUID(), so we must too.
    async (request) => service.get(request.params.id.toLowerCase())
  );

  routes.post(
    '/items',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['items'],
        security: [{ bearerAuth: [] }],
        body: createItemSchema,
        response: {
          201: itemSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
          409: errorEnvelopeSchema,
        },
      },
    },
    async (request, reply) => {
      const item = await service.create(request.body);
      return reply.status(201).send(item);
    }
  );
}
