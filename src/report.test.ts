import { describe, it, expect } from 'vitest'
import { formatMarkdown, formatJSON } from './report'
import { type ReviewReport } from './types'

const BASE_REPORT: ReviewReport = {
  summary: 'Overall the code looks good.',
  issues: [],
  verdict: 'approve',
  generatedAt: '2026-04-14T00:00:00.000Z',
  diffStats: { filesChanged: 2, additions: 10, deletions: 3 },
}

describe('formatMarkdown', () => {
  it('should show "No issues found" when there are zero issues', () => {
    const result = formatMarkdown(BASE_REPORT)
    expect(result).toContain('✅ No issues found.')
  })

  it('should not show severity headers when there are zero issues', () => {
    const result = formatMarkdown(BASE_REPORT)
    expect(result).not.toContain('🔴 Critical')
    expect(result).not.toContain('🟡 Important')
    expect(result).not.toContain('🟢 Suggestions')
  })

  it('should show critical issues under the correct header', () => {
    const report: ReviewReport = {
      ...BASE_REPORT,
      verdict: 'request-changes',
      issues: [
        {
          severity: 'critical',
          file: 'src/foo.ts',
          line: 12,
          message: 'SQL injection risk',
        },
      ],
    }
    const result = formatMarkdown(report)
    expect(result).toContain('### 🔴 Critical')
    expect(result).toContain('src/foo.ts:12')
    expect(result).toContain('SQL injection risk')
  })

  it('should render all three severity groups in correct order', () => {
    const report: ReviewReport = {
      ...BASE_REPORT,
      verdict: 'request-changes',
      issues: [
        {
          severity: 'suggestion',
          file: 'src/a.ts',
          message: 'Minor style nit',
        },
        {
          severity: 'critical',
          file: 'src/b.ts',
          message: 'Null pointer risk',
        },
        {
          severity: 'important',
          file: 'src/c.ts',
          message: 'Missing validation',
        },
      ],
    }
    const result = formatMarkdown(report)
    const criticalPos = result.indexOf('🔴 Critical')
    const importantPos = result.indexOf('🟡 Important')
    const suggestionPos = result.indexOf('🟢 Suggestions')
    expect(criticalPos).toBeLessThan(importantPos)
    expect(importantPos).toBeLessThan(suggestionPos)
  })

  it('should show APPROVED verdict', () => {
    const result = formatMarkdown({ ...BASE_REPORT, verdict: 'approve' })
    expect(result).toContain('✅ **APPROVED**')
    expect(result).not.toContain('❌ **REQUEST CHANGES**')
  })

  it('should show REQUEST CHANGES verdict when critical issues exist', () => {
    const report: ReviewReport = {
      ...BASE_REPORT,
      verdict: 'request-changes',
      issues: [
        {
          severity: 'critical',
          file: 'src/auth.ts',
          line: 5,
          message: 'Hardcoded secret',
        },
      ],
    }
    const result = formatMarkdown(report)
    expect(result).toContain('❌ **REQUEST CHANGES**')
    expect(result).not.toContain('✅ **APPROVED**')
  })

  it('should include fix suggestion when fix is provided', () => {
    const report: ReviewReport = {
      ...BASE_REPORT,
      verdict: 'request-changes',
      issues: [
        {
          severity: 'important',
          file: 'src/foo.ts',
          message: 'Use const instead of let',
          fix: 'Replace let with const',
        },
      ],
    }
    const result = formatMarkdown(report)
    expect(result).toContain('Replace let with const')
  })

  it('should include diff stats in the output', () => {
    const result = formatMarkdown(BASE_REPORT)
    expect(result).toContain('2 file(s) changed')
    expect(result).toContain('+10 additions')
    expect(result).toContain('-3 deletions')
  })
})

describe('formatJSON', () => {
  it('should return valid parseable JSON', () => {
    const result = formatJSON(BASE_REPORT)
    expect(() => JSON.parse(result)).not.toThrow()
  })

  it('should produce output that matches the original report when parsed', () => {
    const result = formatJSON(BASE_REPORT)
    const parsed = JSON.parse(result)
    expect(parsed).toEqual(BASE_REPORT)
  })
})
