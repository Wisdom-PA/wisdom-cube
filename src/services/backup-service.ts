import type { BackupStatus, RestoreRequest, RestoreResult } from '../schemas/backup.ts';

export class BackupService {
  async getStatus(): Promise<BackupStatus> {
    return {
      available: false,
      lastBackupAt: null,
      lastBackupId: null,
    };
  }

  async triggerBackup(): Promise<BackupStatus> {
    return {
      available: false,
      lastBackupAt: null,
      lastBackupId: null,
    };
  }

  async restore(request: RestoreRequest): Promise<RestoreResult> {
    return {
      success: false,
      backupId: request.backupId,
      mode: request.mode,
      dryRun: request.dryRun,
      message: 'Backup/restore not yet implemented — stub response',
    };
  }
}
