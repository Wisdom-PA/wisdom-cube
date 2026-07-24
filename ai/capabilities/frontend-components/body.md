The frontend authoring standard for this repo. The full rule prose lives in
AGENTS.md (§ Frontend) — this skill is the working checklist.

- **Creating a component:** work through the checklist below, then run the gates
  under Verification and report the results.
- **Reviewing a component:** check the code against these rules and report gaps
  as a short, scannable list — one line each: **severity** (Blocker for a
  CI/reviewer-catchable break like a hardcoded string or missing i18n key;
  Minor/Nit for style), `file:line`, the rule broken, and the fix. Report only;
  don't edit. For a full change-set review defer to `review-changes`; for a
  coverage pass/fail defer to `test-coverage-review-fe`.

## When touching or creating a component

- Place it in the right atomic tier (`components/{atoms,molecules,organisms,templates}/`);
  imports only flow from lower tiers. Pages (`app/**`) compose — no logic.
- Every component keeps the mandatory colocated shape:
  `Name/{Name.tsx, Name.test.tsx, Name.stories.tsx, Name.stories.test.tsx, hooks/}`
  (+ `Name.skeleton.tsx`/`Name.lazy.tsx` only behind concurrent loads).
  Missing files in this shape are a defect — create them, don't skip them.
- Named exports; filename matches the component; one component per folder.
  Non-trivial logic moves to a `useX` hook in the component's `hooks/`.

## Hard rules the reviewer/CI will catch

- No hardcoded user-facing strings: `useTranslations()` keys present in BOTH
  `messages/en.json` and `messages/cy.json` (`pnpm run i18n:check`).
- Forms = React Hook Form + Zod with the schema shared to the server action.
- `'use client'` at the lowest leaf only; data fetching stays server-side.
- Tailwind only (variants via CVA + `cn()`); no inline styles or raw hex/px
  design tokens; use `next/image|font|link|script` over raw elements.
- Env access only via `env.ts`; only `NEXT_PUBLIC_*` may reach the client.
- Inputs have labels (`TextField`/`TextArea` own the a11y wiring — reuse them);
  interactive elements keyboard-operable; every component has a story.
- Story tests call `runStandardStorySuites` from `@/lib/storyTests` (axe, EN+CY
  render, keyboard reachability, accessible error wiring).
- Async boundaries need BOTH loading and error states.

## Verification

`pnpm run lint && pnpm run typecheck && pnpm run test && pnpm run i18n:check && pnpm run build`
must pass with ≥90% coverage before the work is done. (`build` catches the
server/client boundary breakage that lint and typecheck miss.)