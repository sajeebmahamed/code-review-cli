import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawnSync, type SpawnSyncReturns } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

const DIST_CLI = path.resolve(__dirname, '../dist/index.js')
const PROJECT_ROOT = path.resolve(__dirname, '..')

const MOCK_REPORT = {
  summary: 'Test review: code looks good.',
  issues: [],
  verdict: 'approve',
  generatedAt: new Date().toISOString(),
  diffStats: { filesChanged: 1, additions: 3, deletions: 0 },
}

let fakeClaudeDir = ''

const runCLI = (
  args: string[],
  opts: { cwd?: string; env?: Record<string, string> } = {}
): SpawnSyncReturns<string> =>
  spawnSync('node', [DIST_CLI, ...args], {
    encoding: 'utf8',
    cwd: opts.cwd ?? PROJECT_ROOT,
    env: { ...process.env, ...opts.env },
  })

// Creates a temp git repo with one staged file so diff is non-empty
const createTempRepo = (): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-repo-'))
  spawnSync('git', ['init'], { cwd: dir, encoding: 'utf8' })
  spawnSync('git', ['config', 'user.email', 'test@example.com'], {
    cwd: dir,
    encoding: 'utf8',
  })
  spawnSync('git', ['config', 'user.name', 'Test User'], {
    cwd: dir,
    encoding: 'utf8',
  })
  fs.writeFileSync(path.join(dir, 'README.md'), '# Init\n')
  spawnSync('git', ['add', '.'], { cwd: dir, encoding: 'utf8' })
  spawnSync('git', ['commit', '-m', 'init'], { cwd: dir, encoding: 'utf8' })
  // Stage a new file so --staged returns non-empty diff
  fs.writeFileSync(path.join(dir, 'src.ts'), 'const x: number = 1\n')
  spawnSync('git', ['add', '.'], { cwd: dir, encoding: 'utf8' })
  return dir
}

describe('CLI integration', () => {
  beforeAll(() => {
    // Build the CLI so dist/index.js exists
    const build = spawnSync('npm', ['run', 'build'], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    })
    if (build.status !== 0) {
      throw new Error(`Build failed:\n${build.stderr}`)
    }

    // Create a fake `claude` binary that echoes a valid report envelope.
    // review.ts extracts envelope.result (a JSON string) and parses it.
    fakeClaudeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-claude-'))
    const envelopePath = path.join(fakeClaudeDir, 'response.json')
    fs.writeFileSync(
      envelopePath,
      JSON.stringify({ result: JSON.stringify(MOCK_REPORT) })
    )
    fs.writeFileSync(
      path.join(fakeClaudeDir, 'claude'),
      `#!/bin/sh\ncat '${envelopePath}'\n`,
      { mode: 0o755 }
    )
  }, 30000)

  afterAll(() => {
    if (fakeClaudeDir) {
      fs.rmSync(fakeClaudeDir, { recursive: true, force: true })
    }
  })

  it('should exit with code 1 and show helpful message when no staged changes', () => {
    // PROJECT_ROOT has a clean working tree — git diff --staged returns empty
    const result = runCLI(['review', '--staged'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('No staged changes found')
  })

  it('should output valid parseable JSON when --output json is passed', () => {
    const tempRepo = createTempRepo()
    try {
      const result = runCLI(['review', '--staged', '--output', 'json'], {
        cwd: tempRepo,
        env: { PATH: `${fakeClaudeDir}:${process.env.PATH ?? ''}` },
      })
      expect(result.status).toBe(0)
      expect(() => JSON.parse(result.stdout)).not.toThrow()
      const parsed = JSON.parse(result.stdout) as Record<string, unknown>
      expect(parsed).toHaveProperty('summary')
      expect(parsed).toHaveProperty('verdict')
      expect(parsed).toHaveProperty('issues')
    } finally {
      fs.rmSync(tempRepo, { recursive: true, force: true })
    }
  })

  it('should exit with code 2 when an invalid --output value is passed', () => {
    // 'invalid-format' passes Commander but fails the zod enum validation
    const result = runCLI(['review', '--output', 'invalid-format'])
    expect(result.status).toBe(2)
  })

  it('should exit with code 0 and list options when --help is passed', () => {
    const result = runCLI(['review', '--help'])
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('--staged')
    expect(result.stdout).toContain('--output')
    expect(result.stdout).toContain('--branch')
    expect(result.stdout).toContain('--verbose')
    expect(result.stdout).toContain('--model')
  })
})
