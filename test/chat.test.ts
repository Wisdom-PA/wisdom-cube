import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { authHeaders, buildTestApp } from './helpers.ts';

describe('POST /chat', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('requires authentication', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/chat',
      payload: { text: 'Turn on the light' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns a local stub response without internet', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/chat',
      headers: authHeaders,
      payload: { text: 'Turn on the living room lamp' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.chainId).toBeTypeOf('string');
    expect(body.reply).toContain('Turn on the living room lamp');
    expect(body.usedInternet).toBe(false);
    expect(body.privacyMode).toBe('paranoid');
    expect(body.actions).toEqual([]);
  });

  it('rejects empty text', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/chat',
      headers: authHeaders,
      payload: { text: '' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('blocks allowInternet without a profile', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/chat',
      headers: authHeaders,
      payload: { text: 'What is the weather?', allowInternet: true },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.usedInternet).toBe(false);
    expect(body.reply).toContain("couldn't reach the online service");
  });
});
