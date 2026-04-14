---
paths:
  - "src/index.ts"
  - "src/cli/**"
---

# CLI Design Conventions

## Commander.js patterns
- Every command must have a `.description()` string
- Options with values must document their type in the description
- Always provide sensible defaults for optional flags

## Output
- Normal output → `stdout`
- Errors and warnings → `stderr` via `console.error()`
- When `--json` flag is set, only valid JSON goes to stdout
- Exit codes: `0` success, `1` runtime error, `2` usage error

## Error messages
Must be actionable — tell the user what went wrong AND what to do.
- ❌ Bad: `"Error: failed"`
- ✅ Good: `"No staged changes found. Stage your files with 'git add' first."`

## Environment variables
- All config that differs between environments goes in `.env`
- Never hardcode API keys or URLs
- Check for required env vars at startup and fail fast with a clear message
