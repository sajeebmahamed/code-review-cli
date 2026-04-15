// Shared TypeScript interfaces and types

// Result pattern
export type Ok<T> = { ok: true; value: T }
export type Err<E> = { ok: false; error: E }
export type Result<T, E = string> = Ok<T> | Err<E>

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value })
export const err = <E>(error: E): Err<E> => ({ ok: false, error })

// Diff
export interface DiffInput {
  raw: string
  branch: string
  filesChanged: number
  additions: number
  deletions: number
}

// Review
export type Severity = 'critical' | 'important' | 'suggestion'

export interface ReviewIssue {
  severity: Severity
  file: string
  line?: number
  message: string
  fix?: string
}

export interface ReviewReport {
  summary: string
  issues: ReviewIssue[]
  verdict: 'approve' | 'request-changes'
  generatedAt: string
  diffStats: {
    filesChanged: number
    additions: number
    deletions: number
  }
}

// CLI
export interface CLIOptions {
  output: 'markdown' | 'json'
  verbose: boolean
  model?: string
  noCache: boolean
}
