import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { errorEnvelopeSchema } from '../errors.ts';
import { deviceSchema, patchDeviceSchema } from '../schemas/device.ts';
import type { DeviceService } from '../services/device-service.ts';

export function registerDeviceRoutes(app: FastifyInstance, service: DeviceService): void {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    '/devices',
    {
      schema: {
        tags: ['devices'],
        response: { 200: z.array(deviceSchema) },
      },
    },
    async () => service.list()
  );

  routes.get(
    '/devices/:deviceId',
    {
      schema: {
        tags: ['devices'],
        params: z.object({ deviceId: z.string().min(1) }),
        response: { 200: deviceSchema, 404: errorEnvelopeSchema },
      },
    },
    async (request) => service.get(request.params.deviceId)
  );

  routes.patch(
    '/devices/:deviceId',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['devices'],
        security: [{ bearerAuth: [] }],
        params: z.object({ deviceId: z.string().min(1) }),
        body: patchDeviceSchema,
        response: {
          200: deviceSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
          404: errorEnvelopeSchema,
        },
      },
    },
    async (request) => service.patch(request.params.deviceId, request.body)
  );

  routes.delete(
    '/devices/:deviceId',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['devices'],
        security: [{ bearerAuth: [] }],
        params: z.object({ deviceId: z.string().min(1) }),
        response: { 204: z.undefined(), 401: errorEnvelopeSchema, 404: errorEnvelopeSchema },
      },
    },
    async (request, reply) => {
      await service.remove(request.params.deviceId);
      return reply.status(204).send();
    }
  );
}
