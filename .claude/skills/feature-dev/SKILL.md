---
name: feature-dev
description: "Use when starting any feature, enhancement, bugfix, or behaviour change in this repo, or when the user invokes /feature-dev. Drives the work end to end: plan mode to design, a written goal + TodoWrite checklist, test-first implementation following this repo's conventions, a real verification pass (pnpm/poetry gates via /ship), then hands off to review-changes and loops on fixes until the review reports no Blocker/Major issues."
---
<!-- DO NOT EDIT — generated from ai/ by `pnpm run ai:sync` -->

Drive a piece of work from idea to clean, reviewed code. You orchestrate the
whole loop: design in plan mode, define a goal + checklist, implement test-first,
verify with the real quality gates, review the working tree, and loop on fixes
until it is clean.

This skill is self-contained — it folds in a brainstorm→TDD→verify discipline
directly; it does not depend on any external methodology skill.

## Project constraints (read first)

This repo's `AGENTS.md` / `CLAUDE.md` apply. In particular:

- **You CAN and SHOULD run the gates yourself.** Unlike a detached-container
  setup, this repo runs everything through `pnpm run <task>` (Python wraps
  `poetry run`). Use `/ship` (lint + format:check + typecheck + test ≥90% +
  build) as the verification step, and run individual gates (`pnpm run test`,
  `pnpm run lint`) as you go.
- **Layering & schema-first**: route → service → repository, one direction;
  validation via Zod/Pydantic drives OpenAPI (never hand-edit the spec); typed
  errors via the single envelope builder, byte-identical across backends.
- **Side effects every change**: schemas (validation AND OpenAPI derive from
  them), tests/fixtures/stories, README, and — if you touch `ai/**` — run
  `pnpm run ai:sync` (generated files are hook-protected; never hand-edit them).
- **Frontend**: atomic tiers + mandatory component folder shape, i18n EN+CY (no
  hardcoded strings), RHF+Zod forms, stories-as-fixtures, loading/error boundaries.
- **Never** run git write commands or commit — the user handles git. Never read
  `node_modules/` or `.env*` files.

## The flow

### 1. Enter plan mode and design
- Announce: "Using feature-dev to drive this work."
- Call `EnterPlanMode` so design happens before any code.
- Brainstorm intent: ask clarifying questions, surface requirements, and search
  existing code/utilities to REUSE — do not propose new code where something
  suitable already exists (balance DRY against simplicity per the conventions).

### 2. Define the GOAL
Write a short, explicit goal: one paragraph for what "done" looks like, plus a
Definition of Done bullet list — behaviour, tests (≥90% coverage, meaningful
assertions), schemas/OpenAPI/README updated where touched, conventions followed,
ops invariants preserved.

### 3. Make the checklist ("tick")
Create a `TodoWrite` with one item per step needed to reach the goal. This is the
running checklist you tick off as you implement; add discovered work as you go.

### 4. Confirm the flow is correct
Before leaving plan mode, sanity-check the order: design agreed → tests planned →
implementation steps ordered → side effects (schemas/OpenAPI/tests/stories/README)
accounted for → verification + review steps included. Reorder if needed.

### 5. Get approval, then exit plan mode
Present the goal + checklist via `ExitPlanMode`. Do not write code until approved.

### 6. Implement (test-first)
- Work the checklist top to bottom, ticking items as you go.
- **TDD**: write the failing test first and run it (`pnpm run test <path>`),
  confirm it fails for the right reason, then implement, then run it again and
  confirm it passes. You run the tests yourself here — do not just assert they
  pass.
- Honour conventions and update side-effect surfaces (schemas/OpenAPI/README/
  tests/stories) as part of the work, not after.
- If a bug or unexpected behaviour appears, root-cause it before fixing — form a
  hypothesis, confirm it against the actual code/output, then fix the cause.

### 7. Verify before claiming done
Run the real gate: `/ship` (or the per-stack `pnpm run` gates). Never claim
success on your own say-so — treat the goal as met only when the gates are green.
Report the actual result (see "Presenting progress"). If a gate fails, fix and
re-run.

### 8. Review the uncommitted code
Hand off to the `review-changes` skill to analyse the working-tree changes.
Announce: "Implementation done — running review-changes on the uncommitted changes."
(For a heavier fresh-eyes pass in an isolated context, you may instead dispatch
the `code-reviewer` agent; either returns the same Blocker/Major loop verdict. The
agent's report comes back to you, not the user — surface its findings yourself in
the readable shape below.)

### 9. Loop on fixes until clean
When review returns findings:
- **NO Blocker/Major** → loop complete; go to step 10.
- **ANY Blocker/Major** → start a fix round:
  - Call `EnterPlanMode` again.
  - Turn each Blocker/Major into checklist items + a focused fix plan
    (root-cause first).
  - Present the fix plan via `ExitPlanMode` and get approval.
  - Apply the fixes, re-run the relevant gates (step 7), then return to step 8.
- Repeat until the review reports no Blocker/Major. Minor/Nit findings are
  reported for the user to judge and do not by themselves force another loop.

### 10. Audit trail
Per `CLAUDE.md`, non-trivial change sets are logged in `docs/audit-trail/`. Ask
the user whether to create/update today's entry now ("ready for me to finalize
the audit-trail entry?"). Do not commit — the user handles git.

## Presenting progress

You run a long loop — keep the user oriented with short, scannable updates, never
raw tool dumps or a raw agent report:

- **Each phase**: open with a one-line lead ("Planning", "Implementing step 3/7",
  "Verifying", "Reviewing").
- **Goal (step 2)**: the paragraph, then Definition of Done as a bullet list.
- **Gates (step 7)**: a pass/fail line per stack (e.g. `TS: lint ✓ types ✓ test ✓
  90.4% build ✓`), not the full log. On failure, paste only the failing excerpt
  plus what you'll change.
- **Review (step 8)**: findings grouped by severity (Blocker → Nit), each a tight
  bullet, with the loop verdict called out on its own line.
- **Between rounds**: a one-line recap of what the fix round addressed.

## Guardrails (recap)
- Plan mode first, every time — including each fix round; no code before an
  approved plan.
- Success requires a green verification from real gate output (step 7) — never
  your say-so. Never run git write commands or commit; the user handles git.
- `review-changes` and the `code-reviewer` agent are read-only — all fixing
  happens here in feature-dev.
