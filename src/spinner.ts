// Spinner utility for long-running CLI operations

const INTERVAL_MS = 500

export const startSpinner = (message: string): (() => void) => {
  const startTime = Date.now()
  let timer: NodeJS.Timeout | null = null
  let stopped = false

  const clearLine = (): void => {
    if (process.stderr.isTTY) {
      process.stderr.clearLine(0)
      process.stderr.cursorTo(0)
    } else {
      process.stderr.write('\n')
    }
  }

  const tick = (): void => {
    if (stopped) return
    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    clearLine()
    process.stderr.write(`${message} ${elapsed}s`)
    timer = setTimeout(tick, INTERVAL_MS)
  }

  process.stderr.write(`${message} 0s`)
  timer = setTimeout(tick, INTERVAL_MS)

  const stop = (): void => {
    stopped = true
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    clearLine()
  }

  return stop
}
