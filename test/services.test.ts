import { describe, expect, it } from 'vitest';
import { InvalidInputError, NotFoundError } from '../src/errors.ts';
import { InMemoryConfigRepository } from '../src/repositories/config-repo.ts';
import { InMemoryDeviceRepository } from '../src/repositories/device-repo.ts';
import { InMemoryLogRepository } from '../src/repositories/log-repo.ts';
import { InMemoryProfileRepository } from '../src/repositories/profile-repo.ts';
import { InMemoryRoutineRepository } from '../src/repositories/routine-repo.ts';
import type { Device } from '../src/schemas/device.ts';
import type { ChainSummary, LogAction, LogIntent, LogInternetCall } from '../src/schemas/log.ts';
import { BackupService, computeBackupChecksum, migrateBackup } from '../src/services/backup-service.ts';
import { ChatService } from '../src/services/chat-service.ts';
import { MockCloudLlmClient } from '../src/services/cloud-llm-client.ts';
import { ConfigService } from '../src/services/config-service.ts';
import { DeviceService } from '../src/services/device-service.ts';
import { InternetPermissionService } from '../src/services/internet-permission-service.ts';
import { LogService } from '../src/services/log-service.ts';
import { PrivacyService } from '../src/services/privacy-service.ts';
import { ProfileService } from '../src/services/profile-service.ts';
import { RoutineService } from '../src/services/routine-service.ts';
import { StatusService } from '../src/services/status-service.ts';

describe('ConfigService', () => {
  it('returns default config', async () => {
    const service = new ConfigService(new InMemoryConfigRepository());
    const config = await service.get();
    expect(config.defaultPrivacyMode).toBe('paranoid');
  });

  it('patches and persists', async () => {
    const service = new ConfigService(new InMemoryConfigRepository());
    await service.patch({ timezone: 'US/Pacific' });
    const config = await service.get();
    expect(config.timezone).toBe('US/Pacific');
  });

  it('patches all config fields', async () => {
    const service = new ConfigService(new InMemoryConfigRepository());
    await service.patch({
      defaultPrivacyMode: 'normal',
      offlineModeEnabled: true,
      timezone: 'Europe/Berlin',
      locale: 'de',
      wakeWord: 'hey cube',
      voiceVerbosity: 'short',
    });
    const config = await service.get();
    expect(config.defaultPrivacyMode).toBe('normal');
    expect(config.offlineModeEnabled).toBe(true);
    expect(config.locale).toBe('de');
    expect(config.wakeWord).toBe('hey cube');
    expect(config.voiceVerbosity).toBe('short');
  });
});

describe('DeviceService', () => {
  function makeService() {
    const repo = new InMemoryDeviceRepository();
    return { service: new DeviceService(repo), repo };
  }

  const testDevice: Device = {
    deviceId: 'lamp-1',
    displayName: 'Lamp',
    room: 'bedroom',
    tags: ['lights'],
    capabilities: ['on_off', 'dimmable'],
    reachable: true,
    state: { power: 'off' },
  };

  it('lists empty', async () => {
    const { service } = makeService();
    expect(await service.list()).toEqual([]);
  });

  it('upserts and gets', async () => {
    const { service, repo } = makeService();
    await repo.upsert(testDevice);
    const device = await service.get('lamp-1');
    expect(device.displayName).toBe('Lamp');
  });

  it('throws NotFoundError for missing device', async () => {
    const { service } = makeService();
    await expect(service.get('nope')).rejects.toThrow(NotFoundError);
  });

  it('patches a device', async () => {
    const { service, repo } = makeService();
    await repo.upsert(testDevice);
    const updated = await service.patch('lamp-1', { displayName: 'New Lamp', room: null });
    expect(updated.displayName).toBe('New Lamp');
    expect(updated.room).toBeNull();
  });

  it('throws NotFoundError when patching missing device', async () => {
    const { service } = makeService();
    await expect(service.patch('nope', { displayName: 'X' })).rejects.toThrow(NotFoundError);
  });

  it('removes a device', async () => {
    const { service, repo } = makeService();
    await repo.upsert(testDevice);
    await service.remove('lamp-1');
    expect(await service.list()).toHaveLength(0);
  });

  it('throws NotFoundError when removing missing device', async () => {
    const { service } = makeService();
    await expect(service.remove('nope')).rejects.toThrow(NotFoundError);
  });

  it('patches tags', async () => {
    const { service, repo } = makeService();
    await repo.upsert(testDevice);
    const updated = await service.patch('lamp-1', { tags: ['new-tag'] });
    expect(updated.tags).toEqual(['new-tag']);
  });
});

describe('ProfileService', () => {
  function makeService() {
    return new ProfileService(new InMemoryProfileRepository());
  }

  it('creates and lists profiles', async () => {
    const service = makeService();
    await service.create({
      preferredName: 'Alice',
      role: 'adult',
      language: 'en',
      voiceVerbosity: 'normal',
      internetPolicy: 'ask_every_time',
      linkedAdults: [],
    });
    const profiles = await service.list();
    expect(profiles).toHaveLength(1);
    expect(profiles[0]?.preferredName).toBe('Alice');
  });

  it('rejects blank name', async () => {
    const service = makeService();
    await expect(
      service.create({
        preferredName: '   ',
        role: 'adult',
        language: 'en',
        voiceVerbosity: 'normal',
        internetPolicy: 'ask_every_time',
        linkedAdults: [],
      })
    ).rejects.toThrow();
  });

  it('patches a profile', async () => {
    const service = makeService();
    const created = await service.create({
      preferredName: 'Bob',
      role: 'adult',
      language: 'en',
      voiceVerbosity: 'normal',
      internetPolicy: 'ask_every_time',
      linkedAdults: [],
    });
    const updated = await service.patch(created.profileId, { language: 'cy' });
    expect(updated.language).toBe('cy');
  });

  it('removes a profile', async () => {
    const service = makeService();
    const created = await service.create({
      preferredName: 'Del',
      role: 'guest',
      language: 'en',
      voiceVerbosity: 'normal',
      internetPolicy: 'ask_every_time',
      linkedAdults: [],
    });
    await service.remove(created.profileId);
    await expect(service.get(created.profileId)).rejects.toThrow(NotFoundError);
  });

  it('rejects remove for missing profile', async () => {
    const service = makeService();
    await expect(service.remove('no-id')).rejects.toThrow(NotFoundError);
  });

  it('rejects patch for missing profile', async () => {
    const service = makeService();
    await expect(service.patch('no-id', { language: 'fr' })).rejects.toThrow(NotFoundError);
  });

  it('patches all profile fields', async () => {
    const service = makeService();
    const created = await service.create({
      preferredName: 'Pat',
      role: 'adult',
      language: 'en',
      voiceVerbosity: 'normal',
      internetPolicy: 'ask_every_time',
      linkedAdults: [],
    });
    const updated = await service.patch(created.profileId, {
      preferredName: 'Patrick',
      voiceVerbosity: 'short',
      internetPolicy: 'allowed_with_prompt',
      linkedAdults: ['adult-1'],
    });
    expect(updated.preferredName).toBe('Patrick');
    expect(updated.voiceVerbosity).toBe('short');
    expect(updated.internetPolicy).toBe('allowed_with_prompt');
    expect(updated.linkedAdults).toEqual(['adult-1']);
  });
});

describe('RoutineService', () => {
  function makeService() {
    return new RoutineService(new InMemoryRoutineRepository());
  }

  const input = {
    name: 'Bedtime',
    ownerProfileId: 'p1',
    enabled: true,
    triggers: [{ type: 'voice_phrase' as const, config: { phrase: 'bedtime' } }],
    conditions: [],
    actions: [{ type: 'device_state' as const, config: { power: 'off' } }],
  };

  it('creates and lists routines', async () => {
    const service = makeService();
    await service.create(input);
    expect(await service.list()).toHaveLength(1);
  });

  it('gets by id', async () => {
    const service = makeService();
    const created = await service.create(input);
    const fetched = await service.get(created.routineId);
    expect(fetched.name).toBe('Bedtime');
  });

  it('throws NotFoundError for missing routine', async () => {
    const service = makeService();
    await expect(service.get('nope')).rejects.toThrow(NotFoundError);
  });

  it('removes a routine', async () => {
    const service = makeService();
    const created = await service.create(input);
    await service.remove(created.routineId);
    expect(await service.list()).toHaveLength(0);
  });

  it('throws NotFoundError when removing missing routine', async () => {
    const service = makeService();
    await expect(service.remove('nope')).rejects.toThrow(NotFoundError);
  });
});

describe('LogService', () => {
  it('returns empty logs', async () => {
    const repo = new InMemoryLogRepository();
    const service = new LogService(repo);
    expect(await service.query({ limit: 10, offset: 0 })).toEqual([]);
  });

  it('throws NotFoundError for missing chain', async () => {
    const repo = new InMemoryLogRepository();
    const service = new LogService(repo);
    await expect(service.getChain('no-chain')).rejects.toThrow(NotFoundError);
  });

  it('queries logs with filters', async () => {
    const repo = new InMemoryLogRepository();
    const service = new LogService(repo);
    const chain: ChainSummary = {
      chainId: 'c1',
      deviceId: 'cube-1',
      chainStartTs: '2026-07-24T10:00:00Z',
      chainEndTs: null,
      initialProfileId: 'p1',
      identifiedAtTs: null,
      identifiedProfileId: null,
      privacyModeChanges: [],
    };
    await repo.appendChain(chain);
    const intent: LogIntent = {
      chainId: 'c1',
      intentIndex: 0,
      ts: '2026-07-24T10:00:01Z',
      utterance: 'turn on lamp',
      type: 'SetPower',
      targets: ['lamp-1'],
      parameters: { power: 'on' },
      profileId: 'p1',
    };
    await repo.appendIntent(intent);
    const action: LogAction = {
      chainId: 'c1',
      actionIndex: 0,
      intentIndex: 0,
      ts: '2026-07-24T10:00:02Z',
      deviceId: 'lamp-1',
      beforeState: { power: 'off' },
      afterState: { power: 'on' },
      result: 'success',
      errorMessage: null,
    };
    await repo.appendAction(action);
    const call: LogInternetCall = {
      chainId: 'c1',
      callIndex: 0,
      ts: '2026-07-24T10:00:03Z',
      deviceId: 'cube-1',
      profileId: 'p1',
      summary: 'weather lookup',
      serviceCategory: 'weather',
      endpoint: 'api.weather.com',
      result: 'allowed',
      errorMessage: null,
    };
    await repo.appendInternetCall(call);

    const results = await service.query({ limit: 10, offset: 0 });
    expect(results).toHaveLength(1);
    expect(results[0]?.intents).toHaveLength(1);
    expect(results[0]?.actions).toHaveLength(1);
    expect(results[0]?.internetCalls).toHaveLength(1);

    const entry = await service.getChain('c1');
    expect(entry.chain.chainId).toBe('c1');

    const byProfile = await service.query({ profileId: 'p1', limit: 10, offset: 0 });
    expect(byProfile).toHaveLength(1);

    const byDevice = await service.query({ deviceId: 'cube-1', limit: 10, offset: 0 });
    expect(byDevice).toHaveLength(1);

    const byTime = await service.query({
      from: '2026-07-24T09:00:00Z',
      to: '2026-07-24T11:00:00Z',
      limit: 10,
      offset: 0,
    });
    expect(byTime).toHaveLength(1);

    const noMatch = await service.query({ profileId: 'nobody', limit: 10, offset: 0 });
    expect(noMatch).toHaveLength(0);
  });
});

describe('StatusService', () => {
  it('aggregates status from repos', async () => {
    const configRepo = new InMemoryConfigRepository();
    const deviceRepo = new InMemoryDeviceRepository();
    const profileRepo = new InMemoryProfileRepository();
    const service = new StatusService(configRepo, deviceRepo, profileRepo);
    const status = await service.getStatus();
    expect(status.version).toBe('0.1.0');
    expect(status.pairedDevicesCount).toBe(0);
    expect(status.profilesCount).toBe(0);
  });
});

describe('BackupService', () => {
  function buildService() {
    return {
      configRepo: new InMemoryConfigRepository(),
      deviceRepo: new InMemoryDeviceRepository(),
      profileRepo: new InMemoryProfileRepository(),
      routineRepo: new InMemoryRoutineRepository(),
      logRepo: new InMemoryLogRepository(),
      service: null as unknown as BackupService,
    };
  }

  function wire() {
    const deps = buildService();
    deps.service = new BackupService(
      deps.configRepo,
      deps.deviceRepo,
      deps.profileRepo,
      deps.routineRepo,
      deps.logRepo
    );
    return deps;
  }

  function requireId(id: string | null): string {
    expect(id).toBeTruthy();
    if (!id) throw new Error('expected backup id');
    return id;
  }

  it('returns unavailable status before trigger', async () => {
    const { service } = wire();
    const status = await service.getStatus();
    expect(status.available).toBe(false);
  });

  it('trigger makes backup available and getPayload returns document', async () => {
    const { service, profileRepo } = wire();
    await profileRepo.insert({
      preferredName: 'Ada',
      role: 'adult',
      language: 'en',
      voiceVerbosity: 'normal',
      internetPolicy: 'ask_every_time',
      linkedAdults: [],
    });

    const status = await service.triggerBackup();
    expect(status.available).toBe(true);
    const backupId = requireId(status.lastBackupId);

    const doc = await service.getPayload(backupId);
    expect(doc.manifest.schemaVersion).toBe('1.0');
    expect(doc.profiles).toHaveLength(1);
    expect(doc.memories).toEqual([]);
  });

  it('dry-run restore succeeds with change summary', async () => {
    const { service } = wire();
    const status = await service.triggerBackup();
    const result = await service.restore({
      backupId: requireId(status.lastBackupId),
      mode: 'factory_reset',
      dryRun: true,
    });
    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.message).toMatch(/Would replace/i);
  });

  it('factory_reset restore reloads profiles and devices', async () => {
    const { service, profileRepo, deviceRepo } = wire();
    const profile = await profileRepo.insert({
      preferredName: 'Ada',
      role: 'adult',
      language: 'en',
      voiceVerbosity: 'normal',
      internetPolicy: 'ask_every_time',
      linkedAdults: [],
    });
    await deviceRepo.upsert({
      deviceId: 'bulb-1',
      displayName: 'Lamp',
      room: 'living',
      tags: [],
      capabilities: ['on_off'],
      reachable: true,
      state: { on: true },
    });

    const status = await service.triggerBackup();
    await profileRepo.clear();
    await deviceRepo.clear();

    const result = await service.restore({
      backupId: requireId(status.lastBackupId),
      mode: 'factory_reset',
      dryRun: false,
    });
    expect(result.success).toBe(true);

    const profiles = await profileRepo.findAll();
    expect(profiles).toHaveLength(1);
    expect(profiles[0]?.profileId).toBe(profile.profileId);

    const devices = await deviceRepo.findAll();
    expect(devices).toHaveLength(1);
    expect(devices[0]?.deviceId).toBe('bulb-1');
    expect(devices[0]?.reachable).toBe(false);
    expect(devices[0]?.state).toEqual({});
  });

  it('device_routine_recovery merges devices and routines', async () => {
    const { service, deviceRepo, routineRepo, profileRepo } = wire();
    const profile = await profileRepo.insert({
      preferredName: 'Ada',
      role: 'adult',
      language: 'en',
      voiceVerbosity: 'normal',
      internetPolicy: 'ask_every_time',
      linkedAdults: [],
    });
    await deviceRepo.upsert({
      deviceId: 'bulb-1',
      displayName: 'Old name',
      room: 'kitchen',
      tags: ['a'],
      capabilities: ['on_off'],
      reachable: true,
      state: { on: true },
    });
    const routine = await routineRepo.insert({
      name: 'Morning',
      ownerProfileId: profile.profileId,
      enabled: true,
      triggers: [{ type: 'voice_phrase', config: { phrase: 'good morning' } }],
      conditions: [],
      actions: [{ type: 'device_state', config: { deviceId: 'bulb-1', on: true } }],
    });

    const status = await service.triggerBackup();

    await deviceRepo.upsert({
      deviceId: 'bulb-1',
      displayName: 'Old name',
      room: 'kitchen',
      tags: ['a'],
      capabilities: ['on_off'],
      reachable: true,
      state: { on: false },
    });
    await deviceRepo.upsert({
      deviceId: 'bulb-2',
      displayName: 'Keep me',
      room: 'hall',
      tags: [],
      capabilities: ['on_off'],
      reachable: true,
      state: {},
    });

    const result = await service.restore({
      backupId: requireId(status.lastBackupId),
      mode: 'device_routine_recovery',
      dryRun: false,
    });
    expect(result.success).toBe(true);

    const devices = await deviceRepo.findAll();
    expect(devices.map((d) => d.deviceId).sort()).toEqual(['bulb-1', 'bulb-2']);
    const bulb1 = devices.find((d) => d.deviceId === 'bulb-1');
    expect(bulb1?.displayName).toBe('Old name');
    expect(bulb1?.state).toEqual({ on: false });

    const routines = await routineRepo.findAll();
    expect(routines.some((r) => r.routineId === routine.routineId)).toBe(true);
  });

  it('device_routine_recovery inserts missing devices from backup', async () => {
    const { service, deviceRepo } = wire();
    await deviceRepo.upsert({
      deviceId: 'bulb-new',
      displayName: 'New lamp',
      room: null,
      tags: [],
      capabilities: ['on_off'],
      reachable: true,
      state: {},
    });
    const status = await service.triggerBackup();
    await deviceRepo.clear();

    await service.restore({
      backupId: requireId(status.lastBackupId),
      mode: 'device_routine_recovery',
      dryRun: false,
    });

    const devices = await deviceRepo.findAll();
    expect(devices).toHaveLength(1);
    expect(devices[0]?.deviceId).toBe('bulb-new');
  });

  it('putBackup stores a verified document', async () => {
    const { service } = wire();
    const status = await service.triggerBackup();
    const doc = await service.getPayload(requireId(status.lastBackupId));
    const other = wire().service;
    other.putBackup(doc);
    const copied = await other.getPayload(doc.manifest.backupId);
    expect(copied.manifest.checksum).toBe(doc.manifest.checksum);
  });

  it('rejects bad checksum on restore', async () => {
    const { service } = wire();
    const status = await service.triggerBackup();
    const backupId = requireId(status.lastBackupId);
    const doc = await service.getPayload(backupId);
    service.putBackupUnchecked({
      ...doc,
      manifest: { ...doc.manifest, checksum: '0'.repeat(64) },
    });

    await expect(service.restore({ backupId, mode: 'factory_reset', dryRun: false })).rejects.toThrow(/checksum/i);
  });

  it('rejects unknown backup id with NotFoundError', async () => {
    const { service } = wire();
    await expect(service.getPayload('missing')).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.restore({ backupId: 'missing', mode: 'factory_reset', dryRun: false })).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it('migrateBackup rejects unknown major versions', async () => {
    const { service } = wire();
    const status = await service.triggerBackup();
    const doc = await service.getPayload(requireId(status.lastBackupId));
    doc.manifest.schemaVersion = '2.0';
    const { manifest: _manifest, ...body } = doc;
    doc.manifest.checksum = computeBackupChecksum(body);
    expect(() => migrateBackup(doc)).toThrow(InvalidInputError);
    expect(() => migrateBackup(doc)).toThrow(/Unsupported backup schema/);
  });
});

describe('ChatService', () => {
  it('returns stub response with privacy mode', async () => {
    const configRepo = new InMemoryConfigRepository();
    const profileRepo = new InMemoryProfileRepository();
    const logRepo = new InMemoryLogRepository();
    const service = new ChatService(
      new LogService(logRepo),
      new PrivacyService(configRepo, profileRepo),
      new ProfileService(profileRepo),
      new InternetPermissionService(configRepo, profileRepo),
      new MockCloudLlmClient()
    );
    const response = await service.send({ text: 'hello', profileId: null, allowInternet: false });
    expect(response.reply).toContain('hello');
    expect(response.privacyMode).toBe('paranoid');
    expect(response.usedInternet).toBe(false);
  });

  it('uses mock cloud LLM when internet is allowed for an adult', async () => {
    const configRepo = new InMemoryConfigRepository();
    const profileRepo = new InMemoryProfileRepository();
    const logRepo = new InMemoryLogRepository();
    const profile = await profileRepo.insert({
      preferredName: 'Adult',
      role: 'adult',
      language: 'en',
      voiceVerbosity: 'normal',
      internetPolicy: 'ask_every_time',
      linkedAdults: [],
    });
    const service = new ChatService(
      new LogService(logRepo),
      new PrivacyService(configRepo, profileRepo),
      new ProfileService(profileRepo),
      new InternetPermissionService(configRepo, profileRepo),
      new MockCloudLlmClient()
    );
    const response = await service.send({
      text: 'search the news',
      profileId: profile.profileId,
      allowInternet: true,
    });
    expect(response.usedInternet).toBe(true);
    expect(response.reply).toContain('Online (mock)');
    expect(response.privacyMode).toBe('normal');
  });

  it('allows guest internet without switching privacy mode', async () => {
    const configRepo = new InMemoryConfigRepository();
    await configRepo.patch({ defaultPrivacyMode: 'normal' });
    const profileRepo = new InMemoryProfileRepository();
    const logRepo = new InMemoryLogRepository();
    const guest = await profileRepo.insert({
      preferredName: 'Guest',
      role: 'guest',
      language: 'en',
      voiceVerbosity: 'short',
      internetPolicy: 'ask_every_time',
      linkedAdults: [],
    });
    const service = new ChatService(
      new LogService(logRepo),
      new PrivacyService(configRepo, profileRepo),
      new ProfileService(profileRepo),
      new InternetPermissionService(configRepo, profileRepo),
      new MockCloudLlmClient()
    );
    const response = await service.send({
      text: 'online weather please',
      profileId: guest.profileId,
      allowInternet: true,
    });
    expect(response.usedInternet).toBe(true);
    expect(response.privacyMode).toBe('normal');
  });
});
