# Working practices

## Side effects — before making changes

When modifying code, always consider what else your change touches:

- **Callers and imports** — search for usages before changing a signature;
  check what depends on the code being changed.
- **Tests** — will existing tests break; do they need updating to stay aligned
  with the implementation? If tests don't exist for what you're changing,
  create them when justified.
- **Schemas & generated docs** — request/response changes happen in the Zod /
  Pydantic schemas (validation AND OpenAPI derive from them — never edit the
  spec or validation separately).
- **README** — update it when a change adds features, configuration, or setup
  requirements.
- Run the affected gates after changes to catch unintended breakage.

## Audit trail

All non-trivial change sets are logged in `docs/audit-trail/`, one Markdown
file per related set of changes, named `YYYY-MM-DD_short-description.md`.

- **Start** a non-trivial task (multi-file change, refactor, feature) by
  creating the entry with a checklist of planned work; tick items off and add
  discovered work as you go — it gives the human visibility during the task.
- **Finish** by completing the entry; ask the user before considering the task
  complete ("ready for me to finalize the audit trail entry?"). Never silently
  skip it. If today's entry exists and is unpushed, update it instead of
  creating a new file.
- Each entry contains: date/time; the checklist; files created/updated/deleted;
  a summary of what changed and why; side effects considered; issues spotted
  during implementation; and a **Deployment Checklist** — unchecked `[ ]` items
  for whoever deploys: env vars to add/change (exact names), migrations to run
  and what they do, data backfills, fields/behaviours to verify post-deploy,
  and smoke tests. Omit categories that don't apply rather than writing "N/A".
- The audit file is committed BY THE USER along with the code — never run git
  commit/push yourself.

## Frontend handoff notes

When a backend change affects an external consumer contract (new endpoint,
request/response shape change, validation rule change, new error code, renamed
field), write a paste-ready handoff note in `docs/notes-for-fe/` named
`YYYY-MM-DD_short-description.md`. Self-contained and consumer-friendly:
endpoint + method, example request/response JSON (with new fields explained),
validation rules to mirror, and error cases (status + when) to handle.
Internal-only changes (refactors, BE-only renames, infra) do NOT need a note;
ask the user first if it isn't obviously consumer-facing.

## Communication

- Explain concepts readably; use a real-world analogy when it genuinely helps.
- When you disagree with an approach, argue back with reasons and offer an
  alternative — but only for genuine concerns, not minor preferences.

## Stability & input paranoia

- Be paranoid about changes that could take the service down: consider edge
  cases, handle errors, never introduce paths that throw uncaught in production.
- Never trust client-side data: validate and sanitise all input at the schema
  boundary; guard against the OWASP Top 10 (the ORM/driver parameterises SQL —
  never interpolate it yourself).
- Never read `.env*` files (secrets) and never search or read `node_modules/`.
