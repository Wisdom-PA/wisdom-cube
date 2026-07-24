import { z } from 'zod';

export const routineTriggerSchema = z.object({
  type: z.enum(['time', 'sun_event', 'device_event', 'voice_phrase', 'presence']),
  config: z.record(z.string(), z.unknown()),
});

export const routineConditionSchema = z.object({
  type: z.enum(['time_window', 'presence', 'device_state']),
  config: z.record(z.string(), z.unknown()),
});

export const routineActionSchema = z.object({
  type: z.enum(['device_state', 'delay', 'notification']),
  config: z.record(z.string(), z.unknown()),
});

export const routineSchema = z.object({
  routineId: z.string(),
  name: z.string(),
  ownerProfileId: z.string(),
  enabled: z.boolean(),
  triggers: z.array(routineTriggerSchema),
  conditions: z.array(routineConditionSchema),
  actions: z.array(routineActionSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Routine = z.infer<typeof routineSchema>;

export const createRoutineSchema = z.object({
  name: z.string().min(1).max(200),
  ownerProfileId: z.string().min(1),
  enabled: z.boolean().default(true),
  triggers: z.array(routineTriggerSchema).min(1),
  conditions: z.array(routineConditionSchema).default([]),
  actions: z.array(routineActionSchema).min(1),
});

export type CreateRoutine = z.infer<typeof createRoutineSchema>;
