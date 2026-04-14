---
name: test
description: Write Vitest tests for a given function or module following the project's TDD conventions.
---

# Test Writing Workflow

## Setup check
First verify existing tests still pass:
```bash
npm test -- --run
```

## Steps

1. **Read the target function** — understand signature, input types, output types, error cases.

2. **Identify test cases** — for every function cover:
   - ✅ Happy path — normal input, expected output
   - ❌ Error cases — invalid input, edge cases
   - 🔲 Boundary conditions — empty arrays, zero, null/undefined

3. **Write the test file**
   - File: `[source].test.ts` in the same directory
   - Use `describe` to group by function name
   - Use `it('should [behaviour]')` — never `test()`
   - Import real types from `types.ts` — never `any`

4. **Test structure**
   ```typescript
   import { describe, it, expect } from 'vitest'
   import { functionUnderTest } from './source-file'

   describe('functionUnderTest', () => {
     it('should return X when given valid input', () => {
       const result = functionUnderTest(validInput)
       expect(result).toEqual(expectedOutput)
     })

     it('should return an Err result when input is invalid', () => {
       const result = functionUnderTest(invalidInput)
       expect(result.ok).toBe(false)
     })
   })
   ```

5. **Run after writing**
   ```bash
   npm test -- --run
   ```
   All tests — old and new — must pass.

## Do not
- Test private functions or internal state
- Mock things that don't need mocking
- Write placeholder `expect(true).toBe(true)` tests
