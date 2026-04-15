# Code Review CLI

A TypeScript CLI tool that takes a `git diff` and produces a structured, actionable code review report using Claude.

> This project is a personal exploration of how to utilize Claude Code efficiently in a real development workflow — from headless AI-powered reviews to hooks, agents, and CI integration.

## What this does

- Reads a `git diff` (staged, unstaged, or between commits)
- Sends it to Claude in headless mode (`claude -p`)
- Returns a structured review report (Markdown or JSON)
- Can be plugged into CI/CD pipelines or run locally before committing

## Stack

- **Runtime:** Node.js 20+
- **Language:** TypeScript 5.x (strict mode)
- **CLI framework:** Commander.js
- **AI engine:** Claude Code headless (`claude -p`)
- **Testing:** Vitest
- **Linting:** ESLint

## Getting started

```bash
npm install
npm run build
npm run review
```

## Available commands

```bash
npm run build    # compile TypeScript → dist/
npm run dev      # ts-node watch mode
npm run lint     # eslint src/**
npm test         # vitest
npm run review   # run the CLI locally
```

## Project structure

```
src/
  index.ts     # CLI entry point (Commander)
  review.ts    # core review orchestration
  diff.ts      # git diff utilities
  report.ts    # report formatting (markdown / JSON)
  types.ts     # shared TypeScript interfaces
.claude/
  agents/      # custom Claude subagents (explorer, reviewer, architect)
  hooks/       # pre/post tool use safety hooks
  skills/      # slash command skills (review, test, commit, mrreview)
  settings.json
```

## Motivation

This is a sandbox for learning how to integrate Claude Code deeply into a development workflow:

- Using Claude in headless mode as an AI engine
- Building custom agents and skills for the Claude Code CLI
- Automating code review as part of a CI pipeline
- Exploring hooks, permissions, and safe AI-assisted development patterns