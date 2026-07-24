# Cursor rules, skills, agents, workflows, and hooks

This document explains Cursor's persistent AI guidance layers: **rules**,
**skills**, **agents**, **workflows**, and **hooks**. Each section covers what
the concept is for and how you use it. Company-specific setup for repos
generated from our skeleton is at the end.

---

## The big picture

Cursor reads your codebase, but it also needs instructions — conventions,
playbooks, guardrails. Five mechanisms layer on top of each other:

| Layer | What it is for | When it applies |
| --- | --- | --- |
| **Project instructions** | Baseline briefing for every session | Always (e.g. `AGENTS.md` at the repo root) |
| **Rules** | Standards scoped to specific files | When matching files are open or in context |
| **Skills** | Reusable playbooks for a class of task | When a task matches the skill, or you invoke one |
| **Agents** | Isolated specialists for focused work | When you dispatch a sub-process and want a report back |
| **Workflows** | Multi-step, repeatable procedures | When you run a slash command or orchestration skill |
| **Hooks** | Scripts that enforce or automate around tool use and commits | Before/after agent actions, or at git commit time |

```
Project instructions     always on
        │
        ├── Rules          file-triggered standards
        ├── Skills         task playbooks (current session)
        ├── Agents         isolated subprocesses → report back
        ├── Workflows      commands + orchestration
        └── Hooks          observe / block / nudge / enforce
```

**Rules and skills tell the AI what to do. Hooks enforce or automate behaviour
around it.** Project instructions sit underneath everything as the always-on
baseline.

---

## Rules

### What they are for

**Rules** carry standards that apply when you work on specific files — stack
conventions, architectural patterns, naming, testing expectations. They prevent
the AI from applying generic advice when your project has explicit patterns.

In Cursor, rules are `.mdc` files under `.cursor/rules/`. Each file has YAML
frontmatter that controls when it fires:

```yaml
---
description: "Backend API conventions"
globs: src/**/*.ts,test/**/*.ts
alwaysApply: false
---
```

| Field | Purpose |
| --- | --- |
| `globs` | Comma-separated file patterns — rule activates when a match is in context |
| `alwaysApply: true` | Rule applies to every session regardless of open files |
| `alwaysApply: false` | Rule applies only when matching files are open or referenced |

### How you use them

You do not `@`-mention rules or invoke them manually. Cursor applies them
automatically when relevant files are in context.

If the AI keeps missing a convention:

1. Check a rule exists for the file type you are editing
2. Confirm your file path matches the rule's `globs`
3. Keep the rule content focused — one stack or concern per file

### Rules vs project instructions

| Put in project instructions (`AGENTS.md`) | Put in a rule |
| --- | --- |
| Applies to every stack and every session | Applies to one stack or file type |
| Project identity, gates, working practices | Patterns triggered by specific source files |
| "We use Conventional Commits" | "Routes are thin — one service call per handler" |

Use rules for **file-triggered** detail that would bloat the global briefing.

---

## Skills

### What they are for

**Skills** are structured playbooks — step-by-step instructions for a class of
task. They turn recurring work ("add an endpoint", "review my changes",
"build a feature properly") into a repeatable procedure the AI can follow.

In Cursor, skills live at `.claude/skills/<name>/SKILL.md` (native support
since Cursor 2.4). Each skill has frontmatter:

```yaml
---
name: backend-api
description: "Use when creating or reviewing backend API code..."
---
```

The `description` is how Cursor decides when a skill is relevant. You can also
steer explicitly: *"use the backend-api skill"* or *"follow feature-dev"*.

### How you use them

| Approach | When |
| --- | --- |
| **Let Cursor pick** | Your request clearly matches a skill's description |
| **Invoke explicitly** | Name the skill in chat when you want a specific playbook |
| **Slash commands** | Some workflows are exposed as `/command` (see Workflows) |

Skills run **in your current conversation** — context accumulates as the AI
works through the steps. They are best for **guiding work you are doing
together** with the AI.

### Skills vs agents

If you want a fresh-eyes review without filling your chat with file exploration,
use an **agent** instead of a skill. Skills collaborate; agents delegate and
report back.

---

## Agents

### What they are for

**Agents** are specialist sub-processes dispatched into an **isolated context**.
They read what they need, do their job, and return a report — without the
file-by-file exploration cluttering your main conversation.

In Cursor, agents live at `.claude/agents/<name>.md` and are exposed via the
Task/subagent mechanism. Frontmatter describes when to dispatch:

```yaml
---
name: code-reviewer
description: "Read-only reviewer. Dispatch when you want a fresh-eyes review..."
tools: Read, Grep, Glob, Bash
---
```

Read-only agents restrict which tools they can use — they report, they do not
edit, commit, or approve on your behalf.

### How you use them

Ask explicitly when you want an isolated specialist:

```
Dispatch the code-reviewer agent on my uncommitted changes.
```

```
Use the standards-check agent on this branch vs main.
```

The agent's report returns to your session (or to the skill that dispatched
it). You decide what to act on.

### Agents vs skills

| | Skill | Agent |
| --- | --- | --- |
| **Context** | Your current chat | Isolated subprocess |
| **Best for** | Guiding implementation | Delegating exploration or review |
| **Output** | Ongoing collaboration | A report |
| **Can edit files** | Yes (unless read-only) | Only if not marked read-only |

Orchestration skills may **dispatch agents** as one step — e.g. implement in the
main session, then send review to an agent so only findings come back.

---

## Workflows

### What they are for

**Workflows** are structured, repeatable procedures — often multi-step, often
touching several parts of the repo. They turn "do the whole thing properly"
into a defined sequence rather than ad-hoc prompting.

Workflows come in two forms:

1. **Commands** — explicit slash-invoked procedures (`/ship`, `/new-endpoint`)
2. **Orchestration skills** — skills that chain steps across other skills,
   agents, and verification gates

### Commands (slash workflows)

Commands are skills marked so they are invoked explicitly, not auto-selected.
In Cursor they appear as `/command` in chat.

Typical uses:

| Command pattern | Purpose |
| --- | --- |
| `/ship` | Run the full quality gate and report blockers |
| `/new-endpoint` | Scaffold a standard API resource |
| `/new-component` | Scaffold a standard UI component |
| `/ai-audit` | Reconcile generated config with its source |

Invoke with the slash prefix. Commands are for **"run this exact procedure
now"** — not open-ended exploration.

### Orchestration workflows

Some skills **are** workflows — they coordinate planning, implementation,
verification, and review:

```
Plan → checklist → implement (test-first) → verify (gates) → review → fix loop
```

Use an orchestration skill when the work is non-trivial and you want the full
loop, not just a single edit.

### Workflows vs skills vs commands

| Situation | Reach for |
| --- | --- |
| Run a defined gate or scaffold | Command (`/ship`, `/new-endpoint`, …) |
| Deliver a feature end to end | Orchestration skill |
| Fix a focused bug in one area | Domain skill (backend, frontend, …) |
| One-off question or small edit | No workflow needed — prompt directly |

---

## Hooks

### What they are for

**Hooks** are scripts that run at defined points in the agent loop or git
lifecycle. They observe, block, or nudge — unlike rules and skills, they do not
tell the AI *what* to do; they *enforce or automate* around tool use and
commits.

Typical uses:

- Block the AI from editing generated or protected files
- Nudge you to regenerate config after editing a source file
- Auto-format after an agent edit
- Gate dangerous shell commands
- Run lint or secret scans at commit time

### Three hook systems — do not mix them up

| System | Config location | When it runs |
| --- | --- | --- |
| **Cursor hooks** | `.cursor/hooks.json` + `.cursor/hooks/*` | Agent, Tab, and workspace events |
| **Claude Code hooks** | `.claude/settings.json` + `.claude/hooks/*` | Before/after Agent tool use |
| **Git hooks** | `lefthook.yml`, Husky, etc. | `pre-commit`, `commit-msg`, … |

They complement each other. Agent-loop hooks are typically **best-effort**;
git hooks and CI are the **real enforcement** that catches bypasses.

### How you use them

As a developer you rarely configure hooks day to day — they are wired into the
repo. What you need to know:

1. **If Agent is blocked from editing a file** — a hook is doing its job; find
   the source file you should edit instead
2. **If you see a nudge after editing config** — run the suggested sync command
   before committing
3. **Pre-commit may modify and re-stage files** — review the staged diff
4. **`git commit --no-verify` bypasses git hooks** — CI may still catch issues

### Cursor hook events

When authoring `.cursor/hooks.json`:

| Event | Use for |
| --- | --- |
| `preToolUse` | Block or allow a tool call before it runs |
| `postToolUse` | Nudge or audit after a tool succeeds |
| `beforeShellExecution` | Gate terminal commands |
| `beforeReadFile` | Control which files Agent can read |
| `afterFileEdit` | Auto-format or lint after Agent edits |
| `subagentStart` / `subagentStop` | Control or chain subagent workflows |

Cursor can also load Claude Code hook configs when **third-party skills/hooks**
are enabled in settings — so one script can serve both tools.

See [Cursor docs — Hooks](https://cursor.com/docs/hooks) for the full event
list and JSON payload schemas.

---

## How the pieces fit together

```
┌─────────────────────────────────────────────────────────────┐
│  Project instructions (AGENTS.md) — always on               │
└─────────────────────────────────────────────────────────────┘
         │
         ├── Rules (.cursor/rules/*.mdc)
         │     └── fire when matching files are in context
         │
         ├── Skills (.claude/skills/*/SKILL.md)
         │     └── guide the current session through a playbook
         │
         ├── Agents (.claude/agents/*.md)
         │     └── isolated subprocess → report back
         │
         ├── Workflows
         │     ├── Commands (/ship, /new-endpoint, …)
         │     └── Orchestration skills (plan → implement → verify → review)
         │
         └── Hooks
               ├── Agent-loop guards (preToolUse, postToolUse, …)
               └── Git enforcement (pre-commit, CI)
```

### Choosing the right tool

| I want to… | Use |
| --- | --- |
| Understand repo conventions | Read project instructions (`AGENTS.md`) |
| Get stack-specific guidance while coding | Rules (automatic) |
| Build a feature with the full loop | Orchestration skill |
| Scaffold a standard endpoint or component | Slash command |
| Check if I can merge | `/ship` or equivalent gate command |
| Review my uncommitted diff | Review skill, or dispatch a review agent |
| Review a PR | PR review skill |
| Delegate exploration without cluttering chat | Agent |
| Block AI edits to protected files | Hooks |

---

## Company practice — skeleton repos

Everything above is general Cursor behaviour. Repos generated from our
skeleton implement it through a **single source of truth** under `ai/`, with
generated outputs, hooks, and CI enforcing consistency.

### How we wire it

```
ai/shared/          ──►  AGENTS.md          (always on)
ai/shared/3x-*.md   ──►  .cursor/rules/     (file-triggered)
ai/capabilities/    ──►  .claude/skills/    (task playbooks)
                    ──►  .claude/agents/    (isolated specialists)
                    ──►  .claude/commands/  (slash-command workflows)
.claude/hooks/      ──►  agent-loop guards  (Claude + Cursor third-party)
lefthook.yml        ──►  git pre-commit     (real enforcement)
```

Edit `ai/shared/` and `ai/capabilities/`, then run `pnpm run ai:sync`.
**Never hand-edit generated files** — CI fails on drift (`ai-config-drift`).

### `AGENTS.md`

Assembled from `ai/shared/*.md` in numeric order. Carries:

- What the service does and where features live
- House conventions (formatting, naming, layering, testing)
- Quality gates (`lint`, `typecheck`, `test`, `build`)
- Repo-specific rules injected after init via the `project-context` agent

Rules, skills, and agents add to `AGENTS.md` — they do not replace it.

### Rules we ship

One `.cursor/rules/<stack>.mdc` per stack present after bootstrap:

| Rule file | Stack | Typical globs (adjust post-init) |
| --- | --- | --- |
| `ts-backend.mdc` | Fastify API | `src/**/*.ts`, `test/**/*.ts` |
| `py-backend.mdc` | FastAPI API | `app/**/*.py`, `tests/**/*.py` |
| `next-frontend.mdc` | Next.js app | `app/**/*.tsx`, `components/**/*.tsx`, `hooks/**/*.ts` |
| `ts-package.mdc` | Shared TS library | `src/**/*.ts`, `test/**/*.ts` |
| `py-package.mdc` | Shared Python library | `cube/**/*.py`, `tests/**/*.py` |

Content comes from `ai/shared/3x-stack-*.md`: layering (route → service →
repository), schema-first validation, error envelope, frontend atomic tiers,
i18n, ops invariants.

### Skills we ship

Defined in `ai/capabilities/<name>/` with `kind: "skill"`, generated to
`.claude/skills/`. Only capabilities whose `scope` matches your stacks are
emitted.

| Skill | Purpose |
| --- | --- |
| `feature-dev` | End-to-end delivery: plan → TDD → verify → review loop |
| `backend-api` | Backend layering, schemas, error envelope, ops routes |
| `frontend-components` | Atomic tiers, component folder shape, i18n, forms, a11y |
| `review-changes` | Review uncommitted working-tree changes |
| `pr-review` | Read-only PR analyst |
| `dependabot-review` | Analyse dependency bump PRs |
| `test-coverage-review-fe` | Judge frontend test adequacy |
| `test-coverage-review-ts` | Judge TS backend test adequacy |
| `test-coverage-review-py` | Judge Python backend test adequacy |
| `update-project-context` | Revise repo identity/rules after init |
| `register-context` | Wire a new capability into the init interview |

### Agents we ship

| Agent | Read-only | Purpose |
| --- | --- | --- |
| `code-reviewer` | Yes | Fresh-eyes review of diff, branch, or working tree |
| `standards-check` | Yes | Audit a diff/branch against repo standards |
| `system-mapper` | Yes | Deep-scan a subsystem → `docs/system-map/` |
| `project-context` | No | One-time init interview → fills `ai/shared/` |

### Workflows we ship

**Commands** (`kind: "command"`):

| Command | What it does |
| --- | --- |
| `/ship` | Full quality gate: lint + format-check + typecheck + tests (≥90%) + build |
| `/new-endpoint` | Scaffold API resource (repository → service → route → tests) |
| `/new-component` | Scaffold frontend component with mandatory folder shape |
| `/ai-audit` | Reconcile generated AI config with `ai/` |

**Orchestration:**

- `feature-dev` — plan → checklist → TDD → `/ship` → `review-changes` or
  `code-reviewer` → fix loop
- `project-context` — interview → write `ai/shared/` → `pnpm run ai:sync`

### Hooks we ship

```
Agent tries to edit AGENTS.md
        │
        ▼
┌───────────────────────────┐
│  Claude/Cursor hook       │  protect-generated.sh — blocks (best-effort)
└───────────────────────────┘
        │ (if bypassed)
        ▼
┌───────────────────────────┐
│  lefthook pre-commit      │  ai-sync — regenerates from ai/, re-stages
└───────────────────────────┘
        │ (if --no-verify)
        ▼
┌───────────────────────────┐
│  CI: ai-config-drift      │  fails the PR
└───────────────────────────┘
```

**Claude Code hooks** (`.claude/settings.json` + `.claude/hooks/`):

| Hook | Event | Script | Behaviour |
| --- | --- | --- | --- |
| `protect-generated` | `PreToolUse` | `protect-generated.sh` | Blocks edits to `AGENTS.md`, `.cursor/rules/`, `.claude/` |
| `ai-sync-check` | `PostToolUse` | `ai-sync-check.sh` | Nudges if `ai/` changed and outputs are stale |

**Git hooks** (`lefthook.yml`):

| Hook | What it does |
| --- | --- |
| `ai-sync` | Regenerates and re-stages AI config when `ai/` or generated files change |
| `gitleaks` | Secret scan on staged changes |
| `biome-*` / `ruff-*` | Lint/format on staged code |
| `commitlint` | Conventional Commits |

**Cursor-native hooks** (`.cursor/hooks.json`) are not shipped yet. Enable
**third-party skills/hooks** in Cursor settings to load `.claude/settings.json`,
or reference the same scripts from a native `.cursor/hooks.json`.

### The `ai/` directory

```
ai/
├── shared/                  # Prose → AGENTS.md + stack rules
├── capabilities/            # Skills, agents, commands
│   └── <name>/
│       ├── capability.json
│       └── body.md
├── context/
│   └── questions.json       # Init interview
└── tools/
    ├── ai-build.mjs         # pnpm run ai:sync
    └── ai-audit.mjs         # pnpm run ai:audit
```

Capability manifest:

```json
{
  "kind": "skill",
  "name": "backend-api",
  "description": "Use when creating or reviewing backend API code...",
  "targets": ["claude", "cursor"],
  "scope": ["ts-backend", "py-backend"]
}
```

| Field | Values | Meaning |
| --- | --- | --- |
| `kind` | `skill`, `agent`, `command` | What gets generated |
| `targets` | `claude`, `cursor` | Audit metadata — Cursor reads `.claude/` outputs natively |
| `scope` | `all`, stack names | Which stacks must exist for emission |
| `readonly` | `true` (agents only) | Restricts to read-only tools |

Regenerate after edits:

```sh
pnpm run ai:sync
pnpm run ai:sync -- --check   # CI mode
pnpm run ai:audit
```

### Day-one checklist (skeleton repos)

- [ ] Skim `AGENTS.md` — conventions and gates for your repo
- [ ] Confirm `.cursor/rules/` has a file for your stack
- [ ] Know available commands: `/ship`, `/new-endpoint`, `/new-component`
- [ ] Use `feature-dev` for non-trivial work
- [ ] Run `/ship` before opening a PR
- [ ] Use `review-changes` or `code-reviewer` before human review
- [ ] Never hand-edit generated files — edit `ai/` and `pnpm run ai:sync`
- [ ] In Cursor, enable third-party hooks
- [ ] Run `pnpm install` once so lefthook is installed

### Common mistakes (skeleton repos)

| Mistake | Fix |
| --- | --- |
| Hand-editing `AGENTS.md` or `.cursor/rules/*.mdc` | Edit `ai/`, then `pnpm run ai:sync` |
| Expecting rules to apply globally | Rules are glob-triggered; `AGENTS.md` is global |
| Using a skill when you want an isolated review | Dispatch a read-only agent |
| Using an agent for ongoing implementation | Use a skill — agents return reports |
| Forgetting to sync after `ai/` changes | `pnpm run ai:sync` before committing |
| Assuming agent hooks are the only guard | lefthook + `ai-config-drift` CI enforce |
| `git commit --no-verify` after AI config changes | CI will still fail |

### References

- `AGENTS.md`, `CLAUDE.md`, `README.md` — in your repo
- `.claude/settings.json`, `.claude/hooks/`, `lefthook.yml`
- `ai/tools/lib.mjs` — generation mapping
- [Cursor docs — Rules](https://cursor.com/docs/context/rules)
- [Cursor docs — Skills](https://cursor.com/docs/context/skills)
- [Cursor docs — Hooks](https://cursor.com/docs/hooks)
- [Cursor docs — Third-party hooks](https://cursor.com/docs/reference/third-party-hooks)
