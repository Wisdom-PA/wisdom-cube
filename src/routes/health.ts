import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

const healthResponseSchema = z.object({
  status: z.literal('ok'),
  uptimeSeconds: z.number(),
});

// Mandatory /health: liveness + basic readiness in one route — this is what the
// ALB target-group health check (ECS/Fargate) hits. Add critical-dependency
// probes (DB ping, downstream reachability) here as the service grows.
export function registerHealthRoutes(app: FastifyInstance): void {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/health',
    {
      // ALB health checks must never be throttled.
      config: { rateLimit: false },
      schema: {
        tags: ['ops'],
        response: { 200: healthResponseSchema },
      },
    },
    async () => ({ status: 'ok' as const, uptimeSeconds: process.uptime() })
  );
}
