// Core review orchestration

import { spawnSync } from 'child_process'
import { z } from 'zod'
import {
  type Result,
  type DiffInput,
  type CLIOptions,
  type ReviewReport,
  ok,
  err,
} from './types'

const ReviewIssueSchema = z.object({
  severity: z.enum(['critical', 'important', 'suggestion']),
  file: z.string(),
  line: z.number().optional(),
  message: z.string(),
  fix: z.string().optional(),
})

const ReviewReportSchema = z.object({
  summary: z.string(),
  issues: z.array(ReviewIssueSchema),
  verdict: z.enum(['approve', 'request-changes']),
  generatedAt: z.string().datetime(),
  diffStats: z.object({
    filesChanged: z.number(),
    additions: z.number(),
    deletions: z.number(),
  }),
})

const buildPrompt = (diff: DiffInput): string =>
  `
You are a senior TypeScript/Node.js code reviewer.

Analyse the following git diff and return a structured code review as a single JSON object.
Do NOT include any markdown, explanation, or text outside the JSON object.

The JSON must match this exact shape:
{
  "summary": "string — one paragraph overview",
  "issues": [
    {
      "severity": "critical" | "important" | "suggestion",
      "file": "string — filename",
      "line": number (optional),
      "message": "string — what is wrong",
      "fix": "string — how to fix it (optional)"
    }
  ],
  "verdict": "approve" | "request-changes",
  "generatedAt": "ISO 8601 timestamp",
  "diffStats": {
    "filesChanged": ${diff.filesChanged},
    "additions": ${diff.additions},
    "deletions": ${diff.deletions}
  }
}

Severity definitions:
- critical: security vulnerability, data loss risk, broken logic
- important: missing error handling, type safety violation, bad pattern
- suggestion: style, readability, minor improvement

Project conventions to enforce:
- No \`any\` types — use \`unknown\` with type guards
- All functions must have explicit return types
- Errors must use Result<T, E> pattern — never throw raw strings
- Prefer \`const\` over \`let\`, never \`var\`

Branch: ${diff.branch}
Files changed: ${diff.filesChanged}, +${diff.additions} -${diff.deletions}

--- DIFF START ---
${diff.raw}
--- DIFF END ---
`.trim()

const parseReport = (raw: string): Result<ReviewReport> => {
  try {
    const parsed: unknown = JSON.parse(raw)
    const validated = ReviewReportSchema.safeParse(parsed)
    if (!validated.success) {
      return err('Claude returned an unexpected response format')
    }
    return ok(validated.data)
  } catch {
    return err('Claude returned an unexpected response format')
  }
}

export const runReview = (
  diff: DiffInput,
  options: CLIOptions
): Result<ReviewReport> => {
  const prompt = buildPrompt(diff)
  const model = options.model ?? 'claude-sonnet-4-6'

  const result = spawnSync(
    'claude',
    ['-p', '--output-format', 'json', '--model', model],
    {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 60000,
      input: prompt,
    }
  )

  if (result.error) {
    const msg = result.error.message
    if (msg.includes('ENOENT') || msg.includes('command not found')) {
      return err(
        'Claude Code is not installed. Run: npm install -g @anthropic-ai/claude-code'
      )
    }
    return err(`Failed to run claude: ${msg}`)
  }

  if (result.status !== 0) {
    const stderr = result.stderr?.trim() ?? ''
    if (stderr.includes('ANTHROPIC_API_KEY') || stderr.includes('API key')) {
      return err(
        'ANTHROPIC_API_KEY is not set. Add it to .claude/settings.local.json'
      )
    }
    return err(stderr || `claude exited with code ${result.status}`)
  }

  const stdout = result.stdout?.trim() ?? ''

  if (options.verbose) {
    console.error('[review] raw claude output:', stdout)
  }

  // claude --output-format json wraps output in a result envelope
  // extract the text field if present, otherwise treat stdout as raw JSON
  let jsonText = stdout
  try {
    const envelope: unknown = JSON.parse(stdout)
    if (
      typeof envelope === 'object' &&
      envelope !== null &&
      'result' in envelope &&
      typeof (envelope as Record<string, unknown>).result === 'string'
    ) {
      jsonText = (envelope as Record<string, unknown>).result as string
    }
  } catch {
    // stdout is not a JSON envelope — fall through and try parsing directly
  }

  return parseReport(jsonText)
}
