import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { errorEnvelopeSchema } from '../errors.ts';
import { chatMessageSchema, chatResponseSchema } from '../schemas/chat.ts';
import type { ChatService } from '../services/chat-service.ts';

export function registerChatRoutes(app: FastifyInstance, service: ChatService): void {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/chat',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['chat'],
        security: [{ bearerAuth: [] }],
        body: chatMessageSchema,
        response: {
          200: chatResponseSchema,
          400: errorEnvelopeSchema,
          401: errorEnvelopeSchema,
        },
      },
    },
    async (request) => service.send(request.body)
  );
}
