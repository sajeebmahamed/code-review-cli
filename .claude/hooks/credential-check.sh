#!/bin/bash
# .claude/hooks/credential-check.sh
# PreToolUse hook — scans staged files for secrets before git commit runs.
# Receives JSON on stdin: {"tool_name": "Bash", "tool_input": {"command": "..."}, ...}
# Exit code 2 = blocked. Exit code 0 = allowed.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('command', ''))
except Exception:
    print('')
" 2>/dev/null || echo "")

# Only run when the command is git commit
echo "$COMMAND" | grep -q "git commit" || exit 0

# Scan staged files for common secret patterns
SECRETS=$(git diff --cached --diff-filter=ACM \
  | grep -iEn \
    -e 'AKIA[0-9A-Z]{16}' \
    -e 'BEGIN (RSA|EC|DSA) PRIVATE' \
    -e 'password\s*[:=]\s*["'"'"'].+' \
    -e 'secret\s*[:=]\s*["'"'"'].+' \
    -e 'token\s*[:=]\s*["'"'"'].+' \
    -e 'api_key\s*[:=]\s*["'"'"'].+' \
    -e 'ANTHROPIC_API_KEY\s*=\s*sk-' \
    -e 'sk-ant-[a-zA-Z0-9]+'
)

if [ -n "$SECRETS" ]; then
  echo "BLOCKED: Credentials or secrets found in staged files:" >&2
  echo "$SECRETS" >&2
  echo "" >&2
  echo "Remove secrets and use environment variables instead." >&2
  exit 2
fi

exit 0
