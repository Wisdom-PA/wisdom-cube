import { type ChildProcess, spawn } from 'node:child_process';
import type { AddressInfo } from 'node:net';
import { createServer } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { buildTestApp } from './helpers.ts';

const stackDir = fileURLToPath(new URL('..', import.meta.url));

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      server.close(() => resolve(port));
    });
  });
}

async function waitForHealthy(baseUrl: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) {
        return;
      }
    } catch {
      // not listening yet
    }
    await sleep(100);
  }
  throw new Error(`server did not become healthy within ${timeoutMs}ms`);
}

describe('graceful shutdown', () => {
  it('close() drains in-flight requests (in-process)', async () => {
    const app = await buildTestApp();
    await app.listen({ host: '127.0.0.1', port: 0 });
    const { port } = app.server.address() as AddressInfo;

    const slow = fetch(`http://127.0.0.1:${port}/status`);
    await sleep(50);
    const closing = app.close();

    const res = await slow;
    expect(res.status).toBe(200);
    await closing;
  });

  describe.skipIf(process.platform === 'win32')('SIGTERM on the real server process', () => {
    let child: ChildProcess | undefined;

    afterEach(() => {
      child?.kill('SIGKILL');
    });

    it('drains the in-flight request and exits 0 before any kill timeout', async () => {
      const port = await getFreePort();
      const baseUrl = `http://127.0.0.1:${port}`;

      // Prefer the built ESM entry so Windows/Node don't need TS strip-types,
      // and OTEL init matches production start.
      child = spawn(process.execPath, ['dist/server.js'], {
        cwd: stackDir,
        env: {
          PATH: process.env.PATH,
          NODE_ENV: 'production',
          // staging (not production): the drain test needs the delayMs
          // test-support param, which is gated OFF in production.
          APP_ENV: 'staging',
          HOST: '127.0.0.1',
          PORT: String(port),
          API_TOKEN: 'shutdown-test-token',
          LOG_LEVEL: 'silent',
          OTEL_SDK_DISABLED: 'true',
        },
        stdio: ['ignore', 'ignore', 'pipe'],
        windowsHide: true,
      });
      const stderr: string[] = [];
      child.stderr?.on('data', (chunk: Buffer) => stderr.push(chunk.toString()));
      const exited = new Promise<number | null>((resolve) => child?.on('exit', (code) => resolve(code)));

      await waitForHealthy(baseUrl, 30_000);

      // Bonus assertion while the real server is up: /docs is served in staging
      // (the production-absence case is covered by test/docs.test.ts).
      expect((await fetch(`${baseUrl}/docs/json`)).status).toBe(200);

      const slow = fetch(`${baseUrl}/status`);
      await sleep(150);
      child.kill('SIGTERM');

      const res = await slow;
      expect(res.status).toBe(200);
      const body = (await res.json()) as { version: string };
      expect(body.version).toBe('0.1.0');

      const exitCode = await exited;
      expect(exitCode, `server exited ${exitCode}; stderr:\n${stderr.join('')}`).toBe(0);
    }, 20_000);
  });
});
