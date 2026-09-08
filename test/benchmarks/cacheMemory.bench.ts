import { createSelector, lruMemoize, weakMapMemoize } from 'reselect'
import type { Options } from 'tinybench'
import { bench } from 'vitest'
import type { RootState } from '../testUtils'
import { setupStore } from '../testUtils'

// `weakMapMemoize` has an effectively infinite cache size, which the other
// benchmark files do not cover since they report time rather than size. These
// benchmarks report how much memory a filled cache holds on to, and which
// parts of it the garbage collector is able to reclaim.
//
// The numbers below are logged rather than timed - the `hz`/`mean` columns
// reported by vitest are not meaningful here.
//
// Requires `--expose-gc`, which the `pnpm bench` script passes.

const store = setupStore()
const state = store.getState()

const CACHED_ENTRIES = 10_000

// Measuring a single fill, with no warmup, so that the reported heap delta
// belongs to exactly one cache.
const commonOptions: Options = {
  warmupIterations: 0,
  warmupTime: 0,
  iterations: 1,
  time: 0
}

// Anything a measurement needs to outlive its own bench is parked here, so
// that the heap delta reflects a cache that is still reachable.
const keepAlive: unknown[] = []

let hasWarnedAboutGarbageCollection = false

const collectGarbage = () => {
  if (typeof global.gc !== 'function') {
    if (!hasWarnedAboutGarbageCollection) {
      hasWarnedAboutGarbageCollection = true
      console.warn(
        'Run these benchmarks with `--expose-gc`, otherwise the reported memory numbers include uncollected garbage.'
      )
    }
    return
  }
  global.gc()
  global.gc()
}

const getHeapUsed = () => {
  collectGarbage()
  return process.memoryUsage().heapUsed
}

const formatBytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`

// tinybench calls the benchmark function an extra time to detect whether it
// returns a promise, so every measurement would otherwise be logged twice.
const loggedLabels = new Set<string>()

const logRetained = (label: string, retained: number, entries?: number) => {
  if (loggedLabels.has(label)) return
  loggedLabels.add(label)
  const perEntry =
    entries === undefined
      ? ''
      : ` (${Math.round(retained / entries).toLocaleString(
          'en-US'
        )} bytes per entry)`
  console.log(
    `\x1B[32m\x1B[1m${label}\x1B[0m retains \x1B[33m${formatBytes(
      retained
    )}\x1B[0m${perEntry}`
  )
}

describe(`Retained memory of a cache holding ${CACHED_ENTRIES.toLocaleString(
  'en-US'
)} entries`, () => {
  const measureFill = (
    label: string,
    createSelectorInstance: () => (state: RootState, id: number) => number
  ) => {
    const heapBefore = getHeapUsed()
    const selector = createSelectorInstance()
    for (let i = 0; i < CACHED_ENTRIES; i++) {
      selector(state, i)
    }
    keepAlive.push(selector)
    logRetained(label, getHeapUsed() - heapBefore, CACHED_ENTRIES)
  }

  bench(
    'weakMapMemoize (the default)',
    () => {
      measureFill('weakMapMemoize', () =>
        createSelector(
          [
            (state: RootState) => state.todos,
            (state: RootState, id: number) => id
          ],
          (todos, id) => todos.length + id
        )
      )
    },
    { ...commonOptions }
  )

  bench(
    'lruMemoize (default maxSize of 1)',
    () => {
      measureFill('lruMemoize maxSize: 1', () =>
        createSelector(
          [
            (state: RootState) => state.todos,
            (state: RootState, id: number) => id
          ],
          (todos, id) => todos.length + id,
          { memoize: lruMemoize, argsMemoize: lruMemoize }
        )
      )
    },
    { ...commonOptions }
  )

  bench(
    `lruMemoize (maxSize: ${CACHED_ENTRIES.toLocaleString('en-US')})`,
    () => {
      measureFill(
        `lruMemoize maxSize: ${CACHED_ENTRIES.toLocaleString('en-US')}`,
        () =>
          createSelector(
            [
              (state: RootState) => state.todos,
              (state: RootState, id: number) => id
            ],
            (todos, id) => todos.length + id,
            {
              memoize: lruMemoize,
              argsMemoize: lruMemoize,
              memoizeOptions: { maxSize: CACHED_ENTRIES },
              argsMemoizeOptions: { maxSize: CACHED_ENTRIES }
            }
          )
      )
    },
    { ...commonOptions }
  )
})

describe('What the garbage collector can and cannot reclaim', () => {
  const DISTINCT_ARGUMENTS = 100_000

  bench(
    'object arguments, references dropped',
    () => {
      const selector = createSelector(
        [(state: RootState) => state.todos],
        todos => todos.length
      )
      const heapBefore = getHeapUsed()
      for (let i = 0; i < DISTINCT_ARGUMENTS; i++) {
        // A new state object per "dispatch", which nothing holds on to
        // afterwards, so its `WeakMap` branch becomes collectable.
        selector({ ...state })
      }
      keepAlive.push(selector)
      logRetained(
        'weakMapMemoize, object arguments dropped',
        getHeapUsed() - heapBefore
      )
    },
    { ...commonOptions }
  )

  bench(
    'object arguments, references kept',
    () => {
      const selector = createSelector(
        [(state: RootState) => state.todos],
        todos => todos.length
      )
      const states: RootState[] = []
      const heapBefore = getHeapUsed()
      for (let i = 0; i < DISTINCT_ARGUMENTS; i++) {
        const nextState = { ...state }
        states.push(nextState)
        selector(nextState)
      }
      keepAlive.push(selector, states)
      logRetained(
        'weakMapMemoize, object arguments kept',
        getHeapUsed() - heapBefore
      )
    },
    { ...commonOptions }
  )

  bench(
    'primitive arguments',
    () => {
      // Primitives are stored in a strong `Map`, so entries stay reachable
      // while the memoized function itself is alive, even though the caller
      // kept no references to the keys.
      const memoized = weakMapMemoize((id: string) => ({ id }))
      const heapBefore = getHeapUsed()
      for (let i = 0; i < DISTINCT_ARGUMENTS; i++) {
        memoized(`item-${i}`)
      }
      const retainedWhileCached = getHeapUsed() - heapBefore
      memoized.clearCache()
      const retainedAfterClearCache = getHeapUsed() - heapBefore
      keepAlive.push(memoized)
      logRetained(
        'weakMapMemoize, primitive arguments',
        retainedWhileCached,
        DISTINCT_ARGUMENTS
      )
      logRetained(
        'weakMapMemoize, primitive arguments after clearCache()',
        retainedAfterClearCache
      )
    },
    { ...commonOptions }
  )
})
