Run the complete ship gate for this repository and report what (if anything)
blocks shipping. This is a REPORT — run the gates, never fix or weaken them.

## Discover the stacks

- A `pyproject.toml` (repo root or a stack dir) means a **Python backend** is
  present — run the Python gate below. Python is NOT a pnpm workspace member, so
  the root `pnpm` fan-out never reaches it; you must run its gate separately.
- The JS/TS gates run from the repo root: each root `pnpm run <task>` is
  `pnpm --recursive --if-present`, so it fans out across every JS/TS workspace
  (TS backend, Next frontend) and no-ops where a stack lacks that script. This
  holds in every layout — workspace or hoisted single-stack (root is itself a
  member).
- In an initialized repo there is no `stack.config.json` (init deletes it) —
  don't rely on it; detect stacks from what's on disk.

## Run the gates (in this order)

1. **JS/TS** (single root invocation each — covers all JS/TS stacks):
   `pnpm run lint`, `pnpm run format:check`, `pnpm run typecheck`,
   `pnpm run test`, `pnpm run build`, and `pnpm run i18n:check` (all recursive;
   `i18n:check` no-ops without a frontend). Storybook is frontend-only and not a
   root script — if a Next frontend is present, also build it from the frontend
   (`pnpm --filter <frontend> run build-storybook`, or `pnpm run build-storybook`
   in a hoisted repo).
2. **Python backend** (from its stack dir): `poetry run ruff check .`,
   `poetry run ruff format --check .`, `poetry run mypy .`, `poetry run pytest`.
3. **AI-config drift**: `pnpm run ai:audit -- --check` — generated config must
   match its `ai/` source.

## Rules

- Run every gate independently and capture each result — **do not stop at the
  first failure**. Report them all.
- Never weaken a gate to reach green: no lowered coverage thresholds, no skipped
  tests, no `--no-verify`. Fix the code instead (or report the blocker).

## Report

Lead with the verdict, then a status table, then the blockers (omit the Blockers
section entirely when green):

```
## Ship gate: SHIP  ✅   (or: BLOCKED ❌ — N blocker(s))

| Gate         | TS backend | Py backend | Frontend |
| ------------ | :--------: | :--------: | :------: |
| lint         |     ✅     |     —      |    ✅    |
| format:check |     ✅     |     ✅     |    ✅    |
| typecheck    |     ✅     |     ✅     |    ❌    |
| test (≥90%)  |     ✅     |     ✅     |    ✅    |
| build        |     ✅     |     ✅     |    ✅    |
| i18n:check   |     —      |     —      |    ✅    |
| storybook    |     —      |     —      |    ✅    |
| ai-drift     |            ✅ (repo-wide)             |

### Blockers
1. **typecheck — frontend** — `pnpm run typecheck`
   <one-line cause, e.g. "Props type mismatch in ContactForm.tsx:42">
```

Use `—` for gates a stack doesn't have. Keep raw tool logs out of the summary —
quote only the failing line(s) needed to explain each blocker.
