@AGENTS.md

## Claude-only notes

- Slash commands seeded in this repo: `/ship` (full quality gate),
  `/new-endpoint` (backend scaffold), `/new-component` (frontend scaffold),
  `/ai-audit` (reconcile generated AI config).
- Read-only review skills seeded here: `pr-review` (three-pass PR analyst),
  `dependabot-review` (dependency-bump analyst, npm + pip lockfiles), and the
  stack-scoped `test-coverage-review-ts` / `-py` / `-fe` (each only materializes
  in a clone that has that stack). All are analysts — they report findings and
  never edit, commit, or make approval decisions.
- `feature-dev` (skill) drives a whole change end to end and loops with
  `review-changes` (read-only analyst over the UNCOMMITTED working tree): plan →
  goal + checklist → test-first implement → verify via `/ship` → review → loop on
  Blocker/Major until clean. `feature-dev` is self-contained (no external skill
  dependencies) and RUNS the gates itself (`pnpm`/`poetry`), rather than
  assuming a detached container.
- Subagents: `standards-check` (repo-standards audit); `code-reviewer` — a
  fresh-eyes reviewer in an ISOLATED context (self-detects scope; `feature-dev`
  can dispatch it instead of the `review-changes` skill); and `system-mapper` —
  fans out one-slice-per-agent to write `docs/system-map/*.md`. `system-mapper`
  is deliberately NOT flagged `readonly` in its manifest (the flag would strip
  the `Write` tool it needs); its body enforces "read-only except its one output
  doc".
- These review capabilities overlap by design (generic `pr-review` /
  `code-reviewer` vs repo-specific `standards-check`; committed `pr-review` vs
  uncommitted `review-changes`) — pick by what you're reviewing, not either/or.
  Note `pr-review` also exists as a user-global skill; the project copy here
  shadows it in clones — keep the two in step if you edit either.
- The shared rules above come from `AGENTS.md`, which is GENERATED from
  `ai/shared/*.md`. Edit the source, then run `pnpm run ai:sync` — a
  PreToolUse hook blocks direct edits to generated files.
- Cross-scope hook merge (project hooks additive over user-global ones) was
  EMPIRICALLY VERIFIED 2026-07-06: in one headless session, the project
  `protect-generated.sh` hook and a user-global PreToolUse hook both fired.
  On a new machine, a quick `/hooks` glance confirms both scopes are listed;
  the lefthook + CI drift gates cover the risk regardless.
- Commit scopes are monday.com ticket ids (`commitlint.config.mjs`: 9-11 digit
  numeric id, or `Headless` case-insensitive when there's no parent ticket).
  `.github/workflows/monday-link.yml` + `scripts/monday-pr-comment.mjs` read
  every commit on a PR, dedupe the ticket ids, resolve each to its board via
  the monday.com GraphQL API, and upsert ONE sticky PR comment linking them
  (edits the same comment on push rather than reposting). Informational only —
  NOT a required status check in `.github/rulesets/*.json`. Needs org-level
  `MONDAY_API_TOKEN` secret + `MONDAY_WORKSPACE_SUBDOMAIN` variable so every
  clone inherits them without per-repo setup — this is why it lives at the org
  level rather than being conditionally scaffolded like the stack capabilities.
