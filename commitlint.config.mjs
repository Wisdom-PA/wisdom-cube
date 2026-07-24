// Single line on purpose: indentation-neutral across the backend (2-space) and
// frontend (4-space) Biome profiles this file can end up under after init.
// Enforces `type(monday-ticket-id): message`, e.g. `feat(1234567890): add login flow`.
// The ticket id is the numeric suffix of a monday.com item URL, 9-11 digits long.
// Commits/branches with no parent ticket use the literal scope `Headless` instead,
// e.g. `chore(Headless): tidy up deps`.
const SCOPE_PATTERN = /^(\d{9,11}|Headless)$/i;

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
          const message = 'scope must be the monday.com ticket number (9-11 digits) or "Headless"';
          if (scope == null) return [false, message];
          const pattern = value instanceof RegExp ? value : new RegExp(value);
          return [pattern.test(scope), message];
        },
      },
    },
  ],
};
