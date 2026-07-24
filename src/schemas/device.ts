import { z } from 'zod';

export const deviceCapability = z.enum(['on_off', 'dimmable', 'color_temp', 'color_rgb']);
export type DeviceCapability = z.infer<typeof deviceCapability>;

export const deviceSchema = z.object({
  deviceId: z.string(),
  displayName: z.string(),
  room: z.string().nullable(),
  tags: z.array(z.string()),
  capabilities: z.array(deviceCapability),
  reachable: z.boolean(),
  state: z.record(z.string(), z.unknown()),
});

export type Device = z.infer<typeof deviceSchema>;

export const patchDeviceSchema = z.object({
  displayName: z.string().min(1).optional(),
  room: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

export type PatchDevice = z.infer<typeof patchDeviceSchema>;
