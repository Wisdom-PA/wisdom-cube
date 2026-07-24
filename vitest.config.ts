import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Process-level bootstrap is exercised by test/shutdown.test.ts in a child
      // process (not instrumentable by v8 coverage in-process). The optional DB
      // module (init --db) is integration code needing a live database — it is
      // exercised against real Postgres, not unit-mocked.
      exclude: ['src/server.ts', 'src/otel.ts', 'src/db/**', 'src/repositories/*.drizzle.ts'],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});
