import { createCurriedSelector, createSelector } from 'reselect'
import type { Options } from 'tinybench'
import { bench } from 'vitest'
import type { RootState } from '../testUtils'
import { setFunctionNames, setupStore } from '../testUtils'

describe.only('curriedSelector vs parametric selector', () => {
  const options: Options = {
    // iterations: 10_000_000,
    // time: 0
  }
  const store = setupStore()
  const state = store.getState()
  const parametricSelector = createSelector(
    [(state: RootState) => state.todos, (state: RootState, id: number) => id],
    (todos, id) => todos.find(todo => todo.id === id)
  )
  const curriedSelector = createCurriedSelector(
    [(state: RootState) => state.todos, (state: RootState, id: number) => id],
    (todos, id) => todos.find(todo => todo.id === id)
  )
  setFunctionNames({ parametricSelector, curriedSelector })
  bench(
    parametricSelector,
    () => {
      parametricSelector(state, 0)
    },
    {
      ...options,
      setup: (task, mode) => {
        if (mode === 'warmup') return
        parametricSelector.clearCache()
        parametricSelector.resetRecomputations()
        parametricSelector.memoizedResultFunc.clearCache()
      }
    }
  )
  bench(
    curriedSelector,
    () => {
      curriedSelector(0)(state)
    },
    {
      ...options,
      setup: (task, mode) => {
        if (mode === 'warmup') return
        curriedSelector.clearCache()
        curriedSelector.resetRecomputations()
        curriedSelector.memoizedResultFunc.clearCache()
      }
    }
  )
})
