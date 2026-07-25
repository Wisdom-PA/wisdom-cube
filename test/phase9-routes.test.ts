import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InMemoryLogRepository } from '../src/repositories/log-repo.ts';
import { LogService } from '../src/services/log-service.ts';
import { authHeaders, buildTestApp } from './helpers.ts';

const seedLight = {
  deviceId: 'light-1',
  displayName: 'Lamp',
  room: 'Living Room',
  tags: [] as string[],
  capabilities: ['on_off' as const],
  reachable: true,
  state: { on: false },
};

describe('Phase 9 routes', () => {
  let app: FastifyInstance;
  let profileId: string;

  beforeEach(async () => {
    app = await buildTestApp({}, undefined, [seedLight]);
    const profile = (
      await app.inject({
        method: 'POST',
        url: '/profiles',
        headers: authHeaders,
        payload: {
          preferredName: 'Ada',
          role: 'adult',
          internetPolicy: 'ask_every_time',
        },
      })
    ).json();
    profileId = profile.profileId;
  });

  afterEach(async () => {
    await app.close();
  });

  it('grants, reads, and revokes internet session consent', async () => {
    const grant = await app.inject({
      method: 'POST',
      url: '/internet/consent',
      headers: authHeaders,
      payload: { profileId, ttlMs: 60_000 },
    });
    expect(grant.statusCode).toBe(200);
    expect(grant.json().expiresAt).toBeTypeOf('string');

    const status = await app.inject({
      method: 'GET',
      url: `/internet/consent/${profileId}`,
      headers: authHeaders,
    });
    expect(status.statusCode).toBe(200);
    expect(status.json()).toMatchObject({ active: true });

    const revoke = await app.inject({
      method: 'DELETE',
      url: `/internet/consent/${profileId}`,
      headers: authHeaders,
    });
    expect(revoke.statusCode).toBe(204);

    const after = await app.inject({
      method: 'GET',
      url: `/internet/consent/${profileId}`,
      headers: authHeaders,
    });
    expect(after.json()).toEqual({ active: false, expiresAt: null });
  });

  it('runs a routine and returns history', async () => {
    const created = (
      await app.inject({
        method: 'POST',
        url: '/routines',
        headers: authHeaders,
        payload: {
          name: 'Movie',
          ownerProfileId: profileId,
          triggers: [{ type: 'voice_phrase', config: { phrase: 'movie' } }],
          actions: [
            { type: 'device_state', config: { deviceId: 'light-1', on: true } },
            { type: 'notification', config: { message: 'done' } },
          ],
        },
      })
    ).json();

    const run = await app.inject({
      method: 'POST',
      url: `/routines/${created.routineId}/run`,
      headers: authHeaders,
      payload: { profileId },
    });
    expect(run.statusCode).toBe(200);
    const body = run.json();
    expect(body.chainId).toBeTypeOf('string');
    expect(body.results).toHaveLength(2);
    expect(body.results.every((r: { result: string }) => r.result === 'success')).toBe(true);

    const device = await app.inject({ method: 'GET', url: '/devices/light-1' });
    expect(device.json().state.on).toBe(true);

    const history = await app.inject({
      method: 'GET',
      url: `/routines/${created.routineId}/history?limit=5`,
      headers: authHeaders,
    });
    expect(history.statusCode).toBe(200);
    expect(history.json()).toHaveLength(1);
  });

  it('allows chat internet when profile consents via allowInternet', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/chat',
      headers: authHeaders,
      payload: {
        text: 'What is the weather?',
        profileId,
        allowInternet: true,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.usedInternet).toBe(true);
    expect(body.reply).toContain('Online (mock)');
    expect(body.privacyMode).toBe('normal');
  });

  it('blocks chat internet without consent', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/chat',
      headers: authHeaders,
      payload: {
        text: 'What is the weather?',
        profileId,
        allowInternet: false,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.usedInternet).toBe(false);
    expect(body.reply).toContain("couldn't reach the online service");
  });

  it('blocks chat internet when offline mode is on', async () => {
    await app.inject({
      method: 'PATCH',
      url: '/config',
      headers: authHeaders,
      payload: { offlineModeEnabled: true },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/chat',
      headers: authHeaders,
      payload: {
        text: 'search the news',
        profileId,
        allowInternet: true,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().reply).toContain('Online access is turned off');
    expect(res.json().usedInternet).toBe(false);
  });
});

describe('LogService.rotate', () => {
  it('purges chains older than retention', async () => {
    const repo = new InMemoryLogRepository();
    const service = new LogService(repo);

    await repo.appendChain({
      chainId: 'old',
      deviceId: 'd1',
      chainStartTs: '2020-01-01T00:00:00.000Z',
      chainEndTs: '2020-01-01T00:01:00.000Z',
      initialProfileId: null,
      identifiedAtTs: null,
      identifiedProfileId: null,
      privacyModeChanges: [],
    });
    await repo.appendIntent({
      chainId: 'old',
      intentIndex: 0,
      ts: '2020-01-01T00:00:00.000Z',
      utterance: 'old',
      type: 'chat',
      targets: [],
      parameters: {},
      profileId: null,
    });
    await repo.appendAction({
      chainId: 'old',
      actionIndex: 0,
      intentIndex: 0,
      ts: '2020-01-01T00:00:00.000Z',
      deviceId: 'd1',
      beforeState: {},
      afterState: {},
      result: 'success',
      errorMessage: null,
    });
    await repo.appendInternetCall({
      chainId: 'old',
      callIndex: 0,
      ts: '2020-01-01T00:00:00.000Z',
      deviceId: 'd1',
      profileId: null,
      summary: 'old call',
      serviceCategory: 'cloud_llm',
      endpoint: 'mock://cloud-llm',
      result: 'allowed',
      errorMessage: null,
    });

    await service.startChain('fresh', 'd1', null);
    const purged = await service.rotate(7);
    expect(purged).toBe(1);
    await expect(service.getChain('old')).rejects.toThrow(/not found/);
    const fresh = await service.getChain('fresh');
    expect(fresh.chain.chainId).toBe('fresh');
  });

  it('filters log queries by from/to/profile/device', async () => {
    const repo = new InMemoryLogRepository();
    await repo.appendChain({
      chainId: 'a',
      deviceId: 'dev-a',
      chainStartTs: '2026-01-01T00:00:00.000Z',
      chainEndTs: null,
      initialProfileId: 'p-a',
      identifiedAtTs: null,
      identifiedProfileId: null,
      privacyModeChanges: [],
    });
    await repo.appendChain({
      chainId: 'b',
      deviceId: 'dev-b',
      chainStartTs: '2026-06-01T00:00:00.000Z',
      chainEndTs: null,
      initialProfileId: 'p-b',
      identifiedAtTs: '2026-06-01T00:00:01.000Z',
      identifiedProfileId: 'p-b',
      privacyModeChanges: [],
    });

    const byFrom = await repo.query({ from: '2026-05-01T00:00:00.000Z', limit: 50, offset: 0 });
    expect(byFrom.map((e) => e.chain.chainId)).toEqual(['b']);

    const byTo = await repo.query({ to: '2026-02-01T00:00:00.000Z', limit: 50, offset: 0 });
    expect(byTo.map((e) => e.chain.chainId)).toEqual(['a']);

    const byProfile = await repo.query({ profileId: 'p-b', limit: 50, offset: 0 });
    expect(byProfile).toHaveLength(1);

    const byDevice = await repo.query({ deviceId: 'dev-a', limit: 50, offset: 0 });
    expect(byDevice).toHaveLength(1);

    await repo.appendChain({
      chainId: 'c',
      deviceId: 'dev-c',
      chainStartTs: '2026-06-01T00:00:00.000Z',
      chainEndTs: null,
      initialProfileId: null,
      identifiedAtTs: null,
      identifiedProfileId: 'p-b',
      privacyModeChanges: [],
    });
    const byIdentified = await repo.query({ profileId: 'p-b', limit: 50, offset: 0 });
    expect(byIdentified.length).toBeGreaterThanOrEqual(2);
  });
});
