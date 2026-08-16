import { createSelector, weakMapMemoize } from 'reselect'
import type { Options } from 'tinybench'
import { bench, describe } from 'vitest'
import type { RootState } from '../testUtils'
import { setFunctionNames, setupStore } from '../testUtils'

describe('Memoize methods comparison', () => {
  // Sample for half a second rather than taking a fixed ten iterations. Ten
  // iterations of a call this cheap reported +-60% error and ranked cases in
  // impossible orders; see the note in 'Cached vs non-cached length in for loops'.
  const commonOptions: Options = {
    time: 500
  }
  const store = setupStore()
  const state = store.getState()
  const selectorDefault = createSelector(
    [(state: RootState) => state.todos],
    todos => todos.map(({ id }) => id)
  )
  const selectorWeakMap = createSelector(
    [(state: RootState) => state.todos],
    todos => todos.map(({ id }) => id),
    { memoize: weakMapMemoize }
  )
  const selectorArgsWeakMap = createSelector(
    [(state: RootState) => state.todos],
    todos => todos.map(({ id }) => id),
    { argsMemoize: weakMapMemoize }
  )
  const selectorBothWeakMap = createSelector(
    [(state: RootState) => state.todos],
    todos => todos.map(({ id }) => id),
    { argsMemoize: weakMapMemoize, memoize: weakMapMemoize }
  )
  const nonMemoizedSelector = (state: RootState) => {
    return state.todos.map(({ id }) => id)
  }
  setFunctionNames({
    selectorDefault,
    selectorWeakMap,
    nonMemoizedSelector,
    selectorArgsWeakMap
  })
  bench(
    selectorDefault,
    () => {
      selectorDefault(state)
    },
    commonOptions
  )
  bench(
    selectorWeakMap,
    () => {
      selectorWeakMap(state)
    },
    commonOptions
  )
  bench(
    selectorArgsWeakMap,
    () => {
      selectorArgsWeakMap(state)
    },
    commonOptions
  )
  bench(
    selectorBothWeakMap,
    () => {
      selectorBothWeakMap(state)
    },
    commonOptions
  )
  bench(
    nonMemoizedSelector,
    () => {
      nonMemoizedSelector(state)
    },
    commonOptions
  )
})

describe('Cached vs non-cached length in for loops', () => {
  // This block is why the fixed ten-iteration options went away. At `iterations:
  // 10, time: 0` it reported 'length cached' as slower than 'length not cached',
  // across every run, which cannot happen. Ten samples of a sub-microsecond loop
  // measure the sampler.
  const commonOptions: Options = {
    time: 500
  }
  const store = setupStore()
  const state = store.getState()
  const { todos } = state
  const { length } = todos
  bench(
    'length not cached',
    () => {
      for (let i = 0; i < todos.length; i++) {
        todos[i].completed
        todos[i].id
      }
    },
    commonOptions
  )
  bench(
    'length cached',
    () => {
      for (let i = 0; i < length; i++) {
        todos[i].completed
        todos[i].id
      }
    },
    commonOptions
  )
  bench(
    'length and arg cached',
    () => {
      for (let i = 0; i < length; i++) {
        const arg = todos[i]
        arg.completed
        arg.id
      }
    },
    commonOptions
  )
})
