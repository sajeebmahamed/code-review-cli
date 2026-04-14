---
paths:
  - "src/**"
  - "*.ts"
---

# TypeScript Conventions

## Types
- Never use `any` — use `unknown` with type guards if shape is truly unknown
- All function parameters and return types must be explicitly annotated
- Prefer `interface` for object shapes, `type` for unions and aliases

## Error handling — Result pattern
```typescript
type Ok<T> = { ok: true; value: T }
type Err<E> = { ok: false; error: E }
type Result<T, E = string> = Ok<T> | Err<E>

const ok = <T>(value: T): Ok<T> => ({ ok: true, value })
const err = <E>(error: E): Err<E> => ({ ok: false, error })
```
- Functions that can fail must return `Result<T, E>` — never throw
- Only catch at CLI boundary (`index.ts`): print error, then `process.exit(1)`
- Always check `result.ok` before accessing `result.value`

## Async
- All async functions must handle errors — `try/catch` or `.catch()`
- Prefer `async/await` over `.then()` chains
- Never `await` inside a loop — use `Promise.all()`

## Naming
- Files: `kebab-case.ts`
- Functions: `camelCase`
- Types/interfaces: `PascalCase`
- Module-level constants: `SCREAMING_SNAKE_CASE`

## Imports
- Relative imports for internal modules: `import { ... } from './types'`
- External packages first, then internal modules
- Named exports only — no default exports
