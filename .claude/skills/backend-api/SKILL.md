---
name: backend-api
description: "Use when creating or reviewing backend API code in this repo: route→service→repository layering, schema-first validation and OpenAPI, typed error envelope, auth boundary, and the mandatory ops routes."
---
<!-- DO NOT EDIT — generated from ai/ by `pnpm run ai:sync` -->

The layered API standard for this repo. Full rule prose lives in AGENTS.md
(§ backend sections) — this skill is the working checklist. Fastify and FastAPI
services share one shape; neither language is favored.

First decide the mode: **authoring** (creating/changing an endpoint) or
**reviewing** (auditing existing code). The layer checklist below applies to
both; the mode sections say what to do with it.

## The shape (both modes)

- Layers, one direction only: **route** (parse/validate → one service call →
  shape response) → **service** (business logic, framework-agnostic) →
  **repository** (only layer touching persistence, behind an interface/Protocol).
- Schema-first: Zod (`fastify-type-provider-zod`) / Pydantic at every boundary;
  response types derive from schemas; OpenAPI is generated, never hand-written.
- Errors: raise/throw the typed errors (`NotFoundError`, `ConflictError`, …).
  Never construct `{"error":{...}}` by hand — the envelope has exactly one
  builder per stack (`buildErrorEnvelope` / `_envelope`) and its bytes are
  contract-tested against the other language. Never leak internals in messages.
- Auth: protected routes opt in EXPLICITLY (`preHandler: [app.authenticate]` /
  `Depends(require_auth)`) and declare protection in the schema (`security`).
- Invariants that must not break: `/health` and `/metrics` always mounted;
  `/docs` + `/docs/json` gated off in production; SIGTERM drain paths (fastify
  close reaper / uvicorn graceful shutdown); env via the typed schema only, no
  secrets in code, structured logs keep the request-id correlation. The tests
  for these define the contract — keep them intact.

## Authoring

Implement against the checklist above (use `/new-endpoint` to scaffold the full
route→service→repository slice). Before declaring done, consider what the change
touches (callers, existing tests, README) per AGENTS.md, then run the gates:

- TS: `pnpm run lint && pnpm run typecheck && pnpm run test && pnpm run build`
- Py: `poetry run ruff check . && poetry run mypy . && poetry run pytest`

All green at ≥90% coverage is the definition of done. If any gate is red, stop
and report the failure — do not declare the work complete. Then report back a
short summary: files touched and each gate's pass/fail.

## Reviewing (read-only)

Walk the code against the checklist and invariants above; do NOT edit, run
builds, or commit. Report findings grouped by severity, most severe first:

- **Blocker** — broken layering, hand-built error envelope, missing auth on a
  write, a removed/weakened ops invariant, or a boundary with no schema.
- **Major** — business logic in a route, persistence outside a repository,
  hand-written OpenAPI, internals leaked in an error message, missing tests.
- **Minor** — naming, small duplication, style nits.

Give each finding a `file:line` and a one-line fix. Lead with a one-sentence
verdict; no raw tool output or scratchpad in the reply.

Scope: applies to the ts-backend + py-backend stack(s).
