import { describe, it, expect, vi, afterEach } from 'vitest'
import { startSpinner } from './spinner'

describe('startSpinner', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should return a stop function', () => {
    vi.useFakeTimers()
    vi.spyOn(process.stderr, 'write').mockReturnValue(true)
    const stop = startSpinner('Loading')
    expect(typeof stop).toBe('function')
    stop()
  })

  it('should write the initial message immediately', () => {
    vi.useFakeTimers()
    const writes: string[] = []
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      if (typeof chunk === 'string') writes.push(chunk)
      return true
    })
    const stop = startSpinner('Loading')
    expect(writes).toContain('Loading 0s')
    stop()
  })

  it('should show elapsed seconds after ticks', () => {
    vi.useFakeTimers()
    const writes: string[] = []
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      if (typeof chunk === 'string') writes.push(chunk)
      return true
    })
    const stop = startSpinner('Testing')
    vi.advanceTimersByTime(1500)
    expect(writes).toContain('Testing 1s')
    stop()
  })

  it('should stop updating after stop() is called', () => {
    vi.useFakeTimers()
    const writes: string[] = []
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      if (typeof chunk === 'string') writes.push(chunk)
      return true
    })
    const stop = startSpinner('Loading')
    stop()
    const countAfterStop = writes.length
    vi.advanceTimersByTime(5000)
    expect(writes.length).toBe(countAfterStop)
  })
})
