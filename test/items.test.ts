import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { authHeaders, buildTestApp } from './helpers.ts';

describe('items routes (route → service → repository)', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('lists no items initially', async () => {
    const res = await app.inject({ method: 'GET', url: '/items' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it('rejects creation without a bearer token', async () => {
    const res = await app.inject({ method: 'POST', url: '/items', payload: { name: 'Widget' } });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
  });

  it('rejects creation with a wrong token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/items',
      headers: { authorization: 'Bearer wrong-token-000000' },
      payload: { name: 'Widget' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('creates an item with a valid token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/items',
      headers: authHeaders,
      payload: { name: 'Widget' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.name).toBe('Widget');
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(Date.parse(body.createdAt)).not.toBeNaN();
  });

  it('lists created items', async () => {
    await app.inject({ method: 'POST', url: '/items', headers: authHeaders, payload: { name: 'Widget' } });
    const res = await app.inject({ method: 'GET', url: '/items' });
    expect(res.json()).toHaveLength(1);
  });

  it('fetches an item by id', async () => {
    const created = (
      await app.inject({ method: 'POST', url: '/items', headers: authHeaders, payload: { name: 'Widget' } })
    ).json();
    const res = await app.inject({ method: 'GET', url: `/items/${created.id}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(created);
  });

  it('finds an item by a non-canonical (uppercase) UUID — parity with py-backend', async () => {
    const created = (
      await app.inject({ method: 'POST', url: '/items', headers: authHeaders, payload: { name: 'Widget' } })
    ).json();
    const res = await app.inject({ method: 'GET', url: `/items/${created.id.toUpperCase()}` });
    expect(res.statusCode).toBe(200);
  });

  it('returns 404 NOT_FOUND for an unknown id', async () => {
    const res = await app.inject({ method: 'GET', url: '/items/00000000-0000-4000-8000-000000000000' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
  });

  it('returns 400 VALIDATION for a malformed id', async () => {
    const res = await app.inject({ method: 'GET', url: '/items/not-a-uuid' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION');
  });

  it('returns 400 VALIDATION for an empty name', async () => {
    const res = await app.inject({ method: 'POST', url: '/items', headers: authHeaders, payload: { name: '' } });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION');
  });

  it('returns 400 VALIDATION for a blank (whitespace) name — service-level rule', async () => {
    const res = await app.inject({ method: 'POST', url: '/items', headers: authHeaders, payload: { name: '   ' } });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION');
  });

  it('returns 409 CONFLICT for a duplicate name', async () => {
    await app.inject({ method: 'POST', url: '/items', headers: authHeaders, payload: { name: 'Widget' } });
    const res = await app.inject({ method: 'POST', url: '/items', headers: authHeaders, payload: { name: 'Widget' } });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('CONFLICT');
  });

  it('honours the capped delayMs query (async-work demo)', async () => {
    const start = Date.now();
    const res = await app.inject({ method: 'GET', url: '/items?delayMs=100' });
    expect(res.statusCode).toBe(200);
    expect(Date.now() - start).toBeGreaterThanOrEqual(90);
  });

  it('rejects a delayMs above the cap', async () => {
    const res = await app.inject({ method: 'GET', url: '/items?delayMs=5000' });
    expect(res.statusCode).toBe(400);
  });

  it('ignores delayMs in production', async () => {
    const prodApp = await buildTestApp({ APP_ENV: 'production' });
    const start = Date.now();
    const res = await prodApp.inject({ method: 'GET', url: '/items?delayMs=1500' });
    expect(res.statusCode).toBe(200);
    expect(Date.now() - start).toBeLessThan(1000);
    await prodApp.close();
  });
});
