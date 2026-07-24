import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { authHeaders, buildTestApp } from './helpers.ts';

describe('log routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('requires auth for listing logs', async () => {
    const res = await app.inject({ method: 'GET', url: '/logs' });
    expect(res.statusCode).toBe(401);
  });

  it('returns empty logs initially', async () => {
    const res = await app.inject({ method: 'GET', url: '/logs', headers: authHeaders });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it('requires auth for chain lookup', async () => {
    const res = await app.inject({ method: 'GET', url: '/logs/some-chain' });
    expect(res.statusCode).toBe(401);
  });

  it('returns 404 for unknown chain', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/logs/nonexistent-chain',
      headers: authHeaders,
    });
    expect(res.statusCode).toBe(404);
  });

  it('accepts query parameters', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/logs?limit=10&offset=0',
      headers: authHeaders,
    });
    expect(res.statusCode).toBe(200);
  });

  it('rejects invalid limit', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/logs?limit=0',
      headers: authHeaders,
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects limit above cap', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/logs?limit=500',
      headers: authHeaders,
    });
    expect(res.statusCode).toBe(400);
  });
});
