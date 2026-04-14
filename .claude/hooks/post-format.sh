#!/bin/bash
# .claude/hooks/post-format.sh
# PostToolUse hook — runs prettier and eslint on written/edited TypeScript files.
# Receives JSON on stdin: {"tool_name": "Write", "tool_input": {"file_path": "..."}, ...}
# Exit code 0 always (formatting is best-effort, never block a write).

INPUT=$(cat)
FILE=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('file_path', ''))
except Exception:
    print('')
" 2>/dev/null || echo "")

if [[ -z "$FILE" ]]; then
  exit 0
fi

if [[ "$FILE" == *.ts || "$FILE" == *.tsx || "$FILE" == *.json ]]; then
  npx prettier --write "$FILE" 2>/dev/null
fi

if [[ "$FILE" == *.ts || "$FILE" == *.tsx ]]; then
  npx eslint --fix "$FILE" 2>/dev/null
fi

exit 0
