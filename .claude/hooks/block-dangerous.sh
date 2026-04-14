#!/bin/bash
# .claude/hooks/block-dangerous.sh
# PreToolUse hook — blocks destructive commands before they run.
# Exit code 2 = blocked (even in dangerouslySkipPermissions mode).
# Exit code 0 = allowed.

COMMAND="${TOOL_INPUT}"

# Block force pushes
if echo "$COMMAND" | grep -qiE 'git push.*(--force|-f)\b'; then
  echo "BLOCKED: Force push is not allowed. Open a PR instead."
  exit 2
fi

# Block direct commits to main/master
if echo "$COMMAND" | grep -qiE "git commit.*main|git commit.*master"; then
  echo "BLOCKED: Cannot commit directly to main/master. Create a feature branch."
  exit 2
fi

# Block recursive deletes
if echo "$COMMAND" | grep -qiE 'rm\s+-rf|rm\s+-fr'; then
  echo "BLOCKED: rm -rf is not allowed. Use rm with specific file paths."
  exit 2
fi

# Block bypassing git hooks
if echo "$COMMAND" | grep -qiE 'git commit --no-verify|git commit -n\b'; then
  echo "BLOCKED: --no-verify bypasses pre-commit hooks. Not allowed."
  exit 2
fi

exit 0
