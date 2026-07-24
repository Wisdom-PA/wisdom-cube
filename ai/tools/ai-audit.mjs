#!/usr/bin/env node
// ai-audit — capability parity engine (`pnpm run ai:audit`, add --check in CI).
// For every capability in ai/capabilities/, verify the native counterpart
// exists and is current in EACH targeted environment; write mode materializes
// anything missing or stale. --check compares only and exits non-zero on any
// gap — the authoritative "add once, land in both" guarantee.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT, detectStacks, generateOutputs, loadCapabilities } from './lib.mjs';

const checkMode = process.argv.includes('--check');
const outputs = generateOutputs();
const stacks = detectStacks();

/** The generated files each capability must have, per environment. */
function expectedFor(cap) {
  const claude = [];
  if (cap.kind === 'skill' || cap.kind === 'command') claude.push(`.claude/skills/${cap.name}/SKILL.md`);
  if (cap.kind === 'command') claude.push(`.claude/commands/${cap.name}.md`);
  if (cap.kind === 'agent') claude.push(`.claude/agents/${cap.name}.md`);
  // Cursor (≥2.4) reads .claude/skills/ and .claude/agents/ natively — parity
  // for skills/agents/commands is the SAME files, so cursor expectations equal
  // the claude ones. Truly Claude-only material (hooks, settings, MCP) is not
  // a capability and is knowingly out of audit scope.
  return { claude, cursor: cap.targets.includes('cursor') ? claude : [] };
}

function runAudit() {
  const rows = [];
  const claimed = new Set();
  let failures = 0;

  for (const cap of loadCapabilities()) {
    const inScope = cap.scope.includes('all') || cap.scope.some((s) => stacks.has(s));
    if (!inScope) {
      rows.push([cap.name, cap.kind, 'out of scope (stack not present)']);
      continue;
    }
    const expected = expectedFor(cap);
    const statuses = [];
    for (const rel of new Set([...expected.claude, ...expected.cursor])) {
      claimed.add(rel);
      const full = join(REPO_ROOT, rel);
      if (!existsSync(full)) statuses.push(`MISSING ${rel}`);
      else if (readFileSync(full, 'utf8') !== outputs.get(rel)) statuses.push(`STALE ${rel}`);
    }
    if (statuses.length) {
      failures += 1;
      rows.push([cap.name, cap.kind, statuses.join('; ')]);
    } else {
      rows.push([cap.name, cap.kind, `ok (${cap.targets.join('+')})`]);
    }
  }

  // Non-capability outputs (AGENTS.md, per-stack .cursor rules) are part of the
  // parity surface too — a hand-edited AGENTS.md must fail this audit, not just
  // the separate ai-build --check.
  for (const [rel] of outputs) {
    if (claimed.has(rel)) continue;
    const full = join(REPO_ROOT, rel);
    const status = !existsSync(full) ? 'MISSING' : readFileSync(full, 'utf8') !== outputs.get(rel) ? 'STALE' : 'ok';
    if (status !== 'ok') failures += 1;
    rows.push([rel, 'shared', status]);
  }

  return { rows, failures };
}

function printRows(rows) {
  for (const [name, kind, status] of rows) {
    console.log(`  ${name.padEnd(36)} ${kind.padEnd(8)} ${status}`);
  }
}

const first = runAudit();
printRows(first.rows);

if (first.failures === 0) {
  console.log('ai-audit: every capability and shared output is materialized and current in all targets.');
  process.exit(0);
}

if (checkMode) {
  console.error(`ai-audit --check: ${first.failures} item(s) out of sync. Run \`pnpm run ai:audit\` (write mode).`);
  process.exit(1);
}

// Write mode: ai-build owns generation — reuse it, then genuinely re-verify.
console.log(`ai-audit: reconciling ${first.failures} item(s) via ai-build…`);
execFileSync(process.execPath, [join(REPO_ROOT, 'ai', 'tools', 'ai-build.mjs')], { stdio: 'inherit' });
const second = runAudit();
if (second.failures > 0) {
  printRows(second.rows.filter(([, , status]) => status !== 'ok' && !String(status).startsWith('ok')));
  console.error(`ai-audit: ${second.failures} item(s) STILL out of sync after regeneration — investigate.`);
  process.exit(1);
}
console.log('ai-audit: reconciled and re-verified.');
