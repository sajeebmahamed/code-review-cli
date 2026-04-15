import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getStagedDiff,
  getHeadDiff,
  getDiffFromBranch,
  getFilteredDiff,
  parseDiffStats,
} from './diff'

vi.mock('child_process', () => ({
  spawnSync: vi.fn(),
}))

import { spawnSync } from 'child_process'

const mockSpawnSync = vi.mocked(spawnSync)

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

// Helper: simulate a successful git diff + getCurrentBranch call pair
const mockDiffSuccess = (stdout: string, branch = 'development'): void => {
  mockSpawnSync
    .mockReturnValueOnce({
      status: 0,
      stdout,
      stderr: '',
      error: undefined,
      pid: 1,
      output: [],
      signal: null,
    } as never) // git diff
    .mockReturnValueOnce({
      status: 0,
      stdout: branch,
      stderr: '',
      error: undefined,
      pid: 1,
      output: [],
      signal: null,
    } as never) // git rev-parse --abbrev-ref HEAD
}

// Helper: simulate a git command not found
const mockGitNotFound = (): void => {
  mockSpawnSync.mockReturnValueOnce({
    status: null,
    stdout: '',
    stderr: '',
    error: new Error('spawnSync git ENOENT'),
    pid: 0,
    output: [],
    signal: null,
  } as never)
}

// Helper: simulate git non-zero exit with stderr message
const mockGitError = (stderr: string): void => {
  mockSpawnSync.mockReturnValueOnce({
    status: 128,
    stdout: '',
    stderr,
    error: undefined,
    pid: 1,
    output: [],
    signal: null,
  } as never)
}

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
    mockDiffSuccess(SAMPLE_DIFF)

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
    mockDiffSuccess('')

    const result = getStagedDiff()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('No staged changes found')
    }
  })

  it('should return Err when git is not installed', () => {
    mockGitNotFound()

    const result = getStagedDiff()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain(
        'git is not installed or not available in PATH'
      )
    }
  })

  it('should return Err when not in a git repo', () => {
    mockGitError('fatal: not a git repository')

    const result = getStagedDiff()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('Not a git repository')
    }
  })
})

describe('getHeadDiff', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should return DiffInput when HEAD diff is non-empty', () => {
    mockDiffSuccess(SAMPLE_DIFF)

    const result = getHeadDiff()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.raw).toBe(SAMPLE_DIFF)
      expect(result.value.filesChanged).toBe(1)
    }
  })

  it('should return Err when HEAD diff is empty', () => {
    mockDiffSuccess('')

    const result = getHeadDiff()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('No changes found against HEAD')
    }
  })

  it('should return Err when git command fails', () => {
    mockGitNotFound()

    const result = getHeadDiff()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain(
        'git is not installed or not available in PATH'
      )
    }
  })
})

describe('getDiffFromBranch', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should return DiffInput when branch diff is non-empty', () => {
    mockDiffSuccess(SAMPLE_DIFF)

    const result = getDiffFromBranch('main')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.raw).toBe(SAMPLE_DIFF)
      expect(result.value.filesChanged).toBe(1)
    }
  })

  it('should return Err when branch diff is empty', () => {
    mockDiffSuccess('')

    const result = getDiffFromBranch('main')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain(
        'No changes found between HEAD and origin/main'
      )
    }
  })

  it('should default to main when no branch is provided', () => {
    mockDiffSuccess(SAMPLE_DIFF)

    const result = getDiffFromBranch()

    expect(result.ok).toBe(true)
  })

  it('should return Err when git command fails', () => {
    mockGitError('fatal: not a git repository')

    const result = getDiffFromBranch('main')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('Not a git repository')
    }
  })
})

describe('getFilteredDiff', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should return DiffInput scoped to specified files in staged mode', () => {
    mockDiffSuccess(SAMPLE_DIFF)

    const result = getFilteredDiff(['src/foo.ts', 'src/bar.ts'], 'staged')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.raw).toBe(SAMPLE_DIFF)
      expect(result.value.filesChanged).toBe(1)
    }
  })

  it('should return DiffInput scoped to specified files in head mode', () => {
    mockDiffSuccess(SAMPLE_DIFF)

    const result = getFilteredDiff(['src/foo.ts'], 'head')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.raw).toBe(SAMPLE_DIFF)
    }
  })

  it('should return DiffInput scoped to specified files in branch mode', () => {
    mockDiffSuccess(SAMPLE_DIFF)

    const result = getFilteredDiff(['src/foo.ts'], 'branch', 'main')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.raw).toBe(SAMPLE_DIFF)
    }
  })

  it('should return Err when no changes found in specified files', () => {
    mockDiffSuccess('')

    const result = getFilteredDiff(['src/foo.ts'], 'staged')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain(
        'No changes found in the specified file(s)'
      )
      expect(result.error).toContain('src/foo.ts')
    }
  })

  it('should return Err when git command fails', () => {
    mockGitNotFound()

    const result = getFilteredDiff(['src/foo.ts'], 'staged')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain(
        'git is not installed or not available in PATH'
      )
    }
  })
})
