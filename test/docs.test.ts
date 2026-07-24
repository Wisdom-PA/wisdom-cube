import { describe, expect, it } from 'vitest';
import { buildTestApp } from './helpers.ts';

describe('/docs gating', () => {
  it('serves the interactive UI and raw spec outside production', async () => {
    const app = await buildTestApp({ APP_ENV: 'staging' });

    const ui = await app.inject({ method: 'GET', url: '/docs' });
    expect([200, 302]).toContain(ui.statusCode);

    const spec = await app.inject({ method: 'GET', url: '/docs/json' });
    expect(spec.statusCode).toBe(200);
    const body = spec.json();
    expect(body.openapi).toMatch(/^3\./);
    expect(Object.keys(body.paths)).toEqual(
      expect.arrayContaining(['/health', '/status', '/config', '/devices', '/profiles', '/routines', '/logs', '/chat'])
    );
    await app.close();
  });

  it('documents the error envelope in the spec', async () => {
    const app = await buildTestApp();
    const spec = (await app.inject({ method: 'GET', url: '/docs/json' })).json();
    const notFound = spec.paths['/profiles/{profileId}'].get.responses['404'];
    expect(notFound).toBeDefined();
    await app.close();
  });

  it('is absent in production (404 envelope)', async () => {
    const app = await buildTestApp({ APP_ENV: 'production' });
    for (const url of ['/docs', '/docs/json']) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('NOT_FOUND');
    }
    await app.close();
  });
});
