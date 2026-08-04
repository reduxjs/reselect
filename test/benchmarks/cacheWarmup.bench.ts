import type { OutputSelector, Selector } from 'reselect'
import {
  createSelector,
  lruMemoize,
  unstable_autotrackMemoize as autotrackMemoize,
  weakMapMemoize
} from 'reselect'
import type { Options } from 'tinybench'
import { bench } from 'vitest'
import type { RootState } from '../testUtils'
import {
  logSelectorRecomputations,
  resetSelector,
  setFunctionNames,
  setupStore
} from '../testUtils'

// The other benchmark files call each selector with a handful of arguments and
// report filling the cache and reading from it as a single number. These
// benchmarks report the two separately: `weakMapMemoize` allocates a cache node
// (and, on the first call, a `Map`/`WeakMap` per argument) on a miss but not on
// a hit, so the two paths are measured on their own.
//
// The result functions here are deliberately cheap, so that what is being
// measured is the memoization bookkeeping rather than the payload. A selector
// whose result function does real work will look different.

const store = setupStore()
const state = store.getState()

// Filling a cache allocates, so individual iterations get hit by garbage
// collection at random. More samples than the other benchmark files use, to
// keep the reported error margins down.
const commonOptions: Options = {
  iterations: 30,
  time: 0
}

const UNIQUE_ARGUMENTS = 2_000

const arrayOfNumbers = Array.from(
  { length: UNIQUE_ARGUMENTS },
  (num, index) => index
)

const runSelector = <S extends Selector>(selector: S) => {
  arrayOfNumbers.forEach(num => {
    selector(state, num)
  })
}

describe(`Cold cache: filling a cache with ${UNIQUE_ARGUMENTS.toLocaleString(
  'en-US'
)} unique arguments`, () => {
  const selectorWeakMap = createSelector(
    [(state: RootState) => state.todos, (state: RootState, id: number) => id],
    (todos, id) => todos.length + id
  )
  const selectorLru = createSelector(
    [(state: RootState) => state.todos, (state: RootState, id: number) => id],
    (todos, id) => todos.length + id,
    { memoize: lruMemoize, argsMemoize: lruMemoize }
  )
  const selectorLruWithCacheSize = createSelector(
    [(state: RootState) => state.todos, (state: RootState, id: number) => id],
    (todos, id) => todos.length + id,
    {
      memoize: lruMemoize,
      argsMemoize: lruMemoize,
      memoizeOptions: { maxSize: UNIQUE_ARGUMENTS },
      argsMemoizeOptions: { maxSize: UNIQUE_ARGUMENTS }
    }
  )
  const selectorAutotrack = createSelector(
    [(state: RootState) => state.todos, (state: RootState, id: number) => id],
    (todos, id) => todos.length + id,
    { memoize: autotrackMemoize }
  )

  const selectors = {
    selectorWeakMap,
    selectorLru,
    selectorLruWithCacheSize,
    selectorAutotrack
  }

  setFunctionNames(selectors)

  // `beforeEach` runs outside the region tinybench times, so clearing the
  // cache before every iteration keeps the measurement to the fill itself.
  const createOptions = <S extends OutputSelector>(selector: S) => {
    const options: Options = {
      setup: (task, mode) => {
        task.opts = {
          beforeEach: () => {
            resetSelector(selector)
          },
          afterAll:
            mode === 'warmup'
              ? undefined
              : () => {
                  logSelectorRecomputations(selector)
                }
        }
      }
    }
    return { ...commonOptions, ...options }
  }

  Object.values(selectors).forEach(selector => {
    bench(
      selector,
      () => {
        runSelector(selector)
      },
      createOptions(selector)
    )
  })
})

describe(`Warm cache: re-reading ${UNIQUE_ARGUMENTS.toLocaleString(
  'en-US'
)} arguments that are already cached`, () => {
  const selectorWeakMap = createSelector(
    [(state: RootState) => state.todos, (state: RootState, id: number) => id],
    (todos, id) => todos.length + id
  )
  const selectorLru = createSelector(
    [(state: RootState) => state.todos, (state: RootState, id: number) => id],
    (todos, id) => todos.length + id,
    { memoize: lruMemoize, argsMemoize: lruMemoize }
  )
  const selectorLruWithCacheSize = createSelector(
    [(state: RootState) => state.todos, (state: RootState, id: number) => id],
    (todos, id) => todos.length + id,
    {
      memoize: lruMemoize,
      argsMemoize: lruMemoize,
      memoizeOptions: { maxSize: UNIQUE_ARGUMENTS },
      argsMemoizeOptions: { maxSize: UNIQUE_ARGUMENTS }
    }
  )
  const selectorAutotrack = createSelector(
    [(state: RootState) => state.todos, (state: RootState, id: number) => id],
    (todos, id) => todos.length + id,
    { memoize: autotrackMemoize }
  )

  const selectors = {
    selectorWeakMap,
    selectorLru,
    selectorLruWithCacheSize,
    selectorAutotrack
  }

  setFunctionNames(selectors)

  // The cache is filled once up front and never cleared, so every measured
  // call is a cache hit. `lruMemoize` with the default `maxSize` of 1
  // recomputes instead, which the logged recomputation counts show.
  const createOptions = <S extends OutputSelector>(selector: S) => {
    const options: Options = {
      setup: (task, mode) => {
        runSelector(selector)
        if (mode === 'warmup') return
        selector.resetRecomputations()
        selector.resetDependencyRecomputations()
        task.opts = {
          afterAll: () => {
            logSelectorRecomputations(selector)
          }
        }
      }
    }
    return { ...commonOptions, ...options }
  }

  Object.values(selectors).forEach(selector => {
    bench(
      selector,
      () => {
        runSelector(selector)
      },
      createOptions(selector)
    )
  })
})

describe('Cold cache: fill cost as the number of unique arguments grows', () => {
  // `weakMapMemoize` keeps every cache node alive for as long as its arguments
  // are reachable, so this reports how the cost of a miss changes as the
  // number of keys already in the cache grows.
  const cacheSizes = [1_000, 10_000, 100_000]

  cacheSizes.forEach(cacheSize => {
    const argumentsForSize = Array.from(
      { length: cacheSize },
      (num, index) => index
    )

    const selectorWeakMap = createSelector(
      [(state: RootState) => state.todos, (state: RootState, id: number) => id],
      (todos, id) => todos.length + id
    )
    const selectorLru = createSelector(
      [(state: RootState) => state.todos, (state: RootState, id: number) => id],
      (todos, id) => todos.length + id,
      { memoize: lruMemoize, argsMemoize: lruMemoize }
    )

    const createOptions = <S extends OutputSelector>(selector: S) => {
      const options: Options = {
        setup: (task, mode) => {
          task.opts = {
            beforeEach: () => {
              resetSelector(selector)
            }
          }
        }
      }
      return { ...commonOptions, ...options }
    }

    bench(
      `weakMapMemoize (${cacheSize.toLocaleString('en-US')} unique arguments)`,
      () => {
        argumentsForSize.forEach(num => {
          selectorWeakMap(state, num)
        })
      },
      createOptions(selectorWeakMap)
    )
    bench(
      `lruMemoize (${cacheSize.toLocaleString('en-US')} unique arguments)`,
      () => {
        argumentsForSize.forEach(num => {
          selectorLru(state, num)
        })
      },
      createOptions(selectorLru)
    )
  })
})

describe('Startup: creating selectors and calling them for the first time', () => {
  const SELECTOR_COUNT = 1_000

  const createSelectorInstance = () =>
    createSelector([(state: RootState) => state.todos], todos => todos.length)

  let selectorInstances = Array.from({ length: SELECTOR_COUNT }, () =>
    createSelectorInstance()
  )

  const callAll = () => {
    for (let i = 0; i < SELECTOR_COUNT; i++) {
      selectorInstances[i](state)
    }
  }

  bench(
    `createSelector (${SELECTOR_COUNT.toLocaleString(
      'en-US'
    )} instances, not called)`,
    () => {
      selectorInstances = Array.from({ length: SELECTOR_COUNT }, () =>
        createSelectorInstance()
      )
    },
    { ...commonOptions }
  )

  bench(
    `first call (${SELECTOR_COUNT.toLocaleString('en-US')} fresh instances)`,
    () => {
      callAll()
    },
    {
      ...commonOptions,
      setup: task => {
        task.opts = {
          beforeEach: () => {
            selectorInstances = Array.from({ length: SELECTOR_COUNT }, () =>
              createSelectorInstance()
            )
          }
        }
      }
    }
  )

  bench(
    `steady state call (${SELECTOR_COUNT.toLocaleString(
      'en-US'
    )} warm instances)`,
    () => {
      callAll()
    },
    {
      ...commonOptions,
      setup: () => {
        selectorInstances = Array.from({ length: SELECTOR_COUNT }, () =>
          createSelectorInstance()
        )
        callAll()
      }
    }
  )
})
