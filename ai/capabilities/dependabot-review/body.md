Review a dependabot/Renovate PR WITH the user, as their analyst. The user makes
every approval decision; this skill only surfaces things they should consider.

Scope: PRs that bump dependency versions and touch ONLY manifest + lockfile —
`package.json` + `pnpm-lock.yaml` (this repo is a pnpm workspace), or
`pyproject.toml` + `poetry.lock` under `stacks/py-backend`. If the PR ALSO
touches source code, halt and hand off to `pr-review` (plus a
`test-coverage-review-*` skill for the coverage gate).

## Role and access (read-only)

- READ-ONLY. Read files, diffs, and history via git; fetch external changelogs
  via `gh release view` and `WebFetch` (both read-only, fine to use).
- Take NO action: no editing, committing, pushing, GitHub comments, no
  `pnpm install` / `poetry add` / `pnpm audit fix`, no verdict on the PR. Your
  output is a report the user reads — write findings as analysis, never
  "I will fix…" / "let me update…".
- **Never read `node_modules/`** — no exceptions (repo standard). For API/type
  info use GitHub release notes, `CHANGELOG.md`, and compare URLs instead.

## Usage

- `/dependabot-review <commit-hash>` — review the bump commit at `<commit-hash>`.
- `/dependabot-review` (no args) — ask for the commit hash. If the current branch
  starts with `dependabot/`, offer the branch HEAD as the default.

## Pre-flight check

Confirm the commit really is a dependency bump before starting:

```bash
git show --stat <hash>                            # only manifest + lockfile changed?
git show <hash> --no-patch --format='%an <%ae>'   # author dependabot[bot] / renovate?
```

- If it touches source files, HALT: "This changes source too — use `/pr-review`."
- If the author isn't a bot, ask the user to confirm they still want this review.

## The four passes (run in order)

### Pass 1 — Enumerate the bumps (mechanical)

```bash
git show <hash> --no-patch --format=%B             # commit body: bump table + repo URLs
git diff <hash>^ <hash> -- '**/package.json'       # JS/TS direct deps (any workspace pkg)
git diff <hash>^ <hash> -- pnpm-lock.yaml          # all resolved JS/TS versions
git diff <hash>^ <hash> -- '**/pyproject.toml'     # Python direct deps
git diff <hash>^ <hash> -- '**/poetry.lock'        # all resolved Python versions
```

For each direct bump build a row:
`{ name, ecosystem (npm | pip), dep_type (dep | devDep | optional), from, to, semver_tier (patch | minor | major), repo_url }`.

- Direct deps + from/to → the manifest diff.
- Repo URLs → the dependabot commit body table (`| [pkg](url) | from | to |`).
- `semver_tier` → compute from from/to; flag if it disagrees with the dependabot
  footer's `update-type`.

Transitive changes come from the lockfile diff (Pass 3).

### Pass 2 — Per-package usage & config sensitivity

For each direct dep, grep the real source roots — NEVER `node_modules/`:

```bash
grep -rln "from '<pkg>'"     stacks/*/src stacks/*/app stacks/next-frontend 2>/dev/null
grep -rln "require('<pkg>')" stacks/*/src stacks/*/app 2>/dev/null
grep -rln "import <pkg>"     stacks/py-backend/app 2>/dev/null   # Python imports
```

For deps with `usage_count > 0`: read 1–2 representative files to capture unusual
config (`new Ajv({ coerceTypes })`, `axios.create({...})`, tracer/queue options,
a pydantic/uvicorn setting). Note which user-facing flows depend on the package.

For deps with `usage_count == 0`: mark "possibly unused — depcheck candidate" and
skip Pass 4 for them.

Output a usage map `{ pkg → { count, files, config_flags, flows } }`.

### Pass 3 — Lockfile-only hidden issues

Read the `pnpm-lock.yaml` / `poetry.lock` diff. These signals never appear in a
changelog:

- **Major bumps in transitives** — the silent killers. Even a patch direct bump
  can drag a transitive major; smoke-test the wrapping package.
- **Newly added top-level packages** — list each and why it was pulled in; flag
  optional peer deps.
- **Removed packages** — could break dynamic `require()` / late imports.
- **Hoisting / peer changes** — a package resolving to a different version for
  other callers (pnpm's strict layout makes this rarer, but check `peerDependencies`).
- **License field changes** — flag any move away from permissive (MIT/Apache-2.0/BSD).
- **Resolved-URL / integrity changes** — flag a tarball moving off
  `registry.npmjs.org` / PyPI (supply-chain smell).

### Pass 4 — API delta + actionable migration advice

For each direct dep where `usage_count > 0` AND each transitive with a major bump,
dispatch parallel subagents — one per package, max 10 concurrent. If more than 10
need deep analysis, ask the user which to prioritize.

Each subagent:

1. **Fetch upstream notes**, stopping at the first that returns substance:
   - `gh release view v<new> -R <owner>/<repo>` (and intermediate releases)
   - `WebFetch` `https://github.com/<owner>/<repo>/blob/HEAD/CHANGELOG.md`
   - `WebFetch` `https://github.com/<owner>/<repo>/compare/v<old>...v<new>`
2. **Bucket changes**: Removed / Deprecated / Behavior change / Added / Fixed.
3. **Grep the project** for usages of every API in the first three buckets, plus
   the "old pattern" any Added API replaces.
4. **Return rows**: `{ bucket, api, where (file:line), severity, why, suggested_fix, confidence }`.

**Limits:** skip Pass 4 for `usage_count == 0` and for minor/patch transitives.
If a subagent's `WebFetch` fails 3×, mark the package "manual review needed" and
continue. If the commit body lacks a repo URL, mark "manual review needed" — do
NOT guess a URL.

## Skeleton-specific smoke-test hooks

When a bump touches these areas, call out the exact test/flow to smoke:

- **HTTP framework / validation (Fastify, Zod, FastAPI, Pydantic, uvicorn)** →
  re-run the error-envelope parity tests (`test/envelope.test.ts` /
  `tests/test_envelope.py`) — the `{"error":{"code","message","requestId"}}` wire
  shape is byte-identical across TS and Python and must stay so.
- **Server / lifecycle (Fastify, uvicorn, node/signal handling)** → SIGTERM
  drain (`test/shutdown.test.ts` / `tests/test_shutdown.py`, which asserts the
  clean exit-143 drain). ECS gives ~30s before SIGKILL.
- **OpenTelemetry / OTLP exporters** → traces+metrics are always on outside
  tests; check the `/metrics` labels test and that `OTEL_SDK_DISABLED` still works.
- **OpenAPI / swagger / docs plugins** → `/docs` must stay gated off in
  production (`test/docs.test.ts` / `tests/test_docs.py`).
- **Auth / crypto (jose, bcrypt, token libs)** → the auth-boundary + constant-time
  comparison tests (`test/auth.test.ts` / `tests/test_security.py`).
- **next / react / next-intl / tailwind / storybook** → i18n check
  (`pnpm run i18n:check`), Storybook build, and the Playwright `e2e/` smokes.

## Severity decision tree

| Condition | Bucket / Severity |
| --- | --- |
| Removed API + project uses it | **Blocker (Must-fix)** |
| Removed API + project does not use it | omit |
| Deprecated API + project uses it | **Should-fix soon** |
| Behavior change + project uses affected path | **Smoke-test** |
| Major transitive bump + wrapping pkg in use | **Smoke-test** |
| New API replacing a pattern the project uses | **Opportunity** |
| Fixed upstream bug the project has a workaround for | **Opportunity** |
| Anything ambiguous / sparse changelog | mark **Low confidence**, surface anyway |

## Finding format

Each finding carries: **Severity/bucket** · **Package** (`from → to`) ·
**Location** (file:line or "project-wide") · **What changed upstream** (one
sentence + link) · **Why it matters** (concrete consequence here) · **Suggested
action** (framed as "a fix would be…", never as something you will do) ·
**Confidence** (High/Medium/Low — if Low, say what to check).

## Output template (use exactly; empty sections say "none")

```markdown
# Dependabot Review — <hash>

**Branch:** <branch> → <base>
**Scope:** <N> direct bumps (<npm>/<pip>), <M> transitive changes
**Pre-flight:** bot author confirmed, only manifest + lockfile changed
**Bottom line:** <one verdict-free sentence — e.g. "3 patch bumps, 1 major transitive worth smoke-testing">

## Blockers / Must-fix
<findings or "none">

## Should-fix soon
<findings or "none">

## Smoke-test these flows
<findings with linked code locations + the skeleton test to run, or "none">

## Risk summary
| Package | from → to | Eco | Tier | Usage | Config sensitivity | Risk | Recommended action |
| ------- | --------- | --- | ---- | ----- | ------------------ | ---- | ------------------ |

## Pre-merge conditions
<things that should be true before merge — e.g. "off-peak window if validation lib changes"; or "none">

## Manual review needed
<packages where changelog fetch failed or repo URL was missing; or "none">

---

## Opportunities (optional adoption)
<new APIs / removable workarounds — usually short; or "none">
```

## Rules

- Do NOT give an approve / request-changes verdict — the user decides.
- Do NOT skip a finding because it seems minor — list it as a Nit and let the
  user judge. Do NOT invent findings to fill space; write "none" when empty.
- Do NOT guess a repo URL — mark it "manual review needed".
- If unsure, mark it Low confidence and flag "worth double-checking" rather than
  asserting. You may draft PR-comment wording, but make clear it's for the user
  to paste, not something being posted.
- Respect the `CLAUDE.md` audit-trail policy: after the report, do NOT silently
  create or modify an audit-trail entry — ask the user first.

## After the report

Stop and wait. The user will ask follow-ups on specific findings. Do not
pre-emptively expand or re-explain unless asked.