# Testing

- **Unit tests**: Vitest (TS/frontend, Jest-compatible API) / pytest (Python),
  both configured with a **≥90% global coverage** threshold that fails the run.
  Coverage must assert meaningful behavior, not just execute lines.
- **Test behavior, not implementation**: RTL user-facing queries (`getByRole`,
  `getByLabelText`) on the frontend; API/service-surface tests on backends.
  Snapshots are not a primary assertion.
- **Repository layers are mockable** so services test without a live DB.
- **Stories-as-fixtures** — every component ships `Name.stories.tsx`, and a
  `Name.stories.test.tsx` calls `runStandardStorySuites` from `@/lib/storyTests`
  (composeStories render + axe + EN/CY locale + keyboard checks). Story coverage
  equals component coverage, and the same stories feed the Storybook a11y (axe)
  addon in dev.
- **E2E**: Playwright smokes critical user paths when a frontend is present
  (mocked APIs when the frontend stands alone). Not every page — key flows.
- **Ops behaviors are tested, not assumed**: SIGTERM drain, error-envelope
  byte-parity, /docs gating, and metrics labels all have dedicated tests —
  keep them green when touching those layers.
- Run everything: `pnpm run test` (per stack or from the repo root).
