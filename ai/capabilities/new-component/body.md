Scaffold a new component with the full mandatory folder shape. `Button` (atom),
`TextField`/`TextArea` (molecules) and `ContactForm` (organism, with lazy +
skeleton) are the reference implementations — mirror them.

Full a11y + i18n testing expectations (automated vs manual): see
`docs/frontend-testing-expectations.md`.

Ask (if not given): component name (PascalCase), atomic tier
(atom / molecule / organism / template), whether it renders user-facing copy,
and whether it loads behind a concurrent/lazy boundary. If the answers make the
tier wrong (e.g. an "atom" that fetches data or composes other components),
say so and propose the right tier before scaffolding.

Create under `components/<tier>s/<Name>/`:

1. `<Name>.tsx` — named export, declarative; props typed; variants via CVA +
   `cn()`; only import from LOWER tiers. Add `'use client'` only if it needs
   state/effects/handlers — and keep it at this leaf, not the page.
2. `<Name>.test.tsx` — Vitest + RTL behavior tests using role/label queries
   (render with `NextIntlClientProvider` + `messages/en.json` if it translates).
3. `<Name>.stories.tsx` — CSF3, `satisfies Meta<typeof Name>`, one story per
   meaningful state (Default, error/disabled/loading variants where relevant).
   Stories feed Storybook's axe addon **and** the vitest story suites.
4. `<Name>.stories.test.tsx` — import `* as stories` and call
   `runStandardStorySuites(stories, options)` from `@/lib/storyTests`. Add
   `renderAssertions` per story (role/label queries), `cyAssertions` when the
   component uses `useTranslations()`, `errorStories` for field-error variants,
   and `skipKeyboard` for skeleton-only stories.
5. `hooks/use<Name>X.ts` — only if the component has non-trivial logic; the
   component stays declarative.
6. `<Name>.skeleton.tsx` + `<Name>.lazy.tsx` — ONLY if flagged as behind a
   concurrent load; the skeleton mirrors the real layout dimensions.

## A11y authoring (component + stories)

Automated in every `*.stories.test.tsx` via `runStandardStorySuites`:

- axe violations fail CI (`vitest-axe`)
- interactive elements are keyboard reachable (focus + tab)
- form error stories expose `role="alert"`, `aria-invalid`, and `aria-describedby`
- semantic roles/names checked through RTL `getByRole` / `getByLabelText`

Still manual for page-level or journey-level checks: skip links, landmark
structure, heading hierarchy, modal focus traps, screen-reader walkthroughs,
200% zoom, high-contrast themes, and CAPTCHA/MFA alternatives.

Component rules the suites assume:

- buttons trigger actions; links navigate — never swap roles
- every control has a visible, programmatically associated name
- placeholders are not the only label; required fields are marked clearly
- errors explain how to fix the problem and are not conveyed by colour alone
- decorative images/icons use `aria-hidden`; informative images have `alt`
- custom widgets mirror native interaction (combobox, tabs, dialog patterns)
- focus stays visible (`focus-visible:` utilities) and is not removed after actions

## i18n authoring (EN + CY only)

Automated gates:

- `pnpm run i18n:check` — no hardcoded user-facing JSX copy
- `runStandardStorySuites` renders every story in **en** and **cy** (Storybook
  `locale` global via `NextIntlClientProvider`)

Add `cyAssertions` when the component reads `useTranslations()` so Welsh copy
is asserted (`getByRole` / `getByLabelText` with `messages/cy.json` strings).
Every new translation key belongs in **both** `messages/en.json` and
`messages/cy.json`.

Still manual: native-speaker review, pseudolocalization stress runs, locale
date/number/currency formatting when you add them, and Playwright smokes for
locale switching across pages.

Copy rules: every user-facing string is a `useTranslations()` key added to BOTH
`messages/en.json` and `messages/cy.json` — never hardcode. Ask for the Welsh;
if it isn't available, add a placeholder value in `cy.json` and list that key in
the final report so the human can commission the translation. Inputs get labels;
interactive elements are keyboard-operable with visible focus.

Finish by running `pnpm run lint`, `pnpm run typecheck`, `pnpm run test` and
`pnpm run i18n:check`. Fix what they surface and re-run until all four pass with
coverage ≥90%. If a gate genuinely can't be made green, STOP and report the exact
failure — never leave the tree lint- or coverage-red.

Report back, as skimmable markdown:

- One-line summary (component name + tier + what it does).
- The files created (a small tree under `components/<tier>s/<Name>/`).
- Gate status — one line each for lint / typecheck / test (with coverage %) /
  i18n:check, marked PASS or FAIL; paste the failing lines only when a gate FAILS.
- Any `cy.json` keys awaiting Welsh translation.

Do not touch generated AI-config files.