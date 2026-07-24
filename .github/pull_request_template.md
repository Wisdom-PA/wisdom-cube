## What

<!-- One or two sentences: what does this PR change and why. -->

## How to verify

<!-- Commands or steps a reviewer can run. CI must be green (ci-required + ai-config-drift). -->

## Checklist

- [ ] Conventional-commit title (enforced by commitlint locally)
- [ ] Tests added/updated; coverage stays ≥90%
- [ ] No hand-edits to generated files (`AGENTS.md`, `.cursor/`, generated `.claude/` capabilities) — edit `ai/shared/` or `ai/capabilities/` and run `pnpm run ai:sync`
- [ ] No hardcoded user-facing strings (frontend: all copy through `useTranslations()` keys, EN + CY)
