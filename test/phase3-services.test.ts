import { describe, expect, it } from 'vitest';
import { InMemoryConfigRepository } from '../src/repositories/config-repo.ts';
import { InMemoryDeviceRepository } from '../src/repositories/device-repo.ts';
import { InMemoryLogRepository } from '../src/repositories/log-repo.ts';
import { InMemoryProfileRepository } from '../src/repositories/profile-repo.ts';
import { DeviceService } from '../src/services/device-service.ts';
import { LogService } from '../src/services/log-service.ts';
import { PrivacyService } from '../src/services/privacy-service.ts';
import { ProfileService } from '../src/services/profile-service.ts';

describe('LogService write-path', () => {
  function makeService() {
    const repo = new InMemoryLogRepository();
    return new LogService(repo);
  }

  it('starts a chain and queries it', async () => {
    const service = makeService();
    await service.startChain('chain-1', 'dev-1', 'profile-1');

    const entry = await service.getChain('chain-1');
    expect(entry.chain.chainId).toBe('chain-1');
    expect(entry.chain.deviceId).toBe('dev-1');
    expect(entry.chain.initialProfileId).toBe('profile-1');
    expect(entry.chain.chainEndTs).toBeNull();
  });

  it('records intent into a chain', async () => {
    const service = makeService();
    await service.startChain('chain-2', 'dev-1', null);
    await service.recordIntent({
      chainId: 'chain-2',
      intentIndex: 0,
      ts: new Date().toISOString(),
      utterance: 'turn on the lights',
      type: 'device_control',
      targets: ['light-1'],
      parameters: { state: 'on' },
      profileId: null,
    });

    const entry = await service.getChain('chain-2');
    expect(entry.intents).toHaveLength(1);
    expect(entry.intents[0]?.utterance).toBe('turn on the lights');
  });

  it('records action into a chain', async () => {
    const service = makeService();
    await service.startChain('chain-3', 'dev-1', 'p-1');
    await service.recordAction({
      chainId: 'chain-3',
      actionIndex: 0,
      intentIndex: 0,
      ts: new Date().toISOString(),
      deviceId: 'light-1',
      beforeState: { on: false },
      afterState: { on: true },
      result: 'success',
      errorMessage: null,
    });

    const entry = await service.getChain('chain-3');
    expect(entry.actions).toHaveLength(1);
    expect(entry.actions[0]?.result).toBe('success');
  });

  it('records internet call into a chain', async () => {
    const service = makeService();
    await service.startChain('chain-4', 'dev-1', 'p-1');
    await service.recordInternetCall({
      chainId: 'chain-4',
      callIndex: 0,
      ts: new Date().toISOString(),
      deviceId: 'dev-1',
      profileId: 'p-1',
      summary: 'Weather query',
      serviceCategory: 'cloud_llm',
      endpoint: 'api.anthropic.com',
      result: 'allowed',
      errorMessage: null,
    });

    const entry = await service.getChain('chain-4');
    expect(entry.internetCalls).toHaveLength(1);
    expect(entry.internetCalls[0]?.serviceCategory).toBe('cloud_llm');
  });

  it('ends a chain and sets chainEndTs', async () => {
    const service = makeService();
    await service.startChain('chain-5', 'dev-1', 'p-1');
    await service.endChain('chain-5');

    const entry = await service.getChain('chain-5');
    expect(entry.chain.chainEndTs).not.toBeNull();
  });

  it('throws when ending nonexistent chain', async () => {
    const service = makeService();
    await expect(service.endChain('missing')).rejects.toThrow('not found');
  });
});

describe('DeviceService capability methods', () => {
  async function makeService() {
    const repo = new InMemoryDeviceRepository();
    const service = new DeviceService(repo);
    await repo.upsert({
      deviceId: 'light-1',
      displayName: 'Sofa Lamp',
      room: 'Living Room',
      capabilities: ['on_off', 'dimmable', 'color_temp'],
      reachable: true,
      state: { on: false },
      tags: [],
    });
    await repo.upsert({
      deviceId: 'plug-1',
      displayName: 'Desk Plug',
      room: 'Office',
      capabilities: ['on_off'],
      reachable: false,
      state: {},
      tags: [],
    });
    await repo.upsert({
      deviceId: 'light-2',
      displayName: 'Bedroom Light',
      room: 'Living Room',
      capabilities: ['on_off', 'dimmable'],
      reachable: true,
      state: { on: true },
      tags: [],
    });
    return service;
  }

  it('lists devices by room', async () => {
    const service = await makeService();
    const livingRoom = await service.listByRoom('Living Room');
    expect(livingRoom).toHaveLength(2);
    const office = await service.listByRoom('Office');
    expect(office).toHaveLength(1);
    const kitchen = await service.listByRoom('Kitchen');
    expect(kitchen).toHaveLength(0);
  });

  it('lists devices by capability', async () => {
    const service = await makeService();
    const dimmable = await service.listByCapability('dimmable');
    expect(dimmable).toHaveLength(2);
    const colorTemp = await service.listByCapability('color_temp');
    expect(colorTemp).toHaveLength(1);
    const rgb = await service.listByCapability('color_rgb');
    expect(rgb).toHaveLength(0);
  });

  it('lists reachable devices only', async () => {
    const service = await makeService();
    const reachable = await service.listReachable();
    expect(reachable).toHaveLength(2);
    expect(reachable.every((d) => d.reachable)).toBe(true);
  });

  it('requireCapability returns device when capable', async () => {
    const service = await makeService();
    const device = await service.requireCapability('light-1', 'dimmable');
    expect(device.deviceId).toBe('light-1');
  });

  it('requireCapability throws for missing capability', async () => {
    const service = await makeService();
    await expect(service.requireCapability('plug-1', 'dimmable')).rejects.toThrow('does not support');
  });

  it('requireCapability throws for missing device', async () => {
    const service = await makeService();
    await expect(service.requireCapability('nope', 'on_off')).rejects.toThrow('not found');
  });
});

describe('ProfileService permission helpers', () => {
  async function makeService() {
    const repo = new InMemoryProfileRepository();
    const service = new ProfileService(repo);

    await service.create({
      preferredName: 'Alice',
      role: 'adult',
      language: 'en',
      voiceVerbosity: 'normal',
      internetPolicy: 'allowed_with_prompt',
      linkedAdults: [],
    });
    const adults = await service.list();
    const alice = adults[0];
    if (!alice) throw new Error('Expected adult profile');
    const aliceId = alice.profileId;

    await service.create({
      preferredName: 'Sam',
      role: 'child',
      language: 'en',
      voiceVerbosity: 'normal',
      internetPolicy: 'never',
      linkedAdults: [aliceId],
    });
    const profiles = await service.list();
    const sam = profiles.find((p) => p.preferredName === 'Sam');
    if (!sam) throw new Error('Expected child profile');
    const samId = sam.profileId;

    await service.create({
      preferredName: 'Guest',
      role: 'guest',
      language: 'en',
      voiceVerbosity: 'short',
      internetPolicy: 'ask_every_time',
      linkedAdults: [],
    });

    return { service, aliceId, samId };
  }

  it('isAdult returns true for adults', async () => {
    const { service, aliceId } = await makeService();
    expect(await service.isAdult(aliceId)).toBe(true);
  });

  it('isAdult returns false for non-adults', async () => {
    const { service, samId } = await makeService();
    expect(await service.isAdult(samId)).toBe(false);
  });

  it('canModifySettings returns true for adults only', async () => {
    const { service, aliceId, samId } = await makeService();
    expect(await service.canModifySettings(aliceId)).toBe(true);
    expect(await service.canModifySettings(samId)).toBe(false);
  });

  it('canAccessInternet respects internet policy', async () => {
    const { service, aliceId, samId } = await makeService();
    expect(await service.canAccessInternet(aliceId)).toBe(true);
    expect(await service.canAccessInternet(samId)).toBe(false);
  });

  it('getLinkedAdults returns adults linked to child', async () => {
    const { service, aliceId, samId } = await makeService();
    const adults = await service.getLinkedAdults(samId);
    expect(adults).toHaveLength(1);
    expect(adults[0]?.profileId).toBe(aliceId);
  });

  it('getLinkedAdults returns empty for adults', async () => {
    const { service, aliceId } = await makeService();
    const adults = await service.getLinkedAdults(aliceId);
    expect(adults).toHaveLength(0);
  });
});

describe('PrivacyService', () => {
  async function makeService() {
    const configRepo = new InMemoryConfigRepository();
    const profileRepo = new InMemoryProfileRepository();

    const adultProfile = await profileRepo.insert({
      preferredName: 'Alice',
      role: 'adult',
      language: 'en',
      voiceVerbosity: 'normal',
      internetPolicy: 'allowed_with_prompt',
      linkedAdults: [],
    });

    const childProfile = await profileRepo.insert({
      preferredName: 'Sam',
      role: 'child',
      language: 'en',
      voiceVerbosity: 'normal',
      internetPolicy: 'never',
      linkedAdults: [adultProfile.profileId],
    });

    const service = new PrivacyService(configRepo, profileRepo);
    return { service, configRepo, adultId: adultProfile.profileId, childId: childProfile.profileId };
  }

  it('starts chain privacy from default config mode', async () => {
    const { service } = await makeService();
    const chain = await service.startChainPrivacy('chain-1');
    expect(chain.mode).toBe('paranoid');
    expect(chain.changes).toHaveLength(0);
  });

  it('gets chain privacy', async () => {
    const { service } = await makeService();
    await service.startChainPrivacy('chain-2');
    const chain = service.getChainPrivacy('chain-2');
    expect(chain).toBeDefined();
    expect(chain?.mode).toBe('paranoid');
  });

  it('returns undefined for nonexistent chain', () => {
    const configRepo = new InMemoryConfigRepository();
    const profileRepo = new InMemoryProfileRepository();
    const service = new PrivacyService(configRepo, profileRepo);
    expect(service.getChainPrivacy('missing')).toBeUndefined();
  });

  it('adult can switch from paranoid to normal', async () => {
    const { service, adultId } = await makeService();
    await service.startChainPrivacy('chain-3');
    const chain = await service.switchMode('chain-3', adultId, 'normal', 'voice');
    expect(chain.mode).toBe('normal');
    expect(chain.changes).toHaveLength(1);
    expect(chain.changes[0]?.fromMode).toBe('paranoid');
    expect(chain.changes[0]?.toMode).toBe('normal');
  });

  it('no-op when switching to same mode', async () => {
    const { service, adultId } = await makeService();
    await service.startChainPrivacy('chain-4');
    const chain = await service.switchMode('chain-4', adultId, 'paranoid', 'voice');
    expect(chain.mode).toBe('paranoid');
    expect(chain.changes).toHaveLength(0);
  });

  it('child cannot switch privacy mode', async () => {
    const { service, childId } = await makeService();
    await service.startChainPrivacy('chain-5');
    await expect(service.switchMode('chain-5', childId, 'normal', 'voice')).rejects.toThrow('Only adult profiles');
  });

  it('throws for nonexistent chain on switchMode', async () => {
    const { service, adultId } = await makeService();
    await expect(service.switchMode('nope', adultId, 'normal', 'voice')).rejects.toThrow('No active chain');
  });

  it('throws for nonexistent profile on switchMode', async () => {
    const { service } = await makeService();
    await service.startChainPrivacy('chain-6');
    await expect(service.switchMode('chain-6', 'missing', 'normal', 'voice')).rejects.toThrow('Only adult profiles');
  });

  it('grantInternetAccess switches paranoid to normal', async () => {
    const { service, adultId } = await makeService();
    await service.startChainPrivacy('chain-7');
    const chain = await service.grantInternetAccess('chain-7', adultId);
    expect(chain.mode).toBe('normal');
    expect(chain.changes[0]?.trigger).toBe('permission_grant');
  });

  it('endChainPrivacy removes active chain', async () => {
    const { service } = await makeService();
    await service.startChainPrivacy('chain-8');
    service.endChainPrivacy('chain-8');
    expect(service.getChainPrivacy('chain-8')).toBeUndefined();
  });

  it('updateDefaultMode changes global config', async () => {
    const { service, configRepo } = await makeService();
    await service.updateDefaultMode('normal');
    const config = await configRepo.get();
    expect(config.defaultPrivacyMode).toBe('normal');
  });
});
