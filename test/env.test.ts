import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/env.ts';

const minimal = { API_TOKEN: 'a-long-enough-token' };

describe('loadEnv', () => {
  it('applies defaults', () => {
    const env = loadEnv(minimal);
    expect(env.NODE_ENV).toBe('development');
    expect(env.APP_ENV).toBe('development');
    expect(env.HOST).toBe('0.0.0.0');
    expect(env.PORT).toBe(3000);
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.OTEL_SERVICE_NAME).toBe('ts-backend');
    expect(env.OTEL_SDK_DISABLED).toBe(false);
  });

  it('coerces numeric PORT from the string environment', () => {
    expect(loadEnv({ ...minimal, PORT: '8080' }).PORT).toBe(8080);
  });

  it('rejects an out-of-range PORT with a readable message', () => {
    expect(() => loadEnv({ ...minimal, PORT: '99999' })).toThrow(/PORT/);
  });

  it('rejects a missing API_TOKEN', () => {
    expect(() => loadEnv({})).toThrow(/API_TOKEN/);
  });

  it('rejects a too-short API_TOKEN', () => {
    expect(() => loadEnv({ API_TOKEN: 'short' })).toThrow(/API_TOKEN/);
  });

  it('rejects a non-URL OTLP endpoint', () => {
    expect(() => loadEnv({ ...minimal, OTEL_EXPORTER_OTLP_ENDPOINT: 'not a url' })).toThrow(
      /OTEL_EXPORTER_OTLP_ENDPOINT/
    );
  });

  it('parses OTEL_SDK_DISABLED=true', () => {
    expect(loadEnv({ ...minimal, OTEL_SDK_DISABLED: 'true' }).OTEL_SDK_DISABLED).toBe(true);
  });
});
