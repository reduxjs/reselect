import type {
  OutputSelector,
  Selector,
  SelectorArray,
  UnknownMemoizer
} from 'reselect'
import {
  createSelector,
  createSelectorCreator,
  defaultMemoize,
  unstable_autotrackMemoize as autotrackMemoize,
  weakMapMemoize
} from 'reselect'
import { test } from 'vitest'
import type { RootState } from './testUtils'
import { addTodo, setupStore } from './testUtils'

const store = setupStore()

const EMPTY_ARRAY: [] = []

export const fallbackToEmptyArray = <T>(array: T[]) => {
  return array.length === 0 ? EMPTY_ARRAY : array
}

const selectCompletedTodos = createSelector(
  [(state: RootState) => state.todos],
  todos => {
    return fallbackToEmptyArray(todos.filter(todo => todo.completed === true))
  }
)

const completedTodos = selectCompletedTodos(store.getState())

store.dispatch(addTodo({ title: '', description: '' }))

test('empty array', () => {
  expect(completedTodos).toBe(selectCompletedTodos(store.getState()))
})

test('identity', () => {
  const identity = <Func extends (...args: any[]) => any>(func: Func) => func
  const createNonMemoizedSelector = createSelectorCreator({
    memoize: identity,
    argsMemoize: identity
  })
  const nonMemoizedSelector = createNonMemoizedSelector(
    [(state: RootState) => state.todos],
    todos => todos.filter(todo => todo.completed === true)
  )

  nonMemoizedSelector(store.getState())
  nonMemoizedSelector(store.getState())
  nonMemoizedSelector(store.getState())

  expect(nonMemoizedSelector.recomputations()).toBe(3)
})

test('Top Level Selectors', () => {
  type TopLevelSelectors<State> = {
    [K in keyof State as K extends string
      ? `select${Capitalize<K>}`
      : never]: Selector<State, State[K], never>
  }

  const topLevelSelectors: TopLevelSelectors<RootState> = {
    selectAlerts: state => state.alerts,
    selectTodos: state => state.todos,
    selectUsers: state => state.users
  }
})

test('Find Fastest Selector', () => {
  const store = setupStore()
  const selectTodoIds = createSelector(
    [(state: RootState) => state.todos],
    todos => todos.map(({ id }) => id)
  )
  const findFastestSelector = <S extends OutputSelector>(
    selector: S,
    ...selectorArgs: Parameters<S>
  ) => {
    const memoizeFuncs = [defaultMemoize, weakMapMemoize, autotrackMemoize]
    const results = memoizeFuncs
      .map(memoize => {
        const alternateSelector = createSelector(
          selector.dependencies as [...SelectorArray],
          selector.resultFunc,
          { memoize }
        )
        const start = performance.now()
        alternateSelector.apply(null, selectorArgs)
        const time = performance.now() - start
        return { name: memoize.name, time, selector: alternateSelector }
      })
      .sort((a, b) => a.time - b.time)
    const fastest = results.reduce((minResult, currentResult) =>
      currentResult.time < minResult.time ? currentResult : minResult
    )
    const ratios = results
      .filter(({ time }) => time !== fastest.time)
      .map(
        ({ time, name }) =>
          `\x1B[33m \x1B[1m${
            time / fastest.time
          }\x1B[0m times faster than \x1B[1;41m${name}\x1B[0m.`
      )
    if (fastest.selector.memoize.name !== selector.memoize.name) {
      console.warn(
        `The memoization method for \x1B[1;41m${
          selector.name
        }\x1B[0m is \x1B[31m${
          selector.memoize.name
        }\x1B[0m!\nChange it to \x1B[32m\x1B[1m${
          fastest.selector.memoize.name
        }\x1B[0m to be more efficient.\nYou should use \x1B[32m\x1B[1m${
          fastest.name
        }\x1B[0m because it is${ratios.join('\nand\n')}`
      )
    }
    return { results, fastest } as const
  }

  expect(
    findFastestSelector(selectTodoIds, store.getState()).fastest.name
  ).toBe(weakMapMemoize.name)
})

test('TypedCreateSelector', () => {
  type TypedCreateSelector<
    State,
    MemoizeFunction extends UnknownMemoizer = typeof defaultMemoize,
    ArgsMemoizeFunction extends UnknownMemoizer = typeof defaultMemoize
  > = <
    InputSelectors extends readonly Selector<State>[],
    Result,
    OverrideMemoizeFunction extends UnknownMemoizer = MemoizeFunction,
    OverrideArgsMemoizeFunction extends UnknownMemoizer = ArgsMemoizeFunction
  >(
    ...createSelectorArgs: Parameters<
      typeof createSelector<
        InputSelectors,
        Result,
        OverrideMemoizeFunction,
        OverrideArgsMemoizeFunction
      >
    >
  ) => ReturnType<
    typeof createSelector<
      InputSelectors,
      Result,
      OverrideMemoizeFunction,
      OverrideArgsMemoizeFunction
    >
  >
  const createAppSelector: TypedCreateSelector<RootState> = createSelector
  const selector = createAppSelector(
    [state => state.todos, (state, id: number) => id],
    (todos, id) => todos.find(todo => todo.id === id)?.completed
  )
})
