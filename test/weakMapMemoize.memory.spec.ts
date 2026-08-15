import { setGlobalDevModeChecks, weakMapMemoize } from 'reselect'

/**
 * Characterization tests for https://github.com/reduxjs/reselect/issues/635
 *
 * `weakMapMemoize` stores primitive arguments in strong `Map`s that live inside
 * the cache tree. When the *first* argument is a long-lived object (e.g. the
 * Redux state, or a stable derived value) but later primitive arguments keep
 * changing, every result that was ever computed is retained for as long as that
 * first object stays reachable, and nothing is evicted.
 *
 * These tests document that behavior — they describe what the implementation
 * does today, not what it should ideally do. If a future change bounds the
 * cache, the retention tests here are expected to fail and should be updated.
 *
 * The GC-dependent tests require `node --expose-gc` (already used by the
 * `test` script) and skip themselves when it is missing.
 */

const gcAvailable = typeof globalThis.gc === 'function'

// These tests deliberately overfill caches with distinct primitives, which is
// exactly what the cache size check warns about.
beforeAll(() => {
  setGlobalDevModeChecks({ cacheSizeCheck: 'never' })
})

afterAll(() => {
  setGlobalDevModeChecks({ cacheSizeCheck: 'once' })
})

const makeSliceSelector = () =>
  weakMapMemoize((array: number[], from: number, to: number) =>
    array.slice(from, to)
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

  test.skipIf(!gcAvailable)(
    'old results are not garbage collected while the object argument is alive',
    async () => {
      const selector = makeSliceSelector()
      const state = Array.from({ length: 10_000 }, (_, i) => i)

      const initialResult = new WeakRef(selector(state, 2000, 2500))

      for (let i = 0; i < 10_000; i++) {
        selector(state, i, i + 100)
      }

      // Because the cache holds a strong reference to every computed slice,
      // the initial result cannot be collected even though nothing else
      // references it. Both `state` (the WeakMap key) and `selector` (which
      // owns the cache tree) must stay reachable, otherwise the whole cache —
      // and thus the result — would be collected for unrelated reasons.
      await expect(initialResult).not.toBeGarbageCollected()
      expect(state.length).toBe(10_000)
      expect(selector(state, 2000, 2500)).toBe(initialResult.deref())
    }
  )
})

describe('weakMapMemoize treats object and primitive arguments differently', () => {
  test.skipIf(!gcAvailable)(
    'results keyed by an object are collected once that object is dropped',
    async () => {
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
    }
  )

  test.skipIf(!gcAvailable)(
    'results keyed by a primitive stay reachable until the cache is cleared',
    async () => {
      const memoized = weakMapMemoize((id: string) => ({ id }))

      const firstResult = new WeakRef(memoized('item-0'))

      for (let i = 1; i < 1_000; i++) {
        memoized(`item-${i}`)
      }

      // The caller kept no reference to either the key or the result, but the
      // key is a string held by a strong `Map`, so there is nothing for the
      // garbage collector to observe becoming unreachable. The entry lives as
      // long as the memoized function does.
      await expect(firstResult).not.toBeGarbageCollected()

      // Clearing the cache is what releases the entry.
      memoized.clearCache()

      await expect(firstResult).toBeGarbageCollected()
    }
  )
})
