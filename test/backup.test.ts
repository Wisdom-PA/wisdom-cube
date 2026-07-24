import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { authHeaders, buildTestApp } from './helpers.ts';

describe('backup routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /backup/status', () => {
    it('requires auth', async () => {
      const res = await app.inject({ method: 'GET', url: '/backup/status' });
      expect(res.statusCode).toBe(401);
    });

    it('returns stub status', async () => {
      const res = await app.inject({ method: 'GET', url: '/backup/status', headers: authHeaders });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.available).toBe(false);
      expect(body.lastBackupAt).toBeNull();
      expect(body.lastBackupId).toBeNull();
    });
  });

  describe('POST /backup/trigger', () => {
    it('requires auth', async () => {
      const res = await app.inject({ method: 'POST', url: '/backup/trigger' });
      expect(res.statusCode).toBe(401);
    });

    it('returns stub response', async () => {
      const res = await app.inject({ method: 'POST', url: '/backup/trigger', headers: authHeaders });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /backup/restore', () => {
    it('requires auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/backup/restore',
        payload: { backupId: 'bk-1', mode: 'factory_reset' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns stub restore result', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/backup/restore',
        headers: authHeaders,
        payload: { backupId: 'bk-1', mode: 'factory_reset' },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.backupId).toBe('bk-1');
      expect(body.mode).toBe('factory_reset');
      expect(body.message).toContain('stub');
    });

    it('accepts device_routine_recovery mode', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/backup/restore',
        headers: authHeaders,
        payload: { backupId: 'bk-2', mode: 'device_routine_recovery', dryRun: true },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().dryRun).toBe(true);
    });

    it('rejects invalid mode', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/backup/restore',
        headers: authHeaders,
        payload: { backupId: 'bk-3', mode: 'invalid' },
      });
      expect(res.statusCode).toBe(400);
    });
  });
});
