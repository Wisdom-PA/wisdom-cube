# Frontend testing expectations (a11y + i18n)

This document is the canonical checklist for what the **next-frontend** stack expects
to be tested. It applies to every component in `components/**` and to page-level
flows under `app/**` and `e2e/`.

**Locales in scope:** English (`en`) and Cymraeg (`cy`) only.

---

## How testing is layered

| Layer | Where | What it catches |
|-------|--------|-----------------|
| **Story suites** | `Name.stories.test.tsx` via `runStandardStorySuites` | axe violations, EN+CY renders, keyboard reachability, accessible error wiring, per-story role/label assertions |
| **Storybook (dev)** | `Name.stories.tsx` + `@storybook/addon-a11y` | Same stories, axe in the Storybook UI during development |
| **Unit tests** | `Name.test.tsx`, `hooks/*.test.ts` | Component behaviour, validation, interactions (RTL `getByRole` / `getByLabelText`) |
| **i18n gate** | `pnpm run i18n:check` | Hardcoded user-facing JSX strings (must use `useTranslations()` keys in EN + CY catalogs) |
| **E2E smokes** | `e2e/*.spec.ts` | Critical user journeys across pages (locale switching, forms, navigation) |
| **Manual** | Before merge / release | Screen-reader walks, zoom, high-contrast, journey edge cases automation cannot cover |

Every component ships the mandatory folder shape:

`Name/{Name.tsx, Name.test.tsx, Name.stories.tsx, Name.stories.test.tsx, hooks/}`

Reference implementation: `components/atoms/Button/Button.stories.test.tsx`.

### Story suite API

```typescript
import { runStandardStorySuites } from '@/lib/storyTests';
import * as stories from './MyComponent.stories';

describe('MyComponent stories', () => {
  runStandardStorySuites(stories, {
    renderAssertions: { Default: () => { /* EN role/label queries */ } },
    cyAssertions: { Default: () => { /* Welsh copy when using useTranslations() */ } },
    errorStories: ['WithError'],
    skipKeyboard: ['Skeleton'],
  });
});
```

---

## Legend

| Tag | Meaning |
|-----|---------|
| **Story** | Covered by `runStandardStorySuites` (every story, unless opted out) |
| **Unit** | Covered by colocated `*.test.tsx` — author must add assertions |
| **E2E** | Covered by Playwright smokes for critical flows |
| **Lint** | Enforced by `pnpm run i18n:check` or Biome a11y rules |
| **Manual** | Human verification required |
| **N/A** | Out of scope for this stack, page-level only, or not applicable to EN/CY |

---

## Accessibility expectations

### Keyboard and focus

| Expectation | Story | Unit | E2E | Manual |
|-------------|:-----:|:----:|:---:|:------:|
| Keyboard-only navigation works for every interactive element | ✓ | ✓ | ✓ | |
| Tab order is logical and matches visual order | partial | ✓ | ✓ | ✓ |
| No keyboard traps exist | partial | | ✓ | ✓ |
| All functionality reachable without a mouse | ✓ | ✓ | ✓ | |
| Focus is always visible | | ✓ | | ✓ |
| Focus indicator easy to see against background | partial | | | ✓ |
| Focus does not disappear after dialogs, menus, or page changes | | | ✓ | ✓ |
| Custom shortcuts do not conflict with assistive-tech shortcuts | | | | ✓ |

**Story suite notes:** Tab reachability and `.focus()` checks run on every story
except those listed in `skipKeyboard` (e.g. skeleton-only stories).

### Page structure and semantics

| Expectation | Story | Unit | E2E | Manual |
|-------------|:-----:|:----:|:---:|:------:|
| Skip links present and work | N/A | N/A | ✓ | ✓ |
| Page regions properly labelled for quick navigation | N/A | N/A | ✓ | ✓ |
| Headings form a sensible hierarchy | N/A | N/A | ✓ | ✓ |
| Interactive controls use semantic HTML where possible | ✓ | ✓ | | |
| Buttons trigger actions; links navigate (roles not swapped) | ✓ | ✓ | ✓ | |
| All controls have clear accessible names | ✓ | ✓ | | |
| Tables use proper headers and structure | | ✓ | | |
| Data tables not used for layout | | ✓ | | |
| Page title reflects page purpose | N/A | N/A | ✓ | ✓ |
| Reading order matches intended order | partial | | ✓ | ✓ |
| Page structure understandable when CSS disabled | N/A | N/A | | ✓ |
| Content still makes sense when images disabled | N/A | N/A | | ✓ |
| No duplicate IDs | ✓ | ✓ | | |
| Hidden content truly hidden from assistive technology | ✓ | ✓ | | |
| Off-screen content not accidentally focusable | ✓ | | | |

**Story suite notes:** axe catches many semantic/ARIA issues; `renderAssertions`
must use `getByRole` / `getByLabelText` (never `getByTestId` as the primary query).

### Forms and validation

| Expectation | Story | Unit | E2E | Manual |
|-------------|:-----:|:----:|:---:|:------:|
| Labels programmatically associated with form fields | ✓ | ✓ | ✓ | |
| Placeholder not used as the only label | ✓ | ✓ | | |
| Required fields identified clearly | | ✓ | ✓ | |
| Error messages visible and associated with the relevant field | ✓ | ✓ | ✓ | |
| Error messages explain how to fix the problem | | ✓ | | ✓ |
| Validation does not rely on colour alone | partial | ✓ | | ✓ |
| Success, warning, and error states not conveyed by colour alone | partial | ✓ | | ✓ |
| Form instructions clear (not implied by appearance only) | | ✓ | | |
| Field grouping for related radios/checkboxes | | ✓ | | |
| Forms submittable with Enter when expected | | ✓ | ✓ | |
| Form controls have accessible help text when needed | | ✓ | | |
| Inputs use correct `autocomplete` values where appropriate | | ✓ | | |
| Inline validation does not interrupt screen-reader flow excessively | | | ✓ | ✓ |
| Error prevention for important submissions | | | ✓ | ✓ |
| File upload has accessible instructions and error handling | | ✓ | ✓ | |

**Story suite notes:** Stories named in `errorStories` must expose `role="alert"`,
`aria-invalid="true"`, and `aria-describedby` pointing at the alert element.

### Visual perception and motion

| Expectation | Story | Unit | E2E | Manual |
|-------------|:-----:|:----:|:---:|:------:|
| Text has sufficient contrast with background | partial | | | ✓ |
| Icons and graphical controls have sufficient contrast | partial | | | ✓ |
| Content usable at 200% zoom without loss of functionality | N/A | N/A | | ✓ |
| Content reflows on small screens without horizontal scrolling (unless necessary) | N/A | N/A | ✓ | ✓ |
| Text spacing can be increased without breaking layout | N/A | N/A | | ✓ |
| Users can pause, stop, or hide moving/blinking/auto-updating content | | ✓ | ✓ | |
| Motion does not trigger vestibular discomfort where avoidable | | ✓ | | ✓ |
| Color themes including dark mode remain accessible | N/A | N/A | | ✓ |

**Story suite notes:** axe checks some contrast rules in jsdom (with known
limitations — manual high-contrast verification still required).

### Media and images

| Expectation | Story | Unit | E2E | Manual |
|-------------|:-----:|:----:|:---:|:------:|
| Images that convey information have meaningful alt text | ✓ | ✓ | | |
| Decorative images ignored by assistive technology | ✓ | ✓ | | |
| Complex images have text alternatives or adjacent explanations | | ✓ | | ✓ |
| Video has captions when speech is present | N/A | N/A | | ✓ |
| Audio has transcripts when needed | N/A | N/A | | ✓ |
| Video has audio description or equivalent when necessary | N/A | N/A | | ✓ |
| Canvas or SVG content has a text equivalent | | ✓ | | ✓ |
| Animated charts or dashboards have accessible alternatives | | ✓ | | ✓ |

### Links and language

| Expectation | Story | Unit | E2E | Manual |
|-------------|:-----:|:----:|:---:|:------:|
| Link text makes sense out of context | | ✓ | | ✓ |
| Link purpose clear from text or surrounding context | | ✓ | ✓ | |
| Repeated link text to different destinations is distinguishable | | ✓ | ✓ | |
| Page language set correctly | N/A | N/A | ✓ | |
| Language changes within the page marked correctly | | ✓ | ✓ | |

### ARIA and dynamic content

| Expectation | Story | Unit | E2E | Manual |
|-------------|:-----:|:----:|:---:|:------:|
| ARIA used correctly and only when native HTML is insufficient | ✓ | ✓ | | |
| ARIA roles, states, and properties are valid | ✓ | | | |
| ARIA labels do not hide useful visible text | | ✓ | | ✓ |
| Live regions announce updates appropriately | | ✓ | ✓ | ✓ |
| Dynamic content changes announced when needed | | ✓ | ✓ | ✓ |
| Status messages exposed to assistive technology | | ✓ | ✓ | |
| Toast notifications announced appropriately | | ✓ | ✓ | ✓ |
| Real-time updating UI has manual refresh or pause options | | ✓ | | ✓ |

### Complex widgets and patterns

| Expectation | Story | Unit | E2E | Manual |
|-------------|:-----:|:----:|:---:|:------:|
| Custom controls behave like native ones | ✓ | ✓ | ✓ | |
| Modal dialogs trap focus and restore it on close | | | ✓ | ✓ |
| Menus, tabs, accordions, popups follow expected interaction patterns | ✓ | ✓ | ✓ | |
| Custom dropdown behaves like a real combobox or listbox | ✓ | ✓ | ✓ | |
| Carousel can be paused and controlled by keyboard | | ✓ | ✓ | |
| Image gallery has accessible navigation and context | | ✓ | ✓ | |
| Breadcrumb trail semantically structured | | ✓ | ✓ | |
| Cookie banner keyboard accessible and not blocking essential actions | N/A | N/A | ✓ | ✓ |
| Chat widget keyboard accessible and screen-reader friendly | | ✓ | ✓ | ✓ |
| Map has alternate text, list, or search-based access | | ✓ | | ✓ |
| Chart or visualization includes data labels or a summary | | ✓ | | ✓ |
| Drag-and-drop alternatives exist when drag is used | | ✓ | | ✓ |
| Inline editing experience is keyboard accessible | | ✓ | ✓ | |
| Data grid supports keyboard navigation if interactive | | ✓ | ✓ | |
| "Read more" expansion exposes state and purpose | | ✓ | | |
| Tooltips accessible by keyboard and touch | | ✓ | ✓ | |
| Multi-step process has clear progress indication | N/A | N/A | ✓ | |
| Multi-step process allows review before final submission | N/A | N/A | ✓ | |
| Destructive action has clear confirmation and accessible undo if feasible | | | ✓ | ✓ |

### Touch, mobile, and input modalities

| Expectation | Story | Unit | E2E | Manual |
|-------------|:-----:|:----:|:---:|:------:|
| Touch targets large enough and spaced well | partial | | ✓ | ✓ |
| Interactive elements have adequate target size and spacing | partial | | ✓ | ✓ |
| Device orientation changes do not break the experience | N/A | N/A | ✓ | ✓ |
| Content usable with screen readers | ✓ | ✓ | ✓ | ✓ |
| Content usable with screen magnifiers | N/A | N/A | | ✓ |
| Content usable with speech input | N/A | N/A | | ✓ |
| Content usable with switch devices where applicable | N/A | N/A | | ✓ |
| Third-party widgets accessible or have accessible alternatives | | | ✓ | ✓ |

### Auth, time limits, and session

| Expectation | Story | Unit | E2E | Manual |
|-------------|:-----:|:----:|:---:|:------:|
| Authentication flows accessible (including MFA) | N/A | N/A | ✓ | ✓ |
| CAPTCHA alternatives available if a challenge is used | N/A | N/A | | ✓ |
| reCAPTCHA or bot check has an accessible fallback | N/A | N/A | | ✓ |
| Time limits can be extended, adjusted, or avoided | N/A | N/A | ✓ | ✓ |
| Timeouts and session expirations announced clearly | N/A | N/A | ✓ | ✓ |
| Accessibility preserved after login and after state changes | N/A | N/A | ✓ | ✓ |

### Manual testing practices (required for critical journeys)

| Practice | When |
|----------|------|
| Screen-reader testing on critical user journeys | Before merging features that change core flows |
| Keyboard-only testing on critical journeys | Before merging features that change core flows |
| Testing at common zoom levels (100%, 200%, 400%) | Before release |
| High-contrast settings testing if relevant | Before release |
| Error recovery paths tested | When adding/changing validation or error UI |
| Empty, loading, disabled, and success states tested | Every component with those states (stories + unit) |
| Success confirmation perceivable | Unit + manual |

Automation catches obvious regressions; **manual screen-reader testing is not
optional** for critical paths.

---

## Internationalisation expectations (EN + CY)

### Copy and catalogues

| Expectation | Story | Unit | E2E | Lint | Manual |
|-------------|:-----:|:----:|:---:|:----:|:------:|
| UI language can be switched correctly | ✓ | ✓ | ✓ | | |
| No hardcoded English strings in the UI | | | | ✓ | |
| No hardcoded text in images where it should be localizable | | | | | ✓ |
| All user-facing strings externalized | | | | ✓ | |
| Every key exists in **both** `messages/en.json` and `messages/cy.json` | ✓ | ✓ | | ✓ | |
| Translator context provided for ambiguous strings | | | | | ✓ |
| Same source string not incorrectly reused in different contexts | | | | | ✓ |
| Fallback language behaviour works as expected | N/A | N/A | ✓ | | ✓ |
| Localized content complete — no fallback strings in shipped locale | ✓ | | ✓ | | ✓ |
| Error, validation, empty-state, and onboarding copy localized | ✓ | ✓ | ✓ | ✓ | |
| Notifications and emails localize correctly | N/A | N/A | | | ✓ |
| Help content and support flows localize correctly | N/A | N/A | ✓ | | ✓ |

**Story suite notes:** Every story renders in `en` and `cy`. Components using
`useTranslations()` must add `cyAssertions` with Welsh strings from
`messages/cy.json`.

### Locale metadata and direction

| Expectation | Story | Unit | E2E | Manual |
|-------------|:-----:|:----:|:---:|:------:|
| Language metadata present and correct | N/A | N/A | ✓ | |
| Text direction metadata present and correct | N/A | N/A | ✓ | |
| Mixed-language content renders correctly | | ✓ | ✓ | |
| Unsupported locales fail gracefully | N/A | N/A | ✓ | |
| Language negotiation follows user preference | N/A | N/A | ✓ | |
| Browser, OS, and in-app locale settings respected | N/A | N/A | ✓ | |

**Note:** Cymraeg and English are both LTR. RTL layout mirroring is **N/A** for
the current locale set but remains relevant if additional locales are added later.

### Formatting and parsing

| Expectation | Story | Unit | E2E | Manual |
|-------------|:-----:|:----:|:---:|:------:|
| Date formats render correctly per locale | | ✓ | ✓ | |
| Time formats render correctly per locale | | ✓ | ✓ | |
| Time zones handled correctly | N/A | N/A | ✓ | |
| Daylight saving transitions handled correctly | N/A | N/A | | ✓ |
| Relative dates ("today", "tomorrow") localize correctly | | ✓ | | |
| Number formatting follows locale conventions | | ✓ | ✓ | |
| Decimal and thousand separators correct | | ✓ | | |
| Currency symbols, placement, rounding, and minor units correct | | ✓ | ✓ | |
| Measurement and temperature units localize correctly | | ✓ | | |
| Date, number, and currency parsing matches user locale | | ✓ | ✓ | |
| Exported/imported files preserve locale formatting | N/A | N/A | | ✓ |
| PDFs or generated documents localize correctly | N/A | N/A | | ✓ |
| Data entered in one locale displayed in another correctly | N/A | N/A | ✓ | |
| Locale-specific sorting in tables verified | N/A | N/A | ✓ | |
| Locale-specific pagination and formatting consistent | N/A | N/A | ✓ | |

### Pluralization, grammar, and text layout

| Expectation | Story | Unit | E2E | Manual |
|-------------|:-----:|:----:|:---:|:------:|
| Pluralization rules work for each supported locale | | ✓ | | ✓ |
| Gender variants supported where needed | | ✓ | | ✓ |
| Long translations do not break layouts | ✓ | | ✓ | ✓ |
| Short translations do not leave awkward gaps or clipped controls | ✓ | | | ✓ |
| Pseudolocalization does not break the app | N/A | N/A | | ✓ |
| Typography and spacing survive translation expansion | ✓ | | | ✓ |
| Text truncation does not lose meaning or critical data | | ✓ | | |
| Line breaking and hyphenation work for supported scripts | N/A | N/A | | ✓ |
| Text wrapping works for long words | | ✓ | | |
| Locale-specific punctuation preserved | | ✓ | | |
| Local conventions for capitalization respected | | | | ✓ |

### Forms and regional input

| Expectation | Story | Unit | E2E | Manual |
|-------------|:-----:|:----:|:---:|:------:|
| Address formats accept regional variation | N/A | N/A | ✓ | |
| Name fields support different cultural naming patterns | | ✓ | ✓ | |
| Telephone number formats support local conventions | | ✓ | ✓ | |
| Postal code formats localized or flexible | | ✓ | ✓ | |
| Calendar systems supported when relevant | N/A | N/A | | ✓ |
| Input methods work for IMEs and complex scripts | N/A | N/A | | ✓ |
| Accent and dead-key input work | N/A | N/A | | ✓ |
| Copy/paste works across scripts | N/A | N/A | | ✓ |
| Keyboard shortcuts work on international keyboards | N/A | N/A | | ✓ |
| Shortcut conflicts tested against non-US layouts | N/A | N/A | | ✓ |
| Character encoding UTF-8 throughout | N/A | N/A | | ✓ |
| File names with non-Latin characters work | N/A | N/A | | ✓ |
| URLs with international characters work | N/A | N/A | ✓ | |
| Search/filtering handles Unicode normalization | N/A | N/A | ✓ | |
| Search respects locale-aware case folding | N/A | N/A | ✓ | |
| Collation behaves properly for accented characters | N/A | N/A | ✓ | |
| Locale-specific fonts render required scripts | N/A | N/A | | ✓ |
| Missing glyphs do not cause broken UI | N/A | N/A | | ✓ |

### Cultural review

| Expectation | Manual |
|-------------|:------:|
| Images, icons, colours, symbols, and gestures culturally appropriate | ✓ |
| Idioms, slang, and culturally specific references removed or localized | ✓ |
| Cultural assumptions in workflows validated | ✓ |
| Local legal or regulatory text adaptable where needed | ✓ |
| Localized content reviewed by native speakers when possible | ✓ |

### Recommended locale test matrix

Test with representative locales — not just one translated language:

| Scenario | Locale(s) |
|----------|-----------|
| Default LTR | `en` |
| Secondary shipped locale | `cy` |
| Long strings (layout stress) | `cy` (often longer than EN for the same key) |
| Complex plural rules | Add when a locale with non-trivial plurals is shipped |
| Non-Latin script | N/A until such a locale is added |
| Different date/number/currency conventions | Verify when formatting utilities are introduced |

---

## Quality gates (must pass before merge)

```sh
cd stacks/next-frontend
pnpm run lint          # Biome (includes some a11y lint rules)
pnpm run typecheck
pnpm run test          # ≥90% coverage; story suites included
pnpm run i18n:check    # no hardcoded user-facing strings
pnpm run test:e2e      # when touching critical flows
```

---

## Related references

- Story suite implementation: `stacks/next-frontend/lib/storyTests/`
- Component scaffolding: `/new-component` (`.claude/commands/new-component.md`)
- Frontend conventions: `AGENTS.md` § Frontend
- Audit trail for introduction of story suites: `docs/audit-trail/2026-07-21_story-a11y-i18n-tests.md`
