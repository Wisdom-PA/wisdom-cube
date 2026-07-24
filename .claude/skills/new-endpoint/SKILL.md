---
name: new-endpoint
description: Scaffold a stack-aware backend endpoint (route → service → repository) with schema validation, typed errors, and tests, following this repo's backend-api standard.
disable-model-invocation: true
---
<!-- DO NOT EDIT — generated from ai/ by `pnpm run ai:sync` -->

Scaffold a new API endpoint following the layered backend-api standard. The
`items` resource is the reference implementation — mirror its shape exactly.

**Scope check first.** Detect which backend stack(s) exist: `stacks/ts-backend/`
and/or `stacks/py-backend/`. Scaffold the endpoint in every backend present; if
both exist, keep them contract-parallel (same operations, same error cases,
byte-identical envelope). If neither exists, STOP and say this repo has no
backend stack.

Ask (if not given): resource name; operations (list / get / create / update /
delete); and the request/response fields per operation. Auth follows the house
default — **writes (create/update/delete) are protected, reads (list/get) are
public**, mirroring the `items` reference; only ask which operations to protect
if the resource needs to deviate. If the resource already exists, EXTEND it in
place (add the new operations to the existing files) — never create a duplicate
resource.

**TypeScript (Fastify)** — create/extend, in layer order:
1. `src/repositories/<resource>-repo.ts` — interface + in-memory impl (or wire
   the real store if one exists); the only persistence layer.
2. `src/services/<resource>-service.ts` — business logic against the repository
   interface; throw typed errors from `src/errors.ts` (never build envelopes).
3. `src/routes/<resource>.ts` — thin routes: Zod schemas (body / params / query
   + response, incl. `errorEnvelopeSchema` for error statuses), one service call
   per handler. Protected routes add `preHandler: [app.authenticate]` and declare
   `security: [{ bearerAuth: [] }]`.
4. Register in `src/app.ts`, preserving the register order (docs before routes).
5. `test/<resource>.test.ts` — behavior tests via `app.inject`: happy path,
   validation 400, auth 401 (if protected), not-found 404, and conflict 409 as
   applicable.

**Python (FastAPI)** — the same five steps in `app/repositories/`,
`app/services/`, `app/routes/` (+ `app/main.py` `include_router`) and `tests/`
(`test_<resource>.py`), using Pydantic models, `Depends(require_auth)` for
protected routes, and typed errors from `app.errors`.

## Verify and report

Run the affected stack's gates and require all green at ≥90% coverage:
- TS: `pnpm run lint && pnpm run typecheck && pnpm run test && pnpm run build`.
- Py: `poetry run ruff check . && poetry run mypy . && poetry run pytest`.

Do not touch generated AI-config files. Then report to the user in markdown — no
raw tool output:
- **Lead line**: resource + operations added, and which stack(s) it landed in.
- **Files** created / extended, grouped by stack (bulleted paths).
- **Endpoints**: method + path + auth (protected / public) per operation.
- **Gates**: one PASS / FAIL line per gate (lint, typecheck, tests+coverage,
  build); on any FAIL, name what broke and stop rather than papering over it.

Scope: applies to the ts-backend + py-backend stack(s).
