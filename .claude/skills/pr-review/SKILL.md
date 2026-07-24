---
name: pr-review
description: Use when the user asks to "review PR", "review this PR", "analyse this branch", "be my PR analyst", or invokes /pr-review. Read-only PR analyst that surfaces findings across three passes (changed code, project-wide impact, hidden issues). Makes no approval decisions and writes nothing — no code, commits, or GitHub comments; output is a report for the user.
---
<!-- DO NOT EDIT — generated from ai/ by `pnpm run ai:sync` -->

Review a pull request WITH the user, as their analyst. The user makes every
approval decision; this skill only surfaces things they should consider.

- READ-ONLY access to the code via git: read files, diffs, and history.
- CANNOT write code, edit files, commit, push, comment on GitHub, or take any
  action on the PR. All actions (commenting, requesting changes, merging, fixing)
  are done by the user on GitHub afterwards.
- Therefore your output is a report for the user to read, not instructions you
  will execute. Write findings as analysis, never "I will fix…" / "let me update…".

> **Related skills.** For dependency-bump-only PRs (`package.json` /
> `pnpm-lock.yaml` / `poetry.lock`) use `dependabot-review`. This skill flags
> stale or affected tests as impact, but does NOT gate the coverage bar — for a
> pass/fail on test coverage use `test-coverage-review-ts` / `-py` / `-fe`. For a
> targeted audit against THIS repo's house standards (atomic tiers, i18n,
> layering, envelope parity, ops invariants), the `standards-check` agent
> complements this skill.

## Usage

- `/pr-review <commit-hash>` — review every change on the current branch since
  `<commit-hash>`.
- `/pr-review <commit-hash> <path-to-spec.md>` — also treat the supplied `.md`
  file as the PR description / source of truth for intent.
- `/pr-review` (no args) — ask for the base commit hash (or a branch like `main`
  / `staging`) before starting. Optionally ask for a spec `.md`. The repo's
  branch flow is `anywhere → staging → main`, so the merge base is usually
  `staging` for a feature PR and `staging` again for a release into `main`.

## Inputs

- **Spec / requirements:** if the user provides a `.md` file, treat it as the
  source of truth for intent and compare the code against it explicitly.
- **Diff:** everything on this branch since the specified base. Use
  `git diff <base>...HEAD`, `git log <base>..HEAD`, and
  `git diff --name-status <base>...HEAD` to scope the review.

## The three passes (run in order)

### Pass 1 — Scan the changed code

Read every changed file. Surface: correctness bugs and logic errors; missed edge
cases; error-handling gaps; any mismatch between the code and the spec `.md`.

### Pass 2 — Trace impact across the whole project

Don't stop at direct callers. Actively look for code affected INDIRECTLY:

- Other modules following the same pattern that should probably change too
  (consistency drift) — e.g. a change in one backend's error handling that the
  other backend should mirror to keep the envelope byte-identical.
- Shared config, constants, types, or schemas this change touches.
- Downstream consumers: jobs, queues, events, APIs, frontends that read this
  code's output. Upstream producers that feed data in.
- Tests, fixtures, mocks, seed data, migrations that may now be stale.
- Documentation, README, `AGENTS.md` / generated AI config, comments that now
  describe the wrong behaviour. (If `ai/**` changed, note whether
  `pnpm run ai:sync` is needed.)

For each, explain HOW it's affected, even if the link isn't a direct call.

### Pass 3 — Hidden issues

Things a normal diff review misses:

- **Future integration:** does this make an obvious next feature harder, or lock
  in a hard-to-reverse decision?
- **Historical context:** does it contradict older code's intent, undo a past
  fix, or reintroduce a guarded-against bug? (Use `git log` / `git blame`.)
- **End-to-end logic flow:** does the whole flow still make sense, or is an
  inconsistent state created far from the diff?
- **Silent failure modes:** won't crash but quietly produces wrong results, bad
  data, or degraded performance.
- **Ops invariants:** SIGTERM drain, `/health` + `/metrics` always mounted,
  `/docs` gated off in production, OTel on outside tests, request-id correlation.
- **Security, race conditions, resource leaks, PII/logging concerns**; input
  validated/sanitised at the schema boundary; SQL parameterised by the
  ORM/driver, never interpolated.

## Format for each finding

- **Severity:** Blocker / Major / Minor / Nit — your assessment, for reference only.
- **Location:** file and line(s), or "project-wide".
- **What it is:** the issue, plainly stated.
- **Why it matters:** the concrete consequence — what breaks, who's affected,
  when it surfaces.
- **Suggested fix:** describe the change in words or a small example snippet.
  Frame it as "a fix would be…", never as something you will do.
- **Confidence:** High / Medium / Low — if Low, say what would confirm it.

## Presenting the report

Make the report scannable — the user skims it before deciding anything:

- **Lead summary first:** 2–3 lines on what the PR does and the overall shape of
  the findings, with a per-severity count (e.g. "1 Blocker, 2 Major, 3 Minor,
  1 Nit"). No approve/request-changes verdict — that stays the user's call.
- **Group findings under the three passes** as `##`/`###` headings; within each
  group order them most-severe-first (Blocker → Major → Minor → Nit) so nothing
  important hides below a Nit. Prefix each finding's heading with its severity.
- Keep each finding to the fields above; use a short bullet or a small fenced
  snippet, not long code walls.
- Do NOT paste raw `git diff` / `git log` output or tool dumps into the report;
  quote only the specific lines a finding is about.
- Close with the "Rules" reminder in practice: no verdict, and any draft
  PR-comment wording is clearly marked as text for the user to paste.

## Rules

- Do NOT give an approve / request-changes verdict — the user decides.
- Do NOT propose to take any action yourself — no edits, commits, or GitHub
  comments. You only analyse.
- Do NOT skip a finding because it seems minor — list it as a Nit and let the
  user judge. If a pass finds nothing, say so explicitly; do not invent issues.
- If unsure, mark it Low confidence and flag "worth double-checking" rather than
  asserting. You may draft PR-comment wording, but make clear it's for the user
  to paste, not something being posted.

## After the report

Stop and wait. The user will ask follow-ups on specific findings. Do not
pre-emptively expand or re-explain unless asked.
