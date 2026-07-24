Review the current working-tree changes WITH the user, as their analyst — the
same role as `pr-review`, but the code is NOT committed yet. The user makes every
decision; this skill only surfaces what they should consider.

- READ-ONLY access via git: read files, diffs, status, history.
- DO NOT write code, edit files, stage, commit, push, or comment on GitHub. All
  fixing happens back in the `feature-dev` skill (or by the user).
- Output is a report for the user, not instructions you will execute. Write
  findings as analysis, never "I will fix…".

> **Related skills.** This is the working-tree twin of `pr-review` (which reviews
> a committed range). For a coverage pass/fail use `test-coverage-review-ts` /
> `-py` / `-fe`; for a house-standards audit the `standards-check` agent
> complements this. `feature-dev` hands off to this skill and loops on its
> verdict.

## Scope — what to review

The uncommitted changes in the working tree. Gather them with:

- `git status --short` — staged, unstaged, and untracked overview.
- `git diff HEAD` — staged + unstaged changes to tracked files.
- Untracked new files (shown `??`): read each in full — there is no diff base.
- `git diff --stat HEAD` — size/shape of the change.
- `git log --oneline -5`, plus blame/log on touched lines — context and intent.

Review only what is uncommitted, not committed history. **If the working tree is
clean, say so and stop** — nothing to review.

## Inputs

- **Goal / spec:** if `feature-dev` defined a goal + checklist (or the user
  supplies a `.md`), treat it as the source of truth for intent and compare the
  code against it explicitly.
- **Project conventions:** the authority is this repo's generated `AGENTS.md` —
  read it and hold the diff to it. Watch especially for: layering (route →
  service → repository, one direction); schema-first validation (Zod/Pydantic)
  driving OpenAPI (never hand-edit the spec); the single error-envelope builder
  (`buildErrorEnvelope` / `_envelope`) kept byte-identical across backends; env
  only through the typed schema; frontend atomic tiers, i18n EN+CY (no hardcoded
  strings), RHF+Zod forms, stories-as-fixtures; ops invariants (`/health` +
  `/metrics` mounted, `/docs` gated off in prod, SIGTERM drain, OTel on). If
  `ai/**` changed, flag whether `pnpm run ai:sync` is needed — generated files
  must not be hand-edited.

## The three passes (run in order)

### Pass 1 — Scan the changed code

Read every changed/added file. Surface correctness bugs, logic errors, missed
edge cases, error-handling gaps, convention violations, and any mismatch with the
goal/spec.

### Pass 2 — Trace impact across the whole project

Don't stop at direct callers. Look for indirect impact: other modules following
the same pattern that should change too (e.g. the sibling backend, to keep the
error envelope byte-identical); shared config/constants/types/schemas touched;
downstream consumers (jobs, queues, events, APIs, the frontend); upstream
producers; stale tests/fixtures/mocks/stories/seed data/migrations; i18n message
parity (`messages/en.json` + `messages/cy.json` both updated); docs / README /
`AGENTS.md` / generated AI config now describing wrong behaviour. Explain HOW
each is affected.

### Pass 3 — Hidden issues

Future-integration traps; contradictions with older code or past fixes (use `git
log` / `git blame`); end-to-end logic-flow inconsistencies; silent failure modes
(wrong data, no crash); ops-invariant regressions (un-drained shutdown, `/docs`
reachable in prod, missing `/health` or `/metrics`); security / race conditions /
resource leaks / PII-in-logs; input not validated at the schema boundary.

## Finding format

For EACH finding: **Severity** (Blocker / Major / Minor / Nit), **Location**
(file:line or "project-wide"), **What it is**, **Why it matters** (concrete
consequence), **Suggested fix** (in words or a small snippet, framed as "a fix
would be…", not something you will do), **Confidence** (High/Medium/Low — if Low,
say what to check).

## How to present the report

Make it scannable for the user:

1. **Lead summary** — one line with the counts, e.g. "2 Blockers, 1 Major, 3
   Minor, 1 Nit across 5 files."
2. **Findings**, grouped under `## Blocker` / `## Major` / `## Minor` / `## Nit`
   headings, most-severe first; one sub-block per finding in the format above.
   Omit a heading if that bucket is empty. If a whole pass found nothing, say so
   in one line rather than dropping it silently.
3. **Verdict** last (see below).

Prose findings only — no raw git output, tool dumps, or scratchpad.

## Rules

- Do NOT give an approve / request-changes verdict, and do NOT fix anything —
  analysis only.
- If a pass finds nothing, say so. Don't invent issues to fill space.
- Mark uncertain findings Low confidence rather than asserting them.

## After the report — loop control

End with a one-line verdict that drives the `feature-dev` loop:

- **Any Blocker/Major findings:** "Blockers/Majors found — recommend planning
  and applying fixes, then re-reviewing." List the Blocker/Major titles so
  feature-dev can turn them into checklist items.
- **None (only Minor/Nit, or nothing):** "No Blocker/Major issues — Minor/Nit
  items listed for the caller to judge."

Then stop and wait for the user.