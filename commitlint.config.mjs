// Single line on purpose: indentation-neutral across the backend (2-space) and
// frontend (4-space) Biome profiles this file can end up under after init.
// Wisdom does not use monday.com. Commit scope must be the literal `Headless`,
// e.g. `feat(Headless): add status route`.
const SCOPE_PATTERN = /^Headless$/i;

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-empty': [2, 'never'],
    'scope-case': [0],
    'scope-format': [2, 'always', SCOPE_PATTERN],
  },
  plugins: [
    {
      rules: {
        'scope-format': ({ scope }, _when, value) => {
          const message = 'scope must be "Headless" (monday.com integration is not used)';
          if (scope == null) return [false, message];
          const pattern = value instanceof RegExp ? value : new RegExp(value);
          return [pattern.test(scope), message];
        },
      },
    },
  ],
};
