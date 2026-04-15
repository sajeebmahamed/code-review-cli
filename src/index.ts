#!/usr/bin/env node

// CLI entry point

import { Command } from 'commander'
import { z } from 'zod'
import { getStagedDiff, getHeadDiff, getDiffFromBranch } from './diff'
import { runReview } from './review'
import { formatMarkdown, formatJSON } from './report'
import { type CLIOptions } from './types'

const OptionsSchema = z.object({
  staged: z.boolean().default(true),
  head: z.boolean().default(false),
  branch: z.string().optional(),
  output: z.enum(['markdown', 'json']).default('markdown'),
  verbose: z.boolean().default(false),
  model: z.string().optional(),
})

type RawOptions = z.infer<typeof OptionsSchema>

const startSpinner = (): NodeJS.Timeout => {
  let seconds = 0
  process.stderr.write('Reviewing... 0s')
  return setInterval(() => {
    seconds++
    process.stderr.clearLine(0)
    process.stderr.cursorTo(0)
    process.stderr.write(`Reviewing... ${seconds}s`)
  }, 1000)
}

const clearSpinner = (timer: NodeJS.Timeout): void => {
  clearInterval(timer)
  process.stderr.clearLine(0)
  process.stderr.cursorTo(0)
}

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
  .option(
    '--output <format>',
    'output format: markdown or json (default: markdown)',
    'markdown'
  )
  .option('--verbose', 'show diff stats and extra detail', false)
  .option('--model <name>', 'override Claude model name')
  .action(async (rawOpts: Record<string, unknown>) => {
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

    // Get diff
    const diffResult = opts.head
      ? getHeadDiff()
      : opts.branch
        ? getDiffFromBranch(opts.branch)
        : getStagedDiff()

    if (!diffResult.ok) {
      console.error(`Error: ${diffResult.error}`)
      process.exit(1)
    }

    if (opts.verbose && !isJson) {
      const { filesChanged, additions, deletions } = diffResult.value
      console.error(
        `Diff: ${filesChanged} file(s) changed, +${additions} -${deletions}`
      )
    }

    // Spinner (only when not json output)
    let spinner: NodeJS.Timeout | null = null
    if (!isJson) {
      spinner = startSpinner()
    }

    const reviewResult = await runReview(diffResult.value, cliOptions)

    if (spinner) {
      clearSpinner(spinner)
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
