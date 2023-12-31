import type { Selector, TypedStructuredSelectorCreator } from 'reselect'
import { createStructuredSelector, weakMapMemoize } from 'reselect'
import { describe, expectTypeOf, test } from 'vitest'

interface Todo {
  id: number
  completed: boolean
}

interface Alert {
  id: number
  read: boolean
}

interface RootState {
  todos: Todo[]
  alerts: Alert[]
}

const state: RootState = {
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
  test('TypedStructuredSelectorCreator should lock down state type', () => {
    const typedStructuredSelectorCreator: TypedStructuredSelectorCreator<RootState> =
      createStructuredSelector

    const structuredSelector = typedStructuredSelectorCreator({
      todos: state => state.todos,
      alerts: state => state.alerts
    })

    const { todos, alerts } = structuredSelector(state)

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
    ).returns.toEqualTypeOf<RootState>(state)

    expectTypeOf(
      structuredSelector.memoizedResultFunc
    ).parameters.toEqualTypeOf<[Todo[], Alert[]]>([state.todos, state.alerts])

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
      todos: (state: RootState) => state.todos,
      alerts: (state: RootState) => state.alerts,
      todoById: (state: RootState, id: number) => state.todos[id]
    })

    const { alerts, todos, todoById } = structuredSelector(state, 0)

    expectTypeOf(todos).toEqualTypeOf<Todo[]>()

    expectTypeOf(alerts).toEqualTypeOf<Alert[]>()

    expectTypeOf(todoById).toEqualTypeOf<Todo>()

    expectTypeOf(structuredSelector.argsMemoize).toEqualTypeOf<
      typeof weakMapMemoize
    >(weakMapMemoize)

    expectTypeOf(structuredSelector.memoize).toEqualTypeOf<
      typeof weakMapMemoize
    >(weakMapMemoize)

    expectTypeOf(structuredSelector.clearCache).returns.toBeVoid()

    expectTypeOf(structuredSelector.clearCache).parameters.toEqualTypeOf<[]>()

    expectTypeOf(structuredSelector.dependencies).items.toMatchTypeOf<
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
      RootState & { todoById: Todo }
    >()

    expectTypeOf(
      structuredSelector.memoizedResultFunc
    ).parameters.toEqualTypeOf<[Todo[], Alert[], Todo]>([
      state.todos,
      state.alerts,
      state.todos[0]
    ])

    expectTypeOf(structuredSelector.resultFunc).parameters.toEqualTypeOf<
      [Todo[], Alert[], Todo]
    >([state.todos, state.alerts, state.todos[0]])

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
