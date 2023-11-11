import { createCurriedSelector, createSelector, defaultMemoize } from 'reselect'
import { describe, expectTypeOf, test } from 'vitest'

interface RootState {
  todos: {
    id: number
    completed: boolean
  }[]
}

const state: RootState = {
  todos: [
    { id: 0, completed: false },
    { id: 1, completed: false }
  ]
}

describe('curried selector', () => {
  test('curried selector fields args as array', () => {
    const curriedSelector = createCurriedSelector(
      [(state: RootState) => state.todos, (state: RootState, id: number) => id],
      (todos, id) => todos[id]
    )
    const parametricSelector = createSelector(
      [(state: RootState) => state.todos, (state: RootState, id: number) => id],
      (todos, id) => todos[id]
    )
    expectTypeOf(curriedSelector.argsMemoize).toEqualTypeOf(defaultMemoize)
    expectTypeOf(curriedSelector.memoize).toEqualTypeOf(defaultMemoize)
    expectTypeOf(curriedSelector.clearCache).toEqualTypeOf(
      parametricSelector.clearCache
    )
    expectTypeOf(curriedSelector.dependencies).toEqualTypeOf(
      parametricSelector.dependencies
    )
    expectTypeOf(curriedSelector.lastResult).toEqualTypeOf(
      parametricSelector.lastResult
    )
    expectTypeOf(curriedSelector.lastResult).returns.toEqualTypeOf(
      parametricSelector.lastResult()
    )
    expectTypeOf(curriedSelector.memoizedResultFunc).toEqualTypeOf(
      parametricSelector.memoizedResultFunc
    )
    expectTypeOf(curriedSelector.recomputations).toEqualTypeOf(
      parametricSelector.recomputations
    )
    expectTypeOf(curriedSelector.resetRecomputations).toEqualTypeOf(
      parametricSelector.resetRecomputations
    )
    expectTypeOf(curriedSelector.resultFunc).toEqualTypeOf(
      parametricSelector.resultFunc
    )
    expectTypeOf(curriedSelector.memoizedResultFunc.clearCache).toEqualTypeOf(
      parametricSelector.memoizedResultFunc.clearCache
    )
    expectTypeOf(curriedSelector(0)(state)).toEqualTypeOf(
      parametricSelector(state, 0)
    )
  })

  test('curried selector fields separate inline args', () => {
    const curriedSelector = createCurriedSelector(
      (state: RootState) => state.todos,
      (state: RootState, id: number) => id,
      (todos, id) => todos[id]
    )
    const parametricSelector = createSelector(
      (state: RootState) => state.todos,
      (state: RootState, id: number) => id,
      (todos, id) => todos[id]
    )
    expectTypeOf(curriedSelector.argsMemoize).toEqualTypeOf(defaultMemoize)
    expectTypeOf(curriedSelector.memoize).toEqualTypeOf(defaultMemoize)
    expectTypeOf(curriedSelector.clearCache).toEqualTypeOf(
      parametricSelector.clearCache
    )
    expectTypeOf(curriedSelector.dependencies).toEqualTypeOf(
      parametricSelector.dependencies
    )
    expectTypeOf(curriedSelector.lastResult).toEqualTypeOf(
      parametricSelector.lastResult
    )
    expectTypeOf(curriedSelector.lastResult).returns.toEqualTypeOf(
      parametricSelector.lastResult()
    )
    expectTypeOf(curriedSelector.memoizedResultFunc).toEqualTypeOf(
      parametricSelector.memoizedResultFunc
    )
    expectTypeOf(curriedSelector.recomputations).toEqualTypeOf(
      parametricSelector.recomputations
    )
    expectTypeOf(curriedSelector.resetRecomputations).toEqualTypeOf(
      parametricSelector.resetRecomputations
    )
    expectTypeOf(curriedSelector.resultFunc).toEqualTypeOf(
      parametricSelector.resultFunc
    )
    expectTypeOf(curriedSelector.memoizedResultFunc.clearCache).toEqualTypeOf(
      parametricSelector.memoizedResultFunc.clearCache
    )
    expectTypeOf(curriedSelector(0)(state)).toEqualTypeOf(
      parametricSelector(state, 0)
    )
  })
})
