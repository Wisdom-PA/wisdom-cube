import type { FastifyReply, FastifyRequest } from 'fastify';
import { describe, expect, it } from 'vitest';
import { UnauthorizedError } from '../src/errors.ts';
import { buildAuthenticate } from '../src/plugins/auth.ts';

const authenticate = buildAuthenticate('secret-token-123');

function requestWith(authorization?: string): FastifyRequest {
  return { headers: authorization ? { authorization } : {} } as FastifyRequest;
}

const reply = {} as FastifyReply;

describe('buildAuthenticate', () => {
  it('rejects a missing Authorization header', async () => {
    await expect(authenticate(requestWith(), reply)).rejects.toThrow(UnauthorizedError);
  });

  it('rejects a non-Bearer scheme', async () => {
    await expect(authenticate(requestWith('Basic abc'), reply)).rejects.toThrow(UnauthorizedError);
  });

  it('rejects a wrong token of different length', async () => {
    await expect(authenticate(requestWith('Bearer nope'), reply)).rejects.toThrow(UnauthorizedError);
  });

  it('rejects a wrong token of equal length', async () => {
    await expect(authenticate(requestWith('Bearer secret-token-124'), reply)).rejects.toThrow(UnauthorizedError);
  });

  it('accepts the configured token', async () => {
    await expect(authenticate(requestWith('Bearer secret-token-123'), reply)).resolves.toBeUndefined();
  });
});
