---
name: update-project-context
description: "Use to revise this repo's injected purpose, ideas, feature map, or repo-specific rules after they were first set (or to fill in what project-context left blank). Reads the current ai/shared/ content, re-asks only what's changing, writes the source, and re-runs `pnpm run ai:sync` so every agentic file updates. Triggers: 'update the project context', 'change what the repo is for', 'add a feature to the map', 'add a repo rule'."
---
<!-- DO NOT EDIT — generated from ai/ by `pnpm run ai:sync` -->

Revise the repo's injected identity — purpose, direction, feature map, or
repo-specific rules — and re-fan it into every agentic file. This is the
editing twin of the `project-context` agent: it targets the SAME source files
and the SAME questions manifest, but starts from what's already there instead of
a blank slate.

## When to use

- A feature landed → add it to the feature map.
- The repo's purpose or direction shifted → update the paragraph.
- A new repo-specific rule needs to hold everywhere → add it.
- `project-context` was skipped or left blanks at init → fill them.

If the operator instead wants a NEW *kind* of context gathered on future init
(a new interview question), that's `register-context`, not this skill.

## Steps

1. **Read the current source and the manifest.** The manifest
   `ai/context/questions.json` is the authority for WHERE each answer lives: its
   `targets` map names the file for every target bucket. Today those are
   `purpose` → `ai/shared/00-project.md`, `features` → `ai/shared/05-features.md`,
   `rules` → `ai/shared/12-repo-rules.md` — read whichever the operator is
   changing. (If `register-context` has added a bucket, honour that too.)
2. **Ask only what's changing.** Show the operator the current value for the area
   they want to change and take their edit. Do NOT re-run the whole interview
   unless they ask for a full refresh. For the feature map, adding or editing one
   line is the common case — don't rewrite the list.
3. **Edit the target source file in place**, preserving structure:
   - Keep the `# cube` heading, the standards-intro bullets, and the
     format-guidance HTML comments. Never delete boilerplate a still-pre-init
     clone needs (unresolved `cube`/`none` tokens must
     survive until bootstrap).
   - Repo-specific rules go in `12-repo-rules.md` only — never duplicate a house
     standard from `10-conventions.md` or a stack file. If an edit restates a
     house standard, tell the operator it's already covered and skip it.
   - If `12-repo-rules.md` doesn't exist yet, create it from the same template
     `project-context` uses (`# Repo-specific rules` heading + guidance comment +
     a `## Domain rules` section) before appending.
4. **Re-sync and check.** Run `pnpm run ai:sync`, then `pnpm run ai:audit -- --check`
   (must exit clean — a PreToolUse hook and the `ai-config-drift` gate reject any
   hand-edit to the generated files).
5. **Don't commit — the human commits.** Then report (see below).

## Reporting the result

Give the operator a short, scannable summary:

- **What changed** — one line (e.g. "Added the `checkout` feature to the map").
- **Source files edited** — bullet list of the `ai/shared/*.md` paths.
- **Synced paths** — the `git status --short` output over
  `AGENTS.md .claude .cursor ai/shared`.
- **Handoff** — one line: not committed; review and commit.

## Guardrails

- WRITE only under `ai/shared/`. READ the manifest `ai/context/questions.json`
  to know where answers go, but never write it — that's `register-context`'s job.
  Never touch the generated `AGENTS.md`/`.claude/`/`.cursor/`.
- This skill does NOT change what questions get asked — that's the manifest's
  job, maintained by `register-context`. If the operator wants a NEW kind of
  context gathered on init, point them there.
