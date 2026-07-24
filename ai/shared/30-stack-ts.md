# TypeScript backend (Fastify)

Layered architecture — **route → service → repository**, one direction only:

- **Routes** are thin: parse/validate input (Zod schemas via
  `fastify-type-provider-zod`), call ONE service method, shape the response.
  No business logic in routes.
- **Services** hold business logic; framework-agnostic, unit-testable without HTTP.
- **Repositories** are the only layer touching persistence. Services depend on
  the `ItemsRepository`-style interface, never a concrete store.
- Cross-cutting concerns (auth, logging, metrics) are plugins/hooks, not inlined.

Contracts and errors:

- Validate at every boundary with Zod; request/response types derive from the
  schema (no hand-typed duplicates). OpenAPI is generated from the schemas —
  never hand-written. `/docs` + `/docs/json` serve it outside production.
- Throw typed errors from `src/errors.ts` (`NotFoundError`, `ConflictError`, …).
  `buildErrorEnvelope` is the ONLY place the wire shape
  `{"error":{"code","message","requestId"}}` is constructed — it is
  byte-identical with the Python backend and tested as such.
- Auth boundary: routes opt in explicitly via `preHandler: [app.authenticate]`.

Ops invariants (never remove):

- `/health` and `/metrics` always mounted; `/docs` gated off in production.
- OTel (traces+metrics → OTLP) always on outside tests; `OTEL_SDK_DISABLED`
  is the escape hatch.
- SIGTERM drains: `forceCloseConnections: false` + the idle-socket reaper in
  `buildApp` make `app.close()` finish in-flight requests promptly — ECS gives
  ~30s (`stopTimeout`) before SIGKILL.
- Structured pino logs carry the `x-request-id` correlation id; it is echoed on
  responses and embedded in error envelopes.
