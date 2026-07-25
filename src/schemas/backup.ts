import { z } from 'zod';

export const backupManifestSchema = z.object({
  backupId: z.string(),
  schemaVersion: z.string(),
  createdAt: z.string(),
  cubeId: z.string(),
  backupType: z.literal('full'),
});

export type BackupManifest = z.infer<typeof backupManifestSchema>;

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
