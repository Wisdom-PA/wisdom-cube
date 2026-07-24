#!/bin/sh
# PreToolUse hook: block hand-edits to GENERATED AI-config files — the
# generator (`pnpm run ai:sync`) is the only writer.
# BEST-EFFORT guard: the real enforcement is lefthook (pre-commit regen) +
# the ai-config-drift CI check, which also catch `--no-verify` bypasses.
# Cross-scope hook merge (this project hook firing alongside user-global
# hooks) was empirically verified 2026-07-06 via a headless probe.

payload=$(cat)
file_path=$(printf '%s' "$payload" | node -e '
  let d = "";
  process.stdin.on("data", (c) => (d += c));
  process.stdin.on("end", () => {
    try {
      const j = JSON.parse(d);
      process.stdout.write(j.tool_input?.file_path ?? "");
    } catch {
      process.stdout.write("");
    }
  });
')

[ -z "$file_path" ] && exit 0

case "$file_path" in
  */AGENTS.md|AGENTS.md|*/.cursor/rules/*|.cursor/rules/*|*/.claude/skills/*|.claude/skills/*|*/.claude/agents/*|.claude/agents/*|*/.claude/commands/*|.claude/commands/*)
    echo "Blocked: $file_path is GENERATED from ai/. Edit ai/shared/ or ai/capabilities/ and run \`pnpm run ai:sync\`." >&2
    exit 2
    ;;
esac

exit 0
