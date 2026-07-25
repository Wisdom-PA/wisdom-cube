import { describe, expect, it } from 'vitest';
import { buildTestApp } from './helpers.ts';

describe('GET /metrics', () => {
  it('exposes Prometheus request metrics', async () => {
    const app = await buildTestApp();
    await app.inject({ method: 'GET', url: '/health' });
    await app.inject({ method: 'GET', url: '/health' });

    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.body).toContain('http_requests_total{method="GET",route="/health",status_code="200"} 2');
    expect(res.body).toContain('http_request_duration_seconds_bucket');
    await app.close();
  });

  it('does not count scrapes of /metrics itself', async () => {
    const app = await buildTestApp();
    await app.inject({ method: 'GET', url: '/metrics' });
    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.body).not.toContain('route="/metrics"');
    await app.close();
  });

  it('labels unknown routes as "unmatched" (bounded cardinality)', async () => {
    const app = await buildTestApp();
    await app.inject({ method: 'GET', url: '/nope' });
    await app.inject({ method: 'GET', url: '/other-unknown' });
    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.body).toContain('route="unmatched"');
    expect(res.body).not.toContain('route="/nope"');
    await app.close();
  });

  it('counts error responses by status code', async () => {
    const app = await buildTestApp();
    await app.inject({ method: 'GET', url: '/profiles/nonexistent' });
    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.body).toContain('status_code="404"');
    await app.close();
  });
});
