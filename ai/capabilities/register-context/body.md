Wire a newly-authored capability (skill / agent / command) or repo rule into the
context interview. After this runs, the `project-context` agent gathers the
context your new capability needs whenever a fresh clone is initialised, and
`update-project-context` can revise it later.

You maintain the DATA that drives the interview — the questions manifest
`ai/context/questions.json` — never the interviewer agents themselves. That
split is the point: the interviewers stay generic; only the manifest changes as
capabilities come and go.

## When to use

Right after you author `ai/capabilities/<name>/` for something that only works if
the operator supplies repo-specific context up front — e.g. a skill that needs
an external API base URL, a domain the agent must respect, or a convention unique
to this repo. **If your capability needs no init-time context, skip this
entirely** — most don't.

## Steps

1. **Confirm the capability exists** at `ai/capabilities/<name>/` (or is a
   documented rule). If not, tell the operator to author it first and stop.
2. **Read `ai/context/questions.json`.** If it's missing or not valid JSON,
   STOP and say so — do not recreate it from memory or clobber it.
3. **Decide what to ask.** Identify the init-time context the capability cannot
   work without. Draft one short question per fact (answerable in a sentence or a
   short list), then confirm the wording with the operator before writing.
4. **Add an entry under `capabilities.<name>`** — an array of question objects,
   each matching the shape of the existing `seed` entries exactly:
   - `id` — unique, kebab-case,
   - `target` — which `targets` bucket the answer is written to: `purpose`,
     `features`, or `rules`. Add a new bucket only if genuinely needed; if you
     do, ALSO add it to the manifest's top-level `targets` map (with the source
     file it writes to) — `project-context` and `update-project-context` read
     that map to know where each answer lives, so a bucket missing from it has
     no home.
   - `prompt` — the question text,
   - `required` — bool,
   - optional `list: true` for one-bullet-per-line answers.
5. **Keep it valid JSON.** Preserve the `$comment`, `version`, `targets`, and
   `seed` keys; only extend `capabilities`. Do not reorder or drop existing
   entries. If a `capabilities.<name>` entry already exists, MERGE new questions
   in (dedupe by `id`) rather than overwriting it.
6. **Bump `version`** only if you changed the manifest's SHAPE (new `targets`
   bucket or new question field) — not for merely adding questions.
7. **No `ai:sync` needed.** `questions.json` is NOT consumed by `ai-build.mjs`
   (it reads only `ai/shared` + `ai/capabilities`), so editing it never touches
   the generated files and never trips the drift gate. Just save it.
8. **Don't commit** — the human commits.

## Example entry

```json
"capabilities": {
  "payments-audit": [
    {
      "id": "payments-provider",
      "target": "rules",
      "prompt": "Which payments provider does this repo integrate (Stripe, Adyen, …)? The payments-audit skill needs it to know which webhook signatures to check.",
      "required": true
    }
  ]
}
```

## Report back

Close with a short, scannable summary the operator can eyeball — one line per
question added:

- `<id>` → target `<bucket>` — required/optional — "<prompt, trimmed>"

Then state that these will be asked on the next fresh clone (via
`project-context`) and that they should review and commit `questions.json`.

## Guardrails

- Only edit `ai/context/questions.json`. Do not touch capability bodies, the
  generated files, or `ai/shared/`.
- Don't add questions that duplicate the `seed` set or restate a house standard —
  the manifest is for capability-SPECIFIC context only.
- If a capability is later deleted, remove its `capabilities.<name>` entry too.
  `project-context` already skips questions for absent capabilities, so a stale
  entry is harmless but untidy — prune it when you notice.