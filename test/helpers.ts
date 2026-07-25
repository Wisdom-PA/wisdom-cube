import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.ts';
import { type Env, loadEnv } from '../src/env.ts';
import type { Device } from '../src/schemas/device.ts';

export const TEST_TOKEN = 'test-api-token-1234';

export function testEnv(overrides: Partial<Env> = {}): Env {
  const base = loadEnv({
    NODE_ENV: 'test',
    APP_ENV: 'test',
    API_TOKEN: TEST_TOKEN,
    LOG_LEVEL: 'silent',
  });
  return { ...base, ...overrides };
}

export async function buildTestApp(
  overrides: Partial<Env> = {},
  beforeReady?: (app: FastifyInstance) => void,
  seedDevices?: Device[]
): Promise<FastifyInstance> {
  return buildApp({
    env: testEnv(overrides),
    logger: false,
    ...(beforeReady ? { beforeReady } : {}),
    ...(seedDevices ? { seedDevices } : {}),
  });
}

export const authHeaders = { authorization: `Bearer ${TEST_TOKEN}` };
