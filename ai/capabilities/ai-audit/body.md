Reconcile the generated AI config with its single source of truth under `ai/`.

## Run

1. `pnpm run ai:audit` (write mode — the default). It regenerates anything
   missing or stale in `AGENTS.md`, `.claude/skills|agents|commands`, and
   `.cursor/rules/` from `ai/shared/` + `ai/capabilities/`, then re-verifies
   itself. **If it exits non-zero** (it prints which items are "STILL out of
   sync after regeneration"), STOP and surface the failing items — the source
   is likely broken; never hand-fix the generated files to make it pass.
2. `git status --short` on those paths to see exactly what it touched.
3. `pnpm run ai:audit -- --check` as an independent confirmation (compare-only;
   write mode already self-verifies, so this should exit clean). If it still
   reports drift, STOP and report it rather than looping.

## Report

Lead with the outcome in one line, then a short scannable list — do not paste
the tool's raw padded rows:

- **Already reconciled** — if `git status` was empty and both runs exited
  clean, say so and stop; nothing was regenerated.
- **Reconciled** — list what changed as bullets grouped by target
  (`AGENTS.md`, `.claude/...`, `.cursor/...`), e.g. `created`, `updated`.
- **Failed** — name the out-of-sync items and the likely source cause; do not
  claim success.

Editing rule (this command's reason to exist): the generated files are never
hand-edited — change the source (`ai/shared/*.md` for prose, a new
`ai/capabilities/<name>/{capability.json,body.md}` for a capability) and re-run
this audit. See "Editing rules" in `AGENTS.md`.