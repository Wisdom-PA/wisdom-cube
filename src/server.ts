import { buildApp } from './app.ts';
import { loadEnv } from './env.ts';
import { startOtel } from './otel.ts';

const env = loadEnv();
const otel = await startOtel(env);
const app = await buildApp({ env });

await app.listen({ host: env.HOST, port: env.PORT });

// Graceful shutdown (Fargate-critical): ECS sends SIGTERM, waits stopTimeout
// (default 30s, max 120s), then SIGKILL. app.close() stops accepting new
// connections and lets in-flight requests finish — the drain must stay well
// under stopTimeout or every deploy/scale-in drops requests.
let shuttingDown = false;
function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  app.log.info({ signal }, 'shutting down: draining in-flight requests');
  void (async () => {
    try {
      await app.close();
      await otel?.shutdown();
      process.exit(0);
    } catch (error) {
      app.log.error({ err: error }, 'shutdown failed');
      process.exit(1);
    }
  })();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
