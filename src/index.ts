#!/usr/bin/env node

// CLI entry point

import { Command } from 'commander'
import { z } from 'zod'
import {
  getStagedDiff,
  getHeadDiff,
  getDiffFromBranch,
  getFilteredDiff,
} from './diff'
import { runReview } from './review'
import { formatMarkdown, formatJSON } from './report'
import { type CLIOptions } from './types'
import { startSpinner } from './spinner'

const DIFF_SIZE_LIMIT = 100_000

const OptionsSchema = z.object({
  staged: z.boolean().default(true),
  head: z.boolean().default(false),
  branch: z.string().optional(),
  files: z.array(z.string()).optional(),
  output: z.enum(['markdown', 'json']).default('markdown'),
  verbose: z.boolean().default(false),
  model: z.string().optional(),
})

type RawOptions = z.infer<typeof OptionsSchema>

const program = new Command()

program
  .name('code-review-cli')
  .description('AI-powered code review using Claude')
  .version('0.1.0')

program
  .command('review')
  .description('Review code changes using Claude')
  .option('--staged', 'review staged changes (default)', false)
  .option('--head', 'review changes since last commit', false)
  .option('--branch <name>', 'review diff vs this branch (default: main)')
  .option('--files <paths...>', 'review only these files (space-separated)')
  .option(
    '--output <format>',
    'output format: markdown or json (default: markdown)',
    'markdown'
  )
  .option('--verbose', 'show diff stats and extra detail', false)
  .option('--model <name>', 'override Claude model name')
  .action((rawOpts: Record<string, unknown>) => {
    // Validate options
    const parsed = OptionsSchema.safeParse(rawOpts)
    if (!parsed.success) {
      console.error('Invalid options:', parsed.error.flatten().fieldErrors)
      process.exit(2)
    }

    const opts: RawOptions = parsed.data
    const isJson = opts.output === 'json'

    const cliOptions: CLIOptions = {
      output: opts.output,
      verbose: opts.verbose,
      model: opts.model,
    }

    // Determine diff mode
    const mode: 'staged' | 'head' | 'branch' = opts.head
      ? 'head'
      : opts.branch
        ? 'branch'
        : 'staged'

    // Get diff — scoped to files if --files is provided
    const diffResult = opts.files
      ? getFilteredDiff(opts.files, mode, opts.branch)
      : mode === 'head'
        ? getHeadDiff()
        : mode === 'branch'
          ? getDiffFromBranch(opts.branch)
          : getStagedDiff()

    if (!diffResult.ok) {
      console.error(`Error: ${diffResult.error}`)
      process.exit(1)
    }

    // Guard against diffs too large for a quality review
    if (diffResult.value.raw.length > DIFF_SIZE_LIMIT) {
      const lines = diffResult.value.raw.split('\n').length
      console.error(
        `Error: Diff is too large (${lines} lines, ${diffResult.value.raw.length} chars). ` +
          `Narrow the scope with --files or review in smaller batches.`
      )
      process.exit(1)
    }

    if (opts.verbose && !isJson) {
      const { filesChanged, additions, deletions } = diffResult.value
      console.error(
        `Diff: ${filesChanged} file(s) changed, +${additions} -${deletions}`
      )
    }

    // Spinner (only when not json output)
    let stopSpinner: (() => void) | null = null
    if (!isJson) {
      stopSpinner = startSpinner('Reviewing...')
    }

    const reviewResult = runReview(diffResult.value, cliOptions)

    if (stopSpinner) {
      stopSpinner()
    }

    if (!reviewResult.ok) {
      console.error(`Error: ${reviewResult.error}`)
      process.exit(1)
    }

    const output = isJson
      ? formatJSON(reviewResult.value)
      : formatMarkdown(reviewResult.value)

    process.stdout.write(output + '\n')
    process.exit(0)
  })

program.parse(process.argv)
