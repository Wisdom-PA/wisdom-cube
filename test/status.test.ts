import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildTestApp } from './helpers.ts';

describe('GET /status', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns cube status with expected fields', async () => {
    const res = await app.inject({ method: 'GET', url: '/status' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.cubeId).toBeTypeOf('string');
    expect(body.version).toBe('0.1.0');
    expect(body.uptimeSeconds).toBeGreaterThan(0);
    expect(body.privacyMode).toBe('paranoid');
    expect(body.internetConnected).toBe(true);
    expect(body.offlineModeEnabled).toBe(false);
    expect(body.pairedDevicesCount).toBe(0);
    expect(body.profilesCount).toBe(0);
    expect(body.activeProfileId).toBeNull();
  });

  it('does not require authentication', async () => {
    const res = await app.inject({ method: 'GET', url: '/status' });
    expect(res.statusCode).toBe(200);
  });
});
