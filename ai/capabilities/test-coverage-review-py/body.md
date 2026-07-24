Judge whether a change to the **Python (FastAPI) backend** carries adequate,
behavior-asserting tests. Be STRICTLY READ-ONLY: never edit files; never stage,
commit, or push; never run the app, migrations, or `pytest` against a live
service. Your only output is a clear verdict the author can act on.

This repo does NOT use a `tests/unit | tests/integration | tests/e2e` folder
pyramid. It uses **pytest + pytest-cov** in a single flat `tests/` dir with a
shared `conftest.py`, **Protocol-based repository interfaces** so services test
without a live DB, and a hard **≥90% coverage gate** (`--cov-fail-under=90` in
`pyproject.toml` fails the run). Judge against THAT model, not a folder taxonomy.
All tooling runs through Poetry (`poetry run pytest`).

> **Scope & related skills.** This skill judges test adequacy for the
> `py-backend` stack only. For the TypeScript backend use
> `test-coverage-review-ts`; for the frontend use `test-coverage-review-fe`. For
> broad correctness / project-wide impact / security use `pr-review`; for
> dependency-bump-only PRs use `dependabot-review`.

## 1. Establish the change under review

- Default to the current branch vs the main branch:
  `git fetch origin main --quiet` (best effort), then
  `git diff --stat origin/main...HEAD` for the file list and
  `git diff origin/main...HEAD` for detail. Fall back to `main...HEAD`, or to
  `staging...HEAD` if the user names staging. If the user gives a base branch, PR
  number, or commit range, use that instead.
- Bucket the changed files: production source (`app/**`), tests (`tests/**`,
  including `tests/conftest.py`), and non-code (docs, `*.md`,
  `docs/audit-trail/**`, config, generated AI config).

## 2. Decide what coverage the change actually needs (apply judgment)

- **Exempt** (state why): docs-only, comments, audit-trail entries, pure
  formatting, type-only changes, config with no behaviour, generated files.
- **Unit-level test may suffice** for a small pure helper/util with no I/O.
- **Behavioral test required** for: new/changed routes, services, repositories,
  middleware/dependencies, error types, and anything touching the ops invariants
  below.

## 3. How this repo defines a good test (judge by nature, not folder)

- **Route → service → repository layering**: services hold the logic and are
  unit-testable against a **fake implementing the repository Protocol** (no live
  DB); routes are thin (validate → one service call → shape response);
  repositories are the only persistence layer. A route test uses FastAPI's
  `TestClient` via the `client` fixture from `conftest.py` (see
  `tests/test_items.py`, which imports `AUTH_HEADERS` / `UUID_RE` from
  `tests.conftest`).
- **Test behavior, not implementation**: assert on the API/service surface —
  status codes, JSON bodies, raised typed errors — not internal call order.
- **Negative & guard paths**: a substantive change must cover error/edge paths,
  not just the happy path. `tests/test_items.py` models this well (401 without
  token, 401 wrong token, non-bearer scheme rejected, and the non-ASCII-token →
  clean-401-not-500 case that guards the constant-time byte comparison).

## 4. Ops-behavior tests are mandatory when their layer is touched

Dedicated, non-optional tests. If the diff touches the layer and the matching
test isn't added/updated, that's a gap:

- **Error-envelope byte-parity** (`tests/test_envelope.py`) — any change to error
  construction. `_envelope()` in `app/main.py` is the ONLY envelope builder and
  its bytes are byte-identical with the TS backend; if you touch it, flag that the
  TS side and `test/envelope.test.ts` must stay in lock-step.
- **SIGTERM drain** (`tests/test_shutdown.py`) — lifecycle / graceful-shutdown
  changes; the test asserts the clean **exit 143** drain (uvicorn re-raises the
  signal after `timeout_graceful_shutdown`).
- **`/docs` gating** (`tests/test_docs.py`) — OpenAPI/docs changes; off in prod.
- **Metrics labels** (`tests/test_metrics.py`) — `/metrics` / OTel changes.
- **Auth boundary** (`tests/test_security.py`) — `require_auth` / constant-time
  token comparison changes.
- **`/health`** (`tests/test_health.py`) — health/liveness route changes; and
  **settings** (`tests/test_settings.py`) — changes to `app/settings.py`.

## 5. The coverage gate

The bar is **`--cov-fail-under=90`** in `pyproject.toml` — `poetry run pytest`
fails below it. Coverage must assert **meaningful behavior**, not merely execute
lines: a test that calls the changed code with no assertion on the changed
branch does not count. Verify the added tests actually reference the changed
routes / services / error types.

## 6. Classify each required area PASS / MISSING / WEAK

- **PASS** — a test actually exercises the changed code or behaviour; name the
  file and the specific `test_...` function.
- **MISSING** — required for this change but absent.
- **WEAK** — a test exists but doesn't cover the changed path (happy-path only,
  no assertion on the new branch, or it doesn't touch the changed function).

## 7. Output format

**Verdict: PASS ✅ / CHANGES REQUESTED ❌**

**Change summary** — 1–2 lines: what the diff does and the coverage it needs.

**Coverage**

| Area | Status | Evidence / gap |
|------|--------|----------------|
| Service/unit (fake repo Protocol) | PASS / MISSING / WEAK / N/A | `tests/…` — … |
| Route (TestClient) | … | … |
| Negative / guard paths | … | … |
| Ops-behavior (envelope/shutdown/docs/metrics/auth) | … | which `tests/test_*.py` |

**Required before merge** — concrete gaps: which test to add, in which file, and
what it must assert. Omit if the verdict is PASS.

**Notes** — quality flags (implementation-coupled assertions, missing negative
paths, envelope parity not mirrored on the TS side), or "none".

Cite file paths (and line numbers where useful). If an area is legitimately not
needed, mark it **N/A** and explain why rather than failing the change. Do not
give an approve/merge decision beyond the coverage verdict — the user decides.
Read-only throughout: never edit, stage, run, or commit.