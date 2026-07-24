import { describe, expect, it } from 'vitest';
import { authHeaders, buildTestApp } from './helpers.ts';

describe('security baseline', () => {
  it('sets security headers on every response', async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
    await app.close();
  });

  it('enables CSP only in production (swagger-ui needs inline scripts elsewhere)', async () => {
    const prod = await buildTestApp({ APP_ENV: 'production' });
    expect((await prod.inject({ url: '/health' })).headers['content-security-policy']).toBeDefined();
    await prod.close();

    const dev = await buildTestApp();
    expect((await dev.inject({ url: '/health' })).headers['content-security-policy']).toBeUndefined();
    await dev.close();
  });

  it('rate limits with the envelope shape and a 429', async () => {
    const app = await buildTestApp({ RATE_LIMIT_MAX_PER_MINUTE: 3 });
    for (let i = 0; i < 3; i += 1) {
      expect((await app.inject({ url: '/items' })).statusCode).toBe(200);
    }
    const limited = await app.inject({ url: '/items', headers: { 'x-request-id': 'rid-429' } });
    expect(limited.statusCode).toBe(429);
    const body = limited.json();
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(body.error.requestId).toBe('rid-429');
    await app.close();
  });

  it('never rate limits /health (ALB health checks)', async () => {
    const app = await buildTestApp({ RATE_LIMIT_MAX_PER_MINUTE: 2 });
    for (let i = 0; i < 10; i += 1) {
      expect((await app.inject({ url: '/health' })).statusCode).toBe(200);
    }
    await app.close();
  });

  it('rejects oversized bodies with the envelope shape and a 413', async () => {
    const app = await buildTestApp({ BODY_LIMIT_BYTES: 256 });
    const res = await app.inject({
      method: 'POST',
      url: '/items',
      headers: { ...authHeaders, 'x-request-id': 'rid-413' },
      payload: { name: 'x'.repeat(500) },
    });
    expect(res.statusCode).toBe(413);
    expect(res.json().error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(res.json().error.requestId).toBe('rid-413');
    await app.close();
  });
});
