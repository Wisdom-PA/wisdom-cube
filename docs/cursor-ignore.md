# Cursor ignore files

This document covers `.gitignore`,
`.cursorignore`, and `.cursorindexingignore` — what each one does, how they
differ, and what to put in them.

---

## Why these files matter

Cursor indexes your codebase to power semantic search, Agent, Tab, Inline Edit,
and `@` mentions. Not everything in a project should be indexed or visible to
the AI:

- **Security** — env files and credentials must not enter AI context
- **Performance** — skipping `node_modules/` and build output speeds indexing
- **Search quality** — generated artefacts drown out relevant source code

Ignore files are how you draw those boundaries. Every repo should have a
committed `.cursorignore`; add `.cursorindexingignore` when you need finer
control.

---

## The three layers

These files look similar but govern different tools. The most common mistake is
treating them as interchangeable.

| File | Governs | Blocks indexing | Blocks AI read / `@` mentions | Blocks git commits |
| --- | --- | --- | --- | --- |
| `.gitignore` | Git | Indirectly — Cursor also respects it | No | Yes |
| `.cursorignore` | Cursor (all AI features) | Yes | Yes | No |
| `.cursorindexingignore` | Cursor (indexing only) | Yes | No — files stay readable | No |

### `.gitignore` — version control

Tells git which files to exclude from commits. Every developer already knows
this one.

```
.env
node_modules/
dist/
```

Cursor **also** reads `.gitignore` when building its index, so git-ignored
files are often skipped automatically. But `.gitignore` alone does **not** stop
Agent or `@` mentions from reading a file on disk — for that you need
`.cursorignore`.

### `.cursorignore` — hard AI block

Files listed here are invisible to Cursor: not indexed, not searchable, not
readable by Agent/Tab/Inline Edit, and not `@`-mentionable.

Use for anything the AI should **never** see:

- Secrets and env files
- Credential keys and JSON
- Anything where exposure to an LLM is unacceptable

### `.cursorindexingignore` — indexing-only block

Files listed here are **excluded from the index and semantic search**, but
remain readable by Agent and available via `@Files`.

Use for files that are safe to read but harmful to index:

- Large fixture trees you occasionally debug against
- Recorded E2E artefacts
- Vendored or generated code you sometimes inspect but never want polluting search

**Rule of thumb:** start with `.cursorindexingignore` when tuning performance.
Promote a path to `.cursorignore` only when the AI should never see it.

### What Cursor already ignores

On top of your project files, Cursor applies a [built-in default
list](https://cursor.com/docs/reference/ignore-file): lockfiles, binaries,
media, `node_modules/`, `.venv/`, `.git/`, and more. You do not need to
duplicate every default entry — focus on paths specific to your repo.

---

## Choosing the right file

| Scenario | File |
| --- | --- |
| File should never be committed | `.gitignore` |
| Secret or credential — AI must never read it | `.gitignore` **and** `.cursorignore` |
| Build output or dependency cache | `.gitignore` **and** `.cursorignore` (recommended) |
| Large test fixtures — safe to read, bad for search | `.cursorindexingignore` |
| Legacy package you rarely touch but sometimes `@`-mention | `.cursorindexingignore` |
| Unsure whether AI should see it | `.cursorindexingignore` first (reversible) |

### Side-by-side example

```
# .gitignore — don't commit these
.env
dist/
coverage/

# .cursorignore — AI must never see these (includes everything above, plus)
.env
.env.*
!.env.example
**/*.pem
**/credentials.json
secrets/

# .cursorindexingignore — keep out of search, still readable
tests/fixtures/
e2e/recordings/
**/generated/
```

In practice, sensitive and generated paths appear in **both** `.gitignore` and
`.cursorignore`. `.cursorindexingignore` holds the performance-tuning paths
that are safe to read.

---

## Setting up `.cursorignore`

### Where to put it

Create `.cursorignore` in the **repository root** (same level as `package.json`).
Commit it so every teammate and fresh clone inherits the same boundaries.

### Syntax

Identical to `.gitignore`:

```sh
# Comments start with #
dist/              # directory
*.log              # extension
**/secrets/        # nested paths
!important.log     # negation — re-include a previously ignored match
```

Test a pattern locally:

```sh
git check-ignore -v path/to/file
```

### Apply changes

After editing `.cursorignore` or `.cursorindexingignore`, re-index:
**Cursor Settings → Indexing → Reindex**.

### Global ignores (optional, per developer)

For patterns across all projects on your machine (e.g. `**/.env`), add them
under **Cursor Settings → Indexing → Ignore Files → Global Ignore**. Keep
team-wide rules in the committed repo file.

### Hierarchical ignore (monorepos)

Enable **Hierarchical Cursor Ignore** under **Cursor Settings → Indexing →
Ignore Files** (Cursor 3.11+: moved from Editor settings). Cursor will also
read `.cursorignore` files in parent directories — useful when you open a
single package (`apps/web/`) instead of the monorepo root.

---

## What to put in `.cursorignore`

### Security — always block

`.cursorignore` is a safety layer, not a substitute for keeping secrets out of
the working tree. Store real credentials in your deploy environment or secrets
manager.

```
# Environment and local overrides
.env
.env.*
!.env.example

# Keys and credential files
**/*.pem
**/*.key
**/id_rsa
**/credentials.json
**/secrets.json
**/service-account*.json
secrets/
```

### Dependencies and caches

Cursor skips most of these by default, but listing them explicitly makes intent
clear:

```
node_modules/
.venv/
__pycache__/
.pnpm-store/
```

### Build and test artefacts

Generated output adds token noise without helping the AI understand your code.
These mirror what we exclude in `.gitignore`:

```
dist/
build/
.next/
out/
storybook-static/
coverage/
.coverage
htmlcov/
.pytest_cache/
.mypy_cache/
.ruff_cache/
playwright-report/
test-results/
*.tsbuildinfo
```

### Local scratch work

```
docs/plans/
```

`docs/plans/` is git-ignored in skeleton repos for ephemeral planning notes.
Keep it out of the AI index too.

### Repo-specific additions

After init, add paths unique to your service:

- Large binary or media assets checked into the repo
- Exported database dumps or CSV snapshots
- Third-party SDK trees vendored inside `src/`
- Personal experiment directories that are not part of the product

---

## What to put in `.cursorindexingignore`

Only for files that are **safe to read** but **harmful to index**:

```
# Large fixture trees — still @-mentionable when debugging a test
tests/fixtures/
e2e/recordings/

# Generated code you sometimes inspect but never want in semantic search
**/generated/
openapi.json          # if regenerated on every build

# Legacy packages you rarely touch
packages/legacy/
```

**Do not** put secrets here. Indexing-only ignores still allow Agent and `@`
mentions to read the file.

---

## What you usually do *not* need to ignore

Duplicating Cursor's built-in defaults is harmless but adds noise:

- `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`
- `.git/`
- Images, PDFs, archives

**Keep indexed** — the AI needs these:

- Application source code and tests
- Schemas, API routes, and components
- `docs/audit-trail/` — useful project history

Avoid blanket ignores (`**/*.test.ts`, entire `legacy/` trees) unless the team
has explicitly accepted worse search results.

---

## Starter template

Copy into `.cursorignore` at the repo root and trim or extend for your service:

```sh
# --- Security (hard block) ---
.env
.env.*
!.env.example
**/*.pem
**/*.key
**/credentials.json
**/secrets.json
secrets/

# --- Dependencies & caches ---
node_modules/
.venv/
__pycache__/

# --- Build & test artefacts ---
dist/
build/
.next/
out/
storybook-static/
coverage/
.coverage
htmlcov/
.pytest_cache/
.mypy_cache/
.ruff_cache/
playwright-report/
test-results/
*.tsbuildinfo

# --- Local scratch (git-ignored) ---
docs/plans/
```

Add a `.cursorindexingignore` alongside it if you have large safe-to-read
directories that pollute search.

---

## Limitations

1. **Not full access control.** Cursor blocks ignored files from indexing and
   most AI features, but Agent **terminal and MCP tools** can still read paths
   on disk. Never rely on `.cursorignore` alone to protect secrets in the repo.

2. **LLM unpredictability.** Cursor documents that complete protection is not
   guaranteed. Treat ignore files as defence in depth alongside env-based
   secrets and pre-commit scanning (gitleaks in our repos).

3. **Negation patterns.** You cannot re-include a nested file if its parent
   directory is excluded with `*`. See the
   [official docs](https://cursor.com/docs/reference/ignore-file) for
   workarounds.

4. **Re-index after changes.** Edits to ignore files do not always apply until
   you refresh the index.

---

## Checklist

Use when setting up a new repo or onboarding to an existing one:

- [ ] Confirm `.cursorignore` exists at the repo root; create one if missing
- [ ] Block `.env*` (except `.env.example`), keys, and credential JSON
- [ ] Mirror build/test artefact paths from `.gitignore`
- [ ] Add `.cursorindexingignore` if large safe-to-read directories pollute search
- [ ] Commit both files to the repo
- [ ] Re-index in Cursor after initial setup or edits
- [ ] Optionally set global ignores for personal machine-wide patterns

---

## Common mistakes

| Mistake | Fix |
| --- | --- |
| Only using `.gitignore` and assuming the AI cannot read those files | Add sensitive paths to `.cursorignore` for a hard block |
| Putting secrets in `.cursorindexingignore` instead of `.cursorignore` | Promote secrets to `.cursorignore` — indexing-only still allows reads |
| Putting everything in `.cursorignore` when you still need `@`-mention access | Use `.cursorindexingignore` for large fixtures and generated code |
| Ignoring all tests or legacy code without team agreement | Keep source and tests indexed unless the trade-off is deliberate |
| Editing ignore files but not re-indexing | **Settings → Indexing → Reindex** after every change |
| Treating `.cursorignore` as a secrets vault | Keep real credentials out of the repo entirely |

---

## References

- [Cursor docs — Ignore file](https://cursor.com/docs/reference/ignore-file)
- Repo `.gitignore` — baseline for generated and local-only paths
- `SECURITY.md` — secrets policy
