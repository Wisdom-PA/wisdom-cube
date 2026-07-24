Judge whether a change to the **Next.js (App Router) frontend** carries adequate,
behavior-asserting tests. Be STRICTLY READ-ONLY: never edit files; never stage,
commit, or push; never run the dev server, Storybook, or the test suites. Your
only output is a clear verdict the author can act on.

This repo does NOT use a `tests/unit | tests/integration | tests/e2e` folder
pyramid. Frontend tests are **colocated** and driven by three mechanisms, under a
hard **≥90% coverage gate** (`vitest.config.ts` thresholds):

- **Colocated unit tests** — `Name.test.tsx` beside the component (and
  `hooks/*.test.ts`, `lib/*.test.ts`, `env.test.ts`).
- **Stories-as-fixtures** — every component ships `Name.stories.tsx`, and a
  `Name.stories.test.tsx` calls `runStandardStorySuites` from `@/lib/storyTests`
  (see `components/atoms/Button/Button.stories.test.tsx`). Story coverage
  equals component coverage, and the same stories feed the Storybook a11y (axe)
  checks. A component missing its stories/stories-test is a coverage gap.
- **Playwright E2E** — `e2e/*.spec.ts` smokes critical user paths (not every
  page — key flows), APIs mocked/self-contained.

Judge against THAT model, not a folder taxonomy.

> **Scope & related skills.** This skill judges test adequacy for the
> `next-frontend` stack only. For backends use `test-coverage-review-ts` /
> `test-coverage-review-py`. For broad correctness / project-wide impact use
> `pr-review`; for dependency-bump-only PRs use `dependabot-review`. For the
> atomic-tier / i18n / layering standards audit, the `standards-check` agent
> complements this skill.

## 1. Establish the change under review

- Default to the current branch vs main:
  `git fetch origin main --quiet` (best effort), then
  `git diff --stat origin/main...HEAD` and `git diff origin/main...HEAD`. Fall
  back to `main...HEAD`, or `staging...HEAD` if named. Honour any base branch, PR
  number, or commit range the user supplies.
- Bucket the changed files: components/hooks/lib source, test files
  (`*.test.tsx`, `*.stories.test.tsx`, `*.stories.tsx`, `e2e/*.spec.ts`), and
  non-code (docs, `messages/*.json`, config, generated AI config).

## 2. Decide what coverage the change actually needs (apply judgment)

- **Exempt** (state why): docs-only, comments, pure formatting, type-only,
  config with no behaviour, generated files. Note that `messages/en.json` /
  `messages/cy.json` are gated by `pnpm run i18n:check`, not by unit tests.
- **A new/changed component** needs its **colocated `*.test.tsx` AND its
  `*.stories.tsx` + `*.stories.test.tsx`** (the mandatory folder shape:
  `Name/{Name.tsx, Name.test.tsx, Name.stories.tsx, Name.stories.test.tsx,
  hooks/}`, plus `Name.skeleton.tsx` only when it sits behind a concurrent load).
- **A new/changed hook** needs a `hooks/*.test.ts`.
- **A new critical user flow** (a form submission, a multi-step journey) needs a
  Playwright `e2e/*.spec.ts` smoke.

## 3. What counts as a good test here

- **Test behavior via user-facing queries**: RTL `getByRole` / `getByLabelText`
  inside `renderAssertions` / `cyAssertions` passed to `runStandardStorySuites`
  (as `ContactForm.stories.test.tsx` does — `getByLabelText('Name')`,
  `getByRole('button', { name: 'Send message' })`), NOT `getByTestId` or internal
  state. Snapshots are not a primary assertion.
- **Standard story suites**: every `*.stories.test.tsx` should call
  `runStandardStorySuites` so axe, EN+CY locale renders, keyboard reachability,
  and `errorStories` wiring are not skipped.
- **Stories cover the meaningful states**: e.g. Default, a Failing/error state,
  and (for a lazy component) the Skeleton — each rendered and asserted by the
  stories-test.
- **Forms**: assert the RHF+Zod validation behaviour (error shown on invalid
  input, submit wired to the server action) using the schema shared with the
  server (`contactFormSchema.ts`).
- **Deliberate coverage boundaries — do NOT flag these as missing unit tests**:
  `app/**` (pages/layouts) and `*.lazy.tsx` are intentionally excluded from unit
  coverage in `vitest.config.ts` and deferred to Playwright/build. Pages hold no
  logic (they compose components + server-fetch), so logic belongs in the
  component/hook and is tested there.

## 4. The coverage gate

The bar is the **≥90% global threshold** in `vitest.config.ts` (`pnpm run test`
runs `vitest run --coverage` and fails below it). The FE trap: because stories
are rendered by the stories-test, story coverage == component coverage — so a
component with rich stories but a thin `*.test.tsx` can still be WEAK if no
assertion touches the changed behaviour. Verify the tests reference the changed
component/hook.

## 5. Classify each required area PASS / MISSING / WEAK

- **PASS** — a test actually exercises the changed component/behaviour; name the
  file and the specific `it(...)`.
- **MISSING** — required for this change but absent (e.g. new component with no
  stories-test; new flow with no e2e smoke).
- **WEAK** — a test exists but doesn't cover the changed path (renders but
  asserts nothing on the new state; happy-path only; uses non-user queries).

## 6. Output format

**Verdict: PASS ✅ / CHANGES REQUESTED ❌**

**Change summary** — 1–2 lines: what the diff does and the coverage it needs.

**Coverage**

| Area | Status | Evidence / gap |
|------|--------|----------------|
| Colocated unit (`*.test.tsx`) | PASS / MISSING / WEAK / N/A | `…/Name.test.tsx` — … |
| Stories + stories-test (composeStories) | … | `…/Name.stories.test.tsx` — … |
| Hooks (`hooks/*.test.ts`) | … | … |
| E2E (Playwright `e2e/`) | … | needed only for a critical flow |

**Required before merge** — concrete gaps: which test/story to add, in which
file, and what it must assert (with the user-facing query to use). Omit if PASS.

**Notes** — quality flags, or "none". Watch for: implementation-coupled queries
(`getByTestId`); snapshot-as-primary assertion; a missing error or skeleton story
state; hardcoded strings that should be translation keys; a new async UI with no
loading/error boundary.

Cite file paths (and line numbers where useful). If an area is legitimately not
needed, mark it **N/A** and explain why rather than failing the change. Do not
give an approve/merge decision beyond the coverage verdict — the user decides.
Read-only throughout: never edit, stage, run, or commit.