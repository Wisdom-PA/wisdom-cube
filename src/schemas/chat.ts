import { z } from 'zod';

export const chatMessageSchema = z.object({
  text: z.string().min(1).max(2000),
  profileId: z.string().nullable().default(null),
  allowInternet: z.boolean().default(false),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const chatResponseSchema = z.object({
  chainId: z.string(),
  reply: z.string(),
  usedInternet: z.boolean(),
  privacyMode: z.enum(['paranoid', 'normal']),
  actions: z.array(
    z.object({
      deviceId: z.string(),
      action: z.string(),
      result: z.enum(['success', 'failure']),
    })
  ),
});

export type ChatResponse = z.infer<typeof chatResponseSchema>;
