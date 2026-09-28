import microMemoize from 'micro-memoize'
import type {
  Selector,
  StructuredSelectorCreator,
  TypedStructuredSelectorCreator
} from 'reselect'
import {
  createSelector,
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
    { id: 1, completed: false }
  ],
  alerts: [
    { id: 0, read: false },
    { id: 1, read: false }
  ]
}

describe('createStructuredSelector.withTypes<RootState>()', () => {
  const createStructuredAppSelector =
    createStructuredSelector.withTypes<RootState>()

  test('locks down state type and infers types correctly', () => {
    expectTypeOf(createStructuredSelector.withTypes).returns.toEqualTypeOf(
      createStructuredSelector
    )

    const structuredAppSelector = createStructuredAppSelector({
      alerts: state => {
        expectTypeOf(state).toEqualTypeOf<RootState>(rootState)

        return state.alerts
      },
      todos: state => {
        expectTypeOf(state).toEqualTypeOf<RootState>(rootState)

        return state.todos
      }
    })

    const { todos, alerts } = structuredAppSelector(rootState)

    expectTypeOf(todos).toEqualTypeOf<Todo[]>()

    expectTypeOf(alerts).toEqualTypeOf<Alert[]>()

    expectTypeOf(structuredAppSelector.argsMemoize).toEqualTypeOf<
      typeof weakMapMemoize
    >(weakMapMemoize)

    expectTypeOf(structuredAppSelector.memoize).toEqualTypeOf<
      typeof weakMapMemoize
    >(weakMapMemoize)

    expectTypeOf(structuredAppSelector.clearCache).returns.toBeVoid()

    expectTypeOf(structuredAppSelector.clearCache).parameters.toEqualTypeOf<
      []
    >()

    expectTypeOf(structuredAppSelector.dependencies).items.toBeFunction()

    expectTypeOf(structuredAppSelector.dependencyRecomputations).toEqualTypeOf<
      () => number
    >()

    expectTypeOf(structuredAppSelector.recomputations).toEqualTypeOf<
      () => number
    >()

    expectTypeOf(
      structuredAppSelector.resetDependencyRecomputations
    ).toEqualTypeOf<() => void>()

    expectTypeOf(structuredAppSelector.resetRecomputations).toEqualTypeOf<
      () => void
    >()

    expectTypeOf(
      structuredAppSelector.lastResult
    ).returns.toEqualTypeOf<RootState>(rootState)

    expectTypeOf(
      structuredAppSelector.memoizedResultFunc
    ).parameters.toEqualTypeOf<[Alert[], Todo[]]>([
      rootState.alerts,
      rootState.todos
    ])

    expectTypeOf(
      structuredAppSelector.memoizedResultFunc
    ).returns.toEqualTypeOf<
      ReturnType<typeof structuredAppSelector.lastResult>
    >(structuredAppSelector.lastResult())

    expectTypeOf(structuredAppSelector.memoizedResultFunc).toHaveProperty(
      'clearCache'
    )

    expectTypeOf(structuredAppSelector.resultFunc).returns.toEqualTypeOf<
      ReturnType<typeof structuredAppSelector.lastResult>
    >(structuredAppSelector.lastResult())
  })

  test('should correctly infer memoize and argsMemoize', () => {
    const createSelectorLru = createSelectorCreator({
      memoize: lruMemoize,
      argsMemoize: microMemoize
    })

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
    const structuredAppSelector = createStructuredAppSelector({
      alerts: state => {
        expectTypeOf(state).toEqualTypeOf<RootState>(rootState)

        return state.alerts
      },
      todos: state => {
        expectTypeOf(state).toEqualTypeOf<RootState>(rootState)

        return state.todos
      },
      todosItem: (state, id: number) => {
        expectTypeOf(state).toEqualTypeOf<RootState>(rootState)

        return state.todos[id]
      }
    })

    const { alerts, todos, todosItem } = structuredAppSelector(rootState, 0)

    expectTypeOf(todos).toEqualTypeOf<Todo[]>()

    expectTypeOf(alerts).toEqualTypeOf<Alert[]>()

    expectTypeOf(todosItem).toEqualTypeOf<Todo>()

    expectTypeOf(structuredAppSelector.argsMemoize).toEqualTypeOf<
      typeof weakMapMemoize
    >(weakMapMemoize)

    expectTypeOf(structuredAppSelector.memoize).toEqualTypeOf<
      typeof weakMapMemoize
    >(weakMapMemoize)

    expectTypeOf(structuredAppSelector.clearCache).returns.toBeVoid()

    expectTypeOf(structuredAppSelector.clearCache).parameters.toEqualTypeOf<
      []
    >()

    expectTypeOf(structuredAppSelector.dependencies).items.toExtend<
      Selector<RootState>
    >()

    expectTypeOf(structuredAppSelector.dependencyRecomputations).toEqualTypeOf<
      () => number
    >()

    expectTypeOf(structuredAppSelector.recomputations).toEqualTypeOf<
      () => number
    >()

    expectTypeOf(
      structuredAppSelector.resetDependencyRecomputations
    ).returns.toBeVoid()

    expectTypeOf(
      structuredAppSelector.resetDependencyRecomputations
    ).parameters.items.toBeNever()

    expectTypeOf(structuredAppSelector.resetRecomputations).returns.toBeVoid()

    expectTypeOf(
      structuredAppSelector.resetRecomputations
    ).parameters.items.toBeNever()

    // Use `.branded` for intersection types https://github.com/mmkal/expect-type#why-is-my-assertion-failing
    expectTypeOf(
      structuredAppSelector.lastResult
    ).returns.branded.toEqualTypeOf<RootState & { todosItem: Todo }>()

    expectTypeOf(
      structuredAppSelector.memoizedResultFunc
    ).parameters.toEqualTypeOf<[Alert[], Todo[], Todo]>([
      rootState.alerts,
      rootState.todos,
      rootState.todos[0]
    ])

    expectTypeOf(structuredAppSelector.resultFunc).parameters.toEqualTypeOf<
      [Alert[], Todo[], Todo]
    >([rootState.alerts, rootState.todos, rootState.todos[0]])

    expectTypeOf(
      structuredAppSelector.memoizedResultFunc
    ).returns.toEqualTypeOf<
      ReturnType<typeof structuredAppSelector.lastResult>
    >(structuredAppSelector.lastResult())

    expectTypeOf(structuredAppSelector.memoizedResultFunc).toHaveProperty(
      'clearCache'
    )

    expectTypeOf(structuredAppSelector.resultFunc).returns.toEqualTypeOf<
      ReturnType<typeof structuredAppSelector.lastResult>
    >(structuredAppSelector.lastResult())
  })

  // TODO: Remove this test block once `TypedStructuredSelectorCreator` is removed.
  test('should work alongside TypedStructuredSelectorCreator', () => {
    const createStructuredAppSelector: TypedStructuredSelectorCreator<RootState> =
      createStructuredSelector.withTypes<RootState>()

    const structuredAppSelector = createStructuredAppSelector({
      alerts: state => {
        expectTypeOf(state).toEqualTypeOf<RootState>(rootState)

        return state.alerts
      },
      todos: state => {
        expectTypeOf(state).toEqualTypeOf<RootState>(rootState)

        return state.todos
      }
    })

    const { todos, alerts } = structuredAppSelector(rootState)

    expectTypeOf(todos).toEqualTypeOf<Todo[]>()

    expectTypeOf(alerts).toEqualTypeOf<Alert[]>()

    expectTypeOf(structuredAppSelector.argsMemoize).toEqualTypeOf<
      typeof weakMapMemoize
    >(weakMapMemoize)

    expectTypeOf(structuredAppSelector.memoize).toEqualTypeOf<
      typeof weakMapMemoize
    >(weakMapMemoize)

    expectTypeOf(structuredAppSelector.clearCache).returns.toBeVoid()

    expectTypeOf(structuredAppSelector.clearCache).parameters.toEqualTypeOf<
      []
    >()

    expectTypeOf(structuredAppSelector.dependencies).items.toBeFunction()

    expectTypeOf(structuredAppSelector.dependencyRecomputations).toEqualTypeOf<
      () => number
    >()

    expectTypeOf(structuredAppSelector.recomputations).toEqualTypeOf<
      () => number
    >()

    expectTypeOf(
      structuredAppSelector.resetDependencyRecomputations
    ).toEqualTypeOf<() => void>()

    expectTypeOf(structuredAppSelector.resetRecomputations).toEqualTypeOf<
      () => void
    >()

    expectTypeOf(
      structuredAppSelector.lastResult
    ).returns.toEqualTypeOf<RootState>(rootState)

    expectTypeOf(
      structuredAppSelector.memoizedResultFunc
    ).parameters.toEqualTypeOf<[Alert[], Todo[]]>([
      rootState.alerts,
      rootState.todos
    ])

    expectTypeOf(
      structuredAppSelector.memoizedResultFunc
    ).returns.toEqualTypeOf<
      ReturnType<typeof structuredAppSelector.lastResult>
    >(structuredAppSelector.lastResult())

    expectTypeOf(structuredAppSelector.memoizedResultFunc).toHaveProperty(
      'clearCache'
    )

    expectTypeOf(structuredAppSelector.resultFunc).returns.toEqualTypeOf<
      ReturnType<typeof structuredAppSelector.lastResult>
    >(structuredAppSelector.lastResult())
  })

  test('should work with createSelector.withTypes<RootState>()', () => {
    const structuredAppSelector = createStructuredAppSelector(
      {
        alerts: state => {
          expectTypeOf(state).toEqualTypeOf<RootState>(rootState)

          return state.alerts
        },
        todos: state => {
          expectTypeOf(state).toEqualTypeOf<RootState>(rootState)

          return state.todos
        }
      },
      createSelector.withTypes<RootState>()
    )

    const { todos, alerts } = structuredAppSelector(rootState)

    expectTypeOf(todos).toEqualTypeOf<Todo[]>()

    expectTypeOf(alerts).toEqualTypeOf<Alert[]>()

    expectTypeOf(structuredAppSelector.argsMemoize).toEqualTypeOf<
      typeof weakMapMemoize
    >(weakMapMemoize)

    expectTypeOf(structuredAppSelector.memoize).toEqualTypeOf<
      typeof weakMapMemoize
    >(weakMapMemoize)

    expectTypeOf(structuredAppSelector.clearCache).returns.toBeVoid()

    expectTypeOf(structuredAppSelector.clearCache).parameters.toEqualTypeOf<
      []
    >()

    expectTypeOf(structuredAppSelector.dependencies).items.toBeFunction()

    expectTypeOf(structuredAppSelector.dependencyRecomputations).toEqualTypeOf<
      () => number
    >()

    expectTypeOf(structuredAppSelector.recomputations).toEqualTypeOf<
      () => number
    >()

    expectTypeOf(
      structuredAppSelector.resetDependencyRecomputations
    ).toEqualTypeOf<() => void>()

    expectTypeOf(structuredAppSelector.resetRecomputations).toEqualTypeOf<
      () => void
    >()

    expectTypeOf(
      structuredAppSelector.lastResult
    ).returns.toEqualTypeOf<RootState>(rootState)

    expectTypeOf(
      structuredAppSelector.memoizedResultFunc
    ).parameters.toEqualTypeOf<[Alert[], Todo[]]>([
      rootState.alerts,
      rootState.todos
    ])

    expectTypeOf(
      structuredAppSelector.memoizedResultFunc
    ).returns.toEqualTypeOf<
      ReturnType<typeof structuredAppSelector.lastResult>
    >(structuredAppSelector.lastResult())

    expectTypeOf(structuredAppSelector.memoizedResultFunc).toHaveProperty(
      'clearCache'
    )

    expectTypeOf(structuredAppSelector.resultFunc).returns.toEqualTypeOf<
      ReturnType<typeof structuredAppSelector.lastResult>
    >(structuredAppSelector.lastResult())
  })

  test('StructuredSelectorCreator should lock down the state type', () => {
    const createStructuredAppSelector: StructuredSelectorCreator<RootState> =
      createStructuredSelector

    const structuredAppSelector = createStructuredAppSelector(
      {
        alerts: state => {
          expectTypeOf(state).toEqualTypeOf<RootState>(rootState)

          return state.alerts
        },
        todos: state => {
          expectTypeOf(state).toEqualTypeOf<RootState>(rootState)

          return state.todos
        }
      },
      createSelector.withTypes<RootState>()
    )

    const { todos, alerts } = structuredAppSelector(rootState)

    expectTypeOf(todos).toEqualTypeOf<Todo[]>()

    expectTypeOf(alerts).toEqualTypeOf<Alert[]>()

    expectTypeOf(structuredAppSelector.argsMemoize).toEqualTypeOf<
      typeof weakMapMemoize
    >(weakMapMemoize)

    expectTypeOf(structuredAppSelector.memoize).toEqualTypeOf<
      typeof weakMapMemoize
    >(weakMapMemoize)

    expectTypeOf(structuredAppSelector.clearCache).returns.toBeVoid()

    expectTypeOf(structuredAppSelector.clearCache).parameters.toEqualTypeOf<
      []
    >()

    expectTypeOf(structuredAppSelector.dependencies).items.toBeFunction()

    expectTypeOf(structuredAppSelector.dependencyRecomputations).toEqualTypeOf<
      () => number
    >()

    expectTypeOf(structuredAppSelector.recomputations).toEqualTypeOf<
      () => number
    >()

    expectTypeOf(
      structuredAppSelector.resetDependencyRecomputations
    ).toEqualTypeOf<() => void>()

    expectTypeOf(structuredAppSelector.resetRecomputations).toEqualTypeOf<
      () => void
    >()

    expectTypeOf(
      structuredAppSelector.lastResult
    ).returns.toEqualTypeOf<RootState>(rootState)

    expectTypeOf(
      structuredAppSelector.memoizedResultFunc
    ).parameters.toEqualTypeOf<[Alert[], Todo[]]>([
      rootState.alerts,
      rootState.todos
    ])

    expectTypeOf(
      structuredAppSelector.memoizedResultFunc
    ).returns.toEqualTypeOf<
      ReturnType<typeof structuredAppSelector.lastResult>
    >(structuredAppSelector.lastResult())

    expectTypeOf(structuredAppSelector.memoizedResultFunc).toHaveProperty(
      'clearCache'
    )

    expectTypeOf(structuredAppSelector.resultFunc).returns.toEqualTypeOf<
      ReturnType<typeof structuredAppSelector.lastResult>
    >(structuredAppSelector.lastResult())
  })
})
