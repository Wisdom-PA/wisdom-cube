# Cursor modes, prompts, and indexing

This document covers how Cursor **indexes** your codebase, which **modes** to
use for different tasks, and how to write **prompts** that get good results.
General usage comes first; company-specific practice for skeleton repos is at
the end.

For controlling what Cursor indexes, see [cursor-ignore.md](./cursor-ignore.md).
For rules, skills, and workflows, see
[cursor-rules-skills-agents-workflows.md](./cursor-rules-skills-agents-workflows.md).

---

## The big picture

Cursor does not see your whole company by default. It works from three inputs:

| Input | What it provides |
| --- | --- |
| **Index** | Semantic search over your codebase — "how does X work?" |
| **Context you attach** | Exact files, folders, or docs via `@` mentions |
| **Mode** | What the AI is allowed to do — read-only, plan, or edit and run commands |

```
Indexing (background)     ──►  semantic search, @Codebase
        +
Context you attach        ──►  @Files, @Folders, @Docs
        +
Mode you choose           ──►  Ask / Plan / Agent / Tab / Inline Edit
        =
Quality of the response
```

Better indexing plus specific context plus the right mode beats a vague prompt
every time.

---

## Indexing

### What it is for

**Indexing** builds a searchable map of your codebase. Cursor chunks your
source into meaningful blocks (functions, classes, logical sections), converts
each chunk into a vector embedding, and stores the results. When you or Agent
search, your query is matched against those embeddings — finding code by
*meaning*, not just exact text.

Indexing powers:

- Semantic search in Agent
- `@Codebase` mentions in chat
- More accurate Tab completions
- "How does X work?" questions across large repos

Agent also uses **grep** and **file reads** alongside the index. For specific
symbols it greps; for concepts it searches semantically; for complex
exploration it chains both.

### How indexing works

1. **Starts automatically** when you open a workspace
2. **Becomes useful at ~80%** — semantic search is available before the index
   is fully complete, but wait for 100% before relying on broad `@Codebase`
   queries in large repos
3. **Stays current** — Cursor syncs changed files in the background (typically
   every few minutes)
4. **Respects ignore files** — `.gitignore`, `.cursorignore`, and
   `.cursorindexingignore` all affect what gets indexed

Check progress and trigger a manual re-index under **Cursor Settings →
Indexing**.

### When to re-index

Re-index after:

- Cloning a repo for the first time (wait for the initial index to finish)
- Adding or editing `.cursorignore` or `.cursorindexingignore`
- Large structural changes (major refactors, new packages in a monorepo)
- Search results that feel stale or irrelevant

### What affects index quality

| Factor | Effect |
| --- | --- |
| Opening the right folder | Index only covers the opened workspace root |
| Ignore files | Excluding `node_modules/`, `dist/`, secrets keeps the index lean |
| Repo size | Very large repos take longer; ignore noisy generated output |
| Monorepo scope | Opening one package indexes less — faster, but less cross-package context |

### Indexing vs ignore files

| Need | File |
| --- | --- |
| Full detail on ignore files | [cursor-ignore.md](./cursor-ignore.md) |
| Block secrets from all AI access | `.cursorignore` |
| Exclude noisy files from search only | `.cursorindexingignore` |
| Files git should not track | `.gitignore` (Cursor also respects this) |

---

## Modes

Cursor offers several interaction modes. They differ in **what the AI can do**,
not in which model runs. Pick the mode before you start — switching mid-task is
fine, but starting in the right mode saves rework.

### Mode overview

| Mode | Can edit files | Can run terminal | Best for |
| --- | --- | --- | --- |
| **Ask** | No | No (read-only) | Understanding code, architecture questions |
| **Plan** | No (until you build) | Research only | Designing before implementation |
| **Agent** | Yes | Yes (with approval) | Implementation, fixes, running tests |
| **Tab** | Inline suggestions | No | Autocomplete as you type |
| **Inline Edit** (`Cmd+K` / `Ctrl+K`) | Selected region only | No | Small, focused edits in one file |

Switch between Ask, Plan, and Agent with **Shift+Tab** or the mode picker in
the chat input.

### Ask

**What it is for:** exploring and understanding code without risk of changes.

Use Ask when you:

- Are new to a codebase ("how does auth work?")
- Want an architecture explanation
- Need a review or opinion without edits
- Are researching before deciding what to build

Ask searches the index and reads files but does not edit or run commands.

### Plan

**What it is for:** designing an approach before any code is written.

Plan mode researches the codebase, asks clarifying questions, and produces a
reviewable implementation plan. You edit the plan, then click to build when
ready.

Use Plan when:

- The task touches many files or systems
- Requirements are unclear
- There are multiple valid approaches with trade-offs
- You want to review the approach before Agent implements it

For quick, familiar tasks, skip Plan and go straight to Agent.

If Agent builds the wrong thing, revert and refine the plan rather than
patching through follow-up prompts — often faster and cleaner.

### Agent

**What it is for:** getting work done — edits, multi-file changes, terminal
commands, test runs.

Agent can search, read, edit, and run shell commands (you approve terminal
actions). It creates **checkpoints** before significant changes so you can roll
back.

Use Agent when:

- Implementing a feature or bugfix
- Refactoring across files
- Running `npm test`, `pnpm run lint`, or equivalent
- Scaffolding code

**Review every diff before accepting.** Agent is powerful; you are the reviewer.

### Tab

**What it is for:** inline autocomplete as you type.

Tab suggests the next lines based on your index, open files, and recent edits.
Accept with `Tab`, dismiss with `Esc`. Less dramatic than Agent, but saves time
on boilerplate you would have typed anyway.

### Inline Edit (`Cmd+K` / `Ctrl+K`)

**What it is for:** describing a change to a **selected block** of code and
getting a local edit.

Select code, describe the change, review the diff. Useful for small refactors,
renaming, or rewriting a function — without starting a full Agent session.

### Choosing a mode

| I want to… | Mode |
| --- | --- |
| Understand how something works | Ask |
| Design a multi-file feature before coding | Plan |
| Implement, fix, refactor, or run tests | Agent |
| Complete the line I am typing | Tab |
| Rewrite this one function/selection | Inline Edit |

---

## Prompts

### What makes a good prompt

A prompt is not just a question — it is a brief for a contractor. The AI works
best when it knows:

1. **What** you want (outcome, not just "fix it")
2. **Where** it lives (files, modules, features)
3. **Constraints** (what must not change)
4. **How to verify** (tests, lint, expected behaviour)

Vague prompts produce vague diffs. Specific prompts with attached context
produce usable work.

### `@` mentions — attach context

Type `@` in chat to attach context explicitly:

| Mention | Use when |
| --- | --- |
| `@Files` | You know the exact file(s) |
| `@Folders` | A whole module or feature area |
| `@Codebase` | You need the AI to search the project (best after indexing completes) |
| `@Docs` | Cursor or framework documentation |
| `@Web` | Up-to-date external docs (use sparingly) |

**Habit worth building:** attach the file you are working on *and* one related
file (the test, schema, or parent component). Named paths beat "the checkout
file" from memory.

### Prompt patterns that work

**Scope the problem**

```
❌  Fix the checkout bug

✅  In CheckoutForm.tsx the submit handler returns 400 when the basket has a
    discount code. Expected: 200 with updated total. Check checkout-service.ts
    for the validation logic.
```

**Attach context with `@`**

```
@Files src/routes/items.ts @Files test/items.test.ts
Add a PATCH endpoint for partial updates. Mirror the POST validation pattern.
```

**State constraints**

```
Do not change the API response shape — only fix server-side validation.
```

**Ask for verification**

```
After the change, run the test suite and report any failures.
```

**Break large work up**

```
Step 1: add the schema and failing test only. Stop before implementing the route.
```

Agent handles focused steps better than "rebuild the admin panel."

### Prompts vs skills and workflows

| Approach | When |
| --- | --- |
| Ad-hoc prompt | Quick questions, small edits, one-off tasks |
| Domain skill | "Use the backend-api skill" — repo-specific playbook |
| Slash command | `/ship` — run a defined procedure |
| Orchestration skill | `feature-dev` — full plan → implement → verify loop |

You do not need a skill for every task. Use skills and commands when the repo
ships a playbook for exactly what you are doing.

### What to avoid in prompts

| Avoid | Why |
| --- | --- |
| "Just make it work" | No constraints → wrong patterns, scope creep |
| Pasting a stack trace with no file | Attach the source and the failing test |
| Asking Agent to read `.env` | Secrets should never enter AI context |
| Accepting large diffs unread | Review like a PR author; run tests |
| One giant prompt for a huge feature | Plan first, or break into steps |

---

## How indexing, modes, and prompts work together

```
1. Open the repo (right folder) → indexing starts
2. Wait for index (large repos) → @Codebase becomes reliable
3. Pick a mode:
      understand?  → Ask
      design?      → Plan
      implement?   → Agent
4. Write a prompt:
      attach @Files / @Folders for known scope
      use @Codebase for discovery
      state constraints and how to verify
5. Review output → run tests → iterate or accept
```

| Situation | Indexing | Mode | Prompt tip |
| --- | --- | --- | --- |
| New starter exploring a service | Wait for index | Ask | "Walk me through how auth works end to end" |
| Multi-file feature | Index + `@Folders` on the module | Plan → Agent | Define "done" and constraints before building |
| Focused bugfix | `@Files` on source + test | Agent | Expected vs actual behaviour |
| Boilerplate in one file | N/A | Tab or Inline Edit | Select the block, describe the change |
| "Where is X defined?" | Index ready | Ask or Agent | `@Codebase` or name the module |

---

## Company practice — skeleton repos

### Indexing in our repos

- **Open the repository root** (folder with `package.json`) unless you only
  work in one package — see [cursor-ignore.md](./cursor-ignore.md) for monorepo
  scope
- **Confirm `.cursorignore` exists** — skeleton repos should ship one; it
  excludes secrets, `node_modules/`, build output, and local scratch paths
- **Re-index after ignore file changes**
- Generated AI config (`AGENTS.md`, `.cursor/rules/`, `.claude/`) should stay
  **indexed** — the AI needs it. Do not add it to `.cursorignore`

### Modes in our workflow

| Task | Our practice |
| --- | --- |
| Understanding a new repo | **Ask** — read `AGENTS.md` first, then explore features |
| Non-trivial feature or bugfix | **Plan** then **Agent** — the `feature-dev` skill drives this loop |
| Scaffolding standard code | **Agent** with `/new-endpoint` or `/new-component` |
| Pre-PR verification | **Agent** with `/ship` |
| Quick single-file tweak | **Inline Edit** or **Agent** with `@Files` |

The `feature-dev` skill explicitly starts in Plan mode: design → goal →
checklist → approval → test-first implementation → `/ship` → review.

### Prompts in our workflow

Our repos ship context the AI reads automatically — use it, do not repeat it
from memory:

| Source | What it gives the AI |
| --- | --- |
| `AGENTS.md` | Conventions, gates, feature map — always on |
| `.cursor/rules/` | Stack-specific patterns when editing matching files |
| Skills | Playbooks for backend, frontend, review, shipping |

**Prompt habits that match our standards:**

```
Follow feature-dev for this work.
```

```
Use the backend-api skill. @Files src/routes/items.ts
Add GET /items/:id. Do not change the error envelope shape.
Run pnpm run test when done.
```

```
Do not hand-edit AGENTS.md — if AI config needs changing, edit ai/ and
pnpm run ai:sync.
```

**Gates to ask for explicitly:**

```
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
```

Or use `/ship` to run the full gate across every stack in the repo.

**Non-trivial work** should also follow our audit trail practice
(`docs/audit-trail/`) — Agent can help draft the entry; you commit it with the
code.

### Day-one checklist

- [ ] Open the repository root and wait for indexing to finish
- [ ] Read `AGENTS.md` before your first Agent session
- [ ] Try **Ask** on one feature before using **Agent** for edits
- [ ] Practice `@Files` — attach context instead of describing paths from memory
- [ ] Use **Plan** or `feature-dev` for multi-file work
- [ ] Run `/ship` before opening a PR
- [ ] Review every Agent diff; never accept blind
- [ ] Confirm `.cursorignore` is in place (see [cursor-ignore.md](./cursor-ignore.md))

### Common mistakes

| Mistake | Better approach |
| --- | --- |
| Using Agent before the index finishes | Wait for indexing; use `@Files` for known paths meanwhile |
| Broad `@Codebase` queries in a huge repo | `@Folders` on the module, or open the package subfolder |
| Jumping to Agent for a large feature | Plan first, or invoke `feature-dev` |
| Vague prompts with no `@` context | Attach files; describe expected vs actual |
| Not asking for gates | `/ship` or explicit `pnpm run test` / `lint` |
| Pasting secrets into chat | Never — use `.env.example` as reference only |
| Ignoring `AGENTS.md` conventions the AI missed | Point at `AGENTS.md` or an existing example file |

### References

- [cursor-ignore.md](./cursor-ignore.md) — indexing boundaries
- [cursor-rules-skills-agents-workflows.md](./cursor-rules-skills-agents-workflows.md) — rules, skills, agents
- `AGENTS.md` — project briefing in your repo
- [Cursor docs — Agent overview](https://cursor.com/docs/agent/overview)
- [Cursor docs — Semantic search](https://cursor.com/docs/agent/tools/search)
- [Cursor docs — Plan mode](https://cursor.com/docs/agent/plan-mode)
