// File-based cache for review results

import { createHash } from 'crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { type Result, type ReviewReport, ok, err } from './types'

const CACHE_DIR = join(homedir(), '.code-review-cli')
const CACHE_FILE = join(CACHE_DIR, 'cache.json')
const TTL_MS = 24 * 60 * 60 * 1000

interface CacheEntry {
  cachedAt: string
  report: ReviewReport
}

type CacheStore = Record<string, CacheEntry>

export const diffHash = (raw: string): string =>
  createHash('sha256').update(raw).digest('hex')

const readCacheStore = (): Result<CacheStore> => {
  if (!existsSync(CACHE_FILE)) return ok({})
  try {
    const contents = readFileSync(CACHE_FILE, 'utf8')
    const parsed: unknown = JSON.parse(contents)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return err('cache file is malformed')
    }
    return ok(parsed as CacheStore)
  } catch {
    return err('cache file is malformed')
  }
}

export const readCache = (key: string): Result<ReviewReport | null> => {
  const storeResult = readCacheStore()
  if (!storeResult.ok) return err(storeResult.error)

  const entry = storeResult.value[key]
  if (entry === undefined) return ok(null)

  const age = Date.now() - new Date(entry.cachedAt).getTime()
  if (age > TTL_MS) return ok(null)

  return ok(entry.report)
}

export const writeCache = (key: string, report: ReviewReport): Result<void> => {
  try {
    if (!existsSync(CACHE_DIR)) {
      mkdirSync(CACHE_DIR, { recursive: true })
    }

    const storeResult = readCacheStore()
    const store: CacheStore = storeResult.ok ? storeResult.value : {}

    store[key] = { cachedAt: new Date().toISOString(), report }

    writeFileSync(CACHE_FILE, JSON.stringify(store, null, 2), 'utf8')
    return ok(undefined)
  } catch (e) {
    return err(
      `failed to write cache: ${e instanceof Error ? e.message : String(e)}`
    )
  }
}
