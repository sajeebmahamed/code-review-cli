---
name: commit
description: Generate a Conventional Commit message for staged changes and commit after developer approval.
---

# Commit Message Workflow

## Steps

1. **Check what's staged**
   ```bash
   git diff --staged --stat
   git diff --staged
   ```

2. **Determine the commit type**
   | Type | When |
   |------|------|
   | `feat` | New feature |
   | `fix` | Bug fix |
   | `refactor` | No behaviour change |
   | `test` | Adding/fixing tests |
   | `docs` | Documentation only |
   | `chore` | Build, config, deps |

3. **Write the message**
   Format:
   ```
   type(scope): short description in imperative mood
   
   [optional body — explain WHY]
   ```
   - Max 72 chars in subject line
   - Imperative mood: "add", "fix", "remove" — not "added", "fixes"

4. **Present for approval** — show message, wait for confirmation.

5. **After approval, commit**
   ```bash
   git commit -m "type(scope): description"
   ```

## Never
- Auto-commit without confirmation
- Use past tense
- Write vague messages like "update stuff"
