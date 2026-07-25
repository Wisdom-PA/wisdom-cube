import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { cubeStatusSchema } from '../schemas/status.ts';
import type { StatusService } from '../services/status-service.ts';

export function registerStatusRoutes(app: FastifyInstance, service: StatusService): void {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/status',
    {
      schema: {
        tags: ['cube'],
        response: { 200: cubeStatusSchema },
      },
    },
    async () => service.getStatus()
  );
}
