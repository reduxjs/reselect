import microMemoize from 'micro-memoize'
import type { Selector, TypedStructuredSelectorCreator } from 'reselect'
import {
  createSelectorCreator,
  createStructuredSelector,
  lruMemoize,
  weakMapMemoize
} from 'reselect'
import { describe, expectTypeOf, test } from 'vitest'

interface Todo {
  id: number
  completed: boolean
}

interface Alert {
  id: number
  read: boolean
}

// Keep the keys in alphabetical order, and use them in the same order below.
// The `dependencies` and `memoizedResultFunc` parameter order follows key
// order: TS 7 sorts the keys alphabetically, while TS 5/6 use the order in
// which each key name first appears in the program.
interface RootState {
  alerts: Alert[]
  todos: Todo[]
}

const rootState: RootState = {
  todos: [
    { id: 0, completed: false },
    { id: 1, completed: true }
  ],
  alerts: [
    { id: 0, read: false },
    { id: 1, read: true }
  ]
}

describe('createStructuredSelector', () => {
  // TODO: Remove this test block once `TypedStructuredSelectorCreator` is removed.
  test('TypedStructuredSelectorCreator should lock down state type', () => {
    const createStructuredAppSelector: TypedStructuredSelectorCreator<RootState> =
      createStructuredSelector

    const structuredSelector = createStructuredAppSelector({
      alerts: state => {
        expectTypeOf(state).toEqualTypeOf<RootState>(rootState)

        return state.alerts
      },
      todos: state => {
        expectTypeOf(state).toEqualTypeOf<RootState>(rootState)

        return state.todos
      }
    })

    const { todos, alerts } = structuredSelector(rootState)

    expectTypeOf(todos).toEqualTypeOf<Todo[]>()

    expectTypeOf(alerts).toEqualTypeOf<Alert[]>()

    expectTypeOf(structuredSelector.argsMemoize).toEqualTypeOf<
      typeof weakMapMemoize
    >(weakMapMemoize)

    expectTypeOf(structuredSelector.memoize).toEqualTypeOf<
      typeof weakMapMemoize
    >(weakMapMemoize)

    expectTypeOf(structuredSelector.clearCache).returns.toBeVoid()

    expectTypeOf(structuredSelector.clearCache).parameters.toEqualTypeOf<[]>()

    expectTypeOf(structuredSelector.dependencies).items.toBeFunction()

    expectTypeOf(structuredSelector.dependencyRecomputations).toEqualTypeOf<
      () => number
    >()

    expectTypeOf(structuredSelector.recomputations).toEqualTypeOf<
      () => number
    >()

    expectTypeOf(
      structuredSelector.resetDependencyRecomputations
    ).toEqualTypeOf<() => void>()

    expectTypeOf(structuredSelector.resetRecomputations).toEqualTypeOf<
      () => void
    >()

    expectTypeOf(
      structuredSelector.lastResult
    ).returns.toEqualTypeOf<RootState>(rootState)

    expectTypeOf(
      structuredSelector.memoizedResultFunc
    ).parameters.toEqualTypeOf<[Alert[], Todo[]]>([
      rootState.alerts,
      rootState.todos
    ])

    expectTypeOf(structuredSelector.memoizedResultFunc).returns.toEqualTypeOf<
      ReturnType<typeof structuredSelector.lastResult>
    >(structuredSelector.lastResult())

    expectTypeOf(structuredSelector.memoizedResultFunc).toHaveProperty(
      'clearCache'
    )

    expectTypeOf(structuredSelector.resultFunc).returns.toEqualTypeOf<
      ReturnType<typeof structuredSelector.lastResult>
    >(structuredSelector.lastResult())
  })

  // TODO: Remove this test block once `TypedStructuredSelectorCreator` is removed.
  test('TypedStructuredSelectorCreator should correctly infer memoize and argsMemoize', () => {
    const createSelectorLru = createSelectorCreator({
      memoize: lruMemoize,
      argsMemoize: microMemoize
    })

    const createStructuredAppSelector: TypedStructuredSelectorCreator<RootState> =
      createStructuredSelector

    const structuredSelector = createStructuredAppSelector(
      {
        alerts: state => state.alerts,
        todos: state => state.todos
      },
      createSelectorLru
    )

    expectTypeOf(structuredSelector.argsMemoize).toEqualTypeOf<
      typeof microMemoize
    >(microMemoize)

    expectTypeOf(structuredSelector.memoize).toEqualTypeOf<typeof lruMemoize>(
      lruMemoize
    )

    const { todos, alerts } = structuredSelector(rootState)

    expectTypeOf(todos).toEqualTypeOf<Todo[]>()

    expectTypeOf(alerts).toEqualTypeOf<Alert[]>()

    expectTypeOf(structuredSelector.dependencies).items.toBeFunction()

    expectTypeOf(structuredSelector.dependencyRecomputations).toEqualTypeOf<
      () => number
    >()

    expectTypeOf(structuredSelector.recomputations).toEqualTypeOf<
      () => number
    >()

    expectTypeOf(
      structuredSelector.resetDependencyRecomputations
    ).toEqualTypeOf<() => void>()

    expectTypeOf(structuredSelector.resetRecomputations).toEqualTypeOf<
      () => void
    >()

    expectTypeOf(
      structuredSelector.lastResult
    ).returns.toEqualTypeOf<RootState>(rootState)

    expectTypeOf(
      structuredSelector.memoizedResultFunc
    ).parameters.toEqualTypeOf<[Alert[], Todo[]]>([
      rootState.alerts,
      rootState.todos
    ])

    expectTypeOf(structuredSelector.memoizedResultFunc).returns.toEqualTypeOf<
      ReturnType<typeof structuredSelector.lastResult>
    >(structuredSelector.lastResult())

    expectTypeOf(structuredSelector.memoizedResultFunc).toHaveProperty(
      'clearCache'
    )

    expectTypeOf(structuredSelector.resultFunc).returns.toEqualTypeOf<
      ReturnType<typeof structuredSelector.lastResult>
    >(structuredSelector.lastResult())
  })

  test('supports additional parameters', () => {
    const structuredSelector = createStructuredSelector({
      alerts: (state: RootState) => state.alerts,
      todos: (state: RootState) => state.todos,
      todosItem: (state: RootState, id: number) => state.todos[id]
    })

    const { alerts, todos, todosItem } = structuredSelector(rootState, 0)

    expectTypeOf(todos).toEqualTypeOf<Todo[]>()

    expectTypeOf(alerts).toEqualTypeOf<Alert[]>()

    expectTypeOf(todosItem).toEqualTypeOf<Todo>()

    expectTypeOf(structuredSelector.argsMemoize).toEqualTypeOf<
      typeof weakMapMemoize
    >(weakMapMemoize)

    expectTypeOf(structuredSelector.memoize).toEqualTypeOf<
      typeof weakMapMemoize
    >(weakMapMemoize)

    expectTypeOf(structuredSelector.clearCache).returns.toBeVoid()

    expectTypeOf(structuredSelector.clearCache).parameters.toEqualTypeOf<[]>()

    expectTypeOf(structuredSelector.dependencies).items.toExtend<
      Selector<RootState>
    >()

    expectTypeOf(structuredSelector.dependencyRecomputations).toEqualTypeOf<
      () => number
    >()

    expectTypeOf(structuredSelector.recomputations).toEqualTypeOf<
      () => number
    >()

    expectTypeOf(
      structuredSelector.resetDependencyRecomputations
    ).returns.toBeVoid()

    expectTypeOf(
      structuredSelector.resetDependencyRecomputations
    ).parameters.items.toBeNever()

    expectTypeOf(structuredSelector.resetRecomputations).returns.toBeVoid()

    expectTypeOf(
      structuredSelector.resetRecomputations
    ).parameters.items.toBeNever()

    // Use `.branded` for intersection types https://github.com/mmkal/expect-type#why-is-my-assertion-failing
    expectTypeOf(structuredSelector.lastResult).returns.branded.toEqualTypeOf<
      RootState & { todosItem: Todo }
    >()

    expectTypeOf(
      structuredSelector.memoizedResultFunc
    ).parameters.toEqualTypeOf<[Alert[], Todo[], Todo]>([
      rootState.alerts,
      rootState.todos,
      rootState.todos[0]
    ])

    expectTypeOf(structuredSelector.resultFunc).parameters.toEqualTypeOf<
      [Alert[], Todo[], Todo]
    >([rootState.alerts, rootState.todos, rootState.todos[0]])

    expectTypeOf(structuredSelector.memoizedResultFunc).returns.toEqualTypeOf<
      ReturnType<typeof structuredSelector.lastResult>
    >(structuredSelector.lastResult())

    expectTypeOf(structuredSelector.memoizedResultFunc).toHaveProperty(
      'clearCache'
    )

    expectTypeOf(structuredSelector.resultFunc).returns.toEqualTypeOf<
      ReturnType<typeof structuredSelector.lastResult>
    >(structuredSelector.lastResult())
  })
})
