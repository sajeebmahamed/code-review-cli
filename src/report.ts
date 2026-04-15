// Report formatting (markdown / JSON)

import { type ReviewReport, type Severity, type ReviewIssue } from './types'

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: '🔴 Critical',
  important: '🟡 Important',
  suggestion: '🟢 Suggestions',
}

const SEVERITY_ORDER: Severity[] = ['critical', 'important', 'suggestion']

const formatIssue = (issue: ReviewIssue): string => {
  const location = issue.line ? `${issue.file}:${issue.line}` : issue.file
  const fix = issue.fix ? `\n  > Fix: ${issue.fix}` : ''
  return `- **${location}** — ${issue.message}${fix}`
}

export const formatMarkdown = (report: ReviewReport): string => {
  const date = new Date(report.generatedAt).toUTCString()
  const { filesChanged, additions, deletions } = report.diffStats

  const lines: string[] = [
    `## Code Review — ${date}`,
    '',
    `**Stats:** ${filesChanged} file(s) changed, +${additions} additions, -${deletions} deletions`,
    '',
    `**Summary:** ${report.summary}`,
    '',
  ]

  if (report.issues.length === 0) {
    lines.push('✅ No issues found.')
  } else {
    for (const severity of SEVERITY_ORDER) {
      const group = report.issues.filter((i) => i.severity === severity)
      if (group.length === 0) continue
      lines.push(`### ${SEVERITY_LABEL[severity]}`)
      lines.push('')
      for (const issue of group) {
        lines.push(formatIssue(issue))
      }
      lines.push('')
    }
  }

  lines.push('---')
  lines.push(
    report.verdict === 'approve' ? '✅ **APPROVED**' : '❌ **REQUEST CHANGES**'
  )

  return lines.join('\n')
}

// JSON.stringify on a well-typed ReviewReport cannot produce unparseable JSON.
// No round-trip validation needed — returning directly avoids a raw throw.
export const formatJSON = (report: ReviewReport): string =>
  JSON.stringify(report, null, 2)
