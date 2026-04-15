// Tests for cache.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { diffHash, readCache, writeCache } from './cache'
import type { ReviewReport } from './types'

vi.mock('fs')
vi.mock('os', () => ({ homedir: (): string => '/mock-home' }))

const mockReport: ReviewReport = {
  summary: 'Looks good',
  issues: [],
  verdict: 'approve',
  generatedAt: '2026-04-15T10:00:00.000Z',
  diffStats: { filesChanged: 1, additions: 5, deletions: 2 },
}

const CACHE_FILE = '/mock-home/.code-review-cli/cache.json'

beforeEach(() => {
  vi.mocked(existsSync).mockReturnValue(false)
  vi.mocked(mkdirSync).mockReturnValue(undefined)
  vi.mocked(writeFileSync).mockReturnValue(undefined)
})

afterEach(() => {
  vi.resetAllMocks()
})

describe('diffHash', () => {
  it('produces a consistent 64-char hex string', () => {
    const hash = diffHash('some diff content')
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]+$/)
  })

  it('produces different hashes for different inputs', () => {
    expect(diffHash('diff A')).not.toBe(diffHash('diff B'))
  })

  it('produces the same hash for the same input', () => {
    expect(diffHash('same diff')).toBe(diffHash('same diff'))
  })
})

describe('readCache', () => {
  it('returns null when cache file does not exist', () => {
    vi.mocked(existsSync).mockReturnValue(false)
    const result = readCache('somekey')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBeNull()
  })

  it('returns null when key is not in the cache', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({}))
    const result = readCache('missingkey')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBeNull()
  })

  it('returns null when entry is older than 24 hours', () => {
    const expiredAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ mykey: { cachedAt: expiredAt, report: mockReport } })
    )
    const result = readCache('mykey')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBeNull()
  })

  it('returns the cached report when entry is within TTL', () => {
    const recentAt = new Date(Date.now() - 60 * 1000).toISOString()
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ mykey: { cachedAt: recentAt, report: mockReport } })
    )
    const result = readCache('mykey')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toEqual(mockReport)
  })

  it('returns err when cache file contains malformed JSON', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue('not json {{')
    const result = readCache('anykey')
    expect(result.ok).toBe(false)
  })

  it('returns err when cache file is not an object', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify([1, 2, 3]))
    const result = readCache('anykey')
    expect(result.ok).toBe(false)
  })
})

describe('writeCache', () => {
  it('creates the cache directory if it does not exist', () => {
    vi.mocked(existsSync).mockReturnValue(false)
    writeCache('newkey', mockReport)
    expect(mkdirSync).toHaveBeenCalledWith('/mock-home/.code-review-cli', {
      recursive: true,
    })
  })

  it('does not call mkdirSync if directory already exists', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({}))
    writeCache('newkey', mockReport)
    expect(mkdirSync).not.toHaveBeenCalled()
  })

  it('writes the report under the given key', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({}))

    writeCache('mykey', mockReport)

    const written = vi.mocked(writeFileSync).mock.calls[0]
    expect(written[0]).toBe(CACHE_FILE)
    const stored = JSON.parse(written[1] as string)
    expect(stored['mykey'].report).toEqual(mockReport)
    expect(stored['mykey'].cachedAt).toBeDefined()
  })

  it('merges into existing entries without overwriting others', () => {
    const existingAt = new Date(Date.now() - 60 * 1000).toISOString()
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ existing: { cachedAt: existingAt, report: mockReport } })
    )

    writeCache('newkey', mockReport)

    const written = vi.mocked(writeFileSync).mock.calls[0]
    const stored = JSON.parse(written[1] as string)
    expect(stored['existing']).toBeDefined()
    expect(stored['newkey']).toBeDefined()
  })

  it('returns ok on success', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({}))
    const result = writeCache('k', mockReport)
    expect(result.ok).toBe(true)
  })

  it('returns err when writeFileSync throws', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({}))
    vi.mocked(writeFileSync).mockImplementation(() => {
      throw new Error('disk full')
    })
    const result = writeCache('k', mockReport)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('disk full')
  })
})
