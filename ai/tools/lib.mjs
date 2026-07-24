// Shared internals for ai-build.mjs / ai-audit.mjs. Node built-ins only —
// these tools must run in a fresh clone before any install.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const STAMP = '<!-- DO NOT EDIT — generated from ai/ by `pnpm run ai:sync` -->';

const KINDS = new Set(['skill', 'agent', 'command']);
const TARGETS = new Set(['claude', 'cursor']);
const SCOPES = new Set(['all', 'ts-backend', 'py-backend', 'next-frontend', 'ts-package', 'py-package']);

/** Directories that may contain generated capability files (stale-file sweep). */
export const GENERATED_DIRS = ['.claude/skills', '.claude/agents', '.claude/commands', '.cursor/rules'];

export function loadShared() {
  const dir = join(REPO_ROOT, 'ai', 'shared');
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort();
  return files.map((name) => ({ name, content: readFileSync(join(dir, name), 'utf8').trimEnd() }));
}

export function loadCapabilities() {
  const dir = join(REPO_ROOT, 'ai', 'capabilities');
  if (!existsSync(dir)) return [];
  const caps = [];
  for (const name of readdirSync(dir).sort()) {
    const capDir = join(dir, name);
    if (!statSync(capDir).isDirectory()) continue;
    const manifestPath = join(capDir, 'capability.json');
    const bodyPath = join(capDir, 'body.md');
    if (!existsSync(manifestPath) || !existsSync(bodyPath)) {
      throw new Error(`ai/capabilities/${name}: needs both capability.json and body.md`);
    }
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    validateManifest(name, manifest);
    caps.push({ ...manifest, body: readFileSync(bodyPath, 'utf8').trimEnd() });
  }
  return caps;
}

function validateManifest(dirName, m) {
  if (m.name !== dirName) throw new Error(`ai/capabilities/${dirName}: manifest name "${m.name}" must match directory`);
  if (!KINDS.has(m.kind)) throw new Error(`ai/capabilities/${dirName}: invalid kind "${m.kind}"`);
  if (!m.description) throw new Error(`ai/capabilities/${dirName}: description is required`);
  if (!Array.isArray(m.targets) || !m.targets.length || m.targets.some((t) => !TARGETS.has(t))) {
    throw new Error(`ai/capabilities/${dirName}: targets must be a non-empty subset of [claude, cursor]`);
  }
  // Cursor consumes capabilities THROUGH the Claude-native files (.claude/
  // skills|agents), so "claude" is always required; `targets` is audit
  // metadata distinguishing knowingly-Claude-only items from parity items.
  if (!m.targets.includes('claude')) {
    throw new Error(`ai/capabilities/${dirName}: targets must include "claude" (Cursor reads the Claude-native files)`);
  }
  if (!Array.isArray(m.scope) || !m.scope.length || m.scope.some((s) => !SCOPES.has(s))) {
    throw new Error(`ai/capabilities/${dirName}: scope must be a non-empty subset of [all, ts-backend, py-backend, next-frontend, ts-package, py-package]`);
  }
}

/**
 * Which stacks exist in this checkout, and where (factory / workspace /
 * hoisted). CONTRACT for prune.mjs: workspace output must use exactly these
 * directory names (apps/web, services/api, services/api-py), and init must
 * re-run ai-build after pruning so globs match the new layout.
 */
export function detectStacks() {
  const candidates = [
    // factory layout
    { stack: 'ts-backend', dir: 'stacks/ts-backend', marker: 'stacks/ts-backend/src/app.ts' },
    { stack: 'py-backend', dir: 'stacks/py-backend', marker: 'stacks/py-backend/app/main.py' },
    { stack: 'next-frontend', dir: 'stacks/next-frontend', marker: 'stacks/next-frontend/next.config.ts' },
    { stack: 'ts-package', dir: 'stacks/ts-package', marker: 'stacks/ts-package/src/index.ts' },
    { stack: 'py-package', dir: 'stacks/py-package', marker: 'stacks/py-package/{{REPO_SLUG}}/__init__.py' },
    // workspace layout (post-init, 2+ components) — packages are single-stack hoisted, so no workspace entries
    { stack: 'ts-backend', dir: 'services/api', marker: 'services/api/src/app.ts' },
    { stack: 'py-backend', dir: 'services/api-py', marker: 'services/api-py/app/main.py' },
    { stack: 'next-frontend', dir: 'apps/web', marker: 'apps/web/next.config.ts' },
    // hoisted layout (post-init, single component at root)
    { stack: 'ts-backend', dir: '.', marker: 'src/app.ts' },
    { stack: 'py-backend', dir: '.', marker: 'app/main.py' },
    { stack: 'next-frontend', dir: '.', marker: 'next.config.ts' },
    { stack: 'ts-package', dir: '.', marker: 'src/index.ts' },
    { stack: 'py-package', dir: '.', marker: '{{REPO_SLUG}}/__init__.py' },
  ];
  const found = new Map();
  for (const c of candidates) {
    if (!found.has(c.stack) && existsSync(join(REPO_ROOT, c.marker))) {
      found.set(c.stack, c.dir);
    }
  }
  return found; // Map<stackName, dirRelativeToRoot>
}

const STACK_SHARED_FILE = {
  'ts-backend': '30-stack-ts.md',
  'py-backend': '31-stack-py.md',
  'next-frontend': '32-stack-next.md',
  'ts-package': '33-stack-ts-package.md',
  'py-package': '34-stack-py-package.md',
};

// Same rule reach in every layout — only the prefix differs.
const STACK_GLOBS = {
  'ts-backend': (dir) => {
    const p = dir === '.' ? '' : `${dir}/`;
    return [`${p}src/**/*.ts`, `${p}test/**/*.ts`];
  },
  'py-backend': (dir) => {
    const p = dir === '.' ? '' : `${dir}/`;
    return [`${p}app/**/*.py`, `${p}tests/**/*.py`];
  },
  'next-frontend': (dir) => {
    const p = dir === '.' ? '' : `${dir}/`;
    return [`${p}app/**/*.tsx`, `${p}components/**/*.tsx`, `${p}hooks/**/*.ts`];
  },
  'ts-package': (dir) => {
    const p = dir === '.' ? '' : `${dir}/`;
    return [`${p}src/**/*.ts`, `${p}test/**/*.ts`];
  },
  'py-package': (dir) => {
    const p = dir === '.' ? '' : `${dir}/`;
    return [`${p}cube/**/*.py`, `${p}tests/**/*.py`];
  },
};

function frontmatter(fields) {
  const lines = Object.entries(fields)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${typeof v === 'string' && /[:#]/.test(v) ? JSON.stringify(v) : v}`);
  return `---\n${lines.join('\n')}\n---`;
}

/**
 * Compute every generated file as a Map<repoRelativePath, content>.
 * Deterministic — build, audit and CI drift-check all share this.
 */
export function generateOutputs() {
  const outputs = new Map();
  const shared = loadShared();
  const caps = loadCapabilities();
  const stacks = detectStacks();

  // AGENTS.md — the shared body both Claude (via CLAUDE.md import) and Cursor
  // (natively) read. Concatenation of ai/shared in numeric order.
  const agents = [
    STAMP,
    '<!-- Source of truth: ai/shared/*.md — edit there and run `pnpm run ai:sync` -->',
    '',
    shared.map((f) => f.content).join('\n\n---\n\n'),
    '',
  ].join('\n');
  outputs.set('AGENTS.md', agents);

  for (const cap of caps) {
    // Skip capabilities whose scope has no surviving stack in this checkout.
    const inScope = cap.scope.includes('all') || cap.scope.some((s) => stacks.has(s));
    if (!inScope) continue;

    const scopeNote = cap.scope.includes('all') ? '' : `\n\nScope: applies to the ${cap.scope.join(' + ')} stack(s).`;

    if (cap.kind === 'skill' || cap.kind === 'command') {
      // Claude skill; Cursor reads .claude/skills/ natively (Cursor ≥2.4).
      // A command dual-emits: a Claude slash command + a command-only skill
      // (Cursor folded commands into skills; disable-model-invocation keeps it
      // command-only there).
      const fm = {
        name: cap.name,
        description: cap.description,
        ...(cap.kind === 'command' ? { 'disable-model-invocation': true } : {}),
      };
      outputs.set(
        `.claude/skills/${cap.name}/SKILL.md`,
        `${frontmatter(fm)}\n${STAMP}\n\n${cap.body}${scopeNote}\n`
      );
      if (cap.kind === 'command') {
        outputs.set(
          `.claude/commands/${cap.name}.md`,
          `${frontmatter({ description: cap.description })}\n${STAMP}\n\n${cap.body}${scopeNote}\n`
        );
      }
    }

    if (cap.kind === 'agent') {
      // Claude subagent; Cursor reads .claude/agents/ natively.
      const fm = {
        name: cap.name,
        description: cap.description,
        ...(cap.readonly ? { tools: 'Read, Grep, Glob, Bash' } : {}),
      };
      outputs.set(`.claude/agents/${cap.name}.md`, `${frontmatter(fm)}\n${STAMP}\n\n${cap.body}${scopeNote}\n`);
    }
  }

  // Thin per-stack .cursor/rules/*.mdc — the ONE surviving .mdc use:
  // glob-scoped, file-triggered rules AGENTS.md can't express.
  for (const [stack, dir] of stacks) {
    const sharedFile = shared.find((f) => f.name === STACK_SHARED_FILE[stack]);
    if (!sharedFile) continue;
    const globs = STACK_GLOBS[stack](dir).join(',');
    outputs.set(
      `.cursor/rules/${stack}.mdc`,
      [
        `---`,
        `description: ${JSON.stringify(`${stack} house rules (generated)`)}`,
        `globs: ${globs}`,
        `alwaysApply: false`,
        `---`,
        STAMP,
        '',
        sharedFile.content,
        '',
      ].join('\n')
    );
  }

  return outputs;
}
