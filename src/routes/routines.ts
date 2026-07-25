import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { errorEnvelopeSchema } from '../errors.ts';
import { logEntrySchema } from '../schemas/log.ts';
import {
  createRoutineSchema,
  routineExecutionResultSchema,
  routineHistoryQuerySchema,
  routineSchema,
  runRoutineBodySchema,
} from '../schemas/routine.ts';
import type { RoutineEngineService } from '../services/routine-engine-service.ts';
import type { RoutineService } from '../services/routine-service.ts';

export function registerRoutineRoutes(
  app: FastifyInstance,
  service: RoutineService,
  engine: RoutineEngineService
): void {
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

  routes.post(
    '/routines/:routineId/run',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['routines'],
        security: [{ bearerAuth: [] }],
        params: z.object({ routineId: z.string().min(1) }),
        body: runRoutineBodySchema.default({}),
        response: {
          200: routineExecutionResultSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
          404: errorEnvelopeSchema,
        },
      },
    },
    async (request) => engine.execute(request.params.routineId, { profileId: request.body.profileId })
  );

  routes.get(
    '/routines/:routineId/history',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['routines'],
        security: [{ bearerAuth: [] }],
        params: z.object({ routineId: z.string().min(1) }),
        querystring: routineHistoryQuerySchema,
        response: {
          200: z.array(logEntrySchema),
          401: errorEnvelopeSchema,
          404: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      await service.get(request.params.routineId);
      return engine.history(request.params.routineId, request.query.limit);
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
