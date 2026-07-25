import { createHash, randomUUID } from 'node:crypto';
import { InvalidInputError, NotFoundError } from '../errors.ts';
import type { ConfigRepository } from '../repositories/config-repo.ts';
import type { DeviceRepository } from '../repositories/device-repo.ts';
import type { LogRepository } from '../repositories/log-repo.ts';
import type { ProfileRepository } from '../repositories/profile-repo.ts';
import type { RoutineRepository } from '../repositories/routine-repo.ts';
import {
  BACKUP_SCHEMA_VERSION,
  type BackupBody,
  type BackupDocument,
  type BackupStatus,
  type DeviceCatalogEntry,
  type RestoreRequest,
  type RestoreResult,
} from '../schemas/backup.ts';
import type { Device } from '../schemas/device.ts';

const LOG_RETENTION_DAYS = 7;

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = sortKeys(obj[key]);
    }
    return sorted;
  }
  return value;
}

export function computeBackupChecksum(body: BackupBody): string {
  return createHash('sha256').update(canonicalJson(body)).digest('hex');
}

/** Schema migration stub: no-op for 1.x; reject unknown major versions. */
export function migrateBackup(doc: BackupDocument): BackupDocument {
  const major = doc.manifest.schemaVersion.split('.')[0];
  if (major !== '1') {
    throw new InvalidInputError(`Unsupported backup schema version: ${doc.manifest.schemaVersion}`);
  }
  return doc;
}

function toCatalogEntry(device: Device): DeviceCatalogEntry {
  return {
    deviceId: device.deviceId,
    displayName: device.displayName,
    room: device.room,
    tags: [...device.tags],
    capabilities: [...device.capabilities],
  };
}

function catalogToDevice(entry: DeviceCatalogEntry): Device {
  return {
    ...entry,
    tags: [...entry.tags],
    capabilities: [...entry.capabilities],
    reachable: false,
    state: {},
  };
}

function describeChanges(doc: BackupDocument, mode: RestoreRequest['mode']): string {
  const parts = [
    `${doc.profiles.length} profile(s)`,
    `${doc.routines.length} routine(s)`,
    'settings',
    `${doc.devices.length} device(s)`,
  ];
  if (mode === 'device_routine_recovery') {
    return `Would merge devices and routines: ${doc.devices.length} device(s), ${doc.routines.length} routine(s)`;
  }
  return `Would replace ${parts.join(', ')} (factory_reset)`;
}

export class BackupService {
  private readonly configRepo: ConfigRepository;
  private readonly deviceRepo: DeviceRepository;
  private readonly profileRepo: ProfileRepository;
  private readonly routineRepo: RoutineRepository;
  private readonly logRepo: LogRepository;
  private readonly backups = new Map<string, BackupDocument>();
  private lastBackupId: string | null = null;
  private lastBackupAt: string | null = null;

  constructor(
    configRepo: ConfigRepository,
    deviceRepo: DeviceRepository,
    profileRepo: ProfileRepository,
    routineRepo: RoutineRepository,
    logRepo: LogRepository
  ) {
    this.configRepo = configRepo;
    this.deviceRepo = deviceRepo;
    this.profileRepo = profileRepo;
    this.routineRepo = routineRepo;
    this.logRepo = logRepo;
  }

  async getStatus(): Promise<BackupStatus> {
    return {
      available: this.lastBackupId !== null,
      lastBackupAt: this.lastBackupAt,
      lastBackupId: this.lastBackupId,
    };
  }

  async triggerBackup(): Promise<BackupStatus> {
    const cutoff = new Date(Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await this.logRepo.purgeOlderThan(cutoff);

    const [config, devices, profiles, routines, intents, actions, internetCalls] = await Promise.all([
      this.configRepo.get(),
      this.deviceRepo.findAll(),
      this.profileRepo.findAll(),
      this.routineRepo.findAll(),
      this.logRepo.listIntents(),
      this.logRepo.listActions(),
      this.logRepo.listInternetCalls(),
    ]);

    const body: BackupBody = {
      profiles,
      routines,
      settings: config,
      memories: [],
      devices: devices.map(toCatalogEntry),
      logs_intents: intents,
      logs_actions: actions,
      logs_internet_calls: internetCalls,
    };

    const backupId = randomUUID();
    const createdAt = new Date().toISOString();
    const checksum = computeBackupChecksum(body);

    const document: BackupDocument = {
      manifest: {
        backupId,
        schemaVersion: BACKUP_SCHEMA_VERSION,
        createdAt,
        cubeId: config.cubeId,
        backupType: 'full',
        checksum,
      },
      ...body,
    };

    this.backups.set(backupId, document);
    this.lastBackupId = backupId;
    this.lastBackupAt = createdAt;

    return this.getStatus();
  }

  async getPayload(backupId: string): Promise<BackupDocument> {
    const doc = this.backups.get(backupId);
    if (!doc) {
      throw new NotFoundError(`Backup ${backupId} not found`);
    }
    return structuredClone(doc);
  }

  /** Inject a stored backup (tests / restore-from-app upload path later). */
  putBackup(doc: BackupDocument): void {
    const migrated = migrateBackup(doc);
    this.verifyChecksum(migrated);
    this.backups.set(migrated.manifest.backupId, structuredClone(migrated));
    this.lastBackupId = migrated.manifest.backupId;
    this.lastBackupAt = migrated.manifest.createdAt;
  }

  /** Store without checksum verify — for bad-checksum restore tests. */
  putBackupUnchecked(doc: BackupDocument): void {
    this.backups.set(doc.manifest.backupId, structuredClone(doc));
    this.lastBackupId = doc.manifest.backupId;
    this.lastBackupAt = doc.manifest.createdAt;
  }

  async restore(request: RestoreRequest): Promise<RestoreResult> {
    const stored = this.backups.get(request.backupId);
    if (!stored) {
      throw new NotFoundError(`Backup ${request.backupId} not found`);
    }

    const doc = migrateBackup(structuredClone(stored));
    this.verifyChecksum(doc);

    if (request.dryRun) {
      return {
        success: true,
        backupId: request.backupId,
        mode: request.mode,
        dryRun: true,
        message: describeChanges(doc, request.mode),
      };
    }

    if (request.mode === 'factory_reset') {
      await this.applyFactoryReset(doc);
    } else {
      await this.applyDeviceRoutineRecovery(doc);
    }

    return {
      success: true,
      backupId: request.backupId,
      mode: request.mode,
      dryRun: false,
      message: `Restore completed (${request.mode})`,
    };
  }

  private verifyChecksum(doc: BackupDocument): void {
    const { manifest, ...body } = doc;
    const expected = computeBackupChecksum(body);
    if (expected !== manifest.checksum) {
      throw new InvalidInputError('Backup checksum mismatch');
    }
  }

  private async applyFactoryReset(doc: BackupDocument): Promise<void> {
    await this.profileRepo.replaceAll(doc.profiles);
    await this.routineRepo.replaceAll(doc.routines);
    await this.configRepo.replace(doc.settings);
    await this.deviceRepo.replaceAll(doc.devices.map(catalogToDevice));
  }

  private async applyDeviceRoutineRecovery(doc: BackupDocument): Promise<void> {
    for (const entry of doc.devices) {
      const existing = await this.deviceRepo.findById(entry.deviceId);
      if (existing) {
        await this.deviceRepo.upsert({
          ...existing,
          displayName: entry.displayName,
          room: entry.room,
          tags: [...entry.tags],
          capabilities: [...entry.capabilities],
        });
      } else {
        await this.deviceRepo.upsert(catalogToDevice(entry));
      }
    }
    for (const routine of doc.routines) {
      await this.routineRepo.upsert(routine);
    }
  }
}
