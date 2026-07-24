import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { authHeaders, buildTestApp } from './helpers.ts';

describe('config routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /config', () => {
    it('requires authentication', async () => {
      const res = await app.inject({ method: 'GET', url: '/config' });
      expect(res.statusCode).toBe(401);
    });

    it('returns config with defaults', async () => {
      const res = await app.inject({ method: 'GET', url: '/config', headers: authHeaders });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.defaultPrivacyMode).toBe('paranoid');
      expect(body.offlineModeEnabled).toBe(false);
      expect(body.timezone).toBe('UTC');
      expect(body.locale).toBe('en');
      expect(body.wakeWord).toBe('hey wisdom');
      expect(body.voiceVerbosity).toBe('normal');
    });
  });

  describe('PATCH /config', () => {
    it('requires authentication', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/config',
        payload: { timezone: 'Europe/London' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('updates specified fields', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/config',
        headers: authHeaders,
        payload: { defaultPrivacyMode: 'normal', timezone: 'Europe/London' },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.defaultPrivacyMode).toBe('normal');
      expect(body.timezone).toBe('Europe/London');
      expect(body.locale).toBe('en');
    });

    it('persists changes across requests', async () => {
      await app.inject({
        method: 'PATCH',
        url: '/config',
        headers: authHeaders,
        payload: { offlineModeEnabled: true },
      });
      const res = await app.inject({ method: 'GET', url: '/config', headers: authHeaders });
      expect(res.json().offlineModeEnabled).toBe(true);
    });

    it('rejects invalid privacy mode', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/config',
        headers: authHeaders,
        payload: { defaultPrivacyMode: 'invalid' },
      });
      expect(res.statusCode).toBe(400);
    });
  });
});
