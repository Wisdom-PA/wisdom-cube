import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { authHeaders, buildTestApp } from './helpers.ts';

describe('profile routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('lists no profiles initially', async () => {
    const res = await app.inject({ method: 'GET', url: '/profiles' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it('creates an adult profile', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/profiles',
      headers: authHeaders,
      payload: { preferredName: 'Niall', role: 'adult' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.preferredName).toBe('Niall');
    expect(body.role).toBe('adult');
    expect(body.profileId).toBeTypeOf('string');
    expect(body.internetPolicy).toBe('ask_every_time');
  });

  it('rejects duplicate profile name', async () => {
    await app.inject({
      method: 'POST',
      url: '/profiles',
      headers: authHeaders,
      payload: { preferredName: 'Niall', role: 'adult' },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/profiles',
      headers: authHeaders,
      payload: { preferredName: 'Niall', role: 'guest' },
    });
    expect(res.statusCode).toBe(409);
  });

  it('enforces child internet policy = never', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/profiles',
      headers: authHeaders,
      payload: { preferredName: 'Child', role: 'child', internetPolicy: 'allowed_with_prompt' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION');
  });

  it('creates a child profile with default never policy', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/profiles',
      headers: authHeaders,
      payload: { preferredName: 'Kid', role: 'child', internetPolicy: 'never' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().internetPolicy).toBe('never');
  });

  it('fetches a profile by id', async () => {
    const created = (
      await app.inject({
        method: 'POST',
        url: '/profiles',
        headers: authHeaders,
        payload: { preferredName: 'Test', role: 'adult' },
      })
    ).json();
    const res = await app.inject({ method: 'GET', url: `/profiles/${created.profileId}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().preferredName).toBe('Test');
  });

  it('returns 404 for unknown profile', async () => {
    const res = await app.inject({ method: 'GET', url: '/profiles/unknown-id' });
    expect(res.statusCode).toBe(404);
  });

  it('patches a profile', async () => {
    const created = (
      await app.inject({
        method: 'POST',
        url: '/profiles',
        headers: authHeaders,
        payload: { preferredName: 'Old', role: 'adult' },
      })
    ).json();
    const res = await app.inject({
      method: 'PATCH',
      url: `/profiles/${created.profileId}`,
      headers: authHeaders,
      payload: { preferredName: 'New' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().preferredName).toBe('New');
  });

  it('rejects changing child policy away from never', async () => {
    const created = (
      await app.inject({
        method: 'POST',
        url: '/profiles',
        headers: authHeaders,
        payload: { preferredName: 'Child2', role: 'child', internetPolicy: 'never' },
      })
    ).json();
    const res = await app.inject({
      method: 'PATCH',
      url: `/profiles/${created.profileId}`,
      headers: authHeaders,
      payload: { internetPolicy: 'allowed_with_prompt' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('deletes a profile', async () => {
    const created = (
      await app.inject({
        method: 'POST',
        url: '/profiles',
        headers: authHeaders,
        payload: { preferredName: 'ToDelete', role: 'guest' },
      })
    ).json();
    const del = await app.inject({
      method: 'DELETE',
      url: `/profiles/${created.profileId}`,
      headers: authHeaders,
    });
    expect(del.statusCode).toBe(204);
    const get = await app.inject({ method: 'GET', url: `/profiles/${created.profileId}` });
    expect(get.statusCode).toBe(404);
  });

  it('requires auth for create', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/profiles',
      payload: { preferredName: 'NoAuth', role: 'adult' },
    });
    expect(res.statusCode).toBe(401);
  });
});
