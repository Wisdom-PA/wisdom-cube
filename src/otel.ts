import type { Env } from './env.ts';

export interface OtelHandle {
  shutdown(): Promise<void>;
}

// OpenTelemetry bootstrap — traces + metrics, auto-instrumented (HTTP,
// Fastify, DB clients), exported via OTLP/HTTP. On Fargate this drops straight
// into the ADOT collector sidecar; locally point OTEL_EXPORTER_OTLP_ENDPOINT at
// any OTLP backend. Always on outside tests unless OTEL_SDK_DISABLED=true.
// Imported lazily so unit tests and tooling never pay the SDK import cost.
export async function startOtel(env: Env): Promise<OtelHandle | null> {
  if (env.NODE_ENV === 'test' || env.OTEL_SDK_DISABLED) {
    return null;
  }

  const [{ NodeSDK }, { getNodeAutoInstrumentations }, { OTLPTraceExporter }, { OTLPMetricExporter }, sdkMetrics] =
    await Promise.all([
      import('@opentelemetry/sdk-node'),
      import('@opentelemetry/auto-instrumentations-node'),
      import('@opentelemetry/exporter-trace-otlp-http'),
      import('@opentelemetry/exporter-metrics-otlp-http'),
      import('@opentelemetry/sdk-metrics'),
    ]);

  const sdk = new NodeSDK({
    serviceName: env.OTEL_SERVICE_NAME,
    traceExporter: new OTLPTraceExporter(),
    metricReader: new sdkMetrics.PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(),
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();
  return sdk;
}
