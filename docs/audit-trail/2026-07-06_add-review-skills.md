# 2026-07-06 — Add review & feature-dev capabilities to the skeleton

**Date/time:** 2026-07-06

Two related batches, both adding AI capabilities to the skeleton's single-source
config (authored under `ai/capabilities/**`, materialized via `pnpm run ai:sync`,
never hand-written into `.claude/`):

- **Batch 1** — three review analysts imported from external sources
  (`dependabot-review`, `pr-review`, `test-coverage-review`).
  `test-coverage-review` was hardcoded to a different repo and had to be
  re-architected around the skeleton's real testing model, then split per stack
  (`-ts` / `-py` / `-fe`).
- **Batch 2** — the `feature-dev` ↔ `review-changes` orchestration loop plus two
  agents (`code-reviewer`, `system-mapper`), also imported. All were hardcoded to
  the same source-repo family (Docker-detached "never run tests", Swagger/AJV,
  external skill deps) and were rewritten for the skeleton.

## Checklist — Batch 1 (review analysts)

- [x] Create this audit-trail entry with planned work
- [x] Author `ai/capabilities/dependabot-review/` (skill, scope `all`)
- [x] Author `ai/capabilities/pr-review/` (skill, scope `all`)
- [x] Author `ai/capabilities/test-coverage-review-ts/` (skill, scope `ts-backend`)
- [x] Author `ai/capabilities/test-coverage-review-py/` (skill, scope `py-backend`)
- [x] Author `ai/capabilities/test-coverage-review-fe/` (skill, scope `next-frontend`)
- [x] `pnpm run ai:sync` to materialize `.claude/skills/*` (5 files created)
- [x] `pnpm run ai:audit -- --check` and `node ai/tools/ai-build.mjs --check` green
- [x] Update `CLAUDE.md` seeded-capabilities note

## Checklist — Batch 2 (feature-dev loop + agents)

- [x] Author `ai/capabilities/review-changes/` (skill, scope `all`)
- [x] Author `ai/capabilities/feature-dev/` (skill, scope `all`, self-contained)
- [x] Author `ai/capabilities/code-reviewer/` (agent, `readonly`)
- [x] Author `ai/capabilities/system-mapper/` (agent, NO `readonly` so it keeps `Write`)
- [x] `pnpm run ai:sync` (4 files created) + both `--check` gates green (16 caps, 24 files)
- [x] Update `CLAUDE.md` notes for the loop + agents
- [ ] Finalize this entry (after user confirms)

## Files created

Batch 1:
- `ai/capabilities/dependabot-review/{capability.json, body.md}`
- `ai/capabilities/pr-review/{capability.json, body.md}`
- `ai/capabilities/test-coverage-review-ts/{capability.json, body.md}`
- `ai/capabilities/test-coverage-review-py/{capability.json, body.md}`
- `ai/capabilities/test-coverage-review-fe/{capability.json, body.md}`
- `docs/audit-trail/2026-07-06_add-review-skills.md` (this file)

Batch 2:
- `ai/capabilities/review-changes/{capability.json, body.md}`
- `ai/capabilities/feature-dev/{capability.json, body.md}`
- `ai/capabilities/code-reviewer/{capability.json, body.md}`
- `ai/capabilities/system-mapper/{capability.json, body.md}`

## Files updated

- `CLAUDE.md` — Claude-only notes list the new review skills, the feature-dev
  loop, and the two agents (incl. the `system-mapper` no-`readonly` rationale).

## Files generated (by `pnpm run ai:sync`, never hand-edited)

- `.claude/skills/dependabot-review/SKILL.md`
- `.claude/skills/pr-review/SKILL.md`
- `.claude/skills/test-coverage-review-ts/SKILL.md`
- `.claude/skills/test-coverage-review-py/SKILL.md`
- `.claude/skills/test-coverage-review-fe/SKILL.md`
- `.claude/skills/review-changes/SKILL.md`
- `.claude/skills/feature-dev/SKILL.md`
- `.claude/agents/code-reviewer.md`
- `.claude/agents/system-mapper.md`

## Summary of what changed and why

The skeleton had one review-oriented capability (`standards-check`, an agent
that audits a diff against this repo's house standards) and relied on a
user-global `pr-review` skill. We added five source capabilities so cloned
repos carry a full read-only review toolkit regardless of the operator's global
config:

- **`dependabot-review`** — read-only analyst for dependency-bump PRs
  (`pnpm-lock.yaml` + `poetry.lock`), four passes: enumerate → per-package usage
  → lockfile-only hidden issues → API delta. Retargeted from generic Node
  vocabulary to the skeleton's pnpm workspace, real source roots, and
  skeleton-specific smoke-test hooks (error-envelope parity, SIGTERM drain,
  OTel, `/docs` gating).
- **`pr-review`** — read-only three-pass PR analyst (changed code →
  project-wide impact → hidden issues), committed to the skeleton alongside the
  existing user-global one, with a "Related skills" cross-reference.
- **`test-coverage-review-{ts,py,fe}`** — three stack-scoped skills that judge
  whether a diff carries adequate, behavior-asserting tests against the
  skeleton's ACTUAL model (colocated tests / flat `test`|`tests` dir /
  stories-as-fixtures / Playwright `e2e/` / 90% coverage gate). The original
  skill assumed a `tests/unit|integration|e2e` folder pyramid and external
  services that do not exist here, so it was re-architected rather than ported.
  Splitting per stack means each only materializes in a clone that has that
  stack.

All five are `kind: skill`, `targets: ["claude","cursor"]`, read-only enforced
by body prose. They were authored as source under `ai/capabilities/` and
materialized via `pnpm run ai:sync` — never hand-written into `.claude/`.

Batch 2 added the development-loop orchestration and two dispatchable agents:

- **`feature-dev`** (skill) — drives a change idea → clean reviewed code: plan
  mode → written goal + `TodoWrite` checklist → test-first implementation →
  verify with the real gates (`/ship`) → hand off to `review-changes` → loop on
  Blocker/Major until clean → prompt for the audit-trail entry. Rewritten
  self-contained: the external skill dependencies (not installed anywhere) were
  folded inline as prose, and the source repo's "Docker container is detached —
  never run tests" rule was INVERTED (this repo runs `pnpm`/`poetry` gates
  itself, which TDD + the verify step now rely on).
- **`review-changes`** (skill) — read-only three-pass analyst over the
  UNCOMMITTED working tree (the twin of `pr-review`, which reviews a committed
  range), ending with the Blocker/Major loop-control verdict `feature-dev`
  branches on. Conventions retargeted from Swagger/AJV/snake_case to
  Biome/Zod-Pydantic/layering/envelope-parity/i18n/ops-invariants.
- **`code-reviewer`** (agent, `readonly`) — fresh-eyes reviewer in an isolated
  context; self-detects scope and defers dependency bumps to `dependabot-review`.
  `readonly` grants `Read/Grep/Glob/Bash`; the original's `WebFetch` was dropped
  (changelog fetching lives in `dependabot-review`).
- **`system-mapper`** (agent, NOT `readonly`) — fans out one-slice-per-agent to
  write `docs/system-map/*.md`. Authored WITHOUT the `readonly` flag on purpose:
  the flag injects a fixed `tools: Read, Grep, Glob, Bash` with no `Write`, and
  the manifest has no field to add `Write`, so `readonly` would break the agent's
  core job. Read-only discipline (except its one output doc) is enforced by body
  prose instead. Retargeted off the source repo's `claude/system-map` +
  controller/service/model vocabulary to the skeleton's `docs/system-map` +
  route→service→repository / atomic layers.

## Side effects considered

- **Generated-file protection:** wrote only to `ai/capabilities/**` (source);
  the `protect-generated.sh` PreToolUse hook and `ai-config-drift` CI gate would
  reject any direct `.claude/` edit. Ran `ai:sync` to generate, then the two
  `--check` gates to prove no drift.
- **Scope gating:** the three scoped skills are silently omitted from clones
  that deselect the stack (verified via the build tool's scope logic). The
  factory checkout has all three `stacks/*`, so all five materialize here.
- **pr-review shadowing:** the skeleton copy shares a name with the user-global
  skill. Same-name capabilities shadow; the skeleton (project-scoped) copy wins
  in a clone. Both are read-only analysts with the same contract, so behaviour
  is consistent; drift between the two copies over time is the only risk and is
  acceptable (the skeleton copy is the canonical one for generated repos).
- **CLAUDE.md** is hand-maintained (not generated), so editing it is safe and
  does not trigger the drift gate.

## Issues spotted during implementation

- **`test-coverage-review` could not be ported as-is.** The original assumed a
  `tests/unit | tests/integration | tests/e2e` folder pyramid and external
  services that do not exist in the skeleton. It was re-architected around the
  skeleton's real model (colocated tests, flat `test`/`tests` dirs,
  stories-as-fixtures, Playwright `e2e/`, ops-behavior tests, 90% gate) and split
  into three stack-scoped skills.
- **A residue grep flagged three generated files for `tests/unit`** — confirmed a
  false positive: the only match is the deliberate "this repo does NOT use a
  `tests/unit | …` pyramid" clarification. No source-repo-specific service names
  or vocabulary survive anywhere.
- **`pr-review` name collision** with the user-global skill of the same name.
  The project-scoped copy shadows the global one in a clone; both are read-only
  analysts with the same contract, so behaviour is consistent. Documented in
  `CLAUDE.md` with a "keep the two in step" note.
- The `ai-sync-check.sh` PostToolUse hook fired on every `ai/**` write (expected
  nudge) — resolved by running `pnpm run ai:sync` once all sources were authored.
- **`feature-dev` depended on 4 uninstalled external skills.** Verified they
  exist nowhere (skeleton, user-global, plugins) — so the references would
  dangle. Folded the useful ideas (brainstorm, TDD, root-cause debugging,
  verify-before-done) inline; no external dependency remains.
- **Build-tool gap: `readonly` agents cannot get `Write`.** `lib.mjs:177` maps
  `readonly: true` → a fixed `tools: Read, Grep, Glob, Bash`, and the manifest
  has no tool-list field. `system-mapper` needs `Write`, so it was authored
  WITHOUT `readonly` (full tools, prose-enforced discipline). If a future
  capability needs a precise hard-restricted tool set incl. `Write`, `lib.mjs` +
  `validateManifest` would need a `tools` field — logged as a known limitation,
  not fixed in this change.
- **Overlap is intentional, not accidental:** `code-reviewer` (generic,
  isolated-context) overlaps `standards-check` (repo-specific) and the
  `pr-review`/`review-changes` skills; `review-changes` (uncommitted) overlaps
  `pr-review` (committed). Kept all — they're selected by review target, and the
  `CLAUDE.md` notes say how to pick.

## Deployment Checklist

This is an AI-config / tooling change to the skeleton repo — no runtime service
is deployed. No env vars, migrations, or backfills.

- [ ] After merge, confirm `ai-config-drift` CI job is green on the PR (it runs
      the same `ai-build.mjs --check` + `ai-audit.mjs --check` used locally).
- [ ] Confirm the `scaffold (matrix)` CI job still passes — it bootstraps every
      `--select` combo and runs the generated repo's own drift check, so a
      stack-scoped skill that mis-materializes would surface there.
- [ ] Verify in a fresh clone / bootstrapped repo that the scoped
      `test-coverage-review-*` skills appear only for their selected stacks.
