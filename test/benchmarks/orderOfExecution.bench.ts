import type { Selector } from 'reselect'
import { createSelector } from 'reselect'
import type { Options } from 'tinybench'
import { bench } from 'vitest'
import type { RootState } from '../testUtils'
import {
  logRecomputations,
  setFunctionNames,
  setupStore,
  toggleCompleted
} from '../testUtils'

describe.only('less in input selectors vs more in input selectors', () => {
  const store = setupStore()
  const state = store.getState()
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
  const options: Options = {
    // warmupIterations: 0,
    // warmupTime: 0,
    iterations: 10,
    time: 0
  }
  setFunctionNames({ selectorGood, selectorBad, nonMemoized })
  const createOptions = <
    S extends Selector & {
      recomputations: () => number
      dependencyRecomputations: () => number
    }
  >(
    selector: S
  ) => {
    const options: Options = {
      setup: (task, mode) => {
        if (mode === 'warmup') return
        task.opts = {
          beforeEach: () => {
            store.dispatch(toggleCompleted(1))
            // store.dispatch(toggleRead(0))
          },
          afterAll: () => {
            logRecomputations(selector)
          }
        }
      }
    }
    return options
  }
  bench(
    selectorGood,
    () => {
      selectorGood(store.getState(), 0)
    },
    {
      ...options,
      ...createOptions(selectorGood)
    }
  )
  bench(
    selectorBad,
    () => {
      selectorBad(store.getState(), 0)
    },
    {
      ...options,
      ...createOptions(selectorBad)
    }
  )
  bench(
    nonMemoized,
    () => {
      nonMemoized(store.getState(), 0)
    },
    {
      ...options,
      setup: (task, mode) => {
        if (mode === 'warmup') {
          called = 0
          return
        }
        task.opts = {
          beforeEach: () => {
            // store.dispatch(toggleRead(0))
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
