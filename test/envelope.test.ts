import { describe, expect, it } from 'vitest';
import { errorEnvelopeSchema } from '../src/errors.ts';
import { buildTestApp } from './helpers.ts';

// The wire shape here must stay byte-identical to the Python backend's — the
// py-backend test suite asserts the same literal strings.
describe('error envelope wire shape', () => {
  it('NOT_FOUND envelope is byte-exact', async () => {
    const app = await buildTestApp();
    const id = '00000000-0000-4000-8000-000000000000';
    const res = await app.inject({
      method: 'GET',
      url: `/items/${id}`,
      headers: { 'x-request-id': 'rid-fixed' },
    });
    expect(res.statusCode).toBe(404);
    expect(res.body).toBe(`{"error":{"code":"NOT_FOUND","message":"Item ${id} not found","requestId":"rid-fixed"}}`);
    expect(() => errorEnvelopeSchema.parse(res.json())).not.toThrow();
    await app.close();
  });

  it('unknown routes return the envelope', async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: 'GET', url: '/nope', headers: { 'x-request-id': 'rid-404' } });
    expect(res.statusCode).toBe(404);
    expect(res.body).toBe('{"error":{"code":"NOT_FOUND","message":"Route GET /nope not found","requestId":"rid-404"}}');
    await app.close();
  });

  it('unhandled errors return INTERNAL and never leak internals', async () => {
    const app = await buildTestApp({}, (a) => {
      a.get('/boom', async () => {
        throw new Error('secret database string');
      });
    });
    const res = await app.inject({ method: 'GET', url: '/boom', headers: { 'x-request-id': 'rid-500' } });
    expect(res.statusCode).toBe(500);
    expect(res.body).toBe('{"error":{"code":"INTERNAL","message":"Internal Server Error","requestId":"rid-500"}}');
    expect(res.body).not.toContain('secret');
    await app.close();
  });
});
