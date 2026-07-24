import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { errorEnvelopeSchema } from '../errors.ts';
import { createRoutineSchema, routineSchema } from '../schemas/routine.ts';
import type { RoutineService } from '../services/routine-service.ts';

export function registerRoutineRoutes(app: FastifyInstance, service: RoutineService): void {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    '/routines',
    {
      schema: {
        tags: ['routines'],
        response: { 200: z.array(routineSchema) },
      },
    },
    async () => service.list()
  );

  routes.get(
    '/routines/:routineId',
    {
      schema: {
        tags: ['routines'],
        params: z.object({ routineId: z.string().min(1) }),
        response: { 200: routineSchema, 404: errorEnvelopeSchema },
      },
    },
    async (request) => service.get(request.params.routineId)
  );

  routes.post(
    '/routines',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['routines'],
        security: [{ bearerAuth: [] }],
        body: createRoutineSchema,
        response: {
          201: routineSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request, reply) => {
      const routine = await service.create(request.body);
      return reply.status(201).send(routine);
    }
  );

  routes.delete(
    '/routines/:routineId',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['routines'],
        security: [{ bearerAuth: [] }],
        params: z.object({ routineId: z.string().min(1) }),
        response: { 204: z.undefined(), 401: errorEnvelopeSchema, 404: errorEnvelopeSchema },
      },
    },
    async (request, reply) => {
      await service.remove(request.params.routineId);
      return reply.status(204).send();
    }
  );
}
