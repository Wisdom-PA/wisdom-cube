import { z } from 'zod';

export const cubeConfigSchema = z.object({
  cubeId: z.string(),
  defaultPrivacyMode: z.enum(['paranoid', 'normal']),
  offlineModeEnabled: z.boolean(),
  timezone: z.string(),
  locale: z.string(),
  wakeWord: z.string(),
  voiceVerbosity: z.enum(['short', 'normal']),
});

export type CubeConfig = z.infer<typeof cubeConfigSchema>;

export const patchConfigSchema = z.object({
  defaultPrivacyMode: z.enum(['paranoid', 'normal']).optional(),
  offlineModeEnabled: z.boolean().optional(),
  timezone: z.string().min(1).optional(),
  locale: z.string().min(1).optional(),
  wakeWord: z.string().min(1).optional(),
  voiceVerbosity: z.enum(['short', 'normal']).optional(),
});

export type PatchConfig = z.infer<typeof patchConfigSchema>;
