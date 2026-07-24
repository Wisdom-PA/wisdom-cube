#!/bin/sh
# PostToolUse hook: after an edit under ai/, nudge if the generated outputs are
# now stale — closes the edit-then-forget-to-regenerate gap before the
# lefthook/CI gates catch it. Nudge-only; never blocks.

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

case "$file_path" in
  */ai/shared/*|*/ai/capabilities/*|ai/shared/*|ai/capabilities/*) ;;
  *) exit 0 ;;
esac

if ! node "${CLAUDE_PROJECT_DIR:-.}/ai/tools/ai-build.mjs" --check >/dev/null 2>&1; then
  echo "ai/ changed and generated outputs are now stale — run \`pnpm run ai:sync\` before committing." >&2
  exit 2
fi

exit 0
