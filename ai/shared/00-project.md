# wisdom-cube

This repository was generated from the company skeleton (factory baseline). It
carries the house standards for its selected stack(s), a single-source AI
config (`ai/` → generated `AGENTS.md`, `.claude/`, `.cursor/`), and CI gates
that enforce both.

- Deploy target: none (on-device / LAN API gateway; not cloud Fargate by default).
- Every task runs through `pnpm run <task>` (Python tasks wrap `poetry run`).
- Branch flow: `anywhere → staging → main` (squash into staging, merge into main),
  enforced by the committed rulesets in `.github/rulesets/`.
