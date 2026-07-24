#!/usr/bin/env node
// i18n gate: flag literal user-facing text in JSX — all copy must go through
// useTranslations()/getTranslations() keys (EN + CY catalogs). Custom AST
// check in the ai/tools style (no ESLint — keeps the single-tool surface).
// Run from the frontend directory: `pnpm run i18n:check`. Uses the frontend's
// own `typescript` package for parsing.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';

const cwd = process.cwd();
const require = createRequire(join(cwd, 'package.json'));
const ts = require('typescript');

const SCAN_DIRS = ['app', 'components'].filter((d) => {
  try {
    return statSync(join(cwd, d)).isDirectory();
  } catch {
    return false;
  }
});

// Attributes whose string values reach users (screen readers included).
const COPY_ATTRIBUTES = new Set(['aria-label', 'alt', 'placeholder', 'title', 'label', 'legend']);
// Dev-only or non-UI files.
const EXCLUDE_FILE = /\.(test|stories|stories\.test)\.tsx$/;
// Text with at least two consecutive letters counts as copy; punctuation,
// numbers and single characters (e.g. the "|" separator) do not.
const LOOKS_LIKE_COPY = /[A-Za-zÀ-ÿ]{2,}/;

function* walkFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    // Skip symlinks: avoids broken-link crashes and symlink cycles.
    if (entry.isSymbolicLink()) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkFiles(full);
    else if (full.endsWith('.tsx') && !EXCLUDE_FILE.test(full)) yield full;
  }
}

const violations = [];

function scanFile(filePath) {
  const source = ts.createSourceFile(filePath, readFileSync(filePath, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  const visit = (node) => {
    if (ts.isJsxText(node) && LOOKS_LIKE_COPY.test(node.text)) {
      report(node, node.text.trim());
    }
    if (
      ts.isJsxAttribute(node) &&
      COPY_ATTRIBUTES.has(node.name.getText(source)) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer) &&
      LOOKS_LIKE_COPY.test(node.initializer.text)
    ) {
      report(node, `${node.name.getText(source)}="${node.initializer.text}"`);
    }
    ts.forEachChild(node, visit);
  };

  const report = (node, text) => {
    const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
    violations.push(`${relative(cwd, filePath)}:${line + 1}  ${JSON.stringify(text.slice(0, 60))}`);
  };

  visit(source);
}

for (const dir of SCAN_DIRS) {
  for (const file of walkFiles(join(cwd, dir))) {
    scanFile(file);
  }
}

if (violations.length) {
  console.error(`i18n-check: ${violations.length} hardcoded user-facing string(s) — route them through useTranslations() (messages/en.json + cy.json):`);
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log('i18n-check: no hardcoded user-facing strings.');
