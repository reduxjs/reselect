import type { OutputSelector, Selector } from 'reselect'
import { createSelector, defaultMemoize } from 'reselect'
import type { Options } from 'tinybench'
import { bench } from 'vitest'
import type { RootState } from '../testUtils'
import {
  logRecomputations,
  setFunctionNames,
  setupStore,
  toggleCompleted
} from '../testUtils'

describe('less in input selectors vs more in input selectors', () => {
  const store = setupStore()
  const arr = Array.from({ length: 1_000_000 }, (e, i) => i)
  const runSelector = (selector: Selector) => {
    arr.forEach((e, i) => {
      selector(store.getState(), 0)
    })
    arr.forEach((e, i) => {
      selector(store.getState(), 0)
    })
  }

  const selectorGood = createSelector(
    [(state: RootState) => state.todos, (state: RootState, id: number) => id],
    (todos, id) => todos.find(todo => todo.id === id)?.completed
  )
  const selectorBad = createSelector(
    [
      (state: RootState, id: number) => state.todos.find(todo => todo.id === id)
    ],
    todo => todo?.completed
  )

  let called = 0
  const nonMemoized = (state: RootState, id: number) => {
    called++
    return state.todos.find(todo => todo.id === id)?.completed
  }
  const commonOptions: Options = {
    iterations: 10,
    time: 0
  }
  setFunctionNames({ selectorGood, selectorBad, nonMemoized })
  const createOptions = <S extends OutputSelector>(
    selector: S,
    commonOptions: Options = {}
  ) => {
    const options: Options = {
      setup: (task, mode) => {
        if (mode === 'warmup') return
        task.opts = {
          beforeEach: () => {
            store.dispatch(toggleCompleted(1))
          },
          afterAll: () => {
            logRecomputations(selector)
          }
        }
      }
    }
    return { ...commonOptions, ...options }
  }
  bench(
    selectorGood,
    () => {
      selectorGood(store.getState(), 0)
    },
    createOptions(selectorGood, commonOptions)
  )
  bench(
    selectorBad,
    () => {
      selectorBad(store.getState(), 0)
    },
    createOptions(selectorBad, commonOptions)
  )
  bench(
    nonMemoized,
    () => {
      nonMemoized(store.getState(), 0)
    },
    {
      ...commonOptions,
      setup: (task, mode) => {
        if (mode === 'warmup') {
          called = 0
          return
        }
        task.opts = {
          beforeEach: () => {
            store.dispatch(toggleCompleted(1))
          },
          afterAll: () => {
            console.log(`${nonMemoized.name} called:`, called, `time(s)`)
          }
        }
      }
    }
  )
})

describe('using standalone memoization methods vs createSelector', () => {
  const store = setupStore()
  const commonOptions: Options = {
    iterations: 10,
    time: 0
  }
  const fieldAccessor = createSelector(
    [(state: RootState) => state.users],
    users => users.appSettings
  )
  let called = 0
  const fieldAccessor1 = defaultMemoize((state: RootState) => {
    called++
    return state.users.appSettings
  })
  setFunctionNames({ fieldAccessor, fieldAccessor1 })
  const createOptions = <S extends OutputSelector>(
    selector: S,
    commonOptions: Options = {}
  ) => {
    const options: Options = {
      setup: (task, mode) => {
        if (mode === 'warmup') return
        task.opts = {
          beforeEach: () => {
            store.dispatch(toggleCompleted(1))
          },
          afterAll: () => {
            logRecomputations(selector)
          }
        }
      }
    }
    return { ...commonOptions, ...options }
  }
  bench(
    fieldAccessor,
    () => {
      fieldAccessor(store.getState())
    },
    createOptions(fieldAccessor, commonOptions)
  )
  bench(
    fieldAccessor1,
    () => {
      fieldAccessor1(store.getState())
    },
    {
      ...commonOptions,
      setup: (task, mode) => {
        if (mode === 'warmup') return
        task.opts = {
          beforeEach: () => {
            store.dispatch(toggleCompleted(1))
          },
          afterAll: () => {
            console.log(fieldAccessor1.name, called)
          }
        }
      }
    }
  )
})
