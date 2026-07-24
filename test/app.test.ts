import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.ts';
import { testEnv } from './helpers.ts';

describe('buildApp', () => {
  it('builds with structured logging enabled (non-test env)', async () => {
    const app = await buildApp({
      env: testEnv({ NODE_ENV: 'development', LOG_LEVEL: 'silent' }),
    });
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it('reports a root-level body validation error', async () => {
    const app = await buildApp({ env: testEnv(), logger: false });
    const res = await app.inject({
      method: 'POST',
      url: '/items',
      headers: { authorization: 'Bearer test-api-token-1234', 'content-type': 'application/json' },
      payload: '"not an object"',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION');
    await app.close();
  });
});
