#!/bin/bash
# .claude/hooks/credential-check.sh
# PreToolUse hook — scans staged files for secrets before git commit runs.
# Exit code 2 = blocked. Exit code 0 = allowed.

# Only run when the command is git commit
echo "${TOOL_INPUT}" | grep -q "git commit" || exit 0

# Scan staged files for common secret patterns
SECRETS=$(git diff --cached --diff-filter=ACM \
  | grep -iEn \
    'AKIA[0-9A-Z]{16}' \
    '|BEGIN (RSA|EC|DSA) PRIVATE' \
    '|password\s*[:=]\s*["'"'"'].+' \
    '|secret\s*[:=]\s*["'"'"'].+' \
    '|token\s*[:=]\s*["'"'"'].+' \
    '|api_key\s*[:=]\s*["'"'"'].+' \
    '|ANTHROPIC_API_KEY\s*=\s*sk-' \
    '|sk-ant-[a-zA-Z0-9]+'
)

if [ -n "$SECRETS" ]; then
  echo "BLOCKED: Credentials or secrets found in staged files:"
  echo "$SECRETS"
  echo ""
  echo "Remove secrets and use environment variables instead."
  exit 2
fi

exit 0
