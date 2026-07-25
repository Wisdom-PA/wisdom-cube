import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { authHeaders, buildTestApp } from './helpers.ts';

describe('device routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('lists no devices initially', async () => {
    const res = await app.inject({ method: 'GET', url: '/devices' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it('returns 404 for unknown device', async () => {
    const res = await app.inject({ method: 'GET', url: '/devices/nonexistent' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
  });

  it('requires auth for PATCH', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/devices/dev-001',
      payload: { displayName: 'Updated' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 404 when patching unknown device', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/devices/nonexistent',
      headers: authHeaders,
      payload: { displayName: 'Updated' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('requires auth for DELETE', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/devices/dev-001' });
    expect(res.statusCode).toBe(401);
  });

  it('returns 404 when deleting unknown device', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/devices/nonexistent',
      headers: authHeaders,
    });
    expect(res.statusCode).toBe(404);
  });
});
