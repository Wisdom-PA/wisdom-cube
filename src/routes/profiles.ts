import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { errorEnvelopeSchema } from '../errors.ts';
import { createProfileSchema, patchProfileSchema, profileSchema } from '../schemas/profile.ts';
import type { ProfileService } from '../services/profile-service.ts';

export function registerProfileRoutes(app: FastifyInstance, service: ProfileService): void {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    '/profiles',
    {
      schema: {
        tags: ['profiles'],
        response: { 200: z.array(profileSchema) },
      },
    },
    async () => service.list()
  );

  routes.get(
    '/profiles/:profileId',
    {
      schema: {
        tags: ['profiles'],
        params: z.object({ profileId: z.string().min(1) }),
        response: { 200: profileSchema, 404: errorEnvelopeSchema },
      },
    },
    async (request) => service.get(request.params.profileId)
  );

  routes.post(
    '/profiles',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['profiles'],
        security: [{ bearerAuth: [] }],
        body: createProfileSchema,
        response: {
          201: profileSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
          409: errorEnvelopeSchema,
        },
      },
    },
    async (request, reply) => {
      const profile = await service.create(request.body);
      return reply.status(201).send(profile);
    }
  );

  routes.patch(
    '/profiles/:profileId',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['profiles'],
        security: [{ bearerAuth: [] }],
        params: z.object({ profileId: z.string().min(1) }),
        body: patchProfileSchema,
        response: {
          200: profileSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
          404: errorEnvelopeSchema,
        },
      },
    },
    async (request) => service.patch(request.params.profileId, request.body)
  );

  routes.delete(
    '/profiles/:profileId',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['profiles'],
        security: [{ bearerAuth: [] }],
        params: z.object({ profileId: z.string().min(1) }),
        response: { 204: z.undefined(), 401: errorEnvelopeSchema, 404: errorEnvelopeSchema },
      },
    },
    async (request, reply) => {
      await service.remove(request.params.profileId);
      return reply.status(204).send();
    }
  );
}
