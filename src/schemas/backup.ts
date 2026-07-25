import { z } from 'zod';
import { cubeConfigSchema } from './config.ts';
import { deviceCapability } from './device.ts';
import { logActionSchema, logIntentSchema, logInternetCallSchema } from './log.ts';
import { profileSchema } from './profile.ts';
import { routineSchema } from './routine.ts';

export const BACKUP_SCHEMA_VERSION = '1.0';

/** Device catalog entry — no runtime-only fields (reachable/state). */
export const deviceCatalogSchema = z.object({
  deviceId: z.string(),
  displayName: z.string(),
  room: z.string().nullable(),
  tags: z.array(z.string()),
  capabilities: z.array(deviceCapability),
});

export type DeviceCatalogEntry = z.infer<typeof deviceCatalogSchema>;

export const backupManifestSchema = z.object({
  backupId: z.string(),
  schemaVersion: z.string(),
  createdAt: z.string(),
  cubeId: z.string(),
  backupType: z.literal('full'),
  checksum: z.string(),
});

export type BackupManifest = z.infer<typeof backupManifestSchema>;

export const backupBodySchema = z.object({
  profiles: z.array(profileSchema),
  routines: z.array(routineSchema),
  settings: cubeConfigSchema,
  memories: z.array(z.record(z.string(), z.unknown())),
  devices: z.array(deviceCatalogSchema),
  logs_intents: z.array(logIntentSchema),
  logs_actions: z.array(logActionSchema),
  logs_internet_calls: z.array(logInternetCallSchema),
});

export type BackupBody = z.infer<typeof backupBodySchema>;

export const backupDocumentSchema = backupBodySchema.extend({
  manifest: backupManifestSchema,
});

export type BackupDocument = z.infer<typeof backupDocumentSchema>;

export const backupStatusSchema = z.object({
  available: z.boolean(),
  lastBackupAt: z.string().nullable(),
  lastBackupId: z.string().nullable(),
});

export type BackupStatus = z.infer<typeof backupStatusSchema>;

export const restoreRequestSchema = z.object({
  backupId: z.string().min(1),
  mode: z.enum(['factory_reset', 'device_routine_recovery']),
  dryRun: z.boolean().default(false),
});

export type RestoreRequest = z.infer<typeof restoreRequestSchema>;

export const restoreResultSchema = z.object({
  success: z.boolean(),
  backupId: z.string(),
  mode: z.enum(['factory_reset', 'device_routine_recovery']),
  dryRun: z.boolean(),
  message: z.string(),
});

export type RestoreResult = z.infer<typeof restoreResultSchema>;
