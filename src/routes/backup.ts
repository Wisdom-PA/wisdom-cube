import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { errorEnvelopeSchema } from '../errors.ts';
import {
  backupDocumentSchema,
  backupStatusSchema,
  restoreRequestSchema,
  restoreResultSchema,
} from '../schemas/backup.ts';
import type { BackupService } from '../services/backup-service.ts';

export function registerBackupRoutes(app: FastifyInstance, service: BackupService): void {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    '/backup/status',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['backup'],
        security: [{ bearerAuth: [] }],
        response: { 200: backupStatusSchema, 401: errorEnvelopeSchema },
      },
    },
    async () => service.getStatus()
  );

  routes.post(
    '/backup/trigger',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['backup'],
        security: [{ bearerAuth: [] }],
        response: { 200: backupStatusSchema, 401: errorEnvelopeSchema },
      },
    },
    async () => service.triggerBackup()
  );

  routes.get(
    '/backup/:backupId',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['backup'],
        security: [{ bearerAuth: [] }],
        params: z.object({ backupId: z.string().min(1) }),
        response: {
          200: backupDocumentSchema,
          401: errorEnvelopeSchema,
          404: errorEnvelopeSchema,
        },
      },
    },
    async (request) => service.getPayload(request.params.backupId)
  );

  routes.post(
    '/backup/restore',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['backup'],
        security: [{ bearerAuth: [] }],
        body: restoreRequestSchema,
        response: {
          200: restoreResultSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
          404: errorEnvelopeSchema,
        },
      },
    },
    async (request) => service.restore(request.body)
  );
}
