import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { errorEnvelopeSchema } from '../errors.ts';
import { consentStatusSchema, grantConsentBodySchema, grantConsentResponseSchema } from '../schemas/internet.ts';
import type { InternetPermissionService } from '../services/internet-permission-service.ts';

export function registerInternetRoutes(app: FastifyInstance, service: InternetPermissionService): void {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.post(
    '/internet/consent',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['internet'],
        security: [{ bearerAuth: [] }],
        body: grantConsentBodySchema,
        response: {
          200: grantConsentResponseSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { profileId, ttlMs } = request.body;
      return service.grantSessionConsent(profileId, ttlMs);
    }
  );

  routes.get(
    '/internet/consent/:profileId',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['internet'],
        security: [{ bearerAuth: [] }],
        params: z.object({ profileId: z.string().min(1) }),
        response: {
          200: consentStatusSchema,
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const { profileId } = request.params;
      const expiresAt = service.getConsentExpiry(profileId);
      return { active: expiresAt !== null, expiresAt };
    }
  );

  routes.delete(
    '/internet/consent/:profileId',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['internet'],
        security: [{ bearerAuth: [] }],
        params: z.object({ profileId: z.string().min(1) }),
        response: {
          204: z.undefined(),
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request, reply) => {
      service.revokeSessionConsent(request.params.profileId);
      return reply.status(204).send();
    }
  );
}
