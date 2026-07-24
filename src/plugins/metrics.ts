import type { FastifyInstance } from 'fastify';
import { Counter, collectDefaultMetrics, Histogram, Registry } from 'prom-client';

// Single source for the route path AND the self-scrape exclusion below — rename
// in one place only.
const METRICS_ROUTE = '/metrics';

// Mandatory /metrics route: Prometheus-style request metrics (count / latency /
// error rate derivable from status_code), complementing the OTel OTLP export.
// A per-app Registry (not the global one) keeps parallel test apps isolated.
export function registerMetrics(app: FastifyInstance): void {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry });

  const requestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [registry],
  });

  const requestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    registers: [registry],
  });

  app.addHook('onResponse', async (request, reply) => {
    const route = request.routeOptions.url ?? 'unmatched';
    if (route === METRICS_ROUTE) {
      return;
    }
    const labels = { method: request.method, route, status_code: String(reply.statusCode) };
    requestsTotal.inc(labels);
    requestDuration.observe(labels, reply.elapsedTime / 1000);
  });

  app.get(METRICS_ROUTE, async (_request, reply) => {
    return reply.type(registry.contentType).send(await registry.metrics());
  });
}
