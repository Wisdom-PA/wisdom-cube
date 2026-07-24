import { z } from 'zod';

export const cubeStatusSchema = z.object({
  cubeId: z.string(),
  version: z.string(),
  uptimeSeconds: z.number(),
  privacyMode: z.enum(['paranoid', 'normal']),
  internetConnected: z.boolean(),
  offlineModeEnabled: z.boolean(),
  pairedDevicesCount: z.number().int().min(0),
  profilesCount: z.number().int().min(0),
  activeProfileId: z.string().nullable(),
});

export type CubeStatus = z.infer<typeof cubeStatusSchema>;
