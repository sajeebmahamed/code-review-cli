import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runReview } from './review'
import { type DiffInput, type CLIOptions, type ReviewReport } from './types'

vi.mock('child_process', () => ({
  spawnSync: vi.fn(),
}))

vi.mock('./cache', () => ({
  diffHash: vi.fn(() => 'mockhash'),
  readCache: vi.fn(() => ({ ok: true, value: null })),
  writeCache: vi.fn(() => ({ ok: true, value: undefined })),
}))

import { spawnSync } from 'child_process'

const mockSpawnSync = vi.mocked(spawnSync)

const DIFF: DiffInput = {
  raw: 'diff --git a/src/foo.ts b/src/foo.ts\n+const x = 1\n',
  branch: 'development',
  filesChanged: 1,
  additions: 1,
  deletions: 0,
}

const OPTIONS: CLIOptions = {
  output: 'markdown',
  verbose: false,
  noCache: true,
}

const VALID_REPORT: ReviewReport = {
  summary: 'Looks good overall.',
  issues: [],
  verdict: 'approve',
  generatedAt: '2026-04-14T00:00:00.000Z',
  diffStats: { filesChanged: 1, additions: 1, deletions: 0 },
}

// Simulates the JSON envelope Claude returns with --output-format json
const makeEnvelope = (report: ReviewReport): string =>
  JSON.stringify({ result: JSON.stringify(report) })

const makeSpawnResult = (
  overrides: Partial<{
    status: number | null
    stdout: string
    stderr: string
    error: Error | undefined
  }>
): ReturnType<typeof spawnSync> =>
  ({
    status: 0,
    stdout: '',
    stderr: '',
    error: undefined,
    pid: 1,
    output: [],
    signal: null,
    ...overrides,
  }) as ReturnType<typeof spawnSync>

describe('runReview', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should return ReviewReport when Claude responds with valid JSON envelope', () => {
    mockSpawnSync.mockReturnValueOnce(
      makeSpawnResult({ stdout: makeEnvelope(VALID_REPORT) })
    )

    const result = runReview(DIFF, OPTIONS)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.summary).toBe('Looks good overall.')
      expect(result.value.verdict).toBe('approve')
      expect(result.value.issues).toHaveLength(0)
    }
  })

  it('should return ReviewReport when Claude responds with raw JSON (no envelope)', () => {
    mockSpawnSync.mockReturnValueOnce(
      makeSpawnResult({ stdout: JSON.stringify(VALID_REPORT) })
    )

    const result = runReview(DIFF, OPTIONS)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.verdict).toBe('approve')
    }
  })

  it('should return Err when claude command is not found', () => {
    mockSpawnSync.mockReturnValueOnce(
      makeSpawnResult({
        status: null,
        error: new Error('spawnSync claude ENOENT'),
      })
    )

    const result = runReview(DIFF, OPTIONS)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('Claude Code is not installed')
    }
  })

  it('should return Err when API key is missing', () => {
    mockSpawnSync.mockReturnValueOnce(
      makeSpawnResult({
        status: 1,
        stderr: 'Error: ANTHROPIC_API_KEY is not set',
      })
    )

    const result = runReview(DIFF, OPTIONS)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('ANTHROPIC_API_KEY is not set')
    }
  })

  it('should return Err when Claude returns malformed JSON', () => {
    mockSpawnSync.mockReturnValueOnce(
      makeSpawnResult({ stdout: 'not valid json at all' })
    )

    const result = runReview(DIFF, OPTIONS)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('unexpected response format')
    }
  })

  it('should return Err when Claude exits with non-zero code', () => {
    mockSpawnSync.mockReturnValueOnce(
      makeSpawnResult({ status: 1, stderr: 'Internal server error' })
    )

    const result = runReview(DIFF, OPTIONS)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('Internal server error')
    }
  })
})
