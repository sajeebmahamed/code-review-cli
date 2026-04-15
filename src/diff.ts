// Git diff utilities

import { spawnSync } from 'child_process'
import { type Result, type DiffInput, ok, err } from './types'

// Silent fallback — detached HEAD returns 'unknown', not an error
const getCurrentBranch = (): string => {
  const result = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    encoding: 'utf8',
  })
  if (result.status === 0) {
    return result.stdout.trim()
  }
  return 'unknown'
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

// Uses spawnSync array form to avoid shell injection via branch names
const runGitDiff = (args: string[]): Result<DiffInput> => {
  const result = spawnSync('git', ['diff', ...args], { encoding: 'utf8' })

  if (result.error) {
    const msg = result.error.message
    if (msg.includes('ENOENT') || msg.includes('command not found')) {
      return err('git is not installed or not available in PATH.')
    }
    return err(`Failed to run git diff: ${msg}`)
  }

  if (result.status !== 0) {
    const stderr = result.stderr?.trim() ?? ''
    if (stderr.includes('not a git repository')) {
      return err('Not a git repository. Run this command inside a git project.')
    }
    return err(`Failed to run git diff: ${stderr}`)
  }

  return ok(buildDiffInput(result.stdout))
}

export const getStagedDiff = (): Result<DiffInput> => {
  const result = runGitDiff(['--staged'])
  if (!result.ok) return result
  if (result.value.raw.trim() === '') {
    return err("No staged changes found. Run 'git add' to stage files first.")
  }
  return result
}

export const getHeadDiff = (): Result<DiffInput> => {
  const result = runGitDiff(['HEAD'])
  if (!result.ok) return result
  if (result.value.raw.trim() === '') {
    return err('No changes found against HEAD.')
  }
  return result
}

export const getDiffFromBranch = (
  branch: string = 'main'
): Result<DiffInput> => {
  const result = runGitDiff([`origin/${branch}...HEAD`])
  if (!result.ok) return result
  if (result.value.raw.trim() === '') {
    return err(`No changes found between HEAD and origin/${branch}.`)
  }
  return result
}

// Runs git diff scoped to specific file paths.
// Appends paths after '--' to prevent git from misinterpreting them as flags.
export const getFilteredDiff = (
  paths: string[],
  mode: 'staged' | 'head' | 'branch',
  branch: string = 'main'
): Result<DiffInput> => {
  const modeArgs: string[] =
    mode === 'staged'
      ? ['--staged']
      : mode === 'head'
        ? ['HEAD']
        : [`origin/${branch}...HEAD`]

  const result = runGitDiff([...modeArgs, '--', ...paths])
  if (!result.ok) return result
  if (result.value.raw.trim() === '') {
    return err(`No changes found in the specified file(s): ${paths.join(', ')}`)
  }
  return result
}
