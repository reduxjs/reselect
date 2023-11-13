import type { Selector } from 'reselect'
import {
  createSelector,
  unstable_autotrackMemoize as autotrackMemoize,
  weakMapMemoize
} from 'reselect'
import { bench } from 'vitest'
import type { RootState } from '../testUtils'
import { setFunctionNames, setupStore } from '../testUtils'

import type { Options } from 'tinybench'

const store = setupStore()
const state = store.getState()
const arr = Array.from({ length: 30 }, (e, i) => i)

const commonOptions: Options = {
  iterations: 10,
  time: 0
}

describe('weakMapMemoize vs defaultMemoize', () => {
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
  const runSelector = (selector: Selector) => {
    arr.forEach((e, i) => {
      selector(state, e)
    })
    arr.forEach((e, i) => {
      selector(state, e)
    })
  }
  bench(
    selectorDefault,
    () => {
      runSelector(selectorDefault)
    },
    {
      ...commonOptions,
      setup: (task, mode) => {
        if (mode === 'warmup') return
        selectorDefault.clearCache()
        selectorDefault.resetRecomputations()
        selectorDefault.memoizedResultFunc.clearCache()
        task.opts = {
          afterAll: () => {
            console.log(
              `${selectorDefault.name} recomputations after:`,
              selectorDefault.recomputations() - 1
            )
          }
        }
      }
    }
  )
  bench(
    selectorDefaultWithCacheSize,
    () => {
      runSelector(selectorDefaultWithCacheSize)
    },
    {
      ...commonOptions,
      setup: (task, mode) => {
        if (mode === 'warmup') return
        selectorDefaultWithCacheSize.clearCache()
        selectorDefaultWithCacheSize.resetRecomputations()
        selectorDefaultWithCacheSize.memoizedResultFunc.clearCache()
        task.opts = {
          afterAll: () => {
            console.log(
              `${selectorDefaultWithCacheSize.name} recomputations after:`,
              selectorDefaultWithCacheSize.recomputations() - 1
            )
          }
        }
      }
    }
  )
  bench(
    selectorDefaultWithArgsCacheSize,
    () => {
      runSelector(selectorDefaultWithArgsCacheSize)
    },
    {
      ...commonOptions,
      setup: (task, mode) => {
        if (mode === 'warmup') return
        selectorDefaultWithArgsCacheSize.clearCache()
        selectorDefaultWithArgsCacheSize.resetRecomputations()
        selectorDefaultWithArgsCacheSize.memoizedResultFunc.clearCache()
        task.opts = {
          afterAll: () => {
            console.log(
              `${selectorDefaultWithArgsCacheSize.name} recomputations after:`,
              selectorDefaultWithArgsCacheSize.recomputations() - 1
            )
          }
        }
      }
    }
  )
  bench(
    selectorDefaultWithBothCacheSize,
    () => {
      runSelector(selectorDefaultWithBothCacheSize)
    },
    {
      ...commonOptions,
      setup: (task, mode) => {
        if (mode === 'warmup') return
        selectorDefaultWithBothCacheSize.clearCache()
        selectorDefaultWithBothCacheSize.resetRecomputations()
        selectorDefaultWithBothCacheSize.memoizedResultFunc.clearCache()
        task.opts = {
          afterAll: () => {
            console.log(
              `${selectorDefaultWithBothCacheSize.name} recomputations after:`,
              selectorDefaultWithBothCacheSize.recomputations() - 1
            )
          }
        }
      }
    }
  )
  bench(
    selectorWeakMap,
    () => {
      runSelector(selectorWeakMap)
    },
    {
      ...commonOptions,
      setup: (task, mode) => {
        if (mode === 'warmup') return
        selectorWeakMap.clearCache()
        selectorWeakMap.resetRecomputations()
        selectorWeakMap.memoizedResultFunc.clearCache()
        task.opts = {
          afterAll: () => {
            console.log(
              `${selectorWeakMap.name} recomputations after:`,
              selectorWeakMap.recomputations() - 1,
              selectorWeakMap.dependencyRecomputations()
            )
          }
        }
      }
    }
  )
  bench(
    selectorArgsWeakMap,
    () => {
      runSelector(selectorArgsWeakMap)
    },
    {
      ...commonOptions,
      setup: (task, mode) => {
        if (mode === 'warmup') return
        selectorArgsWeakMap.clearCache()
        selectorArgsWeakMap.resetRecomputations()
        selectorArgsWeakMap.memoizedResultFunc.clearCache()
        task.opts = {
          afterAll: () => {
            console.log(
              `${selectorArgsWeakMap.name} recomputations after:`,
              selectorArgsWeakMap.recomputations() - 1,
              selectorArgsWeakMap.dependencyRecomputations()
            )
          }
        }
      }
    }
  )
  bench(
    selectorBothWeakMap,
    () => {
      runSelector(selectorBothWeakMap)
    },
    {
      ...commonOptions,
      setup: (task, mode) => {
        if (mode === 'warmup') return
        selectorBothWeakMap.clearCache()
        selectorBothWeakMap.resetRecomputations()
        selectorBothWeakMap.memoizedResultFunc.clearCache()
        task.opts = {
          afterAll: () => {
            console.log(
              `${selectorBothWeakMap.name} recomputations after:`,
              selectorBothWeakMap.recomputations() - 1
            )
          }
        }
      }
    }
  )
  bench(
    selectorAutotrack,
    () => {
      runSelector(selectorAutotrack)
    },
    {
      ...commonOptions,
      setup: (task, mode) => {
        if (mode === 'warmup') return
        selectorAutotrack.clearCache()
        selectorAutotrack.resetRecomputations()
        selectorAutotrack.memoizedResultFunc.clearCache()
        task.opts = {
          afterAll: () => {
            console.log(
              `${selectorAutotrack.name} recomputations after:`,
              selectorAutotrack.recomputations() - 1
            )
          }
        }
      }
    }
  )
  bench(
    selectorArgsAutotrack,
    () => {
      runSelector(selectorArgsAutotrack)
    },
    {
      ...commonOptions,
      setup: (task, mode) => {
        if (mode === 'warmup') return
        selectorArgsAutotrack.clearCache()
        selectorArgsAutotrack.resetRecomputations()
        selectorArgsAutotrack.memoizedResultFunc.clearCache()
        task.opts = {
          afterAll: () => {
            console.log(
              `${selectorArgsAutotrack.name} recomputations after:`,
              selectorArgsAutotrack.recomputations() - 1
            )
          }
        }
      }
    }
  )
  bench(
    selectorBothAutotrack,
    () => {
      runSelector(selectorBothAutotrack)
    },
    {
      ...commonOptions,
      setup: (task, mode) => {
        if (mode === 'warmup') return
        selectorBothAutotrack.clearCache()
        selectorBothAutotrack.resetRecomputations()
        selectorBothAutotrack.memoizedResultFunc.clearCache()
        task.opts = {
          afterAll: () => {
            console.log(
              `${selectorBothAutotrack.name} recomputations after:`,
              selectorBothAutotrack.recomputations() - 1
            )
          }
        }
      }
    }
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

  bench(
    selectorDefault,
    () => {
      selectorDefault(store.getState())
    },
    {
      ...commonOptions,
      setup: (task, mode) => {
        if (mode === 'warmup') return
        selectorDefault.clearCache()
        selectorDefault.resetRecomputations()
        selectorDefault.memoizedResultFunc.clearCache()
        task.opts = {
          afterAll: () => {
            console.log(
              `${selectorDefault.name} recomputations after:`,
              selectorDefault.recomputations() - 1
            )
          }
        }
      }
    }
  )
  bench(
    selectorWeakMap,
    () => {
      selectorWeakMap(store.getState())
    },
    {
      ...commonOptions,
      setup: (task, mode) => {
        if (mode === 'warmup') return
        selectorWeakMap.clearCache()
        selectorWeakMap.resetRecomputations()
        selectorWeakMap.memoizedResultFunc.clearCache()
        task.opts = {
          afterAll: () => {
            console.log(
              `${selectorWeakMap.name} recomputations after:`,
              selectorWeakMap.recomputations() - 1
            )
          }
        }
      }
    }
  )
  bench(
    selectorAutotrack,
    () => {
      selectorAutotrack(store.getState())
    },
    {
      ...commonOptions,
      setup: (task, mode) => {
        if (mode === 'warmup') return
        selectorAutotrack.clearCache()
        selectorAutotrack.resetRecomputations()
        selectorAutotrack.memoizedResultFunc.clearCache()
        task.opts = {
          afterAll: () => {
            console.log(
              `${selectorAutotrack.name} recomputations after:`,
              selectorAutotrack.recomputations() - 1
            )
          }
        }
      }
    }
  )
})
