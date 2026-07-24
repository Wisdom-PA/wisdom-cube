# 2026-07-07 — Fix package-selection init (crash + generated-repo defects)

**Date/time:** 2026-07-07

Testing the new package init option (`bb5bd9f`) in a fresh clone crashed with
`Cannot read properties of undefined (reading 'svc')` and, once past that, the
generated repos failed their own quality gates. This change set fixes the init
wiring for both package stacks and the defects in the package stack content,
verified by running full inits + all five gates end-to-end in scratch copies.

## Checklist

- [x] Fix the `.svc` crash: `composeYaml` skips stacks with no `DEV` entry
      (packages have no server → no compose service, no `Dockerfile.dev`)
- [x] Harden `devScript` the same way; workspace `package.json` omits `dev`
      when nothing has a dev server
- [x] Branch hoisted config-inlining on stack kind, not `=== 'py-backend'`
      (py-package was getting Biome/tsconfig instead of `ruff.toml` — ENOENT)
- [x] Branch hoisted lefthook lint hook on kind (py-package was getting a
      Biome pre-commit hook with Biome not installed)
- [x] Reject `--select package:ts,package:py` (both hoist would collide; a repo
      has ONE package language, mirroring the one-backend rule)
- [x] Tighten `--db` guard + `computePlan`'s db target to real backends only
      (`--db package:ts` previously scaffolded Drizzle into a library)
- [x] Substitute `cube` at init: rename the literal `cube/`
      module dir and add the token (kebab→snake) to `replaceTokens` call sites
- [x] `tsup.config.ts`: `declaration: true` → `dts: true` (`declaration` is not
      a tsup option — builds "passed" while silently emitting NO `.d.ts`,
      with `package.json#types` pointing at a missing file)
- [x] ts-package example test: nodenext-required `.js` import extensions +
      Biome import ordering
- [x] py-package sources: single quotes (house Ruff style), drop unused
      `import pytest`
- [x] Biome folder-ignore patterns in `inlineBiome`: drop `/**` suffix
      (Biome ≥2.2 warns on it; affects all hoisted node inits)
- [x] Bootstrap next-steps: detect Python by stack kind so py-package repos are
      told to `poetry install`

## Files updated

- `scripts/prune.mjs` — composeYaml/devScript package awareness; kind-based
  config-inlining and lefthook lint; `computePlan` backend tightening;
  `cube` dir rename + token; Biome ignore patterns
- `scripts/bootstrap.mjs` — two-package rejection; `--db` backend guard;
  kind-based next-steps
- `scripts/tokens.mjs` — `REPO_SLUG` in the standalone runner + header comment
- `stacks/ts-package/tsup.config.ts` — `dts: true`
- `stacks/ts-package/test/example.test.ts` — import extensions/order
- `stacks/py-package/cube/__init__.py` — quote style
- `stacks/py-package/tests/test_example.py` — quote style, unused import

## Side effects considered

- Server-stack inits unchanged: re-verified `backend:ts,frontend --db`
  (workspace) — `dev` script, compose with `postgres`/`api`/`web`/`migrate`
  all as before. Kind-based branches resolve identically for the three
  server stacks.
- `inlineBiome` pattern change affects every hoisted node init (not just
  packages); validated via the ts-package gate run (0 warnings).
- No consumer-facing API surface → no `docs/notes-for-fe/` note.

## Verification (scratch clones, full init + gates)

- `package:ts` → init ✔, `pnpm install`, `format`, then lint / format:check /
  typecheck / test / build all ✔; `dist/` now contains `index.d.ts` +
  `index.d.cts`.
- `package:py` → init ✔ (module dir `pypkg_test`, tokens substituted in
  `pyproject.toml`/tests/AGENTS.md), `poetry install`, all gates ✔.
- `backend:ts,frontend --db` → regression ✔.
- `package:ts,package:py` and `--db --select package:ts` → rejected with
  clear errors ✔.

## Issues spotted during implementation

- A scratch copy without `.git` makes every `pnpm run <task>` fail via
  pnpm's deps-status check re-running `prepare` (`lefthook install` needs a
  git repo). Test-setup artifact only — any real clone has `.git`.
- The `package-test` clone that hit the original crash is half-initialized
  (root configs rewritten, deletes never ran, sentinel intact). Reset or
  re-create it from the updated branch before re-testing.

## Deployment Checklist

- [ ] Push `package-option`; re-create the test repo from the updated branch
      and re-run `node scripts/bootstrap.mjs` for `package:ts` and
      `package:py` on a real clone (smoke test).
- [ ] After merge to `main`, template-generated repos pick the fix up
      automatically — no other action.
