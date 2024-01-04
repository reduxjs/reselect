import microMemoize from 'micro-memoize'
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

interface RootState {
  todos: Todo[]
  alerts: Alert[]
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
    const structuredAppSelector = createStructuredAppSelector({
      todos: state => {
        expectTypeOf(state).toEqualTypeOf<RootState>(rootState)

        return state.todos
      },
      alerts: state => {
        expectTypeOf(state).toEqualTypeOf<RootState>(rootState)

        return state.alerts
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
    ).parameters.toEqualTypeOf<[Todo[], Alert[]]>([
      rootState.todos,
      rootState.alerts
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
        todos: state => state.todos,
        alerts: state => state.alerts
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
    ).parameters.toEqualTypeOf<[Todo[], Alert[]]>([
      rootState.todos,
      rootState.alerts
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
})
