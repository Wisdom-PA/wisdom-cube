# 2026-07-06 — Project-context injection capabilities

**Date/time:** 2026-07-06

Add three capabilities that let a cloned repo teach the AI config about *itself*
— its purpose, direction, feature map, and repo-specific rules — through the
existing single-source pipeline rather than a parallel mechanism:

- **`project-context`** (agent) — the "on init" injector.
- **`update-project-context`** (skill) — revise the injected context later.
- **`register-context`** (skill) — when a new capability needs init-time
  context, add its questions to the interview.

Backed by a new **questions manifest** (`ai/context/questions.json`) — data that
drives the interview, so the interviewers stay generic and only the manifest
changes as capabilities come and go — and a new **`ai/shared/12-repo-rules.md`**
source file where injected repo-specific rules land.

## Design decision

The repo already has a single-source AI-config pipeline (`ai/shared/*.md` +
`ai/capabilities/*` → `pnpm run ai:sync` → `AGENTS.md`, `.claude/`, `.cursor/`,
drift-gated). "Inject purpose/ideas/rules into all agentic files" is exactly what
`ai:sync` does; the injection *target* is `ai/shared/`. So these capabilities
DRIVE that pipeline (interview → write source → sync) rather than introducing a
new build step. Confirmed with the user: context lives in `ai/shared/`; the
register step maintains a data manifest (not agent prose); the agents run the
sync end-to-end.

## Checklist

- [x] Create this audit-trail entry
- [x] `ai/context/questions.json` — seed questions + empty `capabilities` map
- [x] `ai/capabilities/project-context/` (agent, NOT `readonly` — needs `Write`)
- [x] `ai/capabilities/update-project-context/` (skill, scope `all`)
- [x] `ai/capabilities/register-context/` (skill, scope `all`)
- [x] `ai/shared/12-repo-rules.md` (placeholder; folds into `AGENTS.md` after
      Conventions, before Working practices)
- [x] `pnpm run ai:sync` (4 files written: AGENTS.md + 3 caps)
- [x] `pnpm run ai:sync -- --check` and `pnpm run ai:audit -- --check` green
      (27 generated files in sync, 19 caps materialized claude+cursor)
- [ ] Finalize this entry (after user confirms)

## Files created

- `ai/context/questions.json`
- `ai/capabilities/project-context/{capability.json, body.md}`
- `ai/capabilities/update-project-context/{capability.json, body.md}`
- `ai/capabilities/register-context/{capability.json, body.md}`
- `ai/shared/12-repo-rules.md`

## Files generated (by `pnpm run ai:sync`, never hand-edited)

- `AGENTS.md` (now carries the `# Repo-specific rules` section)
- `.claude/agents/project-context.md`
- `.claude/skills/update-project-context/SKILL.md`
- `.claude/skills/register-context/SKILL.md`

## How the three fit together

1. **Init:** operator runs the `project-context` agent in a fresh clone. It reads
   `ai/context/questions.json`, asks the `seed` questions plus any questions for
   capabilities that are actually present, writes answers into
   `ai/shared/00-project.md` / `05-features.md` / `12-repo-rules.md`, runs
   `ai:sync`, and verifies `ai:audit --check`. The context now lives in every
   agentic file.
2. **Revise:** `/update-project-context` reads current source, re-asks only
   what's changing, edits in place, re-syncs.
3. **Extend:** after authoring a new capability that needs repo-specific context,
   `/register-context` appends that capability's questions under
   `capabilities.<name>` in the manifest — so `project-context` gathers them on
   the next clone.

## Side effects considered

- **Generated-file protection:** wrote only source (`ai/capabilities/**`,
  `ai/shared/**`, `ai/context/**`). The `ai-sync-check.sh` PostToolUse hook fired
  on every `ai/` write (expected nudge); resolved by running `ai:sync` once all
  sources were authored. No direct `.claude/`/`.cursor/` edits, so the
  `protect-generated.sh` PreToolUse hook and `ai-config-drift` gate stay green.
- **`ai/context/questions.json` is inert to the generator.** `ai-build.mjs`
  reads only `ai/shared` + `ai/capabilities`; the manifest lives in a third dir,
  so editing it (e.g. via `register-context`) never touches generated files and
  never trips the drift gate. This is by design — `register-context` explicitly
  says "no `ai:sync` needed".
- **`project-context` is an agent WITHOUT `readonly`.** The build maps
  `readonly: true` → a fixed `tools: Read, Grep, Glob, Bash` with no `Write`
  (`lib.mjs:177`); the injector must write `ai/shared/`, so it is authored
  without the flag and its body enforces "only write `ai/shared` + the manifest,
  never generated files / source / tests". Same pattern as `system-mapper`.
- **Numeric prefix.** `12-repo-rules.md` sits between `10-conventions.md`
  (house standards) and `15-working-practices.md` so `AGENTS.md` orders
  repo-specifics right after house conventions. Verified in the generated output.
- **Genericness (the repo's clone-anywhere contract).** All three capabilities
  and the manifest carry no company/personal/origin references, and no
  `cube`-style token needs adding — they operate on whatever the clone
  is. The bodies explicitly preserve unresolved `cube`/`none`
  tokens so a still-pre-init clone isn't corrupted.
- **Scope gating.** All three are `scope: ["all"]`, so they materialize in every
  clone regardless of selected stacks (correct — context injection is
  stack-agnostic).
- **Overlap with `ai-audit`.** `ai-audit` reconciles generated↔source;
  `project-context`/`update-project-context` change the *source content* and then
  call the same sync. Distinct jobs, composable (the injectors run the audit's
  `--check` at the end).

## Issues spotted during implementation

- **CLAUDE.md "Claude-only notes" not yet updated** to describe the new trio.
  CLAUDE.md is hand-maintained (not generated), safe to edit, and does not trip
  the drift gate — flagged as a follow-up for the user to approve wording before
  I add it (kept out of this change until confirmed).
- **README / new-clone guidance** doesn't yet mention running `project-context`
  as a post-bootstrap step. Bootstrap intentionally stays zero-dependency and
  doesn't invoke agents, so this is a docs nudge, not a code change — left for
  the user to decide placement.

## Deployment Checklist

AI-config / tooling change to the skeleton repo — no runtime service is
deployed. No env vars, migrations, or backfills.

- [ ] Confirm `ai-config-drift` CI is green on the PR (runs the same
      `ai-build.mjs --check` + `ai-audit.mjs --check` used locally).
- [ ] Confirm the `scaffold (matrix)` CI job still passes — it bootstraps every
      `--select` combo and runs the generated repo's own drift check; the three
      new `scope: all` caps should materialize in every combo.
- [ ] In a fresh clone: run the `project-context` agent and verify it fills
      `00-project.md` / `05-features.md` / `12-repo-rules.md` and that `ai:sync`
      propagates the content into `AGENTS.md` and `.claude/`/`.cursor/`.
- [ ] Decide whether to (a) add the new trio to CLAUDE.md's Claude-only notes and
      (b) mention `project-context` in the README post-init steps.
