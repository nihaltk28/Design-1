#!/usr/bin/env bash
# Claude Code PostToolUse hook: lint the file Claude just edited.
# On ESLint errors, exit 2 so the output goes back to Claude to fix before it moves on.

file=$(node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const j=JSON.parse(d);process.stdout.write((j.tool_input&&j.tool_input.file_path)||"")}catch{}})')

case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs) ;;
  *) exit 0 ;;
esac

[ -f "$file" ] || exit 0

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# Unscaffolded template: nothing to lint with yet.
[ -x node_modules/.bin/eslint ] || exit 0

if ! out=$(pnpm exec eslint --no-warn-ignored "$file" 2>&1); then
  echo "ESLint failed for $file — fix before continuing (CLAUDE.md §3):" >&2
  echo "$out" >&2
  exit 2
fi

exit 0
