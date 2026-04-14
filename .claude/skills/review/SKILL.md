---
name: review
description: Run a full code review on staged changes or a specified file. Invokes the reviewer agent and produces an actionable report.
---

# Code Review Workflow

You are running a structured pre-commit / pre-PR code review.

## Steps

1. **Get the diff**
   Run `git diff --staged` to see staged changes.
   If nothing is staged, run `git diff HEAD` for the last commit.

2. **Read the changed files in full**
   Don't just read the diff — read the complete file for each changed file to understand full context.

3. **Check against project conventions** (from CLAUDE.md)
   - All functions have explicit TypeScript return types
   - No `any` types
   - Errors use `Result<T, E>` pattern — no raw throws
   - Every new public function has a test

4. **Run the reviewer agent**
   Invoke the `reviewer` agent with: "Review these changes: [paste diff summary]"

5. **Summarise for the developer**
   - How many 🔴 critical, 🟡 important, 🟢 suggestion issues
   - Verdict: APPROVE / REQUEST CHANGES
   - If REQUEST CHANGES: list the top 3 fixes needed before committing

## Important
Do not modify any code during this skill. Read-and-report only.
