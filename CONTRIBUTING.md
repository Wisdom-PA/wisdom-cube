# Contributing

## To the skeleton (this repo)

- Branch flow is `anywhere → staging → main`: feature branches PR into `staging`
  (squash merge), `staging` PRs into `main` (merge commit). Direct pushes to
  either are blocked by the committed rulesets in `.github/rulesets/`.
- Conventional commits are enforced (commitlint via lefthook). Run
  `pnpm install` once — the `prepare` script installs the git hooks.
- Every stack under `stacks/` must stay independently green:
  lint + format-check + typecheck + tests (≥90% coverage) + build.
- **Never hand-edit generated files** (`AGENTS.md`, `.cursor/rules/`, generated
  `.claude/` capabilities). Edit `ai/shared/` or `ai/capabilities/` and run
  `pnpm run ai:sync`. CI fails on drift.

## To a repo generated from the skeleton

Same rules apply — the tooling travels with the clone. The one-time
branch-protection apply step is documented in the README.
