import { z } from 'zod';

// The only place environment variables are read. Everything else receives a
// typed, validated `Env` — no raw `process.env` scattered around.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Gates /docs: mounted in development/test/staging, absent in production.
  APP_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  // Auth stub secret — replace with real authN config when wiring a provider.
  API_TOKEN: z.string().min(8),
  // Seeded edge limits — concrete defaults, tune per service.
  RATE_LIMIT_MAX_PER_MINUTE: z.coerce.number().int().min(1).default(300),
  BODY_LIMIT_BYTES: z.coerce.number().int().min(1).default(1_048_576),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(0).default(30_000),
  OTEL_SERVICE_NAME: z.string().default('ts-backend'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
  // Standard OTel escape hatch (also used by the shutdown test child process).
  OTEL_SDK_DISABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment:\n${issues}`);
  }
  return parsed.data;
}
