import {
  createSelector,
  setGlobalDevModeChecks,
  weakMapMemoize
} from 'reselect'
import { CACHE_SIZE_CHECK_THRESHOLD } from '@internal/devModeChecks/cacheSizeCheck'

describe('cacheSizeCheck', () => {
  const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

  const fillPastThreshold = (memoized: (id: number) => unknown) => {
    for (let i = 0; i <= CACHE_SIZE_CHECK_THRESHOLD; i++) {
      memoized(i)
    }
  }

  afterEach(() => {
    consoleSpy.mockClear()
    setGlobalDevModeChecks({ cacheSizeCheck: 'once' })
  })

  afterAll(() => {
    consoleSpy.mockRestore()
  })

  test('warns once when a cache accumulates too many primitive-keyed entries', () => {
    const memoized = weakMapMemoize(function selectDouble(id: number) {
      return id * 2
    })

    for (let i = 0; i < CACHE_SIZE_CHECK_THRESHOLD; i++) {
      memoized(i)
    }
    expect(consoleSpy).not.toHaveBeenCalled()

    memoized(CACHE_SIZE_CHECK_THRESHOLD)
    expect(consoleSpy).toHaveBeenCalledOnce()
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('selectDouble'),
      { stack: expect.any(String) }
    )

    // Still just the one warning as the cache keeps growing.
    for (let i = 0; i < 100; i++) {
      memoized(CACHE_SIZE_CHECK_THRESHOLD + 1 + i)
    }
    expect(consoleSpy).toHaveBeenCalledOnce()
  })

  test('cache hits do not count toward the threshold', () => {
    const memoized = weakMapMemoize((id: number) => id * 2)

    for (let i = 0; i < 100; i++) {
      for (let j = 0; j < CACHE_SIZE_CHECK_THRESHOLD; j++) {
        memoized(j)
      }
    }

    expect(consoleSpy).not.toHaveBeenCalled()
  })

  test('object arguments do not count toward the threshold', () => {
    const memoized = weakMapMemoize((source: { id: number }) => source.id)

    for (let i = 0; i <= CACHE_SIZE_CHECK_THRESHOLD; i++) {
      memoized({ id: i })
    }

    expect(consoleSpy).not.toHaveBeenCalled()
  })

  test('measures each argument position separately', () => {
    const memoized = weakMapMemoize((from: number, to: number) =>
      [from, to].join('-')
    )

    // Two argument positions just over half the threshold each: the function
    // as a whole holds more than the threshold, but no single position does,
    // so nothing fires yet.
    const half = CACHE_SIZE_CHECK_THRESHOLD / 2 + 1
    for (let i = 0; i < half; i++) {
      memoized(i, i + 1)
    }
    expect(consoleSpy).not.toHaveBeenCalled()

    // Push the first position past the threshold on its own.
    for (let i = half; i <= CACHE_SIZE_CHECK_THRESHOLD; i++) {
      memoized(i, i + 1)
    }
    expect(consoleSpy).toHaveBeenCalledOnce()
  })

  test('a fresh Map under a collected object key does not accumulate phantom counts', () => {
    // Each new object argument starts a fresh subtree, so the primitive Map
    // under it starts empty. Object churn with a handful of primitive values
    // per object never approaches the threshold.
    const memoized = weakMapMemoize(
      (source: { id: number }, page: number) => source.id + page
    )

    for (let i = 0; i <= CACHE_SIZE_CHECK_THRESHOLD; i++) {
      memoized({ id: i }, i % 10)
    }

    expect(consoleSpy).not.toHaveBeenCalled()
  })

  test('clearCache resets the count and re-arms the warning', () => {
    const memoized = weakMapMemoize((id: number) => id * 2)

    fillPastThreshold(memoized)
    expect(consoleSpy).toHaveBeenCalledOnce()

    memoized.clearCache()

    for (let i = 0; i < CACHE_SIZE_CHECK_THRESHOLD; i++) {
      memoized(i)
    }
    expect(consoleSpy).toHaveBeenCalledOnce()

    memoized(CACHE_SIZE_CHECK_THRESHOLD)
    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })

  test('warns on every insertion past the threshold when set to always', () => {
    setGlobalDevModeChecks({ cacheSizeCheck: 'always' })
    const memoized = weakMapMemoize((id: number) => id * 2)

    fillPastThreshold(memoized)
    expect(consoleSpy).toHaveBeenCalledOnce()

    memoized(CACHE_SIZE_CHECK_THRESHOLD + 1)
    memoized(CACHE_SIZE_CHECK_THRESHOLD + 2)
    expect(consoleSpy).toHaveBeenCalledTimes(3)
  })

  test('never runs when set to never', () => {
    setGlobalDevModeChecks({ cacheSizeCheck: 'never' })
    const memoized = weakMapMemoize((id: number) => id * 2)

    fillPastThreshold(memoized)

    expect(consoleSpy).not.toHaveBeenCalled()
  })

  test('fires for a parametric createSelector called with many distinct ids', () => {
    const selector = createSelector(
      [
        (state: { ids: number[] }) => state.ids,
        (state: unknown, id: number) => id
      ],
      (ids, id) => ids.includes(id)
    )
    const state = { ids: [1, 2, 3] }

    for (let i = 0; i <= CACHE_SIZE_CHECK_THRESHOLD; i++) {
      selector(state, i)
    }

    // Both the argsMemoize tree and the memoize tree pass the threshold,
    // and each memoized function warns independently.
    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })

  test('an anonymous function still produces a useful warning', () => {
    const memoized = weakMapMemoize((id: number) => id * 2)

    fillPastThreshold(memoized)

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('weakMapMemoize'),
      { stack: expect.any(String) }
    )
  })
})
