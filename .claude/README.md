# .claude/ — Claude Code Setup

## File tree
```
.claude/
├── settings.json                  ← hooks + permissions (committed)
├── settings.local.json            ← your personal overrides (GITIGNORED)
├── agents/
│   ├── explorer.md                ← Haiku | read-only | understand codebase
│   ├── reviewer.md                ← Sonnet | read-only | deep code review
│   └── architect.md               ← Opus  | read-only | design decisions
├── skills/
│   ├── review/SKILL.md            ← /review
│   ├── test/SKILL.md              ← /test
│   ├── commit/SKILL.md            ← /commit
│   └── mrreview/SKILL.md          ← /mrreview
├── rules/
│   ├── typescript.md              ← auto-loads for src/**
│   └── cli.md                     ← auto-loads for src/index.ts
└── hooks/
    ├── block-dangerous.sh         ← PreToolUse: blocks rm -rf, force push
    └── credential-check.sh        ← PreToolUse: blocks commits with secrets
```

## Daily use
```bash
/review      # pre-commit review
/test        # write tests for new code
/commit      # generate conventional commit message
/mrreview    # analyze MR feedback critically
/agents      # invoke explorer / reviewer / architect
```

## Worktrees
```bash
claude -w feature-name     # new isolated branch + working directory
git worktree list          # see active worktrees
git worktree remove .claude/worktrees/feature-name
```

## Headless
```bash
git diff --staged | claude -p "review this diff for TypeScript issues"
git diff --staged | claude -p --output-format json "list all issues as JSON"
```

## First time setup
```bash
cp .claude/settings.local.json.template .claude/settings.local.json
# add your ANTHROPIC_API_KEY to settings.local.json
chmod +x .claude/hooks/block-dangerous.sh
chmod +x .claude/hooks/credential-check.sh
```
