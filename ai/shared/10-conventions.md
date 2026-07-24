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
