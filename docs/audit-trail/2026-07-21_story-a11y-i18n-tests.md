# 2026-07-21 Story a11y and i18n test suites

## Checklist

- [x] Add `lib/storyTests` utilities (`runStandardStorySuites`, axe, EN/CY locale, keyboard)
- [x] Wire `vitest-axe` into `vitest.setup.ts`
- [x] Update Storybook preview locale toolbar + test locale state
- [x] Migrate all `*.stories.test.tsx` to standard suites
- [x] Update `new-component` / frontend testing docs in `ai/` and sync
- [x] Verify `pnpm run test`, lint, typecheck, `i18n:check` in next-frontend
- [x] Fix CI: pnpm audit (brace-expansion override), remove `.pnpm-store` from git, bump Biome 2.5.4

## Summary

Introduced `runStandardStorySuites` so every component's story tests automatically
run axe, bilingual (EN + CY) renders, keyboard reachability, and accessible error
wiring. Updated `/new-component` guidance with the a11y/i18n checklist split into
automated vs manual follow-ups (screen reader walks, zoom, page-level landmarks).

CI fixes: added `brace-expansion >=2.1.2` override in `pnpm-workspace.yaml`
(pnpm 11 canonical location) to clear the high-severity audit finding on ts-backend;
removed accidentally committed `.pnpm-store/`; aligned Biome package + schema to 2.5.4;
updated `prune.mjs` to propagate overrides into bootstrapped repos. Excluded
`lib/storyTests` and test files from the Next.js `tsconfig.json` (production build
was typechecking Vitest-only APIs); added `tsconfig.test.json` for the typecheck gate.
Workspace scaffold: inline biome/tsconfig into `apps/web` and `services/api` (fix
`writeJson` relative path bug); harden Biome scripts with `--no-errors-on-unmatched`;
CI poetry step uses `env use python` after setup-python.

## Files

- `stacks/next-frontend/lib/storyTests/*` (new)
- `stacks/next-frontend/components/**/*.stories.test.tsx` (updated)
- `stacks/next-frontend/.storybook/preview.tsx`, `vitest.setup.ts`, `vitest.config.ts`
- `stacks/next-frontend/tsconfig.json`, `tsconfig.test.json`, `package.json`
- `pnpm-workspace.yaml`, `package.json`, `.gitignore`, `scripts/prune.mjs`
- `packages/config/biome.base.json`, `stacks/*/biome.json`, `stacks/*/package.json` (Biome 2.5.4)
- `ai/capabilities/new-component/body.md`, `frontend-components/body.md`, `test-coverage-review-fe/body.md`
- `ai/shared/20-testing.md`, `ai/shared/32-stack-next.md`
- Generated: `AGENTS.md`, `.claude/*`, `.cursor/rules/next-frontend.mdc`

## Deployment Checklist

- [ ] No env vars or migrations
