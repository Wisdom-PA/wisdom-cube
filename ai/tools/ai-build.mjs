#!/usr/bin/env node
// ai-build — `pnpm run ai:sync` (add --check for CI drift detection).
// Regenerates every AI-config output (AGENTS.md, .claude capabilities,
// .cursor rules) from the single source under ai/. Node built-ins only.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { GENERATED_DIRS, REPO_ROOT, STAMP, generateOutputs } from './lib.mjs';

const checkMode = process.argv.includes('--check');
const outputs = generateOutputs();

/** Every on-disk file inside the generated dirs that carries the stamp. */
function findStampedFiles() {
  const stamped = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      try {
        // Normalize to POSIX separators so Map lookups match generateOutputs keys on Windows.
        if (readFileSync(full, 'utf8').includes(STAMP)) {
          stamped.push(relative(REPO_ROOT, full).split('\\').join('/'));
        }
      } catch {
        // Unreadable/binary colocated asset — never ours to sweep.
      }
    }
  };
  for (const rel of GENERATED_DIRS) {
    const dir = join(REPO_ROOT, rel);
    if (existsSync(dir)) walk(dir);
  }
  return stamped;
}

const problems = [];
let wrote = 0;

for (const [rel, content] of outputs) {
  const full = join(REPO_ROOT, rel);
  const current = existsSync(full) ? readFileSync(full, 'utf8') : null;
  if (current === content) continue;
  if (checkMode) {
    problems.push(`${current === null ? 'MISSING' : 'STALE'}  ${rel}`);
  } else {
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
    console.log(`${current === null ? 'created' : 'updated'}  ${rel}`);
    wrote += 1;
  }
}

// Orphans: stamped files no longer produced (capability deleted/renamed).
for (const rel of findStampedFiles()) {
  if (outputs.has(rel)) continue;
  if (checkMode) {
    problems.push(`ORPHAN  ${rel}`);
  } else {
    rmSync(join(REPO_ROOT, rel));
    console.log(`removed  ${rel}`);
    wrote += 1;
  }
}

if (checkMode) {
  if (problems.length) {
    console.error('AI config has drifted from ai/ (run `pnpm run ai:sync`):');
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`ai-build --check: ${outputs.size} generated files in sync.`);
} else {
  console.log(wrote ? `ai-build: ${wrote} file(s) written.` : `ai-build: all ${outputs.size} generated files already in sync.`);
}
