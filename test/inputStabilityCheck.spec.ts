import { createSelector, setInputStabilityCheckEnabled } from 'reselect'

describe('inputStabilityCheck', () => {
  const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

  const unstableInput = vi.fn((a: number, b: number) => ({ a, b }))

  const addNums = createSelector([unstableInput], ({ a, b }) => a + b)

  afterEach(() => {
    consoleSpy.mockClear()
    unstableInput.mockClear()
    addNums.clearCache()
  })
  afterAll(() => {
    consoleSpy.mockRestore()
  })

  it('calls each input selector twice, and warns to console if unstable reference is returned', () => {
    const stableAddNums = createSelector(
      [(a: number) => a, (a: number, b: number) => b],
      (a, b) => a + b
    )

    expect(stableAddNums(1, 2)).toBe(3)

    expect(consoleSpy).not.toHaveBeenCalled()

    expect(addNums(1, 2)).toBe(3)

    expect(unstableInput).toHaveBeenCalledTimes(2)

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('An input selector returned a different result')
    )
  })

  it('disables check if specified', () => {
    setInputStabilityCheckEnabled(false)

    expect(addNums(1, 2)).toBe(3)

    expect(unstableInput).toHaveBeenCalledTimes(1)

    expect(consoleSpy).not.toHaveBeenCalled()

    setInputStabilityCheckEnabled(true)
  })

  it('disables check in production', () => {
    const originalEnv = process.env.NODE_ENV

    process.env.NODE_ENV = 'production'

    expect(addNums(1, 2)).toBe(3)

    expect(unstableInput).toHaveBeenCalledTimes(1)

    expect(consoleSpy).not.toHaveBeenCalled()

    process.env.NODE_ENV = originalEnv
  })
})
