import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { errorEnvelopeSchema } from '../errors.ts';
import { backupStatusSchema, restoreRequestSchema, restoreResultSchema } from '../schemas/backup.ts';
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
        },
      },
    },
    async (request) => service.restore(request.body)
  );
}
