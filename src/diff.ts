// Git diff utilities

import { execSync } from 'child_process'
import { type Result, type DiffInput, ok, err } from './types'

const getCurrentBranch = (): string => {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
    }).trim()
  } catch {
    return 'unknown'
  }
}

export const parseDiffStats = (
  rawDiff: string
): { filesChanged: number; additions: number; deletions: number } => {
  const lines = rawDiff.split('\n')
  let additions = 0
  let deletions = 0
  let filesChanged = 0

  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      filesChanged++
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      additions++
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      deletions++
    }
  }

  return { filesChanged, additions, deletions }
}

const buildDiffInput = (raw: string): DiffInput => {
  const stats = parseDiffStats(raw)
  return {
    raw,
    branch: getCurrentBranch(),
    ...stats,
  }
}

const runGitDiff = (args: string): Result<DiffInput> => {
  try {
    const raw = execSync(`git diff ${args}`, { encoding: 'utf8' })
    return ok(buildDiffInput(raw))
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    if (message.includes('not a git repository')) {
      return err('Not a git repository. Run this command inside a git project.')
    }
    if (message.includes('command not found') || message.includes('ENOENT')) {
      return err('git is not installed or not available in PATH.')
    }
    return err(`Failed to run git diff: ${message}`)
  }
}

export const getStagedDiff = (): Result<DiffInput> => {
  const result = runGitDiff('--staged')
  if (!result.ok) return result
  if (result.value.raw.trim() === '') {
    return err("No staged changes found. Run 'git add' to stage files first.")
  }
  return result
}

export const getHeadDiff = (): Result<DiffInput> => {
  const result = runGitDiff('HEAD')
  if (!result.ok) return result
  if (result.value.raw.trim() === '') {
    return err('No changes found against HEAD.')
  }
  return result
}

export const getDiffFromBranch = (
  branch: string = 'main'
): Result<DiffInput> => {
  const result = runGitDiff(`origin/${branch}...HEAD`)
  if (!result.ok) return result
  if (result.value.raw.trim() === '') {
    return err(`No changes found between HEAD and origin/${branch}.`)
  }
  return result
}
