Judge whether a change to the **TypeScript (Fastify) backend** carries adequate,
behavior-asserting tests. Be STRICTLY READ-ONLY: never edit files; never stage,
commit, or push; never run the app, migrations, or `pnpm run test` against a live
service. Your only output is a clear verdict the author can act on.

This repo does NOT use a `tests/unit | tests/integration | tests/e2e` folder
pyramid. It uses **Vitest** (Jest-compatible API) in a single flat `test/` dir
with tests colocated by concern, **mockable repository layers** so services test
without a live DB, and a hard **≥90% global coverage gate** (`vitest.config.ts`
thresholds fail the run). Judge against THAT model, not a folder taxonomy.

> **Scope & related skills.** This skill judges test adequacy for the
> `ts-backend` stack only. For the Python backend use `test-coverage-review-py`;
> for the frontend use `test-coverage-review-fe`. For broad correctness /
> project-wide impact / security use `pr-review`; for dependency-bump-only PRs
> use `dependabot-review`.

## 1. Establish the change under review

- Default to the current branch vs the main branch:
  `git fetch origin main --quiet` (best effort), then
  `git diff --stat origin/main...HEAD` for the file list and
  `git diff origin/main...HEAD` for detail. Fall back to `main...HEAD`, or to
  `staging...HEAD` if the user names staging. If the user gives a base branch, PR
  number, or commit range, use that instead.
- Bucket the changed files: production source (`src/**`), tests (`test/**`,
  including `test/helpers.ts`), and non-code (docs, `*.md`, `docs/audit-trail/**`,
  config, generated AI config).

## 2. Decide what coverage the change actually needs (apply judgment)

- **Exempt** (state why): docs-only, comments, audit-trail entries, pure
  formatting, type-only changes, config with no behaviour, generated files. If
  the WHOLE diff is exempt, the verdict is **NO COVERAGE NEEDED** — say which
  exemption applies and stop; don't force it through the coverage table.
- **Unit-level test may suffice** for a small pure helper/util with no I/O.
- **Behavioral test required** for: new/changed routes, services, repositories,
  plugins/hooks, error types, and anything touching the ops invariants below.

## 3. How this repo defines a good test (judge by nature, not folder)

- **Route → service → repository layering**: services hold the logic and are
  unit-testable with a **mocked repository** (no live DB); routes are thin
  (validate → one service call → shape response); repositories are the only
  persistence layer. A test that asserts service behaviour with a fake repo is
  the primary unit; a route test via `app.inject(...)` (see `test/items.test.ts`,
  which builds the app with `buildTestApp()` from `test/helpers.ts`) exercises the
  wired path.
- **Test behavior, not implementation**: assert on the API/service surface —
  status codes, response bodies, thrown typed errors — not internal call order.
  Snapshots are not a primary assertion.
- **Negative & guard paths**: a substantive change must cover the error/edge
  paths (missing/invalid auth, not-found, conflict, validation rejection), not
  just the happy path. `items.test.ts` models this (401 without token, 401 wrong
  token, validation errors, then the success case).

## 4. Ops-behavior tests are mandatory when their layer is touched

These are dedicated, non-optional tests. If the diff touches the relevant layer
and the matching test isn't added/updated, that's a gap:

- **Error-envelope byte-parity** (`test/envelope.test.ts`) — any change to error
  construction. The `{"error":{"code","message","requestId"}}` shape is
  byte-identical with the Python backend; if you touch it here, flag that the
  Python side and its `tests/test_envelope.py` must stay in lock-step.
- **SIGTERM drain** (`test/shutdown.test.ts`) — server lifecycle / shutdown /
  socket-reaper changes.
- **`/docs` gating** (`test/docs.test.ts`) — docs/openapi plugin changes; `/docs`
  must be off in production.
- **Metrics labels** (`test/metrics.test.ts`) — `/metrics` / OTel changes.
- **Auth boundary** (`test/auth.test.ts`, `test/security.test.ts`) — auth
  plugin / token comparison changes.
- **`/health`** (`test/health.test.ts`) — health-route changes.
- **App wiring** (`test/app.test.ts`) — plugin registration / build-app changes.
- **Env schema** (`test/env.test.ts`) — changes to `src/env.ts`.

## 5. The coverage gate

The bar is the **≥90% global threshold** in `vitest.config.ts` (statements,
branches, functions, lines) — `pnpm run test` runs `vitest run --coverage` and
fails below it. Coverage must assert **meaningful behavior**, not merely execute
lines: a test that renders/calls code with no assertion on the changed branch
does not count. Verify the added tests actually reference the changed symbols /
routes / error types.

## 6. Classify each required area PASS / MISSING / WEAK

- **PASS** — a test actually exercises the changed code or behaviour; name the
  file and the specific `it(...)`.
- **MISSING** — required for this change but absent.
- **WEAK** — a test exists but doesn't cover the changed path (happy-path only,
  no assertion on the new branch, or it doesn't touch the changed function).

## 7. Output format

**Verdict: PASS ✅ / CHANGES REQUESTED ❌ / NO COVERAGE NEEDED ⚪ (exempt)**

**Change summary** — 1–2 lines: what the diff does and the coverage it needs.
(For NO COVERAGE NEEDED, name the exemption and stop here.)

**Coverage**

| Area | Status | Evidence / gap |
|------|--------|----------------|
| Service/unit (mocked repo) | PASS / MISSING / WEAK / N/A | `test/…` — … |
| Route (app.inject) | … | … |
| Negative / guard paths | … | … |
| Ops-behavior (envelope/shutdown/docs/metrics/auth) | … | which `test/*.test.ts` |

**Required before merge** — concrete gaps: which test to add, in which file, and
what it must assert. Omit if the verdict is PASS.

**Notes** — quality flags (implementation-coupled assertions, snapshot-as-primary,
missing negative paths, envelope parity not mirrored on the Python side), or "none".

Cite file paths (and line numbers where useful). If a single area is legitimately
not needed, mark it **N/A** and explain why rather than failing the change. Give
no approve/merge decision beyond the coverage verdict — the user decides.