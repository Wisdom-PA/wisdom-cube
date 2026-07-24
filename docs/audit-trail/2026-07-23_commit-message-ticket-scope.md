# 2026-07-23 Commit message ticket-scope enforcement + monday.com PR linking

## Checklist

- [x] Confirm this repo enforces commit messages via lefthook + commitlint (not husky)
- [x] Update `commitlint.config.mjs` to require `type(scope): message`
- [x] Scope must be a monday.com ticket id (9-11 digits, numeric suffix of the item URL)
- [x] Add `Headless` (case-insensitive) as the scope for commits/branches with no parent ticket
- [x] Verify pass/fail cases directly with `pnpm exec commitlint`
- [x] Add `scripts/monday-pr-comment.mjs`: extract ticket ids from PR commits,
      resolve via monday.com GraphQL API, upsert one sticky PR comment
- [x] Add `.github/workflows/monday-link.yml` (informational, not a required check)
- [x] Verify extraction/rendering logic locally (dedupe, Headless-only, unresolved id)
- [x] Update `CLAUDE.md` notes
- [ ] Finalize this entry (after user confirms)

## Summary

Tightened the repo's commit-message contract so every commit must declare a scope:
either the numeric monday.com ticket id it's tied to, or the literal `Headless`
(any casing) when there's no parent ticket. Implemented as a custom `scope-format`
commitlint rule (`/^(\d{9,11}|Headless)$/i`) layered on top of the existing
`@commitlint/config-conventional` type list, plus `scope-empty: never` so the
parens can't be omitted. Enforcement path is unchanged — lefthook's `commit-msg`
hook already runs `commitlint --edit`, so no hook wiring changes were needed.

Examples:
- `feat(1234567890): add login flow` — passes
- `chore(Headless): tidy up deps` — passes (any casing of "Headless")
- `fix(123): ...` — rejected, scope too short
- `feat: ...` — rejected, scope missing entirely

Second half: since tickets now live in commit scopes, added automation to
surface working monday.com links on the PR itself rather than requiring
manual copy-paste — several boards exist, so the board id per ticket can't be
guessed and is resolved via the monday.com GraphQL API (`items(ids: [...])`
→ `board.id`) rather than assumed from a single hardcoded board. Runs on every
`pull_request` push, reads every commit on the PR (not just HEAD, since a PR
branch may carry several commits against different tickets before it's
squashed), dedupes ticket ids, and upserts (find-by-HTML-comment-marker,
edit-in-place) a single sticky comment rather than reposting on every push.
If every commit on the PR is scoped `Headless`, it still posts a comment
explicitly stating no ticket was referenced (chosen over staying silent, for
auditability). Deliberately NOT added to `.github/rulesets/*.json` as a
required check — informational only, should never block a merge (e.g. if the
monday.com API is briefly down).

## Files

- `commitlint.config.mjs` — added `scope-empty`, `scope-format` rules + custom plugin rule
- `scripts/monday-pr-comment.mjs` (new) — extraction + monday.com resolution + comment upsert logic
- `.github/workflows/monday-link.yml` (new) — triggers the script on PR events
- `CLAUDE.md` — Claude-only notes describe the new workflow/script pairing

## Deployment Checklist

- [ ] Env vars/secrets to add (GitHub, NOT `.env`): organization-level secret
      `MONDAY_API_TOKEN` (generate in monday.com: avatar → Administration →
      API, or profile → Developer) and organization-level variable
      `MONDAY_WORKSPACE_SUBDOMAIN` (value: `genius274529`) — set at the GitHub
      **organization** level (Org Settings → Secrets and variables → Actions),
      NOT per-repo, so every repo cloned from this skeleton inherits both with
      no additional setup.
- [ ] No migrations or data backfills.
- [ ] Post-deploy smoke test: open a PR with a commit like
      `feat(1234567890): ...` against a real monday.com item id and confirm
      the `monday-link` workflow posts a comment with a working link; push a
      second commit and confirm the SAME comment updates rather than a new
      one appearing; open a PR with only `Headless`-scoped commits and confirm
      the "no ticket referenced" comment appears.
- [ ] Contributors on this branch should be aware new commits must include a
      monday.com ticket id or `Headless` in parens after the commit type.
