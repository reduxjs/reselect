import type { OutputSelector, Selector } from 'reselect'
import {
  createSelector,
  unstable_autotrackMemoize as autotrackMemoize,
  weakMapMemoize
} from 'reselect'
import { bench } from 'vitest'
import type { RootState } from '../testUtils'
import {
  logRecomputations,
  resetSelector,
  setFunctionNames,
  setupStore
} from '../testUtils'

import type { Options } from 'tinybench'

describe('weakMapMemoize vs others', () => {
  const store = setupStore()
  const state = store.getState()
  const arr = Array.from({ length: 30 }, (e, i) => i)
  const commonOptions: Options = {
    iterations: 10,
    time: 0
  }
  const selectorDefault = createSelector(
    [(state: RootState) => state.todos, (state: RootState, id: number) => id],
    (todos, id) => todos.map(todo => todo.id === id)
  )
  const selectorDefaultWithCacheSize = createSelector(
    [(state: RootState) => state.todos, (state: RootState, id: number) => id],
    (todos, id) => todos.map(todo => todo.id === id),
    { memoizeOptions: { maxSize: 30 } }
  )
  const selectorDefaultWithArgsCacheSize = createSelector(
    [(state: RootState) => state.todos, (state: RootState, id: number) => id],
    (todos, id) => todos.map(todo => todo.id === id),
    { argsMemoizeOptions: { maxSize: 30 } }
  )
  const selectorDefaultWithBothCacheSize = createSelector(
    [(state: RootState) => state.todos, (state: RootState, id: number) => id],
    (todos, id) => todos.map(todo => todo.id === id),
    { memoizeOptions: { maxSize: 30 }, argsMemoizeOptions: { maxSize: 30 } }
  )
  const selectorWeakMap = createSelector(
    [(state: RootState) => state.todos, (state: RootState, id: number) => id],
    (todos, id) => todos.map(todo => todo.id === id),
    { memoize: weakMapMemoize }
  )
  const selectorAutotrack = createSelector(
    (state: RootState) => state.todos,
    (state: RootState, id: number) => id,
    (todos, id) => todos.map(todo => todo.id === id),
    { memoize: autotrackMemoize }
  )
  const selectorArgsAutotrack = createSelector(
    (state: RootState) => state.todos,
    (state: RootState, id: number) => id,
    (todos, id) => todos.map(todo => todo.id === id),
    { argsMemoize: autotrackMemoize }
  )
  const selectorBothAutotrack = createSelector(
    (state: RootState) => state.todos,
    (state: RootState, id: number) => id,
    (todos, id) => todos.map(todo => todo.id === id),
    { argsMemoize: autotrackMemoize, memoize: autotrackMemoize }
  )
  const selectorArgsWeakMap = createSelector(
    (state: RootState) => state.todos,
    (state: RootState, id: number) => id,
    (todos, id) => todos.map(todo => todo.id === id),
    { argsMemoize: weakMapMemoize }
  )
  const selectorBothWeakMap = createSelector(
    (state: RootState) => state.todos,
    (state: RootState, id: number) => id,
    (todos, id) => todos.map(todo => todo.id === id),
    { argsMemoize: weakMapMemoize, memoize: weakMapMemoize }
  )
  const nonMemoizedSelector = (state: RootState, id: number) => {
    return state.todos.map(todo => todo.id === id)
  }
  setFunctionNames({
    selectorDefault,
    selectorDefaultWithCacheSize,
    selectorDefaultWithArgsCacheSize,
    selectorDefaultWithBothCacheSize,
    selectorWeakMap,
    selectorArgsWeakMap,
    selectorBothWeakMap,
    selectorAutotrack,
    selectorArgsAutotrack,
    selectorBothAutotrack,
    nonMemoizedSelector
  })
  const runSelector = <S extends Selector>(selector: S) => {
    arr.forEach((e, i) => {
      selector(state, e)
    })
    arr.forEach((e, i) => {
      selector(state, e)
    })
  }

  const createOptions = <S extends OutputSelector>(
    selector: S,
    commonOptions: Options = {}
  ) => {
    const options: Options = {
      setup: (task, mode) => {
        if (mode === 'warmup') return
        resetSelector(selector)
        task.opts = {
          afterAll: () => {
            logRecomputations(selector)
          }
        }
      }
    }
    return { ...commonOptions, ...options }
  }
  bench(
    selectorDefault,
    () => {
      runSelector(selectorDefault)
    },
    createOptions(selectorDefault, commonOptions)
  )
  bench(
    selectorDefaultWithCacheSize,
    () => {
      runSelector(selectorDefaultWithCacheSize)
    },
    createOptions(selectorDefaultWithCacheSize, commonOptions)

  )
  bench(
    selectorDefaultWithArgsCacheSize,
    () => {
      runSelector(selectorDefaultWithArgsCacheSize)
    },
    createOptions(selectorDefaultWithArgsCacheSize, commonOptions)

  )
  bench(
    selectorDefaultWithBothCacheSize,
    () => {
      runSelector(selectorDefaultWithBothCacheSize)
    },
    createOptions(selectorDefaultWithBothCacheSize, commonOptions)

  )
  bench(
    selectorWeakMap,
    () => {
      runSelector(selectorWeakMap)
    },
    createOptions(selectorWeakMap, commonOptions)

  )
  bench(
    selectorArgsWeakMap,
    () => {
      runSelector(selectorArgsWeakMap)
    },
    createOptions(selectorArgsWeakMap, commonOptions)

  )
  bench(
    selectorBothWeakMap,
    () => {
      runSelector(selectorBothWeakMap)
    },
    createOptions(selectorBothWeakMap, commonOptions)

  )
  bench(
    selectorAutotrack,
    () => {
      runSelector(selectorAutotrack)
    },
    createOptions(selectorAutotrack, commonOptions)

  )
  bench(
    selectorArgsAutotrack,
    () => {
      runSelector(selectorArgsAutotrack)
    },
    createOptions(selectorArgsAutotrack, commonOptions)

  )
  bench(
    selectorBothAutotrack,
    () => {
      runSelector(selectorBothAutotrack)
    },
    createOptions(selectorBothAutotrack, commonOptions)

  )
  bench(
    nonMemoizedSelector,
    () => {
      runSelector(nonMemoizedSelector)
    },
    { ...commonOptions }
  )
})

describe('weakMapMemoize simple examples', () => {
  const store = setupStore()
  const state = store.getState()
  const arr = Array.from({ length: 30 }, (e, i) => i)
  const commonOptions: Options = {
    warmupIterations: 0,
    warmupTime: 0,
    iterations: 1,
    time: 0
  }
  const selectorDefault = createSelector(
    [(state: RootState) => state.todos],
    todos => todos.map(({ id }) => id)
  )
  const selectorWeakMap = createSelector(
    [(state: RootState) => state.todos],
    todos => todos.map(({ id }) => id),
    { argsMemoize: weakMapMemoize }
  )
  const selectorAutotrack = createSelector(
    [(state: RootState) => state.todos],
    todos => todos.map(({ id }) => id),
    { memoize: autotrackMemoize }
  )

  setFunctionNames({
    selectorDefault,
    selectorWeakMap,
    selectorAutotrack
  })

  const createOptions = <S extends OutputSelector>(selector: S) => {
    const options: Options = {
      setup: (task, mode) => {
        if (mode === 'warmup') return
        resetSelector(selector)
        task.opts = {
          afterAll: () => {
            logRecomputations(selector)
          }
        }
      }
    }
    return { ...commonOptions, ...options }
  }

  bench(
    selectorDefault,
    () => {
      selectorDefault(store.getState())
    },
    createOptions(selectorDefault)
  )
  bench(
    selectorWeakMap,
    () => {
      selectorWeakMap(store.getState())
    },
    createOptions(selectorWeakMap)
  )
  bench(
    selectorAutotrack,
    () => {
      selectorAutotrack(store.getState())
    },
    createOptions(selectorAutotrack)
  )
})

describe.skip('weakMapMemoize vs defaultMemoize memory leak', () => {
  const store = setupStore()
  const state = store.getState()
  const arr = Array.from({ length: 2_000_000 }, (e, i) => i)
  const commonOptions: Options = {
    warmupIterations: 0,
    warmupTime: 0,
    iterations: 1,
    time: 0
  }
  const selectorDefault = createSelector(
    [(state: RootState) => state.todos, (state: RootState, id: number) => id],
    todos => todos.map(({ id }) => id)
  )
  const selectorWeakMap = createSelector(
    [(state: RootState) => state.todos, (state: RootState, id: number) => id],
    todos => todos.map(({ id }) => id),
    { argsMemoize: weakMapMemoize, memoize: weakMapMemoize }
  )
  const runSelector = <S extends Selector>(selector: S) => {
    arr.forEach((e, i) => {
      selector(state, e)
    })
    arr.forEach((e, i) => {
      selector(state, e)
    })
  }
  setFunctionNames({ selectorDefault, selectorWeakMap })
  const createOptions = <S extends OutputSelector>(
    selector: S,
    commonOptions: Options = {}
  ) => {
    const options: Options = {
      setup: (task, mode) => {
        if (mode === 'warmup') return
        task.opts = {
          afterAll: () => {
            logRecomputations(selector)
          }
        }
      }
    }
    return { ...commonOptions, ...options }
  }
  bench(
    selectorDefault,
    () => {
      runSelector(selectorDefault)
    },
    createOptions(selectorDefault, commonOptions)
  )
  bench(
    selectorWeakMap,
    () => {
      runSelector(selectorWeakMap)
    },
    createOptions(selectorWeakMap, commonOptions)
  )
})
