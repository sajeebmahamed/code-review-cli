import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getStagedDiff, parseDiffStats } from './diff'

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}))

import { execSync } from 'child_process'

const mockExecSync = vi.mocked(execSync)

const SAMPLE_DIFF = `diff --git a/src/foo.ts b/src/foo.ts
index 1234567..abcdefg 100644
--- a/src/foo.ts
+++ b/src/foo.ts
@@ -1,3 +1,4 @@
 const x = 1
+const y = 2
+const z = 3
-const old = 0
`

describe('parseDiffStats', () => {
  it('should correctly count additions, deletions, and files changed', () => {
    const result = parseDiffStats(SAMPLE_DIFF)
    expect(result.filesChanged).toBe(1)
    expect(result.additions).toBe(2)
    expect(result.deletions).toBe(1)
  })

  it('should return zeros for an empty diff', () => {
    const result = parseDiffStats('')
    expect(result.filesChanged).toBe(0)
    expect(result.additions).toBe(0)
    expect(result.deletions).toBe(0)
  })
})

describe('getStagedDiff', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should return DiffInput when staged diff is non-empty', () => {
    // execSync call order: git diff --staged first, then git rev-parse inside getCurrentBranch
    mockExecSync.mockReturnValueOnce(SAMPLE_DIFF as never) // git diff --staged
    mockExecSync.mockReturnValueOnce('development' as never) // git rev-parse --abbrev-ref HEAD

    const result = getStagedDiff()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.raw).toBe(SAMPLE_DIFF)
      expect(result.value.branch).toBe('development')
      expect(result.value.filesChanged).toBe(1)
      expect(result.value.additions).toBe(2)
      expect(result.value.deletions).toBe(1)
    }
  })

  it('should return Err when staged diff is empty', () => {
    // empty string is returned for git diff --staged; getCurrentBranch still runs inside buildDiffInput
    mockExecSync.mockReturnValueOnce('' as never) // git diff --staged
    mockExecSync.mockReturnValueOnce('development' as never) // git rev-parse --abbrev-ref HEAD

    const result = getStagedDiff()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('No staged changes found')
    }
  })

  it('should return Err when git command throws', () => {
    // git diff --staged throws — catch block returns early, getCurrentBranch never runs
    mockExecSync.mockImplementationOnce(() => {
      throw new Error('git: command not found')
    })

    const result = getStagedDiff()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain(
        'git is not installed or not available in PATH'
      )
    }
  })

  it('should return Err with repo message when not in a git repo', () => {
    // git diff --staged throws — catch block returns early, getCurrentBranch never runs
    mockExecSync.mockImplementationOnce(() => {
      throw new Error('fatal: not a git repository')
    })

    const result = getStagedDiff()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('Not a git repository')
    }
  })
})
