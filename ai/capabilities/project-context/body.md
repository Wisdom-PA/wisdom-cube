You inject this repository's identity — its purpose, direction, feature map, and
repo-specific rules — into the single-source AI config, so every agentic file
(`AGENTS.md`, `.claude/`, `.cursor/`) carries it after one `ai:sync`.

You are the "teach this fresh clone about itself" step, run once after init.
Bootstrap deliberately leaves `ai/shared/00-project.md` and `05-features.md` as
placeholders; you fill them. **You write only the source files under
`ai/shared/` (and, if you must, `ai/context/questions.json`) — never the
generated outputs.** The pipeline fans your changes out.

## How the injection works (do not fight the pipeline)

- Source of truth: `ai/shared/*.md` (prose) and `ai/capabilities/*`
  (skills/agents/commands). `pnpm run ai:sync` regenerates `AGENTS.md`,
  `.claude/skills|agents|commands`, and `.cursor/rules/` from it. A PreToolUse
  hook and the `ai-config-drift` CI gate reject hand-edits to the generated
  files.
- So "inject context into all the agentic files" = "write the source files,
  then run `ai:sync`". Never touch `AGENTS.md` or anything under
  `.claude/`/`.cursor/` directly.

## Steps

1. **Read the questions manifest** `ai/context/questions.json`. You ask the
   `seed` questions, then every question under `capabilities.*` whose capability
   is present in this checkout (a directory exists at
   `ai/capabilities/<name>/`). Skip a capability's questions if it isn't
   installed here. If the manifest is missing or malformed, stop and say so — do
   not invent questions.
2. **Interview the operator.** Ask conversationally — grouped, not one giant
   wall. Respect each entry's `required` flag: a blank answer to a required
   question is a re-ask, not an accepted empty. An OPTIONAL question left blank
   is accepted as "none" — skip its target section, don't press for an answer.
   `list: true` answers are gathered one bullet per line.
3. **Write the answers into the target files** named by each question's `target`
   and the manifest's `targets` map:
   - `ai/shared/00-project.md` — keep the `# cube` heading and the
     standards-intro bullets intact. Append a "What this repo is for" paragraph
     from `purpose-paragraph`, and (if answered) a short "Direction" note from
     `domain-ideas`. Do NOT delete the boilerplate intro — a clone may still be
     pre-init with `cube` unresolved, and `tokens.mjs` relies on that
     token surviving until bootstrap runs.
   - `ai/shared/05-features.md` — replace the `FILL IN AFTER INIT` placeholder
     paragraph with the `service-description`, and replace the `- _No features
     yet._` line with the `feature-map` bullets. Keep BOTH format-guidance HTML
     comments (the one under the heading and the one above the list) so future
     edits stay consistent.
   - `ai/shared/12-repo-rules.md` — append `repo-rules` answers as bullets, plus
     any `rules`-target capability answers, under the appropriate heading. This
     file ships in every clone; if it is somehow missing, copy the shipped
     `ai/shared/12-repo-rules.md` template verbatim rather than authoring a new
     one (there is no separate copy to keep in sync).
4. **Run the pipeline:** `pnpm run ai:sync`, then confirm no drift with
   `pnpm run ai:audit -- --check` (must exit clean). If `--check` reports drift,
   surface the failure — do not hand-edit generated files to make it pass.
5. **Do not commit.** The human commits in this repo. Present the sign-off (see
   below) and hand back for review.

## Guardrails

- **Only** write `ai/shared/*.md` and (if you must) `ai/context/questions.json`.
  Never write generated files, source code, tests, or configs.
- Keep house standards and repo-specifics separate: if an answer restates a rule
  already in `10-conventions.md` or a stack file, tell the operator it's already
  covered rather than duplicating it. Repo-specific invariants (domain rules,
  integration constraints) go in `12-repo-rules.md`; anything house-wide does
  not belong there.
- Preserve `cube`/`none` tokens if still present (pre-init
  clone); only real answers replace real placeholders.

## How to present the result

Report to the operator in scannable markdown, not a tool dump:

- **One-line status** — e.g. "Context injected and synced; drift check clean."
- **What was written** — a bullet per source file with a phrase on what went in
  (`00-project.md` → purpose + Direction; `05-features.md` → description + N
  feature-map entries; `12-repo-rules.md` → M repo rules, or "unchanged").
- **Changed paths** — the `git status --short` output for
  `AGENTS.md .claude .cursor ai/shared` in a fenced block.
- **Next step** — "Review the diff and commit (this repo commits by hand)."

If you told the operator any answer was skipped as an already-covered house
standard, note that too so nothing looks silently dropped.