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

    it('returns unavailable before any backup', async () => {
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

    it('makes a backup available', async () => {
      const res = await app.inject({ method: 'POST', url: '/backup/trigger', headers: authHeaders });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.available).toBe(true);
      expect(body.lastBackupId).toBeTruthy();
      expect(body.lastBackupAt).toBeTruthy();
    });
  });

  describe('GET /backup/:backupId', () => {
    it('requires auth', async () => {
      const res = await app.inject({ method: 'GET', url: '/backup/missing-id' });
      expect(res.statusCode).toBe(401);
    });

    it('returns 404 for unknown id', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/backup/00000000-0000-0000-0000-000000000000',
        headers: authHeaders,
      });
      expect(res.statusCode).toBe(404);
    });

    it('returns the full backup document after trigger', async () => {
      const trigger = await app.inject({ method: 'POST', url: '/backup/trigger', headers: authHeaders });
      const { lastBackupId } = trigger.json() as { lastBackupId: string };

      const res = await app.inject({
        method: 'GET',
        url: `/backup/${lastBackupId}`,
        headers: authHeaders,
      });
      expect(res.statusCode).toBe(200);
      const doc = res.json();
      expect(doc.manifest.backupId).toBe(lastBackupId);
      expect(doc.manifest.schemaVersion).toBe('1.0');
      expect(doc.manifest.backupType).toBe('full');
      expect(doc.manifest.checksum).toMatch(/^[a-f0-9]{64}$/);
      expect(doc.profiles).toEqual([]);
      expect(doc.routines).toEqual([]);
      expect(doc.memories).toEqual([]);
      expect(doc.settings.cubeId).toBeTruthy();
      expect(Array.isArray(doc.devices)).toBe(true);
      expect(Array.isArray(doc.logs_intents)).toBe(true);
      expect(Array.isArray(doc.logs_actions)).toBe(true);
      expect(Array.isArray(doc.logs_internet_calls)).toBe(true);
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

    it('returns 404 for unknown backup id', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/backup/restore',
        headers: authHeaders,
        payload: { backupId: 'missing-backup', mode: 'factory_reset' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('dry-run returns success without applying', async () => {
      await app.inject({
        method: 'POST',
        url: '/profiles',
        headers: authHeaders,
        payload: { preferredName: 'Ada', role: 'adult' },
      });
      const trigger = await app.inject({ method: 'POST', url: '/backup/trigger', headers: authHeaders });
      const { lastBackupId } = trigger.json() as { lastBackupId: string };

      const res = await app.inject({
        method: 'POST',
        url: '/backup/restore',
        headers: authHeaders,
        payload: { backupId: lastBackupId, mode: 'factory_reset', dryRun: true },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.dryRun).toBe(true);
      expect(body.message).toMatch(/Would replace/i);
    });

    it('restores profiles and settings via factory_reset', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/profiles',
        headers: authHeaders,
        payload: { preferredName: 'Ada', role: 'adult' },
      });
      const profileId = (created.json() as { profileId: string }).profileId;

      const trigger = await app.inject({ method: 'POST', url: '/backup/trigger', headers: authHeaders });
      const { lastBackupId } = trigger.json() as { lastBackupId: string };

      await app.inject({
        method: 'DELETE',
        url: `/profiles/${profileId}`,
        headers: authHeaders,
      });

      const before = await app.inject({ method: 'GET', url: '/profiles', headers: authHeaders });
      expect(before.json()).toHaveLength(0);

      const res = await app.inject({
        method: 'POST',
        url: '/backup/restore',
        headers: authHeaders,
        payload: { backupId: lastBackupId, mode: 'factory_reset', dryRun: false },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
      expect(res.json().dryRun).toBe(false);

      const after = await app.inject({ method: 'GET', url: '/profiles', headers: authHeaders });
      expect(after.json()).toHaveLength(1);
      expect(after.json()[0].profileId).toBe(profileId);
    });

    it('accepts device_routine_recovery mode', async () => {
      const trigger = await app.inject({ method: 'POST', url: '/backup/trigger', headers: authHeaders });
      const { lastBackupId } = trigger.json() as { lastBackupId: string };

      const res = await app.inject({
        method: 'POST',
        url: '/backup/restore',
        headers: authHeaders,
        payload: { backupId: lastBackupId, mode: 'device_routine_recovery', dryRun: true },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().dryRun).toBe(true);
      expect(res.json().message).toMatch(/Would merge/i);
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
