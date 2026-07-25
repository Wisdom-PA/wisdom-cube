import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { authHeaders, buildTestApp } from './helpers.ts';

const sampleRoutine = {
  name: 'Movie time',
  ownerProfileId: 'profile-1',
  triggers: [{ type: 'voice_phrase' as const, config: { phrase: 'movie time' } }],
  actions: [{ type: 'device_state' as const, config: { deviceId: 'light-1', power: 'off' } }],
};

describe('routine routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('lists no routines initially', async () => {
    const res = await app.inject({ method: 'GET', url: '/routines' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it('creates a routine', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/routines',
      headers: authHeaders,
      payload: sampleRoutine,
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.name).toBe('Movie time');
    expect(body.routineId).toBeTypeOf('string');
    expect(body.enabled).toBe(true);
    expect(body.triggers).toHaveLength(1);
    expect(body.actions).toHaveLength(1);
  });

  it('fetches a routine by id', async () => {
    const created = (
      await app.inject({
        method: 'POST',
        url: '/routines',
        headers: authHeaders,
        payload: sampleRoutine,
      })
    ).json();
    const res = await app.inject({ method: 'GET', url: `/routines/${created.routineId}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe('Movie time');
  });

  it('returns 404 for unknown routine', async () => {
    const res = await app.inject({ method: 'GET', url: '/routines/nonexistent' });
    expect(res.statusCode).toBe(404);
  });

  it('deletes a routine', async () => {
    const created = (
      await app.inject({
        method: 'POST',
        url: '/routines',
        headers: authHeaders,
        payload: sampleRoutine,
      })
    ).json();
    const del = await app.inject({
      method: 'DELETE',
      url: `/routines/${created.routineId}`,
      headers: authHeaders,
    });
    expect(del.statusCode).toBe(204);
    const get = await app.inject({ method: 'GET', url: `/routines/${created.routineId}` });
    expect(get.statusCode).toBe(404);
  });

  it('requires auth for create', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/routines',
      payload: sampleRoutine,
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects routine without triggers', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/routines',
      headers: authHeaders,
      payload: { ...sampleRoutine, triggers: [] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects routine without actions', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/routines',
      headers: authHeaders,
      payload: { ...sampleRoutine, actions: [] },
    });
    expect(res.statusCode).toBe(400);
  });
});
