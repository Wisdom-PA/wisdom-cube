import { timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { UnauthorizedError } from '../errors.ts';

// Seeded authN/authZ boundary (stub): bearer token compared against API_TOKEN.
// Replace the token check with real verification (JWT/OIDC introspection) — the
// boundary stays the same: routes opt in EXPLICITLY via `preHandler: [app.authenticate]`,
// so every route is deliberate about whether it is protected.
export type Authenticate = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

export function buildAuthenticate(apiToken: string): Authenticate {
  return async (request, _reply) => {
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
    if (!token || !constantTimeEquals(token, apiToken)) {
      throw new UnauthorizedError();
    }
  };
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
