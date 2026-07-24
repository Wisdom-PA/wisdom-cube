<!-- DO NOT EDIT — generated from ai/ by `pnpm run ai:sync` -->
<!-- Source of truth: ai/shared/*.md — edit there and run `pnpm run ai:sync` -->

# wisdom-cube

This repository was generated from the company skeleton (factory baseline). It
carries the house standards for its selected stack(s), a single-source AI
config (`ai/` → generated `AGENTS.md`, `.claude/`, `.cursor/`), and CI gates
that enforce both.

- Deploy target: none (on-device / LAN API gateway; not cloud Fargate by default).
- Every task runs through `pnpm run <task>` (Python tasks wrap `poetry run`).
- Branch flow: `anywhere → staging → main` (squash into staging, merge into main),
  enforced by the committed rulesets in `.github/rulesets/`.

---

# What this service does

On-device Wisdom cube: voice pipeline, local LLM/intent, smart-home control, and
the LAN API the mobile companion talks to. Product plan and tickets live in the
Wisdom docs workspace (`Plan.md`, `Tickets.md`, `GettingStarted.md`).

This clone is a **TypeScript Fastify** API-gateway scaffold from the company
skeleton (route → service → repository). The long-term on-device runtime remains
**Java** (strict OOP); migrate when the Java stack is ready. Keep the OpenAPI /
HTTP contract aligned with the app either way.

## Feature map

- api gateway — health, metrics, docs, items sample CRUD — `src/app.ts`, `src/routes/`
- _(pending)_ cube contract — status, devices, profiles, routines, logs, backup — TBD
- _(pending)_ voice / device / privacy — on-device services — TBD

---

# Conventions

## Editing rules (read this first)

- **Never hand-edit generated files**: `AGENTS.md`, `.cursor/rules/*`, and the
  generated capabilities under `.claude/skills|agents|commands`. Edit
  `ai/shared/*.md` or `ai/capabilities/<name>/` and run `pnpm run ai:sync`.
  CI fails on drift (`ai-config-drift`).
- Environment access goes through the typed schema only: `src/env.ts` (TS),
  `app/settings.py` (Python), `env.ts` (frontend). Never read raw
  `process.env` / `os.environ` elsewhere.
- No secrets in code, ever. `.env` files are git-ignored; `.env.example`
  documents every variable with safe local values.

## Style

- TS/JS: Biome is the single formatter+linter (`pnpm run lint` = `biome check`).
  Backend profile: width 120, indent 2. Frontend profile: width 100, indent 4,
  single-quote JSX, Tailwind class sorting. Named exports; no `console.log`
  in shipped code (`console.error` allowed).
- Python: Ruff formats and lints (width 120, single quotes); mypy strict.
- Naming: TS/JS is camelCase (PascalCase types/components); Python is
  snake_case (Ruff enforces). snake_case in TS only where an EXTERNAL contract
  dictates it (DB columns, third-party payloads) — and it stays at that
  boundary, mapped to camelCase before it spreads inward.
- Commits follow Conventional Commits (commitlint enforces; lefthook runs it).

## Code organisation

- Balance DRY against simplicity: three similar lines of code often beat a
  premature abstraction; don't create abstractions for one-time operations.
- If a function does too many things, split it into smaller focused functions;
  if a file passes ~300 lines, consider splitting it logically.

## Quality gates (all must pass — `/ship` runs them)

lint + format-check + typecheck + tests (**≥90% global coverage**) + build.

---

# Repo-specific rules

<!-- Rules UNIQUE to this repo — NOT house standards (those live in
     10-conventions.md and the stack files). Injected by the `project-context`
     agent from ai/context/questions.json after init; revise with the
     `update-project-context` skill. Keep this list to genuine repo-specific
     invariants (domain rules, integration constraints) — anything house-wide
     belongs in 10-conventions.md instead. -->

## Domain rules

- _None yet — run the `project-context` agent (or `/update-project-context`) to
  populate this._

---

# Working practices

## Side effects — before making changes

When modifying code, always consider what else your change touches:

- **Callers and imports** — search for usages before changing a signature;
  check what depends on the code being changed.
- **Tests** — will existing tests break; do they need updating to stay aligned
  with the implementation? If tests don't exist for what you're changing,
  create them when justified.
- **Schemas & generated docs** — request/response changes happen in the Zod /
  Pydantic schemas (validation AND OpenAPI derive from them — never edit the
  spec or validation separately).
- **README** — update it when a change adds features, configuration, or setup
  requirements.
- Run the affected gates after changes to catch unintended breakage.

## Audit trail

All non-trivial change sets are logged in `docs/audit-trail/`, one Markdown
file per related set of changes, named `YYYY-MM-DD_short-description.md`.

- **Start** a non-trivial task (multi-file change, refactor, feature) by
  creating the entry with a checklist of planned work; tick items off and add
  discovered work as you go — it gives the human visibility during the task.
- **Finish** by completing the entry; ask the user before considering the task
  complete ("ready for me to finalize the audit trail entry?"). Never silently
  skip it. If today's entry exists and is unpushed, update it instead of
  creating a new file.
- Each entry contains: date/time; the checklist; files created/updated/deleted;
  a summary of what changed and why; side effects considered; issues spotted
  during implementation; and a **Deployment Checklist** — unchecked `[ ]` items
  for whoever deploys: env vars to add/change (exact names), migrations to run
  and what they do, data backfills, fields/behaviours to verify post-deploy,
  and smoke tests. Omit categories that don't apply rather than writing "N/A".
- The audit file is committed BY THE USER along with the code — never run git
  commit/push yourself.

## Frontend handoff notes

When a backend change affects an external consumer contract (new endpoint,
request/response shape change, validation rule change, new error code, renamed
field), write a paste-ready handoff note in `docs/notes-for-fe/` named
`YYYY-MM-DD_short-description.md`. Self-contained and consumer-friendly:
endpoint + method, example request/response JSON (with new fields explained),
validation rules to mirror, and error cases (status + when) to handle.
Internal-only changes (refactors, BE-only renames, infra) do NOT need a note;
ask the user first if it isn't obviously consumer-facing.

## Communication

- Explain concepts readably; use a real-world analogy when it genuinely helps.
- When you disagree with an approach, argue back with reasons and offer an
  alternative — but only for genuine concerns, not minor preferences.

## Stability & input paranoia

- Be paranoid about changes that could take the service down: consider edge
  cases, handle errors, never introduce paths that throw uncaught in production.
- Never trust client-side data: validate and sanitise all input at the schema
  boundary; guard against the OWASP Top 10 (the ORM/driver parameterises SQL —
  never interpolate it yourself).
- Never read `.env*` files (secrets) and never search or read `node_modules/`.

---

# Testing

- **Unit tests**: Vitest (TS/frontend, Jest-compatible API) / pytest (Python),
  both configured with a **≥90% global coverage** threshold that fails the run.
  Coverage must assert meaningful behavior, not just execute lines.
- **Test behavior, not implementation**: RTL user-facing queries (`getByRole`,
  `getByLabelText`) on the frontend; API/service-surface tests on backends.
  Snapshots are not a primary assertion.
- **Repository layers are mockable** so services test without a live DB.
- **Stories-as-fixtures** — every component ships `Name.stories.tsx`, and a
  `Name.stories.test.tsx` calls `runStandardStorySuites` from `@/lib/storyTests`
  (composeStories render + axe + EN/CY locale + keyboard checks). Story coverage
  equals component coverage, and the same stories feed the Storybook a11y (axe)
  addon in dev.
- **E2E**: Playwright smokes critical user paths when a frontend is present
  (mocked APIs when the frontend stands alone). Not every page — key flows.
- **Ops behaviors are tested, not assumed**: SIGTERM drain, error-envelope
  byte-parity, /docs gating, and metrics labels all have dedicated tests —
  keep them green when touching those layers.
- Run everything: `pnpm run test` (per stack or from the repo root).

---

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
