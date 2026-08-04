import { shallowEqual } from 'react-redux'
import { createSelector, weakMapMemoize } from 'reselect'

/**
 * Characterization tests for https://github.com/reduxjs/reselect/issues/635
 *
 * `weakMapMemoize` stores primitive arguments in strong `Map`s that live inside
 * the cache tree. When the *first* argument is a long-lived object (e.g. the
 * Redux state, or a stable derived value) but later primitive arguments keep
 * changing, every result that was ever computed is retained for as long as that
 * first object stays reachable, and nothing is evicted.
 *
 * These tests require `node --expose-gc` (already used by the `test` script).
 */

const makeSliceSelector = (options?: Parameters<typeof weakMapMemoize>[1]) =>
  weakMapMemoize(
    (array: number[], from: number, to: number) => array.slice(from, to),
    options
  )

describe('weakMapMemoize unbounded cache (issue #635)', () => {
  test('retains every result while the object argument stays alive', () => {
    const selector = makeSliceSelector()

    // Long-lived object argument (imagine this is the Redux state).
    const state = Array.from({ length: 10_000 }, (_, i) => i)

    const initialResult = selector(state, 2000, 2500)

    // Simulate an endlessly scrolling list: the primitive args keep changing.
    for (let i = 0; i < 10_000; i++) {
      selector(state, i, i + 100)
    }

    // The first result is still memoized after 10k different calls, because
    // nothing is evicted.
    expect(selector(state, 2000, 2500)).toBe(initialResult)
  })

  test('old results are not garbage collected while the object argument is alive', async () => {
    const selector = makeSliceSelector()
    const state = Array.from({ length: 10_000 }, (_, i) => i)

    const initialResult = new WeakRef(selector(state, 2000, 2500))

    for (let i = 0; i < 10_000; i++) {
      selector(state, i, i + 100)
    }

    // Because the cache holds a strong reference to every computed slice,
    // the initial result cannot be collected even though nothing else
    // references it. Both `state` (the WeakMap key) and `selector` (which owns
    // the cache tree) must stay reachable, otherwise the whole cache — and thus
    // the result — would be collected for unrelated reasons.
    await expect(initialResult).not.toBeGarbageCollected()
    expect(state.length).toBe(10_000)
    expect(selector(state, 2000, 2500)).toBe(initialResult.deref())
  })
})

describe('weakMapMemoize maxSize (fix for issue #635)', () => {
  test('rejects a non-positive-integer maxSize', () => {
    expect(() => makeSliceSelector({ maxSize: 0 })).toThrow(/positive integer/)
    expect(() => makeSliceSelector({ maxSize: -1 })).toThrow(/positive integer/)
    expect(() => makeSliceSelector({ maxSize: 1.5 })).toThrow(
      /positive integer/
    )
  })

  test('still caches within the configured size', () => {
    const selector = weakMapMemoize(
      (array: number[], from: number, to: number) => array.slice(from, to),
      { maxSize: 3 }
    )
    const state = [1, 2, 3, 4, 5]

    const a = selector(state, 0, 2)
    const b = selector(state, 1, 3)

    // Repeated calls within maxSize are still memoized.
    expect(selector(state, 0, 2)).toBe(a)
    expect(selector(state, 1, 3)).toBe(b)
  })

  test('evicts the least recently used result once maxSize is exceeded', () => {
    const selector = weakMapMemoize(
      (array: number[], from: number, to: number) => array.slice(from, to),
      { maxSize: 2 }
    )
    const state = [1, 2, 3, 4, 5]

    const first = selector(state, 0, 1) // cache: [first]
    selector(state, 1, 2) // cache: [first, second]
    selector(state, 2, 3) // exceeds maxSize -> evicts `first`

    // `first` was evicted, so it is recomputed as a fresh reference.
    expect(selector(state, 0, 1)).not.toBe(first)
    expect(selector(state, 0, 1)).toEqual([1])
  })

  test('a most-recently-used result is kept while a stale one is evicted', () => {
    const selector = weakMapMemoize(
      (array: number[], from: number, to: number) => array.slice(from, to),
      { maxSize: 2 }
    )
    const state = [1, 2, 3, 4, 5]

    const keep = selector(state, 0, 2)
    selector(state, 1, 3)
    // Touch `keep` so it becomes most-recently-used again.
    expect(selector(state, 0, 2)).toBe(keep)
    // Push a third distinct result: the LRU victim is (1,3), not `keep`.
    selector(state, 2, 4)

    expect(selector(state, 0, 2)).toBe(keep)
  })

  test('bounds the cache and lets old results be garbage collected', async () => {
    const selector = weakMapMemoize(
      (array: number[], from: number, to: number) => array.slice(from, to),
      { maxSize: 10 }
    )
    const state = Array.from({ length: 10_000 }, (_, i) => i)

    const evictedResult = new WeakRef(selector(state, 2000, 2500))

    // Far more distinct primitive combinations than maxSize.
    for (let i = 0; i < 10_000; i++) {
      selector(state, i, i + 100)
    }

    // The early result has been evicted and can now be reclaimed, even though
    // `state` (the WeakMap key) and `selector` (the cache owner) stay alive.
    await expect(evictedResult).toBeGarbageCollected()
    expect(state.length).toBe(10_000)
    expect(selector(state, 9999, 10_099)).toEqual(state.slice(9999, 10_099))
  })

  test('evicts object-keyed results as well (WeakMap branch)', () => {
    const selector = weakMapMemoize((a: object, b: object) => ({ a, b }), {
      maxSize: 1
    })
    const o1 = {}
    const o2 = {}
    const o3 = {}

    const first = selector(o1, o2)
    expect(selector(o1, o2)).toBe(first)

    // Distinct second object exceeds maxSize and evicts (o1, o2).
    selector(o1, o3)

    expect(selector(o1, o2)).not.toBe(first)
  })

  test('clearCache resets the bounded cache', () => {
    const selector = weakMapMemoize(
      (array: number[], from: number) => array.slice(from),
      { maxSize: 5 }
    )
    const state = [1, 2, 3]

    const first = selector(state, 0)
    expect(selector(state, 0)).toBe(first)

    selector.clearCache()

    expect(selector(state, 0)).not.toBe(first)
  })

  test('works together with resultEqualityCheck', () => {
    const selector = weakMapMemoize(
      (array: { id: number }[], from: number) =>
        array.slice(from).map(({ id }) => id),
      { maxSize: 5, resultEqualityCheck: shallowEqual }
    )

    const first = selector([{ id: 1 }, { id: 2 }], 0)
    // New array arg, but shallowly-equal output -> same reference returned.
    const second = selector([{ id: 1 }, { id: 2 }], 0)

    expect(second).toBe(first)
    expect(selector.resultsCount()).toBe(1)
  })
})

describe('weakMapMemoize treats object and primitive arguments differently', () => {
  test('results keyed by an object are collected once that object is dropped', async () => {
    const memoized = weakMapMemoize((source: { id: number }) => ({
      id: source.id
    }))

    let key: { id: number } | null = { id: 0 }
    const result = new WeakRef(memoized(key))

    // The only reference to the `WeakMap` key goes away.
    key = null

    for (let i = 1; i < 1_000; i++) {
      memoized({ id: i })
    }

    await expect(result).toBeGarbageCollected()
  })

  test('results keyed by a primitive stay reachable until the cache is cleared', async () => {
    const memoized = weakMapMemoize((id: string) => ({ id }))

    const firstResult = new WeakRef(memoized('item-0'))

    for (let i = 1; i < 1_000; i++) {
      memoized(`item-${i}`)
    }

    // The caller kept no reference to either the key or the result, but the
    // key is a string held by a strong `Map`, so there is nothing for the
    // garbage collector to observe becoming unreachable. Without a `maxSize`
    // the entry lives as long as the memoized function does.
    await expect(firstResult).not.toBeGarbageCollected()

    // Without a bounded cache, the entry is released by clearing the cache.
    memoized.clearCache()

    await expect(firstResult).toBeGarbageCollected()
  })
})

describe('weakMapMemoize maxSize integration with createSelector (issue #635)', () => {
  test('maxSize on both memoize and argsMemoize bounds the whole selector', () => {
    // `createSelector` caches twice: `argsMemoize` on the raw selector args and
    // `memoize` on the extracted input values. Both must be bounded, otherwise
    // `argsMemoize` short-circuits and keeps every result keyed by the
    // primitive args alive.
    const selectSlice = createSelector(
      [(array: number[]) => array, (_: number[], from: number) => from],
      (array, from) => array.slice(from),
      {
        memoize: weakMapMemoize,
        memoizeOptions: { maxSize: 2 },
        argsMemoize: weakMapMemoize,
        argsMemoizeOptions: { maxSize: 2 }
      }
    )
    const state = [1, 2, 3, 4, 5]

    const first = selectSlice(state, 0)
    selectSlice(state, 1)
    selectSlice(state, 2) // exceeds maxSize on both layers -> evicts (state, 0)

    expect(selectSlice(state, 0)).not.toBe(first)
    expect(selectSlice(state, 0)).toEqual(state.slice(0))
  })
})
